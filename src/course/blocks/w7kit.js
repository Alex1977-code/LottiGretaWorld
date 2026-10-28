// Gemeinsame Hilfen der Welt-7-Bausteine „Lava-Festung“ (blocks/types/w7_*.js, deco_w7.js, entities/kinds/w7_gimmicks.js,
// player/powers/sichel.js). Liegt bewusst außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   w7(level)                       Sammelstelle je Level: { lavas, fogs, fountains, bars, rollers, pendulums, stompers,
//                                   bridges, arrows, groups, grates }
//   figures(level)                  aktive Spielfiguren (auch Klone)
//   modelOr(name, opts, make)       Registry-Modell, sobald es den Namen gibt, sonst make() → { root, update?, dispose? }
//   lavaTopAt(level, x, z, y?)      Oberfläche der höchsten Lava (Form mit kill 'lava') an (x, z) – folgt steigender/sinkender
//                                   Lava (lavaspiegel); y begrenzt die Suche nach oben (Standard +∞) → Zahl | null
//   lavaColorAt(level, x, z)        'rot' | 'blau' der Lava dort (Form-Feld lavaColor, sonst Thema, sonst 'rot')
//   sphereTouches(f, x, y, z, r)    berührt die Kugel (Mitte, Radius) den Hüllquader der Figur/Entität f?
//   boxTouches(f, box, pad)         Hüllquader f ∩ { x0, x1, y0, y1, z0, z1 }
//   hurtFigures(level, test, src)   jede aktive Figur mit test(f) → f.hurt(src) (Funkelstern/Riesentrank: unverwundbar)
//   killFigures(level, test, cause) jede aktive Figur mit test(f) → f.die(cause)
//   rotXZ(lx, lz, yaw), flatColor(g, hex), shadeGeo(g, lo, hi), pulse(t, k), shove(level, obj, dx, dy, dz, ignore)
//   fireMaterial(level), fireBallGeo()   gemeinsames Feuer-Material (unbeleuchtet, glühend) und Kugel-Geometrie
//   Klänge: die Bausteine spielen vorhandene Effekte direkt (level.sfx; Liste in der Präzisierung Welt 7)
//   onRespawn(level, fn)            nach jedem Neustart am Checkpoint fn() (Lava zurück, Nebel zurück …)
//   ease(u), clamp(v, a, b)

import * as THREE from 'three';
import { figures } from './w2kit.js';
import { modelOr } from './w5kit.js';
import { rotXZ, flatColor, shadeGeo, pulse, shove } from './w6kit.js';

export { figures, modelOr, rotXZ, flatColor, shadeGeo, pulse, shove };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const TAU = Math.PI * 2;

/** Sammelstelle der Welt-7-Bausteine je Level. */
export function w7(level) {
  return (level.w7 ??= { lavas: [], fogs: [], fountains: [], bars: [], rollers: [], pendulums: [], stompers: [], bridges: [], arrows: [], groups: [], grates: [] });
}

/** Oberfläche der höchsten Lava an (x, z) unterhalb von yMax (Formen mit kill 'lava' bzw. lava-Flag) oder null. */
export function lavaTopAt(level, x, z, yMax = Infinity) {
  let top = null;
  const hits = level.world.overlapAABB({ x, y: 0, z }, { x: 0.02, y: 4000, z: 0.02 });
  for (const s of hits) {
    if (!(s.kill === 'lava' || (s.kill && s.lava))) continue;
    // Lava-Formen enden 0,12 m unter der sichtbaren Oberfläche (Baustein lava, lavaspiegel: surface)
    const y = s.surface ?? s.top + 0.12;
    if (y > yMax + 0.5) continue;
    if (top === null || y > top) top = y;
  }
  return top;
}

/** Farbe der Lava an (x, z): 'blau' | 'rot'. */
export function lavaColorAt(level, x, z) {
  for (const s of level.world.overlapAABB({ x, y: 0, z }, { x: 0.02, y: 4000, z: 0.02 })) {
    if (s.kill === 'lava' && s.lavaColor) return s.lavaColor === 'blau' ? 'blau' : 'rot';
  }
  return level.view?.theme?.lavaColor === 'blau' ? 'blau' : 'rot';
}

/** Berührt die Kugel (x, y, z, r) den Hüllquader von f (pos = Fußpunkt, half)? */
export function sphereTouches(f, x, y, z, r) {
  const h = f.half, p = f.pos;
  const dx = Math.max(0, Math.abs(x - p.x) - h.x), dy = Math.max(0, Math.abs(y - (p.y + h.y)) - h.y), dz = Math.max(0, Math.abs(z - p.z) - h.z);
  return dx * dx + dy * dy + dz * dz < r * r;
}

/** Hüllquader von f ∩ Quader b ({ x0, x1, y0, y1, z0, z1 }), pad m Zugabe. */
export function boxTouches(f, b, pad = 0) {
  const h = f.half, p = f.pos;
  return p.x + h.x > b.x0 - pad && p.x - h.x < b.x1 + pad && p.z + h.z > b.z0 - pad && p.z - h.z < b.z1 + pad
    && p.y + h.y * 2 > b.y0 - pad && p.y < b.y1 + pad;
}

const active = (f) => !!f && !f.dead && !f.removedFigure && f.mode !== 'script';

/** Jede aktive Figur, für die test(f) gilt, verletzen (source: { pos } für den Rückstoß). → Zahl der Treffer. */
export function hurtFigures(level, test, source) {
  let n = 0;
  for (const f of figures(level)) {
    if (!active(f) || f.invulnerable || !test(f)) continue;
    const src = typeof source === 'function' ? source(f) : source;
    if (f.hurt(src)) n++;
  }
  return n;
}

/** Jede aktive Figur, für die test(f) gilt, sterben lassen (cause). Funkelstern schützt nicht (Lava/Gift/Quetschen). */
export function killFigures(level, test, cause = 'hit') {
  let n = 0;
  for (const f of figures(level)) {
    if (!active(f) || !test(f)) continue;
    f.die(cause);
    n++;
  }
  return n;
}

/** Nach jedem Neustart am Checkpoint fn() (verkettet über runtime.respawn, wie in den Archetypen). */
export function onRespawn(level, fn) {
  const rt = level.runtime;
  if (!rt?.respawn) return;
  const prev = rt.respawn.bind(rt);
  rt.respawn = (...a) => { const r = prev(...a); fn(); return r; };
}

// ------------------------------------------------------------------ Feuer (Feuerstab, Fontäne, Lavablase-Ersatz)

const FIRE = new WeakMap();
/** Gemeinsames Feuer-Material je Ansicht: unbeleuchtet, Vertexfarben (heißer Kern innen über die Normale). */
export function fireMaterial(level) {
  const v = level.view;
  if (!v) return null;
  let m = FIRE.get(v);
  if (!m) { m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); FIRE.set(v, m); }
  return m;
}

const BALL = {};
/**
 * Feuerkugel (Radius 1, Kern gelb-weiß, Rand orange-rot nach der Blickrichtung +Z/+Y; color 'blau': weiß-cyan-blau):
 * geteilt – nicht freigeben.
 */
export function fireBallGeo(color = 'rot') {
  if (BALL[color]) return BALL[color];
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const blue = color === 'blau';
  const hot = new THREE.Color(blue ? 0xf0ffff : 0xfff2b0), mid = new THREE.Color(blue ? 0x5ac8ff : 0xffa020), rim = new THREE.Color(blue ? 0x1a4ad8 : 0xff3a10);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    // zur Kamera (+Z, oben) heller: wirkt wie ein glühender Kern
    const k = THREE.MathUtils.clamp(0.5 + z * 0.4 + y * 0.25, 0, 1);
    if (k > 0.55) c.copy(mid).lerp(hot, (k - 0.55) / 0.45); else c.copy(rim).lerp(mid, k / 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  BALL[color] = g;
  return g;
}

// ------------------------------------------------------------------ Zeitpläne

/**
 * Takt-Zeitplan: Phasen [{ name, t }] (Dauer s) zyklisch; at(time) → { name, i, u (0..1 in der Phase), k (s in der
 * Phase), cycle }. Deterministisch auf der Level-Uhr (phase s Versatz).
 */
export function cycle(phases, phase = 0) {
  const total = phases.reduce((a, p) => a + Math.max(0, p.t), 0) || 1;
  return {
    total,
    at(time) {
      const t = time + phase;
      const c = Math.floor(t / total);
      let u = t - c * total;
      for (let i = 0; i < phases.length; i++) {
        const d = Math.max(0, phases[i].t);
        if (u < d || i === phases.length - 1) return { name: phases[i].name, i, u: d > 0 ? Math.min(1, u / d) : 1, k: u, cycle: c };
        u -= d;
      }
      return { name: phases[0].name, i: 0, u: 0, k: 0, cycle: c };
    },
  };
}

/** Glühendes, weiches Leuchten (Canvas-Textur, geteilt) für Sprites/Ebenen. */
let GLOW_TEX = null;
export function glowTexture() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  GLOW_TEX = new THREE.CanvasTexture(c);
  GLOW_TEX.colorSpace = THREE.SRGBColorSpace;
  return GLOW_TEX;
}

// ------------------------------------------------------------------ Lava-Material (Oberflächen, Fontänen, Fälle)

export const LAVA_PAL = {
  rot: { deep: 0x7a1204, mid: 0xff5410, hi: 0xffc838, white: 0xfff2b8, crust: 0x3a0c06, glow: 0xff6a1a },
  blau: { deep: 0x0a1660, mid: 0x2a8cff, hi: 0x9aeaff, white: 0xf0ffff, crust: 0x0c1030, glow: 0x3ab4ff },
};
const LAVA_MATS = new WeakMap();

/**
 * Glühendes Lava-Material (unbeleuchtet, Muster im Shader in Weltkoordinaten – keine Vertex-Arbeit je Bild): wandernde
 * heiße Adern, dunkle Krustenflecken. vertical: Muster läuft entlang +Y (Fontänensäule, Lavafall; speed m/s). Je Ansicht,
 * Farbe und Art einmal (geteilt); die Zeit läuft über view.onFrame. Ohne Ansicht null.
 */
export function lavaMaterial(level, color = 'rot', o = {}) {
  const v = level.view;
  if (!v) return null;
  let cache = LAVA_MATS.get(v);
  if (!cache) {
    cache = { mats: new Map(), time: { value: 0 } };
    LAVA_MATS.set(v, cache);
    v.onFrame((dt) => { cache.time.value += Math.min(0.1, dt || 0); });
  }
  const pal = LAVA_PAL[color === 'blau' ? 'blau' : 'rot'];
  const key = `${color}:${o.vertical ? 'v' : 'h'}:${o.speed ?? 0}:${o.bright ?? 1}:${o.side ?? 0}`;
  let m = cache.mats.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: o.side ?? THREE.FrontSide });
  const U = {
    uTime: cache.time, uDeep: { value: new THREE.Color(pal.deep) }, uMid: { value: new THREE.Color(pal.mid) },
    uHi: { value: new THREE.Color(pal.hi) }, uWhite: { value: new THREE.Color(pal.white) }, uSpeed: { value: o.speed ?? 3 },
    uBright: { value: o.bright ?? 1 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vW7p;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vW7p = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    const pat = o.vertical
      ? 'vec2 q = vec2(vW7p.x * 0.9 + vW7p.z * 0.9, vW7p.y * 0.5 - uTime * uSpeed * 0.5);'
      : 'vec2 q = vW7p.xz * 0.28 + vec2(uTime * 0.05, uTime * 0.035);';
    sh.fragmentShader = 'uniform float uTime;\nuniform vec3 uDeep;\nuniform vec3 uMid;\nuniform vec3 uHi;\nuniform vec3 uWhite;\nuniform float uSpeed;\nuniform float uBright;\nvarying vec3 vW7p;\n'
      + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      ${pat}
      float n1 = sin(q.x * 2.3 + sin(q.y * 1.9 + uTime * 0.6) * 1.6) * 0.5 + sin(q.y * 2.6 + sin(q.x * 1.5 - uTime * 0.5) * 1.4) * 0.5;
      float n2 = sin(q.x * 5.3 + sin(q.y * 3.1 + uTime * 0.4) * 1.7) * sin(q.y * 4.7 + sin(q.x * 2.9 - uTime * 0.5) * 1.5) * 0.5 + 0.5;
      vec3 c7 = mix(uDeep, uMid, smoothstep(-0.8, 0.3, n1));
      c7 = mix(c7, uHi, smoothstep(0.35, 0.95, n1) * 0.9);
      c7 = mix(c7, uWhite, smoothstep(0.86, 1.0, n1) * 0.55);
      c7 = mix(c7, uDeep * 0.55, smoothstep(0.8, 1.0, n2) * smoothstep(0.2, -0.4, n1) * 0.7);
      diffuseColor.rgb = c7 * uBright;`);
  };
  m.customProgramCacheKey = () => `w7lava:${o.vertical ? 'v' : 'h'}`;
  m.userData.uniforms = U;
  cache.mats.set(key, m);
  return m;
}
