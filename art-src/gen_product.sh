#!/bin/bash
# Product shot for the shop: the item alone, whole, centred.
#   art-src/gen_product.sh <name> "<item description>"
# Uses art-src/raw/<name>.png (the item worn by the doll) as the design reference.
# Result: art-src/raw/product/<name>.png
set -u
cd "$(dirname "$0")/.."
NAME="$1"
WHAT="$2"
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex

PROMPT="Use your image generation tool to create ONE new image, then save it as PNG to: art-src/raw/product/${NAME}.png (relative to the current working directory). Do not modify any other files.

The first attached image shows a woman wearing: ${WHAT}.
Draw ONLY that item as a standalone product illustration for an in-game shop card:
- exactly the same design, colours, materials and details as on the woman;
- the WHOLE item fully visible, nothing cropped, shown from the front as if laid out neatly or on an invisible mannequin;
- no person, no body parts, no skin, no hanger, no text, no logos;
- centred, filling about 85% of a square 1024x1024 canvas;
- transparent background if your tool supports it, otherwise a perfectly flat pure white background with no shadow;
- same art style as the attached images: clean dark ink outlines, flat cel shading with soft secondary shadows, modern fashion illustration for a mobile dress-up game.
The second attached image is a style reference only."

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i "art-src/raw/${NAME}.png" -i art-src/ref/style-ref.png - <<<"$PROMPT" > "art-src/raw/product/${NAME}.log" 2>&1
if [ -f "art-src/raw/product/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
