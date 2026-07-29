// Ready-made scenes per arc: a named moment, the track that fits it, and the
// ambient beds under it. Pick one and the whole board crossfades — no prep.
//
// Tracks are referenced by TITLE, not id, because ids are derived from the
// downloaded filenames. The first title that resolves against the library wins,
// so a preset still works if one track is missing. Ambient ids come from
// src/data/ambienceConfig.json.
//
// Levels: rain, mist-wind and wolves have two intensities (0 = calm, 1 = heavy).

export interface PresetAmbient {
  id: string;
  /** 0-indexed intensity for multi-level beds. */
  level?: number;
  volume?: number;
}

export interface PresetScene {
  id: string;
  /** Arcs this scene belongs to — a scene can serve several. Empty for generic. */
  arcIds: string[];
  name: string;
  /** When to reach for it. */
  hint?: string;
  /** Candidate track titles, best first. */
  tracks: string[];
  ambients: PresetAmbient[];
  /** Combat scenes want to be obvious in the list. */
  kind?: 'scene' | 'combat';
  /** Grouping label, generic scenes only. */
  category?: string;
}

const S = (
  id: string,
  arcIds: string[],
  name: string,
  hint: string,
  tracks: string[],
  ambients: PresetAmbient[],
  kind: 'scene' | 'combat' = 'scene'
): PresetScene => ({ id, arcIds, name, hint, tracks, ambients, kind });

export const ARC_SCENES: PresetScene[] = [
  // --- Act I ---------------------------------------------------------------
  S('a-daggerford', ['arc-a'], 'Rainy Daggerford', 'The streets before the house takes them',
    ['Into the Mists', 'Out of the Mists'], [{ id: 'rain', level: 0 }]),
  S('a-house', ['arc-a'], 'Death House halls', 'Exploring the townhouse',
    ['Exploring the Death House'], [{ id: 'castle', volume: 55 }, { id: 'rain', level: 0, volume: 45 }]),
  S('a-nursery', ['arc-a'], 'Rose and Thorn', 'The nursery, the children, the attic',
    ['Rose and Thorn'], [{ id: 'castle', volume: 50 }]),
  S('a-dungeon', ['arc-a'], 'The dungeon below', 'Down past the ritual chamber',
    ['Exploring the Death House'], [{ id: 'crypt' }]),
  S('a-fight', ['arc-a'], 'Death House fight', '',
    ['Death House Fight'], [], 'combat'),
  S('a-lorgoth', ['arc-a'], 'The shambling mound', 'Lorgoth in the ritual chamber',
    ['Lorgoth the Decayer'], [], 'combat'),

  S('b-road', ['arc-b', 'arc-c'], 'Old Svalich Road', 'On foot between settlements',
    ['Old Svalich Road', 'Lands of Barovia'],
    [{ id: 'forest-night', volume: 60 }, { id: 'mist-wind', level: 0, volume: 55 }]),
  S('b-barricades', ['arc-b'], 'The barricades', 'Arriving at the fortified village',
    ['Village of Barovia'], [{ id: 'village' }, { id: 'mist-wind', level: 0, volume: 45 }]),
  S('b-tavern', ['arc-b'], 'Blood of the Vine', 'The tavern, Ismark, the villagers',
    ['Blood of the Vine Tavern'], [{ id: 'tavern' }, { id: 'fireplace', volume: 50 }]),
  S('b-siege', ['arc-b'], 'The siege at dusk', 'The horde comes for the barricades',
    ['Encounter in Barovia'], [{ id: 'village', volume: 45 }], 'combat'),
  S('b-church', ['arc-b'], "Donavich and Doru", 'The church and the thing in the basement',
    ['Donavich and Doru'], [{ id: 'church', volume: 60 }, { id: 'crypt', volume: 50 }]),
  S('b-ireena', ['arc-b', 'arc-g'], 'Ireena', 'Her theme, for the quiet moments',
    ['Ireena Kolyana (Theme)', 'Ireena Remembers'], []),

  S('c-strahd-road', ['arc-c'], 'Strahd at the crossroads', 'He rides up to talk',
    ['Strahd von Zarovich'], [{ id: 'mist-wind', level: 1 }]),
  S('c-tser', ['arc-c', 'arc-e'], 'Tser Pool camp', 'Vistani fires and hospitality',
    ['Vistani Campfire'], [{ id: 'fireplace' }, { id: 'forest-night', volume: 55 }]),
  S('c-tarokka', ['arc-c'], 'The Tarokka reading', 'Madam Eva turns the cards',
    ['Tarokka Card Reading'], [{ id: 'graveyard', volume: 55 }, { id: 'fireplace', volume: 45 }]),
  S('c-bonegrinder', ['arc-c'], 'Old Bonegrinder', 'The windmill and the smell of pastries',
    ['Old Bonegrinder'], [{ id: 'windmill' }]),
  S('c-hags', ['arc-c'], 'Fighting the hags', '',
    ['Fighting the Hags'], [{ id: 'windmill', volume: 45 }], 'combat'),
  S('c-vallaki', ['arc-c', 'arc-d', 'arc-e', 'arc-f', 'arc-g', 'arc-h'], 'Vallaki streets',
    'Daylight in town, walking between places',
    ['The Town of Vallaki'], [{ id: 'village' }]),

  // --- Act II --------------------------------------------------------------
  S('d-church', ['arc-d'], "St. Andral's Church", 'Father Lucian, the empty reliquary',
    ["St. Andral's Church (Somber)"], [{ id: 'church' }]),
  S('d-inn', ['arc-d', 'arc-e', 'arc-f'], 'Blue Water Inn', 'Urwin, Danika, Rictavio',
    ['Blue Water Inn'], [{ id: 'tavern' }, { id: 'fireplace', volume: 45 }]),
  S('d-coffin', ['arc-d'], "Coffin maker's shop", 'Henrik, the crates, what waits upstairs',
    ["Blinsky's Toystore"], [{ id: 'crypt', volume: 60 }, { id: 'mist-wind', level: 0, volume: 45 }]),
  S('d-volenta', ['arc-d'], "Volenta's trap", 'The spawn spring the ambush',
    ['Nocturnal Onslaught', 'Vampire Spawn'], [], 'combat'),
  S('d-rahadin', ['arc-d', 'arc-o'], "Rahadin's visit", 'The dusk elf delivers the invitation',
    ['Rahadin Theme'], []),
  S('d-restored', ['arc-d'], 'The bones restored', 'The wards take hold again',
    ["St. Andral's Church (Hopeful)"], [{ id: 'church' }]),

  S('e-blinsky', ['arc-e'], "Blinsky's toy store", 'Buying Arabelle a nameday gift',
    ["Blinsky's Toystore"], [{ id: 'village', volume: 45 }]),
  S('e-lake', ['arc-e'], 'Lake Zarovich', 'The shore, the search, the ice',
    ['Lands of Barovia'], [{ id: 'mist-wind', level: 0 }]),
  S('e-rictavio', ['arc-e'], 'Rictavio', 'The ringmaster holds court',
    ['Rictavio (Theme)'], [{ id: 'tavern', volume: 55 }]),
  S('e-scholar', ['arc-e'], 'The scholar revealed', 'Van Richten behind the mask',
    ['The Scholar', "Van Richten's Tower"], []),
  S('e-keepers', ['arc-e', 'arc-j'], 'Keepers of the Feather', 'Wereravens, quietly watching',
    ['Keepers of the Feather'], []),

  S('f-wachterhaus', ['arc-f'], 'Wachterhaus', 'Fiona Wachter receives them',
    ['Wachterhaus'], [{ id: 'fireplace' }]),
  S('f-cult', ['arc-f'], 'The cult in the cellar', 'Devil-worship under the floorboards',
    ['The End Justifies the Means'], [{ id: 'crypt' }]),
  S('f-mansion', ['arc-f', 'arc-h'], "Baron's mansion", 'Vargas, Victor, the joyless house',
    ["Baron's Mansion"], [{ id: 'fireplace', volume: 50 }]),
  S('f-streets', ['arc-f', 'arc-g'], 'Fight in the streets', '',
    ['Encounter in Vallaki'], [{ id: 'village', volume: 40 }], 'combat'),

  S('g-izek', ['arc-g'], 'Izek Strazni', 'The arm, the dolls, the obsession',
    ['Izek Strazni Theme'], []),
  S('g-festival', ['arc-g'], 'Festival of the Blazing Sun', 'Forced revelry in the square',
    ['Festival of the Blazing Sun'], [{ id: 'village' }]),

  S('h-attic', ['arc-h'], "Victor's attic", 'Arcane experiments above the mansion',
    ['The End Justifies the Means', 'Madhouse'], [{ id: 'castle', volume: 50 }]),
  S('h-stella', ['arc-h'], "Stella's empty body", 'What Victor did to his sister',
    ["Clovin's Viol", 'Vasilka'], []),
  S('h-tome', ['arc-h', 'arc-p'], 'The Tome of Strahd', 'Reading his own account',
    ['The Tome of Strahd'], [{ id: 'fireplace', volume: 45 }]),

  S('i-road-krezk', ['arc-i', 'arc-j'], 'The road west', 'Wagon country between towns',
    ['Lands of Barovia'], [{ id: 'cart-road' }, { id: 'mist-wind', level: 0, volume: 45 }]),
  S('i-krezk', ['arc-i'], 'Gates of Krezk', 'Dmitri, the walls, the refusal',
    ['Krezk'], [{ id: 'village', volume: 55 }]),
  S('i-abbey', ['arc-i', 'arc-k'], 'Abbey of Saint Markovia', 'The serene horror above Krezk',
    ['Abbey of Saint Markovia'], [{ id: 'church' }]),
  S('i-baba', ['arc-i', 'arc-t'], "Baba Lysaga's marsh", 'The witch and her hut',
    ['Witch of the Marsh (Baba Lysaga Theme)'], [{ id: 'swamp' }]),

  // --- Act III -------------------------------------------------------------
  S('j-winery', ['arc-j'], 'Wizard of Wines', 'The vineyard gone quiet',
    ['Wizard of Wines'], [{ id: 'fireplace', volume: 45 }]),
  S('j-martikov', ['arc-j'], 'The Martikovs', 'Family, feathers and wine',
    ['Martikov Family'], [{ id: 'fireplace' }]),
  S('j-blights', ['arc-j'], 'Blights in the vineyard', '',
    ['Wizard of Wines Encounter'], [], 'combat'),
  S('j-yester', ['arc-j', 'arc-t'], 'Yester Hill', 'The druids, the idol, the wind',
    ['Yester Hill'], [{ id: 'mist-wind', level: 1 }, { id: 'forest-night', volume: 50 }]),
  S('j-yester-fight', ['arc-j', 'arc-t'], 'Battle on Yester Hill', '',
    ['Yester Hill Encounter'], [{ id: 'mist-wind', level: 1, volume: 40 }], 'combat'),

  S('k-mongrelfolk', ['arc-k'], 'Mongrelfolk halls', "The Abbey's failed mercies",
    ['Madhouse'], [{ id: 'castle', volume: 55 }]),
  S('k-vasilka', ['arc-k'], 'Vasilka', 'The bride being assembled',
    ['Vasilka'], [{ id: 'church', volume: 45 }]),
  S('k-abbot', ['arc-k'], 'The Abbot', 'Bargaining with a broken angel',
    ['The Abbot'], [{ id: 'church', volume: 50 }]),
  S('k-deva', ['arc-k', 'arc-q'], 'The Abbot unleashed', '',
    ['Deva Encounter'], [], 'combat'),

  S('l-mountain', ['arc-l'], 'Into the mountains', 'Climbing toward the den',
    ['Lands of Barovia'], [{ id: 'forest-night' }, { id: 'wolves', level: 0 }]),
  S('l-den', ['arc-l'], 'The werewolf den', 'Bones, cages, the pack',
    ['Werewolf Den'], [{ id: 'crypt', volume: 55 }, { id: 'wolves', level: 1, volume: 55 }]),
  S('l-pack', ['arc-l', 'arc-q'], 'Pack succession fight', '',
    ['Werewolf Encounter'], [{ id: 'wolves', level: 1, volume: 45 }], 'combat'),

  S('m-approach', ['arc-m', 'arc-q'], 'Argynvostholt', 'The dead mansion on the ridge',
    ['Ruins of Argynvostholt'], [{ id: 'mist-wind', level: 0 }, { id: 'graveyard', volume: 50 }]),
  S('m-halls', ['arc-m', 'arc-q'], 'Manor halls', 'Inside, among the revenants',
    ['Ruins of Argynvostholt'], [{ id: 'castle' }]),
  S('m-vladimir', ['arc-m'], 'Vladimir Horngaard', 'The bitter revenant',
    ['Vladimir Horngaard Theme'], []),
  S('m-godfrey', ['arc-m'], 'Sir Godfrey', 'The one who still hopes',
    ["Sir Godfrey's Undying Love"], []),
  S('m-revenant', ['arc-m'], 'Fighting the revenants', '',
    ['Fighting the Revenant'], [], 'combat'),
  S('m-beacon', ['arc-m', 'arc-q'], 'Order of the Silver Dragon', 'The beacon, the oath, the dawn',
    ['Order of the Silver Dragon'], []),

  S('o-carriage', ['arc-o'], 'Carriage to Ravenloft', 'The black coach, no driver',
    ['Carriage to Castle Ravenloft'], [{ id: 'cart-road', volume: 55 }, { id: 'mist-wind', level: 1 }]),
  S('o-walls', ['arc-o', 'arc-p', 'arc-u'], 'Walls of Ravenloft', 'The approach and the courtyard',
    ['Walls of Ravenloft'], [{ id: 'castle' }, { id: 'mist-wind', level: 1, volume: 45 }]),
  S('o-dinner', ['arc-o'], 'Dinner with Strahd', 'Courtesy, menace, theatre',
    ['Strahd von Zarovich'], [{ id: 'fireplace' }]),
  S('o-brides', ['arc-o', 'arc-p'], "Strahd's brides", 'Anastrasya, Ludmilla, Volenta',
    ["Strahd's Brides Theme"], [{ id: 'castle', volume: 50 }]),
  S('o-tatyana', ['arc-o'], 'The story of Tatyana', 'The grief under all of it',
    ['The Story of Tatyana'], [{ id: 'graveyard', volume: 45 }]),

  S('p-sneaking', ['arc-p', 'arc-u'], 'Sneaking the castle', 'Halls, servants, patrols',
    ['Exploring Castle Ravenloft'], [{ id: 'castle' }]),
  S('p-crypts', ['arc-p'], 'The crypts', 'Rows of Zarovich dead',
    ['Crypts'], [{ id: 'crypt' }]),
  S('p-chapel', ['arc-p'], 'The chapel', 'Under the broken sun window',
    ['Zarovich Fugue'], [{ id: 'church', volume: 55 }, { id: 'castle', volume: 40 }]),
  S('p-caught', ['arc-p'], 'Caught in the act', '',
    ['Vampire Spawn', 'Shadows of Dread'], [], 'combat'),

  // --- Act IV --------------------------------------------------------------
  S('r-pass', ['arc-r'], 'Tsolenka Pass', 'The climb, the wind, the drop',
    ['Exploring Tsolenka Pass'], [{ id: 'blizzard' }]),
  S('r-gate', ['arc-r'], 'The gatehouse', '',
    ['Encounter at Tsolenka Pass'], [{ id: 'blizzard', volume: 45 }], 'combat'),
  S('r-temple-approach', ['arc-r', 'arc-s'], 'Amber Temple doors', 'Arriving at the frozen entrance',
    ['Amber Temple'], [{ id: 'blizzard', volume: 55 }]),

  S('s-halls', ['arc-s'], 'Amber Temple halls', 'Vaults, sarcophagi, whispering amber',
    ['Amber Temple'], [{ id: 'crypt' }]),
  S('s-gifts', ['arc-s'], 'Dark gifts', 'A vestige makes an offer',
    ['Dark Gifts'], [{ id: 'crypt', volume: 45 }]),
  S('s-exethanter', ['arc-s'], 'Exethanter', 'The lich who forgot',
    ["Exethanter's Theme"], [{ id: 'crypt', volume: 45 }]),
  S('s-patrina', ['arc-s'], 'Patrina Velikovna', '',
    ['Amber Temple Encounter'], [], 'combat'),
  S('s-sunsword', ['arc-s'], 'The Sunsword', 'It answers to a rightful hand',
    ['Order of the Silver Dragon'], []),

  S('t-berez', ['arc-t'], 'Ruins of Berez', 'Flooded streets, Marina’s shrine',
    ['Ruins of Berez'], [{ id: 'swamp' }]),
  S('t-berez-fight', ['arc-t'], 'Encounter in Berez', '',
    ['Encounter in Berez'], [{ id: 'swamp', volume: 45 }], 'combat'),
  S('t-lysaga', ['arc-t'], "Baba Lysaga's wrath", '',
    ["Baba Lysaga's Wrath"], [{ id: 'swamp', volume: 40 }], 'combat'),
  S('t-mountain-fane', ['arc-t'], 'Mountain fane', 'The highest of the three',
    ['Exploring Tsolenka Pass'], [{ id: 'blizzard' }]),

  S('u-approach', ['arc-u'], 'The last approach', 'Walking up to it for the final time',
    ['Walls of Ravenloft'], [{ id: 'mist-wind', level: 1 }, { id: 'castle', volume: 50 }]),
  S('u-march', ['arc-u'], 'March of the dead', 'The castle empties itself at them',
    ['March of the Dead'], [{ id: 'castle', volume: 45 }], 'combat'),
  S('u-strahd', ['arc-u'], 'Strahd von Zarovich', 'The duel',
    ['Strahd Battle Theme'], [], 'combat'),
  S('u-prevails', ['arc-u'], 'Strahd prevails', 'When it is going badly',
    ['Strahd Prevails'], []),
  S('u-dawn', ['arc-u'], 'Dawn over Barovia', 'The sun, finally',
    ['Ismark Kolyanovich (Heroic Deeds Theme)', 'Order of the Silver Dragon'], []),
];

export function scenesForArc(arcId: string): PresetScene[] {
  return ARC_SCENES.filter((s) => s.arcIds.includes(arcId));
}

// ---------------------------------------------------------------------------
// Generic scenes — the situations that recur everywhere in Barovia regardless
// of which arc you're in. Travel, rest, an ambush, Strahd turning up uninvited.
// ---------------------------------------------------------------------------

const G = (
  id: string,
  category: string,
  name: string,
  hint: string,
  tracks: string[],
  ambients: PresetAmbient[],
  kind: 'scene' | 'combat' = 'scene'
): PresetScene => ({ id: `g-${id}`, arcIds: [], category, name, hint, tracks, ambients, kind });

export const GENERIC_SCENES: PresetScene[] = [
  G('road-day', 'Travel', 'Road by day', 'Grey light, wet road, nothing yet',
    ['Lands of Barovia', 'Old Svalich Road'],
    [{ id: 'mist-wind', level: 0, volume: 50 }, { id: 'forest-night', volume: 45 }]),
  G('road-night', 'Travel', 'Road after dark', 'The part of the day that belongs to him',
    ['Old Svalich Road', 'Into the Mists'],
    [{ id: 'forest-night' }, { id: 'wolves', level: 0, volume: 55 }, { id: 'mist-wind', level: 0, volume: 45 }]),
  G('wagon', 'Travel', 'Wagon journey', 'Riding, with time to talk',
    ['Lands of Barovia'], [{ id: 'cart-road' }]),
  G('lost-mists', 'Travel', 'Lost in the mists', 'The road stops cooperating',
    ['Into the Mists', 'Out of the Mists'], [{ id: 'mist-wind', level: 1 }]),
  G('blizzard', 'Travel', 'High and freezing', 'Above the treeline',
    ['Exploring Tsolenka Pass'], [{ id: 'blizzard' }]),

  G('camp', 'Rest', 'Camp for the night', 'Fire, watches, quiet conversation',
    ['Vistani Campfire'], [{ id: 'fireplace' }, { id: 'forest-night', volume: 50 }]),
  G('fireside', 'Rest', 'Quiet room, low fire', 'Downtime indoors',
    ['Darkness Remains', 'Vistani Campfire'], [{ id: 'fireplace', volume: 60 }]),
  G('storm-shelter', 'Rest', 'Sheltering from a storm', 'Rain on the roof',
    ['Into the Mists'], [{ id: 'rain', level: 1 }, { id: 'thunder', volume: 45 }, { id: 'fireplace', volume: 50 }]),

  G('tavern', 'Social', 'Tavern in the evening', 'Crowd, drink, rumours',
    ['Blood of the Vine Tavern', 'Blue Water Inn'], [{ id: 'tavern' }, { id: 'fireplace', volume: 45 }]),
  G('village-day', 'Social', 'Village by day', 'Streets, errands, suspicious locals',
    ['The Town of Vallaki', 'Village of Barovia'], [{ id: 'village' }]),
  G('noble-house', 'Social', 'Someone important’s house', 'Being received, and watched',
    ['Wachterhaus', "Baron's Mansion"], [{ id: 'fireplace', volume: 50 }]),
  G('shopping', 'Social', 'Shops and errands', 'Spending money in a place that has none',
    ["Blinsky's Toystore"], [{ id: 'village', volume: 50 }]),

  G('searching', 'Investigation', 'Searching a place', 'Room by room, finding things',
    ['Exploring the Death House'], [{ id: 'castle', volume: 45 }]),
  G('wrong', 'Investigation', "Something's wrong here", 'Before they know why',
    ['The Hanged One', 'Darkness Remains'], [{ id: 'mist-wind', level: 0, volume: 50 }]),
  G('clue', 'Investigation', 'A piece falls into place', 'The moment they work it out',
    ['Keepers of the Feather', 'The Scholar'], []),
  G('crypt', 'Investigation', 'Crypts and tunnels', 'Underground, stone, dripping',
    ['Crypts'], [{ id: 'crypt' }]),
  G('sacred', 'Investigation', 'Sacred ground', 'A church, a shrine, a moment of hope',
    ["St. Andral's Church (Hopeful)", 'Abbey of Saint Markovia'], [{ id: 'church' }]),

  G('stalked', 'Danger', 'Stalked', 'Something is following them',
    ['Old Svalich Road', 'The Hanged One'],
    [{ id: 'wolves', level: 1, volume: 60 }, { id: 'forest-night', volume: 50 }]),
  G('storm-breaks', 'Danger', 'The storm breaks', 'Thunder on cue',
    ['Into the Mists'], [{ id: 'rain', level: 1 }, { id: 'thunder' }]),
  G('watching', 'Danger', 'Strahd is watching', 'He does not need to be present',
    ['Strahd von Zarovich'], [{ id: 'mist-wind', level: 0, volume: 55 }]),
  G('he-appears', 'Danger', 'Strahd appears', 'He walks in and everything stops',
    ['Strahd Prevails', 'Strahd von Zarovich'], []),

  G('skirmish', 'Combat', 'Skirmish', 'Ordinary violence',
    ['Encounter in Barovia', 'Encounter in Vallaki'], [], 'combat'),
  G('ambush', 'Combat', 'Ambush!', 'It starts badly',
    ['Shadows of Dread', 'Bats, Rats and Vermin'], [], 'combat'),
  G('desperate', 'Combat', 'Desperate fight', 'Someone is going to go down',
    ['Nocturnal Onslaught'], [], 'combat'),
  G('horde', 'Combat', 'Undead horde', 'Too many to fight properly',
    ['March of the Dead'], [], 'combat'),
  G('boss', 'Combat', 'Boss fight', 'The big one, not Strahd',
    ['Deva Encounter', 'Lorgoth the Decayer'], [], 'combat'),
  G('strahd-duel', 'Combat', 'Strahd himself', '',
    ['Strahd Battle Theme'], [], 'combat'),

  G('death', 'Aftermath', 'Someone died', 'Give it room',
    ['The Story of Tatyana', 'Darkness Remains'], []),
  G('vigil', 'Aftermath', 'Burial and vigil', 'Standing over a grave',
    ['Zarovich Fugue', "Sir Godfrey's Undying Love"],
    [{ id: 'graveyard', volume: 55 }, { id: 'church', volume: 40 }]),
  G('victory', 'Aftermath', 'They won', 'Grim, earned, still alive',
    ['Ismark Kolyanovich (Heroic Deeds Theme)', 'Order of the Silver Dragon'], []),
];

export const GENERIC_CATEGORIES = [...new Set(GENERIC_SCENES.map((s) => s.category!))];

export function genericScenesByCategory(): { category: string; scenes: PresetScene[] }[] {
  return GENERIC_CATEGORIES.map((category) => ({
    category,
    scenes: GENERIC_SCENES.filter((s) => s.category === category),
  }));
}
