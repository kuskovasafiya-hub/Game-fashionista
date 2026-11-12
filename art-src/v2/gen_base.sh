#!/bin/bash
# v2 experiment: the doll base, drawn once on a transparent background.
#   art-src/v2/gen_base.sh <name>
# Result: art-src/v2/raw/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)

PROMPT="Use your image generation tool to create ONE new image and save it as PNG to: art-src/v2/raw/${NAME}.png (relative to the current working directory). Do not modify any other files.

It is the base doll of a mobile fashion dress-up game; every clothing item will later be drawn as a separate transparent layer on top of it, so it must be clean and simple.

- Canvas 1024x1536 portrait, TRANSPARENT background (real alpha), no floor, no shadow, no white glow or halo around the figure.
- The same young woman as in the first attached image: same face, same skin tone, same body proportions, same art style.
- Full body, front view, standing straight and symmetrical. Top of the head at about y=40, soles of the feet at about y=1490, body centred horizontally.
- Arms held slightly away from the body, about 15 degrees, with a clear empty gap between each arm and the torso and hips; hands relaxed and open, palms facing the thighs, fingers together, hands NOT touching the body.
- Legs straight with a small gap between the thighs and between the ankles; bare feet, pointing forward.
- She wears only a simple seamless nude bandeau and simple nude briefs, no other clothes, no jewellery.
- Hair: completely hidden under a smooth, tight, dark-brown hair cap that hugs the skull, like slicked-back hair with no volume; no bun, no ponytail, no loose strands; ears visible.
- Natural soft makeup.
- Style: clean dark ink outlines of even width, flat cel shading with soft secondary shadows, modern fashion illustration. The second attached image is a style reference only."

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i art-src/raw/base.png -i art-src/ref/style-ref.png - <<<"$PROMPT" > "art-src/v2/raw/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
