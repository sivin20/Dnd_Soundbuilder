import { marked } from 'marked';

// Renders Obsidian-flavored markdown from the local Reloaded mirror
// (public/reloaded/) to HTML: wikilinks, image embeds, callouts, comments.

marked.setOptions({ gfm: true, breaks: false });

const CALLOUT_ICONS: Record<string, string> = {
  note: '📝', info: 'ℹ️', tip: '💡', hint: '💡', important: '❗',
  warning: '⚠️', caution: '⚠️', danger: '☠️', error: '☠️',
  quote: '❝', cite: '❝', example: '🧪', abstract: '📋', summary: '📋',
  question: '❓', success: '✅', check: '✅', failure: '❌', bug: '🐛',
};

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** Add ids to headings and collect a table of contents. */
function buildToc(html: string): RenderedPage {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();
  const out = html.replace(/<h([1-4])>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
    const text = inner.replace(/<[^>]*>/g, '').trim();
    let id = slugify(text) || 'section';
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n}`;
    toc.push({ id, text, level: Number(lvl) });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

export function renderObsidian(md: string, index: MirrorIndex): RenderedPage {
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
      return `<img src="${assetUrl(asset)}" alt="${t}" loading="lazy"${width}>`;
    }
    if (t.toLowerCase().endsWith('.pdf')) {
      const asset = resolveAsset(t, index);
      if (asset) return `<a href="${assetUrl(asset)}" target="_blank" rel="noopener">📄 ${t}</a>`;
    }
    // Embedded page — link instead of transclusion
    const page = resolvePage(t, index);
    return page ? `<a data-page="${page}">${basename(t)}</a>` : t;
  });

  // Wikilinks: [[Page]], [[Page|label]], [[Page#Section|label]]
  src = src.replace(/\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_m, target: string, _anchor?: string, label?: string) => {
    const text = (label ?? basename(target)).trim();
    const page = resolvePage(target, index);
    return page ? `<a data-page="${page}">${text}</a>` : text;
  });

  // Callout headers: "> [!type]+ Title" → styled first line
  src = src.replace(/^(>\s*)\[!(\w+)\][+-]?\s*(.*)$/gm, (_m, prefix: string, type: string, title: string) => {
    const icon = CALLOUT_ICONS[type.toLowerCase()] ?? '📌';
    const t = title.trim() || type.charAt(0).toUpperCase() + type.slice(1);
    return `${prefix}<strong class="callout-title">${icon} ${t}</strong>`;
  });

  const html = marked.parse(src, { async: false });

  // External links open in a new tab
  return buildToc(
    html.replace(/<a href="http/g, '<a target="_blank" rel="noopener" href="http')
  );
}
