# ADR 0001: Engine, stack, HD-2D art style, and server-owned mobs

## Status

accepted — **art-style portion (HD-2D) superseded by ADR-0002** (full 3D chibi characters); engine, stack, and multiplayer authority decisions remain in force

## Date

2026-07-13

## Context

New project: a "3D version of MapleStory" — decided in the idea phase to be a 2.5D side-scroller (Maple gameplay intact) on real 3D maps, with the grind-level-loot loop as the heart, an assassin class, and a **shared world from day one**. The user's prior game project (PARADIS: Breach) is Three.js/vanilla JS, and the installed game-creator skill suite targets Three.js + PartyKit + Playwright.

## Decision

**Three.js + vanilla JavaScript ES modules on Vite**, browser desktop only. Art is **HD-2D**: billboarded pixel-art sprites on low-poly 3D geometry. Multiplayer is **PartyKit (Cloudflare Durable Objects), one room per map**, with a strict authority split: the **server owns mob state** (spawns, HP, deaths, drops-spawning) so shared hunting is coherent; the **client owns its character** (movement, stats, XP, inventory), persisted in localStorage — no accounts or server database in v1. All game logic lives in `src/sim/` with zero Three.js/DOM imports so the same mob-sim code runs headless inside the PartyKit room. game-creator architecture pattern throughout (EventBus, GameState, Constants, `render_game_to_text()`, `advanceTime()`).

## Consequences

### Positive

- HD-2D removes 3D character modeling/rigging/animation entirely — the hardest asset problem — while still delivering a genuinely 3D world.
- Server-owned mobs make the shared world honest (no ghosts attacking air) and PvE-cheat-resistant where it matters.
- Client-owned characters keep v1 free of accounts, auth, and database work.
- Same-stack as the user's other project; every installed skill (add-multiplayer, game-assets, retrodiffusion, qa-game, add-audio) applies directly.

### Negative

- Client-owned characters are trivially editable (localStorage) — acceptable for v1 because there's no PvP and no trading; **promoting trading/economy from the backlog forces server-side characters (new ADR).**
- Mob hit registration crosses the network (client reports hits on server-owned mobs) — needs lag-tolerant design from the combat milestone, not bolted on.
- Billboarded sprites constrain camera angles (near-side-on always); dramatic camera swings must respect sprite readability.

## Alternatives considered

- **Phaser (pure 2D):** rejected — faking depth with parallax abandons the "3D version" premise.
- **Full 3D chibi characters (MapleStory 2 style):** rejected — modeling/rigging/animating characters is the single biggest scope and quality risk; HD-2D keeps the pixel identity.
- **Client-authoritative mobs (capybara-style presence-only relay):** rejected — visibly incoherent when two players hunt the same field.
- **Server-side characters in v1:** rejected — accounts + storage + migration scope with no v1 payoff given no trading/PvP.
- **Unity/Godot:** rejected — no browser-first benefit, off-stack for the user and the skill suite.

## Related

- `docs/gameplan.md` (rules, scope ceiling, anti-goals)
- Backlog: trading/economy (triggers server-side character ADR), quests, more classes, bosses
