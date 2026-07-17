# Milestone 11: Assassin skills — Lucky Seven and Flash Jump

## Status

planned

## Objective

The assassin kit grows up: a small skill system with skill points from level-ups and the two iconic assassin skills — **Lucky Seven** (throw two stars at once, higher damage multiplier, costs MP) and **Flash Jump** (the airborne second jump, MP-gated — the authentic return of what double jump wasn't). MP finally spends; the MP bar earns its place in the HUD.

## Scope

- Skill model (`src/sim/skills.js`, pure): skill defs (levels 1–N, MP cost, damage multipliers/params), skill points (+3 per level-up per classic), assignment
- MP: max MP grows per level; MP regen (slow tick); potions stay HP (blue potions = shop addition)
- **Lucky Seven** (key: Shift or remap): consumes MP + 2 stars, throws a two-star volley at the locked target with per-star damage multiplier; falls back to basic throw when MP/stars short
- **Flash Jump** (Alt mid-air, MP-gated): horizontal burst in facing direction — implemented as the skill it always was (MAX_JUMPS stays 1; flash jump is a separate airborne action requiring the skill learned + MP)
- Skill UI: K opens a minimal skill panel (assign points, see levels); HUD shows MP draining/regen
- Save v4 (skills, sp, mp; migrate v3)
- Multiplayer: skill throws relay like basic throws (two cosmetic stars); server damage clamp accounts for L7 multipliers
- Payload: player.mp/maxMp/sp, skills, per-throw star count

## Out of scope

- Full skill tree/other jobs (backlog #3), Haste/booster buffs, party buffs

## Dependencies

- **Depends on:** M10 (derived-stats layer)
- **Blocks:** none in v1

## Acceptance criteria

- [ ] Level-ups grant skill points; K assigns them — test: `tests/e2e/skills.spec.js::skill points and assignment`
- [ ] Lucky Seven throws a 2-star volley, spends MP + 2 stars, out-damages basic per volley — test: `::lucky seven volley`
- [ ] Without MP (or the skill), attacks stay basic — test: `::mp gates skills`
- [ ] Flash Jump: Alt mid-air with the skill learned + MP bursts horizontally; without it, mid-air Alt still does nothing — test: `::flash jump`
- [ ] Save v4 round-trips skills/MP — test: `::skills persist`
- [ ] Skill feel (L7 punch, flash jump rhythm — the assassin identity) — verified by user playtest

## Exit condition

User levels, drops points into Lucky Seven and Flash Jump, and the kit transforms: double-star volleys and flash-jump kiting, MP bar breathing underneath.

## Test plan

Red-then-green per AC. Flash Jump spec explicitly re-asserts the single-jump rule for the unskilled case (guards the M02-era decision). Regression: full suite green.

## Notes

- Promoted from backlog #4 (2026-07-14, user request). Flash jump returning as a SKILL is the resolution of the double-jump removal — authentic on both ends.
