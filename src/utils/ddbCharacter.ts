import type { AbilityKey, DerivedStats } from '../types';

// D&D Beyond's character JSON carries no computed AC, passive scores or save
// DCs — the sheet derives them in the browser. This does the same derivation.
//
// Calibrated against a real sheet (Cleric 4, Half Plate + Shield, Wisdom feat):
// abilities 7/12/18/16/19/14, AC 18, initiative +1, passives 16/13/16. Each of
// those is reproduced exactly by the code below.
//
// Two things learned from that payload, both easy to get wrong:
//  - Ability modifiers are ADDITIVE on top of `stats`; they are not pre-baked.
//  - `choose-an-ability-score` modifiers with a null statId are unselected
//    choice scaffolding. DDB itself does not apply them, so neither do we —
//    counting them inflated Wisdom by 2.

const ABILITY_ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** DDB stat ids are 1-6 in the order above. */
const ABILITY_BY_ID: Record<number, AbilityKey> = {
  1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha',
};

const ABILITY_NAMES: Record<string, AbilityKey> = {
  strength: 'str', dexterity: 'dex', constitution: 'con',
  intelligence: 'int', wisdom: 'wis', charisma: 'cha',
};

/** Ability a skill keys off. */
const SKILL_ABILITY = { perception: 'wis', investigation: 'int', insight: 'wis' } as const;

const ARMOR_TYPE = { LIGHT: 1, MEDIUM: 2, HEAVY: 3, SHIELD: 4 } as const;
const MEDIUM_ARMOR_DEX_CAP = 2;

interface DdbStat { id: number; value: number | null }
interface DdbModifier {
  type?: string;
  subType?: string;
  value?: number | null;
  statId?: number | null;
}
interface DdbItem {
  equipped?: boolean;
  definition?: {
    armorClass?: number | null;
    armorTypeId?: number | null;
    name?: string;
    baseArmorName?: string | null;
  };
}
export interface DdbCharacterPayload {
  stats?: DdbStat[];
  bonusStats?: DdbStat[];
  overrideStats?: DdbStat[];
  modifiers?: Record<string, DdbModifier[]>;
  classes?: { level?: number; definition?: { name?: string; spellCastingAbilityId?: number | null };
              subclassDefinition?: { name?: string; spellCastingAbilityId?: number | null } }[];
  inventory?: DdbItem[];
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** 5e proficiency bonus from total character level. */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor(Math.max(1, level - 1) / 4);
}

function allModifiers(payload: DdbCharacterPayload): DdbModifier[] {
  return Object.values(payload.modifiers ?? {}).flat();
}

/** stats + bonusStats + additive modifiers, with overrideStats winning outright. */
function abilityScores(payload: DdbCharacterPayload, mods: DdbModifier[]): Record<AbilityKey, number> {
  const scores = {} as Record<AbilityKey, number>;
  const byId = (list: DdbStat[] | undefined, id: number) =>
    list?.find((s) => s.id === id)?.value ?? null;

  ABILITY_ORDER.forEach((key, i) => {
    const id = i + 1;
    const override = byId(payload.overrideStats, id);
    if (override != null) { scores[key] = override; return; }
    scores[key] = (byId(payload.stats, id) ?? 10) + (byId(payload.bonusStats, id) ?? 0);
  });

  for (const m of mods) {
    if (m.type !== 'bonus' || m.value == null) continue;
    // "wisdom-score" style, or a statId when DDB names the target that way
    const named = m.subType?.endsWith('-score')
      ? ABILITY_NAMES[m.subType.replace(/-score$/, '')]
      : undefined;
    const target = named ?? (m.statId != null ? ABILITY_BY_ID[m.statId] : undefined);
    // Unresolved "choose-an-ability-score" has no target — DDB doesn't apply it
    if (!target) continue;
    scores[target] += m.value;
  }

  return scores;
}

function sumBonuses(mods: DdbModifier[], subType: string): number {
  return mods
    .filter((m) => m.type === 'bonus' && m.subType === subType && m.value != null)
    .reduce((total, m) => total + (m.value ?? 0), 0);
}

function hasModifier(mods: DdbModifier[], type: string, subType: string): boolean {
  return mods.some((m) => m.type === type && m.subType === subType);
}

/** 10 + ability mod + proficiency (doubled for expertise) + passive bonuses. */
function passiveScore(
  skill: keyof typeof SKILL_ABILITY,
  scores: Record<AbilityKey, number>,
  mods: DdbModifier[],
  prof: number
): number {
  const mod = abilityModifier(scores[SKILL_ABILITY[skill]]);
  const expertise = hasModifier(mods, 'expertise', skill);
  const proficient = expertise || hasModifier(mods, 'proficiency', skill);
  const profPart = expertise ? prof * 2 : proficient ? prof : 0;
  return 10 + mod + profPart + sumBonuses(mods, `passive-${skill}`);
}

/**
 * AC from equipped armor. Unarmoured casters and Monk/Barbarian unarmored
 * defence are reported with a note rather than a confident wrong number.
 */
function armorClass(
  payload: DdbCharacterPayload,
  scores: Record<AbilityKey, number>,
  mods: DdbModifier[]
): { value: number; note: string; uncertain: boolean } {
  const dex = abilityModifier(scores.dex);
  const bonus = sumBonuses(mods, 'armor-class');

  const equipped = (payload.inventory ?? []).filter(
    (i) => i.equipped && i.definition?.armorClass != null
  );
  const shields = equipped.filter((i) => i.definition?.armorTypeId === ARMOR_TYPE.SHIELD);
  const body = equipped.find((i) => i.definition?.armorTypeId !== ARMOR_TYPE.SHIELD);
  const shieldAc = shields.reduce((t, s) => t + (s.definition?.armorClass ?? 0), 0);

  if (body) {
    const base = body.definition?.armorClass ?? 10;
    const typeId = body.definition?.armorTypeId ?? ARMOR_TYPE.LIGHT;
    const dexPart =
      typeId === ARMOR_TYPE.HEAVY ? 0
      : typeId === ARMOR_TYPE.MEDIUM ? Math.min(dex, MEDIUM_ARMOR_DEX_CAP)
      : dex;
    const parts = [`${body.definition?.name ?? 'armor'} ${base}`];
    if (dexPart) parts.push(`DEX ${dexPart >= 0 ? '+' : ''}${dexPart}`);
    if (shieldAc) parts.push(`shield +${shieldAc}`);
    if (bonus) parts.push(`bonus +${bonus}`);
    return { value: base + dexPart + shieldAc + bonus, note: parts.join(' · '), uncertain: false };
  }

  // No body armor: could be unarmored defence, mage armor, or just unarmoured
  const classNames = (payload.classes ?? []).map((c) => c.definition?.name?.toLowerCase() ?? '');
  const monk = classNames.includes('monk');
  const barbarian = classNames.includes('barbarian');
  const extra = monk ? abilityModifier(scores.wis) : barbarian ? abilityModifier(scores.con) : 0;
  const label = monk ? 'WIS' : barbarian ? 'CON' : null;

  const parts = ['unarmoured 10', `DEX ${dex >= 0 ? '+' : ''}${dex}`];
  if (label) parts.push(`${label} +${extra}`);
  if (shieldAc) parts.push(`shield +${shieldAc}`);
  if (bonus) parts.push(`bonus +${bonus}`);

  return {
    value: 10 + dex + extra + shieldAc + bonus,
    note: parts.join(' · ') + (label ? ' (unarmoured defence)' : ''),
    // Nothing here accounts for mage armor or similar — say so rather than imply precision
    uncertain: true,
  };
}

/** Highest save DC across spellcasting classes: 8 + prof + casting ability mod. */
function spellSaveDc(
  payload: DdbCharacterPayload,
  scores: Record<AbilityKey, number>,
  prof: number
): number | null {
  const dcs = (payload.classes ?? [])
    .map((c) => c.subclassDefinition?.spellCastingAbilityId ?? c.definition?.spellCastingAbilityId)
    .filter((id): id is number => id != null)
    .map((id) => 8 + prof + abilityModifier(scores[ABILITY_BY_ID[id]] ?? 10));
  return dcs.length > 0 ? Math.max(...dcs) : null;
}

export function deriveStats(payload: DdbCharacterPayload): DerivedStats {
  const mods = allModifiers(payload);
  const scores = abilityScores(payload, mods);
  const level = (payload.classes ?? []).reduce((sum, c) => sum + (c.level ?? 0), 0);
  const prof = proficiencyBonus(level);
  const ac = armorClass(payload, scores, mods);

  return {
    abilities: scores,
    proficiencyBonus: prof,
    armorClass: ac.value,
    armorClassNote: ac.note,
    armorClassUncertain: ac.uncertain,
    initiative: abilityModifier(scores.dex) + sumBonuses(mods, 'initiative'),
    passivePerception: passiveScore('perception', scores, mods, prof),
    passiveInvestigation: passiveScore('investigation', scores, mods, prof),
    passiveInsight: passiveScore('insight', scores, mods, prof),
    spellSaveDc: spellSaveDc(payload, scores, prof),
  };
}
