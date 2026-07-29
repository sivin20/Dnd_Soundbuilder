import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PartyMember } from '../types';
import partyConfig from '../data/party.json';
import { deriveStats } from '../utils/ddbCharacter';
import type { DdbCharacterPayload } from '../utils/ddbCharacter';

// D&D Beyond integration.
// No official API — we read the same character-service JSON the DDB sheet
// uses, via the Vite dev-server proxy (/ddb, see vite.config.ts) because the
// service sends no CORS headers. Characters must have privacy set to PUBLIC
// (campaign-only characters return 403).
//
// The roster lives in src/data/party.json (edit that file to change the
// party). localStorage only caches the last-synced snapshots.

interface DdbClass {
  level: number;
  definition?: { name?: string };
}

interface DdbCharacter extends DdbCharacterPayload {
  id: number;
  name: string;
  decorations?: { avatarUrl?: string | null };
  race?: { fullName?: string; baseName?: string };
  classes?: DdbClass[];
  baseHitPoints?: number;
  removedHitPoints?: number;
  temporaryHitPoints?: number;
  overrideHitPoints?: number | null;
  bonusHitPoints?: number | null;
  deathSaves?: { failCount?: number | null; successCount?: number | null; isStabilized?: boolean };
  inspiration?: boolean;
  currentXp?: number;
  conditions?: { definition?: { name?: string }; name?: string }[];
}

/** Max HP as the sheet shows it: an override wins, otherwise base + bonus. */
export function maxHitPoints(m: PartyMember): number {
  return m.overrideHitPoints ?? m.baseHitPoints + m.bonusHitPoints;
}

export function currentHitPoints(m: PartyMember): number {
  return maxHitPoints(m) - m.removedHitPoints;
}

const CONFIG = partyConfig as { campaignUrl: string; characters: { id: number; name: string }[] };

function placeholder(c: { id: number; name: string }): PartyMember {
  return {
    characterId: c.id,
    name: c.name,
    avatarUrl: null,
    race: null,
    classes: '',
    level: 0,
    baseHitPoints: 0,
    removedHitPoints: 0,
    temporaryHitPoints: 0,
    overrideHitPoints: null,
    bonusHitPoints: 0,
    deathSaveFails: 0,
    deathSaveSuccesses: 0,
    stabilized: false,
    inspiration: false,
    conditions: [],
    currentXp: 0,
    stats: null,
    fetchedAt: 0,
  };
}

const CONFIG_MEMBERS: PartyMember[] = CONFIG.characters.map(placeholder);

async function fetchCharacter(characterId: number): Promise<PartyMember> {
  const res = await fetch(`/ddb/character/${characterId}`);
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? 'Character is not public — set Character Privacy to "Public" on D&D Beyond'
        : `D&D Beyond returned ${res.status}`
    );
  }
  const json = (await res.json()) as { success: boolean; data?: DdbCharacter };
  if (!json.success || !json.data) throw new Error('Unexpected response from D&D Beyond');
  const d = json.data;
  const classes = d.classes ?? [];
  return {
    characterId,
    name: d.name || `Character ${characterId}`,
    avatarUrl: d.decorations?.avatarUrl ?? null,
    race: d.race?.fullName ?? d.race?.baseName ?? null,
    classes: classes.map((c) => `${c.definition?.name ?? '?'} ${c.level}`).join(' / '),
    level: classes.reduce((sum, c) => sum + (c.level ?? 0), 0),
    baseHitPoints: d.baseHitPoints ?? 0,
    removedHitPoints: d.removedHitPoints ?? 0,
    temporaryHitPoints: d.temporaryHitPoints ?? 0,
    overrideHitPoints: d.overrideHitPoints ?? null,
    bonusHitPoints: d.bonusHitPoints ?? 0,
    deathSaveFails: d.deathSaves?.failCount ?? 0,
    deathSaveSuccesses: d.deathSaves?.successCount ?? 0,
    stabilized: d.deathSaves?.isStabilized ?? false,
    inspiration: d.inspiration ?? false,
    conditions: (d.conditions ?? [])
      .map((c) => c.definition?.name ?? c.name)
      .filter((n): n is string => !!n),
    currentXp: d.currentXp ?? 0,
    stats: deriveStats(d as DdbCharacterPayload),
    fetchedAt: Date.now(),
  };
}

const POLL_INTERVAL_MS = 60_000;

interface PartyState {
  campaignUrl: string;
  members: PartyMember[];
  refreshing: boolean;
  /** HP per character at the previous sync, for "took 12 since last sync". */
  previousHp: Record<number, number>;
  /** Re-sync on a timer so the panel tracks damage during play. */
  autoSync: boolean;

  refreshAll: () => Promise<void>;
  toggleAutoSync: () => void;
  clearDeltas: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void usePartyStore.getState().refreshAll();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

export const usePartyStore = create<PartyState>()(
  persist(
    (set, get) => ({
      campaignUrl: CONFIG.campaignUrl,
      members: CONFIG_MEMBERS,
      refreshing: false,
      previousHp: {},
      autoSync: false,

      refreshAll: async () => {
        const { members, refreshing } = get();
        if (refreshing || members.length === 0) return;
        set({ refreshing: true });

        // Snapshot HP before overwriting so the panel can show what changed
        const before: Record<number, number> = {};
        for (const m of members) {
          if (m.fetchedAt > 0) before[m.characterId] = currentHitPoints(m);
        }

        const updated = await Promise.all(
          members.map(async (m) => {
            try {
              return await fetchCharacter(m.characterId);
            } catch (e) {
              return { ...m, error: e instanceof Error ? e.message : String(e) };
            }
          })
        );

        set((s) => ({
          members: updated,
          refreshing: false,
          // Keep the previous reading for anyone whose HP actually moved
          previousHp: Object.fromEntries(
            updated.flatMap((m) => {
              const prior = before[m.characterId] ?? s.previousHp[m.characterId];
              if (prior == null || prior === currentHitPoints(m)) return [];
              return [[m.characterId, prior] as const];
            })
          ),
        }));
      },

      toggleAutoSync: () => {
        const next = !get().autoSync;
        if (next) startPolling(); else stopPolling();
        set({ autoSync: next });
      },

      clearDeltas: () => set({ previousHp: {} }),
    }),
    {
      name: 'dnd-party-store',
      partialize: (state) => ({ members: state.members }),
      // party.json is the source of truth for WHO is in the party;
      // persisted data only contributes cached snapshots.
      merge: (persisted, current) => {
        const p = persisted as { members?: PartyMember[] };
        const cached = new Map((p.members ?? []).map((m) => [m.characterId, m]));
        return {
          ...current,
          // Layer the cached snapshot over a fresh placeholder so a snapshot
          // written before a field existed still has every field defined.
          members: CONFIG.characters.map((c) => {
            const saved = cached.get(c.id);
            return saved ? { ...placeholder(c), ...saved } : placeholder(c);
          }),
        };
      },
    }
  )
);
