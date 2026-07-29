import { marked } from 'marked';
import { loadMirrorIndex, slugify } from './obsidianMarkdown';

// Reloaded buries a roleplaying dossier for every major NPC inside
// `> [!profile]` callouts — Resonance, Emotions, Motivations, Inspirations,
// Persona, Morale, Relationships. Great material, unusable mid-scene while it
// sits three screens deep in a 200KB page. This pulls all of them out of the
// mirror into a searchable directory.

export interface NpcField {
  label: string;
  html: string;
}

export interface NpcProfile {
  id: string;
  name: string;
  /** "Roleplaying" fields first, then "Character" fields, source order kept. */
  fields: NpcField[];
  art: string | null;
  mdPath: string;
  /** Heading id the profile sits under, for jump-to-source. */
  anchor: string | null;
  /** Human label for the source page, e.g. "Arc B - Welcome to Barovia". */
  sourceLabel: string;
  /** Other pages this NPC also has a profile on. */
  alsoOn: string[];
}

const PROFILE_START = /^>\s*\[!profile\][+-]?\s*\*\*(?:Profile:\s*)?(.+?)\*\*/;
const FIELD = /^>\s*\*\*\*([^*]+?)\.?\*\*\*\s*(.*)$/;
const SECTION = /^>\s*\*\*([^*]+?)\*\*\s*$/;
const HEADING = /^(#{1,4})\s+(.*)$/;
const IMAGE_EMBED = /!\[\[([^\]|]+\.(?:png|jpe?g|webp))/i;

/** Group headers, not dossier fields. Pages write them both ways —
 *  `**Roleplaying Information**` and `***Roleplaying Information***`. */
const GROUP_HEADERS = new Set(['Roleplaying Information', 'Character Information']);

/** How far back to look for the portrait that belongs to a profile. */
const ART_LOOKBACK_LINES = 40;

/** Markdown inline → HTML, with wikilinks flattened to their label. */
function inlineToHtml(md: string): string {
  const flattened = md.replace(
    /\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
    (_m, target: string, anchor: string | undefined, label: string | undefined) => {
      if (label) return label;
      if (target.trim()) return target.split('/').pop() ?? target;
      return (anchor ?? '').replace(/^#/, '').split('#').pop() ?? '';
    }
  );
  return marked.parseInline(flattened, { async: false });
}

function pageLabel(mdPath: string): string {
  return (mdPath.split('/').pop() ?? mdPath).replace(/\.md$/, '');
}

function cleanName(raw: string): string {
  return raw.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

/** Extract every profile callout from one page's markdown. */
function parsePage(
  md: string,
  mdPath: string,
  assetByBase: Map<string, string>
): NpcProfile[] {
  // The mirror is mostly CRLF. A trailing \r breaks every `$`-anchored regex
  // below, because JS `.` does not match \r.
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: NpcProfile[] = [];

  for (let i = 0; i < lines.length; i++) {
    const start = PROFILE_START.exec(lines[i]);
    if (!start) continue;

    const name = cleanName(start[1]);
    const fields: NpcField[] = [];
    let current: { label: string; parts: string[] } | null = null;

    const flush = () => {
      if (!current) return;
      const text = current.parts.join(' ').trim();
      if (text) fields.push({ label: current.label, html: inlineToHtml(text) });
      current = null;
    };

    // Walk the rest of the blockquote
    let j = i + 1;
    for (; j < lines.length && lines[j].startsWith('>'); j++) {
      const line = lines[j];

      const field = FIELD.exec(line);
      if (field) {
        const label = field[1].trim().replace(/\.$/, '');
        flush();
        if (!GROUP_HEADERS.has(label)) current = { label, parts: [field[2]] };
        continue;
      }

      // "**Roleplaying Information**" style group headers carry no content
      if (SECTION.test(line)) { flush(); continue; }

      const body = line.replace(/^>\s?/, '');
      if (!body.trim()) { flush(); continue; }
      if (current) current.parts.push(body);
    }
    flush();

    if (fields.length === 0) continue; // group blurb, not a real dossier

    // Portrait: the embed just above the profile, else an asset named after them
    let art: string | null = null;
    let anchor: string | null = null;
    for (let k = i - 1; k >= 0 && k > i - ART_LOOKBACK_LINES; k--) {
      if (!art) {
        const embed = IMAGE_EMBED.exec(lines[k]);
        if (embed) art = embed[1].trim();
      }
      const heading = HEADING.exec(lines[k]);
      if (heading) {
        anchor = slugify(heading[2].trim());
        break; // the portrait belongs to this section, don't look further up
      }
    }
    if (!art) {
      for (const candidate of [name, name.split(' ')[0].replace(/["“”]/g, '')]) {
        const hit = assetByBase.get(`${candidate.toLowerCase()}.png`);
        if (hit) { art = candidate + '.png'; break; }
      }
    }

    const resolved = art ? assetByBase.get(art.toLowerCase()) ?? null : null;

    out.push({
      id: slugify(name) || `npc-${out.length}`,
      name,
      fields,
      art: resolved ? '/reloaded/' + resolved.split('/').map(encodeURIComponent).join('/') : null,
      mdPath,
      anchor,
      sourceLabel: pageLabel(mdPath),
      alsoOn: [],
    });

    i = j - 1;
  }

  return out;
}

/** Richest profile wins when an NPC is documented on several pages. */
function dedupe(all: NpcProfile[]): NpcProfile[] {
  const byId = new Map<string, NpcProfile>();

  for (const p of all) {
    const existing = byId.get(p.id);
    if (!existing) { byId.set(p.id, p); continue; }

    const [keep, drop] =
      p.fields.length > existing.fields.length ? [p, existing] : [existing, p];
    keep.alsoOn = [...new Set([...keep.alsoOn, ...drop.alsoOn, drop.sourceLabel])];
    byId.set(p.id, keep);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

let profilesPromise: Promise<NpcProfile[]> | null = null;

/** Load and parse every profile in the mirror. Cached for the session. */
export function loadNpcProfiles(): Promise<NpcProfile[]> {
  if (!profilesPromise) {
    profilesPromise = (async () => {
      const index = await loadMirrorIndex();
      const assetByBase = new Map(
        index.assets.map((a) => [(a.split('/').pop() ?? a).toLowerCase(), a])
      );

      const pages = await Promise.all(
        index.pages.map(async (mdPath) => {
          const url = '/reloaded/' + mdPath.split('/').map(encodeURIComponent).join('/');
          try {
            const res = await fetch(url);
            if (!res.ok) return [];
            return parsePage(await res.text(), mdPath, assetByBase);
          } catch {
            return [];
          }
        })
      );

      return dedupe(pages.flat());
    })().catch((e) => {
      profilesPromise = null; // let a later mount retry
      throw e;
    });
  }
  return profilesPromise;
}

/** Free-text match over name and dossier text. */
export function matchesQuery(npc: NpcProfile, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (npc.name.toLowerCase().includes(q)) return true;
  if (npc.sourceLabel.toLowerCase().includes(q)) return true;
  return npc.fields.some(
    (f) => f.label.toLowerCase().includes(q) || f.html.toLowerCase().includes(q)
  );
}
