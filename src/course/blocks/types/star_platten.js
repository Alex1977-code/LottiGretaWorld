// Bausteine Platten der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-2 „Planetoiden-Hommage:
// kippende Drehplatten, rote Plattenbahn, Boost-Strecke auf Drehplatten (zu langsam = Absturz), Plattentreppe mit senkrechter
// Plattenwand, Schachbrett aus Platten“, S-1 „Bonusraum mit Farbfeldern“). Alle Platten eines Bausteins zeichnen als Instanzen
// (Kern + weißer Rahmen = 2 Zeichenaufrufe), Takte auf der Level-Uhr.
//
// drehplatte – schwebende Platte(n), die kippen, wenn man darauf steht: Betreten → Vorwarnung (wackelt, blinkt hell) →
//   kippt um ihre Achse (ab 30° nicht mehr fest: wer noch drauf ist, fällt) → hängt senkrecht → dreht zurück. Wer schnell
//   genug darüber rennt (Boost-Strecke), ist weiter, bevor sie kippt. Mit `arrow` liegt ein Boost-Pfeil auf der Platte.
//   { type: 'drehplatte', id, pos: [x, y, z] (Mitte der Oberseite einer Platte bzw. des Felds), size: [2, 0.3, 2],
//     grid: [Spalten, Reihen] (Feld um pos) | tiles: [[x, y, z] …] (Oberseiten-Mitten) | from, to, n (Reihe),
//     spacing: size.x + 0.3, axis: 'x' (kippt nach vorn/hinten) | 'z' (zur Seite), mode: 'stand' (Betreten löst aus) |
//     'takt' (kippt im Takt: wait 2, phase, stagger 0.4 je Platte), delay: 0.45 (s Stehen bis zum Kippen, die letzten 0,3 s
//     Vorwarnung), tilt: 0.3 (s), hold: 1.2 (s senkrecht), back: 0.45 (s), color: 'blau', color2: 'gelb' (Unterseite, beim
//     Kippen sichtbar), arrow: [dx, dz] | false (Boost-Pfeil, speed 15), speed: 15, frame: true }
//   level.named.get(id) = { plates: [{ x, y, z, state ('ruhe'|'warn'|'kippt'|'haengt'|'zurueck'), k (0..1 Kippung), tilts }],
//     tilts (Summe), start(), stop() (Takt), reset(), info() }; Form-Tag 'drehplatte'; star(level).plates.
//   Beispiel: { type: 'drehplatte', id: 'dreh', pos: [0, 0, -40], grid: [3, 2], delay: 0.5 }
//             Boost-Strecke: { type: 'drehplatte', from: [0, 0, -60], to: [0, 0, -84], n: 9, delay: 0.25, arrow: [0, -1] }
//
// farbplatten – Platten wechseln beim Betreten die Farbe (from → to); sind alle umgefärbt, folgt das Ereignis (onAll / star),
//   Signal 'farbplatten'. toggle: jedes Betreten schaltet zurück (Schachbrett-Rätsel). Fester Untergrund.
//   { type: 'farbplatten', id, pos | grid | tiles | from/to/n (wie drehplatte), size: [2, 0.3, 2], spacing, from: 'blau',
//     to: 'gelb', toggle: false, onAll: Aktion, star: Index (= onAll { star }), at: [x, y, z] (Ort des Ereignisses),
//     time: 0 (s; > 0: nach dem ersten Umfärben läuft die Zeit, danach fallen alle zurück), frame: true }
//   level.named.get(id) = { plates: [{ on }], count, done, reset(), info() }; star(level).colors.
//   Beispiel: { type: 'farbplatten', id: 'schach', pos: [0, 0, -100], grid: [4, 4], toggle: true, star: 2 }
//
// plattenwand – senkrechte Wand mit Klapp-Platten: die Platten klappen um ihre Unterkante waagerecht heraus und werden zu
//   Trittstufen (im Takt nacheinander wie eine laufende Treppe, oder einmal als feste Treppe, sobald man nah kommt bzw.
//   per Signal). Vor dem Zurückklappen blinken sie (Vorwarnung). Die Wand selbst ist fest (Wandsprung).
//   { type: 'plattenwand', id, pos: [x, y, z] (Mitte der Unterkante der Wandfläche), dir: [0, 1] (Wandfläche zeigt nach +Z,
//     90°-Raster), size: [w, h] (Wandfläche, Standard [6, 8]), thick: 0.6, grid: [Spalten, Reihen] (Standard [3, 4]),
//     mode: 'takt' | 'treppe' (bleibt draußen) | 'signal' (start = herausklappen, stop = einklappen), order: 'treppe'
//     (diagonal von unten) | 'reihe' (Reihe für Reihe) | [[Spalte, Reihe] …], period: 5 (s Takt), out: 2.4 (s draußen),
//     stagger: 0.45 (s je Platte), phase, near: 6 (m, treppe: Auslöse-Abstand), warn: 0.6, color: 'rot', wall: 'weiss' }
//   level.named.get(id) = { panels: [{ col, row, k (0..1 heraus), solid, state }], start(), stop(), info() }; Formen
//   'plattenwand' (Wand) und 'plattenwand-stufe'; star(level).walls.
//   Beispiel: { type: 'plattenwand', id: 'wand', pos: [0, 0, -120], size: [6, 9], grid: [3, 5], mode: 'takt' }

import * as THREE from 'three';
import { v3, addObject, box } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { star, PlateSet, plateColor, standerOn, figureInside, cycle, ease, clamp, figures } from '../starkit.js';

const DEG = Math.PI / 180;

/** Plattenorte: tiles | from/to/n | grid um pos | pos. Liefert [{ x, y, z }] (Oberseiten-Mitten). */
function spots(spec, size) {
  if (Array.isArray(spec.tiles)) return spec.tiles.map((t) => v3(t));
  if (spec.from && spec.to && Array.isArray(spec.from) && typeof spec.from[0] === 'number') {
    const a = v3(spec.from), b = v3(spec.to), n = Math.max(1, spec.n ?? Math.round(Math.hypot(b.x - a.x, b.z - a.z) / (size[0] + 0.3)) + 1);
    const out = [];
    for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : i / (n - 1); out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }); }
    return out;
  }
  const p = v3(spec.pos);
  const [cols, rows] = spec.grid ?? [1, 1];
  const sp = spec.spacing ?? size[0] + 0.3;
  const spz = spec.spacing ?? size[2] + 0.3;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: p.x + (c - (cols - 1) / 2) * sp, y: p.y, z: p.z + (r - (rows - 1) / 2) * spz });
  return out;
}

// ===================================================================== Drehplatte

export function buildDrehplatte(level, spec) {
  const size = spec.size ?? [2, 0.3, 2];
  const [w, h, d] = size;
  const axis = spec.axis === 'z' ? 'z' : 'x';
  const delay = spec.delay ?? 0.45, tilt = spec.tilt ?? 0.3, hold = spec.hold ?? 1.2, back = spec.back ?? 0.45, warn = Math.min(delay, spec.warn ?? 0.3);
  const takt = spec.mode === 'takt';
  const c1 = plateColor(spec.color, 0x3a8aff), c2 = plateColor(spec.color2, 0xffd23a);
  let arrow = Array.isArray(spec.arrow) ? spec.arrow : null;
  if (arrow) { const l = Math.hypot(arrow[0], arrow[1]) || 1; arrow = [arrow[0] / l, arrow[1] / l]; }
  const speed = spec.speed ?? 15;
  const st = { running: !spec.idle, tilts: 0 };
  const plates = spots(spec, size).map((p, i) => ({ i, x: p.x, y: p.y, z: p.z, state: 'ruhe', t: 0, k: 0, tilts: 0, id: null, trig: null, phase: (spec.phase ?? 0) + i * (spec.stagger ?? 0.4) }));
  const handle = {
    plates, kind: 'drehplatte',
    get tilts() { return st.tilts; },
    start() { st.running = true; }, stop() { st.running = false; },
    reset() { for (const p of plates) { p.state = 'ruhe'; p.t = 0; p.k = 0; solid(p, true); } },
    info: () => ({ tilts: st.tilts, states: plates.map((p) => p.state[0]).join(''), running: st.running }),
  };
  const shapeOf = (p) => ({ type: 'box', min: [p.x - w / 2, p.y - h, p.z - d / 2], max: [p.x + w / 2, p.y, p.z + d / 2], owner: p, tag: 'drehplatte', handle });
  const solid = (p, on) => {
    if (on && p.id === null) {
      p.id = level.world.add(shapeOf(p));
      if (arrow) p.trig = level.world.add({ type: 'box', min: [p.x - w / 2 + 0.1, p.y - 0.05, p.z - d / 2 + 0.1], max: [p.x + w / 2 - 0.1, p.y + 0.3, p.z + d / 2 - 0.1], trigger: true, solid: false, boost: { x: arrow[0], z: arrow[1], speed }, tag: 'drehplatte-boost' });
    } else if (!on && p.id !== null) {
      level.world.remove(p.id); p.id = null;
      if (p.trig !== null) { level.world.remove(p.trig); p.trig = null; }
    }
  };
  for (const p of plates) solid(p, true);
  if (spec.id) level.named.set(spec.id, handle);
  star(level).plates.push(handle);
  const box3 = (p) => ({ x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - h, y1: p.y, z0: p.z - d / 2, z1: p.z + d / 2 });
  const cyc = takt ? cycle([{ name: 'ruhe', t: spec.wait ?? 2 }, { name: 'warn', t: warn }, { name: 'kippt', t: tilt }, { name: 'haengt', t: hold }, { name: 'zurueck', t: back }]) : null;
  level.onStep((dt) => {
    for (const p of plates) {
      if (takt) {
        if (!st.running) continue;
        const a = cyc.at(level.time + p.phase);
        if (a.name !== p.state) { if (a.name === 'kippt') { p.tilts++; st.tilts++; level.sfx('flip'); } p.state = a.name; }
        p.k = a.name === 'kippt' ? ease(a.u) : a.name === 'haengt' ? 1 : a.name === 'zurueck' ? 1 - ease(a.u) : 0;
        if (p.k > 0.33 && p.id !== null) solid(p, false);
        else if (p.k <= 0.01 && p.id === null && !figureInside(level, box3(p))) solid(p, true);
        continue;
      }
      p.t += dt;
      if (p.state === 'ruhe') {
        if (standerOn(level, p)) { p.state = 'warn'; p.t = 0; }
      } else if (p.state === 'warn') {
        if (p.t >= delay) { p.state = 'kippt'; p.t = 0; p.tilts++; st.tilts++; level.sfx('flip'); }
      } else if (p.state === 'kippt') {
        p.k = ease(p.t / tilt);
        if (p.k > 0.33) solid(p, false);
        if (p.t >= tilt) { p.state = 'haengt'; p.t = 0; p.k = 1; }
      } else if (p.state === 'haengt') {
        if (p.t >= hold) { p.state = 'zurueck'; p.t = 0; }
      } else if (p.state === 'zurueck') {
        p.k = 1 - ease(p.t / back);
        if (p.t >= back) {
          if (figureInside(level, box3(p))) { p.t = back; continue; }
          p.state = 'ruhe'; p.k = 0; solid(p, true);
        }
      }
    }
  });
  if (!level.view) return handle;
  const set = new PlateSet(level, plates.length, size, { name: 'drehplatten', frame: spec.frame === false ? 0 : 0.16 });
  let t = 0;
  set.render((dd) => {
    t += dd;
    for (const p of plates) {
      const wob = p.state === 'warn' ? Math.sin(t * 40) * 0.05 * clamp(p.t / Math.max(0.01, warn), 0, 1) : 0;
      const ang = p.k * 90 * DEG + wob;
      const under = p.k > 0.5;
      set.set(p.i, { x: p.x, y: p.y - h / 2, z: p.z, rx: axis === 'x' ? ang : 0, rz: axis === 'z' ? ang : 0, color: under ? c2 : c1, glow: p.state === 'warn' ? 0.5 + 0.5 * Math.sin(t * 30) : 0 });
    }
  });
  if (arrow) addArrows(level, plates, size, arrow, () => plates.map((p) => p.k));
  return handle;
}

/** Leuchtende Boost-Pfeile auf Platten (eine Instanz-Gruppe), kippen mit (ks() → Kippung je Platte). */
function addArrows(level, plates, size, dir, ks) {
  const g = new THREE.ShapeGeometry(arrowShape());
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.95, depthWrite: false });
  const mesh = new THREE.InstancedMesh(g, mat, plates.length);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = 'drehplatten_pfeile';
  const yaw = Math.atan2(-dir[1], dir[0]) - Math.PI / 2;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    const k = ks();
    plates.forEach((p, i) => {
      const hide = k[i] > 0.05;
      v.set(p.x, p.y + 0.02, p.z);
      e.set(0, yaw, 0); q.setFromEuler(e);
      const sc = hide ? 0.0001 : Math.min(size[0], size[2]) * 0.42 * (1 + Math.sin(t * 6 - i * 0.8) * 0.06);
      s.set(sc, 1, sc);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

function arrowShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 1); s.lineTo(0.9, 0); s.lineTo(0.35, 0); s.lineTo(0.35, -0.9); s.lineTo(-0.35, -0.9); s.lineTo(-0.35, 0); s.lineTo(-0.9, 0); s.closePath();
  return s;
}

// ===================================================================== Farbplatten

export function buildFarbplatten(level, spec) {
  const size = spec.size ?? [2, 0.3, 2];
  const [w, h, d] = size;
  const cA = plateColor(spec.from, 0x3a8aff), cB = plateColor(spec.to, 0xffd23a);
  const plates = spots(spec, size).map((p, i) => ({ i, x: p.x, y: p.y, z: p.z, on: false, pop: 0 }));
  const n = plates.length;
  const group = { plates, count: 0, done: false, toggle: !!spec.toggle, timer: 0, kind: 'farbplatten' };
  for (const p of plates) {
    p.group = group;
    level.world.add({ type: 'box', min: [p.x - w / 2, p.y - h, p.z - d / 2], max: [p.x + w / 2, p.y, p.z + d / 2], owner: p, tag: 'farbplatte' });
  }
  const cx = plates.reduce((a, p) => a + p.x, 0) / n, cz = plates.reduce((a, p) => a + p.z, 0) / n, top = Math.max(...plates.map((p) => p.y));
  const at = spec.at ? v3(spec.at) : { x: cx, y: top + 1, z: cz };
  const action = spec.onAll ?? (spec.star !== undefined ? { star: spec.star } : null);
  const recount = () => { group.count = plates.filter((p) => p.on).length; };
  group.reset = () => { for (const p of plates) p.on = false; group.count = 0; group.done = false; group.timer = 0; };
  group.info = () => ({ count: group.count, of: n, done: group.done, map: plates.map((p) => (p.on ? '#' : '.')).join('') });
  const flip = (p) => {
    if (group.done) return;
    if (group.toggle) p.on = !p.on; else if (!p.on) p.on = true; else return;
    p.pop = 1;
    level.sfx('switch');
    level.effects?.sparks({ x: p.x, y: p.y + 0.3, z: p.z }, 5);
    recount();
    if (spec.time > 0 && group.count === 1 && group.timer <= 0) group.timer = spec.time;
    level.signal?.('farbplatten', { id: spec.id ?? null, count: group.count, of: n });
    if (group.count === n) {
      group.done = true;
      level.sfx('key');
      level.effects?.sparks({ x: at.x, y: at.y, z: at.z }, 22);
      runAction(level, action, { pos: [at.x, at.y, at.z], source: group });
    }
  };
  if (spec.id) level.named.set(spec.id, group);
  star(level).colors.push(group);
  const prev = new WeakMap();
  level.onStep((dt) => {
    for (const f of figures(level)) {
      const cur = f.mode === 'ground' && f.ground?.owner?.group === group ? f.ground.owner : null;
      if (cur && cur !== prev.get(f)) flip(cur);
      prev.set(f, cur);
    }
    if (group.timer > 0 && !group.done) {
      group.timer -= dt;
      if (group.timer <= 0) { for (const p of plates) p.on = false; recount(); level.sfx('alarm'); }
    }
  });
  if (!level.view) return group;
  const set = new PlateSet(level, n, size, { name: 'farbplatten', frame: spec.frame === false ? 0 : 0.16, shadow: false });
  const ca = new THREE.Color(cA), cb = new THREE.Color(cB), tmp = new THREE.Color();
  let t = 0;
  set.render((dd) => {
    t += dd;
    for (const p of plates) {
      p.pop = Math.max(0, p.pop - dd * 3);
      tmp.copy(p.on ? cb : ca);
      set.set(p.i, { x: p.x, y: p.y - h / 2 - p.pop * 0.06, z: p.z, color: tmp.getHex(), glow: group.done ? 0.25 + 0.25 * Math.sin(t * 4 + p.i) : p.pop * 0.6 });
    }
  });
  return group;
}

// ===================================================================== Plattenwand

export function buildPlattenwand(level, spec) {
  const p = v3(spec.pos);
  const [W, H] = spec.size ?? [6, 8];
  const thick = spec.thick ?? 0.6;
  let dx = 0, dz = 1;
  if (Array.isArray(spec.dir)) { dx = Math.sign(Math.round(spec.dir[0])); dz = Math.sign(Math.round(spec.dir[1])); if (dx && dz) dz = 0; }
  if (!dx && !dz) dz = 1;
  const [cols, rows] = spec.grid ?? [3, 4];
  const pw = W / cols, ph = H / rows;
  const shelf = 0.3;
  // Querachse u (entlang der Wand): bei dir ±Z ist u = x, bei dir ±X ist u = z
  const ux = dz !== 0 ? 1 : 0, uz = dz !== 0 ? 0 : 1;
  // Wandkörper liegt hinter der Fläche (gegen dir)
  const wx0 = p.x - ux * W / 2 - (dx ? (dx > 0 ? thick : 0) : 0), wx1 = p.x + ux * W / 2 + (dx ? (dx < 0 ? thick : 0) : 0);
  const wz0 = p.z - uz * W / 2 - (dz ? (dz > 0 ? thick : 0) : 0), wz1 = p.z + uz * W / 2 + (dz ? (dz < 0 ? thick : 0) : 0);
  level.world.add({ type: 'box', min: [Math.min(wx0, wx1), p.y, Math.min(wz0, wz1)], max: [Math.max(wx0, wx1), p.y + H, Math.max(wz0, wz1)], tag: 'plattenwand' });
  const mode = spec.mode ?? 'takt';
  const period = spec.period ?? 5, outT = spec.out ?? 2.4, stagger = spec.stagger ?? 0.45, warnT = spec.warn ?? 0.6, fold = 0.35;
  // Reihenfolge der Platten
  let order;
  if (Array.isArray(spec.order)) order = spec.order.map(([c, r]) => ({ col: c, row: r }));
  else if (spec.order === 'reihe') { order = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) order.push({ col: c, row: r }); }
  else { order = []; for (let r = 0; r < rows; r++) order.push({ col: r % 2 === 0 ? (Math.floor(r / 2) % cols) : (cols - 1 - (Math.floor(r / 2) % cols)), row: r }); }
  const panels = order.map((o, i) => {
    const u = -W / 2 + (o.col + 0.5) * pw;
    const cx = p.x + ux * u, cz = p.z + uz * u, y = p.y + o.row * ph;
    return { i, col: o.col, row: o.row, cx, cz, y, k: 0, state: 'innen', t: 0, solid: false, id: null, phase: (spec.phase ?? 0) + i * stagger, warn: 0 };
  });
  const st = { running: mode === 'takt' && !spec.idle, opened: false, outs: 0 };
  const stepBox = (pn) => {
    // Stufe: an der Unterkante der Platte, ragt ph (Plattenhöhe) aus der Wand (nach dir), Dicke shelf
    const ax0 = pn.cx - ux * (pw / 2 - 0.04), ax1 = pn.cx + ux * (pw / 2 - 0.04);
    const az0 = pn.cz - uz * (pw / 2 - 0.04), az1 = pn.cz + uz * (pw / 2 - 0.04);
    const ox0 = dx ? (dx > 0 ? pn.cx : pn.cx - ph) : ax0, ox1 = dx ? (dx > 0 ? pn.cx + ph : pn.cx) : ax1;
    const oz0 = dz ? (dz > 0 ? pn.cz : pn.cz - ph) : az0, oz1 = dz ? (dz > 0 ? pn.cz + ph : pn.cz) : az1;
    return { x0: Math.min(ox0, ox1), x1: Math.max(ox0, ox1), y0: pn.y - shelf, y1: pn.y, z0: Math.min(oz0, oz1), z1: Math.max(oz0, oz1) };
  };
  const setSolid = (pn, on) => {
    if (on && pn.id === null) {
      const b = stepBox(pn);
      if (figureInside(level, b)) return;
      pn.id = level.world.add({ type: 'box', min: [b.x0, b.y0, b.z0], max: [b.x1, b.y1, b.z1], owner: pn, tag: 'plattenwand-stufe' });
    } else if (!on && pn.id !== null) { level.world.remove(pn.id); pn.id = null; }
    pn.solid = pn.id !== null;
  };
  const handle = {
    panels, kind: 'plattenwand',
    start() { if (mode === 'takt') st.running = true; else open(); },
    stop() { if (mode === 'takt') st.running = false; else close(); },
    info: () => ({ out: panels.map((q) => (q.k > 0.95 ? '#' : q.k > 0.05 ? '~' : '.')).join(''), solid: panels.filter((q) => q.solid).length, running: st.running, opened: st.opened }),
  };
  const open = () => { if (st.opened) return; st.opened = true; panels.forEach((q) => { q.state = 'warte'; q.t = -q.i * stagger; }); };
  const close = () => { st.opened = false; panels.forEach((q) => { if (q.state !== 'innen') { q.state = 'warn'; q.t = 0; } }); };
  if (spec.id) level.named.set(spec.id, handle);
  star(level).walls.push(handle);
  const cyc = cycle([{ name: 'innen', t: Math.max(0.1, period - outT - fold * 2 - warnT) }, { name: 'klappt', t: fold }, { name: 'aussen', t: outT }, { name: 'warn', t: warnT }, { name: 'zu', t: fold }]);
  const near = spec.near ?? 6;
  level.onStep((dt) => {
    if (mode === 'treppe' && !st.opened) {
      for (const f of figures(level)) if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < near + W / 2 && f.pos.y < p.y + H) { open(); break; }
    }
    for (const q of panels) {
      if (mode === 'takt') {
        if (!st.running && q.state === 'innen') continue;
        const a = cyc.at(level.time + q.phase);
        if (a.name !== q.state) { if (a.name === 'klappt') { level.sfx('flip'); st.outs++; } q.state = a.name; }
        q.k = a.name === 'klappt' ? ease(a.u) : a.name === 'aussen' || a.name === 'warn' ? 1 : a.name === 'zu' ? 1 - ease(a.u) : 0;
        q.warn = a.name === 'warn' ? 1 : 0;
      } else {
        q.t += dt;
        if (q.state === 'warte' && q.t >= 0) { q.state = 'klappt'; q.t = 0; level.sfx('flip'); st.outs++; }
        else if (q.state === 'klappt') { q.k = ease(q.t / fold); if (q.t >= fold) { q.state = 'aussen'; q.k = 1; } }
        else if (q.state === 'warn') { q.warn = 1; if (q.t >= warnT) { q.state = 'zu'; q.t = 0; q.warn = 0; } }
        else if (q.state === 'zu') { q.k = 1 - ease(q.t / fold); if (q.t >= fold) { q.state = 'innen'; q.k = 0; } }
      }
      setSolid(q, q.k > 0.7 && q.state !== 'zu');
    }
  });
  if (!level.view) return handle;
  // Wand (statisch, weiß mit Fugen) und Platten (Instanzen, klappen um die Unterkante)
  const wallCol = spec.wall === 'grau' ? 0xb8bccc : 0xf2f0fa;
  const yaw = Math.atan2(-dz, dx);   // Normale der Fläche
  const g = box(dz ? W : thick, H, dz ? thick : W, (wx0 + wx1) / 2, p.y + H / 2, (wz0 + wz1) / 2, wallCol, { r: 0.12 });
  level.view.addStatic(g, { material: 'world' });
  const c1 = plateColor(spec.color, 0xff4a5a);
  const set = new PlateSet(level, panels.length, [pw - 0.12, 0.22, ph - 0.12], { name: 'plattenwand', frame: 0.12 });
  let t = 0;
  // lokale Lage: Platte liegt (k = 0) flach in der Wandfläche, Unterkante bei y; klappt um die Unterkante nach dir heraus
  set.render((dd) => {
    t += dd;
    for (const q of panels) {
      const a = (1 - q.k) * Math.PI / 2;   // 90° = senkrecht in der Wand, 0 = waagerecht heraus
      const r = (ph - 0.12) / 2;
      const outD = Math.cos(a) * r + 0.11, up = Math.sin(a) * r;
      const x = q.cx + dx * outD, z = q.cz + dz * outD, y = q.y + up - (q.k > 0.5 ? 0.11 : 0);
      // Kippen um die Querachse: bei dir ±Z um X, bei dir ±X um Z
      const tiltA = a * (dz ? -dz : dx);
      set.set(q.i, { x, y, z, rx: dz ? tiltA : 0, rz: dx ? tiltA : 0, color: c1, glow: q.warn ? 0.5 + 0.5 * Math.sin(t * 24) : 0 });
    }
  });
  void yaw;
  return handle;
}

export const TYPES = { drehplatte: buildDrehplatte, farbplatten: buildFarbplatten, plattenwand: buildPlattenwand };
