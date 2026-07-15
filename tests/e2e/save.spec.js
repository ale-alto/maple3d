import { test, expect, state, teleport, advance } from '../fixtures/game-test.js';

// M03 contract: character (level, xp, hp, inventory, position) persists in
// localStorage; save fires on progression events; load restores at boot.

test.describe('M03 saves', () => {
  test('persistence roundtrip', async ({ gamePage }) => {
    // Park somewhere mob-free so position is stable, then set progress.
    await teleport(gamePage, -5, 0);
    await advance(gamePage, 300);
    await gamePage.evaluate(() => window.__test.setXp(3, 7));
    await advance(gamePage, 300); // save fires on the xp event

    await gamePage.reload();
    await gamePage.waitForFunction(
      () => typeof window.render_game_to_text === 'function',
      null,
      { timeout: 10000 },
    );

    const restored = await state(gamePage);
    expect(restored.player.level).toBe(3);
    expect(restored.player.xp).toBe(7);
    expect(Math.abs(restored.player.x - -5)).toBeLessThan(0.5);
    expect(restored.inventory).toBeTruthy();
  });

  test('map persistence', async ({ gamePage }) => {
    // M04: the save carries mapId (schema v2) — log out in town, wake up
    // in town.
    await gamePage.evaluate(() => {
      window.__test.gotoMap('town');
      window.advanceTime(200);
      window.__test.setXp(2, 3); // triggers a save with the new map
    });
    await advance(gamePage, 200);

    await gamePage.reload();
    await gamePage.waitForFunction(
      () => typeof window.render_game_to_text === 'function',
      null,
      { timeout: 10000 },
    );
    const restored = await state(gamePage);
    expect(restored.mapId).toBe('town');
    expect(restored.player.level).toBe(2);
  });

  test('v1 save migrates', async ({ gamePage }) => {
    // Pre-M04 saves have no mapId: they must load with mapId 'field1'
    // and keep their progress. Seed via init script — it runs after the
    // old page's beforeunload save (which would clobber a plain
    // localStorage.setItem) and before the new page's game code loads.
    await gamePage.addInitScript(() => {
      localStorage.setItem(
        'maple3d-save',
        JSON.stringify({
          v: 1,
          player: { level: 4, xp: 11, hp: 60, x: -3, y: 0, facing: 'left' },
          inventory: { mesos: 42, potions: 1, starPacks: 0 },
        }),
      );
    });
    await gamePage.reload();
    await gamePage.waitForFunction(
      () => typeof window.render_game_to_text === 'function',
      null,
      { timeout: 10000 },
    );
    const restored = await state(gamePage);
    expect(restored.mapId).toBe('field1');
    expect(restored.player.level).toBe(4);
    expect(restored.player.xp).toBe(11);
    expect(restored.inventory.mesos).toBe(42);
  });
});
