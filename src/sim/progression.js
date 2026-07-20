// Headless progression sim: real pre-BB XP curve, level-ups with rolled
// pool gains, death penalty, potions. Pure logic on plain objects.
// Every number sourced — docs/reference/ms-v62-mechanics.md.

import {
  LEVEL_CAP,
  DEATH_XP_PENALTY,
  POTION_HEAL,
  SP_PER_LEVEL,
  AP_PER_LEVEL,
} from '../core/constants.js';
import { expToNext, levelUpGains } from './stats.js';
import { mulberry32 } from './rng.js';

export const xpToNext = expToNext; // exact piecewise table (§4)

// Deterministic per-boot gain dice (sim stays reproducible for specs).
const gainRand = mulberry32(9137);

export function grantXp(p, amount, events) {
  if (p.level >= LEVEL_CAP) return;
  p.xp += amount;
  events?.emit('player:xp', { amount });
  while (p.level < LEVEL_CAP && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    // Beginner gains below 10; thief-tier from 10 up (Rogue tier — the
    // formal job advancement is M13).
    const tier = p.level >= 10 ? 'thief' : 'beginner';
    const gains = levelUpGains(gainRand, tier, p.stats?.int ?? 4);
    p.maxHp += gains.hp;
    p.maxMp += gains.mp;
    p.hp = p.maxHp; // classic level-up full restore
    p.mp = p.maxMp;
    p.ap = (p.ap ?? 0) + AP_PER_LEVEL;
    p.sp = (p.sp ?? 0) + SP_PER_LEVEL;
    events?.emit('player:levelup', { level: p.level });
  }
  if (p.level >= LEVEL_CAP) p.xp = 0;
}

// Maple-honest but forgiving (gameplan): lose a small slice of the current
// level's requirement, never dipping below the level's start.
// (Real per-death % table is still unresearched — flagged in the reference.)
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
