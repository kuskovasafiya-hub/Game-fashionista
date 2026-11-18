"""v2: face accessories (glasses) from edits of the doll's face (gen_face.sh).

The layer is what changed on the head: frames, temples, tinted lenses. A clear lens
barely changes the face behind it, so it stays transparent there and her own face
(in any skin tone) shows through. Written to raw/<name>.png; check.py uses it as is.

  art-src/.venv/bin/python art-src/v2/faceacc.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from check import rgba  # noqa: E402
from onbody import shift_to  # noqa: E402

RAW = ROOT / 'raw'
HEAD = (slice(90, 260), slice(400, 624))      # rows, columns where glasses can be


LENS_ALPHA = 0.55
# Glasses with a big tinted lens: an edit of the face cannot give a clean lens (Codex
# re-tints the whole face a little), so they are placed from their shop picture.
FROM_PRODUCT = set()      # (tried for the shield: the rim got lost when shrunk)
LENS_H = 44            # px: lens height on her face
PRODUCTS = ROOT.parent / 'raw' / 'product'


def eyes(base):
    """(centre x, centre y, width from outer corner to outer corner) of her eyes."""
    v = base[..., :3].max(axis=-1)
    reg = np.zeros(v.shape, bool)
    reg[140:200, 445:580] = True
    dark = (v < 70) & reg & (base[..., 3] > 128)
    lab, n = ndi.label(dark)
    boxes = [sl for sl in ndi.find_objects(lab)
             if (sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start) > 300]   # not brows' tips
    ys = [(sl[0].start + sl[0].stop) / 2 for sl in boxes]
    xs = [x for sl in boxes for x in (sl[1].start, sl[1].stop)]
    y = int(np.mean(ys))
    return (min(xs) + max(xs)) / 2, y, max(xs) - min(xs)


def from_product(name, base):
    """The glasses from their shop picture, on her eyes: as wide as her head at eye
    level, the lens centred on her eyes. Lens pixels (not ink, not highlights) become
    one flat tint at LENS_ALPHA so her own eyes show through; outline and temples
    stay opaque."""
    prod = np.asarray(Image.open(PRODUCTS / f'{name}.png').convert('RGBA'), dtype=np.float32)
    a = prod[..., 3] > 128
    ys, xs = np.nonzero(a)
    prod = prod[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    a = prod[..., 3] > 128
    v = prod[..., :3].max(axis=-1)
    sat = (v - prod[..., :3].min(axis=-1)) / np.maximum(v, 1)
    ink = v < 110
    metal = a & ~ink & (sat < 0.15)                  # silver temples and hinges, white highlights
    lens = a & ~ink & ~metal
    lens = ndi.binary_opening(lens, iterations=2)
    big = ndi.label(lens)
    lab, n = big
    if n:
        sizes = ndi.sum(lens, lab, range(1, n + 1))
        lens = ndi.binary_fill_holes(np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.2]))
    # the temples rise from the lens ends in the shop picture (seen from the front they
    # would run back to her ears, behind the face): keep the lens and its rim only
    rim = ndi.binary_dilation(lens, iterations=6)
    a = (lens | (ink & rim))                         # the lens and its outline: no hinges
    # the lens colour: its most saturated fifth (the rest is glare and reflections)
    lp = prod[lens][:, :3]
    ls = sat[lens]
    tint = np.median(lp[ls >= np.percentile(ls, 80)], axis=0)
    out = prod.copy()
    out[..., 3] = np.where(a, 255.0, 0.0)
    out[lens, :3] = tint
    out[lens, 3] = 255 * LENS_ALPHA
    hl = lens & metal                                # highlights on the lens: brighter glass
    out[hl, :3] = prod[hl, :3]
    out[hl, 3] = 255 * 0.7
    # place it
    out[~a, 3] = 0
    cx, cy, eye_w = eyes(base)
    lx = np.nonzero(lens.any(axis=0))[0]
    ly = np.nonzero(lens.any(axis=1))[0]
    scale = eye_w * 1.32 / (lx.max() - lx.min() + 1)       # a little wider than her eyes
    scale_y = LENS_H / (ly.max() - ly.min() + 1)            # from her brows to her cheekbones
    lens_cy = (ly.min() + ly.max()) / 2 * scale_y
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    img = img.resize((max(1, round(out.shape[1] * scale)), max(1, round(out.shape[0] * scale_y))), Image.LANCZOS)
    canvas = Image.new('RGBA', (base.shape[1], base.shape[0]), (0, 0, 0, 0))
    lx0 = lx.min() * scale
    lxc = (lx.min() + lx.max()) / 2 * scale
    canvas.paste(img, (int(round(cx - lxc)), int(round(cy + 2 - lens_cy))), img)
    # the lens stays on her face: nothing past the head's outline
    out = np.asarray(canvas, dtype=np.float32).copy()
    head = ndi.binary_dilation(base[..., 3] > 128, iterations=1)
    out[..., 3] *= ndi.gaussian_filter(head.astype(np.float32), 0.7)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def main():
    base = rgba(ROOT / 'base.png')
    sys.path.insert(0, str(ROOT.parent))
    from skin import skin_weight
    for name in sorted(FROM_PRODUCT):
        from_product(name, base).save(RAW / f'{name}.png')
        print(name, 'from its shop picture')
    for p in sorted((RAW / 'onface').glob('*.png')):
        if p.stem in FROM_PRODUCT:
            continue
        img, off = shift_to(base, rgba(p))
        diff = ndi.gaussian_filter(np.abs(img[..., :3] - base[..., :3]).max(axis=-1), 0.8)
        ia = img[..., 3] > 128
        region = np.zeros(ia.shape, bool)
        region[HEAD] = True
        # Codex redraws the face a little while editing (outline, ears, lips): the
        # glasses are the one big connected thing that changed, frames and temples,
        # never skin-coloured
        skin = skin_weight(img[..., :3], strict=False) > 0.5
        m = ((diff > 45) | (ia & (base[..., 3] < 128))) & ia & region & ~skin
        m = ndi.binary_closing(m, iterations=1)
        lab, n = ndi.label(m, structure=np.ones((3, 3)))
        if not n:
            continue
        sizes = ndi.sum(m, lab, range(1, n + 1))
        big = np.argmax(sizes) + 1
        frame = lab == big
        # pieces close to the frame (a nose pad, the far temple) belong to it
        near = ndi.binary_dilation(frame, iterations=6)
        frame |= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 40 and (near & (lab == i + 1)).any()])
        # a thin gold bridge can be lost with the skin colours: the other lens is then a
        # piece of its own, nearly as big as the first one
        frame |= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.4])
        # lenses: a hole in the frame is a lens; only a dark (tinted) one is drawn,
        # through a clear one her own eye shows
        holes = ndi.binary_fill_holes(frame) & ~frame
        hl, hn = ndi.label(holes)
        v = img[..., :3].max(axis=-1)
        for k in range(1, hn + 1):
            h = hl == k
            if v[h].mean() < 110:
                frame |= h
        alpha = ndi.gaussian_filter(frame.astype(np.float32), 0.6) * (img[..., 3] / 255)
        out = np.dstack([img[..., :3], 255 * alpha])
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(RAW / f'{p.stem}.png')
        print(p.stem, 'offset', off, 'px', int(frame.sum()))


if __name__ == '__main__':
    main()
