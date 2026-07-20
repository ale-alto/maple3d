// Plain-DOM job advancement panel (M13). Opened at Instructor Vey in
// town. Shows the requirements; the advance button calls the pure sim.

import { JOB_ADV_LEVEL, JOB_ADV_DEX } from '../core/constants.js';
import { tryAdvanceJob } from '../sim/skills.js';
import { mulberry32 } from '../sim/rng.js';

// Advancement pool roll: seeded per boot (deterministic for specs).
const advRand = mulberry32(5150);

export function createJobPanel(gameState, eventBus) {
  const panel = document.createElement('div');
  panel.id = 'job-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="job-title">Instructor Vey<button id="job-close">×</button></div>
    <div id="job-text"></div>
    <button id="job-advance">Advance to Rogue</button>
  `;
  document.body.appendChild(panel);

  const text = panel.querySelector('#job-text');
  const btn = panel.querySelector('#job-advance');

  function render() {
    const p = gameState.player;
    if (p.job !== 'beginner') {
      text.textContent = 'You walk the rogue’s path. Train hard.';
      btn.style.display = 'none';
      return;
    }
    btn.style.display = 'block';
    const needs = [];
    if (p.level < JOB_ADV_LEVEL) needs.push(`level ${JOB_ADV_LEVEL} (you: ${p.level})`);
    if (p.stats.dex < JOB_ADV_DEX) needs.push(`DEX ${JOB_ADV_DEX} (you: ${p.stats.dex})`);
    text.textContent = needs.length
      ? `Come back at ${needs.join(' and ')}.`
      : 'You are ready. Take the rogue’s path?';
  }

  btn.addEventListener('click', () => {
    if (tryAdvanceJob(gameState.player, advRand, eventBus)) render();
  });
  panel.querySelector('#job-close').addEventListener('click', () => close());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  function open() {
    render();
    panel.style.display = 'block';
  }
  function close() {
    panel.style.display = 'none';
  }

  return { open, close };
}
