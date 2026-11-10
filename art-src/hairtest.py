"""Hair x clothes test sheet: art-src/.venv/bin/python art-src/hairtest.py out.png"""
import json, pathlib, sys
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import build_layers as B
from extract import cmd_body, cmd_layer, save_mask, split_hair

ROOT = pathlib.Path(__file__).resolve().parent.parent
T = pathlib.Path(sys.argv[1]).parent / 'hair'
T.mkdir(exist_ok=True)
base = str(ROOT / 'art-src/raw/base.png')
pos = {'body': cmd_body(base, str(T / 'body.png'))}
for h in ['hair-long', 'hair-bob']:
    bi, d, back, front = split_hair(base, str(ROOT / f'art-src/raw/{h}.png'), B.zone_for(h))
    pos[h + '-back'] = save_mask(bi, back, str(T / f'{h}-back.png'))
    pos[h] = save_mask(d, front, str(T / f'{h}.png'))
tops = ['top-hoodie', 'top-blazer', 'top-tee', 'top-sweater', 'dress-gown', 'top-blouse']
for n in tops:
    pos[n] = cmd_layer(base, str(ROOT / f'art-src/raw/{n}.png'), str(T / f'{n}.png'), zone=B.zone_for(n),
                       thr=B.THRESHOLDS.get(n, 30.0), skin_coloured=n in B.SKIN_COLOURED)
tiles = []
for h in ['hair-long', 'hair-bob']:
    for n in tops[:4] if h == 'hair-bob' else tops:
        c = Image.new('RGBA', (1024, 1536), (245, 215, 228, 255))
        for k in [h + '-back', 'body', n, h]:
            c.alpha_composite(Image.open(T / f'{k}.png'), (pos[k]['x'], pos[k]['y']))
        tiles.append(c.crop((280, 30, 744, 640)).convert('RGB'))
sheet = Image.new('RGB', (464 * 5, 610 * 2), 'white')
for i, t in enumerate(tiles):
    sheet.paste(t, (464 * (i % 5), 610 * (i // 5)))
sheet.save(sys.argv[1])
