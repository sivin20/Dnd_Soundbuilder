import { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { timeBand, formatClock } from '../../data/campaignState';

// Barovia runs on a clock: the horde attacks at dusk, Arabelle's nameday is in
// two days, the wine delivery is overdue. Reloaded sets hard deadlines and
// nothing in the app tracked them.

const DUSK_MINUTES = 18 * 60;
const DAWN_MINUTES = 7 * 60;

export default function BarovianClock() {
  const { time, deadlines, advanceTime, setTimeOfDay, setDay, longRest, addDeadline, updateDeadline, deleteDeadline } =
    useCampaignStore();

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [inDays, setInDays] = useState('2');

  const band = timeBand(time.minutes);
  const pending = deadlines.filter((d) => !d.done);

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const offset = Number(inDays);
    addDeadline(trimmed, time.day + (Number.isFinite(offset) ? offset : 0));
    setLabel('');
    setInDays('2');
    setAdding(false);
  };

  const dueLabel = (dueDay: number) => {
    const diff = dueDay - time.day;
    if (diff < 0) return { text: `${-diff}d overdue`, tone: 'text-red-400' };
    if (diff === 0) return { text: 'today', tone: 'text-amber-300' };
    if (diff === 1) return { text: 'tomorrow', tone: 'text-amber-500' };
    return { text: `in ${diff}d`, tone: 'text-stone-500' };
  };

  return (
    <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-amber-600 font-sans">
          {band.icon} Barovian Clock
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-sans bg-stone-800 hover:bg-stone-700 text-amber-500 px-2.5 py-1 rounded-full border border-stone-700 transition-colors"
            title="Track something that comes due on a specific day"
          >
            + Deadline
          </button>
        )}
      </div>

      {/* Clock face */}
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-2xl font-serif text-parchment tabular-nums">
          {formatClock(time.minutes)}
        </span>
        <span className={`text-sm font-sans ${band.dangerous ? 'text-red-400' : 'text-stone-400'}`}>
          {band.label}
          {band.dangerous && <span className="ml-1" title="Strahd's hours">🩸</span>}
        </span>
        <span className="text-xs font-sans text-stone-600 ml-auto">
          Day
          <input
            type="number"
            min={1}
            value={time.day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-14 ml-1 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-stone-300 tabular-nums focus:outline-none focus:border-amber-700/60"
          />
        </span>
      </div>

      {/* Time controls */}
      <div className="flex flex-wrap gap-1 mb-3">
        {[
          { label: '+10m', fn: () => advanceTime(10) },
          { label: '+1h', fn: () => advanceTime(60) },
          { label: '+4h', fn: () => advanceTime(240) },
          { label: '🌆 dusk', fn: () => setTimeOfDay(DUSK_MINUTES, time.minutes >= DUSK_MINUTES) },
          { label: '🌅 dawn', fn: () => setTimeOfDay(DAWN_MINUTES, time.minutes >= DAWN_MINUTES) },
          { label: '🛏 long rest', fn: longRest },
        ].map((control) => (
          <button
            key={control.label}
            onClick={control.fn}
            className="text-xs font-sans bg-stone-800 hover:bg-stone-700 text-stone-300 px-2 py-1 rounded border border-stone-700 transition-colors"
          >
            {control.label}
          </button>
        ))}
      </div>

      {adding && (
        <div className="mb-3 bg-stone-800/70 border border-amber-800/40 rounded-lg p-3 flex gap-2">
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setAdding(false); setLabel(''); }
            }}
            placeholder="e.g. Arabelle's nameday — toy by noon"
            className="flex-1 min-w-0 bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60"
          />
          <input
            type="number"
            value={inDays}
            onChange={(e) => setInDays(e.target.value)}
            className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300 font-sans tabular-nums focus:outline-none focus:border-amber-700/60"
            title="Days from today"
          />
          <button
            onClick={submit}
            disabled={!label.trim()}
            className="text-xs font-sans bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-amber-100 px-3 rounded transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setAdding(false); setLabel(''); }}
            className="text-xs font-sans text-stone-500 hover:text-stone-300 px-1 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Deadlines */}
      {pending.length === 0 ? (
        <p className="text-stone-600 text-xs font-sans italic">
          No deadlines pending.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {pending.map((d) => {
            const due = dueLabel(d.dueDay);
            return (
              <div key={d.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => updateDeadline(d.id, { done: true })}
                  className="w-4 h-4 rounded border border-stone-600 hover:border-amber-600 flex-shrink-0 transition-colors"
                  title="Mark as resolved"
                />
                <span className="text-sm font-sans text-stone-300 truncate flex-1 min-w-0">
                  {d.label}
                </span>
                <span className={`text-xs font-sans flex-shrink-0 ${due.tone}`}>{due.text}</span>
                <button
                  onClick={() => deleteDeadline(d.id)}
                  className="text-stone-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
