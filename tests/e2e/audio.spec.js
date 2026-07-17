import { test, expect, state } from '../fixtures/game-test.js';
import { XP_BASE } from '../../src/core/constants.js';

// M07 contract:
//   payload audio: {muted, bgm, lastSfx: [most recent sfx names]}
//   M toggles mute; bgm id follows the current map; sfx dispatch is
//   recorded even when the AudioContext is suspended (headless), so the
//   specs assert dispatch — audibility is the user-playtest AC.

test.describe('M07 audio', () => {
  test('mute toggle and state', async ({ gamePage }) => {
    const before = await state(gamePage);
    expect(before.audio.muted).toBe(false);

    await gamePage.evaluate(() => {
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      key('keydown', 'm');
      window.advanceTime(50);
      key('keyup', 'm');
    });
    expect((await state(gamePage)).audio.muted).toBe(true);

    await gamePage.evaluate(() => {
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      key('keydown', 'm');
      window.advanceTime(50);
      key('keyup', 'm');
    });
    expect((await state(gamePage)).audio.muted).toBe(false);
  });

  test('bgm follows the map', async ({ gamePage }) => {
    expect((await state(gamePage)).audio.bgm).toBe('field1');
    await gamePage.evaluate(() => {
      window.__test.gotoMap('town');
      window.advanceTime(100);
    });
    expect((await state(gamePage)).audio.bgm).toBe('town');
    await gamePage.evaluate(() => {
      window.__test.gotoMap('field2');
      window.advanceTime(100);
    });
    expect((await state(gamePage)).audio.bgm).toBe('field2');
  });

  test('sfx fire on events', async ({ gamePage }) => {
    const result = await gamePage.evaluate((xpBase) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const key = (t, k) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }));
      // Sit just short of a level so this kill also fires the jingle.
      window.__test.setXp(1, xpBase - 4);
      const sp0 = read().map.mobSpawns[0];
      window.__test.setPlayerPos(sp0.patrolX1 - 2.5, sp0.y);
      window.advanceTime(50);
      key('keydown', 'ArrowRight');
      window.advanceTime(17);
      key('keyup', 'ArrowRight');
      key('keydown', 'Control');
      const before = read().mobs.length;
      for (let i = 0; i < 700 && read().mobs.length >= before; i++) window.advanceTime(16.667);
      key('keyup', 'Control');
      window.advanceTime(200);
      return read().audio.lastSfx;
    }, XP_BASE);
    expect(result).toContain('throw');
    expect(result).toContain('hit');
    expect(result).toContain('pop');
    expect(result).toContain('levelup'); // the important one
  });
});
