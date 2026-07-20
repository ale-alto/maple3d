import { test, expect } from '../fixtures/game-test.js';
import {
  SKILLS,
  STAR_TYPES,
  BASE_MASTERY,
  ATTACK_COOLDOWN_MS,
  BOOSTED_COOLDOWN_MS,
  RUN_SPEED,
} from '../../src/core/constants.js';
import { basicRange } from '../../src/sim/stats.js';

// M15 contract (reference §10): job tier 'assassin' at level 30 via the
// trainer (pool roll +200–250 HP / +150–200 MP, +1 SP); the 2nd-job kit —
// clawMastery (mastery% into min damage, acc +lv, star cap +10·lv),
// criticalThrow (crit rolls per star), endure (ladder/rope tick regen),
// clawBooster (B: cadence 720→600ms), haste (H: run speed buff),
// drain (A: single star, absorbs damage as HP). Save v8.

const setupAssassin = `() => {
  window.__test.setXp(34, 0);
  window.__test.setStats(4, 30, 4, 60);
  window.__test.advanceJob(); // beginner -> rogue
  window.__test.advanceJob(); // rogue -> assassin (level >= 30)
  window.advanceTime(50);
}`;

const spendSp = `(id, n) => {
  const kb = (t, k, code) => window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
  kb('keydown', 'k', 'KeyK'); kb('keyup', 'k', 'KeyK');
  for (let i = 0; i < n; i++) document.querySelector('.skill-add[data-skill="' + id + '"]')?.click();
  kb('keydown', 'k', 'KeyK'); kb('keyup', 'k', 'KeyK');
}`;

test.describe('M15 assassin', () => {
  test('advancement and mastery', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      window.__test.setXp(29, 0);
      window.__test.setStats(4, 30, 4, 60);
      window.__test.advanceJob();
      const tooEarly = window.__test.advanceJob(); // 29 < 30: refused
      window.__test.setXp(34, 0);
      const before = read().player;
      const ok = window.__test.advanceJob();
      window.advanceTime(50);
      const after = read().player;
      // Claw Mastery 10: mastery 35%, acc +10, star cap +100.
      eval(`(${spend})`)('clawMastery', 10);
      window.advanceTime(30);
      const p = read().player;
      return {
        tooEarly,
        ok,
        job: after.job,
        hpGain: after.maxHp - before.maxHp,
        mpGain: after.maxMp - before.maxMp,
        stats: p.stats,
        range: p.damageRange,
        acc: p.accuracy,
        accBefore: after.accuracy,
        starCap: p.starCap,
      };
    }, [setupAssassin, spendSp]);
    expect(result.tooEarly).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.job).toBe('assassin');
    expect(result.hpGain).toBeGreaterThanOrEqual(200);
    expect(result.hpGain).toBeLessThanOrEqual(250);
    expect(result.mpGain).toBeGreaterThanOrEqual(150);
    expect(result.mpGain).toBeLessThanOrEqual(200);
    expect(result.acc).toBeCloseTo(result.accBefore + 10, 1);
    expect(result.starCap).toBe(STAR_TYPES.steel.cap + 100);
    // Mastery 35% lifts MIN damage; max unchanged.
    const base = basicRange(result.stats, STAR_TYPES.steel.wa, BASE_MASTERY);
    const skilled = basicRange(result.stats, STAR_TYPES.steel.wa, 0.35);
    expect(result.range.max).toBe(Math.round(base.max));
    expect(result.range.min).toBe(Math.round(skilled.min));
  });

  test('critical throw crits', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('clawMastery', 3);
      eval(`(${spend})`)('criticalThrow', 30); // 50% chance, 200% damage
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setStars(400);
      const range = read().player.damageRange;
      const hits = [];
      for (let i = 0; i < 10 && hits.length < 8; i++) {
        const mob = read().mobs[0];
        if (!mob) {
          window.advanceTime(500);
          continue;
        }
        window.__test.setPlayerPos(mob.x - 3, mob.y);
        kb('keydown', 'ArrowRight', 'ArrowRight');
        window.advanceTime(30);
        kb('keyup', 'ArrowRight', 'ArrowRight');
        kb('keydown', 'Control', 'ControlLeft');
        window.advanceTime(60);
        kb('keyup', 'Control', 'ControlLeft');
        for (let t = 0; t < 24; t++) {
          window.advanceTime(50);
          const hit = read().fx.damageNumbers.find((n) => typeof n.value === 'number');
          if (hit) {
            hits.push(hit.value);
            window.advanceTime(900);
            break;
          }
        }
      }
      return { range, hits };
    }, [setupAssassin, spendSp]);
    // At 50% crit / 200% damage, some hits must exceed the base max.
    expect(result.hits.length).toBeGreaterThanOrEqual(6);
    expect(result.hits.some((h) => h > result.range.max + 1)).toBe(true);
    // And every hit stays within 2× the base max (crit ceiling).
    for (const h of result.hits) expect(h).toBeLessThanOrEqual(2 * result.range.max + 2);
  });

  test('booster and haste', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('clawMastery', 5);
      eval(`(${spend})`)('clawBooster', 1);
      eval(`(${spend})`)('haste', 10);
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      const before = read().player;
      kb('keydown', 'b', 'KeyB'); // booster
      window.advanceTime(60);
      kb('keyup', 'b', 'KeyB');
      kb('keydown', 'h', 'KeyH'); // haste (speed +20 at lv 10)
      window.advanceTime(60);
      kb('keyup', 'h', 'KeyH');
      const cast = read().player;
      // Run: haste speed 120 -> 1.2x run speed.
      window.__test.setPlayerPos(-15, 0);
      window.advanceTime(300);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(800);
      const vx = read().player.vx;
      kb('keyup', 'ArrowRight', 'ArrowRight');
      return {
        boosted: cast.boosterMs > 0,
        hasted: cast.hasteMs > 0,
        cooldown: cast.attackCooldownMs,
        hpCost: before.hp - cast.hp,
        vx,
      };
    }, [setupAssassin, spendSp]);
    expect(result.boosted).toBe(true);
    expect(result.hasted).toBe(true);
    expect(result.cooldown).toBe(BOOSTED_COOLDOWN_MS);
    expect(result.hpCost).toBe(29); // booster level 1 HP cost
    expect(result.vx).toBeGreaterThan(RUN_SPEED * 1.15);
    expect(result.vx).toBeLessThanOrEqual(RUN_SPEED * 1.21);
  });

  test('drain absorbs', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('endure', 3);
      eval(`(${spend})`)('drain', 10); // 120% damage, absorb 25%
      window.__test.gotoMap('field2'); // beefier mobs survive the hit
      window.advanceTime(100);
      window.__test.setStars(100);
      const mob = read().mobs.find((m) => m.type === 'bruiser');
      window.__test.setPlayerPos(mob.x - 3, mob.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      window.__debug.gameState.player.hp = 50; // room to heal
      const mpBefore = read().player.mp;
      kb('keydown', 'a', 'KeyA');
      window.advanceTime(60);
      kb('keyup', 'a', 'KeyA');
      let dealt = null;
      for (let t = 0; t < 24 && dealt === null; t++) {
        window.advanceTime(50);
        const hit = read().fx.damageNumbers.find((n) => typeof n.value === 'number');
        if (hit) dealt = hit.value;
      }
      const after = read().player;
      return { dealt, mpSpent: mpBefore - after.mp, hp: after.hp };
    }, [setupAssassin, spendSp]);
    expect(result.dealt).toBeGreaterThan(0);
    expect(result.mpSpent).toBeGreaterThanOrEqual(SKILLS.drain.mpCost - 2);
    // Healed by 25% of damage dealt (floor), from hp 50.
    expect(result.hp).toBe(50 + Math.floor(result.dealt * 0.25));
  });

  test('endure ticks on ladders', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('endure', 5); // HP +40 / MP +10 every 25 s
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      const ladder = read().map.ladders[0];
      window.__test.setPlayerPos(ladder.x, ladder.y1 + 0.5);
      kb('keydown', 'ArrowUp', 'ArrowUp');
      window.advanceTime(300); // grab the ladder
      kb('keyup', 'ArrowUp', 'ArrowUp');
      const onLadder = read().player.climbing;
      window.__debug.gameState.player.hp = 100;
      window.__test.setMp(0);
      window.advanceTime(26000); // one 25s endure tick
      const p = read().player;
      return { onLadder, hp: p.hp, mp: p.mp };
    }, [setupAssassin, spendSp]);
    expect(result.onLadder).toBe(true);
    expect(result.hp).toBe(140); // +40 endure tick
    // MP: +10 endure + the regular regen ticks (3 per 10s → 2 ticks).
    expect(result.mp).toBeGreaterThanOrEqual(10);
  });

  test('save v8 persists the assassin', async ({ gamePage }) => {
    await gamePage.evaluate(([setup, spend]) => {
      eval(`(${setup})`)();
      eval(`(${spend})`)('clawMastery', 4);
      window.advanceTime(50);
    }, [setupAssassin, spendSp]);
    const before = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    ).player;
    expect(before.job).toBe('assassin');
    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const after = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    ).player;
    expect(after.job).toBe('assassin');
    expect(after.skills.clawMastery).toBe(4);
    expect(after.maxHp).toBe(before.maxHp);
  });
});
