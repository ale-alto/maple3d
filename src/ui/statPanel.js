// Plain-DOM stat window (M12). S toggles; shows STR/DEX/INT/LUK with
// AP-assignment buttons, accuracy/avoid, and the live damage range.
// Classic ability window styling.

import { assignAp } from '../sim/stats-actions.js';
import { thiefAccuracy, thiefAvoid } from '../sim/stats.js';
import { attackRange } from '../sim/combat.js';

const STAT_ROWS = [
  ['str', 'STR'],
  ['dex', 'DEX'],
  ['int', 'INT'],
  ['luk', 'LUK'],
];

export function createStatPanel(gameState, eventBus) {
  const panel = document.createElement('div');
  panel.id = 'stat-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="stat-title">Ability<button id="stat-close">×</button></div>
    <div class="stat-ap-row">Ability points: <span id="stat-ap">0</span></div>
    ${STAT_ROWS.map(
      ([id, label]) => `
      <div class="stat-row" data-stat="${id}">
        <span class="stat-name">${label}</span>
        <span class="stat-value" data-stat="${id}">4</span>
        <button class="stat-add" data-stat="${id}" title="Assign 1 AP">+</button>
      </div>`,
    ).join('')}
    <div class="stat-derived">
      <div>Damage <span id="stat-range">—</span></div>
      <div>Accuracy <span id="stat-acc">—</span> · Avoid <span id="stat-avoid">—</span></div>
    </div>
  `;
  document.body.appendChild(panel);

  function render() {
    const p = gameState.player;
    panel.querySelector('#stat-ap').textContent = p.ap;
    for (const [id] of STAT_ROWS) {
      panel.querySelector(`.stat-value[data-stat="${id}"]`).textContent = p.stats[id];
      panel.querySelector(`.stat-add[data-stat="${id}"]`).disabled = p.ap <= 0;
    }
    const r = attackRange(p);
    panel.querySelector('#stat-range').textContent = `${r.min} ~ ${r.max}`;
    panel.querySelector('#stat-acc').textContent = thiefAccuracy(p.stats).toFixed(1);
    panel.querySelector('#stat-avoid').textContent = thiefAvoid(p.stats).toFixed(1);
  }

  for (const btn of panel.querySelectorAll('.stat-add')) {
    btn.addEventListener('click', () => {
      assignAp(gameState.player, btn.dataset.stat, eventBus);
      render();
    });
  }
  panel.querySelector('#stat-close').addEventListener('click', () => toggle(false));

  function toggle(force) {
    const show = force ?? panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show) render();
  }

  window.addEventListener('keydown', (e) => {
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (!typing && (e.key === 's' || e.key === 'S')) toggle();
  });

  eventBus.on('player:levelup', () => {
    if (panel.style.display !== 'none') render();
  });

  return { toggle, render };
}
