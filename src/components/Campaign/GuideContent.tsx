import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadMirrorIndex, renderObsidian } from '../../utils/obsidianMarkdown';
import type { RenderedPage } from '../../utils/obsidianMarkdown';
import { useCueStore, selectPageCues } from '../../store/cueStore';
import { useSceneStore } from '../../store/sceneStore';
import HeadingCue from './HeadingCue';

interface Props {
  mdPath: string;
  onNavigate: (mdPath: string, anchor?: string) => void;
  /** Heading id to jump to once the page has rendered. */
  anchor?: string;
  /** Bumped on every navigation so repeat jumps to the same anchor re-scroll. */
  navSeq?: number;
}

// Headings above this viewport offset count as "read" for the scroll-spy
const SPY_OFFSET_PX = 130;

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// NOTE: render with key={mdPath} — state resets via remount on page change.
export default function GuideContent({ mdPath, onNavigate, anchor, navSeq }: Props) {
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cueSlots, setCueSlots] = useState<{ id: string; el: HTMLElement }[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const cues = useCueStore((s) => s.cues);
  const fireCue = useCueStore((s) => s.fireCue);
  const scenes = useSceneStore((s) => s.scenes);

  const headingOrder = useMemo(() => page?.toc.map((t) => t.id) ?? [], [page]);
  const cuedHeadings = useMemo(() => {
    const set = new Set<string>();
    for (const c of Object.values(cues)) if (c.mdPath === mdPath) set.add(c.headingId);
    return set;
  }, [cues, mdPath]);
  const pageCues = useMemo(
    () => selectPageCues(cues, mdPath, headingOrder),
    [cues, mdPath, headingOrder]
  );

  // Mount the rendered guide HTML imperatively, then collect the cue slots each
  // heading carries so the ▶ buttons can be portalled into them.
  //
  // Deliberately NOT dangerouslySetInnerHTML: React re-applies that prop on
  // re-render, which replaces these nodes with fresh copies and leaves the
  // portals attached to detached elements. Owning the innerHTML ourselves means
  // React never touches the guide DOM.
  useEffect(() => {
    const host = contentRef.current;
    if (!page || !host) return;
    host.innerHTML = page.html;
    const els = [...host.querySelectorAll<HTMLElement>('[data-cue-slot]')];
    setCueSlots(els.map((el) => ({ id: el.dataset.cueSlot!, el })));
  }, [page]);

  // Scroll-spy: highlight the TOC entry for the section currently in view.
  // Capture-phase listener on document catches scrolls of ANY container
  // (scroll events don't bubble), so this works regardless of which
  // ancestor actually scrolls.
  useEffect(() => {
    if (!page || page.toc.length === 0) return;

    // Synchronous update (no rAF): rAF is throttled to zero in hidden tabs,
    // and scroll events are already frame-aligned by the browser.
    const update = () => {
      let current = page.toc[0].id;
      for (const entry of page.toc) {
        const el = document.getElementById(entry.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= SPY_OFFSET_PX) current = entry.id;
        else break; // toc is in document order
      }
      setActiveId(current);
    };

    const init = setTimeout(update); // initial position, after paint
    document.addEventListener('scroll', update, { capture: true, passive: true });
    return () => {
      clearTimeout(init);
      document.removeEventListener('scroll', update, { capture: true });
    };
  }, [page]);

  // Keep the active entry visible inside the TOC's own scrollbox
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const btn = navRef.current.querySelector<HTMLElement>(`[data-toc="${activeId}"]`);
    const nav = navRef.current;
    if (!btn) return;
    // btn.offsetTop is relative to the nav (its positioned ancestor)
    const top = btn.offsetTop;
    if (top < nav.scrollTop + 30 || top > nav.scrollTop + nav.clientHeight - 40) {
      nav.scrollTop = top - nav.clientHeight / 2;
    }
  }, [activeId]);

  useEffect(() => {
    let cancelled = false;
    const url = '/reloaded/' + mdPath.split('/').map(encodeURIComponent).join('/');
    Promise.all([fetch(url), loadMirrorIndex()])
      .then(async ([res, index]) => {
        if (!res.ok) throw new Error(`${res.status} — is the mirror downloaded? Run: python3 mirror-reloaded.py`);
        const md = await res.text();
        if (!cancelled) setPage(renderObsidian(md, index));
      })
      .catch((e) => { if (!cancelled) setError(String(e)); });

    return () => { cancelled = true; };
  }, [mdPath]);

  // Jump to a wikilink's #Section once the page is on screen. Images shift the
  // layout as they load, so the position is corrected once shortly after.
  useEffect(() => {
    if (!page || !anchor) return;
    const first = requestAnimationFrame(() => scrollToHeading(anchor));
    const settle = setTimeout(() => scrollToHeading(anchor), 300);
    return () => { cancelAnimationFrame(first); clearTimeout(settle); };
  }, [page, anchor, navSeq]);

  if (error) {
    return (
      <div className="text-center py-10 text-stone-500 font-sans text-sm">
        <p className="text-3xl mb-2">🕯</p>
        <p>Couldn't load this page.</p>
        <p className="text-stone-600 text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!page) {
    return <p className="text-stone-600 font-sans text-sm italic py-6 text-center">Consulting the tome…</p>;
  }

  return (
    <div className="flex gap-6 items-start">
      <div
        ref={contentRef}
        className="guide-content flex-1 min-w-0"
        onClick={(e) => {
          const link = (e.target as HTMLElement).closest('a[data-page], a[data-anchor]');
          if (!link) return;
          e.preventDefault();
          const targetPage = link.getAttribute('data-page');
          const targetAnchor = link.getAttribute('data-anchor') ?? undefined;
          if (targetPage) onNavigate(targetPage, targetAnchor);
          else if (targetAnchor) scrollToHeading(targetAnchor);
        }}
      />

      {cueSlots.map(({ id, el }) =>
        createPortal(
          <HeadingCue
            mdPath={mdPath}
            headingId={id}
            headingText={page.toc.find((t) => t.id === id)?.text ?? id}
          />,
          el,
          id
        )
      )}

      {(page.toc.length > 1 || pageCues.length > 0) && (
        <nav ref={navRef} className="hidden lg:block w-60 flex-shrink-0 sticky top-4 max-h-[80vh] overflow-y-auto">
          {/* Cue sheet — the compact run-list for this page */}
          {pageCues.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-widest text-amber-700 font-sans mb-2">
                🎬 Cue sheet
              </p>
              <div className="flex flex-col gap-1">
                {pageCues.map((c) => {
                  const scene = scenes.find((s) => s.id === c.sceneId);
                  return (
                    <button
                      key={c.headingId}
                      onClick={() => fireCue(c.mdPath, c.headingId)}
                      disabled={!scene}
                      className="flex items-center gap-1.5 text-left text-[12px] font-sans px-2 py-1 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-amber-800/60 disabled:opacity-40 transition-colors group"
                      title={scene ? `Play “${scene.name}” — ${c.headingText}` : 'Scene was deleted'}
                    >
                      <span className="text-amber-600 flex-shrink-0">{scene ? '▶' : '⚠'}</span>
                      <span className="min-w-0">
                        <span className="block text-stone-300 truncate group-hover:text-amber-300 transition-colors">
                          {c.headingText}
                        </span>
                        {scene && (
                          <span className="block text-stone-600 text-[11px] truncate">{scene.name}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* On this page — heading outline with scroll-spy, like the website's sidebar */}
          {page.toc.length > 1 && (
            <>
              <p className="text-[11px] uppercase tracking-widest text-stone-500 font-sans mb-2">
                On this page
              </p>
              <div className="border-l border-stone-800 flex flex-col">
                {page.toc.map((entry) => {
                  const isActive = entry.id === activeId;
                  return (
                    <button
                      key={entry.id}
                      data-toc={entry.id}
                      onClick={() => scrollToHeading(entry.id)}
                      className={`flex items-start gap-1 text-left text-[13px] font-sans py-1 leading-snug transition-colors border-l-2 -ml-px ${
                        isActive
                          ? 'text-amber-400 border-amber-600'
                          : 'text-stone-400 border-transparent hover:text-amber-400 hover:border-amber-700/60'
                      }`}
                      style={{ paddingLeft: `${0.75 + Math.max(0, entry.level - 2) * 0.9}rem` }}
                      title={entry.text}
                    >
                      {cuedHeadings.has(entry.id) && (
                        <span className="text-amber-700 text-[10px] mt-0.5 flex-shrink-0" title="Has a scene cue">
                          ▶
                        </span>
                      )}
                      <span className="min-w-0 truncate">{entry.text}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
