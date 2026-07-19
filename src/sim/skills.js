// Headless skill sim (M11). Pure logic on plain objects.

import { SKILLS, MP_REGEN_PER_SEC, PLAYER_MAX_MP, MP_PER_LEVEL } from '../core/constants.js';

export const maxMpForLevel = (level) => PLAYER_MAX_MP + (level - 1) * MP_PER_LEVEL;

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

// Slow MP regen tick (classic idle recovery).
export function stepMp(player, dt) {
  player.mp = Math.min(player.maxMp, player.mp + MP_REGEN_PER_SEC * dt);
}

// Lucky Seven affordability + params for the current level.
export function luckySevenParams(player, inventory) {
  const lv = player.skills?.luckySeven ?? 0;
  if (lv <= 0) return null;
  if (player.mp < SKILLS.luckySeven.mpCost) return null;
  if ((inventory?.stars ?? 0) < 2) return null;
  return { mpCost: SKILLS.luckySeven.mpCost, mult: SKILLS.luckySeven.mult[lv - 1] };
}

// Flash Jump affordability for the current level.
export function flashJumpParams(player) {
  const lv = player.skills?.flashJump ?? 0;
  if (lv <= 0) return null;
  const mpCost = SKILLS.flashJump.mpCost[lv - 1];
  if (player.mp < mpCost) return null;
  return { mpCost, vx: SKILLS.flashJump.vx, vy: SKILLS.flashJump.vy };
}
