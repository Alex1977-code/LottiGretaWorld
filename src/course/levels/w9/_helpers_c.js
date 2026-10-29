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
 * Instanz-Gruppe, kein Schatten. In der Luft liegt er auf dem Boden darunter – so sieht man von oben, wo man landet.
 *   o { color 0x2ad8e8 (inneres Band), radius 0.85 }
 */
export function leuchtring(level, o = {}) {
  if (!level.view) return;
  const N = 6;
  // zwei Bänder: außen weiß, innen türkis – auf Honig, Lava und Eis gleich gut zu sehen; dazu vier kleine Zacken
  const R0 = o.radius ?? 0.85;
  const band = (r0, r1, col) => { const g = new THREE.RingGeometry(r0, r1, 36).toNonIndexed(); const c = lin(col); return colorize(g, (pp, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }); };
  const ticks = [];
  for (let k = 0; k < 4; k++) {
    const tg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.13, R0 + 0.02, 0), new THREE.Vector3(0.13, R0 + 0.02, 0), new THREE.Vector3(0, R0 + 0.24, 0)]);
    tg.computeVertexNormals();
    tg.rotateZ(k * Math.PI / 2 + Math.PI / 4);
    const c = lin(0xffffff);
    colorize(tg, (pp, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; });
    ticks.push(tg);
  }
  const g = merge([band(R0 * 0.8, R0, 0xffffff), band(R0 * 0.6, R0 * 0.8, o.color ?? 0x2ad8e8), ...ticks]);
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
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
    mat.opacity = 0.8 + Math.sin(t * 5) * 0.12;
  });
}

// =====================================================================================================================
// 4) Mechanik S-7
// =====================================================================================================================

const GROSS = new Map();
/**
 * Riesenziegel 2 × 2 × 2 m: gerundeter Würfel mit Bild-Atlas (links Ziegelmauer in warmem Terrakotta mit hellen Fugen und
 * Moosrand oben, rechts Mooskissen mit Blümchen für die Oberseite) – ein Material, ein Zeichenaufruf für alle Blöcke.
 * kind 'stein': grauer Riesen-Steinblock (nur Riesentrank/Bombe) mit Nieten, Rissen und Moosflecken.
 */
function grossLook(S, kind = 'ziegel') {
  const key = `${kind}:${S}`;
  if (GROSS.has(key)) return GROSS.get(key);
  const g0 = roundedBox(S * 0.98, S * 0.98, S * 0.98, 0.16, SIDE.ALL, 0, 3);
  const g = g0.index ? g0.toNonIndexed() : g0;
  const pos = g.attributes.position, nor = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / S + 0.5, y = pos.getY(i) / S + 0.5, z = pos.getZ(i) / S + 0.5;
    const nx = Math.abs(nor.getX(i)), ny = nor.getY(i), nz = Math.abs(nor.getZ(i));
    let u, v;
    if (ny > 0.7) { u = 0.5 + x * 0.5; v = z; }                    // Oberseite: Moos
    else if (ny < -0.7) { u = x * 0.5; v = z * 0.25; }             // Unterseite: Ziegel
    else if (nx > nz) { u = z * 0.5; v = y; }                       // Seiten ±X
    else { u = x * 0.5; v = y; }                                    // Seiten ±Z
    uv[i * 2] = Math.min(0.999, Math.max(0.001, u)); uv[i * 2 + 1] = Math.min(0.999, Math.max(0.001, v));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (g.attributes.color) g.deleteAttribute('color');
  g.translate(0, S / 2, 0);
  const W = 512, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (kind === 'stein') {
    // Seite: hellgraue Platte mit dunklerem Rahmen, Nieten in den Ecken, ein Riss; Oberseite: Stein mit Moosflecken
    x.fillStyle = '#8c94a2'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#b8c0cc'; x.beginPath(); x.roundRect(16, 16, 224, 224, 22); x.fill();
    x.fillStyle = '#a4acba'; x.beginPath(); x.roundRect(40, 40, 176, 176, 16); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.roundRect(26, 22, 150, 12, 6); x.fill();
    for (const [px, py] of [[34, 34], [222, 34], [34, 222], [222, 222]]) { x.fillStyle = '#6a7282'; x.beginPath(); x.arc(px, py, 9, 0, TAU); x.fill(); x.fillStyle = '#dfe4ea'; x.beginPath(); x.arc(px - 2, py - 2, 4, 0, TAU); x.fill(); }
    x.strokeStyle = '#5a6272'; x.lineWidth = 5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(150, 60); x.lineTo(132, 104); x.lineTo(150, 128); x.lineTo(126, 176); x.stroke();
    x.fillStyle = '#58c03a';
    x.beginPath(); x.moveTo(0, 0); x.lineTo(256, 0); x.lineTo(256, 12);
    for (let i = 16; i >= 0; i--) x.lineTo(i * 16, 10 + (i % 3 ? 4 : 16));
    x.closePath(); x.fill();
    x.fillStyle = '#a4acba'; x.fillRect(256, 0, 256, 256);
    x.fillStyle = '#c4ccd6'; x.beginPath(); x.roundRect(276, 20, 216, 216, 20); x.fill();
    for (let i = 0; i < 14; i++) { const px = 256 + ((i * 89) % 230) + 13, py = ((i * 53) % 230) + 13; x.fillStyle = i % 2 ? 'rgba(90,200,58,0.75)' : 'rgba(150,232,100,0.6)'; x.beginPath(); x.arc(px, py, 12 + (i % 3) * 6, 0, TAU); x.fill(); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const look = { S, g, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.05 }), debris: 0x9aa2ae };
    GROSS.set(key, look);
    return look;
  }
  // Ziegel (linke Hälfte: 256 × 256 = eine Blockseite)
  x.fillStyle = '#f2c89a'; x.fillRect(0, 0, 256, 256);
  const cols = ['#e2703c', '#ec8448', '#d26234', '#e87a42', '#dc6a38'];
  const rows = 4, bh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 64 : 0;
    for (let k = -1; k < 3; k++) {
      const bx = k * 128 + off, by = r * bh;
      x.fillStyle = cols[(r * 3 + k + 5) % cols.length];
      x.beginPath(); x.roundRect(bx + 5, by + 5, 118, bh - 10, 10); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); x.roundRect(bx + 12, by + 9, 80, 9, 4); x.fill();
      x.fillStyle = 'rgba(90,30,10,0.18)'; x.beginPath(); x.roundRect(bx + 8, by + bh - 18, 112, 9, 4); x.fill();
    }
  }
  // Moosrand oben an den Seiten (Textur v = 1 oben → Zeile 0 im Bild)
  x.fillStyle = '#58c03a';
  x.beginPath(); x.moveTo(0, 0); x.lineTo(256, 0); x.lineTo(256, 18);
  for (let i = 16; i >= 0; i--) x.lineTo(i * 16, 16 + (i % 2 ? 14 : 4) + (i % 3) * 3);
  x.closePath(); x.fill();
  // Moos-Oberseite (rechte Hälfte) mit Blümchen
  x.fillStyle = '#5ac83a'; x.fillRect(256, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const px = 256 + ((i * 97) % 240) + 8, py = ((i * 61) % 240) + 8;
    x.fillStyle = i % 3 ? 'rgba(160,240,110,0.55)' : 'rgba(40,140,40,0.35)';
    x.beginPath(); x.arc(px, py, 10 + (i % 4) * 4, 0, TAU); x.fill();
  }
  for (let i = 0; i < 6; i++) {
    const px = 256 + 30 + ((i * 83) % 200), py = 30 + ((i * 47) % 200);
    x.fillStyle = ['#ffffff', '#ffd23a', '#ff8ad0'][i % 3];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; x.beginPath(); x.arc(px + Math.cos(a) * 6, py + Math.sin(a) * 6, 5, 0, TAU); x.fill(); }
    x.fillStyle = '#ffb020'; x.beginPath(); x.arc(px, py, 4, 0, TAU); x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const look = { S, g, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }), debris: 0xd8683a };
  GROSS.set(key, look);
  return look;
}

/**
 * Großblöcke (S-7): Riesenziegel (2 m). Fest; **Stampfen von oben**, der **Riesentrank** (Riesenkörper), Explosionen und
 * Kanonenkugeln zerbrechen einen Block (Tatze, Feuer, Kopfstoß prallen ab). Eine Instanz-Gruppe für alle Blöcke einer Gruppe.
 *   spec { id, blocks: [[x, y, z], …] (Mitte der Unterseite), size 2, content: { index: Inhalt } ('coins:3', Power-up, …),
 *          onBreak (Aktion beim ersten Bruch), by: ['pound', 'mega', 'bomb', 'cannon'], look: 'ziegel' | 'stein' (grauer
 *          Riesen-Steinblock; Standard dann by ['mega', 'bomb']), shadow true }
 *   level.named.get(id) = { blocks [{ x, y, z, broken }], broken (Zahl), info() }
 */
export function grossbloecke(level, spec) {
  const S = spec.size ?? 2;
  const by = new Set(spec.by ?? (spec.look === 'stein' ? ['mega', 'bomb'] : ['pound', 'mega', 'bomb', 'cannon']));
  const blocks = spec.blocks.map((p, i) => ({ x: p[0], y: p[1], z: p[2], i, broken: false, id: null }));
  const handle = { blocks, broken: 0, kind: 'grossbloecke', info: () => ({ blocks: blocks.length, broken: handle.broken }) };
  let mesh = null;
  const m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const brk = (b) => {
    if (b.broken) return;
    b.broken = true;
    handle.broken++;
    if (b.id) level.world.remove(b.id);
    level.effects?.debris({ x: b.x, y: b.y + S * 0.5, z: b.z }, spec.look === 'stein' ? 0x9aa2ae : 0xd8683a, 12);
    level.effects?.debris({ x: b.x, y: b.y + S * 0.9, z: b.z }, 0x5ac83a, 5);
    level.sfx('brickbreak');
    level.shake?.(0.12);
    const c = spec.content?.[b.i];
    if (c) {
      const m = /^coins?:(\d+)$/.exec(String(c));
      if (m) { for (let k = 0; k < +m[1]; k++) { const a = (k / +m[1]) * TAU; level.spawn('coin', { pos: [b.x + Math.cos(a) * 0.7, b.y + 0.2, b.z + Math.sin(a) * 0.7] }); } }
      else level.spawn('powerup', { pos: [b.x, b.y, b.z], power: c });
    }
    if (handle.broken === 1) runAction(level, spec.onBreak, { pos: [b.x, b.y, b.z], source: handle });
    if (mesh) { mesh.setMatrixAt(b.i, zero); mesh.instanceMatrix.needsUpdate = true; }
  };
  for (const b of blocks) {
    b.onHit = (kind) => { if (by.has(kind)) brk(b); };
    b.id = level.world.add({ type: 'box', min: [b.x - S / 2, b.y, b.z - S / 2], max: [b.x + S / 2, b.y + S, b.z + S / 2], ...(spec.look === 'stein' ? { mega: true } : { breakable: true }), owner: b, tag: 'block:gross' });
  }
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view || !blocks.length) return handle;
  const look = grossLook(S, spec.look ?? 'ziegel');
  mesh = new THREE.InstancedMesh(look.g, look.mat, blocks.length);
  mesh.name = 'grossbloecke';
  mesh.castShadow = spec.shadow !== false; mesh.receiveShadow = true;
  for (const b of blocks) { m4.makeTranslation(b.x, b.y, b.z); mesh.setMatrixAt(b.i, m4); }
  mesh.instanceMatrix.needsUpdate = true;
  const sp = sphereOf(blocks.map((b) => ({ x: b.x, y: b.y + S / 2, z: b.z })), S);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(sp.center.x, sp.center.y, sp.center.z), sp.radius);
  addObject(level, mesh);
  return handle;
}

/**
 * Riesentrank-Quelle (S-7): ein ?-Block mit Riesentrank, der sich wieder füllt, sobald niemand mehr riesig ist, kein
 * Riesentrank herumliegt und refill s vergangen sind (nach einem Absturz oder wenn die 10 s um sind, gibt es also einen
 * neuen – fair für Kinder). spec { id, pos: [x, y, z] (Mitte der Unterseite), refill 2.5 }
 *   level.named.get(id) = { block, fills, info() }
 */
export function riesentrankQuelle(level, spec) {
  const handle = { kind: 'riesentrankquelle', fills: 0, block: null, wait: 0 };
  const make = () => { handle.block = level.spawn('question', { pos: spec.pos, content: 'riese' }); };
  make();
  handle.info = () => ({ fills: handle.fills, kind: handle.block?.kind ?? null, alive: !!handle.block?.alive });
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    const b = handle.block;
    const empty = !b || !b.alive || b.kind === 'used';
    if (!empty) { handle.wait = 0; return; }
    const giant = figures(level).some((f) => f.power === 'riese');
    const lying = level.entities.some((e) => e.kind === 'powerup' && e.power === 'riese' && e.alive && !e.removed);
    if (giant || lying) { handle.wait = 0; return; }
    handle.wait += dt;
    if (handle.wait < (spec.refill ?? 2.5)) return;
    handle.wait = 0;
    handle.fills++;
    if (b && b.alive) { b.content = { coins: 0, power: 'riese' }; b.kind = 'question'; b.setLook('question'); b.bump?.(); }
    else make();
    level.sfx('powerup_appear');
    level.effects?.sparks({ x: spec.pos[0], y: spec.pos[1] + 1.2, z: spec.pos[2] }, 10);
  });
  return handle;
}

// =====================================================================================================================
// 5) Dschungel-Kulisse S-7 (statisch verschmolzen; Kollision, wo man darauf steht)
// =====================================================================================================================

const C3 = (h) => lin(typeof h === 'number' ? h : hex(h));
const shadeY = (g, lo, hi, k = 0.8) => { const L = C3(lo), H = C3(hi); return colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(L, H, smooth(-0.7, 0.9, n.y * k + n.z * 0.25 - n.x * 0.1), o)); };

/**
 * Riesenpilz als Plattform: dicker Stiel (fest) und breiter, gepunkteter Hut, auf dem man steht (Oberseite top, Radius r).
 * Kollision: Zylinder für Stiel und Hut-Oberseite. o { x, y (Boden), z, top, r, color }
 */
export function riesenpilzPlattform(level, o) {
  const r = o.r ?? 2.8, top = o.top, y0 = o.y ?? 0, cap = Math.max(0.9, r * 0.36);
  level.world.add({ type: 'cyl', x: o.x, z: o.z, r: r * 0.24, y0, y1: top - cap * 0.5, tag: 'riesenpilz:stiel' });
  level.world.add({ type: 'cyl', x: o.x, z: o.z, r: r * 0.97, y0: top - 0.6, y1: top, tag: 'riesenpilz' });
  if (!level.view) return;
  const parts = [];
  const st = new THREE.CylinderGeometry(r * 0.22, r * 0.3, top - y0, 14); st.translate(o.x, y0 + (top - y0) / 2, o.z);
  parts.push(shadeY(st, 0xd8c8a0, 0xfff6e0));
  const ring = new THREE.TorusGeometry(r * 0.27, 0.12, 6, 18); ring.rotateX(Math.PI / 2); ring.translate(o.x, top - cap - 0.5, o.z);
  parts.push(shadeY(ring, 0xe8dcc0, 0xffffff));
  const hc = C3(o.color ?? 0xff5a3a), white = C3(0xffffff), under = C3(0xf0d8b0);
  const capG = new THREE.SphereGeometry(r, 22, 10, 0, TAU, 0, Math.PI / 2).toNonIndexed(); capG.scale(1, cap / r, 1);
  colorize(capG, (p, n, out) => {
    const a = Math.atan2(p.z, p.x), h = p.y / cap;
    const dot = Math.sin(a * 5 + h * 3) * Math.sin(h * 9 + 1.2) > 0.55 && h > 0.15;
    const c = dot ? white : hc; const k = 0.78 + 0.22 * n.y; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k;
  });
  capG.translate(o.x, top - cap * 0.55, o.z);
  parts.push(capG);
  const base = new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.12, 22, 1); base.translate(o.x, top - cap * 0.55 - 0.05, o.z);
  parts.push(colorize(base.toNonIndexed(), (p, n, out) => { out[0] = under[0]; out[1] = under[1]; out[2] = under[2]; }));
  level.view.addStatic(merge(parts), { material: 'world', castShadow: true });
}

/**
 * Treibende Riesenstämme auf dem Wasser (S-7): liegen quer (entlang X) knapp unter der Oberfläche – oben schwimmen geht
 * nicht, man taucht darunter durch. Kollision als Quader. list [{ x, y (Mitte), z, length, r }]
 */
export function riesenstaemme(level, list) {
  const parts = [];
  for (const s of list) {
    const r = s.r ?? 0.8, len = s.length ?? 20;
    level.world.add({ type: 'box', min: [s.x - len / 2, s.y - r, s.z - r], max: [s.x + len / 2, s.y + r, s.z + r], tag: 'riesenstamm' });
    if (!level.view) continue;
    const g = new THREE.CylinderGeometry(r, r, len, 14, 1).toNonIndexed();
    g.rotateZ(Math.PI / 2);
    const bark = C3(0x8a5a32), barkHi = C3(0xb07a48), moss = C3(0x5ab83a);
    colorize(g, (p, n, o) => {
      const ring = Math.abs(n.x) > 0.8;
      if (ring) { const d = Math.hypot(p.y, p.z) / r; mixc(C3(0xe8c890), C3(0xc89a60), (Math.sin(d * 18) * 0.5 + 0.5), o); return; }
      const st = Math.sin(p.x * 5 + p.z * 2) * 0.5 + 0.5;
      mixc(bark, barkHi, st * 0.6, o);
      if (n.y > 0.55 && Math.sin(p.x * 1.3) > -0.2) mixc(o, moss, 0.75, o);
    });
    g.translate(s.x, s.y, s.z);
    parts.push(g);
    // zwei Äste mit Blättchen
    for (const dx of [-len * 0.28, len * 0.31]) {
      const b = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6); b.rotateZ(0.6); b.translate(s.x + dx, s.y + r + 0.5, s.z);
      parts.push(shadeY(b, 0x6a4a2a, 0x9a6a3a));
      const leaf = new THREE.SphereGeometry(0.55, 8, 5); leaf.scale(1, 0.25, 0.6); leaf.translate(s.x + dx + 0.6, s.y + r + 1.25, s.z);
      parts.push(shadeY(leaf, 0x2a9a3a, 0x9af07a));
    }
  }
  if (level.view && parts.length) level.view.addStatic(merge(parts), { material: 'world', castShadow: true });
}

/**
 * Riesenbäume am Rand (S-7, Kulisse): dicker Stamm mit Wurzelfüßen, Moos, oben ein Blätterdach aus großen Kugeln.
 * list [{ x, y, z, r (Stamm), h (Höhe), crown }] – optional fest (solid: Stamm-Zylinder).
 */
export function riesenbaeume(level, list) {
  const parts = [];
  const rnd = new Rnd(4711);
  for (const t of list) {
    const r = t.r ?? 1.6, h = t.h ?? 18, y = t.y ?? 0;
    if (t.solid) level.world.add({ type: 'cyl', x: t.x, z: t.z, r, y0: y - 30, y1: y + h, tag: 'riesenbaum' });
    if (!level.view) continue;
    const st = new THREE.CylinderGeometry(r * 0.85, r * 1.15, h + 30, 14, 3).toNonIndexed(); st.translate(t.x, y + (h - 30) / 2, t.z);
    const bark = C3(0x7a4e2c), barkHi = C3(0xa06a3a), moss = C3(0x4aa83a);
    colorize(st, (p, n, o) => { mixc(bark, barkHi, Math.sin(Math.atan2(p.z - t.z, p.x - t.x) * 9) * 0.5 + 0.5, o); if (n.z > 0.4 && Math.sin(p.y * 0.7) > 0.3) mixc(o, moss, 0.6, o); });
    parts.push(st);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + rnd.real(-0.3, 0.3);
      const root = new THREE.CylinderGeometry(0.25 * r, 0.55 * r, 2.6 * r, 7); root.rotateZ(1.0); root.rotateY(-a);
      root.translate(t.x + Math.cos(a) * r * 1.3, y + 0.5, t.z + Math.sin(a) * r * 1.3);
      parts.push(shadeY(root, 0x6a4424, 0x9a6a3a));
    }
    const crown = t.crown ?? 1;
    if (crown) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + rnd.real(0, 1);
        const s = new THREE.SphereGeometry(r * 2.6 * rnd.real(0.8, 1.2), 12, 8);
        s.scale(1, 0.55, 1);
        s.translate(t.x + Math.cos(a) * r * 2.4, y + h + rnd.real(-1, 1.5), t.z + Math.sin(a) * r * 2.4);
        parts.push(shadeY(s, 0x1e7a32, 0x7ae05a, 1));
      }
    }
  }
  if (level.view && parts.length) level.view.addStatic(merge(parts), { material: 'world', castShadow: false });
}

/** Wurzelsäulen unter Wasser (S-7): senkrechte Wurzelstränge vom Grund bis über die Oberfläche (fest). list [{ x, z, y0, y1, r }] */
export function wurzelsaeulen(level, list) {
  const parts = [];
  for (const w of list) {
    const r = w.r ?? 0.7;
    level.world.add({ type: 'cyl', x: w.x, z: w.z, r, y0: w.y0, y1: w.y1, tag: 'wurzel' });
    if (!level.view) continue;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU;
      const g = new THREE.CylinderGeometry(r * 0.5, r * 0.62, w.y1 - w.y0 + 0.6, 7, 4).toNonIndexed();
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i); pos.setX(i, pos.getX(i) + Math.sin(yy * 0.9 + k * 2) * 0.18); pos.setZ(i, pos.getZ(i) + Math.cos(yy * 0.8 + k) * 0.18); }
      g.computeVertexNormals();
      g.translate(w.x + Math.cos(a) * r * 0.42, (w.y0 + w.y1) / 2, w.z + Math.sin(a) * r * 0.42);
      parts.push(shadeY(g, 0x5a3a22, 0x9a6a3a));
    }
  }
  if (level.view && parts.length) level.view.addStatic(merge(parts), { material: 'world', castShadow: true });
}

/** Geometrie in Weltlage bringen (Maßstab s, Gier yaw, Ort p) – gibt g zurück. */
const place = (g, p, yaw = 0, s = 1) => { if (s !== 1) g.scale(s, s, s); if (yaw) g.rotateY(yaw); g.translate(p[0], p[1], p[2]); return g; };
const fillC = (g, col) => { const c = C3(col); return colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };

/**
 * Dschungel-Kleinigkeiten in Riesengröße (S-7, Kulisse, statisch verschmolzen): Riesengras-Büschel, Kleeblätter am Boden,
 * Marienkäfer, Schneckenhäuser, Beeren, bemooste Felsen, Riesen-Eicheln. Alles im Spielzeug-Look mit kräftigen Farben;
 * solid: true gibt einen Kollisionsquader (Käfer, Felsen, Schneckenhaus als Hindernis/Stufe).
 *   list [{ kind: 'gras' | 'klee' | 'kaefer' | 'schnecke' | 'beeren' | 'fels' | 'eichel', pos: [x, y, z], s (Maßstab), yaw,
 *           color, solid }]
 */
export function dschungelDeko(level, list) {
  const parts = [], glow = [];
  const rnd = new Rnd(31337);
  for (const it of list) {
    const p = it.pos, s = it.s ?? 1, yaw = it.yaw ?? rnd.real(0, TAU);
    switch (it.kind) {
      case 'gras': {   // Büschel aus 5–7 hohen, gebogenen Halmen
        const n = 5 + (rnd.int(0, 2));
        for (let k = 0; k < n; k++) {
          const h = (3.2 + rnd.real(0, 2.6)) * s, w = 0.36 * s;
          const g = new THREE.PlaneGeometry(w, h, 1, 5).toNonIndexed();
          const pos = g.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i) + h / 2, t = y / h;
            pos.setX(i, pos.getX(i) * (1 - t * 0.92));
            pos.setZ(i, t * t * 1.2 * s);
            pos.setY(i, y);
          }
          g.computeVertexNormals();
          const lo = C3(0x2a8a2a), hi = C3(k % 2 ? 0xa8f070 : 0x7ad84a);
          colorize(g, (q, nn, o) => mixc(lo, hi, Math.min(1, q.y / h * 1.2), o));
          parts.push(place(g, p, yaw + (k / n) * TAU + rnd.real(-0.3, 0.3)));
        }
        break;
      }
      case 'klee': {   // drei herzförmige Blätter flach am Boden
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * TAU;
          for (const side of [-1, 1]) {
            const g = new THREE.CircleGeometry(0.75 * s, 14).toNonIndexed(); g.rotateX(-Math.PI / 2);
            const lo = C3(k === 1 ? 0x7ae85a : 0x66d84c), hi = C3(0xd8ffb0);
            colorize(g, (q, nn, o) => mixc(hi, lo, Math.min(1, Math.hypot(q.x, q.z) / (0.75 * s) * 1.6), o));
            g.translate(Math.cos(a) * 0.9 * s + Math.cos(a + side * 0.6) * 0.35 * s, 0.05 + k * 0.01, Math.sin(a) * 0.9 * s + Math.sin(a + side * 0.6) * 0.35 * s);
            parts.push(place(g, p, yaw));
          }
        }
        const st = new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.1, 6); st.translate(0, 0.05, 0);
        parts.push(place(fillC(st, 0x2a8a2a), p, yaw));
        break;
      }
      case 'kaefer': {   // Riesen-Marienkäfer (≈ 1,6 m lang): rote Kuppel mit schwarzen Punkten, schwarzer Kopf, Fühler
        const body = new THREE.SphereGeometry(0.9 * s, 16, 10, 0, TAU, 0, Math.PI / 2).toNonIndexed(); body.scale(1, 0.75, 1.2);
        const red = C3(it.color ?? 0xe8282a), blk = C3(0x1a1a22);
        colorize(body, (q, nn, o) => {
          const a = Math.atan2(q.z, q.x), dots = [[0.4, 0.3], [-0.4, 0.3], [0.45, -0.35], [-0.45, -0.35], [0, 0.7], [0, -0.75]];
          const dot = dots.some(([dx, dz]) => Math.hypot(q.x / s - dx, q.z / s - dz) < 0.2) || Math.abs(q.x) < 0.03 * s;
          const c = dot ? blk : red; const k = 0.75 + 0.25 * nn.y; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; void a;
        });
        parts.push(place(body, p, yaw));
        const head = new THREE.SphereGeometry(0.42 * s, 12, 8); head.translate(0, 0.25 * s, 1.05 * s);
        parts.push(place(fillC(head, 0x22222c), p, yaw));
        for (const sx of [-1, 1]) {
          const eye = new THREE.SphereGeometry(0.13 * s, 8, 6); eye.translate(sx * 0.18 * s, 0.38 * s, 1.36 * s);
          glow.push(place(fillC(eye, 0xffffff), p, yaw));
          const ant = new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.6 * s, 4); ant.rotateX(0.7); ant.rotateZ(-sx * 0.4); ant.translate(sx * 0.22 * s, 0.75 * s, 1.35 * s);
          parts.push(place(fillC(ant, 0x22222c), p, yaw));
        }
        if (it.solid) level.world.add({ type: 'cyl', x: p[0], z: p[2], r: 0.95 * s, y0: p[1], y1: p[1] + 0.68 * s, tag: 'marienkaefer' });
        break;
      }
      case 'schnecke': {   // Schneckenhaus: Spirale aus Ringen in Karamell/Creme
        for (let k = 0; k < 7; k++) {
          const r = (0.9 - k * 0.11) * s, a = k * 0.9;
          const t = new THREE.TorusGeometry(r, 0.32 * s * (1 - k * 0.09), 8, 18); t.translate(Math.cos(a) * 0.08 * k * s, 1.0 * s + k * 0.06 * s, 0);
          parts.push(place(shadeY(t, k % 2 ? 0xc87a3a : 0xe8b070, k % 2 ? 0xf0b070 : 0xfff0c8), p, yaw));
        }
        const foot = new THREE.CapsuleGeometry(0.32 * s, 1.6 * s, 4, 8); foot.rotateZ(Math.PI / 2); foot.translate(0.3 * s, 0.32 * s, 0);
        parts.push(place(shadeY(foot, 0xb8d070, 0xe8f8a8), p, yaw));
        if (it.solid) level.world.add({ type: 'cyl', x: p[0], z: p[2], r: 1.1 * s, y0: p[1], y1: p[1] + 1.9 * s, tag: 'schnecke' });
        break;
      }
      case 'beeren': {   // Beerenstrauch: dicke, glänzende Beeren an Stängeln
        const col = it.color ?? (rnd.frac() < 0.5 ? 0xe8284a : 0x5a4ae8);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + rnd.real(0, 0.5), r = 0.55 * s, h = (0.5 + rnd.real(0, 0.9)) * s;
          const b = new THREE.SphereGeometry(0.42 * s, 12, 8).toNonIndexed();
          const c0 = C3(col), dk = [c0[0] * 0.5, c0[1] * 0.5, c0[2] * 0.5], wh = C3(0xffffff);
          colorize(b, (q, nn, o) => { mixc(dk, c0, smooth(-0.8, 0.5, nn.y * 0.7 + nn.z * 0.3), o); if (nn.y > 0.75 && nn.z > 0.15) mixc(o, wh, 0.7, o); });
          b.translate(Math.cos(a) * r, h, Math.sin(a) * r);
          parts.push(place(b, p, yaw));
        }
        for (let k = 0; k < 4; k++) {
          const l = new THREE.SphereGeometry(0.6 * s, 8, 5); l.scale(1, 0.18, 0.5); l.rotateZ(0.3); l.translate(Math.cos(k * 1.6) * 0.8 * s, 0.25 * s, Math.sin(k * 1.6) * 0.8 * s);
          parts.push(place(shadeY(l, 0x2a9a3a, 0x8ae86a), p, yaw));
        }
        break;
      }
      case 'fels': {   // bemooster Riesenfelsen
        const g = new THREE.DodecahedronGeometry(1.2 * s, 1); g.scale(1.3, 0.75, 1);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0) pos.setY(i, y * 0.3); }
        g.computeVertexNormals();
        const st = C3(0x8a8a7a), sh = C3(0xc8c8b0), mo = C3(0x5ab83a);
        colorize(g, (q, nn, o) => { mixc(st, sh, smooth(-0.5, 0.9, nn.y * 0.6 + nn.z * 0.3), o); if (nn.y > 0.55) mixc(o, mo, 0.8, o); });
        parts.push(place(g, [p[0], p[1] + 0.25 * s, p[2]], yaw));
        if (it.solid) level.world.add({ type: 'box', min: [p[0] - 1.2 * s, p[1], p[2] - 1.0 * s], max: [p[0] + 1.2 * s, p[1] + 1.1 * s, p[2] + 1.0 * s], tag: 'fels' });
        break;
      }
      case 'eichel': {   // Riesen-Eichel mit Hütchen
        const nut = new THREE.SphereGeometry(0.7 * s, 14, 10); nut.scale(1, 1.25, 1); nut.translate(0, 0.85 * s, 0);
        parts.push(place(shadeY(nut, 0xb8783a, 0xf0b870), p, yaw));
        const cap = new THREE.SphereGeometry(0.78 * s, 14, 7, 0, TAU, 0, Math.PI / 2); cap.scale(1, 0.55, 1); cap.translate(0, 1.45 * s, 0);
        parts.push(place(shadeY(cap, 0x6a4424, 0xa87a4a), p, yaw));
        const st = new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.4 * s, 6); st.translate(0, 1.95 * s, 0);
        parts.push(place(fillC(st, 0x5a3a20), p, yaw));
        if (it.solid) level.world.add({ type: 'cyl', x: p[0], z: p[2], r: 0.72 * s, y0: p[1], y1: p[1] + 1.9 * s, tag: 'eichel' });
        break;
      }
      default: break;
    }
  }
  if (!level.view) return;
  if (parts.length) level.view.addStatic(merge(parts), { material: 'world', castShadow: true });
  if (glow.length) level.view.addStatic(merge(glow), { material: 'glow', castShadow: false });
}

/**
 * Sparsame Blümchen (S-6, Kulisse ohne Kollision): kurzer Stiel, fünf flache Blütenblätter, gelbe Mitte – von oben bunte
 * Tupfer auf den Waben (≈ 70 Dreiecke je Blume, statisch verschmolzen, kein Schatten).
 *   list [{ pos: [x, y, z], s (Größe, 0,5), color }]
 */
export function bluemchen(level, list) {
  if (!level.view || !list.length) return;
  const parts = [];
  const rnd = new Rnd(2024);
  for (const it of list) {
    const s = it.s ?? 0.5, p = it.pos, yaw = rnd.real(0, TAU), h = 0.32 * s / 0.5;
    const st = new THREE.CylinderGeometry(0.03, 0.04, h, 4, 1); st.translate(0, h / 2, 0);
    parts.push(place(fillC(st, 0x3aa83a), p, yaw));
    const pc = C3(it.color ?? 0xff8ad0), pw = C3(0xffffff);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      const g = new THREE.CircleGeometry(s * 0.42, 7).toNonIndexed(); g.rotateX(-Math.PI / 2); g.scale(1, 1, 0.62);
      colorize(g, (q, n, o) => mixc(pw, pc, Math.min(1, Math.hypot(q.x, q.z) / (s * 0.42) * 1.4), o));
      g.translate(s * 0.42, 0, 0); g.rotateY(a); g.translate(0, h + 0.01 * k, 0);
      parts.push(place(g, p, yaw));
    }
    const c = new THREE.CircleGeometry(s * 0.24, 8); c.rotateX(-Math.PI / 2); c.translate(0, h + 0.06, 0);
    parts.push(place(fillC(c, 0xffc020), p, yaw));
  }
  level.view.addStatic(merge(parts), { material: 'world', castShadow: false });
}

/**
 * Riesen-Seerosenblätter (S-7): flache grüne Blätter mit Kerbe auf der Wasseroberfläche, manche mit rosa Blüte; von oben
 * begehbar (Einweg-Plattform, Schwimmer kommen von unten hindurch). list [{ x, y (Oberfläche), z, r (1,4), bluete }]
 */
export function seerosen(level, list) {
  const parts = [];
  const rnd = new Rnd(77);
  for (const it of list) {
    const r = it.r ?? 1.4, yaw = rnd.real(0, TAU);
    level.world.add({ type: 'cyl', x: it.x, z: it.z, r: r * 0.92, y0: it.y - 0.25, y1: it.y + 0.06, oneWay: true, tag: 'seerose' });
    if (!level.view) continue;
    const g = new THREE.CylinderGeometry(r, r * 0.96, 0.12, 22, 1, false, 0.35, TAU - 0.7).toNonIndexed();
    const lo = C3(0x2a9a3a), hi = C3(0x8ae86a), vein = C3(0xc8f8a0);
    colorize(g, (q, n, o) => { const d = Math.hypot(q.x, q.z) / r, a = Math.atan2(q.z, q.x); mixc(lo, hi, 0.3 + 0.5 * d, o); if (n.y > 0.5 && Math.abs(Math.sin(a * 4)) < 0.08 && d > 0.15) mixc(o, vein, 0.7, o); });
    parts.push(place(g, [it.x, it.y + 0.04, it.z], yaw));
    if (it.bluete) {
      for (let k = 0; k < 7; k++) {
        const pe = new THREE.SphereGeometry(0.28, 8, 5); pe.scale(0.6, 0.35, 1.2); pe.translate(0, 0.12, 0.3); pe.rotateX(-0.5); pe.rotateY((k / 7) * TAU);
        parts.push(place(shadeY(pe, 0xff6ab0, 0xffe0f0), [it.x + 0.2, it.y + 0.12, it.z - 0.1], yaw));
      }
      const c = new THREE.SphereGeometry(0.16, 8, 6); c.translate(0, 0.3, 0);
      parts.push(place(fillC(c, 0xffd23a), [it.x + 0.2, it.y + 0.12, it.z - 0.1], yaw));
    }
  }
  if (level.view && parts.length) level.view.addStatic(merge(parts), { material: 'world', castShadow: false });
}
