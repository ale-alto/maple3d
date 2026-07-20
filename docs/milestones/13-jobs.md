# Milestone 13: Jobs — Beginner to Rogue, the real 1st-job kit

## Status

planned (parity ladder step 2 — reference doc §7 has every table)

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

- [ ] Beginners: no SP, skill panel locked until advancement — test: `tests/e2e/jobs.spec.js::beginner has no skills`
- [ ] Advancement at the trainer: requirements enforced, pool roll + 1 SP granted, job persists — test: `::rogue advancement`
- [ ] Prereq gating (Keen Eyes ← NB3, Dark Sight ← Disorder 3) — test: `::skill prereqs`
- [ ] Nimble Body raises accuracy; Keen Eyes extends throw range — test: `::passive effects`
- [ ] Dark Sight: hidden = no aggro/damage, no attacking, speed penalty; expires — test: `::dark sight`
- [ ] Disorder: debuffed mob deals reduced contact damage for the duration — test: `::disorder`
- [ ] Save v6 migration: FJ refunded, SP recomputed, job assigned by level — test: `::v5 migration`
- [ ] Feel check — user playtest

## Exit condition

A fresh character grinds levels 1–9 skill-less, hits 10, takes the
trainer's advancement, and builds the real Rogue kit — sneaking past
mobs in Dark Sight, weakening a bruiser with Disorder, and volleying
Lucky Sevens with Nimble Body accuracy behind it.
