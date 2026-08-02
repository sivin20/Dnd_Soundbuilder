import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMirrorIndex, renderObsidian } from '../../utils/obsidianMarkdown';
import type { RenderedPage } from '../../utils/obsidianMarkdown';
import { useCampaignStore, sceneKey } from '../../store/campaignStore';
import { usePrefsStore } from '../../store/prefsStore';
import { SCENE_STATUS } from '../../data/sceneStatus';
import ReadingControls from './ReadingControls';
import {
  applyReadAloudLang, loadTranslations, translateBlocks, TranslationUnavailable,
} from '../../utils/readAloud';
import type { ApplyResult, ReadAloudBlock, TranslationFile } from '../../utils/readAloud';

interface Props {
  mdPath: string;
  onNavigate: (mdPath: string, anchor?: string) => void;
  /** Heading id to jump to once the page has rendered. */
  anchor?: string;
  /** Bumped on every navigation so repeat jumps to the same anchor re-scroll. */
  navSeq?: number;
  /**
   * Where the sticky reading toolbar docks. Arc pages have the tab bar above it,
   * so they pass an offset; reference pages don't. See ReadingControls.
   */
  stickyTop?: string;
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

/** Flush with the guide scroller's top edge — its 24px padding is why this is
 *  negative rather than zero. */
const SCROLLER_TOP = '-1.5rem';

// NOTE: render with key={mdPath} — state resets via remount on page change.
export default function GuideContent({
  mdPath, onNavigate, anchor, navSeq, stickyTop = SCROLLER_TOP,
}: Props) {
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  // Show how each scene went right in the outline, so progress is visible while
  // reading rather than only on the Progress tab.
  const sceneProgress = useCampaignStore((s) => s.sceneProgress);
  const contentRef = useRef<HTMLDivElement>(null);

  // Read-aloud language. Translations live on disk and are swapped into the
  // mounted DOM, so this has to re-run whenever the page or the language changes.
  const readAloudLang = usePrefsStore((s) => s.readAloudLang);
  const [translations, setTranslations] = useState<TranslationFile | null>(null);
  const [readAloud, setReadAloud] = useState<ApplyResult>({ total: 0, translated: 0, missing: [], stale: 0 });
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    loadTranslations().then((file) => { if (!cancelled) setTranslations(file); });
    return () => { cancelled = true; };
  }, []);

  // Swap the read-aloud boxes into the chosen language. Runs after the mount
  // effect above (same dependency on `page`, declared later) so the nodes exist.
  useEffect(() => {
    const host = contentRef.current;
    if (!page || !host) return;
    setReadAloud(applyReadAloudLang(host, mdPath, readAloudLang, translations));
  }, [page, mdPath, readAloudLang, translations]);

  const translateMissing = useCallback(async (blocks: ReadAloudBlock[]) => {
    setTranslating(true);
    setTranslateError(null);
    try {
      setTranslations(await translateBlocks(mdPath, blocks));
    } catch (e) {
      setTranslateError(
        e instanceof TranslationUnavailable
          ? e.message
          : `Kunne ikke oversætte: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setTranslating(false);
    }
  }, [mdPath]);

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
      <div className="flex-1 min-w-0">
      <ReadingControls
        stickyTop={stickyTop}
        total={readAloud.total}
        translated={readAloud.translated}
        missing={readAloud.missing.length}
        stale={readAloud.stale}
        busy={translating}
        error={translateError}
        onTranslate={() => translateMissing(readAloud.missing)}
      />

      <div
        ref={contentRef}
        className="guide-content"
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
      </div>

      {/* On this page — heading outline with scroll-spy, like the website's
          sidebar. top-12 clears the sticky arc tab bar above it. */}
      {page.toc.length > 1 && (
        <nav ref={navRef} className="hidden lg:block w-60 flex-shrink-0 sticky top-12 max-h-[calc(100vh-14rem)] overflow-y-auto">
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-sans mb-2">
            On this page
          </p>
          <div className="border-l border-stone-800 flex flex-col">
            {page.toc.map((entry) => {
              const isActive = entry.id === activeId;
              const status = sceneProgress[sceneKey(mdPath, entry.id)]?.status;
              return (
                <button
                  key={entry.id}
                  data-toc={entry.id}
                  onClick={() => scrollToHeading(entry.id)}
                  className={`flex items-center gap-1.5 text-left text-[13px] font-sans py-1 leading-snug transition-colors border-l-2 -ml-px ${
                    isActive
                      ? 'text-amber-400 border-amber-600'
                      : 'text-stone-400 border-transparent hover:text-amber-400 hover:border-amber-700/60'
                  }`}
                  style={{ paddingLeft: `${0.75 + Math.max(0, entry.level - 2) * 0.9}rem` }}
                  title={status ? `${entry.text} — ${SCENE_STATUS[status].label}` : entry.text}
                >
                  {status && status !== 'todo' && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SCENE_STATUS[status].dot}`}
                    />
                  )}
                  <span className="min-w-0 truncate">{entry.text}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
