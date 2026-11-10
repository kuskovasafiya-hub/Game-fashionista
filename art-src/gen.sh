#!/bin/bash
# Generate one dressed variant of the base doll with Codex.
#   art-src/gen.sh <name> "<what to add>"
# Result: art-src/raw/<name>.png  (log: art-src/raw/<name>.log)
set -u
cd "$(dirname "$0")/.."
NAME="$1"
WHAT="$2"
CODEX=/Applications/ChatGPT.app/Contents/Resources/codex

PROMPT="Use your image generation tool to EDIT the first attached image (art-src/raw/base.png), then save the result as PNG to: art-src/raw/${NAME}.png (relative to the current working directory). Do not modify any other files.

This is a dress-up game: the edited image will be compared pixel by pixel with the original to cut out a layer, so EVERYTHING except the new item must stay exactly the same:
- same canvas size (1024x1536), same flat pure white background, no shadows, no floor;
- same woman, same pose, same position and scale on the canvas, same face, same skin, same hair, same proportions;
- do not move, redraw or restyle anything that the new item does not cover.

Add ONLY this: ${WHAT}

The item must fit her body naturally and be drawn in the same art style as the image: clean dark ink outlines, flat cel shading with soft secondary shadows, modern fashion illustration for a mobile dress-up game. The second attached image is a style reference only."

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i art-src/raw/base.png -i art-src/ref/style-ref.png - <<<"$PROMPT" > "art-src/raw/${NAME}.log" 2>&1
if [ -f "art-src/raw/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
