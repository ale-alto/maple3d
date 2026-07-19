// Pure shop logic: price check + inventory mutation.

import {
  POTION_PRICE,
  STARPACK_PRICE,
  STARPACK_SIZE,
  STAR_MAX,
  STARTER_CLAW_PRICE,
  BAG_MAX,
} from '../core/constants.js';
import { makeGear } from './items.js';

export const PRICES = { potion: POTION_PRICE, starPack: STARPACK_PRICE, claw1: STARTER_CLAW_PRICE };

export function tryBuy(inventory, kind, events) {
  const price = PRICES[kind];
  if (price === undefined || inventory.mesos < price) return false;
  if (kind === 'claw1' && inventory.bag.length >= BAG_MAX) return false; // no room
  inventory.mesos -= price;
  if (kind === 'potion') inventory.potions += 1;
  else if (kind === 'starPack') inventory.stars = Math.min(STAR_MAX, inventory.stars + STARPACK_SIZE);
  else inventory.bag.push(makeGear('weapon', 1, 0)); // starter claw, base roll
  events?.emit('shop:bought', { kind, price });
  return true;
}
