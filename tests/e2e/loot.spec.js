import { test, expect, state } from '../fixtures/game-test.js';
import {
  DROP_DESPAWN_MS,
  STARTING_POTIONS,
  PLAYER_MAX_HP,
} from '../../src/core/constants.js';

// M03 contract additions:
//   inventory: { mesos, potions, starPacks }
//   drops: [{id, kind, x, y, ageMs}] (kind: mesos|potion|starPack)
//   Z picks up the nearest overlapping drop; 'c' drinks a potion.
// Mesos always drop (deterministic); potion/starPack are seeded-rng extras.

function killMob0AndWaitDrops() {
  const read = () => JSON.parse(window.render_game_to_text());
  const key = (type, k) =>
    window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
  const sp0 = read().map.mobSpawns[0];
  window.__test.setPlayerPos(sp0.patrolX1 - 0.5, sp0.y);
  window.advanceTime(50);
  key('keydown', 'ArrowRight');
  window.advanceTime(17);
  key('keyup', 'ArrowRight');
  key('keydown', 'Control');
  const before = read().mobs.length;
  for (let i = 0; i < 500 && read().mobs.length >= before; i++) {
    window.advanceTime(16.667);
  }
  key('keyup', 'Control');
  // Let the spill settle onto the ground.
  window.advanceTime(1000);
  return read();
}

test.describe('M03 loot', () => {
  test('drop spill and despawn', async ({ gamePage }) => {
    const after = await gamePage.evaluate(killMob0AndWaitDrops);
    expect(after.drops.length).toBeGreaterThanOrEqual(1);
    expect(after.drops.some((d) => d.kind === 'mesos')).toBe(true);
    // Landed on the ground the mob died on.
    for (const d of after.drops) expect(Math.abs(d.y)).toBeLessThan(0.5);

    const remaining = await gamePage.evaluate((ms) => {
      for (let i = 0; i < ms / 100; i++) window.advanceTime(100);
      return JSON.parse(window.render_game_to_text()).drops.length;
    }, DROP_DESPAWN_MS + 1000);
    expect(remaining).toBe(0);
  });

  test('pickup', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (type, k) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 0.5, sp0.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      const before = read().mobs.length;
      for (let i = 0; i < 500 && read().mobs.length >= before; i++) {
        window.advanceTime(16.667);
      }
      key('keyup', 'Control');
      window.advanceTime(1000);

      const drop = read().drops.find((d) => d.kind === 'mesos');
      if (!drop) return { ok: false };
      const dropsBefore = read().drops.length;
      window.__test.setPlayerPos(drop.x, drop.y);
      window.advanceTime(50);
      key('keydown', 'z');
      window.advanceTime(100);
      key('keyup', 'z');
      const cur = read();
      return {
        ok: true,
        dropsBefore,
        dropsAfter: cur.drops.length,
        mesosDropGone: !cur.drops.some((d) => d.kind === 'mesos'),
        mesos: cur.inventory.mesos,
      };
    });
    expect(result.ok).toBe(true);
    expect(result.mesos).toBeGreaterThan(0);
    // Holding Z vacuums reachable drops — the mesos is collected and the
    // ground pile shrinks.
    expect(result.mesosDropGone).toBe(true);
    expect(result.dropsAfter).toBeLessThan(result.dropsBefore);
  });

  test('loot while walking with Z held', async ({ gamePage }) => {
    // Reproduces the reported bug: hold Z, THEN move onto a drop — it must
    // be picked up (held-to-loot vacuum, not a one-shot edge on press).
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (type, k) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 0.5, sp0.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      const before = read().mobs.length;
      for (let i = 0; i < 500 && read().mobs.length >= before; i++) window.advanceTime(16.667);
      key('keyup', 'Control');
      window.advanceTime(1000);

      const drop = read().drops.find((d) => d.kind === 'mesos');
      if (!drop) return { ok: false };
      // Press and HOLD Z away from the drop first (nothing to grab)...
      window.__test.setPlayerPos(drop.x - 3, drop.y);
      key('keydown', 'z');
      window.advanceTime(100);
      const mesosBefore = read().inventory.mesos;
      // ...then walk onto the drop while Z stays held.
      window.__test.setPlayerPos(drop.x, drop.y);
      window.advanceTime(100);
      key('keyup', 'z');
      return { ok: true, mesosBefore, mesosAfter: read().inventory.mesos };
    });
    expect(result.ok).toBe(true);
    expect(result.mesosAfter).toBeGreaterThan(result.mesosBefore);
  });

  test('potion use', async ({ gamePage }) => {
    const before = await state(gamePage);
    expect(before.inventory.potions).toBe(STARTING_POTIONS);

    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (type, k) =>
        window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
      // Take one contact hit, then retreat somewhere safe.
      let s = read();
      for (let i = 0; i < 200 && s.player.hp >= s.player.maxHp; i++) {
        const mob = s.mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(50);
        s = read();
      }
      if (s.player.hp >= s.player.maxHp) return { ok: false };
      window.__test.setPlayerPos(s.map.spawn.x, 0);
      window.advanceTime(100);
      const hurt = read().player.hp;
      key('keydown', 'c');
      window.advanceTime(50);
      key('keyup', 'c');
      const cur = read();
      return { ok: true, hurt, healed: cur.player.hp, max: cur.player.maxHp, potions: cur.inventory.potions };
    });
    expect(result.ok).toBe(true);
    expect(result.hurt).toBeLessThan(PLAYER_MAX_HP);
    // 10-damage deficit, 20-point potion: heals to full (clamped).
    expect(result.healed).toBe(result.max);
    expect(result.potions).toBe(STARTING_POTIONS - 1);
  });
});
