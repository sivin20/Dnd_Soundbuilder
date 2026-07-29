export interface Track {
  id: string;
  filename: string;   // e.g. "exploring-death-house.mp3" — file lives in public/music/
  title: string;
  customName: string;
  addedAt: number;
  section?: string;   // campaign arc, ordered per SECTIONS in data/sections.ts
  moods?: string[];   // e.g. ["combat", "creepy"] — see MOODS
}

export type SoundType = 'ambient' | 'oneshot';

export interface Sound {
  id: string;
  name: string;
  url: string;            // always the Level 1 / only URL
  levels?: string[];      // [url_lvl1, url_lvl2, url_lvl3] — ambient only
  currentLevel?: number;  // 0-indexed; default 0
  type: SoundType;
  volume: number;
  emoji: string;
  isActive: boolean;
  sprinkles?: string[];   // ambient only: one-shot urls fired at random intervals while active
}

export interface Scene {
  id: string;
  name: string;
  trackId: string | null;
  musicVolume: number;
  loop: boolean;
  ambients: { id: string; level: number; volume: number }[];
}

export type View = 'dashboard' | 'campaign' | 'npcs' | 'music' | 'soundboard';

// --- Campaign tracker (Curse of Strahd: Reloaded) ---------------------------

export interface CampaignArc {
  id: string;              // 'arc-a'
  code: string;            // 'A'
  act: string;             // 'Act I — Into the Mists'
  title: string;           // 'Escape from Death House'
  summary: string;         // one-line own-words summary
  url: string;             // deep link to strahdreloaded.com
  levels?: string;         // rough party level, e.g. '2–3'
  musicSections: string[]; // Track.section values that fit this arc
}

export type ArcStatus = 'todo' | 'active' | 'done';

/** Snapshot of a D&D Beyond character (character must be set to Public). */
export interface PartyMember {
  characterId: number;
  name: string;
  avatarUrl: string | null;
  race: string | null;
  classes: string;   // e.g. "Rogue 5 / Fighter 2"
  level: number;
  baseHitPoints: number;
  removedHitPoints: number;
  temporaryHitPoints: number;
  overrideHitPoints: number | null;
  fetchedAt: number;
  error?: string;    // last fetch error, if any
}

export interface SessionNote {
  id: string;
  date: string;   // ISO yyyy-mm-dd
  title: string;
  notes: string;
  arcId: string | null; // arc the session mostly took place in
}
