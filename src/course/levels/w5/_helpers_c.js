// Hilfen für die Welt-5-Level 5-5 „Kawumm im Kristallstollen“, 5-B „Wackelturm am Glutsee“ und 5-6
// „Flipp-Flapp-Tortenland“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an
// (Präzisierung „Leistung und Level-Haken 2“): statische Zier in `LEVEL.build` (landet in den Abschnitts-Meshes,
// Kollision zählt für Umriss/Absturzhöhe), Code je Schritt in `LEVEL.setup` (level.onStep, view.onFrame).
//
//   1) Grundlagen    Farben, kleine Geometrie-Bausteine (Build aus models/lib/kit.js), Daten-Helfer (Inseln, Münzen)
//   2) Mine (5-5)    Lore (fahrende Grubenlore als bewegte Plattform, Registry-Modell 'lore'), Gleise mit Schwellen und
//                    Bockgerüst, rissige Felswand (nur Explosionen/Riesentrank brechen sie), Leuchtkristalle,
//                    Tropfsteine, Glühpilze, Felsbrocken, Erzadern, Lichtschacht am Ausgang, Grubenwimpel
//   3) Glutsee (5-B) steigende Steinsäulen (bewegte Plattform im festen Takt, Runen glühen beim Steigen),
//                    Werfer-Lager, Arena-Zurücksetzen für den Werferturm (Werfer gehört zum Turm)
//   4) Torte (5-6)   Sahnetupfer-Kränze, Streusel, Kerzen, Erdbeeren, Kekse, Schokotropfen, Tortenböden-Stufen,
//                    Bonbon-Zaun, Zuckerwürfel

import * as THREE from 'three';
import { addStatic, addObject, lin, hex } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { MovingBox, modelObject, figures, bakeModel } from '../../blocks/w2kit.js';
import { PathMover } from '../../level/PathMover.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { glowTexture } from '../../blocks/w4kit.js';

export const TAU = Math.PI * 2;
const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
const mixHex = (a, b, t) => {
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return A.lerp(B, Math.max(0, Math.min(1, t))).getHex();
};
/** Licht von oben (Farbe oben heller, unten dunkler) als Build-Farbe. */
const litV = (c, k = 0.7, top = 1.15) => {
  const C = new THREE.Color(c), T = C.clone().multiplyScalar(top), D = C.clone().multiplyScalar(k);
  return { v: (x, y, z, nx, ny) => (ny >= 0 ? C.clone().lerp(T, ny) : C.clone().lerp(D, -ny)) };
};

// ====================================================================== 1) Grundlagen (Daten-Helfer)

/** Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h. o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}
/** Felsblock (Felsdeckel, ohne Unterbau). */
export const rock = (x0, x1, zA, zB, top, h = 4, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'rock', under: 0, ...o });
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie (zeigt einen Sprung an). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/** Statische Zier aus einem Build (leer → nichts). opts wie view.addStatic. */
function bake(level, b, opts = {}) {
  if (!level.view || !b.parts.length) { b.parts = []; return; }
  addStatic(level, b.geometry(), opts);
}

// ====================================================================== 2) Mine (5-5)

const MINE = {
  rail: 0x9aa0b4, railHi: 0xe0e4f0, sleeper: 0x8a5a30, sleeperHi: 0xb87a42, post: 0x6a4424, postHi: 0xa06a3a,
  rock: 0x6a5a4e, rockHi: 0x9a8470, rockLow: 0x3a3028, ore: 0xffc23a, lila: 0xb05aff,
};

/**
 * Gleise (statisch): zwei Stahlschienen mit Holzschwellen von a nach b (y = Schienen-Oberkante), Spur gauge.
 * o: { gauge: 1.44, trestle: true (Bockgerüst bis o.down m hinab, alle 2,5 m), down: 9, sleeper: 0.8 (Abstand) }.
 */
export function rails(level, list, o = {}) {
  const b = new Build();
  for (const R of list) {
    const [ax, ay, az] = R.from, [bx, by, bz] = R.to;
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);
    const gauge = R.gauge ?? o.gauge ?? 1.44, half = gauge / 2;
    const ux = dx / L, uz = dz / L, px = -uz, pz = ux;   // quer zur Fahrtrichtung
    const pitch = Math.atan2(dy, L);
    for (const s of [-1, 1]) {
      const cx = (ax + bx) / 2 + px * half * s, cz = (az + bz) / 2 + pz * half * s, cy = (ay + by) / 2 - 0.06;
      b.box(Math.hypot(L, dy), 0.12, 0.1, { v: (x, y, z, nx, ny) => (ny > 0.5 ? MINE.railHi : MINE.rail) }, { p: [cx, cy, cz], r: [0, yaw, pitch], order: 'YZX' }, 0.02, 1);
    }
    const step = R.sleeper ?? o.sleeper ?? 0.8;
    const n = Math.max(1, Math.floor(L / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = ax + dx * t, y = ay + dy * t - 0.18, z = az + dz * t;
      b.box(0.28, 0.12, gauge + 0.7, { v: (px2, py, pz2, nx, ny) => (ny > 0.5 ? MINE.sleeperHi : MINE.sleeper) }, { p: [x, y, z], r: [0, yaw, 0] }, 0.02, 1);
    }
    if (R.trestle ?? o.trestle) {
      const down = R.down ?? o.down ?? 9;
      const every = 2.5;
      const m = Math.max(1, Math.round(L / every));
      for (let i = 0; i <= m; i++) {
        const t = i / m;
        const x = ax + dx * t, y = ay + dy * t - 0.26, z = az + dz * t;
        for (const s of [-1, 1]) {
          b.box(0.18, down, 0.18, { v: (px2, py, pz2, nx, ny) => mixHex(MINE.post, MINE.postHi, 0.3 + ny * 0.3 + nx * 0.2) }, { p: [x + px * (half + 0.2) * s, y - down / 2, z + pz * (half + 0.2) * s] }, 0.03, 1);
        }
        // Querriegel (Kreuz) unter den Schwellen
        b.box(0.12, 0.12, gauge + 0.6, MINE.post, { p: [x, y - 0.9, z], r: [0, yaw, 0] }, 0.02, 1);
        if (i < m) {
          const x2 = ax + dx * (t + 1 / m), z2 = az + dz * (t + 1 / m);
          const seg = Math.hypot(x2 - x, z2 - z);
          for (const s of [-1, 1]) {
            const mx = (x + x2) / 2 + px * (half + 0.2) * s, mz = (z + z2) / 2 + pz * (half + 0.2) * s;
            b.box(Math.hypot(seg, 2.2), 0.1, 0.1, MINE.post, { p: [mx, y - 2.1, mz], r: [0, yaw, Math.atan2(2.2, seg) * (i % 2 ? 1 : -1)], order: 'YZX' }, 0.02, 1);
          }
        }
      }
    }
    // Prellbock am Ende (rot-weiß)
    for (const end of R.buffers ?? []) {
      const [ex, ey, ez] = end === 'from' ? R.from : R.to;
      const sgn = end === 'from' ? -1 : 1;
      const bx2 = ex + ux * 0.5 * sgn, bz2 = ez + uz * 0.5 * sgn;
      b.box(0.4, 0.6, gauge + 0.4, 0x7a4a26, { p: [bx2, ey + 0.1, bz2], r: [0, yaw, 0] }, 0.04, 1);
      b.box(0.14, 0.34, gauge, { v: (x, y, z) => ((Math.floor((z + x) * 3) & 1) ? 0xffffff : 0xe8322a) }, { p: [bx2 - ux * 0.26 * sgn, ey + 0.3, bz2 - uz * 0.26 * sgn], r: [0, yaw, 0] }, 0.03, 1);
    }
  }
  bake(level, b, { castShadow: o.shadow ?? false });
}

/**
 * Grubenlore als bewegte Plattform (Bauplan 5-5 „bewegliche Plattformen (3–4 m Lücken)“, Auftrag „Loren“): fährt auf
 * einem Gleis hin und her (PathMover, pingpong) und trägt die Figur (MovingBox mit mover). Darstellung: Registry-Modell
 * 'lore' (× scale, Räder drehen beim Fahren). path = Punkte der Schienen-Oberkante unter der Lore-Mitte.
 * spec: { id, path, speed: 2.4, wait: 1.0, phase: 0, scale: 1.6, load: 'erz' | 'kristall' | 'gold' | 'leer', idle }
 * Oberseite = Schienen-Oberkante + 1,1 × scale. level.named.get(id) = { pm, box, mover, shape, start(), stop(), info() }.
 */
export function lore(level, spec) {
  const sc = spec.scale ?? 1.6;
  const pm = new PathMover(spec.path, { speed: spec.speed ?? 2.4, wait: spec.wait ?? 1.0, phase: spec.phase ?? 0, mode: spec.mode });
  const W = 1.4 * sc, D = 1.0 * sc, H = 0.75 * sc, base = 0.35 * sc;   // Wanne über den Rädern
  const a = spec.path[0], b2 = spec.path[spec.path.length - 1];
  const along = Math.abs(b2[0] - a[0]) > Math.abs(b2[2] - a[2]) ? 'x' : 'z';
  const sx = along === 'x' ? W : D, sz = along === 'x' ? D : W;
  const box = new MovingBox(level, pm.pos.x, pm.pos.y + base, pm.pos.z, sx, H, sz, { tag: 'lore', camIgnore: true });
  const handle = {
    pm, box, mover: box.mover, shape: box.shape, running: !spec.idle, rides: 0,
    start() { handle.running = true; }, stop() { handle.running = false; },
    info: () => ({ x: +pm.pos.x.toFixed(2), y: +pm.pos.y.toFixed(2), z: +pm.pos.z.toFixed(2), top: +(box.top).toFixed(2), riders: box.carried(level) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  let speedNow = 0;
  level.onStep((dt) => {
    const ox = pm.pos.x, oz = pm.pos.z;
    if (handle.running) pm.step(dt);
    speedNow = Math.hypot(pm.pos.x - ox, pm.pos.z - oz) / dt;
    box.moveTo(pm.pos.x, pm.pos.y + base, pm.pos.z, dt);
    if (!handle.running || speedNow < 1e-4) box.still();
  });
  if (level.view) {
    const yaw = along === 'x' ? 0 : Math.PI / 2;
    const m = modelObject(level, 'lore', { load: spec.load ?? 'erz' }, pm.pos.x, pm.pos.y, pm.pos.z, yaw, () => ({ anim: speedNow > 0.05 ? 'drive' : 'idle', speed: speedNow }),
      (root) => { root.position.set(pm.pos.x, pm.pos.y, pm.pos.z); });
    if (m) m.root.scale.setScalar(sc);
  }
  return handle;
}

/** Abgestellte Lore (Kulisse, in die statische Geometrie gebacken): [x, y (Schiene), z, yaw, load, scale]. */
export function parkedLore(level, list) {
  if (!level.view) return;
  for (const [x, y, z, yaw = 0, load = 'kristall', sc = 1.3] of list) bakeModelSafe(level, 'lore', { load }, x, y, z, yaw, sc);
}

/** Registry-Modell in die statische Geometrie backen (bakeModel aus w2kit). */
export function bakeModelSafe(level, name, opts, x, y, z, yaw = 0, sc = 1) {
  try { bakeModel(level, name, opts, x, y, z, yaw, sc); } catch (err) { console.error(`[Welt 5] Modell ${name}:`, err.message); }
}

/**
 * Rissige Felswand (Bauplan 5-5 „rissige Wand mit Geheimgang“): fester Felsblock mit glühenden Rissen. Nur eine
 * Explosion (Zündkopf, Kickbombe – owner.onHit('bomb')) oder der Riesentrank ('mega') sprengt sie: Brocken fliegen,
 * Staub, die Wand verschwindet, onBreak (Aktion) läuft. Stampfen, Tatzenhieb, Feuer prallen ab (sie wackelt kurz).
 * spec: { id, pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d], onBreak, color }
 * level.named.get(id) = { broken, hits, info() }.
 */
export function risswand(level, spec) {
  const [x, y, z] = spec.pos, [w, h, d] = spec.size ?? [1, 3.5, 4];
  const handle = { broken: false, hits: 0, shake: 0, info: () => ({ broken: handle.broken, hits: handle.hits }) };
  const shape = { type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], breakable: 'bomb', tag: 'risswand', owner: handle };
  const sid = level.world.add(shape);
  handle.onHit = (kind) => {
    if (handle.broken) return;
    if (kind !== 'bomb' && kind !== 'mega') { handle.shake = 0.25; level.sfx('blockhit'); return; }
    handle.broken = true;
    level.world.remove(sid);
    level.sfx('brickbreak'); level.sfx('slam');
    level.shake(0.5);
    for (let i = 0; i < 4; i++) level.effects?.debris({ x, y: y + 0.6 + i * 0.8, z: z + (i - 1.5) * d * 0.25 }, 0x8a6a50, 6);
    level.effects?.dust({ x, y: y + 0.3, z }, 14, 2.4);
    runAction(level, spec.onBreak, { pos: [x, y + h / 2, z], source: handle });
  };
  handle.onBump = () => { handle.shake = 0.2; };
  handle.onPound = () => { handle.shake = 0.2; };
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view) return handle;
  // Fels mit Rissen: Körper (beleuchtet) + glühende Risse (unbeleuchtet) als eine Gruppe
  const rockB = new Build(), glowB = new Build();
  const nx = Math.max(2, Math.round(w / 0.9)), ny = Math.max(2, Math.round(h / 0.9)), nz = Math.max(2, Math.round(d / 0.9));
  const g = new THREE.BoxGeometry(w, h, d, nx, ny, nz);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const px = P.getX(i), py = P.getY(i), pz = P.getZ(i);
    const k = 0.06 * (hash(px * 3.1, py * 2.3, pz * 1.7) - 0.5);
    P.setXYZ(i, px * (1 + k), py, pz * (1 + k));
  }
  g.computeVertexNormals();
  rockB.add(g, { v: (px, py, pz, nX, nY) => mixHex(0x5a4a40, 0x9a8474, 0.45 + nY * 0.3 + hash(px * 4, py * 4, pz * 4) * 0.25) }, { p: [0, h / 2, 0] });
  // Risse: gezackte, hell glühende Linien auf allen vier Seiten (je zwei Äste) – auch von der Kamera aus gut lesbar
  const crack = (faceX, s, seed) => {
    const span = faceX ? d : w, off = (faceX ? w : d) / 2 + 0.02;
    for (const branch of [0, 1]) {
      let cy = h * (0.08 + branch * 0.1), cu = (hash(s, seed, branch) - 0.5) * span * 0.5;
      for (let k = 0; k < 8; k++) {
        const ny2 = cy + h * 0.105, nu = Math.max(-span / 2 + 0.15, Math.min(span / 2 - 0.15, cu + (hash(k, s, seed + branch) - 0.5) * span * 0.45));
        const len = Math.hypot(ny2 - cy, nu - cu), ang = Math.atan2(ny2 - cy, nu - cu);
        const wd = 0.15 - k * 0.012;
        const col = k < 3 ? 0xfff0a0 : 0xffa040;
        if (faceX) glowB.box(0.03, wd, len + 0.08, { v: () => col }, { p: [s * off, (cy + ny2) / 2, (cu + nu) / 2], r: [-ang, 0, 0] }, 0, 1);
        else glowB.box(len + 0.08, wd, 0.03, { v: () => col }, { p: [(cu + nu) / 2, (cy + ny2) / 2, s * off], r: [0, 0, ang] }, 0, 1);
        cy = ny2; cu = nu;
        if (cy > h - 0.3) break;
      }
    }
  };
  crack(true, -1, 1); crack(true, 1, 2); crack(false, -1, 3); crack(false, 1, 4);
  const group = new THREE.Group();
  group.name = 'zier:risswand';
  const rockM = new THREE.Mesh(rockB.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  rockM.castShadow = true; rockM.receiveShadow = true;
  const glowM = new THREE.Mesh(glowB.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  group.add(rockM, glowM);
  group.position.set(x, y, z);
  const holder = {};
  let t = 0, gone = 0;
  addObject(level, group, (dt) => {
    const dd = visDt(level, holder, dt);
    t += dd;
    if (handle.shake > 0) { handle.shake -= dd; group.position.x = x + Math.sin(t * 60) * 0.05; } else group.position.x = x;
    glowM.material.color.setScalar(0.75 + 0.25 * Math.sin(t * 2.4));
    if (handle.broken && group.visible) {
      gone += dd;
      group.scale.set(1, Math.max(0.01, 1 - gone * 3), 1);
      if (gone > 0.33) group.visible = false;
    }
  });
  return handle;
}

/** Leuchtkristalle (unbeleuchtet hell): [x, y, z, size, color, tilt]. glow: true → Glüh-Material. */
export function crystals(level, list, o = {}) {
  const b = new Build();
  for (const [x, y, z, s = 1, color = 0x7ae8ff, tilt = 0] of list) {
    const lo = mixHex(color, 0x1a0a2a, 0.45);
    const n = o.n ?? 5;
    for (let k = 0; k < n; k++) {
      const a = k * 2.399 + x * 1.7 + z;
      const hh = s * (1.0 - k * 0.13) * (0.8 + hash(x, z, k) * 0.4);
      const g = new THREE.OctahedronGeometry(0.2 * s, 0);
      g.scale(0.75, hh / (0.2 * s) * 0.62, 0.75);
      const rr = k ? 0.26 * s : 0;
      b.add(g, { v: (px, py) => (py > 0 ? color : lo) }, { p: [x + Math.cos(a) * rr, y + hh * 0.5, z + Math.sin(a) * rr], r: [Math.sin(a) * (0.35 + tilt), 0, Math.cos(a) * (0.35 + tilt)] });
    }
  }
  bake(level, b, { material: 'glow', castShadow: false });
}

/** Tropfsteine (hängend: len < 0 von y herab) und Stalagmiten (len > 0): [x, y, z, len, r]. */
export function dripstones(level, list) {
  const b = new Build();
  for (const [x, y, z, len, r = 0.4] of list) {
    const L = Math.abs(len);
    const v = { v: (px, py, pz, nx, ny) => mixHex(0x5a4438, 0xc89a78, 0.35 + ny * 0.25 + (len > 0 ? (py / L + 0.5) * 0.3 : (0.5 - py / L) * 0.3)) };
    if (len < 0) b.cone(r, L, v, { p: [x, y - L / 2, z], r: [Math.PI, 0, 0] }, 7);
    else b.cone(r, L, v, { p: [x, y + L / 2, z] }, 7);
    // kleiner Begleiter
    const r2 = r * 0.55, L2 = L * 0.55;
    if (len < 0) b.cone(r2, L2, v, { p: [x + r * 1.1, y - L2 / 2, z + r * 0.4], r: [Math.PI, 0, 0] }, 6);
    else b.cone(r2, L2, v, { p: [x + r * 1.1, y + L2 / 2, z - r * 0.4] }, 6);
  }
  bake(level, b, { castShadow: false });
}

/** Glühpilze (Pilzwiese im Stollen): [x, y, z, size, color]. Stiel hell, Hut leuchtend mit Tupfen. */
export function glowShrooms(level, list) {
  const stem = new Build(), cap = new Build();
  for (const [x, y, z, s = 0.6, color = 0x6ae0ff] of list) {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + x, rr = k ? s * 0.7 : 0, sk = k ? 0.6 : 1;
      const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, hh = s * 0.9 * sk;
      stem.cyl(0.07 * s * sk * 1.6, 0.1 * s * sk * 1.6, hh, litV(0xf4ecdc), { p: [px, y + hh / 2, pz] }, 7);
      cap.dome(0.34 * s * sk * 1.4, { v: (qx, qy) => (qy > 0.12 * s ? color : mixHex(color, 0xffffff, 0.5)) }, { p: [px, y + hh, pz], s: [1, 0.62, 1] }, Math.PI / 2, 10, 4);
    }
  }
  bake(level, stem, { castShadow: false });
  bake(level, cap, { material: 'glow', castShadow: false });
}

/** Felsbrocken (Haufen): [x, y, z, size, n]. */
export function boulders(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 1, n = 3] of list) {
    for (let k = 0; k < n; k++) {
      const a = k * 2.3 + x * 0.7, rr = k ? s * 0.8 : 0, ss = s * (k ? 0.55 + hash(x, k) * 0.3 : 1);
      const g = new THREE.IcosahedronGeometry(ss * 0.6, 0);
      b.add(g, { v: (px, py, pz, nx, ny) => mixHex(MINE.rockLow, MINE.rockHi, 0.4 + ny * 0.4 + hash(px * 5, pz * 5) * 0.2) }, { p: [x + Math.cos(a) * rr, y + ss * 0.38, z + Math.sin(a) * rr], r: [hash(k, x) * 3, hash(z, k) * 3, 0], s: [1.2, 0.8, 1] });
    }
  }
  bake(level, b, {});
}

/** Erzadern an Felswänden: glühende Goldflecken. list = [x, y, z, face ('+x'|'-x'|'+z'), n, spread]. */
export function oreVeins(level, list) {
  const b = new Build();
  for (const [x, y, z, face = '+x', n = 6, spread = 2, color = MINE.ore] of list) {
    for (let k = 0; k < n; k++) {
      const u = (hash(x, z, k) - 0.5) * spread * 2, v = (hash(z, k, x) - 0.5) * spread;
      const g = new THREE.OctahedronGeometry(0.12 + hash(k, x) * 0.12, 0);
      const p = face === '+x' || face === '-x' ? [x, y + v, z + u] : [x + u, y + v, z];
      b.add(g, { v: (px, py) => (py > 0 ? color : mixHex(color, 0x4a2a0a, 0.4)) }, { p, r: [k, k * 0.7, 0], s: [1, 0.7, 1] });
    }
  }
  bake(level, b, { material: 'glow', castShadow: false });
}

/** Holzplanken-Boden (Steg) auf y: Rechteck x0..x1, z0..z1, Bretter quer zu z. */
export function planks(level, list) {
  const b = new Build();
  for (const [x0, x1, za, zb, y, along = 'x'] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    if (along === 'x') {
      const n = Math.max(1, Math.round((z1 - z0) / 0.5));
      for (let i = 0; i < n; i++) {
        const z = z0 + (i + 0.5) * (z1 - z0) / n;
        b.box(x1 - x0 - 0.06, 0.08, (z1 - z0) / n - 0.06, { v: (px, py, pz, nx, ny) => mixHex(0x9a6436, 0xd8a060, 0.4 + ny * 0.2 + hash(i, x0) * 0.25) }, { p: [(x0 + x1) / 2, y + 0.04, z] }, 0.02, 1);
      }
    } else {
      const n = Math.max(1, Math.round((x1 - x0) / 0.5));
      for (let i = 0; i < n; i++) {
        const x = x0 + (i + 0.5) * (x1 - x0) / n;
        b.box((x1 - x0) / n - 0.06, 0.08, z1 - z0 - 0.06, { v: (px, py, pz, nx, ny) => mixHex(0x9a6436, 0xd8a060, 0.4 + ny * 0.2 + hash(i, z0) * 0.25) }, { p: [x, y + 0.04, (z0 + z1) / 2] }, 0.02, 1);
      }
    }
  }
  bake(level, b, { castShadow: false });
}

/**
 * Bohlenweg (Stollenboden aus Brettern quer zur Laufrichtung, zwei Längsbalken, Nagelköpfe), 6 cm über dem Boden:
 * [x0, x1, zA, zB, y]. Ohne Kollision (liegt flach auf dem Boden).
 */
export function walkways(level, list) {
  const b = new Build();
  for (const [x0, x1, za, zb, y] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb), W = x1 - x0, cx = (x0 + x1) / 2;
    const n = Math.max(1, Math.round((z1 - z0) / 0.42));
    for (let i = 0; i < n; i++) {
      const z = z0 + (i + 0.5) * (z1 - z0) / n, t = hash(i, x0, z0);
      const w = W - 0.1 - (t > 0.8 ? 0.3 : 0);
      b.box(w, 0.07, (z1 - z0) / n - 0.05, { v: (px, py, pz, nx, ny) => mixHex(0x8a5428, 0xd09858, 0.35 + ny * 0.2 + t * 0.3) }, { p: [cx + (t - 0.5) * 0.12, y + 0.045, z], r: [0, (t - 0.5) * 0.04, 0] }, 0, 1);
      if (i % 3 === 0) for (const s of [-1, 1]) b.box(0.05, 0.03, 0.05, 0x3a3a48, { p: [cx + s * (W / 2 - 0.25), y + 0.095, z] }, 0, 1);
    }
    for (const s of [-1, 1]) b.box(0.16, 0.12, z1 - z0, { v: (px, py, pz, nx, ny) => mixHex(0x6a4020, 0xa06a38, 0.4 + ny * 0.3) }, { p: [cx + s * (W / 2 + 0.06), y + 0.06, (z0 + z1) / 2] }, 0, 1);
  }
  bake(level, b, { castShadow: false });
}

/** Steinplatten und Kiesel auf dem Stollenboden (flach, kein Schatten): [x0, x1, zA, zB, y, n, palette]. */
export function floorStones(level, list) {
  const b = new Build();
  const PAL = { grau: [0x7a6a62, 0x9a8a7e, 0x5e5048], lila: [0x8a6a9a, 0xa88ab8, 0x6a5078], gold: [0xb8925a, 0xd8b070, 0x8a6a3a] };
  for (const [x0, x1, za, zb, y, n = 20, pal = 'grau'] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb), P = PAL[pal] ?? PAL.grau;
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(i, x0, z1) * (x1 - x0), z = z0 + hash(z0, i, x1) * (z1 - z0);
      const big = hash(i, 3, x0) > 0.55;
      const r = big ? 0.35 + hash(i, 5) * 0.35 : 0.08 + hash(i, 7) * 0.1;
      const g = new THREE.CylinderGeometry(r, r * 1.08, big ? 0.06 : 0.1, big ? 6 : 5, 1);
      b.add(g, { v: (px, py, pz, nx, ny) => mixHex(P[2], ny > 0.5 ? P[1] : P[0], 0.5 + ny * 0.4) }, { p: [x, y + (big ? 0.025 : 0.05), z], r: [0, hash(i, 9) * 3, 0], s: [1, 1, 0.75 + hash(i, 11) * 0.4] });
    }
  }
  bake(level, b, { castShadow: false });
}

/**
 * Wandverkleidung aus lila Ziegeln (Mauerwerk im Verband, Fugen dunkel) auf einer Felswand: [x|z, y0, a0, a1, h, face].
 * face '+x' | '-x': Wand liegt bei x, Fläche zeigt nach ±x, a0..a1 = z-Bereich; '+z' | '-z': bei z, a0..a1 = x-Bereich.
 */
export function brickPanels(level, list) {
  const b = new Build();
  for (const [w, y0, a0, a1, h, face] of list) {
    const BW = 0.62, BH = 0.31, rows = Math.max(1, Math.round(h / BH));
    const len = Math.abs(a1 - a0), lo = Math.min(a0, a1);
    const sgn = face[0] === '+' ? 1 : -1, alongZ = face[1] === 'x';
    // Fugenplatte dahinter
    if (alongZ) b.box(0.06, h, len, 0x3a1e4a, { p: [w + sgn * 0.03, y0 + h / 2, lo + len / 2] }, 0, 1);
    else b.box(len, h, 0.06, 0x3a1e4a, { p: [lo + len / 2, y0 + h / 2, w + sgn * 0.03] }, 0, 1);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * BW / 2;
      const nb = Math.ceil(len / BW) + 1;
      for (let k = 0; k < nb; k++) {
        const a = lo - off + k * BW + BW / 2;
        const aa = Math.max(lo + 0.02, a - BW / 2 + 0.03), ab = Math.min(lo + len - 0.02, a + BW / 2 - 0.03);
        if (ab - aa < 0.12) continue;
        const t = hash(r, k, w);
        const col = mixHex(0x7a3aa8, 0xc07aff, 0.3 + t * 0.45);
        const yy = y0 + r * BH + BH / 2;
        // Ziegel als Fläche (2 Dreiecke) vor der Fugenplatte; obere Kante etwas heller
        const q = new THREE.PlaneGeometry(ab - aa, BH - 0.05);
        const hi = mixHex(col, 0xffffff, 0.18);
        if (alongZ) b.add(q, { v: (px, py) => (py > (BH - 0.05) * 0.3 ? hi : col) }, { p: [w + sgn * 0.07, yy, (aa + ab) / 2], r: [0, sgn * Math.PI / 2, 0] });
        else b.add(q, { v: (px, py) => (py > (BH - 0.05) * 0.3 ? hi : col) }, { p: [(aa + ab) / 2, yy, w + sgn * 0.07], r: [0, sgn > 0 ? 0 : Math.PI, 0] });
      }
    }
  }
  bake(level, b, { castShadow: false });
}

/**
 * Holz-Stützen an den Stollenwänden (Pfosten + schräge Strebe + Kappe), alle `every` m: [x, y, zA, zB, h, face, every].
 * face '+x' | '-x' = Wand bei x (Stütze steht davor).
 */
export function wallTimbers(level, list) {
  const b = new Build();
  const wood = (t) => ({ v: (px, py, pz, nx, ny) => mixHex(0x6a4020, 0xb07a40, 0.35 + nx * 0.15 + ny * 0.2 + t * 0.2) });
  for (const [x, y, za, zb, h = 5, face = '+x', every = 5] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb), sgn = face === '+x' ? 1 : -1;
    const n = Math.max(1, Math.round((z1 - z0) / every));
    for (let i = 0; i <= n; i++) {
      const z = z0 + i * (z1 - z0) / n, t = hash(i, x);
      b.box(0.3, h, 0.3, wood(t), { p: [x + sgn * 0.18, y + h / 2, z] }, 0.04, 1);
      b.box(0.5, 0.26, 0.5, 0x3a3a48, { p: [x + sgn * 0.2, y + h - 0.13, z] }, 0.03, 1);
      if (i < n) b.box(0.18, Math.hypot((z1 - z0) / n, 1.4), 0.18, wood(t * 0.7), { p: [x + sgn * 0.14, y + h - 0.9, z + (z1 - z0) / n / 2], r: [Math.atan2((z1 - z0) / n, 1.4) * (i % 2 ? 1 : -1), 0, 0] }, 0.03, 1);
    }
    b.box(0.26, 0.3, z1 - z0 + 0.3, wood(0.5), { p: [x + sgn * 0.16, y + h + 0.15, (z0 + z1) / 2] }, 0.04, 1);
  }
  bake(level, b, {});
}

/**
 * Leuchtender Kristallsee tief unten in Schlucht und Grube (eine Fläche, unbeleuchtet, schimmert): o: { x0, x1, z0, z1, y }.
 * Dazu große Kristallspitzen, die aus dem See ragen (statisch, Glüh-Material).
 */
export function crystalLake(level, o) {
  if (!level.view) return;
  const W = o.x1 - o.x0, D = Math.abs(o.z1 - o.z0), cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
  const g = new THREE.PlaneGeometry(W, D, 1, 1);
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: false, depthWrite: true,
    uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(o.colorA ?? 0x2a0a5a) }, uB: { value: new THREE.Color(o.colorB ?? 0xb06aff) }, uC: { value: new THREE.Color(o.colorC ?? 0x5ae0ff) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; varying vec3 vW; void main(){ float a = sin(vW.x*0.35 + uT*0.6) * sin(vW.z*0.28 - uT*0.45); float b = sin(vW.x*0.9 - vW.z*0.7 + uT*1.3); float k = smoothstep(0.2, 1.0, a*0.5+0.5); float s = smoothstep(0.85, 1.0, b*0.5+0.5); vec3 col = mix(uA, uB, k*0.7) + uC * s * 0.35; gl_FragColor = vec4(col, 1.0);\n#include <colorspace_fragment>\n}',
  });
  const m = new THREE.Mesh(g, mat);
  m.position.set(cx, o.y, cz);
  m.name = 'kristallsee';
  const holder = {};
  addObject(level, m, (dt) => { mat.uniforms.uT.value += visDt(level, holder, dt); });
  const spikes = [];
  for (let i = 0; i < (o.spikes ?? 10); i++) {
    const x = o.x0 + hash(i, 1, o.y) * W, z = Math.min(o.z0, o.z1) + hash(i, 2, o.y) * D;
    spikes.push([x, o.y, z, 2 + hash(i, 3) * 3, [0xb07aff, 0x7ae8ff, 0xff7ad8][i % 3], 0.2]);
  }
  crystals(level, spikes, { n: 4 });
}

/** Moosteppich (Glühpilz-Wiese): weiche, unregelmäßige Flecken in Türkis/Grün mit Halmen: [x0, x1, zA, zB, y, n]. */
export function mossPatches(level, list) {
  const b = new Build();
  for (const [x0, x1, za, zb, y, n = 14] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(i, 2, x0) * (x1 - x0), z = z0 + hash(i, 4, z0) * (z1 - z0), r = 0.7 + hash(i, 6) * 0.9;
      const g = new THREE.CircleGeometry(r, 9);
      const P = g.attributes.position;
      for (let k = 1; k < P.count; k++) { const kk = 0.75 + hash(i, k) * 0.4; P.setXY(k, P.getX(k) * kk, P.getY(k) * kk); }
      g.rotateX(-Math.PI / 2);
      b.add(g, { v: (px, py, pz) => mixHex(0x1e6a5a, 0x4ac08a, 0.35 + hash(Math.round(px * 3), Math.round(pz * 3)) * 0.5) }, { p: [x, y + 0.015 + i * 0.0005, z] });
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + i, rr = r * 0.6 * hash(i, k, 3);
        b.cone(0.05, 0.22 + hash(k, i) * 0.2, { v: (px, py) => (py > 0 ? 0x8af0b0 : 0x2a8a6a) }, { p: [x + Math.cos(a) * rr, y + 0.12, z + Math.sin(a) * rr], r: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] }, 4);
      }
    }
  }
  bake(level, b, { castShadow: false });
}

/** Warmer Lichtschein um Lampen (ein Punkte-Objekt, additiv): list = [[x, y, z, size, color]]. Flackert sacht. */
export function lampHalos(level, list, o = {}) {
  if (!level.view) return null;
  const n = list.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  list.forEach(([x, y, z, s, c = 0xffb44a], i) => {
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const C = new THREE.Color(c); col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ map: glowTexture(), size: o.size ?? 2.6, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, sizeAttenuation: true });
  const pts = new THREE.Points(g, mat);
  pts.name = 'zier:lampenschein';
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  const holder = {};
  let t = 0;
  addObject(level, pts, (dt) => { t += visDt(level, holder, dt); mat.opacity = 0.5 + 0.08 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1); });
  return pts;
}

/**
 * Warme Lichtkegel auf dem Boden unter Lampen (additive Leuchtflecken, alle in einem Objekt = 1 Zeichenaufruf):
 * [x, y (Boden), z, r, color].
 */
export function lightPools(level, list, o = {}) {
  if (!level.view || !list.length) return null;
  const n = list.length;
  const pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), col = new Float32Array(n * 12), idx = [];
  list.forEach(([x, y, z, r = 3, c = 0xffb050], i) => {
    const C = new THREE.Color(c);
    const P = [[-r, -r], [r, -r], [r, r], [-r, r]];
    P.forEach(([dx, dz], k) => {
      pos.set([x + dx, y + 0.13 + i * 0.0005, z + dz], i * 12 + k * 3);
      col.set([C.r, C.g, C.b], i * 12 + k * 3);
    });
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
    const b = i * 4;
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const mat = new THREE.MeshBasicMaterial({ map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o.opacity ?? 0.6, toneMapped: false });
  const m = new THREE.Mesh(g, mat);
  m.name = 'zier:lichtkegel';
  m.renderOrder = 2;
  const holder = {};
  let t = 0;
  addObject(level, m, (dt) => { t += visDt(level, holder, dt); mat.opacity = (o.opacity ?? 0.6) * (0.92 + 0.06 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 13.1)); });
  return m;
}

/** Glasur-Kleckse (Torte): flache, wellig gerandete Flecken mit glänzendem Rand: [x, y, z, r, color]. */
export function icingSplats(level, list) {
  const b = new Build();
  list.forEach(([x, y, z, r = 1, col = 0xffd23d], i) => {
    const g = new THREE.CircleGeometry(r, 14);
    const P = g.attributes.position;
    for (let k = 1; k < P.count; k++) { const a = Math.atan2(P.getY(k), P.getX(k)); const kk = 0.8 + 0.2 * Math.sin(a * 5 + i) + 0.1 * Math.sin(a * 9 + i * 2); P.setXY(k, P.getX(k) * kk, P.getY(k) * kk); }
    g.rotateX(-Math.PI / 2);
    b.add(g, { v: (px, py, pz) => (Math.hypot(px, pz) > r * 0.6 ? mixHex(col, 0xffffff, 0.12) : col) }, { p: [x, y + 0.03 + i * 0.0007, z] });
    b.sphere(r * 0.18, mixHex(col, 0xffffff, 0.5), { p: [x - r * 0.3, y + 0.04, z - r * 0.2], s: [1, 0.25, 1] }, 8, 3);
  });
  bake(level, b, { castShadow: false });
}

/** Schokotropfen (kleine braune Tropfenkegel) verstreut: [x0, x1, zA, zB, y, n]. */
export function chocoDrops(level, list) {
  const b = new Build();
  for (const [x0, x1, za, zb, y, n = 10] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(i, 13, x0) * (x1 - x0), z = z0 + hash(z0, 17, i) * (z1 - z0), s = 0.6 + hash(i, 19) * 0.6;
      b.lathe([[0, 0], [0.18 * s, 0.03 * s], [0.16 * s, 0.12 * s], [0.07 * s, 0.24 * s], [0, 0.34 * s]], { v: (px, py, pz, nx, ny) => mixHex(0x4a200e, 0x8a4a2a, 0.4 + ny * 0.3 + nx * 0.2) }, { p: [x, y, z] }, 7);
    }
  }
  bake(level, b, { castShadow: false });
}

/** Streusel auf einer Rampe (steigt entlang z von y0 bei z0 auf y1 bei z1): [x0, x1, z0, z1, y0, y1, n]. */
export function rampSprinkles(level, list) {
  const b = new Build();
  for (const [x0, x1, z0, z1, y0, y1, n = 40] of list) {
    for (let i = 0; i < n; i++) {
      const t = hash(i, 21, z0), x = x0 + hash(i, 23, x0) * (x1 - x0), z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t;
      b.capsule(0.035, 0.16, SPRINKLE[i % SPRINKLE.length], { p: [x, y + 0.05, z], r: [Math.PI / 2, hash(i, 7) * TAU, 0], order: 'YXZ' }, 1, 4);
    }
  }
  bake(level, b, { castShadow: false });
}

/** Grubenwimpel (Wimpelkette zwischen zwei Punkten): [[x,y,z], [x,y,z], n]. */
export function pennantLines(level, list) {
  const b = new Build();
  const cols = [0xff4a6a, 0xffd23d, 0x5ad0ff, 0x9a6aff, 0x6ae06a];
  for (const [A, B, n = 8, sag = 0.8] of list) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - Math.sin(t * Math.PI) * sag, A[2] + (B[2] - A[2]) * t]);
    }
    b.tube(pts, 0.025, 0x4a3a2a, null, 16, 4);
    const yaw = Math.atan2(-(B[2] - A[2]), B[0] - A[0]);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - Math.sin(t * Math.PI) * sag, A[2] + (B[2] - A[2]) * t];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0], 3));
      g.computeVertexNormals();
      const g2 = g.clone(); g2.rotateY(Math.PI);
      b.add(g, cols[k % cols.length], { p, r: [0, yaw, 0] });
      b.add(g2, cols[k % cols.length], { p, r: [0, yaw, 0] });
    }
  }
  bake(level, b, { castShadow: false });
}

/**
 * Lichtschacht (Ausgang der Mine): heller Kegel von oben (additiv, ohne Tiefenschreiben) mit Staubkörnchen.
 * o: { pos: [x, y (Boden), z], r: 3, h: 16, color }
 */
export function lightShaft(level, o) {
  if (!level.view) return;
  const [x, y, z] = o.pos, r = o.r ?? 3, h = o.h ?? 16;
  const g = new THREE.CylinderGeometry(r * 0.55, r, h, 20, 1, true);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(o.color ?? 0xfff2c0) }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 wp = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-wp.xyz); gl_Position = projectionMatrix * wp; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(1.0 - abs(dot(vN, vV)), 0.6); float fall = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y)); float rays = 0.75 + 0.25 * sin(vUv.x * 40.0 + uT * 0.6); gl_FragColor = vec4(uColor * (0.33 * (1.0 - edge * 0.7) * fall * rays), 1.0);\n#include <colorspace_fragment>\n}',
  });
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z);
  m.name = 'zier:lichtschacht';
  m.renderOrder = 3;
  const holder = {};
  addObject(level, m, (dt) => { mat.uniforms.uT.value += visDt(level, holder, dt); });
}

/** Schild mit Zündkopf-Warnung etc.: nutzt den Baustein sign (Daten). */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });

// ====================================================================== 3) Glutsee (5-B)

/**
 * Steigende Steinsäule (Bauplan 5-B „2 steigende Steinsäulen, wechselnd“): achteckige Basaltsäule mit Runenband; fährt
 * im festen Takt aus der Lava hoch, hält oben, sinkt, hält unten (bewegte Plattform, trägt die Figur). Runen glühen beim
 * Steigen. spec: { id, pos: [x, z], low, high, size: 2.6 (Kantenlänge), hold: 2.4, move: 2.6, phase: 0..1, base (Unterkante,
 * Lava-Grund) } → level.named.get(id) = { y (Oberseite), state ('low'|'up'|'high'|'down'), box, info() }.
 */
export function steinsaeule(level, spec) {
  const [x, z] = spec.pos;
  const low = spec.low, high = spec.high, S = spec.size ?? 2.6, base = spec.base ?? low - 6;
  const hold = spec.hold ?? 2.4, move = spec.move ?? 2.6, T = 2 * (hold + move);
  const box = new MovingBox(level, x, base, z, S, low - base, S, { tag: 'steinsaeule', camIgnore: true });
  const yAt = (t) => {
    const u = (((t / T + (spec.phase ?? 0)) % 1) + 1) % 1 * T;
    const ease = (k) => k * k * (3 - 2 * k);
    if (u < hold) return { y: low, s: 'low' };
    if (u < hold + move) return { y: low + (high - low) * ease((u - hold) / move), s: 'up' };
    if (u < 2 * hold + move) return { y: high, s: 'high' };
    return { y: high - (high - low) * ease((u - 2 * hold - move) / move), s: 'down' };
  };
  const handle = { y: low, state: 'low', box, cycles: 0, info: () => ({ y: +handle.y.toFixed(2), state: handle.state, riders: box.carried(level) }) };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt, time) => {
    const r = yAt(time);
    if (r.s === 'up' && handle.state === 'low') handle.cycles++;
    handle.state = r.s;
    handle.y = r.y;
    // Körper wächst nach oben (Unterkante bleibt am Lava-Grund): Höhe ändern, Mitnahme über dy
    const top = r.y, h = top - base;
    const m = box.mover;
    const oldTop = box.top;
    m.dx = 0; m.dz = 0; m.dy = top - oldTop; m.vx = 0; m.vz = 0; m.vy = dt > 0 ? m.dy / dt : 0; m.cx = x; m.cz = z;
    if (Math.abs(m.dy) > 1e-6) box.resize(S, h, S); else box.still();
  });
  if (!level.view) return handle;
  // Darstellung: Säule (Höhe 1 m, skaliert), Kappe, Runen (glühen beim Steigen)
  const body = new Build(), glow = new Build();
  const oct = new THREE.CylinderGeometry(S * 0.62, S * 0.66, 1, 8, 4);
  oct.rotateY(Math.PI / 8);
  oct.translate(0, 0.5, 0);
  body.add(oct, { v: (px, py, pz, nx, ny) => mixHex(0x4a3a4e, 0x9a86a0, 0.35 + nx * 0.2 + nz2(pz) * 0.15 + hash(Math.floor(py * 4), Math.round(Math.atan2(pz, px) * 2)) * 0.25) });
  const capB = new Build();
  capB.cyl(S * 0.7, S * 0.7, 0.32, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? (Math.hypot(px, pz) > S * 0.55 ? 0xffc83a : mixHex(0xb8a0c0, 0xe0d0e8, hash(Math.floor(px * 2), Math.floor(pz * 2)))) : 0x6a4a3a) }, { p: [0, -0.16, 0], r: [0, Math.PI / 8, 0] }, 8);
  capB.torus(S * 0.66, 0.07, 0xffd04a, { p: [0, 0.0, 0], r: [Math.PI / 2, 0, 0] }, 4, 24);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + Math.PI / 8;
    glow.box(0.42, 0.42, 0.04, { v: () => 0xffffff }, { p: [Math.cos(a) * S * 0.62 * 0.93, -0.75, Math.sin(a) * S * 0.62 * 0.93], r: [0, -a + Math.PI / 2, Math.PI / 4] }, 0, 1);
  }
  const group = new THREE.Group();
  group.name = 'zier:steinsaeule';
  const bodyM = new THREE.Mesh(body.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  bodyM.castShadow = true; bodyM.receiveShadow = true;
  const capM = new THREE.Mesh(capB.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
  capM.castShadow = true; capM.receiveShadow = true;
  const runeMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xff7a2a });
  const runeM = new THREE.Mesh(glow.geometry(), runeMat);
  group.add(bodyM, capM, runeM);
  addObject(level, group, () => {
    const top = handle.y;
    bodyM.position.set(x, base, z);
    bodyM.scale.set(1, Math.max(0.01, top - base), 1);
    capM.position.set(x, top, z);
    runeM.position.set(x, top, z);
    const k = handle.state === 'up' ? 1 : handle.state === 'high' ? 0.75 : handle.state === 'down' ? 0.45 : 0.25;
    runeMat.color.setRGB(1 * k + 0.2, 0.45 * k + 0.08, 0.12 * k + 0.02);
  });
  return handle;
}
const nz2 = (z) => Math.sin(z * 3.1) * 0.5;

/**
 * Arena mit Werferturm: Der Werfer obenauf ist eine eigene Entität, die der Turm selbst erzeugt (ihre Daten haben kein
 * `kind`). Der Arena-Archetyp erzeugt beim Neustart (Tod) alle gezählten Gegner aus ihren Daten neu – der Werfer entstünde
 * dabei ohne Art (Warnung) bzw. doppelt. Dieser Haken baut nur den Turm aus den Daten neu (der bringt seinen Werfer mit)
 * und zählt dessen Werfer. Aufruf in LEVEL.setup (nach dem Archetyp).
 */
export function arenaTowerFix(level, towerId, riderId) {
  const arch = level.archetype;
  if (!arch?.resetArena) return;
  const orig = arch.resetArena.bind(arch);
  arch.resetArena = () => {
    // Der Werfer hat keine eigenen Level-Daten (der Turm erzeugt ihn, spec ohne kind): nicht aus den Daten neu bauen
    const all = arch.specs;
    arch.specs = all.filter((sp) => sp?.kind);
    orig();
    arch.specs = all;
    for (const e of [...arch.members]) {
      if (e.kind === 'feuer_werfer' && e.spec?.id === riderId && !e.riding) {
        e.kill();
        arch.counted.delete(e);
        arch.members.splice(arch.members.indexOf(e), 1);
      }
    }
    const tower = arch.members.find((e) => e.kind === 'werferturm');
    if (tower?.rider && !arch.counted.has(tower.rider)) {
      arch.counted.add(tower.rider);
      arch.members.push(tower.rider);
      if (riderId) level.named.set(riderId, tower.rider);
    }
    if (towerId && tower) level.named.set(towerId, tower);
    arch.left = arch.counted.size;
    arch.hud?.arena({ left: arch.left, total: arch.total });
  };
}

/** Glimmende Lava-Spalten auf dem Felsboden (unbeleuchtet, kein Schatten): [x, y, z, len, yaw]. */
export function emberCracks(level, list) {
  const b = new Build();
  for (const [x, y, z, len = 2, yaw = 0] of list) {
    let px = x, pz = z, a = yaw;
    for (let k = 0; k < 4; k++) {
      const l = len / 4 * (0.8 + hash(x, k) * 0.4);
      const nx = px + Math.cos(a) * l, nz = pz - Math.sin(a) * l;
      b.box(l + 0.05, 0.03, 0.09 - k * 0.012, { v: () => mixHex(0xff5a1a, 0xffc040, hash(k, z)) }, { p: [(px + nx) / 2, y + 0.015, (pz + nz) / 2], r: [0, a, 0] }, 0, 1);
      px = nx; pz = nz; a += (hash(z, k) - 0.5) * 1.1;
    }
  }
  bake(level, b, { material: 'glow', castShadow: false });
}

/** Werfer-Lager am Rand der Arena: Feuerkugel-Körbe, Fässer, Wimpelmast. list = [x, y, z, yaw]. */
export function werferLager(level, list) {
  const b = new Build(), glow = new Build();
  for (const [x, y, z, yaw = 0] of list) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    // zwei Fässer
    for (const [u, w] of [[-0.6, 0], [0.5, 0.3]]) {
      const [px, pz] = at(u, w);
      b.cyl(0.36, 0.36, 0.9, { v: (qx, qy, qz, nx, ny) => (Math.abs(qy) > 0.3 && Math.abs(qy) < 0.38 ? 0x3a3a48 : mixHex(0x8a4a24, 0xc07a40, 0.4 + nx * 0.2)) }, { p: [px, y + 0.45, pz] }, 10);
    }
    // Korb mit Feuerkugeln
    const [kx, kz] = at(0, -0.9);
    b.cyl(0.5, 0.4, 0.5, { v: (qx, qy, qz) => ((Math.floor(Math.atan2(qz, qx) * 4) & 1) ? 0xc89a50 : 0xa07030) }, { p: [kx, y + 0.25, kz] }, 10, true);
    for (let k = 0; k < 5; k++) glow.sphere(0.17, { v: (qx, qy) => (qy > 0.05 ? 0xffd040 : 0xff5a10) }, { p: [kx + Math.cos(k * 1.3) * 0.22, y + 0.5 + (k > 3 ? 0.15 : 0), kz + Math.sin(k * 1.3) * 0.22] }, 8, 6);
    // Wimpelmast
    const [mx, mz] = at(1.2, -0.5);
    b.cyl(0.05, 0.06, 3.2, 0x5a3a20, { p: [mx, y + 1.6, mz] }, 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, -0.25, 0, 0, -0.5, 0], 3));
    g.computeVertexNormals();
    const g2 = g.clone(); g2.rotateY(Math.PI);
    b.add(g, 0xff5a1a, { p: [mx, y + 3.1, mz], r: [0, yaw, 0] });
    b.add(g2, 0xff5a1a, { p: [mx, y + 3.1, mz], r: [0, yaw, 0] });
  }
  bake(level, b, {});
  bake(level, glow, { material: 'glow', castShadow: false });
}

// ====================================================================== 4) Torte (5-6)

export const CAKE = {
  rosa: 0xffa8d0, rosaHi: 0xffd8ec, pink: 0xff6ab0, vanille: 0xfff0c0, schoko: 0x8a4a2a, schokoHi: 0xb8784a, sahne: 0xfffaf4,
  biskuit: 0xf4c878, minze: 0x9af0c8, himmel: 0xa8e8ff, zitrone: 0xfff08a, lila: 0xc8a8ff, kirsch: 0xe8283e,
};
const SPRINKLE = [0xff5a8a, 0x5ad0ff, 0xffe04a, 0x7aff9a, 0xffffff, 0xc87aff];

/** Sahnetupfer-Kranz entlang eines Rechteckrands (Inselkante): [x0, x1, z0, z1, y, every, color]. */
export function creamRims(level, list) {
  const b = new Build();
  // Sahnetupfer als gedrehter Kegel mit Wulst (Drehkörper, 6 Segmente ≈ 36 Dreiecke)
  const tuft = (x, y, z, s, col) => {
    const lo = mixHex(col, 0xe8c0d0, 0.35);
    b.lathe([[0, 0], [0.2 * s, 0.02 * s], [0.21 * s, 0.1 * s], [0.13 * s, 0.2 * s], [0.06 * s, 0.32 * s], [0, 0.4 * s]], { v: (px, py) => (py > 0.08 * s ? col : lo) }, { p: [x, y, z], r: [0, x * 3 + z, 0] }, 6);
  };
  for (const [x0, x1, za, zb, y, every = 0.9, col = CAKE.sahne, sides = 'all'] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    const edge = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / every));
      for (let i = 0; i <= n; i++) { const t = i / n; tuft(ax + (bx - ax) * t, y, az + (bz - az) * t, 0.9 + hash(ax + t, az) * 0.3, col); }
    };
    const inset = 0.25;
    if (sides === 'all' || sides.includes('+z')) edge(x0 + inset, z1 - inset, x1 - inset, z1 - inset);
    if (sides === 'all' || sides.includes('-z')) edge(x0 + inset, z0 + inset, x1 - inset, z0 + inset);
    if (sides === 'all' || sides.includes('-x')) edge(x0 + inset, z0 + inset, x0 + inset, z1 - inset);
    if (sides === 'all' || sides.includes('+x')) edge(x1 - inset, z0 + inset, x1 - inset, z1 - inset);
  }
  bake(level, b, { castShadow: false });
}

/** Glasur-Tropfkante an der Vorderseite einer Tortenstufe: [x0, x1, z (Vorderkante), y (Oberkante), color]. */
export function icingDrips(level, list) {
  const b = new Build();
  for (const [x0, x1, z, y, col = CAKE.pink, face = '+z'] of list) {
    const L = x1 - x0, n = Math.max(2, Math.round(L / 0.55));
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * L / n;
      const len = 0.25 + hash(x, z) * 0.6;
      const off = face === '+z' ? 0.03 : -0.03;
      b.capsule(0.13, len, col, { p: [x, y - len / 2 - 0.05, z + off] }, 2, 8);
    }
    b.box(L, 0.12, 0.08, col, { p: [(x0 + x1) / 2, y - 0.06, z + (face === '+z' ? 0.02 : -0.02)] }, 0.03, 1);
  }
  bake(level, b, { castShadow: false });
}

/** Streusel auf einer Fläche: [x0, x1, z0, z1, y, n]. */
export function sprinkles(level, list) {
  const b = new Build();
  for (const [x0, x1, za, zb, y, n = 40] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(i, x0, z0) * (x1 - x0), z = z0 + hash(z0, i, x1) * (z1 - z0);
      b.capsule(0.035, 0.16, SPRINKLE[i % SPRINKLE.length], { p: [x, y + 0.04, z], r: [Math.PI / 2, hash(i, 7) * TAU, 0], order: 'YXZ' }, 1, 4);
    }
  }
  bake(level, b, { castShadow: false });
}

/** Kerzen (flackernde Flammen als Glüh-Teil, Körper gestreift): [x, y, z, h, color]. */
export function candles(level, list) {
  const b = new Build(), glow = new Build();
  const cols = [0xff8ac0, 0x8ad8ff, 0xffe070, 0x9af0a0, 0xc8a0ff];
  list.forEach(([x, y, z, h = 1.2, col], i) => {
    const c = col ?? cols[i % cols.length];
    b.cyl(0.12, 0.12, h, { v: (px, py, pz) => ((Math.floor((py + Math.atan2(pz, px) * 0.12) * 5) & 1) ? 0xffffff : c) }, { p: [x, y + h / 2, z] }, 10);
    b.cyl(0.01, 0.01, 0.12, 0x3a2a1a, { p: [x, y + h + 0.06, z] }, 4);
    glow.sphere(0.1, { v: (px, py) => (py > 0.02 ? 0xfff6c0 : 0xffa030) }, { p: [x, y + h + 0.2, z], s: [0.8, 1.6, 0.8] }, 8, 6);
  });
  bake(level, b, {});
  bake(level, glow, { material: 'glow', castShadow: false });
}

/** Erdbeeren (sparsam): [x, y, z, size]. */
export function berries(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 1] of list) {
    b.lathe([[0, 0], [0.08 * s, 0.02 * s], [0.18 * s, 0.11 * s], [0.23 * s, 0.24 * s], [0.22 * s, 0.34 * s], [0.14 * s, 0.43 * s], [0, 0.46 * s]], { v: (px, py) => (py > 0.4 * s ? 0x3aa040 : mixHex(0xb8102a, 0xff4a5a, py / (0.46 * s))) }, { p: [x, y, z] }, 10);
    for (let k = 0; k < 5; k++) b.cone(0.05 * s, 0.16 * s, 0x3aa040, { p: [x + Math.cos(k * 1.26) * 0.08 * s, y + 0.47 * s, z + Math.sin(k * 1.26) * 0.08 * s], r: [Math.sin(k * 1.26) * 1.2, 0, -Math.cos(k * 1.26) * 1.2] }, 4);
  }
  bake(level, b, {});
}

/** Kekse (liegend oder an die Wand gelehnt): [x, y, z, size, tilt, kind ('schoko'|'doppel')]. */
export function cookies(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 1, tilt = 0, kind = 'schoko', yaw = 0] of list) {
    if (kind === 'doppel') {
      for (const dy of [0, 0.22 * s]) b.cyl(0.42 * s, 0.42 * s, 0.1 * s, { v: (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 && hash(Math.floor(px * 8), Math.floor(pz * 8)) > 0.8 ? 0x3a1a0a : 0x5a2a16) }, { p: [x, y + 0.05 * s + dy, z], r: [tilt, yaw, 0], order: 'YXZ' }, 14);
      b.cyl(0.38 * s, 0.38 * s, 0.12 * s, 0xfff4ea, { p: [x, y + 0.16 * s, z], r: [tilt, yaw, 0], order: 'YXZ' }, 14);
    } else {
      b.cyl(0.45 * s, 0.45 * s, 0.13 * s, { v: (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 && hash(Math.floor(px * 6), Math.floor(pz * 6)) > 0.78 ? 0x5a2a16 : mixHex(0xd8964a, 0xf0c078, 0.5 + ny * 0.3)) }, { p: [x, y + 0.07 * s, z], r: [tilt, yaw, 0], order: 'YXZ' }, 14);
    }
  }
  bake(level, b, {});
}

/** Zuckerstangen (rot-weiße Spirale mit Haken): [x, y, z, h, yaw, color]. */
export function candyCanes(level, list) {
  const b = new Build();
  for (const [x, y, z, h = 2.4, yaw = 0, col = 0xff2a3a] of list) {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([0, (i / 10) * h * 0.82, 0]);
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI; pts.push([(1 - Math.cos(a)) * h * 0.12, h * 0.82 + Math.sin(a) * h * 0.12, 0]); }
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, 30, h * 0.045, 8, false);
    b.add(g, { v: (px, py, pz) => (((Math.floor((py + px) * 4.5 + Math.atan2(pz, px) * 0.5) % 2) + 2) % 2 ? col : 0xffffff) }, { p: [x, y, z], r: [0, yaw, 0] });
  }
  bake(level, b, {});
}

/** Zuckerwürfel / Bonbons (feste Hindernisse kommen aus Daten; hier nur Zier): [x, y, z, size, color]. */
export function sugarCubes(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 0.6, col = 0xffffff, yaw = 0] of list) b.box(s, s, s, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? col : mixHex(col, 0xd8d0e8, 0.35)) }, { p: [x, y + s / 2, z], r: [0, yaw, 0] }, s * 0.12, 2);
  bake(level, b, {});
}

/** Bonbon-Lutscher (Spirale auf Stiel): [x, y, z, size, color]. */
export function lollipops(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 1, col = 0xff5ab0, yaw = 0] of list) {
    b.cyl(0.05 * s, 0.05 * s, 1.6 * s, 0xfffaf0, { p: [x, y + 0.8 * s, z] }, 6);
    const g = new THREE.CylinderGeometry(0.55 * s, 0.55 * s, 0.16 * s, 24, 1);
    g.rotateX(Math.PI / 2);
    b.add(g, { v: (px, py, pz, nx, ny, nz) => (Math.abs(nz) < 0.5 ? col : ((Math.floor((Math.atan2(py, px) + Math.hypot(px, py) * 6) * 1.6) & 1) ? col : 0xffffff)) }, { p: [x, y + 1.9 * s, z], r: [0, yaw, 0] });
  }
  bake(level, b, {});
}

/** Tortenstufen-Kulisse (runde Etagentorte) neben dem Weg: [x, y, z, r, tiers, color]. Ohne Kollision. */
export function cakeTowers(level, list) {
  const b = new Build();
  const cols = [CAKE.rosa, CAKE.minze, CAKE.vanille, CAKE.himmel, CAKE.lila];
  list.forEach(([x, y, z, r = 3, tiers = 3, col], i) => {
    const ic = col ?? cols[i % cols.length];
    let yy = y, rr = r;
    for (let t = 0; t < tiers; t++) {
      const h = rr * 0.55;
      b.cyl(rr, rr, h, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? ic : (py > h * 0.32 ? ic : (Math.floor((py + h / 2) / (h / 4)) & 1 ? CAKE.biskuit : CAKE.sahne))) }, { p: [x, yy + h / 2, z] }, 18);
      // Tropfen
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t; const len = 0.2 + hash(k, t, x) * 0.35 * rr; b.capsule(0.09 * rr, len, ic, { p: [x + Math.cos(a) * rr, yy + h * 0.82 - len / 2, z + Math.sin(a) * rr] }, 1, 6); }
      yy += h; rr *= 0.68;
    }
    b.sphere(rr * 0.5, { v: (px, py) => (py > 0 ? 0xff3a4a : 0x9a1020) }, { p: [x, yy + rr * 0.4, z] }, 10, 8);
  });
  bake(level, b, { castShadow: false });
}

/** Bonbon-Zaun (rosa-weiße Pfosten mit Kugeln) als Zier entlang einer Linie: [[x0, y, z0], [x1, y, z1], every]. */
export function candyFence(level, list) {
  const b = new Build();
  for (const [A, B, every = 1.2, col = 0xff7ab8] of list) {
    const L = Math.hypot(B[0] - A[0], B[2] - A[2]), n = Math.max(1, Math.round(L / every));
    const yaw = Math.atan2(-(B[2] - A[2]), B[0] - A[0]);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = A[0] + (B[0] - A[0]) * t, z = A[2] + (B[2] - A[2]) * t;
      b.cyl(0.08, 0.08, 0.8, { v: (px, py) => ((Math.floor((py + 0.4) * 6) & 1) ? 0xffffff : col) }, { p: [x, A[1] + 0.4, z] }, 8);
      b.sphere(0.13, col, { p: [x, A[1] + 0.85, z] }, 8, 6);
    }
    b.box(L, 0.08, 0.08, 0xffffff, { p: [(A[0] + B[0]) / 2, A[1] + 0.62, (A[2] + B[2]) / 2], r: [0, yaw, 0] }, 0.03, 1);
  }
  bake(level, b, {});
}

/**
 * Rot-Blau-Flipper ohne Sonnenschatten (Level-Haken, nur Darstellung): Die Felder liegen über dem Abgrund – ihre
 * Schatten sähe man kaum, kosteten aber im Schattenpass alle Feld-Instanzen noch einmal. Die Instanz-Meshes entstehen
 * im ersten Bild; danach wird castShadow einmal abgeschaltet.
 */
export function flipperNoShadow(level) {
  const v = level.view;
  if (!v) return;
  let done = false;
  v.onFrame?.(() => {
    if (done) return;
    const g = v.three.getObjectByName('flipper');
    if (!g || !g.children.length) return;
    for (const m of g.children) m.castShadow = false;
    done = true;
  });
}

/**
 * Glasur-Kacheln auf einer Tortenplatte (flache Vierecke knapp über der Oberseite, Fugen = Platten-Rosa):
 * [x0, x1, zA, zB, y, colA, colB, cell = 2]. Jede Kachel bekommt einen helleren Glanzstreifen oben links.
 */
export function glazeTops(level, list) {
  const b = new Build();
  for (const [x0, x1, za, zb, y, colA, colB, cell = 2] of list) {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    const nx = Math.max(1, Math.round((x1 - x0) / cell)), nz = Math.max(1, Math.round((z1 - z0) / cell));
    const cw = (x1 - x0) / nx, cd = (z1 - z0) / nz, gap = 0.07;
    for (let i = 0; i < nx; i++) {
      for (let k = 0; k < nz; k++) {
        const base = (i + k) % 2 ? colB : colA;
        const col = mixHex(base, 0xffffff, hash(i, k, x0) * 0.08);
        const hi = mixHex(col, 0xffffff, 0.35);
        const w = cw - gap * 2, d = cd - gap * 2;
        const g = new THREE.PlaneGeometry(w, d, 2, 2);
        g.rotateX(-Math.PI / 2);
        b.add(g, { v: (px, py, pz) => (px < -w * 0.2 && pz < -d * 0.2 ? hi : col) }, { p: [x0 + (i + 0.5) * cw, y + 0.012, z0 + (k + 0.5) * cd] });
      }
    }
  }
  bake(level, b, { castShadow: false });
}

/**
 * Schwebende Naschereien als Kulisse (kein Schatten): [x, y, z, size, type ('macaron' | 'donut'), color, yaw].
 * Macaron: zwei gewölbte Schalen mit Füßchen und Cremefüllung; Donut: Ring mit Glasur und Streuseln.
 */
export function floatingSweets(level, list) {
  const b = new Build();
  list.forEach(([x, y, z, s = 2, type = 'macaron', col = 0xff9ad0, yaw = 0], i) => {
    if (type === 'donut') {
      // Ring liegt fast flach (lokale +z zeigt nach oben, leicht zur Kamera gekippt); Glasur auf der Oberseite
      const eu = new THREE.Euler(-(Math.PI / 2 - 0.35), yaw, 0, 'YXZ');
      b.torus(s * 0.62, s * 0.34, { v: (px, py, pz) => (pz > s * 0.06 ? col : 0xe8a860) }, { p: [x, y, z], r: [eu.x, eu.y, 0], order: 'YXZ' }, 8, 18);
      const v = new THREE.Vector3();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.45 + i, r = s * (0.46 + hash(k, i) * 0.32);
        v.set(Math.cos(a) * r, Math.sin(a) * r, s * 0.33).applyEuler(eu);
        b.capsule(0.035 * s, 0.12 * s, SPRINKLE[(k + i) % SPRINKLE.length], { p: [x + v.x, y + v.y, z + v.z], r: [Math.PI / 2, a * 2.3, 0], order: 'YXZ' }, 1, 4);
      }
      return;
    }
    const shell = { v: (px, py, pz, nx, ny) => mixHex(col, 0xffffff, 0.1 + Math.max(0, ny) * 0.25) };
    const prof = [[0, 0], [s * 0.5, 0.0], [s * 0.52, s * 0.08], [s * 0.46, s * 0.18], [s * 0.3, s * 0.27], [0, s * 0.3]];
    b.lathe(prof, shell, { p: [x, y + s * 0.1, z] }, 14);
    b.lathe(prof, shell, { p: [x, y - s * 0.1, z], r: [Math.PI, 0, 0] }, 14);
    b.cyl(s * 0.47, s * 0.47, s * 0.16, 0xfff6f0, { p: [x, y, z] }, 14);
    // Füßchen (rauer Rand)
    b.torus(s * 0.5, s * 0.035, mixHex(col, 0x000000, 0.08), { p: [x, y + s * 0.1, z], r: [Math.PI / 2, 0, 0] }, 4, 14);
    b.torus(s * 0.5, s * 0.035, mixHex(col, 0x000000, 0.08), { p: [x, y - s * 0.1, z], r: [Math.PI / 2, 0, 0] }, 4, 14);
  });
  bake(level, b, { castShadow: false });
}

/** Schwebende Sahnewolken (Kulisse, kein Schatten): [x, y, z, size]. */
export function creamClouds(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 3] of list) {
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05, rr = k ? s * 0.55 : 0;
      b.sphere(s * (k ? 0.5 : 0.75), { v: (px, py) => (py > 0 ? 0xffffff : 0xffe4f0) }, { p: [x + Math.cos(a) * rr, y + (k % 2) * s * 0.15, z + Math.sin(a) * rr * 0.6], s: [1, 0.7, 1] }, 10, 6);
    }
  }
  bake(level, b, { castShadow: false });
}

/**
 * Schwebende Funkeln (ein Punkte-Objekt = 1 Zeichenaufruf, additiv) über einem Bereich – Torte: Zuckerglitzer,
 * Mine: Kristallstaub, Glutsee: Funken. o: { min: [x, y, z], max: [x, y, z], n: 40, size: 0.25, color, rise: 0 (m/s) }.
 */
export function sparkleField(level, o) {
  if (!level.view) return null;
  const n = o.n ?? 40;
  const pos = new Float32Array(n * 3);
  const base = [];
  for (let i = 0; i < n; i++) base.push({ x: o.min[0] + hash(i, 1) * (o.max[0] - o.min[0]), y: o.min[1] + hash(i, 2) * (o.max[1] - o.min[1]), z: o.min[2] + hash(i, 5) * (o.max[2] - o.min[2]), ph: hash(i, 9) * TAU });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: glowTexture(), color: o.color ?? 0xffe8ff, size: o.size ?? 0.3, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o.opacity ?? 0.85 });
  const pts = new THREE.Points(g, mat);
  pts.name = 'zier:funkeln';
  // feste Hüllkugel um den Bereich: außerhalb des Bildes kein Zeichenaufruf
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3((o.min[0] + o.max[0]) / 2, (o.min[1] + o.max[1]) / 2, (o.min[2] + o.max[2]) / 2), Math.hypot(o.max[0] - o.min[0], o.max[1] - o.min[1], o.max[2] - o.min[2]) / 2 + 1);
  pts.renderOrder = 4;
  const holder = {};
  let t = 0;
  const H = o.max[1] - o.min[1];
  const upd = (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const b = base[i];
      let y = b.y + Math.sin(t * 0.7 + b.ph * 2) * 0.3;
      if (o.rise) y = o.min[1] + ((((b.y - o.min[1]) + t * o.rise * (0.6 + 0.4 * Math.sin(b.ph))) % H) + H) % H;
      pos[i * 3] = b.x + Math.sin(t * 0.4 + b.ph) * 0.4; pos[i * 3 + 1] = y; pos[i * 3 + 2] = b.z + Math.cos(t * 0.33 + b.ph) * 0.3;
    }
    g.attributes.position.needsUpdate = true;
    mat.opacity = (o.opacity ?? 0.85) * (0.75 + 0.25 * Math.sin(t * 1.7));
  };
  upd(0);
  addObject(level, pts, upd);
  return pts;
}

export { figures };
