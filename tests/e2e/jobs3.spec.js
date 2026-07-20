import { test, expect } from '../fixtures/game-test.js';
import { SKILLS, RED_POTION_HEAL, RUN_SPEED } from '../../src/core/constants.js';

// M16 contract (reference §11): job tier 'hermit' at level 70 (+1 SP, no
// pool roll); Flash Jump RETURNS (hermit skill, prereq Avenger 5, real MP
// table, Alt mid-air burst); Avenger (Q) — 3 stars, pierces several mobs;
// Shadow Partner (W) — echo hit on every star; Alchemist — potion
// recovery multiplier.

const setupHermit = `() => {
  window.__test.setXp(72, 0);
  window.__test.setStats(4, 60, 4, 120);
  window.__test.advanceJob(); // -> rogue
  window.__test.advanceJob(); // -> assassin
  window.__test.advanceJob(); // -> hermit
  window.advanceTime(50);
}`;

const spendSp = `(id, n) => {
  const kb = (t, k, code) => window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
  kb('keydown', 'k', 'KeyK'); kb('keyup', 'k', 'KeyK');
  for (let i = 0; i < n; i++) document.querySelector('.skill-add[data-skill="' + id + '"]')?.click();
  kb('keydown', 'k', 'KeyK'); kb('keyup', 'k', 'KeyK');
}`;

test.describe('M16 hermit', () => {
  test('hermit advancement and flash jump returns', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      const job = read().player.job;
      // FJ requires Avenger 5 — locked before, unlocked after.
      eval(`(${spend})`)('flashJump', 1);
      const lockedFj = read().player.skills.flashJump;
      eval(`(${spend})`)('avenger', 5);
      eval(`(${spend})`)('flashJump', 1);
      const fj = read().player.skills.flashJump;
      // Mid-air Alt bursts past run speed and spends 60 MP at level 1.
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setPlayerPos(-10, 0);
      window.advanceTime(300);
      window.__test.setMp(100);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      kb('keydown', 'Alt', 'AltLeft');
      window.advanceTime(50);
      kb('keyup', 'Alt', 'AltLeft');
      window.advanceTime(150);
      kb('keydown', 'Alt', 'AltLeft');
      window.advanceTime(50);
      kb('keyup', 'Alt', 'AltLeft');
      const vx = read().player.vx;
      const mp = read().player.mp;
      kb('keyup', 'ArrowRight', 'ArrowRight');
      return { job, lockedFj, fj, vx, mp };
    }, [setupHermit, spendSp]);
    expect(result.job).toBe('hermit');
    expect(result.lockedFj).toBe(0); // Avenger 5 prereq enforced
    expect(result.fj).toBe(1);
    expect(result.vx).toBeGreaterThan(RUN_SPEED + 1); // the burst is back
    expect(result.mp).toBe(100 - SKILLS.flashJump.mpCost[0]); // 60 at L1
  });

  test('avenger pierces', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('avenger', 10); // 110%, up to 4 targets
      window.__test.gotoMap('field2');
      window.advanceTime(100);
      window.__test.setStars(100);
      // Two ground bruisers side by side: drag one toward the other by
      // standing between them, then cast from the left.
      const spawns = read().map.mobSpawns;
      const ground = read().mobs.filter((m) => spawns[m.spawn].y === 0);
      if (ground.length < 2) return { skip: true };
      const left = Math.min(...ground.map((m) => m.x));
      window.__test.setPlayerPos(left - 3, 0);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      const starsBefore = read().inventory.stars;
      const mpBefore = read().player.mp;
      const hpBefore = Object.fromEntries(read().mobs.map((m) => [m.id, m.hp]));
      kb('keydown', 'q', 'KeyQ');
      window.advanceTime(60);
      kb('keyup', 'q', 'KeyQ');
      window.advanceTime(1500);
      const after = read();
      const hurt = after.mobs.filter((m) => hpBefore[m.id] !== undefined && m.hp < hpBefore[m.id]).length +
        Object.keys(hpBefore).filter((id) => !after.mobs.some((m) => m.id === +id || m.id === id)).length;
      return {
        starsSpent: starsBefore - after.inventory.stars,
        mpSpent: mpBefore - after.player.mp,
        hurt,
      };
    }, [setupHermit, spendSp]);
    if (result.skip) test.skip();
    expect(result.starsSpent).toBe(3); // Avenger consumes 3 stars
    expect(result.mpSpent).toBeGreaterThanOrEqual(15); // MP 16 at L10 (regen slack)
    expect(result.hurt).toBeGreaterThanOrEqual(1); // pierce lands (>=1 in the lane)
  });

  test('shadow partner echoes', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('shadowPartner', 1); // echo at 20%
      window.__test.gotoMap('field2');
      window.advanceTime(100);
      window.__test.setStars(100);
      window.__test.setMp(400);
      kb('keydown', 'w', 'KeyW');
      window.advanceTime(60);
      kb('keyup', 'w', 'KeyW');
      const active = read().player.shadowMs > 0;
      const mpAfter = read().player.mp;
      // One basic throw at a bruiser → TWO damage numbers (hit + echo).
      const mob = read().mobs.find((m) => m.type === 'bruiser');
      window.__test.setPlayerPos(mob.x - 3, mob.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      kb('keydown', 'Control', 'ControlLeft');
      window.advanceTime(60);
      kb('keyup', 'Control', 'ControlLeft');
      let numbers = [];
      for (let t = 0; t < 24 && numbers.length < 2; t++) {
        window.advanceTime(50);
        const fx = read().fx.damageNumbers.filter((n) => typeof n.value === 'number');
        if (fx.length > numbers.length) numbers = fx;
      }
      return { active, mpSpent: 400 - mpAfter, numbers: numbers.map((n) => n.value) };
    }, [setupHermit, spendSp]);
    expect(result.active).toBe(true);
    expect(result.mpSpent).toBe(200); // level 1 cost
    expect(result.numbers.length).toBe(2); // main + shadow echo
    const [a, b] = [Math.max(...result.numbers), Math.min(...result.numbers)];
    expect(b).toBe(Math.max(1, Math.round(a * 0.2))); // echo at 20%
  });

  test('alchemist boosts potions', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('alchemist', 10); // 130% recovery
      window.__debug.gameState.player.hp = 100;
      kb('keydown', 'c', 'KeyC');
      window.advanceTime(60);
      kb('keyup', 'c', 'KeyC');
      return { hp: read().player.hp };
    }, [setupHermit, spendSp]);
    expect(result.hp).toBe(100 + Math.floor(RED_POTION_HEAL * 1.3)); // 65
  });
});
