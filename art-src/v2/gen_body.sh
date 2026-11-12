#!/bin/bash
# v2: the doll's body without underwear (smooth like a plastic fashion doll), so that
# underwear can be its own layer, hidden under clothes.
#   art-src/v2/gen_body.sh <name>     -> art-src/v2/raw/<name>.png
set -u
cd "$(dirname "$0")/../.."
NAME="$1"
CODEX=$(ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex /Applications/ChatGPT.app/Contents/Resources/codex 2>/dev/null | head -1)
PROMPT="Use your image generation tool to EDIT the first attached image (art-src/v2/base.png, a fashion dress-up game doll on a transparent background), then save the result as PNG to: art-src/v2/raw/${NAME}.png. Do not modify any other files.

Replace ONLY her nude bandeau and nude briefs with plain smooth skin, so that she looks like an undressed plastic fashion doll or a shop mannequin: smooth, featureless, completely without any anatomical detail (no nipples, no genitals, no lines), just the same soft cel shading as on her belly and arms. This body is a neutral base under clothes in a children-friendly dress-up game.

Keep EVERYTHING else pixel-identical: same 1024x1536 canvas, same TRANSPARENT background, same pose, outline, face, hair cap, skin colour, shading, arms, hands, legs and feet. Do not move or resize anything. No white glow or halo."
"$CODEX" exec --skip-git-repo-check -C "$PWD" --sandbox workspace-write -i art-src/v2/base.png - <<<"$PROMPT" > "art-src/v2/raw/${NAME}.log" 2>&1
if [ -f "art-src/v2/raw/${NAME}.png" ]; then echo "DONE ${NAME}"; else echo "FAILED ${NAME}"; fi
