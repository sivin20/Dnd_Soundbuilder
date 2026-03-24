import { useSoundStore } from '../../store/soundStore';

export default function QuickSoundboard() {
  const { sounds, triggerOneShot } = useSoundStore();
  const oneshots = sounds.filter((s) => s.type === 'oneshot');

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
            onClick={() => triggerOneShot(s.id)}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-amber-800/50 transition-all active:scale-95 group"
            title={s.name}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">
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
