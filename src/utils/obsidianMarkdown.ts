import { marked } from 'marked';

// Renders Obsidian-flavored markdown from the local Reloaded mirror
// (public/reloaded/) to HTML: wikilinks, image embeds, callouts, comments.
//
// Markdown is preprocessed for Obsidian syntax, handed to marked, then walked
// as a DOM so callouts become typed <details> blocks, headings get anchor ids
// plus a slot for the scene-cue button, and links get the right targets.

marked.setOptions({ gfm: true, breaks: false });

const CALLOUT_ICONS: Record<string, string> = {
  note: '📝', info: 'ℹ️', tip: '💡', hint: '💡', important: '❗',
  warning: '⚠️', caution: '⚠️', danger: '☠️', error: '☠️',
  quote: '❝', cite: '❝', example: '🧪', abstract: '📋', summary: '📋',
  question: '❓', success: '✅', check: '✅', failure: '❌', bug: '🐛',
  // Reloaded's own callout vocabulary
  lore: '📜', profile: '🎭', item: '💎', combat: '⚔️', design: '🛠',
};

/** Callout types that stay folded even when the source marks them expanded —
 *  design commentary is prep reading, not table reading. */
const ALWAYS_COLLAPSED = new Set(['design']);

interface MirrorIndex {
  pages: string[];
  assets: string[];
}

let indexPromise: Promise<MirrorIndex> | null = null;
export function loadMirrorIndex(): Promise<MirrorIndex> {
  if (!indexPromise) {
    indexPromise = fetch('/reloaded/manifest.json').then((r) => r.json());
  }
  return indexPromise;
}

function basename(p: string): string {
  return p.split('/').pop() ?? p;
}

/** Resolve a wikilink target (page name, no extension) to a mirror mdPath. */
export function resolvePage(target: string, index: MirrorIndex): string | null {
  const name = `${basename(target.trim())}.md`.toLowerCase();
  return index.pages.find((p) => basename(p).toLowerCase() === name) ?? null;
}

function resolveAsset(target: string, index: MirrorIndex): string | null {
  const name = basename(target.trim()).toLowerCase();
  return index.assets.find((a) => basename(a).toLowerCase() === name) ?? null;
}

function assetUrl(path: string): string {
  return '/reloaded/' + path.split('/').map(encodeURIComponent).join('/');
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export interface TocEntry {
  id: string;
  text: string;
  level: number; // 1-4
}

export interface RenderedPage {
  html: string;
  toc: TocEntry[];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Obsidian's `#Section` (and nested `#A#B`) anchors point at a heading by its
 * text. The deepest segment is the actual heading, and heading ids come from
 * the same slugify(), so the two line up.
 */
function anchorSlug(raw: string): string {
  const deepest = raw.replace(/^#/, '').split('#').pop() ?? '';
  return slugify(deepest);
}

// ---------------------------------------------------------------------------
// Markdown preprocessing (Obsidian syntax → HTML that marked passes through)
// ---------------------------------------------------------------------------
function preprocess(md: string, index: MirrorIndex): string {
  let src = md;

  // Strip Obsidian comments
  src = src.replace(/%%[\s\S]*?%%/g, '');

  // Image / file embeds: ![[file]] or ![[file|300]]
  src = src.replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, target: string, mod?: string) => {
    const t = target.trim();
    if (IMAGE_EXT.test(t)) {
      const asset = resolveAsset(t, index);
      if (!asset) return '';
      const width = mod && /^\d+$/.test(mod.trim()) ? ` width="${mod.trim()}"` : '';
      return `<img src="${assetUrl(asset)}" alt="${escapeHtml(t)}" loading="lazy"${width}>`;
    }
    if (t.toLowerCase().endsWith('.pdf')) {
      const asset = resolveAsset(t, index);
      if (asset) return `<a href="${assetUrl(asset)}" target="_blank" rel="noopener">📄 ${escapeHtml(t)}</a>`;
    }
    // Embedded page — link instead of transclusion
    const page = resolvePage(t, index);
    return page ? `<a data-page="${escapeHtml(page)}">${escapeHtml(basename(t))}</a>` : escapeHtml(t);
  });

  // Wikilinks. Four shapes, all handled here:
  //   [[Page]]  [[Page|label]]  [[Page#Section|label]]  [[#Section]]
  // An empty target means "this page" — 585 of those in the mirror, and they
  // used to fall through as literal [[#...]] text.
  src = src.replace(
    /\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
    (match, target: string, anchor: string | undefined, label: string | undefined) => {
      const t = target.trim();
      if (!t && !anchor) return match; // not a wikilink we understand

      const anchorAttr = anchor ? ` data-anchor="${escapeHtml(anchorSlug(anchor))}"` : '';
      const fallback = t ? basename(t) : (anchor ?? '').replace(/^#/, '').split('#').pop() ?? '';
      const text = escapeHtml((label ?? fallback).trim());

      // Same-page jump
      if (!t) return `<a class="wikilink"${anchorAttr}>${text}</a>`;

      const page = resolvePage(t, index);
      return page
        ? `<a class="wikilink" data-page="${escapeHtml(page)}"${anchorAttr}>${text}</a>`
        : text;
    }
  );

  // Callout headers: "> [!type]+ Title" → a marker the DOM pass turns into
  // <details>. The +/- suffix is Obsidian's default-open / default-folded flag.
  src = src.replace(
    /^(>\s*)\[!(\w+)\]([+-]?)\s*(.*)$/gm,
    (_m, prefix: string, type: string, fold: string, title: string) => {
      const kind = type.toLowerCase();
      const icon = CALLOUT_ICONS[kind] ?? '📌';
      const t = title.trim() || kind.charAt(0).toUpperCase() + kind.slice(1);
      const open = fold !== '-' && !ALWAYS_COLLAPSED.has(kind);
      return `${prefix}<strong class="callout-title" data-callout="${kind}" data-open="${open ? '1' : '0'}">${icon} ${t}</strong>`;
    }
  );

  return src;
}

// ---------------------------------------------------------------------------
// DOM pass
// ---------------------------------------------------------------------------

/** Turn a callout blockquote into <details class="callout callout-TYPE">. */
function convertCallout(quote: HTMLQuoteElement, doc: Document): void {
  const firstEl = quote.firstElementChild;
  if (!firstEl) return;
  const strong = firstEl.querySelector(':scope > strong.callout-title');
  if (!strong || strong !== firstEl.firstElementChild) return;

  const kind = strong.getAttribute('data-callout') ?? 'note';
  const open = strong.getAttribute('data-open') === '1';

  const details = doc.createElement('details');
  details.className = `callout callout-${kind}`;
  if (open) details.setAttribute('open', '');

  const summary = doc.createElement('summary');
  while (strong.firstChild) summary.appendChild(strong.firstChild);
  strong.remove();
  details.appendChild(summary);

  // A callout whose title was the only content of its first paragraph leaves
  // an empty <p> behind — drop it so the body doesn't start with a blank line.
  if (firstEl.tagName === 'P' && !firstEl.textContent?.trim() && !firstEl.firstElementChild) {
    firstEl.remove();
  }

  const body = doc.createElement('div');
  body.className = 'callout-body';
  while (quote.firstChild) body.appendChild(quote.firstChild);
  details.appendChild(body);

  quote.replaceWith(details);
}

/** Assign heading ids, collect the TOC, and add a cue-button slot. */
function processHeadings(doc: Document): TocEntry[] {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();

  doc.body.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
    const text = (h.textContent ?? '').trim();
    let id = slugify(text) || 'section';
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n}`;

    h.id = id;
    toc.push({ id, text, level: Number(h.tagName[1]) });

    // Anchor point for the scene-cue button (portalled in by GuideContent)
    const slot = doc.createElement('span');
    slot.className = 'cue-slot';
    slot.setAttribute('data-cue-slot', id);
    h.appendChild(slot);
  });

  return toc;
}

export function renderObsidian(md: string, index: MirrorIndex): RenderedPage {
  const html = marked.parse(preprocess(md, index), { async: false });
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Reverse document order so nested callouts convert before their parents
  const quotes = [...doc.body.querySelectorAll('blockquote')].reverse();
  for (const q of quotes) convertCallout(q as HTMLQuoteElement, doc);

  const toc = processHeadings(doc);

  doc.body.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  });

  return { html: doc.body.innerHTML, toc };
}
