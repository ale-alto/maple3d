import { test as base, expect } from '@playwright/test';

// M01 state contract, asserted by every spec:
// render_game_to_text() returns JSON with
//   coords: 'origin:world x:right y:up'
//   mode:   'field'
//   map:    { id, minX, maxX, platforms: [{x1, x2, y}], ladders: [{x, y1, y2}] }
//   player: { x, y, vx, vy, grounded, climbing, facing, jumpsLeft }
//   camera: { x, y }
// window.advanceTime(ms) steps the sim deterministically (fixed 60Hz steps).
// window.__test.setPlayerPos(x, y) is the dev-only teleport for spec setup.

export const test = base.extend({
  gamePage: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForFunction(
      () => typeof window.render_game_to_text === 'function' && typeof window.advanceTime === 'function',
      null,
      { timeout: 10000 },
    );
    await use(page);
  },
});

export async function state(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

export async function advance(page, ms) {
  await page.evaluate((t) => window.advanceTime(t), ms);
}

export async function teleport(page, x, y) {
  await page.evaluate(([px, py]) => window.__test.setPlayerPos(px, py), [x, y]);
}

// Hold a key for simMs of game time, then release.
export async function holdKey(page, key, simMs) {
  await page.keyboard.down(key);
  await advance(page, simMs);
  await page.keyboard.up(key);
}

export { expect };
