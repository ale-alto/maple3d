// Headless skill sim (M11; M12 real tables). Pure logic on plain objects.
// Numbers sourced — docs/reference/ms-v62-mechanics.md §5–6.

import { SKILLS, MP_REGEN_AMOUNT, MP_REGEN_INTERVAL_MS } from '../core/constants.js';

// Spend 1 SP for +1 skill level. Returns true on success.
export function assignSkillPoint(player, skillId, events) {
  const def = SKILLS[skillId];
  if (!def || player.sp <= 0) return false;
  if ((player.skills[skillId] ?? 0) >= def.maxLevel) return false;
  player.sp -= 1;
  player.skills[skillId] = (player.skills[skillId] ?? 0) + 1;
  events?.emit('skill:assigned', { skillId, level: player.skills[skillId] });
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

// Lucky Seven affordability + params for the current level (real table:
// per-level MP cost and damage % applied to the LUK×5 basis).
export function luckySevenParams(player, inventory) {
  const lv = player.skills?.luckySeven ?? 0;
  if (lv <= 0) return null;
  const mpCost = SKILLS.luckySeven.mpCost[lv - 1];
  if (player.mp < mpCost) return null;
  if ((inventory?.stars ?? 0) < 2) return null;
  return { mpCost, pct: SKILLS.luckySeven.pct[lv - 1] / 100 };
}

// Flash Jump affordability (interim values — M13 moves it to Hermit).
export function flashJumpParams(player) {
  const lv = player.skills?.flashJump ?? 0;
  if (lv <= 0) return null;
  const mpCost = SKILLS.flashJump.mpCost[lv - 1];
  if (player.mp < mpCost) return null;
  return { mpCost, vx: SKILLS.flashJump.vx, vy: SKILLS.flashJump.vy };
}
