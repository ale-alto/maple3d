// Headless loot sim: drop spill physics, despawn timers, Z pickup.
// Mesos always drop; potion/star-pack are seeded-rng extras.

import {
  GRAVITY,
  DROP_DESPAWN_MS,
  PICKUP_RANGE,
  MESOS_MIN,
  MESOS_MAX,
  POTION_DROP_CHANCE,
  STARPACK_DROP_CHANCE,
  STARPACK_SIZE,
  STAR_MAX,
  LOOT_SEED,
} from '../core/constants.js';
import { mulberry32 } from './rng.js';

export function createLootState() {
  return { drops: [], nextId: 1, rand: mulberry32(LOOT_SEED) };
}

// Highest surface at x that is at or below yRef — where a drop will rest.
function surfaceBelow(map, x, yRef) {
  let best = map.groundY;
  for (const pl of map.platforms) {
    if (x >= pl.x1 && x <= pl.x2 && pl.y <= yRef + 0.01 && pl.y > best) best = pl.y;
  }
  return best;
}

// Roll the drop table only (no physics). typeDef (M05): per-mob-type
// {mesosMin, mesosMax, potionChance, starPackChance}, blob-tier fallback.
// The PartyKit room uses this server-side to roll per-killer loot (M06).
export function rollDrops(rand, typeDef) {
  const lo = typeDef?.mesosMin ?? MESOS_MIN;
  const hi = typeDef?.mesosMax ?? MESOS_MAX;
  const items = [{ kind: 'mesos', amount: lo + Math.floor(rand() * (hi - lo + 1)) }];
  if (rand() < (typeDef?.potionChance ?? POTION_DROP_CHANCE)) items.push({ kind: 'potion' });
  if (rand() < (typeDef?.starPackChance ?? STARPACK_DROP_CHANCE)) items.push({ kind: 'starPack' });
  return items;
}

// Give rolled items spill physics into the local drop pool. Used both by
// local kills (via spawnDrops) and server-rolled per-player loot (M06).
export function spawnDropsFromItems(state, map, x, y, items, events) {
  for (const item of items) {
    state.drops.push({
      id: state.nextId++,
      ...item,
      x,
      y: y + 0.4,
      spawnY: y + 0.4,
      vx: (state.rand() - 0.5) * 3, // spill scatter
      vy: 4 + state.rand() * 2,
      grounded: false,
      ageMs: 0,
    });
  }
  events?.emit('loot:dropped', { count: items.length, x, y });
}

export function spawnDrops(state, map, x, y, events, typeDef) {
  spawnDropsFromItems(state, map, x, y, rollDrops(state.rand, typeDef), events);
}

export function stepLoot(state, map, player, inventory, input, dt, events) {
  const ms = dt * 1000;

  for (const d of state.drops) {
    if (!d.grounded) {
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const floor = surfaceBelow(map, d.x, d.spawnY);
      if (d.vy <= 0 && d.y <= floor) {
        d.y = floor;
        d.vx = 0;
        d.vy = 0;
        d.grounded = true;
      }
    } else {
      d.ageMs += ms;
    }
  }
  state.drops = state.drops.filter((d) => d.ageMs < DROP_DESPAWN_MS);

  // Z: pick up the nearest drop in reach — one item per press.
  if (input.loot) {
    let best = null;
    let bestDist = Infinity;
    for (const d of state.drops) {
      const dist = Math.hypot(d.x - player.x, d.y - player.y);
      if (dist <= PICKUP_RANGE && dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    if (best) {
      state.drops = state.drops.filter((d) => d !== best);
      if (best.kind === 'mesos') inventory.mesos += best.amount;
      else if (best.kind === 'potion') inventory.potions += 1;
      else if (best.kind === 'starPack') inventory.stars = Math.min(STAR_MAX, inventory.stars + STARPACK_SIZE);
      events?.emit('loot:picked', { kind: best.kind, amount: best.amount ?? 1 });
    }
  }
}
