import { useSoundStore } from '../../store/soundStore';
import VolumeSlider from '../shared/VolumeSlider';

const LEVEL_LABELS = ['I', 'II', 'III'];
const LEVEL_TITLES = ['Gentle', 'Moderate', 'Intense'];

export default function ActiveAmbient() {
  const { sounds, toggleAmbient, setAmbientLevel, setVolume } = useSoundStore();
  const ambientSounds = sounds.filter((s) => s.type === 'ambient');
  const activeAmbient = ambientSounds.filter((s) => s.isActive);

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans">
          Ambient Layers
        </h2>
        {activeAmbient.length > 0 && (
          <span className="text-xs font-sans bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full">
            {activeAmbient.length} active
          </span>
        )}
      </div>

      {ambientSounds.length === 0 ? (
        <div className="text-center py-6 text-stone-600">
          <p className="text-3xl mb-2">🌬️</p>
          <p className="font-serif italic text-sm">No ambient sounds yet</p>
          <p className="text-xs font-sans mt-1">Add them in the Soundboard</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ambientSounds.map((s) => {
            const numLevels    = s.levels?.length ?? 1;
            const currentLevel = s.currentLevel ?? 0;

            return (
              <div
                key={s.id}
                className={`rounded-lg p-3 border transition-all ${
                  s.isActive
                    ? 'bg-amber-900/20 border-amber-700/40'
                    : 'bg-stone-800/50 border-stone-700/40'
                }`}
              >
                {/* Toggle icon + inline level buttons */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleAmbient(s.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all flex-shrink-0 ${
                      s.isActive
                        ? 'bg-amber-700 shadow-lg shadow-amber-900/50'
                        : 'bg-stone-700 hover:bg-stone-600'
                    }`}
                    title={s.isActive ? 'Fade out & stop' : 'Start looping'}
                  >
                    {s.emoji}
                  </button>

                  {/* Level buttons */}
                  <div className="flex gap-1 flex-1">
                    {LEVEL_LABELS.map((label, i) => {
                      const hasLevel = i < numLevels;
                      const isSelected = hasLevel && currentLevel === i;
                      return (
                        <button
                          key={i}
                          onClick={() => { if (hasLevel) setAmbientLevel(s.id, i); }}
                          disabled={!hasLevel}
                          title={hasLevel ? (LEVEL_TITLES[i] ?? `Level ${i + 1}`) : 'Not available'}
                          className={`flex-1 h-8 rounded text-xs font-sans transition-all ${
                            !hasLevel
                              ? 'bg-stone-700 text-stone-600 cursor-not-allowed opacity-40'
                              : isSelected
                                ? 'bg-amber-700 text-amber-100'
                                : 'bg-stone-700 text-stone-500 hover:bg-stone-600 hover:text-stone-300'
                          }`}
                        >
                          {label}
                          <span className="ml-1 opacity-50">{'·'.repeat(i + 1)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name + status */}
                <p className={`text-sm font-serif truncate mb-0.5 ${s.isActive ? 'text-parchment' : 'text-stone-400'}`}>
                  {s.name}
                </p>
                {s.isActive
                  ? <p className="text-xs text-amber-600 font-sans playing-pulse mb-2">● looping</p>
                  : <p className="text-xs text-stone-600 font-sans mb-2">🔁 loops automatically</p>
                }

                <VolumeSlider
                  value={s.volume}
                  onChange={(v) => setVolume(s.id, v)}
                  label={`${s.name} volume`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
