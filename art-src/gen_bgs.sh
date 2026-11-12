#!/bin/bash
# Generate all event backgrounds from art-src/backgrounds.tsv, 4 at a time.
cd "$(dirname "$0")/.."
cut -f1 art-src/backgrounds.tsv | while read -r id; do
  [ -f "art-src/raw/bg/$id.png" ] && continue
  echo "$id"
done | xargs -P 4 -I{} sh -c 'art-src/gen_bg.sh {} "$(grep "^{}	" art-src/backgrounds.tsv | cut -f2)"'
