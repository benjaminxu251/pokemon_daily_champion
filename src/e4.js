// Elite Four gauntlet: daily lineup of four type specialists from every generation, Gen 9 rules.
(function () {
  const {TeamGenerators, Dex} = window.PS;
  const Core = window.Core;
  const dex9 = Dex.forGen(9);

  // [id, name, role, type, ace, from]
  const GEN_OF = {'Red and Blue': 1, 'Gold and Silver': 2, 'HeartGold and SoulSilver': 4, 'Ruby and Sapphire': 3, 'Emerald': 3, 'Diamond and Pearl': 4, 'Platinum': 4,
    'Black and White': 5, 'Black 2 and White 2': 5, 'X and Y': 6, 'Sun and Moon': 7, 'Ultra Sun and Ultra Moon': 7, 'Scarlet and Violet': 9, 'The Indigo Disk': 9};
  const MEMBERS = [
    ['agatha', 'Agatha', 'Elite Four', 'Ghost', 'Gengar', 'Red and Blue'],
    ['lorelei', 'Lorelei', 'Elite Four', 'Ice', 'Lapras', 'Red and Blue'],
    ['bruno', 'Bruno', 'Elite Four', 'Fighting', 'Machamp', 'Red and Blue'],
    ['lance', 'Lance', 'Champion', 'Dragon', 'Dragonite', 'HeartGold and SoulSilver'],
    ['will', 'Will', 'Elite Four', 'Psychic', 'Xatu', 'Gold and Silver'],
    ['koga', 'Koga', 'Elite Four', 'Poison', 'Crobat', 'Gold and Silver'],
    ['karen', 'Karen', 'Elite Four', 'Dark', 'Houndoom', 'Gold and Silver'],
    ['sidney', 'Sidney', 'Elite Four', 'Dark', 'Absol', 'Ruby and Sapphire'],
    ['phoebe', 'Phoebe', 'Elite Four', 'Ghost', 'Dusclops', 'Ruby and Sapphire'],
    ['glacia', 'Glacia', 'Elite Four', 'Ice', 'Walrein', 'Ruby and Sapphire'],
    ['drake', 'Drake', 'Elite Four', 'Dragon', 'Salamence', 'Ruby and Sapphire'],
    ['steven', 'Steven', 'Champion', 'Steel', 'Metagross', 'Ruby and Sapphire'],
    ['wallace', 'Wallace', 'Champion', 'Water', 'Milotic', 'Emerald'],
    ['aaron', 'Aaron', 'Elite Four', 'Bug', 'Drapion', 'Diamond and Pearl'],
    ['bertha', 'Bertha', 'Elite Four', 'Ground', 'Hippowdon', 'Diamond and Pearl'],
    ['flint', 'Flint', 'Elite Four', 'Fire', 'Infernape', 'Diamond and Pearl'],
    ['lucian', 'Lucian', 'Elite Four', 'Psychic', 'Gallade', 'Diamond and Pearl'],
    ['shauntal', 'Shauntal', 'Elite Four', 'Ghost', 'Chandelure', 'Black and White'],
    ['grimsley', 'Grimsley', 'Elite Four', 'Dark', 'Bisharp', 'Black and White'],
    ['caitlin', 'Caitlin', 'Elite Four', 'Psychic', 'Gothitelle', 'Black and White'],
    ['marshal', 'Marshal', 'Elite Four', 'Fighting', 'Conkeldurr', 'Black and White'],
    ['iris', 'Iris', 'Champion', 'Dragon', 'Haxorus', 'Black 2 and White 2'],
    ['malva', 'Malva', 'Elite Four', 'Fire', 'Talonflame', 'X and Y'],
    ['siebold', 'Siebold', 'Elite Four', 'Water', 'Barbaracle', 'X and Y'],
    ['wikstrom', 'Wikstrom', 'Elite Four', 'Steel', 'Aegislash', 'X and Y'],
    ['drasna', 'Drasna', 'Elite Four', 'Dragon', 'Noivern', 'X and Y'],
    ['hala', 'Hala', 'Elite Four', 'Fighting', 'Crabominable', 'Sun and Moon'],
    ['olivia', 'Olivia', 'Elite Four', 'Rock', 'Lycanroc-Midnight', 'Sun and Moon'],
    ['acerola', 'Acerola', 'Elite Four', 'Ghost', 'Palossand', 'Sun and Moon'],
    ['kahili', 'Kahili', 'Elite Four', 'Flying', 'Toucannon', 'Sun and Moon'],
    ['molayne', 'Molayne', 'Elite Four', 'Steel', 'Dugtrio-Alola', 'Ultra Sun and Ultra Moon'],
    ['rika', 'Rika', 'Elite Four', 'Ground', 'Clodsire', 'Scarlet and Violet'],
    ['poppy', 'Poppy', 'Elite Four', 'Steel', 'Tinkaton', 'Scarlet and Violet'],
    ['larry', 'Larry', 'Elite Four', 'Flying', 'Flamigo', 'Scarlet and Violet'],
    ['hassel', 'Hassel', 'Elite Four', 'Dragon', 'Baxcalibur', 'Scarlet and Violet'],
    ['crispin', 'Crispin', 'Elite Four', 'Fire', 'Blaziken', 'The Indigo Disk'],
    ['amarys', 'Amarys', 'Elite Four', 'Steel', 'Metagross', 'The Indigo Disk'],
    ['lacey', 'Lacey', 'Elite Four', 'Fairy', 'Excadrill', 'The Indigo Disk'],
    ['drayton', 'Drayton', 'Elite Four', 'Dragon', 'Archaludon', 'The Indigo Disk'],
  ].map(([id, name, role, type, ace, from]) => {
    // generation the trainer debuted in (Lance's team comes from HGSS, but he debuted in Gen 1)
    const gen = id === 'lance' ? 1 : GEN_OF[from];
    return {id, name, role, type, ace, from, gen, title: `${role} ${name}`, label: `${name} (Gen ${gen})`, titleGen: `${role} ${name} (Gen ${gen})`};
  });

  // Aces without a Gen 9 Random Battle set get a hand-built one.
  const IV = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
  const EV = (o) => Object.assign({hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, o);
  const PHYS = EV({hp: 4, atk: 252, spe: 252}), SPEC = EV({hp: 4, spa: 252, spe: 252});
  const HAND = {
    Machamp: {item: 'Life Orb', ability: 'No Guard', nature: 'Adamant', moves: ['Dynamic Punch', 'Knock Off', 'Stone Edge', 'Bullet Punch'], evs: PHYS},
    Xatu: {item: 'Heavy-Duty Boots', ability: 'Magic Bounce', nature: 'Timid', moves: ['Psychic', 'Heat Wave', 'Roost', 'U-turn'], evs: SPEC},
    Crobat: {item: 'Heavy-Duty Boots', ability: 'Infiltrator', nature: 'Jolly', moves: ['Brave Bird', 'Cross Poison', 'Roost', 'U-turn'], evs: PHYS},
    Absol: {item: 'Life Orb', ability: 'Super Luck', nature: 'Adamant', moves: ['Swords Dance', 'Knock Off', 'Sucker Punch', 'Play Rough'], evs: PHYS},
    Dusclops: {item: 'Eviolite', ability: 'Frisk', nature: 'Relaxed', moves: ['Night Shade', 'Will-O-Wisp', 'Pain Split', 'Shadow Sneak'], evs: EV({hp: 252, def: 252, spd: 4})},
    Walrein: {item: 'Leftovers', ability: 'Thick Fat', nature: 'Bold', moves: ['Ice Beam', 'Surf', 'Super Fang', 'Roar'], evs: EV({hp: 252, def: 252, spa: 4})},
    Drapion: {item: 'Leftovers', ability: 'Sniper', nature: 'Adamant', moves: ['Swords Dance', 'Knock Off', 'Poison Jab', 'Earthquake'], evs: PHYS},
    Barbaracle: {item: 'White Herb', ability: 'Tough Claws', nature: 'Adamant', moves: ['Shell Smash', 'Stone Edge', 'Liquidation', 'Cross Chop'], evs: PHYS},
    Aegislash: {item: 'Leftovers', ability: 'Stance Change', nature: 'Quiet', moves: ['King\'s Shield', 'Shadow Ball', 'Flash Cannon', 'Shadow Sneak'], evs: EV({hp: 252, spa: 252, atk: 4})},
    Aerodactyl: {item: 'Focus Sash', ability: 'Unnerve', nature: 'Jolly', moves: ['Stealth Rock', 'Stone Edge', 'Earthquake', 'Dual Wingbeat'], evs: PHYS},
  };
  // Trainers whose signature lineup replaces the daily type draw (the ace is still added last).
  // Lance: his classic HeartGold/SoulSilver core (Gyarados, Aerodactyl, Charizard) plus the Dragons
  // from his rematch team. His real teams were never mostly Dragon type.
  const FIXED = {lance: ['Gyarados', 'Aerodactyl', 'Charizard', 'Salamence', 'Garchomp']};

  function rng(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  }
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function seedWords(str) { const r = rng(str); return [0, 0, 0, 0].map(() => Math.floor(r() * 65536)); }

  // four distinct types, one trainer per type, champions fight last
  function lineup(day) {
    const r = rng('e4|' + day);
    const types = shuffle([...new Set(MEMBERS.map((m) => m.type))], r).slice(0, 4);
    const picks = types.map((t) => { const opts = MEMBERS.filter((m) => m.type === t); return opts[Math.floor(r() * opts.length)]; });
    return picks.sort((a, b) => (a.role === 'Champion') - (b.role === 'Champion'));
  }

  function clean(s) {
    const c = {name: s.name || s.species, species: s.species, item: s.item, ability: s.ability, nature: s.nature || 'Hardy',
      moves: s.moves.map((m) => dex9.moves.get(m).name), evs: s.evs, ivs: s.ivs || IV, level: 100, gender: s.gender || ''};
    return c;
  }
  // the member's team: five Gen 9 random-battle Pokémon of their type, then their ace
  function team(day, m) {
    const g = Core.generator('gen9randombattle');
    g.setSeed(seedWords('e4team|' + day + '|' + m.id));
    const aceBase = dex9.species.get(m.ace).baseSpecies;
    const pool = Object.keys(g.randomSets).filter((id) => {
      const sp = dex9.species.get(id);
      const legend = (sp.tags || []).some((t) => ['Restricted Legendary', 'Sub-Legendary', 'Mythical'].includes(t));
      return sp.exists && sp.types.includes(m.type) && sp.baseSpecies !== aceBase && !sp.battleOnly && !legend;
    });
    const r = rng('e4pool|' + day + '|' + m.id);
    const out = [], bases = new Set([aceBase]);
    const handSet = (sp) => Object.assign({name: dex9.species.get(sp).baseSpecies, species: sp, ivs: IV, level: 100}, HAND[sp]);
    for (const sp of FIXED[m.id] || []) {
      out.push(g.randomSets[dex9.species.get(sp).id] ? clean(g.randomSet(sp, {}, out.length === 0)) : handSet(sp));
    }
    for (const id of FIXED[m.id] ? [] : shuffle(pool, r)) {
      if (out.length === 5) break;
      const sp = dex9.species.get(id);
      if (bases.has(sp.baseSpecies)) continue;
      try { out.push(clean(g.randomSet(sp.name, {}, out.length === 0))); bases.add(sp.baseSpecies); } catch (e) { /* skip */ }
    }
    let ace;
    const aceId = dex9.species.get(m.ace).id;
    if (g.randomSets[aceId]) ace = clean(g.randomSet(m.ace, {}, false));
    else ace = handSet(m.ace);
    out.push(ace);
    return Core.withLevels(out);
  }

  // an opponent descriptor shaped like Core.OPP entries
  function asOpp(m) {
    return {id: 'e4-' + m.id, member: m, name: m.name, title: m.title, gen: 9, randFormat: 'gen9randombattle', format: 'gen9customgame',
      foe: 'The opposing ', skin: 'sv', place: m.from, mechanics: 'Gen IX', origin: m.from};
  }
  const PLAYER = {id: 'e4', randFormat: 'gen9randombattle'};

  window.E4 = {MEMBERS, lineup, team, asOpp, PLAYER};
})();
