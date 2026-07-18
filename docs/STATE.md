# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-18 by Claude (Fable 5) — M08 free-asset session

## Current phase

development

## Current milestone

M01–M07 done (M07 user-approved 2026-07-18). **M08 (real chibi models) implementation COMPLETE — suite 66/66, live-verified — awaiting user look-playtest to close.** Then: M09 deploy → M10 gear → M11 skills.

## Last action

M08 implemented on the **free path** (user asked "is there a free model/animation thing" — Meshy's paid credits rejected; KayKit CC0 packs approved with "go"):

- **Models** (public/models/, ~21MB, CC0, committed directly — LFS deferred): Rogue_Hooded=player (real `Throw` clip), Mage=Nara, Skeleton_Minion/Warrior/Mage=blob/bruiser/spitter. GitHub raw URLs + clip names in docs/milestones/08-meshy-assets.md Notes.
- **src/render/assetLoader.js** (new): GLTFLoader + SkeletonUtils.clone (regular clone T-poses!), cached promises, `?nomodels=1` gate, null-on-fail → primitive fallback.
- **CharacterView rewrite**: primitive instantly → async GLB upgrade (auto-scale to MODEL_DEFS height, feet y=0), mixer crossfades from sim state machine, attackLockMs → one-shot Throw (400ms re-trigger gate), climbing = Idle facing away (pack has no climb clip), yaw `dir*(π/2−MODEL_YAW_TILT=0.35)`. `currentClip`='primitive' until loaded; `disposed` flag guards late loads.
- **MobsView rewrite**: per-type models, patrol=Walking_D_Skeletons / aggro=Running_A, Death_A one-shot on removal (900ms, material fade back half); scale-pop stays as primitive fallback; `clipOf(id)` feeds payload. HP bar repositioned to just over model head (was floating ~0.8u high — caught in live-verify).
- **main.js**: npcViews (CharacterView('npc') per map.npcs, rebuilt in changeMap), real frame dt → draw(dtSec) → all mixers, payload adds player.clip / mobs[].clip / renderInfo{calls,triangles}.
- **remotePlayersView**: passes `state`+dtSec through so remote players animate; disposed flag on remove.
- Tests: tests/e2e/assets.spec.js (4 specs, red committed b64373b) now green; full suite 66/66.
- Live-verified in pane: player Idle/Running_A/Jump_Idle/Throw all fire, Nara renders as witch-hat mage in town, skeletons patrol/aggro on field2, console clean, 43 draw calls / 16.7k tris.

## Next step

**Gate: user playtests the look** (chibi proportions, animation feel — the one unticked AC). On approval: mark M08 done, then M09 deploy (partykit login `--provider github` — clerk flow dead; client hosting; VITE_MP_HOST; multiplayer-default decision backlog #12).

## Blockers

none

## Notes for next session

- Playtest-tunable M08 items: ladder/rope pose (Idle facing away — no climb clip in the pack; could bob or slow-yaw later), MODEL_YAW_TILT 0.35, mob HP bar heights, Throw one-shot 400ms gate vs 720ms cast.
- Screenshots WORK in the pane again this session (previous note said they time out — machine-dependent, try screenshot first, fall back to gl.readPixels via __debug).
- Test-flake playbook (standing): background rAF keeps simulating between tool roundtrips — timing-sensitive assertions must be ONE synchronous in-page evaluate; teleport re-engagement for combat; ?mproom= isolation for parallel MP specs.
- Word "window"/document/navigator/localStorage in src/sim comments trips the purity spec regex — phrase comments accordingly.
- Controls: arrows move/climb, Alt jump (single), Ctrl attack (720ms cast, rooted, consumes 1 star), Z loot (hold to vacuum), C potion, Enter chat, M mute, 🔊 audio panel.
- Suno BGM drop-ins remain anytime upgrade: public/audio/{town,field1,field2}.mp3 auto-preferred over procedural.
- M06 systems map + earlier history: see git log and docs/milestones/01–07.
