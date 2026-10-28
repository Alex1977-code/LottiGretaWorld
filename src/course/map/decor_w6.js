// Kulissen der Welt-6-Eingänge (Kurs-Karte „Wolkeninseln“, eigene Gestaltung), aufgerufen aus EntranceView.decorate():
//   pipehills    6-1        Bergland mit Glasröhren-Netz: Röhren steigen aus dem Boden in die Hügel, Bitcoins sausen
//                           hindurch; Stachelkugeln auf den Hängen, Warp-Box, Wolkenkanone mit kreisendem Münzhimmel
//   stonecircle  6-B        Steinkreis: Menhire mit leuchtenden Runen, zwei Steintore, Feuerschalen, Runenkreis am
//                           Boden; die Werfer-Brüder tänzeln als Gegnergruppe darin (Weltdaten roamers)
//   ghostbay     6-2        Geisterschiff-Bucht: schwankendes Geisterschiff mit zerfetzten Segeln, grün leuchtenden
//                           Bullaugen und Gespenster-Flagge, Kreisgeister kreisen darüber; halb versunkenes Wrack,
//                           treibende Fässer
//   fareast      6-3        Fernost-Halle (Fantasie): zweistöckige Halle mit roten Säulen, Schiebewänden, jadegrünen
//                           Dächern mit Goldspitzen, Papierlaternen, Pilz-Maske über der Tür; Gong schlägt jeden Takt
//                           der Kartenmusik (Schwingen, Lichtring); rotes Tor am Weg
//   junglelake   6-4        Dschungel mit lila Giftsee: Floß kreist auf dem See, Giftblasen steigen auf, Seerosen,
//                           Rankenschnapper am Ufer, Klettergitter, Brummer surren über dem Wasser
//   pipefort     6-A        kleine Festung: Mauern mit Zinnen, Ecktürme, 2 × 3 Glasröhren in den Wänden, Tor mit
//                           Fallgitter; der Schubser-Prinz stapft durch den Hof (Gegnergruppe, eigener Stellvertreter)
//   snowwind     6-5        Schnee-Wolkenberg: Pustewolke bläst Schneeflocken, zugefrorener Teich mit Schlittschuhen,
//                           Glotzfisch schaut aus dem Eisloch, Iglu; Windräder drehen sich im Takt (SkyLife, sky6.js)
//   skyfactory   6-6        Himmelsfabrik: Halle mit Sägezahndach, Schornsteinen mit Dampf, großen Zahnrädern an der
//                           Front (drehen gegenläufig), Förderband mit Kisten, Kanonenturm
//   throwhouse   6-Haus     Prüfungs-Haus: lila Haus mit goldenem Fragezeichen, Wurfmaschine wirft Bälle auf eine
//                           Zielscheibe (die wackelt bei Treffer), Ballkorb
//   minetower    6-7        Minen-Turm: hohes Fördergerüst mit drehendem Seilrad und Aufzugkorb, Schacht, Lore,
//                           Kristalle; eine Wuschel-Horde hüpft um den Fuß
//   tankroad     6-Panzer   Wolkenstraße: Panzerkolonne mit Baron-Flagge (Geschützturm schwenkt), Türme aus großen
//                           ?-Blöcken, Zündköpfe trippeln umher, Fahrbahnmarkierung
//   skycircus    6-C        Zirkuszelt auf der höchsten Insel: gestreiftes Zelt mit Wimpelketten, Spiegelfrucht auf
//                           einem Podest, Würfelblase-Geleebrocken hüpfen; Seilbahn (Weltdaten cableways)
// Registry-Modelle (models/kinds/*_w6.js und vorhandene) werden benutzt, sobald es sie gibt – mit Dreiecks-Obergrenze;
// sonst eigene sparsame Geometrie (gleiche Lage). Benutzte Modelle meldet state().decor.w6models.
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie, bewegte sind eigene Objekte (ev.updaters),
// gleichartige als Instanzen (ein Zeichenaufruf). Bewegte Objekte stehen schon beim Bau an ihrer Startlage (lod.js).

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { bakeModel } from './bake.js';
import { LowBuild as Build, place, tankGeo, turretGeo } from './desert.js';
import { modelTris } from './beach5.js';
import { beatNow6, gearGeo, mushroomGeo } from './sky6.js';
import { baronFlagTexture } from './props.js';
import { wavingFlag } from './decor_w2.js';

/** Kulisse für eine Welt-6-Art bauen; false = unbekannte Art. */
export function decorateW6(ev, kind, x, y, z) {
  switch (kind) {
    case 'pipehills': pipeHills(ev, x, y, z); return true;
    case 'stonecircle': stoneCircle(ev, x, y, z); return true;
    case 'ghostbay': ghostBay(ev, x, y, z); return true;
    case 'fareast': farEast(ev, x, y, z); return true;
    case 'junglelake': jungleLake(ev, x, y, z); return true;
    case 'pipefort': pipeFort(ev, x, y, z); return true;
    case 'snowwind': snowWind(ev, x, y, z); return true;
    case 'skyfactory': skyFactory(ev, x, y, z); return true;
    case 'throwhouse': throwHouse(ev, x, y, z); return true;
    case 'minetower': mineTower(ev, x, y, z); return true;
    case 'tankroad': tankRoad(ev, x, y, z); return true;
    case 'skycircus': skyCircus(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, fog: true, ...extra }); ev.own.push(m); return m; };
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// Registry-Modelle blicken nach +X, die Kulissen nach +Z (Kamera): yaw −π/2 dreht +X nach +Z
const FRONT = -Math.PI / 2;
/** Benutzte Registry-Modelle (für Tests: state().decor.w6models). */
export const W6_USED = new Set();

/** Registry-Modell als statische Kulisse einbacken (false, solange es fehlt oder zu schwer ist). */
function bake6(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true, maxTris = 6000, tile = undefined) {
  if (!hasModel(name) || modelTris(name, opts) > maxTris) return false;
  const add = (g, o) => ev.addStatic(g, { ...o, ...(cast ? {} : { castShadow: false }), ...(tile ? { tile } : {}) });
  const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state);
  if (ok) W6_USED.add(name);
  return ok;
}
/** Halber Grundriss (max. |x|, |z| um den Fußpunkt) eines Registry-Modells in m (gemerkt), null ohne Modell. */
const FOOT = new Map();
function footRadius(name, opts = {}) {
  const key = `${name}|${JSON.stringify(opts)}`;
  if (FOOT.has(key)) return FOOT.get(key);
  let r = null;
  if (hasModel(name)) {
    const m = getModel(name, opts);
    if (!m.placeholder) {
      m.root.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(m.root);
      if (!bb.isEmpty()) r = Math.max(Math.abs(bb.min.x), bb.max.x, Math.abs(bb.min.z), bb.max.z);
    }
    m.dispose?.();
  }
  FOOT.set(key, r);
  return r;
}
/** Registry-Modell als bewegtes Objekt; state = Objekt/String oder Funktion (dt, t) → state. null, wenn es fehlt. */
function live6(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true, maxTris = 5000) {
  if (!hasModel(name) || modelTris(name, opts) > maxTris) return null;
  const m = getModel(name, opts ?? {});
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
  ev.view.add(m.root);
  ev.own.push(m);
  ev.updaters.push((dt, t) => m.update(dt, typeof state === 'function' ? state(dt, t) : state));
  W6_USED.add(name);
  return m;
}
/** Instanz-Fläche (eigenes Material nach Vertexfarben), ohne Frustum-Culling (die Instanzen bewegen sich). */
function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.45, opts.extra ?? {}, opts.key ?? 'w6inst'), n);
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = `w6:${opts.name ?? 'instanzen'}`;
  ev.view.add(m);
  ev.own.push(m);
  return m;
}
function setInst(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}
/** Objekt nur zeichnen, wenn seine Hüllkugel im Bild und näher als far m ist (Instanz-Flächen ohne eigenes Culling). */
function cullByView(ev, obj, cx, cy, cz, r, far = 85) {
  const F = new THREE.Frustum(), M = new THREE.Matrix4(), S = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
  ev.updaters.push(() => {
    const cam = ev.view.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    obj.visible = cam.position.distanceTo(S.center) - r < far && F.intersectsSphere(S);
  });
}
/** Statische Geometrie (gecacht) an (x, y, z) einbacken. */
function addGeo(ev, key, make, x, y, z, yaw = 0, cast = true, material) {
  const tile = material === 'glow' ? 'w6:leuchten' : material === 'stone' ? 'w6:wasser' : undefined;
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), { castShadow: cast, material, ...(tile ? { tile } : {}) });
}
/** Eigenes bewegtes Mesh (Vertexfarben) an (x, y, z). */
function mover(ev, geo, x, y, z, name, shadow = true, material = null) {
  const m = new THREE.Mesh(geo, material ?? vcol(0.55, {}, 'w6decor'));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.name = `w6:${name}`;
  ev.view.add(m);
  return m;
}
/** Zustand für Tests (state().decor) ergänzen. */
function addInfo(ev, fn) {
  const prev = ev.liveInfo;
  ev.liveInfo = () => ({ ...(prev ? prev() : {}), ...fn() });
}
/** Durchscheinendes Glas (Material der Karte w6glass) einbacken. */
function glass(ev, geo) { ev.addStatic(geo, { material: 'w6glass', castShadow: false, tile: 'w6:glas' }); }
/** Leuchtendes (Material 'glow') einbacken. */
function glowStatic(ev, geo) { ev.addStatic(geo, { material: 'glow', castShadow: false, tile: 'w6:leuchten' }); }
/** Instanz-Flammen (unbeleuchtet), flackern über die Skalierung. spots = [[x, y, z, s], …]. */
function flames(ev, spots, name = 'flammen') {
  const geo = cached('w6m:flame', () => {
    const b = new Build();
    b.cone(0.16, 0.48, { v: (px, py) => mix(0xff5a1a, 0xffd23a, py + 0.5) }, { p: [0, 0.24, 0] }, 7);
    b.cone(0.1, 0.32, 0xfff6c0, { p: [0, 0.2, 0.06] }, 6);
    return b.geometry();
  });
  const m = instanced(ev, geo, spots.length, { name, material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  const put = (t) => {
    spots.forEach(([fx, fy, fz, s = 1], i) => {
      const k = 1 + Math.sin(t * 13 + i * 1.7) * 0.1 + Math.sin(t * 7.3 + i) * 0.07;
      setInst(m, i, fx, fy, fz, t * 0.5 + i, [s * (2 - k), s * k, s * (2 - k)]);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  put(0);
  ev.updaters.push((dt, t) => put(t));
  const c = spots.reduce((a, s) => [a[0] + s[0] / spots.length, a[1] + s[1] / spots.length, a[2] + s[2] / spots.length], [0, 0, 0]);
  cullByView(ev, m, c[0], c[1], c[2], 8);
  return m;
}
/** Glasröhre entlang Punkten (Weltkoordinaten): Glas + weiße Ringe + Goldkragen an den Enden. */
function glassPipe(ev, pts, r = 0.9, opt = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const len = curve.getLength();
  const tube = new THREE.TubeGeometry(curve, Math.max(12, Math.round(len * 2)), r, 12, false);
  const g = new THREE.BufferGeometry();
  const src = tube.index ? tube.toNonIndexed() : tube;
  g.setAttribute('position', src.attributes.position);
  g.setAttribute('normal', src.attributes.normal);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  const c0 = new THREE.Color(0xa8e4ff), c1 = new THREE.Color(0xffffff);
  for (let i = 0; i < n; i++) { const k = 0.3 + 0.7 * Math.max(0, g.attributes.normal.getY(i)); const c = c0.clone().lerp(c1, k * 0.5); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tube.dispose();
  glass(ev, g);
  const b = new Build();
  const ring = (u, color, t) => {
    const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    const e = new THREE.Euler().setFromQuaternion(q);
    b.torus(r + 0.04, t, color, { p: [p.x, p.y, p.z], r: [e.x, e.y, e.z] }, 4, 18);
  };
  const nR = Math.max(1, Math.round(len / (opt.ringStep ?? 2.6)));
  for (let i = 1; i < nR; i++) ring(i / nR, 0xffffff, 0.06);
  if (opt.collarStart !== false) ring(0.004, 0xffc83a, 0.14);
  if (opt.collarEnd) ring(0.996, 0xffc83a, 0.14);
  ev.addStatic(b.geometry(), { castShadow: false });
  return curve;
}
/** Bitcoin-Münze in Kartenqualität (Blick +Z): goldene Scheibe mit hellem „B“-Balken. */
function coinGeo() {
  return cached('w6m:coin', () => {
    const b = new Build();
    b.cyl(0.32, 0.32, 0.08, { v: (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.5 ? mix(0xffb81a, 0xfff07a, 0.5 + y) : 0xd8901a) }, { r: [Math.PI / 2, 0, 0] }, 14);
    b.box(0.08, 0.34, 0.1, 0xfff4b0, { p: [-0.05, 0, 0] }, 0);
    for (const yy of [-0.12, 0, 0.12]) b.box(0.18, 0.05, 0.1, 0xfff4b0, { p: [0.03, yy, 0] }, 0);
    return b.geometry();
  });
}
/** Stachelkugel (eigene Gestaltung): blaugraue Kugel mit weißen Stacheln, böse Augenschlitze. */
function spikeBallGeo(r = 0.9) {
  return cached(`w6m:spikeball:${r}`, () => {
    const b = new Build();
    b.sphere(r, { v: (x, y, z, nx, ny) => mix(0x4a5a7a, 0x8a9ab8, ny * 0.5 + 0.5) }, null, 12, 8);
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const P = ico.attributes.position, seen = new Set();
    for (let i = 0; i < P.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(P, i).normalize();
      const k = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      const e = new THREE.Euler().setFromQuaternion(q);
      b.cone(r * 0.22, r * 0.55, 0xf4f2fa, { p: [v.x * r * 1.15, v.y * r * 1.15, v.z * r * 1.15], r: [e.x, e.y, e.z] }, 6);
    }
    ico.dispose();
    for (const s of [-1, 1]) b.box(r * 0.32, r * 0.1, r * 0.08, 0x1a1a2a, { p: [s * r * 0.3, r * 0.15, r * 0.96], r: [0, 0, s * 0.3] }, 0);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ 6-1 Bergland mit Glasröhren

function pipeHills(ev, x, y, z) {
  // Röhren-Netz: aus dem Boden hinter dem Podest hinauf und in die Hügel (Osten, Nordosten), Schleife auf dem Hügel
  const c1 = glassPipe(ev, [[x, y, z], [x, y + 2.6, z], [x + 0.6, y + 4.4, z - 0.4], [x + 3.4, y + 5.8, z - 0.8], [x + 7, y + 6.2, z - 1.2], [x + 9.6, y + 6.3, z - 1.4]], 0.85, { collarEnd: true });
  const c2 = glassPipe(ev, [[x + 0.6, y + 4.4, z - 0.4], [x + 0.9, y + 6.4, z - 2.8], [x + 4, y + 8, z - 7], [x + 11, y + 7.6, z - 12.5], [x + 16.5, y + 5.4, z - 15]], 0.75, { collarStart: false, collarEnd: true });
  const c3 = glassPipe(ev, [[x + 11, y + 8.6, z + 13], [x + 14, y + 10.6, z + 9.5], [x + 18, y + 10.2, z + 6], [x + 21, y + 9.2, z + 9.5], [x + 18, y + 8.8, z + 15], [x + 13.5, y + 9.4, z + 16.4]], 0.7, { collarStart: true, collarEnd: true });
  // Röhrenfuß (weiß-goldener Sockel) und Kreuzung (Glaskugel)
  addGeo(ev, 'w6m:pipefoot', () => {
    const b = new Build();
    b.cyl(1.25, 1.4, 0.35, 0xfaf6ff, { p: [0, 0.17, 0] }, 16);
    b.torus(1.2, 0.1, 0xffc83a, { p: [0, 0.36, 0], r: [Math.PI / 2, 0, 0] }, 4, 24);
    return b.geometry();
  }, x, y, z);
  glass(ev, place(new Build().sphere(1.25, 0xc8f0ff, null, 14, 10).geometry(), x + 0.6, y + 4.4, z - 0.4));
  solidCyl(ev, x, z, 1.3, y, y + 4.5, 'roehre');
  // Bitcoins sausen durch die Röhren
  const paths = [[c1, 0.55, 0], [c1, 0.55, 0.5], [c2, 0.42, 0.2], [c2, 0.42, 0.7], [c3, 0.3, 0.1], [c3, 0.3, 0.45], [c3, 0.3, 0.8]];
  const coins = instanced(ev, coinGeo(), paths.length, { name: 'roehrenmuenzen', material: vcol(0.3, { emissive: 0x3a2400 }, 'w6coin') });
  const v = new THREE.Vector3();
  const putCoins = (t) => {
    paths.forEach(([c, sp, ph], i) => {
      const u = (t * sp * 0.25 + ph) % 1;
      c.getPointAt(u, v);
      setInst(coins, i, v.x, v.y - 0.3, v.z, t * 4 + i, 1.1);
    });
    coins.instanceMatrix.needsUpdate = true;
  };
  putCoins(0);
  ev.updaters.push((dt, t) => putCoins(t));
  cullByView(ev, coins, x + 8, y + 7, z - 2, 18);
  // Stachelkugeln auf den Hängen
  for (const [sx, sy, sz, r] of [[x + 13, y + 6.4, z + 2.6, 0.9], [x + 19.5, y + 8.4, z + 12.6, 0.8], [x + 15, y + 4.6, z - 17.6, 0.75]]) addGeo(ev, `w6m:spikeball:${r}`, () => spikeBallGeo(r).clone(), sx, sy + r, sz, sx);
  // Warp-Box (Registry) neben dem Röhrenfuß, sonst eigene Kiste mit Stern
  const wb = [x + 4.6, y, z + 1.6];
  if (!bake6(ev, 'warp_box', {}, wb, FRONT, 1, null, true, 4000)) {
    addGeo(ev, 'w6m:warpbox', () => {
      const b = new Build();
      b.box(1.2, 1.2, 1.2, { v: (px, py, pz, nx, ny) => mix(0x7a3ad8, 0xb47aff, ny * 0.5 + 0.5) }, { p: [0, 0.6, 0] }, 0.12);
      b.box(1.24, 0.12, 1.24, 0xffc83a, { p: [0, 1.15, 0] }, 0.03);
      b.sphere(0.28, 0xffe04a, { p: [0, 0.65, 0.62], s: [1, 1, 0.3] }, 8, 5);
      return b.geometry();
    }, wb[0], wb[1], wb[2]);
  }
  solidBox(ev, wb[0] - 0.65, y, wb[2] - 0.65, wb[0] + 0.65, y + 1.3, wb[2] + 0.65, 'warpbox');
  // Wolkenkanone auf dem Hügel, darüber kreisender Münzhimmel
  const cc = [x + 16.4, y + 8.9, z + 5];
  if (!bake6(ev, 'cloud_cannon', {}, cc, FRONT, 1.2, null, true, 4000)) {
    addGeo(ev, 'w6m:cloudcannon', () => {
      const b = new Build();
      b.sphere(1.0, { v: (px, py, pz, nx, ny) => mix(0xc8d6f2, 0xffffff, ny * 0.5 + 0.5) }, { p: [0, 0.6, 0], s: [1.3, 0.7, 1.3] }, 10, 6);
      b.cyl(0.42, 0.5, 1.4, 0x6a7a9a, { p: [0, 1.5, 0] }, 10, true);
      b.torus(0.46, 0.1, 0xffc83a, { p: [0, 2.2, 0], r: [Math.PI / 2, 0, 0] }, 4, 14);
      return b.geometry();
    }, cc[0], cc[1], cc[2]);
  }
  const NC = 10;
  const sky = instanced(ev, coinGeo(), NC, { name: 'muenzhimmel', material: vcol(0.3, { emissive: 0x3a2400 }, 'w6coin') });
  const putSky = (t) => {
    for (let i = 0; i < NC; i++) {
      const a = (i / NC) * TAU + t * 0.6;
      setInst(sky, i, cc[0] + Math.cos(a) * 3.2, cc[1] + 7 + Math.sin(t * 2 + i) * 0.3, cc[2] + Math.sin(a) * 3.2, t * 3 + i, 1.2);
    }
    sky.instanceMatrix.needsUpdate = true;
  };
  putSky(0);
  ev.updaters.push((dt, t) => putSky(t));
  cullByView(ev, sky, cc[0], cc[1] + 7, cc[2], 5);
  addInfo(ev, () => ({ w6models: [...W6_USED].sort() }));
  // Feuer-Schnappblume (Registry) am Hang
  live6(ev, 'feuer_schnappblume', {}, [x + 9.2, y + 5.6, z + 8], FRONT + 0.4, 0.9, (dt, t) => ({ anim: Math.sin(t * 0.8) > 0.6 ? 'aim' : 'idle', aim: -0.3 }), true, 5000);
}

// ------------------------------------------------------------------ 6-B Steinkreis

function stoneCircle(ev, x, y, z) {
  const R = ev.def.ring ?? 7.4;
  const ex = ev.def.exit ?? [x + R, y, z];
  const gapA = Math.atan2(ex[2] - z, ex[0] - x);   // Öffnung zum Ausgang (Brücke)
  const N = 12;
  const menhir = (k) => cached(`w6m:menhir:${k}`, () => {
    const b = new Build();
    const h = [3.0, 3.4, 2.7][k];
    b.box(1.0, h, 0.7, { v: (px, py, pz, nx, ny) => mix(0x8a82a0, 0xc8c2d8, (py + h / 2) / h * 0.6 + Math.max(0, ny) * 0.4) }, { p: [0, h / 2, 0] }, 0.18, 1);
    b.sphere(0.42, 0x6ab84a, { p: [0.15, h, 0.05], s: [1.3, 0.35, 1] }, 7, 4);
    return b.geometry();
  });
  const rune = cached('w6m:rune', () => {
    const b = new Build();
    b.box(0.08, 0.7, 0.04, 0x7ae8ff, { p: [0, 1.6, 0.37] }, 0);
    b.box(0.4, 0.08, 0.04, 0x7ae8ff, { p: [0, 1.75, 0.37], r: [0, 0, 0.5] }, 0);
    b.box(0.3, 0.08, 0.04, 0x7ae8ff, { p: [0, 1.35, 0.37], r: [0, 0, -0.5] }, 0);
    return b.geometry();
  });
  const placedStones = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    let d = Math.abs(((a - gapA + Math.PI * 3) % TAU) - Math.PI);
    if (d < 0.5) continue;
    const sx = x + Math.cos(a) * R, sz = z + Math.sin(a) * R;
    const yaw = Math.atan2(-(z - sz), x - sx) + Math.PI / 2;   // Vorderseite (+Z lokal) zur Mitte
    ev.addStatic(place(menhir(i % 3).clone(), sx, y, sz, yaw), { castShadow: true });
    glowStatic(ev, place(rune.clone(), sx, y, sz, yaw));
    solidCyl(ev, sx, sz, 0.6, y, y + 3.2, 'menhir');
    placedStones.push([sx, sz, a]);
    void d;
  }
  // Decksteine über zwei Paaren gegenüber der Öffnung (Steintore)
  for (const off of [Math.PI - 0.27, Math.PI + 0.27]) {
    const a0 = gapA + off - 0.26, a1 = gapA + off + 0.26;
    const p0 = [x + Math.cos(a0) * R, z + Math.sin(a0) * R], p1 = [x + Math.cos(a1) * R, z + Math.sin(a1) * R];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 1.2;
    const g = new Build().box(len, 0.6, 0.8, { v: (px, py, pz, nx, ny) => mix(0x8a82a0, 0xd0cae0, ny * 0.5 + 0.5) }, { p: [0, 3.5, 0] }, 0.15, 1).geometry();
    ev.addStatic(place(g, (p0[0] + p1[0]) / 2, y, (p0[1] + p1[1]) / 2, Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0])), { castShadow: true });
    for (const [px, pz] of [p0, p1]) {
      ev.addStatic(place(menhir(1).clone(), px, y, pz, Math.atan2(-(z - pz), x - px) + Math.PI / 2), { castShadow: true });
      solidCyl(ev, px, pz, 0.6, y, y + 3.8, 'menhir');
    }
  }
  // Runenkreis am Boden (flach, leuchtend) und Steinplatte in der Mitte
  addGeo(ev, 'w6m:runering', () => {
    const b = new Build();
    b.torus(5.4, 0.09, 0x7ae8ff, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.2] }, 3, 48);
    b.torus(5.75, 0.05, 0xb4a0ff, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.2] }, 3, 48);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; b.box(0.34, 0.02, 0.1, 0x9af0ff, { p: [Math.cos(a) * 5.57, 0.035, Math.sin(a) * 5.57], r: [0, -a + (i % 2 ? 0.6 : -0.6), 0] }, 0); }
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  // Feuerschalen an der Öffnung
  const fb = [];
  for (const s of [-1, 1]) {
    const a = gapA + s * 0.62;
    const bx = x + Math.cos(a) * (R + 0.2), bz = z + Math.sin(a) * (R + 0.2);
    addGeo(ev, 'w6m:brazier', () => {
      const b = new Build();
      b.cyl(0.14, 0.2, 1.1, 0x5a5468, { p: [0, 0.55, 0] }, 6);
      b.cyl(0.46, 0.28, 0.32, { v: (px, py) => mix(0x6a6278, 0xa8a2b8, py + 0.5) }, { p: [0, 1.24, 0] }, 10);
      return b.geometry();
    }, bx, y, bz);
    solidCyl(ev, bx, bz, 0.45, y, y + 1.5, 'feuerschale');
    fb.push([bx, y + 1.4, bz, 1.3]);
  }
  flames(ev, fb, 'steinkreis-flammen');
}

// ------------------------------------------------------------------ 6-2 Geisterschiff-Bucht

/** Gespenster-Flagge (Leinwand): weißes Gespenst mit freundlichem Gesicht auf Violett. */
function ghostFlagTexture() {
  return canvasTexture('w6:geisterflagge', 128, 80, (ctx, w, h) => {
    ctx.fillStyle = '#5a3a8a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f0ff';
    ctx.beginPath(); ctx.arc(64, 34, 22, Math.PI, 0); ctx.lineTo(86, 62);
    for (let i = 0; i < 4; i++) ctx.lineTo(86 - (i + 0.5) * 11, i % 2 ? 62 : 54);
    ctx.lineTo(42, 62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1e3a';
    ctx.beginPath(); ctx.arc(56, 34, 4, 0, TAU); ctx.arc(72, 34, 4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(64, 44, 5, 0, Math.PI); ctx.fill();
  });
}
/** Geisterschiff (Blick +X, Länge ≈ 10 m): Rumpf, Achterkastell, zwei Masten mit zerfetzten Segeln, Bullaugen. */
function ghostShipGeo() {
  return cached('w6m:ghostship', () => {
    const b = new Build();
    const wood = { v: (px, py, pz, nx, ny) => (Math.floor((py + 3) * 3.2) % 2 ? mix(0x4a3a5a, 0x5a4a6a, ny * 0.5 + 0.5) : mix(0x3a2e4a, 0x4e3e5e, ny * 0.5 + 0.5)) };
    b.box(8.4, 1.9, 3.0, wood, { p: [0, 0.35, 0] }, 0.3, 1);
    b.cone(1.5, 2.6, wood, { p: [5.4, 0.55, 0], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.8] }, 8);
    b.box(2.6, 1.6, 3.0, wood, { p: [-3.2, 1.9, 0] }, 0.2, 1);
    b.box(8.6, 0.12, 3.1, 0x6a5a7a, { p: [0.2, 1.3, 0] }, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) b.cyl(0.05, 0.05, 0.6, 0x7a6a8a, { p: [-3.6 + i, 1.6, s * 1.45] }, 4);
    for (const s of [-1, 1]) b.box(8.0, 0.08, 0.08, 0x7a6a8a, { p: [0.4, 1.9, s * 1.45] }, 0);
    // Masten und zerfetzte Segel
    for (const [mx, h] of [[0.8, 7.2], [3.4, 5.6]]) {
      b.cyl(0.13, 0.17, h, 0x5a4636, { p: [mx, 1.3 + h / 2, 0] }, 6);
      b.cyl(0.07, 0.07, 3.2, 0x5a4636, { p: [mx, 1.3 + h * 0.86, 0], r: [Math.PI / 2, 0, 0] }, 4);
      for (let k = 0; k < 3; k++) {
        const sy = 1.3 + h * (0.42 + k * 0.17);
        b.box(0.05, h * 0.15, 2.6 - k * 0.5, { v: (px, py, pz) => (Math.sin(pz * 9 + py * 7 + mx) > 0.7 ? 0x4a3a5a : 0xd8d0ec) }, { p: [mx + 0.12, sy, 0], r: [0.05 * (k - 1), 0, 0] }, 0);
      }
    }
    // Bugspriet, Laternenhalter
    b.cyl(0.06, 0.08, 3.2, 0x5a4636, { p: [7.2, 1.6, 0], r: [0, 0, -1.25] }, 5);
    b.cyl(0.04, 0.04, 1.4, 0x3a3a4a, { p: [-4.3, 3.2, 0] }, 4);
    return b.geometry();
  });
}
function ghostShipGlowGeo() {
  return cached('w6m:ghostshipglow', () => {
    const b = new Build();
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.sphere(0.2, 0x8affb4, { p: [-2 + i * 1.6, 0.6, s * 1.52], s: [1, 1, 0.35] }, 7, 4);
    b.box(0.5, 0.6, 0.5, 0xa8ffc8, { p: [-4.3, 3.9, 0] }, 0.05);
    b.box(1.6, 0.5, 0.06, 0x8affb4, { p: [-3.2, 2.0, 1.52] }, 0);
    return b.geometry();
  });
}
/** Kreisgeist in Kartenqualität (Blick +Z): runder, heller Körper mit Wellen-Saum, dunkle Augen, Ärmchen. */
function ghostGeo() {
  return cached('w6m:ghost', () => {
    const b = new Build();
    b.sphere(0.45, { v: (px, py, pz, nx, ny) => mix(0xd8d0f4, 0xffffff, ny * 0.5 + 0.5) }, { p: [0, 0.55, 0] }, 10, 7);
    b.cone(0.45, 0.5, 0xf4f0ff, { p: [0, 0.15, 0], r: [Math.PI, 0, 0] }, 10);
    for (const s of [-1, 1]) {
      b.sphere(0.07, 0x2a1e3a, { p: [s * 0.15, 0.62, 0.4], s: [0.8, 1.2, 0.5] }, 5, 4);
      b.sphere(0.13, 0xf4f0ff, { p: [s * 0.46, 0.42, 0.05] }, 6, 4);
    }
    b.sphere(0.05, 0xff8ab4, { p: [0, 0.48, 0.43], s: [1.6, 0.8, 0.5] }, 5, 3);
    return b.geometry();
  });
}

function ghostBay(ev, x, y, z) {
  // Geisterschiff (schwankt im Wasser)
  const ship = mover(ev, ghostShipGeo(), x, y, z, 'geisterschiff', true);
  const glow = new THREE.Mesh(ghostShipGlowGeo(), glowMat(ev, 0xffffff, { vertexColors: true }));
  ship.add(glow);
  const flag = new THREE.Mesh(cached('w6m:ghostflagplane', () => new THREE.PlaneGeometry(1.6, 1.0).translate(0.8, 0, 0)), new THREE.MeshStandardMaterial({ map: ghostFlagTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
  ev.own.push(flag.material);
  flag.position.set(0.8, 9.0, 0);
  ship.add(flag);
  const state = { roll: 0 };
  const sway = (dt, t) => {
    state.roll = Math.sin(t * 0.9) * 0.1;
    ship.rotation.set(state.roll, 0.15, Math.sin(t * 0.6) * 0.045, 'YXZ');
    ship.position.y = y - 0.25 + Math.sin(t * 1.2) * 0.08;
    flag.rotation.y = Math.sin(t * 2.2) * 0.25;
  };
  sway(0, 0);
  ev.updaters.push(sway);
  // halb versunkenes Wrack (statisch, schief)
  const wreck = ghostShipGeo().clone();
  wreck.scale(0.6, 0.6, 0.6);
  wreck.rotateZ(0.32); wreck.rotateX(-0.25);
  const [wx, wz] = ev.def.wreck ?? [x - 10, z - 10];
  ev.addStatic(place(wreck, wx, y - 1.0, wz, 0.9), { castShadow: true });
  // Kreisgeister über dem Schiff
  const NG = 7;
  const ghosts = instanced(ev, ghostGeo(), NG, { name: 'kreisgeister', material: vcol(0.6, { emissive: 0x2a2440 }, 'w6ghost') });
  const putGhosts = (t) => {
    for (let i = 0; i < NG; i++) {
      const a = (i / NG) * TAU + t * 0.5;
      const gx = x + Math.cos(a) * 4.2, gz = z + Math.sin(a) * 2.6;
      setInst(ghosts, i, gx, y + 6.4 + Math.sin(t * 1.8 + i) * 0.35, gz, -a, 1 + 0.06 * Math.sin(t * 3 + i));
    }
    ghosts.instanceMatrix.needsUpdate = true;
  };
  putGhosts(0);
  ev.updaters.push((dt, t) => putGhosts(t));
  cullByView(ev, ghosts, x, y + 6.4, z, 6);
  // treibende Fässer
  const barrel = cached('w6m:floatbarrel', () => new Build().cyl(0.4, 0.4, 1.0, { v: (px, py) => (Math.abs(py) > 0.36 || Math.abs(py) < 0.05 ? 0x5a5a6a : 0x9a6a42) }, { r: [0, 0, Math.PI / 2] }, 10).geometry());
  const NB = 3;
  const bar = instanced(ev, barrel, NB, { name: 'faesser', shadow: false });
  const spots = [[x + 9, z + 4.5], [x - 9, z - 3], [x + 11, z - 9]];
  const putBar = (t) => {
    spots.forEach(([bx, bz], i) => setInst(bar, i, bx + Math.sin(t * 0.3 + i) * 0.6, y + 0.05 + Math.sin(t * 1.4 + i * 2) * 0.06, bz, t * 0.1 + i, 1, Math.sin(t + i) * 0.1));
    bar.instanceMatrix.needsUpdate = true;
  };
  putBar(0);
  ev.updaters.push((dt, t) => putBar(t));
  addInfo(ev, () => ({ ship: { roll: +state.roll.toFixed(3), ghosts: NG } }));
}

// ------------------------------------------------------------------ 6-3 Fernost-Halle

function farEast(ev, x, y, z) {
  const RED = 0xe0402a, JADE = 0x2aa89a, JADE2 = 0x6ad8c4, GOLD = 0xffc83a, CREAM = 0xfff0dc;
  addGeo(ev, 'w6m:hall', () => {
    const b = new Build();
    // Sockel mit Stufen
    b.box(15, 0.6, 10.5, { v: (px, py, pz, nx, ny) => mix(0xb8b0c4, 0xe8e2f0, ny * 0.5 + 0.5) }, { p: [0, 0.3, 0] }, 0.08);
    b.box(6, 0.3, 1.2, 0xe8e2f0, { p: [0, 0.15, 5.6] }, 0.05);
    // Halle: Wände, Säulen, Schiebewände
    b.box(12, 3.6, 7, CREAM, { p: [0, 2.4, 0] }, 0.05);
    for (let i = 0; i < 6; i++) b.cyl(0.24, 0.26, 3.8, RED, { p: [-5.5 + i * 2.2, 2.5, 3.65] }, 10);
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue;
      const px = -4.4 + i * 2.2;
      b.box(1.8, 2.8, 0.08, 0xfff8ec, { p: [px, 2.2, 3.52] }, 0);
      for (let k = 1; k < 4; k++) b.box(1.8, 0.05, 0.1, 0x8a5a3a, { p: [px, 0.8 + k * 0.7, 3.56] }, 0);
      for (let k = -1; k <= 1; k++) b.box(0.05, 2.8, 0.1, 0x8a5a3a, { p: [px + k * 0.6, 2.2, 3.56] }, 0);
    }
    // Tür mit Goldnieten
    b.box(1.9, 2.8, 0.12, RED, { p: [0, 2.0, 3.54] }, 0.03);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) b.sphere(0.06, GOLD, { p: [-0.5 + c * 0.5, 1.0 + r * 0.6, 3.62] }, 5, 3);
    b.box(12.4, 0.35, 7.4, RED, { p: [0, 4.3, 0] }, 0.05);
    // unteres Dach (Walm) mit hochgebogenen Ecken
    b.cone(9.8, 2.6, { v: (px, py, pz, nx, ny) => mix(JADE, JADE2, py / 2.6 + 0.5) }, { p: [0, 5.75, 0], r: [0, Math.PI / 4, 0], s: [1.04, 1, 0.72] }, 4);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone(0.3, 1.3, GOLD, { p: [sx * 7.0, 4.95, sz * 4.85], r: [sz * -0.9, 0, sx * 0.9] }, 6);
    // oberes Stockwerk
    b.box(6.4, 2.2, 4.2, CREAM, { p: [0, 7.3, 0] }, 0.05);
    for (let i = 0; i < 4; i++) b.cyl(0.18, 0.2, 2.3, RED, { p: [-2.85 + i * 1.9, 7.3, 2.15] }, 8);
    b.box(6.8, 0.3, 4.6, RED, { p: [0, 8.5, 0] }, 0.04);
    b.cone(6.0, 2.4, { v: (px, py, pz, nx, ny) => mix(JADE, JADE2, py / 2.4 + 0.5) }, { p: [0, 9.8, 0], r: [0, Math.PI / 4, 0], s: [1.0, 1, 0.72] }, 4);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone(0.22, 1.0, GOLD, { p: [sx * 4.25, 9.0, sz * 3.0], r: [sz * -0.9, 0, sx * 0.9] }, 6);
    // Goldspitze
    b.sphere(0.35, GOLD, { p: [0, 11.1, 0] }, 10, 6);
    b.cone(0.18, 1.4, GOLD, { p: [0, 12.0, 0] }, 8);
    for (let k = 0; k < 3; k++) b.torus(0.3 - k * 0.06, 0.06, GOLD, { p: [0, 11.5 + k * 0.3, 0], r: [Math.PI / 2, 0, 0] }, 4, 12);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 6.3, y, z - 3.8, x + 6.3, y + 9, z + 3.8, 'halle');
  solidBox(ev, x - 7.5, y, z - 5.25, x + 7.5, y + 0.6, z + 5.25, 'sockel');
  // Pilz-Maske über der Tür
  const mask = mushroomGeo(1.1, 0);
  mask.rotateX(Math.PI / 2 - 0.25);
  ev.addStatic(place(mask, x, y + 4.15, z + 3.9), { castShadow: true });
  addGeo(ev, 'w6m:maskface', () => {
    const b = new Build();
    b.sphere(0.55, 0xfff2e0, { s: [1, 0.85, 0.4] }, 10, 6);
    for (const s of [-1, 1]) b.sphere(0.1, 0x2a1e2a, { p: [s * 0.2, 0.1, 0.2], s: [0.8, 1.2, 0.5] }, 5, 3);
    b.box(0.3, 0.05, 0.05, 0x2a1e2a, { p: [0, -0.18, 0.22] }, 0);
    return b.geometry();
  }, x, y + 3.55, z + 4.1);
  // Papierlaternen unter den Dachkanten (leuchtend)
  const lan = [];
  for (const lx of [-5.5, -2.2, 2.2, 5.5]) lan.push([x + lx, y + 3.75, z + 4.4]);
  for (const [lx, ly, lz] of lan) {
    glowStatic(ev, place(cached('w6m:paperlantern', () => {
      const b = new Build();
      b.sphere(0.32, 0xff6a4a, { s: [1, 1.25, 1] }, 10, 7);
      b.cyl(0.18, 0.18, 0.08, 0x2a1e1a, { p: [0, 0.4, 0] }, 8);
      b.cyl(0.18, 0.18, 0.08, 0x2a1e1a, { p: [0, -0.4, 0] }, 8);
      b.cone(0.06, 0.3, 0xffc83a, { p: [0, -0.6, 0], r: [Math.PI, 0, 0] }, 5);
      return b.geometry();
    }).clone(), lx, ly, lz));
  }
  // rotes Tor am Weg (eigene Fantasie-Form) – Pfosten links und rechts des Wegs
  const gx = x + 9.5, gz = z + 18.4;
  addGeo(ev, 'w6m:redgate', () => {
    const b = new Build();
    for (const s of [-1, 1]) { b.cyl(0.24, 0.28, 4.4, RED, { p: [s * 2.4, 2.2, 0] }, 10); b.cyl(0.36, 0.36, 0.3, 0x2a2a2a, { p: [s * 2.4, 0.15, 0] }, 10); }
    b.box(6.4, 0.34, 0.5, 0x2a2a2a, { p: [0, 4.55, 0] }, 0.05);
    b.box(7.2, 0.3, 0.6, RED, { p: [0, 4.95, 0] }, 0.05);
    for (const s of [-1, 1]) b.cone(0.18, 0.7, RED, { p: [s * 3.75, 5.15, 0], r: [0, 0, s * -1.2] }, 6);
    b.box(5.0, 0.22, 0.32, RED, { p: [0, 3.9, 0] }, 0.03);
    b.box(0.9, 0.6, 0.1, GOLD, { p: [0, 4.3, 0.2] }, 0.02);
    return b.geometry();
  }, gx, y, gz, 0.4);
  for (const s of [-1, 1]) solidCyl(ev, gx + Math.cos(0.4) * s * 2.4, gz - Math.sin(0.4) * s * 2.4, 0.32, y, y + 4.4, 'tor');
  // Gong im Gestell: schwingt bei jedem Taktanfang (alle 4 Zählzeiten), heller Ring breitet sich aus
  const gpx = x + 8.6, gpz = z + 2.4;
  addGeo(ev, 'w6m:gongframe', () => {
    const b = new Build();
    for (const s of [-1, 1]) b.box(0.26, 3.2, 0.26, RED, { p: [s * 1.3, 1.6, 0] }, 0.04);
    b.box(3.2, 0.26, 0.3, RED, { p: [0, 3.2, 0] }, 0.04);
    for (const s of [-1, 1]) b.cone(0.14, 0.4, GOLD, { p: [s * 1.65, 3.3, 0], r: [0, 0, s * -1.3] }, 5);
    return b.geometry();
  }, gpx, y, gpz);
  solidBox(ev, gpx - 1.5, y, gpz - 0.3, gpx + 1.5, y + 3.3, gpz + 0.3, 'gong');
  const gong = mover(ev, cached('w6m:gong', () => {
    const b = new Build();
    b.cyl(0.85, 0.85, 0.1, { v: (px, py, pz, nx, ny, nz) => mix(0xd89a1a, 0xffe07a, Math.abs(nz) * 0.4 + Math.hypot(px, py) * 0.6) }, { r: [Math.PI / 2, 0, 0] }, 24);
    b.torus(0.3, 0.05, 0xffe9a0, { p: [0, 0, 0.06] }, 3, 16);
    for (const s of [-1, 1]) b.cyl(0.02, 0.02, 0.5, 0x3a2a1a, { p: [s * 0.5, 0.9, 0] }, 3);
    return b.geometry();
  }), gpx, y + 2.05, gpz, 'gong', true, vcol(0.25, { metalness: 0.35, emissive: 0x2a1800 }, 'w6gong'));
  const ringMat = glowMat(ev, 0xffe9a0, { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(cached('w6m:gongring', () => new THREE.RingGeometry(0.9, 1.05, 32)), ringMat);
  ring.position.set(gpx, y + 2.05, gpz + 0.1);
  ev.view.add(ring);
  const st = { strikes: 0, bar: -1, beat: 0, source: 'zeit', theme: null };
  const putGong = (dt, t) => {
    const bt = beatNow6(t);
    const bar = Math.floor(bt.beat / 4), ph = bt.beat - bar * 4;   // Zählzeiten seit dem Taktanfang
    if (bar !== st.bar) { if (st.bar >= 0 && bar > st.bar) st.strikes += bar - st.bar; st.bar = bar; }   // verpasste Takte nachzählen
    st.beat = +bt.beat.toFixed(3); st.source = bt.source; st.theme = bt.theme;
    const k = Math.exp(-ph * 1.6);
    gong.rotation.set(Math.sin(ph * 9) * 0.22 * k, 0, 0);
    gong.scale.setScalar(1 + 0.06 * k);
    ringMat.opacity = 0.85 * Math.max(0, 1 - ph * 0.7);
    ring.scale.setScalar(1 + ph * 2.2);
  };
  putGong(0, 0);
  ev.updaters.push(putGong);
  addInfo(ev, () => ({ gong: { strikes: st.strikes, bar: st.bar, beat: st.beat, source: st.source, theme: st.theme } }));
}

// ------------------------------------------------------------------ 6-4 Dschungel mit lila Giftsee

function jungleLake(ev, x, y, z) {
  // Floß kreist langsam auf dem See
  const raft = mover(ev, cached('w6m:raft', () => {
    const b = new Build();
    for (let i = 0; i < 5; i++) b.cyl(0.24, 0.24, 3.2, { v: (px, py, pz, nx, ny) => mix(0x7a4e2a, 0xb8844a, ny * 0.5 + 0.5) }, { p: [0, 0.2, -1.0 + i * 0.5], r: [0, 0, Math.PI / 2] }, 8);
    for (const s of [-1, 1]) b.box(0.14, 0.1, 2.6, 0x5a3a22, { p: [s * 1.1, 0.46, 0] }, 0);
    b.cyl(0.06, 0.07, 2.2, 0x8a5a36, { p: [0, 1.5, 0] }, 5);
    b.cone(0.9, 1.6, 0x5ad05a, { p: [0.35, 1.7, 0], r: [0, 0, -1.4], s: [1, 1, 0.12] }, 4);
    return b.geometry();
  }), x, y, z, 'floss', true);
  const putRaft = (dt, t) => {
    const a = t * 0.18;
    raft.position.set(x + Math.cos(a) * 3, y + 0.02 + Math.sin(t * 1.5) * 0.05, z + Math.sin(a) * 3);
    raft.rotation.set(Math.sin(t * 1.1) * 0.04, -a, Math.sin(t * 0.9) * 0.05, 'YXZ');
  };
  putRaft(0, 0);
  ev.updaters.push(putRaft);
  // Seerosen (statisch, flach)
  addGeo(ev, 'w6m:lilies', () => {
    const b = new Build();
    for (const [lx, lz, r] of [[-5, 4, 0.7], [4.6, -5, 0.6], [-4.4, -4.6, 0.8], [5.4, 4.6, 0.55], [0.4, 6, 0.5]]) {
      b.cyl(r, r, 0.04, 0x3aa84a, { p: [lx, 0.03, lz] }, 10);
      b.sphere(0.16, 0xff8ad8, { p: [lx + 0.1, 0.12, lz], s: [1, 0.6, 1] }, 6, 3);
    }
    return b.geometry();
  }, x, y, z, 0, false);
  // Giftblasen steigen auf und platzen
  const NBL = 12;
  const bub = instanced(ev, cached('w6m:bubble', () => new THREE.IcosahedronGeometry(0.2, 1)), NBL, { name: 'giftblasen', material: glowMat(ev, 0xe0a0ff) });
  const bubs = Array.from({ length: NBL }, (_, i) => ({ x: x + Math.cos(i * 2.4) * (1.5 + (i % 4) * 1.3), z: z + Math.sin(i * 2.4) * (1.2 + (i % 3) * 1.4), ph: i * 0.37 }));
  const putBub = (t) => {
    bubs.forEach((b0, i) => {
      const u = (t * 0.45 + b0.ph) % 1;
      setInst(bub, i, b0.x, y + 0.05 + u * 0.5, b0.z, 0, u > 0.85 ? 0.0001 : 0.6 + u * 0.9);
    });
    bub.instanceMatrix.needsUpdate = true;
  };
  putBub(0);
  ev.updaters.push((dt, t) => putBub(t));
  cullByView(ev, bub, x, y, z, 9);
  // Rankenschnapper am Nordufer (Registry), sonst eigener Schnapper mit Schnappbewegung
  const sp = [x - 3.4, y + 0.8, z - 9.6];
  const snap = live6(ev, 'rankenschnapper', {}, sp, FRONT, 1, (dt, t) => ({ anim: Math.sin(t * 1.3) > 0.7 ? 'snap' : 'idle' }), true, 5000);
  if (!snap) {
    addGeo(ev, 'w6m:snapstalk', () => new Build().tube([[0, 0, 0], [0.3, 0.8, 0.1], [-0.1, 1.6, 0.2], [0.1, 2.2, 0.3]], 0.13, 0x3a8a3a, null, 10, 6).geometry(), sp[0], sp[1], sp[2]);
    const head = mover(ev, cached('w6m:snaphead', () => {
      const b = new Build();
      b.sphere(0.55, (px, py, pz) => (hash3(px, py, pz) > 0.8 ? 0xffffff : 0xb03ad0), { s: [1.1, 0.75, 1] }, 10, 7);
      b.sphere(0.5, 0xff6aa8, { p: [0, -0.05, 0.1], s: [1, 0.35, 0.95] }, 10, 5);
      for (let i = 0; i < 6; i++) b.cone(0.07, 0.18, 0xffffff, { p: [-0.35 + i * 0.14, 0.05, 0.48], r: [Math.PI, 0, 0] }, 4);
      return b.geometry();
    }), sp[0] + 0.1, sp[1] + 2.4, sp[2] + 0.4, 'schnapper', true);
    ev.updaters.push((dt, t) => { const k = Math.max(0, Math.sin(t * 1.3) - 0.6) * 2.5; head.rotation.set(-0.2 - k * 0.5, Math.sin(t * 0.7) * 0.4, 0); head.position.y = sp[1] + 2.4 + k * 0.2; });
  }
  solidCyl(ev, sp[0], sp[2], 0.6, sp[1] - 1, sp[1] + 3, 'schnapper');
  // Klettergitter (Seilnetz zwischen zwei Pfosten) am Nordufer
  const kx = x + 6.5, kz = z - 12.4;
  addGeo(ev, 'w6m:climbnet', () => {
    const b = new Build();
    for (const s of [-1, 1]) b.cyl(0.14, 0.18, 4.2, 0x8a5a36, { p: [s * 2.1, 2.1, 0] }, 6);
    b.cyl(0.1, 0.1, 4.6, 0x8a5a36, { p: [0, 4.0, 0], r: [0, 0, Math.PI / 2] }, 6);
    for (let i = 0; i <= 6; i++) b.box(0.05, 3.6, 0.05, 0xd8b878, { p: [-1.8 + i * 0.6, 2.1, 0] }, 0);
    for (let k = 0; k <= 6; k++) b.box(3.7, 0.05, 0.05, 0xd8b878, { p: [0, 0.4 + k * 0.58, 0] }, 0);
    return b.geometry();
  }, kx, y + 0.8, kz);
  solidBox(ev, kx - 2.3, y, kz - 0.25, kx + 2.3, y + 5, kz + 0.25, 'klettergitter');
  // Brummer surren über dem See
  const NBR = 3;
  const beetle = cached('w6m:beetle', () => {
    const b = new Build();
    b.sphere(0.32, { v: (px, py, pz, nx, ny) => mix(0x2a4a8a, 0x5a8ae0, ny * 0.5 + 0.5) }, { s: [1.3, 0.9, 1] }, 9, 6);
    b.sphere(0.2, 0x1a1a2a, { p: [0.38, 0.02, 0] }, 7, 5);
    for (const s of [-1, 1]) b.sphere(0.06, 0xffffff, { p: [0.5, 0.1, s * 0.1] }, 5, 3);
    for (const s of [-1, 1]) b.sphere(0.3, 0xd8f0ff, { p: [-0.05, 0.3, s * 0.3], s: [0.9, 0.15, 0.55] }, 7, 3);
    return b.geometry();
  });
  const bee = instanced(ev, beetle, NBR, { name: 'brummer', shadow: true });
  const putBee = (t) => {
    for (let i = 0; i < NBR; i++) {
      const a = t * (0.7 + i * 0.15) + (i * TAU) / NBR;
      setInst(bee, i, x + Math.cos(a) * (4 + i), y + 2.6 + Math.sin(t * 3 + i) * 0.4, z + Math.sin(a) * (3 + i * 0.6), -a - Math.PI / 2, [1, 1 + Math.sin(t * 40 + i) * 0.08, 1]);
    }
    bee.instanceMatrix.needsUpdate = true;
  };
  putBee(0);
  ev.updaters.push((dt, t) => putBee(t));
  cullByView(ev, bee, x, y + 2.6, z, 9);
  addInfo(ev, () => ({ raft: { x: +raft.position.x.toFixed(2), z: +raft.position.z.toFixed(2) } }));
}
const hash3 = (x, y, z) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return h - Math.floor(h); };

// ------------------------------------------------------------------ 6-A kleine Festung mit Glasröhren

function pipeFort(ev, x, y, z) {
  const cage = ev.def.cage ?? [];
  const southZ = Math.max(...cage.map(([, z0, , z1]) => Math.max(z0, z1)));
  for (const [x0, z0, x1, z1] of cage) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const low = Math.abs(z0 - southZ) < 0.01 && Math.abs(z1 - southZ) < 0.01;   // Südmauer niedrig (Kamera)
    const h = low ? 1.0 : 1.8;
    const b = new Build();
    b.box(len, h, 0.8, { v: (px, py, pz, nx, ny) => mix(0x8a84a0, 0xc8c2d8, (py + h / 2) / h * 0.5 + Math.max(0, ny) * 0.5) }, { p: [0, h / 2, 0] }, 0.06, 1);
    const n = Math.max(1, Math.round(len / 1.4));
    for (let i = 0; i < n; i++) b.box(len / n * 0.55, 0.45, 0.84, 0xd0cae0, { p: [-len / 2 + (i + 0.5) * (len / n), h + 0.22, 0] }, 0.04);
    ev.addStatic(place(b.geometry(), (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0)), { castShadow: true });
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const hx = Math.abs(ux) * len / 2 + Math.abs(uz) * 0.4, hz = Math.abs(uz) * len / 2 + Math.abs(ux) * 0.4;
    solidBox(ev, (x0 + x1) / 2 - hx, y, (z0 + z1) / 2 - hz, (x0 + x1) / 2 + hx, y + h + 0.5, (z0 + z1) / 2 + hz, 'festungsmauer');
  }
  for (const [cx, cz] of ev.def.towers ?? []) {
    const low = Math.abs(cz - southZ) < 0.01;
    addGeo(ev, `w6m:forttower:${low ? 1 : 0}`, () => {
      const b = new Build();
      const h = low ? 2.6 : 4.0;
      b.cyl(1.2, 1.35, h, { v: (px, py) => mix(0x8a84a0, 0xc8c2d8, py / h + 0.5) }, { p: [0, h / 2, 0] }, 12);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.5, 0.45, 0.5, 0xd0cae0, { p: [Math.cos(a) * 1.1, h + 0.2, Math.sin(a) * 1.1], r: [0, -a, 0] }, 0.04); }
      b.cone(1.25, 1.9, 0x3a6ad8, { p: [0, h + 1.35, 0] }, 12);
      b.cyl(0.03, 0.03, 1.1, 0xfaf6ff, { p: [0, h + 2.7, 0] }, 3);
      b.cone(0.22, 0.6, 0xffc83a, { p: [0.3, h + 3.0, 0], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.2] }, 3);
      return b.geometry();
    }, cx, y, cz);
    solidCyl(ev, cx, cz, 1.35, y, y + 4.2, 'turm');
  }
  // 2 × 3 Glasröhren in Nord- und Ostmauer (Mündung zum Hof, Goldkragen)
  const north = Math.min(...cage.map(([, z0, , z1]) => Math.min(z0, z1))), east = Math.max(...cage.map(([x0, , x1]) => Math.max(x0, x1)));
  for (const k of [-6, 0, 6]) {
    glassPipe(ev, [[x + k, y + 1.3, north - 1.6], [x + k, y + 1.3, north], [x + k, y + 1.3, north + 1.4]], 0.75, { collarStart: false, collarEnd: true, ringStep: 1.4 });
    glassPipe(ev, [[east + 1.6, y + 1.3, z + k], [east, y + 1.3, z + k], [east - 1.4, y + 1.3, z + k]], 0.75, { collarStart: false, collarEnd: true, ringStep: 1.4 });
  }
  // Tor mit hochgezogenem Fallgitter
  const ga = ev.def.gateAt;
  if (ga) {
    const [gx, gz] = ga;
    addGeo(ev, 'w6m:fortgate', () => {
      const b = new Build();
      for (const s of [-1, 1]) b.box(0.9, 3.0, 1.0, { v: (px, py) => mix(0x8a84a0, 0xc8c2d8, py / 3 + 0.5) }, { p: [0, 1.5, s * 2.8] }, 0.05);
      b.box(1.0, 0.6, 6.6, 0xc8c2d8, { p: [0, 3.2, 0] }, 0.05);
      for (let i = 0; i < 7; i++) b.box(0.08, 0.7, 0.08, 0x4a4458, { p: [0.2, 2.6, -2.1 + i * 0.7] }, 0);
      b.box(0.1, 0.08, 4.6, 0x4a4458, { p: [0.2, 2.3, 0] }, 0);
      b.box(0.1, 0.6, 1.2, 0x3a6ad8, { p: [0.55, 3.2, 0] }, 0);
      b.box(0.1, 0.36, 0.5, 0xffc83a, { p: [0.62, 3.25, 0] }, 0);
      return b.geometry();
    }, gx, y, gz);
    for (const s of [-1, 1]) solidBox(ev, gx - 0.45, y, gz + s * 2.8 - 0.5, gx + 0.45, y + 3.5, gz + s * 2.8 + 0.5, 'tor');
  }
  // Hofboden-Markierung (Ring)
  addGeo(ev, 'w6m:fortring', () => new Build().torus(5.6, 0.1, 0x3a6ad8, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.2] }, 3, 40).geometry(), x, y, z, 0, false);
  // Banner mit Krone (weht)
  wavingFlag(ev, x - 0.1, y + 6.5, north - 0.3, 1.5, 0.95, crownFlagTexture());
  addGeo(ev, 'w6m:fortpole', () => new Build().cyl(0.06, 0.06, 4.8, 0xfaf6ff, { p: [0, 2.4, 0] }, 5).geometry(), x - 0.1, y + 2.2, north - 0.3);
}
function crownFlagTexture() {
  return canvasTexture('w6:kronenflagge', 128, 80, (ctx, w, h) => {
    ctx.fillStyle = '#3a6ad8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffc83a';
    ctx.beginPath(); ctx.moveTo(36, 56); ctx.lineTo(40, 26); ctx.lineTo(52, 40); ctx.lineTo(64, 20); ctx.lineTo(76, 40); ctx.lineTo(88, 26); ctx.lineTo(92, 56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(64, 46, 5, 0, TAU); ctx.fill();
  });
}

// ------------------------------------------------------------------ 6-5 Schnee-Wolkenberg

function snowWind(ev, x, y, z) {
  // Pustewolke mit Gesicht (schwebt, bläst Schneeflocken nach Südwesten)
  const cx = x + 2, cy = y + 5.2, cz = z - 3;
  const cloud = mover(ev, cached('w6m:blowcloud', () => {
    const b = new Build();
    const col = { v: (px, py, pz, nx, ny) => mix(0xc8d6f2, 0xffffff, ny * 0.5 + 0.55) };
    for (const [dx, dy, dz, r] of [[0, 0, 0, 1.5], [-1.4, -0.3, 0, 1.1], [1.4, -0.2, -0.1, 1.2], [-0.5, 0.8, -0.2, 1.1], [0.7, 0.75, -0.1, 1.0]]) b.sphere(r, col, { p: [dx, dy, dz] }, 10, 7);
    for (const s of [-1, 1]) { b.sphere(0.2, 0xffffff, { p: [s * 0.5, 0.25, 1.35] }, 6, 4); b.sphere(0.1, 0x2a2a4a, { p: [s * 0.5, 0.25, 1.52] }, 5, 3); b.sphere(0.28, 0xffc8d8, { p: [s * 0.95, -0.25, 1.15], s: [1, 0.7, 0.5] }, 6, 3); }
    b.torus(0.22, 0.08, 0x8a8ab0, { p: [0, -0.35, 1.45] }, 4, 10);
    return b.geometry();
  }), cx, cy, cz, 'pustewolke', true);
  const NF = 26;
  const flakes = instanced(ev, cached('w6m:flake', () => new THREE.IcosahedronGeometry(0.12, 0)), NF, { name: 'pusteflocken', material: glowMat(ev, 0xf4faff) });
  const dir = new THREE.Vector3(-0.55, -0.25, 1).normalize();
  const putF = (t) => {
    cloud.position.y = cy + Math.sin(t * 0.8) * 0.3;
    const puff = 1 + Math.max(0, Math.sin(t * 2.2)) * 0.08;
    cloud.scale.set(puff, 1, puff);
    for (let i = 0; i < NF; i++) {
      const u = (t * 0.5 + i / NF) % 1;
      const d = u * 9;
      setInst(flakes, i, cx + dir.x * d + Math.sin(i * 2.1 + t * 3) * 0.4 * u, cloud.position.y - 0.35 + dir.y * d + Math.cos(i * 1.7) * 0.4 * u, cz + 1.5 + dir.z * d, t * 2 + i, 1 - u * 0.6);
    }
    flakes.instanceMatrix.needsUpdate = true;
  };
  putF(0);
  ev.updaters.push((dt, t) => putF(t));
  cullByView(ev, flakes, cx - 2, cy - 1, cz + 5, 8);
  // zugefrorener Teich mit Schlittschuhen, Glotzfisch im Eisloch
  const px = x - 8, pz = z + 4;
  addGeo(ev, 'w6m:icepond', () => {
    const b = new Build();
    b.cyl(4.2, 4.2, 0.05, { v: (qx, qy, qz) => mix(0xbfe8ff, 0xeaf8ff, hash3(Math.round(qx), 0, Math.round(qz))) }, { p: [0, 0.03, 0], s: [1, 1, 0.7] }, 24);
    b.torus(4.2, 0.12, 0xffffff, { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.7, 0.3] }, 3, 32);
    b.cyl(0.7, 0.7, 0.06, 0x2a7ac8, { p: [2.2, 0.05, -0.8], s: [1, 1, 0.8] }, 12);
    return b.geometry();
  }, px, y, pz, 0, false, 'stone');
  if (!bake6(ev, 'schlittschuhe', {}, [px - 1.4, y + 0.06, pz + 0.6], FRONT + 0.6, 1, null, true, 3000)) {
    addGeo(ev, 'w6m:skates', () => {
      const b = new Build();
      for (const s of [-1, 1]) { b.box(0.35, 0.3, 0.22, 0xff5a7a, { p: [0, 0.25, s * 0.2] }, 0.06); b.box(0.5, 0.04, 0.04, 0xd8dce8, { p: [0.05, 0.06, s * 0.2] }, 0); }
      return b.geometry();
    }, px - 1.4, y + 0.06, pz + 0.6, 0.6);
  }
  const fish = mover(ev, cached('w6m:glotzfisch', () => {
    const b = new Build();
    b.sphere(0.45, { v: (qx, qy, qz, nx, ny) => mix(0xff8a3a, 0xffd07a, ny * 0.5 + 0.5) }, { s: [1, 1.1, 0.9] }, 10, 7);
    for (const s of [-1, 1]) { b.sphere(0.2, 0xffffff, { p: [s * 0.2, 0.25, 0.32] }, 7, 5); b.sphere(0.1, 0x1a1a2a, { p: [s * 0.2, 0.25, 0.48] }, 5, 3); }
    b.sphere(0.12, 0xff5a5a, { p: [0, -0.1, 0.4], s: [1.4, 0.7, 0.6] }, 6, 3);
    return b.geometry();
  }), px + 2.2, y - 0.2, pz - 0.8, 'glotzfisch', false);
  ev.updaters.push((dt, t) => { const k = Math.max(0, Math.sin(t * 0.9)); fish.position.y = y - 0.35 + k * 0.6; fish.rotation.y = Math.sin(t * 2) * 0.3; });
  // Iglu (Registry), sonst eigenes
  const ig = [x + 12, y, z + 8];
  if (!bake6(ev, 'iglu', { size: 3.2 }, ig, FRONT, 1, null, true, 5000)) {
    addGeo(ev, 'w6m:igloo', () => {
      const b = new Build();
      b.dome(1.7, (qx, qy, qz) => (Math.floor(qy * 2.4) % 2 ? 0xf4f8ff : 0xe0ecfa), null, Math.PI / 2, 16, 6);
      b.cyl(0.6, 0.6, 1.1, 0xf4f8ff, { p: [0, 0.5, 1.6], r: [Math.PI / 2, 0, 0] }, 10, true);
      b.cyl(0.45, 0.45, 0.2, 0x3a4a6a, { p: [0, 0.48, 2.1], r: [Math.PI / 2, 0, 0] }, 10);
      return b.geometry();
    }, ig[0], ig[1], ig[2]);
  }
  solidCyl(ev, ig[0], ig[2], 1.8, y, y + 2, 'iglu');
}

// ------------------------------------------------------------------ 6-6 Himmelsfabrik

function skyFactory(ev, x, y, z) {
  addGeo(ev, 'w6m:factory', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx, ny) => (Math.floor((py + 0.5) * 1.4) % 2 ? mix(0x8ad8c8, 0xb4ecdc, ny * 0.5 + 0.5) : mix(0x7ac8ba, 0xa8e4d4, ny * 0.5 + 0.5)) };
    b.box(15, 6, 7.5, wall, { p: [0, 3, 0] }, 0.08);
    b.box(15.4, 0.4, 7.9, 0x6a7a90, { p: [0, 6.2, 0] }, 0.04);
    // Sägezahndach
    for (let i = 0; i < 4; i++) {
      b.box(3.6, 1.6, 7.4, 0xd86a4a, { p: [-5.4 + i * 3.6, 7.2, 0], r: [0, 0, 0.42], s: [1, 1, 1] }, 0.05);
      b.box(0.15, 1.4, 7.2, 0xbfe8ff, { p: [-3.85 + i * 3.6, 7.1, 0] }, 0);
    }
    // Fenster (Rahmen; Licht separat), Tor
    b.box(3.4, 3.4, 0.12, 0x4a5468, { p: [0, 1.7, 3.78] }, 0.05);
    for (let i = 0; i < 6; i++) b.box(3.2, 0.08, 0.14, 0x6a7a90, { p: [0, 0.3 + i * 0.55, 3.82] }, 0);
    // Schornsteine
    for (const [cx, h] of [[-5.6, 5.2], [-3.4, 4.2]]) b.cyl(0.55, 0.65, h, (px, py) => (Math.floor((py + h / 2) * 1.2) % 2 ? 0xe84a5a : 0xfaf6ff), { p: [cx, 6.4 + h / 2, -2] }, 12);
    // Rohre an der Seite
    b.tube([[7.6, 0.5, 2], [7.9, 3, 2], [7.9, 5.4, 0.5], [7.0, 6.6, -1.5]], 0.22, 0xffc83a, null, 14, 8);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 7.7, y, z - 3.95, x + 7.7, y + 8, z + 3.95, 'fabrik');
  addGeo(ev, 'w6m:factorywin', () => {
    const b = new Build();
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) b.box(1.6, 1.0, 0.06, 0xfff2a0, { p: [s * (4 + i * 2.2), 4.2, 3.78] }, 0);
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  // Zahnräder an der Front (drehen gegenläufig, eine Instanz-Fläche)
  const gears = [[x - 4.8, y + 2.6, z + 3.95, 1.5, 1], [x - 2.3, y + 4.2, z + 4.0, 1.0, -1.5], [x + 4.6, y + 2.2, z + 3.95, 1.3, -1.15], [x + 6.6, y + 3.9, z + 4.0, 0.8, 1.9]];
  const gm = instanced(ev, cached('w6m:gear', () => gearGeo(1, 0.3, 0xffc83a, 12)), gears.length, { name: 'zahnraeder', shadow: true, material: vcol(0.35, { metalness: 0.3 }, 'w6gear') });
  const putGears = (t) => {
    gears.forEach(([gx, gy, gz, r, sp], i) => setInst(gm, i, gx, gy, gz, 0, r, 0, t * sp * 0.6 + i * 0.3));
    gm.instanceMatrix.needsUpdate = true;
  };
  putGears(0);
  ev.updaters.push((dt, t) => putGears(t));
  cullByView(ev, gm, x, y + 3, z + 4, 9);
  // Dampf aus den Schornsteinen
  const NP = 12;
  const steam = instanced(ev, cached('w6m:steam', () => new THREE.IcosahedronGeometry(0.5, 1)), NP, { name: 'dampf', material: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, emissive: 0x8a8aa0, emissiveIntensity: 0.3 }) });
  ev.own.push(steam.material);
  const stacks = [[x - 5.6, y + 11.6, z - 2], [x - 3.4, y + 10.6, z - 2]];
  const putSteam = (t) => {
    for (let i = 0; i < NP; i++) {
      const [sx, sy, sz] = stacks[i % 2];
      const u = (t * 0.32 + i / NP) % 1;
      setInst(steam, i, sx + u * 2.2 + Math.sin(i + t) * 0.2, sy + u * 3.4, sz + u * 0.6, 0, (0.4 + u * 1.4) * (1 - u * u));
    }
    steam.instanceMatrix.needsUpdate = true;
  };
  putSteam(0);
  ev.updaters.push((dt, t) => putSteam(t));
  cullByView(ev, steam, x - 3.5, y + 12.5, z - 1.5, 6);
  // Förderband mit Kisten (rechts vor der Halle)
  const bx0 = x + 2.2, bx1 = x + 9.6, bz = z + 6.2;
  addGeo(ev, `w6m:belt:${ev.id}`, () => {
    const b = new Build();
    b.box(bx1 - bx0 + 0.6, 0.3, 1.5, 0x3a3a4a, { p: [(bx1 - bx0) / 2, 0.75, 0] }, 0.08);
    for (let i = 0; i <= 8; i++) b.cyl(0.18, 0.18, 1.55, 0x9aa6b8, { p: [i * (bx1 - bx0) / 8, 0.6, 0], r: [Math.PI / 2, 0, 0] }, 8);
    for (const u of [0.1, 0.9]) for (const s of [-1, 1]) b.box(0.18, 0.75, 0.18, 0xffc83a, { p: [u * (bx1 - bx0), 0.37, s * 0.7] }, 0);
    for (let i = 0; i < 6; i++) b.box(0.6, 0.02, 1.4, i % 2 ? 0xffd23a : 0x2a2a34, { p: [0.5 + i * 1.2, 0.91, 0], r: [0, 0.6, 0] }, 0);
    return b.geometry();
  }, bx0, y, bz, 0, true);
  solidBox(ev, bx0 - 0.3, y, bz - 0.8, bx1 + 0.3, y + 1.1, bz + 0.8, 'band');
  const NK = 4;
  const crates = instanced(ev, cached('w6m:beltcrate', () => new Build().box(0.7, 0.7, 0.7, { v: (px, py, pz, nx, ny) => mix(0xc8905a, 0xe8b07a, ny * 0.5 + 0.5) }, { p: [0, 0.35, 0] }, 0.05).geometry()), NK, { name: 'bandkisten', shadow: true });
  const putCrates = (t) => {
    for (let i = 0; i < NK; i++) { const u = (t * 0.12 + i / NK) % 1; setInst(crates, i, bx0 + u * (bx1 - bx0), y + 0.92, bz, 0.2 * i, u < 0.06 ? u / 0.06 : u > 0.94 ? (1 - u) / 0.06 : 1); }
    crates.instanceMatrix.needsUpdate = true;
  };
  putCrates(0);
  ev.updaters.push((dt, t) => putCrates(t));
  cullByView(ev, crates, (bx0 + bx1) / 2, y + 1, bz, 6);
  // Kanonenturm neben der Halle
  const kt = [x - 10.4, y, z + 3.2];
  if (!bake6(ev, 'kanone_turm', { height: 2.2 }, kt, FRONT + 0.4, 1, null, true, 5000)) {
    addGeo(ev, 'w6m:cannontower', () => {
      const b = new Build();
      b.cyl(0.9, 1.1, 1.8, 0x8a2a3a, { p: [0, 0.9, 0] }, 12);
      b.sphere(0.8, 0x6a7a90, { p: [0, 2.1, 0] }, 10, 7);
      b.cyl(0.32, 0.36, 1.6, 0x4a5468, { p: [0, 2.3, 0.8], r: [Math.PI / 2 - 0.3, 0, 0] }, 10);
      return b.geometry();
    }, kt[0], kt[1], kt[2]);
  }
  solidCyl(ev, kt[0], kt[2], 1.1, y, y + 2.6, 'kanone');
}

// ------------------------------------------------------------------ 6-Haus Prüfungs-Haus

function throwHouse(ev, x, y, z) {
  addGeo(ev, 'w6m:throwhouse', () => {
    const b = new Build();
    b.box(7, 4.2, 5.4, { v: (px, py, pz, nx, ny) => mix(0xb48ae8, 0xd8c0fa, ny * 0.4 + (py + 2.1) / 8) }, { p: [0, 2.1, 0] }, 0.08);
    b.cone(5.4, 3.0, (px, py, pz) => (hash3(Math.round(px * 1.5), Math.round(py * 1.5), Math.round(pz * 1.5)) > 0.85 ? 0xffe04a : 0x6a3ab8), { p: [0, 5.7, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 0.78] }, 4);
    b.box(1.6, 2.6, 0.12, 0x5a2a8a, { p: [0, 1.3, 2.74] }, 0.04);
    b.sphere(0.08, 0xffc83a, { p: [0.5, 1.3, 2.84] }, 5, 3);
    for (const s of [-1, 1]) { b.box(1.2, 1.1, 0.08, 0xfff2a0, { p: [s * 2.2, 2.5, 2.74] }, 0); b.box(1.3, 0.08, 0.12, 0xffffff, { p: [s * 2.2, 2.5, 2.78] }, 0); }
    // goldenes Fragezeichen auf dem Dach
    b.torus(0.7, 0.2, 0xffc83a, { p: [0, 9.2, 0.3], r: [0, 0, -0.6] }, 6, 16, Math.PI * 1.35);
    b.cyl(0.2, 0.2, 0.6, 0xffc83a, { p: [0.05, 8.1, 0.3] }, 8);
    b.sphere(0.24, 0xffc83a, { p: [0.05, 7.45, 0.3] }, 8, 6);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 3.6, y, z - 2.8, x + 3.6, y + 6, z + 2.8, 'haus');
  // Wurfmaschine (rechts) wirft Bälle auf die Zielscheibe (links)
  const mx = x + 6.5, mz = z + 5.0, tx = x - 6.5, tz = z + 5.0;
  addGeo(ev, 'w6m:pitcher', () => {
    const b = new Build();
    b.box(1.2, 0.9, 1.0, 0x3a7ad8, { p: [0, 0.45, 0] }, 0.08);
    b.cyl(0.25, 0.3, 1.2, 0xfaf6ff, { p: [-0.3, 1.2, 0], r: [0, 0, 0.9] }, 10);
    for (const s of [-1, 1]) b.cyl(0.25, 0.25, 0.1, 0x2a2a34, { p: [0.3, 0.25, s * 0.55], r: [Math.PI / 2, 0, 0] }, 10);
    return b.geometry();
  }, mx, y, mz);
  solidBox(ev, mx - 0.7, y, mz - 0.6, mx + 0.7, y + 1.6, mz + 0.6, 'maschine');
  addGeo(ev, 'w6m:targetpost', () => new Build().box(0.2, 2.0, 0.2, 0x8a5a36, { p: [0, 1.0, -0.15] }, 0.03).geometry(), tx, y, tz);
  const target = mover(ev, cached('w6m:target', () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) b.cyl(1.0 - i * 0.24, 1.0 - i * 0.24, 0.1 + i * 0.02, i % 2 ? 0xffffff : 0xe84a5a, { r: [Math.PI / 2, 0, Math.PI / 2] }, 20);
    return b.geometry();
  }), tx, y + 2.1, tz, 'zielscheibe', true);
  solidBox(ev, tx - 0.3, y, tz - 1.0, tx + 0.3, y + 3.1, tz + 1.0, 'ziel');
  const ball = mover(ev, cached('w6m:ball', () => {
    const b = new Build();
    b.sphere(0.24, (px, py, pz) => (Math.abs(Math.sin(px * 9) * 0.1 + pz) < 0.035 ? 0xe84a5a : 0xfffaf2), null, 10, 8);
    return b.geometry();
  }), mx, y + 1.6, mz, 'wurfball', true);
  const st = { throws: 0, last: -1 };
  const P = 2.4;
  const putBall = (dt, t) => {
    const n = Math.floor(t / P), u = (t % P) / P;
    if (n !== st.last) { st.last = n; st.throws = n; }
    const f = Math.min(1, u / 0.6);
    ball.visible = u < 0.62;
    ball.position.set(mx - 0.6 + (tx + 0.3 - mx + 0.6) * f, y + 1.7 + Math.sin(f * Math.PI) * 3.2 + f * 0.4, mz);
    ball.rotation.z = t * 8;
    const hit = u > 0.6 ? Math.exp(-(u - 0.6) * 9) : 0;
    target.rotation.set(0, 0, Math.sin(u * 40) * 0.25 * hit);
  };
  putBall(0, 0);
  ev.updaters.push(putBall);
  // Ballkorb
  addGeo(ev, 'w6m:ballpile', () => {
    const b = new Build();
    b.cyl(0.7, 0.55, 0.6, 0xc89a5a, { p: [0, 0.3, 0] }, 10, true);
    for (const [bx, by, bz] of [[0, 0.62, 0], [0.3, 0.6, 0.2], [-0.28, 0.6, 0.18], [0.1, 0.62, -0.3], [-0.1, 0.85, 0.05]]) b.sphere(0.24, 0xfffaf2, { p: [bx, by, bz] }, 8, 6);
    return b.geometry();
  }, x + 4.6, y, z + 2.2);
  solidCyl(ev, x + 4.6, z + 2.2, 0.75, y, y + 1.1, 'ballkorb');
  addInfo(ev, () => ({ pitch: { throws: st.throws } }));
}

// ------------------------------------------------------------------ 6-7 Minen-Turm

function mineTower(ev, x, y, z) {
  const H = 12;
  addGeo(ev, 'w6m:headframe', () => {
    const b = new Build();
    const wood = { v: (px, py, pz, nx, ny) => mix(0x7a4e2a, 0xb8844a, Math.max(0, ny) * 0.3 + 0.5) };
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.4, H, 0.4, wood, { p: [sx * 2, H / 2, sz * 2], r: [sz * 0.04, 0, -sx * 0.04] }, 0.03);
    for (let k = 1; k <= 4; k++) {
      const yy = (k * H) / 4.4;
      for (const s of [-1, 1]) { b.box(4.2, 0.2, 0.2, wood, { p: [0, yy, s * 2] }, 0); b.box(0.2, 0.2, 4.2, wood, { p: [s * 2, yy, 0] }, 0); }
      b.box(4.4, 0.16, 0.16, wood, { p: [0, yy - 1.2, 2], r: [0, 0, 0.5] }, 0);
    }
    b.box(5, 0.3, 5, 0x9a6a42, { p: [0, H, 0] }, 0.04);
    for (const s of [-1, 1]) b.box(0.3, 1.8, 0.3, wood, { p: [s * 0.8, H + 1.0, 0.8] }, 0);
    b.cone(3.2, 1.6, 0xd84a3a, { p: [0, H + 2.6, -0.6], r: [0, Math.PI / 4, 0] }, 4);
    // Leiter
    for (const s of [-1, 1]) b.box(0.08, H - 0.4, 0.08, 0xd8b878, { p: [s * 0.35, H / 2, 2.25] }, 0);
    for (let i = 0; i < 20; i++) b.box(0.7, 0.05, 0.06, 0xd8b878, { p: [0, 0.4 + i * 0.58, 2.25] }, 0);
    // Schacht am Boden
    b.box(3.2, 0.3, 3.2, 0x5a3a22, { p: [0, 0.15, 0] }, 0.03);
    b.box(2.4, 0.04, 2.4, 0x14101a, { p: [0, 0.31, 0] }, 0);
    return b.geometry();
  }, x, y, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) solidCyl(ev, x + sx * 2, z + sz * 2, 0.35, y, y + H, 'turm');
  solidBox(ev, x - 1.6, y, z - 1.6, x + 1.6, y + 1.2, z + 1.6, 'schacht');
  // Seilrad oben (dreht), Aufzugkorb fährt auf und ab
  const wheel = mover(ev, cached('w6m:minewheel', () => {
    const b = new Build();
    b.torus(1.3, 0.12, 0x6a6a7a, null, 5, 22);
    for (let i = 0; i < 6; i++) b.box(2.5, 0.08, 0.08, 0x8a8a9a, { r: [0, 0, (i / 6) * Math.PI] }, 0);
    b.cyl(0.18, 0.18, 0.3, 0xffc83a, { r: [Math.PI / 2, 0, 0] }, 8);
    return b.geometry();
  }), x, y + H + 1.9, z + 0.8, 'seilrad', true);
  const cage = mover(ev, cached('w6m:minecage', () => {
    const b = new Build();
    b.box(1.6, 0.12, 1.6, 0x5a5a6a, { p: [0, 0, 0] }, 0);
    b.box(1.6, 0.12, 1.6, 0x5a5a6a, { p: [0, 1.6, 0] }, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.08, 1.6, 0.08, 0x8a8a9a, { p: [sx * 0.75, 0.8, sz * 0.75] }, 0);
    b.box(0.6, 0.6, 0.6, 0xc89a5a, { p: [0.2, 0.36, 0] }, 0.04);
    return b.geometry();
  }), x, y + 1, z, 'aufzug', true);
  const rope = mover(ev, cached('w6m:minerope', () => new Build().cyl(0.03, 0.03, 1, 0x2a2a34, { p: [0, 0.5, 0] }, 3).geometry()), x, y + 3, z + 0.8, 'seil', false);
  const putMine = (dt, t) => {
    const u = 0.5 - 0.5 * Math.cos(t * 0.35);
    const cy = y + 0.4 + u * (H - 3);
    cage.position.y = cy;
    rope.position.set(x, cy + 1.6, z);
    rope.scale.y = Math.max(0.1, y + H + 1.9 - (cy + 1.6));
    wheel.rotation.z = -u * 9;
  };
  putMine(0, 0);
  ev.updaters.push(putMine);
  // Gleis mit Lore und Kristallhaufen
  addGeo(ev, `w6m:minerail:${ev.id}`, () => {
    const b = new Build();
    for (const s of [-1, 1]) b.box(10, 0.08, 0.1, 0x8a8a9a, { p: [5, 0.12, s * 0.5] }, 0);
    for (let i = 0; i < 12; i++) b.box(0.3, 0.08, 1.4, 0x6a4a2e, { p: [i * 0.86, 0.04, 0] }, 0);
    return b.geometry();
  }, x + 3, y, z + 3.4);
  if (!bake6(ev, 'lore', { load: 'kristall' }, [x + 8.5, y + 0.1, z + 3.4], 0, 1, null, true, 4000)) {
    addGeo(ev, 'w6m:cart', () => {
      const b = new Build();
      b.box(1.6, 0.9, 1.1, 0x8a8a9a, { p: [0, 0.65, 0] }, 0.06);
      for (const s of [-1, 1]) for (const k of [-1, 1]) b.cyl(0.22, 0.22, 0.12, 0x3a3a44, { p: [k * 0.5, 0.22, s * 0.58], r: [Math.PI / 2, 0, 0] }, 8);
      return b.geometry();
    }, x + 8.5, y + 0.1, z + 3.4);
    addGeo(ev, 'w6m:cartload', () => {
      const b = new Build();
      for (let i = 0; i < 5; i++) b.cone(0.18, 0.6, i % 2 ? 0xb88ad8 : 0x7ae8ff, { p: [-0.5 + i * 0.25, 1.3, (i % 2) * 0.2 - 0.1], r: [0.2 * (i - 2), 0, 0.15 * (i - 2)] }, 5);
      return b.geometry();
    }, x + 8.5, y + 0.1, z + 3.4, 0, false, 'glow');
  }
  solidBox(ev, x + 7.6, y, z + 2.7, x + 9.4, y + 1.3, z + 4.1, 'lore');
  addGeo(ev, 'w6m:crystalpile', () => {
    const b = new Build();
    for (let i = 0; i < 7; i++) { const h = 0.6 + (i % 3) * 0.35; b.cone(0.2 + (i % 2) * 0.08, h, i % 3 ? 0xb88ad8 : 0x7ae8ff, { p: [Math.cos(i * 2.2) * 0.5, h / 2, Math.sin(i * 2.2) * 0.4], r: [Math.sin(i) * 0.35, 0, Math.cos(i) * 0.35] }, 5); }
    return b.geometry();
  }, x - 5.2, y, z + 2.4, 0, false, 'glow');
  // Wuschel-Horde hüpft um den Turmfuß
  const NW = 7;
  const fuzzy = cached('w6m:wuschel', () => {
    const b = new Build();
    b.add(new THREE.IcosahedronGeometry(0.42, 1), (px, py, pz) => (hash3(px * 9, py * 9, pz * 9) > 0.5 ? 0x1a1424 : 0x2e2440), { s: [1, 0.95, 1] });
    for (let i = 0; i < 14; i++) { const a = i * 2.4, e = Math.sin(i * 1.3) * 0.9; b.cone(0.1, 0.32, 0x241a30, { p: [Math.cos(a) * 0.42 * Math.cos(e), Math.sin(e) * 0.42, Math.sin(a) * 0.42 * Math.cos(e)], r: [Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4 + e] }, 4); }
    for (const s of [-1, 1]) { b.sphere(0.13, 0xffffff, { p: [s * 0.14, 0.1, 0.36] }, 6, 4); b.sphere(0.06, 0x1a1424, { p: [s * 0.14, 0.1, 0.47] }, 5, 3); }
    return b.geometry();
  });
  const useModel = hasModel('wuschel') && modelTris('wuschel', {}) <= 1500;
  const horde = instanced(ev, fuzzy, NW, { name: 'wuschel-horde', shadow: true });
  const putHorde = (t) => {
    for (let i = 0; i < NW; i++) {
      const a = (i / NW) * TAU + t * 0.4 * (i % 2 ? 1 : -1);
      const hop = Math.abs(Math.sin(t * 4 + i * 1.3));
      setInst(horde, i, x + Math.cos(a) * (3.6 + (i % 3) * 0.5), y + 0.42 + hop * 0.6, z + Math.sin(a) * (3.2 + (i % 2) * 0.5) + 0.8, -a, [1 + (1 - hop) * 0.12, 1 - (1 - hop) * 0.12, 1 + (1 - hop) * 0.12]);
    }
    horde.instanceMatrix.needsUpdate = true;
  };
  putHorde(0);
  ev.updaters.push((dt, t) => putHorde(t));
  cullByView(ev, horde, x, y + 0.8, z + 1, 7);
  void useModel;
  // Laternen am Turm (leuchtend)
  addGeo(ev, 'w6m:minelamps', () => {
    const b = new Build();
    for (const [lx, ly] of [[-2.3, 3.2], [2.3, 6.4], [-2.3, 9.4]]) b.sphere(0.22, 0xffd27a, { p: [lx, ly, 2.3], s: [1, 1.3, 1] }, 7, 5);
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  addInfo(ev, () => ({ mine: { cage: +(cage.position.y - y).toFixed(2), wuschel: NW } }));
}

// ------------------------------------------------------------------ 6-Panzer Wolkenstraße

function tankRoad(ev, x, y, z) {
  // Fahrbahnmarkierung (gelbe Striche) über die ganze Wolkenstraße
  addGeo(ev, `w6m:roadmarks:${ev.id}`, () => {
    const b = new Build();
    for (let i = 0; i < 12; i++) b.box(1.6, 0.02, 0.3, 0xffd23a, { p: [-22 + i * 3.8, 0.02, 0] }, 0);
    return b.geometry();
  }, x - 4, y, z + 4.5, 0, false);
  // Panzerkolonne (Registry 'panzer_fahrzeug', sonst eigene Geometrie) – Blick nach Osten (+X)
  const tanks = [[x - 8.5, y, z], [x + 1.5, y, z]];
  for (const [i, [tx, ty, tz]] of tanks.entries()) {
    if (!bake6(ev, 'panzer_fahrzeug', { length: 6.4, width: 3.4, deck: 1.6, color: i ? 'oliv' : 'rot' }, [tx, ty, tz], 0, 0.8, null, true, 9000)) {
      ev.addStatic(place(tankGeo(0.85), tx, ty, tz, 0), { castShadow: true });
    }
    solidBox(ev, tx - 2.7, ty, tz - 1.45, tx + 2.7, ty + 1.6, tz + 1.45, 'panzer');
  }
  // Geschützturm des vorderen Panzers schwenkt
  const tur = mover(ev, turretGeo(0.85, true), tanks[1][0], y + 1.36, tanks[1][2], 'geschuetzturm', true);
  ev.updaters.push((dt, t) => { tur.rotation.y = Math.sin(t * 0.5) * 0.7; });
  // Baron-Flagge am hinteren Panzer
  addGeo(ev, 'w6m:tankpole', () => new Build().cyl(0.05, 0.05, 3.2, 0xfaf6ff, { p: [0, 1.6, 0] }, 5).geometry(), tanks[0][0] - 1.6, y + 1.4, tanks[0][2]);
  wavingFlag(ev, tanks[0][0] - 1.6, y + 4.2, tanks[0][2], 1.3, 0.8, baronFlagTexture());
  // Türme aus großen ?-Blöcken (Registry 'question_block' ×2, sonst eigene) am Ostende
  const qb = (bx, by, bz) => {
    if (!bake6(ev, 'question_block', {}, [bx, by, bz], 0, 2, null, true, 700)) {
      addGeo(ev, 'w6m:bigq', () => {
        const b = new Build();
        b.box(2, 2, 2, { v: (px, py, pz, nx, ny) => mix(0xe8a01a, 0xffd23a, ny * 0.5 + 0.5) }, { p: [0, 1, 0] }, 0.14);
        for (const [r, ry] of [[0, 0], [0, Math.PI / 2], [0, Math.PI], [0, -Math.PI / 2]]) {
          const g = new Build().torus(0.36, 0.12, 0xfff4c8, { p: [0, 1.3, 1.02], r: [r, 0, -0.5] }, 4, 10, Math.PI * 1.3).box(0.2, 0.32, 0.06, 0xfff4c8, { p: [0.05, 0.85, 1.02] }, 0).box(0.2, 0.2, 0.06, 0xfff4c8, { p: [0.05, 0.5, 1.02] }, 0).geometry();
          g.rotateY(ry);
          b.parts.push(g);
        }
        return b.geometry();
      }, bx, by, bz);
    }
  };
  const towers = [[x + 13, z - 1.8, 3], [x + 16, z + 1.5, 2]];
  for (const [bx, bz, n] of towers) {
    for (let k = 0; k < n; k++) qb(bx, y + k * 2, bz);
    solidBox(ev, bx - 1, y, bz - 1, bx + 1, y + n * 2, bz + 1, 'fragebloecke');
  }
  // Zündköpfe trippeln umher (Registry 'zuendkopf', sonst eigene Bombe)
  const NZ = 2;
  const zk = [];
  for (let i = 0; i < NZ; i++) {
    const m = live6(ev, 'zuendkopf', {}, [x + 7, y, z + 2], FRONT, 0.9, { anim: 'walk', speed: 1 }, true, 3000);
    if (m) zk.push(m.root);
  }
  if (!zk.length) {
    for (let i = 0; i < NZ; i++) {
      zk.push(mover(ev, cached('w6m:bomb', () => {
        const b = new Build();
        b.sphere(0.45, { v: (px, py, pz, nx, ny) => mix(0x1a1a2a, 0x4a4a6a, ny * 0.5 + 0.5) }, { p: [0, 0.55, 0] }, 10, 8);
        b.cyl(0.12, 0.14, 0.18, 0x8a8a9a, { p: [0, 1.0, 0] }, 8);
        b.cyl(0.03, 0.03, 0.3, 0xd8b878, { p: [0, 1.2, 0] }, 3);
        for (const s of [-1, 1]) { b.sphere(0.1, 0xffffff, { p: [0.35, 0.65, s * 0.15], s: [0.6, 1.2, 0.9] }, 5, 4); b.box(0.3, 0.1, 0.18, 0xffc83a, { p: [0, 0.12, s * 0.22] }, 0.03); }
        return b.geometry();
      }), x + 7, y, z + 2, 'zuendkopf', true));
    }
  }
  ev.updaters.push((dt, t) => {
    zk.forEach((r, i) => {
      const a = t * 0.6 + i * Math.PI;
      r.position.set(x + 7 + Math.cos(a) * 2.4, y + Math.abs(Math.sin(t * 6 + i)) * 0.08, z + 2.2 + Math.sin(a) * 1.4);
      r.rotation.y = -a - Math.PI;
    });
  });
}

// ------------------------------------------------------------------ 6-C Zirkuszelt auf der höchsten Insel

function skyCircus(ev, x, y, z) {
  // Zelt: Registry 'zirkuszelt' (Welt 3, auf ≈ 6 m Radius skaliert), sonst eigenes großes Zelt mit Pastellstreifen
  const fr = footRadius('zirkuszelt');
  if (!(fr && bake6(ev, 'zirkuszelt', {}, [x, y, z], FRONT, Math.min(1.3, 6.2 / fr), null, true, 9000))) {
    addGeo(ev, 'w6m:bigtent', () => {
      const b = new Build();
      const R = 5.6, H = 3.6;
      const stripe = (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 20) % 2 ? 0xff6a8a : 0xfff6fa);
      b.cyl(R, R, H, stripe, { p: [0, H / 2, 0] }, 40, true);
      b.cone(R + 0.5, 4.6, stripe, { p: [0, H + 2.3, 0] }, 40);
      for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU; b.cone(0.34, 0.5, i % 2 ? 0xffc83a : 0x6ac8ff, { p: [Math.cos(a) * (R + 0.35), H - 0.2, Math.sin(a) * (R + 0.35)], r: [Math.PI, 0, 0] }, 4); }
      b.torus(R + 0.25, 0.12, 0xffc83a, { p: [0, H + 0.02, 0], r: [Math.PI / 2, 0, 0] }, 6, 48);
      const door = new THREE.Shape();
      door.moveTo(-1.3, 0); door.lineTo(-1.2, 2.1); door.quadraticCurveTo(0, 3.2, 1.2, 2.1); door.lineTo(1.3, 0); door.lineTo(-1.3, 0);
      b.extrude(door, 0.1, 0x3a0e2a, { p: [0, 0, R + 0.02] }, 0, 8);
      for (const s of [-1, 1]) b.cyl(0.22, 0.34, 2.6, 0xff6a8a, { p: [s * 1.35, 1.3, R + 0.1], r: [0, 0, s * -0.12] }, 10);
      b.cyl(0.08, 0.08, 2.2, 0xfbfaf6, { p: [0, H + 5.6, 0] }, 8);
      b.sphere(0.2, 0xffc83a, { p: [0, H + 6.8, 0] }, 10, 8);
      return b.geometry();
    }, x, y, z);
  }
  solidCyl(ev, x, z, 5.8, y, y + 8, 'zelt');
  // Wimpelketten vom Zeltdach zu Masten
  addGeo(ev, `w6m:bunting6:${ev.id}`, () => {
    const b = new Build();
    const top = [0, 9.6, 0];
    const cols = [0xff5a7a, 0xffd23a, 0x6ac8ff, 0x8ae06a, 0xb48aff];
    for (const [mx, mz] of [[-11, 6], [11, 6], [-11, -6], [11, -6]]) {
      b.cyl(0.08, 0.1, 6.5, 0xfaf6ff, { p: [mx, 3.25, mz] }, 6);
      b.sphere(0.16, 0xffc83a, { p: [mx, 6.6, mz] }, 6, 4);
      const pts = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([top[0] + (mx - top[0]) * u, top[1] + (6.4 - top[1]) * u - Math.sin(u * Math.PI) * 0.9, top[2] + (mz - top[2]) * u]); }
      b.tube(pts, 0.03, 0xffffff, null, 20, 3);
      for (let i = 1; i < 10; i++) { const [px, py, pz] = pts[i]; b.cone(0.22, 0.42, cols[i % cols.length], { p: [px, py - 0.24, pz], r: [Math.PI, Math.atan2(mx, mz), 0], s: [1, 1, 0.15] }, 3); }
    }
    return b.geometry();
  }, x, y, z);
  for (const [mx, mz] of [[-11, 6], [11, 6], [-11, -6], [11, -6]]) solidCyl(ev, x + mx, z + mz, 0.2, y, y + 6.5, 'mast');
  // Spiegelfrucht auf einem Podest (Registry 'powerup_spiegel'), schwebt und dreht sich
  const sp = [x - 9.5, y, z + 9];
  addGeo(ev, 'w6m:fruitstand', () => {
    const b = new Build();
    b.cyl(0.8, 1.0, 0.9, (px, py, pz) => (Math.floor((Math.atan2(pz, px) + 4) * 2) % 2 ? 0xb48aff : 0xfff6fa), { p: [0, 0.45, 0] }, 16);
    b.torus(0.82, 0.06, 0xffc83a, { p: [0, 0.9, 0], r: [Math.PI / 2, 0, 0] }, 4, 20);
    return b.geometry();
  }, sp[0], sp[1], sp[2]);
  solidCyl(ev, sp[0], sp[2], 1.0, y, y + 1.0, 'podest');
  const fruit = live6(ev, 'powerup_spiegel', {}, [sp[0], y + 1.5, sp[2]], 0, 1.1, { anim: 'idle' }, true, 4000);
  if (fruit) ev.updaters.push((dt, t) => { fruit.root.position.y = y + 1.5 + Math.sin(t * 2) * 0.15; fruit.root.rotation.y = t * 1.2; });
  else {
    const f = mover(ev, cached('w6m:mirrorfruit', () => {
      const b = new Build();
      for (const s of [-1, 1]) b.sphere(0.32, { v: (px, py, pz, nx, ny) => mix(0xc8d6f2, 0xffffff, ny * 0.5 + 0.5) }, { p: [s * 0.24, 0, 0] }, 10, 8);
      b.cyl(0.03, 0.03, 0.35, 0x5a8a3a, { p: [0, 0.4, 0] }, 4);
      b.sphere(0.12, 0x6ad05a, { p: [0.12, 0.52, 0], s: [1.4, 0.4, 0.8] }, 6, 3);
      return b.geometry();
    }), sp[0], y + 1.5, sp[2], 'spiegelfrucht', true, vcol(0.2, { metalness: 0.5, emissive: 0x1a1a2a }, 'w6mirror'));
    ev.updaters.push((dt, t) => { f.position.y = y + 1.5 + Math.sin(t * 2) * 0.15; f.rotation.y = t * 1.2; });
  }
  // Würfelblase-Geleebrocken hüpfen vor dem Zelt (durchscheinend, eine Instanz-Fläche)
  const NJ = 5;
  const jellyMat = new THREE.MeshStandardMaterial({ color: 0xd8c8ff, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.82, emissive: 0x3a2a6a, emissiveIntensity: 0.4 });
  ev.own.push(jellyMat);
  const jelly = instanced(ev, cached('w6m:jelly', () => {
    const b = new Build();
    b.box(0.9, 0.9, 0.9, 0xffffff, { p: [0, 0.45, 0] }, 0.25, 2);
    for (const s of [-1, 1]) b.sphere(0.09, 0x2a1e3a, { p: [s * 0.18, 0.55, 0.46], s: [0.8, 1.2, 0.4] }, 5, 3);
    return b.geometry();
  }), NJ, { name: 'geleebrocken', shadow: true, material: jellyMat });
  const putJ = (t) => {
    for (let i = 0; i < NJ; i++) {
      const a = (i / NJ) * TAU + t * 0.25;
      const hop = Math.abs(Math.sin(t * 3.2 + i * 1.1));
      const sq = 1 - (1 - hop) * 0.25;
      setInst(jelly, i, x + 8.5 + Math.cos(a) * 2.6, y + hop * 1.1, z + 8.6 + Math.sin(a) * 1.8, -a, [1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)]);
    }
    jelly.instanceMatrix.needsUpdate = true;
  };
  putJ(0);
  ev.updaters.push((dt, t) => putJ(t));
  cullByView(ev, jelly, x + 8.5, y + 0.8, z + 8.6, 5);
}

// ------------------------------------------------------------------ Stellvertreter-Modelle (Gegnergruppen)

/**
 * Schubser-Prinz (Stellvertreter, bis das Registry-Modell 'schubser_prinz' da ist): runder, kräftiger Bulle-Brocken in
 * Königsblau mit weißen Hörnern, goldener Krone, roten Wangen und Stummelfüßen; Blick +X, Fußpunkt im Ursprung.
 * update(dt, { anim: 'walk'|'idle', speed }).
 */
function schubserPrinzStandIn() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(cached('w6m:bully', () => {
    const b = new Build();
    b.sphere(0.95, { v: (px, py, pz, nx, ny) => mix(0x2a4aa8, 0x5a8ae8, ny * 0.5 + 0.5) }, { p: [0, 1.0, 0], s: [1.05, 0.95, 1] }, 14, 10);
    b.sphere(0.55, 0x8ab4ff, { p: [0.62, 0.85, 0], s: [0.6, 0.7, 1] }, 10, 7);
    for (const s of [-1, 1]) {
      b.sphere(0.2, 0xffffff, { p: [0.78, 1.35, s * 0.32], s: [0.6, 1.1, 0.9] }, 8, 6);
      b.sphere(0.1, 0x1a1424, { p: [0.9, 1.33, s * 0.32], s: [0.5, 1, 0.8] }, 6, 4);
      b.box(0.36, 0.08, 0.14, 0x1a1424, { p: [0.8, 1.6, s * 0.32], r: [s * 0.4, 0, 0] }, 0);
      b.cone(0.16, 0.6, 0xfff6e8, { p: [0.15, 1.9, s * 0.6], r: [s * 0.9, 0, -0.2] }, 8);
      b.sphere(0.14, 0xff8aa8, { p: [0.8, 1.05, s * 0.5], s: [0.4, 0.7, 1] }, 6, 4);
    }
    // goldene Krone
    b.cyl(0.36, 0.4, 0.3, 0xffc83a, { p: [-0.05, 1.98, 0] }, 10, true);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.cone(0.08, 0.26, 0xffc83a, { p: [-0.05 + Math.cos(a) * 0.36, 2.25, Math.sin(a) * 0.36] }, 4); }
    b.sphere(0.08, 0xff4a6a, { p: [0.3, 2.0, 0], s: [0.5, 1, 1] }, 6, 4);
    return b.geometry();
  }), vcol(0.45, {}, 'w6bully'));
  body.castShadow = true;
  const feet = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(cached('w6m:bullyfoot', () => new Build().sphere(0.3, 0x1e2a6a, { s: [1.3, 0.6, 1] }, 8, 5).geometry()), vcol(0.6, {}, 'w6bullyfoot'));
    f.position.set(0.1, 0.16, s * 0.45);
    f.castShadow = true;
    root.add(f);
    feet.push(f);
  }
  root.add(body);
  let t = 0;
  return {
    root,
    update(dt, st) {
      t += dt;
      const walk = (st?.anim ?? st) === 'walk';
      const k = walk ? Math.sin(t * 9) : 0;
      feet[0].position.x = 0.1 + k * 0.25; feet[1].position.x = 0.1 - k * 0.25;
      body.position.y = walk ? Math.abs(k) * 0.08 : Math.sin(t * 2) * 0.03;
      body.rotation.z = walk ? -0.08 : 0;
    },
    dispose() {},
  };
}

/** Stellvertreter je Name (Weltdaten roamers[].standIn) – gilt nur, solange die Registry das Modell nicht kennt. */
export const STAND_INS_W6 = {
  schubser_prinz: schubserPrinzStandIn,
};
