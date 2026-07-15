// Plain-DOM shop panel. Opened by interacting with the shop NPC; buying
// goes through the pure sim/shop.js logic.

import { PRICES, tryBuy } from '../sim/shop.js';

export function createShopPanel(gameState, eventBus) {
  const panel = document.createElement('div');
  panel.id = 'shop-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="shop-title">Shopkeeper Nara</div>
    <button id="shop-buy-potion">Potion — ${PRICES.potion} mesos</button>
    <button id="shop-buy-starpack">Star pack — ${PRICES.starPack} mesos</button>
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
  panel.querySelector('#shop-buy-starpack').addEventListener('click', () => buy('starPack'));
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
