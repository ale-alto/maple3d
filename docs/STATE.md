# Session state

> Updated at the end of each session that made progress. Read first at the start of each session.

## Last updated

2026-07-13 by Claude (Fable 5)

## Current phase

scaffold (idea phase completed this session; no code exists yet)

## Current milestone

None written yet — scaffold first, then milestone planning.

## Last action

Ran the full idea phase for "Maple3D" (working title): 2.5D side-scrolling MapleStory-like on 3D maps, assassin class, grind-level-loot loop, shared world from day one (PartyKit, server-owned mobs, client-owned characters in localStorage). Wrote gameplan.md, tech.md, ADR-0001, backlog.md. Then the user overrode the art style: characters/mobs are fully 3D modeled (chibi low-poly, MapleStory-2 direction) — ADR-0002 written (placeholder rigs during development, Meshy AI GLB generation as a late asset milestone, CharacterView abstraction so the swap is cheap); gameplan/tech/backlog updated. No code written.

## Next step

Scaffold phase per make-game `phase-pipelines/scaffold.md`: `npm create vite@latest` (vanilla JS template) in this directory, `npm install three`, pin versions in tech.md, boot smoke test (scene renders, console clean), then AGENTS.md/CLAUDE.md via agents-bootstrap. After scaffold: milestone planning (proposed M01 walking skeleton: one field-map blockout, billboarded player sprite, classic Maple controls, side-view camera).

## Blockers

none

## Notes for next session

- All idea-phase decisions are in gameplan.md — do not re-ask.
- Controls are classic Maple: arrows move/climb, Alt jump, Ctrl attack, Z loot.
- Sim purity rule matters from the first line of code: `src/sim/` never imports Three.js/DOM (mob sim must run inside the PartyKit room later).
- User also has a paused game project (PARADIS: Breach in C:\Users\ayyit\infinite-world) — same pipeline, its STATE.md says "milestone planning next." Don't confuse the two.
- User is a trader by background, technical, prefers seeing things work (visual proof) — playable checkpoints early beat long refactors.
