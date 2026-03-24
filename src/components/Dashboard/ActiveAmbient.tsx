import { useSoundStore } from '../../store/soundStore';
import VolumeSlider from '../shared/VolumeSlider';

export default function ActiveAmbient() {
  const { sounds, toggleAmbient, setVolume } = useSoundStore();
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
          {ambientSounds.map((s) => (
            <div
              key={s.id}
              className={`rounded-lg p-3 border transition-all ${
                s.isActive
                  ? 'bg-amber-900/20 border-amber-700/40'
                  : 'bg-stone-800/50 border-stone-700/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => toggleAmbient(s.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                    s.isActive
                      ? 'bg-amber-700 shadow-lg shadow-amber-900/50'
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                  {s.emoji}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-serif truncate ${
                      s.isActive ? 'text-parchment' : 'text-stone-400'
                    }`}
                  >
                    {s.name}
                  </p>
                  {s.isActive && (
                    <p className="text-xs text-amber-600 font-sans playing-pulse">
                      ● looping
                    </p>
                  )}
                </div>
              </div>
              {s.isActive && (
                <VolumeSlider
                  value={s.volume}
                  onChange={(v) => setVolume(s.id, v)}
                  label={`${s.name} volume`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
