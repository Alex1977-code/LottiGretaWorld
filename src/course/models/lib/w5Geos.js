// Gemeinsame Teile der Welt-5-Modelle „Lila Strand-Insel“ (src/course/models/kinds/*_w5.js, lib/instanced_w5.js).
// Ergänzt kit.js, ändert nichts daran. Materialien kommen aus kit.js (std, vcol, basic, metal) – so erhalten alle
// Welt-5-Modelle den globalen Spielzeug-Look automatisch; modell-eigene Kopien (Aufleuchten) über ownMat().
//
//  - W5             Farbpaletten (Sand, Lila, Gold, Stein, Torte …)
//  - ownMat(base)   eigene Kopie eines geteilten Materials (behält Shader-Erweiterungen wie onBeforeCompile)
//  - gradV(lo, hi)  weicher Verlauf je Ecke (Normale y), mixV(fn) beliebige Ecken-Farbfunktion
//  - mouthShape()   Mundformen (Grinsen, offen, grimmig) als THREE.Shape für Extrusionen
//  - flameGeo()     puffige Flammen-Zunge (Drehkörper, Vertexfarben Kern → Spitze), für unbeleuchtete Materialien
//  - bricksV()      Ziegel-/Quader-Fugenmuster je Dreieck (für Mauern, Tempel, lila Ziegel)
//  - Geometrien, die Einzelmodell und Instanz-Variante teilen: Flipper-Feld, lila Ziegel, Donut-Block,
//    Steppengras, Sahnetupfer.

import {
  THREE, TAU, Build, cached, vcol, basic, std, col, mix, clamp, smoothstep, smoothNormals, puffyStarGeo, placed,
  circleShape, heartShape, canvasTexture,
} from './kit.js';
import { noise3, hash1 } from './w4Geos.js';

export { noise3, hash1 };

// ------------------------------------------------------------------ Paletten
export const W5 = {
  sand: 0xf6d9a0, sandHi: 0xfff0c8, sandLow: 0xd8a868, sandDark: 0xb8844a,
  lila: 0x9a5ae0, lilaHi: 0xc89aff, lilaLow: 0x5e2aa8, lilaDeep: 0x3a1a6a,
  gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xc88a10,
  stone: 0xe8cf9a, stoneHi: 0xfff0c8, stoneLow: 0xb8955c, stoneDark: 0x7a5a34,
  steel: 0xd8e2ee, steelLow: 0x7a8aa0,
  cream: 0xfff6e2, white: 0xffffff, ink: 0x1e1428, mouth: 0x5a1430, tongue: 0xff7a8a, cheek: 0xff8aa8,
  wood: 0xc8884a, woodHi: 0xe8b070, woodLow: 0x8a5428,
  red: 0xff3a3a, blue: 0x3a7aff, green: 0x3ec44a,
};

// ------------------------------------------------------------------ Materialien
/** Eigene Kopie eines (geteilten) kit-Materials, z. B. für Aufleuchten; behält Shader-Erweiterungen und Namen. */
export function ownMat(base, props = {}) {
  const m = base.clone();
  if (base.onBeforeCompile) m.onBeforeCompile = base.onBeforeCompile;
  if (base.customProgramCacheKey) m.customProgramCacheKey = base.customProgramCacheKey;
  m.userData = { ...base.userData };
  m.name = base.name;
  for (const [k, v] of Object.entries(props)) {
    if (m[k] && m[k].isColor) m[k].set(v); else m[k] = v;
  }
  return m;
}
/** Unbeleuchtetes, vertexgefärbtes Material (Flammen, Glut, Funken). */
export const glowVcol = (key = 'w5glow', extra = {}) => basic(`vcol:${key}`, { vertexColors: true, ...extra });
/** Additives, unbeleuchtetes Material (Schein, Lichtringe). */
export const additive = (key, color, opacity = 0.7) => basic(`add:${key}`, { color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

// ------------------------------------------------------------------ Farbverläufe
/** Weicher Verlauf je Ecke nach der Normalen (unten lo → oben hi). */
export const gradV = (lo, hi, a = 0.55, b = 0.5) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * a + b)) });
/** Verlauf nach der Höhe y (y0 → y1). */
export const heightV = (lo, hi, y0, y1) => ({ v: (x, y) => mix(lo, hi, smoothstep((y - y0) / (y1 - y0))) });
/** Beliebige Ecken-Farbfunktion. */
export const mixV = (fn) => ({ v: fn });

/**
 * Quader-/Ziegelfugen je Dreieck: Fläche in Ziegel (bw × bh) zerlegen, jede zweite Reihe versetzt; Fugen dunkel,
 * Ziegel leicht variiert. axis: Fläche wird aus (u, v) der passenden Koordinaten gebildet (nach der Normalen).
 */
export function bricksV(base, joint, bw = 0.5, bh = 0.25, o = {}) {
  const jw = o.jw ?? 0.035, vary = o.vary ?? 0.12, top = o.top ?? null;
  return (x, y, z, nx, ny, nz) => {
    if (top !== null && ny > 0.7) return top;
    let u, v;
    if (Math.abs(ny) > 0.7) { u = x; v = z; } else if (Math.abs(nx) > Math.abs(nz)) { u = z; v = y; } else { u = x; v = y; }
    const row = Math.floor(v / bh);
    const uu = u / bw + (row % 2 ? 0.5 : 0);
    const fu = uu - Math.floor(uu), fv = v / bh - row;
    if (fu < jw / bw || fu > 1 - jw / bw || fv < jw / bh || fv > 1 - jw / bh) return joint;
    const h = hash1(Math.floor(uu) * 7.1 + row * 13.3 + (o.seed ?? 0));
    return mix(base, h > 0.5 ? (o.hi ?? 0xffffff) : (o.lo ?? 0x000000), (h > 0.5 ? h - 0.5 : 0.5 - h) * vary * 2);
  };
}

// ------------------------------------------------------------------ Formen
/** Mundformen (Breite ≈ 2, Mitte im Ursprung): 'grin' (lachend), 'open' (oval), 'grim' (grimmig, Zähne), 'smile'. */
export function mouthShape(kind = 'grin') {
  const s = new THREE.Shape();
  if (kind === 'open') { s.absellipse(0, 0, 0.7, 1, 0, TAU, false, 0); return s; }
  if (kind === 'grim') {
    s.moveTo(-1, 0.2); s.quadraticCurveTo(0, 0.55, 1, 0.2); s.lineTo(0.9, -0.45); s.quadraticCurveTo(0, -0.2, -0.9, -0.45); s.closePath();
    return s;
  }
  if (kind === 'smile') {
    s.moveTo(-1, 0.3); s.quadraticCurveTo(0, -0.35, 1, 0.3); s.quadraticCurveTo(0, -1.05, -1, 0.3);
    return s;
  }
  s.moveTo(-1, 0.25); s.quadraticCurveTo(0, 0.05, 1, 0.25); s.quadraticCurveTo(0.85, -0.95, 0, -0.95); s.quadraticCurveTo(-0.85, -0.95, -1, 0.25);
  return s;
}
/** Abgerundetes Rechteck als Form (Mitte im Ursprung). */
export function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/** Puffige Extrusion einer Form (weiche Normalen), Fläche zeigt nach +Z, Mitte im Ursprung. */
export function puffyGeo(shape, depth, bevel, curveSegments = 10, bevelSegments = 4) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments, curveSegments });
  g.translate(0, 0, -depth / 2);
  return smoothNormals(g);
}
/** Schlüssel-Symbol (Ring mit Loch + Bart), Breite ≈ 1, liegt in XY, Ring links. */
export function keyShape() {
  const s = new THREE.Shape();
  // Kontur: Schaft (oben nach rechts), Bart mit zwei Zähnen unten, Griff-Ring links (Kreis um cx) mit Loch
  const R = 0.25, cx = -0.25, hw = 0.075;
  const a0 = Math.asin(hw / R), jx = cx + R * Math.cos(a0);
  s.moveTo(jx, hw);
  s.lineTo(0.47, hw);
  s.lineTo(0.47, -0.24); s.lineTo(0.35, -0.24); s.lineTo(0.35, -hw);
  s.lineTo(0.26, -hw); s.lineTo(0.26, -0.18); s.lineTo(0.15, -0.18); s.lineTo(0.15, -hw);
  s.lineTo(jx, -hw);
  const N = 28;
  for (let k = 1; k <= N; k++) {
    const a = -a0 - (TAU - 2 * a0) * (k / N);
    s.lineTo(cx + R * Math.cos(a), R * Math.sin(a));
  }
  const hole = new THREE.Path();
  hole.absarc(cx, 0, R * 0.45, 0, TAU, true);
  s.holes.push(hole);
  return s;
}
export { circleShape, heartShape };

// ------------------------------------------------------------------ Flammen
/** Flammen-Zunge (Höhe 1, Fuß bei y = 0, Ø ≈ 0,6): Drehkörper mit Spitze; Farben kern → mitte → spitze (je Ecke). */
export function flameGeo(key = 'rot', seg = 12) {
  const C = FLAME[key] ?? FLAME.rot;
  return cached(`w5:flame:${key}:${seg}`, () => {
    const pts = [[0, 0], [0.16, 0.02], [0.27, 0.12], [0.3, 0.26], [0.26, 0.42], [0.18, 0.6], [0.09, 0.8], [0.02, 0.97], [0, 1]];
    const b = new Build();
    b.lathe(pts, { v: (x, y) => (y < 0.35 ? mix(C[0], C[1], smoothstep(y / 0.35)) : mix(C[1], C[2], smoothstep((y - 0.35) / 0.6))) }, null, seg, 2);
    return b.geometry();
  });
}
export const FLAME = {
  rot: [0xfff6b0, 0xffa020, 0xff3a10],
  blau: [0xe8ffff, 0x4ac8ff, 0x3a4aff],
  gold: [0xffffff, 0xffe04a, 0xffa010],
  pink: [0xfff0ff, 0xff7ae0, 0xb02aff],
};

// ------------------------------------------------------------------ Flipper-Feld (geteilt mit instanced_w5.js)
export const FLIP = {
  rot: { plate: 0xff3c4e, hi: 0xff8a96, low: 0xc81e34, rim: 0xffe6ea, rimLow: 0xb81a30, mark: 0xffffff, grid: 0xff6a7a },
  blau: { plate: 0x2f7aff, hi: 0x8ab8ff, low: 0x1a4ad0, rim: 0xe6f0ff, rimLow: 0x1a3aa8, mark: 0xffffff, grid: 0x6aa8ff },
};
const flipKey = (c, w, d, t, lo) => `${c}:${w.toFixed(2)}:${d.toFixed(2)}:${t.toFixed(2)}:${lo ? 'lo' : 'hi'}`;
/**
 * Flipper-Feld, Mitte im Ursprung, Maße w × t × d. Teile: 'solid' (Rahmen + Unterbau, immer sichtbar), 'plate'
 * (Vorderseite oben: glasierte Platte mit Zeichen ● bzw. ◆), 'grid' (Rückseite unten: Gitter für ein durchscheinendes
 * Material), 'back' (Rückseite unten als volle Platte in der Gegenfarbe, für opts.back = 'farbe').
 */
export function flipperGeo(part, color = 'rot', w = 1, d = 1, t = 1, lo = false) {
  const C = FLIP[color] ?? FLIP.rot;
  const seg = lo ? 1 : 2;
  return cached(`w5:flip:${part}:${flipKey(color, w, d, t, lo)}`, () => {
    const b = new Build();
    const rim = Math.min(0.12, Math.min(w, d) * 0.1);
    const r = Math.min(0.06, t * 0.22, rim * 0.6);
    if (part === 'solid') {
      // vier Rahmenleisten (volle Höhe) – hell glasiert mit dunklem Fuß
      const rimV = { v: (x, y, z, nx, ny) => mix(C.rimLow, C.rim, smoothstep((y / t) * 1.4 + 0.55 + ny * 0.2)) };
      b.box(w, t, rim, rimV, { p: [0, 0, d / 2 - rim / 2] }, r, seg);
      b.box(w, t, rim, rimV, { p: [0, 0, -d / 2 + rim / 2] }, r, seg);
      b.box(rim, t, d - rim * 2 + 0.002, rimV, { p: [w / 2 - rim / 2, 0, 0] }, r, seg);
      b.box(rim, t, d - rim * 2 + 0.002, rimV, { p: [-w / 2 + rim / 2, 0, 0] }, r, seg);
      // Eck-Nieten (Goldknöpfe) oben und unten
      for (const sy of [1, -1]) for (const sx of [1, -1]) for (const sz of [1, -1]) {
        if (lo && sy < 0) continue;
        b.sphere(rim * 0.36, 0xffd23a, { p: [sx * (w / 2 - rim / 2), sy * (t / 2 + 0.002), sz * (d / 2 - rim / 2)], s: [1, 0.45, 1] }, lo ? 6 : 10, lo ? 3 : 6);
      }
    } else if (part === 'plate' || part === 'back') {
      const CC = part === 'back' ? (FLIP[color === 'rot' ? 'blau' : 'rot']) : C;
      const iw = w - rim * 2 + 0.01, id = d - rim * 2 + 0.01;
      const sg = part === 'back' ? -1 : 1;
      const ph = t * 0.5;
      // Platte füllt die obere (bzw. untere) Hälfte, glasierte Oberfläche mit hellem Rand
      b.box(iw, ph, id, { v: (x, y, z, nx, ny) => {
        if (ny * sg > 0.7) {
          const e = Math.max(Math.abs(x) / (iw / 2), Math.abs(z) / (id / 2));
          return mix(CC.plate, CC.hi, smoothstep((e - 0.78) / 0.2) * 0.8);
        }
        return mix(CC.low, CC.plate, 0.4);
      } }, { p: [0, sg * (t / 2 - ph / 2), 0] }, Math.min(r, ph * 0.3), seg);
      // Zeichen: Rot ● (Ring), Blau ◆ (Raute) – puffig erhaben, weiß
      const m = Math.min(iw, id);
      const shape = (part === 'back' ? (color === 'rot' ? 'blau' : 'rot') : color) === 'rot'
        ? (() => { const s = circleShape(0.5); const h = new THREE.Path(); h.absarc(0, 0, 0.26, 0, TAU, true); s.holes.push(h); return s; })()
        : (() => { const s = new THREE.Shape(); s.moveTo(0, 0.55); s.lineTo(0.45, 0); s.lineTo(0, -0.55); s.lineTo(-0.45, 0); s.closePath(); return s; })();
      const g = lo ? new THREE.ShapeGeometry(shape, 8).translate(0, 0, 0.03) : puffyGeo(shape, 0.06, 0.05, 20, 3);
      g.scale(m * 0.62, m * 0.62, 1);
      g.rotateX(-Math.PI / 2 * sg);
      b.add(g, CC.mark, { p: [0, sg * (t / 2 + 0.005), 0] });
    } else {
      // Gitter auf der Unterseite (nach dem Umklappen oben): 3 × 3 Stäbe + Füllfläche
      const iw = w - rim * 2 + 0.01, id = d - rim * 2 + 0.01;
      const y = -t / 2 + 0.05;
      for (let i = 1; i < 4; i++) {
        const u = -0.5 + i * 0.25;
        b.box(iw, 0.06, 0.05, C.grid, { p: [0, y, u * id] }, lo ? 0 : 0.02, 1);
        b.box(0.05, 0.06, id, C.grid, { p: [u * iw, y, 0] }, lo ? 0 : 0.02, 1);
      }
      const f = new THREE.PlaneGeometry(iw, id); f.rotateX(Math.PI / 2);
      b.add(f, mix(C.grid, 0xffffff, 0.3), { p: [0, y + 0.02, 0] });
    }
    return b.geometry();
  });
}
export const flipperMats = () => ({
  solid: vcol(0.3, {}, 'w5flip'),
  plate: vcol(0.22, {}, 'w5flipPlate'),
  grid: basic('vcol:w5flipGrid', { vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
});

// ------------------------------------------------------------------ Lila Ziegel (geteilt mit instanced_w5.js)
export const LZ = { brick: 0xa45ae8, brickHi: 0xd2a0ff, brickLow: 0x6a2ab8, mortar: 0x3a1a62, stud: 0xffe07a };
/** Lila Ziegel-Textur (1 Kachel = 1 m: 4 Reihen à 2 Ziegel, versetzt, mit Fase-Licht und Goldnieten-Fugen). */
export function lilaBrickTexture() {
  return canvasTexture('w5:lilaBrick', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3a1a62'; ctx.fillRect(0, 0, w, h);
    const rows = 4, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 2, cw = w / cols, off = r % 2 ? cw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + off, y = r * rh;
        const k = hash1(r * 13 + c * 7 + 5);
        const g = ctx.createLinearGradient(0, y, 0, y + rh);
        g.addColorStop(0, `hsl(${272 + k * 8}, 70%, ${70 + k * 6}%)`);
        g.addColorStop(0.25, `hsl(${272 + k * 8}, 66%, ${60 + k * 5}%)`);
        g.addColorStop(1, `hsl(${270 + k * 8}, 62%, ${42 + k * 5}%)`);
        ctx.fillStyle = g;
        const rr = 10;
        ctx.beginPath(); ctx.roundRect(x + 5, y + 5, cw - 10, rh - 10, rr); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(x + 12, y + 9, cw - 24, 6, 3); ctx.fill();
      }
    }
  }, { repeat: true });
}
export const lilaTexMat = () => std('w5lilaTex', { map: lilaBrickTexture(), roughness: 0.42 });
/** Lila Ziegelblock (Mitte der Unterseite im Ursprung), Maße w × h × d; lo = sparsam (Instanzen: Quader mit Textur, Material lilaTexMat()). */
export function lilaZiegelGeo(w = 1, h = 1, d = 1, lo = false) {
  return cached(`w5:lz:${w}:${h}:${d}:${lo}`, () => {
    if (lo) {
      const g = new THREE.BoxGeometry(w, h, d);
      const uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
      g.translate(0, h / 2, 0);
      return g;
    }
    const b = new Build();
    // Kern (Mörtel, dunkel) und davor gewölbte Ziegel (je Seite einzeln, mit runden Kanten)
    b.box(w * 0.97, h * 0.97, d * 0.97, LZ.mortar, { p: [0, h / 2, 0] }, 0.04, 1);
    const rows = Math.max(1, Math.round(h / 0.25));
    const bh = h / rows;
    const faces = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0]];
    for (const [fx, , fz] of faces) {
      const len = fx ? d : w;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? 0.5 : 0;
        const n = Math.max(1, Math.round(len / 0.5));
        const bw = len / n;
        for (let i = -1; i <= n; i++) {
          let u0 = (i + off - 0.5) * bw - len / 2 + bw / 2, u1 = u0 + bw;
          u0 = Math.max(u0, -len / 2); u1 = Math.min(u1, len / 2);
          if (u1 - u0 < 0.05) continue;
          const uc = (u0 + u1) / 2, uw = u1 - u0 - 0.035;
          const y = r * bh + bh / 2;
          const shade = hash1(r * 5.3 + i * 1.7 + fx * 3 + fz * 7);
          const c = mix(LZ.brick, shade > 0.5 ? LZ.brickHi : LZ.brickLow, Math.abs(shade - 0.5) * 0.5);
          const cv = { v: (x, yy, z, nx, ny) => mix(LZ.brickLow, c, smoothstep(ny * 0.4 + 0.75)) };
          const depth = 0.07;
          const p = fx ? [fx * (w / 2 - depth / 2 + 0.02), y, uc] : [uc, y, fz * (d / 2 - depth / 2 + 0.02)];
          const sz = fx ? [depth, bh - 0.035, uw] : [uw, bh - 0.035, depth];
          b.box(sz[0], sz[1], sz[2], cv, { p }, 0.03, 1);
        }
      }
    }
    // Deckel: vier große Platten mit Goldnieten
    const tw = w / 2 - 0.025, td = d / 2 - 0.025;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box(tw, 0.07, td, gradV(LZ.brickLow, LZ.brickHi, 0.5, 0.55), { p: [sx * w / 4, h - 0.02, sz * d / 4] }, 0.03, 2);
      b.sphere(0.035, LZ.stud, { p: [sx * w / 4, h + 0.02, sz * d / 4], s: [1, 0.5, 1] }, 10, 6);
    }
    return b.geometry();
  });
}
/** Bruchstück eines lila Ziegels (Würfel ≈ 0,3 m mit runden Kanten). */
export const lilaChunkGeo = () => cached('w5:lz:chunk', () => new Build().box(0.32, 0.2, 0.26, gradV(LZ.brickLow, LZ.brickHi), {}, 0.04, 1).geometry());
export const lilaMat = () => vcol(0.4, {}, 'w5lila');

// ------------------------------------------------------------------ Donut-Block (geteilt mit instanced_w5.js)
export const DONUT = {
  rosa: { glaze: 0xff7ac0, glazeHi: 0xffc2e2 },
  schoko: { glaze: 0x7a3a1e, glazeHi: 0xb87048 },
  gelb: { glaze: 0xffd23a, glazeHi: 0xfff2a8 },
  dough: 0xe8a860, doughHi: 0xffd8a0, doughLow: 0xb87030, biscuit: 0xf0c078, biscuitLow: 0xc88a48,
  sprinkles: [0xffffff, 0x3ad0ff, 0xffe04a, 0x7aff7a, 0xff5a5a, 0xb07aff],
};
/** Donut-Block 1 m (Mitte der Unterseite im Ursprung): Keks-Sockel mit Zuckerrand, darauf glasierter Donut mit Streuseln. */
export function donutBlockGeo(color = 'rosa', lo = false) {
  const C = DONUT[color] ?? DONUT.rosa;
  return cached(`w5:donut:${color}:${lo}`, () => {
    const b = new Build();
    // Keks-Sockel (Waffelmuster oben, gebräunte Kanten)
    b.box(1, 0.56, 1, { v: (x, y, z, nx, ny) => {
      const e = Math.max(Math.abs(x), Math.abs(z));
      const base = mix(DONUT.biscuitLow, DONUT.biscuit, smoothstep(ny * 0.5 + 0.5 + y * 0.3));
      return e > 0.47 ? mix(base, DONUT.biscuitLow, 0.35) : base;
    } }, { p: [0, 0.28, 0] }, 0.1, lo ? 1 : 3);
    // Zucker-Perlen am oberen Rand
    if (!lo) {
      for (let i = 0; i < 16; i++) {
        const s = i / 16 * 4, side = Math.floor(s), u = (s - side) - 0.5 + 1 / 8;
        const p = [[u * 0.84, 0.5], [0.5, u * 0.84], [-u * 0.84, -0.5], [-0.5, -u * 0.84]][side];
        b.sphere(0.04, 0xfff8f0, { p: [p[0] * 0.98, 0.555, p[1] * 0.98] }, 8, 6);
      }
    }
    // Donut (Teig) und Glasur mit Tropfkante
    const R = 0.3, tr = 0.155;
    b.torus(R, tr, gradV(DONUT.doughLow, DONUT.doughHi), { p: [0, 0.56 + tr * 0.62, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.62] }, lo ? 8 : 14, lo ? 18 : 30);
    const gl = new THREE.TorusGeometry(R, tr * 1.04, lo ? 7 : 12, lo ? 18 : 30, TAU);
    gl.rotateX(Math.PI / 2);
    const P = gl.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const a = Math.atan2(z, x);
      // Unterseite der Glasur flach abschneiden, mit welliger Tropfkante
      const drip = -0.02 - Math.max(0, Math.sin(a * 7 + 0.5)) ** 3 * 0.06;
      if (y < drip) P.setY(i, drip + (y - drip) * 0.15);
    }
    gl.computeVertexNormals();
    b.add(gl, { v: (x, y, z, nx, ny) => mix(C.glaze, C.glazeHi, smoothstep(ny * 0.7 + 0.1)) }, { p: [0, 0.56 + tr * 0.62 + 0.012, 0], s: [1, 0.66, 1] });
    // Streusel (kleine Stäbchen auf der Glasur)
    const n = lo ? 8 : 22;
    for (let i = 0; i < n; i++) {
      const a = hash1(i * 3.1) * TAU, rr = R + (hash1(i * 7.7) - 0.5) * tr * 1.3;
      const c = DONUT.sprinkles[i % DONUT.sprinkles.length];
      b.capsule(0.013, 0.045, c, { p: [Math.cos(a) * rr, 0.56 + tr * 0.62 + tr * 0.66 + 0.004, Math.sin(a) * rr], r: [Math.PI / 2, 0, hash1(i * 1.3) * TAU], order: 'ZXY' }, lo ? 1 : 2, lo ? 4 : 5);
    }
    return b.geometry();
  });
}
export const donutMat = () => vcol(0.32, {}, 'w5donut');

// ------------------------------------------------------------------ Steppengras (geteilt mit instanced_w5.js)
export const GRASS = { lo: 0x9a8a2a, mid: 0xd8c050, hi: 0xfff0a0, green: 0x8ab83a };
/** Steppengras-Büschel ≈0,7 m (Mitte unten im Ursprung): gebogene, spitze Halme (goldgelb, unten grün). */
export function steppengrasGeo(lo = false) {
  return cached(`w5:grass:${lo}`, () => {
    const b = new Build();
    const n = lo ? 9 : 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash1(i) * 0.6;
      const lean = 0.25 + hash1(i * 2.3) * 0.45, h = 0.45 + hash1(i * 5.1) * 0.35;
      const g = new THREE.ConeGeometry(0.035, h, 4, lo ? 2 : 4, false);
      g.translate(0, h / 2, 0);
      // Halm biegen: oberes Ende nach außen
      const P = g.attributes.position;
      for (let k = 0; k < P.count; k++) { const y = P.getY(k) / h; P.setX(k, P.getX(k) + lean * y * y * h * 0.8); }
      g.computeVertexNormals();
      b.add(g, { v: (x, y) => (y < h * 0.3 ? mix(GRASS.green, GRASS.mid, y / (h * 0.3)) : mix(GRASS.mid, GRASS.hi, (y - h * 0.3) / (h * 0.7))) },
        { p: [Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06], r: [0, -a, 0] });
    }
    return b.geometry();
  });
}
export const grassMat = () => vcol(0.75, { side: THREE.DoubleSide }, 'w5grass');

// ------------------------------------------------------------------ Sahnetupfer (geteilt mit instanced_w5.js)
/** Sahnetupfer (gespritzte Sterntülle) Ø ≈0,4 m, Höhe ≈0,36 m, Mitte unten im Ursprung. */
export function sahneGeo(lo = false) {
  return cached(`w5:sahne:${lo}`, () => {
    const b = new Build();
    const seg = lo ? 24 : 64, rows = lo ? 8 : 18;
    const g = new THREE.CylinderGeometry(1, 1, 1, seg, rows, false);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i) + 0.5, z = P.getZ(i);
      const a = Math.atan2(z, x);
      // Profil: unten breit, oben spitz (Drehung der Rillen nach oben)
      const prof = Math.pow(1 - y, 0.85) * (1 - 0.15 * Math.sin(y * Math.PI));
      const ridge = 1 + 0.16 * Math.cos(a * 8 + y * 5.5);
      const r = Math.max(0, prof * ridge) * 0.2;
      P.setXYZ(i, Math.cos(a) * r, y * 0.34 + (y > 0.98 ? 0.03 : 0), Math.sin(a) * r);
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => mix(0xf0e0d0, 0xffffff, smoothstep(ny * 0.6 + 0.6)) });
    return b.geometry();
  });
}
export const sahneMat = () => vcol(0.35, {}, 'w5sahne');

// ------------------------------------------------------------------ Kleinkram
/** Matrix eines Stabs (Achse +Y der Einheitsgeometrie) von a nach b. */
export function rodMatrix(a, b, r = 1, out = new THREE.Matrix4()) {
  const d = new THREE.Vector3().subVectors(b, a);
  const L = d.length() || 1e-4;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.multiplyScalar(1 / L));
  return out.compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(r, L, r));
}
/** Seil-Geometrie (Einheitslänge 1 entlang Y, mittig), gedrehte Streifen. */
export function ropeGeo(c1 = 0xffffff, c2 = 0xff3a3a, seg = 8, rows = 24) {
  return cached(`w5:rope:${c1}:${c2}:${seg}:${rows}`, () => {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(1, 1, 1, seg, rows, true), (x, y, z) => ((Math.floor((y + 0.5) * rows * 0.5 + Math.atan2(z, x) / TAU * 2) % 2 + 2) % 2 ? c1 : c2));
    return b.geometry();
  });
}
/** Platte mit Sternchen-Aufkleber, wiederverwendbar. */
export const starDecal = (b, p, n, size, color) => b.add(puffyStarGeo(size, size * 0.48, size * 0.25, size * 0.12), color, placed(new THREE.Vector3(...p), new THREE.Vector3(...n), new THREE.Vector3(1, 1, 1)));
export { THREE, TAU, Build, cached, vcol, basic, std, col, mix, clamp, smoothstep };
