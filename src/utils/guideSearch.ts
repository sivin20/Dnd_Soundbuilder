import { loadMirrorIndex, renderObsidian } from './obsidianMarkdown';

// Full-text search across the whole Reloaded mirror.
//
// The index is built once from the same renderObsidian() output the reader uses,
// then split at headings. Going through the renderer rather than the raw
// markdown costs a second of work up front but buys two things that matter:
// callout/wikilink/HTML syntax never leaks into the text, and every section is
// keyed by the *exact* heading id the reader will scroll to — so a hit is
// always reachable.

export interface GuideSection {
  mdPath: string;
  /** "Arc D - St. Andral's Feast" */
  pageTitle: string;
  /** Directory the page lives in, e.g. "Act II - The Shadowed Town". */
  group: string;
  /** Heading id, matching the reader's anchors. Empty for a page preamble. */
  headingId: string;
  headingText: string;
  level: number;
  text: string;
  /** The section contains at least one read-aloud box. */
  hasReadAloud: boolean;
}

export interface SearchHit {
  section: GuideSection;
  score: number;
  snippet: string;
}

/** Sections whose text is shorter than this are indexed but rank last. */
const THIN_SECTION_CHARS = 40;
const SNIPPET_RADIUS = 120;

// ---------------------------------------------------------------------------
// Index building
// ---------------------------------------------------------------------------

let indexPromise: Promise<GuideSection[]> | null = null;
let sections: GuideSection[] | null = null;

/** Section count once built, for progress display. Null until then. */
export function indexedSections(): number | null {
  return sections?.length ?? null;
}

function pageTitle(mdPath: string): string {
  return mdPath.split('/').pop()!.replace(/\.md$/, '');
}

function pageGroup(mdPath: string): string {
  const parts = mdPath.split('/');
  return parts.length > 1 ? parts[0] : '';
}

/** Split one rendered page into its heading sections. */
function splitIntoSections(mdPath: string, html: string): GuideSection[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = pageTitle(mdPath);
  const group = pageGroup(mdPath);

  const out: GuideSection[] = [];
  let current: GuideSection = {
    mdPath, pageTitle: title, group,
    headingId: '', headingText: title, level: 0,
    text: '', hasReadAloud: false,
  };
  const chunks: string[] = [];

  const flush = () => {
    current.text = chunks.join(' ').replace(/\s+/g, ' ').trim();
    if (current.text || current.headingId) out.push(current);
    chunks.length = 0;
  };

  for (const node of Array.from(doc.body.children)) {
    const isHeading = /^H[1-4]$/.test(node.tagName) && !node.closest('.statblock');
    if (isHeading && (node as HTMLElement).id) {
      flush();
      current = {
        mdPath, pageTitle: title, group,
        headingId: (node as HTMLElement).id,
        headingText: (node.textContent ?? '').trim(),
        level: Number(node.tagName[1]),
        text: '', hasReadAloud: false,
      };
      continue;
    }
    if (node.querySelector?.('.description') || node.classList?.contains('description')) {
      current.hasReadAloud = true;
    }
    chunks.push(node.textContent ?? '');
  }
  flush();

  return out;
}

/**
 * Build the index. Safe to call repeatedly — the work happens once.
 * onProgress reports pages done / total so the UI can show something.
 */
export function buildGuideIndex(
  onProgress?: (done: number, total: number) => void
): Promise<GuideSection[]> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const index = await loadMirrorIndex();
      const total = index.pages.length;
      let done = 0;
      const all: GuideSection[] = [];

      // Sequential on purpose: 39 parses of a large document each block the main
      // thread, and firing them all at once janks the palette that opened the
      // build. One page at a time keeps the UI responsive between yields.
      for (const mdPath of index.pages) {
        try {
          const url = '/reloaded/' + mdPath.split('/').map(encodeURIComponent).join('/');
          const res = await fetch(url);
          if (res.ok) {
            const { html } = renderObsidian(await res.text(), index);
            all.push(...splitIntoSections(mdPath, html));
          }
        } catch {
          // A page that won't load shouldn't sink the whole index.
        }
        onProgress?.(++done, total);
        await new Promise((r) => setTimeout(r, 0)); // yield to paint
      }

      sections = all;
      return all;
    })().catch((e) => {
      indexPromise = null; // let a later attempt retry
      throw e;
    });
  }
  return indexPromise;
}

// ---------------------------------------------------------------------------
// Searching
// ---------------------------------------------------------------------------

function terms(query: string): string[] {
  const raw = query.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  // Drop noise words only when there's something else to match on
  const meaty = raw.filter((t) => t.length > 1);
  return meaty.length ? meaty : raw;
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

function snippetFor(text: string, ts: string[]): string {
  const lower = text.toLowerCase();
  let at = -1;
  // Anchor the snippet on the longest term that actually appears — the most
  // specific word the user typed is the one they want to see in context.
  for (const t of [...ts].sort((a, b) => b.length - a.length)) {
    at = lower.indexOf(t);
    if (at !== -1) break;
  }
  if (at === -1) return text.slice(0, SNIPPET_RADIUS * 2).trim();

  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + SNIPPET_RADIUS);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

export function searchGuide(query: string, limit = 25): SearchHit[] {
  if (!sections) return [];
  const ts = terms(query);
  if (!ts.length) return [];
  const phrase = query.trim().toLowerCase();

  const hits: SearchHit[] = [];

  for (const section of sections) {
    const heading = section.headingText.toLowerCase();
    const body = section.text.toLowerCase();

    // Every term has to appear somewhere in the section — an OR search over a
    // 60,000-word guide returns everything and means nothing.
    if (!ts.every((t) => heading.includes(t) || body.includes(t))) continue;

    let score = 0;
    for (const t of ts) {
      if (heading.includes(t)) score += 14;
      score += Math.min(countOccurrences(body, t), 5) * 2;
    }
    if (phrase.length > 2) {
      if (heading.includes(phrase)) score += 30;
      else if (body.includes(phrase)) score += 12;
    }
    // Prefer the section that *is* the thing over one that mentions it
    if (heading === phrase) score += 40;
    if (section.level > 0 && section.level <= 2) score += 4;
    if (section.text.length < THIN_SECTION_CHARS) score -= 10;

    hits.push({ section, score, snippet: snippetFor(section.text, ts) });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Terms this short only highlight at a word start, so "st" doesn't light up
 *  "quest", "stands" and "Vistana" when you searched for "St. Andral". */
const HIGHLIGHT_WHOLE_WORD_MAX = 3;

/** Regex that matches any query term, for highlighting a snippet. */
export function highlightPattern(query: string): RegExp | null {
  const ts = terms(query);
  if (!ts.length) return null;
  const escaped = ts.map((t) => {
    const e = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return t.length <= HIGHLIGHT_WHOLE_WORD_MAX ? `\\b${e}` : e;
  });
  return new RegExp(`(${escaped.join('|')})`, 'gi');
}
