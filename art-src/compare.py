"""Before/after sheet for a few items (old cuts in art-src/cut-old).
   art-src/.venv/bin/python art-src/compare.py out.png name:box ..."""
import json, pathlib, sys
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from extract import cmd_body, cmd_layer, cmd_shoes  # noqa
import build_layers as B

ROOT = pathlib.Path(__file__).resolve().parent.parent
L = json.loads((ROOT / 'src/art/layers.json').read_text())
NEW = pathlib.Path(sys.argv[1]).parent / 'new'
NEW.mkdir(exist_ok=True)
base = str(ROOT / 'art-src/raw/base.png')
body = cmd_body(base, str(NEW / 'body.png'), str(NEW / 'feet.png'))
pos = {'body': body, 'feet': body['feet']}

def cut_new(n):
    src = str(ROOT / f'art-src/raw/{n}.png')
    if n.startswith('shoes'):
        pos[n] = cmd_shoes(base, src, str(NEW / f'{n}.png'))
    else:
        pos[n] = cmd_layer(base, src, str(NEW / f'{n}.png'), zone=B.zone_for(n), thr=B.THRESHOLDS.get(n, 30.0),
                           strict=n.startswith('acc'), near_skin=n.startswith(('acc-hoops', 'acc-ear')),
                           skin_coloured=n in B.SKIN_COLOURED)

def comp(folder, positions, n, box):
    c = Image.new('RGBA', (1024, 1536), (150, 220, 210, 255))
    for k in ['body', 'feet', n] if not n.startswith('shoes') else ['body', n]:
        im = Image.open(folder / f'{k}.png'); c.alpha_composite(im, (positions[k]['x'], positions[k]['y']))
    return c.crop(box).convert('RGB')

cols = []
for arg in sys.argv[2:]:
    n, box = arg.split(':'); box = tuple(int(v) for v in box.split(','))
    cut_new(n)
    old = comp(ROOT / 'art-src/cut-old', L, n, box)
    new = comp(NEW, pos, n, box)
    col = Image.new('RGB', (old.width, old.height * 2 + 6), 'white')
    col.paste(old, (0, 0)); col.paste(new, (0, old.height + 6)); cols.append(col)
sheet = Image.new('RGB', (sum(c.width for c in cols) + 6 * len(cols), max(c.height for c in cols)), 'white')
x = 0
for c in cols:
    sheet.paste(c, (x, 0)); x += c.width + 6
sheet.save(sys.argv[1])
