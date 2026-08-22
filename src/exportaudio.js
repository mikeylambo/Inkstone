/**
 * Dev-only: bounce every procedural sound in the game to a WAV.
 *
 * SUMI has no audio assets — every sound is synthesised at runtime by
 * audio.js. This stands up an identical synth graph inside Tone.Offline,
 * triggers one sound, and renders it to a buffer, so the sounds can be taken
 * into a DAW. Nothing here ships with the game; it is loaded on demand from
 * the console via SUMI.exportAudio().
 */
import * as Tone from 'tone';
import { AudioSystem } from './audio.js';

/** name -> [trigger(sys), seconds] */
export const SOUND_MANIFEST = {
  // --- swing-through-air, one per attack pitch ---
  'whiff/light1': [(a) => a.whiff(1.00), 1.0],
  'whiff/light2': [(a) => a.whiff(1.14), 1.0],
  'whiff/light3': [(a) => a.whiff(0.72), 1.2],
  'whiff/heavy': [(a) => a.whiff(0.64), 1.2],
  'whiff/launcher': [(a) => a.whiff(0.90), 1.0],
  'whiff/stinger': [(a) => a.whiff(0.84), 1.0],
  'whiff/air': [(a) => a.whiff(1.22), 1.0],
  'whiff/dive': [(a) => a.whiff(0.55), 1.4],

  // --- impacts, one signature per attack class ---
  'impact/light1': [(a) => a.impact('light1'), 1.5],
  'impact/light2': [(a) => a.impact('light2'), 1.5],
  'impact/light3_heavy': [(a) => a.impact('light3'), 3.0],
  'impact/launcher': [(a) => a.impact('launcher'), 2.0],
  'impact/air_light': [(a) => a.impact('airLight'), 1.2],
  'impact/air_light3': [(a) => a.impact('airLight3'), 1.5],
  'impact/dive': [(a) => a.impact('dive'), 3.5],
  'impact/parry': [(a) => a.impact('parry'), 2.0],
  'impact/wall_splat': [(a) => a.impact('wallSplat'), 3.0],
  'impact/ground_bounce': [(a) => a.impact('groundBounce'), 2.0],
  'impact/death': [(a) => a.impact('death'), 3.0],
  'impact/player_hurt': [(a) => a.impact('playerHurt'), 1.5],

  // --- movement and enemy cues ---
  'move/dash': [(a) => a.dash(), 1.0],
  'move/land': [(a) => a.land(), 1.0],
  'enemy/windup': [(a) => a.enemyWindup(0.62), 1.4],
  'enemy/swing': [(a) => a.enemySwing(), 1.0],
};

/** Render one sound on an offline context and return a ToneAudioBuffer. */
export async function renderSound(trigger, seconds, sampleRate = 48000) {
  return Tone.Offline(async () => {
    // Tone.Offline swaps the global context, so nodes built here land on it
    const sys = new AudioSystem();
    sys.buildGraph();
    trigger(sys);
  }, seconds, 2, sampleRate);
}

/**
 * 32-bit float WAV. Not 16-bit: the mix spans ~38 dB between the whiffs
 * (around -40 dBFS) and the impacts (around -4 dBFS), and quantising the quiet
 * end to 16 bits would leave roughly 7 usable bits once it is boosted in a DAW.
 * Float keeps the render exactly as the game produced it.
 */
export function encodeWav(buffer) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
  const frames = data[0].length;
  const bytesPerSample = 4;
  const blockAlign = channels * bytesPerSample;
  const dataBytes = frames * blockAlign;

  const out = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(out);
  const str = (off, v) => { for (let i = 0; i < v.length; i++) view.setUint8(off + i, v.charCodeAt(i)); };

  str(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 3, true);                       // 3 = IEEE float
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  str(36, 'data');
  view.setUint32(40, dataBytes, true);

  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      view.setFloat32(off, data[c][i], true);
      off += 4;
    }
  }
  return new Uint8Array(out);
}

function toBase64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

/** Peak level, so a silent render can be caught rather than shipped. */
function peakOf(buffer) {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

/**
 * Render everything and POST each WAV to the local file sink.
 * @param {string} sinkUrl e.g. 'http://localhost:5200/file'
 */
export async function exportAll(sinkUrl = 'http://localhost:5200/file') {
  const report = [];
  for (const [name, [trigger, seconds]] of Object.entries(SOUND_MANIFEST)) {
    const buf = await renderSound(trigger, seconds);
    const raw = buf.get ? buf.get() : buf;               // ToneAudioBuffer -> AudioBuffer
    const peak = peakOf(raw);
    const wav = encodeWav(raw);
    const url = `data:audio/wav;base64,${toBase64(wav)}`;
    const res = await fetch(`${sinkUrl}?name=${encodeURIComponent(name)}.wav`, {
      method: 'POST', body: url,
    });
    report.push({
      name, seconds,
      peak: +peak.toFixed(4),
      dBFS: +(20 * Math.log10(Math.max(1e-9, peak))).toFixed(1),
      kb: Math.round(wav.length / 1024),
      silent: peak < 0.0005,
      wrote: res.ok,
    });
  }
  return report;
}
