# Milestone 11: Assassin skills — Lucky Seven and Flash Jump

## Status

implemented 2026-07-19 — 5 automated AC green (suite 76/76), live-verified; awaiting user playtest (skill feel)

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

- [x] Level-ups grant skill points; K assigns them — `tests/e2e/skills.spec.js::skill points and assignment` (+3 SP/level, 1 SP/skill level)
- [x] Lucky Seven throws a 2-star volley, spends MP + 2 stars, out-damages basic — `::lucky seven volley` (per-star = attack × mult, L1 0.7 → L5 1.0)
- [x] Without MP (or the skill), attacks stay basic — `::mp gates skills` (Shift falls back to a single throw)
- [x] Flash Jump: Alt mid-air, skill + MP gated — `::flash jump` (vx 9 burst; unskilled mid-air Alt still inert, single-jump rule re-asserted)
- [x] Save v4 round-trips skills/MP — `::skills persist` (v3 migrates with retroactive SP)
- [ ] Skill feel (L7 punch, flash jump rhythm — the assassin identity) — verified by user playtest

## Exit condition

User levels, drops points into Lucky Seven and Flash Jump, and the kit transforms: double-star volleys and flash-jump kiting, MP bar breathing underneath.

## Test plan

Red-then-green per AC. Flash Jump spec explicitly re-asserts the single-jump rule for the unskilled case (guards the M02-era decision). Regression: full suite green.

## Notes

- Promoted from backlog #4 (2026-07-14, user request). Flash jump returning as a SKILL is the resolution of the double-jump removal — authentic on both ends.
- As built: `src/sim/skills.js` (assignSkillPoint, stepMp regen 1.5/s, luckySevenParams/flashJumpParams affordability), SKILLS/SP_PER_LEVEL/MP_* in constants; L7 on Shift inside stepCombat (volley loop, star.mult, falls back to basic); FJ inside stepPlayer (before the grounded-jump block; air-steer cap now preserves super-speed instead of snapping to RUN_SPEED); level-up = +3 SP + full MP restore; save v4 (v3 migrates with retroactive SP = 3×(level−1)); `src/ui/skillPanel.js` (K, classic window); __test.setMp + setXp grants retroactive SP/MP. Max L7 star = 36 ≤ server clamp 40 — unchanged.
