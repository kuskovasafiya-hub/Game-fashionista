"""v2: build the game's art from art-src/v2/out (made by check.py, pairs.py,
makeup.py) into public/art/*.webp and src/art/layers.json.

Every layer is cropped to its opaque box; layers.json maps name -> {x, y, w, h} on
the 1024x1536 canvas, plus:
  skin: true   the layer shows skin and has a recoloured copy per tone, <name>~<tone>
  hem:  true   (tops) <name>-hem.webp is a full-canvas mask; a bottom worn with this
               top is only drawn where the mask is opaque (below the top's hem)

Layer kinds: body, underwear-top/-bottom, <hair>-back/-front, <top|dress>-back/
-front, bottoms, shoes (no skin: drawn over her own feet), accessories, makeup,
product-<item>.

  art-src/.venv/bin/python art-src/v2/build.py
"""
import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

V2 = pathlib.Path(__file__).resolve().parent
ROOT = V2.parent.parent
sys.path.insert(0, str(V2.parent))
import skin  # noqa: E402
import hair  # noqa: E402

OUT = V2 / 'out'
ART = ROOT / 'public' / 'art'
PRODUCTS = V2.parent / 'raw' / 'product'
PY = sys.executable
NO_FOOT = {'shoes-ankleboots', 'shoes-boots-chelsea', 'shoes-boots-rain', 'shoes-boots-cozy', 'shoes-boots-knee', 'shoes-boots-snow', 'shoes-boots-hiking'}


def rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'), dtype=np.float64)


def save(img, name, layers, **meta):
    """Crop to the opaque box, write webp, record the box."""
    a = img[..., 3]
    ys, xs = np.nonzero(a > 4)
    if not len(ys):
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    Image.fromarray(img[y0:y1, x0:x1].clip(0, 255).round().astype(np.uint8)).save(
        ART / f'{name}.webp', 'WEBP', quality=88, method=6)
    layers[name] = {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), **meta}
    return (y0, y1, x0, x1)


def tones(img, name, weight, mean, layers):
    """<name>~<tone>.webp for every tone but the base one, cropped like <name>."""
    box = layers[name]
    sl = (slice(box['y'], box['y'] + box['h']), slice(box['x'], box['x'] + box['w']))
    for t, lab in skin.TONES.items():
        if lab is None:
            continue
        rgb = skin.recolour(img[..., :3], weight, mean, t)
        out = np.dstack([rgb, img[..., 3]])[sl]
        Image.fromarray(out.clip(0, 255).round().astype(np.uint8)).save(
            ART / f'{name}~{t}.webp', 'WEBP', quality=88, method=6)
    box['skin'] = True


def hem_small(path):
    """The hem mask, full canvas but downscaled 4x: it is a smooth edge."""
    m = rgba(path)[..., 3]
    small = Image.fromarray(m.astype(np.uint8)).resize((256, 384), Image.LANCZOS)
    rgba_m = np.zeros((384, 256, 4), np.uint8)
    rgba_m[..., 3] = np.asarray(small)
    return rgba_m


def main():
    for script in ('onbody.py', 'faceacc.py', 'wear.py', 'check.py', 'pairs.py', 'makeup.py'):
        subprocess.run([PY, str(V2 / script)], check=True, stdout=subprocess.DEVNULL)
    report = {**json.loads((OUT / 'report.json').read_text()),
              **json.loads((OUT / 'pairs.json').read_text())}
    bad = {k: v['problems'] for k, v in report.items() if not v.get('ok', True)}
    if bad:
        print('NOT BUILT, regenerate first:', json.dumps(bad, ensure_ascii=False, indent=1))
        sys.exit(1)

    ART.mkdir(parents=True, exist_ok=True)
    # only the doll's own files: other art lives here too (event backgrounds bg-*)
    for old in ART.glob('*.webp'):
        if not old.name.startswith('bg-'):
            old.unlink()
    layers = {}
    body = rgba(OUT / 'body.png')
    mean = skin.base_skin_lab(np.where(body[..., 3:] > 128, body[..., :3], 255).astype(np.float32))

    save(body, 'body', layers)
    tones(body, 'body', skin.skin_weight(body[..., :3], strict=False) * (body[..., 3] > 0), mean, layers)
    for part in ('underwear-top', 'underwear-bottom'):
        save(rgba(OUT / f'{part}.png'), part, layers)

    for p in sorted(OUT.glob('*-front.png')):
        name = p.stem[:-6]
        front, back = rgba(p), rgba(OUT / f'{name}-back.png')
        save(front, f'{name}-front', layers)
        save(back, f'{name}-back', layers)
        if (OUT / f'{name}-hem.png').exists():
            Image.fromarray(hem_small(OUT / f'{name}-hem.png')).save(ART / f'{name}-hem.webp', 'WEBP', lossless=True)
            layers[f'{name}-front']['hem'] = True
    hair.write(layers)                   # <hair layer>~<colour> for every hair colour

    singles = [p for p in sorted(OUT.glob('*.png'))
               if p.stem.split('-')[0] in ('bottom', 'shoes', 'acc') and not p.stem.endswith(('-err', '-hem'))]
    for p in singles:
        name, img = p.stem, rgba(p)
        cuts = json.loads((OUT / 'cuts.json').read_text()) if (OUT / 'cuts.json').exists() else {}
        # closed shoes only: a sandal's gold straps are not skin. Boots in NO_FOOT hide
        # the whole foot and show no skin above the shaft, while their brown suede
        # passes for skin: they bring no foot (the cut still hides her bare toes)
        if name in cuts and name not in NO_FOOT:
            w = skin.skin_weight(img[..., :3], strict=False) * (img[..., 3] > 0)
            # her foot is the skin that grows down from the ankle at the layer's top;
            # skin-coloured bits inside the shoe (a gold buckle, a highlight) are not
            ys = np.nonzero(img[..., 3].max(axis=1) > 128)[0]
            # (straps cross the instep and cut the foot into pieces: every skin piece of
            # a real size counts, tiny skin-coloured specks on the shoe do not)
            lab, n = ndi.label(w > 0.4)
            sizes = ndi.sum(w > 0.4, lab, range(1, n + 1)) if n else []
            top = np.unique(lab[ys.min():ys.min() + 15][lab[ys.min():ys.min() + 15] > 0])
            keep = set(top) | {i + 1 for i, sz in enumerate(sizes) if sz >= 120}
            w = ndi.gaussian_filter(w * ndi.binary_dilation(np.isin(lab, list(keep)), iterations=1), 0.7)
            if (w > 0.5).sum() > 300:
                # a closed shoe brings the foot it wraps (scaled to her foot): that skin
                # is its own layer, toned and drawn unfiltered under the shoe
                foot = img.copy()
                foot[..., 3] *= np.clip(w * 1.5, 0, 1)
                # Codex redraws the foot a little lighter and greyer than her skin; toned
                # darker, that shows as a pale film over the ankle. Where her own foot is
                # under it, take her skin's colour instead, keeping only the shadows Codex
                # drew (the shoe's edge on the instep), never its lightening
                under = skin.skin_weight(body[..., :3], strict=False) * (body[..., 3] > 200)
                lum = lambda x: x[..., :3].mean(axis=-1, keepdims=True)
                shade = np.clip(lum(foot) / np.maximum(lum(body), 1), 0.55, 1.0)
                mix = np.clip(under * 1.5, 0, 1)[..., None]
                foot[..., :3] = foot[..., :3] * (1 - mix) + body[..., :3] * shade * mix
                save(foot, f'{name}-foot', layers)
                tones(foot, f'{name}-foot', np.clip(w * 1.5, 0, 1), mean, layers)
                img = img.copy()
                img[..., 3] *= 1 - np.clip(w * 1.5, 0, 1)
        save(img, name, layers, **({'cut': cuts[name]} if name in cuts else {}))

    # makeup is painted from soft zone masks (makeup.py): one file for every tone, but
    # a look with blush has its own <look>~<tone> (the blush tints each skin tone)
    for p in sorted(OUT.glob('makeup-*.png')):
        if '~' in p.stem:
            continue
        save(rgba(p), p.stem, layers)
        for old in ART.glob(f'{p.stem}~*.webp'):
            old.unlink()
        box = layers[p.stem]
        sl = (slice(box['y'], box['y'] + box['h']), slice(box['x'], box['x'] + box['w']))
        for t in (t for t, lab in skin.TONES.items() if lab is not None):
            if (OUT / f'{p.stem}~{t}.png').exists():
                Image.fromarray(rgba(OUT / f'{p.stem}~{t}.png')[sl].clip(0, 255).round().astype(np.uint8)).save(
                    ART / f'{p.stem}~{t}.webp', 'WEBP', quality=88, method=6)
                box['skin'] = True

    for p in sorted(PRODUCTS.glob('*.png')):
        img = rgba(p)
        if img[..., 3].min() > 250:      # no transparency: key out the white background
            near = (255 - img[..., :3]).max(axis=-1) < 8
            lab, _ = ndi.label(near)
            border = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
            img[..., 3] = np.where(np.isin(lab, border[border > 0]), 0, 255)
        save(img, f'product-{p.stem}', layers)

    (ROOT / 'src' / 'art' / 'layers.json').write_text(json.dumps(layers, indent=1))
    files = [f for f in ART.glob('*.webp') if not f.name.startswith('bg-')]
    size = sum(f.stat().st_size for f in files)
    print(f'{len(layers)} layers, {len(files)} files, {size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
