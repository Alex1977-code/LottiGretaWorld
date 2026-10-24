// Donut-Blöcke (Bauplan 5-Kapitän „Tipp- und Donut-Blöcke“, 7-3 „Donut-Blöcke fallen nach kurzem Stehen“).
//
// donutblock – 1-m-Block mit Donut-Krone: Steht eine Figur darauf, sinkt er leicht ein und zittert; nach `delay` s
//   Stehzeit fällt er (wird schneller, trägt die Figur mit – sie kann noch abspringen), verschwindet nach `life` s und kommt
//   nach `respawn` s an seinem Platz wieder (ploppt auf, nur wenn dort nichts steckt). Geht die Figur vorher herunter,
//   erholt sich der Block (Stehzeit sinkt doppelt so schnell). Signal { drop: id } lässt alle Blöcke des Bausteins fallen.
//   { type: 'donutblock', id, pos: [x, y, z] (Mitte der Unterseite) | blocks: [[x, y, z], …] | from, to (Reihe, je size m)
//     | grid: [nx, nz] (+ pos = Mitte unten der Fläche), size: 1, delay: 0.5, respawn: 3, life: 2.2, sag: 0.12,
//     gravity: 18, maxFall: 12, color: 'rosa' | 'schoko' | 'gelb' }
//   level.named.get(id) = { blocks: [{ x, y, z, state ('idle' | 'loaded' | 'fall' | 'gone'), t, y0 }], drop(), falls,
//     info() }
// Darstellung: eine InstancedMesh je Baustein (Modell 'donutblock' aus der Registry, sobald es den Namen gibt; Ursprung =
// Mitte der Unterseite, 1 m), sonst eigene Geometrie (Keks-Block mit glasiertem Donut und Streuseln).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject } from '../kit.js';
import { figures } from '../w2kit.js';
import { penetrates } from '../w4kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const COLORS = { rosa: [0xff8ac8, 0xffd6ec], schoko: [0x8a4a2a, 0xc88a5a], gelb: [0xffd24a, 0xfff2b0] };

function donutGeo(color) {
  const [glaze, light] = (COLORS[color] ?? COLORS.rosa).map((c) => lin(hex(c)));
  const parts = [];
  const base = box(1, 0.62, 1, 0, 0.31, 0, 0xe8b070, { r: 0.12, seg: 2 });
  const dough = lin(0xe8b070), doughD = lin(0xb8783e);
  parts.push(colorize(base, (p, n, o) => mixc(doughD, dough, smooth(-0.6, 0.9, n.y + p.y * 0.4), o)));
  const tor = new THREE.TorusGeometry(0.3, 0.17, 10, 20);
  tor.rotateX(Math.PI / 2);
  tor.translate(0, 0.66, 0);
  parts.push(colorize(tor.toNonIndexed(), (p, n, o) => (n.y > -0.1 ? mixc(glaze, light, smooth(0.5, 1, n.y) * 0.5, o) : mixc(doughD, dough, 0.6, o))));
  // Streusel
  const SP = [0xffffff, 0x5ad0ff, 0xffe04a, 0x6aff7a, 0xff5a5a].map(lin);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.3, r = 0.3 + ((i * 7) % 5 - 2) * 0.03;
    const s = new THREE.BoxGeometry(0.1, 0.03, 0.03);
    s.rotateY(a * 1.7);
    s.translate(Math.cos(a) * r, 0.83, Math.sin(a) * r);
    const c = SP[i % SP.length];
    parts.push(colorize(s.toNonIndexed(), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  return merge(parts);
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export function buildDonutblock(level, spec) {
  const size = spec.size ?? 1;
  const pts = [];
  if (spec.blocks) for (const b of spec.blocks) pts.push(v3(b));
  else if (spec.from && spec.to) {
    const a = v3(spec.from), b = v3(spec.to), L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const n = Math.max(1, Math.round(L / size) + 1);
    for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0; pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }); }
  } else if (spec.grid) {
    const p = v3(spec.pos), [nx, nz] = spec.grid;
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) pts.push({ x: p.x + (ix - (nx - 1) / 2) * size, y: p.y, z: p.z + (iz - (nz - 1) / 2) * size });
  } else pts.push(v3(spec.pos));
  const delay = spec.delay ?? 0.5, respawn = spec.respawn ?? 3, life = spec.life ?? 2.2, sag = spec.sag ?? 0.12;
  const g = spec.gravity ?? 18, maxFall = spec.maxFall ?? 12;
  const blocks = pts.map((q) => {
    const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: q.x, cz: q.z };
    const b = { x: q.x, y: q.y, z: q.z, y0: q.y, state: 'idle', t: 0, load: 0, vy: 0, pop: 0, mover, shake: 0 };
    b.shape = { type: 'box', min: [q.x - size / 2, q.y, q.z - size / 2], max: [q.x + size / 2, q.y + size, q.z + size / 2], mover, tag: 'donutblock', owner: null };
    b.sid = level.world.add(b.shape);
    return b;
  });
  const handle = { blocks, falls: 0, drop() { for (const b of blocks) if (b.state === 'idle' || b.state === 'loaded') startFall(b); }, info: () => ({ falls: handle.falls, states: blocks.map((b) => b.state) }) };
  for (const b of blocks) b.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  const startFall = (b) => { b.state = 'fall'; b.t = 0; b.vy = 0; handle.falls++; level.sfx('donut'); };
  const setY = (b, y, dt) => {
    const m = b.mover;
    m.dx = 0; m.dz = 0; m.dy = y - b.y; m.vx = 0; m.vz = 0; m.vy = dt > 0 ? m.dy / dt : 0;
    b.y = y;
    b.shape.min[1] = y; b.shape.max[1] = y + size;
    if (b.sid !== null) level.world.update(b.sid);
  };
  const standing = (b) => figures(level).some((f) => f.mode === 'ground' && f.ground === b.shape);
  level.onStep((dt) => {
    for (const b of blocks) {
      b.mover.dy = 0; b.mover.vy = 0;
      if (b.state === 'idle' || b.state === 'loaded') {
        const on = standing(b);
        b.load = on ? b.load + dt : Math.max(0, b.load - 2 * dt);
        b.state = b.load > 0 ? 'loaded' : 'idle';
        const want = b.y0 - sag * Math.min(1, b.load / Math.max(0.05, delay));
        if (Math.abs(want - b.y) > 1e-5) setY(b, b.y + Math.max(-0.6 * dt, Math.min(0.6 * dt, want - b.y)), dt);
        if (b.load >= delay) startFall(b);
      } else if (b.state === 'fall') {
        b.t += dt;
        b.vy = Math.max(-maxFall, b.vy - g * dt);
        setY(b, b.y + b.vy * dt, dt);
        if (b.t >= life || b.y < level.killY) {
          b.state = 'gone'; b.t = 0;
          if (b.sid !== null) { level.world.remove(b.sid); b.sid = null; }
        }
      } else if (b.state === 'gone') {
        b.t += dt;
        if (b.t >= respawn) {
          const bx = { x0: b.x - size / 2, x1: b.x + size / 2, y0: b.y0, y1: b.y0 + size, z0: b.z - size / 2, z1: b.z + size / 2 };
          if (figures(level).some((f) => penetrates(f.pos, f.half, bx, 0.02))) continue;
          b.state = 'idle'; b.load = 0; b.pop = 0.35;
          b.y = b.y0; b.shape.min[1] = b.y0; b.shape.max[1] = b.y0 + size;
          b.sid = level.world.add(b.shape);
          level.effects?.sparks({ x: b.x, y: b.y0 + size, z: b.z }, 6);
        }
      }
    }
  });
  if (level.view) {
    let geo, mat;
    if (hasModel('donutblock')) {
      const m = getModel('donutblock', { color: spec.color ?? 'rosa' });
      m.root.updateMatrixWorld(true);
      const mesh = m.root.getObjectByProperty('isMesh', true);
      geo = mesh?.geometry ?? donutGeo(spec.color);
      mat = mesh?.material ?? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
    } else { geo = donutGeo(spec.color ?? 'rosa'); mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }); }
    const im = new THREE.InstancedMesh(geo, mat, blocks.length);
    im.castShadow = true; im.receiveShadow = true;
    im.frustumCulled = false;
    const holder = {};
    let tt = 0;
    addObject(level, im, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      blocks.forEach((b, i) => {
        if (b.state === 'gone') { im.setMatrixAt(i, ZERO); return; }
        if (b.pop > 0) b.pop = Math.max(0, b.pop - d);
        const k = b.pop > 0 ? 1 - b.pop / 0.35 : 1;
        const sh = b.state === 'loaded' ? 0.035 * Math.min(1, b.load / Math.max(0.05, delay)) : 0;
        _p.set(b.x + Math.sin(tt * 47 + i) * sh, b.y, b.z + Math.cos(tt * 41 + i) * sh);
        const sc = size * (k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5) + Math.sin(k * Math.PI) * 0.15) : 1);
        _s.set(sc, sc, sc);
        _m.compose(_p, _q, _s);
        im.setMatrixAt(i, _m);
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }
  return handle;
}

export const TYPES = { donutblock: buildDonutblock };
