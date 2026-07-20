// Plain-DOM shop panel. Opened by interacting with the shop NPC; buying
// goes through the pure sim/shop.js logic. M14: the real shelf — Red/Blue
// potions, the level-10 starter claw, and star recharge.

import { PRICES, tryBuy, tryRecharge } from '../sim/shop.js';
import { STAR_TYPES } from '../core/constants.js';

export function createShopPanel(gameState, eventBus) {
  const panel = document.createElement('div');
  panel.id = 'shop-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="shop-title">Shopkeeper Nara</div>
    <button id="shop-buy-potion">Red Potion (50 HP) — ${PRICES.potion} mesos</button>
    <button id="shop-buy-bluepotion">Blue Potion (100 MP) — ${PRICES.bluePotion} mesos</button>
    <button id="shop-buy-claw">Bronze Claw (WA 10, Lv 10) — ${PRICES.claw1} mesos</button>
    <button id="shop-recharge">Recharge stars</button>
    <div id="shop-message"></div>
    <button id="shop-close">Close</button>
  `;
  document.body.appendChild(panel);

  const message = panel.querySelector('#shop-message');

  function buy(kind) {
    if (tryBuy(gameState.inventory, kind, eventBus)) {
      message.textContent = 'Thanks!';
    } else {
      message.textContent = 'Not enough mesos…';
    }
  }

  panel.querySelector('#shop-buy-potion').addEventListener('click', () => buy('potion'));
  panel.querySelector('#shop-buy-bluepotion').addEventListener('click', () => buy('bluePotion'));
  panel.querySelector('#shop-buy-claw').addEventListener('click', () => buy('claw1'));
  panel.querySelector('#shop-recharge').addEventListener('click', () => {
    const inv = gameState.inventory;
    const type = STAR_TYPES[inv.starType] ?? STAR_TYPES.steel;
    if (tryRecharge(inv, eventBus)) {
      message.textContent = `Recharged to ${type.cap}!`;
    } else {
      message.textContent =
        inv.stars >= type.cap ? 'Stars are already full.' : 'Not enough mesos…';
    }
  });
  panel.querySelector('#shop-close').addEventListener('click', () => close());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  function open() {
    gameState.shopOpen = true;
    message.textContent = '';
    panel.style.display = 'flex';
  }
  function close() {
    gameState.shopOpen = false;
    panel.style.display = 'none';
  }

  return { open, close };
}
