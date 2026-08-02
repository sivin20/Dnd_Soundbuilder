#!/usr/bin/env bash
# Downloads the curated Barovia ambience + one-shot set defined in sound-sources.json.
#
# Ambience  → public/ambience/  (10-90 min loops, normalised to -20 LUFS)
# One-shots → public/sounds/    (<= 6 s clips, silence-trimmed, -16 LUFS)
#
# Each entry is fetched with a YouTube search; the first result matching the
# duration filter for its category wins. Output filenames come from
# sound-sources.json, so results are deterministic and register-sounds.js can
# write matching config entries.
#
# Already-downloaded files are skipped — delete an mp3 to refetch it.
#
# Usage:  ./download-sounds.sh            # everything that's missing
#         ./download-sounds.sh ambience   # only the loops
#         ./download-sounds.sh sounds     # only the one-shots
# Then:   node register-sounds.js

set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SOURCES="$ROOT/sound-sources.json"
AMBIENCE_DIR="$ROOT/public/ambience"
SOUNDS_DIR="$ROOT/public/sounds"
PROVENANCE="$ROOT/public/.sound-provenance.json"
ONLY="${1:-all}"

command -v yt-dlp >/dev/null || { echo "✗ yt-dlp not found (brew install yt-dlp)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "✗ ffmpeg not found (brew install ffmpeg)"; exit 1; }

mkdir -p "$AMBIENCE_DIR" "$SOUNDS_DIR"
[[ -f "$PROVENANCE" ]] || echo "{}" > "$PROVENANCE"

# Audio shaping per category.
# Loops: quiet and even so several can stack under music without fighting it.
# One-shots: leading silence trimmed so the hit lands the instant you click.
AMBIENCE_FILTER="loudnorm=I=-20:TP=-2:LRA=7"
SOUNDS_FILTER="silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,loudnorm=I=-16:TP=-1.5:LRA=11"

# A one-shot is a punctuation mark: you click it and it's over. The first pass of
# this set allowed anything up to 90s, and search happily returned SFX
# compilations and weather ambiences — thunder-crack came back three minutes
# long. Two independent guards now:
#   MAX_SOUND_DURATION  rejects the *search result* before downloading
#   SOUND_HARD_CAP      truncates whatever does get through
MAX_SOUND_DURATION=8
SOUND_HARD_CAP=6

DONE=0; SKIPPED=0; FAILED=0
FAILED_LIST=()

fetch() {
  local kind="$1" file="$2" query="$3"
  local dir filter match

  if [[ "$kind" == "ambience" ]]; then
    dir="$AMBIENCE_DIR"; filter="$AMBIENCE_FILTER"
    match="duration >= 600 & duration <= 5400"
  else
    dir="$SOUNDS_DIR"; filter="$SOUNDS_FILTER"
    # duration > 0 also drops results whose duration is unknown, which are
    # usually livestreams and would otherwise sail past a <= test.
    match="duration > 0 & duration <= $MAX_SOUND_DURATION"
  fi

  local dest="$dir/$file"
  if [[ -f "$dest" ]]; then
    SKIPPED=$((SKIPPED + 1))
    printf "  ·  %-26s already downloaded\n" "$file"
    return
  fi

  printf "▶  %-26s  %s\n" "$file" "$query"

  local line_file
  line_file="$(mktemp)"

  # One-shots get a hard length cap with a short fade so a truncated tail doesn't
  # click. Ambience is left whole.
  local pp_args="ffmpeg:-af $filter"
  if [[ "$kind" != "ambience" ]]; then
    pp_args="ffmpeg:-af ${filter},afade=t=out:st=$(bc -l <<< "$SOUND_HARD_CAP - 0.15"):d=0.15 -t $SOUND_HARD_CAP"
  fi

  # --max-downloads 1 stops after the first matching result and exits 101.
  yt-dlp \
    --extract-audio \
    --audio-format mp3 \
    --audio-quality 5 \
    --postprocessor-args "$pp_args" \
    --match-filter "$match" \
    --playlist-end 10 \
    --max-downloads 1 \
    --no-overwrites \
    --no-warnings \
    --print-to-file "after_move:%(id)s\t%(duration)s\t%(title)s" "$line_file" \
    --output "$dir/${file%.mp3}.%(ext)s" \
    "ytsearch10:$query" \
    2>&1 | grep -E "^\[download\] Destination|^\[ExtractAudio\]|^ERROR" || true

  if [[ -f "$dest" ]]; then
    DONE=$((DONE + 1))
    python3 - "$PROVENANCE" "$kind/$file" "$query" "$line_file" <<'PY'
import json, sys
prov_path, key, query, line_file = sys.argv[1:5]
try:
    prov = json.load(open(prov_path))
except Exception:
    prov = {}
info = {"query": query}
try:
    parts = open(line_file).read().strip().split("\t")
    if len(parts) >= 3:
        info["youtubeId"], info["duration"], info["sourceTitle"] = parts[0], parts[1], parts[2]
except Exception:
    pass
prov[key] = info
json.dump(prov, open(prov_path, "w"), indent=2, sort_keys=True)
PY
    printf "   ✓  %s\n\n" "$file"
  else
    FAILED=$((FAILED + 1))
    FAILED_LIST+=("$file — $query")
    printf "   ✗  no result matched the duration filter\n\n"
  fi

  rm -f "$line_file"
}

while IFS=$'\t' read -r kind file query; do
  [[ -z "${file:-}" ]] && continue
  fetch "$kind" "$file" "$query"
done < <(
  python3 - "$SOURCES" "$ONLY" <<'PY'
import json, sys
sources, only = json.load(open(sys.argv[1])), sys.argv[2]
if only in ("all", "ambience"):
    for s in sources["ambience"]:
        for lvl in s["levels"]:
            print("ambience", lvl["file"], lvl["query"], sep="\t")
if only in ("all", "sounds"):
    for s in sources["sounds"]:
        print("sounds", s["file"], s["query"], sep="\t")
PY
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Downloaded : $DONE"
echo "  Skipped    : $SKIPPED"
echo "  Failed     : $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for f in "${FAILED_LIST[@]:-}"; do [[ -n "$f" ]] && echo "  FAIL: $f"; done
echo ""
echo "Run  node register-sounds.js  to add them to the soundboard."
