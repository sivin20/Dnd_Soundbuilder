import { useMusicStore } from '../../store/musicStore';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import VolumeSlider from '../shared/VolumeSlider';

export default function NowPlaying() {
  const {
    tracks, currentTrackId, isPlaying, volume, loop, playlistMood, combatActive,
    setIsPlaying, setVolume, stopPlayback, playTrack, toggleLoop, setPlaylistMood,
  } = useMusicStore();
  const { elapsed, duration, progress, seekTo, formatTime } = useMusicPlayer();

  const currentTrack = tracks.find((t) => t.id === currentTrackId) ?? null;
  const currentIndex = tracks.findIndex((t) => t.id === currentTrackId);
  const prevTrack = currentIndex > 0 ? tracks[currentIndex - 1] : null;
  const nextTrack = currentIndex < tracks.length - 1 ? tracks[currentIndex + 1] : null;

  const displayName = currentTrack ? currentTrack.customName || currentTrack.title : null;

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-6 shadow-xl">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-4">
        Now Playing
      </h2>

      {currentTrack ? (
        <div className="flex flex-col gap-4">
          {/* Title + playing indicator */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xl ${
                isPlaying ? 'bg-amber-700' : 'bg-stone-800'
              }`}
            >
              {isPlaying ? (
                <div className="flex gap-0.5 items-end h-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-amber-200 rounded-sm playing-pulse"
                      style={{ height: `${35 + i * 15}%`, animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              ) : (
                <span>🎵</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-parchment font-serif font-semibold truncate text-lg leading-tight">
                {displayName}
              </p>
              {currentTrack.customName !== currentTrack.title && (
                <p className="text-stone-500 text-xs font-sans truncate mt-0.5">
                  {currentTrack.title}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {currentTrack.section && (
                  <p className="text-amber-800 text-xs font-sans truncate">{currentTrack.section}</p>
                )}
                {combatActive && (
                  <span className="text-xs font-sans bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded-full">
                    ⚔️ combat
                  </span>
                )}
                {playlistMood && (
                  <button
                    onClick={() => setPlaylistMood(null)}
                    className="text-xs font-sans bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full hover:bg-amber-900/60 transition-colors"
                    title="Mood playlist on — auto-advances to another track of this mood. Click to turn off."
                  >
                    🔀 {playlistMood} ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar (clickable to seek) */}
          <div className="flex flex-col gap-1">
            <div
              className="w-full h-2 bg-stone-800 rounded-full cursor-pointer group relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekTo(((e.clientX - rect.left) / rect.width) * 100);
              }}
            >
              <div
                className="h-full bg-amber-600 rounded-full transition-none relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex justify-between font-sans tabular-nums">
              <span className="text-xs text-stone-500">{formatTime(elapsed)}</span>
              <span className="text-xs text-stone-600">{duration > 0 ? formatTime(duration) : '—'}</span>
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
            <button
              onClick={toggleLoop}
              title={loop ? 'Loop on — click to disable' : 'Loop off — click to enable'}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                loop
                  ? 'bg-amber-700/60 text-amber-300 border border-amber-600/50'
                  : 'bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-300'
              }`}
            >
              🔁
            </button>
          </div>

          {/* Volume */}
          <VolumeSlider value={volume} onChange={setVolume} label="Music volume" />
        </div>
      ) : (
        <div className="text-center py-8 text-stone-600">
          <p className="text-4xl mb-2">🎵</p>
          <p className="font-serif italic">No track selected</p>
          <p className="text-xs font-sans mt-1">Go to Music Library to pick a track</p>
        </div>
      )}
    </div>
  );
}
