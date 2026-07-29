import { useCampaignStore } from '../../store/campaignStore';
import { FLAG_GROUPS } from '../../data/campaignState';
import type { FlagDef } from '../../data/campaignState';

// State that spans the whole campaign and that later arcs keep asking about:
// which fanes are reconsecrated, which artifacts are recovered, what happened
// to Ireena. None of it is derivable from the guide — it's what your table did.

function ToggleFlag({ flag }: { flag: FlagDef }) {
  const value = useCampaignStore((s) => s.flags[flag.id]);
  const setFlag = useCampaignStore((s) => s.setFlag);
  const on = value === true;

  return (
    <button
      onClick={() => setFlag(flag.id, !on)}
      className="flex items-start gap-2.5 text-left group py-1"
      title={flag.hint}
    >
      <span
        className={`w-5 h-5 rounded flex-shrink-0 border text-xs flex items-center justify-center transition-colors ${
          on
            ? 'bg-amber-700 border-amber-500 text-amber-100'
            : 'bg-stone-800 border-stone-600 group-hover:border-amber-700'
        }`}
      >
        {on ? '✓' : ''}
      </span>
      <span
        className={`text-sm font-sans leading-snug ${on ? 'text-amber-200' : 'text-stone-400 group-hover:text-stone-200'}`}
      >
        {flag.label}
      </span>
    </button>
  );
}

function ChoiceFlag({ flag }: { flag: FlagDef }) {
  const value = useCampaignStore((s) => s.flags[flag.id]);
  const setFlag = useCampaignStore((s) => s.setFlag);
  const current = typeof value === 'string' ? value : '';

  return (
    <div className="py-1">
      <p className="text-sm font-sans text-stone-400 mb-1">{flag.label}</p>
      <div className="flex flex-wrap gap-1">
        {(flag.options ?? []).map((option) => {
          const active = current === option;
          return (
            <button
              key={option}
              onClick={() => setFlag(flag.id, active ? '' : option)}
              className={`text-xs font-sans px-2 py-1 rounded-full border transition-colors ${
                active
                  ? 'bg-amber-700/50 border-amber-600/60 text-amber-200'
                  : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-amber-800/50 hover:text-stone-300'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FlagsPanel() {
  return (
    <div>
      <h2 className="text-xl font-serif font-bold text-amber-400 mb-1">🏴 Campaign Flags</h2>
      <p className="text-stone-500 text-xs font-sans mb-4">
        The decisions and discoveries that later arcs keep asking about.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FLAG_GROUPS.map((group) => (
          <div key={group.id} className="bg-stone-900 border border-amber-900/30 rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-amber-600 font-sans mb-1">
              {group.icon} {group.label}
            </h3>
            {group.blurb && (
              <p className="text-stone-600 text-xs font-sans italic mb-2">{group.blurb}</p>
            )}
            <div className="flex flex-col">
              {group.flags.map((flag) =>
                flag.kind === 'choice' ? (
                  <ChoiceFlag key={flag.id} flag={flag} />
                ) : (
                  <ToggleFlag key={flag.id} flag={flag} />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
