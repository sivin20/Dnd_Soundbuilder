import { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { CAMPAIGN_ARCS } from '../../data/campaignArcs';
import type { SessionNote } from '../../types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The free-text continuity fields, all of which are plain strings. */
type ContinuityKey = 'cliffhanger' | 'promises' | 'npcsMet' | 'loot';

const EXTRA_FIELDS: { key: ContinuityKey; label: string; placeholder: string; rows: number }[] = [
  { key: 'cliffhanger', label: 'Where you left them', placeholder: 'The cliffhanger — shown on the dashboard next session', rows: 2 },
  { key: 'promises', label: 'Promises & threads', placeholder: 'What the party or an NPC swore to do — the stuff that gets forgotten', rows: 2 },
  { key: 'npcsMet', label: 'NPCs met', placeholder: 'Ismark, Muriel…', rows: 1 },
  { key: 'loot', label: 'Loot & rewards', placeholder: 'Items, gold, favours', rows: 1 },
];

/** "Previously on…" text you can read aloud to open the next session. */
function buildRecap(session: SessionNote, arcTitle: string | null): string {
  const lines = [`Previously — ${session.title}${arcTitle ? ` (${arcTitle})` : ''}`];
  if (session.notes.trim()) lines.push('', session.notes.trim());
  if (session.npcsMet.trim()) lines.push('', `Met: ${session.npcsMet.trim()}`);
  if (session.loot.trim()) lines.push('', `Gained: ${session.loot.trim()}`);
  if (session.promises.trim()) lines.push('', `Owed / promised: ${session.promises.trim()}`);
  if (session.cliffhanger.trim()) lines.push('', `We left off: ${session.cliffhanger.trim()}`);
  return lines.join('\n');
}

export default function SessionLog() {
  const { sessions, addSession, updateSession, deleteSession } = useCampaignStore();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<SessionNote, 'id'>>(() => ({
    title: '', date: today(), notes: '', arcId: null,
    cliffhanger: '', promises: '', loot: '', npcsMet: '',
  }));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const arcLabel = (id: string | null) => {
    const arc = CAMPAIGN_ARCS.find((a) => a.id === id);
    return arc ? `Arc ${arc.code} — ${arc.title}` : null;
  };

  const resetDraft = () =>
    setDraft({
      title: '', date: today(), notes: '', arcId: null,
      cliffhanger: '', promises: '', loot: '', npcsMet: '',
    });

  const submit = () => {
    if (!draft.title.trim() && !draft.notes.trim()) return;
    addSession({ ...draft, title: draft.title.trim() || `Session ${sessions.length + 1}` });
    resetDraft();
    setAdding(false);
  };

  const copyRecap = async (session: SessionNote) => {
    try {
      await navigator.clipboard.writeText(buildRecap(session, arcLabel(session.arcId)));
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
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
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Session title, e.g. The dinner invitation"
              className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60"
            />
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 font-sans focus:outline-none focus:border-amber-700/60"
            />
          </div>
          <select
            value={draft.arcId ?? ''}
            onChange={(e) => setDraft({ ...draft, arcId: e.target.value || null })}
            className="bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 font-sans focus:outline-none focus:border-amber-700/60"
          >
            <option value="">No specific arc</option>
            {CAMPAIGN_ARCS.map((a) => (
              <option key={a.id} value={a.id}>Arc {a.code} — {a.title}</option>
            ))}
          </select>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="What happened?"
            rows={4}
            className="bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60 resize-y"
          />

          {EXTRA_FIELDS.map((field) => (
            <div key={field.key}>
              <p className="text-[11px] uppercase tracking-widest text-amber-700 font-sans mb-1">
                {field.label}
              </p>
              <textarea
                value={draft[field.key] as string}
                onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                rows={field.rows}
                className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-stone-300 placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60 resize-y"
              />
            </div>
          ))}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); resetDraft(); }}
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
          {sessions.map((s) => {
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 group">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="text-parchment font-serif font-semibold">{s.title}</span>
                    <span className="text-stone-600 text-xs font-sans ml-2">{s.date}</span>
                    {arcLabel(s.arcId) && (
                      <span className="text-amber-700 text-xs font-sans ml-2">{arcLabel(s.arcId)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyRecap(s)}
                      className="text-xs font-sans text-stone-600 hover:text-amber-400 transition-colors"
                      title="Copy a 'Previously on…' recap to the clipboard"
                    >
                      {copiedId === s.id ? '✓ copied' : '📋 recap'}
                    </button>
                    <button
                      onClick={() => setExpandedId(expanded ? null : s.id)}
                      className="text-xs font-sans text-stone-600 hover:text-amber-400 transition-colors"
                    >
                      {expanded ? '▾ less' : '▸ more'}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete session "${s.title}"?`)) deleteSession(s.id); }}
                      className="text-stone-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete session"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <textarea
                  value={s.notes}
                  onChange={(e) => updateSession(s.id, { notes: e.target.value })}
                  rows={Math.min(10, Math.max(2, s.notes.split('\n').length))}
                  className="w-full bg-transparent text-sm text-stone-300 font-sans focus:outline-none focus:bg-stone-800/50 rounded p-1 -m-1 resize-y"
                  placeholder="Notes…"
                />

                {/* Continuity fields — collapsed unless they hold something */}
                {(expanded || EXTRA_FIELDS.some((f) => (s[f.key] as string)?.trim())) && (
                  <div className="mt-3 pt-3 border-t border-stone-800 flex flex-col gap-2">
                    {EXTRA_FIELDS.filter((f) => expanded || (s[f.key] as string)?.trim()).map((field) => (
                      <div key={field.key}>
                        <p className="text-[11px] uppercase tracking-widest text-amber-700/80 font-sans mb-0.5">
                          {field.label}
                        </p>
                        <textarea
                          value={(s[field.key] as string) ?? ''}
                          onChange={(e) => updateSession(s.id, { [field.key]: e.target.value })}
                          rows={field.rows}
                          placeholder={field.placeholder}
                          className="w-full bg-transparent text-sm text-stone-300 font-sans focus:outline-none focus:bg-stone-800/50 rounded p-1 -m-1 resize-y placeholder-stone-700"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
