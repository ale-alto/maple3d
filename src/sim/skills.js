// Headless skill sim (M11–M13). Pure logic on plain objects.
// Numbers sourced — docs/reference/ms-v62-mechanics.md §5–§7.

import {
  SKILLS,
  MP_REGEN_AMOUNT,
  MP_REGEN_INTERVAL_MS,
  SP_PER_LEVEL,
  KEEN_EYES_UNIT_PER_LEVEL,
  JOB_ADV_LEVEL,
  JOB_ADV_DEX,
  JOB_ADV_HP,
  JOB_ADV_MP,
  JOB2_ADV_LEVEL,
  JOB2_ADV_HP,
  JOB2_ADV_MP,
  STAR_RANGE,
  STAR_TYPES,
  BASE_MASTERY,
} from '../core/constants.js';

// Spend 1 SP for +1 skill level. Job-gated (beginners have no skill set;
// assassin skills need the 2nd advancement) and prereq-gated.
const JOB_RANK = { beginner: 0, rogue: 1, assassin: 2 };

export function assignSkillPoint(player, skillId, events) {
  const def = SKILLS[skillId];
  if (!def || player.sp <= 0) return false;
  const needRank = def.job === 'assassin' ? 2 : 1;
  if ((JOB_RANK[player.job] ?? 0) < needRank) return false;
  if ((player.skills[skillId] ?? 0) >= def.maxLevel) return false;
  if (def.prereq && (player.skills[def.prereq[0]] ?? 0) < def.prereq[1]) return false;
  player.sp -= 1;
  player.skills[skillId] = (player.skills[skillId] ?? 0) + 1;
  events?.emit('skill:assigned', { skillId, level: player.skills[skillId] });
  return true;
}

// Advancement at the trainer: Beginner → Rogue (10, DEX 25) → Assassin
// (30). Rolls the documented one-time pools; +1 SP (+3/level catch-up
// past the gate when advancing late).
export function tryAdvanceJob(player, rand, events) {
  const randIn = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  if (player.job === 'beginner') {
    if (player.level < JOB_ADV_LEVEL) return false;
    if (player.stats.dex < JOB_ADV_DEX) return false;
    player.job = 'rogue';
    player.maxHp += randIn(JOB_ADV_HP[0], JOB_ADV_HP[1]);
    player.maxMp += randIn(JOB_ADV_MP[0], JOB_ADV_MP[1]);
    player.sp += 1 + SP_PER_LEVEL * Math.max(0, player.level - JOB_ADV_LEVEL);
  } else if (player.job === 'rogue') {
    if (player.level < JOB2_ADV_LEVEL) return false;
    player.job = 'assassin';
    player.maxHp += randIn(JOB2_ADV_HP[0], JOB2_ADV_HP[1]);
    player.maxMp += randIn(JOB2_ADV_MP[0], JOB2_ADV_MP[1]);
    player.sp += 1;
  } else {
    return false;
  }
  player.hp = player.maxHp; // advancement full restore
  player.mp = player.maxMp;
  events?.emit('job:advanced', { job: player.job });
  return true;
}

// Base MP recovery: +3 per 10 s standing (discrete tick, not a drip).
export function stepMp(player, dt) {
  player.mpRegenMs = (player.mpRegenMs ?? 0) + dt * 1000;
  while (player.mpRegenMs >= MP_REGEN_INTERVAL_MS) {
    player.mpRegenMs -= MP_REGEN_INTERVAL_MS;
    player.mp = Math.min(player.maxMp, player.mp + MP_REGEN_AMOUNT);
  }
}

// Passive contributions.
export const nimbleBodyBonus = (player) => player.skills?.nimbleBody ?? 0;
export const starRangeOf = (player) =>
  STAR_RANGE + (player.skills?.keenEyes ?? 0) * KEEN_EYES_UNIT_PER_LEVEL;

// Lucky Seven affordability + params for the current level.
export function luckySevenParams(player, inventory) {
  const lv = player.skills?.luckySeven ?? 0;
  if (lv <= 0) return null;
  const mpCost = SKILLS.luckySeven.mpCost[lv - 1];
  if (player.mp < mpCost) return null;
  if ((inventory?.stars ?? 0) < 2) return null;
  return { mpCost, pct: SKILLS.luckySeven.pct[lv - 1] / 100 };
}

// Disorder: enemy attack/def −level for the level's duration.
export function disorderParams(player) {
  const lv = player.skills?.disorder ?? 0;
  if (lv <= 0) return null;
  const mpCost = SKILLS.disorder.mpCost[lv - 1];
  if (player.mp < mpCost) return null;
  return { mpCost, atk: lv, durationMs: SKILLS.disorder.durationSec[lv - 1] * 1000 };
}

// --- Assassin passives/actives (M15, reference §10) ---

// Claw Mastery: mastery% = 10 + 5·ceil(lv/2), acc +lv, star cap +10·lv.
export const masteryOf = (player) => {
  const lv = player.skills?.clawMastery ?? 0;
  return lv > 0 ? (10 + 5 * Math.ceil(lv / 2)) / 100 : BASE_MASTERY;
};
export const masteryAccBonus = (player) => player.skills?.clawMastery ?? 0;
export const starCapOf = (player, inventory) =>
  (STAR_TYPES[inventory?.starType] ?? STAR_TYPES.steel).cap +
  10 * (player.skills?.clawMastery ?? 0);

// Critical Throw: (20+lv)% chance, (110+3·lv)% damage per star.
export function critParams(player) {
  const lv = player.skills?.criticalThrow ?? 0;
  if (lv <= 0) return null;
  return { chance: (20 + lv) / 100, mult: (110 + 3 * lv) / 100 };
}

// Endure: on ropes/ladders — HP +(20+4·lv), MP +2·lv every (30−lv) s.
export function stepEndure(player, dt) {
  const lv = player.skills?.endure ?? 0;
  if (lv <= 0 || !player.climbing) {
    player.endureMs = 0;
    return;
  }
  player.endureMs = (player.endureMs ?? 0) + dt * 1000;
  const interval = (30 - lv) * 1000;
  while (player.endureMs >= interval) {
    player.endureMs -= interval;
    player.hp = Math.min(player.maxHp, player.hp + 20 + 4 * lv);
    player.mp = Math.min(player.maxMp, player.mp + 2 * lv);
  }
}

// Claw Booster: costs (30−lv) HP and MP, faster cadence for 10·lv s.
export function clawBoosterParams(player) {
  const lv = player.skills?.clawBooster ?? 0;
  if (lv <= 0) return null;
  const cost = 30 - lv;
  if (player.mp < cost || player.hp <= cost) return null;
  return { cost, durationMs: 10 * lv * 1000 };
}

// Haste: MP 15 (≤10) / 30 (11+); Speed +2·lv, Jump +lv for 10·lv s.
export function hasteParams(player) {
  const lv = player.skills?.haste ?? 0;
  if (lv <= 0) return null;
  const mpCost = lv <= 10 ? 15 : 30;
  if (player.mp < mpCost) return null;
  return {
    mpCost,
    durationMs: 10 * lv * 1000,
    speedMult: (100 + 2 * lv) / 100,
    jumpMult: (100 + lv) / 100,
  };
}

// Drain: MP 12, one star at (100+2·lv)%, absorb (15+lv)% of the damage
// (capped at maxHp/2 and the target's maxHp — enforced at the hit).
export function drainParams(player) {
  const lv = player.skills?.drain ?? 0;
  if (lv <= 0) return null;
  if (player.mp < SKILLS.drain.mpCost) return null;
  return { mpCost: SKILLS.drain.mpCost, pct: (100 + 2 * lv) / 100, absorb: (15 + lv) / 100 };
}

// Dark Sight: MP 25−lv, duration 10·lv s, speed penalty per table.
export function darkSightParams(player) {
  const lv = player.skills?.darkSight ?? 0;
  if (lv <= 0) return null;
  const mpCost = 25 - lv;
  if (player.mp < mpCost) return null;
  return {
    mpCost,
    durationMs: 10 * lv * 1000,
    speedMult: (100 - SKILLS.darkSight.speedPenalty[lv - 1]) / 100,
  };
}
