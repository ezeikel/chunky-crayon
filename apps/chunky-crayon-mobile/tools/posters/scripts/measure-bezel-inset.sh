#!/usr/bin/env bash
#
# measure-bezel-inset.sh — measure the screen-cutout inset of a bezel PNG.
#
# Per the brief (`bezelAssets`): the PNG-bezel inset is the alpha bounding
# box, measured ONCE per device. A correct bezel PNG has a TRANSPARENT
# screen cutout (where the screenshot shows through) and opaque frame. We
# isolate the transparent region, take its bounding box, and print it both
# in pixels and as fractions of the bezel image — paste the fractions into
# src/devices.ts `screenInset` for that device.
#
# Requires ImageMagick (`magick` or `convert`). If absent, install via
# `brew install imagemagick`. This is one of the few raw-CLI steps that is
# appropriate (image measurement, not device interaction).
#
# Usage:
#   bash scripts/measure-bezel-inset.sh assets/ipad-13-portrait.png
#   bash scripts/measure-bezel-inset.sh assets/iphone-6.9-portrait.png
#
set -euo pipefail

IMG="${1:?usage: measure-bezel-inset.sh <bezel.png>}"
[ -f "$IMG" ] || { echo "no such file: $IMG"; exit 1; }

if command -v magick >/dev/null 2>&1; then MAGICK="magick"
elif command -v convert >/dev/null 2>&1; then MAGICK="convert"
else echo "ImageMagick not found (need 'magick' or 'convert'). brew install imagemagick"; exit 1; fi

if command -v identify >/dev/null 2>&1; then IDENTIFY="identify"; else IDENTIFY="$MAGICK identify"; fi

# Full bezel dims.
read -r BW BH < <($IDENTIFY -format "%w %h" "$IMG")

# Extract the alpha channel, treat transparent (the screen cutout) as the
# region of interest: alpha→white where transparent, then trim to its bbox.
# `-trim` reports the bounding box of the non-background region; we make the
# transparent cutout the only opaque thing so its bbox == the screen rect.
#
# Pipeline:
#   1. -alpha extract        → grayscale of alpha (opaque=white, clear=black)
#   2. -negate               → cutout becomes white (opaque region of interest)
#   3. -threshold 50%        → hard mask
#   4. -trim -format %wx%h%O → bbox WxH + offset +X+Y of the white region
BBOX="$($MAGICK "$IMG" -alpha extract -negate -threshold 50% \
  -format "%@" info: 2>/dev/null || true)"

# %@ gives e.g. "1900x2540+74+96" (WxH+X+Y) of the trim bounding box.
if [ -z "$BBOX" ]; then
  echo "Could not derive a transparent-cutout bbox."
  echo "Make sure the bezel PNG has a TRANSPARENT screen area (not a filled"
  echo "placeholder). If your bezel fills the screen with a color, mask that"
  echo "color instead and re-run."
  exit 1
fi

SW="${BBOX%%x*}"
REST="${BBOX#*x}"
SH="${REST%%+*}"
REST="${REST#*+}"
SX="${REST%%+*}"
SY="${REST#*+}"

# Fractions of the bezel image.
fl=$(awk "BEGIN{printf \"%.4f\", $SX/$BW}")
ft=$(awk "BEGIN{printf \"%.4f\", $SY/$BH}")
fw=$(awk "BEGIN{printf \"%.4f\", $SW/$BW}")
fh=$(awk "BEGIN{printf \"%.4f\", $SH/$BH}")

echo "Bezel:        $IMG  (${BW}x${BH})"
echo "Screen bbox:  ${SW}x${SH} at +${SX}+${SY} (px)"
echo ""
echo "Paste into src/devices.ts screenInset (radius: eyeball or measure separately):"
echo "  screenInset: {"
echo "    left:   $fl,"
echo "    top:    $ft,"
echo "    width:  $fw,"
echo "    height: $fh,"
echo "    radius: 0.012,   // adjust to match the cutout corner radius"
echo "  },"
