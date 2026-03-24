#!/usr/bin/env bash
# Downloads all ~1-hour tracks from the Curse of Strahd playlist.
# Skips short tracks (< 55 min) and very long compilations (> 75 min).
# Saves MP3s to public/music/ and writes public/music/.metadata.json
# so that register-tracks.js can pick up clean titles afterwards.
#
# Usage:  bash download-playlist.sh
# Then:   node register-tracks.js

set -euo pipefail

PLAYLIST_URL="https://www.youtube.com/playlist?list=PLQBqJdSe3H4E7e-Vibw_RZ2bKTH03Z-yX"
OUT_DIR="$(dirname "$0")/public/music"
META_FILE="$OUT_DIR/.metadata.json"
MIN_DURATION=3300   # 55 minutes in seconds
MAX_DURATION=4500   # 75 minutes in seconds

mkdir -p "$OUT_DIR"

# Initialise metadata file if it doesn't exist
if [[ ! -f "$META_FILE" ]]; then
  echo "{}" > "$META_FILE"
fi

echo "Fetching playlist metadata…"
echo ""

mapfile -t TRACKS < <(
  yt-dlp \
    --flat-playlist \
    --ignore-errors \
    --print "%(id)s|%(duration)s|%(title)s" \
    "$PLAYLIST_URL" 2>/dev/null
)

TOTAL=0
SKIPPED=0
TO_DOWNLOAD=()

for track in "${TRACKS[@]}"; do
  IFS='|' read -r id duration title <<< "$track"

  if ! [[ "$duration" =~ ^[0-9]+$ ]]; then
    ((SKIPPED++)) || true
    continue
  fi

  if (( duration < MIN_DURATION || duration > MAX_DURATION )); then
    ((SKIPPED++)) || true
    printf "  SKIP  [%4ds]  %s\n" "$duration" "$title"
    continue
  fi

  ((TOTAL++)) || true
  TO_DOWNLOAD+=("$id|$title")
done

echo ""
echo "Found $TOTAL tracks to download, $SKIPPED skipped."
echo ""

DOWNLOADED=0
FAILED=0

for entry in "${TO_DOWNLOAD[@]}"; do
  IFS='|' read -r id title <<< "$entry"

  echo "▶  $title"

  yt-dlp \
    --extract-audio \
    --audio-format mp3 \
    --audio-quality 5 \
    --restrict-filenames \
    --no-playlist \
    --output "$OUT_DIR/%(title)s.%(ext)s" \
    --no-overwrites \
    "https://www.youtube.com/watch?v=$id" \
    2>&1 | grep -E "^\[download\]|^\[ExtractAudio\]|^ERROR" || true

  # Record original title → predicted filename in metadata
  # yt-dlp --restrict-filenames: non-alphanumeric (except ._-) → _
  PREDICTED=$(python3 -c "
import re, sys
t = sys.argv[1]
f = re.sub(r'[^a-zA-Z0-9._-]', '_', t)
f = re.sub(r'_+', '_', f).strip('_')
print(f + '.mp3')
" "$title")

  python3 -c "
import json, sys
meta_file, filename, title = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    meta = json.load(open(meta_file))
except Exception:
    meta = {}
meta[filename] = title
json.dump(meta, open(meta_file, 'w'), indent=2)
" "$META_FILE" "$PREDICTED" "$title"

  ((DOWNLOADED++)) || true
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Downloaded : $DOWNLOADED"
echo "  Failed     : $FAILED"
echo "  Skipped    : $SKIPPED"
echo "  Output dir : $OUT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run  node register-tracks.js  to add all tracks to the app."
