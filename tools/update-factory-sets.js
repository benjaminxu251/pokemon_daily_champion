// Rebuilds vendor/factory-sets.js from Pokémon Showdown's Gen 9 Battle Factory sets (MIT).
// Terastallization is off in this game, so every Tera Blast is replaced with that Pokémon's most-used move
// in its tier (Smogon usage stats, 1500 cut) that the set doesn't already have.
// Usage: node tools/update-factory-sets.js [YYYY-MM]   (defaults to the latest stats month)
const fs = require('fs');
const path = require('path');
const {Core} = require('./_load');

const SETS_URL = 'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/random-battles/gen9/factory-sets.json';
const COMMIT_URL = 'https://api.github.com/repos/smogon/pokemon-showdown/commits?path=data/random-battles/gen9/factory-sets.json&per_page=1';
const STATS_TIER = {Uber: 'gen9ubers', OU: 'gen9ou', UU: 'gen9uu', RU: 'gen9ru', NU: 'gen9nu', PU: 'gen9pu'};
const CUT = 1500;

async function get(url, json = true) {
  const r = await fetch(url, {headers: {'User-Agent': 'champion-daily-tools'}});
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return json ? r.json() : r.text();
}

(async () => {
  const dex = Core.dexFor(9);
  const id = (s) => dex.moves.get(s).id;
  const month = process.argv[2] || (await get('https://www.smogon.com/stats/', false)).match(/\d{4}-\d{2}(?=\/")/g).sort().pop();
  const sha = (await get(COMMIT_URL))[0].sha.slice(0, 10);
  const sets = await get(SETS_URL);
  const usage = {};
  for (const [tier, f] of Object.entries(STATS_TIER)) {
    console.log(`stats ${month} ${f}-${CUT}`);
    usage[tier] = (await get(`https://www.smogon.com/stats/${month}/chaos/${f}-${CUT}.json`)).data;
  }
  // A species' move usage: its own tier first, then any tier, then its other factory sets.
  const movesFor = (tier, species, d) => {
    const own = usage[tier][species] || Object.values(usage).map((u) => u[species]).find(Boolean);
    if (own) return Object.entries(own.Moves).sort((a, b) => b[1] - a[1]).map(([m]) => m);
    const count = {};
    for (const s of d.sets) for (const slot of s.moves) for (const m of slot) count[id(m)] = (count[id(m)] || 0) + 1;
    return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  };
  let n = 0;
  for (const [tier, pool] of Object.entries(sets)) {
    for (const [, d] of Object.entries(pool)) {
      for (const set of d.sets) {
        set.moves.forEach((slot, j) => {
          if (!slot.some((m) => id(m) === 'terablast')) return;
          const rest = slot.filter((m) => id(m) !== 'terablast');
          if (rest.length) { set.moves[j] = rest; return; }
          const have = new Set(set.moves.flat().map(id));
          const ok = movesFor(tier, set.species, d).filter((m) => m && m !== 'nothing' && m !== 'terablast' && !have.has(m) && dex.moves.get(m).exists);
          // Choice-locked sets want an attack in that slot, not a status move.
          const choice = set.item.every((i) => /^Choice /.test(i));
          const pick = (choice && ok.find((m) => dex.moves.get(m).category !== 'Status')) || ok[0];
          if (!pick) throw new Error(`no replacement for Tera Blast on ${tier} ${set.species}`);
          set.moves[j] = [dex.moves.get(pick).name];
          n++;
          console.log(`${tier} ${set.species}: Tera Blast -> ${dex.moves.get(pick).name}`);
        });
      }
    }
  }
  const out = path.join(__dirname, '..', 'vendor', 'factory-sets.js');
  fs.writeFileSync(out, `// Pokémon Showdown [Gen 9] Battle Factory sets, data/random-battles/gen9/factory-sets.json at smogon/pokemon-showdown@${sha} (MIT).\n` +
    `// Tera Blast (${n} slots) replaced with each Pokémon's most-used other move in its tier, Smogon usage stats ${month}, ${CUT} cut.\n` +
    `// Regenerate with: node tools/update-factory-sets.js\nwindow.FACTORY_SETS = ${JSON.stringify(sets)};\n`);
  console.log(`wrote ${out}: ${n} Tera Blast slots replaced`);
})().catch((e) => { console.error(e); process.exit(1); });
