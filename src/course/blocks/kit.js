// Geometrie-Baukasten der Kurs-Bausteine (Super-Mario-3D-World-Look): Inseln mit Grasdecke und
// Erdkörper, runde Kanten, farbige Blöcke, Keile (Rampen), Zylinder-Stufen, Rasterdecken.
// Alle Funktionen liefern nicht-indizierte Geometrien in Weltkoordinaten mit position/normal/color
// (für view.addStatic). Farben als sRGB-Hex; Thema-Farben aus level.view.theme.
// Liegt bewusst außerhalb von types/ (die Registry sammelt nur types/*.js).

import * as THREE from 'three';
import { roundedBox, colorize, merge, lin, mixc, smooth, SIDE, Rnd } from '../../three/world/geometry.js';
import { THEMES } from '../view/themes.js';

export { SIDE, merge, lin, mixc, smooth, colorize, Rnd };

export const v3 = (a) => (Array.isArray(a) ? { x: a[0] ?? 0, y: a[1] ?? 0, z: a[2] ?? 0 } : { x: a?.x ?? 0, y: a?.y ?? 0, z: a?.z ?? 0 });
export const sz3 = (a, d = [1, 1, 1]) => (Array.isArray(a) ? { x: a[0] ?? d[0], y: a[1] ?? d[1], z: a[2] ?? d[2] } : { x: d[0], y: d[1], z: d[2] });

/** Hex oder Name → sRGB-Hex. */
const NAMED = {
  red: 0xff4a3d, blue: 0x3d8bff, yellow: 0xffd23d, green: 0x4fd04a, orange: 0xff9a2e, purple: 0xa865ff, pink: 0xff7ac0,
  white: 0xf6f4ef, cyan: 0x40d8f0, brown: 0xb86f3a, gray: 0xbfc1cc, grey: 0xbfc1cc,
};
export function hex(c, fallback = 0xffffff) {
  if (c === undefined || c === null) return fallback;
  if (typeof c === 'number') return c;
  if (NAMED[c] !== undefined) return NAMED[c];
  if (typeof c === 'string' && c[0] === '#') return parseInt(c.slice(1), 16);
  return fallback;
}

/** Heller/dunkler (lineare Farbe). */
export function shade(col, k) { return [col[0] * k, col[1] * k, col[2] * k]; }

/**
 * Abgerundeter Quader (Mittelpunkt x,y,z) einfarbig, oben heller/unten dunkler.
 * opts: r (Rundung), free (SIDE-Bits mit Rundung), skip (weggelassene Seiten), topColor, sideShade.
 */
export function box(w, h, d, x, y, z, color, opts = {}) {
  const g = roundedBox(w, h, d, opts.r ?? 0.1, opts.free ?? SIDE.ALL, opts.skip ?? 0, opts.seg ?? 2);
  const base = lin(hex(color));
  const top = opts.topColor !== undefined ? lin(hex(opts.topColor)) : shade(base, 1.12);
  const bottom = shade(base, opts.bottomShade ?? 0.78);
  colorize(g, (p, n, o) => {
    if (n.y > 0.55) mixc(base, top, smooth(0.55, 0.95, n.y), o);
    else if (n.y < -0.3) mixc(base, bottom, smooth(-0.3, -0.9, n.y), o);
    else { o[0] = base[0]; o[1] = base[1]; o[2] = base[2]; }
    // leichte Seitenschattierung: Flächen nach ±X etwas dunkler als nach ±Z (Kanten lesbar)
    const k = 1 - Math.abs(n.x) * (opts.sideShade ?? 0.06);
    o[0] *= k; o[1] *= k; o[2] *= k;
  });
  g.translate(x, y, z);
  return g;
}

/**
 * Raster-Decke (je Zelle ein Farbquadrat) auf Höhe y über [x0,x1]×[z0,z1]. fn(ix, iz) → lineare Farbe.
 * cell = Zellgröße (m); Ränder werden auf die Fläche geklemmt.
 */
export function gridTop(x0, z0, x1, z1, y, cell, fn) {
  const pos = [], nor = [], col = [];
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell - 1e-6)), nz = Math.max(1, Math.ceil((z1 - z0) / cell - 1e-6));
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const ax = x0 + ix * cell, bx = Math.min(x1, ax + cell);
      const az = z0 + iz * cell, bz = Math.min(z1, az + cell);
      const c = fn(ix, iz, ax, az);
      // zwei Dreiecke, Normale nach oben (Umlauf gegen den Uhrzeigersinn von oben)
      pos.push(ax, y, az, ax, y, bz, bx, y, bz, ax, y, az, bx, y, bz, bx, y, az);
      for (let k = 0; k < 6; k++) { nor.push(0, 1, 0); col.push(c[0], c[1], c[2]); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Grasfarbe einer Rasterzelle: Schachbrett (Thema test) oder leichtes Rauschen. */
export function grassCell(theme, rnd) {
  const a = lin(hex(theme.grassTop)), b = lin(hex(theme.grassTop2));
  return (ix, iz, ax, az) => {
    if (theme.checker) return ((Math.floor(ax + 1e-4) + Math.floor(az + 1e-4)) & 1) ? b : a;
    return mixc(a, b, rnd.frac() * 0.6, [0, 0, 0]);
  };
}

/**
 * Insel/Plateau-Körper: Erde mit Grasdecke (runde Oberkante, leicht überstehend), Raster-Grasfläche,
 * optional verjüngter Unterbau (under m, nur Optik). Box von (x0,y0,z0) bis (x1,y1,z1).
 * opts: top ('grass'|'stone'|'sand'|'none'), under, capH, rnd, sideColor, bodyColor
 */
export function islandParts(x0, y0, z0, x1, y1, z1, theme, opts = {}) {
  const parts = [];
  const w = x1 - x0, d = z1 - z0, h = y1 - y0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const rnd = opts.rnd ?? new Rnd(Math.floor(cx * 31 + cz * 17 + y1 * 7) >>> 0);
  const top = opts.top ?? 'grass';
  const capH = top === 'none' ? 0 : Math.min(opts.capH ?? 0.42, h);
  const bodyH = h - capH;
  const dirt = lin(hex(opts.bodyColor ?? theme.dirt)), dirtDeep = lin(hex(theme.dirtDeep));
  if (bodyH > 0.02) {
    const g = roundedBox(w, bodyH, d, Math.min(0.3, w / 4, d / 4), SIDE.ALL & ~SIDE.PY, SIDE.PY, 2);
    colorize(g, (p, n, o) => {
      const yy = p.y + bodyH / 2; // 0 unten … bodyH oben
      const band = Math.floor((bodyH - yy) / 0.55) & 1;
      mixc(dirt, dirtDeep, smooth(0, Math.max(2.5, bodyH), bodyH - yy) * 0.75 + band * 0.08, o);
      if (n.y < -0.5) { o[0] *= 0.7; o[1] *= 0.7; o[2] *= 0.7; }
    });
    g.translate(cx, y0 + bodyH / 2, cz);
    parts.push(g);
  }
  if (capH > 0) {
    const lip = 0.06;
    const side = lin(hex(opts.sideColor ?? (top === 'stone' ? theme.stoneDark : top === 'sand' ? 0xe8cf8a : theme.grassSide)));
    const rim = lin(hex(top === 'stone' ? theme.stone : top === 'sand' ? 0xfff0bf : theme.grassRim));
    const r = Math.min(0.18, capH * 0.45);
    const g = roundedBox(w + lip * 2, capH, d + lip * 2, r, SIDE.ALL & ~SIDE.NY, 0, 2);
    colorize(g, (p, n, o) => mixc(side, rim, smooth(0.15, 0.85, n.y), o));
    g.translate(cx, y1 - capH / 2, cz);
    parts.push(g);
    // Oberfläche als Raster (Schachbrett bzw. leichte Farbvariation je Meter)
    const ins = r + lip * 0.5;
    let cellFn;
    if (top === 'stone') { const a = lin(hex(theme.stone)), b = shade(a, 0.93); cellFn = (ix, iz) => (((ix + iz) & 1) ? b : a); }
    else if (top === 'sand') { const a = lin(0xf3dc96), b = lin(0xe9cd82); cellFn = () => mixc(a, b, rnd.frac(), [0, 0, 0]); }
    else cellFn = grassCell(theme, rnd);
    const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
    if (gx1 > gx0 && gz1 > gz0) {
      // Raster an ganzen Metern ausrichten, damit benachbarte Inseln dasselbe Schachbrett zeigen
      parts.push(alignedGrid(gx0, gz0, gx1, gz1, y1 + 0.004, opts.cell ?? 1, cellFn));
    }
  }
  if (opts.under > 0) {
    const u = opts.under;
    const g = new THREE.CylinderGeometry(1, 0.3, u, 8, 3);
    g.rotateY(Math.PI / 8);
    g.scale((w / 2) * 0.96, 1, (d / 2) * 0.96);
    const rock = lin(hex(theme.dirtDeep)), rockDeep = lin(hex(theme.rockDeep));
    const ng = colorize(g, (p, n, o) => mixc(rock, rockDeep, smooth(u / 2, -u / 2, p.y), o));
    ng.translate(cx, y0 - u / 2 + 0.02, cz);
    parts.push(ng);
  }
  return parts;
}

/** Raster mit Zellgrenzen auf ganzen Vielfachen von cell (Weltkoordinaten). */
export function alignedGrid(x0, z0, x1, z1, y, cell, fn) {
  const xs = [x0]; for (let x = Math.floor(x0 / cell + 1) * cell; x < x1 - 1e-4; x += cell) xs.push(x); xs.push(x1);
  const zs = [z0]; for (let z = Math.floor(z0 / cell + 1) * cell; z < z1 - 1e-4; z += cell) zs.push(z); zs.push(z1);
  const pos = [], nor = [], col = [];
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const ax = xs[i], bx = xs[i + 1], az = zs[j], bz = zs[j + 1];
      const c = fn(i, j, (ax + bx) / 2 - cell / 2, (az + bz) / 2 - cell / 2);
      pos.push(ax, y, az, ax, y, bz, bx, y, bz, ax, y, az, bx, y, bz, bx, y, az);
      for (let k = 0; k < 6; k++) { nor.push(0, 1, 0); col.push(c[0], c[1], c[2]); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/**
 * Keil (Rampe) als Geometrie: Grundfläche [x0,x1]×[z0,z1], Unterseite y0, Oberseite steigt entlang axis
 * in Richtung dir von lowY auf y1. Oberseite grasfarben (oder topColor), Seiten erdfarben.
 */
export function wedge(x0, y0, z0, x1, y1, z1, axis, dir, lowY, topCol, sideCol) {
  // Höhe an den 4 Ecken der Oberseite
  const hAt = (x, z) => {
    let t = axis === 'x' ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
    if (dir < 0) t = 1 - t;
    return lowY + (y1 - lowY) * t;
  };
  const P = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, hAt(x0, z0), z0], [x1, hAt(x1, z0), z0], [x1, hAt(x1, z1), z1], [x0, hAt(x0, z1), z1],
  ];
  const faces = [
    [[4, 7, 6, 5], 'top'], [[0, 1, 2, 3], 'bottom'],
    [[0, 4, 5, 1], 'side'], [[2, 6, 7, 3], 'side'], [[0, 3, 7, 4], 'side'], [[1, 5, 6, 2], 'side'],
  ];
  const pos = [], col = [];
  const top = lin(hex(topCol)), side = lin(hex(sideCol));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const nor = [];
  for (const [f, kind] of faces) {
    const quad = f.map((i) => P[i]);
    for (const tri of [[0, 1, 2], [0, 2, 3]]) {
      a.fromArray(quad[tri[0]]); b.fromArray(quad[tri[1]]); c.fromArray(quad[tri[2]]);
      n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
      if (n.lengthSq() < 0.5) continue; // entartete Seite (Keilspitze)
      for (const p of [a, b, c]) {
        pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
        const k = kind === 'top' ? top : kind === 'bottom' ? shade(side, 0.7) : side;
        col.push(k[0], k[1], k[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Zylinder (Mittelpunkt unten x,y0,z) mit runder Oberkante: Seite sideCol, Deckel topCol. */
export function disc(x, y0, z, r, h, topCol, sideCol, seg = 28) {
  const parts = [];
  const lipR = Math.min(0.15, h * 0.4);
  const side = new THREE.CylinderGeometry(r, r, h - lipR, seg, 1, true);
  side.translate(x, y0 + (h - lipR) / 2, z);
  const sc = lin(hex(sideCol)), tc = lin(hex(topCol));
  parts.push(colorize(side, (p, n, o) => mixc(shade(sc, 0.85), sc, smooth(y0, y0 + h, p.y), o)));
  // Rundung: Torus-Viertel als Lathe
  const prof = [];
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); prof.push(new THREE.Vector2(r - lipR + Math.cos(a) * lipR, Math.sin(a) * lipR)); }
  prof.push(new THREE.Vector2(0, lipR));
  const lathe = new THREE.LatheGeometry(prof, seg);
  lathe.translate(x, y0 + h - lipR, z);
  parts.push(colorize(lathe.toNonIndexed(), (p, n, o) => mixc(sc, tc, smooth(0.2, 0.8, n.y), o)));
  return merge(parts);
}

// ------------------------------------------------------------------ Level-Hilfen für Bausteine

/** Thema des Levels (auch ohne Ansicht, z. B. in Node-Tests). */
export function themeOf(level) { return level.view?.theme ?? THEME_FALLBACK; }
const THEME_FALLBACK = THEMES.grass;

/** Statische Geometrie abgeben (wird verschmolzen); ohne Ansicht verworfen. */
export function addStatic(level, g, opts) {
  if (!g) return;
  if (level.view) level.view.addStatic(g, opts);
  else g.dispose();
}

/** Mesh/Gruppe als eigenes Objekt (wird beim Levelende freigegeben). */
export function addObject(level, obj, update) {
  obj.traverse?.((o) => { if (o.isMesh) o.userData.owned = true; });
  return level.view ? level.view.add(obj, update) : obj;
}

/** Geometrie um die Y-Achse drehen und verschieben (für schräge Teile wie Brückenplanken). */
export function placeGeo(g, x, y, z, yaw = 0) {
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}
