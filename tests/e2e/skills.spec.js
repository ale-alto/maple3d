import { test, expect } from '../fixtures/game-test.js';
import { SKILLS, SP_PER_LEVEL, RUN_SPEED } from '../../src/core/constants.js';

// M11 contract: player.mp/maxMp/sp/skills in the payload; +SP_PER_LEVEL
// skill points per level-up (__test.setXp grants retroactively); K toggles
// #skill-panel with .skill-add[data-skill] buttons and .skill-level[data-skill]
// readouts; Shift = Lucky Seven (2-star volley, mult per star, MP + 2 stars,
// falls back to basic when unaffordable/unlearned); Alt mid-air = Flash Jump
// (skill + MP gated horizontal burst; single jump stays the rule otherwise);
// __test.setMp(n) dev hook; save v4 round-trips skills/sp/mp.

const key = `(t, k, code) => window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }))`;

test.describe('M11 skills', () => {
  test('skill points and assignment', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(3, 0); // retroactive SP for dev-leveled characters
      window.advanceTime(50);
      const spAtL3 = read().player.sp;

      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const panel = document.querySelector('#skill-panel');
      const open = !!panel && panel.style.display !== 'none';
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      document.querySelector('.skill-add[data-skill="flashJump"]')?.click();
      window.advanceTime(50);
      const after = read().player;
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const closed = panel.style.display === 'none';
      return { spAtL3, open, closed, skills: after.skills, sp: after.sp };
    });
    expect(result.spAtL3).toBe(2 * SP_PER_LEVEL); // levels 2 and 3
    expect(result.open).toBe(true);
    expect(result.skills.luckySeven).toBe(2);
    expect(result.skills.flashJump).toBe(1);
    expect(result.sp).toBe(2 * SP_PER_LEVEL - 3);
    expect(result.closed).toBe(true);
  });

  test('lucky seven volley', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(3, 0);
      window.__test.setStars(50);
      window.advanceTime(50);
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
      window.advanceTime(1200);
      const after = read();
      return {
        attack: before.player.attack,
        mpBefore: before.player.mp,
        starsBefore: before.inventory.stars,
        inFlight,
        mpAfter: after.player.mp,
        starsAfter: after.inventory.stars,
        hpDelta: hpBefore - (after.mobs.find((m) => m.id === mob.id)?.hp ?? 0),
      };
    });
    expect(result.inFlight).toBe(2); // the volley
    expect(result.starsBefore - result.starsAfter).toBe(2);
    // MP spent (regen may add a sliver back during the flight).
    expect(result.mpBefore - result.mpAfter).toBeGreaterThanOrEqual(SKILLS.luckySeven.mpCost - 2);
    const perStar = Math.round(result.attack * SKILLS.luckySeven.mult[0]);
    expect(result.hpDelta).toBe(2 * perStar);
    expect(result.hpDelta).toBeGreaterThan(result.attack); // out-damages basic
  });

  test('mp gates skills', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
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
      window.__test.setXp(2, 0);
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      window.__test.setMp(0);
      const starsB = read().inventory.stars;
      kb('keydown', 'Shift', 'ShiftLeft');
      window.advanceTime(60);
      kb('keyup', 'Shift', 'ShiftLeft');
      const noMpFlight = read().projectiles.length;
      window.advanceTime(1200);
      const noMpSpent = starsB - read().inventory.stars;
      return { unlearnedFlight, unlearnedSpent, noMpFlight, noMpSpent };
    });
    expect(result.unlearnedFlight).toBe(1);
    expect(result.unlearnedSpent).toBe(1);
    expect(result.noMpFlight).toBe(1);
    expect(result.noMpSpent).toBe(1);
  });

  test('flash jump', async ({ gamePage }) => {
    const result = await gamePage.evaluate((runSpeed) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      const airborneAlt = () => {
        // Jump, then Alt again mid-air while holding right.
        kb('keydown', 'ArrowRight', 'ArrowRight');
        kb('keydown', 'Alt', 'AltLeft');
        window.advanceTime(50);
        kb('keyup', 'Alt', 'AltLeft');
        window.advanceTime(150); // airborne now
        kb('keydown', 'Alt', 'AltLeft');
        window.advanceTime(50);
        kb('keyup', 'Alt', 'AltLeft');
        const vx = read().player.vx;
        kb('keyup', 'ArrowRight', 'ArrowRight');
        window.advanceTime(1200); // land + settle
        return vx;
      };

      window.__test.setPlayerPos(-10, 0);
      window.advanceTime(300);
      const bareVx = airborneAlt(); // no skill: single jump only
      const mpBare = read().player.mp;

      window.__test.setXp(2, 0);
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="flashJump"]')?.click();
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      window.__test.setMp(30);
      window.__test.setPlayerPos(-10, 0);
      window.advanceTime(300);
      const skilledVx = airborneAlt();
      const mpAfter = read().player.mp;
      return { bareVx, skilledVx, mpBare, mpAfter };
    }, RUN_SPEED);
    // Unskilled mid-air Alt: still just running speed (M02 single-jump rule).
    expect(Math.abs(result.bareVx)).toBeLessThanOrEqual(RUN_SPEED + 0.01);
    // Flash jump: horizontal burst well past run speed, MP spent.
    expect(result.skilledVx).toBeGreaterThan(RUN_SPEED + 1);
    expect(result.skilledVx).toBeGreaterThanOrEqual(SKILLS.flashJump.vx - 0.5);
    expect(result.mpAfter).toBeLessThan(30);
  });

  test('skills persist', async ({ gamePage }) => {
    await gamePage.evaluate(() => {
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(4, 0);
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      document.querySelector('.skill-add[data-skill="flashJump"]')?.click();
      window.advanceTime(50);
    });
    const before = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(before.player.skills.luckySeven).toBe(1);
    expect(before.player.skills.flashJump).toBe(1);

    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const after = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(after.player.skills).toEqual(before.player.skills);
    expect(after.player.sp).toBe(before.player.sp);
    expect(after.player.maxMp).toBe(before.player.maxMp);
  });
});
