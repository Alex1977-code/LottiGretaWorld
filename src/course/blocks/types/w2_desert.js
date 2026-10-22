// Welt-2-Bausteine Wüste (Bauplan 2-1, 2-5): Fliesen und Fliesenbrücke, schmale Brücke, Goldröhre, Oase, Kistenfeld.
//
// fliesenbruecke – Brücke aus beweglichen Fliesen (Modell 'fliese': Sandstein mit Goldrand und Mosaik):
//   { type: 'fliesenbruecke', from: [x, y, z], to: [x, y, z] (Lauffläche, y = Oberseite der Fliesen),
//     width: 2 (quer), tile: 2 (Länge je Fliese), gap: 0.3, thick: 0.4,
//     mode: 'slide' (Standard: Fliesen pendeln im Wellentakt seitlich – „verschiebende Brücke“)
//         | 'shift' (Betreten → nach `delay` s weicht die Fliese seitlich aus, kommt nach `stay` s zurück)
//         | 'drop'  (Betreten → wackelt `delay` s, kippt weg und fällt, kehrt `respawn` s nach Beginn des Falls zurück)
//         | 'build' (Fliesen bauen sich nacheinander vor der Figur auf: `ahead` Fliesen voraus)
//         | 'static',
//     slide: { amp: 1.5 (m), period: 3 (s), wave: 0.7 (rad Phasenversatz je Fliese) },
//     shift: 2 (m), alternate: true (abwechselnd links/rechts), delay: 0.35 (shift) / 0.6 (drop), speed: 4 (m/s),
//     stay: 2.5 (s), respawn: 3 (s), ahead: 2, trigger: 3 (m vor der ersten Fliese startet der Aufbau), vanish: 0
//     (build: s, nach denen verlassene Fliesen wieder verschwinden; 0 = bleiben), id }
//   level.named.get(id) = { tiles: [{ x, y, z, off, state, box }], reset() }
//   Beispiel: { type: 'fliesenbruecke', from: [0, 1, -40], to: [0, 1, -70], mode: 'slide', slide: { amp: 1.2 } }
// fliese – einzelne Fliese mit denselben Modi: { type: 'fliese', pos: [x, y, z] (Mitte der Unterseite),
//   size: [x, z] ([2, 2]), thick, mode, axis: [dx, dz] (Verschieberichtung, Standard [1, 0]), … wie oben }
//
// schmale_bruecke – 1 m schmaler Steg (Bauplan 2-1): { type: 'schmale_bruecke', from, to (Lauffläche), width: 1,
//   style: 'sandstein' (Standard) | 'holz' | 'stein', posts: true (Pfosten an den Enden) }
//
// goldroehre – goldene Warp-Röhre (wie pipe, Modell 'goldroehre'): auf der Röhre ducken → Teleport.
//   { type: 'goldroehre', id, pos: [x, y, z] (Mitte der Unterseite), height: 2, radius: 0.9,
//     target: Id einer Röhre (pipe/goldroehre) | [x, y, z] (Absetzpunkt) }
//   Bonusraum mit Münzregen: Entität goldschalter (entities/kinds/w2_gimmicks.js).
//
// oase – Wasserbecken mit Sandrand, Palmen und Schilf (Bauplan 2-1 „Oase und Checkpoint“):
//   { type: 'oase', pos: [x, y, z] (Mitte, y = Oberkante des Sandrands), size: [w, d] (Wasserfläche, [6, 5]),
//     depth: 1.6 (Wassertiefe), rim: 2 (Sandrand rundum, begehbar), base: 1 (Dicke unter dem Rand),
//     palms: 3 | [[x, z, höhe?], …] (Palmen; Zahl = rund um den Teich), reeds: true }
//   Kollision: Sandrand (4 Quader), Beckenboden, Wasser (schwimmbar). Umgebendes Gelände darf das Becken nicht
//   überdecken (Rand außen: w + 2·rim × d + 2·rim).
//
// kistenfeld – Gitter aus Holzkisten (Entität crate): { type: 'kistenfeld', pos: [x, y, z] (Mitte der Unterseite),
//   grid: [Spalten, Reihen] | [Spalten, Reihen, Lagen], size: 1 (Kantenlänge), gap: 0.05,
//   fill: 'coin' (Inhalt aller Kisten; 'none' = leer), contents: { 'c,r': Inhalt, 'c,r,l': Inhalt } | [[c, r, Inhalt],
//   [c, r, l, Inhalt]] (Spalte von links, Reihe von hinten nach vorn, Lage von unten), id (→ level.named: { crates }) }
//   Beispiel: { type: 'kistenfeld', pos: [0, 1, -30], grid: [5, 3], contents: { '2,1': 'star:0', '4,2': 'funken' } }

import * as THREE from 'three';
import { v3, box, hex, lin, mixc, colorize, merge, themeOf, addStatic, addObject, islandParts, Rnd } from '../kit.js';
import { MovingBox, modelObject, yawOf, bakeModel, figures } from '../w2kit.js';
import { getModel } from '../../models/index.js';
import { buildWater } from './water.js';

// ------------------------------------------------------------------ Fliesen

function tilePool(level, sx, sz, thick) {
  if (!level.view) return null;
  return level.view.pool(`fliese:${sx}x${sz}x${thick}`, () => getModel('fliese', { size: [sx, sz], thick }).root, { castShadow: true, capacity: 24 });
}

/**
 * Eine Fliese: Mitte der Unterseite (x, y, z), Größe lx (lokal X) × lz (lokal Z), Gier yaw, Seitenachse ax/az.
 * cfg = gemeinsame Einstellungen (Modus usw.), i = Index (Wellen-Phase, abwechselnde Seite).
 */
function makeTile(level, x, y, z, lx, lz, yaw, ax, az, thick, cfg, i, pool) {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  const wx = lx * c + lz * s, wz = lx * s + lz * c;            // achsenparalleler Umriss
  const hidden = cfg.mode === 'build';
  const bx = new MovingBox(level, x, y, z, wx, thick, wz, { tag: 'fliese', solid: !hidden });
  const t = { x, y, z, ax, az, i, off: 0, state: hidden ? 'hidden' : 'idle', t: 0, vy: 0, dy: 0, box: bx, shake: 0, pop: hidden ? 0 : 1, tilt: 0, fall: 0 };
  bx.shape.owner = t;
  if (pool) t.idx = pool.alloc();
  t.render = (dt, tt) => {
    if (!pool) return;
    if (t.state === 'hidden' || t.state === 'gone') { pool.hide(t.idx); return; }
    t.pop = Math.min(1, t.pop + dt * 4);
    const k = t.pop < 1 ? Math.max(0.05, Math.sin(t.pop * Math.PI * 0.5) + Math.sin(t.pop * Math.PI) * 0.15) : 1;
    const j = t.state === 'shake' ? 0.025 + t.shake * 0.04 : 0;
    const jx = Math.sin(tt * 61 + i) * j, jz = Math.cos(tt * 53 + i) * j;
    const rise = t.pop < 1 ? (1 - t.pop) * -1.2 : 0;
    pool.set(t.idx, bx.pos.x + jx, bx.pos.y + rise, bx.pos.z + jz, yaw, k, t.tilt * az, -t.tilt * ax);
  };
  return t;
}

function stepTile(level, t, cfg, dt, time) {
  const bx = t.box;
  const on = bx.carried(level) > 0;
  t.t += dt;
  let off = t.off, y = t.y;
  switch (cfg.mode) {
    case 'slide': {
      const sl = cfg.slide ?? {};
      const amp = sl.amp ?? 1.5, period = sl.period ?? 3, wave = sl.wave ?? 0.7;
      off = amp * Math.sin((time / period) * Math.PI * 2 + t.i * wave + (sl.phase ?? 0));
      break;
    }
    case 'shift': {
      const dist = (cfg.shift ?? 2) * (cfg.alternate === false ? 1 : (t.i % 2 ? -1 : 1));
      const sp = cfg.speed ?? 4;
      if (t.state === 'idle' && on) { t.state = 'shake'; t.t = 0; level.sfx('step'); }
      if (t.state === 'shake') { t.shake = Math.min(1, t.t / (cfg.delay ?? 0.35)); if (t.t >= (cfg.delay ?? 0.35)) { t.state = 'out'; t.t = 0; t.shake = 0; } }
      if (t.state === 'out') { off = Math.abs(dist - off) <= sp * dt ? dist : off + Math.sign(dist - off) * sp * dt; if (off === dist && t.t > (cfg.stay ?? 2.5)) { t.state = 'back'; t.t = 0; } }
      if (t.state === 'back') { off = Math.abs(off) <= sp * 0.6 * dt ? 0 : off - Math.sign(off) * sp * 0.6 * dt; if (off === 0) { t.state = 'idle'; t.t = 0; } }
      break;
    }
    case 'drop': {
      if (t.state === 'idle' && on) { t.state = 'shake'; t.t = 0; level.sfx('step'); }
      if (t.state === 'shake') {
        t.shake = Math.min(1, t.t / (cfg.delay ?? 0.6));
        if (t.t >= (cfg.delay ?? 0.6)) { t.state = 'fall'; t.t = 0; t.vy = 0; level.sfx('vanish'); }
      } else if (t.state === 'fall') {
        t.vy = Math.min(t.vy + 26 * dt, 18);
        t.fall += t.vy * dt;
        t.tilt = Math.min(0.9, t.tilt + dt * 1.6);
        y = t.y - t.fall;
        if (t.t > 1.6) { t.state = 'gone'; bx.setSolid(false); }   // t läuft weiter: Wiederkehr respawn s nach Beginn des Falls
      } else if (t.state === 'gone' && (cfg.respawn ?? 3) > 0 && t.t >= Math.max(1.7, cfg.respawn ?? 3)) {
        t.state = 'idle'; t.t = 0; t.fall = 0; t.tilt = 0; t.pop = 0; y = t.y;
        bx.moveTo(t.x, t.y, t.z, 0); bx.setSolid(true);
        level.effects?.sparks({ x: t.x, y: t.y + 0.4, z: t.z }, 6);
      }
      if (t.state === 'fall') y = t.y - t.fall;
      else if (t.state !== 'gone') y = t.y;
      break;
    }
    default: break;
  }
  if (t.state === 'gone' || t.state === 'hidden') { bx.still(); t.off = off; return; }
  t.off = off;
  bx.moveTo(t.x + t.ax * off, y, t.z + t.az * off, dt);
}

function buildTiles(level, spec, list) {
  const thick = spec.thick ?? 0.4;
  const cfg = { ...spec, mode: spec.mode ?? (list.length > 1 ? 'slide' : 'static') };
  const pool = list.length ? tilePool(level, list[0].lx, list[0].lz, thick) : null;
  const tiles = list.map((q, i) => makeTile(level, q.x, q.y - (q.top ? thick : 0), q.z, q.lx, q.lz, q.yaw, q.ax, q.az, thick, cfg, i, pool));
  const h = { tiles, built: 0, started: false };
  h.reset = () => {
    for (const t of tiles) {
      t.off = 0; t.fall = 0; t.tilt = 0; t.t = 0;
      if (cfg.mode === 'build') { t.state = 'hidden'; t.box.setSolid(false); } else { t.state = 'idle'; t.box.setSolid(true); }
      t.box.moveTo(t.x, t.y, t.z, 0);
    }
    h.built = 0; h.started = false;
  };
  const showTile = (t) => {
    if (t.state !== 'hidden') return;
    t.state = 'idle'; t.pop = 0; t.t = 0; t.box.moveTo(t.x, t.y, t.z, 0); t.box.setSolid(true);
    level.sfx('blockhit');
    level.effects?.sparks({ x: t.x, y: t.y + thick, z: t.z }, 5);
  };
  let buildT = 0;
  level.onStep((dt, time) => {
    if (cfg.mode === 'build') {
      const figs = figures(level);
      let cur = -1;
      tiles.forEach((t, i) => { if (t.box.carried(level) > 0) cur = i; });
      if (!h.started && tiles.length) {
        const t0 = tiles[0];
        const near = figs.some((pl) => Math.hypot(pl.pos.x - t0.x, pl.pos.z - t0.z) < (cfg.trigger ?? 3) + Math.max(t0.box.size.x, t0.box.size.z) / 2 && Math.abs(pl.pos.y - (t0.y + thick)) < 2.5);
        if (near) h.started = true;
      }
      if (h.started) {
        const want = Math.min(tiles.length, Math.max(cur + 1, 0) + (cfg.ahead ?? 2));
        buildT += dt;
        if (h.built < want && buildT >= (cfg.delay ?? 0.15)) { showTile(tiles[h.built]); h.built++; buildT = 0; }
      }
      const vanish = cfg.vanish ?? 0;
      if (vanish > 0) {
        for (let i = 0; i < tiles.length; i++) {
          const t = tiles[i];
          if (t.state !== 'idle' || i >= cur || cur < 0) { if (t.box.carried(level) > 0) t.t = 0; continue; }
          if (t.t > vanish) { t.state = 'hidden'; t.box.setSolid(false); level.sfx('vanish'); }
        }
      }
      for (const t of tiles) if (t.state !== 'hidden') t.box.still();
      return;
    }
    for (const t of tiles) stepTile(level, t, cfg, dt, time);
  });
  if (level.view && pool) {
    const holder = {};
    level.view.onFrame((dt, tt) => {
      const d = Math.min(1, Math.max(dt, level.time - (holder.t ?? level.time)));
      holder.t = level.time;
      for (const t of tiles) t.render(d, tt);
    });
  }
  if (spec.id) level.named.set(spec.id, h);
  return h;
}

export function buildFliesenbruecke(level, spec) {
  const a = v3(spec.from), b = v3(spec.to);
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  if (L < 0.5) return null;
  const ux = dx / L, uz = dz / L;
  const tile = spec.tile ?? 2, gap = spec.gap ?? 0.3, width = spec.width ?? 2;
  const n = Math.max(1, Math.floor((L + gap) / (tile + gap)));
  const step = n > 1 ? (L - tile) / (n - 1) : 0;
  const yaw = yawOf(ux, uz);
  const ax = -uz, az = ux;                        // quer zur Brücke (seitliches Verschieben)
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = n > 1 ? tile / 2 + i * step : L / 2;
    const k = s / L;
    list.push({ x: a.x + ux * s, y: a.y + (b.y - a.y) * k, z: a.z + uz * s, lx: tile, lz: width, yaw, ax, az, top: true });
  }
  return buildTiles(level, spec, list);
}

export function buildFliese(level, spec) {
  const p = v3(spec.pos);
  const sz = Array.isArray(spec.size) ? spec.size : [spec.size ?? 2, spec.size ?? 2];
  const axis = spec.axis ?? [1, 0];
  const l = Math.hypot(axis[0], axis[1]) || 1;
  return buildTiles(level, { mode: 'static', ...spec }, [{ x: p.x, y: p.y, z: p.z, lx: sz[0], lz: sz[1], yaw: spec.yaw ?? 0, ax: axis[0] / l, az: axis[1] / l }]);
}

// ------------------------------------------------------------------ Schmale Brücke

const NARROW = {
  sandstein: { top: 0xf0c98a, side: 0xc98a4e, dark: 0x9a6232, joint: 0xb47844 },
  holz: { top: 0xd99b5c, side: 0xa86a38, dark: 0x7a4a26, joint: 0x8f5a30 },
  stein: { top: 0xd8d4e2, side: 0xa8a2b8, dark: 0x7a748a, joint: 0x8f8aa0 },
};

export function buildSchmaleBruecke(level, spec) {
  const a = v3(spec.from), b = v3(spec.to);
  const w = spec.width ?? 1;
  const T = 0.5;
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  if (L < 0.05) return;
  const ux = dx / L, uz = dz / L;
  const alongZ = Math.abs(dx) < 1e-3, alongX = Math.abs(dz) < 1e-3;
  if (alongZ || alongX) {
    const hw = w / 2;
    const min = alongZ ? [a.x - hw, Math.min(a.y, b.y) - T, Math.min(a.z, b.z)] : [Math.min(a.x, b.x), Math.min(a.y, b.y) - T, a.z - hw];
    const max = alongZ ? [a.x + hw, Math.max(a.y, b.y), Math.max(a.z, b.z)] : [Math.max(a.x, b.x), Math.max(a.y, b.y), a.z + hw];
    if (Math.abs(a.y - b.y) < 1e-3) level.world.add({ type: 'box', min, max, tag: 'schmale_bruecke' });
    else {
      const axis = alongZ ? 'z' : 'x';
      const rising = (b.y > a.y) === (axis === 'z' ? b.z > a.z : b.x > a.x) ? 1 : -1;
      level.world.add({ type: 'ramp', min, max, axis, dir: rising, low: Math.min(a.y, b.y), tag: 'schmale_bruecke' });
    }
  } else {
    const n = Math.ceil(L / 0.4);
    for (let i = 0; i < n; i++) {
      const tm = (i + 0.5) / n;
      const cx = a.x + dx * tm, cz = a.z + dz * tm, y = a.y + (b.y - a.y) * tm;
      const hx = (Math.abs(ux) * (L / n) + Math.abs(uz) * w) / 2, hz = (Math.abs(uz) * (L / n) + Math.abs(ux) * w) / 2;
      level.world.add({ type: 'box', min: [cx - hx, y - T, cz - hz], max: [cx + hx, y, cz + hz], tag: 'schmale_bruecke' });
    }
  }
  if (!level.view) return;
  const C = NARROW[spec.style ?? 'sandstein'] ?? NARROW.sandstein;
  const parts = [];
  const slope = (b.y - a.y) / L, pitch = Math.atan(slope);
  const seg = spec.style === 'holz' ? 0.5 : 1.0;
  const n = Math.max(1, Math.round(L / seg));
  const rnd = new Rnd(Math.floor(a.x * 7 + a.z * 13) >>> 0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const shade = 0.92 + rnd.frac() * 0.12;
    const g = box(L / n - 0.04, T, w, 0, 0, 0, C.side, { r: 0.05, seg: 1, topColor: new THREE.Color(C.top).multiplyScalar(shade).getHex() });
    g.rotateZ(pitch);
    g.translate(t * L, slope * t * L - T / 2, 0);
    parts.push(g);
  }
  // Fugen-Unterzug
  const beam = box(L, 0.18, w * 0.7, 0, 0, 0, C.dark, { r: 0.04, seg: 1 });
  beam.rotateZ(pitch); beam.translate(L / 2, slope * L / 2 - T - 0.08, 0);
  parts.push(beam);
  if (spec.posts !== false) {
    for (const t of [0, 1]) for (const s of [-1, 1]) parts.push(box(0.22, 0.7, 0.22, t * L + (t ? -0.15 : 0.15), slope * t * L + 0.3, s * (w / 2 + 0.05), C.joint, { r: 0.06, seg: 1, topColor: C.top }));
  }
  const g = merge(parts);
  g.rotateY(yawOf(ux, uz));
  g.translate(a.x, a.y, a.z);
  addStatic(level, g);
}

// ------------------------------------------------------------------ Goldröhre

export function buildGoldroehre(level, spec) {
  const p = v3(spec.pos);
  const h = spec.height ?? 2, R = spec.radius ?? 0.9;
  const top = p.y + h;
  const info = { id: spec.id ?? null, x: p.x, z: p.z, top, pipe: true, gold: true, enterRadius: Math.max(0.35, R * 0.6) };
  info.enter = (player) => {
    const t = spec.target;
    if (t === undefined || t === null) return;
    let exit = null;
    if (typeof t === 'string') { const other = level.named.get(t); if (other?.pipe) exit = other; }
    else exit = { pos: t };
    if (!exit) { console.warn(`[Goldröhre] Ziel ${t} fehlt`); return; }
    player.enterPipe({ ...info, exit });
  };
  if (spec.id) level.named.set(spec.id, info);
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R + 0.08, y0: p.y, y1: top, pipe: spec.target !== undefined ? info : null, tag: 'goldroehre' });
  modelObject(level, 'goldroehre', { height: h, radius: R }, p.x, p.y, p.z, 0, {});
  return info;
}

// ------------------------------------------------------------------ Oase

export function buildOase(level, spec) {
  const p = v3(spec.pos);
  const [w, d] = Array.isArray(spec.size) ? spec.size : [spec.size ?? 6, spec.size ?? 5];
  const depth = spec.depth ?? 1.6, rim = spec.rim ?? 2, base = spec.base ?? 1;
  const th = themeOf(level);
  const x0 = p.x - w / 2, x1 = p.x + w / 2, z0 = p.z - d / 2, z1 = p.z + d / 2;
  const X0 = x0 - rim, X1 = x1 + rim, Z0 = z0 - rim, Z1 = z1 + rim;
  const yb = p.y - depth - base;
  // Sandrand (4 Quader) und Beckenboden
  const rims = [[X0, Z0, X1, z0], [X0, z1, X1, Z1], [X0, z0, x0, z1], [x1, z0, X1, z1]];
  for (const [a0, b0, a1, b1] of rims) level.world.add({ type: 'box', min: [a0, yb, b0], max: [a1, p.y, b1], tag: 'oase' });
  level.world.add({ type: 'box', min: [x0, yb, z0], max: [x1, p.y - depth, z1], tag: 'oase:boden' });
  buildWater(level, { pos: [p.x, p.y - depth, p.z], size: [w, depth - 0.22, d] });
  if (!level.view) return;
  const sand = 0xf3d68e, sandSide = 0xd8a85a, wet = 0xb98a4a;
  const parts = [];
  for (const [a0, b0, a1, b1] of rims) {
    parts.push(...islandParts(a0, yb, b0, a1, p.y, b1, { ...th, dirt: sandSide, dirtDeep: 0xb07a3a }, { top: 'sand', capH: 0.3 }));
  }
  // Beckenwände (nass, dunkler) und Grund
  const inner = [[x0 + 0.02, p.z, 0.04, d], [x1 - 0.02, p.z, 0.04, d]];
  for (const [x, z, ww, dd] of inner) parts.push(box(ww, depth, dd, x, p.y - depth / 2, z, wet, { r: 0, seg: 0 }));
  for (const z of [z0 + 0.02, z1 - 0.02]) parts.push(box(w, depth, 0.04, p.x, p.y - depth / 2, z, wet, { r: 0, seg: 0 }));
  parts.push(box(w, 0.06, d, p.x, p.y - depth + 0.03, p.z, 0x6aa8a0, { r: 0, seg: 0 }));
  // Kiesel am Ufer
  const rnd = new Rnd(Math.floor(p.x * 31 + p.z * 17) >>> 0);
  for (let i = 0; i < 14; i++) {
    const side = i % 4;
    const t = rnd.frac();
    const x = side < 2 ? x0 + t * w : (side === 2 ? x0 - 0.35 : x1 + 0.35);
    const z = side < 2 ? (side === 0 ? z0 - 0.35 : z1 + 0.35) : z0 + t * d;
    const g = new THREE.SphereGeometry(rnd.real(0.12, 0.26), 6, 4);
    g.scale(1, 0.55, 1); g.translate(x, p.y + 0.04, z);
    const c = lin(hex(rnd.pick([0xe8dcc8, 0xc9b8a0, 0xd8c8b0])));
    parts.push(colorize(g.toNonIndexed(), (pp, nn, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  if (spec.reeds !== false) {
    const stem = lin(0x5f9a3a), tip = lin(0x8a5a2a);
    for (let i = 0; i < 10; i++) {
      const corner = i % 4;
      const x = (corner & 1 ? x1 : x0) + (corner & 1 ? -1 : 1) * rnd.real(0.2, 0.9);
      const z = (corner & 2 ? z1 : z0) + (corner & 2 ? -1 : 1) * rnd.real(0.15, 0.6);
      const hh = rnd.real(0.7, 1.3);
      const g = new THREE.CylinderGeometry(0.025, 0.035, hh, 4, 1, true);
      g.translate(x, p.y - 0.25 + hh / 2, z);
      parts.push(colorize(g.toNonIndexed(), (pp, nn, o) => { o[0] = stem[0]; o[1] = stem[1]; o[2] = stem[2]; }));
      const c = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 5);
      c.translate(x, p.y - 0.25 + hh - 0.1, z);
      parts.push(colorize(c.toNonIndexed(), (pp, nn, o) => { o[0] = tip[0]; o[1] = tip[1]; o[2] = tip[2]; }));
    }
  }
  addStatic(level, merge(parts));
  // Palmen (in die statische Geometrie verschmolzen) mit Stamm-Kollision
  let palms = spec.palms ?? 3;
  if (typeof palms === 'number') {
    const n = palms; palms = [];
    const spots = [[X0 + rim * 0.5, Z0 + rim * 0.55], [X1 - rim * 0.45, Z0 + rim * 0.4], [X1 - rim * 0.5, Z1 - rim * 0.5], [X0 + rim * 0.45, Z1 - rim * 0.45], [p.x, Z0 + rim * 0.4]];
    for (let i = 0; i < Math.min(n, spots.length); i++) palms.push(spots[i]);
  }
  palms.forEach((q, i) => {
    const hgt = q[2] ?? 4 + ((i * 0.7) % 1.2);
    const lean = 0.18 + (i % 3) * 0.06;
    const yaw = Math.atan2(-(p.z - q[1]), -(p.x - q[0])) + Math.PI; // Krone neigt sich vom Wasser weg … zur Mitte
    bakeModel(level, 'palme', { height: hgt, lean }, q[0], p.y, q[1], yaw + Math.PI, 1, { sway: 0 });
    level.world.add({ type: 'cyl', x: q[0], z: q[1], r: 0.24, y0: p.y, y1: p.y + 2.2, tag: 'palme' });
  });
}

// ------------------------------------------------------------------ Kistenfeld

export function buildKistenfeld(level, spec) {
  const p = v3(spec.pos);
  const [cols, rows, layers = 1] = spec.grid ?? [4, 3];
  const s = spec.size ?? 1, gap = spec.gap ?? 0.05;
  const step = s + gap;
  const map = new Map();
  const cs = spec.contents;
  if (Array.isArray(cs)) for (const e of cs) { if (e.length >= 4) map.set(`${e[0]},${e[1]},${e[2]}`, e[3]); else map.set(`${e[0]},${e[1]},0`, e[2]); }
  else if (cs) for (const [k, v] of Object.entries(cs)) map.set(k.split(',').length === 2 ? `${k},0` : k, v);
  const crates = [];
  for (let l = 0; l < layers; l++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = p.x + (c - (cols - 1) / 2) * step;
        const z = p.z + (r - (rows - 1) / 2) * step;
        const y = p.y + l * s;
        const content = map.get(`${c},${r},${l}`) ?? spec.fill ?? 'coin';
        const e = level.spawn('crate', { pos: [x, y, z], size: s, content });
        if (e) crates.push(e);
      }
    }
  }
  const h = { crates, get left() { return crates.filter((e) => e.alive && !e.removed).length; } };
  if (spec.id) level.named.set(spec.id, h);
  return h;
}

export const TYPES = {
  fliesenbruecke: buildFliesenbruecke,
  fliese: buildFliese,
  schmale_bruecke: buildSchmaleBruecke,
  goldroehre: buildGoldroehre,
  oase: buildOase,
  kistenfeld: buildKistenfeld,
};
