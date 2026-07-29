import { useMemo, useState } from 'react';
import { CAMPAIGN_ARCS, ACTS, REFERENCE_PAGES, findArcByMdPath } from '../../data/campaignArcs';
import { useCueStore } from '../../store/cueStore';
import type { ArcDef } from '../../data/campaignArcs';
import { useCampaignStore, getArcState } from '../../store/campaignStore';
import type { ArcStatus } from '../../types';
import GuideContent from './GuideContent';
import ArcMusicPlan from './ArcMusicPlan';
import SessionLog from './SessionLog';

type Selection =
  | { kind: 'arc'; arcId: string; anchor?: string }
  | { kind: 'page'; mdPath: string; title: string; anchor?: string }
  | { kind: 'sessions' };

interface Props {
  /** Page to open on mount — used when jumping in from the NPC directory. */
  initialPage?: { mdPath: string; anchor?: string } | null;
}

type ArcTab = 'guide' | 'notes' | 'music';

const STATUS_META: Record<ArcStatus, { dot: string; label: string }> = {
  todo:   { dot: 'bg-stone-600',  label: 'Not started' },
  active: { dot: 'bg-amber-500',  label: 'In progress' },
  done:   { dot: 'bg-green-700',  label: 'Completed' },
};

export default function CampaignView({ initialPage = null }: Props) {
  const campaign = useCampaignStore();
  const { currentArcId } = campaign;

  const [selection, setSelection] = useState<Selection>(() => {
    if (initialPage) {
      const arc = findArcByMdPath(initialPage.mdPath);
      if (arc) return { kind: 'arc', arcId: arc.id, anchor: initialPage.anchor };
      const title = initialPage.mdPath.split('/').pop()!.replace(/\.md$/, '');
      return { kind: 'page', mdPath: initialPage.mdPath, title, anchor: initialPage.anchor };
    }
    return currentArcId
      ? { kind: 'arc', arcId: currentArcId }
      : { kind: 'arc', arcId: CAMPAIGN_ARCS[0].id };
  });
  const [arcTab, setArcTab] = useState<ArcTab>('guide');
  const [refsOpen, setRefsOpen] = useState(false);
  // Bumped on every navigation so jumping twice to the same anchor re-scrolls
  const [navSeq, setNavSeq] = useState(0);

  // How many scene cues are prepped per guide page — a prep-progress hint
  const cues = useCueStore((s) => s.cues);
  const cueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of Object.values(cues)) {
      counts.set(c.mdPath, (counts.get(c.mdPath) ?? 0) + 1);
    }
    return counts;
  }, [cues]);

  const selectedArc: ArcDef | null =
    selection.kind === 'arc'
      ? CAMPAIGN_ARCS.find((a) => a.id === selection.arcId) ?? null
      : null;

  // Wikilink navigation: arcs open as arcs, everything else as a reference page
  const navigateToPage = (mdPath: string, anchor?: string) => {
    setNavSeq((n) => n + 1);
    const arc = findArcByMdPath(mdPath);
    if (arc) {
      setSelection({ kind: 'arc', arcId: arc.id, anchor });
      setArcTab('guide');
    } else {
      const title = mdPath.split('/').pop()!.replace(/\.md$/, '');
      setSelection({ kind: 'page', mdPath, title, anchor });
    }
  };

  return (
    <div className="flex h-full max-w-7xl mx-auto">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-stone-800 overflow-y-auto p-4">
        <h1 className="text-lg font-serif font-bold text-amber-400 text-glow mb-1">Campaign</h1>
        <p className="text-stone-600 text-xs font-sans mb-4">Curse of Strahd: Reloaded</p>

        {ACTS.map((act) => (
          <div key={act} className="mb-4">
            <h2 className="text-[11px] uppercase tracking-widest text-stone-500 font-sans mb-1.5">
              {act}
            </h2>
            <div className="flex flex-col">
              {CAMPAIGN_ARCS.filter((a) => a.act === act).map((a) => {
                const st = getArcState(campaign, a.id);
                const isSelected = selection.kind === 'arc' && selection.arcId === a.id;
                const isCurrent = currentArcId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSelection({ kind: 'arc', arcId: a.id }); }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-amber-900/30' : 'hover:bg-stone-800/70'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_META[st.status].dot} ${
                        isCurrent ? 'ring-2 ring-amber-500/50' : ''
                      }`}
                      title={STATUS_META[st.status].label}
                    />
                    <span className={`text-xs font-sans w-4 flex-shrink-0 ${isSelected ? 'text-amber-500' : 'text-stone-600'}`}>
                      {a.code}
                    </span>
                    <span className={`text-sm font-serif truncate ${isSelected ? 'text-amber-300' : 'text-stone-300'}`}>
                      {a.title}
                    </span>
                    {cueCounts.has(a.mdPath) && (
                      <span
                        className="text-[10px] font-sans text-amber-700 flex-shrink-0"
                        title={`${cueCounts.get(a.mdPath)} scene cue(s) prepped`}
                      >
                        ▶{cueCounts.get(a.mdPath)}
                      </span>
                    )}
                    {isCurrent && <span className="text-[10px] flex-shrink-0" title="You are here">📍</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Reference pages */}
        <div className="mb-4">
          <button
            onClick={() => setRefsOpen(!refsOpen)}
            className="text-[11px] uppercase tracking-widest text-stone-500 font-sans mb-1.5 hover:text-stone-300 transition-colors"
          >
            {refsOpen ? '▾' : '▸'} Reference
          </button>
          {refsOpen && (
            <div className="flex flex-col">
              {REFERENCE_PAGES.map((p) => {
                const isSelected = selection.kind === 'page' && selection.mdPath === p.mdPath;
                return (
                  <button
                    key={p.mdPath}
                    onClick={() => setSelection({ kind: 'page', mdPath: p.mdPath, title: p.title })}
                    className={`px-2 py-1 rounded-lg text-left text-sm font-serif truncate transition-colors ${
                      isSelected ? 'bg-amber-900/30 text-amber-300' : 'text-stone-400 hover:bg-stone-800/70'
                    }`}
                    title={`${p.group} — ${p.title}`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setSelection({ kind: 'sessions' })}
          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left font-serif text-sm transition-colors ${
            selection.kind === 'sessions'
              ? 'bg-amber-900/30 text-amber-300'
              : 'text-stone-300 hover:bg-stone-800/70'
          }`}
        >
          📜 Session Log
          {campaign.sessions.length > 0 && (
            <span className="text-xs text-stone-600 font-sans">{campaign.sessions.length}</span>
          )}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {selection.kind === 'sessions' && <SessionLog />}

        {selection.kind === 'page' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-serif font-bold text-amber-400">{selection.title}</h1>
              <a
                href={`https://www.strahdreloaded.com/${selection.mdPath.replace(/\.md$/, '').split('/').map(encodeURIComponent).join('/')}`}
                target="_blank" rel="noopener"
                className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors"
              >
                Open on strahdreloaded.com ↗
              </a>
            </div>
            <GuideContent
              key={selection.mdPath}
              mdPath={selection.mdPath}
              onNavigate={navigateToPage}
              anchor={selection.anchor}
              navSeq={navSeq}
            />
          </div>
        )}

        {selectedArc && (
          <ArcDetail
            arc={selectedArc}
            tab={arcTab}
            onTabChange={setArcTab}
            onNavigate={navigateToPage}
            anchor={selection.kind === 'arc' ? selection.anchor : undefined}
            navSeq={navSeq}
          />
        )}
      </div>
    </div>
  );
}

function ArcDetail({
  arc, tab, onTabChange, onNavigate, anchor, navSeq,
}: {
  arc: ArcDef;
  tab: ArcTab;
  onTabChange: (t: ArcTab) => void;
  onNavigate: (mdPath: string, anchor?: string) => void;
  anchor?: string;
  navSeq: number;
}) {
  const campaign = useCampaignStore();
  const st = getArcState(campaign, arc.id);
  const isCurrent = campaign.currentArcId === arc.id;

  const TABS: { id: ArcTab; label: string }[] = [
    { id: 'guide', label: '📖 Guide' },
    { id: 'notes', label: '📝 Notes' },
    { id: 'music', label: '🎵 Music' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
              {arc.act}{arc.levels && <span className="ml-2 text-stone-600">· levels ~{arc.levels}</span>}
            </p>
            <h1 className="text-2xl font-serif font-bold text-amber-400 text-glow mt-0.5">
              Arc {arc.code}: {arc.title}
            </h1>
            <p className="text-stone-400 text-sm font-sans mt-1">{arc.summary}</p>
          </div>
          <a
            href={arc.url}
            target="_blank" rel="noopener"
            className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors flex-shrink-0 mt-1"
          >
            strahdreloaded.com ↗
          </a>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2 mt-3">
          {!isCurrent ? (
            <button
              onClick={() => campaign.enterArc(arc.id)}
              className="text-sm font-sans bg-amber-700 hover:bg-amber-600 text-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              title="Mark as where the party is now — also arms the Combat! button with a fitting track"
            >
              📍 We are here
            </button>
          ) : (
            <span className="text-sm font-sans bg-amber-900/40 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-700/40">
              📍 Current arc
            </span>
          )}
          {(['todo', 'active', 'done'] as ArcStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => campaign.setArcStatus(arc.id, s)}
              className={`text-xs font-sans px-2.5 py-1.5 rounded-lg border transition-colors ${
                st.status === s
                  ? 'bg-stone-700 border-stone-500 text-stone-200'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-600'
              }`}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-800 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`px-4 py-2 text-sm font-sans rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-stone-800 text-amber-400 border border-stone-700 border-b-0'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'guide' && (
        <GuideContent
          key={arc.mdPath}
          mdPath={arc.mdPath}
          onNavigate={onNavigate}
          anchor={anchor}
          navSeq={navSeq}
        />
      )}

      {tab === 'notes' && (
        <div>
          <p className="text-xs text-stone-500 font-sans mb-2">
            Prep notes, changes to the arc, what your table did differently — saved automatically.
          </p>
          <textarea
            value={st.notes}
            onChange={(e) => campaign.setArcNotes(arc.id, e.target.value)}
            rows={16}
            placeholder={`Notes for Arc ${arc.code}…`}
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-parchment placeholder-stone-600 font-sans focus:outline-none focus:border-amber-700/60 resize-y"
          />
        </div>
      )}

      {tab === 'music' && <ArcMusicPlan arc={arc} />}
    </div>
  );
}
