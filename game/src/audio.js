// Ridge Runner — WebAudio sound engine.
//
// Every sound is synthesised: no audio files, no network. The engine drone
// follows the throttle, wind follows speed, and events chime, thud or sing.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.windSource = null;
    this.windGain = null;
    this.windFilter = null;
    this.muted = false;
    this.started = false;
  }

  // Call from the first user gesture (Enter / click): browsers block audio
  // until the page has been interacted with.
  ensure() {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
    } catch (err) {
      // Headless or blocked audio: the game plays silent, never crashes.
      this.ctx = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.buildEngine();
    this.buildWind();
    this.started = true;
  }

  buildEngine() {
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 52;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 104;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.engineOsc2.start();
  }

  buildWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 480;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0;
    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    this.windSource.start();
  }

  // Called every frame while flying: drone and wind follow the plane.
  update(throttle, speedNorm, airborne) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const engineLevel = airborne ? 0.05 + throttle * 0.11 : 0.02 + throttle * 0.05;
    this.engineGain.gain.setTargetAtTime(engineLevel, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(48 + throttle * 66, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(96 + throttle * 132, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(280 + throttle * 700, t, 0.1);
    this.windGain.gain.setTargetAtTime(airborne ? speedNorm * 0.05 : 0.0, t, 0.2);
    this.windFilter.frequency.setTargetAtTime(380 + speedNorm * 500, t, 0.2);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0.0 : 0.5;
  }

  tone(freq, dur, type, level, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(level, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A bright two-note chime for threading a ring.
  ring() {
    this.tone(880, 0.22, 'sine', 0.22);
    this.tone(1318, 0.34, 'sine', 0.18, 0.09);
  }

  // A soft pluck for a supply crate.
  crate() {
    this.tone(660, 0.14, 'triangle', 0.2);
    this.tone(990, 0.2, 'triangle', 0.16, 0.07);
  }

  // Low warning beep: fuel or damage.
  warning() {
    this.tone(220, 0.16, 'square', 0.12);
    this.tone(220, 0.16, 'square', 0.12, 0.2);
  }

  // A thud plus noise burst for a hard hit.
  crash() {
    this.tone(90, 0.5, 'sawtooth', 0.3, 0, 40);
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const len = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  // A rising three-note fanfare for a landing and a mission done.
  fanfare() {
    this.tone(523, 0.18, 'triangle', 0.2);
    this.tone(659, 0.18, 'triangle', 0.2, 0.14);
    this.tone(784, 0.42, 'triangle', 0.22, 0.28);
  }

  // A short click for menus.
  click() {
    this.tone(1200, 0.05, 'sine', 0.1);
  }
}
