// localStorage persistence. Lives OUTSIDE src/sim (storage is a DOM API —
// sim purity rule); feeds plain objects to/from the sim. Versioned from
// day one: the multiplayer milestone will migrate this schema.

const KEY = 'maple3d-save';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v !== 1) return null;
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
        v: 1,
        player: { level: p.level, xp: p.xp, hp: p.hp, x: p.x, y: p.y, facing: p.facing },
        inventory: gameState.inventory,
      }),
    );
  } catch {
    // storage full/blocked: play on without saves
  }
}
