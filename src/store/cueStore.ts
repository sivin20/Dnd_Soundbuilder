import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSceneStore } from './sceneStore';

// Scene cues bind a saved scene (music + ambient mix) to a heading in the
// Reloaded guide — "B5a. The Barricade" plays the siege mix. Prep once by
// setting up the board and saving it onto the heading; at the table you scroll
// the guide and click the ▶ next to each scene as you reach it.

export interface Cue {
  mdPath: string;
  headingId: string;
  headingText: string;
  sceneId: string;
}

export function cueKey(mdPath: string, headingId: string): string {
  return `${mdPath}#${headingId}`;
}

interface CueState {
  cues: Record<string, Cue>;

  setCue: (cue: Cue) => void;
  clearCue: (mdPath: string, headingId: string) => void;
  /** Apply the cue's scene. No-op if the scene has since been deleted. */
  fireCue: (mdPath: string, headingId: string) => void;
}

export const useCueStore = create<CueState>()(
  persist(
    (set, get) => ({
      cues: {},

      setCue: (cue) =>
        set((s) => ({ cues: { ...s.cues, [cueKey(cue.mdPath, cue.headingId)]: cue } })),

      clearCue: (mdPath, headingId) =>
        set((s) => {
          const next = { ...s.cues };
          delete next[cueKey(mdPath, headingId)];
          return { cues: next };
        }),

      fireCue: (mdPath, headingId) => {
        const cue = get().cues[cueKey(mdPath, headingId)];
        if (!cue) return;
        const { scenes, applyScene } = useSceneStore.getState();
        if (scenes.some((s) => s.id === cue.sceneId)) applyScene(cue.sceneId);
      },
    }),
    { name: 'dnd-cue-store' }
  )
);

/** All cues on one guide page, in the order their headings appear. */
export function selectPageCues(
  cues: Record<string, Cue>,
  mdPath: string,
  headingOrder: string[]
): Cue[] {
  const onPage = Object.values(cues).filter((c) => c.mdPath === mdPath);
  return onPage.sort(
    (a, b) => headingOrder.indexOf(a.headingId) - headingOrder.indexOf(b.headingId)
  );
}
