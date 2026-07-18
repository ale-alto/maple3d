import * as THREE from 'three';
import {
  PLAYER_BODY_COLOR,
  PLAYER_HEAD_COLOR,
  MODEL_DEFS,
  MODEL_YAW_TILT,
} from '../core/constants.js';
import { loadCharacter } from './assetLoader.js';

// CharacterView abstraction (ADR-0002): position/facing/animation-state in,
// visuals out. Boots as a primitive chibi placeholder and upgrades itself
// to a rigged KayKit GLB when the model resolves — sim and game logic
// never know the difference. `currentClip` is 'primitive' until then.

export class CharacterView {
  constructor(scene, kind = 'player') {
    this.group = new THREE.Group();
    this.def = MODEL_DEFS[kind] ?? MODEL_DEFS.player;
    this.mixer = null;
    this.actions = new Map();
    this.active = null;
    this.currentClip = 'primitive';
    this.oneShotUntil = 0; // ms timestamp gate for throw overlays

    // Instant-on primitive (also the ?nomodels / missing-file fallback).
    this.primitive = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.35, 8, 16),
      new THREE.MeshLambertMaterial({ color: PLAYER_BODY_COLOR }),
    );
    body.position.y = 0.55;
    this.primitive.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshLambertMaterial({ color: PLAYER_HEAD_COLOR }),
    );
    head.position.y = 1.25;
    this.primitive.add(head);
    this.group.add(this.primitive);
    scene.add(this.group);

    loadCharacter(this.def.file).then((res) => {
      if (!res || this.disposed) return;
      const { model, clips } = res;
      // Scale to target height, feet on y=0.
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const s = this.def.height / (size.y || 1);
      model.scale.setScalar(s);
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y = -box2.min.y;

      this.mixer = new THREE.AnimationMixer(model);
      for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
      this.group.remove(this.primitive);
      this.model = model;
      this.group.add(model);
      this.fadeTo(this.def.clips.idle, 0);
    });
  }

  fadeTo(clipName, fade = 0.15, oneShot = false) {
    if (!this.mixer || this.currentClip === clipName) return;
    const next = this.actions.get(clipName);
    if (!next) return;
    if (this.active) this.active.fadeOut(fade);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    if (oneShot) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
    }
    this.active = next;
    this.currentClip = clipName;
  }

  // state: sim player shape {x, y, facing, state, attackLockMs}
  update(state, dtSec = 0) {
    this.group.position.set(state.x, state.y, 0);

    const dir = state.facing === 'left' ? -1 : 1;
    const climbing = state.state === 'ladder' || state.state === 'rope';
    // Side-view: face the run direction with a slight camera tilt;
    // on a climbable, face away (into the ladder).
    this.group.rotation.y = climbing ? Math.PI : dir * (Math.PI / 2 - MODEL_YAW_TILT);
    this.group.rotation.z = 0;

    if (this.mixer) {
      const clips = this.def.clips;
      const now = performance.now();
      if ((state.attackLockMs ?? 0) > 0 && clips.throw && state.state !== 'ladder' && state.state !== 'rope') {
        if (now > this.oneShotUntil) {
          this.currentClip = null; // allow re-trigger of the same clip
          this.fadeTo(clips.throw, 0.05, true);
          this.oneShotUntil = now + 400;
        }
      } else {
        const clip = clips[state.state] ?? clips.idle;
        this.fadeTo(clip);
      }
      if (dtSec > 0) this.mixer.update(dtSec);
    } else {
      // Primitive placeholder: the old lean-while-airborne tell.
      this.group.rotation.y = state.facing === 'left' ? Math.PI : 0;
      this.group.rotation.z = state.grounded || state.climbing ? 0 : 0.08;
    }
  }
}
