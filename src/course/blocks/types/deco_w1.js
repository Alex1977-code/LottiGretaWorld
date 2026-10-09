// Baustein `deco_w1`: zusätzliche Zier für Welt 1 (Wiese und Höhle). Reine Optik ohne Kollision, außer wo
// `solid` angegeben ist. Ergänzt `deco` (Bäume, Büsche, Blumen, Zäune, Steine, Laternen, Pfosten).
//
// Einzeln:  { type: 'deco_w1', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w1', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt auf dem Boden (Ausnahmen genannt). yaw in Radiant um +Y.
// kind:
//   bellflowers  Glockenblumen-Tuff: size [w, d], n (Standard 7), colors (['blue','violet','white'])
//   mushrooms    Pilzgruppe (3–5 Pilze): size (Maßstab, Standard 1), color 'red'|'orange'|'brown'|'violet',
//                glow: true → leuchtende Kappen (Höhle)
//   sign         Holzschild mit Pfeil: arrow 'up' (vorwärts, Standard) | 'left' | 'right' | 'down' | null,
//                yaw (Schild blickt bei 0 nach +Z zur Kamera), size (Maßstab), color (Pfeilfarbe)
//   reeds        Schilf mit Rohrkolben (Teichrand): n (Standard 7), size (Höhe, Standard 1.3), r (Streuradius 0.5)
//   lilypads     Seerosenblätter auf der Wasseroberfläche (pos.y = Oberfläche): size [w, d], n (Standard 5)
//   arch         Rosenbogen aus weißem Holz: yaw (0 = Durchgang entlang Z), width (2.6), height (2.8),
//                solid (Pfosten fest, Standard true)
//   stump        Baumstumpf: size (Radius, Standard 0.5), solid (Standard true: begehbarer Zylinder)
//   tufts        Grasbüschel: size [w, d], n (Standard 8)
//   checker      Rasenmuster (Schachbrett-Felder über einer Grasdecke, pos = Mitte der Oberseite): size [w, d],
//                cell (2), color (helles Grün), inset (Randabstand 0.25)
//   daisies      Gänseblümchen-Wiese (sparsam, ≈ 12 Dreiecke je Blüte): size [w, d], n (20), colors
//   cloudbank    Kulissenwolke (große Kugelhaufen): size (Maßstab, Standard 3), n (Kugeln, Standard 6)
//   bunting      Wimpelkette: from, to (Aufhängepunkte), sag (Durchhang, 0.5), colors
//   stalactites  Tropfsteine an einer Decke/Überhang (pos.y = Deckenhöhe): size [w, d], n (6), len [min, max]
//   stalagmites  Tropfsteine am Boden: size [w, d], n (5), len [min, max], solid (große Kegel fest, Standard false)
//   crystals     leuchtende Kristallgruppe: size (Maßstab, 1), n (5), color 'cyan'|'violet'|'pink'|'gold'
//   rockwall     zerklüftete Felswand (Höhle): size [w, h, d] (pos = Mitte der Unterseite), solid (Standard true),
//                color (Hex), top (Moos-/Gras-Saum oben, Standard false)
//   pebbles      Trittsteine/Kiesel: from, to, n (Standard 6), size (Radius 0.35)
//   haybale      Heuballen (rund, liegend): yaw, size (Radius 0.6), solid (Standard true)
//   picnic       Picknickdecke mit Korb: yaw, size [w, d] (Decke, Standard [1.6, 1.2])
//   opening      Lichtöffnung/Höhlenausgang (leuchtender Bogen auf einer Wand): pos (Mitte unten), size [w, h], yaw
//   butterflies  Schmetterlinge (animiert, ein Mesh): n (4), r (Flugkreis 2.5), h (Flughöhe 1.2), colors
//   fireflies    Glühwürmchen (weiche Leuchtpunkte, ein Punktwolken-Objekt): n (10), size [w, h, d] (Schwebe-Kasten
//                über pos), dot (Punktgröße 0.55 m), colors
// Geometrie je Eintrag verschmolzen (Material world bzw. glow für Leuchtteile).

import * as THREE from 'three';
import { v3, box, hex, lin, mixc, smooth, colorize, merge, Rnd, addStatic, addObject } from '../kit.js';

const BELL = { blue: 0x5a7dff, violet: 0x9a62ff, white: 0xf4f2ff, pink: 0xff8fd0 };
const CAP = {
  red: [0xff4a3a, 0xc42a22], orange: [0xff9a2e, 0xc9661a], brown: [0xc98a52, 0x8a5a32], violet: [0xb07aff, 0x7a46d0],
  cyan: [0x7af2ff, 0x2ab8d8], gold: [0xffe27a, 0xd9a52a],
};
const CRYSTAL = { cyan: [0xa8fbff, 0x3fd8f0, 0x1d7fa8], violet: [0xe2c4ff, 0xa865ff, 0x5a2aa8], pink: [0xffd0ec, 0xff7ac0, 0xa83a7a], gold: [0xfff2b0, 0xffcf3a, 0xa8781a] };
const FLAG_COLS = [0xff4a3d, 0xffd23d, 0x3d8bff, 0x4fd04a, 0xff7ac0, 0xffffff];

// ------------------------------------------------------------------ Grundformen (Weltkoordinaten, Vertexfarben)

/** Farbverlauf unten → oben (lineare Farben) über die Höhe y0..y1. */
const vgrad = (a, b, y0, y1) => (p, n, o) => mixc(a, b, smooth(y0, y1, p.y), o);
/** Licht von oben: Seiten mid, oben light, unten dark. */
const lit = (L, M, D) => (p, n, o) => (n.y >= 0 ? mixc(M, L, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o));

function cyl(rTop, rBot, h, x, y, z, seg, fn, opts = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, opts.open ?? false);
  if (opts.rx) g.rotateX(opts.rx);
  if (opts.rz) g.rotateZ(opts.rz);
  if (opts.ry) g.rotateY(opts.ry);
  g.translate(x, y, z);
  return colorize(g, fn);
}

function sph(r, x, y, z, fn, sx = 1, sy = 1, sz = 1, ws = 8, hs = 6, opts = {}) {
  const g = new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, opts.half ? Math.PI / 2 : Math.PI);
  g.scale(sx, sy, sz);
  if (opts.rx) g.rotateX(opts.rx);
  if (opts.rz) g.rotateZ(opts.rz);
  g.translate(x, y, z);
  return colorize(g, fn);
}

/** Geometrie (lokal um den Fußpunkt gebaut) drehen und an pos setzen. */
function placeLocal(g, p, yaw = 0) {
  if (!g) return null;
  if (yaw) g.rotateY(yaw);
  g.translate(p.x, p.y, p.z);
  return g;
}

// ------------------------------------------------------------------ Wiese

function bellflowers(it, parts, rnd) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [1.2, 1.2];
  const n = it.n ?? 7;
  const cols = it.colors ?? ['blue', 'violet', 'white'];
  const stem = lin(0x3f9a2a), leafL = lin(0x8ee06a), leafD = lin(0x3d8f32);
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const h = rnd.real(0.38, 0.62);
    const lean = rnd.real(-0.25, 0.25);
    parts.push(cyl(0.018, 0.026, h, x, p.y + h / 2, z, 4, (pp, nn, o) => { o[0] = stem[0]; o[1] = stem[1]; o[2] = stem[2]; }, { open: true, rz: lean * 0.3 }));
    // Blätter am Fuß
    parts.push(sph(0.13, x + 0.06, p.y + 0.05, z, lit(leafL, lin(0x5fbf3a), leafD), 1, 0.25, 0.5, 5, 2));
    parts.push(sph(0.11, x - 0.06, p.y + 0.06, z + 0.03, lit(leafL, lin(0x5fbf3a), leafD), 0.5, 0.25, 1, 5, 2));
    // 2–3 hängende Glocken am gebogenen Kopf
    const c = lin(hex(BELL[rnd.pick(cols)] ?? rnd.pick(cols), 0x5a7dff));
    const cl = mixc(c, [1, 1, 1], 0.45, [0, 0, 0]), cd = mixc(c, [0, 0, 0], 0.35, [0, 0, 0]);
    const nb = rnd.int(2, 3);
    const topX = x + Math.sin(lean * 0.3) * -h * 0.5;
    for (let k = 0; k < nb; k++) {
      const a = rnd.real(0, Math.PI * 2);
      const bx = topX + Math.cos(a) * 0.07, bz = z + Math.sin(a) * 0.07, by = p.y + h - 0.04 - k * 0.09;
      // Glocke: Kegelstumpf (oben schmal, unten weit) mit offener Unterseite
      parts.push(cyl(0.025, 0.065, 0.11, bx, by, bz, 6, vgrad(cd, cl, by - 0.06, by + 0.06), { open: true }));
    }
  }
}

function mushrooms(it, parts, glow, rnd) {
  const p = v3(it.pos);
  const s = it.size ?? 1;
  const n = it.n ?? rnd.int(3, 4);
  const [cTop, cDark] = (CAP[it.color ?? 'red'] ?? CAP.red).map((c) => lin(c));
  const stemL = lin(0xfff6e2), stemD = lin(0xe2cfa8), dot = lin(0xffffff), gill = lin(0xe8cf98);
  const spots = [[0, 0, 1], [0.32, 0.18, 0.72], [-0.3, -0.22, 0.6], [0.05, 0.36, 0.5], [-0.2, 0.3, 0.42]];
  for (let i = 0; i < n; i++) {
    const [ox, oz, k] = spots[i % spots.length];
    const sc = s * k * rnd.real(0.85, 1.1);
    const x = p.x + ox * s, z = p.z + oz * s;
    const sh = 0.42 * sc, sr = 0.1 * sc, cr = 0.3 * sc;
    parts.push(cyl(sr * 0.85, sr * 1.15, sh, x, p.y + sh / 2, z, 6, vgrad(stemD, stemL, p.y, p.y + sh), { open: true }));
    const capY = p.y + sh - 0.04 * sc;
    const capFn = (pp, nn, o) => mixc(cDark, cTop, smooth(-0.2, 0.7, nn.y), o);
    (glow ? parts.glow : parts).push(sph(cr, x, capY, z, capFn, 1, 0.62, 1, 10, 4, { half: true }));
    // Unterseite (Lamellen) und Tupfen
    const under = new THREE.CircleGeometry(cr * 0.98, 10);
    under.rotateX(Math.PI / 2);
    under.translate(x, capY, z);
    parts.push(colorize(under, (pp, nn, o) => { o[0] = gill[0]; o[1] = gill[1]; o[2] = gill[2]; }));
    if (!glow || it.dots) {
      for (let k2 = 0; k2 < 3; k2++) {
        const a = (k2 / 3) * Math.PI * 2 + rnd.real(0, 1);
        const dx = Math.cos(a) * cr * 0.55, dz = Math.sin(a) * cr * 0.55;
        parts.push(sph(cr * 0.17, x + dx, capY + cr * 0.52, z + dz, (pp, nn, o) => { o[0] = dot[0]; o[1] = dot[1]; o[2] = dot[2]; }, 1, 0.45, 1, 5, 2));
      }
      parts.push(sph(cr * 0.18, x, capY + cr * 0.6, z, (pp, nn, o) => { o[0] = dot[0]; o[1] = dot[1]; o[2] = dot[2]; }, 1, 0.4, 1, 5, 2));
    }
  }
}

/** Gänseblümchen-Wiese: viele kleine, sparsame Blüten (je ≈ 12 Dreiecke). */
function daisies(it, parts, rnd) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [2, 2];
  const n = it.n ?? 20;
  const cols = it.colors ?? ['white', 'white', 'yellow', 'pink'];
  const stem = lin(0x3f9a2a);
  const PET = { white: 0xffffff, yellow: 0xffd43a, pink: 0xff9ad0, red: 0xff5a4a, blue: 0x7aa8ff, violet: 0xb07aff };
  const MID = { white: 0xffc21a, yellow: 0xd9781a, pink: 0xffe27a, red: 0xffd23a, blue: 0xfff2a0, violet: 0xffe27a };
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const h = rnd.real(0.12, 0.26);
    parts.push(cyl(0.014, 0.014, h, x, p.y + h / 2, z, 3, (pp, nn, o) => { o[0] = stem[0]; o[1] = stem[1]; o[2] = stem[2]; }, { open: true }));
    const c = rnd.pick(cols);
    const pc = lin(PET[c] ?? 0xffffff), mc = lin(MID[c] ?? 0xffc21a);
    const r = rnd.real(0.07, 0.11);
    const head = new THREE.CircleGeometry(r, 6);
    head.rotateX(-Math.PI / 2 + 0.35);
    head.rotateY(rnd.real(0, Math.PI * 2) * 0.2);
    head.translate(x, p.y + h + 0.01, z);
    parts.push(colorize(head, (pp, nn, o) => mixc(mc, pc, smooth(0.15, 0.6, Math.hypot(pp.x - x, pp.z - z, pp.y - p.y - h - 0.01) / r), o)));
  }
}

function sign(it, parts) {
  const p = v3(it.pos);
  const s = it.size ?? 1;
  const local = [];
  const wood = 0xc98a52, woodD = 0x8a5a32, board = 0xf2d29a;
  local.push(box(0.14 * s, 1.25 * s, 0.14 * s, 0, 0.62 * s, 0, woodD, { r: 0.04, seg: 1 }));
  local.push(box(1.1 * s, 0.66 * s, 0.1 * s, 0, 1.15 * s, 0.03 * s, wood, { r: 0.05, seg: 1 }));
  local.push(box(0.96 * s, 0.52 * s, 0.04 * s, 0, 1.15 * s, 0.09 * s, board, { r: 0.03, seg: 1, topColor: board }));
  const arrow = it.arrow === undefined ? 'up' : it.arrow;
  if (arrow) {
    const ac = hex(it.color ?? 0xff4a3d, 0xff4a3d);
    const ang = { up: Math.PI / 2, right: 0, left: Math.PI, down: -Math.PI / 2 }[arrow] ?? Math.PI / 2;
    const shaft = box(0.42 * s, 0.11 * s, 0.03 * s, -0.08 * s, 0, 0, ac, { r: 0, seg: 0 });
    const head = new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.03 * s, 3);
    head.rotateX(Math.PI / 2);
    head.rotateZ(-Math.PI / 2);
    head.translate(0.17 * s, 0, 0);
    const hc = lin(ac);
    const headC = colorize(head, (pp, nn, o) => { o[0] = hc[0]; o[1] = hc[1]; o[2] = hc[2]; });
    const g = merge([shaft, headC]);
    g.rotateZ(ang);
    g.translate(0, 1.15 * s, 0.12 * s);
    local.push(g);
  }
  // kleines Grasbüschel am Pfosten
  const gl = lin(0x7be04f), gd = lin(0x3f9a2a);
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7;
    local.push(cyl(0, 0.035, 0.26, Math.cos(a) * 0.12, 0.13, Math.sin(a) * 0.12, 3, vgrad(gd, gl, 0, 0.26), { rz: Math.cos(a) * 0.3, rx: Math.sin(a) * 0.3 }));
  }
  parts.push(placeLocal(merge(local), p, it.yaw ?? 0));
}

function reeds(it, parts, rnd) {
  const p = v3(it.pos);
  const n = it.n ?? 7;
  const H = it.size ?? 1.3;
  const R = it.r ?? 0.5;
  const gD = lin(0x2f7d2a), gL = lin(0x9ad86a), cat = lin(0x7a4a26), catL = lin(0xa86a3a);
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, Math.PI * 2), r = rnd.real(0, R);
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const h = H * rnd.real(0.6, 1.1);
    const tx = rnd.real(-0.16, 0.16), tz = rnd.real(-0.16, 0.16);
    parts.push(cyl(0.006, 0.035, h, x, p.y + h / 2, z, 3, vgrad(gD, gL, p.y, p.y + h), { rx: tz, rz: -tx }));
    if (i % 3 === 0) {
      const cy = p.y + h * 0.82;
      parts.push(cyl(0.045, 0.045, 0.24, x - tx * h * 0.32, cy, z + tz * h * 0.32, 6, vgrad(cat, catL, cy - 0.12, cy + 0.12), { rx: tz, rz: -tx }));
    }
  }
}

function lilypads(it, parts, rnd) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [3, 3];
  const n = it.n ?? 5;
  const L = lin(0x8ee06a), M = lin(0x4fbf3a), D = lin(0x2f7d2a);
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const r = rnd.real(0.3, 0.55);
    const g = new THREE.CylinderGeometry(r, r, 0.03, 14, 1, false, 0.35, Math.PI * 2 - 0.7);
    g.rotateY(rnd.real(0, Math.PI * 2));
    g.translate(x, p.y + 0.02, z);
    parts.push(colorize(g, (pp, nn, o) => mixc(D, mixc(M, L, Math.hypot(pp.x - x, pp.z - z) / r, o), nn.y > 0.5 ? 0 : 0.6, o)));
    if (i % 2 === 0) {
      // Seerose: Blütenblätter als kleine Kegel, gelbe Mitte
      const pc = lin(rnd.pick([0xff9ad5, 0xffffff, 0xffc0e0])), pw = lin(0xffffff);
      const fx = x + rnd.real(-0.1, 0.1), fz = z + rnd.real(-0.1, 0.1);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        parts.push(sph(0.08, fx + Math.cos(a) * 0.08, p.y + 0.09, fz + Math.sin(a) * 0.08, (pp, nn, o) => mixc(pc, pw, smooth(0, 1, nn.y), o), 1, 0.55, 0.5, 5, 3, { rz: 0 }));
      }
      parts.push(sph(0.05, fx, p.y + 0.12, fz, (pp, nn, o) => { o[0] = 1; o[1] = 0.75; o[2] = 0.1; }, 1, 0.7, 1, 5, 3));
    }
  }
}

function arch(level, it, parts, rnd) {
  const p = v3(it.pos);
  const W = it.width ?? 2.6, H = it.height ?? 2.8;
  const local = [];
  const white = 0xf6f4ef;
  for (const sx of [-1, 1]) local.push(box(0.16, H - 0.4, 0.16, sx * W / 2, (H - 0.4) / 2, 0, white, { r: 0.05, seg: 1 }));
  // Bogen aus kurzen Latten
  const R = W / 2, cy = H - 0.4;
  const N = 9;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI, a1 = ((k + 1) / N) * Math.PI, am = (a0 + a1) / 2;
    const len = 2 * R * Math.sin((a1 - a0) / 2) + 0.04;
    const g = box(len, 0.12, 0.16, 0, 0, 0, white, { r: 0.03, seg: 1 });
    g.rotateZ(am - Math.PI / 2 + Math.PI);
    g.translate(Math.cos(am) * R, cy + Math.sin(am) * R * 0.55, 0);
    local.push(g);
  }
  // Rosen und Blätter am Bogen und an den Pfosten
  const leafL = lin(0x8ee06a), leafM = lin(0x4fbf3a), leafD = lin(0x2f7d2a);
  const roses = [0xff4a6a, 0xff8fb0, 0xffffff, 0xffd23d];
  const spots = [];
  for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI; spots.push([Math.cos(a) * R, cy + Math.sin(a) * R * 0.55]); }
  for (const sx of [-1, 1]) for (let y = 0.6; y < cy; y += 0.55) spots.push([sx * W / 2, y]);
  for (const [x, y] of spots) {
    local.push(sph(0.16, x + rnd.real(-0.05, 0.05), y, rnd.real(-0.06, 0.06), lit(leafL, leafM, leafD), 1, 0.8, 1, 5, 3));
    if (rnd.chance(0.6)) {
      const rc = lin(rnd.pick(roses));
      local.push(sph(0.08, x + rnd.real(-0.08, 0.08), y + 0.05, rnd.frac() < 0.5 ? 0.12 : -0.12, (pp, nn, o) => mixc(mixc(rc, [0, 0, 0], 0.3, o), rc, smooth(-0.5, 0.8, nn.y), o), 1, 1, 1, 5, 3));
    }
  }
  const g = merge(local);
  const yaw = it.yaw ?? 0;
  parts.push(placeLocal(g, p, yaw));
  if (it.solid !== false) {
    for (const sx of [-1, 1]) {
      const ox = Math.cos(yaw) * sx * W / 2, oz = -Math.sin(yaw) * sx * W / 2;
      level.world.add({ type: 'cyl', x: p.x + ox, z: p.z + oz, r: 0.12, y0: p.y, y1: p.y + H - 0.4, tag: 'arch' });
    }
  }
}

function stump(level, it, parts) {
  const p = v3(it.pos);
  const r = it.size ?? 0.5, h = r * 0.9;
  const bark = lin(0x6a4428), barkL = lin(0x8a5a36), ring = lin(0xe8c48a), ringD = lin(0xb88a52);
  parts.push(cyl(r, r * 1.12, h, p.x, p.y + h / 2, p.z, 12, vgrad(bark, barkL, p.y, p.y + h), { open: true }));
  const top = new THREE.CircleGeometry(r, 12);
  top.rotateX(-Math.PI / 2);
  top.translate(p.x, p.y + h, p.z);
  parts.push(colorize(top, (pp, nn, o) => { const d = Math.hypot(pp.x - p.x, pp.z - p.z) / r; mixc(ring, ringD, (Math.floor(d * 4) & 1) * 0.6 + d * 0.3, o); }));
  for (let k = 0; k < 4; k++) {
    const a = k * (Math.PI / 2) + 0.4;
    parts.push(sph(r * 0.32, p.x + Math.cos(a) * r * 1.0, p.y + 0.06, p.z + Math.sin(a) * r * 1.0, lit(barkL, bark, bark), 1.4, 0.5, 0.8, 6, 4));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * 1.02, y0: p.y, y1: p.y + h, tag: 'stump' });
}

function tufts(it, parts, rnd) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [2, 2];
  const n = it.n ?? 8;
  const gD = lin(0x3f9a2a), gL = lin(0x9ae86a);
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const nb = rnd.int(3, 5);
    for (let k = 0; k < nb; k++) {
      const a = (k / nb) * Math.PI * 2 + rnd.real(0, 0.5);
      const h = rnd.real(0.2, 0.36);
      parts.push(cyl(0, 0.04, h, x + Math.cos(a) * 0.05, p.y + h / 2, z + Math.sin(a) * 0.05, 3, vgrad(gD, gL, p.y, p.y + h), { rz: Math.cos(a) * 0.35, rx: Math.sin(a) * 0.35 }));
    }
  }
}

function cloudbank(it, parts, rnd) {
  const p = v3(it.pos);
  const s = it.size ?? 3;
  const n = it.n ?? 6;
  const W = lin(0xffffff), S = lin(0xcfe2f4);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const r = s * rnd.real(0.45, 0.75) * (1 - Math.abs(t) * 0.7);
    const x = p.x + t * s * 2.4, y = p.y + rnd.real(0, 0.3) * s, z = p.z + rnd.real(-0.3, 0.3) * s;
    parts.push(sph(r, x, y, z, (pp, nn, o) => mixc(S, W, smooth(-0.5, 0.6, nn.y), o), 1, 0.72, 1, 9, 5));
  }
}

function bunting(it, parts) {
  const a = v3(it.from), b = v3(it.to);
  const sag = it.sag ?? 0.5;
  const cols = it.colors ?? FLAG_COLS;
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const n = Math.max(2, Math.round(L / 0.45));
  const at = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), z: a.z + (b.z - a.z) * t });
  const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  const cord = lin(0x8a6a4a);
  for (let i = 0; i < n; i++) {
    const p0 = at(i / n), p1 = at((i + 1) / n);
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
    const seg = new THREE.CylinderGeometry(0.012, 0.012, len, 3, 1, true);
    seg.rotateZ(Math.PI / 2);
    seg.rotateZ(Math.atan2(p1.y - p0.y, Math.hypot(p1.x - p0.x, p1.z - p0.z)));
    seg.rotateY(yaw);
    seg.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
    parts.push(colorize(seg, (pp, nn, o) => { o[0] = cord[0]; o[1] = cord[1]; o[2] = cord[2]; }));
    if (i === 0) continue;
    // Wimpel: flaches Dreieck nach unten
    const c = lin(cols[i % cols.length]);
    const tri = new THREE.BufferGeometry();
    const w = 0.17, h = 0.32;
    const v = [-w, 0, 0, w, 0, 0, 0, -h, 0, w, 0, 0, -w, 0, 0, 0, -h, 0];
    tri.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1], 3));
    tri.rotateY(yaw);
    tri.translate(p0.x, p0.y, p0.z);
    parts.push(colorize(tri, (pp, nn, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
}

function pebbles(it, parts, rnd) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const n = it.n ?? 6, r = it.size ?? 0.35;
  const L = lin(0xe8e4ec), D = lin(0xa8a2b2);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = a.x + (b.x - a.x) * t + rnd.real(-0.12, 0.12), z = a.z + (b.z - a.z) * t + rnd.real(-0.12, 0.12);
    parts.push(sph(r * rnd.real(0.8, 1.15), x, a.y + (b.y - a.y) * t, z, (pp, nn, o) => mixc(D, L, smooth(-0.2, 0.9, nn.y), o), 1, 0.22, rnd.real(0.75, 1), 9, 4, { half: true }));
  }
}

function haybale(level, it, parts) {
  const p = v3(it.pos);
  const r = it.size ?? 0.6, w = r * 1.5;
  const yaw = it.yaw ?? 0;
  const L = lin(0xffe08a), M = lin(0xe8b84a), D = lin(0xb88a2a);
  const g = new THREE.CylinderGeometry(r, r, w, 14, 1);
  g.rotateZ(Math.PI / 2);
  const local = [colorize(g, (pp, nn, o) => {
    if (Math.abs(nn.x) > 0.7) { const d = Math.hypot(pp.y, pp.z) / r; mixc(M, D, (Math.floor(d * 5) & 1) * 0.5, o); }
    else mixc(D, L, smooth(-0.6, 0.9, nn.y), o);
  })];
  for (const sx of [-0.25, 0.25]) {
    const band = new THREE.TorusGeometry(r + 0.01, 0.025, 4, 16);
    band.rotateY(Math.PI / 2);
    band.translate(sx * w, 0, 0);
    local.push(colorize(band, (pp, nn, o) => { o[0] = 0.5; o[1] = 0.12; o[2] = 0.08; }));
  }
  const m = merge(local);
  m.translate(0, r, 0);
  parts.push(placeLocal(m, p, yaw));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: Math.max(r, w / 2) * 0.9, y0: p.y, y1: p.y + r * 1.9, tag: 'haybale' });
}

function picnic(it, parts) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [1.6, 1.2];
  const local = [];
  const red = lin(0xff4a3d), white = lin(0xfff6ee);
  const cloth = new THREE.PlaneGeometry(w, d, 6, 5);
  cloth.rotateX(-Math.PI / 2);
  cloth.translate(0, 0.02, 0);
  const c2 = colorize(cloth.toNonIndexed(), (pp, nn, o) => {
    const ix = Math.floor((pp.x + w / 2) / (w / 6) + 1e-3), iz = Math.floor((pp.z + d / 2) / (d / 5) + 1e-3);
    mixc(red, white, ((ix + iz) & 1) * 1, o);
  });
  local.push(c2);
  // Korb mit Henkel, Äpfel
  local.push(box(0.5, 0.3, 0.34, w * 0.18, 0.17, -d * 0.1, 0xc98a52, { r: 0.05, seg: 1 }));
  const handle = new THREE.TorusGeometry(0.2, 0.025, 4, 10, Math.PI);
  handle.translate(w * 0.18, 0.32, -d * 0.1);
  local.push(colorize(handle, (pp, nn, o) => { o[0] = 0.45; o[1] = 0.25; o[2] = 0.1; }));
  const ap = lin(0xe8322a), apL = lin(0xff8a6a);
  for (const [x, z] of [[-0.3, 0.2], [-0.15, 0.3], [-0.42, 0.05]]) local.push(sph(0.08, x, 0.1, z, (pp, nn, o) => mixc(ap, apL, smooth(0, 1, nn.y), o), 1, 1, 1, 6, 4));
  parts.push(placeLocal(merge(local), p, it.yaw ?? 0));
}

/**
 * Rasenmuster: helle (oder dunkle) Felder im Schachbrett über einer Grasdecke (pos = Mitte der Oberseite).
 * Felder an ganzen Vielfachen von cell ausgerichtet, damit benachbarte Flächen dasselbe Muster zeigen.
 */
function checker(it, parts) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [8, 8];
  const cell = it.cell ?? 2;
  const c = lin(hex(it.color ?? 0x8ee85e));
  const inset = it.inset ?? 0.25;
  const x0 = p.x - w / 2 + inset, x1 = p.x + w / 2 - inset, z0 = p.z - d / 2 + inset, z1 = p.z + d / 2 - inset;
  const y = p.y + 0.012;
  const pos = [], nor = [], col = [];
  for (let gx = Math.floor(x0 / cell) * cell; gx < x1; gx += cell) {
    for (let gz = Math.floor(z0 / cell) * cell; gz < z1; gz += cell) {
      if (((Math.round(gx / cell) + Math.round(gz / cell)) & 1) === 0) continue;
      const ax = Math.max(x0, gx), bx = Math.min(x1, gx + cell), az = Math.max(z0, gz), bz = Math.min(z1, gz + cell);
      if (bx - ax < 0.05 || bz - az < 0.05) continue;
      pos.push(ax, y, az, ax, y, bz, bx, y, bz, ax, y, az, bx, y, bz, bx, y, az);
      for (let k = 0; k < 6; k++) { nor.push(0, 1, 0); col.push(c[0], c[1], c[2]); }
    }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  parts.push(g);
}

// ------------------------------------------------------------------ Höhle

function stalactites(it, parts, rnd, up) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [3, 1];
  const n = it.n ?? (up ? 5 : 6);
  const [lmin, lmax] = it.len ?? (up ? [0.6, 2.2] : [0.8, 2.8]);
  const base = lin(hex(it.color ?? 0x6a5068)), tip = lin(hex(it.tip ?? 0xc8b4d0)), dark = lin(0x2a1e2a);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const len = rnd.real(lmin, lmax);
    const r = len * rnd.real(0.16, 0.24);
    const y = up ? p.y + len / 2 - 0.05 : p.y - len / 2 + 0.05;
    const y0 = up ? p.y : p.y, y1 = up ? p.y + len : p.y - len;
    const g = cyl(up ? 0.02 : r, up ? r : 0.02, len, x, y, z, 7, (pp, nn, o) => {
      const t = smooth(y0, y1, pp.y) * (up ? 1 : 1);
      mixc(mixc(dark, base, smooth(-0.8, 0.4, nn.x * -0.6 + nn.z * 0.8), o), tip, t * 0.85, o);
    });
    parts.push(g);
    out.push({ x, z, r, len });
  }
  return out;
}

function crystals(it, parts, rnd) {
  const p = v3(it.pos);
  const s = it.size ?? 1;
  const n = it.n ?? 5;
  const [L, M, D] = (CRYSTAL[it.color ?? 'cyan'] ?? CRYSTAL.cyan).map((c) => lin(c));
  for (let i = 0; i < n; i++) {
    const h = s * rnd.real(0.5, 1.2) * (i === 0 ? 1.35 : 1);
    const r = s * rnd.real(0.1, 0.18) * (i === 0 ? 1.3 : 1);
    const a = rnd.real(0, Math.PI * 2), off = i === 0 ? 0 : s * rnd.real(0.15, 0.4);
    const tilt = i === 0 ? 0 : rnd.real(0.2, 0.55);
    const local = [];
    local.push(cyl(r, r * 0.85, h * 0.75, 0, h * 0.375, 0, 6, (pp, nn, o) => mixc(D, M, smooth(-0.6, 0.8, nn.x * 0.6 + nn.z * 0.8) * 0.8 + smooth(0, h, pp.y) * 0.2, o)));
    local.push(cyl(0, r, h * 0.3, 0, h * 0.75 + h * 0.15, 0, 6, (pp, nn, o) => mixc(M, L, smooth(h * 0.75, h * 1.05, pp.y), o)));
    const g = merge(local);
    g.rotateZ(Math.cos(a) * tilt);
    g.rotateX(Math.sin(a) * tilt);
    g.translate(p.x + Math.cos(a) * off, p.y - 0.05, p.z + Math.sin(a) * off);
    parts.glow.push(g);
  }
}

/**
 * Lichtöffnung (Höhlenausgang ins Tageslicht): leuchtender Bogen (Halbellipse) auf einer Wand, innen fast weiß,
 * zum Rand warm; davor schwebende Lichtstreifen. pos = Mitte unten (auf der Wandfläche), size [w, h], yaw.
 */
function opening(it, parts) {
  const p = v3(it.pos);
  const [w, h] = it.size ?? [6, 5];
  const local = [];
  const inner = lin(0xfffbe8), mid = lin(0xffe7a0), rim = lin(0xffb84a);
  const g = new THREE.CircleGeometry(1, 24, 0, Math.PI);
  g.scale(w / 2, h, 1);
  local.push(colorize(g, (pp, nn, o) => { const d = Math.hypot(pp.x / (w / 2), pp.y / h); if (d < 0.6) mixc(inner, mid, d / 0.6, o); else mixc(mid, rim, (d - 0.6) / 0.4, o); }));
  // Rahmen aus Licht-Strahlen (schmale Keile, die nach unten auslaufen)
  for (let k = 0; k < 5; k++) {
    const x = (-0.6 + k * 0.3) * w / 2;
    const ray = new THREE.PlaneGeometry(0.22 * w / 6, h * 1.1);
    ray.translate(x, h * 0.55, 0.06 + k * 0.01);
    local.push(colorize(ray, (pp, nn, o) => mixc(rim, inner, smooth(0, h, pp.y) * 0.8, o)));
  }
  const m = merge(local);
  if (it.yaw) m.rotateY(it.yaw);
  m.translate(p.x, p.y, p.z);
  parts.glow.push(m);
}

/** Deterministisches Rauschen je Weltpunkt (gleiche Ecke = gleiche Verschiebung → keine Risse). */
function noise3(x, y, z) {
  const xi = Math.round(x * 100), yi = Math.round(y * 100), zi = Math.round(z * 100);
  let h = (Math.imul(xi, 73856093) ^ Math.imul(yi, 19349663) ^ Math.imul(zi, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296 - 0.5;
}

function rockwall(level, it, parts) {
  const p = v3(it.pos);
  const [w, h, d] = it.size ?? [4, 6, 2];
  const sx = Math.max(1, Math.round(w / 1.4)), sy = Math.max(1, Math.round(h / 1.4)), sz = Math.max(1, Math.round(d / 1.4));
  const g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  const P = g.attributes.position;
  const amp = it.amp ?? 0.28;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    // nur nach außen verschieben (Kollision bleibt die Box), Unterkante bleibt auf dem Boden
    const wx = x + p.x, wy = y + p.y + h / 2, wz = z + p.z;
    const k = noise3(wx, wy, wz);
    const onBottom = y < -h / 2 + 1e-3;
    const ex = Math.abs(Math.abs(x) - w / 2) < 1e-3 ? Math.sign(x) : 0;
    const ez = Math.abs(Math.abs(z) - d / 2) < 1e-3 ? Math.sign(z) : 0;
    const ey = Math.abs(y - h / 2) < 1e-3 ? 1 : 0;
    const m = amp * (0.55 + k);
    P.setXYZ(i, x + ex * m, y + (onBottom ? 0 : ey * m * 0.6 + k * amp * 0.5), z + ez * m);
  }
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  ng.translate(p.x, p.y + h / 2, p.z);
  const base = lin(hex(it.color ?? 0x5a4458)), light = mixc(base, lin(0xc8b0c8), 0.35, [0, 0, 0]), dark = mixc(base, [0, 0, 0], 0.55, [0, 0, 0]);
  const moss = lin(0x6e9a52), mossL = lin(0x9ac86e);
  const y0 = p.y, y1 = p.y + h;
  parts.push(colorize(ng, (pp, nn, o) => {
    const band = (Math.floor((pp.y - y0) / 0.7) & 1) * 0.12;
    mixc(dark, light, smooth(-0.7, 0.9, nn.y * 0.6 + nn.z * 0.5 - nn.x * 0.2) - band, o);
    if (it.top && nn.y > 0.55 && pp.y > y1 - 0.6) mixc(moss, mossL, smooth(0.55, 1, nn.y), o);
  }));
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - w / 2, p.y, p.z - d / 2], max: [p.x + w / 2, p.y + h, p.z + d / 2], camIgnore: !!it.camIgnore, tag: 'rockwall' });
}

// ------------------------------------------------------------------ Belebte Zier (je Eintrag ein animiertes Mesh)

/**
 * Schmetterlinge: n Falter flattern auf Ellipsen um pos (Radius r, Höhe h über pos). Ein Mesh, Flügel je Bild neu.
 * Glühwürmchen: n leuchtende Punkte schweben langsam in einem Kasten size [w, h, d] um pos und pulsieren.
 */
let GLOW_TEX = null;
/** Weicher, runder Leuchtpunkt (Canvas-Textur, einmal je Seite). */
function glowTexture() {
  if (GLOW_TEX) return GLOW_TEX;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  GLOW_TEX = new THREE.CanvasTexture(cv);
  GLOW_TEX.colorSpace = THREE.SRGBColorSpace;
  return GLOW_TEX;
}

function critters(level, it, fireflies) {
  if (!level.view) return;
  const p = v3(it.pos);
  const n = it.n ?? (fireflies ? 10 : 4);
  const rnd = new Rnd(((p.x * 73856093) ^ (p.z * 19349663) ^ n) >>> 0);
  const per = fireflies ? 1 : 12;           // Falter: 4 Dreiecke; Glühwürmchen: ein Leuchtpunkt
  const pos = new Float32Array(n * per * 3), col = new Float32Array(n * per * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pal = fireflies ? (it.colors ?? [0xfff27a, 0xd8ff7a, 0xffd25a]) : (it.colors ?? [0xffd23d, 0xffffff, 0x8fd0ff, 0xff9a2e, 0xff8fd0]);
  let obj;
  if (fireflies) {
    const mat = new THREE.PointsMaterial({ size: it.dot ?? 0.55, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    obj = new THREE.Points(geo, mat);
  } else {
    obj = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  }
  obj.frustumCulled = false;
  obj.renderOrder = fireflies ? 2 : 0;
  const R = it.r ?? 2.5, H = it.h ?? 1.2;
  const [bw, bh, bd] = it.size ?? [6, 3, 6];
  const bugs = [];
  for (let i = 0; i < n; i++) {
    const c = lin(rnd.pick(pal));
    bugs.push({ c, ph: rnd.real(0, 6.28), w: rnd.real(0.35, 0.7) * (rnd.chance(0.5) ? 1 : -1), r: R * rnd.real(0.5, 1), h: H + rnd.real(-0.3, 0.6),
      ox: rnd.real(-bw / 2, bw / 2), oy: rnd.real(0.3, bh), oz: rnd.real(-bd / 2, bd / 2), fq: rnd.real(0.7, 1.4) });
    for (let k = 0; k < per; k++) { col[(i * per + k) * 3] = c[0]; col[(i * per + k) * 3 + 1] = c[1]; col[(i * per + k) * 3 + 2] = c[2]; }
  }
  let t = rnd.real(0, 10);
  const put = (o, x, y, z) => { pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; };
  const update = (dt) => {
    t += Math.min(dt, 0.05);
    for (let i = 0; i < n; i++) {
      const b = bugs[i], o = i * per * 3;
      if (fireflies) {
        put(o, p.x + b.ox + Math.sin(t * 0.37 * b.fq + b.ph) * 0.9, p.y + b.oy + Math.sin(t * 0.53 * b.fq + b.ph * 2) * 0.45, p.z + b.oz + Math.cos(t * 0.31 * b.fq + b.ph) * 0.9);
        const k = 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.7 * b.fq + b.ph));
        col[o] = b.c[0] * k; col[o + 1] = b.c[1] * k; col[o + 2] = b.c[2] * k;
      } else {
        const a = t * b.w + b.ph;
        const cx = p.x + Math.cos(a) * b.r, cz = p.z + Math.sin(a) * b.r * 0.7, cy = p.y + b.h + Math.sin(t * 2.3 + b.ph) * 0.25;
        // Flugrichtung (Ableitung der Ellipse), Seite, Flügelschlag
        let fx = -Math.sin(a) * b.w, fz = Math.cos(a) * b.w * 0.7;
        const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        const sx = -fz, sz = fx;
        const flap = Math.sin(t * 16 * b.fq + b.ph) * 0.95;
        const L = 0.07, W = 0.15;
        for (let side = 0; side < 2; side++) {
          const sg = side ? -1 : 1;
          const ux = sx * Math.cos(flap) * sg, uy = Math.sin(flap) + 0.15, uz = sz * Math.cos(flap) * sg;
          const q = o + side * 18;
          const b0 = [cx - fx * L, cy, cz - fz * L], b1 = [cx + fx * L, cy, cz + fz * L];
          const t0 = [b0[0] + ux * W, b0[1] + uy * W, b0[2] + uz * W], t1 = [b1[0] + ux * W * 1.15, b1[1] + uy * W * 1.15, b1[2] + uz * W * 1.15];
          put(q, ...b0); put(q + 3, ...b1); put(q + 6, ...t1);
          put(q + 9, ...b0); put(q + 12, ...t1); put(q + 15, ...t0);
        }
      }
    }
    geo.attributes.position.needsUpdate = true;
    if (fireflies) geo.attributes.color.needsUpdate = true;
  };
  update(0);
  addObject(level, obj, update);
}

// ------------------------------------------------------------------ Aufbau

export function buildDecoW1(level, spec) {
  const items = spec.items ?? [spec];
  const rnd = new Rnd((level.rnd.int(0, 1e9) ^ (items.length * 7919)) >>> 0);
  for (const it of items) {
    const parts = [];
    parts.glow = [];
    switch (it.kind) {
      case 'bellflowers': bellflowers(it, parts, rnd); break;
      case 'mushrooms': mushrooms(it, parts, !!it.glow, rnd); break;
      case 'daisies': daisies(it, parts, rnd); break;
      case 'checker': checker(it, parts); break;
      case 'opening': opening(it, parts); break;
      case 'butterflies': critters(level, it, false); break;
      case 'fireflies': critters(level, it, true); break;
      case 'sign': sign(it, parts); break;
      case 'reeds': reeds(it, parts, rnd); break;
      case 'lilypads': lilypads(it, parts, rnd); break;
      case 'arch': arch(level, it, parts, rnd); break;
      case 'stump': stump(level, it, parts); break;
      case 'tufts': tufts(it, parts, rnd); break;
      case 'cloudbank': cloudbank(it, parts, rnd); break;
      case 'bunting': bunting(it, parts); break;
      case 'stalactites': stalactites(it, parts, rnd, false); break;
      case 'stalagmites': {
        const cones = stalactites(it, parts, rnd, true);
        if (it.solid) for (const c of cones) if (c.len > 1.2) level.world.add({ type: 'cyl', x: c.x, z: c.z, r: c.r * 0.7, y0: v3(it.pos).y, y1: v3(it.pos).y + c.len * 0.6, tag: 'stalagmite' });
        break;
      }
      case 'crystals': crystals(it, parts, rnd); break;
      case 'rockwall': rockwall(level, it, parts); break;
      case 'pebbles': pebbles(it, parts, rnd); break;
      case 'haybale': haybale(level, it, parts); break;
      case 'picnic': picnic(it, parts); break;
      default: console.warn(`[deco_w1] unbekannte Art: ${it.kind}`);
    }
    const shadowless = it.kind === 'bellflowers' || it.kind === 'tufts' || it.kind === 'lilypads' || it.kind === 'pebbles' || it.kind === 'picnic' || it.kind === 'daisies' || it.kind === 'cloudbank' || it.kind === 'checker';
    if (parts.length) addStatic(level, merge(parts), { castShadow: !shadowless && it.castShadow !== false });
    if (parts.glow.length) addStatic(level, merge(parts.glow), { material: 'glow', castShadow: false });
  }
}

export const TYPES = { deco_w1: buildDecoW1 };
