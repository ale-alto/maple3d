import { test, expect, state, advance, teleport, holdKey } from '../fixtures/game-test.js';
import { MOB_RESPAWN_MS } from '../../src/core/constants.js';

// M02 contract additions:
//   map.mobSpawns: [{x, y, patrolX1, patrolX2}]
//   mobs: [{id, spawn, x, y, hp, maxHp, state, facing}] (alive only)

test.describe('M02 mobs', () => {
  test('patrol stays on platform', async ({ gamePage }) => {
    const s = await state(gamePage);
    expect(s.map.mobSpawns.length).toBeGreaterThanOrEqual(2);
    expect(s.mobs.length).toBe(s.map.mobSpawns.length);

    // Park the player far from every spawn so nothing aggros.
    await teleport(gamePage, s.map.minX + 1, 0);

    // Sample patrol over 6 sim-seconds: every mob stays inside its spawn's
    // patrol range and on its surface, and actually moves (is alive AI).
    const startXs = (await state(gamePage)).mobs.map((m) => m.x);
    let movedAny = false;
    for (let i = 0; i < 6; i++) {
      await advance(gamePage, 1000);
      const { mobs, map } = await state(gamePage);
      for (const mob of mobs) {
        const spawn = map.mobSpawns[mob.spawn];
        expect(mob.x).toBeGreaterThanOrEqual(spawn.patrolX1 - 0.01);
        expect(mob.x).toBeLessThanOrEqual(spawn.patrolX2 + 0.01);
        expect(mob.y).toBeCloseTo(spawn.y, 2);
        if (Math.abs(mob.x - startXs[mob.spawn]) > 0.2) movedAny = true;
      }
    }
    expect(movedAny).toBe(true);
  });

  test('death and respawn', async ({ gamePage }) => {
    const s = await state(gamePage);
    const spawn0 = s.map.mobSpawns[0];
    const total = s.map.mobSpawns.length;

    // Stand just left of mob 0's patrol range, facing it.
    await teleport(gamePage, spawn0.patrolX1 - 0.5, spawn0.y);
    await holdKey(gamePage, 'ArrowRight', 30);

    // Hold attack until the mob dies.
    await gamePage.keyboard.down('Control');
    let alive = total;
    for (let i = 0; i < 10 && alive === total; i++) {
      await advance(gamePage, 500);
      alive = (await state(gamePage)).mobs.length;
    }
    await gamePage.keyboard.up('Control');
    expect(alive).toBe(total - 1);

    // It comes back at its spawn with full HP after the respawn timer.
    await advance(gamePage, MOB_RESPAWN_MS + 500);
    const after = await state(gamePage);
    expect(after.mobs.length).toBe(total);
    const respawned = after.mobs.find((m) => m.spawn === 0);
    expect(respawned).toBeTruthy();
    expect(respawned.hp).toBe(respawned.maxHp);
  });
});
