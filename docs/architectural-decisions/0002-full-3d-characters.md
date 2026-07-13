# ADR 0002: Full 3D characters and mobs (supersedes the HD-2D art decision in ADR-0001)

## Status

accepted (supersedes the art-style portion of ADR-0001; engine/stack/multiplayer decisions there remain in force)

## Date

2026-07-13

## Context

ADR-0001 chose HD-2D (billboarded pixel sprites on 3D maps) primarily to avoid 3D character modeling/rigging/animation. Immediately after the idea phase, the user overrode this: characters and mobs must be fully 3D modeled — the game should read as a true 3D MapleStory (MapleStory 2 art direction, classic 2D gameplay).

## Decision

All characters, mobs, and NPCs are **chibi low-poly 3D models with skeletal animation**, toon/flat-shaded. Development proceeds with **primitive-built placeholder characters** (capsule/sphere rigs animated in code) through every gameplay milestone; a dedicated asset milestone near the end swaps them for **Meshy AI-generated GLB models** (text→model, auto-rig, auto-animate). To make that swap cheap, every entity renders through a `CharacterView` abstraction: sim/game logic emits position/facing/animation-state; the view layer decides whether that drives a placeholder rig or a GLB `AnimationMixer`. Required clips — player: idle, run, jump, climb, throw; mobs: walk, hurt, die.

## Consequences

### Positive

- The game looks like an actual "3D MapleStory," which was the user's stated vision.
- Placeholder-first ordering keeps asset cost at $0 until gameplay is proven (Meshy free tier → ~$20/mo only when generating finals).
- `CharacterView` abstraction means the art pivot costs nothing in sim/net/game-logic code.

### Negative

- Skeletal animation quality is now a core risk: auto-rigged Meshy models can look janky; climb/throw clips may need iteration or hand-tuning.
- Model polycount/skinning adds render cost vs. sprites — matters with many mobs + players on screen (threejs-perf skill guidance applies; instancing doesn't work naively for skinned meshes).
- Coherent chibi style across player + 3 mobs + NPCs requires disciplined Meshy prompting (style reference reuse).

## Alternatives considered

- **Keep HD-2D:** rejected — user explicitly wants 3D-modeled characters.
- **Meshy models from day one:** rejected — designs will change during development; generating finals against unproven gameplay wastes credits and time.
- **Free GLB libraries (Quaternius/Kenney):** rejected as primary source — coherent MapleStory-chibi style across all entities is unlikely; kept as fallback if Meshy output disappoints.

## Related

- ADR-0001 (engine/stack/multiplayer — still authoritative)
- `docs/gameplan.md` art-style section (updated this date)
- Future asset milestone ("Meshy generation pass") — see backlog
