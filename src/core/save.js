// localStorage persistence. Lives OUTSIDE src/sim (storage is a DOM API —
// sim purity rule); feeds plain objects to/from the sim. Versioned from
// day one: the multiplayer milestone will migrate this schema.

const KEY = 'maple3d-save';

// v1 (M03): { v, player, inventory }
// v2 (M04): + mapId
// v3 (M10): + player.equipment {weapon, armor}, inventory.bag []
// v4 (M11): + player.mp/sp/skills (retroactive SP for pre-skill saves)
import { SP_PER_LEVEL } from './constants.js';

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
    if (data.v !== 4) return null;
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
        v: 4,
        mapId: gameState.mapId,
        player: {
          level: p.level,
          xp: p.xp,
          hp: p.hp,
          x: p.x,
          y: p.y,
          facing: p.facing,
          equipment: p.equipment,
          mp: Math.round(p.mp),
          sp: p.sp,
          skills: p.skills,
        },
        inventory: gameState.inventory,
      }),
    );
  } catch {
    // storage full/blocked: play on without saves
  }
}
