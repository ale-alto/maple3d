// Classic Maple keyboard preset: arrows move/climb, Alt jump, Ctrl attack,
// Z loot (attack/loot consumed from M02 on). Jump is edge-queued so a press
// between fixed steps is never lost — advanceTime() may run many steps per
// real frame.

const held = { left: false, right: false, up: false, down: false };
let jumpQueue = 0;
let attackHeld = false;
let attackQueue = 0;
let lootHeld = false; // Z: held-to-loot (vacuums drops you walk over)
let lootQueue = 0; // Z: edge, so a quick tap still registers between steps
let potionQueue = 0; // C
let muteQueue = 0; // M

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

let upPressQueue = 0; // rising-edge Up: portals/NPC interact (M04)

const isTyping = (e) =>
  e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

export function initKeyboard(target) {
  target.addEventListener('keydown', (e) => {
    if (isTyping(e)) return; // chat box open: keys type, not move
    if (KEYS[e.key]) {
      if (e.key === 'ArrowUp' && !e.repeat) upPressQueue += 1;
      held[KEYS[e.key]] = true;
      e.preventDefault();
    } else if (e.key === 'Alt') {
      if (!e.repeat) jumpQueue += 1;
      e.preventDefault();
    } else if (e.key === 'Control') {
      // Attack: held = auto-attack, edge-queued so taps between steps land.
      if (!e.repeat) attackQueue += 1;
      attackHeld = true;
      e.preventDefault();
    } else if (e.key === 'z' || e.key === 'Z') {
      if (!e.repeat) lootQueue += 1;
      lootHeld = true;
      e.preventDefault();
    } else if (e.key === 'c' || e.key === 'C') {
      if (!e.repeat) potionQueue += 1;
      e.preventDefault();
    } else if (e.key === 'm' || e.key === 'M') {
      if (!e.repeat) muteQueue += 1;
      e.preventDefault();
    }
  });

  target.addEventListener('keyup', (e) => {
    if (isTyping(e)) return;
    if (KEYS[e.key]) {
      held[KEYS[e.key]] = false;
      e.preventDefault();
    } else if (e.key === 'Alt') {
      e.preventDefault();
    } else if (e.key === 'Control') {
      attackHeld = false;
      e.preventDefault();
    } else if (e.key === 'z' || e.key === 'Z') {
      lootHeld = false;
      e.preventDefault();
    }
  });

  // Don't leave keys stuck when the tab loses focus mid-hold.
  target.addEventListener('blur', () => {
    held.left = held.right = held.up = held.down = false;
    jumpQueue = 0;
    attackHeld = false;
    attackQueue = 0;
    lootHeld = false;
    lootQueue = 0;
    potionQueue = 0;
    muteQueue = 0;
    upPressQueue = 0;
  });
}

// One sim step's input; consumes at most one queued edge per action.
export function readInput() {
  const jump = jumpQueue > 0;
  if (jump) jumpQueue -= 1;
  const attack = attackHeld || attackQueue > 0;
  if (attackQueue > 0) attackQueue -= 1;
  // Held OR a queued tap — so walking over a drop while holding Z loots it.
  const loot = lootHeld || lootQueue > 0;
  if (lootQueue > 0) lootQueue -= 1;
  const potion = potionQueue > 0;
  if (potion) potionQueue -= 1;
  const mute = muteQueue > 0;
  if (mute) muteQueue -= 1;
  const upPressed = upPressQueue > 0;
  if (upPressed) upPressQueue -= 1;
  return { ...held, jump, attack, loot, potion, mute, upPressed };
}
