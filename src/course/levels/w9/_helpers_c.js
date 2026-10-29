// Hilfen für die Welt-Stern-Level S-6 „Honigwaben im Sternenmeer“ und S-7 „Riesenpilze im Tintenteich-Dschungel“ (kein Level:
// exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese beiden Level – andere Bonuswelt-Level
// haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über die offiziellen
// Aufbau-Haken an (LEVEL.build / LEVEL.setup) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer     line, ring, arc, column (Münzen)
//   2) Waben-Gitter     hexLattice (gleiche Formeln wie der Baustein waben), Wabenmaler (WabenMaler: rect, disc, lane, …),
//                       Ausgabe als waben-Felder in kleinen Stücken (je Stück eine Hüllkugel – zeichnet nur, was im Bild ist)
//   3) Mechanik S-6     schalterWaben (Waben-Weg erscheint per Schalter, Umrisse vorher), flinkeTreppe (Waben-Stufen erscheinen
//                       beim Hinaufsteigen und vergehen hinter einem), leuchtring (Leuchtring unter jeder Figur in der Draufsicht)
//   4) Mechanik S-7     grossbloecke (2-m-Riesenziegel: Stampfen von oben, Riesentrank, Bombe), riesentrankQuelle (?-Block mit
//                       Riesentrank füllt sich nach jedem Neustart neu)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), Bewegtes je Gruppe als
// eine Instanz-Gruppe.

import * as THREE from 'three';
import { addObject, lin, mixc, smooth, colorize, merge, Rnd, hex } from '../../blocks/kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { instancedModel, sphereOf, figures, onRespawn, roundedBox, SIDE } from '../../blocks/starkit.js';

const TAU = Math.PI * 2;

// =====================================================================================================================
// 1) Daten-Helfer (Münzen)
// =====================================================================================================================

export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });
/** Münzbogen von a nach b (Scheitel h über der Mitte) – Einzelmünzen. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * h, a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

// =====================================================================================================================
// 2) Waben-Gitter
// =====================================================================================================================

const odd = (r) => (((r % 2) + 2) % 2) === 1;

/**
 * Waben-Gitter wie der Baustein waben (blocks/types/star_draufsicht.js): Eckradius R, Fuge gap, Spitzen nach ±Z, Zeilen
 * nach −Z, ungerade Zeilen um eine halbe Spalte nach +X versetzt. Globale Zellen (Q, R): x = x0 + (Q + ½·ungerade) · colW,
 * z = z0 − R · rowD.
 */
export function hexLattice({ R = 1.6, gap = 0.06, x0 = 0, z0 = 0, y = 0, height = 0.6 } = {}) {
  const ri = (Math.sqrt(3) / 2) * R;
  const colW = 2 * ri + gap, rowD = 1.5 * R + gap * 0.87;
  const L = {
    R, gap, ri, colW, rowD, x0, z0, y, height,
    x: (Q, Rw) => x0 + (Q + (odd(Rw) ? 0.5 : 0)) * colW,
    z: (Rw) => z0 - Rw * rowD,
    /** Mitte der Oberseite der Zelle (Q, R) → [x, y, z] (dy: zusätzliche Höhe). */
    at: (Q, Rw, dy = 0) => [+L.x(Q, Rw).toFixed(3), y + dy, +L.z(Rw).toFixed(3)],
    /** nächste Zelle zum Punkt (x, z) → [Q, R] */
    cell(x, z) {
      const r0 = Math.round((z0 - z) / rowD);
      let best = null, bd = Infinity;
      for (let Rw = r0 - 1; Rw <= r0 + 1; Rw++) {
        const q0 = Math.round((x - x0) / colW - (odd(Rw) ? 0.5 : 0));
        for (let Q = q0 - 1; Q <= q0 + 1; Q++) {
          const d = Math.hypot(L.x(Q, Rw) - x, L.z(Rw) - z);
          if (d < bd) { bd = d; best = [Q, Rw]; }
        }
      }
      return best;
    },
    row: (z) => Math.round((z0 - z) / rowD),
  };
  return L;
}

/** Abstand Punkt–Strecke (waagerecht). */
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

/**
 * Wabenmaler: Zellen eines globalen Gitters mit Zeichen belegen (n normal, l Lava, i Eis, h hoch, ' ' leer) und als
 * waben-Felder ausgeben. Jede Mal-Funktion nimmt eine Fläche in Weltkoordinaten (x, z) und belegt alle Zellen, deren
 * Mitte darin liegt (in Aufruf-Reihenfolge, spätere übermalen frühere).
 */
export class WabenMaler {
  constructor(lattice) { this.L = lattice; this.cells = new Map(); }
  key(Q, R) { return `${Q},${R}`; }
  set(Q, R, ch) { if (ch === ' ' || ch === '.') this.cells.delete(this.key(Q, R)); else this.cells.set(this.key(Q, R), ch); return this; }
  get(Q, R) { return this.cells.get(this.key(Q, R)) ?? null; }
  /** alle Zellen mit Mitte, für die test(x, z, Q, R) gilt, im Zeilenbereich der Fläche */
  paint(zA, zB, test, ch) {
    const L = this.L;
    const r0 = Math.floor((L.z0 - Math.max(zA, zB)) / L.rowD) - 1, r1 = Math.ceil((L.z0 - Math.min(zA, zB)) / L.rowD) + 1;
    for (let R = r0; R <= r1; R++) {
      for (let Q = -40; Q <= 40; Q++) {
        const x = L.x(Q, R), z = L.z(R);
        if (test(x, z, Q, R)) this.set(Q, R, typeof ch === 'function' ? ch(x, z, Q, R) : ch);
      }
    }
    return this;
  }
  rect(x0, x1, zA, zB, ch = 'n') { return this.paint(zA, zB, (x, z) => x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z <= Math.max(zA, zB) && z >= Math.min(zA, zB), ch); }
  disc(cx, cz, r, ch = 'n') { return this.paint(cz + r, cz - r, (x, z) => Math.hypot(x - cx, z - cz) <= r, ch); }
  ring(cx, cz, r0, r1, ch = 'n') { return this.paint(cz + r1, cz - r1, (x, z) => { const d = Math.hypot(x - cx, z - cz); return d >= r0 && d <= r1; }, ch); }
  /** Weg entlang einer Polylinie [[x, z], …] mit halber Breite w */
  lane(pts, w, ch = 'n') {
    const zs = pts.map((p) => p[1]);
    return this.paint(Math.max(...zs) + w, Math.min(...zs) - w, (x, z) => {
      for (let i = 0; i < pts.length - 1; i++) if (segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= w) return true;
      return false;
    }, ch);
  }
  /** einzelne Zellen [[Q, R], …] */
  pick(list, ch = 'n') { for (const [Q, R] of list) this.set(Q, R, ch); return this; }
  /** alle belegten Zellen [{ Q, R, ch, x, z }] */
  list() {
    const out = [];
    for (const [k, ch] of this.cells) { const [Q, R] = k.split(',').map(Number); out.push({ Q, R, ch, x: this.L.x(Q, R), z: this.L.z(R) }); }
    return out;
  }
  /**
   * waben-Felder: je Stück höchstens rows Zeilen (und bei mehreren getrennten Spaltenbereichen je Bereich ein Feld), damit
   * jede Instanz-Gruppe nur gezeichnet wird, wenn ihr Stück im Bild ist. o: { rows: 5, id, gapCols: 2, ...Felder }
   */
  fields(o = {}) {
    const L = this.L, rowsPer = o.rows ?? 5;
    const all = this.list();
    if (!all.length) return [];
    const rMin = Math.min(...all.map((c) => c.R)), rMax = Math.max(...all.map((c) => c.R));
    const out = [];
    for (let a = rMin; a <= rMax; a += rowsPer) {
      const b = Math.min(rMax, a + rowsPer - 1);
      const part = all.filter((c) => c.R >= a && c.R <= b);
      if (!part.length) continue;
      // getrennte Spaltenbereiche (Lücke ≥ gapCols leere Spalten in allen Zeilen) → eigene Felder
      const qs = [...new Set(part.map((c) => c.Q))].sort((p, q) => p - q);
      const groups = [];
      for (const Q of qs) { const g = groups[groups.length - 1]; if (g && Q - g[1] <= (o.gapCols ?? 2)) g[1] = Q; else groups.push([Q, Q]); }
      for (const [q0, q1] of groups) {
        const cells = part.filter((c) => c.Q >= q0 && c.Q <= q1);
        if (!cells.length) continue;
        const mine = new Map(cells.map((c) => [this.key(c.Q, c.R), c.ch]));
        const r0 = Math.min(...cells.map((c) => c.R)), r1 = Math.max(...cells.map((c) => c.R));
        const qMin = q0 - 1;
        const map = [];
        for (let r = 0; r <= r1 - r0; r++) {
          const Rg = r0 + r;
          const sh = odd(r0) && odd(r) ? 1 : 0;   // lokale Spalte q ↔ globale Q = qMin + q + sh
          let s = '';
          for (let q = 0; q <= q1 - qMin + 1; q++) s += mine.get(this.key(qMin + q + sh, Rg)) ?? ' ';
          map.push(s.replace(/\s+$/, ''));
        }
        out.push({
          type: 'waben', pos: [+L.x(qMin, r0).toFixed(3), L.y, +L.z(r0).toFixed(3)], size: L.R, height: L.height, gap: L.gap, map,
          ...(o.extra ?? {}), ...(o.id ? { id: `${o.id}${out.length}` } : {}),
        });
      }
    }
    return out;
  }
}

// =====================================================================================================================
// 3) Mechanik S-6
// =====================================================================================================================

/**
 * Schalter-Waben: ein Waben-Weg, der erst per Aktion { reveal: id } (z. B. Druckknopf) Zelle für Zelle aufploppt; vorher
 * zeigen zarte Umrisse, wo er erscheinen wird. Gleiche Kollision wie der Baustein waben (Zylinder je Zelle, Tag 'wabe').
 *   spec { id, cells: [[x, y, z], …] (Oberseite, Reihenfolge = Erscheinen), size 1.6, height 0.6, gap 0.06, r (Kollisions-
 *          radius, Standard Innenradius), delay 0.09, hint true, onShown (Aktion) }
 *   level.named.get(id) = { cells, shown, want, reveal(), info() }
 */
export function schalterWaben(level, spec) {
  const R = spec.size ?? 1.6, H = spec.height ?? 0.6, gap = spec.gap ?? 0.06;
  const ri = (Math.sqrt(3) / 2) * R;
  const delay = spec.delay ?? 0.09;
  const cells = spec.cells.map((p, i) => ({ x: p[0], y: p[1], z: p[2], i, at: i * delay, shown: false, pop: 0, id: null, press: 0 }));
  const handle = { cells, shown: false, want: false, t: 0, kind: 'schalterwaben' };
  for (const c of cells) c.shape = { type: 'cyl', x: c.x, z: c.z, r: spec.r ?? ri - gap * 0.3, y0: c.y - H, y1: c.y, owner: c, tag: 'wabe' };
  handle.reveal = () => { if (handle.want) return; handle.want = true; handle.t = 0; level.sfx('switch'); };
  handle.info = () => ({ shown: handle.shown, want: handle.want, cells: cells.length, up: cells.filter((c) => c.shown).length });
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    if (!handle.want || handle.shown) return;
    handle.t += dt;
    let all = true;
    for (const c of cells) {
      if (!c.shown && handle.t >= c.at) {
        c.shown = true;
        c.id = level.world.add(c.shape);
        if (c.i % 2 === 0) level.sfx('blockhit');
        level.effects?.sparks({ x: c.x, y: c.y + 0.2, z: c.z }, 5);
      }
      if (!c.shown) all = false;
    }
    if (all) { handle.shown = true; runAction(level, spec.onShown, { pos: [cells[0].x, cells[0].y, cells[0].z], source: handle }); }
  });
  if (!level.view || !cells.length) return handle;
  const sp = sphereOf(cells, R + 0.6);
  const api = instancedModel(level, 'wabe', cells.length, { kind: 'normal', size: R - gap * 0.5, thick: H }, sp);
  api.meshes.forEach((m, i) => { if (i > 0) m.castShadow = false; });
  cells.forEach((c, i) => api.setAt(i, [c.x, c.y - H, c.z], Math.PI / 2, 1, 'hidden'));
  // Umrisse: zarte, leuchtende Sechsecke (eine Instanz-Gruppe)
  let ghost = null;
  if (spec.hint !== false) {
    const g = new THREE.CylinderGeometry(R - gap, R - gap, H * 0.5, 6, 1, true);
    g.rotateY(Math.PI / 2);
    ghost = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: spec.hintColor ?? 0xffe9a0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), cells.length);
    const m4 = new THREE.Matrix4();
    cells.forEach((c, i) => { m4.makeTranslation(c.x, c.y - H * 0.25, c.z); ghost.setMatrixAt(i, m4); });
    ghost.instanceMatrix.needsUpdate = true;
    ghost.renderOrder = 2;
    ghost.castShadow = false;
    ghost.boundingSphere = new THREE.Sphere(new THREE.Vector3(sp.center.x, sp.center.y, sp.center.z), sp.radius);
    addObject(level, ghost);
  }
  const holder = {};
  let tt = 0;
  level.view.onFrame((dt) => {
    const dd = visDt(level, holder, dt);
    tt += dd;
    if (ghost) { ghost.visible = !handle.want; ghost.material.opacity = 0.22 + Math.sin(tt * 3) * 0.1; }
    if (!handle.want) return;
    const on = new Set();
    for (const f of figures(level)) if (f.mode === 'ground' && f.ground?.owner && cells.includes(f.ground.owner)) on.add(f.ground.owner);
    cells.forEach((c, i) => {
      if (!c.shown) return;
      if (c.pop < 1) {
        c.pop = Math.min(1, c.pop + dd * 4);
        const k = Math.sin(c.pop * Math.PI * 0.5) + Math.sin(c.pop * Math.PI) * 0.18;
        api.setAt(i, [c.x, c.y - H, c.z], Math.PI / 2, [Math.max(0.05, k), Math.max(0.05, k), Math.max(0.05, k)], { flash: 1 - c.pop });
        return;
      }
      const target = on.has(c) ? 1 : 0;
      if (c.press === target && target === 0) return;
      c.press += (target - c.press) * Math.min(1, dd * 14);
      if (Math.abs(c.press - target) < 0.01) c.press = target;
      api.setState(i, { press: c.press });
    });
  });
  return handle;
}

/**
 * Flinke Treppe (Zielturm S-6): schwebende Waben-Stufen. Die erste (lead) ist immer da; wer auf Stufe i steht, lässt die
 * nächsten ahead Stufen aufploppen. Jede Stufe vergeht life s nach dem Erscheinen (die letzte 0,9 s blinkt sie) – also flink
 * hinauf! Sind alle wieder weg, beginnt die Kette von vorn. Kollision: Zylinder je Stufe (Tag 'flinkestufe').
 *   spec { id, steps: [[x, y, z], …] (Oberseite), size 1.05, height 0.45, life 3.4, ahead 2, keep (Index ab dem Stufen
 *          bleiben – z. B. die letzte), kind 'normal' | 'eis' }
 *   level.named.get(id) = { steps, top (höchste erreichte), info() }
 */
export function flinkeTreppe(level, spec) {
  const R = spec.size ?? 1.05, H = spec.height ?? 0.45;
  const ri = (Math.sqrt(3) / 2) * R;
  const life = spec.life ?? 3.4, ahead = spec.ahead ?? 2, keep = spec.keep ?? spec.steps.length;
  const steps = spec.steps.map((p, i) => ({ x: p[0], y: p[1], z: p[2], i, up: i === 0, age: 0, id: null, pop: i === 0 ? 1 : 0 }));
  const handle = { steps, top: 0, kind: 'flinketreppe', resets: 0 };
  for (const s of steps) {
    s.shape = { type: 'cyl', x: s.x, z: s.z, r: ri, y0: s.y - H, y1: s.y, owner: s, tag: 'flinkestufe' };
    if (s.up) s.id = level.world.add(s.shape);
  }
  const show = (s) => { if (s.up) return; s.up = true; s.age = 0; s.pop = 0; s.id = level.world.add(s.shape); level.sfx('blockhit'); level.effects?.sparks({ x: s.x, y: s.y, z: s.z }, 5); };
  const hide = (s) => { if (!s.up || s.i === 0 || s.i >= keep) return; s.up = false; if (s.id) level.world.remove(s.id); s.id = null; level.effects?.sparks({ x: s.x, y: s.y, z: s.z }, 4); };
  handle.info = () => ({ up: steps.filter((s) => s.up).length, top: handle.top, resets: handle.resets });
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    for (const f of figures(level)) {
      if (f.mode !== 'ground' || !f.ground?.owner) continue;
      const s = f.ground.owner;
      if (!steps.includes(s)) continue;
      handle.top = Math.max(handle.top, s.i);
      for (let k = 1; k <= ahead; k++) { const n = steps[s.i + k]; if (n) show(n); }
    }
    for (const s of steps) {
      if (!s.up || s.i === 0 || s.i >= keep) continue;
      s.age += dt;
      if (s.age >= life) hide(s);
    }
  });
  onRespawn(level, () => { for (const s of steps) hide(s); handle.resets++; });
  if (!level.view) return handle;
  const sp = sphereOf(steps, R + 0.6);
  const api = instancedModel(level, 'wabe', steps.length, { kind: spec.kind ?? 'normal', size: R, thick: H }, sp);
  api.meshes.forEach((m, i) => { if (i > 0) m.castShadow = false; });
  const holder = {};
  let tt = 0;
  level.view.onFrame((dt) => {
    const dd = visDt(level, holder, dt);
    tt += dd;
    steps.forEach((s, i) => {
      if (!s.up) { api.setAt(i, [s.x, s.y - H, s.z], Math.PI / 2, 1, 'hidden'); return; }
      s.pop = Math.min(1, s.pop + dd * 4.5);
      const k = s.pop < 1 ? Math.sin(s.pop * Math.PI * 0.5) + Math.sin(s.pop * Math.PI) * 0.2 : 1;
      const blink = s.i > 0 && s.i < keep && s.age > life - 0.9 && Math.sin(tt * 28) > 0;
      if (blink) { api.setAt(i, [s.x, s.y - H, s.z], Math.PI / 2, 1, 'hidden'); return; }
      api.setAt(i, [s.x, s.y - H, s.z], Math.PI / 2, [Math.max(0.05, k), Math.max(0.05, k), Math.max(0.05, k)], { flash: Math.max(0, 1 - s.pop) * 0.8 });
    });
  });
  return handle;
}

/**
 * Waben ohne Fugen-Löcher: Der Baustein waben gibt jeder Zelle einen Zylinder mit dem Innenradius; dort, wo drei Waben
 * zusammenstoßen, bleibt so ein Loch von ≈ 0,2 m, in dem eine stehende Figur (Fußquadrat 0,3 m) durchfällt. Hier bekommen
 * alle normalen, Eis- und Schalter-Waben dieses Levels einen etwas größeren Zylinder (r, Standard 1,5 bei Eckradius 1,6 –
 * die Löcher schließen sich, an freien Kanten ragt die Kollision höchstens 0,12 m über); Lava-Waben behalten ihren Radius,
 * damit der Rand daneben sicher bleibt. Nur dieses Level (LEVEL.build nach den Bausteinen).
 */
export function wabenOhneLoecher(level, r = 1.5) {
  for (const h of level.star?.combs ?? []) {
    for (const c of h.cells ?? []) {
      if (c.type === 'lava' || !c.id) continue;
      c.shape.r = r;
      level.world.update(c.id, { r });
    }
  }
}

/**
 * Münzen liegen in der Draufsicht flach (nur Darstellung): Von senkrecht oben sieht man eine stehende Münze nur als Strich.
 * Solange eine Münze in einem draufsicht-Bereich liegt (Gewicht w), kippt sie um bis zu 90° auf den Rücken und dreht sich in
 * der Ebene weiter – man sieht das Bitcoin-Zeichen. Umsetzung über den Instanz-Pool 'coin' dieses Levels (set mit Kippwinkel,
 * Mitte der Münze bleibt an ihrer Stelle). Nur dieses Level (LEVEL.setup).
 */
export function muenzenFlach(level, lift = 0.42) {
  const pool = level.view?.pools?.get('coin');
  if (!pool || pool.__flach) return;
  pool.__flach = true;
  const orig = pool.set.bind(pool);
  const tops = level.star?.topdown ?? [];
  pool.set = (i, x, y, z, yaw = 0, scale = 1, rx = 0, rz = 0) => {
    if (rx || rz) return orig(i, x, y, z, yaw, scale, rx, rz);
    let w = 0;
    for (const h of tops) w = Math.max(w, h.weight(x, z));
    if (w <= 0.001) return orig(i, x, y, z, yaw, scale);
    const th = -Math.PI / 2 * w, s = Math.sin(th), c = Math.cos(th);
    // Ursprung so verschieben, dass die Münzmitte (lift über dem Fußpunkt) an ihrer Stelle bleibt
    return orig(i, x - lift * s * Math.sin(yaw), y + lift - lift * c, z - lift * s * Math.cos(yaw), yaw, scale, th, 0);
  };
}

/**
 * Leuchtring unter jeder Figur (nur Darstellung): in der Draufsicht (Gewicht der draufsicht-Bereiche) liegt ein heller,
 * pulsierender Ring auf dem Boden unter Heldin und Klonen – so findet man die kleine Figur von oben sofort. Eine
 * Instanz-Gruppe, kein Schatten.  o { color 0xfff4c0, radius 0.8 }
 */
export function leuchtring(level, o = {}) {
  if (!level.view) return;
  const N = 6;
  const g = new THREE.RingGeometry((o.radius ?? 0.8) * 0.68, o.radius ?? 0.8, 32);
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: o.color ?? 0xfff4c0, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.InstancedMesh(g, mat, N);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.castShadow = false; mesh.receiveShadow = false;
  addObject(level, mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const holder = {};
  let t = 0;
  const tops = level.star?.topdown ?? [];
  level.view.onFrame((dt) => {
    t += visDt(level, holder, dt);
    const figs = figures(level).filter((f) => !f.dead && !f.hidden);
    let n = 0;
    for (const f of figs) {
      if (n >= N) break;
      let w = 0;
      for (const h of tops) w = Math.max(w, h.weight(f.pos.x, f.pos.z));
      if (w < 0.05) continue;
      const hit = level.world.raycastDown(f.pos.x, f.pos.y + 0.3, f.pos.z, 12);
      if (!hit) continue;
      const k = (1 + Math.sin(t * 5 + n) * 0.08) * (f.big ? 1 : 0.8) * (0.6 + 0.4 * w);
      m4.compose(p.set(f.pos.x, hit.y + 0.04, f.pos.z), q, s.set(k, 1, k));
      mesh.setMatrixAt(n++, m4);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mat.opacity = 0.65 + Math.sin(t * 5) * 0.15;
  });
}
