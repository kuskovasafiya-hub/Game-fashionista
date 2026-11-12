"""v2: the doll's body without underwear, made once from base.png by filling the
bandeau and briefs with smooth skin (the image model refuses to draw it).

The result is a featureless mannequin torso: the underwear area is filled by
interpolating the surrounding skin colour (a smooth membrane, no details), and
where the underwear reached the silhouette the dark outline is redrawn. Writes
raw/body-smooth.png; pairs.py then splits base.png into body + underwear layers.

  art-src/.venv/bin/python art-src/v2/body.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from check import underwear  # noqa: E402


def fill(rgb, hole, iterations=3000):
    """Harmonic fill: each hole pixel becomes the mean of its neighbours, solved
    coarse-to-fine so that it converges fast. Known pixels stay fixed."""
    out = rgb.copy()
    known = ~hole
    # initial guess: colour of the nearest known pixel
    _, (iy, ix) = ndi.distance_transform_edt(hole, return_indices=True)
    out[hole] = rgb[iy[hole], ix[hole]]
    k = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], np.float32) / 4
    ys, xs = np.nonzero(hole)
    y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
    sub, h = out[y0:y1, x0:x1].copy(), hole[y0:y1, x0:x1]
    for _ in range(iterations):
        avg = np.stack([ndi.convolve(sub[..., c], k, mode='nearest') for c in range(3)], -1)
        sub[h] = avg[h]
    out[y0:y1, x0:x1] = sub
    return out


def main():
    base = np.asarray(Image.open(ROOT / 'base.png').convert('RGBA'), dtype=np.float32)
    rgb, a = base[..., :3], base[..., 3]
    inside = a > 128
    under = underwear(base)
    # the underwear's own outlines and the soft rim along them belong to it too
    dark = rgb.max(axis=-1) < 140
    region = ndi.binary_dilation(under, iterations=4) & inside
    region |= ndi.binary_dilation(region, iterations=2) & dark & inside
    region &= inside
    # the silhouette outline stays: a band along the transparent edge is not filled
    dist = ndi.distance_transform_edt(inside)
    edge = dist <= 3.5
    hole = region & ~edge
    # skin to interpolate from: body pixels around the hole that are skin, not ink
    src_ok = inside & ~region & ~dark
    # The fill takes its colours from skin only: ink near the hole (the silhouette
    # outline, creases) is replaced by the nearest skin before solving, or it would
    # smear dark blotches into the torso. Those ink pixels keep their own colour in
    # the output unless they lie inside the hole.
    near = ndi.binary_dilation(hole, iterations=12)
    skinny = inside & ~dark & ~region
    _, (iy, ix) = ndi.distance_transform_edt(~skinny, return_indices=True)
    work = rgb.copy()
    swap = near & ~skinny & ~hole
    work[swap] = rgb[iy[swap], ix[swap]]
    # interior creases next to the hole (not the silhouette) go with the fill
    bad_border = ndi.binary_dilation(hole, iterations=6) & dark & ~edge
    filled = fill(work, hole | bad_border)
    out = base.copy()
    out[..., :3] = np.where((hole | bad_border)[..., None], filled, rgb)
    # outline along the silhouette where the underwear met the edge: ink of the body
    ink = np.median(rgb[inside & dark & (dist <= 2)], axis=0)
    rim = region & edge & inside
    t = np.clip((dist - 1.0) / 2.5, 0, 1)[..., None]     # 0 at the edge: ink, 1 inside: skin
    out[..., :3] = np.where(rim[..., None], ink * (1 - t) + out[..., :3] * t, out[..., :3])
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(ROOT / 'raw' / 'body-smooth.png')
    print('filled px', int((hole | bad_border).sum()), 'rim px', int(rim.sum()))


if __name__ == '__main__':
    main()
