#!/bin/bash
# v2: a garment put on the doll by editing art-src/v2/base.png (it keeps her
# proportions far better than drawing the garment alone); wear.py takes what changed
# as the layer.
#   art-src/v2/gen_wear.sh <name> "<garment>"   -> art-src/v2/raw/wear/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
WHAT="$2"
mkdir -p art-src/v2/raw/wear
PRODUCT=art-src/raw/product/${NAME}.png
EXTRA=()
DESIGN=""
if [ -f "$PRODUCT" ]; then
  EXTRA=(-i "$PRODUCT")
  DESIGN="The second attached image is the shop picture of this very garment: same design, colours and details, but fitted to HER body as described."
fi
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)
PROMPT="Use your image generation tool to EDIT the first attached image (art-src/v2/base.png, a fashion dress-up game doll on a transparent background) and save the result as PNG to: art-src/v2/raw/wear/${NAME}.png. Do not modify any other files.

Dress her in: ${WHAT}
${DESIGN}

The garment is fitted to her own body and proportions. Keep EVERYTHING else pixel-identical: same 1024x1536 canvas, the background stays FULLY TRANSPARENT (no floor, no shadow, no backdrop), same pose, arms, hands, feet, face, hair cap, skin colour. Do not move or resize anything. Same art style: clean dark ink outlines, flat cel shading with soft secondary shadows."
"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write -i art-src/v2/base.png ${EXTRA[@]+"${EXTRA[@]}"} - <<<"$PROMPT" > "art-src/v2/raw/wear/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/wear/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
