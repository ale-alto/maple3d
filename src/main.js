import './style.css';
import { FIXED_STEP_MS } from './core/constants.js';
import { eventBus } from './core/eventBus.js';
import { gameState } from './core/gameState.js';
import { field1 } from './sim/maps/field1.js';
import { createPlayer, stepPlayer } from './sim/player.js';
import { createMobsState, stepMobs } from './sim/mobs.js';
import { createCombatState, stepCombat } from './sim/combat.js';
import { initKeyboard, readInput } from './input/keyboard.js';
import { createScene } from './render/scene.js';
import { buildMapView } from './render/mapView.js';
import { CharacterView } from './render/characterView.js';
import { MobsView } from './render/mobsView.js';
import { CombatFxView } from './render/combatFxView.js';
import { createCameraRig } from './render/cameraRig.js';

const canvas = document.querySelector('#game');
const { renderer, scene, camera, syncSize } = createScene(canvas);

gameState.map = field1;
gameState.player = createPlayer(field1);
gameState.mobs = createMobsState(field1);
gameState.combat = createCombatState();

buildMapView(scene, field1);
const playerView = new CharacterView(scene);
const mobsView = new MobsView(scene);
const fxView = new CombatFxView(scene, eventBus);
const cameraRig = createCameraRig(camera, field1);
initKeyboard(window);

let simTimeMs = 0;
const dt = FIXED_STEP_MS / 1000;

function step() {
  simTimeMs += FIXED_STEP_MS;
  const input = readInput();
  stepPlayer(gameState.player, gameState.map, input, dt, eventBus);
  stepMobs(gameState.mobs, gameState.player, gameState.map, dt, eventBus);
  stepCombat(gameState.combat, gameState.player, gameState.mobs, gameState.map, input, dt, eventBus);
  cameraRig.update(gameState.player, dt);
  // FX age in sim time so advanceTime() verification is deterministic.
  mobsView.tick(FIXED_STEP_MS);
  fxView.tick(FIXED_STEP_MS);
}

function draw() {
  playerView.update(gameState.player);
  mobsView.sync(gameState.mobs.mobs);
  fxView.sync(gameState.combat.stars, simTimeMs);
  renderer.render(scene, camera);
}

cameraRig.snap(gameState.player);

let lastTime = performance.now();
let accumulator = 0;

renderer.setAnimationLoop((now) => {
  syncSize();
  accumulator += Math.min(now - lastTime, 250);
  lastTime = now;
  while (accumulator >= FIXED_STEP_MS) {
    step();
    accumulator -= FIXED_STEP_MS;
  }
  draw();
});

// --- Agent hooks (tech.md convention) ---

const round3 = (v) => +v.toFixed(3);

window.render_game_to_text = () => {
  const p = gameState.player;
  const m = gameState.map;
  return JSON.stringify({
    coords: 'origin:world x:right y:up',
    mode: gameState.mode,
    simTimeMs: Math.round(simTimeMs),
    map: {
      id: m.id,
      minX: m.minX,
      maxX: m.maxX,
      spawn: m.spawn,
      platforms: m.platforms,
      ladders: m.ladders,
      mobSpawns: m.mobSpawns,
    },
    player: {
      x: round3(p.x),
      y: round3(p.y),
      vx: round3(p.vx),
      vy: round3(p.vy),
      grounded: p.grounded,
      climbing: p.climbing,
      facing: p.facing,
      jumpsLeft: p.jumpsLeft,
      hp: p.hp,
      maxHp: p.maxHp,
      invulnMs: Math.round(p.invulnMs),
    },
    mobs: gameState.mobs.mobs.map((mob) => ({
      id: mob.id,
      spawn: mob.spawn,
      x: round3(mob.x),
      y: round3(mob.y),
      hp: mob.hp,
      maxHp: mob.maxHp,
      state: mob.state,
      facing: mob.facing,
    })),
    projectiles: gameState.combat.stars.map((s) => ({
      x: round3(s.x),
      y: round3(s.y),
      vx: round3(s.vx),
      vy: round3(s.vy),
    })),
    fx: { damageNumbers: fxView.numbersPayload() },
    camera: { x: round3(camera.position.x), y: round3(camera.position.y) },
  });
};

window.advanceTime = (ms) => {
  syncSize();
  const steps = Math.round(ms / FIXED_STEP_MS);
  for (let i = 0; i < steps; i++) step();
  draw();
};

// Dev/test-only helpers.
window.__test = {
  setPlayerPos(x, y) {
    const p = gameState.player;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.climbing = false;
    p.ladder = null;
    p.grounded = false; // physics settles it on the next step
    cameraRig.snap(p);
  },
};
window.__debug = { renderer, scene, camera, gameState, eventBus };
