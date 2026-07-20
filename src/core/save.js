// localStorage persistence. Lives OUTSIDE src/sim (storage is a DOM API —
// sim purity rule); feeds plain objects to/from the sim. Versioned from
// day one: the multiplayer milestone will migrate this schema.

const KEY = 'maple3d-save';

// v1 (M03): { v, player, inventory }
// v2 (M04): + mapId
// v3 (M10): + player.equipment {weapon, armor}, inventory.bag []
// v4 (M11): + player.mp/sp/skills (retroactive SP for pre-skill saves)
// v5 (M12): + player.stats/ap/maxHp/maxMp (pools are path-dependent now)
// v6 (M13): + player.job; flash jump refunded, SP recomputed job-gated
import { SP_PER_LEVEL, AP_PER_LEVEL, STAT_ROLL_SEED, JOB_ADV_LEVEL } from './constants.js';
import { rollNewStats, expectedPools } from '../sim/stats.js';
import { mulberry32 } from '../sim/rng.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    let data = JSON.parse(raw);
    if (data.v === 1) data = { ...data, v: 2, mapId: 'field1' }; // migrate
    if (data.v === 2) {
      data = {
        ...data,
        v: 3,
        player: { ...data.player, equipment: { weapon: null, armor: null } },
        inventory: { ...data.inventory, bag: [] },
      };
    }
    if (data.v === 3) {
      data = {
        ...data,
        v: 4,
        player: {
          ...data.player,
          mp: null, // null = fill to max on load
          sp: SP_PER_LEVEL * ((data.player.level ?? 1) - 1), // retroactive
          skills: { luckySeven: 0, flashJump: 0 },
        },
      };
    }
    if (data.v === 4) {
      // Character-sheet migration: fresh classic dice, all historical AP
      // unspent (the player allocates), pools from the documented
      // mid-range accumulation.
      const level = data.player.level ?? 1;
      const pools = expectedPools(level);
      data = {
        ...data,
        v: 5,
        player: {
          ...data.player,
          stats: rollNewStats(mulberry32(STAT_ROLL_SEED)),
          ap: AP_PER_LEVEL * (level - 1),
          maxHp: pools.hp,
          maxMp: pools.mp,
          mp: null, // fill to max on load
        },
      };
    }
    if (data.v === 5) {
      // Jobs migration: level ≥ 10 characters advanced retroactively;
      // Flash Jump left the early game — refund its points into the
      // job-gated SP ledger (earned = 1 + 3·(level−10), minus kept spends).
      const level = data.player.level ?? 1;
      const job = level >= JOB_ADV_LEVEL ? 'rogue' : 'beginner';
      const old = data.player.skills ?? {};
      const skills = {
        nimbleBody: 0,
        keenEyes: 0,
        disorder: 0,
        darkSight: 0,
        luckySeven: old.luckySeven ?? 0,
      };
      const spent = skills.luckySeven;
      const earned = job === 'rogue' ? 1 + SP_PER_LEVEL * (level - JOB_ADV_LEVEL) : 0;
      data = {
        ...data,
        v: 6,
        player: {
          ...data.player,
          job,
          skills,
          sp: Math.max(0, earned - spent),
        },
      };
    }
    if (data.v !== 6) return null;
    return data;
  } catch {
    return null;
  }
}

export function persist(gameState) {
  try {
    const p = gameState.player;
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 6,
        mapId: gameState.mapId,
        player: {
          level: p.level,
          xp: p.xp,
          hp: p.hp,
          maxHp: p.maxHp,
          maxMp: p.maxMp,
          x: p.x,
          y: p.y,
          facing: p.facing,
          equipment: p.equipment,
          mp: Math.round(p.mp),
          sp: p.sp,
          skills: p.skills,
          stats: p.stats,
          ap: p.ap,
          job: p.job,
        },
        inventory: gameState.inventory,
      }),
    );
  } catch {
    // storage full/blocked: play on without saves
  }
}
