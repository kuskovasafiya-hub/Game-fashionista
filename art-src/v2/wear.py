"""v2: garment layers from edits of the doll (gen_wear.sh).

The layer is what changed below her waist: new opaque pixels (wide trouser legs
beyond her legs) and pixels that clearly changed colour (denim over her skin and
briefs). Her skin left unchanged (a hand in front of the hip, the gap between the
legs) is not taken, so her own body shows there in any skin tone. Codex's small
redraws of skin are dropped. Written to raw/<name>.png; check.py uses it as is.

  art-src/.venv/bin/python art-src/v2/wear.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent))
from check import rgba  # noqa: E402
from onbody import shift_to  # noqa: E402
from skin import skin_weight  # noqa: E402

RAW = ROOT / 'raw'
TOP_ROW = {'bottom': 470}           # nothing of a bottom above this row


def main():
    base = rgba(ROOT / 'base.png')
    for p in sorted((RAW / 'wear').glob('*.png')):
        kind = p.stem.split('-')[0]
        img, off = shift_to(base, rgba(p))
        ia, ba = img[..., 3] > 128, base[..., 3] > 128
        diff = ndi.gaussian_filter(np.abs(img[..., :3] - base[..., :3]).max(axis=-1), 0.8)
        m = (ia & ~ba) | (ia & ba & (diff > 40))
        m[:TOP_ROW.get(kind, 0)] = False
        m &= ~(skin_weight(img[..., :3]) > 0.6)          # her skin, redrawn: not the garment
        m = ndi.binary_closing(m, iterations=2)
        m = ndi.binary_opening(m, iterations=1)
        lab, n = ndi.label(m)
        if n:
            sizes = ndi.sum(m, lab, range(1, n + 1))
            m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(400, sizes.max() * 0.02)])
        # small holes inside the garment (a paint splatter close to the base colour)
        holes = ndi.binary_fill_holes(m) & ~m
        hl, hn = ndi.label(holes)
        if hn:
            hs = ndi.sum(holes, hl, range(1, hn + 1))
            m |= np.isin(hl, [i + 1 for i, s in enumerate(hs) if s < 150])
        m &= ia
        alpha = ndi.gaussian_filter(m.astype(np.float32), 0.6) * (img[..., 3] / 255)
        out = np.dstack([img[..., :3], 255 * alpha])
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(RAW / f'{p.stem}.png')
        far = ia & ~ndi.binary_dilation(ba, iterations=140)
        print(p.stem, 'offset', off, 'px', int(m.sum()), 'backdrop px', int(far.sum()))


if __name__ == '__main__':
    main()
