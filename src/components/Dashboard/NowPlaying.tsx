import { useMusicStore } from '../../store/musicStore';
import { getThumbnailUrl } from '../../utils/youtube';
import VolumeSlider from '../shared/VolumeSlider';

export default function NowPlaying() {
  const { tracks, currentTrackId, isPlaying, volume, setIsPlaying, setVolume, stopPlayback, playTrack } =
    useMusicStore();
  const currentTrack = tracks.find((t) => t.id === currentTrackId) ?? null;

  const currentIndex = tracks.findIndex((t) => t.id === currentTrackId);
  const prevTrack = currentIndex > 0 ? tracks[currentIndex - 1] : null;
  const nextTrack = currentIndex < tracks.length - 1 ? tracks[currentIndex + 1] : null;

  const displayName = currentTrack
    ? currentTrack.customName || currentTrack.title
    : null;

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-6 shadow-xl">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-4">
        Now Playing
      </h2>

      {currentTrack ? (
        <div className="flex flex-col gap-4">
          {/* Thumbnail + title */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={getThumbnailUrl(currentTrack.videoId)}
                alt={displayName ?? ''}
                className="w-24 h-16 object-cover rounded-lg border border-stone-700"
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                  <div className="flex gap-0.5 items-end h-5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-amber-400 rounded-sm playing-pulse"
                        style={{
                          height: `${40 + i * 15}%`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-parchment font-serif font-semibold truncate text-lg leading-tight">
                {displayName}
              </p>
              {currentTrack.customName && currentTrack.customName !== currentTrack.title && (
                <p className="text-stone-500 text-xs font-sans truncate mt-0.5">
                  {currentTrack.title}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => prevTrack && playTrack(prevTrack.id)}
              disabled={!prevTrack}
              className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-700 disabled:opacity-30 transition-all"
              title="Previous"
            >
              ⏮
            </button>

            <button
              onClick={() => (isPlaying ? stopPlayback() : setIsPlaying(true))}
              className="w-14 h-14 rounded-full bg-amber-700 hover:bg-amber-600 flex items-center justify-center text-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <button
              onClick={() => nextTrack && playTrack(nextTrack.id)}
              disabled={!nextTrack}
              className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-700 disabled:opacity-30 transition-all"
              title="Next"
            >
              ⏭
            </button>
          </div>

          {/* Volume */}
          <VolumeSlider value={volume} onChange={setVolume} label="Music volume" />
        </div>
      ) : (
        <div className="text-center py-8 text-stone-600">
          <p className="text-4xl mb-2">🎵</p>
          <p className="font-serif italic">No track selected</p>
          <p className="text-xs font-sans mt-1">
            Go to Music Library to add tracks
          </p>
        </div>
      )}
    </div>
  );
}
