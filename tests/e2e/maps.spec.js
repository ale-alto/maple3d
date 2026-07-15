import { test, expect, state, advance } from '../fixtures/game-test.js';
import { CAMERA_Z } from '../../src/core/constants.js';

// M04 contract additions:
//   mapId (top level); map.portals: [{id, x, targetMap, targetPortal}];
//   map.npcs: [{id, x, name}]; camera.z; transitionMs (map-entry swing)
//   Up (press) at a portal transitions maps; __test.gotoMap(mapId) dev hook.

test.describe('M04 maps', () => {
  test('portal transition', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      const s0 = read();
      const portal = s0.map.portals.find((p) => p.targetMap === 'town');
      window.__test.setPlayerPos(portal.x, 0);
      window.advanceTime(200); // settle grounded at the portal
      key('keydown', 'ArrowUp');
      window.advanceTime(100);
      key('keyup', 'ArrowUp');
      window.advanceTime(100);
      const s1 = read();
      const back = s1.map.portals.find((p) => p.targetMap === 'field1');
      return {
        fromMap: s0.mapId,
        toMap: s1.mapId,
        playerX: s1.player.x,
        entryPortalX: back ? back.x : null,
      };
    });
    expect(result.fromMap).toBe('field1');
    expect(result.toMap).toBe('town');
    expect(result.entryPortalX).not.toBeNull();
    expect(Math.abs(result.playerX - result.entryPortalX)).toBeLessThan(1);
  });

  test('camera swing on entry', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      const portal = read().map.portals.find((p) => p.targetMap === 'town');
      window.__test.setPlayerPos(portal.x, 0);
      window.advanceTime(200);
      key('keydown', 'ArrowUp');
      window.advanceTime(50);
      key('keyup', 'ArrowUp');
      const entering = read();
      window.advanceTime(1200);
      const settled = read();
      return {
        duringMs: entering.transitionMs,
        duringZ: entering.camera.z,
        settledMs: settled.transitionMs,
        settledZ: settled.camera.z,
      };
    });
    expect(result.duringMs).toBeGreaterThan(0); // swing active on entry
    expect(result.duringZ).toBeGreaterThan(CAMERA_Z + 0.5); // pulled back
    expect(result.settledMs).toBe(0);
    expect(Math.abs(result.settledZ - CAMERA_Z)).toBeLessThan(0.1);
  });

  test('town is safe, fields reset', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      // Damage (don't kill) mob 0 in field1.
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 2.5, sp0.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      let hurt = false;
      for (let i = 0; i < 120 && !hurt; i++) {
        window.advanceTime(16.667);
        const mob = read().mobs.find((m) => m.spawn === 0);
        hurt = mob && mob.hp < mob.maxHp;
      }
      key('keyup', 'Control');
      if (!hurt) return { ok: false };

      window.__test.gotoMap('town');
      window.advanceTime(200);
      const townMobs = read().mobs.length;
      window.__test.gotoMap('field1');
      window.advanceTime(200);
      const mob0 = read().mobs.find((m) => m.spawn === 0);
      return { ok: true, townMobs, resetHp: mob0.hp, maxHp: mob0.maxHp };
    });
    expect(result.ok).toBe(true);
    expect(result.townMobs).toBe(0);
    expect(result.resetHp).toBe(result.maxHp); // fresh state on re-entry
  });

  test('death respawns in town', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      let sawDamage = false;
      for (let i = 0; i < 400; i++) {
        const cur = read();
        if (cur.player.hp < cur.player.maxHp) sawDamage = true;
        if (sawDamage && cur.mapId === 'town' && cur.player.hp === cur.player.maxHp) {
          return {
            ok: true,
            x: cur.player.x,
            spawnX: cur.map.spawn.x,
          };
        }
        const mob = cur.mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(100);
      }
      return { ok: false };
    });
    expect(result.ok).toBe(true);
    expect(Math.abs(result.x - result.spawnX)).toBeLessThan(0.5);
  });
});
