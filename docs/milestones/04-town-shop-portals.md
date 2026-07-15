# Milestone 04: Player can portal to town and restock at the shop

## Status

in-progress — all 6 automated AC green 2026-07-14 (41/41 suite); awaiting user playtest of transition feel + exit condition

## Objective

Build the multi-map architecture (map registry, portal transitions, per-map spawns, camera swing on map entry) and use it to deliver the hub town with a shop NPC that sells potions and star packs for mesos. This comes first in the set because every later milestone leans on it: Field 2 (M05) is just another map + portal once this exists, and the PartyKit milestone (M06) maps rooms one-to-one onto maps. It also closes the loop's missing verb — restock — making mesos worth something.

## Scope

- Map registry: multiple map-data modules (`src/sim/maps/`), `gameState.mapId`, a `changeMap(mapId, portalId)` flow that swaps sim state (player position at the target portal, mobs/loot per map) and rebuilds the render side
- Portal data on maps (`portals: [{x, targetMap, targetPortal}]`) + Up key at a portal triggers transition (classic Maple); portal visual placeholder (glowing blockout)
- Town map blockout: no mobs, spawn point, shop NPC placeholder, portals to Field 1; Field 1 gains portals (left edge → town)
- Death respawns in town (gameplan rule — replaces the map-start respawn stub)
- Camera swing on map entry (brief eased pan/zoom settle — the gameplan's "camera swings at map transitions")
- Shop NPC: Up (or Z) near NPC opens a plain-DOM shop panel — buy potion / star pack with mesos, prices in constants; inventory + HUD update; Esc/close
- Per-map mob/loot state keyed by map (Field 1 state persists while in town? v1: mobs reset on map entry — Maple-authentic channel behavior, simpler)
- Save gains mapId (schema v2 with v1 migration)
- `render_game_to_text()` gains mapId, portals, shopOpen

## Out of scope

- Field 2 and new mob types (M05)
- Gear equipping/shop gear tab (needs itemization pass — backlog)
- Star ammo consumption (shop sells packs now; consumption decision belongs with skills/ammo economy — backlog note)
- Multiplayer rooms (M06); audio (later milestone)

## Dependencies

- **Depends on:** M01–M03
- **Blocks:** M05, M06

## Acceptance criteria

- [x] Up at a Field 1 portal transitions to town: mapId changes, player appears at the linked portal, map geometry swaps — test: `tests/e2e/maps.spec.js::portal transition`
- [x] Camera swings (eased, ~0.5s) on map entry instead of snapping — test: `tests/e2e/maps.spec.js::camera swing on entry`
- [x] Town has no mobs; Field 1 mobs/loot state resets on re-entry — test: `tests/e2e/maps.spec.js::town is safe, fields reset`
- [x] Death respawns in town at full HP (not field start) — test: `tests/e2e/maps.spec.js::death respawns in town`
- [x] Shop: near the NPC, interact opens the panel; buying a potion decrements mesos and increments potions; insufficient mesos refuses — test: `tests/e2e/shop.spec.js::buy potion`, `::insufficient mesos`
- [x] Save/load round-trips mapId (v2 schema migrates v1 saves) — test: `tests/e2e/save.spec.js::map persistence`, `::v1 save migrates`
- [ ] Transition feel (swing timing, portal placement) — verified by user playtest

## Exit condition

User walks to Field 1's left portal, presses Up → camera swings into the town; walks to the shop NPC, buys a potion with farmed mesos; portals back and the field is live again. Dying anywhere returns them to town.

## Test plan

Red-then-green Playwright specs above (atomic in-page pattern for anything timing-sensitive). Manual playtest for swing feel. Regression: `npx playwright test` — full 33-spec suite stays green (respawn-location change will touch `player death respawn`; update that spec deliberately with this milestone, not silently).

## Notes

- `changeMap` must keep the sim/render split clean: sim state swaps in `src/sim`-pure structures; only main.js/render rebuild views. M06 will re-use `changeMap` as "join room".
- Existing combat spec `player death respawn` asserts respawn at map spawn — this milestone changes the rule to town; rewrite that spec as part of the red phase.
