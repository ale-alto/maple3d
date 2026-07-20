// Headless mob sim: typed roster (M05), patrol, aggro, damage, death,
// timed respawn, and spitter projectiles. Runs identically inside the
// PartyKit room later — keep it pure.

import { MOB_TYPES, MOB_AGGRO_RADIUS, MOB_RESPAWN_MS } from '../core/constants.js';

export function createMobsState(map) {
  const state = { mobs: [], pending: [], projectiles: [], nextId: 1 };
  map.mobSpawns.forEach((_, i) => spawnMob(state, map, i));
  return state;
}

export function spawnMob(state, map, spawnIndex) {
  const sp = map.mobSpawns[spawnIndex];
  const type = sp.type ?? 'blob';
  const def = MOB_TYPES[type];
  state.mobs.push({
    id: state.nextId++,
    spawn: spawnIndex,
    type,
    x: sp.x,
    y: sp.y,
    hp: def.maxHp,
    maxHp: def.maxHp,
    contactDamage: def.contactDamage,
    state: 'patrol',
    facing: 'left',
    dir: -1,
    shotCooldownMs: 0,
  });
}

// players: ARRAY of {x, y} — each mob targets its nearest player (M06:
// the PartyKit room passes every connected player; single-player passes
// [player]).
export function stepMobs(state, players, map, dt, events) {
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
    const def = MOB_TYPES[mob.type];
    // Disorder debuff countdown (M13); Shadow Web root (M17).
    if (mob.disorderMs > 0) mob.disorderMs = Math.max(0, mob.disorderMs - ms);
    if (mob.rootMs > 0) {
      mob.rootMs = Math.max(0, mob.rootMs - ms);
      continue; // webbed: no movement, no aggro chase this tick
    }
    let player = null;
    let best = Infinity;
    for (const cand of players) {
      if (cand.hidden) continue; // Dark Sight: the enemy won't attack
      const d = Math.abs(cand.x - mob.x);
      if (d < best) {
        best = d;
        player = cand;
      }
    }
    if (!player) player = { x: mob.x + 1000, y: -1000 }; // empty room: pure patrol
    const dx = player.x - mob.x;
    const sameLevel = Math.abs(player.y - mob.y) < 1.2;

    if (sameLevel && Math.abs(dx) <= MOB_AGGRO_RADIUS) {
      mob.state = 'aggro';
      const dir = Math.sign(dx) || mob.dir;
      mob.dir = dir;
      mob.x += dir * def.aggroSpeed * dt;
    } else {
      mob.state = 'patrol';
      mob.x += mob.dir * def.speed * dt;
      if (mob.x <= sp.patrolX1) mob.dir = 1;
      else if (mob.x >= sp.patrolX2) mob.dir = -1;
    }

    // Never leave the home surface (Maple mobs don't chase off platforms).
    mob.x = Math.max(sp.patrolX1, Math.min(sp.patrolX2, mob.x));
    mob.facing = mob.dir > 0 ? 'right' : 'left';

    // Spitters: slow, jumpable shot at a same-level player in range.
    if (def.ranged) {
      mob.shotCooldownMs = Math.max(0, mob.shotCooldownMs - ms);
      if (sameLevel && Math.abs(dx) <= def.ranged.range && mob.shotCooldownMs === 0) {
        const dir = Math.sign(dx) || mob.dir;
        state.projectiles.push({
          id: state.nextId++,
          x: mob.x,
          y: mob.y + 0.5,
          vx: dir * def.ranged.projectileSpeed,
          damage: def.ranged.damage,
          traveled: 0,
          maxRange: def.ranged.range + 2,
        });
        mob.shotCooldownMs = def.ranged.cooldownMs;
        mob.facing = dir > 0 ? 'right' : 'left';
        events?.emit('mob:shot', { id: mob.id, x: mob.x, y: mob.y });
      }
    }
  }
}

// Spitter shot motion + range/bounds cull. Collision against a player is
// the client's job (each client owns its character; see combat.js) — the
// server runs only this motion step.
export function stepMobProjectiles(state, map, dt) {
  state.projectiles = (state.projectiles ?? []).filter((shot) => {
    shot.x += shot.vx * dt;
    shot.traveled += Math.abs(shot.vx) * dt;
    if (shot.traveled >= shot.maxRange) return false;
    if (shot.x < map.minX || shot.x > map.maxX) return false;
    return true;
  });
}

export function damageMob(state, mob, amount, events) {
  mob.hp -= amount;
  events?.emit('mob:hit', { id: mob.id, x: mob.x, y: mob.y, amount });
  if (mob.hp <= 0) {
    state.mobs = state.mobs.filter((m) => m !== mob);
    state.pending.push({ spawn: mob.spawn, timerMs: MOB_RESPAWN_MS });
    events?.emit('mob:died', { id: mob.id, x: mob.x, y: mob.y, spawn: mob.spawn, type: mob.type });
  }
}
