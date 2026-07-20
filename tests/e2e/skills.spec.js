import { test, expect } from '../fixtures/game-test.js';
import { SKILLS, SP_PER_LEVEL, RUN_SPEED, STAR_TYPES } from '../../src/core/constants.js';
import { l7Range } from '../../src/sim/stats.js';

// M11 skills, rewritten for M13 job gating: SP only exists once advanced
// to Rogue (setXp keeps beginners at 0; __test.advanceJob() grants the
// advancement SP + catch-up). Lucky Seven rides its real 20-level table;
// Flash Jump left the early game (returns at Hermit — the spec here
// guards its absence and the single-jump rule).

// Level 14 rogue: SP earned = 1 + 3×(14−10) = 13.
const setupRogue = `() => {
  window.__test.setXp(14, 0);
  window.__test.setStats(4, 25, 4, 30);
  window.__test.advanceJob();
  window.advanceTime(50);
}`;

test.describe('M11 skills', () => {
  test('skill points and assignment', async ({ gamePage }) => {
    const result = await gamePage.evaluate((setup) => {
      eval(setup)();
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      const spAfterAdvance = read().player.sp;
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const panel = document.querySelector('#skill-panel');
      const open = !!panel && panel.style.display !== 'none';
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      document.querySelector('.skill-add[data-skill="nimbleBody"]')?.click();
      window.advanceTime(50);
      const after = read().player;
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const closed = panel.style.display === 'none';
      return { spAfterAdvance, open, closed, skills: after.skills, sp: after.sp };
    }, setupRogue);
    expect(result.spAfterAdvance).toBe(1 + 4 * SP_PER_LEVEL); // advance +1, catch-up 3×4
    expect(result.open).toBe(true);
    expect(result.skills.luckySeven).toBe(2);
    expect(result.skills.nimbleBody).toBe(1);
    expect(result.sp).toBe(1 + 4 * SP_PER_LEVEL - 3);
    expect(result.closed).toBe(true);
  });

  test('lucky seven volley', async ({ gamePage }) => {
    const result = await gamePage.evaluate((setup) => {
      eval(setup)();
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setStars(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      window.__test.gotoMap('field1');
      window.advanceTime(100);

      const mob = read().mobs[0];
      window.__test.setPlayerPos(mob.x - 3, mob.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      const before = read();
      const hpBefore = before.mobs.find((m) => m.id === mob.id).hp;

      kb('keydown', 'Shift', 'ShiftLeft');
      window.advanceTime(60);
      kb('keyup', 'Shift', 'ShiftLeft');
      const inFlight = read().projectiles.length;
      // Classic L7 shows TWO damage numbers, stacked apart.
      let numbers = [];
      for (let t = 0; t < 30 && numbers.length < 2; t++) {
        window.advanceTime(50);
        const fx = read().fx.damageNumbers;
        if (fx.length > numbers.length) numbers = fx;
      }
      window.advanceTime(1200);
      const after = read();
      return {
        numberCount: numbers.length,
        numberYs: numbers.map((n) => n.y),
        stats: before.player.stats,
        basicRange: before.player.damageRange,
        mpBefore: before.player.mp,
        starsBefore: before.inventory.stars,
        inFlight,
        mpAfter: after.player.mp,
        starsAfter: after.inventory.stars,
        hpDelta: hpBefore - (after.mobs.find((m) => m.id === mob.id)?.hp ?? 0),
      };
    }, setupRogue);
    expect(result.inFlight).toBe(2); // the volley
    expect(result.numberCount).toBe(2); // two damage numbers, classic L7
    expect(Math.abs(result.numberYs[0] - result.numberYs[1])).toBeGreaterThan(0.3);
    expect(result.starsBefore - result.starsAfter).toBe(2);
    expect(result.mpBefore - result.mpAfter).toBeGreaterThanOrEqual(SKILLS.luckySeven.mpCost[0] - 2);
    // Both stars rolled inside L7's own LUK×5/×2.5 basis at 58%.
    // Rogue with no claw: WA = the basic star type's WA (M14).
    const r = l7Range(result.stats, STAR_TYPES.steel.wa, SKILLS.luckySeven.pct[0] / 100);
    expect(result.hpDelta).toBeGreaterThanOrEqual(2 * Math.max(1, Math.floor(r.min)));
    expect(result.hpDelta).toBeLessThanOrEqual(2 * Math.ceil(r.max));
    const basicMid = (result.basicRange.min + result.basicRange.max) / 2;
    expect(r.min + r.max).toBeGreaterThan(basicMid); // 2 stars vs 1, midpoints
  });

  test('mp gates skills', async ({ gamePage }) => {
    const result = await gamePage.evaluate((setup) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setStars(50);
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      const mob0 = read().mobs[0];
      window.__test.setPlayerPos(mob0.x - 3, mob0.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');

      // Unlearned: Shift falls back to a single basic star.
      const starsA = read().inventory.stars;
      kb('keydown', 'Shift', 'ShiftLeft');
      window.advanceTime(60);
      kb('keyup', 'Shift', 'ShiftLeft');
      const unlearnedFlight = read().projectiles.length;
      window.advanceTime(1200);
      const unlearnedSpent = starsA - read().inventory.stars;

      // Learn it, then drain MP: still basic.
      eval(setup)();
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const mob1 = read().mobs[0];
      window.__test.setPlayerPos(mob1.x - 3, mob1.y);
      window.advanceTime(30);
      window.__test.setMp(0);
      const starsB = read().inventory.stars;
      kb('keydown', 'Shift', 'ShiftLeft');
      window.advanceTime(60);
      kb('keyup', 'Shift', 'ShiftLeft');
      const noMpFlight = read().projectiles.length;
      window.advanceTime(1200);
      const noMpSpent = starsB - read().inventory.stars;
      return { unlearnedFlight, unlearnedSpent, noMpFlight, noMpSpent };
    }, setupRogue);
    expect(result.unlearnedFlight).toBe(1);
    expect(result.unlearnedSpent).toBe(1);
    expect(result.noMpFlight).toBe(1);
    expect(result.noMpSpent).toBe(1);
  });

  test('no flash jump in the early game', async ({ gamePage }) => {
    const result = await gamePage.evaluate((setup) => {
      eval(setup)();
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      // Not in the skill panel (it's a Hermit skill — M15+).
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const fjButton = !!document.querySelector('.skill-add[data-skill="flashJump"]');
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      // Mid-air Alt: still nothing (M02 single-jump rule).
      window.__test.setPlayerPos(-10, 0);
      window.advanceTime(300);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      kb('keydown', 'Alt', 'AltLeft');
      window.advanceTime(50);
      kb('keyup', 'Alt', 'AltLeft');
      window.advanceTime(150);
      kb('keydown', 'Alt', 'AltLeft');
      window.advanceTime(50);
      kb('keyup', 'Alt', 'AltLeft');
      const vx = read().player.vx;
      kb('keyup', 'ArrowRight', 'ArrowRight');
      return { fjButton, vx };
    }, setupRogue);
    expect(result.fjButton).toBe(false);
    expect(Math.abs(result.vx)).toBeLessThanOrEqual(RUN_SPEED + 0.01);
  });

  test('skills persist', async ({ gamePage }) => {
    await gamePage.evaluate((setup) => {
      eval(setup)();
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      document.querySelector('.skill-add[data-skill="nimbleBody"]')?.click();
      window.advanceTime(50);
    }, setupRogue);
    const before = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(before.player.skills.luckySeven).toBe(1);
    expect(before.player.skills.nimbleBody).toBe(1);

    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const after = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(after.player.job).toBe('rogue');
    expect(after.player.skills).toEqual(before.player.skills);
    expect(after.player.sp).toBe(before.player.sp);
    expect(after.player.maxMp).toBe(before.player.maxMp);
  });
});
