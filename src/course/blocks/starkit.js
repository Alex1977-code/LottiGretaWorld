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
//   + aus w8kit/w7kit/w2kit: figures, MovingBox, regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures,
//     killFigures, sphereTouches, boxTouches, cycle, onRespawn, ease, clamp, TAU, modelOr, glowTexture, spikeGeo

import { courseSave } from '../level/CourseSave.js';
import { MovingBox, figures } from './w2kit.js';
import {
  regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures, killFigures, sphereTouches, boxTouches, cycle, onRespawn,
  ease, clamp, TAU, modelOr, glowTexture, spikeGeo,
} from './w8kit.js';

export {
  MovingBox, figures, regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures, killFigures, sphereTouches, boxTouches,
  cycle, onRespawn, ease, clamp, TAU, modelOr, glowTexture, spikeGeo,
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
  plate: { blau: 0x3a8aff, gelb: 0xffd23a, rot: 0xff4a5a, gruen: 0x4ad86a, lila: 0xa86aff, weiss: 0xf4f2ff, rosa: 0xff7ac0, orange: 0xff9a2e },
};

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
