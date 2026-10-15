(function () {
  const C = window.Core;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  const TYPE_COLOR = window.Art.TYPE_COLOR;
  const KEY = 'champdaily:v2';
  const OPPS = [C.OPP.cynthia, C.OPP.zinnia];

  // ---------------- storage ----------------
  function readKey(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
  const S = Object.assign({stats: {}, runs: {}, music: {vol: 0.5, speed: 'normal'}, lib: [], style: 'default', art: 'sprites'}, readKey(KEY) || {});
  // Bump RULES whenever teams, levels or battle rules change. A saved battle is a replayed choice log,
  // so an unfinished run from older rules would replay into a different battle; it restarts instead.
  const RULES = 5;
  for (const [k, r] of Object.entries(S.runs)) {
    const finished = r.result || r.status === 'won' || r.status === 'lost';
    if (!finished && r.rules !== RULES) { delete S.runs[k]; S.staleCleared = true; }
  }
  if (S.staleCleared) { delete S.staleCleared; save(); }
  // Battle screen styles; 'default' follows the opponent's own generation.
  const STYLES = {default: 'Default (match the opponent)', gen3: 'Gen 3 (Ruby, Sapphire, Emerald)', gen4: 'Gen 4 (Diamond, Pearl, Platinum)', gen6: 'Gen 6 (X, Y, ORAS)'};
  const STYLE_SKIN = {gen3: 'gen3', gen4: 'dppt', gen6: 'oras'};
  const skinFor = (o) => STYLE_SKIN[S.style] || o.skin;
  const SKIN_LABEL = {gen3: 'Gen 3', dppt: 'Gen 4', oras: 'Gen 6', sv: 'Gen 9'};
  // Player character: the protagonist of the opponent's game, by chosen gender.
  const PROTAG = {cynthia: {male: 'Lucas', female: 'Dawn'}, zinnia: {male: 'Brendan', female: 'May'}, e4: {male: 'Florian', female: 'Juliana'}, factory: {male: 'Brendan', female: 'May'}};
  const protagFor = (o) => (PROTAG[o.member || o.id === 'e4' ? 'e4' : o.id] || PROTAG.cynthia)[S.player === 'female' ? 'female' : 'male'];
  // Trainer sprites are linked from Showdown like the Pokémon sprites; protagonists fall back to the drawn trainers.
  const PROTAG_SPR = {lucas: 'lucas-gen4pt', dawn: 'dawn-gen4pt', brendan: 'brendan', may: 'may', florian: 'florian-s', juliana: 'juliana-s'};
  const TR_SUFFIX = {gen3: '-gen3', dppt: '-gen4', oras: '-gen6', sv: ''};
  function trSprite(names, size, fallback) {
    const urls = [...new Set(names)].map((n) => SPR + 'trainers/' + n + '.png');
    return `<img class="trsp" src="${urls[0]}" data-fb="${urls.slice(1).join(' ')}" data-tfb="${fallback || ''}" data-size="${size}" width="${size}" height="${size}" alt="" onerror="__trFail(this)">`;
  }
  window.__trFail = (img) => {
    const [next, ...rest] = img.dataset.fb.split(' ').filter(Boolean);
    if (next) { img.dataset.fb = rest.join(' '); img.src = next; return; }
    const k = img.dataset.tfb;
    if (k) img.outerHTML = window.Scenes.trainer(k, 'front', +img.dataset.size); else img.remove();
  };
  const protagArt = (o, view, size) => {
    const k = protagFor(o).toLowerCase();
    // The Battle Factory is Emerald's, so its Brendan and May wear their Emerald outfits.
    return S.art === 'drawn' ? window.Scenes.trainer(k, view, size) : trSprite(o.id === 'factory' ? [k + '-e', PROTAG_SPR[k]] : [PROTAG_SPR[k]], size, k);
  };
  // Opponent trainer: the battle style's era variant first, then the plain and older sprites.
  const oppArt = (o, size) => {
    if (S.art === 'drawn') return '';
    if (o.sprite) return trSprite([o.sprite, o.sprite.replace(/-gen3$/, '')], size);
    const id = o.member ? o.member.id : o.id;
    return trSprite([id + TR_SUFFIX[skinFor(o)], id, id + '-gen3', id + '-gen1'], size);
  };
  const styleNote = (o) => '<button class="btn tiny ghost style-note" data-style-open>' + protagArt(o, 'front', 30) + 'Battle style: ' + SKIN_LABEL[skinFor(o)] + (S.style === 'default' ? ' (default)' : '') + ' · Playing as ' + protagFor(o) + '</button>';
  // Music preferences: one battle theme ('default' = each opponent's own) and one menu track. Older per-slot settings are dropped.
  delete S.music.slots;
  S.music = Object.assign({battle: 'default', menu: 'y:lilycove'}, S.music);
  if (!readKey(KEY)) { // carry over records from the first version
    const old = readKey('champdaily:v1');
    if (old && old.stats) for (const d of ['easy', 'hard']) if (old.stats[d]) S.stats['cynthia:' + d] = old.stats[d];
    if (old && old.music) { S.music.vol = old.music.vol ?? 0.5; S.music.muted = old.music.muted; S.music.sfx = old.music.sfx; S.music.speed = old.music.speed || 'normal'; }
  }
  const stat = (opp, d) => (S.stats[opp + ':' + d] = Object.assign({w: 0, l: 0, streak: 0, best: 0, lastDay: null}, S.stats[opp + ':' + d]));

  // ---------------- per-opponent context ----------------
  let OPP = C.OPP.cynthia;
  let D = C.dexFor(4);
  function setOpp(o) { OPP = o; D = C.dexFor(o.gen); }

  // ---------------- Pokémon art (src/art.js) ----------------
  const drawn = (species, size, opts = {}) => window.Art.draw(species, opts.dex || D, size, Object.assign({fit: !opts.battle}, opts));
  // Official sprites are linked from Pokémon Showdown's sprite server, never stored in this repo.
  // Each battle style tries its era's sprite set first, then newer sets, then falls back to the drawn art.
  const SPR = 'https://play.pokemonshowdown.com/sprites/';
  const SPR_SETS = {gen3: ['gen3', 'gen4', 'gen5', 'ani'], dppt: ['gen4', 'gen5', 'ani'], oras: ['ani', 'gen5'], sv: ['ani', 'gen5'], thumb: ['gen5', 'ani']};
  // Natural sprite width -> share of the battle screen's width (cqw). Pixel sets sit on a 256px-wide screen.
  const SPR_SCALE = {gen3: 256, gen4: 256, gen5: 290, ani: 400};
  function glyph(species, size, opts = {}) {
    if (S.art === 'drawn') return drawn(species, size, opts);
    const dex = opts.dex || D, sp = dex.species.get(species);
    const sets = opts.battle ? SPR_SETS[skinFor(OPP)] : SPR_SETS.thumb;
    // Forms with no sprite of their own (Greninja-Bond looks like Greninja) fall back to the base species before the drawn art.
    const ids = [sp.spriteid, dex.species.get(sp.baseSpecies).spriteid].filter((v, i, a) => a.indexOf(v) === i);
    const urls = ids.flatMap((id) => sets.map((s) => SPR + s + (opts.back ? '-back' : '') + '/' + id + (s === 'ani' ? '.gif' : '.png')));
    return `<img class="glyph spr${opts.battle ? '' : ' thumb'}" src="${urls[0]}" data-fb="${urls.slice(1).join(' ')}" data-sp="${esc(sp.name)}" data-gen="${dex.gen}" data-size="${size}"${opts.back ? ' data-back="1"' : ''}${opts.battle ? ' data-battle="1"' : ''} width="${size}" height="${size}" alt="${esc(sp.name)}" onerror="__sprFail(this)" onload="__sprLoad(this)">`;
  }
  window.__sprFail = (img) => {
    const [next, ...rest] = img.dataset.fb.split(' ').filter(Boolean);
    if (next) { img.dataset.fb = rest.join(' '); img.src = next; return; }
    const d = img.dataset;
    img.outerHTML = drawn(d.sp, +d.size, {dex: C.dexFor(+d.gen), back: !!d.back, battle: !!d.battle});
  };
  window.__sprLoad = (img) => {
    if (!img.dataset.battle) return;
    const set = img.src.split('/sprites/')[1].split('/')[0].replace('-back', '');
    img.style.width = (100 * img.naturalWidth / SPR_SCALE[set]).toFixed(1) + 'cqw';
    img.style.height = 'auto';
  };
  const typeChip = (t) => `<span class="type" style="--tc:${TYPE_COLOR[t]}">${t}</span>`;
  const itemName = (x) => x ? D.items.get(x).name : 'None';
  const abilName = (x) => D.abilities.get(x).name;

  // ---------------- music ----------------
  const BUILTIN = {
    menu: {label: 'Champion Daily menu', bpm: 92, loop: true, lead: [12, null, 15, 19, 17, null, 15, 12, 10, null, 12, 15, 14, null, null, null, 12, null, 15, 19, 22, null, 20, 19, 17, 15, 14, 15, 12, null, null, null], bass: [0, 0, 7, 7, 5, 5, 3, 3]},
    hall: {label: 'Champion\'s Hall', bpm: 170, loop: true, lead: [24, 22, 19, 22, 24, 27, 26, 24, 22, 19, 17, 19, 22, null, 19, null, 24, 22, 19, 22, 24, 27, 29, 31, 29, 27, 26, 24, 22, 24, null, null], bass: [0, 12, 0, 12, 0, 12, 0, 12, -2, 10, -2, 10, -4, 8, -2, 10]},
    sky: {label: 'Pillar Wind', bpm: 154, loop: true, lead: [19, 23, 26, 23, 28, 26, 23, 21, 19, null, 21, 23, 26, null, null, null, 24, 26, 28, 31, 30, 28, 26, 24, 23, 24, 26, 23, 19, null, 21, null], bass: [-2, 10, -2, 10, 3, 15, 3, 15, 5, 17, 5, 17, 0, 12, 2, 14]},
    league: {label: 'League Gauntlet', bpm: 182, loop: true, lead: [17, 20, 24, 20, 25, 24, 20, 17, 15, 17, 20, null, 22, 20, 17, null, 17, 20, 24, 27, 29, 27, 24, 22, 20, 22, 24, 22, 20, 17, 15, null], bass: [0, 12, 0, 12, 3, 15, 3, 15, 5, 17, 5, 17, 7, 19, 7, 19]},
    pinch: {label: 'Last Stand', bpm: 196, loop: true, lead: [27, 26, 24, 26, 27, 31, 27, 26, 24, 22, 24, 26, 27, null, 31, null, 32, 31, 29, 27, 26, 27, 29, 31, 34, 32, 31, 29, 27, 26, 24, null], bass: [0, 0, 12, 0, 1, 1, 13, 1]},
    victory: {label: 'Victory jingle', bpm: 150, loop: false, lead: [19, 19, 19, 24, null, 22, 24, null, 27, 26, 24, 26, 31, null, null, null], bass: [0, 7, 5, 7, 3, 7, 0, null]},
    defeat: {label: 'Defeat jingle', bpm: 80, loop: false, lead: [15, 14, 12, 10, 9, null, 7, null, 5, null, null, null], bass: [0, null, -2, null, -5, null]},
  };
  // Official tracks play through YouTube's embedded player (shown in the "Now playing" dock, as YouTube requires).
  // Fan uploads can disappear; a failed video falls back to the built-in chiptune.
  const YT_THEMES = {
    cynthia: ['Battle! Champion Cynthia · Diamond & Pearl', '873qDiTimak'],
    zinnia: ['Battle! Zinnia · Omega Ruby & Alpha Sapphire', 'GIn8_Q27WFY'],
    e4g1: ['Battle! Gym Leader & Elite Four · FireRed & LeafGreen', 'VxFadPqMbfM'],
    e4g2: ['Battle! Gym Leader & Elite Four · Gold, Silver & Crystal', '1pBl5sWchJY'],
    e4g3: ['Battle! Gym Leader & Elite Four · Ruby, Sapphire & Emerald', '0j4sfjIXTA0'],
    e4g4: ['Battle! Elite Four · Diamond & Pearl', 'N7A1wpmdHJ4'],
    e4g5: ['Battle! Elite Four · Black & White', 'llnXhrCn9Yo'],
    e4g6: ['Battle! Elite Four · X & Y', 'AclbLQK1hdA'],
    e4g7: ['Battle! Elite Four · Sun & Moon', 'Dv7AXRqjTuQ'],
    e4g9: ['Battle! Elite Four · Scarlet & Violet', 'Bjz2R7sDALw'],
    e4bb: ['Battle! Blueberry League Elite Four · The Indigo Disk', 'jYGGNoV6TvY'],
    rsetrainer: ['Battle! Trainer · Ruby, Sapphire & Emerald', 'Cp-waxoLel8'],
    frontierbrain: ['Battle! Frontier Brain · Emerald', 'U730ft9yESk'],
    lilycove: ['Lilycove City · Ruby, Sapphire & Emerald', 'y0vVeMsCMWI'],
    factory: ['Battle Factory · Emerald', 'rzqvegiZpWw'],
  };
  // Showdown's own battle music, hotlinked like the sprites.
  const SD_THEMES = {'hgss-kanto-trainer': 'Trainer (Kanto) · HeartGold & SoulSilver', 'hgss-johto-trainer': 'Trainer (Johto) · HeartGold & SoulSilver',
    'dpp-trainer': 'Trainer · Diamond, Pearl & Platinum', 'dpp-rival': 'Rival · Diamond, Pearl & Platinum', 'bw-trainer': 'Trainer · Black & White',
    'bw-rival': 'Rival · Black & White', 'bw2-rival': 'Rival · Black 2 & White 2', 'bw2-kanto-gym-leader': 'Kanto Gym Leader · Black 2 & White 2',
    'bw-subway-trainer': 'Subway Trainer · Black & White', 'xy-trainer': 'Trainer · X & Y', 'xy-rival': 'Rival · X & Y', 'oras-trainer': 'Trainer · Omega Ruby & Alpha Sapphire',
    'oras-rival': 'Rival · Omega Ruby & Alpha Sapphire', 'sm-trainer': 'Trainer · Sun & Moon', 'sm-rival': 'Rival · Sun & Moon', 'spl-elite4': 'Elite Four · Showdown Premier League'};
  const SD_AUDIO = 'https://play.pokemonshowdown.com/audio/';
  // Each opponent's own theme; E4 members use their debut generation's Elite Four music.
  function defaultBattle(o) {
    if (o.factory) return o.factory.head ? 'y:frontierbrain' : 'y:rsetrainer';
    if (o.member) return o.member.from === 'The Indigo Disk' ? 'y:e4bb' : 'y:e4g' + (YT_THEMES['e4g' + o.member.gen] ? o.member.gen : 9);
    return o.id === 'zinnia' ? 'y:zinnia' : 'y:cynthia';
  }
  const FALLBACK = {menu: 'b:menu', battle: 'b:hall'};
  function sourceLabel(src) {
    if (!src || src === 'off') return 'Off';
    const k = src.slice(2);
    if (src.startsWith('y:')) return YT_THEMES[k] ? YT_THEMES[k][0] : k;
    if (src.startsWith('s:')) return SD_THEMES[k] || k;
    if (src.startsWith('b:')) return BUILTIN[k] ? BUILTIN[k].label + ' (chiptune)' : k;
    const t = S.lib.find((x) => x.id === k); return t ? t.name : 'Missing track';
  }
  // The source for a music slot right now: menu, battle, victory or defeat.
  function sourceFor(slot) {
    if (slot === 'victory' || slot === 'defeat') return 'b:' + slot;
    if (slot === 'battle') return (G && G.music) || (S.music.battle !== 'default' ? S.music.battle : defaultBattle(OPP));
    // The Factory lobby plays the Battle Factory theme unless the player picked their own menu track.
    if (document.body.dataset.opp === 'factory' && (S.music.menu || 'y:lilycove') === 'y:lilycove') return 'y:factory';
    return S.music.menu || 'y:lilycove';
  }

  const Music = (() => {
    let ctx = null, gain = null, cur = null, curSlot = null, el = null, timer = null;
    const urls = {};
    let db = null;
    function openDB() {
      if (db) return Promise.resolve(db);
      return new Promise((res) => {
        try {
          const r = indexedDB.open('champdaily-library', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('tracks');
          r.onsuccess = () => { db = r.result; res(db); };
          r.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    }
    async function getTrack(id) {
      if (!(await openDB())) return null;
      return new Promise((res) => {
        try { const q = db.transaction('tracks').objectStore('tracks').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); }
      });
    }
    async function addTrack(file) {
      if (!(await openDB())) return null;
      const id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return new Promise((res) => {
        try {
          const tx = db.transaction('tracks', 'readwrite');
          tx.objectStore('tracks').put({blob: file}, id);
          tx.oncomplete = () => res(id); tx.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    }
    async function delTrack(id) {
      if (await openDB()) { try { db.transaction('tracks', 'readwrite').objectStore('tracks').delete(id); } catch (e) {} }
      if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
    }
    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC(); gain = ctx.createGain(); gain.connect(ctx.destination);
      }
      gain.gain.value = S.music.vol * 0.35;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const freq = (n) => 220 * Math.pow(2, n / 12);
    function playSynth(name, loop) {
      const c = ensureCtx(); if (!c) return null;
      const song = BUILTIN[name];
      const step = 60 / song.bpm / 2;
      const leadLen = song.lead.length, total = Math.max(leadLen, song.bass.length * 2);
      const t0 = c.currentTime + 0.05; let i = 0;
      const token = {stop: false};
      function note(type, f, at, dur, vol) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
        o.connect(g); g.connect(gain); o.start(at); o.stop(at + dur + 0.02);
      }
      function sched() {
        if (token.stop) return;
        while (t0 + i * step < c.currentTime + 0.4) {
          if (!loop && i >= total) { clearInterval(timer); return; }
          const at = t0 + i * step, k = i % total;
          const L = song.lead[k % leadLen];
          if (L != null) note('square', freq(L), at, step * 0.9, 0.16);
          if (k % 2 === 0) { const B = song.bass[(k / 2) % song.bass.length]; if (B != null) note('triangle', freq(B - 12), at, step * 1.8, 0.5); }
          if (loop && name !== 'menu' && k % 4 === 2) note('square', 1800 + (k % 8) * 40, at, 0.025, 0.04);
          i++;
        }
      }
      timer = setInterval(sched, 90); sched();
      return token;
    }
    // ---- YouTube player (lazy-loaded IFrame API, one player reused) ----
    let yt = null, ytApi = null, ytLoop = false, ytToken = 0;
    function loadYT() {
      if (ytApi) return ytApi;
      ytApi = new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('YouTube API timed out')), 10000);
        window.onYouTubeIframeAPIReady = () => { clearTimeout(t); res(); };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => { clearTimeout(t); rej(new Error('YouTube API blocked')); };
        document.head.appendChild(s);
      });
      ytApi.catch(() => { ytApi = null; });
      return ytApi;
    }
    function dock(src) {
      const d = document.getElementById('music-dock');
      d.hidden = !src;
      if (src) document.getElementById('md-title').textContent = sourceLabel(src);
    }
    async function playYT(src, loop, fallback) {
      const [, id] = YT_THEMES[src.slice(2)] || [];
      const token = ++ytToken;
      const fail = () => { if (token === ytToken && curSrc === src) { dock(null); if (yt) yt.stopVideo(); playSource(fallback, loop); } };
      if (!id) return fail();
      try { await loadYT(); } catch (e) { return fail(); }
      if (token !== ytToken) return;
      ytLoop = loop; dock(src);
      const vol = Math.round(S.music.vol * 100);
      if (!yt) {
        await new Promise((ready) => {
          yt = new YT.Player('yt-player', {width: 200, height: 200, videoId: id,
            playerVars: {autoplay: 1, playsinline: 1, rel: 0, controls: 1},
            events: {
              onReady: (e) => { e.target.setVolume(vol); e.target.playVideo(); ready(); },
              onError: () => fail(),
              onStateChange: (e) => { if (e.data === 0 && ytLoop) { e.target.seekTo(0); e.target.playVideo(); } },
            }});
        });
      } else { yt.setVolume(vol); yt.loadVideoById(id); }
    }
    let curSrc = null;
    async function playSource(src, loop) {
      curSrc = src;
      if (!src || src === 'off') return;
      if (src.startsWith('b:')) { cur = playSynth(src.slice(2), loop); return; }
      if (src.startsWith('y:')) return playYT(src, loop, src === sourceFor('menu') ? FALLBACK.menu : FALLBACK.battle);
      if (src.startsWith('s:')) { el = new Audio(SD_AUDIO + src.slice(2) + '.mp3'); el.loop = loop; el.volume = S.music.vol; el.play().catch(() => {}); return; }
      const id = src.slice(2);
      const rec = await getTrack(id);
      if (!rec) { return; }
      if (!urls[id]) urls[id] = URL.createObjectURL(rec.blob);
      el = new Audio(urls[id]); el.loop = loop; el.volume = S.music.vol;
      el.play().catch(() => {});
    }
    async function play(slot, force) {
      const src = sourceFor(slot);
      if (!force && curSlot === slot && curSrc === src) return;
      stop(); curSlot = slot;
      if (S.music.muted) return;
      const loop = slot === 'menu' || slot === 'battle';
      if (src.startsWith('u:') && !S.lib.some((t) => t.id === src.slice(2))) return playSource(FALLBACK[slot] || 'b:menu', loop);
      await playSource(src, loop);
    }
    async function preview(src) { stop(); curSlot = '__preview'; if (!S.music.muted) await playSource(src, false); }
    function stop() {
      if (cur) cur.stop = true; cur = null;
      clearInterval(timer);
      if (el) { el.pause(); el = null; }
      ytToken++; if (yt && yt.pauseVideo) yt.pauseVideo(); dock(null); curSrc = null;
      if (gain && ctx) { gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03); gain = ctx.createGain(); gain.connect(ctx.destination); gain.gain.value = S.music.vol * 0.35; }
      curSlot = null;
    }
    function setVol(v) { S.music.vol = v; if (gain) gain.gain.value = v * 0.35; if (el) el.volume = v; if (yt && yt.setVolume) yt.setVolume(Math.round(v * 100)); }
    function blip(f = 880) {
      if (S.music.muted || S.music.sfx === false) return;
      const c = ensureCtx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0005, c.currentTime + 0.06);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(c.currentTime + 0.07);
    }
    return {play, preview, stop, setVol, addTrack, delTrack, blip, get slot() { return curSlot; }, get src() { return curSrc; }, unlock: ensureCtx};
  })();
  function currentMusicSlot() {
    const v = document.body.dataset.view;
    return v === 'battle' && G && !G.b.ended ? 'battle' : 'menu';
  }

  // ---------------- daily state ----------------
  const today = C.dateKey();
  const diff = 'hard'; // single mode; records are keyed by this
  const LV = `Lv${C.OPP_LEVEL.team}, ace Lv${C.OPP_LEVEL.ace}`;
  const teams = {}, foes = {};
  const teamFor = (o) => {
    if (o.member || o.id === 'e4') return teams.e4 || (teams.e4 = C.playerTeam(today, E4.PLAYER));
    return teams[o.id] || (teams[o.id] = C.playerTeam(today, o));
  };
  const foeFor = (o) => foes[o.id] || (foes[o.id] = o.member ? E4.team(today, o.member) : C.oppTeam(today, o));
  const leads = {cynthia: 0, zinnia: 0, e4: 0};
  const pleads = {}; // practice leads, per opponent
  const LINEUP = E4.lineup(today);
  const E4KEY = `${today}:e4`;
  let G = null;
  const runKey = (o = OPP, d = diff) => `${today}:${o.id}:${d}`;
  const dName = (d) => (d === 'easy' ? 'Easy' : 'Hard');
  function reorder(t, i) { const a = t.slice(); const [x] = a.splice(i, 1); a.unshift(x); return a; }

  function show(view) {
    $('#tip').hidden = true;
    $('#home').hidden = view !== 'home';
    $('#lobby').hidden = view !== 'lobby';
    $('#battle').hidden = view !== 'battle';
    $('#about').hidden = view !== 'about';
    document.body.dataset.view = view;
    document.body.dataset.opp = view === 'home' || view === 'about' ? '' : (OPP.member || OPP.id === 'e4' ? 'e4' : OPP.id);
    window.scrollTo(0, 0);
  }

  // ---------------- main menu ----------------
  function renderHome() {
    const num = C.dayNumber(today);
    $('#home').innerHTML = `
      <section class="hero">
        <p class="eyebrow">Day ${num} · ${today}</p>
        <h1>Champion <em>Daily</em></h1>
        <p class="lede">Pick today's opponent. Each champion brings her team from her original game, and you get a fresh random team for each fight every day, the same for everyone.</p>
      </section>
      <div class="opp-grid">${OPPS.map((o) => {
        setOpp(o);
        const r = S.runs[runKey(o)]; const st = r && r.result ? r.result : r ? 'live' : 'open';
        const chips = `<span class="chip ${st}">Today <b>${st === 'win' ? 'Won' : st === 'loss' ? 'Lost' : st === 'live' ? 'In progress' : 'Open'}</b></span>`;
        return `<article class="opp-card" data-o="${o.id}">
          <div class="opp-top"><span class="gen-badge">${o.mechanics}</span><span class="opp-place">${o.place}</span></div>
          <h2>${o.title}</h2>
          <div class="opp-mons">${foeFor(o).map((m) => glyph(m.species, 38)).join('')}</div>
          <p class="opp-desc">${o.gen === 4 ? 'Diamond, Pearl and Platinum battle rules. Physical/special split, no Fairy type.' : 'Omega Ruby and Alpha Sapphire battle rules. Fairy type, Mega Evolution and the Gen 6 type chart.'}</p>
          <div class="chips">${chips}</div>
          <button class="btn gold" data-go="${o.id}">Battle ${o.name}</button>
        </article>`;
      }).join('')}${e4Card()}${factoryCard()}</div>
      <p class="foot-note">New teams in <b class="countdown">--:--:--</b></p>`;
    $('#home').querySelectorAll('[data-go]').forEach((b) => b.onclick = () => { Music.blip(); if (b.dataset.go === 'e4') openE4(); else if (b.dataset.go === 'factory') openFactory(); else openLobby(C.OPP[b.dataset.go]); });
    tick();
  }
  function goHome() { G = null; show('home'); renderHome(); Music.play('menu'); }

  // ---------------- opponent lobby ----------------
  function monCard(set, i, opts = {}) {
    const sp = D.species.get(set.species);
    return `<button class="mon${opts.lead ? ' is-lead' : ''}" data-i="${i}" ${opts.static ? 'disabled' : ''} aria-pressed="${!!opts.lead}">
      <div class="mon-g">${glyph(set.species, 64)}</div>
      <div class="mon-b">
        <div class="mon-top"><span class="mon-name">${esc(sp.name)}</span><span class="mon-lv">Lv${opts.level || set.level || 100}</span>${opts.lead ? `<span class="lead-tag">${opts.tag || 'LEAD'}</span>` : ''}${opts.ace ? '<span class="lead-tag ace">ACE</span>' : ''}</div>
        <div class="mon-types">${sp.types.map(typeChip).join('')}</div>
        <div class="mon-meta">${esc(itemName(D.toID(set.item)))} · ${esc(abilName(D.toID(set.ability)))}${set.nature ? ' · ' + set.nature : ''}</div>
        <ul class="mon-moves">${set.moves.map((m) => { const mv = D.moves.get(m); return `<li style="--tc:${TYPE_COLOR[mv.type]}">${esc(mv.name)}</li>`; }).join('')}</ul>
      </div>
    </button>`;
  }
  function openLobby(o) { setOpp(o); show('lobby'); renderLobby(); Music.play('menu'); }
  function renderLobby() {
    const o = OPP;
    const run = S.runs[runKey()];
    const st = stat(o.id, diff);
    const team = teamFor(o), foe = foeFor(o);
    const done = !!(run && run.result);
    // After today's battle, the grid picks the practice lead (defaults to today's lead).
    const lead = done ? (pleads[o.id] ?? run.lead) : leads[o.id];
    const doneTxt = run && run.result ? (run.result === 'win' ? `You beat ${o.name} today.` : `${o.name} won today.`) : run ? 'Battle in progress.' : '';
    $('#lobby').innerHTML = `
      <button class="back" id="btn-back">← All opponents</button>
      <section class="hero">
        <div class="hero-tr">${oppArt(o, 120)}</div>
        <p class="eyebrow">Day ${C.dayNumber(today)} · Gen ${o.gen} battle rules · ${o.place} · ${LV}</p>
        <h1 class="opp-h">${o.title.replace(o.name, `<em>${o.name}</em>`)}</h1>
        <div class="cta-row">
          ${run && run.result
            ? `<button class="btn gold" id="btn-result">See result</button><button class="btn" id="btn-practice">Practice battle</button>`
            : `<button class="btn gold" id="btn-start">${run ? 'Resume battle' : 'Challenge ' + o.name}</button>`}
          ${styleNote(o)}<span class="status-line">${doneTxt}</span>
        </div>
        <dl class="stats">
          <div><dt>Wins</dt><dd>${st.w}</dd></div><div><dt>Losses</dt><dd>${st.l}</dd></div>
          <div><dt>Streak</dt><dd>${st.streak}</dd></div><div><dt>Best</dt><dd>${st.best}</dd></div>
          <div><dt>New teams in</dt><dd class="countdown">--:--:--</dd></div>
        </dl>
      </section>
      <section>
        <div class="sec-h"><h2>Your team</h2><p>${done ? `You led with ${esc(team[run.lead].species)} today. Tap a Pokémon to lead your practice battle.` : run ? 'Locked in for today.' : 'Tap a Pokémon to make it your lead.'}</p></div>
        <div class="grid" id="team">${(run && !done ? reorder(team, run.lead) : team).map((s, i) => monCard(s, i, {lead: run && !done ? i === 0 : i === lead, static: !!run && !done})).join('')}</div>
      </section>
      <section>
        <div class="sec-h"><h2>${o.name}'s team</h2><p>Her ${o.origin} team in game order: ${foe[0].species} leads, ${foe[foe.length - 1].species} is the ace. ${LV}.</p><button class="btn tiny" id="btn-foe-lobby">Full sets &amp; stats</button></div>
        <div class="grid">${foe.map((s, i) => monCard(s, i, {static: true, lead: i === 0, ace: i === foe.length - 1})).join('')}</div>
      </section>
      <section class="rules">
        <h2>Rules</h2>
        <ul>
          <li>${o.gen === 4 ? 'Gen 4 battle rules from Pokémon Showdown\'s battle engine: the physical/special split, Gen 4 items, abilities and type chart.' : 'Gen 6 battle rules from Pokémon Showdown\'s battle engine: Fairy type, the updated Steel type, Mega Evolution, Gen 6 abilities and items.'}</li>
          ${o.gen === 6 ? '<li>If your Pokémon holds its Mega Stone, a Mega Evolution button appears in the Fight menu. One Mega per battle.</li>' : ''}
          <li>${o.name} plays to win: every turn she simulates her options against yours in the real engine and picks the strongest. She knows your sets, as you can see hers.</li>
          <li>Your team: today's Gen ${o.gen} Random Battle sets at Showdown's levels. No bag items.</li>
          <li>Progress saves after every turn. New teams arrive at midnight, your local time.</li>
        </ul>
      </section>`;
    $('#btn-back').onclick = () => { Music.blip(500); goHome(); };
    if (!run || done) $('#lobby').querySelectorAll('#team .mon').forEach((b) => b.onclick = () => { (done ? pleads : leads)[o.id] = +b.dataset.i; Music.blip(660); renderLobby(); });
    const st1 = $('#btn-start'); if (st1) st1.onclick = () => startDaily();
    const r1 = $('#btn-result'); if (r1) r1.onclick = () => showResult(run, 'daily');
    const p1 = $('#btn-practice'); if (p1) p1.onclick = () => startPractice(lead);
    $('#btn-foe-lobby').onclick = () => openFoeTeam(false);
    tick();
  }
  function tick() {
    const els = document.querySelectorAll('.countdown'); if (!els.length) return;
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((mid - now) / 1000));
    const z = (n) => String(n).padStart(2, '0');
    els.forEach((el) => { el.textContent = `${z(Math.floor(s / 3600))}:${z(Math.floor(s / 60) % 60)}:${z(s % 60)}`; });
    if (s === 0) setTimeout(() => location.reload(), 1500);
  }
  setInterval(tick, 1000);

  // ---------------- battle ----------------
  function startDaily() {
    Music.unlock();
    let run = S.runs[runKey()];
    if (!run) { run = S.runs[runKey()] = {lead: leads[OPP.id], log: [], diff, day: today, opp: OPP.id, rules: RULES}; save(); }
    const foe = foeFor(OPP);
    const b = C.newBattle(today, teamFor(OPP), run.lead, null, OPP, foe);
    C.replay(b, run.log);
    G = {b, mode: 'daily', run, foe, disp: {p1: {}, p2: {}}, logPos: 0, turn: 0, mega: false};
    enterBattle(run.log.length > 0);
  }
  // Lead picker shared by the between-fights screen and the practice-start sheet.
  const leadPickHTML = (team, cur) => `<p class="lead-h">Choose your lead</p>
      <div class="lead-pick" role="radiogroup" aria-label="Choose your lead">${team.map((s, i) => `<button role="radio" aria-checked="${i === cur}" data-lead="${i}">${glyph(s.species, 40)}<span>${esc(s.species)}</span></button>`).join('')}</div>`;
  function bindLeadPick(root, onPick) {
    root.querySelectorAll('[data-lead]').forEach((b) => b.onclick = () => {
      onPick(+b.dataset.lead); Music.blip(660);
      root.querySelectorAll('[data-lead]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    });
  }
  // Practice sheet: pick a lead for the team, then start.
  function chooseLead(team, cur, eyebrow, title, onGo) {
    const M = $('#modal');
    let lead = cur;
    M.innerHTML = `<div class="sheet result" role="dialog" aria-modal="true" aria-labelledby="lp-h">
      <p class="eyebrow">${eyebrow}</p><h2 id="lp-h">${title}</h2>
      ${leadPickHTML(team, cur)}
      <div class="cta-row"><button class="btn gold" id="lp-go">Start</button><button class="btn ghost" id="lp-cancel">Cancel</button></div></div>`;
    M.hidden = false;
    bindLeadPick(M, (i) => { lead = i; });
    $('#lp-go').onclick = () => { M.hidden = true; onGo(lead); };
    $('#lp-cancel').onclick = () => { M.hidden = true; };
  }
  function startPractice(lead) {
    const seed = 'practice-' + Date.now();
    const team = teamFor(OPP), done = S.runs[runKey()];
    const go = (lead) => {
      pleads[OPP.id] = lead;
      Music.unlock();
      const foe = foeFor(OPP);
      const b = C.newBattle(seed, team, lead, null, OPP, foe);
      G = {b, mode: 'practice', run: {log: [], lead, diff, opp: OPP.id}, foe, disp: {p1: {}, p2: {}}, logPos: 0, turn: 0, mega: false};
      enterBattle(false);
    };
    if (lead != null) go(lead);
    else chooseLead(team, pleads[OPP.id] ?? (done ? done.lead : leads[OPP.id]), 'Practice · ' + OPP.name, "Today's team", go);
  }

  async function enterBattle(resumed) {
    show('battle');
    $('.device').dataset.skin = skinFor(OPP);
    const bg = $('#scene .bg'); if (bg) bg.remove();
    $('#scene').insertAdjacentHTML('afterbegin', window.Scenes.background(OPP, OPP.member && TYPE_COLOR[OPP.member.type]));
    $('#btn-foe').textContent = `${OPP.name}'s team`;
    $('#bt-mode').textContent = G.kind === 'factory' ? `Battle Factory ${G.factory.tier} · Battle ${G.factory.n + 1} · ${protagFor(OPP)} vs ${OPP.name}`
      : `${G.mode === 'daily' ? 'Day ' + C.dayNumber(today) : 'Practice'} · ${G.kind === 'e4' ? `Elite Four ${G.e4.stage + 1}/4 · ` : ''}${protagFor(OPP)} vs ${OPP.name}`;
    for (const s of ['p1', 'p2']) { $(`#box-${s}`).hidden = true; $(`#mon-${s}`).innerHTML = ''; }
    G.snap = null; renderField();
    G.busy = true;
    const evs = C.toEvents(G.b.log, OPP);
    G.logPos = G.b.log.length;
    if (resumed) {
      for (const e of evs) if (e.update) applyUpdate(e.update, true);
      renderActives(true);
      say('Battle resumed. What will ' + (G.disp.p1.name || 'you') + ' do?');
      Music.play(currentMusicSlot());
    } else {
      Music.play('battle', true);
      $('#touch').innerHTML = '';
      const accent = OPP.member ? TYPE_COLOR[OPP.member.type] : {cynthia: '#c9a24e', zinnia: '#3fb8b0', factory: '#58b878'}[OPP.id];
      if (S.music.speed !== 'fastest') await window.Intro.play($('#scene'), {skin: skinFor(OPP), opp: oppArt(OPP, 160) || '<div class="in-sil"></div>', player: protagArt(OPP, 'front', 160),
        name: OPP.name, role: OPP.title.replace(OPP.name, '').trim(), playerName: protagFor(OPP), accent});
      const intro = [$('#mon-p1'), $('#mon-p2')];
      intro[0].innerHTML = protagArt(OPP, 'back', 130);
      intro[1].innerHTML = oppArt(OPP, 130);
      intro.forEach((el) => el.classList.add('intro-in'));
      await typeText(`${protagFor(OPP)} is challenged by ${OPP.title}!`);
      await wait(400);
      intro.forEach((el) => { el.classList.remove('intro-in'); el.classList.add('leave'); });
      await wait(350);
      intro.forEach((el) => { el.classList.remove('leave'); el.innerHTML = ''; });
      await runEvents(evs);
    }
    G.busy = false;
    nextPrompt();
  }

  function applyUpdate(u, instant) {
    const d = u.side && G.disp[u.side];
    switch (u.kind) {
      case 'switch': Object.assign(d, {name: u.name, species: u.species, level: u.level, hp: u.hp, max: u.max, status: u.status === 'fnt' ? '' : u.status, fainted: false}); renderActives(instant, u.side); if (G.snap) { G.snap[u.side] = null; renderChips(); } break;
      case 'forme': d.species = u.species; renderActives(true, u.side); if (!instant) flash(u.side); break;
      case 'hp': {
        const before = d.hp;
        d.hp = u.hp; if (u.status && u.status !== 'fnt') d.status = u.status;
        renderHP(u.side, instant);
        if (!instant && u.delta === '-damage' && before > u.hp) flash(u.side);
        break;
      }
      case 'status': d.status = u.status; renderHP(u.side, true); break;
      case 'faint': d.fainted = true; d.hp = 0; renderHP(u.side, true); faintAnim(u.side, instant); break;
      case 'attack': if (!instant) lunge(u.side); break;
      case 'turn': G.turn = u.turn; break;
    }
  }
  function renderActives(instant, only) {
    for (const side of ['p1', 'p2']) {
      if (only && side !== only) continue;
      const d = G.disp[side];
      const slot = $(`#mon-${side}`);
      if (!d.species) { slot.innerHTML = ''; continue; }
      slot.innerHTML = glyph(d.species, side === 'p1' ? 150 : 118, {back: side === 'p1', battle: true});
      slot.className = 'battler ' + side + (d.fainted ? ' fainted' : '') + (!instant ? ' enter' : '');
      const box = $(`#box-${side}`);
      box.hidden = false;
      box.querySelector('.bx-name').textContent = d.name;
      box.querySelector('.bx-lv').textContent = 'Lv' + d.level;
      box.querySelector('.bx-mega').hidden = !D.species.get(d.species).isMega;
      renderHP(side, true);
      renderPartyBalls();
    }
  }
  function renderHP(side, instant) {
    const d = G.disp[side];
    const box = $(`#box-${side}`);
    const pct = d.max ? Math.max(0, d.hp / d.max) : 0;
    const bar = box.querySelector('.hp-fill');
    bar.style.transition = instant ? 'none' : '';
    bar.style.width = (pct * 100).toFixed(1) + '%';
    bar.dataset.lvl = pct > 0.5 ? 'g' : pct > 0.2 ? 'y' : 'r';
    const st = box.querySelector('.bx-status');
    st.textContent = d.fainted ? '' : (d.status || '').toUpperCase();
    st.dataset.s = d.status || '';
    const num = box.querySelector('.bx-hpnum');
    if (num) tweenNum(num, d.hp, d.max, instant);
  }
  function tweenNum(el, to, max, instant) {
    const from = +(el.dataset.v || to);
    el.dataset.v = to;
    if (instant || from === to) { el.textContent = `${to}/${max}`; return; }
    const t0 = performance.now(), dur = 550 * spd().k;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = `${Math.round(from + (to - from) * k)}/${max}`; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  // Party bar Poké Ball, game style: red top, black band, white button. State is a class on the wrapper.
  const BALL = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" class="b-low"/><path d="M1,8 A7,7 0 0 1 15,8 Z" class="b-top"/>' +
    '<path d="M1,8 H15" class="b-band"/><circle cx="8" cy="8" r="2.4" class="b-btn"/><circle cx="8" cy="8" r="7" class="b-rim"/></svg>';
  function renderPartyBalls() {
    for (const side of ['p1', 'p2']) {
      const mons = G.b[side].pokemon.slice().sort((a, b) => a.position - b.position);
      const state = (p) => p.fainted ? 'out' : p.status ? 'st' : 'ok';
      const balls = mons.map((p) => `<i class="ball ${state(p)}" data-tip="${side}:${G.b[side].pokemon.indexOf(p)}" title="${esc(p.species.name)}${p.fainted ? ' (fainted)' : ''}">${BALL}</i>`);
      $(`#balls-${side}`).innerHTML = balls.join('');
    }
  }
  function flash(side) { const el = $(`#mon-${side}`); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  function lunge(side) { const el = $(`#mon-${side}`); el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge'); Music.blip(side === 'p1' ? 520 : 390); }
  function faintAnim(side, instant) { $(`#mon-${side}`).classList.add('fainted'); if (!instant) Music.blip(180); }

  // ---------- HUD effect chips (Showdown-style): stat stages, volatiles, side conditions ----------
  // Read from the engine only when a turn's events have finished playing, so they never run ahead of the text.
  const stageMult = (n) => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
  const VOLATILE = {confusion: 'Confused', substitute: 'Substitute', leechseed: 'Leech Seed', taunt: 'Taunt', encore: 'Encore', torment: 'Torment',
    yawn: 'Drowsy', perishsong: 'Perish', focusenergy: 'Focus Energy', aquaring: 'Aqua Ring', ingrain: 'Ingrain', curse: 'Cursed', nightmare: 'Nightmare',
    attract: 'Attracted', destinybond: 'Destiny Bond', magnetrise: 'Magnet Rise', healblock: 'Heal Block', embargo: 'Embargo', disable: 'Disabled',
    partiallytrapped: 'Trapped', trapped: 'Trapped', mustrecharge: 'Recharging', lockedmove: 'Locked in', choicelock: 'Choice locked', stockpile: 'Stockpile',
    charge: 'Charged', flashfire: 'Flash Fire', slowstart: 'Slow Start', smackdown: 'Grounded', saltcure: 'Salt Cure', protosynthesis: 'Protosynthesis', quarkdrive: 'Quark Drive'};
  const HAZARD = new Set(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']);
  const SIDE = {stealthrock: 'Stealth Rock', spikes: 'Spikes', toxicspikes: 'Toxic Spikes', stickyweb: 'Sticky Web', reflect: 'Reflect', lightscreen: 'Light Screen',
    auroraveil: 'Aurora Veil', tailwind: 'Tailwind', safeguard: 'Safeguard', mist: 'Mist', luckychant: 'Lucky Chant'};
  function snapshot() {
    G.snap = {};
    const sides = {};
    for (const side of ['p1', 'p2']) {
      const a = G.b[side].active[0];
      const sc = G.b[side].sideConditions;
      // Hazards are drawn on the field, so the HUD lists only timed side effects (screens, Tailwind...).
      const sideCh = Object.keys(sc).filter((k) => SIDE[k] && !HAZARD.has(k)).map((k) => SIDE[k] + (sc[k].layers > 1 ? ' ×' + sc[k].layers : '') + (sc[k].duration ? ' · ' + sc[k].duration : ''));
      sides[side] = Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, {layers: v.layers || 1, turns: v.duration || 0}]));
      G.snap[side] = a && !a.fainted ? {name: a.name, boosts: Object.assign({}, a.boosts), vol: Object.keys(a.volatiles).filter((k) => VOLATILE[k])
        .map((k) => VOLATILE[k] + (k === 'perishsong' ? ' ' + a.volatiles[k].duration : k === 'stockpile' ? ' ' + a.volatiles[k].layers : '')), sideCh} : {name: null, boosts: {}, vol: [], sideCh};
    }
    const f = G.b.field;
    G.snap.field = {weather: f.weather ? {id: f.weather, turns: f.weatherState.duration || 0} : null, terrain: f.terrain ? {id: f.terrain, turns: f.terrainState.duration || 0} : null,
      pseudo: Object.entries(f.pseudoWeather).map(([id, v]) => ({id, turns: v.duration || 0})), side: sides};
    renderChips(); renderField();
  }
  // Battlefield visuals: hazards on each platform, screens and Tailwind by each side, weather, terrain and room effects,
  // with labels for field effects and their turns left. Drawn on the scene's 256x192 grid, like the background.
  const FIELD_NAME = {raindance: 'Rain', primordialsea: 'Heavy Rain', sunnyday: 'Harsh Sunlight', desolateland: 'Extremely Harsh Sunlight', sandstorm: 'Sandstorm',
    hail: 'Hail', snow: 'Snow', snowscape: 'Snow', deltastream: 'Strong Winds', electricterrain: 'Electric Terrain', grassyterrain: 'Grassy Terrain',
    psychicterrain: 'Psychic Terrain', mistyterrain: 'Misty Terrain', trickroom: 'Trick Room', gravity: 'Gravity', magicroom: 'Magic Room', wonderroom: 'Wonder Room'};
  const TERRAIN_COLOR = {electricterrain: '#f8d030', grassyterrain: '#58c858', psychicterrain: '#f070c0', mistyterrain: '#f8b8e0'};
  const PLAT = {p2: {x: 184, y: 80, rx: 57, ry: 12.5}, p1: {x: 62, y: 126, rx: 72, ry: 14.5}};
  function renderField() {
    const el = $('#field'), tags = $('#field-tags'), F = G && G.snap && G.snap.field;
    if (!el) return;
    if (!F) { el.innerHTML = ''; el.className = ''; tags.innerHTML = ''; return; }
    let svg = '';
    if (F.terrain) svg += `<rect x="0" y="66" width="256" height="126" fill="${TERRAIN_COLOR[F.terrain.id] || '#fff'}" opacity=".22"/>`;
    for (const s of ['p1', 'p2']) {
      const P = PLAT[s], sc = F.side[s] || {};
      const around = (n, k, fn) => Array.from({length: n}, (_, i) => { const a = Math.PI * (0.15 + 0.7 * (i + k * 0.37) / n); return fn(P.x + Math.cos(Math.PI + a) * P.rx * .8, P.y + Math.sin(a) * P.ry * .7, i); }).join('');
      if (sc.stickyweb) svg += `<g stroke="#f4f4f4" stroke-width=".8" fill="none" opacity=".75">${[.35, .6, .85].map((k) => `<ellipse cx="${P.x}" cy="${P.y}" rx="${P.rx * k}" ry="${P.ry * k}"/>`).join('')}${Array.from({length: 8}, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${P.x}" y1="${P.y}" x2="${(P.x + Math.cos(a) * P.rx * .9).toFixed(1)}" y2="${(P.y + Math.sin(a) * P.ry * .9).toFixed(1)}"/>`; }).join('')}</g>`;
      for (let L = 0; L < (sc.spikes ? sc.spikes.layers : 0); L++) svg += around(3, L, (x, y) => `<path d="M${(x - 3).toFixed(1)},${(y + 2).toFixed(1)} l3,-6 l3,6 z" fill="#3a3a48" stroke="#c8c8d8" stroke-width=".6"/>`);
      for (let L = 0; L < (sc.toxicspikes ? sc.toxicspikes.layers : 0); L++) svg += around(3, L + 0.5, (x, y) => `<path d="M${(x - 3).toFixed(1)},${(y + 2).toFixed(1)} l3,-6 l3,6 z" fill="#9a46a8" stroke="#e0a8f0" stroke-width=".6"/>`);
      if (sc.stealthrock) svg += Array.from({length: 4}, (_, i) => { const x = P.x - P.rx * .8 + i * P.rx * .5, y = P.y - P.ry * 1.1 - (i % 2) * 5;
        return `<path d="M${x},${y} l4,-6 l5,2 l2,6 l-5,4 l-6,-1 z" fill="#a08868" stroke="#4a3a28" stroke-width=".8" class="fx-float" style="animation-delay:${-i * .4}s"/>`; }).join('');
      // screens stand in front of the side's Pokémon; the far side's is smaller
      const scr = [['reflect', '#f890b8'], ['lightscreen', '#f8e070'], ['auroraveil', '#88e0f8']].filter(([k]) => sc[k]);
      scr.forEach(([, c], i) => { const w = s === 'p2' ? 58 : 76, h = s === 'p2' ? 62 : 80, x = P.x - w / 2 + i * 5, y = P.y - h + 4 - i * 4;
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}" fill-opacity=".14" stroke="${c}" stroke-opacity=".75" stroke-width="1.2"/>`; });
      if (sc.tailwind) svg += [0, 1, 2].map((i) => { const y = P.y - 30 - i * 12; return `<path d="M${P.x - P.rx},${y} q${P.rx * .6},-8 ${P.rx * 1.4},0 t${P.rx * .5},-3" stroke="#e8f8ff" stroke-width="1.4" fill="none" opacity=".7" class="fx-wind" style="animation-delay:${-i * .3}s"/>`; }).join('');
    }
    el.innerHTML = `<svg viewBox="0 0 256 192" preserveAspectRatio="none">${svg}</svg>`;
    const w = F.weather && F.weather.id;
    el.className = [w ? 'w-' + ({primordialsea: 'raindance', desolateland: 'sunnyday', snowscape: 'snow'}[w] || w) : '', F.pseudo.some((p) => p.id === 'trickroom') ? 'trickroom' : ''].join(' ').trim();
    const tag = (x) => `<span class="ft ft-${x.id}">${FIELD_NAME[x.id] || x.id}${x.turns ? ` <b>${x.turns}</b>` : ''}</span>`;
    tags.innerHTML = [F.weather, F.terrain, ...F.pseudo].filter((x) => x && FIELD_NAME[x.id]).map(tag).join('');
  }
  function renderChips() {
    for (const side of ['p1', 'p2']) {
      const el = $(`#box-${side} .bx-chips`), s = G.snap && G.snap[side];
      if (!el) continue;
      if (!s) { el.innerHTML = ''; continue; }
      const boosts = Object.entries(s.boosts).filter(([, n]) => n).map(([k, n]) => `<i class="chip ${n > 0 ? 'up' : 'down'}">${BOOST_NAME[k]} ${n > 0 ? '+' : ''}${n}</i>`);
      el.innerHTML = boosts.concat(s.vol.map((v) => `<i class="chip vol">${v}</i>`), s.sideCh.map((v) => `<i class="chip side">${v}</i>`)).join('');
    }
  }

  // ---------- hover info (Showdown-style tooltip); long-press on touch ----------
  const BOOST_NAME = {atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva'};
  function tipMon(ref) {
    const [side, k] = ref.split(':');
    const mons = G.b[side].pokemon;
    // The active slot follows the screen, which can lag the engine during animations.
    if (k === 'a') return mons.find((p) => p.name === G.disp[side].name) || G.b[side].active[0];
    return mons[+k];
  }
  function tipHTML(ref) {
    const side = ref.split(':')[0], p = tipMon(ref);
    if (!p) return '';
    const shown = ref.endsWith(':a') && G.disp[side].name === p.name;
    const hp = shown ? G.disp[side].hp : p.hp, max = p.maxhp;
    const pct = p.fainted ? 0 : Math.max(hp > 0 ? 1 : 0, Math.round(100 * hp / max));
    const st = p.storedStats, snap = G.snap && G.snap[side];
    const boosts = shown && snap && snap.name === p.name ? snap.boosts : {};
    const cls = (n) => n > 0 ? 'up-t' : 'down-t';
    const bst = (k) => boosts[k] ? `<em class="${cls(boosts[k])}">${boosts[k] > 0 ? '+' : ''}${boosts[k]}</em>` : '';
    const stat = (k) => `<span>${BOOST_NAME[k]} <b${boosts[k] ? ` class="${cls(boosts[k])}"` : ''}>${Math.floor(st[k] * stageMult(boosts[k] || 0))}</b>${bst(k)}</span>`;
    const extra = ['accuracy', 'evasion'].filter((k) => boosts[k]).map((k) => `<span>${BOOST_NAME[k]} ${bst(k)}</span>`).join('');
    return `<div class="tip-h"><b>${esc(p.species.name)}</b> <span class="mon-lv">Lv${p.level}</span> ${p.getTypes().map(typeChip).join('')}</div>
      <div class="tip-hp"><span class="hp-track"><i class="hp-fill" style="width:${pct}%" data-lvl="${pct > 50 ? 'g' : pct > 20 ? 'y' : 'r'}"></i></span>
        <b>${p.fainted ? 'Fainted' : pct + '%'}</b>${side === 'p1' && !p.fainted ? ` <small>${hp}/${max}</small>` : ''}${p.status && !p.fainted ? ` <span class="tip-st">${p.status.toUpperCase()}</span>` : ''}</div>
      <div class="tip-meta">Item: <b>${esc(itemName(p.item))}</b> · Ability: <b>${esc(abilName(p.ability))}</b></div>
      <div class="tip-stats">${['atk', 'def', 'spa', 'spd', 'spe'].map(stat).join('')}${extra}</div>
      <ul class="tip-moves">${p.moveSlots.map((m) => `<li style="--tc:${TYPE_COLOR[D.moves.get(m.id).type]}">${esc(m.move)}<small>${m.pp}/${m.maxpp}</small></li>`).join('')}</ul>`;
  }
  let tipLive = null;
  function showTip(el) {
    if (!G || !G.b || document.body.dataset.view !== 'battle') return;
    const html = tipHTML(el.dataset.tip);
    const tip = $('#tip');
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html; tip.hidden = false;
    // Keep it live while open: HP drains, boosts and PP change as the turn plays out.
    clearInterval(tipLive);
    // Close when the target is gone or no longer hovered: re-renders and screen changes don't fire pointerout.
    tipLive = setInterval(() => {
      if (tip.hidden || !G || !G.b || !el.isConnected || document.body.dataset.view !== 'battle' || !$('#modal').hidden || (!pressed && !el.matches(':hover'))) return hideTip();
      const h = tipHTML(el.dataset.tip); if (h && h !== tip.innerHTML) tip.innerHTML = h;
    }, 150);
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, pad = 8;
    const x = Math.min(Math.max(pad, r.left + r.width / 2 - w / 2), innerWidth - w - pad);
    // Never cover the menu screen: open above the target, and if that doesn't fit, sit just above the menu instead.
    const menuTop = $('#touch').getBoundingClientRect().top;
    const limit = el.closest('#touch') ? menuTop : Math.min(menuTop, r.top);
    let y = limit - h - pad;
    if (y < pad && !el.closest('#touch')) y = Math.min(r.bottom + pad, menuTop - h - pad);
    tip.style.left = x + 'px'; tip.style.top = Math.max(pad, y) + 'px';
  }
  const hideTip = () => { $('#tip').hidden = true; clearInterval(tipLive); };
  let press = null, pressed = false;
  document.addEventListener('pointerover', (e) => { const el = e.pointerType === 'mouse' && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('pointerout', (e) => {
    const el = e.pointerType === 'mouse' && e.target.closest('[data-tip]');
    const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]');
    if (el && to !== el) hideTip();
  });
  document.addEventListener('pointerdown', (e) => {
    const el = e.pointerType !== 'mouse' && e.target.closest('[data-tip]');
    if (!el) return;
    pressed = false;
    press = setTimeout(() => { pressed = true; showTip(el); }, 450);
  });
  const endPress = () => { clearTimeout(press); if (pressed) setTimeout(hideTip, 1800); };
  document.addEventListener('pointerup', endPress);
  document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') hideTip(); }, true);
  document.addEventListener('pointercancel', endPress);
  // A long-press shows info; it should not also count as a tap.
  document.addEventListener('click', (e) => { if (pressed && e.target.closest('[data-tip]')) { e.stopPropagation(); e.preventDefault(); pressed = false; } }, true);
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-tip]') && e.pointerType !== 'mouse') e.preventDefault(); });

  // text box
  let skip = null;
  // Battle speed: text per character, hold after each line, and a multiplier for every other pause and animation.
  const SPEEDS = {normal: {label: 'Normal', btn: '1×', char: 16, hold: 620, k: 1}, fast: {label: 'Fast', btn: '2×', char: 6, hold: 260, k: 0.5}, fastest: {label: 'Fastest', btn: '4×', char: 0, hold: 110, k: 0.22}};
  const spd = () => SPEEDS[S.music.speed] || SPEEDS.normal;
  function applySpeed() {
    document.documentElement.style.setProperty('--spd', spd().k);
    const b = $('#btn-speed'); b.textContent = '⏩ ' + spd().btn; b.title = 'Battle speed: ' + spd().label;
  }
  const wait = (ms) => new Promise((r) => { const t = setTimeout(r, ms * spd().k); skip = () => { clearTimeout(t); r(); }; });
  function say(t) { $('#textbox-t').textContent = t; }
  async function typeText(t) {
    const el = $('#textbox-t');
    const sp = spd();
    let fin = !sp.char;
    skip = () => { fin = true; el.textContent = t; };
    el.textContent = '';
    for (let i = 0; i < t.length && !fin; i++) { el.textContent = t.slice(0, i + 1); await new Promise((r) => setTimeout(r, sp.char)); }
    el.textContent = t;
    await wait(sp.hold / sp.k);
  }
  async function runEvents(evs) {
    for (const e of evs) {
      if (e.update) applyUpdate(e.update, false);
      if (e.text) await typeText(e.text);
      else if (e.update && e.update.kind === 'hp') await wait(350);
    }
  }

  // ---------------- bottom screen ----------------
  function nextPrompt() {
    const b = G.b;
    snapshot();
    if (b.ended) return finish();
    const r = b.p1.activeRequest;
    precompute();
    if (r.forceSwitch) { say('Choose a Pokémon to send out.'); return renderParty(true); }
    say(`What will ${G.disp.p1.name} do?`);
    renderMain();
  }
  function renderMain() {
    $('#touch').innerHTML = `<div class="t-main">
      <button class="t-fight" id="t-fight"><span>Fight</span></button>
      <div class="t-row">
        <button class="t-small t-bag" disabled title="No items in this challenge"><span>Bag</span><small>None</small></button>
        <button class="t-small t-run" id="t-run"><span>Run</span><small>Forfeit</small></button>
        <button class="t-small t-mon" id="t-mon"><span>Pokémon</span><small>${G.b.p1.pokemon.filter((p) => !p.fainted).length}/${G.b.p1.pokemon.length}</small></button>
      </div></div>`;
    $('#t-fight').onclick = () => { Music.blip(); renderFight(); };
    $('#t-mon').onclick = () => { Music.blip(); renderParty(false); };
    $('#t-run').onclick = () => { Music.blip(); renderRun(); };
  }
  function renderFight() {
    const r = G.b.p1.activeRequest.active[0];
    const canMega = !!r.canMegaEvo;
    if (!canMega) G.mega = false;
    $('#touch').innerHTML = `<div class="moves">${r.moves.map((m, i) => {
      const mv = D.moves.get(m.id);
      const out = m.disabled || (m.pp !== undefined && m.pp <= 0);
      return `<button class="mv" style="--tc:${TYPE_COLOR[mv.type]}" data-i="${i + 1}" ${out ? 'disabled' : ''}>
        <span class="mv-n">${esc(m.move)}</span>
        <span class="mv-pp">PP ${m.pp ?? '-'}/${m.maxpp ?? '-'}</span>
        <span class="mv-t"><i>${mv.type}</i><em>${mv.category === 'Status' ? 'Status' : mv.category}${mv.basePower ? ' ' + mv.basePower : ''}</em></span></button>`;
    }).join('')}</div>
    <div class="t-pair">${canMega ? `<button class="t-mega${G.mega ? ' on' : ''}" id="t-mega" aria-pressed="${G.mega}">Mega Evolution</button>` : ''}<button class="t-back" id="t-back">Back</button></div>`;
    $('#touch').querySelectorAll('.mv').forEach((b) => b.onclick = () => choose('move ' + b.dataset.i + (G.mega ? ' mega' : '')));
    $('#t-back').onclick = () => { Music.blip(500); renderMain(); };
    if (canMega) $('#t-mega').onclick = () => { G.mega = !G.mega; Music.blip(G.mega ? 1200 : 600); renderFight(); };
  }
  function renderParty(forced) {
    const r = G.b.p1.activeRequest;
    const trapped = !forced && r.active && r.active[0].trapped;
    $('#touch').innerHTML = `<div class="party">${G.b.p1.pokemon.map((p, i) => {
      const pct = p.hp / p.maxhp;
      return `<button class="pm${i === 0 && !forced ? ' cur' : ''}${p.fainted ? ' out' : ''}" data-i="${i}" data-tip="p1:${i}">
        <span class="pm-g">${glyph(p.species.name, 40)}</span>
        <span class="pm-n">${esc(p.species.name)}<small>${p.status ? p.status.toUpperCase() : ''}</small></span>
        <span class="pm-hp"><i style="width:${(pct * 100).toFixed(0)}%" data-lvl="${pct > 0.5 ? 'g' : pct > 0.2 ? 'y' : 'r'}"></i></span>
        <span class="pm-num">${p.hp}/${p.maxhp}</span></button>`;
    }).join('')}</div>${forced ? '' : '<button class="t-back" id="t-back">Back</button>'}`;
    $('#touch').querySelectorAll('.pm').forEach((b) => b.onclick = () => { Music.blip(); renderSummary(+b.dataset.i, forced, trapped); });
    if (!forced) $('#t-back').onclick = () => { Music.blip(500); renderMain(); };
  }
  function renderSummary(i, forced, trapped) {
    const p = G.b.p1.pokemon[i];
    const canShift = !p.fainted && i > 0 && !trapped;
    const st = p.storedStats;
    $('#touch').innerHTML = `<div class="summ">
      <div class="summ-h">${glyph(p.species.name, 56)}<div><b>${esc(p.species.name)}</b> <span class="mon-lv">Lv${p.level}</span><div class="mon-types">${p.getTypes().map(typeChip).join('')}</div>
      <div class="mon-meta">${esc(itemName(p.item))} · ${esc(abilName(p.ability))}</div></div></div>
      <div class="summ-stats"><span>HP <b>${p.hp}/${p.maxhp}</b></span><span>Atk <b>${st.atk}</b></span><span>Def <b>${st.def}</b></span><span>SpA <b>${st.spa}</b></span><span>SpD <b>${st.spd}</b></span><span>Spe <b>${st.spe}</b></span></div>
      <ul class="mon-moves">${p.moveSlots.map((m) => `<li style="--tc:${TYPE_COLOR[D.moves.get(m.id).type]}">${esc(m.move)} <small>${m.pp}/${m.maxpp}</small></li>`).join('')}</ul>
      ${trapped ? '<p class="note">You can\'t switch out right now.</p>' : ''}
    </div>
    <div class="t-pair">${canShift ? '<button class="t-go" id="t-shift">Shift</button>' : ''}<button class="t-back" id="t-back">Back</button></div>`;
    if (canShift) $('#t-shift').onclick = () => choose('switch ' + (i + 1));
    $('#t-back').onclick = () => { Music.blip(500); renderParty(forced); };
  }
  function renderRun() {
    $('#touch').innerHTML = `<div class="confirm"><p>${G.mode === 'daily' ? 'Forfeiting counts as a loss for today.' : 'End this practice battle?'}</p>
      <div class="t-pair"><button class="t-go warn" id="t-yes">Forfeit</button><button class="t-back" id="t-back">Back</button></div></div>`;
    $('#t-yes').onclick = () => { G.b.lose('p1'); G.run.log.push(['lose', '']); persist(); finish(); };
    $('#t-back').onclick = () => renderMain();
  }
  function persist() { if (G.mode === 'daily' || G.mode === 'factory') save(); }

  // ---------- opponent brain (worker keeps the page smooth) ----------
  const Brain = (() => {
    let w = null, ready = false, seq = 0;
    const waiting = new Map();
    try {
      w = new Worker('src/ai-worker.js');
      w.onmessage = (e) => {
        if (e.data.ready) { ready = true; return; }
        const f = waiting.get(e.data.id); if (f) { waiting.delete(e.data.id); f(e.data.choice); }
      };
      w.onerror = () => { w = null; for (const f of waiting.values()) f(null); waiting.clear(); };
    } catch (e) { w = null; }
    function local(json) { return new Promise((res) => setTimeout(() => { try { res(window.AI.decide(json).choice); } catch (e) { res(null); } }, 30)); }
    function decide(b) {
      const json = JSON.stringify(b.toJSON());
      if (!w) return local(json);
      return new Promise((res) => {
        const id = ++seq;
        const t = setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); local(json).then(res); } }, ready ? 20000 : 45000);
        waiting.set(id, (c) => { clearTimeout(t); res(c); });
        w.postMessage({id, json});
      });
    }
    return {decide};
  })();
  async function aiPick(b) {
    if (G.pending && G.pending.pos === b.log.length && G.pending.turn === b.turn) { const p = G.pending.p; G.pending = null; return (await p) || C.aiChoice(b); }
    return (await Brain.decide(b)) || C.aiChoice(b);
  }
  function precompute() { const b = G.b; if (!b.ended && C.needs(b.p2)) G.pending = {pos: b.log.length, turn: b.turn, p: Brain.decide(b)}; }

  async function choose(c) {
    if (G.busy) return;
    G.busy = true;
    Music.blip(990);
    $('#touch').innerHTML = '<div class="waiting"><span></span><span></span><span></span></div>';
    const b = G.b, made = [];
    try {
      if (C.needs(b.p2) && !b.ended) { const a = await aiPick(b); b.choose('p2', a); made.push(['p2', a]); }
      b.choose('p1', c); made.push(['p1', c]);
      let guard = 0;
      while (!b.ended && C.needs(b.p2) && !C.needs(b.p1) && guard++ < 10) { const a = await aiPick(b); b.choose('p2', a); made.push(['p2', a]); }
    } catch (e) { console.error(e); }
    if (c.endsWith(' mega')) G.mega = false;
    G.run.log.push(...made);
    persist();
    const lines = G.b.log.slice(G.logPos);
    G.logPos = G.b.log.length;
    await runEvents(C.toEvents(lines, OPP));
    G.busy = false;
    if (!G.b.ended) Music.play(currentMusicSlot());
    nextPrompt();
  }

  function finish() {
    if (G.kind === 'e4') return e4Finish();
    if (G.kind === 'factory') return factoryFinish();
    const b = G.b;
    const won = b.winner === 'You';
    const hpList = (side) => b[side].pokemon.slice().sort((x, y) => x.position - y.position).map((p) => [p.species.name, p.fainted ? 0 : Math.max(1, Math.round(100 * p.hp / p.maxhp))]);
    const result = {result: won ? 'win' : 'loss', turns: b.turn, left: b.p1.pokemon.filter((p) => !p.fainted).length,
      foeLeft: b.p2.pokemon.filter((p) => !p.fainted).length, mine: hpList('p1'), foe: hpList('p2'), opp: OPP.id, diff, day: today};
    Music.play(won ? 'victory' : 'defeat', true);
    if (G.mode === 'daily' && !G.run.result) {
      Object.assign(G.run, result);
      const st = stat(OPP.id, diff);
      if (won) { st.w++; st.streak++; st.best = Math.max(st.best, st.streak); } else { st.l++; st.streak = 0; }
      st.lastDay = today;
      save();
    }
    say(won ? `You defeated ${OPP.title}!` : 'You are out of usable Pokémon!');
    $('#touch').innerHTML = `<button class="t-fight" id="t-res"><span>${won ? 'Victory' : 'Defeat'}</span><small>See result</small></button>`;
    $('#t-res').onclick = () => showResult(G.mode === 'daily' ? G.run : result, G.mode);
    setTimeout(() => { if (document.body.dataset.view === 'battle' && G) showResult(G.mode === 'daily' ? G.run : result, G.mode); }, 1800 * spd().k);
  }

  // ---------------- result ----------------
  function shareText(run) {
    const o = C.OPP[run.opp] || OPP;
    const sq = (hp) => hp === 0 ? '⬛' : hp > 50 ? '🟩' : hp > 20 ? '🟨' : '🟥';
    return `Champion Daily #${C.dayNumber(run.day || today)} · ${o.name}\n` +
      `${run.result === 'win' ? 'Won' : 'Lost'} in ${run.turns} turn${run.turns === 1 ? "" : "s"}\n` +
      `Me  ${run.mine.map((m) => sq(m[1])).join('')}\n${o.name.slice(0, 3)} ${run.foe.map((m) => sq(m[1])).join('')}`;
  }
  function showResult(run, mode) {
    if (!run || !run.mine) return;
    const o = C.OPP[run.opp] || OPP;
    const M = $('#modal');
    const won = run.result === 'win';
    const txt = mode === 'daily' ? shareText(run) : null;
    M.innerHTML = `<div class="sheet result" role="dialog" aria-modal="true" aria-labelledby="res-h">
      <p class="eyebrow">${mode === 'daily' ? 'Day ' + C.dayNumber(run.day || today) : 'Practice'} · ${o.name}</p>
      <h2 id="res-h">${won ? `${o.name} defeated` : `${o.name} wins`}</h2>
      <p>${won ? `${run.left} of your Pokémon still standing after ${run.turns} turn${run.turns === 1 ? "" : "s"}.` : `${o.name} had ${run.foeLeft} left after ${run.turns} turn${run.turns === 1 ? "" : "s"}.`} You led with <b>${esc(teamFor(o)[run.lead].species)}</b>.</p>
      <div class="res-teams">
        <div><h3>You</h3>${run.mine.map(([n, hp]) => `<div class="res-row${hp ? '' : ' out'}">${glyph(n, 28)}<span>${esc(n)}</span><i><b style="width:${hp}%"></b></i></div>`).join('')}</div>
        <div><h3>${o.name}</h3>${run.foe.map(([n, hp]) => `<div class="res-row${hp ? '' : ' out'}">${glyph(n, 28)}<span>${esc(n)}</span><i><b style="width:${hp}%"></b></i></div>`).join('')}</div>
      </div>
      ${txt ? `<pre class="share" id="share-t">${esc(txt)}</pre>` : ''}
      <div class="cta-row">
        ${txt ? '<button class="btn gold" id="btn-copy">Copy result</button>' : ''}
        <button class="btn" id="btn-again">${mode === 'daily' ? 'Practice battle' : 'Practice again'}</button>
        <button class="btn ghost" id="btn-lobby">Back to ${o.name}</button>
      </div></div>`;
    M.hidden = false;
    const cp = $('#btn-copy');
    if (cp) cp.onclick = () => {
      navigator.clipboard.writeText(txt).then(() => { cp.textContent = 'Copied'; }).catch(() => {
        const r = document.createRange(); r.selectNodeContents($('#share-t')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent = 'Selected, copy it';
      });
    };
    $('#btn-again').onclick = () => { M.hidden = true; setOpp(o); startPractice(); };
    $('#btn-lobby').onclick = () => { M.hidden = true; G = null; openLobby(o); };
  }

  // ---------------- opponent team viewer ----------------
  const STAT_LABEL = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe'};
  function openFoeTeam(inBattle, onClose) {
    const live = inBattle && G && G.b;
    const sets = live ? G.foe : foeFor(OPP);
    const src = live ? G.b : C.newBattle(today, teamFor(OPP), 0, null, OPP, sets);
    const mons = sets.map((set) => src.p2.pokemon.find((p) => p.baseSpecies.baseSpecies === D.species.get(set.species).baseSpecies));
    const active = live && G.b.p2.active[0];
    const left = mons.filter((p) => !p.fainted).length;
    const M = $('#modal');
    M.innerHTML = `<div class="sheet foe" role="dialog" aria-modal="true" aria-labelledby="foe-h">
      <div class="foe-head"><div><p class="eyebrow">${OPP.mechanics} · ${LV}${live ? ` · ${left} of ${mons.length} left` : ''}</p><h2 id="foe-h">${OPP.name}'s team</h2></div>
      <button class="btn tiny ghost" id="foe-close">${onClose ? '← Back' : 'Close'}</button></div>
      <div class="foe-tabs" role="tablist">${mons.map((p, i) => `<button role="tab" id="foe-tab-${i}" aria-selected="${i === 0}" data-i="${i}" class="${p.fainted ? 'out' : ''}">
        ${glyph(p.species.name, 34)}<span>${esc(p.species.name.replace('-Mega', ''))}</span>${p === active ? '<i class="dot" title="In battle"></i>' : ''}</button>`).join('')}</div>
      <div id="foe-body"></div>
    </div>`;
    M.hidden = false;
    const showMon = (i) => {
      const p = mons[i], set = sets[i];
      const nat = D.natures.get(set.nature);
      const hpPct = p.fainted ? 0 : p.hp / p.maxhp;
      const max = Math.max(...Object.values(p.storedStats), p.maxhp);
      $('#foe-body').innerHTML = `
        <div class="foe-card">
          <div class="foe-top">${glyph(p.species.name, 72)}<div>
            <div class="mon-top"><span class="mon-name">${esc(p.species.name)}</span><span class="mon-lv">Lv${p.level}</span>${i === 0 ? '<span class="lead-tag">LEAD</span>' : ''}${i === sets.length - 1 ? '<span class="lead-tag ace">ACE</span>' : ''}</div>
            <div class="mon-types">${p.getTypes().map(typeChip).join('')}</div>
            <div class="mon-meta">${esc(set.item)} · ${esc(p.species.isMega ? abilName(p.ability) : set.ability)} · ${set.nature}</div>
            ${live ? `<div class="foe-hp"><i><b style="width:${(hpPct * 100).toFixed(0)}%" data-lvl="${hpPct > 0.5 ? 'g' : hpPct > 0.2 ? 'y' : 'r'}"></b></i><span>${p.fainted ? 'Fainted' : Math.round(hpPct * 100) + '%'}${p.status && !p.fainted ? ' · ' + p.status.toUpperCase() : ''}</span></div>` : ''}
          </div></div>
          <h3>Stats</h3>
          <div class="foe-stats">${['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map((k) => {
            const v = k === 'hp' ? p.maxhp : p.storedStats[k];
            const mark = nat.plus === k ? 'up' : nat.minus === k ? 'down' : '';
            return `<div class="fs ${mark}"><span>${STAT_LABEL[k]}</span><i><b style="width:${(100 * v / max).toFixed(0)}%"></b></i><em>${v}</em><small>${set.evs[k] ? set.evs[k] + ' EV' : ''}</small></div>`;
          }).join('')}</div>
          <h3>Moves</h3>
          <ul class="foe-moves">${set.moves.map((m) => { const mv = D.moves.get(m); return `<li style="--tc:${TYPE_COLOR[mv.type]}">
            <div class="fm-top"><b>${esc(mv.name)}</b>${typeChip(mv.type)}</div>
            <div class="fm-data">${mv.category}${mv.basePower ? ' · ' + mv.basePower + ' BP' : ''}${mv.accuracy === true ? '' : ' · ' + mv.accuracy + '%'}${mv.priority ? ' · +' + mv.priority + ' priority' : ''} · ${mv.pp * 8 / 5} PP</div>
            <p>${esc(mv.shortDesc || mv.desc || '')}</p></li>`; }).join('')}</ul>
          <p class="note">IVs 31. Nature: ${nat.plus ? `<span class="up-t">+${STAT_LABEL[nat.plus]}</span> <span class="down-t">−${STAT_LABEL[nat.minus]}</span>` : 'neutral'}${p.species.isMega ? '. Stats shown after Mega Evolution.' : ''}</p>
        </div>`;
      M.querySelectorAll('.foe-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.i == i));
    };
    M.querySelectorAll('.foe-tabs button').forEach((b) => b.onclick = () => { Music.blip(); showMon(+b.dataset.i); });
    $('#foe-close').onclick = () => { if (onClose) onClose(); else M.hidden = true; };
    showMon(active ? Math.max(0, mons.indexOf(active)) : 0);
  }
  $('#btn-foe').onclick = () => openFoeTeam(true);
  $('#box-p2').onclick = () => openFoeTeam(true);
  $('#balls-p2').onclick = () => openFoeTeam(true);

  // ---------------- Elite Four ----------------
  const E4_OPP = {id: 'e4', name: 'Elite Four', gen: 9};
  function e4Run() { return S.runs[E4KEY]; }
  function e4Card() {
    const r = e4Run();
    const st = !r ? 'open' : r.status === 'won' ? 'win' : r.status === 'lost' ? 'loss' : 'live';
    const label = !r ? 'Open' : r.status === 'won' ? 'Cleared' : r.status === 'lost' ? `Lost to ${LINEUP[r.lostAt].name}` : `Battle ${r.stage + 1} of 4`;
    setOpp(E4.asOpp(LINEUP[0]));
    return `<article class="opp-card" data-o="e4">
      <div class="opp-top"><span class="gen-badge">Gen IX</span><span class="opp-place">Today's lineup</span></div>
      <h2>Elite Four</h2>
      <ol class="e4-mini">${LINEUP.map((m) => `<li>${glyph(m.ace, 30)}<span>${m.role === 'Champion' ? 'Champion ' : ''}${m.label}</span>${typeChip(m.type)}</li>`).join('')}</ol>
      <p class="opp-desc">Four type specialists from every generation, back to back. One team, healed between fights. Gen 9 battle rules with no Tera, Mega or Z-Moves.</p>
      <div class="chips"><span class="chip ${st}">Today <b>${label}</b></span></div>
      <button class="btn gold" data-go="e4">Take on the Elite Four</button>
    </article>`;
  }
  function openE4() { setOpp(E4.asOpp(LINEUP[0])); OPP = Object.assign({}, OPP, {member: null, id: 'e4'}); setOpp(OPP); show('lobby'); renderE4(); Music.play('menu'); }
  function renderE4() {
    const r = e4Run();
    const st = stat('e4', 'run');
    const team = teamFor(E4_OPP);
    const lead = r ? r.lead : leads.e4;
    // The lead can change before each fight; a fight's lead is fixed once it starts.
    const pickable = !r || (r.status === 'live' && !(r.fights[r.stage] && r.fights[r.stage].log.length));
    const over = !!r && r.status !== 'live';
    const shownLead = over ? (pleads.e4 ?? r.lead) : lead;
    const stageOf = (i) => {
      if (!r) return i === 0 ? 'next' : 'ahead';
      if (r.status === 'lost' && r.lostAt === i) return 'lost';
      if (i < r.stage || r.status === 'won') return 'beat';
      if (r.status === 'live' && i === r.stage) return 'next';
      return 'ahead';
    };
    const stLabel = {beat: 'Defeated', lost: 'Beat you', next: 'Up next', ahead: ''};
    const cta = !r ? '<button class="btn gold" id="e4-start">Start the Elite Four</button>'
      : r.status === 'live' ? `<button class="btn gold" id="e4-start">Resume: battle ${r.stage + 1} vs ${LINEUP[r.stage].name}</button>`
      : `<button class="btn gold" id="e4-result">See result</button><button class="btn" id="e4-practice">${r.status === 'lost' ? 'Continue in practice' : 'Practice run'}</button>`;
    $('#lobby').innerHTML = `
      <button class="back" id="btn-back">← All opponents</button>
      <section class="hero">
        <p class="eyebrow">Day ${C.dayNumber(today)} · Gen 9 battle rules · ${LV}</p>
        <h1 class="opp-h">Elite <em>Four</em></h1>
        <p class="lede">Four type specialists drawn from every region, the same for everyone today. Beat all four with one team. Lose once and today's run is over, but you can keep going in practice.</p>
        <div class="cta-row">${cta}${styleNote(E4.asOpp(LINEUP[0]))}</div>
        <dl class="stats">
          <div><dt>Cleared</dt><dd>${st.w}</dd></div><div><dt>Fell</dt><dd>${st.l}</dd></div>
          <div><dt>Streak</dt><dd>${st.streak}</dd></div><div><dt>Best</dt><dd>${st.best}</dd></div>
          <div><dt>New lineup in</dt><dd class="countdown">--:--:--</dd></div>
        </dl>
      </section>
      <section>
        <div class="sec-h"><h2>Today's lineup</h2><p>One trainer per type, in battle order.</p></div>
        <ol class="e4-list">${LINEUP.map((m, i) => `<li class="e4-row ${stageOf(i)}">
          <span class="e4-n">${i + 1}</span>
          <span class="e4-g">${S.art === 'drawn' ? glyph(m.ace, 52) : oppArt(E4.asOpp(m), 52)}</span>
          <span class="e4-b"><b>${m.titleGen}</b><span class="e4-meta">${typeChip(m.type)} Ace ${esc(m.ace.replace('-Midnight', ' (Midnight)').replace('-Alola', ' (Alolan)'))} · ${m.from}</span></span>
          <span class="e4-s">${stLabel[stageOf(i)]}</span>
          <button class="btn tiny" data-view="${i}">Team</button></li>`).join('')}</ol>
      </section>
      <section>
        <div class="sec-h"><h2>Your team</h2><p>${!r ? 'One Gen 9 Random Battle team for all four fights. Tap a Pokémon to lead; you can change your lead before each fight.' : over ? 'Tap a Pokémon to lead your practice run.' : pickable ? `Fully healed before every fight. Tap a Pokémon to lead against ${LINEUP[r.stage].name}.` : 'Locked in for today. Fully healed before every fight.'}</p></div>
        <div class="grid" id="team">${team.map((s, i) => monCard(s, i, {lead: i === shownLead, static: !pickable && !over})).join('')}</div>
      </section>
      <section class="rules">
        <h2>Rules</h2>
        <ul>
          <li>Gen 9 battle rules from Pokémon Showdown's battle engine. No Terastallization, Mega Evolution or Z-Moves.</li>
          <li>Each trainer keeps their type and signature ace. The rest of their six is a fresh Gen 9 Random Battle draw of that type each day, with legendaries and Paradox Pokémon excluded. Lance is the exception: he brings his signature lineup (Gyarados, Aerodactyl, Charizard, Salamence, Garchomp).</li>
          <li>Four separate battles. Your team is fully healed between them, and you choose your lead before each one. A loss ends today's run and records who stopped you.</li>
          <li>Every trainer plays to win with the same search AI as Cynthia and Zinnia.</li>
        </ul>
      </section>`;
    $('#btn-back').onclick = () => { Music.blip(500); goHome(); };
    if (pickable || over) $('#lobby').querySelectorAll('#team .mon').forEach((b) => b.onclick = () => {
      const i = +b.dataset.i;
      if (over) pleads.e4 = i; else if (r) { r.lead = i; save(); } else leads.e4 = i;
      Music.blip(660); renderE4();
    });
    $('#lobby').querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { setOpp(E4.asOpp(LINEUP[+b.dataset.view])); openFoeTeam(false); });
    const s1 = $('#e4-start'); if (s1) s1.onclick = () => {
      let run = e4Run();
      if (!run) { run = S.runs[E4KEY] = {lead: leads.e4, stage: 0, status: 'live', fights: [], day: today, lineup: LINEUP.map((m) => m.id), rules: RULES}; save(); }
      startE4Fight(run, 'daily');
    };
    const r1 = $('#e4-result'); if (r1) r1.onclick = () => e4Summary(r, 'daily');
    const p1 = $('#e4-practice'); if (p1) p1.onclick = () => startE4Practice(r, shownLead);
    tick();
  }
  function startE4Practice(r, lead) {
    const stage = r && r.status === 'lost' ? r.lostAt : 0;
    const go = (lead) => { pleads.e4 = lead; startE4Fight({lead, stage, status: 'live', fights: [], practice: true}, 'practice'); };
    if (lead != null) go(lead);
    else chooseLead(teamFor(E4_OPP), pleads.e4 ?? (r ? r.lead : leads.e4), 'Practice · Elite Four', `Battle ${stage + 1} vs ${LINEUP[stage].name}`, go);
  }
  function startE4Fight(run, mode) {
    Music.unlock();
    const m = LINEUP[run.stage];
    setOpp(E4.asOpp(m));
    const foe = foeFor(OPP);
    const fight = run.fights[run.stage] || (run.fights[run.stage] = {log: [], lead: run.lead});
    if (!fight.log.length) fight.lead = run.lead;
    const seed = mode === 'daily' ? today : 'practice-' + Date.now();
    const b = C.newBattle(seed, teamFor(OPP), fight.lead ?? run.lead, null, OPP, foe);
    C.replay(b, fight.log);
    G = {b, mode, kind: 'e4', run: fight, e4: run, foe, disp: {p1: {}, p2: {}}, logPos: 0, turn: 0, mega: false};
    enterBattle(fight.log.length > 0);
  }
  function e4Finish() {
    const b = G.b, run = G.e4, won = b.winner === 'You';
    const hpList = (side) => b[side].pokemon.slice().sort((x, y) => x.position - y.position).map((p) => [p.species.name, p.fainted ? 0 : Math.max(1, Math.round(100 * p.hp / p.maxhp))]);
    Music.play(won ? 'victory' : 'defeat', true);
    const already = !!G.run.result;
    if (!already) {
      Object.assign(G.run, {result: won ? 'win' : 'loss', turns: b.turn, mine: hpList('p1'), foe: hpList('p2'), member: LINEUP[run.stage].id});
      if (!won) { run.status = 'lost'; run.lostAt = run.stage; }
      else if (run.stage === 3) run.status = 'won';
      else run.stage++;
      if (G.mode === 'daily') {
        if (run.status !== 'live') {
          const st = stat('e4', 'run');
          if (run.status === 'won') { st.w++; st.streak++; st.best = Math.max(st.best, st.streak); } else { st.l++; st.streak = 0; }
          st.lastDay = today;
        }
        save();
      }
    }
    say(won ? `You defeated ${OPP.title}!` : 'You are out of usable Pokémon!');
    $('#touch').innerHTML = `<button class="t-fight" id="t-res"><span>${won ? 'Victory' : 'Defeat'}</span><small>Continue</small></button>`;
    const next = () => e4After(won);
    $('#t-res').onclick = next;
    setTimeout(() => { if (document.body.dataset.view === 'battle' && G && G.b === b) next(); }, 1800 * spd().k);
  }
  function e4After(won, beaten = OPP) {
    const run = G.e4, mode = G.mode;
    if (run.status !== 'live') return e4Summary(run, mode);
    const nxt = LINEUP[run.stage];
    const M = $('#modal');
    M.innerHTML = `<div class="sheet result" role="dialog" aria-modal="true" aria-labelledby="e4i-h">
      <p class="eyebrow">${mode === 'daily' ? 'Elite Four' : 'Practice'} · Battle ${run.stage} of 4 cleared</p>
      <h2 id="e4i-h">${beaten.name} defeated</h2>
      <p>Your team has been fully healed. Next up: <b>${nxt.titleGen}</b>, ${nxt.type} type.</p>
      <div class="e4-next">${S.art === 'drawn' ? glyph(nxt.ace, 56) : oppArt(E4.asOpp(nxt), 64)}<div><b>${nxt.titleGen}</b><div>${typeChip(nxt.type)} Ace ${esc(nxt.ace)}</div></div><button class="btn tiny" id="e4-view">View team</button></div>
      ${leadPickHTML(teamFor(E4_OPP), run.lead)}
      <div class="cta-row"><button class="btn gold" id="e4-go">Battle ${nxt.name}</button><button class="btn ghost" id="e4-back">Back to lineup</button></div>
    </div>`;
    M.hidden = false;
    bindLeadPick(M, (i) => { run.lead = i; if (mode === 'daily') save(); });
    $('#e4-go').onclick = () => { M.hidden = true; startE4Fight(run, mode); };
    $('#e4-view').onclick = () => { Music.blip(); setOpp(E4.asOpp(nxt)); openFoeTeam(false, () => e4After(won, beaten)); };
    $('#e4-back').onclick = () => { M.hidden = true; G = null; openE4(); };
  }
  function e4Share(run) {
    const sq = LINEUP.map((m, i) => (run.status === 'won' || i < (run.status === 'lost' ? run.lostAt : run.stage)) ? '🟩' : (run.status === 'lost' && i === run.lostAt) ? '🟥' : '⬛').join('');
    return `Champion Daily #${C.dayNumber(today)} · Elite Four\n${sq} ${run.status === 'won' ? 'Cleared all four' : `Stopped by ${LINEUP[run.lostAt].name} (${run.lostAt + 1}/4)`}\n${LINEUP.map((m) => m.label).join(' · ')}`;
  }
  function e4Summary(run, mode) {
    const M = $('#modal');
    const txt = mode === 'daily' ? e4Share(run) : null;
    const lost = run.status === 'lost';
    M.innerHTML = `<div class="sheet result" role="dialog" aria-modal="true" aria-labelledby="e4s-h">
      <p class="eyebrow">${mode === 'daily' ? 'Day ' + C.dayNumber(today) : 'Practice'} · Elite Four</p>
      <h2 id="e4s-h">${run.status === 'won' ? 'Elite Four cleared' : `${LINEUP[run.lostAt].name} stopped you`}</h2>
      <p>${run.status === 'won' ? 'You beat all four with one team.' : `You fell in battle ${run.lostAt + 1} of 4.`}</p>
      <ol class="e4-list compact">${LINEUP.map((m, i) => { const f = run.fights[i]; const s = f && f.result ? (f.result === 'win' ? 'beat' : 'lost') : 'ahead';
        return `<li class="e4-row ${s}"><span class="e4-n">${i + 1}</span><span class="e4-g">${glyph(m.ace, 36)}</span><span class="e4-b"><b>${m.titleGen}</b><span class="e4-meta">${typeChip(m.type)}${f && f.result ? ` Led with ${esc(teamFor(E4_OPP)[f.lead ?? run.lead].species)}` : ''}${f && f.turns ? ` · ${f.turns} turn${f.turns === 1 ? "" : "s"}` : ''}</span></span><span class="e4-s">${s === 'beat' ? 'Defeated' : s === 'lost' ? 'Beat you' : ''}</span></li>`; }).join('')}</ol>
      ${txt ? `<pre class="share" id="share-t">${esc(txt)}</pre>` : ''}
      <div class="cta-row">
        ${txt ? '<button class="btn gold" id="btn-copy">Copy result</button>' : ''}
        ${lost ? '<button class="btn" id="e4-cont">Continue in practice</button>' : '<button class="btn" id="e4-cont">Practice run</button>'}
        <button class="btn ghost" id="e4-lobby">Back to lineup</button>
      </div></div>`;
    M.hidden = false;
    const cp = $('#btn-copy');
    if (cp) cp.onclick = () => {
      navigator.clipboard.writeText(txt).then(() => { cp.textContent = 'Copied'; }).catch(() => {
        const r = document.createRange(); r.selectNodeContents($('#share-t')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent = 'Selected, copy it';
      });
    };
    $('#e4-cont').onclick = () => { M.hidden = true; startE4Practice(run.practice ? Object.assign({}, run, {lostAt: run.lostAt}) : run); };
    $('#e4-lobby').onclick = () => { M.hidden = true; G = null; openE4(); };
  }

  // ---------------- Battle Factory ----------------
  // Endless runs, no daily seed: pick a tier, rent 3 of 6, battle 3v3, swap after each win. One run at a time, saved as it goes.
  const FACTORY_OPP = {id: 'factory', name: 'Battle Factory', title: 'Battle Factory', gen: 9, skin: 'gen3', place: 'Battle Factory', mechanics: 'Gen IX'};
  const fstat = (tier) => (S.stats['factory:' + tier] = Object.assign({best: 0, runs: 0, wins: 0}, S.stats['factory:' + tier]));
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let fsel = {picks: [], give: null, take: null}; // unsaved UI selections
  function factoryCard() {
    const r = S.factory;
    const live = r && r.status !== 'over';
    const best = Math.max(0, ...Factory.TIERS.map((t) => fstat(t).best));
    return `<article class="opp-card" data-o="factory">
      <div class="opp-top"><span class="gen-badge">Gen IX</span><span class="opp-place">Battle Frontier</span></div>
      <h2>Battle Factory</h2>
      <p class="opp-desc">Rent 3 of 6 Pokémon from Showdown's Battle Factory sets, battle 3v3, and swap after every win. Pick a tier and see how long your streak lasts. Emerald style, no daily limit.</p>
      <div class="chips"><span class="chip ${live ? 'live' : 'open'}">${live ? `<b>${r.tier} run · streak ${r.n}</b>` : 'Best streak <b>' + best + '</b>'}</span></div>
      <button class="btn gold" data-go="factory">${live ? 'Continue run' : 'Enter the Factory'}</button>
    </article>`;
  }
  function openFactory() { setOpp(FACTORY_OPP); show('lobby'); renderFactory(); Music.play('menu', true); }
  function factoryNext(run) {
    run.opp = Factory.opponent(run.tier, run.id, run.n, run.team);
    run.status = 'pre'; run.fight = null; run.lead = Math.min(run.lead || 0, run.team.length - 1);
    fsel = {picks: [], give: null, take: null};
    save();
  }
  function renderFactory() {
    setOpp(FACTORY_OPP);
    const r = S.factory, st = r ? r.status : 'none';
    const tiers = Factory.TIERS;
    const pickTier = S.factoryTier && tiers.includes(S.factoryTier) ? S.factoryTier : 'OU';
    const battleNo = r ? r.n + 1 : 1;
    const round = Math.floor((battleNo - 1) / Factory.ROUND) + 1, inRound = (battleNo - 1) % Factory.ROUND + 1;
    let main = '';
    if (st === 'none' || st === 'over') {
      main = `${st === 'over' ? `<section class="fac-over"><h2>Run over</h2><p>${esc(r.lostTo)} ended your ${r.tier} run. Streak: <b>${r.n}</b>${r.n >= fstat(r.tier).best && r.n > 0 ? ' (a new best)' : ''}.</p></section>` : ''}
        <section><div class="sec-h"><h2>Choose a tier</h2><p>Both you and your opponents draw from this tier's Battle Factory sets.</p></div>
          <div class="tier-pick" role="radiogroup">${tiers.map((t) => `<button role="radio" aria-checked="${t === pickTier}" data-tier="${t}"><b>${t}</b><small>Best ${fstat(t).best}</small></button>`).join('')}</div>
          <div class="cta-row"><button class="btn gold" id="fac-start">Start a ${pickTier} run</button>${styleNote(FACTORY_OPP)}</div></section>`;
    } else if (st === 'draft') {
      main = `<section><div class="sec-h"><h2>Rent 3 Pokémon</h2><p>Pick 3 of these 6 rentals. The order you pick sets your starting lead.</p></div>
        <div class="grid" id="fac-rent">${r.rentals.map((s, i) => { const k = fsel.picks.indexOf(i); return monCard(s, i, {lead: k >= 0, tag: k >= 0 ? '#' + (k + 1) : ''}); }).join('')}</div>
        <div class="cta-row"><button class="btn gold" id="fac-rent-go" ${fsel.picks.length === 3 ? '' : 'disabled'}>Rent these 3</button><span class="status-line">${fsel.picks.length}/3 chosen</span></div></section>`;
    } else if (st === 'pre' || st === 'live') {
      const o = r.opp, h = Factory.hint(o.sets, D);
      main = `<section class="fac-next"><div class="fac-foe">${oppArt(Factory.asOpp(o), 96)}<div>
          <p class="eyebrow">Round ${round} · Battle ${inRound} of ${Factory.ROUND}${o.head ? ' · Factory Head' : ''}</p>
          <h2>${esc(o.trainer.title)}</h2>
          <p class="fac-hint">Most common type: ${typeChip(h.type)}<br>Battle style: ${esc(h.style)}</p></div></div>
          <div class="cta-row"><button class="btn gold" id="fac-go">${st === 'live' ? 'Resume battle' : 'Battle!'}</button><button class="btn ghost" id="fac-quit">Give up run</button>${styleNote(Factory.asOpp(o))}</div></section>
        <section><div class="sec-h"><h2>Your team</h2><p>${st === 'live' ? 'Battle in progress.' : 'Fully healed. Tap a Pokémon to lead.'}</p></div>
          <div class="grid" id="team">${r.team.map((s, i) => monCard(s, i, {lead: i === (st === 'live' ? r.fight.lead : r.lead), static: st === 'live'})).join('')}</div></section>`;
    } else if (st === 'swap') {
      const theirs = r.prev.sets;
      main = `<section><div class="sec-h"><h2>Swap a Pokémon?</h2><p>You beat ${esc(r.prev.trainer.title)}. Trade one of yours for one of theirs, or keep your team.</p></div>
        <h3 class="fac-sub">Give one of yours</h3>
        <div class="grid" id="fac-give">${r.team.map((s, i) => monCard(s, i, {lead: fsel.give === i, tag: 'GIVE'})).join('')}</div>
        <h3 class="fac-sub">Take one of theirs</h3>
        <div class="grid" id="fac-take">${theirs.map((s, i) => monCard(s, i, {lead: fsel.take === i, tag: 'TAKE'})).join('')}</div>
        <div class="cta-row"><button class="btn gold" id="fac-swap" ${fsel.give != null && fsel.take != null ? '' : 'disabled'}>Swap</button><button class="btn" id="fac-keep">Keep my team</button></div></section>`;
    }
    $('#lobby').innerHTML = `
      <button class="back" id="btn-back">← All opponents</button>
      <section class="hero">
        <p class="eyebrow">Battle Frontier · Gen 9 battle rules · Lv100${r && st !== 'over' ? ' · ' + r.tier + ' tier' : ''}</p>
        <h1 class="opp-h">Battle <em>Factory</em></h1>
        ${r && st !== 'none' && st !== 'over' ? `<dl class="stats"><div><dt>Tier</dt><dd>${r.tier}</dd></div><div><dt>Streak</dt><dd>${r.n}</dd></div><div><dt>Best (${r.tier})</dt><dd>${fstat(r.tier).best}</dd></div><div><dt>Next</dt><dd>Battle ${battleNo}</dd></div></dl>` : ''}
      </section>
      ${main}
      <section class="rules">
        <h2>Rules</h2>
        <ul>
          <li>Gen 9 battle rules with no Terastallization, Mega Evolution or Z-Moves. Everyone is Lv100.</li>
          <li>Sets are Pokémon Showdown's Gen 9 Battle Factory sets for the tier you pick. Opponents draw from the same tier.</li>
          <li>Rent 3 of 6 and battle 3v3. Before each battle you get a hint: the opponent's most common type and battle style.</li>
          <li>After every win your team is fully healed and you can swap one of your Pokémon for one of the beaten team's.</li>
          <li>Rounds are ${Factory.ROUND} battles. Factory Head Noland waits at battles ${Factory.HEAD_AT.join(' and ')}. One loss ends the run; your best streak is kept per tier.</li>
        </ul>
      </section>`;
    $('#btn-back').onclick = () => { Music.blip(500); goHome(); };
    $('#lobby').querySelectorAll('[data-tier]').forEach((b) => b.onclick = () => { S.factoryTier = b.dataset.tier; save(); Music.blip(660); renderFactory(); });
    const start = $('#fac-start');
    if (start) start.onclick = () => {
      const id = newId();
      S.factory = {id, tier: pickTier, rentals: Factory.rentals(pickTier, id), team: [], n: 0, lead: 0, status: 'draft'};
      fsel = {picks: [], give: null, take: null}; save(); Music.blip(); renderFactory();
    };
    $('#lobby').querySelectorAll('#fac-rent .mon').forEach((b) => b.onclick = () => {
      const i = +b.dataset.i, k = fsel.picks.indexOf(i);
      if (k >= 0) fsel.picks.splice(k, 1); else if (fsel.picks.length < 3) fsel.picks.push(i);
      Music.blip(660); renderFactory();
    });
    const rent = $('#fac-rent-go');
    if (rent) rent.onclick = () => { r.team = fsel.picks.map((i) => r.rentals[i]); r.lead = 0; delete r.rentals; Music.blip(); factoryNext(r); renderFactory(); };
    if (st === 'pre') $('#lobby').querySelectorAll('#team .mon').forEach((b) => b.onclick = () => { r.lead = +b.dataset.i; save(); Music.blip(660); renderFactory(); });
    const go = $('#fac-go'); if (go) go.onclick = () => startFactoryFight();
    const quit = $('#fac-quit');
    if (quit) quit.onclick = () => { if (!confirm('Give up this run? Your streak of ' + r.n + ' is kept as your record if it is a best.')) return; factoryEnd(r, 'You gave up'); renderFactory(); };
    $('#lobby').querySelectorAll('#fac-give .mon').forEach((b) => b.onclick = () => { fsel.give = +b.dataset.i; Music.blip(660); renderFactory(); });
    $('#lobby').querySelectorAll('#fac-take .mon').forEach((b) => b.onclick = () => { fsel.take = +b.dataset.i; Music.blip(660); renderFactory(); });
    const swap = $('#fac-swap');
    if (swap) swap.onclick = () => { r.team[fsel.give] = Object.assign({}, r.prev.sets[fsel.take]); delete r.prev; Music.blip(); factoryNext(r); renderFactory(); };
    const keep = $('#fac-keep'); if (keep) keep.onclick = () => { delete r.prev; Music.blip(); factoryNext(r); renderFactory(); };
  }
  function factoryEnd(run, lostTo) {
    const st = fstat(run.tier);
    st.runs++; st.best = Math.max(st.best, run.n);
    Object.assign(run, {status: 'over', lostTo, fight: null});
    save();
  }
  function startFactoryFight() {
    Music.unlock();
    const run = S.factory;
    if (!run.fight) run.fight = {seed: newId(), log: [], lead: run.lead};
    run.status = 'live'; save();
    const opp = Factory.asOpp(run.opp);
    setOpp(opp);
    const b = C.newBattle(run.fight.seed, run.team, run.fight.lead, 100, opp, run.opp.sets);
    C.replay(b, run.fight.log);
    G = {b, mode: 'factory', kind: 'factory', run: run.fight, factory: run, foe: run.opp.sets, disp: {p1: {}, p2: {}}, logPos: 0, turn: 0, mega: false};
    enterBattle(run.fight.log.length > 0);
  }
  function factoryFinish() {
    const b = G.b, run = G.factory, won = b.winner === 'You';
    Music.play(won ? 'victory' : 'defeat', true);
    if (run.status === 'live') {
      if (won) {
        run.n++; const st = fstat(run.tier); st.wins++; st.best = Math.max(st.best, run.n);
        run.prev = run.opp; run.status = 'swap'; run.fight = null; save();
      } else factoryEnd(run, run.opp.trainer.title);
    }
    say(won ? `You defeated ${OPP.title}!` : 'You are out of usable Pokémon!');
    $('#touch').innerHTML = `<button class="t-fight" id="t-res"><span>${won ? 'Victory' : 'Defeat'}</span><small>${won ? `Streak ${run.n}` : 'Run over'}</small></button>`;
    const next = () => { if (G && G.b === b) { G = null; openFactory(); } };
    $('#t-res').onclick = next;
    setTimeout(() => { if (document.body.dataset.view === 'battle') next(); }, 2200 * spd().k);
  }

  // ---------------- settings ----------------
  // Every track a player can pick. kind 'battle' adds the Default entry; 'menu' leads with the menu track.
  function sourceOptions(sel, kind, defaultLabel) {
    const opt = (v, label) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${esc(label)}</option>`;
    const ytKeys = Object.keys(YT_THEMES).filter((k) => kind === 'menu' ? k === 'lilycove' : k !== 'lilycove');
    const extra = Object.keys(YT_THEMES).filter((k) => !ytKeys.includes(k));
    const b = Object.keys(BUILTIN).filter((k) => k !== 'victory' && k !== 'defeat' && k !== 'pinch').map((k) => opt('b:' + k, BUILTIN[k].label)).join('');
    const u = S.lib.map((t) => opt('u:' + t.id, t.name)).join('');
    return (kind === 'battle' ? opt('default', defaultLabel || "Default (each opponent's own theme)") : '') +
      `<optgroup label="Official themes (YouTube)">${ytKeys.map((k) => opt('y:' + k, YT_THEMES[k][0])).join('')}${extra.map((k) => opt('y:' + k, YT_THEMES[k][0])).join('')}</optgroup>` +
      `<optgroup label="Showdown battle music">${Object.keys(SD_THEMES).map((k) => opt('s:' + k, SD_THEMES[k])).join('')}</optgroup>` +
      `<optgroup label="Built-in chiptunes">${b}</optgroup>${u ? `<optgroup label="Your tracks">${u}</optgroup>` : ''}` + opt('off', 'Off');
  }
  // In-battle music picker: changes this battle's track, optionally saving it as the battle theme preference.
  function openMusicPicker() {
    const M = $('#modal');
    const cur = (G && G.music) || 'default';
    M.innerHTML = `<div class="sheet settings" role="dialog" aria-modal="true" aria-labelledby="mus-h">
      <div class="foe-head"><h2 id="mus-h">Music</h2><button class="btn tiny ghost" id="mus-x">Close</button></div>
      <p class="note">Now playing: <b>${esc(sourceLabel(Music.src))}</b></p>
      <div class="set-row"><label for="mus-sel">This battle</label><select id="mus-sel">${sourceOptions(cur, 'battle', `Default (${sourceLabel(S.music.battle !== 'default' ? S.music.battle : defaultBattle(OPP))})`)}</select></div>
      <div class="set-row"><label for="mus-keep">Use for every battle</label><input type="checkbox" id="mus-keep"></div>
      <div class="set-row"><label for="mus-vol">Volume</label><input type="range" id="mus-vol" min="0" max="1" step="0.05" value="${S.music.vol}"></div>
      <div class="cta-row"><button class="btn gold" id="mus-done">Done</button></div></div>`;
    M.hidden = false;
    $('#mus-sel').onchange = (e) => {
      G.music = e.target.value === 'default' ? null : e.target.value;
      if ($('#mus-keep').checked) { S.music.battle = e.target.value; save(); }
      Music.unlock(); Music.play('battle', true);
    };
    $('#mus-keep').onchange = (e) => { if (e.target.checked) { S.music.battle = $('#mus-sel').value; save(); } };
    $('#mus-vol').oninput = (e) => { Music.setVol(+e.target.value); save(); };
    $('#mus-x').onclick = $('#mus-done').onclick = () => { M.hidden = true; };
  }
  $('#btn-music').onclick = () => { Music.blip(); openMusicPicker(); };
  $('#btn-speed').onclick = () => { const ks = Object.keys(SPEEDS); S.music.speed = ks[(ks.indexOf(S.music.speed || 'normal') + 1) % ks.length]; save(); applySpeed(); Music.blip(1100); };
  applySpeed();
  $('#md-change').onclick = () => { if (document.body.dataset.view === 'battle' && G) openMusicPicker(); else openSettings(); };
  function openSettings() {
    const M = $('#modal');
    M.innerHTML = `<div class="sheet settings" role="dialog" aria-modal="true" aria-labelledby="set-h">
      <div class="foe-head"><h2 id="set-h">Settings</h2><button class="btn tiny ghost" id="set-x">Close</button></div>
      <h3>Display</h3>
      <div class="set-row"><label for="player">Player</label><select id="player"><option value="male">Male</option><option value="female" ${S.player === 'female' ? 'selected' : ''}>Female</option></select></div>
      <div class="set-trainers" id="set-trainers"></div>
      <div class="set-row"><label for="art">Art</label><select id="art"><option value="sprites">Official sprites (linked from Pokémon Showdown)</option><option value="drawn" ${S.art === 'drawn' ? 'selected' : ''}>Original drawn art</option></select></div>
      <div class="set-row"><label for="style">Battle style</label><select id="style">${Object.entries(STYLES).map(([k, v]) => `<option value="${k}" ${S.style === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <h3>Sound</h3>
      <div class="set-row"><label for="mute">Mute everything</label><input type="checkbox" id="mute" ${S.music.muted ? 'checked' : ''}></div>
      <div class="set-row"><label for="vol">Music volume</label><input type="range" id="vol" min="0" max="1" step="0.05" value="${S.music.vol}"></div>
      <div class="set-row"><label for="sfx">Menu sounds</label><input type="checkbox" id="sfx" ${S.music.sfx !== false ? 'checked' : ''}></div>
      <div class="set-row"><label for="spd">Battle speed</label><select id="spd">${Object.entries(SPEEDS).map(([k, v]) => `<option value="${k}" ${(S.music.speed || 'normal') === k ? 'selected' : ''}>${v.label}${k === 'fastest' ? ' (skips intros)' : ''}</option>`).join('')}</select></div>
      <h3>Music</h3>
      <div class="set-row slot-row"><label for="m-battle">Battle theme</label><div class="slot-ctl"><select id="m-battle">${sourceOptions(S.music.battle, 'battle')}</select></div></div>
      <p class="note">Default plays Cynthia's theme against Cynthia, Zinnia's against Zinnia, and each Elite Four member's own generation's Elite Four music. Change the track mid-battle with the ♪ Music button.</p>
      <div class="set-row slot-row"><label for="m-menu">Menu music</label><div class="slot-ctl"><select id="m-menu">${sourceOptions(S.music.menu, 'menu')}</select></div></div>
      <h3>Your tracks</h3>
      <p class="note">Add audio files from your device, then pick them in either dropdown above. Name them however you like; they stay in this browser only.</p>
      <ul class="lib">${S.lib.map((t) => `<li><input type="text" id="lib-${t.id}" data-id="${t.id}" value="${esc(t.name)}" aria-label="Track name"><button class="btn tiny ghost" data-del="${t.id}">Remove</button></li>`).join('') || '<li class="empty">No tracks yet.</li>'}</ul>
      <div class="cta-row"><label class="btn" for="lib-add">Add audio files</label><input type="file" id="lib-add" accept="audio/*" multiple hidden><span class="fname" id="lib-msg"></span></div>
      <div class="cta-row"><button class="btn gold" id="set-done">Done</button></div>
    </div>`;
    M.hidden = false;
    const resume = () => Music.play(currentMusicSlot(), true);
    $('#mute').onchange = (e) => { S.music.muted = e.target.checked; save(); setMuteBtn(); if (S.music.muted) Music.stop(); else { Music.unlock(); resume(); } };
    $('#vol').oninput = (e) => { Music.setVol(+e.target.value); save(); };
    $('#sfx').onchange = (e) => { S.music.sfx = e.target.checked; save(); };
    $('#spd').onchange = (e) => { S.music.speed = e.target.value; save(); applySpeed(); };
    const drawTrainers = () => { $('#set-trainers').innerHTML = [C.OPP.cynthia, C.OPP.zinnia, {id: 'e4'}].map((o) => `<figure>${protagArt(o, 'front', 64)}<figcaption>${protagFor(o)}</figcaption></figure>`).join(''); };
    drawTrainers();
    $('#player').onchange = (e) => { S.player = e.target.value; save(); drawTrainers(); if (G) $('#bt-mode').textContent = $('#bt-mode').textContent.replace(/\S+ vs /, protagFor(OPP) + ' vs '); };
    $('#style').onchange = (e) => { S.style = e.target.value; save(); if (G) { $('.device').dataset.skin = skinFor(OPP); renderActives(true); } };
    $('#art').onchange = (e) => { S.art = e.target.value; save(); if (G) renderActives(true); };
    $('#m-battle').onchange = (e) => { S.music.battle = e.target.value; save(); if (currentMusicSlot() === 'battle') resume(); };
    $('#m-menu').onchange = (e) => { S.music.menu = e.target.value; save(); if (currentMusicSlot() === 'menu') { Music.unlock(); resume(); } };
    M.querySelectorAll('.lib input[type=text]').forEach((inp) => inp.onchange = () => { const t = S.lib.find((x) => x.id === inp.dataset.id); if (t) { t.name = inp.value.trim() || t.name; save(); openSettings(); } });
    M.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.del;
      await Music.delTrack(id);
      S.lib = S.lib.filter((t) => t.id !== id);
      if (S.music.battle === 'u:' + id) S.music.battle = 'default';
      if (S.music.menu === 'u:' + id) S.music.menu = 'y:lilycove';
      save(); openSettings();
    });
    $('#lib-add').onchange = async (e) => {
      const files = [...e.target.files];
      let added = 0;
      for (const f of files) { const id = await Music.addTrack(f); if (id) { S.lib.push({id, name: f.name.replace(/\.[^.]+$/, '')}); added++; } }
      save();
      if (added) openSettings(); else $('#lib-msg').textContent = 'This browser blocked saving the files.';
    };
    $('#set-x').onclick = $('#set-done').onclick = () => { M.hidden = true; if (document.body.dataset.view === 'lobby') (OPP.id === 'e4' || OPP.member ? renderE4 : renderLobby)(); if (Music.slot === '__preview' || !Music.slot) resume(); };
  }

  function setMuteBtn() { $('#btn-mute').textContent = S.music.muted ? 'Sound off' : 'Sound on'; $('#btn-mute').setAttribute('aria-pressed', !S.music.muted); }
  $('#btn-mute').onclick = () => {
    S.music.muted = !S.music.muted; save(); setMuteBtn();
    if (S.music.muted) Music.stop(); else { Music.unlock(); Music.play(currentMusicSlot(), true); }
  };
  $('#btn-settings').onclick = openSettings;
  document.addEventListener('click', (e) => { if (e.target.closest('[data-style-open]')) openSettings(); });
  $('#btn-about').onclick = () => { Music.blip(); if (G && !G.b.ended) G = G; show('about'); };
  $('#about-back').onclick = () => { if (G && !G.b.ended) show('battle'); else goHome(); };
  $('#btn-home').onclick = () => goHome();
  $('#textbox').onclick = () => { if (skip) skip(); };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) { $('#modal').hidden = true; return; }
    if (document.body.dataset.view !== 'battle' || !G || G.busy) { if ((e.key === ' ' || e.key === 'Enter') && skip && G && G.busy) skip(); return; }
    if (/^[1-4]$/.test(e.key) && !G.b.ended && !G.b.p1.activeRequest.forceSwitch && $('#modal').hidden) {
      const m = G.b.p1.activeRequest.active[0].moves[+e.key - 1];
      if (m && !m.disabled && m.pp !== 0) choose('move ' + e.key + (G.mega ? ' mega' : ''));
    }
  });
  $('#modal').onclick = (e) => { if (e.target.id === 'modal') e.target.hidden = true; };
  let unlocked = false;
  document.addEventListener('pointerdown', () => { if (unlocked) return; unlocked = true; if (!S.music.muted) { Music.unlock(); if (!Music.slot || Music.slot === currentMusicSlot()) Music.play(currentMusicSlot(), true); } });

  setMuteBtn();
  $('#loading').hidden = true;
  goHome();
})();
