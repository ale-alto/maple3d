# Milestone 06: Shared world — see other players hunting beside you

## Status

in-progress — all 5 automated AC green 2026-07-14 (55/55 suite, no single-player regressions); awaiting user playtest of latency feel (two windows)

## Objective

Deliver the gameplan's day-one promise: everyone on a map shares a PartyKit room — you see other players moving and hunting with name tags and chat bubbles, and mob state is server-owned so shared hunting looks coherent. This is the payoff for the sim purity rule: the mob/combat sim moves into the room server largely unchanged.

## Scope

- PartyKit project (`party/`): room per map; server runs the authoritative mob sim (spawn/patrol/aggro/hp/death/respawn) on a tick, using the same `src/sim/mobs.js`
- Client (`src/net/`): partysocket connection per current map; join/leave on `changeMap`
- Presence: broadcast local player state (pos/facing/state) at a throttle; render remote players via CharacterView + name tag
- Server-owned mobs: clients send attack hits to the server (server validates target-lock plausibility loosely), server broadcasts hp/death/respawns; local prediction keeps feel snappy
- Loot stays per-player (gameplan): server rolls drops per killer, sends privately
- Chat: text input → chat bubble over the character (plain DOM overlay)
- Offline fallback: no room reachable → current single-player behavior
- Multi-client Playwright spec (two pages, one room)

## Out of scope

- Parties/XP share (backlog #7), trading (backlog #2 — forces server characters + ADR), PvP (anti-goal)
- Server-side character storage (characters stay client-owned/localStorage per ADR-0001)

## Dependencies

- **Depends on:** M04 (map/room mapping); M05 recommended (more world to share)
- **Blocks:** nothing in v1; trading/economy would build on it later

## Acceptance criteria

- [x] Two clients on the same map see each other move with name tags — test: `tests/e2e/multiplayer.spec.js::presence`
- [x] Mob state converges: a mob killed by client A dies for client B; respawns appear for both — test: `tests/e2e/multiplayer.spec.js::server-owned mobs converge`
- [x] Chat bubble shows over the speaker for both clients — test: `tests/e2e/multiplayer.spec.js::chat bubbles`
- [x] Loot is per-player: A's kill drops are invisible to B — test: `tests/e2e/multiplayer.spec.js::private drops`
- [x] Disconnect/offline falls back to local sim without errors — test: `tests/e2e/multiplayer.spec.js::offline fallback` (plus: the 50 single-player specs run with the party server up and stay pure-local)
- [ ] Latency feel while hunting together — verified by user playtest

## Exit condition

User opens two browser windows on the same field → both characters visible with name tags, hunting the same mobs coherently, chat bubbles popping.

## Test plan

`/add-multiplayer` skill patterns for scaffolding; two-page Playwright fixtures asserting state convergence via each page's `render_game_to_text()`. Local `partykit dev` in the webServer chain. Regression: single-player suite must stay green with no room running (offline fallback).

## Notes

- No ADR needed: the party server imports `../src/sim/*` directly and PartyKit's esbuild bundles it — the sim-purity rule made this a plain relative import, no tooling.
- Implementation (2026-07-14): multiplayer is **opt-in via `?mp=1`** (`?name=` sets display name, `?mproom=` isolates a room instance — tests use this). Default page load never opens a socket, which is what keeps the 50 single-player specs deterministic with the party server running. Promoting to on-by-default is a later UX decision.
- Server: 20Hz sim tick, 10Hz mob snapshots, per-mob nearest-player aggro, ghost-peer prune at 1Hz (hard-killed sockets never fire onClose), room resets to a fresh field when empty (channel behavior). Hit validation clamps damage; chat capped 120 chars.
- Client: server mobs applied by snapshot (stars keep locks by id; contactDamage re-patched from MOB_TYPES); presence lerp on remote views; XP granted only to the kill's `killerId`; server-rolled loot lands via the shared spill physics. Chat: Enter opens the input; keyboard ignores game keys while typing.
- Known v1 divergences (accepted): server trusts presence positions (a hacked client could report any x/y — fine for co-op v1); spitter shots removed locally on player-hit continue server-side for others; between 10Hz snapshots mobs hold last state (interpolation = polish backlog).
- Local playtest: `npm run mp` (party server) + `npm run dev`, then two windows at `localhost:5173/?mp=1&name=A` / `?mp=1&name=B`. Deploy later via `npx partykit login --provider github` + `deploy` (skill's deploy.md).
