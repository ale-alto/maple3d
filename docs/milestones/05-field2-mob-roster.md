# Milestone 05: Field 2 with two tougher mob types

## Status

planned

## Objective

Deliver the second hunting field and complete the v1 mob roster (3 types of rising difficulty), giving the level curve somewhere to go: tougher mobs, better XP and drops, and the "push deeper" pull from the gameplan loop. Pure content on top of M04's map system — which is exactly why M04 had to come first.

## Scope

- Field 2 map blockout (visually distinct palette/layout, more vertical), portal chain town ↔ field1 ↔ field2
- Mob type system: per-type stats in constants (hp, speed, damage, xp, drop table, tint/shape variant in MobsView); mobSpawns reference a type
- Mob type 2 (Field 1 deep-end + Field 2): tankier, harder contact hit, better drops
- Mob type 3 (Field 2): decide melee vs ranged (gameplan open question) — if ranged, a slow telegraphed projectile the player can jump
- Per-type XP (replaces flat XP_PER_MOB) and per-type drop tables (more mesos, higher potion odds, rare star pack)
- `render_game_to_text()` mobs gain `type`

## Out of scope

- Boss (backlog #5), quests (backlog #1), gear itemization (backlog)
- Multiplayer (M06), audio, assets

## Dependencies

- **Depends on:** M04 (map system)
- **Blocks:** nothing hard; M06 benefits (more to share)

## Acceptance criteria

- [ ] Portal chain reaches Field 2 and back — test: `tests/e2e/field2.spec.js::portal chain`
- [ ] Field 2 spawns type-2 and type-3 mobs with their own stats (verifiably tougher: higher hp/contact damage than type 1) — test: `tests/e2e/field2.spec.js::mob types and stats`
- [ ] Type-specific XP and drops (killing a type-2 grants more XP than type-1) — test: `tests/e2e/field2.spec.js::xp and drops scale`
- [ ] If type 3 is ranged: its projectile damages the player and can be avoided — test: `tests/e2e/field2.spec.js::ranged mob` (else AC revised to its melee behavior)
- [ ] Field 2 difficulty feel (is the jump fair at ~level 5–8?) — verified by user playtest

## Exit condition

User portals through to Field 2 at a mid level, fights visibly different, harder mobs, and comes back richer per kill than Field 1 pays.

## Test plan

Red-then-green per AC; reuse atomic kill helpers parameterized by map/type. Regression: full suite green.

## Notes

- Mob type decision (melee vs ranged #3) gets made at red-test time with the user if playtest instinct hasn't already settled it.
