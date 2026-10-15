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
- Zinnia's team is fixed to her Sky Pillar team, in game order: Goodra (lead), Tyrantrum, Altaria, Noivern, Salamence (ace). Her ace holds Salamencite and Mega Evolves.
  - She has 5 Pokémon, matching the game. Her Whismur, Aster, travels with her but never battles.
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
- Restricted legendaries, sub-legendaries and mythicals are excluded.
- No Pokémon line is repeated within a team.
- Aces that have no Gen 9 Random Battle set get hand-built sets: Machamp, Xatu, Crobat, Absol, Dusclops, Walrein, Drapion, Barbaracle and Aegislash.

**Player team**
- One Gen 9 Random Battle team for all four fights, fully healed between battles.

**Run structure**
- Four separate battles in order.
- Win, and the next trainer is shown with a "your team has been fully healed" interstitial.
- Lose once, and the day's run is over. The record stores who stopped the player and at which battle.
- After a loss, the player can continue in practice from the fight they lost. After a clear, they can do a practice run. Practice is never recorded.

**Records**
- Runs cleared, runs failed, win streak and best streak.

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
- Each card shows the generation badge, location, the opponent's team glyphs (or today's four Elite Four trainers with their types), today's status and a button to battle.

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
- Each Pokémon is drawn as an original "stat glyph": a hexagon shaped by its base stats and filled with its type colors. Mega forms get an outline ring. No official sprites are used.

**Battle style**
- Players pick the battle screen's look in Settings before entering a battle. Each lobby shows the current style next to the start button, and tapping it opens Settings.
- Options:
  - **Default:** each opponent's own generation (Cynthia Gen 4, Zinnia Gen 6, Elite Four Gen 9).
  - **Gen 3:** GBA-style field, cream info boxes, slate text bar and a white command box with a ▶ cursor.
  - **Gen 4:** the DPPt-style skin.
  - **Gen 6:** the ORAS-style skin.
- The style is cosmetic only. Rules and battle text still follow the opponent's generation.
- Gen 3 and Gen 4 draw the glyphs with hard pixel edges.

**Responsive**
- Phones (portrait): the screens stack. The device is sized to fit the viewport height.
- Desktop or landscape (≥820px wide and wider than 5:4): the screens sit side by side, the scene at about 60% width and the menu beside it.
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

**Music slots**, each set with a dropdown and a preview button:
- Menus
- Cynthia battle
- Zinnia battle
- Elite Four battle
- Her last Pokémon (the pinch theme)
- Victory
- Defeat

**Built-in tracks** are original WebAudio chiptunes, defaulting to:
- Cynthia: "Champion's Hall"
- Zinnia: "Pillar Wind"
- Elite Four: "League Gauntlet"
- plus a menu theme, a last-Pokémon theme, and victory and defeat jingles

**Your tracks**
- Players can add their own audio files, name them, and pick them in any slot.
- Files are stored in IndexedDB in their browser only.

**Persistence**
- Settings, records and in-progress runs live in `localStorage` under `champdaily:v2`.

## 9. Tech

- **Engine:** [@pkmn/sim](https://github.com/pkmn/ps), the Pokémon Showdown simulator (MIT), and @pkmn/randoms for Random Battle sets. They are bundled with esbuild into one browser script. `--keep-names` is required, or battle cloning breaks.
- **Static site:** HTML, CSS and vanilla JS with no framework (`index.html`, `styles.css`, `src/`). It works on GitHub Pages. It must be served over HTTP, not opened from `file://`, because the AI Web Worker needs it.
- **Battle setup:** Gen 5+ formats skip team preview, with the lead chosen by team order.
- **Bundle size:** about 7.3 MB minified for the engine.

## 10. Constraints and decisions

- **No official assets in the shipped build.** Official sprites, music and trainer art belong to Nintendo, Creatures and GAME FREAK. Daily Red Game uses sprites from the PokeAPI repository, but those carry no license for the art itself. Champion Daily uses original glyphs, original music and a user-supplied audio library instead.
- **Fixed champion teams:** Cynthia and Zinnia use their real in-game teams every day. This is faithful, but the teams are public and the same every day, so players can plan counters. The Elite Four's daily variety offsets this.
- **One difficulty:** Easy and Hard were removed. Player teams use Showdown's balance levels rather than a flat Lv100, so each day's team is about equally strong.

## 11. Roadmap

1. **Better music.** Richer original compositions (more voices, drums, a theme per opponent and per generation), crossfades between battle and pinch themes, and sound effects per move category.
2. **Sprites and art.** Replace the stat glyphs with real Pokémon visuals. Open question: this needs art the project has the rights to use, either original pixel art or a properly licensed sprite source. Until then, improve the glyphs with per-type textures and idle animation.
3. **Draft mode (idea).** Pick 1 of 3 Pokémon six times, using the same daily candidates for everyone.
4. **Smarter AI.** Two-turn search with pruning, and a better evaluation of setup, hazards and speed control. Tune it against a benchmark suite (`tools/`).
5. **Leaderboards and sharing.** Optional global stats per day: how many people cleared, the average turns, and which Elite Four member stops the most players.
6. **More opponents.** Other champions, each in their own generation's rules.

## 12. Open questions

- Should Zinnia get Aster (Whismur) as a sixth Pokémon, even though Aster never battles in the games?
- Should Lance's Elite Four entry use a specific later-game team (for example from Pokémon Masters EX), rather than just keeping his Dragon type and Dragonite ace?
- Should streaks count consecutive days played, or only consecutive wins?
- Sprite licensing: what source, under what license, if any?
