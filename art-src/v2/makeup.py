"""v2: makeup layers, painted from our own soft zone masks.

Codex edits the doll's face for every look (gen_makeup.sh), but nothing is cut out of
the edit: Codex redraws the whole face a little differently, so any cut-out leaves
chunks, specks and halos. The edit only gives each zone its colour.

  zones    soft masks drawn once on base.png, from her lash lines (UPPER, LOWER, hand
           placed on the base face; the other eye is the mirror), her lips and a cheek
           centre: lid, crease, lash (a band along the lashes), under (lower lash line),
           smoky (all around the eye), blush, lips.
  looks    LOOKS says which zones a look wears (the recipe). Each zone gets one
           colour C at one opacity a: at full zone strength her skin turns into the
           colour the edit has where it changed her most in that zone.
  lips     the lipstick colour carries her own lip shading (highlight, shadow).
  details  crisp ink the edit drew around the eyes: black liner / wings, lone white
           sparkles (rhinestones). Line art, so taken from the edit as ink.

Blush is a tint of her own skin: on darker tones its colour is made again from the
same shift of her skin colour (out/makeup-<look>~<tone>.png, only for looks with
blush); everything else is one colour for every tone.

  art-src/.venv/bin/python art-src/v2/makeup.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.spatial import ConvexHull

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent))
from check import rgba, segments  # noqa: E402
from skin import TONES, base_skin_lab, lab_to_srgb, srgb_to_lab  # noqa: E402

RAW, OUT = ROOT / 'raw', ROOT / 'out'

# her upper / lower lash line, left eye (her right), canvas px, from the outer corner
# in; the right eye is the mirror x -> 1023 - x
UPPER = [(453, 152.5), (456, 153.5), (463, 152), (471, 151.5), (480, 151.5), (488, 153), (493, 157), (497, 164)]
LOWER = [(458, 157), (463, 163.5), (470, 169), (480, 171.5), (490, 171), (497, 168)]
CHEEK = (183, 470)                    # blush centre (row, col), where Codex puts it
EYES = (slice(126, 186), slice(432, 592))   # where her eyes are (rows, columns)
LIPS = (slice(196, 240), slice(470, 552))
H, W = 1536, 1024

ORDER = ['smoky', 'lid', 'crease', 'lash', 'under', 'blush', 'lips']
REACH = 55.0           # opacity ~ how far the edit moved her colour / REACH ...
CAP = {'smoky': 0.6, 'lid': 0.6, 'crease': 0.5, 'lash': 0.8, 'under': 0.6, 'blush': 0.45, 'lips': 0.8}
FLOOR = 0.3            # ... within FLOOR..CAP (raised further if C would leave RGB)

# which zones each look wears; their colours come from the Codex edit
LOOKS = {
    'makeup-nude': ['crease', 'blush', 'lips'],
    'makeup-evening': ['lid', 'crease', 'under', 'lips'],
    'makeup-bright': ['lid', 'crease', 'blush', 'lips'],
    'makeup-glam': ['lid', 'lips'],
    'makeup-cateye': ['lips'],
    'makeup-y2k': ['lid', 'lips'],
    'makeup-peach': ['lid', 'crease', 'lash', 'blush', 'lips'],
    'makeup-goth': ['smoky', 'lips'],
}


def face_mask(base):
    """The face oval: inside the head outline, below the hair cap, above the chin,
    a few pixels inside the outline."""
    a = base[..., 3] > 128
    rgb = base[..., :3]
    m = np.zeros(a.shape, bool)
    for y in range(100, 250):
        sg = [g for g in segments(a[y]) if g[0] <= 512 <= g[1]]
        if sg:
            m[y, sg[0][0]:sg[0][1] + 1] = True
    cap = (rgb.max(axis=-1) < 140) & (rgb[..., 0] > rgb[..., 2]) & m
    cap[125:] = False
    m &= ~ndi.binary_dilation(cap, iterations=3)
    return ndi.binary_erosion(m, iterations=8)        # (off her face outline and ears)


def shift_to(base, img):
    """Integer translation that best aligns img onto base (phase correlation)."""
    a, b = base.mean(axis=2), img.mean(axis=2)
    r = np.fft.fft2(a - a.mean()) * np.conj(np.fft.fft2(b - b.mean()))
    r /= np.abs(r) + 1e-9
    corr = np.fft.ifft2(r).real
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    h, w = corr.shape
    dy = dy - h if dy > h // 2 else dy
    dx = dx - w if dx > w // 2 else dx
    if abs(dx) > 30 or abs(dy) > 30:
        dx = dy = 0
    return np.roll(img, (dy, dx), axis=(0, 1)), (int(dx), int(dy))


def mirror(pts):
    return [(1023 - x, y) for x, y in pts]


def poly_field(pts, box=(120, 200, 420, 610), n=400):
    """For every pixel in box: distance to the polyline, position along it (0..1,
    from its first point) and which side (+1 = left of the walking direction)."""
    p = np.array(pts, float)
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    t = np.linspace(0, seg[-1], n)
    q = np.c_[np.interp(t, seg, p[:, 0]), np.interp(t, seg, p[:, 1])]
    tan = np.gradient(q, axis=0)
    tan /= np.linalg.norm(tan, axis=1)[:, None]
    y0, y1, x0, x1 = box
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
    dx = xx[..., None] - q[:, 0]
    dy = yy[..., None] - q[:, 1]
    d2 = dx * dx + dy * dy
    i = d2.argmin(-1)
    d = np.sqrt(np.take_along_axis(d2, i[..., None], -1)[..., 0])
    ddx = np.take_along_axis(dx, i[..., None], -1)[..., 0]
    ddy = np.take_along_axis(dy, i[..., None], -1)[..., 0]
    side = np.sign(tan[i, 0] * ddy - tan[i, 1] * ddx)
    full = lambda a, fill: (lambda o: (o.__setitem__((slice(y0, y1), slice(x0, x1)), a), o)[1])(np.full((H, W), fill, float))
    return full(d, 1e3), full(i / (n - 1), 0.0), full(side, 0.0)


def smooth(x, a, b):
    """0 at a, 1 at b (smoothstep), works for a > b too."""
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def zones(eyes, lips, teeth, face):
    """The soft zone masks, full canvas, 0..1."""
    z = {k: np.zeros((H, W)) for k in ('lid', 'crease', 'lash', 'under', 'smoky', 'blush')}
    for flip in (False, True):
        up = mirror(UPPER) if flip else UPPER
        lo = mirror(LOWER) if flip else LOWER
        du, su, sd = poly_field(up)
        dl, sl, sdl = poly_field(lo)
        # "above" the upper lash line = the side away from the eye
        above = (sd < 0 if not flip else sd > 0) | (du < 1.5)   # (up to the lashes)
        below = sdl > 0 if not flip else sdl < 0
        inner_fade = smooth(su, 1.0, 0.8)                 # fades out at the inner corner
        outer = smooth(su, 0.0, 0.08)                    # rounded outer end
        lid = above * smooth(du, 10, 2.5) * inner_fade * outer
        z['lid'] = np.maximum(z['lid'], lid)
        cr = above * smooth(du, 13, 9) * smooth(du, 3, 7) * smooth(su, 0.75, 0.3) * outer
        z['crease'] = np.maximum(z['crease'], cr)
        z['lash'] = np.maximum(z['lash'], above * smooth(du, 3.5, 1) * smooth(su, 1.0, 0.85) * outer)
        z['under'] = np.maximum(z['under'], below * smooth(dl, 4, 1) * smooth(sl, 1.0, 0.55) * smooth(sl, 0.0, 0.1))
        # smoky: all around the eye opening
        im = Image.new('L', (W, H), 0)
        ImageDraw.Draw(im).polygon(up[1:] + lo[::-1], fill=255)
        dout = ndi.distance_transform_edt(np.asarray(im) == 0)
        sm = ndi.gaussian_filter(smooth(dout, 12, 1) * np.where(below, 0.8 * smooth(dout, 9, 1), 1), 1.5)
        z['smoky'] = np.maximum(z['smoky'], sm)
        cy, cx = CHEEK
        cx = 1023 - cx if flip else cx
        yy, xx = np.mgrid[:H, :W]
        z['blush'] = np.maximum(z['blush'], np.exp(-(((yy - cy) / 10) ** 2 + ((xx - cx) / 13) ** 2) / 2) * smooth(yy, 168, 178))
    faceb = ndi.gaussian_filter(face.astype(float), 2)
    off_eye = 1 - ndi.gaussian_filter(eyes.astype(float), 0.6)
    for k in z:
        z[k] = ndi.gaussian_filter(z[k], 0.8) * faceb * off_eye
    z['lips'] = ndi.gaussian_filter(lips.astype(float), 0.7) * (1 - ndi.gaussian_filter(teeth.astype(float), 0.5))
    return z


def eye_mask(base):
    """The whites of the eyes and what lies between them (the iris): the convex hull
    of each eye's white. The iris above the hull is dark, so the wash keeps off it
    anyway (see keep_off in build)."""
    sc = (base[..., :3].min(axis=-1) > 200) & (base[..., 3] > 200)
    zone = np.zeros(sc.shape, bool)
    zone[EYES] = True
    sc &= zone
    out = np.zeros(sc.shape, bool)
    pts = np.argwhere(sc)
    for side in (pts[:, 1] < 512, pts[:, 1] >= 512):
        p = pts[side]
        h = ConvexHull(p[:, ::-1])
        im = Image.new('L', (sc.shape[1], sc.shape[0]), 0)
        ImageDraw.Draw(im).polygon([tuple(p[v, ::-1].tolist()) for v in h.vertices], fill=255)
        out |= ndi.binary_dilation(np.asarray(im) > 0, iterations=1)
    return out


def lip_mask(base, lab):
    """Her lips on base.png: redder than the skin around them (CIELAB a*), closed
    and filled; the teeth (near white) separately."""
    z = np.zeros(lab.shape[:2], bool)
    z[LIPS] = True
    lips = ndi.binary_closing((lab[..., 1] > 30) & z, iterations=2)
    lips = ndi.binary_fill_holes(lips)
    lab_, n = ndi.label(lips)
    sizes = ndi.sum(lips, lab_, range(1, n + 1))
    lips = ndi.binary_fill_holes(ndi.binary_closing(lab_ == np.argmax(sizes) + 1, iterations=3))
    teeth = (base[..., :3].min(axis=-1) > 190) & lips
    return lips & ~teeth, teeth


def over(dst_rgb, dst_a, src_rgb, src_a):
    """src over dst, both straight alpha."""
    out_a = src_a + dst_a * (1 - src_a)
    rgb = (src_rgb * src_a[..., None] + dst_rgb * (dst_a * (1 - src_a))[..., None]) / np.maximum(out_a, 1e-6)[..., None]
    return rgb, out_a


def ink(edit, under, k, region, darker):
    """Opacity of ink colour k that turns `under` into `edit`, where the edit is
    clearly darker (or lighter) than what lies beneath it."""
    uk = under - k
    a = ((under - edit) * uk).sum(-1) / np.maximum((uk * uk).sum(-1), 1.0)
    le, lu = srgb_to_lab(edit)[..., 0], srgb_to_lab(under)[..., 0]
    gap = (lu - le) if darker else (le - lu)
    a = np.clip(a, 0, 1) * np.clip((gap - 8) / 10, 0, 1) * region
    a[a < 0.08] = 0
    return a


def fit(name, base, edit, z, lines):
    """[(zone, C, a)] for a look: per zone, the colour the edit has where it changed
    her most, as colour C at opacity a over what lies beneath (base + earlier zones)."""
    bl, el = srgb_to_lab(base), srgb_to_lab(edit)
    rgb, alpha = np.zeros_like(base), np.zeros(base.shape[:2])
    out = []
    for k in [k for k in ORDER if k in LOOKS[name]]:
        under = rgb * alpha[..., None] + base * (1 - alpha[..., None])
        if k == 'lips':
            sel = (z[k] > 0.6) & (bl[..., 0] > 40)
        else:
            sel = (z[k] > 0.6) & (lines < 0.3)
            edark = el[..., 0] < 40
            if edark[sel].mean() < 0.4:          # liner drawn across the zone: not its colour
                sel &= ~ndi.binary_dilation(edark, iterations=1)
        dist = np.linalg.norm(edit - under, axis=-1)
        sel &= dist >= np.percentile(dist[sel], 60)
        E, U = np.median(edit[sel], axis=0), np.median(under[sel], axis=0)
        a = float(np.clip(np.linalg.norm(E - U) / REACH, FLOOR, CAP[k]))
        need = max((e - u) / ((255.0 if e > u else 0.0) - u - 1e-9) for e, u in zip(E, U))
        a = float(min(max(a, need), 1.0))
        C = np.clip(U + (E - U) / a, 0, 255)
        out.append((k, C, a, U))
        rgb, alpha = over(rgb, alpha, *layer(k, C, a, z, base, bl))
    return out


def layer(k, C, a, z, base, bl):
    """Colour and opacity of one zone."""
    za = z[k] * a
    if k == 'lips':
        lip = z['lips'] > 0.5
        shade = np.clip(base / np.median(base[lip], axis=0), 0.55, 1.5).mean(-1, keepdims=True)
        return np.clip(C * shade, 0, 255), za * np.clip((bl[..., 0] - 28) / 14, 0, 1)   # (mouth line)
    if k != 'smoky':
        # off her own dark lines (lashes, liner, brows), unless the colour is dark too
        dark = np.clip((38 - bl[..., 0]) / 14, 0, 1) * (srgb_to_lab(C[None, None])[0, 0, 0] > 35)
        za = za * (1 - dark)
    return np.broadcast_to(C, base.shape), za


def blush_for(C, a, U, skin0, tone):
    """The blush colour on another tone: the same shift of her skin colour (CIELAB)."""
    lab = lambda c: srgb_to_lab(np.asarray(c, float)[None, None])[0, 0]
    R0 = lab(U * (1 - a) + C * a)
    U_t = lab(U) + (np.array(TONES[tone]) - skin0)
    R_t = U_t + (R0 - lab(U))
    u_t, r_t = lab_to_srgb(U_t[None, None])[0, 0], lab_to_srgb(R_t[None, None])[0, 0]
    return np.clip(u_t + (r_t - u_t) / a, 0, 255)


def paint(fitted, z, base, bl, tone=None, skin0=None):
    rgb, alpha = np.zeros_like(base), np.zeros(base.shape[:2])
    for k, C, a, U in fitted:
        if k == 'blush' and tone is not None:
            C = blush_for(C, a, U, skin0, tone)
        rgb, alpha = over(rgb, alpha, *layer(k, C, a, z, base, bl))
    return rgb, alpha


def details(base, edit, rgb, alpha, eyes):
    """Ink the edit drew around the eyes over everything: dark liner and wings, lone
    white sparkles (rhinestones). Shimmer (dense glints) is the shadow's own colour."""
    el = srgb_to_lab(edit)
    zone = ndi.gaussian_filter(ndi.binary_dilation(eyes, iterations=24).astype(float), 2) * (1 - eyes)
    under = rgb * alpha[..., None] + base * (1 - alpha[..., None])
    darkest = (el[..., 0] < 22) & (zone > 0.5)
    k = np.median(edit[darkest], axis=0) if darkest.sum() > 20 else np.array([25.0, 18, 18])
    a = ndi.gaussian_filter(ink(edit, under, k, zone, darker=True), 0.4)
    ink_d = (k, a)
    rgb, alpha = over(rgb, alpha, np.broadcast_to(k, rgb.shape), a)
    under = rgb * alpha[..., None] + base * (1 - alpha[..., None])
    bl = srgb_to_lab(base)
    glint = (el[..., 0] - ndi.gaussian_filter(el[..., 0], 2.5) > 8) & (np.hypot(el[..., 1], el[..., 2]) < 25)
    lone = glint & (ndi.gaussian_filter(glint.astype(np.float32), 4) < 0.12) & (el[..., 0] - bl[..., 0] > 12)
    shine = zone * ndi.binary_dilation(lone, iterations=1)
    a_w = ink(edit, under, np.array([255.0, 255, 255]), np.clip(shine, 0, 1), darker=False)
    return ink_d, a_w


def main():
    base_rgba = rgba(ROOT / 'base.png')
    base = base_rgba[..., :3].astype(np.float64)
    bl = srgb_to_lab(base)
    face, eyes = face_mask(base_rgba), eye_mask(base_rgba)
    lips, teeth = lip_mask(base_rgba, bl)
    z = zones(eyes, lips, teeth, face)
    faceb = ndi.gaussian_filter(face.astype(float), 2)
    dip = ndi.gaussian_filter(bl[..., 0], 1.5) - bl[..., 0]
    lines = ndi.gaussian_filter(((dip > 6) | (bl[..., 0] < 45)).astype(float), 0.5)
    body = rgba(OUT / 'body.png')
    skin0 = base_skin_lab(np.where(body[..., 3:] > 128, body[..., :3], 255).astype(np.float32))
    for old in OUT.glob('makeup-*~*.png'):
        old.unlink()
    for p in sorted(RAW.glob('makeup-*.png')):
        edit, off = shift_to(base_rgba, rgba(p))
        edit = edit[..., :3].astype(np.float64)
        fitted = fit(p.stem, base, edit, z, lines)
        rgb, alpha = paint(fitted, z, base, bl)
        (k, a_d), a_w = details(base, edit, rgb, alpha, eyes)
        tones = [None] + ([t for t, v in TONES.items() if v is not None] if 'blush' in LOOKS[p.stem] else [])
        for t in tones:
            rgb, alpha = paint(fitted, z, base, bl, t, skin0)
            rgb, alpha = over(rgb, alpha, np.broadcast_to(k, rgb.shape), a_d)
            rgb, alpha = over(rgb, alpha, np.full(rgb.shape, 255.0), a_w)
            out = np.dstack([rgb, 255 * alpha * faceb])
            Image.fromarray(out.clip(0, 255).round().astype(np.uint8)).save(
                OUT / (f'{p.stem}.png' if t is None else f'{p.stem}~{t}.png'))
        print(p.stem, 'offset', off, ' '.join(f'{k}=#%02x%02x%02x@{a:.2f}' % tuple(int(round(v)) for v in C)
                                              for k, C, a, _ in fitted))


if __name__ == '__main__':
    main()
