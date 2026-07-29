import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from './fileStorage';
import { v4 as uuidv4 } from 'uuid';
import type { ArcStatus, SessionNote } from '../types';
import { CAMPAIGN_ARCS } from '../data/campaignArcs';
import { useMusicStore } from './musicStore';

interface ArcState {
  status: ArcStatus;
  notes: string;
}

interface CampaignState {
  arcState: Record<string, ArcState>;
  currentArcId: string | null;
  sessions: SessionNote[];

  setArcStatus: (arcId: string, status: ArcStatus) => void;
  setArcNotes: (arcId: string, notes: string) => void;
  /** Make an arc the "we are here" arc: mark active + prep the combat button
   *  with a fitting combat track from the arc's music sections. */
  enterArc: (arcId: string) => void;
  addSession: (note: Omit<SessionNote, 'id'>) => void;
  updateSession: (id: string, patch: Partial<Omit<SessionNote, 'id'>>) => void;
  deleteSession: (id: string) => void;
}

export function getArcState(state: CampaignState, arcId: string): ArcState {
  return state.arcState[arcId] ?? { status: 'todo', notes: '' };
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      arcState: {},
      currentArcId: null,
      sessions: [],

      setArcStatus: (arcId, status) =>
        set((s) => ({
          arcState: { ...s.arcState, [arcId]: { ...getArcState(s, arcId), status } },
          // Leaving "active" clears the current marker if it pointed here
          currentArcId:
            s.currentArcId === arcId && status !== 'active' ? null : s.currentArcId,
        })),

      setArcNotes: (arcId, notes) =>
        set((s) => ({
          arcState: { ...s.arcState, [arcId]: { ...getArcState(s, arcId), notes } },
        })),

      enterArc: (arcId) => {
        const arc = CAMPAIGN_ARCS.find((a) => a.id === arcId);
        set((s) => ({
          currentArcId: arcId,
          arcState: { ...s.arcState, [arcId]: { ...getArcState(s, arcId), status: 'active' } },
        }));

        // Prep the combat button with an arc-appropriate track (boss > combat)
        if (arc) {
          const { tracks } = useMusicStore.getState();
          const inArc = tracks.filter((t) => t.section && arc.musicSections.includes(t.section));
          const pick =
            inArc.find((t) => t.moods?.includes('boss')) ??
            inArc.find((t) => t.moods?.includes('combat'));
          if (pick) useMusicStore.setState({ combatTrackId: pick.id });
        }
      },

      addSession: (note) =>
        set((s) => ({ sessions: [{ ...note, id: uuidv4() }, ...s.sessions] })),

      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),

      deleteSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((n) => n.id !== id) })),
    }),
    // Arc notes and the session log are the least replaceable data in the app —
    // stored as a file in campaign-state/, not in this browser.
    { name: 'dnd-campaign-store', storage: createJSONStorage(() => fileStorage) }
  )
);
