# Milestone 17: The long road — fields 3/4 and the last Hermit utilities

## Status

implemented 2026-07-20 — suite 106/106 (autonomous ladder run; feel-playtest open)

## As built

- **Field 3 "the ridge"** (stalkers, level 22) and **Field 4 "the hollow"**
  (ravagers 38 + wraith snipers 52) — our original layouts, portal-chained
  field2 ↔ field3 ↔ field4. Mob tiers are our designs feeding the sourced
  formulas (level/avoid gate accuracy exactly like the early fields).
- Claw tiers 4–5 from the §9 ladder (WA 16 lv25 / WA 18 lv30) in the drop
  tables of the new mobs.
- **Meso Up (E)**: §11 costs/durations; the documented drop-rate % maps
  onto meso AMOUNT (our mesos always drop — conversion noted). Local
  kills only for now (server-side buff relay deferred).
- **Shadow Web (R)**: roots up to 6 mobs in the forward lane, (40+2·lv)%
  each, 5–8 s bands; rooted mobs freeze (payload mobs[].rooted).
- New-tier models reuse the skeleton crew at larger scales.
- Deferred: Night Lord@120 (4th job), mob-defense formula pass, Meso Up
  in multiplayer, IP-safe naming (backlog #8) before public promo.
