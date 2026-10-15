# Champion Daily: Product Requirements

Status: living document. Last updated 2026-10-14.

## 1. Summary

Champion Daily is a free, browser-based daily Pokémon battle challenge. Every calendar day, every player gets the same random team and faces the same opponents. Each player gets one recorded attempt per mode per day, and can practice as much as they like after that.

The game has three modes:

| Mode | Opponent | Rules | Format |
|---|---|---|---|
| Cynthia | Champion Cynthia, Platinum team | Gen 4 | One battle |
| Zinnia | Lorekeeper Zinnia, ORAS Sky Pillar team | Gen 6 | One battle |
| Elite Four | Four type specialists drawn daily from every generation | Gen 9 | Four battles in a row |

## 2. Inspiration

- [Daily Red Game](https://dailyredgame.org/) is a Wordle-style daily battle against Red under Gen 3 rules. It is the direct model for the daily loop, the shared seed and the result sharing. Its credits are at [dailyredgame.org/credits](https://dailyredgame.org/credits).
- Daily Red Game credits [amoi-builds' original Daily Red project](https://github.com/amoi-builds/dailyred).

Where Champion Daily differs:
- multiple champions, each in their own generation's rules
- an Elite Four gauntlet
- an opponent AI that searches with the real engine
- a different UI for each generation

## 3. Goals and non-goals

**Goals**
- Give players a short, fair, shareable daily challenge with real competitive mechanics.
- Make opponents play well: they switch, set up and take knockouts.
- Make it work well on phones and desktops.
- Run as a fully static site, with no backend required.

**Non-goals for now**
- Accounts or server-side saves. Progress lives in the browser.
- Online player-vs-player play.
- Any official Nintendo/Game Freak assets in the shipped build: sprites, music or trainer art (see section 10).

## 4. Daily model

- The day rolls over at local midnight. The date key is `YYYY-MM-DD` in the player's local time.
- All randomness is seeded from the date and the mode, so everyone gets identical content on the same date:
  - player teams
  - the Elite Four lineup and the Elite Four teams
  - each battle's random seed
- The player's team is generated independently for each mode: Cynthia uses Gen 4 sets, Zinnia Gen 6 and the Elite Four Gen 9.
- Battles are deterministic, given the seed and the choices made. A run is stored as a log of choices and replayed on load, so a player can close the tab mid-battle and resume exactly where they left off.
- Day number: 2026-10-14 is Day 1.
- Saved runs carry a rules version. When teams, levels or battle rules change, the version is bumped, and any unfinished run from older rules restarts cleanly instead of replaying into a different battle. Finished results and records are kept.
- There is one difficulty only. The player's Pokémon keep Showdown's Random Battle balance levels (roughly 65–100). Every opponent (Cynthia, Zinnia and each Elite Four member) fights at Lv88 with their ace at Lv92. That mirrors the games' pattern of one team level plus a higher ace, and sits a few levels above the player's average of about Lv83 so the champion has a boss edge. Their competitive 252/252 EV spreads add to that edge.
- Terastallization is off in every mode. Gen 9 "Tera Blast user" sets are skipped, and the generator uses that Pokémon's other Showdown sets.

## 5. Modes

### 5.1 Cynthia (Gen 4)

- Rules are Gen 4 (Diamond/Pearl/Platinum) via the Showdown engine: the physical/special split, Gen 4 items and abilities, and no Fairy type.
- Player team: 6 sets from Showdown's Gen 4 Random Battle pool, at Showdown's levels. The player picks a lead before the battle.
- Cynthia's team is fixed to her Platinum team, in game order: Spiritomb (lead), Roserade, Togekiss, Lucario, Milotic, Garchomp (ace).
- Every Pokémon holds a relevant item:
  - Spiritomb: Leftovers
  - Roserade: Black Sludge
  - Togekiss: Leftovers
  - Lucario: Life Orb
  - Milotic: Leftovers
  - Garchomp: Yache Berry
- There is no item clause.
- UI skin: DS-era (DPPt) look. Pixel font, uppercase FIGHT/BAG/POKéMON/RUN, and an oval Fight button.

### 5.2 Zinnia (Gen 6)

- Rules are Gen 6 (ORAS): Fairy type, the Gen 6 type chart and Mega Evolution.
- Player team: 6 sets from Showdown's Gen 6 Random Battle pool, at Showdown's levels. The sets may include Mega Stones. When one is held, a Mega Evolution toggle appears in the Fight menu, once per battle.
- Zinnia's team is fixed to her Sky Pillar team, in game order plus Flygon: Goodra (lead), Tyrantrum, Altaria, Noivern, Flygon, Salamence (ace). Her ace holds Salamencite and Mega Evolves.
  - In the game she battles with 5. Flygon, the Hoenn dragon, is added before her ace to make a full 6.
  - Items: Goodra Assault Vest, Tyrantrum Choice Band, Altaria Leftovers, Noivern Choice Specs, Salamence Salamencite.
- UI skin: ORAS-inspired look. Bright sky and grass arena, dark glassy info panels, rounded type-colored move buttons, and a sans-serif UI font.

### 5.3 Elite Four (Gen 9)

**Rules**
- Gen 9 mechanics, with no Terastallization, Mega Evolution or Z-Moves.

**Lineup**
1. Seeded by the date, draw 4 distinct types from the pool of types the trainers cover.
2. For each type, pick one trainer at random from every Elite Four member and type-specialist Champion across all generations who uses it.
3. Champions fight last.

The pool has 39 trainers covering 15 types: Ghost, Ice, Fighting, Dragon, Psychic, Poison, Dark, Steel, Water, Bug, Ground, Fire, Rock, Flying and Fairy.

Each trainer keeps their original type theme and their signature ace.
- Lance uses his signature lineup instead of a daily type draw: Gyarados, Aerodactyl and Charizard from his HeartGold/SoulSilver team, plus Salamence and Garchomp from his rematch team. Dragonite is his ace. They use Showdown Gen 9 sets; Aerodactyl has no Gen 9 set, so it gets a hand-built one.
- Some aces aren't the trainer's type. For example, Lacey's ace is Excadrill and Drayton's is Archaludon. The ace is kept anyway.

**Trainer teams**
- The other five Pokémon are a fresh daily draw of Gen 9 Random Battle sets of the trainer's type.
- Restricted legendaries, sub-legendaries, mythicals and Paradox Pokémon are excluded. The DLC Paradoxes aren't tagged in Showdown's data, so they're excluded by name.
- No Pokémon line is repeated within a team.
- Aces that have no Gen 9 Random Battle set get hand-built sets: Machamp, Xatu, Crobat, Absol, Dusclops, Walrein, Drapion, Barbaracle and Aegislash.

**Player team**
- One Gen 9 Random Battle team for all four fights, fully healed between battles.

**Run structure**
- Four separate battles in order.
- Win, and the next trainer is shown with a "your team has been fully healed" interstitial.
- The interstitial has a View team button that opens the next member's full team sheet; Back returns to the interstitial with the lead choice kept.
- The player picks their lead before each fight: in the lobby before the first, and on the interstitial (or the lobby) before the rest. Each fight stores its own lead, which locks once that fight's first turn is played.
- Lose once, and the day's run is over. The record stores who stopped the player and at which battle.
- After a loss, the player can continue in practice from the fight they lost. After a clear, they can do a practice run. Practice is never recorded.
- Practice in every mode uses today's team with a fresh random seed. Once today's battle is over, the lobby's team grid picks the practice lead and the practice button starts straight away. Starting practice from a result screen opens a lead picker instead. Practice is never recorded.
- Result screens show which Pokémon the player led with; the Elite Four summary shows the lead for each fight.

**Records**
- Runs cleared, runs failed, win streak and best streak.
- The streak counts consecutive recorded wins. A loss resets it; a missed day doesn't.

**Share text** looks like this:

```
Champion Daily #1 · Elite Four
🟩🟩🟥⬛ Stopped by Lacey (3/4)
Poppy · Olivia · Lacey · Lucian
```

**UI skin**
- Gen 9-inspired: a pastel arena, pill-shaped white info panels, and pill buttons.

## 6. Opponent AI

**Goal:** play to win. The AI should take knockouts, switch out of losing matchups, set up when safe and Mega Evolve when able.

**Algorithm** (`src/ai.js`):
1. List every legal option for the opponent: moves (with Mega when available) and switches. Do the same for the player.
2. For each opponent option × player option, clone the real battle state and simulate one turn in the engine. Damage-roll moves get two random rolls, and forced replacements are resolved greedily.
3. Score each resulting state:
   - material: alive Pokémon and HP
   - status penalties
   - stat boosts
   - entry hazards
   - a "who wins the current 1v1" race term
   - a win scores +100 and a loss −100
4. Solve the resulting payoff matrix for its Nash equilibrium as a safety baseline.
5. Then predict the player's most likely move (greedy best damage) and pick the best response to that prediction.
6. Reject any option whose worst case is far below the Nash safety level, unless it is a likely win. A winning knockout is never vetoed.

**Runtime**
- The AI runs in a Web Worker. It starts computing while the player is still choosing, so there is no visible wait.
- It falls back to the main thread if Workers are unavailable, and to a simple heuristic on error.

**Measured**
- In local tests, a greedy test bot's win rate dropped from 77% to 45% against Cynthia, compared with the original heuristic AI. That test ran at Lv80.
- The AI took 22 of 23 clear last-Pokémon knockouts. The one exception was a correct defensive switch.

**Information**
- The AI knows the player's sets, and the player can see the opponent's full sets. Both sides have full information.

**Known limits**
- The AI only looks one turn ahead, so it misses multi-turn setups.
- Deeper search was too slow on phones.
- My first pure worst-case (Nash-only) version was too passive.

## 7. UI and UX

**Views**
- Main menu: three opponent cards with today's status.
- Opponent lobby.
- Elite Four lineup screen.
- Battle.
- About page.
- Settings, shown as a modal.

**Main menu**
- Each card shows the generation badge, location, the opponent's team art (or today's four Elite Four trainers with their types), today's status and a button to battle.

**Lobby**
- Today's player team, with lead selection.
- The opponent's team with lead and ace tags, plus a "Full sets & stats" viewer.
- Records, the countdown to the next day, and the rules.

**Team viewer**
- Has a tab per Pokémon showing:
  - item, ability and nature (with the boosted and lowered stats highlighted)
  - calculated stats with EVs
  - every move with type, category, power, accuracy, PP and description
- During battle it also shows current HP and status, marks the active Pokémon, and dims fainted ones.
- It opens from the lobby, from the in-battle team button, or by tapping the opponent's HP box or party balls.

**Battle screen**
- A two-screen handheld layout: the battle scene on top and the touch menu below.
- Fight, Pokémon, Run (forfeit) and Bag (disabled; there are no items).
- Text box with typewriter text; tap to skip.
- HP bars animate, with exact HP numbers shown on the player's side.
- Gen-appropriate battle text, such as "The foe's…" in Gen 4 and "The opposing…" in Gen 6 and 9.
- Keyboard: keys 1–4 pick moves, Esc closes panels.

**Pokémon visuals**
- By default, Pokémon are shown with official sprites linked at runtime from Pokémon Showdown's sprite server; nothing is stored in the repo. Each battle style uses its era's set (Gen 3 → `gen3`, Gen 4 → `gen4`, Gen 6 and Gen 9 → animated `ani`), falling back to newer sets and finally to the drawn art. Back sprites are used for the player's side, and thumbnails use `gen5`. Settings → Pokémon art switches to the drawn art.
- The drawn art is original, generated in code (`src/art.js`). Its egg groups pick a body plan (four-legged, upright, bird, fish, serpent and so on), its Pokédex color and types set the palette, its types add features (flames, wings, fins, crystals, horns), and its height sets the size. A table of overrides fixes species whose egg groups give the wrong shape. Mega forms get a colored halo and a spiked back. Other forms are drawn distinct from their base: a form that adds a type shifts its color toward that type, regional forms get a region pattern (Alolan flower, Galarian stripes, Hisuian rune marks, Paldean band), and the rest get an emblem. The player's Pokémon is drawn mirrored without a face, as a back view. No official sprites are used. `tools/art.html` shows a gallery of every species.

**Battle style**
- Players pick the battle screen's look in Settings before entering a battle. Each lobby shows the current style next to the start button, and tapping it opens Settings.
- Options:
  - **Default:** each opponent's own generation (Cynthia Gen 4, Zinnia Gen 6, Elite Four Gen 9).
  - **Gen 3:** GBA-style field, cream info boxes, slate text bar and a white command box with a ▶ cursor.
  - **Gen 4:** the DPPt-style skin.
  - **Gen 6:** the ORAS-style skin.
- The style is cosmetic only. Rules and battle text still follow the opponent's generation.
- Gen 3 and Gen 4 draw the Pokémon art with hard pixel edges.

**Backgrounds and trainers** (`src/scenes.js`, original, drawn in code)
- The background is the opponent's location, whatever the style: a champion's chamber for Cynthia, the Sky Pillar summit for Zinnia, and a league stadium for the Elite Four with the court in the member's type color.
- The battle intro shows the player's trainer (Lucas/Dawn, Brendan/May, Florian/Juliana, by the Player setting) and the opponent on their platforms, then both step away as the leads are sent out. The lobby shows the opponent, the style button shows the player, and the Elite Four lineup shows each member.
- With Settings → Art on official sprites (the default), trainers are Showdown trainer sprites linked at runtime: `lucas-gen4pt`/`dawn-gen4pt`, `brendan`/`may` (ORAS), `florian-s`/`juliana-s`, and each opponent's battle-style era variant where one exists (`cynthia-gen4`, `agatha-gen3`...). With drawn art, the player uses the original drawn trainers and opponents are not drawn.

**Encounter intros** (`src/intro.js`, one per battle style; tap to skip, off with reduced motion)
- Gen 3: black bars sweep in, then an Emerald-style League strip slides in with both trainers and the opponent's title.
- Gen 4: the DPPt League mugshot: a band slides in with the opponent and their title on black.
- Gen 6: an ORAS VS screen, player left and opponent right, with VS slamming in.
- Gen 9: a white flash into a spinning burst with the opponent's card.
- Then both trainers walk onto their platforms (slide in for Gen 3/4, pop in for Gen 6/9), the challenge line plays, and they step away as the leads come out.

**Battle info on hover**
- Like Showdown, hovering a Pokémon in battle shows a tooltip: name, level, types, HP (% for both sides, plus exact HP for the player's), status, held item, ability, stats with stat-stage boosts, and each move with its remaining PP.
- It works on both active Pokémon (sprite or HP box), the team balls, and the party menu. On touch screens, long-press instead; a long-press doesn't also count as a tap.
- The opponent's info is shown in full, matching the open team sheets.
- The tooltip stays live while open: HP drains as the bar animates. Stats show their effective value with the stage applied, green and +N when raised, red and -N when lowered (-6 to +6).
- Under each HP box, Showdown-style chips list non-zero stat stages, volatile effects (Confused, Substitute, Leech Seed, Taunt, Perish N...) and that side's conditions (Stealth Rock, Spikes ×2, Reflect, Tailwind...). They update when a turn's text finishes, so they never run ahead of the battle text.

**Responsive**
- One layout for every battle style, like a DS: the battle screen on top and the menu screen below, both 4:3 and the same width. Screens never sit side by side.
- The console scales to fit the window height (up to 600px wide), so a battle fits without scrolling on desktop.
- The YouTube "Now playing" box sits at the bottom right on wide windows (1120px+) and below the console otherwise.
- Type sizes use container query units, so text scales with the screen.

**About page**
- Covers what the game is, the inspiration (linking Daily Red Game and amoi-builds), how it's built, credits and the fan disclaimer.

## 8. Audio and settings

**Settings modal**
- Player (Display section): Male or Female. You play as the protagonist of the opponent's game: Lucas/Dawn against Cynthia, Brendan/May against Zinnia and Florian/Juliana in the Elite Four. For now this changes only the name in the battle intro, the battle header and the lobby. Character art is on the roadmap.
- Battle style (Display section): Default, Gen 3, Gen 4 or Gen 6. See below.
- Mute everything.
- Music volume.
- Menu sounds on/off.
- Text speed: normal or fast.

**Music** (Settings → Music)
- **Battle theme:** Default, or any track below for every battle. Default plays each opponent's own theme: Cynthia's "Battle! Champion" (Diamond & Pearl), "Battle! Zinnia" (ORAS), and for each Elite Four member their debut generation's Elite Four music (Gen 1–3 Elite Fours used the Gym Leader theme; Blueberry League members get theirs from The Indigo Disk).
- **Menu music:** defaults to Lilycove City (Ruby, Sapphire & Emerald).
- **In battle:** the ♪ Music button changes the current battle's track, with an option to keep it for every battle, plus volume.
- Victory and defeat use the built-in jingles. There is no last-Pokémon theme switch.

**Sources**
- Official themes play through YouTube's embedded player, shown in a "Now playing" box below the battle screen (YouTube requires a visible player of at least 200×200). Cynthia's and the Gen 4 Elite Four theme come from the official Pokémon DP Sound Library channel; the rest are fan uploads, which can disappear.
- Showdown's battle music (per-generation trainer and rival themes) is hotlinked from `play.pokemonshowdown.com/audio`.
- Original WebAudio chiptunes remain as choices and as the fallback whenever YouTube is blocked or a video fails.

**Your tracks**
- Players can add their own audio files, name them, and pick them as the battle theme or menu music.
- Files are stored in IndexedDB in their browser only.

**Persistence**
- Settings, records and in-progress runs live in `localStorage` under `champdaily:v2`.

## 9. Tech

- **Engine:** [@pkmn/sim](https://github.com/pkmn/ps), the Pokémon Showdown simulator (MIT), and @pkmn/randoms for Random Battle sets. They are bundled with esbuild into one browser script. `--keep-names` is required, or battle cloning breaks.
- **Static site:** HTML, CSS and vanilla JS with no framework (`index.html`, `styles.css`, `src/`). It works on GitHub Pages. It must be served over HTTP, not opened from `file://`, because the AI Web Worker needs it.
- **Battle setup:** Gen 5+ formats skip team preview, with the lead chosen by team order.
- **Bundle size:** about 7.3 MB minified for the engine.

## 10. Constraints and decisions

- **No official assets in the repo.** Official sprites, music and trainer art belong to Nintendo, Creatures and GAME FREAK. The repo contains only original art, music and code. Official sprites and Showdown's music are linked from Pokémon Showdown at runtime, and official themes play through YouTube embeds, a choice the project owner made accepting the takedown risk. The drawn art stays as the fallback and as a setting.
- **Fixed champion teams:** Cynthia and Zinnia use their real in-game teams every day. This is faithful, but the teams are public and the same every day, so players can plan counters. The Elite Four's daily variety offsets this.
- **One difficulty:** Easy and Hard were removed. Player teams use Showdown's balance levels rather than a flat Lv100, so each day's team is about equally strong.

## 11. Roadmap

1. **Better music.** Richer original compositions (more voices, drums, a theme per opponent and per generation), crossfades between battle and pinch themes, and sound effects per move category.
2. **Sprites and art.** Improve the generated Pokémon art: more body-plan overrides, hand-drawn art for the opponents' signature Pokémon, and attack and faint animations. Any other art must be original or properly licensed.
3. **Smarter AI.** Two-turn search with pruning, and a better evaluation of setup, hazards and speed control. Tune it against a benchmark suite (`tools/`).
4. **More opponents.** Other champions, each in their own generation's rules.

**Later, not scheduled:** Champions-style Megas in the Elite Four (player and opponents), draft mode, leaderboards. See ROADMAP.md.

## 12. Open questions

- Sprite licensing: what source, under what license, if any?
