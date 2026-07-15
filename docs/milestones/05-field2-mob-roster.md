# Milestone 05: Field 2 with two tougher mob types

## Status

done — 2026-07-14. All 4 automated AC green (45/45 suite); user playtested and approved Field 2 difficulty + roster same day.

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

- [x] Portal chain reaches Field 2 and back — test: `tests/e2e/field2.spec.js::portal chain`
- [x] Field 2 spawns type-2 (bruiser) and type-3 (spitter) mobs with their own stats, verifiably tougher than type-1 blob (bruiser 70 hp / 16 contact vs blob 40/10) — test: `tests/e2e/field2.spec.js::mob types and stats`
- [x] Type-specific XP and drops (bruiser grants 16 XP vs blob's 8; richer mesos/potion tables) — test: `tests/e2e/field2.spec.js::xp and drops scale`
- [x] Type-3 is ranged (user decision 2026-07-14): the spitter fires a slow, flat, jumpable shot on its own level that damages the player — test: `tests/e2e/field2.spec.js::ranged mob`
- [x] Field 2 difficulty feel (is the jump fair at ~level 5–8?) — verified by user playtest (approved 2026-07-14)

## Exit condition

User portals through to Field 2 at a mid level, fights visibly different, harder mobs, and comes back richer per kill than Field 1 pays.

## Test plan

Red-then-green per AC; reuse atomic kill helpers parameterized by map/type. Regression: full suite green.

## Notes

- Mob type decision: user chose **ranged spitter** for type 3 (2026-07-14). Slow flat jumpable shot, fires only on the player's own level, 2.2s cooldown, 6-range, 8 dmg — spawned by the mob sim (`mobs.projectiles`), resolved against the player in combat.js.
- Roster & stats live in `MOB_TYPES` (constants.js): blob 40hp/8xp (Field 1), bruiser 70hp/16xp, spitter 55hp/22xp (Field 2). mobSpawns carry `type`; MobsView tints/scales per type; drops/xp scale per type via the `mob:died` payload.
- Scope adjustment: Field 1 stayed blob-only (a deep-end bruiser there collided with combat-spec geometry, and tier-pure fields are Maple-authentic). Field 2 carries both new types.
- Field 2 map has its own `theme` colors (mapView reads `map.theme`), a 5-platform vertical layout, ladder + rope.
