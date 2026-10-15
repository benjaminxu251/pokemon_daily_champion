#!/usr/bin/env bash
# Refreshes vendor/factory-sets.js from Pokémon Showdown's Gen 9 Battle Factory sets (MIT).
set -euo pipefail
cd "$(dirname "$0")/.."
url=https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/random-battles/gen9/factory-sets.json
sha=$(curl -fsS "https://api.github.com/repos/smogon/pokemon-showdown/commits?path=data/random-battles/gen9/factory-sets.json&per_page=1" | node -e "let s='';process.stdin.on('data',(d)=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].sha.slice(0,10)))")
curl -fsS "$url" | node -e "
let s=''; process.stdin.on('data', (d) => s += d).on('end', () => {
  const sets = JSON.parse(s);
  require('fs').writeFileSync('vendor/factory-sets.js',
    '// Pokémon Showdown [Gen 9] Battle Factory sets, data/random-battles/gen9/factory-sets.json at smogon/pokemon-showdown@$sha (MIT).\n' +
    '// Regenerate with tools/update-factory-sets.sh.\nwindow.FACTORY_SETS = ' + JSON.stringify(sets) + ';\n');
});"
echo "vendor/factory-sets.js updated to $sha"
