import * as THREE from 'three';
import { GROUND_COLOR, PLATFORM_COLOR, LADDER_COLOR } from '../core/constants.js';

// Builds blockout geometry from pure map data. Real map art is a later
// milestone; this is deliberately just boxes.

export function buildMapView(scene, map) {
  const group = new THREE.Group();

  const width = map.maxX - map.minX;
  const centerX = (map.minX + map.maxX) / 2;

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1, 8),
    new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
  );
  ground.position.set(centerX, map.groundY - 0.5, 0);
  group.add(ground);

  const platMat = new THREE.MeshLambertMaterial({ color: PLATFORM_COLOR });
  for (const plat of map.platforms) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(plat.x2 - plat.x1, 0.3, 3), platMat);
    mesh.position.set((plat.x1 + plat.x2) / 2, plat.y - 0.15, 0);
    group.add(mesh);
  }

  const ladderMat = new THREE.MeshLambertMaterial({ color: LADDER_COLOR });
  for (const ladder of map.ladders) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, ladder.y2 - ladder.y1, 0.15), ladderMat);
    mesh.position.set(ladder.x, (ladder.y1 + ladder.y2) / 2, -0.6);
    group.add(mesh);
  }

  scene.add(group);
  return group;
}
