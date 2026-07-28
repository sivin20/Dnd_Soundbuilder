import { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { CAMPAIGN_ARCS } from '../../data/campaignArcs';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SessionLog() {
  const { sessions, addSession, updateSession, deleteSession } = useCampaignStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [arcId, setArcId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const arcLabel = (id: string | null) => {
    const arc = CAMPAIGN_ARCS.find((a) => a.id === id);
    return arc ? `Arc ${arc.code} — ${arc.title}` : null;
  };

  const submit = () => {
    if (!title.trim() && !notes.trim()) return;
    addSession({
      title: title.trim() || `Session ${sessions.length + 1}`,
      date,
      notes,
      arcId: arcId || null,
    });
    setTitle(''); setNotes(''); setArcId(''); setDate(today()); setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-400">Session Log</h2>
          <p className="text-stone-500 text-xs font-sans mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm font-sans bg-amber-700 hover:bg-amber-600 text-amber-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            + New session
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-stone-800/70 border border-amber-800/40 rounded-xl p-4 mb-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title, e.g. The dinner invitation"
              className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 font-sans focus:outline-none focus:border-amber-700/60"
            />
          </div>
          <select
            value={arcId}
            onChange={(e) => setArcId(e.target.value)}
            className="bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 font-sans focus:outline-none focus:border-amber-700/60"
          >
            <option value="">No specific arc</option>
            {CAMPAIGN_ARCS.map((a) => (
              <option key={a.id} value={a.id}>Arc {a.code} — {a.title}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened? Cliffhangers, NPC promises, loot, next-session prep…"
            rows={5}
            className="bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60 resize-y"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="text-xs font-sans text-stone-500 hover:text-stone-300 px-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="text-sm font-sans bg-amber-700 hover:bg-amber-600 text-amber-100 px-4 py-1.5 rounded-lg transition-colors"
            >
              Save session
            </button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !adding ? (
        <div className="text-center py-12 text-stone-600">
          <p className="text-4xl mb-2">📜</p>
          <p className="font-serif italic">No sessions logged yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div key={s.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-parchment font-serif font-semibold">{s.title}</span>
                  <span className="text-stone-600 text-xs font-sans ml-2">{s.date}</span>
                  {arcLabel(s.arcId) && (
                    <span className="text-amber-700 text-xs font-sans ml-2">{arcLabel(s.arcId)}</span>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm(`Delete session "${s.title}"?`)) deleteSession(s.id); }}
                  className="text-stone-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Delete session"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={s.notes}
                onChange={(e) => updateSession(s.id, { notes: e.target.value })}
                rows={Math.min(10, Math.max(2, s.notes.split('\n').length))}
                className="w-full bg-transparent text-sm text-stone-300 font-sans focus:outline-none focus:bg-stone-800/50 rounded p-1 -m-1 resize-y"
                placeholder="Notes…"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
