import { useEffect, useState } from 'react';
import { usePartyStore, currentHitPoints, maxHitPoints } from '../../store/partyStore';
import type { PartyMember } from '../../types';

// Read-only party roster synced from D&D Beyond.
// The roster is defined in src/data/party.json — this panel displays it and
// auto-syncs character details on app load.
//
// AC, passive scores and spell save DC are derived from the character payload
// (see utils/ddbCharacter.ts) because D&D Beyond ships none of them computed.

function Badge({
  label, value, tone = 'stone', title,
}: {
  label: string;
  value: string | number;
  tone?: 'stone' | 'amber' | 'warn';
  title?: string;
}) {
  const tones = {
    stone: 'text-stone-300',
    amber: 'text-amber-300',
    warn: 'text-amber-400',
  };
  return (
    <span className="flex flex-col items-center leading-none" title={title}>
      <span className={`text-sm font-sans tabular-nums ${tones[tone]}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-stone-600 font-sans mt-0.5">
        {label}
      </span>
    </span>
  );
}

function HpBar({ member, delta }: { member: PartyMember; delta: number | null }) {
  const max = maxHitPoints(member);
  const current = currentHitPoints(member);
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const dying = current <= 0;
  const bloodied = pct <= 50;

  return (
    <div className="mt-1.5">
      <div className="flex items-baseline gap-2">
        <span className={`text-xs font-sans tabular-nums ${dying ? 'text-red-400' : 'text-stone-400'}`}>
          {current}/{max}
          {member.temporaryHitPoints > 0 && (
            <span className="text-sky-400/90 ml-1">+{member.temporaryHitPoints}</span>
          )}
        </span>
        {delta !== null && delta !== 0 && (
          <span
            className={`text-xs font-sans tabular-nums ${delta < 0 ? 'text-red-400' : 'text-green-500'}`}
            title="Change since the previous sync"
          >
            {delta < 0 ? '▼' : '▲'} {Math.abs(delta)}
          </span>
        )}
        {member.inspiration && (
          <span className="text-xs ml-auto" title="Has inspiration">✨</span>
        )}
      </div>
      <div className="h-1 w-full bg-stone-800 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            dying ? 'bg-red-800' : bloodied ? 'bg-amber-600' : 'bg-green-700'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MemberCard({ member, delta }: { member: PartyMember; delta: number | null }) {
  const stats = member.stats;
  const current = currentHitPoints(member);
  const dying = current <= 0 && member.fetchedAt > 0;
  const conditions = member.conditions ?? [];

  return (
    <div
      className={`bg-stone-800/50 border rounded-lg p-2.5 ${
        dying ? 'border-red-800/60' : 'border-stone-700/40'
      }`}
    >
      <div className="flex items-center gap-3">
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

        {stats && (
          <div className="flex gap-3 flex-shrink-0">
            <Badge
              label="AC"
              // A trailing ? beats colour alone: this AC ignores mage armor and
              // similar, and a DM shouldn't have to notice a hue to know that.
              value={stats.armorClassUncertain ? `${stats.armorClass}?` : stats.armorClass}
              tone={stats.armorClassUncertain ? 'warn' : 'stone'}
              title={
                stats.armorClassNote +
                (stats.armorClassUncertain
                  ? ' — no body armour equipped, so spells like mage armor are not counted'
                  : '')
              }
            />
            <Badge
              label="Pass"
              value={stats.passivePerception}
              tone="amber"
              title={`Passive Perception ${stats.passivePerception} · Investigation ${stats.passiveInvestigation} · Insight ${stats.passiveInsight}`}
            />
            <Badge
              label="Init"
              value={`${stats.initiative >= 0 ? '+' : ''}${stats.initiative}`}
              title="Initiative bonus"
            />
            {stats.spellSaveDc !== null && (
              <Badge label="DC" value={stats.spellSaveDc} title="Spell save DC" />
            )}
          </div>
        )}

        {member.fetchedAt === 0 && (
          <span className="text-xs font-sans text-stone-600 italic flex-shrink-0">syncing…</span>
        )}
      </div>

      {member.fetchedAt > 0 && <HpBar member={member} delta={delta} />}

      {(conditions.length > 0 || dying) && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {dying && (
            <span className="text-xs font-sans bg-red-950/70 text-red-300 px-1.5 py-0.5 rounded-full">
              💀 down
              {member.stabilized
                ? ' · stable'
                : (member.deathSaveFails > 0 || member.deathSaveSuccesses > 0)
                  ? ` · ${member.deathSaveSuccesses}✓ ${member.deathSaveFails}✗`
                  : ''}
            </span>
          )}
          {conditions.map((c) => (
            <span
              key={c}
              className="text-xs font-sans bg-purple-950/60 text-purple-300 px-1.5 py-0.5 rounded-full"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PartyPanel() {
  const { members, campaignUrl, refreshing, refreshAll, previousHp, autoSync, toggleAutoSync } =
    usePartyStore();
  const [showPassives, setShowPassives] = useState(false);

  // Sync fresh data from D&D Beyond once per app load
  useEffect(() => {
    void usePartyStore.getState().refreshAll();
  }, []);

  if (members.length === 0) return null;

  const synced = members.filter((m) => m.fetchedAt > 0 && m.stats);

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans">🐉 Party</h2>
        <div className="flex items-center gap-2">
          {synced.length > 0 && (
            <button
              onClick={() => setShowPassives(!showPassives)}
              className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors"
              title="Show every passive score at once"
            >
              {showPassives ? 'hide passives' : 'passives'}
            </button>
          )}
          <button
            onClick={toggleAutoSync}
            className={`text-xs font-sans transition-colors ${
              autoSync ? 'text-amber-400' : 'text-stone-500 hover:text-amber-400'
            }`}
            title={
              autoSync
                ? 'Auto-syncing every minute — click to stop'
                : 'Re-sync every minute so HP tracks the fight'
            }
          >
            {autoSync ? '⏱ auto' : '⏱ auto off'}
          </button>
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

      {/* All passives at once — the numbers you call for most */}
      {showPassives && synced.length > 0 && (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="text-stone-600 text-left">
                <th className="font-normal pb-1">Character</th>
                <th className="font-normal pb-1 text-right">Perc</th>
                <th className="font-normal pb-1 text-right">Inv</th>
                <th className="font-normal pb-1 text-right">Ins</th>
              </tr>
            </thead>
            <tbody>
              {synced.map((m) => (
                <tr key={m.characterId} className="text-stone-300">
                  <td className="truncate max-w-[10rem] py-0.5">{m.name}</td>
                  <td className="text-right tabular-nums text-amber-300">{m.stats!.passivePerception}</td>
                  <td className="text-right tabular-nums">{m.stats!.passiveInvestigation}</td>
                  <td className="text-right tabular-nums">{m.stats!.passiveInsight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members.map((m) => {
          const prior = previousHp[m.characterId];
          const delta =
            prior != null && m.fetchedAt > 0 ? currentHitPoints(m) - prior : null;
          return <MemberCard key={m.characterId} member={m} delta={delta} />;
        })}
      </div>
    </div>
  );
}
