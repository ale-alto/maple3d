import { test, expect, state, advance, teleport, holdKey } from '../fixtures/game-test.js';
import { STAR_RANGE, PLAYER_MAX_HP, INVULN_MS } from '../../src/core/constants.js';

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

    await gamePage.keyboard.press('Control');
    await advance(gamePage, 50);
    const thrown = await state(gamePage);
    expect(thrown.projectiles.length).toBeGreaterThanOrEqual(1);
    expect(thrown.projectiles[0].vx).toBeGreaterThan(0);
    const originX = thrown.player.x;

    // Sample flight: the star never exceeds max range, then despawns.
    let maxTravel = 0;
    for (let i = 0; i < 20; i++) {
      await advance(gamePage, 100);
      const cur = await state(gamePage);
      for (const p of cur.projectiles) maxTravel = Math.max(maxTravel, p.x - originX);
      if (cur.projectiles.length === 0) break;
    }
    expect((await state(gamePage)).projectiles.length).toBe(0);
    expect(maxTravel).toBeLessThanOrEqual(STAR_RANGE + 0.5);
    expect(maxTravel).toBeGreaterThan(STAR_RANGE / 2);
  });

  test('star damages mob', async ({ gamePage }) => {
    const s = await state(gamePage);
    const spawn0 = s.map.mobSpawns[0];

    await teleport(gamePage, spawn0.patrolX1 - 0.5, spawn0.y);
    await holdKey(gamePage, 'ArrowRight', 30);

    await gamePage.keyboard.down('Control');
    await advance(gamePage, 1500);
    await gamePage.keyboard.up('Control');

    const after = await state(gamePage);
    const mob0 = after.mobs.find((m) => m.spawn === 0);
    expect(mob0.hp).toBeLessThan(mob0.maxHp);
    expect(after.fx.damageNumbers.length).toBeGreaterThan(0);
  });

  test('star reaches platform mob', async ({ gamePage }) => {
    const s = await state(gamePage);
    // mobSpawns[1] lives on the high-right platform (y=3); stand on the
    // ground just left of its patrol range, in horizontal star range.
    const spawn1 = s.map.mobSpawns[1];
    expect(spawn1.y).toBeGreaterThan(1);

    await teleport(gamePage, spawn1.patrolX1 - 1, 0);
    await advance(gamePage, 100);
    await holdKey(gamePage, 'ArrowRight', 30);

    // Poll while attacking: stars auto-throw every cooldown, so an angled
    // (vy > 0.5) star must be observable in flight at some sample even with
    // background rAF frames racing the reads.
    await gamePage.keyboard.down('Control');
    let sawAngledStar = false;
    for (let i = 0; i < 30; i++) {
      await advance(gamePage, 50);
      const cur = await state(gamePage);
      if (cur.projectiles.some((p) => p.vy > 0.5)) {
        sawAngledStar = true;
        break;
      }
    }
    await advance(gamePage, 200); // let the last star land
    await gamePage.keyboard.up('Control');
    expect(sawAngledStar).toBe(true);

    const after = await state(gamePage);
    const mob1 = after.mobs.find((m) => m.spawn === 1);
    expect(mob1.hp).toBeLessThan(mob1.maxHp);
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
    const s = await state(gamePage);
    const mob0 = s.mobs.find((m) => m.spawn === 0);

    // Stand inside the mob.
    await teleport(gamePage, mob0.x, mob0.y);
    await advance(gamePage, 300);
    const hit = await state(gamePage);
    expect(hit.player.hp).toBeLessThan(PLAYER_MAX_HP);
    expect(hit.player.invulnMs).toBeGreaterThan(0);

    // I-frames: no further damage while invulnerable.
    const hpAfterFirstHit = hit.player.hp;
    await advance(gamePage, Math.min(300, INVULN_MS / 3));
    expect((await state(gamePage)).player.hp).toBe(hpAfterFirstHit);

    // After i-frames lapse, re-engaging the mob hits again. (Knockback
    // may have popped us out of its patrol reach, so step back in.)
    await advance(gamePage, INVULN_MS);
    const mobNow = (await state(gamePage)).mobs.find((m) => m.spawn === 0);
    await teleport(gamePage, mobNow.x, mobNow.y);
    await advance(gamePage, 500);
    expect((await state(gamePage)).player.hp).toBeLessThan(hpAfterFirstHit);
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
