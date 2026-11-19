"""v2: check back/front layer pairs against their reference, and split the doll into
a smooth body + underwear layers.

For every <name>-ref.png in art-src/v2/raw: back + doll + front must reproduce the
reference. The error map shows where the two layers do not add up (a strand that
went missing, a part on the wrong side). Writes art-src/v2/out/<name>-back.png,
<name>-front.png, <name>-err.png and pairs.json.

Underwear: base.png (with bandeau and briefs) vs raw/body-smooth.png (the same doll
without them) gives out/body.png, out/underwear-top.png, out/underwear-bottom.png.

  art-src/.venv/bin/python art-src/v2/pairs.py
"""
import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
RAW, OUT = ROOT / 'raw', ROOT / 'out'


def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'), dtype=np.float32)


def over(dst, src):
    a = src[..., 3:] / 255
    out = dst.copy()
    out[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
    out[..., 3:] = 255 * (a + dst[..., 3:] / 255 * (1 - a))
    return out


def save(img, name):
    Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(OUT / f'{name}.png')


def split_underwear(base):
    smooth_p = RAW / 'body-smooth.png'
    if not smooth_p.exists():
        return
    smooth = rgba(smooth_p)
    diff = np.abs(base[..., :3] - smooth[..., :3]).max(axis=-1)
    band = np.zeros(diff.shape, bool)
    band[300:780] = True
    m = (diff > 25) & band & (base[..., 3] > 128)
    m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=3))
    m = ndi.binary_opening(m, iterations=2)
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 1500])
    soft = ndi.gaussian_filter(m.astype(np.float32), 0.8)
    ys = np.nonzero(m)[0]
    mid = (ys.min() + ys.max()) // 2
    for part, rows in (('underwear-top', slice(0, mid)), ('underwear-bottom', slice(mid, None))):
        layer = base.copy()
        a = np.zeros(soft.shape, np.float32)
        a[rows] = soft[rows]
        layer[..., 3] = 255 * a
        save(layer, part)
    save(smooth, 'body')
    # the bottom part is fitted shorts drawn on her (gen_wear.sh underwear-bottom ->
    # wear.py -> raw/underwear-bottom.png), not the briefs of the base
    shorts = RAW / 'underwear-bottom.png'
    if shorts.exists():
        save(rgba(shorts), 'underwear-bottom')
        print('underwear-bottom: fitted shorts')
        return
    # sanity: body + underwear must give the base back
    comp = over(over(smooth, rgba(OUT / 'underwear-top.png')), rgba(OUT / 'underwear-bottom.png'))
    err = np.abs(comp[..., :3] - base[..., :3]).max(axis=-1) * (base[..., 3] > 128)
    print('underwear', int(m.sum()), 'px; body+underwear vs base, px off by >40:', int((err > 40).sum()))


def torso_region(base, pad=14):
    """Per row, the body segment that holds the canvas centre (the torso, without the
    arms that hang beside it), widened by `pad` px for clothes that stand off it."""
    a = base[..., 3] > 128
    m = np.zeros(a.shape, bool)
    for y in range(a.shape[0]):
        xs = np.nonzero(a[y])[0]
        if not len(xs):
            continue
        cut = np.nonzero(np.diff(xs) > 1)[0]
        for x0, x1 in zip(np.r_[xs[0], xs[cut + 1]], np.r_[xs[cut], xs[-1]]):
            if x0 <= 512 <= x1:
                m[y, max(0, x0 - pad):x1 + pad + 1] = True
    return m


def hem_mask(front, base, overlap=3):
    """Where a bottom may show while this top is worn: below the top's hem. The hem
    is the lowest row of the top over her torso, column by column; sleeves hanging
    down beside the torso do not count (a long sleeve would otherwise hide the
    trousers right down to her wrist). Beside the torso the bottom is never hidden."""
    a = (front[..., 3] > 128) & torso_region(base)
    h, w = a.shape
    has = a.any(axis=0)
    low = np.where(has, h - 1 - np.argmax(a[::-1], axis=0), -1).astype(np.float32)
    # the hem curves in at the side seams; follow a smooth envelope of the lowest rows
    low = np.where(has, ndi.maximum_filter1d(low, 9), -1)
    allowed = np.arange(h)[:, None] >= (low - overlap)[None, :]
    m = np.zeros((h, w, 4), np.float32)
    m[..., 3] = 255 * ndi.gaussian_filter(allowed.astype(np.float32), 1.0)
    return m


def head_cap(base):
    """The doll's dark hair cap: dark brown pixels above the brows."""
    rgb, a = base[..., :3], base[..., 3]
    m = (a > 200) & (rgb.max(axis=-1) < 140) & (rgb[..., 0] > rgb[..., 2])
    m[125:] = False                    # above the brows (they are as dark as the cap)
    lab, n = ndi.label(ndi.binary_closing(m, iterations=3))
    sizes = ndi.sum(m, lab, range(1, n + 1))
    return lab == (np.argmax(sizes) + 1)


def hair_checks(front, back, base):
    """How far a hairstyle sticks out above and to the sides of the head, and how
    much of the doll's own hair cap stays visible (not covered by hair)."""
    cap = head_cap(base)
    ys, xs = np.nonzero(cap)
    hair = (front[..., 3] > 128) | (back[..., 3] > 128)
    hy = np.nonzero(hair.any(axis=1))[0]
    head_rows = slice(ys.min(), ys.min() + 60)
    hx = np.nonzero(hair[head_rows].any(axis=0))[0]
    return {
        'above_head_px': int(max(0, ys.min() - hy.min())) if len(hy) else 0,
        'wider_than_head_px': int(max(0, max(xs.min() - hx.min(), hx.max() - xs.max()))) if len(hx) else 0,
        'cap_showing_px': int((cap & ~(front[..., 3] > 128)).sum()),
    }


def main():
    OUT.mkdir(exist_ok=True)
    base = rgba(ROOT / 'base.png')
    split_underwear(base)
    report = {}
    for ref_p in sorted(RAW.glob('*-ref.png')):
        name = ref_p.stem[:-4]
        try:
            ref, back, front = (rgba(RAW / f'{name}-{k}.png') for k in ('ref', 'back', 'front'))
        except FileNotFoundError:
            continue
        if not name.startswith('hair'):
            # the back of a garment can only show through its own openings: keep it
            # inside the outline of the front layer and the body (Codex tends to draw
            # it larger, a dark 'cape' around the dress)
            inside = ndi.binary_fill_holes(ndi.binary_closing((front[..., 3] > 128) | (base[..., 3] > 128),
                                                              iterations=8))
            inside = ndi.binary_erosion(inside, iterations=2)
            back[..., 3] *= ndi.gaussian_filter(inside.astype(np.float32), 0.8)
        if name.startswith('hair'):
            # hair always hides the doll's own hair cap: where the cap still shows
            # (a temple between fringe and face), continue the nearest strand over it
            cap = ndi.binary_dilation(head_cap(base), iterations=1) & (base[..., 3] > 128)
            gap = cap & (front[..., 3] < 200)
            if gap.any() and (front[..., 3] > 200).any():
                _, (iy, ix) = ndi.distance_transform_edt(front[..., 3] <= 200, return_indices=True)
                front[gap] = front[iy[gap], ix[gap]]
                front[gap, 3] = 255
        comp = over(over(back, base), front)
        fg = (ref[..., 3] > 128) | (comp[..., 3] > 128)
        # (blurred: a fine pattern like crochet mesh need not match hole for hole)
        blur = lambda x: ndi.gaussian_filter(x[..., :3], (2.5, 2.5, 0))
        err = np.abs(blur(comp) - blur(ref)).max(axis=-1) * fg
        err += 255 * ((ref[..., 3] > 128) != (comp[..., 3] > 128))
        bad = ndi.binary_opening(err > 60, iterations=1)
        # the doll inside the front layer (skin or underwear drawn by mistake)
        # verdict: the layers must add up to the reference (a front drawn as a product
        # shot, off the doll, gives hundreds of thousands of mismatching pixels)
        problems = []
        accepted = json.loads((ROOT / 'accepted.json').read_text()) if (ROOT / 'accepted.json').exists() else {}
        if bad.sum() > accepted.get(name, 30000):
            problems.append('layers do not match the reference: regenerate')
        if name.startswith('hair'):
            hc = hair_checks(front, back, base)
            if hc['cap_showing_px'] > 200:
                problems.append("the doll's hair cap shows")
            if hc['above_head_px'] > 25 and not name.startswith(('hair-curly', 'hair-afro', 'hair-sticks', 'hair-spacebuns', 'hair-bow')):
                problems.append('hair sits too high above the head')
        report[name] = {
            'ok': not problems, 'problems': problems,
            **(hair_checks(front, back, base) if name.startswith('hair') else {}),
            'mismatch_px': int(bad.sum()),
            'back_px': int((back[..., 3] > 128).sum()),
            'front_px': int((front[..., 3] > 128).sum()),
        }
        vis = comp.copy()
        vis[..., :3] = vis[..., :3] * 0.5 + 100
        vis[bad, :3] = [255, 0, 0]
        vis[..., 3] = 255
        save(vis, f'{name}-err')
        save(back, f'{name}-back')
        save(front, f'{name}-front')
        if name.startswith('top'):
            save(hem_mask(front, base), f'{name}-hem')
        print(name, report[name])
    (OUT / 'pairs.json').write_text(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
