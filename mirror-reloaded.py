#!/usr/bin/env python3
"""Mirror Curse of Strahd: Reloaded (Obsidian Publish, WotC Fan Content Policy)
into public/reloaded/ — markdown pages + images + manifest.json."""
import json, os, time, urllib.parse, urllib.request

SITE = "7db64b11c71d88572ddc6cd06b888976"
BASE = f"https://publish-01.obsidian.md/access/{SITE}/"
DEST = "/Users/sigurdvind/Hobby/Dnd_Soundbuilder/public/reloaded"
CACHE = "/private/tmp/claude-501/-Users-sigurdvind-Hobby-Dnd-Soundbuilder/b8f16979-e1e7-4ffa-83a2-329d7c6defeb/scratchpad/cache.json"

files = json.load(open(CACHE))
skip = {"publish.css", "publish.js", "favicon-32x32.png", "preview.png"}
targets = [f for f in files if f not in skip]

ok, fail = [], []
for i, path in enumerate(sorted(targets)):
    url = BASE + urllib.parse.quote(path)
    dest = os.path.join(DEST, path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        ok.append(path); continue
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "personal-dm-tool-mirror"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        with open(dest, "wb") as f:
            f.write(data)
        ok.append(path)
        print(f"[{i+1}/{len(targets)}] {path} ({len(data)//1024} KB)")
        time.sleep(0.15)
    except Exception as e:
        fail.append((path, str(e)))
        print(f"[{i+1}/{len(targets)}] FAIL {path}: {e}")

manifest = {"pages": sorted(f for f in ok if f.endswith(".md")),
            "assets": sorted(f for f in ok if not f.endswith(".md"))}
with open(os.path.join(DEST, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print(f"\nDone: {len(ok)} ok, {len(fail)} failed")
for p, e in fail: print("  FAIL:", p, e)
