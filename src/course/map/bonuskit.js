// Gemeinsame Bausteine der Karten der Bonuswelten Pilz (10, pilz10.js), Blume (11, blume11.js) und Krone (12, krone12.js):
// Taktuhr je Kartenmusik (music.beat(), sonst Ersatzuhr im Tempo des Themas), Puls-Material 'bglow' (unbeleuchtet, Helligkeit
// im Takt – leuchtende Pilztupfen, Blütenstaub, Goldfunkeln), Insel-Hüllen (abgerundetes Rechteck um den begehbaren Block mit
// Rand-Profil, Unterseite und Stiel), Kanten-Läufe für Ränder zum Meer, Brücken-Hilfen, Registry-Modelle mit
// Dreiecks-Obergrenze (einbacken bzw. bewegt), Instanz-Flächen und Sichtprüfung. Vertrag: docs/KURS-ARCHITEKTUR.md
// „Präzisierung (Mehrwelten-Karte): Welt Pilz / Welt Blume / Welt Krone (Notiz)“.
//
// Die Welt-Kits melden sich in BONUS_KITS an (Name = map.kit); MapBuilder, scenery.js und entrances.js fragen nur diese Tabelle
// (eine Zeile je Anbindung). Ein Kit liefert: ground(b, base, theme, rnd, map) → Teil-Geometrien (userData.noShadow/material/
// tile), segment(level, seg) → bool, scatter(level, map, grid), edgeGeo(kind, len, seed), propGeo/propGlow/propShape/propModel,
// propTile(it, o), Life (Klasse: update(dt, t), liveInfo(), dispose()), isletParts(x, z, w, d, top, rnd), neighborParts(nb, rnd),
// glowTile (Name der Leucht-Kachel), sea: 'meer' | 'wolken', foam (bool), decorate(ev, kind, x, y, z) → bool.

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { colorize, lin, mixc, smooth } from '../../three/world/geometry.js';
import { music } from '../../audio/index.js';
import { getModel, hasModel } from '../models/index.js';
import { glowTexture } from '../../three/lib/itemMaterials.js';
import { modelTris } from './beach5.js';
import { bakeModel } from './bake.js';
import { LowBuild as Build, place } from './desert.js';

export { Build, place, mix, TAU, cached, vcol, lin, mixc, smooth, colorize };

export const PI = Math.PI;
export const FRONT = -PI / 2;   // Registry-Modelle blicken nach +X, die Kulissen nach +Z (Kamera)

/** Kits der Bonuswelten (map.kit → Kit); die Welt-Dateien melden sich beim Laden an. */
export const BONUS_KITS = {};
export function registerKit(name, kit) { BONUS_KITS[name] = kit; return kit; }
export const bonusKit = (map) => (map?.kit ? BONUS_KITS[map.kit] ?? null : null);
/** Rand-Optik einer Bonuswelt nach Art (Ränder heißen je Welt eindeutig), sonst null. */
export function bonusEdgeGeo(kind, len, seed) {
  for (const k of Object.values(BONUS_KITS)) { const g = k.edgeGeo?.(kind, len, seed); if (g) return g; }
  return null;
}
/** Kulisse eines Eingangs der Bonuswelten (entrances.js); false = unbekannte Art. */
export function decorateBonus(ev, kind, x, y, z) {
  for (const k of Object.values(BONUS_KITS)) if (k.decorate?.(ev, kind, x, y, z)) return true;
  return false;
}
/** Ferne Nachbarwelt eines Bonuswelt-Stils (scenery.js buildNeighbor); [] = unbekannter Stil. */
export function bonusNeighborParts(nb, rnd) {
  for (const k of Object.values(BONUS_KITS)) { const p = k.neighborParts?.(nb, rnd); if (p?.length) return p; }
  return [];
}

// ------------------------------------------------------------------ kleine Hilfen

export const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
export const hash1 = (x) => { const h = Math.sin(x * 12.9898) * 43758.5453; return h - Math.floor(h); };
export const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
export const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
/** Teil ohne Schattenwurf markieren (optional Material und benannte Kachel). */
export function flat(g, material = null, tile = null) {
  if (g) { g.userData.noShadow = true; if (material) g.userData.material = material; if (tile) g.userData.tile = tile; }
  return g;
}
/** Teil mit Material/Kachel markieren (Schattenwurf bleibt). */
export function mark(g, material = null, tile = null) {
  if (g) { if (material) g.userData.material = material; if (tile) g.userData.tile = tile; }
  return g;
}

// ------------------------------------------------------------------ Taktuhr

/** Puls je Zählzeit: hell am Taktschlag, klingt danach ab (0,4 … 1). */
export const beatPulse = (frac) => 0.4 + 0.6 * Math.exp(-3.2 * frac);

/**
 * Taktuhr einer Kartenmusik: now(t) → { beat, source, theme, bpm } aus music.beat() (läuft Musik), sonst aus der Bildzeit
 * im Tempo des Themas (Ersatzuhr, source 'zeit'; fehlt das Thema: course_map). at(t) ergänzt whole, frac und Puls k.
 */
export function beatClock(theme) {
  let bpm = 0;
  const BPM = () => bpm || (bpm = music.themeInfo?.(theme)?.bpm ?? music.themeInfo?.('course_map')?.bpm ?? 120);
  const now = (t) => {
    const mb = music.beat();
    const useMusic = mb.bpm > 0 && mb.playing;
    return { beat: useMusic ? mb.beat : (t * BPM()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : BPM() };
  };
  const at = (t) => {
    const b = now(t);
    const whole = Math.floor(b.beat), frac = b.beat - whole;
    return { ...b, whole, frac, k: beatPulse(frac) };
  };
  return { theme, bpm: BPM, now, at };
}

/**
 * Puls-Material 'bglow' (unbeleuchtet, Vertexfarben) für Leuchtendes, das im Takt der Kartenmusik heller wird (eine
 * Material-Farbe je Bild – kein eigener Zeichenaufruf je Leuchte). Vor dem ersten addStatic einrichten.
 */
export function bonusGlow(view) {
  if (!view) return null;
  if (!view.mats.bglow) view.mats.bglow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  return view.mats.bglow;
}

// ------------------------------------------------------------------ Insel-Hüllen

/**
 * Abstand vom Mittelpunkt bis zum Rand eines abgerundeten Rechtecks (Minkowski-Summe des um o vergrößerten Rechtecks
 * hw × hd mit einer Scheibe R) unter dem Winkel a. R = 0: das Rechteck selbst (vergrößert um o).
 */
export function rrRay(hw, hd, o, R, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const A = hw + o, B = hd + o;
  if (R <= 0) return Math.min(A / Math.max(1e-6, Math.abs(c)), B / Math.max(1e-6, Math.abs(s)));
  const ia = Math.max(0, A - R), ib = Math.max(0, B - R);
  const d = (t) => Math.hypot(Math.max(Math.abs(c * t) - ia, 0), Math.max(Math.abs(s * t) - ib, 0));
  let lo = 0, hi = Math.hypot(A, B) + R + 1;
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (d(m) < R) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Ring aus N Punkten [x, y, z] um (cx, cz) im Abstand rrRay(hw, hd, o, R) – Winkel gleichmäßig. */
export function ringPts(cx, cz, hw, hd, o, R, y, N, wob = null) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    let t = rrRay(hw, hd, o, R, a);
    if (wob) t += wob(a, i);
    out.push([cx + Math.cos(a) * t, typeof y === 'function' ? y(a, i) : y, cz + Math.sin(a) * t]);
  }
  return out;
}

/**
 * Fläche zwischen zwei Ringen gleicher Punktzahl (geschlossen). want(x, y, z) → [nx, ny, nz] gewünschte Normalen-Richtung
 * (Dreiecke werden passend gedreht); colA/colB: Farbe je Ring (Hex, [r, g, b] linear oder Funktion (p) → [r, g, b]).
 */
export function ringStrip(A, B, colA, colB, want) {
  const N = A.length;
  const pos = [], col = [];
  const cv = (c, p) => (typeof c === 'function' ? c(p) : Array.isArray(c) ? c : lin(c));
  const push = (p, c) => { pos.push(p[0], p[1], p[2]); col.push(c[0], c[1], c[2]); };
  const tri = (p0, c0, p1, c1, p2, c2) => {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const m = [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3, (p0[2] + p1[2] + p2[2]) / 3];
    const w = want(m[0], m[1], m[2]);
    if (nx * w[0] + ny * w[1] + nz * w[2] < 0) { push(p0, c0); push(p2, c2); push(p1, c1); } else { push(p0, c0); push(p1, c1); push(p2, c2); }
  };
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const a0 = A[i], a1 = A[j], b0 = B[i], b1 = B[j];
    const ca0 = cv(colA, a0), ca1 = cv(colA, a1), cb0 = cv(colB, b0), cb1 = cv(colB, b1);
    tri(a0, ca0, a1, ca1, b1, cb1);
    tri(a0, ca0, b1, cb1, b0, cb0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Fächer von einem Ring zu einem Punkt (geschlossen), Farbe je Ecke wie ringStrip. */
export function ringFan(A, tip, colA, colTip, want) {
  return ringStrip(A, A.map(() => tip), colA, colTip, want);
}

/**
 * Rand-Profil um einen Block: rings = Liste von { o, R, dy, col, wob? } (Abstand zum Rechteck, Eckradius, Höhe relativ zu
 * top, Farbe); Flächen zwischen aufeinanderfolgenden Ringen. Normalen zeigen nach außen/oben (Standard) bzw. nach unten
 * (down: true am Ring), passend zum Profil.
 */
export function profileParts(b, rings, N = 64) {
  const [x0, z0, x1, z1] = b.rect;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2;
  const pts = rings.map((r) => ringPts(cx, cz, hw, hd, r.o, r.R ?? 0, b.top + r.dy, N, r.wob ?? null));
  const out = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const r0 = rings[k], r1 = rings[k + 1];
    const down = !!r1.down;
    out.push(ringStrip(pts[k], pts[k + 1], r0.col, r1.col, (x, y, z) => {
      const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1;
      return down ? [dx / l * 0.3, -1, dz / l * 0.3] : [dx / l, r1.up ?? 0.25, dz / l];
    }));
  }
  return { parts: out, rings: pts, cx, cz, hw, hd };
}

/**
 * Stiel (Pilz, Blume) bzw. Säule unter einer Insel: Drehkörper mit leicht bauchigem Profil von y0 bis y1, Radius r
 * (elliptisch über sx/sz), Farbe col (Hex oder { v }). Ohne Deckel.
 */
export function stemGeo(x, z, r, y0, y1, col, { sx = 1, sz = 1, seg = 14, bulge = 0.1, flare = 0.25 } = {}) {
  const h = y1 - y0;
  const pts = [[r * (1 + flare), 0], [r * (1 + flare * 0.4), h * 0.06], [r * (1 + bulge * 0.3), h * 0.3], [r * (1 + bulge), h * 0.6], [r * (1 + bulge * 0.4), h * 0.9], [r * (1 + flare * 0.6), h]];
  const b = new Build();
  b.lathe(pts, col, null, seg);
  const g = b.geometry();
  g.scale(sx, 1, sz);
  g.translate(x, y0, z);
  return g;
}

// ------------------------------------------------------------------ Kanten-Läufe (Ränder zum Meer)

/**
 * Läufe entlang der Kartenränder, hinter denen tiefer Abgrund bzw. Meer liegt (Brücken ausgenommen): [{ w, a, b, y }]
 * (w = Wandkante aus grid.walls(), a/b = Abschnitt entlang der Kante, y = Bodenhöhe innen).
 */
export function edgeRuns(level, map, grid, drop = 3.6) {
  const ground = (x, z) => level.world.raycastDown(x, 80, z, 120)?.y ?? null;
  const onBridge = (x, z) => (map.walk ?? []).some(([a, b, c, d]) => x >= a - 0.05 && x <= c + 0.05 && z >= b - 0.05 && z <= d + 0.05);
  const sea = map.sea ?? 0;
  const runs = [];
  for (const w of grid.walls()) {
    const len = w.axis === 'x' ? w.z1 - w.z0 : w.x1 - w.x0;
    const n = Math.max(1, Math.round(len));
    const step = len / n;
    let cur = null;
    for (let i = 0; i < n; i++) {
      const u = (w.axis === 'x' ? w.z0 : w.x0) + (i + 0.5) * step;
      const [ix, iz, ox, oz] = w.axis === 'x' ? [w.x - w.side * 0.25, u, w.x + w.side * 0.75, u] : [u, w.z - w.side * 0.25, u, w.z + w.side * 0.75];
      const hin = ground(ix, iz), hout = ground(ox, oz);
      const ok = hin !== null && !onBridge(ix, iz) && (hout === null || hout < hin - drop || hout <= sea + 0.3);
      if (ok && cur && Math.abs(cur.y - hin) < 0.05) { cur.b = u + step / 2; continue; }
      if (cur) { runs.push(cur); cur = null; }
      if (ok) cur = { w, a: u - step / 2, b: u + step / 2, y: hin };
    }
    if (cur) runs.push(cur);
  }
  return runs;
}
/** Punkt auf einem Kanten-Lauf (u = Lage entlang der Kante, inset = Abstand nach innen). */
export function runPoint(r, u, inset = 0.25) {
  const off = -r.w.side * inset;
  return r.w.axis === 'x' ? [r.w.x + off, r.y, u] : [u, r.y, r.w.z + off];
}

// ------------------------------------------------------------------ Brücken-Hilfen

export function spanOf(spec) {
  const a = spec.from, c = spec.to;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), dy = c[1] - a[1];
  return { a, c, L, dy, pitch: Math.atan2(dy, L), Ld: Math.hypot(L, dy), w: spec.width ?? 4 };
}
/** Geometrie in Brückenlage (lokal +X entlang der Brücke, Ursprung = from). */
export function placeAlong(g, a, c) {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  g.rotateY(Math.atan2(-dz / L, dx / L));
  g.translate(a[0], a[1], a[2]);
  return g;
}
export const alongAt = (u, pitch) => [u * Math.cos(pitch), u * Math.sin(pitch)];
/** Lokaler Punkt (lx längs, ly hoch, lz quer) einer Brücke von a nach c → Weltkoordinaten. */
export function worldAlong(a, c, lx, ly, lz) {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  return [a[0] + lx * ux - lz * uz, a[1] + ly, a[2] + lx * uz + lz * ux];
}

// ------------------------------------------------------------------ Registry-Modelle, Instanzen, Sicht

/**
 * Modell-Werkzeug je Welt (tag 'w10' …): benutzte/zu schwere Registry-Modelle (state().decor.<tag>models/<tag>heavy),
 * bake(ev, …) backt ein Modell als statische Kulisse in die Kachel '<tag>:<Id>' (Fern-Ausblendung), Leuchtteile in die
 * Leucht-Kachel; live(ev, …) stellt es als bewegtes Objekt auf (Sichtprüfung). Beide liefern false/null, wenn das Modell
 * fehlt oder schwerer als maxTris ist – dann zeichnet die Kulisse eigene Geometrie an gleicher Stelle.
 */
export function modelKit(tag) {
  const used = new Set(), heavy = new Map();
  const glowTile = `${tag}:leuchten`;
  const tooHeavy = (name, opts, max) => { const n = modelTris(name, opts); if (n > max) { heavy.set(name, Number.isFinite(n) ? Math.round(n) : -1); return true; } return false; };
  const has = (name, opts, max) => hasModel(name) && !tooHeavy(name, opts ?? {}, max);
  function bake(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true, maxTris = 6000, dt = 0, tile = null) {
    if (!has(name, opts, maxTris)) return false;
    const add = (g, o) => (o?.material === 'glow' ? ev.addStatic(g, { ...o, castShadow: false, tile: glowTile })
      : cast && o?.castShadow !== false ? ev.addStatic(g, { ...o, tile: tile ?? `${tag}:${ev.id}`, lod: true })
        : ev.addStatic(g, { ...o, castShadow: false }));
    const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state, dt);
    if (ok) used.add(name);
    return ok;
  }
  /** Wie bake, aber in eine beliebige addStatic-Funktion (Requisiten, Streudeko). */
  function bakeInto(add, name, opts, pos, yaw = FRONT, scale = 1, state = null, maxTris = 6000, dt = 0) {
    if (!has(name, opts, maxTris)) return false;
    const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state, dt);
    if (ok) used.add(name);
    return ok;
  }
  function live(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true, maxTris = 8000, far = 50, follow = false) {
    if (!has(name, opts, maxTris)) return null;
    const m = getModel(name, opts ?? {});
    if (m.placeholder) { m.dispose?.(); return null; }
    m.root.position.set(pos[0], pos[1], pos[2]);
    m.root.rotation.y = yaw;
    if (scale !== 1) m.root.scale.setScalar(scale);
    m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
    ev.view.add(m.root);
    ev.own.push(m);
    m.update(0, typeof state === 'function' ? state(0, 0) : state);
    ev.updaters.push((dt, t) => { if (m.root.visible) m.update(dt, typeof state === 'function' ? state(dt, t) : state); });
    cullByView(ev, m.root, pos[0], pos[1] + 1.5 * scale, pos[2], 4 * scale, far, follow);
    used.add(name);
    return m;
  }
  const info = () => ({ [`${tag}models`]: [...used].sort(), [`${tag}heavy`]: Object.fromEntries(heavy) });
  return { tag, used, heavy, glowTile, tooHeavy, has, bake, bakeInto, live, info };
}

const _fr = new THREE.Frustum(), _fm = new THREE.Matrix4();
let _frFrame = -1;
/** Sichtkegel der Kamera (einmal je Bild berechnet). */
export function viewFrustum(view) {
  const cam = view.camera;
  if (_frFrame !== view.frame) {
    _frFrame = view.frame;
    cam.updateMatrixWorld();
    _fr.setFromProjectionMatrix(_fm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  }
  return _fr;
}
/** Objekt nur zeichnen, wenn seine Hüllkugel im Bild und näher als far m ist (Mitte folgt optional dem Objekt). */
export function cullByView(ev, obj, cx, cy, cz, r, far = 60, follow = false) {
  const S = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
  ev.updaters.unshift(() => {
    const cam = ev.view.camera;
    if (follow) S.center.set(obj.position.x, obj.position.y + 1, obj.position.z);
    obj.visible = cam.position.distanceTo(S.center) - r < far && viewFrustum(ev.view).intersectsSphere(S);
  });
}
/** Sichtprüfung einer Kugel (für Instanz-Flächen und Gruppen). */
export function inView(view, x, y, z, r, far = 60) {
  const cam = view.camera;
  _sph.center.set(x, y, z); _sph.radius = r;
  return cam.position.distanceTo(_sph.center) - r < far && viewFrustum(view).intersectsSphere(_sph);
}
const _sph = new THREE.Sphere();

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
/** Instanz-Matrix setzen (Lage, Gier ry, Maßstab s oder [sx, sy, sz], Neigung rx/rz). */
export function setInst(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}
/** Instanz-Fläche (eigenes Material nach Vertexfarben bzw. opts.material), ohne Frustum-Culling. */
export function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.5, opts.extra ?? {}, opts.key ?? 'bonusinst'), Math.max(1, n));
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = opts.name ?? 'bonus:instanzen';
  (ev.view ?? ev).add(m);
  ev.own?.push(m);
  return m;
}
/** Statische Geometrie (gecacht) an (x, y, z) einbacken. */
export function addGeo(ev, key, make, x, y, z, yaw = 0, cast = true, material = null, tile = null) {
  const o = { castShadow: material === 'glow' || material === 'bglow' ? false : cast };
  if (material) o.material = material;
  if (tile) o.tile = tile;
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), o);
}
/** Eigenes bewegtes Mesh (Vertexfarben) an (x, y, z). */
export function mover(ev, geo, x, y, z, name, shadow = true, material = null) {
  const m = new THREE.Mesh(geo, material ?? vcol(0.5, {}, 'bonusdecor'));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.name = name;
  ev.view.add(m);
  return m;
}
/** Zustand für Tests (state().decor) ergänzen. */
export function addInfo(ev, fn) {
  const prev = ev.liveInfo;
  ev.liveInfo = () => ({ ...(prev ? prev() : {}), ...fn() });
}
export const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
export const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
/** Weicher additiver Schein (Sprite). */
export function haloSprite(ev, color, size, opacity = 0.6) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, opacity, depthWrite: false, fog: true });
  ev.own.push(mat);
  const sp = new THREE.Sprite(mat);
  sp.scale.setScalar(size);
  return sp;
}
/** Scheibe, die zur Kamera blickt (nach Süden, leicht nach oben gekippt) – für Sonne, Mond, Zifferblatt. */
export function camDisc(r, color, seg = 24) {
  const g = new THREE.CircleGeometry(r, seg);
  g.rotateX(-0.35);
  const b = new Build();
  b.add(g, color);
  return b.geometry();
}
/** Lichtkegel (additiv, beidseitig) von der Spitze (Ursprung) nach −Y, Länge len, Öffnungsradius r. */
export function beamGeo(r, len, seg = 14) {
  const g = new THREE.ConeGeometry(r, len, seg, 1, true);
  g.translate(0, -len / 2, 0);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const k = 1 - Math.min(1, -pos.getY(i) / len) * 0.92; col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/** Additives Material für Lichtkegel/Scheine (Vertexfarben als Helligkeit). */
export function beamMat(color, opacity = 0.35) {
  return new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
}

/** Mehrere Teil-Geometrien zu einer (Attribute außer position/normal/color entfernt), null ohne Teile. */
export function mergeParts(parts) {
  const b = new Build();
  for (const p of parts) {
    if (!p) continue;
    const g = p.index ? p.toNonIndexed() : p;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    b.parts.push(g);
  }
  return b.parts.length ? b.geometry() : null;
}
