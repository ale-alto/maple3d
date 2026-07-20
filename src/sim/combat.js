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
import { applyDeathPenalty } from './progression.js';
import { weaponAttack, soak } from './items.js';
import {
  luckySevenParams,
  disorderParams,
  darkSightParams,
  nimbleBodyBonus,
  starRangeOf,
} from './skills.js';
import { basicRange, l7Range, thiefAccuracy, hitChance } from './stats.js';
import { BASE_WA, BASE_MASTERY, MOB_TYPES } from '../core/constants.js';
import { mulberry32 } from './rng.js';

// M12: total weapon attack — interim base loadout + equipped claw
// (M14 brings the real per-item WA tables).
export const totalWa = (player) => BASE_WA + weaponAttack(player.equipment);

// Basic-attack damage range for the character sheet / HUD / payload.
export function attackRange(player) {
  const r = basicRange(player.stats, totalWa(player), BASE_MASTERY);
  return { min: Math.round(r.min), max: Math.round(r.max) };
}

const rollIn = (rand, r) => Math.max(1, Math.round(r.min + rand() * (r.max - r.min)));

export function createCombatState() {
  return { stars: [], cooldownMs: 0, nextStarId: 1, rand: mulberry32(4321) };
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
  // Lucky Seven (M11): Shift with the skill + MP + 2 stars = a 2-star
  // volley; otherwise the press falls back to a basic throw.
  const l7 = input.skill ? luckySevenParams(player, inventory) : null;

  // Classic MS target lock: nearest mob inside the forward attack box,
  // centered on the player's BODY. Range extends with Keen Eyes (M13).
  function selectTarget() {
    const dir = player.facing === 'right' ? 1 : -1;
    const playerCenter = player.y + PLAYER_HEIGHT / 2;
    const range = starRangeOf(player);
    let target = null;
    let bestDx = Infinity;
    for (const mob of mobsState.mobs) {
      const dx = (mob.x - player.x) * dir;
      const dy = mob.y + MOB_HEIGHT / 2 - playerCenter;
      if (dx <= 0 || dx > range) continue;
      if (Math.abs(dy) > STAR_SELECT_HALF_HEIGHT) continue;
      if (dx < bestDx) {
        bestDx = dx;
        target = mob;
      }
    }
    return target;
  }

  const hidden = (player.hiddenMs ?? 0) > 0; // Dark Sight: can't attack
  if ((input.attack || input.skill) && combat.cooldownMs === 0 && !player.climbing && hasAmmo && !hidden) {
    const dir = player.facing === 'right' ? 1 : -1;
    const throwY = player.y + STAR_THROW_HEIGHT;
    const target = selectTarget();
    // Damage + hit resolve at press time (classic): each star rolls its
    // own damage in the documented range, and its own hit check against
    // the target's avoid. Nimble Body feeds accuracy.
    const wa = totalWa(player);
    const acc = thiefAccuracy(player.stats) + nimbleBodyBonus(player);
    const volley = l7 ? 2 : 1;
    for (let i = 0; i < volley; i++) {
      let damage = 0;
      let miss = false;
      if (target) {
        const def = MOB_TYPES[target.type] ?? {};
        const chance = hitChance(acc, def.avoid ?? 1, (def.level ?? 1) - player.level);
        miss = combat.rand() >= chance;
        if (!miss) {
          const range = l7
            ? l7Range(player.stats, wa, l7.pct)
            : basicRange(player.stats, wa, BASE_MASTERY);
          damage = rollIn(combat.rand, range);
        }
      }
      const star = {
        id: combat.nextStarId++,
        x: player.x - dir * i * 0.35, // second star trails the first
        y: throwY + i * 0.18,
        vx: dir * STAR_SPEED,
        vy: 0,
        targetId: target ? target.id : null,
        traveled: 0,
        damage,
        miss,
      };
      combat.stars.push(star);
      if (net) net.sendThrow(star); // party members see the throw
      if (inventory) inventory.stars -= 1; // spend the star
    }
    if (l7) {
      player.mp -= l7.mpCost;
      events?.emit('skill:luckyseven', { mp: player.mp });
    }
    combat.cooldownMs = ATTACK_COOLDOWN_MS;
    // MSW ATTACK state: grounded throws are stand-and-throw; air throws
    // stay free (that's the kite).
    if (player.grounded) player.attackLockMs = ATTACK_LOCK_MS;
    events?.emit('player:attacked', { facing: player.facing, stars: inventory ? inventory.stars : null });
  }

  // --- Dark Sight (V, M13): hide in shadow — untouchable, no attacking,
  // documented speed penalty; refused while already hidden. ---
  if (input.darkSight && !hidden && !player.climbing) {
    const ds = darkSightParams(player);
    if (ds) {
      player.hiddenMs = ds.durationMs;
      player.hiddenSpeedMult = ds.speedMult;
      player.mp -= ds.mpCost;
      events?.emit('skill:darksight', { durationMs: ds.durationMs });
    }
  }

  // --- Disorder (D, M13): debuff the locked mob's attack/def for the
  // duration; cannot reapply while already disordered. ---
  if (input.disorder && !hidden && !player.climbing) {
    const dis = disorderParams(player);
    if (dis) {
      const target = selectTarget();
      if (target && !(target.disorderMs > 0)) {
        target.disorderMs = dis.durationMs;
        target.disorderAtk = dis.atk;
        player.mp -= dis.mpCost;
        events?.emit('skill:disorder', { mobId: target.id });
        if (net) net.sendDisorder(target.id, dis.atk, dis.durationMs);
      }
    }
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
        if (star.miss) {
          events?.emit('mob:missed', { x: target.x, y: target.y });
        } else if (net) {
          net.sendHit(target.id, star.damage);
        } else {
          damageMob(mobsState, target, star.damage, events);
        }
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

  // Dark Sight: the enemy won't attack — no contact, no shots.
  if (player.invulnMs === 0 && player.hiddenMs === 0) {
    const touching = mobsState.mobs.find((m) =>
      overlaps(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT, m.x, m.y, MOB_WIDTH, MOB_HEIGHT),
    );
    if (touching) {
      // Disorder: weapon attack −level while the debuff runs.
      const debuff = touching.disorderMs > 0 ? touching.disorderAtk : 0;
      hurtPlayer(Math.max(1, (touching.contactDamage ?? MOB_CONTACT_DAMAGE) - debuff), touching.x);
    }
  }

  // --- Spitter shots vs the local player (collision only — motion lives
  // in mobs.stepMobProjectiles, run locally offline or on the server) ---
  mobsState.projectiles = (mobsState.projectiles ?? []).filter((shot) => {
    if (
      player.invulnMs === 0 &&
      player.hiddenMs === 0 &&
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
