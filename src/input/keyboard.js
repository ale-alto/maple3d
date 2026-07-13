// Classic Maple keyboard preset: arrows move/climb, Alt jump, Ctrl attack,
// Z loot (attack/loot consumed from M02 on). Jump is edge-queued so a press
// between fixed steps is never lost — advanceTime() may run many steps per
// real frame.

const held = { left: false, right: false, up: false, down: false };
let jumpQueue = 0;

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export function initKeyboard(target) {
  target.addEventListener('keydown', (e) => {
    if (KEYS[e.key]) {
      held[KEYS[e.key]] = true;
      e.preventDefault();
    } else if (e.key === 'Alt') {
      if (!e.repeat) jumpQueue += 1;
      e.preventDefault();
    } else if (e.key === 'Control' || e.key === 'z' || e.key === 'Z') {
      e.preventDefault(); // reserved: attack (M02), loot (M03)
    }
  });

  target.addEventListener('keyup', (e) => {
    if (KEYS[e.key]) {
      held[KEYS[e.key]] = false;
      e.preventDefault();
    } else if (e.key === 'Alt') {
      e.preventDefault();
    }
  });

  // Don't leave keys stuck when the tab loses focus mid-hold.
  target.addEventListener('blur', () => {
    held.left = held.right = held.up = held.down = false;
    jumpQueue = 0;
  });
}

// One sim step's input; consumes at most one queued jump edge.
export function readInput() {
  const jump = jumpQueue > 0;
  if (jump) jumpQueue -= 1;
  return { ...held, jump };
}
