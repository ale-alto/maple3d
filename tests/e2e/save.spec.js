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
});
