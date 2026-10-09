// Kartenbau: aus den Weltdaten (worlds/w<n>.js) entsteht im Level-Objekt der Karte die Insel – mit denselben
// Bausteinen wie die Kurs-Level (island-Optik, water, bridge, stairs, platform, deco …) und den Kartenelementen:
//   Gelände-Blöcke → unsichtbare Begrenzung des begehbaren Bereichs (+ Hecken/Zäune, wo man sie sehen soll)
//   → Wege aus hellen Platten → Eingänge → Schranken → Beerenhaus → wandernde Gegnergruppe → Meer/Wolken.
// Reihenfolge wichtig: Höhen für Hecken/Platten werden vom Gelände abgefragt, bevor Wände/Schranken entstehen;
// erst am Ende wird die statische Geometrie verschmolzen (view.finalize).

import * as THREE from 'three';
import { getBlockType } from '../blocks/index.js';
import { islandParts, lin, mixc, colorize, merge, Rnd } from '../blocks/kit.js';
import { roundedBox, SIDE } from '../../three/world/geometry.js';
import { buildWalkGrid, gateRects } from './layout.js';
import { hedgeGeo, fenceGeo, rockCapGeo, berryHouseGeo, itemStandGeo, signGeo, signTextMesh, vcol } from './props.js';
import { EntranceView } from './entrances.js';
import { MapGate } from './gates.js';
import { MapScenery } from './scenery.js';

const WALL_T = 0.5;          // Dicke der unsichtbaren Begrenzung
const WALL_TOP = 40;         // so hoch, dass kein Sprung darüber reicht

/**
 * @param {object} level Level der Karte
 * @param {object} map Weltdaten
 * @param {{ entranceInfo(def): { label: string }, gateClosed(gate): boolean }} host
 */
export function buildMap(level, map, host) {
  const out = { grid: null, entrances: new Map(), gates: [], scenery: null, walls: 0, hedges: 0, tiles: 0, house: null };
  const base = map.base ?? -3;
  const sea = map.sea ?? 0;
  const theme = level.view?.theme;

  // 1) Gelände
  map.ground.forEach((b, i) => buildGround(level, b, base, theme, i));
  // 2) Standard-Bausteine (Wasser, Brücken, Treppen, Plattformen, Deko)
  for (const seg of map.segments ?? []) {
    const build = getBlockType(seg.type);
    if (!build) { console.warn(`[Weltkarte] unbekannter Baustein: ${seg.type}`); continue; }
    try { build(level, seg); } catch (err) { console.error(`[Weltkarte] Baustein ${seg.type} fehlgeschlagen:`, err); }
  }
  const grid = buildWalkGrid(map);
  out.grid = grid;
  scatterDeco(level, map, base, grid);
  const bounds = level.computeBounds();

  // 3) begehbarer Bereich → Hecken/Zäune (Optik) und Wände (Kollision)
  const walls = grid.walls();
  const ground = (x, z) => { const h = level.world.raycastDown(x, 80, z, 120); return h ? h.y : null; };
  const groundBlock = (x, z) => level.world.raycastDown(x, 80, z, 120)?.shape?.mapBlock ?? null;
  const edgeParts = { hedge: [], fence: [] };
  for (const w of walls) borderDeco(w, ground, sea, edgeParts, groundBlock);
  for (const g of edgeParts.hedge) level.view?.addStatic(g, { castShadow: true });
  for (const g of edgeParts.fence) level.view?.addStatic(g, { castShadow: true });
  out.hedges = edgeParts.hedge.length;

  // 4) Wege aus hellen Platten
  out.tiles = buildPaths(level, map, grid, ground, sea);

  // 5) Meer, Wolken, Nachbarinseln (Inselchen gehen in die statische Geometrie)
  if (level.view) out.scenery = new MapScenery(level.view, map, bounds);

  // 6) Eingänge
  for (const def of map.entrances ?? []) {
    const info = host.entranceInfo(def);
    out.entrances.set(def.id, new EntranceView(level, def, info));
  }

  // 7) Beerenhaus
  for (const h of map.houses ?? []) {
    const [x, y, z] = h.pos;
    const g = berryHouseGeo().clone();
    if (h.yaw) g.rotateY(h.yaw + Math.PI / 2);
    g.translate(x, y, z);
    level.view?.addStatic(g, { castShadow: true });
    level.world.add({ type: 'cyl', x, z, r: 1.85, y0: y - 0.5, y1: y + 4.2, tag: 'house' });
    if (h.item) {
      const sg = itemStandGeo().clone();
      sg.translate(h.item[0], h.item[1], h.item[2]);
      level.view?.addStatic(sg, { castShadow: true });
      level.world.add({ type: 'cyl', x: h.item[0], z: h.item[2], r: 0.66, y0: h.item[1] - 0.5, y1: h.item[1] + 0.56, tag: 'itemstand' });
    }
    out.house = h;
  }

  // 7b) Holzschilder
  (map.signs ?? []).forEach((sg, i) => {
    const grp = new THREE.Group();
    const board = new THREE.Mesh(signGeo(), vcol(0.6));
    board.castShadow = true;
    grp.add(board, signTextMesh(sg.text, `${map.id}:${i}`));
    grp.position.set(sg.pos[0], sg.pos[1], sg.pos[2]);
    grp.rotation.y = sg.yaw ?? 0;
    level.view?.add(grp);
    level.world.add({ type: 'cyl', x: sg.pos[0], z: sg.pos[2], r: 0.2, y0: sg.pos[1], y1: sg.pos[1] + 2, tag: 'schild' });
  });

  // 8) Wände (nach allen Höhenabfragen)
  for (const w of walls) {
    let min, max;
    if (w.axis === 'x') {
      const xa = w.side > 0 ? w.x : w.x - WALL_T, xb = w.side > 0 ? w.x + WALL_T : w.x;
      min = [xa, base - 2, w.z0]; max = [xb, WALL_TOP, w.z1];
    } else {
      const za = w.side > 0 ? w.z : w.z - WALL_T, zb = w.side > 0 ? w.z + WALL_T : w.z;
      min = [w.x0, base - 2, za]; max = [w.x1, WALL_TOP, zb];
    }
    level.world.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, noStep: true, tag: 'kartenrand' });
    out.walls++;
  }

  // 9) Schranken (nur geschlossene bauen; die Szene öffnet frisch freigeschaltete mit Animation)
  for (const gr of gateRects(map, grid)) {
    if (!host.gateClosed(gr)) continue;
    const [x0, z0, x1, z1] = gr.rect;
    const y = ground((x0 + x1) / 2, (z0 + z1) / 2) ?? 1;
    out.gates.push(new MapGate(level, gr, y));
  }

  out.bounds = bounds;
  return out;
}

/** Abschluss: statische Geometrie verschmelzen, Himmel/Hintergrund auslegen. */
export function finalizeMap(level, out) {
  level.view?.finalize(out.bounds);
}

// ------------------------------------------------------------------ Gelände

function buildGround(level, b, base, theme, index) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const rnd = new Rnd(0x51ab + index * 977);
  level.world.add({ type: 'box', min: [x0, base, z0], max: [x1, top, z1], tag: b.walk ? 'karte' : 'gelaende', mapBlock: b });
  if (!theme) return;
  const style = b.style ?? 'grass';
  if (style === 'rock') {
    const h = top - base;
    const g = roundedBox(x1 - x0, h, z1 - z0, 0.35, SIDE.ALL, SIDE.NY, 2);
    const dark = lin(0x6e6676), light = lin(0xb4acb9), band = lin(0x8a8292);
    const rock = colorize(g, (p, n, o) => {
      const yy = p.y + h / 2;
      const k = (Math.floor(yy / 0.9) & 1) ? 0.15 : 0;
      mixc(dark, light, Math.max(0, n.y) * 0.6 + 0.25 + k, o);
      if (Math.abs(n.y) < 0.5 && (Math.floor(yy / 0.9) % 3 === 0)) mixc(o, band, 0.5, o);
    });
    rock.translate((x0 + x1) / 2, base + h / 2, (z0 + z1) / 2);
    level.view.addStatic(rock);
    const cap = rockCapGeo(x1 - x0, z1 - z0, 7 + index);
    cap.translate((x0 + x1) / 2, top, (z0 + z1) / 2);
    level.view.addStatic(cap);
    return;
  }
  const opts = { under: 0, rnd, top: style === 'pond' || style === 'sand' ? 'sand' : 'grass' };
  for (const g of islandParts(x0, base, z0, x1, top, z1, theme, opts)) level.view.addStatic(g);
}

/** Bäume, Büsche und Blumen auf nicht begehbaren Grasblöcken (deterministisch). */
function scatterDeco(level, map, base, grid) {
  const deco = getBlockType('deco');
  if (!deco) return;
  const items = [];
  const light = [];
  map.ground.forEach((b, i) => {
    if (b.walk || b.style === 'rock' || b.style === 'pond' || b.style === 'sand' || b.noDeco) return;
    const [cx, cz] = [(b.rect[0] + b.rect[2]) / 2, (b.rect[1] + b.rect[3]) / 2];
    if (grid.isWalk(cx, cz)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const rnd = new Rnd(0xdec0 + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    const meadow = b.style === 'meadow' || b.top <= 1.5;
    const nTrees = meadow ? Math.floor(area / 80) : Math.max(1, Math.floor(area / 38));
    for (let k = 0, tries = 0; k < nTrees && tries < nTrees * 12; tries++) {
      const x = rnd.real(x0 + 1.6, x1 - 1.6), z = rnd.real(z0 + 1.6, z1 - 1.6);
      if (tooClose(x, z, 3.0)) continue;
      pts.push([x, z]);
      light.push(lightTree(x, b.top, z, rnd.real(3.8, 5.6), rnd));
      k++;
    }
    const nBush = Math.floor(area / (meadow ? 36 : 70));
    for (let k = 0, tries = 0; k < nBush && tries < nBush * 10; tries++) {
      const x = rnd.real(x0 + 1, x1 - 1), z = rnd.real(z0 + 1, z1 - 1);
      if (tooClose(x, z, 1.8)) continue;
      pts.push([x, z]);
      light.push(lightBush(x, b.top, z, rnd.real(0.6, 0.95), rnd));
      k++;
    }
    const nFl = meadow ? Math.floor(area / 40) : 0;
    for (let k = 0; k < nFl; k++) {
      const x = rnd.real(x0 + 1, x1 - 1), z = rnd.real(z0 + 1, z1 - 1);
      if (tooClose(x, z, 1.2)) continue;
      items.push({ kind: 'flowers', pos: [x, b.top, z], size: [1.6, 1.6], n: 5 });
    }
  });
  if (items.length) deco(level, { type: 'deco', items });
  for (const g of light) level.view?.addStatic(g, { castShadow: true });
  void base;
}

// Leichte Bäume/Büsche für die Streu-Deko (weniger Dreiecke als die Deko-Bausteine, gleiche Anmutung)
const CROWNS = [[0xffcf7a, 0xf58f3a, 0xc45f22], [0xffa38a, 0xef5f44, 0xb33a2a], [0xfff0a6, 0xf6c54a, 0xc98d22], [0xb9f286, 0x6cc74d, 0x3d8f32], [0xa6ec7a, 0x58b947, 0x2f7d2a]];
function ball(r, x, y, z, pal, ws = 8, hs = 6) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.translate(x, y, z);
  const L = lin(pal[0]), M = lin(pal[1]), D = lin(pal[2]);
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(M, L, Math.min(1, n.y / 0.9), o) : mixc(M, D, Math.min(1, -n.y / 0.9), o)));
}
function lightTree(x, y, z, h, rnd) {
  const parts = [];
  const trunkH = h * 0.42, rT = 0.09 * h;
  const trunk = new THREE.CylinderGeometry(rT * 0.75, rT, trunkH, 6, 1, true);
  trunk.translate(x, y + trunkH / 2, z);
  const td = lin(0x5c3a22), tl = lin(0x8a5a36);
  parts.push(colorize(trunk, (p, n, o) => mixc(td, tl, (p.y - y) / trunkH, o)));
  const pal = CROWNS[Math.floor(rnd.frac() * CROWNS.length)];
  const R = h * 0.26;
  for (const [dx, dy, dz, r] of [[0, trunkH + R * 1.1, 0, R * 1.15], [-R * 0.75, trunkH + R * 0.55, R * 0.25, R * 0.85], [R * 0.7, trunkH + R * 0.7, -R * 0.2, R * 0.9]]) {
    parts.push(ball(r, x + dx, y + dy, z + dz, pal));
  }
  return merge(parts);
}
function lightBush(x, y, z, r, rnd) {
  const pal = CROWNS[3 + Math.floor(rnd.frac() * 2)];
  return merge([[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7]].map(([dx, dy, dz, k]) => ball(r * k, x + dx * r, y + dy * r, z + dz * r, pal, 7, 5)));
}

// ------------------------------------------------------------------ Ränder: Hecken und Zäune

/**
 * Entlang einer Randkante je Meter prüfen, was dahinter liegt:
 *   gleich hoch oder bis 3,5 m höher → Hecke auf der Außenseite (sichtbare Grenze)
 *   tiefer (Land, kein Meer)          → weißer Zaun an der Kante
 *   Meer oder hohe Klippe             → nichts (natürliche Grenze)
 */
function borderDeco(w, ground, sea, out, groundBlock) {
  const len = w.axis === 'x' ? w.z1 - w.z0 : w.x1 - w.x0;
  const n = Math.max(1, Math.round(len));
  const step = len / n;
  const cls = [];
  for (let i = 0; i < n; i++) {
    const u = (w.axis === 'x' ? w.z0 : w.x0) + (i + 0.5) * step;
    const [ix, iz, ox, oz] = w.axis === 'x'
      ? [w.x - w.side * 0.25, u, w.x + w.side * 0.75, u]
      : [u, w.z - w.side * 0.25, u, w.z + w.side * 0.75];
    const hin = ground(ix, iz), hout = ground(ox, oz);
    let c = 'none', y = 0;
    if (hin !== null && hout !== null && hout > sea + 0.3 && !groundBlock(ox, oz)?.noEdge) {
      const dh = hout - hin;
      if (dh > -0.45 && dh < 3.6) { c = 'hedge'; y = hout; }
      else if (dh <= -0.45) { c = 'fence'; y = hin; }
    }
    cls.push({ c, y, u });
  }
  // gleiche Abschnitte zusammenfassen
  let i = 0;
  while (i < n) {
    const c = cls[i].c, y = cls[i].y;
    let j = i;
    while (j + 1 < n && cls[j + 1].c === c && Math.abs(cls[j + 1].y - y) < 0.05) j++;
    if (c !== 'none') {
      const a = (w.axis === 'x' ? w.z0 : w.x0) + i * step, b = (w.axis === 'x' ? w.z0 : w.x0) + (j + 1) * step;
      const L = b - a, mid = (a + b) / 2;
      let g;
      if (c === 'hedge') {
        g = hedgeGeo(L + 0.2, 1.1, 0.9, Math.floor(mid * 7 + 13) >>> 0);
        const off = w.side * 0.45;
        if (w.axis === 'x') { g.rotateY(Math.PI / 2); g.translate(w.x + off, y, mid); }
        else g.translate(mid, y, w.z + off);
      } else {
        g = fenceGeo(L);
        const off = w.side * 0.12;
        if (w.axis === 'x') { g.rotateY(Math.PI / 2); g.translate(w.x + off, y, mid); }
        else g.translate(mid, y, w.z + off);
      }
      out[c].push(g);
    }
    i = j + 1;
  }
}

// ------------------------------------------------------------------ Wege

const SKIP_TAGS = new Set(['bridge', 'stairs', 'ramp', 'platform', 'water']);

/** Platten (1 m) entlang der Weg-Polylinien, 2 m breit; nur auf ebenem, begehbarem Gelände. */
function buildPaths(level, map, grid, ground, sea) {
  const tiles = new Map();
  for (const pl of map.paths ?? []) {
    for (let k = 0; k < pl.length - 1; k++) {
      const [ax, az] = pl[k], [bx, bz] = pl[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * 4));
      for (let s = 0; s <= n; s++) {
        const x = ax + ((bx - ax) * s) / n, z = az + ((bz - az) * s) / n;
        for (let i = Math.floor(x - 0.99); i <= Math.floor(x + 0.99); i++) {
          for (let j = Math.floor(z - 0.99); j <= Math.floor(z + 0.99); j++) tiles.set(`${i},${j}`, [i, j]);
        }
      }
    }
  }
  if (!level.view) return tiles.size;
  const rnd = new Rnd(0x9a7e);
  const a = lin(0xf6e7c1), b2 = lin(0xead6a6), edge = lin(0xd9c28e);
  const parts = [];
  let count = 0;
  for (const [i, j] of tiles.values()) {
    const cx = i + 0.5, cz = j + 0.5;
    // ganz auf begehbarem Gelände und eben?
    const corners = [[i + 0.1, j + 0.1], [i + 0.9, j + 0.1], [i + 0.1, j + 0.9], [i + 0.9, j + 0.9]];
    if (!corners.every(([x, z]) => grid.isWalk(x, z))) continue;
    const hit = level.world.raycastDown(cx, 80, cz, 120);
    if (!hit || hit.y < sea + 0.3 || SKIP_TAGS.has(hit.shape.tag) || hit.shape.tag === 'podium') continue;
    const hs = corners.map(([x, z]) => ground(x, z));
    if (hs.some((h) => h === null || Math.abs(h - hit.y) > 0.02)) continue;
    const base = mixc(a, b2, rnd.frac(), [0, 0, 0]);
    const g = colorize(new THREE.BoxGeometry(0.9, 0.1, 0.9), (p, n, o) => { if (n.y > 0.6) { o[0] = base[0]; o[1] = base[1]; o[2] = base[2]; } else mixc(base, edge, 0.7, o); });
    g.translate(cx, hit.y + 0.01, cz);
    parts.push(g);
    count++;
  }
  for (const g of parts) level.view.addStatic(g, { castShadow: false });
  return count;
}

