import { test, expect, state } from '../fixtures/game-test.js';
import { MOB_TYPES } from '../../src/core/constants.js';

// M05 contract additions:
//   maps.field2 (portal chain field1 <-> field2); mobSpawns carry `type`
//   mobs payload gains `type`; mobsState projectiles (spitter shots) as
//   mobProjectiles: [{x, y, vx}]; per-type xp/drops/contact damage.

test.describe('M05 field2', () => {
  test('portal chain', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      const hop = () => {
        key('keydown', 'ArrowUp');
        window.advanceTime(100);
        key('keyup', 'ArrowUp');
        window.advanceTime(100);
      };
      const out = { start: read().mapId };
      const p1 = read().map.portals.find((p) => p.targetMap === 'field2');
      if (!p1) return { start: out.start, missing: 'field2 portal' };
      window.__test.setPlayerPos(p1.x, 0);
      window.advanceTime(200);
      hop();
      out.mid = read().mapId;
      const p2 = read().map.portals.find((p) => p.targetMap === 'field1');
      window.__test.setPlayerPos(p2.x, 0);
      window.advanceTime(200);
      hop();
      out.back = read().mapId;
      return out;
    });
    expect(result.missing).toBeUndefined();
    expect(result.start).toBe('field1');
    expect(result.mid).toBe('field2');
    expect(result.back).toBe('field1');
  });

  test('mob types and stats', async ({ gamePage }) => {
    const mobs = await gamePage.evaluate(() => {
      window.__test.gotoMap('field2');
      window.advanceTime(200);
      return JSON.parse(window.render_game_to_text()).mobs;
    });
    const bruiser = mobs.find((m) => m.type === 'bruiser');
    const spitter = mobs.find((m) => m.type === 'spitter');
    expect(bruiser).toBeTruthy();
    expect(spitter).toBeTruthy();
    expect(bruiser.maxHp).toBe(MOB_TYPES.bruiser.maxHp);
    expect(spitter.maxHp).toBe(MOB_TYPES.spitter.maxHp);
    expect(bruiser.maxHp).toBeGreaterThan(MOB_TYPES.blob.maxHp); // tougher tier
  });

  test('xp and drops scale', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      window.__test.gotoMap('field2');
      window.advanceTime(200);
      // Kill a ground bruiser: stand outside its patrol edge, lock on.
      const spawn = read().map.mobSpawns.find((s) => s.type === 'bruiser' && s.y === 0);
      window.__test.setPlayerPos(spawn.patrolX1 - 2, 0);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      const xpBefore = read().player.xp;
      const spawnIdx = read().map.mobSpawns.indexOf(spawn);
      key('keydown', 'Control');
      let dead = false;
      for (let i = 0; i < 700 && !dead; i++) {
        window.advanceTime(16.667);
        dead = !read().mobs.some((m) => m.spawn === spawnIdx);
      }
      key('keyup', 'Control');
      window.advanceTime(1000); // drops settle
      const cur = read();
      const mesosDrop = cur.drops.find((d) => d.kind === 'mesos');
      return {
        dead,
        xpGained: cur.player.xp - xpBefore,
        mesosAmount: mesosDrop ? mesosDrop.amount : null,
      };
    });
    expect(result.dead).toBe(true);
    expect(result.xpGained).toBe(MOB_TYPES.bruiser.xp); // 16, not blob's 8
    expect(result.mesosAmount).toBeGreaterThanOrEqual(MOB_TYPES.bruiser.mesosMin);
  });

  test('ranged mob', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      window.__test.gotoMap('field2');
      window.advanceTime(200);
      // Stand on the spitter's platform, in range but outside contact.
      const spawn = read().map.mobSpawns.find((s) => s.type === 'spitter');
      window.__test.setPlayerPos(spawn.patrolX1 - 2, spawn.y);
      window.advanceTime(100);
      const hpStart = read().player.hp;
      let sawShot = false;
      let slowAndFlat = false;
      let tookHit = false;
      for (let i = 0; i < 600 && !(sawShot && tookHit); i++) {
        window.advanceTime(16.667);
        const cur = read();
        for (const shot of cur.mobProjectiles) {
          sawShot = true;
          if (Math.abs(shot.vx) < 8 && Math.abs(shot.x) >= 0) slowAndFlat = true;
        }
        if (cur.player.hp < hpStart) tookHit = true;
        // Stay put even if knocked back, so shots keep coming.
        if (cur.mapId !== 'field2') break;
      }
      return { sawShot, slowAndFlat, tookHit };
    });
    expect(result.sawShot).toBe(true); // spitter fires on its level
    expect(result.slowAndFlat).toBe(true); // jumpable: slow horizontal shot
    expect(result.tookHit).toBe(true); // shots damage the player
  });
});
