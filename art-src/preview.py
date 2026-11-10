"""Contact sheet: each layer composited on the body + its shop picture.
   art-src/.venv/bin/python art-src/preview.py out.png name1 name2 ..."""
import json, pathlib, sys
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
L = json.loads((ROOT / 'src/art/layers.json').read_text())
CUT = ROOT / 'art-src/cut'

def doll(names):
    c = Image.new('RGBA', (1024, 1536), (245, 215, 228, 255))
    order = ['body'] + (['feet'] if not any(n.startswith('shoes') for n in names) else []) + names
    for n in order:
        im = Image.open(CUT / f'{n}.png')
        c.alpha_composite(im, (L[n]['x'], L[n]['y']))
    return c

out, names = sys.argv[1], sys.argv[2:]
cells = []
for n in names:
    d = doll([n]).crop((250, 0, 774, 1536)).resize((262, 768))
    cell = Image.new('RGBA', (262, 1030), (255, 255, 255, 255))
    cell.alpha_composite(d, (0, 0))
    p = CUT / f'product-{n}.png'
    if p.exists():
        pi = Image.open(p); pi.thumbnail((240, 240)); cell.alpha_composite(pi, ((262 - pi.width) // 2, 780))
    cells.append(cell)
sheet = Image.new('RGB', (262 * len(cells), 1030), 'white')
for i, c in enumerate(cells):
    sheet.paste(c.convert('RGB'), (262 * i, 0))
sheet.save(out)
