import { test, expect } from '../fixtures/game-test.js';
import { MOB_TYPES, GEAR_TIERS } from '../../src/core/constants.js';

// M17 contract: field3/field4 chained off field2 (portals both ways);
// three tougher our-design mob tiers (stalker/ravager/wraith) with
// climbing level/avoid/xp; claw tiers 4-5 from the §9 ladder; Meso UP
// (E) multiplies meso drop amounts while active; Shadow Web (R) roots
// mobs in the forward box (they stop moving; payload mobs[].rooted).

const setupHermit = `() => {
  window.__test.setXp(72, 0);
  window.__test.setStats(4, 60, 4, 200);
  window.__test.advanceJob();
  window.__test.advanceJob();
  window.__test.advanceJob();
  window.advanceTime(50);
}`;

const spendSp = `(id, n) => {
  const kb = (t, k, code) => window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
  kb('keydown', 'k', 'KeyK'); kb('keyup', 'k', 'KeyK');
  for (let i = 0; i < n; i++) document.querySelector('.skill-add[data-skill="' + id + '"]')?.click();
  kb('keydown', 'k', 'KeyK'); kb('keyup', 'k', 'KeyK');
}`;

test.describe('M17 content', () => {
  test('fields chain and rosters climb', async ({ gamePage }) => {
    const result = await gamePage.evaluate(() => {
      const read = () => JSON.parse(window.render_game_to_text());
      window.__test.gotoMap('field3');
      window.advanceTime(100);
      const f3 = read();
      window.__test.gotoMap('field4');
      window.advanceTime(100);
      const f4 = read();
      return {
        f3Types: [...new Set(f3.mobs.map((m) => m.type))],
        f3Portals: f3.map.portals?.map((p) => p.targetMap) ?? [],
        f4Types: [...new Set(f4.mobs.map((m) => m.type))],
        f4Portals: f4.map.portals?.map((p) => p.targetMap) ?? [],
      };
    });
    expect(result.f3Types).toContain('stalker');
    expect(result.f3Portals).toContain('field2');
    expect(result.f3Portals).toContain('field4');
    expect(result.f4Types).toContain('ravager');
    expect(result.f4Types).toContain('wraith');
    expect(result.f4Portals).toContain('field3');
    // Tiers climb: level, xp, avoid all rise across the ladder.
    expect(MOB_TYPES.stalker.level).toBeGreaterThan(MOB_TYPES.spitter.level);
    expect(MOB_TYPES.ravager.level).toBeGreaterThan(MOB_TYPES.stalker.level);
    expect(MOB_TYPES.wraith.xp).toBeGreaterThan(MOB_TYPES.ravager.xp);
    // The §9 upper claw ladder exists for their drops.
    expect(GEAR_TIERS.weapon[3].wa).toBe(16);
    expect(GEAR_TIERS.weapon[4].wa).toBe(18);
    expect(GEAR_TIERS.weapon[4].levelReq).toBe(30);
  });

  test('meso up multiplies meso drops', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('mesoUp', 10); // +30%
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setStars(200);
      window.__test.setMp(300);
      kb('keydown', 'e', 'KeyE');
      window.advanceTime(60);
      kb('keyup', 'e', 'KeyE');
      const active = read().player.mesoUpMs > 0;
      const mpSpent = 300 - read().player.mp;
      // Kill a blob and read the meso drop amount.
      const mob = read().mobs[0];
      window.__test.setPlayerPos(mob.x - 3, mob.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      kb('keydown', 'Control', 'ControlLeft');
      let drop = null;
      for (let i = 0; i < 400 && !drop; i++) {
        window.advanceTime(50);
        drop = read().drops.find((d) => d.kind === 'mesos');
      }
      kb('keyup', 'Control', 'ControlLeft');
      return { active, mpSpent, amount: drop?.amount ?? null };
    }, [setupHermit, spendSp]);
    expect(result.active).toBe(true);
    expect(result.mpSpent).toBe(50); // level 10 cost
    // Blob mesos 5–14 × 1.3 → at least ceil(5·1.3)=7, at most ceil(14·1.3)=19.
    expect(result.amount).toBeGreaterThanOrEqual(7);
    expect(result.amount).toBeLessThanOrEqual(19);
  });

  test('shadow web roots mobs', async ({ gamePage }) => {
    const result = await gamePage.evaluate(([setup, spend]) => {
      const read = () => JSON.parse(window.render_game_to_text());
      const kb = (t, k, code) =>
        window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true }));
      eval(`(${setup})`)();
      eval(`(${spend})`)('shadowWeb', 20); // 80% success, 8 s — near-sure
      window.__test.gotoMap('field1');
      window.advanceTime(100);
      window.__test.setMp(300);
      const mob = read().mobs[0];
      window.__test.setPlayerPos(mob.x - 3, mob.y);
      kb('keydown', 'ArrowRight', 'ArrowRight');
      window.advanceTime(30);
      kb('keyup', 'ArrowRight', 'ArrowRight');
      // Cast until the root lands (80% per cast, seeded rng).
      let rooted = false;
      for (let i = 0; i < 6 && !rooted; i++) {
        kb('keydown', 'r', 'KeyR');
        window.advanceTime(60);
        kb('keyup', 'r', 'KeyR');
        rooted = read().mobs.find((m) => m.id === mob.id)?.rooted === true;
        if (!rooted) window.advanceTime(200);
      }
      if (!rooted) return { rooted };
      // Rooted mob stops moving.
      const x1 = read().mobs.find((m) => m.id === mob.id)?.x;
      window.advanceTime(1200);
      const x2 = read().mobs.find((m) => m.id === mob.id)?.x;
      // And the web expires (8 s at level 20).
      window.advanceTime(8000);
      const after = read().mobs.find((m) => m.id === mob.id)?.rooted;
      return { rooted, moved: Math.abs((x2 ?? 0) - (x1 ?? 0)), after };
    }, [setupHermit, spendSp]);
    expect(result.rooted).toBe(true);
    expect(result.moved).toBeLessThan(0.05);
    expect(result.after).toBe(false);
  });
});
