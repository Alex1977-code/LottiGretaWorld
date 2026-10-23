// Hilfen für die Welt-4-Level 4-1 „Kribbelkrabbel-Schlucht“ und 4-2 „Das Lila Nebelmoor“ (kein Level: exportiert kein
// LEVEL, die Level-Registry überspringt dieses Modul). Oben reine Daten-Helfer (Inseln, Felsblöcke, Münzspuren,
// Ameisenpfade), darunter level-lokale Kulisse und Mechanik, die es als Baustein nicht gibt – alles für
// `LEVEL.setup = levelSetup((level, scene) => …)` (Präzisierung „Level-Haken“): statische Teile gehen über addStatic in
// die Abschnitts-Meshes (levelSetup hängt sie an das vorhandene Mesh gleichen Materials an, 0 zusätzliche
// Zeichenaufrufe), belebte Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.
//
// Canyon (4-1): Lagerfeuer der Ameisen (flackernde Flammen, Funken, Kochtopf, Zelte), Geier auf Felsnadeln, Kakteen
// mit Blüten (sparsame Kaktus-Geometrie aus Welt 2), Kuhschädel, Ameisenwimpel, Tropfsteine und Leuchtkristalle in der
// Höhle, Vorratskammer im Ameisenraum (Zuckerwürfel, Krümel, Blattstücke, Ameiseneier).
// Giftmoor (4-2): Nebelschwaden über dem Sumpf (eine Instanz-Gruppe), Libellen (zwei Instanz-Gruppen), Seerosen,
// Schilf, Sumpfhütte auf Stelzen, quakende Moorfrösche, morsche Stämme.
// Mechanik/Budget: Stimmung je Bereich (Höhle dunkler, ohne Änderung des Themas – Stimmungen level-lokal), Rankenschnapper
// als gemeinsame Instanz-Gruppen (creeperInstances), Ameisenpfade über Wände (antOver/antWallLane).

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject } from '../../blocks/kit.js';
import { glowTexture } from '../../blocks/w4kit.js';
import { visDt } from '../../entities/gimmick.js';
import { Build } from '../../models/lib/kit.js';
import { levelSetup, cyl, sphere, cone, block } from '../w2/_helpers_c.js';
import { cacti as cactiW2 } from '../w2/_helpers_a.js';

export { levelSetup, cyl, sphere, cone, block };
export { line, ring, arc, column, farHide, cullStatic, tumbleweed, lizard, beetle } from '../w2/_helpers_a.js';
export { instanceEnemies } from '../w3/_helpers_a.js';
export { gegnerSicht, fernAus } from '../w3/_helpers_d.js';

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder (under 0). */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Fels (Insel ohne Grasdecke) über die Grundfläche. */
export const rock = (x0, x1, zA, zB, top, h = 4, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'none', ...o });
/** Wand (Baustein wall) über die Grundfläche. */
export function wallBox(x0, x1, zA, zB, y0, h, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'wall', pos: [(x0 + x1) / 2, y0, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}

/**
 * Ameisenpfad über einen Block (Mitte der Unterseite pos, size [w, h, d]) entlang z bei x = at (antpath-Format):
 * Boden davor (from m) → Vorderwand (+Z) hinauf → Oberseite → Rückwand hinab → Boden dahinter (to m).
 */
export function antOver(pos, size, at, from = 2.5, to = 2.5) {
  const zf = pos[2] + size[2] / 2, zb = pos[2] - size[2] / 2, y0 = pos[1], y1 = pos[1] + size[1];
  return [
    [at, y0, zf + from, 0, 1, 0], [at, y0, zf, 0, 1, 0], [at, y0, zf, 0, 0, 1], [at, y1, zf, 0, 0, 1], [at, y1, zf, 0, 1, 0],
    [at, y1, zb, 0, 1, 0], [at, y1, zb, 0, 0, -1], [at, y0, zb, 0, 0, -1], [at, y0, zb, 0, 1, 0], [at, y0, zb - to, 0, 1, 0],
  ];
}

/** Ameisenpfad waagerecht an einer senkrechten Seitenwand (Fläche x = wx, Normale nx = ±1) von z0 nach z1 in Höhe y. */
export function antWallLane(wx, nx, y, z0, z1) {
  return [[wx, y, z0, nx, 0, 0], [wx, y, z1, nx, 0, 0]];
}

/** Rechteck-Rundweg am Boden (Kolonne quer zum Weg): x0..x1 bei z (vordere Spur) und z − d (hintere Spur). */
export function antLoop(x0, x1, z, y, d = 1.2) {
  return { loop: true, path: [[x0, y, z], [x1, y, z], [x1, y, z - d], [x0, y, z - d]] };
}

// =====================================================================================================================
// Stimmung je Bereich (Höhle) – level-lokal, das Thema bleibt unverändert
// =====================================================================================================================

/**
 * Stimmungen moods ({ name: { fog, background, hemi, sun, dome, playerLight } }, Format view/mood.js) für dieses Level
 * anmelden und je Bereich zones = [{ min: [x, z], max: [x, z], mood }] umschalten (Simulationstakt; auch nach Röhre,
 * Warp und Neustart). Die Ansicht bekommt eine eigene Kopie des Themas mit den Stimmungen (das Thema-Objekt der
 * Registry bleibt unberührt). level.moodNow für Tests.
 */
export function areaMoods(level, moods, zones) {
  const v = level.view;
  level.moodNow = null;
  if (v) v.theme = { ...v.theme, moods: { ...(v.theme.moods ?? {}), ...moods } };
  const pick = (p) => {
    for (const zn of zones) if (p.pos.x >= zn.min[0] && p.pos.x <= zn.max[0] && p.pos.z >= zn.min[1] && p.pos.z <= zn.max[1]) return zn.mood ?? null;
    return null;
  };
  const apply = (fast) => {
    const p = level.player;
    if (!p) return;
    const m = pick(p);
    if (m === level.moodNow) return;
    level.moodNow = m;
    v?.setMood?.(m, { time: fast ? 0 : 1.1 });
  };
  apply(true);
  level.onStep(() => apply(false));
}

// =====================================================================================================================
// Kleine Werkzeuge
// =====================================================================================================================

/** Nur in der Nähe der Figur sichtbar (Darstellung). */
function nearOnly(level, obj, x, z, r = 40) {
  return () => { const p = level.player; obj.visible = !p || Math.hypot(p.pos.x - x, p.pos.z - z) < r; return obj.visible; };
}

function worldMat(level) { return level.view?.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true }); }

let softTex = null;
/** Weiche, runde Wolken-Textur (Nebelschwaden). */
function softTexture() {
  if (softTex) return softTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  softTex = new THREE.CanvasTexture(c);
  softTex.colorSpace = THREE.SRGBColorSpace;
  return softTex;
}

// =====================================================================================================================
// Canyon-Kulisse (4-1)
// =====================================================================================================================

/**
 * Lagerfeuer der Ameisen: Steinkreis, gekreuzte Scheite, Kochtopf am Dreibein, zwei kleine Zelte mit Wimpeln, Holzklötze
 * als Sitze (statisch, Kollision: Steinkreis niedrig). Flammen (ein Mesh, flackert), Glut-Schein (Sprite) und aufsteigende
 * Funken (Punkte) nur in der Nähe. pos = Mitte am Boden. o: { tents: [[dx, dz, yaw], …], seats: [[dx, dz], …] }.
 */
export function campfire(level, x, y, z, o = {}) {
  const b = new Build();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    b.sphere(0.2, i % 2 ? 0x9a8a7a : 0x7a6a5e, { p: [x + Math.cos(a) * 0.62, y + 0.08, z + Math.sin(a) * 0.62], s: [1.1, 0.7, 0.9] }, 7, 4);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    b.cyl(0.07, 0.08, 0.95, i % 2 ? 0x8a5a32 : 0x6a4426, { p: [x + Math.cos(a) * 0.12, y + 0.22, z + Math.sin(a) * 0.12], r: [Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15] }, 6);
  }
  b.cyl(0.32, 0.36, 0.06, 0x2a1a14, { p: [x, y + 0.03, z] }, 12);   // Asche
  // Dreibein mit Kochtopf
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    b.cyl(0.025, 0.03, 1.5, 0x6a4a2a, { p: [x + Math.cos(a) * 0.42, y + 0.7, z + Math.sin(a) * 0.42], r: [Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32] }, 5);
  }
  b.cyl(0.2, 0.15, 0.24, 0x3a3a44, { p: [x, y + 0.92, z] }, 10);
  b.cyl(0.21, 0.21, 0.03, 0x5a5a66, { p: [x, y + 1.05, z] }, 10);
  b.cyl(0.006, 0.006, 0.36, 0x2a2a30, { p: [x, y + 1.24, z] }, 4);
  // Sitzklötze
  for (const [dx, dz] of o.seats ?? [[1.5, 0.4], [-1.3, 0.8], [0.2, -1.5], [-0.9, -1.2]]) {
    b.cyl(0.22, 0.24, 0.32, 0xa06a3a, { p: [x + dx, y + 0.16, z + dz] }, 8);
    b.cyl(0.2, 0.2, 0.01, 0xe0b880, { p: [x + dx, y + 0.325, z + dz] }, 8);
  }
  // Zelte (Ameisen-Größe) mit Wimpel
  for (const [dx, dz, yaw] of o.tents ?? [[2.4, -1.6, 0.6], [-2.6, -1.4, -0.5]]) {
    const tx = x + dx, tz = z + dz, c = Math.cos(yaw), s = Math.sin(yaw);
    const g = new THREE.ConeGeometry(0.85, 1.25, 4, 1);
    g.rotateY(Math.PI / 4 + yaw);
    g.scale(1, 1, 0.8);
    b.add(g, { v: (px, py) => (py > 0.2 ? 0xf2d06a : 0xe0a83a) }, { p: [tx, y + 0.62, tz] });
    b.box(0.05, 0.62, 0.32, 0x3a2614, { p: [tx + c * 0.62, y + 0.3, tz - s * 0.62], r: [0, yaw, 0] }, 0);
    b.cyl(0.015, 0.015, 0.7, 0x6a4a2a, { p: [tx, y + 1.5, tz] }, 4);
    b.box(0.3, 0.16, 0.01, 0xe8322a, { p: [tx + 0.15, y + 1.74, tz], r: [0, yaw, 0] }, 0);
  }
  addStatic(level, b.geometry());
  level.world.add({ type: 'cyl', x, z, r: 0.75, y0: y, y1: y + 0.25, tag: 'lagerfeuer' });
  if (!level.view) return;
  // Flammen: drei Zungen in einem Mesh (unbeleuchtet), flackern
  const fb = new Build();
  fb.cone(0.24, 0.75, 0xff7a1a, { p: [0, 0.37, 0] }, 7);
  fb.cone(0.15, 0.55, 0xffc23a, { p: [0.09, 0.3, 0.05], r: [0, 0, -0.2] }, 6);
  fb.cone(0.13, 0.48, 0xffe27a, { p: [-0.08, 0.25, -0.04], r: [0.1, 0, 0.25] }, 6);
  const flame = new THREE.Mesh(fb.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }));
  flame.userData.owned = true;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a3a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(3.4, 3.4, 1);
  glow.userData.owned = true;
  // Funken: Punkte steigen auf
  const N = 14;
  const pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) seeds.push([Math.random() * TAU, 0.6 + Math.random() * 0.8, Math.random() * 2]);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffc04a, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
  sparks.frustumCulled = false;
  sparks.userData.owned = true;
  const root = new THREE.Group();
  root.position.set(x, y + 0.12, z);
  glow.position.set(0, 0.6, 0);
  root.add(flame, glow, sparks);
  const vis = nearOnly(level, root, x, z, 46);
  let t = 0;
  const h = {};
  addObject(level, root, (dt) => {
    t += visDt(level, h, dt);
    if (!vis()) return;
    const k = 1 + Math.sin(t * 17) * 0.08 + Math.sin(t * 9.3) * 0.07;
    flame.scale.set(1 + Math.sin(t * 11) * 0.05, k, 1 + Math.cos(t * 13) * 0.05);
    flame.rotation.y = t * 1.6;
    glow.material.opacity = 0.45 + Math.sin(t * 7) * 0.06 + Math.sin(t * 19) * 0.04;
    for (let i = 0; i < N; i++) {
      const [a, sp, ph] = seeds[i];
      const u = ((t * sp * 0.55 + ph) % 1.6) / 1.6;
      pos[i * 3] = Math.cos(a + u * 3) * 0.18 * (1 + u);
      pos[i * 3 + 1] = 0.3 + u * 2.4;
      pos[i * 3 + 2] = Math.sin(a + u * 3) * 0.18 * (1 + u);
    }
    pg.attributes.position.needsUpdate = true;
  });
  level.view.shadows?.add({ pos: { x, y, z }, radius: 1.0, alive: () => true, visible: () => true });
}

/** Geier-Silhouette (sitzt, Flügel angelegt, nackter rosa Hals) – statisch. list = [[x, y, z, yaw, size], …]. */
export function vultures(level, list) {
  const b = new Build();
  for (const [x, y, z, yaw = 0, s = 1] of list) {
    const P = (dx, dy, dz) => [x + (Math.cos(yaw) * dx + Math.sin(yaw) * dz) * s, y + dy * s, z + (-Math.sin(yaw) * dx + Math.cos(yaw) * dz) * s];
    b.sphere(0.34, { v: (px, py, pz, nx, ny) => (ny > 0.4 ? 0x4a3a3a : 0x2a1e22) }, { p: P(0, 0.52, 0), s: [1.0 * s, 1.15 * s, 0.85 * s] }, 10, 7);
    b.sphere(0.2, 0xf2ece0, { p: P(0.08, 0.86, 0), s: [1.2 * s, 0.6 * s, 1.15 * s] }, 8, 5);             // Halskrause
    b.cyl(0.05, 0.07, 0.3, 0xe89a9a, { p: P(0.16, 1.0, 0), r: [0, 0, -0.5] }, 6);                         // Hals
    b.sphere(0.1, 0xf0a8a0, { p: P(0.26, 1.15, 0), s: [1.2 * s, 0.9 * s, 0.9 * s] }, 8, 5);              // Kopf
    b.cone(0.045, 0.16, 0xe8c040, { p: P(0.38, 1.13, 0), r: [0, 0, -Math.PI / 2 - 0.3] }, 5);            // Schnabel
    for (const sz of [-1, 1]) {
      b.sphere(0.02, 0x1a1010, { p: P(0.3, 1.18, sz * 0.06) }, 5, 3);
      const wing = new THREE.SphereGeometry(0.32, 8, 5);
      wing.scale(1.25 * s, 0.85 * s, 0.32 * s);
      b.add(wing, { v: (px, py) => (py > 0 ? 0x3a2a2a : 0x1e1416) }, { p: P(-0.12, 0.55, sz * 0.27), r: [sz * 0.25, yaw, 0.35] });
    }
    b.cone(0.16, 0.35, 0x2a1e22, { p: P(-0.38, 0.32, 0), r: [0, 0, 2.1] }, 6);                          // Schwanz
    for (const sz of [-1, 1]) b.cyl(0.025, 0.025, 0.2, 0xd8b048, { p: P(0.04, 0.12, sz * 0.12) }, 4);    // Krallen-Beine
  }
  addStatic(level, b.geometry());
}

/** Kakteen mit Blüten (Welt-2-Kaktus, sparsame Geometrie; Säulen mit Kollision): list = [{ pos, variant, size, yaw }]. */
export function cacti(level, list) {
  const gs = cactiW2(level, list);
  if (gs.length) addStatic(level, merge(gs));
}

/** Kuhschädel im Sand (Zier): [x, y, z, yaw]. */
export function skulls(level, list) {
  const b = new Build();
  for (const [x, y, z, yaw = 0] of list) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (dx, dy, dz) => [x + c * dx + s * dz, y + dy, z - s * dx + c * dz];
    b.sphere(0.22, 0xf4ecd8, { p: P(0, 0.14, 0), s: [1.2, 0.75, 0.9] }, 9, 6);
    b.sphere(0.13, 0xece0c4, { p: P(0.24, 0.09, 0), s: [1.1, 0.7, 0.9] }, 8, 5);
    for (const sz of [-1, 1]) {
      b.sphere(0.045, 0x2a1a14, { p: P(0.12, 0.2, sz * 0.11) }, 5, 3);
      b.tube([P(-0.05, 0.22, sz * 0.18), P(-0.1, 0.32, sz * 0.4), P(0.02, 0.48, sz * 0.52)], 0.035, 0xfff6e4, null, 6, 5);
    }
  }
  addStatic(level, b.geometry());
}

/** Ameisenwimpel (Fahnenmast mit dreieckigem Wimpel, gelb-rot mit Helm-Punkt): [x, y, z, yaw, h]. */
export function antFlags(level, list) {
  const b = new Build();
  for (const [x, y, z, yaw = 0, h = 2.2] of list) {
    b.cyl(0.04, 0.05, h, 0x8a5a2a, { p: [x, y + h / 2, z] }, 6);
    b.sphere(0.07, 0xffc21a, { p: [x, y + h + 0.04, z] }, 6, 4);
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(0.85, -0.22); sh.lineTo(0, -0.46); sh.closePath();
    const g = new THREE.ShapeGeometry(sh);
    b.add(g, (px, py) => (py > -0.2 ? 0xffc21a : 0xe8322a), { p: [x, y + h - 0.04, z], r: [0, yaw, 0] });
    const g2 = new THREE.ShapeGeometry(sh);
    b.add(g2, (px, py) => (py > -0.2 ? 0xffc21a : 0xe8322a), { p: [x, y + h - 0.04, z], r: [0, yaw + Math.PI, 0], s: [-1, 1, 1] });
  }
  addStatic(level, b.geometry(), { castShadow: false });
}

/** Tropfsteine (hängend von hy herab, Länge len) und Stalagmiten (stehend, h > 0): [x, y, z, len, r]. */
export function stalactites(level, list, o = {}) {
  const b = new Build();
  for (const [x, y, z, len, r = 0.35] of list) {
    if (len < 0) b.cone(r, -len, { v: (px, py) => (py > 0 ? 0x8a5040 : 0xc88a64) }, { p: [x, y - len / 2, z], r: [Math.PI, 0, 0] }, 6);
    else b.cone(r, len, { v: (px, py) => (py > 0 ? 0xd89a74 : 0x8a5040) }, { p: [x, y + len / 2, z] }, 6);
  }
  addStatic(level, b.geometry(), { castShadow: o.shadow ?? false });
}

/** Leuchtkristalle (unbeleuchtet hell, ohne Schatten): [x, y, z, size, color, tilt]. */
export function glowCrystals(level, list) {
  const b = new Build();
  for (const [x, y, z, s = 1, color = 0x7ae8ff, tilt = 0] of list) {
    const lo = new THREE.Color(color).multiplyScalar(0.55).getHex();
    for (let k = 0; k < 4; k++) {
      const a = k * 1.9 + x;
      const h = s * (0.9 - k * 0.15);
      const g = new THREE.OctahedronGeometry(0.22 * s, 0);
      g.scale(0.7, h / (0.22 * s) * 0.6, 0.7);
      b.add(g, { v: (px, py) => (py > 0 ? color : lo) }, { p: [x + Math.cos(a) * 0.22 * s * (k ? 1 : 0), y + h * 0.5, z + Math.sin(a) * 0.22 * s * (k ? 1 : 0)], r: [Math.sin(a) * (0.3 + tilt), 0, Math.cos(a) * (0.3 + tilt)] });
    }
  }
  addStatic(level, b.geometry(), { material: 'glow', castShadow: false });
}

/** Ameisenraum: Vorrat (Zuckerwürfel, Brotkrümel, Blattstücke) und Ameiseneier-Gelege. */
export function antPantry(level, o) {
  const b = new Build();
  for (const [x, y, z, s = 0.5, yaw = 0] of o.sugar ?? []) b.box(s, s, s, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xffffff : 0xece8f0) }, { p: [x, y + s / 2, z], r: [0, yaw, 0] }, 0.04, 1);
  for (const [x, y, z, s = 0.4] of o.crumbs ?? []) b.sphere(s, { v: (px, py, pz, nx, ny) => (ny > 0.3 ? 0xd8964a : 0xf2d8a0) }, { p: [x, y + s * 0.5, z], s: [1.2, 0.8, 1] }, 7, 5);
  for (const [x, y, z, s = 0.8, yaw = 0] of o.leaves ?? []) {
    const g = new THREE.CircleGeometry(s, 7);
    g.rotateX(-Math.PI / 2);
    g.scale(1, 1, 0.55);
    b.add(g, (px, py, pz) => 0x6aaa3a, { p: [x, y + 0.04, z], r: [0, yaw, 0] });
    b.box(s * 1.8, 0.03, 0.05, 0x4a8a2a, { p: [x, y + 0.05, z], r: [0, yaw, 0] }, 0);
  }
  for (const [x, y, z, n = 6] of o.eggs ?? []) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = 0.25 + (i % 3) * 0.18;
      b.sphere(0.16, { v: (px, py, pz, nx, ny) => (ny > 0.3 ? 0xfffaf0 : 0xf0e4d0) }, { p: [x + Math.cos(a) * r, y + 0.14 + (i > 4 ? 0.2 : 0), z + Math.sin(a) * r], s: [0.75, 1.15, 0.75] }, 8, 6);
    }
  }
  addStatic(level, b.geometry());
}

// =====================================================================================================================
// Giftmoor-Kulisse (4-2)
// =====================================================================================================================

/**
 * Nebelschwaden über dem Sumpf: weiche, flache Scheiben (eine Instanz-Gruppe, additiv, ohne Tiefenschreiben), treiben
 * langsam und atmen. list = [{ pos: [x, y, z], size: [w, d], n, drift: [vx, vz] }]. Nur Darstellung.
 */
export function fogBanks(level, list, o = {}) {
  const v = level.view;
  if (!v) return null;
  const items = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const F of list) {
    const [w, d] = F.size;
    for (let i = 0; i < (F.n ?? 6); i++) items.push({ x: F.pos[0] + (rnd() - 0.5) * w, y: F.pos[1] + rnd() * 0.5, z: F.pos[2] + (rnd() - 0.5) * d, s: (F.scale ?? 4) * (0.7 + rnd() * 0.6), ph: rnd() * TAU, drift: F.drift ?? [0.15, 0], w, d, cx: F.pos[0], cz: F.pos[2] });
  }
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: softTexture(), color: o.color ?? 0xc8a8e8, transparent: true, opacity: o.opacity ?? 0.32, depthWrite: false, fog: true });
  const im = new THREE.InstancedMesh(g, mat, items.length);
  im.frustumCulled = false;
  im.renderOrder = 2;
  im.name = 'nebel';
  im.userData.owned = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  let t = 0;
  const h = {};
  addObject(level, im, (dt) => {
    t += visDt(level, h, dt);
    items.forEach((it, i) => {
      let x = it.x + it.drift[0] * t, z = it.z + it.drift[1] * t;
      x = it.cx + ((((x - it.cx) + it.w / 2) % it.w) + it.w) % it.w - it.w / 2;
      z = it.cz + ((((z - it.cz) + it.d / 2) % it.d) + it.d) % it.d - it.d / 2;
      const k = 1 + Math.sin(t * 0.4 + it.ph) * 0.18;
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.ph + t * 0.05);
      im.setMatrixAt(i, M.compose(P.set(x, it.y + Math.sin(t * 0.3 + it.ph) * 0.12, z), Q, S.set(it.s * k * 1.6, 1, it.s * k)));
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return im;
}

/**
 * Libellen: schillernder Körper und vier durchscheinende Flügel (zwei Instanz-Gruppen), fliegen Achten um ihren Punkt,
 * stehen kurz in der Luft und flitzen weiter. list = [{ pos: [x, y, z], r, color }]. Nur in der Nähe gezeichnet.
 */
export function dragonflies(level, list) {
  const v = level.view;
  if (!v) return null;
  const bb = new Build();
  bb.capsule(0.035, 0.42, { v: (x, y) => (y > 0.18 ? 0x2ae8c8 : y > 0 ? 0x1ab8e8 : 0x6a3ae8) }, { r: [0, 0, Math.PI / 2], p: [-0.08, 0, 0] }, 3, 6);
  bb.sphere(0.06, 0x1ae8a8, { p: [0.17, 0.01, 0] }, 8, 6);
  for (const sz of [-1, 1]) bb.sphere(0.03, 0x1a1a3a, { p: [0.2, 0.04, sz * 0.04] }, 5, 3);
  const body = new THREE.InstancedMesh(bb.geometry(), worldMat(level), list.length);
  const wb = new Build();
  for (const [dx, sz] of [[0.07, 1], [0.07, -1], [-0.03, 1], [-0.03, -1]]) {
    const g = new THREE.CircleGeometry(0.2, 8);
    g.rotateX(-Math.PI / 2);
    g.scale(0.35, 1, 1);
    g.translate(dx, 0.02, sz * 0.21);
    wb.add(g, 0xd8f4ff);
  }
  const wings = new THREE.InstancedMesh(wb.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), list.length);
  for (const im of [body, wings]) { im.frustumCulled = false; im.castShadow = false; im.userData.owned = true; im.name = 'libellen'; }
  const grp = new THREE.Group();
  grp.add(body, wings);
  grp.userData.owned = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qw = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const E = new THREE.Euler();
  let t = 0;
  const h = {};
  addObject(level, grp, (dt) => {
    t += visDt(level, h, dt);
    const p = level.player;
    let n = 0;
    list.forEach((D, i) => {
      if (p && Math.hypot(p.pos.x - D.pos[0], p.pos.z - D.pos[2]) > 42) return;
      const r = D.r ?? 2, ph = i * 1.7;
      // Achterbahn mit Schwebepausen
      const tt = t * 0.7 + ph, hold = (Math.sin(tt * 0.9) + 1) * 0.5;
      const u = tt - 0.35 * Math.sin(tt * 0.9);
      const x = D.pos[0] + Math.sin(u) * r, z = D.pos[2] + Math.sin(u * 2) * r * 0.5, y = D.pos[1] + Math.sin(u * 1.3) * 0.3;
      const vx = Math.cos(u) * r, vz = Math.cos(u * 2) * r;
      E.set(0, Math.atan2(-vz, vx), Math.sin(t * 3 + ph) * 0.1);
      Q.setFromEuler(E);
      M.compose(P.set(x, y + hold * 0.05, z), Q, S);
      body.setMatrixAt(n, M);
      Qw.setFromEuler(E.set(Math.sin(t * 55 + ph) * 0.35, E.y, E.z));
      wings.setMatrixAt(n, M.compose(P, Qw, S));
      n++;
    });
    body.count = n; wings.count = n;
    body.instanceMatrix.needsUpdate = true; wings.instanceMatrix.needsUpdate = true;
    grp.visible = n > 0;
  });
  return grp;
}

/** Seerosen-Blätter mit Blüten (flach, statisch): [x, y, z, r, flower (0 | 1 | Farbe)]. */
export function lilies(level, list) {
  const b = new Build();
  for (const [x, y, z, r = 0.6, fl = 0] of list) {
    const g = new THREE.CircleGeometry(r, 10, 0.3, TAU - 0.5);
    g.rotateX(-Math.PI / 2);
    b.add(g, { v: (px, py, pz) => (Math.hypot(px, pz) > r * 0.7 ? 0x3a8a3a : 0x5ab84a) }, { p: [x, y + 0.03, z], r: [0, x * 1.3 + z, 0] });
    if (fl) {
      const c = typeof fl === 'number' && fl > 1 ? fl : 0xff8ad8;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        b.sphere(0.09, c, { p: [x + Math.cos(a) * 0.08, y + 0.1, z + Math.sin(a) * 0.08], s: [1.4, 0.6, 0.7], r: [0, -a, 0.5] }, 6, 4);
      }
      b.sphere(0.05, 0xffe04a, { p: [x, y + 0.14, z] }, 6, 4);
    }
  }
  addStatic(level, b.geometry(), { castShadow: false });
}

/** Schilf/Rohrkolben (statisch): Büschel [x, y, z, n, h]. */
export function reeds(level, list) {
  const b = new Build();
  for (const [x, y, z, n = 5, H = 1.6] of list) {
    for (let k = 0; k < n; k++) {
      const a = k * 2.3 + x, d = 0.12 + (k % 3) * 0.1, h = H * (0.7 + ((k * 37) % 10) / 30);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      b.cyl(0.015, 0.025, h, 0x5a8a3a, { p: [px, y + h / 2, pz], r: [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12] }, 4);
      if (k % 2 === 0) b.capsule(0.045, 0.16, 0x6a3a22, { p: [px + Math.sin(a) * 0.12 * h * 0.5, y + h - 0.02, pz - Math.cos(a) * 0.12 * h * 0.5] }, 2, 5);
    }
  }
  addStatic(level, b.geometry(), { castShadow: false });
}

/** Morscher Baumstamm mit Moos und Pilzchen (Zier, Kollision optional): [x, y, z, len, yaw, r]. */
export function logs(level, list, o = {}) {
  const b = new Build();
  for (const [x, y, z, len = 3, yaw = 0, r = 0.4] of list) {
    b.cyl(r, r * 1.05, len, { v: (px, py, pz, nx, ny) => (ny > 0.55 ? 0x6aaa4a : 0x5a3a3a) }, { p: [x, y + r * 0.9, z], r: [0, yaw, Math.PI / 2] }, 9);
    for (const s of [-1, 1]) b.cyl(r * 0.92, r * 0.92, 0.02, 0xc8a080, { p: [x + Math.cos(yaw) * s * len / 2, y + r * 0.9, z - Math.sin(yaw) * s * len / 2], r: [0, yaw, Math.PI / 2] }, 9);
    for (let k = 0; k < 3; k++) {
      const u = (k - 1) * len * 0.3;
      b.cyl(0.03, 0.035, 0.16, 0xf0e8d8, { p: [x + Math.cos(yaw) * u, y + r * 1.8, z - Math.sin(yaw) * u] }, 5);
      b.dome(0.1, k % 2 ? 0xc85aff : 0x8aff5a, { p: [x + Math.cos(yaw) * u, y + r * 1.85, z - Math.sin(yaw) * u], s: [1, 0.6, 1] }, Math.PI / 2, 8, 4);
    }
    if (o.solid) {
      const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
      const hx = (c * len) / 2 + s * r, hz = (s * len) / 2 + c * r;
      level.world.add({ type: 'box', min: [x - hx, y, z - hz], max: [x + hx, y + r * 1.8, z + hz], tag: 'stamm' });
    }
  }
  addStatic(level, b.geometry());
}

/**
 * Sumpfhütte auf Stelzen (Zier mit begehbarem Steg): Hütte aus dunklem Holz mit Mooslehmdach, rundes Fenster mit
 * Leuchten, Laterne am Steg, Schornstein. pos = Mitte unter der Hütte, Boden y (Stelzen ins Wasser), deck = Höhe des
 * Bodens. Kollision: Stelzen, Boden, Wände.
 */
export function swampHut(level, x, y, z, o = {}) {
  const deck = o.deck ?? y + 1.6, yaw = o.yaw ?? 0;
  const b = new Build(), gl = new Build();
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (dx, dy, dz) => [x + c * dx + s * dz, dy, z - s * dx + c * dz];
  for (const [dx, dz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1], [0, 2.3]]) b.cyl(0.11, 0.13, deck - y + 0.2, 0x4a3226, { p: P(dx, (deck + y) / 2 - 0.1, dz) }, 6);
  b.box(3.2, 0.18, 3.8, 0x7a5a42, { p: P(0, deck - 0.09, 0.3), r: [0, yaw, 0] }, 0.03, 1);
  b.box(2.6, 1.9, 2.4, { v: (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0x5a4032 : 0x6a4a3a) }, { p: P(0, deck + 0.95, -0.1), r: [0, yaw, 0] }, 0.06, 1);
  const roof = new THREE.ConeGeometry(2.3, 1.5, 4, 1);
  roof.rotateY(Math.PI / 4 + yaw);
  b.add(roof, { v: (px, py) => (py > 0.2 ? 0x6a9a4a : 0x4a7a3a) }, { p: P(0, deck + 2.6, -0.1), s: [1, 1, 0.95] });
  b.box(0.3, 0.9, 0.3, 0x5a5560, { p: P(0.8, deck + 3.0, -0.6), r: [0, yaw, 0] }, 0.04, 1);
  b.box(0.7, 1.3, 0.06, 0x3a2418, { p: P(-0.6, deck + 0.65, 1.12), r: [0, yaw, 0] }, 0.02, 1);
  gl.cyl(0.32, 0.32, 0.05, 0xffd47a, { p: P(0.55, deck + 1.15, 1.13), r: [Math.PI / 2, yaw, 0] }, 12);
  addStatic(level, b.geometry());
  addStatic(level, gl.geometry(), { material: 'glow', castShadow: false });
  // Kollision: Stelzen-Boden und Hütte (Kasten)
  const hx = Math.abs(c) * 1.6 + Math.abs(s) * 1.9, hz = Math.abs(s) * 1.6 + Math.abs(c) * 1.9;
  level.world.add({ type: 'box', min: [x - hx, deck - 0.18, z - hz + 0.3 * c], max: [x + hx, deck, z + hz + 0.3 * c], tag: 'huette:boden' });
  const wx = Math.abs(c) * 1.3 + Math.abs(s) * 1.2, wz = Math.abs(s) * 1.3 + Math.abs(c) * 1.2;
  level.world.add({ type: 'box', min: [x - wx, deck, z - wz - 0.1 * c], max: [x + wx, deck + 1.9, z + wz - 0.1 * c], tag: 'huette' });
  if (!level.view) return;
  // Rauch aus dem Schornstein (wenige weiche Scheiben)
  const N = 5;
  const smoke = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softTexture(), color: 0xb8a8c8, transparent: true, opacity: 0.4, depthWrite: false }), N);
  smoke.frustumCulled = false; smoke.userData.owned = true;
  const base = P(0.8, deck + 3.5, -0.6);
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), Pp = new THREE.Vector3();
  let t = 0;
  const h = {};
  addObject(level, smoke, (dt) => {
    t += visDt(level, h, dt);
    const cam = level.view.camera;
    for (let i = 0; i < N; i++) {
      const u = ((t * 0.25 + i / N) % 1);
      Pp.set(base[0] + u * 0.8, base[1] + u * 2.6, base[2] - u * 0.3);
      const k = 0.4 + u * 1.2;
      M.compose(Pp, cam.quaternion, S.set(k, k, k));
      smoke.setMatrixAt(i, M);
    }
    smoke.instanceMatrix.needsUpdate = true;
    smoke.material.opacity = 0.35;
  });
}

/**
 * Moorfrösche auf Seerosen oder Steinen: lila mit gelben Punkten, blähen die Schallblase und hüpfen ab und zu kurz auf
 * der Stelle (ein Mesh je Frosch, ohne Sonnenschatten, nur in der Nähe). list = [[x, y, z, yaw, size]].
 */
export function frogs(level, list) {
  const v = level.view;
  if (!v) return;
  const b = new Build();
  b.sphere(0.2, { v: (x, y, z, nx, ny) => (ny < -0.2 ? 0xf0e0a0 : 0x8a4ad0) }, { p: [0, 0.15, 0], s: [1.2, 0.8, 1] }, 10, 7);
  for (const sz of [-1, 1]) {
    b.sphere(0.075, 0xffffff, { p: [0.12, 0.3, sz * 0.09] }, 7, 5);
    b.sphere(0.04, 0x1a0a2a, { p: [0.17, 0.31, sz * 0.1] }, 5, 3);
    b.sphere(0.07, 0x7a3ac0, { p: [-0.08, 0.06, sz * 0.18], s: [1.6, 0.6, 0.8] }, 6, 4);
    b.sphere(0.04, 0xffd43a, { p: [-0.05, 0.25, sz * 0.08] }, 5, 3);
  }
  b.sphere(0.035, 0xffd43a, { p: [-0.14, 0.22, 0] }, 5, 3);
  const geo = b.geometry();
  const sac = new Build();
  sac.sphere(0.09, 0xffc8f0, { p: [0.14, 0.1, 0] }, 8, 6);
  const sacGeo = sac.geometry();
  list.forEach(([x, y, z, yaw = 0, s = 1], i) => {
    const root = new THREE.Group();
    const m = new THREE.Mesh(geo, worldMat(level));
    const sm = new THREE.Mesh(sacGeo, worldMat(level));
    root.add(m, sm);
    root.position.set(x, y, z); root.rotation.y = yaw; root.scale.setScalar(s * 1.6);
    root.userData.owned = true;
    let t = i * 1.3;
    const h = {};
    const vis = nearOnly(level, root, x, z, 34);
    addObject(level, root, (dt) => {
      t += visDt(level, h, dt);
      if (!vis()) return;
      const cyc = t % 5;
      const croak = cyc < 1.2 ? Math.abs(Math.sin(cyc * Math.PI * 2.5)) : 0;
      sm.scale.setScalar(0.4 + croak * 1.1);
      const hop = cyc > 3 && cyc < 3.45 ? Math.sin(((cyc - 3) / 0.45) * Math.PI) * 0.18 : 0;
      m.position.y = hop; sm.position.y = hop;
    });
  });
}

// =====================================================================================================================
// Rankenschnapper als Instanzen (Budget)
// =====================================================================================================================

/**
 * Alle Rankenschnapper des Levels zeichnen sich über gemeinsame Instanz-Gruppen (je Modellteil eine, Glieder und Blätter
 * aller Ranken zusammen): ein Rankenschnapper kostet sonst ≈ 7 Zeichenaufrufe + ≈ 5 im Schattenpass. Die Entitäten
 * rechnen und animieren ihre Modelle weiter; je Bild werden deren Welt-Matrizen übernommen und die Einzelmodelle nicht
 * gezeichnet. Kopfteile mit eigenem Material (Treffer-Blitz) bekommen ein gemeinsames Material; blitzt ein Kopf gerade
 * (Treffer, Abprall), zeichnet er sich so lange selbst. Weiter als far m oder außerhalb der Sicht: nicht gezeichnet.
 * Schatten werfen nur Ranke und Kiefer (shadow: false → keine). Nur Darstellung.
 */
export function creeperInstances(level, o = {}) {
  const v = level.view;
  if (!v) return null;
  const far = o.far ?? 44;
  const ents = level.entities.filter((e) => e.kind === 'rankenschnapper' && e.model?.root);
  if (ents.length < 2) return null;
  const groups = new Map();   // key → { geo, mat, cap, cast }
  let shared = null;
  const recs = ents.map((e) => {
    const meshes = [];
    let own = null;
    e.model.root.traverse((m) => { if (m.isMesh) meshes.push(m); });
    // Kopf-Material: das einzige nicht geteilte MeshStandardMaterial mit emissive (headMat)
    const counts = new Map();
    for (const m of meshes) counts.set(m.material, (counts.get(m.material) ?? 0) + 1);
    for (const m of meshes) if (!m.isInstancedMesh && m.material.isMeshStandardMaterial && m.material.emissive && m.material.vertexColors && counts.get(m.material) >= 3) { own = m.material; break; }
    if (own && !shared) { shared = own.clone(); shared.emissive = new THREE.Color(0, 0, 0); }
    const parts = meshes.map((m) => {
      const mat = m.material === own ? shared : m.material;
      const key = `${m.geometry.uuid}|${mat.uuid}`;
      let G = groups.get(key);
      if (!G) { G = { geo: m.geometry, mat, cap: 0, cast: m.castShadow, im: null, fill: 0 }; groups.set(key, G); }
      G.cap += m.isInstancedMesh ? m.count : 1;
      return { m, G };
    });
    return { e, parts, own };
  });
  const big = new Set(o.shadowParts ?? []);
  for (const G of groups.values()) {
    const im = new THREE.InstancedMesh(G.geo, G.mat, G.cap);
    im.frustumCulled = false;
    im.castShadow = o.shadow !== false && G.cast && (G.geo.attributes.position.count > 200 || G.mat !== shared || big.size === 0);
    im.receiveShadow = false;
    im.count = 0;
    im.name = 'instanzen:rankenschnapper';
    addObject(level, im);
    im.traverse((x) => { x.userData.owned = false; });
    G.im = im;
  }
  if (shared) shared.userData.owned = true;
  const vis = (m, root) => { for (let q = m; q && q !== root; q = q.parent) if (!q.visible) return false; return true; };
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const M = new THREE.Matrix4(), Mi = new THREE.Matrix4(), F = new THREE.Frustum(), S = new THREE.Sphere();
  const stats = { drawn: 0, own: 0 };
  v.onFrame(() => {
    const p = level.player, cam = v.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const G of groups.values()) G.fill = 0;
    stats.drawn = 0; stats.own = 0;
    for (const R of recs) {
      const { e } = R;
      const root = e.model?.root;
      if (!root) continue;
      const alive = e.alive && !e.removed && root.parent;
      S.center.set((e.root.x + e.headC.x) / 2, (e.root.y + e.headC.y) / 2, (e.root.z + e.headC.z) / 2);
      S.radius = e.L * 0.6 + 1.2;
      const show = alive && (!p || Math.hypot(e.headC.x - p.pos.x, e.headC.z - p.pos.z) < far + e.L) && F.intersectsSphere(S);
      const flashing = R.own && R.own.emissive && (R.own.emissive.r + R.own.emissive.g + R.own.emissive.b) > 0.02;
      if (!show) { root.visible = false; continue; }
      if (flashing) { root.visible = true; stats.own++; continue; }
      root.visible = true;
      root.updateMatrixWorld(true);
      for (const { m, G } of R.parts) {
        if (!vis(m, root)) continue;
        if (m.isInstancedMesh) {
          for (let j = 0; j < m.count; j++) { m.getMatrixAt(j, Mi); if (Mi.elements[0] === 0 && Mi.elements[5] === 0 && Mi.elements[10] === 0) continue; G.im.setMatrixAt(G.fill++, M.multiplyMatrices(m.matrixWorld, Mi)); }
        } else G.im.setMatrixAt(G.fill++, m.matrixWorld);
      }
      root.visible = false;
      stats.drawn++;
    }
    for (const G of groups.values()) {
      for (let k = G.fill; k < Math.min(G.cap, G.im.count); k++) G.im.setMatrixAt(k, ZERO);
      G.im.count = G.fill;
      G.im.visible = G.fill > 0;
      G.im.instanceMatrix.needsUpdate = true;
    }
  });
  level.creepers = stats;
  return stats;
}

// =====================================================================================================================
// Fern-Ausblendung für Instanz-Gruppen (Ameisen, Riesenameisen, Münzen) – level-lokal, bis der Motor sie selbst kann
// =====================================================================================================================

/**
 * Instanz-Gruppen, die übers ganze Level verteilt sind (Ameisen-Instanzen, gemeinsame Riesenameisen, Münz-Pool), zeichnen
 * sonst jedes Bild alle Instanzen – auch im Schattenpass. Hier bekommt jede passende InstancedMesh (Name in rules) einen
 * „Spiegel“ mit derselben Geometrie und demselben Material, der je Bild nur die Instanzen enthält, die näher als
 * far m an der Figur liegen und in der Sichtpyramide der Kamera (Kugel radius); das Original wird nicht gezeichnet
 * (es rechnet weiter, die Gegner-Logik bleibt unberührt). shadow: false → der Spiegel wirft keinen Sonnenschatten;
 * shadowNear → nur Instanzen näher als shadowNear m werfen Schatten (zweiter Spiegel für die fernen, ohne Schatten).
 * rules = { name: { far, radius, shadow, shadowNear } }. Liefert stats { drawn: { name: n } } (Tests). Nur Darstellung.
 */
export function cullInstances(level, rules) {
  const v = level.view;
  if (!v) return null;
  const mirrors = new Map();   // Original → { near, far, rule, key, cap }
  const stats = { drawn: {} };
  const M = new THREE.Matrix4(), F = new THREE.Frustum(), S = new THREE.Sphere();
  let scanT = 0;
  const make = (m, key, tag) => {
    const im = new THREE.InstancedMesh(m.geometry, m.material, m.instanceMatrix.count);
    im.frustumCulled = false;
    im.count = 0;
    im.name = `${key}:${tag}`;
    im.userData.cullMirror = true;
    im.receiveShadow = m.receiveShadow;
    im.renderOrder = m.renderOrder;
    v.three.add(im);
    return im;
  };
  const scan = () => {
    v.three.traverse((m) => {
      if (!m.isInstancedMesh || m.userData.cullMirror || mirrors.has(m)) return;
      const key = m.name || m.parent?.name || '';
      const rule = rules[key];
      if (!rule) return;
      // nahe Instanzen (mit Sonnenschatten) und ferne (ohne) in zwei Spiegeln
      mirrors.set(m, { near: make(m, key, 'nah'), far: rule.shadowNear ? make(m, key, 'fern') : null, rule, key, cap: m.instanceMatrix.count });
    });
  };
  scan();
  const visible = (m) => { for (let q = m.parent; q; q = q.parent) if (!q.visible) return false; return true; };
  const drop = (rec) => { for (const im of [rec.near, rec.far]) if (im) { im.removeFromParent(); im.dispose(); } };
  v.onFrame((dt) => {
    scanT += dt;
    if (scanT > 0.5) { scanT = 0; scan(); }
    const p = level.player, cam = v.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const k of Object.keys(stats.drawn)) stats.drawn[k] = 0;
    for (const [m, rec] of mirrors) {
      const { near, far, rule } = rec;
      if (!m.parent || m.instanceMatrix.count !== rec.cap) {
        // entfernt oder Pool gewachsen (neue InstancedMesh): Spiegel verwerfen, scan() legt ihn neu an
        drop(rec); mirrors.delete(m); scanT = 1; continue;
      }
      const on = visible(m);
      m.visible = false;
      let n = 0, nf = 0;
      if (on) {
        const a = m.instanceMatrix.array, b = near.instanceMatrix.array, bf = far?.instanceMatrix.array;
        const fd = rule.far ?? 40, r = rule.radius ?? 1.5, sn = rule.shadowNear ?? Infinity;
        for (let i = 0; i < m.count; i++) {
          const o16 = i * 16;
          if (a[o16] === 0 && a[o16 + 5] === 0 && a[o16 + 10] === 0 && a[o16 + 1] === 0) continue;
          const x = a[o16 + 12], y = a[o16 + 13], z = a[o16 + 14];
          const d = p ? Math.hypot(x - p.pos.x, z - p.pos.z) : 0;
          if (d > fd) continue;
          S.center.set(x, y, z); S.radius = r;
          if (!F.intersectsSphere(S)) continue;
          if (far && d > sn) { for (let k = 0; k < 16; k++) bf[nf * 16 + k] = a[o16 + k]; nf++; }
          else { for (let k = 0; k < 16; k++) b[n * 16 + k] = a[o16 + k]; n++; }
        }
      }
      near.count = n; near.visible = n > 0; near.instanceMatrix.needsUpdate = true;
      near.castShadow = rule.shadow !== false && m.castShadow;
      if (far) { far.count = nf; far.visible = nf > 0; far.castShadow = false; far.instanceMatrix.needsUpdate = true; }
      stats.drawn[rec.key] = (stats.drawn[rec.key] ?? 0) + n + nf;
    }
  });
  level.instanceCull = stats;
  return stats;
}

/**
 * Stachelfeld (Kollision wie der Motor-Baustein stachelboden: Quader mit Formflag spikes, Höhe h), aber sparsam
 * gezeichnet: dunkle Grundplatte und vierseitige Stahlspitzen im Raster step (≈ 4 Dreiecke je Spitze statt 12, ein
 * Drittel der Zahl). pos = Mitte der Unterseite, size [w, h, d].
 */
export function spikeField(level, pos, size, o = {}) {
  const [x, y, z] = pos, [w, h, d] = size;
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], spikes: true, tag: 'stachelboden' });
  if (!level.view) return;
  const step = o.step ?? 0.75;
  const parts = [];
  const base = new THREE.BoxGeometry(w, 0.08, d).toNonIndexed();
  base.translate(x, y + 0.04, z);
  parts.push(colorize(base, (p, n, out) => mixc(L(0x3a3540), L(0x5a5664), n.y > 0.5 ? 1 : 0, out)));
  const tip = L(0xf4f6fc), foot = L(0x7a7f90), rust = L(0x9a6a5a);
  const nx = Math.max(1, Math.round(w / step)), nz = Math.max(1, Math.round(d / step));
  const ch = h + 0.12;
  const cone0 = new THREE.ConeGeometry(0.2, ch, 4, 1, true).toNonIndexed();
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const g = cone0.clone();
      const jx = ((i * 7 + k * 13) % 5) * 0.03, jz = ((i * 11 + k * 3) % 5) * 0.03;
      g.rotateY(((i + k) % 2) * 0.4);
      g.translate(x - w / 2 + (i + 0.5) * (w / nx) + jx, y + 0.08 + ch / 2, z - d / 2 + (k + 0.5) * (d / nz) + jz);
      const rusty = ((i * 5 + k * 7) % 9) === 0;
      parts.push(colorize(g, (p, n, out) => mixc(rusty ? rust : foot, tip, smooth(y + 0.1, y + 0.08 + ch, p.y), out)));
    }
  }
  addStatic(level, merge(parts), { material: 'stone', castShadow: false });
}

/** Leuchtpunkte (Glühwürmchen) als eine Punktwolke um Mittelpunkte: list = [{ pos, size: [w, h, d], n }]. */
export function fireflies(level, list, o = {}) {
  const v = level.view;
  if (!v) return null;
  const pts = [];
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const F of list) for (let i = 0; i < (F.n ?? 12); i++) pts.push([F.pos[0] + (rnd() - 0.5) * F.size[0], F.pos[1] + rnd() * F.size[1], F.pos[2] + (rnd() - 0.5) * F.size[2], rnd() * TAU]);
  const arr = new Float32Array(pts.length * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: o.color ?? 0xd8ff7a, size: o.size ?? 0.16, map: glowTexture(), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const P = new THREE.Points(g, mat);
  P.frustumCulled = false;
  P.userData.owned = true;
  let t = 0;
  const h = {};
  addObject(level, P, (dt) => {
    t += visDt(level, h, dt);
    pts.forEach(([x, y, z, ph], i) => {
      arr[i * 3] = x + Math.sin(t * 0.7 + ph) * 0.6;
      arr[i * 3 + 1] = y + Math.sin(t * 1.1 + ph * 2) * 0.3;
      arr[i * 3 + 2] = z + Math.cos(t * 0.6 + ph) * 0.6;
    });
    g.attributes.position.needsUpdate = true;
    mat.opacity = 0.75 + Math.sin(t * 2.3) * 0.2;
  });
  return P;
}

/**
 * Kulisse des Themas (Himmel-Gruppe: Giftwald, Canyonwände …) ist je Art ein einziges, levelweites Mesh – bei langen
 * Leveln mit Seitenräumen schnell ≈ 100 k Dreiecke, die immer gezeichnet werden (die Begrenzungskugel umfasst alles).
 * Hier werden solche Meshes (mehr als minTris Dreiecke) nach Dreiecks-Schwerpunkt in chunk-m-Kacheln (x, z; mit
 * strips: true nur in Querstreifen entlang z – weniger Zeichenaufrufe) zerlegt:
 * Kacheln außerhalb der Sicht fallen über das Frustum-Culling weg, Kacheln weiter als far m von der Kamera (im Dunst
 * ohnehin unsichtbar) werden ausgeblendet. Nur Darstellung; Material und Aussehen bleiben gleich.
 */
export function chunkBackdrop(level, o = {}) {
  const v = level.view, sky = v?.sky;
  if (!sky?.group) return 0;
  const minTris = o.minTris ?? 6000, chunk = o.chunk ?? 48, far = o.far ?? 220;
  const tiles = [];
  for (const m of [...sky.group.children]) {
    if (!m.isMesh || m.isInstancedMesh || m === sky.domeGroup) continue;
    let g = m.geometry;
    const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
    if (tris < minTris) continue;
    if (g.index) g = g.toNonIndexed();
    m.updateMatrixWorld(true);
    const names = Object.keys(g.attributes);
    const P = g.attributes.position;
    const cells = new Map();
    for (let i = 0; i < P.count; i += 3) {
      const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
      const key = o.strips ? `${Math.floor(cz / chunk)}` : `${Math.floor(cx / chunk)}|${Math.floor(cz / chunk)}`;
      let c = cells.get(key);
      if (!c) { c = []; cells.set(key, c); }
      c.push(i);
    }
    for (const list of cells.values()) {
      const ng = new THREE.BufferGeometry();
      for (const nm of names) {
        const a = g.attributes[nm], sz = a.itemSize;
        const arr = new Float32Array(list.length * 3 * sz);
        let k = 0;
        for (const i of list) for (let j = 0; j < 3; j++) for (let c = 0; c < sz; c++) arr[k++] = a.array[(i + j) * sz + c];
        ng.setAttribute(nm, new THREE.BufferAttribute(arr, sz));
      }
      ng.computeBoundingSphere(); ng.computeBoundingBox();
      const mesh = new THREE.Mesh(sky.track(ng), m.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(m.matrix);
      mesh.renderOrder = m.renderOrder;
      mesh.castShadow = m.castShadow; mesh.receiveShadow = m.receiveShadow;
      mesh.name = 'kulisse:kachel';
      sky.group.add(mesh);
      tiles.push(mesh);
    }
    sky.group.remove(m);
  }
  if (!tiles.length) return 0;
  // Sichtprüfung mit dem Quader (die Begrenzungskugel breiter Kacheln reicht weit hinter die Kamera)
  for (const t of tiles) t.frustumCulled = false;
  const c = new THREE.Vector3(), F = new THREE.Frustum(), M = new THREE.Matrix4();
  v.onFrame(() => {
    const cam = v.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const t of tiles) {
      t.geometry.boundingBox.clampPoint(cam.position, c);
      t.visible = c.distanceTo(cam.position) < far && F.intersectsBox(t.geometry.boundingBox);
    }
  });
  return tiles.length;
}

/**
 * Klares Moorwasser statt Themenfarbe: Das Thema poison färbt Wasser lila wie das Gift – hier bekommen die Becken des
 * Bausteins water (Oberfläche und Körper in den Themenfarben) ein klares Türkis, damit Schwimmwasser und tödliches
 * Giftwasser nicht zu verwechseln sind. Nur Darstellung.
 */
export function tintWater(level, surface = 0x3ab8b0, deep = 0x1a6a78) {
  const v = level.view;
  if (!v) return 0;
  const th = v.theme, ws = new THREE.Color(th.water), wd = new THREE.Color(th.waterDeep);
  let n = 0;
  v.three.traverse((m) => {
    if (!m.isMesh || !m.material?.transparent || !m.material.color || m.material.map) return;
    if (m.material.color.equals(ws)) { m.material.color.set(surface); n++; }
    else if (m.material.color.equals(wd)) { m.material.color.set(deep); m.material.opacity = 0.38; n++; }
  });
  return n;
}

/** Statische Geometrie aus einer Build-Funktion (fn(b) füllt einen Build) in die Abschnitts-Meshes. */
export function bakeBuild(level, fn, opts) {
  const b = new Build();
  fn(b);
  if (b.parts.length) addStatic(level, b.geometry(), opts);
}

export { Build, TAU, L, box, colorize, merge, mixc, smooth, addStatic, addObject };
