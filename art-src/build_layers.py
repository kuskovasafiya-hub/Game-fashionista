"""Cut every generated image in art-src/raw into a game layer.

Writes public/art/<name>.webp and src/art/layers.json with each layer's
position on the 1024x1536 canvas. Run: art-src/.venv/bin/python art-src/build_layers.py
"""
import json
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from extract import cmd_body, cmd_layer, cmd_product, cmd_shoes, load, save_mask, split_hair  # noqa: E402
import skin  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / 'art-src' / 'raw'
OUT = ROOT / 'public' / 'art'
TMP = ROOT / 'art-src' / 'cut'

# Vertical band of the canvas where each kind of item may appear; keeps
# unrelated redraw noise (a slightly different face, etc.) out of the layer.
ZONES = {
    'hair': (0, 820),
    # bands must reach a bit past the item: a band edge inside the item leaves a
    # straight cut on the doll (waistbands start ~520, the gown hem ends ~1470)
    'top': (230, 820),
    'bottom': (470, 1536),
    'dress': (280, 1536),
    'shoes': (1250, 1536),
    'acc-hoops': (120, 360),
    'acc-bag': (250, 1000),
    'acc-chain': (200, 560),
    'acc-pearls': (200, 560),
    'acc': (120, 1100),
    'makeup': [(95, 265, 440, 590)],   # the face only: eyes, cheeks, lips
    # Codex redrew the briefs under its hem: below it keep only the sleeves and cuffs
    'top-blazer': [(230, 669), (669, 760, 0, 380), (669, 760, 645, 1024)],
}
THRESHOLDS = {'makeup': 14, 'acc-hoops': 12, 'top-blazer': 10, 'top-sweater': 10, 'bottom-midi': 10}
# Items close to skin colour: never drop "skin-looking" pixels from them.
SKIN_COLOURED = {'top-blazer', 'top-sweater', 'bottom-midi', 'acc-bag'}


def zone_for(name):
    if name in ZONES:
        return ZONES[name]
    return ZONES[name.split('-')[0]]


def to_webp(png, name):
    dst = OUT / f'{name}.webp'
    Image.open(png).save(dst, 'WEBP', quality=88, method=6)
    return dst


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(exist_ok=True)
    layers = {}
    base = RAW / 'base.png'
    # the pixie cut shows the jaw and neck the bun hides: the bun becomes a hairstyle
    info = cmd_body(str(base), str(TMP / 'body.png'), str(TMP / 'feet.png'),
                    nobun_path=str(RAW / 'hair-pixie.png'), bun_out=str(TMP / 'hair-bun-back.png'))
    to_webp(TMP / 'body.png', 'body')
    to_webp(TMP / 'feet.png', 'feet')
    to_webp(TMP / 'hair-bun-back.png', 'hair-bun-back')
    layers['hair-bun-back'] = info.pop('bun')
    layers['feet'] = info.pop('feet')
    layers['body'] = info
    for img in sorted(RAW.glob('*.png')):
        name = img.stem
        if name == 'base':
            continue
        cut = TMP / f'{name}.png'
        if name.startswith('hair'):
            # Split: strands outside the body silhouette go behind the body and clothes,
            # the rest (over shoulders, face) stays on top.
            back_img, dressed, back, front = split_hair(str(base), str(img), zone_for(name))
            back_cut = TMP / f'{name}-back.png'
            layers[f'{name}-back'] = save_mask(back_img, back, str(back_cut))
            to_webp(back_cut, f'{name}-back')
            info = save_mask(dressed, front, str(cut))
        elif name.startswith('shoes'):
            info = cmd_shoes(str(base), str(img), str(cut))
        else:
            kind = name.split('-')[0]
            info = cmd_layer(str(base), str(img), str(cut), zone=zone_for(name),
                             thr=THRESHOLDS.get(name, THRESHOLDS.get(kind, 30.0)),
                             strict=kind in ('acc', 'makeup'), near_skin=name.startswith(('acc-hoops', 'acc-ear')),
                             skin_coloured=name in SKIN_COLOURED)
        to_webp(cut, name)
        layers[name] = {k: info[k] for k in ('x', 'y', 'w', 'h')}
        print(name, info)
    for img in sorted((RAW / 'product').glob('*.png')):
        name = f'product-{img.stem}'
        cut = TMP / f'{name}.png'
        layers[name] = cmd_product(str(img), str(cut))
        to_webp(cut, name)
        print(name, layers[name])
    skin_variants(layers)
    (ROOT / 'src' / 'art' / 'layers.json').write_text(json.dumps(layers, indent=1))


def skin_variants(layers):
    """<name>~<tone>.webp for every layer that shows skin; marks it with 'skin': true."""
    for old in OUT.glob('*~*.webp'):
        old.unlink()
    base = load(str(RAW / 'base.png'))
    mean, under = skin.base_skin_lab(base), skin.underwear_mask(base)
    for name, box in layers.items():
        if name.startswith('product-') or name.endswith('-back'):
            continue
        if name in ('body', 'feet'):
            mode = 'whole'
        elif name.startswith('hair'):
            mode = 'hair'          # skin is what is not one of the hairstyle's own colours
        elif name in SKIN_COLOURED:
            mode = 'item'          # fabric can look like skin: only areas that are skin on the base
        else:
            mode = 'colour'        # skin-coloured pixels: necklines, toes in sandals, blush on the face
        tol = 80 if name.startswith('shoes') else 40
        palette = skin.hair_palette(TMP / f'{name}-back.png') if mode == 'hair' else None
        if skin.make_variants(name, TMP / f'{name}.png', box, base, under, mean, OUT, mode=mode, tol=tol,
                              palette=palette):
            box['skin'] = True
            print('skin tones', name)


if __name__ == '__main__':
    main()
