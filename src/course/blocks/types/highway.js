// Autobahn-Bausteine (Thema `highway`, 1-Burg): Fahrbahn auf Pfeilern, fahrende Bossstraße (Laufband-Illusion),
// Stadtsilhouette in der Ferne und Straßen-Zier. Farben aus dem Thema (theme_highway.js), Rückfall Grau.
//
// road      Hochstraße entlang −Z: Betonplatte, Asphalt mit Fahrspuren (Reifenspuren dunkler), Markierungen
//           (Leitlinien gestrichelt, Randlinien durchgezogen), Bordsteine, Leitplanken (mit Kollision), Laternen,
//           Pfeiler bis zur Stadtebene, darunter Dächer der Stadt.
//   { type: 'road', from: [x, y, z0], to: [x, y, z1] (y = Fahrbahnoberkante; z0 > z1), width: 12, lanes: 3,
//     deck: 1.4 (Plattendicke), rails: 'both' | 'left' | 'right' | 'none' (Leitplanken 0,95 m, Kollision,
//     camIgnore), lamps: 24 (Abstand in m, 0 = keine), lampSide: 'right' | 'left' | 'both', pillars: 24
//     (Abstand, 0 = keine), city: true (Dächer unter der Straße), markings: true, collide: true }
// bossroad  Wie road, aber Markierungen, Leitplankenpfosten, Laternen, Schilderbrücken, Überführungen, Pfeiler
//           und die Stadt darunter laufen auf die Kamera zu (Fahrt-Illusion), sobald level.highway.speed > 0 ist
//           (setzt der Boss-Archetyp). Sie werden an den Enden der Straße weich abgeschnitten (Shader-Clip).
//   { type: 'bossroad', from, to, width: 14, lanes: 4, deck, rails, period: 96 (Wiederholung der Zier) }
// skyline   Stadtsilhouette am Abendhorizont (folgt der Kamera, leichte Parallaxe; Seitenbänder ziehen bei
//           level.highway.speed vorbei), beleuchtete Fenster.  { type: 'skyline', seed?: 1 }
// hwdeco    Zier/Hindernisse.  { type: 'hwdeco', items: [{ kind, … }] }  kind:
//   gantry   Schilderbrücke quer über die Straße: { z, y, x0, x1, signs: [{ slot, x, w }] }
//   sign     Schild am Pfosten: { pos, slot, w: 2.4, h: 1.4, yaw: 0 (Schildfläche blickt nach +Z), post: 2.2 }
//            slots: 0 grün „Burg Brummbär ↑“, 1 blau „A 1“, 2 gelb „Achtung Bomben!“, 3 Baustelle, 4 „Rastplatz“,
//            5 „Ausfahrt“ (Pfeil), 6 Tempo 30
//   barrier  Betonleitwand (Kollision 0,8 m): { from: [x, y, z], to: [x, y, z] } (achsenparallel)
//   cone     Leitkegel: { pos } | cones { from, to, n }
//   car      geparktes Kugelauto (Kollision): { pos, yaw (0 = Front nach +X), color }
//   lamp     Laterne: { pos, side: 1 | -1 (Arm nach +X / −X) }
//   bridge   Überführung quer über die Straße: { z, y (Unterkante), x0, x1, width: 6 } – Pfeiler mit Kollision
//   tlight   Ampel (Modell traffic_light): { pos, yaw, mode: 'start' (rot → gelb → grün) | 'blink' }
// Kollision: Platten (box), Leitplanken (box, camIgnore, noWallSlide), Pfeiler/Pfosten außerhalb der Fahrbahn
// (box/cyl), Leitwände, Autos.

import * as THREE from 'three';
import { v3, box, lin, mixc, colorize, merge, themeOf, addStatic, addObject, Rnd } from '../kit.js';
import { getModel } from '../../models/index.js';

const FLAT = { r: 0, seg: 0 };
const T = (th, k, d) => th[k] ?? d;

/** Gemeinsamer Fahrt-Zustand (Boss-Archetyp setzt speed; offset = gefahrene Meter, je Bild fortgeschrieben). */
export function highwayState(level) {
  if (!level.highway) level.highway = { speed: 0, offset: 0 };
  return level.highway;
}

// ------------------------------------------------------------------ Geometrie-Hilfen

/** Waagerechtes Rechteck (2 Dreiecke, Normale +Y, von oben sichtbar) in Weltkoordinaten. */
function quadUp(x0, z0, x1, z1, y, color) {
  const c = Array.isArray(color) ? color : lin(color);
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([xa, y, za, xa, y, zb, xb, y, zb, xa, y, za, xb, y, zb, xb, y, za], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([...c, ...c, ...c, ...c, ...c, ...c], 3));
  return g;
}

const fb = (w, h, d, x, y, z, color, opts = FLAT) => box(w, h, d, x, y, z, color, opts);

/** Asphaltstreifen [x0,x1]×[za,zb]: Spalten je Fahrspur (Reifenspuren dunkler), Zeilen 2 m mit Rauschen. */
function asphaltGeo(x0, x1, za, zb, y, lanes, th, rnd) {
  const a = lin(T(th, 'asphalt', 0x3d3b4c)), b = lin(T(th, 'asphaltLight', 0x4a4859)), dark = mixc(a, [0, 0, 0], 0.18, [0, 0, 0]);
  const W = x1 - x0, lw = W / lanes;
  const xs = [x0];
  for (let i = 0; i < lanes; i++) {
    const l0 = x0 + i * lw;
    for (const f of [0.18, 0.3, 0.7, 0.82]) xs.push(l0 + lw * f);
    xs.push(l0 + lw);
  }
  const zs = [];
  const z0 = Math.max(za, zb), z1 = Math.min(za, zb);
  for (let z = z0; z > z1 + 1e-4; z -= 2) zs.push(z);
  zs.push(z1);
  const parts = [];
  for (let j = 0; j < zs.length - 1; j++) {
    const n = rnd.frac();
    for (let i = 0; i < xs.length - 1; i++) {
      const lane = ((xs[i] + xs[i + 1]) / 2 - x0) / lw;
      const f = lane - Math.floor(lane);
      const track = (f > 0.18 && f < 0.3) || (f > 0.7 && f < 0.82);
      const c = mixc(track ? dark : a, b, n * 0.35, [0, 0, 0]);
      parts.push(quadUp(xs[i], zs[j], xs[i + 1], zs[j + 1], y, c));
    }
  }
  return merge(parts);
}

/** Markierungen: Leitlinien gestrichelt (dash/gap), Randlinien durchgezogen. */
function markingsGeo(x0, x1, za, zb, y, lanes, th, dash = 3, gap = 3, phase = 0) {
  const parts = [];
  const white = T(th, 'marking', 0xf5f3ee);
  const z0 = Math.max(za, zb), z1 = Math.min(za, zb);
  const W = x1 - x0, lw = W / lanes;
  parts.push(quadUp(x0 + 0.25, z0, x0 + 0.42, z1, y, white), quadUp(x1 - 0.42, z0, x1 - 0.25, z1, y, white));
  for (let i = 1; i < lanes; i++) {
    const x = x0 + i * lw;
    const P = dash + gap;
    for (let z = z0 - (((z0 - phase) % P) + P) % P; z > z1 - P; z -= P) {
      const a = Math.min(z0, z), b = Math.max(z1, z - dash);
      if (a - b > 0.05) parts.push(quadUp(x - 0.08, a, x + 0.08, b, y, white));
    }
  }
  return merge(parts);
}

/** Leitplanke entlang z bei x (Pfosten alle 2 m, Band, Reflektoren); dir = Seite der Fahrbahn (+1: Band innen +X). */
function railGeo(x, za, zb, y, side, th, posts = true) {
  const parts = [];
  const z0 = Math.max(za, zb), z1 = Math.min(za, zb), L = z0 - z1, zc = (z0 + z1) / 2;
  const rail = T(th, 'rail', 0xdfe4ee), post = T(th, 'railPost', 0x6a7080);
  const bx = x + side * 0.12;
  parts.push(fb(0.07, 0.34, L, bx, y + 0.66, zc, rail, { r: 0.02, seg: 1 }));
  parts.push(fb(0.04, 0.04, L, bx + side * 0.04, y + 0.6, zc, 0x8a92a0));
  parts.push(fb(0.04, 0.04, L, bx + side * 0.04, y + 0.72, zc, 0x8a92a0));
  if (posts) for (let z = z0 - 1; z > z1; z -= 2) parts.push(fb(0.12, 0.85, 0.12, x, y + 0.42, z, post));
  return merge(parts);
}

function railReflectors(x, za, zb, y, side) {
  const parts = [];
  const z0 = Math.max(za, zb), z1 = Math.min(za, zb);
  for (let z = z0 - 1; z > z1; z -= 4) parts.push(fb(0.03, 0.08, 0.14, x + side * 0.17, y + 0.66, z, 0xff4a2a));
  return parts.length ? merge(parts) : null;
}

/** Laterne: Mast an x (Seite side: Arm zeigt nach −side·X über die Fahrbahn). */
function lampGeo(x, y, z, side, th, out, glow) {
  out.push(fb(0.16, 7.4, 0.16, x, y + 3.7, z, 0x5a6070));
  out.push(fb(0.36, 0.3, 0.36, x, y + 0.15, z, 0x4a5060));
  out.push(fb(2.2, 0.12, 0.12, x - side * 1.05, y + 7.35, z, 0x5a6070));
  out.push(fb(0.7, 0.18, 0.36, x - side * 2.0, y + 7.25, z, 0x3a3f4a));
  glow.push(fb(0.6, 0.06, 0.28, x - side * 2.0, y + 7.13, z, T(th, 'lampLight', 0xffe2a0)));
}

/** Pfeiler unter der Platte (Kopfbalken, zwei Stützen). */
function pillarGeo(cx, w, yTop, depth, z, th, out) {
  const con = T(th, 'concrete', 0xc9c5d2), dk = T(th, 'concreteDark', 0x8f8a9e);
  out.push(fb(w * 0.8, 1.0, 1.6, cx, yTop - 0.5, z, dk));
  for (const s of [-1, 1]) out.push(fb(1.3, depth, 1.3, cx + s * w * 0.26, yTop - 1 - depth / 2, z, con));
}

/** Dächer der Stadt unter der Hochstraße (zwei Seiten, je Abschnitt). */
function cityBelow(cx, w, za, zb, yTop, th, rnd, out, glow) {
  const z0 = Math.max(za, zb), z1 = Math.min(za, zb);
  const cols = T(th, 'city', [0x2c2448, 0x3a2f5c, 0x47386a, 0x332a52]);
  const win = T(th, 'cityWindow', 0xffd88a);
  for (const s of [-1, 1]) {
    for (let z = z0 - rnd.real(0, 4); z > z1; z -= rnd.real(7, 12)) {
      const x = cx + s * (w / 2 + rnd.real(6, 40));
      const bw = rnd.real(5, 10), bd = rnd.real(5, 9);
      const top = yTop - rnd.real(9, 20), bottom = yTop - 34;
      const h = top - bottom;
      out.push(fb(bw, h, bd, x, bottom + h / 2, z, rnd.pick(cols)));
      out.push(fb(bw + 0.4, 0.3, bd + 0.4, x, top + 0.15, z, 0x5a4e78));
      if (rnd.chance(0.5)) out.push(fb(1.4, 1, 1.4, x + rnd.real(-1.5, 1.5), top + 0.8, z + rnd.real(-1.5, 1.5), 0x6a6488));
      // Fensterbänder (zur Straße und nach oben sichtbar)
      for (let k = 1; k <= 3; k++) {
        const yy = top - k * 2.2;
        if (yy < bottom + 2) break;
        glow.push(fb(0.06, 0.5, bd * 0.7, x - s * (bw / 2 + 0.02), yy, z, rnd.chance(0.6) ? win : 0x6a5a8a));
      }
    }
  }
}

// ------------------------------------------------------------------ road

function roadParams(spec) {
  const a = v3(spec.from ?? spec.pos ?? [0, 0, 0]), b = v3(spec.to ?? [a.x, a.y, a.z - 32]);
  return {
    cx: a.x, y: a.y, z0: Math.max(a.z, b.z), z1: Math.min(a.z, b.z),
    w: spec.width ?? 12, lanes: spec.lanes ?? 3, deck: spec.deck ?? 1.4,
    rails: spec.rails ?? 'both', lamps: spec.lamps ?? 24, lampSide: spec.lampSide ?? 'right',
    pillars: spec.pillars ?? 24, city: spec.city !== false, markings: spec.markings !== false,
  };
}

function addRoadCollision(level, r, spec) {
  const x0 = r.cx - r.w / 2, x1 = r.cx + r.w / 2;
  if (spec.collide !== false) level.world.add({ type: 'box', min: [x0, r.y - r.deck, r.z1], max: [x1, r.y, r.z0], tag: spec.tag ?? 'road' });
  const rails = r.rails;
  if (rails === 'both' || rails === 'left') level.world.add({ type: 'box', min: [x0, r.y, r.z1], max: [x0 + 0.3, r.y + 0.95, r.z0], camIgnore: true, noWallSlide: true, tag: 'guardrail' });
  if (rails === 'both' || rails === 'right') level.world.add({ type: 'box', min: [x1 - 0.3, r.y, r.z1], max: [x1, r.y + 0.95, r.z0], camIgnore: true, noWallSlide: true, tag: 'guardrail' });
}

/** Statische Teile eines Abschnitts [za, zb] (je ≤ 16 m, damit Frustum-Culling je Abschnitt greift). */
function roadChunk(level, r, za, zb, opts = {}) {
  const th = themeOf(level);
  const rnd = level.rnd;
  const x0 = r.cx - r.w / 2, x1 = r.cx + r.w / 2, len = za - zb, zc = (za + zb) / 2;
  const parts = [], glow = [], under = [];
  // Platte: Betonkörper, dunkles Band, Unterseite
  parts.push(fb(r.w, r.deck - 0.25, len, r.cx, r.y - 0.25 - (r.deck - 0.25) / 2, zc, T(th, 'concrete', 0xc9c5d2), { r: 0.06, seg: 1, bottomShade: 0.55 }));
  parts.push(fb(r.w + 0.12, 0.25, len, r.cx, r.y - 0.125, zc, T(th, 'concreteDark', 0x8f8a9e)));
  // Bordsteine und Asphalt
  parts.push(fb(0.36, 0.14, len, x0 + 0.18, r.y + 0.07, zc, T(th, 'curb', 0xe6e2ea)));
  parts.push(fb(0.36, 0.14, len, x1 - 0.18, r.y + 0.07, zc, T(th, 'curb', 0xe6e2ea)));
  parts.push(asphaltGeo(x0 + 0.36, x1 - 0.36, za, zb, r.y + 0.004, r.lanes, th, rnd));
  if (r.markings && !opts.noMarkings) parts.push(markingsGeo(x0 + 0.36, x1 - 0.36, za, zb, r.y + 0.012, r.lanes, th));
  if (r.rails === 'both' || r.rails === 'left') { parts.push(railGeo(x0 + 0.1, za, zb, r.y, 1, th, !opts.noPosts)); const g = railReflectors(x0 + 0.1, za, zb, r.y, 1); if (g && !opts.noPosts) glow.push(g); }
  if (r.rails === 'both' || r.rails === 'right') { parts.push(railGeo(x1 - 0.1, za, zb, r.y, -1, th, !opts.noPosts)); const g = railReflectors(x1 - 0.1, za, zb, r.y, -1); if (g && !opts.noPosts) glow.push(g); }
  if (!opts.noLamps && r.lamps > 0) {
    for (let z = Math.ceil(zb / r.lamps) * r.lamps; z <= za; z += r.lamps) {
      if (z === zb && zb !== r.z1) continue;
      if (r.lampSide !== 'left') lampGeo(x1 + 0.35, r.y, z, 1, th, parts, glow);
      if (r.lampSide !== 'right') lampGeo(x0 - 0.35, r.y, z + r.lamps / 2, -1, th, parts, glow);
    }
  }
  if (!opts.noPillars && r.pillars > 0) {
    for (let z = Math.ceil(zb / r.pillars) * r.pillars; z <= za; z += r.pillars) {
      if (z === zb && zb !== r.z1) continue;
      pillarGeo(r.cx, r.w, r.y - r.deck, 32, z, th, under);
    }
  }
  if (!opts.noCity && r.city) cityBelow(r.cx, r.w, za, zb, r.y - r.deck, th, rnd, under, glow);
  addStatic(level, merge(parts));
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  if (under.length) addStatic(level, merge(under), { castShadow: false, receiveShadow: false });
}

export function buildRoad(level, spec) {
  const r = roadParams(spec);
  addRoadCollision(level, r, spec);
  for (let za = r.z0; za > r.z1 + 1e-3; za -= 16) roadChunk(level, r, za, Math.max(r.z1, za - 16));
}

// ------------------------------------------------------------------ bossroad (Laufband-Illusion)

/** Material mit z-Clip (Fragmente außerhalb [zMin, zMax] in Weltkoordinaten werden verworfen). */
function clipMaterial(base, zMin, zMax) {
  const m = base;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.clipZ = { value: new THREE.Vector2(zMin, zMax) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vClipZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvClipZ = (modelMatrix * vec4(transformed, 1.0)).z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vClipZ;\nuniform vec2 clipZ;')
      .replace('void main() {', 'void main() {\n  if (vClipZ < clipZ.x || vClipZ > clipZ.y) discard;');
  };
  m.customProgramCacheKey = () => `clipz:${zMin}:${zMax}`;
  return m;
}

export function buildBossRoad(level, spec) {
  const r = roadParams({ width: 14, lanes: 4, lamps: 24, pillars: 24, ...spec });
  const P = spec.period ?? 96;
  addRoadCollision(level, r, spec);
  // Statisch: Platte, Asphalt, Leitplankenband – ohne Markierungen, Pfosten, Laternen, Pfeiler, Stadt
  const plain = { ...r };
  for (let za = r.z0; za > r.z1 + 1e-3; za -= 16) {
    roadChunk(level, plain, za, Math.max(r.z1, za - 16), { noMarkings: true, noPosts: true, noLamps: true, noPillars: true, noCity: true });
  }
  if (!level.view) return;
  const th = themeOf(level);
  const rnd = new Rnd(0xb055 + Math.round(r.z0));
  // Laufende Teile über [z1 − P, z0] (ein Mesh je Material); Versatz offset mod P
  const zs = r.z1 - P, ze = r.z0;
  const x0 = r.cx - r.w / 2, x1 = r.cx + r.w / 2;
  const parts = [], glow = [], under = [];
  parts.push(markingsGeo(x0 + 0.36, x1 - 0.36, ze, zs, r.y + 0.012, r.lanes, th, 3, 3, 0));
  // dunkle Flickstellen/Fugen: Fahrtwind sichtbar machen
  for (let z = ze - 3; z > zs; z -= rnd.real(5, 11)) {
    const lane = rnd.int(0, r.lanes - 1), lw = (r.w - 0.72) / r.lanes;
    const lx = x0 + 0.36 + lw * (lane + rnd.real(0.25, 0.75));
    parts.push(quadUp(lx - rnd.real(0.4, 1.0), z, lx + rnd.real(0.4, 1.0), z - rnd.real(0.3, 1.4), r.y + 0.008, mixc(lin(T(th, 'asphalt', 0x3d3b4c)), [0, 0, 0], 0.3, [0, 0, 0])));
  }
  for (let z = ze - 4; z > zs; z -= 8) parts.push(quadUp(x0 + 0.4, z, x1 - 0.4, z - 0.12, r.y + 0.008, 0x2e2c3a));
  for (const [x, side] of [[x0 + 0.1, 1], [x1 - 0.1, -1]]) {
    for (let z = ze - 1; z > zs; z -= 2) parts.push(fb(0.12, 0.85, 0.12, x, r.y + 0.42, z, T(th, 'railPost', 0x6a7080)));
    for (let z = ze - 1; z > zs; z -= 4) glow.push(fb(0.03, 0.08, 0.14, x + side * 0.17, r.y + 0.66, z, 0xff4a2a));
  }
  for (let z = ze - 2; z > zs; z -= 24) {
    lampGeo(x1 + 0.35, r.y, z, 1, th, parts, glow);
    lampGeo(x0 - 0.35, r.y, z - 12, -1, th, parts, glow);
    pillarGeo(r.cx, r.w, r.y - r.deck, 32, z - 6, th, under);
  }
  // Schilderbrücken und Überführungen je Periode
  for (let k = 0; k * P < ze - zs; k++) {
    const zg = ze - 30 - k * P;
    if (zg > zs) gantryGeo({ z: zg, y: r.y, x0: x0 - 0.6, x1: x1 + 0.6, signs: [{ slot: 0, x: r.cx - 3.2, w: 4.6 }, { slot: 1, x: r.cx + 2.2, w: 2.2 }] }, th, parts, glow, null);
    const zb = ze - 78 - k * P;
    if (zb > zs) bridgeGeo({ z: zb, y: r.y + 8.5, x0: x0 - 14, x1: x1 + 14, width: 7 }, th, parts, glow);
  }
  cityBelow(r.cx, r.w, ze, zs, r.y - r.deck, th, rnd, under, glow);
  const view = level.view;
  const group = new THREE.Group();
  group.name = 'bossstraße';
  const clipMax = r.z0 + 0.01;
  const mk = (gs, mat, shadow) => {
    if (!gs.length) return null;
    const m = new THREE.Mesh(merge(gs), mat);
    m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
    group.add(m);
    return m;
  };
  mk(parts, clipMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), r.z1 - 400, clipMax), false);
  mk(glow, clipMaterial(new THREE.MeshBasicMaterial({ vertexColors: true }), r.z1 - 400, clipMax), false);
  // Stadt unter der Straße: auch hinter der Straße sichtbar (kein Clip an z0 + Rand 40 m)
  mk(under, clipMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), r.z1 - 400, r.z0 + 40), false);
  // Signs-Atlas für Schilderbrücken
  const signMesh = signsMesh(level, group);
  const hw = highwayState(level);
  addObject(level, group, (dt) => {
    hw.offset += hw.speed * dt;
    group.position.z = ((hw.offset % P) + P) % P;
  });
  // Schilderflächen (Textur) fahren mit
  if (signMesh) for (let k = 0; k * P < ze - zs; k++) {
    const zg = ze - 30 - k * P;
    if (zg > zs) {
      signFace(signMesh, 0, r.cx - 3.2, r.y + 6.1, zg + 0.16, 4.6, 1.6);
      signFace(signMesh, 1, r.cx + 2.2, r.y + 6.1, zg + 0.16, 2.2, 1.6);
    }
  }
  signMesh?.userData.finish?.();
  if (signMesh) signMesh.material = clipMaterial(signMesh.material, r.z1 - 400, clipMax);
  level.named.set(spec.id ?? 'bossroad', { state: hw, z0: r.z0, z1: r.z1, y: r.y, w: r.w, cx: r.cx });
}

// ------------------------------------------------------------------ Schilder (Textur-Atlas, ein Zeichenaufruf)

const SLOTS = 8;
let ATLAS = null;
function signAtlas() {
  if (ATLAS) return ATLAS;
  const W = 256, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H * SLOTS;
  const g = c.getContext('2d');
  const font = (s) => `bold ${s}px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif`;
  const frame = (y, bg, fg) => {
    g.fillStyle = bg; g.fillRect(0, y, W, H);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, y + 8, W - 16, H - 16);
  };
  const arrow = (x, y, s, dir, color) => {
    g.save(); g.translate(x, y); g.rotate(dir); g.fillStyle = color;
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.7, -s * 0.2); g.lineTo(s * 0.25, -s * 0.2); g.lineTo(s * 0.25, s); g.lineTo(-s * 0.25, s); g.lineTo(-s * 0.25, -s * 0.2); g.lineTo(-s * 0.7, -s * 0.2); g.closePath(); g.fill();
    g.restore();
  };
  // 0: grün – Burg Brummbär ↑
  frame(0, '#1f8a4c', '#ffffff');
  g.fillStyle = '#fff'; g.font = font(30); g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('Burg', 70, 44); g.fillText('Brummbär', 70, 84);
  arrow(38, 64, 26, 0, '#fff');
  // 1: blau – A 1
  frame(H, '#2a5fc8', '#ffffff');
  g.fillStyle = '#fff'; g.font = font(56); g.textAlign = 'center'; g.fillText('A 1', W / 2, H + 66);
  // 2: gelb – Achtung Bomben! (Warndreieck mit Bombe)
  frame(H * 2, '#ffcf3a', '#2a2a2a');
  g.fillStyle = '#d02020'; g.beginPath(); g.moveTo(60, H * 2 + 18); g.lineTo(104, H * 2 + 104); g.lineTo(16, H * 2 + 104); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(60, H * 2 + 38); g.lineTo(90, H * 2 + 96); g.lineTo(30, H * 2 + 96); g.closePath(); g.fill();
  g.fillStyle = '#2c3274'; g.beginPath(); g.arc(60, H * 2 + 78, 13, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c89a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, H * 2 + 66); g.lineTo(70, H * 2 + 56); g.stroke();
  g.fillStyle = '#2a2a2a'; g.font = font(26); g.textAlign = 'left'; g.fillText('Achtung', 116, H * 2 + 48); g.fillText('Bomben!', 116, H * 2 + 84);
  // 3: Baustelle (rot-weiß gestreift mit Schaufel-Männchen)
  g.fillStyle = '#fff'; g.fillRect(0, H * 3, W, H);
  for (let i = -4; i < 12; i++) { g.fillStyle = '#e02a2a'; g.beginPath(); g.moveTo(i * 36, H * 3 + H); g.lineTo(i * 36 + 18, H * 3 + H); g.lineTo(i * 36 + 18 + H, H * 3); g.lineTo(i * 36 + H, H * 3); g.closePath(); g.fill(); }
  g.fillStyle = '#ffcf3a'; g.fillRect(36, H * 3 + 30, W - 72, 68);
  g.fillStyle = '#2a2a2a'; g.font = font(30); g.textAlign = 'center'; g.fillText('Baustelle', W / 2, H * 3 + 66);
  // 4: Rastplatz (blau, Tasse und Baum)
  frame(H * 4, '#2a5fc8', '#ffffff');
  g.fillStyle = '#fff'; g.font = font(34); g.textAlign = 'left'; g.fillText('Rastplatz', 90, H * 4 + 66);
  g.fillStyle = '#7ad04a'; g.beginPath(); g.arc(46, H * 4 + 50, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a5a36'; g.fillRect(42, H * 4 + 64, 8, 30);
  // 5: Ausfahrt (gelb, Pfeil schräg)
  frame(H * 5, '#ffcf3a', '#2a2a2a');
  g.fillStyle = '#2a2a2a'; g.font = font(32); g.textAlign = 'left'; g.fillText('Ausfahrt', 24, H * 5 + 66);
  arrow(212, H * 5 + 64, 26, Math.PI / 4, '#2a2a2a');
  // 6: Tempo 30 (rund)
  g.fillStyle = '#5a6070'; g.fillRect(0, H * 6, W, H);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H * 6 + 64, 58, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e02a2a'; g.lineWidth = 14; g.beginPath(); g.arc(W / 2, H * 6 + 64, 50, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#2a2a2a'; g.font = font(48); g.textAlign = 'center'; g.fillText('30', W / 2, H * 6 + 68);
  // 7: Mautstation / Lotti & Greta (Wegweiser)
  frame(H * 7, '#1f8a4c', '#ffffff');
  g.fillStyle = '#fff'; g.font = font(28); g.textAlign = 'center'; g.fillText('Abendstadt', W / 2, H * 7 + 50); g.font = font(22); g.fillText('12 km', W / 2, H * 7 + 86);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  ATLAS = tex;
  return tex;
}

/** Sammel-Mesh für Schildflächen (UV aus dem Atlas); signFace() fügt Flächen hinzu, finish() baut. */
function signsMesh(level, parent) {
  if (typeof document === 'undefined') return null;
  const mat = new THREE.MeshStandardMaterial({ map: signAtlas(), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12, emissiveMap: signAtlas() });
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  m.frustumCulled = false;
  m.userData.faces = [];
  m.userData.finish = () => {
    const pos = [], nor = [], uv = [];
    for (const f of m.userData.faces) { pos.push(...f.pos); nor.push(...f.nor); uv.push(...f.uv); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    m.geometry.dispose();
    m.geometry = g;
  };
  m.userData.owned = true;
  parent.add(m);
  return m;
}

/** Schildfläche (Breite w, Höhe h, Mitte x/y/z), blickt nach +Z (bzw. um yaw gedreht). */
function signFace(mesh, slot, x, y, z, w, h, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v) => [x + u * c, y + v, z - u * s];
  const v0 = 1 - (slot + 1) / SLOTS + 0.004, v1 = 1 - slot / SLOTS - 0.004;
  const a = P(-w / 2, -h / 2), b = P(w / 2, -h / 2), cc = P(w / 2, h / 2), d = P(-w / 2, h / 2);
  const n = [s, 0, c];
  mesh.userData.faces.push({
    pos: [...a, ...b, ...cc, ...a, ...cc, ...d],
    nor: [...n, ...n, ...n, ...n, ...n, ...n],
    uv: [0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1],
  });
}

function gantryGeo(it, th, parts, glow, mesh) {
  const y = it.y ?? 0, z = it.z;
  const x0 = it.x0, x1 = it.x1;
  for (const x of [x0, x1]) {
    parts.push(fb(0.36, 7.6, 0.36, x, y + 3.8, z, 0x6a7080));
    parts.push(fb(0.8, 0.3, 0.8, x, y + 0.15, z, 0x4a5060));
  }
  const cx = (x0 + x1) / 2, w = x1 - x0;
  parts.push(fb(w + 0.4, 0.22, 0.22, cx, y + 7.3, z - 0.2, 0x7a8090));
  parts.push(fb(w + 0.4, 0.22, 0.22, cx, y + 6.9, z + 0.2, 0x7a8090));
  for (let x = x0 + 0.6; x < x1; x += 1.2) parts.push(fb(0.06, 0.5, 0.06, x, y + 7.1, z, 0x8a90a0));
  for (const sg of it.signs ?? []) {
    parts.push(fb(sg.w + 0.16, 1.76, 0.12, sg.x, y + 6.1, z + 0.06, 0xe8e8ee));
    if (mesh) signFace(mesh, sg.slot, sg.x, y + 6.1, z + 0.13, sg.w, 1.6);
  }
  void glow;
}

function bridgeGeo(it, th, parts, glow) {
  const y = it.y, z = it.z, x0 = it.x0, x1 = it.x1, d = it.width ?? 6;
  const cx = (x0 + x1) / 2, w = x1 - x0;
  parts.push(fb(w, 1.2, d, cx, y + 0.6, z, T(th, 'concrete', 0xc9c5d2), { r: 0.08, seg: 1, bottomShade: 0.6 }));
  parts.push(fb(w, 0.9, 0.25, cx, y + 1.65, z + d / 2 - 0.12, T(th, 'concreteDark', 0x8f8a9e)));
  parts.push(fb(w, 0.9, 0.25, cx, y + 1.65, z - d / 2 + 0.12, T(th, 'concreteDark', 0x8f8a9e)));
  parts.push(fb(w, 0.12, d - 0.5, cx, y + 1.25, z, T(th, 'asphalt', 0x3d3b4c)));
  for (let x = x0 + 2; x < x1; x += 3) glow.push(fb(0.2, 0.12, 0.05, x, y + 1.9, z + d / 2 + 0.01, 0xffe2a0));
  // Pfeiler außerhalb der Fahrbahn
  for (const x of [x0 + 2.5, x1 - 2.5]) parts.push(fb(1.4, y + 34, 1.4, x, y - (y + 34) / 2, z, T(th, 'concrete', 0xc9c5d2)));
}

// ------------------------------------------------------------------ skyline

export function buildSkyline(level, spec) {
  if (!level.view) return;
  const th = themeOf(level);
  const rnd = new Rnd(spec.seed ?? 0x5c171e);
  const cols = T(th, 'city', [0x2c2448, 0x3a2f5c, 0x47386a, 0x332a52]);
  const win = T(th, 'cityWindow', 0xffd88a);
  const front = [], frontGlow = [], side = [], sideGlow = [];
  const tower = (x, z, w, d, h, out, glow, base) => {
    const c = rnd.pick(cols);
    out.push(fb(w, h, d, x, base + h / 2, z, c));
    if (rnd.chance(0.35)) out.push(fb(w * 0.6, h * 0.18, d * 0.6, x, base + h + h * 0.09, z, c));
    if (rnd.chance(0.25)) out.push(fb(0.3, h * 0.25, 0.3, x, base + h + h * 0.12, z, 0x8a84a8));
    // Fensterreihen (Fläche zur Kamera, +Z)
    for (let yy = base + 3; yy < base + h - 2; yy += 3.2) {
      for (let xx = x - w / 2 + 1.2; xx < x + w / 2 - 0.8; xx += 2.2) if (rnd.chance(0.45)) glow.push(fb(1.1, 1.2, 0.1, xx, yy, z + d / 2 + 0.05, rnd.chance(0.8) ? win : 0xffa0c0));
    }
  };
  // Bogen voraus (relativ zur Kamera): 180 … 250 m
  for (let a = -1.15; a <= 1.15; a += rnd.real(0.035, 0.07)) {
    const R = rnd.real(190, 250);
    const x = Math.sin(a) * R, z = -Math.cos(a) * R;
    tower(x, z, rnd.real(8, 16), rnd.real(8, 14), rnd.real(16, 70) * (1 - Math.abs(a) * 0.3), front, frontGlow, -40);
  }
  // Seitenbänder (ziehen bei Fahrt vorbei), Länge 400 m, doppelt gelegt für nahtloses Weiterlaufen
  const BAND = 400;
  for (const s of [-1, 1]) {
    for (let z = 0; z < BAND; z += rnd.real(10, 20)) {
      const x = s * rnd.real(120, 175);
      const h = rnd.real(14, 55), w = rnd.real(8, 14), d = rnd.real(8, 14);
      for (const k of [0, -BAND]) tower(x, -z + k + 200, w, d, h, side, sideGlow, -40);
    }
  }
  const group = new THREE.Group();
  group.name = 'stadtsilhouette';
  const fMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const gMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const frontM = new THREE.Mesh(merge([...front]), fMat), frontW = new THREE.Mesh(merge([...frontGlow]), gMat);
  const sideG = new THREE.Group();
  sideG.add(new THREE.Mesh(merge(side), fMat), new THREE.Mesh(merge(sideGlow), gMat));
  for (const m of [frontM, frontW, ...sideG.children]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; }
  group.add(frontM, frontW, sideG);
  const hw = highwayState(level);
  const cam = level.view.camera;
  let lastCamZ = null, scroll = 0;
  addObject(level, group, () => {
    // folgt der Kamera (in der Ferne), Seitenbänder mit Parallaxe und Fahrt
    group.position.set(cam.position.x * 0.9, 0, cam.position.z);
    if (lastCamZ !== null) scroll += (cam.position.z - lastCamZ) * -0.25;
    lastCamZ = cam.position.z;
    const drive = hw.offset * 0.35;
    sideG.position.z = (((scroll + drive) % BAND) + BAND) % BAND - BAND / 2;
  });
}

// ------------------------------------------------------------------ hwdeco

function carGeo(it, parts, glow) {
  const p = v3(it.pos), yaw = it.yaw ?? 0;
  const c = it.color ?? 0x4fb0ff;
  const local = [];
  local.push(box(3.2, 0.8, 1.7, 0, 0.75, 0, c, { r: 0.3, seg: 2 }));
  local.push(box(1.7, 0.75, 1.5, -0.25, 1.45, 0, c, { r: 0.32, seg: 2 }));
  local.push(box(1.5, 0.5, 1.52, -0.25, 1.48, 0, 0xbfe8ff, { r: 0.2, seg: 1 }));
  for (const [x, z] of [[1.0, 0.82], [1.0, -0.82], [-1.05, 0.82], [-1.05, -0.82]]) {
    const w = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
    w.rotateX(Math.PI / 2); w.translate(x, 0.38, z);
    local.push(colorize(w.toNonIndexed(), (pp, n, o) => { const k = Math.abs(n.z) > 0.9 ? lin(0xd0d4dc) : lin(0x24242a); o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }));
  }
  local.push(box(0.1, 0.3, 1.5, 1.62, 0.7, 0, 0xe6eaf2, FLAT));
  const lights = [box(0.06, 0.2, 0.3, 1.62, 0.95, 0.55, 0xfff6c8, FLAT), box(0.06, 0.2, 0.3, 1.62, 0.95, -0.55, 0xfff6c8, FLAT),
    box(0.06, 0.16, 0.26, -1.62, 0.95, 0.6, 0xff4030, FLAT), box(0.06, 0.16, 0.26, -1.62, 0.95, -0.6, 0xff4030, FLAT)];
  const g = merge(local), gl = merge(lights);
  for (const x of [g, gl]) { x.rotateY(yaw); x.translate(p.x, p.y, p.z); }
  parts.push(g); glow.push(gl);
}

export function buildHwDeco(level, spec) {
  const items = spec.items ?? [spec];
  const th = themeOf(level);
  const signs = level.view ? signsMesh(level, new THREE.Group()) : null;
  let anySign = false;
  for (const it of items) {
    const parts = [], glow = [];
    switch (it.kind) {
      case 'gantry':
        gantryGeo(it, th, parts, glow, signs);
        if (it.signs?.length) anySign = true;
        for (const x of [it.x0, it.x1]) level.world.add({ type: 'box', min: [x - 0.18, it.y ?? 0, it.z - 0.18], max: [x + 0.18, (it.y ?? 0) + 7.6, it.z + 0.18], camIgnore: true, tag: 'gantry' });
        break;
      case 'sign': {
        const p = v3(it.pos), w = it.w ?? 2.4, h = it.h ?? 1.4, yaw = it.yaw ?? 0, post = it.post ?? 2.2;
        parts.push(fb(0.12, post + h, 0.12, p.x, p.y + (post + h) / 2, p.z, 0x6a7080));
        const back = box(w + 0.12, h + 0.12, 0.08, 0, 0, 0, 0xd8d8e0, FLAT);
        back.rotateY(yaw); back.translate(p.x - Math.sin(yaw) * 0.06, p.y + post + h / 2, p.z - Math.cos(yaw) * 0.06 + 0.0);
        parts.push(back);
        if (signs) { signFace(signs, it.slot ?? 0, p.x + Math.sin(yaw) * 0.0, p.y + post + h / 2, p.z, w, h, yaw); anySign = true; }
        break;
      }
      case 'barrier': {
        const a = v3(it.from), b = v3(it.to);
        const x0 = Math.min(a.x, b.x) - 0.3, x1 = Math.max(a.x, b.x) + 0.3, z0 = Math.min(a.z, b.z) - 0.3, z1 = Math.max(a.z, b.z) + 0.3;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
        parts.push(box(w, 0.35, d, cx, a.y + 0.175, cz, 0xd6d2dc, { r: 0.06, seg: 1 }));
        parts.push(box(w - (w > d ? 0 : 0.24), 0.5, d - (d > w ? 0 : 0.24), cx, a.y + 0.6, cz, 0xe8e4ee, { r: 0.08, seg: 1 }));
        // rot-weiße Warnstreifen oben
        const long = w > d;
        const L = long ? w : d;
        for (let u = -L / 2 + 0.25; u < L / 2 - 0.2; u += 1) parts.push(box(long ? 0.5 : (d > w ? 0.22 : w), 0.12, long ? (w > d ? 0.22 : d) : 0.5, long ? cx + u : cx, a.y + 0.9, long ? cz : cz + u, 0xe03a2a, FLAT));
        level.world.add({ type: 'box', min: [x0, a.y, z0], max: [x1, a.y + 0.85, z1], tag: 'barrier' });
        break;
      }
      case 'cone': case 'cones': {
        const pts = [];
        if (it.kind === 'cones') { const a = v3(it.from), b = v3(it.to), n = it.n ?? 4; for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); pts.push({ x: a.x + (b.x - a.x) * t, y: a.y, z: a.z + (b.z - a.z) * t }); } }
        else pts.push(v3(it.pos));
        for (const p of pts) {
          const g = new THREE.ConeGeometry(0.24, 0.72, 10);
          g.translate(p.x, p.y + 0.42, p.z);
          parts.push(colorize(g.toNonIndexed(), (pp, n, o) => { const band = (pp.y - p.y) > 0.38 && (pp.y - p.y) < 0.52; const k = lin(band ? 0xffffff : 0xff6a1a); o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }));
          parts.push(box(0.5, 0.06, 0.5, p.x, p.y + 0.03, p.z, 0xff6a1a, FLAT));
        }
        break;
      }
      case 'car': {
        carGeo(it, parts, glow);
        const p = v3(it.pos), yaw = it.yaw ?? 0;
        const along = Math.abs(Math.cos(yaw)) > 0.7;
        const hx = along ? 1.65 : 0.88, hz = along ? 0.88 : 1.65;
        level.world.add({ type: 'box', min: [p.x - hx, p.y, p.z - hz], max: [p.x + hx, p.y + 1.85, p.z + hz], tag: 'car' });
        break;
      }
      case 'lamp': { const p = v3(it.pos); lampGeo(p.x, p.y, p.z, it.side ?? 1, th, parts, glow); break; }
      case 'bridge':
        bridgeGeo(it, th, parts, glow);
        for (const x of [it.x0 + 2.5, it.x1 - 2.5]) level.world.add({ type: 'box', min: [x - 0.7, it.y - 34, it.z - 0.7], max: [x + 0.7, it.y, it.z + 0.7], camIgnore: true, tag: 'bridgepillar' });
        break;
      case 'tlight': {
        if (!level.view) break;
        const p = v3(it.pos);
        const model = getModel('traffic_light');
        model.root.position.set(p.x, p.y, p.z);
        model.root.rotation.y = it.yaw ?? 0;
        const mode = it.mode ?? 'blink';
        addObject(level, model.root, (dt) => {
          const t = level.time;
          let anim = 'off';
          if (mode === 'start') anim = t < 1.1 ? 'red' : t < 2.0 ? 'yellow' : 'green';
          else anim = Math.floor(t * 1.5) % 2 ? 'yellow' : 'off';
          model.update(dt, { anim });
        });
        level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.18, y0: p.y, y1: p.y + 3.4, camIgnore: true, tag: 'tlight' });
        break;
      }
      default: console.warn(`[hwdeco] unbekannte Art: ${it.kind}`);
    }
    if (parts.length) addStatic(level, merge(parts));
    if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  }
  if (signs && anySign) {
    signs.userData.finish();
    signs.parent.remove(signs);
    addObject(level, signs);
  }
}

export const TYPES = { road: buildRoad, bossroad: buildBossRoad, skyline: buildSkyline, hwdeco: buildHwDeco };
