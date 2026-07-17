# Milestone 08: Real chibi models replace the placeholders

## Status

planned

## Objective

The ADR-0002 payoff: generate rigged, animated chibi GLB models with Meshy AI (text→model→auto-rig→animate) for the assassin, the three mob types, and Shopkeeper Nara, and swap them in through the CharacterView/MobsView abstractions — sim and game logic untouched, exactly as the abstraction was designed for. The capsule era ends.

## Scope

- Meshy generation (meshyai skill): assassin (chibi, dark garb, claw), blob / bruiser / spitter (cute-menacing tiers, distinct silhouettes), Shopkeeper Nara; MapleStory-2-adjacent chibi proportions, bright pastel palette (IP-safe originals)
- Required animation sets (gameplan): player idle/run/jump/climb/throw (+crouch if cheap); mobs walk/hurt/die; NPC idle
- `CharacterView` internals: GLTFLoader + AnimationMixer; map the sim state machine (idle/move/crouch/jump/fall/ladder/rope) + attackLockMs to clips with crossfades; facing = yaw flip as today
- `MobsView` per-type models with walk/hurt(flash)/die clips; death pop becomes the die animation
- Remote players use the same model path (they already render via CharacterView)
- GLBs under `public/models/` (Git LFS if >20MB total per tech.md); loading states — primitives remain as instant-on fallback until models load
- Draw-call sanity: check via `__debug.renderer.info` after swap (threejs-perf guidance if needed)

## Out of scope

- Map/terrain art (blockout stays this milestone; terrain art is its own later pass)
- Gear visuals on the model (M10 decides data-first vs visual gear)
- Facial expressions, emotes

## Dependencies

- **Depends on:** M07 order-wise (user-chosen sequence); technically only M02+ (state machine)
- **Blocks:** M09 (ship it looking right)

## Acceptance criteria

- [ ] Player renders as a rigged GLB; sim states drive distinct clips (idle vs run vs jump/fall vs climb) — test: `tests/e2e/assets.spec.js::player model and clips` (payload exposes current clip name)
- [ ] Each mob type renders its own model with walk/die animations — test: `tests/e2e/assets.spec.js::mob models`
- [ ] Fallback: with a model file missing, primitives render and the console stays clean — test: `tests/e2e/assets.spec.js::primitive fallback`
- [ ] Frame rate holds (draw calls within budget with 2 players + full field) — test: perf assertion via renderer.info in payload
- [ ] The look lands (chibi proportions, palette, animation feel) — verified by user playtest

## Exit condition

User walks the field as a real chibi assassin — running, jumping, climbing, throwing all animate; blobs waddle and die with their own animations; Nara stands in the shop as a person, not a capsule.

## Test plan

Red-then-green on clip-name payload assertions + fallback spec. Visual quality is user playtest (this is the milestone where screenshots matter — capture per-state stills for review). Regression: full suite green (views only; sim untouched).

## Notes

- Meshy requires MESHY_API_KEY (user account, paid credits). Fallback source per ADR-0002: free GLB libraries if Meshy output disappoints.
- Keep every model swap inside CharacterView/MobsView — if a change wants to touch the sim, the abstraction is being violated; stop and re-read ADR-0002.
