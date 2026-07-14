// Headless combat sim: star projectiles, mob hits, contact damage with
// i-frames, player death + respawn.

import {
  STAR_DAMAGE,
  STAR_SPEED,
  STAR_RANGE,
  STAR_VERTICAL_RANGE,
  STAR_THROW_HEIGHT,
  ATTACK_COOLDOWN_MS,
  INVULN_MS,
  MOB_CONTACT_DAMAGE,
  MOB_WIDTH,
  MOB_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_MAX_HP,
} from '../core/constants.js';
import { damageMob } from './mobs.js';

export function createCombatState() {
  return { stars: [], cooldownMs: 0, nextStarId: 1 };
}

// Feet-anchored AABB overlap (x = center, y = feet).
function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < aw + bw && ay < by + bh && by < ay + ah;
}

export function stepCombat(combat, player, mobsState, map, input, dt, events) {
  const ms = dt * 1000;

  // --- Throw stars (Ctrl; held = auto-attack on cooldown) ---
  combat.cooldownMs = Math.max(0, combat.cooldownMs - ms);
  if (input.attack && combat.cooldownMs === 0 && !player.climbing) {
    const dir = player.facing === 'right' ? 1 : -1;
    const throwY = player.y + STAR_THROW_HEIGHT;

    // Vertical auto-aim (gameplan rule): the claw reaches mobs above/below
    // when they're ahead of us and within star range.
    let target = null;
    let bestDist = Infinity;
    for (const mob of mobsState.mobs) {
      const dx = mob.x - player.x;
      const dy = mob.y + MOB_HEIGHT / 2 - throwY;
      if (dx * dir <= 0) continue; // behind us
      if (Math.abs(dx) > STAR_RANGE || Math.abs(dy) > STAR_VERTICAL_RANGE) continue;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        target = mob;
      }
    }

    let vx = dir * STAR_SPEED;
    let vy = 0;
    if (target) {
      const dx = target.x - player.x;
      const dy = target.y + MOB_HEIGHT / 2 - throwY;
      const dist = Math.hypot(dx, dy) || 1;
      vx = (dx / dist) * STAR_SPEED;
      vy = (dy / dist) * STAR_SPEED;
    }

    combat.stars.push({
      id: combat.nextStarId++,
      x: player.x,
      y: throwY,
      vx,
      vy,
      originX: player.x,
      originY: throwY,
    });
    combat.cooldownMs = ATTACK_COOLDOWN_MS;
    events?.emit('player:attacked', { facing: player.facing });
  }

  // --- Fly + hit ---
  for (const star of combat.stars) {
    star.x += star.vx * dt;
    star.y += star.vy * dt;
  }
  combat.stars = combat.stars.filter((star) => {
    if (Math.hypot(star.x - star.originX, star.y - star.originY) >= STAR_RANGE) return false;
    if (star.x < map.minX || star.x > map.maxX) return false;
    const hit = mobsState.mobs.find((m) =>
      overlaps(star.x, star.y - 0.2, 0.4, 0.4, m.x, m.y, MOB_WIDTH, MOB_HEIGHT),
    );
    if (hit) {
      damageMob(mobsState, hit, STAR_DAMAGE, events);
      return false;
    }
    return true;
  });

  // --- Contact damage + death ---
  player.invulnMs = Math.max(0, player.invulnMs - ms);
  if (player.invulnMs === 0) {
    const touching = mobsState.mobs.find((m) =>
      overlaps(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT, m.x, m.y, MOB_WIDTH, MOB_HEIGHT),
    );
    if (touching) {
      player.hp -= MOB_CONTACT_DAMAGE;
      player.invulnMs = INVULN_MS;
      events?.emit('player:hit', { amount: MOB_CONTACT_DAMAGE, x: player.x, y: player.y });
      if (player.hp <= 0) {
        events?.emit('player:died', {});
        player.x = map.spawn.x;
        player.y = map.spawn.y;
        player.vx = 0;
        player.vy = 0;
        player.hp = PLAYER_MAX_HP;
        player.grounded = true;
        player.climbing = false;
        player.ladder = null;
        player.jumpsLeft = 2;
        player.invulnMs = INVULN_MS; // respawn grace
        events?.emit('player:respawned', {});
      }
    }
  }
}
