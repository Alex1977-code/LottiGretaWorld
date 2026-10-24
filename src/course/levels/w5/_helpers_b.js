// Hilfen für die Welt-5-Level 5-3 „Klon-Gewusel in den Blauglut-Gassen“, 5-A „Hörnerherde am Lila Strand“,
// 5-4 „Kanonenflug über die Goldsavanne“ und 5-Kapitän „Krümel im Kicherschlösschen“ (kein Level: exportiert kein
// LEVEL, die Level-Registry überspringt dieses Modul).
//
// Oben reine Daten-Helfer (Inseln, Münzspuren), darunter level-lokale Kulisse und kleine Mechanik, die es als Baustein
// nicht gibt. Statische Zier entsteht im Aufbau-Haken `LEVEL.build` (vor dem Verschmelzen: landet in den
// Abschnitts-Meshes, 0 zusätzliche Zeichenaufrufe), Leuchtendes im Glüh-Material; Belebtes (Fledermäuse, Wäsche,
// Fontänen …) ist je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten und wird in `LEVEL.setup` angemeldet.
//
// Gemeinsam:  isl, line, ring, arc, column, Bld (Geometrie-Sammler), glowBlob, animated, onRespawn
// 5-3 Blauglut-Gassen: crackTile (rissige Bodenfliese – Stampfattacke öffnet eine Grube), fruitCrystal (Spiegel-
//   frucht wächst nach), caveHouse(s) (Höhlenhäuser mit leuchtenden Fenstern an den Felswänden), caveWall
//   (Basaltwand mit Kante), streetLamp, laundry (wehende Wäscheleine), stalactites, bats (Fledermäuse), blueFall
//   (blauer Lavafall), marketStall, glowFountain (Blauglut-Brunnen), paving (Pflaster), mushroomLamps, sparksUp.

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { visDt } from '../../entities/gimmick.js';

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie (zeigt einen Sprung an). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzsäule (senkrecht) bei x, z von y0 bis y1. */
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });

// =====================================================================================================================
// Geometrie-Sammler (Weltkoordinaten, Vertexfarben) – dünne Hülle um Build aus models/lib/kit.js
// =====================================================================================================================

/**
 * Sammler für statische Zier: b.box(w, h, d, x, y, z, farbe, { r, yaw }) (Mitte unten), b.cyl(rTop, rBot, h, x, y, z,
 * farbe, seg), b.sphere(r, x, y, z, farbe, { s: [sx, sy, sz] }), b.cone(r, h, x, y, z, farbe, seg), b.add(g, farbe, o).
 * b.flush(level, opts) gibt die Geometrie an den Batcher (addStatic) – opts { material: 'glow', castShadow }.
 * Farbe: Hex | Funktion (x, y, z, nx, ny, nz) | { v: fn } (models/lib/kit.js paint).
 */
export class Bld {
  constructor() { this.b = new Build(); this.n = 0; }
  box(w, h, d, x, y, z, color, o = {}) {
    this.b.box(w, h, d, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.r ?? 0.04, o.seg ?? 1);
    this.n++; return this;
  }
  cyl(rTop, rBot, h, x, y, z, color, seg = 10, o = {}) {
    this.b.cyl(rTop, rBot, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, seg, !!o.open);
    this.n++; return this;
  }
  sphere(r, x, y, z, color, o = {}) {
    this.b.sphere(r, color, { p: [x, y, z], s: o.s ?? 1, r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.ws ?? 10, o.hs ?? 7);
    this.n++; return this;
  }
  cone(r, h, x, y, z, color, seg = 8, o = {}) {
    this.b.cone(r, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], s: o.s ?? 1 }, seg);
    this.n++; return this;
  }
  torus(R, t, x, y, z, color, o = {}) {
    this.b.torus(R, t, color, { p: [x, y, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.rs ?? 6, o.ts ?? 16, o.arc ?? TAU);
    this.n++; return this;
  }
  add(g, color, o) { this.b.add(g, color, o); this.n++; return this; }
  geometry() { if (!this.n) return null; this.n = 0; return this.b.geometry(); }
  flush(level, opts) {
    const g = this.geometry();
    if (!g) return;
    if (!level.view) { g.dispose(); return; }
    addStatic(level, g, opts);
  }
}

/** Farbverlauf von unten (lo) nach oben (hi) über die Höhe y0..y1 – für Bld-Farben ({ v }). */
export const gradY = (lo, hi, y0, y1) => {
  const A = new THREE.Color(lo), B = new THREE.Color(hi), c = new THREE.Color();
  return { v: (x, y) => c.copy(A).lerp(B, Math.max(0, Math.min(1, (y - y0) / (y1 - y0 || 1)))) };
};
/** Oben hell, unten dunkel (Licht von oben) – für Bld-Farben. */
export const litTop = (base, k = 0.7) => {
  const M = new THREE.Color(base), T = M.clone().multiplyScalar(1.15), D = M.clone().multiplyScalar(k), c = new THREE.Color();
  return { v: (x, y, z, nx, ny) => (ny >= 0 ? c.copy(M).lerp(T, ny) : c.copy(M).lerp(D, -ny)) };
};

/** Weicher Leuchtfleck (additives Sprite) – Textur einmal je Seite. */
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(cv);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

/**
 * Leuchtfeld eines Levels: alle weichen Leuchtflecken (Laternenschein, Funken, Fontänen …) in **einem** Punkte-Objekt
 * (1 Zeichenaufruf, additiv, ohne Nebel). Je Punkt eigene Größe, Farbe, Deckkraft und Pulsieren; bewegte Punkte über
 * dyn = glowField(level).alloc(n, opts) → dyn.set(i, x, y, z) je Bild (dyn.hide(i) blendet aus).
 */
const GLOW_VS = `
  attribute float size; attribute vec3 tint; attribute vec2 pulse;   // pulse: (Hz, Phase)
  uniform float time; uniform float scale;
  varying vec3 vTint; varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float k = pulse.x > 0.0 ? 0.78 + 0.22 * sin(time * pulse.x * 6.2832 + pulse.y) : 1.0;
    vTint = tint; vA = k;
    gl_PointSize = size * scale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const GLOW_FS = `
  uniform sampler2D map;
  varying vec3 vTint; varying float vA;
  void main() {
    vec4 t = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vTint * vA, t.a);
    #include <colorspace_fragment>
  }`;

class GlowField {
  constructor(level) {
    this.level = level;
    this.n = 0;
    this.cap = 0;
    this.pos = new Float32Array(0); this.size = new Float32Array(0); this.tint = new Float32Array(0); this.pulse = new Float32Array(0);
    this.geo = new THREE.BufferGeometry();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, scale: { value: 300 }, map: { value: glowTex() } },
      vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.obj = new THREE.Points(this.geo, this.mat);
    this.obj.frustumCulled = false;
    this.obj.renderOrder = 4;
    this.dyn = [];
    const holder = {};
    const size = new THREE.Vector2();
    addObject(level, this.obj, (dt) => {
      this.mat.uniforms.time.value += visDt(level, holder, dt);
      const v = level.view;
      v.renderer?.getDrawingBufferSize?.(size);
      if (size.y) this.mat.uniforms.scale.value = size.y * 0.5;   // wie PointsMaterial (Höhe/2)
      let dirty = false;
      for (const d of this.dyn) if (d.update) { d.update(dt); dirty = true; }
      if (dirty) this.geo.attributes.position.needsUpdate = true;
    });
  }
  grow(k) {
    if (this.n + k <= this.cap) return;
    const cap = Math.max(64, (this.n + k) * 2);
    const re = (a, w) => { const b = new Float32Array(cap * w); b.set(a); return b; };
    this.pos = re(this.pos, 3); this.size = re(this.size, 1); this.tint = re(this.tint, 3); this.pulse = re(this.pulse, 2);
    this.cap = cap;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3));
    this.geo.setAttribute('pulse', new THREE.BufferAttribute(this.pulse, 2));
  }
  /** Punkte hinzufügen: pts [[x, y, z, größe-Faktor?], …], o { color, size, opacity, pulse }. Liefert den ersten Index. */
  add(pts, o = {}) {
    this.grow(pts.length);
    const c = new THREE.Color(o.color ?? 0x6ac8ff).multiplyScalar(o.opacity ?? 0.7);
    const i0 = this.n;
    pts.forEach((p, k) => {
      const i = this.n++;
      this.pos.set([p[0], p[1], p[2]], i * 3);
      this.size[i] = (o.size ?? 1.2) * (p[3] ?? 1);
      this.tint.set([c.r, c.g, c.b], i * 3);
      this.pulse[i * 2] = o.pulse ?? 0; this.pulse[i * 2 + 1] = (i0 + k) * 1.7;
    });
    this.geo.setDrawRange(0, this.n);
    for (const a of ['position', 'size', 'tint', 'pulse']) this.geo.attributes[a].needsUpdate = true;
    return i0;
  }
  /** n bewegte Punkte: update(dt) setzt Lagen über set(i, x, y, z); hide(i) schiebt einen Punkt weg. */
  alloc(n, o = {}, update = null) {
    const i0 = this.add(Array.from({ length: n }, () => [0, -999, 0]), o);
    const d = { i0, n, update, set: (i, x, y, z) => { const k = (i0 + i) * 3; this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; }, hide: (i) => { this.pos[(i0 + i) * 3 + 1] = -999; } };
    this.dyn.push(d);
    return d;
  }
}

/** Leuchtfeld des Levels (wird beim ersten Aufruf angelegt). */
export function glowField(level) {
  if (!level.view) return null;
  if (!level._w5glow) level._w5glow = new GlowField(level);
  return level._w5glow;
}

/**
 * Leuchtflecken (ins gemeinsame Leuchtfeld): pts = [[x, y, z, größe?], …]. o: { color, size, opacity, pulse (Hz) }.
 * Liefert { field, i0, n } (Index-Bereich, z. B. zum Ausblenden).
 */
export function glowPoints(level, pts, o = {}) {
  const f = glowField(level);
  if (!f || !pts.length) return null;
  return { field: f, i0: f.add(pts, o), n: pts.length };
}
/** Leuchtflecken ausblenden (Ergebnis von glowPoints). */
export function hideGlow(g) {
  if (!g) return;
  for (let i = 0; i < g.n; i++) g.field.pos[(g.i0 + i) * 3 + 1] = -999;
  g.field.geo.attributes.position.needsUpdate = true;
}

/** Hülle um runtime.respawn (Tod → Neustart am Checkpoint): fn() läuft danach (verkettet, wie in den Archetypen). */
export function onRespawn(level, fn) {
  const rt = level.runtime;
  if (!rt) return;
  const prev = rt.respawn.bind(rt);
  rt.respawn = (...a) => { const r = prev(...a); fn(); return r; };
}

// =====================================================================================================================
// 5-3 Blauglut-Gassen
// =====================================================================================================================

// Farben der Höhlenstadt
export const GASSE = {
  basalt: 0x3e3a5e, basaltHi: 0x6a6496, basaltDeep: 0x221e36, edge: 0x8ec8ff,
  plaster: [0xffd0a0, 0x9ad8ff, 0xffa8c8, 0xb8f0a0, 0xd8b0ff, 0xfff09a],
  wood: 0x8a5a3a, woodDark: 0x5a3622, roof: [0x3a6aff, 0xa84aff, 0x2ab8b0, 0xff5a7a],
  window: 0xffd68a, windowBlue: 0x9ae4ff, lamp: 0xd8f6ff, flower: [0x6ad0ff, 0xff8ad8, 0xfff06a, 0x9aff8a],
};

/**
 * Rissige Bodenfliese (Bauplan 5-3 Stern 1: „Stampfen auf die rissige Fliese links vom Start“): Steinplatte, bündig im
 * Boden, mit dunklen, blau glimmenden Rissen. Nur eine Stampfattacke von oben (bzw. Riesentrank/Explosion) zerschlägt
 * sie – darunter öffnet sich eine Grube (Boden pitY), in der der Stern liegt. Normales Darüberlaufen/Springen hält sie.
 * o: { pos: [x, y, z] (Mitte der Oberseite), size: [w, d] (2 × 2), pitY (Boden der Grube), id, onBreak (fn) }
 * level.named.get(id) = { broken, hits, box }.
 */
export function crackTile(level, o) {
  const [x, y, z] = o.pos, [w, d] = o.size ?? [2, 2];
  const th = 0.35;
  const st = { broken: false, hits: 0, box: { min: [x - w / 2, y - th, z - d / 2], max: [x + w / 2, y, z + d / 2] } };
  const owner = {
    kind: 'rissige_fliese',
    onHit(kind) {
      st.hits++;
      if (st.broken || !(kind === 'pound' || kind === 'mega' || kind === 'bomb')) return;
      st.broken = true;
      level.world.remove(sid);
      if (mesh) mesh.visible = false;
      hideGlow(dust);
      level.sfx('brickbreak');
      level.shake?.(0.3);
      for (let i = 0; i < 4; i++) level.effects?.debris({ x: x + (i % 2 - 0.5) * w * 0.5, y: y - 0.1, z: z + ((i >> 1) - 0.5) * d * 0.5 }, 0x6a6496, 5);
      level.effects?.sparks({ x, y: y + 0.2, z }, 14);
      o.onBreak?.(level);
    },
    onPound() { this.onHit('pound'); },
  };
  const sid = level.world.add({ type: 'box', min: st.box.min, max: st.box.max, breakable: true, owner, tag: 'rissige_fliese' });
  if (o.id) level.named.set(o.id, st);
  let mesh = null, dust = null;
  if (level.view) {
    // Platte mit Rissen (Risse als dunkle, schmale Leisten mit Glimmen in der Mitte)
    const b = new Bld();
    b.box(w - 0.04, th, d - 0.04, x, y - th, z, litTop(0x8a86b0), { r: 0.05, seg: 1 });
    const rnd = new Rnd(Math.floor(x * 13 + z * 7) >>> 0);
    const cracks = [];
    const branch = (sx, sz, a, len, depth) => {
      let px = sx, pz = sz;
      const n = 3 + rnd.int(0, 2);
      for (let i = 0; i < n; i++) {
        const l = len / n, na = a + rnd.real(-0.6, 0.6);
        const qx = Math.max(x - w / 2 + 0.08, Math.min(x + w / 2 - 0.08, px + Math.cos(na) * l));
        const qz = Math.max(z - d / 2 + 0.08, Math.min(z + d / 2 - 0.08, pz + Math.sin(na) * l));
        cracks.push([px, pz, qx, qz]);
        if (depth > 0 && rnd.frac() < 0.4) branch(qx, qz, na + rnd.pick([-1.1, 1.1]), len * 0.45, depth - 1);
        px = qx; pz = qz;
      }
    };
    for (let k = 0; k < 4; k++) branch(x + rnd.real(-0.15, 0.15), z + rnd.real(-0.15, 0.15), k * (TAU / 4) + rnd.real(-0.4, 0.4), Math.min(w, d) * 0.55, 1);
    const glow = new Bld();
    for (const [ax, az, bx, bz] of cracks) {
      const l = Math.hypot(bx - ax, bz - az), yaw = -Math.atan2(bz - az, bx - ax);
      b.box(l + 0.05, 0.03, 0.09, (ax + bx) / 2, y - 0.012, (az + bz) / 2, 0x16142a, { yaw, r: 0 });
      glow.box(l, 0.03, 0.035, (ax + bx) / 2, y - 0.005, (az + bz) / 2, 0x7ad8ff, { yaw, r: 0 });
    }
    // ein Mesh (die glimmenden Risse sind helle Vertexfarben im Welt-Material)
    for (const [ax, az, bx, bz] of cracks) {
      const l = Math.hypot(bx - ax, bz - az), yaw = -Math.atan2(bz - az, bx - ax);
      b.box(l, 0.03, 0.035, (ax + bx) / 2, y - 0.004, (az + bz) / 2, 0xb8f0ff, { yaw, r: 0 });
    }
    glow.geometry()?.dispose();
    mesh = new THREE.Mesh(b.geometry(), level.view.mats.world);
    mesh.receiveShadow = true;
    addObject(level, mesh);
    // leise rieselnder Staub über der Platte (verrät sie)
    dust = glowPoints(level, [[x - 0.4, y + 0.08, z + 0.2, 1], [x + 0.35, y + 0.06, z - 0.3, 1], [x, y + 0.1, z, 1]], { color: 0x7ad8ff, size: 0.45, opacity: 0.5, pulse: 0.8 });
  }
  return st;
}

/**
 * Spiegelfrucht-Kristall (Nachschub vor den Mehrfigur-Liften): leuchtende Kristallschale auf einem Basaltsockel, darin
 * eine Spiegelfrucht; gepflückt wächst nach `every` s eine neue nach (Funkeln). pos = Fußpunkt. level.named(id) =
 * { grown, fruit }.
 */
export function fruitCrystal(level, pos, o = {}) {
  const [x, y, z] = pos;
  const every = o.every ?? 2.4;
  if (level.view) {
    const b = new Bld(), g = new Bld();
    b.cyl(0.62, 0.74, 0.22, x, y, z, litTop(0x3e3a5e), 9);
    b.cyl(0.5, 0.58, 0.16, x, y + 0.22, z, litTop(0x6a6496), 9);
    // vier Kristallzacken als Schale
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + 0.3;
      g.cone(0.13, 0.55 + (k % 2) * 0.2, x + Math.cos(a) * 0.45, y + 0.3, z + Math.sin(a) * 0.45, gradY(0x2a8aff, 0xd8f6ff, y + 0.3, y + 1), 5, { rz: Math.cos(a) * 0.35, rx: -Math.sin(a) * 0.35 });
    }
    g.cyl(0.42, 0.42, 0.04, x, y + 0.36, z, 0xff8ad8, 14);
    b.flush(level);
    g.flush(level, { material: 'glow', castShadow: false });
    glowPoints(level, [[x, y + 0.55, z]], { color: 0xff7ad0, size: 2.2, opacity: 0.4, pulse: 0.5 });
  }
  // flacher Sockel (Stufe 0,26 m: man läuft hinauf und pflückt die Frucht; die Kristallschale ist nur Zier)
  level.world.add({ type: 'cyl', x, z, r: 0.62, y0: y, y1: y + 0.26, tag: 'fruchtkristall' });
  const top = [x, y + 0.3, z];
  const st = { fruit: null, t: 0, grown: 0 };
  const grow = () => { st.fruit = level.spawn('powerup', { pos: top, power: 'spiegel' }); st.grown++; };
  grow();
  level.onStep((dt) => {
    if (st.fruit && st.fruit.alive && !st.fruit.removed) return;
    st.t += dt;
    if (st.t < every) return;
    st.t = 0;
    grow();
    level.effects?.sparks?.({ x, y: y + 0.8, z }, 10);
  });
  if (o.id) level.named.set(o.id, st);
  return st;
}

/**
 * Felswand der Höhle (Basalt mit heller Kante): Quader x0..x1 × y0..y1 × zA..zB mit Kollision; die Seiten mit
 * waagerechten Schichten und Säulenfugen, oben eine blau glimmende Kante. o: { solid (true), climbable, tag, noTop }.
 */
export function caveWall(level, x0, x1, y0, y1, zA, zB, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  if (o.solid !== false) level.world.add({ type: 'box', min: [x0, y0, z1], max: [x1, y1, z0], climbable: !!o.climbable, camIgnore: !!o.camIgnore, tag: o.tag ?? 'felswand' });
  if (!level.view) return;
  const hi = L(o.light ?? GASSE.basaltHi), mid = L(o.color ?? GASSE.basalt), lo = L(GASSE.basaltDeep);
  const g = box(x1 - x0, y1 - y0, z0 - z1, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0x3e3a5e, { r: 0.12, seg: 1 });
  colorize(g, (p, n, out) => {
    const band = (Math.floor((p.y + 7.3) / 0.9) & 1) * 0.06;
    const col = Math.abs(Math.sin((n.x !== 0 ? p.z : p.x) * 1.7 + Math.floor(p.y / 2.2) * 1.3)) > 0.93 ? -0.18 : 0;
    const k = smooth(y0, y1, p.y);
    mixc(lo, mid, 0.35 + k * 0.65, out);
    if (n.y > 0.5) mixc(out, hi, 0.75, out);
    const f = 1 + band + col;
    out[0] *= f; out[1] *= f; out[2] *= f;
  });
  addStatic(level, g, { castShadow: o.shadow !== false });
  if (o.noTop) return;
  const e = new Bld();
  e.box(x1 - x0 + 0.04, 0.06, 0.08, (x0 + x1) / 2, y1 - 0.03, z0 + 0.02, GASSE.edge, { r: 0 });
  e.box(x1 - x0 + 0.04, 0.06, 0.08, (x0 + x1) / 2, y1 - 0.03, z1 - 0.02, GASSE.edge, { r: 0 });
  e.box(0.08, 0.06, z0 - z1, x0 - 0.02, y1 - 0.03, (z0 + z1) / 2, GASSE.edge, { r: 0 });
  e.box(0.08, 0.06, z0 - z1, x1 + 0.02, y1 - 0.03, (z0 + z1) / 2, GASSE.edge, { r: 0 });
  e.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Höhlenhäuser als Fassaden vor einer Felswand (Blick in Richtung face): je Haus ein verputzter Giebelbau mit rundem
 * Holztor, leuchtenden Fenstern (Fensterläden, Blumenkästen mit leuchtenden Blüten), Dachüberstand, Schornstein und
 * optional Ladenschild. list: [{ at: Mitte unten der Fassade [x, y, z], face: '+x' | '-x' | '+z', w: 3.4, h: 4,
 * color, roof, shop: 'brot' | 'muenze' | 'pilz' | 'kristall' | null, door: true, windows: 2, balcony }]. Ohne Kollision
 * (die Wand dahinter trägt sie); Tiefe 0,5 m.
 */
export function caveHouses(level, list, o = {}) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  list.forEach((h, i) => houseFacade(b, g, h, i));
  b.flush(level, { castShadow: o.shadow ?? false });
  g.flush(level, { material: 'glow', castShadow: false });
}

const FACES = {
  '+x': { ux: 0, uz: -1, nx: 1, nz: 0, yaw: Math.PI / 2 },   // Fassade schaut nach +X, „rechts“ = −Z
  '-x': { ux: 0, uz: 1, nx: -1, nz: 0, yaw: -Math.PI / 2 },
  '+z': { ux: 1, uz: 0, nx: 0, nz: 1, yaw: 0 },
};

function houseFacade(b, g, h, i) {
  const F = FACES[h.face ?? '+z'];
  const [cx, cy, cz] = h.at;
  const W = h.w ?? 3.4, H = h.h ?? 4, D = h.depth ?? 0.5;
  const col = h.color ?? GASSE.plaster[i % GASSE.plaster.length];
  const roof = h.roof ?? GASSE.roof[i % GASSE.roof.length];
  // lokale Koordinaten: u entlang der Fassade, v hoch, n aus der Wand heraus
  const P = (u, v, n) => [cx + F.ux * u + F.nx * n, cy + v, cz + F.uz * u + F.nz * n];
  const bx = (wu, hv, dn, u, v, n, c, opt = {}) => {
    const [x, y, z] = P(u, v, n);
    const w = F.nx ? dn : wu, d = F.nx ? wu : dn;
    (opt.glow ? g : b).box(w, hv, d, x, y, z, c, { r: opt.r ?? 0.04, seg: 1 });
  };
  // Wand (Putz, unten Sockel)
  bx(W, H, D, 0, 0, D / 2, litTop(col, 0.82), { r: 0.08 });
  bx(W + 0.12, 0.45, D + 0.1, 0, 0, D / 2 + 0.05, litTop(0x5a5680));
  // Eckquader
  for (const s of [-1, 1]) for (let k = 0; k < Math.floor(H / 0.7); k++) bx(0.32, 0.3, D + 0.06, s * (W / 2 - 0.12), 0.5 + k * 0.7, D / 2 + 0.03, litTop(0x8a86b0));
  // Dach: Pultdach-Überstand mit Ziegelreihen und Giebelspitze
  for (let r = 0; r < 3; r++) bx(W + 0.6 - r * 0.25, 0.18, 0.9 - r * 0.22, 0, H + r * 0.18, 0.45 + 0.45 - r * 0.11, litTop(roof, 0.75), { r: 0.06 });
  // Schornstein
  if ((h.chimney ?? i % 2) === 1) {
    bx(0.42, 1.1, 0.42, W * 0.28, H + 0.3, 0.3, litTop(0x8a6a6a));
    bx(0.52, 0.12, 0.52, W * 0.28, H + 1.38, 0.3, litTop(0x5a4a4a));
  }
  // Tür (rund oben): Holzflügel, Bögen, Knauf, Stufe
  if (h.door !== false) {
    const du = h.doorAt ?? (W > 3 ? -W * 0.18 : 0);
    bx(1.05, 1.5, 0.08, du, 0.25, D + 0.02, litTop(GASSE.wood, 0.7));
    const [ax, ay, az] = P(du, 1.75, D + 0.06);
    b.cyl(0.52, 0.52, 0.08, ax, ay - 0.04, az, litTop(GASSE.wood, 0.7), 12, { rx: F.nx ? 0 : Math.PI / 2, rz: F.nx ? Math.PI / 2 : 0 });
    bx(1.25, 0.1, 0.14, du, 0.2, D + 0.05, litTop(0x5a5680));
    const [kx, ky, kz] = P(du + 0.3, 1.0, D + 0.1);
    g.sphere(0.06, kx, ky, kz, 0xffd24a);
    // Fensterchen in der Tür
    bx(0.22, 0.22, 0.04, du, 1.55, D + 0.08, GASSE.window, { glow: true, r: 0 });
  }
  // Fenster mit Läden und Blumenkasten
  const nw = h.windows ?? (W > 3 ? 2 : 1);
  for (let k = 0; k < nw; k++) {
    const wu = h.door === false ? (k - (nw - 1) / 2) * (W / nw) : (W > 3 ? W * 0.22 : 0) + k * 0.0;
    const wv = h.door === false ? H * 0.42 : H * 0.6;
    if (h.door !== false && k > 0) continue;
    const lit = (i + k) % 3 !== 2;
    bx(0.82, 0.86, 0.06, wu, wv, D + 0.01, lit ? (i % 2 ? GASSE.window : GASSE.windowBlue) : 0x2a2a4a, { glow: lit, r: 0 });
    bx(0.08, 0.86, 0.08, wu, wv, D + 0.04, litTop(0xf0f0ff), { r: 0 });
    bx(0.82, 0.08, 0.08, wu, wv + 0.4, D + 0.04, litTop(0xf0f0ff), { r: 0 });
    bx(0.3, 0.9, 0.06, wu - 0.6, wv - 0.02, D + 0.04, litTop(roof, 0.8));
    bx(0.3, 0.9, 0.06, wu + 0.6, wv - 0.02, D + 0.04, litTop(roof, 0.8));
    bx(0.95, 0.2, 0.26, wu, wv - 0.22, D + 0.13, litTop(GASSE.wood));
    for (let f = 0; f < 4; f++) {
      const [fx, fy, fz] = P(wu - 0.33 + f * 0.22, wv + 0.04, D + 0.16);
      g.sphere(0.075, fx, fy, fz, GASSE.flower[(i + f) % GASSE.flower.length], { ws: 6, hs: 4 });
    }
    // Obergeschoss-Fenster
    if (H > 3.6) {
      const lit2 = (i + k + 1) % 3 !== 0;
      bx(0.6, 0.6, 0.06, h.door === false ? wu : -W * 0.18, H * 0.82, D + 0.01, lit2 ? GASSE.window : 0x2a2a4a, { glow: lit2, r: 0 });
      bx(0.7, 0.07, 0.1, h.door === false ? wu : -W * 0.18, H * 0.82 - 0.06, D + 0.04, litTop(0xf0f0ff), { r: 0 });
    }
  }
  // Ladenschild (Holzarm mit hängender Tafel, Symbol leuchtet)
  if (h.shop) {
    const su = W / 2 + 0.05;
    bx(0.08, 0.08, 0.9, su, H * 0.72, D + 0.45, litTop(GASSE.woodDark), { r: 0 });
    bx(0.06, 0.7, 0.62, su, H * 0.72 - 0.75, D + 0.62, litTop(0xf0dcb0, 0.85), { r: 0.04 });
    const sym = { brot: 0xffb44a, muenze: 0xffd24a, pilz: 0xff5a7a, kristall: 0x7ad8ff, laterne: 0xfff06a }[h.shop] ?? 0xffffff;
    const [sx, sy, sz] = P(su, H * 0.72 - 0.42, D + 0.62);
    g.sphere(0.2, sx + F.nz * 0.0 + (F.nx ? 0 : 0), sy, sz, sym, { s: F.nx ? [0.5, 1, 1] : [1, 1, 0.5], ws: 8, hs: 6 });
  }
  // Balkon mit Geländer
  if (h.balcony) {
    bx(W * 0.6, 0.14, 0.9, 0, H * 0.7, D + 0.45, litTop(GASSE.wood));
    for (let k = 0; k <= 6; k++) bx(0.05, 0.6, 0.05, -W * 0.3 + (k / 6) * W * 0.6, H * 0.7 + 0.14, D + 0.86, litTop(0xf0f0ff), { r: 0 });
    bx(W * 0.6, 0.06, 0.06, 0, H * 0.7 + 0.74, D + 0.86, litTop(0xf0f0ff), { r: 0 });
  }
}

/**
 * Straßenlaterne (Gaslaterne mit blauweißem Licht, Laternenlicht des Themas): list [[x, y, z, höhe?], …].
 * Kollision: schlanker Pfosten.
 */
export function streetLamps(level, list) {
  const b = new Bld(), g = new Bld();
  for (const [x, y, z, hh = 3] of list) {
    level.world.add({ type: 'cyl', x, z, r: 0.12, y0: y, y1: y + hh, tag: 'laterne' });
    b.cyl(0.2, 0.26, 0.3, x, y, z, litTop(0x2a2a40), 8);
    b.cyl(0.07, 0.09, hh - 0.3, x, y + 0.3, z, litTop(0x3a3a58), 6);
    b.cyl(0.26, 0.18, 0.12, x, y + hh - 0.1, z, litTop(0x2a2a40), 6);
    g.cyl(0.18, 0.13, 0.42, x, y + hh + 0.02, z, 0xd8f6ff, 6);
    b.cone(0.3, 0.3, x, y + hh + 0.44, z, litTop(0x2a2a40), 6);
    level.view?.addLantern(x, y + hh + 0.2, z);
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, list.map(([x, y, z, hh = 3]) => [x, y + hh + 0.22, z]), { color: 0x9ae4ff, size: 2.4, opacity: 0.55, pulse: 0.35 });
}

/** Pilzlampen (große, leuchtende Hutpilze): list [[x, y, z, größe?, farbe?], …] – ohne Kollision. */
export function mushroomLamps(level, list) {
  const b = new Bld(), g = new Bld();
  const pts = [];
  for (const [x, y, z, s = 1, c = 0x6ad0ff] of list) {
    b.cyl(0.09 * s, 0.13 * s, 0.7 * s, x, y, z, litTop(0xe8e0f8), 6);
    g.sphere(0.36 * s, x, y + 0.72 * s, z, c, { s: [1, 0.45, 1], ws: 10, hs: 5 });
    for (let k = 0; k < 3; k++) g.sphere(0.06 * s, x + Math.cos(k * 2.1) * 0.2 * s, y + 0.86 * s, z + Math.sin(k * 2.1) * 0.2 * s, 0xffffff, { ws: 5, hs: 3 });
    pts.push([x, y + 0.75 * s, z]);
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, pts, { color: 0x7ad0ff, size: 1.6, opacity: 0.45, pulse: 0.25 });
}

/** Tropfsteine (hängend, Spitze nach unten) an der Höhlendecke: list [[x, yTop, z, länge, r?], …]; Spitzen glimmen. */
export function stalactites(level, list) {
  const b = new Bld(), g = new Bld();
  for (const [x, y, z, len, r = len * 0.18] of list) {
    b.cone(r, len, x, y - len, z, gradY(0x2a2640, 0x5a5680, y - len, y), 7, { rx: Math.PI });
    g.sphere(r * 0.22, x, y - len + 0.05, z, 0x7ad8ff, { ws: 5, hs: 3 });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Wäscheleine zwischen a und b (je [x, y, z]) mit bunten Wäschestücken (Hemd, Socke, Hose, Lätzchen), die im
 * Höhlenwind schaukeln – ein Mesh, keine Kollision.
 */
export function laundry(level, a, bpt, o = {}) {
  if (!level.view) return;
  const bl = new Bld();
  const n = o.n ?? 6, sag = o.sag ?? 0.5;
  const dx = bpt[0] - a[0], dz = bpt[2] - a[2], len = Math.hypot(dx, dz), yaw = -Math.atan2(dz, dx);
  const at = (t) => [a[0] + dx * t, a[1] + (bpt[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + dz * t];
  // Leine in Stücken
  for (let k = 0; k < 10; k++) {
    const p = at((k + 0.5) / 10), q0 = at(k / 10), q1 = at((k + 1) / 10);
    const l = Math.hypot(q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]);
    bl.box(l, 0.025, 0.025, p[0], p[1] - 0.012, p[2], 0xf0f0ff, { yaw, rz: Math.atan2(q1[1] - q0[1], len / 10), r: 0 });
  }
  const cols = [0xff6a8a, 0x6ac8ff, 0xffd24a, 0x8aff9a, 0xc88aff, 0xffffff];
  for (let k = 0; k < n; k++) {
    const t = (k + 0.7) / (n + 0.4), p = at(t);
    const c = cols[k % cols.length], kind = k % 4;
    if (kind === 0) { bl.box(0.55, 0.5, 0.04, p[0], p[1] - 0.52, p[2], c, { yaw, r: 0.02 }); bl.box(0.85, 0.16, 0.04, p[0], p[1] - 0.18, p[2], c, { yaw, r: 0.02 }); }
    else if (kind === 1) { bl.box(0.16, 0.42, 0.04, p[0], p[1] - 0.44, p[2], c, { yaw, r: 0.02 }); }
    else if (kind === 2) { bl.box(0.22, 0.6, 0.04, p[0] - Math.cos(yaw) * 0.14, p[1] - 0.62, p[2] + Math.sin(yaw) * 0.14, c, { yaw, r: 0.02 }); bl.box(0.22, 0.6, 0.04, p[0] + Math.cos(yaw) * 0.14, p[1] - 0.62, p[2] - Math.sin(yaw) * 0.14, c, { yaw, r: 0.02 }); bl.box(0.55, 0.14, 0.05, p[0], p[1] - 0.16, p[2], c, { yaw, r: 0.02 }); }
    else { bl.box(0.4, 0.4, 0.04, p[0], p[1] - 0.42, p[2], c, { yaw, r: 0.05 }); }
    bl.box(0.05, 0.1, 0.06, p[0], p[1] - 0.06, p[2], 0xd8b07a, { yaw, r: 0 });
  }
  const g = bl.geometry();
  // Drehpunkt auf die Leine legen (Schaukeln um die Leinen-Achse)
  const mid = at(0.5);
  g.translate(-mid[0], -mid[1], -mid[2]);
  const mesh = new THREE.Mesh(g, level.view.mats.world);
  mesh.position.set(mid[0], mid[1], mid[2]);
  const axis = new THREE.Vector3(dx, 0, dz).normalize();
  const holder = {};
  let t = o.phase ?? 0;
  addObject(level, mesh, (dt) => { t += visDt(level, holder, dt); mesh.quaternion.setFromAxisAngle(axis, Math.sin(t * 1.3) * 0.12 + Math.sin(t * 2.9) * 0.04); });
}

/**
 * Fledermäuse, die in Kreisen unter der Höhlendecke flattern (eine Instanz-Gruppe je Körperteil, ohne Schatten).
 * o: { spots: [[cx, y, cz, r], …], n je Kreis (2) }.
 */
export function bats(level, o) {
  if (!level.view) return;
  const spots = o.spots ?? [];
  const per = o.n ?? 2;
  const N = spots.length * per;
  if (!N) return;
  const body = new Build();
  body.sphere(0.16, 0x4a3a6a, { s: [1.3, 1, 1] }, 8, 6);
  body.sphere(0.11, 0x5a4a7a, { p: [0.17, 0.05, 0] }, 7, 5);
  body.cone(0.04, 0.1, 0x5a4a7a, { p: [0.2, 0.16, 0.05] }, 4);
  body.cone(0.04, 0.1, 0x5a4a7a, { p: [0.2, 0.16, -0.05] }, 4);
  body.sphere(0.025, 0xffe84a, { p: [0.26, 0.08, 0.045] }, 5, 3);
  body.sphere(0.025, 0xffe84a, { p: [0.26, 0.08, -0.045] }, 5, 3);
  const wing = new Build();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.12, 0.42); shape.lineTo(-0.05, 0.36); shape.lineTo(-0.12, 0.5); shape.lineTo(-0.22, 0.3); shape.lineTo(-0.2, 0);
  wing.add(new THREE.ShapeGeometry(shape), 0x3a2a5a, { r: [-Math.PI / 2, 0, 0] });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  const mk = (geo) => { const m = new THREE.InstancedMesh(geo, mat, N); m.frustumCulled = false; m.castShadow = false; return m; };
  const mb = mk(body.geometry());
  const mw = new THREE.InstancedMesh(wing.geometry(), mat, N * 2);
  mw.frustumCulled = false; mw.castShadow = false;
  const ml = { setMatrixAt: (i, m) => mw.setMatrixAt(i * 2, m) }, mr = { setMatrixAt: (i, m) => mw.setMatrixAt(i * 2 + 1, m) };
  const grp = new THREE.Group();
  grp.add(mb, mw);
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), T = new THREE.Matrix4(), O = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const holder = {};
  let t = 0;
  addObject(level, grp, (dt) => {
    t += visDt(level, holder, dt);
    let i = 0;
    for (const [cx, cy, cz, r] of spots) {
      for (let k = 0; k < per; k++, i++) {
        const sp = 0.8 + 0.25 * k, a = t * sp + k * Math.PI + cx;
        const x = cx + Math.cos(a) * r, z = cz - Math.sin(a) * r, y = cy + Math.sin(t * 2.3 + i) * 0.4;
        const yaw = a + Math.PI / 2;
        v.set(x, y, z);
        q.setFromEuler(e.set(0, yaw, Math.sin(t * 3 + i) * 0.15));
        M.compose(v, q, s);
        mb.setMatrixAt(i, M);
        const flap = Math.sin(t * 14 + i * 1.7) * 0.9;
        // rechter Flügel (−Z, Spitze hebt sich mit +flap), linker gespiegelt (Drehung um π)
        W.makeRotationX(flap); T.makeTranslation(0, 0.02, -0.08); O.copy(M).multiply(T).multiply(W); mr.setMatrixAt(i, O);
        W.makeRotationX(Math.PI - flap); T.makeTranslation(0, 0.02, 0.08); O.copy(M).multiply(T).multiply(W); ml.setMatrixAt(i, O);
      }
    }
    mb.instanceMatrix.needsUpdate = true; mw.instanceMatrix.needsUpdate = true;
  });
}

/** Textur mit senkrechten Schlieren (für fließende Lava-/Wasserfälle), gekachelt. */
function streakTex(c0, c1, c2) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 64, 128);
  const rnd = new Rnd(7);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = rnd.frac() < 0.5 ? c0 : c2;
    g.globalAlpha = 0.35 + rnd.frac() * 0.5;
    const x = rnd.real(0, 64), w = rnd.real(2, 7), y = rnd.real(0, 128), h = rnd.real(20, 70);
    g.fillRect(x, y, w, h); g.fillRect(x, y - 128, w, h);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Blauer Lavafall an einer Felswand (nur Kulisse, nicht tödlich – er fällt in die Lava außerhalb der Wege): Vorhang mit
 * laufenden Schlieren, Glutschein unten. list: [{ pos: [x, yUnten, z], width, height, face: '+z' | '+x' | '-x' }].
 */
export function blueFalls(level, list) {
  if (!level.view) return;
  const tex = streakTex('#d8f8ff', '#3ab4ff', '#1a4ad8');
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, side: THREE.DoubleSide, fog: false });
  const grp = new THREE.Group();
  const glow = [];
  for (const f of list) {
    const [x, y, z] = f.pos, W = f.width ?? 2, H = f.height ?? 8;
    const geo = new THREE.PlaneGeometry(W, H, 1, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const v = (pos.getY(i) + H / 2) / H; pos.setZ(i, Math.sin(v * Math.PI) * 0.15 + (v > 0.95 ? 0.4 : 0)); }
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 2, uv.getY(i) * H / 4);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y + H / 2, z);
    m.rotation.y = f.face === '+x' ? Math.PI / 2 : f.face === '-x' ? -Math.PI / 2 : 0;
    m.renderOrder = 2;
    grp.add(m);
    glow.push([x, y + 0.4, z, 1], [x, y + H * 0.5, z, 1]);
  }
  const holder = {};
  addObject(level, grp, (dt) => { tex.offset.y += visDt(level, holder, dt) * 0.55; });
  glowPoints(level, glow, { color: 0x3ab4ff, size: 4, opacity: 0.5, pulse: 0.6 });
}

/**
 * Marktstand mit gestreifter Markise und Auslage (Kristallobst, Pilze, Brote): pos = Mitte vorn unten, yaw (0 = Auslage
 * zur Kamera), colors [a, b]. Kollision: Theke.
 */
export function marketStalls(level, list) {
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos, yaw = s.yaw ?? 0, w = s.w ?? 2.4;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (u, v, n) => [x + c * u + sn * n, y + v, z - sn * u + c * n];
    const [ca, cb] = s.colors ?? [0xff6a8a, 0xffffff];
    const tb = (ww, hh, dd, u, v, n, col, o = {}) => { const [px, py, pz] = P(u, v, n); b.box(ww, hh, dd, px, py, pz, col, { yaw, r: o.r ?? 0.03 }); };
    // Theke
    tb(w, 0.9, 0.8, 0, 0, -0.4, litTop(GASSE.wood, 0.7));
    tb(w + 0.1, 0.08, 0.9, 0, 0.9, -0.4, litTop(0xc8946a));
    // Pfosten und Markise (Streifen)
    for (const u of [-w / 2 + 0.05, w / 2 - 0.05]) for (const n of [-0.05, -0.8]) tb(0.08, 2.3, 0.08, u, 0, n, litTop(GASSE.woodDark), { r: 0 });
    const ns = 6;
    for (let k = 0; k < ns; k++) {
      const u = -w / 2 + (k + 0.5) * (w / ns);
      const [px, py, pz] = P(u, 2.3, -0.3);
      b.box(w / ns + 0.01, 0.06, 1.3, px, py, pz, k % 2 ? ca : cb, { yaw, rx: 0.32 * c, rz: -0.32 * sn, r: 0 });
      const [qx, qy, qz] = P(u, 1.98, 0.3);
      b.box(w / ns + 0.01, 0.3, 0.04, qx, qy, qz, k % 2 ? ca : cb, { yaw, r: 0 });
    }
    // Auslage: leuchtende Kristallfrüchte und Pilze
    for (let k = 0; k < 7; k++) {
      const u = -w / 2 + 0.3 + k * ((w - 0.6) / 6);
      const [px, py, pz] = P(u, 1.02, -0.3 + (k % 2) * 0.2);
      if (k % 3 === 0) g.sphere(0.12, px, py + 0.05, pz, [0x7ad8ff, 0xff8ad8, 0xfff06a][k % 3], { ws: 6, hs: 4 });
      else if (k % 3 === 1) { b.cyl(0.04, 0.05, 0.12, px, py, pz, 0xf0e8ff, 5); b.sphere(0.12, px, py + 0.14, pz, 0xff5a7a, { s: [1, 0.5, 1], ws: 7, hs: 4 }); }
      else b.sphere(0.13, px, py + 0.06, pz, 0xe8a85a, { s: [1.4, 0.7, 0.9], ws: 7, hs: 4 });
    }
    // Kollision Theke
    const [ax, , az] = P(0, 0, -0.4);
    const hx = Math.abs(c) * w / 2 + Math.abs(sn) * 0.4, hz = Math.abs(sn) * w / 2 + Math.abs(c) * 0.4;
    level.world.add({ type: 'box', min: [ax - hx, y, az - hz], max: [ax + hx, y + 0.98, az + hz], tag: 'marktstand' });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Blauglut-Brunnen: runder Brunnen (Rand begehbar, Kollision Zylinder), in der Mitte eine Säule, aus der blaue Glut
 * in Bögen sprüht (Punkte-Fontäne, 1 Zeichenaufruf). pos = Fußpunkt der Mitte.
 */
export function glowFountain(level, pos, o = {}) {
  const [x, y, z] = pos, R = o.r ?? 1.5;
  level.world.add({ type: 'cyl', x, z, r: R, y0: y, y1: y + 0.6, tag: 'brunnen' });
  level.world.add({ type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 1.6, tag: 'brunnensaeule' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  b.cyl(R, R + 0.1, 0.6, x, y, z, litTop(0x8a86b0), 18);
  g.cyl(R - 0.25, R - 0.25, 0.05, x, y + 0.5, z, gradY(0x1a4ad8, 0x3ab4ff, y, y + 0.6), 18);
  b.torus(R - 0.05, 0.12, x, y + 0.6, z, litTop(0xb0b8e0), { rx: Math.PI / 2, ts: 20 });
  b.cyl(0.22, 0.3, 1.4, x, y + 0.2, z, litTop(0x6a6496), 8);
  b.cyl(0.5, 0.4, 0.15, x, y + 1.45, z, litTop(0xb0b8e0), 10);
  g.sphere(0.18, x, y + 1.65, z, 0xd8f6ff, { ws: 8, hs: 5 });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  // Fontäne: N Glutfunken in Bögen (bewegte Punkte im Leuchtfeld)
  const N = 48;
  const seeds = Array.from({ length: N }, (_, i) => ({ a: (i / N) * TAU * 3.1, t0: (i / N), sp: 0.9 + ((i * 37) % 10) / 25 }));
  let t = 0;
  const dyn = glowField(level).alloc(N, { color: 0x8ae0ff, size: 0.26, opacity: 1 }, (dt) => {
    t += Math.min(dt, 0.1);
    for (let i = 0; i < N; i++) {
      const s0 = seeds[i];
      const u = ((t * 0.7 * s0.sp + s0.t0) % 1);
      const r = u * (R - 0.4), hh = 1.7 + u * 1.6 - u * u * 2.6;
      dyn.set(i, x + Math.cos(s0.a) * r, y + hh, z + Math.sin(s0.a) * r);
    }
  });
  glowPoints(level, [[x, y + 0.8, z]], { color: 0x3ab4ff, size: 4.2, opacity: 0.4, pulse: 0.5 });
}

/**
 * Pflaster aus unregelmäßigen Steinen auf einer Fläche x0..x1 × zA..zB in Höhe y (knapp über der Inseloberseite).
 * o: { cell 0.55, colors [a, b, c], gapRandom, avoid: [[x0, x1, z0, z1], …] (frei lassen) }.
 */
export function paving(level, x0, x1, zA, zB, y, o = {}) {
  if (!level.view) return;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const cell = o.cell ?? 0.6;
  const cols = (o.colors ?? [0x8c8ab8, 0x7e7aa8, 0x9a98c4]).map((c) => new THREE.Color(c));
  const rnd = new Rnd(Math.floor(x0 * 11 + z0 * 5) >>> 0);
  const b = new Bld();
  const avoid = o.avoid ?? [];
  for (let z = z1 + cell / 2, row = 0; z < z0; z += cell, row++) {
    const off = (row % 2) * cell * 0.5;
    for (let x = x0 + cell / 2 - off; x < x1; x += cell) {
      const cx = Math.max(x0 + 0.1, Math.min(x1 - 0.1, x + rnd.real(-0.05, 0.05)));
      if (avoid.some((a) => cx > a[0] && cx < a[1] && z < Math.max(a[2], a[3]) && z > Math.min(a[2], a[3]))) continue;
      const w = Math.min(cell * 0.86, (x1 - x0)), d = cell * 0.84;
      const c = cols[rnd.int(0, cols.length - 1)].clone().multiplyScalar(0.92 + rnd.frac() * 0.16);
      b.box(w * rnd.real(0.86, 1), 0.05, d * rnd.real(0.86, 1), cx, y, z, c, { r: 0, yaw: rnd.real(-0.06, 0.06) });
    }
  }
  b.flush(level, { castShadow: false });
}

/** Aufsteigende Glutfunken über der Lava (Punkte, 1 Zeichenaufruf): Bereich x0..x1 × z0..z1, Höhe y. */
export function sparksUp(level, o) {
  if (!level.view) return;
  const N = o.n ?? 80;
  const rnd = new Rnd(o.seed ?? 3);
  const seeds = [];
  for (let i = 0; i < N; i++) seeds.push({ x: rnd.real(o.x0, o.x1), z: rnd.real(Math.min(o.z0, o.z1), Math.max(o.z0, o.z1)), t0: rnd.frac(), sp: rnd.real(0.6, 1.2), sw: rnd.real(0, TAU) });
  const H = o.h ?? 9;
  let t = 0;
  const dyn = glowField(level).alloc(N, { color: o.color ?? 0x8ae0ff, size: o.size ?? 0.2, opacity: 0.9 }, (dt) => {
    t += Math.min(dt, 0.1);
    for (let i = 0; i < N; i++) {
      const s0 = seeds[i];
      const u = (t * 0.12 * s0.sp + s0.t0) % 1;
      dyn.set(i, s0.x + Math.sin(t * 0.8 + s0.sw) * 0.4, o.y + u * H, s0.z + Math.cos(t * 0.7 + s0.sw) * 0.4);
    }
  });
}

/** Textur der blauen Lava: dunkle Krustenplatten, dazwischen glühende Adern (gekachelt, 256²). */
function lavaTex() {
  const N = 256, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  const img = g.createImageData(N, N);
  const rnd = new Rnd(11);
  const pts = Array.from({ length: 22 }, () => [rnd.frac() * N, rnd.frac() * N]);
  const hot = [214, 250, 255], mid = [58, 180, 255], cool = [26, 70, 214], crust = [18, 28, 96];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let d1 = 1e9, d2 = 1e9;
      for (const [px, py] of pts) {
        for (let ox = -N; ox <= N; ox += N) for (let oy = -N; oy <= N; oy += N) {
          const d = Math.hypot(x - px - ox, y - py - oy);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
      }
      const edge = d2 - d1;                // 0 an der Ader
      let c;
      if (edge < 3) c = hot.map((v, i) => v * (1 - edge / 3) + mid[i] * (edge / 3));
      else if (edge < 9) { const k = (edge - 3) / 6; c = mid.map((v, i) => v * (1 - k) + cool[i] * k); }
      else { const k = Math.min(1, (edge - 9) / 14); c = cool.map((v, i) => v * (1 - k) + crust[i] * k); }
      const o = (y * N + x) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Blaue Lava als ein großes See-Feld (tödlich wie der Baustein `lava`: Form kill 'lava', nicht fest): Krustenplatten mit
 * glühenden Adern, die langsam treiben, darüber ein zweites, gegenläufig treibendes Glühen (2 Zeichenaufrufe statt
 * Vertex-Animation). o: { x0, x1, z0, z1, y (Oberfläche), scale (m je Kachel, 7) }.
 */
export function blueLavaSea(level, o) {
  const z0 = Math.max(o.z0, o.z1), z1 = Math.min(o.z0, o.z1);
  level.world.add({ type: 'box', min: [o.x0, o.y - 4, z1], max: [o.x1, o.y - 0.12, z0], kill: 'lava', solid: false, camIgnore: true, tag: 'lava', lavaColor: 'blau' });
  if (!level.view) return;
  const W = o.x1 - o.x0, D = z0 - z1, S = o.scale ?? 7;
  const tex = lavaTex();
  const tex2 = tex.clone();
  tex2.needsUpdate = true;
  tex.repeat.set(W / S, D / S);
  tex2.repeat.set(W / (S * 1.7), D / (S * 1.7));
  const g = new THREE.PlaneGeometry(W, D);
  g.rotateX(-Math.PI / 2);
  const m1 = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, fog: true }));
  m1.position.set((o.x0 + o.x1) / 2, o.y - 0.02, (z0 + z1) / 2);
  const m2 = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex2, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m2.position.set((o.x0 + o.x1) / 2, o.y + 0.02, (z0 + z1) / 2);
  m2.renderOrder = 1;
  const grp = new THREE.Group();
  grp.add(m1, m2);
  const holder = {};
  let t = 0;
  addObject(level, grp, (dt) => {
    t += visDt(level, holder, dt);
    tex.offset.set(t * 0.012, t * 0.02);
    tex2.offset.set(-t * 0.018, t * 0.01);
    m2.material.opacity = 0.3 + 0.08 * Math.sin(t * 1.3);
  });
}

/**
 * Lichterkette von a nach b (je [x, y, z]) mit n bunten, leuchtenden Birnchen (statisch, Glüh-Material) und weichem
 * Schein (Punkte). o: { sag 0.6, colors }.
 */
export function fairyLights(level, list, o = {}) {
  if (!level.view) return;
  const wire = new Bld(), bulbs = new Bld();
  const halo = [];
  const cols = o.colors ?? [0xff5a8a, 0xffd24a, 0x6ad8ff, 0x8aff7a, 0xc88aff, 0xff9a4a];
  let ci = 0;
  for (const [a, b, n = 10, sag = o.sag ?? 0.6] of list) {
    const dx = b[0] - a[0], dz = b[2] - a[2], yaw = -Math.atan2(dz, dx), h = Math.hypot(dx, dz);
    const at = (t) => [a[0] + dx * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + dz * t];
    const seg = 12;
    for (let k = 0; k < seg; k++) {
      const p0 = at(k / seg), p1 = at((k + 1) / seg);
      const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      wire.box(l, 0.02, 0.02, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - 0.01, (p0[2] + p1[2]) / 2, 0x2a2a3a, { yaw, rz: Math.atan2(p1[1] - p0[1], h / seg), r: 0 });
    }
    for (let k = 1; k < n; k++) {
      const p = at(k / n), c = cols[ci++ % cols.length];
      bulbs.sphere(0.08, p[0], p[1] - 0.1, p[2], c, { s: [1, 1.3, 1], ws: 6, hs: 4 });
      halo.push([p[0], p[1] - 0.1, p[2]]);
    }
  }
  wire.flush(level, { castShadow: false });
  bulbs.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, halo, { color: 0xfff0d0, size: 0.75, opacity: 0.45, pulse: 0.4 });
}

/**
 * Brüstung (niedrige Steinmauer mit Abdeckplatte und kleinen Laternchen): Quader x0..x1 × zA..zB, Höhe h über y.
 * Kollision fest. Am Lift bildet sie mit der Wand dahinter eine Ecke, in der sich alle Figuren sammeln.
 */
export function parapet(level, x0, x1, zA, zB, y, h = 1, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  level.world.add({ type: 'box', min: [x0, y, z1], max: [x1, y + h, z0], tag: o.tag ?? 'bruestung' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  b.box(x1 - x0, h - 0.12, z0 - z1, (x0 + x1) / 2, y, (z0 + z1) / 2, litTop(o.color ?? 0x6a6496), { r: 0.05 });
  b.box(x1 - x0 + 0.12, 0.12, z0 - z1 + 0.12, (x0 + x1) / 2, y + h - 0.12, (z0 + z1) / 2, litTop(o.cap ?? 0xb0b8e0), { r: 0.04 });
  const n = Math.max(1, Math.round(Math.max(x1 - x0, z0 - z1) / 2.2));
  for (let k = 0; k <= n; k++) {
    const t = k / n, cx = x0 + (x1 - x0) * (x1 - x0 > z0 - z1 ? t : 0.5), cz = z0 + (z1 - z0) * (x1 - x0 > z0 - z1 ? 0.5 : t);
    g.sphere(0.09, cx, y + h + 0.1, cz, o.lamp ?? 0x9ae4ff, { ws: 6, hs: 4 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Seitenwand eines Liftschachts (Steinpfosten, eisernes Gitter mit Rauten, Lämpchen oben): Quader x0..x1 × zA..zB von y0
 * bis y1, fest (camIgnore – die Kamera schaut durch das Gitter). Hält die Figuren auf dem fahrenden Lift.
 */
export function liftShaft(level, x0, x1, zA, zB, y0, y1, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  level.world.add({ type: 'box', min: [x0, y0, z1], max: [x1, y1, z0], camIgnore: true, noWallSlide: true, tag: o.tag ?? 'liftschacht' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const alongZ = z0 - z1 >= x1 - x0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = alongZ ? z0 - z1 : x1 - x0, th = alongZ ? x1 - x0 : z0 - z1;
  const H = y1 - y0;
  const at = (u) => (alongZ ? [cx, z0 - u] : [x0 + u, cz]);
  // Pfosten an den Enden
  for (const u of [0.18, len - 0.18]) {
    const [px, pz] = at(u);
    b.box(0.42, H, 0.42, px, y0, pz, litTop(o.post ?? 0x6a6496), { r: 0.06 });
    b.box(0.56, 0.18, 0.56, px, y1 - 0.02, pz, litTop(0xb0b8e0), { r: 0.04 });
    g.sphere(0.13, px, y1 + 0.26, pz, o.lamp ?? 0x9ae4ff, { ws: 7, hs: 5 });
  }
  // Gitterstäbe senkrecht und waagerecht
  const bar = o.bar ?? 0x2e2a46;
  const nv = Math.max(2, Math.round(len / 0.5));
  for (let k = 1; k < nv; k++) {
    const [px, pz] = at((k / nv) * len);
    b.box(alongZ ? th * 0.4 : 0.06, H, alongZ ? 0.06 : th * 0.4, px, y0, pz, bar, { r: 0 });
  }
  for (let h = 0.4; h < H; h += 1.1) {
    const [px, pz] = at(len / 2);
    b.box(alongZ ? th * 0.5 : len, 0.08, alongZ ? len : th * 0.5, px, y0 + h, pz, litTop(0x8a86b0), { r: 0 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Spitzdach (vierseitige Pyramide mit Schindelreihen, Spitze mit goldener Kugel und Wimpel) über x0..x1 × zA..zB ab Höhe
 * y. o: { h (Dachhöhe, 2,8), color, flag }.
 */
export function pyramidRoof(level, x0, x1, zA, zB, y, o = {}) {
  if (!level.view) return;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0 + 0.5, d = z0 - z1 + 0.5, H = o.h ?? 2.8;
  const b = new Bld(), g = new Bld();
  const col = o.color ?? 0x7a4aff;
  // Pyramide aus 4 Seiten (Kegel mit 4 Segmenten, um 45° gedreht und auf w × d gestreckt)
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 4);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, H, d);
  b.add(geo, (x, yy, z, nx, ny, nz) => {
    const band = Math.floor((yy + H / 2) / 0.45) % 2;
    return new THREE.Color(col).multiplyScalar(band ? 0.82 : 1.05);
  }, { p: [cx, y + H / 2, cz] });
  b.box(w + 0.1, 0.22, d + 0.1, cx, y - 0.12, cz, litTop(0xb0b8e0), { r: 0.04 });
  g.sphere(0.22, cx, y + H + 0.18, cz, 0xffd24a, { ws: 8, hs: 6 });
  b.cyl(0.04, 0.04, 1.4, cx, y + H + 0.3, cz, 0x5a4a3a, 5);
  if (o.flag !== false) {
    const fl = new THREE.Shape();
    fl.moveTo(0, 0); fl.lineTo(0.9, -0.22); fl.lineTo(0, -0.5);
    b.add(new THREE.ShapeGeometry(fl), o.flagColor ?? 0xff5a8a, { p: [cx + 0.04, y + H + 1.68, cz] });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Kleinkram für Plätze (statisch): Bänke ('bank'), Blumenkübel mit leuchtenden Blüten ('kuebel'), Kristallkarren
 * ('karren'), Wegweiser ('weiser'). list: [{ kind, pos: [x, y, z], yaw }].
 */
export function plazaProps(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const it of list) {
    const [x, y, z] = it.pos, yaw = it.yaw ?? 0, c = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (u, n) => [x + c * u + sn * n, z - sn * u + c * n];
    if (it.kind === 'bank') {
      for (const u of [-0.7, 0.7]) { const [px, pz] = P(u, 0); b.box(0.12, 0.42, 0.42, px, y, pz, litTop(0x3a3a58), { yaw, r: 0 }); }
      const [sx, sz] = P(0, 0); b.box(1.7, 0.08, 0.5, sx, y + 0.42, sz, litTop(GASSE.wood), { yaw, r: 0.02 });
      const [bx2, bz2] = P(0, -0.24); b.box(1.7, 0.42, 0.07, bx2, y + 0.56, bz2, litTop(GASSE.wood), { yaw, r: 0.02 });
    } else if (it.kind === 'kuebel') {
      b.cyl(0.36, 0.28, 0.5, x, y, z, litTop(it.color ?? 0x8a5aff), 10);
      b.sphere(0.34, x, y + 0.55, z, litTop(0x3a8a5a), { s: [1, 0.6, 1], ws: 8, hs: 5 });
      for (let k = 0; k < 5; k++) g.sphere(0.07, x + Math.cos(k * 1.26) * 0.22, y + 0.72, z + Math.sin(k * 1.26) * 0.22, GASSE.flower[k % 4], { ws: 5, hs: 3 });
    } else if (it.kind === 'karren') {
      const [cx2, cz2] = P(0, 0);
      b.box(1.5, 0.5, 0.9, cx2, y + 0.4, cz2, litTop(GASSE.wood, 0.7), { yaw, r: 0.04 });
      for (const u of [-0.5, 0.5]) for (const n of [-0.48, 0.48]) { const [wx, wz] = P(u, n); b.cyl(0.3, 0.3, 0.08, wx, y + 0.3, wz, litTop(0x3a3a58), 10, { rx: Math.abs(sn) > 0.5 ? 0 : Math.PI / 2, rz: Math.abs(sn) > 0.5 ? Math.PI / 2 : 0 }); }
      for (let k = 0; k < 6; k++) { const [kx, kz] = P(-0.5 + (k % 3) * 0.5, (k > 2 ? 0.2 : -0.2)); g.cone(0.12, 0.45 + (k % 2) * 0.2, kx, y + 0.9, kz, [0x7ad8ff, 0xff8ad8, 0xb08aff][k % 3], 5); }
    } else if (it.kind === 'weiser') {
      b.cyl(0.07, 0.08, 2.2, x, y, z, litTop(GASSE.woodDark), 6);
      for (const [k, a] of [[0, 0.4], [1, -0.9], [2, 2.2]]) {
        const [ax, az] = [x + Math.cos(a + yaw) * 0.45, z - Math.sin(a + yaw) * 0.45];
        b.box(0.95, 0.22, 0.05, ax, y + 1.4 + k * 0.3, az, litTop([0xf0dcb0, 0xb8e0ff, 0xffc8e0][k]), { yaw: a + yaw, r: 0.03 });
      }
    }
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Höhlenausgang hinter dem Ziel: runde Öffnung in der Felswand mit warmem Tageslicht (Glüh-Scheibe mit Strahlen),
 * Felsbogen ringsum. pos = Mitte unten in der Wandebene, face '+z'. o: { r (2,2) }.
 */
export function caveExit(level, pos, o = {}) {
  if (!level.view) return;
  const [x, y, z] = pos, R = o.r ?? 2.2;
  const b = new Bld(), g = new Bld();
  g.cyl(R, R, 0.06, x, y + R, z + 0.04, gradY(0xd88a3a, 0xffc86a, y, y + 2 * R), 24, { rx: Math.PI / 2 });
  g.cyl(R * 0.7, R * 0.7, 0.06, x, y + R, z + 0.06, gradY(0xffd88a, 0xfff0c0, y, y + 2 * R), 20, { rx: Math.PI / 2 });
  // Silhouette der Außenwelt: grüne Hügel unten in der Öffnung
  g.sphere(R * 0.55, x - R * 0.3, y + 0.1, z + 0.08, 0x5ac85a, { s: [1, 0.55, 0.05], ws: 12, hs: 6 });
  g.sphere(R * 0.45, x + R * 0.35, y + 0.05, z + 0.09, 0x48b048, { s: [1, 0.6, 0.05], ws: 12, hs: 6 });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI, rr = R + 0.25;
    b.box(0.7, 0.55, 0.6, x + Math.cos(a) * rr, y + R + Math.sin(a) * rr - 0.27, z + 0.3, litTop(k % 2 ? 0x8a86b0 : 0x6a6496), { rz: a - Math.PI / 2, r: 0.08 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, [[x, y + R, z + 0.6, 1]], { color: 0xffd090, size: R * 2.6, opacity: 0.35, pulse: 0.2 });
}

/**
 * Bogenfenster an einer Wandfläche (flach, ohne Kollision): Rahmen, leuchtende Scheibe mit Sprossen, Fensterbank.
 * list: [{ at: Mitte unten [x, y, z], face: '+x' | '-x' | '+z', w: 0.8, h: 1.1, lit: true, color }].
 */
export function wallWindows(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const wdw of list) {
    const F = FACES[wdw.face ?? '+z'];
    const [cx, cy, cz] = wdw.at, W = wdw.w ?? 0.8, H = wdw.h ?? 1.1;
    const P = (u, v, n) => [cx + F.ux * u + F.nx * n, cy + v, cz + F.uz * u + F.nz * n];
    const bx = (wu, hv, dn, u, v, n, c, glow) => { const [x, y, z] = P(u, v, n); (glow ? g : b).box(F.nx ? dn : wu, hv, F.nx ? wu : dn, x, y, z, c, { r: 0 }); };
    const pane = wdw.lit === false ? 0x2a2a4a : (wdw.color ?? GASSE.window);
    bx(W, H, 0.04, 0, 0, 0.02, pane, wdw.lit !== false);
    const [ax, ay, az] = P(0, H, 0.03);
    (wdw.lit === false ? b : g).cyl(W / 2, W / 2, 0.04, ax, ay - 0.02, az, pane, 12, { rx: F.nx ? 0 : Math.PI / 2, rz: F.nx ? Math.PI / 2 : 0 });
    bx(W + 0.16, 0.1, 0.16, 0, -0.08, 0.08, litTop(0xe8e8ff));
    bx(0.08, H, 0.08, -W / 2 - 0.04, 0, 0.05, litTop(0xe8e8ff));
    bx(0.08, H, 0.08, W / 2 + 0.04, 0, 0.05, litTop(0xe8e8ff));
    bx(0.05, H + W / 2 - 0.05, 0.06, 0, 0, 0.06, litTop(0xe8e8ff));
    bx(W, 0.05, 0.06, 0, H * 0.55, 0.06, litTop(0xe8e8ff));
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// 5-A Hörnerherde am Lila Strand
// =====================================================================================================================

/**
 * Runde Strandinsel mit lila Sand (Wellenrand, nasser Saum, Schaumring) im Meer, das bis zum Horizont reicht (Verlauf
 * Türkis → Violett, Glitzern). Kollision: Zylinder der Insel (nur Kulisse – die Figur bleibt im Käfig). o: { r 30,
 * y (Sandhöhe) 0, sea (Meeresspiegel) -0.35, seaR 200 }.
 */
export function lilacBeach(level, o = {}) {
  const R = o.r ?? 30, y = o.y ?? 0, sea = o.sea ?? -0.35, cx = o.x ?? 0, cz = o.z ?? 0;
  level.world.add({ type: 'cyl', x: cx, z: cz, r: R, y0: y - 3, y1: y, tag: 'strand' });
  if (!level.view) return;
  const rim = (a) => R * (1 + 0.035 * Math.sin(a * 5 + 1.3) + 0.025 * Math.sin(a * 11 + 0.4));
  const sandHi = new THREE.Color(0xf6dcf2), sand = new THREE.Color(0xe8c4e6), wet = new THREE.Color(0xb88ac8), c = new THREE.Color();
  // Sandfläche als Fächer aus Ringen (Rand wellig), leichte Dünenwellen
  const N = 72, RINGS = 8;
  const pos = [], col = [];
  const P = (k, j) => {
    const a = (k / N) * TAU, t = j / RINGS, r = rim(a) * t;
    const h = t < 0.86 ? 0.04 * Math.sin(a * 7 + t * 9) * t : -(t - 0.86) * 2.2;
    return [cx + Math.sin(a) * r, y + h, cz + Math.cos(a) * r, t];
  };
  const colAt = (t, a) => { c.copy(sand).lerp(sandHi, 0.5 + 0.5 * Math.sin(a * 9 + t * 13)); if (t > 0.86) c.lerp(wet, Math.min(1, (t - 0.86) / 0.1)); return c; };
  for (let j = 0; j < RINGS; j++) {
    for (let k = 0; k < N; k++) {
      const A = P(k, j), B = P(k + 1, j), C = P(k + 1, j + 1), D = P(k, j + 1);
      for (const q of [A, D, C, A, C, B]) { pos.push(q[0], q[1], q[2]); const cc = colAt(q[3], Math.atan2(q[0] - cx, q[2] - cz)); col.push(cc.r, cc.g, cc.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  addStatic(level, g, { castShadow: false });
  // Schaumring und Meer
  const foam = new THREE.RingGeometry(1, 1.06, N, 1);
  foam.rotateX(-Math.PI / 2);
  const fp = foam.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), z = fp.getZ(i), a = Math.atan2(x, z), r = Math.hypot(x, z);
    const rr = rim(a) * 0.985 * r;
    fp.setXYZ(i, Math.sin(a) * rr, 0, Math.cos(a) * rr);
  }
  const foamMesh = new THREE.Mesh(foam, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  foamMesh.position.set(cx, sea + 0.03, cz);
  const seaR = o.seaR ?? 220;
  const sg = new THREE.CircleGeometry(seaR, 64, 0, TAU);
  sg.rotateX(-Math.PI / 2);
  const sc = new Float32Array(sg.attributes.position.count * 3);
  const near = new THREE.Color(0x5ae0e0), mid = new THREE.Color(0x3a8ae8), far = new THREE.Color(0x8a6ad8);
  for (let i = 0; i < sg.attributes.position.count; i++) {
    const r = Math.hypot(sg.attributes.position.getX(i), sg.attributes.position.getZ(i));
    const t = Math.min(1, Math.max(0, (r - R) / 60));
    c.copy(near).lerp(mid, Math.min(1, t * 1.6)); if (t > 0.6) c.lerp(far, (t - 0.6) / 0.4);
    sc[i * 3] = c.r; sc[i * 3 + 1] = c.g; sc[i * 3 + 2] = c.b;
  }
  sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const seaMesh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true }));
  seaMesh.position.set(cx, sea, cz);
  const grp = new THREE.Group();
  grp.add(seaMesh, foamMesh);
  const holder = {};
  let t = 0;
  addObject(level, grp, (dt) => { t += visDt(level, holder, dt); const k = 1 + Math.sin(t * 1.1) * 0.012; foamMesh.scale.set(k, 1, k); foamMesh.material.opacity = 0.65 + 0.25 * Math.sin(t * 1.1); });
  // Glitzern auf dem Meer
  const rnd = new Rnd(31);
  const pts = [];
  for (let i = 0; i < 40; i++) { const a = rnd.real(0, TAU), r = rnd.real(R + 4, R + 50); pts.push([cx + Math.sin(a) * r, sea + 0.05, cz + Math.cos(a) * r, rnd.real(0.6, 1.2)]); }
  glowPoints(level, pts, { color: 0xffffff, size: 0.9, opacity: 0.55, pulse: 1.3 });
}

/** Rettungsschwimmer-Turm (Holzgestell, rot-weiße Hütte, Rettungsring, Fahne) – Fußpunkt pos, Blick yaw. */
export function lifeguardTower(level, pos, yaw = 0) {
  if (!level.view) return;
  const [x, y, z] = pos, b = new Bld(), c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, n) => [x + c * u + s * n, z - s * u + c * n];
  for (const u of [-0.8, 0.8]) for (const n of [-0.8, 0.8]) { const [px, pz] = P(u, n); b.box(0.16, 2.6, 0.16, px, y, pz, litTop(0xf0e0c0), { r: 0 }); }
  const [hx, hz] = P(0, 0);
  b.box(2.0, 0.14, 2.0, hx, y + 2.6, hz, litTop(0xc89a6a), { yaw, r: 0.02 });
  for (let k = 0; k < 4; k++) b.box(2.0, 0.3, 1.9, hx, y + 2.74 + k * 0.3, hz, k % 2 ? 0xffffff : 0xff4a4a, { yaw, r: 0.02 });
  b.box(2.4, 0.16, 2.3, hx, y + 3.95, hz, litTop(0xff4a4a), { yaw, r: 0.05 });
  const [rx, rz] = P(0, 1.0);
  b.torus(0.32, 0.09, rx, y + 3.2, rz, 0xff6a3a, { yaw, ts: 14 });
  b.cyl(0.03, 0.03, 1.4, hx, y + 4.1, hz, 0x6a5a4a, 5);
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(0.8, -0.2); fl.lineTo(0, -0.45);
  b.add(new THREE.ShapeGeometry(fl), 0xffd24a, { p: [hx, y + 5.45, hz], r: [0, yaw, 0] });
  for (let k = 0; k < 6; k++) { const [lx, lz] = P(0, 1.05); b.box(0.7, 0.06, 0.08, lx, y + 0.3 + k * 0.42, lz, litTop(0xf0e0c0), { yaw, r: 0 }); }
  b.flush(level);
}

/**
 * Sandstein-Felsen am Strand (Wartepodeste, oben flach auf Höhe top): gebänderter lila-rosa Fels mit Grasbüscheln und
 * Kieseln – list [[x, z, r], …], Sandhöhe y. Kollision: Zylinder (Figuren können hinaufspringen).
 */
export function sandRocks(level, list, y, top) {
  const b = new Bld(), rnd = new Rnd(57), h = top - y;
  const band = { v: (x, yy) => { const t = (yy - y) / h; const k = 0.5 + 0.5 * Math.sin(t * 15); return new THREE.Color(0xc9a0d8).lerp(new THREE.Color(0xf0c8de), k * 0.7).multiplyScalar(0.82 + 0.18 * t); } };
  for (const [x, z, r] of list) {
    level.world.add({ type: 'cyl', x, z, r: r * 0.92, y0: y - 1, y1: top, tag: 'fels' });
    b.cyl(r * 0.92, r * 1.12, h * 0.55, x, y, z, band, 11);
    b.cyl(r, r * 0.92, h * 0.45 - 0.12, x, y + h * 0.55, z, band, 11);
    b.cyl(r * 0.94, r, 0.12, x, top - 0.12, z, litTop(0xf6d6ec), 11);
    for (let k = 0; k < 6; k++) {
      const a = rnd.real(0, TAU), rr = r * rnd.real(0.75, 0.92);
      b.cone(0.16, rnd.real(0.35, 0.6), x + Math.sin(a) * rr, top - 0.05, z + Math.cos(a) * rr, 0x7ad070, 5);
    }
    for (let k = 0; k < 4; k++) { const a = rnd.real(0, TAU), rr = r * rnd.real(1.15, 1.6); b.sphere(rnd.real(0.18, 0.34), x + Math.sin(a) * rr, y + 0.08, z + Math.cos(a) * rr, litTop(0xd8b0e0), { s: [1, 0.6, 1], ws: 7, hs: 5 }); }
  }
  b.flush(level);
}

/** Segelboote auf dem Meer (schaukeln sacht) – list [[x, z, yaw, farbe], …], Meeresspiegel y. Ein Mesh je Boot. */
export function sailboats(level, list, y = -0.35) {
  if (!level.view) return;
  for (const [x, z, yaw, colr] of list) {
    const b = new Bld();
    b.box(2.6, 0.5, 0.9, 0, 0, 0, litTop(0xffffff), { r: 0.18 });
    b.box(2.2, 0.08, 0.7, 0, 0.5, 0, litTop(0xc89a6a), { r: 0 });
    b.cyl(0.05, 0.05, 3.2, 0, 0.5, 0, 0x8a6a4a, 5);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.4, 0); sh.lineTo(0, 2.6);
    b.add(new THREE.ShapeGeometry(sh), colr ?? 0xff6a8a, { p: [0.08, 0.9, 0] });
    const sh2 = new THREE.Shape(); sh2.moveTo(0, 0); sh2.lineTo(-1.0, 0); sh2.lineTo(0, 2.2);
    b.add(new THREE.ShapeGeometry(sh2), 0xffffff, { p: [-0.08, 0.9, 0] });
    const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    const holder = {};
    let t = x;
    addObject(level, mesh, (dt) => { t += visDt(level, holder, dt); mesh.rotation.z = Math.sin(t * 0.9) * 0.06; mesh.position.y = y + Math.sin(t * 1.3) * 0.06; });
  }
}

/** Möwen, die über dem Strand kreisen (Instanz-Gruppen, weiß-grau). o: { spots: [[cx, y, cz, r], …], n }. */
export function seagulls(level, o) {
  if (!level.view) return;
  const spots = o.spots ?? [], per = o.n ?? 2, N = spots.length * per;
  if (!N) return;
  const body = new Build();
  body.sphere(0.16, 0xffffff, { s: [1.6, 0.8, 0.8] }, 8, 6);
  body.sphere(0.1, 0xffffff, { p: [0.24, 0.06, 0] }, 7, 5);
  body.cone(0.035, 0.12, 0xffb02a, { p: [0.34, 0.05, 0], r: [0, 0, -Math.PI / 2] }, 5);
  body.sphere(0.02, 0x2a2a3a, { p: [0.29, 0.1, 0.06] }, 4, 3);
  body.sphere(0.02, 0x2a2a3a, { p: [0.29, 0.1, -0.06] }, 4, 3);
  const wing = new Build();
  const shape = new THREE.Shape();
  shape.moveTo(0.1, 0); shape.lineTo(0.0, 0.62); shape.lineTo(-0.18, 0.55); shape.lineTo(-0.14, 0);
  wing.add(new THREE.ShapeGeometry(shape), { v: (x, y) => (y > 0.45 ? new THREE.Color(0x4a4a5a) : new THREE.Color(0xdadae8)) }, { r: [-Math.PI / 2, 0, 0] });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  const mb = new THREE.InstancedMesh(body.geometry(), mat, N), mw = new THREE.InstancedMesh(wing.geometry(), mat, N * 2);
  for (const m of [mb, mw]) { m.frustumCulled = false; m.castShadow = false; }
  const grp = new THREE.Group(); grp.add(mb, mw);
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), T = new THREE.Matrix4(), O = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
  const holder = {};
  let t = 0;
  addObject(level, grp, (dt) => {
    t += visDt(level, holder, dt);
    let i = 0;
    for (const [cx, cy, cz, r] of spots) for (let k = 0; k < per; k++, i++) {
      const a = t * (0.35 + 0.08 * k) + k * 2.6 + cx * 0.1;
      v.set(cx + Math.cos(a) * r, cy + Math.sin(t * 0.7 + i) * 0.6, cz - Math.sin(a) * r);
      q.setFromEuler(e.set(0, a + Math.PI / 2, 0.25));
      M.compose(v, q, s1);
      mb.setMatrixAt(i, M);
      const flap = Math.sin(t * 5 + i * 1.3) * 0.55 + 0.15;
      W.makeRotationX(flap); T.makeTranslation(0, 0.04, -0.05); O.copy(M).multiply(T).multiply(W); mw.setMatrixAt(i * 2, O);
      W.makeRotationX(Math.PI - flap); T.makeTranslation(0, 0.04, 0.05); O.copy(M).multiply(T).multiply(W); mw.setMatrixAt(i * 2 + 1, O);
    }
    mb.instanceMatrix.needsUpdate = true; mw.instanceMatrix.needsUpdate = true;
  });
}

/**
 * Bullen-Wellen für die Arena (5-A): Bullen späterer Wellen warten draußen am Strand hinter dem Gitter (scharren, schauen
 * herein, ohne Berührung); ist die vorige Welle besiegt, springen sie nacheinander in hohem Bogen über das Gitter in die
 * Arena (Staub, Wackeln, Jubel) und kämpfen dann normal. Tod der Figur → Arena neu (der Archetyp erzeugt die Bullen
 * frisch), die Wartenden stehen wieder draußen. waves: [[ids …], …]; wait: { id: [x, y, z] } (Warteplatz; Landeplatz =
 * pos aus den Daten), o: { flight 1.15, stagger 0.5, arc 8, pause 1.2, banner(level, n), center [x, y, z], crowd }.
 * level.named('wellen') = Zustand { wave, landed, log }.
 */
export function bullWaves(level, waves, wait, o = {}) {
  const st = { wave: 0, timer: -1, jumping: [], log: [], landed: 0 };
  const ent = (id) => level.named.get(id);
  const ctr = o.center ?? [0, 0, 0];
  const park = (e, id) => {
    if (!e || e.parked) return;
    const w = wait[id];
    e.parked = { update: e.update, touch: e.touch, target: e.pos.clone() };
    e.pos.set(w[0], w[1], w[2]);
    e.vel?.set(0, 0, 0);
    e.yaw = Math.atan2(-(ctr[2] - w[2]), ctr[0] - w[0]);
    e.touch = false;
    let dustT = 0.3 + (w[0] % 1 + 1) % 1;
    e.update = (dt) => {
      e.stateT += dt;
      dustT -= dt;
      if (dustT <= 0) { dustT = 0.7; level.effects?.dust({ x: e.pos.x - Math.cos(e.yaw) * 0.5, y: e.pos.y, z: e.pos.z + Math.sin(e.yaw) * 0.5 }, 2, 0.5); }
    };
    e.modelState = () => ({ anim: 'idle', speed: 0, hp: e.hp });
  };
  const leap = (e) => {
    if (!e?.parked) return null;
    const from = e.pos.clone(), to = e.parked.target;
    const j = { e, from, to, top: Math.max(from.y, to.y) + (o.arc ?? 8), t: 0, T: o.flight ?? 1.15, delay: 0 };
    st.jumping.push(j);
    e.update = () => {};
    e.modelState = () => ({ anim: 'charge', speed: 6, hp: e.hp });
    return j;
  };
  const land = (e) => {
    const P = e.parked;
    delete e.update; if (e.update !== P.update) e.update = P.update;
    delete e.modelState;
    e.touch = P.touch ?? true;
    e.parked = null;
    e.vel?.set(0, 0, 0);
    e.wake = Math.max(e.wake ?? 0, 60);
    e.setState?.('idle');
    e.cool = 0.6;
    st.landed++;
    level.effects?.dust(e.pos, 12, 2.2);
    level.effects?.ring?.({ x: e.pos.x, y: e.pos.y + 0.05, z: e.pos.z }, 1.8);
    level.shake?.(0.35);
    level.sfx('groundpound');
    level.named.get(o.crowd ?? 'crowd')?.cheer?.(0.8, 1.5);
  };
  const reset = () => {
    st.wave = 0; st.timer = -1; st.jumping = [];
    for (let w = 1; w < waves.length; w++) for (const id of waves[w]) park(ent(id), id);
  };
  onRespawn(level, reset);
  reset();
  level.onStep((dt) => {
    for (const j of st.jumping.slice()) {
      if (j.delay > 0) { j.delay -= dt; if (j.delay <= 0) level.sfx('panic'); continue; }
      j.t += dt;
      const u = Math.min(1, j.t / j.T);
      const e = j.e;
      // Bogen: waagerecht gleichmäßig, senkrecht Parabel mit y(0) = from, y(0,5) = top, y(1) = to
      const y0 = j.from.y, y1 = j.to.y, h = j.top;
      const a = 2 * (y0 + y1 - 2 * h), b = 4 * h - 3 * y0 - y1;
      e.pos.set(j.from.x + (j.to.x - j.from.x) * u, a * u * u + b * u + y0, j.from.z + (j.to.z - j.from.z) * u);
      e.yaw = Math.atan2(-(j.to.z - j.from.z), j.to.x - j.from.x);
      if (u >= 1) { st.jumping.splice(st.jumping.indexOf(j), 1); land(e); }
    }
    if (st.wave + 1 >= waves.length) return;
    const cur = waves[st.wave].map(ent);
    const down = cur.every((e) => !e || e.defeated || e.removed || !e.alive);
    if (down && st.timer < 0) st.timer = o.pause ?? 1.2;
    if (st.timer >= 0) {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = -1;
        st.wave++;
        waves[st.wave].forEach((id, k) => { const j = leap(ent(id)); if (j) j.delay = k * (o.stagger ?? 0.5); });
        st.log.push({ wave: st.wave + 1, t: +level.time.toFixed(2) });
        o.banner?.(level, st.wave + 1);
      }
    }
  });
  level.named.set(o.id ?? 'wellen', st);
  return st;
}
