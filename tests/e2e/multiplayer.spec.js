import { test, expect } from '@playwright/test';

// M06 contract:
//   ?mp=1 enables multiplayer (default page load stays pure local sim);
//   ?name=X sets the display name; room id == current mapId.
//   Payload gains: multiplayer {enabled, connected, id, name, roomId},
//   remotePlayers [{id, name, x, y, chat}].
//   window.__test.sendChat(text) dev hook.
// The party server ticks on a real clock, so these specs poll with real
// timeouts instead of advanceTime (which only steps the local sim).

const read = () => JSON.parse(window.render_game_to_text());

// Each test isolates its own room instance (?mproom=<suffix>) — the specs
// run in parallel against ONE partykit dev server, and without isolation
// every client would share the same field1 room across tests.
let roomCounter = 0;
function freshRoom() {
  roomCounter += 1;
  return `t${Date.now()}x${roomCounter}`;
}

async function openClient(browser, name, room) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://localhost:5173/?mp=1&name=${name}&mproom=${room}`);
  await page.waitForFunction(
    () => typeof window.render_game_to_text === 'function',
    null,
    { timeout: 10000 },
  );
  return { context, page };
}

async function waitConnected(page) {
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).multiplayer?.connected === true,
    null,
    { timeout: 15000 },
  );
}

test.describe('M06 multiplayer', () => {
  test('presence', async ({ browser }) => {
    const room = freshRoom();
    const a = await openClient(browser, 'Aya', room);
    const b = await openClient(browser, 'Bee', room);
    await waitConnected(a.page);
    await waitConnected(b.page);

    // Each side sees exactly the other, by name.
    await a.page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).remotePlayers?.some((r) => r.name === 'Bee'),
      null,
      { timeout: 15000 },
    );
    await b.page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).remotePlayers?.some((r) => r.name === 'Aya'),
      null,
      { timeout: 15000 },
    );

    // Movement propagates: A runs right, B sees A's x increase.
    const xBefore = await b.page.evaluate(
      () => JSON.parse(window.render_game_to_text()).remotePlayers.find((r) => r.name === 'Aya').x,
    );
    // Drive the run in sim time — a backgrounded page gets few rAF frames,
    // so a real-time key hold can under-move. advanceTime steps the sim
    // (and its 10Hz presence sends) regardless of frame throttling.
    await a.page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.advanceTime(1500);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    });
    await b.page.waitForFunction(
      (x0) =>
        JSON.parse(window.render_game_to_text()).remotePlayers.find((r) => r.name === 'Aya')?.x >
        x0 + 1,
      xBefore,
      { timeout: 10000 },
    );

    await a.context.close();
    await b.context.close();
  });

  test('server-owned mobs converge', async ({ browser }) => {
    const room = freshRoom();
    const a = await openClient(browser, 'Aya', room);
    const b = await openClient(browser, 'Bee', room);
    await waitConnected(a.page);
    await waitConnected(b.page);

    // Both see the same mob roster (server-owned).
    const idsA = await a.page.evaluate(() =>
      JSON.parse(window.render_game_to_text()).mobs.map((m) => m.id).sort(),
    );
    const idsB = await b.page.evaluate(() =>
      JSON.parse(window.render_game_to_text()).mobs.map((m) => m.id).sort(),
    );
    expect(idsA).toEqual(idsB);
    expect(idsA.length).toBeGreaterThan(0);

    // A parks in front of mob 0's patrol and attacks until it dies.
    await a.page.evaluate(() => {
      const sp0 = JSON.parse(window.render_game_to_text()).map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 1.5, sp0.y);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', bubbles: true }));
    });
    const dead = (page) =>
      page.waitForFunction(
        (count) => JSON.parse(window.render_game_to_text()).mobs.length < count,
        idsA.length,
        { timeout: 30000 },
      );
    await dead(a.page);
    await dead(b.page); // the kill converges to B
    await a.page.evaluate(() =>
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', bubbles: true })),
    );

    // And the respawn converges to both.
    const respawned = (page) =>
      page.waitForFunction(
        (count) => JSON.parse(window.render_game_to_text()).mobs.length === count,
        idsA.length,
        { timeout: 30000 },
      );
    await respawned(a.page);
    await respawned(b.page);

    await a.context.close();
    await b.context.close();
  });

  test('chat bubbles', async ({ browser }) => {
    const room = freshRoom();
    const a = await openClient(browser, 'Aya', room);
    const b = await openClient(browser, 'Bee', room);
    await waitConnected(a.page);
    await waitConnected(b.page);
    await b.page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).remotePlayers?.some((r) => r.name === 'Aya'),
      null,
      { timeout: 15000 },
    );

    await a.page.evaluate(() => window.__test.sendChat('hello maple'));
    await b.page.waitForFunction(
      () =>
        JSON.parse(window.render_game_to_text()).remotePlayers.find((r) => r.name === 'Aya')
          ?.chat === 'hello maple',
      null,
      { timeout: 10000 },
    );

    await a.context.close();
    await b.context.close();
  });

  test('drops are visible to all but owner-protected', async ({ browser }) => {
    // Classic MS loot rule: everyone SEES the drops; only the killer can
    // pick them up (no loot stealing — gameplan).
    const room = freshRoom();
    const a = await openClient(browser, 'Aya', room);
    const b = await openClient(browser, 'Bee', room);
    await waitConnected(a.page);
    await waitConnected(b.page);

    // B stands clear; A kills a mob.
    await b.page.evaluate(() => window.__test.setPlayerPos(-18, 0));
    await a.page.evaluate(() => {
      const sp0 = JSON.parse(window.render_game_to_text()).map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 1.5, sp0.y);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', bubbles: true }));
    });
    await a.page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).drops.length > 0,
      null,
      { timeout: 30000 },
    );
    await a.page.evaluate(() =>
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', bubbles: true })),
    );

    // B SEES the drops, marked not-mine…
    await b.page.waitForFunction(
      () => {
        const s = JSON.parse(window.render_game_to_text());
        return s.drops.length > 0 && s.drops.every((d) => d.mine === false);
      },
      null,
      { timeout: 10000 },
    );

    // …but Z refuses them for B.
    const bTried = await b.page.evaluate(() => {
      const read2 = () => JSON.parse(window.render_game_to_text());
      const drop = read2().drops.find((d) => d.kind === 'mesos');
      const before = read2().inventory.mesos;
      window.__test.setPlayerPos(drop.x, drop.y);
      window.advanceTime(100);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
      window.advanceTime(150);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z', bubbles: true }));
      return { before, after: read2().inventory.mesos, dropStill: read2().drops.some((d) => d.kind === 'mesos') };
    });
    expect(bTried.after).toBe(bTried.before);
    expect(bTried.dropStill).toBe(true);

    // While the owner picks them up fine.
    const aPicked = await a.page.evaluate(() => {
      const read2 = () => JSON.parse(window.render_game_to_text());
      const drop = read2().drops.find((d) => d.kind === 'mesos');
      if (!drop) return { ok: false };
      const before = read2().inventory.mesos;
      window.__test.setPlayerPos(drop.x, drop.y);
      window.advanceTime(100);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
      window.advanceTime(150);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z', bubbles: true }));
      return { ok: true, before, after: read2().inventory.mesos };
    });
    expect(aPicked.ok).toBe(true);
    expect(aPicked.after).toBeGreaterThan(aPicked.before);

    await a.context.close();
    await b.context.close();
  });

  test('remote throws are visible', async ({ browser }) => {
    // You see your party member throwing stars (cosmetic replicas; the
    // server still owns the damage).
    const room = freshRoom();
    const a = await openClient(browser, 'Aya', room);
    const b = await openClient(browser, 'Bee', room);
    await waitConnected(a.page);
    await waitConnected(b.page);

    await a.page.evaluate(() => {
      window.__test.setPlayerPos(-15, 0);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', bubbles: true }));
      window.advanceTime(1500);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', bubbles: true }));
    });
    await b.page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).remoteStars?.length > 0,
      null,
      { timeout: 10000 },
    );

    await a.context.close();
    await b.context.close();
  });

  test('offline fallback', async ({ browser }) => {
    // mp requested but the server port is wrong: the game must boot and
    // run the LOCAL sim (mobs patrol deterministically via advanceTime).
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:5173/?mp=1&mphost=127.0.0.1:59999');
    await page.waitForFunction(
      () => typeof window.render_game_to_text === 'function',
      null,
      { timeout: 10000 },
    );

    const result = await page.evaluate(() => {
      const read2 = () => JSON.parse(window.render_game_to_text());
      const x0 = read2().mobs[0]?.x;
      // Sample max deviation — a patrolling mob can loop back near its
      // start over a fixed window, so endpoints alone under-measure.
      let maxDev = 0;
      for (let i = 0; i < 20; i++) {
        window.advanceTime(100);
        const m = read2().mobs[0];
        if (m) maxDev = Math.max(maxDev, Math.abs(m.x - x0));
      }
      const s = read2();
      return {
        mobCount: s.mobs.length,
        moved: maxDev > 0.2,
        connected: s.multiplayer?.connected ?? false,
      };
    });
    expect(result.mobCount).toBeGreaterThan(0);
    expect(result.moved).toBe(true); // local sim is running
    expect(result.connected).toBe(false);

    await context.close();
  });
});
