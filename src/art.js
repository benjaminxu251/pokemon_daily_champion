// Original Pokémon art, drawn in code. Every species gets a generated sprite: body plan from its egg
// groups, colors from its Pokédex color and types, features from its types, size from its height.
// PLAN overrides fix species whose egg groups give the wrong shape.
(function () {
  const TYPE_COLOR = {Normal: '#a8a77a', Fire: '#e8742f', Water: '#4f8fe6', Electric: '#e8c330', Grass: '#5fb046', Ice: '#78cfd0', Fighting: '#c03a2e',
    Poison: '#9a46a8', Ground: '#d2ad5e', Flying: '#8f9be8', Psychic: '#ea5a86', Bug: '#9aad25', Rock: '#b49d3c', Ghost: '#6a5596',
    Dragon: '#6640e8', Dark: '#6b5548', Steel: '#a5a5c4', Fairy: '#e48ec4', '???': '#68a090'};
  const DEX_COLOR = {Red: '#d9493d', Blue: '#4a7fd0', Yellow: '#f0cc45', Green: '#5daf5a', Black: '#4a4654', Brown: '#a06c45',
    Purple: '#8d5cbc', Gray: '#9c9eab', White: '#efece6', Pink: '#f1a0c4'};
  const OUT = '#1d1a2b';

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const shade = (c, t) => mix(c, '#000000', t);
  const tint = (c, t) => mix(c, '#ffffff', t);
  function rng(s) {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  const f1 = (n) => Math.round(n * 10) / 10;

  // ---------- primitives ----------
  const sw = 2.6;
  const ell = (cx, cy, rx, ry, fill, rot = 0) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${f1(cx)} ${f1(cy)})"` : ''}/>`;
  const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
  const poly = (pts, fill) => `<polygon points="${pts.map((p) => p.map(f1).join(',')).join(' ')}" fill="${fill}"/>`;
  const tube = (d, w, fill) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + sw * 2}" stroke-linecap="round" stroke-linejoin="round" class="nos"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" class="nos"/>`;
  const line = (d, w, col = OUT) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" class="nos"/>`;
  const tri = (x, y, w, h, ang, fill) => { // isoceles triangle with base centered at x,y pointing at angle (deg, 0 = up)
    const a = (ang - 90) * Math.PI / 180, n = a + Math.PI / 2;
    return poly([[x + Math.cos(n) * w / 2, y + Math.sin(n) * w / 2], [x + Math.cos(a) * h, y + Math.sin(a) * h], [x - Math.cos(n) * w / 2, y - Math.sin(n) * w / 2]], fill);
  };

  // ---------- body plans ----------
  // Each returns layers plus anchors: head {x,y,r}, top (crown point), back (point on the back), tail (tip or null), body {x,y,rx,ry}.
  const PLANS = {
    quad(c, r) {
      const lh = 18 + r() * 6, by = 88 - lh - 4;
      return {
        under: [tube(`M72,${by - 4} Q86,${by - 8} ${86 + r() * 4},${by - 24}`, 6 + r() * 3, c.p), legs([38, 66], by + 4, lh, 8, c.d)],
        torso: [ell(54, by, 24, 14, c.p), ell(52, by + 6, 14, 6, c.b), legs([32, 60], by + 4, lh, 8, c.p)],
        head: [ell(29, by - 18, 13, 12, c.p), ell(19, by - 13, 7, 5.5, c.b)],
        a: {head: {x: 29, y: by - 18, r: 12}, top: [30, by - 30], back: [58, by - 13], tail: [88, by - 26], body: {x: 54, y: by, rx: 24, ry: 14}},
      };
    },
    biped(c, r) {
      return {
        under: [tube('M64,78 Q80,90 92,84', 9 + r() * 4, c.p), ell(62, 84, 8, 7, c.d)],
        torso: [ell(52, 62, 18, 22, c.p), ell(47, 67, 10, 15, c.b), ell(44, 85, 8, 6, c.p), ell(36, 60, 4, 8, c.p, 30)],
        head: [ell(44, 32, 13, 12, c.p), ell(33, 37, 8, 5.5, c.b)],
        a: {head: {x: 44, y: 32, r: 12}, top: [45, 20], back: [64, 48], tail: [93, 84], body: {x: 52, y: 62, rx: 18, ry: 22}},
      };
    },
    humanoid(c, r) {
      const wide = 12 + r() * 4;
      return {
        under: [legs([45, 57], 70, 20, 7, c.d), tube('M62,48 Q68,58 68,68', 6, c.d)],
        torso: [ell(51, 58, wide, 16, c.p), ell(49, 62, wide * .55, 10, c.b), tube('M40,48 Q33,58 34,68', 6, c.p)],
        head: [ell(50, 31, 12, 12, c.p)],
        a: {head: {x: 50, y: 31, r: 12}, top: [50, 19], back: [60, 46], tail: null, body: {x: 51, y: 58, rx: wide, ry: 16}},
      };
    },
    bird(c, r) {
      return {
        under: [poly([[66, 60], [90, 72 + r() * 6], [88, 56]], c.s), line('M48,72 L46,90 M56,72 L57,90', 3, c.y), line('M42,90 L50,90 M53,90 L61,90', 3, c.y)],
        torso: [ell(54, 60, 21, 15, c.p, -12), ell(48, 66, 12, 8, c.b, -12), ell(62, 56, 14, 8, c.d, -22)],
        head: [ell(34, 40, 11, 11, c.p), poly([[25, 38], [12 - r() * 4, 44], [25, 47]], c.y)],
        a: {head: {x: 34, y: 40, r: 11}, top: [35, 29], back: [58, 45], tail: [90, 70], body: {x: 54, y: 60, rx: 21, ry: 15}},
      };
    },
    fish(c, r) {
      return {
        under: [poly([[72, 52], [92, 36 + r() * 4], [86, 53], [92, 70 - r() * 4]], c.s), poly([[42, 38], [56, 24 - r() * 4], [64, 39]], c.s)],
        torso: [ell(50, 53, 27, 17, c.p), ell(46, 60, 18, 7, c.b), poly([[46, 58], [58, 66], [50, 58]], c.s)],
        head: [],
        a: {head: {x: 34, y: 50, r: 11}, top: [36, 37], back: [52, 37], tail: [92, 53], body: {x: 50, y: 53, rx: 27, ry: 17}, float: true},
      };
    },
    serpent(c, r) {
      const d = 'M60,88 C92,88 94,62 70,62 C50,62 52,82 34,76 C20,71 24,50 32,40';
      return {
        under: [tube(d, 15, c.p), line(d, 5, c.b)],
        torso: [],
        head: [ell(33, 32, 13, 10, c.p, -10), ell(23, 37, 8, 5, c.b, -10)],
        a: {head: {x: 33, y: 32, r: 11}, top: [36, 22], back: [84, 70], tail: [60, 88], body: {x: 66, y: 72, rx: 24, ry: 14}},
      };
    },
    amphib(c, r) {
      return {
        under: [ell(72, 82, 11, 7, c.d)],
        torso: [ell(52, 70, 23, 18, c.p), ell(48, 77, 15, 9, c.b), ell(36, 86, 7, 4, c.p)],
        head: [ell(38, 52, 7, 7, c.p), ell(52, 50, 7, 7, c.p)],
        a: {head: {x: 44, y: 60, r: 16}, top: [45, 44], back: [66, 56], tail: null, body: {x: 52, y: 70, rx: 23, ry: 18}, eyes: [[38, 51], [52, 49]]},
      };
    },
    blob(c, r) {
      const ghost = c.types.includes('Ghost');
      const bottom = ghost ? 'C74,90 68,82 62,88 C56,94 50,82 44,88 C38,94 32,84 26,88 C22,80 23,70 24,64' : 'C76,88 26,88 24,70';
      return {
        under: [],
        torso: [path(`M50,${22 + r() * 6} C70,22 78,48 76,68 ${bottom} C24,46 30,22 50,22 Z`, c.p), ell(48, 64, 12, 12, c.b)],
        head: [],
        a: {head: {x: 48, y: 44, r: 18}, top: [50, 24], back: [70, 44], tail: null, body: {x: 50, y: 58, rx: 25, ry: 30}, float: ghost},
      };
    },
    round(c, r) {
      return {
        under: [ell(62, 86, 7, 5, c.d)],
        torso: [ell(50, 64, 22, 22, c.p), ell(48, 72, 13, 10, c.b), ell(40, 87, 7, 5, c.p), ell(30, 64, 4, 7, c.p, 30)],
        head: [],
        a: {head: {x: 46, y: 58, r: 20}, top: [48, 42], back: [66, 52], tail: null, body: {x: 50, y: 64, rx: 22, ry: 22}},
      };
    },
    plant(c, r) {
      const g = TYPE_COLOR.Grass;
      return {
        under: [ell(62, 87, 7, 5, c.d), leaf(50, 54, -40, 26, g), leaf(50, 54, 40, 26, g)],
        torso: [ell(50, 70, 20, 17, c.p), ell(40, 87, 7, 5, c.p), leaf(50, 54, 0, 22 + r() * 6, shade(g, .15))],
        head: [],
        a: {head: {x: 44, y: 70, r: 15}, top: [50, 32], back: [64, 60], tail: null, body: {x: 50, y: 70, rx: 20, ry: 17}, noTop: true},
      };
    },
    bug(c, r) {
      return {
        under: [line('M42,66 L36,84 M50,68 L50,88 M58,68 L64,86', 3)],
        torso: [ell(68, 64, 17, 12, c.p, 10), line('M64,54 Q60,64 64,75 M72,54 Q68,64 72,75', 2, shade(c.p, .3)), ell(48, 62, 10, 9, c.s)],
        head: [ell(32, 54, 11, 10, c.p)],
        a: {head: {x: 32, y: 54, r: 10}, top: [32, 44], back: [62, 50], tail: [85, 68], body: {x: 66, y: 63, rx: 17, ry: 12}},
      };
    },
    invert(c, r) {
      const spikes = Array.from({length: 7}, (_, i) => { const a = -Math.PI * .9 + i * Math.PI * .3; return tri(56 + Math.cos(a) * 18, 58 + Math.sin(a) * 18, 9, 9, a * 180 / Math.PI + 90, c.s); });
      return {
        under: [line('M38,70 Q32,82 38,92 M46,74 Q44,86 50,92 M30,66 Q22,76 26,88', 4, c.b), ...spikes],
        torso: [ell(56, 58, 20, 20, c.p), line('M56,58 m-12,0 a12,12 0 1,1 12,12 a7,7 0 1,1 -7,-7', 2.4, shade(c.p, .35)), ell(38, 64, 11, 9, c.b)],
        head: [],
        a: {head: {x: 38, y: 64, r: 10}, top: [38, 52], back: [64, 40], tail: null, body: {x: 56, y: 58, rx: 20, ry: 20}, noTop: true},
      };
    },
    rock(c, r) {
      const pts = Array.from({length: 8}, (_, i) => { const a = i * Math.PI / 4 + r() * .4; const k = 24 + r() * 6; return [50 + Math.cos(a) * k, 60 + Math.sin(a) * k * .9]; });
      return {
        under: [ell(32, 70, 5, 8, c.d, 30), ell(68, 70, 5, 8, c.d, -30)],
        torso: [poly(pts, c.p), poly(pts.map(([x, y]) => [50 + (x - 50) * .45, 66 + (y - 60) * .35]), c.b)],
        head: [],
        a: {head: {x: 46, y: 54, r: 16}, top: [50, 36], back: [66, 42], tail: null, body: {x: 50, y: 60, rx: 26, ry: 24}},
      };
    },
  };
  PLANS.dragon = (c, r) => PLANS.biped(c, r);
  function legs(xs, y, h, w, fill) {
    return xs.map((x) => `<rect x="${f1(x - w / 2)}" y="${f1(y)}" width="${w}" height="${f1(h)}" rx="${w / 2}" fill="${fill}"/>`).join('');
  }
  function leaf(x, y, ang, len, fill) {
    return `<path d="M0,0 C${len * .35},${-len * .4} ${len * .35},${-len * .9} 0,${-len} C${-len * .35},${-len * .9} ${-len * .35},${-len * .4} 0,0 Z" fill="${fill}" transform="translate(${x} ${y}) rotate(${ang})"/>`;
  }

  // ---------- plan choice ----------
  // Species whose egg groups give the wrong shape. Keyed by species id (base species unless a form needs its own).
  const PLAN = {
    garchomp: 'dragon', gabite: 'dragon', gible: 'biped', milotic: 'serpent', gyarados: 'serpent', dragonair: 'serpent', rayquaza: 'serpent',
    lucario: 'humanoid', togekiss: 'bird', spiritomb: 'blob', roserade: 'humanoid', salamence: 'dragon', altaria: 'bird', noivern: 'dragon',
    goodra: 'biped', tyrantrum: 'biped', dragonite: 'dragon', charizard: 'dragon', aerodactyl: 'dragon', wailord: 'fish', onix: 'serpent',
    steelix: 'serpent', seviper: 'serpent', ekans: 'serpent', arbok: 'serpent', dragalge: 'fish', kingdra: 'fish', lugia: 'bird', hooh: 'bird',
  };
  const EGG_PLAN = {Monster: 'biped', Dragon: 'dragon', Field: 'quad', Fairy: 'round', Grass: 'plant', Bug: 'bug', 'Water 1': 'amphib',
    'Water 2': 'fish', 'Water 3': 'invert', Mineral: 'rock', Flying: 'bird', Amorphous: 'blob', 'Human-Like': 'humanoid', Ditto: 'blob'};
  function planOf(sp, dex) {
    const id = sp.id, base = dex.species.get(sp.baseSpecies).id;
    if (PLAN[id] || PLAN[base]) return PLAN[id] || PLAN[base];
    let eggs = sp.eggGroups;
    if (eggs[0] === 'Undiscovered' && sp.evos && sp.evos.length) eggs = dex.species.get(sp.evos[0]).eggGroups;
    const t = sp.types;
    if (eggs[0] === 'Undiscovered') {
      if (t.includes('Flying')) return 'bird';
      if (t[0] === 'Water') return sp.heightm > 3 ? 'serpent' : 'fish';
      if (t.includes('Ghost')) return 'blob';
      if (t[0] === 'Rock' || t[0] === 'Steel') return 'rock';
      if (t[0] === 'Bug') return 'bug';
      if (t[0] === 'Grass') return 'plant';
      if (t.includes('Dragon')) return 'dragon';
      if (t.includes('Psychic') || t.includes('Fighting')) return 'humanoid';
      return sp.heightm > 2 ? 'biped' : 'quad';
    }
    if (eggs.includes('Human-Like')) return 'humanoid';
    if (eggs.includes('Flying') && t.includes('Flying')) return 'bird';
    if (eggs[0] === 'Water 2' && sp.heightm > 3) return 'serpent';
    return EGG_PLAN[eggs[0]];
  }

  // ---------- features ----------
  // Forms must not look like their base: regional forms get a region pattern, Megas a spiked back,
  // other forms (Deoxys, Rotom, Gourgeist sizes...) an emblem. Palette shifts are in palette().
  function formKind(sp, dex) {
    if (!sp.forme || sp.baseSpecies === sp.name) return null;
    const m = /^(Alola|Galar|Hisui|Paldea)/.exec(sp.forme);
    if (m) return m[1].toLowerCase();
    if (sp.isMega || sp.isPrimal) return 'mega';
    return 'variant';
  }
  function features(sp, plan, dex) {
    const t = new Set(sp.types), f = new Set();
    const k = formKind(sp, dex);
    if (k) f.add('form-' + k);
    if (t.has('Fire')) f.add('flame');
    if (t.has('Water') && !['fish', 'serpent', 'invert', 'amphib'].includes(plan)) f.add('fin');
    if (t.has('Electric')) f.add('bolt');
    if (t.has('Grass') && plan !== 'plant') f.add('leaf');
    if (t.has('Ice')) f.add('crystals');
    if (t.has('Poison')) f.add('spots');
    if ((t.has('Flying') || plan === 'dragon') && plan !== 'bird') f.add('wings');
    if (t.has('Psychic')) f.add('gem');
    if (t.has('Bug') && plan !== 'bug') f.add('antennae');
    if (plan === 'bug') f.add('antennae');
    if (t.has('Rock') && plan !== 'rock') f.add('spikes');
    if (t.has('Dragon')) f.add('horns');
    if (t.has('Dark') || t.has('Fighting') || t.has('Dragon')) f.add('brows');
    if (t.has('Steel')) f.add('plate');
    if (t.has('Fairy')) f.add('sparkle');
    if (plan === 'quad' && !f.has('horns')) f.add('ears');
    return f;
  }

  function palette(sp, dex) {
    let p = DEX_COLOR[sp.color] || DEX_COLOR.Gray;
    const base = dex.species.get(sp.baseSpecies);
    if (sp.forme && base.name !== sp.name && base.color === sp.color && !sp.isMega && !sp.isPrimal) {
      const added = sp.types.filter((t) => !base.types.includes(t));
      p = added.length ? mix(p, TYPE_COLOR[added[0]], .45) : (rng(sp.id)() < .5 ? shade(p, .22) : tint(p, .25));
    }
    const tc = sp.types.map((t) => TYPE_COLOR[t]);
    let s = tc.find((c) => dist(c, p) > 90) || (dist(p, '#ffffff') > 200 ? tint(p, .55) : shade(p, .35));
    return {p, s, d: shade(p, .22), b: sp.color === 'White' ? '#d6d1c7' : tint(p, .5), y: '#f2c94c', types: sp.types};
  }

  function decorate(f, a, c, r, layer) {
    const o = [];
    const h = a.head, [tx, ty] = a.top, [bx, by] = a.back;
    if (layer === 'back') {
      if (f.has('wings')) {
        const w = c.types.includes('Flying') ? c.s : shade(c.s, .1);
        o.push(path(`M${bx},${by} C${bx + 4},${by - 30} ${bx + 26},${by - 38} ${bx + 34},${by - 30} C${bx + 26},${by - 26} ${bx + 30},${by - 16} ${bx + 22},${by - 10} C${bx + 18},${by - 14} ${bx + 12},${by - 4} ${bx},${by} Z`, w));
      }
      if (f.has('spikes')) for (let i = 0; i < 3; i++) o.push(tri(bx - 10 + i * 8, by + 2 + i * 2, 8, 9, 10 + i * 12, TYPE_COLOR.Rock));
      if (f.has('crystals')) for (let i = 0; i < 3; i++) o.push(tri(bx - 8 + i * 9, by + 3 + i * 2, 6, 12 - i * 2, i * 15, tint(TYPE_COLOR.Ice, .3)));
      if (f.has('fin')) o.push(tri(bx, by + 3, 12, 13, 15, TYPE_COLOR.Water));
      if (f.has('form-mega')) for (let i = 0; i < 4; i++) o.push(tri(bx - 14 + i * 9, by + 4 + i * 2, 8, 13 - i, -10 + i * 14, c.s));
    }
    if (layer === 'top' && !a.noTop) {
      if (f.has('ears')) { o.push(tri(tx - 7, ty + 4, 9, 11, -18, c.p), tri(tx + 5, ty + 3, 9, 12, 14, c.p)); }
      if (f.has('horns')) { o.push(tri(tx - 4, ty + 3, 6, 11, -25, '#efe6cf'), tri(tx + 5, ty + 2, 6, 13, 15, '#efe6cf')); }
      if (f.has('leaf')) o.push(leaf(tx, ty + 2, 15, 16, TYPE_COLOR.Grass));
      if (f.has('antennae')) o.push(line(`M${tx - 3},${ty + 2} Q${tx - 10},${ty - 10} ${tx - 14},${ty - 12} M${tx + 3},${ty + 2} Q${tx + 4},${ty - 12} ${tx + 2},${ty - 15}`, 2), ell(tx - 14, ty - 12, 2.5, 2.5, c.s), ell(tx + 2, ty - 15, 2.5, 2.5, c.s));
    }
    if (layer === 'torso') {
      const B = a.body;
      if (f.has('spots')) for (let i = 0; i < 3; i++) o.push(ell(B.x - B.rx * .35 + i * B.rx * .35, B.y - B.ry * .35 + (i % 2) * 5, 3, 2.6, TYPE_COLOR.Poison));
      const mk = shade(c.p, .45);
      if (f.has('form-hisui')) for (let i = 0; i < 3; i++) { const x = B.x - B.rx * .45 + i * B.rx * .4, y = B.y - B.ry * .2; o.push(line(`M${f1(x)},${f1(y)} l3,-4 l3,4 l3,-4`, 2, mk)); }
      if (f.has('form-galar')) for (let i = 0; i < 2; i++) o.push(line(`M${f1(B.x - B.rx * .5 + i * 9)},${f1(B.y + B.ry * .4)} l${f1(B.rx * .35)},${f1(-B.ry * .8)}`, 3, c.s));
      if (f.has('form-alola')) for (let i = 0; i < 5; i++) { const a2 = i * Math.PI * 2 / 5; o.push(`<circle cx="${f1(B.x + Math.cos(a2) * 3.4)}" cy="${f1(B.y - B.ry * .25 + Math.sin(a2) * 3.4)}" r="2.6" fill="#f7a3c8" stroke-width="1"/>`); }
      if (f.has('form-paldea')) o.push(`<rect x="${f1(B.x - B.rx * .7)}" y="${f1(B.y - 2)}" width="${f1(B.rx * 1.4)}" height="4" rx="2" fill="${c.s}" stroke-width="1.2"/>`);
      if (f.has('form-variant')) o.push(poly([[B.x, B.y - B.ry * .45], [B.x + 5, B.y - B.ry * .45 + 6], [B.x, B.y - B.ry * .45 + 12], [B.x - 5, B.y - B.ry * .45 + 6]], c.s));
      if (f.has('plate')) o.push(ell(B.x + B.rx * .25, B.y - B.ry * .1, B.rx * .32, B.ry * .3, tint(TYPE_COLOR.Steel, .25)));
      if (a.tail && f.has('flame')) o.push(flame(a.tail[0], a.tail[1], 9));
      if (a.tail && f.has('bolt') && !f.has('flame')) o.push(poly([[a.tail[0], a.tail[1] - 2], [a.tail[0] + 7, a.tail[1] - 12], [a.tail[0] + 2, a.tail[1] - 11], [a.tail[0] + 8, a.tail[1] - 22], [a.tail[0] - 3, a.tail[1] - 8], [a.tail[0] + 2, a.tail[1] - 9]], TYPE_COLOR.Electric));
    }
    if (layer === 'front') {
      if (!a.tail && f.has('flame')) o.push(flame(tx + 2, ty + 2, 8));
      if (!a.tail && f.has('bolt') && !f.has('flame')) o.push(ell(h.x - h.r * .55, h.y + h.r * .35, 3, 2.4, '#e8483b'));
      if (f.has('gem')) o.push(`<circle cx="${f1(h.x - h.r * .25)}" cy="${f1(h.y - h.r * .62)}" r="2.8" fill="#e8483b"/>`);
      if (f.has('sparkle')) o.push(star(80, 26, 6, '#fff3a6'));
    }
    return o.join('');
  }
  function flame(x, y, k) {
    return path(`M${x},${y + k * .4} C${x - k},${y} ${x - k * .4},${y - k} ${x},${y - k * 1.8} C${x + k * .4},${y - k} ${x + k},${y} ${x},${y + k * .4} Z`, '#f08a2e') +
      path(`M${x},${y + k * .2} C${x - k * .5},${y} ${x - k * .2},${y - k * .5} ${x},${y - k} C${x + k * .2},${y - k * .5} ${x + k * .5},${y} ${x},${y + k * .2} Z`, '#ffd65a');
  }
  function star(x, y, k, fill) {
    return path(`M${x},${y - k} L${x + k * .25},${y - k * .25} L${x + k},${y} L${x + k * .25},${y + k * .25} L${x},${y + k} L${x - k * .25},${y + k * .25} L${x - k},${y} L${x - k * .25},${y - k * .25} Z`, fill);
  }
  function face(a, f) {
    const pts = a.eyes || [[a.head.x - a.head.r * .5, a.head.y - a.head.r * .12], [a.head.x + a.head.r * .1, a.head.y - a.head.r * .18]];
    const er = Math.max(2, a.head.r * .17);
    let o = pts.map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(er)}" fill="#15121e"/><circle cx="${f1(x - er * .3)}" cy="${f1(y - er * .35)}" r="${f1(er * .38)}" fill="#fff"/>`).join('');
    if (f.has('brows')) o += pts.map(([x, y]) => line(`M${f1(x - er * 1.4)},${f1(y - er * 2.1)} L${f1(x + er * 1.2)},${f1(y - er * 1.3)}`, 2.2)).join('');
    return o;
  }

  const cache = new Map();
  let uid = 0;
  // Returns an SVG string. opts.back draws the player's view: mirrored, no face. opts.fit ignores height (thumbnails).
  function draw(species, dex, size, opts = {}) {
    const sp = dex.species.get(species);
    if (!sp.exists) throw new Error('Art: unknown species ' + species);
    const key = sp.id + (opts.back ? ':b' : '') + (opts.fit ? ':f' : '') + ':' + dex.gen;
    let inner = cache.get(key);
    if (!inner) {
      const plan = planOf(sp, dex);
      const c = palette(sp, dex), r = rng(sp.id), f = features(sp, plan, dex);
      const L = PLANS[plan](c, r);
      const a = L.a;
      const s = opts.fit ? 1 : Math.max(.58, Math.min(1, .74 + .17 * Math.log2(Math.max(.1, sp.heightm))));
      const lift = a.float ? -6 : 0;
      const body = decorate(f, a, c, r, 'back') + L.under.join('') + L.torso.join('') + decorate(f, a, c, r, 'torso') +
        decorate(f, a, c, r, 'top') + L.head.join('') + (opts.back ? '' : face(a, f)) + decorate(f, a, c, r, 'front');
      const mega = sp.isMega ? `<circle cx="50" cy="56" r="44" fill="${c.s}" opacity=".18"/>` : '';
      const flip = opts.back ? 'translate(100 0) scale(-1 1) ' : '';
      inner = `${mega}<ellipse cx="50" cy="93" rx="${f1(26 * s)}" ry="4" fill="#000" opacity=".22"/>` +
        `<g transform="${flip}translate(${f1(50 - 50 * s)} ${f1(92 - 92 * s + lift)}) scale(${f1(s * 100) / 100})" stroke="${OUT}" stroke-width="${f1(sw / s)}" stroke-linejoin="round">${body}</g>`;
      cache.set(key, inner);
    }
    return `<svg class="glyph art" viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${sp.name.replace(/"/g, '')}" role="img">${inner}</svg>`;
  }

  window.Art = {draw, TYPE_COLOR, planOf};
})();
