// Headless combat sim: star projectiles, mob hits, contact damage with
// i-frames, player death + respawn.

import {
  STAR_SPEED,
  STAR_RANGE,
  STAR_SELECT_HALF_HEIGHT,
  STAR_THROW_HEIGHT,
  ATTACK_COOLDOWN_MS,
  ATTACK_LOCK_MS,
  INVULN_MS,
  KNOCKBACK_VX,
  KNOCKBACK_VY,
  MOB_CONTACT_DAMAGE,
  MAX_JUMPS,
  MOB_WIDTH,
  MOB_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
} from '../core/constants.js';
import { damageMob } from './mobs.js';
import { starDamageForLevel, applyDeathPenalty } from './progression.js';
import { weaponAttack, soak } from './items.js';

// Derived attack (M10): level curve + equipped claw.
export const playerAttack = (player) => starDamageForLevel(player.level) + weaponAttack(player.equipment);

export function createCombatState() {
  return { stars: [], cooldownMs: 0, nextStarId: 1 };
}

// Feet-anchored AABB overlap (x = center, y = feet).
function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < aw + bw && ay < by + bh && by < ay + ah;
}

// net (M06, optional): {sendHit(mobId, damage)} — when present the server
// owns mob hp, so star arrivals report the hit instead of applying it.
export function stepCombat(combat, player, mobsState, map, input, dt, events, inventory, net) {
  const ms = dt * 1000;

  // --- Throw stars (Ctrl; held = auto-attack on cooldown) ---
  // Throwing stars are consumable ammo — no stars, no throw (classic MS).
  combat.cooldownMs = Math.max(0, combat.cooldownMs - ms);
  const hasAmmo = !inventory || inventory.stars > 0;
  if (input.attack && combat.cooldownMs === 0 && !player.climbing && hasAmmo) {
    // Classic MS: lock the nearest mob inside the forward attack box at
    // press time. The box is centered on the player's BODY (rises with a
    // jump) and is ~one character tall, so a mob straight above is out of
    // reach but a jump-attack to a mob's level connects. Star homes to the
    // lock; no lock = whiff visual.
    const dir = player.facing === 'right' ? 1 : -1;
    const throwY = player.y + STAR_THROW_HEIGHT;
    const playerCenter = player.y + PLAYER_HEIGHT / 2;
    let target = null;
    let bestDx = Infinity;
    for (const mob of mobsState.mobs) {
      const dx = (mob.x - player.x) * dir;
      const dy = mob.y + MOB_HEIGHT / 2 - playerCenter;
      if (dx <= 0 || dx > STAR_RANGE) continue;
      if (Math.abs(dy) > STAR_SELECT_HALF_HEIGHT) continue;
      if (dx < bestDx) {
        bestDx = dx;
        target = mob;
      }
    }
    const star = {
      id: combat.nextStarId++,
      x: player.x,
      y: throwY,
      vx: dir * STAR_SPEED,
      vy: 0,
      targetId: target ? target.id : null,
      traveled: 0,
    };
    combat.stars.push(star);
    if (net) net.sendThrow(star); // party members see the throw
    if (inventory) inventory.stars -= 1; // spend the star
    combat.cooldownMs = ATTACK_COOLDOWN_MS;
    // MSW ATTACK state: grounded throws are stand-and-throw; air throws
    // stay free (that's the kite).
    if (player.grounded) player.attackLockMs = ATTACK_LOCK_MS;
    events?.emit('player:attacked', { facing: player.facing, stars: inventory ? inventory.stars : null });
  }

  // --- Fly + hit (locked stars home and land on arrival; whiffs never
  // hit — classic MS resolves the attack at press time) ---
  combat.stars = combat.stars.filter((star) => {
    const step = STAR_SPEED * dt;
    if (star.targetId !== null) {
      const target = mobsState.mobs.find((m) => m.id === star.targetId);
      if (!target) return false; // lock died mid-flight: star fizzles
      const dx = target.x - star.x;
      const dy = target.y + MOB_HEIGHT / 2 - star.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= Math.max(step, 0.3)) {
        if (net) net.sendHit(target.id, playerAttack(player));
        else damageMob(mobsState, target, playerAttack(player), events);
        return false;
      }
      star.vx = (dx / dist) * STAR_SPEED;
      star.vy = (dy / dist) * STAR_SPEED;
    }
    star.x += star.vx * dt;
    star.y += star.vy * dt;
    star.traveled += step;
    if (star.traveled >= STAR_RANGE) return false;
    if (star.x < map.minX || star.x > map.maxX) return false;
    return true;
  });

  // (cosmetic remote stars are stepped by stepCosmeticStars below)

  // --- Player damage (contact + spitter shots) ---
  player.invulnMs = Math.max(0, player.invulnMs - ms);

  // Damage + knockback away from sourceX (MSW HitEvent FeedbackAction);
  // death penalty/heal here, WHERE the player wakes up (town, per the
  // gameplan) is the orchestrator's job via the player:died event.
  function hurtPlayer(rawAmount, sourceX) {
    const amount = soak(rawAmount, player.equipment); // armor soaks (M10)
    player.hp -= amount;
    player.invulnMs = INVULN_MS;
    const kbDir = Math.sign(player.x - sourceX) || (player.facing === 'right' ? -1 : 1);
    player.vx = kbDir * KNOCKBACK_VX;
    player.vy = KNOCKBACK_VY;
    player.grounded = false;
    events?.emit('player:hit', { amount, x: player.x, y: player.y });
    if (player.hp <= 0) {
      applyDeathPenalty(player, events);
      player.hp = player.maxHp;
      player.jumpsLeft = MAX_JUMPS;
      player.invulnMs = INVULN_MS; // respawn grace
      events?.emit('player:died', {});
      events?.emit('player:respawned', {});
    }
  }

  if (player.invulnMs === 0) {
    const touching = mobsState.mobs.find((m) =>
      overlaps(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT, m.x, m.y, MOB_WIDTH, MOB_HEIGHT),
    );
    if (touching) hurtPlayer(touching.contactDamage ?? MOB_CONTACT_DAMAGE, touching.x);
  }

  // --- Spitter shots vs the local player (collision only — motion lives
  // in mobs.stepMobProjectiles, run locally offline or on the server) ---
  mobsState.projectiles = (mobsState.projectiles ?? []).filter((shot) => {
    if (
      player.invulnMs === 0 &&
      overlaps(shot.x, shot.y - 0.2, 0.4, 0.4, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT)
    ) {
      hurtPlayer(shot.damage, shot.x);
      return false;
    }
    return true;
  });
}

// Cosmetic replicas of party members' throws (M06): same homing flight as
// real stars, but they never deal damage — the server owns that. Mutates
// and returns the filtered list.
export function stepCosmeticStars(stars, mobs, map, dt) {
  return stars.filter((star) => {
    const step = STAR_SPEED * dt;
    if (star.targetId !== null) {
      const target = mobs.find((m) => m.id === star.targetId);
      if (!target) return false;
      const dx = target.x - star.x;
      const dy = target.y + MOB_HEIGHT / 2 - star.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= Math.max(step, 0.3)) return false; // arrived (visual only)
      star.vx = (dx / dist) * STAR_SPEED;
      star.vy = (dy / dist) * STAR_SPEED;
    }
    star.x += star.vx * dt;
    star.y += star.vy * dt;
    star.traveled += step;
    if (star.traveled >= STAR_RANGE) return false;
    if (star.x < map.minX || star.x > map.maxX) return false;
    return true;
  });
}
