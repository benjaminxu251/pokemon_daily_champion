// Win rate of a simple greedy bot (always picks its highest-damage move) against an opponent's AI.
// Usage: node tools/bench.js <cynthia|zinnia|e4-<member>> [battles=10] [level=100] [--old]
//   --old uses the simple heuristic AI instead of the search AI, for comparison.
const {Core, AI, E4} = require('./_load');
const [who = 'cynthia', nArg = '10', lvArg = '100'] = process.argv.slice(2);
const useOld = process.argv.includes('--old');
const n = +nArg, level = +lvArg;
let opp, foe;
if (who.startsWith('e4-')) { const m = E4.MEMBERS.find((x) => x.id === who.slice(3)); opp = E4.asOpp(m); foe = (seed) => E4.team(seed, m); }
else { opp = Core.OPP[who]; foe = (seed) => Core.oppTeam(seed, opp); }
const player = opp.member ? E4.PLAYER : opp;
const times = [];
const ai = useOld ? null : (b) => { const t = performance.now(); const c = AI.decide(b.toJSON()).choice; times.push(performance.now() - t); return c; };
let wins = 0, turns = 0;
for (let k = 0; k < n; k++) {
  const seed = 'bench' + k;
  const b = Core.newBattle(seed, Core.playerTeam(seed, player), 0, level, opp, foe(seed));
  let guard = 0;
  while (!b.ended && guard++ < 300) Core.act(b, AI.greedy(b, 'p1'), ai);
  if (b.winner === 'You') wins++;
  turns += b.turn;
  console.log(`battle ${k + 1}: ${b.winner} won in ${b.turn} turns`);
}
times.sort((a, b) => a - b);
console.log(`\n${opp.title}, Lv${level}, ${useOld ? 'heuristic' : 'search'} AI: greedy bot won ${wins}/${n}, avg ${(turns / n).toFixed(1)} turns` +
  (times.length ? `, AI decision median ${times[times.length >> 1].toFixed(0)} ms, p95 ${times[Math.floor(times.length * 0.95)].toFixed(0)} ms` : ''));
