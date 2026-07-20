import { test, expect } from '../fixtures/game-test.js';
import { SKILLS, RUN_SPEED } from '../../src/core/constants.js';

// M13 contract (reference §7): player.job 'beginner'|'rogue' in payload;
// beginners earn no SP and the skill panel refuses assignment; the town
// trainer NPC advances (level ≥10 + DEX ≥25) via #job-panel/#job-advance —
// one-time +100–150 HP / +25–50 MP roll and +1 SP; prereqs gate Keen Eyes
// (Nimble Body 3) and Dark Sight (Disorder 3); Nimble Body feeds
// player.accuracy, Keen Eyes feeds player.starRange; V = Dark Sight
// (player.hidden: no aggro/contact damage, no attacking, slower run,
// expires); D = Disorder (mobs[].disordered, reduced contact damage);
// save v6; __test.advanceJob() dev hook mirrors the trainer button.

const kbSrc = `(t, k, code) => window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }))`;

test.describe('M13 jobs', () => {
  test('beginner has no skills', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      const jobAtBoot = read().player.job;
      window.__test.setXp(8, 0); // leveled, still a beginner
      window.advanceTime(50);
      const sp = read().player.sp;
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      document.querySelector('.skill-add[data-skill="luckySeven"]')?.click();
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      return { jobAtBoot, sp, luckySeven: read().player.skills.luckySeven };
    });
    expect(result.jobAtBoot).toBe('beginner');
    expect(result.sp).toBe(0); // beginners earn no SP
    expect(result.luckySeven).toBe(0); // assignment refused
  });

  test('rogue advancement', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.gotoMap('town');
      window.advanceTime(100);
      const trainer = read().map.npcs.find((n) => n.id === 'trainer');
      if (!trainer) return { noTrainer: true };

      // Underleveled: panel opens but the button refuses.
      window.__test.setPlayerPos(trainer.x, 0);
      window.advanceTime(200);
      kb('keydown', 'ArrowUp', 'ArrowUp');
      window.advanceTime(100);
      kb('keyup', 'ArrowUp', 'ArrowUp');
      const panelOpen = document.querySelector('#job-panel')?.style.display !== 'none';
      document.querySelector('#job-advance')?.click();
      window.advanceTime(50);
      const stillBeginner = read().player.job;

      // Qualify (level 10, DEX 25) and advance for real.
      window.__test.setXp(10, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.advanceTime(50);
      const before = read().player;
      document.querySelector('#job-advance')?.click();
      window.advanceTime(50);
      const after = read().player;
      return {
        panelOpen,
        stillBeginner,
        job: after.job,
        hpGain: after.maxHp - before.maxHp,
        mpGain: after.maxMp - before.maxMp,
        sp: after.sp,
      };
    });
    expect(result.noTrainer).toBeUndefined();
    expect(result.panelOpen).toBe(true);
    expect(result.stillBeginner).toBe('beginner'); // refused underleveled
    expect(result.job).toBe('rogue');
    expect(result.hpGain).toBeGreaterThanOrEqual(100); // documented roll
    expect(result.hpGain).toBeLessThanOrEqual(150);
    expect(result.mpGain).toBeGreaterThanOrEqual(25);
    expect(result.mpGain).toBeLessThanOrEqual(50);
    expect(result.sp).toBe(1); // the advancement SP

    // Persists through reload (save v6).
    await gamePage.reload();
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const after = JSON.parse(await gamePage.evaluate(() => window.render_game_to_text()));
    expect(after.player.job).toBe('rogue');
  });

  test('skill prereqs', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(14, 0); // plenty of SP once advanced
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const click = (id) => document.querySelector(`.skill-add[data-skill="${id}"]`)?.click();
      click('keenEyes'); // refused: Nimble Body < 3
      click('darkSight'); // refused: Disorder < 3
      window.advanceTime(30);
      const locked = { ...read().player.skills };
      click('nimbleBody');
      click('nimbleBody');
      click('nimbleBody');
      click('disorder');
      click('disorder');
      click('disorder');
      click('keenEyes'); // now allowed
      click('darkSight'); // now allowed
      window.advanceTime(30);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      return { locked, after: read().player.skills };
    });
    expect(result.locked.keenEyes).toBe(0);
    expect(result.locked.darkSight).toBe(0);
    expect(result.after.nimbleBody).toBe(3);
    expect(result.after.disorder).toBe(3);
    expect(result.after.keenEyes).toBe(1);
    expect(result.after.darkSight).toBe(1);
  });

  test('passive effects', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(14, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      const base = read().player;
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const click = (id) => document.querySelector(`.skill-add[data-skill="${id}"]`)?.click();
      for (let i = 0; i < 5; i++) click('nimbleBody');
      for (let i = 0; i < 2; i++) click('keenEyes'); // needs NB3 first — 5 given
      window.advanceTime(30);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const after = read().player;
      return {
        accBase: base.accuracy,
        accAfter: after.accuracy,
        rangeBase: base.starRange,
        rangeAfter: after.starRange,
        nb: after.skills.nimbleBody,
        ke: after.skills.keenEyes,
      };
    });
    expect(result.nb).toBe(5);
    expect(result.ke).toBe(2);
    expect(result.accAfter).toBeCloseTo(result.accBase + 5, 1); // NB: +lv accuracy
    expect(result.rangeAfter).toBeCloseTo(result.rangeBase + 2 * 0.4375, 2); // KE px→units
  });

  test('dark sight', async ({ gamePage }) => {
    const result = await gamePage.evaluate((runSpeed) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(14, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      const click = (id) => document.querySelector(`.skill-add[data-skill="${id}"]`)?.click();
      for (let i = 0; i < 3; i++) click('disorder');
      click('darkSight');
      window.advanceTime(30);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setStars(50);

      kb('keydown', 'v', 'KeyV');
      window.advanceTime(60);
      kb('keyup', 'v', 'KeyV');
      const hidden = read().player.hidden;
      const mpAfterCast = read().player.mp;

      // Contact does nothing while hidden.
      const mob = read().mobs[0];
      const hpBefore = read().player.hp;
      window.__test.setPlayerPos(mob.x, mob.y);
      window.advanceTime(300);
      const hpAfter = read().player.hp;

      // Attacking does nothing while hidden.
      kb('keydown', 'Control', 'ControlLeft');
      window.advanceTime(60);
      kb('keyup', 'Control', 'ControlLeft');
      const stars = read().projectiles.length;

      // Speed penalty at DS level 1 (−30 speed → 70% run speed).
      window.__test.setPlayerPos(-15, 0);
      window.advanceTime(400);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(600);
      const vx = read().player.vx;
      kb('keyup', 'ArrowRight', 'ArrowRight');

      // Expires: level 1 = 10 s total.
      window.advanceTime(10500);
      const hiddenAfter = read().player.hidden;
      return { hidden, mpAfterCast, hpBefore, hpAfter, stars, vx, hiddenAfter };
    }, RUN_SPEED);
    expect(result.hidden).toBe(true);
    expect(result.hpAfter).toBe(result.hpBefore); // untouchable
    expect(result.stars).toBe(0); // can't attack
    expect(result.vx).toBeLessThan(RUN_SPEED * 0.75); // −30 speed
    expect(result.vx).toBeGreaterThan(RUN_SPEED * 0.6);
    expect(result.hiddenAfter).toBe(false); // 10 s at level 1
  });

  test('disorder', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      window.__test.setXp(14, 0);
      window.__test.setStats(4, 25, 4, 30);
      window.__test.advanceJob();
      window.advanceTime(50);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      for (let i = 0; i < 5; i++)
        document.querySelector('.skill-add[data-skill="disorder"]')?.click();
      window.advanceTime(30);
      kb('keydown', 'k', 'KeyK');
      kb('keyup', 'k', 'KeyK');
      window.__test.gotoMap('field1');
      window.advanceTime(100);

      const takeHit = () => {
        const mob = read().mobs[0];
        const before = read().player.hp;
        window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(150);
        return before - read().player.hp;
      };

      const bare = takeHit();
      window.__test.setPlayerPos(-18, 0);
      window.advanceTime(1500); // i-frames out

      // Cast Disorder (level 5: enemy attack −5) at the mob, then touch it.
      const mob = read().mobs[0];
      window.__test.setPlayerPos(mob.x - 3, mob.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      kb('keydown', 'd', 'KeyD');
      window.advanceTime(60);
      kb('keyup', 'd', 'KeyD');
      const disordered = read().mobs.find((m) => m.id === mob.id)?.disordered;
      const debuffed = takeHit();
      return { bare, disordered, debuffed };
    });
    expect(result.bare).toBeGreaterThan(0);
    expect(result.disordered).toBe(true);
    expect(result.debuffed).toBe(Math.max(1, result.bare - 5)); // attack −5
  });

  test('v5 migration refunds flash jump and recomputes SP', async ({ gamePage }) => {
    await gamePage.addInitScript(() => {
      localStorage.setItem(
        'maple3d-save',
        JSON.stringify({
          v: 5,
          mapId: 'field1',
          player: {
            level: 12, xp: 0, hp: 200, maxHp: 200, maxMp: 120,
            x: 0, y: 0, facing: 'right',
            equipment: { weapon: null, armor: null },
            mp: 60, sp: 0,
            skills: { luckySeven: 2, flashJump: 3 },
            stats: { str: 4, dex: 25, int: 4, luk: 40 },
            ap: 0,
          },
          inventory: { mesos: 0, potions: 3, stars: 100, bag: [] },
        }),
      );
    });
    await gamePage.goto('/');
    await gamePage.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const p = JSON.parse(
      await gamePage.evaluate(() => window.render_game_to_text()),
    ).player;
    expect(p.job).toBe('rogue'); // level ≥ 10 → advanced retroactively
    expect(p.skills.flashJump ?? 0).toBe(0); // FJ leaves the early game
    expect(p.skills.luckySeven).toBe(2); // kept
    // Earned = 1 (advance) + 3×(12−10) = 7; spent 2 on L7 → 5 unspent.
    expect(p.sp).toBe(5);
  });
});
