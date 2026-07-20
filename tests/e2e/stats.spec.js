import { test, expect } from '../fixtures/game-test.js';
import {
  AP_PER_LEVEL,
  BASE_MASTERY,
  MP_REGEN_AMOUNT,
  MP_REGEN_INTERVAL_MS,
} from '../../src/core/constants.js';
import {
  rollNewStats,
  basicRange,
  l7Range,
  thiefAccuracy,
  thiefAvoid,
  hitChance,
  expToNext,
  levelUpGains,
} from '../../src/sim/stats.js';
import { mulberry32 } from '../../src/sim/rng.js';

// M12 contract (docs/reference/ms-v62-mechanics.md — every number sourced):
// src/sim/stats.js pure module with the pre-BB formulas; payload gains
// player.stats {str,dex,int,luk}, player.ap, player.accuracy,
// player.damageRange {min,max}; S toggles #stat-panel with
// .stat-add[data-stat] buttons and #stat-ap; damage rolls uniformly in
// [min,max]; misses render as 'MISS' in fx.damageNumbers when the hit
// formula fails; EXP table is the exact piecewise curve; MP regen is
// +3 per 10 s; save v5 round-trips stats/ap; __test.setStats hook.

test.describe('M12 character sheet', () => {
  test('formulas match the reference doc', () => {
    // Stat roll: STR 4 / INT 4, DEX+LUK = 17, every stat within dice 4–13.
    const rand = mulberry32(42);
    for (let i = 0; i < 25; i++) {
      const s = rollNewStats(rand);
      expect(s.str).toBe(4);
      expect(s.int).toBe(4);
      expect(s.dex + s.luk).toBe(17);
      for (const v of [s.dex, s.luk]) {
        expect(v).toBeGreaterThanOrEqual(4);
        expect(v).toBeLessThanOrEqual(13);
      }
    }
    // Basic claw/star damage (thief): documented min/max.
    const stats = { str: 4, dex: 25, int: 4, luk: 60 };
    const wa = 40;
    const r = basicRange(stats, wa, BASE_MASTERY);
    expect(r.max).toBeCloseTo(((60 * 3.6 + 4 + 25) * wa) / 100, 5);
    expect(r.min).toBeCloseTo(((60 * 3.6 * 0.9 * BASE_MASTERY + 4 + 25) * wa) / 100, 5);
    // Lucky Seven basis: LUK×5 / LUK×2.5, ignores mastery, scaled by skill %.
    const l7 = l7Range(stats, wa, 0.58);
    expect(l7.max).toBeCloseTo(((5.0 * 60) / 100) * wa * 0.58, 5);
    expect(l7.min).toBeCloseTo(((2.5 * 60) / 100) * wa * 0.58, 5);
    // Accuracy / avoid.
    expect(thiefAccuracy(stats)).toBeCloseTo(25 * 0.6 + 60 * 0.3, 5);
    expect(thiefAvoid(stats)).toBeCloseTo(25 * 0.25 + 60 * 0.5, 5);
    // Hit chance: ACC/((1.84+0.07D)·avoid) − 1, clamped to [0,1].
    expect(hitChance(3.6, 6, 0)).toBe(0); // hopeless accuracy → always miss
    expect(hitChance(1000, 6, 0)).toBe(1); // overwhelming → always hit
    const mid = hitChance(15, 6, 2);
    expect(mid).toBeCloseTo(Math.min(1, Math.max(0, 15 / ((1.84 + 0.07 * 2) * 6) - 1)), 5);
    // EXP table: exact piecewise values.
    expect(expToNext(1)).toBe(2 * 1 + 13); // 2·1²+13·1 = 15
    expect(expToNext(2)).toBe(2 * 4 + 26); // 34
    expect(expToNext(4)).toBe(4 * 16 + 28); // 4·lvl²+7·lvl = 92
    expect(expToNext(9)).toBe((9 ** 4 + 57 * 81) / 9); // divisible by 3
    expect(expToNext(10)).toBe((10 ** 4 + 55 * 100 - 56) / 9); // not divisible
    // Level-up gains: thief 20–24 HP / 14–16 MP + INT/10.
    for (let i = 0; i < 30; i++) {
      const g = levelUpGains(rand, 'thief', 20);
      expect(g.hp).toBeGreaterThanOrEqual(20);
      expect(g.hp).toBeLessThanOrEqual(24);
      expect(g.mp).toBeGreaterThanOrEqual(14 + 2);
      expect(g.mp).toBeLessThanOrEqual(16 + 2);
    }
    const b = levelUpGains(rand, 'beginner', 0);
    expect(b.hp).toBeGreaterThanOrEqual(12);
    expect(b.hp).toBeLessThanOrEqual(16);
  });

  test('ap allocation', async ({ gamePage }) => {
    const result = await gamePage.evaluate((apPerLevel) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(4, 0);
      window.advanceTime(50);
      const apAtL4 = read().player.ap;
      const lukBefore = read().player.stats.luk;

      kb('keydown', 's', 'KeyS');
      kb('keyup', 's', 'KeyS');
      const panel = document.querySelector('#stat-panel');
      const open = !!panel && panel.style.display !== 'none';
      document.querySelector('.stat-add[data-stat="luk"]')?.click();
      document.querySelector('.stat-add[data-stat="luk"]')?.click();
      document.querySelector('.stat-add[data-stat="dex"]')?.click();
      window.advanceTime(50);
      const p = read().player;
      kb('keydown', 's', 'KeyS');
      kb('keyup', 's', 'KeyS');
      const closed = panel.style.display === 'none';
      return { apAtL4, open, closed, lukBefore, stats: p.stats, ap: p.ap };
    }, AP_PER_LEVEL);
    expect(result.apAtL4).toBe(3 * AP_PER_LEVEL); // levels 2,3,4
    expect(result.open).toBe(true);
    expect(result.stats.luk).toBe(result.lukBefore + 2);
    expect(result.ap).toBe(3 * AP_PER_LEVEL - 3);
    expect(result.closed).toBe(true);
  });

  test('damage rolls within the documented range', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setStars(100);
      // Enough accuracy to always hit, low enough LUK not to one-shot.
      window.__test.setStats(4, 30, 4, 20);
      const range = read().player.damageRange;

      // Read each roll off the damage-number fx (deaths don't hide rolls).
      const deltas = [];
      for (let i = 0; i < 8 && deltas.length < 5; i++) {
        const mob = read().mobs[0];
        if (!mob) {
          window.advanceTime(500); // wait out a respawn
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
            deltas.push(hit.value);
            window.advanceTime(900); // let the number expire before the next
            break;
          }
        }
      }
      return { range, deltas };
    });
    expect(result.deltas.length).toBeGreaterThanOrEqual(3);
    for (const d of result.deltas) {
      expect(d).toBeGreaterThanOrEqual(Math.floor(result.range.min));
      expect(d).toBeLessThanOrEqual(Math.ceil(result.range.max));
    }
    // It ROLLS — with min ≈ a third of max, identical hits every time
    // would betray a fixed value. (6 rolls all equal: p < 1e-3.)
    if (result.deltas.length >= 4) {
      expect(new Set(result.deltas).size).toBeGreaterThan(1);
    }
  });

  test('accuracy misses and hits deterministically at the extremes', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      // Spitters are the high-avoid, higher-level mobs — the miss target.
      window.__test.gotoMap('field2');
      window.advanceTime(100);
      window.__test.setStars(100);

      const throwOnce = () => {
        const mob = read().mobs.find((m) => m.type === 'spitter');
        window.__test.setPlayerPos(mob.x - 3, mob.y);
        kb('keydown', 'ArrowRight', 'ArrowRight');
        window.advanceTime(30);
        kb('keyup', 'ArrowRight', 'ArrowRight');
        const before = read().mobs.find((m) => m.id === mob.id)?.hp;
        kb('keydown', 'Control', 'ControlLeft');
        window.advanceTime(60);
        kb('keyup', 'Control', 'ControlLeft');
        // Poll fx while the star lands so MISS popups are caught.
        let sawMiss = false;
        for (let t = 0; t < 24; t++) {
          window.advanceTime(50);
          if (read().fx.damageNumbers.some((n) => n.value === 'MISS')) sawMiss = true;
        }
        const after = read().mobs.find((m) => m.id === mob.id)?.hp;
        return { hpDelta: (before ?? 0) - (after ?? 0), sawMiss };
      };

      // Hopeless stats: hit chance clamps to 0 → guaranteed MISS.
      window.__test.setStats(4, 4, 4, 4);
      const bad = throwOnce();
      window.advanceTime(1500);
      // Overwhelming accuracy → guaranteed hit.
      window.__test.setStats(4, 40, 4, 80);
      const good = throwOnce();
      return { bad, good };
    });
    expect(result.bad.hpDelta).toBe(0);
    expect(result.bad.sawMiss).toBe(true);
    expect(result.good.hpDelta).toBeGreaterThan(0);
    expect(result.good.sawMiss).toBe(false);
  });

  test('mp regen ticks and save v5 round-trips', async ({ gamePage }) => {
    await gamePage.evaluate(([amount, interval]) => {
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(3, 0);
      window.advanceTime(50);
      window.__test.setMp(0);
      // One full interval → exactly +amount MP (no continuous drip).
      window.advanceTime(interval - 200);
      window.__test.probeMpEarly = JSON.parse(window.render_game_to_text()).player.mp;
      window.advanceTime(400);
      window.__test.probeMpAfter = JSON.parse(window.render_game_to_text()).player.mp;
      // Spend AP so the save has something to remember.
      kb('keydown', 's', 'KeyS');
      kb('keyup', 's', 'KeyS');
      document.querySelector('.stat-add[data-stat="luk"]')?.click();
      window.advanceTime(50);
    }, [MP_REGEN_AMOUNT, MP_REGEN_INTERVAL_MS]);
    const probes = await gamePage.evaluate(() => ({
      early: window.__test.probeMpEarly,
      after: window.__test.probeMpAfter,
    }));
    expect(probes.early).toBe(0); // nothing before the tick
    expect(probes.after).toBe(MP_REGEN_AMOUNT); // the 10s tick landed

    const before = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const after = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    );
    expect(after.player.stats).toEqual(before.player.stats);
    expect(after.player.ap).toBe(before.player.ap);
  });
});
