"""Event backgrounds: art-src/raw/bg/<id>.png -> public/art/bg-<id>.webp (720 px wide).

    art-src/.venv/bin/python art-src/build_bg.py [id ...]
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src/raw/bg'
OUT = ROOT / 'public/art'
WIDTH = 720

ids = sys.argv[1:] or sorted(p.stem for p in SRC.glob('*.png'))
for name in ids:
    im = Image.open(SRC / f'{name}.png').convert('RGB')
    h = round(im.height * WIDTH / im.width)
    im.resize((WIDTH, h), Image.LANCZOS).save(OUT / f'bg-{name}.webp', 'WEBP', quality=80, method=6)
    print(f'bg-{name}.webp {WIDTH}x{h} {(OUT / f"bg-{name}.webp").stat().st_size // 1024} KB')
