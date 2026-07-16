import { test, expect, state, advance, teleport, holdKey } from '../fixtures/game-test.js';
import { STAR_RANGE, PLAYER_MAX_HP, STARPACK_SIZE, STAR_MAX } from '../../src/core/constants.js';

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

  test('attack box tracks the player vertically', async ({ gamePage }) => {
    // 2026-07-14 fix: the attack box is centered on the PLAYER'S BODY, ~one
    // character tall. A platform mob is unreachable from the ground below;
    // jumping up to its level makes it a valid target.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      window.__test.gotoMap('field2');
      window.advanceTime(100);
      const spawns = read().map.mobSpawns;
      const idx = spawns.findIndex((s) => s.type === 'spitter');
      const sp = spawns[idx];

      // (a) On the ground below the platform mob: spam attack, no damage.
      window.__test.setPlayerPos(sp.patrolX1 - 1, 0);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      for (let i = 0; i < 120; i++) window.advanceTime(16.667);
      key('keyup', 'Control');
      const fromGround = read().mobs.find((m) => m.spawn === idx);
      const groundNoDamage = fromGround && fromGround.hp === fromGround.maxHp;

      // (b) Airborne at the mob's level, just in front: throw locks + hits.
      window.__test.gotoMap('field2');
      window.advanceTime(100);
      const sp2 = read().map.mobSpawns[idx];
      window.__test.setPlayerPos(sp2.patrolX1 - 1, sp2.y + 0.1);
      window.advanceTime(17); // still at the mob's level
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      let hitAtLevel = false;
      for (let i = 0; i < 200 && !hitAtLevel; i++) {
        window.advanceTime(16.667);
        const m = read().mobs.find((x) => x.spawn === idx);
        hitAtLevel = !m || m.hp < m.maxHp;
      }
      key('keyup', 'Control');
      return { groundNoDamage, hitAtLevel };
    });
    expect(result.groundNoDamage).toBe(true); // no vertical attack from below
    expect(result.hitAtLevel).toBe(true); // jump-to-level connects
  });

  test('throwing stars are consumable ammo', async ({ gamePage }) => {
    // Authentic assassin: each throw spends one equipped star. Attack in
    // town (no mobs) so throws whiff and deplete without killing anything.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      window.__test.gotoMap('town');
      window.advanceTime(100);
      window.__test.setStars(3);
      const before = read().inventory.stars;
      key('keydown', 'Control');
      for (let i = 0; i < 260; i++) window.advanceTime(16.667); // ~4.3s, 3 throws @720ms
      key('keyup', 'Control');
      return { before, after: read().inventory.stars };
    });
    expect(result.before).toBe(3);
    expect(result.after).toBe(0); // all three spent
  });

  test('cannot attack with no stars', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 0.5, sp0.y);
      window.__test.setStars(0);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      let everFired = false;
      for (let i = 0; i < 120; i++) {
        window.advanceTime(16.667);
        if (read().projectiles.length > 0) everFired = true;
      }
      key('keyup', 'Control');
      const mob0 = read().mobs.find((m) => m.spawn === 0);
      return { everFired, mobFullHp: mob0 && mob0.hp === mob0.maxHp, stars: read().inventory.stars };
    });
    expect(result.everFired).toBe(false); // no star with no ammo
    expect(result.mobFullHp).toBe(true); // mob untouched
    expect(result.stars).toBe(0); // never went negative
  });

  test('grounded attack locks movement', async ({ gamePage }) => {
    // MSW ATTACK state: attacking while grounded is stand-and-throw — the
    // run input is ignored while the throw lock is active (holding attack
    // keeps you planted). Releasing frees the run. Atomic in-page so the
    // now-longer lock (650ms) isn't raced by background frames.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      const spawnX = read().map.spawn.x;
      window.__test.setPlayerPos(spawnX, 0);
      window.advanceTime(50);

      key('keydown', 'Control');
      key('keydown', 'ArrowRight');
      window.advanceTime(600); // one throw cycle: rooted the whole time
      const lockedX = read().player.x;

      key('keyup', 'Control');
      // Wait out the remaining lock, then run for a fixed window.
      for (let i = 0; i < 120 && read().player.attackLockMs > 0; i++) window.advanceTime(16.667);
      const freedStartX = read().player.x;
      window.advanceTime(600);
      key('keyup', 'ArrowRight');
      return { spawnX, lockedX, freedStartX, ranToX: read().player.x };
    });
    // Rooted while attacking...
    expect(Math.abs(result.lockedX - result.spawnX)).toBeLessThan(0.6);
    // ...and running again once the lock clears.
    expect(result.ranToX - result.freedStartX).toBeGreaterThan(2);
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
    // M04 rule (rewritten with that milestone): death returns you to TOWN
    // at full HP, not the field start. Re-engage by stepping onto the mob
    // (knockback breaks passive contact) until death.
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      let sawDamage = false;
      for (let i = 0; i < 400; i++) {
        const cur = read();
        if (cur.player.hp < cur.player.maxHp) sawDamage = true;
        if (sawDamage && cur.mapId === 'town' && cur.player.hp === cur.player.maxHp) {
          return { ok: true, x: cur.player.x, spawnX: cur.map.spawn.x };
        }
        const mob = cur.mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(100);
      }
      return { ok: false };
    });
    expect(result.ok).toBe(true);
    expect(Math.abs(result.x - result.spawnX)).toBeLessThan(0.5);
  });
});
