// Pure shop logic: price check + inventory mutation.

import { POTION_PRICE, STARPACK_PRICE, STARPACK_SIZE, STAR_MAX } from '../core/constants.js';

export const PRICES = { potion: POTION_PRICE, starPack: STARPACK_PRICE };

export function tryBuy(inventory, kind, events) {
  const price = PRICES[kind];
  if (price === undefined || inventory.mesos < price) return false;
  inventory.mesos -= price;
  if (kind === 'potion') inventory.potions += 1;
  else inventory.stars = Math.min(STAR_MAX, inventory.stars + STARPACK_SIZE); // a pack of stars
  events?.emit('shop:bought', { kind, price });
  return true;
}
