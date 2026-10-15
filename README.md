# Champion Daily

A daily Pokémon battle challenge in the browser. Every day, everyone gets the same random team and the same opponents:

- **Champion Cynthia** in her Platinum team under Gen 4 rules
- **Lorekeeper Zinnia** in her Sky Pillar team under Gen 6 rules, with Mega Evolution
- **The Elite Four** under Gen 9 rules: four type specialists drawn daily from every region, fought back to back

Plus the **Battle Factory**, which has no daily limit: pick a tier, rent 3 of 6 Pokémon from Showdown's Gen 9 Battle Factory sets, battle 3v3 and swap after every win to build a streak.

You get one recorded attempt per daily mode each day, then practice as much as you like. Opponents are played by a search AI that simulates every option in the real battle engine.

Inspired by [Daily Red Game](https://dailyredgame.org/) and [amoi-builds' original Daily Red](https://github.com/amoi-builds/dailyred).

## Run it locally

The game is a static site, but it has to be served over HTTP. Opening `index.html` directly from disk breaks the AI's Web Worker.

You need [Node.js](https://nodejs.org/) (any recent LTS). From this folder:

```
npx serve
```

Open the `http://localhost:...` address it prints. Any static server works, for example `python -m http.server`.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**. Set the source to **Deploy from a branch**, choose `main`, and select the `/ (root)` folder.
3. The game will be at `https://<you>.github.io/<repo>/` within a minute or two.

There's no build step. The engine bundle is committed in `vendor/`.

## Project layout

```
index.html          page shell
styles.css          all styles (one section per battle skin)
src/
  core.js           teams, champions, battle setup, battle text
  e4.js             Elite Four pool, daily lineup, team generator
  factory.js        Battle Factory rentals, opponents, hints
  art.js            original Pokémon art, generated per species
  scenes.js         battle backgrounds and player trainers
  ai.js             opponent search AI
  ai-worker.js      runs the AI off the main thread
  app.js            UI: menus, lobbies, battle screen, settings, audio
vendor/sim.js       Pokémon Showdown engine bundle (prebuilt)
vendor/factory-sets.js  Showdown's Gen 9 Battle Factory sets (tools/update-factory-sets.sh)
build/              rebuilds vendor/sim.js
tools/              headless AI benchmarks; art.html is a gallery of every Pokémon's art
docs/PRD.md         product requirements: what the game is and why
docs/ROADMAP.md     planned work
```

## Rebuilding the engine

You only need this when upgrading `@pkmn/sim` or `@pkmn/randoms`:

```
cd build
npm install
npm run build:engine
```

This writes `vendor/sim.js`. Keep the `--keep-names` flag in the build script. The AI clones battles with `Battle.toJSON/fromJSON`, which needs class names to survive minification.

## AI benchmarks

These run real battles headlessly in Node:

```
node tools/bench.js cynthia 10         # greedy bot vs Cynthia's search AI, 10 battles
node tools/bench.js zinnia 10 100 --old # same, but against the simple heuristic AI
node tools/bench.js e4-lance 5         # any Elite Four member: e4-<id>
node tools/ko-check.js                 # does the AI take obvious last-Pokémon KOs?
```

## How the daily works

- The day rolls over at local midnight.
- Every team, the Elite Four lineup and each battle's random seed are derived from the date, so everyone gets the same content.
- Your progress is saved as a log of your choices in `localStorage` and replayed on load. You can close the tab mid-battle and pick up where you left off.

## Teams, levels and Tera Blast

**Your team** comes from Pokémon Showdown's Random Battle generator for the opponent's generation: Gen 4 for Cynthia, Gen 6 for Zinnia and Gen 9 for the Elite Four. The sets are Showdown's, unchanged except for the Tera rule below.

- **Moves, items, abilities and natures** are Showdown's curated sets for each Pokémon and role.
- **Levels** are Showdown's balance levels, roughly 65–100. Strong Pokémon get lower levels and weak ones higher, so every team is about equally strong. We keep these levels rather than raising everything to 100, because flattening them would make some days much luckier than others.
- **EVs** are 85 in every stat and IVs are 31. That's Showdown's Random Battle convention, not a hand-tuned spread.

**Tera Blast is removed.** Terastallization is off in every mode, so Showdown's Gen 9 sets built around Tera Blast don't work. All 37 of them belong to one role, "Tera Blast user". We drop that role before generating teams, and the generator picks one of that Pokémon's other Showdown sets instead. Every affected Pokémon has at least one other set, so nothing is lost. This applies to your Gen 9 team and to the Elite Four's teams. The code is `generator()` in `src/core.js`.

**Opponents:**
- **Cynthia and Zinnia** use their in-game teams with hand-written competitive sets: 252/252 EV spreads and fitting natures and items.
- **Elite Four members** use Showdown Gen 9 sets of their type, plus their signature ace.
- **Opponent levels:** every opponent's team is Lv88 with the ace at Lv92, the games' pattern of one team level plus a stronger ace. That's a few levels above the player's average Showdown level of about 83, so the champion is the favorite. The constant is `OPP_LEVEL` in `src/core.js`.

## Credits

- Battle engine: [@pkmn/sim](https://github.com/pkmn/ps), from the [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) simulator (MIT).
- Random Battle sets: @pkmn/randoms (MIT).
- Battle Factory sets: Pokémon Showdown's `data/random-battles/gen9/factory-sets.json` (MIT).
- Font: Pixelify Sans (SIL Open Font License), loaded from Google Fonts.
- Pokémon and trainer sprites: linked at runtime from Pokémon Showdown's sprite server, not stored in this repo (© Nintendo, Creatures, GAME FREAK). Settings can switch to the original drawn art in `src/art.js`, which is also the fallback when a sprite fails to load.
- Backgrounds and trainers: original, drawn in code.
- Music: official themes through YouTube embeds and Showdown's battle music by link (nothing stored here), with original browser-generated chiptunes as choices and fallback.

See [THIRD_PARTY.md](THIRD_PARTY.md).

Unofficial fan project. Not affiliated with or endorsed by Nintendo, Creatures Inc., GAME FREAK inc. or The Pokémon Company.
