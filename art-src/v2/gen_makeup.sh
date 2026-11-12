#!/bin/bash
# v2: a makeup look. Codex edits the face of art-src/v2/base.png; makeup.py takes
# what changed inside the face as the makeup layer.
#   art-src/v2/gen_makeup.sh <name> "<makeup>"   -> art-src/v2/raw/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
WHAT="$2"
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)
PROMPT="Use your image generation tool to EDIT the first attached image (art-src/v2/base.png, a fashion dress-up game doll on a transparent background) and save the result as PNG to: art-src/v2/raw/${NAME}.png. Do not modify any other files.

Change ONLY her makeup: ${WHAT}

Keep EVERYTHING else pixel-identical: same 1024x1536 canvas, transparent background, same face shape, eyes, eyebrows, nose, mouth shape, hair cap, skin, body and pose. Do not move or resize anything. Same art style."
"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write -i art-src/v2/base.png - <<<"$PROMPT" > "art-src/v2/raw/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
