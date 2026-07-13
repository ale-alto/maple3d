import * as THREE from 'three';
import {
  SKY_COLOR,
  GROUND_COLOR,
  PLACEHOLDER_COLOR,
  CAMERA_FOV,
  CAMERA_Z,
  CAMERA_HEIGHT,
} from '../core/constants.js';

// Scaffold boot scene: side-view camera looking at a grassy strip and one
// placeholder chibi-proportioned capsule where the player will stand.
// Everything here is throwaway until M01 establishes the real map format.

export function createBootScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_Z);
  camera.lookAt(0, 1, 0);

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 8, 6);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.9));

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 8),
    new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
  );
  ground.position.y = -0.5;
  scene.add(ground);

  const placeholder = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 0.6, 8, 16),
    new THREE.MeshLambertMaterial({ color: PLACEHOLDER_COLOR }),
  );
  placeholder.position.y = 1.1;
  scene.add(placeholder);

  // Called every frame: a hidden tab reports 0x0 at load and fires no
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

  return { renderer, scene, camera, placeholder, syncSize };
}
