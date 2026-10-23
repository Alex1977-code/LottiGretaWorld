// Hilfen für die Welt-3-Level 3-A „Krötenzauber im Roten Zwinger“, 3-B „Manege frei für den Schlangenkönig“ und das
// Welt-3-Finale 3-Zug „Volldampf durchs Schneetal“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt
// dieses Modul). Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über den offiziellen
// Level-Haken `LEVEL.setup` (Präzisierung „Level-Haken“) und über `level.onStep` / `view.onFrame` an.
//
//   1) Grundlagen       levelSetupE (verschmilzt neue Zier in vorhandene Abschnitts-Meshes), Geometrie-Bausteine,
//                       Leinwand-Texturen (Brummbär-Wappen), wehende Fahnen (Instanzen), Glutfunken
//   2) Festung (3-A)    roter Käfigraum mit zwei Eckpodesten, Festungsmauern, Türme, Fahnen, Banner, Zauberkreis
//   3) Zirkus (3-B)     siehe unten
//   4) Zug (3-Zug)      siehe unten

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd, islandParts } from '../../blocks/kit.js';
import { bakeModel } from '../../blocks/w3kit.js';
import { pipeGeo } from '../../blocks/types/pipe.js';
import { Gimmick, runAction } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { ScrollWindow } from '../../archetypes/ScrollWindow.js';

// ====================================================================== 1) Grundlagen

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export { TAU, clamp, ease };

/**
 * Level-Haken mit Verschmelzen: `LEVEL.setup = levelSetupE(fn)`. Der Haken läuft nach view.finalize – neue statische
 * Teile (addStatic) fasst der Batcher zu eigenen Meshes je 32-m-Abschnitt zusammen; jedes davon wird an das vorhandene
 * Mesh gleichen Materials/Schattenwurfs im selben Abschnitt angehängt (spart Zeichenaufrufe). Danach wird der
 * Level-Umriss (bounds, killY) mit den neuen Formen neu berechnet. (Gleiches Vorgehen wie levels/w2/_helpers_c.js.)
 */
export function levelSetupE(fn) {
  return (level, scene) => {
    const sb = level.view?.static;
    const before = new Set(sb?.meshes ?? []);
    fn(level, scene);
    if (sb) {
      sb.build();
      const sec = (m) => { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); return Math.floor(-(g.boundingBox.min.z + g.boundingBox.max.z) / 2 / 32); };
      for (const m of sb.meshes.filter((x) => !before.has(x))) {
        let host = null;
        for (const h of before) {
          if (h.material === m.material && h.castShadow === m.castShadow && h.receiveShadow === m.receiveShadow && sec(h) === sec(m)) { host = h; break; }
        }
        if (!host) continue;
        const old = host.geometry;
        host.geometry = merge([old, m.geometry]);
        host.geometry.computeBoundingBox();
        m.parent?.remove(m);
        sb.meshes.splice(sb.meshes.indexOf(m), 1);
        sb.stats.meshes--;
      }
    }
    level.computeBounds();
  };
}

/** Lokale Entität anmelden (wie level.spawn, ohne Registry). */
export function spawnLocal(level, e) {
  level.entities.push(e);
  if (e.spec?.id) level.named.set(e.spec.id, e);
  if (e.shadow > 0 && level.view) level.view.shadows.add({ pos: e.pos, radius: e.shadow, alive: () => !e.removed, visible: () => e.alive && e.shadowVisible !== false });
  return e;
}

/** Alle Meshes eines Objekts gehören dem Level (die Ansicht gibt sie am Ende frei). */
export function owned(obj) { obj.traverse?.((o) => { if (o.isMesh || o.isInstancedMesh || o.isPoints || o.isSprite) o.userData.owned = true; }); return obj; }

// ------------------------------------------------------------------ Geometrie (Weltkoordinaten, Vertexfarben)

const L = (c) => lin(hex(c));
/** Licht von oben: Oberseite heller, Unterseite dunkler. */
export function litFn(c, k = 0.72, top = 1.12) {
  const M = L(c), T = [M[0] * top, M[1] * top, M[2] * top], D = [M[0] * k, M[1] * k, M[2] * k];
  return (p, n, o) => (n.y >= 0 ? mixc(M, T, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o));
}

/** Zylinder (Fuß bei y), seg Seiten; o: { fn, open, rx, rz, center }. */
export function cylG(rTop, rBot, h, x, y, z, color, seg = 12, o = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, o.rows ?? 1, !!o.open).toNonIndexed();
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(x, y + (o.center ? 0 : h / 2), z);
  return colorize(g, o.fn ?? litFn(color));
}

export function sphereG(r, x, y, z, color, o = {}) {
  const g = new THREE.SphereGeometry(r, o.ws ?? 10, o.hs ?? 7, 0, TAU, 0, o.half ? Math.PI / 2 : Math.PI).toNonIndexed();
  g.scale(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  if (o.ry) g.rotateY(o.ry);
  g.translate(x, y, z);
  return colorize(g, o.fn ?? litFn(color));
}

export function coneG(r, h, x, y, z, color, seg = 10, o = {}) {
  const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed();
  if (o.ry) g.rotateY(o.ry);
  g.translate(x, y + h / 2, z);
  return colorize(g, o.fn ?? litFn(color));
}

/** Quader mit Fuß bei y (ohne/leichte Rundung). */
export function blockG(w, h, d, x, y, z, color, o = {}) {
  const g = box(w, h, d, 0, h / 2, 0, color, { r: o.r ?? 0.04, seg: o.seg ?? 1, topColor: o.top });
  if (o.ry) g.rotateY(o.ry);
  g.translate(x, y, z);
  return g;
}

/** Ring (Torus) waagerecht um (x, y, z). */
export function ringG(R, r, x, y, z, color, seg = 24, o = {}) {
  const g = new THREE.TorusGeometry(R, r, o.tube ?? 6, seg, o.arc ?? TAU).toNonIndexed();
  g.rotateX(Math.PI / 2);
  if (o.ry) g.rotateY(o.ry);
  g.translate(x, y, z);
  return colorize(g, o.fn ?? litFn(color));
}

/** Flache Scheibe/Ring am Boden (oben sichtbar). */
export function discG(r0, r1, x, y, z, color, seg = 32, o = {}) {
  const g = new THREE.RingGeometry(Math.max(0.0001, r0), r1, seg, 1, o.start ?? 0, o.arc ?? TAU).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate(x, y, z);
  return colorize(g, o.fn ?? ((p, n, out) => { const c = L(color); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
}

/** Fünfzackiger Stern (flach, oben sichtbar). */
export function starG(rOut, rIn, x, y, z, color, rot = 0) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + rot + (i * Math.PI) / 5, rr = i % 2 ? rIn : rOut;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) s.moveTo(px, py); else s.lineTo(px, py);
  }
  const g = new THREE.ShapeGeometry(s).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate(x, y, z);
  const c = L(color);
  return colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; });
}

/**
 * Schneedecke (flach, Weltkoordinaten): Rechteck x0..x1 × z0..z1 auf Höhe y, weiß mit bläulichen Mulden und
 * glitzernden hellen Flecken (Vertexfarben, Raster cell m). Liefert eine Geometrie (für bake/addStatic).
 */
export function snowCover(x0, z0, x1, z1, y, cell = 1.5, o = {}) {
  const w = x1 - x0, d = z1 - z0;
  const nx = Math.max(1, Math.round(w / cell)), nz = Math.max(1, Math.round(d / cell));
  const g = new THREE.PlaneGeometry(w, d, nx, nz).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const a = L(o.color ?? 0xf6f9ff), b = L(o.shade ?? 0xd8e4f6), c = L(0xffffff);
  return colorize(g, (p, n, out) => {
    const v = Math.sin(p.x * 0.37 + p.z * 0.21) * 0.5 + Math.sin(p.x * 0.11 - p.z * 0.29 + 1.7) * 0.5;
    mixc(a, b, smooth(-0.1, 0.9, v) * 0.75, out);
    const s = Math.sin(p.x * 3.1 + p.z * 2.3) * Math.sin(p.x * 1.7 - p.z * 2.9);
    if (s > 0.86) mixc(out, c, 0.8, out);
  });
}

/** Geometrien → statisch (verschmolzen). opts wie view.addStatic. */
export function bake(level, parts, opts) {
  const g = merge(parts);
  if (g) addStatic(level, g, opts);
}

// ------------------------------------------------------------------ Leinwand-Texturen

function canvasTex(w, h, paint) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}

/** Brummbär-Wappen: Zylinder mit Monokel-Bär-Kopf und goldener Tatze (eigene Gestaltung). */
function paintEmblem(g, cx, cy, s, gold = '#ffc21a') {
  // Bärenkopf
  g.fillStyle = '#5a3420';
  g.beginPath(); g.arc(cx, cy + 4 * s, 15 * s, 0, TAU); g.fill();
  for (const ox of [-12, 12]) { g.beginPath(); g.arc(cx + ox * s, cy - 8 * s, 6 * s, 0, TAU); g.fill(); }
  g.fillStyle = '#c89a6a';
  g.beginPath(); g.ellipse(cx, cy + 10 * s, 8 * s, 6 * s, 0, 0, TAU); g.fill();
  g.fillStyle = '#1a1018';
  g.beginPath(); g.arc(cx - 6 * s, cy + 1 * s, 2.2 * s, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx + 6 * s, cy + 1 * s, 2.2 * s, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx, cy + 8 * s, 3 * s, 2.2 * s, 0, 0, TAU); g.fill();
  // Monokel
  g.strokeStyle = gold; g.lineWidth = 1.6 * s;
  g.beginPath(); g.arc(cx + 6 * s, cy + 1 * s, 4.4 * s, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(cx + 10 * s, cy + 3 * s); g.lineTo(cx + 13 * s, cy + 14 * s); g.stroke();
  // Zylinder
  g.fillStyle = '#16121c';
  g.fillRect(cx - 10 * s, cy - 30 * s, 20 * s, 20 * s);
  g.fillRect(cx - 16 * s, cy - 12 * s, 32 * s, 4 * s);
  g.fillStyle = '#e0262a';
  g.fillRect(cx - 10 * s, cy - 16 * s, 20 * s, 4 * s);
}

/** Fahne/Banner mit Wappen. style: 'flag' (quer, rot mit Goldkante) | 'banner' (hoch, Schwalbenschwanz-Optik). */
export function emblemTexture(style = 'flag', o = {}) {
  const base = o.base ?? '#b0141e', edge = o.edge ?? '#ffc21a';
  if (style === 'banner') {
    return canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.fillStyle = edge; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillRect(0, 0, w, 12);
      // Zackenrand unten
      g.fillStyle = 'rgba(0,0,0,0)';
      g.clearRect(0, h - 34, w, 34);
      g.fillStyle = base;
      g.beginPath(); g.moveTo(0, h - 34); g.lineTo(w, h - 34); g.lineTo(w, h - 4); g.lineTo(w * 0.75, h - 30); g.lineTo(w / 2, h - 2); g.lineTo(w * 0.25, h - 30); g.lineTo(0, h - 4); g.closePath(); g.fill();
      g.fillStyle = edge; g.beginPath(); g.arc(w / 2, 108, 44, 0, TAU); g.fill();
      g.fillStyle = base; g.beginPath(); g.arc(w / 2, 108, 38, 0, TAU); g.fill();
      paintEmblem(g, w / 2, 112, 1.25, edge);
    });
  }
  return canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = edge; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
    paintEmblem(g, 64, 54, 1.05, edge);
  });
}

export function glowDot() {
  return canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}

// ------------------------------------------------------------------ wehende Fahnen

/**
 * Fahnen mit Mast (zwei Instanz-Gruppen: Masten, Tücher – 2 Zeichenaufrufe, kein Schattenwurf). Jede Fahne:
 * { pos: [x, y, z] (Mastfuß) | at: () => { x, y, z, rot } (z. B. auf einem Fahrzeug), h: Masthöhe, yaw: Tuch-Richtung,
 *   size: [w, h] (nur Darstellung: Maßstab je Instanz) }. tex: Textur des Tuchs.
 */
export class WavingFlags {
  constructor(level, list, o = {}) {
    this.level = level;
    this.list = list;
    const n = list.length;
    const poleG = new THREE.CylinderGeometry(o.poleR ?? 0.06, (o.poleR ?? 0.06) * 1.3, 1, 6);
    poleG.translate(0, 0.5, 0);
    this.poleMat = new THREE.MeshStandardMaterial({ color: o.poleColor ?? 0x3a3242, roughness: 0.4, metalness: 0.5 });
    this.poles = new THREE.InstancedMesh(poleG, this.poleMat, n);
    // feste Fahnen: Masten einmal in die statische Geometrie (spart einen Zeichenaufruf)
    this.staticPoles = !!o.staticPoles && list.every((f) => !f.at);
    if (this.staticPoles) {
      bake(level, list.map((f) => cylG(o.poleR ?? 0.06, (o.poleR ?? 0.06) * 1.3, f.h ?? 3, f.pos[0], f.pos[1], f.pos[2], o.poleColor ?? 0x3a3242, 6)), { castShadow: false });
    }
    const W = o.w ?? 1.6, H = o.h ?? 1.1;
    this.W = W;
    this.clothG = new THREE.PlaneGeometry(W, H, 12, 3);
    this.clothG.translate(W / 2, -H / 2, 0);
    this.base = this.clothG.attributes.position.array.slice();
    this.tex = o.tex ?? emblemTexture('flag');
    this.clothMat = new THREE.MeshLambertMaterial({ map: this.tex, side: THREE.DoubleSide, emissive: o.emissive ?? 0x200404 });
    this.cloth = new THREE.InstancedMesh(this.clothG, this.clothMat, n);
    for (const m of [this.poles, this.cloth]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.wind = o.wind ?? 1;
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3(); this.e = new THREE.Euler();
    this.near = o.near ?? null;      // (x, z) → bool: nur in Kameranähe zeichnen
    owned(this.poles); owned(this.cloth);
    this.poles.name = 'fahnenmasten'; this.cloth.name = 'fahnen';
    if (!this.staticPoles) level.view.add(this.poles);
    level.view.add(this.cloth, (dt, t) => this.update(dt, t));
    this.update(0, 0);
  }

  update(dt, t) {
    const pos = this.clothG.attributes.position, a = pos.array, b = this.base, W = this.W;
    for (let i = 0; i < a.length; i += 3) {
      const u = b[i] / W;
      a[i + 2] = (Math.sin(t * 6.5 * this.wind - u * 5) * 0.14 * u + Math.sin(t * 10.5 - u * 9) * 0.05 * u) * W;
      a[i + 1] = b[i + 1] - u * u * 0.05 * W;
    }
    pos.needsUpdate = true;
    let any = false;
    this.list.forEach((f, i) => {
      const at = f.at ? f.at() : null;
      const x = at ? at.x : f.pos[0], y = at ? at.y : f.pos[1], z = at ? at.z : f.pos[2], rot = (at?.rot ?? 0) + (f.yaw ?? 0);
      const h = f.h ?? 3;
      this.p.set(x, y, z); this.q.identity(); this.s.set(1, h, 1);
      this.m.compose(this.p, this.q, this.s);
      this.poles.setMatrixAt(i, this.m);
      this.e.set(0, rot + Math.sin(t * 1.3 + i) * 0.08, 0);
      this.q.setFromEuler(this.e);
      const sc = f.scale ?? 1;
      this.p.set(x, y + h - 0.03, z); this.s.set(sc, sc, sc);
      this.m.compose(this.p, this.q, this.s);
      this.cloth.setMatrixAt(i, this.m);
      if (!this.near || this.near(x, z)) any = true;
    });
    this.poles.instanceMatrix.needsUpdate = true;
    this.cloth.instanceMatrix.needsUpdate = true;
    this.poles.visible = any; this.cloth.visible = any;
  }
}

/**
 * Budget (Schattenpass): Modelle der Entitäten dieser Arten werfen den Sonnenschatten nur noch mit ihrem ersten
 * schattenwerfenden Teil (der Blob bleibt). keep: Zahl der Teile, die werfen dürfen (Standard 1). Je Bild für neue
 * Entitäten (z. B. nach einem Neustart erzeugte Gegner).
 */
export function shadowDiet(level, kinds, keep = 1) {
  if (!level.view) return;
  const seen = new WeakSet();
  const set = new Set(kinds);
  level.view.onFrame(() => {
    for (const e of level.entities) {
      if (seen.has(e) || !e.model || !set.has(e.kind)) continue;
      seen.add(e);
      let n = 0;
      e.model.root.traverse((m) => { if ((m.isMesh || m.isInstancedMesh) && m.castShadow) { if (n >= keep) m.castShadow = false; n++; } });
    }
  });
}

// ------------------------------------------------------------------ Funken / Schnee (Punkte, 1 Zeichenaufruf)

/**
 * Aufsteigende Glutfunken bzw. fallende Flocken: { center: [x, y, z], size: [w, d] | r0/r1, n, h, dot, colors,
 * dir: 1 (steigen) | −1 (fallen), speed: [min, max], follow: () => {x, y, z} (Zentrum folgt, z. B. der Kamera) }.
 */
export function particles(level, o = {}) {
  if (!level.view || typeof document === 'undefined') return null;
  const n = o.n ?? 80, H = o.h ?? 12;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = new Rnd(o.seed ?? 11), seed = [];
  const pal = (o.colors ?? [0xffd070, 0xff8a2a, 0xff5a1a]).map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    let x, z;
    if (o.size) { x = rnd.real(-o.size[0] / 2, o.size[0] / 2); z = rnd.real(-o.size[1] / 2, o.size[1] / 2); }
    else { const a = rnd.real(0, TAU), r = rnd.real(o.r0 ?? 8, o.r1 ?? 18); x = Math.cos(a) * r; z = Math.sin(a) * r; }
    seed.push({ x, z, t0: rnd.real(0, 1), sp: rnd.real(...(o.speed ?? [1.2, 2.6])), ph: rnd.real(0, 6.28) });
    const c = pal[i % pal.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: o.dot ?? 0.3, map: glowDot(), vertexColors: true, transparent: true, depthWrite: false, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: true, opacity: o.opacity ?? 0.9 });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = o.name ?? 'partikel';
  let t = 0;
  const dir = o.dir ?? 1;
  const c0 = o.center ?? [0, 0, 0];
  addObject(level, owned(pts), (dt) => {
    t += Math.min(dt, 0.1);
    const c = o.follow ? o.follow() : { x: c0[0], y: c0[1], z: c0[2] };
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      const life = H / s.sp;
      const k = ((t / life + s.t0) % 1);
      const y = dir > 0 ? k * H : (1 - k) * H;
      let px = s.x + Math.sin(t * 1.3 + s.ph) * (o.sway ?? 0.6) * (dir > 0 ? k : 1);
      let pz = s.z + Math.cos(t * 1.1 + s.ph) * (o.sway ?? 0.6) * (dir > 0 ? k : 1);
      if (o.size && o.follow) {           // Kachel um das Zentrum (Schnee folgt der Kamera ohne Sprünge)
        const w = o.size[0], d = o.size[1];
        px = ((px - c.x) % w + w * 1.5) % w - w / 2; pz = ((pz - c.z) % d + d * 1.5) % d - d / 2;
      }
      pos[i * 3] = c.x + px; pos[i * 3 + 1] = c.y + y; pos[i * 3 + 2] = c.z + pz;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

// ====================================================================== 2) Festung (3-A)

/**
 * Roter Käfigraum auf einer kleinen Festung (Bauplan 3-A: ca. 25 × 25 m, rot vergittert, zwei erhöhte Eckpodeste).
 * Kollision: Gitter ringsum (unsichtbare, gleich hohe Wände, Kamera geht hindurch), unsichtbare Decke, Podeste;
 * Darstellung: Bodenplatten mit Zauberkreis, rote Gitterstäbe mit Speerspitzen (vorn nur eine niedrige Brüstung),
 * Podeste mit Ziegelkante und Feuerschalen, Rückwand mit Fallgatter und Wappen-Bannern, Zinnenmauern, vier
 * Rundtürme mit Spitzdächern und wehenden Brummbär-Fahnen, Festungsleib mit glühenden Fenstern bis tief hinab.
 * cfg = { y, half: 10, outer: 14, height: 6.6, ceiling: 7.2, podests: [{ x0, x1, z0, z1, h }], flags: true }
 * Rückgabe: { glow (Material des Zauberkreises), gate (Fallgatter-Objekt), bars (Material) } für Effekte.
 */
export function buildFortress(level, cfg) {
  const Y = cfg.y, R = cfg.half ?? 10, O = cfg.outer ?? 14, H = cfg.height ?? 6.6;
  const W = level.world;
  // -------- Kollision: Gitter (Wände ringsum gleich hoch), Decke, Podeste
  const wallH = cfg.ceiling ?? 7.2;
  const inv = (min, max, tag) => W.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, tag });
  inv([-R - 0.6, Y, -R - 0.6], [R + 0.6, Y + wallH + 0.6, -R], 'kaefig');
  inv([-R - 0.6, Y, R], [R + 0.6, Y + wallH + 0.6, R + 0.6], 'kaefig');
  inv([-R - 0.6, Y, -R], [-R, Y + wallH + 0.6, R], 'kaefig');
  inv([R, Y, -R], [R + 0.6, Y + wallH + 0.6, R], 'kaefig');
  inv([-R - 0.6, Y + wallH, -R - 0.6], [R + 0.6, Y + wallH + 0.5, R + 0.6], 'kaefig-decke');
  for (const p of cfg.podests ?? []) {
    W.add({ type: 'box', min: [p.x0, Y, p.z0], max: [p.x1, Y + p.h, p.z1], tag: 'podest' });
    // Treppe zur Raummitte: je Stufe ein Quader vom Boden bis zur Stufenhöhe
    const st = p.stairs;
    if (!st) continue;
    for (let i = 0; i < st.n; i++) {
      const a = st.x + st.dir * i * st.run, b = a + st.dir * st.run;
      W.add({ type: 'box', min: [Math.min(a, b), Y, st.z - st.w / 2], max: [Math.max(a, b), Y + (i + 1) * (p.h / (st.n + 1)), st.z + st.w / 2], tag: 'treppe' });
    }
  }
  if (!level.view) return {};

  const stone = 0x8e8496, stoneDk = 0x5e5466, stoneLt = 0xb4aab8, red = 0xd01c26, redDk = 0x7a0c14, gold = 0xffc21a;
  const P = [];        // statisch, mit Schattenwurf
  const N = [];        // statisch, ohne Schattenwurf (Unterbau, ferne Teile)
  const G = [];        // leuchtend (glow)

  // -------- Boden: Platten (Schachbrett-Variation), Fugen, Teppich-Läufer, Zauberkreis
  const tileA = L(0x9a90a2), tileB = L(0x887e92), tileC = L(0xa89eae);
  for (let ix = -O; ix < O; ix += 2) for (let iz = -O; iz < O; iz += 2) {
    const k = ((ix / 2 + iz / 2) & 1) ? tileA : (((ix * 7 + iz * 3) & 3) === 0 ? tileC : tileB);
    const g = new THREE.PlaneGeometry(1.94, 1.94).toNonIndexed();
    g.rotateX(-Math.PI / 2); g.translate(ix + 1, Y + 0.012, iz + 1);
    P.push(colorize(g, (p, n, o) => { o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }));
  }
  // roter Läufer vom Startrand zur Mitte
  P.push(blockG(2.6, 0.03, R - 2.2, 0, Y + 0.012, (R + 2.2) / 2, 0xa0141e, { r: 0, seg: 0, top: 0xb81a26 }));
  for (const s of [-1, 1]) P.push(blockG(0.14, 0.035, R - 2.2, s * 1.22, Y + 0.013, (R + 2.2) / 2, gold, { r: 0, seg: 0 }));
  // Zauberkreis (leuchtende Runen-Ringe und Stern) – Material eigens, damit er pulsieren kann
  const glowParts = [];
  glowParts.push(discG(4.0, 4.25, 0, Y + 0.03, 0, 0xff3a2a, 64));
  glowParts.push(discG(3.1, 3.22, 0, Y + 0.03, 0, 0xffb02a, 64));
  glowParts.push(discG(1.0, 1.1, 0, Y + 0.03, 0, 0xffb02a, 40));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const g = blockG(0.26, 0.01, 0.5, Math.cos(a) * 3.65, Y + 0.028, Math.sin(a) * 3.65, i % 2 ? 0xff7a2a : 0xffd04a, { r: 0, seg: 0, ry: -a });
    glowParts.push(g);
  }
  glowParts.push(starG(3.0, 1.25, 0, Y + 0.025, 0, 0xc0201c));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });
  const circle = new THREE.Mesh(merge(glowParts), glowMat);
  circle.renderOrder = 2;
  addObject(level, circle);

  // -------- Gitter: Stäbe (hinten, links, rechts bis H; vorn nur Brüstung), Querbänder, Speerspitzen
  const barCol = (p, n, o) => mixc(L(redDk), L(0xff3a3a), smooth(-0.6, 0.9, n.y * 0.4 + n.x * 0.3 + n.z * 0.5), o);
  const bars = [];
  const side = (ax, az, bx, bz, h, tips) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.55);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      bars.push(cylG(0.065, 0.065, h, x, Y, z, red, 6, { fn: barCol }));
      if (tips) bars.push(coneG(0.13, 0.32, x, Y + h, z, gold, 6));
    }
    for (const hy of tips ? [0.12, H * 0.5, H - 0.25] : [0.12, h - 0.06]) {
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, ry = Math.atan2(-(bz - az), bx - ax);
      bars.push(blockG(len + 0.2, 0.12, 0.16, cx, Y + hy, cz, hy > 1 ? gold : redDk, { r: 0.02, seg: 1, ry }));
    }
  };
  side(-R, -R - 0.15, R, -R - 0.15, H, true);
  side(-R - 0.15, -R, -R - 0.15, R, H, true);
  side(R + 0.15, -R, R + 0.15, R, H, true);
  side(-R, R + 0.15, R, R + 0.15, 1.0, false);
  // Eckpfosten (dick, mit Goldkugeln)
  for (const [x, z, h] of [[-R - 0.15, -R - 0.15, H + 0.4], [R + 0.15, -R - 0.15, H + 0.4], [-R - 0.15, R + 0.15, 1.6], [R + 0.15, R + 0.15, 1.6]]) {
    bars.push(blockG(0.5, h, 0.5, x, Y, z, redDk, { r: 0.06, seg: 1, top: red }));
    bars.push(sphereG(0.32, x, Y + h + 0.24, z, gold, { ws: 10, hs: 6 }));
  }
  // Brüstung vorn (Stein mit Goldkante) unter den Stäben
  P.push(blockG(2 * R + 0.4, 0.35, 0.5, 0, Y, R + 0.2, stone, { r: 0.06, seg: 1, top: stoneLt }));
  const barMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35, emissive: 0x3a0406 });
  const barMesh = new THREE.Mesh(merge(bars), barMat);
  barMesh.castShadow = true; barMesh.receiveShadow = true;
  addObject(level, barMesh);

  // -------- Podeste: Steinblock mit Ziegelband, Goldkante, Stufen-Wangen; Feuerschale
  for (const p of cfg.podests ?? []) {
    const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, w = p.x1 - p.x0, d = p.z1 - p.z0;
    P.push(blockG(w, p.h - 0.3, d, cx, Y, cz, stoneDk, { r: 0.05, seg: 1 }));
    // Ziegelband (rot) mit Fugen
    for (let row = 0; row < 3; row++) {
      const yy = Y + 0.3 + row * 0.55;
      for (const [sx, sz, len, ry] of [[cx, p.z1 + 0.02, w, 0], [p.x0 - 0.02, cz, d, Math.PI / 2], [p.x1 + 0.02, cz, d, Math.PI / 2]]) {
        const n = Math.max(2, Math.round(len / 0.9));
        for (let i = 0; i < n; i++) {
          const off = -len / 2 + (i + (row % 2 ? 0.5 : 0.25)) * (len / n);
          if (Math.abs(off) > len / 2 - 0.3) continue;
          const bx = ry ? sx : sx + off, bz = ry ? sz + off : sz;
          P.push(blockG(0.8, 0.42, 0.06, bx, yy, bz, row % 2 ? 0xa82830 : 0x8e1e26, { r: 0.02, seg: 0, ry }));
        }
      }
    }
    P.push(blockG(w + 0.2, 0.3, d + 0.2, cx, Y + p.h - 0.3, cz, stone, { r: 0.08, seg: 1, top: stoneLt }));
    P.push(blockG(w + 0.24, 0.07, d + 0.24, cx, Y + p.h - 0.34, cz, gold, { r: 0.02, seg: 0 }));
    // Treppe: scharfkantige Stufen (Tritt hell, Setzstufe dunkel, Goldkante), Wangen
    const st = p.stairs;
    if (st) {
      const rise = p.h / (st.n + 1);
      for (let i = 0; i < st.n; i++) {
        const h = (i + 1) * rise, xm = st.x + st.dir * (i + 0.5) * st.run;
        P.push(blockG(st.run, h, st.w, xm, Y, st.z, stoneDk, { r: 0, seg: 0, top: stoneLt }));
        P.push(blockG(0.08, 0.06, st.w, st.x + st.dir * i * st.run, Y + h - 0.06, st.z, gold, { r: 0, seg: 0 }));
      }
      for (const s of [-1, 1]) P.push(blockG(st.n * st.run, 0.2, 0.16, st.x + st.dir * st.n * st.run / 2, Y + p.h - 0.2, st.z + s * (st.w / 2 + 0.08), redDk, { r: 0.03, seg: 0 }));
    }
  }

  // -------- Festungsmauern ringsum (außerhalb des Käfigs): hinten hoch, seitlich mittel, vorn niedrig; Zinnen
  const wall = (x0, z0, x1, z1, h, th, zinnen = true) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
    P.push(blockG(len, h, th, cx, Y, cz, stone, { r: 0.08, seg: 1, top: stoneLt, ry }));
    // Steinfugen-Andeutung: dunklere Bänder
    for (let yy = 0.9; yy < h - 0.2; yy += 0.9) P.push(blockG(len + 0.02, 0.05, th + 0.02, cx, Y + yy, cz, stoneDk, { r: 0, seg: 0, ry }));
    if (zinnen) {
      const n = Math.round(len / 1.4);
      for (let i = 0; i < n; i += 2) {
        const t = (i + 0.5) / n - 0.5;
        P.push(blockG(len / n, 0.8, th, cx + Math.cos(ry) * t * len, Y + h, cz - Math.sin(ry) * t * len, stone, { r: 0.06, seg: 1, top: stoneLt, ry }));
      }
    }
  };
  wall(-O, -O + 0.6, O, -O + 0.6, 8.2, 1.2);
  wall(-O + 0.5, -O, -O + 0.5, O, 3.4, 1.0);
  wall(O - 0.5, -O, O - 0.5, O, 3.4, 1.0);
  wall(-O, O - 0.4, -2.5, O - 0.4, 1.1, 0.8);
  wall(2.5, O - 0.4, O, O - 0.4, 1.1, 0.8);
  // Rückwand: Torbogen mit Fallgatter (Gitter-Objekt, öffnet sich nach dem Sieg)
  P.push(blockG(5.6, 1.0, 1.6, 0, Y + 5.4, -O + 0.6, stoneLt, { r: 0.1, seg: 1 }));
  for (const s of [-1, 1]) P.push(blockG(1.0, 5.4, 1.6, s * 2.3, Y, -O + 0.6, stoneLt, { r: 0.08, seg: 1 }));
  N.push(blockG(3.6, 5.4, 0.2, 0, Y, -O + 0.05, 0x1a0a10, { r: 0, seg: 0 }));
  const gateParts = [];
  for (let i = 0; i < 7; i++) gateParts.push(cylG(0.06, 0.06, 5.2, -1.5 + i * 0.5, 0, 0, 0x3a3238, 6));
  for (const yy of [0.6, 2.2, 3.8]) gateParts.push(blockG(3.4, 0.1, 0.1, 0, yy, 0, 0x4a4248, { r: 0, seg: 0 }));
  for (let i = 0; i < 7; i++) gateParts.push(coneG(0.1, 0.3, -1.5 + i * 0.5, -0.3, 0, 0x6a6268, 6, { ry: 0 }));
  const gate = new THREE.Mesh(merge(gateParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 }));
  gate.position.set(0, Y, -O + 0.3);
  addObject(level, gate);
  // Banner an der Rückwand (Wappen), Ketten
  const banTex = emblemTexture('banner');
  const banMat = new THREE.MeshLambertMaterial({ map: banTex, side: THREE.DoubleSide, emissive: 0x1a0204 });
  const banG = [];
  for (const x of [-8.4, -4.6, 4.6, 8.4]) {
    const b = new THREE.PlaneGeometry(1.7, 3.4, 1, 1);
    b.translate(x, Y + 5.1, -O + 1.24);
    banG.push(b);
    P.push(cylG(0.05, 0.05, 2.1, x, Y + 6.85, -O + 1.3, gold, 6, { rz: Math.PI / 2, center: true }));
  }
  const banners = new THREE.Mesh(mergeGeometries(banG, false), banMat);
  addObject(level, banners);
  // Brummbär-Büste über dem Tor (Stein und Gold): Kopf mit Ohren, Schnauze, Monokel, Zylinder
  {
    const bx = 0, by = Y + 8.2, bz = -O + 0.4;
    P.push(blockG(3.2, 0.8, 1.6, bx, Y + 7.4, bz, stoneLt, { r: 0.1, seg: 1 }));
    P.push(sphereG(1.25, bx, by + 1.2, bz, 0xb08a5a, { ws: 16, hs: 10 }));
    for (const s of [-1, 1]) P.push(sphereG(0.42, bx + s * 0.95, by + 2.2, bz, 0xb08a5a, { ws: 10, hs: 6 }));
    P.push(sphereG(0.55, bx, by + 0.85, bz + 1.0, 0xe0c090, { ws: 12, hs: 8, sz: 0.8 }));
    P.push(sphereG(0.18, bx, by + 1.0, bz + 1.45, 0x2a1a14));
    P.push(ringG(0.3, 0.05, bx + 0.45, by + 1.45, bz + 1.05, gold, 16, { fn: litFn(gold) }));
    P.push(cylG(0.85, 0.85, 1.3, bx, by + 2.1, bz - 0.1, 0x1e1a24, 18));
    P.push(cylG(1.35, 1.35, 0.16, bx, by + 2.05, bz - 0.1, 0x1e1a24, 18));
    P.push(cylG(0.87, 0.87, 0.24, bx, by + 2.25, bz - 0.1, red, 18));
    for (const s of [-1, 1]) G.push(sphereG(0.13, bx + s * 0.45, by + 1.45, bz + 1.08, 0xffd04a, { ws: 8, hs: 6 }));
  }
  // Ketten zwischen den Bannern (Glieder als kleine Tori)
  for (const [x0, x1] of [[-6.5, -2.5], [2.5, 6.5]]) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = x0 + (x1 - x0) * t, y = Y + 6.4 - Math.sin(t * Math.PI) * 1.1;
      const g = new THREE.TorusGeometry(0.11, 0.03, 4, 8).toNonIndexed();
      if (i % 2) g.rotateY(Math.PI / 2);
      g.translate(x, y, -O + 1.3);
      P.push(colorize(g, litFn(0x5a525e)));
    }
  }

  // -------- Rundtürme in den Ecken: Kegeldach, Fensterschlitze (leuchtend), Fahnen
  const towers = [[-O + 0.6, -O + 0.8, 12.5, 2.4], [O - 0.6, -O + 0.8, 12.5, 2.4], [-O + 0.6, O - 0.6, 5.0, 1.8], [O - 0.6, O - 0.6, 5.0, 1.8]];
  const flagList = [];
  for (const [x, z, h, r] of towers) {
    const rows = Math.max(1, Math.round(h / 1.1));
    P.push(cylG(r, r * 1.08, h, x, Y - 2, z, stone, 18, { rows, fn: (p, n, o) => mixc(L(stone), L(stoneDk), (Math.floor((p.y - Y) / 0.8) & 1) * 0.25 + smooth(0.6, -0.4, n.y) * 0.1, o) }));
    P.push(cylG(r + 0.25, r + 0.25, 0.5, x, Y - 2 + h, z, stoneLt, 18));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      P.push(blockG(0.55, 0.6, 0.45, x + Math.cos(a) * (r + 0.05), Y - 1.5 + h, z + Math.sin(a) * (r + 0.05), stone, { r: 0.04, seg: 1, ry: -a }));
    }
    if (h > 8) {
      P.push(coneG(r + 0.5, 4.2, x, Y - 1.5 + h + 0.6, z, red, 16, { fn: (p, n, o) => mixc(L(redDk), L(0xe8323a), smooth(-0.3, 0.8, n.y + (Math.floor(p.y * 2.2) & 1) * 0.15), o) }));
      P.push(sphereG(0.22, x, Y - 1.5 + h + 4.9, z, gold));
      flagList.push({ pos: [x, Y - 1.5 + h + 4.9, z], h: 2.4, yaw: -0.7 + (x > 0 ? 0.25 : 0) });
      for (const yy of [3.5, 6.5, 9.5]) {
        for (const a of [-Math.PI / 2 + (z < 0 ? 0.5 : -0.5) * Math.sign(-x), Math.PI * (x < 0 ? 0 : 1)]) {
          G.push(blockG(0.28, 0.9, 0.06, x + Math.cos(a) * (r + 0.02), Y - 2 + yy, z - Math.sin(a) * (r + 0.02), 0xffa03a, { r: 0, seg: 0, ry: a + Math.PI / 2 }));
        }
      }
    } else {
      P.push(blockG(1.2, 0.08, 1.2, x, Y - 1.5 + h + 0.6, z, gold, { r: 0, seg: 0 }));
      flagList.push({ pos: [x, Y - 1.5 + h + 0.6, z], h: 2.6, yaw: -0.7, scale: 0.8 });
    }
  }
  // Wimpelmasten an den Seitenmauern
  for (const z of [-6, 0, 6]) for (const s of [-1, 1]) flagList.push({ pos: [s * (O - 0.5), Y + 3.4, z], h: 2.2, yaw: s < 0 ? -0.4 : -1.2, scale: 0.6 });

  // -------- Festungsleib unter der Plattform: Mauern bis tief hinab, Strebepfeiler, glühende Fenster
  const depth = cfg.depth ?? 22;
  for (const [cx, cz, w, d] of [[0, O + 0.2, 2 * O + 0.8, 0.8], [0, -O - 0.2, 2 * O + 0.8, 0.8], [-O - 0.2, 0, 0.8, 2 * O], [O + 0.2, 0, 0.8, 2 * O]]) {
    N.push(blockG(w, depth, d, cx, Y - depth, cz, stoneDk, { r: 0.1, seg: 1 }));
    for (let yy = 1.5; yy < depth; yy += 1.6) N.push(blockG(w + 0.04, 0.08, d + 0.04, cx, Y - yy, cz, 0x4a4250, { r: 0, seg: 0 }));
  }
  for (const s of [-1, 1]) for (const t of [-0.66, 0, 0.66]) {
    N.push(blockG(1.6, depth - 2, 1.2, t * O, Y - depth, s * (O + 0.8), stone, { r: 0.12, seg: 1 }));
    N.push(blockG(1.2, depth - 2, 1.6, s * (O + 0.8), Y - depth, t * O, stone, { r: 0.12, seg: 1 }));
  }
  for (let yy = 4; yy < depth - 3; yy += 5) for (const t of [-0.33, 0.33]) {
    G.push(blockG(0.7, 1.3, 0.06, t * O, Y - yy, O + 0.64, 0xff9a36, { r: 0, seg: 0 }));
    G.push(blockG(0.06, 1.3, 0.7, -O - 0.64, Y - yy, t * O, 0xff8a2a, { r: 0, seg: 0 }));
    G.push(blockG(0.06, 1.3, 0.7, O + 0.64, Y - yy, t * O, 0xff8a2a, { r: 0, seg: 0 }));
  }
  bake(level, P);
  bake(level, N, { castShadow: false });
  bake(level, G, { material: 'glow', castShadow: false });

  const flags = new WavingFlags(level, flagList, { w: 2.0, h: 1.35, staticPoles: true });
  return { glowMat, circle, gate, barMat, flags, banners };
}

/**
 * 3-A Effekte und Haken: Zauberkreis pulsiert (heller, solange Zauberkröten zaubern), Gitter glühen beim Sieg auf,
 * das Fallgatter fährt hoch, Glutfunken steigen aus der Tiefe. fx = Rückgabe von buildFortress.
 */
export function fortressFx(level, fx, o = {}) {
  if (!level.view || !fx.glowMat) return;
  particles(level, { center: [0, (o.y ?? 2) - 18, 0], r0: 15, r1: 28, n: 90, h: 34, dot: 0.34, speed: [1.6, 3.4], name: 'glutfunken' });
  let k = 0, open = 0;
  const seen = new WeakSet();
  level.view.onFrame((dt, t) => {
    // Budget: Zauberkröten werfen den Sonnenschatten nur mit dem Umhang (Blob bleibt), Zauberkugeln ohne Funkenring
    for (const e of level.entities) {
      if (seen.has(e) || !e.model) continue;
      seen.add(e);
      if (e.kind === 'zauberkroete') { let first = true; e.model.root.traverse((m) => { if (m.isMesh && m.castShadow) { if (!first) m.castShadow = false; first = false; } }); }
      if (e.kind === 'zauberkugel') e.model.root.traverse((m) => { if ((m.isSprite && m.scale.x < 0.5) || (m.isMesh && m.material?.emissive && !m.material.transparent)) m.visible = false; });
    }
    const arch = level.archetype;
    const info = arch?.info?.() ?? {};
    const casting = level.entities.some((e) => e.kind === 'zauberkroete' && e.alive && (e.state === 'cast' || e.state === 'appear'));
    k += ((casting ? 1 : 0) - k) * Math.min(1, dt * 4);
    fx.glowMat.opacity = 0.55 + 0.25 * Math.sin(t * 2.2) * 0.5 + 0.35 * k;
    const won = !!info.cleared;
    open += ((won ? 1 : 0) - open) * Math.min(1, dt * 1.2);
    fx.gate.position.y = (o.y ?? 2) + open * 4.6;
    fx.barMat.emissive.setRGB(0.23 + open * 0.5 + k * 0.15, 0.02 + open * 0.25, 0.03);
  });
}

// ====================================================================== 3) Zirkus (3-B)

/**
 * Röhre, die auf Signal aus dem Boden fährt (reveal) – Ziel-Röhre nach dem Bosskampf. Steht sie, führt Ducken darauf
 * zum Ziel. { id, pos (Fuß), height 1.6, radius 0.9, color, target: [x, y, z] | Röhren-Id, hidden: true }
 */
export class RisingPipe extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'roehre_steigt');
    this.R = spec.radius ?? 0.9;
    this.H = spec.height ?? 1.6;
    this.touch = false;
    this.k = this.hidden ? 0 : 1;
    const self = this;
    this.info = {
      pipe: true, enterRadius: this.R * 0.7,
      get x() { return self.pos.x; }, get z() { return self.pos.z; }, get top() { return self.pos.y + self.H; },
      enter: (pl) => self.enter(pl),
    };
    const p = this.pos;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: this.R + 0.08, y0: p.y, y1: p.y + this.H, pipe: this.info, tag: 'zielroehre' });
    if (level.view) {
      const g = pipeGeo(0, 0, 0, this.H, this.R, hex(spec.color ?? 0x2fbf4a));
      const mesh = new THREE.Mesh(g, level.view.mats.stone);
      mesh.castShadow = true;
      const root = new THREE.Group();
      root.add(mesh);
      this.setModel({ root, update: () => {}, dispose: () => g.dispose() });
    }
  }

  onReveal() { this.k = 0; this.level.shake(0.2); }

  enter(pl) {
    if (this.hidden || this.k < 0.95) return;
    const t = this.spec.target;
    const o = typeof t === 'string' ? this.level.named.get(t) : null;
    pl.enterPipe({ x: this.pos.x, z: this.pos.z, top: this.pos.y + this.H, exit: o?.pipe ? o : { pos: Array.isArray(t) ? t : [this.pos.x, this.pos.y + 3, this.pos.z] } });
  }

  update(dt) {
    if (!this.hidden && this.k < 1) {
      this.k = Math.min(1, this.k + dt / 1.1);
      if (this.level.view && Math.random() < 0.5) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 2, 1.2);
    }
  }

  render() {
    if (!this.model) return;
    this.model.root.visible = !this.hidden;
    this.model.root.position.set(this.pos.x, this.pos.y - (1 - ease(this.k)) * this.H, this.pos.z);
  }
}

/**
 * Prachttreppe (scharfkantige Steinstufen, roter Läufer mit Goldstangen, Wangen mit Leuchtkugeln).
 * { x, z (Vorderkante der untersten Stufe), y, n, rise (≤ 0,3 ohne Springen), run, width, dir: −1 (steigt nach −Z) }
 */
export function grandStairs(level, o) {
  const { x, z, y, n, rise, run, width } = o;
  const dir = o.dir ?? -1;
  for (let i = 0; i < n; i++) {
    const a = z + dir * i * run, b = a + dir * run;
    level.world.add({ type: 'box', min: [x - width / 2, y - 0.5, Math.min(a, b)], max: [x + width / 2, y + (i + 1) * rise, Math.max(a, b)], tag: 'treppe' });
  }
  for (const s of [-1, 1]) level.world.add({ type: 'box', min: [x + s * (width / 2 + 0.25) - 0.25, y - 0.5, Math.min(z, z + dir * n * run)], max: [x + s * (width / 2 + 0.25) + 0.25, y + n * rise + 0.9, Math.max(z, z + dir * n * run)], tag: 'treppe:wange' });
  if (!level.view) return;
  const P = [], G = [];
  const carpet = Math.min(2.4, width * 0.45);
  for (let i = 0; i < n; i++) {
    const zm = z + dir * (i + 0.5) * run, h = (i + 1) * rise;
    P.push(blockG(width, h + 0.5, run, x, y - 0.5, zm, 0xe8e0ee, { r: 0, seg: 0, top: 0xf6f2fa }));
    P.push(blockG(carpet, 0.03, run, x, y + h, zm, 0xb8142a, { r: 0, seg: 0, top: 0xd21e30 }));
    P.push(blockG(carpet, rise, 0.03, x, y + h - rise, z + dir * i * run - dir * 0.015, 0xa0101e, { r: 0, seg: 0 }));
    P.push(blockG(carpet + 0.3, 0.05, 0.05, x, y + h - 0.02, z + dir * i * run, 0xffc21a, { r: 0, seg: 0 }));
  }
  const len = n * run, H = n * rise;
  for (const s of [-1, 1]) {
    const bx = x + s * (width / 2 + 0.25);
    for (let i = 0; i < n; i++) P.push(blockG(0.5, (i + 1) * rise + 0.9 + 0.5, run, bx, y - 0.5, z + dir * (i + 0.5) * run, 0xd8cce4, { r: 0, seg: 0, top: 0xc8b8d8 }));
    for (let k = 0; k <= 3; k++) {
      const zz = z + dir * ((k / 3) * (len - run)) + dir * run * 0.5;
      const hh = y + (Math.round((k / 3) * (n - 1)) + 1) * rise + 0.9;
      P.push(cylG(0.12, 0.16, 1.1, bx, hh, zz, 0x3a2a4a, 8));
      G.push(sphereG(0.22, bx, hh + 1.3, zz, 0xfff0b0, { ws: 10, hs: 8 }));
    }
  }
  bake(level, P);
  bake(level, G, { material: 'glow', castShadow: false });
}

// ------------------------------------------------------------------ Zirkus-Requisiten (Vorplatz)

/** Zirkuswagen: Kasten mit Rundbogendach, Räder, leuchtende Fensterchen, Zierleisten (Teile lokal, dann gedreht). */
function zirkuswagen(P, G, x, y, z, yaw, col, trim) {
  const L2 = 4.2, W2 = 2.0;
  const parts = [blockG(L2, 1.8, W2, 0, 0.7, 0, col, { r: 0.08, seg: 1 })];
  const roof = new THREE.CylinderGeometry(1.15, 1.15, L2 + 0.3, 16, 1, false, 0, Math.PI).toNonIndexed();
  roof.rotateZ(Math.PI / 2); roof.rotateX(Math.PI / 2); roof.scale(1, 0.5, 1); roof.translate(0, 2.48, 0);
  parts.push(colorize(roof, (p, n, o) => mixc(L(trim), L(0xfff6ee), (Math.floor((p.x + 5) * 1.6) & 1) * 0.85, o)));
  parts.push(blockG(L2 + 0.1, 0.12, W2 + 0.1, 0, 2.42, 0, 0xffc21a, { r: 0.02, seg: 0 }));
  for (const lx of [-1.4, 1.4]) for (const lz of [-1.05, 1.05]) {
    parts.push(cylG(0.52, 0.52, 0.12, lx, 0.52, lz, 0xffc21a, 14, { rx: Math.PI / 2, center: true }));
    parts.push(cylG(0.2, 0.2, 0.16, lx, 0.52, lz, 0xc0141e, 10, { rx: Math.PI / 2, center: true }));
  }
  parts.push(blockG(0.75, 1.3, 0.05, 1.4, 0.75, W2 / 2 + 0.01, trim, { r: 0.02, seg: 0 }));
  const glow = [blockG(0.7, 0.6, 0.04, -1.0, 1.25, W2 / 2 + 0.01, 0xffd27a, { r: 0, seg: 0 }), blockG(0.7, 0.6, 0.04, 0.2, 1.25, W2 / 2 + 0.01, 0xffd27a, { r: 0, seg: 0 })];
  for (const g of parts) { g.rotateY(yaw); g.translate(x, y, z); P.push(g); }
  for (const g of glow) { g.rotateY(yaw); g.translate(x, y, z); G.push(g); }
}

function posterTexture() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#2a1050'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffc21a'; g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#b8142a'; g.fillRect(16, 16, w - 32, h - 32);
    // Schlange mit Krone
    g.strokeStyle = '#5ad06a'; g.lineWidth = 22; g.lineCap = 'round';
    g.beginPath(); g.moveTo(60, 220); g.bezierCurveTo(40, 170, 200, 180, 170, 130); g.bezierCurveTo(150, 95, 110, 105, 128, 86); g.stroke();
    g.fillStyle = '#5ad06a'; g.beginPath(); g.ellipse(132, 80, 26, 18, -0.3, 0, TAU); g.fill();
    g.fillStyle = '#ffc21a'; g.beginPath(); g.moveTo(112, 66); g.lineTo(116, 40); g.lineTo(126, 56); g.lineTo(134, 36); g.lineTo(142, 56); g.lineTo(152, 42); g.lineTo(150, 66); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(140, 76, 5, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(141, 76, 2.5, 0, TAU); g.fill();
    g.fillStyle = '#fff6d0'; g.textAlign = 'center';
    g.font = 'bold 22px "Nunito", Arial, sans-serif'; g.fillText('Der Schlangenkönig', w / 2, 262);
    g.font = 'bold 30px "Nunito", Arial, sans-serif'; g.fillText('HEUTE!', w / 2, 296);
  });
}

/**
 * Vorplatz-Requisiten: Zirkuswagen, Kassenhäuschen mit gestreiftem Dach, Plakatwand mit dem Schlangenkönig.
 * items: [{ kind: 'wagen' | 'kasse' | 'plakat', pos, yaw, color, trim }]
 */
export function circusProps(level, items, o = {}) {
  const P = [], G = [];
  for (const it of items) {
    const [x, y, z] = it.pos, yaw = it.yaw ?? 0;
    if (it.kind === 'wagen') {
      const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
      const hx = c * 2.2 + s * 1.05, hz = s * 2.2 + c * 1.05;
      level.world.add({ type: 'box', min: [x - hx, y, z - hz], max: [x + hx, y + 2.9, z + hz], tag: 'zirkuswagen' });
      if (level.view) zirkuswagen(P, G, x, y, z, yaw, it.color ?? 0x2a6ae8, it.trim ?? 0xe8283a);
    } else if (it.kind === 'kasse') {
      level.world.add({ type: 'box', min: [x - 1.1, y, z - 1.1], max: [x + 1.1, y + 2.2, z + 1.1], tag: 'kasse' });
      if (!level.view) continue;
      P.push(blockG(2.2, 2.2, 2.2, x, y, z, 0xfff2e0, { r: 0.06, seg: 1 }));
      G.push(blockG(1.2, 0.8, 0.05, x, y + 1.1, z + 1.11, 0xffd27a, { r: 0, seg: 0 }));
      P.push(blockG(1.6, 0.12, 0.5, x, y + 0.95, z + 1.3, 0xb86f3a, { r: 0.02, seg: 0 }));
      const roof = new THREE.ConeGeometry(1.9, 1.4, 12).toNonIndexed();
      roof.translate(x, y + 2.9, z);
      P.push(colorize(roof, (p, n, o) => mixc(L(0xe8283a), L(0xfff6ee), (Math.floor(((Math.atan2(p.z - z, p.x - x) / TAU) + 1) * 12) & 1), o)));
      P.push(sphereG(0.2, x, y + 3.7, z, 0xffc21a));
    } else if (it.kind === 'plakat' && level.view) {
      for (const s of [-1, 1]) P.push(blockG(0.14, 3.2, 0.14, x + s * 1.1, y, z, 0x5a3a2a, { r: 0.02, seg: 0 }));
      const mat = new THREE.MeshLambertMaterial({ map: posterTexture(), emissive: 0x403020 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.5), mat);
      pl.position.set(x, y + 1.95, z + 0.09);
      pl.rotation.y = yaw;
      addObject(level, owned(pl));
    }
  }
  bake(level, P, { castShadow: o.shadow !== false });
  bake(level, G, { material: 'glow', castShadow: false });
}

/**
 * Inseln wie der Baustein `island` (Kollision: Quader), aber ohne Sonnenschatten-Wurf (große Geländeblöcke: spart im
 * Schattenpass viele Dreiecke). specs: { pos, size, top, under, color } wie island.
 */
export function plainIslands(level, specs) {
  const th = level.view?.theme;
  for (const spec of specs) {
    const [px, py, pz] = spec.pos, [w, h, d] = spec.size;
    const x0 = px - w / 2, x1 = px + w / 2, z0 = pz - d / 2, z1 = pz + d / 2, y0 = py, y1 = py + h;
    level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag: 'island' });
    if (!level.view) continue;
    for (const g of islandParts(x0, y0, z0, x1, y1, z1, th, { top: spec.top, under: spec.under ?? 0, bodyColor: spec.color, rnd: level.rnd })) addStatic(level, g, { castShadow: false });
  }
}

/**
 * Felswand-Zier an einer Inselkante (Blick über eine Schlucht): Schneewulst an der Oberkante, Eiszapfen, vorspringende
 * Felsbänder, gefrorener Wasserfall. { x0, x1, z, y (Oberkante), h (Höhe der Wand), face: +1 (Wand zeigt nach +Z) | −1,
 * fall: x (Wasserfall), seed }
 */
export function cliffDeco(level, o) {
  if (!level.view) return;
  const P = [], N = [];
  const f = o.face ?? 1, z = o.z, y = o.y, h = o.h ?? 20;
  const rnd = new Rnd(o.seed ?? 5);
  const w = o.x1 - o.x0;
  // Schneewulst
  P.push(cylG(0.35, 0.35, w, (o.x0 + o.x1) / 2, y - 0.05, z + f * 0.1, 0xf6faff, 10, { rz: Math.PI / 2, center: true, fn: litFn(0xf6faff, 0.85) }));
  // Eiszapfen
  for (let x = o.x0 + 0.6; x < o.x1 - 0.4; x += rnd.real(0.5, 1.3)) {
    const len = rnd.real(0.4, 1.6);
    const g = new THREE.ConeGeometry(rnd.real(0.08, 0.16), len, 5).toNonIndexed();
    g.rotateX(Math.PI);
    g.translate(x, y - 0.3 - len / 2, z + f * 0.18);
    N.push(colorize(g, litFn(0xcfeaff, 0.8, 1.2)));
  }
  // Felsbänder (helle, verschneite Simse)
  for (let k = 1; k < h / 3.2; k++) {
    for (let x = o.x0 + rnd.real(0, 2); x < o.x1 - 1.5; x += rnd.real(2.5, 6)) {
      const len = rnd.real(1.5, 4), yy = y - k * 3.2 + rnd.real(-0.6, 0.6);
      N.push(blockG(len, 0.35, 0.7, x + len / 2, yy, z + f * 0.25, 0x8a8aa6, { r: 0.1, seg: 1, top: 0xeef4ff }));
    }
  }
  // gefrorener Wasserfall
  if (o.fall !== undefined) {
    for (let i = 0; i < 9; i++) {
      const xx = o.fall + (i - 4) * 0.42, len = h * rnd.real(0.6, 0.95);
      N.push(cylG(0.24, 0.12, len, xx, y - len, z + f * (0.25 + (i % 2) * 0.12), 0xbfe6ff, 6, { fn: litFn(0xbfe6ff, 0.75, 1.25) }));
    }
  }
  bake(level, P, { castShadow: false });
  bake(level, N, { castShadow: false });
}

// ------------------------------------------------------------------ Zirkuszelt (aufgeschnitten) und Manege

/**
 * Zirkuszelt (Modell zirkuszelt, eigene Materialkopie) mit Schnittebene: steht die Figur draußen, ist das Zelt ganz zu
 * sehen; geht sie hinein, gleitet die Schnittebene in ≈ 1 s bis knapp vor die Zeltmitte – die vordere Hälfte
 * verschwindet, der Blick fällt ins Innere (Ränge, Publikum, Scheinwerfer). inside(p) → bool entscheidet.
 * { center: [x, y, z], radius, height, inside: (p) => bool, cut: m vor der Mitte (Standard 3) }
 */
export function cutawayTent(level, o) {
  if (!level.view) return null;
  const [cx, cy, cz] = o.center;
  const m = getModel('zirkuszelt', { radius: o.radius, height: o.height });
  m.root.position.set(cx, cy, cz);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5);
  m.root.traverse((x) => {
    if (!x.isMesh) return;
    x.material = x.material.clone();
    x.material.clippingPlanes = [plane];
    x.material.clipShadows = true;
    x.castShadow = false;
    x.userData.owned = true;
  });
  level.view.renderer.localClippingEnabled = true;
  addObject(level, m.root);
  const st = { k: 0, plane, root: m.root };
  const far = cz + o.radius + 2, cut = cz + (o.cut ?? 3);
  // Fortschritt im Simulationstakt (deterministisch, auch bei step(n) ohne Bilder), Ebene je Bild
  level.onStep((dt) => {
    const p = level.player;
    const want = p && o.inside(p) ? 1 : 0;
    st.k = want ? Math.min(1, st.k + dt / 0.9) : Math.max(0, st.k - dt / 0.9);
  });
  level.view.onFrame(() => {
    // behalten wird z < zc (Normale −Z: Abstand = −z + zc ≥ 0)
    plane.constant = st.k <= 0 ? 1e5 : far + (cut - far) * ease(st.k);
  });
  return st;
}

/** Ring-Sektor (waagerechte Trittfläche) bzw. Setzstufe (senkrecht, zur Mitte gewandt); Winkel wie yaw (0 = +X). */
function sector(cx, cz, r0, r1, y, a0, a1, color, seg = 32, riser = 0) {
  const pos = [], nor = [], col = [];
  const cA = L(color);
  const P0 = (r, t) => [cx + Math.cos(t) * r, cz - Math.sin(t) * r];
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + (a1 - a0) * (i / seg), t1 = a0 + (a1 - a0) * ((i + 1) / seg);
    if (!riser) {
      const [ax, az] = P0(r0, t0), [bx, bz] = P0(r1, t0), [ex, ez] = P0(r1, t1), [dx, dz] = P0(r0, t1);
      // Umlaufsinn gegen den Uhrzeigersinn von oben (Normale +Y)
      pos.push(ax, y, az, ex, y, ez, bx, y, bz, ax, y, az, dx, y, dz, ex, y, ez);
      for (let k = 0; k < 6; k++) nor.push(0, 1, 0);
    } else {
      const [ax, az] = P0(r0, t0), [dx, dz] = P0(r0, t1);
      pos.push(ax, y, az, ax, y + riser, az, dx, y + riser, dz, ax, y, az, dx, y + riser, dz, dx, y, dz);
      const tm = (t0 + t1) / 2;
      for (let k = 0; k < 6; k++) nor.push(-Math.cos(tm), 0, Math.sin(tm));
    }
    for (let k = 0; k < 6; k++) col.push(cA[0], cA[1], cA[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/**
 * Manege im Zelt: Sägemehl-Manege (Modell manege), Bande ringsum (Kollision bis 9 m, Tor zur Kamera), Ränge hinten und an
 * den Seiten mit Publikum-Silhouetten (zwei Instanz-Gruppen, jubeln auf Zuruf), Leuchtstäbe im Publikum.
 * cfg = { center, arena: r (Innenradius der Bande), door: Breite der Lücke nach +Z, rows: 6, rowDepth: 1, rowRise: 0.55,
 *         span: [a0, a1] (Winkelbereich der Ränge, yaw-Sinn: 0 = +X, π/2 = −Z) }
 * Rückgabe: { cheer(stärke, dauer), seats }
 */
export function circusArena(level, cfg) {
  const [cx, cy, cz] = cfg.center;
  const R = cfg.arena ?? 12.3, door = cfg.door ?? 4.2;
  const W = level.world;
  const n = Math.round((TAU * R) / 0.9);
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * TAU;
    const x = cx + Math.cos(a) * (R + 0.4), z = cz - Math.sin(a) * (R + 0.4);
    const da = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
    if (Math.abs(da) * R < door / 2) continue;
    W.add({ type: 'box', min: [x - 0.45, cy, z - 0.45], max: [x + 0.45, cy + 9, z + 0.45], camIgnore: true, noWallSlide: true, tag: 'bande' });
  }
  const st = { cheerT: 0, cheerK: 0, cheer: () => {}, seats: 0 };
  if (!level.view) return st;
  const P = [];
  bakeModel(level, 'manege', { radius: R - 0.1, floor: true }, cx, cy, cz, 0, 1, {}, { castShadow: false });
  // Bande (rot mit Goldsternen, weißes Polster) – Bogen ohne die Torlücke
  const gapA = door / 2 / R + 0.03;
  const b0 = -Math.PI / 2 + gapA, b1 = -Math.PI / 2 + TAU - gapA;
  P.push(sector(cx, cz, R + 0.05, R + 0.75, cy + 1.05, b0, b1, 0xfff2e8, 96));
  P.push(sector(cx, cz, R + 0.05, R + 0.05, cy, b0, b1, 0xd01c26, 96, 1.05));
  for (let i = 0; i < 44; i++) {
    const a = b0 + (b1 - b0) * ((i + 0.5) / 44);
    const g = starG(0.22, 0.09, 0, 0, 0, 0xffc21a);
    g.rotateX(Math.PI / 2); g.rotateY(a + Math.PI / 2);
    g.translate(cx + Math.cos(a) * (R + 0.03), cy + 0.55, cz - Math.sin(a) * (R + 0.03));
    P.push(g);
  }
  for (const s of [-1, 1]) {
    const a = -Math.PI / 2 + s * gapA;
    const x = cx + Math.cos(a) * (R + 0.4), z = cz - Math.sin(a) * (R + 0.4);
    P.push(blockG(0.6, 2.2, 0.6, x, cy, z, 0xd01c26, { r: 0.08, seg: 1 }));
    P.push(sphereG(0.36, x, cy + 2.5, z, 0xffc21a));
  }
  // Ränge (Tritt-/Setzstufen abwechselnd rot/violett, Goldkante) und Sitzplätze
  const rows = cfg.rows ?? 6, depth = cfg.rowDepth ?? 1.0, rise = cfg.rowRise ?? 0.55;
  const [a0, a1] = cfg.span ?? [-0.5, Math.PI + 0.5];
  const r00 = R + 1.4;
  const seats = [];
  for (let i = 0; i < rows; i++) {
    const r0 = r00 + i * depth, y = cy + (i + 1) * rise;
    P.push(sector(cx, cz, r0, r0 + depth, y, a0, a1, i % 2 ? 0x7a2a8a : 0xb01c2c, 64));
    P.push(sector(cx, cz, r0, r0, y - rise, a0, a1, i % 2 ? 0x5a1a6a : 0x8a1422, 64, rise));
    P.push(sector(cx, cz, r0 - 0.02, r0 + 0.1, y + 0.012, a0, a1, 0xffc21a, 64));
    const len = (a1 - a0) * (r0 + depth * 0.55), k = Math.floor(len / 0.95);
    for (let j = 0; j < k; j++) {
      const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, fr = h - Math.floor(h);
      if (fr < 0.16) continue;
      const a = a0 + (a1 - a0) * ((j + 0.5 + (fr - 0.5) * 0.3) / k);
      seats.push({ x: cx + Math.cos(a) * (r0 + depth * 0.55), y, z: cz - Math.sin(a) * (r0 + depth * 0.55), yaw: a + Math.PI, s: 0.85 + fr * 0.35, ear: fr > 0.62, ph: fr * 17 });
    }
  }
  const outerR = r00 + rows * depth;
  P.push(sector(cx, cz, outerR, outerR, cy, a0, a1, 0x2a0e30, 64, rows * rise + 2.4));
  bake(level, P, { castShadow: false });
  // Publikum: zwei Instanz-Gruppen (mit langen Ohren / mit runden Ohren), dunkle Silhouetten gegen das Licht
  const sil = 0x1c0e26;
  const mkPerson = (ears) => {
    const parts = [cylG(0.2, 0.3, 0.72, 0, 0, 0, sil, 6), sphereG(0.24, 0, 0.95, 0, sil, { ws: 7, hs: 5 })];
    if (ears) for (const s of [-1, 1]) parts.push(sphereG(0.075, s * 0.1, 1.36, 0, sil, { sy: 3.2, ws: 4, hs: 3 }));
    else for (const s of [-1, 1]) parts.push(sphereG(0.09, s * 0.17, 1.15, 0, sil, { ws: 4, hs: 3 }));
    return merge(parts);
  };
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const groups = [false, true].map((ears) => {
    const list = seats.filter((s) => s.ear === ears);
    const im = new THREE.InstancedMesh(mkPerson(ears), mat, Math.max(1, list.length));
    im.count = list.length;
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.name = 'publikum';
    addObject(level, owned(im));
    return { im, list };
  });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), E = new THREE.Euler();
  // Leuchtstäbe (Punkte, additiv) bei jedem fünften Gast
  const sticks = seats.filter((s, i) => i % 5 === 2);
  const spos = new Float32Array(Math.max(1, sticks.length) * 3), scol = new Float32Array(Math.max(1, sticks.length) * 3);
  const pal = [0xff4ad8, 0x4af0ff, 0xfff04a, 0x7aff6a].map((c) => new THREE.Color(c));
  sticks.forEach((s, i) => { const c = pal[i % 4]; scol[i * 3] = c.r; scol[i * 3 + 1] = c.g; scol[i * 3 + 2] = c.b; });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(scol, 3));
  const sm = new THREE.PointsMaterial({ size: 0.45, map: glowDot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(sg, sm);
  pts.frustumCulled = false;
  addObject(level, owned(pts));
  st.cheer = (k = 1, dur = 2) => { st.cheerT = Math.max(st.cheerT, dur); st.cheerK = Math.max(st.cheerK, k); };
  st.seats = seats.length;
  level.view.onFrame((dt, t) => {
    if (st.cheerT > 0) st.cheerT -= dt; else st.cheerK = Math.max(0, st.cheerK - dt);
    const ch = st.cheerT > 0 ? st.cheerK : 0;
    for (const g of groups) {
      g.list.forEach((s, i) => {
        const hop = ch > 0 ? Math.abs(Math.sin(t * 7 + s.ph)) * 0.32 * ch : Math.max(0, Math.sin(t * 1.6 + s.ph)) * 0.04;
        V.set(s.x, s.y + hop, s.z);
        E.set(0, s.yaw + Math.sin(t * 0.7 + s.ph) * 0.15, ch > 0 ? Math.sin(t * 9 + s.ph) * 0.12 : 0);
        Q.setFromEuler(E); S.setScalar(s.s);
        M.compose(V, Q, S);
        g.im.setMatrixAt(i, M);
      });
      g.im.instanceMatrix.needsUpdate = true;
    }
    sticks.forEach((s, i) => {
      const w = t * (ch > 0 ? 7 : 2.2) + s.ph;
      spos[i * 3] = s.x + Math.cos(w) * 0.25; spos[i * 3 + 1] = s.y + 1.55 + Math.sin(w) * 0.25 + (ch > 0 ? 0.3 : 0); spos[i * 3 + 2] = s.z;
    });
    sg.attributes.position.needsUpdate = true;
  });
  return st;
}

// ====================================================================== 4) Zug (3-Zug)
//
// Zug-Koordinate c: Meter entlang des Zugs nach vorn (−Z) ab dem Heck des letzten Wagens, gemessen beim Fahrtbeginn
// (Weltlage z = ZR − c). Haupt- und Parallelzug fahren gleich schnell (VT); das Bildfenster fährt etwas schneller und
// gleitet so am Zug entlang nach vorn (Fahrplan in Zug-Koordinaten: Abschnitte mit Gleit-Tempo r und Halte-Pausen, in
// denen das Fenster genau mit dem Zug fährt). Am Ende halten Fenster und Züge gemeinsam (Fenstermitte bei c_end).

export const ZUG = { VT: 6, ZP: 30, ZR: 14, XW: -3, ACCEL: 6, BRAKE: 3, GAP: 0.8 };
/** Weltpunkt (Fahrtbeginn) zu Zug-Koordinate c, seitlich x, Höhe y. */
export const Pz = (c, x = 0, y = 0) => [x, y, ZUG.ZR - c];
/** Pfadlänge des Fensterpfads (x = XW, Start bei z = ZP) zu Zug-Koordinate c beim Fahrtbeginn. */
export const Sz = (c) => ZUG.ZP - (ZUG.ZR - c);

/**
 * Fahrplan → Bildfenster: plan = [{ to: c, r } | { hold: s }], letzter Eintrag { to: cEnd, r } (Halt).
 * Rechnet mit demselben Tempo-Gesetz wie ScrollWindow (Anfahren accel, Bremsen 1,5 × accel) die Pfadlängen, an denen
 * das Tempo wechselt, und sucht das Fensterende so, dass die Fenstermitte nach dem gemeinsamen Halt genau über cEnd
 * steht (die Züge bremsen mit BRAKE und halten gleichzeitig mit dem Fenster). Liefert { start, end, speed, speeds,
 * D (Fahrstrecke der Züge bis zum Halt), T (s Fahrt), marks: [{ i, s, t, c }] }.
 */
export function solveTrainRide(o) {
  const { VT, ZP, ZR, ACCEL, BRAKE } = { ...ZUG, ...o };
  const cw0 = o.cw0, plan = o.plan;
  const s0 = ZP - (ZR - cw0);
  const dt = 1 / 120;
  const speeds = [], marks = [];
  let s = s0, v = 0, t = 0, k = 0, holdT = 0;
  const rOf = (it) => (it.hold !== undefined ? 0 : it.r);
  const base = VT + rOf(plan[0]);
  let target = base;
  const cNow = () => cw0 + (s - s0) - VT * t;
  // Wechselpunkte bis zum letzten Abschnitt
  for (let n = 0; n < 120 * 900 && k < plan.length - 1; n++) {
    const it = plan[k];
    const done = it.hold !== undefined ? holdT >= it.hold : cNow() >= it.to;
    if (done) {
      k++;
      holdT = 0;
      target = VT + rOf(plan[k]);
      speeds.push({ from: +s.toFixed(4), speed: target });
      marks.push({ i: k, s: +s.toFixed(2), t: +t.toFixed(2), c: +cNow().toFixed(2) });
      continue;
    }
    if (it.hold !== undefined) holdT += dt;
    t += dt;
    v = v < target ? Math.min(target, v + ACCEL * dt) : Math.max(target, v - ACCEL * dt * 1.5);
    s += v * dt;
  }
  // Fensterende so wählen, dass die Mitte nach dem Halt bei cEnd steht (Züge halten zugleich)
  const last = plan[plan.length - 1];
  const tail = last.to - cNow();
  let end = s + tail * (VT + last.r) / Math.max(0.2, last.r);
  let T = 0, D = 0;
  for (let it = 0; it < 10; it++) {
    const w = new ScrollWindow({ path: [[0, 0, ZP], [0, 0, -6000]], start: s0, end, speed: base, speeds, accel: ACCEL, delay: 0 }, [0, 0, 0]);
    let n = 0;
    while (w.state !== 'done' && n < 120 * 900) { w.step(dt); n++; }
    T = w.clock;
    D = VT * Math.max(0, T - VT / (2 * BRAKE));
    const cEnd = cw0 + (end - s0) - D;
    end += last.to - cEnd;
  }
  return { start: s0, end, speed: base, speeds, D, T, marks };
}

/**
 * Wagenreihe von hinten nach vorn: cars = [{ id, style, len, w?, top?, x?, gap?, parts?, model?, color? }] ab c0.
 * Liefert { list: [{ …car, c0, c1, cc }], byId } (Zug-Koordinaten).
 */
export function lineUp(cars, c0 = 0) {
  const list = [];
  let c = c0;
  for (const car of cars) {
    const len = car.len ?? (car.style === 'lok' ? 8.5 : 10);
    const it = { ...car, len, c0: c, c1: c + len, cc: c + len / 2 };
    list.push(it);
    c += len + (car.gap ?? ZUG.GAP);
  }
  return { list, byId: Object.fromEntries(list.map((x) => [x.id, x])) };
}

/**
 * Gleis in 32-m-Stücken (je Stück ein eigener Baustein `track` – so landet jedes Stück in seinem Abschnitt und wird
 * einzeln gekappt), Gerüst-Joche nur über den Schluchten. { x, z0, z1 (z0 > z1), gauge 2.1, gorges: [[zHoch, zTief]],
 * bottom: −40, buffer: 'end', start: false (Prellbock auch am Anfang) }
 */
export function trackChunks(o) {
  const out = [];
  const inGorge = (za, zb) => (o.gorges ?? []).some(([g0, g1]) => za <= g0 + 1e-6 && zb >= g1 - 1e-6);
  const cuts = new Set([o.z0, o.z1]);
  for (let z = Math.floor(o.z0 / 32) * 32; z > o.z1; z -= 32) if (z < o.z0) cuts.add(z);
  for (const [g0, g1] of o.gorges ?? []) { if (g0 < o.z0 && g0 > o.z1) cuts.add(g0); if (g1 < o.z0 && g1 > o.z1) cuts.add(g1); }
  const zs = [...cuts].sort((a, b) => b - a);
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    out.push({
      type: 'track', path: [[o.x, 0, za], [o.x, 0, zb]], gauge: o.gauge ?? 2.1,
      trestle: inGorge(za, zb) ? { bottom: o.bottom ?? -40, every: 8 } : false,
      buffer: zs.length === 2 && o.start ? 'both' : i === zs.length - 2 ? (o.buffer ?? 'end') : i === 0 && o.start ? 'start' : null,
    });
  }
  return out;
}

/** Teil auf einem Wagen (Wagen-Koordinaten dc vorn, dx rechts, y über der Schiene) → vehicle-part. */
export const part = (car, dc, dx, y, size, o = {}) => ({ pos: [dx, y, -dc], size, ...o });
/** Weltlage (Fahrtbeginn) eines Punkts auf einem Wagen. */
export const onCar = (car, dc, dx, y) => Pz(car.cc + dc, (car.x ?? 0) + dx, y);

/** Wagen → Baustein vehicle (fährt mit VT, hält nach D Metern). */
export function carSegment(car, ride, next = null) {
  const STY = { lok: [3, 3.96], wagen: [2.8, 3.75], flach: [3, 1.39], plain: [3, 1.39] };
  const [w, top] = STY[car.style] ?? [3, 1.39];
  const at = Sz(car.cc);
  // Übergang zum nächsten Wagen: unsichtbare Platte über die Kupplungslücke auf Höhe der niedrigeren Oberkante (Dach
  // an Dach, Deck an Deck, Dach → Deck) – man fällt nicht hindurch, und an einer hohen Wagenstirn ragt nichts über den
  // Kopf (Hinaufspringen bleibt frei). Zwischen zwei Personenwagen zusätzlich ein Faltenbalg (sichtbar).
  const L2 = car.len / 2, gap = car.gap ?? ZUG.GAP;
  const parts = [...(car.parts ?? [])];
  if (next && (next.x ?? 0) === (car.x ?? 0)) {
    const TOP = { wagen: [3.75, 2.2], lok: [1.26, 2.4], flach: [1.39, 2.6] };   // Oberkante am hinteren Ende, Breite (roof: Postwagen-Dach)
    const a = car.roof ? TOP.wagen : TOP[car.style] ?? TOP.flach, b = next.roof ? TOP.wagen : TOP[next.style] ?? TOP.flach;
    const y = Math.min(car.style === 'lok' ? 3.96 : a[0], b[0]), wd = Math.min(a[1], b[1]);
    parts.push({ pos: [0, y - 0.15, -(L2 + gap / 2)], size: [wd, 0.15, gap + 0.06], visible: false, tag: 'uebergang' });
  }
  if (car.style === 'wagen' && next?.style === 'wagen' && (next.x ?? 0) === (car.x ?? 0)) {
    parts.push({ pos: [0, 1.3, -(L2 + (car.gap ?? ZUG.GAP) / 2)], size: [2.1, 2.3, (car.gap ?? ZUG.GAP) + 0.06], color: 0x3a3a48, solid: false, tag: 'balg' });
  }
  return {
    type: 'vehicle', id: car.id, style: car.style, size: [car.w ?? w, car.top ?? top, car.len], at, speed: ZUG.VT,
    stop: at + ride.D, brake: ZUG.BRAKE, offset: [(car.x ?? 0) - ZUG.XW, 0], parts,
    ...(car.model !== undefined ? { model: car.model } : {}), ...(car.deck !== undefined ? { deck: car.deck } : {}),
    ...(car.color ? { color: car.color } : {}),
  };
}

// ------------------------------------------------------------------ fahrende Röhre (auf einem Wagen)

/**
 * Röhre auf einem Wagen (attach): Ducken darauf → hinab und aus der Zielröhre (auch auf einem anderen fahrenden
 * Wagen) wieder heraus. `closed` = Deckel zu (öffnet per open(), z. B. beim Zughalt). Die Figur fährt im Rohr mit
 * dem Wagen mit (Mitfahr-Regel im Level-Haken), beim Austritt erbt sie das Wagentempo.
 * { id, pos, attach, target: Id | [x, y, z], height 1.1, radius 0.85, color, closed, lid }
 */
export class ZugRoehre extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'zugroehre');
    this.R = spec.radius ?? 0.85;
    this.H = spec.height ?? 1.1;
    this.touch = false;
    this.open = !spec.closed;
    this.openK = this.open ? 1 : 0;
    this.knock = 0;
    this.uses = 0;
    const self = this;
    this.info = {
      pipe: true, enterRadius: this.R * 0.7, zug: this,
      get x() { return self.pos.x; }, get z() { return self.pos.z; }, get top() { return self.pos.y + self.H; },
      enter: (pl) => self.enter(pl),
    };
    const p = this.pos;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: this.R + 0.08, y0: p.y, y1: p.y + this.H, pipe: this.info, tag: 'zugroehre' });
    if (level.view) this.buildView(hex(spec.color ?? 0x2fbf4a));
  }

  get vehicle() { return this.spec.attach ? this.level.named.get(this.spec.attach) : null; }

  buildView(color) {
    const root = new THREE.Group();
    root.name = 'zugroehre';
    const g = pipeGeo(0, 0, 0, this.H, this.R, color);
    const body = new THREE.Mesh(g, this.level.view.mats.stone);
    body.castShadow = false;
    root.add(body);
    if (this.spec.lid) {
      this.lid = new THREE.Group();
      this.lid.position.set(0, this.H + 0.02, -this.R * 0.92);
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(this.R * 0.98, this.R * 0.98, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.3, metalness: 0.7 }));
      disk.position.set(0, 0.06, this.R * 0.92);
      this.lid.add(disk);
      root.add(this.lid);
    }
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    this.arrow = new THREE.Group();
    const coneG = new THREE.ConeGeometry(0.3, 0.45, 4).toNonIndexed();
    coneG.rotateX(Math.PI);
    const stemG = new THREE.BoxGeometry(0.16, 0.38, 0.16).toNonIndexed();
    stemG.translate(0, 0.38, 0);
    for (const gg of [coneG, stemG]) gg.deleteAttribute('uv');
    this.arrow.add(new THREE.Mesh(mergeGeometries([coneG, stemG], false), arrowMat));
    this.arrow.visible = false;
    root.add(this.arrow);
    owned(root);
    this.setModel({ root, update: () => {}, dispose: () => g.dispose() });
  }

  setOpen(on) {
    if (this.open === on) return;
    this.open = on;
    if (on) { this.level.sfx('gate'); this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H + 0.4, z: this.pos.z }, 14); }
  }

  enter(pl) {
    if (!this.open) { if (this.knock <= 0) { this.knock = 0.5; this.level.sfx('blockhit'); } return; }
    const t = this.spec.target;
    const o = typeof t === 'string' ? this.level.named.get(t) : null;
    const exit = o?.info ?? (o?.pipe ? o : null);
    this.uses++;
    pl.enterPipe({ x: this.pos.x, z: this.pos.z, top: this.pos.y + this.H, zug: this, exit: exit ?? { pos: Array.isArray(t) ? t : [this.pos.x, this.pos.y + 3, this.pos.z] } });
  }

  update(dt) { if (this.knock > 0) this.knock -= dt; }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    this.openK += ((this.open ? 1 : 0) - this.openK) * Math.min(1, (dt || 0) * 6);
    if (this.lid) this.lid.rotation.x = -this.openK * 1.9;
    this.arrow.visible = this.open && (!!this.spec.arrow || !!this.spec.lid) && this.openK > 0.5;
    this.arrow.position.set(0, this.H + 1.2 + Math.abs(Math.sin(t * 4)) * 0.35, 0);
    this.arrow.rotation.y = t * 1.5;
  }

  info() { return { open: this.open, uses: this.uses, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

// ------------------------------------------------------------------ Sprechblase, Krümel

function bubbleSprite(text, sub) {
  const tex = canvasTex(512, 256, (g) => {
    const r = 46;
    g.fillStyle = '#ffffff'; g.strokeStyle = '#3a2a6a'; g.lineWidth = 10;
    g.beginPath();
    g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
    g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
    g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#3a2a6a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 60px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
    g.fillText(text, 256, sub ? 82 : 100);
    if (sub) { g.font = 'bold 34px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = '#d0402a'; g.fillText(sub, 256, 142); }
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(1.9, 0.95, 1);
  sp.renderOrder = 12;
  return sp;
}

const HERO_NAME = { lotti: 'Lotti', greta: 'Greta' };

/**
 * Krümel (Pflaumes kleiner Kaninchen-Freund) – fährt auf einem Wagen mit (Lage = Wagen + Versatz), steckt anfangs in
 * einer Kiste des Brummbär-Zugs (unsichtbar, ruft „Hilfe!“), springt beim Befreien heraus, jubelt, schenkt den Stern und
 * hüpft danach in die Rückfahr-Röhre (fährt mit uns weiter – am Ziel wartet er). opts: { veh (Fahrzeug-Id), dc, dx, y,
 * state: 'crate' | 'wave', pipe: Id der Röhre, in die er hüpft }. Methoden: free(). Laufzeit: state, x, y, z.
 */
export class KruemelZug {
  constructor(level, o) {
    this.level = level;
    this.o = o;
    this.state = o.state ?? 'crate';
    this.t = 0;
    this.bubbleT = 0;
    this.off = { x: o.dx ?? 0, y: o.y ?? 1.39, z: -(o.dc ?? 0) };
    this.x = 0; this.y = 0; this.z = 0;
    this.yaw = -Math.PI / 2;
    this.hop = 0;
    level.onStep((dt) => this.step(dt));
    if (!level.view) return;
    this.model = getModel('kruemel');
    this.root = new THREE.Group();
    this.root.name = 'kruemel-zug';
    this.root.add(this.model.root);
    this.model.root.scale.setScalar(o.scale ?? 1.35);
    addObject(level, this.root, (dt) => this.render(dt));
    this.shadowPos = new THREE.Vector3();
    level.view.shadows.add({ pos: this.shadowPos, radius: 0.32, alive: () => true, visible: () => this.root.visible });
  }

  get veh() { return this.level.named.get(this.o.veh); }

  say(text, sub, time = 3) {
    if (!this.root) return;
    if (this.bubble && this.bubbleText !== text + sub) { this.root.remove(this.bubble); this.bubble.material.map?.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    if (!this.bubble) { this.bubble = bubbleSprite(text, sub); this.bubble.position.set(0, 1.6, 0); this.root.add(this.bubble); }
    this.bubbleText = text + sub;
    this.bubbleT = time;
  }

  free() {
    if (this.state !== 'crate') return;
    this.state = 'out';
    this.t = 0;
    this.level.sfx('jump');
  }

  step(dt) {
    this.t += dt;
    if (this.bubbleT > 0) this.bubbleT -= dt;
    const v = this.veh;
    if (v) { this.x = v.pos.x + this.off.x; this.y = v.pos.y + this.off.y; this.z = v.pos.z + this.off.z; }
    const p = this.level.player;
    const d = p ? Math.hypot(p.pos.x - this.x, p.pos.z - this.z) : 99;
    if (this.state === 'crate') {
      if (d < 7 && this.bubbleT <= 0) this.say('Hilfe!', 'Ich stecke in der Kiste!', 2.6);
    } else if (this.state === 'out') {
      // Sprung aus der Kiste (Bogen 1,6 m hoch) und Freudensprünge
      this.hop = Math.max(0, Math.sin(Math.min(1, this.t / 0.7) * Math.PI)) * 1.6;
      if (this.t > 0.7) {
        this.state = 'cheer'; this.t = 0;
        this.say(`Danke, ${HERO_NAME[p?.hero] ?? 'Lotti'}!`, 'Hier, für dich!', 4);
        this.level.sfx('victory');
        this.o.onFree?.(this);
      }
    } else if (this.state === 'cheer') {
      this.hop = Math.abs(Math.sin(this.t * 6)) * 0.35;
      if (p) this.yaw = Math.atan2(-(p.pos.z - this.z), p.pos.x - this.x);
      if (this.t > 4.2 && this.o.pipe) { this.state = 'pipe'; this.t = 0; this.say('Ich fahr mit euch!', '', 2); }
    } else if (this.state === 'pipe') {
      // hüpft zur Röhre und verschwindet darin
      const pp = this.level.named.get(this.o.pipe);
      if (pp) {
        const tx = pp.pos.x - (v?.pos.x ?? 0), tz = pp.pos.z - (v?.pos.z ?? 0);
        const dx = tx - this.off.x, dz = tz - this.off.z, l = Math.hypot(dx, dz);
        const sp = 3 * dt;
        if (l > 0.2) { this.off.x += (dx / l) * Math.min(sp, l); this.off.z += (dz / l) * Math.min(sp, l); this.yaw = Math.atan2(-dz, dx); this.hop = Math.abs(Math.sin(this.t * 9)) * 0.3; }
        else { this.hop = Math.max(0, 1.4 - this.t * 0.5) ; this.off.y = Math.max(pp.pos.y - (v?.pos.y ?? 0) - 0.6, this.off.y - dt * 2.5); if (this.off.y < pp.pos.y - (v?.pos.y ?? 0)) { this.state = 'gone'; this.level.sfx('pipe'); } }
      } else this.state = 'gone';
    }
  }

  render(dt) {
    if (!this.root) return;
    this.root.visible = this.state !== 'crate' && this.state !== 'gone';
    if (this.bubble) { this.bubble.visible = this.bubbleT > 0; this.bubble.position.y = 1.6 + Math.sin(this.t * 3) * 0.04; }
    // In der Kiste: nur die Sprechblase (am Kistenort) zeigen
    if (this.state === 'crate') {
      this.root.visible = this.bubbleT > 0;
      this.model.root.visible = false;
    } else this.model.root.visible = true;
    this.root.position.set(this.x, this.y + this.hop, this.z);
    this.model.root.rotation.y = this.yaw;
    this.shadowPos.set(this.x, this.y, this.z);
    const anim = this.state === 'cheer' || this.state === 'out' ? 'cheer' : this.state === 'pipe' ? 'hop' : 'idle';
    this.model.update(Math.min(0.1, dt || 0), { anim });
  }
}

// ------------------------------------------------------------------ Postwagen mit Ausschnitt

/**
 * Teile (Kollision) eines begehbaren Postwagens auf Flachwagen-Basis (Deck 1,39): Seitenwände, Stirnwand hinten,
 * Stirnwand vorn mit Tür, Dach (3,6–3,75) mit Dachluke hinten. Alle Teile unsichtbar (Optik: postwagenBody).
 * { len 10, hatch: [dcVorn, dcHinten] (Wagen-Koordinaten), door: 1.2 }
 */
export function postwagenParts(o = {}) {
  const L2 = (o.len ?? 10) / 2, D = 1.39, T = 3.6, R = 3.75, w = 1.4;
  const [h0, h1] = o.hatch ?? [1.6, 3.4];          // Luke von dc −h1 … −h0 (hinten)
  const dw = (o.door ?? 1.3) / 2;
  const P = (pos, size, tag) => ({ pos, size, visible: false, tag });
  return [
    P([-w + 0.08, D, 0], [0.16, T - D, 2 * L2], 'post:wand'),
    P([w - 0.08, D, 0], [0.16, T - D, 2 * L2], 'post:wand'),
    P([0, D, L2 - 0.08], [2 * w, T - D, 0.16], 'post:wand'),
    P([-(w + dw) / 2, D, -L2 + 0.08], [w - dw, T - D, 0.16], 'post:wand'),
    P([(w + dw) / 2, D, -L2 + 0.08], [w - dw, T - D, 0.16], 'post:wand'),
    P([0, D + 1.85, -L2 + 0.08], [2 * dw, T - D - 1.85, 0.16], 'post:wand'),
    // Dach: vorn bis zur Luke, hinter der Luke, Streifen neben der Luke
    P([0, T, (-L2 + h0) / 2], [2 * w, R - T, L2 + h0], 'post:dach'),
    P([0, T, (h1 + L2) / 2], [2 * w, R - T, L2 - h1], 'post:dach'),
    P([-(w + 0.8) / 2, T, (h0 + h1) / 2], [w - 0.8, R - T, h1 - h0], 'post:dach'),
    P([(w + 0.8) / 2, T, (h0 + h1) / 2], [w - 0.8, R - T, h1 - h0], 'post:dach'),
  ];
}

/**
 * Optik des Postwagens (am Modell des Fahrzeugs, fährt mit): blaue Wände mit Cremestreifen und leuchtenden Fenstern,
 * Innenraum mit Holzboden, Postsäcken, Regal; Bogendach mit offener Luke. Ist eine Figur im Wagen, werden Dach und
 * Rückwand durchsichtig (Ausschnitt-Ansicht). Rückgabe { inside() } für Tests.
 */
export function postwagenBody(level, vehId, o = {}) {
  const veh = level.named.get(vehId);
  if (!veh) return null;
  const L2 = (o.len ?? 10) / 2, D = 1.39, T = 3.6, w = 1.4;
  const [h0, h1] = o.hatch ?? [1.6, 3.4];
  const st = { k: 0, inside: false };
  const isInside = () => {
    const p = level.player;
    if (!p) return false;
    const lx = p.pos.x - veh.pos.x, lz = p.pos.z - veh.pos.z, ly = p.pos.y - veh.pos.y;
    return Math.abs(lx) < w && Math.abs(lz) < L2 + 0.2 && ly > D - 0.3 && ly < T - 0.2;
  };
  level.onStep((dt) => { st.inside = isInside(); st.k = st.inside ? Math.min(1, st.k + dt / 0.35) : Math.max(0, st.k - dt / 0.35); });
  if (!level.view || !veh.model) return st;
  const solid = [], fade = [], glow = [];
  const blue = 0x2a4ac8, blueDk = 0x1a2a88, cream = 0xfff2d6, gold = 0xffc21a;
  // Seitenwände mit Fenstern (Fenster leuchten), Cremestreifen
  for (const s of [-1, 1]) {
    solid.push(blockG(0.14, 0.9, 2 * L2, s * (w - 0.07), D, 0, blue, { r: 0.02, seg: 0 }));
    solid.push(blockG(0.15, 0.12, 2 * L2, s * (w - 0.07), D + 0.9, 0, cream, { r: 0, seg: 0 }));
    fade.push(blockG(0.14, T - D - 1.02, 2 * L2, s * (w - 0.07), D + 1.02, 0, blue, { r: 0.02, seg: 0 }));
    for (let i = 0; i < 4; i++) glow.push(blockG(0.16, 0.7, 1.2, s * (w - 0.07), D + 1.2, -L2 + 1.5 + i * 2.35, 0xffd27a, { r: 0, seg: 0 }));
  }
  // Stirnwände (vorn mit Tür), Rückwand blendet aus
  for (const s of [-1, 1]) solid.push(blockG(w - 0.65, T - D, 0.14, s * (w + 0.65) / 2, D, -L2 + 0.07, blueDk, { r: 0.02, seg: 0 }));
  solid.push(blockG(1.3, T - D - 1.85, 0.14, 0, D + 1.85, -L2 + 0.07, blueDk, { r: 0.02, seg: 0 }));
  fade.push(blockG(2 * w, T - D, 0.14, 0, D, L2 - 0.07, blueDk, { r: 0.02, seg: 0 }));
  // Innen: Holzboden, Postsäcke, Paketregal, Laterne
  solid.push(blockG(2 * w - 0.3, 0.02, 2 * L2 - 0.3, 0, D + 0.005, 0, 0x8a5a36, { r: 0, seg: 0 }));
  for (const [x, z, s] of [[-0.9, 3.8, 0.5], [-0.95, 3.0, 0.42], [0.95, 4.2, 0.46]]) solid.push(sphereG(s, x, D + s * 0.8, z, 0xd8c8a0, { sy: 0.8, ws: 8, hs: 6 }));
  solid.push(blockG(0.5, 1.6, 2.4, -1.05, D, -1.0, 0x6a4028, { r: 0.03, seg: 0 }));
  for (const [y, z, c] of [[0.1, -1.6, 0xc8783a], [0.1, -0.5, 0xd8a050], [0.65, -1.2, 0xb86a3a], [1.2, -0.7, 0xe0b060]]) solid.push(blockG(0.42, 0.42, 0.55, -1.0, D + y, z, c, { r: 0.04, seg: 0 }));
  // Dach (Bogen) mit Luke: Teile vor/hinter der Luke und neben ihr
  const roof = (z0, z1, x0, x1) => {
    const len = z1 - z0, cx = (x0 + x1) / 2, ww = x1 - x0;
    const g = new THREE.CylinderGeometry(1.6, 1.6, len, 16, 1, false, -Math.asin(Math.min(1, ww / 3.2)), 2 * Math.asin(Math.min(1, ww / 3.2))).toNonIndexed();
    g.rotateX(Math.PI / 2);
    g.translate(cx, T - 1.42, (z0 + z1) / 2);
    return colorize(g, (p, n, out) => mixc(L(0x6a6e7e), L(0xa8acba), smooth(0, 1, n.y), out));
  };
  fade.push(roof(-L2, h0, -w, w), roof(h1, L2, -w, w));
  fade.push(blockG(w - 0.8, 0.12, h1 - h0, -(w + 0.8) / 2, T + 0.02, (h0 + h1) / 2, 0x8a8e9e, { r: 0, seg: 0 }), blockG(w - 0.8, 0.12, h1 - h0, (w + 0.8) / 2, T + 0.02, (h0 + h1) / 2, 0x8a8e9e, { r: 0, seg: 0 }));
  // Lukenrahmen (Gold) und offene Klappe
  solid.push(blockG(1.8, 0.1, 0.12, 0, T + 0.12, h0, gold, { r: 0, seg: 0 }), blockG(1.8, 0.1, 0.12, 0, T + 0.12, h1, gold, { r: 0, seg: 0 }));
  const flap = blockG(1.6, 0.08, 1.7, 0, 0, -0.85, 0x5a5e6e, { r: 0.02, seg: 0 });
  flap.rotateX(-1.9); flap.translate(0, T + 0.15, h0);
  solid.push(flap);
  const mk = (parts, mat) => { const m = new THREE.Mesh(merge(parts), mat); m.castShadow = true; m.receiveShadow = true; m.userData.owned = true; veh.model.root.add(m); return m; };
  mk(solid, level.view.mats.world);
  const fadeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, opacity: 1 });
  const fm = mk(fade, fadeMat);
  const gm = mk(glow, level.view.mats.glow);
  gm.castShadow = false;
  level.view.onFrame(() => {
    fadeMat.opacity = 1 - 0.85 * ease(st.k);
    fadeMat.depthWrite = st.k < 0.5;
    fm.castShadow = false;
  });
  return st;
}

// ------------------------------------------------------------------ Mitfahr-Regeln und Zug-Haken

/** Fahrzeug, über dessen Grundfläche p liegt (Höhe Deck − below … Deck + 9), sonst null. */
function vehicleUnder(vehicles, p, below = 1.2) {
  let best = null, bd = Infinity;
  for (const v of vehicles) {
    if (v.removed) continue;
    const hx = v.size.w / 2 + 0.6, hz = v.size.d / 2 + 0.6;
    if (Math.abs(p.x - v.pos.x) > hx || Math.abs(p.z - v.pos.z) > hz) continue;
    const top = v.pos.y + v.size.h;
    if (p.y < v.pos.y - below || p.y > top + 9) continue;
    const d = Math.abs(p.y - top);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

/**
 * Level-Haken 3-Zug (in LEVEL.setup aufrufen). Regeln je Schritt (level.onStep, nach den Fahrzeugen, vor der Figur):
 *  · Neu entstehende Dinge auf/über einem Wagen fahren mit (Power-ups, Sterne, Münzen, Feuerkugeln, Suchköpfe,
 *    vom Turm gefallene Pilzlinge …): `attach` an den Wagen darunter bzw. an den Wagen ihres Schützen (owner.spec.attach).
 *  · Riesenprojektile vom Parallelzug fliegen relativ zum Zug quer; reitet man auf einem, trägt seine Oberseite mit
 *    Wagen- und Flugbewegung (gemeinsamer mover).
 *  · Tänzelnde Gegner (Feuer-Werfer) tänzeln um einen Punkt, der mit dem Wagen fährt (home folgt dem Wagen).
 *  · Röhren auf Wagen: die Figur fährt im Rohr mit, beim Austritt erbt sie das Wagentempo.
 * Rückgabe: Zustand { vehicles, adopted, pipeRides } (level._zug).
 */
export function zugRules(level) {
  const st = level._zug = { vehicles: [], seen: new WeakSet(), adopted: 0, pipeRides: 0, pipeVeh: null, wasPipe: false, combo: new Map() };
  let init = false;
  const attachTo = (e, v) => {
    if (!v || !e.spec) return;
    e.spec.attach = v.spec.id;
    v.scanned = -1;
    st.adopted++;
  };
  level.onStep(() => {
    if (!init) {
      init = true;
      st.vehicles = level.entities.filter((e) => e.kind === 'vehicle' && e.spec?.id);
      // beim Aufbau entstandene Sterne (Pilzlingsturm trägt einen) gehören zum Wagen darunter
      for (const e of level.entities) {
        st.seen.add(e);
        if (e.kind === 'star' && !e.spec?.attach) attachTo(e, vehicleUnder(st.vehicles, e.pos));
      }
    }
    const ents = level.entities;
    // neue Entitäten übernehmen
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (st.seen.has(e)) continue;
      st.seen.add(e);
      if (e.kind === 'vehicle' || e.spec?.attach || e.removed || e.spec?.noAttach) continue;
      const ow = e.spec?.owner ?? e.owner;
      const ov = ow?.spec?.attach ? level.named.get(ow.spec.attach) : null;
      attachTo(e, ov ?? vehicleUnder(st.vehicles, e.pos));
    }
    // home tänzelnder Gegner fährt mit; Riesenprojektile: gemeinsamer mover (Wagen + Flug)
    for (const v of st.vehicles) {
      const m = v.mover;
      if (!m || (!m.dx && !m.dz && !m.dy)) continue;
      for (const e of v.attached) {
        if (e.home?.isVector3 && e.kind !== 'vehicle') { e.home.x += m.dx; e.home.y += m.dy; e.home.z += m.dz; }
        if (e.kind === 'riesenprojektil' && e.mover && e.shapeId !== null && e.shapeId !== undefined) {
          const sh = level.world.get(e.shapeId);
          if (!sh) continue;
          let c = st.combo.get(e);
          if (!c) { c = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0 }; st.combo.set(e, c); }
          const own = e.mover;
          c.dx = m.dx + own.dx; c.dy = m.dy + own.dy; c.dz = m.dz + own.dz;
          c.vx = m.vx + own.vx; c.vy = m.vy + own.vy; c.vz = m.vz + own.vz;
          sh.mover = c;
        }
      }
    }
    // Figur im Rohr einer fahrenden Röhre: mit dem Wagen mitnehmen; beim Austritt Wagentempo erben
    const p = level.player;
    if (!p) return;
    const sc = p.script;
    if (p.mode === 'script' && sc?.type === 'pipe') {
      const pipe = sc.phase === 'up' ? sc.exit : sc.pipe;
      const veh = pipe?.zug?.vehicle ?? null;
      if (veh?.mover) { const m = veh.mover; p.pos.x += m.dx; p.pos.y += m.dy; p.pos.z += m.dz; }
      st.pipeVeh = sc.phase === 'up' ? veh : (sc.exit?.zug?.vehicle ?? null);
      if (!st.wasPipe) st.pipeRides++;
      st.wasPipe = true;
    } else if (st.wasPipe) {
      st.wasPipe = false;
      const veh = st.pipeVeh;
      st.pipeVeh = null;
      const arch = level.archetype;
      if (veh?.mover && p.mode === 'air' && arch?.fstate) {
        const inh = arch.fstate(p).inh;
        inh.x = veh.mover.vx; inh.z = veh.mover.vz;
      }
    }
  });
  return st;
}

/**
 * Budget auf der langen Strecke: Wagen und alles, was auf ihnen mitfährt (attach), wird nur in der Nähe des Blickziels
 * gezeichnet (|dz| < show, |dx| < 40; die Kamera sieht ≈ 30 m voraus) und wirft den Sonnenschatten nur nahe am
 * Blickziel (|dz| < shadow). Je Bild nach den Entitäten (deren render setzt die Sichtbarkeit selbst nicht zurück).
 */
/** Ersatzkörper für ferne Wagen (wenige Dreiecke, Vertexfarben; lokal: Ursprung Schiene unter der Mitte, vorn −z). */
function carProxyGeo(style, L) {
  const P = [];
  const bog = (y = 0.28) => { for (const s of [-1, 1]) P.push(box(2.2, 0.5, 1.7, 0, y, s * (L / 2 - 1.9), 0x1a1a22, { r: 0, seg: 0 })); };
  if (style === 'lok') {
    P.push(box(2.6, 0.8, L - 0.3, 0, 0.85, 0, 0x2a2a34, { r: 0, seg: 0 }));
    P.push(cylG(1.0, 1.0, 4.6, 0, 2.2, -1.2, 0xd8283a, 10, { rx: Math.PI / 2, center: true }));
    P.push(cylG(1.04, 1.04, 0.8, 0, 2.2, -3.6, 0x1a1a22, 10, { rx: Math.PI / 2, center: true }));
    P.push(cylG(0.42, 0.3, 1.15, 0, 3.0, -3.4, 0x1a1a22, 7));
    P.push(box(2.6, 2.6, 2.7, 0, 2.45, 2.4, 0xd8283a, { r: 0.06, seg: 0 }), box(2.9, 0.25, 3.0, 0, 3.84, 2.4, 0x1a1a22, { r: 0, seg: 0 }));
    bog(0.4);
  } else if (style === 'flach') {
    P.push(box(2.5, 0.6, L - 0.4, 0, 0.75, 0, 0x2a2a34, { r: 0, seg: 0 }), box(3, 0.34, L, 0, 1.22, 0, 0xb86f3a, { r: 0, seg: 0, topColor: 0xc88a50 }));
    bog();
  } else {
    const body = style === 'post' ? 0xa8282a : 0x2a4ad8;
    P.push(box(2.5, 0.55, L - 0.6, 0, 0.75, 0, 0x2a2a34, { r: 0, seg: 0 }));
    P.push(box(2.8, 2.3, L - 0.2, 0, 2.1, 0, body, { r: 0, seg: 0 }));
    if (style !== 'post') P.push(box(2.84, 0.55, L - 1.0, 0, 2.35, 0, 0xffd27a, { r: 0, seg: 0 }));
    P.push(box(2.86, 0.2, L - 0.25, 0, 1.6, 0, 0xf6e6c0, { r: 0, seg: 0 }));
    P.push(box(2.7, 0.52, L, 0, 3.49, 0, 0x5e5e6c, { r: 0.2, seg: 1 }));
    bog();
  }
  return merge(P);
}

/**
 * Zug-Budget je Bild: Wagen und mitfahrende Entitäten außerhalb der Sichtpyramide (plus Schattenlänge) ausblenden,
 * Sonnenschatten nur nahe am Blickziel, Räder/Stangen nur nahe an der Kamera; ferne Wagen (> far m) als Ersatzkörper
 * (eine Instanzgruppe je Bauart statt eines Modells je Wagen). o = { shadow: 20, wheels: 24, far: 32 }
 */
export function trainCull(level, o = {}) {
  if (!level.view) return null;
  const shadow = o.shadow ?? 20, wheels = o.wheels ?? 24, farLod = o.far ?? 32;
  const allowed = new WeakMap();
  const st = { hidden: 0, wheelsOff: 0, proxies: 0 };
  const fr = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere(), M = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  const post = level.data.zug?.post;
  const kind = (e) => (e.spec?.id === post ? 'post' : e.style === 'lok' ? 'lok' : e.style === 'flach' ? 'flach' : 'wagen');
  let proxy = null;
  const build = () => {
    proxy = {};
    const vehs = level.entities.filter((e) => e.kind === 'vehicle' && e.model);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    for (const k of ['wagen', 'flach', 'lok', 'post']) {
      const list = vehs.filter((e) => kind(e) === k);
      if (!list.length) continue;
      const m = new THREE.InstancedMesh(carProxyGeo(k, list[0].size.d), mat, list.length);
      m.name = `zug-ersatz:${k}`;
      m.frustumCulled = false;
      m.castShadow = false;
      for (let i = 0; i < list.length; i++) { m.setMatrixAt(i, Z); list[i]._proxy = { m, i }; }
      addObject(level, owned(m));
      proxy[k] = m;
    }
  };
  level.view.onFrame(() => {
    if (!proxy) build();
    const view = level.view, cam = view.camera, tg = view.rig.target, cp = cam.position;
    cam.updateMatrixWorld();
    fr.setFromProjectionMatrix(pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let hidden = 0, off = 0, px = 0;
    for (const e of level.entities) {
      if (!e.model || !(e.kind === 'vehicle' || e.spec?.attach)) continue;
      const root = e.model.root;
      const veh = e.kind === 'vehicle';
      // Sichtpyramide (+ Schattenlänge der tief stehenden Sonne)
      sph.center.set(e.pos.x, e.pos.y + (veh ? 2 : 0.8), e.pos.z);
      sph.radius = (veh ? Math.hypot(e.size.d / 2, 2.4) : 1.6) + 4;
      const half = veh ? e.size.d / 2 : 0;
      const dc = Math.max(0, Math.hypot(e.pos.x - cp.x, e.pos.z - cp.z) - half);
      // mitfahrende Entitäten (Gegner, Kisten, Röhren) weit oben im Bild: erst ab o.attached m zeichnen
      const out = !fr.intersectsSphere(sph) || Math.abs(e.pos.x - tg.x) > 45 || (!veh && dc > (o.attached ?? 1e9));
      const lod = veh && !out && dc > farLod && e._proxy;
      if (veh && e._proxy) {
        if (lod) { M.makeTranslation(e.pos.x, e.pos.y, e.pos.z); e._proxy.m.setMatrixAt(e._proxy.i, M); px++; } else e._proxy.m.setMatrixAt(e._proxy.i, Z);
      }
      if (out || lod) { if (root.visible) e._culled = true; root.visible = false; hidden++; continue; }
      if (e._culled) { e._culled = false; root.visible = e.hidden !== true; }
      const dz = Math.max(0, Math.abs(e.pos.z - tg.z) - half), dx = Math.abs(e.pos.x - tg.x);
      const near = dz < shadow && dx < 26;
      root.traverse((m) => {
        if (!m.isMesh) return;
        let a = allowed.get(m);
        if (a === undefined) { a = m.castShadow; allowed.set(m, a); }
        m.castShadow = a && near;
      });
      // Räder und Stangen (Instanzen unter dem Wagenkasten) nur nah an der Kamera
      if (veh) {
        if (!e._inst) { e._inst = []; root.traverse((m) => { if (m.isInstancedMesh && m.count > 1) e._inst.push(m); }); }
        const show = dc < wheels;
        for (const m of e._inst) m.visible = show;
        if (!show) off++;
      }
    }
    for (const m of Object.values(proxy)) { m.instanceMatrix.needsUpdate = true; m.visible = px > 0; }
    st.hidden = hidden;
    st.wheelsOff = off;
    st.proxies = px;
  });
  return st;
}

/**
 * Schattenpass der Heldin: kleine Teile (Hände, Schuhe, Knöpfe, Augen – Kugelradius < minR) werfen keinen eigenen
 * Sonnenschatten (liegen ohnehin im Schatten des Körpers); spart ≈ 10 Zeichenaufrufe. Je Bild (Kostümwechsel).
 */
export function heroShadowDiet(level, minR = 0.12) {
  if (!level.view) return;
  let hero = null;
  const sc = new THREE.Vector3();
  level.view.onFrame(() => {
    if (!hero || !hero.parent) hero = level.view.three.getObjectByName('heldin');
    if (!hero) return;
    hero.traverse((m) => {
      if (!m.isMesh || !m.castShadow) return;
      const g = m.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      m.getWorldScale(sc);
      if (g.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) < minR) m.castShadow = false;
    });
  });
}

/**
 * Himmel-Kulisse (Bergkranz, Waldkranz, Wolken: je ≥ 4000 Dreiecke) nur zeichnen, wenn der obere Bildrand über den
 * Horizont reicht – bei der steilen Zugkamera liegt der Horizont außerhalb des Bildes (spart ≈ 58 k Dreiecke).
 */
export function skyDiet(level, o = {}) {
  if (!level.view) return null;
  let heavy = null;
  const dir = new THREE.Vector3();
  const st = { hidden: false };
  level.view.onFrame(() => {
    const view = level.view, cam = view.camera;
    if (!heavy) {
      heavy = [];
      view.three.getObjectByName('himmel')?.traverse((m) => {
        if (!m.isMesh || !m.geometry) return;
        const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1);
        if (n >= (o.min ?? 4000)) heavy.push({ m, vis: m.visible });
        // Bodenebene des Themas (y −8) verdeckte die tieferen Schluchten: das Gelände deckt alles Sichtbare ab
        if (o.ground !== false && n <= 2 && m.material?.isMeshStandardMaterial) m.visible = false;
      });
    }
    cam.getWorldDirection(dir);
    const top = Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180 / Math.PI + cam.fov / 2;
    const hide = top < (o.margin ?? -3);
    if (hide !== st.hidden) { st.hidden = hide; for (const h of heavy) h.m.visible = hide ? false : h.vis; }
  });
  return st;
}

// ------------------------------------------------------------------ Kulisse: Statik nur nah zeichnen (Budget)

/**
 * Statische Abschnitte entlang der langen Strecke: je Bild nur zeichnen, was vor der Kamera und nicht im Nebel liegt
 * (Quader gegen Sichtpyramide), Sonnenschatten nur nahe am Blickziel (±28 m). Wie levels/w2/_helpers_d.js (StaticCull).
 */
export class StaticCullE {
  constructor(level, o = {}) {
    this.level = level;
    this.o = o;
    const view = level.view;
    this.range = o.shadowRange ?? 28;
    // erst im ersten Bild erfassen: levelSetupE verschmilzt die im Haken gebauten Teile erst nach dem Haken
    this.items = null;
    this.frustum = new THREE.Frustum();
    this.pv = new THREE.Matrix4();
    view.onFrame(() => this.update());
  }

  collect() {
    const sb = this.level.view.static;
    // Abschnitts-Meshes gleichen Materials zu einem verschmelzen (Schattenwerfer und Nicht-Schattenwerfer): ein
    // Zeichenaufruf je Abschnitt und Material; Sonnenschatten nur in den Abschnitten, die shadowKeep(Quader) wünscht
    if (sb && this.o.merge) {
      const groups = new Map();
      for (const m of sb.meshes) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox, key = `${Math.floor(-(b.min.z + b.max.z) / 2 / 32)}|${m.material.uuid}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(m);
      }
      for (const list of groups.values()) {
        const host = list[0];
        if (list.length > 1) {
          const g = mergeGeometries(list.map((m) => m.geometry), false);
          if (!g) continue;
          for (const m of list) m.geometry.dispose();
          host.geometry = g;
          for (const m of list.slice(1)) { m.parent?.remove(m); sb.meshes.splice(sb.meshes.indexOf(m), 1); if (sb.stats) sb.stats.meshes--; }
        }
        host.geometry.computeBoundingBox();
        host.geometry.computeBoundingSphere();
        const keep = this.o.shadowKeep ? this.o.shadowKeep(host.geometry.boundingBox) : true;
        host.castShadow = keep && !host.material.isMeshBasicMaterial;
        host.receiveShadow = true;
      }
    }
    this.items = (sb?.meshes ?? []).map((m) => {
      m.geometry.computeBoundingBox();
      return { m, b: m.geometry.boundingBox.clone(), cast: m.castShadow };
    });
  }

  update() {
    if (!this.items) this.collect();
    const view = this.level.view, camera = view.camera, cam = camera.position, tg = view.rig.target;
    const far = (view.three.fog?.far ?? 300) - 20;
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const it of this.items) {
      const b = it.b;
      const tx = Math.max(b.min.x - tg.x, 0, tg.x - b.max.x), tz = Math.max(b.min.z - tg.z, 0, tg.z - b.max.z);
      it.m.castShadow = it.cast && Math.hypot(tx, tz) < this.range;
      const dx = Math.max(b.min.x - cam.x, 0, cam.x - b.max.x), dy = Math.max(b.min.y - cam.y, 0, cam.y - b.max.y), dz = Math.max(b.min.z - cam.z, 0, cam.z - b.max.z);
      it.m.visible = Math.hypot(dx, dy, dz) < far && Math.hypot(dx, dz) < (this.o.maxDist ?? 1e9) && (it.m.castShadow || this.frustum.intersectsBox(b));
    }
  }
}

// ------------------------------------------------------------------ Baron-Szene nach dem Sieg (3-Zug)

/**
 * Nach dem Sieg über die Schattenläuferin braust Baron Brummbär im roten Sportwagen über den verschneiten Bahnhofsplatz
 * heran, gerät auf dem Eis ins Schleudern (eine ganze Drehung), bleibt am Käfig stehen, schimpft – und flieht mit
 * aufstiebendem Schnee. Rein darstellerisch (Simulationstakt, deterministisch); die Kamera schwenkt mit.
 * cfg = { from, stop, away: [x, y, z] }
 */
class BaronSzene {
  constructor(level, cfg) {
    this.level = level;
    this.cfg = cfg;
    this.state = 'wait';
    this.t = 0;
    this.pos = new THREE.Vector3(...cfg.from);
    this.yaw = 0;
    this.spin = 0;
    this.speed = 0;
    this.said = false;
    if (level.view) {
      this.model = getModel('baron_brummbaer', { withCar: true });
      this.model.root.visible = false;
      level.view.add(owned(this.model.root));
    }
  }

  get active() { return this.state === 'in' || this.state === 'spin' || this.state === 'stop' || this.state === 'away'; }

  start() { if (this.state === 'wait') { this.state = 'in'; this.t = 0; this.level.sfx('swoop'); } }

  reset() { this.state = 'wait'; this.t = 0; this.said = false; }

  step(dt) {
    if (!this.active) return;
    this.t += dt;
    const { from, stop, away } = this.cfg;
    const dir = (a, b) => Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    const snow = (n) => { if (this.level.view && Math.random() < 0.7) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, n, 1.6); };
    if (this.state === 'in') {
      const k = Math.min(1, this.t / 2.0);
      const e = 1 - (1 - k) * (1 - k);
      this.pos.set(from[0] + (stop[0] - from[0]) * e, from[1] + (stop[1] - from[1]) * e, from[2] + (stop[2] - from[2]) * e);
      this.yaw = dir(from, stop);
      this.speed = 14 * (1 - k * 0.6);
      snow(1);
      if (k >= 1) { this.state = 'spin'; this.t = 0; this.level.sfx('skid'); }
    } else if (this.state === 'spin') {
      // Schleudern auf dem Eis: eine ganze Drehung, rutscht noch ein Stück
      const k = Math.min(1, this.t / 1.3);
      this.spin = ease(k) * TAU;
      this.speed = 6 * (1 - k);
      snow(2);
      if (k >= 1) { this.state = 'stop'; this.t = 0; this.spin = 0; }
    } else if (this.state === 'stop') {
      this.speed = 0;
      if (!this.said && this.t > 0.3) {
        this.said = true;
        const hud = this.level.archetype?.hud;
        hud?.banner?.('Baron Brummbär: „Mein schöner Kanonenzug! Das bekommt ihr zurück!“', { hold: 2.6, size: 11, color: '#ffb0a0', y: 0.22 });
        this.level.sfx('panic');
      }
      const want = dir(stop, away);
      if (this.t > 1.6) this.yaw += Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)) * Math.min(1, dt * 4);
      if (this.t > 2.8) { this.state = 'away'; this.t = 0; this.level.sfx('swoop'); }
    } else if (this.state === 'away') {
      const k = Math.min(1, this.t / 2.6);
      this.pos.set(stop[0] + (away[0] - stop[0]) * k * k, stop[1] + (away[1] - stop[1]) * k * k, stop[2] + (away[2] - stop[2]) * k * k);
      this.yaw = dir(stop, away);
      this.speed = 4 + k * 24;
      snow(3);
      if (k >= 1) {
        this.state = 'gone';
        this.level.archetype?.hud?.banner?.('Welt 3 geschafft!', { hold: 2.6, size: 18, color: '#7dffa0' });
        this.level.sfx('victory');
      }
    }
  }

  render(dt) {
    if (!this.model) return;
    const r = this.model.root;
    r.visible = this.active;
    if (!r.visible) return;
    r.position.copy(this.pos);
    r.rotation.y = this.yaw + this.spin;
    this.model.update(Math.min(dt || 0, 0.1), { anim: this.state === 'stop' ? 'stunned' : 'drive', speed: this.speed, steer: this.state === 'spin' ? 1 : 0 });
  }
}

// ------------------------------------------------------------------ Level-Haken 3-Zug

/**
 * `LEVEL.setup` von 3-Zug: Mitfahr-Regeln, Röhren auf Wagen (Geheimröhre zum Brummbär-Zug und zurück, Röhre auf der
 * Lok → Arena, öffnet beim Halt), Krümel in der Kiste, Postwagen mit Ausschnitt, Abfahrt-Ansage, Phasen-Ansagen der
 * Schattenläuferin im Autoscroller, Baron-Szene nach dem Sieg, Fahnen am Brummbär-Zug, Budget-Kniffe.
 * Daten aus LEVEL.zug = { main, par (Wagenlisten mit c0/c1/cc/x), ride, delay, lokZ, arena, goal, pipes, kruemel }.
 */
export function zugSetup(level) {
  if (level._zugScene) return level._zugScene;
  const cfg = level.data.zug ?? {};
  const sc = level._zugScene = { said: {}, luke: null, kruemel: null, post: null, baron: null, pipes: {} };
  zugRules(level);
  // Landschaft (Gelände, Tiefschnee, Kulisse, Herde, Dampf) – vor dem Verschmelzen und der Abschnitts-Sichtprüfung
  if (cfg.land) sc.land = schneetalSzene(level, cfg.land);
  const byId = Object.fromEntries([...(cfg.main ?? []), ...(cfg.par ?? [])].map((c) => [c.id, c]));
  // Röhren auf Wagen
  for (const p of cfg.pipes ?? []) {
    const car = byId[p.car];
    if (!car) continue;
    const e = spawnLocal(level, new ZugRoehre(level, { id: p.id, attach: car.id, pos: onCar(car, p.dc, p.dx ?? 0, p.y), target: p.target, height: p.h ?? 1.1, color: p.color, closed: !!p.closed, lid: !!p.lid, arrow: !!p.arrow }));
    sc.pipes[p.id] = e;
  }
  sc.luke = sc.pipes.luke ?? null;
  // Krümel in der Kiste auf dem Brummbär-Zug
  const kc = cfg.kruemel;
  if (kc) {
    const car = byId[kc.car];
    sc.kruemel = new KruemelZug(level, {
      veh: kc.car, dc: kc.dc, dx: kc.dx ?? 0, y: car?.style === 'wagen' ? 3.75 : 1.39, pipe: kc.pipe,
      onFree: (k) => runAction(level, { star: { index: kc.star ?? 2, pos: [k.x, k.y + 1.7, k.z] } }, { pos: [k.x, k.y, k.z] }),
    });
    sc.freeKruemel = () => sc.kruemel.free();
  }
  // Postwagen (Ausschnitt-Ansicht, Optik am Fahrzeug)
  if (cfg.post) sc.post = postwagenBody(level, cfg.post, { len: 10 });
  // Phasen-Ansagen der Schattenläuferin im Autoscroller (sie liest archetype.boss / seenPhase)
  const arch = level.archetype;
  if (arch?.sub && !Object.prototype.hasOwnProperty.call(arch, 'boss')) {
    Object.defineProperty(arch, 'boss', { get: () => arch.sub.boss, configurable: true });
    Object.defineProperty(arch, 'seenPhase', { get: () => arch.sub.seenPhase, set: (v) => { arch.sub.seenPhase = v; }, configurable: true });
  }
  // Baron-Szene nach dem Sieg
  if (cfg.baron) {
    sc.baron = new BaronSzene(level, cfg.baron);
    const prevDef = level.onBossDefeated;
    level.onBossDefeated = (b) => { prevDef?.(b); sc.baron.start(); };
    const rt = level.runtime, respawn = rt.respawn.bind(rt);
    rt.respawn = (...a) => { respawn(...a); if (!arch?.sub?.won) sc.baron.reset(); };
    if (level.view) level.view.onFrame((dt) => sc.baron.render(dt));
    // Kamera: Blickziel schwenkt zum Wagen des Barons
    if (arch?.camera) {
      const cam = arch.camera.bind(arch);
      let k = 0;
      arch.camera = (dt, player, world) => {
        const r = cam(dt, player, world);
        const b = sc.baron;
        const want = b.active && b.state !== 'away' ? 0.65 : b.state === 'away' && b.t < 1.6 ? 0.5 : 0;
        k += (want - k) * Math.min(1, dt * 2.5);
        if (!b.active && Math.hypot(player.pos.x - b.cfg.stop[0], player.pos.z - b.cfg.stop[2]) > 30) k = 0;
        if (k > 0.01) {
          const rig = level.view.rig;
          rig.target.set(rig.target.x + (b.pos.x - rig.target.x) * k, rig.target.y + (b.pos.y + 1.5 - rig.target.y) * k, rig.target.z + (b.pos.z - rig.target.z) * k);
          rig.distNow += (21 - rig.distNow) * k;
          rig.place(rig.cur, dt);
        }
        return r;
      };
    }
  }
  // je Schritt: Abfahrt-Ansage, Luke beim Halt, Baron-Szene
  level.onStep((dt) => {
    const w = level.scroll, hud = level.archetype?.hud;
    if (w && w.state === 'run' && !sc.said.go) { sc.said.go = true; hud?.banner?.('Abfahrt!', { hold: 1.2, size: 18, color: '#ffe066' }); level.sfx('pfiff'); level.sfx('switch'); }
    if (sc.luke) {
      const open = !!w && w.state === 'done';
      if (open !== sc.luke.open) sc.luke.setOpen(open);
      if (open && !sc.said.luke && (sc.lukeT = (sc.lukeT ?? 0) + dt) > 1.8) {
        sc.said.luke = true;
        const p = level.player;
        if (p && Math.abs(p.pos.z - sc.luke.pos.z) < 30) hud?.banner?.('Ab durch die Röhre auf der Lok!', { hold: 2.0, size: 13, y: 0.38, color: '#ffe066' });
      }
    }
    sc.baron?.step(dt);
  });
  // Fahnen am Brummbär-Zug, Budget
  if (level.view) {
    const flags = [];
    for (const f of cfg.flags ?? []) {
      const v = level.named.get(f.car);
      if (!v) continue;
      flags.push({ h: f.h ?? 2.2, yaw: -0.8, at: () => ({ x: v.pos.x + (f.dx ?? 0), y: v.pos.y + (f.y ?? v.size.h), z: v.pos.z - (f.dc ?? 0), rot: 0 }) });
    }
    if (flags.length) {
      sc.flags = new WavingFlags(level, flags, { w: 1.5, h: 1.0, near: (x, z) => { const tg = level.view.rig.target; return Math.abs(z - tg.z) < 40 && Math.abs(x - tg.x) < 40; } });
    }
    // Räder/Stangen der Wagen (Instanzen unter dem Aufbau) werfen keinen Sonnenschatten
    for (const v of level.entities) if (v.kind === 'vehicle') v.model?.root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
    shadowDiet(level, ['pilzlingsturm']);
    shadowDiet(level, ['huepfqualle', 'feuer_werfer', 'suchkopf', 'riesenprojektil', 'riesenkanone', 'kanone_turm', 'crate', 'checkpoint_flag', 'steinblock'], 0);
    const sz = cfg.shadowZones ?? [];
    sc.cull = new StaticCullE(level, { shadowRange: 30, maxDist: 95, merge: true, shadowKeep: (b) => sz.some(([z0, z1]) => b.max.z > z1 && b.min.z < z0) });
    sc.trainCull = trainCull(level, { shadow: 20, wheels: 18, far: 28, attached: 38 });
    sc.sky = skyDiet(level);
    heroShadowDiet(level, 0.12);
    // leichter Dunst über dem Schneetal: Fernes verblasst (spart nichts, verdeckt aber das Ausblenden der Wagen)
    const fog = level.view.three.fog;
    if (fog) { fog.near = 55; fog.far = 200; }
  }
  return sc;
}

// ====================================================================== 5) Schneetal-Landschaft (3-Zug)
//
// Sichtfeld der Zugfahrt: Die Kamera blickt steil (40°) von hinten auf den Zug – sichtbar ist nur ein Streifen von
// rund ±45 m um das Gleis und gut 40 m voraus. Die Landschaft ist darum nah am Gleis dicht gestaltet (Tiefschnee mit
// Verwehungen, Schluchten mit Gerüstbrücken, Telegrafenmasten, Rentierherde, Bahnwärterhaus am Bahnübergang,
// Bahnhöfe), ferne Wälder sind sparsam. Alle statischen Teile werden je 32-m-Abschnitt verschmolzen (Abschnitts-Culling).

/** Geometrien nach 32-m-Abschnitten getrennt verschmelzen (jedes Stück landet im eigenen Abschnitt). */
export function bakeSections(level, parts, opts) {
  const groups = new Map();
  for (const g of parts) {
    if (!g) continue;
    if (!g.boundingBox) g.computeBoundingBox();
    const k = Math.floor(-(g.boundingBox.min.z + g.boundingBox.max.z) / 2 / 32);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(g);
  }
  for (const list of groups.values()) bake(level, list, opts);
}

/** Verschneite Fichte (niedrig aufgelöst, ≈ 95 Dreiecke): Stamm, drei Nadelstufen mit Schneehauben. */
export function firG(x, y, z, h, rnd, lite = false) {
  const parts = [];
  const green = L(rnd.pick([0x1d5238, 0x24603f, 0x2c6a48, 0x1a4a36])), dark = L(0x10301f), snow = L(0xf6f9ff), snowSh = L(0xcfdcf0);
  if (!lite) parts.push(cylG(h * 0.035, h * 0.055, h * 0.24, x, y - 0.15, z, 0x5a3a26, 5, { open: true }));
  for (let i = 0; i < 3; i++) {
    const r = h * (0.36 - i * 0.09), th = h * (0.44 - i * 0.07), y0 = y + h * (0.14 + i * 0.25);
    const g = new THREE.ConeGeometry(r, th, lite ? 6 : 7, lite ? 1 : 2, true).toNonIndexed();
    g.rotateY(rnd.real(0, 1));
    g.translate(x, y0 + th / 2, z);
    parts.push(colorize(g, (p, n, o) => {
      const up = (p.y - y0) / th;
      mixc(dark, green, smooth(-0.3, 0.7, n.y + up * 0.4), o);
      if (up > (lite ? 0.9 : 0.4)) mixc(o, n.x + n.z > 0.3 ? snowSh : snow, 0.92, o);
    }));
  }
  return merge(parts);
}

/** Satteldach-Haus (lokal: Breite w quer = x, Tiefe d = z, Traufe h, First +rh), gedreht um yaw. → { solid, glow } */
function houseG(x, y, z, o) {
  const w = o.w ?? 5, d = o.d ?? 6, h = o.h ?? 3.2, rh = o.rh ?? 2.2, yaw = o.yaw ?? 0;
  const wall = o.wall ?? 0xa04a3a, trim = o.trim ?? 0xf4eee0, roof = o.roof ?? 0x6a2a2a, base = o.base ?? 0x7a7a8a;
  const S = [], G = [];
  const put = (g) => { g.rotateY(yaw); g.translate(x, y, z); return g; };
  S.push(put(box(w + 0.2, 0.5, d + 0.2, 0, 0.25, 0, base, { r: 0.05, seg: 1 })));
  S.push(put(box(w, h - 0.5, d, 0, 0.5 + (h - 0.5) / 2, 0, wall, { r: 0.04, seg: 1 })));
  // Giebel (Dreiecksprisma längs z)
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rh); sh.lineTo(-w / 2, 0);
  const gab = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  gab.translate(0, h, -d / 2);
  S.push(put(colorize(gab, litFn(o.gable ?? wall))));
  // Dachflächen mit Schnee
  const ang = Math.atan2(rh, w / 2), len = Math.hypot(w / 2, rh) + 0.55;
  for (const s of [-1, 1]) {
    const g = box(len, 0.2, d + 0.7, 0, 0, 0, roof, { r: 0.04, seg: 1, topColor: 0xf6f9ff });
    g.rotateZ(-s * ang);
    g.translate(s * (w / 4 + 0.08), h + rh / 2 + 0.12, 0);
    S.push(put(g));
  }
  S.push(put(box(0.24, 0.22, d + 0.75, 0, h + rh + 0.12, 0, 0xf6f9ff, { r: 0.08, seg: 1 })));
  // Schornstein
  if (o.chimney !== false) {
    const cx = o.chimneyX ?? w * 0.22, cz = o.chimneyZ ?? -d * 0.2;
    S.push(put(box(0.55, rh + 1.1, 0.55, cx, h + (rh + 1.1) / 2, cz, 0x8a5048, { r: 0.04, seg: 1, topColor: 0xf6f9ff })));
  }
  // Fenster (Rahmen + warmes Licht) an beiden Langseiten und Giebelseiten
  const win = (lx, ly, lz, ry) => {
    const f = box(0.95, 1.15, 0.12, 0, 0, 0, trim, { r: 0.03, seg: 1 }); f.rotateY(ry); f.translate(lx, ly, lz); S.push(put(f));
    const gl = box(0.7, 0.9, 0.14, 0, 0, 0, 0xffcf6a, { r: 0.01, seg: 0 }); gl.rotateY(ry); gl.translate(lx, ly, lz); G.push(put(gl));
    const bar = box(0.06, 0.9, 0.16, 0, 0, 0, trim, { r: 0, seg: 0 }); bar.rotateY(ry); bar.translate(lx, ly, lz); S.push(put(bar));
  };
  for (const s of [-1, 1]) {
    const n = Math.max(1, Math.floor(d / 2.6));
    for (let i = 0; i < n; i++) win(s * (w / 2 + 0.02), 1.75, -d / 2 + (i + 0.5) * (d / n), Math.PI / 2);
    if (o.upper) for (let i = 0; i < n; i++) win(s * (w / 2 + 0.02), 3.7, -d / 2 + (i + 0.5) * (d / n), Math.PI / 2);
  }
  win(0.9, 1.75, d / 2 + 0.02, 0); win(0, h + rh * 0.38, d / 2 + 0.02, 0);
  // Tür (Giebelseite +z lokal) mit Vordach
  if (o.door !== false) {
    S.push(put(box(1.0, 1.9, 0.14, -0.9, 0.5 + 0.95, d / 2 + 0.03, o.doorColor ?? 0x2a5a3a, { r: 0.03, seg: 1 })));
    S.push(put(box(1.5, 0.12, 0.9, -0.9, 2.62, d / 2 + 0.4, roof, { r: 0.03, seg: 1, topColor: 0xf6f9ff })));
  }
  return { solid: S, glow: G };
}

/** Bahnwärter (Mantel, Mütze mit rotem Band, weißer Schnurrbart); Arm mit Signalkelle getrennt (winkt). */
function waerterG(o = {}) {
  const coat = 0x23345e, skin = 0xf2c6a0, P = [], A = [];
  P.push(cylG(0.12, 0.13, 0.75, -0.13, 0, 0, 0x1e1e26, 8), cylG(0.12, 0.13, 0.75, 0.13, 0, 0, 0x1e1e26, 8));
  P.push(cylG(0.3, 0.4, 0.95, 0, 0.7, 0, coat, 12));
  P.push(sphereG(0.31, 0, 1.62, 0, coat, { ws: 12, hs: 8, sy: 0.7 }));
  for (const s of [-1, 1]) P.push(sphereG(0.03, s * 0.1, 1.2, -0.37, 0xffd23a, { ws: 6, hs: 4 }));   // Knöpfe
  P.push(sphereG(0.21, 0, 1.92, 0, skin, { ws: 12, hs: 9 }));
  P.push(sphereG(0.06, 0, 1.9, -0.21, 0xe8a080, { ws: 8, hs: 6 }));                                     // Nase
  P.push(sphereG(0.09, -0.07, 1.82, -0.17, 0xffffff, { ws: 8, hs: 5, sx: 1.2, sy: 0.5 }), sphereG(0.09, 0.07, 1.82, -0.17, 0xffffff, { ws: 8, hs: 5, sx: 1.2, sy: 0.5 }));
  for (const s of [-1, 1]) P.push(sphereG(0.028, s * 0.08, 1.98, -0.19, 0x1a1a22, { ws: 6, hs: 4 }));
  P.push(cylG(0.2, 0.22, 0.2, 0, 2.03, 0, coat, 12), cylG(0.222, 0.222, 0.07, 0, 2.06, 0, 0xd8283a, 12));
  P.push(blockG(0.36, 0.04, 0.2, 0, 2.03, -0.22, 0x1a1a26, { r: 0.02 }));
  P.push(cylG(0.08, 0.09, 0.62, -0.36, 1.05, 0, coat, 8, { rz: -0.2 }));               // linker Arm hängt
  // rechter Arm (Drehpunkt Schulter = Ursprung), hält die Signalkelle
  A.push(cylG(0.08, 0.09, 0.62, 0, -0.6, 0, coat, 8));
  A.push(sphereG(0.08, 0, -0.62, 0, skin, { ws: 8, hs: 6 }));
  A.push(cylG(0.025, 0.025, 0.55, 0, -0.62, -0.05, 0x3a2a1a, 6, { rx: Math.PI }));
  A.push(cylG(0.2, 0.2, 0.03, 0, -1.22, -0.05, 0xffffff, 16, { rx: Math.PI / 2, center: true }));
  A.push(cylG(0.13, 0.13, 0.035, 0, -1.22, -0.05, 0x2fb04a, 16, { rx: Math.PI / 2, center: true }));
  return { body: merge(P), arm: merge(A), shoulder: [0.38, 1.5, 0] };
}

/** Rentier (eigene Gestaltung): Rumpf mit hellem Bauch und Spiegel, Hals mit Mähne, Kopf, Geweih. Blick −z. */
function rentierG() {
  const brown = L(0x8a5a3a), cream = L(0xf2e6cc), dark = L(0x5a3826);
  const fur = (p, n, o) => { mixc(brown, cream, smooth(-0.15, -0.75, n.y), o); if (n.z > 0.55 && p.z > 0.5) mixc(o, cream, 0.85, o); mixc(o, dark, smooth(0.3, 0.95, n.y) * 0.25, o); };
  const B = [];
  B.push(sphereG(1, 0, 1.15, 0, 0x8a5a3a, { sx: 0.42, sy: 0.44, sz: 0.86, ws: 10, hs: 7, fn: fur }));
  B.push(cylG(0.17, 0.24, 0.8, 0, 1.55, -0.78, 0x8a5a3a, 8, { rx: -0.75, center: true, fn: fur }));
  B.push(sphereG(0.24, 0, 1.38, -0.88, 0xf2e6cc, { sy: 1.4, sz: 0.8, ws: 6, hs: 4 }));
  B.push(sphereG(0.22, 0, 1.92, -1.12, 0x8a5a3a, { sx: 0.85, sy: 0.85, sz: 1.35, ws: 8, hs: 6, fn: fur }));
  B.push(sphereG(0.13, 0, 1.86, -1.38, 0x9a6a4a, { sz: 1.2, ws: 6, hs: 4 }));
  B.push(sphereG(0.065, 0, 1.88, -1.52, 0x2a1a14, { ws: 5, hs: 3 }));
  for (const s of [-1, 1]) {
    B.push(sphereG(0.035, s * 0.13, 1.99, -1.24, 0x14100c, { ws: 4, hs: 3 }));
    B.push(sphereG(0.075, s * 0.2, 2.03, -1.0, 0x8a5a3a, { sx: 1.8, sy: 0.55, sz: 0.8, ws: 5, hs: 3 }));
    // Geweih: Stange schräg nach oben/außen/hinten, zwei Enden nach vorn
    B.push(cylG(0.028, 0.045, 0.8, s * 0.27, 2.4, -0.98, 0xeadcc0, 5, { rz: -s * 0.55, rx: 0.35, center: true }));
    B.push(cylG(0.02, 0.03, 0.38, s * 0.33, 2.42, -1.12, 0xeadcc0, 5, { rx: -0.9, rz: -s * 0.2, center: true }));
    B.push(cylG(0.02, 0.03, 0.34, s * 0.46, 2.68, -0.98, 0xeadcc0, 5, { rx: -0.7, rz: -s * 0.4, center: true }));
  }
  B.push(sphereG(0.11, 0, 1.32, 0.86, 0xffffff, { ws: 5, hs: 4 }));
  const leg = (z) => {
    const P = [];
    for (const s of [-1, 1]) {
      P.push(cylG(0.055, 0.075, 0.95, s * 0.2, -0.95, 0, 0x6a4430, 6));
      P.push(cylG(0.075, 0.08, 0.1, s * 0.2, -1.0, 0, 0x2a2420, 6));
    }
    return merge(P);
  };
  return { body: merge(B), front: leg(), hind: leg(), pivots: [[0, 1.03, -0.52], [0, 1.03, 0.55]] };
}

/**
 * Rentierherde, die neben dem Zug durch den Schnee galoppiert: weidet, bis das Bildfenster herankommt (wake), läuft
 * dann voraus neben dem Gleis her (Lauflinie x, gestaffelt) und bleibt am Ziel (stop, z. B. Seeufer) stehen.
 * Instanzen: Rumpf, Vorder- und Hinterbeine (3 Zeichenaufrufe). Rein darstellerisch (Simulationstakt).
 * o = { n: 7, x: 10.5, z: −104 (Weide), wake: −80 (Fenster-z), stop: −226, ground: (x, z) => y }
 */
export class Rentiere {
  constructor(level, o) {
    this.level = level;
    this.o = o;
    const rnd = new Rnd(o.seed ?? 31);
    this.list = [];
    for (let i = 0; i < (o.n ?? 7); i++) {
      const ox = rnd.real(-0.6, 3.0), oz = i * 2.3 + rnd.real(-0.8, 0.8);
      this.list.push({ ox, oz, x: o.x + ox, z: o.z + oz, ph: rnd.real(0, 6), v: 0, yaw: rnd.real(-0.6, 0.6) + Math.PI, graze: rnd.real(0, 6), s: rnd.real(0.85, 1.05) });
    }
    this.state = 'graze';
    this.lead = o.z;
    this.v = 0;
    this.t = 0;
    level.onStep((dt) => this.step(dt));
    if (!level.view) return;
    const g = rentierG();
    this.pivots = g.pivots;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const n = this.list.length;
    this.body = new THREE.InstancedMesh(g.body, mat, n);
    this.front = new THREE.InstancedMesh(g.front, mat, n);
    this.hind = new THREE.InstancedMesh(g.hind, mat, n);
    this.group = new THREE.Group();
    this.group.name = 'rentiere';
    for (const m of [this.body, this.front, this.hind]) { m.castShadow = true; m.frustumCulled = false; this.group.add(m); }
    this.front.castShadow = this.hind.castShadow = false;
    this.M = new THREE.Matrix4(); this.T = new THREE.Matrix4(); this.R = new THREE.Matrix4();
    addObject(level, owned(this.group), () => this.render());
  }

  step(dt) {
    this.t += dt;
    const w = this.level.scroll, o = this.o;
    const wz = w?.center?.z ?? 1e9;
    if (this.state === 'graze' && wz < o.wake) this.state = 'run';
    if (this.state === 'run') {
      const want = Math.max(o.stop, wz - 5);
      const dv = want < this.lead ? 9.5 : 0;
      this.v += Math.max(-6 * dt, Math.min(4 * dt, dv - this.v));
      if (this.lead - want < 1.5) this.v = Math.min(this.v, Math.max(0, (this.lead - want) * 2));
      this.lead -= this.v * dt;
      if (this.lead <= o.stop + 0.05 && this.v < 0.2) this.state = 'stand';
    }
    for (const a of this.list) {
      const tz = this.lead + a.oz, tx = o.x + a.ox + Math.sin(this.t * 0.6 + a.oz) * (this.v > 1 ? 0.5 : 0);
      const dx = tx - a.x, dz = tz - a.z, l = Math.hypot(dx, dz);
      const sp = Math.min(l * 3, this.v * 1.1 + 1.2);
      a.v = l > 0.05 ? sp : 0;
      if (l > 0.05) { a.x += (dx / l) * sp * dt; a.z += (dz / l) * sp * dt; }
      if (a.v > 0.6) { const want = Math.atan2(dx, dz); let d = want - a.yaw; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI; a.yaw += d * Math.min(1, dt * 5); }
      a.ph += dt * (a.v > 0.6 ? 2.2 + a.v * 0.55 : 0);
    }
  }

  render() {
    if (!this.group) return;
    const cam = this.level.view.camera.position;
    const near = this.list.some((a) => Math.abs(a.z - cam.z) < 75);
    this.group.visible = near;
    if (!near) return;
    const ground = this.o.ground;
    this.list.forEach((a, i) => {
      const run = Math.min(1, a.v / 3);
      const bob = Math.abs(Math.sin(a.ph)) * 0.16 * run, pitch = Math.sin(a.ph * 2) * 0.07 * run;
      const grazing = run < 0.1 ? Math.max(0, Math.sin(this.t * 0.4 + a.graze)) * 0.28 : 0;
      const y = ground ? ground(a.x, a.z) : 0;
      this.M.makeRotationY(a.yaw + Math.PI).setPosition(a.x, y + bob, a.z);
      this.R.makeRotationX(pitch + grazing);
      this.M.multiply(this.R);
      this.T.makeScale(a.s, a.s, a.s); this.M.multiply(this.T);
      this.body.setMatrixAt(i, this.M);
      for (const [k, m] of [[0, this.front], [1, this.hind]]) {
        const pv = this.pivots[k];
        const sw = Math.sin(a.ph + (k ? Math.PI * 0.85 : 0)) * 0.75 * run;
        this.T.makeTranslation(pv[0], pv[1], pv[2]);
        this.R.makeRotationX(sw);
        const MM = this.M.clone().multiply(this.T).multiply(this.R);
        m.setMatrixAt(i, MM);
      }
    });
    for (const m of [this.body, this.front, this.hind]) m.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Dampfschwaden der Loks: große, langsame Wolken aus dem Schornstein (bleiben in der Welt stehen → ziehen beim Fahren
 * als Fahne nach hinten), im Stand zusätzlich Zischen an den Treibrädern. Eine Instanzgruppe (1 Zeichenaufruf).
 * emitters: [{ veh: Id, at: [dx, y, dz] (Schornstein, dz nach vorn), hiss: true }]
 */
export class Dampf {
  constructor(level, emitters, o = {}) {
    this.level = level;
    this.em = emitters.map((e) => ({ ...e, acc: 0 }));
    this.n = o.n ?? 64;
    this.items = Array.from({ length: this.n }, () => ({ life: 0, age: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s0: 1, s1: 2 }));
    this.next = 0;
    this.rnd = new Rnd(o.seed ?? 77);
    if (!level.view) return;
    const g = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8a8a96, roughness: 1, transparent: true, opacity: 0.82, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(g, mat, this.n);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'dampf';
    this.mesh.renderOrder = 4;
    this.M = new THREE.Matrix4();
    this.Z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.n; i++) this.mesh.setMatrixAt(i, this.Z);
    addObject(level, owned(this.mesh), (dt) => this.render(dt));
  }

  spawn(x, y, z, o) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.n;
    const r = this.rnd;
    Object.assign(it, { x, y, z, vx: (o.vx ?? 0) + r.real(-0.3, 0.3), vy: o.vy ?? r.real(1.2, 1.9), vz: (o.vz ?? 0) + r.real(-0.3, 0.3), age: 0, life: o.life ?? r.real(2.2, 3.2), s0: o.s0 ?? 0.5, s1: o.s1 ?? r.real(1.6, 2.3) });
  }

  render(dt) {
    dt = Math.min(dt || 0, 0.1);
    const cam = this.level.view.camera.position;
    for (const e of this.em) {
      const v = this.level.named.get(e.veh);
      if (!v) continue;
      const moving = dt > 0 && Math.abs(v.pos.z - (e.lastZ ?? v.pos.z)) / dt > 0.5;
      e.lastZ = v.pos.z;
      if (Math.abs(v.pos.z - cam.z) > 70) continue;
      e.acc += dt;
      const every = moving ? 0.16 : 0.42;
      while (e.acc > every) {
        e.acc -= every;
        this.spawn(v.pos.x + e.at[0], v.pos.y + e.at[1], v.pos.z - e.at[2], { vy: moving ? 1.6 : 1.1, vz: moving ? 0.6 : 0 });
        if (!moving && e.hiss && this.rnd.chance(0.5)) {
          const s = this.rnd.chance(0.5) ? 1 : -1;
          this.spawn(v.pos.x + s * 1.7, v.pos.y + 0.4, v.pos.z - e.at[2] + this.rnd.real(0, 3), { vx: s * 1.4, vy: 0.5, s0: 0.3, s1: 1.1, life: 1.4 });
        }
      }
    }
    for (let i = 0; i < this.n; i++) {
      const it = this.items[i];
      if (it.age >= it.life) { this.mesh.setMatrixAt(i, this.Z); continue; }
      it.age += dt;
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      it.vy *= 1 - dt * 0.35;
      const k = it.age / it.life;
      const s = (it.s0 + (it.s1 - it.s0) * Math.sqrt(k)) * (k > 0.7 ? Math.max(0.01, 1 - (k - 0.7) / 0.3) : 1);
      this.M.makeScale(s, s * 0.85, s).setPosition(it.x, it.y, it.z);
      this.mesh.setMatrixAt(i, this.M);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Gelände des Schneetals: Höhenfeld je 32-m-Abschnitt (Tiefschnee mit Verwehungen, Hänge zu den Seiten, Schluchten
 * mit Felswänden und gefrorenem Bach), Gleisbett (Schotter) unter den Gleisen, Tiefschnee als Treibsand-Form
 * (wer vom Zug fällt, versinkt). Liefert H(x, z) (Bodenhöhe) für Kulisse und Herde.
 * cfg = { z0, z1, x0, x1, gorges: [[zHoch, zTief]], floor: −30, islands: [{ x0, x1, z0, z1, y }], tracks: [x…],
 *         flats: [{ x, z, rx, rz, y }], deep: { x0, x1, sink } }
 */
export function schneetalGelaende(level, cfg) {
  const yD = cfg.y ?? -0.45, FL = cfg.floor ?? -30;
  const gorges = cfg.gorges ?? [], islands = cfg.islands ?? [], flats = cfg.flats ?? [];
  const X0 = cfg.x0 ?? -72, X1 = cfg.x1 ?? 70;
  const edge = (x, a) => 0.6 + 1.3 * (1 + Math.sin(x * 0.19 + a * 0.7)) + 0.8 * (1 + Math.sin(x * 0.067 - a));
  const gorgeK = (x, z) => {
    let k = 0;
    for (const [a, b] of gorges) {
      const za = a - edge(x, a), zb = b + edge(x, b);
      const t = Math.min(smooth(za, za - 5.5, z), smooth(zb, zb + 5.5, z));
      if (t > k) k = t;
    }
    return k;
  };
  const inGorge = (z, m = 0) => gorges.some(([a, b]) => z < a + m && z > b - m);
  const hillR = cfg.hillR ?? 19, hillL = cfg.hillL ?? -27;
  const trk = cfg.tracks ?? [0];
  const base = (x, z) => {
    // Verwehungen (am Gleisbett flach), Windrippen
    const dT = Math.min(...trk.map((t) => Math.abs(x - t)));
    const drift = 0.3 * Math.sin(x * 0.33 + z * 0.11) * Math.sin(z * 0.17 - x * 0.05) + 0.1 * Math.sin(z * 0.8 + x * 0.35);
    let y = yD - 0.05 + (0.17 + drift) * smooth(1.9, 3.6, dT);
    const n = 0.55 + 0.45 * Math.sin(z * 0.031 + 1.3) * Math.sin(z * 0.013 + x * 0.02);
    y += smooth(hillR, hillR + 30, x) * (8 * n + 2.5) + smooth(hillL, hillL - 28, x) * (9 * n + 3);
    for (const f of flats) {
      const d = Math.hypot((x - f.x) / f.rx, (z - f.z) / f.rz);
      if (d < 1.6) y += ((f.y ?? yD) - y) * smooth(1.6, 1.0, d);
    }
    for (const s of islands) {
      const dx = Math.max(s.x0 - x, 0, x - s.x1), dz = Math.max(s.z1 - z, 0, z - s.z0);
      const d = Math.hypot(dx, dz);
      if (d < 6) y += (Math.min(y, s.y - 0.3) - y) * smooth(6, 0.5, d);
    }
    return y;
  };
  const H = (x, z) => {
    const y = base(x, z), k = gorgeK(x, z);
    if (k <= 0) return y;
    const fl = FL + 1.0 * Math.sin(x * 0.11 + z * 0.07) + 2.5 * smooth(8, 40, Math.abs(x - 2));
    return y + (fl - y) * k;
  };
  const minusG = (za, zb) => {
    let list = [[za, zb]];
    for (const [a, b] of gorges) list = list.flatMap(([p, q]) => (q >= a || p <= b ? [[p, q]] : [[p, Math.max(q, a)], [Math.min(p, b), q]].filter(([u, v]) => u - v > 0.4)));
    return list;
  };
  const out = { H, yD, gorgeK, inGorge, minus: minusG };
  if (!level.view) return out;

  // ---- Höhenfeld je Abschnitt
  const xs = [];
  for (let x = X0; x < -32; x += 8) xs.push(x);
  for (let x = -32; x < 26; x += 2) xs.push(x);
  for (let x = 26; x <= X1; x += 8) xs.push(x);
  if (xs[xs.length - 1] < X1) xs.push(X1);
  const snowA = L(0xe4ecf8), snowB = L(0xaec2e2), snowC = L(0xffffff), rock = L(0x6e6676), rockD = L(0x3e3848), ice = L(0x9fd2ee);
  const k0 = Math.floor(-cfg.z0 / 32), k1 = Math.floor(-cfg.z1 / 32);
  const terrain = [];
  for (let k = k0; k <= k1; k++) {
    const zTop = -32 * k, zBot = -32 * (k + 1);
    const nz = 16, nx = xs.length;
    const pos = new Float32Array(nx * (nz + 1) * 3);
    for (let j = 0; j <= nz; j++) {
      const z = zTop + (zBot - zTop) * (j / nz);
      for (let i = 0; i < nx; i++) {
        const q = (j * nx + i) * 3;
        pos[q] = xs[i]; pos[q + 1] = H(xs[i], z); pos[q + 2] = z;
      }
    }
    const idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g = g.toNonIndexed();
    terrain.push(colorize(g, (p, n, o) => {
      // Schatten der Verwehungen (Sonne von links): von der Sonne abgewandte Hänge bläulich
      const lit = n.x * -0.6 + n.y * 0.7 + n.z * 0.3;
      const v = Math.sin(p.x * 0.37 + p.z * 0.21) * 0.5 + Math.sin(p.x * 0.11 - p.z * 0.29 + 1.7) * 0.5;
      mixc(snowA, snowB, Math.min(1, smooth(0.78, 0.55, lit) * 0.9 + smooth(0.2, 1, v) * 0.25), o);
      const steep = smooth(0.8, 0.45, n.y);
      if (steep > 0) {
        const band = 0.5 + 0.5 * Math.sin(p.y * 1.7 + Math.sin(p.x * 0.3) * 1.5);
        const r2 = mixc(rockD, rock, band, [0, 0, 0]);
        mixc(o, r2, steep, o);
      }
      if (p.y < FL + 3.2 && n.y > 0.7) mixc(o, ice, smooth(FL + 3.2, FL + 1.2, p.y) * 0.8, o);
      const s = Math.sin(p.x * 3.1 + p.z * 2.3) * Math.sin(p.x * 1.7 - p.z * 2.9);
      if (s > 0.86 && steep < 0.3) mixc(o, snowC, 0.8, o);
    }));
  }
  bakeSections(level, terrain, { castShadow: false, receiveShadow: true });

  // ---- Gleisbett (Schotter mit Schneeresten) außerhalb der Schluchten
  const minus = minusG;
  const bed = [];
  for (const tx of cfg.tracks ?? [0]) {
    const z0 = cfg.trackFrom?.[String(tx)] ?? cfg.z0, z1 = cfg.z1;
    for (let k = Math.floor(-z0 / 32); k <= Math.floor(-z1 / 32); k++) {
      for (const [za, zb] of minus(Math.min(z0, -32 * k), Math.max(z1, -32 * (k + 1)))) {
        if (za - zb < 0.5) continue;
        bed.push(blockG(3.4, 0.36, za - zb, tx, -0.68, (za + zb) / 2, 0x7a7080, { r: 0.12, seg: 1, top: 0x9a90a0 }));
        bed.push(blockG(2.6, 0.05, za - zb, tx, -0.32, (za + zb) / 2, 0x8a8090, { r: 0, seg: 0, top: 0xb4acb8 }));
      }
    }
  }
  bakeSections(level, bed, { castShadow: false });

  // ---- Tiefschnee (Kollision): überall außer Schluchten und Bahnhofsinseln
  const Q = { sink: cfg.sink ?? 0.5, slow: 0.45, jump: 0.75, plop: 0.06, flow: null };
  const dx0 = cfg.deep?.x0 ?? -40, dx1 = cfg.deep?.x1 ?? 34;
  const addDeep = (x0, x1, za, zb) => {
    if (x1 - x0 < 0.5 || za - zb < 0.5) return;
    const shape = { type: 'box', min: [x0, yD - 1.4, zb], max: [x1, yD, za], oneWay: true, camIgnore: true, noWallSlide: true, quicksand: Q, tag: 'tiefschnee' };
    shape.owner = { quicksand: true, shape, top: yD };
    level.world.add(shape);
    level.world.add({ type: 'box', min: [x0, yD - 1.9, zb], max: [x1, yD - 1.4, za], quicksandFloor: true, tag: 'tiefschnee-boden' });
  };
  const cuts = [cfg.z0, cfg.z1];
  for (const [a, b] of gorges) cuts.push(a, b);
  for (const s of islands) cuts.push(s.z0, s.z1);
  const zs = [...new Set(cuts)].sort((a, b) => b - a);
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1], zm = (za + zb) / 2;
    if (inGorge(zm)) continue;
    const isl = islands.find((s) => zm < s.z0 && zm > s.z1);
    if (isl) { addDeep(dx0, isl.x0, za, zb); addDeep(isl.x1, dx1, za, zb); } else addDeep(dx0, dx1, za, zb);
  }
  level.world.hasQuicksand = true;
  return out;
}

/** Dünner Quader von a nach b (Drähte, Streben). */
function rodG(a, b, r, color) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = box(r * 2, r * 2, len, 0, 0, 0, color, { r: 0, seg: 0 });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx / len, dy / len, dz / len)));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

/** Ellipse am Boden (Eisfläche, Teich). */
function ellipseG(x, y, z, rx, rz, fn, seg = 36) {
  const g = new THREE.CircleGeometry(1, seg).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.scale(rx, 1, rz);
  g.translate(x, y, z);
  return colorize(g, fn);
}

/** Rotweiße Schranke (Arm längs z über die Straße) mit Gegengewicht. */
function schrankeG(x, y, z0, z1) {
  const P = [];
  P.push(blockG(0.34, 1.15, 0.34, x, y, z0, 0x3a3a46, { r: 0.04 }));
  P.push(blockG(0.5, 0.36, 0.5, x, y + 0.75, z0 + Math.sign(z0 - z1) * 0.55, 0x3a3a46, { r: 0.06 }));
  const n = Math.round(Math.abs(z1 - z0) / 0.55), dz = (z1 - z0) / n;
  for (let i = 0; i < n; i++) P.push(blockG(0.12, 0.14, Math.abs(dz) + 0.01, x, y + 0.92, z0 + dz * (i + 0.5), i % 2 ? 0xffffff : 0xd8283a, { r: 0, seg: 0 }));
  return P;
}

/** Andreaskreuz (rot-weiß) auf Pfosten, Kreuz quer zur Straße (yaw). */
function andreaskreuzG(x, y, z, yaw) {
  const P = [blockG(0.12, 2.6, 0.12, x, y, z, 0x5a5a66, { r: 0.02 })];
  for (const s of [-1, 1]) {
    for (const [w, h, c, off] of [[1.36, 0.24, 0xd8283a, 0], [1.2, 0.12, 0xffffff, 0.02]]) {
      const g = box(w, h, 0.05, 0, 0, 0, c, { r: 0, seg: 0 });
      g.rotateZ(s * Math.PI / 4); g.translate(0, 0, off); g.rotateY(yaw); g.translate(x, y + 2.3, z);
      P.push(g);
    }
  }
  return P;
}

/** Formsignal (Fahrt frei): Gittermast, Flügel schräg hoch, Laterne. */
function signalG(x, y, z) {
  const P = [blockG(0.2, 6.2, 0.2, x, y, z, 0x4a4a56, { r: 0.02 }), blockG(0.6, 0.3, 0.6, x, y, z, 0x7a7a86, { r: 0.04 })];
  for (let k = 0.6; k < 6; k += 0.7) P.push(rodG([x - 0.1, y + k, z + 0.1], [x + 0.1, y + k + 0.6, z + 0.1], 0.025, 0x4a4a56));
  const arm = box(1.5, 0.26, 0.06, 0, 0, 0, 0xd8283a, { r: 0.02, seg: 0 });
  const band = box(1.0, 0.12, 0.07, 0.15, 0, 0, 0xffffff, { r: 0, seg: 0 });
  for (const g of [arm, band]) { g.translate(0.75, 0, 0); g.rotateZ(0.75); g.translate(x + 0.1, y + 5.6, z + 0.15); P.push(g); }
  P.push(blockG(0.32, 0.4, 0.3, x - 0.25, y + 4.9, z + 0.15, 0x2a2a30, { r: 0.04 }));
  return P;
}

/** Wasserturm: Ziegelsockel, Holzbottich mit Bändern, Kegeldach mit Schnee, Leiter. */
function wasserturmG(x, y, z) {
  const P = [];
  P.push(cylG(1.7, 1.9, 5.2, x, y, z, 0xa0523a, 14));
  P.push(cylG(1.95, 1.95, 0.3, x, y + 5.2, z, 0x8a8a96, 14));
  P.push(cylG(2.3, 2.3, 2.6, x, y + 5.5, z, 0x8a5a36, 16));
  for (const yy of [5.9, 6.8, 7.7]) P.push(cylG(2.34, 2.34, 0.12, x, y + yy, z, 0x3a3a44, 16, { open: true }));
  P.push(coneG(2.7, 1.6, x, y + 8.1, z, 0x5a3a3a, 16, { fn: (p, n, o) => mixc(L(0xc8d6ea), L(0xffffff), smooth(0.2, 0.7, n.y), o) }));
  for (const s of [-1, 1]) P.push(blockG(0.06, 8, 0.06, x + 2.0, y, z + s * 0.25, 0x3a3a44, { r: 0, seg: 0 }));
  for (let k = 0.4; k < 8; k += 0.45) P.push(blockG(0.05, 0.05, 0.5, x + 2.0, y + k, z, 0x3a3a44, { r: 0, seg: 0 }));
  return P;
}

/** Krümel wartet am Zielbahnsteig (nur wenn befreit) und jubelt, wenn die Heldin kommt. */
class KruemelZiel {
  constructor(level, pos, freed) {
    this.level = level;
    this.pos = pos;
    this.freed = freed;
    this.t = 0;
    this.said = false;
    if (!level.view) return;
    this.model = getModel('kruemel');
    this.root = new THREE.Group();
    this.root.add(this.model.root);
    this.model.root.scale.setScalar(1.35);
    this.root.position.set(...pos);
    addObject(level, this.root, (dt) => this.render(dt));
    level.view.shadows.add({ pos: new THREE.Vector3(...pos), radius: 0.32, alive: () => true, visible: () => this.root.visible });
  }

  render(dt) {
    this.t += dt || 0;
    const on = !!this.freed();
    this.root.visible = on;
    if (!on) return;
    const p = this.level.player;
    const d = p ? Math.hypot(p.pos.x - this.pos[0], p.pos.z - this.pos[2]) : 99;
    const cheer = d < 8;
    if (cheer && !this.said) {
      this.said = true;
      this.bubble = bubbleSprite('Juhu, Schneetal!', 'Danke fürs Mitnehmen!');
      this.bubble.position.set(0, 1.6, 0);
      this.root.add(this.bubble);
      this.bubbleT = 4;
    }
    if (this.bubble) { this.bubbleT -= dt || 0; this.bubble.visible = this.bubbleT > 0; }
    this.root.position.y = this.pos[1] + (cheer ? Math.abs(Math.sin(this.t * 6)) * 0.35 : 0);
    if (p) this.model.root.rotation.y = Math.atan2(-(p.pos.z - this.pos[2]), p.pos.x - this.pos[0]);
    this.model.update(Math.min(0.1, dt || 0), { anim: cheer ? 'cheer' : 'idle' });
  }
}

/**
 * Kulisse 3-Zug aus level.data.zug.land: Gelände (schneetalGelaende), Wälder, Telegrafenleitung, Schneezäune, Signale,
 * Bahnübergang mit Bahnwärterhaus (Wärter winkt, Schornstein raucht, Warnlichter blinken), gefrorener See mit Iglu
 * und Eisangler-Hütte, gefrorener Wasserfall und Eisbäche in den Schluchten, Bahnhöfe Tannenruh und Schneetal
 * (Empfangsgebäude, Wasserturm, Lokschuppen um die Drehscheiben-Arena), Dorf Schneetal, Rentierherde, Dampfschwaden,
 * Krümel am Ziel. Gegner, die in den Tiefschnee fallen, versinken.
 */
export function schneetalSzene(level, cfg) {
  const land = schneetalGelaende(level, cfg);
  const H = land.H;
  const rnd = new Rnd(cfg.seed ?? 2024);
  const sc = { land };
  // Gegner im Tiefschnee versinken
  level.onStep(() => {
    for (const e of level.entities) {
      if (!e.enemy || !e.alive || e.removed || !e.grounded || e.ground?.tag !== 'tiefschnee') continue;
      level.effects?.dust?.({ x: e.pos.x, y: e.pos.y, z: e.pos.z }, 6, 0.8);
      if (!e.defeated) e.markDefeated?.();
      e.kill();
    }
  });
  if (!level.view) return sc;
  const S = [], N = [], G = [];          // Schatten werfend, ohne Schatten, leuchtend
  const free = (x, z) => !(cfg.keepOut ?? []).some((k) => x > k[0] && x < k[1] && z < k[2] && z > k[3]);

  // ---- Wälder (Bänder links/rechts), einzelne Bäume näher am Gleis
  for (const band of cfg.forest ?? []) {
    const [x0, x1] = band.x, n = Math.round(((x1 - x0) * (cfg.z0 - cfg.z1)) / (band.per ?? 40));
    for (let i = 0; i < n; i++) {
      const x = rnd.real(x0, x1), z = rnd.real(cfg.z1, cfg.z0);
      if (!free(x, z) || land.gorgeK(x, z) > 0.05) continue;
      N.push(firG(x, H(x, z), z, rnd.real(band.h?.[0] ?? 3.2, band.h?.[1] ?? 6.5), rnd, true));
    }
  }
  for (const [x, z, h] of cfg.trees ?? []) S.push(firG(x, H(x, z), z, h, rnd));
  // Schluchtgrund: kleine Fichten, Felsen
  for (const [a, b] of cfg.gorges ?? []) {
    for (let i = 0; i < 70; i++) {
      const x = rnd.real(-50, 50), z = rnd.real(b + 4, a - 4);
      if (land.gorgeK(x, z) < 0.97 || Math.abs(z - (a + b) / 2) < 3.6) continue;
      N.push(firG(x, H(x, z), z, rnd.real(2.6, 5.5), rnd, true));
    }
  }

  // ---- Kleinkram im Schnee nah am Gleis: verschneite Steine, trockene Grasbüschel, Sträucher, Baumstümpfe
  if (cfg.clutter) {
    const o = cfg.clutter, n = Math.round(((o.x[1] - o.x[0]) * (cfg.z0 - cfg.z1)) / (o.per ?? 26));
    const rockA = L(0x5e5866), rockB = L(0x8a8494), snowT = L(0xf2f6fc), grass = [0xc8a060, 0xa88448, 0xd8b878];
    const tracks = cfg.tracks ?? [0];
    for (let i = 0; i < n; i++) {
      const x = rnd.real(o.x[0], o.x[1]), z = rnd.real(cfg.z1, cfg.z0);
      if (tracks.some((t) => Math.abs(x - t) < 2.4) || !free(x, z) || land.gorgeK(x, z) > 0.02 || land.inGorge(z, 6)) continue;
      const y = H(x, z), k = rnd.frac();
      if (k < 0.34) {
        const r = rnd.real(0.25, 0.75);
        N.push(sphereG(r, x, y - r * 0.25, z, 0x6a6474, { sx: rnd.real(1, 1.5), sy: rnd.real(0.55, 0.8), ws: 7, hs: 5, ry: rnd.real(0, 3), fn: (p, nn, out) => { mixc(rockA, rockB, smooth(-0.4, 0.5, nn.y - nn.x * 0.4), out); if (nn.y > 0.55) mixc(out, snowT, smooth(0.55, 0.8, nn.y), out); } }));
      } else if (k < 0.7) {
        for (let j = 0; j < 5; j++) N.push(coneG(0.035, rnd.real(0.35, 0.7), x + rnd.real(-0.25, 0.25), y - 0.1, z + rnd.real(-0.25, 0.25), rnd.pick(grass), 3));
      } else if (k < 0.88) {
        const r = rnd.real(0.4, 0.75);
        N.push(sphereG(r, x, y - 0.05, z, 0x3a5a3a, { sy: 0.7, ws: 7, hs: 5, fn: (p, nn, out) => mixc(L(0x2a4a32), snowT, smooth(0.35, 0.75, nn.y), out) }));
      } else {
        const r = rnd.real(0.18, 0.3);
        N.push(cylG(r, r * 1.15, rnd.real(0.3, 0.6), x, y - 0.1, z, 0x6a4a30, 7, { fn: (p, nn, out) => mixc(L(0x5a3e28), snowT, smooth(0.5, 0.9, nn.y), out) }));
      }
    }
  }

  // ---- Telegrafenleitung
  if (cfg.poles) {
    const o = cfg.poles, zs = [];
    for (let z = o.z0; z > o.z1; z -= o.every) zs.push(land.inGorge(z, 4) ? null : z);
    for (let i = 0; i < zs.length; i++) {
      const z = zs[i];
      if (z === null) continue;
      const y = H(o.x, z) - 0.2;
      S.push(cylG(0.1, 0.14, 6.6, o.x, y, z, 0x5a4030, 6));
      N.push(blockG(1.7, 0.12, 0.12, o.x, y + 6.0, z, 0x5a4030, { r: 0, seg: 0 }), blockG(1.3, 0.12, 0.12, o.x, y + 5.45, z, 0x5a4030, { r: 0, seg: 0 }));
      for (const [dx, yy] of [[-0.7, 6.12], [0.7, 6.12], [-0.5, 5.57], [0.5, 5.57]]) N.push(cylG(0.04, 0.05, 0.16, o.x + dx, y + yy, z, 0xeef0f4, 5));
      const z2 = zs[i + 1];
      if (z2 === null || z2 === undefined) continue;
      const y2 = H(o.x, z2) - 0.2;
      for (const [dx, yy] of [[-0.7, 6.28], [0.7, 6.28], [-0.5, 5.73], [0.5, 5.73]]) {
        const a = [o.x + dx, y + yy, z], b = [o.x + dx, y2 + yy, z2], m = [o.x + dx, (a[1] + b[1]) / 2 - 0.5, (z + z2) / 2];
        N.push(rodG(a, m, 0.022, 0x2a2a30), rodG(m, b, 0.022, 0x2a2a30));
      }
    }
  }

  // ---- Schneezäune (Bretter mit Schneekappe)
  for (const f of cfg.fences ?? []) {
    for (let z = f.z0; z > f.z1; z -= 2.5) {
      if (land.inGorge(z, 2)) continue;
      const y = H(f.x, z);
      N.push(cylG(0.06, 0.07, 1.7, f.x, y - 0.2, z, 0x6a4a30, 5));
      for (const yy of [0.45, 0.85, 1.25]) N.push(blockG(0.06, 0.22, 2.5, f.x, y + yy - 0.2, z - 1.25, 0x8a5a36, { r: 0, seg: 0, top: 0xf6f9ff }));
    }
  }

  // ---- Signale
  for (const [x, z] of cfg.signals ?? []) S.push(...signalG(x, H(x, z) - 0.1, z));

  // ---- Bahnübergang mit Bahnwärterhaus
  const cr = cfg.crossing;
  if (cr) {
    const zc = cr.z, w = cr.w ?? 6, tracks = cfg.tracks ?? [0];
    // Straße (festgefahrener Schnee, Fahrspuren), über den Gleisen Bohlen
    const rows = 4, xsR = [];
    for (let x = -56; x <= 56; x += 2) xsR.push(x);
    const road = [];
    const tyAt = (x) => { const d = Math.min(...tracks.map((t) => Math.abs(x - t))); return Math.max(H(x, zc), -0.06 - Math.max(0, d - 1.8) * 0.12); };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < xsR.length - 1; i++) {
        const za = zc + w / 2 - (j / rows) * w, zb = zc + w / 2 - ((j + 1) / rows) * w, xa = xsR[i], xb = xsR[i + 1];
        for (const [x, z] of [[xa, za], [xa, zb], [xb, za], [xb, za], [xa, zb], [xb, zb]]) road.push(x, Math.max(tyAt(x), H(x, z)) + 0.04, z);
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(road, 3));
    rg.computeVertexNormals();
    const rutA = L(0xc4b8ae), rutB = L(0x7e6e64), snowR = L(0xe4ecf8);
    N.push(colorize(rg, (p, n, o) => { const u = Math.abs(Math.abs(p.z - zc) - 1.2); mixc(rutB, rutA, smooth(0.15, 0.6, u), o); if (Math.abs(p.z - zc) > w / 2 - 0.5) mixc(o, snowR, 0.7, o); }));
    for (const t of tracks) {
      for (const s of [-1.6, -0.5, 0.5, 1.6]) N.push(blockG(Math.abs(s) > 1 ? 0.7 : 0.95, 0.12, w, t + s * 0.62, -0.16, zc, 0x8a6a48, { r: 0.02, seg: 0, top: 0xa88660 }));
    }
    // Schranken (Arm über die Straße), Andreaskreuze, Warnlichter (blinken)
    const ex = Math.max(...tracks) + 3.9, wx = Math.min(...tracks) - 3.9;
    S.push(...schrankeG(ex, H(ex, zc - w / 2 - 0.4), zc - w / 2 - 0.4, zc + w / 2 - 0.2));
    S.push(...schrankeG(wx, H(wx, zc + w / 2 + 0.4), zc + w / 2 + 0.4, zc - w / 2 + 0.2));
    S.push(...andreaskreuzG(ex + 0.7, H(ex + 0.7, zc + w / 2 + 0.7), zc + w / 2 + 0.7, Math.PI / 2));
    S.push(...andreaskreuzG(wx - 0.7, H(wx - 0.7, zc - w / 2 - 0.7), zc - w / 2 - 0.7, Math.PI / 2));
    const lamps = [];
    for (const [x, z] of [[ex + 0.7, zc + w / 2 + 0.7], [wx - 0.7, zc - w / 2 - 0.7]]) {
      const y = H(x, z) + 1.55;
      for (const s of [-1, 1]) lamps.push(blockG(0.08, 0.26, 0.26, x + (x > 0 ? 0.1 : -0.1), y, z + s * 0.24, 0xff2a1a, { r: 0.04, seg: 0 }));
      N.push(blockG(0.12, 0.34, 0.8, x, y - 0.04, z, 0x1a1a22, { r: 0.04, seg: 0 }));
    }
    const lm = new THREE.Mesh(merge(lamps), new THREE.MeshBasicMaterial({ vertexColors: true }));
    lm.name = 'warnlicht';
    let tl = 0;
    addObject(level, owned(lm), (dt) => { tl += dt || 0; lm.visible = Math.abs(level.view.camera.position.z - zc) < 80 && Math.sin(tl * 7) > 0; });
    // Bahnwärterhaus mit Garten
    if (cr.house) {
      const [hx, hz] = cr.house, hy = H(hx, hz);
      const hs = houseG(hx, hy, hz, { w: 4.6, d: 5.6, h: 3.1, rh: 2.6, wall: 0xb0503a, roof: 0x4a3a44, gable: 0xf0e6d0, trim: 0xf6f0e0, chimneyX: -1.0, chimneyZ: -1.2 });
      S.push(...hs.solid); G.push(...hs.glow);
      // Zaun, Holzstapel, Bank, Glocke, Lampe, Schneemann
      for (let x = hx - 4; x <= hx + 4.01; x += 0.8) N.push(blockG(0.09, 0.85, 0.09, x, hy - 0.1, hz - 4.6, 0xf6f4ee, { r: 0.02, seg: 0 }));
      for (let z = hz - 4.6; z <= hz + 3.2; z += 0.8) N.push(blockG(0.09, 0.85, 0.09, hx + 4, hy - 0.1, z, 0xf6f4ee, { r: 0.02, seg: 0 }));
      N.push(blockG(8, 0.08, 0.06, hx, hy + 0.5, hz - 4.6, 0xf6f4ee, { r: 0, seg: 0 }), blockG(0.06, 0.08, 7.8, hx + 4, hy + 0.5, hz - 0.7, 0xf6f4ee, { r: 0, seg: 0 }));
      S.push(blockG(1.0, 1.1, 2.6, hx + 2.9, hy - 0.05, hz - 1.6, 0x7a4e2e, { r: 0.08, top: 0xf6f9ff }));
      for (let i = 0; i < 6; i++) N.push(cylG(0.16, 0.16, 0.06, hx + 2.38, hy + 0.2 + (i % 3) * 0.33, hz - 2.6 + Math.floor(i / 3) * 0.6 + (i % 2) * 0.2, 0xd8b080, 7, { rz: Math.PI / 2, center: true }));
      S.push(blockG(1.6, 0.12, 0.5, hx - 2.9, hy + 0.42, hz + 1.4, 0x8a5a36, { r: 0.03 }), blockG(1.6, 0.5, 0.08, hx - 3.1, hy + 0.5, hz + 1.4, 0x8a5a36, { r: 0.03 }));
      S.push(cylG(0.06, 0.07, 2.4, hx - 3.0, hy, hz + 3.2, 0x4a4a56, 6), cylG(0.22, 0.3, 0.35, hx - 3.0, hy + 2.2, hz + 3.2, 0xd8b040, 10));
      G.push(blockG(0.26, 0.34, 0.26, hx - 0.9, hy + 2.75, hz + 3.0, 0xffd27a, { r: 0.05, seg: 0 }));
      bakeModel(level, 'schneemann', {}, hx + 2.2, hy, hz + 2.4, -Math.PI / 2 - 0.4, 0.9, {}, { castShadow: true });
      sc.smoke = particles(level, { center: [hx - 1.0, hy + 3.1 + 2.6 + 1.3, hz - 1.2], r0: 0, r1: 0.25, n: 16, h: 5, dot: 1.1, colors: [0xe8e8f0, 0xd0d0dc, 0xf4f4f8], speed: [0.6, 1.0], sway: 1.2, additive: false, opacity: 0.55, name: 'kaminrauch' });
      if (sc.smoke) level.view.onFrame(() => { sc.smoke.visible = Math.abs(level.view.camera.position.z - hz) < 80; });
    }
    // Bahnwärter winkt mit der Kelle, solange der Zug vorbeifährt
    if (cr.keeper) {
      const [kx, kz] = cr.keeper, ky = H(kx, kz) + 0.02, yaw = Math.PI / 2;
      const wg = waerterG();
      wg.body.rotateY(yaw); wg.body.translate(kx, ky, kz);
      S.push(wg.body);
      const arm = new THREE.Mesh(wg.arm, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
      const pivot = new THREE.Group();
      pivot.name = 'waerter';
      pivot.add(arm);
      const sh = new THREE.Vector3(...wg.shoulder).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      pivot.position.set(kx + sh.x, ky + sh.y, kz + sh.z);
      pivot.rotation.set(0, yaw, 0);
      arm.castShadow = true;
      sc.keeper = { pivot, arm, waving: false };
      let tw = 0;
      addObject(level, owned(pivot), (dt) => {
        tw += dt || 0;
        pivot.visible = Math.abs(level.view.camera.position.z - kz) < 80;
        const wz = level.scroll?.center?.z ?? 1e9;
        sc.keeper.waving = Math.abs(wz - kz) < 45;
        arm.rotation.z = sc.keeper.waving ? 2.45 + Math.sin(tw * 6.5) * 0.4 : 0.15;
      });
    }
  }

  // ---- gefrorener See mit Iglu und Eisangler-Hütte
  if (cfg.lake) {
    const { x, z, rx, rz } = cfg.lake, y = land.yD + 0.05;
    const iceA = L(0xc6e8f8), iceB = L(0x9fd2ee), white = L(0xffffff);
    N.push(ellipseG(x, y, z, rx, rz, (p, n, o) => { const v = Math.sin(p.x * 0.8 + p.z * 0.3) * Math.sin(p.z * 0.5 - p.x * 0.2); mixc(iceB, iceA, 0.5 + 0.5 * v, o); if (Math.abs(Math.sin(p.x * 1.3 - p.z * 0.9)) < 0.05) mixc(o, white, 0.7, o); }, 40));
    for (let a = 0; a < Math.PI * 2; a += 0.22) N.push(sphereG(rnd.real(0.6, 1.1), x + Math.cos(a) * (rx + 0.3), y - 0.15, z + Math.sin(a) * (rz + 0.3), 0xf6f9ff, { sy: 0.45, ws: 8, hs: 5, half: true }));
    const hx = x + rx * 0.35, hz = z - rz * 0.2;
    const hs = houseG(hx, y, hz, { w: 1.8, d: 2.0, h: 1.7, rh: 0.9, wall: 0xc83a2a, roof: 0x5a3a3a, gable: 0xc83a2a, trim: 0xffffff, door: false, chimney: false });
    S.push(...hs.solid); G.push(...hs.glow);
    N.push(ellipseG(hx - 1.8, y + 0.01, hz + 0.6, 0.45, 0.45, (p, n, o) => { o[0] = 0.02; o[1] = 0.06; o[2] = 0.1; }, 14));
    N.push(rodG([hx - 1.3, y + 0.05, hz + 0.9], [hx - 2.1, y + 1.2, hz + 0.5], 0.02, 0x6a4430), rodG([hx - 2.1, y + 1.2, hz + 0.5], [hx - 1.8, y, hz + 0.6], 0.006, 0xeeeeee));
    S.push(cylG(0.2, 0.16, 0.34, hx - 1.0, y, hz + 1.2, 0x4a7ad8, 10));
    bakeModel(level, 'iglu', { size: 3.4 }, x - rx * 0.55, land.yD, z + rz * 0.75, 0.6, 1, {}, { castShadow: true });
    bakeModel(level, 'schneemann', {}, x - rx * 0.9, land.yD, z - rz * 0.6, -Math.PI / 2, 1, {}, { castShadow: true });
  }

  // ---- gefrorener Wasserfall an der Schluchtwand, Eisbäche auf dem Schluchtgrund
  for (const f of cfg.waterfalls ?? []) {
    for (let y = land.yD - 0.3; y > (cfg.floor ?? -30) + 1; y -= 1.3) {
      let za = f.zTop, zb = f.zTop + f.dir * 14;
      for (let k = 0; k < 24; k++) { const zm = (za + zb) / 2; if (H(f.x, zm) > y) za = zm; else zb = zm; }
      for (const dx of [-1.4, 0, 1.4]) {
        const r = rnd.real(0.8, 1.4);
        N.push(sphereG(r, f.x + dx + rnd.real(-0.4, 0.4), y, za + f.dir * (0.2 + rnd.real(0, 0.4)), 0xcfeeff, { sz: 0.55, sy: 1.3, ws: 8, hs: 6, fn: litFn(rnd.chance(0.5) ? 0xd8f2ff : 0xa8dcf6, 0.8, 1.2) }));
      }
    }
  }
  for (const [a, b] of cfg.gorges ?? []) {
    const zc = (a + b) / 2, pos = [];
    for (let x = -56; x < 56; x += 2) {
      for (const [xx, dz] of [[x, -2.4], [x, 2.4], [x + 2, -2.4], [x + 2, -2.4], [x, 2.4], [x + 2, 2.4]]) {
        const zz = zc + dz + Math.sin(xx * 0.15) * 1.2;
        pos.push(xx, H(xx, zz) + 0.08, zz);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const iA = L(0xbfe8fa), iB = L(0x8ccbea);
    N.push(colorize(g, (p, n, o) => mixc(iB, iA, 0.5 + 0.5 * Math.sin(p.x * 0.7 + p.z), o)));
  }

  // ---- Bahnhöfe
  for (const st of cfg.stations ?? []) {
    if (st.house) {
      const hs = houseG(st.house[0], st.house[1], st.house[2], { w: st.w ?? 6.4, d: st.d ?? 14, h: 5.8, rh: 3.0, wall: 0xe6c27a, base: 0x8a8a96, roof: 0x4a4a62, gable: 0xe6c27a, trim: 0xf6f0e0, upper: true, doorColor: 0x2a4a7a, chimneyX: 1.4, chimneyZ: -3.5 });
      S.push(...hs.solid); G.push(...hs.glow);
      // Uhr am Giebel
      const cx = st.house[0], cz = st.house[2] + (st.d ?? 14) / 2 + 0.06, cy = st.house[1] + 5.8 + 1.2;
      N.push(cylG(0.62, 0.62, 0.1, cx, cy, cz, 0x3a3a46, 20, { rx: Math.PI / 2, center: true }), cylG(0.52, 0.52, 0.12, cx, cy, cz + 0.02, 0xfffbf0, 20, { rx: Math.PI / 2, center: true }));
      N.push(blockG(0.06, 0.38, 0.04, cx, cy, cz + 0.1, 0x1a1a22, { r: 0, seg: 0 }), blockG(0.28, 0.06, 0.04, cx + 0.12, cy + 0.02, cz + 0.1, 0x1a1a22, { r: 0, seg: 0 }));
    }
    if (st.tower) S.push(...wasserturmG(...st.tower));
    for (const t of st.trees ?? []) S.push(firG(t[0], H(t[0], t[1]), t[1], t[2], rnd));
    for (const t of st.lights ?? []) {
      // geschmückte Tanne mit Lichterkette und Stern
      const ty = t[3] ?? H(t[0], t[1]);
      S.push(firG(t[0], ty, t[1], t[2], rnd));
      for (let i = 0; i < 22; i++) {
        const k = i / 22, a = k * Math.PI * 7, r = t[2] * (0.34 - k * 0.28);
        G.push(sphereG(0.09, t[0] + Math.cos(a) * r, ty + t[2] * (0.2 + k * 0.7), t[1] + Math.sin(a) * r, [0xffd23a, 0xff4a3a, 0x4ad8ff, 0x7aff6a][i % 4], { ws: 5, hs: 4 }));
      }
      const star = starG(0.4, 0.17, 0, 0, 0, 0xffd23a);
      star.rotateX(Math.PI / 2); star.translate(t[0], ty + t[2] * 1.0, t[1]);
      G.push(star);
    }
    for (const s of st.snowmen ?? []) bakeModel(level, 'schneemann', {}, s[0], s[1], s[2], s[3] ?? -Math.PI / 2, 1, {}, { castShadow: true });
    for (const c of st.carts ?? []) {
      const [x, y, z] = c;
      S.push(blockG(1.2, 0.12, 2.2, x, y + 0.45, z, 0x5a6a7a, { r: 0.03 }), blockG(0.06, 0.6, 0.06, x, y + 0.45, z + 1.1, 0x3a3a46, { r: 0 }));
      for (const s of [-1, 1]) for (const t of [-0.7, 0.7]) N.push(cylG(0.2, 0.2, 0.08, x + s * 0.62, y + 0.2, z + t, 0x2a2a30, 10, { rz: Math.PI / 2, center: true }));
      S.push(blockG(0.8, 0.5, 0.6, x - 0.1, y + 0.57, z - 0.5, 0x8a3a2a, { r: 0.06 }), blockG(0.7, 0.42, 0.5, x + 0.05, y + 0.57, z + 0.3, 0x3a5a8a, { r: 0.06 }), blockG(0.6, 0.36, 0.45, x, y + 1.07, z - 0.4, 0xc8a050, { r: 0.06 }));
    }
    for (const c of st.coal ?? []) S.push(sphereG(c[3] ?? 2, c[0], c[1], c[2], 0x2a2630, { sy: 0.45, ws: 10, hs: 6, half: true, fn: (p, n, o) => mixc(L(0x1e1c24), L(0xf2f6ff), smooth(0.75, 0.95, n.y), o) }));
  }

  // ---- Lokschuppen (Halbrund hinter der Drehscheibe), Gleise zu den Ständen, Drehscheiben-Brücke
  if (cfg.lokschuppen) {
    const o = cfg.lokschuppen, [cx, cy, cz] = o.center, r0 = o.r0 ?? 13, r1 = o.r1 ?? 21, n = o.stalls ?? 5;
    const a0 = o.from ?? Math.PI + 0.32, a1 = o.to ?? Math.PI * 2 - 0.32, da = (a1 - a0) / n, Hh = 5.2;
    const place = (g, r, a, y, tang) => { g.rotateY(tang ? -a - Math.PI / 2 : -a); g.translate(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r); return g; };
    for (let i = 0; i <= n; i++) {
      const a = a0 + i * da;
      S.push(place(box(r1 - r0, Hh, 0.5, 0, Hh / 2, 0, 0xa0503a, { r: 0.04, seg: 1 }), (r0 + r1) / 2, a, cy, false));
      S.push(place(box(0.8, Hh + 0.4, 0.8, 0, (Hh + 0.4) / 2, 0, 0x9a96a6, { r: 0.05, seg: 1, topColor: 0xf6f9ff }), r0, a, cy, false));
    }
    for (let i = 0; i < n; i++) {
      const a = a0 + (i + 0.5) * da, chord0 = 2 * r0 * Math.sin(da / 2), chord1 = 2 * r1 * Math.sin(da / 2);
      S.push(place(box(chord1, Hh, 0.5, 0, Hh / 2, 0, 0xa0503a, { r: 0.04, seg: 1 }), r1, a, cy, true));
      S.push(place(box(chord0 - 0.6, 1.0, 0.55, 0, Hh - 0.5, 0, 0x9a96a6, { r: 0.04, seg: 1 }), r0, a, cy, true));
      // Tor: zwei Flügel mit weißem Kreuz (mittlerer Stand offen, drinnen eine kleine Rangierlok)
      if (i !== Math.floor(n / 2)) {
        const lw = chord0 / 2 - 0.5;
        for (const s of [-1, 1]) {
          const leaf = merge([box(lw, Hh - 1.1, 0.12, 0, (Hh - 1.1) / 2, 0, 0x2a5a3a, { r: 0.02, seg: 0 }), rodG([-lw / 2 + 0.1, 0.2, 0.08], [lw / 2 - 0.1, Hh - 1.3, 0.08], 0.06, 0xf4f0e0), rodG([lw / 2 - 0.1, 0.2, 0.08], [-lw / 2 + 0.1, Hh - 1.3, 0.08], 0.06, 0xf4f0e0)]);
          leaf.translate(s * (lw / 2 + 0.05), 0, 0);
          S.push(place(leaf, r0 + 0.1, a, cy, true));
        }
      } else {
        N.push(place(box(chord0 - 0.7, Hh - 1.1, 0.1, 0, (Hh - 1.1) / 2, 0, 0x1a1820, { r: 0, seg: 0 }), r0 + 3.5, a, cy, true));
        const lok = merge([cylG(0.7, 0.7, 2.6, 0, 1.6, 0, 0x2a7a4a, 14, { rx: Math.PI / 2, center: true }), blockG(1.8, 0.5, 3.8, 0, 0.4, 0.3, 0x2a2a30), blockG(1.7, 1.9, 1.3, 0, 0.9, 1.5, 0x2a7a4a, { top: 0x1a1a22 }), cylG(0.22, 0.26, 0.7, 0, 2.2, -0.9, 0x1a1a22, 8), sphereG(0.18, 0, 1.6, -1.35, 0xffe9a0, { ws: 8, hs: 6 })]);
        lok.rotateY(Math.PI / 2);
        S.push(place(lok, r0 + 2.0, a, cy, false));
      }
      // Dach (fällt nach hinten ab) mit Schnee, Rauchabzug
      const roof = box(r1 - r0 + 1.2, 0.3, chord1 + 0.3, 0, 0, 0, 0x5a5466, { r: 0.04, seg: 1, topColor: 0xf6f9ff });
      roof.rotateZ(-0.1);
      roof.translate(0, Hh + 0.55, 0);
      S.push(place(roof, (r0 + r1) / 2, a, cy, false));
      S.push(place(box(0.7, 1.4, 0.7, 0, Hh + 1.2, 0, 0x3a3a44, { r: 0.04, seg: 1, topColor: 0xf6f9ff }), (r0 + r1) / 2, a, cy, false));
      // Gleis vom Stand zur Drehscheibe
      const ri = o.rail ?? 10.4;
      for (const s of [-0.62, 0.62]) S.push(place(box(r0 + 1 - ri, 0.1, 0.1, 0, 0, s, 0x8a8fa8, { r: 0, seg: 0 }), (ri + r0 + 1) / 2, a, cy - 0.28, false));
    }
    // Drehscheiben-Brücke auf dem Arenaboden
    if (o.bridge) {
      const [bx, by, bz, R] = o.bridge;
      N.push(ringG(R - 0.7, 0.12, bx, by + 0.03, bz, 0x4a4656, 48, { tube: 4 }));
      for (const s of [-0.62, 0.62]) N.push(blockG(2 * (R - 1.0), 0.04, 0.12, bx, by + 0.01, bz + s, 0xb8bccc, { r: 0, seg: 0 }));
      for (let x = -R + 1.4; x < R - 1.2; x += 0.9) N.push(blockG(0.32, 0.02, 1.9, bx + x, by + 0.005, bz, 0x9a7a58, { r: 0, seg: 0 }));
    }
  }

  // ---- Dorf Schneetal (warm erleuchtete Häuser am Hang), Kapelle
  for (const h of cfg.village ?? []) {
    const [x, z, yaw, col] = h;
    const hs = houseG(x, H(x, z), z, { w: 4.4, d: 5.6, h: 3.0, rh: 2.4, wall: col ?? 0xd8a060, roof: 0x5a3a44, gable: col ?? 0xd8a060, yaw: yaw ?? 0 });
    S.push(...hs.solid); G.push(...hs.glow);
  }
  if (cfg.chapel) {
    const [x, z] = cfg.chapel, y = H(x, z);
    const hs = houseG(x, y, z, { w: 4.4, d: 7, h: 3.6, rh: 2.8, wall: 0xf2ece0, roof: 0x7a2a2a, gable: 0xf2ece0, chimney: false, doorColor: 0x7a4a2a });
    S.push(...hs.solid); G.push(...hs.glow);
    S.push(blockG(1.8, 6.4, 1.8, x, y, z + 3.9, 0xf2ece0, { r: 0.04 }));
    S.push(coneG(1.5, 3.4, x, y + 6.4, z + 3.9, 0x7a2a2a, 4, { ry: Math.PI / 4 }));
    G.push(blockG(0.5, 0.8, 0.1, x, y + 4.6, z + 4.82, 0xffd27a, { r: 0.04, seg: 0 }));
  }

  bakeSections(level, S, { castShadow: true });
  bakeSections(level, N, { castShadow: false });
  bakeSections(level, G, { material: 'glow', castShadow: false });

  // ---- Rentierherde, Dampf, Krümel am Ziel
  if (cfg.herd) sc.herd = new Rentiere(level, { ...cfg.herd, ground: H });
  if (cfg.steam) sc.steam = new Dampf(level, cfg.steam);
  if (cfg.kruemelZiel) sc.kruemelZiel = new KruemelZiel(level, cfg.kruemelZiel, () => ['pipe', 'gone'].includes(level._zugScene?.kruemel?.state));
  return sc;
}
