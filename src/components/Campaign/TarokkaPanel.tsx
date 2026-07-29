import { useCampaignStore } from '../../store/campaignStore';
import { TAROKKA_SLOTS } from '../../data/campaignState';

// The five cards decide where the artifacts are, who helps, and where Strahd
// waits — for the whole campaign. Easy to lose track of over a year of play.

export default function TarokkaPanel() {
  const { tarokka, setTarokkaSlot, resetTarokka } = useCampaignStore();

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-400">🃏 Tarokka Reading</h2>
          <p className="text-stone-500 text-xs font-sans mt-0.5">
            Madam Eva's five cards. Pre-filled with the reading Reloaded fixes in Arc C — edit
            freely if your table drew its own.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Reset all five cards to Reloaded's default reading?")) resetTarokka();
          }}
          className="text-xs font-sans text-stone-600 hover:text-amber-400 transition-colors flex-shrink-0"
        >
          reset to default
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {TAROKKA_SLOTS.map((slot) => {
          const state = tarokka[slot.id] ?? { card: '', resolved: '', done: false };
          return (
            <div
              key={slot.id}
              className={`rounded-xl border p-4 transition-colors ${
                state.done
                  ? 'bg-green-950/20 border-green-800/40'
                  : 'bg-stone-900 border-stone-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setTarokkaSlot(slot.id, { done: !state.done })}
                  className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 border text-xs flex items-center justify-center transition-colors ${
                    state.done
                      ? 'bg-green-800/70 border-green-600 text-green-100'
                      : 'bg-stone-800 border-stone-600 hover:border-amber-700'
                  }`}
                  title={state.done ? 'Resolved — click to un-tick' : 'Mark as found / met / learned'}
                >
                  {state.done ? '✓' : ''}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-amber-600 font-sans">
                    {slot.label}
                  </p>
                  <p className="text-stone-500 text-xs font-sans italic mt-0.5 mb-2">
                    “{slot.prompt}”
                  </p>

                  <input
                    type="text"
                    value={state.card}
                    onChange={(e) => setTarokkaSlot(slot.id, { card: e.target.value })}
                    placeholder="Card drawn"
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-sm font-serif text-parchment placeholder-stone-600 focus:outline-none focus:border-amber-700/60 mb-1.5"
                  />
                  <textarea
                    value={state.resolved}
                    onChange={(e) => setTarokkaSlot(slot.id, { resolved: e.target.value })}
                    placeholder="Where it is / who it is, in your words"
                    rows={2}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60 resize-y"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
