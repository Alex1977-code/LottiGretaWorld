// Kulissen der Welt-7-Eingänge (Kurs-Karte „Lava-Festung“, eigene Gestaltung), aufgerufen aus EntranceView.decorate().
// In Klammern die Registry-Modelle (models/kinds/*_w7.js und vorhandene), die benutzt werden, sobald es sie gibt – mit
// Dreiecks-Obergrenze; sonst eigene sparsame Geometrie an gleicher Stelle:
//   bluefort        7-1        Werfer-Festung auf einem Basaltfelsen in der blauen Lava: Mauer mit Zinnen, zwei Rundtürme
//                              ('festungsturm', blaue Fensterglut), Bergfried mit Brummbär-Fahne, H-förmiges Glasröhren-Netz
//                              (Röhren steigen aus der Lava, Querröhre, Röhre zum Ufer), blaue Flammen; Feuerbälle fliegen
//                              im Bogen von der Mauer über die Röhren
//   rockarena       7-A        Felsfläche im Lavasee: Basaltspitzen (def.spikes), Feuerschalen (def.braziers), Steinthron des
//                              Königs, Lavabrocken-Haufen ('lavabrocken'); der helle Lavafelsen-König stapft als Gegnergruppe
//                              darüber (Weltdaten roamers), Platschfische springen im See (Weltdaten fishjumps)
//   templerock      7-2        Tempel-Eingang in der Basaltwand: Stufen, Terrakotta-Säulen mit Goldbändern, Giebel mit
//                              Sonnenscheibe, warm glühendes Tor, Feuerschalen; Kipp-Schaltfelder vor dem Tor leuchten
//                              nacheinander auf; ein Stachelpanzer ('stachelpanzer') wacht an der Treppe
//   lavarace        7-3        Rennbahn über dem Lavafeld: Startbogen mit Ampel (rot → grün) und Zielflagge, aufgeständerte
//                              Rennstrecke mit rot-weißen Randsteinen, Boost-Pfeilen (leuchten im Lauflicht), Donut-Blöcken,
//                              Stachelwalze; leuchtende Rennkugeln sausen die Strecke entlang
//   bluecylinders   7-4        blaue Lava mit Steinbauten: zwei große Laufzylinder ('zylinder_walze', blau) drehen sich,
//                              Pfeilplattformen tauchen abwechselnd auf und versinken, Stachelwalze auf einem Pfeiler
//   bluecage        7-B        Käfig mit Glasröhren: Festungsmauern (blauschwarz), Ecktürme mit blauen Dächern, 2 × 3 Glasröhren
//                              in Nord- und Westmauer, Tor mit Fallgitter ('fallgitter'); der blaue Schubser-Prinz stapft
//                              als Gegnergruppe durch den Hof; blaue Flammen auf den Türmen
//   lavatower       7-5        Turm im Lavasee: Felssockel, Rundturm mit Wendelsims, glühenden Fenstern und Zinnenkranz,
//                              Giftnebel-Kappe (lila Schwaden), Stampfstein ('stampfstein') auf dem Sims, Damm vom Ufer;
//                              Funkenflämmchen hüpfen um den Turm; Seilbahn vom Ufer (Weltdaten cableways)
//   machinediorama  7-Kapitän  Maschinen-Diorama: Sockel mit Vitrine, darin eine Lava-Maschine ('lava_maschine', Zahnräder
//                              drehen), Mini-Lavasee, Förderband mit Kisten, ein Mini-Stampfstein; Krümel ('kruemel') steht
//                              davor (Scheibe „7-K“)
//   reeflagoon      7-6        Vulkan-Riff in der Lagune: Riffkorallen ('riffkoralle'), Kissenlava mit Schlot ('lavagestein',
//                              Blasen steigen), rauchende Vulkaninsel ('vulkanfels' Vulkan), Rammfisch-Flosse kreist,
//                              Wutkaulquappen schwimmen
//   werferhall      7-C        Werfer-Halle: Hallenmauern ohne Dach, erhöhter hinterer Teil mit Stufen, Säulen mit
//                              Feuerschalen, Brummbär-Banner ('brummbaer_banner'); vier Feuer-Werfer als Gegnergruppe
//   crater          7-7        Vulkankrater: Kegel mit offener Vorderseite, Lavasee darin steigt und sinkt, Gitterboden-
//                              Steg ('gitterboden'), Lavadrache taucht auf und ab; Fontänen und Rauch (Weltdaten)
//   lavakeep        7-Burg     Lava-Burg: Vorburg-Mauer mit Torbau und Fallgitter ('fallgitter'), zwei Ecktürme
//                              ('festungsturm'), Bergfried mit rotem Dach und Spitze, glühende Fenster (flackern),
//                              Brummbär-Banner ('brummbaer_banner', wehen), Kampfwagen des Barons vor dem Tor
// Benutzte Modelle meldet state().decor.w7models, zu schwere w7heavy (Name → Dreiecke).
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (Registry-Modelle je Eingang in eine kompakte
// Kachel 'w7:<Id>' mit Fern-Ausblendung), bewegte sind eigene Objekte (ev.updaters), gleichartige als Instanzen.
// Bewegte Objekte stehen schon beim Bau an ihrer Startlage (lod.js).

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { bakeModel } from './bake.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { LowBuild as Build, place } from './desert.js';
import { modelTris } from './beach5.js';
import { beatNow7, LAVA_GLOW, basaltGroupGeo } from './lava7.js';

/** Kulisse für eine Welt-7-Art bauen; false = unbekannte Art. */
export function decorateW7(ev, kind, x, y, z) {
  switch (kind) {
    case 'bluefort': blueFort(ev, x, y, z); return true;
    case 'rockarena': rockArena(ev, x, y, z); return true;
    case 'templerock': templeRock(ev, x, y, z); return true;
    case 'lavarace': lavaRace(ev, x, y, z); return true;
    case 'bluecylinders': blueCylinders(ev, x, y, z); return true;
    case 'bluecage': blueCage(ev, x, y, z); return true;
    case 'lavatower': lavaTower(ev, x, y, z); return true;
    case 'machinediorama': machineDiorama(ev, x, y, z); return true;
    case 'reeflagoon': reefLagoon(ev, x, y, z); return true;
    case 'werferhall': werferHall(ev, x, y, z); return true;
    case 'crater': crater(ev, x, y, z); return true;
    case 'lavakeep': lavaKeep(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, fog: true, ...extra }); ev.own.push(m); return m; };
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
// Registry-Modelle blicken nach +X, die Kulissen nach +Z (Kamera): yaw −π/2 dreht +X nach +Z
const FRONT = -Math.PI / 2;
/** Benutzte Registry-Modelle (für Tests: state().decor.w7models) und vorhandene, aber zu schwere (w7heavy: Name → Dreiecke). */
export const W7_USED = new Set();
export const W7_HEAVY = new Map();
const tooHeavy = (name, opts, max) => { const n = modelTris(name, opts); if (n > max) { W7_HEAVY.set(name, Number.isFinite(n) ? Math.round(n) : -1); return true; } return false; };

/**
 * Registry-Modell als statische Kulisse einbacken (false, solange es fehlt oder zu schwer ist). Die Modelle eines
 * Eingangs teilen eine kompakte Kachel mit Fern-Ausblendung (tile 'w7:<Id>', lod: true).
 */
function bake7(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true, maxTris = 6000) {
  if (!hasModel(name) || tooHeavy(name, opts, maxTris)) return false;
  const add = (g, o) => ev.addStatic(g, { ...o, ...(cast ? {} : { castShadow: false }), tile: `w7:${ev.id}`, lod: true });
  const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state);
  if (ok) W7_USED.add(name);
  return ok;
}
/** Registry-Modell als bewegtes Objekt; state = Objekt/String oder Funktion (dt, t) → state. null, wenn es fehlt. */
function live7(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true, maxTris = 6000) {
  if (!hasModel(name) || tooHeavy(name, opts, maxTris)) return null;
  const m = getModel(name, opts ?? {});
  if (m.placeholder) { m.dispose?.(); return null; }
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
  ev.view.add(m.root);
  ev.own.push(m);
  ev.updaters.push((dt, t) => m.update(dt, typeof state === 'function' ? state(dt, t) : state));
  // nur zeichnen, wenn im Bild und nah (Anflug/Ankunft: Blick über die ganze Insel)
  cullByView(ev, m.root, pos[0], pos[1] + 1.5, pos[2], 4 * scale);
  W7_USED.add(name);
  return m;
}
/** Instanz-Fläche (eigenes Material nach Vertexfarben), ohne Frustum-Culling (die Instanzen bewegen sich). */
function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.5, opts.extra ?? {}, opts.key ?? 'w7inst'), n);
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = `w7:${opts.name ?? 'instanzen'}`;
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
  const tile = material === 'glow' ? 'w7:leuchten' : material === 'stone' ? 'w7:wasser' : undefined;
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), { castShadow: cast, material, ...(tile ? { tile } : {}) });
}
/** Eigenes bewegtes Mesh (Vertexfarben) an (x, y, z). */
function mover(ev, geo, x, y, z, name, shadow = true, material = null) {
  const m = new THREE.Mesh(geo, material ?? vcol(0.55, {}, 'w7decor'));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.name = `w7:${name}`;
  ev.view.add(m);
  return m;
}
/** Zustand für Tests (state().decor) ergänzen. */
function addInfo(ev, fn) {
  const prev = ev.liveInfo;
  ev.liveInfo = () => ({ ...(prev ? prev() : {}), ...fn() });
}
/** Leuchtendes (Material 'glow') einbacken. */
function glowStatic(ev, geo) { ev.addStatic(geo, { material: 'glow', castShadow: false, tile: 'w7:leuchten' }); }
/** Durchscheinendes Glas (Material der Karte w6glass) einbacken. */
function glass(ev, geo) { ev.addStatic(geo, { material: 'w6glass', castShadow: false, tile: 'w7:glas' }); }
const modelsInfo = (ev) => addInfo(ev, () => ({ w7models: [...W7_USED].sort(), w7heavy: Object.fromEntries(W7_HEAVY) }));

/** Instanz-Flammen (unbeleuchtet, Farbe je Flamme), flackern über die Skalierung. spots = [[x, y, z, s, 'rot'|'blau'], …]. */
function flames(ev, spots, name = 'flammen') {
  const geo = cached('w7m:flame', () => {
    const b = new Build();
    b.cone(0.18, 0.55, { v: (px, py) => mix(0xff5a1a, 0xffd23a, py + 0.5) }, { p: [0, 0.27, 0] }, 7);
    b.cone(0.11, 0.36, 0xfff6c0, { p: [0, 0.2, 0.05] }, 6);
    return b.geometry();
  });
  const m = instanced(ev, geo, spots.length, { name, material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  spots.forEach((sp, i) => m.setColorAt(i, sp[4] === 'blau' ? _c.set(0x8ad8ff) : _c.set(0xffffff)));
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
  cullByView(ev, m, c[0], c[1], c[2], 14);
  return m;
}
/** Feuerschale auf Eisenfuß (Fußpunkt), Flamme liefert flames(). */
function brazierGeo(blue = false) {
  return cached(`w7m:brazier:${blue}`, () => {
    const b = new Build();
    b.cyl(0.14, 0.22, 1.1, 0x3a3440, { p: [0, 0.55, 0] }, 7);
    b.cyl(0.5, 0.3, 0.34, { v: (px, py) => mix(0x4a4250, 0x7a6a78, py + 0.5) }, { p: [0, 1.24, 0] }, 10);
    b.torus(0.5, 0.05, blue ? 0x5ac8ff : 0xffa03a, { p: [0, 1.41, 0], r: [Math.PI / 2, 0, 0] }, 4, 14);
    return b.geometry();
  });
}
/** Glasröhre entlang Punkten (Weltkoordinaten): Glas + weiße Ringe + Goldkragen an den Enden. */
function glassPipe(ev, pts, r = 0.8, opt = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const len = curve.getLength();
  const tube = new THREE.TubeGeometry(curve, Math.max(10, Math.round(len * 1.6)), r, 10, false);
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
  const ring = (u, color, th) => {
    const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    const e = new THREE.Euler().setFromQuaternion(q);
    b.torus(r + 0.04, th, color, { p: [p.x, p.y, p.z], r: [e.x, e.y, e.z] }, 4, 16);
  };
  const nR = Math.max(1, Math.round(len / (opt.ringStep ?? 2.6)));
  for (let i = 1; i < nR; i++) ring(i / nR, 0xffffff, 0.06);
  if (opt.collarStart !== false) ring(0.004, 0xffc83a, 0.13);
  if (opt.collarEnd) ring(0.996, 0xffc83a, 0.13);
  ev.addStatic(b.geometry(), { castShadow: false });
  return curve;
}
/** Leuchtkugel (Feuerball/Rennkugel), Instanz-Vorlage. */
function orbGeo(r = 0.3) {
  return cached(`w7m:orb:${r}`, () => {
    const b = new Build();
    b.sphere(r, { v: (x, y, z, nx, ny) => mix(0xff6a1a, 0xffe07a, ny * 0.5 + 0.5) }, null, 9, 6);
    b.sphere(r * 0.6, 0xfff4c0, { p: [r * 0.25, r * 0.2, r * 0.25] }, 6, 4);
    return b.geometry();
  });
}
/** Stachelwalze (Trommel mit Elfenbein-Stacheln), Achse entlang X, Mitte im Ursprung. */
function spikeRollerGeo(len = 3, r = 0.55) {
  return cached(`w7m:roller:${len}:${r}`, () => {
    const b = new Build();
    b.cyl(r, r, len, { v: (px, py, pz, nx, ny) => mix(0x9a1e2a, 0xe0404a, ny * 0.5 + 0.5) }, { r: [0, 0, Math.PI / 2] }, 12);
    for (const s of [-1, 0, 1]) b.cyl(r + 0.04, r + 0.04, 0.14, 0xffc23a, { p: [s * len * 0.4, 0, 0], r: [0, 0, Math.PI / 2] }, 12);
    const nA = Math.max(3, Math.round(len / 0.55));
    for (let i = 0; i < nA; i++) for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + (i % 2) * 0.39, xx = -len / 2 + (i + 0.5) * (len / nA);
      b.cone(0.12, 0.38, 0xf4ecd8, { p: [xx, Math.cos(a) * (r + 0.16), Math.sin(a) * (r + 0.16)], r: [a, 0, 0] }, 5);
    }
    return b.geometry();
  });
}
/** Festungsmauer-Stück mit Zinnen (entlang +X, Länge len, Höhe h), Farben je Stil. */
function wallGeo(len, h, pal = 'stein') {
  const P = pal === 'blau' ? [0x2e3650, 0x4a5676, 0x6a7898, 0x2a4a98] : pal === 'burg' ? [0x3a2e34, 0x5a484e, 0x7a666a, 0x2e2428] : [0x4e4452, 0x6e6272, 0x9a8a94, 0x443a48];
  const b = new Build();
  const brick = (px, py, pz, nx, ny) => (ny > 0.6 ? P[2] : ((Math.floor(py * 1.6) + Math.floor((px + pz) * 0.8)) & 1) ? P[0] : P[1]);
  b.box(len, h, 1.0, brick, { p: [0, h / 2, 0] }, 0);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i += 1) if (i % 2 === 0) b.box(Math.min(0.62, len / n * 0.6), 0.55, 1.04, P[3], { p: [-len / 2 + (i + 0.5) * (len / n), h + 0.27, 0] }, 0);
  return b.geometry();
}
/** Runder Festungsturm (Fußpunkt), Kegeldach in Farbe roof, glühende Fenster als zweite Geometrie. */
function roundTowerGeo(h = 6, r = 1.6, roof = 0xc4304e, pal = 'stein') {
  return cached(`w7m:tower:${h}:${r}:${roof}:${pal}`, () => {
    const P = pal === 'blau' ? [0x2e3650, 0x4e5a7a] : [0x3e3238, 0x5e4c52];
    const b = new Build();
    b.cyl(r, r * 1.08, h, { v: (px, py, pz, nx) => mix(P[0], P[1], (py + h / 2) / h * 0.6 + Math.max(0, nx) * 0.3) }, { p: [0, h / 2, 0] }, 12);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.box(0.5, 0.5, 0.5, P[1], { p: [Math.cos(a) * (r - 0.1), h + 0.25, Math.sin(a) * (r - 0.1)], r: [0, -a, 0] }, 0); }
    b.cone(r * 1.15, r * 1.3, { v: (px, py) => mix(mix(roof, 0x000000, 0.4), roof, py / (r * 1.3) + 0.5) }, { p: [0, h + 0.5 + r * 0.65, 0] }, 12);
    b.cyl(0.03, 0.03, 0.9, 0xd8d0c8, { p: [0, h + 0.5 + r * 1.3 + 0.4, 0] }, 3);
    b.cone(0.18, 0.5, 0xffc23a, { p: [0.25, h + 0.5 + r * 1.3 + 0.7, 0], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.2] }, 3);
    return b.geometry();
  });
}
/** Glühende Bogenfenster eines Rundturms (Vorderseite +Z). */
function towerWindowsGeo(h, r, color = 0xffa03a) {
  return cached(`w7m:towerwin:${h}:${r}:${color}`, () => {
    const b = new Build();
    for (const [yy, a] of [[h * 0.45, 0.4], [h * 0.75, -0.3]]) {
      const w = new THREE.Shape();
      w.moveTo(-0.22, -0.35); w.lineTo(-0.22, 0.12); w.absarc(0, 0.12, 0.22, Math.PI, 0, true); w.lineTo(0.22, -0.35); w.lineTo(-0.22, -0.35);
      b.extrude(w, 0.04, color, { p: [Math.sin(a) * (r + 0.02), yy, Math.cos(a) * (r + 0.02)], r: [0, a, 0] }, 0, 5);
    }
    return b.geometry();
  });
}

// ------------------------------------------------------------------ 7-1 Werfer-Festung in der blauen Lava

function blueFort(ev, x, y, z) {
  // Basaltfels in der Lava (Sockel), Festungsmauer vorn, zwei Rundtürme, Bergfried hinten
  const top = y + 1.8;
  addGeo(ev, 'w7m:fortrock', () => {
    const b = new Build();
    b.box(15, 2.6, 11, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a5a62 : mix(0x2e2834, 0x4e4458, (py + 1.3) / 2.6)) }, { p: [0, 0.5, 0] }, 0.4, 1);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.add(new THREE.DodecahedronGeometry(1.2, 0), (qx, qy, qz, nx, ny) => mix(0x2a2430, 0x4e4458, ny * 0.5 + 0.5), { p: [Math.cos(a) * 7.4, 0.2, Math.sin(a) * 5.6], s: [1.2, 0.8, 1] }); }
    return b.geometry();
  }, x, y, z);
  ev.addStatic(place(wallGeo(11, 3, 'blau'), x, top, z + 4.4), { castShadow: true });
  ev.addStatic(place(wallGeo(9, 3, 'blau'), x - 6.4, top, z), { castShadow: true });
  ev.addStatic(place(wallGeo(9, 3, 'blau').rotateY(Math.PI / 2), x + 6.4, top, z), { castShadow: true });
  addGeo(ev, 'w7m:fortkeep', () => {
    const b = new Build();
    b.box(6, 7, 4.6, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a7898 : ((Math.floor(py * 1.6) + Math.floor((px + pz) * 0.8)) & 1) ? 0x2e3650 : 0x3e4866) }, { p: [0, 3.5, 0] }, 0.06, 1);
    for (let i = 0; i < 6; i++) b.box(0.6, 0.6, 4.7, 0x2a4a98, { p: [-2.6 + i * 1.04, 7.3, 0] }, 0);
    b.cone(2.4, 2.6, 0x2a4ab8, { p: [0, 8.9, 0], r: [0, Math.PI / 4, 0] }, 4);
    return b.geometry();
  }, x, top, z - 2.6);
  addGeo(ev, 'w7m:fortkeepwin', () => {
    const b = new Build();
    for (const [px, py] of [[-1.5, 4.4], [0, 4.4], [1.5, 4.4], [0, 2.0]]) b.box(0.5, 0.8, 0.05, 0x8ae0ff, { p: [px, py, 2.32] }, 0);
    return b.geometry();
  }, x, top, z - 2.6, 0, false, 'glow');
  // Rundtürme (Registry 'festungsturm' mit blauer Fensterglut, sonst eigene)
  for (const sx of [-1, 1]) {
    const tx = x + sx * 6.4, tz = z + 4.4;
    if (!bake7(ev, 'festungsturm', { height: 5.5, radius: 1.7, color: 'blau' }, [tx, top, tz], FRONT, 1, null, true, 6000)) {
      addGeo(ev, 'w7m:tower:5.5:1.7:blue', () => roundTowerGeo(5.5, 1.7, 0x2a4ab8, 'blau'), tx, top, tz);
      addGeo(ev, 'w7m:towerwin:blue', () => towerWindowsGeo(5.5, 1.7, 0x8ae0ff), tx, top, tz, 0, false, 'glow');
    }
  }
  solidBox(ev, x - 8, y, z - 6, x + 8, top + 4, z + 5.8, 'festung');
  // H-förmiges Glasröhren-Netz: zwei Röhren steigen aus der Lava, Querröhre dazwischen; eine Röhre bis ans Ufer
  const ly = y + 0.3;
  glassPipe(ev, [[x - 3, ly, z + 8.6], [x - 3, ly + 3, z + 8.2], [x - 3, top + 4.6, z + 6.4]], 0.7, { collarEnd: true });
  glassPipe(ev, [[x + 3, ly, z + 8.6], [x + 3, ly + 3, z + 8.2], [x + 3, top + 4.6, z + 6.4]], 0.7, { collarEnd: true });
  glassPipe(ev, [[x - 3, ly + 3.2, z + 8.1], [x, ly + 3.4, z + 8.2], [x + 3, ly + 3.2, z + 8.1]], 0.6, { collarStart: false, ringStep: 1.6 });
  const shore = glassPipe(ev, [[x - 6.6, top + 2.6, z + 5.2], [x - 9, top + 3.4, z + 4.6], [x - 12, top + 2.6, z + 3.4], [x - 13, y + 1.4, z + 2.6]], 0.6, { collarEnd: true });
  void shore;
  // blaue Flammen auf den Türmen, Feuerbälle der (unsichtbaren) Werfer fliegen über die Röhren
  flames(ev, [[x - 6.4, top + 6.3, z + 4.4, 1.3, 'blau'], [x + 6.4, top + 6.3, z + 4.4, 1.3, 'blau'], [x - 2.4, top + 3.6, z + 4.4, 0.9, 'blau'], [x + 2.4, top + 3.6, z + 4.4, 0.9, 'blau']], 'festung-flammen');
  const NB = 3;
  const balls = instanced(ev, orbGeo(0.32), NB, { name: 'feuerbaelle', material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  const putB = (t) => {
    for (let i = 0; i < NB; i++) {
      const u = ((t * 0.45 + i / NB) % 1);
      const ax = x - 4 + i * 4, az = z + 4.4, bx = x - 8 + i * 6, bz = z + 12;
      setInst(balls, i, ax + (bx - ax) * u, top + 3.6 + Math.sin(u * Math.PI) * 4 - u * 4.4, az + (bz - az) * u, t * 4, u > 0.95 ? 0.001 : 1);
    }
    balls.instanceMatrix.needsUpdate = true;
  };
  putB(0);
  ev.updaters.push((dt, t) => putB(t));
  cullByView(ev, balls, x, top + 4, z + 6, 10);
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-A Felsfläche im Lavasee

function rockArena(ev, x, y, z) {
  const W = ev.level.world;
  const spikes = ev.def.spikes ?? [];
  if (spikes.length) {
    const b = new Build();
    spikes.forEach(([sx, sz, h], i) => {
      b.add(new THREE.ConeGeometry(0.75, h, 6), { v: (px, py) => mix(0x4a3a40, 0x9a7a6a, (py + h / 2) / h) }, { p: [sx, y + h / 2, sz], r: [0.08 * (i % 3 - 1), i, 0.06 * (i % 2 ? 1 : -1)] });
      b.add(new THREE.ConeGeometry(0.42, h * 0.55, 5), 0x5a4648, { p: [sx + 0.7, y + h * 0.27, sz + 0.3], r: [0, i, 0.2] });
    });
    ev.addStatic(b.geometry(), { castShadow: true });
    for (const [sx, sz, h] of spikes) W.add({ type: 'cyl', x: sx, z: sz, r: 0.6, y0: y, y1: y + h, tag: 'felsspitze' });
  }
  const fl = [];
  for (const [bx, bz] of ev.def.braziers ?? []) {
    ev.addStatic(place(brazierGeo().clone(), bx, y, bz), { castShadow: true });
    W.add({ type: 'cyl', x: bx, z: bz, r: 0.5, y0: y, y1: y + 1.5, tag: 'feuerschale' });
    fl.push([bx, y + 1.4, bz, 1.3, 'rot']);
  }
  if (fl.length) flames(ev, fl, 'arena-flammen');
  // Steinthron des Königs (Nordrand) mit Krone, Kissen
  const tz = z - 8.6;
  addGeo(ev, 'w7m:throne', () => {
    const b = new Build();
    const st = { v: (px, py, pz, nx, ny) => mix(0x8a6a5e, 0xd0aa90, ny * 0.4 + 0.5) };
    b.box(3.4, 0.6, 2.4, st, { p: [0, 0.3, 0] }, 0.1, 1);
    b.box(2.6, 0.7, 1.8, st, { p: [0, 0.95, 0.1] }, 0.1, 1);
    b.box(2.8, 3.0, 0.6, st, { p: [0, 2.1, -0.7] }, 0.12, 1);
    for (const s of [-1, 1]) b.box(0.5, 0.9, 1.6, st, { p: [s * 1.25, 1.5, 0.1] }, 0.08, 1);
    b.box(2.0, 0.24, 1.4, 0x7a2ac8, { p: [0, 1.4, 0.15] }, 0.08, 1);
    for (let i = 0; i < 5; i++) b.cone(0.18, 0.5, 0xffc23a, { p: [-0.8 + i * 0.4, 3.85, -0.7] }, 5);
    b.box(1.9, 0.26, 0.3, 0xffc23a, { p: [0, 3.55, -0.62] }, 0.03);
    b.sphere(0.18, 0xd8283a, { p: [0, 3.55, -0.42] }, 6, 4);
    return b.geometry();
  }, x, y, tz);
  solidBox(ev, x - 1.7, y, tz - 1.2, x + 1.7, y + 3.8, tz + 1.2, 'thron');
  // Lavabrocken-Haufen (eigene sparsame Brocken – das Registry-Modell 'lavabrocken' ist mit ≈ 6,9 k Dreiecken für Kulisse zu schwer)
  const lb = [x - 3.6, y, z + 8.2];
  {
    addGeo(ev, 'w7m:lavapile', () => {
      const b = new Build();
      for (const [px, py, pz, r] of [[0, 0.4, 0, 0.55], [0.8, 0.35, 0.2, 0.45], [0.4, 0.95, 0.1, 0.4]]) b.add(new THREE.DodecahedronGeometry(r, 0), (qx, qy, qz, nx, ny) => (Math.abs(nx) > 0.6 ? 0xff7a2a : mix(0x3a2a2e, 0x6a4a4a, ny * 0.5 + 0.5)), { p: [px, py, pz], r: [px, py * 3, pz] });
      return b.geometry();
    }, lb[0], lb[1], lb[2]);
  }
  solidCyl(ev, lb[0], lb[2], 0.9, y, y + 1.6, 'lavabrocken');
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-2 Tempel-Eingang im Fels

function templeRock(ev, x, y, z) {
  // Portal vor der Felswand (z = Wandfront): Stufen, Säulen, Giebel mit Sonnenscheibe, dunkles Tor mit warmem Schein
  addGeo(ev, 'w7m:temple', () => {
    const b = new Build();
    const terra = { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xe8b080 : mix(0xa0583e, 0xd08a60, (py % 1.2) / 1.2 * 0.4 + 0.4)) };
    for (let i = 0; i < 3; i++) b.box(10 - i * 1.2, 0.3, 2.4 - i * 0.5, terra, { p: [0, 0.15 + i * 0.3, 1.0 - i * 0.25] }, 0.04, 1);
    b.box(10.4, 6.6, 1.2, terra, { p: [0, 3.3, -0.4] }, 0.06, 1);
    for (const s of [-1, 1]) {
      b.cyl(0.62, 0.7, 5.2, { v: (px, py) => (Math.floor((py + 2.6) * 1.6) % 3 === 0 ? 0xf0c050 : mix(0xb86848, 0xe09a6a, 0.5)) }, { p: [s * 3.4, 3.5, 0.6] }, 12);
      b.box(1.6, 0.4, 1.6, 0xe8b080, { p: [s * 3.4, 6.2, 0.6] }, 0.05, 1);
      b.box(1.5, 0.3, 1.5, 0xe8b080, { p: [s * 3.4, 0.95, 0.6] }, 0.05, 1);
    }
    b.box(9.2, 0.8, 1.8, terra, { p: [0, 6.8, 0.4] }, 0.06, 1);
    const ped = new THREE.Shape();
    ped.moveTo(-4.8, 0); ped.lineTo(0, 2.2); ped.lineTo(4.8, 0); ped.lineTo(-4.8, 0);
    b.extrude(ped, 1.6, terra, { p: [0, 7.2, 0.3] }, 0, 1);
    // Sonnenscheibe (gold) im Giebel
    b.cyl(0.8, 0.8, 0.16, 0xffc83a, { p: [0, 8.0, 1.12], r: [Math.PI / 2, 0, 0] }, 16);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; b.box(0.14, 0.42, 0.1, 0xffd86a, { p: [Math.cos(a) * 1.05, 8.0 + Math.sin(a) * 1.05, 1.12], r: [0, 0, a - Math.PI / 2] }, 0); }
    // dunkle Toröffnung (Bogen)
    const door = new THREE.Shape();
    door.moveTo(-1.6, 0); door.lineTo(-1.6, 2.6); door.absarc(0, 2.6, 1.6, Math.PI, 0, true); door.lineTo(1.6, 0); door.lineTo(-1.6, 0);
    b.extrude(door, 0.12, 0x1a0e10, { p: [0, 0.9, 0.24] }, 0, 10);
    return b.geometry();
  }, x, y, z + 0.6);
  addGeo(ev, 'w7m:templeglow', () => {
    const b = new Build();
    const door = new THREE.Shape();
    door.moveTo(-1.2, 0); door.lineTo(-1.2, 2.3); door.absarc(0, 2.3, 1.2, Math.PI, 0, true); door.lineTo(1.2, 0); door.lineTo(-1.2, 0);
    b.extrude(door, 0.04, 0x7a2a12, { p: [0, 0.9, 0.34] }, 0, 8);
    b.box(1.6, 0.06, 0.1, 0xffa03a, { p: [0, 0.94, 0.42] }, 0);
    return b.geometry();
  }, x, y, z + 0.6, 0, false, 'glow');
  solidBox(ev, x - 5.4, y, z - 0.6, x + 5.4, y + 9, z + 1.4, 'tempel');
  solidBox(ev, x - 5, y, z + 1.4, x + 5, y + 0.95, z + 2.3, 'stufen');
  // Feuerschalen links und rechts der Treppe
  const fb = [];
  for (const s of [-1, 1]) {
    const bx = x + s * 5.6, bz = z + 2.6;
    ev.addStatic(place(brazierGeo().clone(), bx, y, bz), { castShadow: true });
    solidCyl(ev, bx, bz, 0.5, y, y + 1.5, 'feuerschale');
    fb.push([bx, y + 1.4, bz, 1.2, 'rot']);
  }
  flames(ev, fb, 'tempel-flammen');
  // Kipp-Schaltfelder vor dem Tor: 2 × 4 Platten leuchten nacheinander auf (Lauflicht), dann alle zusammen
  const cells = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) cells.push([x - 2.1 + i * 1.4, z + 3.4 + j * 1.3]);
  addGeo(ev, 'w7m:switchframe', () => {
    const b = new Build();
    for (const [cx, cz] of cells) b.box(1.24, 0.06, 1.14, 0x4a3a40, { p: [cx - x, 0.03, cz - z] }, 0);
    return b.geometry();
  }, x, y, z, 0, false);
  const tg = cached('w7m:switchtile', () => new Build().box(1.0, 0.08, 0.9, 0xffffff, { p: [0, 0.04, 0] }, 0.03).geometry());
  const tiles = instanced(ev, tg, cells.length, { name: 'schaltfelder', material: glowMat(ev, 0xffffff) });
  let lit = 0;
  const putT = (t) => {
    const step = Math.floor(t / 0.45) % (cells.length + 4);
    lit = Math.min(cells.length, step + 1);
    cells.forEach(([cx, cz], i) => {
      setInst(tiles, i, cx, y + 0.02, cz, 0, 1);
      tiles.setColorAt(i, i < lit ? (step >= cells.length ? _c.set(0xffe07a) : _c.set(0x5ae8ff)) : _c.set(0x3a4a6a));
    });
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  };
  putT(0);
  ev.updaters.push((dt, t) => putT(t));
  cullByView(ev, tiles, x, y, z + 4, 6);
  // Stachelpanzer wacht an der Treppe (Registry, sonst eigener Panzer)
  const sp = [x + 6.6, y, z + 5.2];
  if (!bake7(ev, 'stachelpanzer', {}, sp, FRONT - 0.7, 1.2, null, true, 4500)) {
    addGeo(ev, 'w7m:spiketurtle', () => {
      const b = new Build();
      b.sphere(0.6, { v: (px, py, pz, nx, ny) => mix(0x2a6a4a, 0x5aa86a, ny * 0.5 + 0.5) }, { p: [0, 0.5, 0], s: [1, 0.7, 1] }, 10, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cone(0.12, 0.4, 0xf4ecd8, { p: [Math.cos(a) * 0.32, 0.86, Math.sin(a) * 0.32] }, 5); }
      b.sphere(0.3, 0xffd8a0, { p: [0.62, 0.42, 0] }, 8, 6);
      return b.geometry();
    }, sp[0], sp[1], sp[2]);
  }
  solidCyl(ev, sp[0], sp[2], 0.8, y, y + 1.2, 'stachelpanzer');
  addInfo(ev, () => ({ switches: { lit, n: cells.length } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-3 Rennbahn über dem Lavafeld

function lavaRace(ev, x, y, z) {
  // Startbogen mit Ampel und Zielflagge
  addGeo(ev, 'w7m:startarch', () => {
    const b = new Build();
    for (const s of [-1, 1]) {
      b.box(0.7, 5.2, 0.7, { v: (px, py) => (Math.floor((py + 2.6) * 2) % 2 ? 0xe8303a : 0xf4f4f8) }, { p: [s * 4.2, 2.6, 0] }, 0.05, 1);
      b.box(1.0, 0.3, 1.0, 0x3a3a46, { p: [s * 4.2, 0.15, 0] }, 0.03);
    }
    b.box(9.4, 1.2, 0.5, (px, py, pz, nx, ny, nz) => (Math.abs(nz) > 0.5 ? (((Math.floor((px + 5) * 2) + Math.floor((py + 1) * 2)) & 1) ? 0x1a1a22 : 0xf4f4f8) : 0x3a3a46), { p: [0, 5.6, 0] }, 0.04);
    b.box(2.2, 0.8, 0.4, 0x2a2a34, { p: [0, 4.6, 0.1] }, 0.05);
    return b.geometry();
  }, x, y, z);
  solidCyl(ev, x - 4.2, z, 0.5, y, y + 5.4, 'startbogen');
  solidCyl(ev, x + 4.2, z, 0.5, y, y + 5.4, 'startbogen');
  // Ampel: drei Lampen, Lauflicht rot → gelb → grün
  const lampG = cached('w7m:lamp', () => new Build().sphere(0.24, 0xffffff, null, 8, 6).geometry());
  const lamps = instanced(ev, lampG, 3, { name: 'ampel', material: glowMat(ev, 0xffffff) });
  for (let i = 0; i < 3; i++) setInst(lamps, i, x - 0.7 + i * 0.7, y + 4.6, z + 0.4, 0, 1);
  lamps.instanceMatrix.needsUpdate = true;
  const LAMP = [0xff3a3a, 0xffc23a, 0x5aff6a];
  let phase = 0;
  ev.updaters.push((dt, t) => {
    phase = Math.floor(t / 0.8) % 4;
    for (let i = 0; i < 3; i++) lamps.setColorAt(i, (phase === 3 ? i === 2 : i === Math.min(phase, 1) || (phase === 2 && i === 1)) ? _c.set(LAMP[i]) : _c.set(0x2a2a30));
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  });
  // Rennstrecke: vom Startbogen nach Norden über die Lava, Bogen nach Osten und zurück an den Ostrand des Startplatzes
  const pts = [[x, y, z - 0.6], [x, y + 0.6, z - 8], [x + 4, y + 1.6, z - 15], [x + 13, y + 2.4, z - 18], [x + 21, y + 2.4, z - 13], [x + 23, y + 2, z - 3],
    [x + 20, y + 1.2, z + 6], [x + 14, y + 0.4, z + 8.6], [x + 9.4, y, z + 8.6]];
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const L = curve.getLength(), N = Math.round(L / 1.0);
  const deck = new Build(), glow = new Build();
  const W2 = 1.8;
  const P = new THREE.Vector3(), T = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    curve.getPointAt(u, P); curve.getTangentAt(u, T);
    const yaw = Math.atan2(-T.z, T.x), pitch = Math.asin(Math.max(-1, Math.min(1, T.y)));
    const bank = Math.sin(u * Math.PI * 2) * 0.12;
    deck.box(L / N + 0.06, 0.3, W2 * 2, 0x56565f, { p: [P.x, P.y - 0.15, P.z], r: [bank, yaw, pitch], order: 'YZX' }, 0);
    for (const s of [-1, 1]) {
      const ox = -Math.sin(yaw) * s * W2, oz = -Math.cos(yaw) * s * W2;
      deck.box(L / N + 0.06, 0.24, 0.36, i % 2 ? 0xf4f4f8 : 0xe8303a, { p: [P.x + ox, P.y + 0.02, P.z + oz], r: [0, yaw, pitch], order: 'YZX' }, 0);
    }
    if (i % 4 === 2 && P.y > y + 0.3) deck.box(0.5, P.y - 0.3, 0.5, 0x3a3a46, { p: [P.x, (P.y - 0.3) / 2 + 0.2, P.z] }, 0);
    if (i % 5 === 1) {
      // Boost-Pfeil (Chevron) in Fahrtrichtung
      for (const s of [-1, 1]) glow.box(0.9, 0.04, 0.22, 0xffd23a, { p: [P.x - Math.cos(yaw) * 0.2 - Math.sin(yaw) * s * 0.35, P.y + 0.03, P.z + Math.sin(yaw) * 0.2 - Math.cos(yaw) * s * 0.35], r: [0, yaw + s * 0.7, 0] }, 0);
    }
  }
  ev.addStatic(deck.geometry(), { castShadow: true, tile: `w7:${ev.id}:bahn` });
  // Boost-Pfeile leuchten im Lauflicht (eigenes Material, Farbe pulsiert)
  const boostMat = glowMat(ev, 0xffffff, { vertexColors: true });
  const boost = mover(ev, glow.geometry(), 0, 0, 0, 'boostpfeile', false, boostMat);
  ev.own.push(boost.geometry);
  ev.updaters.push((dt, t) => boostMat.color.setScalar(0.65 + 0.35 * Math.max(0, Math.sin(t * 6))));
  // Donut-Blöcke und Stachelwalze an der Strecke
  const dn = cached('w7m:donut', () => {
    const b = new Build();
    b.box(1, 0.7, 1, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xf0a8c8 : 0xc88a4a) }, { p: [0, 0.35, 0] }, 0.18, 2);
    b.cyl(0.22, 0.22, 0.72, 0x3a2a2a, { p: [0, 0.36, 0] }, 8);
    return b.geometry();
  });
  for (const u of [0.32, 0.36, 0.4]) { curve.getPointAt(u, P); ev.addStatic(place(dn.clone(), P.x, P.y, P.z, 0), { castShadow: true, tile: `w7:${ev.id}:bahn` }); }
  curve.getPointAt(0.62, P); curve.getTangentAt(0.62, T);
  const rollYaw = Math.atan2(-T.z, T.x) + Math.PI / 2;
  addGeo(ev, 'w7m:rollerposts', () => {
    const b = new Build();
    for (const s of [-1, 1]) b.box(0.3, 1.6, 0.3, 0x3a3a46, { p: [s * 2.3, 0.8, 0] }, 0);
    return b.geometry();
  }, P.x, P.y, P.z, rollYaw);
  const roller = mover(ev, spikeRollerGeo(4.2, 0.5), P.x, P.y + 1.2, P.z, 'stachelwalze', true);
  roller.rotation.order = 'YXZ';
  roller.rotation.y = rollYaw;
  ev.updaters.push((dt, t) => { roller.rotation.x = t * 2.2; });
  // Rennkugeln sausen die Strecke entlang
  const NO = 3;
  const orbs = instanced(ev, orbGeo(0.36), NO, { name: 'rennkugeln', material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  const putO = (t) => {
    for (let i = 0; i < NO; i++) {
      const u = (t * 0.11 + i / NO) % 1;
      curve.getPointAt(u, P);
      setInst(orbs, i, P.x, P.y + 0.45, P.z, t * 8, 1);
    }
    orbs.instanceMatrix.needsUpdate = true;
  };
  putO(0);
  ev.updaters.push((dt, t) => putO(t));
  cullByView(ev, orbs, x + 11, y + 2, z - 4, 22);
  addInfo(ev, () => ({ race: { length: +L.toFixed(1), orbs: NO, light: phase } }));
}

// ------------------------------------------------------------------ 7-4 blaue Lava mit Zylindern

function blueCylinders(ev, x, y, z) {
  const ly = y + 0.3;   // Lava-Oberfläche
  // Steinbauten: drei Pfeiler aus der blauen Lava, Stachelwalze auf dem mittleren
  addGeo(ev, 'w7m:bluepillars', () => {
    const b = new Build();
    for (const [px, pz, h] of [[-10, 1, 5.2], [2, -4, 4.0], [-22, 5, 4.6]]) {
      b.box(2.6, h + 1, 2.6, { v: (qx, qy, qz, nx, ny) => (ny > 0.6 ? 0x8a98b4 : ((Math.floor((qy + 1) * 1.4)) & 1) ? 0x3a4258 : 0x4a546e) }, { p: [px, (h - 1) / 2, pz] }, 0.1, 1);
      b.box(2.9, 0.2, 2.9, 0x5ab4ff, { p: [px, h - 0.4, pz] }, 0.04);
    }
    return b.geometry();
  }, x, ly, z);
  // zwei Laufzylinder (Registry 'zylinder_walze' blau, drehen sich; sonst eigene Trommeln)
  const cyls = [];
  for (const [cx, cz, sp] of [[x - 4, z + 5, 0.6], [x - 15, z - 3, -0.5]]) {
    const st = { angle: 0 };
    const m = live7(ev, 'zylinder_walze', { length: 5, radius: 1.3, color: 'blau' }, [cx, ly + 0.6, cz], 0, 1, () => st, false, 6000);
    if (m) { cyls.push({ st, sp, m }); continue; }
    const mesh = mover(ev, cached('w7m:cyl', () => {
      const b = new Build();
      b.cyl(1.3, 1.3, 5, { v: (px, py, pz, nx, ny) => mix(0x5a6a8a, 0xb8c8e8, ny * 0.5 + 0.5) }, { r: [0, 0, Math.PI / 2] }, 14);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; b.box(5.02, 0.16, 0.2, 0x3a4a6a, { p: [0, Math.cos(a) * 1.32, Math.sin(a) * 1.32], r: [a, 0, 0] }, 0); }
      for (const s of [-1, 1]) b.cyl(1.36, 1.36, 0.16, 0xffc23a, { p: [s * 2.42, 0, 0], r: [0, 0, Math.PI / 2] }, 14);
      return b.geometry();
    }), cx, ly + 0.6, cz, 'zylinder', true);
    cyls.push({ st: null, sp, mesh });
  }
  let ang = 0;
  ev.updaters.push((dt, t) => {
    ang = t;
    for (const c of cyls) { if (c.st) c.st.angle = t * c.sp; else c.mesh.rotation.x = t * c.sp; }
  });
  // Pfeilplattformen tauchen abwechselnd auf und versinken (eine Instanz-Fläche)
  const plat = cached('w7m:arrowplat', () => {
    const b = new Build();
    b.box(2, 0.5, 2, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xff9a3a : 0x6a5a62) }, { p: [0, -0.25, 0] }, 0.06, 1);
    b.box(2.08, 0.1, 2.08, 0xffc23a, { p: [0, -0.05, 0] }, 0);
    const ar = new THREE.Shape();
    ar.moveTo(-0.7, -0.2); ar.lineTo(0.1, -0.2); ar.lineTo(0.1, -0.5); ar.lineTo(0.75, 0); ar.lineTo(0.1, 0.5); ar.lineTo(0.1, 0.2); ar.lineTo(-0.7, 0.2); ar.lineTo(-0.7, -0.2);
    b.extrude(ar, 0.04, 0xffffff, { p: [0, 0.02, 0], r: [-Math.PI / 2, 0, 0] }, 0, 1);
    return b.geometry();
  });
  const spots = [[x - 18, z + 3], [x - 2, z], [x + 1, z + 5], [x - 7, z - 6]];
  const plats = instanced(ev, plat, spots.length, { name: 'pfeilplattformen', shadow: false });
  const putP = (t) => {
    spots.forEach(([px, pz], i) => {
      const ph = (t * 0.35 + i * 0.5) % 2;
      const up = ph < 1 ? Math.min(1, ph * 3) : Math.max(0, 1 - (ph - 1) * 3);
      setInst(plats, i, px, ly - 0.5 + up * 0.75, pz, i % 2 ? Math.PI : 0, 1, 0, Math.sin(t * 9 + i) * 0.02 * (up > 0.9 ? 0 : 1));
    });
    plats.instanceMatrix.needsUpdate = true;
  };
  putP(0);
  ev.updaters.push((dt, t) => putP(t));
  cullByView(ev, plats, x, ly, z, 18);
  const roller = mover(ev, spikeRollerGeo(2.6, 0.45), x - 10, ly + 6.0, z + 1, 'stachelwalze', true);
  ev.updaters.push((dt, t) => { roller.rotation.x = t * 2.6; });
  addInfo(ev, () => ({ cylinders: { n: cyls.length, angle: +(ang * 0.6).toFixed(3), registry: cyls.some((c) => !!c.m) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-B Käfig mit Glasröhren

function blueCage(ev, x, y, z) {
  const cage = ev.def.cage ?? [];
  const southZ = Math.max(...cage.map(([, z0, , z1]) => Math.max(z0, z1)));
  for (const [x0, z0, x1, z1] of cage) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const low = Math.abs(z0 - southZ) < 0.01 && Math.abs(z1 - southZ) < 0.01;   // Südmauer niedrig (Kamera)
    const h = low ? 0.9 : 1.9;
    ev.addStatic(place(wallGeo(len, h, 'blau'), (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0)), { castShadow: true });
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const hx = Math.abs(ux) * len / 2 + Math.abs(uz) * 0.5, hz = Math.abs(uz) * len / 2 + Math.abs(ux) * 0.5;
    solidBox(ev, (x0 + x1) / 2 - hx, y, (z0 + z1) / 2 - hz, (x0 + x1) / 2 + hx, y + h + 0.6, (z0 + z1) / 2 + hz, 'festungsmauer');
  }
  const fl = [];
  for (const [cx, cz] of ev.def.towers ?? []) {
    const low = Math.abs(cz - southZ) < 0.01;
    const h = low ? 2.8 : 4.2;
    addGeo(ev, `w7m:tower:${h}:1.3:blue`, () => roundTowerGeo(h, 1.3, 0x2a4ab8, 'blau'), cx, y, cz);
    solidCyl(ev, cx, cz, 1.4, y, y + h + 1, 'turm');
    fl.push([cx, y + h + 0.75, cz + 1.0, 0.9, 'blau']);
  }
  if (fl.length) flames(ev, fl, 'kaefig-flammen');
  // 2 × 3 Glasröhren in Nord- und Westmauer (Mündung zum Hof, Goldkragen)
  const north = Math.min(...cage.map(([, z0, , z1]) => Math.min(z0, z1))), west = Math.min(...cage.map(([x0, , x1]) => Math.min(x0, x1)));
  for (const k of [-6, 0, 6]) {
    glassPipe(ev, [[x + k, y + 1.3, north - 1.6], [x + k, y + 1.3, north], [x + k, y + 1.3, north + 1.4]], 0.72, { collarStart: false, collarEnd: true, ringStep: 1.4 });
    glassPipe(ev, [[west - 1.6, y + 1.3, z + k * 0.8], [west, y + 1.3, z + k * 0.8], [west + 1.4, y + 1.3, z + k * 0.8]], 0.72, { collarStart: false, collarEnd: true, ringStep: 1.4 });
  }
  // Tor mit Fallgitter (Registry 'fallgitter', hochgezogen; sonst eigene Gitterstäbe)
  const ga = ev.def.gateAt;
  if (ga) {
    const [gx, gz] = ga;
    // Torbau (blau), darin das hochgezogene Fallgitter (Registry 'fallgitter', sonst eigene Gitterstäbe)
    addGeo(ev, 'w7m:cagegate', () => {
      const b = new Build();
      for (const s of [-1, 1]) b.box(0.9, 3.4, 1.0, { v: (px, py) => mix(0x2e3650, 0x6a7898, py / 3.4 + 0.5) }, { p: [0, 1.7, s * 2.8] }, 0.05);
      b.box(1.0, 0.7, 6.6, 0x4a5676, { p: [0, 3.75, 0] }, 0.05);
      b.box(0.12, 0.5, 1.4, 0x5ab4ff, { p: [0.55, 3.75, 0] }, 0);
      return b.geometry();
    }, gx, y, gz);
    if (!bake7(ev, 'fallgitter', { width: 4.4, height: 3.3 }, [gx, y, gz], 0, 1, { open: 0.9 }, true, 3500)) {
      addGeo(ev, 'w7m:cagebars', () => {
        const b = new Build();
        for (let i = 0; i < 7; i++) b.box(0.08, 0.7, 0.08, 0x3a4458, { p: [0.2, 3.1, -2.1 + i * 0.7] }, 0);
        return b.geometry();
      }, gx, y, gz);
    }
    for (const s of [-1, 1]) solidBox(ev, gx - 0.45, y, gz + s * 2.8 - 0.5, gx + 0.45, y + 3.6, gz + s * 2.8 + 0.5, 'tor');
  }
  addGeo(ev, 'w7m:cagering', () => new Build().torus(5.6, 0.1, 0x5ab4ff, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.2] }, 3, 40).geometry(), x, y, z, 0, false, 'glow');
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-5 Turm im Lavasee

function lavaTower(ev, x, y, z) {
  const ly = y + 0.3, base = ly + 1.6, H = 13;
  addGeo(ev, 'w7m:tower75', () => {
    const b = new Build();
    // Felssockel in der Lava
    b.cyl(4.6, 5.4, 2.6, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a5a5e : mix(0x2e2428, 0x4e4044, py / 2.6 + 0.5)) }, { p: [0, 0.6, 0] }, 12);
    // Turmschaft mit Bändern
    b.cyl(3.0, 3.3, H, { v: (px, py, pz, nx) => (Math.floor((py + H / 2) / 1.6) % 2 ? mix(0x4a3e46, 0x6a5a62, 0.5 + nx * 0.3) : mix(0x564850, 0x7a6a72, 0.5 + nx * 0.3)) }, { p: [0, 1.9 + H / 2, 0] }, 14);
    // Wendelsims (Platten spiralig um den Turm)
    for (let i = 0; i < 22; i++) {
      const a = Math.PI / 2 + i * 0.52, yy = 2.4 + i * 0.5;
      b.box(1.4, 0.25, 1.2, 0x8a7a80, { p: [Math.cos(a) * 3.6, yy, Math.sin(a) * 3.6], r: [0, -a, 0] }, 0);
    }
    // Zinnenkranz oben, Kragsteine
    b.cyl(3.6, 3.2, 0.8, 0x5a4c54, { p: [0, 1.9 + H + 0.4, 0] }, 14);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.box(0.7, 0.8, 0.6, 0x6a5c64, { p: [Math.cos(a) * 3.3, 1.9 + H + 1.2, Math.sin(a) * 3.3], r: [0, -a, 0] }, 0); }
    // Tür am Fuß zur Kamera
    const door = new THREE.Shape();
    door.moveTo(-0.9, 0); door.lineTo(-0.9, 1.4); door.absarc(0, 1.4, 0.9, Math.PI, 0, true); door.lineTo(0.9, 0); door.lineTo(-0.9, 0);
    b.extrude(door, 0.1, 0x1a1012, { p: [0, 1.9, 3.28] }, 0, 8);
    return b.geometry();
  }, x, ly, z);
  addGeo(ev, 'w7m:tower75win', () => {
    const b = new Build();
    for (const [yy, a] of [[4.5, 0.3], [7.5, -0.4], [10.5, 0.5], [13, -0.2]]) b.box(0.5, 0.8, 0.06, 0xffb44a, { p: [Math.sin(a) * 3.12, yy, Math.cos(a) * 3.12], r: [0, a, 0] }, 0);
    return b.geometry();
  }, x, ly, z, 0, false, 'glow');
  // Damm vom Ufer zum Turmfuß (Kulisse)
  addGeo(ev, 'w7m:towerdam', () => {
    const b = new Build();
    for (let i = 0; i < 9; i++) b.box(2.2, 1.2, 1.5, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x8a7a72 : 0x4a3e44) }, { p: [0, 0.3, 6.0 + i * 1.6] }, 0.08);
    return b.geometry();
  }, x, ly, z);
  // Stampfstein auf dem Sims (Registry, sonst eigener Block mit Gesicht)
  const sp = [x + 2.6, ly + 9.2, z + 2.6];
  if (!bake7(ev, 'stampfstein', {}, sp, FRONT + 0.8, 0.9, null, true, 5600)) {
    addGeo(ev, 'w7m:stomp', () => {
      const b = new Build();
      b.box(1.8, 1.8, 1.8, { v: (px, py, pz, nx, ny) => mix(0x6a7080, 0xa8b0c0, ny * 0.5 + 0.5) }, { p: [0, 0.9, 0] }, 0.12);
      for (const s of [-1, 1]) b.box(0.4, 0.3, 0.05, 0x1a1a22, { p: [s * 0.4, 1.2, 0.92], r: [0, 0, s * 0.3] }, 0);
      b.box(0.9, 0.16, 0.05, 0x1a1a22, { p: [0, 0.6, 0.92] }, 0);
      return b.geometry();
    }, sp[0], sp[1], sp[2], 0.8);
  }
  // Giftnebel-Kappe: lila Schwaden um die Turmspitze (eine Instanz-Fläche)
  const fogG = new THREE.IcosahedronGeometry(1, 1);
  ev.own.push(fogG);
  const fogM = new THREE.MeshLambertMaterial({ color: 0xb48ad8, emissive: 0x4a2a6a, emissiveIntensity: 0.5 });
  ev.own.push(fogM);
  const NF = 8;
  const fog = instanced(ev, fogG, NF, { name: 'giftnebel', material: fogM });
  const topY = ly + 1.9 + H + 2.4;
  const putF = (t) => {
    for (let i = 0; i < NF; i++) {
      const a = (i / NF) * TAU + t * 0.25;
      const s = 1.5 + Math.sin(t * 1.3 + i) * 0.3;
      setInst(fog, i, x + Math.cos(a) * 3.2, topY + Math.sin(t * 0.9 + i * 1.7) * 0.4 + (i % 2) * 0.8, z + Math.sin(a) * 3.2, a, [s, s * 0.7, s]);
    }
    fog.instanceMatrix.needsUpdate = true;
  };
  putF(0);
  ev.updaters.push((dt, t) => putF(t));
  cullByView(ev, fog, x, topY, z, 8);
  // Funkenflämmchen hüpfen um den Turmfuß
  const sparkG = cached('w7m:spark', () => {
    const b = new Build();
    b.sphere(0.3, { v: (px, py, pz, nx, ny) => mix(0xff7a1a, 0xffe07a, ny * 0.5 + 0.5) }, null, 8, 6);
    b.cone(0.22, 0.45, 0xffc23a, { p: [0, 0.35, 0] }, 6);
    for (const s of [-1, 1]) b.sphere(0.06, 0x2a1a1a, { p: [0.24, 0.06, s * 0.1] }, 4, 3);
    return b.geometry();
  });
  const NS = 4;
  const sparks = instanced(ev, sparkG, NS, { name: 'funkenflaemmchen', material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  const putS = (t) => {
    for (let i = 0; i < NS; i++) {
      const a = (i / NS) * TAU + t * 0.6;
      const hop = Math.abs(Math.sin(t * 3.4 + i * 1.3)) * 1.4;
      setInst(sparks, i, x + Math.cos(a) * 5.4, ly + 1.9 + hop + 0.3, z + Math.sin(a) * 4.8, -a, 1);
    }
    sparks.instanceMatrix.needsUpdate = true;
  };
  putS(0);
  ev.updaters.push((dt, t) => putS(t));
  cullByView(ev, sparks, x, ly + 2, z, 7);
  addInfo(ev, () => ({ tower: { height: +(1.9 + H).toFixed(1), fog: NF, sparks: NS } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-Kapitän Maschinen-Diorama

function machineDiorama(ev, x, y, z) {
  // Sockel mit Stufe, Vitrine (Glas), darin Mini-Lavasee, Lava-Maschine, Förderband, Mini-Stampfstein
  addGeo(ev, 'w7m:diorama7', () => {
    const b = new Build();
    b.box(7.2, 0.9, 6.2, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x7a5a3a : mix(0x4a3424, 0x6a4a30, 0.5)) }, { p: [0, 0.45, 0] }, 0.1, 1);
    b.box(7.4, 0.14, 6.4, 0xffc23a, { p: [0, 0.92, 0] }, 0.03);
    b.box(6.4, 0.2, 5.4, 0x3a2a2e, { p: [0, 1.05, 0] }, 0.05);
    // Mini-Inseln und Förderband
    b.box(1.6, 0.8, 1.6, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x8a7a80 : 0x4a3e44) }, { p: [-2.2, 1.5, 1.2] }, 0.08);
    b.box(1.4, 1.4, 1.4, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x8a7a80 : 0x4a3e44) }, { p: [2.3, 1.8, -1.4] }, 0.08);
    b.box(3.4, 0.16, 0.9, 0x2a2a34, { p: [0, 2.1, 1.4] }, 0.04);
    for (let i = 0; i < 6; i++) b.cyl(0.08, 0.08, 0.95, 0x8a8a96, { p: [-1.5 + i * 0.6, 2.06, 1.4], r: [Math.PI / 2, 0, 0] }, 6);
    for (const s of [-1, 1]) b.box(0.16, 1.0, 0.16, 0x3a3a46, { p: [s * 1.6, 1.6, 1.4] }, 0);
    // Zierleiste: Zahnrad-Emblem vorn
    b.cyl(0.42, 0.42, 0.08, 0xd8a040, { p: [0, 0.48, 3.12], r: [Math.PI / 2, 0, 0] }, 10);
    return b.geometry();
  }, x, y, z);
  addGeo(ev, 'w7m:diorama7lava', () => new Build().box(5.6, 0.04, 4.6, 0xff8a2a, { p: [0, 1.17, 0] }, 0).geometry(), x, y, z, 0, false, 'glow');
  solidBox(ev, x - 3.7, y, z - 3.2, x + 3.7, y + 4.4, z + 3.2, 'diorama');
  // Vitrine (Glas) über der Szene
  const gm = new THREE.Mesh(cached('w7m:vitrine', () => new THREE.BoxGeometry(6.6, 3.2, 5.6)), new THREE.MeshStandardMaterial({ color: 0xcff0ff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false, emissive: 0x0a2030 }));
  ev.own.push(gm.material);
  gm.position.set(x, y + 2.7, z);
  gm.renderOrder = 4;
  gm.name = 'w7:vitrine';
  ev.view.add(gm);
  addGeo(ev, 'w7m:vitrineframe', () => {
    const b = new Build();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.12, 3.2, 0.12, 0xffc23a, { p: [sx * 3.3, 2.7, sz * 2.8] }, 0);
    for (const sz of [-1, 1]) b.box(6.7, 0.12, 0.12, 0xffc23a, { p: [0, 4.3, sz * 2.8] }, 0);
    for (const sx of [-1, 1]) b.box(0.12, 0.12, 5.7, 0xffc23a, { p: [sx * 3.3, 4.3, 0] }, 0);
    return b.geometry();
  }, x, y, z, 0, false);
  // Lava-Maschine (Registry, Zahnräder drehen; sonst eigene Maschine)
  const mst = { speed: 1.2 };
  const mach = live7(ev, 'lava_maschine', { width: 2.6, height: 2.0 }, [x + 0.6, y + 1.2, z - 1.2], -Math.PI / 2, 0.55, () => mst, false, 9000);
  if (!mach) {
    addGeo(ev, 'w7m:machine', () => {
      const b = new Build();
      b.box(1.6, 1.4, 1.2, { v: (px, py, pz, nx, ny) => mix(0x4a4a56, 0x8a8a96, ny * 0.5 + 0.5) }, { p: [0, 0.7, 0] }, 0.06);
      b.cyl(0.25, 0.3, 0.9, 0x3a3a46, { p: [0.4, 1.8, -0.2] }, 8);
      return b.geometry();
    }, x + 0.6, y + 1.2, z - 1.2);
  }
  // Mini-Stampfstein: hebt sich und kracht auf die Plattform (Trittstufe)
  const stomp = mover(ev, cached('w7m:ministomp', () => {
    const b = new Build();
    b.box(0.9, 0.9, 0.9, { v: (px, py, pz, nx, ny) => mix(0x6a7080, 0xa8b0c0, ny * 0.5 + 0.5) }, { p: [0, 0.45, 0] }, 0.08);
    for (const s of [-1, 1]) b.box(0.2, 0.14, 0.04, 0x1a1a22, { p: [s * 0.2, 0.6, 0.46], r: [0, 0, s * 0.3] }, 0);
    b.box(0.44, 0.08, 0.04, 0x1a1a22, { p: [0, 0.3, 0.46] }, 0);
    return b.geometry();
  }), x - 2.2, y + 1.9, z + 1.2, 'ministampfstein', false);
  ev.updaters.push((dt, t) => {
    const p = (t % 2.4) / 2.4;
    stomp.position.y = y + 1.9 + (p < 0.6 ? Math.min(1, p / 0.3) * 1.2 : Math.max(0, 1.2 - (p - 0.6) * 12));
  });
  // Kisten auf dem Förderband wandern
  const crate = cached('w7m:minicrate', () => new Build().box(0.4, 0.4, 0.4, { v: (px, py, pz, nx, ny) => mix(0x7a4a2a, 0xb8804a, ny * 0.4 + 0.5) }, { p: [0, 0.2, 0] }, 0.03).geometry());
  const crates = instanced(ev, crate, 3, { name: 'diorama-kisten' });
  const putC = (t) => { for (let i = 0; i < 3; i++) setInst(crates, i, x - 1.5 + ((t * 0.5 + i / 3) % 1) * 3, y + 2.2, z + 1.4, 0, 1); crates.instanceMatrix.needsUpdate = true; };
  putC(0);
  ev.updaters.push((dt, t) => putC(t));
  cullByView(ev, crates, x, y + 2, z + 1.4, 3);
  // Krümel steht vor der Vitrine (Registry 'kruemel', jubelt ab und zu)
  const kp = [x + 2.4, y, z + 4.6];
  const kr = live7(ev, 'kruemel', {}, kp, FRONT + 0.4, 1.6, () => ({ anim: Math.sin(ev.view.time * 0.5) > 0.9 ? 'cheer' : 'idle' }), true, 12000);
  if (kr) solidCyl(ev, kp[0], kp[2], 0.45, kp[1], kp[1] + 0.9, 'kruemel');
  addInfo(ev, () => ({ diorama: { kruemel: !!kr, machine: !!mach } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-6 Vulkan-Riff an der Lagune

function reefLagoon(ev, x, y, z) {
  const wy = y + 0.55;   // Wasserspiegel
  // Riffkorallen (Registry 'riffkoralle', sonst eigene Korallen) zu beiden Seiten des Damms
  const corals = [['roehre', -9, 6, 1.4], ['geweih', -12.5, 1, 1.5], ['anemone', 6.5, 5, 1.2], ['geweih', 11, -2.6, 1.3, 'eigen'], ['roehre', 15, 6.5, 1.2, 'eigen']];
  let nReg = 0;
  for (const [kind, dx, dz, s, own] of corals) {
    const p = [x + dx, y, z + dz];
    if (!own && bake7(ev, 'riffkoralle', { kind, size: s, seed: Math.abs(dx) }, p, FRONT + dx * 0.1, 1, null, false, 2600)) { nReg++; continue; }
    addGeo(ev, `w7m:coral:${kind}`, () => {
      const b = new Build();
      const col = kind === 'roehre' ? 0xff8a3a : kind === 'geweih' ? 0xff6aa8 : 0xb46ae8;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cyl(0.12, 0.18, 0.9 + (i % 3) * 0.3, col, { p: [Math.cos(a) * 0.35, 0.5, Math.sin(a) * 0.35], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] }, 6); }
      return b.geometry();
    }, p[0], p[1], p[2], 0, false);
  }
  // Kissenlava mit Schlot (Registry 'lavagestein'), Blasen steigen aus dem Schlot
  const vp = [x - 13.5, y, z - 7];
  if (!bake7(ev, 'lavagestein', { size: 3.2, vent: true, seed: 3 }, vp, FRONT, 1, null, false, 3600)) {
    addGeo(ev, 'w7m:pillow', () => {
      const b = new Build();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(0.7, { v: (px, py, pz, nx, ny) => mix(0x2a2228, 0x5a4a4e, ny * 0.5 + 0.5) }, { p: [Math.cos(a) * 1, 0.3, Math.sin(a) * 0.8], s: [1.3, 0.7, 1] }, 8, 5); }
      b.cyl(0.4, 0.6, 0.8, 0x3a2e32, { p: [0, 0.6, 0] }, 8);
      return b.geometry();
    }, vp[0], vp[1], vp[2]);
    addGeo(ev, 'w7m:ventglow', () => new Build().cyl(0.32, 0.32, 0.04, 0xff8a2a, { p: [0, 1.02, 0] }, 8).geometry(), vp[0], vp[1], vp[2], 0, false, 'glow');
  }
  const bubG = cached('w7m:bubble', () => new Build().sphere(0.14, 0xe8fcff, null, 7, 5).geometry());
  const NB = 8;
  const bubs = instanced(ev, bubG, NB, { name: 'riffblasen', material: glowMat(ev, 0xffffff, { transparent: true, opacity: 0.75, depthWrite: false }) });
  const putB = (t) => {
    for (let i = 0; i < NB; i++) {
      const u = (t * 0.5 + i / NB) % 1;
      setInst(bubs, i, vp[0] + Math.sin(u * 7 + i) * 0.3, vp[1] + 1 + u * (wy - vp[1] + 0.2), vp[2] + Math.cos(u * 5 + i) * 0.3, 0, 0.6 + u * 0.8);
    }
    bubs.instanceMatrix.needsUpdate = true;
  };
  putB(0);
  ev.updaters.push((dt, t) => putB(t));
  cullByView(ev, bubs, vp[0], wy, vp[2], 3);
  // rauchende Vulkaninsel in der Lagune (Registry 'vulkanfels' Vulkan, sonst eigener Kegel)
  const ip = [x + 13, y, z - 4];
  addGeo(ev, 'w7m:isletbase', () => {
    const b = new Build();
    b.cyl(3.6, 4.2, 1.6, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x5a4a4e : 0x3a2e32) }, { p: [0, 0.8, 0] }, 10);
    return b.geometry();
  }, ip[0], ip[1], ip[2]);
  if (!bake7(ev, 'vulkanfels', { kind: 'vulkan', size: 4.5, seed: 2 }, [ip[0], ip[1] + 1.4, ip[2]], FRONT, 1, { smoke: false }, true, 3000)) {
    addGeo(ev, 'w7m:isletcone', () => {
      const b = new Build();
      b.cone(2.8, 4, { v: (px, py) => mix(0x3a2e32, 0x7a5a5a, py / 4 + 0.5) }, { p: [0, 2, 0] }, 10);
      b.cyl(0.8, 0.8, 0.06, 0xff8a2a, { p: [0, 3.9, 0] }, 8);
      return b.geometry();
    }, ip[0], ip[1] + 1.4, ip[2]);
  }
  // Rammfisch-Flosse kreist in der Lagune, Wutkaulquappen schwimmen am Ufer
  const fin = mover(ev, cached('w7m:fin', () => {
    const b = new Build();
    const s = new THREE.Shape();
    s.moveTo(-0.6, 0); s.quadraticCurveTo(-0.2, 0.3, 0.1, 1.1); s.quadraticCurveTo(0.35, 0.4, 0.6, 0); s.lineTo(-0.6, 0);
    b.extrude(s, 0.12, { v: (px, py) => mix(0x3a6aa8, 0x8ac0f0, py) }, null, 0, 6);
    b.sphere(0.9, { v: (px, py, pz, nx, ny) => mix(0x2a5a98, 0x6aa8e0, ny * 0.5 + 0.5) }, { p: [1.0, -0.15, 0], s: [1.2, 0.35, 0.7] }, 10, 5);
    for (const s2 of [-1, 1]) b.sphere(0.12, 0xffffff, { p: [1.7, 0.02, s2 * 0.3] }, 6, 4);
    return b.geometry();
  }), x, wy, z, 'rammfisch', false);
  const tad = cached('w7m:tadpole', () => {
    const b = new Build();
    b.sphere(0.32, { v: (px, py, pz, nx, ny) => mix(0xff6a4a, 0xffd06a, -ny * 0.5 + 0.5) }, null, 9, 6);
    b.cone(0.2, 0.6, 0xff8a6a, { p: [-0.5, 0, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.25] }, 4);
    for (const s of [-1, 1]) { b.sphere(0.09, 0xffffff, { p: [0.22, 0.14, s * 0.13] }, 5, 4); b.box(0.14, 0.04, 0.04, 0x3a1a1a, { p: [0.25, 0.25, s * 0.13], r: [0, 0, s * 0.4] }, 0); }
    return b.geometry();
  });
  const NT = 3;
  const tads = instanced(ev, tad, NT, { name: 'wutkaulquappen' });
  let finA = 0;
  const putT = (t) => {
    finA = t * 0.45;
    const fx = ip[0] + Math.cos(finA) * 6.5, fz = ip[2] + Math.sin(finA) * 4.8;
    fin.position.set(fx, wy - 0.05, fz);
    fin.rotation.y = Math.atan2(-Math.cos(finA) * 4.8, -Math.sin(finA) * 6.5);
    for (let i = 0; i < NT; i++) {
      const a = t * 0.8 + (i / NT) * TAU;
      setInst(tads, i, x - 10 + Math.cos(a) * 2.4, wy + Math.abs(Math.sin(t * 2 + i)) * 0.25, z + 8 + Math.sin(a) * 1.4, -a - Math.PI / 2, 1);
    }
    tads.instanceMatrix.needsUpdate = true;
  };
  putT(0);
  ev.updaters.push((dt, t) => putT(t));
  cullByView(ev, tads, x - 10, wy, z + 8, 4);
  addInfo(ev, () => ({ reef: { corals: corals.length, registryCorals: nReg, fin: +finA.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-C Werfer-Halle

function werferHall(ev, x, y, z) {
  const r = ev.level.world;
  // Hallenmauern (Nord hoch, Ost/West mittel, Süden offen), erhöhter hinterer Teil mit Stufen
  const x0 = x - 10.6, x1 = x + 10.6, zn = z - 9.6, zs = z + 9.6;
  ev.addStatic(place(wallGeo(21.4, 4.2, 'stein'), x, y, zn - 0.2), { castShadow: true });
  solidBox(ev, x0, y, zn - 0.8, x1, y + 4.8, zn + 0.3, 'hallenmauer');
  for (const sx of [-1, 1]) {
    const wx = sx < 0 ? x0 : x1;
    // Westmauer mit Lücke am Steg (z −38 … −34)
    const segs = sx < 0 ? [[zn, z + 5.4]] : [[zn, zs]];
    for (const [za, zb] of segs) {
      ev.addStatic(place(wallGeo(zb - za, 2.6, 'stein').rotateY(Math.PI / 2), wx, y, (za + zb) / 2), { castShadow: true });
      solidBox(ev, wx - 0.5, y, za, wx + 0.5, y + 3.2, zb, 'hallenmauer');
    }
  }
  addGeo(ev, 'w7m:halldais', () => {
    const g = new Build();
    g.box(20.4, 1.2, 3.0, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x9a8a94 : mix(0x4e4452, 0x6e6272, 0.6)) }, { p: [0, 0.6, 0] }, 0.05, 1);
    for (let i = 0; i < 3; i++) g.box(4, 0.4, 0.5, 0x8a7a86, { p: [0, 0.2 + i * 0.4, 1.75 - i * 0.5 + 0.5] }, 0.03, 1);
    g.box(20.6, 0.1, 0.2, 0xffc23a, { p: [0, 1.22, 1.45] }, 0);
    return g.geometry();
  }, x, y, zn + 1.7);
  r.add({ type: 'box', min: [x0, y, zn + 0.2], max: [x1, y + 1.2, zn + 3.2], tag: 'empore' });
  // Säulen mit Feuerschalen, Banner an der Nordmauer
  const fl = [];
  for (const sx of [-6.6, 6.6]) {
    addGeo(ev, 'w7m:hallpillar', () => {
      const g = new Build();
      g.cyl(0.5, 0.6, 3.4, { v: (px, py) => mix(0x5a5060, 0x8a7e8e, py / 3.4 + 0.5) }, { p: [0, 1.7, 0] }, 8);
      g.cyl(0.6, 0.4, 0.4, 0x6a6070, { p: [0, 3.6, 0] }, 8);
      return g.geometry();
    }, x + sx, y, z + 7.6);
    solidCyl(ev, x + sx, z + 7.6, 0.6, y, y + 3.8, 'saeule');
    fl.push([x + sx, y + 3.8, z + 7.6, 1.2, 'rot']);
  }
  flames(ev, fl, 'halle-flammen');
  let banners = 0;
  for (const sx of [-4.2, 4.2]) {
    if (bake7(ev, 'brummbaer_banner', { height: 3.0, width: 1.6 }, [x + sx, y + 4.0, zn + 0.42], FRONT, 1, { sway: 0 }, true, 1200)) banners++;
    else addGeo(ev, 'w7m:banner', () => {
      const g = new Build();
      g.box(1.5, 2.6, 0.06, 0xc4304e, { p: [0, -1.3, 0] }, 0);
      g.box(1.5, 0.16, 0.1, 0xffc21a, { p: [0, 0, 0] }, 0);
      g.sphere(0.3, 0xffc21a, { p: [0, -1.1, 0.05], s: [1, 1, 0.3] }, 8, 5);
      return g.geometry();
    }, x + sx, y + 4.0, zn + 0.5);
  }
  addInfo(ev, () => ({ hall: { banners } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-7 Vulkankrater

function crater(ev, x, y, z) {
  // Kegel mit offener Vorderseite: unten ein voller Ring (Lavarand, 2,4 m), darüber ein Hufeisen mit der Öffnung zur
  // Kamera (Süden); Außen- und Innenwand als Drehkörper (Innenwand mit nach innen gerichteten Flächen), Lavasee darin
  const R = 11, Rin = 6.2, H = 8.4, LIP = 2.4, GAP = 0.6;
  const rOut = (h) => R - (R - Rin) * (h / H), rIn = (h) => 4.6 + (Rin - 0.2 - 4.6) * (h / H);
  addGeo(ev, 'w7m:cratercone', () => {
    const b = new Build();
    const rock = { v: (px, py, pz, nx, ny) => mix(0x4a2e2a, 0xa86a54, Math.min(1, py / H) * 0.7 + Math.max(0, ny) * 0.3) };
    const inner = { v: (px, py) => mix(0x2a1a18, 0x6a3a30, Math.min(1, py / H)) };
    const lathe = (pts, phi0, len, col) => b.add(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 24, phi0, len), col);
    lathe([[rOut(0), 0], [rOut(LIP), LIP]], 0, TAU, rock);
    lathe([[rOut(LIP), LIP], [rOut(H * 0.6), H * 0.6], [rOut(H), H]], GAP, TAU - 2 * GAP, rock);
    lathe([[rIn(LIP), LIP], [rIn(0.3), 0.3]], 0, TAU, inner);
    lathe([[rIn(H), H], [rIn(LIP), LIP]], GAP, TAU - 2 * GAP, inner);
    // Kraterrand oben (Hufeisen) und Lavarand vorn
    b.torus((rOut(H) + rIn(H)) / 2, 0.55, 0xb07a5e, { r: [-Math.PI / 2, -Math.PI / 2 + GAP, 0], order: 'YXZ' }, 5, 20, TAU - 2 * GAP);
    b.torus((rOut(LIP) + rIn(LIP)) / 2, (rOut(LIP) - rIn(LIP)) / 2, 0x8a5a48, { p: [0, LIP, 0], r: [-Math.PI / 2, 0, 0] }, 4, 28);
    // Schnittflächen der Öffnung
    for (const s of [-1, 1]) {
      const a = s * GAP, rm = (rOut((LIP + H) / 2) + rIn((LIP + H) / 2)) / 2;
      b.box(rOut(LIP) - rIn(LIP), H - LIP, 0.5, 0x6a4038, { p: [Math.sin(a) * rm, (LIP + H) / 2, Math.cos(a) * rm], r: [0, a + Math.PI / 2, 0] }, 0);
    }
    return b.geometry();
  }, x, y, z);
  // Lavasee im Krater (eigene Fläche, steigt und sinkt) mit Fließtextur der Lava
  const lavaM = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  ev.own.push(lavaM);
  const tex = canvasTexture('w7:kraterlava', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    gr.addColorStop(0, '#fff0a0'); gr.addColorStop(0.5, '#ff9a2a'); gr.addColorStop(1, '#e0401a');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  lavaM.map = tex;
  const disc = new THREE.Mesh(cached('w7m:craterdisc', () => new THREE.CircleGeometry(rIn(2.0) + 0.05, 24).rotateX(-Math.PI / 2)), lavaM);
  disc.name = 'w7:kraterlava';
  disc.position.set(x, y + 1.8, z);
  ev.view.add(disc);
  let level = 1.8;
  ev.updaters.push((dt, t) => {
    level = 1.8 + Math.sin(t * TAU / 9) * 0.55;
    disc.position.y = y + level;
    lavaM.color.setScalar(0.9 + Math.sin(t * 2.1) * 0.1);
  });
  // Gitterboden-Steg über die Lava (Registry 'gitterboden', sonst eigenes Gitter)
  for (const k of [-1, 0, 1]) {
    const gp = [x + k * 2.0 - 2, y + 3.0, z + 3.4];
    if (!bake7(ev, 'gitterboden', { size: [2, 2] }, gp, 0, 1, null, true, 1200)) {
      addGeo(ev, 'w7m:grid', () => {
        const b = new Build();
        b.box(2, 0.12, 2, 0x4a4a56, { p: [0, 0.06, 0] }, 0);
        for (let i = 0; i < 5; i++) b.box(0.06, 0.14, 2, 0x8a8a96, { p: [-0.8 + i * 0.4, 0.1, 0] }, 0);
        return b.geometry();
      }, gp[0], gp[1], gp[2]);
    }
  }
  addGeo(ev, 'w7m:gridposts', () => {
    const b = new Build();
    for (const sx of [-5, 1]) b.box(0.3, 3.0, 0.3, 0x3a3a46, { p: [sx, 1.5, 3.4] }, 0);
    return b.geometry();
  }, x, y, z);
  // Lavadrache taucht auf und ab (eigener freundlich-frecher Drachenkopf mit Halsgliedern)
  const dragon = mover(ev, cached('w7m:dragon', () => {
    const b = new Build();
    for (let i = 0; i < 5; i++) b.sphere(0.55 - i * 0.04, { v: (px, py, pz, nx, ny) => (nx > 0.5 ? 0xffb43a : mix(0x6a3a9a, 0x9a6ad0, ny * 0.5 + 0.5)) }, { p: [0.15 * i, i * 0.7, 0] }, 9, 6);
    b.sphere(0.85, { v: (px, py, pz, nx, ny) => mix(0x6a3a9a, 0xb48ae8, ny * 0.5 + 0.5) }, { p: [0.9, 3.7, 0], s: [1.3, 1, 1] }, 10, 7);
    b.sphere(0.4, 0x9a6ad0, { p: [1.85, 3.5, 0], s: [1, 0.8, 1] }, 8, 5);
    for (const s of [-1, 1]) {
      b.sphere(0.24, 0xffffff, { p: [1.25, 4.1, s * 0.42] }, 7, 5);
      b.sphere(0.12, 0x2a1a2a, { p: [1.42, 4.12, s * 0.48] }, 5, 4);
      b.cone(0.12, 0.45, 0xffc23a, { p: [0.6, 4.6, s * 0.36], r: [s * 0.3, 0, 0.4] }, 5);
    }
    for (let i = 0; i < 4; i++) b.cone(0.14, 0.42, 0xff8a2a, { p: [0.15 * i - 0.2, i * 0.7 + 0.5, 0], r: [0, 0, 0.6] }, 4);
    return b.geometry();
  }), x - 2.6, y + level - 4.6, z - 1.8, 'lavadrache', false);
  dragon.rotation.y = -Math.PI / 2 + 0.4;
  let rise = 0;
  ev.updaters.push((dt, t) => {
    const p = (t % 9) / 9;
    rise = p < 0.15 ? p / 0.15 : p < 0.55 ? 1 : p < 0.7 ? 1 - (p - 0.55) / 0.15 : 0;
    const e = rise * rise * (3 - 2 * rise);
    dragon.position.y = y + level - 4.8 + e * 4.6;
    dragon.rotation.z = Math.sin(t * 1.6) * 0.08 * e;
    dragon.visible = e > 0.02;
  });
  addInfo(ev, () => ({ crater: { level: +level.toFixed(3), dragon: +rise.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 7-Burg Lava-Burg

function lavaKeep(ev, x, y, z) {
  // Vorburg-Mauer mit Torbau (Front z + 6), Bergfried dahinter, zwei Ecktürme
  const fz = z + 6;
  ev.addStatic(place(wallGeo(9.2, 5.4, 'burg'), x - 7.4, y, fz), { castShadow: true });
  ev.addStatic(place(wallGeo(9.2, 5.4, 'burg'), x + 7.4, y, fz), { castShadow: true });
  addGeo(ev, 'w7m:keepgate', () => {
    const b = new Build();
    const stone = (px, py, pz, nx, ny) => (ny > 0.6 ? 0x7a666a : ((Math.floor(py * 1.4) + Math.floor((px + pz) * 0.7)) & 1) ? 0x3a2e34 : 0x4a3c44);
    b.box(6.4, 7.6, 2.4, stone, { p: [0, 3.8, 0] }, 0.08, 1);
    for (let i = 0; i < 6; i++) b.box(0.66, 0.7, 2.5, 0x2e2428, { p: [-2.7 + i * 1.08, 7.95, 0] }, 0, 1);
    const door = new THREE.Shape();
    door.moveTo(-1.7, 0); door.lineTo(-1.7, 2.6); door.absarc(0, 2.6, 1.7, Math.PI, 0, true); door.lineTo(1.7, 0); door.lineTo(-1.7, 0);
    b.extrude(door, 0.14, 0x120a0c, { p: [0, 0, 1.24] }, 0, 10);
    // Bergfried hinten mit rotem Dach und Spitze
    b.box(11, 12, 7, stone, { p: [0, 6, -7] }, 0.1, 1);
    for (let i = 0; i < 10; i++) b.box(0.8, 0.9, 7.1, 0x2e2428, { p: [-4.6 + i * 1.02, 12.45, -7] }, 0, 1);
    b.cone(5.4, 6.0, { v: (px, py) => mix(0x6a1010, 0xd8341a, py / 6 + 0.5) }, { p: [0, 15.9, -7], r: [0, Math.PI / 4, 0] }, 4);
    b.cyl(1.4, 1.6, 5, stone, { p: [0, 15.5, -9.4] }, 10);
    b.cone(1.9, 3.6, 0xc8341a, { p: [0, 19.8, -9.4] }, 10);
    return b.geometry();
  }, x, y, fz);
  // Fenster glühen (eine Fläche, flackert)
  const winMat = glowMat(ev, 0xff8a2a);
  const win = mover(ev, cached('w7m:keepwin', () => {
    const b = new Build();
    for (const [px, py, pz] of [[-3, 8.2, -3.45], [0, 8.2, -3.45], [3, 8.2, -3.45], [-1.6, 4.8, 1.22], [1.6, 4.8, 1.22], [0, 15.0, -7.95]]) {
      const w = new THREE.Shape();
      w.moveTo(-0.4, -0.6); w.lineTo(-0.4, 0.2); w.absarc(0, 0.2, 0.4, Math.PI, 0, true); w.lineTo(0.4, -0.6); w.lineTo(-0.4, -0.6);
      b.extrude(w, 0.02, 0xffffff, { p: [px, py, pz] }, 0, 6);
    }
    return b.geometry();
  }), x, y, fz, 'burgfenster', false, winMat);
  ev.updaters.push((dt, t) => winMat.color.setHex(Math.sin(t * 4.1) + Math.sin(t * 1.7) > 1.3 ? 0xffc04a : 0xff7a1a));
  // Ecktürme (Registry 'festungsturm', sonst eigene)
  for (const sx of [-1, 1]) {
    const tx = x + sx * 12.6, tz = fz - 1;
    if (!bake7(ev, 'festungsturm', { height: 8, radius: 2.2 }, [tx, y, tz], FRONT, 1, null, true, 6000)) {
      addGeo(ev, 'w7m:tower:8:2.2:red', () => roundTowerGeo(8, 2.2, 0xc4304e), tx, y, tz);
      addGeo(ev, 'w7m:towerwin:red', () => towerWindowsGeo(8, 2.2, 0xffa03a), tx, y, tz, 0, false, 'glow');
    }
    solidCyl(ev, tx, tz, 2.4, y, y + 12, 'burgturm');
  }
  // Fallgitter im Tor (hochgezogen), Banner des Barons (wehen)
  if (!bake7(ev, 'fallgitter', { width: 3.4, height: 4.0 }, [x, y, fz + 1.25], FRONT, 1, { open: 0.7 }, true, 3500)) {
    addGeo(ev, 'w7m:keepbars', () => {
      const b = new Build();
      for (let i = -3; i <= 3; i++) b.box(0.12, 1.6, 0.12, 0x6a6a74, { p: [i * 0.5, 3.6, 1.32] }, 0, 1);
      return b.geometry();
    }, x, y, fz);
  }
  let banners = 0;
  for (const sx of [-4.4, 4.4]) if (live7(ev, 'brummbaer_banner', { height: 3.0, width: 1.5 }, [x + sx, y + 5.2, fz + 0.62], FRONT, 1, { sway: 0.35 }, true, 1200)) banners++;
  if (!banners) {
    addGeo(ev, 'w7m:keepbanners', () => {
      const b = new Build();
      for (const sx of [-4.4, 4.4]) { b.box(1.4, 2.6, 0.08, 0xc4304e, { p: [sx, 3.6, 0.6] }, 0, 1); b.box(1.4, 0.16, 0.12, 0xffc21a, { p: [sx, 4.9, 0.62] }, 0, 1); }
      return b.geometry();
    }, x, y, fz);
  }
  solidBox(ev, x - 12, y, fz - 11, x + 12, y + 14, fz + 0.6, 'burg');
  // Kampfwagen des Barons vor dem Tor (eigene sparsame Gestaltung: roter Panzerwagen mit Stachel-Pflug und Wappen)
  const cw = [x + 8.6, y, fz + 4.4];
  addGeo(ev, 'w7m:warcar', () => {
    const b = new Build();
    b.box(3.6, 1.1, 2.0, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xe8484a : mix(0x8a1a22, 0xc8303a, 0.6)) }, { p: [0, 0.95, 0] }, 0.12);
    b.box(1.6, 0.7, 1.7, 0x5a1a22, { p: [-0.5, 1.8, 0] }, 0.1);
    for (const [px, pz] of [[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]]) { b.cyl(0.55, 0.55, 0.42, 0x2a2a30, { p: [px, 0.55, pz * 1.02], r: [Math.PI / 2, 0, 0] }, 10); b.cyl(0.2, 0.2, 0.46, 0xffc23a, { p: [px, 0.55, pz * 1.02], r: [Math.PI / 2, 0, 0] }, 6); }
    for (let i = 0; i < 5; i++) b.cone(0.13, 0.5, 0xf4ecd8, { p: [1.95, 0.9, -0.8 + i * 0.4], r: [0, 0, -Math.PI / 2] }, 5);
    b.cyl(0.18, 0.22, 1.6, 0x1e1e26, { p: [0.4, 2.3, 0], r: [0, 0, -Math.PI / 2 + 0.2] }, 8);
    for (const s of [-1, 1]) b.cyl(0.32, 0.32, 0.04, 0xffc23a, { p: [0, 1.0, s * 1.02], r: [Math.PI / 2, 0, 0] }, 10);
    b.cyl(0.02, 0.02, 1.4, 0xd8d0c8, { p: [-1.5, 2.2, 0.6] }, 3);
    b.box(0.6, 0.4, 0.04, 0x7a1630, { p: [-1.2, 2.7, 0.6] }, 0);
    return b.geometry();
  }, cw[0], cw[1], cw[2], -0.5);
  solidCyl(ev, cw[0], cw[2], 1.9, y, y + 2.4, 'kampfwagen');
  addInfo(ev, () => ({ keep: { banners } }));
  modelsInfo(ev);
}

void LAVA_GLOW; void basaltGroupGeo; void beatNow7;
