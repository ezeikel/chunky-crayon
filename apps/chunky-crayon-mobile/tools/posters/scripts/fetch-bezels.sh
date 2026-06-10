#!/usr/bin/env bash
#
# fetch-bezels.sh — acquire LICENSE-SAFE device bezel PNGs for the poster
# generator and drop them in tools/posters/assets/.
#
# Per the shared research brief (`bezelAssets`):
#   - Apple Design Resources bezels CANNOT be embedded/redistributed in a
#     tool. Do NOT use them here.
#   - PommePlate (CC0 1.0, no attribution required) ships empty-screen
#     iPhone + iPad PNG mockups. It is archived (2023) so it has no Dynamic
#     Island and no current iPad Pro, but CC0 means it is safe to place in
#     assets/. We pull from its repo.
#   - If PommePlate's straight bezels are good enough, the derived insets in
#     src/devices.ts work out of the box. For a different/cleaner bezel,
#     drop your own PNG and re-measure with measure-bezel-inset.sh.
#
# If NO license-safe PNG can be fetched, that is fine: the generator falls
# back to the high-quality CSS device frame in src/template.ts, so `gen`
# still works end to end. This script is purely an upgrade path.
#
# Usage:  bash scripts/fetch-bezels.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/assets"
mkdir -p "$ASSETS_DIR"

# PommePlate raw asset base (CC0 1.0). The repo is archived but the raw
# files remain reachable on GitHub. We map the closest available mockup to
# the two device keys the tool ships (ipad-13, iphone-6.9). PommePlate has
# no Dynamic Island / current iPad Pro, so these are approximations whose
# straight bezels are close to the derived insets in src/devices.ts.
POMME_BASE="https://raw.githubusercontent.com/ephread/PommePlate/master/PNG"

# device-key -> candidate PommePlate filename(s). Edit if the repo layout
# differs; the loop tries each candidate and keeps the first that downloads.
declare -a IPAD_CANDIDATES=(
  "iPad%20Pro/iPad%20Pro%20-%20Space%20Gray%20-%20Portrait.png"
  "iPad%20Pro%20-%20Space%20Gray%20-%20Portrait.png"
)
declare -a IPHONE_CANDIDATES=(
  "iPhone%2011%20Pro/iPhone%2011%20Pro%20-%20Space%20Gray%20-%20Portrait.png"
  "iPhone%2011%20Pro%20-%20Space%20Gray%20-%20Portrait.png"
)

fetch_first() {
  local out="$1"; shift
  local url
  for cand in "$@"; do
    url="$POMME_BASE/$cand"
    echo "  trying: $url"
    if curl -fsSL "$url" -o "$out" 2>/dev/null; then
      echo "  saved:  $out"
      return 0
    fi
  done
  return 1
}

echo "[fetch-bezels] target dir: $ASSETS_DIR"
echo "[fetch-bezels] iPad 13in bezel (PommePlate, CC0)…"
if fetch_first "$ASSETS_DIR/ipad-13-portrait.png" "${IPAD_CANDIDATES[@]}"; then
  IPAD_OK=1
else
  echo "  WARN: could not fetch an iPad bezel — CSS frame will be used."
  IPAD_OK=0
fi

echo "[fetch-bezels] iPhone 6.9in bezel (PommePlate, CC0)…"
if fetch_first "$ASSETS_DIR/iphone-6.9-portrait.png" "${IPHONE_CANDIDATES[@]}"; then
  IPHONE_OK=1
else
  echo "  WARN: could not fetch an iPhone bezel — CSS frame will be used."
  IPHONE_OK=0
fi

echo ""
echo "[fetch-bezels] done."
if [ "${IPAD_OK:-0}" = "1" ] || [ "${IPHONE_OK:-0}" = "1" ]; then
  echo "  Next: measure the screen-cutout inset for each fetched bezel:"
  echo "    bash scripts/measure-bezel-inset.sh"
  echo "  then paste the printed fractions into src/devices.ts screenInset."
else
  echo "  No bezels fetched. The generator will use the built-in CSS frame."
  echo "  PommePlate's layout may have changed; either fix the candidate"
  echo "  paths above, or drop your own CC0/MIT/your-own bezel PNG into:"
  echo "    $ASSETS_DIR/ipad-13-portrait.png"
  echo "    $ASSETS_DIR/iphone-6.9-portrait.png"
  echo "  and run measure-bezel-inset.sh."
fi
