# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-14 by Claude (Fable 5) — M01+M02 development session

## Current phase

development

## Current milestone

M01–M06 done. **M07 audio in-progress**: all 3 automated AC green (61/61 suite), engine live-verified; remaining: user LISTENING playtest (jingle feel, BGM loops, SFX fatigue). Then M08 Meshy assets → M09 deploy → M10 gear → M11 skills.

## Last action

M02 combat completed and closed. Movement/attack are 1:1 with the official MSW model — full mapping lives in docs/reference/msw-parity.md (source of truth; don't re-crawl the Nexon docs, they're JS-rendered and painful). Playtest-driven revisions layered onto M01/M02, all regression-locked (suite 26/26):

- Committed air momentum + subtle AIR_ACCEL steering (the assassin kite); firm landing (no-input touchdown plants); snappier arc (GRAVITY 45, apex ~2.0u preserved)
- Down jump (Down+Alt through thin platforms); crouch/prone (Down on ground blocks movement, no floor jump)
- Ladders: direction-aware grabs (fixed top/bottom wiggle), top exit pops onto ledge, rope bottoms drop you off, leap-off requires Alt+direction
- Grounded attack lock (stand-and-throw); contact knockback (pop away from mob) + 1s i-frames (matches MSW built-in PlayerHit)
- Stars: classic target-lock model — press locks nearest mob in forward rect (STAR_RANGE 7 × ±STAR_SELECT_HALF_HEIGHT 1.5), star homes to lock, fizzles if lock dies, whiffs hit nothing; platform mobs need level access. (History: 45° free-aim → flat flight → target-lock, all same day, user-corrected)
- Named state machine in payload: idle/move/crouch/jump/fall/ladder/rope + attackLockMs — the animation contract for the Meshy GLB milestone

## Next step

User listens: click once (autoplay unlock), hunt with sound — field arpeggio loop under throws/hits/pops, level-up jingle over the flash, portal whoosh on map change, M mutes. Drop real Suno tracks into public/audio/{town,field1,field2}.mp3 anytime — the engine auto-prefers files over the procedural loops. Then mark M07 done and start M08 (Meshy assets — needs MESHY_API_KEY from the user; meshyai skill; swap via CharacterView per ADR-0002).

M06 systems: party/index.js (room per map, imports src/sim directly — 20Hz tick, 10Hz snapshots, ghost-peer prune, per-killer loot rolls), src/net/networkManager.js (?mp=1 gate, ?mproom= room isolation for tests), src/render/remotePlayersView.js (lerped views + name tags + bubbles), src/ui/chat.js (Enter to talk; keyboard ignores keys while typing), combat/mobs/loot refactors (stepMobs takes players[], stepMobProjectiles extracted, rollDrops/spawnDropsFromItems split, net.sendHit path). Also fixed in passing: respawn granted 2 jumps (pre-single-jump leftover).

## Blockers

none

## Notes for next session

- Open tuning candidates (non-blocking, in 02-combat.md Notes): MOB_MAX_HP 60 = 8 hits/kill feels tanky; mob respawn camping (softened by knockback). M03's damage scaling will rebalance anyway.
- Player HP is only visible via red damage numbers until the M03 HUD lands.
- Test-flake playbook that evolved this session: background rAF frames keep simulating between tool roundtrips — any timing-sensitive assertion must run as ONE synchronous in-page evaluate (see contact damage / star throw / platform-mob specs for the pattern); position-sensitive combat setups should teleport-re-engage rather than rely on sustained contact (knockback breaks overlap).
- Word "window" (or document/navigator/localStorage) in src/sim comments trips the purity spec regex — phrase comments accordingly. M03's localStorage save code must live OUTSIDE src/sim (localStorage is DOM — put persistence in src/core or main.js, feeding plain objects to/from the sim).
- Browser pane: screenshots time out on this machine; use gl.readPixels via window.__debug. The pane occasionally kills the dev server — preview_start maple3d-dev to restart. Hidden-tab HMR can lag: after editing source, verify the page actually reloaded before trusting live checks (a stale module produced a ghost bug this session).
- Controls: arrows move/climb, Alt jump (SINGLE jump only — no double jump as of 2026-07-14; +direction on ladders to leap off; Down+Alt = down-jump), Ctrl attack (rooted ~650ms/throw, slower cadence), Z loot (hold to vacuum drops you walk over), C potion.
- 2026-07-14 feel fixes (all live-verified, suite 50/50): no double jump (JUMP_VELOCITY 15, apex ~2.5u); hold-Z vacuums loot while walking; attack box centered on player BODY (STAR_SELECT_HALF_HEIGHT 1.1) so platform mobs need level access and jump-to-level connects.
- 2026-07-14 ATTACK AUTHENTICITY (researched real MapleStory, not MSW — see msw-parity.md "Real-MapleStory combat facts"): **throwing stars are consumable ammo** — inventory.stars, spend 1/attack, empty=no throw, refill via starPack drops (+50) and shop (+50), cap 800, start 100, shown in HUD; **720ms cast** = authentic Fast (4) claw (was 650); homing CONFIRMED authentic (kept). Star ammo touches combat.js (consume), loot.js + shop.js (refill via 'starPack'→inventory.stars), main.js (inventory.stars, setStars hook, stepCombat gets inventory param, save on 'shop:bought'), HUD. Legacy inventory.starPacks removed/migrated.
