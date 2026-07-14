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

    // Wait past apex (0.3s at current arc), then double jump gives a second
    // upward impulse. Keep the wait well short of the ~583ms airtime so
    // background rAF frames can't land us before the second Alt.
    await advance(gamePage, 250);
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

    // MSW ActionJump(horizontalInput): jump alone does NOT leave the
    // ladder; jump + direction leaps off sideways.
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 100);
    expect((await state(gamePage)).player.climbing).toBe(true);

    await gamePage.keyboard.down('ArrowLeft');
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 100);
    const leapt = await state(gamePage);
    await gamePage.keyboard.up('ArrowLeft');
    expect(leapt.player.climbing).toBe(false);
    expect(leapt.player.vx).toBeLessThan(0); // leapt leftward
  });

  test('crouch stops movement', async ({ gamePage }) => {
    // MSW ActionCrouch: Down on the ground is crouch/prone — movement is
    // blocked even while holding a direction, and crouch+jump on the
    // ground floor does nothing (down-jump is platform-only).
    await gamePage.keyboard.down('ArrowDown');
    await advance(gamePage, 100);
    const crouched = await state(gamePage);
    expect(crouched.player.state).toBe('crouch');

    const x0 = crouched.player.x;
    await gamePage.keyboard.down('ArrowRight');
    await advance(gamePage, 400);
    const held = await state(gamePage);
    expect(held.player.state).toBe('crouch');
    expect(Math.abs(held.player.x - x0)).toBeLessThan(0.05);

    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 150);
    const jumped = await state(gamePage);
    expect(jumped.player.grounded).toBe(true); // no jump from ground crouch
    await gamePage.keyboard.up('ArrowRight');
    await gamePage.keyboard.up('ArrowDown');
  });

  test('ladder top and bottom exits are stable', async ({ gamePage }) => {
    const s = await state(gamePage);
    const lad = s.map.ladders.find((l) => l.type === 'ladder');

    // Climb to the top while holding Up: pop onto the ledge as standing,
    // and keep holding Up — no re-grab flicker (the "wiggle").
    await teleport(gamePage, lad.x, lad.y1);
    await advance(gamePage, 100);
    await gamePage.keyboard.down('ArrowUp');
    await advance(gamePage, 1200);
    const top = await state(gamePage);
    expect(top.player.climbing).toBe(false);
    expect(top.player.grounded).toBe(true);
    expect(top.player.y).toBeCloseTo(lad.y2, 1);
    for (let i = 0; i < 5; i++) {
      await advance(gamePage, 100);
      const c = await state(gamePage);
      expect(c.player.climbing).toBe(false);
      expect(Math.abs(c.player.y - lad.y2)).toBeLessThan(0.05);
    }
    await gamePage.keyboard.up('ArrowUp');

    // From the ledge, Down grabs back down onto the ladder…
    await gamePage.keyboard.down('ArrowDown');
    await advance(gamePage, 250);
    expect((await state(gamePage)).player.climbing).toBe(true);

    // …and climbing to the bottom exits to standing on the ground —
    // stable while Down stays held (crouch, not re-grab).
    await advance(gamePage, 1200);
    const bottom = await state(gamePage);
    expect(bottom.player.climbing).toBe(false);
    expect(bottom.player.grounded).toBe(true);
    expect(bottom.player.y).toBeCloseTo(lad.y1, 1);
    for (let i = 0; i < 5; i++) {
      await advance(gamePage, 100);
      expect((await state(gamePage)).player.climbing).toBe(false);
    }
    await gamePage.keyboard.up('ArrowDown');
  });

  test('rope bottom drops you off', async ({ gamePage }) => {
    // The rope hangs over the gap: climbing down past its bottom end
    // falls off (no surface at the rope's base).
    const s = await state(gamePage);
    const rope = s.map.ladders.find((l) => l.type === 'rope');
    await teleport(gamePage, rope.x, rope.y2);
    await advance(gamePage, 200);

    await gamePage.keyboard.down('ArrowDown');
    await advance(gamePage, 250);
    expect((await state(gamePage)).player.climbing).toBe(true);

    await advance(gamePage, 1200); // to the bottom and off
    await gamePage.keyboard.up('ArrowDown');
    await advance(gamePage, 1500); // fall through the gap
    const landed = await state(gamePage);
    expect(landed.player.climbing).toBe(false);
    expect(landed.player.grounded).toBe(true);
    expect(landed.player.y).toBeCloseTo(0, 1); // ground below the gap
  });

  test('maple state machine', async ({ gamePage }) => {
    // MSW StateComponent: the sim reports named states for animation.
    expect((await state(gamePage)).player.state).toBe('idle');

    await gamePage.keyboard.down('ArrowRight');
    await advance(gamePage, 200);
    expect((await state(gamePage)).player.state).toBe('move');

    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 100);
    expect((await state(gamePage)).player.state).toBe('jump'); // ascending
    await advance(gamePage, 350);
    expect((await state(gamePage)).player.state).toBe('fall'); // descending
    await gamePage.keyboard.up('ArrowRight');
    await advance(gamePage, 1500);

    // Climbables are typed (ClimbableAnimationType): ladders[0] is the
    // ladder, ladders[1] is the rope; the state reports which kind.
    const s = await state(gamePage);
    const ladder = s.map.ladders.find((l) => l.type === 'ladder');
    expect(ladder).toBeTruthy();
    await teleport(gamePage, ladder.x, ladder.y1);
    await advance(gamePage, 100);
    await gamePage.keyboard.down('ArrowUp');
    await advance(gamePage, 150);
    expect((await state(gamePage)).player.state).toBe('ladder');
    await gamePage.keyboard.up('ArrowUp');
  });

  test('air momentum kite', async ({ gamePage }) => {
    // Run right to full speed and jump while still holding right.
    await gamePage.keyboard.down('ArrowRight');
    await advance(gamePage, 500);
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 50);
    await gamePage.keyboard.up('ArrowRight');

    // Turn around mid-air: facing flips, momentum does not.
    await gamePage.keyboard.down('ArrowLeft');
    await advance(gamePage, 200);
    const kiting = await state(gamePage);
    expect(kiting.player.grounded).toBe(false);
    expect(kiting.player.facing).toBe('left');
    expect(kiting.player.vx).toBeGreaterThan(4); // still flying right

    // Ground control resumes on landing: keep holding left, we turn around.
    await advance(gamePage, 2000);
    const grounded = await state(gamePage);
    expect(grounded.player.grounded).toBe(true);
    expect(grounded.player.vx).toBeLessThan(0);
    await gamePage.keyboard.up('ArrowLeft');
  });

  test('firm landing without input', async ({ gamePage }) => {
    // Jump out of a run, release everything mid-air: momentum carries the
    // arc, but touching down with no direction held plants the feet — vx
    // dies on the landing step, no skid.
    await gamePage.keyboard.down('ArrowRight');
    await advance(gamePage, 500);
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 50);
    await gamePage.keyboard.up('ArrowRight');

    expect((await state(gamePage)).player.grounded).toBe(false);

    let s = null;
    for (let i = 0; i < 80; i++) {
      await advance(gamePage, 16.667);
      s = await state(gamePage);
      if (s.player.grounded) break;
    }
    expect(s.player.grounded).toBe(true);
    expect(Math.abs(s.player.vx)).toBeLessThan(0.5);
  });

  test('subtle air steering', async ({ gamePage }) => {
    // MSW RigidbodyComponent model (AirAccelerationX): midair input steers
    // far more weakly than ground accel — a standing jump can drift, but
    // nowhere near run speed.
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 50);
    expect((await state(gamePage)).player.grounded).toBe(false);

    await gamePage.keyboard.down('ArrowRight');
    await advance(gamePage, 150);
    const drifting = await state(gamePage);
    await gamePage.keyboard.up('ArrowRight');
    expect(drifting.player.vx).toBeGreaterThan(0.4); // steering exists
    expect(drifting.player.vx).toBeLessThan(2.5); // but is subtle
  });

  test('down jump through thin platform', async ({ gamePage }) => {
    // MSW RigidbodyComponent model (DownJump): Down+Alt on a thin platform
    // drops through it; landing resumes on whatever is below.
    const s = await state(gamePage);
    const plat = s.map.platforms[0];
    const midX = (plat.x1 + plat.x2) / 2;
    await teleport(gamePage, midX, plat.y + 0.1);
    await advance(gamePage, 300);
    const standing = await state(gamePage);
    expect(standing.player.grounded).toBe(true);
    expect(standing.player.y).toBeCloseTo(plat.y, 1);

    await gamePage.keyboard.down('ArrowDown');
    await gamePage.keyboard.press('Alt');
    await advance(gamePage, 250);
    await gamePage.keyboard.up('ArrowDown');
    const dropping = await state(gamePage);
    expect(dropping.player.y).toBeLessThan(plat.y - 0.3); // passed through

    await advance(gamePage, 2000);
    const landed = await state(gamePage);
    expect(landed.player.grounded).toBe(true);
    expect(landed.player.y).toBeCloseTo(0, 1); // on the ground below
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
