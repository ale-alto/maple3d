// Pure shop logic: price check + inventory mutation.

import { POTION_PRICE, STARPACK_PRICE } from '../core/constants.js';

export const PRICES = { potion: POTION_PRICE, starPack: STARPACK_PRICE };

export function tryBuy(inventory, kind, events) {
  const price = PRICES[kind];
  if (price === undefined || inventory.mesos < price) return false;
  inventory.mesos -= price;
  if (kind === 'potion') inventory.potions += 1;
  else inventory.starPacks += 1;
  events?.emit('shop:bought', { kind, price });
  return true;
}
