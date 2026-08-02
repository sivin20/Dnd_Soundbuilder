// Danish/English switching for the guide's read-aloud boxes.
//
// The guide marks text that gets read to the players as <div class="description">.
// There are 681 of them across the mirror (~61,000 words), so translations are
// cached on disk in translations/read-aloud.da.json rather than produced live,
// and that file is git-tracked: once a passage is translated it stays translated.
//
// Blocks are keyed by page + position in document order, and every entry carries
// a fingerprint of the English text it was translated from. If the mirror is
// re-downloaded and a page gains or loses a box, the fingerprints stop matching
// and those blocks fall back to English instead of silently showing the Danish
// of a *different* passage — the one failure mode that would actually hurt at
// the table.
//
// Extraction lives here, on the client, on purpose: the browser is the only
// thing that renders the guide, so it is the only thing that agrees with itself
// about what "block 3 of this page" means. One mirror page nests a <div> inside
// a read-aloud box, which a server-side regex slices in the wrong place.

export const READ_ALOUD_SELECTOR = '.description';

/** Length of the English fingerprint stored alongside each translation. */
const FINGERPRINT_CHARS = 48;

export interface TranslationEntry {
  /** Fingerprint of the English text this was translated from. */
  src: string;
  /** Translated HTML, same inline markup as the source. */
  da: string;
}

export interface TranslationFile {
  version: number;
  lang: string;
  entries: Record<string, TranslationEntry>;
}

export interface ReadAloudBlock {
  key: string;
  index: number;
  /** English HTML, as rendered. */
  html: string;
  fingerprint: string;
}

const API = '/api/translations/da';

export function blockKey(mdPath: string, index: number): string {
  return `${mdPath}#${index}`;
}

export function fingerprint(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, FINGERPRINT_CHARS);
}

/** Stash the English so toggling back never needs a re-render. */
const ORIGINAL_ATTR = 'data-en-html';

function stripTags(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? '';
}

export interface ApplyResult {
  /** Read-aloud boxes on this page, regardless of language. */
  total: number;
  /** Blocks with a usable Danish translation. */
  translated: number;
  /** Blocks with no usable translation yet. */
  missing: ReadAloudBlock[];
  /** Blocks whose cached Danish no longer matches the English on the page. */
  stale: number;
}

/**
 * Show the read-aloud boxes in `lang`. Safe to call repeatedly and in either
 * direction — the English is kept on the element.
 *
 * The census is taken whichever language is showing, so the UI can offer the
 * switch (and say how much is translated) *before* you switch. Reporting it only
 * in Danish mode would hide the control behind itself.
 */
export function applyReadAloudLang(
  host: HTMLElement,
  mdPath: string,
  lang: 'en' | 'da',
  file: TranslationFile | null
): ApplyResult {
  const nodes = Array.from(host.querySelectorAll<HTMLElement>(READ_ALOUD_SELECTOR));
  const result: ApplyResult = { total: nodes.length, translated: 0, missing: [], stale: 0 };

  nodes.forEach((el, index) => {
    // First touch: remember the English before anything replaces it.
    if (!el.hasAttribute(ORIGINAL_ATTR)) el.setAttribute(ORIGINAL_ATTR, el.innerHTML);
    const englishHtml = el.getAttribute(ORIGINAL_ATTR)!;
    const englishFingerprint = fingerprint(stripTags(englishHtml));
    const key = blockKey(mdPath, index);

    const showEnglish = () => {
      if (el.innerHTML !== englishHtml) el.innerHTML = englishHtml;
      el.removeAttribute('data-read-aloud-lang');
    };

    const entry = file?.entries[key];
    const usable = !!entry && entry.src === englishFingerprint;

    if (usable) result.translated += 1;
    else {
      // A cached translation whose English no longer matches is worse than none:
      // it would put a different passage in your mouth.
      if (entry) result.stale += 1;
      result.missing.push({ key, index, html: englishHtml, fingerprint: englishFingerprint });
    }

    if (lang === 'da' && usable) {
      if (el.innerHTML !== entry!.da) el.innerHTML = entry!.da;
      el.setAttribute('data-read-aloud-lang', 'da');
    } else {
      showEnglish();
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// Cache access
// ---------------------------------------------------------------------------

let cachePromise: Promise<TranslationFile | null> | null = null;

const EMPTY: TranslationFile = { version: 1, lang: 'da', entries: {} };

/** Load the on-disk translation cache. Null means the API isn't reachable. */
export function loadTranslations(): Promise<TranslationFile | null> {
  if (!cachePromise) {
    cachePromise = fetch(API)
      .then((r) => (r.ok ? (r.json() as Promise<TranslationFile>) : EMPTY))
      .catch(() => null);
  }
  return cachePromise;
}

/** Merge freshly translated entries into the in-memory cache. */
function mergeIntoCache(entries: Record<string, TranslationEntry>) {
  cachePromise = loadTranslations().then((file) => ({
    ...(file ?? EMPTY),
    entries: { ...(file?.entries ?? {}), ...entries },
  }));
  return cachePromise;
}

export class TranslationUnavailable extends Error {}

/**
 * Translate the given blocks and persist them. Resolves with the updated cache.
 * Throws TranslationUnavailable when the server has no API key configured.
 */
export async function translateBlocks(
  mdPath: string,
  blocks: ReadAloudBlock[]
): Promise<TranslationFile | null> {
  if (blocks.length === 0) return loadTranslations();

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mdPath,
      blocks: blocks.map((b) => ({ index: b.index, html: b.html, src: b.fingerprint })),
    }),
  });

  if (res.status === 501 || res.status === 503) {
    throw new TranslationUnavailable(await res.text());
  }
  if (!res.ok) throw new Error(`Translation failed: ${res.status} ${await res.text()}`);

  const { entries } = (await res.json()) as { entries: Record<string, TranslationEntry> };
  return mergeIntoCache(entries);
}
