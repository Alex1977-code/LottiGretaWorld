// Gemeinsame Hilfen der Bausteine der Bonuswelt Stern „Sternenzelt“ (blocks/types/star_*.js, deco_star.js,
// entities/kinds/star_gimmicks.js) und der Remix-Technik. Liegt bewusst außerhalb von types/ (die Registry sammelt nur
// types/*.js). Präzisierung „Motor und Bausteine Bonuswelten“.
//
//   star(level)                     Sammelstelle je Level: { clocks, plates, colors, walls, rollers, drums, poles, towers,
//                                   topdown, combs, fogs, boards, cannons, dioramas, rocks, rewards }
//   unlockOutfit(name, from)        Kostüm freischalten (courseSave.data.outfits[name] = { from, at }, additiv) → true, wenn neu
//   hasOutfit(name), outfits()      freigeschaltet? / Liste der Namen
//   camYawAt(level, x, z)           Blickrichtung der Kamera auf den Punkt (Grad, wie CameraRig: 0 = Kamera bei +Z, + = nach +X)
//   yawIn(yaw, [a, b])              liegt die Gier (Grad) im Bereich a … b (Grad, auch über ±180°)?
//   PAL                             Regenbogen-/Pastellfarben der Welt Stern (Hex)
//   plateGeos(w, h, d, frame)       Platten-Geometrie: Kern (weiß, je Instanz getönt) + weißer Rahmen
//   PlateSet                        Instanz-Platten (Kern + Rahmen = 2 Zeichenaufrufe für alle Platten eines Bausteins)
//   standerOn(level, owner)         Figur, die auf einer Form dieses Besitzers steht (oder null)
//   + aus w8kit/w7kit/w2kit: figures, MovingBox, regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures,
//     killFigures, sphereTouches, boxTouches, cycle, onRespawn, ease, clamp, TAU, modelOr, glowTexture, spikeGeo
//   + Geometrie: lin, mixc, smooth, colorize, merge, roundedBox, SIDE

import * as THREE from 'three';
import { courseSave } from '../level/CourseSave.js';
import { MovingBox, figures } from './w2kit.js';
import {
  regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures, killFigures, sphereTouches, boxTouches, cycle, onRespawn,
  ease, clamp, TAU, modelOr, glowTexture, spikeGeo,
} from './w8kit.js';
import { roundedBox, colorize, merge, lin, mixc, smooth, SIDE } from '../../three/world/geometry.js';
import { addObject } from './kit.js';
import { visDt } from '../entities/gimmick.js';

export {
  MovingBox, figures, regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures, killFigures, sphereTouches, boxTouches,
  cycle, onRespawn, ease, clamp, TAU, modelOr, glowTexture, spikeGeo, lin, mixc, smooth, colorize, merge, roundedBox, SIDE,
};

/** Sammelstelle der Stern-Bausteine je Level. */
export function star(level) {
  return (level.star ??= {
    clocks: [], plates: [], colors: [], walls: [], rollers: [], drums: [], poles: [], towers: [], topdown: [], combs: [], fogs: [],
    boards: [], cannons: [], dioramas: [], rocks: [], rewards: [],
  });
}

/** Regenbogen- und Pastellfarben (Weltraum-Wege, Platten, Kulisse). */
export const PAL = {
  rainbow: [0xff5a6a, 0xff9a3a, 0xffd23a, 0x5ad86a, 0x3ab8ff, 0x8a6aff, 0xff7ad8],
  pastel: [0xffb8d8, 0xffd8a8, 0xfff0a0, 0xb8f0c0, 0xa8dcff, 0xd0c0ff],
  plate: { blau: 0x3a8aff, gelb: 0xffd23a, rot: 0xff4a5a, gruen: 0x4ad86a, lila: 0xa86aff, weiss: 0xf4f2ff, rosa: 0xff7ac0, orange: 0xff9a2e, tuerkis: 0x3ad8e0 },
};
/** Farbname oder Hex → Hex. */
export const plateColor = (c, d = 0x3a8aff) => (typeof c === 'number' ? c : PAL.plate[c] ?? d);

// ------------------------------------------------------------------ Kostüme (Sternenglanz)

/** Kostüm freischalten (additiv im Spielstand: data.outfits = { name: { from, at } }). → true, wenn neu. */
export function unlockOutfit(name, from = null) {
  const d = courseSave.data;
  d.outfits ??= {};
  if (d.outfits[name]) return false;
  d.outfits[name] = { from, at: Date.now() };
  courseSave.save();
  return true;
}
export const hasOutfit = (name) => !!courseSave.data.outfits?.[name];
export const outfits = () => Object.keys(courseSave.data.outfits ?? {});

// ------------------------------------------------------------------ Kamera-Blick

const DEG = 180 / Math.PI;
/** Gier der Kamera, von (x, z) aus gesehen (Grad; 0 = Kamera bei +Z, positiv = Kamera nach +X) – null ohne Ansicht. */
export function camYawAt(level, x, z) {
  const cam = level.view?.camera;
  if (!cam) return null;
  return Math.atan2(cam.position.x - x, cam.position.z - z) * DEG;
}

/** Gier (Grad) im Bereich [a, b] (Grad; a > b = über ±180° hinweg)? */
export function yawIn(yaw, r) {
  if (yaw === null || yaw === undefined || !Array.isArray(r)) return false;
  const n = (v) => ((v % 360) + 540) % 360 - 180;
  const y = n(yaw), a = n(r[0]), b = n(r[1]);
  return a <= b ? y >= a && y <= b : y >= a || y <= b;
}

// ------------------------------------------------------------------ Platten-Darstellung (Instanzen)

const PLATE_GEO = new Map();
/** Platten-Geometrie (Ursprung Mitte, Größe w × h × d): Kern (Vertexfarbe weiß, wird je Instanz getönt) und Rahmen (weiß). */
export function plateGeos(w, h, d, frame = 0.16) {
  const key = `${w}|${h}|${d}|${frame}`;
  let g = PLATE_GEO.get(key);
  if (g) return g;
  const inset = frame > 0 ? frame * 1.2 : 0;
  const core = colorize(roundedBox(w - inset, h, d - inset, Math.min(0.08, h * 0.3), SIDE.ALL, 0, 2), (p, n, o) => { const k = n.y > 0.5 ? 1 : n.y < -0.5 ? 0.5 : 0.78; o[0] = k; o[1] = k; o[2] = k; });
  const parts = [];
  if (frame > 0) {
    const fh = h + 0.04;
    for (const [fw, fd, x, z] of [[w, frame, 0, d / 2 - frame / 2], [w, frame, 0, -d / 2 + frame / 2], [frame, d - frame * 2, w / 2 - frame / 2, 0], [frame, d - frame * 2, -w / 2 + frame / 2, 0]]) {
      const b = roundedBox(fw, fh, fd, Math.min(0.06, frame * 0.4), SIDE.ALL, 0, 1);
      b.translate(x, 0.02, z);
      parts.push(b);
    }
  }
  const fr = parts.length ? colorize(merge(parts), (p, n, o) => { const k = n.y > 0.5 ? 1 : 0.8; o[0] = k; o[1] = k * 0.98; o[2] = k * 0.95; }) : null;
  g = { core, frame: fr };
  PLATE_GEO.set(key, g);
  return g;
}

const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3();
const _pc = new THREE.Color(), _white = new THREE.Color(1, 1, 1);

/**
 * Instanz-Platten (ein Zeichenaufruf für den Kern, einer für den Rahmen): n Platten der Größe size; set(i, { x, y, z (Mitte),
 * rx, rz (Kippwinkel), ry, color (Hex), glow (0..1 heller), scale }) und commit(); render(fn) ruft fn(d) je Bild und übernimmt.
 */
export class PlateSet {
  constructor(level, n, size, o = {}) {
    this.level = level;
    this.n = n;
    this.size = size;
    this.mesh = null;
    this.frameMesh = null;
    if (!level.view || !n) return;
    const g = plateGeos(size[0], size[1], size[2], o.frame ?? 0.16);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness ?? 0.45, metalness: 0.05, emissive: new THREE.Color(o.emissive ?? 0x000000) });
    this.mesh = new THREE.InstancedMesh(g.core, mat, n);
    this.mesh.name = o.name ?? 'platten';
    this.mesh.castShadow = o.shadow !== false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, _pc.setHex(0xffffff));
    addObject(level, this.mesh);
    if (g.frame) {
      const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, color: new THREE.Color(o.frameColor ?? 0xffffff), emissive: new THREE.Color(o.frameGlow ?? 0x1a1a24) });
      this.frameMesh = new THREE.InstancedMesh(g.frame, fm, n);
      this.frameMesh.name = `${this.mesh.name}_rahmen`;
      this.frameMesh.castShadow = false;
      this.frameMesh.frustumCulled = false;
      addObject(level, this.frameMesh);
    }
  }

  set(i, s) {
    if (!this.mesh) return;
    _pv.set(s.x, s.y, s.z);
    _pe.set(s.rx ?? 0, s.ry ?? 0, s.rz ?? 0, 'YXZ');
    _pq.setFromEuler(_pe);
    const k = s.scale ?? 1;
    _ps.set(k, k, k);
    _pm.compose(_pv, _pq, _ps);
    this.mesh.setMatrixAt(i, _pm);
    this.frameMesh?.setMatrixAt(i, _pm);
    if (s.color !== undefined) {
      _pc.setHex(s.color);
      if (s.glow) _pc.lerp(_white, Math.min(1, s.glow) * 0.5);
      this.mesh.setColorAt(i, _pc);
    }
  }

  commit() {
    if (!this.mesh) return;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.frameMesh) this.frameMesh.instanceMatrix.needsUpdate = true;
  }

  /** Je Bild fn(d) (d = Darstellungs-Schritt, folgt der Simulation) aufrufen und danach übernehmen. */
  render(fn) {
    if (!this.mesh) return;
    const holder = {};
    fn(0);
    this.commit();
    this.level.view.onFrame((dt) => { fn(visDt(this.level, holder, dt)); this.commit(); });
  }
}

/** Steht eine Figur (am Boden) auf einer Form mit diesem owner? → Figur | null */
export function standerOn(level, owner) {
  for (const f of figures(level)) if (f.mode === 'ground' && f.ground?.owner === owner) return f;
  return null;
}

/** Steckt eine Figur im Quader { x0, x1, y0, y1, z0, z1 }? (vor dem Wieder-fest-Werden einer Form) */
export function figureInside(level, b, pad = 0.02) {
  for (const f of figures(level)) {
    const h = f.half, p = f.pos;
    if (p.x + h.x > b.x0 + pad && p.x - h.x < b.x1 - pad && p.z + h.z > b.z0 + pad && p.z - h.z < b.z1 - pad && p.y + h.y * 2 > b.y0 + pad && p.y < b.y1 - pad) return f;
  }
  return null;
}
