import { test, expect, state, advance, teleport, holdKey } from '../fixtures/game-test.js';
import { STAR_RANGE, PLAYER_MAX_HP } from '../../src/core/constants.js';

// M02 contract additions:
//   player.hp / player.maxHp / player.invulnMs
//   projectiles: [{x, y, vx}]
//   fx: { damageNumbers: [{x, y, value, ageMs}] }

test.describe('M02 combat', () => {
  test('star throw and range', async ({ gamePage }) => {
    const s = await state(gamePage);
    // Far-left corner: nothing to hit, star dies by range.
    await teleport(gamePage, s.map.minX + 2, 0);
    await advance(gamePage, 100);
    await holdKey(gamePage, 'ArrowRight', 30); // face right without moving far

    // Fire and sample the whole flight in ONE synchronous in-page block —
    // background rAF frames can otherwise burn the 0.5s flight between
    // tool roundtrips.
    const flight = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const ctrl = (type) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: 'Control', bubbles: true }));
      const originX = read().player.x;
      ctrl('keydown');
      window.advanceTime(17);
      ctrl('keyup');
      let sawStar = false;
      let firstVx = 0;
      let maxTravel = 0;
      for (let i = 0; i < 120; i++) {
        const cur = read();
        if (cur.projectiles.length) {
          if (!sawStar) firstVx = cur.projectiles[0].vx;
          sawStar = true;
          for (const p of cur.projectiles) maxTravel = Math.max(maxTravel, Math.abs(p.x - originX));
        } else if (sawStar) break;
        window.advanceTime(16.667);
      }
      return { sawStar, firstVx, maxTravel, remaining: read().projectiles.length };
    });
    expect(flight.sawStar).toBe(true);
    expect(flight.firstVx).toBeGreaterThan(0);
    expect(flight.remaining).toBe(0);
    expect(flight.maxTravel).toBeLessThanOrEqual(STAR_RANGE + 0.5);
    expect(flight.maxTravel).toBeGreaterThan(STAR_RANGE / 2);
  });

  test('star damages mob', async ({ gamePage }) => {
    // Atomic per-step sampling: short flights and 40-HP mobs mean both the
    // hit and the mob's death can happen inside one coarse sample chunk.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (type, k) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 0.5, sp0.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      let sawNumber = false;
      let sawDamage = false;
      for (let i = 0; i < 300 && !(sawNumber && sawDamage); i++) {
        window.advanceTime(16.667);
        const cur = read();
        if (cur.fx.damageNumbers.length > 0) sawNumber = true;
        const mob = cur.mobs.find((m) => m.spawn === 0);
        if (!mob || mob.hp < mob.maxHp) sawDamage = true; // dead counts
      }
      key('keyup', 'Control');
      return { sawNumber, sawDamage };
    });
    expect(result.sawDamage).toBe(true);
    expect(result.sawNumber).toBe(true);
  });

  test('platform mobs require level access', async ({ gamePage }) => {
    // Full-authentic Maple (user decision 2026-07-14): stars fly flat;
    // vertical generosity comes from the hit rectangle, never from aiming.
    // A mob on a high platform is unhittable from the ground — you get on
    // its level (jump/climb) and throw flat, like real Maple.
    const s = await state(gamePage);
    const spawn1 = s.map.mobSpawns[1];
    expect(spawn1.y).toBeGreaterThan(1);

    // (a) From the ground below: hold Ctrl across a full patrol cycle —
    // every star flies flat and the platform mob takes nothing.
    await teleport(gamePage, spawn1.patrolX1 - 1, 0);
    await advance(gamePage, 100);
    await holdKey(gamePage, 'ArrowRight', 30);
    await gamePage.keyboard.down('Control');
    for (let i = 0; i < 60; i++) {
      await advance(gamePage, 100);
      const cur = await state(gamePage);
      for (const p of cur.projectiles) expect(p.vy).toBe(0);
    }
    await gamePage.keyboard.up('Control');
    const fromGround = (await state(gamePage)).mobs.find((m) => m.spawn === 1);
    expect(fromGround.hp).toBe(fromGround.maxHp);

    // (b) From its own platform a throw connects. Atomic in-page block:
    // the aggro'd mob can knock us off the ledge during real-time gaps,
    // so lock the first throw in before any interference.
    const damaged = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (type, k) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
      const sp1 = read().map.mobSpawns[1];
      window.__test.setPlayerPos(9.05, sp1.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      let hit = false;
      for (let i = 0; i < 300 && !hit; i++) {
        window.advanceTime(16.667);
        const mob1 = read().mobs.find((m) => m.spawn === 1);
        hit = !mob1 || mob1.hp < mob1.maxHp; // dead also counts
      }
      key('keyup', 'Control');
      return hit;
    });
    expect(damaged).toBe(true);
  });

  test('star homes to its locked target', async ({ gamePage }) => {
    // Classic MS attack model: the target is locked at press time (nearest
    // mob in the forward rect), and the star visual homes to it. Homing to
    // a ground mob from standing height means the star dips toward the
    // mob's center — vy goes negative, which flat flight can never do.
    // Stand back from the patrol clamp so flights last multiple steps,
    // and sample atomically per sim step so a mid-flight star can't slip
    // between reads.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (type, k) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 2.5, sp0.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      let dip = false;
      let hpDrop = false;
      for (let i = 0; i < 300 && !(dip && hpDrop); i++) {
        window.advanceTime(16.667);
        const cur = read();
        if (cur.projectiles.some((p) => p.vy < -0.2)) dip = true;
        const mob = cur.mobs.find((m) => m.spawn === 0);
        if (!mob || mob.hp < mob.maxHp) hpDrop = true;
      }
      key('keyup', 'Control');
      return { dip, hpDrop };
    });
    expect(result.dip).toBe(true);
    expect(result.hpDrop).toBe(true);
  });

  test('stars never fire steeply vertical', async ({ gamePage }) => {
    // MSW AttackComponent defines attacks as forward rectangular areas —
    // vertical reach comes from the area, not from steep homing. Standing
    // almost under a platform mob must NOT produce a near-vertical shot:
    // every star stays inside the 45° forward cone (|vy| <= |vx|).
    const s = await state(gamePage);
    const mob1 = s.mobs.find((m) => m.spawn === 1);
    await teleport(gamePage, mob1.x - 0.3, 0);
    await advance(gamePage, 100);
    await holdKey(gamePage, 'ArrowRight', 30);

    await gamePage.keyboard.down('Control');
    for (let i = 0; i < 20; i++) {
      await advance(gamePage, 50);
      for (const p of (await state(gamePage)).projectiles) {
        expect(Math.abs(p.vy)).toBeLessThanOrEqual(Math.abs(p.vx) + 0.01);
      }
    }
    await gamePage.keyboard.up('Control');
  });

  test('grounded attack locks movement', async ({ gamePage }) => {
    // MSW ATTACK state: attacking while grounded is stand-and-throw — the
    // run input is ignored during the attack window. (Air throws stay
    // free; that's the kite, covered by the air momentum spec.)
    await gamePage.keyboard.down('Control');
    await gamePage.keyboard.down('ArrowRight');
    await advance(gamePage, 600);
    const locked = await state(gamePage);
    expect(Math.abs(locked.player.x - (await state(gamePage)).map.spawn.x)).toBeLessThan(0.6);

    await gamePage.keyboard.up('Control');
    await advance(gamePage, 800);
    const freed = await state(gamePage);
    await gamePage.keyboard.up('ArrowRight');
    expect(freed.player.x - locked.player.x).toBeGreaterThan(1.5); // running again
  });

  test('contact knockback', async ({ gamePage }) => {
    // MSW HitEvent FeedbackAction: a touched player pops back away from
    // the mob. The mob may chase and re-close the gap, so assert the
    // player's own displacement during the pop, not sustained separation.
    // Stand just outside mob 0's patrol clamp: the aggro'd mob walks to
    // its patrol edge and touches us there, and the knockback pops us
    // further out of its reach — so the displacement from the (known)
    // starting x persists, immune to read-timing races.
    const s = await state(gamePage);
    const spawn0 = s.map.mobSpawns[0];
    const standX = spawn0.patrolX1 - 0.7;
    await teleport(gamePage, standX, spawn0.y);

    let hit = false;
    for (let i = 0; i < 30 && !hit; i++) {
      await advance(gamePage, 100);
      hit = (await state(gamePage)).player.hp < PLAYER_MAX_HP;
    }
    expect(hit).toBe(true);

    await advance(gamePage, 300); // pop completes (~180ms airtime)
    const after = await state(gamePage);
    expect(Math.abs(after.player.x - standX)).toBeGreaterThan(0.35);
  });

  test('contact damage', async ({ gamePage }) => {
    // Background rAF frames keep simulating between tool calls, so the
    // i-frame window check runs as ONE synchronous in-page block —
    // nothing can interleave inside a single JS task.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      // Provoke a fresh hit (step onto the mob until i-frames are fresh).
      let s = read();
      for (let i = 0; i < 200 && !(s.player.invulnMs > 600); i++) {
        const mob = s.mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(50);
        s = read();
      }
      if (!(s.player.invulnMs > 600)) return { ok: false };
      const hp0 = s.player.hp;
      window.advanceTime(300); // well inside the 1s i-frame window
      return { ok: true, hp0, hp1: read().player.hp };
    });
    expect(result.ok).toBe(true);
    expect(result.hp1).toBe(result.hp0); // i-frames held

    // After i-frames lapse, re-engaging hits again (atomic for the same
    // reason; teleports re-engage because knockback breaks contact).
    const again = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const hpStart = read().player.hp;
      for (let i = 0; i < 100 && read().player.hp >= hpStart; i++) {
        const mob = read().mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(100);
      }
      return { hpStart, hpEnd: read().player.hp };
    });
    expect(again.hpEnd).toBeLessThan(again.hpStart);
  });

  test('player death respawn', async ({ gamePage }) => {
    // Knockback pops us clear of the mob after every touch, so passively
    // standing still can no longer kill — re-engage by stepping onto the
    // mob each second until death; respawn = back at map spawn, full HP.
    const s = await state(gamePage);
    let sawDamage = false;
    let respawned = null;
    for (let i = 0; i < 20; i++) {
      const cur = await state(gamePage);
      if (cur.player.hp < PLAYER_MAX_HP) sawDamage = true;
      const atSpawn = Math.abs(cur.player.x - s.map.spawn.x) < 0.5;
      if (sawDamage && atSpawn && cur.player.hp === PLAYER_MAX_HP) {
        respawned = cur;
        break;
      }
      const mob0 = cur.mobs.find((m) => m.spawn === 0);
      if (mob0) await teleport(gamePage, mob0.x, mob0.y);
      await advance(gamePage, 1000);
    }
    expect(sawDamage).toBe(true);
    expect(respawned).not.toBeNull();
  });
});
