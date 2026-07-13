import * as THREE from 'three';
import { SKY_COLOR, CAMERA_FOV, CAMERA_Z, CAMERA_HEIGHT } from '../core/constants.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_Z);

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 8, 6);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.9));

  // Checked every frame: a hidden tab reports 0x0 at load and fires no
  // resize event, so event-driven resizing alone leaves a blank canvas.
  let sizedW = 0;
  let sizedH = 0;
  function syncSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === 0 || h === 0 || (w === sizedW && h === sizedH)) return;
    sizedW = w;
    sizedH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  syncSize();

  return { renderer, scene, camera, syncSize };
}
