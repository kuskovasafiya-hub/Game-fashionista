"""v2: shoe layers from edits of the doll's own feet (gen_onbody.sh).

The shoe is what changed against base.png below the ankles: new opaque pixels
(sole, heel, toe beyond her foot) and pixels that changed colour clearly (the shoe
over her skin). Her skin left unchanged inside a pump's opening is not taken, so her
own foot shows there. Written to raw/<name>.png, where check.py uses it as is
(listed in check.ONBODY: no fitting).

  art-src/.venv/bin/python art-src/v2/onbody.py
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from check import rgba  # noqa: E402

ANKLE = 1290            # nothing above this row is a shoe
RAW = ROOT / 'raw'
CUTS = {}               # shoe -> row below which the doll's own feet are hidden


def shift_to(base, img):
    """Integer translation that best aligns img onto base (phase correlation on alpha)."""
    a, b = base[..., 3], img[..., 3]
    r = np.fft.fft2(a - a.mean()) * np.conj(np.fft.fft2(b - b.mean()))
    r /= np.abs(r) + 1e-9
    corr = np.fft.ifft2(r).real
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    h, w = corr.shape
    dy = dy - h if dy > h // 2 else dy
    dx = dx - w if dx > w // 2 else dx
    if abs(dx) > 20 or abs(dy) > 20:
        dx = dy = 0
    return np.roll(img, (dy, dx), axis=(0, 1)), (int(dx), int(dy))


def cover_toes(img, m, feet, open_toe=False):
    """A closed shoe must hide her toes: where they stick out at the sides of the
    shoe, widen that shoe sideways about its centre until they are covered."""
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=2))
    out_img, out_m = img.copy(), m.copy()
    ys = np.nonzero(feet.any(axis=1))[0]
    if not len(ys):
        return img, m
    toes = feet.copy()
    toes[:ys.min() + int((ys.max() - ys.min()) * 0.55)] = False
    xs_all = np.arange(m.shape[1], dtype=np.float32)
    for i in range(1, n + 1):
        comp = (lab == i) & m
        if comp.sum() < 1000:
            continue
        cols = np.nonzero(comp.any(axis=0))[0]
        x0, x1 = cols.min(), cols.max()
        mine = toes.copy()
        mine[:, :x0 - 30] = False
        mine[:, x1 + 31:] = False
        if open_toe or (mine & ~comp).sum() <= 20:       # a sandal shows the toes on purpose
            continue
        cx = (x0 + x1) / 2
        need = max(cx - np.nonzero(mine.any(axis=0))[0].min(), np.nonzero(mine.any(axis=0))[0].max() - cx)
        sc = min(1.3, (need + 3) / max((x1 - x0) / 2, 1))
        if sc <= 1:
            continue
        rows = np.nonzero(comp.any(axis=1))[0]
        for y in rows:
            src = cx + (xs_all - cx) / sc
            band = (xs_all >= cx - (cx - x0) * sc - 2) & (xs_all <= cx + (x1 - cx) * sc + 2)
            for c in range(4):
                v = np.interp(src, xs_all, np.where(comp[y], img[y, :, c], 0))
                out_img[y, band, c] = np.where(np.interp(src, xs_all, comp[y].astype(np.float32))[band] > 0.5,
                                               v[band], out_img[y, band, c])
            out_m[y, band] |= np.interp(src, xs_all, comp[y].astype(np.float32))[band] > 0.5
    return out_img, out_m


def main():
    base = rgba(ROOT / 'base.png')
    for p in sorted((RAW / 'onbody').glob('*.png')):
        img, off = shift_to(base, rgba(p))
        ba, ia = base[..., 3] > 128, img[..., 3] > 128
        diff = np.abs(img[..., :3] - base[..., :3]).max(axis=-1)
        diff = ndi.gaussian_filter(diff, 0.8)
        m = (ia & ~ba) | (ia & ba & (diff > 40))
        m[:ANKLE] = False
        # Codex sometimes fills the transparent background around the feet with a flat
        # colour: per row, what looks like the far left of that row is background
        rgb = img[..., :3]
        for y in range(ANKLE, m.shape[0]):
            far = ia[y, :260] & ~ba[y, :260]
            if far.sum() > 40:
                bgc = np.median(rgb[y, :260][far], axis=0)
                m[y] &= np.abs(rgb[y] - bgc).max(axis=-1) > 28
        # the shoes are what touches her feet
        feet = ba.copy()
        feet[:ANKLE] = False
        lab, n = ndi.label(m)
        touch = np.unique(lab[ndi.binary_dilation(feet, iterations=3) & m])
        m = np.isin(lab, touch[touch > 0])
        m = ndi.binary_closing(m, iterations=2)
        m = ndi.binary_opening(m, iterations=1)
        lab, n = ndi.label(m)
        if n:
            sizes = ndi.sum(m, lab, range(1, n + 1))
            m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 300])
        m = ndi.binary_fill_holes(m) & ia
        if 'sandal' not in p.stem and m.any():
            # A closed shoe: the edit's whole foot below the shoe's top, her foot in
            # its place and size as Codex drew it inside the shoe. The doll's own
            # feet are hidden there (layers.json 'cut'), so no toe can poke out.
            top = np.nonzero(m.any(axis=1))[0].min()
            whole = ia.copy()
            whole[:top] = False
            lab2, _ = ndi.label(whole)
            keep = np.unique(lab2[m])
            m = np.isin(lab2, keep[keep > 0])
            CUTS[p.stem] = int(top)
        else:
            img, m = cover_toes(img, m, feet, open_toe=True)
        alpha = ndi.gaussian_filter(m.astype(np.float32), 0.7) * (img[..., 3] / 255)
        # fade the top into her leg (shoes start at the ankle); the doll is hidden
        # only below the faded rows
        ys = np.nonzero(m.any(axis=1))[0]
        if len(ys):
            alpha *= np.clip((np.arange(alpha.shape[0]) - ys.min()) / 10, 0, 1)[:, None]
            if p.stem in CUTS:
                CUTS[p.stem] = int(ys.min() + 10)
        out = np.dstack([img[..., :3], 255 * alpha])
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(RAW / f'{p.stem}.png')
        # the edit must keep the background transparent: opaque pixels far from her
        # feet mean Codex painted a backdrop, and the layer is unusable
        far = ia & ~ndi.binary_dilation(feet, iterations=30)
        far[:ANKLE] = False
        bad = int(far.sum())
        print(p.stem, 'offset', off, 'px', int(m.sum()), 'backdrop px', bad, 'REGENERATE' if bad > 500 else 'ok')
    import json
    (ROOT / 'out').mkdir(exist_ok=True)
    (ROOT / 'out' / 'cuts.json').write_text(json.dumps(CUTS))


if __name__ == '__main__':
    main()
