// Hilfen für die Welt-7-Level 7-1 „Werferburg am Blauglutsee“, 7-2 „Schaltfelder im Finstertempel“ und 7-A „Glutkönig
// im Platschkessel“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese drei
// Level – andere Welt-7-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt
// sich über die offiziellen Aufbau-Haken an (LEVEL.build / LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über
// level.onStep / view.onFrame.
//
//   1) Daten-Helfer   isl (Insel über ihre Grundfläche), line/ring/arc/column (Münzen), sign, blase (Lavablase)
//   2) Mechanik       sternImRohr (grüner Stern in einer Glasröhre: beim Durchfahren eingesammelt), kugelZiel (Kugel in
//                     die Mulde rollen → Aktion; Figuren lösen nichts aus), Fackelschale (Entität: nur Feuer zündet sie;
//                     alle Schalen einer Gruppe an → Aktion), fackelGruppe
//   3) Kulisse        Festung (Mauerwerk mit Zinnen, Türme, Torbogen), Glutsäume an den Inseln, blaue Lavafälle,
//                     Funkenflug, Tempel (Säulen, Bögen, Wandreliefs), Glühpunkte
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte
// Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { Bld, litTop, gradY } from '../w5/_helpers_b.js';

export { Bld, litTop, gradY };

const TAU = Math.PI * 2;

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, top: 'stone', ...o };
}
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzsäule (senkrecht). */
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });
/** Holzschild. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.4, 0.9], yaw: o.yaw ?? 0 });
/** Lavablase (Entität) an x, z; y = Lava-Oberfläche (Standard: Lava dort). */
export const blase = (x, z, o = {}) => ({ kind: 'lavablase', pos: [x, o.y ?? -0.6, z], height: o.height ?? 3.6, period: o.period ?? 3, phase: o.phase ?? 0, ...o });

// =====================================================================================================================
// 2) Mechanik
// =====================================================================================================================

/**
 * Grüner Stern in einer Glasröhre (Bauplan 7-1 Stern 1 „H-förmige Glasröhre“): Röhren sammeln beim Durchfahren nur Münzen
 * ein – dieser Haken holt auch den Stern Nr. index, wenn die fahrende Figur (glasnetz) ihn streift. Der Stern liegt mit
 * seiner Mitte in der Röhrenachse (Fußpunkt = Achse − 0,6 m).
 */
export function sternImRohr(level, index, r = 1.0) {
  level.onStep(() => {
    for (const f of level.players ?? [level.player]) {
      if (!f || f.dead || f.mode !== 'script' || f.script?.kind !== 'glasnetz') continue;
      const s = level.entities.find((e) => e.kind === 'star' && e.index === index && e.alive && !e.hidden);
      if (!s) return;
      const c = f.center(), dx = c.x - s.pos.x, dy = c.y - (s.pos.y + 0.6), dz = c.z - s.pos.z;
      if (dx * dx + dy * dy + dz * dz < r * r) s.onPlayer(f, {});
    }
  });
}

/**
 * Kugel-Mulde (Bauplan 7-1 Stern 2 „grüne Kugel zum Schalter rollen“): Rollt die Schiebekugel (Daten-id ball) in die Mulde
 * (Mitte pos, Radius r), sinkt sie hinein, die Mulde leuchtet und die Aktion onDone läuft einmal. Figuren lösen nichts aus.
 * Darstellung: Steinring mit leuchtender Rinne (statisch) und ein Leuchtring (1 Mesh). → level.named.get(id) { done }.
 */
export function kugelZiel(level, o) {
  const st = { done: false, t: 0 };
  const [px, py, pz] = o.pos;
  const R = o.r ?? 1.1;
  if (o.id) level.named.set(o.id, { get done() { return st.done; }, info: () => ({ done: st.done }) });
  let glow = null;
  if (level.view) {
    const b = new Bld();
    b.cyl(R + 0.45, R + 0.55, 0.22, px, py, pz, litTop(0x8a92b8), 20);
    b.cyl(R + 0.05, R + 0.05, 0.06, px, py + 0.2, pz, 0x1a2a5a, 20);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      b.box(0.34, 0.12, 0.34, px + Math.cos(a) * (R + 0.3), py + 0.22, pz + Math.sin(a) * (R + 0.3), litTop(0xd8dcf0), { yaw: -a, r: 0.05 });
    }
    b.flush(level, { castShadow: false });
    const ringG = new THREE.TorusGeometry(R - 0.05, 0.09, 6, 28);
    ringG.rotateX(Math.PI / 2);
    glow = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: o.color ?? 0x7aff8a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(px, py + 0.3, pz);
    const holder = {};
    let t = 0;
    addObject(level, glow, (dt) => {
      const d = visDt(level, holder, dt);
      t += d;
      glow.material.opacity = st.done ? 0.85 : 0.35 + 0.25 * Math.sin(t * 3.2);
      glow.scale.setScalar(st.done ? 1 + 0.06 * Math.sin(t * 6) : 1);
    });
  }
  level.onStep((dt) => {
    if (st.done) return;
    const k = level.named.get(o.ball);
    if (!k || !k.alive || k.hidden) return;
    const d = Math.hypot(k.pos.x - px, k.pos.z - pz);
    if (d < R * 0.8 && Math.abs(k.pos.y - py) < 0.8 && (k.speed?.() ?? 0) < 4.5) {
      st.done = true;
      // Kugel rastet in der Mulde ein
      k.pos.set(px, k.pos.y, pz);
      k.vel?.set(0, 0, 0);
      level.sfx('switch');
      level.effects?.sparks({ x: px, y: py + 0.8, z: pz }, 22);
      runAction(level, o.onDone, { pos: [px, py + 1, pz], source: null });
    }
  });
  return st;
}

/**
 * Fackelschale (Bauplan 7-2 Stern 1 „4 Fackeln mit Funkenblüte“): Steinsockel mit Eisenschale; nur ein Feuerball (Funkenblüte)
 * zündet sie – er prallt an den Sockel bzw. die Schale (fester Körper mit owner = Schale). Brennt dann für immer (bzw. bis
 * zum Neustart der Gruppe). Gruppe: sind alle Schalen mit gleicher group an, läuft die Aktion onAll (einmal).
 *   { pos: [x, y, z] (Fußpunkt), group: 'name', onAll: Aktion, h: 1.1 (Sockelhöhe), color: 0xff8a2a, id }
 * Laufzeit: lit, hits; level.named.get(id). Licht: view.addLantern über der Schale (nur angezündet sichtbar über den Schein).
 */
class Fackelschale extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'fackelschale');
    this.touch = false;
    this.lit = false;
    this.hits = 0;
    this.group = spec.group ?? 'fackeln';
    this.H = spec.h ?? 1.1;
    this.half.set(0.55, this.H / 2 + 0.2, 0.55);
    const p = this.pos;
    // fester Sockel (Feuerbälle prallen hier an → onHit('fire'))
    this.addShape({ type: 'box', min: [p.x - 0.42, p.y, p.z - 0.42], max: [p.x + 0.42, p.y + this.H, p.z + 0.42], tag: 'fackelschale' });
    this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.62, y0: p.y + this.H, y1: p.y + this.H + 0.34, tag: 'fackelschale' });
    this.flameT = 0;
    if (level.view) this.buildLook(spec);
  }

  buildLook(spec) {
    const b = new Bld();
    const H = this.H;
    b.box(1.0, 0.18, 1.0, 0, 0, 0, litTop(0x8a7a66), { r: 0.05 });
    b.box(0.8, H - 0.3, 0.8, 0, 0.18, 0, gradY(0x5a4a3e, 0xb8a080, 0, H), { r: 0.06 });
    b.box(0.96, 0.14, 0.96, 0, H - 0.14, 0, litTop(0xc8b088), { r: 0.05 });
    b.cyl(0.62, 0.36, 0.34, 0, H, 0, litTop(0x4a4450), 14);
    b.torus(0.6, 0.05, 0, H + 0.34, 0, 0xd8a83a, { rx: Math.PI / 2, ts: 18 });
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + Math.PI / 4; b.sphere(0.07, Math.cos(a) * 0.62, H + 0.17, Math.sin(a) * 0.62, 0xd8a83a); }
    // Glutkohlen in der Schale
    for (let i = 0; i < 6; i++) { const a = i * 2.2; b.sphere(0.13, Math.cos(a) * 0.24, H + 0.3, Math.sin(a) * 0.24, 0x3a2a26, { s: [1, 0.6, 1] }); }
    const g = b.geometry();
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    const body = new THREE.Mesh(g, mat);
    body.castShadow = true; body.receiveShadow = true;
    root.add(body);
    // Flamme (drei Kegel in einem Mesh, additiv) – unsichtbar bis zum Anzünden
    const fb = new Bld();
    fb.cone(0.42, 1.25, 0, 0, 0, spec.color ?? 0xd8601a, 8);
    fb.cone(0.28, 0.95, 0, 0, 0, 0xd8a030, 8);
    fb.cone(0.14, 0.6, 0, 0, 0, 0xf0e0a0, 8);
    const fl = new THREE.Mesh(fb.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    fl.position.y = H + 0.3;
    fl.visible = false;
    root.add(fl);
    // kalter Schimmer (Hinweis: hier gehört Feuer hinein)
    const hint = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0x6ac0ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    hint.rotation.x = Math.PI / 2;
    hint.position.y = H + 0.4;
    root.add(hint);
    this.fl = fl; this.hint = hint;
    this.setModel({ root, update: () => {}, dispose() { g.dispose(); mat.dispose(); } });
  }

  onHit(kind) {
    if (kind !== 'fire' || this.lit) return;
    this.hits++;
    this.light();
  }

  light() {
    if (this.lit) return;
    this.lit = true;
    this.level.sfx('burn');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H + 0.6, z: this.pos.z }, 18);
    if (this.level.view?.addLantern && !this.lamp) { this.lamp = true; this.level.view.addLantern(this.pos.x, this.pos.y + this.H + 0.9, this.pos.z); }
    const all = this.level.entities.filter((e) => e.kind === 'fackelschale' && e.group === this.group);
    if (all.every((e) => e.lit) && !this.level['_fackelDone_' + this.group]) {
      this.level['_fackelDone_' + this.group] = true;
      this.level.sfx('key');
      runAction(this.level, this.spec.onAll ?? all.find((e) => e.spec.onAll)?.spec.onAll, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    }
  }

  update(dt) { this.flameT += dt; }

  render(dt, t) {
    super.render?.(dt, t);
    if (!this.fl) return;
    this.fl.visible = this.lit;
    this.hint.visible = !this.lit;
    if (this.lit) {
      const k = 1 + 0.12 * Math.sin(t * 13 + this.pos.x) + 0.06 * Math.sin(t * 23);
      this.fl.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
      this.fl.rotation.y = t * 1.7;
    } else this.hint.material.opacity = 0.3 + 0.25 * Math.sin(t * 3 + this.pos.z);
  }

  info() { return { lit: this.lit, hits: this.hits, group: this.group }; }
}

/** Fackelschalen anlegen (in LEVEL.build oder setup): list [{ pos, id? }], o { group, onAll, h }. */
export function fackelGruppe(level, list, o = {}) {
  const out = [];
  for (const q of list) {
    const e = new Fackelschale(level, { ...o, ...q, group: o.group ?? q.group ?? 'fackeln', onAll: o.onAll });
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    if (level.view) level.view.shadows?.add({ pos: e.pos, radius: 0.6, alive: () => !e.removed, visible: () => true });
    out.push(e);
  }
  return out;
}

// =====================================================================================================================
// 3) Kulisse
// =====================================================================================================================

const C = (h) => lin(hex(h));
void C; void addStatic;

// Farben der blauen Werferburg
export const BURG = {
  brick: [0x6c74ac, 0x7a84bc, 0x626aa0, 0x8890c8, 0x7078b0],
  mortar: 0x262a46, cap: 0xa8b0dc, capDark: 0x5a6290, gold: 0xffc23a, red: 0xd8323a, redDark: 0x8a1a26,
  roofs: [0xd8323a, 0x8a4ad8, 0x3a8aff, 0xff8a2a], wood: 0x8a5a34, woodDark: 0x5a3a20, iron: 0x3a3c4e, glow: 0x6ad8ff,
};

/**
 * Ziegel auf einer senkrechten Fläche (Bld b): f = { axis: 'x' | 'z' (Fläche läuft entlang x bzw. z), at (feste Koordinate
 * der Fläche), a0, a1 (Bereich entlang der Achse), y0, y1, dir (Normale ±1), row 0.52, depth 0.1, pal }.
 */
export function ziegel(b, f, rnd) {
  const row = f.row ?? 0.52, dep = f.depth ?? 0.1, pal = f.pal ?? BURG.brick, gap = 0.06;
  const col = new THREE.Color();
  for (let y = f.y0, r = 0; y < f.y1 - 0.08; y += row, r++) {
    const h = Math.min(row, f.y1 - y) - gap;
    let a = f.a0 + ((r + (f.shift ?? 0)) % 2 ? -0.5 : 0);
    while (a < f.a1 - 0.1) {
      const e = Math.min(a + rnd.real(0.8, 1.35), f.a1);
      const s = Math.max(a, f.a0), w = e - s - gap;
      if (w > 0.18) {
        col.set(pal[rnd.int(0, pal.length - 1)]).multiplyScalar(0.9 + rnd.frac() * 0.2);
        const m = (s + e) / 2, off = f.at + f.dir * (dep / 2 - 0.02);
        if (f.axis === 'x') b.box(w, h, dep, m, y + gap / 2, off, col.clone(), { r: 0 });
        else b.box(dep, h, w, off, y + gap / 2, m, col.clone(), { r: 0 });
      }
      a = e;
    }
  }
}

/**
 * Burgmauer entlang x oder z (Bld b für Stein, g für Leuchtendes): { from: [x, z], to: [x, z], y (Fuß), h 2.6, t 0.7,
 * faces: [+1, −1] (Seiten mit Ziegeln; bei Mauern entlang z: +1 = +x-Seite), merlons true, slits true, solid true }.
 */
export function mauer(level, b, g, m, rnd) {
  const [ax, az] = m.from, [bx, bz] = m.to;
  const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
  const H = m.h ?? 2.6, T = m.t ?? 0.7, y = m.y;
  const a0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), a1 = alongX ? Math.max(ax, bx) : Math.max(az, bz);
  const c = alongX ? az : ax, L = a1 - a0, mid = (a0 + a1) / 2;
  const box = (w, h, d, u, yy, v, col, o) => (alongX ? b.box(w, h, d, u, yy, v, col, o) : b.box(d, h, w, v, yy, u, col, o));
  box(L, H, T - 0.12, mid, y, c, BURG.mortar, { r: 0 });
  for (const dir of m.faces ?? [1, -1]) ziegel(b, { axis: alongX ? 'x' : 'z', at: c + dir * (T / 2 - 0.06), a0, a1, y0: y + 0.05, y1: y + H - 0.25, dir }, rnd);
  box(L + 0.1, 0.24, T + 0.12, mid, y + H - 0.24, c, litTop(BURG.cap, 0.6), { r: 0 });
  if (m.merlons !== false) {
    const n = Math.max(1, Math.round(L / 1.25));
    for (let i = 0; i < n; i++) {
      const u = a0 + (i + 0.5) * (L / n);
      box(Math.min(0.72, L / n - 0.3), 0.62, T - 0.05, u, y + H, c, litTop(BURG.cap, 0.55), { r: 0 });
    }
  }
  if (m.slits !== false && H > 2.2) {
    const n = Math.max(1, Math.floor(L / 3.2));
    for (const dir of m.faces ?? [1, -1]) for (let i = 0; i < n; i++) {
      const u = a0 + (i + 0.5) * (L / n), v = c + dir * (T / 2 + 0.05);
      if (alongX) g.box(0.2, 0.62, 0.06, u, y + H * 0.42, v, BURG.glow, { r: 0 }); else g.box(0.06, 0.62, 0.2, v, y + H * 0.42, u, BURG.glow, { r: 0 });
    }
  }
  if (m.solid !== false) {
    const top = y + H + (m.merlons === false ? 0 : 0.6);
    level.world.add(alongX ? { type: 'box', min: [a0, y, c - T / 2], max: [a1, top, c + T / 2], tag: 'burgmauer', camIgnore: !!m.camIgnore }
      : { type: 'box', min: [c - T / 2, y, a0], max: [c + T / 2, top, a1], tag: 'burgmauer', camIgnore: !!m.camIgnore });
  }
}

/**
 * Rundturm (Kulisse, Bld b/g): { x, y, z, r 1.4, h 7, roof (Farbe | false), flag true, windows true, solid false }.
 * Steinkörper mit Bändern, Kragen mit Zinnenkranz, buntes Spitzdach mit Goldknauf und Wimpel, leuchtende Fenster zur Kamera.
 */
export function turm(level, b, g, t) {
  const { x, y, z } = t, r = t.r ?? 1.4, H = t.h ?? 7;
  b.cyl(r, r * 1.08, H, x, y, z, gradY(0x4a5288, 0x8a94c8, y, y + H), 16);
  for (let k = 1; k * 1.6 < H - 0.6; k++) b.torus(r + 0.02, 0.05, x, y + k * 1.6, z, BURG.mortar, { rx: Math.PI / 2, ts: 18, rs: 4 });
  b.cyl(r * 1.08, r * 1.12, 0.4, x, y, z, litTop(BURG.capDark), 16);
  b.cyl(r * 1.22, r, 0.5, x, y + H, z, litTop(BURG.cap, 0.6), 16);
  const nm = Math.max(6, Math.round(r * 5));
  for (let i = 0; i < nm; i++) {
    const a = (i / nm) * TAU;
    b.box(0.5, 0.55, 0.38, x + Math.cos(a) * r * 1.12, y + H + 0.5, z + Math.sin(a) * r * 1.12, litTop(BURG.cap, 0.55), { yaw: -a + Math.PI / 2, r: 0 });
  }
  if (t.roof !== false) {
    const rc = t.roof ?? BURG.roofs[0], rh = r * 2.1;
    b.cone(r * 1.32, rh, x, y + H + 0.45, z, litTop(rc, 0.55), 14);
    b.sphere(0.2, x, y + H + 0.45 + rh + 0.12, z, BURG.gold, { ws: 8, hs: 6 });
    if (t.flag !== false) {
      const fy = y + H + 0.45 + rh + 0.2;
      b.cyl(0.04, 0.04, 1.3, x, fy, z, BURG.iron, 5);
      b.box(0.9, 0.5, 0.04, x + 0.47, fy + 0.72, z, t.flagColor ?? BURG.red, { r: 0 });
      b.box(0.24, 0.24, 0.05, x + 0.5, fy + 0.85, z, BURG.gold, { r: 0 });
    }
  } else {
    b.cyl(r * 1.05, r * 1.05, 0.12, x, y + H + 0.36, z, litTop(0x9aa2cc), 16);
  }
  if (t.windows !== false) {
    for (const [dy, da] of [[0.38, 0], [0.62, 0.55], [0.62, -0.55]]) {
      const a = Math.PI / 2 + da, wx = x + Math.cos(a) * (r + 0.03), wz = z + Math.sin(a) * (r + 0.03);
      g.box(0.36, 0.7, 0.08, wx, y + H * dy, wz, t.window ?? 0xffd27a, { yaw: -a + Math.PI / 2, r: 0 });
      b.box(0.56, 0.12, 0.14, wx, y + H * dy - 0.06, wz, litTop(BURG.cap), { yaw: -a + Math.PI / 2, r: 0 });
    }
  }
  if (t.solid) level.world.add({ type: 'cyl', x, z, r: r * 1.05, y0: y, y1: y + H + 1, tag: 'burgturm' });
}

/** Ziegelfassaden an Inselseiten (+z, ±x) mit leuchtendem Saum an der Lava: rects [[x0, x1, zA, zB, top], …]. */
export function inselFassaden(b, g, rects, lavaY, rnd, o = {}) {
  for (const [x0, x1, zA, zB, top, sides] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), y0 = lavaY - 0.4, y1 = top - 0.06;
    const S = sides ?? 'fxl';
    if (S.includes('f')) ziegel(b, { axis: 'x', at: z0, a0: x0, a1: x1, y0, y1, dir: 1, depth: 0.12 }, rnd);
    if (S.includes('l')) ziegel(b, { axis: 'z', at: x0, a0: z1, a1: z0, y0, y1, dir: -1, depth: 0.12, shift: 1 }, rnd);
    if (S.includes('x')) ziegel(b, { axis: 'z', at: x1, a0: z1, a1: z0, y0, y1, dir: 1, depth: 0.12, shift: 1 }, rnd);
    if (S.includes('b')) ziegel(b, { axis: 'x', at: z1, a0: x0, a1: x1, y0, y1, dir: -1, depth: 0.12 }, rnd);
    // Saum: leuchtende Kante an der Lava
    const sy = lavaY + 0.02, sh = o.seam ?? 0.16, c = o.seamColor ?? 0x5ad0ff;
    if (S.includes('f')) g.box(x1 - x0 + 0.3, sh, 0.12, (x0 + x1) / 2, sy, z0 + 0.14, c, { r: 0 });
    if (S.includes('b')) g.box(x1 - x0 + 0.3, sh, 0.12, (x0 + x1) / 2, sy, z1 - 0.14, c, { r: 0 });
    if (S.includes('l')) g.box(0.12, sh, z0 - z1 + 0.3, x0 - 0.14, sy, (z0 + z1) / 2, c, { r: 0 });
    if (S.includes('x')) g.box(0.12, sh, z0 - z1 + 0.3, x1 + 0.14, sy, (z0 + z1) / 2, c, { r: 0 });
    // Abdeckkante oben (helle Steinleiste)
    if (o.rim !== false) {
      if (S.includes('f')) b.box(x1 - x0 + 0.08, 0.16, 0.22, (x0 + x1) / 2, top - 0.2, z0 + 0.06, litTop(BURG.cap, 0.65), { r: 0 });
    }
  }
}

/**
 * Steinplatten im Verband auf Inseloberseiten (die Fugen sind die Insel darunter): rects [[x0, x1, zA, zB, y], …];
 * o: { pal (Farben), row 1.1, avoid: [[x0, x1, zA, zB], …], glow (Bld für glimmende Fugenrisse), cracks 0.04 }.
 */
export function fliesen(b, rects, rnd, o = {}) {
  const pal = o.pal ?? [0x8e96c8, 0x868ec0, 0x9aa2d2, 0x7c84b6, 0x949cce];
  const row = o.row ?? 1.1, gap = 0.07, col = new THREE.Color();
  const avoid = o.avoid ?? [];
  const free = (x, z) => !avoid.some((a) => x > a[0] && x < a[1] && z < Math.max(a[2], a[3]) && z > Math.min(a[2], a[3]));
  for (const [x0, x1, zA, zB, y] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    for (let z = z1 + 0.05, r = 0; z < z0 - 0.15; z += row, r++) {
      const d = Math.min(row, z0 - 0.05 - z) - gap;
      if (d < 0.2) continue;
      let x = x0 + 0.05 - (r % 2 ? 0.55 : 0);
      while (x < x1 - 0.15) {
        const e = Math.min(x + rnd.real(0.9, 1.6), x1 - 0.05), s = Math.max(x, x0 + 0.05), w = e - s - gap;
        const cx = (s + e) / 2, cz = z + d / 2;
        if (w > 0.2 && free(cx, cz)) {
          col.set(pal[rnd.int(0, pal.length - 1)]).multiplyScalar(0.92 + rnd.frac() * 0.14);
          b.box(w, 0.05, d, cx, y, cz, col.clone(), { r: 0 });
          if (o.glow && rnd.frac() < (o.cracks ?? 0.03)) o.glow.box(w * 0.45, 0.02, 0.05, cx, y + 0.05, cz + rnd.real(-0.2, 0.2), o.crackColor ?? 0x6ad8ff, { r: 0, yaw: rnd.real(-0.5, 0.5) });
        }
        x = e;
      }
    }
  }
}

/** Brummbär-Wappen als Bodenmosaik (Kreis, Bärenkopf mit Zylinder und Monokel) bei (x, y, z), Radius r. */
export function wappenMosaik(b, x, y, z, r = 2) {
  b.cyl(r, r, 0.05, x, y, z, BURG.gold, 24);
  b.cyl(r * 0.88, r * 0.88, 0.06, x, y, z, BURG.redDark, 24);
  b.cyl(r * 0.5, r * 0.5, 0.07, x, y, z + r * 0.08, 0x8a5a34, 20);
  for (const s of [-1, 1]) b.cyl(r * 0.17, r * 0.17, 0.07, x + s * r * 0.36, y, z - r * 0.3, 0x8a5a34, 12);
  b.cyl(r * 0.2, r * 0.2, 0.075, x, y, z + r * 0.28, 0xd8b088, 14);
  b.box(r * 0.5, 0.08, r * 0.34, x, y, z - r * 0.5, 0x1a1418, { r: 0 });
  b.box(r * 0.78, 0.08, r * 0.08, x, y, z - r * 0.31, 0x1a1418, { r: 0 });
  for (const s of [-1, 1]) b.cyl(r * 0.06, r * 0.06, 0.085, x + s * r * 0.17, y, z + r * 0.02, 0x1a1012, 8);
  b.torus(r * 0.1, r * 0.018, x + r * 0.17, y + 0.09, z + r * 0.02, 0xffe080, { rx: Math.PI / 2, ts: 12, rs: 3 });
}

/** Gelbe Pfeile auf dem Boden (Hinweis): list [[x, y, z, yaw]] (yaw 0 = Spitze nach +X). */
export function bodenPfeile(b, list) {
  for (const [x, y, z, yaw = 0, s = 1] of list) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const tx = x + c * 0.5 * s, tz = z - sn * 0.5 * s;
    b.box(0.85 * s, 0.03, 0.26 * s, x - c * 0.05 * s, y, z + sn * 0.05 * s, 0xffd23a, { yaw, r: 0 });
    for (const k of [-1, 1]) {
      const f = yaw + Math.PI + k * 0.65, fx = Math.cos(f), fz = -Math.sin(f);
      b.box(0.55 * s, 0.035, 0.2 * s, tx + fx * 0.24 * s, y, tz + fz * 0.24 * s, 0xffd23a, { yaw: f, r: 0 });
    }
  }
}

/** Läufer (roter Teppich mit Goldkante) auf dem Boden: [x, y, zA, zB, breite]. */
export function laeufer(b, list) {
  for (const [x, y, zA, zB, w = 1.8] of list) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), L = z0 - z1;
    b.box(w, 0.03, L, x, y + 0.005, (z0 + z1) / 2, BURG.red, { r: 0 });
    for (const s of [-1, 1]) b.box(0.12, 0.035, L, x + s * (w / 2 - 0.1), y + 0.005, (z0 + z1) / 2, BURG.gold, { r: 0 });
    for (let zz = z1 + 1.2; zz < z0 - 0.6; zz += 2.4) b.box(0.36, 0.04, 0.36, x, y + 0.006, zz, BURG.gold, { yaw: Math.PI / 4, r: 0 });
  }
}

/** Werfer-Lager: Körbe mit (leuchtenden) Feuerkugeln, Fässer, Kisten. list [[x, y, z, yaw], …]. */
export function werferKram(b, g, list, rnd) {
  for (const [x, y, z, yaw = 0] of list) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (u, v) => [x + c * u + s * v, z - s * u + c * v];
    // Korb mit Feuerkugeln
    let [px, pz] = P(0, 0);
    b.cyl(0.55, 0.42, 0.55, px, y, pz, litTop(BURG.iron, 0.6), 10, { open: false });
    b.torus(0.55, 0.04, px, y + 0.55, pz, 0x6a6c80, { rx: Math.PI / 2, ts: 14, rs: 4 });
    for (let i = 0; i < 4; i++) { const a = i * 1.7; g.sphere(0.2, px + Math.cos(a) * 0.22, y + 0.6 + (i % 2) * 0.12, pz + Math.sin(a) * 0.22, i % 2 ? 0xffb030 : 0xff6a1a, { ws: 8, hs: 6 }); }
    // zwei Fässer
    for (const [u, v] of [[1.1, 0.2], [1.5, -0.6]]) {
      [px, pz] = P(u, v);
      b.cyl(0.36, 0.36, 0.86, px, y, pz, litTop(BURG.wood, 0.65), 10);
      for (const hh of [0.15, 0.68]) b.torus(0.37, 0.035, px, y + hh, pz, BURG.iron, { rx: Math.PI / 2, ts: 12, rs: 3 });
    }
    // Kiste
    [px, pz] = P(-1.1, -0.2);
    b.box(0.8, 0.7, 0.8, px, y, pz, litTop(0xb07a44, 0.7), { yaw: yaw + rnd.real(-0.2, 0.2), r: 0.03 });
  }
}

/** 7-1: Festungs-Kulisse (Mauern, Türme, Fassaden, Glutsäume, Läufer, Lager). o: { Y, LAVA, RX }. */
export function festung71(level, o) {
  const { Y, LAVA } = o;
  const rnd = new Rnd(7171);
  const b = new Bld(), g = new Bld();
  // ---------------- Inselfassaden (Seiten, die die Kamera sieht) + Glutsaum
  inselFassaden(b, g, [
    [-9, 9, 9, -17, Y], [-9, 9, -31.5, -44, Y], [-11, -3, -59.5, -70, Y], [3, 11, -59.5, -70, Y], [-9, 9, -79.8, -92, Y],
    [-1.3, 1.3, -92, -97, Y, 'lx'], [-4.5, 4.5, -97, -106, Y], [-1.3, 1.3, -106, -110, Y, 'lx'], [-4.5, 4.5, -110, -119, Y],
    [-1.1, 1.1, -120.6, -122.6, Y], [-8, 8, -124, -140, Y], [-8, 8, -156, -166, Y], [-4.5, 4.5, -166, -212, Y, 'lx'],
    [-7, 7, -212, -220, Y], [-9, 9, -228.4, -248, Y],
  ], LAVA, rnd);
  // ---------------- Mauern
  const M = (from, to, y, h, faces, extra = {}) => mauer(level, b, g, { from, to, y, h, faces, ...extra }, rnd);
  M([-8.65, 8.6], [-8.65, -10], Y, 2.2, [1]); M([8.65, 8.6], [8.65, -10], Y, 2.2, [-1]);         // Burghof (Start)
  M([-8.65, -36], [-8.65, -44], Y, 2.2, [1]); M([8.65, -36], [8.65, -44], Y, 2.2, [-1]);         // Werfer-Hof
  M([-8.65, -82], [-8.65, -92], Y, 2.2, [1]); M([8.65, -82], [8.65, -92], Y, 2.2, [-1]);         // Hubinsel
  M([-7.65, -127], [-7.65, -140], Y, 2.2, [1]); M([7.65, -127], [7.65, -140], Y, 2.2, [-1]);     // Werferturm-Platz
  M([-4.15, -167], [-4.15, -211], Y, 2.6, [1], { t: 0.7 }); M([4.15, -167], [4.15, -211], Y, 2.6, [-1], { t: 0.7 });  // Gang
  M([-7, -220.8], [-1.75, -220.8], LAVA - 0.4, 8.4, [1], { t: 1.2 }); M([1.75, -220.8], [7, -220.8], LAVA - 0.4, 8.4, [1], { t: 1.2 });   // Torhaus  M([-8.65, -232], [-8.65, -248], Y, 2.2, [1]); M([8.65, -232], [8.65, -248], Y, 2.2, [-1]);     // Zielhof
  M([-9, -247.6], [9, -247.6], Y, 3.2, [1], { t: 0.8 });
  // Turmblock mit der grünen Röhre (Kontrollpunkt): Fassade und Zinnen
  ziegel(b, { axis: 'x', at: -159.5, a0: -12.5, a1: -7.5, y0: Y, y1: Y + 6.3, dir: 1, depth: 0.12 }, rnd);
  ziegel(b, { axis: 'z', at: -7.5, a0: -166, a1: -159.5, y0: Y, y1: Y + 6.3, dir: 1, depth: 0.12, shift: 1 }, rnd);
  for (const [mx, mz] of [[-12.2, -159.8], [-10.8, -159.8], [-9.2, -159.8], [-7.8, -159.8], [-7.8, -161.4], [-7.8, -163], [-7.8, -164.6]]) b.box(0.6, 0.55, 0.6, mx, Y + 6.4, mz, litTop(BURG.cap, 0.55), { r: 0 });
  // ---------------- Türme (Ecken, Torhaus, Kulisse in der Lava)
  const T = (x, y, z, r, h, roof, extra = {}) => turm(level, b, g, { x, y, z, r, h, roof, ...extra });
  T(-9.6, Y - 1.6, 9.4, 1.5, 6.5, BURG.roofs[0]); T(9.6, Y - 1.6, 9.4, 1.5, 6.5, BURG.roofs[1]);
  T(-9.8, Y - 1.6, -31.8, 1.3, 6, BURG.roofs[2]); T(9.8, Y - 1.6, -31.8, 1.3, 6, BURG.roofs[3]);
  T(-9.8, Y - 1.6, -80.4, 1.3, 6, BURG.roofs[1]); T(9.8, Y - 1.6, -80.4, 1.3, 6, BURG.roofs[0]);
  T(-8.8, Y - 1.6, -124.6, 1.2, 5.6, BURG.roofs[3]); T(8.8, Y - 1.6, -124.6, 1.2, 5.6, BURG.roofs[2]);
  T(-7.9, Y, -221, 1.6, 8.6, BURG.roofs[0], { solid: true }); T(7.9, Y, -221, 1.6, 8.6, BURG.roofs[0], { solid: true });
  T(-10, Y + 6.4, -165.2, 1.1, 2.6, BURG.roofs[1], { windows: false });
  for (const [x, z, r, h, k] of [[-26, -8, 2.2, 11, 2], [27, -40, 2.6, 13, 0], [-30, -70, 2.4, 12, 1], [29, -110, 2.2, 10, 3], [-27, -140, 2.8, 14, 0], [30, -175, 2.4, 12, 1], [-28, -205, 2.2, 11, 2], [24, -238, 2.6, 13, 3], [-20, -262, 3, 15, 0], [14, -268, 2.2, 11, 1]]) {
    b.cyl(r * 1.6, r * 2.1, 2.2, x, LAVA - 1, z, litTop(0x2a2a40, 0.5), 9);     // Basaltsockel
    T(x, LAVA + 1.1, z, r, h, BURG.roofs[k]);
  }
  // ---------------- Steinplatten, Wappen-Mosaike, Teppiche, Lager
  const RX = o.RX;
  fliesen(b, [
    [-9, 9, 9, -17, Y], [-9, 9, -31.5, -44, Y], [-11, -3, -59.5, -70, Y], [3, 11, -59.5, -70, Y], [-9, 9, -79.8, -92, Y],
    [-1.3, 1.3, -92, -97, Y], [-4.5, 4.5, -97, -106, Y], [-1.3, 1.3, -106, -110, Y], [-4.5, 4.5, -110, -119, Y], [-8, 8, -124, -140, Y],
    [-8, 8, -156, -166, Y], [-4.5, 4.5, -166, -212, Y], [-7, 7, -212, -220, Y], [-9, 9, -228.4, -248, Y],
    [RX - 8, RX + 8, -150, -162.5, Y], [RX - 1.3, RX + 1.3, -162.5, -166.5, Y], [RX - 8, RX + 8, -166.5, -178, Y],
  ], rnd, { glow: g, avoid: [[-1.1, 1.1, 4.5, -12.6], [-0.95, 0.95, -86.4, -91.6], [-1.1, 1.1, -157.3, -165.7], [-1.2, 1.2, -228.9, -238.7],
    [-2.1, 2.1, -36.4, -40.6], [-2.1, 2.1, -129.9, -134.1], [RX + 3.1, RX + 5.9, -170.1, -172.9]] });
  wappenMosaik(b, 0, Y + 0.01, -38.5, 2);
  wappenMosaik(b, 0, Y + 0.01, -132, 2);
  laeufer(b, [[0, Y, 4.4, -12.5, 2], [0, Y, -86.5, -91.5, 1.8], [0, Y, -157.4, -165.6, 2], [0, Y, -229, -238.6, 2.2]]);
  // Kugelsaal: Mauern, Pfeile von der Kugel über die Bahn zur Mulde
  M([RX - 7.65, -150.4], [RX - 7.65, -177.6], LAVA - 0.4, 3.8, [1]); M([RX + 7.65, -150.4], [RX + 7.65, -177.6], LAVA - 0.4, 3.8, [-1]);
  M([RX - 8, -177.65], [RX + 8, -177.65], Y, 2.6, [1]);
  bodenPfeile(b, [[RX - 1.2, Y + 0.06, -159.4, -0.6], [RX, Y + 0.06, -161.6, -Math.PI / 2], [RX, Y + 0.06, -167.6, -Math.PI / 2], [RX + 1.8, Y + 0.06, -169.4, -0.7], [RX + 3.2, Y + 0.06, -170.4, -0.7]]);
  for (const s of [-1, 1]) turm(level, b, g, { x: RX + s * 8.4, y: Y - 1.6, z: -178.2, r: 1.3, h: 6.4, roof: BURG.roofs[s < 0 ? 1 : 3] });
  werferKram(b, g, [[-6.6, Y, -40.8, 0.3], [-7.6, Y, -127.2, -0.2], [6.6, Y, -138.4, Math.PI], [-5.4, Y, -214.2, 0.2]], rnd);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// 7-2: Finstertempel
// =====================================================================================================================

export const TEMPEL = {
  stone: [0xc8a878, 0xb89868, 0xd4b488, 0xa88a60, 0xc0a070], mortar: 0x3a2a22, cap: 0xe0c898, dark: 0x5a4434,
  frieze: 0x2ab8b0, friezeHi: 0x6af0e0, gold: 0xffc23a, rune: 0x6af0ff, runeWarm: 0xffb04a,
};

/** Tempelmauer aus Quadern (Bld b/g) entlang x oder z mit Fries (türkis, leuchtende Runen) und Gesims; Kollision. */
export function tempelWand(level, b, g, w, rnd) {
  const [ax, az] = w.from, [bx, bz] = w.to;
  const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
  const H = w.h ?? 3, T = w.t ?? 0.8, y = w.y;
  const a0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), a1 = alongX ? Math.max(ax, bx) : Math.max(az, bz);
  const c = alongX ? az : ax, L = a1 - a0, mid = (a0 + a1) / 2;
  const box = (ww, hh, dd, u, yy, v, col, o) => (alongX ? b.box(ww, hh, dd, u, yy, v, col, o) : b.box(dd, hh, ww, v, yy, u, col, o));
  const gbox = (ww, hh, dd, u, yy, v, col) => (alongX ? g.box(ww, hh, dd, u, yy, v, col, { r: 0 }) : g.box(dd, hh, ww, v, yy, u, col, { r: 0 }));
  box(L, H, T - 0.14, mid, y, c, TEMPEL.mortar, { r: 0 });
  for (const dir of w.faces ?? [1, -1]) {
    const at = c + dir * (T / 2 - 0.07);
    ziegel(b, { axis: alongX ? 'x' : 'z', at, a0, a1, y0: y + 0.05, y1: y + H * 0.62, dir, row: 0.7, depth: 0.14, pal: TEMPEL.stone }, rnd);
    // Fries: türkises Band mit leuchtenden Runen
    box(L, 0.42, 0.1, mid, y + H * 0.64, at + dir * 0.06, litTop(TEMPEL.frieze, 0.7), { r: 0 });
    for (let u = a0 + 0.6; u < a1 - 0.3; u += 1.2) gbox(0.26, 0.26, 0.04, u, y + H * 0.64 + 0.08, at + dir * 0.12, (Math.round(u * 7) % 3) ? TEMPEL.rune : TEMPEL.runeWarm);
    ziegel(b, { axis: alongX ? 'x' : 'z', at, a0, a1, y0: y + H * 0.64 + 0.46, y1: y + H - 0.2, dir, row: 0.6, depth: 0.12, pal: TEMPEL.stone, shift: 1 }, rnd);
  }
  box(L + 0.2, 0.24, T + 0.2, mid, y + H - 0.24, c, litTop(TEMPEL.cap, 0.6), { r: 0 });
  box(L + 0.05, 0.16, T - 0.1, mid, y + H, c, litTop(TEMPEL.gold, 0.6), { r: 0 });
  if (w.solid !== false) {
    level.world.add(alongX ? { type: 'box', min: [a0, y, c - T / 2], max: [a1, y + H + 0.16, c + T / 2], tag: 'tempelwand', camIgnore: !!w.camIgnore }
      : { type: 'box', min: [c - T / 2, y, a0], max: [c + T / 2, y + H + 0.16, a1], tag: 'tempelwand', camIgnore: !!w.camIgnore });
  }
}

/** Tempelsäule (Bld b/g): Sockel, kannelierter Schaft, leuchtendes Runenband, Kapitell. solid → Zylinder-Kollision. */
export function saeule(level, b, g, x, y, z, h = 4, r = 0.45, o = {}) {
  b.box(r * 2.6, 0.3, r * 2.6, x, y, z, litTop(TEMPEL.cap, 0.6), { r: 0.03 });
  b.cyl(r * 1.1, r * 1.2, 0.3, x, y + 0.3, z, litTop(TEMPEL.stone[0], 0.6), 12);
  b.cyl(r, r * 1.06, h - 1.1, x, y + 0.6, z, gradY(0x8a6e50, 0xd8bc8c, y, y + h), 12);
  g.torus(r * 1.04, 0.05, x, y + h * 0.55, z, o.rune ?? TEMPEL.rune, { rx: Math.PI / 2, ts: 14, rs: 4 });
  b.cyl(r * 1.3, r * 1.0, 0.3, x, y + h - 0.5, z, litTop(TEMPEL.gold, 0.6), 12);
  b.box(r * 2.8, 0.22, r * 2.8, x, y + h - 0.22, z, litTop(TEMPEL.cap, 0.6), { r: 0.03 });
  if (o.solid !== false) level.world.add({ type: 'cyl', x, z, r: r * 1.15, y0: y, y1: y + h, tag: 'saeule' });
}

/** Amphoren (bunt, Goldrand): list [[x, y, z, Farbe, Größe]]. */
export function amphoren(b, list) {
  for (const [x, y, z, col = 0xd8703a, s = 1] of list) {
    b.cyl(0.18 * s, 0.14 * s, 0.12 * s, x, y, z, litTop(col, 0.6), 10);
    b.sphere(0.36 * s, x, y + 0.42 * s, z, litTop(col, 0.6), { s: [1, 1.15, 1], ws: 12, hs: 8 });
    b.cyl(0.14 * s, 0.2 * s, 0.34 * s, x, y + 0.78 * s, z, litTop(col, 0.6), 10);
    b.torus(0.16 * s, 0.04 * s, x, y + 1.12 * s, z, TEMPEL.gold, { rx: Math.PI / 2, ts: 12, rs: 4 });
    b.torus(0.37 * s, 0.035 * s, x, y + 0.5 * s, z, TEMPEL.gold, { rx: Math.PI / 2, ts: 16, rs: 4 });
  }
}

/** Leuchtkristalle (Glüh-Material): list [[x, y, z, n, Farbe]]. */
export function kristalle(g, list, rnd) {
  for (const [x, y, z, n = 5, col] of list) {
    for (let k = 0; k < n; k++) {
      const a = rnd.real(0, TAU), rr = rnd.real(0.05, 0.45), hh = rnd.real(0.5, 1.4);
      g.cone(rnd.real(0.12, 0.22), hh, x + Math.cos(a) * rr, y - 0.05, z + Math.sin(a) * rr, col ?? [0x7ad8ff, 0xc08aff, 0x7affc8][k % 3], 5, { rx: Math.sin(a) * 0.35, rz: Math.cos(a) * 0.35 });
    }
  }
}

/** Goldschatz-Haufen: list [[x, y, z, r]]. */
export function schatz(b, g, list, rnd) {
  for (const [x, y, z, r = 0.8] of list) {
    for (let i = 0; i < 18; i++) {
      const a = rnd.real(0, TAU), d = rnd.real(0, r), hh = (1 - d / r) * r * 0.55;
      b.cyl(0.13, 0.13, 0.04, x + Math.cos(a) * d, y + hh * rnd.frac(), z + Math.sin(a) * d, TEMPEL.gold, 10, { rx: rnd.real(-0.5, 0.5), rz: rnd.real(-0.5, 0.5) });
    }
    b.sphere(r * 0.55, x, y, z, litTop(0xe8a820, 0.7), { s: [1, 0.55, 1], ws: 10, hs: 6 });
    g.sphere(0.12, x + 0.2, y + r * 0.35, z + 0.1, 0xff4a8a, { ws: 6, hs: 4 });
    g.sphere(0.1, x - 0.25, y + r * 0.3, z - 0.1, 0x4affb0, { ws: 6, hs: 4 });
  }
}

/** Steinerne Pflaume (Schlappohr-Häschen als Tempelwächter, Kulisse): [x, y, z, yaw, Größe]. */
export function pflaumeStatue(b, g, list) {
  for (const [x, y, z, yaw = 0, s = 1] of list) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (u, v) => [x + c * u + sn * v, z - sn * u + c * v];
    b.box(1.4 * s, 0.5 * s, 1.4 * s, x, y, z, litTop(TEMPEL.cap, 0.6), { r: 0.04, yaw });
    b.box(1.2 * s, 0.12 * s, 1.2 * s, x, y + 0.5 * s, z, litTop(TEMPEL.gold, 0.6), { r: 0, yaw });
    const st = litTop(0xd4c8bc, 0.62);
    b.sphere(0.5 * s, x, y + 1.05 * s, z, st, { s: [1, 0.95, 0.9], ws: 12, hs: 8 });
    let [hx, hz] = P(0.22 * s, 0);
    b.sphere(0.36 * s, hx, y + 1.62 * s, hz, st, { ws: 12, hs: 8 });
    for (const side of [-1, 1]) {
      const [ex, ez] = P(0.1 * s, side * 0.36 * s);
      b.box(0.14 * s, 0.8 * s, 0.26 * s, ex, y + 1.0 * s, ez, st, { yaw, rx: side * c * 0.22, rz: -side * sn * 0.22, r: 0.05 });   // Schlappohren
      const [ix, iz] = P(0.18 * s, side * 0.37 * s);
      b.box(0.04 * s, 0.6 * s, 0.16 * s, ix, y + 1.08 * s, iz, 0xf0a0b8, { yaw, rx: side * c * 0.22, rz: -side * sn * 0.22, r: 0 });
      const [ax, az] = P(0.5 * s, side * 0.13 * s);
      g.sphere(0.06 * s, ax, y + 1.7 * s, az, TEMPEL.rune, { ws: 6, hs: 4 });                                                   // leuchtende Augen
    }
    [hx, hz] = P(0.57 * s, 0);
    b.sphere(0.07 * s, hx, y + 1.58 * s, hz, 0xff7aa0, { ws: 6, hs: 4 });
    [hx, hz] = P(-0.42 * s, 0);
    b.sphere(0.16 * s, hx, y + 0.8 * s, hz, litTop(0xb8aca4, 0.7), { ws: 8, hs: 6 });                                         // Schwänzchen
  }
}

/**
 * Scheinwand (Bauplan 7-2 „versteckter Raum rechts nach dem Kontrollpunkt“): sieht aus wie die Tempelmauer daneben, hat aber
 * keine Kollision; kommt die Figur nah, wird sie durchscheinend (man sieht den Gang dahinter). Eigenes Mesh.
 * o: { from, to, y, h, t, faces } wie tempelWand. → { fade, near }
 */
export function scheinwand(level, o) {
  const st = { fade: 1, near: false };
  if (!level.view) return st;
  const b = new Bld(), g = new Bld();
  tempelWand(level, b, g, { ...o, solid: false }, new Rnd(o.seed ?? 99));
  // feine, leuchtende Risse als Hinweis
  const [ax, az] = o.from, [bx, bz] = o.to;
  const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
  const cx = (ax + bx) / 2, cz = (az + bz) / 2, T = o.t ?? 0.8;
  for (const face of o.faces ?? [1, -1]) {
    for (let k = 0; k < 5; k++) {
      const yy = o.y + 0.4 + k * 0.32, off = (k % 2 ? 0.25 : -0.2) + k * 0.05;
      if (alongX) g.box(0.5, 0.05, 0.03, cx + off, yy, cz + face * (T / 2 + 0.02), 0x8ae8ff, { r: 0, rz: k % 2 ? 0.6 : -0.6 });
      else g.box(0.03, 0.05, 0.5, cx + face * (T / 2 + 0.02), yy, cz + off, 0x8ae8ff, { r: 0, rx: k % 2 ? 0.6 : -0.6 });
    }
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, transparent: true, opacity: 1 });
  const gm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 });
  const grp = new THREE.Group();
  const m1 = new THREE.Mesh(b.geometry(), mat), m2 = new THREE.Mesh(g.geometry(), gm);
  m1.receiveShadow = true;
  grp.add(m1, m2);
  grp.name = 'scheinwand';
  const x0 = Math.min(ax, bx) - 1.6, x1 = Math.max(ax, bx) + 1.6, z0 = Math.min(az, bz) - 1.6, z1 = Math.max(az, bz) + 1.6;
  const holder = {};
  addObject(level, grp, (dt) => {
    const d = visDt(level, holder, dt);
    const p = level.player;
    st.near = !!p && p.pos.x > x0 && p.pos.x < x1 && p.pos.z > z0 && p.pos.z < z1 && p.pos.y < o.y + (o.h ?? 3);
    const want = st.near ? 0.22 : 1;
    st.fade += (want - st.fade) * Math.min(1, d * 6);
    mat.opacity = st.fade; gm.opacity = st.fade;
    mat.depthWrite = st.fade > 0.95;
  });
  return st;
}

/**
 * Unsichtbarer länglicher ?-Block (Bauplan 7-2 Stern 3): nur von unten fest (Kopfstoß); getroffen erscheint er (gestreckter,
 * benutzter ?-Block), gibt Münzen und zeigt den ersten Block der versteckten Kette chain (hiddenchain-Id).
 * o: { pos: [x, y, z] (Mitte der Unterseite), size: [3, 1, 1], chain, coins: 3, id }.
 */
export function geheimLaengsblock(level, o) {
  const [px, py, pz] = o.pos, [sx, sy, sz] = o.size ?? [3, 1, 1];
  const st = { shown: false, bumps: 0 };
  const shape = { type: 'box', min: [px - sx / 2, py, pz - sz / 2], max: [px + sx / 2, py + sy, pz + sz / 2], fromBelowOnly: true, tag: 'geheimblock' };
  let model = null;
  shape.owner = {
    onBump() {
      st.bumps++;
      if (st.shown) return;
      st.shown = true;
      shape.fromBelowOnly = false;
      level.world.update(sid);
      level.sfx('blockhit');
      level.effects?.sparks({ x: px, y: py + 0.5, z: pz }, 14);
      if (o.coins) runAction(level, { coins: o.coins, pos: [px, py + 1.2, pz] });
      level.named.get(o.chain)?.revealNext?.();
      if (model) model.root.visible = true;
    },
  };
  const sid = level.world.add(shape);
  if (o.id) level.named.set(o.id, { get shown() { return st.shown; }, info: () => ({ ...st }) });
  if (level.view) {
    model = getModel('question_block');
    model.root.position.set(px, py, pz);
    model.root.scale.set(sx, sy, sz);
    model.root.visible = false;
    addObject(level, model.root, (dt) => { model.update?.(visDt(level, st, dt), { anim: 'used', n: 1 }); });
  }
  return st;
}

/** Bodenmosaik: Ringe aus bunten Steinchen um (x, y, z): rings [[r0, r1, Farbe], …]. */
export function mosaik(b, x, y, z, rings, rnd) {
  for (const [r0, r1, col] of rings) {
    const n = Math.max(8, Math.round(((r0 + r1) / 2) * TAU / 0.42));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, r = (r0 + r1) / 2;
      const c = new THREE.Color(Array.isArray(col) ? col[i % col.length] : col).multiplyScalar(0.9 + rnd.frac() * 0.2);
      b.box(Math.min(0.36, r * TAU / n - 0.06), 0.04, r1 - r0 - 0.06, x + Math.cos(a) * r, y, z + Math.sin(a) * r, c, { yaw: -a + Math.PI / 2, r: 0 });
    }
  }
}

/** 7-2: Tempel-Kulisse (Fassaden, Mauern, Säulen, Rundsaal, Schatzraum, Statuen, Abgrund). o: { Y, HX }. */
export function tempel72(level, o) {
  const { Y, HX } = o;
  const rnd = new Rnd(7272);
  const b = new Bld(), g = new Bld();
  // ---------------- Fassaden der schwebenden Tempelböden (Quader) + leuchtende Runenleiste
  const rects = [[-6, 6, 8, -6], [-3, 3, -6, -20], [-4.5, 4.5, -20, -27], [-8, 8, -41, -58], [11, 14, -46, -50.4, 2.2], [-8, 8, -72, -88], [-5, 5, -88, -98],
    [-6, 6, -98, -112], [-4, 4, -126, -132], [-9, 9, -153, -170], [-6, 6, -184, -197], [-7, 7, -210, -228], [HX - 4.5, HX + 5, -86, -100]];
  for (const [x0, x1, zA, zB, dy = 0] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), top = Y + dy;
    ziegel(b, { axis: 'x', at: z0, a0: x0, a1: x1, y0: top - 2.2, y1: top - 0.06, dir: 1, depth: 0.14, row: 0.7, pal: TEMPEL.stone }, rnd);
    ziegel(b, { axis: 'z', at: x0, a0: z1, a1: z0, y0: top - 2.2, y1: top - 0.06, dir: -1, depth: 0.14, row: 0.7, pal: TEMPEL.stone, shift: 1 }, rnd);
    ziegel(b, { axis: 'z', at: x1, a0: z1, a1: z0, y0: top - 2.2, y1: top - 0.06, dir: 1, depth: 0.14, row: 0.7, pal: TEMPEL.stone, shift: 1 }, rnd);
    b.box(x1 - x0 + 0.1, 0.18, 0.26, (x0 + x1) / 2, top - 0.22, z0 + 0.08, litTop(TEMPEL.cap, 0.6), { r: 0 });
    for (let x = x0 + 0.7; x < x1 - 0.4; x += 1.4) g.box(0.22, 0.22, 0.05, x, top - 1.2, z0 + 0.17, (Math.round(x * 3) % 2) ? TEMPEL.rune : TEMPEL.runeWarm, { r: 0, rz: Math.PI / 4 });
  }
  // Sandsteinplatten (außer im Rundsaal mit seinem Mosaik), glimmende Runenrisse
  fliesen(b, rects.filter((r) => r[2] !== -72).map(([x0, x1, zA, zB, dy = 0]) => [x0, x1, zA, zB, Y + dy]), rnd,
    { pal: [0xc8a878, 0xbc9c6c, 0xd2b484, 0xb08e64, 0xc4a272, 0xd8bc90], row: 1.2, glow: g, cracks: 0.025, crackColor: 0xffb04a });
  fliesen(b, [[-8, 8, -72, -75.2, Y], [-8, 8, -84.8, -88, Y]], rnd, { pal: [0xc8a878, 0xbc9c6c, 0xd2b484, 0xb08e64], row: 1.2 });
  // ---------------- Mauern
  const W = (from, to, y, h, faces, extra = {}) => tempelWand(level, b, g, { from, to, y, h, faces, ...extra }, rnd);
  W([-5.6, 7.6], [-5.6, -5.6], Y, 3.6, [1]); W([5.6, 7.6], [5.6, -5.6], Y, 3.6, [-1]);                 // Eingangshalle
  W([-2.65, -6.2], [-2.65, -19.6], Y, 3.2, [1], { t: 0.7 }); W([2.65, -6.2], [2.65, -19.6], Y, 3.2, [-1], { t: 0.7 });   // dunkler Gang
  W([-7.6, -41.4], [-7.6, -57.6], Y, 3.6, [1]);                                                         // zweiter Saal links
  W([-4.6, -88.4], [-4.6, -97.6], Y, 3.2, [1]);                                                         // Kontrollpunkt links
  W([4.6, -88.2], [4.6, -90.4], Y, 3.2, [-1, 1]); W([4.6, -95.6], [4.6, -97.8], Y, 3.2, [-1, 1]);       // rechts (dazwischen Scheinwand)
  W([5.2, -95.4], [HX - 4.5, -95.4], Y, 2.4, [1], { t: 0.6 });                                          // Geheimgang (Rückwand)
  W([HX - 4.4, -99.6], [HX + 4.9, -99.6], Y, 3.4, [1]); W([HX + 4.6, -86.4], [HX + 4.6, -99.6], Y, 3.4, [-1]);   // Schatzraum
  W([-5.6, -98.4], [-5.6, -111.6], Y, 3.2, [1]);
  W([-8.6, -153.4], [-8.6, -169.6], Y, 3.6, [1]);
  W([-6.6, -227.6], [6.6, -227.6], Y, 4.2, [1], { t: 0.9 });                                            // Zielhalle Rückwand
  // ---------------- Säulen
  const S = (x, z, h = 4.2, extra = {}, y = Y) => saeule(level, b, g, x, y, z, h, 0.45, extra);
  S(-4, -26.4, 3.6); S(4, -26.4, 3.6);
  S(7.4, -41.8); S(7.4, -57.4); S(-7.2, -71.4, 4.6, { solid: false }); S(7.2, -71.4, 4.6, { solid: false });
  for (const deg of [0, 30, 150, 180, 210, 330]) { const a = deg * Math.PI / 180; S(Math.cos(a) * 7.1, -80 + Math.sin(a) * 7.1, 4.6, { rune: deg % 60 ? TEMPEL.runeWarm : TEMPEL.rune }); }
  S(-5.4, -98.6, 3.8); S(5.4, -111.4, 3.8, { solid: false });
  S(-3.4, -126.6, 3.6); S(3.4, -126.6, 3.6);
  S(-8.4, -169.4, 4.2); S(8.4, -153.6, 4.2);
  S(-5.4, -196.4, 3.8); S(-5.4, -184.6, 3.8); S(5.4, -184.6, 3.8);
  S(-6.4, -227, 5); S(6.4, -227, 5); S(-6.4, -216, 4.4); S(6.4, -216, 4.4);
  // ---------------- Rundsaal: Mosaik, Mittelstein
  mosaik(b, 0, Y + 0.02, -80, [[1.2, 1.7, 0xffc23a], [1.9, 2.5, [0x2ab8b0, 0x3ad8c8]], [2.7, 3.2, [0xd8603a, 0xffc23a]], [3.4, 4.1, [0x5a6ad8, 0x8a5ad8]], [4.3, 4.8, 0xe0c898]], rnd);
  g.cyl(0.9, 0.95, 0.06, 0, Y + 0.02, -80, 0x6af0ff, 18);
  // ---------------- Schatzraum: Gold, Amphoren, Wächter-Häschen
  schatz(b, g, [[HX + 3.4, Y, -98, 0.9], [HX - 2.6, Y, -98.4, 0.7], [HX + 3.8, Y, -88, 0.6]], rnd);
  amphoren(b, [[HX - 3.6, Y, -98.6, 0x2ab8b0, 1.1], [HX - 1.4, Y, -99, 0xd8603a, 0.9], [HX + 1.6, Y, -99, 0x8a5ad8, 1], [HX + 4.2, Y, -95, 0xd8603a, 0.8]]);
  pflaumeStatue(b, g, [[HX + 3.8, Y, -91.6, Math.PI, 0.9]]);
  kristalle(g, [[HX - 3.6, Y, -87, 6, 0x7ad8ff], [HX + 4, Y, -86.8, 5, 0xc08aff]], rnd);
  // ---------------- Halle-Zier: Amphoren, Statuen, Kristalle
  amphoren(b, [[-4.8, Y, 6.4, 0xd8603a, 1], [4.8, Y, 6.4, 0x2ab8b0, 1], [-6.8, Y, -42.2, 0x8a5ad8, 0.9], [-6.6, Y, -56.8, 0xd8603a, 1.1], [7.6, Y, -88.6, 0x2ab8b0, 0.6],
    [-5, Y, -132, 0xd8603a, 0.9], [-7.8, Y, -154.2, 0x2ab8b0, 1], [7.8, Y, -168.8, 0x8a5ad8, 1], [-5.6, Y, -209.4, 0xd8603a, 1], [5.6, Y, -209.4, 0x2ab8b0, 1]]);
  pflaumeStatue(b, g, [[-3.6, Y, -224, -Math.PI / 2 + 0.4, 1.3], [3.6, Y, -224, -Math.PI / 2 - 0.4, 1.3], [-4.4, Y, -2.5, -Math.PI / 2 + 0.6, 1]]);
  schatz(b, g, [[-4.8, Y, -219.5, 0.8], [4.8, Y, -219.5, 0.8]], rnd);
  kristalle(g, [[-5.2, Y, -46, 5], [7.2, Y, -50, 4], [-7.2, Y, -86.4, 5], [7.4, Y, -86.6, 4], [-5.2, Y, -110.6, 4], [-8.2, Y, -161, 6], [8.2, Y, -161, 5], [5.2, Y, -188, 4], [-6.2, Y, -224, 5], [6.2, Y, -224, 5]], rnd);
  // ---------------- Abgrund: Ruinensäulen aus der Tiefe mit Kristallen, ferne Glut
  for (const [x, z, top] of [[-14, -14, -1.5], [12, -30, -3], [-15, -64, -2], [15, -76, -1], [-13, -118, -2.5], [13, -138, -1.8], [-14, -176, -3], [14, -204, -2], [-15, -236, -2.4], [0, -238, -4]]) {
    b.cyl(1.1, 1.3, top + 16, x, -16, z, gradY(0x2a2026, 0x8a7458, -14, top), 10);
    b.cyl(1.4, 1.2, 0.4, x, top, z, litTop(TEMPEL.cap, 0.5), 10);
    kristalle(g, [[x, top + 0.4, z, 4]], rnd);
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// 7-A: Glutkönig im Platschkessel
// =====================================================================================================================

/**
 * Arena-Kampf gegen einen Endgegner (Archetyp arena, wie 6-A): der Arena-Archetyp zählt nur den Boss (LEVEL.arena.enemies:
 * []), zeigt seine Lebensleiste und lässt nach seinem Sieg (state 'gone' → level.onBossDefeated) den Arena-Stern erscheinen.
 * Tod der Figur: Boss zurück (volle Treffer, wartet wieder), Lebensleiste aus. o: { id, name }.
 * → level.named.get('bossKampf') = { boss, started, gone }
 */
export function bossKampf(level, o) {
  const arch = level.archetype;
  const boss = level.named.get(o.id);
  if (!arch || !boss) return null;
  const st = { gone: false };
  const claim = () => { arch.counted.add(boss); arch.total = arch.left = 1; arch.hud.hideArena?.(); };
  claim();
  arch.boss = boss;
  const prevDef = level.onBossDefeated;
  level.onBossDefeated = (b) => { prevDef?.(b); if (b === boss) arch.onDefeated(boss); };
  const rt = level.runtime;
  const respawn = rt.respawn.bind(rt);
  rt.respawn = () => {
    respawn();
    boss.reset?.();
    claim();
    arch.hud.hideBoss?.();
    st.gone = false;
  };
  level.onStep(() => {
    const started = boss.state !== 'wait';
    if (started && boss.state !== 'gone') arch.hud.boss?.({ name: o.name, hp: boss.hp, max: boss.maxHp });
    else if (boss.state === 'gone' && !st.gone) { st.gone = true; arch.hud.hideBoss?.(); }
  });
  const handle = { boss, get started() { return boss.state !== 'wait'; }, get gone() { return st.gone; } };
  level.named.set('bossKampf', handle);
  return handle;
}

/** 7-A: Kessel-Kulisse – Basaltring mit Brummbär-Bannern, Lavabrocken-Nester, Platschfisch-Schilder. o: { Y, LAVA, R }. */
export function kessel7A(level, o) {
  const { Y, LAVA, R } = o;
  const rnd = new Rnd(7171 + 7);
  const b = new Bld(), g = new Bld();
  // Basalt-Pfeiler auf dem Kesselrand (hinten und seitlich; vorn frei für die Kamera) mit Glutfugen und Bannern
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.62 + (i / 13) * 1.76);   // von links vorn über hinten nach rechts vorn
    const r = R + 2.6 + (i % 2) * 0.8, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 3.2 + ((i * 5) % 4) * 1.1;
    b.cyl(0.9, 1.1, h, x, LAVA - 0.5, z, gradY(0x2a2228, 0x6a5a5e, LAVA, LAVA + h), 6);
    b.cyl(1.0, 0.9, 0.3, x, LAVA - 0.5 + h, z, litTop(0x8a7a7e, 0.6), 6);
    g.torus(1.02, 0.05, x, LAVA + 0.4, z, 0xff8a2a, { rx: Math.PI / 2, ts: 6, rs: 3 });
    if (i % 3 === 1) {
      const fy = LAVA - 0.5 + h - 0.6, nx = -Math.cos(a), nz = -Math.sin(a);
      b.box(1.2, 2.2, 0.06, x + nx * 0.95, fy - 2.2, z + nz * 0.95, 0xd8323a, { yaw: -a - Math.PI / 2, r: 0 });
      b.box(1.3, 0.12, 0.08, x + nx * 0.95, fy, z + nz * 0.95, 0xffc23a, { yaw: -a - Math.PI / 2, r: 0 });
      g.sphere(0.32, x + nx * 1.0, fy - 1.0, z + nz * 1.0, 0xffc23a, { s: [1, 1, 0.3], ws: 10, hs: 6 });
    }
  }
  // Glutkrone in der Kesselmitte (hier steigt der Stern auf): Basalt-Ringe mit glühenden Fugen, goldene Zacken
  const cz = o.center ?? -0.6;
  mosaik(b, 0, Y + 0.02, cz, [[1.1, 1.6, [0x4a3a3a, 0x5a4644]], [1.8, 2.4, [0x3a2c2c, 0x4e3c3a, 0x46363a]], [2.6, 3.0, [0x5a4644, 0x6a5450]]], rnd);
  g.torus(1.0, 0.06, 0, Y + 0.06, cz, 0xff8a2a, { rx: Math.PI / 2, ts: 28, rs: 4 });
  g.torus(1.72, 0.05, 0, Y + 0.06, cz, 0xffb040, { rx: Math.PI / 2, ts: 36, rs: 4 });
  g.torus(2.52, 0.05, 0, Y + 0.06, cz, 0xff8a2a, { rx: Math.PI / 2, ts: 44, rs: 4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.cone(0.2, 0.28, Math.cos(a) * 0.62, Y + 0.12, cz + Math.sin(a) * 0.62, litTop(0xffc23a, 0.6), 4);
  }
  b.cyl(0.66, 0.7, 0.12, 0, Y + 0.02, cz, litTop(0xffc23a, 0.6), 18);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}
