import { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { CAMPAIGN_ARCS, ACTS } from '../../data/campaignArcs';
import ArcScenes from '../shared/ArcScenes';

interface Props {
  onOpenCampaign: () => void;
}

/**
 * Where the party is, and the ready-made scenes for that arc. The arc picker
 * lets you pull up another arc's scenes without moving the campaign marker —
 * handy when the party wanders somewhere you weren't expecting.
 */
export default function CurrentArcCard({ onOpenCampaign }: Props) {
  const { currentArcId } = useCampaignStore();
  const [override, setOverride] = useState<string | null>(null);

  const shownArcId = override ?? currentArcId;
  const arc = CAMPAIGN_ARCS.find((a) => a.id === shownArcId) ?? null;
  const isElsewhere = override !== null && override !== currentArcId;

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl px-5 py-4 shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-1">
            📍 Campaign
          </h2>
          {arc ? (
            <button onClick={onOpenCampaign} className="text-left group" title="Open in campaign tracker">
              <p className="text-parchment font-serif font-semibold truncate group-hover:text-amber-300 transition-colors">
                Arc {arc.code}: {arc.title}
              </p>
              <p className="text-stone-600 text-xs font-sans truncate">
                {arc.act}
                {isElsewhere && <span className="text-amber-700 ml-2">· not the current arc</span>}
              </p>
            </button>
          ) : (
            <button
              onClick={onOpenCampaign}
              className="text-stone-500 text-sm font-serif italic hover:text-amber-400 transition-colors"
            >
              No current arc — open the campaign tracker
            </button>
          )}
        </div>

        <select
          value={shownArcId ?? ''}
          onChange={(e) => setOverride(e.target.value || null)}
          className="bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-400 font-sans px-2 py-1 focus:outline-none focus:border-amber-700/60 max-w-56 flex-shrink-0"
          title="Show another arc's scenes"
        >
          {currentArcId && <option value={currentArcId}>Current arc</option>}
          {ACTS.map((act) => (
            <optgroup key={act} label={act}>
              {CAMPAIGN_ARCS.filter((a) => a.act === act).map((a) => (
                <option key={a.id} value={a.id}>
                  Arc {a.code} — {a.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <ArcScenes arcId={shownArcId} />
    </div>
  );
}
