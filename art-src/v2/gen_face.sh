#!/bin/bash
# v2: an accessory worn on the face (glasses). Codex edits art-src/v2/base.png;
# faceacc.py takes what changed on the head as the layer, so it sits exactly on her
# eyes and ears.
#   art-src/v2/gen_face.sh <name> "<item>"   -> art-src/v2/raw/onface/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
WHAT="$2"
mkdir -p art-src/v2/raw/onface
PRODUCT=art-src/raw/product/${NAME}.png
EXTRA=()
DESIGN=""
if [ -f "$PRODUCT" ]; then
  EXTRA=(-i "$PRODUCT")
  DESIGN="The second attached image is the shop picture of this very item: copy its design exactly."
fi
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)
PROMPT="Use your image generation tool to EDIT the first attached image (art-src/v2/base.png, a fashion dress-up game doll on a transparent background) and save the result as PNG to: art-src/v2/raw/onface/${NAME}.png. Do not modify any other files.

Put this on her face: ${WHAT}
${DESIGN}

It sits naturally on her nose and eyes, the temples going back to her ears, at her own scale. Keep EVERYTHING else pixel-identical: same 1024x1536 canvas, fully transparent background, same face, eyes, eyebrows, hair cap, skin colour, body and pose. Do not move or resize anything. Same art style: clean dark ink outlines, flat cel shading."
"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write -i art-src/v2/base.png ${EXTRA[@]+"${EXTRA[@]}"} - <<<"$PROMPT" > "art-src/v2/raw/onface/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/onface/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
