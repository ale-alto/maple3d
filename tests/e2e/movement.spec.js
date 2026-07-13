import { test, expect, state, advance, teleport, holdKey } from '../fixtures/game-test.js';

test.describe('M01 movement', () => {
  test('run left and right', async ({ gamePage }) => {
    const before = await state(gamePage);
    expect(before.mode).toBe('field');

    await holdKey(gamePage, 'ArrowRight', 500);
    const afterRight = await state(gamePage);
    expect(afterRight.player.x).toBeGreaterThan(before.player.x);
    expect(afterRight.player.facing).toBe('right');

    await holdKey(gamePage, 'ArrowLeft', 1000);
    const afterLeft = await state(gamePage);
    expect(afterLeft.player.x).toBeLessThan(afterRight.player.x);
    expect(afterLeft.player.facing).toBe('left');

    // Releasing stops (allow Maple-style slide to decay first).
    await advance(gamePage, 500);
    const settled = await state(gamePage);
    expect(Math.abs(settled.player.vx)).toBeLessThan(0.01);
  });

  test('jump and double jump', async ({ gamePage }) => {
    const ground = await state(gamePage);
    expect(ground.player.grounded).toBe(true);
    expect(ground.player.jumpsLeft).toBe(2);

    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 100);
    const rising = await state(gamePage);
    expect(rising.player.grounded).toBe(false);
    expect(rising.player.y).toBeGreaterThan(ground.player.y);
    expect(rising.player.jumpsLeft).toBe(1);

    // Wait past apex, then double jump gives a second upward impulse.
    await advance(gamePage, 400);
    const preDouble = await state(gamePage);
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 50);
    const doubled = await state(gamePage);
    expect(doubled.player.vy).toBeGreaterThan(preDouble.player.vy);
    expect(doubled.player.jumpsLeft).toBe(0);

    // A third Alt mid-air does nothing.
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 50);
    expect((await state(gamePage)).player.jumpsLeft).toBe(0);

    // Landing resets both jumps.
    await advance(gamePage, 3000);
    const landed = await state(gamePage);
    expect(landed.player.grounded).toBe(true);
    expect(landed.player.jumpsLeft).toBe(2);
  });

  test('thin platform collision', async ({ gamePage }) => {
    const s = await state(gamePage);
    const plat = s.map.platforms[0];
    expect(plat).toBeTruthy();

    // Stand under the platform's midpoint on the ground.
    const midX = (plat.x1 + plat.x2) / 2;
    await teleport(gamePage, midX, 0);
    await advance(gamePage, 100);

    // Jump (+ double jump) straight up: player must pass through from
    // below while rising, then land ON the platform when falling.
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 250);
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 3000);

    const landed = await state(gamePage);
    expect(landed.player.grounded).toBe(true);
    expect(landed.player.y).toBeCloseTo(plat.y, 1);
  });

  test('ladder climb', async ({ gamePage }) => {
    const s = await state(gamePage);
    const ladder = s.map.ladders[0];
    expect(ladder).toBeTruthy();

    // Stand at the ladder's base and grab it with Up.
    await teleport(gamePage, ladder.x, ladder.y1);
    await advance(gamePage, 100);
    await gamePage.keyboard.down('ArrowUp');
    await advance(gamePage, 200);
    const climbing = await state(gamePage);
    expect(climbing.player.climbing).toBe(true);

    // Holding Up moves the player vertically along the ladder.
    const y0 = climbing.player.y;
    await advance(gamePage, 300);
    const higher = await state(gamePage);
    expect(higher.player.y).toBeGreaterThan(y0);
    expect(higher.player.x).toBeCloseTo(ladder.x, 1);
    await gamePage.keyboard.up('ArrowUp');

    // Jumping off the ladder exits climb.
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 100);
    expect((await state(gamePage)).player.climbing).toBe(false);
  });

  test('map bounds', async ({ gamePage }) => {
    const s = await state(gamePage);

    await teleport(gamePage, s.map.minX + 1, 0);
    await holdKey(gamePage, 'ArrowLeft', 2000);
    const leftStop = await state(gamePage);
    expect(leftStop.player.x).toBeGreaterThanOrEqual(s.map.minX);

    await teleport(gamePage, s.map.maxX - 1, 0);
    await holdKey(gamePage, 'ArrowRight', 2000);
    const rightStop = await state(gamePage);
    expect(rightStop.player.x).toBeLessThanOrEqual(s.map.maxX);
  });
});
