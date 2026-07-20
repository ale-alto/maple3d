# Milestone 13: Jobs — Beginner to Rogue, the real 1st-job kit

## Status

implemented 2026-07-20 — all 7 automated AC green (suite 88/88), live-verified; awaiting user playtest

## Objective

The real job structure: characters start as Beginners (no SP, no skills),
advance to **Rogue at level 10** (DEX 25) at a trainer NPC in town, and
earn the documented 1st-job kit — Nimble Body, Keen Eyes, Disorder,
Dark Sight, Lucky Seven — with SP gated behind the advancement.
Flash Jump leaves the early game (it returns at Hermit, M15+).

## Scope

- `player.job`: 'beginner' | 'rogue'; advancement at the town trainer NPC
  (our own character/name — art is ours): level ≥ 10 + DEX ≥ 25 →
  +100–150 HP / +25–50 MP one-time roll, +1 SP, job = rogue
- SP: beginners earn none; +3/level once rogue (migration recomputes)
- SKILLS gains nimbleBody / keenEyes / disorder / darkSight (real tables,
  §7); flashJump removed from the assignable kit (points refunded)
- Prereqs enforced: Keen Eyes needs Nimble Body 3; Dark Sight needs
  Disorder 3; skill panel shows locks
- Effects: Nimble Body feeds accuracy/avoid; Keen Eyes extends star
  range (px→unit conversion, §7); Disorder (D) debuffs a mob's attack
  (weapon-def half becomes meaningful with M14 mob stats); Dark Sight (V)
  hides the player — no aggro, no contact/shot damage, can't attack,
  speed penalty per table
- Player avoid matters: mobs can MISS the player (same hit-formula shape;
  mob accuracy values are our-design mob stats)
- Save v6 (job; migrations refund FJ + recompute SP); HUD job label
  becomes dynamic; payload player.job + new skills

## Out of scope

- Assassin (30) and beyond — M15+; Double Stab (dagger line — deviation
  documented in §7); real mob stat tables (M14)

## Acceptance criteria

- [x] Beginners: no SP, skill panel locked until advancement — `tests/e2e/jobs.spec.js::beginner has no skills`
- [x] Advancement at the trainer (Instructor Vey): requirements enforced, +100–150/+25–50 roll, +1 SP (+3/level catch-up when late), persists — `::rogue advancement`
- [x] Prereq gating (Keen Eyes ← NB3, Dark Sight ← Disorder 3) — `::skill prereqs`
- [x] Nimble Body feeds accuracy; Keen Eyes extends throw range — `::passive effects`
- [x] Dark Sight: no aggro/damage, no attacking, −30 speed at L1, 10s/level — `::dark sight`
- [x] Disorder: attack −level for the duration; no reapply while active — `::disorder`
- [x] Save v6 migration: FJ refunded, SP recomputed, job by level — `::v5 migration refunds flash jump and recomputes SP`
- [ ] Feel check — user playtest (D = Disorder, V = Dark Sight)

## Exit condition

A fresh character grinds levels 1–9 skill-less, hits 10, takes the
trainer's advancement, and builds the real Rogue kit — sneaking past
mobs in Dark Sight, weakening a bruiser with Disorder, and volleying
Lucky Sevens with Nimble Body accuracy behind it.
