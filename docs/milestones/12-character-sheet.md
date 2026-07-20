# Milestone 12: Real character sheet — stats, damage rolls, the true curve

## Status

done — user-approved 2026-07-20 (suite green, live-verified)

## Objective

Replace every approximated number with the documented pre-BB system from
docs/reference/ms-v62-mechanics.md: STR/DEX/INT/LUK with +5 AP per level,
real damage formulas (uniform MIN–MAX rolls, Lucky Seven's own LUK×5 basis),
accuracy/avoid with visible MISSes, the exact EXP table, real MP regen
(3 per 10 s), and documented HP/MP growth. The S key opens a stat window.

## Scope

- `src/sim/stats.js` (pure): character stats, AP allocation, derived
  ACC/avoid/damage ranges per §1–3 of the reference
- Damage pipeline: per-star uniform MIN–MAX roll; L7 uses its own basis;
  base mastery constant (verified value); hit check vs mob avoid → MISS
- Exact EXP table (§4) replacing the geometric curve; progression specs
  rewritten deliberately (not silently)
- MP regen 3/10 s tick; HP/MP per level from verified pre-BB ranges
  (**RESEARCH FIRST: LazyBui's guide — the one unverified row**)
- New-character stat roll per documented rules (verify roll mechanism)
- Stat window (S): classic AP-assignment UI; HUD unchanged
- Save v5 (stats/ap; migrate v4 with a sensible assassin allocation)
- Payload: player.stats, ap, damage range, acc; misses in fx

## Out of scope

- Job advancement (M13), skill-set rework (M13), item WA tables (M14)

## Acceptance criteria

- [x] AP: +5 per level, allocation via S window — `stats.spec.js::ap allocation`
- [x] Star damage = documented formula, rolls within [MIN, MAX] — `::damage rolls within the documented range` (+ node-side `::formulas match the reference doc`)
- [x] L7 uses LUK×5/×2.5 basis and its real 20-level table — skills.spec rewritten deliberately (volley rolls inside l7Range at 58%, MP 8)
- [x] Misses per the hit formula — `::accuracy misses and hits deterministically at the extremes` (spitter avoid 4 = the gating mob)
- [x] EXP table matches §4 exactly — `::formulas...` spot checks; progression.spec rewritten to expToNext
- [x] MP regen 3/10 s tick; save v5 round-trips — `::mp regen ticks and save v5 round-trips`
- [x] Feel check — user-approved 2026-07-20

## Roadmap context (the parity ladder)

- **M12** character sheet core (this)
- **M13** jobs: Beginner → Rogue@10 (real 1st-job kit incl. 20-level L7,
  Nimble Body, Keen Eyes; SP job-gated; Flash Jump LEAVES the early game)
- **M14** items: real star types w/ WA (Subi…), claw WA values, potion table
- **M15+** Assassin@30 (Claw Mastery/Booster/Haste/Drain/Critical Throw),
  cap raises on the real curve, Hermit@70 brings Flash Jump home
