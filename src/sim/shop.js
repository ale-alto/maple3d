// Pure shop logic (M14 real shelf): Red/Blue potions at documented
// prices, the level-10 starter claw, and star recharge at per-star cost.

import {
  RED_POTION_PRICE,
  BLUE_POTION_PRICE,
  GEAR_TIERS,
  STAR_TYPES,
  BAG_MAX,
} from '../core/constants.js';
import { makeGear } from './items.js';

export const PRICES = {
  potion: RED_POTION_PRICE, // Red Potion (HP)
  bluePotion: BLUE_POTION_PRICE,
  claw1: GEAR_TIERS.weapon[0].price,
};

export function tryBuy(inventory, kind, events) {
  const price = PRICES[kind];
  if (price === undefined || inventory.mesos < price) return false;
  if (kind === 'claw1' && inventory.bag.length >= BAG_MAX) return false; // no room
  inventory.mesos -= price;
  if (kind === 'potion') inventory.potions += 1;
  else if (kind === 'bluePotion') inventory.bluePotions = (inventory.bluePotions ?? 0) + 1;
  else inventory.bag.push(makeGear('weapon', 1, 0)); // starter claw, base roll
  events?.emit('shop:bought', { kind, price });
  return true;
}

// Recharge the equipped star type to its cap: per-star price × missing.
export function tryRecharge(inventory, events) {
  const type = STAR_TYPES[inventory.starType] ?? STAR_TYPES.steel;
  const missing = type.cap - inventory.stars;
  if (missing <= 0) return false;
  const cost = Math.ceil(missing * type.rechargePerStar);
  if (inventory.mesos < cost) return false;
  inventory.mesos -= cost;
  inventory.stars = type.cap;
  events?.emit('shop:bought', { kind: 'recharge', price: cost });
  return true;
}
