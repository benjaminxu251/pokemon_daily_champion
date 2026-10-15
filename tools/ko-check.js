// Regression check: when the player is down to one Pokémon and the AI has an obvious knockout, does it attack?
// Usage: node tools/ko-check.js [battles per opponent=10]
const {Core, AI} = require('./_load');
const n = +(process.argv[2] || 10);
let spots = 0, attacked = 0;
for (const id of ['cynthia', 'zinnia']) {
  const o = Core.OPP[id];
  for (let k = 0; k < n; k++) {
    const seed = 'ko' + k;
    const b = Core.newBattle(seed, Core.playerTeam(seed, o), 0, 100, o);
    let guard = 0;
    while (!b.ended && guard++ < 250) {
      Core.act(b, AI.greedy(b, 'p1'), (bb) => {
        const r = AI.decide(bb.toJSON());
        if (bb.p1.pokemon.filter((p) => !p.fainted).length === 1 && !bb.p2.activeRequest.forceSwitch) {
          const me = bb.p2.active[0], foe = bb.p1.active[0];
          const ko = bb.p2.activeRequest.active[0].moves.some((m) => !m.disabled && Core.estDamage(me, foe, m.id) >= 1.3);
          if (ko) { spots++; if (r.choice.startsWith('move')) attacked++; else console.log(`${o.name} switched with a KO available: ${me.species.name} vs ${foe.species.name}`); }
        }
        return r.choice;
      });
    }
  }
}
console.log(`clear knockout spots: ${spots}, attacked: ${attacked}`);
