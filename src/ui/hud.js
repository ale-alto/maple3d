// Plain-DOM HUD (tech.md: no UI framework), styled after the classic
// pre-Big-Bang MapleStory status bar: full-width steel strip docked to
// the bottom, navy Lv. plate with gold digits, HP/MP/EXP in one row with
// bracketed values inside the bars, EXP % to two decimals, quickslots.

export function createHud(eventBus) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-level"><span class="hud-lv-label">Lv.</span><span id="hud-lv-num">1</span></div>
    <div class="hud-bars">
      <div class="hud-bar">
        <span class="hud-label hp">HP</span>
        <div class="hud-track">
          <div id="hud-hp-fill" class="hud-fill hp"></div>
          <div class="hud-notches"></div>
          <span id="hud-hp-text" class="hud-value"></span>
        </div>
      </div>
      <div class="hud-bar">
        <span class="hud-label mp">MP</span>
        <div class="hud-track">
          <div id="hud-mp-fill" class="hud-fill mp" style="width:100%"></div>
          <div class="hud-notches"></div>
          <span id="hud-mp-text" class="hud-value">[30/30]</span>
        </div>
      </div>
      <div class="hud-bar exp">
        <span class="hud-label exp">EXP</span>
        <div class="hud-track">
          <div id="hud-xp-fill" class="hud-fill xp"></div>
          <div class="hud-notches"></div>
          <span id="hud-xp-text" class="hud-value"></span>
        </div>
      </div>
    </div>
    <div id="hud-items">
      <div class="hud-slot" title="Throwing stars">
        <span class="hud-slot-icon star">&#10022;</span>
        <span id="hud-stars" class="hud-slot-count">0</span>
      </div>
      <div class="hud-slot" title="Potion — press C">
        <span class="hud-slot-key">C</span>
        <span class="hud-slot-icon potion"></span>
        <span id="hud-potions" class="hud-slot-count">0</span>
      </div>
      <div class="hud-slot mesos" title="Mesos">
        <span class="hud-slot-icon coin"></span>
        <span id="hud-mesos" class="hud-slot-count">0</span>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const flash = document.createElement('div');
  flash.id = 'levelup-flash';
  document.body.appendChild(flash);

  const el = {
    level: root.querySelector('#hud-lv-num'),
    hpFill: root.querySelector('#hud-hp-fill'),
    hpText: root.querySelector('#hud-hp-text'),
    mpFill: root.querySelector('#hud-mp-fill'),
    mpText: root.querySelector('#hud-mp-text'),
    xpFill: root.querySelector('#hud-xp-fill'),
    xpText: root.querySelector('#hud-xp-text'),
    stars: root.querySelector('#hud-stars'),
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
      el.level.textContent = p.level;
      el.hpFill.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
      el.hpText.textContent = `[${p.hp}/${p.maxHp}]`;
      // Classic low-HP blink when under 15%.
      el.hpFill.classList.toggle('low', p.hp / p.maxHp <= 0.15);
      const mp = p.mp ?? 30;
      const maxMp = p.maxMp ?? 30;
      el.mpFill.style.width = `${Math.max(0, (mp / maxMp) * 100)}%`;
      el.mpText.textContent = `[${mp}/${maxMp}]`;
      const need = xpToNext(p.level);
      el.xpFill.style.width = `${Math.min(100, (p.xp / need) * 100)}%`;
      el.xpText.textContent = `${p.xp} [${((p.xp / need) * 100).toFixed(2)}%]`;
      el.stars.textContent = gameState.inventory.stars;
      el.mesos.textContent = gameState.inventory.mesos;
      el.potions.textContent = gameState.inventory.potions;
    },
  };
}
