// Search AI for Cynthia (p2). Simulates every (Cynthia option × player option) pair one turn
// ahead with the real engine, scores the outcome, and plays the Nash equilibrium of that matrix.
(function () {
  const {Battle, PRNG} = (self.window || self).PS;
  const Core = (self.window || self).Core;

  function options(b, sideId) {
    const side = b[sideId];
    const r = side.activeRequest;
    if (!r || r.wait) return [];
    const out = [];
    if (r.forceSwitch) {
      side.pokemon.forEach((p, i) => { if (i > 0 && !p.fainted) out.push('switch ' + (i + 1)); });
      return out.length ? out : ['pass'];
    }
    const a = r.active[0];
    const mega = a.canMegaEvo ? ' mega' : ''; // always Mega Evolve when able
    a.moves.forEach((m, i) => { if (!m.disabled && !(m.pp !== undefined && m.pp <= 0 && m.maxpp)) out.push('move ' + (i + 1) + mega); });
    if (!out.length) out.push('move 1'); // struggle
    if (!a.trapped) side.pokemon.forEach((p, i) => { if (i > 0 && !p.fainted) out.push('switch ' + (i + 1)); });
    return out;
  }

  // ---------- evaluation (positive = good for Cynthia) ----------
  function sideValue(side, foeActive) {
    let v = 0;
    const sr = side.sideConditions && side.sideConditions.stealthrock;
    const spikes = side.sideConditions && side.sideConditions.spikes ? side.sideConditions.spikes.layers : 0;
    for (const p of side.pokemon) {
      if (p.fainted || p.hp <= 0) continue;
      const frac = p.hp / p.maxhp;
      v += 0.7 + frac;
      const phys = p.storedStats.atk >= p.storedStats.spa;
      switch (p.status) {
        case 'slp': v -= 0.35; break;
        case 'frz': v -= 0.5; break;
        case 'par': v -= 0.22; break;
        case 'brn': v -= phys ? 0.32 : 0.1; break;
        case 'tox': v -= 0.28; break;
        case 'psn': v -= 0.12; break;
      }
      if (!p.isActive) {
        if (sr) v -= 0.125 * Core.effMult('Rock', p) * 0.9;
        if (spikes && !p.hasType('Flying') && p.ability !== 'levitate') v -= [0, 0.125, 0.167, 0.25][spikes] * 0.9;
      }
    }
    const a = side.active[0];
    if (a && !a.fainted) {
      const bo = a.boosts;
      const off = a.storedStats.atk >= a.storedStats.spa ? bo.atk : bo.spa;
      let bv = 0.12 * off + 0.08 * bo.spe + 0.05 * (bo.def + bo.spd);
      v += Math.max(-0.6, Math.min(0.8, bv)) * (a.hp / a.maxhp);
      if (a.volatiles.substitute) v += 0.15;
    }
    return v;
  }
  function bestDamage(att, def) {
    let best = 0, prio = 0;
    for (const ms of att.moveSlots) {
      if (ms.pp <= 0) continue;
      const d = Core.estDamage(att, def, ms.id);
      if (d > best) { best = d; prio = att.battle.dex.moves.get(ms.id).priority; }
    }
    return {d: best, prio};
  }
  function speedOf(p) { return Core.statOf(p, 'spe'); }
  function race(b) {
    const me = b.p2.active[0], foe = b.p1.active[0];
    if (!me || !foe || me.fainted || foe.fainted || !me.hp || !foe.hp) return 0;
    const a = bestDamage(me, foe), d = bestDamage(foe, me);
    const tMe = a.d > 0 ? Math.ceil(1 / Math.min(a.d, 1) - 1e-9) : 9;
    const tFoe = d.d > 0 ? Math.ceil(1 / Math.min(d.d, 1) - 1e-9) : 9;
    let first = a.prio !== d.prio ? a.prio > d.prio : speedOf(me) > speedOf(foe);
    // if I land the KO first I win the 1v1
    const iWin = first ? tMe <= tFoe : tMe < tFoe;
    const margin = Math.min(3, Math.abs(tFoe - tMe) + (iWin === first ? 0.5 : 0));
    return (iWin ? 1 : -1) * (0.25 + 0.08 * margin);
  }
  function evaluate(b) {
    if (b.ended) return b.winner === 'You' ? -100 : b.winner ? 100 : 0; // p2 is whichever champion
    return sideValue(b.p2) - sideValue(b.p1) + RACE_W * race(b);
  }

  // ---------- simulation ----------
  let seedCounter = 1;
  let DEPTH = 0;
  let RACE_W = 0.3, MODE = 'model';
  function clone(json) {
    const c = Battle.fromJSON(json);
    c.send = () => {};
    return c;
  }
  function reseed(c, k) { c.prng = new PRNG([k * 7 + 3 & 0xffff, k * 13 + 5 & 0xffff, k * 29 + 11 & 0xffff, (seedCounter++) & 0xffff]); }

  // fast greedy policy for either side, used in rollouts
  function greedy(c, sideId) {
    const side = c[sideId], foeSide = c[sideId === 'p1' ? 'p2' : 'p1'];
    const r = side.activeRequest;
    const foe = foeSide.active[0];
    if (r.forceSwitch) {
      let best = null;
      side.pokemon.forEach((p, i) => {
        if (i === 0 || p.fainted) return;
        let off = 0; for (const ms of p.moveSlots) off = Math.max(off, foe && foe.hp ? Core.estDamage(p, foe, ms.id) : 0);
        let def = 0; if (foe && foe.hp) for (const t of foe.getTypes()) def = Math.max(def, Core.effMult(t, p));
        const v = off - 0.3 * def + 0.3 * p.hp / p.maxhp;
        if (!best || v > best.v) best = {v, i};
      });
      return best ? 'switch ' + (best.i + 1) : 'pass';
    }
    const me = side.active[0];
    let best = null;
    r.active[0].moves.forEach((m, i) => {
      if (m.disabled || (m.pp !== undefined && m.pp <= 0 && m.maxpp)) return;
      let v = foe && foe.hp ? Core.estDamage(me, foe, m.id) : 0;
      const mv = c.dex.moves.get(m.id);
      if (v === 0 && mv.category === 'Status') {
        if ((mv.heal || m.id === 'rest' || m.id === 'painsplit') && me.hp / me.maxhp < 0.45) v = 0.4;
        else if (mv.boosts && mv.target === 'self' && me.hp / me.maxhp > 0.7) v = 0.3;
        else if (mv.status && foe && !foe.status) v = 0.25;
        else v = 0.02;
      }
      if (mv.priority > 0 && foe && v >= foe.hp / foe.maxhp) v += 0.5;
      if (!best || v > best.v) best = {v, i};
    });
    return (best ? 'move ' + (best.i + 1) : 'move 1') + (r.active[0].canMegaEvo ? ' mega' : '');
  }
  function rollout(c, turns) {
    for (let t = 0; t < turns && !c.ended; t++) {
      let guard = 0;
      const start = c.turn;
      while (!c.ended && c.turn === start && guard++ < 6) {
        for (const sd of ['p2', 'p1']) {
          const r = c[sd].activeRequest;
          if (r && !r.wait && !c[sd].isChoiceDone()) { try { c.choose(sd, greedy(c, sd)); } catch (e) { try { c.choose(sd, 'default'); } catch (e2) {} } }
        }
      }
    }
    return evaluate(c);
  }

  // resolve forced replacements greedily so the evaluated state is a real decision point
  function settle(c, json, depthLeft) {
    let guard = 0;
    while (!c.ended && guard++ < 4) {
      const n2 = c.p2.activeRequest && c.p2.activeRequest.forceSwitch && !c.p2.isChoiceDone();
      const n1 = c.p1.activeRequest && c.p1.activeRequest.forceSwitch && !c.p1.isChoiceDone();
      if (!n1 && !n2) break;
      const snap = JSON.stringify(c.toJSON());
      if (n2) c.choose('p2', pickReplacement(snap, 'p2'));
      if (n1) c.choose('p1', pickReplacement(snap, 'p1'));
    }
    return evaluate(c);
  }
  function pickReplacement(snap, sideId) {
    const base = clone(snap);
    const opts = options(base, sideId);
    let best = null;
    for (const o of opts) {
      const c = clone(snap);
      try { c.choose(sideId, o); } catch (e) { continue; }
      // if the other side also has to choose, let it auto-pick to resolve the request
      const other = sideId === 'p1' ? 'p2' : 'p1';
      const r = c[other].activeRequest;
      if (r && r.forceSwitch && !c[other].isChoiceDone()) { try { c.choose(other, 'default'); } catch (e) {} }
      const v = evaluate(c) * (sideId === 'p2' ? 1 : -1);
      if (!best || v > best.v) best = {v, o};
    }
    return best ? best.o : 'default';
  }

  // ---------- matrix game ----------
  function solve(M) { // M[i][j] payoff to row player (Cynthia). Regret matching, averaged.
    const R = M.length, Cn = M[0].length;
    const rReg = new Float64Array(R), cReg = new Float64Array(Cn);
    const rSum = new Float64Array(R), cSum = new Float64Array(Cn);
    const strat = (reg) => { let s = 0; const p = Array.from(reg, (x) => Math.max(0, x)); for (const x of p) s += x; return s > 0 ? p.map((x) => x / s) : p.map(() => 1 / p.length); };
    for (let it = 0; it < 3000; it++) {
      const rp = strat(rReg), cp = strat(cReg);
      const rVal = M.map((row) => row.reduce((a, v, j) => a + v * cp[j], 0));
      const cVal = []; for (let j = 0; j < Cn; j++) { let a = 0; for (let i = 0; i < R; i++) a += M[i][j] * rp[i]; cVal.push(a); }
      const ev = rVal.reduce((a, v, i) => a + v * rp[i], 0);
      for (let i = 0; i < R; i++) { rReg[i] += rVal[i] - ev; rSum[i] += rp[i]; }
      for (let j = 0; j < Cn; j++) { cReg[j] += ev - cVal[j]; cSum[j] += cp[j]; }
    }
    const norm = (a) => { const s = a.reduce((x, y) => x + y, 0); return Array.from(a, (x) => x / s); };
    return {row: norm(rSum), col: norm(cSum)};
  }

  function decide(json, opts = {}) {
    const snap = typeof json === 'string' ? json : JSON.stringify(json);
    const root = clone(snap);
    const me = opts.side || 'p2', other = me === 'p2' ? 'p1' : 'p2', sign = me === 'p2' ? 1 : -1;
    const mine = options(root, me);
    if (!mine.length) return {choice: 'default'};
    const r2 = root[me].activeRequest;
    if (r2.forceSwitch) return {choice: pickReplacement(snap, me), kind: 'replace'};
    const theirs = options(root, other);
    const p1Waiting = !theirs.length;
    const cols = p1Waiting ? [null] : theirs;
    const rolls = opts.rolls || 2;
    const M = mine.map(() => new Array(cols.length).fill(0));
    let sims = 0;
    for (let i = 0; i < mine.length; i++) {
      for (let j = 0; j < cols.length; j++) {
        const switching = mine[i].startsWith('switch') || (cols[j] && cols[j].startsWith('switch'));
        const k = switching ? 1 : rolls;
        let tot = 0, n = 0;
        for (let s = 0; s < k; s++) {
          const c = clone(snap);
          reseed(c, i * 31 + j * 7 + s);
          try {
            c.choose(me, mine[i]);
            if (cols[j]) c.choose(other, cols[j]);
          } catch (e) { continue; }
          settle(c); tot += sign * (DEPTH ? rollout(c, DEPTH) : evaluate(c)); n++; sims++;
        }
        M[i][j] = n ? tot / n : -50;
      }
    }
    let {row, col} = solve(M);
    if (MODE !== 'nash' && cols[0]) {
      const pred = greedy(root, other);
      const q = cols.map((c) => (c === pred ? 0.6 : 0) + 0.4 / cols.length);
      const ev = M.map((r) => r.reduce((a, v, j) => a + v * q[j], 0));
      // blend: best response to the model, but never pick a row much worse than the Nash safety level
      const nashVal = Math.min(...cols.map((_, j) => M.reduce((a, r, i) => a + r[j] * row[i], 0)));
      let bi = -1; ev.forEach((v, i) => { const worst = Math.min(...M[i]); if ((bi < 0 || v > ev[bi]) && (worst >= nashVal - 0.6 || v >= 40)) bi = i; }); // a likely win is never vetoed
      if (bi < 0) bi = ev.indexOf(Math.max(...ev));
      row = row.map((_, i) => (i === bi ? 1 : 0));
    }
    // drop near-zero weights, then sample deterministically from the state
    const cleaned = row.map((p) => (p < 0.08 ? 0 : p));
    const s = cleaned.reduce((a, b) => a + b, 0);
    const probs = cleaned.map((p) => p / s);
    let h = 2166136261;
    for (const ch of snap.slice(-400) + root.turn) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    let x = (h % 10000) / 10000, pick = 0;
    for (; pick < probs.length - 1; pick++) { x -= probs[pick]; if (x < 0) break; }
    return {choice: mine[pick], options: mine, probs, cols, colProbs: col, sims};
  }

  (self.window || self).AI = {decide, evaluate, options, greedy, setDepth: (d) => { DEPTH = d; }, setRace: (w) => { RACE_W = w; }, setMode: (m) => { MODE = m; }};
})();
