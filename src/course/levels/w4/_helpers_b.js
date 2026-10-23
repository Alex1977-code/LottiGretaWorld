// Gemeinsame Hilfen der Welt-4-Level 4-3 „Neonsteg im Takt“ und 4-4 „Trampolin-Alm“ (kein Level: exportiert kein
// LEVEL, die Level-Registry überspringt dieses Modul). Alles level-lokal über den Level-Haken (`LEVEL.setup =
// levelSetup(fn)`, Präzisierung „Level-Haken“) – keine gemeinsame Datei wird geändert.
//
// Daten-Helfer:   isl, line, ring, arc, column, piepBands (Piep-Streifen), checker (Schachbrett-Farbkarte)
// Spielelemente:  laserGate (Laserzaun, öffnet auf Signal open/start), klonAutomat (Spiegelfrucht wächst nach),
//                 fangnetz (Sicherheitsnetz unter der Piep-Treppe), neonRail (Geländer mit Neonkante)
// Technik-Kulisse (4-3, im Takt der Taktuhr level.beepClock): danceBots (tanzende Piep-Roboter), beatTiles
//                 (Tanzfläche), laserFans (Lichtfächer in den Himmel), noteFloat (aufsteigende Noten), neonSign
//                 (Leuchtschrift), speakerTower (Lautsprecherturm hinter der Treppe), discoBall
// Bergwiese (4-4): rockWall (Felswand mit Wandloch), sheep (grasende Schafe), cows (Kühe), kite (Drachen), bees
// Budget: cullStatic, instanceEnemies, farHide (aus den Welt-2/3-Hilfen), shadowless
//
// Takt: beatNow(level) liest die Taktuhr der Piep-Blöcke (blocks/w4kit.js beatClock = level.beepClock): Zählzeit,
// gerade feste Farbe (rot bei geradem Achterblock), Warnzeit. Ohne Uhr (4-4) läuft eine Ersatzuhr über level.time.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { levelSetup, cyl, sphere, cone, block, flatIslands } from '../w2/_helpers_c.js';
import { cullStatic, farHide, shadowless } from '../w2/_helpers_a.js';
import { instanceEnemies } from '../w3/_helpers_a.js';
import { zeitUhren } from '../w3/_helpers_d.js';
import { plate, cow, almHut, hayBale, meadow, balloon, addStaticParts, ropeFence, stonePath, cloudRim } from '../w3/_helpers_b.js';

export { levelSetup, cyl, sphere, cone, block, flatIslands, cullStatic, farHide, shadowless, instanceEnemies, zeitUhren };
export { plate, cow, almHut, hayBale, meadow, balloon, addStaticParts, ropeFence, stonePath, cloudRim };

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));
const fillc = (c) => (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const PIEP_RED = 0xff3d55, PIEP_BLUE = 0x2f78ff;

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });

/**
 * Piep-Streifen entlang −Z: list[i] = 'rot' | 'blau' | { color, phase } – Band i liegt bei z0 − d·i … z0 − d·(i+1),
 * Breite w um x, Oberseite top, Dicke h. Liefert piep_block-Bausteine (id: `${o.id}_${i}`).
 */
export function piepBands(x, top, z0, w, d, list, o = {}) {
  const h = o.h ?? 1;
  return list.map((c, i) => {
    const color = typeof c === 'string' ? c : c.color;
    const phase = typeof c === 'string' ? (o.phase ?? 0) : (c.phase ?? 0);
    return { type: 'piep_block', cell: o.cell, id: o.id ? `${o.id}_${i}` : undefined, color, phase, every: o.every, warn: o.warn,
      pos: [x, top - h, z0 - d * (i + 0.5)], size: [w, h, d] };
  });
}

/** Schachbrett-Farbkarte (nx Spalten × nz Zeilen), erste Zelle vorn links rot. */
export function checker(nx, nz, first = 'r') {
  const other = first === 'r' ? 'b' : 'r';
  return Array.from({ length: nz }, (_, j) => Array.from({ length: nx }, (__, i) => ((i + j) % 2 ? other : first)).join(''));
}

// =====================================================================================================================
// Takt
// =====================================================================================================================

/** Zustand der Taktuhr: { beat, whole, frac, k (Zählzeit im Achterblock), red (rot fest), warn, flash }. */
export function beatNow(level) {
  const c = level.beepClock;
  const beat = c ? c.beat : (level.time ?? 0) * (level.data?.bpm ?? 140) / 60;
  const every = c?.every ?? 8, warn = c?.warn ?? 3;
  const cyc = Math.floor(beat / every);
  const red = (((cyc % 2) + 2) % 2) === 0;
  const k = beat - cyc * every;
  const frac = beat - Math.floor(beat);
  return { beat, whole: Math.floor(beat), frac, k, red, every, warn: k >= every - warn, flash: Math.exp(-frac * 5) };
}

// =====================================================================================================================
// Spielelemente
// =====================================================================================================================

/**
 * Laserzaun quer zum Weg: zwei Pylone (fest) und waagerechte Laserstrahlen (feste, unsichtbare Wand). Signal `open`
 * (bzw. `start`) schaltet ihn ab: Strahlen verlöschen in 0,5 s, die Wand verschwindet. o = { id, pos (Mitte unten),
 * width 12, height 5, beams 7, color }. level.named.get(id) = { opened, open(), start(), info() }.
 */
export function laserGate(level, o) {
  const [x, y, z] = o.pos;
  const w = o.width ?? 12, h = o.height ?? 5, n = o.beams ?? 7;
  const st = { opened: false, k: 1, t: 0 };
  let wallId = level.world.add({ type: 'box', min: [x - w / 2, y, z - 0.25], max: [x + w / 2, y + h, z + 0.25], tag: 'laserzaun' });
  // Pylone (fest): dunkles Metall mit Neonstreifen und Emitter-Köpfen
  const parts = [], glow = [];
  for (const s of [-1, 1]) {
    const px = x + s * (w / 2 + 0.35);
    parts.push(block(0.7, h + 0.8, 0.7, px, y, z, 0x2a3260, { r: 0.08 }));
    parts.push(block(0.9, 0.3, 0.9, px, y, z, 0x4a5a8c));
    glow.push(block(0.12, h - 0.4, 0.74, px - s * 0.3, y + 0.4, z, 0xff4a7a, { r: 0 }));
    for (let i = 0; i < n; i++) glow.push(sphere(0.13, px - s * 0.38, y + 0.5 + (i + 0.5) * (h - 0.8) / n, z, 0xff8aa8, { ws: 6, hs: 4, fn: fillc(L(0xffd0dc)) }));
    level.world.add({ type: 'box', min: [px - 0.35, y, z - 0.35], max: [px + 0.35, y + h + 0.8, z + 0.35], tag: 'laserzaun:pylon' });
  }
  addStatic(level, merge(parts));
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  // Strahlen: ein Mesh (additiv), flackern leicht
  let beams = null;
  if (level.view) {
    const bp = [];
    for (let i = 0; i < n; i++) {
      const by = y + 0.5 + (i + 0.5) * (h - 0.8) / n;
      for (const [r, c] of [[0.035, 0xffffff], [0.11, 0xff2a5a]]) {
        const g = new THREE.CylinderGeometry(r, r, w + 0.1, 6, 1, true).toNonIndexed();
        g.rotateZ(Math.PI / 2);
        g.translate(x, by, z);
        bp.push(colorize(g, fillc(L(c))));
      }
    }
    beams = new THREE.Mesh(merge(bp), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    beams.name = 'zier:laserzaun';
    beams.renderOrder = 4;
    const holder = {};
    addObject(level, beams, (dt) => {
      const d = visDt(level, holder, dt);
      st.t += d;
      if (st.opened) st.k = Math.max(0, st.k - d * 2);
      beams.visible = st.k > 0.01;
      beams.material.opacity = st.k * (0.7 + 0.18 * Math.sin(st.t * 31) + 0.1 * Math.sin(st.t * 7.3));
      beams.scale.set(st.opened ? Math.max(0.02, st.k) : 1, 1, 1);
      beams.position.x = st.opened ? x * (1 - Math.max(0.02, st.k)) : 0;
    });
  }
  const handle = {
    kind: 'laserzaun',
    get opened() { return st.opened; },
    open() {
      if (st.opened) return;
      st.opened = true;
      if (wallId !== null) { level.world.remove(wallId); wallId = null; }
      level.sfx('switch');
      level.effects?.sparks?.({ x, y: y + h / 2, z }, 16);
    },
    start() { handle.open(); },
    info: () => ({ opened: st.opened, solid: wallId !== null }),
  };
  if (o.id) level.named.set(o.id, handle);
  return handle;
}

/**
 * Klon-Automat: Neon-Sockel, auf dem eine Spiegelfrucht liegt; gepflückt wächst nach every s eine neue nach (Nachschub
 * vor Mehrfigur-Rätseln, Klone gehen auf Piep-Blöcken leicht verloren). pos = Fußpunkt. level.named(id) = { grown }.
 */
export function klonAutomat(level, pos, o = {}) {
  const [x, y, z] = pos;
  const every = o.every ?? 2.5;
  const parts = [], glow = [];
  parts.push(cyl(0.62, 0.7, 0.16, x, y, z, 0x3a4678, 16));
  parts.push(cyl(0.5, 0.56, 0.12, x, y + 0.16, z, 0xc8d2f0, 16));
  glow.push(cyl(0.6, 0.6, 0.04, x, y + 0.13, z, 0xff7ac8, 16, { fn: fillc(L(0xff7ac8)) }));
  // Bügel mit Lämpchen (Spiegelfrucht-Symbol: zwei Kreise)
  parts.push(block(0.08, 0.9, 0.08, x - 0.5, y + 0.2, z - 0.35, 0x8a96c8), block(0.08, 0.9, 0.08, x + 0.5, y + 0.2, z - 0.35, 0x8a96c8));
  parts.push(block(1.08, 0.08, 0.08, x, y + 1.1, z - 0.35, 0x8a96c8));
  glow.push(sphere(0.11, x - 0.14, y + 1.32, z - 0.35, 0xff5aa8, { ws: 8, hs: 5, fn: fillc(L(0xff5aa8)) }));
  glow.push(sphere(0.11, x + 0.14, y + 1.32, z - 0.35, 0xff5aa8, { ws: 8, hs: 5, fn: fillc(L(0xff5aa8)) }));
  addStatic(level, merge(parts));
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  level.world.add({ type: 'cyl', x, z, r: 0.62, y0: y, y1: y + 0.28, tag: 'klonautomat' });
  const top = [x, y + 0.42, z];
  const st = { fruit: null, t: 0, grown: 0 };
  const grow = () => { st.fruit = level.spawn('powerup', { pos: top, power: 'spiegel' }); st.grown++; };
  grow();
  level.onStep((dt) => {
    if (st.fruit && st.fruit.alive && !st.fruit.removed) return;
    st.t += dt;
    if (st.t < every) return;
    st.t = 0;
    grow();
    level.effects?.sparks?.({ x, y: y + 0.8, z }, 10);
  });
  if (o.id) level.named.set(o.id, st);
  return st;
}

/**
 * Sicherheitsnetz (Fangnetz) auf Höhe y über x0..x1, z0..z1: Metallrahmen und leuchtendes Netz-Raster; fest (wer von
 * der Piep-Treppe fällt, landet darauf). o: { cell 1, color }.
 */
export function fangnetz(level, o) {
  const { x0, x1, y } = o;
  const zA = Math.max(o.z0, o.z1), zB = Math.min(o.z0, o.z1);
  level.world.add({ type: 'box', min: [x0, y - 0.25, zB], max: [x1, y, zA], tag: 'fangnetz' });
  const parts = [], glow = [];
  const fr = 0x5a6aa0;
  parts.push(block(x1 - x0 + 0.3, 0.25, 0.3, (x0 + x1) / 2, y - 0.25, zA, fr), block(x1 - x0 + 0.3, 0.25, 0.3, (x0 + x1) / 2, y - 0.25, zB, fr));
  parts.push(block(0.3, 0.25, zA - zB, x0, y - 0.25, (zA + zB) / 2, fr), block(0.3, 0.25, zA - zB, x1, y - 0.25, (zA + zB) / 2, fr));
  const cell = o.cell ?? 1, col = o.color ?? 0x7ae8ff;
  for (let xx = x0 + cell; xx < x1 - 0.2; xx += cell) glow.push(block(0.04, 0.03, zA - zB, xx, y - 0.06, (zA + zB) / 2, col, { r: 0 }));
  for (let zz = zB + cell; zz < zA - 0.2; zz += cell) glow.push(block(x1 - x0, 0.03, 0.04, (x0 + x1) / 2, y - 0.06, zz, col, { r: 0 }));
  // Spannseile zu den Ecken (nach unten)
  for (const [cx, cz] of [[x0, zA], [x1, zA], [x0, zB], [x1, zB]]) {
    const g = new THREE.CylinderGeometry(0.04, 0.04, 6, 4).toNonIndexed();
    g.translate(cx, y - 3.2, cz);
    parts.push(colorize(g, fillc(L(0x8a96c8))));
  }
  addStatic(level, merge(parts), { castShadow: false });
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

/** Geländer mit Neon-Handlauf von a nach b (achsenparallel, fest, 0,9 m hoch). */
export function neonRail(level, a, b, o = {}) {
  const [ax, y, az] = a, [bx, , bz] = b;
  const h = o.height ?? 0.9, t = 0.16;
  const len = Math.hypot(bx - ax, bz - az), alongX = Math.abs(bx - ax) > Math.abs(bz - az);
  const cx = (ax + bx) / 2, cz = (az + bz) / 2;
  const w = alongX ? len : t, d = alongX ? t : len;
  level.world.add({ type: 'box', min: [cx - w / 2, y, cz - d / 2], max: [cx + w / 2, y + h, cz + d / 2], tag: 'gelaender', camIgnore: true });
  const parts = [], glow = [];
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n;
    parts.push(block(0.12, h, 0.12, px, y, pz, 0x6a78b0, { r: 0 }));
  }
  parts.push(block(w * 0.98 + 0.06, 0.06, d * 0.98 + 0.06, cx, y + 0.3, cz, 0x6a78b0, { r: 0 }));
  glow.push(block(alongX ? len : 0.12, 0.1, alongX ? 0.12 : len, cx, y + h - 0.1, cz, o.color ?? 0x5af0ff, { r: 0 }));
  addStatic(level, merge(parts), { castShadow: false });
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// Technik-Kulisse (4-3)
// =====================================================================================================================

/** Geometrie eines Piep-Roboters (Ursprung Fußpunkt, Blick +X): Körper, Kopf mit Visier, Antenne. */
function botBodyGeo() {
  const P = [];
  const white = 0xf2f4fb, grey = 0x9aa6c8, dark = 0x2a3050, visor = 0x5af0ff;
  P.push(block(0.36, 0.08, 0.3, 0, 0, 0, dark));                          // Fuß
  P.push(cyl(0.2, 0.24, 0.42, 0, 0.08, 0, white, 12));                  // Rumpf
  P.push(cyl(0.21, 0.21, 0.06, 0, 0.36, 0, grey, 12));                  // Gürtel
  P.push(sphere(0.23, 0, 0.72, 0, white, { ws: 12, hs: 8, sy: 0.9 }));  // Kopf
  P.push(block(0.1, 0.13, 0.32, 0.18, 0.66, 0, dark, { r: 0.03 }));      // Visier
  P.push(sphere(0.045, 0.235, 0.73, 0.08, visor, { ws: 6, hs: 4, fn: fillc(L(visor)) }), sphere(0.045, 0.235, 0.73, -0.08, visor, { ws: 6, hs: 4, fn: fillc(L(visor)) }));
  P.push(cyl(0.015, 0.015, 0.26, 0, 0.9, 0, grey, 4));                 // Antenne
  P.push(sphere(0.06, 0, 1.18, 0, 0xff5a7a, { ws: 6, hs: 4 }));
  P.push(cyl(0.07, 0.07, 0.03, 0.2, 0.3, 0, 0xff5a7a, 8, { rz: Math.PI / 2, fn: fillc(L(0xff5a7a)) }));   // Herzlampe
  return merge(P);
}
function botArmsGeo() {
  const P = [];
  for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.045, 0.045, 0.34, 6).toNonIndexed();
    g.translate(0, -0.17, 0);
    g.translate(0, 0, s * 0.27);
    P.push(colorize(g, fillc(L(0x9aa6c8))));
    P.push(sphere(0.07, 0, -0.36, s * 0.27, 0xf2f4fb, { ws: 6, hs: 4 }));
  }
  return merge(P);
}

/**
 * Tanzende Piep-Roboter (Zier): wippen auf jeder Zählzeit, recken in der Warnzeit die Arme, drehen sich beim Wechsel.
 * list = [[x, y, z, yaw, tint?], …]. Zwei Instanz-Meshes für alle (ohne Sonnenschatten, mit Blob).
 */
export function danceBots(level, list) {
  if (!level.view || !list.length) return null;
  const n = list.length;
  const bodyM = new THREE.InstancedMesh(botBodyGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2 }), n);
  const armM = new THREE.InstancedMesh(botArmsGeo(), bodyM.material, n);
  const tints = [0xffffff, 0xffe0f0, 0xe0f0ff, 0xfff4d0, 0xe8ffe8];
  for (let i = 0; i < n; i++) { const c = new THREE.Color(list[i][4] ?? tints[i % tints.length]); bodyM.setColorAt(i, c); armM.setColorAt(i, c); }
  for (const m of [bodyM, armM]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; m.name = 'zier:roboter'; }
  const grp = new THREE.Group();
  grp.add(bodyM, armM);
  for (const b of list) level.view.shadows?.add({ pos: new THREE.Vector3(b[0], b[1], b[2]), radius: 0.32 });
  const M = new THREE.Matrix4(), A = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), Qa = new THREE.Quaternion();
  addObject(level, grp, () => {
    const b = beatNow(level);
    const tgt = level.view.rig?.target ?? level.player?.pos;
    let vis = false;
    for (let i = 0; i < n; i++) {
      const [x, y, z, yaw] = list[i];
      if (tgt && Math.hypot(x - tgt.x, z - tgt.z) < 60) vis = true;
      const ph = i * 0.37;
      const bop = Math.exp(-b.frac * 6);
      const spin = b.k < 1 ? (1 - b.k) * TAU * ((i % 2) ? 1 : -1) * 0.25 : 0;
      E.set(0, (yaw ?? 0) + Math.sin(b.beat * Math.PI * 0.5 + ph) * 0.35 + spin, Math.sin(b.beat * Math.PI + ph) * 0.12);
      Q.setFromEuler(E);
      V.set(x, y + bop * 0.12, z);
      S.set(1 + bop * 0.06, 1 - bop * 0.08, 1 + bop * 0.06);
      M.compose(V, Q, S);
      bodyM.setMatrixAt(i, M);
      // Arme: Schulter bei y 0.5; in der Warnzeit nach oben gereckt, sonst im Takt schwingend
      const up = b.warn ? 2.6 : 0.6 + Math.sin(b.beat * Math.PI + ph) * 0.5;
      Qa.setFromEuler(E.set(up, 0, 0));
      A.makeRotationFromQuaternion(Qa).setPosition(0, 0.5, 0);
      armM.setMatrixAt(i, M.clone().multiply(A));
    }
    grp.visible = vis;
    bodyM.instanceMatrix.needsUpdate = true; armM.instanceMatrix.needsUpdate = true;
  });
  return grp;
}

/**
 * Tanzfläche: leuchtende Bodenplatten (0,9 m), die im Takt in der festen Piep-Farbe aufblitzen (Muster wandert je
 * Zählzeit). rects = [{ x0, x1, z0, z1, y }]. Ein Instanz-Mesh (unbeleuchtet), knapp über dem Boden.
 */
export function beatTiles(level, rects) {
  if (!level.view) return null;
  const cells = [];
  for (const r of rects) {
    const zA = Math.max(r.z0, r.z1), zB = Math.min(r.z0, r.z1);
    for (let x = Math.ceil(r.x0); x < r.x1 - 0.5; x++) for (let z = Math.ceil(zB); z < zA - 0.5; z++) cells.push([x + 0.5, r.y + 0.012, z + 0.5]);
  }
  const g = new THREE.PlaneGeometry(0.86, 0.86);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }), cells.length);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 1; mesh.name = 'zier:tanzflaeche';
  const M = new THREE.Matrix4(), C = new THREE.Color();
  cells.forEach((c, i) => { M.makeTranslation(c[0], c[1], c[2]); mesh.setMatrixAt(i, M); mesh.setColorAt(i, C.setRGB(0, 0, 0)); });
  const red = new THREE.Color(PIEP_RED), blue = new THREE.Color(PIEP_BLUE), cyan = new THREE.Color(0x5af0ff);
  let last = -1, lastFlash = -1;
  addObject(level, mesh, () => {
    const b = beatNow(level);
    const fl = Math.round(b.flash * 8);
    if (b.whole === last && fl === lastFlash) return;
    last = b.whole; lastFlash = fl;
    const base = b.red ? red : blue;
    cells.forEach((c, i) => {
      const wave = Math.sin(c[0] * 0.9 + c[2] * 0.7 + b.whole * 1.7) > 0.25;
      const ring = ((Math.floor(c[0]) + Math.floor(c[2]) + b.whole) % 4) === 0;
      const k = wave ? 0.35 + 0.65 * b.flash : ring ? 0.25 : 0.06;
      C.copy(ring && !wave ? cyan : base).multiplyScalar(k * (b.warn ? 1.3 : 1));
      mesh.setColorAt(i, C);
    });
    mesh.instanceColor.needsUpdate = true;
  });
  return mesh;
}

/**
 * Lichtfächer: von Emittern [x, y, z] schwenken je beams lange Strahlen langsam durch den Himmel (Farbe der gerade
 * festen Piep-Farbe, Blitz je Zählzeit). Ein Instanz-Mesh (additiv) für alle.
 */
export function laserFans(level, emitters, o = {}) {
  if (!level.view || !emitters.length) return null;
  const per = o.beams ?? 4, len = o.length ?? 60;
  const g = new THREE.CylinderGeometry(0.06, 0.9, len, 6, 1, true);
  g.translate(0, len / 2, 0);
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), emitters.length * per);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.renderOrder = 5; mesh.name = 'zier:lichtfaecher';
  const parts = [];
  for (const [x, y, z] of emitters) {
    parts.push(cyl(0.7, 0.9, 0.6, x, y - 0.6, z, 0x2a3260, 10), sphere(0.45, x, y, z, 0x8aa0ff, { ws: 8, hs: 5 }));
  }
  addStatic(level, merge(parts), { castShadow: false });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), C = new THREE.Color();
  const red = new THREE.Color(PIEP_RED), blue = new THREE.Color(PIEP_BLUE);
  let t = 0;
  const holder = {};
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    const b = beatNow(level);
    let i = 0;
    emitters.forEach(([x, y, z], e) => {
      for (let k = 0; k < per; k++) {
        const a = (k / per) * TAU + t * 0.35 * (e % 2 ? 1 : -1) + e;
        E.set(Math.sin(t * 0.6 + k + e) * 0.35 + 0.35, a, 0, 'YXZ');
        Q.setFromEuler(E);
        V.set(x, y, z);
        M.compose(V, Q, S);
        mesh.setMatrixAt(i, M);
        C.copy((k + e) % 2 ? (b.red ? red : blue) : (b.red ? blue : red)).multiplyScalar(0.55 + b.flash * 0.6);
        mesh.setColorAt(i++, C);
      }
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  });
  return mesh;
}

let noteTex = null;
function noteTexture() {
  if (noteTex) return noteTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.font = 'bold 54px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ffffff'; g.shadowBlur = 6;
  g.fillText('♪', 32, 34);
  noteTex = new THREE.CanvasTexture(c);
  noteTex.colorSpace = THREE.SRGBColorSpace;
  return noteTex;
}

/** Aufsteigende Leucht-Noten um Lautsprecher (Punkte, ein Zeichenaufruf). sources = [[x, y, z], …]. */
export function noteFloat(level, sources, o = {}) {
  if (!level.view || !sources.length || typeof document === 'undefined') return null;
  const n = o.n ?? 8 * sources.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const seeds = [];
  const cols = [0xff5a8a, 0x5af0ff, 0xffe04a, 0xb48aff].map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) { seeds.push({ s: sources[i % sources.length], ph: (i * 0.618) % 1, a: i * 2.4 }); const c = cols[i % cols.length]; col.set([c.r, c.g, c.b], i * 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: o.size ?? 0.55, map: noteTexture(), vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05 }));
  pts.frustumCulled = false; pts.name = 'zier:noten';
  let t = 0;
  const holder = {};
  addObject(level, pts, (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const sd = seeds[i], u = (t * 0.25 + sd.ph) % 1;
      pos[i * 3] = sd.s[0] + Math.sin(sd.a + u * 5) * (0.5 + u * 1.2);
      pos[i * 3 + 1] = sd.s[1] + u * 4.5;
      pos[i * 3 + 2] = sd.s[2] + Math.cos(sd.a + u * 4) * (0.4 + u);
    }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = 0.9;
  });
  return pts;
}

/**
 * Leuchtschrift (Canvas-Textur auf einer Tafel mit Rahmen): text, pos (Mitte unten), size [w, h], yaw (Vorderseite
 * +Z bei 0), color, flicker. Ein Mesh (unbeleuchtet) + statischer Rahmen/Ständer.
 */
export function neonSign(level, o) {
  if (!level.view || typeof document === 'undefined') return null;
  const [x, y, z] = o.pos;
  const [w, h] = o.size ?? [4, 1.2];
  const yaw = o.yaw ?? 0;
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,14,48,0.92)'; g.fillRect(0, 0, c.width, c.height);
  const col = o.color ?? '#5af0ff';
  g.strokeStyle = col; g.lineWidth = 8; g.shadowColor = col; g.shadowBlur = 18;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  const lines = String(o.text).split('\n');
  const fs = Math.min(c.height * 0.62 / lines.length, 512 / Math.max(...lines.map((l) => l.length)) * 1.55);
  g.font = `bold ${fs}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; g.shadowColor = col; g.shadowBlur = 22;
  lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height * (i + 0.5) / lines.length + 2));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  mesh.position.set(x, y + (o.post ?? 1.2) + h / 2, z);
  mesh.rotation.y = yaw;
  mesh.name = 'zier:leuchtschrift';
  const parts = [];
  const post = o.post ?? 1.2;
  if (post > 0) {
    const dx = Math.cos(yaw) * (w / 2 - 0.3), dz = -Math.sin(yaw) * (w / 2 - 0.3);
    parts.push(block(0.12, post + 0.2, 0.12, x - dx, y, z - dz, 0x5a6aa0, { r: 0 }), block(0.12, post + 0.2, 0.12, x + dx, y, z + dz, 0x5a6aa0, { r: 0 }));
    addStatic(level, merge(parts), { castShadow: false });
  }
  let t = 0;
  const holder = {};
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    if (o.flicker) mesh.material.color.setScalar(Math.sin(t * 23) > 0.96 ? 0.45 : 1);
  });
  return mesh;
}

/**
 * Lautsprecherturm (hinter der Piep-Treppe): hoher, dunkler Turm mit Neonkanten, Reihen großer Lautsprecher vorn
 * (Membranen pumpen im Takt, ein Instanz-Mesh) und Equalizer-Band. o = { pos (Mitte unten), width, depth, height,
 * rows, yaw? (Vorderseite +Z) }. Turm fest (Rückwand).
 */
export function speakerTower(level, o) {
  const [x, y, z] = o.pos;
  const w = o.width ?? 10, d = o.depth ?? 6, H = o.height ?? 34;
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + H, z + d / 2], tag: 'lautsprecherturm', camIgnore: true });
  const parts = [], glow = [];
  parts.push(block(w, H, d, x, y, z, 0x1c2248, { r: 0.2 }));
  for (const s of [-1, 1]) glow.push(block(0.14, H, 0.14, x + s * (w / 2 - 0.05), y, z + d / 2 - 0.05, s < 0 ? 0xff4af0 : 0x40e8ff, { r: 0 }));
  for (let yy = y + 4; yy < y + H - 1; yy += 6) glow.push(block(w + 0.1, 0.12, 0.12, x, yy, z + d / 2, 0x7a6aff, { r: 0 }));
  addStatic(level, merge(parts), { castShadow: false });
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  if (!level.view) return;
  // Lautsprecher: Rahmen (statisch) + Membran (Instanz, pumpt)
  const spots = [];
  const rows = o.rows ?? Math.floor(H / 6);
  for (let r = 0; r < rows; r++) for (const sx of [-w / 4, w / 4]) spots.push([x + sx, y + 3 + r * (H - 4) / rows, z + d / 2]);
  const frame = [];
  for (const [sx, sy, sz] of spots) {
    const g = new THREE.TorusGeometry(1.3, 0.22, 6, 20).toNonIndexed();
    g.translate(sx, sy, sz + 0.05);
    frame.push(colorize(g, fillc(L(0x8a96c8))));
  }
  addStatic(level, merge(frame), { castShadow: false });
  const cone = new THREE.ConeGeometry(1.15, 0.5, 20, 1, true);
  cone.rotateX(-Math.PI / 2);
  const coneG = colorize(cone, (p, n, out) => mixc(L(0x0c1030), L(0x3a4a8a), smooth(0, 1.1, Math.hypot(p.x, p.y)), out));
  const cap = sphere(0.35, 0, 0, 0.1, 0x8aa0ff, { ws: 10, hs: 6, sz: 0.5 });
  const mesh = new THREE.InstancedMesh(merge([coneG, cap]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }), spots.length);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.name = 'zier:lautsprecher';
  const M = new THREE.Matrix4(), V = new THREE.Vector3(), S = new THREE.Vector3(), Q = new THREE.Quaternion();
  addObject(level, mesh, () => {
    const b = beatNow(level);
    spots.forEach(([sx, sy, sz], i) => {
      const k = b.flash * (b.warn ? 1.4 : 1);
      V.set(sx, sy, sz - 0.1 + k * 0.25);
      S.set(1 + k * 0.08, 1 + k * 0.08, 1);
      M.compose(V, Q, S);
      mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

/** Discokugel (dreht sich, Facetten blitzen im Takt) an einer Kette von oben. pos = Kugelmitte. */
export function discoBall(level, pos, r = 1.1) {
  if (!level.view) return null;
  const [x, y, z] = pos;
  const g = new THREE.IcosahedronGeometry(r, 2);
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i += 3) {
    const k = 0.55 + 0.45 * Math.abs(Math.sin(i * 12.9898));
    for (let j = 0; j < 3; j++) col.set([0.75 * k, 0.8 * k, 0.95 * k], (i + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.85, flatShading: true, emissive: 0x223366 }));
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.name = 'zier:discokugel';
  addStatic(level, merge([cyl(0.03, 0.03, 8, x, y + r, z, 0x8a96c8, 4)]), { castShadow: false });
  let t = 0;
  const holder = {};
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    mesh.rotation.y = t * 0.8;
    const b = beatNow(level);
    mesh.material.emissive.setHex(b.red ? 0x441122 : 0x112244).multiplyScalar(0.6 + b.flash * 1.6);
  });
  return mesh;
}

// =====================================================================================================================
// Bergwiese (4-4)
// =====================================================================================================================

const ROCK_COLS = [0xb8b0a4, 0xa8a094, 0xc8c0b2, 0x9a9284];

/**
 * Felswand (achsenparallel, x0..x1, z0..z1, Fuß y, Höhe h) mit Wandloch (Nische) an der Seite face (+1 = Wand zeigt
 * nach +X): hole = { z0, z1, y0, y1, depth }. Kollision aus Quadern; climbable: Vorderseite mit Krallen kletterbar.
 * Optik: geschichteter Fels mit Moos oben, Nische dunkel.
 */
export function rockWall(level, o) {
  const { x0, x1, y, h } = o;
  const zA = Math.max(o.z0, o.z1), zB = Math.min(o.z0, o.z1);
  const hole = o.hole;
  const face = o.face ?? 1;
  const xf = face > 0 ? x1 : x0;                       // Vorderseite
  const add = (ax0, ax1, ay0, ay1, az0, az1, climb) => level.world.add({ type: 'box', min: [ax0, ay0, az0], max: [ax1, ay1, az1], climbable: !!climb, tag: 'felswand' });
  if (!hole) add(x0, x1, y, y + h, zB, zA, o.climbable);
  else {
    const hz0 = Math.min(hole.z0, hole.z1), hz1 = Math.max(hole.z0, hole.z1);
    const back = face > 0 ? x1 - hole.depth : x0 + hole.depth;
    add(x0, x1, y, hole.y0, zB, zA, o.climbable);                       // unten
    add(x0, x1, hole.y1, y + h, zB, zA, o.climbable);                   // oben
    add(x0, x1, hole.y0, hole.y1, zB, hz0, o.climbable);                // links/rechts der Nische
    add(x0, x1, hole.y0, hole.y1, hz1, zA, o.climbable);
    if (face > 0) add(x0, back, hole.y0, hole.y1, hz0, hz1); else add(back, x1, hole.y0, hole.y1, hz0, hz1);
  }
  if (!level.view) return;
  const parts = [];
  const rnd = new Rnd(Math.floor(Math.abs(x0 * 7 + zA * 13)) + 3);
  const strata = (p, n, out) => {
    if (n.y > 0.7) { mixc(L(0x6ab84a), L(0x8ad05a), 0.5 + 0.5 * Math.sin(p.x * 2 + p.z * 3), out); return; }
    const b = L(ROCK_COLS[Math.abs(Math.floor((p.y - y) / 0.9 + Math.sin(p.z * 0.7) * 0.6)) % ROCK_COLS.length]);
    const k = 0.78 + 0.22 * smooth(-0.6, 0.8, n.x * face * 0.6 + n.z * 0.4 + n.y * 0.3);
    out[0] = b[0] * k; out[1] = b[1] * k; out[2] = b[2] * k;
  };
  // Körper aus gestuften Blöcken (leicht unregelmäßig)
  const seg = (ax0, ax1, ay0, ay1, az0, az1) => {
    if (ax1 - ax0 < 0.05 || ay1 - ay0 < 0.05 || az1 - az0 < 0.05) return;
    const g = new THREE.BoxGeometry(ax1 - ax0, ay1 - ay0, az1 - az0, 2, Math.max(1, Math.round((ay1 - ay0) / 1.5)), Math.max(1, Math.round((az1 - az0) / 1.5))).toNonIndexed();
    const Pp = g.attributes.position;
    for (let i = 0; i < Pp.count; i++) {
      const px = Pp.getX(i), py = Pp.getY(i), pz = Pp.getZ(i);
      const j = Math.sin(py * 3.1 + pz * 2.3) * 0.12 + Math.sin(pz * 5.7 + py * 1.3) * 0.06;
      if (Math.abs(px) > (ax1 - ax0) / 2 - 0.01) Pp.setX(i, px + Math.sign(px) * j);
    }
    g.computeVertexNormals();
    g.translate((ax0 + ax1) / 2, (ay0 + ay1) / 2, (az0 + az1) / 2);
    parts.push(colorize(g, strata));
  };
  if (!hole) seg(x0, x1, y, y + h, zB, zA);
  else {
    const hz0 = Math.min(hole.z0, hole.z1), hz1 = Math.max(hole.z0, hole.z1);
    const back = face > 0 ? x1 - hole.depth : x0 + hole.depth;
    seg(x0, x1, y, hole.y0, zB, zA); seg(x0, x1, hole.y1, y + h, zB, zA);
    seg(x0, x1, hole.y0, hole.y1, zB, hz0); seg(x0, x1, hole.y0, hole.y1, hz1, zA);
    if (face > 0) seg(x0, back, hole.y0, hole.y1, hz0, hz1); else seg(back, x1, hole.y0, hole.y1, hz0, hz1);
    // dunkler Nischenboden mit Gras, kleines Holzschild
    parts.push(plate(hole.depth - 0.1, 0.06, hz1 - hz0 - 0.1, face > 0 ? x1 - hole.depth / 2 : x0 + hole.depth / 2, hole.y0, (hz0 + hz1) / 2, 0x5aa83a, { r: 0 }));
  }
  // Moospolster und Grasbüschel oben, kleine Felsbrocken am Fuß
  for (let i = 0; i < Math.round((zA - zB) / 1.6); i++) {
    parts.push(sphere(rnd.real(0.35, 0.6), rnd.real(x0 + 0.3, x1 - 0.3), y + h + 0.05, rnd.real(zB + 0.3, zA - 0.3), 0x5ab03a, { ws: 6, hs: 4, sy: 0.45 }));
    parts.push(sphere(rnd.real(0.25, 0.5), xf + face * rnd.real(0.2, 0.7), y + 0.1, rnd.real(zB, zA), ROCK_COLS[i % 4], { ws: 6, hs: 4, sy: 0.7 }));
  }
  if (o.climbable) {
    // Kletterspuren: helle Griffmulden an der Vorderseite
    for (let yy = y + 0.8; yy < y + h - 0.4; yy += 0.9) for (let zz = zB + 0.6; zz < zA - 0.4; zz += 1.3) {
      if (hole && yy > hole.y0 - 0.3 && yy < hole.y1 + 0.3 && zz > Math.min(hole.z0, hole.z1) - 0.3 && zz < Math.max(hole.z0, hole.z1) + 0.3) continue;
      parts.push(sphere(0.12, xf + face * 0.03, yy + ((zz * 3) % 0.4), zz, 0xe8e0cc, { ws: 5, hs: 3, sx: 0.5 }));
    }
  }
  addStatic(level, merge(parts));
}

/** Schaf-Geometrie (Ursprung Fußpunkt, Blick +X): Wollwolke, schwarzer Kopf und Beine. */
function sheepGeo() {
  const P = [];
  const wool = 0xf8f6ee, black = 0x2a2428;
  for (const [x, yy, z, r] of [[0, 0.62, 0, 0.42], [0.22, 0.66, 0.14, 0.3], [-0.22, 0.64, -0.12, 0.32], [0.2, 0.62, -0.16, 0.28], [-0.2, 0.66, 0.16, 0.3], [0, 0.85, 0, 0.3]]) P.push(sphere(r, x, yy, z, wool, { ws: 8, hs: 6 }));
  for (const [lx, lz] of [[0.22, 0.14], [0.22, -0.14], [-0.22, 0.14], [-0.22, -0.14]]) P.push(cyl(0.05, 0.05, 0.36, lx, 0, lz, black, 5));
  P.push(sphere(0.17, 0.5, 0.72, 0, black, { ws: 8, hs: 6, sx: 1.25 }));
  P.push(sphere(0.12, 0.45, 0.88, 0, wool, { ws: 6, hs: 4 }));                        // Wollschopf
  for (const s of [-1, 1]) P.push(sphere(0.07, 0.42, 0.74, s * 0.17, black, { ws: 5, hs: 3, sx: 0.6, sz: 1.6 }));   // Ohren
  for (const s of [-1, 1]) P.push(sphere(0.035, 0.64, 0.78, s * 0.07, 0xffffff, { ws: 5, hs: 3 }));
  return merge(P);
}

/**
 * Grasende Schafe (Zier): list = [[x, y, z, yaw], …]. Ein Instanz-Mesh (mit Sonnenschatten), Kopf nickt beim Grasen,
 * ab und zu ein Hüpfer. Blob-Schatten.
 */
export function sheep(level, list) {
  if (!level.view || !list.length) return null;
  const mesh = new THREE.InstancedMesh(sheepGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), list.length);
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'zier:schafe';
  for (const s of list) level.view.shadows?.add({ pos: new THREE.Vector3(s[0], s[1], s[2]), radius: 0.5 });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  let t = 0;
  const holder = {};
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    list.forEach(([x, y, z, yaw], i) => {
      const ph = i * 1.7;
      const hop = Math.max(0, Math.sin(t * 0.9 + ph * 3)) > 0.985 ? 0 : 0;
      const graze = Math.sin(t * 0.7 + ph);
      const jump = Math.max(0, Math.sin((t + ph) * 5)) * (((Math.floor((t + ph) / 6) + i) % 5) === 0 ? 0.25 : 0);
      E.set(0, (yaw ?? 0) + Math.sin(t * 0.13 + ph) * 0.4, graze > 0.3 ? -0.18 : 0.02);
      Q.setFromEuler(E);
      V.set(x, y + jump + hop, z);
      M.compose(V, Q, S);
      mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return mesh;
}

/** Drachen (Kinder-Drachen mit Schleifenschwanz) an langer Schnur über der Wiese. o = { anchor, pos, colors }. */
export function kite(level, o) {
  if (!level.view) return null;
  const [cx, cy, cz] = o.pos;
  const cols = o.colors ?? [0xff4a5a, 0xffd23a, 0x3a9aff, 0x5ad05a];
  const P = [];
  const quad = (a, b, c, col) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); g.computeVertexNormals(); P.push(colorize(g, fillc(L(col)))); };
  const T = [0, 1.1, 0], R = [0.7, 0.1, 0], B = [0, -1.4, 0], Lf = [-0.7, 0.1, 0], C = [0, 0.1, 0.08];
  quad(T, Lf, C, cols[0]); quad(T, C, R, cols[1]); quad(B, C, Lf, cols[2]); quad(B, R, C, cols[3]);
  quad(T, C, Lf, cols[0]); quad(T, R, C, cols[1]); quad(B, Lf, C, cols[2]); quad(B, C, R, cols[3]);
  for (let i = 0; i < 5; i++) P.push(block(0.25, 0.06, 0.06, 0, -1.6 - i * 0.45, 0, cols[i % 4], { r: 0 }));
  const mesh = new THREE.Mesh(merge(P), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
  mesh.name = 'zier:drachen';
  mesh.castShadow = false;
  const anchor = o.anchor;
  const lineG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...anchor), new THREE.Vector3(cx, cy, cz)]);
  const string = new THREE.Line(lineG, new THREE.LineBasicMaterial({ color: 0xf6f0e0 }));
  const grp = new THREE.Group();
  grp.add(mesh, string);
  let t = 0;
  const holder = {};
  addObject(level, grp, (dt) => {
    t += visDt(level, holder, dt);
    const x = cx + Math.sin(t * 0.4) * 2.2, y = cy + Math.sin(t * 0.7) * 1.2, z = cz + Math.cos(t * 0.33) * 1.5;
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.sin(t * 1.1) * 0.15, Math.sin(t * 0.3) * 0.4, Math.sin(t * 0.9) * 0.25);
    const a = lineG.attributes.position;
    a.setXYZ(1, x, y - 0.6, z); a.needsUpdate = true;
  });
  return grp;
}

/** Bienen/Schmetterlinge als kleine Punkte, die um Blumenbeete kreisen (ein Points-Objekt). spots = [[x, y, z, r], …]. */
export function bees(level, spots, o = {}) {
  if (!level.view || !spots.length) return null;
  const per = o.per ?? 3, n = spots.length * per;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cols = (o.colors ?? [0xffd23a, 0xffffff, 0xff8ac8, 0x8ac8ff]).map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) { const c = cols[i % cols.length]; col.set([c.r, c.g, c.b], i * 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: o.size ?? 0.16, vertexColors: true }));
  pts.frustumCulled = false; pts.name = 'zier:bienen';
  let t = 0;
  const holder = {};
  addObject(level, pts, (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const [x, y, z, r] = spots[Math.floor(i / per)];
      const a = t * (1.2 + (i % 3) * 0.4) + i * 2.1;
      pos[i * 3] = x + Math.cos(a) * r * (0.6 + 0.4 * Math.sin(a * 0.7));
      pos[i * 3 + 1] = y + 0.6 + Math.sin(a * 2.3) * 0.25;
      pos[i * 3 + 2] = z + Math.sin(a) * r;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

export { clamp };
