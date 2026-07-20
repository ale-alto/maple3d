# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-18 by Claude (Fable 5) — M08 free-asset session

## Current phase

development

## Current milestone

**M01–M11 built** (M11 implemented + L7 double-numbers fix; suite 76/76). **DIRECTION CHANGE 2026-07-19: user wants exact 1:1 pre-BB MapleStory mechanics ("no guesswork"), our 3D art only. Full job-ladder fidelity chosen (Rogue@10→Assassin@30→Hermit@70, cap rises).** Spec: docs/reference/ms-v62-mechanics.md (sourced; anything not in it gets researched before coding). Parity ladder: M12 character sheet → M13 jobs → M14 items → M15+ Assassin/Hermit. Live: https://ale-alto.github.io/maple3d/.

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

**M12 + M13 DONE (user-approved 2026-07-20).** Start **M14 items** on user "go": real throwing-star types with WA (Subi etc.), claw WA values replacing BASE_WA 30 interim, real potion table, mob stat pass (contact-damage formula vs the disorder wdef half).

M13 as-built: player.job beginner|rogue; trainer NPC "Instructor Vey" in town (Up → #job-panel, #job-advance; walk-away closes); tryAdvanceJob in sim/skills.js (level≥10 + DEX≥25 → +100–150 HP/+25–50 MP roll, full restore, sp += 1+3·(level−10) catch-up); beginners earn NO SP (progression job-gated; setXp hook job-aware); SKILLS = real Rogue kit (nimbleBody +lv acc/avoid → combat acc + payload; keenEyes +0.4375u/lv star range via starRangeOf → selectTarget; disorder D key → mob.disorderMs/disorderAtk, contact damage −atk floor 1, no reapply; darkSight V key → player.hiddenMs/hiddenSpeedMult — no aggro (mobs.js skips hidden players incl. server-side via presence hidden flag), no contact/shots, can't attack, run speed × table mult); Flash Jump REMOVED (player.js mid-air Alt inert again; returns at Hermit M15+); save v6 (job; v5 migration: job by level, FJ points refunded into sp = max(0, 1+3·(lvl−10) − spent)); party server: disorder relay (clamped), MAX_DAMAGE 40→400 (L7 headroom), peer.hidden; __test.advanceJob(). Deliberate skills.spec rewrite (setupRogue helper; FJ test → absence guard).

M12 as-built: src/sim/stats.js (rollNewStats 4/4+17 dice, basicRange/l7Range/thiefAccuracy/thiefAvoid/hitChance/expToNext/levelUpGains/expectedPools), stats-actions.js (assignAp), combat rolls per star at press (combat.rand seeded; star carries damage+miss; MISS fx via mob:missed), totalWa = BASE_WA 30 interim + claw attack (M14 makes items real), SKILLS.luckySeven real 20-level table (pct 58–150, mp 8–16), stepMp = discrete 3-per-10s tick (mpRegenMs; setMp resets phase), progression uses exact curve + rolled pool gains (beginner<10/thief≥10), MOB_TYPES gain level/avoid (blob 2/1, bruiser 5/1.3, spitter 8/4 — spitter accuracy-gates low levels, authentic), save v5 (stats/ap/maxHp/maxMp; v4 migrates: fresh dice + all AP unspent + expectedPools), S #stat-panel, HUD ATT min~max, payload stats/ap/accuracy/damageRange, hooks setStats + setXp/setMp reworked. DELIBERATE spec rewrites: progression (exact curve), gear weapon test (WA-multiplied ranges), skills L7 (range-based), field2 (setXp(3) first — level-1 needs only 15 xp now). PLAYER_MAX_HP/XP_BASE constants remain only for old spec imports — clean up in M13.

**M10 as-built** (details in docs/milestones/10-gear-itemization.md Notes): src/sim/items.js pure gear module; GEAR_TIERS (Bronze/Steel/Dark Claw, Cloth/Leather/Shadow Garb; stat rolls at drop); MOB_TYPES gearChance/gearTierMax (3%/4.5%/6%, tier caps 1/2/3); playerAttack = level curve + weapon; armor soak min 1; rollDrops appends gear (server rolls it too — same sim import); pickup → inventory.bag (BAG_MAX 24, full bag refuses); save v3 migrates v2; #inv-panel (I key, classic window styling); Nara sells Bronze Claw 80m; HUD ATT chip; __test.grantGear(slot,tier) max-roll hook (emits loot:picked so the open panel repaints); persist on gear:equipped. Push to master auto-deploys the live site.

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
