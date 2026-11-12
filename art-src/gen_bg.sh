#!/bin/bash
# Background scene for an event (voting screen, fitting room).
#   art-src/gen_bg.sh <event-id> "<scene description>"
# Result: art-src/raw/bg/<event-id>.png  → art-src/build_bg.py makes public/art/bg-<event-id>.webp
set -u
cd "$(dirname "$0")/.."
NAME="$1"
WHAT="$2"
# the ChatGPT app moved its bundled Codex CLI between versions
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)

PROMPT="Use your image generation tool to create ONE new image, then save it as PNG to: art-src/raw/bg/${NAME}.png (relative to the current working directory). Do not modify any other files.

This is a BACKGROUND for a fashion dress-up mobile game: a full-body girl will be placed in front of it, standing in the centre, so:
- portrait canvas 1024x1536;
- scene: ${WHAT};
- NO people, no silhouettes, no animals, no text, no letters, no logos, no signs with writing;
- eye-level view; the ground/floor meets the scene at about 70% of the height, there is open floor in the lower centre where a person could stand;
- the centre column of the picture is calm and uncluttered, details and objects go to the sides and the far background;
- soft, slightly desaturated, airy colours with gentle depth (a little haze or soft focus in the distance), so a brightly dressed character in front stands out clearly;
- same art style as the attached reference: modern fashion illustration for a mobile dress-up game, clean ink outlines, flat cel shading with soft secondary shadows.
The attached image is a style reference only: do not copy the character or her clothes."

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i art-src/ref/style-ref.png - <<<"$PROMPT" > "art-src/raw/bg/${NAME}.log" 2>&1
if [ -f "art-src/raw/bg/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
