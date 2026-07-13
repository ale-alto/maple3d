import './style.css';
import { FIXED_STEP_MS } from './core/constants.js';
import { createBootScene } from './render/bootScene.js';

const canvas = document.querySelector('#game');
const { renderer, scene, camera, placeholder, syncSize } = createBootScene(canvas);

let simTimeMs = 0;

function step(dtMs) {
  simTimeMs += dtMs;
  // Idle bob so the smoke test proves the loop is live, not a static frame.
  placeholder.position.y = 1.1 + Math.sin(simTimeMs / 400) * 0.08;
  placeholder.rotation.y = simTimeMs / 1500;
}

let lastTime = performance.now();
let accumulator = 0;

renderer.setAnimationLoop((now) => {
  syncSize();
  accumulator += Math.min(now - lastTime, 250);
  lastTime = now;
  while (accumulator >= FIXED_STEP_MS) {
    step(FIXED_STEP_MS);
    accumulator -= FIXED_STEP_MS;
  }
  renderer.render(scene, camera);
});

// Agent hooks (tech.md convention) — present from the scaffold onward.
window.__debug = { renderer, scene, camera };

window.render_game_to_text = () =>
  JSON.stringify({
    phase: 'scaffold-boot',
    simTimeMs: Math.round(simTimeMs),
    placeholder: {
      x: +placeholder.position.x.toFixed(3),
      y: +placeholder.position.y.toFixed(3),
    },
  });

window.advanceTime = (ms) => {
  syncSize();
  const steps = Math.round(ms / FIXED_STEP_MS);
  for (let i = 0; i < steps; i++) step(FIXED_STEP_MS);
  renderer.render(scene, camera);
};
