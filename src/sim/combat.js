// Headless combat sim: star projectiles, mob hits, contact damage with
// i-frames, player death + respawn.

import {
  STAR_DAMAGE,
  STAR_SPEED,
  STAR_RANGE,
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
    combat.stars.push({
      id: combat.nextStarId++,
      x: player.x,
      y: player.y + STAR_THROW_HEIGHT,
      vx: dir * STAR_SPEED,
      originX: player.x,
    });
    combat.cooldownMs = ATTACK_COOLDOWN_MS;
    events?.emit('player:attacked', { facing: player.facing });
  }

  // --- Fly + hit ---
  for (const star of combat.stars) star.x += star.vx * dt;
  combat.stars = combat.stars.filter((star) => {
    if (Math.abs(star.x - star.originX) >= STAR_RANGE) return false;
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
