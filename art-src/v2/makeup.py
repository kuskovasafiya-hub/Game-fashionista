"""v2: makeup layers. Codex edits only the doll's face (gen_makeup.sh); the layer is
what changed inside the face: eyeshadow, liner, lashes, lips, blush.

Alpha follows how much a pixel changed, so soft blush stays soft and the layer
fades out where the edit fades out. Nothing outside the face oval is taken.

  art-src/.venv/bin/python art-src/v2/makeup.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from check import rgba, segments  # noqa: E402

RAW, OUT = ROOT / 'raw', ROOT / 'out'


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
    return ndi.binary_erosion(m, iterations=4)


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


def main():
    base = rgba(ROOT / 'base.png')
    face = face_mask(base)
    for p in sorted(RAW.glob('makeup-*.png')):
        name = p.stem
        img, off = shift_to(base, rgba(p))
        diff = np.abs(img[..., :3] - base[..., :3]).max(axis=-1)
        diff = ndi.gaussian_filter(diff, 1.0)
        alpha = np.clip((diff - 10) / 35, 0, 1) * ndi.gaussian_filter(face.astype(np.float32), 2)
        # drop specks of redraw noise
        keep = ndi.binary_opening(alpha > 0.3, iterations=1)
        lab, n = ndi.label(keep)
        if n:
            sizes = ndi.sum(keep, lab, range(1, n + 1))
            keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 25])
        alpha *= ndi.gaussian_filter(ndi.binary_dilation(keep, iterations=3).astype(np.float32), 1.5)
        # Soft edges are makeup mixed with her (light) skin. Unmix them so the layer
        # holds only the makeup's own colour: edit = a * M + (1 - a) * base. Otherwise
        # the base's light skin rides along and shows as a pale halo on darker tones.
        a = np.clip(alpha, 0, 1)[..., None]
        pure = (img[..., :3] - (1 - a) * base[..., :3]) / np.maximum(a, 0.05)
        rgb = np.where(a > 0.05, np.clip(pure, 0, 255), img[..., :3])
        # what is still skin-coloured after unmixing is her skin redrawn, not makeup:
        # it would keep the light base tone on every other tone. Fade it out by how
        # close it is to her own skin there (lips and lashes differ a lot, keep them)
        sys.path.insert(0, str(ROOT.parent))
        from skin import srgb_to_lab
        d = np.linalg.norm(srgb_to_lab(rgb.astype(np.float64)) - srgb_to_lab(base[..., :3].astype(np.float64)), axis=-1)
        alpha *= np.clip((d - 8) / 14, 0, 1)
        out = np.dstack([rgb, 255 * alpha])
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(OUT / f'{name}.png')
        print(name, 'offset', off, 'px', int((alpha > 0.3).sum()))


if __name__ == '__main__':
    main()
