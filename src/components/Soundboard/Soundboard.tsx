import { useState } from 'react';
import { useSoundStore } from '../../store/soundStore';
import AmbientSound from './AmbientSound';
import OneShotSound from './OneShotSound';
import type { SoundType } from '../../types';

export default function Soundboard() {
  const { sounds, stopAllAmbient } = useSoundStore();
  const [activeTab, setActiveTab] = useState<SoundType>('ambient');

  const ambientSounds = sounds.filter((s) => s.type === 'ambient');
  const oneshotSounds = sounds.filter((s) => s.type === 'oneshot');
  const activeAmbientCount = ambientSounds.filter((s) => s.isActive).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-amber-400 text-glow">
            Soundboard
          </h1>
          <p className="text-stone-500 font-sans text-sm mt-1">
            Ambient loops and one-shot sound effects
          </p>
        </div>
        {activeAmbientCount > 0 && (
          <button
            onClick={stopAllAmbient}
            className="px-4 py-2 bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 text-red-400 rounded-lg text-sm font-sans transition-all"
          >
            ⏹ Stop All Ambient
          </button>
        )}
      </div>

      {/* How to add sounds */}
      <div className="mb-5 bg-stone-900 border border-stone-800 rounded-xl px-5 py-4 text-stone-500 font-sans text-xs leading-relaxed">
        <span className="text-amber-600 font-medium">Adding sounds: </span>
        Drop an <code className="bg-stone-800 px-1 rounded text-stone-400">.mp3</code> into{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">public/sounds/</code> (one-shots) or{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">public/ambience/</code> (loops) — it
        appears here automatically on next dev-server restart. Edit{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">soundsConfig.json</code> /{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">ambienceConfig.json</code> in{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">src/data/</code> to set its name, emoji,
        intensity <code className="bg-stone-800 px-1 rounded text-stone-400">levels</code> and{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">sprinkles</code>. For the curated set,
        add to <code className="bg-stone-800 px-1 rounded text-stone-400">sound-sources.json</code> and run{' '}
        <code className="bg-stone-800 px-1 rounded text-stone-400">./download-sounds.sh</code>.
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 mb-5">
        <button
          onClick={() => setActiveTab('ambient')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-sans flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ambient'
              ? 'bg-amber-800/50 text-amber-300 border border-amber-700/40'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          🔁 Ambient Loops
          {ambientSounds.length > 0 && (
            <span className="bg-stone-700 text-stone-300 text-xs px-1.5 py-0.5 rounded-full">
              {ambientSounds.length}
            </span>
          )}
          {activeAmbientCount > 0 && (
            <span className="bg-amber-700/60 text-amber-300 text-xs px-1.5 py-0.5 rounded-full">
              {activeAmbientCount} on
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('oneshot')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-sans flex items-center justify-center gap-2 transition-all ${
            activeTab === 'oneshot'
              ? 'bg-amber-800/50 text-amber-300 border border-amber-700/40'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          ▶ One-Shot SFX
          {oneshotSounds.length > 0 && (
            <span className="bg-stone-700 text-stone-300 text-xs px-1.5 py-0.5 rounded-full">
              {oneshotSounds.length}
            </span>
          )}
        </button>
      </div>

      {/* Ambient tab */}
      {activeTab === 'ambient' && (
        ambientSounds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ambientSounds.map((s) => <AmbientSound key={s.id} sound={s} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-stone-600">
            <p className="text-5xl mb-3">🌬️</p>
            <p className="font-serif italic text-lg">No ambient sounds configured</p>
            <p className="text-sm font-sans mt-2">
              Add an <code className="bg-stone-900 px-1 rounded">.mp3</code> to{' '}
              <code className="bg-stone-900 px-1 rounded">public/sounds/</code> and set{' '}
              <code className="bg-stone-900 px-1 rounded">"type": "ambient"</code> in soundsConfig.json
            </p>
          </div>
        )
      )}

      {/* One-shot tab */}
      {activeTab === 'oneshot' && (
        oneshotSounds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {oneshotSounds.map((s) => <OneShotSound key={s.id} sound={s} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-stone-600">
            <p className="text-5xl mb-3">🎭</p>
            <p className="font-serif italic text-lg">No one-shot sounds configured</p>
            <p className="text-sm font-sans mt-2">
              Add an <code className="bg-stone-900 px-1 rounded">.mp3</code> to{' '}
              <code className="bg-stone-900 px-1 rounded">public/sounds/</code> — new files default to oneshot
            </p>
          </div>
        )
      )}
    </div>
  );
}
