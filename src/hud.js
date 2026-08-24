/**
 * Combat HUD. Visible in RUN and PAUSE only — the shell screens hide it via
 * body[data-state]. Still deliberately minimal: vitals, lock-on target, stroke
 * count, plus the run's mode/score and the wave banner.
 */
import * as THREE from 'three';
import { TUNING } from './tuning.js';
import { World } from './world.js';

const _p = new THREE.Vector3();

export class Hud {
  constructor() {
    this.hpBar = document.getElementById('hp-bar');
    this.hpText = document.getElementById('hp-text');
    this.targetInfo = document.getElementById('target-info');
    this.targetHp = document.getElementById('target-hp-bar');
    this.targetState = document.getElementById('target-state');
    this.reticle = document.getElementById('reticle');
    this.combo = document.getElementById('combo-count');
    this.lockState = document.getElementById('lock-state');
    this.runMode = document.getElementById('run-mode');
    this.runScore = document.getElementById('run-score');
    this.waveBanner = document.getElementById('wave-banner');
    this.hints = document.getElementById('controls');
    /** Reserved: pigment ships in V0.5. Present, hidden, never written. */
    this.pigmentSlot = document.getElementById('pigment-slot');
    this.pigmentValue = document.getElementById('pigment-value');
    this.shownBanner = null;
  }

  /**
   * Show or hide the run's pigment readout. Nothing calls this yet — it is
   * here so the HUD does not need re-laying-out when pigment arrives.
   * @param {number|null} v 0..1, or null to hide
   */
  setPigment(v) {
    if (!this.pigmentSlot) return;
    if (v == null) { this.pigmentSlot.style.display = 'none'; return; }
    this.pigmentSlot.style.display = '';
    this.pigmentValue.textContent = `${Math.round(v * 100)}%`;
  }

  update(camera, game) {
    const p = World.player;
    if (!p) return;

    const hpPct = (p.hp / TUNING.player.maxHp) * 100;
    this.hpBar.style.width = `${Math.max(0, hpPct)}%`;
    this.hpText.textContent = `${Math.round(p.hp)} / ${TUNING.player.maxHp}`;

    if (this.hints) this.hints.classList.toggle('hidden', !TUNING.frame.hints);

    this.combo.textContent = `${World.combo} STROKE${World.combo === 1 ? '' : 'S'}`;
    this.lockState.textContent = World.lockTarget ? 'LOCKED' : 'FREE';

    // --- run readouts ---
    const run = World.run;
    if (run) {
      this.runMode.textContent = run.usesWaves
        ? `${run.def.label} · WAVE ${Math.max(1, run.waveNumber)}`
        : run.def.label;
      this.runScore.textContent = run.mode === 'kata' ? '—' : String(run.score.value);
      this.showWaveBanner(run.banner);
    } else {
      this.runMode.textContent = '—';
      this.runScore.textContent = '0';
    }

    // --- lock-on target ---
    const t = World.lockTarget;
    if (t && !t.dead) {
      this.targetInfo.classList.remove('hidden');
      this.targetHp.style.width = `${Math.max(0, (t.hp / t.maxHp) * 100)}%`;
      this.targetState.textContent = t.pinned ? 'SPLAT' : String(t.state).toUpperCase();

      _p.copy(t.position);
      _p.y += t.height * 0.55;
      _p.project(camera);
      if (_p.z < 1) {
        const x = (_p.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-_p.y * 0.5 + 0.5) * window.innerHeight;
        this.reticle.style.left = `${x}px`;
        this.reticle.style.top = `${y}px`;
        this.reticle.style.opacity = '1';
      } else {
        this.reticle.style.opacity = '0';
      }
    } else {
      this.targetInfo.classList.add('hidden');
      this.reticle.style.opacity = '0';
    }
  }

  /** Fire the kanji wave banner once per wave, not once per frame. */
  showWaveBanner(banner) {
    if (!this.waveBanner) return;
    const text = banner ? banner.text : null;
    if (text && text !== this.shownBanner) {
      this.shownBanner = text;
      this.waveBanner.textContent = text;
      this.waveBanner.classList.remove('show');
      void this.waveBanner.offsetWidth;
      this.waveBanner.classList.add('show');
    } else if (!text) {
      this.shownBanner = null;
    }
  }
}
