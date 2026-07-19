# Milestone 08: Real chibi models replace the placeholders

## Status

done — user-approved 2026-07-18 after playtest-driven polish (billboard hp bars, kill-drain to 0, classic v62 status bar HUD, KayKit loot props + procedural shuriken)

## Objective

The ADR-0002 payoff: replace the primitive placeholders with rigged, animated chibi GLB models for the assassin, the three mob types, and Shopkeeper Nara, swapped in through the CharacterView/MobsView abstractions — sim and game logic untouched, exactly as the abstraction was designed for. The capsule era ends.

**Path change (user-directed):** the user asked for a free source instead of Meshy's paid credits. Source is now the **KayKit CC0 character packs** (Adventurers + Skeletons, GitHub raw downloads, no auth) — rigged chibi humanoids sharing one ~80-clip animation library.

## Scope

- KayKit roster (all CC0, in `public/models/`): Rogue_Hooded → player (has a real `Throw` clip), Mage → Shopkeeper Nara, Skeleton_Minion/Warrior/Mage → blob/bruiser/spitter (small/tanky/ranged silhouettes match the mob roster 1:1)
- `src/render/assetLoader.js`: GLTFLoader + `SkeletonUtils.clone` (required — regular clone T-poses), cached promises, `?nomodels=1` gate, null on failure → primitive fallback
- `CharacterView`: primitive instantly, async GLB upgrade (auto-scale to `MODEL_DEFS[kind].height`, feet at y=0), AnimationMixer + crossfades; sim state machine → clips via `MODEL_DEFS.clips`; `attackLockMs` triggers a one-shot `Throw`; ladder/rope = Idle facing away (no climb clip in the pack); side-view yaw `dir * (π/2 − MODEL_YAW_TILT)`
- `MobsView`: per-type models, patrol=walk / aggro=run clips, `Death_A` one-shot on removal (material fade in the back half); scale-pop retained as primitive fallback
- NPCs render via CharacterView owned by main.js (removed from the static mapView builder)
- Remote players animate through the same path (`state` + dtSec plumbed through RemotePlayersView)
- Payload contract: `player.clip`, `mobs[].clip` ('primitive' until loaded), `renderInfo {calls, triangles}`

## Out of scope

- Map/terrain art (blockout stays this milestone; terrain art is its own later pass)
- Gear visuals on the model (M10 decides data-first vs visual gear)
- Facial expressions, emotes

## Dependencies

- **Depends on:** M07 order-wise (user-chosen sequence); technically only M02+ (state machine)
- **Blocks:** M09 (ship it looking right)

## Acceptance criteria

- [x] Player renders as a rigged GLB; sim states drive distinct clips (idle vs run vs jump/fall vs crouch) — test: `tests/e2e/assets.spec.js::player model and clips`
- [x] Each mob type renders its own model with walk/die animations — test: `tests/e2e/assets.spec.js::mob models`
- [x] Fallback: with models disabled (`?nomodels=1`), primitives render and the console stays clean — test: `tests/e2e/assets.spec.js::primitive fallback`
- [x] Frame rate holds — draw calls < 120 via renderer.info in payload — test: `tests/e2e/assets.spec.js::draw calls within budget` (live: 43 calls / ~17k triangles on field1)
- [x] The look lands (chibi proportions, palette, animation feel) — verified by user playtest ("ok", 2026-07-18)

## Exit condition

User walks the field as a real chibi assassin — running, jumping, climbing, throwing all animate; skeletons walk/run and die with their own animations; Nara stands in the shop as a person, not a capsule.

## Test plan

Red-then-green on clip-name payload assertions + fallback spec (red committed b64373b). Visual quality is user playtest. Regression: full suite 66/66 green (views only; sim untouched).

## Notes

- KayKit GLB URLs: `https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-<Adventures|Skeletons>-1.0/main/addons/kaykit_character_pack_<adventures|skeletons>/Characters/gltf/<Name>.glb`. Clip names extracted by parsing the GLB JSON chunk (Python struct/json) — key clips: `Idle`, `Running_A`, `Jump_Idle`, `Lie_Idle`, `Throw`, `Walking_D_Skeletons`, `Death_A`.
- ~21MB of GLBs committed directly (LFS deferred — revisit if the model folder keeps growing).
- No climb clip exists in the pack → ladder/rope plays Idle facing away from camera; acceptable for now, playtest-tunable.
- Keep every model swap inside CharacterView/MobsView — if a change wants to touch the sim, the abstraction is being violated; stop and re-read ADR-0002.
- Meshy remains an option for bespoke models later (MESHY_API_KEY), but KayKit covers v1.
