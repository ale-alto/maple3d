// Sound settings (M07 UX): speaker button top-right toggling a small
// panel — mute + BGM/SFX volume sliders. Plain DOM per tech.md.

export function createAudioSettings(audio) {
  const btn = document.createElement('button');
  btn.id = 'audio-btn';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'audio-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="audio-title">Sound</div>
    <button id="audio-mute"></button>
    <label class="audio-row">BGM
      <input id="audio-bgm-vol" type="range" min="0" max="100" step="1" />
    </label>
    <label class="audio-row">SFX
      <input id="audio-sfx-vol" type="range" min="0" max="100" step="1" />
    </label>
    <div class="audio-hint">M also toggles mute</div>
  `;
  document.body.appendChild(panel);

  const muteBtn = panel.querySelector('#audio-mute');
  const bgmSlider = panel.querySelector('#audio-bgm-vol');
  const sfxSlider = panel.querySelector('#audio-sfx-vol');

  function refresh() {
    const s = audio.state();
    btn.textContent = s.muted ? '🔇' : '🔊';
    muteBtn.textContent = s.muted ? 'Unmute' : 'Mute';
    bgmSlider.value = String(Math.round(s.bgmVol * 100));
    sfxSlider.value = String(Math.round(s.sfxVol * 100));
  }

  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    refresh();
    btn.blur(); // don't leave a focused button eating Space/Enter
  });
  muteBtn.addEventListener('click', () => {
    audio.toggleMute();
    refresh();
  });
  bgmSlider.addEventListener('input', () => audio.setBgmVolume(Number(bgmSlider.value) / 100));
  sfxSlider.addEventListener('input', () => audio.setSfxVolume(Number(sfxSlider.value) / 100));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') panel.style.display = 'none';
  });

  refresh();
  return { refresh };
}
