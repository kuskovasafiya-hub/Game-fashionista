#!/bin/bash
# v2: shoes put on the doll's own feet. Codex edits art-src/v2/base.png (the feet only);
# onbody.py takes what changed there as the shoe layer, so the shoe has exactly the
# size and place of her feet and nothing needs fitting.
#   art-src/v2/gen_onbody.sh <name> "<shoes>"   -> art-src/v2/raw/onbody/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
WHAT="$2"
mkdir -p art-src/v2/raw/onbody
PRODUCT=art-src/raw/product/${NAME}.png
EXTRA=()
DESIGN=""
if [ -f "$PRODUCT" ]; then
  EXTRA=(-i "$PRODUCT")
  DESIGN="The second attached image is the shop picture of these very shoes: copy their design exactly (shape, colours, details), at the size of her feet."
fi
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)
PROMPT="Use your image generation tool to EDIT the first attached image (art-src/v2/base.png, a fashion dress-up game doll on a transparent background) and save the result as PNG to: art-src/v2/raw/onbody/${NAME}.png. Do not modify any other files.

Put these shoes on her bare feet: ${WHAT}
${DESIGN}

The shoes are drawn exactly on her own feet: same foot size, same position, the shoes fit her feet tightly (a pump's sides hug the sides of her foot, no gap between shoe and foot). Change NOTHING above her ankles. The background must stay FULLY TRANSPARENT everywhere, also right around the shoes: no floor, no shadow, no backdrop, no colour fill behind or around the feet. Keep EVERYTHING else pixel-identical: same 1024x1536 canvas, same pose, legs, skin colour and body. Do not move or resize anything. Same art style: clean dark ink outlines, flat cel shading."
"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write -i art-src/v2/base.png ${EXTRA[@]+"${EXTRA[@]}"} - <<<"$PROMPT" > "art-src/v2/raw/onbody/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/onbody/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
