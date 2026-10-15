// Battle Factory: rent 3 of 6, battle 3v3, swap after each win, keep the streak going.
// Sets are Showdown's Gen 9 Battle Factory sets (vendor/factory-sets.js) for the tier the player picks. No DOM.
(function () {
  const Core = window.Core;
  if (!window.FACTORY_SETS) throw new Error('Factory: vendor/factory-sets.js is not loaded');
  const TIERS = Object.keys(window.FACTORY_SETS); // Uber, OU, UU, RU, NU, PU
  const ROUND = 7; // battles per round, like Emerald
  const HEAD_AT = [21, 42]; // Factory Head battles (1-based), like Emerald's Silver and Gold symbols

  function gen(tier, seed) {
    if (!TIERS.includes(tier)) throw new Error('Factory: unknown tier ' + tier);
    const g = Core.generator('gen9randombattle');
    g.randomFactorySets = window.FACTORY_SETS;
    g.factoryTier = tier;
    g.setSeed(Core.hashSeed(seed));
    return g;
  }
  const clean = (s) => { const c = Object.assign({}, s, {level: 100}); delete c.teraType; return c; };

  // Six rentals for a new run: one synergy-built Showdown factory team.
  function rentals(tier, runId) {
    return gen(tier, 'rent|' + runId).randomFactoryTeam({}).map(clean);
  }
  // One set drawn straight from the tier's pool: species by Showdown's species weight, then a set by its weight,
  // then one option per move slot, item, ability and nature. No team-building or synergy step.
  const pickW = (r, items, w) => { let x = r() * items.reduce((t, i) => t + w(i), 0); for (const i of items) if ((x -= w(i)) < 0) return i; return items[items.length - 1]; };
  const one = (r, v) => Array.isArray(v) ? v[Math.floor(r() * v.length)] : v;
  function randomSet(tier, r, avoid) {
    const pool = Object.entries(window.FACTORY_SETS[tier]).filter(([, d]) => !d.sets.some((s) => avoid.has(baseOf(s.species))));
    const [, d] = pickW(r, pool, ([, x]) => x.weight || 1);
    const s = pickW(r, d.sets, (x) => x.weight || 1);
    const moves = [];
    for (const slot of s.moves) { const opts = slot.filter((m) => !moves.includes(m)); if (opts.length) moves.push(one(r, opts)); }
    return {name: s.species.replace(/-.*/, ''), species: s.species, gender: s.gender || '', item: one(r, s.item), ability: one(r, s.ability), nature: one(r, s.nature),
      evs: Object.assign({hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, s.evs), ivs: Object.assign({hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, s.ivs), moves, level: 100};
  }
  const baseOf = (sp) => Core.dexFor(9).species.get(sp).baseSpecies;
  // The opponent for battle n (0-based): three random sets from the tier, never sharing a species with the player or each other.
  function opponent(tier, runId, n, mine) {
    const avoid = new Set(mine.map((s) => baseOf(s.species)));
    const rs = rand('opp|' + tier + '|' + runId + '|' + n), team = [];
    while (team.length < 3) { const s = randomSet(tier, rs, avoid); avoid.add(baseOf(s.species)); team.push(s); }
    const r = rand('trainer|' + runId + '|' + n);
    const head = HEAD_AT.includes(n + 1);
    const cls = head ? null : CLASSES[Math.floor(r() * CLASSES.length)];
    const name = head ? 'Noland' : NAMES[cls[2]][Math.floor(r() * NAMES[cls[2]].length)];
    return {
      sets: team, head,
      trainer: head ? {name, title: 'Factory Head Noland', sprite: 'noland-gen3'} : {name, title: `${cls[1]} ${name}`, sprite: cls[0] + '-gen3'},
    };
  }

  // Emerald's pre-battle hint: the opponent's most common type and battle style.
  const SETUP = new Set(['swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'bulkup', 'quiverdance', 'shellsmash', 'agility', 'irondefense', 'coil', 'bellydrum', 'shiftgear', 'victorydance', 'tidyup', 'curse', 'growth', 'workup', 'tailglow', 'filletaway']);
  const STATUS = new Set(['willowisp', 'thunderwave', 'toxic', 'spore', 'sleeppowder', 'yawn', 'glare', 'nuzzle', 'hypnosis', 'stunspore', 'toxicspikes', 'taunt', 'encore', 'trick', 'switcheroo']);
  const SUPPORT = new Set(['stealthrock', 'spikes', 'stickyweb', 'defog', 'rapidspin', 'mortalspin', 'uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport', 'reflect', 'lightscreen', 'healbell', 'wish', 'roar', 'whirlwind', 'dragontail', 'knockoff', 'haze', 'clearsmog']);
  const RECOVER = new Set(['recover', 'roost', 'slackoff', 'softboiled', 'moonlight', 'morningsun', 'synthesis', 'shoreup', 'strengthsap', 'milkdrink', 'rest', 'painsplit', 'leechseed', 'protect', 'substitute']);
  function hint(sets, dex) {
    const types = {};
    for (const s of sets) for (const t of dex.species.get(s.species).types) types[t] = (types[t] || 0) + 1;
    const type = Object.entries(types).sort((a, b) => b[1] - a[1])[0][0];
    const n = {setup: 0, status: 0, support: 0, recover: 0, attack: 0};
    for (const s of sets) for (const m of s.moves) {
      const id = dex.moves.get(m).id;
      if (SETUP.has(id)) n.setup++; else if (STATUS.has(id)) n.status++; else if (SUPPORT.has(id)) n.support++; else if (RECOVER.has(id)) n.recover++; else n.attack++;
    }
    const style = n.setup >= 2 ? 'Likes to boost its stats before attacking.'
      : n.status >= 2 ? 'Weakens foes with status conditions.'
      : n.support >= 3 ? 'Controls the field with hazards and pivoting.'
      : n.recover >= 3 ? 'Plays the long game and outlasts foes.'
      : n.attack >= 10 ? 'Relies on raw power, all-out attacks.'
      : 'Free-spirited and hard to predict.';
    return {type, style};
  }

  // Emerald-style trainer classes with Showdown Gen 3 sprites: [sprite id, class name, name list].
  const CLASSES = [
    ['acetrainer', 'Cooltrainer', 'm'], ['acetrainerf', 'Cooltrainer', 'f'], ['battlegirl', 'Battle Girl', 'f'], ['beauty', 'Beauty', 'f'],
    ['birdkeeper', 'Bird Keeper', 'm'], ['blackbelt', 'Black Belt', 'm'], ['bugmaniac', 'Bug Maniac', 'm'], ['camper', 'Camper', 'm'],
    ['collector', 'Collector', 'm'], ['dragontamer', 'Dragon Tamer', 'm'], ['expert', 'Expert', 'm'], ['expertf', 'Expert', 'f'],
    ['fisherman', 'Fisherman', 'm'], ['gentleman', 'Gentleman', 'm'], ['guitarist', 'Guitarist', 'm'], ['hexmaniac', 'Hex Maniac', 'f'],
    ['hiker', 'Hiker', 'm'], ['kindler', 'Kindler', 'm'], ['lady', 'Lady', 'f'], ['lass', 'Lass', 'f'], ['ninjaboy', 'Ninja Boy', 'm'],
    ['painter', 'Painter', 'f'], ['parasollady', 'Parasol Lady', 'f'], ['picnicker', 'Picnicker', 'f'], ['pokefan', 'Poké Fan', 'm'],
    ['pokefanf', 'Poké Fan', 'f'], ['pokemaniac', 'PokéManiac', 'm'], ['pokemonbreeder', 'Pokémon Breeder', 'm'], ['pokemonbreederf', 'Pokémon Breeder', 'f'],
    ['pokemonranger', 'Pokémon Ranger', 'm'], ['pokemonrangerf', 'Pokémon Ranger', 'f'], ['psychic', 'Psychic', 'm'], ['psychicf', 'Psychic', 'f'],
    ['richboy', 'Rich Boy', 'm'], ['ruinmaniac', 'Ruin Maniac', 'm'], ['sailor', 'Sailor', 'm'], ['schoolkid', 'School Kid', 'm'],
    ['schoolkidf', 'School Kid', 'f'], ['supernerd', 'Super Nerd', 'm'], ['swimmerm', 'Swimmer', 'm'], ['swimmerf', 'Swimmer', 'f'],
    ['triathleterunnerm', 'Triathlete', 'm'], ['triathleterunnerf', 'Triathlete', 'f'], ['youngster', 'Youngster', 'm'],
  ];
  const NAMES = {
    m: ['Alex', 'Ben', 'Caleb', 'Dane', 'Eli', 'Felix', 'Gavin', 'Hugo', 'Ian', 'Jace', 'Kai', 'Leo', 'Milo', 'Nate', 'Owen', 'Parker', 'Quinn', 'Reid', 'Sam', 'Theo', 'Victor', 'Wade', 'Xavier', 'Yuri', 'Zane'],
    f: ['Abby', 'Bella', 'Cora', 'Dana', 'Elena', 'Faye', 'Gwen', 'Hana', 'Iris', 'Jade', 'Kira', 'Lena', 'Mia', 'Nina', 'Opal', 'Piper', 'Rosa', 'Sara', 'Tess', 'Uma', 'Vera', 'Wren', 'Yara', 'Zoe'],
  };
  function rand(s) {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }

  // Opponent descriptor shaped like Core.OPP entries. Emerald look by default.
  function asOpp(o) {
    return {id: 'factory', factory: o, name: o.trainer.name, title: o.trainer.title, sprite: o.trainer.sprite, gen: 9, randFormat: 'gen9randombattle',
      format: 'gen9customgame', foe: 'The opposing ', skin: 'gen3', place: 'Battle Factory', mechanics: 'Gen IX', origin: 'Battle Factory'};
  }

  window.Factory = {TIERS, ROUND, HEAD_AT, rentals, opponent, hint, asOpp};
})();
