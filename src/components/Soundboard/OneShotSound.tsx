import type { Sound } from '../../types';
import { useSoundStore } from '../../store/soundStore';
import { useOneShotPlayer, formatTime } from '../../hooks/useOneShotPlayer';
import VolumeSlider from '../shared/VolumeSlider';

interface Props { sound: Sound; }

export default function OneShotSound({ sound }: Props) {
  const { setVolume } = useSoundStore();
  const { playing, progress, elapsed, duration, trigger, stop } =
    useOneShotPlayer(sound.url, sound.volume);

  return (
    <div className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl p-4 transition-all">

      {/* Trigger / stop button */}
      <button
        onClick={playing ? stop : trigger}
        className={`relative w-full h-16 rounded-lg mb-2 flex items-center justify-center text-3xl transition-all duration-150 overflow-hidden ${
          playing
            ? 'bg-amber-900/40 border border-amber-700/50 hover:bg-red-900/30 hover:border-red-700/50'
            : 'bg-stone-800 hover:bg-stone-700 active:bg-amber-800 active:scale-95'
        }`}
        title={playing ? 'Click to stop' : `Play: ${sound.name}`}
      >
        {playing && (
          <div
            className="absolute inset-0 bg-amber-700/20 origin-left transition-none"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        )}
        <span className="relative z-10">{playing ? '⏹' : sound.emoji}</span>
      </button>

      {/* Progress bar */}
      <div className="w-full h-1 bg-stone-800 rounded-full mb-1 overflow-hidden">
        <div className="h-full bg-amber-600 rounded-full transition-none" style={{ width: `${progress}%` }} />
      </div>

      {/* Time */}
      <div className="flex justify-between mb-2 font-sans tabular-nums">
        <span className="text-xs text-stone-500">{formatTime(elapsed)}</span>
        <span className="text-xs text-stone-600">{duration > 0 ? formatTime(duration) : '—'}</span>
      </div>

      <p className="text-parchment font-serif text-sm text-center truncate mb-2">{sound.name}</p>

      <VolumeSlider value={sound.volume} onChange={(v) => setVolume(sound.id, v)} label={`${sound.name} volume`} />
    </div>
  );
}
