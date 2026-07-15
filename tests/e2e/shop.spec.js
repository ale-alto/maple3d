import { test, expect } from '../fixtures/game-test.js';
import { POTION_PRICE, STARTING_POTIONS } from '../../src/core/constants.js';

// M04 contract: town has a shop NPC; Up near it opens a DOM shop panel
// (#shop-panel with #shop-buy-potion / #shop-buy-starpack buttons);
// shopOpen in the payload; __test.grantMesos(n) dev hook.

test.describe('M04 shop', () => {
  test('buy potion', async ({ gamePage }) => {
    const result = await gamePage.evaluate((price) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      window.__test.gotoMap('town');
      window.__test.grantMesos(price + 5);
      window.advanceTime(100);
      const npc = read().map.npcs[0];
      window.__test.setPlayerPos(npc.x, 0);
      window.advanceTime(200);
      key('keydown', 'ArrowUp');
      window.advanceTime(100);
      key('keyup', 'ArrowUp');
      const open = read().shopOpen;
      const panel = document.querySelector('#shop-panel');
      const visible = !!panel && panel.style.display !== 'none';
      const before = read().inventory;
      document.querySelector('#shop-buy-potion')?.click();
      window.advanceTime(50);
      const after = read().inventory;
      return { open, visible, before, after };
    }, POTION_PRICE);
    expect(result.open).toBe(true);
    expect(result.visible).toBe(true);
    expect(result.after.mesos).toBe(result.before.mesos - POTION_PRICE);
    expect(result.after.potions).toBe(result.before.potions + 1);
  });

  test('insufficient mesos', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      window.__test.gotoMap('town');
      window.advanceTime(100);
      const npc = read().map.npcs[0];
      window.__test.setPlayerPos(npc.x, 0);
      window.advanceTime(200);
      key('keydown', 'ArrowUp');
      window.advanceTime(100);
      key('keyup', 'ArrowUp');
      const before = read().inventory;
      document.querySelector('#shop-buy-potion')?.click();
      window.advanceTime(50);
      const after = read().inventory;
      return { before, after };
    });
    expect(result.before.mesos).toBe(0); // fresh character
    expect(result.after.mesos).toBe(0);
    expect(result.after.potions).toBe(STARTING_POTIONS); // refused, unchanged
  });
});
