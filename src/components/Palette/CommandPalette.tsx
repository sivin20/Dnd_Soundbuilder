import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAMPAIGN_ARCS, REFERENCE_PAGES, ACTS, actSummary } from '../../data/campaignArcs';
import { ARC_SCENES, GENERIC_SCENES } from '../../data/arcScenes';
import type { PresetScene } from '../../data/arcScenes';
import { loadNpcProfiles } from '../../utils/npcProfiles';
import type { NpcProfile } from '../../utils/npcProfiles';
import { buildGuideIndex, searchGuide, highlightPattern } from '../../utils/guideSearch';
import type { SearchHit } from '../../utils/guideSearch';
import { useSoundStore } from '../../store/soundStore';
import { useSceneStore } from '../../store/sceneStore';
import { usePrefsStore } from '../../store/prefsStore';
import { panicStop, fadeEverythingOut } from '../../audio/panic';
import type { View } from '../../types';

// One box that reaches everything: guide text, arcs, pages, NPCs, ready-made
// scenes, ambience and one-shots. Opened with Cmd+K (Ctrl+K on Windows).
//
// Local lists match instantly. Full-text guide hits need the mirror indexed, so
// that build starts in the background shortly after launch and its results fold
// in as soon as they exist.

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenGuide: (mdPath: string, anchor?: string) => void;
  /** Open the NPC directory on a specific dossier. */
  onOpenNpc: (npcId: string) => void;
  onChangeView: (view: View) => void;
}

interface PaletteItem {
  id: string;
  group: string;
  icon: string;
  label: string;
  detail?: string;
  /** Right-hand hint, e.g. the act an arc belongs to. */
  meta?: string;
  /** Extra text that should match but isn't shown. */
  keywords?: string;
  run: () => void;
}

const MAX_PER_GROUP = 6;
const MAX_GUIDE_HITS = 12;
/** Delay before indexing starts, so it never competes with first paint. */
const INDEX_WARMUP_MS = 2500;

const VIEWS: { view: View; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: '🎛' },
  { view: 'campaign', label: 'Campaign', icon: '📖' },
  { view: 'npcs', label: 'NPCs', icon: '🎭' },
  { view: 'music', label: 'Music Library', icon: '🎵' },
  { view: 'soundboard', label: 'Soundboard', icon: '🔊' },
];

/**
 * Subsequence match: every character of the query appears in order. Scores
 * prefix and word-start matches highest so "sta" finds "St. Andral" before
 * "Instant".
 */
function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 1;

  const exact = t.indexOf(q);
  if (exact === 0) return 1000;
  if (exact > 0) return 700 - Math.min(exact, 100) + (/\W/.test(t[exact - 1]) ? 120 : 0);

  let score = 0;
  let ti = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    score += found === 0 || /\W/.test(t[found - 1]) ? 8 : 2;
    ti = found + 1;
  }
  return score;
}

export default function CommandPalette({ open, onClose, onOpenGuide, onOpenNpc, onChangeView }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [npcs, setNpcs] = useState<NpcProfile[]>([]);
  const [indexProgress, setIndexProgress] = useState<{ done: number; total: number } | null>(null);
  const [indexReady, setIndexReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sounds = useSoundStore((s) => s.sounds);
  const toggleAmbient = useSoundStore((s) => s.toggleAmbient);
  const triggerOneShot = useSoundStore((s) => s.triggerOneShot);
  const applyPreset = useSceneStore((s) => s.applyPreset);
  const nudgeFontScale = usePrefsStore((s) => s.nudgeFontScale);
  const readAloudLang = usePrefsStore((s) => s.readAloudLang);
  const toggleReadAloudLang = usePrefsStore((s) => s.toggleReadAloudLang);

  // NPC dossiers come from parsing the mirror; load once, lazily.
  useEffect(() => {
    let cancelled = false;
    loadNpcProfiles()
      .then((list) => { if (!cancelled) setNpcs(list); })
      .catch(() => { /* palette still works without NPCs */ });
    return () => { cancelled = true; };
  }, []);

  // Warm the full-text index in the background. Kicked off on a timer so it
  // never delays first paint, and immediately if the palette opens sooner.
  const startIndexing = useCallback(() => {
    buildGuideIndex((done, total) => setIndexProgress({ done, total }))
      .then(() => setIndexReady(true))
      .catch(() => setIndexProgress(null));
  }, []);

  useEffect(() => {
    const timer = setTimeout(startIndexing, INDEX_WARMUP_MS);
    return () => clearTimeout(timer);
  }, [startIndexing]);

  useEffect(() => {
    if (open) startIndexing();
  }, [open, startIndexing]);

  // Derived, not state: searchGuide() reads the module-level index, so it can be
  // recomputed during render rather than pushed into state from an effect.
  const guideHits = useMemo<SearchHit[]>(
    () => (indexReady && query.trim().length >= 2 ? searchGuide(query, MAX_GUIDE_HITS) : []),
    [query, indexReady]
  );

  const close = useCallback(() => {
    onClose();
    setQuery('');
    setActive(0);
  }, [onClose]);

  const openGuide = useCallback((mdPath: string, anchor?: string) => {
    onOpenGuide(mdPath, anchor);
    close();
  }, [onOpenGuide, close]);

  const openNpc = useCallback((npcId: string) => {
    onOpenNpc(npcId);
    close();
  }, [onOpenNpc, close]);

  // --- Candidate items (everything the palette can reach) -------------------
  const commands = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    for (const arc of CAMPAIGN_ARCS) {
      items.push({
        id: `arc:${arc.id}`,
        group: 'Arcs',
        icon: '📕',
        label: `Arc ${arc.code}: ${arc.title}`,
        detail: arc.summary,
        meta: arc.act.replace(/ —.*/, ''),
        keywords: arc.musicSections.join(' '),
        run: () => openGuide(arc.mdPath),
      });
    }

    for (const act of ACTS) {
      const summary = actSummary(act);
      if (summary) {
        items.push({
          id: `page:${summary.mdPath}`,
          group: 'Pages',
          icon: '🗓',
          label: summary.title,
          detail: 'Timeline, quest schedule and deadlines',
          run: () => openGuide(summary.mdPath),
        });
      }
    }

    for (const page of REFERENCE_PAGES) {
      items.push({
        id: `page:${page.mdPath}`,
        group: 'Pages',
        icon: '📄',
        label: page.title,
        meta: page.group,
        run: () => openGuide(page.mdPath),
      });
    }

    // Straight to the dossier in the NPC directory — the roleplaying material
    // laid out to read mid-scene, rather than the guide page it's buried in.
    // The dossier itself links onward to its source page.
    for (const npc of npcs) {
      items.push({
        id: `npc:${npc.id}`,
        group: 'NPCs',
        icon: '🎭',
        label: npc.name,
        detail: npc.sourceLabel,
        run: () => openNpc(npc.id),
      });
    }

    const scenePreset = (preset: PresetScene, group: string): PaletteItem => ({
      id: `scene:${preset.id}`,
      group,
      icon: preset.kind === 'combat' ? '⚔️' : '🎬',
      label: preset.name,
      detail: preset.hint,
      meta: preset.category,
      keywords: preset.tracks.join(' '),
      run: () => { applyPreset(preset); close(); },
    });
    for (const preset of GENERIC_SCENES) items.push(scenePreset(preset, 'Scenes'));
    for (const preset of ARC_SCENES) items.push(scenePreset(preset, 'Scenes'));

    for (const sound of sounds) {
      const ambient = sound.type === 'ambient';
      items.push({
        id: `sound:${sound.id}`,
        group: ambient ? 'Ambience' : 'One-shots',
        icon: sound.emoji || (ambient ? '🌫' : '💥'),
        label: sound.name,
        meta: ambient && sound.isActive ? 'playing' : undefined,
        run: () => {
          if (ambient) toggleAmbient(sound.id);
          else triggerOneShot(sound.id);
          close();
        },
      });
    }

    for (const v of VIEWS) {
      items.push({
        id: `view:${v.view}`,
        group: 'Go to',
        icon: v.icon,
        label: v.label,
        run: () => { onChangeView(v.view); close(); },
      });
    }

    items.push(
      {
        id: 'cmd:panic',
        group: 'Commands',
        icon: '🔇',
        label: 'Stop everything (⌘.)',
        detail: 'Music, ambience and one-shots, over a 2s fade',
        keywords: 'silence quiet panic hush stop all sound mute',
        run: () => { panicStop(); close(); },
      },
      {
        id: 'cmd:fade-out',
        group: 'Commands',
        icon: '🌙',
        label: 'Fade everything out',
        detail: 'Wind the board down gracefully',
        keywords: 'silence quiet stop scene end',
        run: () => { fadeEverythingOut(); close(); },
      },
      {
        id: 'cmd:lang',
        group: 'Commands',
        icon: '🗣',
        label: readAloudLang === 'en'
          ? 'Read-aloud text: switch to Danish'
          : 'Read-aloud text: switch to English',
        keywords: 'language dansk danish english oversæt translate',
        run: () => { toggleReadAloudLang(); close(); },
      },
      {
        id: 'cmd:bigger',
        group: 'Commands',
        icon: '🔎',
        label: 'Bigger guide text',
        keywords: 'font size zoom larger readable',
        run: () => { nudgeFontScale(1); close(); },
      },
      {
        id: 'cmd:smaller',
        group: 'Commands',
        icon: '🔍',
        label: 'Smaller guide text',
        keywords: 'font size zoom',
        run: () => { nudgeFontScale(-1); close(); },
      }
    );

    return items;
  }, [
    npcs, sounds, readAloudLang, openGuide, openNpc, close, applyPreset, toggleAmbient,
    triggerOneShot, onChangeView, toggleReadAloudLang, nudgeFontScale,
  ]);

  // --- Filter + assemble the visible list ----------------------------------
  const results = useMemo<PaletteItem[]>(() => {
    const q = query.trim();

    const scored = commands
      .map((item) => ({
        item,
        score: Math.max(
          fuzzyScore(item.label, q),
          fuzzyScore(item.keywords ?? '', q) * 0.5,
          fuzzyScore(item.detail ?? '', q) * 0.25
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // Cap each group so one big category (sounds, scenes) can't push everything
    // else off screen.
    const perGroup = new Map<string, number>();
    const kept: PaletteItem[] = [];
    for (const { item } of scored) {
      const n = perGroup.get(item.group) ?? 0;
      if (n >= MAX_PER_GROUP) continue;
      perGroup.set(item.group, n + 1);
      kept.push(item);
    }

    const guide: PaletteItem[] = guideHits.map((hit) => ({
      id: `guide:${hit.section.mdPath}#${hit.section.headingId}`,
      group: 'In the guide',
      icon: hit.section.hasReadAloud ? '📢' : '📖',
      label: hit.section.headingText,
      detail: hit.snippet,
      meta: hit.section.pageTitle,
      run: () => openGuide(hit.section.mdPath, hit.section.headingId || undefined),
    }));

    // Group order is fixed rather than score-ordered: a stable layout is worth
    // more than optimal ranking when you're reaching for this mid-session.
    const ORDER = ['In the guide', 'Arcs', 'NPCs', 'Scenes', 'Pages', 'Ambience', 'One-shots', 'Go to', 'Commands'];
    const all = [...guide, ...kept];
    return ORDER.flatMap((g) => all.filter((i) => i.group === g));
  }, [commands, guideHits, query, openGuide]);

  // Clamped during render rather than corrected in an effect: the result list
  // shrinks as you type, and a stale index must never survive even one frame or
  // Enter would fire the wrong row.
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const pattern = highlightPattern(query);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(results.length - 1, activeIndex + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, activeIndex - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); results[activeIndex]?.run(); }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={close}
    >
      <div
        className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-stone-800">
          <span className="text-stone-500">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search the guide, jump to an arc or NPC, play a scene…"
            className="flex-1 bg-transparent py-3.5 text-parchment font-sans text-[15px] placeholder-stone-600 focus:outline-none"
          />
          {!indexReady && indexProgress && (
            <span className="text-[11px] font-sans text-stone-600 flex-shrink-0">
              indexing {indexProgress.done}/{indexProgress.total}
            </span>
          )}
        </div>

        <div ref={listRef} className="overflow-y-auto flex-1 py-1.5">
          {results.length === 0 ? (
            <p className="text-stone-600 font-sans text-sm italic px-4 py-6 text-center">
              {query.trim() && !indexReady
                ? 'Nothing matched yet — the guide is still being indexed.'
                : 'Nothing matched.'}
            </p>
          ) : (
            results.map((item, i) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {showGroup && (
                    <p className="text-[10px] uppercase tracking-widest text-stone-600 font-sans px-4 pt-2.5 pb-1">
                      {item.group}
                    </p>
                  )}
                  <button
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={item.run}
                    className={`w-full flex items-start gap-3 px-4 py-2 text-left transition-colors ${
                      i === activeIndex ? 'bg-amber-900/30' : 'hover:bg-stone-800/60'
                    }`}
                  >
                    <span className="text-base leading-6 flex-shrink-0 w-5 text-center">{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-sans text-sm truncate ${
                          i === activeIndex ? 'text-amber-200' : 'text-parchment'
                        }`}
                      >
                        {highlight(item.label, pattern)}
                      </span>
                      {item.detail && (
                        <span className="block font-sans text-xs text-stone-500 leading-snug line-clamp-2">
                          {highlight(item.detail, pattern)}
                        </span>
                      )}
                    </span>
                    {item.meta && (
                      <span className="text-[11px] font-sans text-stone-600 flex-shrink-0 mt-0.5">
                        {item.meta}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-stone-800 px-4 py-2 flex gap-4 text-[11px] font-sans text-stone-600">
          <span><kbd>↑↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
          <span className="ml-auto">{results.length} result{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrap query matches in the text so you can see why a row matched.
 *
 * The pattern has one capture group, so String.split() interleaves the matches
 * at odd indices — which is also why this must not call pattern.test(): a global
 * regex carries lastIndex between calls and would match every other time.
 */
function highlight(text: string, pattern: RegExp | null) {
  if (!pattern) return text;
  const parts = text.split(pattern);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-amber-700/40 text-amber-100 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}
