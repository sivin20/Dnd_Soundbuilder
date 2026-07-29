import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from './fileStorage';
import { v4 as uuidv4 } from 'uuid';
import type {
  ArcStatus, SessionNote, TarokkaSlotState, CampaignFlagValue, Deadline, BarovianTime, GuideRef,
} from '../types';
import { CAMPAIGN_ARCS } from '../data/campaignArcs';
import { defaultTarokka } from '../data/campaignState';
import { useMusicStore } from './musicStore';

interface ArcState {
  status: ArcStatus;
  notes: string;
}

const MINUTES_PER_DAY = 24 * 60;
const LONG_REST_MINUTES = 8 * 60;
const DEFAULT_TIME: BarovianTime = { day: 1, minutes: 8 * 60 };

interface CampaignState {
  arcState: Record<string, ArcState>;
  currentArcId: string | null;
  sessions: SessionNote[];
  /** Madam Eva's five cards — what they were and what they resolved to. */
  tarokka: Record<string, TarokkaSlotState>;
  /** Campaign-spanning toggles and choices (fanes, artifacts, fates). */
  flags: Record<string, CampaignFlagValue>;
  time: BarovianTime;
  deadlines: Deadline[];
  /** Story milestones ticked off, keyed by the parsed milestone id. */
  milestonesDone: Record<string, boolean>;

  setArcStatus: (arcId: string, status: ArcStatus) => void;
  setArcNotes: (arcId: string, notes: string) => void;
  setTarokkaSlot: (slotId: string, patch: Partial<TarokkaSlotState>) => void;
  resetTarokka: () => void;
  setFlag: (flagId: string, value: CampaignFlagValue) => void;
  /** Move the in-world clock; wraps into the next day past midnight. */
  advanceTime: (minutes: number) => void;
  /** Jump to a time of day, optionally on the next day. */
  setTimeOfDay: (minutes: number, nextDay?: boolean) => void;
  setDay: (day: number) => void;
  longRest: () => void;
  addDeadline: (label: string, dueDay: number, note?: string, source?: GuideRef) => void;
  updateDeadline: (id: string, patch: Partial<Omit<Deadline, 'id'>>) => void;
  deleteDeadline: (id: string) => void;
  toggleMilestone: (milestoneId: string) => void;
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
    (set, get) => ({
      arcState: {},
      currentArcId: null,
      sessions: [],
      tarokka: defaultTarokka(),
      flags: {},
      time: DEFAULT_TIME,
      deadlines: [],
      milestonesDone: {},

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

      setTarokkaSlot: (slotId, patch) =>
        set((s) => ({
          tarokka: {
            ...s.tarokka,
            [slotId]: { ...(s.tarokka[slotId] ?? { card: '', resolved: '', done: false }), ...patch },
          },
        })),

      resetTarokka: () => set({ tarokka: defaultTarokka() }),

      setFlag: (flagId, value) =>
        set((s) => ({ flags: { ...s.flags, [flagId]: value } })),

      advanceTime: (minutes) =>
        set((s) => {
          const total = s.time.day * MINUTES_PER_DAY + s.time.minutes + minutes;
          const clamped = Math.max(MINUTES_PER_DAY, total); // never before day 1, 00:00
          return {
            time: {
              day: Math.floor(clamped / MINUTES_PER_DAY),
              minutes: clamped % MINUTES_PER_DAY,
            },
          };
        }),

      setTimeOfDay: (minutes, nextDay = false) =>
        set((s) => ({ time: { day: s.time.day + (nextDay ? 1 : 0), minutes } })),

      setDay: (day) => set((s) => ({ time: { ...s.time, day: Math.max(1, day) } })),

      longRest: () => {
        get().advanceTime(LONG_REST_MINUTES);
      },

      addDeadline: (label, dueDay, note = '', source) =>
        set((s) => ({
          deadlines: [...s.deadlines, { id: uuidv4(), label, dueDay, note, done: false, source }]
            .sort((a, b) => a.dueDay - b.dueDay),
        })),

      updateDeadline: (id, patch) =>
        set((s) => ({
          deadlines: s.deadlines
            .map((d) => (d.id === id ? { ...d, ...patch } : d))
            .sort((a, b) => a.dueDay - b.dueDay),
        })),

      deleteDeadline: (id) =>
        set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) })),

      toggleMilestone: (milestoneId) =>
        set((s) => ({
          milestonesDone: { ...s.milestonesDone, [milestoneId]: !s.milestonesDone[milestoneId] },
        })),

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
