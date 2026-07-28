#!/usr/bin/env node
/**
 * Scans public/music/ for MP3 files and registers any new ones
 * into src/data/defaultTracks.json so they appear in the app automatically.
 *
 * Run after download-playlist.sh:
 *   node register-tracks.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MUSIC_DIR   = path.join(__dirname, 'public', 'music');
const META_FILE   = path.join(MUSIC_DIR, '.metadata.json');
const TRACKS_JSON = path.join(__dirname, 'src', 'data', 'defaultTracks.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert original YouTube title → clean display name.
 *  Titles follow the pattern "Track Name | Series Info | Duration | Loop"
 *  so we just take everything before the first pipe. */
function cleanTitle(original) {
  if (!original) return null;
  return original.split('|')[0].trim();
}

/** Derive a reasonable title from a bare filename when no metadata exists. */
function titleFromFilename(filename) {
  let t = filename.replace(/\.mp3$/i, '').replace(/[-_]/g, ' ');
  // Strip common suffixes that appear in DnD soundtrack filenames
  const stop = /\s+(Unofficial|Fan OST|Curse of Strahd|1h |Loop$)/i;
  const idx  = t.search(stop);
  if (idx > 0) t = t.slice(0, idx);
  return t.trim();
}

/** Stable ID from filename — lowercase, hyphens, no extension. */
function idFromFilename(filename) {
  return 'track-' + filename
    .replace(/\.mp3$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Load metadata written by download-playlist.sh
let metadata = {};
if (fs.existsSync(META_FILE)) {
  try { metadata = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); }
  catch { console.warn('⚠  Could not parse .metadata.json — titles will be derived from filenames.'); }
}

// Load existing registered tracks
let tracks = [];
if (fs.existsSync(TRACKS_JSON)) {
  try { tracks = JSON.parse(fs.readFileSync(TRACKS_JSON, 'utf8')); }
  catch { console.error('✗ Could not parse defaultTracks.json'); process.exit(1); }
}

const registeredFilenames = new Set(tracks.map(t => t.filename));

// Scan music directory
const mp3Files = fs.readdirSync(MUSIC_DIR)
  .filter(f => f.toLowerCase().endsWith('.mp3') && !f.startsWith('.'))
  .sort();

const newTracks = [];

for (const filename of mp3Files) {
  if (registeredFilenames.has(filename)) continue;

  const originalTitle = metadata[filename] ?? null;
  const displayTitle  = originalTitle
    ? (cleanTitle(originalTitle) ?? titleFromFilename(filename))
    : titleFromFilename(filename);

  newTracks.push({
    id:         idFromFilename(filename),
    filename,
    title:      displayTitle,
    customName: displayTitle,
    addedAt:    0,
  });
}

if (newTracks.length === 0) {
  console.log('✓ Nothing new — all MP3s in public/music/ are already registered.');
  process.exit(0);
}

// Append and save
tracks.push(...newTracks);
fs.writeFileSync(TRACKS_JSON, JSON.stringify(tracks, null, 2) + '\n');

console.log(`✓ Registered ${newTracks.length} new track${newTracks.length !== 1 ? 's' : ''}:\n`);
for (const t of newTracks) {
  console.log(`  + ${t.title}  (${t.filename})`);
}
console.log('\nRestart / refresh the app to see them in the Music Library.');
