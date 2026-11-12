#!/bin/bash
# v2 experiment: one item (or hairstyle) as its own transparent layer, drawn directly
# by Codex in place on the doll's canvas. Nothing is cut out by comparing images.
#   art-src/v2/gen_layer.sh <name> "<what it is>"
# Uses art-src/v2/base.png as the doll. Result: art-src/v2/raw/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
WHAT="$2"
PRODUCT=art-src/raw/product/${NAME}.png
EXTRA=()
DESIGN=""
if [ -f "$PRODUCT" ] && [ -z "${NO_PRODUCT:-}" ]; then
  EXTRA=(-i "$PRODUCT")
  DESIGN="The THIRD attached image is the shop picture of this very item: copy its design exactly (shape, length, colours, materials, details), only fitted to the doll's body and pose."
fi
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)

PROMPT="Use your image generation tool to create ONE new image and save it as PNG to: art-src/v2/raw/${NAME}.png (relative to the current working directory). Do not modify any other files.

The first attached image is the base doll of a fashion dress-up game (1024x1536, transparent background). Every item is a separate transparent layer that is placed EXACTLY on top of this doll, pixel for pixel, so:

- Output canvas: 1024x1536, TRANSPARENT background (real alpha).
- Draw ONLY this item: ${WHAT}
- Draw it exactly where and how it would sit on this doll: same position, same scale, fitted to her exact body outline and pose. Do not move, resize or redraw the doll.
- The output must contain NOTHING of the doll: no skin, no face, no hands, no feet, no underwear, no hair cap, no body outline (shoes are the one exception, see the item description). Wherever the body would be visible (a neckline, armholes, between the legs, between bag handles) leave the pixels fully transparent.
- The doll wears a nude bandeau and nude briefs. A top must completely hide the bandeau; a skirt, shorts or trousers must completely hide the briefs, also at the sides of the hips; a dress must hide both. Not a single pixel of the underwear may stay visible next to the item.
- No shadow cast on the body, no white glow or halo around the item; a clean dark ink outline of even width around the item.
- Same art style as the doll: clean dark ink outlines, flat cel shading with soft secondary shadows, modern fashion illustration for a mobile dress-up game. The second attached image is a style reference only.
${DESIGN}"

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i art-src/v2/base.png -i art-src/ref/style-ref.png ${EXTRA[@]+"${EXTRA[@]}"} - <<<"$PROMPT" > "art-src/v2/raw/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
