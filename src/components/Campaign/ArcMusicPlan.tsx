import { useMusicStore } from '../../store/musicStore';
import type { ArcDef } from '../../data/campaignArcs';
import type { Track } from '../../types';

interface Props {
  arc: ArcDef;
}

interface Bucket {
  key: string;
  label: string;
  icon: string;
  tracks: Track[];
}

function randomPick(pool: Track[], fallback: Track | undefined): Track | undefined {
  return pool[Math.floor(Math.random() * pool.length)] ?? fallback;
}

export default function ArcMusicPlan({ arc }: Props) {
  const { tracks, currentTrackId, isPlaying, playTrack, setIsPlaying, combatTrackId } =
    useMusicStore();

  const inArc = tracks.filter((t) => t.section && arc.musicSections.includes(t.section));

  const buckets: Bucket[] = [
    {
      key: 'explore', label: 'Exploration & Roleplay', icon: '🧭',
      tracks: inArc.filter((t) => !t.moods?.includes('combat') && !t.moods?.includes('boss')),
    },
    {
      key: 'combat', label: 'Combat', icon: '⚔️',
      tracks: inArc.filter((t) => t.moods?.includes('combat') && !t.moods?.includes('boss')),
    },
    {
      key: 'boss', label: 'Boss', icon: '👑',
      tracks: inArc.filter((t) => t.moods?.includes('boss')),
    },
  ];

  const shuffle = (bucket: Bucket) => {
    const pool = bucket.tracks.filter((t) => t.id !== currentTrackId);
    const pick = randomPick(pool, bucket.tracks[0]);
    if (pick) playTrack(pick.id);
  };

  if (inArc.length === 0) {
    return (
      <p className="text-stone-600 font-sans text-sm italic py-4">
        No tracks mapped to this arc's sections ({arc.musicSections.join(', ')}).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-stone-500 font-sans">
        Suggested from chapters: {arc.musicSections.join(' · ')}
      </p>

      {buckets.filter((b) => b.tracks.length > 0).map((bucket) => (
        <div key={bucket.key}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-widest text-amber-600 font-sans">
              {bucket.icon} {bucket.label}
              <span className="text-stone-600 ml-2">{bucket.tracks.length}</span>
            </h3>
            {bucket.tracks.length > 1 && (
              <button
                onClick={() => shuffle(bucket)}
                className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors"
                title={`Play a random ${bucket.label.toLowerCase()} track`}
              >
                🔀 shuffle
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {bucket.tracks.map((t) => {
              const isCurrent = t.id === currentTrackId;
              const playing = isCurrent && isPlaying;
              const isCombatPick = t.id === combatTrackId;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${
                    isCurrent
                      ? 'bg-amber-900/20 border-amber-700/40'
                      : 'bg-stone-800/50 border-stone-700/40 hover:border-stone-600'
                  }`}
                >
                  <button
                    onClick={() => (isCurrent ? setIsPlaying(!isPlaying) : playTrack(t.id))}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-colors ${
                      playing ? 'bg-amber-700 text-amber-100' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    }`}
                    title={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? '⏸' : '▶'}
                  </button>
                  <span className={`text-sm font-serif truncate flex-1 ${isCurrent ? 'text-amber-300' : 'text-parchment'}`}>
                    {t.customName || t.title}
                  </span>
                  <span className="text-[10px] text-stone-600 font-sans hidden md:block flex-shrink-0">
                    {t.section}
                  </span>
                  {(bucket.key === 'combat' || bucket.key === 'boss') && (
                    <button
                      onClick={() => useMusicStore.setState({ combatTrackId: t.id })}
                      className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded transition-colors font-sans ${
                        isCombatPick
                          ? 'bg-red-900/60 text-red-300'
                          : 'text-stone-600 hover:text-red-400'
                      }`}
                      title={isCombatPick ? 'Armed on the Combat! button' : 'Arm on the Combat! button'}
                    >
                      {isCombatPick ? '⚔️ armed' : '⚔️ arm'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
