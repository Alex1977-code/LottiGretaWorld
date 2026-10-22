// Welt-3-Bausteine Szenen: Zug (3-Zug „Bahnsteig, Zug fährt schnell an“, „vom Parallelzug feuern Riesenprojektile“),
// Zirkus (3-B „Zirkuszelt-Arena, Treppe und Seilbahn zur Arena“), Pastell-Garten (3-4 „rosa Gras, bunter Stein“).
// Zugwagen selbst: Fahrzeug `vehicle` mit style 'lok' | 'wagen' | 'flach' (Modell 'zug_waggon', entities/kinds/vehicle.js).
//
// bahnsteig – Bahnsteig (begehbar) mit gelber Sicherheitslinie an der Gleiskante, Dach auf Stützen, Lampen, Bank, Schild.
//   { type: 'bahnsteig', pos (Mitte der Unterseite), size: [w, h, d] ([5, 1.1, 24]), edge: 'right' (+X) | 'left' (−X),
//     roof: true, sign: 'Gleis 1' (Schildtext, '' = keins), lamps: true }
// parallelgleis – zweites Gleis neben einer Strecke (Optik wie `track`): path/from/to der Hauptstrecke + offset m nach
//   rechts (in Fahrtrichtung; negativ = links), übrige Felder wie track (gauge, sleepers, trestle, buffer, solid …).
//   { type: 'parallelgleis', path: [[x, y, z], …], offset: 8, dy: 0 }
//
// zirkuszelt – Zirkuszelt als Arena-Hülle (Modell 'zirkuszelt', innen und außen sichtbar).
//   { type: 'zirkuszelt', pos (Mitte), radius: 12.5, height: 12, walls: true (Zeltwand fest, Ring aus Quadern),
//     door: −π/2 (Richtung der Eingangslücke wie yaw: 0 = +X, −π/2 = +Z zur Kamera), doorWidth: 4 }
// manege – Manegen-Rand (roter Ring, Sägemehl-Boden): { type: 'manege', pos, radius: 4, floor: true, solid: true }
// zirkuspodest – Trommel-Podest (begehbar): { type: 'zirkuspodest', pos, radius: 1.2, height: 0.9 }
// seilbahn – Seilbahn-Gondel (Modell 'seilbahn_gondel', Boden 2,2 m unter dem Seil) zwischen from und to (Seilpunkte):
//   fährt los, sobald eine Figur in der Gondel steht (trigger 'stand') bzw. ständig ('auto'); am Ziel wartet sie, bis
//   die Figur ausgestiegen und wieder eine zugestiegen ist (pingpong: dann zurück).
//   { type: 'seilbahn', from: [x, y, z], to: [x, y, z], speed: 3, wait: 1.5, trigger: 'stand' | 'auto',
//     mode: 'pingpong' | 'once', masts: true, id }   level.named.get(id) = { u (0..1), state, pos, floorY }
//
// rosa_gras / bunter_stein – Pastell-Blöcke (begehbar): { type: 'rosa_gras'|'bunter_stein', pos (Mitte der Unterseite),
//   size: [w, h, d] ([2, 1, 2]) }
// pastell_blume – Blumenbüschel (Kulisse): { type: 'pastell_blume', pos, yaw, sway: false (true = wiegt sich, eigenes
//   Objekt) }   hecken_hase – Formschnitt-Hase (fest): { type: 'hecken_hase', pos, yaw, scale: 1 }

import * as THREE from 'three';
import { v3, sz3, box, merge, addStatic, addObject, lin, colorize } from '../kit.js';
import { MovingBox, figures, modelObject, bakeModel } from '../w3kit.js';
import { buildTrack } from './track.js';
import { getModel } from '../../models/index.js';

// ------------------------------------------------------------------ Bahnsteig, Parallelgleis

function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a3a8a'; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
  g.fillStyle = '#ffffff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildBahnsteig(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [5, 1.1, 24]);
  const side = spec.edge === 'left' ? -1 : 1;
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], tag: 'bahnsteig' });
  if (!level.view) return;
  const G = [];
  const top = p.y + s.y;
  G.push(box(s.x, s.y, s.z, p.x, p.y + s.y / 2, p.z, 0xb8b4c4, { r: 0.08, topColor: 0xd8d4e0 }));
  // Bodenplatten-Fugen, Sicherheitslinie, Kante
  for (let z = p.z - s.z / 2 + 1; z < p.z + s.z / 2; z += 1) G.push(box(s.x - 0.1, 0.012, 0.04, p.x, top + 0.006, z, 0x9a96a8, { r: 0, seg: 0 }));
  G.push(box(0.22, 0.02, s.z, p.x + side * (s.x / 2 - 0.45), top + 0.01, p.z, 0xffd21f, { r: 0, seg: 0 }));
  G.push(box(0.16, 0.08, s.z, p.x + side * (s.x / 2 - 0.06), top - 0.02, p.z, 0xe8e4f0, { r: 0.03, seg: 1 }));
  if (spec.roof !== false) {
    const rz = s.z * 0.7, rh = 3.4;
    for (let i = 0; i < 3; i++) {
      const z = p.z - rz / 2 + (i * rz) / 2;
      G.push(box(0.22, rh, 0.22, p.x - side * (s.x / 2 - 0.9), top + rh / 2, z, 0x3a4a6a, { r: 0.05, seg: 1 }));
      level.world.add({ type: 'box', min: [p.x - side * (s.x / 2 - 0.9) - 0.11, top, z - 0.11], max: [p.x - side * (s.x / 2 - 0.9) + 0.11, top + rh, z + 0.11], tag: 'bahnsteig:stuetze' });
    }
    G.push(box(s.x * 0.85, 0.18, rz + 1, p.x - side * 0.2, top + rh, p.z, 0xd8283a, { r: 0.06, topColor: 0xff6a5a }));
    G.push(box(s.x * 0.85 + 0.2, 0.08, rz + 1.2, p.x - side * 0.2, top + rh + 0.18, p.z, 0xf6f0e8, { r: 0.03, seg: 1 }));
  }
  if (spec.lamps !== false) {
    for (const z of [p.z - s.z / 2 + 2, p.z + s.z / 2 - 2]) {
      G.push(box(0.12, 2.6, 0.12, p.x - side * (s.x / 2 - 0.4), top + 1.3, z, 0x2a2a3a, { r: 0.03, seg: 1 }));
      addStatic(level, box(0.32, 0.32, 0.32, p.x - side * (s.x / 2 - 0.4), top + 2.75, z, 0xfff2a0, { r: 0.08, seg: 1 }), { material: 'glow', castShadow: false });
    }
  }
  // Bank
  G.push(box(0.5, 0.08, 1.6, p.x - side * (s.x / 2 - 0.7), top + 0.45, p.z + s.z * 0.18, 0xb86f3a, { r: 0.03, seg: 1 }));
  G.push(box(0.08, 0.5, 1.6, p.x - side * (s.x / 2 - 0.45), top + 0.75, p.z + s.z * 0.18, 0xb86f3a, { r: 0.03, seg: 1 }));
  for (const dz of [-0.6, 0.6]) G.push(box(0.4, 0.42, 0.08, p.x - side * (s.x / 2 - 0.7), top + 0.21, p.z + s.z * 0.18 + dz, 0x3a3a48, { r: 0.02, seg: 1 }));
  addStatic(level, merge(G));
  const text = spec.sign ?? 'Gleis 1';
  if (text) {
    const mat = new THREE.MeshBasicMaterial({ map: signTexture(text) });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), mat);
    plane.position.set(p.x, top + 2.6, p.z - s.z * 0.1);
    plane.userData.owned = true;
    const post = new THREE.Mesh(merge([box(0.1, 2.3, 0.1, -0.9, -1.25, -0.02, 0x2a2a3a, { r: 0.02, seg: 1 }), box(0.1, 2.3, 0.1, 0.9, -1.25, -0.02, 0x2a2a3a, { r: 0.02, seg: 1 })]), new THREE.MeshStandardMaterial({ vertexColors: true }));
    plane.add(post);
    addObject(level, plane);
  }
}

/** Polylinie seitlich versetzen (rechts der Fahrtrichtung, gemittelte Normalen). */
function offsetPath(pts, off, dy = 0) {
  const n = pts.length;
  return pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
    const rx = -dz / l, rz = dx / l;              // rechts (Blick nach −Z → +X)
    return [q[0] + rx * off, q[1] + dy, q[2] + rz * off];
  });
}

export function buildParallelgleis(level, spec) {
  const pts = spec.path ?? [spec.from ?? [0, 0, 0], spec.to ?? [0, 0, -40]];
  const path = offsetPath(pts, spec.offset ?? 8, spec.dy ?? 0);
  return buildTrack(level, { ...spec, path, from: undefined, to: undefined });
}

// ------------------------------------------------------------------ Zirkus

export function buildZirkuszelt(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 12.5, H = spec.height ?? 12;
  if (level.view) {
    const m = getModel('zirkuszelt', { radius: R, height: H });
    m.root.position.set(p.x, p.y, p.z);
    addObject(level, m.root);
  }
  if (spec.walls !== false) {
    const door = spec.door ?? -Math.PI / 2, dw = spec.doorWidth ?? 4;
    const n = Math.max(12, Math.round((Math.PI * 2 * R) / 2));
    const hw = Math.max(2.5, H * 0.35);
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * Math.PI * 2;
      const x = p.x + Math.cos(a) * R, z = p.z - Math.sin(a) * R;
      // Eingang freilassen (Winkel wie yaw: Blick nach +X = 0, −Z = π/2)
      const da = Math.atan2(Math.sin(a - door), Math.cos(a - door));
      if (Math.abs(da) * R < dw / 2 + 0.5) continue;
      level.world.add({ type: 'box', min: [x - 0.5, p.y, z - 0.5], max: [x + 0.5, p.y + hw, z + 0.5], camIgnore: true, tag: 'zirkuszelt' });
    }
  }
}

export function buildManege(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 4;
  bakeModel(level, 'manege', { radius: R, floor: spec.floor !== false }, p.x, p.y, p.z, 0, 1);
  if (spec.solid !== false) {
    const n = Math.max(12, Math.round((Math.PI * 2 * R) / 0.8));
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * Math.PI * 2;
      const x = p.x + Math.cos(a) * (R - 0.25), z = p.z + Math.sin(a) * (R - 0.25);
      level.world.add({ type: 'box', min: [x - 0.3, p.y, z - 0.3], max: [x + 0.3, p.y + 0.55, z + 0.3], tag: 'manege' });
    }
  }
}

export function buildZirkuspodest(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 1.2, H = spec.height ?? 0.9;
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1: p.y + H, tag: 'zirkuspodest' });
  bakeModel(level, 'zirkuspodest', { radius: R, height: H }, p.x, p.y, p.z, spec.yaw ?? 0, 1);
}

export function buildSeilbahn(level, spec) {
  const a = v3(spec.from ?? [0, 8, 0]), b = v3(spec.to ?? [0, 8, -20]);
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
  const speed = spec.speed ?? 3;
  const FY = -2.2;
  const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  const st = { u: 0, dir: 1, state: 'wait', t: 0, pos: { x: a.x, y: a.y, z: a.z }, floorY: a.y + FY, moving: false };
  const fl = new MovingBox(level, a.x, a.y + FY - 0.25, a.z, 2.3, 0.25, 2.3, { tag: 'seilbahn' });
  const rails = [[1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1]].map(([dx, dz]) => new MovingBox(level, a.x + dx, a.y + FY, a.z + dz, dz ? 2.2 : 0.12, 0.9, dx ? 2.2 : 0.12, { tag: 'seilbahn:gelaender', noWallSlide: true }));
  if (spec.id) level.named.set(spec.id, st);
  const trigger = spec.trigger ?? 'stand';
  const place = (dt) => {
    const x = a.x + (b.x - a.x) * st.u, y = a.y + (b.y - a.y) * st.u, z = a.z + (b.z - a.z) * st.u;
    st.pos.x = x; st.pos.y = y; st.pos.z = z; st.floorY = y + FY;
    fl.moveTo(x, y + FY - 0.25, z, dt);
    [[1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1]].forEach(([dx, dz], i) => rails[i].moveTo(x + dx, y + FY, z + dz, dt));
  };
  level.onStep((dt) => {
    st.t += dt;
    const riders = figures(level).some((f) => fl.carries(f));
    if (st.state === 'wait') {
      // am Ziel erst aussteigen lassen: zurück geht es erst mit einer neu zugestiegenen Figur
      if (st.needEmpty && !riders) st.needEmpty = false;
      const go = trigger === 'auto' ? st.t >= (spec.wait ?? 1.5) : riders && !st.needEmpty && st.t >= 0.5;
      if (go && !(spec.mode === 'once' && st.u >= 1)) { st.state = 'move'; level.sfx('switch'); }
      fl.still(); for (const r of rails) r.still();
      st.moving = false;
      return;
    }
    st.moving = true;
    st.u += (st.dir * speed * dt) / L;
    if (st.u >= 1 || st.u <= 0) {
      st.u = Math.max(0, Math.min(1, st.u));
      st.state = 'wait'; st.t = 0; st.needEmpty = true;
      if (spec.mode !== 'once') st.dir = -st.dir;
    }
    place(dt);
  });
  if (level.view) {
    // Seil und Masten
    const G = [];
    const rope = new THREE.CylinderGeometry(0.05, 0.05, L, 6);
    rope.rotateZ(Math.PI / 2);
    rope.rotateZ(Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)));
    rope.rotateY(yaw);
    rope.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.08, (a.z + b.z) / 2);
    const rc = lin(0x3a3a48);
    G.push(colorize(rope.toNonIndexed(), (pp, n, o) => { o[0] = rc[0]; o[1] = rc[1]; o[2] = rc[2]; }));
    if (spec.masts !== false) {
      const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, hl = Math.hypot(ux, uz) || 1;
      const ends = [{ x: a.x - (ux / hl) * 1.7, y: a.y, z: a.z - (uz / hl) * 1.7 }, { x: b.x + (ux / hl) * 1.7, y: b.y, z: b.z + (uz / hl) * 1.7 }];
      for (const q of ends) {
        const ground = level.world.raycastDown(q.x, q.y - 3, q.z, 60);
        const gy = ground ? ground.y : q.y - 10;
        const h = q.y + 0.6 - gy;
        G.push(box(0.4, h, 0.4, q.x, gy + h / 2, q.z, 0x8a4a2a, { r: 0.08, seg: 1 }));
        G.push(box(1.2, 0.3, 0.6, q.x, q.y + 0.45, q.z, 0xe8283a, { r: 0.08, seg: 1 }));
      }
    }
    addStatic(level, merge(G));
    modelObject(level, 'seilbahn_gondel', {}, a.x, a.y, a.z, yaw, () => ({ anim: st.moving ? 'move' : 'idle' }),
      (root) => root.position.set(st.pos.x, st.pos.y, st.pos.z));
  }
  return st;
}

// ------------------------------------------------------------------ Pastell-Garten

function pastelBlock(name) {
  return (level, spec) => {
    const p = v3(spec.pos), s = sz3(spec.size, [2, 1, 2]);
    level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], ice: !!spec.ice, tag: name });
    bakeModel(level, name, { size: [s.x, s.y, s.z] }, p.x, p.y, p.z, 0, 1);
  };
}

export function buildPastellBlume(level, spec) {
  const p = v3(spec.pos), yaw = spec.yaw ?? (p.x * 1.7 + p.z * 0.3) % 6.28;
  if (spec.sway && level.view) { const m = modelObject(level, 'pastell_blume', {}, p.x, p.y, p.z, yaw, {}); m?.root.scale.setScalar(spec.scale ?? 1); }
  else bakeModel(level, 'pastell_blume', {}, p.x, p.y, p.z, yaw, spec.scale ?? 1, {}, { castShadow: false });
}

export function buildHeckenHase(level, spec) {
  const p = v3(spec.pos), sc = spec.scale ?? 1;
  bakeModel(level, 'hecken_hase', {}, p.x, p.y, p.z, spec.yaw ?? 0, sc);
  if (spec.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.7 * sc, y0: p.y, y1: p.y + 1.9 * sc, tag: 'hecken_hase' });
}

export const TYPES = {
  bahnsteig: buildBahnsteig, parallelgleis: buildParallelgleis,
  zirkuszelt: buildZirkuszelt, manege: buildManege, zirkuspodest: buildZirkuspodest, seilbahn: buildSeilbahn,
  rosa_gras: pastelBlock('rosa_gras'), bunter_stein: pastelBlock('bunter_stein'), pastell_blume: buildPastellBlume, hecken_hase: buildHeckenHase,
};
