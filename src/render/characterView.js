import * as THREE from 'three';
import { PLAYER_BODY_COLOR, PLAYER_HEAD_COLOR } from '../core/constants.js';

// CharacterView abstraction (ADR-0002): position/facing/animation-state in,
// visuals out. Primitive chibi placeholder now; Meshy GLB later swaps the
// internals without touching sim or game logic.

export class CharacterView {
  constructor(scene) {
    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.35, 8, 16),
      new THREE.MeshLambertMaterial({ color: PLAYER_BODY_COLOR }),
    );
    body.position.y = 0.55;
    this.group.add(body);

    // Chibi proportions: oversized head.
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshLambertMaterial({ color: PLAYER_HEAD_COLOR }),
    );
    head.position.y = 1.25;
    this.group.add(head);

    scene.add(this.group);
  }

  // state: { x, y, facing, grounded, climbing } (sim player shape)
  update(state) {
    this.group.position.set(state.x, state.y, 0);
    this.group.rotation.y = state.facing === 'left' ? Math.PI : 0;
    // Cheap placeholder animation: lean forward slightly while airborne.
    this.group.rotation.z = state.grounded || state.climbing ? 0 : 0.08;
  }
}
