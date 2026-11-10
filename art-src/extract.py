"""Cut dress-up layers out of AI-generated images.

The doll and every item are drawn by Codex on the same 1024x1536 canvas with a
flat white background. An item image is the base doll edited to wear one item;
its layer is what changed against the base, with clean edges:

- background = pure white (>= 250) connected to the border, so white fabric
  (which never gets that bright) is not eaten away;
- the layer grows to the item's own ink outline;
- along the edge that touches the background, alpha follows the darkness of the
  outline and colours are un-mixed from white, so there is no white fringe;
- skin that was skin on the base too (hem shadows, redrawn arms) is dropped:
  the body layer underneath already shows it.

Every save prints / returns {x, y, w, h}: where the cropped PNG sits on the canvas.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FEET_Y = 1300  # below this row the doll's feet/shoes live in their own layers
BG_TOL = 6     # background pixels are within 6 levels of pure white


def load(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.float32)


BASE_BG = None  # background of the base doll, set by layer_mask


def background_mask(img, tol=BG_TOL):
    """Pure-white pixels connected to the border, plus white gaps an item encloses
    where the base doll had background too (between arm and waist...)."""
    near_white = (255 - img).max(axis=2) < tol
    labels, _ = ndi.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    if BASE_BG is not None and BASE_BG.shape == bg.shape:
        bg |= near_white & BASE_BG
    return bg


def foreground(img):
    fg = ~background_mask(img)
    return ndi.binary_fill_holes(ndi.binary_opening(fg, iterations=1))


def shift_to(base, img):
    """Integer translation that best aligns img onto base (phase correlation)."""
    a = base.mean(axis=2)
    b = img.mean(axis=2)
    fa, fb = np.fft.fft2(a - a.mean()), np.fft.fft2(b - b.mean())
    r = fa * np.conj(fb)
    r /= np.abs(r) + 1e-9
    corr = np.fft.ifft2(r).real
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    h, w = corr.shape
    dy = dy - h if dy > h // 2 else dy
    dx = dx - w if dx > w // 2 else dx
    if abs(dx) > 40 or abs(dy) > 40:
        dx = dy = 0
    return np.roll(img, (dy, dx), axis=(0, 1)), (int(dx), int(dy))


def glow_ring(img, bg=None):
    """Pixels between the white background and the first ink line (the light glow)."""
    if bg is None:
        bg = background_mask(img)
    # thickened ink closes 1-2 px gaps in outlines, so the ring cannot leak into white fabric
    ink = img.max(axis=2) < 110
    barrier = ndi.binary_dilation(ink, iterations=1)
    near = ndi.binary_dilation(bg, iterations=4)
    ring = ndi.binary_propagation(bg, mask=bg | (near & ~barrier))
    # give back the glow pixel right next to the line on the outer side
    ring |= ndi.binary_dilation(ring, iterations=1) & barrier & ~ink
    return ring & ~bg


def matte(img, mask):
    """RGB + alpha for a boolean mask with clean, fringe-free edges."""
    bg = background_mask(img)
    mask = mask & ~bg
    # light anti-aliasing that never spreads outside the mask
    soft = ndi.gaussian_filter(mask.astype(np.float32), 0.7)
    alpha = np.where(mask, np.clip((soft - 0.2) / 0.5, 0, 1), 0)
    # Codex draws a light glow just outside the ink outline. Everything between the
    # background and the ink line is edge: alpha = how dark the pixel is.
    band = mask & (glow_ring(img, bg) | ndi.binary_dilation(bg, iterations=1))
    dark = np.clip((210 - img.min(axis=2)) / 120, 0, 1)   # light glow -> fully transparent
    alpha = np.where(band, np.minimum(alpha, np.maximum(dark, 0)), alpha)
    rgb = img.copy()
    a = np.maximum(alpha, 0.05)[..., None]
    unmixed = np.clip((img - (1 - a) * 255) / a, 0, 255)
    rgb = np.where(band[..., None], unmixed, rgb)
    return rgb, alpha * 255


def save_cropped(rgb, alpha, out):
    ys, xs = np.nonzero(alpha > 8)
    if len(ys) == 0:
        raise SystemExit(f'empty layer: {out}')
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([rgb, alpha]).astype(np.uint8)[y0:y1, x0:x1]
    Image.fromarray(rgba).save(out, optimize=True)
    return {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}


def save_mask(img, mask, out):
    return save_cropped(*matte(img, mask), out)


def cmd_body(base_path, out, feet_out=None):
    """Body without feet (feet go to a separate layer that shoes replace)."""
    img = load(base_path)
    fg = foreground(img)
    body = fg.copy()
    body[FEET_Y + 6:] = False          # small overlap with the feet layer hides the seam
    info = save_mask(img, body, out)
    if feet_out:
        feet = fg.copy()
        feet[:FEET_Y] = False
        info['feet'] = save_mask(img, feet, feet_out)
    return info


def cmd_product(path, out):
    """Shop product shot: keep its own transparency, or key out a flat white background."""
    im = Image.open(path)
    rgb = np.asarray(im.convert('RGB'), dtype=np.float32)
    if im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 250:
        return save_cropped(rgb, np.asarray(im)[..., 3].astype(np.float32), out)
    return save_mask(rgb, foreground(rgb), out)


def skin_like(base, pixels):
    """True for pixels whose colour is common on the doll's bare skin (face, neck, arms)."""
    region = base[100:330]
    v = region.max(axis=2)
    skin = region[(v > 120) & ((255 - region).max(axis=2) > 20)]
    q = (skin // 12).astype(int)
    hist = np.zeros((22, 22, 22), int)
    np.add.at(hist, (q[:, 0], q[:, 1], q[:, 2]), 1)
    common = hist > len(skin) * 0.0015
    qp = (pixels // 12).astype(int)
    return common[qp[..., 0], qp[..., 1], qp[..., 2]]


def base_hair_mask(base):
    """The base doll's own slicked-back hair: a new hairstyle of a similar colour
    would not differ from it, leaving holes, so hair layers always include it."""
    dark = base.max(axis=2) < 120
    m = np.zeros(dark.shape, bool)
    m[40:112, 420:600] = True               # crown above the brows
    m[100:175, 425:452] = True              # temples
    m[100:175, 570:600] = True
    m[190:240, 435:480] = True              # bun
    return ndi.binary_closing(dark & m, iterations=3)


def drop_small(mask, min_px):
    labels, n = ndi.label(mask)
    if not n:
        return mask
    sizes = ndi.sum(mask, labels, range(1, n + 1))
    return np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s >= max(min_px, sizes.max() * 0.04)])


def layer_mask(base_path, dressed_path, zone=None, thr=30.0, hair=False, strict=False,
               near_skin=False, skin_coloured=False, top=False):
    """Aligned dressed image + boolean mask of the pixels the new item changed."""
    global BASE_BG
    base = load(base_path)
    BASE_BG = None
    BASE_BG = background_mask(base)
    dressed, offset = shift_to(base, load(dressed_path))
    raw = np.abs(dressed - base).max(axis=2)
    diff = np.abs(ndi.gaussian_filter(dressed, (1.2, 1.2, 0)) - ndi.gaussian_filter(base, (1.2, 1.2, 0))).max(axis=2)
    bg = background_mask(dressed)
    zmask = zone_mask(raw.shape, zone)

    mask = (diff > thr) & ~bg & zmask
    if hair:
        mask |= base_hair_mask(base)
    mask = ndi.binary_opening(mask, iterations=2)
    mask = ndi.binary_closing(mask, iterations=3)
    mask = ndi.binary_fill_holes(mask)
    # reach out to the item's own ink outline
    ink = dressed.max(axis=2) < 100
    # (for hair only lines that changed: where hair passes behind the body, the body's
    # own outline is not hair)
    reach = ndi.binary_dilation(mask, iterations=3) & ink & zmask
    mask |= reach & (raw > 25) if hair else reach
    mask &= ~bg

    if strict:
        # thin accessories: keep only what really changed
        mask &= ndi.binary_dilation(diff > thr, iterations=1)
    if near_skin:
        # earrings sit on redrawn ears: drop skin-coloured pixels and old hair/outlines
        mask &= ~skin_like(base, dressed)
        mask &= ~((dressed.max(axis=2) < 95) & (base.max(axis=2) < 120))
        mask = ndi.binary_opening(mask, iterations=1)
        mask = drop_small(mask, 40)
    # skin over skin (hem shadows, redrawn arms, slivers along edges) is not part of the item
    # (only well inside the base's skin, so old lines like the bra edge stay covered)
    base_skin = ndi.binary_erosion(skin_like(base, base), iterations=3)
    same_skin = skin_like(base, dressed) & base_skin & (raw < 60)
    if skin_coloured:
        # the fabric itself looks like skin: only clean the outer rim of the item
        rim = ~ndi.binary_erosion(mask, iterations=6)
        wide_rim = ~ndi.binary_erosion(mask, iterations=18) & (raw < 25)
        same_skin &= rim | wide_rim
    mask &= ~same_skin
    if top:
        # nothing of a top hangs below its own hem/cuff line: cut each column under
        # the lowest ink pixel of the item (drops redrawn skin and underwear under the hem)
        ink_in = mask & ink
        h = mask.shape[0]
        has = ink_in.any(axis=0)
        last = np.where(has, h - 1 - np.argmax(ink_in[::-1], axis=0), h)
        rows = np.arange(h)[:, None]
        mask &= rows <= (last + 2)[None, :]
    if not skin_coloured and not hair:
        # small crumbs of skin on the item's outer edge (redrawn shoulders...) are not the item
        crumbs = mask & skin_like(base, dressed)
        labels, n = ndi.label(crumbs)
        if n:
            sizes = ndi.sum(crumbs, labels, range(1, n + 1))
            edge = ndi.binary_dilation(~mask, iterations=1)
            touching = np.unique(labels[edge & crumbs])
            small_edge = [i for i in touching if i and sizes[i - 1] < 250]
            mask &= ~np.isin(labels, small_edge)
    # an old line of the base (bra edge...) that the item erased must stay covered
    gone = (dressed.mean(axis=2) - base.mean(axis=2) > 35) & ~bg & zmask
    mask |= ndi.binary_dilation(mask, iterations=3) & ndi.binary_dilation(gone, iterations=1) & ~bg & zmask
    mask = drop_small(mask, 150 if strict else 400)
    if not strict and not hair:
        mask |= show_through(mask, raw, bg, zmask)
        mask &= ~skin_slivers(mask, base, dressed, ink)
        mask = trim_to_outline(mask, base, dressed, raw, skin_coloured)
    return dressed, mask, offset


def trim_to_outline(mask, base, dressed, raw, skin_coloured=False):
    """The item ends at its own ink outline. Codex shades the skin and briefs right
    under a hem or cuff; that strip changed against the base, so it lands in the
    layer, and on the doll it is painted over the waistband of the skirt or trousers
    below. Flood-fill the item from its fabric, stopping at outlines, and keep only
    what was reached, the outline around it and whatever that encloses."""
    v = dressed.max(axis=2)
    dark = v < 100
    line = dark & ~ndi.binary_opening(dark, iterations=2)    # thin lines, not black fabric
    barrier = ndi.binary_dilation(line, iterations=1)
    skin = skin_like(base, dressed)
    labels, n = ndi.label(mask & ~skin & ~barrier)
    if n:
        sizes = ndi.sum(np.ones_like(labels), labels, range(1, n + 1))
        seed = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s >= 150])
    else:
        seed = np.zeros_like(mask)
    if skin_coloured or seed.sum() < mask.sum() * 0.3:
        seed |= ndi.binary_erosion(mask, iterations=12)
    inside = ndi.binary_propagation(seed & ~barrier, mask=mask & ~barrier)
    outline = mask & ndi.binary_dilation(inside, iterations=4) & (v < 170)
    outside = mask & ~ndi.binary_fill_holes(inside | outline)
    # Drop strips that are not the item's own colours (the hem shadow is a deep
    # orange) when they are thin, or when the base under them looks the same anyway
    # (briefs between the tips of a jacket). Straps and laces share the fabric's
    # colours; a wide patch of skin in a neckline must stay: the base has a bandeau there.
    labels, n = ndi.label(outside, structure=np.ones((3, 3)))
    if not n:
        return mask
    q = (dressed // 16).astype(int)
    fab = q[inside]                       # dark denim folds are fabric too
    hist = np.zeros((16, 16, 16), int)
    np.add.at(hist, (fab[:, 0], fab[:, 1], fab[:, 2]), 1)
    palette = hist > max(len(fab) * 0.001, 1)
    own = palette[q[..., 0], q[..., 1], q[..., 2]]
    idx = range(1, n + 1)
    own |= v < 60                          # ink belongs to the item
    own_share = ndi.sum(outside & own, labels, idx) / np.maximum(ndi.sum(outside, labels, idx), 1)
    thick = ndi.sum(ndi.binary_opening(outside, iterations=3), labels, idx)
    same = ndi.mean(raw, labels, idx)
    # Hanging under the item (fabric right above it, none right below): a hem or cuff
    # shadow, not a neckline. For a skin-coloured item (a tan blazer) the colour test
    # cannot tell its shadow from the fabric, so this alone decides.
    above = np.zeros_like(inside)
    below = np.zeros_like(inside)
    for k in range(1, 31):
        above[k:] |= inside[:-k]
        below[:-k] |= inside[k:]
    hang = ndi.sum(outside & above & ~below, labels, idx) / np.maximum(ndi.sum(outside, labels, idx), 1)
    drop = [i + 1 for i in range(n)
            if (own_share[i] < 0.4 and (thick[i] < 60 or same[i] < 30 or hang[i] > 0.7))
            or (skin_coloured and hang[i] > 0.7)]
    # the same, pixel by pixel: a shadow wedge under a hem is often merged with the
    # body's own outline into one larger piece
    # (only warm skin/shadow tones, so the tips of laces and bows stay)
    warm = (dressed[..., 0] - dressed[..., 2] > 60) & (dressed[..., 0] > dressed[..., 1])
    hanging = outside & above & ~below & warm & (~own | skin_coloured)
    return mask & ~np.isin(labels, drop) & ~hanging


def skin_slivers(mask, base, dressed, ink):
    """Thin strips hanging off the item that are only skin and outline: redrawn
    belly under a hem, wrists below a cuff. On the doll they would be painted over
    whatever is worn under the item (a waistband, a bag). Thin parts made of fabric
    (straps, drawstrings, laces) are kept."""
    core = ndi.binary_dilation(ndi.binary_opening(mask, iterations=3), iterations=3)
    thin = mask & ~core
    labels, n = ndi.label(thin, structure=np.ones((3, 3)))
    if not n:
        return thin
    fabric = thin & ~skin_like(base, dressed) & ~ink
    idx = range(1, n + 1)
    share = ndi.sum(fabric, labels, idx) / np.maximum(ndi.sum(thin, labels, idx), 1)
    return np.isin(labels, [i + 1 for i, s in enumerate(share) if s < 0.3])


def show_through(mask, raw, bg, zmask):
    """Pixels the cleanup rules dropped inside the item although the base doll under
    them looks different (her bandeau, briefs, lighter skin): on the doll the body layer
    would show through the fabric there. Give back every such pixel that lies within
    the item's own silhouette (holes, and notches narrower than ~20 px)."""
    solid = ndi.binary_fill_holes(ndi.binary_closing(mask, iterations=10, border_value=0))
    seen = ndi.binary_opening(raw > 22, iterations=1)
    return solid & seen & ~mask & ~bg & zmask


def zone_mask(shape, zone):
    """Where an item may be: None (anywhere), (y0, y1) rows, or a list of
    (y0, y1, x0, x1) boxes."""
    if not zone:
        return np.ones(shape, bool)
    boxes = [zone] if isinstance(zone[0], (int, np.integer)) else zone
    z = np.zeros(shape, bool)
    for b in boxes:
        y0, y1 = b[:2]
        x0, x1 = (b[2], b[3]) if len(b) == 4 else (0, shape[1])
        z[y0:y1, x0:x1] = True
    return z


def cmd_layer(base_path, dressed_path, out, **kw):
    dressed, mask, offset = layer_mask(base_path, dressed_path, **kw)
    info = save_mask(dressed, mask, out)
    info['align'] = offset
    return info


def cmd_shoes(base_path, dressed_path, out):
    """Shoes replace the bare feet entirely: everything below FEET_Y, plus whatever
    changed higher up the legs (tall boots)."""
    dressed, upper, offset = layer_mask(base_path, dressed_path, zone=(700, FEET_Y + 20))
    feet = foreground(dressed)
    feet[:FEET_Y] = False
    info = save_mask(dressed, feet | upper, out)
    info['align'] = offset
    return info


def split_hair(base_path, dressed_path, zone):
    """Hair as two layers: (back, front).

    back  = strands outside the body silhouette, drawn under the body and clothes;
    front = real strands lying over the body (shoulders, forehead), drawn on top.
    Where the hair passes behind the body, the body's own outline now sits on dark hair
    instead of white background and shows up as "changed" — a thin fringe along the
    silhouette. It must not go to the front layer, or it is painted over clothes.
    """
    base = load(base_path)
    dressed, mask, _ = layer_mask(base_path, dressed_path, zone, 30.0, hair=True)
    body = foreground(base)
    # the base's glow ring is see-through on the body layer: hair behind it must fill it
    body_solid = body & ~glow_ring(base)
    light = dressed.min(axis=2) > 200          # glow / speckles, never hair
    mask &= ~light
    seed = drop_small(mask & ndi.binary_erosion(body, iterations=5), 300)
    front = drop_small(mask & body_solid & ndi.binary_dilation(seed, iterations=5), 300)
    back = mask & ~body_solid
    # Codex also draws a light glow around the body over the hair behind it: fill that
    # thin strip next to the body with the colour of the nearest strand
    strip = (ndi.binary_dilation(body_solid, iterations=5) & ~body_solid
             & ndi.binary_dilation(back, iterations=4) & ~back & ~background_mask(dressed))
    _, (iy, ix) = ndi.distance_transform_edt(~back, return_indices=True)
    back_img = dressed.copy()
    back_img[strip] = dressed[iy[strip], ix[strip]]
    return back_img, dressed, back | strip, front
