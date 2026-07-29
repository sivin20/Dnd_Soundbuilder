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

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

/** Numbers a DM reads off the party sheet, derived from the DDB payload.
 *  See utils/ddbCharacter.ts — D&D Beyond ships no computed AC or passives. */
export interface DerivedStats {
  abilities: Record<AbilityKey, number>;
  proficiencyBonus: number;
  armorClass: number;
  /** How the AC was arrived at, and whether to trust it. */
  armorClassNote: string;
  armorClassUncertain: boolean;
  initiative: number;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  /** Highest save DC across spellcasting classes, null if not a caster. */
  spellSaveDc: number | null;
}

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
  bonusHitPoints: number;
  deathSaveFails: number;
  deathSaveSuccesses: number;
  stabilized: boolean;
  inspiration: boolean;
  conditions: string[];
  currentXp: number;
  stats: DerivedStats | null;
  fetchedAt: number;
  error?: string;    // last fetch error, if any
}

export interface SessionNote {
  id: string;
  date: string;   // ISO yyyy-mm-dd
  title: string;
  notes: string;
  arcId: string | null; // arc the session mostly took place in
  /** Where you left them — shown on the dashboard so you never start cold. */
  cliffhanger: string;
  /** Things the party or an NPC promised; the stuff that gets forgotten. */
  promises: string;
  loot: string;
  npcsMet: string;
}

// --- Campaign state ---------------------------------------------------------

/** One of Madam Eva's five cards. */
export interface TarokkaSlotState {
  /** The drawn card, e.g. "Eight of Glyphs — the Bishop". */
  card: string;
  /** What Eva's reading pointed at, in your own words. */
  resolved: string;
  /** Ticked once the party has actually got it / met them / learned it. */
  done: boolean;
}

/** Toggles and choices for state that spans the whole campaign. */
export type CampaignFlagValue = boolean | string;

/** Where to read up on something — a page in the local guide mirror. */
export interface GuideRef {
  mdPath: string;
  /** Heading id within that page, as produced by slugify(). */
  anchor?: string;
  /** Short label for the link, e.g. "Arc D · D5. Retrieving the Bones". */
  label?: string;
}

export interface Deadline {
  id: string;
  label: string;
  /** In-world day it comes due, against BarovianTime.day. */
  dueDay: number;
  note: string;
  done: boolean;
  /** Jump straight to the passage that explains it. */
  source?: GuideRef;
}

/** In-world clock. Barovia runs on dusk, and Reloaded sets hard deadlines. */
export interface BarovianTime {
  day: number;      // 1-based day of the campaign
  minutes: number;  // minutes since midnight, 0-1439
}
