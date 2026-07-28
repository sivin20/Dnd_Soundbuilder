import { useEffect, useRef, useState } from 'react';
import { loadMirrorIndex, renderObsidian } from '../../utils/obsidianMarkdown';
import type { RenderedPage } from '../../utils/obsidianMarkdown';

interface Props {
  mdPath: string;
  onNavigate: (mdPath: string) => void;
}

// Headings above this viewport offset count as "read" for the scroll-spy
const SPY_OFFSET_PX = 130;

// NOTE: render with key={mdPath} — state resets via remount on page change.
export default function GuideContent({ mdPath, onNavigate }: Props) {
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

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

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex gap-6 items-start">
      <div
        className="guide-content flex-1 min-w-0"
        onClick={(e) => {
          const link = (e.target as HTMLElement).closest('a[data-page]');
          if (link) {
            e.preventDefault();
            onNavigate(link.getAttribute('data-page')!);
          }
        }}
        dangerouslySetInnerHTML={{ __html: page.html }}
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
