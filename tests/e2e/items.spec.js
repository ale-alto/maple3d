import { test, expect } from '../fixtures/game-test.js';
import {
  STAR_TYPES,
  GEAR_TIERS,
  BASE_MASTERY,
  RED_POTION_HEAL,
  RED_POTION_PRICE,
  BLUE_POTION_MP,
  BLUE_POTION_PRICE,
} from '../../src/core/constants.js';
import { basicRange } from '../../src/sim/stats.js';

// M14 contract (reference §9): weapon attack comes from equipment —
// totalWa = (claw.wa ?? 0) + STAR_TYPES[inventory.starType].wa (interim
// BASE_WA retired). Claw tiers carry the real ladder (wa rolled in
// [lo,hi], levelReq, thief-only). Stars are typed + rechargeable at the
// shop (#shop-recharge, per-star price × missing to cap). Potions: Red
// heals 50 on C, Blue restores 100 MP on X, real prices. Save v7.

const setupRogue = `() => {
  window.__test.setXp(14, 0);
  window.__test.setStats(4, 25, 4, 30);
  window.__test.advanceJob();
  window.advanceTime(50);
}`;

test.describe('M14 items', () => {
  test('wa from equipment', async ({ gamePage }) => {
    const result = await gamePage.evaluate((setup) => {
      eval(setup)();
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      const bare = read().player; // no claw: star WA only
      window.__test.grantGear('weapon', 1);
      const item = read().inventory.bag[0];
      kb('keydown', 'i', 'KeyI');
      kb('keyup', 'i', 'KeyI');
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(50);
      kb('keydown', 'i', 'KeyI');
      kb('keyup', 'i', 'KeyI');
      const armed = read().player;
      return {
        stats: bare.stats,
        starType: read().inventory.starType,
        bareRange: bare.damageRange,
        itemWa: item.wa,
        armedRange: armed.damageRange,
      };
    }, setupRogue);
    expect(result.starType).toBe('steel');
    const starWa = STAR_TYPES.steel.wa;
    const bare = basicRange(result.stats, starWa, BASE_MASTERY);
    expect(result.bareRange.max).toBe(Math.round(bare.max));
    // Claw wa rolled inside the documented range for its tier.
    const def = GEAR_TIERS.weapon[0];
    expect(result.itemWa).toBeGreaterThanOrEqual(def.roll[0]);
    expect(result.itemWa).toBeLessThanOrEqual(def.roll[1]);
    const armed = basicRange(result.stats, starWa + result.itemWa, BASE_MASTERY);
    expect(result.armedRange.max).toBe(Math.round(armed.max));
  });

  test('claw level req', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      const openInv = () => {
        kb('keydown', 'i', 'KeyI');
        kb('keyup', 'i', 'KeyI');
      };
      // Leveled beginner: claws are thief gear — refused pre-advancement.
      window.__test.setXp(12, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.advanceTime(50);
      window.__test.grantGear('weapon', 1); // levelReq 10
      openInv();
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(30);
      const beginnerEquip = read().player.equipment.weapon;
      // Advance: the same claw now equips…
      window.__test.advanceJob();
      window.advanceTime(30);
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(30);
      const rogueEquip = read().player.equipment.weapon?.tier;
      // …but a level-15 claw stays locked at level 12.
      window.__test.grantGear('weapon', 2); // levelReq 15
      window.advanceTime(30);
      const idx = read().inventory.bag.length - 1;
      document.querySelector(`.inv-cell[data-idx="${idx}"]`)?.click();
      window.advanceTime(30);
      const stillTier = read().player.equipment.weapon?.tier;
      openInv();
      return { beginnerEquip, rogueEquip, stillTier };
    });
    expect(result.beginnerEquip).toBeNull();
    expect(result.rogueEquip).toBe(1);
    expect(result.stillTier).toBe(1); // tier-2 refused underleveled
  });

  test('star recharge', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k) => window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      window.__test.gotoMap('town');
      window.__test.grantMesos(1000);
      window.__test.setStars(100);
      window.advanceTime(100);
      const npc = read().map.npcs.find((n) => n.id === 'shopkeeper');
      window.__test.setPlayerPos(npc.x, 0);
      window.advanceTime(200);
      kb('keydown', 'ArrowUp');
      window.advanceTime(100);
      kb('keyup', 'ArrowUp');
      const before = read().inventory;
      document.querySelector('#shop-recharge')?.click();
      window.advanceTime(50);
      const after = read().inventory;
      return { before, after };
    });
    const cap = STAR_TYPES.steel.cap;
    const missing = cap - result.before.stars;
    expect(result.after.stars).toBe(cap);
    expect(result.before.mesos - result.after.mesos).toBe(
      Math.ceil(missing * STAR_TYPES.steel.rechargePerStar),
    );
  });

  test('potions', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([redPrice, bluePrice]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(14, 0); // pools big enough to see full effects
      window.advanceTime(50);
      window.__test.gotoMap('town');
      window.__test.grantMesos(1000);
      window.advanceTime(100);
      const npc = read().map.npcs.find((n) => n.id === 'shopkeeper');
      window.__test.setPlayerPos(npc.x, 0);
      window.advanceTime(200);
      kb('keydown', 'ArrowUp', 'ArrowUp');
      window.advanceTime(100);
      kb('keyup', 'ArrowUp', 'ArrowUp');
      const m0 = read().inventory.mesos;
      document.querySelector('#shop-buy-potion')?.click();
      window.advanceTime(30);
      const m1 = read().inventory.mesos;
      document.querySelector('#shop-buy-bluepotion')?.click();
      window.advanceTime(30);
      const m2 = read().inventory.mesos;
      const inv = read().inventory;

      // Red on C: heals 50 from a deficit.
      window.__debug.gameState.player.hp = read().player.maxHp - 120;
      const hpBefore = read().player.hp;
      kb('keydown', 'c', 'KeyC');
      window.advanceTime(60);
      kb('keyup', 'c', 'KeyC');
      const hpAfter = read().player.hp;

      // Blue on X: restores 100 MP.
      window.__test.setMp(10);
      kb('keydown', 'x', 'KeyX');
      window.advanceTime(60);
      kb('keyup', 'x', 'KeyX');
      const mpAfter = read().player.mp;
      return {
        redCost: m0 - m1,
        blueCost: m1 - m2,
        bluePotions: inv.bluePotions,
        hpDelta: hpAfter - hpBefore,
        mpAfter,
      };
    }, [RED_POTION_PRICE, BLUE_POTION_PRICE]);
    expect(result.redCost).toBe(RED_POTION_PRICE);
    expect(result.blueCost).toBe(BLUE_POTION_PRICE);
    expect(result.bluePotions).toBe(1);
    expect(result.hpDelta).toBe(RED_POTION_HEAL);
    expect(result.mpAfter).toBe(10 + BLUE_POTION_MP);
  });

  test('save v7', async ({ gamePage }) => {
    await gamePage.evaluate(() => {
      window.__test.setStars(321);
      window.__debug.gameState.inventory.bluePotions = 4;
      window.__test.grantMesos(1); // trigger nothing; persist via event below
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // no-op at full hp
      window.__debug.eventBus.emit('shop:bought', { kind: 'noop', price: 0 }); // force persist
    });
    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const inv = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    ).inventory;
    expect(inv.starType).toBe('steel');
    expect(inv.stars).toBe(321);
    expect(inv.bluePotions).toBe(4);
  });
});
