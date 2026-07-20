// Headless player platforming sim. Pure logic on map data — must run
// identically inside the PartyKit room later (tech.md sim purity rule).

import {
  RUN_SPEED,
  RUN_ACCEL,
  GROUND_FRICTION,
  AIR_ACCEL,
  GRAVITY,
  MAX_FALL_SPEED,
  JUMP_VELOCITY,
  MAX_JUMPS,
  CLIMB_SPEED,
  LADDER_GRAB_RANGE,
  LADDER_JUMP_VX,
  LADDER_JUMP_VY,
  PLAYER_START_HP,
  PLAYER_START_MP,
  STAT_ROLL_SEED,
} from '../core/constants.js';
import { rollNewStats } from './stats.js';
import { flashJumpParams } from './skills.js';
import { mulberry32 } from './rng.js';

export function createPlayer(map) {
  return {
    x: map.spawn.x,
    y: map.spawn.y,
    vx: 0,
    vy: 0,
    grounded: true,
    climbing: false,
    ladder: null,
    facing: 'right',
    jumpsLeft: MAX_JUMPS,
    dropThrough: null,
    hp: PLAYER_START_HP,
    maxHp: PLAYER_START_HP,
    invulnMs: 0,
    level: 1,
    xp: 0,
    // M12 character sheet: deterministic classic dice (STR 4 / INT 4).
    stats: rollNewStats(mulberry32(STAT_ROLL_SEED)),
    ap: 0,
    attackLockMs: 0, // MSW ATTACK state: grounded stand-and-throw interval
    state: 'idle', // MSW StateComponent-style named state, for animation
    equipment: { weapon: null, armor: null }, // M10 gear slots
    mp: PLAYER_START_MP, // M11 skills; M12 real pools
    maxMp: PLAYER_START_MP,
    mpRegenMs: 0, // 10s regen tick accumulator
    sp: 0,
    job: 'beginner', // M13: advance at the trainer (rogue@10, assassin@30)
    skills: {
      nimbleBody: 0,
      keenEyes: 0,
      disorder: 0,
      darkSight: 0,
      luckySeven: 0,
      clawMastery: 0,
      criticalThrow: 0,
      endure: 0,
      clawBooster: 0,
      haste: 0,
      drain: 0,
      avenger: 0,
      flashJump: 0,
      shadowPartner: 0,
      alchemist: 0,
    },
    hiddenMs: 0, // Dark Sight remaining
    hiddenSpeedMult: 1,
    boosterMs: 0, // Claw Booster remaining (M15)
    hasteMs: 0, // Haste remaining
    hasteSpeedMult: 1,
    hasteJumpMult: 1,
    endureMs: 0,
    shadowMs: 0, // Shadow Partner remaining (M16)
    shadowPct: 0,
  };
}

// Derived MSW-style state (idle/move/crouch/jump/fall/ladder/rope).
function deriveState(p, input) {
  if (p.climbing) return p.ladder?.type === 'rope' ? 'rope' : 'ladder';
  if (!p.grounded) return p.vy > 0 ? 'jump' : 'fall';
  if (input.down) return 'crouch';
  return Math.abs(p.vx) > 0.1 ? 'move' : 'idle';
}

// Direction-aware grab (Maple rule): Up only grabs when there is ladder
// left to climb up; Down only when there is ladder below. This is what
// prevents the exit→re-grab flicker at the ends.
function findGrabbableLadder(map, p, wantUp, wantDown) {
  return (
    map.ladders.find((l) => {
      if (Math.abs(p.x - l.x) > LADDER_GRAB_RANGE) return false;
      if (p.y < l.y1 - 0.1 || p.y > l.y2 + 0.1) return false;
      return (wantUp && p.y < l.y2 - 0.01) || (wantDown && p.y > l.y1 + 0.01);
    }) || null
  );
}

// Is there something to stand on at exactly this height?
function surfaceAt(map, x, y) {
  if (Math.abs(y - map.groundY) < 0.05) return true;
  return map.platforms.some((pl) => Math.abs(pl.y - y) < 0.05 && x >= pl.x1 && x <= pl.x2);
}

// Land on a surface at `surfY` if the player crossed it falling this step.
function crossedFromAbove(prevY, newY, surfY) {
  return prevY >= surfY && newY <= surfY;
}

// input: { left, right, up, down, jump } — jump is a consumed edge, not held.
// events: eventBus (or any {emit}) — kept injectable so the sim stays headless.
export function stepPlayer(p, map, input, dt, events) {
  // --- Climbing state ---
  if (p.climbing) {
    // MSW ActionJump(horizontalInput): jump alone stays on the climbable;
    // jump + held direction leaps off sideways.
    const leapDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (input.jump && leapDir !== 0) {
      p.climbing = false;
      p.ladder = null;
      p.vx = leapDir * LADDER_JUMP_VX;
      p.vy = LADDER_JUMP_VY;
      p.facing = leapDir > 0 ? 'right' : 'left';
      events?.emit('player:climb-exit', { reason: 'jump' });
      p.state = deriveState(p, input);
      return;
    }
    const dir = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    p.y += dir * CLIMB_SPEED * dt;
    if (p.y >= p.ladder.y2 && dir > 0) {
      // Top: pop onto the ledge as standing (no 1-frame fall, no re-grab).
      p.y = p.ladder.y2;
      p.climbing = false;
      p.ladder = null;
      p.vy = 0;
      if (surfaceAt(map, p.x, p.y)) {
        p.grounded = true;
        p.jumpsLeft = MAX_JUMPS;
      }
      events?.emit('player:climb-exit', { reason: 'top' });
    } else if (p.y <= p.ladder.y1 && dir < 0) {
      // Bottom: stand if there's a surface at the base; otherwise fall
      // off (ropes hanging over a gap).
      p.y = p.ladder.y1;
      p.climbing = false;
      p.ladder = null;
      p.vy = 0;
      if (surfaceAt(map, p.x, p.y)) {
        p.grounded = true;
        p.jumpsLeft = MAX_JUMPS;
      }
      events?.emit('player:climb-exit', { reason: 'bottom' });
    } else {
      p.y = Math.max(p.ladder.y1, Math.min(p.ladder.y2, p.y));
    }
    p.state = deriveState(p, input);
    return;
  }

  // --- Grab a ladder ---
  if (!p.climbing && (input.up || input.down)) {
    const ladder = findGrabbableLadder(map, p, input.up, input.down);
    if (ladder) {
      p.climbing = true;
      p.ladder = ladder;
      p.x = ladder.x;
      p.vx = 0;
      p.vy = 0;
      p.grounded = false;
      events?.emit('player:climb-start', { ladder });
      p.state = deriveState(p, input);
      return;
    }
  }

  // --- Horizontal run ---
  // MSW RigidbodyComponent model: strong accel + drag on the ground; in
  // the air only AIR_ACCEL (subtle steering) applies and there is no drag,
  // so jump momentum stays committed — the assassin kite: jump away, turn
  // (facing flips instantly), throw backward while drifting.
  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (move !== 0) p.facing = move > 0 ? 'right' : 'left';
  p.attackLockMs = Math.max(0, p.attackLockMs - dt * 1000);
  // Buff countdowns: Dark Sight speed penalty (M13), Booster/Haste (M15).
  p.hiddenMs = Math.max(0, (p.hiddenMs ?? 0) - dt * 1000);
  p.boosterMs = Math.max(0, (p.boosterMs ?? 0) - dt * 1000);
  p.hasteMs = Math.max(0, (p.hasteMs ?? 0) - dt * 1000);
  p.shadowMs = Math.max(0, (p.shadowMs ?? 0) - dt * 1000);
  let runSpeed = RUN_SPEED;
  if (p.hiddenMs > 0) runSpeed *= p.hiddenSpeedMult;
  if (p.hasteMs > 0) runSpeed *= p.hasteSpeedMult;
  if (p.grounded) {
    if (input.down) {
      // MSW ActionCrouch: crouch/prone stops instantly and blocks the run.
      p.vx = 0;
    } else if (move !== 0 && p.attackLockMs === 0) {
      p.vx += move * RUN_ACCEL * dt;
      p.vx = Math.max(-runSpeed, Math.min(runSpeed, p.vx));
    } else {
      // No input — or stand-and-throw (MSW ATTACK state locks the run
      // while grounded). Maple-style slight slide: friction, not a stop.
      const decel = GROUND_FRICTION * dt;
      if (Math.abs(p.vx) <= decel) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * decel;
    }
  } else if (move !== 0) {
    // Steering never ADDS speed past the run cap, but it must not bleed
    // super-speed either (flash jump bursts past RUN_SPEED by design).
    const cap = Math.max(RUN_SPEED, Math.abs(p.vx));
    p.vx += move * AIR_ACCEL * dt;
    p.vx = Math.max(-cap, Math.min(cap, p.vx));
  }

  // --- Down jump (MSW DownJump): Down+jump on a thin platform drops
  // through it; crouched on the ground floor, jump does nothing (Maple
  // prone). ---
  let jumpConsumed = false;
  if (input.jump && input.down && p.grounded) {
    jumpConsumed = true;
    const plat = map.platforms.find(
      (pl) => Math.abs(p.y - pl.y) < 0.001 && p.x >= pl.x1 && p.x <= pl.x2,
    );
    if (plat) {
      p.grounded = false;
      p.vy = 0;
      p.dropThrough = plat; // ignored by landing until we're clearly below
      events?.emit('player:downjump', {});
    }
  }

  // --- Flash Jump (M16): home at last as the Hermit skill it always
  // was — Alt mid-air, real MP table, a horizontal burst (NOT a second
  // jump; MAX_JUMPS stays 1). ---
  if (!jumpConsumed && input.jump && !p.grounded && !p.climbing) {
    jumpConsumed = true;
    const fj = flashJumpParams(p);
    if (fj) {
      const dir = p.facing === 'right' ? 1 : -1;
      p.vx = dir * fj.vx;
      p.vy = Math.max(p.vy, fj.vy);
      p.mp -= fj.mpCost;
      events?.emit('skill:flashjump', { mp: p.mp });
    }
  }

  // --- Jump (single only; no double jump) ---
  if (!jumpConsumed && input.jump && p.grounded && p.jumpsLeft > 0) {
    p.vy = JUMP_VELOCITY * (p.hasteMs > 0 ? p.hasteJumpMult : 1); // Haste (M15)
    p.jumpsLeft -= 1;
    p.grounded = false;
    events?.emit('player:jumped', {});
  }

  // --- Gravity + integrate ---
  const prevY = p.y;
  if (!p.grounded) {
    p.vy -= GRAVITY * dt;
    p.vy = Math.max(-MAX_FALL_SPEED, p.vy);
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // --- Map bounds ---
  if (p.x < map.minX) {
    p.x = map.minX;
    p.vx = 0;
  } else if (p.x > map.maxX) {
    p.x = map.maxX;
    p.vx = 0;
  }

  // Drop-through expires once we're clearly below the platform.
  if (p.dropThrough && p.y < p.dropThrough.y - 0.6) p.dropThrough = null;

  // --- Landing (thin platforms: solid from above only) ---
  if (p.vy <= 0) {
    let landedOn = null;
    if (crossedFromAbove(prevY, p.y, map.groundY)) landedOn = map.groundY;
    for (const plat of map.platforms) {
      if (plat === p.dropThrough) continue;
      if (p.x >= plat.x1 && p.x <= plat.x2 && crossedFromAbove(prevY, p.y, plat.y)) {
        if (landedOn === null || plat.y > landedOn) landedOn = plat.y;
      }
    }
    if (landedOn !== null) {
      const wasAirborne = !p.grounded;
      p.y = landedOn;
      p.vy = 0;
      p.grounded = true;
      p.jumpsLeft = MAX_JUMPS;
      // Firm landing (Maple-authentic): momentum is committed in the air,
      // but touchdown with no direction held plants the feet — no skid.
      // Holding a direction carries the run through the landing seamlessly.
      if (wasAirborne && move === 0) p.vx = 0;
      if (wasAirborne) events?.emit('player:landed', { y: landedOn });
    } else if (p.grounded && p.y < prevY) {
      // Walked off an edge.
      p.grounded = false;
    }
  }

  // Walked off the edge of a platform: no surface directly supports us.
  if (p.grounded) {
    const onGround = p.y <= map.groundY + 0.001;
    const onPlatform = map.platforms.some(
      (plat) => Math.abs(p.y - plat.y) < 0.001 && p.x >= plat.x1 && p.x <= plat.x2,
    );
    if (!onGround && !onPlatform) p.grounded = false;
  }

  p.state = deriveState(p, input);
}
