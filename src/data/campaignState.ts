import type { TarokkaSlotState } from '../types';

// Declarative definitions for the campaign-spanning state a Curse of Strahd DM
// otherwise has to carry in their head across a year of play.

// --- Tarokka ---------------------------------------------------------------
// Five cards decide where the artifacts are, who helps, and where Strahd waits.
// Reloaded fixes the reading in Arc C, so those are the defaults — every field
// stays editable in case you rolled your own.

export interface TarokkaSlotDef {
  id: string;
  label: string;
  /** What Madam Eva says this card speaks of. */
  prompt: string;
  defaultCard: string;
  defaultResolved: string;
}

export const TAROKKA_SLOTS: TarokkaSlotDef[] = [
  {
    id: 'history',
    label: 'History',
    prompt: 'Knowledge of the ancient will help you better understand your enemy.',
    defaultCard: 'Nine of Glyphs — the Traitor',
    defaultResolved: "The ancient foe of an old and noble house — the lost soul leads to him (Arc H).",
  },
  {
    id: 'holy-symbol',
    label: 'Holy Symbol of Ravenkind',
    prompt: 'A powerful force for good and protection, a holy symbol of great hope.',
    defaultCard: 'Five of Swords — the Myrmidon',
    defaultResolved: '',
  },
  {
    id: 'sunsword',
    label: 'Sunsword',
    prompt: 'A weapon of vengeance: a sword of sunlight.',
    defaultCard: 'Eight of Glyphs — the Bishop',
    defaultResolved: 'In an amber prison where the devil fears to tread; the house of the fallen dragon can lead you there.',
  },
  {
    id: 'ally',
    label: "Strahd's Enemy",
    prompt: 'One who will help you greatly in the battle against darkness.',
    defaultCard: 'The Mists',
    defaultResolved: '',
  },
  {
    id: 'strahd',
    label: "Strahd's Location",
    prompt: 'When the hour of judgment arrives, this card will lead you to him.',
    defaultCard: 'The Marionette',
    defaultResolved: '',
  },
];

export function defaultTarokka(): Record<string, TarokkaSlotState> {
  return Object.fromEntries(
    TAROKKA_SLOTS.map((s) => [s.id, { card: s.defaultCard, resolved: s.defaultResolved, done: false }])
  );
}

// --- Campaign flags --------------------------------------------------------

export interface FlagDef {
  id: string;
  label: string;
  hint?: string;
  /** 'toggle' is a checkbox; 'choice' picks one of options. */
  kind: 'toggle' | 'choice';
  options?: string[];
}

export interface FlagGroup {
  id: string;
  label: string;
  icon: string;
  blurb?: string;
  flags: FlagDef[];
}

export const FLAG_GROUPS: FlagGroup[] = [
  {
    id: 'fanes',
    label: 'The Three Fanes',
    icon: '🗿',
    blurb: "Each fane reconsecrated strips Strahd of stolen power.",
    flags: [
      { id: 'fane-swamp', label: 'Swamp Fane reconsecrated (Berez)', kind: 'toggle' },
      { id: 'fane-forest', label: 'Forest Fane reconsecrated (Yester Hill)', kind: 'toggle' },
      { id: 'fane-mountain', label: 'Mountain Fane reconsecrated (Mount Baratok)', kind: 'toggle' },
    ],
  },
  {
    id: 'artifacts',
    label: 'Artifacts',
    icon: '⚔️',
    flags: [
      { id: 'sunsword', label: 'Sunsword recovered', kind: 'toggle' },
      { id: 'holy-symbol', label: 'Holy Symbol of Ravenkind recovered', kind: 'toggle' },
      { id: 'tome', label: 'Tome of Strahd recovered', kind: 'toggle' },
      { id: 'beacon', label: 'Beacon of Argynvostholt relit', kind: 'toggle' },
    ],
  },
  {
    id: 'fates',
    label: 'Fates',
    icon: '🕯',
    blurb: 'The calls your table made that everything later has to respect.',
    flags: [
      {
        id: 'ireena',
        label: 'Ireena',
        kind: 'choice',
        options: ['Alive', 'Sanctuary at Krezk', 'Left with Sergei', 'Turned', 'Dead'],
      },
      { id: 'doru', label: 'Doru', kind: 'choice', options: ['Alive', 'Spared', 'Destroyed'] },
      { id: 'vasilka', label: 'Vasilka', kind: 'choice', options: ['Unmade', 'Abbey', 'With the party', 'Strahd\'s bride'] },
      { id: 'strahd-invite', label: 'Dined with Strahd', kind: 'toggle' },
    ],
  },
  {
    id: 'allies',
    label: 'Allies & factions',
    icon: '🤝',
    flags: [
      { id: 'ezmerelda', label: 'Ezmerelda recruited', kind: 'toggle' },
      { id: 'van-richten', label: 'Van Richten identity known to the party', kind: 'toggle' },
      { id: 'keepers', label: 'Keepers of the Feather trust the party', kind: 'toggle' },
      { id: 'martikovs', label: 'Winery restored to the Martikovs', kind: 'toggle' },
      { id: 'vallaki-power', label: 'Vallaki ruled by', kind: 'choice', options: ['Vargas', 'Lady Wachter', 'Ismark', 'Nobody'] },
    ],
  },
];

export const ALL_FLAGS: FlagDef[] = FLAG_GROUPS.flatMap((g) => g.flags);

// --- Clock -----------------------------------------------------------------

export interface TimeBand {
  label: string;
  icon: string;
  /** Inclusive start minute of the band. */
  from: number;
  /** Barovian nights belong to Strahd — worth a visual warning. */
  dangerous?: boolean;
}

export const TIME_BANDS: TimeBand[] = [
  { label: 'Night', icon: '🌑', from: 0, dangerous: true },
  { label: 'Dawn', icon: '🌅', from: 5 * 60 },
  { label: 'Morning', icon: '🌫️', from: 7 * 60 },
  { label: 'Midday', icon: '☁️', from: 12 * 60 },
  { label: 'Afternoon', icon: '🌥', from: 14 * 60 },
  { label: 'Dusk', icon: '🌆', from: 18 * 60, dangerous: true },
  { label: 'Night', icon: '🌑', from: 20 * 60, dangerous: true },
];

export function timeBand(minutes: number): TimeBand {
  let band = TIME_BANDS[0];
  for (const b of TIME_BANDS) if (minutes >= b.from) band = b;
  return band;
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
