import { useEffect } from 'react';
import { usePartyStore } from '../../store/partyStore';
import type { PartyMember } from '../../types';

// Read-only party roster synced from D&D Beyond.
// The roster is defined in src/data/party.json — this panel displays it and
// auto-syncs character details on app load.

function MemberCard({ member }: { member: PartyMember }) {
  const dmg = member.removedHitPoints;
  const temp = member.temporaryHitPoints;

  return (
    <div className="flex items-center gap-3 bg-stone-800/50 border border-stone-700/40 rounded-lg p-2.5">
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.name}
          className="w-10 h-10 rounded-full object-cover border border-amber-900/40 flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-lg flex-shrink-0">
          🧝
        </div>
      )}

      <div className="min-w-0 flex-1">
        <a
          href={`https://www.dndbeyond.com/characters/${member.characterId}`}
          target="_blank"
          rel="noopener"
          className="text-sm font-serif text-parchment hover:text-amber-300 transition-colors truncate block leading-tight"
          title="Open character sheet on D&D Beyond"
        >
          {member.name}
        </a>
        <p className="text-xs text-stone-500 font-sans truncate">
          {member.race && <span>{member.race} · </span>}
          {member.classes || `Level ${member.level}`}
        </p>
        {member.error && (
          <p className="text-xs text-red-400/80 font-sans truncate" title={member.error}>
            ⚠ {member.error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {member.fetchedAt === 0 ? (
          <span className="text-xs font-sans text-stone-600 italic">syncing…</span>
        ) : dmg > 0 ? (
          <span className="text-xs font-sans bg-red-950/70 text-red-300 px-1.5 py-0.5 rounded-full" title="Damage taken (per last sync)">
            −{dmg} hp
          </span>
        ) : (
          <span className="text-xs font-sans text-green-700/80" title="No damage taken (per last sync)">
            unhurt
          </span>
        )}
        {temp > 0 && (
          <span className="text-xs font-sans text-sky-500/80" title="Temporary hit points">
            +{temp} temp
          </span>
        )}
      </div>
    </div>
  );
}

export default function PartyPanel() {
  const { members, campaignUrl, refreshing, refreshAll } = usePartyStore();

  // Sync fresh data from D&D Beyond once per app load
  useEffect(() => {
    void usePartyStore.getState().refreshAll();
  }, []);

  if (members.length === 0) return null;

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans">
          🐉 Party
        </h2>
        <div className="flex items-center gap-2">
          {campaignUrl && (
            <a
              href={campaignUrl}
              target="_blank"
              rel="noopener"
              className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors"
              title="Open campaign on D&D Beyond"
            >
              campaign ↗
            </a>
          )}
          <button
            onClick={() => refreshAll()}
            disabled={refreshing}
            className="text-xs font-sans text-stone-500 hover:text-amber-400 disabled:opacity-40 transition-colors"
            title="Re-sync all characters from D&D Beyond"
          >
            {refreshing ? '⟳ syncing…' : '⟳ sync'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <MemberCard key={m.characterId} member={m} />
        ))}
      </div>
    </div>
  );
}
