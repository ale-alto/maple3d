# Tech stack

## Engine / runtime

- **Engine:** Three.js (npm, version pinned at scaffold)
- **Language(s):** JavaScript (ES modules)
- **Target platforms:** Web, desktop browser, keyboard only

## Libraries / frameworks

| Library | Version | Purpose |
|---------|---------|---------|
| three | 0.185.1 | 3D maps, GLB character rendering (GLTFLoader + AnimationMixer), camera |
| partykit / partysocket | 0.0.115 / 1.3.0 | Room-based shared world (Cloudflare Durable Objects): room per map, presence, chat, server-owned mob state; server imports src/sim directly (purity payoff). Local: `npm run mp`; opt-in via `?mp=1` |
| vite | 8.1.4 | Dev server + build |
| @playwright/test | 1.61.1 | Gameplay/QA tests (per qa-game skill) |

## Tooling

- **Package manager:** npm
- **Build:** Vite (scaffolded with create-vite 9.1.1 `vanilla` template, then `npm install three`). Note: `npm create vite` mangles `--template` pass-through — use `npx create-vite@latest <dir> -t <template>` directly.
- **Testing:** Playwright — gameplay assertions via `render_game_to_text()` + visual baselines
- **Linting / formatting:** none; consistent hand style (2-space indent)
- **Asset / binary storage:** GLB models under `public/models/`, audio under `public/audio/`; Git LFS for `*.glb` if total exceeds ~20 MB
- **3D asset generation:** Meshy AI (meshyai skill — text→model, auto-rig, auto-animate, GLB export); primitives-built placeholders until the asset milestone (ADR-0002)

## Project layout (planned at scaffold)

| Path | Purpose |
|------|---------|
| `src/core/` | EventBus, GameState, constants.js (all magic numbers) |
| `src/sim/` | Authoritative game logic — player stats/XP/inventory, mob spawns/AI/HP, drops. **No Three.js, no DOM.** Runs in the PartyKit room server-side for mob state. |
| `src/render/` | Three.js scene, map geometry, character models (placeholder rigs → GLB), animation control, camera rig, VFX |
| `src/input/` | Keyboard mapping (classic Maple preset) |
| `src/net/` | PartyKit client (presence, chat, mob sync) — added at the multiplayer milestone |
| `src/ui/` | DOM HUD: HP/MP/XP bars, inventory, chat |
| `party/` | PartyKit server (room = map) |
| `docs/` | gameplan, tech, ADRs, milestones, backlog, STATE |

## Conventions

- **Code naming:** camelCase; SCREAMING_SNAKE constants; one module per system.
- **Events:** EventBus pub/sub, `domain:action` names (`mob:died`, `player:levelup`, `loot:picked`).
- **Sim purity rule:** nothing in `src/sim/` may import Three.js or touch the DOM — mob logic must run identically headless in the PartyKit room.
- **Agent hooks:** `window.render_game_to_text()` (JSON game state) and `window.advanceTime(ms)` (deterministic stepping) from the first milestone.
- **Characters:** every entity renders through a `CharacterView` abstraction (position/facing/animation-state in, visuals out) so primitive placeholders swap for GLB models without touching sim or game logic. Facing = left/right yaw flip (side view).

## Out-of-scope dependencies

- No physics engine — 2.5D platforming is hand-rolled AABB on platform segments.
- No React/UI framework — HUD is plain DOM.
- No TypeScript for v1 (matches user's existing projects; revisit if net protocol drift bites).
- No server database — characters live in localStorage (v1); revisit with an ADR if trading/economy is promoted from backlog.
