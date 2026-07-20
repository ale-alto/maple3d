# Milestone 14: Real items — star types, claw WA, the potion shelf

## Status

implemented 2026-07-20 — all 5 automated AC green (suite 93/93), live-verified; awaiting user playtest

## Objective

Retire the interim BASE_WA 30: weapon attack now comes from equipment the
documented way — total WA = claw WA + equipped star type's WA. Claw tiers
adopt the real ladder (WA, rolled ranges, level/stat requirements, prices);
stars become typed rechargeable equipment; potions take the real
heal-amount/price shelf (Red HP + Blue MP for v1).

## Scope

- `STAR_TYPES` (our names, real numbers): basic tier WA 15, recharge
  0.3 mesos/star, cap 500 (flagged unverified); top tier WA 27, cap 800,
  recharge 0.9 — rare drop only at our level band
- Claw tiers remapped to the real ladder: Lv10 WA 10 (roll 8–12) /
  Lv15 WA 12 (12–15) / Lv20 WA 14 (13–16); equip enforces level req
- combat totalWa = (claw?.wa ?? 0) + starType.wa — beginners throw with
  bare star WA (no claw until Rogue)
- Potions: Red (50 HP, C key) replaces the generic 20-heal; Blue
  (100 MP, X key) joins; shop sells both at documented prices; potion
  drops become Red
- Shop: star recharge (fill to cap, per-star price × missing) replaces
  the star-pack; starter claw = the Lv10/WA10 tier at 3,000 mesos
- Save v7 (starType + typed potion counts + claw wa fields; v6 migrates)
- Payload: inventory.starType, bluePotions; player WA visible via
  damageRange already

## Out of scope

- Orange/White potions and Mana Elixir (shelf documented, add with the
  level cap raise); scrolls/upgrade slots; mob stat table pass (recorded
  as its own follow-up with Disorder's wdef half)

## Acceptance criteria

- [x] Damage uses claw+star WA (no claw = star WA only) — `tests/e2e/items.spec.js::wa from equipment`
- [x] Claw equip enforces job + level requirement — `::claw level req`
- [x] Star recharge fills to cap at per-star price — `::star recharge`
- [x] Red heals 50 (C), Blue restores 100 MP (X), real prices — `::potions`
- [x] Save v7 round-trips; v6 migrates (typed stars, claws re-based) — `::save v7`
- [ ] Feel check — user playtest

## Exit condition

A fresh Rogue buys the starter claw at Nara's, feels the WA jump, keeps
stars recharged between grinds, and pockets Red/Blue potions at real
prices.
