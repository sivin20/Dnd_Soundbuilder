#!/usr/bin/env bash
# Downloads all ~1-hour tracks from the Curse of Strahd playlist.
# Skips short tracks (< 55 min) and very long compilations (> 75 min).
# Saves MP3s to public/music/ and prints a summary of what was downloaded.
#
# Usage:  bash download-playlist.sh

set -euo pipefail

PLAYLIST_URL="https://www.youtube.com/playlist?list=PLQBqJdSe3H4E7e-Vibw_RZ2bKTH03Z-yX"
OUT_DIR="$(dirname "$0")/public/music"
MIN_DURATION=3300   # 55 minutes in seconds
MAX_DURATION=4500   # 75 minutes in seconds

mkdir -p "$OUT_DIR"

echo "Fetching playlist metadata…"
echo ""

# Collect ids + durations + titles
mapfile -t TRACKS < <(
  yt-dlp \
    --flat-playlist \
    --ignore-errors \
    --print "%(id)s|%(duration)s|%(title)s" \
    "$PLAYLIST_URL" 2>/dev/null
)

TOTAL=0
SKIPPED=0
ALREADY_HAVE=0
TO_DOWNLOAD=()

for track in "${TRACKS[@]}"; do
  IFS='|' read -r id duration title <<< "$track"

  # Skip if duration is not a number
  if ! [[ "$duration" =~ ^[0-9]+$ ]]; then
    ((SKIPPED++)) || true
    continue
  fi

  # Skip tracks outside the ~1h range
  if (( duration < MIN_DURATION || duration > MAX_DURATION )); then
    ((SKIPPED++)) || true
    echo "  SKIP  [$(printf '%4ds' "$duration")]  $title"
    continue
  fi

  ((TOTAL++)) || true
  TO_DOWNLOAD+=("$id|$title")
done

echo ""
echo "Found $TOTAL tracks to download ($SKIPPED skipped as too short/long)."
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

  if [[ $? -eq 0 ]]; then
    ((DOWNLOADED++)) || true
  else
    ((FAILED++)) || true
    echo "  ✗ Failed: $title"
  fi

  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Downloaded : $DOWNLOADED"
echo "  Failed     : $FAILED"
echo "  Skipped    : $SKIPPED"
echo "  Output dir : $OUT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Now add the tracks in the app:"
echo "  Music Library → enter filename + display name → Add"
echo "Or run:  bash register-tracks.sh   (auto-registers all new files)"
