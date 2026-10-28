// Welt-7-Bausteine der Lava-Burg: Zugbrücke und Schaltfeld-Gruppen (Präzisierung Motor und Bausteine Welt 7).
//
// zugbruecke – Zugbrücke über einen Lavagraben (Bauplan 7-Burg „Zugbrücke: P-Schalter hinter einer Wand – Kickbombe gegen
//   die Wand legt ihn frei, er senkt die Brücke“, Stern „oben auf der Zugbrücke, bevor sie gesenkt ist“). Hochgezogen
//   steht sie senkrecht am Ufer (Wand, oben schmal begehbar), Signal open/lower (oder der eingebaute Druckknopf) senkt sie
//   in time s um ihre Ufer-Kante – während der Bewegung ist sie eine Schräge –, gesenkt ist sie ein fester Steg. Ketten
//   laufen von der Spitze zu den Torpfosten.
//   { type: 'zugbruecke', id, pos: [x, y, z] (Scharnier: Mitte der Ufer-Kante auf Höhe der Lauffläche), length: 8, width: 3,
//     thick: 0.4, dir: [dx, dz] (gesenkt liegt sie in diese Richtung; Standard [0, −1]), state: 'oben' | 'unten',
//     time: 2.5 (s), onDown: Aktion (gesenkt), posts: true (Torpfosten mit Ketten), style: 'holz' | 'eisen',
//     schalter: { pos, id, hidden, color } (Druckknopf `druckknopf`, der die Brücke senkt) }
//   level.named.get(id) = { state ('oben'|'senkt'|'unten'|'hebt'), k (0 oben … 1 unten), open(), lower(), close(), raise(),
//                           toggle(), start() (= senken), info() }; w7(level).bridges
//   Modell aus der Registry 'zugbruecke' ({ length, width, thick }, Ursprung Scharnier, liegt gesenkt entlang +X; state
//   { lower }) – sonst eigene Bohlen.
//
// schaltfelder – Kipp-Schaltfeld-Gruppe, die den Weg sichtbar macht (Bauplan 7-2 „Kipp-Schaltfelder machen den Weg
//   sichtbar“): Betreten färbt die Felder um (wie switchtiles); ist die Gruppe komplett, erscheinen die Plattformen des
//   Wegs nacheinander (modus 'alle'); mit modus 'stueck' erscheint je umgefärbtem Feld ein weiteres Stück. Vorher zeigen
//   blasse Umrisse (hint) den Weg an; im Dunkeln leuchten die erschienenen Teile an den Kanten (glow).
//   { type: 'schaltfelder', id, pos | tiles | grid | spacing (wie switchtiles), toggle, indicator, weg: [{ pos, size, color }]
//     (Plattformen; pos = Mitte der Unterseite), modus: 'alle' | 'stueck', style: 'stone' | 'block' | 'cloud' (appear),
//     color, delay: 0.14 (s zwischen Teilen), hint: true, glow: true, onAll: Aktion (zusätzlich) }
//   level.named.get(id) = { tiles, count, done, shown (Zahl sichtbarer Teile), parts (Zahl), reset(), info() };
//   die Weg-Teile heißen `${id}_weg` (modus 'alle') bzw. `${id}_weg${i}` (modus 'stueck'). w7(level).groups

import * as THREE from 'three';
import { v3, addObject, lin, mixc, smooth, colorize, merge } from '../kit.js';
import { buildSwitchTiles } from './switchtiles.js';
import { buildAppear } from './appear.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w7, w7Sfx, ease } from '../w7kit.js';

// =====================================================================================================================
// Zugbrücke
// =====================================================================================================================

let BRIDGE_N = 0;

export function buildZugbruecke(level, spec) {
  const p = v3(spec.pos);
  const Ln = spec.length ?? 8, W = spec.width ?? 3, Th = spec.thick ?? 0.4;
  const dv = Array.isArray(spec.dir) ? spec.dir : [0, -1];
  const fx = Math.abs(dv[0]) >= Math.abs(dv[1]) ? Math.sign(dv[0]) : 0, fz = fx ? 0 : Math.sign(dv[1]) || -1;
  const ax = { x: fx, z: fz }, cr = { x: -fz, z: fx };
  const T = spec.time ?? 2.5;
  const id = spec.id ?? `zugbruecke_${++BRIDGE_N}`;
  const st = { k: spec.state === 'unten' ? 1 : 0, dir: 0, state: spec.state === 'unten' ? 'unten' : 'oben' };
  const W2 = (u, v) => ({ x: p.x + cr.x * u + ax.x * v, z: p.z + cr.z * u + ax.z * v });
  const rect = (u0, u1, v0, v1) => {
    const a = W2(u0, v0), b = W2(u1, v1);
    return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) };
  };
  const shape = { type: 'box', min: [0, 0, 0], max: [1, 1, 1], tag: 'zugbruecke', camIgnore: true };
  let sid = null;
  const place = () => {
    const alpha = (1 - st.k) * Math.PI / 2;   // 0 = liegt, π/2 = senkrecht
    let s;
    if (alpha > 1.35) {
      // senkrecht: Quader vor der Kante (v 0…Th), so hoch wie die Brücke lang ist (oben schmal begehbar)
      const r = rect(-W / 2, W / 2, 0, Th);
      s = { type: 'box', min: [r.x0, p.y, r.z0], max: [r.x1, p.y + Ln * Math.sin(alpha), r.z1] };
    } else if (alpha < 0.03) {
      const r = rect(-W / 2, W / 2, 0, Ln);
      s = { type: 'box', min: [r.x0, p.y - Th, r.z0], max: [r.x1, p.y, r.z1] };
    } else {
      // Schräge: steigt von der Kante (p.y) zur Spitze (p.y + Ln·sin α), waagerecht Ln·cos α lang
      const L = Ln * Math.cos(alpha), H = Ln * Math.sin(alpha);
      const r = rect(-W / 2, W / 2, 0, L);
      const along = ax.x ? 'x' : 'z', sgn = ax.x || ax.z;
      s = { type: 'ramp', axis: along, dir: sgn, min: [r.x0, p.y - Th, r.z0], max: [r.x1, p.y + H, r.z1], low: p.y };
    }
    shape.type = s.type; shape.min = s.min; shape.max = s.max;
    if (s.type === 'ramp') { shape.axis = s.axis; shape.dir = s.dir; shape.low = s.low; } else { delete shape.axis; delete shape.dir; delete shape.low; }
    if (sid) level.world.update(sid); else sid = level.world.add(shape);
  };
  place();
  const handle = {
    get state() { return st.state; }, get k() { return st.k; },
    lower() { if (st.k >= 1 && st.dir >= 0) return; st.dir = 1; st.state = 'senkt'; w7Sfx(level, 'bruecke'); },
    raise() { if (st.k <= 0 && st.dir <= 0) return; st.dir = -1; st.state = 'hebt'; w7Sfx(level, 'bruecke'); },
    open() { handle.lower(); }, start() { handle.lower(); }, close() { handle.raise(); },
    toggle() { if (st.dir > 0 || st.k >= 1) handle.raise(); else handle.lower(); },
    info: () => ({ state: st.state, k: +st.k.toFixed(3), shape: shape.type }),
  };
  shape.owner = handle;
  level.named.set(id, handle);
  w7(level).bridges.push(handle);
  if (spec.schalter) {
    const sw = spec.schalter;
    level.spawn('druckknopf', { ...sw, pos: sw.pos, onPress: [{ open: id }, ...(sw.onPress ? [sw.onPress] : [])] });
  }
  let last = -1;
  level.onStep((dt) => {
    if (!st.dir) return;
    st.k = Math.min(1, Math.max(0, st.k + (st.dir * dt) / T));
    if (st.k >= 1 && st.dir > 0) { st.dir = 0; st.state = 'unten'; level.shake(0.3); level.effects?.dust({ ...W2(0, Ln), y: p.y }, 10, 1.4); w7Sfx(level, 'klapp'); runAction(level, spec.onDown, { pos: [W2(0, Ln / 2).x, p.y, W2(0, Ln / 2).z], source: handle }); }
    if (st.k <= 0 && st.dir < 0) { st.dir = 0; st.state = 'oben'; }
    // Kollision nur bei merklicher Änderung neu setzen
    if (Math.abs(st.k - last) > 0.004 || !st.dir) { last = st.k; place(); }
  });

  if (!level.view) return handle;
  // ---------------- Darstellung: Brücke dreht um die Ufer-Kante (lokal: liegt entlang +X, Kante bei x = 0)
  const root = new THREE.Group();
  root.name = 'zugbruecke';
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = Math.atan2(-ax.z, ax.x);
  const hinge = new THREE.Group();
  root.add(hinge);
  let model = null;
  if (hasModel('zugbruecke')) {
    model = getModel('zugbruecke', { length: Ln, width: W, thick: Th });
    hinge.add(model.root);
  } else {
    const wood = spec.style === 'eisen' ? [0x5a5a66, 0x9a9aa8] : [0x8a5a34, 0xc8925a];
    const dk = lin(wood[0]), hi = lin(wood[1]), iron = lin(0x3a3a44), ironHi = lin(0x8a8a98);
    const parts = [];
    const nb = Math.max(3, Math.round(Ln / 0.55));
    for (let i = 0; i < nb; i++) {
      const g = new THREE.BoxGeometry(Ln / nb - 0.04, Th, W);
      g.translate((i + 0.5) * (Ln / nb), -Th / 2, 0);
      const tone = 0.85 + ((i * 37) % 7) * 0.03;
      parts.push(colorize(g.toNonIndexed(), (q, n, o) => { mixc(dk, hi, smooth(-0.6, 0.9, n.y) * tone, o); }));
    }
    for (const z of [-W / 2 + 0.25, W / 2 - 0.25]) {
      const g = new THREE.BoxGeometry(Ln, 0.1, 0.16); g.translate(Ln / 2, 0.02, z);
      parts.push(colorize(g.toNonIndexed(), (q, n, o) => mixc(iron, ironHi, smooth(-1, 1, n.y), o)));
    }
    for (const x of [Ln * 0.2, Ln * 0.5, Ln * 0.8]) {
      const g = new THREE.BoxGeometry(0.16, 0.1, W - 0.2); g.translate(x, 0.02, 0);
      parts.push(colorize(g.toNonIndexed(), (q, n, o) => mixc(iron, ironHi, smooth(-1, 1, n.y), o)));
    }
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    hinge.add(mesh);
  }
  // Torpfosten und Ketten (Ketten: von der Brückenspitze zum Pfosten, je Bild neu gelegt)
  let chains = null;
  const postH = Math.max(3, Ln * 0.75);
  if (spec.posts !== false) {
    const pg = [];
    for (const z of [-W / 2 - 0.45, W / 2 + 0.45]) {
      const g = new THREE.BoxGeometry(0.7, postH, 0.7); g.translate(-0.35, postH / 2 - Th, z);
      pg.push(colorize(g.toNonIndexed(), (q, n, o) => mixc(lin(0x4a4250), lin(0x8a8294), smooth(-0.6, 0.9, n.y * 0.5 + 0.4), o)));
      const cap = new THREE.ConeGeometry(0.6, 0.8, 4); cap.rotateY(Math.PI / 4); cap.translate(-0.35, postH - Th + 0.4, z);
      pg.push(colorize(cap.toNonIndexed(), (q, n, o) => mixc(lin(0x8a1a1a), lin(0xe0402a), smooth(-0.5, 0.9, n.y), o)));
    }
    const posts = new THREE.Mesh(merge(pg), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
    posts.castShadow = true;
    root.add(posts);
    const cg = new THREE.CylinderGeometry(0.05, 0.05, 1, 5);
    cg.translate(0, 0.5, 0);
    chains = [-1, 1].map((s) => {
      const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.4, metalness: 0.6 }));
      m.userData.side = s;
      root.add(m);
      return m;
    });
  }
  const holder = {};
  const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    const alpha = (1 - st.k) * Math.PI / 2;
    hinge.rotation.z = alpha;   // lokal: +Winkel hebt die Spitze (+X) nach oben
    model?.update?.(d, { lower: st.k });
    if (chains) {
      for (const m of chains) {
        const z = m.userData.side * (W / 2 - 0.15);
        A.set(Ln * 0.92 * Math.cos(alpha), Ln * 0.92 * Math.sin(alpha), z);
        B.set(-0.35, postH - Th - 0.3, m.userData.side * (W / 2 + 0.2));
        D.subVectors(B, A);
        const L = D.length();
        m.position.copy(A);
        m.scale.set(1, L, 1);
        m.quaternion.setFromUnitVectors(UP, D.normalize());
      }
    }
  });
  return handle;
}

// =====================================================================================================================
// Schaltfeld-Gruppe, die den Weg sichtbar macht
// =====================================================================================================================

let GROUP_N = 0;

export function buildSchaltfelder(level, spec) {
  const id = spec.id ?? `schaltfelder_${++GROUP_N}`;
  const weg = spec.weg ?? [];
  const modus = spec.modus === 'stueck' ? 'stueck' : 'alle';
  const style = spec.style ?? 'stone';
  const appears = [];
  const base = { style, color: spec.color, delay: spec.delay ?? 0.14, hint: spec.hint !== false };
  if (weg.length) {
    if (modus === 'alle') appears.push(buildAppear(level, { ...base, id: `${id}_weg`, parts: weg }));
    else weg.forEach((q, i) => appears.push(buildAppear(level, { ...base, id: `${id}_weg${i}`, parts: [q] })));
  }
  const { weg: _w, onAll, modus: _m, ...rest } = spec;
  const group = buildSwitchTiles(level, {
    ...rest, id: undefined,
    onAll: [{ fn: () => { if (modus === 'alle') appears[0]?.reveal(); else for (const a of appears) a.reveal(); } }, ...(onAll ? [onAll] : [])],
  });
  const n = group.tiles.length;
  const handle = {
    get tiles() { return group.tiles; }, get count() { return group.count; }, get done() { return group.done; },
    get shown() { let k = 0; for (const a of appears) for (const q of a.parts) if (q.shown) k++; return k; },
    parts: weg.length, group,
    reset() { group.reset(); for (const a of appears) a.hide(); },
    info: () => ({ count: group.count, of: n, done: group.done, shown: handle.shown, parts: weg.length, modus }),
  };
  level.named.set(id, handle);
  w7(level).groups.push(handle);
  if (modus === 'stueck' && weg.length) {
    // je umgefärbtem Feld ein weiteres Stück (verteilt auf die Feldzahl)
    level.onStep(() => {
      const want = Math.min(weg.length, Math.ceil((group.count / n) * weg.length - 1e-6));
      for (let i = 0; i < weg.length; i++) {
        const a = appears[i];
        if (i < want && !a.want) a.reveal();
        else if (i >= want && a.want && !group.done && group.toggle) a.hide();
      }
    });
  }
  // Leuchtkanten der erschienenen Teile (im Dunkeln lesbar)
  if (level.view && spec.glow !== false && weg.length) {
    const edges = [];
    weg.forEach((q, i) => {
      const p = v3(q.pos), s = Array.isArray(q.size) ? q.size : [2, 0.5, 2];
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(s[0] + 0.04, s[1] + 0.04, s[2] + 0.04));
      g.translate(p.x, p.y + s[1] / 2, p.z);
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0 }));
      l.renderOrder = 3;
      edges.push({ l, part: modus === 'alle' ? appears[0]?.parts[i] : appears[i]?.parts[0] });
      addObject(level, l, () => { const pt = edges[i].part; const on = !!pt?.shown; l.visible = on; l.material.opacity = on ? Math.min(0.85, (pt.pop ?? 1) * 0.85) : 0; });
    });
  }
  return handle;
}

export const TYPES = { zugbruecke: buildZugbruecke, schaltfelder: buildSchaltfelder };
