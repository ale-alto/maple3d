# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-14 by Claude (Fable 5) — M01+M02 development session

## Current phase

development

## Current milestone

M01–M04 done (M04 user-approved 2026-07-14). Next: M05 Field 2 + mob roster (docs/milestones/05-field2-mob-roster.md, status: planned), then M06 PartyKit shared world.

## Last action

M02 combat completed and closed. Movement/attack are 1:1 with the official MSW model — full mapping lives in docs/reference/msw-parity.md (source of truth; don't re-crawl the Nexon docs, they're JS-rendered and painful). Playtest-driven revisions layered onto M01/M02, all regression-locked (suite 26/26):

- Committed air momentum + subtle AIR_ACCEL steering (the assassin kite); firm landing (no-input touchdown plants); snappier arc (GRAVITY 45, apex ~2.0u preserved)
- Down jump (Down+Alt through thin platforms); crouch/prone (Down on ground blocks movement, no floor jump)
- Ladders: direction-aware grabs (fixed top/bottom wiggle), top exit pops onto ledge, rope bottoms drop you off, leap-off requires Alt+direction
- Grounded attack lock (stand-and-throw); contact knockback (pop away from mob) + 1s i-frames (matches MSW built-in PlayerHit)
- Stars: classic target-lock model — press locks nearest mob in forward rect (STAR_RANGE 7 × ±STAR_SELECT_HALF_HEIGHT 1.5), star homes to lock, fizzles if lock dies, whiffs hit nothing; platform mobs need level access. (History: 45° free-aim → flat flight → target-lock, all same day, user-corrected)
- Named state machine in payload: idle/move/crouch/jump/fall/ladder/rope + attackLockMs — the animation contract for the Meshy GLB milestone

## Next step

Start M05 via development.md: red specs first per 05-field2-mob-roster.md AC (tests/e2e/field2.spec.js — portal chain, per-type mob stats, type-scaled xp/drops, type-3 melee-vs-ranged decision goes to the user at red-test time). Build: mob type system in constants + mobs.js (mobSpawns gain `type`), field2 map module, per-type drop tables in loot.js, MobsView type variants. M04 systems available: src/sim/maps/{index,town}.js, src/sim/shop.js, src/ui/shopPanel.js, changeMap (M06 reuses as join-room), save v2, upPressed edge for portals/NPCs.

## Blockers

none

## Notes for next session

- Open tuning candidates (non-blocking, in 02-combat.md Notes): MOB_MAX_HP 60 = 8 hits/kill feels tanky; mob respawn camping (softened by knockback). M03's damage scaling will rebalance anyway.
- Player HP is only visible via red damage numbers until the M03 HUD lands.
- Test-flake playbook that evolved this session: background rAF frames keep simulating between tool roundtrips — any timing-sensitive assertion must run as ONE synchronous in-page evaluate (see contact damage / star throw / platform-mob specs for the pattern); position-sensitive combat setups should teleport-re-engage rather than rely on sustained contact (knockback breaks overlap).
- Word "window" (or document/navigator/localStorage) in src/sim comments trips the purity spec regex — phrase comments accordingly. M03's localStorage save code must live OUTSIDE src/sim (localStorage is DOM — put persistence in src/core or main.js, feeding plain objects to/from the sim).
- Browser pane: screenshots time out on this machine; use gl.readPixels via window.__debug. The pane occasionally kills the dev server — preview_start maple3d-dev to restart. Hidden-tab HMR can lag: after editing source, verify the page actually reloaded before trusting live checks (a stale module produced a ghost bug this session).
- Controls: arrows move/climb, Alt jump (+direction on ladders to leap off; Down+Alt = down-jump), Ctrl attack, Z loot (M03).
