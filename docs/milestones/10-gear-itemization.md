# Milestone 10: Gear drops matter — equip and grow

## Status

planned

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

- [ ] Gear drops with rolled stats at per-type rates (forced-roll dev hook for the spec) — test: `tests/e2e/gear.spec.js::gear drops with stats`
- [ ] Equipping a claw raises star damage; better claw = bigger hits — test: `tests/e2e/gear.spec.js::weapon attack applies`
- [ ] Armor reduces contact damage — test: `tests/e2e/gear.spec.js::defense applies`
- [ ] I opens the bag; equip/swap works; save v3 round-trips equipment — tests: `::equip ui`, `::equipment persists`
- [ ] Itemization feel (drop excitement, stat pacing) — verified by user playtest

## Exit condition

User grinds until a claw drops, opens the bag with I, equips it, and visibly hits harder; reload keeps it equipped.

## Test plan

Red-then-green per AC (seeded rng + dev hooks keep drops deterministic). Regression: full suite green; hit-validation clamp tested in multiplayer suite.

## Notes

- Promoted from M03's out-of-scope notes + backlog trail 2026-07-14 (user request).
