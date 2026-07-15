// Plain-DOM HUD (tech.md: no UI framework): HP/MP/XP bars, level, mesos,
// potion count, and the level-up flash.

export function createHud(eventBus) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-level">Lv. 1</div>
    <div class="hud-bars">
      <div class="hud-bar"><span class="hud-label">HP</span><div class="hud-track"><div id="hud-hp-fill" class="hud-fill hp"></div></div><span id="hud-hp-text" class="hud-value"></span></div>
      <div class="hud-bar"><span class="hud-label">MP</span><div class="hud-track"><div id="hud-mp-fill" class="hud-fill mp" style="width:100%"></div></div><span class="hud-value">30/30</span></div>
      <div class="hud-bar"><span class="hud-label">XP</span><div class="hud-track"><div id="hud-xp-fill" class="hud-fill xp"></div></div><span id="hud-xp-text" class="hud-value"></span></div>
    </div>
    <div id="hud-items"><span id="hud-mesos">0</span> mesos · <span id="hud-potions">0</span> potions <span class="hud-hint">[C]</span></div>
  `;
  document.body.appendChild(root);

  const flash = document.createElement('div');
  flash.id = 'levelup-flash';
  document.body.appendChild(flash);

  const el = {
    level: root.querySelector('#hud-level'),
    hpFill: root.querySelector('#hud-hp-fill'),
    hpText: root.querySelector('#hud-hp-text'),
    xpFill: root.querySelector('#hud-xp-fill'),
    xpText: root.querySelector('#hud-xp-text'),
    mesos: root.querySelector('#hud-mesos'),
    potions: root.querySelector('#hud-potions'),
  };

  eventBus.on('player:levelup', ({ level }) => {
    flash.textContent = `LEVEL UP!  Lv. ${level}`;
    flash.classList.remove('show');
    void flash.offsetWidth; // restart the CSS animation
    flash.classList.add('show');
  });

  return {
    update(gameState, xpToNext) {
      const p = gameState.player;
      el.level.textContent = `Lv. ${p.level}`;
      el.hpFill.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
      el.hpText.textContent = `${p.hp}/${p.maxHp}`;
      const need = xpToNext(p.level);
      el.xpFill.style.width = `${Math.min(100, (p.xp / need) * 100)}%`;
      el.xpText.textContent = `${p.xp}/${need}`;
      el.mesos.textContent = gameState.inventory.mesos;
      el.potions.textContent = gameState.inventory.potions;
    },
  };
}
