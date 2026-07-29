import { useEffect, useMemo, useState } from 'react';
import { loadMilestones, earnedXp, levelForXp, xpToNextLevel, xpForLevel } from '../../utils/milestones';
import type { Milestone } from '../../utils/milestones';
import { useCampaignStore } from '../../store/campaignStore';
import { usePartyStore } from '../../store/partyStore';
import { CAMPAIGN_ARCS } from '../../data/campaignArcs';

export default function MilestonesPanel() {
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { milestonesDone, toggleMilestone, startingLevel, setStartingLevel } = useCampaignStore();
  const members = usePartyStore((s) => s.members);

  useEffect(() => {
    let cancelled = false;
    loadMilestones()
      .then((list) => { if (!cancelled) setMilestones(list); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  const awarded = useMemo(
    () => (milestones ? earnedXp(milestones, milestonesDone) : 0),
    [milestones, milestonesDone]
  );
  // Milestone XP sits on top of the level the party started at
  const baseline = xpForLevel(startingLevel ?? 2);
  const xp = baseline + awarded;
  const impliedLevel = levelForXp(xp);
  const toNext = xpToNextLevel(xp);

  // What the sheets actually say, to compare against the milestones ticked
  const sheetLevels = members.filter((m) => m.level > 0).map((m) => m.level);
  const sheetLevel = sheetLevels.length
    ? Math.round(sheetLevels.reduce((a, b) => a + b, 0) / sheetLevels.length)
    : null;

  if (error) {
    return (
      <div className="text-center py-10 text-stone-500 font-sans text-sm">
        <p className="text-3xl mb-2">🏆</p>
        <p>Couldn't read the milestones.</p>
        <p className="text-stone-600 text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!milestones) {
    return (
      <p className="text-stone-600 font-sans text-sm italic py-10 text-center">
        Counting the deeds…
      </p>
    );
  }

  const byArc = CAMPAIGN_ARCS.map((arc) => ({
    arc,
    items: milestones.filter((m) => m.arcId === arc.id),
  })).filter((g) => g.items.length > 0);

  const doneCount = milestones.filter((m) => milestonesDone[m.id]).length;

  return (
    <div>
      <h2 className="text-xl font-serif font-bold text-amber-400 mb-1">🏆 Story Milestones</h2>
      <p className="text-stone-500 text-xs font-sans mb-4">
        Parsed from the guide — {milestones.length} milestones, {doneCount} completed.
      </p>

      {/* XP summary */}
      <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 mb-5">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-600 font-sans">Total XP</p>
            <p className="text-2xl font-serif text-parchment tabular-nums" title={`${baseline.toLocaleString()} from starting at level ${startingLevel} + ${awarded.toLocaleString()} awarded`}>
              {xp.toLocaleString()}
            </p>
            <p className="text-[11px] text-stone-600 font-sans">
              {awarded.toLocaleString()} awarded + {baseline.toLocaleString()} base
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">Started at</p>
            <select
              value={startingLevel ?? 2}
              onChange={(e) => setStartingLevel(Number(e.target.value))}
              className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-lg font-serif text-parchment tabular-nums focus:outline-none focus:border-amber-700/60"
              title="Reloaded starts characters at 2nd level, so its milestone XP is on top of 300 XP"
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>level {l}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-600 font-sans">Implies level</p>
            <p className="text-2xl font-serif text-parchment tabular-nums">{impliedLevel}</p>
          </div>
          {sheetLevel !== null && (
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
                Sheets say
              </p>
              <p
                className={`text-2xl font-serif tabular-nums ${
                  sheetLevel === impliedLevel ? 'text-stone-400' : 'text-amber-400'
                }`}
                title={
                  sheetLevel === impliedLevel
                    ? 'Milestones and D&D Beyond agree'
                    : 'The party sheets and the ticked milestones disagree'
                }
              >
                {sheetLevel}
                {sheetLevel !== impliedLevel && <span className="text-sm ml-1">⚠</span>}
              </p>
            </div>
          )}
          {toNext && (
            <p className="text-xs text-stone-500 font-sans">
              {toNext.needed.toLocaleString()} XP to level {toNext.next}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {byArc.map(({ arc, items }) => (
          <div key={arc.id}>
            <h3 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-2">
              Arc {arc.code} — {arc.title}
            </h3>
            <div className="flex flex-col gap-1.5">
              {items.map((m) => {
                const done = !!milestonesDone[m.id];
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMilestone(m.id)}
                    className={`flex items-start gap-2.5 text-left rounded-lg border px-3 py-2 transition-colors group ${
                      done
                        ? 'bg-green-950/20 border-green-800/40'
                        : 'bg-stone-900 border-stone-800 hover:border-amber-800/50'
                    }`}
                    title={m.detail}
                  >
                    <span
                      className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 border text-xs flex items-center justify-center transition-colors ${
                        done
                          ? 'bg-green-800/70 border-green-600 text-green-100'
                          : 'bg-stone-800 border-stone-600 group-hover:border-amber-700'
                      }`}
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-sans leading-snug ${
                          done ? 'text-green-200/80' : 'text-stone-300'
                        }`}
                      >
                        {m.optional && (
                          <span className="text-[10px] uppercase tracking-wider text-stone-500 mr-1.5">
                            bonus
                          </span>
                        )}
                        {m.summary}
                      </span>
                    </span>
                    {m.xp !== null && (
                      <span className="text-xs font-sans text-amber-700 tabular-nums flex-shrink-0 mt-0.5">
                        {m.xp.toLocaleString()} XP
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
