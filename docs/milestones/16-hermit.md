# Milestone 16: Hermit at 70 — Flash Jump comes home

## Status

implemented 2026-07-20 — suite 103/103 (autonomous ladder run; feel-playtest open)

## As built (reference §11)

- Hermit tier in tryAdvanceJob: level 70, +1 SP, NO pool roll (emulator: no 3rd-job case)
- **Flash Jump returns** as the Hermit skill it always was: real MP table (60→13), prereq Avenger 5, Alt mid-air burst (vx 9 presentation); the M11-era air-steer super-speed cap finally serves its true purpose
- **Avenger (Q)**: consumes 3 stars, MP 16/23/30 by band, pierces up to 4/5/6 mobs in the forward lane, per-target = basic range × pct table (tail rows extrapolated on the +4 pattern — flagged VERIFY in §11)
- **Shadow Partner (W)**: MP 200−5·lv, 60/120/180 s; every landing star echoes at the §11 pct (second damage number; summoning-item requirement skipped — deviation)
- **Alchemist**: fixed-amount potion recovery × table multiplier (Red/Blue)
- selectTargets() multi-lock refactor; skill panel rank 3; jobs3.spec.js (4 specs from red)
- Deferred to M17: Meso UP, Shadow Web, Shadow Meso (§11), field3/field4 content + mob tiers for the 30→70 grind, Night Lord@120
