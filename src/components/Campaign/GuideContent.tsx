import { useEffect, useRef, useState } from 'react';
import { loadMirrorIndex, renderObsidian } from '../../utils/obsidianMarkdown';
import type { RenderedPage } from '../../utils/obsidianMarkdown';

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

/** Past this many viewports, smooth scrolling is abandoned for a direct jump. */
const SMOOTH_SCROLL_LIMIT_VIEWPORTS = 2;

/**
 * Scroll a heading into view.
 *
 * Smooth behaviour silently does nothing over long distances in these nested
 * scroll containers — a jump to a section 20,000px down left the page at the
 * top with no error. Anything beyond a couple of screens is scrolled instantly,
 * which is also what you want when you deliberately followed a link.
 */
function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const distance = Math.abs(el.getBoundingClientRect().top);
  const behavior: ScrollBehavior =
    distance > window.innerHeight * SMOOTH_SCROLL_LIMIT_VIEWPORTS ? 'instant' : 'smooth';
  el.scrollIntoView({ behavior, block: 'start' });
}

// NOTE: render with key={mdPath} — state resets via remount on page change.
export default function GuideContent({ mdPath, onNavigate, anchor, navSeq }: Props) {
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Mount the rendered guide HTML imperatively.
  //
  // Deliberately NOT dangerouslySetInnerHTML: React re-applies that prop on
  // re-render, replacing these nodes with fresh copies, which breaks anything
  // holding a reference into the guide DOM. Owning the innerHTML ourselves
  // means React never touches it.
  useEffect(() => {
    const host = contentRef.current;
    if (!page || !host) return;
    host.innerHTML = page.html;
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

  // Jump to a wikilink's or a deadline's #Section once the page is on screen.
  //
  // Images load lazily and shift everything above the target, which drags the
  // heading off the position we just scrolled to — landing a couple of hundred
  // pixels past it, with the heading itself off-screen. Correcting at a few
  // increasing delays lands it and keeps it there as the layout settles.
  useEffect(() => {
    if (!page || !anchor) return;
    const frame = requestAnimationFrame(() => scrollToHeading(anchor));
    const passes = [300, 1000, 2000].map((delay) =>
      setTimeout(() => scrollToHeading(anchor), delay)
    );
    return () => {
      cancelAnimationFrame(frame);
      passes.forEach(clearTimeout);
    };
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

      {/* On this page — heading outline with scroll-spy, like the website's sidebar */}
      {page.toc.length > 1 && (
        <nav ref={navRef} className="hidden lg:block w-60 flex-shrink-0 sticky top-4 max-h-[80vh] overflow-y-auto">
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
                  className={`text-left text-[13px] font-sans py-1 leading-snug transition-colors border-l-2 -ml-px ${
                    isActive
                      ? 'text-amber-400 border-amber-600'
                      : 'text-stone-400 border-transparent hover:text-amber-400 hover:border-amber-700/60'
                  }`}
                  style={{ paddingLeft: `${0.75 + Math.max(0, entry.level - 2) * 0.9}rem` }}
                  title={entry.text}
                >
                  {entry.text}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
