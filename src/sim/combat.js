// Headless combat sim: star projectiles, mob hits, contact damage with
// i-frames, player death + respawn.

import {
  STAR_DAMAGE,
  STAR_SPEED,
  STAR_RANGE,
  STAR_HIT_HEIGHT,
  STAR_THROW_HEIGHT,
  ATTACK_COOLDOWN_MS,
  ATTACK_LOCK_MS,
  INVULN_MS,
  KNOCKBACK_VX,
  KNOCKBACK_VY,
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
    // Full-authentic Maple: stars always fly flat in the facing direction.
    // The tall hit rectangle (STAR_HIT_HEIGHT) supplies the vertical
    // generosity — platform mobs need level access, no angled aiming.
    const dir = player.facing === 'right' ? 1 : -1;
    combat.stars.push({
      id: combat.nextStarId++,
      x: player.x,
      y: player.y + STAR_THROW_HEIGHT,
      vx: dir * STAR_SPEED,
      vy: 0,
      originX: player.x,
    });
    combat.cooldownMs = ATTACK_COOLDOWN_MS;
    // MSW ATTACK state: grounded throws are stand-and-throw; air throws
    // stay free (that's the kite).
    if (player.grounded) player.attackLockMs = ATTACK_LOCK_MS;
    events?.emit('player:attacked', { facing: player.facing });
  }

  // --- Fly + hit ---
  for (const star of combat.stars) star.x += star.vx * dt;
  combat.stars = combat.stars.filter((star) => {
    if (Math.abs(star.x - star.originX) >= STAR_RANGE) return false;
    if (star.x < map.minX || star.x > map.maxX) return false;
    const hit = mobsState.mobs.find((m) =>
      overlaps(star.x, star.y - STAR_HIT_HEIGHT / 2, 0.4, STAR_HIT_HEIGHT, m.x, m.y, MOB_WIDTH, MOB_HEIGHT),
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
      // MSW HitEvent FeedbackAction: pop back away from the mob.
      const kbDir = Math.sign(player.x - touching.x) || (player.facing === 'right' ? -1 : 1);
      player.vx = kbDir * KNOCKBACK_VX;
      player.vy = KNOCKBACK_VY;
      player.grounded = false;
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
