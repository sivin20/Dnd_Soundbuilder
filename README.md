# Tavern Sounds — DnD Sound Builder

A DM console for running **Curse of Strahd: Reloaded**: soundtrack + ambience mixing,
scene cues wired into the guide text, an NPC roleplaying directory, campaign
progress tracking, and a D&D Beyond party readout.

React + Vite + TypeScript + zustand + Howler.

```bash
npm install
npm run dev
```

## Restoring the bulk assets

Three asset sets are gitignored because of their size. All are re-downloadable:

```bash
./download-playlist.sh && node register-tracks.js   # ~4.9GB soundtrack → public/music/
python3 mirror-reloaded.py                          # ~856MB guide mirror → public/reloaded/
./download-sounds.sh && node register-sounds.js     # ambience loops + one-shot SFX
```

Without the mirror, the Campaign and NPC views are empty. Without the music,
the library is empty.

## The main pieces

**Dashboard** — now playing with seek, ambience mix, quick SFX, mood-shuffle
playlists, saved scenes, a one-button Combat mode (ducks ambience, restores the
previous track on exit, plays a victory sting), and the party's HP from D&D Beyond.

**Scene cues** — the payoff feature. Set up a music + ambience mix, then click the
♪ next to any heading in the guide and save the board onto it. That heading now
has a ▶: click it during play and the whole board crossfades. Each guide page
grows a **cue sheet** in its sidebar — the compact run-list for the session — and
arcs show a `▶n` prep count.

**Campaign** — the Reloaded guide rendered from the local mirror: typed callouts
(combat, profile, lore, item…), read-aloud boxes styled distinctly, working
wikilinks including `#Section` anchors, per-arc prep notes, arc status, a session
log, and per-arc music suggestions.

**NPCs** — every `[!profile]` dossier in the guide (~47 of them), parsed out into a
searchable directory: Resonance, Emotions, Motivations, Inspirations, Persona,
Morale, Relationships, plus portrait art and a jump back to the source page.
Search covers the dossier text, not just names.

## Adding your own sounds

Drop an `.mp3` into `public/sounds/` (one-shots) or `public/ambience/` (loops) and
the Vite plugin registers it on the next dev-server start. Then edit
`src/data/soundsConfig.json` / `ambienceConfig.json` to set the display name,
emoji, volume, and:

- `levels` — intensity variants for an ambient loop, crossfaded on switch
  (e.g. gentle rain → downpour)
- `sprinkles` — one-shot urls fired at random intervals while the loop is active
  (distant wolves under a forest bed)

To add to the curated set instead, put the entry in `sound-sources.json` and run
`./download-sounds.sh && node register-sounds.js`. Re-running never overwrites
config you've hand-tuned.

## Where your prep lives

Arc notes, the session log, arc status, saved scenes and cues are written to
`campaign-state/*.json` — plain, readable, git-tracked files, served by the dev
server at `/api/state`. Commit them and a year of prep is versioned and
recoverable; there's nothing to export.

Writes are debounced, flushed when the tab hides, and done write-then-rename so
an interrupted save can't truncate a file. Data already in localStorage is
migrated into `campaign-state/` automatically the first time you load the app.

Playback state (current track, volumes) and the D&D Beyond party cache stay in
localStorage — high-churn and regenerable, and file-writing them would dirty the
repo on every track change. To move a store between the two, change its
`storage:` line in `src/store/`.

If `/api/state` isn't reachable (a static build with no server behind it), the
app falls back to localStorage and says so in the footer rather than dropping
writes silently.

## D&D Beyond party sync

The roster lives in `src/data/party.json`. There is no official API, so the app
reads the character-service JSON through a Vite dev-server proxy (`/ddb`) that
strips browser headers — D&D Beyond's WAF rejects some header combinations.

Two consequences: characters must have privacy set to **Public**, and the party
panel only works under `npm run dev` (the proxy is dev-only).

---

Curse of Strahd: Reloaded content by DragnaCarta, mirrored locally under the
[WotC Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy).
