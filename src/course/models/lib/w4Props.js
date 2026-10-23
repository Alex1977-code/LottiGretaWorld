// Geteilte Teile der Welt-4-Kulisse (kinds/props_*_w4.js) und ihrer Instanz-Varianten (lib/instanced_w4.js).
//
//   GIFT                     Farben des Giftwalds.
//   giftpilzGeos(lo)         { body, glow } Giftpilz (2 m hoch, Ursprung Mitte unten): Körper (beleuchtet) + Leuchtteile.
//   giftpilzMats()           { body, glow } geteilte Materialien.
//   fallTexture(key, …)      senkrechte Fließ-Schlieren (wiederholbar) für Wasser-/Lavafälle.
//   brickTexture()           dunkle Basalt-Ziegel (wiederholbar, 1 Kachel = 2 × 1 m) für Burgmauern.
//   latticeTexture()         blaues Rautengitter mit Alpha (1 Kachel = 1 m) für die Werfer-Festung.
//   boxUV(w, h, d, tile)     Quader, dessen UVs je Fläche in Metern / tile laufen (Texturen wiederholen sich passend).
// Alle Geometrien/Texturen/Materialien sind geteilt (Cache) und werden nie entsorgt.

import { THREE, TAU, Build, vcol, basic, mix, smoothstep, canvasTexture } from './kit.js';
import { displace, hash1 } from './w4Geos.js';

export const GIFT = {
  cap: 0x7a22c8, capHi: 0xb066ff, capLow: 0x4a1080, spot: 0xc8ff3a, gill: 0x3af0d0, stem: 0xeee2f6, stemLow: 0xb8a8d0, ring: 0xd8c8ee, drip: 0xa8ff3a,
  bark: 0x4a2a5a, barkHi: 0x6a4a7a, barkLow: 0x2a1438, leaf2: 0x2a8a8a, leafHi: 0x7a3ab8, leafLow: 0x1a4a5a, moss: 0x9ae03a,
  vine: 0x3a8a3a, vineHi: 0x5ab84a, vineLeaf: 0x6ad04a, leafLowV: 0x2a6a2a,
};

// ------------------------------------------------------------------ Giftpilz (2 m)
const PILZ_SETS = new Map();
export function giftpilzGeos(lo = false) {
  if (PILZ_SETS.has(lo)) return PILZ_SETS.get(lo);
  const make = () => {
    const q = lo ? 0.6 : 1, n = (k) => Math.max(6, Math.round(k * q));
    const body = new Build(), glow = new Build();
    // Stiel (leicht gebogen) mit Manschette
    body.lathe([[0, 0], [0.3, 0], [0.26, 0.12], [0.2, 0.5], [0.18, 1.0], [0.2, 1.3], [0.24, 1.42], [0, 1.45]], { v: (x, y) => mix(GIFT.stemLow, GIFT.stem, smoothstep(y / 1.2)) }, null, n(16), lo ? 0 : 1);
    body.lathe([[0.19, 1.05], [0.34, 0.96], [0.36, 0.92], [0.2, 1.0]], GIFT.ring, null, n(16));
    // Hut: violette Kuppel mit welligem Rand
    const cap = new THREE.SphereGeometry(1, n(28), n(12), 0, TAU, 0, Math.PI * 0.55);
    const P = cap.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x);
      P.setY(i, y + (y < 0.3 ? Math.sin(a * 6) * 0.06 * (0.3 - y) * 3 : 0));
    }
    cap.scale(0.95, 0.62, 0.95);
    body.add(cap, { v: (x, y, z, nx, ny) => mix(GIFT.capLow, GIFT.capHi, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, 1.32, 0] });
    // Leuchtteile: Punkte (lindgrün), Lamellen-Unterseite (türkis), Tropfen
    const spots = [[0, 1.0, 0.16], [0.9, 0.6, 0.13], [2.1, 0.55, 0.14], [3.3, 0.62, 0.12], [4.5, 0.58, 0.13], [5.6, 0.6, 0.12], [0.4, 0.25, 0.1], [1.6, 0.22, 0.1], [2.8, 0.25, 0.1], [4.0, 0.22, 0.1], [5.2, 0.24, 0.1]];
    for (const [a, el, r] of spots.slice(0, lo ? 6 : spots.length)) {
      const d = new THREE.Vector3(Math.cos(el) * Math.cos(a) * 0.95, Math.sin(el) * 0.62, Math.cos(el) * Math.sin(a) * 0.95);
      const nn = new THREE.Vector3(d.x / 0.95, d.y / 0.62, d.z / 0.95).normalize();
      const g = new THREE.CylinderGeometry(1, 1, 1, n(12)); g.rotateX(Math.PI / 2);
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), nn, Math.abs(nn.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
      m.setPosition(d.x, d.y + 1.32, d.z);
      m.scale(new THREE.Vector3(r, r, 0.03));
      glow.add(g, GIFT.spot, m);
    }
    const gill = new THREE.RingGeometry(0.2, 0.93, n(28), 1);
    gill.rotateX(Math.PI / 2);
    glow.add(gill, { v: (x, y, z) => mix(0x1a8a8a, GIFT.gill, smoothstep(Math.hypot(x, z) / 0.9)) }, { p: [0, 1.31, 0] });
    if (!lo) for (let i = 0; i < 3; i++) {
      const a = i * 2.3 + 0.5;
      glow.sphere(0.05, GIFT.drip, { p: [Math.cos(a) * 0.86, 1.22, Math.sin(a) * 0.86], s: [1, 1.6, 1] }, 8, 6);
    }
    return { body: body.geometry(), glow: glow.geometry() };
  };
  const set = make();
  PILZ_SETS.set(lo, set);
  return set;
}
export function giftpilzMats() {
  return { body: vcol(0.45, {}, 'w4giftpilz'), glow: basic('w4:giftpilzGlow', { vertexColors: true }) };
}

// ------------------------------------------------------------------ Texturen
/** Senkrechte Fließ-Schlieren (key: eigene Cache-Kennung). */
export function fallTexture(key, base, hi, dark) {
  const t = canvasTexture(`w4:fall:${key}`, 128, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = hash1(i + 3) * w, y = hash1(i + 50) * h, l = 30 + hash1(i + 90) * 90, wd = 2 + hash1(i + 7) * 6;
      ctx.strokeStyle = i % 3 ? hi : dark; ctx.lineWidth = wd; ctx.lineCap = 'round';
      for (const dy of [-h, 0, h]) { ctx.beginPath(); ctx.moveTo(x, y + dy); ctx.lineTo(x + Math.sin(i) * 4, y + l + dy); ctx.stroke(); }
    }
  }, { repeat: true });
  return t;
}
/** Dunkle Basalt-Ziegel mit Fugen (1 Kachel = 2 × 1 m, vier Reihen). */
export function brickTexture() {
  return canvasTexture('w4:brick', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1c1620'; ctx.fillRect(0, 0, w, h);
    const rows = 4, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4, cw = w / cols, off = r % 2 ? cw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + off, y = r * rh;
        const k = hash1(r * 13 + c * 7 + 3);
        const g = 58 + Math.floor(k * 26);
        ctx.fillStyle = `rgb(${g + 6},${g - 6},${g + 10})`;
        ctx.fillRect(x + 3, y + 3, cw - 6, rh - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 3, y + 3, cw - 6, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + rh - 7, cw - 6, 4);
        if (k > 0.8) { ctx.strokeStyle = 'rgba(255,110,30,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + cw * 0.3, y + 6); ctx.lineTo(x + cw * 0.45, y + rh * 0.5); ctx.lineTo(x + cw * 0.38, y + rh - 6); ctx.stroke(); }
      }
    }
  }, { repeat: true });
}
/** Blaues Rautengitter mit Alpha (1 Kachel = 1 m). */
export function latticeTexture() {
  return canvasTexture('w4:lattice', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const draw = (color, lw, off) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square';
      ctx.beginPath();
      for (const k of [-1, 0, 1]) {
        ctx.moveTo(k * w + off, off); ctx.lineTo(k * w + w + off, h + off);
        ctx.moveTo(k * w + w + off, off); ctx.lineTo(k * w + off, h + off);
      }
      ctx.stroke();
    };
    draw('rgba(10,20,60,0.6)', 15, 2);
    draw('#2a5ae8', 11, 0);
    draw('#8ab4ff', 3, -2);
    // Nieten an den Kreuzungen
    for (const [x, y] of [[w / 2, h / 2], [0, 0], [w, 0], [0, h], [w, h]]) {
      ctx.fillStyle = '#ffc21a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    }
  }, { repeat: true });
}
/** Quader (Mitte im Ursprung) mit UVs in Metern / tile je Fläche. */
export function boxUV(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // Reihenfolge der Flächen: +x, −x, +y, −y, +z, −z (je 4 Ecken)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
  }
  return g;
}
export { displace };
