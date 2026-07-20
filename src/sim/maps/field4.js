// Field 4: the hollow — the Hermit grind (ravagers below, wraiths
// sniping from the towers). Our original layout.

export const field4 = {
  id: 'field4',
  minX: -22,
  maxX: 22,
  groundY: 0,
  spawn: { x: -18, y: 0 },
  theme: { ground: 0x3f5a52, platform: 0x5a4a7a },
  platforms: [
    { x1: -15, x2: -9, y: 2.8 },
    { x1: -6, x2: 0, y: 4.6 },
    { x1: 3, x2: 8, y: 2.4 },
    { x1: 10, x2: 15, y: 5.0 },
    { x1: 16, x2: 21, y: 2.6 },
  ],
  ladders: [
    { x: -9.5, y1: 0, y2: 2.8, type: 'ladder' },
    { x: -5.5, y1: 2.8, y2: 4.6, type: 'rope' },
    { x: 7.5, y1: 0, y2: 2.4, type: 'ladder' },
    { x: 10.5, y1: 2.4, y2: 5.0, type: 'rope' },
  ],
  mobSpawns: [
    { x: -4, y: 0, patrolX1: -7, patrolX2: 0, type: 'ravager' },
    { x: 6, y: 0, patrolX1: 3, patrolX2: 9, type: 'ravager' },
    { x: 14, y: 0, patrolX1: 11, patrolX2: 17, type: 'ravager' },
    { x: -12, y: 2.8, patrolX1: -14.5, patrolX2: -9.5, type: 'wraith' },
    { x: 12.5, y: 5.0, patrolX1: 10.5, patrolX2: 14.5, type: 'wraith' },
  ],
  portals: [{ id: 'toField3', x: -21, y: 0, targetMap: 'field3', targetPortal: 'toField4' }],
  npcs: [],
};
