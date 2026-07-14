# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-13 by Claude (Fable 5) — scaffold session

## Current phase

development (scaffold completed 2026-07-13)

## Current milestone

M02 combat (docs/milestones/02-combat.md, status: in-progress). All 6 automated AC green (13/13 suite); remaining: user playtest of combat feel + exit condition.

## Last action

Scaffold phase completed per make-game scaffold.md:

- create-vite 9.1.1 `vanilla` (JS) template; three 0.185.1, vite 8.1.4, @playwright/test 1.61.1 (pinned in tech.md). Gotcha: `npm create vite -- --template X` mangles the flag — use `npx create-vite@latest <dir> -t <template>`.
- Boot scene (src/render/bootScene.js): side-view camera, grassy ground strip, placeholder capsule with idle bob; src/core/constants.js started.
- Agent hooks live: `window.render_game_to_text()`, `window.advanceTime(ms)`, `window.__debug` ({renderer, scene, camera}).
- Smoke test PASSED: console error-free; gl.readPixels confirms sky/ground/capsule pixels; 2 draw calls, 556 tris; advanceTime steps deterministically.
- AGENTS.md + CLAUDE.md bootstrapped; git repo initialized, initial commit fb0f0a0 (repo-local identity ayyitsdrayy <ayyitsdrayy@gmail.com> — correct if wrong).
- Launch config: session-level C:\Users\ayyit\.claude\launch.json has `maple3d-dev` (npm run dev --prefix maple3d, port 5173); repo also has its own .claude/launch.json.

## Next step

User re-playtests M02 movement + combat. Movement is now grounded in the official MSW RigidbodyComponent model (see gameplan References): committed air momentum + subtle AIR_ACCEL steering, firm landing, snappier arc (GRAVITY 45), down jump (Down+Alt through thin platforms), vertical star auto-aim. Suite is 18/18. Known tuning candidates: MOB_MAX_HP 60 feels tanky (8 hits/kill); respawned mobs can camp the player (see 02-combat.md Notes). Then mark M02 done and start M03 (progression) red tests. Note: player HP is only visible via red damage numbers until the M03 HUD.

## Blockers

none

## Notes for next session

- Browser pane quirks found this session: rAF is throttled in hidden pane tabs (simTime won't advance on its own — always verify via advanceTime), and `computer screenshot` times out in this environment; use gl.readPixels via window.__debug for visual proof. drawImage-based canvas capture reads stale buffers — don't trust it.
- bootScene.js is throwaway; M01 replaces it with the real map/render split. Keep the syncSize-in-loop pattern (hidden tab loads report 0x0 and fire no resize event).
- Sim purity rule from the first line of M01: src/sim/ never imports Three.js/DOM.
- Controls: arrows move/climb, Alt jump, Ctrl attack, Z loot.
- STATE.md's earlier "billboarded player sprite" idea is obsolete — ADR-0002 made characters fully 3D (primitive chibi placeholders until the Meshy milestone, backlog #10).
