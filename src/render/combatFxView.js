import * as THREE from 'three';
import { STAR_COLOR, DAMAGE_NUMBER_MS } from '../core/constants.js';
import { makeShuriken } from './shuriken.js';

// Stars + floating damage numbers. Numbers are driven off eventBus hits and
// aged in sim time so advanceTime() verification sees them deterministically.

function makeNumberSprite(value, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2a1a08';
  ctx.strokeText(String(value), 64, 32);
  ctx.fillStyle = color;
  ctx.fillText(String(value), 64, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.2, 0.6, 1);
  return sprite;
}

export class CombatFxView {
  constructor(scene, eventBus) {
    this.scene = scene;
    this.starViews = new Map(); // star id -> mesh
    this.numbers = []; // {sprite, x, y, value, ageMs}

    eventBus.on('mob:hit', ({ x, y, amount }) => this.addNumber(x, y + 1.4, amount, '#ffd24d'));
    eventBus.on('player:hit', ({ x, y, amount }) => this.addNumber(x, y + 2.0, amount, '#ff6b6b'));
  }

  addNumber(x, y, value, color) {
    const sprite = makeNumberSprite(value, color);
    sprite.position.set(x, y, 0.5);
    this.scene.add(sprite);
    this.numbers.push({ sprite, x, y, value, ageMs: 0 });
  }

  sync(stars, simTimeMs) {
    const seen = new Set();
    for (const star of stars) {
      seen.add(star.id);
      let mesh = this.starViews.get(star.id);
      if (!mesh) {
        mesh = makeShuriken(0.2, STAR_COLOR);
        this.starViews.set(star.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(star.x, star.y, 0);
      mesh.rotation.z = (simTimeMs / 60) % (Math.PI * 2); // spin
    }
    for (const [id, mesh] of this.starViews) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        mesh.material.dispose(); // geometry is the shared shuriken cache
        this.starViews.delete(id);
      }
    }
  }

  tick(dtMs) {
    this.numbers = this.numbers.filter((n) => {
      n.ageMs += dtMs;
      if (n.ageMs >= DAMAGE_NUMBER_MS) {
        this.scene.remove(n.sprite);
        n.sprite.material.map.dispose();
        n.sprite.material.dispose();
        return false;
      }
      n.sprite.position.y = n.y + (n.ageMs / DAMAGE_NUMBER_MS) * 0.8; // float up
      n.sprite.material.opacity = 1 - (n.ageMs / DAMAGE_NUMBER_MS) ** 2;
      return true;
    });
  }

  // For render_game_to_text.
  numbersPayload() {
    return this.numbers.map((n) => ({
      x: +n.x.toFixed(3),
      y: +n.y.toFixed(3),
      value: n.value,
      ageMs: Math.round(n.ageMs),
    }));
  }
}
