// Centralized state singleton. Systems read from it; mutations happen in the
// sim step (driven by main.js) and are announced on the eventBus.

export const gameState = {
  mode: 'field',
  map: null, // set at boot from src/sim/maps/*
  player: null, // player sim state object (src/sim/player.js owns the shape)
};
