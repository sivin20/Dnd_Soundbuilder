import { useCampaignStore } from '../../store/campaignStore';
import { useMusicStore } from '../../store/musicStore';
import { CAMPAIGN_ARCS } from '../../data/campaignArcs';

interface Props {
  onOpenCampaign: () => void;
}

export default function CurrentArcCard({ onOpenCampaign }: Props) {
  const { currentArcId } = useCampaignStore();
  const { tracks, currentTrackId, playTrack } = useMusicStore();

  const arc = CAMPAIGN_ARCS.find((a) => a.id === currentArcId) ?? null;

  const shuffleBucket = (bucket: 'explore' | 'combat') => {
    if (!arc) return;
    const inArc = tracks.filter((t) => t.section && arc.musicSections.includes(t.section));
    const pool = inArc.filter((t) =>
      bucket === 'combat'
        ? t.moods?.includes('combat') || t.moods?.includes('boss')
        : !t.moods?.includes('combat') && !t.moods?.includes('boss')
    ).filter((t) => t.id !== currentTrackId);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) playTrack(pick.id);
  };

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl px-5 py-4 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-1">
            📍 Campaign
          </h2>
          {arc ? (
            <button
              onClick={onOpenCampaign}
              className="text-left group"
              title="Open in campaign tracker"
            >
              <p className="text-parchment font-serif font-semibold truncate group-hover:text-amber-300 transition-colors">
                Arc {arc.code}: {arc.title}
              </p>
              <p className="text-stone-600 text-xs font-sans truncate">{arc.act}</p>
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

        {arc && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => shuffleBucket('explore')}
              className="text-xs font-sans bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 transition-colors"
              title="Random exploration/roleplay track for this arc"
            >
              🧭 Explore
            </button>
            <button
              onClick={() => shuffleBucket('combat')}
              className="text-xs font-sans bg-stone-800 hover:bg-red-900/40 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 transition-colors"
              title="Random combat track for this arc"
            >
              ⚔️ Fight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
