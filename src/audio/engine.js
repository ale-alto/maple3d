// Web Audio engine (M07): per-map BGM + eventBus-driven SFX. Zero deps.
// The AudioContext is created lazily on the first user gesture (browser
// autoplay rules) and everything no-ops gracefully without one — SFX
// dispatch is still RECORDED so headless verification works; audibility
// is the user-playtest AC.
//
// BGM slots: public/audio/<mapId>.mp3 is used when present (drop Suno
// tracks there); otherwise a light procedural loop plays per map mood.

import { AUDIO_MASTER_VOL, AUDIO_BGM_VOL, AUDIO_SFX_VOL, SFX_LOG_SIZE } from '../core/constants.js';

// Per-map procedural moods: [tempo bpm, scale semitones from root, root hz]
const MOODS = {
  town: { bpm: 84, notes: [0, 4, 7, 12, 7, 4], root: 220, wave: 'triangle' },
  field1: { bpm: 108, notes: [0, 7, 4, 12, 9, 7], root: 262, wave: 'triangle' },
  field2: { bpm: 116, notes: [0, 3, 7, 10, 7, 3], root: 233, wave: 'sawtooth' },
};

export function createAudioEngine(eventBus) {
  let ctx = null;
  let master = null;
  let bgmBus = null;
  let sfxBus = null;
  let muted = false;
  let bgm = null; // current track id (mapId)
  let bgmStop = null; // stops the current bgm (fn)
  const lastSfx = []; // ring buffer of dispatched sfx names

  function ensureContext() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : AUDIO_MASTER_VOL;
      master.connect(ctx.destination);
      bgmBus = ctx.createGain();
      bgmBus.gain.value = AUDIO_BGM_VOL;
      bgmBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = AUDIO_SFX_VOL;
      sfxBus.connect(master);
      if (bgm) startBgm(bgm); // a track was requested before the gesture
      return true;
    } catch {
      return false;
    }
  }

  // Unlock on first gesture (autoplay policy).
  const unlock = () => {
    if (ensureContext() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  function record(name) {
    lastSfx.push(name);
    if (lastSfx.length > SFX_LOG_SIZE) lastSfx.shift();
  }

  // --- SFX synthesis (short envelopes on the sfx bus) ---
  function tone({ freq = 440, freqEnd, wave = 'sine', dur = 0.12, vol = 0.5, delay = 0 }) {
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.08, vol = 0.3, freq = 2000, delay = 0 }) {
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(sfxBus);
    src.start(t0);
  }

  const SFX = {
    throw: () => noise({ dur: 0.07, vol: 0.35, freq: 3600 }),
    hit: () => tone({ freq: 220, freqEnd: 90, wave: 'square', dur: 0.09, vol: 0.4 }),
    pop: () => {
      tone({ freq: 500, freqEnd: 120, wave: 'square', dur: 0.16, vol: 0.45 });
      noise({ dur: 0.1, vol: 0.2, freq: 1200 });
    },
    loot: () => {
      tone({ freq: 1320, dur: 0.07, vol: 0.35 });
      tone({ freq: 1760, dur: 0.12, vol: 0.35, delay: 0.07 });
    },
    potion: () => {
      tone({ freq: 300, freqEnd: 180, dur: 0.08, vol: 0.35 });
      tone({ freq: 260, freqEnd: 150, dur: 0.09, vol: 0.35, delay: 0.09 });
    },
    levelup: () => {
      // The important one: rising major fanfare + sparkle.
      const root = 523.25; // C5
      [0, 4, 7, 12].forEach((semi, i) =>
        tone({ freq: root * 2 ** (semi / 12), wave: 'triangle', dur: 0.32, vol: 0.4, delay: i * 0.09 }),
      );
      tone({ freq: root * 2 ** (16 / 12), wave: 'triangle', dur: 0.55, vol: 0.45, delay: 0.36 });
      noise({ dur: 0.4, vol: 0.12, freq: 6000, delay: 0.36 });
    },
    ouch: () => tone({ freq: 160, freqEnd: 70, wave: 'sawtooth', dur: 0.13, vol: 0.4 }),
    portal: () => {
      noise({ dur: 0.35, vol: 0.3, freq: 900 });
      tone({ freq: 300, freqEnd: 900, dur: 0.3, vol: 0.2 });
    },
  };

  function play(name) {
    record(name);
    if (muted) return;
    SFX[name]?.();
  }

  // --- BGM: file drop-in first, procedural loop otherwise ---
  async function startBgm(mapId) {
    stopBgm();
    if (!ctx) return; // will start after the unlock gesture
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2); // fade in
    gain.connect(bgmBus);

    let stopped = false;
    let timer = null;
    let fileSrc = null;

    try {
      const res = await fetch(`/audio/${mapId}.mp3`);
      if (res.ok && res.headers.get('content-type')?.includes('audio')) {
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        if (stopped) return;
        fileSrc = ctx.createBufferSource();
        fileSrc.buffer = buf;
        fileSrc.loop = true;
        fileSrc.connect(gain);
        fileSrc.start();
      }
    } catch {
      /* no file: procedural below */
    }

    if (!fileSrc) {
      // Light procedural loop: gentle arpeggio in the map's mood.
      const mood = MOODS[mapId] ?? MOODS.field1;
      const beat = 60 / mood.bpm;
      let step = 0;
      const tick = () => {
        if (stopped || !ctx || ctx.state !== 'running') return;
        const semi = mood.notes[step % mood.notes.length];
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = mood.wave;
        osc.frequency.value = mood.root * 2 ** (semi / 12);
        g.gain.setValueAtTime(0.16, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + beat * 0.9);
        osc.connect(g).connect(gain);
        osc.start(t0);
        osc.stop(t0 + beat);
        step += 1;
      };
      timer = setInterval(tick, beat * 1000);
      tick();
    }

    bgmStop = () => {
      stopped = true;
      if (timer) clearInterval(timer);
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        fileSrc?.stop(ctx.currentTime + 0.45);
      } catch {
        /* context torn down */
      }
      setTimeout(() => gain.disconnect(), 600);
    };
  }

  function stopBgm() {
    if (bgmStop) {
      bgmStop();
      bgmStop = null;
    }
  }

  // --- Event wiring ---
  eventBus.on('player:attacked', () => play('throw'));
  eventBus.on('mob:hit', () => play('hit'));
  eventBus.on('mob:died', () => play('pop'));
  eventBus.on('loot:picked', () => play('loot'));
  eventBus.on('potion:used', () => play('potion'));
  eventBus.on('player:levelup', () => play('levelup'));
  eventBus.on('player:hit', () => play('ouch'));

  return {
    setBgm(mapId) {
      if (bgm === mapId) return;
      const isTransition = bgm !== null;
      bgm = mapId;
      if (isTransition) play('portal'); // no whoosh on boot
      startBgm(mapId);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : AUDIO_MASTER_VOL;
      return muted;
    },
    state() {
      return { muted, bgm, lastSfx: [...lastSfx] };
    },
  };
}
