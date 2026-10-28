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
    // Flamme (drei Kegel, additiv) – unsichtbar bis zum Anzünden
    const fl = new THREE.Group();
    const col = spec.color ?? 0xff8a2a;
    const mk = (r, h, c, o) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.position.y = h / 2; return m; };
    fl.add(mk(0.42, 1.25, col, 0.75), mk(0.28, 0.95, 0xffd060, 0.85), mk(0.14, 0.6, 0xfff4c0, 0.9));
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
  // ---------------- Teppiche, Lager
  laeufer(b, [[0, Y, 4.4, -12.5, 2], [0, Y, -86.5, -91.5, 1.8], [0, Y, -157.4, -165.6, 2], [0, Y, -229, -238.6, 2.2]]);
  werferKram(b, g, [[-6.6, Y, -40.8, 0.3], [-7.6, Y, -127.2, -0.2], [6.6, Y, -138.4, Math.PI], [-5.4, Y, -214.2, 0.2]], rnd);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}
