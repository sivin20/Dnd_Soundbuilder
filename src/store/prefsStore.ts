import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReadAloudLang } from '../types';

// Display preferences: how the guide is rendered and which language read-aloud
// text is shown in.
//
// Deliberately in localStorage rather than campaign-state/: this is per-device
// (the laptop at the table wants bigger text than the one you prep on), and it
// isn't campaign history worth committing.

/** Multiplied into the guide's base font size. */
export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
export const DEFAULT_SCALE_INDEX = 1;

interface PrefsState {
  /** Index into FONT_SCALES. */
  fontScaleIndex: number;
  /** Language for text that gets read to the players. */
  readAloudLang: ReadAloudLang;

  setFontScaleIndex: (i: number) => void;
  nudgeFontScale: (delta: number) => void;
  setReadAloudLang: (lang: ReadAloudLang) => void;
  toggleReadAloudLang: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      fontScaleIndex: DEFAULT_SCALE_INDEX,
      readAloudLang: 'en',

      setFontScaleIndex: (i) =>
        set({ fontScaleIndex: Math.min(FONT_SCALES.length - 1, Math.max(0, i)) }),

      nudgeFontScale: (delta) =>
        set((s) => ({
          fontScaleIndex: Math.min(
            FONT_SCALES.length - 1,
            Math.max(0, s.fontScaleIndex + delta)
          ),
        })),

      setReadAloudLang: (readAloudLang) => set({ readAloudLang }),
      toggleReadAloudLang: () =>
        set((s) => ({ readAloudLang: s.readAloudLang === 'en' ? 'da' : 'en' })),
    }),
    { name: 'dnd-prefs' }
  )
);

export function fontScale(): number {
  return FONT_SCALES[usePrefsStore.getState().fontScaleIndex] ?? 1;
}
