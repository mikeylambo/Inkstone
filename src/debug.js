/**
 * Debug overlay (~): entity state, hitboxes, and every tuning value,
 * editable live. The stroke registry readout is stubbed — it arrives in V0.3.
 */
import * as THREE from 'three';
import { TUNING, TUNING_DEFAULTS, setTuning, getTuning } from './tuning.js';
import { Input, ACTIONS, ACTION_LABELS } from './input.js';
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
    mkRow('live strokes', () => 'V0.3 — not built');
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
    mkBtn('reset tuning', () => { this.resetTuning(); });
    this.panel.appendChild(btnBar);

    // --- key / pad remapping ---
    mkSection('bindings (click to rebind)');
    this.bindRows = [];
    for (const action of ACTIONS) {
      const row = document.createElement('div');
      row.className = 'row bindrow';
      const a = document.createElement('span');
      a.textContent = ACTION_LABELS[action] || action;
      const b = document.createElement('span');
      b.textContent = Input.describeBinding(action);
      row.append(a, b);
      row.onclick = () => {
        if (this.remapRow) this.remapRow.b.textContent = Input.describeBinding(this.remapRow.action);
        b.textContent = 'press a key / button…';
        this.remapRow = { action, b };
        Input.beginRemap(action, (desc) => {
          b.textContent = desc;
          this.remapRow = null;
        });
      };
      this.panel.appendChild(row);
      this.bindRows.push({ action, b });
    }
    const bindBar = document.createElement('div');
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'reset bindings';
    resetBtn.onclick = () => {
      Input.resetBindings();
      for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
    };
    bindBar.appendChild(resetBtn);
    this.panel.appendChild(bindBar);

    // --- live tuning ---
    mkSection('tuning (live)');
    for (const key of Object.keys(TUNING)) {
      const det = document.createElement('details');
      const sum = document.createElement('summary');
      sum.textContent = key;
      det.appendChild(sum);
      this.buildTuningTree(det, TUNING[key], key);
      this.panel.appendChild(det);
    }
  }

  buildTuningTree(parent, obj, prefix) {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const path = `${prefix}.${k}`;
      if (typeof v === 'number') {
        const row = document.createElement('div');
        row.className = 'tune';
        const label = document.createElement('label');
        label.textContent = k;
        label.title = path;
        const input = document.createElement('input');
        input.type = 'number';
        input.step = Math.abs(v) >= 10 ? 0.5 : Math.abs(v) >= 1 ? 0.1 : 0.005;
        input.value = String(v);
        input.dataset.path = path;
        input.addEventListener('change', () => {
          const n = parseFloat(input.value);
          if (!Number.isNaN(n)) setTuning(path, n);
        });
        row.append(label, input);
        parent.appendChild(row);
      } else if (typeof v === 'string') {
        const row = document.createElement('div');
        row.className = 'tune';
        const label = document.createElement('label');
        label.textContent = k;
        label.title = path;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = v;
        input.dataset.path = path;
        input.addEventListener('change', () => setTuning(path, input.value.trim()));
        row.append(label, input);
        parent.appendChild(row);
      } else if (v && typeof v === 'object') {
        const det = document.createElement('details');
        const sum = document.createElement('summary');
        sum.textContent = k;
        det.appendChild(sum);
        this.buildTuningTree(det, v, path);
        parent.appendChild(det);
      }
    }
  }

  resetTuning() {
    const walk = (src, prefix) => {
      for (const k of Object.keys(src)) {
        const v = src[k];
        const path = `${prefix}.${k}`;
        if (typeof v === 'number' || typeof v === 'string') setTuning(path, v);
        else if (v && typeof v === 'object') walk(v, path);
      }
    };
    for (const key of Object.keys(TUNING_DEFAULTS)) walk(TUNING_DEFAULTS[key], key);
    this.panel.querySelectorAll('input[data-path]').forEach((i) => {
      i.value = String(getTuning(i.dataset.path));
    });
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
