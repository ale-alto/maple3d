# Milestone 06: Shared world — see other players hunting beside you

## Status

planned

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

- [ ] Two clients on the same map see each other move with name tags — test: `tests/e2e/multiplayer.spec.js::presence`
- [ ] Mob state converges: a mob killed by client A dies for client B; respawns appear for both — test: `tests/e2e/multiplayer.spec.js::server-owned mobs`
- [ ] Chat bubble shows over the speaker for both clients — test: `tests/e2e/multiplayer.spec.js::chat bubbles`
- [ ] Loot is per-player: A's kill drops are invisible to B — test: `tests/e2e/multiplayer.spec.js::private drops`
- [ ] Disconnect/offline falls back to local sim without errors — test: `tests/e2e/multiplayer.spec.js::offline fallback`
- [ ] Latency feel while hunting together — verified by user playtest

## Exit condition

User opens two browser windows on the same field → both characters visible with name tags, hunting the same mobs coherently, chat bubbles popping.

## Test plan

`/add-multiplayer` skill patterns for scaffolding; two-page Playwright fixtures asserting state convergence via each page's `render_game_to_text()`. Local `partykit dev` in the webServer chain. Regression: single-player suite must stay green with no room running (offline fallback).

## Notes

- ADR check at implementation time: if the sim-sharing between client and party server needs a build/tooling decision (shared package vs direct import), write ADR-0003.
- Tick rate, interpolation, and throttle values in constants; start crude (10Hz presence, server 20Hz) and tune.
