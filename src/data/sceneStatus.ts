import type { SceneStatus } from '../types';

// Reloaded lays its arcs out in a fairly fixed order. Tracking only done/not-done
// loses the information that actually matters when a table goes off-script: that
// a scene happened, but not the way the guide assumed.

export interface SceneStatusMeta {
  label: string;
  short: string;
  icon: string;
  hint: string;
  /** Classes for the status button when this status is set. */
  button: string;
  /** Small dot in the guide's "On this page" outline. */
  dot: string;
  row: string;
}

export const SCENE_STATUS: Record<SceneStatus, SceneStatusMeta> = {
  todo: {
    label: 'Not played',
    short: 'todo',
    icon: '',
    hint: "Hasn't come up yet",
    button: 'bg-stone-800 border-stone-600 text-stone-500',
    dot: 'bg-stone-700',
    row: 'bg-stone-900 border-stone-800',
  },
  done: {
    label: 'As written',
    short: 'done',
    icon: '✓',
    hint: 'Played out roughly as the guide expects',
    button: 'bg-green-800/70 border-green-600 text-green-100',
    dot: 'bg-green-600',
    row: 'bg-green-950/20 border-green-800/40',
  },
  diverged: {
    label: 'Went differently',
    short: 'diverged',
    icon: '⟡',
    hint: 'It happened, but not how the guide assumed — note what your table did',
    button: 'bg-amber-700 border-amber-500 text-amber-50',
    dot: 'bg-amber-500',
    row: 'bg-amber-950/20 border-amber-700/40',
  },
  skipped: {
    label: 'Skipped',
    short: 'skipped',
    icon: '✕',
    hint: "They never went here, or you cut it — its XP and hooks are still owed",
    button: 'bg-stone-700 border-stone-500 text-stone-300',
    dot: 'bg-stone-500',
    row: 'bg-stone-900/60 border-stone-700/60 opacity-75',
  },
};

export const SCENE_STATUS_ORDER: SceneStatus[] = ['todo', 'done', 'diverged', 'skipped'];

/** Headings that are guide commentary rather than a scene to play. */
export function isPlayableScene(text: string, level: number): boolean {
  if (level > 2) return false; // h3 and deeper are beats within a scene
  return !/^(design notes?|milestones?)\b/i.test(text.trim());
}
