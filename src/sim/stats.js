// Headless character-sheet sim (M12). Pure pre-BB formulas — every
// number traces to docs/reference/ms-v62-mechanics.md. No guesswork.

// New-character dice: STR 4 / INT 4 (the classic thief reroll target),
// DEX + LUK = 17 with each die inside the documented 4–13 range.
export function rollNewStats(rand) {
  const dex = 4 + Math.floor(rand() * 10); // 4..13
  return { str: 4, dex, int: 4, luk: 17 - dex };
}

// Basic claw/star damage (thief): §1. Mastery scales only the primary term.
export function basicRange(stats, wa, mastery) {
  return {
    max: ((stats.luk * 3.6 + stats.str + stats.dex) * wa) / 100,
    min: ((stats.luk * 3.6 * 0.9 * mastery + stats.str + stats.dex) * wa) / 100,
  };
}

// Lucky Seven per-star: its own LUK×5 / LUK×2.5 basis, ignores mastery,
// scaled by the skill level's damage percentage.
export function l7Range(stats, wa, pct) {
  return {
    max: ((5.0 * stats.luk) / 100) * wa * pct,
    min: ((2.5 * stats.luk) / 100) * wa * pct,
  };
}

export const thiefAccuracy = (stats) => stats.dex * 0.6 + stats.luk * 0.3;
export const thiefAvoid = (stats) => stats.dex * 0.25 + stats.luk * 0.5;

// Chance to hit = ACC/((1.84 + 0.07·D)·avoid) − 1, D = level disadvantage,
// clamped to [0, 1].
export function hitChance(acc, mobAvoid, levelDiff) {
  const d = Math.max(0, levelDiff);
  const c = acc / ((1.84 + 0.07 * d) * mobAvoid) - 1;
  return Math.min(1, Math.max(0, c));
}

// Exact pre-BB EXP-to-next-level curve (§4).
export function expToNext(level) {
  if (level <= 2) return 2 * level * level + 13 * level;
  if (level <= 5) return 4 * level * level + 7 * level;
  if (level <= 50) {
    return level % 3 === 0
      ? (level ** 4 + 57 * level * level) / 9
      : (level ** 4 + 55 * level * level - 56) / 9;
  }
  let e = expToNext(50);
  for (let l = 51; l <= level; l++) e = Math.floor(1.0548 * e);
  return e;
}

const randIn = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// Level-up pool gains (verified emulator ranges) + INT/10 bonus MP.
export function levelUpGains(rand, tier, totalInt) {
  const hp = tier === 'thief' ? randIn(rand, 20, 24) : randIn(rand, 12, 16);
  const mp =
    (tier === 'thief' ? randIn(rand, 14, 16) : randIn(rand, 10, 12)) +
    Math.floor(totalInt / 10);
  return { hp, mp };
}

// Deterministic mid-range accumulation — ONLY for migrating old saves
// that never stored pools (v4 and earlier).
export function expectedPools(level) {
  let hp = 50;
  let mp = 5;
  for (let l = 2; l <= level; l++) {
    const thief = l >= 10;
    hp += thief ? 22 : 14;
    mp += thief ? 15 : 11;
  }
  return { hp, mp };
}
