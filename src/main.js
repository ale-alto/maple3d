import './style.css';
import { FIXED_STEP_MS, XP_PER_MOB, STARTING_POTIONS } from './core/constants.js';
import { eventBus } from './core/eventBus.js';
import { gameState } from './core/gameState.js';
import { loadSave, persist } from './core/save.js';
import { field1 } from './sim/maps/field1.js';
import { createPlayer, stepPlayer } from './sim/player.js';
import { createMobsState, stepMobs } from './sim/mobs.js';
import { createCombatState, stepCombat } from './sim/combat.js';
import { grantXp, usePotion, xpToNext, maxHpForLevel } from './sim/progression.js';
import { createLootState, spawnDrops, stepLoot } from './sim/loot.js';
import { initKeyboard, readInput } from './input/keyboard.js';
import { createScene } from './render/scene.js';
import { buildMapView } from './render/mapView.js';
import { CharacterView } from './render/characterView.js';
import { MobsView } from './render/mobsView.js';
import { CombatFxView } from './render/combatFxView.js';
import { LootView } from './render/lootView.js';
import { createCameraRig } from './render/cameraRig.js';
import { createHud } from './ui/hud.js';

const canvas = document.querySelector('#game');
const { renderer, scene, camera, syncSize } = createScene(canvas);

gameState.map = field1;
gameState.player = createPlayer(field1);
gameState.mobs = createMobsState(field1);
gameState.combat = createCombatState();
gameState.loot = createLootState();
gameState.inventory = { mesos: 0, potions: STARTING_POTIONS, starPacks: 0 };

// Restore the character before anything renders.
const saved = loadSave();
if (saved) {
  const p = gameState.player;
  p.level = saved.player.level;
  p.xp = saved.player.xp;
  p.maxHp = maxHpForLevel(p.level);
  p.hp = Math.min(saved.player.hp, p.maxHp);
  p.x = saved.player.x;
  p.y = saved.player.y;
  p.facing = saved.player.facing;
  p.grounded = false; // physics settles onto whatever is at the saved spot
  gameState.inventory = { ...gameState.inventory, ...saved.inventory };
}

buildMapView(scene, field1);
const playerView = new CharacterView(scene);
const mobsView = new MobsView(scene);
const fxView = new CombatFxView(scene, eventBus);
const lootView = new LootView(scene);
const cameraRig = createCameraRig(camera, field1);
const hud = createHud(eventBus);
initKeyboard(window);

let simTimeMs = 0;
let lastLevelUpSimMs = null;
const dt = FIXED_STEP_MS / 1000;

// Progression wiring: kills grant XP and spill loot.
eventBus.on('mob:died', ({ x, y }) => {
  grantXp(gameState.player, XP_PER_MOB, eventBus);
  spawnDrops(gameState.loot, gameState.map, x, y, eventBus);
});
eventBus.on('player:levelup', () => {
  lastLevelUpSimMs = simTimeMs;
});
// Saves: fire on every progression-relevant event + on leaving.
for (const ev of ['player:xp', 'player:levelup', 'loot:picked', 'potion:used', 'player:respawned']) {
  eventBus.on(ev, () => persist(gameState));
}
window.addEventListener('beforeunload', () => persist(gameState));

function step() {
  simTimeMs += FIXED_STEP_MS;
  const input = readInput();
  stepPlayer(gameState.player, gameState.map, input, dt, eventBus);
  stepMobs(gameState.mobs, gameState.player, gameState.map, dt, eventBus);
  stepCombat(gameState.combat, gameState.player, gameState.mobs, gameState.map, input, dt, eventBus);
  stepLoot(gameState.loot, gameState.map, gameState.player, gameState.inventory, input, dt, eventBus);
  if (input.potion) usePotion(gameState.player, gameState.inventory, eventBus);
  cameraRig.update(gameState.player, dt);
  // FX age in sim time so advanceTime() verification is deterministic.
  mobsView.tick(FIXED_STEP_MS);
  fxView.tick(FIXED_STEP_MS);
}

function draw() {
  playerView.update(gameState.player);
  mobsView.sync(gameState.mobs.mobs);
  fxView.sync(gameState.combat.stars, simTimeMs);
  lootView.sync(gameState.loot.drops, simTimeMs);
  hud.update(gameState, xpToNext);
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
      state: p.state,
      attackLockMs: Math.round(p.attackLockMs),
      hp: p.hp,
      maxHp: p.maxHp,
      invulnMs: Math.round(p.invulnMs),
      level: p.level,
      xp: p.xp,
      xpToNext: xpToNext(p.level),
    },
    inventory: { ...gameState.inventory },
    drops: gameState.loot.drops.map((d) => ({
      id: d.id,
      kind: d.kind,
      amount: d.amount,
      x: round3(d.x),
      y: round3(d.y),
      grounded: d.grounded,
      ageMs: Math.round(d.ageMs),
    })),
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
    fx: {
      damageNumbers: fxView.numbersPayload(),
      lastLevelUpAgoMs: lastLevelUpSimMs === null ? null : Math.round(simTimeMs - lastLevelUpSimMs),
    },
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
    p.dropThrough = null;
    p.grounded = false; // physics settles it on the next step
    cameraRig.snap(p);
  },
  setXp(level, xp) {
    const p = gameState.player;
    p.level = level;
    p.xp = xp;
    p.maxHp = maxHpForLevel(level);
    p.hp = p.maxHp;
    eventBus.emit('player:xp', { amount: 0 }); // triggers a save
  },
};
window.__debug = { renderer, scene, camera, gameState, eventBus };
