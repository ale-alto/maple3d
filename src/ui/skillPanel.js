// Plain-DOM skill panel (M11). K toggles; shows SP and both assassin
// skills with + buttons to spend points. Classic SKILLS window styling.

import { SKILLS } from '../core/constants.js';
import { assignSkillPoint } from '../sim/skills.js';

export function createSkillPanel(gameState, eventBus) {
  const panel = document.createElement('div');
  panel.id = 'skill-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="skill-title">Skills<button id="skill-close">×</button></div>
    <div class="skill-sp-row">Skill points: <span id="skill-sp">0</span></div>
    ${Object.entries(SKILLS)
      .map(
        ([id, def]) => `
      <div class="skill-row" data-skill="${id}">
        <div class="skill-info">
          <span class="skill-name">${def.name}</span>
          <span class="skill-desc">${def.desc}</span>
        </div>
        <span class="skill-level" data-skill="${id}">0/${def.maxLevel}</span>
        <button class="skill-add" data-skill="${id}" title="Spend 1 SP">+</button>
      </div>`,
      )
      .join('')}
  `;
  document.body.appendChild(panel);

  function render() {
    const p = gameState.player;
    panel.querySelector('#skill-sp').textContent =
      p.job === 'beginner' ? 'advance to Rogue first' : p.sp;
    for (const [id, def] of Object.entries(SKILLS)) {
      panel.querySelector(`.skill-level[data-skill="${id}"]`).textContent =
        `${p.skills[id] ?? 0}/${def.maxLevel}`;
      const btn = panel.querySelector(`.skill-add[data-skill="${id}"]`);
      const prereqMet = !def.prereq || (p.skills[def.prereq[0]] ?? 0) >= def.prereq[1];
      btn.disabled =
        p.job === 'beginner' || p.sp <= 0 || !prereqMet || (p.skills[id] ?? 0) >= def.maxLevel;
      btn.title = prereqMet ? 'Spend 1 SP' : `Needs ${SKILLS[def.prereq[0]].name} ${def.prereq[1]}`;
    }
  }

  for (const btn of panel.querySelectorAll('.skill-add')) {
    btn.addEventListener('click', () => {
      assignSkillPoint(gameState.player, btn.dataset.skill, eventBus);
      render();
    });
  }
  panel.querySelector('#skill-close').addEventListener('click', () => toggle(false));

  function toggle(force) {
    const show = force ?? panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show) render();
  }

  window.addEventListener('keydown', (e) => {
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (!typing && (e.key === 'k' || e.key === 'K')) toggle();
  });

  eventBus.on('player:levelup', () => {
    if (panel.style.display !== 'none') render();
  });
  eventBus.on('job:advanced', () => {
    if (panel.style.display !== 'none') render();
  });

  return { toggle, render };
}
