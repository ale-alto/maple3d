import * as THREE from 'three';

// Drop visuals: small spinning primitives per kind (placeholder tier).

const KIND_STYLE = {
  mesos: { geo: () => new THREE.OctahedronGeometry(0.16), color: 0xffd24d },
  potion: { geo: () => new THREE.CylinderGeometry(0.1, 0.13, 0.26, 10), color: 0xff5f6d },
  starPack: { geo: () => new THREE.BoxGeometry(0.24, 0.24, 0.24), color: 0x9fb4d8 },
};

export class LootView {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // drop id -> mesh
  }

  sync(drops, simTimeMs, myId = null) {
    const seen = new Set();
    for (const d of drops) {
      seen.add(d.id);
      let mesh = this.views.get(d.id);
      if (!mesh) {
        const style = KIND_STYLE[d.kind] ?? KIND_STYLE.mesos;
        mesh = new THREE.Mesh(
          style.geo(),
          new THREE.MeshLambertMaterial({ color: style.color, transparent: true }),
        );
        this.views.set(d.id, mesh);
        this.scene.add(mesh);
      }
      // Someone else's protected drop: visible but dimmed (classic MS).
      mesh.material.opacity = d.ownerId && d.ownerId !== myId ? 0.45 : 1;
      const bob = d.grounded ? Math.sin(simTimeMs / 300 + d.id) * 0.05 : 0;
      mesh.position.set(d.x, d.y + 0.2 + bob, 0.3);
      mesh.rotation.y = simTimeMs / 500 + d.id;
    }
    for (const [id, mesh] of this.views) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.views.delete(id);
      }
    }
  }
}
