// 3D-Requisiten der Kurs-Weltkarte (eigene Gestaltung, Spielzeug-Look wie die Kurs-Modelle): Eingangs-Podeste mit
// Nummernscheibe, Vorhängeschloss, Schranken aus Steinblöcken, Hecken, Zäune, Felsen mit Höhlenmaul, Zirkuszelt,
// Festung mit Baron-Brummbär-Flagge, Beerenhaus, Schatz-Diorama, Blatt-Floß, Arena-Gitter, Schilder.
// Alle Geometrien entstehen mit `Build` (Vertexfarben, ein Zeichenaufruf je Teil); Ursprung = Fußpunkt, Vorderseite
// (Tür, Eingang) zeigt nach +Z (zur Kamera). Maßstab Meter.

import * as THREE from 'three';
import { Build, TAU, mix, cached, vcol, std, basic } from '../models/lib/kit.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { roundedBox, SIDE } from '../../three/world/geometry.js';

export const ENTRANCE_COLORS = {
  meadow: 0x4fc24a, cave: 0xb07a4a, arena: 0xf2c230, beanstalk: 0x3fbf6a, diorama: 0x4aa8ff,
  river: 0x35b8e8, circus: 0xff5a5a, castle: 0x8a5ad8, pipe: 0x7fd8ff,
};
export const LOCKED_COLOR = 0x9a9cab;

// ------------------------------------------------------------------ Podest und Nummernscheibe

/** Sockel eines Eingangs (Zylinder mit runder Kante), Deckel separat (Nummernscheibe). */
export function podiumGeo(color, r = 1.6, h = 0.3) {
  return cached(`map:podium:${color}:${r}`, () => {
    const b = new Build();
    const dark = mix(color, 0x1a1830, 0.35), light = mix(color, 0xffffff, 0.35);
    b.cyl(r, r + 0.08, h, { v: (x, y) => mix(dark, color, (y + h / 2) / h) }, { p: [0, h / 2, 0] }, 40);
    b.torus(r - 0.06, 0.09, light, { p: [0, h, 0], r: [Math.PI / 2, 0, 0] }, 5, 36);
    // kleine Nieten rundum
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      b.sphere(0.07, 0xffffff, { p: [Math.cos(a) * (r + 0.05), h * 0.45, Math.sin(a) * (r + 0.05)] }, 5, 3);
    }
    return b.geometry();
  });
}

/** Nummernscheibe (Canvas): Farbkreis, weißer Rand, große Nummer; gesperrt grau mit Schloss. */
export function numberTexture(label, color, locked) {
  const key = `map:num:${label}:${color}:${locked ? 1 : 0}`;
  return canvasTexture(key, 256, 256, (ctx, w) => {
    const c = `#${color.toString(16).padStart(6, '0')}`;
    const g = ctx.createRadialGradient(w * 0.45, w * 0.4, 10, w / 2, w / 2, w / 2);
    g.addColorStop(0, locked ? '#d7d8e0' : '#ffffff');
    g.addColorStop(0.18, locked ? '#b9bbc6' : c);
    g.addColorStop(1, locked ? '#8f91a0' : shadeHex(color, 0.72));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(w / 2, w / 2, w / 2 - 2, 0, TAU); ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(w / 2, w / 2, w / 2 - 10, 0, TAU); ctx.stroke();
    if (locked) {
      // Schloss
      ctx.fillStyle = '#5b5e70';
      ctx.lineWidth = 16; ctx.strokeStyle = '#5b5e70';
      ctx.beginPath(); ctx.arc(w / 2, w * 0.43, 30, Math.PI, 0); ctx.stroke();
      roundRect(ctx, w / 2 - 48, w * 0.43, 96, 76, 14); ctx.fill();
      ctx.fillStyle = '#d7d8e0';
      ctx.beginPath(); ctx.arc(w / 2, w * 0.43 + 32, 11, 0, TAU); ctx.fill();
      ctx.fillRect(w / 2 - 5, w * 0.43 + 34, 10, 24);
      return;
    }
    const size = label.length > 4 ? 64 : label.length > 3 ? 78 : 96;
    ctx.font = `900 ${size}px "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = shadeHex(color, 0.45);
    ctx.strokeText(label, w / 2, w / 2 + 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, w / 2, w / 2 + 4);
  });
}

function shadeHex(c, k) {
  const r = Math.round(((c >> 16) & 255) * k), g = Math.round(((c >> 8) & 255) * k), b = Math.round((c & 255) * k);
  return `rgb(${r},${g},${b})`;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Leuchtring um ein freies Podest (additiv, innen hell, außen auslaufend; pulsiert über die Deckkraft). */
export function glowRing(r = 1.6) {
  const geo = cached(`map:ring:${r}`, () => {
    const g = new THREE.RingGeometry(r + 0.05, r + 0.6, 48, 1).rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = Math.hypot(pos.getX(i), pos.getZ(i)) < r + 0.1 ? 1 : 0;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff4a0, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 3;
  return m;
}

/** Vorhängeschloss (schwebt über gesperrten Eingängen). */
export function lockGeo() {
  return cached('map:lock', () => {
    const b = new Build();
    b.box(0.9, 0.72, 0.36, { v: (x, y) => mix(0xb8bccb, 0x7d8194, (0.36 - y) / 0.72) }, { p: [0, 0.36, 0] }, 0.12);
    b.torus(0.3, 0.085, 0xd9dce6, { p: [0, 0.74, 0] }, 8, 24, Math.PI);
    b.cyl(0.085, 0.085, 0.16, 0xd9dce6, { p: [-0.3, 0.68, 0] }, 8);
    b.cyl(0.085, 0.085, 0.16, 0xd9dce6, { p: [0.3, 0.68, 0] }, 8);
    b.cyl(0.1, 0.1, 0.05, 0x3a3d4c, { p: [0, 0.42, 0.19], r: [Math.PI / 2, 0, 0] }, 12);
    b.box(0.07, 0.18, 0.05, 0x3a3d4c, { p: [0, 0.3, 0.19] }, 0);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Schranke

/** Ein Steinblock der Schranke (1 m, runde Kanten, helle Kanten-Fase). */
export function gateBlockGeo() {
  return cached('map:gateblock', () => {
    const b = new Build();
    b.add(new THREE.BoxGeometry(0.96, 0.96, 0.96), (x, y, z, nx, ny) => (ny > 0.9 ? 0xc4b096 : Math.abs(nx) > 0.9 ? 0x8f7c66 : 0xa08c74), { p: [0, 0.48, 0] });
    b.add(new THREE.BoxGeometry(0.98, 0.08, 0.98), 0xe2d4bc, { p: [0, 0.93, 0] });
    // Risse/Fugen
    b.box(0.5, 0.04, 0.02, 0x6f5f4e, { p: [-0.1, 0.62, 0.485] }, 0);
    b.box(0.03, 0.3, 0.02, 0x6f5f4e, { p: [0.18, 0.35, 0.485] }, 0);
    return b.geometry();
  });
}

/** Wappen der Schranke: rundes Schild mit Schloss (Vorderseite +Z). */
export function gateEmblemGeo() {
  return cached('map:gateemblem', () => {
    const b = new Build();
    b.cyl(0.42, 0.42, 0.1, 0xffc21a, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0] }, 28);
    b.cyl(0.33, 0.33, 0.12, 0xe0452a, { p: [0, 0, 0.01], r: [Math.PI / 2, 0, 0] }, 28);
    b.box(0.3, 0.24, 0.06, 0xffffff, { p: [0, -0.06, 0.08] }, 0.04);
    b.torus(0.1, 0.035, 0xffffff, { p: [0, 0.07, 0.08] }, 6, 16, Math.PI);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Hecke, Zaun

/** Hecke entlang +X (Länge len, Mitte im Ursprung): grüner Kasten mit Kugelbuckeln. */
export function hedgeGeo(len, h = 1.1, d = 0.9, seed = 1) {
  const b = new Build();
  const dark = 0x2f8f34, mid = 0x46b347, light = 0x7ed75a;
  b.add(roundedBox(len, h * 0.8, d, 0.2, SIDE.ALL, SIDE.NY, 2), { v: (x, y) => mix(dark, mid, (y + h * 0.4) / (h * 0.8)) }, { p: [0, h * 0.4, 0] });
  const n = Math.max(1, Math.round(len / 0.75));
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    const r = d * (0.42 + rnd() * 0.12);
    b.sphere(r, { v: (px, py, pz, nx, ny) => mix(mid, light, Math.max(0, ny)) }, { p: [x, h * 0.78, (rnd() - 0.5) * 0.12], s: [1.1, 0.8, 1] }, 8, 5);
  }
  return b.geometry();
}

/** Weißer Lattenzaun entlang +X (Länge len, Mitte im Ursprung). */
export function fenceGeo(len) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 0.8) + 1);
  for (let i = 0; i < n; i++) b.box(0.12, 0.75, 0.1, 0xfbfaf6, { p: [-len / 2 + (i / (n - 1)) * len, 0.375, 0] }, 0.03, 1);
  for (const y of [0.28, 0.58]) b.box(len, 0.08, 0.06, 0xf0eee8, { p: [0, y, -0.07] }, 0, 1);
  return b.geometry();
}

// ------------------------------------------------------------------ Felsen und Höhle

/** Felsbrocken-Haufen als Bekrönung eines Felsblocks (w × d, Höhe hTop über der Oberkante). */
export function rockCapGeo(w, d, seed = 3) {
  const b = new Build();
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const n = Math.max(3, Math.round((w * d) / 10));
  for (let i = 0; i < n; i++) {
    const r = 0.9 + rnd() * 1.4;
    const g = new THREE.DodecahedronGeometry(r, 0);
    b.add(g, { v: (x, y, z, nx, ny) => mix(0x7d7584, 0xc9c1cf, Math.max(0, ny) * 0.8 + 0.1) }, { p: [(rnd() - 0.5) * (w - r * 1.6), r * 0.35, (rnd() - 0.5) * (d - r * 1.6)], r: [rnd() * 3, rnd() * 3, rnd() * 3], s: [1, 0.7, 1] });
  }
  return b.geometry();
}

/** Höhlenmaul (Vorderseite +Z): dunkler Bogen mit Steinrahmen, Ursprung = Boden in der Mitte. */
export function caveMouthGeo() {
  return cached('map:cave', () => {
    const b = new Build();
    // dunkle Öffnung (Halbscheibe + Rechteck)
    const shape = new THREE.Shape();
    shape.moveTo(-1.6, 0); shape.lineTo(-1.6, 1.6); shape.absarc(0, 1.6, 1.6, Math.PI, 0, true); shape.lineTo(1.6, 0); shape.lineTo(-1.6, 0);
    b.extrude(shape, 0.3, 0x120c14, { p: [0, 0, 0.05] }, 0, 16);
    // Rahmen aus Steinen
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI - (i / 10) * Math.PI;
      const x = Math.cos(a) * 1.95, y = 1.6 + Math.sin(a) * 1.95;
      b.add(new THREE.DodecahedronGeometry(0.42, 0), { v: (px, py, pz, nx, ny) => mix(0x8a7f78, 0xd8cfc4, Math.max(0, ny) * 0.7 + 0.2) }, { p: [x, y, 0.25], r: [i, i * 2, 0] });
    }
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) b.add(new THREE.DodecahedronGeometry(0.45, 0), { v: (px, py, pz, nx, ny) => mix(0x8a7f78, 0xd8cfc4, Math.max(0, ny) * 0.7 + 0.2) }, { p: [sx * 1.95, 0.4 + k * 0.8, 0.25], r: [k, sx, 0] });
    // Laterne neben dem Eingang
    b.box(0.1, 1.5, 0.1, 0x3d3440, { p: [2.6, 0.75, 0.4] }, 0.03);
    b.box(0.32, 0.36, 0.32, 0x3d3440, { p: [2.6, 1.65, 0.4] }, 0.05);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Zirkuszelt

export function tentGeo() {
  return cached('map:tent', () => {
    const b = new Build();
    const R = 3.4, H = 2.6;
    const stripe = (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 16) % 2 ? 0xff4a4a : 0xfff6ee);
    b.cyl(R, R, H, stripe, { p: [0, H / 2, 0] }, 32, true);
    b.cone(R + 0.35, 2.8, stripe, { p: [0, H + 1.4, 0] }, 32);
    // goldene Bordüre (Zacken)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      b.cone(0.28, 0.4, i % 2 ? 0xffc21a : 0x3a7bff, { p: [Math.cos(a) * (R + 0.25), H - 0.15, Math.sin(a) * (R + 0.25)], r: [Math.PI, 0, 0] }, 4);
    }
    b.torus(R + 0.18, 0.1, 0xffc21a, { p: [0, H + 0.02, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    // Eingang (dunkle Öffnung mit Vorhang-Rändern) nach +Z
    const door = new THREE.Shape();
    door.moveTo(-1.0, 0); door.lineTo(-0.9, 1.6); door.quadraticCurveTo(0, 2.4, 0.9, 1.6); door.lineTo(1.0, 0); door.lineTo(-1.0, 0);
    b.extrude(door, 0.1, 0x2a0e1a, { p: [0, 0, R + 0.02] }, 0, 8);
    b.cyl(0.18, 0.28, 2.0, 0xff4a4a, { p: [-1.05, 1.0, R + 0.08], r: [0, 0, 0.12] }, 10);
    b.cyl(0.18, 0.28, 2.0, 0xff4a4a, { p: [1.05, 1.0, R + 0.08], r: [0, 0, -0.12] }, 10);
    // Mast mit Wimpel
    b.cyl(0.06, 0.06, 1.6, 0xfbfaf6, { p: [0, H + 3.0, 0] }, 8);
    b.sphere(0.14, 0xffc21a, { p: [0, H + 3.85, 0] }, 10, 8);
    const pen = new THREE.Shape(); pen.moveTo(0, 0); pen.lineTo(1.0, -0.25); pen.lineTo(0, -0.5); pen.lineTo(0, 0);
    b.extrude(pen, 0.04, 0x3a7bff, { p: [0.05, H + 3.75, 0] }, 0, 1);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Festung mit Baron-Flagge

export function fortressGeo() {
  return cached('map:fortress', () => {
    const b = new Build();
    const stone = (x, y, z, nx, ny) => mix(0x4a4458, 0x6e6683, ((Math.floor(y * 2) + Math.floor((x + z) * 1.2)) & 1) * 0.35 + Math.max(0, ny) * 0.4);
    // Hauptbau
    b.box(6.4, 4.2, 4.4, { v: stone }, { p: [0, 2.1, 0] }, 0.12);
    // Zinnen
    for (let i = 0; i < 7; i++) for (const z of [-2.0, 2.0]) b.box(0.6, 0.6, 0.5, 0x5a536c, { p: [-2.9 + i * 0.966, 4.5, z] }, 0.06, 1);
    // zwei Türme mit spitzen Dächern
    for (const sx of [-1, 1]) {
      b.cyl(1.25, 1.35, 5.6, { v: stone }, { p: [sx * 3.4, 2.8, 0.9] }, 20);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.42, 0.5, 0.42, 0x5a536c, { p: [sx * 3.4 + Math.cos(a) * 1.15, 5.85, 0.9 + Math.sin(a) * 1.15] }, 0.05, 1); }
      b.cone(1.55, 2.4, { v: (x, y) => mix(0x8a1c3a, 0xc4304e, y / 2.4 + 0.5) }, { p: [sx * 3.4, 7.3, 0.9] }, 20);
      b.sphere(0.16, 0xffc21a, { p: [sx * 3.4, 8.6, 0.9] }, 10, 8);
    }
    // Tor (dunkles Holz mit Eisenbeschlag) nach +Z
    const door = new THREE.Shape();
    door.moveTo(-1.1, 0); door.lineTo(-1.1, 1.8); door.absarc(0, 1.8, 1.1, Math.PI, 0, true); door.lineTo(1.1, 0); door.lineTo(-1.1, 0);
    b.extrude(door, 0.16, 0x3a2216, { p: [0, 0, 2.24] }, 0, 12);
    for (const y of [0.6, 1.6]) b.box(2.0, 0.12, 0.06, 0x23232c, { p: [0, y, 2.34] }, 0);
    // Fensterschlitze mit Glühen
    for (const sx of [-1.8, 1.8]) b.box(0.3, 0.8, 0.06, 0xffb03a, { p: [sx, 3.0, 2.23] }, 0.05, 1);
    // Fahnenmast
    b.cyl(0.07, 0.08, 3.4, 0xd9dce6, { p: [0, 6.5, -0.6] }, 8);
    b.sphere(0.15, 0xffc21a, { p: [0, 8.25, -0.6] }, 10, 8);
    return b.geometry();
  });
}

/** Flagge von Baron Brummbär: dunkelroter Stoff, Bärenkopf mit Zylinder und Monokel. */
export function baronFlagTexture() {
  return canvasTexture('map:baronflag', 256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#7a1630'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffc21a'; ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 10, w, 10);
    const cx = w * 0.52, cy = h * 0.58;
    // Ohren
    ctx.fillStyle = '#8a5a34';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sx * 40, cy - 30, 17, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#c8905a';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sx * 40, cy - 30, 8, 0, TAU); ctx.fill(); }
    // Kopf
    ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.ellipse(cx, cy, 50, 42, 0, 0, TAU); ctx.fill();
    // Schnauze
    ctx.fillStyle = '#e2b585'; ctx.beginPath(); ctx.ellipse(cx, cy + 16, 24, 17, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.ellipse(cx, cy + 9, 10, 7, 0, 0, TAU); ctx.fill();
    // grimmige Augen
    ctx.fillStyle = '#2a1a14';
    ctx.beginPath(); ctx.arc(cx - 20, cy - 6, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 20, cy - 6, 6, 0, TAU); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a14';
    ctx.beginPath(); ctx.moveTo(cx - 32, cy - 20); ctx.lineTo(cx - 10, cy - 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 32, cy - 20); ctx.lineTo(cx + 10, cy - 13); ctx.stroke();
    // Monokel
    ctx.lineWidth = 4; ctx.strokeStyle = '#ffc21a';
    ctx.beginPath(); ctx.arc(cx + 20, cy - 6, 12, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 30, cy + 2); ctx.quadraticCurveTo(cx + 40, cy + 26, cx + 30, cy + 40); ctx.stroke();
    // Zylinder
    ctx.fillStyle = '#16121c';
    ctx.fillRect(cx - 44, cy - 50, 88, 10);
    ctx.fillRect(cx - 28, cy - 98, 56, 50);
    ctx.fillStyle = '#c4304e'; ctx.fillRect(cx - 28, cy - 62, 56, 9);
  });
}

// ------------------------------------------------------------------ Beerenhaus

export function berryHouseGeo() {
  return cached('map:berryhouse', () => {
    const b = new Build();
    // Wände (cremeweiß, leicht bauchig)
    b.lathe([[0, 0], [1.6, 0], [1.75, 0.6], [1.7, 1.6], [1.5, 2.2], [0, 2.2]], { v: (x, y) => mix(0xf3e6cf, 0xfffaf0, y / 2.2) }, { p: [0, 0, 0] }, 28, 2);
    // Beeren-Dach: rote Kuppel mit gelben Kernen
    const seeds = (x, y, z) => {
      const a = Math.atan2(z, x), e = Math.atan2(y, Math.hypot(x, z));
      const k = Math.sin(a * 9) * Math.sin(e * 12);
      return k > 0.82 ? 0xffe27a : mix(0xd8203a, 0xff4a5e, Math.max(0, y / 2.6));
    };
    b.sphere(2.35, seeds, { p: [0, 2.0, 0], s: [1, 0.95, 1] }, 28, 18);
    // Blätterkrone und Stiel
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      b.sphere(0.55, 0x3fae3a, { p: [Math.cos(a) * 0.55, 4.25, Math.sin(a) * 0.55], s: [1.3, 0.35, 0.7], r: [0, -a, 0.3] }, 10, 6);
    }
    b.cyl(0.12, 0.16, 0.6, 0x2f8a2c, { p: [0, 4.6, 0] }, 8);
    // Tür (Bogen) und Fenster nach +Z
    const door = new THREE.Shape();
    door.moveTo(-0.5, 0); door.lineTo(-0.5, 0.9); door.absarc(0, 0.9, 0.5, Math.PI, 0, true); door.lineTo(0.5, 0); door.lineTo(-0.5, 0);
    b.extrude(door, 0.12, 0x8a5230, { p: [0, 0.02, 1.62] }, 0.03, 10);
    b.sphere(0.06, 0xffc21a, { p: [0.28, 0.75, 1.72] }, 8, 6);
    b.cyl(0.32, 0.32, 0.1, 0x7ac8ff, { p: [-1.05, 1.35, 1.32], r: [Math.PI / 2, 0, -0.5] }, 16);
    b.torus(0.33, 0.05, 0xffffff, { p: [-1.05, 1.35, 1.35], r: [0, -0.5, 0] }, 6, 16);
    // Schild über der Tür: Beere
    b.sphere(0.2, 0xff4a5e, { p: [0, 1.75, 1.72] }, 10, 8);
    b.sphere(0.1, 0x3fae3a, { p: [0, 1.95, 1.72], s: [1.4, 0.5, 1] }, 8, 6);
    return b.geometry();
  });
}

/** Sockel für das Gratis-Power-up vor dem Beerenhaus (Holzpodest mit rotem Kissen). */
export function itemStandGeo() {
  return cached('map:itemstand', () => {
    const b = new Build();
    b.cyl(0.62, 0.7, 0.45, 0xc98a52, { p: [0, 0.225, 0] }, 20);
    b.torus(0.6, 0.06, 0xffc21a, { p: [0, 0.45, 0], r: [Math.PI / 2, 0, 0] }, 6, 24);
    b.cyl(0.5, 0.55, 0.12, 0xe0453a, { p: [0, 0.5, 0] }, 20);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Schatz-Diorama

/** Glasvitrine auf Holzsockel mit einer Mini-Insel (Pflaumes Schatzsuche). Glas separat (glassBoxMesh). */
export function dioramaGeo() {
  return cached('map:diorama', () => {
    const b = new Build();
    b.box(2.6, 0.5, 2.6, 0xa86a3c, { p: [0, 0.25, 0] }, 0.08);
    b.box(2.7, 0.08, 2.7, 0xffc21a, { p: [0, 0.52, 0] }, 0.03);
    // Mini-Insel im Glas
    b.box(1.6, 0.6, 1.6, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0x5fd43f : 0xc98a52) }, { p: [0, 0.86, 0] }, 0.08);
    b.box(0.8, 0.4, 0.8, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0x7ee052 : 0xb87a44) }, { p: [0.35, 1.36, -0.35] }, 0.06);
    b.cyl(0.06, 0.08, 0.5, 0x6a4024, { p: [-0.45, 1.41, 0.4] }, 6);
    b.sphere(0.28, 0x3fae3a, { p: [-0.45, 1.8, 0.4] }, 10, 8);
    // goldener Stern oben auf der Mini-Insel
    const st = new THREE.Shape();
    for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU; const r = i % 2 ? 0.1 : 0.24; if (i === 0) st.moveTo(Math.cos(a) * r, Math.sin(a) * r); else st.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    b.extrude(st, 0.08, 0xffd23a, { p: [0.35, 1.92, -0.35] }, 0.02, 4);
    // Schatzkiste daneben (vor der Vitrine)
    b.box(0.8, 0.45, 0.55, 0x8a4a22, { p: [1.85, 0.225, 0.8] }, 0.05);
    b.box(0.82, 0.22, 0.57, 0xa85a2a, { p: [1.85, 0.56, 0.8] }, 0.08);
    b.box(0.12, 0.2, 0.06, 0xffc21a, { p: [1.85, 0.46, 1.09] }, 0.02);
    return b.geometry();
  });
}

export function glassBoxMesh() {
  const g = cached('map:glassbox', () => new THREE.BoxGeometry(2.2, 1.7, 2.2));
  const m = new THREE.Mesh(g, std('map:glass', { color: 0xcff0ff, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false, emissive: 0x0a2030 }));
  m.position.y = 1.4;
  m.renderOrder = 4;
  return m;
}

// ------------------------------------------------------------------ Fluss: Blatt-Floß

export function leafRaftGeo() {
  return cached('map:leaf', () => {
    const b = new Build();
    const s = new THREE.Shape();
    s.moveTo(0, -1.4); s.quadraticCurveTo(1.25, -0.5, 0.9, 0.7); s.quadraticCurveTo(0.4, 1.4, 0, 1.6); s.quadraticCurveTo(-0.4, 1.4, -0.9, 0.7); s.quadraticCurveTo(-1.25, -0.5, 0, -1.4);
    b.extrude(s, 0.12, { v: (x, y, z, nx, ny, nz) => mix(0x3fae3a, 0x7ee052, Math.abs(x) < 0.07 ? 1 : 0.3) }, { r: [-Math.PI / 2, 0, 0], p: [0, 0.06, 0] }, 0.04, 8);
    b.box(0.08, 0.05, 2.6, 0x9ee07a, { p: [0, 0.15, -0.05] }, 0);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Arena (1-A)

/** Gelbes Gitter (Bogen von Pfosten mit Querstange) entlang +X, Länge len. */
export function cageGeo(len, h = 1.6) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 0.7) + 1);
  for (let i = 0; i < n; i++) b.cyl(0.07, 0.07, h, 0xf2c230, { p: [-len / 2 + (i / (n - 1)) * len, h / 2, 0] }, 6);
  b.box(len + 0.1, 0.14, 0.18, 0xffd84a, { p: [0, h, 0] }, 0.04, 1);
  b.box(len + 0.1, 0.1, 0.12, 0xe0a820, { p: [0, 0.35, 0] }, 0.03, 1);
  return b.geometry();
}

// ------------------------------------------------------------------ Schild

/** Holzschild mit Aufschrift (Vorderseite +Z): Pfosten + Tafel, Text als Canvas-Textur auf eigener Fläche. */
export function signGeo() {
  return cached('map:sign', () => {
    const b = new Build();
    b.box(0.14, 1.4, 0.14, 0x8a5a34, { p: [0, 0.7, 0] }, 0.03);
    b.box(1.9, 0.9, 0.12, 0xc98a52, { p: [0, 1.5, 0] }, 0.06);
    return b.geometry();
  });
}

export function signTextMesh(text, key) {
  const tex = canvasTexture(`map:signtext:${key}`, 256, 120, (ctx, w, h) => {
    ctx.fillStyle = '#f3dcb4'; ctx.fillRect(0, 0, w, h);
    ctx.font = '900 46px "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a3418';
    const lines = String(text).split('\n');
    lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 48));
  });
  const m = new THREE.Mesh(cached('map:signplane', () => new THREE.PlaneGeometry(1.7, 0.75)), basic(`map:signmat:${key}`, { map: tex }));
  m.position.set(0, 1.5, 0.07);
  return m;
}

export { vcol, std, basic };
