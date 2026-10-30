import { TRACKS, DRUMS, SFX } from './music.js';

const LOOKAHEAD = 0.15;
const midiToHz = (n) => 440 * 2 ** ((n - 69) / 12);

// All sound is made on the spot with oscillators. Browsers only allow audio
// after a real key press or tap, so nothing exists until unlock() is called.
export function createSound({ muted = false } = {}) {
  let ctx = null;
  let master = null;
  let noise = null;
  let timer = null;
  let track = null;
  let wanted = null;
  let stepIndex = 0;
  let nextTime = 0;
  let isMuted = muted;

  function tone(wave, f0, f1, length, volume, delay = 0, out = master) {
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, at + length);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  function note(wave, midi, length, volume, at) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(midiToHz(midi), at);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.setValueAtTime(volume, at + length * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  function drum(kind, at) {
    if (kind === 'D') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, at);
      osc.frequency.exponentialRampToValueAtTime(60, at + 0.11);
      gain.gain.setValueAtTime(0.28, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.13);
      osc.connect(gain).connect(master);
      osc.start(at);
      osc.stop(at + 0.15);
    } else {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      src.buffer = noise;
      filter.type = 'highpass';
      filter.frequency.value = 2400;
      gain.gain.setValueAtTime(0.1, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
      src.connect(filter).connect(gain).connect(master);
      src.start(at);
      src.stop(at + 0.06);
    }
  }

  function schedule() {
    if (!ctx || !track || ctx.state !== 'running') return;
    const stepLength = 60 / track.bpm / 2;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const lead = track.lead[stepIndex % track.lead.length];
      const low = track.bass[stepIndex % track.bass.length];
      const hit = DRUMS[stepIndex % DRUMS.length];
      if (lead !== null) note(track.wave, track.root + 12 + lead, stepLength * 0.9, 0.05, nextTime);
      if (low !== null) note('triangle', track.root + low, stepLength * 0.95, 0.13, nextTime);
      if (hit) drum(hit, nextTime);
      stepIndex++;
      nextTime += stepLength;
    }
  }

  function start(name) {
    track = TRACKS[name];
    stepIndex = 0;
    nextTime = ctx.currentTime + 0.05;
  }

  return {
    get unlocked() { return !!ctx; },
    get muted() { return isMuted; },

    unlock() {
      if (ctx) {
        ctx.resume?.();
        return;
      }
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = isMuted ? 0 : 0.8;
      master.connect(ctx.destination);
      const length = ctx.sampleRate / 4;
      noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      timer = setInterval(schedule, 40);
      if (wanted) start(wanted);
    },

    play(name) {
      if (!ctx || isMuted || !SFX[name]) return;
      for (const [wave, f0, f1, length, volume, delay = 0] of SFX[name]) tone(wave, f0, f1, length, volume, delay);
    },

    music(name) {
      if (wanted === name) return;
      wanted = name;
      if (ctx) start(name);
    },

    stopMusic() {
      wanted = null;
      track = null;
    },

    setMuted(value) {
      isMuted = value;
      if (master) master.gain.value = value ? 0 : 0.8;
    },

    // Paused means quiet: the clock stops too, so the tune picks up where it was.
    pause() { ctx?.suspend?.(); },
    resume() {
      ctx?.resume?.();
      if (ctx) nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
    },

    stopTimer() { clearInterval(timer); },
  };
}
