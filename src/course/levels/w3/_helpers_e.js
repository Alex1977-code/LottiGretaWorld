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
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';

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
