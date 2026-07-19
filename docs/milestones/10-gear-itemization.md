# Milestone 10: Gear drops matter — equip and grow

## Status

done — user-approved 2026-07-19 (suite 71/71, live-verified)

## Objective

Turn the M03 "rare gear stub" into real itemization: mobs rarely drop gear (claws, garb pieces) with stat rolls; an equipment model adds weapon attack / defense to the player's derived stats; a minimal equip UI (inventory panel) lets the player compare and equip. Closes the gameplan loop verb "equip" properly and gives grinding a second reward axis beyond XP.

## Scope

- Item model (`src/sim/items.js`, pure): gear defs (slot: weapon/armor; tier; base stats; small random roll at drop time), stackables stay as-is
- Drop tables gain per-type gear chances (rare — Maple-honest rates, constants)
- Equipment state on the character: `equipment: {weapon, armor}`; derived stats: star damage = base + level bonus + weapon attack; defense reduces contact/shot damage (formula in constants)
- Save schema v3 (equipment + bag; migrate v2)
- Inventory/equip UI (plain DOM, I key): bag grid of gear, click to equip/swap, stat compare tooltip; HUD shows attack value
- Shop: Nara sells one starter claw tier (mesos sink)
- Multiplayer: equipment is client-owned like the rest of the character (server hit validation clamp widens with level+weapon)
- Payload: player.attack/defense, equipment, bag

## Out of scope

- Gear visuals on the 3D model (data-first; model attachments are a later art pass)
- Trading (backlog #2 — still forces server characters + ADR), enhancement/scrolls, set bonuses

## Dependencies

- **Depends on:** M09 order-wise; technically M03+
- **Blocks:** M11 (skills scale off the same derived-stats layer)

## Acceptance criteria

- [x] Gear drops with rolled stats at per-type rates — `tests/e2e/gear.spec.js::gear drops with stats` (pure-sim rollGear; blob 3%/T1, bruiser 4.5%/T2, spitter 6%/T3)
- [x] Equipping a claw raises star damage — `::weapon attack applies` (payload player.attack; verified vs actual mob hp delta)
- [x] Armor reduces contact damage — `::defense applies` (soak = max(1, dmg − defense))
- [x] I opens the bag; equip/swap/unequip works; save v3 round-trips — `::equip ui`, `::equipment persists`
- [x] Itemization feel (drop excitement, stat pacing) — user-approved 2026-07-19

## Exit condition

User grinds until a claw drops, opens the bag with I, equips it, and visibly hits harder; reload keeps it equipped.

## Test plan

Red-then-green per AC (seeded rng + dev hooks keep drops deterministic). Regression: full suite green; hit-validation clamp tested in multiplayer suite.

## Notes

- Promoted from M03's out-of-scope notes + backlog trail 2026-07-14 (user request).
- As built: `src/sim/items.js` (makeGear/rollGear/equipFromBag/unequip/soak, GEAR_TIERS in constants — 3 claw + 3 garb tiers, stat = base + [0..roll] rolled at drop), `src/ui/inventoryPanel.js` (#inv-panel, classic ITEM INVENTORY styling), playerAttack in combat.js, save v3 (v2 migrates: empty equipment/bag), Nara sells Bronze Claw (80 mesos, base roll), HUD ATT chip, gear ground-drop = big silver octahedron. Server hit clamp (40) already covers the new max hit (level-15 + max Dark Claw = 36) — unchanged.
