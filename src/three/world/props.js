// Zier-Objekte der Welt: Grasbüschel, Blumen, Pilze, Moossteine (aus den Zier-Tiles 19–22),
// dazu Streu-Gras auf allen Grasdecken, Kiesel in der Erdkante, Wurzeln unter Höhlendecken und
// leuchtende Kristalle am Höhlenboden. Jede Art ist eine kleine Vorlage mit Vertexfarben, die
// deterministisch (Seed aus Tile-Koordinaten) gedreht/skaliert in die Gelände-Abschnitte gestempelt
// wird – so kosten die Props keine zusätzlichen Zeichenaufrufe.

import * as THREE from 'three';
import { colorize, flat, merge, lin, mixc, Rnd, seedOf, smooth, clamp01 } from './geometry.js';
import { PAL } from './materials.js';
import { CELL, Z_FRONT, GRASS_LIFT } from './layout.js';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

/** Vorlage an Position stempeln (Skalierung s, Drehung ry um Y, Farbton tint als Faktor). */
function stamp(template, x, y, z, s = 1, ry = 0, tint = null, sy = s) {
  const g = template.clone();
  _p.set(x, y, z); _e.set(0, ry, 0); _q.setFromEuler(_e); _s.set(s, sy, s);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  if (tint) {
    const c = g.attributes.color.array;
    for (let i = 0; i < c.length; i += 3) { c[i] *= tint[0]; c[i + 1] *= tint[1]; c[i + 2] *= tint[2]; }
  }
  return g;
}

// ---------------------------------------------------------------- Vorlagen

/** Grashalm: flacher Kegel, Fuß im Ursprung, nach außen geneigt. */
function blade(h, lean, rotY, w = 0.07, off = 0.04) {
  const g = new THREE.ConeGeometry(w, h, 5, 1, true);
  g.translate(off, h / 2, 0); g.scale(1, 1, 0.45); g.rotateZ(-lean); g.rotateY(rotY);
  const dark = lin(PAL.grassDark), light = lin(PAL.grassLight);
  return colorize(g, (p, n, o) => mixc(dark, light, clamp01(p.y / h), o));
}

function tuftTemplate() {
  const rnd = new Rnd(4711);
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd.real(-0.3, 0.3);
    parts.push(blade(rnd.real(0.3, 0.55), rnd.real(0.25, 0.55), a, rnd.real(0.06, 0.08)));
  }
  parts.push(blade(0.6, 0.08, rnd.real(0, 6), 0.07, 0));
  return merge(parts);
}

/** Blume: Stiel, Blatt, fünf Blütenblätter als flache Kugeln, Mitte. */
function flower(x, z, h, petal, center, lean, ry) {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.02, 0.028, h, 5, 1, true);
  stem.translate(0, h / 2, 0);
  parts.push(flat(stem, lin(PAL.stem)));
  const leaf = new THREE.SphereGeometry(0.07, 6, 4);
  leaf.scale(1.6, 0.35, 0.8); leaf.rotateZ(0.5); leaf.translate(0.09, h * 0.45, 0);
  parts.push(flat(leaf, lin(PAL.grassMid), 0.2));
  const pet = lin(petal[0]), petD = lin(petal[1]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.SphereGeometry(0.075, 6, 4);
    s.scale(1, 0.45, 1); s.translate(Math.cos(a) * 0.085, h, Math.sin(a) * 0.085);
    parts.push(colorize(s, (p, n, o) => mixc(petD, pet, smooth(-0.6, 0.8, n.y), o)));
  }
  const c = new THREE.SphereGeometry(0.06, 7, 5);
  c.scale(1, 0.7, 1); c.translate(0, h + 0.02, 0);
  parts.push(flat(c, lin(center), 0.25));
  const g = merge(parts);
  g.rotateZ(lean); g.rotateY(ry); g.translate(x, 0, z);
  return g;
}

function flowersTemplate() {
  return merge([
    flower(-0.17, 0.05, 0.42, PAL.petalWhite, PAL.center, 0.12, 0.4),
    flower(0.2, -0.08, 0.52, PAL.petalRed, PAL.center, -0.1, 2.1),
    flower(0.02, 0.2, 0.3, PAL.petalYellow, PAL.centerWhite, 0.05, 4),
    blade(0.3, 0.4, 1.2, 0.06, 0.25), blade(0.28, 0.4, 3.9, 0.06, 0.25),
  ]);
}

/** Pilz: Stiel, Hutkuppel mit Punkten. */
function mushroom(x, z, capR, stemH, capCol, capDark, ry) {
  const parts = [];
  const stem = new THREE.CylinderGeometry(capR * 0.36, capR * 0.44, stemH, 8, 1, true);
  stem.translate(0, stemH / 2, 0);
  const sl = lin(PAL.stemLight), sd = lin(PAL.stemDark);
  parts.push(colorize(stem, (p, n, o) => mixc(sl, sd, smooth(stemH * 0.55, stemH, p.y), o)));
  const cap = new THREE.SphereGeometry(capR, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2 + 0.35);
  cap.scale(1, 0.72, 1); cap.translate(0, stemH, 0);
  const cc = lin(capCol), cd = lin(capDark);
  parts.push(colorize(cap, (p, n, o) => mixc(cd, cc, smooth(-0.4, 0.9, n.y), o)));
  const dot = lin(PAL.dot);
  for (const [th, ph, r] of [[0.55, 0.4, 0.2], [0.8, 2.3, 0.16], [0.95, 4.4, 0.14], [0.35, 3.3, 0.13]]) {
    const d = new THREE.SphereGeometry(capR * r, 6, 4);
    d.translate(Math.sin(th) * Math.cos(ph) * capR, stemH + Math.cos(th) * capR * 0.72, Math.sin(th) * Math.sin(ph) * capR);
    parts.push(flat(d, dot));
  }
  const g = merge(parts);
  g.rotateY(ry); g.translate(x, 0, z);
  return g;
}

function mushroomsTemplate() {
  return merge([
    mushroom(-0.1, 0.02, 0.28, 0.34, PAL.capRed, PAL.capRedDark, 0.3),
    mushroom(0.3, -0.12, 0.17, 0.22, PAL.capOrange, PAL.capOrangeDark, 2.2),
    blade(0.3, 0.45, 0.8, 0.06, 0.28), blade(0.26, 0.4, 3.6, 0.06, 0.3),
  ]);
}

/** Moosiger Stein: rundlicher Brocken, zwei Moospolster, Halme am Fuß. */
function stoneTemplate() {
  const rock = new THREE.IcosahedronGeometry(0.3, 1);
  rock.scale(1.25, 0.8, 1); rock.translate(0, 0.19, 0);
  const sl = lin(PAL.stoneLight), sm = lin(PAL.stoneMid), sd = lin(PAL.stoneDark);
  const parts = [colorize(rock, (p, n, o) => (n.y >= 0 ? mixc(sm, sl, smooth(0, 0.9, n.y), o) : mixc(sm, sd, smooth(0, -0.9, n.y), o)))];
  const moss = lin(PAL.moss), mossD = lin(PAL.mossDark);
  for (const [x, y, z, r] of [[-0.08, 0.4, 0.05, 0.18], [0.14, 0.37, -0.08, 0.12], [-0.26, 0.28, 0.12, 0.09]]) {
    const m = new THREE.SphereGeometry(r, 8, 5);
    m.scale(1, 0.45, 1); m.translate(x, y, z);
    parts.push(colorize(m, (p, n, o) => mixc(mossD, moss, smooth(-0.2, 0.9, n.y), o)));
  }
  parts.push(blade(0.28, 0.4, 0.3, 0.06, 0.42), blade(0.25, 0.45, 3.4, 0.06, 0.42));
  return merge(parts);
}

/** Kiesel in der Erdkante (halb eingebettet). */
function pebbleTemplate() {
  const g = new THREE.IcosahedronGeometry(0.1, 1);
  g.scale(1.3, 0.9, 0.7);
  const a = lin(PAL.pebble), b = lin(PAL.pebbleDark);
  return colorize(g, (p, n, o) => mixc(b, a, smooth(-0.8, 0.8, n.y), o));
}

/** Wurzel, die von der Decke hängt (Fuß an der Decke). */
function rootTemplate() {
  const g = new THREE.ConeGeometry(0.06, 0.45, 5, 1, true);
  g.rotateX(Math.PI); g.translate(0, -0.225, 0);
  const a = lin(PAL.root), b = lin(PAL.rootTip);
  return colorize(g, (p, n, o) => mixc(a, b, clamp01(-p.y / 0.45), o));
}

/** Kristallbüschel (ohne Beleuchtung gezeichnet = Leuchten). */
function crystalTemplate() {
  const parts = [];
  const spec = [[0, 0, 0, 1, 0, 0, 0], [0.12, 0.02, 0.06, 0.7, 0.35, 1, 0.4], [-0.1, 0.01, 0.08, 0.55, -0.3, 2, 0.5]];
  spec.forEach(([x, y, z, s, lean, ry, ph], i) => {
    const g = new THREE.OctahedronGeometry(0.13, 0);
    g.scale(1, 2.4, 1); g.translate(0, 0.2, 0); g.rotateZ(lean); g.rotateY(ry); g.scale(s, s, s); g.translate(x, y, z);
    const c = lin(PAL.crystal[i % 3]);
    parts.push(colorize(g, (p, n, o) => { const k = 0.55 + 0.45 * clamp01(p.y / 0.6); o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }));
  });
  return merge(parts);
}

// ---------------------------------------------------------------- Verteilung

/**
 * Verteilt die Zier-Objekte und fügt sie über `part(x, geometry)` den Gelände-Abschnitten hinzu.
 * Liefert die (unbeleuchtete) Kristall-Geometrie oder null.
 * @param {import('./terrain.js').LevelGrid} grid
 * @param {{tops: object[], caveFloors: object[], ceilings: object[], boxes: object[]}} info
 */
export function addProps(grid, info, part) {
  const T = { tuft: tuftTemplate(), flowers: flowersTemplate(), mushrooms: mushroomsTemplate(), stone: stoneTemplate(), pebble: pebbleTemplate(), root: rootTemplate(), crystal: crystalTemplate() };
  const byKind = [T.tuft, T.flowers, T.mushrooms, T.stone];
  const greenTint = (rnd) => { const k = rnd.real(0.88, 1.08); return [k * rnd.real(0.9, 1.05), k, k * rnd.real(0.85, 1)]; };
  const softTint = (rnd) => { const k = rnd.real(0.94, 1.05); return [k, k, k]; };
  /** Oberkante des Bodens unter Zelle (x, y) in Einheiten (mit Grasüberstand). */
  const topY = (x, y) => -(y + 1) + (grid.get(x, y + 1) === CELL.GROUND ? GRASS_LIFT : 0);

  // Zier-Tiles: Hauptobjekt hinten, Begleit-Büschel weiter hinten, bei Gras/Blumen manchmal eins vorn
  for (let ty = 0; ty < grid.h; ty++) {
    for (let tx = 0; tx < grid.w; tx++) {
      const kind = grid.decoAt(tx, ty);
      if (kind < 0 || !grid.solid(tx, ty + 1)) continue;
      const rnd = new Rnd(seedOf(tx, ty, 11));
      const y = topY(tx, ty);
      part(tx, stamp(byKind[kind], tx + 0.5 + rnd.real(-0.2, 0.2), y, rnd.real(-0.9, -1.8), rnd.real(0.9, 1.15), rnd.real(0, 6.28), kind === 0 ? greenTint(rnd) : softTint(rnd)));
      part(tx, stamp(T.tuft, tx + rnd.real(-0.3, 1.3), y, rnd.real(-2.2, -3.6), rnd.real(0.7, 1), rnd.real(0, 6.28), greenTint(rnd)));
      if (kind <= 1 && rnd.chance(0.5)) part(tx, stamp(T.tuft, tx + rnd.real(0.1, 0.9), y, 0.55, rnd.real(0.5, 0.65), rnd.real(0, 6.28), greenTint(rnd)));
    }
  }
  // Streu-Gras und vereinzelte Blumen auf allen Grasdecken (hinter der Spielebene);
  // ab und zu ein Wurzelstrang, der unter der Graslippe an der Erdkante herabhängt
  for (const r of info.tops) {
    for (let x = Math.max(r.x0, grid.x0); x < r.x1; x++) {
      const rnd = new Rnd(seedOf(x, r.y0, 99));
      const y = -r.y0 + GRASS_LIFT;
      if (rnd.chance(0.24)) part(x, stamp(T.tuft, x + rnd.real(0.1, 0.9), y, rnd.real(-1.3, -4.3), rnd.real(0.6, 1), rnd.real(0, 6.28), greenTint(rnd)));
      if (rnd.chance(0.05)) part(x, stamp(T.flowers, x + rnd.real(0.2, 0.8), y, rnd.real(-2, -4), rnd.real(0.75, 0.95), rnd.real(0, 6.28), softTint(rnd)));
      if (rnd.chance(0.1) && grid.solid(x, r.y0 + 1)) part(x, stamp(T.root, x + rnd.real(0.15, 0.85), -r.y0 - 0.26, Z_FRONT + 0.02, rnd.real(0.6, 0.9), rnd.real(0, 6.28), null, rnd.real(0.6, 1.1)));
    }
  }
  // Kiesel in sichtbaren Erdkanten (nicht in der Höhle, nicht im Fels)
  for (const b of info.boxes) {
    if (b.code !== CELL.GROUND || b.cave || b.y1 - b.y0 < 1) continue;
    const yTop = -b.y0 - 0.5, yBot = -b.y1 + 0.25;
    if (yTop <= yBot) continue;
    for (let x = Math.max(b.x0, grid.x0 + 1); x < b.x1; x++) {
      const rnd = new Rnd(seedOf(x, b.y0, 7));
      if (!rnd.chance(0.11)) continue;
      part(x, stamp(T.pebble, x + rnd.real(0.2, 0.8), rnd.real(yBot, yTop), Z_FRONT, rnd.real(0.7, 1.3), rnd.real(0, 6.28), softTint(rnd)));
    }
  }
  // Wurzeln unter Decken
  for (const b of info.ceilings) {
    for (let x = b.x0; x < b.x1; x++) {
      const rnd = new Rnd(seedOf(x, b.y1, 5));
      const n = rnd.chance(0.55) ? 1 : 2;
      for (let i = 0; i < n; i++) part(x, stamp(T.root, x + rnd.real(0.1, 0.9), -b.y1, rnd.real(-3.5, 0.5), rnd.real(0.8, 1.2), rnd.real(0, 6.28), null, rnd.real(0.7, 1.4)));
    }
  }
  // Kristalle am Höhlenboden
  const crystals = [];
  for (const r of info.caveFloors) {
    for (let x = r.x0; x < r.x1; x++) {
      const rnd = new Rnd(seedOf(x, r.y0, 13));
      if (rnd.chance(0.16)) crystals.push(stamp(T.crystal, x + rnd.real(0.2, 0.8), -r.y0, rnd.real(-3.8, -1.2), rnd.real(0.8, 1.4), rnd.real(0, 6.28)));
    }
  }
  for (const g of Object.values(T)) g.dispose();
  return crystals.length ? merge(crystals) : null;
}
