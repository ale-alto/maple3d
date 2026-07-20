// Field 2: the deeper hunting ground — more vertical, tougher roster
// (bruisers on the ground, spitters holding the platforms).

export const field2 = {
  id: 'field2',
  minX: -18,
  maxX: 18,
  groundY: 0,
  spawn: { x: -14, y: 0 },
  theme: { ground: 0x58a86f, platform: 0x8a6f9e },
  platforms: [
    { x1: -12, x2: -7, y: 2.2 },
    { x1: -4, x2: 1, y: 3.2 },
    { x1: 4, x2: 9, y: 2.4 },
    { x1: 0, x2: 5, y: 5.2 },
    { x1: 11, x2: 16, y: 2.0 },
  ],
  ladders: [
    { x: -7.5, y1: 0, y2: 2.2, type: 'ladder' },
    { x: 4.5, y1: 0, y2: 2.4, type: 'rope' },
  ],
  mobSpawns: [
    { x: -2, y: 0, patrolX1: -4, patrolX2: 1, type: 'bruiser' },
    { x: 8, y: 0, patrolX1: 6, patrolX2: 11, type: 'bruiser' },
    { x: 13.5, y: 2.0, patrolX1: 11.5, patrolX2: 15.5, type: 'spitter' },
    { x: -9.5, y: 2.2, patrolX1: -11.5, patrolX2: -7.5, type: 'spitter' },
  ],
  portals: [
    { id: 'toField1', x: -17, y: 0, targetMap: 'field1', targetPortal: 'toField2' },
    { id: 'toField3', x: 17, y: 0, targetMap: 'field3', targetPortal: 'toField2' },
  ],
  npcs: [],
};
