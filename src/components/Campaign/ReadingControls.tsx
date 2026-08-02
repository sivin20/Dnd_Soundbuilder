import { usePrefsStore, FONT_SCALES } from '../../store/prefsStore';

interface Props {
  /** Read-aloud boxes on the page, in either language. */
  total: number;
  /** Read-aloud boxes with a usable Danish translation. */
  translated: number;
  /** Read-aloud boxes with no translation yet. */
  missing: number;
  /** Cached translations that no longer match the page's English. */
  stale: number;
  busy: boolean;
  error: string | null;
  onTranslate: () => void;
  /**
   * CSS `top` for the sticky bar.
   *
   * Sticky offsets here resolve against the guide scroller's *padding* box, and
   * that scroller has 24px of padding — so -1.5rem is flush with its top edge,
   * not 0. On an arc page the 46px tab bar already occupies that spot, so the
   * toolbar docks below it at -1.5rem + 46px = 1.375rem.
   */
  stickyTop: string;
}

/**
 * Text size and read-aloud language, on every guide page.
 *
 * Both belong here rather than in a settings screen: text size is something you
 * change when the room's lighting changes, and the language switch is something
 * you flip mid-session — which is why the bar stays pinned while you scroll. A
 * read-aloud box two screens down is exactly when you want to switch language,
 * and scrolling back up to do it is the whole problem.
 *
 * -ml-6/pl-6 cancels the scroller's left padding so the bar's background covers
 * the full width of the column it belongs to; nothing bleeds right, which keeps
 * it clear of the "On this page" outline.
 */
export default function ReadingControls({
  total, translated, missing, stale, busy, error, onTranslate, stickyTop,
}: Props) {
  const { fontScaleIndex, nudgeFontScale, readAloudLang, setReadAloudLang } = usePrefsStore();
  const isDanish = readAloudLang === 'da';

  return (
    <div
      style={{ top: stickyTop }}
      className="sticky z-10 -ml-6 pl-6 pt-2 pb-2.5 mb-4 bg-stone-950 border-b border-stone-800/70 flex items-center flex-wrap gap-x-4 gap-y-2"
    >
      {/* Text size */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] uppercase tracking-widest text-stone-600 font-sans mr-1">Text</span>
        <button
          onClick={() => nudgeFontScale(-1)}
          disabled={fontScaleIndex === 0}
          className="w-7 h-7 rounded border border-stone-700 text-stone-400 text-xs font-sans hover:border-stone-500 hover:text-parchment disabled:opacity-30 transition-colors"
          title="Smaller guide text"
        >
          A−
        </button>
        <button
          onClick={() => nudgeFontScale(1)}
          disabled={fontScaleIndex === FONT_SCALES.length - 1}
          className="w-7 h-7 rounded border border-stone-700 text-stone-400 text-sm font-sans hover:border-stone-500 hover:text-parchment disabled:opacity-30 transition-colors"
          title="Bigger guide text"
        >
          A+
        </button>
      </div>

      {/* Read-aloud language. Only worth showing on pages that have read-aloud
          text — most reference pages have none. */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest text-stone-600 font-sans">
            Read aloud
          </span>
          <div className="flex rounded-lg border border-stone-700 overflow-hidden">
            {(['en', 'da'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setReadAloudLang(lang)}
                className={`px-2.5 py-1 text-xs font-sans transition-colors ${
                  readAloudLang === lang
                    ? 'bg-amber-800/60 text-amber-100'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
                title={lang === 'en' ? 'Show read-aloud text in English' : 'Vis oplæsningstekst på dansk'}
              >
                {lang === 'en' ? 'English' : 'Dansk'}
              </button>
            ))}
          </div>

          {/* Coverage is shown in both languages: in English it tells you whether
              switching is even worth it, which is when you want to know. */}
          <span className="text-[11px] font-sans text-stone-500">
            {translated}/{total} {isDanish ? 'oversat' : 'translated'}
            {stale > 0 && (
              <span
                className="text-amber-600"
                title="The guide page changed since these were translated, so they fall back to English rather than risk putting the wrong passage in your mouth."
              >
                {' '}· {stale} stale
              </span>
            )}
          </span>

          {missing > 0 && (
            <button
              onClick={onTranslate}
              disabled={busy}
              className="text-xs font-sans px-2.5 py-1 rounded-lg bg-amber-800/50 border border-amber-700/50 text-amber-200 hover:bg-amber-700/60 disabled:opacity-50 transition-colors"
              title={`Translate the remaining ${missing} read-aloud passage${missing === 1 ? '' : 's'} on this page into Danish and save them`}
            >
              {busy ? 'Oversætter…' : `Oversæt ${missing}`}
            </button>
          )}
        </div>
      )}

      {error && (
        <span className="text-[11px] font-sans text-amber-600/90 basis-full" title={error}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
