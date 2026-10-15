// Encounter intros, one per battle style: the transition into battle, before the trainers walk in.
// Gen 3: black bars, then the Emerald-style League mugshot strip. Gen 4: League mugshot banner. Gen 6: VS screen. Gen 9: flash and burst card.
// play() resolves when the transition is over; tapping the screen skips it.
(function () {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LAYOUT = {
    gen3: (o) => `<div class="in-bars">${Array.from({length: 8}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>` +
      `<div class="in-strip" style="--ac:${o.accent}"><div class="in-p">${o.player}</div><div class="in-o">${o.opp}</div><div class="in-name"><small>${o.role}</small>${o.name}</div></div>`,
    dppt: (o) => `<div class="in-band" style="--ac:${o.accent}"><div class="in-mug">${o.opp}</div><div class="in-name"><small>${o.role}</small>${o.name}</div></div>`,
    oras: (o) => `<div class="in-vs"><div class="in-side l"><div class="in-spr">${o.player}</div><b>${o.playerName}</b></div>` +
      `<div class="in-side r" style="--ac:${o.accent}"><div class="in-spr">${o.opp}</div><b>${o.name}</b></div><div class="in-vs-t">VS</div></div>`,
    sv: (o) => `<div class="in-burst" style="--ac:${o.accent}"><div class="in-rays"></div><div class="in-card"><div class="in-spr">${o.opp}</div><div class="in-name"><small>${o.role}</small>${o.name}</div></div></div>`,
  };
  // Total length per style (ms); CSS animations are timed against these.
  const LEN = {gen3: 2100, dppt: 2100, oras: 2200, sv: 2000};

  // opts: {skin, opp, player (HTML), name, role, playerName, accent}
  function play(scene, opts) {
    if (reduced() || !LAYOUT[opts.skin]) return Promise.resolve();
    const el = document.createElement('div');
    el.className = 'intro';
    el.dataset.skin = opts.skin;
    el.innerHTML = LAYOUT[opts.skin](opts);
    scene.appendChild(el);
    return new Promise((done) => {
      const end = () => { clearTimeout(t); el.remove(); done(); };
      const t = setTimeout(end, LEN[opts.skin]);
      el.addEventListener('click', end, {once: true});
    });
  }

  window.Intro = {play};
})();
