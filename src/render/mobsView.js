import * as THREE from 'three';
import { MOB_COLOR, MOB_WIDTH, MOB_HEIGHT, MOB_TYPES, MODEL_DEFS, MODEL_YAW_TILT } from '../core/constants.js';
import { loadCharacter } from './assetLoader.js';

// Mob rendering (M08): primitive blob instantly, KayKit skeleton model on
// load, per-state clips (patrol walk / aggro run), Death_A on removal.

const POP_MS = 300; // primitive fallback pop
const MODEL_DEATH_MS = 900; // long enough for Death_A to read

function makePrimitive(typeDef) {
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
  return group;
}

function makeHpBar(y) {
  const holder = new THREE.Group();
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x33111a, transparent: true }),
  );
  barBg.position.y = y;
  holder.add(barBg);
  const barFg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff5566, transparent: true }),
  );
  barFg.position.set(0, y, 0.01);
  holder.add(barFg);
  return { holder, barFg };
}

export class MobsView {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // mob id -> view
    this.pops = []; // {group, ageMs, mixer, maxMs, mats}
    this.shotViews = new Map();
    this.shotGeo = new THREE.SphereGeometry(0.16, 10, 8);
    this.shotMat = new THREE.MeshBasicMaterial({ color: 0xb968ff });
  }

  makeView(mob) {
    const typeDef = MOB_TYPES[mob.type];
    const modelDef = MODEL_DEFS[mob.type];
    const group = new THREE.Group();
    const primitive = makePrimitive(typeDef);
    primitive.scale.setScalar(typeDef?.scale ?? 1);
    group.add(primitive);
    const barY = (typeDef?.scale ?? 1) * MOB_HEIGHT + 0.35;
    const bar = makeHpBar(barY);
    group.add(bar.holder);
    this.scene.add(group);

    const view = {
      group,
      barHolder: bar.holder,
      barFg: bar.barFg,
      mixer: null,
      actions: new Map(),
      currentClip: 'primitive',
      def: modelDef,
      dead: false,
    };

    if (modelDef) {
      loadCharacter(modelDef.file).then((res) => {
        if (!res || view.dead) return;
        const { model, clips } = res;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.scale.setScalar(modelDef.height / (size.y || 1));
        const box2 = new THREE.Box3().setFromObject(model);
        model.position.y = -box2.min.y;
        view.mixer = new THREE.AnimationMixer(model);
        for (const clip of clips) view.actions.set(clip.name, view.mixer.clipAction(clip));
        group.remove(primitive);
        group.add(model);
        bar.holder.position.y = modelDef.height + 0.25 - barY; // bar sits just over the model's head
        this.fadeTo(view, modelDef.clips.patrol);
      });
    }
    return view;
  }

  fadeTo(view, clipName, fade = 0.2, oneShot = false) {
    if (!view.mixer || view.currentClip === clipName) return;
    const next = view.actions.get(clipName);
    if (!next) return;
    if (view.active) view.active.fadeOut(fade);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    if (oneShot) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
    }
    view.active = next;
    view.currentClip = clipName;
  }

  clipOf(id) {
    return this.views.get(id)?.currentClip ?? 'primitive';
  }

  sync(mobs, dtSec = 0) {
    const seen = new Set();
    for (const mob of mobs) {
      seen.add(mob.id);
      let view = this.views.get(mob.id);
      if (!view) {
        view = this.makeView(mob);
        this.views.set(mob.id, view);
      }
      view.group.position.set(mob.x, mob.y, 0);
      const dir = mob.facing === 'left' ? -1 : 1;
      view.group.rotation.y = view.mixer
        ? dir * (Math.PI / 2 - MODEL_YAW_TILT)
        : mob.facing === 'left'
          ? Math.PI
          : 0;
      // HP bar always faces the screen: undo the group's facing yaw.
      view.barHolder.rotation.y = -view.group.rotation.y;
      const frac = Math.max(0, mob.hp / mob.maxHp);
      view.barFg.scale.x = frac || 0.0001;
      view.barFg.position.x = -0.45 * (1 - frac);
      if (view.mixer && view.def) {
        this.fadeTo(view, mob.state === 'aggro' ? view.def.clips.aggro : view.def.clips.patrol);
        if (dtSec > 0) view.mixer.update(dtSec);
      }
    }
    // Removed mobs die on screen: Death_A when the model is up, scale-pop
    // otherwise.
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.dead = true;
        this.views.delete(id);
        // The killing hit removes the mob before a final hp=0 frame arrives,
        // so drain the bar manually for the death animation.
        view.barFg.scale.x = 0.0001;
        view.barFg.position.x = -0.45;
        const hasModel = !!view.mixer;
        if (hasModel) {
          view.currentClip = null;
          this.fadeTo(view, view.def.clips.die, 0.05, true);
        }
        const mats = [];
        view.group.traverse((o) => {
          if (o.material) {
            o.material.transparent = true;
            mats.push(o.material);
          }
        });
        this.pops.push({
          group: view.group,
          mixer: view.mixer,
          ageMs: 0,
          maxMs: hasModel ? MODEL_DEATH_MS : POP_MS,
          scalePop: !hasModel,
          mats,
        });
      }
    }
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

  clear() {
    for (const [, view] of this.views) {
      view.dead = true;
      this.scene.remove(view.group);
    }
    this.views.clear();
    for (const pop of this.pops) this.scene.remove(pop.group);
    this.pops = [];
    for (const [, mesh] of this.shotViews) this.scene.remove(mesh);
    this.shotViews.clear();
  }

  tick(dtMs) {
    this.pops = this.pops.filter((pop) => {
      pop.ageMs += dtMs;
      const t = pop.ageMs / pop.maxMs;
      if (t >= 1) {
        this.scene.remove(pop.group);
        return false;
      }
      if (pop.mixer) pop.mixer.update(dtMs / 1000);
      if (pop.scalePop) pop.group.scale.setScalar(1 + t * 0.8);
      // Fade out in the back half.
      const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      for (const m of pop.mats) m.opacity = fade;
      return true;
    });
  }
}
