// Field 3: the ridge — the Assassin-era bridge (stalkers, level ~22).
// Long ground lanes, staggered ledges. Our original layout.

export const field3 = {
  id: 'field3',
  minX: -20,
  maxX: 20,
  groundY: 0,
  spawn: { x: -16, y: 0 },
  theme: { ground: 0x4f7d5a, platform: 0x6e5a8a },
  platforms: [
    { x1: -13, x2: -8, y: 2.6 },
    { x1: -5, x2: 2, y: 3.4 },
    { x1: 5, x2: 10, y: 2.2 },
    { x1: 12, x2: 17, y: 4.0 },
  ],
  ladders: [
    { x: -8.5, y1: 0, y2: 2.6, type: 'ladder' },
    { x: 9.5, y1: 0, y2: 2.2, type: 'rope' },
    { x: 12.5, y1: 2.2, y2: 4.0, type: 'ladder' },
  ],
  mobSpawns: [
    { x: -6, y: 0, patrolX1: -8, patrolX2: -2, type: 'stalker' },
    { x: 3, y: 0, patrolX1: 0, patrolX2: 6, type: 'stalker' },
    { x: 12, y: 0, patrolX1: 9, patrolX2: 15, type: 'stalker' },
    { x: -1, y: 3.4, patrolX1: -4.5, patrolX2: 1.5, type: 'stalker' },
  ],
  portals: [
    { id: 'toField2', x: -19, y: 0, targetMap: 'field2', targetPortal: 'toField3' },
    { id: 'toField4', x: 19, y: 0, targetMap: 'field4', targetPortal: 'toField3' },
  ],
  npcs: [],
};
