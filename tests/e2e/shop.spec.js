import { test, expect } from '../fixtures/game-test.js';
import {
  RED_POTION_PRICE,
  GEAR_TIERS,
  STARTING_POTIONS,
} from '../../src/core/constants.js';

// M04 contract, M14 shelf: town has a shop NPC; Up near it opens
// #shop-panel (#shop-buy-potion / #shop-buy-bluepotion / #shop-buy-claw /
// #shop-recharge); shopOpen in the payload; __test.grantMesos(n) hook.
// Recharge + blue potion mechanics are covered in items.spec.js.

const CLAW_PRICE = GEAR_TIERS.weapon[0].price;

function openShop() {
  const read = () => JSON.parse(window.render_game_to_text());
  const key = (t, k) => window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
  const npc = read().map.npcs.find((n) => n.id === 'shopkeeper');
  window.__test.setPlayerPos(npc.x, 0);
  window.advanceTime(200);
  key('keydown', 'ArrowUp');
  window.advanceTime(100);
  key('keyup', 'ArrowUp');
}

test.describe('M04 shop', () => {
  test('buy potion', async ({ gamePage }) => {
    const result = await gamePage.evaluate(
      ([price, open]) => {
        const read = () => JSON.parse(window.render_game_to_text());
        window.__test.gotoMap('town');
        window.__test.grantMesos(price + 5);
        window.advanceTime(100);
        eval(`(${open})`)();
        const isOpen = read().shopOpen;
        const panel = document.querySelector('#shop-panel');
        const visible = !!panel && panel.style.display !== 'none';
        const before = read().inventory;
        document.querySelector('#shop-buy-potion')?.click();
        window.advanceTime(50);
        const after = read().inventory;
        return { isOpen, visible, before, after };
      },
      [RED_POTION_PRICE, `${openShop}`],
    );
    expect(result.isOpen).toBe(true);
    expect(result.visible).toBe(true);
    expect(result.after.mesos).toBe(result.before.mesos - RED_POTION_PRICE);
    expect(result.after.potions).toBe(result.before.potions + 1);
  });

  test('buy starter claw', async ({ gamePage }) => {
    const result = await gamePage.evaluate(
      ([price, open]) => {
        const read = () => JSON.parse(window.render_game_to_text());
        window.__test.gotoMap('town');
        window.__test.grantMesos(price + 5);
        window.advanceTime(100);
        eval(`(${open})`)();
        const before = read().inventory;
        document.querySelector('#shop-buy-claw')?.click();
        window.advanceTime(50);
        const after = read().inventory;
        return { before, after };
      },
      [CLAW_PRICE, `${openShop}`],
    );
    expect(result.after.mesos).toBe(result.before.mesos - CLAW_PRICE);
    expect(result.after.bag.length).toBe(result.before.bag.length + 1);
    const claw = result.after.bag[result.after.bag.length - 1];
    expect(claw.slot).toBe('weapon');
    expect(claw.wa).toBe(GEAR_TIERS.weapon[0].roll[0]); // base roll from the shop
  });

  test('insufficient mesos', async ({ gamePage }) => {
    const result = await gamePage.evaluate((open) => {
      const read = () => JSON.parse(window.render_game_to_text());
      window.__test.gotoMap('town');
      window.advanceTime(100);
      eval(`(${open})`)();
      const before = read().inventory;
      document.querySelector('#shop-buy-potion')?.click();
      window.advanceTime(50);
      const after = read().inventory;
      return { before, after };
    }, `${openShop}`);
    expect(result.before.mesos).toBe(0); // fresh character
    expect(result.after.mesos).toBe(0);
    expect(result.after.potions).toBe(STARTING_POTIONS); // refused, unchanged
  });
});
