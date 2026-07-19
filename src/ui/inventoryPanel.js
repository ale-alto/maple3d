// Plain-DOM equip/inventory panel (M10). I toggles; bag grid of gear,
// click a cell to equip (current piece swaps back), click an equipped
// slot to unequip. Styled after the classic ITEM INVENTORY window.

import { BAG_MAX } from '../core/constants.js';
import { equipFromBag, unequip } from '../sim/items.js';

const statOf = (g) => (g.slot === 'weapon' ? `ATT +${g.attack}` : `DEF +${g.defense}`);

export function createInventoryPanel(gameState, eventBus) {
  const panel = document.createElement('div');
  panel.id = 'inv-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="inv-title">Item Inventory<button id="inv-close">×</button></div>
    <div class="inv-equipped">
      <div id="inv-weapon" class="inv-equip-slot" title="Weapon"><span class="inv-slot-label">Weapon</span><span id="inv-weapon-name" class="inv-slot-item">—</span></div>
      <div id="inv-armor" class="inv-equip-slot" title="Armor"><span class="inv-slot-label">Armor</span><span id="inv-armor-name" class="inv-slot-item">—</span></div>
    </div>
    <div id="inv-grid" class="inv-grid"></div>
    <div id="inv-hint" class="inv-hint">Click gear to equip · click an equipped slot to remove</div>
  `;
  document.body.appendChild(panel);

  const grid = panel.querySelector('#inv-grid');
  const weaponName = panel.querySelector('#inv-weapon-name');
  const armorName = panel.querySelector('#inv-armor-name');

  function render() {
    const eq = gameState.player.equipment;
    weaponName.textContent = eq.weapon ? `${eq.weapon.name} (${statOf(eq.weapon)})` : '—';
    armorName.textContent = eq.armor ? `${eq.armor.name} (${statOf(eq.armor)})` : '—';
    grid.innerHTML = '';
    gameState.inventory.bag.forEach((g, idx) => {
      const cell = document.createElement('button');
      cell.className = `inv-cell ${g.slot}`;
      cell.dataset.idx = idx;
      // Compare tooltip vs what's equipped in that slot.
      const cur = eq[g.slot];
      const curStat = cur ? (g.slot === 'weapon' ? cur.attack : cur.defense) : 0;
      const stat = g.slot === 'weapon' ? g.attack : g.defense;
      const delta = stat - curStat;
      cell.title = `${g.name} — ${statOf(g)} (${delta >= 0 ? '+' : ''}${delta} vs equipped)`;
      cell.innerHTML = `<span class="inv-cell-name">${g.name}</span><span class="inv-cell-stat">${statOf(g)}</span>`;
      cell.addEventListener('click', () => {
        equipFromBag(gameState.player, gameState.inventory, idx, eventBus);
        render();
      });
      grid.appendChild(cell);
    });
    // Pad to a steady grid.
    for (let i = gameState.inventory.bag.length; i < Math.min(BAG_MAX, 12); i++) {
      const empty = document.createElement('div');
      empty.className = 'inv-cell empty';
      grid.appendChild(empty);
    }
  }

  panel.querySelector('#inv-weapon').addEventListener('click', () => {
    unequip(gameState.player, gameState.inventory, 'weapon', BAG_MAX, eventBus);
    render();
  });
  panel.querySelector('#inv-armor').addEventListener('click', () => {
    unequip(gameState.player, gameState.inventory, 'armor', BAG_MAX, eventBus);
    render();
  });
  panel.querySelector('#inv-close').addEventListener('click', () => toggle(false));

  function toggle(force) {
    const show = force ?? panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show) render();
  }

  window.addEventListener('keydown', (e) => {
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (!typing && (e.key === 'i' || e.key === 'I')) toggle();
  });

  // New drops while open (rare but nice): repaint on pickup.
  eventBus.on('loot:picked', () => {
    if (panel.style.display !== 'none') render();
  });

  return { toggle, render };
}
