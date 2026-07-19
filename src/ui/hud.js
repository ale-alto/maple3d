import { playerAttack } from '../sim/combat.js';

// Plain-DOM HUD (tech.md: no UI framework), styled after the classic
// pre-Big-Bang MapleStory status bar: dark navy strip docked to the
// bottom, "LV." plate with orange digits, job + character name,
// HP[cur/max] / MP[cur/max] / EXP n[pct%] inside the lozenges, and the
// chunky beveled menu buttons on the right.

export function createHud(eventBus) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-level"><span class="hud-lv-label">LV.</span><span id="hud-lv-num">1</span></div>
    <div id="hud-identity">
      <div id="hud-job">Rogue</div>
      <div id="hud-name"></div>
    </div>
    <div id="hud-att" title="Attack (level + weapon)">ATT 8</div>
    <div class="hud-bars">
      <div class="hud-track hp">
        <div id="hud-hp-fill" class="hud-fill hp"></div>
        <span class="hud-label">HP</span>
        <span id="hud-hp-text" class="hud-value"></span>
      </div>
      <div class="hud-track mp">
        <div id="hud-mp-fill" class="hud-fill mp" style="width:100%"></div>
        <span class="hud-label">MP</span>
        <span id="hud-mp-text" class="hud-value">[30/30]</span>
      </div>
      <div class="hud-track exp">
        <div id="hud-xp-fill" class="hud-fill xp"></div>
        <span class="hud-label">EXP</span>
        <span id="hud-xp-text" class="hud-value"></span>
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
    <div id="hud-buttons">
      <button id="hud-btn-shop" class="hud-btn red" title="Open the shop (stand near Nara)">SHOP</button>
      <button id="hud-btn-sound" class="hud-btn orange" title="Sound settings">SOUND</button>
    </div>
  `;
  document.body.appendChild(root);

  root.querySelector('#hud-btn-shop').addEventListener('click', () => {
    eventBus.emit('ui:shopButton');
  });
  root.querySelector('#hud-btn-sound').addEventListener('click', () => {
    document.getElementById('audio-btn')?.click();
  });

  const flash = document.createElement('div');
  flash.id = 'levelup-flash';
  document.body.appendChild(flash);

  const el = {
    level: root.querySelector('#hud-lv-num'),
    name: root.querySelector('#hud-name'),
    hpFill: root.querySelector('#hud-hp-fill'),
    hpText: root.querySelector('#hud-hp-text'),
    mpFill: root.querySelector('#hud-mp-fill'),
    mpText: root.querySelector('#hud-mp-text'),
    xpFill: root.querySelector('#hud-xp-fill'),
    xpText: root.querySelector('#hud-xp-text'),
    att: root.querySelector('#hud-att'),
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
    setIdentity(name) {
      el.name.textContent = name;
    },
    update(gameState, xpToNext) {
      const p = gameState.player;
      el.level.textContent = p.level;
      el.att.textContent = `ATT ${playerAttack(p)}`;
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
      el.xpText.textContent = `${p.xp}[${((p.xp / need) * 100).toFixed(2)}%]`;
      el.stars.textContent = gameState.inventory.stars;
      el.mesos.textContent = gameState.inventory.mesos;
      el.potions.textContent = gameState.inventory.potions;
    },
  };
}
