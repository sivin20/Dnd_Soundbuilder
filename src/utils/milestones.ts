import { loadMirrorIndex } from './obsidianMarkdown';
import { CAMPAIGN_ARCS } from '../data/campaignArcs';

// Reloaded awards XP at story milestones, marked inline in the guide text.
// There are 28 of them across the arcs, each naming its XP value — enough to
// track campaign progress and level pacing without a spreadsheet.
//
// The markup is inconsistent (***Milestone.***, **_Milestone_**, sometimes
// inside a callout), so the pattern below accepts all the variants present.

const MILESTONE = /(?:^|\n)\s*>?\s*(?:\*\*_Milestone_\*\*|\*\*\*Milestone\.?\*\*\*|\*\*Milestone\*\*)\.?\s*(.+)/g;
const XP_AMOUNT = /([\d,]+)\s*XP/i;

export interface Milestone {
  /** Stable id: arc code + index, so ticking one survives a re-parse. */
  id: string;
  arcId: string;
  arcCode: string;
  arcTitle: string;
  /** First sentence — the milestone itself. */
  summary: string;
  /** Full paragraph, including the award condition. */
  detail: string;
  xp: number | null;
}

/** Strip inline markdown so the checklist reads as plain text. */
function plain(md: string): string {
  return md
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Abbreviations whose full stop does not end a sentence — Barovia is full of
 *  saints, so "the bones of St. Andral" must not truncate to "the bones of St." */
const ABBREVIATION_END = /\b(?:St|Mr|Mrs|Ms|Dr|Mt|vs|etc|No)\.$/i;

/** "Defeating X completes a story milestone. When ..." → the first sentence. */
function firstSentence(text: string): string {
  const boundary = /[.!?](?=\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text)) !== null) {
    const candidate = text.slice(0, match.index + 1);
    if (ABBREVIATION_END.test(candidate)) continue;
    return candidate;
  }
  return text;
}

function parseXp(text: string): number | null {
  const match = XP_AMOUNT.exec(text);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

let milestonesPromise: Promise<Milestone[]> | null = null;

/** Parse every arc page's milestones. Cached for the session. */
export function loadMilestones(): Promise<Milestone[]> {
  if (!milestonesPromise) {
    milestonesPromise = (async () => {
      await loadMirrorIndex(); // fail fast with the same error the guide would give

      const perArc = await Promise.all(
        CAMPAIGN_ARCS.map(async (arc) => {
          const url = '/reloaded/' + arc.mdPath.split('/').map(encodeURIComponent).join('/');
          try {
            const res = await fetch(url);
            if (!res.ok) return [];
            // Mirror files are mostly CRLF; a stray \r breaks the line anchors
            const md = (await res.text()).replace(/\r\n/g, '\n');

            const found: Milestone[] = [];
            for (const match of md.matchAll(MILESTONE)) {
              const detail = plain(match[1]);
              if (!detail) continue;
              found.push({
                id: `${arc.code}-${found.length}`,
                arcId: arc.id,
                arcCode: arc.code,
                arcTitle: arc.title,
                summary: firstSentence(detail),
                detail,
                xp: parseXp(detail),
              });
            }
            return found;
          } catch {
            return [];
          }
        })
      );

      return perArc.flat();
    })().catch((e) => {
      milestonesPromise = null; // let a later mount retry
      throw e;
    });
  }
  return milestonesPromise;
}

/** Cumulative XP per player up to and including each completed milestone. */
export function earnedXp(milestones: Milestone[], done: Record<string, boolean>): number {
  return milestones.reduce((total, m) => (done[m.id] ? total + (m.xp ?? 0) : total), 0);
}

/** 2014 XP thresholds — for "the milestones you've ticked imply level N". */
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export function levelForXp(xp: number): number {
  let level = 1;
  XP_THRESHOLDS.forEach((threshold, i) => {
    if (xp >= threshold) level = i + 1;
  });
  return level;
}

export function xpToNextLevel(xp: number): { next: number; needed: number } | null {
  const level = levelForXp(xp);
  if (level >= XP_THRESHOLDS.length) return null;
  return { next: level + 1, needed: XP_THRESHOLDS[level] - xp };
}
