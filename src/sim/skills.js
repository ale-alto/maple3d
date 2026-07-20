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
  STAR_RANGE,
} from '../core/constants.js';

// Spend 1 SP for +1 skill level. Job-gated (beginners have no skill set)
// and prereq-gated (Keen Eyes ← NB3, Dark Sight ← Disorder 3).
export function assignSkillPoint(player, skillId, events) {
  const def = SKILLS[skillId];
  if (!def || player.sp <= 0) return false;
  if (player.job !== 'rogue') return false;
  if ((player.skills[skillId] ?? 0) >= def.maxLevel) return false;
  if (def.prereq && (player.skills[def.prereq[0]] ?? 0) < def.prereq[1]) return false;
  player.sp -= 1;
  player.skills[skillId] = (player.skills[skillId] ?? 0) + 1;
  events?.emit('skill:assigned', { skillId, level: player.skills[skillId] });
  return true;
}

// Beginner → Rogue at the trainer. Rolls the documented one-time pools,
// grants the advancement SP (+3/level catch-up when advancing late).
export function tryAdvanceJob(player, rand, events) {
  if (player.job !== 'beginner') return false;
  if (player.level < JOB_ADV_LEVEL) return false;
  if (player.stats.dex < JOB_ADV_DEX) return false;
  const randIn = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  player.job = 'rogue';
  player.maxHp += randIn(JOB_ADV_HP[0], JOB_ADV_HP[1]);
  player.maxMp += randIn(JOB_ADV_MP[0], JOB_ADV_MP[1]);
  player.hp = player.maxHp; // advancement full restore
  player.mp = player.maxMp;
  player.sp += 1 + SP_PER_LEVEL * Math.max(0, player.level - JOB_ADV_LEVEL);
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
