import { test, expect, state, advance, teleport, holdKey } from '../fixtures/game-test.js';

test.describe('M01 camera', () => {
  test('camera follow', async ({ gamePage }) => {
    // Start mid-map so neither edge clamps the follow behavior.
    const s = await state(gamePage);
    const midX = (s.map.minX + s.map.maxX) / 2;
    await teleport(gamePage, midX, 0);
    await advance(gamePage, 500);
    const centered = await state(gamePage);

    // Camera tracks the player while running.
    await holdKey(gamePage, 'ArrowRight', 1000);
    const moved = await state(gamePage);
    expect(moved.camera.x).toBeGreaterThan(centered.camera.x);
    expect(Math.abs(moved.camera.x - moved.player.x)).toBeLessThan(5);

    // At the left map edge the camera clamps: it stays ahead of the player.
    await teleport(gamePage, s.map.minX + 0.5, 0);
    await advance(gamePage, 1000);
    const atLeftEdge = await state(gamePage);
    expect(atLeftEdge.camera.x).toBeGreaterThan(atLeftEdge.player.x);

    // And symmetrically at the right edge.
    await teleport(gamePage, s.map.maxX - 0.5, 0);
    await advance(gamePage, 1000);
    const atRightEdge = await state(gamePage);
    expect(atRightEdge.camera.x).toBeLessThan(atRightEdge.player.x);
  });
});
