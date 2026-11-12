#!/bin/bash
# v2: an item or hairstyle as two transparent layers, back and front, drawn in one
# Codex run from a common reference so that they fit together.
#   art-src/v2/gen_pair.sh <name> "<what it is>"
# Results in art-src/v2/raw/:
#   <name>-ref.png    the doll wearing it (reference, used only to check the layers)
#   <name>-back.png   the parts behind her body: drawn under the body
#   <name>-front.png  the parts in front of her body: drawn over the body
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

PROMPT="You will make three PNG images with your image generation tool for a fashion dress-up game. The first attached image (art-src/v2/base.png) is the doll: 1024x1536, transparent background. The second attached image is a style reference only. Do not modify any other files.

The item: ${WHAT}
${DESIGN}

STEP 1 - reference. EDIT the doll so she wears the item. Keep the doll pixel-identical (same pose, position, scale, face, body), keep the transparent background. Save as art-src/v2/raw/${NAME}-ref.png.

STEP 2 - back layer. Starting from the step 1 image, make an image that contains ONLY the parts of the item that are BEHIND her body: for hair, the hair mass behind her head, neck and shoulders and the strands falling behind her back (seen around her silhouette and between her arms and body); for clothes, the inside back of a neckline or collar, the back of a hood, the inner back of a skirt or dress hem. Draw this back part complete and continuous, also where her body would hide it (the body is drawn on top of it). Nothing of the doll and nothing of the parts in front of her body. Everything else fully transparent. Same 1024x1536 canvas, exactly the same position as in step 1. Save as art-src/v2/raw/${NAME}-back.png. If the item has no part behind the body, save a fully transparent image.

STEP 3 - front layer. Starting from the step 1 image, make an image that contains ONLY the parts of the item that are IN FRONT of her body (for hair: the hair on top of the head, the fringe and the strands lying in front of her shoulders and chest; for clothes: everything visible on the front of her). Nothing of the doll: no skin, face, hands, underwear or hair cap; where the body would show through (neckline, armholes, between the legs, around the face) leave fully transparent. Same canvas and exactly the same position as in step 1. Save as art-src/v2/raw/${NAME}-front.png.

For every image: real transparent background, no shadow cast on the body, no white glow or halo, clean dark ink outline of even width. Same art style as the doll: clean dark ink outlines, flat cel shading with soft secondary shadows, modern fashion illustration for a mobile dress-up game."

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i art-src/v2/base.png -i art-src/ref/style-ref.png ${EXTRA[@]+"${EXTRA[@]}"} - <<<"$PROMPT" > "art-src/v2/raw/${NAME}.log" 2>&1
ok=1
for p in ref back front; do [ -f "art-src/v2/raw/${NAME}-${p}.png" ] || ok=0; done
if [ $ok = 1 ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
