// Hub town blockout: safe (no mobs), shop NPC, portal to Field 1.

export const town = {
  id: 'town',
  minX: -14,
  maxX: 14,
  groundY: 0,
  spawn: { x: 0, y: 0 },
  platforms: [{ x1: -9, x2: -4, y: 2.4 }],
  ladders: [],
  mobSpawns: [],
  portals: [{ id: 'toField1', x: 12, y: 0, targetMap: 'field1', targetPortal: 'toTown' }],
  npcs: [
    { id: 'shopkeeper', x: -4, y: 0, name: 'Shopkeeper Nara' },
    { id: 'trainer', x: 5, y: 0, name: 'Instructor Vey' }, // job advancement (M13)
  ],
};
