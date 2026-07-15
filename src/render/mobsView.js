import * as THREE from 'three';
import { MOB_COLOR, MOB_WIDTH, MOB_HEIGHT, MOB_TYPES } from '../core/constants.js';

// Renders the mob list: typed blob placeholders (ADR-0002 primitives —
// color + scale per MOB_TYPES) with HP bars, a short scale-and-fade pop
// when one dies, and spitter shot meshes.

const POP_MS = 300;

function makeBlobView(typeDef) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(MOB_WIDTH / 2, 16, 12),
    new THREE.MeshLambertMaterial({ color: typeDef?.color ?? MOB_COLOR, transparent: true }),
  );
  body.scale.y = MOB_HEIGHT / MOB_WIDTH;
  body.position.y = MOB_HEIGHT / 2;
  group.add(body);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
    eye.position.set(side * 0.16, MOB_HEIGHT * 0.62, MOB_WIDTH / 2 - 0.04);
    group.add(eye);
  }

  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x33111a, transparent: true }),
  );
  barBg.position.y = MOB_HEIGHT + 0.35;
  group.add(barBg);

  const barFg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff5566, transparent: true }),
  );
  barFg.position.set(0, MOB_HEIGHT + 0.35, 0.01);
  group.add(barFg);

  return { group, barFg };
}

export class MobsView {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // mob id -> {group, barFg}
    this.pops = []; // {group, ageMs}
    this.shotViews = new Map(); // projectile id -> mesh
    this.shotGeo = new THREE.SphereGeometry(0.16, 10, 8);
    this.shotMat = new THREE.MeshBasicMaterial({ color: 0xb968ff });
  }

  syncProjectiles(shots) {
    const seen = new Set();
    for (const shot of shots) {
      seen.add(shot.id);
      let mesh = this.shotViews.get(shot.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.shotGeo, this.shotMat);
        this.shotViews.set(shot.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(shot.x, shot.y, 0);
    }
    for (const [id, mesh] of this.shotViews) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        this.shotViews.delete(id);
      }
    }
  }

  sync(mobs) {
    const seen = new Set();
    for (const mob of mobs) {
      seen.add(mob.id);
      let view = this.views.get(mob.id);
      if (!view) {
        const typeDef = MOB_TYPES[mob.type];
        view = makeBlobView(typeDef);
        view.group.scale.setScalar(typeDef?.scale ?? 1);
        this.views.set(mob.id, view);
        this.scene.add(view.group);
      }
      view.group.position.set(mob.x, mob.y, 0);
      view.group.rotation.y = mob.facing === 'left' ? Math.PI : 0;
      const frac = Math.max(0, mob.hp / mob.maxHp);
      view.barFg.scale.x = frac;
      view.barFg.position.x = -0.45 * (1 - frac);
    }
    // Removed mobs become death pops.
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        this.views.delete(id);
        this.pops.push({ group: view.group, ageMs: 0 });
      }
    }
  }

  // Map change: drop all views, pops, and shots immediately.
  clear() {
    for (const [, view] of this.views) this.scene.remove(view.group);
    this.views.clear();
    for (const pop of this.pops) this.scene.remove(pop.group);
    this.pops = [];
    for (const [, mesh] of this.shotViews) this.scene.remove(mesh);
    this.shotViews.clear();
  }

  tick(dtMs) {
    this.pops = this.pops.filter((pop) => {
      pop.ageMs += dtMs;
      const t = pop.ageMs / POP_MS;
      if (t >= 1) {
        this.scene.remove(pop.group);
        return false;
      }
      pop.group.scale.setScalar(1 + t * 0.8);
      pop.group.traverse((o) => {
        if (o.material) o.material.opacity = 1 - t;
      });
      return true;
    });
  }
}
