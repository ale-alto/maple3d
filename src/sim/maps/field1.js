// Field 1 blockout data. Pure data — the render layer builds visuals from
// this, and the sim collides against it. Platforms are Maple-thin: solid
// from above only. Ladder tops line up with platform surfaces.

export const field1 = {
  id: 'field1',
  minX: -20,
  maxX: 20,
  groundY: 0,
  spawn: { x: -12, y: 0 },
  platforms: [
    { x1: -6, x2: -1, y: 2.2 },
    { x1: 2, x2: 7, y: 2.2 },
    { x1: -2, x2: 3, y: 4.4 },
    { x1: 9, x2: 14, y: 3.0 },
  ],
  // type per MSW ClimbableAnimationType: 'ladder' | 'rope'
  // Ladder sits at platform 1's left edge, clear of mob 0's patrol so the
  // grab point isn't inside contact-damage range.
  ladders: [
    { x: 2.2, y1: 0, y2: 2.2, type: 'ladder' },
    { x: 0.5, y1: 2.2, y2: 4.4, type: 'rope' },
  ],
  mobSpawns: [
    { x: 6.75, y: 0, patrolX1: 5.5, patrolX2: 8 },
    { x: 11.5, y: 3.0, patrolX1: 9.5, patrolX2: 13.5 },
  ],
};
