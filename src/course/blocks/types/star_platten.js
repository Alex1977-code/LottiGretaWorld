// Bausteine Platten der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-2 „Planetoiden-Hommage:
// kippende Drehplatten, rote Plattenbahn, Boost-Strecke auf Drehplatten (zu langsam = Absturz), Plattentreppe mit senkrechter
// Plattenwand, Schachbrett aus Platten“, S-1 „Bonusraum mit Farbfeldern“). Alle Platten eines Bausteins zeichnen als Instanzen
// (Registry-Modelle der Bonuswelten: Instanz-Varianten 'drehplatte'/'farbplatte' aus models/lib/instanced_star.js, Modell
// 'plattenwand' als ModelSet; mit look: 'eigen' bzw. ohne Modell eigene Platten: Kern + weißer Rahmen), je Baustein 1–2
// Zeichenaufrufe mit fester Hüllkugel; Takte auf der Level-Uhr.
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
// plattenwand – senkrechte Wand mit Schubplatten: die Platten fahren waagerecht aus der Wand heraus und werden Trittstufen
//   (im Takt nacheinander wie eine laufende Treppe, oder einmal als feste Treppe, sobald man nah kommt bzw. per Signal).
//   Vor dem Einfahren zittern/blinken sie (Vorwarnung); wer draufsteht, fährt mit zur Wand und fällt dann. Die Wand selbst
//   ist fest (Wandsprung) und mindestens depth + 0,1 m tief (eingefahrene Platten liegen ganz in ihr). Stufenabstand
//   ph = h / (Reihen + 1): unten bleibt ein Sockelband frei, Reihe r hat ihre Oberkante bei (r + 1)·ph.
//   { type: 'plattenwand', id, pos: [x, y, z] (Mitte der Unterkante der Wandfläche), dir: [0, 1] (Wandfläche zeigt nach +Z,
//     90°-Raster), size: [w, h] (Wandfläche, Standard [6, 8]), grid: [Spalten, Reihen] (Standard [3, 4]), depth: 1.6
//     (Ausfahrlänge = Stufentiefe), plate: 0.6 (Plattendicke, höchstens 0,6·ph), gap: 0.3 (Fuge zwischen Spalten), thick: 0.6
//     (Wandtiefe, mindestens depth + 0,1), mode: 'takt' | 'treppe' (bleibt draußen) | 'signal' (start = ausfahren, stop =
//     einfahren), order: 'treppe' (diagonal von unten) | 'reihe' (Reihe für Reihe) | [[Spalte, Reihe] …], period: 5 (s Takt),
//     out: 2.4 (s draußen), move: 0.35 (s Fahrt), stagger: 0.45 (s je Platte), phase, near: 6 (m, treppe: Auslöse-Abstand),
//     warn: 0.6, color: 'rot', wall: 'weiss' | 'grau', look: 'eigen' }
//   Optik: Registry-Modell 'plattenwand' (Platte mit Silberrahmen der Öffnung) als Instanz-Gruppe (ModelSet), sonst eigene
//   Schubplatten.
//   level.named.get(id) = { panels: [{ col, row, k (0..1 draußen), solid (k > 0,5), state ('innen'|'faehrt'|'aussen'|'warn'|
//     'zu'), mb (MovingBox) }], start(), stop(), info() → { out ('#'/'~'/'.' je Platte), solid, running, opened } };
//   Formen 'plattenwand' (Wand) und 'plattenwand-stufe' (MovingBox); star(level).walls.
//   Beispiel: { type: 'plattenwand', id: 'wand', pos: [0, 0, -120], size: [6, 9], grid: [3, 5], mode: 'takt' }

import * as THREE from 'three';
import { v3, addObject, box } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { star, PlateSet, plateColor, standerOn, figureInside, cycle, ease, clamp, figures, cullSphere, MovingBox, ModelSet, useModel, instancedModel, modelColor, sphereOf } from '../starkit.js';

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
  if (arrow) addArrows(level, plates, size, arrow, () => plates.map((p) => p.k));
  if (useModel(spec, 'drehplatte')) {
    // Registry-Modell (Instanz-Variante): Ursprung = Mitte der Unterseite, Drehachse durch die Plattenmitte; Modell-Achse
    // 'x' kippt wie hier (positiv hebt das −Z-Ende), 'z' hebt das +X-Ende
    const api = instancedModel(level, 'drehplatte', plates.length, { size: [w, d], thick: h, axis, color: modelColor(spec.color, 0x3a8aff), back: modelColor(spec.color2, 0xffd23a) }, sphereOf(plates, Math.max(w, d) + 0.5));
    plates.forEach((p) => api.setAt(p.i, [p.x, p.y - h, p.z], 0, 1, { tilt: 0 }));
    const holder = {};
    level.view.onFrame((dt) => {
      visDt(level, holder, dt);
      for (const p of plates) {
        const shake = p.state === 'warn' ? clamp(p.t / Math.max(0.01, warn), 0.3, 1) : 0;
        api.setState(p.i, { tilt: p.k * Math.PI / 2, shake });
      }
    });
    return handle;
  }
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
  return handle;
}

/** Leuchtende Boost-Pfeile auf Platten (eine Instanz-Gruppe), kippen mit (ks() → Kippung je Platte). */
function addArrows(level, plates, size, dir, ks) {
  const g = new THREE.ShapeGeometry(arrowShape());
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.95, depthWrite: false });
  const mesh = new THREE.InstancedMesh(g, mat, plates.length);
  mesh.renderOrder = 2;
  mesh.name = 'drehplatten_pfeile';
  { const xs = plates.map((q) => q.x), zs = plates.map((q) => q.z); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    cullSphere(mesh, { x: cx, y: plates[0].y, z: cz }, Math.hypot(Math.max(...xs) - cx, Math.max(...zs) - cz) + Math.max(...size)); }
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
  if (useModel(spec, 'farbplatte')) {
    // Registry-Modell (Instanz-Variante): Rahmen mit Goldsternen, Platte färbt von colors[0] nach colors[1], flash = Aufleuchten
    const api = instancedModel(level, 'farbplatte', n, { size: [w, d], thick: h, colors: [modelColor(spec.from, 0x3a8aff), modelColor(spec.to, 0xffd23a)] }, sphereOf(plates, Math.max(w, d)));
    const holder = {};
    let t = 0;
    for (const p of plates) { p.c = 0; api.setAt(p.i, [p.x, p.y - h, p.z], 0, 1, { color: 0 }); }
    level.view.onFrame((dt) => {
      const dd = visDt(level, holder, dt);
      t += dd;
      for (const p of plates) {
        p.pop = Math.max(0, p.pop - dd * 2.5);
        p.c += ((p.on ? 1 : 0) - p.c) * Math.min(1, dd * 12);
        api.setAt(p.i, [p.x, p.y - h - p.pop * 0.05, p.z], 0, 1, { color: p.c, flash: group.done ? 0.3 + 0.3 * Math.sin(t * 4 + p.i) : p.pop });
      }
    });
    return group;
  }
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
  let dx = 0, dz = 1;
  if (Array.isArray(spec.dir)) { dx = Math.sign(Math.round(spec.dir[0])); dz = Math.sign(Math.round(spec.dir[1])); if (dx && dz) dz = 0; }
  if (!dx && !dz) dz = 1;
  const [cols, rows] = spec.grid ?? [3, 4];
  // Stufen-Reihen über einem freien Sockelband: Reihe r hat ihre Oberkante bei (r + 1)·ph (unterste Stufe nicht am Boden)
  const cw = W / cols, ph = H / (rows + 1);
  const pw = Math.max(0.6, cw - (spec.gap ?? 0.3));
  const depth = spec.depth ?? 1.6, pt = Math.min(spec.plate ?? 0.6, ph * 0.6);
  // Die Wand ist mindestens so tief wie der Schub (eingefahrene Platten liegen ganz in ihr)
  const thick = Math.max(spec.thick ?? 0.6, depth + 0.1);
  // Querachse u (entlang der Wand): bei dir ±Z ist u = x, bei dir ±X ist u = z
  const ux = dz !== 0 ? 1 : 0, uz = dz !== 0 ? 0 : 1;
  // Wandkörper liegt hinter der Fläche (gegen dir)
  const bx0 = p.x - ux * W / 2 - (dx > 0 ? thick : 0), bx1 = p.x + ux * W / 2 + (dx < 0 ? thick : 0);
  const bz0 = p.z - uz * W / 2 - (dz > 0 ? thick : 0), bz1 = p.z + uz * W / 2 + (dz < 0 ? thick : 0);
  level.world.add({ type: 'box', min: [bx0, p.y, bz0], max: [bx1, p.y + H, bz1], tag: 'plattenwand' });
  const mode = spec.mode ?? 'takt';
  const period = spec.period ?? 5, outT = spec.out ?? 2.4, stagger = spec.stagger ?? 0.45, warnT = spec.warn ?? 0.6, move = spec.move ?? 0.35;
  // Reihenfolge der Platten
  let order;
  if (Array.isArray(spec.order)) order = spec.order.map(([c, r]) => ({ col: c, row: r }));
  else if (spec.order === 'reihe') { order = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) order.push({ col: c, row: r }); }
  else { order = []; for (let r = 0; r < rows; r++) order.push({ col: r % 2 === 0 ? (Math.floor(r / 2) % cols) : (cols - 1 - (Math.floor(r / 2) % cols)), row: r }); }
  const sx = dz ? pw : depth, sz = dz ? depth : pw;
  const panels = order.map((o, i) => {
    const u = -W / 2 + (o.col + 0.5) * cw;
    const cx = p.x + ux * u, cz = p.z + uz * u, y = p.y + (o.row + 1) * ph;
    const pn = { i, col: o.col, row: o.row, cx, cz, y, k: 0, state: 'innen', t: 0, solid: false, phase: (spec.phase ?? 0) + i * stagger, warn: 0, mb: null };
    // Schubplatte: fester Quader (Tiefe depth), fährt entlang dir aus der Wand; eingefahren liegt er ganz in der Wand
    pn.mb = new MovingBox(level, cx - dx * depth / 2, y - pt, cz - dz * depth / 2, sx, pt, sz, { owner: pn, tag: 'plattenwand-stufe' });
    return pn;
  });
  const st = { running: mode === 'takt' && !spec.idle, opened: false, outs: 0 };
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
  const cyc = cycle([{ name: 'innen', t: Math.max(0.1, period - outT - move * 2 - warnT) }, { name: 'faehrt', t: move }, { name: 'aussen', t: outT }, { name: 'warn', t: warnT }, { name: 'zu', t: move }]);
  const near = spec.near ?? 6;
  level.onStep((dt) => {
    if (mode === 'treppe' && !st.opened) {
      for (const f of figures(level)) if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < near + W / 2 && f.pos.y < p.y + H) { open(); break; }
    }
    for (const q of panels) {
      if (mode === 'takt') {
        if (!st.running && q.state === 'innen') { q.mb.still(); continue; }
        const a = cyc.at(level.time + q.phase);
        if (a.name !== q.state) { if (a.name === 'faehrt') { level.sfx('flip'); st.outs++; } q.state = a.name; }
        q.k = a.name === 'faehrt' ? ease(a.u) : a.name === 'aussen' || a.name === 'warn' ? 1 : a.name === 'zu' ? 1 - ease(a.u) : 0;
        q.warn = a.name === 'warn' ? 1 : 0;
      } else {
        q.t += dt;
        if (q.state === 'warte' && q.t >= 0) { q.state = 'faehrt'; q.t = 0; level.sfx('flip'); st.outs++; }
        else if (q.state === 'faehrt') { q.k = ease(q.t / move); if (q.t >= move) { q.state = 'aussen'; q.k = 1; } }
        else if (q.state === 'warn') { q.warn = 1; if (q.t >= warnT) { q.state = 'zu'; q.t = 0; q.warn = 0; } }
        else if (q.state === 'zu') { q.k = 1 - ease(q.t / move); if (q.t >= move) { q.state = 'innen'; q.k = 0; } }
      }
      const out = q.k * depth - depth / 2;
      q.mb.moveTo(q.cx + dx * out, q.y - pt, q.cz + dz * out, dt);
      q.solid = q.k > 0.5;
    }
  });
  if (!level.view) return handle;
  // Wand (statisch, weiß; Fläche 3 cm hinter der Ebene, damit eingefahrene Platten bündig davor sitzen)
  const wallCol = spec.wall === 'grau' ? 0xb8bccc : 0xf2f0fa;
  const back = 0.03;
  const g = box(dz ? W : thick - back, H, dz ? thick - back : W, (bx0 + bx1) / 2 - dx * back / 2, p.y + H / 2, (bz0 + bz1) / 2 - dz * back / 2, wallCol, { r: 0.12 });
  level.view.addStatic(g, { material: 'world' });
  const yaw = Math.atan2(-dz, dx);   // Modell: Platte fährt nach +X → dir
  const holder = {};
  let t = 0;
  const jitter = (q) => (q.warn ? Math.sin(t * 46 + q.i) * 0.035 : 0);
  if (useModel(spec, 'plattenwand')) {
    // Registry-Modell (eine Platte mit Silberrahmen der Öffnung; Ursprung = Mitte der Unterkante der Öffnung an der
    // Wandfläche) als Instanz-Gruppe: alle Platten einer Wand = 2 Zeichenaufrufe
    const set = new ModelSet(level, 'plattenwand', { size: [pw, pt], depth, color: modelColor(spec.color, 0xff4a5a) }, panels.length, [{ out: 0 }, { out: 1 }]);
    if (set.ok) {
      const sp = sphereOf([{ x: bx0, y: p.y, z: bz0 }, { x: bx1, y: p.y + H, z: bz1 }, { x: p.x + dx * depth, y: p.y + H / 2, z: p.z + dz * depth }], 0.5);
      set.cull(sp.center, sp.radius);
      const draw = () => {
        for (const q of panels) { const j = jitter(q); set.set(q.i, q.cx + ux * j, q.y - pt, q.cz + uz * j, yaw, q.k); }
        set.commit();
      };
      draw();
      level.view.onFrame((dt) => { t += visDt(level, holder, dt); draw(); });
      return handle;
    }
  }
  // eigene Optik: Schubplatten (Instanzen, farbiger Kern mit weißem Rahmen oben)
  const c1 = plateColor(spec.color, 0xff4a5a);
  const plates = new PlateSet(level, panels.length, [pw - 0.06, pt, depth], { name: 'plattenwand', frame: 0.12 });
  plates.render((dd) => {
    t += dd;
    for (const q of panels) {
      const j = jitter(q), out = q.k * depth - depth / 2 + 0.01;
      plates.set(q.i, { x: q.cx + dx * out + ux * j, y: q.y - pt / 2, z: q.cz + dz * out + uz * j, ry: dx ? Math.PI / 2 : 0, color: c1, glow: q.warn ? 0.5 + 0.5 * Math.sin(t * 24) : 0 });
    }
  });
  return handle;
}

export const TYPES = { drehplatte: buildDrehplatte, farbplatten: buildFarbplatten, plattenwand: buildPlattenwand };
