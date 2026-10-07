// Gelände der 3D-Welt aus der Logik-Tilemap: Erdkörper (greedy zu Quadern zusammengefasst),
// Grasdecken mit runden, leicht überstehenden Kanten, Höhlenboden/-decke, Felsschicht, Rückwand,
// Holzstege und Steinblöcke. Alles wird je 32-Tile-Abschnitt zu EINER Geometrie verschmolzen
// (ein Material mit Vertexfarben) – die Blöcke sind InstancedMeshes, damit sie einzeln zerbrechen.
//
// Koordinaten: Tile (tx, ty) deckt X ∈ [tx, tx+1], Y ∈ [-(ty+1), -ty]; Spielebene Z = 0 liegt
// vorn-mittig auf dem Boden, der von Z_BACK (hinten) bis Z_FRONT (vordere Kante) reicht.

import * as THREE from 'three';
import { TILE_INDEX } from '../../gfx/tiles.js';
import { roundedBox, colorize, flat, merge, lin, mixc, SIDE, Rnd, seedOf, clamp01, smooth } from './geometry.js';
import { PAL } from './materials.js';
import { addProps } from './props.js';
import { EXT_X, EXT_Y, Z_BACK, Z_FRONT, CHUNK, GRASS_LIFT, CELL } from './layout.js';

export { EXT_X, EXT_Y, Z_BACK, Z_FRONT, CHUNK, GRASS_LIFT, CELL };

/** Raster des Levels samt Fortsetzung über den Rand hinaus und Höhlen-Erkennung. */
export class LevelGrid {
  constructor(map, layer) {
    const first = layer.tileset[0].firstgid;
    this.w = map.width; this.h = map.height;
    this.x0 = -EXT_X; this.x1 = this.w + EXT_X; this.y1 = this.h + EXT_Y;
    this.cols = this.x1 - this.x0;
    this.cells = new Uint8Array(this.cols * this.y1);
    this.deco = new Int8Array(this.cols * this.y1).fill(-1);
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        const t = layer.getTileAt(tx, ty);
        if (!t) continue;
        const idx = t.index - first;
        let c = CELL.EMPTY;
        if (idx >= TILE_INDEX.ground && idx < TILE_INDEX.ground + 16) c = CELL.GROUND;
        else if (idx === TILE_INDEX.caveFloor) c = CELL.CAVE;
        else if (idx === TILE_INDEX.brick) c = CELL.BRICK;
        else if (idx === TILE_INDEX.brickAlt) c = CELL.BRICK_ALT;
        else if (idx === TILE_INDEX.platform) c = CELL.PLATFORM;
        else if (idx >= TILE_INDEX.decoGrass && idx <= TILE_INDEX.decoStone) { c = CELL.DECO; this.deco[this.at(tx, ty)] = idx - TILE_INDEX.decoGrass; }
        this.cells[this.at(tx, ty)] = c;
      }
    }
    // Seitlich fortsetzen: Bodenprofil der Randspalten kopieren
    for (let ty = 0; ty < this.h; ty++) {
      const l = this.cells[this.at(0, ty)], r = this.cells[this.at(this.w - 1, ty)];
      const lc = l === CELL.GROUND || l === CELL.CAVE ? CELL.GROUND : CELL.EMPTY;
      const rc = r === CELL.GROUND || r === CELL.CAVE ? CELL.GROUND : CELL.EMPTY;
      for (let x = this.x0; x < 0; x++) this.cells[this.at(x, ty)] = lc;
      for (let x = this.w; x < this.x1; x++) this.cells[this.at(x, ty)] = rc;
    }
    // Felsschicht unter dem Level – nur unter Boden; Schluchten bleiben bodenlos (dunkel)
    for (let x = this.x0; x < this.x1; x++) {
      if (!this.solid(x, this.h - 1)) continue;
      for (let y = this.h; y < this.y1; y++) this.cells[this.at(x, y)] = CELL.ROCK;
    }
    // Höhe der Wiese hinter dem Level: tiefste Bodenoberkante, die in genug Spalten vorkommt
    // (Anhöhen stehen dann als Hügel vor der Wiese; nur Löcher zeigen die Rückwand)
    const count = new Map();
    for (let x = 0; x < this.w; x++) {
      for (let y = 0; y < this.h; y++) if (this.solid(x, y)) { count.set(y, (count.get(y) ?? 0) + 1); break; }
    }
    const common = [...count.entries()].filter(([, n]) => n >= this.w * 0.12).map(([y]) => y);
    this.baseTop = common.length ? Math.max(...common) : ([...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? this.h - 4);
    // Leere Zellen unter einer Decke (Höhle): bis 4 Zeilen unter Boden (wie die Höhlenboden-Regel der
    // Level-Erzeugung) bzw. bis 3 Zeilen unter einer Blockreihe (zerbrechliche Höhlendecke) – eine
    // Steinreihe als Dach hoch über dem Weg macht darunter keine Höhle
    this.cover = new Uint8Array(this.cols * this.y1);
    for (let x = this.x0; x < this.x1; x++) {
      let reach = 0;
      for (let y = 0; y < this.y1; y++) {
        const c = this.get(x, y);
        if (this.solid(x, y)) reach = 4;
        else if (c === CELL.BRICK || c === CELL.BRICK_ALT) reach = Math.max(reach, 3);
        else if (reach > 0) { this.cover[this.at(x, y)] = 1; reach--; }
      }
    }
    // Boden mit freier Oberkante unter einer Decke ist Höhlenboden (kein Gras)
    for (let x = this.x0; x < this.x1; x++) {
      for (let y = 1; y < this.y1; y++) {
        if (this.cells[this.at(x, y)] === CELL.GROUND && !this.solid(x, y - 1) && this.covered(x, y - 1)) this.cells[this.at(x, y)] = CELL.CAVE;
      }
    }
  }

  at(x, y) { return y * this.cols + (x - this.x0); }
  inside(x, y) { return x >= this.x0 && x < this.x1 && y >= 0 && y < this.y1; }
  /** Zellart; außerhalb des Rasters: oben leer, sonst Boden (Ränder bleiben geschlossen). */
  get(x, y) { if (y < 0) return CELL.EMPTY; if (!this.inside(x, y)) return CELL.GROUND; return this.cells[this.at(x, y)]; }
  solid(x, y) { const c = this.get(x, y); return c === CELL.GROUND || c === CELL.CAVE || c === CELL.ROCK; }
  /** Leere Zelle unter einer Decke (Höhlenraum). */
  covered(x, y) { return this.inside(x, y) && this.cover[this.at(x, y)] === 1; }
  /** Zier-Art (0 Gras, 1 Blumen, 2 Pilze, 3 Stein) oder -1. */
  decoAt(x, y) { return this.inside(x, y) ? this.deco[this.at(x, y)] : -1; }
  /** Grenzt das Boden-Tile an Höhlenraum? */
  caveTint(x, y) { return this.covered(x - 1, y) || this.covered(x + 1, y) || this.covered(x, y - 1) || this.covered(x, y + 1); }
}

// ---------------------------------------------------------------- Läufe und Quader

/** Waagerechte Läufe gleichartiger Boden-Tiles (an Abschnittsgrenzen getrennt). */
function collectRuns(grid) {
  const runs = [];
  const keyOf = (x, y) => grid.get(x, y) | (grid.solid(x, y - 1) ? 0 : 8) | (grid.solid(x, y + 1) ? 0 : 16) | (grid.caveTint(x, y) ? 32 : 0);
  for (let y = 0; y < grid.y1; y++) {
    let x = grid.x0;
    while (x < grid.x1) {
      if (!grid.solid(x, y)) { x++; continue; }
      const key = keyOf(x, y);
      let xe = x + 1;
      while (xe < grid.x1 && xe % CHUNK !== 0 && grid.solid(xe, y) && keyOf(xe, y) === key) xe++;
      runs.push({
        x0: x, x1: xe, y0: y, y1: y + 1, code: key & 7,
        top: !!(key & 8), bottom: !!(key & 16), cave: !!(key & 32),
        left: !grid.solid(x - 1, y), right: !grid.solid(xe, y),
      });
      x = xe;
    }
  }
  return runs;
}

/** Läufe mit gleicher Spanne und Art senkrecht zu Quadern stapeln. */
function mergeVertically(runs) {
  const open = new Map();
  const boxes = [];
  for (const r of runs) {
    const k = `${r.x0},${r.x1}`;
    const a = open.get(k);
    if (a && a.y1 === r.y0 && !a.bottom && a.code === r.code && a.cave === r.cave && a.left === r.left && a.right === r.right) {
      a.y1 = r.y1; a.bottom = r.bottom;
      continue;
    }
    const b = { ...r };
    boxes.push(b);
    open.set(k, b);
  }
  return boxes;
}

/** Erdkörper eines Quaders: nur sichtbare Seiten, Rundung an freien Kanten, Farbverlauf nach Tiefe. */
function dirtBox(b) {
  const w = b.x1 - b.x0, h = b.y1 - b.y0, d = Z_FRONT - Z_BACK;
  let free = SIDE.PZ, skip = SIDE.NZ;
  if (b.left) free |= SIDE.NX; else skip |= SIDE.NX;
  if (b.right) free |= SIDE.PX; else skip |= SIDE.PX;
  if (b.bottom) free |= SIDE.NY; else skip |= SIDE.NY;
  // Oberseite: beim Höhlenboden sichtbar und gerundet; unter Gras verdeckt, bleibt aber erhalten
  // (dichtet die Ecke, wo die runde Kante einer Wand neben der Grasplatte zurückweicht)
  const topVisible = b.top && b.code !== CELL.GROUND;
  if (topVisible) free |= SIDE.PY; else if (!b.top) skip |= SIDE.PY;
  const g = roundedBox(w, h, d, 0.16, free, skip);
  g.translate(b.x0 + w / 2, -b.y0 - h / 2, Z_BACK + d / 2);
  const top = -b.y0;
  const isRock = b.code === CELL.ROCK;
  const base = lin(b.cave ? PAL.cave : PAL.dirt);
  const deep = lin(isRock ? PAL.dirtDeep : b.cave ? PAL.caveDeep : PAL.dirtDeep);
  const rockDeep = lin(PAL.rockDeep);
  const ceil = lin(PAL.ceiling), caveTop = lin(PAL.caveTop);
  return colorize(g, (p, n, o) => {
    if (isRock) { mixc(deep, rockDeep, clamp01((top - p.y) / EXT_Y), o); return; } // Fels: Erde läuft nach unten dunkel aus
    if (n.y < -0.3) { mixc(deep, ceil, smooth(-0.3, -0.9, n.y), o); return; }
    if (n.y > 0.3 && topVisible) { mixc(deep, caveTop, smooth(0.3, 0.9, n.y), o); return; }
    mixc(base, deep, clamp01((top - p.y) / 6) * 0.75, o);
    if (Math.abs(n.x) > 0.5) { o[0] *= 0.9; o[1] *= 0.9; o[2] *= 0.9; } // Seitenwände etwas dunkler als die Front
  });
}

/** Dunkler Grund ganz unten: Schluchten enden im Dunkel statt im Himmel. */
function abyssFloor(k, grid) {
  const xa = Math.max(grid.x0, k * CHUNK), xb = Math.min(grid.x1, (k + 1) * CHUNK);
  if (xb <= xa) return null;
  const d = Z_FRONT + 0.3 - Z_BACK;
  const g = new THREE.PlaneGeometry(xb - xa, d);
  g.rotateX(-Math.PI / 2);
  g.translate((xa + xb) / 2, -grid.y1 + 0.02, Z_BACK + d / 2);
  return flat(g, lin(PAL.rockDeep));
}

/** Grasdecke eines Laufs: runde Platte, die vorn und an freien Seiten leicht übersteht. */
function grassSlab(r, grid) {
  const ov = 0.1, th = 0.32;
  const xa = r.x0 - (r.left ? ov : 0), xb = r.x1 + (r.right ? ov : 0);
  const zf = Z_FRONT + 0.12;
  const w = xb - xa, d = zf - Z_BACK;
  // Enden, die bündig an eine Nachbarplatte stoßen, bekommen keine Stirnfläche (sonst Haarlinie);
  // an einer Wand bleibt sie (füllt die Ecke unter der runden Wandkante)
  const flush = (x) => grid.solid(x, r.y0) && !grid.solid(x, r.y0 - 1);
  let free = SIDE.PY | SIDE.PZ, skip = SIDE.NZ;
  if (r.left) free |= SIDE.NX; else if (flush(r.x0 - 1)) skip |= SIDE.NX;
  if (r.right) free |= SIDE.PX; else if (flush(r.x1)) skip |= SIDE.PX;
  const g = roundedBox(w, th, d, 0.15, free, skip);
  g.translate((xa + xb) / 2, -r.y0 + GRASS_LIFT - th / 2, Z_BACK + d / 2);
  const top = lin(PAL.grassTop), side = lin(PAL.grassSide), dark = lin(PAL.grassDark);
  return colorize(g, (p, n, o) => {
    if (n.y >= 0) {
      mixc(side, top, smooth(0.1, 0.9, n.y), o);
      const k = 1 - 0.07 * clamp01((zf - p.z) / d); // nach hinten eine Spur dunkler (Tiefe)
      o[0] *= k; o[1] *= k; o[2] *= k;
    } else mixc(side, dark, smooth(-0.1, -0.8, n.y), o);
  });
}

/** Schwebender Holzsteg (zusammenhängende Plattform-Tiles = ein Brett) mit Fugen. */
function platformBoard(x0, x1, y) {
  const len = x1 - x0, th = 0.3, dep = 1.6;
  const g = roundedBox(len, th, dep, 0.1, SIDE.ALL, SIDE.NZ);
  g.translate(x0 + len / 2, -y - th / 2, 0);
  const top = lin(PAL.woodTop), mid = lin(PAL.woodMid), deep = lin(PAL.woodDeep);
  const parts = [colorize(g, (p, n, o) => {
    if (n.y > 0) mixc(mid, top, smooth(0.2, 0.9, n.y), o);
    else mixc(mid, deep, smooth(-0.2, -0.9, n.y), o);
  })];
  const seam = lin(PAL.woodSeam);
  for (let i = 1; i < len; i++) {
    const s = new THREE.BoxGeometry(0.05, 0.02, dep - 0.3);
    s.translate(x0 + i, -y + 0.004, 0);
    parts.push(flat(s, seam));
  }
  // Längsnut in der Mitte des Bretts
  const groove = new THREE.BoxGeometry(len - 0.3, 0.02, 0.04);
  groove.translate(x0 + len / 2, -y + 0.004, 0.1);
  parts.push(flat(groove, seam));
  return merge(parts);
}

/** Dunkle Erdwand hinter Löchern und Höhlen (sonst hinter dem Boden verborgen). */
function backWall(k, grid) {
  const xa = Math.max(grid.x0, k * CHUNK), xb = Math.min(grid.x1, (k + 1) * CHUNK);
  const ya = -grid.y1, yb = -grid.baseTop;
  if (xb <= xa || yb <= ya) return null;
  const g = new THREE.PlaneGeometry(xb - xa, yb - ya);
  g.translate((xa + xb) / 2, (ya + yb) / 2, Z_BACK - 0.02);
  return flat(g, lin(PAL.wall));
}

// ---------------------------------------------------------------- Steinblöcke

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _col = new THREE.Color();

/** Würfel 0,96³ mit runden Kanten; alt = Moos und Riss. */
function brickGeometry(alt) {
  const s = 0.96;
  const g = roundedBox(s, s, s, 0.13, SIDE.ALL, SIDE.NZ);
  const light = lin(PAL.stoneLight), mid = lin(PAL.stoneMid), dark = lin(PAL.stoneDark);
  const parts = [colorize(g, (p, n, o) => {
    if (n.y >= 0) mixc(mid, light, smooth(0, 0.9, n.y), o);
    else mixc(mid, dark, smooth(0, -0.9, n.y), o);
    if (n.z > 0.5) { o[0] *= 1.05; o[1] *= 1.05; o[2] *= 1.05; }
  })];
  if (alt) {
    const moss = lin(PAL.moss), mossDark = lin(PAL.mossDark);
    for (const [x, z, r] of [[-0.22, 0.18, 0.2], [0.02, -0.06, 0.14], [-0.3, -0.2, 0.11]]) {
      const m = new THREE.SphereGeometry(r, 9, 6);
      m.scale(1, 0.5, 1); m.translate(x, s / 2 - 0.02, z);
      parts.push(colorize(m, (p, n, o) => mixc(mossDark, moss, smooth(-0.2, 0.9, n.y), o)));
    }
    const crack = lin(PAL.stoneCrack);
    const c1 = new THREE.BoxGeometry(0.035, 0.3, 0.03); c1.rotateZ(0.35); c1.translate(0.14, 0.12, s / 2 - 0.005);
    const c2 = new THREE.BoxGeometry(0.035, 0.26, 0.03); c2.rotateZ(-0.45); c2.translate(0.2, -0.12, s / 2 - 0.005);
    parts.push(flat(c1, crack), flat(c2, crack));
  }
  return merge(parts);
}

function buildBricks(grid, ctx) {
  const lists = [[], []];
  for (let ty = 0; ty < grid.h; ty++) {
    for (let tx = 0; tx < grid.w; tx++) {
      const c = grid.get(tx, ty);
      if (c === CELL.BRICK) lists[0].push([tx, ty]);
      else if (c === CELL.BRICK_ALT) lists[1].push([tx, ty]);
    }
  }
  const slots = new Map();
  const meshes = [];
  lists.forEach((items, v) => {
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(ctx.track(brickGeometry(v === 1)), ctx.mats.stone, items.length);
    mesh.castShadow = true; mesh.receiveShadow = true;
    items.forEach(([tx, ty], i) => {
      const rnd = new Rnd(seedOf(tx, ty, 3));
      _p.set(tx + 0.5, -ty - 0.5, 0); _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      const k = rnd.real(0.92, 1.05);
      _col.setRGB(k * rnd.real(0.97, 1.03), k, k * rnd.real(0.98, 1.06));
      mesh.setColorAt(i, _col);
      slots.set(`${tx},${ty}`, { mesh, i });
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    ctx.group.add(mesh);
    meshes.push(mesh);
  });
  return {
    meshes, slots,
    /** Block zerbrochen: Instanz auf Null skalieren. */
    remove(tx, ty) {
      const slot = slots.get(`${tx},${ty}`);
      if (!slot) return false;
      _m.makeScale(0, 0, 0);
      slot.mesh.setMatrixAt(slot.i, _m);
      slot.mesh.instanceMatrix.needsUpdate = true;
      slots.delete(`${tx},${ty}`);
      return true;
    },
  };
}

// ---------------------------------------------------------------- Aufbau

/**
 * Baut Boden, Gras, Stege, Rückwand und Zier je Abschnitt als ein Mesh sowie die Blöcke.
 * @param {LevelGrid} grid
 * @param {{group: THREE.Group, track: Function, mats: object}} ctx
 */
export function buildTerrain(grid, ctx) {
  const chunks = new Map();
  const part = (x, g) => {
    if (!g) return;
    const k = Math.floor(x / CHUNK);
    if (!chunks.has(k)) chunks.set(k, []);
    chunks.get(k).push(g);
  };
  const runs = collectRuns(grid);
  const boxes = mergeVertically(runs);
  const info = { tops: [], caveFloors: [], ceilings: [], boxes };
  for (const b of boxes) {
    part(b.x0, dirtBox(b));
    if (b.bottom) info.ceilings.push(b);
  }
  for (const r of runs) {
    if (!r.top) continue;
    if (r.code === CELL.GROUND) { part(r.x0, grassSlab(r, grid)); info.tops.push(r); }
    else if (r.code === CELL.CAVE) info.caveFloors.push(r);
  }
  // Plattformen: zusammenhängende Tiles einer Zeile = ein Brett
  for (let ty = 0; ty < grid.h; ty++) {
    let tx = 0;
    while (tx < grid.w) {
      if (grid.get(tx, ty) !== CELL.PLATFORM) { tx++; continue; }
      let xe = tx + 1;
      while (xe < grid.w && grid.get(xe, ty) === CELL.PLATFORM) xe++;
      part(tx, platformBoard(tx, xe, ty));
      tx = xe;
    }
  }
  // Rückwand je Abschnitt
  const k0 = Math.floor(grid.x0 / CHUNK), k1 = Math.floor((grid.x1 - 1) / CHUNK);
  for (let k = k0; k <= k1; k++) { part(k * CHUNK + 1, backWall(k, grid)); part(k * CHUNK + 1, abyssFloor(k, grid)); }
  // Zier-Objekte (werden mit in die Abschnitte gemischt) und Höhlenkristalle (eigenes Material)
  const glow = addProps(grid, info, part);
  const meshes = [];
  let tris = 0;
  for (const parts of chunks.values()) {
    const g = merge(parts);
    if (!g) continue;
    const mesh = new THREE.Mesh(ctx.track(g), ctx.mats.world);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    ctx.group.add(mesh);
    meshes.push(mesh);
    tris += g.attributes.position.count / 3;
  }
  if (glow) {
    const mesh = new THREE.Mesh(ctx.track(glow), ctx.mats.glow);
    mesh.matrixAutoUpdate = false;
    ctx.group.add(mesh);
    meshes.push(mesh);
  }
  const bricks = buildBricks(grid, ctx);
  return { meshes, bricks, tris, ...info };
}
