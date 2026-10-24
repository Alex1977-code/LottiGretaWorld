// Rot-Blau-Flipper (Bauplan 5-6 „Torten-Welt, Rot-Blau-Flipper wechseln bei jedem Sprung“; Baustein-Tabelle
// „Rot-Blau-Flipper: wechseln bei jedem Sprung des Spielers zwischen fest und durchlässig“).
//
// Die aktive Farbe des Levels (level.flipper.color, Start LEVEL.flipperStart ?? 'rot') wechselt bei JEDEM Sprung einer
// Figur – Boden-, Wand-, Ranken-, Zaun-, Trapez- und Schwimm-Absprung, auch der Klone (level.onJump); springen mehrere
// Figuren im selben Simulationsschritt, wechselt sie einmal. Felder der aktiven Farbe liegen fest und zeigen ihre farbige
// Platte (begehbar, sicher); alle anderen klappen in 0,22 s um ihre Querachse um und zeigen die Rückseite – ein
// durchscheinendes Gitter mit Rahmen: man fällt hindurch. Wird ein Feld fest, während eine Figur darin steckt, schiebt es
// sie zuerst sanft hinaus (w4kit pushOutOf) und wird danach fest. Nach einem Neustart gilt wieder die Startfarbe.
//
// Feld-Raster:
//   { type: 'flipper', id, pos: [x, y, z] (Mitte der Oberseite des Rasters), grid: [nx, nz] (Zellen), cell: 2 (m),
//     gap: 0.12, thick: 0.35, map: ['rb.b', …] (Zeilen von vorn (+Z) nach hinten (−Z), Zeichen r | b | '.' leer) |
//     pattern: 'checker' (Standard) | 'rows' | 'cols' | 'rot' | 'blau', first: 'rot' (Farbe der Zelle vorn links) }
// Wechselplattformen:
//   { type: 'flipper', id, platforms: [{ pos: [x, y, z] (Mitte der Oberseite), size: [w, d], color: 'rot' | 'blau' }],
//     thick: 0.4 }
// Laufzeit: level.flipper = { color, flips, start, flip(), set(color), onFlip(fn(color)) → abmelden, solidAt(x, z),
//   info() }; level.named.get(id) = { tiles: [{ x, y, z, w, d, color, solid }], info() }.
// Modelle (Registry, sobald es sie gibt): 'flipper_feld' ({ color: 'rot' | 'blau' }) wird als Platte (1 × 1 × 1, Mitte)
// instanziert; sonst eigene Geometrie (Rahmen + Platte mit Zeichen ● bzw. ◆ + Gitter).

import * as THREE from 'three';
import { v3, lin, mixc, colorize, merge, hex, box, addObject } from '../kit.js';
import { figures } from '../w2kit.js';
import { penetrates, pushOutOf } from '../w4kit.js';
import { visDt } from '../../entities/gimmick.js';

const FLIP_T = 0.22;
export const FLIP_COLORS = {
  rot: { plate: 0xff4a4a, rim: 0xb8222e, mark: 0xffd0c8, grid: 0xff6a6a },
  blau: { plate: 0x3d8bff, rim: 0x1c4fb8, mark: 0xd0e4ff, grid: 0x6aa8ff },
};
const norm = (c) => (c === 'b' || c === 'blau' || c === 'blue' ? 'blau' : 'rot');
const other = (c) => (c === 'rot' ? 'blau' : 'rot');

// ------------------------------------------------------------------ Geometrie (Einheitsfeld 1 × 1 × 1, Mitte im Ursprung)

/** Rahmen: vier Leisten am Rand (immer sichtbar, dreht mit). */
function rimGeo(color) {
  const C = FLIP_COLORS[color];
  const parts = [];
  const k = 0.09;
  parts.push(box(1, 1, k, 0, 0, 0.5 - k / 2, C.rim, { r: 0.02, seg: 1 }));
  parts.push(box(1, 1, k, 0, 0, -0.5 + k / 2, C.rim, { r: 0.02, seg: 1 }));
  parts.push(box(k, 1, 1 - 2 * k, 0.5 - k / 2, 0, 0, C.rim, { r: 0.02, seg: 1 }));
  parts.push(box(k, 1, 1 - 2 * k, -0.5 + k / 2, 0, 0, C.rim, { r: 0.02, seg: 1 }));
  return merge(parts);
}

/** Feste Platte (Vorderseite oben) mit hellem Zeichen: Rot ● (Ring), Blau ◆ (Raute) – auch ohne Farbsehen lesbar. */
function plateGeo(color) {
  const C = FLIP_COLORS[color];
  const parts = [box(0.84, 0.82, 0.84, 0, -0.04, 0, C.plate, { r: 0.03, seg: 1, topColor: C.plate })];
  const mk = lin(hex(C.mark));
  const mark = color === 'rot' ? new THREE.RingGeometry(0.14, 0.26, 20) : new THREE.CircleGeometry(0.26, 4);
  mark.rotateX(-Math.PI / 2);
  mark.translate(0, 0.375, 0);
  parts.push(colorize(mark.toNonIndexed(), (p, n, o) => { o[0] = mk[0]; o[1] = mk[1]; o[2] = mk[2]; }));
  return merge(parts);
}

/** Rückseite: durchscheinendes Gitter (3 × 3 Stäbe + zarte Füllung) auf der Unterseite (nach dem Umklappen oben). */
function gridGeo(color) {
  const C = FLIP_COLORS[color];
  const col = lin(hex(C.grid));
  const parts = [];
  for (let i = 1; i < 4; i++) {
    const u = -0.5 + i * 0.25;
    const a = new THREE.BoxGeometry(0.82, 0.05, 0.04); a.translate(0, -0.45, u);
    const b = new THREE.BoxGeometry(0.04, 0.05, 0.82); b.translate(u, -0.45, 0);
    parts.push(a.toNonIndexed(), b.toNonIndexed());
  }
  const fill = new THREE.PlaneGeometry(0.82, 0.82); fill.rotateX(Math.PI / 2); fill.translate(0, -0.43, 0);
  parts.push(fill.toNonIndexed());
  return colorize(merge(parts), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
}

// ------------------------------------------------------------------ System (eins je Level)

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3(1, 0, 0);

function flipperSystem(level) {
  if (level.flipper) return level.flipper;
  const start = norm(level.data?.flipperStart ?? 'rot');
  const tiles = [];
  const listeners = new Set();
  let lastT = -1;
  const sys = {
    color: start, start, flips: 0, tiles,
    flip() { sys.set(other(sys.color)); },
    set(color) {
      color = norm(color);
      if (color === sys.color) return;
      sys.color = color;
      sys.flips++;
      for (const t of tiles) apply(t);
      level.sfx('flip');
      for (const fn of [...listeners]) fn(color);
    },
    onFlip(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Festes Feld unter (x, z)? → Feld | null */
    solidAt(x, z) { return tiles.find((t) => t.solid && Math.abs(x - t.x) <= t.w / 2 && Math.abs(z - t.z) <= t.d / 2) ?? null; },
    info: () => ({ color: sys.color, flips: sys.flips, tiles: tiles.length, solid: tiles.filter((t) => t.solid).length, pending: tiles.filter((t) => t.pending).length }),
  };
  /** Feld an die aktive Farbe anpassen: fest/durchlässig, Klapp-Animation starten. */
  function apply(t) {
    const want = t.color === sys.color;
    t.target = want ? 0 : Math.PI;
    if (Math.abs(t.angle - t.target) > 1e-3) t.anim = true;
    if (!want) { setSolid(t, false); t.pending = false; }
    else t.pending = true;   // wird im nächsten Schritt fest (oder schiebt zuerst hinaus)
  }
  function setSolid(t, on) {
    if (on && t.sid === null) { t.sid = level.world.add(t.shape); t.solid = true; }
    else if (!on && t.sid !== null) { level.world.remove(t.sid); t.sid = null; t.solid = false; }
  }
  sys.add = (t) => {
    t.shape = { type: 'box', min: [t.x - t.w / 2, t.y - t.thick, t.z - t.d / 2], max: [t.x + t.w / 2, t.y, t.z + t.d / 2], tag: 'flipper', flipper: t.color, camIgnore: true, owner: t.owner };
    t.box = { x0: t.x - t.w / 2, x1: t.x + t.w / 2, y0: t.y - t.thick, y1: t.y, z0: t.z - t.d / 2, z1: t.z + t.d / 2 };
    t.sid = null; t.solid = false; t.pending = false;
    t.angle = t.color === sys.color ? 0 : Math.PI; t.target = t.angle; t.anim = false;
    if (t.color === sys.color) setSolid(t, true);
    tiles.push(t);
  };
  // Sprung einer Figur → Farbwechsel (höchstens einer je Simulationsschritt)
  level.onJump(() => { if (level.time === lastT) return; lastT = level.time; sys.flip(); });
  level.onStep((dt) => {
    for (const t of tiles) {
      if (t.pending) {
        let blocked = false;
        for (const f of figures(level)) if (f.mode !== 'script' && penetrates(f.pos, f.half, t.box)) { pushOutOf(level, f, t.box, dt); blocked = true; }
        if (!blocked) { setSolid(t, true); t.pending = false; }
      }
    }
  });
  // Neustart (Tod): Startfarbe
  const rt = level.runtime;
  if (rt?.respawn) { const orig = rt.respawn.bind(rt); rt.respawn = (...a) => { const r = orig(...a); sys.set(sys.start); return r; }; }
  level.flipper = sys;
  if (level.view) buildView(level, sys);
  return sys;
}

/** Darstellung: je Farbe Rahmen, Platte, Gitter als InstancedMesh (6 Zeichenaufrufe für alle Flipper des Levels). */
function buildView(level, sys) {
  const group = new THREE.Group();
  group.name = 'flipper';
  let meshes = null;
  const holder = {};
  const make = () => {
    meshes = {};
    for (const c of ['rot', 'blau']) {
      const n = Math.max(1, sys.tiles.filter((t) => t.color === c).length);
      const rim = new THREE.InstancedMesh(rimGeo(c), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), n);
      const plate = new THREE.InstancedMesh(plateGeo(c), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42 }), n);
      const grid = new THREE.InstancedMesh(gridGeo(c), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }), n);
      rim.castShadow = plate.castShadow = true; rim.receiveShadow = plate.receiveShadow = true;
      grid.castShadow = false; grid.renderOrder = 2;
      for (const m of [rim, plate, grid]) { m.frustumCulled = false; group.add(m); }
      meshes[c] = { rim, plate, grid, list: sys.tiles.filter((t) => t.color === c) };
    }
  };
  addObject(level, group, (dt) => {
    if (!meshes) make();
    const d = visDt(level, holder, dt);
    for (const c of ['rot', 'blau']) {
      const M = meshes[c];
      M.list.forEach((t, i) => {
        if (t.anim) {
          // immer in dieselbe Richtung weiterdrehen (Halbdrehung), dann auf 0 bzw. π einrasten
          const goal = t.target === 0 ? (t.angle > 1e-6 ? Math.PI * 2 : 0) : Math.PI;
          const step = (Math.PI / FLIP_T) * d;
          const fwd = goal >= t.angle ? 1 : -1;
          t.angle += fwd * step;
          if ((fwd > 0 && t.angle >= goal) || (fwd < 0 && t.angle <= goal)) { t.angle = goal % (Math.PI * 2); t.anim = false; }
        }
        _q.setFromAxisAngle(_ax, t.angle);
        _p.set(t.x, t.y - t.thick / 2, t.z);
        _s.set(t.w - t.gap, t.thick, t.d - t.gap);
        _m.compose(_p, _q, _s);
        M.rim.setMatrixAt(i, _m);
        // Vorderseite (Platte) oben, solange weniger als halb gedreht; danach das Gitter
        const up = Math.cos(t.angle) > 0;
        M.plate.setMatrixAt(i, up ? _m : ZERO);
        M.grid.setMatrixAt(i, up ? ZERO : _m);
      });
      M.rim.instanceMatrix.needsUpdate = true; M.plate.instanceMatrix.needsUpdate = true; M.grid.instanceMatrix.needsUpdate = true;
      M.rim.count = M.plate.count = M.grid.count = M.list.length;
    }
  });
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// ------------------------------------------------------------------ Baustein

export function buildFlipper(level, spec) {
  const sys = flipperSystem(level);
  const handle = { tiles: [], info: () => ({ color: sys.color, flips: sys.flips, tiles: handle.tiles.map((t) => ({ x: t.x, z: t.z, color: t.color, solid: t.solid })) }) };
  const thick = spec.thick ?? (spec.platforms ? 0.4 : 0.35);
  if (spec.platforms) {
    for (const pl of spec.platforms) {
      const q = v3(pl.pos), s = pl.size ?? [3, 3];
      const t = { x: q.x, y: q.y, z: q.z, w: s[0], d: s.length >= 3 ? s[2] : s[1], thick, gap: 0.06, color: norm(pl.color), owner: handle };
      sys.add(t); handle.tiles.push(t);
    }
  } else {
    const p = v3(spec.pos);
    const map = spec.map ?? null;
    const nx = map ? Math.max(...map.map((r) => r.length)) : (spec.grid?.[0] ?? 4);
    const nz = map ? map.length : (spec.grid?.[1] ?? 4);
    const cell = spec.cell ?? 2, gap = spec.gap ?? 0.12;
    const first = norm(spec.first ?? 'rot');
    const pat = spec.pattern ?? 'checker';
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        let color;
        if (map) { const ch = map[iz][ix] ?? '.'; if (ch === '.' || ch === ' ') continue; color = norm(ch); }
        else if (pat === 'rot' || pat === 'blau') color = pat;
        else {
          const k = pat === 'rows' ? iz : pat === 'cols' ? ix : ix + iz;
          color = k % 2 === 0 ? first : other(first);
        }
        const x = p.x + (ix - (nx - 1) / 2) * cell, z = p.z + (nz - 1) / 2 * cell - iz * cell;
        const t = { x, y: p.y, z, w: cell, d: cell, thick, gap, color, owner: handle, ix, iz };
        sys.add(t); handle.tiles.push(t);
      }
    }
  }
  if (spec.id) level.named.set(spec.id, handle);
  return handle;
}

export const TYPES = { flipper: buildFlipper };
