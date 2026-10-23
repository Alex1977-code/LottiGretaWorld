// Gemeinsame Hilfen der Welt-3-Bausteine (blocks/types/w3_*.js, deco_w3.js, entities/kinds/w3_*.js). Liegt bewusst
// außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   sharedInstances(level, name, cap)   Instanz-Gruppe je Level (createInstanced: schneeblock|eisblock|tanne_schnee|
//                                       eiszapfen …) mit Platzvergabe alloc()/free(i); ein Zeichenaufruf je Teil
//   wantOf(level, player)              Wunschrichtung der Figur aus Stick und Kamera-Gier ({ x, z, mag })
//   rotXZ(lx, lz, yaw)                 lokale Lage (Modell-Koordinaten, Blick +X) → Welt-Versatz (Drehung um +Y)
//   snapYaw(yaw)                       auf 90°-Raster runden (achsenparallele Kollision)
//   waterTopAt(level, x, z, y0)        Wasseroberfläche unter (x, z) (Strahl von y0 nach unten) oder null
//   banner(level, text, opts)          große Ansage in der Bildmitte (Archetyp-HUD oder eigenes)
//   slideSlope(shape, k)               Rampe als Rutschhang: meldet die Neigung mindestens als k (> slopeSlide 0,75) –
//                                      die Figur rutscht dann mit dem vorhandenen Motor ohne Ducken bergab

import { createInstanced } from '../models/lib/instanced.js';
import { ArchHud } from '../archetypes/hud.js';
import { visDt } from '../entities/gimmick.js';

export { figures, MovingBox, modelObject, bakeModel, yawOf } from './w2kit.js';

/** Instanz-Gruppe je Level und Name: { api, alloc(), free(i) }. */
export function sharedInstances(level, name, cap = 160, opts) {
  if (!level.view) return null;
  level._w3inst ??= new Map();
  let g = level._w3inst.get(name);
  if (g) return g;
  const api = createInstanced(name, cap, opts);
  const holder = {};
  level.view.add(api.root, (dt) => api.update(visDt(level, holder, dt)));
  const free = [];
  let next = 0;
  g = {
    api,
    alloc() { if (free.length) return free.pop(); if (next >= cap) return -1; return next++; },
    free(i) { if (i < 0) return; api.hide(i); free.push(i); },
  };
  level._w3inst.set(name, g);
  return g;
}

/** Wunschrichtung (Weltebene) der Figur aus ihrer letzten Eingabe. */
export function wantOf(level, p) {
  const inp = p?.input;
  if (!inp) return { x: 0, z: 0, mag: 0 };
  const cy = level.controlYaw ?? 0, c = Math.cos(cy), s = Math.sin(cy);
  let wx = c * (inp.moveX ?? 0) - s * (inp.moveY ?? 0);
  let wz = -s * (inp.moveX ?? 0) - c * (inp.moveY ?? 0);
  const l = Math.hypot(wx, wz);
  if (l < 1e-6) return { x: 0, z: 0, mag: 0 };
  wx /= l; wz /= l;
  return { x: wx, z: wz, mag: inp.mag ?? Math.min(1, l) };
}

/** Lokale Lage (lx entlang Blick +X, lz quer) → Weltversatz bei Gier yaw (Three.js-Drehung um +Y). */
export function rotXZ(lx, lz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}

export function snapYaw(yaw) { return Math.round((yaw ?? 0) / (Math.PI / 2)) * (Math.PI / 2); }

/** Achsenparalleler Umriss eines lokalen Quaders (x: lx0..lx1 entlang Blick, z: lz0..lz1) bei Gier yaw um (x, z). */
export function yawBox(x, y0, z, lx0, lx1, h, lz0, lz1, yaw) {
  const xs = [], zs = [];
  for (const a of [lx0, lx1]) for (const b of [lz0, lz1]) { const w = rotXZ(a, b, yaw); xs.push(x + w.x); zs.push(z + w.z); }
  return { min: [Math.min(...xs), y0, Math.min(...zs)], max: [Math.max(...xs), y0 + h, Math.max(...zs)] };
}

/** Wasseroberfläche unter (x, z): Strahl von y0 nach unten (nur Wasserformen). */
export function waterTopAt(level, x, z, y0 = 60, dist = 120) {
  const hit = level.world.raycastDown(x, y0, z, dist, { water: true, ignore: (s) => !s.water });
  return hit?.shape?.water ? hit.y : null;
}

/** Große Ansage (Archetyp-HUD, sonst ein eigenes, das je Bild weitergereicht wird). */
export function banner(level, text, opts = {}) {
  let hud = level.archetype?.hud;
  if (!hud && level.scene?.scene && level.view) {
    if (!level._w3hud) {
      level._w3hud = new ArchHud(level.scene);
      level.view.onFrame(() => level._w3hud.tick());
    }
    hud = level._w3hud;
  }
  level.lastBanner = text;
  hud?.banner?.(text, opts);
}

/** Rampen-Form als Rutschhang: Neigung mindestens k (Motor: ab slopeSlide 0,75 rutscht die Figur ohne Ducken). */
export function slideSlope(shape, k = 0.85) {
  let real = shape.slope ?? 0;
  Object.defineProperty(shape, 'slope', {
    configurable: true, enumerable: true,
    get() { return Math.max(real, k); },
    set(v) { real = v; },
  });
  shape.slide = true;
  return shape;
}

/** Modell wirft keinen Sonnenschatten (Unterwasser-Kulisse, Kleinkram: spart Zeichenaufrufe im Schattenpass). */
export function noShadow(model) {
  model?.root?.traverse((o) => { if (o.isMesh || o.isInstancedMesh) o.castShadow = false; });
  return model;
}

/** Deterministischer Zufall (0..1) aus Zahlen. */
export function hash01(a, b = 0, c = 0) {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
