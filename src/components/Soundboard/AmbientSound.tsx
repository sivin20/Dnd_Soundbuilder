import type { Sound } from '../../types';
import { useSoundStore } from '../../store/soundStore';
import VolumeSlider from '../shared/VolumeSlider';

interface Props { sound: Sound; }

const LEVEL_LABELS = ['I', 'II', 'III'];
const LEVEL_TITLES = ['Gentle', 'Moderate', 'Intense'];

export default function AmbientSound({ sound }: Props) {
  const { toggleAmbient, setAmbientLevel, setVolume } = useSoundStore();

  const numLevels    = sound.levels?.length ?? 1;
  const currentLevel = sound.currentLevel ?? 0;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      sound.isActive
        ? 'bg-amber-900/20 border-amber-700/50 shadow-lg shadow-amber-900/10'
        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
    }`}>

      {/* Toggle icon + inline level buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => toggleAmbient(sound.id)}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all flex-shrink-0 ${
            sound.isActive
              ? 'bg-amber-700 shadow-md shadow-amber-900/50 scale-105'
              : 'bg-stone-800 hover:bg-stone-700'
          }`}
          title={sound.isActive ? 'Fade out & stop' : 'Start looping'}
        >
          {sound.emoji}
        </button>

        {/* Level buttons — always 3, disabled if no URL at that index */}
        <div className="flex gap-1 flex-1">
          {LEVEL_LABELS.map((label, i) => {
            const hasLevel = i < numLevels;
            const isSelected = hasLevel && currentLevel === i;
            return (
              <button
                key={i}
                onClick={() => { if (hasLevel) setAmbientLevel(sound.id, i); }}
                disabled={!hasLevel}
                title={hasLevel ? (LEVEL_TITLES[i] ?? `Level ${i + 1}`) : 'Not available'}
                className={`flex-1 h-10 rounded-md text-xs font-sans transition-all ${
                  !hasLevel
                    ? 'bg-stone-800 text-stone-700 cursor-not-allowed opacity-40'
                    : isSelected
                      ? 'bg-amber-700 text-amber-100 shadow-sm'
                      : 'bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-300'
                }`}
              >
                {label}
                <span className="ml-1 opacity-60">{'·'.repeat(i + 1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name + status */}
      <p className={`font-serif font-semibold truncate mb-0.5 ${sound.isActive ? 'text-amber-300' : 'text-parchment'}`}>
        {sound.name}
      </p>
      {sound.isActive
        ? <p className="text-xs text-amber-600/80 font-sans playing-pulse mb-3">● looping</p>
        : <p className="text-xs text-stone-600 font-sans mb-3">🔁 loops automatically</p>
      }

      <VolumeSlider value={sound.volume} onChange={(v) => setVolume(sound.id, v)} label={`${sound.name} volume`} />
    </div>
  );
}
