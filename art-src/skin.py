"""Skin tones: recolour the doll's skin in every layer that shows some.

The base doll has one skin tone and every item was cut against her, so a tone is
not a new generation but a recolour: in CIELAB, skin pixels are moved from the
base's mean skin colour to the tone's, keeping each pixel's offset from the mean
(shading, blush, lips stay as they were relative to the skin).

Body and feet are recoloured wherever they look like skin. Item layers also carry
some skin (a neckline over the base's bandeau, the top of a foot in a sandal):
there only pixels that still match the base underneath and connect to the edge of
the item are skin, so fabric that happens to be skin-coloured (a camel blazer)
keeps its colour.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# Lab of the base doll's mean skin (measured on the legs) and of each tone.
# 'tan' is the base itself: no files are made for it.
TONES = {
    'fair': (85.0, 12.0, 20.0),
    'light': (77.0, 18.0, 28.0),
    'tan': None,
    'brown': (52.0, 21.0, 30.0),
    'deep': (37.0, 16.0, 22.0),
}
BASE_TONE = 'tan'


def srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab_to_srgb(lab):
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f > 0.206893, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.95047, 1.0, 1.08883])
    m = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])
    c = xyz @ m.T
    c = np.where(c > 0.0031308, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(c * 255, 0, 255)


def skin_weight(rgb, strict=True):
    """0..1: how much a pixel looks like skin (warm, saturated, not dark ink or hair).
    strict also rules out yellower tones (gold, camel): needed inside item layers,
    not on the body, whose only non-skin parts are ink, hair and underwear."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    v = rgb.max(axis=-1)
    ratio = (r - b) / np.maximum(r, 1)
    w = np.clip((ratio - 0.33) / 0.08, 0, 1) * np.clip((v - 130) / 40, 0, 1)
    # blue/red balance of skin stays within ~0.4..0.57 from shadow to highlight;
    # gold straps and camel fabric are yellower
    if strict:
        # measured on the base: skin b/r 0.38..0.50, g/r 0.57..0.70; camel fabric
        # has b/r 0.31..0.37, yellow fabric g/r 0.79 and up
        br = b / np.maximum(r, 1)
        gr = g / np.maximum(r, 1)
        w = w * np.clip((br - 0.37) / 0.03, 0, 1) * np.clip((0.8 - br) / 0.05, 0, 1)
        w = w * np.clip((0.76 - gr) / 0.04, 0, 1)
    return w * ((r >= g) & (g >= b))


def grown_weight(rgb):
    """Strict skin, plus deeper skin shadows (more orange, b/r down to ~0.28) that lie
    right next to it: in a cleavage or between toes. Camel fabric next to skin is
    still out unless it touches skin closely, which only the item mode has to fear."""
    strict = skin_weight(rgb)
    gr = rgb[..., 1] / np.maximum(rgb[..., 0], 1)
    loose = skin_weight(rgb, strict=False) * np.clip((0.76 - gr) / 0.04, 0, 1)
    near = ndi.binary_dilation(strict > 0.5, iterations=8)
    return np.maximum(strict, loose * near)


def base_skin_lab(base):
    legs = base[800:1250]
    s = legs[(skin_weight(legs, strict=False) > 0.9)]
    return srgb_to_lab(s.astype(np.float64)).mean(axis=0)


def recolour(rgb, weight, mean_lab, tone):
    target = np.array(TONES[tone])
    lab = srgb_to_lab(rgb.astype(np.float64))
    k = target[0] / mean_lab[0]                     # darker skin: shading contrast shrinks too
    new = np.empty_like(lab)
    new[..., 0] = target[0] + (lab[..., 0] - mean_lab[0]) * k
    new[..., 1:] = target[1:] + (lab[..., 1:] - mean_lab[1:])
    out = lab_to_srgb(new)
    w = weight[..., None]
    return rgb * (1 - w) + out * w


def underwear_mask(base):
    """The base doll's nude bandeau and briefs: light, much less saturated than skin."""
    v = base.max(axis=-1)
    ratio = (base[..., 0] - base[..., 2]) / np.maximum(base[..., 0], 1)
    m = (v > 190) & (ratio > 0.12) & (ratio < 0.36)
    m[:270] = False
    m[740:] = False
    m = ndi.binary_closing(m, iterations=3)
    labels, n = ndi.label(m)
    sizes = ndi.sum(m, labels, range(1, n + 1))
    return ndi.binary_dilation(np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s > 3000]), iterations=4)


def layer_skin(rgba, base_crop, under_crop, tol):
    """Weight of the skin inside a skin-coloured item or a hairstyle (see module doc).
    Colour alone cannot tell camel fabric or a hair highlight from skin in shadow, so
    the layer is split into areas by its ink lines, and an area is skin when most of
    it is clearly skin and sits where the base had skin (or underwear) too."""
    rgb, a = rgba[..., :3], rgba[..., 3]
    strict = skin_weight(rgb)
    from_base = (np.abs(rgb - base_crop).max(axis=-1) < tol) | under_crop
    ink = rgb.max(axis=-1) < 100
    areas = (a > 8) & ~ndi.binary_dilation(ink, iterations=1)
    labels, n = ndi.label(areas)
    if not n:
        return np.zeros(a.shape)
    idx = range(1, n + 1)
    size = ndi.sum(areas, labels, idx)
    share = ndi.sum((strict > 0.5) & from_base, labels, idx) / np.maximum(size, 1)
    keep = np.isin(labels, [i + 1 for i in range(n) if size[i] >= 60 and share[i] > 0.6])
    # the area's shadows and its anti-aliased rim against the ink line go with it
    keep = ndi.binary_dilation(keep, iterations=2) & (a > 8)
    loose = skin_weight(rgb, strict=False)
    return loose * ndi.gaussian_filter(keep.astype(np.float64), 0.8).clip(0, 1)


def hair_palette(back_png):
    """Colours of a hairstyle, from its back layer (strands outside the body: no skin)."""
    im = np.asarray(Image.open(back_png).convert('RGBA'))
    q = (im[..., :3][im[..., 3] > 200] // 12).astype(int)
    hist = np.zeros((22, 22, 22), int)
    np.add.at(hist, (q[:, 0], q[:, 1], q[:, 2]), 1)
    return ndi.binary_dilation(hist > max(len(q) * 0.0005, 1), iterations=1)


def make_variants(name, png, box, base, under, mean_lab, out_dir, mode='item', tol=40.0, palette=None):
    """Write <out_dir>/<name>~<tone>.webp for every tone; returns False if the layer
    has no skin worth recolouring (then no files are written)."""
    rgba = np.asarray(Image.open(png).convert('RGBA'), dtype=np.float64)
    x, y = box['x'], box['y']
    base_crop = base[y:y + rgba.shape[0], x:x + rgba.shape[1]]
    under_crop = under[y:y + rgba.shape[0], x:x + rgba.shape[1]]
    if mode == 'whole':
        w = skin_weight(rgba[..., :3], strict=False)
    elif mode == 'colour':
        w = grown_weight(rgba[..., :3])
    elif mode == 'hair':
        # ears, temples, forehead redrawn into the front hair layer; not the strands
        q = (rgba[..., :3] // 12).astype(int)
        w = grown_weight(rgba[..., :3]) * ~palette[q[..., 0], q[..., 1], q[..., 2]]
    else:
        w = layer_skin(rgba, base_crop, under_crop, tol)
    w = w * (rgba[..., 3] > 0)
    if (w > 0.5).sum() < 150:
        return False
    for tone in TONES:
        if TONES[tone] is None:
            continue
        rgb = recolour(rgba[..., :3], w, mean_lab, tone)
        img = np.dstack([rgb, rgba[..., 3]]).round().astype(np.uint8)
        Image.fromarray(img).save(out_dir / f'{name}~{tone}.webp', 'WEBP', quality=88, method=6)
    return True
