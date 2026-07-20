// AP spending (pure). Split from stats.js so the formula module stays
// dependency-free for node-side spec imports.

export function assignAp(player, statId, events) {
  if (player.ap <= 0) return false;
  if (!['str', 'dex', 'int', 'luk'].includes(statId)) return false;
  player.ap -= 1;
  player.stats[statId] += 1;
  events?.emit('stat:assigned', { statId, value: player.stats[statId] });
  return true;
}
