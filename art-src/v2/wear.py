"""v2: garment layers from edits of the doll (gen_wear.sh).

The layer is what changed below her waist: new opaque pixels (wide trouser legs
beyond her legs) and pixels that clearly changed colour (denim over her skin and
briefs). Her skin left unchanged (a hand in front of the hip, the gap between the
legs) is not taken, so her own body shows there in any skin tone. Codex's small
redraws of skin are dropped. Written to raw/<name>.png; check.py uses it as is.

  art-src/.venv/bin/python art-src/v2/wear.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent))
from check import rgba  # noqa: E402
from onbody import drop_lines, shift_to  # noqa: E402
from skin import skin_weight  # noqa: E402

RAW = ROOT / 'raw'
TOP_ROW = {'bottom': 470, 'underwear': 470}    # nothing of a bottom above this row
# items worn on one small spot: (rows, columns) where they can be. A bracelet goes on
# her left wrist (viewer's right), the bag hangs from the other hand.
REGION = {'acc-bracelet': (slice(640, 840), slice(600, 790))}


def band_only(m, img, above=14, below=30):
    """A bracelet is a narrow band round the wrist (a charm hangs below it). Keep the
    rows around its densest coloured row and the columns its coloured beads span;
    the forearm and hand outlines Codex redrew next to it go."""
    rgb = img[..., :3]
    sat = (rgb.max(axis=-1) - rgb.min(axis=-1)) / np.maximum(rgb.max(axis=-1), 1)
    coloured = m & (rgb.max(axis=-1) > 150)                      # beads, metal: not ink
    coloured &= ~(skin_weight(rgb, strict=False) > 0.4)          # nor her redrawn skin
    rows = ndi.uniform_filter1d(coloured.sum(axis=1).astype(float), 9)
    c = int(np.argmax(rows))
    xs = np.nonzero(coloured[c - 6:c + 7].any(axis=0))[0]
    keep = np.zeros_like(m)
    keep[c - above:c + below, xs.min() - 3:xs.max() + 4] = True
    m = m & keep & ~(skin_weight(rgb, strict=False) > 0.4)
    # ink only as the beads' and charm's own outlines: right next to them. The wrist's
    # outline Codex redrew crosses the band as a long stroke; only the bit of it that
    # touches a bead could stay, so strokes are also cut to the bead row's height.
    coloured = m & (rgb.max(axis=-1) > 150)
    ink = m & ~coloured
    near = ndi.binary_dilation(coloured, iterations=1)
    rows = np.zeros_like(m)
    rows[c - 8:c + 9] = True
    # tall pieces of ink away from the beads are the wrist's outline; the charm's
    # dark shading is small
    away = ink & ~near
    lab, n = ndi.label(away, structure=np.ones((3, 3)))
    tall = np.zeros_like(m)
    for sl, i in zip(ndi.find_objects(lab), range(1, n + 1)):
        if sl[0].stop - sl[0].start > 12:
            tall |= lab == i
    stroke = ndi.binary_dilation(tall, iterations=2)
    m = (coloured | ink) & ~(stroke & ~(rows & near)) & ~(stroke & ~coloured)
    return m


def clean_gap(img, m, ba, base=None, ring=4, above=16):
    """The thigh gap under fitted shorts shows her own body's gap, whose outline is
    clean: the shorts stop `ring` px short of the gap (her outline is the edge), and
    whatever dark marks Codex drew round the top of the gap (a second outline, a
    crotch blob) become fabric (harmonic fill of the shorts' own shading)."""
    from body import fill
    # her gap: background between the thighs, under the shorts' rows
    rows = np.nonzero(m.any(axis=1))[0]
    gap = np.zeros_like(m)
    for y in rows:
        xs = np.nonzero(ba[y, 470:555] == 0)[0]
        if len(xs) and xs.max() - xs.min() < 30:
            gap[y, xs.min() + 470:xs.max() + 471] = True
    if not gap.any():
        return img, m
    ys, xs = np.nonzero(gap)
    top = ys.min()
    edge = ndi.binary_dilation(gap, iterations=ring) & ~gap
    if base is not None:
        # above the gap's top only her outline shows, not her skin
        cap = edge & (np.arange(m.shape[0])[:, None] < top)
        edge &= ~(cap & (base[..., :3].max(axis=-1) > 70))
    # Codex's marks: dark pixels of the shorts near the gap and above its top
    near = ndi.binary_dilation(gap, iterations=10) & ~edge & ~gap
    near[top - above:top, xs.min() - 10:xs.max() + 11] = True
    # (holes Codex left in the shorts there, over her skin, are filled as well)
    holes = near & ~m & ba & ~edge & ~gap & (np.arange(m.shape[0])[:, None] < top)
    near &= m | holes
    marks = (near & (img[..., :3].max(axis=-1) < 175)) | holes
    marks = ndi.binary_dilation(marks, iterations=1) & near
    known = m & ~marks & ~edge & ~gap & (img[..., :3].max(axis=-1) > 150)
    rgb = img[..., :3].copy()
    _, (iy, ix) = ndi.distance_transform_edt(~known, return_indices=True)
    rgb[marks] = rgb[iy[marks], ix[marks]]
    img[..., :3] = fill(rgb, marks, iterations=1500)
    img[marks, 3] = 255              # (Codex had cut its own gap higher: transparent there)
    m = (m & ~edge & ~gap) | marks
    return img, m


def main():
    base = rgba(ROOT / 'base.png')
    for p in sorted((RAW / 'wear').glob('*.png')):
        kind = p.stem.split('-')[0]
        img, off = shift_to(base, rgba(p))
        ia, ba = img[..., 3] > 128, base[..., 3] > 128
        diff = ndi.gaussian_filter(np.abs(img[..., :3] - base[..., :3]).max(axis=-1), 0.8)
        m = (ia & ~ba) | (ia & ba & (diff > 40))
        m[:TOP_ROW.get(kind, 0)] = False
        region = next((r for k, r in REGION.items() if p.stem.startswith(k)), None)
        if region:
            keep = np.zeros_like(m)
            keep[region] = True
            m &= keep
        m &= ~(skin_weight(img[..., :3]) > 0.6)          # her skin, redrawn: not the garment
        m = ndi.binary_closing(m, iterations=2)
        m = ndi.binary_opening(m, iterations=1)
        lab, n = ndi.label(m)
        if n:
            sizes = ndi.sum(m, lab, range(1, n + 1))
            m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(60 if region else 400, sizes.max() * 0.02)])
        # small holes inside the garment (a paint splatter close to the base colour)
        holes = ndi.binary_fill_holes(m) & ~m
        hl, hn = ndi.label(holes)
        if hn:
            hs = ndi.sum(holes, hl, range(1, hn + 1))
            m |= np.isin(hl, [i + 1 for i, s in enumerate(hs) if s < 150])
        if kind == 'underwear':
            # where the base's briefs were, the new nude shorts barely differ from them:
            # that part is the shorts too (everything inside the shorts' outline)
            from check import underwear
            briefs = underwear(base)
            briefs[:int(np.nonzero(briefs)[0].mean())] = False
            m = ndi.binary_fill_holes(ndi.binary_closing(m | briefs, iterations=4))
            # skin-tight: never past her own outline at the sides...
            m &= ndi.binary_dilation(ba, iterations=1)
            # ...and the gap between her thighs stays open, cleanly: the shorts' edge
            # along it gets a thin ink line, and the gap closes to a smooth point at the
            # top (no dark blob of her own crotch shading or outline left there)
            img, m = clean_gap(img, m, ba, base)
            ia = ia | m
        m &= ia
        # (garments: material is wide, a redrawn leg outline is at most ~8 px; a
        # bracelet keeps only its loop, not redrawn fingers)
        m = drop_lines(m, 40, rel=0.5, width=1) if region else drop_lines(m, 150, rel=0.02, width=4)
        if region is not None and m.any():
            m = band_only(m, img)
        alpha = ndi.gaussian_filter(m.astype(np.float32), 0.6) * (img[..., 3] / 255)
        out = np.dstack([img[..., :3], 255 * alpha])
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(RAW / f'{p.stem}.png')
        far = ia & ~ndi.binary_dilation(ba, iterations=140)
        print(p.stem, 'offset', off, 'px', int(m.sum()), 'backdrop px', int(far.sum()))


if __name__ == '__main__':
    main()
