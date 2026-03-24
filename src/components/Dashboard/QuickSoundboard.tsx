import { useSoundStore } from '../../store/soundStore';
import type { Sound } from '../../types';
import { useOneShotPlayer, formatTime } from '../../hooks/useOneShotPlayer';

function QuickShotButton({ sound }: { sound: Sound }) {
  const { setVolume } = useSoundStore();
  const { playing, progress, elapsed, duration, trigger, stop } =
    useOneShotPlayer(sound.url, sound.volume);

  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${
      playing ? 'border-amber-700/50 bg-amber-900/10' : 'border-stone-800 bg-stone-800/60 hover:border-stone-700'
    }`}>

      {/* Main trigger button */}
      <button
        onClick={playing ? stop : trigger}
        className="relative w-full flex items-center gap-3 px-3 py-3 group"
        title={playing ? 'Click to stop' : `Play: ${sound.name}`}
      >
        {/* Progress fill behind content */}
        {playing && (
          <div
            className="absolute inset-0 bg-amber-700/15 origin-left transition-none"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        )}

        {/* Emoji */}
        <span className={`relative z-10 text-2xl flex-shrink-0 transition-transform ${playing ? 'scale-110' : 'group-hover:scale-105'}`}>
          {sound.emoji}
        </span>

        {/* Name + time */}
        <div className="relative z-10 flex-1 min-w-0 text-left">
          <p className={`text-sm font-serif truncate leading-tight ${playing ? 'text-amber-300' : 'text-parchment'}`}>
            {sound.name}
          </p>
          <p className="text-xs font-sans tabular-nums text-stone-500 mt-0.5">
            {playing
              ? <span className="text-amber-600">{formatTime(elapsed)} / {formatTime(duration)}</span>
              : duration > 0 ? formatTime(duration) : '—'
            }
          </p>
        </div>

        {/* Play / Stop indicator */}
        <span className={`relative z-10 flex-shrink-0 text-xs transition-colors ${playing ? 'text-amber-500' : 'text-stone-600 group-hover:text-amber-600'}`}>
          {playing ? '⏹' : '▶'}
        </span>
      </button>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-stone-700/50">
        <div className="h-full bg-amber-600 transition-none" style={{ width: `${progress}%` }} />
      </div>

      {/* Volume slider — only shown while playing */}
      {playing && (
        <div className="px-3 py-2 border-t border-stone-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-600">🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={sound.volume}
              onChange={(e) => setVolume(sound.id, Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-stone-600 font-sans tabular-nums w-7 text-right">{sound.volume}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuickSoundboard() {
  const { sounds } = useSoundStore();
  const oneshots = sounds.filter((s) => s.type === 'oneshot');

  if (oneshots.length === 0) return null;

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-3">
        Quick SFX
      </h2>
      <div className="flex flex-col gap-2">
        {oneshots.map((s) => (
          <QuickShotButton key={s.id} sound={s} />
        ))}
      </div>
    </div>
  );
}
