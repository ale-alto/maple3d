# Milestone 02: Player can hunt — throw stars, mobs patrol and die

## Status

planned

## Objective

Make the "hunt" and "throw" verbs real: mobs spawn and patrol Field 1, the assassin throws stars with Ctrl, mobs take damage with floating numbers and HP bars, die with a death pop, and deal contact damage back. This is the heart of the core loop; it follows M01 because mob simulation reuses the platforming sim's structure and must obey the same sim purity rule (mob AI runs headless inside the PartyKit room in the multiplayer milestone).

## Scope

- `src/sim/mobs.js`: spawn points in field data, simple patrol AI (walk segment, turn at edges), aggro radius (chase toward player on the platform), mob HP, damage intake, death, timed respawn — headless-pure
- `src/sim/combat.js`: star projectile sim (Ctrl to throw, fast flat trajectory, short-mid range, hit = first mob in path), player damage output (flat v1 value in constants)
- Player HP in GameState; mob contact damage; HP 0 → respawn at map start (town doesn't exist yet) — death XP penalty deferred to M03 (no XP yet)
- Render: mob CharacterView placeholders (one mob type, primitive-built), star projectile visual, floating damage numbers, mob HP bar above head, death pop effect (scale/fade — minimal, polish later)
- Events: `mob:spawned`, `mob:hit`, `mob:died`, `player:hit`, `player:died` via EventBus
- `render_game_to_text()` extended: mob list (position/HP/state), projectiles, player HP

## Out of scope

- XP, levels, loot drops (M03)
- Second/third mob type, ranged mobs (gameplan open question), Field 2
- Skills/flash jump; knockback tuning beyond basics
- Shared/server-owned mob state (multiplayer milestone) — but the sim API must stay headless so that milestone is a transport swap, not a rewrite
- Audio/SFX; real mob models (backlog #10)

## Dependencies

- **Depends on:** M01 (movement, sim/render split, EventBus, CharacterView, test harness)
- **Blocks:** M03

## Acceptance criteria

- [ ] Mobs spawn at field spawn points and patrol without falling off platforms — test: `tests/mobs.spec.js::patrol stays on platform`
- [ ] Ctrl throws a star in the facing direction; it despawns at max range — test: `tests/combat.spec.js::star throw and range`
- [ ] Star hit reduces mob HP and fires `mob:hit`; damage number appears — test: `tests/combat.spec.js::star damages mob`
- [ ] Mob at 0 HP dies (`mob:died`), disappears with death pop, respawns after timer — test: `tests/mobs.spec.js::death and respawn`
- [ ] Mob contact damages the player (with brief invulnerability window) — test: `tests/combat.spec.js::contact damage`
- [ ] Player at 0 HP respawns at map start with full HP — test: `tests/combat.spec.js::player death respawn`
- [ ] Throw/hit/death feel (pacing, numbers legibility) — verified by user playtest

## Exit condition

User walks up to a patrolling mob and holds Ctrl → stars fly, damage numbers pop, the mob's HP bar drains and it dies with a pop; standing inside a mob drains player HP until respawn.

## Test plan

Red-then-green Playwright specs above driven via `advanceTime` + `render_game_to_text` (deterministic mob positions via fixed spawn data; if AI needs randomness, seed it). Manual playtest for feel. Regression: `npx playwright test` (M01 suite must stay green).

## Notes

- Keep all combat numbers (star damage, mob HP, patrol speed, aggro radius, contact damage, i-frames, respawn timer) in constants.js — M03 progression scaling will touch them.
- One mob type only ("green blob tier"); the 3-type roster arrives with Field 2 content later.
