import * as THREE from 'three';
import { CharacterView } from './characterView.js';

// Remote players: the same chibi placeholder as the local character, plus
// a name tag and a chat bubble. Positions lerp toward the 10Hz presence
// updates so movement reads smooth.

const LERP = 0.25;

function makeTextSprite(text, { font = 'bold 26px sans-serif', pad = 10, bg = null, fg = '#ffffff' } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = 40 + pad;
  canvas.width = w;
  canvas.height = h;
  const c2 = canvas.getContext('2d');
  if (bg) {
    c2.fillStyle = bg;
    c2.beginPath();
    c2.roundRect(0, 0, w, h, 10);
    c2.fill();
  }
  c2.font = font;
  c2.textAlign = 'center';
  c2.textBaseline = 'middle';
  c2.fillStyle = fg;
  c2.fillText(text, w / 2, h / 2);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }),
  );
  sprite.scale.set(w / 90, h / 90, 1);
  return sprite;
}

function disposeSprite(scene, sprite) {
  scene.remove(sprite);
  sprite.material.map.dispose();
  sprite.material.dispose();
}

export class RemotePlayersView {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // id -> {char, tag, bubble, bubbleText, dispX, dispY}
    this.ownBubbleSprite = null;
    this.ownBubbleText = null;
  }

  sync(list, freshChat) {
    const seen = new Set();
    for (const r of list) {
      seen.add(r.id);
      let v = this.views.get(r.id);
      if (!v) {
        v = {
          char: new CharacterView(this.scene),
          tag: makeTextSprite(r.name, { bg: 'rgba(20,24,38,0.75)' }),
          bubble: null,
          bubbleText: null,
          dispX: r.x,
          dispY: r.y,
        };
        this.scene.add(v.tag);
        this.views.set(r.id, v);
      }
      v.dispX += (r.x - v.dispX) * LERP;
      v.dispY += (r.y - v.dispY) * LERP;
      v.char.update({
        x: v.dispX,
        y: v.dispY,
        facing: r.facing,
        grounded: r.state !== 'jump' && r.state !== 'fall',
        climbing: r.state === 'ladder' || r.state === 'rope',
      });
      v.tag.position.set(v.dispX, v.dispY + 1.85, 0.4);

      const chat = freshChat(r);
      if (chat !== v.bubbleText) {
        if (v.bubble) disposeSprite(this.scene, v.bubble);
        v.bubble = chat
          ? makeTextSprite(chat, { bg: 'rgba(255,255,255,0.92)', fg: '#20242e' })
          : null;
        v.bubbleText = chat;
        if (v.bubble) this.scene.add(v.bubble);
      }
      if (v.bubble) v.bubble.position.set(v.dispX, v.dispY + 2.45, 0.5);
    }

    for (const [id, v] of this.views) {
      if (!seen.has(id)) this.removeView(id, v);
    }
  }

  // The local player's own bubble (myChat: {text, ms} | null).
  ownBubble(player, myChat, showMs) {
    const text = myChat && Date.now() - myChat.ms < showMs ? myChat.text : null;
    if (text !== this.ownBubbleText) {
      if (this.ownBubbleSprite) disposeSprite(this.scene, this.ownBubbleSprite);
      this.ownBubbleSprite = text
        ? makeTextSprite(text, { bg: 'rgba(255,255,255,0.92)', fg: '#20242e' })
        : null;
      this.ownBubbleText = text;
      if (this.ownBubbleSprite) this.scene.add(this.ownBubbleSprite);
    }
    if (this.ownBubbleSprite) this.ownBubbleSprite.position.set(player.x, player.y + 2.45, 0.5);
  }

  removeView(id, v) {
    this.scene.remove(v.char.group);
    disposeSprite(this.scene, v.tag);
    if (v.bubble) disposeSprite(this.scene, v.bubble);
    this.views.delete(id);
  }

  clear() {
    for (const [id, v] of [...this.views]) this.removeView(id, v);
    if (this.ownBubbleSprite) {
      disposeSprite(this.scene, this.ownBubbleSprite);
      this.ownBubbleSprite = null;
      this.ownBubbleText = null;
    }
  }
}
