import { test, expect } from '../fixtures/game-test.js';
import { GEAR_TIERS } from '../../src/core/constants.js';
import { rollGear } from '../../src/sim/items.js';
import { mulberry32 } from '../../src/sim/rng.js';

// M10 contract: gear items {kind:'gear', gearId, slot, name, tier,
// attack|defense} roll at drop time (base + small random roll);
// player.equipment {weapon, armor} + inventory.bag in the payload;
// payload player.attack / player.defense are the derived stats;
// I toggles #inv-panel (bag cells .inv-cell[data-idx], equipped slots
// #inv-weapon / #inv-armor, click to equip/swap/unequip);
// __test.grantGear(slot, tier) dev hook adds a max-roll piece to the bag;
// save v3 round-trips equipment + bag.

test.describe('M10 gear', () => {
  test('gear drops with stats', () => {
    // Pure sim: forced-roll typeDef must always yield a well-formed piece
    // with its stat inside [base, base + roll].
    const rand = mulberry32(1234);
    const typeDef = { gearChance: 1, gearTierMax: 2 };
    const slots = new Set();
    for (let i = 0; i < 50; i++) {
      const item = rollGear(rand, typeDef);
      expect(item).toBeTruthy();
      expect(item.kind).toBe('gear');
      expect(['weapon', 'armor']).toContain(item.slot);
      expect(item.tier).toBeGreaterThanOrEqual(1);
      expect(item.tier).toBeLessThanOrEqual(2);
      const def = GEAR_TIERS[item.slot][item.tier - 1];
      expect(item.name).toBe(def.name);
      // M14: weapons roll wa inside the documented [lo, hi]; armor keeps
      // the base + [0..roll] shape.
      if (item.slot === 'weapon') {
        expect(item.wa).toBeGreaterThanOrEqual(def.roll[0]);
        expect(item.wa).toBeLessThanOrEqual(def.roll[1]);
        expect(item.levelReq).toBe(def.levelReq);
      } else {
        expect(item.defense).toBeGreaterThanOrEqual(def.defense);
        expect(item.defense).toBeLessThanOrEqual(def.defense + def.roll);
      }
      slots.add(item.slot);
    }
    expect(slots.size).toBe(2); // both slots occur
    // Zero chance never drops gear.
    expect(rollGear(rand, { gearChance: 0, gearTierMax: 2 })).toBeNull();
  });

  test('weapon attack applies', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      // Claws are rogue gear (M14) — advance first.
      window.__test.setXp(14, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setStars(50);

      const hitMob = () => {
        // Teleport just left of the first mob, face it, one throw, let the
        // star land; return the mob's hp delta.
        const mob = read().mobs[0];
        window.__test.setPlayerPos(mob.x - 3, mob.y);
        key('keydown', 'ArrowRight', 'ArrowRight');
        window.advanceTime(30);
        key('keyup', 'ArrowRight', 'ArrowRight');
        const before = read().mobs.find((m) => m.id === mob.id).hp;
        key('keydown', 'Control', 'ControlLeft');
        window.advanceTime(60);
        key('keyup', 'Control', 'ControlLeft');
        window.advanceTime(1200);
        const after = read().mobs.find((m) => m.id === mob.id)?.hp ?? 0;
        return before - after;
      };

      const baseRange = read().player.damageRange;
      const baseDelta = hitMob();

      window.__test.grantGear('weapon', 1);
      const item = read().inventory.bag[0];
      // Equip through the real UI.
      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(50);
      const equipped = read().player.equipment.weapon;
      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');

      const armedRange = read().player.damageRange;
      const armedDelta = hitMob();
      return { baseRange, baseDelta, item, equipped, armedRange, armedDelta };
    });
    // M12: weapon attack multiplies through the WA term — a claw widens
    // the whole documented damage range, and rolls land inside it.
    expect(result.baseDelta).toBeGreaterThanOrEqual(Math.floor(result.baseRange.min));
    expect(result.baseDelta).toBeLessThanOrEqual(Math.ceil(result.baseRange.max));
    expect(result.equipped?.gearId).toBe(result.item.gearId);
    expect(result.armedRange.max).toBeGreaterThan(result.baseRange.max);
    expect(result.armedDelta).toBeGreaterThanOrEqual(Math.floor(result.armedRange.min));
    expect(result.armedDelta).toBeLessThanOrEqual(Math.ceil(result.armedRange.max));
  });

  test('defense applies', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.gotoMap('field1');
      window.advanceTime(100);

      const takeContactHit = () => {
        const mob = read().mobs[0];
        const before = read().player.hp;
        window.__test.setPlayerPos(mob.x, mob.y); // stand inside the mob
        window.advanceTime(120);
        return before - read().player.hp;
      };

      const bareLoss = takeContactHit();
      // Wait out i-frames somewhere safe.
      window.__test.setPlayerPos(-18, 0);
      window.advanceTime(1500);

      window.__test.grantGear('armor', 1);
      const item = read().inventory.bag[0];
      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(50);
      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');
      const defense = read().player.defense;
      const armoredLoss = takeContactHit();
      return { bareLoss, armoredLoss, defense, itemDefense: item.defense };
    });
    expect(result.bareLoss).toBeGreaterThan(0);
    expect(result.defense).toBe(result.itemDefense);
    expect(result.armoredLoss).toBe(Math.max(1, result.bareLoss - result.defense));
  });

  test('equip ui', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      const visible = () => {
        const el = document.querySelector('#inv-panel');
        return !!el && el.style.display !== 'none';
      };
      const closedAtBoot = !visible();
      // Claws are rogue gear with level reqs (M14) — qualify for tier 2.
      window.__test.setXp(16, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');
      const openAfterI = visible();

      window.__test.grantGear('weapon', 1);
      window.__test.grantGear('weapon', 2);
      window.advanceTime(50);
      const bagBefore = read().inventory.bag.map((g) => g.gearId);
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(50);
      const equippedFirst = read().player.equipment.weapon?.gearId;
      // Equip the second — the first swaps back into the bag.
      const idx2 = read().inventory.bag.findIndex((g) => g.gearId === bagBefore[1]);
      document.querySelector(`.inv-cell[data-idx="${idx2}"]`)?.click();
      window.advanceTime(50);
      const equippedSecond = read().player.equipment.weapon?.gearId;
      const bagAfterSwap = read().inventory.bag.map((g) => g.gearId);
      // Click the equipped slot: unequip back to the bag.
      document.querySelector('#inv-weapon')?.click();
      window.advanceTime(50);
      const equippedAfterUnequip = read().player.equipment.weapon;
      const bagFinal = read().inventory.bag.length;

      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');
      const closedAfterSecondI = !visible();
      return {
        closedAtBoot, openAfterI, bagBefore, equippedFirst, equippedSecond,
        bagAfterSwap, equippedAfterUnequip, bagFinal, closedAfterSecondI,
      };
    });
    expect(result.closedAtBoot).toBe(true);
    expect(result.openAfterI).toBe(true);
    expect(result.equippedFirst).toBe(result.bagBefore[0]);
    expect(result.equippedSecond).toBe(result.bagBefore[1]);
    expect(result.bagAfterSwap).toContain(result.bagBefore[0]); // swapped back
    expect(result.equippedAfterUnequip).toBeNull();
    expect(result.bagFinal).toBe(2);
    expect(result.closedAfterSecondI).toBe(true);
  });

  test('equipment persists', async ({ gamePage }) => {
    await gamePage.evaluate(() => {
      const key = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      // Claws are rogue gear with level reqs (M14).
      window.__test.setXp(16, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      window.__test.grantGear('weapon', 2);
      window.__test.grantGear('armor', 1);
      key('keydown', 'i', 'KeyI');
      key('keyup', 'i', 'KeyI');
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(50);
      // The second piece is now bag[0] (first one moved to the weapon slot).
      document.querySelector('.inv-cell[data-idx="0"]')?.click();
      window.advanceTime(50);
    });
    const before = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(before.player.equipment.weapon).toBeTruthy();
    expect(before.player.equipment.armor).toBeTruthy();

    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const after = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(after.player.equipment.weapon?.gearId).toBe(before.player.equipment.weapon.gearId);
    expect(after.player.equipment.weapon?.wa).toBe(before.player.equipment.weapon.wa);
    expect(after.player.equipment.armor?.gearId).toBe(before.player.equipment.armor.gearId);
    expect(after.player.damageRange).toEqual(before.player.damageRange);
  });
});
