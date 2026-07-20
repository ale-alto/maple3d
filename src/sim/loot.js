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
  STAR_TYPES,
  LOOT_SEED,
  BAG_MAX,
} from '../core/constants.js';
import { mulberry32 } from './rng.js';
import { rollGear } from './items.js';

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
  const gear = rollGear(rand, typeDef); // M10: the rare exciting one
  if (gear) items.push(gear);
  return items;
}

// Give rolled items spill physics into the local drop pool. Used both by
// local kills (via spawnDrops) and server-rolled loot (M06). ownerId
// (M06): classic MS loot protection — everyone sees the drop, only the
// owner may pick it up; null = unowned (single-player).
export function spawnDropsFromItems(state, map, x, y, items, events, ownerId = null) {
  for (const item of items) {
    state.drops.push({
      // Server-assigned dropId (string) when networked, so every client
      // shares the drop's identity; local counter offline.
      id: item.dropId ?? state.nextId++,
      ...item,
      ownerId,
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

// mesoMult (M17): Meso Up enriches meso amounts on local kills.
export function spawnDrops(state, map, x, y, events, typeDef, mesoMult = 1) {
  const items = rollDrops(state.rand, typeDef).map((it) =>
    it.kind === 'mesos' && mesoMult !== 1 ? { ...it, amount: Math.ceil(it.amount * mesoMult) } : it,
  );
  spawnDropsFromItems(state, map, x, y, items, events);
}

// myId (M06): the local player's network id, for loot-protection checks;
// null offline (all local drops are unowned anyway).
export function stepLoot(state, map, player, inventory, input, dt, events, myId = null) {
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

  // Z: pick up the nearest drop in reach. Loot protection (classic MS):
  // drops owned by another player are visible but refuse the pickup.
  if (input.loot) {
    let best = null;
    let bestDist = Infinity;
    for (const d of state.drops) {
      if (d.ownerId && d.ownerId !== myId) continue; // not yours
      if (d.kind === 'gear' && (inventory.bag?.length ?? 0) >= BAG_MAX) continue; // bag full
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
      else if (best.kind === 'starPack')
        inventory.stars = Math.min(
          (STAR_TYPES[inventory.starType] ?? STAR_TYPES.steel).cap,
          inventory.stars + STARPACK_SIZE,
        );
      else if (best.kind === 'gear')
        inventory.bag.push({ kind: 'gear', gearId: best.gearId, slot: best.slot, name: best.name, tier: best.tier, ...(best.attack !== undefined ? { attack: best.attack } : {}), ...(best.defense !== undefined ? { defense: best.defense } : {}) });
      events?.emit('loot:picked', {
        kind: best.kind,
        amount: best.amount ?? 1,
        dropId: best.id,
        networked: !!best.ownerId,
      });
    }
  }
}
