#!/bin/bash
# A bag in the same hand as art-src/raw/acc-belt-bag.png (relaxed fingers, the short
# handle hanging over them): Codex edits that image and swaps only the bag, so every
# bag shares one hand pose.
#   art-src/gen_bag.sh <name> "<bag description>"
# Result: art-src/raw/<name>.png  (log: art-src/raw/<name>.log)
set -u
cd "$(dirname "$0")/.."
NAME="$1"
WHAT="$2"
HAND=art-src/raw/acc-belt-bag.png
# the ChatGPT app moved its bundled Codex CLI between versions
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)

PROMPT="Use your image generation tool to EDIT the first attached image (${HAND}), then save the result as PNG to: art-src/raw/${NAME}.png (relative to the current working directory). Do not modify any other files.

The woman holds a small pink quilted bag in her right hand (on the viewer's left). Replace ONLY that pink bag, its chain and its handle with: ${WHAT}

Keep EVERYTHING else pixel-identical: same canvas size (1024x1536), same flat pure white background, same woman, pose, face, hair, skin and proportions. Above all keep her right hand EXACTLY as it is: same relaxed open fingers, same position, same shape, same outline. Do not close her fingers into a fist and do not make her grip the handle.

The new bag's short handle hangs over her relaxed fingers exactly where the pink bag's handle is now, drawn IN FRONT of the fingers in the same way. The bag hangs straight down below the hand, beside her thigh. Every part of the bag lies in front of her hand and body; nothing passes behind the hand, the arm or the legs; no shoulder strap, no long strap.

Same art style as the image: clean dark ink outlines, flat cel shading with soft secondary shadows, modern fashion illustration for a mobile dress-up game. The second attached image is a style reference only."

"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write \
  -i "$HAND" -i art-src/ref/style-ref.png - <<<"$PROMPT" > "art-src/raw/${NAME}.log" 2>&1
if [ -f "art-src/raw/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
