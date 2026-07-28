import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PartyMember } from '../types';
import partyConfig from '../data/party.json';

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

interface DdbCharacter {
  id: number;
  name: string;
  decorations?: { avatarUrl?: string | null };
  race?: { fullName?: string; baseName?: string };
  classes?: DdbClass[];
  baseHitPoints?: number;
  removedHitPoints?: number;
  temporaryHitPoints?: number;
  overrideHitPoints?: number | null;
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
    fetchedAt: Date.now(),
  };
}

interface PartyState {
  campaignUrl: string;
  members: PartyMember[];
  refreshing: boolean;

  refreshAll: () => Promise<void>;
}

export const usePartyStore = create<PartyState>()(
  persist(
    (set, get) => ({
      campaignUrl: CONFIG.campaignUrl,
      members: CONFIG_MEMBERS,
      refreshing: false,

      refreshAll: async () => {
        const { members, refreshing } = get();
        if (refreshing || members.length === 0) return;
        set({ refreshing: true });
        const updated = await Promise.all(
          members.map(async (m) => {
            try {
              return await fetchCharacter(m.characterId);
            } catch (e) {
              return { ...m, error: e instanceof Error ? e.message : String(e) };
            }
          })
        );
        set({ members: updated, refreshing: false });
      },
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
          members: CONFIG.characters.map((c) => cached.get(c.id) ?? placeholder(c)),
        };
      },
    }
  )
);
