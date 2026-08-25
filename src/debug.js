/**
 * Debug overlay (~): entity state, hitboxes, and every tuning value,
 * editable live. The stroke registry readout is stubbed — it arrives in V0.3.
 */
import * as THREE from 'three';
import { TUNING } from './tuning.js';
import { Input } from './input.js';
import { SettingsEditor } from './settings.js';
import { World } from './world.js';
import { PALETTE } from './gfx/materials.js';
import { isActiveFrames } from './combat/attacks.js';

const WEDGE_SEGMENTS = 16;

class DebugDraw {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.pool = [];
    this.used = 0;
    this.mat = new THREE.MeshBasicMaterial({
      color: PALETTE.vermilion, transparent: true, opacity: 0.28,
      side: THREE.DoubleSide, depthWrite: false, depthTest: false,
    });
    this.matIdle = new THREE.MeshBasicMaterial({
      color: 0x1e3a8a, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false, depthTest: false,
    });
  }

  begin() { this.used = 0; }

  wedge(pos, facing, radius, arc, y, active) {
    let m = this.pool[this.used];
    if (!m) {
      m = new THREE.Mesh(new THREE.RingGeometry(0.1, 1, WEDGE_SEGMENTS, 1, 0, 1), this.mat);
      m.renderOrder = 999;
      this.pool.push(m);
      this.group.add(m);
    }
    m.geometry.dispose();
    m.geometry = new THREE.RingGeometry(0.05, radius, WEDGE_SEGMENTS, 1, -arc / 2, arc);
    m.material = active ? this.mat : this.matIdle;
    m.position.set(pos.x, y, pos.z);
    m.rotation.set(-Math.PI / 2, 0, 0);
    // ring theta starts at +X; rotate so the wedge centres on `facing`
    m.rotation.z = facing - Math.PI / 2;
    m.visible = true;
    this.used++;
    return m;
  }

  end() {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false;
  }

  set visible(v) { this.group.visible = v; }
}

export class Debug {
  constructor(scene, hooks) {
    this.panel = document.getElementById('debug-panel');
    this.draw = new DebugDraw(scene);
    this.hooks = hooks;
    this.readouts = [];
    this.build();
    this.frames = 0;
    this.acc = 0;
  }

  toggle() {
    World.debug.show = !World.debug.show;
    this.panel.classList.toggle('hidden', !World.debug.show);
    this.draw.visible = World.debug.show && World.debug.showHitboxes;
  }

  // ------------------------------------------------------------------ build

  build() {
    this.panel.innerHTML = '';

    const mkSection = (title) => {
      const h = document.createElement('h2');
      h.textContent = title;
      this.panel.appendChild(h);
    };

    const mkRow = (label, get, cls = '') => {
      const row = document.createElement('div');
      row.className = `row ${cls}`;
      const a = document.createElement('span'); a.textContent = label;
      const b = document.createElement('span'); b.textContent = '—';
      row.append(a, b);
      this.panel.appendChild(row);
      this.readouts.push({ el: b, get });
    };

    mkSection('runtime');
    mkRow('fps', () => World.debug.fps.toFixed(0), 'good');
    mkRow('frame ms', () => World.debug.frameMs.toFixed(2));
    mkRow('sim steps / frame', () => World.debug.simStepsLastFrame);
    mkRow('sim time', () => World.time.toFixed(2));
    mkRow('sim step #', () => World.step);
    mkRow('hit-stop', () => World.hitStop.toFixed(3));
    mkRow('seed', () => World.rng.seedStr);
    mkRow('rng calls', () => World.rng.calls);
    mkRow('enemies alive', () => World.enemies.filter((e) => !e.dead).length);
    mkRow('fx live', () => World.fx.liveCount);
    mkRow('draw calls', () => this.hooks.renderInfo().calls);
    mkRow('triangles', () => this.hooks.renderInfo().triangles);

    mkSection('player');
    mkRow('state', () => World.player.state);
    mkRow('attack', () => {
      const a = World.player.attack;
      if (!a) return '—';
      const e = a.elapsed;
      const d = a.def;
      const phase = e < d.anticipation ? 'ANTICIPATION'
        : isActiveFrames(d, e) ? 'ACTIVE' : 'RECOVERY';
      return `${d.label} ${phase} ${(e * 1000).toFixed(0)}ms`;
    });
    mkRow('grounded', () => (World.player.grounded ? 'yes' : 'no'));
    mkRow('pos', () => {
      const p = World.player.position;
      return `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
    });
    mkRow('vel', () => {
      const v = World.player.vel;
      return `${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`;
    });
    mkRow('i-frames', () => (World.player.iframes > 0 || World.player.invuln > 0 ? 'ACTIVE' : '—'));
    mkRow('parry window', () => (World.player.parryWindowOpen ? 'OPEN' : '—'));
    mkRow('ground chain idx', () => World.player.chainIndex);
    mkRow('air chain idx', () => World.player.airChainIndex);

    mkSection('G2.4 — attack displacement');
    mkRow('lock-on', () => (World.lockTarget ? 'LOCKED' : 'FREE'), 'warn');
    mkRow('step-in granted', () => `${World.debug.stepInThisAttack.toFixed(3)} m`);
    mkRow('last attack moved', () => `${World.debug.lastAttackDisplacement.toFixed(4)} m`);
    mkRow('last attack', () => World.debug.lastAttackKey);

    mkSection('F1 — press to visible stroke');
    mkRow('last stroke latency', () => `${(World.debug.pressToStrokeMs || 0).toFixed(1)} ms`, 'good');
    mkRow('in sim steps', () => `${(World.debug.pressToStrokeSteps || 0).toFixed(2)}`, 'good');
    mkRow('fan opacity now', () => World.player.fan.visibleOpacity.toFixed(2));
    mkRow('input buffer', () => `${(TUNING.combo.inputBuffer * 1000).toFixed(0)} ms`);

    mkSection('controls state');
    mkRow('scheme', () => TUNING.controls.scheme);
    mkRow('basis latched', () => (World.player.basisLatched ? 'yes' : 'no'));
    mkRow('screen yaw', () => `${(World.camRig.screenYaw * 57.2958).toFixed(0)}°`);
    mkRow('stick', () => `${Input.move.x.toFixed(2)}, ${Input.move.y.toFixed(2)}`);
    mkRow('gamepad', () => (Input.padConnected ? 'connected' : '—'));
    mkRow('lock mode', () => (TUNING.controls.lockIsHold ? 'hold' : 'toggle'));
    mkRow('dir intent', () => World.player.lockDirIntent() || '—');
    mkRow('air jumps', () => World.player.airJumps);
    mkRow('coyote', () => World.player.coyoteTimer.toFixed(3));
    mkRow('cam push-in', () => World.camRig.pushIn.toFixed(2));

    mkSection('last hit');
    mkRow('reaction', () => World.debug.lastReaction);
    mkRow('hit-stop applied', () => `${(World.debug.lastHitStop * 1000).toFixed(0)} ms`);
    mkRow('combo', () => World.combo);
    mkRow('total hits', () => World.totalHits);
    mkRow('camera trauma', () => World.camRig.trauma.toFixed(2));
    mkRow('fov offset', () => World.camRig.fovOffset.toFixed(2));

    mkSection('lock target');
    mkRow('state', () => (World.lockTarget ? World.lockTarget.state : '—'));
    mkRow('hp', () => (World.lockTarget ? World.lockTarget.hp.toFixed(0) : '—'));
    mkRow('hitstun', () => (World.lockTarget ? World.lockTarget.hitstun.toFixed(2) : '—'));
    mkRow('airborne', () => (World.lockTarget ? (World.lockTarget.grounded ? 'no' : 'yes') : '—'));
    mkRow('splat armed', () => (World.lockTarget ? (World.lockTarget.splatArmed ? 'yes' : 'no') : '—'));

    mkSection('stroke registry');
    mkRow('live strokes', () => {
      const r = World.strokes;
      if (!r) return '—';
      const by = {};
      for (const s of r.strokes) by[s.state] = (by[s.state] || 0) + 1;
      const parts = Object.entries(by).map(([k, v]) => `${k} ${v}`).join(' · ');
      return `${r.live}/${TUNING.ink.maxLive}  (${parts || 'none'})  laid ${r.created}`;
    });
    mkRow('ink pools', () => World.fx.inkPools.length);
    mkRow('decals', () => World.fx.decals.length);

    // --- buttons ---
    mkSection('actions');
    const btnBar = document.createElement('div');
    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = fn;
      btnBar.appendChild(b);
    };
    mkBtn('hitboxes', () => {
      World.debug.showHitboxes = !World.debug.showHitboxes;
      this.draw.visible = World.debug.showHitboxes;
    });
    mkBtn('+1 oni', () => this.hooks.spawn(1));
    mkBtn('+8 oni', () => this.hooks.spawn(8));
    mkBtn('kill all', () => this.hooks.killAll());
    mkBtn('reset arena', () => this.hooks.reset());
    mkBtn('reset tuning', () => { this.settings.resetTuning(); });
    this.panel.appendChild(btnBar);

    // --- settings: bindings + every tuning value (shared with the pause menu) ---
    mkSection('settings');
    const settingsHost = document.createElement('div');
    this.panel.appendChild(settingsHost);
    this.settings = new SettingsEditor(settingsHost);
  }

  // ----------------------------------------------------------------- update

  update(dt, realDt) {
    this.frames++;
    this.acc += realDt;
    if (this.acc >= 0.25) {
      World.debug.fps = this.frames / this.acc;
      this.frames = 0;
      this.acc = 0;
    }

    if (!World.debug.show) return;

    for (const r of this.readouts) {
      let val;
      try { val = r.get(); } catch (e) { val = 'err'; }
      const s = String(val);
      if (r.el.textContent !== s) r.el.textContent = s;
    }

    if (World.debug.showHitboxes) this.drawHitboxes();
  }

  drawHitboxes() {
    this.draw.begin();
    const p = World.player;
    if (p.attack) {
      const d = p.attack.def;
      const active = isActiveFrames(d, p.attack.elapsed);
      this.draw.wedge(p.position, p.facing, d.reach, d.arc, p.position.y + 0.1, active);
    }
    for (const e of World.enemies) {
      if (e.dead) continue;
      this.draw.wedge(e.position, e.facing, TUNING.oni.swingReach, TUNING.oni.swingArc,
        e.position.y + 0.08, e.state === 'swing');
    }
    this.draw.end();
  }
}
