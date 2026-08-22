/**
 * Procedural audio (Tone.js). One distinct impact per attack class —
 * gate G2.2 says an attack must be identifiable from hit-stop + sound alone,
 * so these are separated by timbre, register AND envelope, not just pitch.
 */
import * as Tone from 'tone';
import { TUNING } from './tuning.js';

export class AudioSystem {
  constructor() {
    this.ready = false;
    this.lastAt = Object.create(null);
    this.muted = false;
  }

  async start() {
    if (this.ready) return;
    await Tone.start();
    this.buildGraph();
  }

  /**
   * Build the synth graph on whatever Tone context is current. Split out from
   * start() so the offline renderer (tools/exportaudio) can stand up an
   * identical graph inside Tone.Offline and bounce each sound to a file.
   */
  buildGraph() {
    const limiter = new Tone.Limiter(-1).toDestination();
    this.out = new Tone.Gain(1).connect(limiter);
    Tone.getDestination().volume.value = TUNING.audio.masterVolume;

    // --- taiko body: the weight under every impact ---
    this.taiko = new Tone.MembraneSynth({
      pitchDecay: 0.09, octaves: 5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.42, sustain: 0, release: 0.08 },
    }).connect(this.out);
    this.taiko.volume.value = -2;

    // --- shamisen pluck: the bite / attack transient ---
    this.pluck = new Tone.PluckSynth({
      attackNoise: 2, dampening: 3800, resonance: 0.86,
    }).connect(this.out);
    this.pluck.volume.value = -6;

    // --- koto: pitched motion cues (launcher rises, death falls) ---
    this.koto = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.35, sustain: 0.04, release: 0.4 },
    }).connect(this.out);
    this.koto.volume.value = -12;

    // --- brush/whoosh: bandpassed pink noise ---
    this.whooshFilter = new Tone.Filter({ type: 'bandpass', frequency: 1200, Q: 1.4 }).connect(this.out);
    this.whoosh = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.012, decay: 0.13, sustain: 0 },
    }).connect(this.whooshFilter);
    this.whoosh.volume.value = TUNING.audio.whiffVolume;

    // --- crack: hi-passed white noise, very short. wood-on-bone ---
    this.crackFilter = new Tone.Filter({ type: 'highpass', frequency: 2400 }).connect(this.out);
    this.crack = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.055, sustain: 0 },
    }).connect(this.crackFilter);
    this.crack.volume.value = -10;

    // --- splat: brown noise, low, wet ---
    this.splatFilter = new Tone.Filter({ type: 'lowpass', frequency: 700 }).connect(this.out);
    this.splat = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.002, decay: 0.34, sustain: 0 },
    }).connect(this.splatFilter);
    this.splat.volume.value = -6;

    // --- parry: metallic FM ping. Nothing else in the mix sounds like it ---
    this.ping = new Tone.FMSynth({
      harmonicity: 5.1, modulationIndex: 18,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.30, sustain: 0, release: 0.2 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0 },
    }).connect(this.out);
    this.ping.volume.value = -8;

    // --- enemy telegraph drone ---
    this.drone = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.35, decay: 0.1, sustain: 0.5, release: 0.12 },
    }).connect(this.out);
    this.drone.volume.value = -24;

    this.ready = true;
    return this;
  }

  /** Avoid Tone throwing on identical scheduling times for one voice. */
  when(key) {
    const now = Tone.now();
    const last = this.lastAt[key] || 0;
    const t = Math.max(now, last + TUNING.audio.minRetrigger);
    this.lastAt[key] = t;
    return t;
  }

  safe(fn) {
    if (!this.ready || this.muted) return;
    try { fn(); } catch (e) { /* voice collision — drop the sound, never the frame */ }
  }

  /** Swing-through-air, per attack. Pitch separates the string steps. */
  whiff(pitch = 1) {
    this.safe(() => {
      this.whooshFilter.frequency.setValueAtTime(700 * pitch + 250, Tone.now());
      this.whoosh.triggerAttackRelease(0.14 / Math.max(0.5, pitch), this.when('whoosh'));
    });
  }

  /**
   * One signature per attack class.
   * Keep these audibly separable — G2.2 is a blindfold test.
   */
  impact(kind) {
    this.safe(() => {
      switch (kind) {
        case 'light1':
          this.taiko.triggerAttackRelease('A1', '32n', this.when('taiko'));
          this.pluck.triggerAttackRelease('A3', 0.12, this.when('pluck'));
          this.crackFilter.frequency.setValueAtTime(3600, Tone.now());
          this.crack.triggerAttackRelease(0.04, this.when('crack'));
          break;
        case 'light2':
          this.taiko.triggerAttackRelease('C2', '32n', this.when('taiko'));
          this.pluck.triggerAttackRelease('D4', 0.12, this.when('pluck'));
          this.crackFilter.frequency.setValueAtTime(4400, Tone.now());
          this.crack.triggerAttackRelease(0.04, this.when('crack'));
          break;
        case 'light3':
        case 'heavy': {
          // low, long, with a wood crack on top. unmistakably the finisher.
          const t = this.when('taiko');
          this.taiko.triggerAttackRelease('D0', '2n', t);
          this.crackFilter.frequency.setValueAtTime(1500, Tone.now());
          this.crack.triggerAttackRelease(0.14, this.when('crack'));
          this.koto.triggerAttackRelease(['D2', 'A2'], 0.5, this.when('koto'));
          this.splatFilter.frequency.setValueAtTime(500, Tone.now());
          this.splat.triggerAttackRelease(0.22, this.when('splat'));
          break;
        }
        case 'launcher': {
          // rising figure = "up"
          const t = this.when('koto');
          this.taiko.triggerAttackRelease('G1', '16n', this.when('taiko'));
          this.koto.triggerAttackRelease('D3', 0.16, t);
          this.koto.triggerAttackRelease('A3', 0.16, t + 0.055);
          this.koto.triggerAttackRelease('D4', 0.3, t + 0.11);
          break;
        }
        case 'airLight':
          this.pluck.triggerAttackRelease('A4', 0.1, this.when('pluck'));
          this.crackFilter.frequency.setValueAtTime(5200, Tone.now());
          this.crack.triggerAttackRelease(0.03, this.when('crack'));
          break;
        case 'airLight3':
          this.taiko.triggerAttackRelease('E2', '16n', this.when('taiko'));
          this.pluck.triggerAttackRelease('E4', 0.14, this.when('pluck'));
          this.koto.triggerAttackRelease(['E3', 'B3'], 0.22, this.when('koto'));
          break;
        case 'dive': {
          // the biggest thing in the mix. sub boom + wet burst.
          const t = this.when('taiko');
          this.taiko.triggerAttackRelease('C0', '1n', t);
          this.splatFilter.frequency.setValueAtTime(340, Tone.now());
          this.splat.triggerAttackRelease(0.5, this.when('splat'));
          this.crackFilter.frequency.setValueAtTime(1100, Tone.now());
          this.crack.triggerAttackRelease(0.2, this.when('crack'));
          this.koto.triggerAttackRelease(['C2', 'G2', 'C3'], 0.6, this.when('koto'));
          break;
        }
        case 'parry': {
          const t = this.when('ping');
          this.ping.triggerAttackRelease('A5', 0.32, t);
          this.ping.triggerAttackRelease('E6', 0.22, t + 0.03);
          this.crackFilter.frequency.setValueAtTime(6000, Tone.now());
          this.crack.triggerAttackRelease(0.05, this.when('crack'));
          break;
        }
        case 'wallSplat': {
          this.taiko.triggerAttackRelease('F0', '2n', this.when('taiko'));
          this.splatFilter.frequency.setValueAtTime(420, Tone.now());
          this.splat.triggerAttackRelease(0.42, this.when('splat'));
          this.crackFilter.frequency.setValueAtTime(1800, Tone.now());
          this.crack.triggerAttackRelease(0.11, this.when('crack'));
          break;
        }
        case 'groundBounce':
          this.taiko.triggerAttackRelease('G0', '4n', this.when('taiko'));
          this.splatFilter.frequency.setValueAtTime(600, Tone.now());
          this.splat.triggerAttackRelease(0.2, this.when('splat'));
          break;
        case 'death': {
          const t = this.when('koto');
          this.splatFilter.frequency.setValueAtTime(800, Tone.now());
          this.splat.triggerAttackRelease(0.6, this.when('splat'));
          this.koto.triggerAttackRelease('A3', 0.2, t);
          this.koto.triggerAttackRelease('F3', 0.2, t + 0.09);
          this.koto.triggerAttackRelease('D3', 0.6, t + 0.18);
          break;
        }
        case 'playerHurt':
          this.taiko.triggerAttackRelease('E1', '8n', this.when('taiko'));
          this.splatFilter.frequency.setValueAtTime(900, Tone.now());
          this.splat.triggerAttackRelease(0.25, this.when('splat'));
          break;
      }
    });
  }

  dash() {
    this.safe(() => {
      this.whooshFilter.frequency.setValueAtTime(2200, Tone.now());
      this.whoosh.triggerAttackRelease(0.2, this.when('whoosh'));
    });
  }

  land() {
    this.safe(() => {
      this.taiko.triggerAttackRelease('C1', '16n', this.when('taiko'));
    });
  }

  /** Rising drone across the oni's windup — the telegraph you can hear. */
  enemyWindup(duration) {
    this.safe(() => {
      const t = this.when('drone');
      this.drone.triggerAttackRelease('C2', duration * 0.9, t);
      this.drone.frequency.setValueAtTime(65, t);
      this.drone.frequency.linearRampToValueAtTime(112, t + duration * 0.9);
    });
  }

  enemySwing() {
    this.safe(() => {
      this.whooshFilter.frequency.setValueAtTime(450, Tone.now());
      this.whoosh.triggerAttackRelease(0.22, this.when('whoosh'));
    });
  }
}

export const Audio = new AudioSystem();
