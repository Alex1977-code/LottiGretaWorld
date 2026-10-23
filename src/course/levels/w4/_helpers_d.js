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
 * (Lavaschlot, Endgegner). Nur Darstellung.
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
    for (const e of level.entities) {
      if (!want.has(e.kind) || e.removed || !e.model?.root) continue;
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
  rings.forEach(([r0, r1], ri) => {
    const nSeg = [10, 18, 26, 34][ri];
    for (let i = 0; i < nSeg; i++) {
      const t0 = (i / nSeg) * TAU + ri * 0.2, t1 = ((i + 1) / nSeg) * TAU + ri * 0.2;
      const g = new THREE.RingGeometry(Math.max(0.01, r0 + 0.06), r1 - 0.06, 4, 1, t0 + 0.012, t1 - t0 - 0.024).toNonIndexed();
      g.rotateX(-Math.PI / 2);
      g.translate(cx, cy + 0.03, cz);
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
        hud?.banner?.(this.cfg.text ?? 'Baron Brummbär: „Mein Felsenkönig! Das bekommt ihr zurück!“', { hold: 2.8, size: 11, color: '#ffb0a0', y: 0.22 });
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
 * Baron-Szene anmelden: startet beim Sieg über den Endgegner (level.onBossDefeated, verkettet), ein Neustart vor dem
 * Sieg setzt sie zurück, das Kamera-Blickziel schwenkt zum Wagen. Liefert die Szene (info()).
 */
export function baronSzene(level, cfg) {
  const sc = new BaronSzeneLava(level, cfg);
  const prev = level.onBossDefeated;
  level.onBossDefeated = (b) => { prev?.(b); sc.start(); };
  const rt = level.runtime, respawn = rt.respawn.bind(rt);
  const arch = level.archetype;
  rt.respawn = (...a) => { respawn(...a); if (!arch?.won) sc.reset(); };
  level.onStep((dt) => sc.step(dt));
  if (level.view) {
    level.view.onFrame((dt) => sc.render(dt));
    if (arch?.camera) {
      const cam = arch.camera.bind(arch);
      let k = 0;
      arch.camera = (dt, player, world) => {
        const r = cam(dt, player, world);
        const want = sc.active && sc.state !== 'away' ? 0.6 : sc.state === 'away' && sc.t < 1.4 ? 0.45 : 0;
        k += (want - k) * Math.min(1, dt * 2.5);
        if (k > 0.01) {
          const rig = level.view.rig;
          rig.target.set(rig.target.x + (sc.pos.x - rig.target.x) * k, rig.target.y + (sc.pos.y + 1.5 - rig.target.y) * k, rig.target.z + (sc.pos.z - rig.target.z) * k);
          rig.distNow += (20 - rig.distNow) * k;
          rig.place(rig.cur, dt);
        }
        return r;
      };
    }
  }
  return sc;
}
