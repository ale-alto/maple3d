import { test, expect, state } from '../fixtures/game-test.js';

// M08 contract:
//   player.clip — current animation clip name ('primitive' until the GLB
//   loads, or always with ?nomodels=1); mobs[].clip likewise;
//   renderInfo {calls, triangles} for the perf budget.
//   Models: KayKit CC0 packs in public/models/ (player/npc_shop/mob_*).

async function waitForModel(page) {
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).player.clip !== 'primitive',
    null,
    { timeout: 20000 },
  );
}

test.describe('M08 assets', () => {
  test('player model and clips', async ({ gamePage }) => {
    await waitForModel(gamePage);
    expect((await state(gamePage)).player.clip).toBe('Idle');

    // Run → running clip.
    await gamePage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.advanceTime(300);
    });
    expect((await state(gamePage)).player.clip).toBe('Running_A');
    await gamePage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
      window.advanceTime(600);
    });

    // Jump → airborne clip (rise and fall both use Jump_Idle).
    await gamePage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
      window.advanceTime(150);
    });
    expect((await state(gamePage)).player.clip).toBe('Jump_Idle');
    await gamePage.evaluate(() => window.advanceTime(2000));

    // Crouch → Maple prone (Lie_Idle).
    await gamePage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      window.advanceTime(150);
    });
    expect((await state(gamePage)).player.clip).toBe('Lie_Idle');
    await gamePage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
      window.advanceTime(100);
    });
  });

  test('mob models', async ({ gamePage }) => {
    await waitForModel(gamePage);
    // Mobs animate with skeleton-pack clips once their models load.
    await gamePage.waitForFunction(
      () => {
        const s = JSON.parse(window.render_game_to_text());
        return s.mobs.length > 0 && s.mobs.every((m) => m.clip && m.clip !== 'primitive');
      },
      null,
      { timeout: 20000 },
    );
    const mobs = (await state(gamePage)).mobs;
    for (const m of mobs) {
      expect(['Walking_D_Skeletons', 'Running_A', 'Idle']).toContain(m.clip);
    }
  });

  test('primitive fallback', async ({ gamePage: _unused, browser }) => {
    // ?nomodels=1 keeps the primitive placeholders — instant-on, no
    // errors, sim identical.
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('http://localhost:5173/?nomodels=1');
    await page.waitForFunction(
      () => typeof window.render_game_to_text === 'function',
      null,
      { timeout: 10000 },
    );
    const result = await page.evaluate(() => {
      window.advanceTime(1000);
      const s = JSON.parse(window.render_game_to_text());
      return { clip: s.player.clip, mobs: s.mobs.map((m) => m.clip), calls: s.renderInfo.calls };
    });
    expect(result.clip).toBe('primitive');
    for (const c of result.mobs) expect(c).toBe('primitive');
    expect(result.calls).toBeGreaterThan(3); // primitives render
    expect(errors).toEqual([]);
    await context.close();
  });

  test('draw calls within budget', async ({ gamePage }) => {
    await waitForModel(gamePage);
    await gamePage.evaluate(() => window.advanceTime(500));
    const info = (await state(gamePage)).renderInfo;
    expect(info.calls).toBeGreaterThan(0);
    expect(info.calls).toBeLessThan(120); // budget with models + field mobs
  });
});
