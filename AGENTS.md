# AGENTS.md

> Lean enforcement file for any AI agent working in this repository. Read this file **first**, every session, before any other action. Cross-tool standard (Cursor, Aider, Codex, Claude, etc.). Claude users: `CLAUDE.md` points here.

This project follows the [`make-game`](https://github.com/OpusGameLabs/game-creator) pipeline. Do not improvise process — follow the rules below.

## Project overview

- **Title:** Maple3D (working title)
- **Pitch:** MapleStory's grind-level-loot dopamine loop reborn in full 3D: chibi 3D characters and mobs on real 3D maps, gameplay still pure side-scrolling Maple — a shared world where you see other players hunting beside you from day one.
- **Genre / type:** 2.5D side-scrolling MMO-lite (hunt–level–loot loop, assassin class)
- **Engine:** Three.js 0.185.1 (npm) on Vite 8.1.4
- **Language:** JavaScript (ES modules) — no TypeScript for v1 (ADR-0001)
- **Target platform:** Desktop browser, keyboard only (no mobile/touch — explicit anti-goal)

## Hard gate: no code before plan

If `docs/gameplan.md` does not exist in this repo, you are in the **idea phase** — do **not** create source files, run engine scaffolders, or install dependencies. Your only job is to walk the user through the idea-phase clarifying-questions checklist (gameplay loop, art style, controls/scope, engine/stack — see `make-game` skill `phase-pipelines/idea.md`) and produce `docs/gameplan.md`, `docs/tech.md`, and `docs/architectural-decisions/0001-engine-and-stack.md`. A detailed-sounding initial prompt is **not** a substitute for the checklist; ask every item even if the user "seems clear."

## Mandatory: run the make-game skill

Every session in this directory **must** run the `make-game` skill's session-start sub-pipeline before any other work. The skill enforces phase awareness, doc continuity, milestone discipline, and the live-iterate verification loop.

If the skill is not installed in your environment:

```
npx skills add opusgamelabs/game-creator --skill make-game -p -y
```

If the skill cannot be installed (e.g. unsupported agent tool), apply the rules in this file manually and tell the user the skill is missing.

## Source-of-truth files

These docs are the agreed state of the project. Read them at session start; do **not** unilaterally edit them — propose changes and get user confirmation first.

- `docs/STATE.md` — last session handoff. Read first, every session.
- `docs/gameplan.md` — game definition (loop, rules, art, audio, anti-goals).
- `docs/tech.md` — stack, tooling, conventions.
- `docs/milestones/` — feature work breakdown with acceptance criteria.
- `docs/architectural-decisions/` — locked top-level decisions (engine/stack ADR-0001, 3D character art pipeline ADR-0002).

## Architecture rules

- **EventBus singleton** (`src/core/`) — all cross-module communication via pub/sub. Modules never import each other directly. Events use `domain:action` naming (`mob:died`, `player:levelup`, `loot:picked`).
- **GameState singleton** (`src/core/`) — single centralized state object. Systems read; events trigger mutations.
- **`src/core/constants.js`** — every magic number, color, timing, speed lives here. Zero hardcoded values in game logic.
- **Sim purity rule** — nothing in `src/sim/` may import Three.js or touch the DOM. Mob logic must run identically headless inside the PartyKit room server. This applies from the first line of code.
- **CharacterView abstraction** (`src/render/`) — every entity renders through a CharacterView (position/facing/animation-state in, visuals out) so primitive placeholders swap for Meshy GLB models without touching sim or game logic (ADR-0002). Facing = left/right yaw flip.
- **`window.render_game_to_text()`** — exposes a JSON snapshot of current game state for agent inspection without screenshots.
- **`window.advanceTime(ms)`** — steps the simulation deterministically for verification. Note: the Browser pane throttles rAF in hidden tabs — always verify via `advanceTime` + `render_game_to_text`, never by waiting wall-clock time.

## Stack-specific commands

- **Dev server:** `npm run dev` (Vite, port 5173)
- **Tests:** `npx playwright test` (Playwright installed; test suite starts at M01)
- **Build:** `npm run build`
- **Lint / format:** n/a (consistent hand style, 2-space indent)

## Live iterate (after every code change)

After any meaningful code change in the development phase:

1. Confirm dev server is live; check console — must be error-free.
2. Call `render_game_to_text()` and verify state matches the change.
3. For time-dependent changes, step with `advanceTime(ms)` and re-read.
4. If visual, take a screenshot; save under `output/iterate/`.
5. Smoke-check adjacent state for regressions.
6. Hand back to the user with a one-line verdict and one focused question.

A change is **not done** until this loop has run.

## Append vs spawn a new milestone

When new work surfaces:

- **Append** an AC to the current milestone if the work is in-scope refinement.
- **Spawn** a new milestone if the work is out of scope but related; use `Depends on:` to capture ordering.
- **Inline** trivial fixes (typos, one-liners) on the current milestone.

When in doubt, prefer spawning. Do not bloat milestones.

## Minimum-viable doc mode

If the user pushes back on documentation overhead, downgrade — do **not** skip:

- One-line milestone entry (title + AC) is acceptable.
- `docs/STATE.md` updates remain mandatory.
- `docs/gameplan.md` and `docs/tech.md` must exist.
- Engine / language / stack ADRs cannot be skipped.

## What to do if `make-game` isn't loaded

If the skill is missing or didn't trigger this session:

1. Stop. Do not start coding.
2. Read this file in full.
3. Read `docs/STATE.md`, then `docs/gameplan.md`, then `docs/tech.md`.
4. Identify the current phase and the open milestone.
5. Tell the user the skill isn't loaded and recommend they install it.
6. If proceeding without the skill, apply the rules above manually and update `docs/STATE.md` at the end of the session.

## Last regenerated

2026-07-13 by Claude (Fable 5) / make-game scaffold. Regenerate when the engine, primary commands, or architecture rules change. The doc-drift audit will flag staleness.
