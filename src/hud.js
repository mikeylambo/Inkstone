/**
 * HUD. Deliberately minimal for V0.2: vitals, lock-on target, stroke count.
 * The style evaluator and rank seals are V0.6 and are NOT built yet.
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
  }

  update(camera) {
    const p = World.player;
    if (!p) return;

    const hpPct = (p.hp / TUNING.player.maxHp) * 100;
    this.hpBar.style.width = `${Math.max(0, hpPct)}%`;
    this.hpText.textContent = `${Math.round(p.hp)} / ${TUNING.player.maxHp}`;

    this.combo.textContent = `${World.combo} STROKE${World.combo === 1 ? '' : 'S'}`;
    this.lockState.textContent = World.lockTarget ? 'LOCKED' : 'FREE';

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
}
