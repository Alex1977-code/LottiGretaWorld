// Bausteine des Reit-Levels (Archetyp `ride`, Präzisierung Ritt/Diorama): Flusslauf mit Strömung, Ufern und
// Dschungel, Felsen, Sprungrampen, Temposchwellen, Wasserfälle, Felsbogen, Zier. Physik/Abfragen: das Fluss-Netz
// `level.river` (archetypes/RiverNet.js) – die Spielfigur des Ritts (RideController) liest nur dieses Netz, keine
// Kollisionsformen. Kollisionsformen gibt es nur für Schatten-Blobs (Wasserflächen, Flag water, camIgnore).
//
// river        { channels: [ { id, points: [[x, y, z, w?, v?], …], width, speed, bank: { height, out, skirt }, deco } ],
//                lowland: { y, trees }, life: { butterflies, dragonflies } }
//              Ein Aufruf baut alle Kanäle gemeinsam (Ufer öffnen sich an Gabelungen/Mündungen automatisch, Uferstreifen
//              enden vor dem Nachbarkanal). points: y = Wasseroberfläche (Kaskade = zwei nahe Punkte mit Höhensprung),
//              w = Breite (Standard width), v = Strömung m/s (Standard speed). bank.height (Uferhöhe über dem Wasser,
//              Standard 2), bank.out (Breite des Uferstreifens, 18), bank.skirt (true = Plateaukante bis lowland.y
//              hinab, Standard true), bank.none: true = keine Ufer (Lagune mit eigenen Wänden). deco: Dichte des
//              Dschungels 0..1 (Palmen, Farne, Büsche, Blüten, Urwaldbäume; Standard 1).
//              lowland: Tiefland-Ebene (y, trees = Zahl ferner Urwaldbäume). life: animierte Schmetterlinge/Libellen.
// river_rock   { pos: [x, z] | [x, y, z], r (0.9), h (Höhe über dem Wasser, 1.2) }  fest für das Floß
// river_ramp   { pos: [x, z], yaw? (Standard: Fließrichtung), len (4.5), wid (3.2), h (1.4), kick (6 m/s) }
// river_wave   { pos: [x, z], yaw?, len (3), wid (3), boost (4 m/s) }  Temposchwelle mit Lauflicht-Pfeilen
// river_fall   { from: [x, y, z] (Abbruchkante, Mitte), to: [x, y, z] (Aufprall, Mitte), width, lip (1.2), rainbow,
//                mist (true), arc (Regenbogen-Bogen, Standard = rainbow) }  Wasserfall-Vorhang mit Gischt
// river_arch   { pos: [x, y, z] (Wasseroberfläche, Mitte), yaw (Fließrichtung), span (Innenweite 7), height (4.5),
//                depth (3) }  Felsbogen über dem Kanal (Grotte hinter einem Wasserfall)
// river_cliff  { from: [x, z], to: [x, z], y0, y1, depth (4) }  Felswand (Klippe hinter dem großen Wasserfall)
// river_deco   { items: [{ kind, pos, size?, color?, n?, r?, yaw? }] }  kind: palm | fern | bush | bloom | rock | tree |
//                lilies (pos [x, z], r, n – auf dem Wasser) | reeds | hut | sign (Pfeilschild, yaw) | totem
// Alle Positionen in Metern (Weltkoordinaten), pos = Fußpunkt.

import * as THREE from 'three';
import { v3, box, hex, lin, mixc, smooth, colorize, merge, Rnd, themeOf, addStatic, addObject } from '../kit.js';
import { RiverNet } from '../../archetypes/RiverNet.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const FOAM_PERIOD = 2.2;   // s je Texturwiederholung (Schaumstreifen wandern mit der Strömung)
const CHUNK = 24;          // m je Ufer-/Deko-Stück (Abschnitte für das Frustum-Culling)

const DEF_JUNGLE = {
  water: 0x1fa6d6, waterDeep: 0x137fb6, waterEdge: 0x6fe0e6, foam: 0xf4ffff,
  bankRock: 0x7a6656, bankRockDark: 0x54463c, moss: 0x4f9f34, lip: 0x6cd43f, floor: 0x4caa34, floor2: 0x3e9a2c,
  skirt: 0x8c6a4a, skirtDark: 0x5c4532, lowland: 0x3f9a34,
  palmTrunk: 0xb0844e, palmTrunkDark: 0x7d5a32, frond: 0x47b83a, frondLight: 0x8ae05a, frondDark: 0x2d7e2a,
  canopy: [[0x6fd04a, 0x3a9a32, 0x226a22], [0x86dc52, 0x48aa36, 0x2a7426]],
  blooms: [0xff4f7a, 0xff9a2e, 0xffd23a, 0xff6ad5, 0xffffff],
};
const jungle = (level) => themeOf(level).jungle ?? DEF_JUNGLE;

/** Fluss-Netz des Levels (wird beim ersten Fluss-Baustein angelegt). */
export function riverNet(level) {
  if (!level.river) level.river = new RiverNet();
  return level.river;
}

// ------------------------------------------------------------------ Texturen (einmal je Seite, Laufzeit-Versatz)

let FOAM_TEX = null, FALL_TEX = null, MIST_TEX = null;
function foamTexture() {
  if (FOAM_TEX) return FOAM_TEX;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 256);
  const rnd = new Rnd(4711);
  for (let lane = 0; lane < 6; lane++) {
    const x = (lane + 0.5) * (64 / 6) + rnd.real(-3, 3);
    let y = rnd.real(0, 256);
    for (let k = 0; k < 5; k++) {
      const len = rnd.real(16, 46), w = rnd.real(1.6, 3.2);
      g.fillStyle = `rgba(255,255,255,${rnd.real(0.55, 0.95).toFixed(2)})`;
      for (const off of [0, -256, 256]) {
        const yy = y + off;
        g.beginPath();
        g.ellipse(x + rnd.real(-0.5, 0.5), yy + len / 2, w / 2, len / 2, 0, 0, TAU);
        g.fill();
      }
      y = (y + len + rnd.real(18, 60)) % 256;
    }
    // Bläschen
    for (let k = 0; k < 4; k++) {
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.arc(x + rnd.real(-4, 4), rnd.real(0, 256), rnd.real(0.8, 1.6), 0, TAU); g.fill();
    }
  }
  FOAM_TEX = new THREE.CanvasTexture(c);
  FOAM_TEX.wrapS = FOAM_TEX.wrapT = THREE.RepeatWrapping;
  FOAM_TEX.colorSpace = THREE.SRGBColorSpace;
  return FOAM_TEX;
}

function fallTexture() {
  if (FALL_TEX) return FALL_TEX;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.62)';
  g.fillRect(0, 0, 64, 128);
  const rnd = new Rnd(99);
  for (let i = 0; i < 26; i++) {
    const x = rnd.real(0, 64), len = rnd.real(20, 70), y = rnd.real(0, 128), w = rnd.real(1.5, 4);
    const a = rnd.chance(0.35) ? 0.25 : 1;
    g.fillStyle = `rgba(255,255,255,${a})`;
    for (const off of [0, -128, 128]) g.fillRect(x, y + off, w, len);
  }
  FALL_TEX = new THREE.CanvasTexture(c);
  FALL_TEX.wrapS = FALL_TEX.wrapT = THREE.RepeatWrapping;
  FALL_TEX.colorSpace = THREE.SRGBColorSpace;
  return FALL_TEX;
}

function mistTexture() {
  if (MIST_TEX) return MIST_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  MIST_TEX = new THREE.CanvasTexture(c);
  MIST_TEX.colorSpace = THREE.SRGBColorSpace;
  return MIST_TEX;
}

/** Je Level einmal: Texturen pro Bild verschieben (Schaum mit der Strömung, Wasserfälle schnell abwärts). */
function ensureFlowAnimation(level) {
  if (level._riverAnim || !level.view) return;
  level._riverAnim = true;
  const foam = foamTexture(), fall = fallTexture();
  level.view.onFrame((dt) => {
    foam.offset.y = (foam.offset.y - dt / FOAM_PERIOD) % 1;
    fall.offset.y = (fall.offset.y + dt * 1.9) % 1;
  });
}

// ------------------------------------------------------------------ Geometrie-Hilfen

/** Gitter (rows × cols) aus Punkten {x,y,z} + Farben [r,g,b] (+ uv) → indizierte Geometrie mit weichen Normalen. */
function gridGeo(rows, cols, P, C, UV = null, flip = false) {
  const pos = new Float32Array(rows * cols * 3), col = new Float32Array(rows * cols * 3);
  const uv = UV ? new Float32Array(rows * cols * 2) : null;
  for (let i = 0; i < rows * cols; i++) {
    pos[i * 3] = P[i].x; pos[i * 3 + 1] = P[i].y; pos[i * 3 + 2] = P[i].z;
    col[i * 3] = C[i][0]; col[i * 3 + 1] = C[i][1]; col[i * 3 + 2] = C[i][2];
    if (uv) { uv[i * 2] = UV[i][0]; uv[i * 2 + 1] = UV[i][1]; }
  }
  const idx = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      if (P[a].skip || P[b].skip || P[d].skip || P[e].skip) continue;
      if (flip) idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Kugel mit Farbverlauf oben hell / unten dunkel (Weltkoordinaten). */
function blob(r, x, y, z, light, mid, dark, sx = 1, sy = 1, sz = 1, ws = 9, hs = 6) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  const L = lin(light), M = lin(mid), D = lin(dark);
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(M, L, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o)));
}

/** Einfarbig mit leichter Schattierung nach der Normalen. */
function tint(g, color, shadeK = 0.25) {
  const c = lin(hex(color));
  return colorize(g, (p, n, o) => { const k = 1 - shadeK * 0.5 + shadeK * 0.5 * n.y; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; });
}

// ------------------------------------------------------------------ Zier: Palme, Farn, Busch, Blüten, Fels, Urwaldbaum

/** Palme: gebogener Stamm aus Ringen, 7 hängende Wedel, Kokosnüsse. h = Höhe, lean = Neigung (rad), yaw. */
function palmParts(J, x, y, z, h, lean, yaw, rnd, parts) {
  const segs = 7;
  const dirX = Math.cos(yaw), dirZ = -Math.sin(yaw);
  let px = x, py = y, pz = z;
  const tl = lin(hex(J.palmTrunk)), td = lin(hex(J.palmTrunkDark));
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const bend = lean * t * t * h;
    pts.push(new THREE.Vector3(x + dirX * bend, y + h * t, z + dirZ * bend));
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = a.distanceTo(b);
    const r0 = 0.2 * (1 - (i / segs) * 0.45), r1 = 0.2 * (1 - ((i + 1) / segs) * 0.45);
    const g = new THREE.CylinderGeometry(r1, r0 * 1.06, len, 7, 1, false);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.applyQuaternion(q);
    g.translate(a.x, a.y, a.z);
    const odd = i % 2;
    parts.push(colorize(g, (p, n, o) => mixc(odd ? td : tl, odd ? tl : td, 0.25 + 0.2 * n.y, o)));
    px = b.x; py = b.y; pz = b.z;
  }
  // Kokosnüsse
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + rnd.real(0, 1);
    parts.push(blob(0.15, px + Math.cos(a) * 0.2, py - 0.18, pz + Math.sin(a) * 0.2, 0x8a5a2a, 0x6a4020, 0x3e2412, 1, 1, 1, 6, 4));
  }
  // Wedel: gebogene Blattstreifen mit Mittelrippe (hell) und gezackten Rändern
  const nf = 7;
  const fl = lin(hex(J.frondLight)), fm = lin(hex(J.frond)), fd = lin(hex(J.frondDark));
  for (let f = 0; f < nf; f++) {
    const a = (f / nf) * TAU + rnd.real(-0.2, 0.2);
    const L = h * 0.55 + rnd.real(-0.2, 0.3);
    const ca = Math.cos(a), sa = Math.sin(a);
    const n = 6;
    const P = [], C = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const along = L * t;
      const dy = 0.55 * Math.sin(t * Math.PI * 0.8) * L * 0.35 - t * t * L * 0.55;
      const w = 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.3) + 0.02;
      const cx = px + ca * along, cy = py + 0.05 + dy, cz = pz + sa * along;
      const pxN = -sa, pzN = ca;
      for (const s of [-1, 0, 1]) {
        const ww = s === 0 ? 0 : w * (1 + (i % 2 ? 0.15 : -0.1));
        P.push({ x: cx + pxN * ww * s, y: cy - (s === 0 ? -0.04 : 0.08) * (1 - t * 0.5), z: cz + pzN * ww * s });
        C.push(s === 0 ? fl : t > 0.7 ? fd : fm);
      }
    }
    const g = gridGeo(n + 1, 3, P, C);
    parts.push(g.toNonIndexed());
    const g2 = gridGeo(n + 1, 3, P, C, null, true);   // Rückseite (von unten sichtbar)
    parts.push(g2.toNonIndexed());
  }
}

function fernParts(J, x, y, z, s, rnd, parts) {
  const n = 7;
  const fl = lin(hex(J.frondLight)), fm = lin(hex(J.frond)), fd = lin(hex(J.frondDark));
  for (let f = 0; f < n; f++) {
    const a = (f / n) * TAU + rnd.real(-0.3, 0.3);
    const L = s * rnd.real(0.8, 1.15);
    const ca = Math.cos(a), sa = Math.sin(a);
    const P = [], C = [];
    const m = 5;
    for (let i = 0; i <= m; i++) {
      const t = i / m;
      const along = L * t * 0.9;
      const up = Math.sin(t * Math.PI * 0.75) * L * 0.55 - t * t * L * 0.25;
      const w = 0.2 * s * Math.sin(Math.PI * Math.min(1, t * 1.2)) + 0.01;
      for (const sd of [-1, 0, 1]) {
        P.push({ x: x + ca * along - sa * w * sd, y: y + up + (sd === 0 ? 0.03 : 0), z: z + sa * along + ca * w * sd });
        C.push(sd === 0 ? fl : t > 0.6 ? fd : fm);
      }
    }
    parts.push(gridGeo(m + 1, 3, P, C).toNonIndexed());
    parts.push(gridGeo(m + 1, 3, P, C, null, true).toNonIndexed());
  }
}

function bushParts(J, x, y, z, r, rnd, parts) {
  const pal = rnd.pick(J.canopy);
  for (const [dx, dy, dz, k] of [[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7], [0.1, 0.35, 0.6, 0.6]]) {
    parts.push(blob(r * k, x + dx * r, y + dy * r, z + dz * r, pal[0], pal[1], pal[2], 1, 0.85, 1, 8, 5));
  }
}

function bloomParts(J, x, y, z, rnd, parts) {
  const n = rnd.int(3, 5);
  const stem = lin(0x3f8f2a);
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, 0.45);
    const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d, h = rnd.real(0.35, 0.75);
    const g = new THREE.CylinderGeometry(0.025, 0.03, h, 4, 1, true);
    g.translate(bx, y + h / 2, bz);
    parts.push(colorize(g, (p, nn, o) => { o[0] = stem[0]; o[1] = stem[1]; o[2] = stem[2]; }));
    const c = rnd.pick(J.blooms);
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * TAU;
      parts.push(blob(0.1, bx + Math.cos(b) * 0.11, y + h, bz + Math.sin(b) * 0.11, 0xffffff, c, c, 1, 0.45, 1, 5, 3));
    }
    parts.push(blob(0.06, bx, y + h + 0.02, bz, 0xfff6c0, 0xffc21a, 0xd99a00, 1, 1, 1, 5, 3));
  }
  // große Blätter am Boden
  for (let k = 0; k < 3; k++) {
    const a = rnd.real(0, TAU);
    parts.push(blob(0.28, x + Math.cos(a) * 0.3, y + 0.06, z + Math.sin(a) * 0.3, J.frondLight, J.frond, J.frondDark, 1.4, 0.18, 0.7, 7, 4));
  }
}

function rockParts(x, y, z, r, rnd, parts, moss = 0x5aa83a) {
  const g = new THREE.DodecahedronGeometry(r, 0);
  g.scale(rnd.real(1, 1.25), rnd.real(0.65, 0.85), rnd.real(0.9, 1.1));
  g.rotateY(rnd.real(0, TAU));
  g.translate(x, y + r * 0.35, z);
  const L = lin(0xb8b1a6), D = lin(0x6f685f), M = lin(hex(moss));
  parts.push(colorize(g, (p, n, o) => { mixc(D, L, smooth(-0.5, 0.6, n.y), o); if (n.y > 0.75) mixc(o, M, 0.7, o); }));
}

function treeParts(J, x, y, z, h, rnd, parts) {
  const rT = 0.32 + h * 0.03;
  const trunk = new THREE.CylinderGeometry(rT * 0.7, rT * 1.25, h * 0.62, 8, 1, true);
  trunk.translate(x, y + h * 0.31, z);
  const td = lin(0x5a3f28), tl = lin(0x8a6440);
  parts.push(colorize(trunk, (p, n, o) => mixc(td, tl, smooth(y, y + h * 0.6, p.y), o)));
  // Brettwurzeln
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + rnd.real(0, 0.6);
    const g = new THREE.ConeGeometry(0.22, 1.1, 4);
    g.rotateZ(Math.PI / 2 - 0.9);
    g.rotateY(-a);
    g.translate(x + Math.cos(a) * rT, y + 0.35, z + Math.sin(a) * rT);
    parts.push(tint(g, 0x6a4a30));
  }
  const pal = rnd.pick(J.canopy);
  const R = h * 0.26;
  for (const [dx, dy, dz, k] of [[0, 0.72, 0, 1.15], [-0.85, 0.6, 0.3, 0.8], [0.8, 0.62, -0.25, 0.85], [0.2, 0.86, 0.5, 0.7]]) {
    parts.push(blob(R * k, x + dx * R, y + dy * h, z + dz * R, pal[0], pal[1], pal[2], 1, 0.78, 1, 9, 6));
  }
  // Lianen
  for (let k = 0; k < 3; k++) {
    const a = rnd.real(0, TAU), d = R * rnd.real(0.6, 1);
    const len = h * rnd.real(0.25, 0.45);
    const g = new THREE.CylinderGeometry(0.03, 0.03, len, 3, 1, true);
    g.translate(x + Math.cos(a) * d, y + h * 0.62 - len / 2, z + Math.sin(a) * d);
    parts.push(tint(g, 0x3f7a2a, 0));
  }
}

function liliesParts(x, y, z, r, n, rnd, parts) {
  const pad = lin(0x4fbf3a), padD = lin(0x2f8a2a);
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, r);
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, s = rnd.real(0.3, 0.55);
    const notch = rnd.real(0, TAU);
    const g = new THREE.CylinderGeometry(s, s, 0.04, 14, 1, false, notch + 0.35, TAU - 0.7);
    g.translate(px, y + 0.03, pz);
    parts.push(colorize(g, (p, nn, o) => mixc(padD, pad, smooth(-0.2, 0.8, nn.y), o)));
    if (rnd.chance(0.35)) {
      for (let k = 0; k < 6; k++) {
        const b = (k / 6) * TAU;
        parts.push(blob(0.09, px + Math.cos(b) * 0.08, y + 0.12, pz + Math.sin(b) * 0.08, 0xffffff, 0xff8cc8, 0xe0509a, 1, 0.55, 1, 5, 3));
      }
      parts.push(blob(0.05, px, y + 0.15, pz, 0xfff6c0, 0xffd23a, 0xd9a000, 1, 1, 1, 5, 3));
    }
  }
}

function reedsParts(x, y, z, rnd, parts) {
  for (let i = 0; i < 9; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, 0.6), h = rnd.real(0.8, 1.6);
    const g = new THREE.ConeGeometry(0.05, h, 4, 1, true);
    g.translate(x + Math.cos(a) * d, y + h / 2, z + Math.sin(a) * d);
    parts.push(tint(g, 0x5aa03a, 0.2));
    if (rnd.chance(0.5)) {
      const c = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 5);
      c.translate(x + Math.cos(a) * d, y + h * 0.82, z + Math.sin(a) * d);
      parts.push(tint(c, 0x7a4a26, 0.2));
    }
  }
}

/** Pfahlhütte (Dschungel): Plattform auf Pfählen, Bambuswände, Strohdach. */
function hutParts(x, y, z, yaw, parts) {
  const local = [];
  for (const [px, pz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) local.push(box(0.18, 1.6, 0.18, px, 0.8, pz, 0x8a5a32, { r: 0.05, seg: 1 }));
  local.push(box(2.8, 0.18, 2.8, 0, 1.6, 0, 0xc8935a, { r: 0.05, seg: 1, topColor: 0xe0ad72 }));
  local.push(box(2.2, 1.5, 2.2, 0, 2.45, 0, 0xd9b070, { r: 0.08, seg: 1 }));
  local.push(box(0.7, 1.0, 0.06, 0, 2.25, 1.12, 0x5a3a20, { r: 0.02, seg: 0 }));
  const roof = new THREE.ConeGeometry(2.2, 1.6, 4, 1);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 4.0, 0);
  local.push(tint(roof, 0xe8c86a, 0.4));
  const g = merge(local);
  g.rotateY(yaw);
  g.translate(x, y, z);
  parts.push(g);
}

/** Holzschild mit Pfeil (zeigt in Richtung yaw). */
function signParts(x, y, z, yaw, parts) {
  const local = [box(0.14, 1.4, 0.14, 0, 0.7, 0, 0x8a5a32, { r: 0.04, seg: 1 }), box(1.2, 0.5, 0.1, 0.2, 1.25, 0, 0xd99b5c, { r: 0.06, seg: 1 })];
  const tip = new THREE.ConeGeometry(0.34, 0.4, 3);
  tip.rotateZ(-Math.PI / 2);
  tip.translate(0.95, 1.25, 0);
  local.push(tint(tip, 0xd99b5c, 0.2));
  local.push(box(0.7, 0.1, 0.12, 0.15, 1.25, 0.02, 0xffffff, { r: 0.02, seg: 0 }));
  const g = merge(local);
  g.rotateY(yaw);
  g.translate(x, y, z);
  parts.push(g);
}

/** Geschnitzter Totempfahl (lachende Gesichter, bunt). */
function totemParts(x, y, z, yaw, parts) {
  const local = [];
  const cols = [0xe8603a, 0x3aa8e0, 0xf2c230];
  for (let i = 0; i < 3; i++) {
    local.push(box(0.8, 0.9, 0.8, 0, 0.45 + i * 0.92, 0, cols[i], { r: 0.15 }));
    for (const s of [-1, 1]) local.push(box(0.16, 0.16, 0.06, 0.18 * s, 0.6 + i * 0.92, 0.41, 0xffffff, { r: 0.04, seg: 1 }));
    local.push(box(0.4, 0.1, 0.06, 0, 0.32 + i * 0.92, 0.41, 0x5a1a1a, { r: 0.04, seg: 1 }));
  }
  for (const s of [-1, 1]) local.push(box(0.7, 0.18, 0.3, 0.6 * s, 2.5, 0, 0xf2c230, { r: 0.08 }));
  const g = merge(local);
  g.rotateY(yaw);
  g.translate(x, y, z);
  parts.push(g);
}

// ------------------------------------------------------------------ river: Kanäle, Wasser, Ufer, Dschungel

export function buildRiver(level, spec) {
  const net = riverNet(level);
  const J = jungle(level);
  const rnd = new Rnd((level.rnd.int(0, 1e9) ^ 0x51ab) >>> 0);
  const chans = (spec.channels ?? [spec]).map((c) => ({ c, ch: net.addChannel(c) }));
  const lowY = spec.lowland?.y ?? null;
  if (level.view) ensureFlowAnimation(level);
  // Wasserflächen als Kollisionsformen (nur Schatten-Blobs und Schwimmen zu Fuß)
  for (const { ch } of chans) {
    const S = ch.S;
    for (let i = 0; i < S.length - 1; i += 2) {
      const a = S[i], b = S[Math.min(S.length - 1, i + 2)];
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of [a, b]) for (const sd of [-1, 1]) {
        const x = q.x + q.rx * (q.w / 2) * sd, z = q.z + q.rz * (q.w / 2) * sd;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
      }
      const top = Math.min(a.y, b.y);
      if (Math.abs(a.y - b.y) > 3) continue;   // Klippe: keine Fläche quer durch die Luft
      level.world.add({ type: 'box', min: [x0, top - 1.5, z0], max: [x1, top, z1], water: true, solid: false, camIgnore: true, tag: 'river' });
    }
  }
  if (!level.view) return;
  for (const { c, ch } of chans) {
    buildWater(level, ch, J);
    if (!c.bank?.none) buildBanks(level, net, ch, c, J, rnd, lowY);
  }
  if (spec.lowland) buildLowland(level, net, spec.lowland, J, rnd);
  if (spec.life) buildLife(level, net, spec.life, rnd);
}

/** Wasserfläche (Vertexfarben, Glanz) und Schaumstreifen (wandern mit der Strömung). */
function buildWater(level, ch, J) {
  const S = ch.S;
  const lats = [-1.12, -0.9, -0.55, 0, 0.55, 0.9, 1.12];
  const nc = lats.length;
  const P = [], C = [], UV = [], PF = [], UVF = [], CF = [];
  const deep = lin(hex(J.waterDeep)), mid = lin(hex(J.water)), edge = lin(hex(J.waterEdge)), foam = lin(hex(J.foam));
  let v = 0;
  for (let i = 0; i < S.length; i++) {
    const q = S[i];
    if (i > 0) v += Math.hypot(q.x - S[i - 1].x, q.z - S[i - 1].z) / (Math.max(1.2, q.v) * FOAM_PERIOD);
    const slope = i > 0 ? Math.abs(q.y - S[i - 1].y) / Math.max(0.2, q.s - S[i - 1].s) : 0;
    const white = clamp((slope - 0.15) * 2.5, 0, 0.85);
    for (let k = 0; k < nc; k++) {
      const f = lats[k], lat = f * q.w / 2;
      P.push({ x: q.x + q.rx * lat, y: q.y, z: q.z + q.rz * lat });
      const a = Math.abs(f);
      const cc = a >= 0.85 ? mixc(mid, edge, 0.7, [0, 0, 0]) : a >= 0.5 ? mixc(deep, mid, 0.75, [0, 0, 0]) : deep.slice();
      if (white > 0) mixc(cc, foam, white, cc);
      C.push(cc);
      UV.push([lat / 3.6, v]);
    }
    for (let k = 1; k < nc - 1; k++) {
      const f = lats[k], lat = f * q.w / 2;
      PF.push({ x: q.x + q.rx * lat, y: q.y + 0.035, z: q.z + q.rz * lat });
      UVF.push([lat / 3.6, v]);
      const a = Math.abs(f);
      CF.push([1, 1, 1].map((x) => x * (a > 0.8 ? 0.85 : 1)));
    }
  }
  const g = gridGeo(S.length, nc, P, C, UV, true);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.02 });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = `wasser:${ch.id}`;
  addObject(level, mesh);
  const gf = gridGeo(S.length, nc - 2, PF, CF, UVF, true);
  const fm = new THREE.MeshBasicMaterial({ map: foamTexture(), transparent: true, opacity: 0.72, depthWrite: false, vertexColors: true });
  const foamMesh = new THREE.Mesh(gf, fm);
  foamMesh.renderOrder = 1;
  foamMesh.name = `schaum:${ch.id}`;
  addObject(level, foamMesh);
}

/** Uferhöhe (über dem Wasser) entlang s – sanft wellig, je Seite anders. */
const bankH = (base, s, side) => base + 0.35 * Math.sin(s * 0.19 + side * 1.7) + 0.22 * Math.sin(s * 0.53 + side);
/** Uferhöhe über dem Wasser (für Level-Daten: Fahnen/Schilder auf dem Ufer), side −1 links / +1 rechts. */
export const riverBankHeight = bankH;

function buildBanks(level, net, ch, c, J, rnd, lowY) {
  const S = ch.S;
  const H0 = c.bank?.height ?? 2, OUT = c.bank?.out ?? 18;
  const skirt = c.bank?.skirt !== false && lowY !== null;
  const density = c.deco ?? 1;
  const rk = lin(hex(J.bankRock)), rkd = lin(hex(J.bankRockDark)), moss = lin(hex(J.moss)), lip = lin(hex(J.lip));
  const fl1 = lin(hex(J.floor)), fl2 = lin(hex(J.floor2)), sk = lin(hex(J.skirt)), skd = lin(hex(J.skirtDark));
  for (const side of [-1, 1]) {
    // Uferprofil je Abtastpunkt: offen (Gabelung) und Breite des Uferstreifens (bis zum Nachbarkanal)
    const open = [], outW = [];
    for (let i = 0; i < S.length; i++) {
      const q = S[i];
      const lx = q.x + q.rx * side * (q.w / 2 + 0.9), lz = q.z + q.rz * side * (q.w / 2 + 0.9);
      open[i] = net.insideOther(lx, lz, ch, q.s, q.w * 1.6 + 6, 0.1);
      let W = OUT;
      for (const d of [2, 3.5, 5, 7, 9.5, 12.5, 16, 20, 26]) {
        if (d > OUT) break;
        const px = q.x + q.rx * side * (q.w / 2 + 1 + d), pz = q.z + q.rz * side * (q.w / 2 + 1 + d);
        if (net.insideOther(px, pz, ch, q.s, d + q.w * 1.5 + 6, 1.2)) { W = Math.max(0.8, d * 0.5); break; }
      }
      outW[i] = W;
    }
    // weich: Breite über Nachbarn glätten (Minimum)
    const outS = outW.map((w, i) => Math.min(w, outW[Math.max(0, i - 1)], outW[Math.min(S.length - 1, i + 1)]));
    // in Stücken bauen (Frustum-Culling je Abschnitt)
    let i0 = 0;
    while (i0 < S.length - 1) {
      let i1 = i0;
      while (i1 < S.length - 1 && S[i1].s - S[i0].s < CHUNK) i1++;
      const rows = i1 - i0 + 1, cols = skirt ? 8 : 7;
      const P = [], C = [];
      for (let i = i0; i <= i1; i++) {
        const q = S[i];
        const hw = q.w / 2, H = bankH(H0, q.s, side), W = outS[i];
        const full = W >= OUT - 0.01;
        const bump1 = 0.25 * Math.sin(q.s * 0.31 + side * 2.1), bump2 = 0.5 * Math.sin(q.s * 0.13 + side);
        const prof = [
          [hw + 0.15, q.y - 0.8, rkd],
          [hw + 0.4, q.y + H * 0.42, mixc(rkd, rk, 0.6, [0, 0, 0])],
          [hw + 0.75, q.y + H * 0.9, mixc(rk, moss, 0.5, [0, 0, 0])],
          [hw + 1.05, q.y + H, lip],
          [hw + 1.05 + W * 0.35, q.y + H + bump1 * Math.min(1, W / 4), fl1],
          [hw + 1.05 + W * 0.7, q.y + H + bump2 * Math.min(1, W / 6), mixc(fl1, fl2, 0.5, [0, 0, 0])],
          [hw + 1.05 + W, q.y + H + bump2 * 0.5 * Math.min(1, W / 6), fl2],
        ];
        if (skirt) prof.push([hw + 1.05 + W + (full ? 1.2 : 0), full ? lowY - 1 : q.y + H - 0.5, full ? skd : fl2]);
        for (const [lat, y, col] of prof) {
          const p = { x: q.x + q.rx * side * lat, y, z: q.z + q.rz * side * lat, skip: open[i] };
          P.push(p);
          C.push(col.slice ? col.slice() : col);
        }
      }
      // kleine Farbvariation
      for (const cc of C) { const k = 0.93 + rnd.frac() * 0.12; cc[0] *= k; cc[1] *= k; cc[2] *= k; }
      // Seite −1 (links) hat die umgekehrte Umlaufrichtung
      const g = gridGeo(rows, cols, P, C, null, side > 0);
      addStatic(level, g, { castShadow: true });
      i0 = i1;
    }
    // Abschlüsse (Kanalenden, Gabelungen): Profil bis unten schließen
    const caps = [];
    for (let i = 0; i < S.length; i++) {
      const edgeStart = (i === 0) || (open[i - 1] && !open[i]);
      const edgeEnd = (i === S.length - 1) || (open[i + 1] && !open[i]);
      if (!open[i] && (edgeStart || edgeEnd)) caps.push(i);
    }
    for (const i of caps) {
      const q = S[i];
      const hw = q.w / 2, H = bankH(H0, q.s, side), W = outS[i];
      const bottom = skirt && W >= OUT - 0.01 ? lowY - 1 : q.y - 0.8;
      const lat0 = hw + 0.15, lat1 = hw + 1.05 + W + (skirt && W >= OUT - 0.01 ? 1.2 : 0);
      const pts = [];
      const n = 8;
      for (let k = 0; k <= n; k++) {
        const lat = lat0 + (lat1 - lat0) * (k / n);
        const top = k === 0 ? q.y - 0.8 : q.y + H;
        pts.push([lat, top]);
      }
      const P = [], C = [];
      for (const [lat, top] of pts) {
        for (const y of [top, bottom]) {
          P.push({ x: q.x + q.rx * side * lat, y, z: q.z + q.rz * side * lat });
          C.push(y === bottom ? skd.slice() : sk.slice());
        }
      }
      // beidseitig (Kappe ist von flussauf und flussab sichtbar)
      addStatic(level, merge([gridGeo(pts.length, 2, P, C, null, false).toNonIndexed(), gridGeo(pts.length, 2, P, C, null, true).toNonIndexed()]), { castShadow: false });
    }
    if (density > 0) scatterJungle(level, net, ch, side, outS, open, H0, J, rnd, density, OUT);
  }
}

/** Dschungel auf dem Uferstreifen: Palmen, Farne, Büsche, Blüten, Felsen, große Urwaldbäume (in Stücken). */
function scatterJungle(level, net, ch, side, outS, open, H0, J, rnd, density, OUT) {
  const S = ch.S;
  let parts = [];
  let chunkStart = 0;
  const flush = () => { if (parts.length) addStatic(level, merge(parts), { castShadow: true }); parts = []; };
  let s = rnd.real(1, 4);
  while (s < ch.length - 1) {
    const q = ch.at(s, {});
    const i = Math.min(S.length - 1, Math.round(s));
    const ii = S.findIndex((p) => p.s >= s);
    const idx = ii < 0 ? S.length - 1 : ii;
    if (s - chunkStart > CHUNK) { flush(); chunkStart = s; }
    const W = outS[idx];
    if (!open[idx] && W > 1.5) {
      const hw = q.w / 2;
      const H = bankH(H0, s, side);
      const pick = rnd.frac();
      const lat = hw + 1.6 + rnd.real(0, Math.min(W - 1.2, 7));
      const x = q.x + q.rx * side * lat, z = q.z + q.rz * side * lat;
      const y = q.y + H - 0.05;
      if (!net.insideOther(x, z, ch, s, q.w * 1.5 + 8, 1.0)) {
        if (pick < 0.36) palmParts(J, x, y, z, rnd.real(3.6, 5.6), rnd.real(0.12, 0.3) * 1, Math.atan2(-(q.rz * -side), q.rx * -side) + rnd.real(-0.6, 0.6), rnd, parts);
        else if (pick < 0.6) fernParts(J, x, y, z, rnd.real(0.8, 1.3), rnd, parts);
        else if (pick < 0.78) bushParts(J, x, y, z, rnd.real(0.7, 1.1), rnd, parts);
        else if (pick < 0.9) bloomParts(J, x, y, z, rnd, parts);
        else rockParts(x, y, z, rnd.real(0.4, 0.8), rnd, parts);
      }
      // großer Urwaldbaum weiter hinten
      if (W > 9 && rnd.chance(0.35)) {
        const lt = hw + 6 + rnd.real(0, Math.min(W - 7, 10));
        const tx = q.x + q.rx * side * lt, tz = q.z + q.rz * side * lt;
        if (!net.insideOther(tx, tz, ch, s, q.w * 1.5 + 14, 3)) treeParts(J, tx, q.y + H - 0.1, tz, rnd.real(6, 9), rnd, parts);
      }
    }
    s += rnd.real(2.6, 4.6) / Math.max(0.25, density);
    void i;
  }
  flush();
}

/** Tiefland: große Ebene unter dem Plateau mit fernen Urwaldbäumen. */
function buildLowland(level, net, lw, J, rnd) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const ch of net.channels) { x0 = Math.min(x0, ch.bbox.x0); x1 = Math.max(x1, ch.bbox.x1); z0 = Math.min(z0, ch.bbox.z0); z1 = Math.max(z1, ch.bbox.z1); }
  const m = 260;
  const g = new THREE.PlaneGeometry(x1 - x0 + m * 2, z1 - z0 + m * 2, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, lw.y, (z0 + z1) / 2);
  const c = lin(hex(J.lowland));
  const mesh = new THREE.Mesh(colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }), level.view.mats.world);
  mesh.receiveShadow = false;
  mesh.name = 'tiefland';
  addObject(level, mesh);
  const parts = [];
  const n = lw.trees ?? 40;
  for (let k = 0; k < n; k++) {
    const x = rnd.real(x0 - 70, x1 + 70), z = rnd.real(z0 - 90, z1 + 40);
    if (net.insideOther(x, z, null, 0, 0, 30)) continue;
    // nur Bäume weit genug vom Plateau (sonst stecken sie im Ufer)
    let near = false;
    for (const ch of net.channels) { const q = ch.nearest(x, z, {}); if (q.dist < q.w / 2 + 34 && q.y > lw.y + 3) near = true; }
    if (near) continue;
    treeParts(J, x, lw.y, z, rnd.real(8, 13), rnd, parts);
  }
  if (parts.length) {
    const tm = new THREE.Mesh(merge(parts), level.view.mats.world);
    tm.name = 'tiefland:baeume';
    addObject(level, tm);
  }
}

// ------------------------------------------------------------------ Leben: Schmetterlinge und Libellen

function buildLife(level, net, life, rnd) {
  const nB = life.butterflies ?? 30, nD = life.dragonflies ?? 12;
  // Schmetterling: zwei Flügelpaare als „V“ (Spannweite entlang X; Flattern = Skalierung in X)
  const bw = [];
  for (const s of [-1, 1]) {
    const up = new THREE.CircleGeometry(0.13, 8);
    up.rotateX(-Math.PI / 2);
    up.scale(1.2, 1, 1);
    up.translate(0.13 * s, 0.02, -0.05);
    bw.push(up);
    const lo = new THREE.CircleGeometry(0.09, 8);
    lo.rotateX(-Math.PI / 2);
    lo.translate(0.09 * s, 0.01, 0.09);
    bw.push(lo);
  }
  const body = new THREE.CapsuleGeometry(0.018, 0.16, 2, 4);
  body.rotateX(Math.PI / 2);
  const bg = merge([...bw.map((g) => g.toNonIndexed()), body.toNonIndexed()]);
  const bmat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const bm = new THREE.InstancedMesh(bg, bmat, nB);
  bm.frustumCulled = false;
  bm.name = 'schmetterlinge';
  const cols = [0xff9a2e, 0x3aa8ff, 0xffd23a, 0xff6ad5, 0xffffff, 0x9a6aff];
  const anchors = [];
  const chs = net.channels;
  for (let i = 0; i < nB; i++) {
    const ch = chs[i % chs.length];
    const s = rnd.real(4, ch.length - 4);
    const q = ch.at(s, {});
    const side = rnd.chance(0.5) ? 1 : -1;
    const lat = q.w / 2 + rnd.real(0.5, 4);
    anchors.push({ x: q.x + q.rx * side * lat, y: q.y + rnd.real(1.4, 3), z: q.z + q.rz * side * lat, ph: rnd.real(0, TAU), sp: rnd.real(0.6, 1.2), r: rnd.real(0.6, 1.6) });
    bm.setColorAt(i, new THREE.Color(rnd.pick(cols)));
  }
  // Libelle: schlanker Körper (türkis) und vier glasige Flügel
  const dparts = [];
  const db = new THREE.CapsuleGeometry(0.025, 0.36, 2, 5);
  db.rotateX(Math.PI / 2);
  dparts.push(tint(db, 0x1fc8d8, 0.3));
  dparts.push(blob(0.045, 0, 0, -0.2, 0x7af0ff, 0x1fa8c8, 0x10607a, 1, 1, 1, 6, 4));
  for (const s of [-1, 1]) for (const dz of [-0.07, 0.02]) {
    const w = new THREE.PlaneGeometry(0.3, 0.06);
    w.rotateX(-Math.PI / 2);
    w.translate(0.17 * s, 0.01, dz);
    dparts.push(tint(w, 0xe8fbff, 0));
  }
  const dg = merge(dparts);
  const dmat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const dm = new THREE.InstancedMesh(dg, dmat, nD);
  dm.frustumCulled = false;
  dm.name = 'libellen';
  const dAnch = [];
  for (let i = 0; i < nD; i++) {
    const ch = chs[i % chs.length];
    const s = rnd.real(4, ch.length - 4);
    const q = ch.at(s, {});
    const lat = rnd.real(-0.8, 0.8) * (q.w / 2 - 0.5);
    dAnch.push({ x: q.x + q.rx * lat, y: q.y + rnd.real(0.6, 1.4), z: q.z + q.rz * lat, ph: rnd.real(0, TAU), hop: rnd.real(1.5, 3.5) });
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  const group = new THREE.Group();
  group.add(bm, dm);
  addObject(level, group, (dt, t) => {
    for (let i = 0; i < nB; i++) {
      const a = anchors[i];
      const u = t * a.sp + a.ph;
      _p.set(a.x + Math.sin(u) * a.r, a.y + Math.sin(u * 2.3) * 0.35, a.z + Math.sin(u * 1.4 + 1) * a.r * 0.8);
      const yaw = Math.atan2(Math.cos(u) * a.r, Math.cos(u * 1.4 + 1) * a.r * 1.12);
      _e.set(0, yaw, 0); _q.setFromEuler(_e);
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 16 + a.ph));
      _s.set(flap, 1, 1);
      _m.compose(_p, _q, _s);
      bm.setMatrixAt(i, _m);
    }
    bm.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < nD; i++) {
      const a = dAnch[i];
      // Libellen: stehen in der Luft, schießen ruckartig zu einem neuen Punkt
      const cyc = (t + a.ph) / a.hop, k = cyc - Math.floor(cyc), seg = Math.floor(cyc);
      const r1 = Math.sin(seg * 12.9898 + a.ph) * 1.6, r2 = Math.sin((seg + 1) * 12.9898 + a.ph) * 1.6;
      const m = smooth(0.78, 0.95, k);
      const ox = r1 + (r2 - r1) * m, oz = Math.cos(seg * 7.1 + a.ph) * 1.2 + (Math.cos((seg + 1) * 7.1 + a.ph) * 1.2 - Math.cos(seg * 7.1 + a.ph) * 1.2) * m;
      _p.set(a.x + ox, a.y + Math.sin(t * 3 + a.ph) * 0.06, a.z + oz);
      _e.set(0, a.ph + seg * 1.3, 0); _q.setFromEuler(_e);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      dm.setMatrixAt(i, _m);
    }
    dm.instanceMatrix.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ Felsen, Rampen, Temposchwellen

function surfaceAt(level, x, z) { return riverNet(level).sample(x, z).y ?? 0; }

export function buildRiverRock(level, spec) {
  const p = spec.pos;
  const x = p[0], z = p.length >= 3 ? p[2] : p[1];
  const y = p.length >= 3 ? p[1] : surfaceAt(level, x, z);
  const r = spec.r ?? 0.9, h = spec.h ?? 1.2;
  riverNet(level).addRock({ x, z, r, top: y + h });
  if (!level.view) return;
  const rnd = new Rnd(((x * 73856093) ^ (z * 19349663)) >>> 0);
  const parts = [];
  const g = new THREE.DodecahedronGeometry(r * 1.05, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const k = 1 + 0.12 * Math.sin(vx * 5.1 + vz * 3.7) + 0.08 * Math.sin(vy * 7.3);
    pos.setXYZ(i, vx * k, vy * k, vz * k);
  }
  g.computeVertexNormals();
  g.scale(1, (h + 0.8) / (r * 2.1), 1);
  g.rotateY(rnd.real(0, TAU));
  g.translate(x, y + (h + 0.8) / 2 - 0.8, z);
  const L = lin(0xb4ab9e), D = lin(0x6d655c), M = lin(0x58a83a);
  parts.push(colorize(g, (pp, n, o) => { mixc(D, L, smooth(-0.6, 0.7, n.y), o); if (n.y > 0.55 && pp.y > y + h * 0.5) mixc(o, M, 0.75, o); }));
  addStatic(level, merge(parts), { castShadow: true });
  // Schaumkranz an der Wasserlinie
  const ring = new THREE.TorusGeometry(r * 1.08, 0.09, 4, 20);
  ring.rotateX(Math.PI / 2);
  ring.scale(1, 0.4, 1);
  ring.translate(x, y + 0.04, z);
  const fc = lin(0xffffff);
  addStatic(level, colorize(ring, (pp, n, o) => { o[0] = fc[0]; o[1] = fc[1]; o[2] = fc[2]; }), { material: 'glow', castShadow: false });
}

function flowYaw(level, x, z) {
  const f = riverNet(level).sample(x, z);
  return Math.atan2(-f.dz, f.dx);
}

export function buildRiverRamp(level, spec) {
  const [x, z] = spec.pos.length >= 3 ? [spec.pos[0], spec.pos[2]] : spec.pos;
  const yaw = spec.yaw ?? flowYaw(level, x, z);
  const r = riverNet(level).addRamp({ x, z, yaw, len: spec.len ?? 4.5, wid: spec.wid ?? 3.2, h: spec.h ?? 1.4, kick: spec.kick ?? 6 });
  if (!level.view) return;
  // Holzrampe: Planken quer, zwei Längsbalken, Stützpfähle, weiße Pfeile auf den Planken
  const local = [];
  const slope = Math.atan2(r.h, r.len);
  const n = Math.ceil(r.len / 0.42);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const g = box(r.len / n - 0.04, 0.14, r.wid, 0, 0, 0, i % 2 ? 0xd2914f : 0xe0a35e, { r: 0.04, seg: 1, topColor: i % 2 ? 0xe8b06a : 0xf2c07a });
    g.rotateZ(slope);
    g.translate(-r.len / 2 + t * r.len, r.h * t - 0.02, 0);
    local.push(g);
  }
  for (const s of [-1, 1]) {
    const beam = box(Math.hypot(r.len, r.h) + 0.3, 0.26, 0.22, 0, 0, 0, 0x8a5a32, { r: 0.06, seg: 1 });
    beam.rotateZ(slope);
    beam.translate(0, r.h / 2 - 0.2, s * (r.wid / 2 + 0.05));
    local.push(beam);
    local.push(box(0.26, r.h + 1.2, 0.26, r.len / 2 - 0.15, (r.h - 1.2) / 2, s * (r.wid / 2 + 0.05), 0x7a4a26, { r: 0.08, seg: 1 }));
  }
  // Pfeile (V) auf der Lauffläche
  for (const t of [0.35, 0.7]) {
    for (const s of [-1, 1]) {
      const a = box(0.12, 0.05, 0.9, 0, 0, 0, 0xffffff, { r: 0.02, seg: 0 });
      a.rotateY(s * 0.75);
      a.translate(0, 0, s * 0.3);
      a.rotateZ(slope);
      a.translate(-r.len / 2 + t * r.len, r.h * t + 0.08, 0);
      local.push(a);
    }
  }
  const g = merge(local);
  g.rotateY(yaw);
  g.translate(x, r.base, z);
  addStatic(level, g, { castShadow: true });
  // Schaum am Fuß der Rampe
  const ring = new THREE.PlaneGeometry(r.wid + 0.8, 0.5);
  ring.rotateX(-Math.PI / 2);
  ring.rotateY(yaw + Math.PI / 2);
  ring.translate(x - Math.cos(yaw) * r.len / 2, r.base + 0.05, z + Math.sin(yaw) * r.len / 2);
  const fc = lin(0xf4ffff);
  addStatic(level, colorize(ring, (pp, nn, o) => { o[0] = fc[0]; o[1] = fc[1]; o[2] = fc[2]; }), { material: 'glow', castShadow: false });
}

/** Temposchwellen: türkise Platte mit drei Pfeilreihen (Lauflicht über drei gemeinsame Materialien). */
export function buildRiverWave(level, spec) {
  const [x, z] = spec.pos.length >= 3 ? [spec.pos[0], spec.pos[2]] : spec.pos;
  const yaw = spec.yaw ?? flowYaw(level, x, z);
  const net = riverNet(level);
  const w = net.addWave({ x, z, yaw, len: spec.len ?? 3, wid: spec.wid ?? 3, boost: spec.boost ?? 4 });
  if (!level.view) return;
  const y = net.sample(x, z).y;
  const pad = box(w.len, 0.1, w.wid, 0, 0.0, 0, 0x2ad0ee, { r: 0.08, seg: 1, topColor: 0x6af0ff });
  pad.rotateY(yaw);
  pad.translate(x, y + 0.02, z);
  addStatic(level, pad, { material: 'glow', castShadow: false });
  // Pfeile: je Reihe ein gemeinsames Mesh (alle Schwellen), Farbe pulsiert nacheinander
  let fx = level._waveFx;
  if (!fx) {
    fx = level._waveFx = { rows: [[], [], []], mats: [], built: false };
    const mats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0xffffff }));
    fx.mats = mats;
    // nach dem Aufbau (erstes Bild) verschmelzen
    level.view.onFrame((dt, t) => {
      if (!fx.built) {
        fx.built = true;
        fx.rows.forEach((parts, k) => {
          if (!parts.length) return;
          const m = new THREE.Mesh(merge(parts), mats[k]);
          m.name = `schwellen:${k}`;
          addObject(level, m);
        });
      }
      for (let k = 0; k < 3; k++) {
        const a = Math.pow(Math.max(0, Math.sin(t * 7 - k * 1.25)), 3);
        mats[k].color.setRGB(0.55 + 0.45 * a, 0.92 + 0.08 * a, 1);
      }
    });
  }
  for (let k = 0; k < 3; k++) {
    const local = [];
    for (const s of [-1, 1]) {
      const a = box(0.16, 0.06, w.wid * 0.42, 0, 0, 0, 0xffffff, { r: 0.03, seg: 0 });
      a.rotateY(s * 0.8);
      a.translate(0, 0, s * w.wid * 0.15);
      local.push(a);
    }
    const g = merge(local);
    g.translate(-w.len * 0.3 + k * w.len * 0.3, 0.1, 0);
    g.rotateY(yaw);
    g.translate(x, y + 0.02, z);
    fx.rows[k].push(g);
  }
}

// ------------------------------------------------------------------ Wasserfälle, Felsbogen, Klippe

export function buildRiverFall(level, spec) {
  if (!level.view) return;
  ensureFlowAnimation(level);
  const a = v3(spec.from), b = v3(spec.to);
  const W = spec.width ?? 6, lip = spec.lip ?? 1.2;
  let fx = b.x - a.x, fz = b.z - a.z;
  let fl = Math.hypot(fx, fz);
  if (fl < 0.01) { const yw = spec.yaw ?? Math.PI / 2; fx = Math.cos(yw); fz = -Math.sin(yw); fl = 1; } else { fx /= fl; fz /= fl; }
  const rx = -fz, rz = fx;
  const H = a.y - b.y;
  const nC = Math.max(4, Math.ceil(W / 0.9)), nR = Math.max(8, Math.ceil(H / 1.2));
  const P = [], C = [], UV = [];
  const rainbow = !!spec.rainbow;
  const RB = [0xff4a4a, 0xff9a2e, 0xffe14a, 0x5fe05a, 0x3ab8ff, 0x7a6aff, 0xd86aff].map((c) => lin(c));
  const waterTop = lin(0xd6f6ff), waterLow = lin(0xffffff);
  const dist = Math.max(fl, lip * 1.6);
  for (let r = 0; r <= nR; r++) {
    const t = r / nR;
    const out = dist * (1 - Math.pow(1 - t, 2.2)) * 0.9 + lip * Math.min(1, t * 6) * 0.1;
    const y = a.y - H * Math.pow(t, 1.5);
    for (let c = 0; c <= nC; c++) {
      const u = c / nC - 0.5;
      const spread = W * (1 + t * 0.12);
      P.push({ x: a.x + fx * out + rx * u * spread, y, z: a.z + fz * out + rz * u * spread });
      let col;
      if (rainbow) {
        const k = (c / nC) * (RB.length - 1), i0 = Math.floor(k), i1 = Math.min(RB.length - 1, i0 + 1);
        col = mixc(RB[i0], RB[i1], k - i0, [0, 0, 0]);
        mixc(col, waterLow, 0.18 + 0.25 * t, col);
      } else col = mixc(waterTop, waterLow, t, [0, 0, 0]);
      C.push(col);
      UV.push([u * W / 2.5, -t * H / 5]);
    }
  }
  const g = gridGeo(nR + 1, nC + 1, P, C, UV, true);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, map: fallTexture(), transparent: true, opacity: rainbow ? 0.9 : 0.94, side: THREE.DoubleSide, depthWrite: false });
  const curtain = new THREE.Mesh(g, mat);
  curtain.renderOrder = 3;
  curtain.name = rainbow ? 'regenbogenfall' : 'wasserfall';
  addObject(level, curtain);
  // Schaum am Aufprall
  const ring = new THREE.CircleGeometry(1, 20);
  ring.rotateX(-Math.PI / 2);
  ring.scale(W * 0.7, 1, Math.max(1.5, W * 0.25));
  ring.rotateY(Math.atan2(-fz, fx));
  ring.translate(b.x, b.y + 0.06, b.z);
  const fc = lin(0xffffff);
  addStatic(level, colorize(ring, (pp, n, o) => { o[0] = fc[0]; o[1] = fc[1]; o[2] = fc[2]; }), { material: 'glow', castShadow: false });
  if (spec.mist !== false) buildMist(level, b, W, H, rainbow, fx, fz);
  if (spec.arc ?? rainbow) {
    // Regenbogen-Bogen vor der Gischt
    const R = Math.max(2, W * 0.55);
    const rg = new THREE.RingGeometry(R * 0.78, R, 32, 7, 0, Math.PI);
    const pos = rg.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const rr = Math.hypot(pos.getX(i), pos.getY(i));
      const k = clamp((rr - R * 0.78) / (R * 0.22), 0, 0.999) * (RB.length - 1);
      const i0 = Math.floor(k), cc = mixc(RB[i0], RB[Math.min(RB.length - 1, i0 + 1)], k - i0, [0, 0, 0]);
      col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2];
    }
    rg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    rm.position.set(b.x + fx * 1.6, b.y + 0.2, b.z + fz * 1.6);
    rm.rotation.y = Math.atan2(-fz, fx) + Math.PI / 2;
    rm.renderOrder = 4;
    rm.name = 'regenbogen';
    addObject(level, rm);
  }
}

/** Gischt: weiche Punkte steigen am Aufprall auf und verwehen (eine Punktwolke je Wasserfall). */
function buildMist(level, b, W, H, rainbow, fx, fz) {
  const n = Math.round(clamp(W * 6, 30, 90));
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const st = [];
  const rnd = new Rnd(((b.x * 131) ^ (b.z * 71)) >>> 0);
  const RB = [0xff7a7a, 0xffb05a, 0xfff07a, 0x8af08a, 0x7ad0ff, 0xb09aff].map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    st.push({ life: rnd.real(0, 1), sp: rnd.real(0.6, 1.4), u: rnd.real(-0.55, 0.55), d: rnd.real(-0.4, 1.2) });
    const c = rainbow && rnd.chance(0.6) ? RB[i % RB.length] : new THREE.Color(0xffffff);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: clamp(H * 0.12, 0.9, 3.2), map: mistTexture(), transparent: true, opacity: 0.7, depthWrite: false, vertexColors: true, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  pts.name = 'gischt';
  const rx = -fz, rz = fx;
  addObject(level, pts, (dt) => {
    for (let i = 0; i < n; i++) {
      const s = st[i];
      s.life += dt * 0.55 * s.sp;
      if (s.life > 1) { s.life -= 1; s.u = rnd.real(-0.55, 0.55); s.d = rnd.real(-0.4, 1.2); }
      const k = s.life;
      const spread = 1 + k * 1.5;
      pos[i * 3] = b.x + rx * s.u * W * spread * 0.6 + fx * (s.d + k * 2.2);
      pos[i * 3 + 1] = b.y + 0.2 + k * clamp(H * 0.35, 1.5, 7) * s.sp;
      pos[i * 3 + 2] = b.z + rz * s.u * W * spread * 0.6 + fz * (s.d + k * 2.2);
    }
    geo.attributes.position.needsUpdate = true;
  });
}

export function buildRiverArch(level, spec) {
  if (!level.view) return;
  const p = v3(spec.pos);
  const yaw = spec.yaw ?? flowYaw(level, p.x, p.z);
  const span = spec.span ?? 7, H = spec.height ?? 4.5, D = spec.depth ?? 3;
  const rnd = new Rnd(((p.x * 31) ^ (p.z * 17)) >>> 0);
  const parts = [];
  // lokale Achsen: entlang der Strömung = +X, quer = Z
  const pillar = (s) => {
    for (let k = 0; k < 4; k++) {
      const g = box(D * rnd.real(0.85, 1.1), H / 3.2, 2.2 * rnd.real(0.9, 1.15), rnd.real(-0.2, 0.2), -0.8 + (k + 0.5) * (H + 0.8) / 4, s * (span / 2 + 1.1), k % 2 ? 0x8a7e70 : 0x7a6e62, { r: 0.4, seg: 2, topColor: 0x5aa83a });
      parts.push(g);
    }
  };
  pillar(-1); pillar(1);
  // Bogen (Sturz) mit Moos und hängenden Ranken
  parts.push(box(D * 1.05, 1.4, span + 4.4, 0, H + 0.6, 0, 0x857868, { r: 0.5, seg: 2, topColor: 0x5fb83a }));
  for (let k = 0; k < 9; k++) {
    const z = -span / 2 + (k + 0.5) * span / 9, len = rnd.real(0.5, 1.6);
    const g = new THREE.CylinderGeometry(0.035, 0.035, len, 3, 1, true);
    g.translate(rnd.real(-D / 2, D / 2), H - 0.1 - len / 2, z);
    parts.push(tint(g, 0x3f8a2a, 0));
    if (rnd.chance(0.5)) parts.push(blob(0.12, 0, H - 0.1 - len, z, 0xff8ad0, 0xff4fa0, 0xc02a70, 1, 1, 1, 5, 4));
  }
  const g = merge(parts);
  g.rotateY(yaw);
  g.translate(p.x, p.y, p.z);
  addStatic(level, g, { castShadow: true });
}

export function buildRiverCliff(level, spec) {
  if (!level.view) return;
  const [ax, az] = spec.from, [bx, bz] = spec.to;
  const y0 = spec.y0 ?? -30, y1 = spec.y1 ?? 0, D = spec.depth ?? 4;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L;
  const rnd = new Rnd(((ax * 7) ^ (bz * 13)) >>> 0);
  const parts = [];
  const bandH = 3.2;
  for (let y = y0; y < y1; y += bandH) {
    let t = rnd.real(-1, 0.5);
    while (t < L + 1) {
      const w = rnd.real(2.5, 5);
      const cx = ax + ux * (t + w / 2), cz = az + uz * (t + w / 2);
      const hh = Math.min(bandH * rnd.real(1, 1.25), y1 - y + 0.2);
      const shade = rnd.pick([0x8a7e70, 0x7d7166, 0x95897a, 0x6f6459]);
      const g = box(w, hh, D * rnd.real(0.8, 1.2), 0, 0, 0, shade, { r: 0.6, seg: 2, topColor: y + hh >= y1 - 0.5 ? 0x5fb83a : 0x8c9a6a });
      g.rotateY(Math.atan2(-uz, ux));
      g.translate(cx, y + hh / 2, cz);
      parts.push(g);
      t += w * rnd.real(0.75, 0.95);
    }
  }
  addStatic(level, merge(parts), { castShadow: true });
}

export function buildRiverDeco(level, spec) {
  if (!level.view) return;
  const J = jungle(level);
  const net = riverNet(level);
  const items = spec.items ?? [spec];
  const rnd = new Rnd((level.rnd.int(0, 1e9) ^ items.length ^ 0x77) >>> 0);
  const groups = new Map();
  const partsFor = (z) => { const k = Math.floor(-z / CHUNK); if (!groups.has(k)) groups.set(k, []); return groups.get(k); };
  for (const it of items) {
    const p = it.pos;
    const water = it.kind === 'lilies';
    const x = p[0], z = p.length >= 3 ? p[2] : p[1];
    const y = p.length >= 3 ? p[1] : net.sample(x, z).y;
    const parts = partsFor(z);
    switch (it.kind) {
      case 'palm': palmParts(J, x, y, z, it.size ?? 4.8, it.lean ?? 0.22, it.yaw ?? rnd.real(0, TAU), rnd, parts); break;
      case 'fern': fernParts(J, x, y, z, it.size ?? 1, rnd, parts); break;
      case 'bush': bushParts(J, x, y, z, it.size ?? 0.9, rnd, parts); break;
      case 'bloom': bloomParts(J, x, y, z, rnd, parts); break;
      case 'rock': rockParts(x, y, z, it.size ?? 0.7, rnd, parts); break;
      case 'tree': treeParts(J, x, y, z, it.size ?? 8, rnd, parts); break;
      case 'lilies': liliesParts(x, y, z, it.r ?? 1.5, it.n ?? 6, rnd, parts); break;
      case 'reeds': reedsParts(x, y, z, rnd, parts); break;
      case 'hut': hutParts(x, y, z, it.yaw ?? 0, parts); break;
      case 'sign': signParts(x, y, z, it.yaw ?? 0, parts); break;
      case 'totem': totemParts(x, y, z, it.yaw ?? 0, parts); break;
      default: console.warn(`[river_deco] unbekannte Art: ${it.kind}`);
    }
    void water;
  }
  for (const parts of groups.values()) if (parts.length) addStatic(level, merge(parts), { castShadow: true });
}

export const TYPES = {
  river: buildRiver,
  river_rock: buildRiverRock,
  river_ramp: buildRiverRamp,
  river_wave: buildRiverWave,
  river_fall: buildRiverFall,
  river_arch: buildRiverArch,
  river_cliff: buildRiverCliff,
  river_deco: buildRiverDeco,
};
