// Web Audio engine (M07): per-map BGM + eventBus-driven SFX. Zero deps.
// The AudioContext is created lazily on the first user gesture (browser
// autoplay rules) and everything no-ops gracefully without one — SFX
// dispatch is still RECORDED so headless verification works; audibility
// is the user-playtest AC.
//
// BGM slots: public/audio/<mapId>.mp3 is used when present (drop Suno
// tracks there); otherwise a light procedural loop plays per map mood.

import { AUDIO_MASTER_VOL, AUDIO_BGM_VOL, AUDIO_SFX_VOL, SFX_LOG_SIZE } from '../core/constants.js';

// Per-map procedural moods (placeholder tier until Suno drop-ins): a
// three-voice arrangement — pad chords, music-box melody, soft bass —
// instead of chiptune arpeggios. Chords/melody are semitone offsets from
// root; melody null = rest.
const MOODS = {
  town: {
    bpm: 72,
    root: 174.61, // F3 — warm
    chords: [
      [0, 4, 7], // I
      [-3, 0, 4], // vi
      [5, 9, 12], // IV
      [7, 11, 14], // V
    ],
    melody: [12, null, 16, 14, 12, null, 9, null, 7, 9, 12, null, 14, null, 12, null],
  },
  field1: {
    bpm: 96,
    root: 261.63, // C4 — bright
    chords: [
      [0, 4, 7],
      [7, 11, 14],
      [-3, 0, 4],
      [5, 9, 12],
    ],
    melody: [12, 14, 16, null, 19, 16, 14, 12, null, 11, 12, 14, null, 16, null, 12],
  },
  field2: {
    bpm: 104,
    root: 220, // A3 minor — deeper field
    chords: [
      [0, 3, 7], // i
      [-4, 0, 3], // VI
      [3, 7, 10], // III
      [-2, 2, 5], // VII
    ],
    melody: [12, null, 15, 12, 10, null, 7, null, 8, 10, 12, null, 15, null, 10, null],
  },
};

const PREFS_KEY = 'maple3d-audio'; // separate from the save: prefs survive resets

export function createAudioEngine(eventBus) {
  let ctx = null;
  let master = null;
  let bgmBus = null;
  let sfxBus = null;
  let muted = false;
  let bgmVol = AUDIO_BGM_VOL;
  let sfxVol = AUDIO_SFX_VOL;
  let bgm = null; // current track id (mapId)
  let bgmStop = null; // stops the current bgm (fn)
  const lastSfx = []; // ring buffer of dispatched sfx names

  // Restore persisted prefs.
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
    if (prefs) {
      muted = !!prefs.muted;
      if (typeof prefs.bgmVol === 'number') bgmVol = prefs.bgmVol;
      if (typeof prefs.sfxVol === 'number') sfxVol = prefs.sfxVol;
    }
  } catch {
    /* fresh prefs */
  }

  function persistPrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ muted, bgmVol, sfxVol }));
    } catch {
      /* storage blocked */
    }
  }

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
      bgmBus.gain.value = bgmVol;
      bgmBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = sfxVol;
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
    hit: () => {
      // Rounded thud: triangle drop + soft low noise (no square = no chip).
      tone({ freq: 240, freqEnd: 90, wave: 'triangle', dur: 0.1, vol: 0.45 });
      noise({ dur: 0.05, vol: 0.18, freq: 500 });
    },
    pop: () => {
      tone({ freq: 480, freqEnd: 110, wave: 'sine', dur: 0.18, vol: 0.5 });
      noise({ dur: 0.12, vol: 0.22, freq: 1000 });
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
    ouch: () => {
      tone({ freq: 170, freqEnd: 75, wave: 'triangle', dur: 0.13, vol: 0.45 });
      noise({ dur: 0.06, vol: 0.12, freq: 400 });
    },
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
      // Three-voice procedural arrangement (warm, not chiptune): pad
      // chords through a lowpass, a music-box melody, and a soft bass.
      const mood = MOODS[mapId] ?? MOODS.field1;
      const beat = 60 / mood.bpm;
      const half = beat / 2;
      const barBeats = 4;
      const note = (semi) => mood.root * 2 ** (semi / 12);

      // Shared lowpass keeps everything rounded.
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      warm.frequency.value = 2400;
      warm.connect(gain);

      const padVoice = (freq, t0, dur) => {
        // Two slightly detuned triangles per chord tone = soft ensemble pad.
        for (const detune of [-4, 4]) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.05, t0 + dur * 0.25); // slow swell
          g.gain.linearRampToValueAtTime(0.035, t0 + dur * 0.8);
          g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
          osc.connect(g).connect(warm);
          osc.start(t0);
          osc.stop(t0 + dur + 0.05);
        }
      };

      const musicBox = (freq, t0) => {
        // Bell-ish: fundamental + quiet 12th partial, fast attack, long decay.
        for (const [mult, vol] of [
          [1, 0.11],
          [3, 0.02],
        ]) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq * mult;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
          osc.connect(g).connect(warm);
          osc.start(t0);
          osc.stop(t0 + 1.2);
        }
      };

      const bassVoice = (freq, t0, dur) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq / 2;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.09, t0 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g).connect(warm);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      };

      // Schedule one bar at a time, half-beat melody grid.
      let bar = 0;
      const scheduleBar = () => {
        if (stopped || !ctx || ctx.state !== 'running') return;
        const t0 = ctx.currentTime + 0.05;
        const chord = mood.chords[bar % mood.chords.length];
        const barDur = beat * barBeats;
        for (const semi of chord) padVoice(note(semi), t0, barDur);
        bassVoice(note(chord[0]), t0, beat * 1.5);
        bassVoice(note(chord[0]), t0 + beat * 2, beat * 1.5);
        for (let i = 0; i < barBeats * 2; i++) {
          const idx = (bar * barBeats * 2 + i) % mood.melody.length;
          const semi = mood.melody[idx];
          if (semi !== null) musicBox(note(semi), t0 + i * half);
        }
        bar += 1;
      };
      timer = setInterval(scheduleBar, beat * barBeats * 1000);
      scheduleBar();
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
      persistPrefs();
      return muted;
    },
    setBgmVolume(v) {
      bgmVol = Math.max(0, Math.min(1, v));
      if (bgmBus) bgmBus.gain.value = bgmVol;
      persistPrefs();
    },
    setSfxVolume(v) {
      sfxVol = Math.max(0, Math.min(1, v));
      if (sfxBus) sfxBus.gain.value = sfxVol;
      persistPrefs();
    },
    state() {
      return { muted, bgm, bgmVol, sfxVol, lastSfx: [...lastSfx] };
    },
  };
}
