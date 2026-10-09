// Baustein `deco_w1b`: Zier und Sonderbauten für die Level 1-3 (Klötzchenberg) und 1-5 (Zirkuszelt).
// Ohne Kollision, außer wo „Kollision“ steht. Alles statisch und verschmolzen (view.addStatic); nur die
// Scheinwerferkegel einer Liste bilden ein gemeinsames additives Objekt (1 Zeichenaufruf).
//
// Einzeln: { type: 'deco_w1b', kind, … }   oder Liste: { type: 'deco_w1b', items: [{ kind, … }, …] }
// pos = Fußpunkt bzw. Mitte der Unterseite, wenn nicht anders genannt.
//
// Berg (1-3)
//   pixelblock  Bunter Riesenblock im 8-Bit-Stil – Kollision box. size [w, h, d] (Standard [2, 2, 2]),
//               color ('red'|'blue'|'yellow'|'green'|…), motif 'none'|'face'|'star'|'heart' (Pixelbild auf der
//               Vorderseite +Z), oneWay (Standard false), studs (Pixel-Raster auf den Flächen, Standard true)
//   bigtree     Großer Baum mit flacher, begehbarer Krone – Kollision: Stamm (cyl) und Kronenscheibe (cyl).
//               size = Höhe der Kronen-Oberseite (Standard 7), r = Kronenradius (Standard 2.4), color 'green'|'autumn'
//   mountain    Berg-Kulisse: size [Radius, Höhe], color (Wiesengrün), snow (Schneekappe, Standard true)
//   cloudpuff   Zierwolke (pos = Mitte), size (Radius, Standard 2)
//   cloudplat   Wolkenplattform (sparsame Geometrie) – Kollision box, Einweg (oneWay Standard true): size [w, h, d]
//   sign        Wegweiser mit Pfeil; yaw (Pfeilrichtung, Standard Math.PI / 2 = nach −Z)
//   tufts       Grasbüschel: size [w, d], n (Standard 8)
//   mushroom    Zierpilz: size (Höhe, Standard 1.2), color (Hut, Standard 'red')
//   flag        Fähnchen am Mast: size (Masthöhe, Standard 2.4), color
//   rockpile    Felsbrocken-Haufen: size (Radius, Standard 1.2)
//   path        Trittsteine: from, to (Bodenhöhe), n (Standard nach Länge), size (Steinradius, Standard 0.42)
//   waterfall   Wasserfall an einer Felswand: pos (Fuß, Mitte), size [Breite, Höhe], yaw (0 = fällt zur Kamera +Z),
//               pool (Becken-Radius am Fuß, Standard 1.6)
//   cairn       Steinmännchen (Gipfel): size (Höhe, Standard 1.1)
//   slopegrass  Grasraster (1 m, Schachbrett) und Büschel/Blumen auf einer Rampe: pos, size, axis, dir, low wie
//               Baustein ramp; n (Büschel), keep [x, Halbbreite] (Laufbahn ohne Büschel)
//   pixelblock mit backdrop: true – schwebender Kulissenblock ohne Kollision
// Zirkus (1-5)
//   tent        Zeltinneres als Kulisse: from [x0, z0], to [x1, z1] (Grundriss der Zeltwand), y0 (Fuß der Wand =
//               Boden), y1 (Traufhöhe), peak (Firsthöhe), rings [[x, z, r], …] (Manegen), poles [[x, z], …]
//               (Masten), stands (Zuschauerränge an den Längsseiten, Standard true)
//   stage       Schwebende Zirkusplattform – Kollision box bzw. cyl (round). size [w, h, d] (round: w = Durchmesser),
//               color (Decke, Standard 'blue'), skirt [Farbe1, Farbe2] (Streifen der Seiten, Standard rot/weiß),
//               bulbs (Lichterkante, Standard true), star (Goldstern auf der Decke, Standard false), oneWay
//               inlay (Zierrahmen auf der Decke, Standard ab 5 × 5 m), camIgnore, noCollision
//   ride        Bühnen-Verkleidung einer bewegten Plattform (Baustein mover, muss vorher stehen): at [x, y, z] =
//               erster Pfadpunkt (Mitte Unterseite); color, skirt, star, bulbs wie stage. Folgt der Plattform je Bild.
//   drum        Zirkus-Podest (Trommel) – Kollision cyl. size [Durchmesser, Höhe], color
//   ball        Gestreifter Zirkusball: size (Radius, Standard 0.8), solid (Kollision cyl, Standard false)
//   bunting     Wimpelkette: from, to (Aufhängepunkte), sag (Durchhang, Standard 0.8), n (Wimpel)
//   bulbs       Lichterkette: from, to, n, sag
//   spotlight   Scheinwerfer: pos (Lampe), target [x, y, z] (Lichtfleck), r (Radius am Ziel, Standard 2.2), color
//   pole        Zeltmast rot-weiß: size (Höhe), r (Standard 0.35), solid (Standard false)
//   balloons    Luftballon-Traube: n (Standard 5), size (Schnurlänge, Standard 1.6)
//   pennant     Zirkusfahne auf Mast (wie flag, Standard rot mit Goldspitze)
//   trapeze     Trapez am Seil: pos (Stange), size (Seillänge, Standard 4)
//   curtain     Bühnenvorhang (pos = Mitte unten, size [w, h], yaw 0 = Fläche zeigt nach +Z), color

import * as THREE from 'three';
import { v3, sz3, box, hex, lin, mixc, smooth, colorize, merge, Rnd, disc, addStatic, addObject } from '../kit.js';

const PRIMARY = { red: 0xff3b30, blue: 0x2f7bff, yellow: 0xffcc1a, green: 0x35c24a, orange: 0xff8a1a, purple: 0x9a5cff, pink: 0xff6fb5, cyan: 0x2fd0e8 };
const col = (c, d) => hex(PRIMARY[c] ?? c, d);
const tint = (c, k) => { const a = new THREE.Color(c); return a.lerp(new THREE.Color(k > 0 ? 0xffffff : 0x000000), Math.abs(k)).getHex(); };
const GOLD = 0xffc21a;

/** Gefärbte Kugel (oben hell, unten dunkel). */
function ball(r, x, y, z, light, mid, dark, sx = 1, sy = 1, sz = 1, ws = 10, hs = 7) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  const L = lin(light), M = lin(mid), D = lin(dark);
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(M, L, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o)));
}

/** Einfarbig gefärbte Geometrie. */
function solid(g, c) {
  const L = lin(hex(c));
  return colorize(g, (p, n, o) => { o[0] = L[0]; o[1] = L[1]; o[2] = L[2]; });
}

/** Zylinder zwischen zwei Punkten (Seil, Stab). */
function rod(a, b, r, c, seg = 6) {
  const A = new THREE.Vector3(a.x, a.y, a.z), B = new THREE.Vector3(b.x, b.y, b.z);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return solid(g, c);
}

/** Dreieck (beidseitig) aus drei Punkten. */
function tri(a, b, c, color) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...b], 3));
  g.computeVertexNormals();
  return solid(g, color);
}

/** Viereck aus vier Punkten (Umlauf a→b→c→d, Normale nach außen), einfarbig oder je Ecke. */
function quad(a, b, c, d, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  const cs = Array.isArray(colors) ? colors.map((k) => lin(hex(k))) : null;
  const L = cs ? null : lin(hex(colors));
  const order = [0, 1, 2, 0, 2, 3];
  const arr = new Float32Array(18);
  for (let i = 0; i < 6; i++) { const k = cs ? cs[order[i]] : L; arr[i * 3] = k[0]; arr[i * 3 + 1] = k[1]; arr[i * 3 + 2] = k[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Punkt auf einer durchhängenden Leine (Parabel). */
const sagAt = (a, b, sag, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), z: a.z + (b.z - a.z) * t });

// =============================================================================================
// Berg
// =============================================================================================

const MOTIFS = {
  star: ['..#..', '.###.', '#####', '.###.', '.#.#.'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  face: ['.....', '.#.#.', '.#.#.', '.....', '.....'],
};

function pixelblock(level, it, out) {
  const p = v3(it.pos), s = sz3(it.size, [2, 2, 2]);
  const base = col(it.color ?? 'red', 0xff3b30);
  if (!it.backdrop) level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], oneWay: !!it.oneWay, tag: 'pixelblock' });
  out.push(box(s.x, s.y, s.z, p.x, p.y + s.y / 2, p.z, base, { r: 0.12, seg: 1, topColor: tint(base, 0.12) }));
  if (it.studs !== false) {
    // Pixel-Raster: je Meterzelle ein leicht erhabenes Feld (Schachbrett hell/Grundton) – 8-Bit-Look
    const light = tint(base, 0.28), dark = tint(base, -0.12);
    const cells = (n) => Math.max(1, Math.round(n));
    const nx = cells(s.x), ny = cells(s.y), nz = cells(s.z);
    const cw = s.x / nx, ch = s.y / ny, cd = s.z / nz, t = 0.05, k = 0.8;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const c = (i + j) & 1 ? light : tint(base, 0.14);
      out.push(box(cw * k, t, cd * k, p.x - s.x / 2 + (i + 0.5) * cw, p.y + s.y + t / 2 - 0.01, p.z - s.z / 2 + (j + 0.5) * cd, c, { r: 0.03, seg: 0 }));
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const c = (i + j) & 1 ? tint(base, 0.08) : dark;
      out.push(box(cw * k, ch * k, t, p.x - s.x / 2 + (i + 0.5) * cw, p.y + (j + 0.5) * ch, p.z + s.z / 2 + t / 2 - 0.01, c, { r: 0.03, seg: 0 }));
    }
    for (const sx of [-1, 1]) for (let i = 0; i < nz; i++) for (let j = 0; j < ny; j++) {
      const c = (i + j) & 1 ? tint(base, 0.06) : dark;
      out.push(box(t, ch * k, cd * k, p.x + sx * (s.x / 2 + t / 2 - 0.01), p.y + (j + 0.5) * ch, p.z - s.z / 2 + (i + 0.5) * cd, c, { r: 0.03, seg: 0 }));
    }
  }
  const m = MOTIFS[it.motif];
  if (m) {
    // Pixelbild mittig auf der Vorderseite (+Z)
    const px = Math.min(s.x, s.y) / 7.5;
    const ink = it.motif === 'face' ? 0x1c1830 : 0xffffff;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (m[r][c] !== '#') continue;
      out.push(box(px * 0.92, px * 0.92, 0.07, p.x + (c - 2) * px, p.y + s.y / 2 + (2 - r) * px, p.z + s.z / 2 + 0.07, ink, { r: 0.02, seg: 0 }));
      if (it.motif === 'face' && r === 1) out.push(box(px * 0.35, px * 0.35, 0.04, p.x + (c - 2) * px - px * 0.18, p.y + s.y / 2 + (2 - r) * px + px * 0.2, p.z + s.z / 2 + 0.12, 0xffffff, { r: 0.01, seg: 0 }));
    }
    if (it.motif === 'face') out.push(box(px * 1.6, px * 0.4, 0.06, p.x, p.y + s.y / 2 - px * 1.3, p.z + s.z / 2 + 0.07, 0x1c1830, { r: 0.02, seg: 0 }));
  }
}

const CROWN = {
  green: [0xb6f07a, 0x5fc447, 0x2f8a2e],
  autumn: [0xffd27a, 0xf59a3a, 0xc4622a],
  pink: [0xffd0e8, 0xff8cc4, 0xd2508e],
};

function bigtree(level, it, out) {
  const p = v3(it.pos);
  const H = it.size ?? 7, R = it.r ?? 2.4;
  const pal = CROWN[it.color ?? 'green'] ?? CROWN.green;
  const crownH = 0.7;
  const trunkTop = H - crownH;
  // Stamm mit Wurzeln, leicht gebogen wirkend durch zwei Abschnitte
  const t1 = new THREE.CylinderGeometry(0.42, 0.62, trunkTop - p.y + 0.4, 10, 3, true);
  t1.translate(p.x, p.y + (trunkTop - p.y + 0.4) / 2, p.z);
  const td = lin(0x5c3a22), tl = lin(0x9a6a40);
  out.push(colorize(t1, (pp, n, o) => mixc(td, tl, smooth(-0.5, 0.9, n.x * 0.6 + n.z * 0.8), o)));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    out.push(ball(0.38, p.x + Math.cos(a) * 0.62, p.y + 0.1, p.z + Math.sin(a) * 0.62, 0x9a6a40, 0x7a4e2e, 0x4a2e1a, 1.4, 0.55, 1.4, 7, 5));
  }
  // Äste unter der Krone
  for (const [a, l] of [[0.6, 1.4], [2.4, 1.2], [4.1, 1.5]]) {
    out.push(rod({ x: p.x, y: trunkTop - 1.2, z: p.z }, { x: p.x + Math.cos(a) * l, y: trunkTop - 0.2, z: p.z + Math.sin(a) * l }, 0.16, 0x6e4628));
  }
  // Kronenscheibe: begehbare Laubdecke mit runder Kante, darunter Laubbausch
  out.push(disc(p.x, trunkTop, p.z, R, crownH, pal[0], pal[1], 24));
  const rnd = new Rnd(Math.floor(p.x * 13 + p.z * 7) >>> 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd.real(-0.2, 0.2);
    const rr = R * rnd.real(0.55, 0.85);
    out.push(ball(R * 0.42, p.x + Math.cos(a) * rr, trunkTop - 0.15, p.z + Math.sin(a) * rr, pal[1], pal[1], pal[2], 1, 0.7, 1, 8, 6));
  }
  out.push(ball(R * 0.7, p.x, trunkTop - 0.5, p.z, pal[1], pal[1], pal[2], 1, 0.6, 1, 10, 6));
  // ein paar Äpfel/Blüten am Rand
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    out.push(ball(0.13, p.x + Math.cos(a) * R * 0.98, trunkTop + 0.15, p.z + Math.sin(a) * R * 0.98, 0xff9a8a, 0xff3b30, 0xb3201a, 1, 1, 1, 6, 4));
  }
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.55, y0: p.y, y1: trunkTop, tag: 'bigtree' });
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: trunkTop, y1: H, tag: 'bigtree-krone' });
}

function mountain(it, out) {
  const p = v3(it.pos);
  const [R, H] = it.size ?? [40, 60];
  const prof = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // bauchiges Profil mit runder Kuppe
    const r = R * Math.pow(1 - t, 0.75) * (1 - 0.12 * Math.sin(t * Math.PI));
    prof.push(new THREE.Vector2(Math.max(0.001, r), H * t));
  }
  const g = new THREE.LatheGeometry(prof, 18);
  const rnd = new Rnd(Math.floor(Math.abs(p.x * 3 + p.z)) >>> 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + Math.sin(Math.atan2(z, x) * 5 + y * 0.08 + rnd.frac() * 0.2) * 0.06 * (1 - y / H);
    pos.setXYZ(i, x * k, y, z * k * 0.85);
  }
  g.computeVertexNormals();
  g.translate(p.x, p.y, p.z);
  const green = lin(col(it.color ?? 0x7fcf5a)), greenD = lin(0x4f9e48), rock = lin(0xa69aa4), snow = lin(0xfbfcff);
  const snowLine = it.snow === false ? 2 : 0.72;
  out.push(colorize(g, (pp, nn, o) => {
    const t = (pp.y - p.y) / H;
    mixc(greenD, green, smooth(-0.3, 0.8, nn.y), o);
    const r = smooth(snowLine - 0.3, snowLine - 0.1, t);
    if (r > 0) mixc(o, rock, r, o);
    const s = smooth(snowLine - 0.04, snowLine + 0.02, t + (nn.y - 0.5) * 0.05);
    if (s > 0) mixc(o, snow, s, o);
  }));
}

function cloudpuff(it, out) {
  const p = v3(it.pos);
  const r = it.size ?? 2;
  for (const [x, y, z, k] of [[0, 0, 0, 1], [-0.95, -0.15, 0.1, 0.7], [0.95, -0.12, -0.1, 0.75], [-0.35, 0.3, -0.2, 0.65], [0.45, 0.32, 0.15, 0.6]]) {
    out.push(ball(r * k, p.x + x * r, p.y + y * r * 0.7, p.z + z * r, 0xffffff, 0xf4f8ff, 0xc9d9ec, 1, 0.72, 1, 9, 6));
  }
}

/** Wolkenplattform (sparsam: wenige große Bäusche) – Kollision box, standardmäßig Einweg. */
function cloudplat(level, it, out) {
  const p = v3(it.pos), s = sz3(it.size, [3, 0.6, 3]);
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], oneWay: it.oneWay ?? true, tag: 'cloud' });
  const nx = Math.max(1, Math.round(s.x / 1.7)), nz = Math.max(1, Math.round(s.z / 1.7));
  const r = Math.min(s.x / nx, s.z / nz) * 0.78;
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const x = p.x - s.x / 2 + (i + 0.5) * (s.x / nx), z = p.z - s.z / 2 + (k + 0.5) * (s.z / nz);
    const g = new THREE.SphereGeometry(r, 9, 5);
    g.scale(1, (s.y * 0.8) / r, 1);
    g.translate(x, p.y + s.y * 0.5, z);
    const W = lin(0xffffff), S = lin(0xd6e4f2);
    out.push(colorize(g, (pp, n, o) => mixc(S, W, smooth(-0.6, 0.6, n.y), o)));
  }
  // kleine Bäusche am Rand (weicher Umriss)
  const edge = 2 * (nx + nz);
  for (let i = 0; i < edge; i++) {
    const a = (i / edge) * Math.PI * 2;
    const g = new THREE.SphereGeometry(r * 0.55, 7, 4);
    g.scale(1, 0.7, 1);
    g.translate(p.x + Math.cos(a) * (s.x / 2 - r * 0.3), p.y + s.y * 0.35, p.z + Math.sin(a) * (s.z / 2 - r * 0.3));
    const W = lin(0xffffff), S = lin(0xd6e4f2);
    out.push(colorize(g, (pp, n, o) => mixc(S, W, smooth(-0.6, 0.6, n.y), o)));
  }
}

function sign(it, out) {
  const p = v3(it.pos);
  const yaw = it.yaw ?? Math.PI / 2;
  out.push(box(0.16, 1.5, 0.16, p.x, p.y + 0.75, p.z, 0x8a5a36, { r: 0.04, seg: 1 }));
  const parts = [];
  parts.push(box(1.3, 0.45, 0.1, 0.25, 0, 0, 0xc98a4a, { r: 0.05, seg: 1 }));
  // Pfeilspitze und weißer Pfeil
  parts.push(tri([0.9, 0.28, 0], [0.9, -0.28, 0], [1.22, 0, 0], 0xc98a4a));
  parts.push(box(0.7, 0.1, 0.03, 0.15, 0, 0.065, 0xffffff, { r: 0.02, seg: 0 }));
  parts.push(tri([0.5, 0.17, 0.08], [0.5, -0.17, 0.08], [0.72, 0, 0.08], 0xffffff));
  const g = merge(parts);
  g.rotateY(yaw);
  g.translate(p.x, p.y + 1.25, p.z);
  out.push(g);
}

function tufts(it, out, rnd) {
  const p = v3(it.pos);
  const [w, d] = it.size ?? [2, 2];
  const n = it.n ?? 8;
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    for (let k = 0; k < 3; k++) {
      const a = rnd.real(0, Math.PI * 2), h = rnd.real(0.25, 0.42);
      const g = new THREE.ConeGeometry(0.06, h, 3, 1, true);
      g.rotateZ(Math.cos(a) * 0.35); g.rotateX(Math.sin(a) * 0.35);
      g.translate(x + Math.cos(a) * 0.06, p.y + h / 2, z + Math.sin(a) * 0.06);
      const a1 = lin(0x3f9a2a), a2 = lin(0x9be86a);
      out.push(colorize(g, (pp, nn, o) => mixc(a1, a2, smooth(p.y, p.y + h, pp.y), o)));
    }
  }
}

function mushroom(it, out) {
  const p = v3(it.pos);
  const h = it.size ?? 1.2;
  const c = col(it.color ?? 'red', 0xff3b30);
  const stem = new THREE.CylinderGeometry(h * 0.13, h * 0.18, h * 0.62, 8, 1, true);
  stem.translate(p.x, p.y + h * 0.31, p.z);
  out.push(solid(stem, 0xfff2d8));
  out.push(ball(h * 0.42, p.x, p.y + h * 0.62, p.z, tint(c, 0.25), c, tint(c, -0.35), 1, 0.62, 1, 12, 7));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    out.push(ball(h * 0.08, p.x + Math.cos(a) * h * 0.26, p.y + h * 0.78, p.z + Math.sin(a) * h * 0.26, 0xffffff, 0xffffff, 0xe0e0e0, 1, 0.5, 1, 6, 4));
  }
  out.push(ball(h * 0.08, p.x, p.y + h * 0.88, p.z, 0xffffff, 0xffffff, 0xe0e0e0, 1, 0.5, 1, 6, 4));
}

function flag(it, out, circus = false) {
  const p = v3(it.pos);
  const h = it.size ?? 2.4;
  const c = col(it.color ?? (circus ? 'red' : 'yellow'), 0xffcc1a);
  out.push(box(0.09, h, 0.09, p.x, p.y + h / 2, p.z, 0xf4f2ec, { r: 0.03, seg: 1 }));
  out.push(ball(0.12, p.x, p.y + h + 0.06, p.z, 0xfff3b0, GOLD, 0xb88400, 1, 1, 1, 8, 5));
  const y = p.y + h - 0.1;
  out.push(tri([p.x + 0.05, y, p.z], [p.x + 0.05, y - 0.6, p.z], [p.x + 1.0, y - 0.3, p.z + 0.08], c));
  if (circus) out.push(tri([p.x + 0.05, y - 0.15, p.z + 0.01], [p.x + 0.05, y - 0.45, p.z + 0.01], [p.x + 0.55, y - 0.3, p.z + 0.06], 0xffffff));
}

function rockpile(it, out, rnd) {
  const p = v3(it.pos);
  const r = it.size ?? 1.2;
  for (let i = 0; i < 4; i++) {
    const g = new THREE.DodecahedronGeometry(r * rnd.real(0.35, 0.6), 0);
    g.scale(1.1, 0.75, 0.95);
    g.rotateY(rnd.real(0, 3));
    g.translate(p.x + rnd.real(-r, r) * 0.6, p.y + r * 0.2, p.z + rnd.real(-r, r) * 0.5);
    const L = lin(0xd6d2da), D = lin(0x837e8c);
    out.push(colorize(g.index ? g.toNonIndexed() : g, (pp, n, o) => mixc(D, L, smooth(-0.4, 0.8, n.y), o)));
  }
}

function path(it, out, rnd) {
  const a = v3(it.from), b = v3(it.to);
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  const n = it.n ?? Math.max(2, Math.round(L / 1.1));
  const r = it.size ?? 0.42;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = a.x + (b.x - a.x) * t + rnd.real(-0.25, 0.25), z = a.z + (b.z - a.z) * t + rnd.real(-0.2, 0.2);
    const y = a.y + (b.y - a.y) * t;
    const g = new THREE.CylinderGeometry(r * rnd.real(0.8, 1.1), r * 1.08, 0.12, 9, 1);
    g.scale(1, 1, rnd.real(0.75, 1));
    g.rotateY(rnd.real(0, Math.PI));
    g.translate(x, y + 0.03, z);
    const L1 = lin(0xf2ead8), D1 = lin(0xc9bfa8);
    out.push(colorize(g, (pp, nn, o) => mixc(D1, L1, smooth(-0.2, 0.9, nn.y), o)));
  }
}

function waterfall(it, out, glow) {
  const p = v3(it.pos);
  const [w, h] = it.size ?? [2.4, 6];
  const yaw = it.yaw ?? 0;
  const parts = [];
  const ns = Math.max(3, Math.round(w / 0.4));
  const light = 0xc8f0ff, mid = 0x5ec8ff, deep = 0x2a9ae8;
  for (let i = 0; i < ns; i++) {
    const x0 = -w / 2 + (i * w) / ns, x1 = -w / 2 + ((i + 1) * w) / ns;
    const c = i % 3 === 0 ? light : i % 3 === 1 ? mid : deep;
    const bulge = 0.12 + (i % 2) * 0.08;
    parts.push(quad([x0, 0, bulge + 0.25], [x1, 0, bulge + 0.25], [x1, h, 0.04], [x0, h, 0.04], [tint(c, 0.15), tint(c, 0.15), c, c]));
  }
  // weiße Gischt-Streifen
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / 5;
    parts.push(quad([x - 0.05, 0.4, 0.42], [x + 0.05, 0.4, 0.42], [x + 0.04, h * 0.9, 0.1], [x - 0.04, h * 0.9, 0.1], 0xffffff));
  }
  const g = merge(parts);
  g.rotateY(yaw);
  g.translate(p.x, p.y, p.z);
  out.push(g);
  // Becken mit Gischt (pool: 0 → fällt ins Leere, nur Gischtwolke unten)
  const pr = it.pool ?? 1.6;
  if (pr <= 0) { cloudpuff({ pos: [p.x + Math.sin(yaw) * 0.6, p.y, p.z + Math.cos(yaw) * 0.6], size: w * 0.55 }, out); return; }
  const dx = Math.sin(yaw) * pr * 0.8, dz = Math.cos(yaw) * pr * 0.8;
  out.push(disc(p.x + dx, p.y - 0.02, p.z + dz, pr, 0.1, 0x5ec8ff, 0x3a9ae0, 20));
  const rnd = new Rnd(Math.floor(p.x * 7 + p.z * 3) >>> 0);
  for (let i = 0; i < 7; i++) {
    const a = rnd.real(0, Math.PI * 2), rr = rnd.real(0.1, 0.6) * w * 0.5;
    out.push(ball(rnd.real(0.25, 0.45), p.x + Math.sin(yaw) * 0.4 + Math.cos(a) * rr, p.y + 0.1, p.z + Math.cos(yaw) * 0.4 + Math.sin(a) * rr * 0.5, 0xffffff, 0xf2fbff, 0xcfe8f6, 1, 0.6, 1, 7, 4));
  }
  // Steinrand ums Becken
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const g2 = new THREE.DodecahedronGeometry(0.28, 0);
    g2.scale(1.2, 0.7, 1);
    g2.translate(p.x + dx + Math.cos(a) * pr, p.y + 0.12, p.z + dz + Math.sin(a) * pr);
    const L = lin(0xd6d2da), D = lin(0x837e8c);
    out.push(colorize(g2, (pp, n, o) => mixc(D, L, smooth(-0.4, 0.8, n.y), o)));
  }
  void glow;
}

/** Grasraster und Zier auf einer Rampe (gleiche Parameter wie Baustein ramp, Achse z oder x). */
function slopegrass(it, out, rnd) {
  const p = v3(it.pos), s = sz3(it.size, [4, 2, 6]);
  const axis = it.axis ?? 'z', dir = it.dir ?? -1, low = it.low ?? 0;
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const yAt = (x, z) => {
    let t = axis === 'x' ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
    if (dir < 0) t = 1 - t;
    return p.y + low + (s.y - low) * t + 0.015;
  };
  const a = 0x76e04a, b = 0x62cc3c;
  const pos = [], nor = [], colr = [];
  const N = new THREE.Vector3();
  for (let z = z0; z < z1 - 1e-3; z += 1) {
    for (let x = x0; x < x1 - 1e-3; x += 1) {
      const xa = x, xb = Math.min(x1, x + 1), za = z, zb = Math.min(z1, z + 1);
      const c = lin(((Math.floor(x) + Math.floor(z)) & 1) ? a : b);
      const k = 0.94 + rnd.frac() * 0.1;
      const P = [[xa, yAt(xa, za), za], [xa, yAt(xa, zb), zb], [xb, yAt(xb, zb), zb], [xb, yAt(xb, za), za]];
      const A = new THREE.Vector3(...P[0]), B = new THREE.Vector3(...P[1]), C = new THREE.Vector3(...P[2]);
      N.subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
      for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); nor.push(N.x, N.y, N.z); colr.push(c[0] * k, c[1] * k, c[2] * k); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  out.push(g);
  // Grasbüschel und Blumen in Hanghöhe
  for (let i = 0; i < (it.n ?? 14); i++) {
    const x = rnd.real(x0 + 0.5, x1 - 0.5), z = rnd.real(z0 + 0.5, z1 - 0.5);
    if (it.keep && Math.abs(x - it.keep[0]) < it.keep[1]) continue;   // Laufbahn frei lassen
    tufts({ pos: [x, yAt(x, z) - 0.02, z], size: [0.4, 0.4], n: 1 }, out, rnd);
    if (rnd.chance(0.45)) {
      const fc = lin(rnd.pick([0xff5a4a, 0xffd43a, 0xffffff, 0xff8ccc]));
      const fx = x + 0.35, fz = z + 0.2, fy = yAt(fx, fz);
      const st = new THREE.CylinderGeometry(0.025, 0.03, 0.32, 5, 1, true);
      st.translate(fx, fy + 0.16, fz);
      out.push(solid(st, 0x3f9a2a));
      const head = new THREE.SphereGeometry(0.1, 6, 4);
      head.scale(1, 0.55, 1);
      head.translate(fx, fy + 0.35, fz);
      out.push(colorize(head, (pp, n, o) => { o[0] = fc[0]; o[1] = fc[1]; o[2] = fc[2]; }));
    }
  }
}

function cairn(it, out) {
  const p = v3(it.pos);
  const h = it.size ?? 1.1;
  let y = p.y;
  const sizes = [0.42, 0.34, 0.27, 0.2, 0.14];
  sizes.forEach((r, i) => {
    const g = new THREE.SphereGeometry(r * (h / 1.1), 8, 5);
    g.scale(1.25, 0.6, 1.1);
    g.rotateY(i * 0.7);
    y += r * 0.6 * (h / 1.1);
    g.translate(p.x + (i % 2 ? 0.04 : -0.03), y, p.z);
    y += r * 0.55 * (h / 1.1);
    const L = lin(0xe6e2ea), D = lin(0x8f8a98);
    out.push(colorize(g, (pp, n, o) => mixc(D, L, smooth(-0.5, 0.8, n.y), o)));
  });
}

// =============================================================================================
// Zirkus
// =============================================================================================

const RED = 0xe0262a, CREAM = 0xfff4e0, NAVY = 0x1d2a6e;

/** Zeltinneres: gestreifte Wände, Dach mit Firstbahn, Manegen, Ränge, Masten, Sterne auf der Stirnwand. */
function tent(level, it, out, glow) {
  const [x0, z0] = it.from, [x1, z1] = it.to;
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const y0 = it.y0 ?? -14, y1 = it.y1 ?? 20, peak = it.peak ?? 36;
  const cx = (xa + xb) / 2;
  const stripe = 2.4;
  const rnd = new Rnd(4711);
  // Längswände (Innenseite zur Mitte), Streifen senkrecht, oben Goldborte mit Zacken (Lambrequin)
  const wall = (x, dirIn) => {
    for (let z = za; z < zb - 1e-3; z += stripe) {
      const zz = Math.min(zb, z + stripe);
      const k = Math.round((z - za) / stripe) & 1;
      const c = k ? RED : CREAM;
      const a = [x, y0, z], b = [x, y0, zz], c2 = [x, y1, zz], d = [x, y1, z];
      out.push(dirIn > 0 ? quad(a, d, c2, b, [tint(c, -0.35), tint(c, 0.02), tint(c, 0.02), tint(c, -0.35)]) : quad(a, b, c2, d, [tint(c, -0.35), tint(c, -0.35), tint(c, 0.02), tint(c, 0.02)]));
      // Zacken der Borte
      const zm = (z + zz) / 2;
      out.push(tri([x + dirIn * 0.05, y1 - 0.2, z], [x + dirIn * 0.05, y1 - 0.2, zz], [x + dirIn * 0.05, y1 - 1.4, zm], k ? GOLD : RED));
    }
    out.push(box(0.3, 0.5, zb - za, x + dirIn * 0.15, y1 - 0.15, (za + zb) / 2, GOLD, { r: 0.1, seg: 1 }));
  };
  // in 32-m-Stücke teilen (Abschnitte → Frustum-Culling): erst sammeln, dann je Stück abgeben
  wall(xa, 1); wall(xb, -1);
  // Stirnwände: dunkelblauer Sternenvorhang (Zelthimmel) mit Goldsternen, unten rote Falten
  for (const [z, dirIn] of [[za, 1], [zb, -1]]) {
    const w = xb - xa;
    const n = Math.ceil(w / stripe);
    for (let i = 0; i < n; i++) {
      const xx0 = xa + (i * w) / n, xx1 = xa + ((i + 1) * w) / n;
      const c = i & 1 ? 0x24357e : NAVY;
      const a = [xx0, y0, z], b = [xx1, y0, z], c2 = [xx1, y1 + (peak - y1) * (1 - Math.abs((xx1 - cx) / ((xb - xa) / 2))), z], d = [xx0, y1 + (peak - y1) * (1 - Math.abs((xx0 - cx) / ((xb - xa) / 2))), z];
      glow.push(dirIn > 0 ? quad(a, b, c2, d, [tint(c, -0.45), tint(c, -0.45), tint(c, -0.1), tint(c, -0.1)]) : quad(b, a, d, c2, [tint(c, -0.45), tint(c, -0.45), tint(c, -0.1), tint(c, -0.1)]));
    }
    // Sterne (leuchtend)
    for (let i = 0; i < 26; i++) {
      const sx = rnd.real(xa + 2, xb - 2), sy = rnd.real(y0 + 12, y1 + (peak - y1) * 0.6);
      starShape(glow, sx, sy, z + dirIn * 0.15, rnd.real(0.35, 0.9), dirIn, rnd.pick([0xfff2a0, 0xffffff, 0xffd84a]));
    }
  }
  // Dach (Zelthimmel): zwei Schrägen von der Traufe zum First, Streifen in Gefällerichtung, unbeleuchtet
  // (Stoff im Halbdunkel) mit leuchtenden Sternen
  for (const [x, dirIn] of [[xa, 1], [xb, -1]]) {
    for (let z = za; z < zb - 1e-3; z += stripe) {
      const zz = Math.min(zb, z + stripe);
      const k = Math.round((z - za) / stripe) & 1;
      const c = k ? RED : CREAM;
      const lo = tint(c, -0.45), hi = tint(c, -0.75);
      const a = [x, y1, z], b = [x, y1, zz], c2 = [cx, peak, zz], d = [cx, peak, z];
      glow.push(dirIn > 0 ? quad(a, b, c2, d, [lo, lo, hi, hi]) : quad(a, d, c2, b, [lo, hi, hi, lo]));
    }
    const dx = cx - x, dy = peak - y1, dl = Math.hypot(dx, dy);
    const nIn = dirIn > 0 ? [dy / dl, -dx / dl, 0] : [-dy / dl, dx / dl, 0];
    if (dirIn < 0) { nIn[0] = -Math.abs(nIn[0]); nIn[1] = -Math.abs(nIn[1]); } else { nIn[0] = Math.abs(nIn[0]); nIn[1] = -Math.abs(nIn[1]); }
    for (let i = 0; i < Math.round((zb - za) / 7); i++) {
      const t = rnd.real(0.15, 0.85), z = rnd.real(za + 3, zb - 3);
      const c = [x + dx * t + nIn[0] * 0.2, y1 + dy * t + nIn[1] * 0.2, z];
      starOriented(glow, c, nIn, rnd.real(0.5, 1.1), rnd.pick([0xfff2a0, 0xffffff, 0xffd84a]));
    }
  }
  // Boden: dunkles Parkett, Manegen mit rot-weißer Bande und Sägemehl, Goldstern in der Mitte
  out.push(box(xb - xa, 0.4, zb - za, cx, y0 - 0.2, (za + zb) / 2, 0x5a2a2e, { r: 0, seg: 0 }));
  for (const [rx, rz, rr] of it.rings ?? []) {
    out.push(disc(rx, y0, rz, rr, 0.12, 0xf2c27a, 0xd99a50, 40));
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
      const c = i & 1 ? RED : CREAM;
      const pA = [rx + Math.cos(a0) * rr, rz + Math.sin(a0) * rr], pB = [rx + Math.cos(a1) * rr, rz + Math.sin(a1) * rr];
      const am = (a0 + a1) / 2;
      const g = box(Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) + 0.05, 0.7, 0.45, 0, 0, 0, c, { r: 0.12, seg: 1 });
      g.rotateY(-am + Math.PI / 2);
      g.translate(rx + Math.cos(am) * (rr + 0.2), y0 + 0.35, rz + Math.sin(am) * (rr + 0.2));
      out.push(g);
    }
    starShape(out, rx, y0 + 0.14, rz, rr * 0.35, 0, GOLD, true);
  }
  // Ränge an den Längsseiten mit Publikum (bunte Köpfe)
  if (it.stands !== false) {
    for (const [x, dirIn] of [[xa, 1], [xb, -1]]) {
      for (let row = 0; row < 4; row++) {
        const xr = x + dirIn * (1.5 + row * 1.5);   // vorne (zur Mitte) niedrig, hinten an der Wand hoch
        const yr = y0 + (3 - row) * 1.3 + 1.5;
        out.push(box(1.5, yr - y0, zb - za - 4, xr, (y0 + yr) / 2, (za + zb) / 2, row & 1 ? 0x7a1f2e : 0x9a2a3a, { r: 0, seg: 0 }));
        for (let z = za + 3; z < zb - 3; z += rnd.real(1.5, 2.6)) {
          if (rnd.chance(0.15)) continue;
          const shirt = rnd.pick([0xff5a4a, 0x4a8aff, 0xffd23a, 0x5fd04a, 0xff8cc4, 0xffffff, 0xa865ff]);
          out.push(box(0.5, 0.5, 0.42, xr, yr + 0.25, z, shirt, { r: 0, seg: 0 }));
          out.push(ball(0.21, xr, yr + 0.72, z, 0xffe0c0, rnd.pick([0xf2c29a, 0xd99a6a, 0x8a5a3a, 0xffd8b8]), 0x6a4a3a, 1, 1, 1, 5, 3));
        }
      }
    }
  }
  // Masten (rot-weiß gestreift, Goldkugel)
  for (const [px, pz] of it.poles ?? []) pole({ pos: [px, y0, pz], size: peak - y0, r: 0.5 }, out, null);
  // Lichterketten an der Traufe
  for (const [x] of [[xa + 0.4], [xb - 0.4]]) {
    for (let z = za + 1; z < zb; z += 2.2) {
      const g = new THREE.SphereGeometry(0.16, 5, 3);
      g.translate(x, y1 - 1.6 - Math.sin(((z - za) / 6.4) * Math.PI) ** 2 * 0.8, z);
      glow.push(solid(g, (Math.round(z) & 2) ? 0xfff0a0 : 0xffb04a));
    }
  }
}

/** Fünfzackiger Stern mit beliebiger Normale (beidseitig). */
function starOriented(out, c, n, r, color) {
  const parts = [];
  starShape(parts, 0, 0, 0, r, 1, color);
  const g = merge(parts);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...n).normalize()));
  g.translate(c[0], c[1], c[2]);
  out.push(g);
}

/** Fünfzackiger Stern (flach), liegend (flat) oder an einer Wand (Normale ±Z = dirIn). */
function starShape(out, x, y, z, r, dirIn, c, flat = false) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i & 1 ? r * 0.45 : r;
    pts.push(flat ? [x + Math.cos(a) * rr, y, z - Math.sin(a) * rr] : [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z]);
  }
  const ctr = [x, y, z];
  for (let i = 0; i < 10; i++) {
    const a = pts[i], b = pts[(i + 1) % 10];
    if (flat) out.push(tri(ctr, b, a, c));
    else out.push(dirIn >= 0 ? tri(ctr, a, b, c) : tri(ctr, b, a, c));
  }
}

function stage(level, it, out, glow) {
  const p = v3(it.pos), s = sz3(it.size, [4, 0.8, 4]);
  const round = !!it.round;
  const top = col(it.color ?? 'blue', 0x2f7bff);
  const [s1, s2] = (it.skirt ?? [RED, CREAM]).map((c) => col(c, RED));
  const trim = col(it.trim ?? GOLD, GOLD);
  const y1 = p.y + s.y;
  if (round) {
    const R = s.x / 2;
    if (!it.noCollision) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1, oneWay: !!it.oneWay, tag: 'stage' });
    // Seiten: Streifen-Segmente
    const n = Math.max(12, Math.round(R * 6) * 2);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(R, R * 0.96, s.y - 0.2, 2, 1, true, a0 + Math.PI / 2, a1 - a0);
      g.translate(p.x, p.y + (s.y - 0.2) / 2, p.z);
      out.push(solid(g.toNonIndexed(), i & 1 ? s1 : s2));
    }
    out.push(disc(p.x, y1 - 0.24, p.z, R + 0.06, 0.24, top, trim, 32));
    // Unterseite: Kegel mit Goldspitze (schwebt)
    const cone = new THREE.ConeGeometry(R * 0.9, Math.min(1.6, R * 0.6), 16, 1, true);
    cone.rotateX(Math.PI);
    cone.translate(p.x, p.y - Math.min(1.6, R * 0.6) / 2, p.z);
    out.push(solid(cone.toNonIndexed(), tint(s1, -0.35)));
    out.push(ball(0.22, p.x, p.y - Math.min(1.6, R * 0.6) - 0.1, p.z, 0xfff3b0, trim, 0xb88400, 1, 1, 1, 8, 5));
    if (it.star) starShape(out, p.x, y1 + 0.012, p.z, R * 0.45, 0, trim, true);
    if (it.bulbs !== false) {
      const nb = Math.max(8, Math.round(R * 2 * Math.PI / 1.1));
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * Math.PI * 2;
        const g = new THREE.SphereGeometry(0.1, 5, 3);
        g.translate(p.x + Math.cos(a) * (R + 0.08), y1 - 0.34, p.z + Math.sin(a) * (R + 0.08));
        glow.push(solid(g, i & 1 ? 0xfff0a0 : 0xffb04a));
      }
    }
    return;
  }
  if (!it.noCollision) level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, y1, p.z + s.z / 2], oneWay: !!it.oneWay, camIgnore: !!it.camIgnore, tag: 'stage' });
  // Kern
  out.push(box(s.x - 0.08, s.y - 0.22, s.z - 0.08, p.x, p.y + (s.y - 0.22) / 2, p.z, tint(s1, -0.3), { r: 0.06, seg: 1 }));
  // Streifenschürze auf den sichtbaren Seiten (+Z, ±X; −Z ebenfalls für Rückblicke)
  const sw = 0.8;
  const skirt = (len, place) => {
    const n = Math.max(1, Math.round(len / sw));
    for (let i = 0; i < n; i++) place(i, n, i & 1 ? s1 : s2);
  };
  const hy = s.y - 0.24;
  skirt(s.x, (i, n, c) => {
    const w = s.x / n, x = p.x - s.x / 2 + (i + 0.5) * w;
    out.push(box(w, hy, 0.05, x, p.y + hy / 2, p.z + s.z / 2 - 0.02, c, { r: 0, seg: 0 }));
    out.push(box(w, hy, 0.05, x, p.y + hy / 2, p.z - s.z / 2 + 0.02, c, { r: 0, seg: 0 }));
  });
  skirt(s.z, (i, n, c) => {
    const w = s.z / n, z = p.z - s.z / 2 + (i + 0.5) * w;
    out.push(box(0.05, hy, w, p.x - s.x / 2 + 0.02, p.y + hy / 2, z, c, { r: 0, seg: 0 }));
    out.push(box(0.05, hy, w, p.x + s.x / 2 - 0.02, p.y + hy / 2, z, c, { r: 0, seg: 0 }));
  });
  // Decke mit Goldrand
  out.push(box(s.x + 0.1, 0.26, s.z + 0.1, p.x, y1 - 0.13, p.z, trim, { r: 0.08, seg: 1 }));
  out.push(box(s.x - 0.3, 0.04, s.z - 0.3, p.x, y1 + 0.005, p.z, top, { r: 0.02, seg: 0, topColor: tint(top, 0.1) }));
  if (it.star) starShape(out, p.x, y1 + 0.03, p.z, Math.min(s.x, s.z) * 0.3, 0, trim, true);
  if (it.inlay ?? (s.x >= 5 && s.z >= 5)) {
    // heller Zierrahmen 0,6 m innerhalb der Kante, Goldnieten in den Ecken
    const fc = tint(top, 0.35), ins = 0.75, t = 0.14;
    const w = s.x - ins * 2, d = s.z - ins * 2;
    out.push(box(w, 0.02, t, p.x, y1 + 0.03, p.z - d / 2, fc, { r: 0, seg: 0 }));
    out.push(box(w, 0.02, t, p.x, y1 + 0.03, p.z + d / 2, fc, { r: 0, seg: 0 }));
    out.push(box(t, 0.02, d, p.x - w / 2, y1 + 0.03, p.z, fc, { r: 0, seg: 0 }));
    out.push(box(t, 0.02, d, p.x + w / 2, y1 + 0.03, p.z, fc, { r: 0, seg: 0 }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(ball(0.16, p.x + sx * w / 2, y1 + 0.04, p.z + sz * d / 2, 0xfff3b0, trim, 0xb88400, 1, 0.5, 1, 6, 3));
  }
  // Zacken unter der Kante (vorn und seitlich)
  for (let x = p.x - s.x / 2; x < p.x + s.x / 2 - 0.1; x += 0.8) {
    out.push(tri([x, p.y + 0.02, p.z + s.z / 2 + 0.03], [Math.min(p.x + s.x / 2, x + 0.8), p.y + 0.02, p.z + s.z / 2 + 0.03], [x + 0.4, p.y - 0.45, p.z + s.z / 2 + 0.03], trim));
  }
  if (it.bulbs !== false) {
    const put = (x, z, i) => {
      const g = new THREE.SphereGeometry(0.09, 5, 3);
      g.translate(x, y1 - 0.13, z);
      glow.push(solid(g, i & 1 ? 0xfff0a0 : 0xffb04a));
    };
    let i = 0;
    for (let x = p.x - s.x / 2 + 0.3; x < p.x + s.x / 2; x += 0.9) { put(x, p.z + s.z / 2 + 0.07, i++); }
    for (let z = p.z - s.z / 2 + 0.3; z < p.z + s.z / 2; z += 0.9) { put(p.x - s.x / 2 - 0.07, z, i++); put(p.x + s.x / 2 + 0.07, z, i++); }
  }
}

/** Verkleidung einer bewegten Plattform (Baustein mover): Zirkusbühnen-Optik, folgt der Kollisionsform. */
function ride(level, it) {
  const at = v3(it.at);
  let shape = null;
  level.world.forEach?.((sh) => {
    if (shape || !sh.mover) return;
    const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
    if (Math.abs(cx - at.x) < 0.6 && Math.abs(cz - at.z) < 0.6 && Math.abs(sh.bot - at.y) < 0.6) shape = sh;
  });
  if (!shape) { console.warn('[deco_w1b] ride: keine bewegte Plattform bei', it.at); return; }
  if (!level.view) return;
  const h = shape.top - shape.bot;
  const w = (shape.type === 'cyl' ? shape.r * 2 : shape.x1 - shape.x0) + 0.08, d = (shape.type === 'cyl' ? shape.r * 2 : shape.z1 - shape.z0) + 0.08;
  const out = [], glow = [];
  stage(level, { ...it, pos: [0, -0.02, 0], size: [w, h + 0.03, d], round: shape.type === 'cyl', noCollision: true }, out, glow);
  const group = new THREE.Group();
  group.name = 'fahrbuehne';
  const g = merge(out);
  const m1 = new THREE.Mesh(g, level.view.mats.world);
  m1.castShadow = true; m1.receiveShadow = true;
  group.add(m1);
  if (glow.length) group.add(new THREE.Mesh(merge(glow), level.view.mats.glow));
  const place = () => {
    const cx = shape.type === 'cyl' ? shape.x : (shape.x0 + shape.x1) / 2, cz = shape.type === 'cyl' ? shape.z : (shape.z0 + shape.z1) / 2;
    group.position.set(cx, shape.bot, cz);
  };
  place();
  // Geometrie gehört der Gruppe (Materialien sind die gemeinsamen der Ansicht → nicht freigeben)
  for (const m of group.children) m.userData.owned = true;
  level.view.add(group, place);
}

function drum(level, it, out) {
  const p = v3(it.pos);
  const [D, H] = it.size ?? [2, 1.2];
  const R = D / 2;
  const c = col(it.color ?? 'blue', 0x2f7bff);
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1: p.y + H, tag: 'drum' });
  const side = new THREE.CylinderGeometry(R, R, H - 0.3, 20, 1, true);
  side.translate(p.x, p.y + 0.15 + (H - 0.3) / 2, p.z);
  const L = lin(c), W = lin(CREAM);
  // Zickzack-Muster: hell/dunkel nach Winkel und Höhe
  out.push(colorize(side.toNonIndexed(), (pp, n, o) => {
    const a = Math.atan2(pp.z - p.z, pp.x - p.x);
    const t = (pp.y - p.y) / H;
    const zz = Math.abs(((a * 8 / Math.PI) % 2 + 2) % 2 - 1);
    return zz > t * 0.9 + 0.05 ? mixc(L, L, 0, o) : mixc(W, W, 0, o);
  }));
  out.push(disc(p.x, p.y, p.z, R + 0.06, 0.18, GOLD, GOLD, 20));
  out.push(disc(p.x, p.y + H - 0.16, p.z, R + 0.06, 0.16, RED, GOLD, 20));
  starShape(out, p.x, p.y + H + 0.01, p.z, R * 0.5, 0, GOLD, true);
}

function circusBall(level, it, out) {
  const p = v3(it.pos);
  const r = it.size ?? 0.8;
  const g = new THREE.SphereGeometry(r, 16, 10);
  g.translate(p.x, p.y + r, p.z);
  const cols = [RED, 0xffd23a, 0x2f7bff, CREAM].map((c) => lin(c));
  out.push(colorize(g.toNonIndexed(), (pp, n, o) => {
    const a = Math.atan2(n.z, n.x);
    const k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 4;
    const c = Math.abs(n.y) > 0.92 ? cols[1] : cols[k];
    const L = 0.75 + 0.35 * smooth(-0.6, 0.9, n.y);
    o[0] = c[0] * L; o[1] = c[1] * L; o[2] = c[2] * L;
  }));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * 0.9, y0: p.y, y1: p.y + r * 1.9, tag: 'ball' });
}

function bunting(it, out) {
  const a = v3(it.from), b = v3(it.to);
  const sag = it.sag ?? 0.8;
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const n = it.n ?? Math.max(3, Math.round(L / 0.9));
  const cols = it.colors ?? [RED, 0xffd23a, 0x2f7bff, 0x35c24a, 0xff6fb5, CREAM];
  let prev = a;
  for (let i = 1; i <= 24; i++) { const q = sagAt(a, b, sag, i / 24); out.push(rod(prev, q, 0.025, 0x3a2a2a, 4)); prev = q; }
  const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.15) / n, t1 = (i + 0.85) / n;
    const p0 = sagAt(a, b, sag, t0), p1 = sagAt(a, b, sag, t1), pm = sagAt(a, b, sag, (t0 + t1) / 2);
    void dx; void dz;
    out.push(tri([p0.x, p0.y, p0.z], [p1.x, p1.y, p1.z], [pm.x, pm.y - 0.55, pm.z], cols[i % cols.length]));
  }
}

function bulbs(it, glow, out) {
  const a = v3(it.from), b = v3(it.to);
  const sag = it.sag ?? 0.5;
  const n = it.n ?? Math.max(4, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 0.9));
  let prev = a;
  for (let i = 1; i <= 16; i++) { const q = sagAt(a, b, sag, i / 16); out.push(rod(prev, q, 0.02, 0x2a2a2a, 4)); prev = q; }
  for (let i = 0; i <= n; i++) {
    const q = sagAt(a, b, sag, i / n);
    const g = new THREE.SphereGeometry(0.11, 5, 3);
    g.translate(q.x, q.y - 0.12, q.z);
    glow.push(solid(g, [0xfff0a0, 0xffb04a, 0xff7a7a, 0x9ad8ff][i % 4]));
  }
}

function pole(it, out) {
  const p = v3(it.pos);
  const h = it.size ?? 10, r = it.r ?? 0.35;
  const g = new THREE.CylinderGeometry(r, r * 1.1, h, 10, Math.max(1, Math.round(h / 1.2)), true);
  g.translate(p.x, p.y + h / 2, p.z);
  const R = lin(RED), W = lin(CREAM);
  // Spiralstreifen
  out.push(colorize(g.toNonIndexed(), (pp, n, o) => {
    const a = Math.atan2(pp.z - p.z, pp.x - p.x);
    const k = (((pp.y - p.y) / 1.2 + a / Math.PI) % 2 + 2) % 2;
    const c = k < 1 ? R : W;
    const L = 0.75 + 0.3 * (n.x * 0.3 + n.z * 0.7);
    o[0] = c[0] * L; o[1] = c[1] * L; o[2] = c[2] * L;
  }));
  out.push(ball(r * 1.6, p.x, p.y + h + r, p.z, 0xfff3b0, GOLD, 0xb88400, 1, 1, 1, 10, 6));
  out.push(disc(p.x, p.y, p.z, r * 2, 0.4, GOLD, 0xb88400, 12));
}

function balloons(it, out, rnd) {
  const p = v3(it.pos);
  const n = it.n ?? 5, L = it.size ?? 1.6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd.real(0, 0.6);
    const top = { x: p.x + Math.cos(a) * 0.45, y: p.y + L + rnd.real(0, 0.5), z: p.z + Math.sin(a) * 0.45 };
    out.push(rod(p, top, 0.012, 0xffffff, 3));
    const c = rnd.pick([RED, 0xffd23a, 0x2f7bff, 0x35c24a, 0xff6fb5, 0xa865ff]);
    out.push(ball(0.32, top.x, top.y + 0.32, top.z, tint(c, 0.4), c, tint(c, -0.35), 0.9, 1.1, 0.9, 9, 6));
  }
}

function trapeze(it, out) {
  const p = v3(it.pos);
  const L = it.size ?? 4;
  out.push(box(1.4, 0.08, 0.08, p.x, p.y, p.z, 0xffd23a, { r: 0.03, seg: 1 }));
  for (const sx of [-0.68, 0.68]) out.push(rod({ x: p.x + sx, y: p.y, z: p.z }, { x: p.x + sx * 0.8, y: p.y + L, z: p.z }, 0.025, 0xfff4e0, 4));
}

function curtain(it, out) {
  const p = v3(it.pos);
  const [w, h] = it.size ?? [6, 5];
  const c = col(it.color ?? RED, RED);
  const yaw = it.yaw ?? 0;
  const parts = [];
  const n = Math.max(4, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + (i * w) / n, x1 = -w / 2 + ((i + 1) * w) / n;
    const zf = i & 1 ? 0.18 : 0;
    parts.push(quad([x0, 0, zf], [x1, 0, 0.18 - zf], [x1, h, 0.18 - zf], [x0, h, zf], [tint(c, -0.35), tint(c, -0.1), tint(c, 0.05), tint(c, -0.2)]));
  }
  parts.push(box(w + 0.4, 0.5, 0.3, 0, h + 0.1, 0.1, GOLD, { r: 0.1, seg: 1 }));
  for (let x = -w / 2; x < w / 2 - 0.1; x += 0.7) parts.push(tri([x, h - 0.15, 0.3], [x + 0.7, h - 0.15, 0.3], [x + 0.35, h - 0.8, 0.3], 0xffd23a));
  const g = merge(parts);
  g.rotateY(yaw);
  g.translate(p.x, p.y, p.z);
  out.push(g);
}

/** Scheinwerfer: Lampengehäuse (statisch) + Lichtkegel und Lichtfleck (additiv, in `beams`). */
function spotlight(it, out, beams) {
  const L = v3(it.pos), T = v3(it.target ?? [L.x, L.y - 10, L.z]);
  const r = it.r ?? 2.2;
  const c = lin(hex(it.color ?? 0xfff0c8));
  const dir = new THREE.Vector3(T.x - L.x, T.y - L.y, T.z - L.z);
  const len = dir.length();
  dir.normalize();
  // Gehäuse
  const hous = new THREE.CylinderGeometry(0.35, 0.5, 0.8, 10, 1, false);
  hous.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir));
  hous.translate(L.x, L.y, L.z);
  out.push(solid(hous.toNonIndexed(), 0x2a2a34));
  const lens = new THREE.CircleGeometry(0.42, 10);
  lens.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
  lens.translate(L.x + dir.x * 0.42, L.y + dir.y * 0.42, L.z + dir.z * 0.42);
  beams.glowParts.push(solid(lens.toNonIndexed(), 0xfffbe8));
  // Kegel (offen), oben hell, unten fast weg
  const cone = new THREE.CylinderGeometry(0.35, r * 0.9, len, 16, 3, true);
  cone.translate(0, -len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  cone.applyQuaternion(q);
  cone.translate(L.x, L.y, L.z);
  const k = it.strength ?? 0.07;
  beams.parts.push(colorize(cone.toNonIndexed(), (pp, n, o) => {
    const t = Math.min(1, Math.hypot(pp.x - L.x, pp.y - L.y, pp.z - L.z) / len);
    const f = k * (1 - t * 0.8);
    o[0] = c[0] * f; o[1] = c[1] * f; o[2] = c[2] * f;
  }));
  // Lichtfleck am Ziel (waagerecht)
  const pool = new THREE.CircleGeometry(r * 1.05, 28, 0, Math.PI * 2);
  pool.rotateX(-Math.PI / 2);
  pool.translate(T.x, T.y + 0.03, T.z);
  beams.parts.push(colorize(pool.toNonIndexed(), (pp, n, o) => {
    const d = Math.hypot(pp.x - T.x, pp.z - T.z) / (r * 1.05);
    const f = (it.pool ?? 0.22) * (1 - smooth(0.5, 1, d));
    o[0] = c[0] * f; o[1] = c[1] * f; o[2] = c[2] * f;
  }));
}

// =============================================================================================

export function buildDecoW1b(level, spec) {
  const items = spec.items ?? [spec];
  const rnd = new Rnd((level.rnd.int(0, 1e9) ^ (items.length * 7919)) >>> 0);
  const beams = { parts: [], glowParts: [] };
  for (const it of items) {
    const out = [];
    const glow = [];
    let cast = true;
    switch (it.kind) {
      case 'pixelblock': pixelblock(level, it, out); break;
      case 'bigtree': bigtree(level, it, out); break;
      case 'mountain': mountain(it, out); cast = false; break;
      case 'cloudpuff': cloudpuff(it, out); cast = false; break;
      case 'sign': sign(it, out); break;
      case 'cloudplat': cloudplat(level, it, out); break;
      case 'tufts': tufts(it, out, rnd); cast = false; break;
      case 'mushroom': mushroom(it, out); break;
      case 'flag': flag(it, out); break;
      case 'pennant': flag(it, out, true); break;
      case 'rockpile': rockpile(it, out, rnd); break;
      case 'path': path(it, out, rnd); cast = false; break;
      case 'waterfall': waterfall(it, out, glow); cast = false; break;
      case 'cairn': cairn(it, out); break;
      case 'slopegrass': slopegrass(it, out, rnd); cast = false; break;
      case 'tent': tent(level, it, out, glow); cast = false; break;
      case 'stage': stage(level, it, out, glow); break;
      case 'drum': drum(level, it, out); break;
      case 'ride': ride(level, it); break;
      case 'ball': circusBall(level, it, out); break;
      case 'bunting': bunting(it, out); cast = false; break;
      case 'bulbs': bulbs(it, glow, out); cast = false; break;
      case 'spotlight': spotlight(it, out, beams); cast = false; break;
      case 'pole': pole(it, out); if (it.solid) { const p = v3(it.pos); level.world.add({ type: 'cyl', x: p.x, z: p.z, r: it.r ?? 0.35, y0: p.y, y1: p.y + (it.size ?? 10), tag: 'pole' }); } break;
      case 'balloons': balloons(it, out, rnd); break;
      case 'trapeze': trapeze(it, out); cast = false; break;
      case 'curtain': curtain(it, out); cast = false; break;
      default: console.warn(`[deco_w1b] unbekannte Art: ${it.kind}`);
    }
    // große Kulissen in 32-m-Abschnitte zerlegt abgeben (Frustum-Culling je Abschnitt)
    if (out.length) emit(level, out, { castShadow: cast && it.shadow !== false });
    if (glow.length) emit(level, glow, { material: 'glow', castShadow: false });
  }
  if (beams.glowParts.length) addStatic(level, merge(beams.glowParts), { material: 'glow', castShadow: false });
  if (beams.parts.length && level.view) {
    const g = merge(beams.parts);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'scheinwerfer';
    mesh.renderOrder = 5;
    mesh.matrixAutoUpdate = false;
    addObject(level, mesh);
  }
}

/** Teile nach 32-m-Abschnitten (z) gruppieren und je Gruppe verschmolzen abgeben. */
function emit(level, parts, opts) {
  const groups = new Map();
  for (const g of parts) {
    if (!g) continue;
    g.computeBoundingBox();
    const cz = (g.boundingBox.min.z + g.boundingBox.max.z) / 2;
    const k = Math.floor(-cz / 32);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(g);
  }
  for (const list of groups.values()) addStatic(level, merge(list), opts);
}

export const TYPES = { deco_w1b: buildDecoW1b };
