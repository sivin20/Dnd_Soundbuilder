import type { CampaignArc } from '../types';

// Curse of Strahd: Reloaded structure (strahdreloaded.com, WotC Fan Content).
// mdPath points into the local mirror at public/reloaded/ (run mirror-reloaded.py).
// musicSections map arcs onto Track.section values for music suggestions.
// Levels are approximate — Reloaded milestones, adjust to your table.

export interface ArcDef extends CampaignArc {
  mdPath: string;
}

const SITE = 'https://www.strahdreloaded.com';

function arc(
  code: string,
  act: string,
  actSlug: string,
  title: string,
  summary: string,
  levels: string,
  musicSections: string[]
): ArcDef {
  const page = `Arc ${code} - ${title}`;
  return {
    id: `arc-${code.toLowerCase()}`,
    code,
    act,
    title,
    summary,
    levels,
    musicSections,
    mdPath: `${actSlug}/${page}.md`,
    url: `${SITE}/${encodeURIComponent(actSlug)}/${encodeURIComponent(page)}`,
  };
}

const ACT1 = 'Act I - Into the Mists';
const ACT2 = 'Act II - The Shadowed Town';
const ACT3 = 'Act III - The Broken Land';
const ACT4 = 'Act IV - Secrets of the Ancient';

export const CAMPAIGN_ARCS: ArcDef[] = [
  arc('A', 'Act I — Into the Mists', ACT1, 'Escape From Death House',
    'The party is drawn into the mists and trapped in a haunted townhouse they must escape before midnight.',
    '2–3', ['Death House']),
  arc('B', 'Act I — Into the Mists', ACT1, 'Welcome to Barovia',
    'First taste of the cursed village: the Burgomaster\'s funeral, Ireena, and Doru in the church basement.',
    '3', ['Village of Barovia']),
  arc('C', 'Act I — Into the Mists', ACT1, 'Into the Valley',
    'The road west: Madam Eva\'s Tarokka reading at Tser Pool, Old Bonegrinder, and arrival at Vallaki.',
    '3–4', ['Roads & Travel', 'Tser Pool & Vistani', 'Old Bonegrinder']),

  arc('D', 'Act II — The Shadowed Town', ACT2, "St. Andral's Feast",
    'The stolen bones of St. Andral leave the church unprotected — vampire spawn plot a bloody feast.',
    '4', ['Vallaki']),
  arc('E', 'Act II — The Shadowed Town', ACT2, 'The Missing Vistana',
    'Arabelle has vanished; the search leads to Lake Zarovich and entangles the party with the Vistani.',
    '4–5', ['Tser Pool & Vistani', 'Roads & Travel', 'Van Richten & Ezmerelda']),
  arc('F', 'Act II — The Shadowed Town', ACT2, "Lady Wachter's Wish",
    'Vallaki politics boil over: Lady Wachter schemes to topple the Baron.',
    '5', ['Vallaki']),
  arc('G', 'Act II — The Shadowed Town', ACT2, 'The Strazni Siblings',
    'Izek Strazni, the Baron\'s brutal enforcer, and his unsettling obsession with Ireena.',
    '5', ['Vallaki']),
  arc('H', 'Act II — The Shadowed Town', ACT2, 'The Lost Soul',
    'Victor Vallakovich\'s dark experiments in the attic of the Baron\'s mansion.',
    '5–6', ['Vallaki']),
  arc('I', 'Act II — The Shadowed Town', ACT2, 'The Walls of Krezk',
    'The party seeks refuge at Krezk\'s gates and meets the strange serenity of the Abbey above.',
    '6', ['Krezk & the Abbey', 'Roads & Travel']),

  arc('J', 'Act III — The Broken Land', ACT3, 'The Stolen Gem',
    'The Wizard of Wines has gone dry — druids of Yester Hill have taken a magical seed gem.',
    '6–7', ['Wizard of Wines & Yester Hill']),
  arc('K', 'Act III — The Broken Land', ACT3, 'The Fallen Abbey',
    'The Abbot\'s flawed mercy: mongrelfolk, Vasilka the flesh-golem bride, and a deal gone wrong.',
    '7', ['Krezk & the Abbey']),
  arc('L', 'Act III — The Broken Land', ACT3, 'The Den of Wolves',
    'Werewolves raid the valley from their mountain den; a pack succession war offers a way in.',
    '7', ['Werewolf Den']),
  arc('M', 'Act III — The Broken Land', ACT3, "The Dragon's Manor",
    'Argynvostholt\'s undead knights and the bitter revenant Vladimir Horngaard.',
    '7–8', ['Argynvostholt']),
  arc('O', 'Act III — The Broken Land', ACT3, 'Dinner with the Devil',
    'Strahd invites the party to Castle Ravenloft for dinner — courtesy, menace, and theatre.',
    '8', ['Castle Ravenloft', 'Strahd']),
  arc('P', 'Act III — The Broken Land', ACT3, 'Ravenloft Heist',
    'Sneaking back into the castle to steal what the party needs from under Strahd\'s nose.',
    '8–9', ['Castle Ravenloft']),
  arc('Q', 'Act III — The Broken Land', ACT3, 'A Shining Beacon',
    'Restoring the beacon of Argynvostholt and breaking the werewolf threat.',
    '9', ['Argynvostholt', 'Werewolf Den']),

  arc('R', 'Act IV — Secrets of the Ancient', ACT4, 'Trials of the Mountain',
    'The climb through Tsolenka Pass toward the Amber Temple\'s frozen secrets.',
    '9', ['Tsolenka Pass & Amber Temple']),
  arc('S', 'Act IV — Secrets of the Ancient', ACT4, 'A Sword of Sunlight',
    'The hunt for the Sunsword and the temptations of the Amber Temple\'s dark gifts.',
    '9–10', ['Tsolenka Pass & Amber Temple']),
  arc('T', 'Act IV — Secrets of the Ancient', ACT4, 'The Three Fanes',
    'Reconsecrating the ancient fanes of the land to strip Strahd of his stolen power.',
    '10', ['Berez', 'Wizard of Wines & Yester Hill', 'Roads & Travel']),
  arc('U', 'Act IV — Secrets of the Ancient', ACT4, 'Dreams of Dawn',
    'The final assault on Castle Ravenloft and the last confrontation with Strahd.',
    '10', ['Castle Ravenloft', 'Strahd']),
];

export const ACTS = [...new Set(CAMPAIGN_ARCS.map((a) => a.act))];

// Non-arc guide pages for the reference browser, grouped
export const REFERENCE_PAGES: { group: string; title: string; mdPath: string }[] = [
  { group: 'Introduction', title: "A DM's Guide to Curse of Strahd", mdPath: "Introduction/A DM's Guide to Curse of Strahd.md" },
  { group: 'Introduction', title: 'Using This Guide', mdPath: 'Introduction/Using This Guide.md' },
  { group: 'Beginning the Campaign', title: 'Session Zero', mdPath: 'Chapter 1 - Beginning the Campaign/Session Zero.md' },
  { group: 'Beginning the Campaign', title: 'Character Creation', mdPath: 'Chapter 1 - Beginning the Campaign/Character Creation.md' },
  { group: 'The Land of Barovia', title: 'Lore of Barovia', mdPath: 'Chapter 2 - The Land of Barovia/Lore of Barovia.md' },
  { group: 'The Land of Barovia', title: 'History of Barovia', mdPath: 'Chapter 2 - The Land of Barovia/History of Barovia.md' },
  { group: 'The Land of Barovia', title: 'Strahd von Zarovich', mdPath: 'Chapter 2 - The Land of Barovia/Strahd von Zarovich.md' },
  { group: 'Running the Game', title: 'Running the Adventure', mdPath: 'Chapter 3 - Running the Game/Running the Adventure.md' },
  { group: 'Running the Game', title: 'Adventure Summary', mdPath: 'Chapter 3 - Running the Game/Adventure Summary.md' },
  { group: 'Act Summaries', title: 'Act I Summary', mdPath: 'Act I - Into the Mists/Act I Summary.md' },
  { group: 'Act Summaries', title: 'Act II Summary', mdPath: 'Act II - The Shadowed Town/Act II Summary.md' },
  { group: 'Act Summaries', title: 'Act III Summary', mdPath: 'Act III - The Broken Land/Act III Summary.md' },
  { group: 'Act Summaries', title: 'Act IV Summary', mdPath: 'Act IV - Secrets of the Ancient/Act IV Summary.md' },
  { group: 'Act Summaries', title: 'Epilogue', mdPath: 'Act IV - Secrets of the Ancient/Epilogue.md' },
  { group: 'Appendices', title: 'Non-Player Characters', mdPath: 'Appendices/Non-Player Characters.md' },
  { group: 'Appendices', title: 'Bestiary', mdPath: 'Appendices/Bestiary.md' },
  { group: 'Appendices', title: 'Amber Shards', mdPath: 'Appendices/Amber Shards.md' },
  { group: 'Appendices', title: 'Glossary', mdPath: 'Appendices/Glossary.md' },
];

export function findArcByMdPath(mdPath: string): ArcDef | undefined {
  return CAMPAIGN_ARCS.find((a) => a.mdPath === mdPath);
}
