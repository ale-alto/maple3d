import * as THREE from 'three';
import { loadProp } from './assetLoader.js';
import { makeShuriken } from './shuriken.js';

// Drop visuals (M08): instant primitive, KayKit dungeon prop on load.
// Mesos pick a coin/stack model by amount, classic-MS style; star packs
// are a chunky procedural shuriken.

const KIND_STYLE = {
  mesos: { geo: () => new THREE.OctahedronGeometry(0.16), color: 0xffd24d },
  potion: { geo: () => new THREE.CylinderGeometry(0.1, 0.13, 0.26, 10), color: 0xff5f6d },
  starPack: { geo: () => new THREE.BoxGeometry(0.24, 0.24, 0.24), color: 0x9fb4d8 },
  // Gear (M10): the rare one gets a bigger, shinier marker.
  gear: { geo: () => new THREE.OctahedronGeometry(0.24), color: 0xd8e2f4 },
};

// Meso tiers (drop amounts run ~5–30).
function mesosFile(amount = 0) {
  if (amount < 12) return '/models/loot/coin.glb';
  if (amount < 20) return '/models/loot/coin_stack_small.glb';
  if (amount < 28) return '/models/loot/coin_stack_medium.glb';
  return '/models/loot/coin_stack_large.glb';
}

const TARGET_SIZE = { mesos: 0.34, potion: 0.4 };

export class LootView {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // drop id -> {group, mats, dead}
  }

  makeView(d) {
    const group = new THREE.Group();
    const view = { group, mats: null, dead: false };

    if (d.kind === 'starPack') {
      // Procedural shuriken — no download, always crisp.
      const star = makeShuriken(0.26);
      view.mats = [star.material];
      group.add(star);
    } else {
      const style = KIND_STYLE[d.kind] ?? KIND_STYLE.mesos;
      const primitive = new THREE.Mesh(
        style.geo(),
        new THREE.MeshLambertMaterial({ color: style.color, transparent: true }),
      );
      view.mats = [primitive.material];
      view.primitive = primitive;
      group.add(primitive);

      const file =
        d.kind === 'mesos' ? mesosFile(d.amount) : d.kind === 'potion' ? '/models/loot/potion.glb' : null;
      if (file) loadProp(file).then((res) => {
        if (!res || view.dead) return;
        const { model, materials } = res;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const target = TARGET_SIZE[d.kind] ?? 0.35;
        model.scale.setScalar(target / (Math.max(size.x, size.y, size.z) || 1));
        const box2 = new THREE.Box3().setFromObject(model);
        const center = box2.getCenter(new THREE.Vector3());
        model.position.sub(center); // spin around the middle
        group.remove(primitive);
        primitive.geometry.dispose();
        primitive.material.dispose();
        view.primitive = null;
        group.add(model);
        view.mats = materials;
      });
    }

    this.scene.add(group);
    return view;
  }

  sync(drops, simTimeMs, myId = null) {
    const seen = new Set();
    for (const d of drops) {
      seen.add(d.id);
      let view = this.views.get(d.id);
      if (!view) {
        view = this.makeView(d);
        this.views.set(d.id, view);
      }
      // Someone else's protected drop: visible but dimmed (classic MS).
      const opacity = d.ownerId && d.ownerId !== myId ? 0.45 : 1;
      for (const m of view.mats) m.opacity = opacity;
      const bob = d.grounded ? Math.sin(simTimeMs / 300 + d.id) * 0.05 : 0;
      view.group.position.set(d.x, d.y + 0.25 + bob, 0.3);
      view.group.rotation.y = simTimeMs / 500 + d.id;
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.dead = true;
        this.scene.remove(view.group);
        // Model/shuriken geometries are shared caches — dispose only the
        // per-view primitive geometry and this view's cloned materials.
        view.primitive?.geometry.dispose();
        for (const m of view.mats) m.dispose();
        this.views.delete(id);
      }
    }
  }
}
