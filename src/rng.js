/**
 * Seeded PRNG. Same seed + same inputs must give the same run.
 * All sim-side randomness MUST come from here — never Math.random().
 */

export function getSeedFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get('seed') || 'sumi-v02';
}

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seedStr) {
    this.seedStr = seedStr;
    this.state = hashSeed(seedStr);
    this.calls = 0;
  }

  /** mulberry32 */
  next() {
    this.calls++;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) { return min + this.next() * (max - min); }
  /** symmetric spread: -amt..+amt */
  spread(amt) { return (this.next() * 2 - 1) * amt; }
  int(min, maxExclusive) { return Math.floor(this.range(min, maxExclusive)); }
  pick(arr) { return arr[this.int(0, arr.length)]; }
}
