#!/usr/bin/env node
/**
 * Writes the curated definitions in sound-sources.json into
 * src/data/ambienceConfig.json and src/data/soundsConfig.json.
 *
 * Only entries whose mp3 actually exists on disk are registered, so a partial
 * download still produces a working config. Existing entries are left alone —
 * edit the JSON freely and re-running this won't overwrite your tweaks — but
 * bare stubs auto-created by the Vite plugin are replaced by the curated
 * version (proper name, emoji, intensity levels, sprinkles).
 *
 * Run after download-sounds.sh:
 *   node register-sounds.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCES        = path.join(__dirname, 'sound-sources.json');
const AMBIENCE_DIR   = path.join(__dirname, 'public', 'ambience');
const SOUNDS_DIR     = path.join(__dirname, 'public', 'sounds');
const AMBIENCE_JSON  = path.join(__dirname, 'src', 'data', 'ambienceConfig.json');
const SOUNDS_JSON    = path.join(__dirname, 'src', 'data', 'soundsConfig.json');

const DEFAULT_AMBIENCE_VOLUME = 70;
const DEFAULT_SOUND_VOLUME    = 85;

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { console.error(`✗ Could not parse ${path.relative(__dirname, file)}`); process.exit(1); }
}

const sources = readJson(SOURCES, null);
if (!sources) { console.error('✗ sound-sources.json not found'); process.exit(1); }

/** Build the curated Sound object for an ambience definition, or null if no
 *  level files were downloaded. Missing levels collapse gracefully. */
function buildAmbience(def, soundFileExists) {
  const present = def.levels.filter((l) => fs.existsSync(path.join(AMBIENCE_DIR, l.file)));
  if (present.length === 0) return null;

  const urls = present.map((l) => `/ambience/${l.file}`);
  const sound = {
    id:     def.id,
    name:   def.name,
    emoji:  def.emoji,
    type:   'ambient',
    url:    urls[0],
    volume: def.volume ?? DEFAULT_AMBIENCE_VOLUME,
  };
  if (urls.length > 1) sound.levels = urls;

  // Only reference sprinkle one-shots that actually made it to disk
  const sprinkles = (def.sprinkles ?? []).filter((url) => soundFileExists(path.basename(url)));
  if (sprinkles.length > 0) sound.sprinkles = sprinkles;

  return sound;
}

function buildOneShot(def) {
  if (!fs.existsSync(path.join(SOUNDS_DIR, def.file))) return null;
  return {
    id:     def.id,
    name:   def.name,
    emoji:  def.emoji,
    type:   'oneshot',
    url:    `/sounds/${def.file}`,
    volume: def.volume ?? DEFAULT_SOUND_VOLUME,
  };
}

/** All urls a config entry claims (top-level + intensity levels). */
function claimedUrls(entry) {
  return [entry.url, ...(Array.isArray(entry.levels) ? entry.levels : [])].filter(Boolean);
}

// --- Plugin stub detection -------------------------------------------------
// The Vite auto-register plugin writes a bare entry for any mp3 it finds that
// no config references yet — which happens whenever files land before this
// script runs. Its generated id is derived from the filename and therefore
// collides with our curated id, so "an entry with this id exists" is not enough
// to tell a stub from something hand-tuned. These mirror the plugin's own
// generators (see autoRegisterPlugin in vite.config.ts) so a stub can be
// recognised exactly and replaced, while real edits are left alone.
const AUDIO_EXT = /\.(mp3|ogg|wav|flac|m4a)$/i;

function pluginName(filename) {
  return filename.replace(AUDIO_EXT, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function pluginId(filename) {
  return filename.replace(AUDIO_EXT, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const PLUGIN_EMOJI = { ambient: '🌬️', oneshot: '🔊' };
const PLUGIN_VOLUME = 80;

function isPluginStub(entry) {
  const urls = claimedUrls(entry);
  if (urls.length !== 1) return false;                     // stubs never have levels
  if (entry.sprinkles?.length) return false;
  if (entry.volume !== PLUGIN_VOLUME) return false;
  if (entry.emoji !== PLUGIN_EMOJI[entry.type]) return false;
  const filename = urls[0].split('/').pop();
  return entry.id === pluginId(filename) && entry.name === pluginName(filename);
}

/** Merge curated entries into a config: add missing, replace plugin stubs. */
function merge(configPath, curated, label) {
  const config = readJson(configPath, []);
  const added = [], replaced = [];

  for (const entry of curated) {
    const urls = new Set(claimedUrls(entry));

    // Anything already claiming one of these files: replace it if it's a plugin
    // stub, otherwise treat it as deliberate and skip this curated entry.
    const overlapping = config.filter((c) => claimedUrls(c).some((u) => urls.has(u)));
    if (overlapping.some((c) => !isPluginStub(c))) continue;

    for (const stub of overlapping) {
      config.splice(config.indexOf(stub), 1);
      replaced.push(stub.id);
    }

    config.push(entry);
    added.push(entry.id);
  }

  if (added.length === 0 && replaced.length === 0) {
    console.log(`✓ ${label}: nothing new`);
    return;
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`✓ ${label}: +${added.length} registered${replaced.length ? `, ${replaced.length} stub(s) replaced` : ''}`);
  for (const id of added) console.log(`    + ${id}`);
  for (const id of replaced) console.log(`    ~ replaced stub: ${id}`);
}

// One-shots first: ambience sprinkles reference them, so they must exist by then
const soundFileExists = (file) => fs.existsSync(path.join(SOUNDS_DIR, file));

const oneShots = sources.sounds.map(buildOneShot).filter(Boolean);
const ambience = sources.ambience.map((d) => buildAmbience(d, soundFileExists)).filter(Boolean);

merge(SOUNDS_JSON,   oneShots, 'soundsConfig.json');
merge(AMBIENCE_JSON, ambience, 'ambienceConfig.json');

// Report anything the download missed so it's obvious what to retry
const missing = [
  ...sources.sounds
    .filter((d) => !fs.existsSync(path.join(SOUNDS_DIR, d.file)))
    .map((d) => `sounds/${d.file}`),
  ...sources.ambience.flatMap((d) =>
    d.levels
      .filter((l) => !fs.existsSync(path.join(AMBIENCE_DIR, l.file)))
      .map((l) => `ambience/${l.file}`)
  ),
];

if (missing.length > 0) {
  console.log(`\n⚠  ${missing.length} file(s) not downloaded yet — re-run ./download-sounds.sh:`);
  for (const m of missing) console.log(`    - ${m}`);
}

console.log('\nRestart the dev server to pick up the new configs.');
