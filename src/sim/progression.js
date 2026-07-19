// Headless progression sim: XP curve, level-ups, death penalty, potions.
// Pure logic on plain objects (tech.md sim purity rule).

import {
  XP_BASE,
  XP_GROWTH,
  LEVEL_CAP,
  HP_PER_LEVEL,
  DEATH_XP_PENALTY,
  PLAYER_MAX_HP,
  STAR_DAMAGE,
  DAMAGE_PER_LEVEL,
  POTION_HEAL,
  SP_PER_LEVEL,
} from '../core/constants.js';
import { maxMpForLevel } from './skills.js';

export const xpToNext = (level) => Math.round(XP_BASE * XP_GROWTH ** (level - 1));
export const maxHpForLevel = (level) => PLAYER_MAX_HP + (level - 1) * HP_PER_LEVEL;
export const starDamageForLevel = (level) => STAR_DAMAGE + (level - 1) * DAMAGE_PER_LEVEL;

export function grantXp(p, amount, events) {
  if (p.level >= LEVEL_CAP) return;
  p.xp += amount;
  events?.emit('player:xp', { amount });
  while (p.level < LEVEL_CAP && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    p.maxHp = maxHpForLevel(p.level);
    p.hp = p.maxHp; // classic Maple: level-up full heal
    p.maxMp = maxMpForLevel(p.level);
    p.mp = p.maxMp; // full MP restore too
    p.sp = (p.sp ?? 0) + SP_PER_LEVEL; // M11 skill points
    events?.emit('player:levelup', { level: p.level });
  }
  if (p.level >= LEVEL_CAP) p.xp = 0;
}

// Maple-honest but forgiving (gameplan): lose a small slice of the current
// level's requirement, never dipping below the level's start.
export function applyDeathPenalty(p, events) {
  const loss = Math.floor(xpToNext(p.level) * DEATH_XP_PENALTY);
  if (loss <= 0) return;
  p.xp = Math.max(0, p.xp - loss);
  events?.emit('player:xp', { amount: -loss });
}

export function usePotion(p, inventory, events) {
  if (inventory.potions <= 0 || p.hp >= p.maxHp) return false;
  inventory.potions -= 1;
  p.hp = Math.min(p.maxHp, p.hp + POTION_HEAL);
  events?.emit('potion:used', { hp: p.hp, potions: inventory.potions });
  return true;
}
