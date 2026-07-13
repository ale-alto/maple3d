# Milestone 01: Player can run, jump, and climb across a blocked-out field

## Status

in-progress — all automated AC green 2026-07-13; awaiting user playtest of feel AC + exit condition

## Objective

Deliver the walking skeleton: the core architecture every later milestone builds on (EventBus, GameState, constants, sim/render split) plus the first playable capability — classic Maple side-scrolling movement across a blocked-out Field 1. This comes first because it is architecture-enabling (the `src/sim/` platforming module is the pattern the mob sim in M02 copies, and sim purity is what makes the PartyKit server milestone cheap later) and because nothing else in the gameplan is testable until the player can move.

## Scope

- `src/core/eventBus.js` and `src/core/gameState.js` singletons; all magic numbers into `src/core/constants.js`
- `src/sim/player.js` (or equivalent): headless platforming sim — run, jump, double jump, gravity, AABB collision against platform segments, ladder/rope climbing. **No Three.js/DOM imports (tech.md sim purity rule)**
- Field 1 blockout as data (`src/sim/maps/field1.js`): ground, 3+ floating platforms, 2+ ladders/ropes, map bounds
- `src/input/keyboard.js`: classic Maple preset — arrows move/climb, Alt jump (double-tap-direction not included)
- `src/render/` split: map blockout rendering from field data; `CharacterView` abstraction rendering the player as a primitive chibi placeholder (capsule + sphere head), facing = yaw flip
- Side-view camera that follows the player with soft bounds
- `render_game_to_text()` reports player position/velocity/grounded/climbing; `advanceTime(ms)` steps the sim deterministically
- Playwright test suite bootstrapped (`tests/`), failing tests written before implementation

## Out of scope

- Combat, mobs, HP (M02); XP/loot/HUD (M03)
- Camera swings at map transitions / points of interest (only one map exists)
- Flash jump, skills (backlog #4); key rebinding (backlog #6)
- Any Meshy/GLB assets (backlog #10, ADR-0002 — primitives only)
- Audio

## Dependencies

- **Depends on:** scaffold (done 2026-07-13), ADR-0001, ADR-0002
- **Blocks:** M02, M03, and every later milestone

## Acceptance criteria

- [x] Left/right arrows run the player along the ground; releasing stops (with Maple-style slight slide) — test: `tests/e2e/movement.spec.js::run left and right`
- [x] Alt jumps; Alt again mid-air double-jumps; landing resets both — test: `tests/e2e/movement.spec.js::jump and double jump`
- [x] Player collides with platforms from above (lands) and passes through from below (Maple thin-platform rule) — test: `tests/e2e/movement.spec.js::thin platform collision`
- [x] Up/down on a ladder/rope enters climb, moves vertically, exits at top/bottom or on jump — test: `tests/e2e/movement.spec.js::ladder climb`
- [x] Player cannot leave map bounds — test: `tests/e2e/movement.spec.js::map bounds`
- [x] Camera follows the player and respects map edges — test: `tests/e2e/camera.spec.js::camera follow`
- [x] `src/sim/` contains no Three.js/DOM imports — test: `tests/e2e/sim-purity.spec.js::sim imports are pure`
- [ ] Movement feels Maple-snappy (accel/decel/jump arc tuning) — verified by user playtest

## Exit condition

User presses arrows/Alt → the chibi placeholder runs, double-jumps onto platforms, and climbs a rope across Field 1 with the camera following, error-free console.

## Test plan

Red-then-green: write the five `tests/movement.spec.js` specs + camera + sim-purity specs first against `render_game_to_text()`/`advanceTime()`, confirm they fail for the right reason, then implement. Manual playtest for feel-tuning AC (user). Regression command: `npx playwright test`.

## Notes

- Sim step is fixed 1000/60 ms (constants.js `FIXED_STEP_MS`); `advanceTime` must remain the only test-facing clock.
- Replace `src/render/bootScene.js` (scaffold throwaway) — keep its syncSize-in-render-loop pattern (hidden Browser-pane tabs load at 0x0 and fire no resize event).
- Browser pane: rAF throttled when hidden; screenshots time out — verify via `advanceTime` + `render_game_to_text` + `window.__debug` gl.readPixels.
