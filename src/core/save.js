// localStorage persistence. Lives OUTSIDE src/sim (storage is a DOM API —
// sim purity rule); feeds plain objects to/from the sim. Versioned from
// day one: the multiplayer milestone will migrate this schema.

const KEY = 'maple3d-save';

// v1 (M03): { v, player, inventory }
// v2 (M04): + mapId
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v === 1) return { ...data, v: 2, mapId: 'field1' }; // migrate
    if (data.v !== 2) return null;
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
        v: 2,
        mapId: gameState.mapId,
        player: { level: p.level, xp: p.xp, hp: p.hp, x: p.x, y: p.y, facing: p.facing },
        inventory: gameState.inventory,
      }),
    );
  } catch {
    // storage full/blocked: play on without saves
  }
}
