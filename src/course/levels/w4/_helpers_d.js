// Hilfen für das Welt-4-Finale 4-Burg „Glutburg des Felsenkönigs“ und das Prüfungs-Haus 4-Haus „Haus Sausewind“
// (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Gemeinsame Dateien werden nicht
// verändert; alles Level-Lokale hängt sich über den offiziellen Level-Haken `LEVEL.setup` (Präzisierung „Level-Haken“)
// und über `level.onStep` / `view.onFrame` an.
//
//   1) Grundlagen     Geometrie-Kleinteile (Weltkoordinaten, Vertexfarben), Leuchtpunkte (Points), Leinwand-Texturen
//   2) Lava-Burg      lavaSee (Shader-Lava + Absturzform), lavaFaelle (alle Lavafälle in einem Mesh), glutSaum
//                     (glühender Rand an den Inseln), burgMauer (Basaltziegel mit Zinnen und Glutrissen), turm,
//                     fackeln (Flammen als Instanzen, Schein als Punkte), banner (Brummbär-Wappen, wehen im Shader),
//                     ketten, funkenFlug (aufsteigende Glut), thronSaal (Thron, Säulen, Rückwand)
//   3) Mechanik       fallBruecke (Brücke hängt an Ketten, Druckfelder lassen sie fallen), brockenQuelle (Lavaschlot
//                     liefert Lavabrocken nach), stimmung (Stimmung je Bereich), baronSzene (Baron Brummbär nach dem Sieg)
//   4) Prüfungs-Haus  hausRaum (lange Räume: Tapete, Täfelung, Böden, Bilder, Uhren, Möbel), raumUhr (große Uhr zeigt
//                     die Raumzeit), schaukel (Pendel-Plattform), raumHaken (Ereignisse je Raum: Start, Neustart)
//   5) Budget         cullStatic, instanceEnemies, farHide (aus den Welt-2/3-Hilfen)

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd, themeOf } from '../../blocks/kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { levelSetup } from '../w2/_helpers_c.js';
import { cullStatic, farHide } from '../w2/_helpers_a.js';
import { instanceEnemies } from '../w3/_helpers_a.js';
import { heroShadowDiet } from '../w3/_helpers_e.js';
import { glowTexture } from '../../blocks/w4kit.js';

export { levelSetup, cullStatic, farHide, instanceEnemies, heroShadowDiet };

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const L = (c) => lin(hex(c));
const fillc = (c) => (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
export { TAU, clamp, ease };

// ====================================================================== 1) Grundlagen

/** Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h. */
export function isl(x0, x1, zA, zB, top, h = 6, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], top: 'stone', under: 0, ...o };
}
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });

/** Quader (Mitte unten x, y, z) einfarbig mit leichter Licht-Schattierung (ohne Rundung, 12 Dreiecke). */
export function blk(w, h, d, x, y, z, color, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1).toNonIndexed();
  const c = L(color), top = o.top !== undefined ? L(o.top) : [c[0] * 1.12, c[1] * 1.12, c[2] * 1.12], bot = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7];
  colorize(g, (p, n, out) => {
    if (n.y > 0.5) { out[0] = top[0]; out[1] = top[1]; out[2] = top[2]; }
    else if (n.y < -0.5) { out[0] = bot[0]; out[1] = bot[1]; out[2] = bot[2]; }
    else { const k = 1 - Math.abs(n.x) * 0.08; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; }
  });
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(0, h / 2, 0);
  if (o.yaw) g.rotateY(o.yaw);
  g.translate(x, y, z);
  return g;
}

/** Zylinder (Mitte unten). */
export function cyl(rTop, rBot, h, x, y, z, color, seg = 10, o = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, o.hs ?? 1, !!o.open).toNonIndexed();
  const c = L(color), top = o.top !== undefined ? L(o.top) : [c[0] * 1.12, c[1] * 1.12, c[2] * 1.12];
  colorize(g, (p, n, out) => { if (n.y > 0.5) { out[0] = top[0]; out[1] = top[1]; out[2] = top[2]; } else { const k = 0.82 + 0.18 * smooth(-1, 1, n.x * 0.5 + n.z * 0.7); out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; } });
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(0, o.center ? 0 : h / 2, 0);
  if (o.yaw) g.rotateY(o.yaw);
  g.translate(x, y, z);
  return g;
}

export function sph(r, x, y, z, color, o = {}) {
  const g = new THREE.SphereGeometry(r, o.ws ?? 10, o.hs ?? 7).toNonIndexed();
  const c = L(color), hi = o.hi !== undefined ? L(o.hi) : [Math.min(1, c[0] * 1.3), Math.min(1, c[1] * 1.3), Math.min(1, c[2] * 1.3)];
  colorize(g, (p, n, out) => mixc(c, hi, smooth(-0.2, 1, n.y), out));
  if (o.sy) g.scale(1, o.sy, 1);
  g.translate(x, y, z);
  return g;
}

export function cone(r, h, x, y, z, color, seg = 10, o = {}) {
  const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed();
  const c = L(color), dk = [c[0] * 0.72, c[1] * 0.72, c[2] * 0.72];
  colorize(g, (p, n, out) => mixc(dk, c, smooth(-0.6, 0.9, n.x * 0.4 + n.z * 0.6 + n.y * 0.4), out));
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(x, y + (o.center ? 0 : h / 2), z);
  return g;
}

/** Rechteck-Fläche (zwei Dreiecke) mit Farbe je Ecke oder einfarbig; face: '+z' | '-z' | '+x' | '-x' | 'y'. */
export function quadG(x, y, z, w, h, face, color) {
  let c;
  if (face === '+z') c = [[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]];
  else if (face === '-z') c = [[x + w / 2, y, z], [x - w / 2, y, z], [x - w / 2, y + h, z], [x + w / 2, y + h, z]];
  else if (face === '+x') c = [[x, y, z + w / 2], [x, y, z - w / 2], [x, y + h, z - w / 2], [x, y + h, z + w / 2]];
  else if (face === '-x') c = [[x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2]];
  else c = [[x - w / 2, y, z + h / 2], [x + w / 2, y, z + h / 2], [x + w / 2, y, z - h / 2], [x - w / 2, y, z - h / 2]];
  const pos = [];
  for (const k of [0, 1, 2, 0, 2, 3]) pos.push(...c[k]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const col = Array.isArray(color) && Array.isArray(color[0]) ? color : null;
  const one = col ? null : L(color);
  const arr = new Float32Array(18);
  [0, 1, 2, 0, 2, 3].forEach((k, i) => { const cc = col ? col[k] : one; arr[i * 3] = cc[0]; arr[i * 3 + 1] = cc[1]; arr[i * 3 + 2] = cc[2]; });
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Statische Teile nach 32-m-Abschnitten getrennt verschmelzen (jedes Stück landet im eigenen Abschnitt). */
export function bakeParts(level, parts, opts) {
  if (!parts.length) return;
  const by = new Map();
  for (const g of parts) {
    g.computeBoundingBox();
    const s = Math.floor(-((g.boundingBox.min.z + g.boundingBox.max.z) / 2) / 32);
    if (!by.has(s)) by.set(s, []);
    by.get(s).push(g);
  }
  for (const list of by.values()) addStatic(level, merge(list), opts);
}

/** Leuchtpunkte (additiv, ein Zeichenaufruf): pts [[x, y, z], …], Farbe, Größe (m). Liefert die Points. */
export function glowPoints(level, pts, color, size, o = {}) {
  if (!level.view || !pts.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  const m = new THREE.PointsMaterial({ map: glowTexture(), color, size, sizeAttenuation: true, transparent: true, opacity: o.opacity ?? 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const P = new THREE.Points(g, m);
  P.frustumCulled = o.cull ?? true;
  P.renderOrder = 5;
  P.name = o.name ?? 'leuchtpunkte';
  addObject(level, P, o.update);
  P.traverse((x) => { x.userData.owned = true; });
  return P;
}

/**
 * Modellteile mehrerer Gegner als Instanzen zeichnen (Budget): je Bild werden die sichtbaren Meshes aller Entitäten der
 * Arten kinds nach (Geometrie, Material) gruppiert; Gruppen mit mindestens zwei Teilen zeichnet je eine InstancedMesh
 * (Matrizen aus dem animierten Modell), die Einzelteile sind für dieses Bild unsichtbar und werden nach dem Zeichnen
 * (scene.onAfterRender) wieder sichtbar. Teile mit eigenem Material je Exemplar (Glut, Funken, Schein) zeichnen wie
 * bisher. Anders als instanceEnemies auch für Gegner mit gemischten Materialien und für später erzeugte Gegner
 * (Lavaschlot, Endgegner). o.near: nur Gegner bis zu so vielen Metern (z) von der Figur. Nur Darstellung.
 */
export function teileInstanzen(level, kinds, o = {}) {
  if (!level.view) return null;
  const want = new Set(kinds);
  const scene = level.view.three;
  const hidden = [];
  const prevAfter = scene.onAfterRender;
  scene.onAfterRender = function after(...a) {
    prevAfter?.apply(this, a);
    for (const m of hidden) m.visible = true;
    hidden.length = 0;
  };
  const groups = new Map();
  const cache = new WeakMap();
  const vis = (m, root) => { for (let q = m; q; q = q.parent) { if (!q.visible) return false; if (q === root) return true; } return true; };
  const make = (m, cap) => {
    const im = new THREE.InstancedMesh(m.geometry, m.material, cap);
    im.castShadow = m.castShadow; im.receiveShadow = m.receiveShadow;
    im.frustumCulled = false;
    im.count = 0;
    im.visible = false;
    im.name = `instanzen:teile:${o.name ?? kinds[0]}`;
    level.view.add(im);
    im.userData.owned = false;   // Geometrie/Material gehören dem Modell-Cache
    return im;
  };
  const st = { drawn: 0, groups: 0 };
  const cand = new Map();
  level.view.onFrame(() => {
    cand.clear();
    const pl = level.player;
    for (const e of level.entities) {
      if (!want.has(e.kind) || e.removed || !e.model?.root) continue;
      if (o.near && pl && Math.abs(e.pos.z - pl.pos.z) > o.near) continue;   // weit weg (anderer Raum): nicht instanzieren
      const root = e.model.root;
      if (!root.visible || !root.parent) continue;
      let list = cache.get(e);
      if (!list || list.root !== root) {
        list = [];
        root.traverse((m) => { if (m.isMesh && !m.isInstancedMesh && !m.isSkinnedMesh && !Array.isArray(m.material)) list.push(m); });
        list.root = root;
        cache.set(e, list);
      }
      let upd = false;
      for (const m of list) {
        if (!vis(m, root)) continue;
        if (!upd) { root.updateMatrixWorld(true); upd = true; }
        const key = `${m.geometry.uuid}|${m.material.uuid}`;
        let c = cand.get(key);
        if (!c) { c = []; cand.set(key, c); }
        c.push(m);
      }
    }
    for (const G of groups.values()) G.fill = 0;
    st.drawn = 0;
    for (const [key, list] of cand) {
      if (list.length < 2) continue;
      let G = groups.get(key);
      if (!G || G.cap < list.length) {
        const cap = Math.max(8, list.length * 2);
        if (G) { G.im.parent?.remove(G.im); }
        G = { im: make(list[0], cap), cap, fill: 0 };
        groups.set(key, G);
      }
      for (const m of list) { G.im.setMatrixAt(G.fill++, m.matrixWorld); m.visible = false; hidden.push(m); }
      st.drawn += list.length;
    }
    for (const G of groups.values()) { G.im.count = G.fill; G.im.visible = G.fill > 0; G.im.instanceMatrix.needsUpdate = true; }
    st.groups = groups.size;
  });
  return st;
}

/** Leinwand-Textur (w × h px) mit Zeichenfunktion. */
export function canvasTex(w, h, paint, o = {}) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Wappen des Baron Brummbär (Bärenkopf mit Zylinder und Monokel) auf eine Leinwand malen. */
export function paintCrest(g, cx, cy, s, o = {}) {
  const gold = o.gold ?? '#ffc21a';
  g.save();
  g.translate(cx, cy);
  // Schild
  g.fillStyle = o.shield ?? '#1a1418';
  g.beginPath(); g.moveTo(-s, -s * 0.95); g.lineTo(s, -s * 0.95); g.lineTo(s, s * 0.2); g.quadraticCurveTo(s * 0.9, s * 0.95, 0, s * 1.25); g.quadraticCurveTo(-s * 0.9, s * 0.95, -s, s * 0.2); g.closePath(); g.fill();
  g.lineWidth = s * 0.1; g.strokeStyle = gold; g.stroke();
  // Bärenkopf
  g.fillStyle = gold;
  g.beginPath(); g.arc(-s * 0.42, -s * 0.12, s * 0.2, 0, TAU); g.arc(s * 0.42, -s * 0.12, s * 0.2, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0, s * 0.22, s * 0.52, s * 0.46, 0, 0, TAU); g.fill();
  g.fillStyle = o.shield ?? '#1a1418';
  g.beginPath(); g.ellipse(0, s * 0.42, s * 0.2, s * 0.13, 0, 0, TAU); g.fill();
  g.beginPath(); g.arc(-s * 0.2, s * 0.12, s * 0.07, 0, TAU); g.fill();
  g.lineWidth = s * 0.05; g.strokeStyle = o.shield ?? '#1a1418';
  g.beginPath(); g.arc(s * 0.2, s * 0.12, s * 0.12, 0, TAU); g.stroke();      // Monokel
  g.beginPath(); g.moveTo(s * 0.3, s * 0.2); g.quadraticCurveTo(s * 0.45, s * 0.5, s * 0.35, s * 0.7); g.stroke();
  // Zylinder
  g.fillStyle = gold;
  g.fillRect(-s * 0.36, -s * 0.78, s * 0.72, s * 0.5);
  g.fillRect(-s * 0.55, -s * 0.32, s * 1.1, s * 0.1);
  g.fillStyle = o.band ?? '#c8142e';
  g.fillRect(-s * 0.36, -s * 0.42, s * 0.72, s * 0.1);
  g.restore();
}

// ====================================================================== 2) Lava-Burg

const LAVA_COL = { deep: 0x3a0804, crust: 0x6a1406, hot: 0xff4a0c, core: 0xffd048, white: 0xfff4b0 };

/** Shader der Lava-Oberfläche (unbeleuchtet, mit Nebel): Kruste treibt, helle Adern pulsieren. */
function lavaMaterial(o = {}) {
  const u = {
    uTime: { value: 0 }, uFlow: { value: new THREE.Vector2(o.flow?.[0] ?? 0.12, o.flow?.[1] ?? 0.05) },
    uDeep: { value: new THREE.Color(LAVA_COL.deep) }, uCrust: { value: new THREE.Color(LAVA_COL.crust) },
    uHot: { value: new THREE.Color(LAVA_COL.hot) }, uCore: { value: new THREE.Color(LAVA_COL.core) },
  };
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uTime;\nvarying vec3 vLW;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 lw0 = modelMatrix * vec4(transformed, 1.0);
      transformed.y += (sin(lw0.x * 0.8 + uTime * 1.1) + cos(lw0.z * 0.6 - uTime * 0.9)) * 0.05;
      vLW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uTime;\nuniform vec2 uFlow;\nuniform vec3 uDeep;\nuniform vec3 uCrust;\nuniform vec3 uHot;\nuniform vec3 uCore;\nvarying vec3 vLW;\n'
      + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 lp = vLW.xz * 0.19 - uFlow * uTime;
      float lt = uTime * 0.22;
      vec2 lq = vec2(sin(lp.y * 1.7 + lt), cos(lp.x * 1.3 - lt * 0.8));
      float ln = sin((lp.x + lq.x * 1.3) * 2.4 + lt) * cos((lp.y + lq.y * 1.3) * 2.1 - lt * 0.7);
      float ln2 = sin(lp.x * 5.1 + lp.y * 3.7 + uTime * 0.9 + ln * 2.3);
      float lcrust = smoothstep(0.18, 0.72, ln * 0.5 + 0.5);
      float lvein = smoothstep(0.78, 1.0, 1.0 - abs(ln2));
      vec3 lcol = mix(uHot, mix(uCrust, uDeep, smoothstep(0.6, 1.0, lcrust)), lcrust * 0.9);
      lcol = mix(lcol, uCore, lvein * (1.0 - lcrust * 0.7));
      lcol += uCore * 0.12 * (0.5 + 0.5 * sin(uTime * 1.7 + lp.x * 2.0 + lp.y * 1.5)) * (1.0 - lcrust);
      diffuseColor.rgb = lcol;`);
  };
  mat.customProgramCacheKey = () => 'w4d:lava';
  mat.userData.u = u;
  return mat;
}

/**
 * Lavasee: Shader-Fläche (ein Zeichenaufruf) über dem Rechteck [x0, x1] × [zA, zB] auf Höhe y und eine nicht feste
 * Lava-Form knapp darunter (kill 'lava': Figur stirbt, Gegner verglühen, Lavabrocken zerschmelzen).
 */
export function lavaSee(level, o) {
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1), z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB);
  const y = o.y ?? 0, cell = o.cell ?? 3;
  level.world.add({ type: 'box', min: [x0, y - 6, z0], max: [x1, y - 0.12, z1], kill: 'lava', solid: false, camIgnore: true, tag: 'lavasee' });
  if (!level.view) return null;
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d, Math.max(2, Math.ceil(w / cell)), Math.max(2, Math.ceil(d / cell)));
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y - 0.04, (z0 + z1) / 2);
  const mat = lavaMaterial(o);
  const m = new THREE.Mesh(g, mat);
  m.name = 'lavasee';
  m.renderOrder = -1;
  const h = {};
  addObject(level, m, (dt) => { mat.userData.u.uTime.value += visDt(level, h, dt); });
  return m;
}

/**
 * Lavafälle (nur Kulisse, alle in einem Mesh): list [{ pos: [x, y, z] (Mitte der Unterkante), width, height,
 * yaw (Vorderseite bei 0 nach +Z) }]. Schlieren laufen nach unten, oben eine glühende Abbruchkante; unten Schein.
 */
export function lavaFaelle(level, list, o = {}) {
  if (!level.view || !list.length) return null;
  const pos = [], uv = [];
  const glows = [];
  for (const f of list) {
    const [px, py, pz] = f.pos;
    const W = f.width ?? 3, H = f.height ?? 6, yaw = f.yaw ?? 0;
    const nx = 6, ny = Math.max(4, Math.round(H / 1.2));
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (u, v) => {
      const lx = (u - 0.5) * W, ly = v * H;
      const bulge = Math.sin(v * Math.PI) * 0.25 + (v > 0.9 ? (v - 0.9) * 3 : 0) - Math.abs(u - 0.5) * 0.2;
      // lokal: x quer, z nach vorn (+Z bei yaw 0)
      return [px + lx * c + bulge * s, py + ly, pz - lx * s + bulge * c];
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
      const q = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...P(q[k][0], q[k][1])); uv.push(q[k][0] * W, q[k][1] * H); }
    }
    glows.push([px + s * 0.6, py + 0.5, pz + c * 0.6]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const u = { uTime: { value: 0 }, uHot: { value: new THREE.Color(LAVA_COL.hot) }, uCore: { value: new THREE.Color(LAVA_COL.core) }, uDeep: { value: new THREE.Color(0x8a1a06) } };
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec2 vFall;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFall = uv;');
    sh.fragmentShader = 'uniform float uTime;\nuniform vec3 uHot;\nuniform vec3 uCore;\nuniform vec3 uDeep;\nvarying vec2 vFall;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float fy = vFall.y + uTime * 3.2;
      float fa = sin(vFall.x * 4.3 + sin(fy * 0.45) * 0.9) * 0.5 + 0.5;
      float fb = sin(vFall.x * 9.1 - 1.3 + fy * 0.2) * 0.5 + 0.5;
      float fs = smoothstep(0.55, 1.0, fa * 0.65 + fb * 0.35 + sin(fy * 1.9 + vFall.x * 2.0) * 0.15);
      vec3 fc = mix(uDeep, uHot, 0.45 + 0.45 * fa);
      fc = mix(fc, uCore, fs * 0.85);
      diffuseColor.rgb = fc;`);
  };
  mat.customProgramCacheKey = () => 'w4d:lavafall';
  const m = new THREE.Mesh(g, mat);
  m.name = 'lavafaelle';
  m.renderOrder = 1;
  const h = {};
  addObject(level, m, (dt) => { u.uTime.value += visDt(level, h, dt); });
  glowPoints(level, glows, 0xff7a20, o.glow ?? 4.2, { opacity: 0.7, name: 'lavafall-schein' });
  return m;
}

/** Glühender Saum an Inselrändern über der Lava (Glow-Material): rects [[x0, x1, zA, zB], …], Lava-Höhe y. */
export function glutSaum(level, rects, y = 0, o = {}) {
  const parts = [];
  const hot = L(0xffa030), red = L(0xb02008);
  const h = o.h ?? 0.55;
  for (const [ax, bx, za, zb] of rects) {
    const x0 = Math.min(ax, bx) - 0.04, x1 = Math.max(ax, bx) + 0.04, z0 = Math.min(za, zb) - 0.04, z1 = Math.max(za, zb) + 0.04;
    const col = [hot, hot, red, red];
    const sides = [[(x0 + x1) / 2, z1, x1 - x0, '+z'], [(x0 + x1) / 2, z0, x1 - x0, '-z'], [x1, (z0 + z1) / 2, z1 - z0, '+x'], [x0, (z0 + z1) / 2, z1 - z0, '-x']];
    for (const [cx, cz, w, f] of sides) {
      const g = quadG(cx, y - 0.1, cz, w, h, f, [col[0], col[1], col[2], col[3]]);
      parts.push(g);
    }
  }
  bakeParts(level, parts, { material: 'glow', castShadow: false });
}

/**
 * Burgboden: Steinplatten im Verband (Reihen 0,9 m, Plattenbreite 0,8–1,6 m, je Platte eigene Tönung) mit dunklen
 * Fugen, einem Rahmen aus größeren Randsteinen und einzelnen glühenden Rissen – über die Oberseite von Inseln gelegt.
 * list [{ x0, x1, zA, zB, y (Oberseite), yA, yB (Rampe: Höhe bei zA bzw. zB statt y), cracks: 2, frame: true }].
 */
export function burgBoden(level, list, o = {}) {
  const parts = [], glow = [];
  const rnd = new Rnd(o.seed ?? 1234);
  const pal = [L(0x8e7c7c), L(0x7e6c70), L(0x9a8884), L(0x84726e), L(0x746266)];
  const mortar = L(0x2e2226), rim = L(0x5a4a4e), rimHi = L(0x6e5c5e);
  for (const f of list) {
    const x0 = Math.min(f.x0, f.x1), x1 = Math.max(f.x0, f.x1), z0 = Math.min(f.zA, f.zB), z1 = Math.max(f.zA, f.zB);
    const yAt = (z) => (f.yA !== undefined ? f.yA + (f.yB - f.yA) * ((z - f.zA) / (f.zB - f.zA)) : f.y);
    const pos = [], col = [], nor = [];
    const quad = (ax, bx, az, bz, c, dy) => {
      const ya = yAt(az) + dy, yb = yAt(bz) + dy;
      const q = [[ax, ya, az], [ax, yb, bz], [bx, yb, bz], [bx, ya, az]];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k]); col.push(c[0], c[1], c[2]); nor.push(0, 1, 0); }
    };
    quad(x0, x1, z0, z1, mortar, 0.006);
    const fr = f.frame === false ? 0 : 0.55;
    // Randsteine
    if (fr) {
      for (const [ax, bx, az, bz] of [[x0, x1, z1 - fr, z1], [x0, x1, z0, z0 + fr], [x0, x0 + fr, z0 + fr, z1 - fr], [x1 - fr, x1, z0 + fr, z1 - fr]]) {
        const alongX = bx - ax > bz - az;
        const len = alongX ? bx - ax : bz - az;
        const n = Math.max(1, Math.round(len / 1.3));
        for (let i = 0; i < n; i++) {
          const c = (i % 2) ? rim : rimHi;
          if (alongX) quad(ax + (i / n) * len + 0.03, ax + ((i + 1) / n) * len - 0.03, az + 0.03, bz - 0.03, c, 0.014);
          else quad(ax + 0.03, bx - 0.03, az + (i / n) * len + 0.03, az + ((i + 1) / n) * len - 0.03, c, 0.014);
        }
      }
    }
    const ix0 = x0 + fr, ix1 = x1 - fr, iz0 = z0 + fr, iz1 = z1 - fr;
    for (let z = iz0, r = 0; z < iz1 - 1e-3; z += 0.9, r++) {
      const zb = Math.min(iz1, z + 0.9);
      let x = ix0 - (r % 2) * 0.55;
      while (x < ix1 - 1e-3) {
        const w = 0.8 + rnd.frac() * 0.8;
        const ax = Math.max(ix0, x), bx = Math.min(ix1, x + w);
        if (bx - ax > 0.12) {
          const c = pal[Math.floor(rnd.frac() * pal.length)];
          const k = 0.92 + rnd.frac() * 0.12;
          quad(ax + 0.035, bx - 0.035, z + 0.035, zb - 0.035, [c[0] * k, c[1] * k, c[2] * k], 0.014);
        }
        x += w;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    parts.push(g);
    // glühende Risse
    const nc = f.cracks ?? Math.min(3, Math.floor(((x1 - x0) * (z1 - z0)) / 60));
    for (let i = 0; i < nc; i++) {
      let x = rnd.real(x0 + 1, x1 - 1), z = rnd.real(z0 + 1, z1 - 1);
      const pp = [], cc = [];
      const hot = L(0xffb040), red = L(0xff5010);
      for (let s = 0; s < 4; s++) {
        const x2 = x + rnd.real(-0.7, 0.7), z2 = z + rnd.real(-0.9, -0.4);
        const w = 0.06 * (1 - s / 4) + 0.025;
        const y = yAt(z) + 0.02, y2 = yAt(z2) + 0.02;
        const q = [[x - w, y, z], [x2 - w * 0.6, y2, z2], [x2 + w * 0.6, y2, z2], [x + w, y, z]];
        for (const k of [0, 1, 2, 0, 2, 3]) { pp.push(...q[k]); const c2 = k === 1 || k === 2 ? red : hot; cc.push(c2[0], c2[1], c2[2]); }
        x = x2; z = z2;
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      gg.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pp.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
      gg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      glow.push(gg);
    }
  }
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
}

/** Ziegelfarbe (Basalt) einer Fläche: Reihen versetzt, je Ziegel leicht andere Tönung; o.glow: Glutriss-Chance. */
function brickColor(rnd, base) {
  const a = L(base ?? 0x4a3a40), b = L(0x6a565c), c = L(0x3a2c32);
  return () => { const k = rnd.frac(); return k < 0.5 ? mixc(a, b, k * 1.4, [0, 0, 0]) : mixc(a, c, (k - 0.5) * 1.6, [0, 0, 0]); };
}

/** Mauerfläche als Ziegelraster (Reihen 0,5 m, Ziegel 1,1 m, versetzt). Lokales Rechteck in der Ebene: u entlang, v hoch. */
function brickFace(parts, P, Wd, Ht, nrm, rnd, base, glowParts) {
  const rowH = 0.55, brick = 1.15;
  const pick = brickColor(rnd, base);
  const pos = [], col = [];
  for (let r = 0; r * rowH < Ht - 1e-4; r++) {
    const v0 = r * rowH, v1 = Math.min(Ht, v0 + rowH);
    const off = (r % 2) * brick * 0.5;
    for (let u = -off; u < Wd - 1e-4; u += brick) {
      const u0 = Math.max(0, u), u1 = Math.min(Wd, u + brick);
      if (u1 - u0 < 0.05) continue;
      const cc = pick();
      const g = 0.025;   // Fuge: Ziegel minimal kleiner, Mörtel = Hintergrund (Körper dahinter)
      const q = [P(u0 + g, v0 + g), P(u1 - g, v0 + g), P(u1 - g, v1 - g), P(u0 + g, v1 - g)];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k]); col.push(cc[0], cc[1], cc[2]); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => nrm), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  parts.push(g);
  // Glutrisse: Zickzack-Bänder (glühend) an zufälligen Stellen
  if (glowParts) {
    const n = Math.floor(Wd / 7 + rnd.frac());
    const hot = L(0xffa030), dark = L(0xff4a10);
    for (let i = 0; i < n; i++) {
      let u = rnd.real(0.8, Wd - 0.8), v = rnd.real(0.4, Ht * 0.5);
      const segs = 3 + Math.floor(rnd.frac() * 3);
      const pp = [], cc = [];
      for (let k = 0; k < segs; k++) {
        const u2 = u + rnd.real(-0.5, 0.5), v2 = v + rnd.real(0.35, 0.7);
        const w = 0.07 * (1 - k / segs) + 0.03;
        const q = [P(u - w, v, 0.03), P(u + w, v, 0.03), P(u2 + w * 0.7, v2, 0.03), P(u2 - w * 0.7, v2, 0.03)];
        for (const kk of [0, 1, 2, 0, 2, 3]) { pp.push(...q[kk]); const c2 = kk < 2 ? hot : dark; cc.push(c2[0], c2[1], c2[2]); }
        u = u2; v = v2;
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      gg.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pp.length / 3).fill(0).flatMap(() => nrm), 3));
      gg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      glowParts.push(gg);
    }
  }
}

/**
 * Burgmauer aus Basaltziegeln (Vertexfarben, Fugen, Glutrisse) mit Zinnen und Wehrgang-Kante, entlang einer Achse:
 * { from: [x, y, z], to: [x, y, z] (gleiches x oder gleiches z), height: 6, thick: 1.6, face: +1 | −1 (Seite mit
 * Ziegelbild; Standard zur Levelmitte), solid: true, merlons: true, glow: true, slits: true (glühende Schießscharten),
 * base: Ziegelfarbe }. Lange Mauern werden in ≤ 16-m-Stücke geteilt (Abschnitts-Culling).
 */
export function burgMauer(level, list, o = {}) {
  const parts = [], glow = [];
  const rnd = new Rnd(o.seed ?? 4711);
  for (const it of list) {
    const a = it.from, b = it.to;
    const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]);
    const H = it.height ?? 6, T = it.thick ?? 1.6;
    const y0 = a[1];
    const Lall = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[2] - a[2]);
    const n = Math.max(1, Math.ceil(Lall / 16));
    // Sichtseite: zur Mitte (x → 0) bzw. nach +Z (Kamera)
    const face = it.face ?? (alongX ? 1 : (a[0] > 0 ? -1 : 1));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const p0 = [a[0] + (b[0] - a[0]) * t0, a[2] + (b[2] - a[2]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[2] + (b[2] - a[2]) * t1];
      const len = Lall / n;
      const cx = (p0[0] + p1[0]) / 2, cz = (p0[1] + p1[1]) / 2;
      const w = alongX ? len : T, d = alongX ? T : len;
      // Körper (Mörtelfarbe), Sockel, Wehrgang-Abdeckung
      parts.push(blk(w + 0.02, H, d + 0.02, cx, y0, cz, 0x2a2026));
      parts.push(blk(w + (alongX ? 0 : 0.5), 0.6, d + (alongX ? 0.5 : 0), cx, y0, cz, 0x3a2e34));
      parts.push(blk(w + (alongX ? 0.06 : 0.3), 0.22, d + (alongX ? 0.3 : 0.06), cx, y0 + H, cz, 0x6a5a60));
      // Ziegelbild auf der Sichtseite (und auf der Oberseite der Zinnen)
      if (alongX) {
        const z = cz + face * (T / 2 + 0.012), x0 = cx - len / 2;
        const P = (u, v, off = 0) => [face > 0 ? x0 + u : x0 + len - u, y0 + 0.6 + v, z + face * off];
        brickFace(parts, P, len, H - 0.6, [0, 0, face], rnd, it.base, it.glow === false ? null : glow);
      } else {
        const x = cx + face * (T / 2 + 0.012), zTop = cz + len / 2;
        const P = (u, v, off = 0) => [x + face * off, y0 + 0.6 + v, face > 0 ? zTop - u : zTop - len + u];
        brickFace(parts, P, len, H - 0.6, [face, 0, 0], rnd, it.base, it.glow === false ? null : glow);
      }
      // Zinnen
      if (it.merlons !== false) {
        const m = Math.max(1, Math.round(len / 1.5));
        for (let i = 0; i < m; i++) {
          const u = (i + 0.5) / m;
          const mx = alongX ? p0[0] + (p1[0] - p0[0]) * u : cx, mz = alongX ? cz : p0[1] + (p1[1] - p0[1]) * u;
          parts.push(blk(alongX ? len / m * 0.55 : T * 0.9, 0.85, alongX ? T * 0.9 : len / m * 0.55, mx, y0 + H + 0.2, mz, 0x564650, { top: 0x7a6870 }));
        }
      }
      // Schießscharten (glühend)
      if (it.slits !== false && H > 3.5) {
        const m = Math.max(1, Math.floor(len / 5));
        for (let i = 0; i < m; i++) {
          const u = (i + 0.5) / m;
          const sx = alongX ? p0[0] + (p1[0] - p0[0]) * u : cx + face * (T / 2 + 0.03), sz = alongX ? cz + face * (T / 2 + 0.03) : p0[1] + (p1[1] - p0[1]) * u;
          const f = alongX ? (face > 0 ? '+z' : '-z') : (face > 0 ? '+x' : '-x');
          glow.push(quadG(sx, y0 + H * 0.55, sz, 0.28, 0.9, f, [L(0xff6a10), L(0xff6a10), L(0xffd060), L(0xffd060)]));
        }
      }
      if (it.solid !== false) {
        const xs = alongX ? [cx - len / 2, cx + len / 2] : [cx - T / 2, cx + T / 2], zs = alongX ? [cz - T / 2, cz + T / 2] : [cz - len / 2, cz + len / 2];
        level.world.add({ type: 'box', min: [xs[0], y0, zs[0]], max: [xs[1], y0 + H + (it.merlons === false ? 0 : 1.05), zs[1]], camIgnore: it.camIgnore ?? false, tag: 'burgmauer' });
      }
    }
  }
  bakeParts(level, parts, { castShadow: o.shadow ?? false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
}

/**
 * Burgturm (Kulisse): runder Basaltturm mit Zinnenkranz, rotem Spitzdach mit goldener Spitze und glühenden Fenstern.
 * list [{ pos: [x, y, z] (Fußpunkt), r: 2.5, height: 12, roof: true, flag: false }]; solid: Zylinder-Kollision.
 */
export function tuerme(level, list, o = {}) {
  const parts = [], glow = [];
  for (const t of list) {
    const [x, y, z] = t.pos;
    const r = t.r ?? 2.5, H = t.height ?? 12;
    const seg = 14;
    const body = new THREE.CylinderGeometry(r, r * 1.08, H, seg, Math.max(2, Math.round(H / 1.1)), true).toNonIndexed();
    const st = L(0x3e3036), st2 = L(0x5a4a52), dk = L(0x2a2026);
    colorize(body, (p, n, out) => {
      const row = Math.floor((p.y + H / 2) / 1.1);
      const a = Math.atan2(p.z, p.x) / TAU * seg + (row % 2) * 0.5;
      const k = Math.abs(Math.sin(a * 12.9 + row * 7.1)) ;
      mixc(st, st2, k * 0.6, out);
      const sh = 0.75 + 0.25 * smooth(-1, 1, n.x * 0.4 + n.z * 0.8);
      out[0] *= sh; out[1] *= sh; out[2] *= sh;
    });
    body.translate(x, y + H / 2, z);
    parts.push(body);
    // Kragen und Zinnen
    parts.push(cyl(r + 0.45, r + 0.2, 0.6, x, y + H - 0.1, z, 0x564650, seg));
    const m = 10;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * TAU;
      parts.push(blk(0.75, 0.8, 0.55, x + Math.cos(a) * (r + 0.2), y + H + 0.5, z + Math.sin(a) * (r + 0.2), 0x564650, { yaw: -a + Math.PI / 2, top: 0x7a6870 }));
    }
    if (t.roof !== false) {
      parts.push(cone(r + 0.35, r * 2.4, x, y + H + 0.5, z, 0xb0182a, seg));
      parts.push(sph(0.25, x, y + H + 0.5 + r * 2.4 + 0.1, z, 0xffc21a));
    }
    // Fenster (glühend), zur Kamera (+Z) und zur Mitte
    for (const [fy, fa] of [[H * 0.35, Math.PI / 2 + (x > 0 ? 0.6 : -0.6)], [H * 0.68, Math.PI / 2 + (x > 0 ? 0.25 : -0.25)]]) {
      const fx = x + Math.cos(fa) * (r + 0.03), fz = z + Math.sin(fa) * (r + 0.03);
      const g = quadG(0, 0, 0, 0.6, 1.1, '+z', [L(0xff5a10), L(0xff5a10), L(0xffd860), L(0xffd860)]);
      g.rotateY(Math.PI / 2 - fa);
      g.translate(fx, y + fy, fz);
      glow.push(g);
      // Bogen oben
      const arch = new THREE.CircleGeometry(0.3, 8, 0, Math.PI).toNonIndexed();
      colorize(arch, fillc(L(0xffd860)));
      arch.translate(0, 1.1, 0);
      arch.rotateY(Math.PI / 2 - fa);
      arch.translate(fx, y + fy, fz);
      glow.push(arch);
    }
    if (o.solid !== false && t.solid !== false) level.world.add({ type: 'cyl', x, z, r: r * 1.04, y0: y, y1: y + H + 1, tag: 'turm' });
  }
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
}

/**
 * Wandfackeln: list [{ pos: [x, y, z] (Halterung an der Wand), yaw (Blickrichtung von der Wand weg, 0 = +X) }] oder
 * Becken auf Pfosten ({ pos, post: 1.4 }). Halterungen statisch; Flammen: zwei Instanz-Gruppen (außen/innen,
 * flackern), Schein: Punkte. Zusammen 3 Zeichenaufrufe für alle Fackeln.
 */
export function fackeln(level, list, o = {}) {
  const parts = [];
  const iron = 0x3a3640, ironHi = 0x8a8494;
  const flames = [];
  for (const f of list) {
    const [x, y, z] = f.pos;
    if (f.post) {
      const h = f.post;
      parts.push(cyl(0.12, 0.16, h, x, y, z, 0x4a3e44, 8));
      parts.push(cyl(0.38, 0.18, 0.3, x, y + h, z, iron, 10, { top: 0x2a1a14 }));
      flames.push({ x, y: y + h + 0.25, z, s: 1.5 });
      continue;
    }
    const yaw = f.yaw ?? 0, dx = Math.cos(yaw), dz = -Math.sin(yaw);
    parts.push(blk(0.12, 0.5, 0.3, x, y - 0.25, z, iron, { yaw }));
    const arm = cyl(0.04, 0.05, 0.5, 0, 0, 0, ironHi, 6, { rz: Math.PI / 2 - 0.5, center: true });
    arm.rotateY(yaw); arm.translate(x + dx * 0.22, y + 0.1, z + dz * 0.22);
    parts.push(arm);
    parts.push(cyl(0.17, 0.08, 0.22, x + dx * 0.44, y + 0.22, z + dz * 0.44, iron, 8, { top: 0x2a1a14 }));
    flames.push({ x: x + dx * 0.44, y: y + 0.44, z: z + dz * 0.44, s: 1 });
  }
  bakeParts(level, parts, { castShadow: false });
  if (!level.view || !flames.length) return;
  const mk = (r, h, color) => {
    const g = new THREE.ConeGeometry(r, h, 7);
    g.translate(0, h / 2, 0);
    const im = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color }), flames.length);
    im.frustumCulled = false;
    im.castShadow = false;
    return im;
  };
  const outer = mk(0.15, 0.5, 0xff7a18), inner = mk(0.09, 0.32, 0xffe070);
  outer.name = 'fackel-flammen'; inner.name = 'fackel-kern';
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  let t = 0;
  const h = {};
  const seeds = flames.map((f, i) => (f.x * 7.3 + f.z * 3.1 + i) % 6.28);
  const update = (dt) => {
    t += visDt(level, h, dt);
    flames.forEach((f, i) => {
      const k = 1 + Math.sin(t * 13 + seeds[i]) * 0.1 + Math.sin(t * 7.3 + seeds[i] * 2) * 0.08;
      E.set(Math.sin(t * 5 + seeds[i]) * 0.08, t * 2 + seeds[i], Math.cos(t * 4.3 + seeds[i]) * 0.08);
      Q.setFromEuler(E);
      P.set(f.x, f.y, f.z);
      S.set(f.s, f.s * k, f.s);
      outer.setMatrixAt(i, M.compose(P, Q, S));
      S.set(f.s, f.s * (2 - k) * 1.05, f.s);
      inner.setMatrixAt(i, M.compose(P, Q, S));
    });
    outer.instanceMatrix.needsUpdate = true;
    inner.instanceMatrix.needsUpdate = true;
  };
  update(0);
  addObject(level, outer, update);
  addObject(level, inner);
  glowPoints(level, flames.map((f) => [f.x, f.y + 0.25 * f.s, f.z]), 0xff9030, o.glow ?? 2.4, { opacity: 0.75, name: 'fackel-schein' });
}

/** Wappen-Textur (Banner-Atlas, 2 Motive: Brummbär-Wappen rot/gold und Glutkrone schwarz/rot). */
let bannerTex = null;
function bannerTexture() {
  if (bannerTex) return bannerTex;
  bannerTex = canvasTex(256, 256, (g) => {
    // links: karminrotes Tuch mit Goldsaum und Brummbär-Wappen
    const tuch = (x0, base, saum, motiv) => {
      g.fillStyle = base; g.fillRect(x0, 0, 128, 256);
      g.fillStyle = saum; g.fillRect(x0, 0, 10, 256); g.fillRect(x0 + 118, 0, 10, 256); g.fillRect(x0, 0, 128, 12);
      for (let y = 30; y < 256; y += 40) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x0 + 10, y, 108, 3); }
      motiv(x0 + 64);
    };
    tuch(0, '#b0142a', '#ffc21a', (cx) => paintCrest(g, cx, 110, 40));
    tuch(128, '#1a1418', '#c8142e', (cx) => {
      // Glutkrone des Felsenkönigs
      g.fillStyle = '#ff6a10';
      g.beginPath(); g.moveTo(cx - 40, 140); g.lineTo(cx - 40, 90); g.lineTo(cx - 20, 115); g.lineTo(cx, 80); g.lineTo(cx + 20, 115); g.lineTo(cx + 40, 90); g.lineTo(cx + 40, 140); g.closePath(); g.fill();
      g.fillStyle = '#ffd048'; for (const dx of [-40, 0, 40]) { g.beginPath(); g.arc(cx + dx, dx === 0 ? 80 : 90, 8, 0, TAU); g.fill(); }
      g.fillStyle = '#3a2a26'; g.fillRect(cx - 40, 146, 80, 30);
      g.fillStyle = '#ff8a20'; for (let i = 0; i < 4; i++) g.fillRect(cx - 34 + i * 20, 152, 8, 18);
    });
  });
  return bannerTex;
}

/**
 * Banner (Brummbär-Wappen bzw. Glutkrone) – alle in einem Mesh, wehen im Shader (unten mehr als oben).
 * list [{ pos: [x, y, z] (Mitte der Stange oben), width: 1.4, height: 3, yaw (Vorderseite bei 0 nach +Z),
 * motif: 0 | 1 }]; Stangen und Knäufe statisch.
 */
export function banner(level, list) {
  const parts = [];
  const pos = [], uv = [], sway = [];
  for (const b of list) {
    const [x, y, z] = b.pos;
    const W = b.width ?? 1.4, H = b.height ?? 3, yaw = b.yaw ?? 0, mo = b.motif ?? 0;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly) => [x + lx * c, y + ly, z - lx * s];
    const u0 = mo * 0.5, u1 = u0 + 0.5;
    const nx = 3, ny = 6;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a0 = i / nx, a1 = (i + 1) / nx, b0 = j / ny, b1 = (j + 1) / ny;
      const q = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [aa, bb] = q[k];
        // Schwalbenschwanz: Mitte unten ausgeschnitten (v hebt sich in der Mitte)
        const notch = bb === 1 ? 0 : 0;
        let ly = -bb * H + notch;
        if (bb > 0.999) ly += (1 - Math.abs(aa - 0.5) * 2) * W * 0.35;
        pos.push(...P((aa - 0.5) * W, ly));
        uv.push(u0 + aa * 0.5, 1 - bb);
        sway.push(bb);
      }
    }
    // Stange mit Knäufen
    const rod = cyl(0.045, 0.045, W + 0.35, 0, 0, 0, 0xffc21a, 6, { rz: Math.PI / 2, center: true });
    rod.rotateY(yaw); rod.translate(x, y + 0.03, z);
    parts.push(rod);
    for (const sx of [-1, 1]) parts.push(sph(0.08, x + sx * (W / 2 + 0.17) * c, y + 0.03, z - sx * (W / 2 + 0.17) * s, 0xffc21a, { ws: 6, hs: 5 }));
  }
  bakeParts(level, parts, { castShadow: false });
  if (!level.view || !pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  g.computeVertexNormals();
  const u = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(), roughness: 0.85, side: THREE.DoubleSide, emissive: 0x2a0806 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime;
    sh.vertexShader = 'uniform float uTime;\nattribute float sway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 bw = modelMatrix * vec4(position, 1.0);
      float bph = bw.x * 0.7 + bw.z * 0.5;
      transformed.x += sin(uTime * 1.6 + bph + sway * 2.2) * 0.12 * sway;
      transformed.z += cos(uTime * 1.3 + bph * 1.3 + sway * 1.7) * 0.18 * sway;`);
  };
  mat.customProgramCacheKey = () => 'w4d:banner';
  const m = new THREE.Mesh(g, mat);
  m.name = 'banner';
  m.castShadow = false;
  m.receiveShadow = false;
  const h = {};
  addObject(level, m, (dt) => { u.uTime.value += visDt(level, h, dt); });
  return m;
}

/** Hängende Eisenketten (statisch): list [{ from: [x, y, z], to: [x, y, z] (Durchhang sag) } | { pos, length }]. */
export function ketten(level, list) {
  const parts = [];
  const iron = L(0x3a3640), hi = L(0x8a8494);
  const linkGeo = new THREE.TorusGeometry(0.07, 0.022, 4, 8);
  linkGeo.scale(0.75, 1.3, 1);
  const base = linkGeo.toNonIndexed();
  const pts = [];
  for (const k of list) {
    if (k.pos) {
      const [x, y, z] = k.pos, n = Math.max(2, Math.round((k.length ?? 3) / 0.17));
      for (let i = 0; i < n; i++) pts.push([x, y - i * 0.17, z, 0, i % 2]);
      continue;
    }
    const a = k.from, b = k.to, sag = k.sag ?? 0.6;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(2, Math.round(len / 0.17));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, z = a[2] + (b[2] - a[2]) * t;
      pts.push([x, y, z, Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])), i % 2, Math.atan2(-(b[2] - a[2]), b[0] - a[0])]);
    }
  }
  for (const [x, y, z, tilt, odd, yaw] of pts) {
    const g = base.clone();
    if (odd) g.rotateY(Math.PI / 2);
    if (tilt) g.rotateZ(Math.PI / 2 - tilt);
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
    colorize(g, (p, n, o) => mixc(iron, hi, smooth(-0.5, 0.9, n.y * 0.6 + n.x * 0.3), o));
    parts.push(g);
  }
  bakeParts(level, parts, { castShadow: false });
}

/**
 * Aufsteigende Glut über der Lava (ein Zeichenaufruf): Funken steigen in den Bereichen boxes [[x0, x1, zA, zB], …]
 * von der Lava-Höhe y auf und verglühen; n Funken. Wiederholt sich (deterministisch über die Zeit).
 */
export function funkenFlug(level, boxes, y = 0, o = {}) {
  if (!level.view || !boxes.length) return null;
  const n = o.n ?? 140;
  const rnd = new Rnd(o.seed ?? 99);
  const P = [];
  for (let i = 0; i < n; i++) {
    const b = boxes[i % boxes.length];
    P.push({ x: rnd.real(Math.min(b[0], b[1]), Math.max(b[0], b[1])), z: rnd.real(Math.min(b[2], b[3]), Math.max(b[2], b[3])), t: rnd.frac() * 4, life: 2.5 + rnd.frac() * 2.5, sp: 0.8 + rnd.frac() * 1.4, sw: rnd.frac() * 6 });
  }
  const arr = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const m = new THREE.PointsMaterial({ map: glowTexture(), color: 0xffa040, size: o.size ?? 0.32, sizeAttenuation: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.name = 'funkenflug';
  const h = {};
  let t = 0;
  addObject(level, pts, (dt) => {
    const d = visDt(level, h, dt);
    t += d;
    for (let i = 0; i < n; i++) {
      const p = P[i];
      p.t += d;
      if (p.t > p.life) p.t -= p.life;
      const k = p.t / p.life;
      arr[i * 3] = p.x + Math.sin(t * 1.3 + p.sw) * 0.35 * k;
      arr[i * 3 + 1] = y + 0.2 + p.t * p.sp * (k > 0.9 ? 1 : 1);
      arr[i * 3 + 2] = p.z + Math.cos(t * 1.1 + p.sw) * 0.3 * k;
      if (k > 0.92) arr[i * 3 + 1] = -100;   // verglüht
    }
    g.attributes.position.needsUpdate = true;
  });
  return pts;
}

/**
 * Thronsaal-Boden über der Arenaplattform (arena_cage): Basaltplatten in Ringen mit glühenden Fugen, Glutkrone in der
 * Mitte, Thron (Kulisse) hinter der Arena. o = { x, y, z (Mitte der Bodenoberfläche), r (Plattformradius), throne:
 * [x, y, z] | null }.
 */
export function thronSaal(level, o) {
  const { x: cx, y: cy, z: cz, r: R } = o;
  const parts = [], glow = [];
  const rings = [[0, 2.6], [2.6, 5.4], [5.4, 8.4], [8.4, R]];
  const a1 = L(0x4a3a40), a2 = L(0x5e4c52), a3 = L(0x3a2c32);
  // dunkler Fugengrund über dem hellen Käfigboden
  const base = new THREE.CircleGeometry(R + 0.02, 48).toNonIndexed();
  base.rotateX(-Math.PI / 2); base.translate(cx, cy + 0.02, cz);
  colorize(base, fillc(L(0x1e1418)));
  parts.push(base);
  rings.forEach(([r0, r1], ri) => {
    const nSeg = [10, 18, 26, 34][ri];
    for (let i = 0; i < nSeg; i++) {
      const t0 = (i / nSeg) * TAU + ri * 0.2, t1 = ((i + 1) / nSeg) * TAU + ri * 0.2;
      const g = new THREE.RingGeometry(Math.max(0.01, r0 + 0.06), r1 - 0.06, 4, 1, t0 + 0.012, t1 - t0 - 0.024).toNonIndexed();
      g.rotateX(-Math.PI / 2);
      g.translate(cx, cy + 0.035, cz);
      const k = (Math.sin(i * 12.9 + ri * 7.7) * 0.5 + 0.5);
      colorize(g, fillc(k < 0.45 ? mixc(a1, a2, k * 2, [0, 0, 0]) : mixc(a1, a3, (k - 0.45) * 1.8, [0, 0, 0])));
      parts.push(g);
    }
    // glühende Fuge außen am Ring
    const f = new THREE.RingGeometry(r1 - 0.06, r1 + 0.02, 48, 1).toNonIndexed();
    f.rotateX(-Math.PI / 2); f.translate(cx, cy + 0.025, cz);
    colorize(f, fillc(L(ri === 3 ? 0xffb040 : 0xff6a10)));
    glow.push(f);
  });
  // Glutkrone in der Mitte
  const crown = new THREE.Shape();
  const pts = [[-1.4, -0.7], [-1.4, 0.5], [-0.75, -0.05], [0, 0.85], [0.75, -0.05], [1.4, 0.5], [1.4, -0.7]];
  pts.forEach(([x, y], i) => (i ? crown.lineTo(x, y) : crown.moveTo(x, y)));
  const cg = new THREE.ShapeGeometry(crown).toNonIndexed();
  cg.rotateX(-Math.PI / 2); cg.translate(cx, cy + 0.04, cz + 0.1);
  colorize(cg, fillc(L(0xff8a20)));
  glow.push(cg);
  for (const [x, z] of [[-1.4, -0.5], [0, -0.85], [1.4, -0.5]]) { const s = new THREE.CircleGeometry(0.22, 10).toNonIndexed(); s.rotateX(-Math.PI / 2); s.translate(cx + x, cy + 0.045, cz + 0.1 + z); colorize(s, fillc(L(0xffe070))); glow.push(s); }
  // Thron (Kulisse, groß, dunkler Basalt mit Glutkissen und Goldkante)
  if (o.throne) {
    const [tx, ty, tz] = o.throne;
    parts.push(blk(6, 1.2, 4, tx, ty, tz, 0x3a2c32, { top: 0x5a4a50 }));
    parts.push(blk(4.6, 1.4, 3, tx, ty + 1.2, tz, 0x4a3a40));
    parts.push(blk(5.2, 6.5, 1.2, tx, ty + 1.2, tz - 1.6, 0x3a2c32, { top: 0x564650 }));
    for (const sx of [-1, 1]) {
      parts.push(blk(0.9, 2.4, 3, tx + sx * 2.7, ty + 1.2, tz, 0x4a3a40, { top: 0xffc21a }));
      parts.push(cone(0.55, 1.4, tx + sx * 2.3, ty + 7.7, tz - 1.6, 0x564650, 6));
    }
    parts.push(cone(0.8, 2.2, tx, ty + 7.7, tz - 1.6, 0x564650, 6));
    glow.push(blk(3.8, 0.35, 2.4, tx, ty + 2.6, tz + 0.1, 0xff6a10, { top: 0xffb040 }));
    glow.push(blk(3.6, 2.6, 0.3, tx, ty + 3.4, tz - 0.95, 0xff4a10, { top: 0xffb040 }));
    // Krone über dem Thron (leer: der König kämpft!)
    const kr = new THREE.TorusGeometry(0.9, 0.16, 6, 20).toNonIndexed();
    kr.rotateX(Math.PI / 2); kr.translate(tx, ty + 8.9, tz - 1.2);
    colorize(kr, fillc(L(0xffc21a)));
    parts.push(kr);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; parts.push(cone(0.16, 0.6, tx + Math.cos(a) * 0.9, ty + 8.9, tz - 1.2 + Math.sin(a) * 0.9, 0xffc21a, 6)); }
  }
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
}

/**
 * Steinstatue des Baron Brummbär (Bär mit Zylinder, Monokel, Weste) auf einem Sockel – stehend oder vom Sockel
 * gestürzt (toppled: liegt zerbrochen davor, der Kopf mit dem Zylinder ist abgebrochen). o = { pos: [x, y, z], yaw,
 * size: 1 (≈ 3,4 m hoch), toppled }. Statisch, Kollision am Sockel.
 */
export function baronStatue(level, o) {
  const [x, y, z] = o.pos;
  const S = o.size ?? 1, yaw = o.yaw ?? 0;
  const st = 0x8a7e86, stDk = 0x6a5e66, gold = 0xffc21a;
  const parts = [], fig = [], head = [];
  parts.push(blk(2.2 * S, 0.9 * S, 2.2 * S, 0, 0, 0, stDk, { top: 0x9a8e96 }));
  parts.push(blk(1.9 * S, 0.12 * S, 1.9 * S, 0, 0.9 * S, 0, gold));
  // Figur (lokal, Blick +X): Körper, Weste, Arme, Füße
  fig.push(sph(0.75 * S, 0, 1.0 * S, 0, st, { sy: 1.15 }));
  fig.push(sph(0.5 * S, 0.32 * S, 0.95 * S, 0, 0x7a6e76, { sy: 1.2 }));
  for (const s of [-1, 1]) {
    fig.push(sph(0.26 * S, 0.1 * S, 1.15 * S, s * 0.72 * S, st, { sy: 1.6 }));
    fig.push(sph(0.24 * S, 0.25 * S, 0.18 * S, s * 0.35 * S, stDk, { sy: 0.6 }));
  }
  // Kopf mit Ohren, Schnauze, Monokel, Zylinder
  head.push(sph(0.52 * S, 0, 0, 0, st));
  for (const s of [-1, 1]) head.push(sph(0.17 * S, -0.05 * S, 0.42 * S, s * 0.36 * S, st));
  head.push(sph(0.24 * S, 0.42 * S, -0.1 * S, 0, 0x9a8e96, { sy: 0.8 }));
  const mono = new THREE.TorusGeometry(0.12 * S, 0.028 * S, 5, 14).toNonIndexed();
  mono.rotateY(Math.PI / 2); mono.translate(0.47 * S, 0.1 * S, -0.17 * S);
  colorize(mono, fillc(L(gold)));
  head.push(mono);
  head.push(cyl(0.48 * S, 0.48 * S, 0.06 * S, 0, 0.4 * S, 0, 0x4a3e46, 14));
  head.push(cyl(0.32 * S, 0.34 * S, 0.62 * S, 0, 0.44 * S, 0, 0x4a3e46, 14));
  head.push(cyl(0.345 * S, 0.345 * S, 0.12 * S, 0, 0.5 * S, 0, 0xb0182a, 14));
  if (o.tilt) {
    // angeknackst: Figur leicht schief, ein Ohr abgebrochen (liegt daneben)
    for (const g of fig) { g.translate(0, 1.02 * S, 0); g.rotateX(o.tilt); parts.push(g); }
    head.splice(2, 1);
    for (const g of head) { g.translate(0.05 * S, 3.15 * S, 0); g.rotateX(o.tilt * 1.4); parts.push(g); }
    parts.push(sph(0.17 * S, 0.9 * S, 0.12 * S, 1.3 * S, st, { sy: 0.7 }));
  } else if (o.toppled) {
    // Körper liegt rücklings vor dem Sockel, Kopf ist weggerollt
    for (const g of fig) { g.rotateZ(Math.PI / 2 - 0.15); g.translate(-0.3 * S, 0.62 * S, 0); g.rotateY(0.4); g.translate(2.6 * S, 0, 0.3 * S); parts.push(g); }
    for (const g of head) { g.rotateZ(1.9); g.rotateX(0.5); g.translate(3.6 * S, 0.45 * S, -1.6 * S); parts.push(g); }
    for (let i = 0; i < 6; i++) parts.push(sph((0.12 + (i % 3) * 0.06) * S, (1.4 + i * 0.4) * S, 0.1 * S, Math.sin(i * 2.3) * 1.2 * S, stDk, { ws: 5, hs: 4, sy: 0.7 }));
  } else {
    for (const g of fig) { g.translate(0, 1.02 * S, 0); parts.push(g); }
    for (const g of head) { g.translate(0.05 * S, 3.15 * S, 0); parts.push(g); }
  }
  for (const g of parts) { g.rotateY(yaw); g.translate(x, y, z); }
  bakeParts(level, parts, { castShadow: true });
  level.world.add({ type: 'box', min: [x - 1.1 * S, y, z - 1.1 * S], max: [x + 1.1 * S, y + 1.02 * S, z + 1.1 * S], tag: 'statue' });
}

/** Teppichläufer (rot mit Goldkante, Rauten) als flache Fläche: { x, y, z0, z1, w }. */
export function teppich(level, o) {
  const { x, y } = o, z0 = Math.max(o.z0, o.z1), z1 = Math.min(o.z0, o.z1), w = o.w ?? 3;
  const parts = [];
  parts.push(quadG(x, y + 0.02, (z0 + z1) / 2, w, z0 - z1, 'y', o.border ?? 0xd8a020));
  parts.push(quadG(x, y + 0.025, (z0 + z1) / 2, w - 0.36, z0 - z1 - 0.2, 'y', o.color ?? 0xa8142a));
  for (let z = z0 - 1.2; z > z1 + 0.8; z -= 2.2) {
    const g = new THREE.CircleGeometry(0.42, 4).toNonIndexed();
    g.rotateX(-Math.PI / 2); g.translate(x, y + 0.03, z);
    colorize(g, fillc(L(0xffc21a)));
    parts.push(g);
  }
  bakeParts(level, parts, { castShadow: false });
}

// ====================================================================== 3) Mechanik

/**
 * Fallbrücke: Eine Steinbrücke hängt an vier Ketten hoch über dem Lavagraben; ein Signal (`drop` bzw. `start`, z. B.
 * zwei Druckfelder einer Gruppe mit on: { drop: id }) lässt die Ketten reißen – die Brücke kracht herunter und liegt
 * fest über dem Graben. o = { id, x0, x1, zA, zB (Grundfläche), y (Oberseite unten), hang: 7 (m höher im Hängen),
 * anchors: [[x, y, z] × 4] (Kettenaufhängungen; Reihenfolge wie die Ecken x0/zA, x1/zA, x1/zB, x0/zB) }.
 * Laufzeit: level.named.get(id) = { state ('haengt'|'faellt'|'liegt'), y, drop(), info() }.
 */
export function fallBruecke(level, o) {
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1), z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB);
  const top = o.y, hang = o.hang ?? 7;
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const alongX = w >= d;
  const st = { state: 'haengt', y: top + hang, vy: 0, t: 0, sid: null };
  let mesh = null, chains = null;
  const h = {
    get state() { return st.state; }, get y() { return st.y; },
    drop() {
      if (st.state !== 'haengt') return;
      st.state = 'faellt'; st.t = 0; st.vy = 0;
      level.sfx('switch'); level.sfx('chain');
      for (const a of o.anchors ?? []) level.effects?.sparks({ x: a[0], y: a[1], z: a[2] }, 10);
      if (chains) chains.visible = false;
    },
    start() { h.drop(); },
    info: () => ({ state: st.state, y: +st.y.toFixed(2) }),
  };
  if (o.id) level.named.set(o.id, h);
  if (level.view) {
    // Brücke (lokal um die Oberseite-Mitte): Steinbett, Holzplanken quer, Bordsteine, Goldnieten
    const P = [];
    P.push(blk(w, 0.6, d, 0, -0.6, 0, 0x4a3a40, { top: 0x5a4a50 }));
    const n = Math.round((alongX ? w : d) / 0.55);
    for (let i = 0; i < n; i++) {
      const u = -((alongX ? w : d) / 2) + (i + 0.5) * ((alongX ? w : d) / n);
      const col = i % 3 === 0 ? 0x8a5a36 : i % 3 === 1 ? 0x9a6a3e : 0x7a4e2e;
      P.push(alongX ? blk(((w / n) * 0.9), 0.1, d - 0.5, u, 0, 0, col) : blk(w - 0.5, 0.1, (d / n) * 0.9, 0, 0, u, col));
    }
    for (const s of [-1, 1]) {
      P.push(alongX ? blk(w, 0.35, 0.3, 0, 0, s * (d / 2 - 0.15), 0x5a4a50, { top: 0x7a6870 }) : blk(0.3, 0.35, d, s * (w / 2 - 0.15), 0, 0, 0x5a4a50, { top: 0x7a6870 }));
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.push(cyl(0.12, 0.14, 0.5, sx * (w / 2 - 0.3), 0, sz * (d / 2 - 0.15), 0xffc21a, 8));
    mesh = new THREE.Mesh(merge(P), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(cx, st.y, cz);
    mesh.name = 'fallbruecke';
    addObject(level, mesh, () => { mesh.position.y = st.y; });
    // Ketten (eigenes Mesh: verschwinden beim Reißen)
    const corners = [[x0 + 0.3, z0 + 0.15], [x1 - 0.3, z0 + 0.15], [x1 - 0.3, z1 - 0.15], [x0 + 0.3, z1 - 0.15]];
    const C = [];
    const link = new THREE.TorusGeometry(0.08, 0.025, 4, 8).toNonIndexed();
    link.scale(0.75, 1.3, 1);
    const iron = L(0x3a3640), hi = L(0x8a8494);
    (o.anchors ?? []).forEach((a, i) => {
      const c = corners[i % 4];
      const b = [c[0], top + hang + 0.25, c[1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const m = Math.max(2, Math.round(len / 0.19));
      const tilt = Math.atan2(a[1] - b[1], Math.hypot(a[0] - b[0], a[2] - b[2]));
      const yaw = Math.atan2(-(a[2] - b[2]), a[0] - b[0]);
      for (let k = 0; k <= m; k++) {
        const t = k / m;
        const g = link.clone();
        if (k % 2) g.rotateY(Math.PI / 2);
        g.rotateZ(Math.PI / 2 - tilt);
        g.rotateY(yaw);
        g.translate(b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t - Math.sin(t * Math.PI) * 0.25, b[2] + (a[2] - b[2]) * t);
        colorize(g, (p, nn, out) => mixc(iron, hi, smooth(-0.5, 0.9, nn.y * 0.6 + nn.x * 0.3), out));
        C.push(g);
      }
    });
    if (C.length) {
      chains = new THREE.Mesh(merge(C), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }));
      chains.name = 'fallbruecke-ketten';
      chains.castShadow = false;
      addObject(level, chains);
    }
  }
  level.onStep((dt) => {
    if (st.state !== 'faellt') return;
    st.t += dt;
    st.vy = Math.min(st.vy + 30 * dt, 24);
    st.y -= st.vy * dt;
    if (st.y <= top) {
      st.y = top;
      st.state = 'liegt';
      st.sid = level.world.add({ type: 'box', min: [x0, top - 0.6, z0], max: [x1, top, z1], owner: h, tag: 'fallbruecke' });
      level.shake(0.6);
      level.sfx('slam');
      for (let i = 0; i < 5; i++) level.effects?.dust({ x: x0 + (i + 0.5) * (w / 5), y: top, z: cz }, 4, 1.6);
      level.effects?.sparks({ x: cx, y: top + 0.3, z: cz }, 16);
    }
  });
  return h;
}

/**
 * Lavaschlot: liefert Lavabrocken nach. Sind im Bereich weniger als keep Lavabrocken (wach, betäubt oder getragen),
 * springt nach every s ein neuer aus dem Schlot. o = { pos: [x, y, z] (Fußpunkt), keep: 1, every: 3.5, area:
 * [x0, x1, zA, zB] (Standard 8 m um den Schlot), near: 30 (nur mit Figur in der Nähe), spec: { …Lavabrocken } }.
 */
export function brockenQuelle(level, o) {
  const [x, y, z] = o.pos;
  const area = o.area ?? [x - 8, x + 8, z - 8, z + 8];
  const ax0 = Math.min(area[0], area[1]), ax1 = Math.max(area[0], area[1]), az0 = Math.min(area[2], area[3]), az1 = Math.max(area[2], area[3]);
  const keep = o.keep ?? 1, every = o.every ?? 3.5;
  const st = { t: every * 0.6, spawned: 0 };
  const inArea = (e) => e.pos.x >= ax0 && e.pos.x <= ax1 && e.pos.z >= az0 && e.pos.z <= az1;
  const count = () => {
    let n = 0;
    for (const e of level.entities) {
      if (e.kind !== 'lavabrocken' || e.removed || e.defeated || e.state === 'burst') continue;
      if (e.carrier || inArea(e)) n++;
    }
    return n;
  };
  let k = 0;
  level.onStep((dt) => {
    st.t += dt;
    if (st.t < every) return;
    const p = level.player;
    if (p && Math.hypot(p.pos.x - x, p.pos.z - z) > (o.near ?? 30)) return;
    if (count() >= keep) { st.t = every * 0.5; return; }
    st.t = 0;
    const a = (k++ * 2.4 + (o.phase ?? 0)) % TAU;
    const e = level.spawn('lavabrocken', { behavior: 'chase', sight: 6, wake: 30, ...(o.spec ?? {}), pos: [x, y + 0.5, z], vel: [Math.cos(a) * 1.6, 8.5, Math.sin(a) * 1.6] });
    if (e) { st.spawned++; level.effects?.sparks({ x, y: y + 0.6, z }, 12); level.sfx('burn'); }
  });
  if (o.id) level.named.set(o.id, { get spawned() { return st.spawned; }, count, info: () => ({ spawned: st.spawned, here: count() }) });
  // Schlot: Felskranz, glühender Kern
  const parts = [], glow = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    const r = 0.38 + (i % 3) * 0.06;
    const g = new THREE.DodecahedronGeometry(r, 0);   // Polyeder: schon nicht indiziert
    g.scale(1, 0.75, 1);
    g.translate(x + Math.cos(a) * 1.0, y + r * 0.45, z + Math.sin(a) * 1.0);
    colorize(g, (p, n, out) => mixc(L(0x2a1a18), L(0x5a3a30), smooth(-0.5, 1, n.y), out));
    parts.push(g);
  }
  const core = new THREE.CircleGeometry(0.85, 14).toNonIndexed();
  core.rotateX(-Math.PI / 2); core.translate(x, y + 0.08, z);
  colorize(core, (p, n, out) => mixc(L(0xffd048), L(0xff4a0c), smooth(0, 0.85, Math.hypot(p.x - x, p.z - z)), out));
  glow.push(core);
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
  glowPoints(level, [[x, y + 0.6, z]], 0xff6a10, 3.2, { opacity: 0.6, name: 'schlot-schein' });
  return st;
}

/** Stimmung je Bereich (Thema-Stimmungen, z. B. 'innen' im Thronsaal): zones [{ min: [x, z], max: [x, z], mood }]. */
export function stimmung(level, zones) {
  level.moodNow = undefined;
  const pick = (p) => {
    for (const zn of zones) if (p.pos.x >= zn.min[0] && p.pos.x <= zn.max[0] && p.pos.z >= zn.min[1] && p.pos.z <= zn.max[1]) return zn.mood ?? null;
    return null;
  };
  const apply = (fast) => {
    const p = level.player;
    if (!p) return;
    const m = pick(p);
    if (m === level.moodNow) return;
    level.moodNow = m;
    level.view?.setMood?.(m, { time: fast ? 0 : 1.0 });
  };
  apply(true);
  level.onStep(() => apply(false));
}

/**
 * Baron-Szene nach dem Sieg (4-Burg): Baron Brummbär braust im roten Sportwagen über die Burgbrücke hinter der Arena
 * heran (Funken aus der Lava), bleibt stehen, hüpft vor Wut im Sitz, schimpft – und flieht durchs Burgtor. Kamera
 * schwenkt mit; am Ende „Welt 4 geschafft!“. cfg = { from, stop, away: [x, y, z], text }. Rein darstellerisch.
 */
class BaronSzeneLava {
  constructor(level, cfg) {
    this.level = level;
    this.cfg = cfg;
    this.state = 'wait';
    this.t = 0;
    this.pos = new THREE.Vector3(...cfg.from);
    this.yaw = 0;
    this.speed = 0;
    this.hop = 0;
    this.said = false;
    this.log = [];
    if (level.view) {
      this.model = getModel('baron_brummbaer', { withCar: true });
      this.model.root.visible = false;
      level.view.add(this.model.root);
      this.model.root.traverse((x) => { if (x.isMesh) x.userData.owned = true; });
    }
  }

  get active() { return this.state === 'in' || this.state === 'stop' || this.state === 'away'; }

  start() { if (this.state === 'wait') { this.state = 'in'; this.t = 0; this.level.sfx('swoop'); this.log.push('in'); } }

  reset() { this.state = 'wait'; this.t = 0; this.said = false; this.hop = 0; this.log = []; this.pos.set(...this.cfg.from); }

  step(dt) {
    if (!this.active) return;
    this.t += dt;
    const { from, stop, away } = this.cfg;
    const dir = (a, b) => Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    const fx = (n) => { if (this.level.view && (this.t * 20) % 1 < 0.5) this.level.effects?.sparks({ x: this.pos.x - Math.cos(this.yaw) * 2, y: this.pos.y + 0.3, z: this.pos.z + Math.sin(this.yaw) * 2 }, n); };
    if (this.state === 'in') {
      const k = Math.min(1, this.t / 2.2);
      const e = 1 - (1 - k) * (1 - k);
      this.pos.set(from[0] + (stop[0] - from[0]) * e, from[1] + (stop[1] - from[1]) * e, from[2] + (stop[2] - from[2]) * e);
      this.yaw = dir(from, stop);
      this.speed = 15 * (1 - k * 0.7);
      fx(1);
      if (k >= 1) { this.state = 'stop'; this.t = 0; this.level.sfx('skid'); this.log.push('stop'); }
    } else if (this.state === 'stop') {
      this.speed = 0;
      // dreht sich zur Figur, hüpft vor Wut im Sitz
      const p = this.level.player;
      const want = p ? Math.atan2(-(p.pos.z - stop[2]), p.pos.x - stop[0]) : this.yaw;
      if (this.t < 1.6) this.yaw += Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)) * Math.min(1, dt * 3);
      this.hop = this.t > 0.4 && this.t < 2.2 ? Math.abs(Math.sin(this.t * 9)) * 0.35 : 0;
      if (!this.said && this.t > 0.3) {
        this.said = true;
        const hud = this.level.archetype?.hud;
        hud?.banner?.(this.cfg.text ?? 'Baron Brummbär: „Mein Felsenkönig! Das bekommt ihr zurück!“', { hold: 2.8, size: 11, color: '#ffb0a0', y: 0.7 });
        this.level.sfx('panic');
      }
      if (this.t > 2.2) {
        const w2 = dir(stop, away);
        this.yaw += Math.atan2(Math.sin(w2 - this.yaw), Math.cos(w2 - this.yaw)) * Math.min(1, dt * 5);
      }
      if (this.t > 3.0) { this.state = 'away'; this.t = 0; this.hop = 0; this.level.sfx('swoop'); this.log.push('away'); }
    } else if (this.state === 'away') {
      const k = Math.min(1, this.t / 2.4);
      this.pos.set(stop[0] + (away[0] - stop[0]) * k * k, stop[1] + (away[1] - stop[1]) * k * k, stop[2] + (away[2] - stop[2]) * k * k);
      this.yaw = dir(stop, away);
      this.speed = 4 + k * 26;
      fx(2);
      if (k >= 1) {
        this.state = 'gone';
        this.log.push('gone');
        this.level.archetype?.hud?.banner?.('Welt 4 geschafft!', { hold: 2.8, size: 18, color: '#7dffa0' });
        this.level.sfx('victory');
      }
    }
  }

  render(dt) {
    if (!this.model) return;
    const r = this.model.root;
    r.visible = this.active;
    if (!r.visible) return;
    r.position.set(this.pos.x, this.pos.y + this.hop, this.pos.z);
    r.rotation.y = this.yaw;
    this.model.update(Math.min(dt || 0, 0.1), { anim: this.state === 'stop' ? 'stunned' : 'drive', speed: this.speed, steer: 0 });
  }

  info() { return { state: this.state, t: +this.t.toFixed(2), x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), log: this.log.slice() }; }
}

/**
 * Baron-Szene anmelden: startet, sobald der Endgegner (cfg.boss, Id) ganz verschwunden ist (Zustand 'gone' – nach
 * seiner Niederlage-Animation, damit beides nacheinander zu sehen ist), ein Neustart vor dem Sieg setzt sie zurück,
 * das Kamera-Blickziel schwenkt zum Wagen. Liefert die Szene (info()).
 */
export function baronSzene(level, cfg) {
  const sc = new BaronSzeneLava(level, cfg);
  const rt = level.runtime, respawn = rt.respawn.bind(rt);
  rt.respawn = (...a) => { respawn(...a); if (!level.archetype?.won) sc.reset(); };
  // Kamera erst einhängen, wenn der Archetyp steht (der Level-Haken läuft vor dessen setup)
  let wrapped = false;
  const wrapCam = () => {
    const arch = level.archetype;
    if (wrapped || !level.view || !arch?.camera) return;
    wrapped = true;
    const cam = arch.camera.bind(arch);
    let k = 0;
    arch.camera = (dt, player, world) => {
      const r = cam(dt, player, world);
      const want = sc.active && sc.state !== 'away' ? 0.95 : sc.state === 'away' && sc.t < 1.4 ? 0.6 : 0;
      k += (want - k) * Math.min(1, dt * 2.5);
      if (k > 0.01) {
        // Blick zum Wagen, flacher (über die Käfigstäbe hinweg)
        const rig = level.view.rig;
        // Blickziel etwas hinter und über dem Wagen: der Baron steht dann mittig über dem Käfigrand
        rig.target.set(rig.target.x + (sc.pos.x - rig.target.x) * k, rig.target.y + (sc.pos.y + 3.2 - rig.target.y) * k, rig.target.z + (sc.pos.z - 3 - rig.target.z) * k);
        rig.distNow += (15 - rig.distNow) * k;
        rig.place({ ...rig.cur, pitch: rig.cur.pitch + (30 - rig.cur.pitch) * k }, dt);
      }
      return r;
    };
  };
  level.onStep((dt) => {
    wrapCam();
    if (sc.state === 'wait') {
      const b = level.named.get(cfg.boss ?? 'koenig');
      if (b && b.state === 'gone' && b.hp <= 0) sc.start();
    }
    sc.step(dt);
  });
  if (level.view) level.view.onFrame((dt) => sc.render(dt));
  return sc;
}

// ====================================================================== 4) Prüfungs-Haus (4-Haus)

/** Tapetenmuster (128-px-Kachel = 1 m an der Wand) – je Raum ein eigenes. */
const TAPETEN = {
  bauklotz(g, S) {   // Kinderzimmer: zartgelb mit bunten Bauklötzen und Buchstaben
    g.fillStyle = '#fff2b8'; g.fillRect(0, 0, S, S);
    const cols = ['#ff7a7a', '#7ab8ff', '#7ad87a', '#c89aff'];
    [[20, 22, 0, 'A'], [84, 38, 1, 'B'], [44, 88, 2, 'C'], [104, 100, 3, 'D']].forEach(([x, y, c, t]) => {
      g.fillStyle = cols[c]; g.fillRect(x - 13, y - 13, 26, 26);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x - 13, y - 13, 26, 5);
      g.fillStyle = '#ffffff'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 2);
    });
  },
  wueste(g, S) {     // Sandkasten-Diele: sandfarben mit Kakteen und Sonnen
    g.fillStyle = '#f0d49a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#e6c27c'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32 + 14, S, 4);
    g.fillStyle = '#4fae5a';
    for (const [x, y] of [[30, 70], [96, 28]]) { g.fillRect(x - 5, y - 22, 10, 44); g.fillRect(x - 17, y - 8, 8, 16); g.fillRect(x - 17, y - 14, 4, 10); g.fillRect(x + 9, y - 16, 8, 14); g.fillRect(x + 13, y - 22, 4, 10); }
    g.fillStyle = '#ff9a3a'; for (const [x, y] of [[96, 96], [30, 16]]) { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
  },
  galerie(g, S) {    // Ahnengalerie: dunkelrot mit goldenem Damastmuster
    g.fillStyle = '#7a1428'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(232,180,80,0.75)'; g.lineWidth = 3;
    for (const [x, y] of [[S / 2, S / 2], [0, 0], [S, 0], [0, S], [S, S]]) {
      g.beginPath(); g.ellipse(x, y, 18, 30, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y + 30); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.stroke();
    }
  },
  backstube(g, S) {  // Backstube: blau-weiße Kacheln mit Brezeln
    g.fillStyle = '#f4f6ff'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#b8c4e0'; g.lineWidth = 3; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * S / 2, 0); g.lineTo(i * S / 2, S); g.stroke(); g.beginPath(); g.moveTo(0, i * S / 2); g.lineTo(S, i * S / 2); g.stroke(); }
    g.strokeStyle = '#c87a3a'; g.lineWidth = 5;
    for (const [x, y] of [[S / 4, S / 4], [(3 * S) / 4, (3 * S) / 4]]) { g.beginPath(); g.arc(x - 7, y + 2, 9, 0, TAU); g.arc(x + 7, y + 2, 9, 0, TAU); g.stroke(); }
    g.fillStyle = '#3a6ad0'; for (const [x, y] of [[(3 * S) / 4, S / 4], [S / 4, (3 * S) / 4]]) { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
  },
  zirkus(g, S) {     // Seiltänzer-Saal: rot-weiße Streifen mit goldenen Sternen
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fff4e8' : '#d8283a'; g.fillRect(i * S / 4, 0, S / 4, S); }
    g.fillStyle = '#ffc21a';
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    star(S / 8, 30, 9); star((5 * S) / 8, 94, 9);
  },
  maschine(g, S) {   // Maschinenhalle: blaugraue Platten mit Nieten und Zahnrädern
    g.fillStyle = '#5a6a80'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#4a5a70'; g.fillRect(0, S / 2, S, S / 2);
    g.fillStyle = '#c8d0dc'; for (const x of [8, S - 8]) for (const y of [8, S / 2 - 8, S / 2 + 8, S - 8]) { g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); }
    g.fillStyle = '#e8a83a';
    const gear = (x, y, r) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = i % 2 ? r : r * 0.78; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); g.fillStyle = '#4a5a70'; g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill(); g.fillStyle = '#e8a83a'; };
    gear(S / 2, S / 4, 20); gear(S / 4 - 6, (3 * S) / 4, 14);
  },
  schaukel(g, S) {   // Schaukelzimmer: mintgrün mit Luftballons
    g.fillStyle = '#b8f0d8'; g.fillRect(0, 0, S, S);
    for (const [x, y, c] of [[28, 40, '#ff6a8a'], [92, 24, '#ffd23d'], [70, 92, '#6aa8ff']]) {
      g.strokeStyle = '#6a8a7a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + 14); g.quadraticCurveTo(x + 6, y + 30, x - 2, y + 42); g.stroke();
      g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 11, 14, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x - 4, y - 5, 3, 4, 0, 0, TAU); g.fill();
    }
  },
  pilz(g, S) {       // Pilzlingsparade: grün mit roten Pilzen
    g.fillStyle = '#3f7a4a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#4c8a56'; g.fillRect(0, 0, S / 2, S / 2); g.fillRect(S / 2, S / 2, S / 2, S / 2);
    for (const [x, y] of [[S / 4, S / 4], [(3 * S) / 4, (3 * S) / 4]]) {
      g.fillStyle = '#f4ead8'; g.fillRect(x - 6, y, 12, 16);
      g.fillStyle = '#e83a3a'; g.beginPath(); g.ellipse(x, y, 20, 14, 0, Math.PI, TAU); g.fill();
      g.fillStyle = '#ffffff'; for (const dx of [-9, 0, 9]) { g.beginPath(); g.arc(x + dx, y - 7 + Math.abs(dx) * 0.3, 3.5, 0, TAU); g.fill(); }
    }
  },
  kanone(g, S) {     // Kanonengang: nachtblau mit goldenen Streifen und Zielscheiben
    g.fillStyle = '#1e2a5a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#d8a83a'; g.fillRect(0, 0, S, 6); g.fillRect(0, S / 2, S, 3);
    for (const [x, y] of [[S / 4, (3 * S) / 4], [(3 * S) / 4, S / 4 + 4]]) { for (const [r, c] of [[16, '#e8e0d0'], [11, '#c8283a'], [6, '#e8e0d0'], [2.5, '#c8283a']]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
  },
  dachboden(g, S) {  // Dachboden: senkrechte Holzbretter mit Astlöchern
    for (let i = 0; i < 4; i++) { g.fillStyle = ['#9a6a3e', '#8a5a32', '#a87444', '#946438'][i]; g.fillRect(i * S / 4, 0, S / 4, S); }
    g.fillStyle = 'rgba(40,20,10,0.5)'; for (let i = 1; i < 4; i++) g.fillRect(i * S / 4 - 1, 0, 2, S);
    g.fillStyle = '#5a3a1e'; for (const [x, y] of [[20, 40], [84, 96], [52, 12]]) { g.beginPath(); g.ellipse(x, y, 4, 6, 0, 0, TAU); g.fill(); }
  },
};

/** Bilder-Atlas (512 × 512, 4 × 4 Felder): Motive für Bilderrahmen und das große Zifferblatt. */
const BILDER = ['lotti', 'greta', 'pflaume', 'kruemel', 'baron', 'burg', 'canyon', 'pilz', 'uhr', 'piep', 'trampolin', 'stern', 'see', 'kaktus', 'berg', 'zielfahne'];
let bilderTex = null;
function bilderAtlas() {
  if (bilderTex) return bilderTex;
  bilderTex = canvasTex(512, 512, (g) => {
    BILDER.forEach((name, i) => {
      g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip();
      malBild(g, name);
      g.restore();
    });
  });
  return bilderTex;
}
function malBild(g, name) {
  const S = 128;
  const sky = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const girl = (x, shirt, hair, braid) => {
    circ(x, 52, 22, '#ffd8b8');
    g.fillStyle = hair; g.beginPath(); g.arc(x, 46, 24, Math.PI, TAU); g.fill();
    if (braid) { g.fillRect(x - 28, 44, 8, 34); g.fillRect(x + 20, 44, 8, 34); } else { g.fillRect(x - 24, 44, 10, 20); g.fillRect(x + 14, 44, 10, 20); }
    circ(x - 8, 54, 3, '#2a1a1a'); circ(x + 8, 54, 3, '#2a1a1a');
    g.strokeStyle = '#c84a4a'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, 60, 7, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = shirt; g.beginPath(); g.moveTo(x - 26, 128); g.lineTo(x - 18, 80); g.lineTo(x + 18, 80); g.lineTo(x + 26, 128); g.fill();
  };
  switch (name) {
    case 'lotti': sky('#ffe0ec', '#fff4f8'); girl(64, '#ff5a6a', '#e8b040', true); circ(92, 22, 8, '#ff5a6a'); break;
    case 'greta': sky('#e0ecff', '#f4f8ff'); girl(64, '#4a7aff', '#8a4a2a', false); circ(36, 22, 8, '#4a7aff'); break;
    case 'pflaume': sky('#ffd6ea', '#fff0f6'); g.fillStyle = '#f2e6f0'; g.beginPath(); g.ellipse(48, 40, 10, 28, -0.2, 0, TAU); g.ellipse(80, 40, 10, 28, 0.2, 0, TAU); g.fill(); circ(64, 80, 32, '#f2e6f0'); circ(52, 74, 4, '#3a2a3a'); circ(76, 74, 4, '#3a2a3a'); circ(64, 86, 4, '#ff8fb0'); break;
    case 'kruemel': sky('#e8f8d8', '#fbfff4'); g.fillStyle = '#c8a07a'; g.beginPath(); g.ellipse(50, 42, 8, 24, -0.25, 0, TAU); g.ellipse(78, 42, 8, 24, 0.25, 0, TAU); g.fill(); circ(64, 82, 28, '#c8a07a'); circ(54, 78, 4, '#2a1a1a'); circ(74, 78, 4, '#2a1a1a'); circ(64, 90, 4, '#7a4a3a'); g.fillStyle = '#2a6ad0'; g.fillRect(40, 50, 48, 8); break;
    case 'baron': g.fillStyle = '#f0dcae'; g.fillRect(0, 0, S, S); g.fillStyle = '#6a3a1a'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('GESUCHT', 64, 20); circ(64, 72, 30, '#8a5a3a'); circ(42, 48, 10, '#8a5a3a'); circ(86, 48, 10, '#8a5a3a'); circ(64, 82, 14, '#c89a6a'); circ(54, 66, 4, '#1a1010'); g.strokeStyle = '#d8b040'; g.lineWidth = 2; g.beginPath(); g.arc(76, 66, 7, 0, TAU); g.stroke(); g.fillStyle = '#1a1a1a'; g.fillRect(44, 26, 40, 14); g.fillRect(36, 38, 56, 5); g.font = 'bold 12px sans-serif'; g.fillStyle = '#6a3a1a'; g.fillText('Baron Brummbär', 64, 120); break;
    case 'burg': sky('#3a0808', '#c8401a'); g.fillStyle = '#2a1a1e'; g.fillRect(24, 50, 80, 60); for (let i = 0; i < 5; i++) g.fillRect(24 + i * 18, 40, 10, 12); g.fillRect(14, 30, 18, 80); g.fillRect(96, 30, 18, 80); g.fillStyle = '#ff8a20'; g.fillRect(56, 76, 16, 20); g.fillStyle = '#ff6a10'; g.fillRect(0, 110, S, 18); break;
    case 'canyon': sky('#7a4ab0', '#ff9a4a'); g.fillStyle = '#c8562e'; g.beginPath(); g.moveTo(0, 128); g.lineTo(0, 60); g.lineTo(30, 60); g.lineTo(34, 128); g.fill(); g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 50); g.lineTo(90, 50); g.lineTo(84, 128); g.fill(); g.fillStyle = '#e07a3e'; g.fillRect(44, 88, 34, 40); circ(64, 40, 12, '#fff0a0'); break;
    case 'pilz': sky('#cfeccf', '#f0fff0'); g.fillStyle = '#f4ead8'; g.fillRect(52, 70, 24, 40); g.fillStyle = '#e83a3a'; g.beginPath(); g.ellipse(64, 70, 40, 30, 0, Math.PI, TAU); g.fill(); circ(48, 56, 7, '#fff'); circ(70, 50, 8, '#fff'); circ(88, 62, 6, '#fff'); circ(58, 90, 3, '#2a1a1a'); circ(70, 90, 3, '#2a1a1a'); break;
    case 'uhr': { circ(64, 64, 62, '#c89a40'); circ(64, 64, 55, '#fbf4e2'); g.fillStyle = '#3a2a2a'; g.font = 'bold 15px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 1; i <= 10; i++) { const a = (i / 10) * TAU - Math.PI / 2; g.fillText(String(i), 64 + Math.cos(a) * 43, 64 + Math.sin(a) * 43); } for (let i = 0; i < 50; i++) { const a = (i / 50) * TAU; g.fillRect(64 + Math.cos(a) * 52 - 1, 64 + Math.sin(a) * 52 - 1, 2, 2); } g.fillStyle = '#c8283a'; g.font = 'bold 9px sans-serif'; g.fillText('SEKUNDEN', 64, 84); break; }
    case 'piep': sky('#0a1440', '#1a2a6a'); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#2f78ff' : '#ff3d55'; g.fillRect(14 + i * 26, 70 - i * 12, 22, 22); } g.fillStyle = '#ffffff'; for (let i = 0; i < 12; i++) g.fillRect((i * 37) % 120 + 4, (i * 23) % 50 + 4, 2, 2); break;
    case 'trampolin': sky('#8ad0ff', '#e8f8ff'); g.fillStyle = '#5ac85a'; g.fillRect(0, 100, S, 28); g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(64, 96, 34, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd23d'; g.beginPath(); g.ellipse(64, 92, 28, 6, 0, 0, TAU); g.fill(); circ(64, 40, 12, '#ffd8b8'); break;
    case 'stern': sky('#2a1a5a', '#5a3aa0'); g.fillStyle = '#5adf6a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 20 : 46; g.lineTo(64 + Math.cos(a) * rr, 68 + Math.sin(a) * rr); } g.fill(); circ(56, 66, 4, '#1a3a1a'); circ(72, 66, 4, '#1a3a1a'); break;
    case 'see': sky('#ffd8a8', '#ffb8c8'); circ(64, 70, 22, '#ff9a5a'); g.fillStyle = '#3a8ad8'; g.fillRect(0, 74, S, 54); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(40, 86); g.lineTo(76, 86); g.lineTo(70, 96); g.lineTo(46, 96); g.fill(); g.beginPath(); g.moveTo(58, 84); g.lineTo(58, 56); g.lineTo(74, 82); g.fill(); break;
    case 'kaktus': sky('#ffe8b8', '#fff6e0'); g.fillStyle = '#c86a3a'; g.fillRect(44, 96, 40, 30); g.fillStyle = '#4fae5a'; g.fillRect(56, 34, 16, 64); g.fillRect(36, 56, 12, 26); g.fillRect(36, 48, 6, 14); g.fillRect(80, 46, 12, 24); g.fillRect(86, 38, 6, 12); circ(64, 30, 7, '#ff6a8a'); break;
    case 'berg': sky('#8ac8ff', '#e0f4ff'); g.fillStyle = '#7a6aa8'; g.beginPath(); g.moveTo(10, 120); g.lineTo(60, 30); g.lineTo(118, 120); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(46, 56); g.lineTo(60, 30); g.lineTo(75, 57); g.lineTo(66, 52); g.lineTo(58, 60); g.fill(); g.fillStyle = '#5ac85a'; g.fillRect(0, 110, S, 18); break;
    case 'zielfahne': sky('#9ad8ff', '#e8f8ff'); g.fillStyle = '#5ac85a'; g.fillRect(0, 108, S, 20); g.fillStyle = '#e8e0d0'; g.fillRect(60, 14, 6, 96); g.fillStyle = '#3ac84a'; g.beginPath(); g.moveTo(66, 18); g.lineTo(104, 30); g.lineTo(66, 44); g.fill(); circ(63, 12, 6, '#ffd23d'); break;
    default: g.fillStyle = '#888'; g.fillRect(0, 0, S, S);
  }
}
const bildUV = (name) => { const i = Math.max(0, BILDER.indexOf(name)); const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 4; return [u0 + 0.004, v1 - 0.25 + 0.004, u0 + 0.25 - 0.004, v1 - 0.004]; };

/** Fläche mit UV in eine Sammel-Liste (pos/uv), face wie quadG. */
function uvQuad(acc, x, y, z, w, h, face, uv) {
  let c;
  if (face === '+z') c = [[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]];
  else if (face === '+x') c = [[x, y, z + w / 2], [x, y, z - w / 2], [x, y + h, z - w / 2], [x, y + h, z + w / 2]];
  else if (face === '-x') c = [[x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2]];
  else c = [[x - w / 2, y, z + h / 2], [x + w / 2, y, z + h / 2], [x + w / 2, y, z - h / 2], [x - w / 2, y, z - h / 2]];
  const [u0, v0, u1, v1] = uv;
  const t = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  for (const k of [0, 1, 2, 0, 2, 3]) { acc.pos.push(...c[k]); acc.uv.push(...t[k]); }
}

/** Fußböden (Vertexfarben, je Raum ein Stil): Rechteck [x0, x1, zA, zB] auf Höhe y. */
function bodenG(style, x0, x1, za, zb, y, rnd, color = 0xd8a868) {
  const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
  const pos = [], col = [];
  const cell = (ax, bx, az, bz, c) => { const q = [[ax, az], [ax, bz], [bx, bz], [bx, az]]; for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k][0], y + 0.008, q[k][1]); col.push(c[0], c[1], c[2]); } };
  const grid = (sx, sz, fn) => { for (let zz = z0, j = 0; zz < z1 - 1e-4; zz += sz, j++) for (let xx = x0, i = 0; xx < x1 - 1e-4; xx += sx, i++) cell(xx, Math.min(x1, xx + sx), zz, Math.min(z1, zz + sz), fn(i, j)); };
  const S = {
    puzzle: () => { const P = [0xff7a8a, 0x7ab8ff, 0x8ad87a, 0xffd25a].map(L); grid(1, 1, (i, j) => P[(i + j * 3) % 4]); },
    sand: () => { const a = L(0xf3dc96), b = L(0xe2c47e); grid(0.5, 0.5, () => mixc(a, b, rnd.frac(), [0, 0, 0])); },
    parkett: () => { const a = L(0x8a4a26), b = L(0x6a361a), c2 = L(0x9a5a30); grid(0.35, 1.4, (i, j) => [a, b, c2][(i + (j % 2) * 2) % 3]); },
    kacheln: () => { const a = L(0xf2f0e8), b = L(0x2a2a34); grid(1, 1, (i, j) => ((i + j) & 1 ? b : a)); },
    holz: () => { const a = L(0xc89058), b = L(0xb07a44), c2 = L(0xd8a068); grid(0.3, 2.2, (i, j) => [a, b, c2][(i * 7 + j * 3) % 3]); },
    metall: () => { const a = L(0x8a96a8), b = L(0x7a8698); grid(2, 2, (i, j) => ((i + j) & 1 ? b : a)); },
    terrakotta: () => { const a = L(0xd07a4a), b = L(0xb8643a), c2 = L(0xe08a5a); grid(1, 1, (i, j) => [a, b, c2][(i * 5 + j * 2) % 3]); },
    stein: () => { const a = L(0x9a8ea0), b = L(0x8a7e92); grid(1.2, 0.9, (i, j) => ((i + j) & 1 ? b : a)); },
    teppich: () => { const a = L(0x2a8a6a), b = L(0x247a5c); grid(1, 1, (i, j) => ((i + j) & 1 ? b : a)); },
    uni: () => { const a = L(color), b = [a[0] * 0.92, a[1] * 0.92, a[2] * 0.92]; grid(1, 1, (i, j) => ((i + j) & 1 ? b : a)); },
    laeufer: () => { const a = L(0xa8182a), b = L(0xd8a83a); grid((x1 - x0) / 7, 1, (i) => (i === 0 || i === 6 ? b : a)); },
  };
  (S[style] ?? S.holz)();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Möbel und Requisiten (lokal: Fußpunkt 0, Vorderseite +z), je Art eine Liste von Teilen; s = Kollisionsquader. */
const HAUSRAT = {
  kommode(o) { const c = o.color ?? 0x8a5a3a; return { p: [blk(1.6, 0.9, 0.6, 0, 0, 0, c), blk(1.66, 0.06, 0.66, 0, 0.9, 0, 0xc89a6a), ...[0.25, 0.6].map((y) => blk(1.4, 0.04, 0.02, 0, y, 0.31, 0x5a3a22)), sph(0.05, -0.4, 0.45, 0.33, 0xffc21a), sph(0.05, 0.4, 0.45, 0.33, 0xffc21a)], s: [[-0.8, 0, -0.3, 0.8, 0.96, 0.3]] }; },
  pflanze(o) { const S = o.size ?? 1; return { p: [cyl(0.24 * S, 0.17 * S, 0.45 * S, 0, 0, 0, o.pot ?? 0xd8784a, 8), sph(0.36 * S, 0, 0.8 * S, 0, 0x4fb84a, { ws: 7, hs: 5 }), sph(0.26 * S, -0.2 * S, 0.62 * S, 0.12 * S, 0x3fa03c, { ws: 7, hs: 5 }), sph(0.24 * S, 0.22 * S, 1.02 * S, -0.06 * S, 0x5ac85a, { ws: 7, hs: 5 })], s: [[-0.24 * S, 0, -0.24 * S, 0.24 * S, 0.45 * S, 0.24 * S]] }; },
  standuhr() { return { p: [blk(0.7, 2.3, 0.45, 0, 0, 0, 0x6a3a1a), blk(0.8, 0.2, 0.5, 0, 2.3, 0, 0x8a4a22), blk(0.5, 1.0, 0.04, 0, 0.5, 0.23, 0x3a2010), cyl(0.07, 0.07, 0.02, 0, 0.7, 0.25, 0xe8c050, 10, { rx: Math.PI / 2, center: true }), cyl(0.012, 0.012, 0.6, 0, 0.75, 0.24, 0xe8c050, 4)], s: [[-0.35, 0, -0.22, 0.35, 2.5, 0.22]] }; },
  lampe(o) { return { p: [cyl(0.2, 0.22, 0.05, 0, 0, 0, 0x5a4a3a, 8), cyl(0.03, 0.03, 1.6, 0, 0.05, 0, 0x5a4a3a, 5), cyl(0.18, 0.32, 0.36, 0, 1.6, 0, o.color ?? 0xfff0b0, 10)], s: [], glow: [cyl(0.16, 0.28, 0.06, 0, 1.6, 0, 0xffe8a0, 10)] }; },
  teddy() { return { p: [sph(0.32, 0, 0.32, 0, 0xb8783a, { sy: 1.05 }), sph(0.22, 0, 0.78, 0, 0xc8884a), sph(0.08, -0.15, 0.95, 0, 0xb8783a), sph(0.08, 0.15, 0.95, 0, 0xb8783a), sph(0.08, 0, 0.74, 0.19, 0xe8c8a0), sph(0.03, -0.07, 0.82, 0.19, 0x1a1010), sph(0.03, 0.07, 0.82, 0.19, 0x1a1010), sph(0.1, -0.28, 0.1, 0.12, 0xb8783a), sph(0.1, 0.28, 0.1, 0.12, 0xb8783a), cyl(0.1, 0.1, 0.06, 0, 0.58, 0.12, 0xff4a6a, 8)], s: [] }; },
  ball(o) { return { p: [sph(o.r ?? 0.3, 0, o.r ?? 0.3, 0, o.color ?? 0xff5a5a, { ws: 12, hs: 8 }), cyl((o.r ?? 0.3) * 1.01, (o.r ?? 0.3) * 1.01, 0.08, 0, (o.r ?? 0.3) - 0.04, 0, 0xffffff, 12, { open: true })], s: [] }; },
  kaktus(o) { const S = o.size ?? 1; return { p: [cyl(0.28 * S, 0.22 * S, 0.4 * S, 0, 0, 0, 0xc86a3a, 8), cyl(0.14 * S, 0.16 * S, 1.2 * S, 0, 0.35 * S, 0, 0x4fae5a, 8), cyl(0.08 * S, 0.08 * S, 0.4 * S, -0.22 * S, 0.8 * S, 0, 0x4fae5a, 6), cyl(0.08 * S, 0.08 * S, 0.35 * S, 0.22 * S, 0.95 * S, 0, 0x4fae5a, 6), sph(0.08 * S, 0, 1.6 * S, 0, 0xff6a8a)], s: [[-0.28 * S, 0, -0.28 * S, 0.28 * S, 1.5 * S, 0.28 * S]] }; },
  sandburg() { return { p: [blk(1.4, 0.5, 1.4, 0, 0, 0, 0xe8cc88), cyl(0.3, 0.34, 0.9, -0.5, 0, -0.5, 0xe2c47e, 8), cyl(0.3, 0.34, 0.9, 0.5, 0, -0.5, 0xe2c47e, 8), cone(0.32, 0.4, -0.5, 0.9, -0.5, 0xd8b06a, 8), cone(0.32, 0.4, 0.5, 0.9, -0.5, 0xd8b06a, 8), cyl(0.012, 0.012, 0.6, 0.5, 1.3, -0.5, 0x5a3a22, 4), blk(0.02, 0.18, 0.28, 0.5, 1.7, -0.36, 0xff4a4a)], s: [[-0.7, 0, -0.7, 0.7, 0.5, 0.7]] }; },
  buste(o) { return { p: [blk(0.7, 1.1, 0.7, 0, 0, 0, 0xe8e0d8, { top: 0xf4f0ea }), sph(0.28, 0, 1.5, 0, o.color ?? 0xd8d0c8), blk(0.5, 0.3, 0.3, 0, 1.1, 0, o.color ?? 0xd8d0c8)], s: [[-0.35, 0, -0.35, 0.35, 1.8, 0.35]] }; },
  kordel(o) { const L2 = o.len ?? 3; const p = []; for (const x of [-L2 / 2, L2 / 2]) { p.push(cyl(0.05, 0.05, 0.9, x, 0, 0, 0xd8a83a, 6), sph(0.08, x, 0.95, 0, 0xffc21a)); } p.push(cyl(0.035, 0.035, L2, 0, 0.8, 0, 0xb0182a, 6, { rz: Math.PI / 2, center: true })); return { p, s: [] }; },
  ofen() { return { p: [blk(1.6, 1.4, 1.0, 0, 0, 0, 0xc8a07a), blk(1.0, 0.6, 0.06, 0, 0.3, 0.5, 0x2a1a14), blk(1.7, 0.1, 1.1, 0, 1.4, 0, 0x9a7a5a), cyl(0.18, 0.2, 0.9, 0.5, 1.5, -0.2, 0x8a7a6a, 8)], s: [[-0.8, 0, -0.5, 0.8, 1.5, 0.5]], glow: [blk(0.9, 0.45, 0.04, 0, 0.36, 0.53, 0xff8a2a)] }; },
  mehl() { return { p: [sph(0.35, 0, 0.35, 0, 0xf0ead8, { sy: 1.2 }), cyl(0.14, 0.2, 0.2, 0, 0.72, 0, 0xe8e0c8, 8), blk(0.3, 0.2, 0.02, 0, 0.3, 0.33, 0x3a6ad0)], s: [] }; },
  brote() { return { p: [blk(1.2, 0.8, 0.6, 0, 0, 0, 0x9a6a3e), sph(0.18, -0.35, 0.92, 0, 0xc8843a, { sy: 0.7 }), sph(0.2, 0.05, 0.92, 0.05, 0xd89448, { sy: 0.6 }), sph(0.16, 0.4, 0.9, -0.05, 0xb8743a, { sy: 0.8 })], s: [[-0.6, 0, -0.3, 0.6, 0.85, 0.3]] }; },
  trommel() { return { p: [cyl(0.6, 0.6, 0.7, 0, 0, 0, 0xd8283a, 16), cyl(0.62, 0.62, 0.06, 0, 0, 0, 0xffc21a, 16), cyl(0.62, 0.62, 0.06, 0, 0.66, 0, 0xffc21a, 16), cyl(0.58, 0.58, 0.02, 0, 0.7, 0, 0xf4ece0, 16)], s: [[-0.6, 0, -0.6, 0.6, 0.72, 0.6]] }; },
  zahnrad(o) { const r = o.r ?? 1.2; const g = new THREE.CylinderGeometry(r, r, 0.25, 16).toNonIndexed(); colorize(g, fillc(L(0xd8a83a))); g.rotateX(Math.PI / 2); const p = [g]; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p.push(blk(0.35, 0.35, 0.22, Math.cos(a) * (r + 0.1), Math.sin(a) * (r + 0.1) - 0.175, 0, 0xc8982a)); } p.push(cyl(r * 0.3, r * 0.3, 0.3, 0, 0, 0, 0x5a6a80, 10, { rx: Math.PI / 2, center: true })); return { p, s: [] }; },
  rohre() { return { p: [cyl(0.15, 0.15, 4, 0, 0, 0, 0x8a9aa8, 8), cyl(0.2, 0.2, 0.15, 0, 1.4, 0, 0xc8983a, 8), cyl(0.2, 0.2, 0.15, 0, 2.8, 0, 0xc8983a, 8)], s: [] }; },
  pferd() { return { p: [sph(0.5, 0, 0.9, 0, 0xffffff, { sy: 0.7 }), sph(0.25, 0.55, 1.35, 0, 0xffffff), blk(0.15, 0.4, 0.05, 0.45, 1.3, 0.12, 0xff4a6a), ...[[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]].map(([x, z]) => cyl(0.06, 0.06, 0.6, x, 0.15, z, 0xffffff, 6)), blk(1.6, 0.08, 0.5, 0, 0.12, 0, 0xc8343a, { rz: 0.0 })], s: [] }; },
  tisch(o) { const w = o.w ?? 2.4, d = o.d ?? 1.2, h = o.h ?? 0.85; const p = [blk(w, 0.1, d, 0, h - 0.1, 0, o.color ?? 0xa0683a)]; for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) p.push(blk(0.1, h - 0.1, 0.1, x * (w / 2 - 0.12), 0, z * (d / 2 - 0.12), 0x7a4a2a)); if (o.cloth) p.push(blk(w * 0.8, 0.02, d + 0.06, 0, h, 0, o.cloth)); for (let i = 0; i < (o.plates ?? 0); i++) p.push(cyl(0.18, 0.16, 0.03, -w / 2 + 0.4 + i * ((w - 0.8) / Math.max(1, o.plates - 1)), h, 0, 0xffffff, 10)); return { p, s: [[-w / 2, 0, -d / 2, w / 2, h, d / 2]] }; },
  ruestung() { return { p: [blk(0.6, 0.3, 0.4, 0, 0, 0, 0x5a5468), cyl(0.12, 0.1, 0.9, -0.14, 0.3, 0, 0xa8b0c0, 8), cyl(0.12, 0.1, 0.9, 0.14, 0.3, 0, 0xa8b0c0, 8), cyl(0.3, 0.26, 0.8, 0, 1.15, 0, 0xb8c0d0, 10), sph(0.2, 0, 2.15, 0, 0xc8d0dc), blk(0.3, 0.06, 0.05, 0, 2.15, 0.18, 0x2a2a34), cyl(0.02, 0.02, 2.2, 0.42, 0.2, 0.1, 0x6a4a2a, 4), cone(0.08, 0.3, 0.42, 2.4, 0.1, 0xc8d0dc, 6)], s: [[-0.3, 0, -0.2, 0.3, 2.3, 0.2]] }; },
  kiste(o) { const S = o.size ?? 1; return { p: [blk(S, S * 0.8, S * 0.8, 0, 0, 0, o.color ?? 0x9a6a3e), blk(S * 1.02, 0.08, S * 0.82, 0, S * 0.55, 0, 0x6a4422)], s: [[-S / 2, 0, -S * 0.4, S / 2, S * 0.8, S * 0.4]] }; },
  truhe() { return { p: [blk(1.2, 0.6, 0.7, 0, 0, 0, 0x8a5a2e), cyl(0.35, 0.35, 1.2, 0, 0.6, 0, 0x9a6a36, 10, { rz: Math.PI / 2, center: true }), blk(0.12, 0.3, 0.06, 0, 0.45, 0.36, 0xffc21a)], s: [[-0.6, 0, -0.35, 0.6, 0.9, 0.35]] }; },
  riesenpilz(o) { const S = o.size ?? 1, c = o.color ?? 0xe83a3a; return { p: [cyl(0.22 * S, 0.3 * S, 1.3 * S, 0, 0, 0, 0xf4ead8, 10), sph(0.9 * S, 0, 1.3 * S, 0, c, { sy: 0.55, ws: 14, hs: 8 }), ...[[0.4, 0.3], [-0.5, 0.1], [0.05, -0.55], [-0.15, 0.5]].map(([x, z]) => sph(0.15 * S, x * S, 1.62 * S, z * S, 0xffffff, { sy: 0.5 }))], s: [[-0.3 * S, 0, -0.3 * S, 0.3 * S, 1.3 * S, 0.3 * S]] }; },
  stange(o) { const h = o.h ?? 3; const p = []; for (let k = 0; k < Math.ceil(h / 0.5); k++) p.push(cyl(0.08, 0.08, Math.min(0.5, h - k * 0.5), 0, k * 0.5, 0, k % 2 ? 0xffffff : 0xd8283a, 8)); p.push(sph(0.14, 0, h + 0.1, 0, 0xffc21a)); return { p, s: [] }; },
  eimer(o) { return { p: [cyl(0.26, 0.2, 0.42, 0, 0, 0, o.color ?? 0x3a8aff, 10), cyl(0.27, 0.27, 0.04, 0, 0.4, 0, 0xffffff, 10), cyl(0.04, 0.04, 0.7, 0.32, 0.05, 0, 0xffd23d, 5, { rz: 0.5 })], s: [] }; },
  spinne() { const p = []; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; p.push(cyl(0.008, 0.008, 1.6, 0, 0, 0, 0xe8e8f0, 3, { rz: Math.PI / 2, center: true })); p[p.length - 1].rotateY(a); } p.push(sph(0.08, 0, 0, 0, 0x2a2a2a)); return { p, s: [] }; },
};

/**
 * Raum des Prüfungs-Hauses (lang, nach −Z): Böden, Wände mit Täfelung und Tapete, Rückwand mit großer Raumuhr,
 * Türrahmen, Bilder, kleine Uhren und Möbel. r = { id, z0 (Raumanfang, Startseite), len, w: 14, h: 5, y: 1, paper,
 * wood, floors: [{ x0, x1, u0, u1 (m ab z0 nach −Z), style, y? }], pictures: [{ wall: 'l'|'r', u, y, w, h, motif }],
 * clocks: [{ wall: 'l'|'r', u, y, r }], props: [{ kind, x, u, y?, yaw, …opts }], pit: true (Schacht statt Boden) }.
 * shared = { pos, uv } (Bilder-Atlas), clocks (Liste für die Zeiger). Liefert die Uhren des Raums.
 */
export function hausRaum(level, r, shared, clocks) {
  const W = r.w ?? 14, H = r.h ?? 5, y = r.y ?? 1, z0 = r.z0, len = r.len;
  const x0 = -W / 2, x1 = W / 2, zEnd = z0 - len;
  const zA = (u) => z0 - u;
  const rnd = new Rnd(Math.floor(-z0) + 17);
  const parts = [], glow = [], flat = [];
  // Böden (Insel-Körper bauen die LEVEL-Segmente; hier nur die Oberflächen-Muster)
  for (const f of r.floors ?? []) flat.push(bodenG(f.style, f.x0 ?? x0, f.x1 ?? x1, zA(f.u0), zA(f.u1), f.y ?? y, rnd, f.color));
  // Wände: links, rechts, hinten (Kollision im Level: walls), Täfelung 1 m, Leiste, Tapete darüber
  const wood = r.wood ?? 0x8a5a3a;
  const wy0 = y - (r.pit ? 9 : 0.4);
  const zMid = (z0 + 1 + zEnd) / 2, zLen = len + 1;
  for (const sx of [-1, 1]) {
    parts.push(blk(0.5, H - wy0 + y, zLen, sx * (W / 2 + 0.25), wy0, zMid, 0x3a2a3e));
    parts.push(blk(0.1, 1.0, zLen, sx * (W / 2 - 0.05), y, zMid, wood));
    parts.push(blk(0.16, 0.08, zLen, sx * (W / 2 - 0.08), y + 1.0, zMid, 0xf0e0c8));
    parts.push(blk(0.18, 0.14, zLen, sx * (W / 2 - 0.09), y + H - 0.14, zMid, 0xf0e0c8));
    if (r.pit) parts.push(blk(0.06, y - wy0, zLen, sx * (W / 2 - 0.03), wy0, zMid, 0x2a1e30));
  }
  // Schacht: dunkler Grund tief unten (nur Optik; der Absturz endet an killY)
  if (r.pit) parts.push(blk(W, 0.1, zLen, 0, wy0 + 2.5, zMid, 0x0e0814));
  parts.push(blk(W + 1, H - wy0 + y, 0.5, 0, wy0, zEnd - 0.25, 0x3a2a3e));
  parts.push(blk(W, 1.0, 0.1, 0, y, zEnd + 0.05, wood));
  parts.push(blk(W, 0.08, 0.16, 0, y + 1.0, zEnd + 0.08, 0xf0e0c8));
  parts.push(blk(W, 0.14, 0.18, 0, y + H - 0.14, zEnd + 0.09, 0xf0e0c8));
  // Bilderrahmen (Geometrie), Bildflächen in den gemeinsamen Atlas
  for (const p of r.pictures ?? []) {
    const fw = p.w ?? 1.3, fh = p.h ?? 1.0, fy = y + (p.y ?? 2.1), fz = zA(p.u);
    if (p.wall === 'b') {
      parts.push(blk(fw + 0.18, fh + 0.18, 0.06, p.x ?? 0, fy - 0.09, zEnd + 0.03, p.frame ?? 0xc89a40));
      uvQuad(shared, p.x ?? 0, fy, zEnd + 0.08, fw, fh, '+z', bildUV(p.motif));
      continue;
    }
    const sx = p.wall === 'l' ? -1 : 1, wx = p.at ?? W / 2;          // at: Wandebene (z. B. Stellwand), sonst Raumwand
    parts.push(blk(0.06, fh + 0.18, fw + 0.18, sx * (wx - 0.03), fy - 0.09, fz, p.frame ?? 0xc89a40));
    uvQuad(shared, sx * (wx - 0.08), fy, fz, fw, fh, sx < 0 ? '+x' : '-x', bildUV(p.motif));
  }
  // kleine Wanduhren (Zifferblatt im Atlas, Zeiger als Instanzen)
  const out = [];
  for (const ck of r.clocks ?? []) {
    const rr = ck.r ?? 0.42, cy = y + (ck.y ?? 3.2), cz = zA(ck.u);
    const sx = ck.wall === 'l' ? -1 : 1;
    const rim = new THREE.CylinderGeometry(rr + 0.07, rr + 0.07, 0.08, 18).toNonIndexed();
    colorize(rim, fillc(L(0x8a5a2a)));
    rim.rotateZ(Math.PI / 2); rim.translate(sx * (W / 2 - 0.04), cy, cz);
    parts.push(rim);
    uvQuad(shared, sx * (W / 2 - 0.09), cy - rr, cz, rr * 2, rr * 2, sx < 0 ? '+x' : '-x', bildUV('uhr'));
    out.push({ x: sx * (W / 2 - 0.11), y: cy, z: cz, r: rr, face: sx < 0 ? '+x' : '-x', speed: ck.speed ?? 1, room: r.id });
  }
  // große Raumuhr über dem Ziel (zeigt die Raumzeit)
  {
    const R = 1.05, cy = y + H - 1.45;
    const rim = new THREE.CylinderGeometry(R + 0.14, R + 0.14, 0.16, 28).toNonIndexed();
    colorize(rim, fillc(L(0xc89a40)));
    rim.rotateX(Math.PI / 2); rim.translate(0, cy, zEnd + 0.1);
    parts.push(rim);
    uvQuad(shared, 0, cy - R, zEnd + 0.2, R * 2, R * 2, '+z', bildUV('uhr'));
    out.push({ x: 0, y: cy, z: zEnd + 0.24, r: R, face: '+z', big: true, room: r.id, index: r.index });
  }
  // Türrahmen hinten (Ausgang, über dem Ziel) und vorn (Eingang)
  for (const [zz, s] of [[zEnd + 0.02, 1]]) {
    for (const xx of [-1.3, 1.3]) parts.push(blk(0.26, 2.6, 0.2, xx, y, zz + s * 0.1, 0xf0e0c8));
    parts.push(blk(2.86, 0.3, 0.22, 0, y + 2.6, zz + s * 0.1, 0xf0e0c8));
    parts.push(blk(2.4, 2.6, 0.05, 0, y, zz + s * 0.03, 0x5a3a2a));
  }
  // Möbel und Requisiten
  for (const f of r.props ?? []) {
    const mk = HAUSRAT[f.kind];
    if (!mk) continue;
    const { p, s, glow: gl } = mk(f);
    const yaw = f.yaw ?? 0, fx = f.x ?? 0, fz = zA(f.u ?? 0), fy = f.y ?? y;
    for (const g of p) { g.rotateY(yaw); g.translate(fx, fy, fz); parts.push(g); }
    for (const g of gl ?? []) { g.rotateY(yaw); g.translate(fx, fy, fz); glow.push(g); }
    if (f.solid !== false) for (const b of s) {
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const xs = [b[0], b[3]].flatMap((px) => [b[2], b[5]].map((pz) => px * c + pz * sn));
      const zs = [b[0], b[3]].flatMap((px) => [b[2], b[5]].map((pz) => -px * sn + pz * c));
      level.world.add({ type: 'box', min: [fx + Math.min(...xs), fy + b[1], fz + Math.min(...zs)], max: [fx + Math.max(...xs), fy + b[4], fz + Math.max(...zs)], camIgnore: true, tag: `hausrat:${f.kind}` });
    }
  }
  // Wände als Kollision (Seiten, hinten, vorn hinter dem Start)
  level.world.add({ type: 'box', min: [x0 - 0.5, wy0, zEnd - 0.5], max: [x0, y + H + 6, z0 + 1], camIgnore: true, tag: 'hauswand' });
  level.world.add({ type: 'box', min: [x1, wy0, zEnd - 0.5], max: [x1 + 0.5, y + H + 6, z0 + 1], camIgnore: true, tag: 'hauswand' });
  level.world.add({ type: 'box', min: [x0 - 0.5, wy0, zEnd - 0.5], max: [x1 + 0.5, y + H + 6, zEnd], camIgnore: true, tag: 'hauswand' });
  // vorn (hinter dem Start; frontHole [hx0, hx1, hy0, hy1]: Öffnung, z. B. für ein Riesenprojektil)
  const fr = r.frontHole ? [[x0 - 0.5, r.frontHole[0], wy0, y + H + 6], [r.frontHole[1], x1 + 0.5, wy0, y + H + 6], [r.frontHole[0], r.frontHole[1], wy0, r.frontHole[2]], [r.frontHole[0], r.frontHole[1], r.frontHole[3], y + H + 6]]
    : [[x0 - 0.5, x1 + 0.5, wy0, y + H + 6]];
  for (const [ax, bx, ay, by] of fr) level.world.add({ type: 'box', min: [ax, ay, z0 + 1], max: [bx, by, z0 + 1.5], camIgnore: true, noWallSlide: true, tag: 'hauswand' });
  // dunkler Vorhang hinter und über der Rückwand (Farbe des Haus-Hintergrunds): verdeckt den nächsten Raum
  bakeParts(level, [quadG(0, y + H - 0.2, zEnd - 0.55, W + 1.2, 14, '+z', r.night ?? 0x1a1028)], { material: 'glow', castShadow: false });
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, flat, { castShadow: false });
  if (glow.length) bakeParts(level, glow, { material: 'glow', castShadow: false });
  // Tapete (eigene Textur je Raum) über der Täfelung an beiden Seiten und hinten
  if (level.view && TAPETEN[r.paper] && typeof document !== 'undefined') {
    const tex = canvasTex(128, 128, TAPETEN[r.paper], { repeat: true });
    const acc = { pos: [], uv: [] };
    const hh = H - 1.08 - 0.14;
    uvQuad(acc, 0, y + 1.08, zEnd + 0.012, W, hh, '+z', [0, 0, W, hh]);
    uvQuad(acc, x0 + 0.012, y + 1.08, zMid, zLen, hh, '+x', [0, 0, zLen, hh]);
    uvQuad(acc, x1 - 0.012, y + 1.08, zMid, zLen, hh, '-x', [0, 0, zLen, hh]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    m.receiveShadow = true;
    m.name = `tapete:${r.id}`;
    addObject(level, m);
  }
  clocks.push(...out);
  return out;
}

/**
 * Gemeinsames Bilder-Mesh (Atlas, ein Zeichenaufruf) und Uhrzeiger (Instanzen): kleine Uhren drehen sich (eine Runde
 * je 10 s), die große Raumuhr zeigt im laufenden Raum die Restzeit (Zeiger steht oben bei 0) und sonst 10.
 */
export function hausFertig(level, shared, clocks) {
  if (!level.view || typeof document === 'undefined') return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(shared.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(shared.uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: bilderAtlas(), roughness: 0.85 }));
  m.receiveShadow = true;
  m.name = 'bilder';
  addObject(level, m);
  const n = clocks.length * 2;
  const hg = new THREE.BoxGeometry(1, 1, 1);
  hg.translate(0, 0.5, 0);
  const hands = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.6 }), n);
  hands.name = 'uhrzeiger';
  hands.frustumCulled = false;
  const red = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ color: 0xe0283a }), clocks.filter((c) => c.big).length);
  red.name = 'raumuhr-zeiger';
  red.frustumCulled = false;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  let t = 0;
  const h = {};
  const st = { bigAngle: [] };
  addObject(level, hands, (dt) => {
    t += visDt(level, h, dt);
    const hs = level.house;
    let ri = 0;
    clocks.forEach((c, i) => {
      for (let k = 0; k < 2; k++) {
        let len = c.r * (k ? 0.55 : 0.85), ang;
        if (c.big && k === 0) {
          // Raumuhr: Sekundenzeiger zeigt die Restzeit (10 s = eine Runde, oben = 0)
          const active = hs && hs.room === c.index;
          const left = active ? hs.time : 10;
          ang = -((10 - left) / 10) * TAU;
          st.bigAngle[c.index] = ang;
          E.set(0, 0, ang); Q.setFromEuler(E);
          S.set(0.08, len, 0.03); P.set(c.x, c.y, c.z + 0.02);
          red.setMatrixAt(ri++, M.compose(P, Q, S));
          // Minutenzeiger der Raumuhr: Raumnummer (zeigt auf die Ziffer)
          ang = -((c.index + 1) / 10) * TAU;
          len = c.r * 0.5;
        } else ang = -(t * (c.speed ?? 1) * (k ? 0.08 : 1) + (k ? 1.3 : 0)) * TAU / (k ? 1 : 10);
        if (c.face === '+z') E.set(0, 0, ang); else E.set(c.face === '+x' ? -ang : ang, 0, 0);
        Q.setFromEuler(E);
        S.set(c.face === '+z' ? (k ? 0.07 : 0.045) : 0.02, len, c.face === '+z' ? 0.02 : (k ? 0.07 : 0.045));
        P.set(c.x, c.y, c.z);
        hands.setMatrixAt(i * 2 + k, M.compose(P, Q, S));
      }
    });
    hands.instanceMatrix.needsUpdate = true;
    red.instanceMatrix.needsUpdate = true;
  });
  addObject(level, red);
  return st;
}

/**
 * Schaukeln (Pendel-Plattformen über einem Schacht, 4-Haus Raum 7): Brett an zwei Seilen, schwingt entlang z.
 * list [{ pos: [x, y, z] (Aufhängung), rope: 4, w: 2.4, d: 1.6, amp: 0.55 (rad), period: 2.6, phase: 0 }]. Das Brett
 * trägt (Quader mit mover), Seile/Balken nur Darstellung (ein Mesh je Schaukel).
 */
export function schaukeln(level, list) {
  const out = [];
  for (const s of list) {
    const [px, py, pz] = s.pos;
    const R = s.rope ?? 4, W = s.w ?? 2.4, D = s.d ?? 1.6, amp = s.amp ?? 0.55, per = s.period ?? 2.6;
    const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: px, cz: pz };
    const st = { th: 0, x: px, y: py - R, z: pz };
    const pose = (t) => { const th = amp * Math.sin((t / per + (s.phase ?? 0)) * TAU); return { th, y: py - Math.cos(th) * R, z: pz + Math.sin(th) * R }; };
    const q0 = pose(0);
    st.th = q0.th; st.y = q0.y; st.z = q0.z;
    const shape = { type: 'box', min: [px - W / 2, q0.y - 0.3, q0.z - D / 2], max: [px + W / 2, q0.y, q0.z + D / 2], mover, tag: 'schaukel' };
    const id = level.world.add(shape);
    if (s.id) level.named.set(s.id, st);
    st.pivot = [px, py, pz]; st.rope = R; st.amp = amp; st.period = per; st.phase = s.phase ?? 0;
    level.onStep((dt, t) => {
      const q = pose(t);
      st.t = t;
      mover.dx = 0; mover.dy = q.y - st.y; mover.dz = q.z - st.z;
      mover.vx = 0; mover.vy = mover.dy / dt; mover.vz = mover.dz / dt;
      mover.cx = px; mover.cz = q.z;
      st.th = q.th; st.y = q.y; st.z = q.z;
      shape.min = [px - W / 2, q.y - 0.3, q.z - D / 2]; shape.max = [px + W / 2, q.y, q.z + D / 2];
      level.world.update(id);
    });
    if (level.view) {
      const P = [];
      P.push(blk(W, 0.3, D, 0, -0.3 - R, 0, 0xd85a3a, { top: 0xff8a5a }));
      P.push(blk(W + 0.1, 0.06, 0.12, 0, -R - 0.02, D / 2 - 0.06, 0xffc21a));
      P.push(blk(W + 0.1, 0.06, 0.12, 0, -R - 0.02, -D / 2 + 0.06, 0xffc21a));
      for (const sx of [-1, 1]) P.push(cyl(0.035, 0.035, R, sx * (W / 2 - 0.15), -R, 0, 0xe8d8b0, 5));
      const geo = merge(P);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
      mesh.castShadow = true;
      mesh.name = 'schaukel';
      mesh.position.set(px, py, pz);
      addObject(level, mesh, () => { mesh.rotation.x = -st.th; });
      // Querbalken oben (statisch)
      bakeParts(level, [blk(W + 1.2, 0.35, 0.35, px, py, pz, 0x7a4a2a), sph(0.12, px - W / 2 - 0.5, py + 0.17, pz, 0xffc21a), sph(0.12, px + W / 2 + 0.5, py + 0.17, pz, 0xffc21a)], { castShadow: false });
    }
    out.push(st);
  }
  return out;
}

/**
 * Wimpelketten quer durch einen Raum: list [{ z, y, x0: −7, x1: 7, sag: 0.7, n: 14, colors }]. Dreiecksfähnchen an
 * einer durchhängenden Schnur (beidseitig sichtbar), alles in einem statischen Mesh je 32-m-Abschnitt.
 */
export function wimpel(level, list) {
  const parts = [];
  for (const w of list) {
    const x0 = w.x0 ?? -7, x1 = w.x1 ?? 7, n = w.n ?? 14, sag = w.sag ?? 0.7;
    const cols = (w.colors ?? [0xff5a5a, 0xffd23d, 0x4aa8ff, 0x5ac85a, 0xc87aff]).map(L);
    const at = (k) => { const t = k / n; return [x0 + (x1 - x0) * t, w.y - sag * 4 * t * (1 - t)]; };
    const pos = [], col = [];
    for (let k = 0; k < n; k++) {
      const [ax, ay] = at(k + 0.1), [bx, by] = at(k + 0.9), [cx2, cy2] = at(k + 0.5);
      const tip = [cx2, cy2 - 0.55];
      const c = cols[k % cols.length];
      for (const tri of [[[ax, ay], [bx, by], tip], [[bx, by], [ax, ay], tip]]) for (const q of tri) { pos.push(q[0], q[1], w.z); col.push(c[0], c[1], c[2]); }
    }
    // Schnur
    for (let k = 0; k < n * 2; k++) {
      const [ax, ay] = at(k / 2), [bx, by] = at((k + 1) / 2);
      for (const q of [[ax, ay + 0.03], [bx, by + 0.03], [bx, by - 0.01], [ax, ay + 0.03], [bx, by - 0.01], [ax, ay - 0.01]]) { pos.push(q[0], q[1], w.z); col.push(0.75, 0.7, 0.6); }
      for (const q of [[bx, by + 0.03], [ax, ay + 0.03], [bx, by - 0.01], [bx, by - 0.01], [ax, ay + 0.03], [ax, ay - 0.01]]) { pos.push(q[0], q[1], w.z); col.push(0.75, 0.7, 0.6); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    parts.push(g);
  }
  bakeParts(level, parts, { castShadow: false });
}

/**
 * Ereignisse je Raum des Prüfungs-Hauses: on.play(i) beim Countdown-Start eines Raums (auch nach einem Neustart),
 * on.leave(i) beim Verlassen (Raumwechsel, Neustart). Liest level.house (Archetyp house).
 */
export function raumHaken(level, on) {
  let last = null;
  level.onStep(() => {
    const h = level.house;
    if (!h) return;
    const key = `${h.room}|${h.phase === 'play' ? 'play' : 'x'}`;
    if (key === last) return;
    const [pr, pp] = (last ?? '-1|x').split('|');
    last = key;
    if (pp === 'play' && (Number(pr) !== h.room || h.phase !== 'play')) on.leave?.(Number(pr), h.phase);
    if (h.phase === 'play') on.play?.(h.room);
  });
}
