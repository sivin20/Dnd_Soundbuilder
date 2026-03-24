import { useState } from 'react';
import { useSoundStore } from '../../store/soundStore';

export default function QuickSoundboard() {
  const { sounds, triggerOneShot } = useSoundStore();
  const oneshots = sounds.filter((s) => s.type === 'oneshot');
  const [firingId, setFiringId] = useState<string | null>(null);

  const handleFire = (id: string) => {
    triggerOneShot(id);
    setFiringId(id);
    setTimeout(() => setFiringId(null), 400);
  };

  if (oneshots.length === 0) return null;

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-6 shadow-xl">
      <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-4">
        Quick SFX
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {oneshots.map((s) => (
          <button
            key={s.id}
            onClick={() => handleFire(s.id)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all active:scale-95 group ${
              firingId === s.id
                ? 'bg-amber-800/40 border-amber-700/60 scale-95'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700 hover:border-amber-800/50'
            }`}
            title={s.name}
          >
            <span className={`text-2xl transition-transform ${firingId === s.id ? 'scale-125' : 'group-hover:scale-110'}`}>
              {s.emoji}
            </span>
            <span className="text-xs font-sans text-stone-400 group-hover:text-stone-200 truncate w-full text-center">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
