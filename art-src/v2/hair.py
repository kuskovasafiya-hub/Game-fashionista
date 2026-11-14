"""Hair colours: a recoloured copy of every hair layer per colour, <layer>~<colour>.webp.

Each hairstyle was drawn in its own colour (brown waves, a ginger braid, an ash pixie),
so a colour is a gradient map, not a hue shift: a pixel's lightness is placed between
the style's own darkest and lightest hair (percentiles over its back and front layers
together, so both halves get the same colour) and that position picks a colour on the
target ramp. Shading, strands and line art stay where they were; the ramp's first stop
is the line art.

The ids and order must match HAIR_COLOURS in src/art/Doll.tsx ('natural' = the drawn
colour, no files). Run by build.py; on its own it rewrites only the hair colour files
from out/hair-*.png and the boxes already in src/art/layers.json.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

V2 = pathlib.Path(__file__).resolve().parent
ROOT = V2.parent.parent
sys.path.insert(0, str(V2.parent))
import skin  # noqa: E402

OUT = V2 / 'out'
ART = ROOT / 'public' / 'art'

# stops at t = 0 (line art), 0.12 (deep shadow), 0.55 (mid), 1 (highlight)
COLOURS = {
    'black': ('#0c0a10', '#1b161f', '#3a3240', '#6c6272'),
    'chocolate': ('#1a0d08', '#341b10', '#6a3c26', '#a87250'),
    'ginger': ('#2e0f06', '#6a2410', '#c45a22', '#f5a868'),
    'honey': ('#3a2210', '#7a4a1e', '#c99050', '#f6d290'),
    'platinum': ('#4a4038', '#8c7e6e', '#d9cdb9', '#fdf8ee'),
    'pink': ('#3e1028', '#8a2f5c', '#e27aab', '#ffd0e3'),
    'lavender': ('#24163e', '#4e3880', '#9b7ed4', '#e2d4ff'),
    'blue': ('#0e1a36', '#244278', '#4f8ad0', '#bfe0ff'),
}
STOPS = np.array([0.0, 0.12, 0.55, 1.0])


def hex_lab(h):
    rgb = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)]], np.float64)
    return skin.srgb_to_lab(rgb)[0]


RAMPS = {c: np.stack([hex_lab(h) for h in hs]) for c, hs in COLOURS.items()}


def styles():
    """hair style -> its layer names present in out/."""
    found = {}
    for p in sorted(OUT.glob('hair-*-*.png')):
        style, side = p.stem.rsplit('-', 1)
        if side in ('front', 'back'):
            found.setdefault(style, []).append(p.stem)
    return found


def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'), dtype=np.float64)


def recolour(lab, lo, hi, ramp):
    t = np.clip((lab[..., 0] - lo) / (hi - lo), 0, 1)
    out = np.stack([np.interp(t, STOPS, ramp[:, k]) for k in range(3)], -1)
    return skin.lab_to_srgb(out)


def write(layers):
    """Every colour of every hair layer in `layers` (the boxes build.py just saved)."""
    n = 0
    for style, names in styles().items():
        imgs = {nm: rgba(OUT / f'{nm}.png') for nm in names if nm in layers}
        if not imgs:
            continue
        labs = {nm: skin.srgb_to_lab(im[..., :3]) for nm, im in imgs.items()}
        hair_l = np.concatenate([labs[nm][..., 0][im[..., 3] > 200] for nm, im in imgs.items()])
        lo, hi = np.percentile(hair_l, [1, 99.5])
        for nm, im in imgs.items():
            box = layers[nm]
            sl = (slice(box['y'], box['y'] + box['h']), slice(box['x'], box['x'] + box['w']))
            lab = labs[nm][sl]
            for c, ramp in RAMPS.items():
                out = np.dstack([recolour(lab, lo, hi, ramp), im[sl][..., 3]])
                Image.fromarray(out.clip(0, 255).round().astype(np.uint8)).save(
                    ART / f'{nm}~{c}.webp', 'WEBP', quality=88, method=6)
                n += 1
    return n


if __name__ == '__main__':
    print(write(json.loads((ROOT / 'src' / 'art' / 'layers.json').read_text())), 'files')
