// Campaign sections in rough play order (per Curse of Strahd: Reloaded).
// Tracks reference these via Track.section; anything unknown sorts last.
export const SECTIONS = [
  'Death House',
  'Village of Barovia',
  'Tser Pool & Vistani',
  'Roads & Travel',
  'Old Bonegrinder',
  'Vallaki',
  'Wizard of Wines & Yester Hill',
  'Berez',
  'Krezk & the Abbey',
  'Werewolf Den',
  'Argynvostholt',
  'Van Richten & Ezmerelda',
  'Tsolenka Pass & Amber Temple',
  'Castle Ravenloft',
  'Strahd',
  'General & Compilations',
] as const;

export const MOODS = [
  'combat',
  'boss',
  'exploration',
  'social',
  'tavern',
  'sacred',
  'festive',
  'somber',
  'creepy',
  'mystery',
  'epic',
  'theme',
] as const;

export function sectionOrder(section: string | undefined): number {
  if (!section) return SECTIONS.length;
  const i = (SECTIONS as readonly string[]).indexOf(section);
  return i === -1 ? SECTIONS.length : i;
}
