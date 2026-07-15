# Milestone 03: Kills grant XP, levels, and loot that persists

## Status

in-progress — all 7 automated AC green 2026-07-14 (33/33 suite); awaiting user playtest of level-up feel + exit condition

## Objective

Close the dopamine loop: kills grant XP, the XP bar fills, level-ups flash and grow stats, mobs spill loot that the player picks up with Z, and the character survives a page reload via localStorage. After this milestone the game is a real (single-field, single-mob) MapleStory loop and every following milestone is content, multiplayer, or polish.

## Scope

- `src/sim/progression.js`: XP per kill, XP curve levels 1–15 (constants), level-up stat growth, damage scaling with level — headless-pure
- Death XP penalty (small %, constants; gameplan says forgiving) now that XP exists
- `src/sim/loot.js`: drop table per mob (currency, potions, star packs; rare gear stub), drop spill physics (small scatter), per-player drops, despawn timer, Z pickup when overlapping
- Inventory data model in GameState (stackables + gear stub); potion use restores HP (hotkey or inventory click — minimal)
- HUD (`src/ui/`, plain DOM): HP/MP/XP bars, level number, currency counter; level-up flash effect (visual only; jingle is the audio milestone's)
- localStorage save/load: level, XP, HP, inventory, position; save on change (debounced) and on unload
- Events: `player:levelup`, `loot:dropped`, `loot:picked`, `player:xp`
- `render_game_to_text()` extended: level, XP, inventory summary, ground drops

## Out of scope

- Shop NPC / town / restocking (next content milestone alongside Field 2)
- Gear equipping effects beyond the stub (needs shop/town context)
- MP costs/skills (MP bar renders but nothing spends it yet)
- Trading/economy (backlog #2 — forces server characters, new ADR)
- Audio (level-up jingle lands with the audio milestone)

## Dependencies

- **Depends on:** M02 (kills, drops source), M01
- **Blocks:** town/shop + Field 2 content milestone; multiplayer milestone reads the save model

## Acceptance criteria

- [x] Mob kill grants XP; XP bar fills proportionally — test: `tests/e2e/progression.spec.js::xp gain`
- [x] XP overflow levels up: flash fires, stats/damage grow, bar resets with remainder — test: `tests/e2e/progression.spec.js::level up`
- [x] Player death applies the XP penalty (never below current level's 0) — test: `tests/e2e/progression.spec.js::death penalty`
- [x] Dead mob spills drops that scatter, despawn on timer — test: `tests/e2e/loot.spec.js::drop spill and despawn`
- [x] Z over a drop picks it up into inventory; currency increments — test: `tests/e2e/loot.spec.js::pickup`
- [x] Using a potion restores HP and consumes the stack — test: `tests/e2e/loot.spec.js::potion use`
- [x] Reload page → level, XP, inventory, position restored from localStorage — test: `tests/e2e/save.spec.js::persistence roundtrip`
- [ ] Level-up moment feels like Maple (flash timing/placement) — verified by user playtest

## Exit condition

User grinds a few mobs → XP bar fills and a level-up flash fires; drops spill and Z picks them up; user reloads the page → the character comes back exactly as it was.

## Test plan

Red-then-green Playwright specs above; persistence spec drives a real page reload. Tune curve/penalty/drop rates in playtest (gameplan open question — record chosen values in constants + this file's Notes). Regression: `npx playwright test` with M01+M02 suites green.

## Notes

- localStorage schema gets a version field from day one — the multiplayer milestone and any future server-character ADR (backlog #2) will migrate it.
- Drop rates/XP curve first pass can copy Maple v62 vibes, exact numbers are playtest-tuned.
- 2026-07-14 implementation: XP curve 20×1.4^(lvl−1) (L1→2: 20, L14→15: ≈1568); XP_PER_MOB 8; death penalty 5% of xpToNext floored at 0; HP +5/level with classic full heal on level-up; star damage +1/level; potions heal 20, start with 3, key C; mesos always drop (5–14), potion 30%, star pack 15% via seeded rng (LOOT_SEED — server-owned later); drops despawn at 15s. MOB_MAX_HP rebalanced 60→40 (closes the M02 "tanky" note; 5 base hits, fewer as you level).
- MP bar renders static-full (nothing spends MP until skills); star packs collect in inventory but stars are not yet consumed (ammo + shop = next content milestone).
- Save lives in src/core/save.js — NOT src/sim (localStorage is a DOM API; sim purity).
