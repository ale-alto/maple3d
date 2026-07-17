# Milestone 09: Friends can play from their own machines

## Status

planned

## Objective

Ship it: the PartyKit room server deployed to Cloudflare's edge and the client built + hosted over HTTPS, so two people on different machines share a field by opening a URL. Multiplayer stays opt-in (?mp=1) or graduates to on-by-default — decided at implementation with the user.

## Scope

- `npx partykit login --provider github` (one-time, user does the device-code auth) + `npx partykit deploy` → capture `https://maple3d-world.<user>.partykit.dev`
- `VITE_MP_HOST` env wiring (`.env` local / hosting env prod) so the client targets the deployed server; `.env.example` documented
- `npm run build` production build; host `dist/` (options at implementation: here.now, GitHub Pages, Cloudflare Pages — pick with the user)
- HTTPS/WSS check (partysocket derives wss from https)
- Decide multiplayer default (on vs ?mp=1) for the deployed build
- Smoke: two machines/browsers on the deployed URL hunting together

## Out of scope

- Custom domain, accounts, matchmaking, server-side persistence (backlog territory)
- IP-safe naming pass (backlog #8) — REQUIRED before any public/promoted release; this milestone is friends-only sharing

## Dependencies

- **Depends on:** M07–M08 (user-chosen order: ship it polished)
- **Blocks:** none

## Acceptance criteria

- [ ] Party server deployed; health endpoint answers on the partykit.dev URL — test: scripted curl in a deploy-check spec (skipped locally without env)
- [ ] Production build connects to the deployed server (VITE_MP_HOST) — verified against the deployed URL
- [ ] Client hosted over HTTPS; two remote browsers converge on one field — verified by user playtest with a friend
- [ ] Offline fallback still holds on the deployed build (server unreachable → local game)

## Exit condition

User sends a friend a URL; both appear in the same field with name tags, kill the same mobs, and chat — no local setup on the friend's machine.

## Test plan

Deploy-time verification is largely manual/scripted-once (remote infra); the local suite must stay green throughout. Document the deployed URLs in this file's Notes when live.

## Notes

- PartyKit login: MUST use `--provider github` (the default clerk flow is dead post-Cloudflare-acquisition).
- Costs: Cloudflare Workers free tier; the server runs in the user's CF account.
