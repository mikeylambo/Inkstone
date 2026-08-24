/**
 * Run — everything that belongs to one attempt, created and destroyed whole.
 *
 * Before this, `World` was eternal: enemies, fx, rng and score all lived
 * across restarts and had to be hand-reset, which is exactly how stale state
 * leaks between runs. Now `Run` owns them, and `World` is only a *view* onto
 * the current run so the combat systems can keep reading `World.enemies` and
 * friends without being rewritten. Gate S6 depends on combat not moving.
 *
 * The player object itself persists (its meshes and rig are expensive to
 * rebuild); `resetForRun` puts it back to a known state.
 */
import { TUNING } from './tuning.js';
import { World } from './world.js';
import { Input, ACTIONS } from './input.js';
import { Rng } from './rng.js';
import { Fx } from './gfx/fx.js';
import { Oni } from './entities/oni.js';
import { RunRecord } from './record.js';
import { Score } from './score.js';

export const MODES = {
  daily: {
    id: 'daily', label: 'DAILY SCROLL', kanji: '日',
    blurb: 'One seed for everyone, changing at UTC midnight. Waves escalate until you fall.',
    waves: true, allowRespawn: false, seeded: 'date',
  },
  free: {
    id: 'free', label: 'FREE', kanji: '遊',
    blurb: 'Same escalation, your own seed. Enter one to replay a fight exactly.',
    waves: true, allowRespawn: false, seeded: 'random',
  },
  kata: {
    id: 'kata', label: 'KATA', kanji: '型',
    blurb: 'Practice. One oni, endlessly replaced, no waves and no death. The V0.2 build.',
    waves: false, allowRespawn: true, seeded: 'random',
  },
};

export function dailySeed(day) {
  return `daily-${day || new Date().toISOString().slice(0, 10)}`;
}

export class Run {
  /**
   * @param {{mode:string, seed:string, day?:string, scene:object, player:object}} cfg
   */
  constructor(cfg) {
    this.mode = MODES[cfg.mode] ? cfg.mode : 'kata';
    this.def = MODES[this.mode];
    this.seed = String(cfg.seed);
    this.day = cfg.day || new Date().toISOString().slice(0, 10);
    this.scene = cfg.scene;
    this.player = cfg.player;

    this.rng = new Rng(this.seed);
    this.fx = new Fx(cfg.scene, this.rng);
    this.enemies = [];
    this.record = new RunRecord();
    this.score = new Score();

    this.time = 0;
    this.step = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.totalHits = 0;
    this.lockTarget = null;
    this.over = false;
    this.endReason = null;

    // wave state
    this.waveIndex = -1;
    this.phase = 'intro';        // intro | spawning | fighting | rest | dead
    this.phaseTimer = 0;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.clearGrace = 0;
    this.currentWave = null;

    // kata state (the V0.2 spawn/respawn behaviour, kept verbatim)
    this.kataRespawnTimer = 0;
    this.kataTarget = TUNING.spawn.baseCount;

    this.banner = null;          // {text, timer} consumed by the HUD
  }

  get allowRespawn() { return this.def.allowRespawn; }
  get usesWaves() { return this.def.waves; }
  get waveNumber() { return this.waveIndex + 1; }

  /** Point World at this run. Combat code reads World, not Run. */
  install() {
    World.run = this;
    World.rng = this.rng;
    World.fx = this.fx;
    World.enemies = this.enemies;
    World.time = 0;
    World.step = 0;
    World.hitStop = 0;
    World.combo = 0;
    World.comboTimer = 0;
    World.totalHits = 0;
    World.lockTarget = null;

    // A run must not inherit input state from the menu that launched it.
    // Held buttons in particular change physics — jump-cut and the launcher's
    // hold-to-follow both read isHeld — so a leaked hold makes two runs with
    // the same seed and the same inputs diverge.
    Input.clearAll();
    for (const a of ACTIONS) Input.release(a);
    Input.move.x = 0;
    Input.move.y = 0;

    this.player.resetForRun();
    World.camRig.resetTo(this.player);
    return this;
  }

  dispose() {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    this.fx.dispose();
    if (World.run === this) {
      World.run = null;
      World.lockTarget = null;
    }
  }

  // ------------------------------------------------------------- spawning

  spawnAt(kind, x, z) {
    const e = new Oni(this.scene, x, z);
    this.enemies.push(e);
    this.record.spawn(this.step, kind, e.position);
    return e;
  }

  spawnRing(kind, radius, jitter) {
    const a = this.rng.range(0, Math.PI * 2);
    const r = radius + this.rng.range(0, jitter);
    return this.spawnAt(kind, Math.cos(a) * r, Math.sin(a) * r);
  }

  /** Wave descriptor for an index, extending past the table by escalation. */
  waveAt(index) {
    const W = TUNING.waves;
    const table = W.table;
    if (index < table.length) {
      const w = table[index];
      return { count: w.count, types: w.types, interval: w.interval, rest: w.rest };
    }
    const last = table[table.length - 1];
    const over = index - table.length + 1;
    const E = W.escalation;
    return {
      count: Math.min(E.countMax, last.count + E.countAdd * over),
      types: last.types,
      interval: Math.max(E.intervalMin, last.interval * Math.pow(E.intervalMul, over)),
      rest: Math.max(E.restMin, last.rest * Math.pow(E.restMul, over)),
    };
  }

  startWave(index) {
    this.waveIndex = index;
    this.currentWave = this.waveAt(index);
    this.spawnQueue = this.currentWave.count;
    this.spawnTimer = 0;
    this.clearGrace = 0;
    this.phase = 'spawning';
    this.record.wave(this.step, index);
    this.showBanner(kanjiNumeral(index + 1));
  }

  showBanner(text) {
    this.banner = { text, timer: TUNING.waves.bannerHold };
  }

  aliveCount() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    return n;
  }

  // ---------------------------------------------------------------- update

  /** One fixed sim step. Called only while the game is in RUN. */
  update(dt) {
    this.step++;
    this.time += dt;
    World.step = this.step;
    World.time = this.time;

    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) this.banner = null;
    }

    if (this.usesWaves) this.updateWaves(dt);
    else this.updateKata(dt);

    this.record.samplePos(this.step, this.player.position);

    // keep the mirrored combo counters in step
    this.combo = World.combo;
    this.comboTimer = World.comboTimer;
    this.totalHits = World.totalHits;
  }

  updateWaves(dt) {
    const W = TUNING.waves;
    this.phaseTimer += dt;

    switch (this.phase) {
      case 'intro':
        if (this.phaseTimer >= W.firstWaveDelay) {
          this.phaseTimer = 0;
          this.startWave(0);
        }
        break;

      case 'spawning': {
        this.spawnTimer -= dt;
        if (this.spawnQueue > 0 && this.spawnTimer <= 0) {
          const types = this.currentWave.types;
          // types is the V0.3 / V0.6 slot; only 'oni' exists today, and
          // anything else falls back to it rather than spawning nothing
          const kind = types[this.rng.int(0, types.length)] || 'oni';
          this.spawnRing(kind, W.spawnRadius, W.spawnJitter);
          this.spawnQueue--;
          this.spawnTimer = this.currentWave.interval;
        }
        if (this.spawnQueue <= 0) { this.phase = 'fighting'; this.phaseTimer = 0; }
        break;
      }

      case 'fighting':
        if (this.aliveCount() === 0) {
          this.clearGrace++;
          if (this.clearGrace >= W.clearGraceSteps) {
            this.score.onWaveCleared(this.waveIndex);
            this.phase = 'rest';
            this.phaseTimer = 0;
          }
        } else {
          this.clearGrace = 0;
        }
        break;

      case 'rest':
        // a breather, not a heal
        if (this.phaseTimer >= this.currentWave.rest) {
          this.phaseTimer = 0;
          this.startWave(this.waveIndex + 1);
        }
        break;
    }
  }

  /** KATA is the V0.2 build: keep one oni alive, replace it when it dies. */
  updateKata(dt) {
    const alive = this.aliveCount();
    if (alive < this.kataTarget) {
      this.kataRespawnTimer += dt;
      if (this.kataRespawnTimer >= TUNING.spawn.respawnDelay) {
        this.kataRespawnTimer = 0;
        this.spawnRing('oni', TUNING.spawn.ringRadius, TUNING.spawn.ringJitter);
      }
    } else {
      this.kataRespawnTimer = 0;
    }
  }

  // ------------------------------------------------- events from combat code

  onAttackStart(key) { this.record.attackStart(this.step, key); }
  onDash(pos) { this.record.dash(this.step, pos); }
  onJump(pos) { this.record.jump(this.step, pos); }

  onHit(reaction, damage, pos) {
    this.record.hit(this.step, reaction, damage, pos);
    this.score.onHit(damage, World.combo);
  }

  onKill(pos) {
    this.record.kill(this.step, pos);
    this.score.onKill(World.combo);
  }

  onParry(pos) {
    this.record.parry(this.step, pos);
    this.score.onParry(World.combo);
  }

  onWallSplat() { this.score.onWallSplat(World.combo); }

  onPlayerHurt(damage, pos) {
    this.record.playerHurt(this.step, damage, pos);
    this.score.onPlayerHurt(damage);
  }

  /** Called when the player's health reaches zero and the mode does not respawn. */
  onPlayerDeath() {
    if (this.over) return;
    this.over = true;
    this.endReason = 'death';
    this.record.runEnd(this.step, 'death');
  }

  abandon() {
    if (this.over) return;
    this.over = true;
    this.endReason = 'abandoned';
    this.record.runEnd(this.step, 'abandoned');
  }

  /** Everything RESULTS, the profile and the board need. */
  summary() {
    const ev = this.score.evaluate(this.record);
    return {
      ...ev,
      mode: this.mode,
      modeLabel: this.def.label,
      seed: this.seed,
      day: this.day,
      wave: this.usesWaves ? Math.max(1, this.waveNumber) : 0,
      timeSeconds: this.time,
      strokes: this.totalHits,
      endReason: this.endReason,
      runHash: this.record.hash(),
      spawnHash: this.record.spawnHash(),
    };
  }
}

const NUMERALS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 1..99 as kanji numerals, for the wave banner. */
export function kanjiNumeral(n) {
  if (n <= 0) return NUMERALS[0];
  if (n < 10) return NUMERALS[n];
  if (n === 10) return '十';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (n < 20) return `十${ones ? NUMERALS[ones] : ''}`;
  if (n < 100) return `${NUMERALS[tens]}十${ones ? NUMERALS[ones] : ''}`;
  return String(n);
}
