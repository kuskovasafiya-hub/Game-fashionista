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


def main():
    base = rgba(ROOT / 'base.png')
    sys.path.insert(0, str(ROOT.parent))
    from skin import skin_weight
    for p in sorted((RAW / 'onface').glob('*.png')):
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
