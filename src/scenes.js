// Original battle backgrounds and player trainers, drawn in code.
// Backgrounds use the battle screen's 256x192 grid, so the platforms line up with the battlers.
(function () {
  const f1 = (n) => Math.round(n * 10) / 10;
  function rng(s) {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  const grad = (id, stops, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const rgrad = (id, stops) => `<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
  // Platform centers match .plat in styles.css.
  const P2 = {x: 184, y: 80, rx: 57, ry: 12.5}, P1 = {x: 62, y: 126, rx: 72, ry: 14.5};
  const plat = (p, top, side, rim, k) => `<ellipse cx="${p.x}" cy="${p.y + 3}" rx="${p.rx}" ry="${p.ry}" fill="${side}"/>` +
    `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" fill="url(#${k})" stroke="${rim}" stroke-width="1.5"/>` + `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx * .62}" ry="${p.ry * .55}" fill="none" stroke="${rim}" stroke-opacity=".35" stroke-width="1"/>`;
  // Floor lines converging to a vanishing point.
  const rays = (vx, vy, y0, y1, n, col, op) => Array.from({length: n + 1}, (_, i) => {
    const x = -128 + i * (512 / n);
    return `<line x1="${f1(vx + (x - vx) * (y0 - vy) / (y1 - vy))}" y1="${y0}" x2="${f1(x)}" y2="${y1}" stroke="${col}" stroke-opacity="${op}" stroke-width=".8"/>`;
  }).join('');
  const rows = (y0, y1, n, col, op) => Array.from({length: n}, (_, i) => { const t = (i + 1) / (n + 1); const y = y0 + (y1 - y0) * t * t; return `<line x1="0" y1="${f1(y)}" x2="256" y2="${f1(y)}" stroke="${col}" stroke-opacity="${op}" stroke-width=".8"/>`; }).join('');

  const SCENES = {
    // Cynthia: a champion's chamber. Dark hall, tall pillars, a lit arch, polished floor.
    champion() {
      const pillars = [10, 50, 206, 246].map((x) => `<rect x="${x - 8}" y="0" width="16" height="66" fill="url(#pil)"/><rect x="${x - 10}" y="60" width="20" height="6" fill="#c9a24e"/><rect x="${x - 10}" y="6" width="20" height="4" fill="#c9a24e"/>`).join('');
      return {
        defs: grad('wall', [[0, '#141436'], [1, '#2d2a6a']]) + grad('pil', [[0, '#3a3680'], [.5, '#5b56b0'], [1, '#2b2866']], false) +
          grad('flr', [[0, '#3b3784'], [1, '#191842']]) + rgrad('glow', [[0, '#fff1c2', .9], [.5, '#f0c96a', .35], [1, '#f0c96a', 0]]) +
          rgrad('pa', [[0, '#6c66c0'], [.7, '#433e94'], [1, '#2c2870']]) + rgrad('pb', [[0, '#6c66c0'], [.7, '#433e94'], [1, '#2c2870']]),
        body: `<rect width="256" height="66" fill="url(#wall)"/>` +
          `<path d="M98,66 V30 A30,30 0 0 1 158,30 V66 Z" fill="#f3d98e" opacity=".22"/><path d="M106,66 V32 A22,22 0 0 1 150,32 V66 Z" fill="#fff4cf" opacity=".28"/>` +
          `<ellipse cx="128" cy="40" rx="70" ry="40" fill="url(#glow)" opacity=".5"/>` + pillars +
          `<rect y="66" width="256" height="126" fill="url(#flr)"/><rect y="65" width="256" height="2.5" fill="#c9a24e"/>` +
          rays(128, 30, 66, 192, 14, '#9e98ff', .22) + rows(66, 192, 7, '#9e98ff', .18) +
          `<path d="M108,67 L148,67 L176,192 L80,192 Z" fill="#f3d98e" opacity=".07"/>` +
          plat(P2, 0, '#1d1a52', '#c9a24e', 'pa') + plat(P1, 0, '#1d1a52', '#c9a24e', 'pb'),
      };
    },
    // Zinnia: the summit of a sky-high tower. Open sky, a sea of clouds, ruined columns, old stone.
    sky() {
      const r = rng('sky');
      const cloud = (x, y, k, c, o) => `<g fill="${c}" opacity="${o}">${[[0, 0, 1], [-.8, .25, .7], [.8, .25, .75], [-.35, -.3, .7], [.4, -.25, .6]].map(([dx, dy, s]) => `<ellipse cx="${f1(x + dx * k)}" cy="${f1(y + dy * k)}" rx="${f1(k * s)}" ry="${f1(k * s * .55)}"/>`).join('')}</g>`;
      const col = (x, h, broken) => `<rect x="${x}" y="${66 - h}" width="14" height="${h}" fill="url(#stone)"/>` +
        Array.from({length: Math.floor(h / 12)}, (_, i) => `<line x1="${x}" y1="${66 - i * 12}" x2="${x + 14}" y2="${66 - i * 12}" stroke="#5d6a63" stroke-width=".8"/>`).join('') +
        (broken ? `<path d="M${x},${66 - h} l4,-5 l3,3 l4,-6 l3,4 v4 z" fill="#a8b4a6"/>` : `<rect x="${x - 2}" y="${64 - h}" width="18" height="4" fill="#b9c4b5"/>`);
      return {
        defs: grad('sky', [[0, '#2f6fc4'], [.55, '#8fc8ec'], [1, '#e6f4f4']]) + grad('stone', [[0, '#8d9a8f'], [.5, '#b4c0b2'], [1, '#7c897f']], false) +
          grad('flr', [[0, '#a7b2a0'], [1, '#6f7c6e']]) + rgrad('sun', [[0, '#fffbe6', 1], [.4, '#fff3b8', .6], [1, '#fff3b8', 0]]) +
          rgrad('pa', [[0, '#c8d2bf'], [.7, '#9fac98'], [1, '#7d8a77']]) + rgrad('pb', [[0, '#c8d2bf'], [.7, '#9fac98'], [1, '#7d8a77']]),
        body: `<rect width="256" height="72" fill="url(#sky)"/><circle cx="196" cy="18" r="34" fill="url(#sun)"/>` +
          cloud(40, 20, 14, '#fff', .8) + cloud(120, 12, 10, '#fff', .6) + cloud(226, 44, 12, '#fff', .75) +
          `<path d="M0,58 Q32,50 64,57 T128,55 T192,57 T256,54 V72 H0 Z" fill="#f4fbff"/><path d="M0,64 Q40,58 80,63 T160,62 T256,61 V72 H0 Z" fill="#dcecf2"/>` +
          col(6, 44, true) + col(28, 30, false) + col(214, 36, false) + col(236, 52, true) +
          `<rect y="66" width="256" height="126" fill="url(#flr)"/><rect y="65" width="256" height="2" fill="#d4ddd0"/>` +
          rays(128, 20, 66, 192, 10, '#4f5b4f', .3) + rows(66, 192, 6, '#4f5b4f', .3) +
          Array.from({length: 14}, () => `<ellipse cx="${f1(r() * 256)}" cy="${f1(72 + r() * 110)}" rx="${f1(3 + r() * 5)}" ry="${f1(1 + r() * 1.5)}" fill="#6f9a5c" opacity=".55"/>`).join('') +
          plat(P2, 0, '#5d6a5a', '#e2e8dc', 'pa') + plat(P1, 0, '#5d6a5a', '#e2e8dc', 'pb'),
      };
    },
    // Elite Four: a league stadium. Crowd in the stands, spotlights, a court in the member's type color.
    arena(accent) {
      const r = rng('arena');
      const crowd = Array.from({length: 150}, (_, i) => {
        const row = i % 5, x = (Math.floor(i / 5) * 8.6 + row * 4.3) % 260;
        return `<circle cx="${f1(x)}" cy="${f1(30 + row * 6 + r() * 1.5)}" r="1.7" fill="${['#e8742f', '#4f8fe6', '#f0cc45', '#ea5a86', '#5fb046', '#efece6', '#8d5cbc'][Math.floor(r() * 7)]}" opacity=".45"/>`;
      }).join('');
      return {
        defs: grad('sky', [[0, '#1d1840'], [1, '#3a2f6a']]) + grad('flr', [[0, '#e9e4f6'], [1, '#c3b9e0']]) + grad('beam', [[0, '#fff', .55], [1, '#fff', 0]]) +
          rgrad('pa', [[0, '#ffffff'], [.7, '#efeaf9'], [1, '#d7cfee']]) + rgrad('pb', [[0, '#ffffff'], [.7, '#efeaf9'], [1, '#d7cfee']]),
        body: `<rect width="256" height="66" fill="url(#sky)"/>` +
          `<rect y="24" width="256" height="34" fill="#2b2452"/>` + crowd +
          `<rect y="56" width="256" height="10" fill="${accent}"/><rect y="56" width="256" height="2" fill="#fff" opacity=".6"/>` +
          [[30, -10], [128, 0], [226, 10]].map(([x, s]) => `<path d="M${x - 4},0 L${x + 4},0 L${x + 40 + s},192 L${x - 40 + s},192 Z" fill="url(#beam)" opacity=".25"/>`).join('') +
          `<rect y="66" width="256" height="126" fill="url(#flr)"/>` + rays(128, 10, 66, 192, 12, accent, .2) +
          `<ellipse cx="128" cy="104" rx="78" ry="22" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="2.5"/><line x1="0" y1="104" x2="256" y2="104" stroke="${accent}" stroke-opacity=".4" stroke-width="2"/>` +
          plat(P2, 0, '#b5a9d8', accent, 'pa') + plat(P1, 0, '#b5a9d8', accent, 'pb'),
      };
    },
    // Battle Factory: a rental warehouse. Green walls, conveyor belts of Poké Balls, steel floor.
    factory() {
      const balls = (y, off) => Array.from({length: 9}, (_, i) => { const x = off + i * 30; return `<circle cx="${x}" cy="${y}" r="4.5" fill="#f4f4f4" stroke="#1a1a1a" stroke-width="1"/><path d="M${x - 4.5},${y} A4.5,4.5 0 0 1 ${x + 4.5},${y} Z" fill="#e3352b" stroke="#1a1a1a" stroke-width="1"/>`; }).join('');
      return {
        defs: grad('wall', [[0, '#2f6a52'], [1, '#4f9a72']]) + grad('flr', [[0, '#9aa6a8'], [1, '#5f6a70']]) + grad('belt', [[0, '#3a3f48'], [1, '#22262c']]) +
          rgrad('pa', [[0, '#d8e8d8'], [.7, '#a8c0b0'], [1, '#809888']]) + rgrad('pb', [[0, '#d8e8d8'], [.7, '#a8c0b0'], [1, '#809888']]),
        body: `<rect width="256" height="66" fill="url(#wall)"/>` +
          Array.from({length: 9}, (_, i) => `<rect x="${i * 32}" y="0" width="3" height="66" fill="#245040" opacity=".6"/>`).join('') +
          `<rect y="10" width="256" height="12" fill="url(#belt)"/>` + balls(16, 8) + `<rect y="30" width="256" height="12" fill="url(#belt)"/>` + balls(36, 23) +
          `<rect x="96" y="44" width="64" height="20" rx="3" fill="#20303a"/><rect x="100" y="48" width="56" height="10" fill="#58f0a8" opacity=".8"/>` +
          `<rect y="62" width="256" height="4" fill="#f0c040"/>` +
          `<rect y="66" width="256" height="126" fill="url(#flr)"/>` + rays(128, 20, 66, 192, 12, '#2a3036', .35) + rows(66, 192, 7, '#2a3036', .35) +
          plat(P2, 0, '#5a6e62', '#f0c040', 'pa') + plat(P1, 0, '#5a6e62', '#f0c040', 'pb'),
      };
    },
  };

  const LOC = {cynthia: 'champion', zinnia: 'sky', factory: 'factory'};
  // opp: an opponent from Core.OPP or an Elite Four member's opponent. typeColor: the member's type color.
  function background(opp, typeColor) {
    const s = SCENES[LOC[opp.id] || (opp.member ? 'arena' : 'champion')](typeColor || '#e8742f');
    return `<svg class="bg" viewBox="0 0 256 192" preserveAspectRatio="none" aria-hidden="true"><defs>${s.defs}</defs>${s.body}</svg>`;
  }

  // ---------- player trainers ----------
  // Original outfits in each game's colors. Keys match PROTAG in app.js.
  const SKIN = '#f4cfae', SKIN_D = '#d9a988', OUT = '#1d1a2b';
  const LOOK = {
    lucas: {hat: 'beret', hatC: '#d8392f', hair: '#2b2622', top: '#24304f', trim: '#e6e3da', scarf: '#d8392f', low: 'pants', lowC: '#c9b48c', shoe: '#c43a2f', bag: '#c6a05c'},
    dawn: {hat: 'beanie', hatC: '#f4f2ec', pin: '#f26d9a', hair: '#273257', long: true, top: '#2a2a34', trim: '#f26d9a', scarf: '#e33b4b', low: 'skirt', lowC: '#f07aa5', shoe: '#f07aa5', sock: '#2a2a34', bag: '#f6d36a'},
    brendan: {hat: 'beanie', hatC: '#2a2a30', band: '#d93b34', hair: '#e8e6e2', top: '#d93b34', trim: '#2a2a30', low: 'pants', lowC: '#2a2a30', shoe: '#d93b34', bag: '#3f6d3a'},
    may: {hat: 'bandana', hatC: '#d93b34', hair: '#7a4a2a', long: true, top: '#d93b34', trim: '#2a2a30', low: 'shorts', lowC: '#2a2a30', shoe: '#d93b34', sock: '#2a2a30', bag: '#f2c94c'},
    florian: {hat: 'cap', hatC: '#f0a93a', hair: '#5a3a26', top: '#f0a93a', trim: '#f4f2ec', low: 'shorts', lowC: '#3d4b78', shoe: '#e6e3da', sock: '#f4f2ec', bag: '#3d4b78'},
    juliana: {hat: 'cap', hatC: '#f0a93a', hair: '#2c2423', long: true, top: '#f0a93a', trim: '#f4f2ec', low: 'skirt', lowC: '#3d4b78', shoe: '#e6e3da', sock: '#f4f2ec', bag: '#9b5bbf'},
  };
  // viewBox 0 0 60 100, feet at y=96.
  function trainer(key, view, size) {
    const L = LOOK[key];
    if (!L) throw new Error('Scenes: unknown trainer ' + key);
    const front = view === 'front';
    const legC = L.low === 'pants' ? L.lowC : (L.sock || SKIN);
    let o = '';
    if (L.long && !front) o += `<path d="M17,26 Q14,48 20,54 L40,54 Q46,48 43,26 Z" fill="${L.hair}"/>`;
    if (!front) o += `<rect x="18" y="38" width="24" height="20" rx="4" fill="${L.bag}"/>`;
    o += `<rect x="22" y="70" width="7" height="22" rx="3" fill="${legC}"/><rect x="31" y="70" width="7" height="22" rx="3" fill="${legC}"/>`;
    o += `<ellipse cx="25" cy="94" rx="6" ry="3.5" fill="${L.shoe}"/><ellipse cx="35" cy="94" rx="6" ry="3.5" fill="${L.shoe}"/>`;
    if (L.low === 'skirt') o += `<path d="M18,62 L42,62 L47,76 L13,76 Z" fill="${L.lowC}"/>`;
    else if (L.low === 'shorts') o += `<path d="M19,62 L41,62 L42,76 L31,76 L30,70 L29,76 L18,76 Z" fill="${L.lowC}"/>`;
    else o += `<path d="M19,62 L41,62 L40,72 L20,72 Z" fill="${L.lowC}"/>`;
    o += `<rect x="12" y="40" width="7" height="22" rx="3.5" fill="${L.top}"/><rect x="41" y="40" width="7" height="22" rx="3.5" fill="${L.top}"/>`;
    o += `<circle cx="15.5" cy="63" r="3.5" fill="${SKIN}"/><circle cx="44.5" cy="63" r="3.5" fill="${SKIN}"/>`;
    o += `<path d="M18,40 Q30,34 42,40 L42,64 L18,64 Z" fill="${L.top}"/>`;
    o += front ? `<path d="M30,40 L30,64" stroke="${L.trim}" stroke-width="2.5" fill="none"/>` : `<path d="M18,60 L42,60" stroke="${L.trim}" stroke-width="2.5" fill="none"/>`;
    if (!front) o += `<path d="M20,40 L22,62 M40,40 L38,62" stroke="${OUT}" stroke-width="2" fill="none"/>`;
    if (L.scarf) o += `<path d="M20,38 Q30,44 40,38 L40,42 Q30,48 20,42 Z" fill="${L.scarf}"/>`;
    // head
    o += `<circle cx="30" cy="25" r="13" fill="${front ? SKIN : L.hair}"/>`;
    if (front) {
      o += `<path d="M17,24 Q18,12 30,12 Q42,12 43,24 Q38,18 30,19 Q22,18 17,24 Z" fill="${L.hair}"/>`;
      if (L.long) o += `<path d="M17,22 Q14,38 18,44 L21,42 Q19,32 20,24 Z M43,22 Q46,38 42,44 L39,42 Q41,32 40,24 Z" fill="${L.hair}"/>`;
      o += `<ellipse cx="25" cy="27" rx="1.8" ry="2.4" fill="${OUT}" stroke="none"/><ellipse cx="35" cy="27" rx="1.8" ry="2.4" fill="${OUT}" stroke="none"/>`;
      o += `<path d="M27,33 Q30,35 33,33" fill="none" stroke="${SKIN_D}" stroke-width="1.4"/>`;
    }
    // hat
    if (L.hat === 'beret') o += `<ellipse cx="30" cy="14" rx="16" ry="6" fill="${L.hatC}"/><circle cx="30" cy="8.5" r="2" fill="${L.hatC}"/>`;
    if (L.hat === 'beanie') o += `<path d="M16,20 Q16,6 30,6 Q44,6 44,20 Z" fill="${L.hatC}"/>` + (L.band ? `<rect x="15" y="17" width="30" height="5" rx="2" fill="${L.band}"/>` : '') + (L.pin ? `<circle cx="${front ? 37 : 23}" cy="15" r="3" fill="${L.pin}"/>` : '');
    if (L.hat === 'bandana') o += `<path d="M16,19 Q16,9 30,9 Q44,9 44,19 Z" fill="${L.hatC}"/>` + (front ? '' : `<path d="M28,18 L22,28 L27,27 L30,20 L33,27 L38,28 L32,18 Z" fill="${L.hatC}"/>`);
    if (L.hat === 'cap') o += `<path d="M17,19 Q17,8 30,8 Q43,8 43,19 Z" fill="${L.hatC}"/>` + (front ? `<path d="M17,19 Q30,15 43,19 L46,22 Q30,18 14,22 Z" fill="${L.hatC}"/>` : '') + `<circle cx="30" cy="9" r="1.6" fill="${L.trim}"/>`;
    return `<svg class="trainer" viewBox="0 0 60 100" width="${size * .6}" height="${size}" role="img" aria-label="${key}"><g stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round">${o}</g></svg>`;
  }

  window.Scenes = {background, trainer};
})();
