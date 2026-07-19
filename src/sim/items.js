// Headless item/gear sim (M10). Pure logic on plain objects.
// Gear items: {kind:'gear', gearId, slot, name, tier, attack|defense} —
// the stat rolls once at drop time (base + [0..roll], integer).

import { GEAR_TIERS } from '../core/constants.js';

let nextGearId = 1;

// Build a concrete piece from a tier def. rollFrac in [0,1) picks the
// bonus (pass 1 - epsilon for max-roll dev/test gear, 0 for base).
export function makeGear(slot, tier, rollFrac = 0) {
  const def = GEAR_TIERS[slot]?.[tier - 1];
  if (!def) return null;
  const bonus = Math.floor(rollFrac * (def.roll + 1));
  const item = {
    kind: 'gear',
    gearId: `g${nextGearId++}`,
    slot,
    name: def.name,
    tier: def.tier,
  };
  if (slot === 'weapon') item.attack = def.attack + bonus;
  else item.defense = def.defense + bonus;
  return item;
}

// Drop-table roll: null (no gear — the common case) or a rolled piece.
// typeDef: {gearChance, gearTierMax} per mob type.
export function rollGear(rand, typeDef) {
  const chance = typeDef?.gearChance ?? 0;
  if (rand() >= chance) return null;
  const slot = rand() < 0.5 ? 'weapon' : 'armor';
  const tierMax = Math.min(typeDef?.gearTierMax ?? 1, GEAR_TIERS[slot].length);
  const tier = 1 + Math.floor(rand() * tierMax);
  return makeGear(slot, tier, rand());
}

// Derived stats: gear layers on top of the level curve.
export const weaponAttack = (equipment) => equipment?.weapon?.attack ?? 0;
export const armorDefense = (equipment) => equipment?.armor?.defense ?? 0;

// Defense soak: never below 1 damage (classic MS never fully no-sells).
export const soak = (amount, equipment) => Math.max(1, amount - armorDefense(equipment));

// Equip the bag item at idx; whatever occupied its slot swaps back into
// the bag. Returns true on success.
export function equipFromBag(player, inventory, idx, events) {
  const item = inventory.bag[idx];
  if (!item || item.kind !== 'gear') return false;
  inventory.bag.splice(idx, 1);
  const prev = player.equipment[item.slot];
  player.equipment[item.slot] = item;
  if (prev) inventory.bag.push(prev);
  events?.emit('gear:equipped', { slot: item.slot, gearId: item.gearId });
  return true;
}

// Unequip a slot back into the bag (refused when the bag is full).
export function unequip(player, inventory, slot, bagMax, events) {
  const item = player.equipment[slot];
  if (!item || inventory.bag.length >= bagMax) return false;
  player.equipment[slot] = null;
  inventory.bag.push(item);
  events?.emit('gear:equipped', { slot, gearId: null });
  return true;
}
