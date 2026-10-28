// Welt-6-Baustein Klettergitter (Bauplan 6-4 „Dschungel … viele Klettergitter“, „Wand neben der End-Warp-Box kletterbar“;
// 6-6 Kletterwand). Zwei Arten:
//   Wandgitter  – senkrechtes Gitter (an einer Wand oder frei stehend): die Figur springt daran und klettert in der
//                 Gitterebene wie am Kettenzaun (player/fencing.js: state 'fence', Stick klettert, Sprung springt ab,
//                 Ducken lässt los, Aktion = Faustschlag durch das Gitter).
//   Deckengitter – waagerechtes Gitter unter einer Decke: die Figur greift es im Sprung von unten und hangelt
//                 (player/hanging.js: state 'hang', Stick bewegt sie in der Ebene, Sprung/Ducken lässt los).
//
// klettergitter:
//   { type: 'klettergitter', id, mode: 'wand' | 'decke',
//     wand:  pos: [x, y, z] (Mitte der Unterkante in der Gitterebene), size: [w, h] (3 × 4), yaw: −π/2 (Kletterseite
//            blickt dorthin; −π/2 = zur Kamera; 90°-Raster), wall: true (feste Wand 0,4 m dahinter, ohne Wandrutschen –
//            sonst dünnes, frei stehendes Gitter, beide Seiten kletterbar)
//     decke: pos: [x, y, z] (Mitte der Gitterebene; die Figur hängt darunter, Füße 1,15 m tiefer), size: [w, d] (4 × 4),
//            ceiling: true (feste Decke 0,5 m darüber)
//     cell: 0.5 (Maschenweite), style: 'metall' | 'bambus' | 'liane' | 'holz', hidden }
//   level.named.get(id) = { mode, climbers() (Figuren daran), reveal(), hide(), info() }
// Modell aus der Registry für die Dschungel-Arten 'bambus' und 'liane': 'klettergitter' ({ size: [w, h] }, Fläche Y-Z,
// Vorderseite +X, Ursprung Mitte unten; state.shake rüttelt, solange jemand daran klettert); 'metall' und 'holz' (Fabrik,
// Mine) und Wände/Decken dahinter bleiben eigene Geometrie (ein Zeichenaufruf, verschmolzen).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, addStatic, addObject, hex } from '../kit.js';
import { w6, figures, w6Sfx } from '../w6kit.js';
import { hasModel, getModel } from '../../models/index.js';

const HALF_PI = Math.PI / 2;
const STYLE = {
  metall: { bar: 0x9aa6b8, bar2: 0x5a6476, frame: 0x4a5262, r: 0.035 },
  bambus: { bar: 0xd8c86a, bar2: 0x8a9a3a, frame: 0x6a7a2a, r: 0.05 },
  liane: { bar: 0x5ab84a, bar2: 0x2a6a2a, frame: 0x6a4a2a, r: 0.05 },
  holz: { bar: 0xc8955a, bar2: 0x7a4a2a, frame: 0x5a3a20, r: 0.045 },
};

/** Gitter im lokalen Rahmen: Fläche über u ∈ [−w/2, w/2] (lokal X) und v ∈ [0, h] (lokal Y), Stäbe als dünne Zylinder. */
function latticeGeo(w, h, cell, style) {
  const S = STYLE[style] ?? STYLE.metall;
  const a = lin(hex(S.bar)), b = lin(hex(S.bar2)), f = lin(hex(S.frame));
  const parts = [];
  const bar = (x0, y0, x1, y1, r, col, z = 0) => {
    const L = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.CylinderGeometry(r, r, L, 5, 1, true);
    g.rotateZ(Math.atan2(x0 - x1, y1 - y0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => {
      if (col) { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; return; }
      mixc(b, a, smooth(-0.6, 0.8, n.y * 0.5 + n.z * 0.6), o);
      if (style === 'bambus' && Math.abs(((p.x + p.y + 40) % 0.5) - 0.25) < 0.02) mixc(o, b, 0.7, o);
    }));
  };
  const nx = Math.max(1, Math.round(w / cell)), ny = Math.max(1, Math.round(h / cell));
  for (let i = 1; i < nx; i++) { const x = -w / 2 + (i * w) / nx; bar(x, 0, x, h, S.r, null, (i % 2) * 0.02); }
  for (let j = 1; j < ny; j++) { const y = (j * h) / ny; bar(-w / 2, y, w / 2, y, S.r, null, ((j + 1) % 2) * 0.02); }
  // Rahmen
  const fr = S.r * 2.2;
  bar(-w / 2, 0, -w / 2, h, fr, f); bar(w / 2, 0, w / 2, h, fr, f);
  bar(-w / 2, 0, w / 2, 0, fr, f); bar(-w / 2, h, w / 2, h, fr, f);
  return merge(parts);
}

export function buildKlettergitter(level, spec) {
  const mode = spec.mode === 'decke' ? 'decke' : 'wand';
  const p = v3(spec.pos);
  const cell = spec.cell ?? 0.5, style = spec.style ?? 'metall';
  const st = { hidden: !!spec.hidden };
  let ids = [];
  const solids = [];
  const setSolid = (on) => { for (const id of ids) level.world.remove(id); ids = on ? solids.map((s) => level.world.add(s)) : []; };
  let handle;
  let obj = null;   // Darstellung (nur bei hidden als eigenes Objekt)
  const useReg = !!level.view && (style === 'bambus' || style === 'liane') && hasModel('klettergitter');
  let shake = 0;
  const regUpdate = (m, root) => (dt) => {
    root.visible = !st.hidden;
    const n = handle?.climbers().length ?? 0;
    shake = Math.max(n ? 0.35 : 0, shake - dt * 2);
    m.update?.(dt, { shake });
  };
  if (mode === 'wand') {
    const [w, h] = spec.size ?? [3, 4];
    const yaw = Math.round((spec.yaw ?? -HALF_PI) / HALF_PI) * HALF_PI;
    const nx = Math.cos(yaw), nz = -Math.sin(yaw);   // Vorderseite (Kletterseite)
    const ax = nz, az = -nx;                          // entlang (von vorn gesehen nach rechts)
    const fence = {
      kind: 'klettergitter', alive: true, removed: false, climbable: true, mover: null, shape: null,
      get hidden() { return st.hidden; },
      plane: { x: p.x, y: p.y, z: p.z, ax, az, nx, nz, w, h },
      shake() {},
    };
    // Kollision: Wand dahinter (bzw. dünnes Gitter) ohne Wandrutschen – Hineinspringen greift das Gitter
    const wallD = spec.wall === false ? 0.06 : 0.4;
    const back = spec.wall === false ? -0.03 : -0.02 - wallD;
    const cx = p.x + nx * (back + wallD / 2), cz = p.z + nz * (back + wallD / 2);
    const ex = Math.abs(ax) * w / 2 + Math.abs(nx) * wallD / 2, ez = Math.abs(az) * w / 2 + Math.abs(nz) * wallD / 2;
    const sh = { type: 'box', min: [cx - ex, p.y, cz - ez], max: [cx + ex, p.y + h, cz + ez], noWallSlide: true, tag: 'klettergitter', owner: fence };
    if (spec.wall === false) sh.camIgnore = true;
    solids.push(sh);
    fence.shape = sh;
    level.fences.push(fence);
    handle = {
      mode, fence,
      climbers: () => figures(level).filter((f) => f.fence?.obj === fence),
      reveal() { if (!st.hidden) return; st.hidden = false; setSolid(true); if (obj) obj.visible = true; w6Sfx(level, 'powerup_appear'); },
      hide() { st.hidden = true; setSolid(false); if (obj) obj.visible = false; },
      info: () => ({ mode, climbers: handle.climbers().length, hidden: st.hidden }),
    };
    if (level.view) {
      const root = new THREE.Group();
      root.position.set(p.x + nx * 0.02, p.y, p.z + nz * 0.02);
      root.rotation.y = yaw + HALF_PI;   // lokal +X = (ax, az), lokal +Z = Vorderseite
      const parts = useReg ? [] : [latticeGeo(w, h, cell, style)];
      if (spec.wall !== false) {
        // Rückwand (Fels/Holz) hinter dem Gitter
        const wall = new THREE.BoxGeometry(w + 0.1, h, wallD);
        wall.translate(0, h / 2, -0.04 - wallD / 2);
        const c0 = lin(0x6a6070), c1 = lin(0x9a90a0);
        parts.push(colorize(wall.toNonIndexed(), (q, n, o) => mixc(c0, c1, smooth(-0.5, 1, n.z * 0.6 + n.y * 0.4), o)));
      }
      if (useReg) {
        // eigenes Objekt für Modell (+ Rückwand), damit hidden/reveal und shake wirken
        const m = getModel('klettergitter', { size: [w, h] });
        const mg = new THREE.Group();
        mg.rotation.y = -HALF_PI;   // Modell-Vorderseite +X → lokal +Z
        mg.add(m.root);
        root.add(mg);
        if (parts.length) { const wm = new THREE.Mesh(merge(parts), level.view.mats.world); wm.castShadow = true; wm.receiveShadow = true; root.add(wm); }
        root.visible = !st.hidden;
        addObject(level, root, regUpdate(m, root));
      } else placeGeo(level, merge(parts), root, st, spec);
      obj = root;
    }
  } else {
    const [w, d] = spec.size ?? [4, 4];
    const grid = {
      kind: 'klettergitter', x0: p.x - w / 2, x1: p.x + w / 2, z0: p.z - d / 2, z1: p.z + d / 2, y: p.y, alive: true, removed: false,
      get hidden() { return st.hidden; }, mover: null, shake() {},
    };
    level.hangGrids.push(grid);
    if (spec.ceiling !== false) solids.push({ type: 'box', min: [grid.x0, p.y + 0.05, grid.z0], max: [grid.x1, p.y + 0.55, grid.z1], tag: 'klettergitter:decke', owner: grid, camIgnore: true });
    handle = {
      mode, grid,
      climbers: () => figures(level).filter((f) => f.hang?.obj === grid),
      reveal() { if (!st.hidden) return; st.hidden = false; setSolid(true); if (obj) obj.visible = true; w6Sfx(level, 'powerup_appear'); },
      hide() { st.hidden = true; setSolid(false); if (obj) obj.visible = false; },
      info: () => ({ mode, climbers: handle.climbers().length, hidden: st.hidden }),
    };
    if (level.view) {
      const root = new THREE.Group();
      if (useReg) {
        // Registry-Kachel: Fläche Y-Z, Vorderseite +X → um Z gedreht: Vorderseite nach unten, Höhe entlang +X
        root.position.set(p.x - w / 2, p.y, p.z);
        root.rotation.z = -HALF_PI;
        const m = getModel('klettergitter', { size: [d, w] });
        root.add(m.root);
        root.visible = !st.hidden;
        addObject(level, root, regUpdate(m, root));
      } else {
        root.position.set(p.x, p.y, p.z + d / 2);
        root.rotation.x = -HALF_PI;   // lokal Y (Gitterhöhe) → Welt −Z: Gitter liegt waagerecht von z + d/2 nach z − d/2
        placeGeo(level, latticeGeo(w, d, cell, style), root, st, spec);
      }
      obj = root;
      if (spec.ceiling !== false) {
        // Decke als eigenes Mesh: wird durchscheinend, solange sie die hängende Figur vor der Kamera verdeckt
        const slab = new THREE.BoxGeometry(w + 0.2, 0.5, d + 0.2);
        slab.translate(p.x, p.y + 0.3, p.z);
        const c0 = lin(0x5a4a3a), c1 = lin(0x8a7a5a);
        const sm = new THREE.Mesh(colorize(slab, (q, n, o) => mixc(c0, c1, smooth(-1, 1, n.y), o)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
        sm.castShadow = true; sm.receiveShadow = true;
        sm.visible = !st.hidden;
        addObject(level, sm, () => { sm.visible = !st.hidden; });
        level.view.xray?.(sm, new THREE.Box3(new THREE.Vector3(grid.x0 - 0.2, p.y, grid.z0 - 0.2), new THREE.Vector3(grid.x1 + 0.2, p.y + 0.6, grid.z1 + 0.2)), { min: 0.25 });
      }
    }
  }
  setSolid(!st.hidden);
  w6(level).grids.push(handle);
  if (spec.id) level.named.set(spec.id, handle);
  return handle;
}

/** Statisch verschmelzen (nicht versteckbar) bzw. als eigenes Objekt (hidden). */
function placeGeo(level, g, root, st, spec) {
  if (!spec.hidden) {
    root.updateMatrixWorld(true);
    g.applyMatrix4(root.matrixWorld);
    addStatic(level, g, { castShadow: true });
    return;
  }
  const m = new THREE.Mesh(g, level.view.mats.world);
  m.castShadow = true; m.receiveShadow = true;
  root.add(m);
  root.visible = !st.hidden;
  addObject(level, root);
}

export const TYPES = { klettergitter: buildKlettergitter };
