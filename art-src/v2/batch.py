"""v2: new items in batches, from one TSV per batch (art-src/v2/batches/<batch>.tsv).

Columns (tab-separated, '#' lines are comments):
  name     art name: <top|bottom|dress|shoes|acc>-<model>, e.g. shoes-flats
  slot     top bottom dress shoes earrings necklace bracelet bag glasses
  shop     shop id in src/game/catalog.ts (city, office, evening, ...)
  rarity   common | rare | epic
  tags     comma-separated style tags (casual, office, party, evening, sport, beach, winter)
  name1    Russian name of the colour as drawn, e.g. Балетки «Пудра»
  name2    Russian name of the second colour (or '-' for none)
  filter2  CSS filter of the second colour as a TS expression: TINT.noir or 'hue-rotate(40deg)'
  what     the item: design, colours, materials, length (used for the shop picture)
  extra    optional: more words for the layer on the doll only (size of an earring...)

Steps (each one only does what is missing, so it can be run again after a crash):
  batch.py products <batch> [N]      shop pictures, then review/<batch>-products.png
  batch.py layers   <batch> [N]      layers on the doll, routed by slot, checked by
                                     check.py / pairs.py; rejected ones are moved to
                                     raw/rejected/ and drawn again (2 more tries)
  batch.py sheet    <batch>          review/<batch>-looks.png: each item worn, on
                                     fair, tan and deep skin, next to its shop picture
  batch.py redo     <batch> products|layers name ...   throw away and draw again
  batch.py catalog  <batch>          prints the catalog.ts lines for the batch

  art-src/.venv/bin/python art-src/v2/batch.py products batch1
"""
import json
import pathlib
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

V2 = pathlib.Path(__file__).resolve().parent
ART_SRC = V2.parent
ROOT = ART_SRC.parent
RAW, OUT = V2 / 'raw', V2 / 'out'
PRODUCTS = ART_SRC / 'raw' / 'product'
REVIEW = V2 / 'review'
PY = sys.executable

SLOTS = ('top', 'bottom', 'dress', 'shoes', 'earrings', 'necklace', 'bracelet', 'bag', 'glasses')
# how the shop picture is styled, by shop
STYLE = {
    'city': 'modern casual city style',
    'step': 'modern footwear',
    'y2k': 'early-2000s (Y2K) style, small and delicate where it is jewellery',
    'office': 'modern smart office style',
    'glam': 'fine jewellery and accessories, small and delicate where it is jewellery',
    'evening': 'elegant evening style',
    'sport': 'sporty athleisure style',
    'premium': 'luxury designer style',
}
# what the layer prompt adds to the description, by slot
ON_BODY = {
    'top': '; it completely covers the bandeau; the inside back of the neckline is visible behind her neck.',
    'dress': '; it completely covers the bandeau and the briefs, also at the sides of the hips; '
             'the inside back of the neckline is visible behind her neck.',
    'bottom': '; the waistband sits at her natural waist and hugs her body outline; '
              'it completely covers the briefs, also at the sides of the hips.',
    'shoes': '',
    'glasses': '',
    'bracelet': ', worn on her left wrist (viewer\'s right).',
    'earrings': ', one on each earlobe.',
    'necklace': ', lying around her neck on her collarbones.',
    'bag': '. Draw ONLY the bag and its handle, no hand: it hangs from her right hand (viewer\'s left); '
           'the top of the short handle lies across her relaxed fingers at the fingertips and is drawn '
           'in front of them; the bag hangs straight down below the hand, beside her thigh, not touching the thigh.',
}
# slot -> (generator, where its raw output lands)
ROUTE = {
    'top': ('gen_pair.sh', 'pair'), 'dress': ('gen_pair.sh', 'pair'),
    'bottom': ('gen_wear.sh', 'wear'), 'bracelet': ('gen_wear.sh', 'wear'),
    'shoes': ('gen_onbody.sh', 'onbody'), 'glasses': ('gen_face.sh', 'onface'),
    'earrings': ('gen_layer.sh', 'layer'), 'necklace': ('gen_layer.sh', 'layer'), 'bag': ('gen_layer.sh', 'layer'),
}
# check.py places these by their name: a new item must be named so that it is found
NAMING = {
    'earrings': (('acc-hoops', 'acc-ear', 'acc-studs'), 'acc-studs-* (studs) or acc-ear-* (hanging)'),
    'necklace': (('acc-chain', 'acc-pearls', 'acc-neck', 'acc-choker'), 'acc-neck-* or acc-choker-*'),
    'bag': (('acc-tote', 'acc-bag', 'acc-belt-bag'), 'acc-bag-*'),
    'bracelet': (('acc-bracelet',), 'acc-bracelet-*'),
}
POST = ('onbody.py', 'faceacc.py', 'wear.py', 'check.py', 'pairs.py')
# Doll.FIGURE_VIEW is the box around every layer: one item wider than this frame (now set
# by bags in her hand and the evening gown) would shrink the doll on every screen
FRAME_X = (160, 800)
RETRIES = 2


def load(batch):
    rows = []
    for ln in (V2 / 'batches' / f'{batch}.tsv').read_text().splitlines():
        if not ln.strip() or ln.startswith('#'):
            continue
        c = ln.split('\t')
        if len(c) < 9:
            sys.exit(f'{batch}: need 9 columns: {ln[:60]}')
        r = dict(zip(('name', 'slot', 'shop', 'rarity', 'tags', 'name1', 'name2', 'filter2', 'what'), c[:9]))
        r['extra'] = c[9] if len(c) > 9 else ''
        if r['slot'] not in SLOTS:
            sys.exit(f'{r["name"]}: unknown slot {r["slot"]}')
        if r['slot'] in ('top', 'bottom', 'dress', 'shoes') and not r['name'].startswith(r['slot'] + '-'):
            sys.exit(f'{r["name"]}: a {r["slot"]} must be named {r["slot"]}-*')
        if r['slot'] in NAMING and not r['name'].startswith(NAMING[r['slot']][0]):
            sys.exit(f'{r["name"]}: a {r["slot"]} must be named {NAMING[r["slot"]][1]} (check.py fits it by name)')
        rows.append(r)
    return rows


def pick(rows, names):
    if not names:
        return rows
    unknown = set(names) - {r['name'] for r in rows}
    if unknown:
        sys.exit(f'not in the batch: {", ".join(sorted(unknown))}')
    return [r for r in rows if r['name'] in names]


def parallel(fn, items, n):
    with ThreadPoolExecutor(n) as ex:
        return list(ex.map(fn, items))


def run(cmd, env=None):
    t = time.time()
    r = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=ROOT)
    out = (r.stdout.strip().splitlines() or ['FAILED'])[-1]
    print(f'{out} ({(time.time() - t) / 60:.1f} min)', flush=True)
    return out.startswith('DONE')


# ---------- shop pictures ----------

def product_path(r):
    return PRODUCTS / f'{r["name"]}.png'


def product(r):
    import os
    intro = (f'Draw this item: {r["what"]}; {STYLE.get(r["shop"], "modern fashion")}; at most two main colours.\n'
             'Draw it as a standalone product illustration for an in-game shop card:')
    env = {**os.environ, 'INTRO': intro, 'REF': 'art-src/ref/style-ref.png'}
    for _ in range(1 + RETRIES):          # a moderation block or a crash: just try again
        if run([str(ART_SRC / 'gen_product.sh'), r['name'], r['what']], env):
            return True
    return False


def products(batch, n):
    rows = load(batch)
    todo = [r for r in rows if not product_path(r).exists()]
    print(f'{len(todo)} shop pictures to draw, {len(rows) - len(todo)} already there', flush=True)
    parallel(product, todo, n)
    product_sheet(batch, rows)


def product_sheet(batch, rows):
    from PIL import Image, ImageDraw, ImageFont
    cell, cols = 300, 4
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
    sheet = Image.new('RGB', (cell * cols, (cell + 30) * -(-len(rows) // cols)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, r in enumerate(rows):
        x, y = cell * (i % cols), (cell + 30) * (i // cols)
        if product_path(r).exists():
            im = Image.open(product_path(r)).convert('RGBA')
            im.thumbnail((cell - 10, cell - 10))
            sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
        else:
            d.text((x + 20, y + cell // 2), 'MISSING', fill='red', font=font)
        d.text((x + 8, y + cell + 4), f'{i + 1}. {r["name"]}', fill='black', font=font)
    REVIEW.mkdir(exist_ok=True)
    sheet.save(REVIEW / f'{batch}-products.png')
    print(f'review: {REVIEW / f"{batch}-products.png"}')


# ---------- layers on the doll ----------

def route(r):
    """(generator, where its output lands). Glasses with one big tinted lens (acc-shield-*)
    are drawn as a layer of their own and fitted to her eyes by check.py: an edit of her
    face cannot give a clean lens (Codex re-tints the whole face a little)."""
    if r['slot'] == 'glasses' and r['name'].startswith('acc-shield'):
        return 'gen_layer.sh', 'layer'
    return ROUTE[r['slot']]


def raw_files(r):
    """Everything a layer job writes (generator output and what the fit scripts make of it)."""
    name, (_, where) = r['name'], route(r)
    if where == 'pair':
        return [RAW / f'{name}-{k}.png' for k in ('ref', 'back', 'front')]
    if where == 'layer':
        return [RAW / f'{name}.png']
    return [RAW / where / f'{name}.png', RAW / f'{name}.png']


def generated(r):
    return all(p.exists() for p in raw_files(r)[:3 if route(r)[1] == 'pair' else 1])


def wrong_size(r):
    """Codex sometimes saves a layer landscape (1536x1024): pairs.py cannot use it."""
    from PIL import Image
    return [p.name for p in raw_files(r)[:3 if route(r)[1] == 'pair' else 1]
            if p.exists() and Image.open(p).size != (1024, 1536)]


def draw(r):
    """Draw a layer (2 tries if Codex fails or saves the wrong canvas size)."""
    for _ in range(2):
        if generated(r) and wrong_size(r):
            print(f'wrong canvas size {r["name"]}: {", ".join(wrong_size(r))}', flush=True)
            reject(r, ['wrong canvas size'])
        if generated(r):
            return
        layer(r)
    if generated(r) and wrong_size(r):
        reject(r, ['wrong canvas size'])


def layer(r):
    gen, _ = route(r)
    what = r['what'].rstrip('. ') + ON_BODY[r['slot']] + (' ' + r['extra'] if r['extra'] else '')
    return run([str(V2 / gen), r['name'], what])


def post():
    for s in POST:
        subprocess.run([PY, str(V2 / s)], check=True, stdout=subprocess.DEVNULL, cwd=ROOT)
    report = {}
    for f in ('report.json', 'pairs.json'):
        if (OUT / f).exists():
            report.update(json.loads((OUT / f).read_text()))
    return report


def too_wide(r):
    """How far the layer reaches past the figure frame (px), 0 if it fits."""
    from PIL import Image
    import numpy as np
    over = 0
    for f in (OUT / f'{r["name"]}.png', OUT / f'{r["name"]}-front.png', OUT / f'{r["name"]}-back.png'):
        if f.exists():
            xs = np.nonzero((np.asarray(Image.open(f))[..., 3] > 20).any(axis=0))[0]
            if len(xs):
                over = max(over, FRAME_X[0] - xs.min(), xs.max() + 1 - FRAME_X[1])
    return int(over)


def reject(r, why):
    dst = RAW / 'rejected'
    dst.mkdir(exist_ok=True)
    stamp = time.strftime('%m%d-%H%M%S')
    for p in raw_files(r):
        if p.exists():
            shutil.move(p, dst / f'{p.stem}.{stamp}.png')
    (dst / f'{r["name"]}.{stamp}.txt').write_text('\n'.join(why))


def layers(batch, n):
    rows = load(batch)
    missing = [r['name'] for r in rows if not product_path(r).exists()]
    if missing:
        sys.exit(f'draw the shop pictures first (they are the design reference): {", ".join(missing)}')
    status = {}
    for attempt in range(1 + RETRIES):
        todo = [r for r in rows if not generated(r) or wrong_size(r)]
        if todo:
            print(f'try {attempt + 1}: drawing {len(todo)} layers', flush=True)
            parallel(draw, todo, n)
        print('checking...', flush=True)
        report = post()
        bad = []
        for r in rows:
            rep = report.get(r['name'])
            if not generated(r):
                status[r['name']] = ['Codex did not draw it (moderation?): rephrase']
            elif rep is None:
                status[r['name']] = ['no check report']
                bad.append(r)
            elif rep.get('ok', True) and too_wide(r) > 0:
                status[r['name']] = [f'{too_wide(r)} px wider than the figure frame: the doll would shrink everywhere']
                bad.append(r)
            elif rep.get('ok', True):
                status[r['name']] = []
            else:
                status[r['name']] = rep['problems']
                bad.append(r)
        if not bad or attempt == RETRIES:
            break
        for r in bad:
            print(f'rejected {r["name"]}: {"; ".join(status[r["name"]])}', flush=True)
            reject(r, status[r['name']])
    print('\nRESULT')
    for r in rows:
        p = status.get(r['name'], ['?'])
        print(f'  {"ok  " if not p else "FAIL"} {r["name"]}' + (f': {"; ".join(p)}' if p else ''))
    (REVIEW / f'{batch}-status.json').parent.mkdir(exist_ok=True)
    (REVIEW / f'{batch}-status.json').write_text(json.dumps(status, ensure_ascii=False, indent=1))


# ---------- review sheet ----------

# what each new item is worn with on the sheet, so that it is seen in a real look
WITH = {
    'top': ['hair-bob', 'bottom-jeans', 'shoes-sneakers'],
    'bottom': ['hair-bob', 'top-tee', 'shoes-sneakers'],
    'dress': ['hair-pony', 'shoes-heels'],
    'shoes': ['hair-bob', 'top-tee', 'bottom-shorts'],
    'earrings': ['hair-bun', 'top-tee', 'bottom-jeans'],
    'necklace': ['hair-bun', 'top-crop', 'bottom-jeans'],
    'bracelet': ['hair-bob', 'top-tee', 'bottom-jeans'],
    'bag': ['hair-bob', 'top-tee', 'bottom-jeans'],
    'glasses': ['hair-long', 'top-tee', 'bottom-jeans'],
}
SHEET_TONES = ('fair', 'tan', 'deep')


def sheet(batch):
    from PIL import Image, ImageDraw, ImageFont
    sys.path.insert(0, str(V2))
    import sheet as sh
    rows = load(batch)
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
    w, h = 282, 755                      # half of sheet.look's crop
    cell_w = w * (len(SHEET_TONES) + 1)
    cols = 2
    out = Image.new('RGB', (cell_w * cols, (h + 34) * -(-len(rows) // cols)), 'white')
    d = ImageDraw.Draw(out)
    for i, r in enumerate(rows):
        x0, y0 = cell_w * (i % cols), (h + 34) * (i // cols)
        names = [n for n in WITH[r['slot']] if (OUT / f'{n}.png').exists() or (OUT / f'{n}-front.png').exists()]
        ok = (OUT / f'{r["name"]}.png').exists() or (OUT / f'{r["name"]}-front.png').exists()
        if ok:
            for j, t in enumerate(SHEET_TONES):
                im = sh.look(names + [r['name']], t).resize((w, h), Image.LANCZOS)
                out.paste(im.convert('RGB'), (x0 + w * j, y0))
        if product_path(r).exists():
            p = Image.open(product_path(r)).convert('RGBA')
            p.thumbnail((w - 10, w - 10))
            out.paste(p, (x0 + w * 3 + 5, y0 + (h - p.height) // 2), p)
        d.text((x0 + 8, y0 + h + 4), f'{i + 1}. {r["name"]}' + ('' if ok else '  (NO LAYER)'),
               fill='black' if ok else 'red', font=font)
    REVIEW.mkdir(exist_ok=True)
    out.save(REVIEW / f'{batch}-looks.png')
    print(f'review: {REVIEW / f"{batch}-looks.png"}')


# ---------- redo / catalog ----------

def redo(batch, what, names):
    rows = pick(load(batch), names)
    for r in rows:
        if what == 'products':
            product_path(r).unlink(missing_ok=True)
        else:
            reject(r, ['redo by hand'])
    print(f'thrown away: {", ".join(r["name"] for r in rows)}; now run: batch.py {what} {batch}')


def catalog(batch):
    rows = load(batch)
    q = lambda s: "'" + s.replace("'", "\\'") + "'"
    print('// ART_SLOT')
    print(', '.join(f"{q(r['name'])}: {q(r['slot'])}" for r in rows) + ',')
    print('// ART_TAGS')
    print(', '.join(f"{q(r['name'])}: [{', '.join(q(t.strip()) for t in r['tags'].split(','))}]" for r in rows) + ',')
    shops = {}
    for r in rows:
        shops.setdefault(r['shop'], []).append(r)
    for shop, rs in shops.items():
        print(f'// add({q(shop)}, [...])')
        for r in rs:
            print(f"  [{q(r['name'])}, {q(r['name1'])}, {q(r['rarity'])}],")
            if r['name2'] != '-':
                print(f"  [{q(r['name'])}, {q(r['name2'])}, {q(r['rarity'])}, {r['filter2']}],")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd, batch, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
    if cmd == 'products':
        products(batch, int(rest[0]) if rest else 6)
    elif cmd == 'layers':
        layers(batch, int(rest[0]) if rest else 6)
    elif cmd == 'sheet':
        sheet(batch)
    elif cmd == 'redo':
        redo(batch, rest[0], rest[1:])
    elif cmd == 'catalog':
        catalog(batch)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
