import * as THREE from 'three';
import {
  GROUND_COLOR,
  PLATFORM_COLOR,
  LADDER_COLOR,
  PORTAL_COLOR,
  NPC_COLOR,
} from '../core/constants.js';

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

  // Portals: tall glowing slabs (blockout tier).
  for (const portal of map.portals ?? []) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.2, 0.3),
      new THREE.MeshBasicMaterial({ color: PORTAL_COLOR, transparent: true, opacity: 0.55 }),
    );
    mesh.position.set(portal.x, (portal.y ?? 0) + 1.1, -0.5);
    group.add(mesh);
  }

  // NPCs: static chibi blockouts.
  for (const npc of map.npcs ?? []) {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.35, 8, 16),
      new THREE.MeshLambertMaterial({ color: NPC_COLOR }),
    );
    body.position.set(npc.x, (npc.y ?? 0) + 0.55, 0);
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0xffe0bd }),
    );
    head.position.set(npc.x, (npc.y ?? 0) + 1.22, 0);
    group.add(head);
  }

  scene.add(group);
  return group;
}

export function disposeMapView(scene, group) {
  scene.remove(group);
  group.traverse((o) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
}
