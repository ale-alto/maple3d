# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-18 by Claude (Fable 5) — M08 free-asset session

## Current phase

development

## Current milestone

**M01–M08 DONE. M09 DEPLOYED 2026-07-19** — live at https://ale-alto.github.io/maple3d/ (server: maple3d-world.ayyitsdrayy.workers.dev); exit condition = user plays with a friend. Next: M10 gear → M11 skills.

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

M09 deployed — remaining: user sends a friend the URL (exit condition), then mark done and start **M10 gear/itemization** (item model, rare gear drops with stat rolls, equip UI (I key), derived attack/defense, save v3, starter claw in shop).

**M09 as-built** (see docs/milestones/09-deploy.md for full detail): PartyKit hosted platform is DEAD for new deploys (partykit.dev hit CF's 10k-domain zone limit) → ported party/index.js to **partyserver** in the user's own Cloudflare account (login: ayyitsdrayy@gmail.com, subdomain ayyitsdrayy registered via API — wrangler can't do it non-interactively). Key facts: DO binding `Main` → URL party `main` (PartySocket-compatible); onMessage arg order SWAPPED vs partykit (conn, msg); local dev/tests = `wrangler dev --port 1999` (playwright.config webServer updated); `.npmrc` legacy-peer-deps (partyserver wants workers-types ^4, wrangler ^5); client built with DEPLOY_BASE=/maple3d/ + VITE_MP_HOST + VITE_MP_DEFAULT=1 via .github/workflows/deploy.yml (auto-deploys on push to master; repo ale-alto/maple3d is PUBLIC — free Pages requires it; gh CLI installed + authed with workflow scope). BASE_URL-aware asset/audio fetches. Verified live: models load on the subpath, two browsers converged in field1 on the deployed URL. Backlog #8 (IP-safe naming) still REQUIRED before promoting beyond friends.

Post-approval M08 polish shipped same day (all live-verified, suite 66/66 each): billboard mob hp bars (counter-rotate vs facing yaw), hp bar drains to 0 on the killing blow, classic v62 status bar HUD (navy dock, LV. plate, Rogue+name, HP[x/y] in-bar values, EXP n[pct%], SHOP/SOUND buttons, "To All" persistent chat strip — chat.js reworked, keyboard ignores focused inputs), KayKit dungeon loot props (coin/stack tiers by amount, corked potion bottle, public/models/loot/, assetLoader.loadProp with per-instance materials for owner-dim), procedural shuriken (src/render/shuriken.js, shared ExtrudeGeometry) for star projectile + starPack drops.

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
