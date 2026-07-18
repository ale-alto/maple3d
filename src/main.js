import './style.css';
import {
  FIXED_STEP_MS,
  XP_PER_MOB,
  MOB_TYPES,
  STARTING_POTIONS,
  STARTING_STARS,
  PORTAL_RANGE,
  NPC_RANGE,
  CAMERA_SWING_MS,
  CAMERA_SWING_ZOOM,
  CAMERA_Z,
} from './core/constants.js';
import { eventBus } from './core/eventBus.js';
import { gameState } from './core/gameState.js';
import { loadSave, persist } from './core/save.js';
import { maps, DEFAULT_MAP } from './sim/maps/index.js';
import { createPlayer, stepPlayer } from './sim/player.js';
import { createMobsState, stepMobs, stepMobProjectiles } from './sim/mobs.js';
import { createCombatState, stepCombat, stepCosmeticStars } from './sim/combat.js';
import { grantXp, usePotion, xpToNext, maxHpForLevel } from './sim/progression.js';
import { createLootState, spawnDrops, spawnDropsFromItems, stepLoot } from './sim/loot.js';
import { createNetwork } from './net/networkManager.js';
import { createAudioEngine } from './audio/engine.js';
import { createAudioSettings } from './ui/audioSettings.js';
import { initKeyboard, readInput } from './input/keyboard.js';
import { createScene } from './render/scene.js';
import { buildMapView, disposeMapView } from './render/mapView.js';
import { CharacterView } from './render/characterView.js';
import { MobsView } from './render/mobsView.js';
import { CombatFxView } from './render/combatFxView.js';
import { LootView } from './render/lootView.js';
import { RemotePlayersView } from './render/remotePlayersView.js';
import { createCameraRig } from './render/cameraRig.js';
import { createHud } from './ui/hud.js';
import { createShopPanel } from './ui/shopPanel.js';
import { createChatInput } from './ui/chat.js';

const canvas = document.querySelector('#game');
const { renderer, scene, camera, syncSize } = createScene(canvas);

gameState.mapId = DEFAULT_MAP;
gameState.map = maps[DEFAULT_MAP];
gameState.player = createPlayer(gameState.map);
gameState.mobs = createMobsState(gameState.map);
gameState.combat = createCombatState();
gameState.loot = createLootState();
gameState.inventory = { mesos: 0, potions: STARTING_POTIONS, stars: STARTING_STARS };
gameState.shopOpen = false;

// Restore the character before anything renders.
const saved = loadSave();
if (saved) {
  const p = gameState.player;
  gameState.mapId = maps[saved.mapId] ? saved.mapId : DEFAULT_MAP;
  gameState.map = maps[gameState.mapId];
  gameState.mobs = createMobsState(gameState.map);
  p.level = saved.player.level;
  p.xp = saved.player.xp;
  p.maxHp = maxHpForLevel(p.level);
  p.hp = Math.min(saved.player.hp, p.maxHp);
  p.x = saved.player.x;
  p.y = saved.player.y;
  p.facing = saved.player.facing;
  p.grounded = false; // physics settles onto whatever is at the saved spot
  // Merge saved inventory; ensure `stars` exists for pre-ammo (v1/early-v2) saves.
  gameState.inventory = { ...gameState.inventory, ...saved.inventory };
  if (typeof gameState.inventory.stars !== 'number') gameState.inventory.stars = STARTING_STARS;
  delete gameState.inventory.starPacks; // legacy field
}

let mapViewGroup = buildMapView(scene, gameState.map);
const playerView = new CharacterView(scene);
const mobsView = new MobsView(scene);
const fxView = new CombatFxView(scene, eventBus);
const lootView = new LootView(scene);
let cameraRig = createCameraRig(camera, gameState.map);
const hud = createHud(eventBus);
const shopPanel = createShopPanel(gameState, eventBus);
initKeyboard(window);

// === Audio (M07) ===
const audio = createAudioEngine(eventBus);
const audioSettings = createAudioSettings(audio);
audio.setBgm(gameState.mapId);
eventBus.on('map:changed', ({ mapId }) => audio.setBgm(mapId));

// === Multiplayer (M06) ===
const net = createNetwork(eventBus);
const remoteView = new RemotePlayersView(scene);
createChatInput((text) => net.sendChat(text));
const CHAT_SHOW_MS = 4000;
let presenceStep = 0;

let simTimeMs = 0;
let lastLevelUpSimMs = null;
let transitionMs = 0; // camera swing on map entry
const dt = FIXED_STEP_MS / 1000;

// Swap maps: sim state resets per entry (Maple channel behavior); the
// render side rebuilds; the camera swings in. M06 reuses this as
// "join room".
function changeMap(mapId, target) {
  const map = maps[mapId];
  if (!map) return;
  gameState.mapId = mapId;
  gameState.map = map;
  gameState.mobs = createMobsState(map);
  gameState.loot = createLootState();
  gameState.combat.stars = [];
  shopPanel.close();

  const p = gameState.player;
  const portal = target !== 'spawn' && map.portals?.find((pt) => pt.id === target);
  p.x = portal ? portal.x : map.spawn.x;
  p.y = portal ? (portal.y ?? 0) : map.spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.climbing = false;
  p.ladder = null;
  p.dropThrough = null;
  p.grounded = false;

  disposeMapView(scene, mapViewGroup);
  mapViewGroup = buildMapView(scene, map);
  mobsView.clear();
  remoteView.clear();
  cameraRig = createCameraRig(camera, map);
  cameraRig.snap(p);
  transitionMs = CAMERA_SWING_MS;
  eventBus.emit('map:changed', { mapId });
  net.join(mapId); // room per map (no-op unless ?mp=1)
  persist(gameState);
}

// Progression wiring: kills grant per-type XP and spill per-type loot.
// Connected: the SERVER owns kills — XP/loot arrive via net events below.
eventBus.on('mob:died', ({ x, y, type }) => {
  if (net.connected) return;
  const def = MOB_TYPES[type] ?? MOB_TYPES.blob;
  grantXp(gameState.player, def.xp ?? XP_PER_MOB, eventBus);
  spawnDrops(gameState.loot, gameState.map, x, y, eventBus, def);
});
eventBus.on('net:mob-died', ({ type, killerId }) => {
  if (killerId === net.id) {
    const def = MOB_TYPES[type] ?? MOB_TYPES.blob;
    grantXp(gameState.player, def.xp ?? XP_PER_MOB, eventBus);
  }
});
eventBus.on('net:loot', ({ items, x, y, ownerId }) => {
  spawnDropsFromItems(gameState.loot, gameState.map, x, y, items, eventBus, ownerId ?? null);
});
// Shared loot identity: my pickups broadcast; others' pickups vanish here.
eventBus.on('loot:picked', ({ dropId, networked }) => {
  if (networked && net.connected) net.sendPicked(dropId);
});
eventBus.on('net:loot-picked', ({ dropId }) => {
  gameState.loot.drops = gameState.loot.drops.filter((d) => String(d.id) !== String(dropId));
});
// Server lost mid-hunt: fall back to a fresh local field seamlessly.
eventBus.on('net:disconnected', () => {
  gameState.mobs = createMobsState(gameState.map);
  remoteView.clear();
});
eventBus.on('player:levelup', () => {
  lastLevelUpSimMs = simTimeMs;
});
// Death sends you home to town (gameplan rule). Deferred to end-of-tick
// so the combat step finishes on the map it started on.
let pendingDeathRespawn = false;
eventBus.on('player:died', () => {
  pendingDeathRespawn = true;
});
// Saves: fire on every progression-relevant event + on leaving.
for (const ev of ['player:xp', 'player:levelup', 'loot:picked', 'potion:used', 'player:respawned', 'shop:bought']) {
  eventBus.on(ev, () => persist(gameState));
}
window.addEventListener('beforeunload', () => persist(gameState));

function step() {
  simTimeMs += FIXED_STEP_MS;
  const input = readInput();

  // Up press: portal first, then NPC interact (spatially disjoint).
  if (input.upPressed && gameState.player.grounded && !gameState.player.climbing) {
    const p = gameState.player;
    const portal = gameState.map.portals?.find((pt) => Math.abs(pt.x - p.x) <= PORTAL_RANGE);
    if (portal) {
      changeMap(portal.targetMap, portal.targetPortal);
      return; // fresh map: skip the rest of this tick
    }
    const npc = gameState.map.npcs?.find((n) => Math.abs(n.x - p.x) <= NPC_RANGE);
    if (npc) shopPanel.open();
  }
  // Walking away (any movement input) closes the shop, Maple-style.
  if (gameState.shopOpen && (input.left || input.right || input.jump)) shopPanel.close();

  stepPlayer(gameState.player, gameState.map, input, dt, eventBus);

  if (net.connected) {
    // Server-owned mobs: apply the latest room snapshot; between
    // snapshots the last-applied objects persist (stars keep their locks
    // by id; contact damage reads the patched contactDamage).
    if (net.snapshot) {
      gameState.mobs.mobs = net.snapshot.mobs.map((m) => ({
        ...m,
        contactDamage: MOB_TYPES[m.type]?.contactDamage ?? 10,
      }));
      gameState.mobs.projectiles = net.snapshot.projectiles.map((s) => ({ ...s }));
      net.snapshot = null;
    }
  } else {
    stepMobs(gameState.mobs, [gameState.player], gameState.map, dt, eventBus);
    stepMobProjectiles(gameState.mobs, gameState.map, dt);
  }

  stepCombat(
    gameState.combat,
    gameState.player,
    gameState.mobs,
    gameState.map,
    input,
    dt,
    eventBus,
    gameState.inventory,
    net.connected ? net : null,
  );
  stepLoot(gameState.loot, gameState.map, gameState.player, gameState.inventory, input, dt, eventBus, net.id);
  // Party members' throws: cosmetic flight only.
  net.remoteStars = stepCosmeticStars(net.remoteStars, gameState.mobs.mobs, gameState.map, dt);

  // Presence at 10 Hz.
  presenceStep += 1;
  if (net.connected && presenceStep % 6 === 0) {
    const p = gameState.player;
    net.sendState({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), facing: p.facing, state: p.state, level: p.level });
  }
  if (input.potion) usePotion(gameState.player, gameState.inventory, eventBus);
  if (input.mute) {
    audio.toggleMute();
    audioSettings.refresh(); // keep the speaker icon in sync with M
  }
  cameraRig.update(gameState.player, dt);
  // Map-entry swing: ease the camera in from a pulled-back pose.
  if (transitionMs > 0) {
    transitionMs = Math.max(0, transitionMs - FIXED_STEP_MS);
    const t = transitionMs / CAMERA_SWING_MS;
    camera.position.z = CAMERA_Z + CAMERA_SWING_ZOOM * t * t;
  }
  // FX age in sim time so advanceTime() verification is deterministic.
  mobsView.tick(FIXED_STEP_MS);
  fxView.tick(FIXED_STEP_MS);

  if (pendingDeathRespawn) {
    pendingDeathRespawn = false;
    changeMap('town', 'spawn');
  }
}

function draw() {
  playerView.update(gameState.player);
  mobsView.sync(gameState.mobs.mobs);
  mobsView.syncProjectiles(gameState.mobs.projectiles ?? []);
  fxView.sync([...gameState.combat.stars, ...net.remoteStars], simTimeMs);
  lootView.sync(gameState.loot.drops, simTimeMs, net.id);
  remoteView.sync(net.remoteList(), (r) => net.freshChat(r), (r) => net.freshLevelUp(r));
  remoteView.ownBubble(gameState.player, net.myChat, CHAT_SHOW_MS);
  hud.update(gameState, xpToNext);
  renderer.render(scene, camera);
}

cameraRig.snap(gameState.player);
net.join(gameState.mapId); // no-op unless ?mp=1

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
    mapId: gameState.mapId,
    shopOpen: gameState.shopOpen,
    transitionMs: Math.round(transitionMs),
    map: {
      id: m.id,
      minX: m.minX,
      maxX: m.maxX,
      spawn: m.spawn,
      platforms: m.platforms,
      ladders: m.ladders,
      mobSpawns: m.mobSpawns,
      portals: m.portals ?? [],
      npcs: m.npcs ?? [],
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
      mine: !d.ownerId || d.ownerId === net.id,
    })),
    remoteStars: net.remoteStars.map((s) => ({ x: round3(s.x), y: round3(s.y) })),
    mobs: gameState.mobs.mobs.map((mob) => ({
      id: mob.id,
      spawn: mob.spawn,
      type: mob.type,
      x: round3(mob.x),
      y: round3(mob.y),
      hp: mob.hp,
      maxHp: mob.maxHp,
      state: mob.state,
      facing: mob.facing,
    })),
    mobProjectiles: (gameState.mobs.projectiles ?? []).map((s) => ({
      x: round3(s.x),
      y: round3(s.y),
      vx: round3(s.vx),
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
    audio: audio.state(),
    multiplayer: {
      enabled: net.enabled,
      connected: net.connected,
      id: net.id,
      name: net.name,
      roomId: net.roomId,
    },
    remotePlayers: net.remoteList().map((r) => ({
      id: r.id,
      name: r.name,
      x: round3(r.x),
      y: round3(r.y),
      chat: net.freshChat(r),
      leveledUp: net.freshLevelUp(r),
    })),
    camera: {
      x: round3(camera.position.x),
      y: round3(camera.position.y),
      z: round3(camera.position.z),
    },
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
  gotoMap(mapId) {
    changeMap(mapId, 'spawn');
  },
  grantMesos(amount) {
    gameState.inventory.mesos += amount;
  },
  sendChat(text) {
    net.sendChat(text);
  },
  setStars(n) {
    gameState.inventory.stars = n;
  },
};
window.__debug = { renderer, scene, camera, gameState, eventBus, net };
