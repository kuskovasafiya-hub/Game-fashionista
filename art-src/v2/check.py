"""v2 experiment: align each transparent layer onto the base and report problems.

No cutting. A layer is used as Codex drew it; this script only
- places the items Codex does not put in place reliably by an anchor on the doll:
  each shoe onto its foot, a bag under the fingers of her hand. Clothes and hair
  already land on the body as drawn and are not moved;
- reports skin pixels inside the item (Codex drew part of the doll by mistake) and
  enclosed transparent holes;
- writes art-src/v2/out/<name>.png (aligned, full canvas) and a report.

  art-src/.venv/bin/python art-src/v2/check.py
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
from skin import skin_weight  # noqa: E402

RAW, OUT = ROOT / 'raw', ROOT / 'out'


def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'), dtype=np.float32)


def segments(row):
    xs = np.nonzero(row)[0]
    if not len(xs):
        return []
    cut = np.nonzero(np.diff(xs) > 1)[0]
    starts = np.r_[xs[0], xs[cut + 1]]
    ends = np.r_[xs[cut], xs[-1]]
    return list(zip(starts, ends))


def feet_boxes(body_a, ankle_y=1330):
    """Bounding box (x0, x1, y0, y1) of each bare foot below the ankle line."""
    m = body_a > 128
    m[:ankle_y] = False
    lab, n = ndi.label(m)
    boxes = []
    for sl in ndi.find_objects(lab):
        boxes.append((sl[1].start, sl[1].stop, sl[0].start, sl[0].stop))
    return sorted(boxes)


def hand_box(body_a):
    """Her right hand (viewer's left): the outer arm segment, lowest rows."""
    m = body_a > 128
    rows = [y for y in range(500, m.shape[0]) if len(segments(m[y, :512])) >= 2 or
            (segments(m[y, :512]) and segments(m[y, :512])[0][1] < 380)]
    ys = [y for y in rows if segments(m[y, :512])[0][1] < 380]
    y1 = max(ys)
    xs = [segments(m[y, :512])[0] for y in ys if y > y1 - 120]
    return min(x[0] for x in xs), max(x[1] for x in xs), y1 - 120, y1


def move(img, comp_mask, dx, dy):
    """Move only the pixels of one component."""
    part = np.where(comp_mask[..., None], img, 0)
    rest = np.where(comp_mask[..., None], 0, img)
    part = np.roll(part, (dy, dx), axis=(0, 1))
    return np.where(part[..., 3:] > rest[..., 3:], part, rest)


ANKLE_Y = 1330          # below this row the doll's bare feet


def scale_part(part, sc, anchor_src, anchor_dst):
    """Uniformly scale an RGBA image about anchor_src and move it to anchor_dst."""
    H, W = part.shape[:2]
    img = Image.fromarray(part.clip(0, 255).astype(np.uint8))
    ax, ay = anchor_src
    bx, by = anchor_dst
    # affine maps output (x, y) -> input ((x - bx) / sc + ax, (y - by) / sc + ay)
    out = img.transform((W, H), Image.AFFINE, (1 / sc, 0, ax - bx / sc, 0, 1 / sc, ay - by / sc),
                        resample=Image.BICUBIC)
    return np.asarray(out, dtype=np.float32)


BASE_RGB = None


def trim_foot(fitted, m):
    """The foot a closed shoe brings, made to agree with her own leg and foot:
    - nothing of it above the shoe's top edge (her own leg shows there);
    - where it sticks out past her outline, the shoe's side wall continues instead
      (filled with the shoe's main colour);
    - the rest takes her skin colour (CIELAB shift to her ankle's mean)."""
    import skin as sk
    a = fitted[..., 3] > 30
    w = skin_weight(fitted[..., :3], strict=False) * a
    sk_mask = w > 0.4
    shoe = a & ~ndi.binary_dilation(sk_mask, iterations=1)
    if not shoe.any() or not sk_mask.any():
        return fitted
    # the vamp: the first row where the shoe spans the middle of her foot (the toe
    # box). Above it a pump is open: only its thin side walls along her outline stay,
    # her own leg and foot show between them.
    ys, xs = np.nonzero(a)
    cx = xs.mean()
    span = [y for y in range(ys.min(), ys.max() + 1) if shoe[y, int(cx) - 3:int(cx) + 4].all()]
    vamp = span[0] if span else ys.min()
    inner = ndi.binary_erosion(m, iterations=4)
    above = np.zeros_like(a)
    above[:vamp] = True
    # (thin lines there are the drawn ankle's outline; thick dark parts are the shoe)
    thick = ndi.binary_opening(shoe, iterations=2)
    fitted[above & (sk_mask | (inner & ~thick)), 3] = 0     # her leg, not Codex's ankle
    # The shoe's side walls above the vamp were drawn round Codex's wider foot and
    # hang beside her ankle. Take them off and lay new ones on her own outline: a
    # band of the shoe's colour just inside her foot's edge, as high as they reached.
    walls = above & shoe & ~ndi.binary_dilation(m, iterations=2)
    walls = ndi.binary_opening(walls, iterations=1) | (walls & ~ndi.binary_dilation(m, iterations=6))
    if walls.any():
        wall_top = np.nonzero(walls.any(axis=1))[0].min()
        fitted[walls, 3] = 0
        px = fitted[thick & (fitted[..., 3] >= 240), :3]
        if len(px):
            q = (px // 16).astype(int)
            key = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
            colour = np.median(px[key == np.bincount(key).argmax()], axis=0)
            band = m & ~ndi.binary_erosion(m, iterations=5) & ~ndi.binary_erosion(m, iterations=1, border_value=0) | \
                (m & ~ndi.binary_erosion(m, iterations=5))
            rows = np.zeros_like(a)
            rows[wall_top:vamp + 2] = True
            xs_foot = np.nonzero(a[vamp:vamp + 20].any(axis=0))[0]
            cols = np.zeros_like(a)
            if len(xs_foot):
                cols[:, xs_foot.min() - 6:xs_foot.max() + 7] = True
            band &= rows & cols
            # a wall rises from the vamp: thinner towards its top
            fitted[band, :3] = colour
            fitted[band, 3] = 255
    top = vamp
    outside = sk_mask & ~m
    outside[:top] = False
    if outside.any():
        px = fitted[shoe & (fitted[..., 3] >= 240), :3]
        q = (px // 16).astype(int)
        key = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
        main = np.bincount(key).argmax()
        fitted[outside, :3] = np.median(px[key == main], axis=0)
    inside = sk_mask & m
    inside[:top] = False
    global BASE_RGB
    if BASE_RGB is None:
        BASE_RGB = rgba(ROOT / 'base.png')[..., :3]
    band = np.zeros(m.shape, bool)
    band[top - 40:top - 5] = True
    leg = BASE_RGB[band & m]
    leg = leg[sk.skin_weight(leg[None], strict=False)[0] > 0.9]
    if inside.any() and len(leg):
        lab = sk.srgb_to_lab(fitted[..., :3].astype(np.float64))
        shift = sk.srgb_to_lab(leg.astype(np.float64)).mean(0) - lab[inside].mean(0)
        moved = sk.lab_to_srgb(lab + shift)
        ww = (w * inside)[..., None]
        fitted[..., :3] = fitted[..., :3] * (1 - ww) + moved * ww
    return fitted


def fit_shoes(im, body_a):
    """Shoes go on the doll's own feet; the doll's body never changes under them.

    Codex draws each shoe with a foot of its own, bigger or smaller than hers. That
    foot is dropped (skin pixels become transparent, her foot shows through the
    openings of a sandal or pump), and each shoe is scaled and moved onto her foot:
    the toe part of the shoe as wide as her foot's toe part (closed shoes a little
    wider, so her toes never poke out), centred on her foot, the sole at her sole.
    A boot shaft (no skin at its top) is only centred on her leg."""
    a = im[..., 3] > 128
    lab, n = ndi.label(ndi.binary_dilation(a, iterations=3))
    comps = [sl for sl in ndi.find_objects(lab) if (sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start) > 2000]
    comps = sorted(comps, key=lambda sl: sl[1].start)[:2]
    feet = feet_boxes(body_a, ANKLE_Y)
    # strict: gold straps and brown leather are not skin, only the drawn foot is
    w_skin = skin_weight(im[..., :3]) * (im[..., 3] > 0)
    w_skin = np.maximum(w_skin, ndi.binary_dilation(w_skin > 0.5, iterations=1) *
                        skin_weight(im[..., :3], strict=False) * (im[..., 3] > 0))
    out = np.zeros_like(im)
    report = []
    m = body_a > 128

    def toe_width(mask, y0, y1):
        rows = [r for r in range(y0 + int((y1 - y0) * 0.6), y1) if mask[r].any()]
        if not rows:
            return 1.0
        return float(np.median([np.ptp(np.nonzero(mask[r])[0]) + 1 for r in rows]))

    for sl, (fx0, fx1, fy0, fy1) in zip(comps, feet):
        idx = np.bincount(lab[sl][lab[sl] > 0]).argmax()
        cm = lab == idx
        part = np.where(cm[..., None], im, 0).astype(np.float32)
        skin = w_skin * cm
        open_toe = (skin[sl][int((sl[0].stop - sl[0].start) * 0.7):] > 0.5).sum() > 200
        sil = part.copy()                                  # the shoe's whole outline, foot included
        if open_toe:
            # a sandal: her own foot shows through the straps
            part[..., 3] *= 1 - np.clip(skin, 0, 1)
        # a closed shoe keeps the foot drawn in it (its sides wrap that foot); scaled
        # to her foot's width below, it is her foot's size (build.py splits it off as
        # <name>-foot, toned and never tinted by a colour filter)
        shoe = part[..., 3] > 128
        ys, xs = np.nonzero(shoe)
        sy0, sy1 = ys.min(), ys.max()
        top = part[sy0:sy0 + 12, :, 3] > 128
        shaft = sy0 < ANKLE_Y - 150                        # a boot: its top is high on the leg
        foot = m.copy()
        foot[:ANKLE_Y] = False
        foot[:, :fx0] = False
        foot[:, fx1:] = False
        if shaft:
            low = 0
            legs = [g for g in segments(m[sy0 + 6]) if g[1] - g[0] > 25]
            cx = (xs[ys < sy0 + 12].min() + xs[ys < sy0 + 12].max()) / 2
            leg = min(legs, key=lambda g: abs((g[0] + g[1]) / 2 - cx))
            dx = (leg[0] + leg[1]) / 2 - cx
            fitted = scale_part(part, 1.0, (cx, sy0), (cx + dx, sy0))
            report.append([round(float(dx), 1), 1.0])
        else:
            sc = (toe_width(foot, fy0, fy1) * (1.0 if open_toe else 1.12)) / toe_width(shoe, sy0, sy1)
            sx = xs[ys > sy0 + (sy1 - sy0) * 0.6].mean()      # centre of the toe part
            fxc = np.nonzero(foot[fy0 + int((fy1 - fy0) * 0.6):fy1])[1].mean()
            low = 3
            toes = foot.copy()
            toes[:fy0 + int((fy1 - fy0) * 0.55)] = False
            for _ in range(15):
                fitted = scale_part(part, sc, (sx, sy1), (fxc, fy1 + low))
                outline = scale_part(sil, sc, (sx, sy1), (fxc, fy1 + low))[..., 3] > 128
                if open_toe or (toes & ~outline).sum() <= 15:
                    break
                # a closed shoe must hide her toes: a pointed toe grows a little and
                # reaches a little lower until they are inside
                sc *= 1.03
                low += 3
            if not open_toe:
                fitted = trim_foot(fitted, m)
            report.append([round(float(fxc - sx), 1), round(float(sc), 2)])
        out = np.where(fitted[..., 3:] > out[..., 3:], fitted, out)
    # the foot in a closed shoe starts at a straight cut over her ankle: fade its top
    # 12 rows into her own leg underneath
    rows = np.nonzero(out[..., 3].max(axis=1) > 128)[0]
    if len(rows):
        top = rows.min()
        wsk = skin_weight(out[..., :3], strict=False) * (out[..., 3] > 0)
        ramp = np.clip((np.arange(out.shape[0]) - top) / 12, 0, 1)[:, None]
        out[..., 3] *= np.where(wsk > 0.3, ramp, 1)
    return out, report


def fit_bottom(im, body_a, margin=3, depth=260):
    """A skirt, shorts or trousers must cover her torso completely: where her hips
    are wider than the drawn waist (Codex draws the waist straight while her hips
    curve out), each row is stretched sideways to reach `margin` px past the body's
    outline. The target edges are smoothed along the height so the silhouette stays
    a clean curve. Only the top \`depth\` rows (waist to crotch) are touched."""
    a = im[..., 3] > 128
    ys = np.nonzero(a.any(axis=1))[0]
    if not len(ys):
        return im, []
    top = ys.min()
    rows = range(top, min(top + depth, im.shape[0]))
    L, R, tl, tr = [], [], [], []
    for y in rows:
        it = np.nonzero(a[y])[0]
        torso = [sg for sg in segments(body_a[y] > 128) if sg[0] <= 512 <= sg[1]]
        if not len(it) or not torso:
            L.append(np.nan); R.append(np.nan); tl.append(np.nan); tr.append(np.nan)
            continue
        x0, x1 = torso[0]
        if it.max() - it.min() < 0.7 * (x1 - x0):
            # the rounded top of the waistband, or stray pixels: not a full row
            L.append(np.nan); R.append(np.nan); tl.append(np.nan); tr.append(np.nan)
            continue
        L.append(it.min()); R.append(it.max())
        tl.append(min(it.min(), x0 - margin)); tr.append(max(it.max(), x1 + margin))
    L, R, tl, tr = (np.array(v, np.float32) for v in (L, R, tl, tr))
    ok = ~np.isnan(L)
    # smooth only the extra width, so the drawn shape stays where it was wide enough
    def smooth(t, src):
        extra = np.where(ok, t - src, 0)
        extra = ndi.maximum_filter1d(extra, 15)
        extra = ndi.gaussian_filter1d(extra, 6)
        return src + extra
    tl = smooth(-tl, -L) * -1
    tr = smooth(tr, R)
    out = im.copy()
    xs = np.arange(im.shape[1], dtype=np.float32)
    grown = 0
    for k, y in enumerate(rows):
        if not ok[k] or (tl[k] >= L[k] - 0.5 and tr[k] <= R[k] + 0.5):
            continue
        src = L[k] + (xs - tl[k]) * (R[k] - L[k]) / max(tr[k] - tl[k], 1)
        for c in range(4):
            out[y, :, c] = np.interp(src, xs, im[y, :, c], left=0, right=0)
        grown = max(grown, int(round(max(L[k] - tl[k], tr[k] - R[k]))))
    return out, [grown]


def earlobes(body_a):
    """(x, y) of each earlobe, left then right: the end of the ear, where the head's
    outline steps inward onto the jaw fastest (over 4 rows)."""
    m = body_a > 128
    ys = list(range(150, 235))
    edges = {0: [], 1: []}
    for y in ys:
        sg = [g for g in segments(m[y]) if g[0] <= 512 <= g[1]]
        edges[0].append(sg[0][0] if sg else np.nan)
        edges[1].append(-sg[0][1] if sg else np.nan)      # mirrored: inward = increasing
    lobes = []
    for side in (0, 1):
        e = np.array(edges[side], np.float32)
        step = e[4:] - e[:-4]
        k = int(np.nanargmax(step))
        y = ys[k]
        x = e[k] + 4
        lobes.append((float(x if side == 0 else -x), y))
    return lobes


def fit_earrings(im, body_a, stud=False):
    """Hang each earring by its top (the small loop) from the earlobe; a stud sits
    with its middle on the lobe."""
    a = im[..., 3] > 128
    lab, n = ndi.label(ndi.binary_dilation(a, iterations=2))
    comps = sorted(ndi.find_objects(lab), key=lambda sl: sl[1].start)[:2]
    out = np.zeros_like(im)
    shifts = []
    for sl, lobe in zip(comps, earlobes(body_a)):
        if lobe is None:
            continue
        idx = lab[sl][lab[sl] > 0][0]
        cm = (lab == idx) & a
        ys, xs = np.nonzero(cm)
        top = ys.min()
        ax = xs[ys <= top + 3].mean()
        if stud:
            ax = xs.mean()
            dx, dy = int(round(lobe[0] - ax)), int(round(lobe[1] - 6 - ys.mean()))
        else:
            dx, dy = int(round(lobe[0] - ax)), int(lobe[1] - 4 - top)    # loop overlaps the lobe
        part = np.where(ndi.binary_dilation(cm, iterations=2)[..., None], im, 0)
        part = np.roll(part, (dy, dx), axis=(0, 1))
        out = np.where(part[..., 3:] > out[..., 3:], part, out)
        shifts.append([dx, dy])
    return out, shifts


# matched by name prefix, so that new models (acc-bag-clutch, acc-neck-drop) are fitted too
BAGS = ('acc-tote', 'acc-bag', 'acc-belt-bag')
NECKLACES = ('acc-chain', 'acc-pearls', 'acc-neck')


def neck(body_a):
    """(left x, right x, y) of the neck just above where it widens into the shoulders."""
    m = body_a > 128
    w0 = None
    for y in range(220, 320):
        sg = [g for g in segments(m[y]) if g[0] <= 512 <= g[1]]
        if not sg:
            continue
        x0, x1 = sg[0]
        if w0 is None and 200 < y and x1 - x0 < 90:
            w0 = x1 - x0
        if w0 is not None and x1 - x0 > w0 + 10:
            sg = [g for g in segments(m[y - 4]) if g[0] <= 512 <= g[1]]
            return float(sg[0][0]), float(sg[0][1]), y - 4
    raise ValueError('no neck found')


def fit_necklace(im, body_a, power=0.6):
    """Codex hangs a necklace from the shoulders. Bring its two top ends onto the
    sides of the neck: a trapezoid warp that narrows the top rows to the neck's width
    and leaves the bottom (pendant) as drawn."""
    a = im[..., 3] > 128
    ys, xs = np.nonzero(a)
    top, bot = ys.min(), ys.max()
    cx = (xs.min() + xs.max()) / 2
    band = a[top:top + 12]
    by, bx = np.nonzero(band)
    left_end, right_end = bx.min(), bx.max()
    nx0, nx1, ny = neck(body_a)
    ncx = (nx0 + nx1) / 2
    # the ends go round the neck: as wide as the neck itself (narrower than its base,
    # where the shoulders begin), a little above the base
    m = body_a > 128
    narrow = min(sg[1] - sg[0] for y in range(ny - 30, ny)
                 for sg in segments(m[y]) if sg[0] <= 512 <= sg[1])
    s_top = min(1.0, (narrow + 10) / max(right_end - left_end, 1))
    dy = int(round(ny - 8 - top))
    out = np.zeros_like(im)
    xs_all = np.arange(im.shape[1], dtype=np.float32)
    h = max(bot - top, 1)
    for y in range(top, bot + 1):
        t = ((y - top) / h) ** power
        sc = s_top + (1 - s_top) * t
        src = cx + (xs_all - ncx) / sc
        yy = y + dy
        if 0 <= yy < im.shape[0]:
            for c in range(4):
                out[yy, :, c] = np.interp(src, xs_all, im[y, :, c], left=0, right=0)
    return out, [round(float(s_top), 2), dy]


def fingertips(body_a):
    """(x, y): middle of her right hand's fingers (viewer's left), a little above
    the fingertips, where a short handle hangs."""
    m = body_a > 128
    ys = [y for y in range(600, 900) if segments(m[y, :512]) and segments(m[y, :512])[0][1] < 380]
    y1 = max(ys)
    xs = [np.mean(segments(m[y, :512])[0]) for y in range(y1 - 30, y1 - 10) if segments(m[y, :512])]
    return float(np.mean(xs)), y1 - 42      # the handle crosses the fingers, not the tips


# Codex draws some bags tiny next to her (a straw basket 104 px wide, a tote 297): any bag smaller than
# this (opaque box area, handle included) is scaled up to it, by at most BAG_GROW
BAG_MIN_AREA = 52000
BAG_GROW = 2.0
# how much the last fitted bag was scaled up: skin-like pixels (a straw basket) scale with it
grown = 1.0


# the bag must stay inside the figure frame (batch.FRAME_X), or the doll shrinks on every screen
BAG_FRAME = (165, 795)


def grow_bag(im, fx):
    """Scale a too small bag up around the apex of its handle, so it still hangs from the same point."""
    a = im[..., 3] > 128
    ys, xs = np.nonzero(a)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    ax = xs[ys <= y0 + 4].mean()
    k = min(BAG_GROW, (BAG_MIN_AREA / ((x1 - x0) * (y1 - y0))) ** 0.5)
    # it will hang from the fingers at fx by the apex ax: keep both sides inside the frame
    if ax > x0:
        k = min(k, (fx - BAG_FRAME[0]) / (ax - x0))
    if x1 > ax:
        k = min(k, (BAG_FRAME[1] - fx) / (x1 - ax))
    global grown
    if k <= 1.02:
        return im
    grown = k
    crop = Image.fromarray(im[y0:y1, x0:x1].clip(0, 255).astype(np.uint8))
    big = np.asarray(crop.resize((round((x1 - x0) * k), round((y1 - y0) * k)), Image.LANCZOS), dtype=np.float32)
    out = np.zeros_like(im)
    nx0 = int(round(ax - (ax - x0) * k))
    h, w = big.shape[:2]
    sx0, sy0 = max(nx0, 0), y0
    out[sy0:sy0 + h, sx0:sx0 + w] = big[:out.shape[0] - sy0, sx0 - nx0:sx0 - nx0 + out.shape[1] - sx0][:h, :w]
    return out


def fit_bag(im, body_a):
    """Hang the bag by the apex of its handle from her fingers (a too small one is first scaled up)."""
    im = grow_bag(im, fingertips(body_a)[0])
    a = im[..., 3] > 128
    ys, xs = np.nonzero(a)
    top = ys.min()
    ax = xs[ys <= top + 4].mean()
    fx, fy = fingertips(body_a)
    dx, dy = int(round(fx - ax)), int(round(fy - top))
    return np.roll(im, (dy, dx), axis=(0, 1)), [dx, dy]


def shoe_overhang(a, body_a):
    """Widest a boot shaft gets past the leg (px, either side), above the ankle: a
    shoe itself is naturally wider than a bare foot."""
    worst = 0
    for y in np.nonzero((a[:1200] > 128).any(axis=1))[0][::4]:
        legs = [g for g in segments(body_a[y] > 128) if g[1] - g[0] > 25]
        for x0, x1 in segments(a[y] > 128):
            near = [g for g in legs if g[0] <= x1 and g[1] >= x0]
            if near:
                lx0, lx1 = min(g[0] for g in near), max(g[1] for g in near)
                worst = max(worst, lx0 - x0, x1 - lx1)
    return int(worst)


def leg_offset(a, body_a, y=1400):
    """Largest distance between the centre of a trouser leg and the centre of the
    leg in it, near the ankles."""
    legs = [g for g in segments(body_a[y] > 128) if g[1] - g[0] > 25]
    worst = 0
    for x0, x1 in segments(a[y] > 128):
        inside = [g for g in legs if g[0] >= x0 - 2 and g[1] <= x1 + 2]
        if inside:
            g = inside[0]
            worst = max(worst, abs((x0 + x1) / 2 - (g[0] + g[1]) / 2))
    return int(worst)


def leg_flare(a, body_a):
    """How far a trouser leg reaches past her leg on its widest side (px), below
    the knee (wide legs are fine, a sack is not)."""
    worst = 0
    for y in range(1100, 1330, 10):
        for l0, l1 in leg_runs(body_a, y) or [g for g in segments(body_a[y] > 128) if g[1] - g[0] >= 25]:
            over = [g for g in segments(a[y] > 128) if g[0] <= l1 and g[1] >= l0]
            if over and not (over[0][0] < 470 and over[0][1] > 554):    # one run over both legs: a skirt
                worst = max(worst, l0 - over[0][0], over[-1][1] - l1)
    return int(worst)


def covers_feet(a, body_a, ankle=1440):
    """Pixels of her feet hidden by trousers low on the foot (toes, sole): wide legs
    may cover the top of the foot, but the shoes must show."""
    feet = body_a > 128
    feet[:ankle] = False
    return int((feet & (a > 128)).sum())


def waist_back(im, body_a):
    """Pixels of the trousers above the front waistband line: Codex sometimes draws
    the inside of the back waistband there. Measured as item pixels above the
    torso's widest-covered row near the top that sit over the body."""
    a = im[..., 3] > 128
    ys = np.nonzero(a.any(axis=1))[0]
    if not len(ys):
        return 0
    top = ys.min()
    # the front waistband: first row where the item covers 90% of the torso
    for y in range(top, top + 80):
        torso = [g for g in segments(body_a[y] > 128) if g[0] <= 512 <= g[1]]
        if torso and (a[y, torso[0][0]:torso[0][1] + 1]).mean() > 0.9:
            return int(a[top:y].sum())
    return 0


def verdict(name, r):
    """Problems that make a generation unusable (regenerate it)."""
    kind = name.split('-')[0]
    p = []
    if r['skin_px'] > 400 * r.get('grown', 1) ** 2 and kind not in ('shoes', 'makeup', 'hair', 'body'):
        p.append('the doll (skin) is drawn into the item')
    if r['underwear_showing_px'] > 300:
        p.append('underwear shows')
    if kind == 'bottom' and r.get('leg_flare_px', 0) > 125:
        p.append('trouser legs far wider than her legs')
    if kind == 'bottom' and r.get('covers_feet_px', 0) > 5000:
        p.append('trousers hide her feet')
    if kind == 'bottom' and r.get('leg_gap_px', 0) > 200:
        p.append('bare leg shows beside a trouser leg')
    if kind == 'bottom' and r.get('leg_offset_px', 0) > 28:
        p.append('a trouser leg is off its leg')
    if kind == 'bottom' and r['waist_overhang_px'] > 14:
        p.append('waist much wider than the body')
    if r['bottom_row'] > 1535:
        p.append('reaches below the canvas the game shows')
    if kind == 'shoes' and len(r['shift']) != 2:
        p.append('not two shoes')
    if kind == 'shoes' and r.get('shoe_overhang_px', 0) > 28:
        p.append('shoes much wider than the legs')
    if name == 'shoes-boots' and r.get('top_row', 9999) < 980:      # her knee is at y ~1040
        p.append('boots reach above the knee')
    if kind == 'acc' and name.startswith(BAGS) and r['opaque_px'] < 3000:
        p.append('bag missing')
    return p


def leg_runs(body_a, y):
    """Her two legs in row y (below the crotch): wide runs near the centre, not the
    hands hanging beside the thighs."""
    runs = [g for g in segments(body_a[y] > 128) if g[1] - g[0] >= 40 and 330 < (g[0] + g[1]) / 2 < 694]
    return runs if len(runs) == 2 else []


def fit_legs(im, body_a, margin=3):
    """Each trouser leg must cover her leg: below the crotch, a run of the item that
    lies over a leg but is narrower than it (leggings drawn a little thin) is
    stretched sideways to reach `margin` px past the leg's outline. Runs that cover
    both legs (a skirt) or are wide enough already stay as drawn. The extra width is
    smoothed along the height so the outline stays a clean curve."""
    a = im[..., 3] > 128
    ys = np.nonzero(a.any(axis=1))[0]
    if not len(ys):
        return im, 0
    H = im.shape[0]
    plan = {}                          # y -> list of (side, s0, s1, l0, l1)
    for y in range(ys.min(), ys.max() + 1):
        legs = leg_runs(body_a, y)
        if not legs:
            continue
        for side, (l0, l1) in enumerate(sorted(legs)):
            over = [g for g in segments(a[y]) if g[0] <= l1 and g[1] >= l0]
            if len(over) != 1:
                continue
            s0, s1 = over[0]
            if s0 < sorted(legs)[0][1] and s1 > sorted(legs)[1][0]:
                continue               # one run over both legs: a skirt
            covered = min(s1, l1) - max(s0, l0)
            if covered < 0.6 * (l1 - l0):
                continue               # a fringe, a pleat tip: not a trouser leg
            plan.setdefault(y, []).append((side, s0, s1, l0, l1))
    if not plan:
        return im, 0
    # extra width per side and edge, smoothed over the height
    extra = np.zeros((2, 2, H), np.float32)
    for y, runs in plan.items():
        for side, s0, s1, l0, l1 in runs:
            extra[side, 0, y] = min(20, max(0, s0 - (l0 - margin)))
            extra[side, 1, y] = min(20, max(0, (l1 + margin) - s1))
    for side in range(2):
        for e in range(2):
            v = ndi.maximum_filter1d(extra[side, e], 9)
            extra[side, e] = ndi.gaussian_filter1d(v, 4)
    out = im.copy()
    xs = np.arange(im.shape[1], dtype=np.float32)
    grown = 0
    for y, runs in plan.items():
        for side, s0, s1, l0, l1 in runs:
            t0, t1 = s0 - extra[side, 0, y], s1 + extra[side, 1, y]
            if t0 >= s0 - 0.5 and t1 <= s1 + 0.5:
                continue
            x0, x1 = int(np.floor(t0)), int(np.ceil(t1))
            dst = xs[x0:x1 + 1]
            src = s0 + (dst - t0) * (s1 - s0) / max(t1 - t0, 1)
            for c in range(4):
                out[y, x0:x1 + 1, c] = np.interp(src, xs, im[y, :, c])
            grown = max(grown, int(round(max(s0 - t0, t1 - s1))))
    return out, grown


def leg_gap(a, body_a):
    """Bare leg left showing beside a trouser leg that covers it (px)."""
    n = 0
    for y in np.nonzero((a > 128).any(axis=1))[0]:
        legs = leg_runs(body_a, y)
        for l0, l1 in legs:
            over = [g for g in segments(a[y] > 128) if g[0] <= l1 and g[1] >= l0]
            if len(over) == 1 and not (over[0][0] < min(legs)[1] and over[0][1] > max(legs)[0]):
                if min(over[0][1], l1) - max(over[0][0], l0) < 0.6 * (l1 - l0):
                    continue           # a hem fringe, not a trouser leg
                n += max(0, over[0][0] - l0) + max(0, l1 - over[0][1])
    return int(n)


# shoes drawn by editing the doll's own feet (onbody.py): already in place
ONBODY = {p.stem for d in ('onbody', 'onface', 'wear') if (ROOT / 'raw' / d).exists()
          for p in (ROOT / 'raw' / d).glob('*.png')}


def fit_choker(im, body_a):
    """A choker sits round the neck itself, not on the chest: the whole drawing is
    scaled to the neck's width (plus a little for the chain standing off the skin)
    and placed in the middle of the neck."""
    a = im[..., 3] > 128
    ys, xs = np.nonzero(a)
    nx0, nx1, ny = neck(body_a)
    m = body_a > 128
    widths = [sg[1] - sg[0] for y in range(ny - 30, ny) for sg in segments(m[y]) if sg[0] <= 512 <= sg[1]]
    narrow = min(widths)
    sc = (narrow + 8) / max(xs.max() - xs.min(), 1)
    cx = (xs.min() + xs.max()) / 2
    out = scale_part(im, sc, (cx, ys.min()), ((nx0 + nx1) / 2, ny - 26))
    return out, [round(float(sc), 2)]


def shrink_earrings(im, max_w=22, max_h=None):
    """Earrings drawn too big (too wide, or hanging too long) are scaled down about
    their top (the part on the lobe)."""
    a = im[..., 3] > 128
    lab, n = ndi.label(ndi.binary_dilation(a, iterations=2))
    out = np.zeros_like(im)
    for i in range(1, n + 1):
        cm = (lab == i) & a
        if cm.sum() < 30:
            continue
        ys, xs = np.nonzero(cm)
        w, h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        part = np.where(ndi.binary_dilation(cm, iterations=2)[..., None], im, 0)
        sc = min(1.0, max_w / w, max_h / h if max_h else 1.0)
        if sc < 1:
            ax = (xs.min() + xs.max()) / 2
            part = scale_part(part, sc, (ax, ys.min()), (ax, ys.min()))
        out = np.where(part[..., 3:] > out[..., 3:], part, out)
    return out


LENS_ALPHA = 0.5


def nose_x(base):
    """Column of the middle of her nose: the darkest shading below the eyes."""
    v = base[185:215, 480:545, :3].max(axis=-1)
    ys, xs = np.nonzero(v < np.percentile(v, 8))
    return float(xs.mean() + 480)


def fit_glasses(im, body_a, base_rgba):
    """Glasses drawn as their own layer: level them, put the lens on her eyes, and
    make a tinted lens see-through.
    - level: the tilt of the line through the two lens halves' centres is rotated out;
    - place: the lens's centre goes to the centre of her eyes, its width to 1.3x the
      span of her eyes (uniform scale, so the shape stays as drawn);
    - lens: the pixels inside the frame that are not ink and not glare become one flat
      tint at LENS_ALPHA (her own eyes show through); the rim and temples stay opaque."""
    sys.path.insert(0, str(ROOT))
    from faceacc import eyes
    a = im[..., 3] > 128
    v = im[..., :3].max(axis=-1)
    sat = (v - im[..., :3].min(axis=-1)) / np.maximum(v, 1)
    ink = a & (v < 120)
    glare = a & (v > 225) & (sat < 0.12)
    lens = a & ~ink & ~glare
    lens = ndi.binary_opening(lens, iterations=2)
    lab, n = ndi.label(lens)
    if not n:
        return im, []
    sizes = ndi.sum(lens, lab, range(1, n + 1))
    lens = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.25])
    lens = ndi.binary_fill_holes(lens) & a & ~ink
    ys, xs = np.nonzero(lens)
    mid = (xs.min() + xs.max()) / 2
    L = (xs < mid)
    angle = np.degrees(np.arctan2(ys[~L].mean() - ys[L].mean(), xs[~L].mean() - xs[L].mean()))
    # see-through lens
    tint = np.median(im[lens][:, :3][sat[lens] >= np.percentile(sat[lens], 60)], axis=0)
    out = im.copy()
    out[lens, :3] = tint
    out[lens, 3] = 255 * LENS_ALPHA
    gl = glare & ndi.binary_dilation(lens, iterations=2)
    out[gl, 3] = 255 * 0.75
    # level and place. Across: the bridge (the notch in the lens's lower edge, where
    # it rests on the nose) on the middle of her face. Size: the lens 0.8 of her head's
    # width at eye level. Down: the lens's middle on her eyes.
    _, cy, _ = eyes(base_rgba)
    row = np.nonzero(body_a[cy] > 128)[0]
    face_cx, head_w = (row.min() + row.max()) / 2, row.max() - row.min()
    bottom = np.full(lens.shape[1], -1)
    cols = np.nonzero(lens.any(axis=0))[0]
    bottom[cols] = [np.nonzero(lens[:, c])[0].max() for c in cols]
    span = (xs.max() - xs.min())
    mid_cols = cols[(cols > xs.min() + 0.35 * span) & (cols < xs.min() + 0.65 * span)]
    bridge_x = mid_cols[np.argmin(bottom[mid_cols])] if len(mid_cols) else xs.mean()
    # (Codex draws the glasses a little lopsided: the bridge and the middle of the
    # lens's width are averaged, and that point goes over the nose)
    lcx, lcy = (float(bridge_x) + (xs.min() + xs.max()) / 2) / 2, (ys.min() + ys.max()) / 2
    cx = nose_x(base_rgba)
    sc = head_w * 0.8 / (span + 1)
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    img = img.rotate(angle, resample=Image.BICUBIC, center=(lcx, lcy))
    img = img.transform(img.size, Image.AFFINE, (1 / sc, 0, lcx - cx / sc, 0, 1 / sc, lcy - (cy + 2) / sc),
                        resample=Image.BICUBIC)
    res = np.asarray(img, dtype=np.float32).copy()
    head = ndi.binary_dilation(body_a > 128, iterations=3)
    res[..., 3] *= head          # temples end at her ears
    return res, [round(float(angle), 1), round(float(sc), 2)]


JEWELLERY = ('acc-hoops', 'acc-ear', 'acc-studs', 'acc-chain', 'acc-pearls', 'acc-neck', 'acc-choker')


def drop_haze(im, reach=4):
    """Codex sometimes fills the inside of a necklace with a faint white wash (alpha up
    to ~80): keep only pixels within a few px of the solid drawing."""
    near = ndi.binary_dilation(im[..., 3] >= 128, iterations=reach)
    out = im.copy()
    out[..., 3] *= near
    return out


def fit(name, im, body_a):
    if name.startswith(JEWELLERY):
        im = drop_haze(im)
    if name.startswith(('acc-shield', 'acc-glasses-drawn')):
        return fit_glasses(im, body_a, rgba(ROOT / 'base.png'))
    if 'choker' in name:
        return fit_choker(im, body_a)
    if 'studs' in name:
        return fit_earrings(shrink_earrings(im), body_a, stud=True)
    if name in ONBODY:
        if name.startswith('bottom'):
            # drawn on her, so already her size: only close the 1-2 px slivers of leg
            # an edge can leave
            im, legs = fit_legs(im, body_a)
            return im, [0, legs]
        return im, [[0, 1.0], [0, 1.0]]
    if name.startswith('acc-hoops'):
        return fit_earrings(im, body_a)
    if name.startswith('acc-ear'):
        return fit_earrings(shrink_earrings(im, 24, 34), body_a)  # small drops only
    if name.startswith('bottom'):
        im, grown = fit_bottom(im, body_a)
        im, legs = fit_legs(im, body_a)
        return im, grown + [legs]
    """Anchored placement for items Codex does not put in place reliably.
    Clothes and hair sit on the body as drawn and are not moved."""
    a = im[..., 3] > 128
    if name.startswith('shoes'):
        return fit_shoes(im, body_a)
    if name.startswith(BAGS):
        return fit_bag(im, body_a)
    if name.startswith(NECKLACES):
        return fit_necklace(im, body_a)
    return im, [0, 0]


def underwear(base):
    """The doll's nude bandeau and briefs: light and much less saturated than skin."""
    rgb, a = base[..., :3], base[..., 3]
    v = rgb.max(axis=-1)
    ratio = (rgb[..., 0] - rgb[..., 2]) / np.maximum(rgb[..., 0], 1)
    # (skin has (r-b)/r of about 0.5; the underwear 0.23-0.36, its seams down to v 200)
    m = (a > 200) & (v > 195) & (ratio > 0.1) & (ratio < 0.41)
    m[:250] = False
    m[800:] = False
    m = ndi.binary_opening(ndi.binary_closing(m, iterations=6), iterations=2)
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 2000])


def waist_overhang(a, body_a, rows=(520, 600)):
    worst = 0
    for y in range(*rows):
        it = np.nonzero(a[y] > 128)[0]
        bd = np.nonzero(body_a[y] > 128)[0]
        # the torso only: the body segment that contains the centre
        segs = segments(body_a[y] > 128)
        torso = [sg for sg in segs if sg[0] <= 512 <= sg[1]]
        if not len(it) or not torso:
            continue
        x0, x1 = torso[0]
        worst = max(worst, x0 - it.min(), it.max() - x1)
    return int(worst)


def hip_gap(a, body_a, depth=260):
    """Body pixels left uncovered at the SIDES of a bottom (beyond its left and right
    edge), from its waist down to the crotch. A dip in the middle of the waistband
    is its shape, not a gap."""
    ys = np.nonzero((a > 128).any(axis=1))[0]
    if not len(ys):
        return 0
    n = 0
    for y in range(ys.min(), min(ys.min() + depth, a.shape[0])):
        torso = [sg for sg in segments(body_a[y] > 128) if sg[0] <= 512 <= sg[1]]
        it = np.nonzero(a[y] > 128)[0]
        if not torso or not len(it):
            continue
        x0, x1 = torso[0]
        if it.max() - it.min() < 0.7 * (x1 - x0):
            continue                     # the waistband's top edge or a corner tip
        n += int(max(0, it.min() - x0) + max(0, x1 - it.max()))
    return n


def main():
    OUT.mkdir(exist_ok=True)
    base = rgba(ROOT / 'base.png')
    body_a = base[..., 3]
    Image.fromarray(base.astype(np.uint8)).save(OUT / 'base.png')
    under = underwear(base)
    # tops must cover the bandeau, bottoms the briefs, dresses both
    lab, _ = ndi.label(under)
    ys = np.nonzero(under)[0]
    mid = (ys.min() + ys.max()) // 2
    bandeau = under & (np.arange(under.shape[0])[:, None] < mid)
    briefs = under & ~bandeau
    cover = {'top': bandeau, 'bottom': briefs, 'dress': under}
    Image.fromarray((under * 255).astype(np.uint8)).save(OUT / 'underwear-mask.png')
    report = {}
    for p in sorted(RAW.glob('*.png')):
        name = p.stem
        if name.startswith(('base', 'body', 'makeup', 'underwear')) or name.endswith(('-ref', '-back', '-front')):
            continue
        im = rgba(p)
        if im.shape[:2] != body_a.shape:
            im = np.asarray(Image.fromarray(im.astype(np.uint8)).resize(body_a.shape[::-1], Image.LANCZOS),
                            dtype=np.float32)
        a = im[..., 3]
        # stray specks Codex leaves on the canvas (a lone pixel above a waistband)
        lab, n = ndi.label(im[..., 3] > 20, structure=np.ones((3, 3)))
        if n:
            sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
            im[np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz < 40]), 3] = 0
        global grown
        grown = 1.0
        im, shift = fit(name, im, body_a)
        a = im[..., 3]
        solid = a > 200
        skin = solid & (skin_weight(im[..., :3]) > 0.7)
        if name.startswith('hair'):
            skin &= False          # hair layers may include ears/forehead shading; checked by eye
        holes = ndi.binary_fill_holes(a > 128) & (a < 20)
        holes = ndi.binary_opening(holes, iterations=1)
        on_body = (a > 128) & (body_a > 128)
        report[name] = {
            'shift': shift,
            'grown': round(grown, 2),
            'opaque_px': int((a > 128).sum()),
            'semi_px': int(((a > 20) & (a < 235)).sum()),
            'skin_px': int(skin.sum()),
            'enclosed_holes_px': int(holes.sum()),
            # underwear the item must cover but does not
            'underwear_showing_px': int((cover[name.split('-')[0]] & (a < 128)).sum())
            if name.split('-')[0] in cover else 0,
            # a bottom must hug the waist: how far it sticks out past the body
            # between the waist and the hips
            'waist_overhang_px': waist_overhang(a, body_a) if name.startswith('bottom') else 0,
            'hip_gap_px': hip_gap(a, body_a) if name.startswith('bottom') else 0,
            'shoe_overhang_px': shoe_overhang(a, body_a) if name.startswith('shoes') else 0,
            'leg_offset_px': leg_offset(a, body_a) if name.startswith('bottom') else 0,
            'leg_gap_px': leg_gap(a, body_a) if name.startswith('bottom') else 0,
            'leg_flare_px': leg_flare(a, body_a) if name.startswith('bottom') else 0,
            'covers_feet_px': covers_feet(a, body_a) if name.startswith('bottom') else 0,
            'waist_back_px': waist_back(im, body_a) if name.startswith('bottom') else 0,
            'top_row': int(np.nonzero((a > 128).any(axis=1))[0].min()) if (a > 128).any() else 0,
            # lowest row of the item: the game shows the canvas down to y 1530
            'bottom_row': int(np.nonzero((a > 20).any(axis=1))[0].max()) if (a > 20).any() else 0,
            'off_body_share': round(1 - on_body.sum() / max((a > 128).sum(), 1), 3),
        }
        problems = verdict(name, report[name])
        report[name] = {'ok': not problems, 'problems': problems, **report[name]}
        Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(OUT / f'{name}.png')
        print(name, report[name])
    (OUT / 'report.json').write_text(json.dumps(report, indent=1, default=float))


if __name__ == '__main__':
    main()
