import { test, expect, state } from '../fixtures/game-test.js';
import {
  XP_PER_MOB,
  XP_BASE,
  XP_GROWTH,
  HP_PER_LEVEL,
  DEATH_XP_PENALTY,
} from '../../src/core/constants.js';

// M03 contract additions:
//   player.level / player.xp / player.xpToNext
//   fx.lastLevelUpAgoMs (sim-time ms since last level-up, null if never)
//   window.__test.setXp(level, xp) dev hook (recomputes stats, full heal)
// Kills run as single synchronous in-page blocks (background rAF frames
// keep simulating between tool roundtrips — session flake playbook).

function killMob0Atomic() {
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
  window.advanceTime(100);
  return read();
}

test.describe('M03 progression', () => {
  test('xp gain', async ({ gamePage }) => {
    const before = await state(gamePage);
    expect(before.player.level).toBe(1);
    expect(before.player.xp).toBe(0);
    expect(before.player.xpToNext).toBe(XP_BASE);

    const after = await gamePage.evaluate(killMob0Atomic);
    expect(after.player.xp).toBe(XP_PER_MOB);
    expect(after.player.level).toBe(1);
  });

  test('level up', async ({ gamePage }) => {
    // Sit 4 xp short of level 2, then one kill overflows the bar.
    await gamePage.evaluate((xp) => window.__test.setXp(1, xp), XP_BASE - 4);
    const before = await state(gamePage);
    const maxHpBefore = before.player.maxHp;

    const after = await gamePage.evaluate(killMob0Atomic);
    expect(after.player.level).toBe(2);
    expect(after.player.xp).toBe(XP_PER_MOB - 4); // remainder carries over
    expect(after.player.xpToNext).toBe(Math.round(XP_BASE * XP_GROWTH));
    expect(after.player.maxHp).toBe(maxHpBefore + HP_PER_LEVEL);
    expect(after.player.hp).toBe(after.player.maxHp); // level-up full heal
    expect(after.fx.lastLevelUpAgoMs).not.toBeNull();
  });

  test('death penalty', async ({ gamePage }) => {
    // Death costs a small slice of xpToNext, but never dips below 0.
    const died = await gamePage.evaluate((startXp) => {
      const read = () => JSON.parse(window.render_game_to_text());
      window.__test.setXp(1, startXp);
      const spawnX = read().map.spawn.x;
      for (let i = 0; i < 400; i++) {
        const cur = read();
        if (cur.player.xp < startXp && Math.abs(cur.player.x - spawnX) < 0.5) break;
        const mob = cur.mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(100);
      }
      return read().player.xp;
    }, 10);
    expect(died).toBe(10 - Math.floor(XP_BASE * DEATH_XP_PENALTY));

    const floored = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      window.__test.setXp(1, 0);
      const spawnX = read().map.spawn.x;
      let sawDeath = false;
      for (let i = 0; i < 400 && !sawDeath; i++) {
        const cur = read();
        const mob = cur.mobs.find((m) => m.spawn === 0);
        if (mob) window.__test.setPlayerPos(mob.x, mob.y);
        window.advanceTime(100);
        const now = read();
        sawDeath = Math.abs(now.player.x - spawnX) < 0.5 && now.player.hp === now.player.maxHp;
      }
      return read().player.xp;
    });
    expect(floored).toBe(0);
  });
});
