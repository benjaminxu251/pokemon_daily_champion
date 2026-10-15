// Core game logic: no DOM. Exposes window.Core.
(function () {
  const {Battle, Dex, TeamGenerators} = window.PS;
  const dex = Dex.forGen(4);

  const EV = (o) => Object.assign({hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, o);
  const IV = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
  const set = (species, item, ability, nature, moves, evs, extra) => Object.assign({name: species.replace(/-.*/, ''), species, item, ability, nature, moves, evs: EV(evs), level: 100, ivs: IV}, extra || {});
  const PHYS = {hp: 4, atk: 252, spe: 252}, SPEC = {hp: 4, spa: 252, spe: 252};

  // Signature pools. Each day draws 5 from the pool, the ace always closes.
  const CYNTHIA_POOL = [
    set('Spiritomb', 'Leftovers', 'Pressure', 'Careful', ['Shadow Ball', 'Dark Pulse', 'Will-O-Wisp', 'Pain Split'], {hp: 252, def: 4, spd: 252}),
    set('Roserade', 'Black Sludge', 'Natural Cure', 'Timid', ['Leaf Storm', 'Sludge Bomb', 'Shadow Ball', 'Sleep Powder'], SPEC),
    set('Togekiss', 'Leftovers', 'Serene Grace', 'Timid', ['Air Slash', 'Aura Sphere', 'Thunder Wave', 'Roost'], {hp: 252, spa: 4, spe: 252}),
    set('Lucario', 'Life Orb', 'Inner Focus', 'Adamant', ['Swords Dance', 'Close Combat', 'Extreme Speed', 'Crunch'], PHYS),
    set('Milotic', 'Leftovers', 'Marvel Scale', 'Bold', ['Surf', 'Ice Beam', 'Recover', 'Mirror Coat'], {hp: 252, def: 252, spa: 4}),
    set('Gastrodon', 'Leftovers', 'Storm Drain', 'Relaxed', ['Earthquake', 'Surf', 'Recover', 'Toxic'], {hp: 252, def: 252, atk: 4}),
    set('Glaceon', 'Choice Specs', 'Snow Cloak', 'Modest', ['Blizzard', 'Ice Beam', 'Shadow Ball', 'Hidden Power Fire'], {hp: 4, spa: 252, spe: 252}, {ivs: Object.assign({}, IV, {atk: 30, spa: 30, spe: 30})}),
    set('Garchomp', 'Yache Berry', 'Sand Veil', 'Jolly', ['Swords Dance', 'Outrage', 'Earthquake', 'Stone Edge'], PHYS, {ace: true}),
  ];
  // Cynthia's Platinum team, in game order; Garchomp is her ace.
  const CYNTHIA = ['Spiritomb', 'Roserade', 'Togekiss', 'Lucario', 'Milotic', 'Garchomp'].map((n) => CYNTHIA_POOL.find((m) => m.species === n));

  const OPP = {
    cynthia: {id: 'cynthia', name: 'Cynthia', title: 'Champion Cynthia', gen: 4, randFormat: 'gen4randombattle', format: 'gen4customgame',
      team: CYNTHIA, origin: 'Platinum', levels: {easy: 100, hard: 100}, foe: "The foe's ", skin: 'dppt', place: 'Sinnoh League', mechanics: 'Gen IV'},
  };
  const dexes = {};
  const dexFor = (gen) => dexes[gen] || (dexes[gen] = Dex.forGen(gen));

  function hashSeed(str) {
    // four 16-bit words, like PS's classic PRNG seed
    const out = [];
    let h = 2166136261;
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i) + k * 31; h = Math.imul(h, 16777619) >>> 0; }
      out.push(h & 0xffff);
    }
    return out;
  }
  function seededRand(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  }

  // the player's team: independent per opponent and per day
  function playerTeam(seedStr, opp = OPP.cynthia) {
    const g = TeamGenerators.getTeamGenerator(opp.randFormat);
    g.setSeed(hashSeed('team|' + opp.id + '|' + seedStr));
    return g.getTeam().map((s) => Object.assign({}, s, {level: 100}));
  }
  // the opponent's team: her team from her original game, same lead and ace every day
  function oppTeam(seedStr, opp = OPP.cynthia) {
    return opp.team.map((m) => Object.assign({}, m));
  }

  function newBattle(seedStr, team, leadIdx, level = 100, opp = OPP.cynthia, foeTeam = null) {
    const t = team.slice();
    const [lead] = t.splice(leadIdx, 1);
    t.unshift(lead);
    const ft = foeTeam || oppTeam(seedStr, opp);
    const b = new Battle({
      formatid: opp.format,
      seed: hashSeed('battle|' + opp.id + '|' + seedStr),
      p1: {name: 'You', team: t},
      p2: {name: opp.name, team: ft.map((m) => { const c = Object.assign({}, m, {level}); delete c.ace; return c; })},
    });
    // Gen 5+ formats open with team preview; the lead is already set by team order
    if (b.p1.activeRequest && b.p1.activeRequest.teamPreview) { b.choose('p1', 'default'); b.choose('p2', 'default'); }
    return b;
  }

  // ---------- AI ----------
  const STATUS_VAL = {
    'willowisp': (me, foe) => !foe.status && !foe.hasType('Fire') && foe.storedStats.atk > foe.storedStats.spa ? 0.45 : 0,
    'thunderwave': (me, foe) => !foe.status && !foe.hasType('Ground') && statOf(foe, 'spe') >= statOf(me, 'spe') * 0.8 ? 0.4 : 0,
    'sleeppowder': (me, foe, b) => !foe.status && !b.p1.pokemon.some((p) => p.status === 'slp') ? 0.6 : 0,
    'recover': (me) => me.hp / me.maxhp < 0.5 ? 0.55 : 0,
    'roost': (me) => me.hp / me.maxhp < 0.5 ? 0.55 : 0,
    'painsplit': (me, foe) => me.hp / me.maxhp < 0.5 && foe.hp > me.hp * 1.4 ? 0.5 : 0,
    'swordsdance': (me) => me.hp / me.maxhp > 0.7 && (me.boosts.atk || 0) < 2 ? 0.5 : 0,
  };
  function rng01(...xs) {
    let h = 2166136261;
    for (const c of xs.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return (h % 1000) / 1000;
  }
  function effMult(type, target) {
    const dx = (target.battle && target.battle.dex) || dex;
    if (!dx.getImmunity(type, target.getTypes())) return 0;
    if (type === 'Ground' && target.ability === 'levitate') return 0;
    if (type === 'Water' && ['waterabsorb', 'dryskin'].includes(target.ability)) return 0;
    if (type === 'Electric' && ['voltabsorb', 'motordrive'].includes(target.ability)) return 0;
    if (type === 'Fire' && target.ability === 'flashfire') return 0;
    return Math.pow(2, dx.getEffectiveness(type, target.getTypes()));
  }
  // stat with boosts and the common always-on modifiers, without firing battle events
  function statOf(p, k) {
    let v = p.storedStats[k];
    const b = p.boosts[k] || 0;
    v = Math.floor(v * (b >= 0 ? (2 + b) / 2 : 2 / (2 - b)));
    if (k === 'atk' && ['hugepower', 'purepower'].includes(p.ability)) v *= 2;
    if (k === 'spe' && p.item === 'choicescarf') v = Math.floor(v * 1.5);
    if (k === 'spd' && p.item === 'assaultvest') v = Math.floor(v * 1.5);
    if (k === 'spe' && p.status === 'par') v = Math.floor(v / 4);
    return v;
  }
  function estDamage(me, foe, moveId) {
    const m = ((me.battle && me.battle.dex) || dex).moves.get(moveId);
    if (m.category === 'Status') return 0;
    let bp = m.basePower;
    if (m.id === 'mirrorcoat' || m.id === 'counter') return 0;
    if (!bp) bp = m.ohko ? 0 : 60;
    const phys = m.category === 'Physical';
    const A = statOf(me, phys ? 'atk' : 'spa');
    const D = statOf(foe, phys ? 'def' : 'spd');
    let d = ((2 * me.level / 5 + 2) * bp * A / D) / 50 + 2;
    let type = m.type;
    if (type === 'Normal' && ['pixilate', 'aerilate', 'refrigerate'].includes(me.ability)) {
      type = {pixilate: 'Fairy', aerilate: 'Flying', refrigerate: 'Ice'}[me.ability]; d *= 1.3;
    }
    if (me.hasType(type)) d *= me.ability === 'adaptability' ? 2 : 1.5;
    d *= effMult(type, foe);
    if ((me.item === 'choiceband' && phys) || (me.item === 'choicespecs' && !phys)) d *= 1.5;
    if (me.ability === 'technician' && bp <= 60) d *= 1.5;
    if (me.ability === 'strongjaw' && m.flags && m.flags.bite) d *= 1.5;
    if (me.ability === 'toughclaws' && m.flags && m.flags.contact) d *= 1.3;
    if (me.ability === 'scrappy' && foe.hasType('Ghost') && (type === 'Normal' || type === 'Fighting')) d = d || 1;
    d *= (m.accuracy === true ? 100 : m.accuracy) / 100;
    if (me.item === 'lifeorb') d *= 1.3;
    if (m.multihit) d *= Array.isArray(m.multihit) ? 3 : m.multihit;
    return d / foe.hp;
  }
  function chooseMove(b) {
    const me = b.p2.active[0], foe = b.p1.active[0];
    const req = b.p2.activeRequest;
    const moves = req.active[0].moves;
    let best = null;
    moves.forEach((mv, i) => {
      if (mv.disabled || (mv.pp !== undefined && mv.pp <= 0)) return;
      const id = mv.id;
      let s;
      const dmg = estDamage(me, foe, id);
      if (dmg > 0) {
        s = Math.min(dmg, 1.2);
        const m = b.dex.moves.get(id);
        if (m.priority > 0 && dmg >= 1) s += 0.6; // pick off
        if (m.priority > 0 && statOf(foe, 'spe') > statOf(me, 'spe') && dmg > 0.35) s += 0.25;
        if (id === 'outrage' || id === 'leafstorm') s *= 0.92;
      } else if (id === 'mirrorcoat') {
        s = foe.storedStats.spa > foe.storedStats.atk && me.hp / me.maxhp > 0.6 ? 0.35 : 0.02;
      } else {
        s = (STATUS_VAL[id] ? STATUS_VAL[id](me, foe, b) : 0.05);
      }
      s *= 0.9 + 0.2 * rng01(b.turn, id, me.hp);
      if (!best || s > best.s) best = {s, i};
    });
    return best ? 'move ' + (best.i + 1) + (req.active[0].canMegaEvo ? ' mega' : '') : 'default';
  }
  function chooseSwitch(b) {
    const foe = b.p1.active[0];
    const side = b.p2.pokemon;
    let best = null;
    side.forEach((p, i) => {
      if (i === 0 || p.fainted) return; // slot 0 is the active slot
      let off = 0;
      for (const ms of p.moveSlots) off = Math.max(off, foe ? estDamage(p, foe, ms.id) : 0);
      let def = 0;
      if (foe) for (const t of foe.getTypes()) def = Math.max(def, effMult(t, p));
      const s = off - 0.3 * def + 0.2 * (p.hp / p.maxhp);
      if (!best || s > best.s) best = {s, i};
    });
    return best ? 'switch ' + (best.i + 1) : 'default';
  }
  function needs(side) {
    const r = side.activeRequest;
    return !!r && !r.wait && !side.isChoiceDone();
  }
  function aiChoice(b) {
    const r = b.p2.activeRequest;
    if (r.forceSwitch) return chooseSwitch(b);
    return chooseMove(b);
  }

  // Apply a player choice and let the AI respond. Returns the list of [side, choice] made.
  function act(b, choice, ai) {
    const pick = ai || aiChoice;
    const made = [];
    if (needs(b.p2) && !b.ended) { const c = pick(b); b.choose('p2', c); made.push(['p2', c]); }
    b.choose('p1', choice); made.push(['p1', choice]);
    let guard = 0;
    while (!b.ended && needs(b.p2) && !needs(b.p1) && guard++ < 10) {
      const c = pick(b); b.choose('p2', c); made.push(['p2', c]);
    }
    return made;
  }
  function replay(b, log) {
    for (const [s, c] of log) { if (b.ended) break; if (s === 'lose') b.lose('p1'); else b.choose(s, c); }
  }

  // ---------- log → Gen 4 style text ----------
  const STATUS_TXT = {brn: 'was burned', par: 'is paralyzed! It may be unable to move', slp: 'fell asleep', frz: 'was frozen solid', psn: 'was poisoned', tox: 'was badly poisoned'};
  const STAT = {atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness'};
  const WEATHER = {SunnyDay: 'The sunlight is strong.', RainDance: 'Rain continues to fall.', Sandstorm: 'The sandstorm rages.', Hail: 'Hail continues to fall.'};
  const WSTART = {SunnyDay: 'The sunlight turned harsh!', RainDance: 'It started to rain!', Sandstorm: 'A sandstorm brewed!', Hail: 'It started to hail!'};
  let CUR = OPP.cynthia;
  function Who(ident) {
    if (!ident) return '';
    const side = ident.slice(0, 2);
    const name = ident.replace(/^p\da?: /, '');
    return side === 'p2' ? CUR.foe + name : name;
  }
  function who(ident) { const w = Who(ident); return ident && ident.startsWith('p2') ? w[0].toLowerCase() + w.slice(1) : w; }
  function effName(s) { return (s || '').replace(/^(move|ability|item): /, ''); }
  function parseHP(s) {
    if (!s) return null;
    const [frac, status] = s.split(' ');
    if (frac === '0' || frac.startsWith('0 ')) return {hp: 0, max: 1, status: 'fnt'};
    const [hp, max] = frac.split('/').map(Number);
    return {hp, max: max || 100, status: status || ''};
  }
  // Converts raw log lines to a list of events {text?, update?}
  function toEvents(lines, opp) {
    if (opp) CUR = opp;
    const ev = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (!line) continue;
      if (line.startsWith('|split|')) { ev.push(...toEvents([lines[i + 1]])); i += 2; continue; }
      const p = line.split('|').slice(1);
      const t = p[0];
      const tag = (s) => (line.match(/\[from\] ([^|]+)/) || [])[1] === s;
      const from = effName((line.match(/\[from\] ([^|]+)/) || [])[1]);
      switch (t) {
        case 'switch': case 'drag': {
          const side = p[1].slice(0, 2);
          const species = p[2].split(',')[0];
          const lv = (p[2].match(/L(\d+)/) || [, 100])[1];
          const hp = parseHP(p[3]);
          ev.push({update: {side, kind: 'switch', name: p[1].replace(/^p\da?: /, ''), species, level: +lv, ...hp},
            text: side === 'p2' ? `${CUR.title} sent out ${p[1].replace(/^p\da?: /, '')}!` : `Go! ${p[1].replace(/^p\da?: /, '')}!`});
          break;
        }
        case 'detailschange': case '-formechange': {
          const species = p[2].split(',')[0];
          ev.push({update: {side: p[1].slice(0, 2), kind: 'forme', species}});
          break;
        }
        case '-mega': ev.push({text: `${Who(p[1])} has Mega Evolved into Mega ${p[2]}!`}); break;
        case '-fieldactivate': break;
        case 'move': ev.push({text: `${Who(p[1])} used ${p[2]}!`, update: {side: p[1].slice(0, 2), kind: 'attack'}}); break;
        case '-damage': case '-heal': case '-sethp': {
          const hp = parseHP(p[2]);
          let txt = null;
          if (from) {
            const s = from.toLowerCase();
            if (s === 'brn') txt = `${Who(p[1])} is hurt by its burn!`;
            else if (s === 'psn' || s === 'tox') txt = `${Who(p[1])} is hurt by poison!`;
            else if (s === 'sandstorm') txt = `${Who(p[1])} is buffeted by the sandstorm!`;
            else if (s === 'hail') txt = `${Who(p[1])} is pelted by hail!`;
            else if (s === 'life orb') txt = `${Who(p[1])} lost some of its HP!`;
            else if (s === 'leftovers' || s === 'black sludge' || s === 'shell bell') txt = `${Who(p[1])} ${t === '-heal' ? 'restored a little HP' : 'was hurt'} using its ${from}!`;
            else if (s === 'recoil') txt = `${Who(p[1])} is hit with recoil!`;
            else if (s === 'stealth rock' || s === 'spikes') txt = `Pointed stones dug into ${who(p[1])}!`;
            else if (s === 'drain') txt = `${Who(p[1])} had its energy drained!`;
            else if (t === '-heal') txt = `${Who(p[1])} regained health!`;
            else txt = `${Who(p[1])} is hurt by ${from}!`;
          } else if (t === '-heal') txt = `${Who(p[1])} regained health!`;
          ev.push({update: {side: p[1].slice(0, 2), kind: 'hp', ...hp, delta: t}, text: txt});
          break;
        }
        case 'faint': ev.push({update: {side: p[1].slice(0, 2), kind: 'faint'}, text: `${Who(p[1])} fainted!`}); break;
        case '-supereffective': ev.push({text: 'It\'s super effective!'}); break;
        case '-resisted': ev.push({text: 'It\'s not very effective...'}); break;
        case '-immune': ev.push({text: `It doesn't affect ${who(p[1])}...`}); break;
        case '-crit': ev.push({text: 'A critical hit!'}); break;
        case '-miss': ev.push({text: `${Who(p[1])}'s attack missed!`}); break;
        case '-fail': ev.push({text: 'But it failed!'}); break;
        case '-status': ev.push({update: {side: p[1].slice(0, 2), kind: 'status', status: p[2]}, text: `${Who(p[1])} ${STATUS_TXT[p[2]] || 'was afflicted'}!`}); break;
        case '-curestatus': ev.push({update: {side: p[1].slice(0, 2), kind: 'status', status: ''},
          text: p[2] === 'slp' ? `${Who(p[1])} woke up!` : p[2] === 'frz' ? `${Who(p[1])} thawed out!` : line.includes('[msg]') ? `${Who(p[1])} was cured!` : null}); break;
        case 'cant': {
          const r = p[2];
          ev.push({text: r === 'slp' ? `${Who(p[1])} is fast asleep.` : r === 'par' ? `${Who(p[1])} is paralyzed! It can't move!` : r === 'frz' ? `${Who(p[1])} is frozen solid!` : r === 'flinch' ? `${Who(p[1])} flinched!` : r === 'recharge' ? `${Who(p[1])} must recharge!` : `${Who(p[1])} can't move!`});
          break;
        }
        case '-boost': case '-unboost': {
          const n = +p[3];
          const adv = n >= 3 ? 'drastically ' : n === 2 ? 'sharply ' : '';
          const v = t === '-boost' ? (n === 0 ? 'won\'t go higher!' : `${n >= 2 ? 'sharply ' : ''}rose!`) : (n === 0 ? 'won\'t go lower!' : `${n >= 2 ? 'harshly ' : ''}fell!`);
          ev.push({text: `${Who(p[1])}'s ${STAT[p[2]] || p[2]} ${v}`.replace(adv + adv, adv)});
          break;
        }
        case '-weather':
          if (p[1] === 'none') ev.push({text: 'The weather cleared up.'});
          else if (line.includes('[upkeep]')) ev.push({text: WEATHER[p[1]] || null});
          else ev.push({text: WSTART[p[1]] || null});
          break;
        case '-start': {
          const e = effName(p[2]);
          if (e === 'confusion') ev.push({text: `${Who(p[1])} became confused!`});
          else if (e === 'Substitute') ev.push({text: `${Who(p[1])} made a substitute!`});
          else if (e === 'typechange') ev.push({text: null});
          else ev.push({text: line.includes('[silent]') ? null : `${Who(p[1])}: ${e}!`});
          break;
        }
        case '-end': {
          const e = effName(p[2]);
          if (e === 'confusion') ev.push({text: `${Who(p[1])} snapped out of confusion!`});
          else if (e === 'Substitute') ev.push({text: `${Who(p[1])}'s substitute faded!`});
          break;
        }
        case '-activate': {
          const e = effName(p[2]);
          if (e === 'confusion') ev.push({text: `${Who(p[1])} is confused!`});
          else if (e === 'Protect') ev.push({text: `${Who(p[1])} protected itself!`});
          else if (e === 'Substitute') ev.push({text: 'The substitute took damage for it!'});
          break;
        }
        case '-singleturn': if (effName(p[2]) === 'Protect') ev.push({text: `${Who(p[1])} protected itself!`}); break;
        case '-sidestart': {
          const s = p[1].startsWith('p2') ? 'the foe\'s team' : 'your team';
          const e = effName(p[2]);
          ev.push({text: e === 'Stealth Rock' ? `Pointed stones float in the air around ${s}!` : e === 'Spikes' ? `Spikes were scattered around ${s}'s feet!` : e === 'Toxic Spikes' ? `Poison spikes were scattered around ${s}'s feet!` : e === 'Reflect' || e === 'Light Screen' ? `${e} raised ${s}'s defenses!` : `${e} took effect on ${s}!`});
          break;
        }
        case '-sideend': ev.push({text: `${effName(p[2])} wore off!`}); break;
        case '-enditem': {
          const it = effName(p[2]);
          if (line.includes('[eat]')) ev.push({text: `${Who(p[1])} ate its ${it}!`});
          else if (line.includes('[from] move: Knock Off')) ev.push({text: `${Who(p[1])} lost its ${it}!`});
          else if (it === 'Focus Sash') ev.push({text: `${Who(p[1])} hung on using its Focus Sash!`});
          else if (!line.includes('[silent]')) ev.push({text: `${Who(p[1])}'s ${it} was used up.`});
          break;
        }
        case '-item': if (from === 'Trick' || line.includes('Trick')) ev.push({text: `${Who(p[1])} obtained ${effName(p[2])}!`}); else if (line.includes('Frisk')) ev.push({text: `${Who(p[1])} is holding ${effName(p[2])}!`}); break;
        case '-ability': if (!line.includes('[silent]')) ev.push({text: effName(p[2]) === 'Pressure' ? `${Who(p[1])} is exerting its Pressure!` : `${Who(p[1])}'s ${effName(p[2])}!`}); break;
        case '-fieldstart': ev.push({text: effName(p[1]) === 'Trick Room' ? 'The dimensions were twisted!' : `${effName(p[1])} took effect!`}); break;
        case '-fieldend': ev.push({text: effName(p[1]) === 'Trick Room' ? 'The twisted dimensions returned to normal!' : `${effName(p[1])} ended.`}); break;
        case '-hitcount': ev.push({text: `Hit ${p[2]} time${p[2] === '1' ? '' : 's'}!`}); break;
        case '-ohko': ev.push({text: 'It\'s a one-hit KO!'}); break;
        case '-prepare': ev.push({text: `${Who(p[1])} is charging up!`}); break;
        case '-mustrecharge': break;
        case '-transform': ev.push({text: `${Who(p[1])} transformed!`}); break;
        case '-clearallboost': ev.push({text: 'All stat changes were eliminated!'}); break;
        case '-clearboost': ev.push({text: `${Who(p[1])}'s stat changes were removed!`}); break;
        case 'turn': ev.push({update: {kind: 'turn', turn: +p[1]}}); break;
        case 'win': ev.push({update: {kind: 'win', winner: p[1]}}); break;
        case 'tie': ev.push({update: {kind: 'win', winner: null}}); break;
        default: break;
      }
    }
    return ev.filter((e) => e.text || e.update);
  }

  function dateKey(d = new Date()) {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  function dayNumber(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 9, 14)) / 864e5) + 1;
  }

  window.Core = {statOf, OPP, dexFor, oppTeam, aiChoice, estDamage, dex, CYNTHIA, playerTeam, newBattle, act, replay, needs, toEvents, dateKey, dayNumber, effMult};
})();
