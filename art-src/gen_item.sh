#!/bin/bash
# Item on the doll + its shop picture, one after the other.
#   art-src/gen_item.sh <name> "<description>"
cd "$(dirname "$0")/.."
art-src/gen.sh "$1" "$2" && art-src/gen_product.sh "$1" "$2"
