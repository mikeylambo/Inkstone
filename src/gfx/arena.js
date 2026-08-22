/**
 * The arena. Torii + stone lanterns double as wall-splat surfaces —
 * knocking an Oni into one is the payoff for landing a heavy.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { PALETTE, createSumiMaterial, addOutline, paperTexture } from './materials.js';

/** World-space ink line weight for scenery. */
const OUTLINE = 0.09;

export function createArena(scene) {
  const group = new THREE.Group();
  const splatSurfaces = [];

  // --- floor ---
  const floorMat = createSumiMaterial(0xcbc0a9, 0x000000, paperTexture);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(31, 31, 1, 48), floorMat);
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  group.add(floor);

  // --- enso ring painted on the ground ---
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(11.5, 13.0, 64, 1, 0, Math.PI * 1.87),
    new THREE.MeshBasicMaterial({ color: PALETTE.sumi, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);

  // outer boundary stroke
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(TUNING.player.arenaRadius - 0.35, TUNING.player.arenaRadius + 0.15, 72),
    new THREE.MeshBasicMaterial({ color: PALETTE.sumi, side: THREE.DoubleSide, transparent: true, opacity: 0.30 })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.01;
  group.add(rim);

  // --- torii gate ---
  const pillarMat = createSumiMaterial(PALETTE.vermilionDeep);
  const timberMat = createSumiMaterial(PALETTE.sumi);
  const torii = new THREE.Group();

  const pillarGeo = new THREE.CylinderGeometry(0.6, 0.72, 10, 12);
  for (const x of [-6, 6]) {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(x, 5, -18);
    p.castShadow = true;
    addOutline(p, OUTLINE);
    torii.add(p);
    splatSurfaces.push({
      kind: 'torii',
      position: new THREE.Vector3(x, 0, -18),
      radius: 0.95,
      height: 10,
      object: p,
    });
  }

  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.9, 1.2), timberMat);
  beam1.position.set(0, 9.8, -18);
  beam1.castShadow = true;
  addOutline(beam1, OUTLINE);
  const beam2 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.7, 1.0), pillarMat);
  beam2.position.set(0, 8.5, -18);
  addOutline(beam2, OUTLINE);
  torii.add(beam1, beam2);
  group.add(torii);

  // --- stone lanterns ringing the arena ---
  const lanternBodyGeo = new THREE.BoxGeometry(1.5, 3.4, 1.5);
  const lanternCapGeo = new THREE.BoxGeometry(2.3, 0.5, 2.3);
  const lanternBaseGeo = new THREE.CylinderGeometry(1.0, 1.2, 1.0, 8);
  const lanternMat = createSumiMaterial(PALETTE.stone);
  const flameGeo = new THREE.SphereGeometry(0.42, 8, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: PALETTE.gold });

  const lanternCount = 8;
  const lanternRadius = 25.5;
  for (let i = 0; i < lanternCount; i++) {
    const a = (i / lanternCount) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * lanternRadius;
    const z = Math.sin(a) * lanternRadius;

    const l = new THREE.Group();
    const base = new THREE.Mesh(lanternBaseGeo, lanternMat);
    base.position.y = 0.5; base.castShadow = true; addOutline(base, OUTLINE);
    const body = new THREE.Mesh(lanternBodyGeo, lanternMat);
    body.position.y = 2.7; body.castShadow = true; addOutline(body, OUTLINE);
    const cap = new THREE.Mesh(lanternCapGeo, lanternMat);
    cap.position.y = 4.6; cap.castShadow = true; addOutline(cap, OUTLINE);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 2.8;
    l.add(base, body, cap, flame);
    l.position.set(x, 0, z);
    l.rotation.y = -a;
    group.add(l);

    splatSurfaces.push({
      kind: 'lantern',
      position: new THREE.Vector3(x, 0, z),
      radius: 1.35,
      height: 5,
      object: l,
      flame,
    });
  }

  // --- lighting ---
  scene.add(new THREE.AmbientLight(0xf5eedc, 1.9));
  const key = new THREE.DirectionalLight(0xfff3db, 2.2);
  key.position.set(20, 40, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 110;
  const d = 30;
  key.shadow.camera.left = -d; key.shadow.camera.right = d;
  key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
  key.shadow.bias = -0.0009;
  scene.add(key);

  const rim2 = new THREE.DirectionalLight(PALETTE.vermilion, 1.1);
  rim2.position.set(-22, 12, -20);
  scene.add(rim2);

  scene.add(group);
  return { group, splatSurfaces, lights: { key, rim: rim2 } };
}
