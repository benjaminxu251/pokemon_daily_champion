# Roadmap

Planned work, roughly in priority order. See [PRD.md](PRD.md) for the current product.

Reference: [Daily Red Game](https://dailyredgame.org/), the project that inspired this one. Its credits page is at [dailyredgame.org/credits](https://dailyredgame.org/credits).

## Better music

- Richer original compositions: more voices, drums, and a distinct theme per opponent and per generation's feel.
- Smooth crossfade from the battle theme into the "last Pokémon" pinch theme.
- Sound effects per move category, plus hit, crit, super-effective and faint cues.
- Keep the "Your tracks" library so players can add their own audio.

## Sprites and art

- Replace the stat glyphs with real Pokémon visuals. This needs art we have the rights to ship: commissioned or original pixel art, or a sprite source with a license that allows redistribution.
- Until then, improve the glyphs: per-type textures, idle animation, and attack and faint animations.
- Trainer portraits for the lobby and the battle intro, with the same licensing requirement.
- Full battle UI art for every battle style:
  - battle backgrounds and platforms
  - the option select menu (Fight, Bag, Pokémon, Run)
  - the move menu
  - the Pokémon-remaining indicators (party balls)
  - the HP and level displays
  - the text box
  - the party and summary screens
- Champion encounter intro, like the games: a transition into the battle, the champion's entrance and intro line, then her lead Pokémon sent out. Each battle style gets its own version. This uses original art under the same licensing requirement.

## Draft mode

- Pick 1 of 3 Pokémon six times, with the same daily candidates for everyone.
- Show the candidates one round at a time, so each pick is a commitment.

## Smarter AI

- Two-turn search with pruning. Keep the decision under about 1 second on a mid-range phone.
- Better evaluation of setup moves, hazards, speed control and choice-locking.
- A benchmark suite in `tools/` with fixed seeds, to track AI strength over time.

## Leaderboards and stats

- Optional global daily stats: clear rate, average turns, and which Elite Four member stops the most players.
- This needs a small backend or a serverless store. Keep the game itself fully static.

## More opponents

- More champions, each under their own generation's rules and UI skin.
- More Elite Four members and Champions as new games add them.

## Open questions

- Zinnia: should she get Aster (Whismur) as a sixth Pokémon? Aster never battles in the games.
- Lance in the Elite Four: should he use a specific later-game team, for example from Pokémon Masters EX?
- Streaks: should they count consecutive days played, or only consecutive wins?
