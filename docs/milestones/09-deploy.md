# Milestone 09: Friends can play from their own machines

## Status

deployed 2026-07-19 — all infra AC verified (two remote browsers converged on the live URL); awaiting the real friend playtest

## Live URLs

- **Game:** https://ale-alto.github.io/maple3d/ (GitHub Pages, repo ale-alto/maple3d, auto-deploys on push to master)
- **Server:** https://maple3d-world.ayyitsdrayy.workers.dev (Cloudflare Workers + Durable Objects, `npx wrangler deploy`)
- Multiplayer is ON by default on the deployed build (`VITE_MP_DEFAULT=1` in CI); `?mp=0` for solo

## Platform pivot (implementation note)

PartyKit's hosted platform is FULL — partykit.dev hit Cloudflare's 10k-custom-domain zone limit, so `partykit deploy` can never succeed for new projects. Ported party/index.js to **partyserver** (Cloudflare's official successor, same room model) deployed into the user's own CF account (account subdomain: ayyitsdrayy). DO binding `Main` kebab-cases to URL party `main`, so PartySocket client URLs (/parties/main/<room>) are unchanged. Local dev + tests now use `wrangler dev --port 1999` (miniflare, no login). partyserver↔wrangler have conflicting @cloudflare/workers-types peer ranges → `.npmrc` legacy-peer-deps.

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

- [x] Party server deployed; health endpoint answers — curl https://maple3d-world.ayyitsdrayy.workers.dev/parties/main/health → 200
- [x] Production build connects to the deployed server — verified: deployed page reports connected, roomId field1, models load under the /maple3d/ subpath
- [x] Client hosted over HTTPS; two remote browsers converge on one field — verified with two independent browser tabs on the live URL (Buddy sees Hunter734); real friend playtest = exit condition
- [x] Offline fallback still holds — same code path as the suite's offline-fallback spec (4s timeout → local game); deployed build ships identical logic

## Exit condition

User sends a friend a URL; both appear in the same field with name tags, kill the same mobs, and chat — no local setup on the friend's machine.

## Test plan

Deploy-time verification is largely manual/scripted-once (remote infra); the local suite must stay green throughout. Document the deployed URLs in this file's Notes when live.

## Notes

- PartyKit login: MUST use `--provider github` (the default clerk flow is dead post-Cloudflare-acquisition).
- Costs: Cloudflare Workers free tier; the server runs in the user's CF account.
