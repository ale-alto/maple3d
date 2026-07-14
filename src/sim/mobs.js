// Headless mob sim: spawn, patrol, aggro, damage, death, timed respawn.
// Runs identically inside the PartyKit room later — keep it pure.

import {
  MOB_MAX_HP,
  MOB_SPEED,
  MOB_AGGRO_SPEED,
  MOB_AGGRO_RADIUS,
  MOB_RESPAWN_MS,
} from '../core/constants.js';

export function createMobsState(map) {
  const state = { mobs: [], pending: [], nextId: 1 };
  map.mobSpawns.forEach((_, i) => spawnMob(state, map, i));
  return state;
}

export function spawnMob(state, map, spawnIndex) {
  const sp = map.mobSpawns[spawnIndex];
  state.mobs.push({
    id: state.nextId++,
    spawn: spawnIndex,
    x: sp.x,
    y: sp.y,
    hp: MOB_MAX_HP,
    maxHp: MOB_MAX_HP,
    state: 'patrol',
    facing: 'left',
    dir: -1,
  });
}

export function stepMobs(state, player, map, dt, events) {
  // Timed respawns.
  const ms = dt * 1000;
  for (const p of state.pending) p.timerMs -= ms;
  const ready = state.pending.filter((p) => p.timerMs <= 0);
  if (ready.length) {
    state.pending = state.pending.filter((p) => p.timerMs > 0);
    for (const r of ready) {
      spawnMob(state, map, r.spawn);
      events?.emit('mob:spawned', { spawn: r.spawn });
    }
  }

  for (const mob of state.mobs) {
    const sp = map.mobSpawns[mob.spawn];
    const dx = player.x - mob.x;
    const sameLevel = Math.abs(player.y - mob.y) < 1.2;

    if (sameLevel && Math.abs(dx) <= MOB_AGGRO_RADIUS) {
      mob.state = 'aggro';
      const dir = Math.sign(dx) || mob.dir;
      mob.dir = dir;
      mob.x += dir * MOB_AGGRO_SPEED * dt;
    } else {
      mob.state = 'patrol';
      mob.x += mob.dir * MOB_SPEED * dt;
      if (mob.x <= sp.patrolX1) mob.dir = 1;
      else if (mob.x >= sp.patrolX2) mob.dir = -1;
    }

    // Never leave the home surface (Maple mobs don't chase off platforms).
    mob.x = Math.max(sp.patrolX1, Math.min(sp.patrolX2, mob.x));
    mob.facing = mob.dir > 0 ? 'right' : 'left';
  }
}

export function damageMob(state, mob, amount, events) {
  mob.hp -= amount;
  events?.emit('mob:hit', { id: mob.id, x: mob.x, y: mob.y, amount });
  if (mob.hp <= 0) {
    state.mobs = state.mobs.filter((m) => m !== mob);
    state.pending.push({ spawn: mob.spawn, timerMs: MOB_RESPAWN_MS });
    events?.emit('mob:died', { id: mob.id, x: mob.x, y: mob.y, spawn: mob.spawn });
  }
}
