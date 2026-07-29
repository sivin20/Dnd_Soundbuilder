import { useCampaignStore } from '../../store/campaignStore';
import { CAMPAIGN_ARCS } from '../../data/campaignArcs';

interface Props {
  onOpenCampaign: () => void;
}

// Never start a session cold. Where you left them, and what somebody promised.

export default function LastSessionCard({ onOpenCampaign }: Props) {
  const sessions = useCampaignStore((s) => s.sessions);
  const last = sessions[0] ?? null; // newest first

  if (!last) {
    return (
      <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-2">
          📜 Last Session
        </h2>
        <button
          onClick={onOpenCampaign}
          className="text-stone-500 text-sm font-serif italic hover:text-amber-400 transition-colors"
        >
          Nothing logged yet — open the session log
        </button>
      </div>
    );
  }

  const arc = CAMPAIGN_ARCS.find((a) => a.id === last.arcId);
  const openPromises = sessions
    .filter((s) => s.promises.trim())
    .slice(0, 3);

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans">
          📜 Last Session
        </h2>
        <button
          onClick={onOpenCampaign}
          className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors"
        >
          session log ↗
        </button>
      </div>

      <p className="text-parchment font-serif font-semibold truncate">{last.title}</p>
      <p className="text-stone-600 text-xs font-sans mb-2">
        {last.date}
        {arc && <span className="text-amber-800 ml-2">Arc {arc.code} — {arc.title}</span>}
      </p>

      {last.cliffhanger.trim() ? (
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2 mb-2">
          <p className="text-[11px] uppercase tracking-widest text-amber-700 font-sans mb-0.5">
            Where you left them
          </p>
          <p className="text-sm text-parchment font-sans leading-snug whitespace-pre-wrap">
            {last.cliffhanger}
          </p>
        </div>
      ) : (
        <p className="text-stone-600 text-xs font-sans italic mb-2">
          No cliffhanger recorded for this session.
        </p>
      )}

      {openPromises.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-sans mb-0.5">
            Outstanding promises
          </p>
          <ul className="text-xs text-stone-400 font-sans flex flex-col gap-0.5">
            {openPromises.map((s) => (
              <li key={s.id} className="truncate" title={s.promises}>
                · {s.promises.split('\n')[0]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
