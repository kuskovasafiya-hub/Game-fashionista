"""v2 experiment: looks assembled from art-src/v2/out on every skin tone.

  art-src/.venv/bin/python art-src/v2/sheet.py out.png "hair-long+top-tee+bottom-jeans" ...

Skin tones recolour the body only (and the feet inside a shoe layer): clothes and hair
carry no skin, so there is nothing else to recolour.
"""
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
import skin  # noqa: E402

OUT = ROOT / 'out'
# Drawing order. '*-back' layers go under the body, '*-front' (or single) layers over it.
ORDER = ['hair:back', 'top:back', 'dress:back', 'bottom:back', 'body', 'underwear-bottom', 'underwear-top',
         'shoes', 'bottom', 'dress', 'top', 'acc-tote', 'acc-bag', 'hair', 'acc-hoops']
TONES = ['fair', 'light', 'tan', 'brown', 'deep']


def load(name):
    return np.asarray(Image.open(OUT / f'{name}.png').convert('RGBA'), dtype=np.float64)


BASE = load('base')
BODY = load('body')                       # smooth body without underwear (body.py)
MEAN = skin.base_skin_lab(np.where(BASE[..., 3:] > 128, BASE[..., :3], 255).astype(np.float32))


def tone(img, t, whole):
    if skin.TONES.get(t) is None:
        return img
    w = skin.skin_weight(img[..., :3], strict=not whole) * (img[..., 3] > 0)
    rgb = skin.recolour(img[..., :3], w, MEAN, t)
    return np.dstack([rgb, img[..., 3]])


def rank(name):
    kind = name.split('-')[0]
    key = f'{kind}:back' if name.endswith('-back') else name if name.startswith(('underwear', 'acc', 'body')) else kind
    return ORDER.index(key) if key in ORDER else len(ORDER)


def layers_for(item):
    """An item is a back/front pair when both files exist, else one layer."""
    if (OUT / f'{item}-front.png').exists():
        return [f'{item}-back', f'{item}-front']
    return [item]


def look(names, t):
    c = Image.new('RGBA', (1024, 1536), (245, 225, 235, 255))
    body = BODY.copy()
    kinds = {n.split('-')[0] for n in names}
    import json as _json
    cuts = _json.loads((OUT / 'cuts.json').read_text()) if (OUT / 'cuts.json').exists() else {}
    for n in names:
        if n in cuts:
            body[cuts[n]:, :, 3] = 0       # a closed shoe brings her foot inside it
    parts = ['body']
    if not kinds & {'top', 'dress'}:
        parts.append('underwear-top')
    if not kinds & {'bottom', 'dress'}:
        parts.append('underwear-bottom')
    for n in names:
        parts += layers_for(n)
    tops = [n for n in names if n.startswith('top')]
    hem = load(f'{tops[0]}-hem')[..., 3:] / 255 if tops and (OUT / f'{tops[0]}-hem.png').exists() else None
    for n in sorted(parts, key=rank):
        img = body if n == 'body' else load(n)
        if hem is not None and n.startswith('bottom'):
            img = img.copy()
            img[..., 3:] *= hem               # nothing of the bottom above the top's hem
        if n == 'body' or n.startswith('shoes'):
            img = tone(img, t, whole=(n == 'body'))
        c.alpha_composite(Image.fromarray(img.clip(0, 255).astype(np.uint8)))
    return c.crop((230, 20, 794, 1530))   # shoes reach below the bare feet (y 1489)


def main():
    out, specs = sys.argv[1], sys.argv[2:]
    rows = []
    for spec in specs:
        names = [n for n in spec.split('+') if n]
        rows.append([look(names, t) for t in TONES])
    w, h = rows[0][0].size
    sheet = Image.new('RGB', (w * len(TONES), h * len(rows)))
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            sheet.paste(c.convert('RGB'), (w * i, h * j))
    sheet.save(out)


if __name__ == '__main__':
    main()
