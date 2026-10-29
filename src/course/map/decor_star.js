// Kulissen der Eingänge der Bonuswelt Stern (Kurs-Karte „Sternenzelt“, Welt 9, eigene Gestaltung), aufgerufen aus
// EntranceView.decorate(). In Klammern die Registry-Modelle der Bonuswelten (models/kinds/*_star.js) und vorhandene, die benutzt
// werden, sobald es sie gibt – mit Dreiecks-Obergrenze; sonst eigene sparsame Geometrie an gleicher Stelle:
//   rainbowisle    S-1        Regenbogeninsel: Sternen-Torbogen ('sternen_torbogen'), großer leuchtender Regenbogen auf zwei
//                             Wolken, eine Hüpfmaus hüpft im Kreis ('huepfmaus'), ein Sternring dreht sich ('star_ring')
//   platefield     S-2        Planetoiden-Plattenfeld: Farbplatten ('farbplatte', Instanzen) wechseln je Zählzeit der Kartenmusik
//                             die Farbe (Schachbrett), Drehplatten ('drehplatte', Instanzen) schweben über dem All und kippen je
//                             Takt, Plattentreppe an einer Sternenwand ('plattenwand'), ein kleiner Eisplanet ('planet' eis)
//   spindiorama    S-Kapitän  Krümels Drehdiorama: mechanische Drehscheibe ('diorama_drehscheibe') dreht sich langsam, Krümel
//                             ('kruemel') fährt darauf mit, zwei Funkenflämmchen tanzen am Rand (eigene Glühtropfen)
//   rollerisle     S-3        Holz-Walzen-Insel: Schienenpaar ('walzen_schiene') mit rollender Schienenwalze ('schienenwalze'),
//                             Holz-Athletik (Balken, rot-weiße Pfosten) und drei kleine drehende Holzwalzen (Instanzen)
//   goalcloud      S-4        Wolkeninsel: der Zielmast mit Flügeln ('zielmast_fluegel') fliegt Kreise über der Wolke, eine
//                             Landewolke schwebt daneben; Donut-Blöcke und Boost-Pfeile stehen als Requisiten (w9.js)
//   blockland      S-5        Retro-Blockland: ?-Block-Reihe und Grasblock-Treppe ('retro_block'), Pixel-Hügel, Retro-Wolken
//                             ('retro_wolke'), ein Riesen-?-Turm ('riesen_frageblock_turm') wächst und schrumpft im Takt, eine
//                             kleine Laufbombe (eigene Figur) trippelt hin und her
//   honeycomb      S-6        Wabeninsel: Wabenfeld ('wabe', Instanzen; Ringe leuchten im Takt), Lavawaben am Rand, ein Brummer
//                             ('brummer') kreist, eine Wurfsichel ('wurfsichel_item') schwebt über dem Feld
//   giantjungle    S-7        Riesen-Dschungel: Riesenblume und Riesenpilz ('riesenpflanze'), Lianen, Riesengras, ein
//                             Großrollpilz ('grossrollpilz') rollt im Kreis
//   fogyard        S-8        verschneiter Nebelfriedhof: Schneegräber ('schneegrab'), Eisenzaun, Nebelbänke ('nebelbank'),
//                             zwei Nebelplattformen ('nebelplattform') steigen und sinken über dem All und blenden aus und ein,
//                             ein Kreisgeist ('kreisgeist') kreist um das große Grab, leiser Schneefall
//   cannonstation  S-9        futuristische Kanonen-Station: Glaskuppel ('weltraum_kuppel'), Rohrschiene ('brett_schiene') mit
//                             Weiche ('weiche') und hin- und herfahrendem Schienenbrett ('schienenbrett'), Sternkanone schießt
//                             eine Kanonenkugel ('kanonenkugel_tritt') im Bogen, Kanonen-Helm ('helm_kanone') dreht sich, Neonbogen
// Benutzte Modelle meldet state().decor.w9models, zu schwere w9heavy (Name → Dreiecke). Große, unbewegte Teile gehen in die
// verschmolzene statische Geometrie (Registry-Modelle je Eingang in eine kompakte Kachel 'w9:<Id>' mit Fern-Ausblendung), bewegte
// sind eigene Objekte (ev.updaters), gleichartige als Instanzen. Bewegte Objekte stehen schon beim Bau an ihrer Startlage (lod.js).

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { createInstanced } from '../models/lib/instanced.js';
import { bakeModel } from './bake.js';
import { LowBuild as Build, place } from './desert.js';
import { beatNow9, beatPulse9, W9_USED, W9_HEAVY, tooHeavy9, GLOW_TILE9, RAINBOW9 } from './sterne9.js';

/** Kulisse für eine Sternenzelt-Art bauen; false = unbekannte Art. */
export function decorateStar(ev, kind, x, y, z) {
  switch (kind) {
    case 'rainbowisle': rainbowIsle(ev, x, y, z); return true;
    case 'platefield': plateField(ev, x, y, z); return true;
    case 'spindiorama': spinDiorama(ev, x, y, z); return true;
    case 'rollerisle': rollerIsle(ev, x, y, z); return true;
    case 'goalcloud': goalCloud(ev, x, y, z); return true;
    case 'blockland': blockLand(ev, x, y, z); return true;
    case 'honeycomb': honeyComb(ev, x, y, z); return true;
    case 'giantjungle': giantJungle(ev, x, y, z); return true;
    case 'fogyard': fogYard(ev, x, y, z); return true;
    case 'cannonstation': cannonStation(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const PI = Math.PI;
const FRONT = -PI / 2;   // Registry-Modelle blicken nach +X, die Kulissen nach +Z (Kamera)
const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const hash = (x) => { const h = Math.sin(x * 12.9898) * 43758.5453; return h - Math.floor(h); };

/**
 * Registry-Modell als statische Kulisse einbacken (false, solange es fehlt oder zu schwer ist); Kachel 'w9:<Id>' mit
 * Fern-Ausblendung; Leuchtteile in die gemeinsame Leucht-Kachel, Teile ohne Schatten in die Zonen-Kachel.
 */
function bake9(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true, maxTris = 6000, dt = 0) {
  if (!hasModel(name) || tooHeavy9(name, opts, maxTris)) return false;
  const add = (g, o) => (o?.material === 'glow' ? ev.addStatic(g, { ...o, castShadow: false, tile: GLOW_TILE9 })
    : cast && o?.castShadow !== false ? ev.addStatic(g, { ...o, tile: `w9:${ev.id}`, lod: true })
      : ev.addStatic(g, { ...o, castShadow: false }));
  const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state, dt);
  if (ok) W9_USED.add(name);
  return ok;
}
/** Registry-Modell als bewegtes Objekt; state = Objekt/String oder Funktion (dt, t) → state. null, wenn es fehlt. */
function live9(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true, maxTris = 8000, far = 50, follow = false) {
  if (!hasModel(name) || tooHeavy9(name, opts, maxTris)) return null;
  const m = getModel(name, opts ?? {});
  if (m.placeholder) { m.dispose?.(); return null; }
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
  ev.view.add(m.root);
  ev.own.push(m);
  m.update(0, typeof state === 'function' ? state(0, 0) : state);
  ev.updaters.push((dt, t) => m.update(dt, typeof state === 'function' ? state(dt, t) : state));
  cullByView(ev, m.root, pos[0], pos[1] + 1.5, pos[2], 5 * scale, far, follow);
  W9_USED.add(name);
  return m;
}
/** Objekt nur zeichnen, wenn seine Hüllkugel im Bild und näher als far m ist (Mitte folgt optional dem Objekt). */
function cullByView(ev, obj, cx, cy, cz, r, far = 60, follow = false) {
  const F = new THREE.Frustum(), M = new THREE.Matrix4(), S = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
  ev.updaters.push(() => {
    const cam = ev.view.camera;
    if (follow) S.center.set(obj.position.x, obj.position.y + 1, obj.position.z);
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    obj.visible = cam.position.distanceTo(S.center) - r < far && F.intersectsSphere(S);
  });
}
/** Instanz-Fläche (eigenes Material nach Vertexfarben), ohne Frustum-Culling (die Instanzen bewegen sich). */
function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.5, opts.extra ?? {}, opts.key ?? 'w9inst'), n);
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = `w9:${opts.name ?? 'instanzen'}`;
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
/** Statische Geometrie (gecacht) an (x, y, z) einbacken. */
function addGeo(ev, key, make, x, y, z, yaw = 0, cast = true, material) {
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), { castShadow: material === 'glow' ? false : cast, material, ...(material === 'glow' ? { tile: GLOW_TILE9 } : {}) });
}
/** Eigenes bewegtes Mesh (Vertexfarben) an (x, y, z). */
function mover(ev, geo, x, y, z, name, shadow = true, material = null) {
  const m = new THREE.Mesh(geo, material ?? vcol(0.5, {}, 'w9decor'));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.name = `w9:${name}`;
  ev.view.add(m);
  return m;
}
/** Zustand für Tests (state().decor) ergänzen. */
function addInfo(ev, fn) {
  const prev = ev.liveInfo;
  ev.liveInfo = () => ({ ...(prev ? prev() : {}), ...fn() });
}
const modelsInfo = (ev) => addInfo(ev, () => ({ w9models: [...W9_USED].sort(), w9heavy: Object.fromEntries(W9_HEAVY) }));
/** Taktstellung: ganze Zählzeit, Bruchteil, Puls. */
function beatAt(t) {
  const bt = beatNow9(t);
  const whole = Math.floor(bt.beat);
  return { ...bt, whole, frac: bt.beat - whole, k: beatPulse9(bt.beat - whole) };
}
/** Wolkenkuppen (Weltlage bzw. um 0), weiß mit lila Bauch. */
function cloudPuffs(b, list) {
  for (const [px, py, pz, r] of list) b.sphere(r, { v: (qx, qy, qz, nx, ny) => mix(0xc8c4f4, 0xffffff, ny * 0.55 + 0.5) }, { p: [px, py, pz], s: [1, 0.72, 1] }, 10, 7);
}

// ------------------------------------------------------------------ S-1 Regenbogeninsel

function rainbowIsle(ev, x, y, z) {
  // Sternen-Torbogen hinter dem Podest (Füße bei x ± 3, Durchgang zur Kamera)
  if (!bake9(ev, 'sternen_torbogen', { width: 6, height: 5 }, [x, y, z], PI / 2, 1, null, true, 4600)) {
    addGeo(ev, 'w9m:arch', () => {
      const b = new Build();
      for (const s of [-1, 1]) b.cyl(0.3, 0.38, 3.2, 0xf4f0ff, { p: [s * 3, 1.6, 0] }, 10);
      for (let i = 0; i <= 8; i++) { const a = (i / 8) * PI; b.sphere(0.42, RAINBOW9[i % 7], { p: [Math.cos(a) * 3, 3.2 + Math.sin(a) * 1.8, 0] }, 8, 6); }
      return b.geometry();
    }, x, y, z);
  }
  for (const s of [-1, 1]) solidCyl(ev, x + s * 3, z, 0.5, y, y + 4.5, 'torsaeule');
  // großer Regenbogen hinter der Insel: sieben leuchtende Bögen auf zwei Wolken
  const R = 7.4, rz = z - 2.6;
  addGeo(ev, 'w9m:rainbow', () => {
    const b = new Build();
    RAINBOW9.forEach((c, k) => b.torus(R - k * 0.42, 0.22, c, { p: [0, 0, 0] }, 4, 22, PI));
    return b.geometry();
  }, x, y + 0.6, rz, 0, false, 'glow');
  addGeo(ev, 'w9m:rainbowclouds', () => {
    const b = new Build();
    for (const s of [-1, 1]) cloudPuffs(b, [[s * (R - 1.3), 0.6, 0, 1.4], [s * (R - 0.2), 0.4, 0.4, 1.1], [s * (R - 2.3), 0.3, 0.5, 1.0]]);
    return b.geometry();
  }, x, y, rz, 0, true);
  // Hüpfmaus hüpft im Kreis über die Wiese
  const [mx, my, mz] = ev.def.mice?.[0] ?? [x + 10, y, z + 10];
  let hopU = 0;
  const mouse = live9(ev, 'huepfmaus', {}, [mx, my, mz], 0, 1.1, (dt, t) => {
    const per = 0.9, u = (t % per) / per;
    hopU = u;
    return u < 0.75 ? { anim: 'hop', progress: u / 0.75 } : { anim: 'land' };
  }, true, 7000, 45, true);
  if (mouse) {
    ev.updaters.push((dt, t) => {
      const a = t * 0.5, u = hopU;
      mouse.root.position.set(mx + Math.cos(a) * 2.4, my + (u < 0.75 ? Math.sin((u / 0.75) * PI) * 0.9 : 0), mz + Math.sin(a) * 2.4);
      mouse.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    });
  }
  // Sternring dreht sich über der Wiese (S-1 Stern 3)
  const [sx, sy, sz] = ev.def.ring ?? [x + 12, y + 3, z + 3];
  let ringA = 0;
  const ring = live9(ev, 'star_ring', {}, [sx, sy, sz], 0, 0.9, (dt, t) => { ringA = t * 0.8; return 'idle'; }, false, 4000, 55);
  if (ring) ev.updaters.push((dt, t) => { ring.root.rotation.y = t * 0.8; ring.root.position.y = sy + Math.sin(t * 1.4) * 0.25; });
  addInfo(ev, () => ({ rainbow: { mouse: !!mouse, hop: +hopU.toFixed(3), ring: !!ring, ringA: +ringA.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-2 Planetoiden-Plattenfeld

function plateField(ev, x, y, z) {
  const d = ev.def;
  // Farbplatten-Schachbrett (4 × 3): je Zählzeit wechseln alle die Farbe, am Schlag leuchten sie kurz auf
  const cols = 4, rows = 3, gap = 2.15;
  const fx0 = x - ((cols - 1) * gap) / 2, fz0 = z - ((rows - 1) * gap) / 2;
  let tiles = null;
  try { tiles = hasModel('farbplatte') ? createInstanced('farbplatte', cols * rows, { size: 2, colors: ['rot', 'blau'] }) : null; } catch { tiles = null; }
  const cells = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) cells.push([fx0 + i * gap, fz0 + j * gap, (i + j) & 1]);
  let tileStep = 0, tileFlash = 0;
  if (tiles) {
    W9_USED.add('farbplatte');
    cells.forEach(([px, pz], k) => tiles.setAt(k, [px, y + 0.01, pz], 0, 1, 'idle'));
    tiles.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    ev.view.add(tiles.root);
    ev.own.push(tiles);
    const put = (t) => {
      const b = beatAt(t);
      tileStep = ((b.whole % 2) + 2) % 2; tileFlash = Math.max(0, 1 - b.frac * 3);
      cells.forEach(([, , par], k) => tiles.setState(k, { color: (par + tileStep) & 1, flash: tileFlash }));
      tiles.update(0);
    };
    put(0);
    ev.updaters.push((dt, t) => put(t));
  } else {
    addGeo(ev, 'w9m:tilesfb', () => {
      const b = new Build();
      cells.forEach(([px, pz, par]) => b.box(2, 0.25, 2, par ? 0x3a6ae8 : 0xe8485a, { p: [px - x, 0.125, pz - z] }, 0.05));
      return b.geometry();
    }, x, y, z);
  }
  solidBox(ev, fx0 - 1.05, y, fz0 - 1.05, fx0 + (cols - 1) * gap + 1.05, y + 0.25, fz0 + (rows - 1) * gap + 1.05, 'farbplatten');
  // Drehplatten schweben über dem All (nördlich der Insel) und kippen je Takt
  const flips = d.flips ?? [[x - 15, z - 3], [x - 11, z - 3]];
  const fl = [];
  for (const [px, pz] of flips) for (let k = 0; k < 2; k++) fl.push([px + k * 2.3, pz - 3.6 - (k & 1) * 0.6]);
  let plates = null, tilt = 0;
  try { plates = hasModel('drehplatte') ? createInstanced('drehplatte', fl.length, { size: [2, 2], axis: 'z', color: 'blau', back: 'lila' }) : null; } catch { plates = null; }
  if (plates) {
    W9_USED.add('drehplatte');
    fl.forEach(([px, pz], k) => plates.setAt(k, [px, y - 0.6 - (k % 2) * 0.4, pz], 0, 1, 'idle'));
    ev.view.add(plates.root);
    ev.own.push(plates);
    const putP = (t) => {
      const b = beatAt(t);
      const bar = Math.floor(b.whole / 4), inBar = (b.beat / 4) - bar;
      const dir = bar & 1 ? 1 : -1;
      // in der letzten Zählzeit des Takts zittern, am Taktanfang kippen (0,55 rad), dann langsam zurück
      tilt = inBar < 0.2 ? dir * 0.55 * Math.sin((inBar / 0.2) * PI / 2) : inBar < 0.75 ? dir * 0.55 * (1 - (inBar - 0.2) / 0.55) : 0;
      fl.forEach((_, k) => plates.setState(k, { tilt: (k & 1 ? -tilt : tilt), shake: inBar > 0.75 ? (inBar - 0.75) * 4 : 0 }));
      plates.update(0);
    };
    putP(0);
    ev.updaters.push((dt, t) => putP(t));
  }
  // Plattentreppe an einer Sternenwand (Nordost-Ecke): Platten fahren aus der Wand
  const [wx, wy, wz] = d.steps ?? [x + 8, y, z + 4];
  addGeo(ev, 'w9m:platewall', () => {
    const b = new Build();
    b.box(1.2, 4.6, 8.4, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xd8d0ff : Math.abs(nx) > 0.6 ? mix(0x5a5ac8, 0x9a9af0, py / 4.6 + 0.5) : 0x4a48a8) }, { p: [0.6, 2.3, 0] }, 0.08);
    b.box(1.3, 0.16, 8.5, 0xffc83a, { p: [0.6, 4.62, 0] }, 0.04);
    for (const [py, pz] of [[0.2, 3.2], [1.6, 0.6], [3.0, -1.6], [0.4, -3.4]]) b.extrude(new THREE.Shape().moveTo(0, 0.5).lineTo(0.15, 0.15).lineTo(0.5, 0).lineTo(0.15, -0.15).lineTo(0, -0.5).lineTo(-0.15, -0.15).lineTo(-0.5, 0).lineTo(-0.15, 0.15).lineTo(0, 0.5), 0.05, 0xffe27a, { p: [-0.03, py + 0.6, pz], r: [0, -PI / 2, 0] }, 0, 1);
    return b.geometry();
  }, wx, wy, wz - 6.2, 0, true);
  solidBox(ev, wx, wy, wz - 10.4, wx + 1.2, wy + 4.6, wz - 2, 'plattenwand');
  const stepsAt = [[wy + 0.6, wz - 3.4, 'blau'], [wy + 1.8, wz - 5.6, 'rot'], [wy + 3.0, wz - 7.8, 'gelb']];
  for (const [py, pz, color] of stepsAt) {
    if (!bake9(ev, 'plattenwand', { size: [2, 0.6], depth: 1.6, color }, [wx, py, pz], PI, 1, { out: 1 }, true, 2200, 5)) {
      addGeo(ev, `w9m:platestep:${color}`, () => new Build().box(1.6, 0.6, 2, { blau: 0x3a6ae8, rot: 0xe8485a, gelb: 0xffc81a }[color], { p: [-0.8, 0.3, 0] }, 0.06).geometry(), wx, py, pz);
    }
    solidBox(ev, wx - 1.6, py, pz - 1, wx, py + 0.6, pz + 1, 'plattenstufe');
  }
  // kleiner Eisplanet schwebt neben der Insel
  const [ix, iy, iz] = d.planet ?? [x - 25.5, y + 2.5, z + 6];
  if (!bake9(ev, 'planet', { kind: 'eis', size: 3.4 }, [ix, iy - 1.7, iz], 0.4, 1, null, false, 4400)) {
    ev.addStatic(place(new Build().sphere(1.7, { v: (px, py) => mix(0x8ad8ff, 0xf0faff, py / 3.4 + 0.5) }, null, 14, 10).geometry(), ix, iy, iz), { castShadow: false });
  }
  addInfo(ev, () => ({ plates: { tiles: !!tiles, flips: fl.length, step: tileStep, flash: +tileFlash.toFixed(3), tilt: +tilt.toFixed(3), registry: !!plates } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-Kapitän Krümels Drehdiorama

function spinDiorama(ev, x, y, z) {
  const R = 4.6;
  let angle = 0;
  const disc = live9(ev, 'diorama_drehscheibe', { radius: R, height: 1.0, teeth: 40 }, [x, y, z], 0, 1, (dt, t) => { angle = t * 0.22; return { angle }; }, true, 8000, 60);
  let discOwn = null;
  if (!disc) {
    discOwn = mover(ev, cached('w9m:discfb', () => {
      const b = new Build();
      b.cyl(R, R + 0.2, 1, { v: (px, py, pz) => ((Math.floor(Math.atan2(pz, px) / (PI / 8)) & 1) ? 0x3ac8b0 : 0xf0c090) }, { p: [0, 0.5, 0] }, 32);
      b.cyl(0.9, 0.9, 1.1, 0xffc83a, { p: [0, 0.55, 0] }, 16);
      return b.geometry();
    }), x, y, z, 'drehscheibe');
    ev.updaters.push((dt, t) => { angle = t * 0.22; discOwn.rotation.y = angle; });
  }
  solidCyl(ev, x, z, R + 0.15, y, y + 1.0, 'drehscheibe');
  // Krümel fährt auf der Scheibe mit (jubelt ab und zu)
  const pivot = new THREE.Group();
  pivot.position.set(x, y + 1.0, z);
  ev.view.add(pivot);
  ev.own.push({ dispose: () => pivot.parent?.remove(pivot) });
  let kr = null;
  if (hasModel('kruemel') && !tooHeavy9('kruemel', {}, 8000)) {
    kr = getModel('kruemel', {});
    if (kr.placeholder) { kr.dispose?.(); kr = null; }
  }
  if (kr) {
    kr.root.position.set(2.2, 0, 0.6);
    kr.root.rotation.y = FRONT + 0.6;
    kr.root.scale.setScalar(1.6);
    pivot.add(kr.root);
    ev.own.push(kr);
    W9_USED.add('kruemel');
    ev.updaters.push((dt, t) => kr.update(dt, { anim: Math.sin(t * 0.6) > 0.85 ? 'cheer' : 'idle' }));
  }
  // zwei Funkenflämmchen tanzen am Scheibenrand (eigene Glühtropfen, eine Instanz-Fläche)
  const flameG = cached('w9m:flame', () => {
    const b = new Build();
    b.sphere(0.28, 0xffd23a, { p: [0, 0.3, 0], s: [1, 1.25, 1] }, 8, 6);
    b.cone(0.2, 0.5, 0xff7a1a, { p: [0, 0.75, 0] }, 6);
    b.sphere(0.16, 0xfff6c8, { p: [0, 0.3, 0.12] }, 6, 4);
    return b.geometry();
  });
  const flames = instanced(ev, flameG, 2, { name: 'funkenflaemmchen', material: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }) });
  ev.own.push(flames.material);
  const putF = (t) => {
    for (let i = 0; i < 2; i++) {
      const a = angle + i * PI + 0.8, hop = Math.abs(Math.sin(t * 4 + i * 1.7)) * 0.35;
      setInst(flames, i, x + Math.cos(a) * (R - 0.8), y + 1.0 + hop, z - Math.sin(a) * (R - 0.8), -a, 1 + Math.sin(t * 9 + i) * 0.08);
    }
    flames.instanceMatrix.needsUpdate = true;
  };
  putF(0);
  ev.updaters.push((dt, t) => { pivot.rotation.y = angle; putF(t); });
  cullByView(ev, flames, x, y + 1, z, R + 1, 60);
  cullByView(ev, pivot, x, y + 1, z, R + 1, 60);
  addInfo(ev, () => ({ diorama: { angle: +angle.toFixed(3), registry: !!disc, kruemel: !!kr } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-3 Holz-Walzen-Insel

function rollerIsle(ev, x, y, z) {
  const len = 12, gauge = 6.4, ry = y + 0.6;
  if (!bake9(ev, 'walzen_schiene', { length: len, gauge, height: 0.6, ends: true }, [x, ry, z], 0, 1, null, true, 5200)) {
    addGeo(ev, 'w9m:rails', () => {
      const b = new Build();
      for (const s of [-1, 1]) b.box(0.4, 0.6, len, 0xc88a4a, { p: [s * gauge / 2, -0.3, 0] }, 0.04);
      return b.geometry();
    }, x, ry, z);
  }
  solidBox(ev, x - gauge / 2 - 0.4, y, z - len / 2, x + gauge / 2 + 0.4, y + 3.8, z + len / 2, 'walzenbahn');
  // rollende Schienenwalze: hin und her entlang der Schienen
  const Rw = 1.4;
  let wz = z, wa = 0;
  const roll = live9(ev, 'schienenwalze', { radius: Rw, length: gauge }, [x, ry, z], 0, 1, () => ({ angle: wa }), true, 7000, 60);
  let rollOwn = null;
  if (!roll) {
    rollOwn = mover(ev, cached('w9m:walzefb', () => new Build().cyl(Rw, Rw, gauge, { v: (px, py, pz) => ((Math.floor(Math.atan2(py, pz) / (PI / 6)) & 1) ? 0xe0a868 : 0xc88a4a) }, { r: [0, 0, PI / 2] }, 18).geometry()), x, ry + Rw + 0.2, z, 'walze');
  }
  ev.updaters.push((dt, t) => {
    wz = z + Math.sin(t * 0.45) * (len / 2 - Rw - 0.6);
    wa = -(wz - z) / (Rw + 0.2);
    if (roll) roll.root.position.z = wz;
    if (rollOwn) { rollOwn.position.z = wz; rollOwn.rotation.x = wa; }
  });
  // Holz-Athletik am Seitenweg: Balken auf rot-weißen Pfosten, drei kleine drehende Holzwalzen (Instanzen)
  const [sx, sy, sz] = ev.def.side ?? [x + 11, y, z + 6];
  addGeo(ev, 'w9m:athletics', () => {
    const b = new Build();
    for (const [px, pz, h] of [[-2.4, -3, 1.2], [2.4, -3, 1.2], [-2.4, 3, 1.8], [2.4, 3, 1.8]]) {
      b.cyl(0.18, 0.2, h, { v: (qx, qy) => (Math.floor((qy + h / 2) * 2.5) & 1 ? 0xe8433a : 0xffffff) }, { p: [px, h / 2, pz] }, 8);
      b.sphere(0.22, 0xffc83a, { p: [px, h + 0.1, pz] }, 6, 4);
    }
    b.box(0.5, 0.3, 6.4, 0xe0a868, { p: [-2.4, 1.35, 0], r: [-0.1, 0, 0] }, 0.05);
    b.box(0.5, 0.3, 6.4, 0xe0a868, { p: [2.4, 1.35, 0], r: [-0.1, 0, 0] }, 0.05);
    return b.geometry();
  }, sx, sy, sz, 0, true);
  for (const s of [-1, 1]) solidBox(ev, sx + s * 2.4 - 0.3, sy, sz - 3.3, sx + s * 2.4 + 0.3, sy + 2, sz + 3.3, 'balken');
  const logG = cached('w9m:log', () => new Build().cyl(0.55, 0.55, 2.6, { v: (px, py, pz) => (Math.floor((Math.atan2(pz, px) + PI) / (PI / 4)) & 1 ? 0xe0a868 : 0xb87a40) }, { r: [0, 0, PI / 2] }, 10).geometry());
  const logs = instanced(ev, logG, 3, { name: 'holzwalzen', shadow: true });
  let logA = 0;
  const putL = (t) => {
    logA = t * 1.6;
    for (let i = 0; i < 3; i++) setInst(logs, i, sx, sy + 0.6 + i * 0.05, sz - 1.8 + i * 1.8, 0, 1, (i & 1 ? -logA : logA), 0);
    logs.instanceMatrix.needsUpdate = true;
  };
  putL(0);
  ev.updaters.push((dt, t) => putL(t));
  cullByView(ev, logs, sx, sy + 1, sz, 4, 60);
  addInfo(ev, () => ({ roller: { z: +wz.toFixed(3), angle: +wa.toFixed(3), registry: !!roll, logs: +logA.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-4 Wolkeninsel mit fliegendem Zielmast

function goalCloud(ev, x, y, z) {
  const [cx, cy, cz, r] = ev.def.fly ?? [x, y + 7, z, 6];
  let fa = 0, fy = cy;
  const PS = 0.62;   // auf der Karte kleiner (der ganze Mast soll ins Bild passen)
  const pole = live9(ev, 'zielmast_fluegel', { height: 7 }, [cx + r, cy, cz], 0, PS, () => ({ fly: 1 }), true, 8000, 70, true);
  let poleOwn = null;
  if (!pole) {
    poleOwn = mover(ev, cached('w9m:polefb', () => {
      const b = new Build();
      b.box(1, 1, 1, 0x9aa0b8, { p: [0, 0.5, 0] }, 0.05);
      b.cyl(0.1, 0.1, 6, 0xf0f0f8, { p: [0, 4, 0] }, 8);
      for (const s of [-1, 1]) b.sphere(1, 0xffffff, { p: [0, 5.6, s * 1.2], s: [0.6, 0.25, 1.4] }, 8, 6);
      b.extrude(new THREE.Shape().moveTo(0, 0.5).lineTo(0.47, 0.15).lineTo(0.29, -0.4).lineTo(-0.29, -0.4).lineTo(-0.47, 0.15).lineTo(0, 0.5), 0.15, 0xffd23a, { p: [0, 7.3, 0] }, 0, 1);
      return b.geometry();
    }), cx + r, cy, cz, 'zielmast');
    poleOwn.scale.setScalar(PS);
  }
  const obj = pole?.root ?? poleOwn;
  ev.updaters.push((dt, t) => {
    fa = t * 0.38;
    fy = cy + Math.sin(t * 1.3) * 0.8;
    obj.position.set(cx + Math.cos(fa) * r, fy, cz - Math.sin(fa) * r);
    // fliegt gegen den Uhrzeigersinn (von oben): Blick (+X des Modells) entlang der Bahn
    obj.rotation.y = fa + PI / 2;
  });
  // Landewolke schwebt neben der Insel (Ziel der Verfolgung)
  addGeo(ev, 'w9m:landcloud', () => {
    const b = new Build();
    cloudPuffs(b, [[0, 0, 0, 1.6], [-1.6, -0.2, 0.3, 1.2], [1.7, -0.1, -0.2, 1.3], [0.4, 0.5, -0.6, 1.1]]);
    return b.geometry();
  }, x - 13, y + 3, z + 4, 0, false);
  // Boost-Wolkenkissen am Rand (Optik)
  addGeo(ev, 'w9m:cloudbumps', () => {
    const b = new Build();
    cloudPuffs(b, [[-3, 0.2, 2, 0.9], [-1.6, 0.15, 3, 0.7], [3.4, 0.2, -2.6, 0.8]]);
    return b.geometry();
  }, x, y, z, 0, true);
  addInfo(ev, () => ({ goalpole: { angle: +fa.toFixed(3), y: +fy.toFixed(3), registry: !!pole } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-5 Retro-Blockland

function blockLand(ev, x, y, z) {
  // Pixel-Hügel hinter dem Blockfeld (Optik): grüne Kuppe mit dunklen Streifen und zwei Pixel-Augen
  addGeo(ev, 'w9m:pixelhill', () => {
    const b = new Build();
    b.add(new THREE.SphereGeometry(5, 14, 8, 0, TAU, 0, PI / 2), { v: (px, py, pz, nx, ny) => (Math.floor((px + 10) / 1.2) % 4 === 0 && ny < 0.9 ? 0x2a9a2a : mix(0x3ec43a, 0x7ae05a, ny)) }, { s: [1.2, 0.9, 0.7] });
    for (const s of [-1, 1]) b.box(0.4, 0.9, 0.2, 0x1a3a1a, { p: [s * 1.1, 3.2, 3.3] }, 0);
    return b.geometry();
  }, x + 2, y, z - 6, 0, true);
  solidBox(ev, x + 2 - 5.6, y, z - 6 - 3.2, x + 2 + 5.6, y + 4.3, z - 6 + 3.2, 'pixelhuegel');
  // ?-Block-Reihe in der Luft (Ziegel, ?, Ziegel, ?, Ziegel) und Grasblock-Treppe (3-2-1)
  const B = 1.6;
  const row = ['ziegel', 'frage', 'ziegel', 'frage', 'ziegel'];
  row.forEach((k, i) => {
    const px = x - 3.2 + i * B, py = y + 3.6;
    if (!bake9(ev, 'retro_block', { kind: k, size: B }, [px, py, z + 1], FRONT, 1, null, true, 1200)) {
      addGeo(ev, `w9m:rb:${k}`, () => new Build().box(B, B, B, k === 'frage' ? 0xffc81a : 0xe0642e, { p: [0, B / 2, 0] }, 0.08).geometry(), px, py, z + 1);
    }
  });
  solidBox(ev, x - 3.2 - B / 2, y + 3.6, z + 1 - B / 2, x - 3.2 + 4.5 * B, y + 3.6 + B, z + 1 + B / 2, 'blockreihe');
  const stair = [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [2, 2]];
  for (const [i, j] of stair) {
    const px = x + 6 + i * 2, py = y + j * 2;
    if (!bake9(ev, 'retro_block', { kind: j === 2 || (i === 0) || (i === 1 && j === 1) ? 'gras' : 'erde', size: 2 }, [px, py, z - 1], FRONT, 1, null, true, 1200)) {
      addGeo(ev, 'w9m:rb:gras', () => new Build().box(2, 2, 2, 0x6ad84a, { p: [0, 1, 0] }, 0.08).geometry(), px, py, z - 1);
    }
  }
  solidBox(ev, x + 5, y, z - 2, x + 11, y + 2, z, 'grastreppe');
  solidBox(ev, x + 7, y + 2, z - 2, x + 11, y + 4, z, 'grastreppe');
  solidBox(ev, x + 9, y + 4, z - 2, x + 11, y + 6, z, 'grastreppe');
  // Retro-Wolken über der Insel
  for (const [px, py, pz, s, seed] of [[x - 10, y + 9, z - 2, 4.5, 0], [x + 9, y + 10.5, z - 6, 3.6, 1]]) {
    if (!bake9(ev, 'retro_wolke', { size: s, seed }, [px, py, pz], FRONT, 1, null, false, 2000)) {
      addGeo(ev, 'w9m:rcloudfb', () => { const b = new Build(); cloudPuffs(b, [[0, 0, 0, 1.3], [-1.2, -0.3, 0, 1], [1.2, -0.3, 0, 1]]); return b.geometry(); }, px, py, pz, 0, false);
    }
  }
  // Riesen-?-Turm: zwei Segmente und der Kopf, wächst über zwei Takte und schrumpft wieder; der Kopf hüpft je Takt
  const [tx, ty, tz] = ev.def.tower ?? [x + 11, y, z - 5];
  const segs = [];
  for (let i = 0; i < 2; i++) { const m = live9(ev, 'riesen_frageblock_turm', { size: 2, part: 'segment' }, [tx, ty + i * 2, tz], FRONT, 1, 'idle', true, 4000, 70); if (m) segs.push(m); }
  let bumpN = 0, lastBar = -1;
  const head = live9(ev, 'riesen_frageblock_turm', { size: 2, part: 'kopf' }, [tx, ty + 4, tz], FRONT, 1, () => ({ anim: 'bump', n: bumpN }), true, 4000, 70);
  let grow = 1;
  ev.updaters.push((dt, t) => {
    const b = beatAt(t);
    const bar = Math.floor(b.whole / 4), ph = ((bar % 4) + 4) % 4 + (b.beat / 4 - bar);
    grow = ph < 1 ? ph : ph < 2.6 ? 1 : ph < 3.6 ? 1 - (ph - 2.6) : 0;   // wachsen, oben bleiben, schrumpfen, kurz unten
    grow = Math.max(0, Math.min(1, grow));
    if (bar !== lastBar) { lastBar = bar; bumpN++; }
    segs.forEach((m, i) => { m.root.position.y = ty + i * 2 * grow; m.update(0, { out: grow }); });
    if (head) head.root.position.y = ty + 4 * grow;
  });
  solidBox(ev, tx - 1, ty, tz - 1, tx + 1, ty + 2, tz + 1, 'frageturm');
  // kleine Laufbombe trippelt hin und her (eigene Figur, die Registry-Bombe ist für die Karte zu schwer)
  const bomb = mover(ev, cached('w9m:bomb', () => {
    const b = new Build();
    b.sphere(0.5, { v: (px, py, pz, nx, ny) => mix(0x1a1a2e, 0x4a4a6a, ny * 0.5 + 0.5) }, { p: [0, 0.65, 0] }, 12, 9);
    for (const s of [-1, 1]) { b.sphere(0.13, 0xffffff, { p: [0.42, 0.75, s * 0.16] }, 6, 4); b.sphere(0.06, 0x101010, { p: [0.5, 0.75, s * 0.16] }, 4, 3); b.box(0.3, 0.14, 0.18, 0xffb81a, { p: [0.05, 0.08, s * 0.2] }, 0.04); }
    b.cyl(0.04, 0.04, 0.3, 0xd8d8e0, { p: [-0.5, 0.75, 0], r: [0, 0, PI / 2] }, 5);
    b.torus(0.16, 0.04, 0xd8d8e0, { p: [-0.7, 0.75, 0], r: [0, PI / 2, 0] }, 4, 10);
    b.cyl(0.03, 0.03, 0.2, 0xc8a070, { p: [0, 1.2, 0] }, 4);
    return b.geometry();
  }), x - 2, y, z + 5, 'laufbombe');
  let bx = 0;
  ev.updaters.push((dt, t) => {
    bx = Math.sin(t * 0.5) * 4;
    bomb.position.set(x - 2 + bx, y + Math.abs(Math.sin(t * 7)) * 0.08, z + 5.5);
    bomb.rotation.y = Math.cos(t * 0.5) >= 0 ? 0 : PI;
  });
  cullByView(ev, bomb, x - 2, y + 0.6, z + 5.5, 5, 55);
  addInfo(ev, () => ({ blockland: { tower: segs.length + (head ? 1 : 0), grow: +grow.toFixed(3), bumps: bumpN, bomb: +bx.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-6 Wabeninsel

function honeyComb(ev, x, y, z) {
  // Wabenfeld: Mitte, Ring 1 (6), Ring 2 (12) – im Takt leuchtet je Zählzeit ein Ring auf
  const S = 1.0, D = Math.sqrt(3) * S;
  const cells = [];
  const ax = (q, r) => [x + D * (q + r / 2), z + 1.5 * S * r];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    const s = -q - r;
    const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
    if (ring <= 2) cells.push({ pos: ax(q, r), ring });
  }
  let combs = null, lit = 0, flash = 0;
  try { combs = hasModel('wabe') ? createInstanced('wabe', cells.length, { kind: 'normal', size: S * 0.96, thick: 0.4 }) : null; } catch { combs = null; }
  if (combs) {
    W9_USED.add('wabe');
    cells.forEach((c, k) => combs.setAt(k, [c.pos[0], y + 0.01, c.pos[1]], 0, 1, 'idle'));
    combs.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    ev.view.add(combs.root);
    ev.own.push(combs);
    const put = (t) => {
      const b = beatAt(t);
      lit = ((b.whole % 3) + 3) % 3; flash = Math.max(0, 1 - b.frac * 2.2);
      cells.forEach((c, k) => combs.setState(k, c.ring === lit ? { flash, press: flash * 0.4 } : 'idle'));
      combs.update(0);
    };
    put(0);
    ev.updaters.push((dt, t) => put(t));
  } else {
    addGeo(ev, 'w9m:combsfb', () => {
      const b = new Build();
      for (const c of cells) b.cyl(S * 0.95, S * 0.95, 0.4, 0xffc23a, { p: [c.pos[0] - x, 0.2, c.pos[1] - z] }, 6);
      return b.geometry();
    }, x, y, z);
  }
  solidCyl(ev, x, z, 2.5 * D, y, y + 0.4, 'wabenfeld');
  // Lavawaben am Nordrand (heiß – nur Kulisse)
  let lava = null;
  try { lava = hasModel('wabe') ? createInstanced('wabe', 4, { kind: 'lava', size: S * 0.96, thick: 0.4 }) : null; } catch { lava = null; }
  if (lava) {
    [[-3, -3], [-2, -3], [3, -3], [4, -3]].forEach(([q, r], k) => { const [px, pz] = ax(q, r); lava.setAt(k, [px, y + 0.01, pz], 0, 1, 'idle'); });
    lava.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    ev.view.add(lava.root);
    ev.own.push(lava);
    ev.updaters.push((dt) => lava.update(dt));
  }
  // Brummer kreist über dem Feld
  let ba = 0;
  const bz = live9(ev, 'brummer', {}, [x + 4.5, y + 3, z], 0, 1.2, 'idle', true, 4200, 55, true);
  if (bz) ev.updaters.push((dt, t) => { ba = t * 0.7; bz.root.position.set(x + Math.cos(ba) * 4.5, y + 3 + Math.sin(t * 2.2) * 0.4, z - Math.sin(ba) * 4.5); bz.root.rotation.y = ba + PI / 2; });
  // Wurfsichel schwebt über der Mitte und dreht sich
  let sa = 0;
  const sickle = live9(ev, 'wurfsichel_item', {}, [x, y + 2.2, z], 0, 1, 'idle', false, 4000, 55);
  if (sickle) ev.updaters.push((dt, t) => { sa = t * 1.6; sickle.root.rotation.y = sa; sickle.root.position.y = y + 2.2 + Math.sin(t * 1.8) * 0.2; });
  addInfo(ev, () => ({ honeycomb: { cells: cells.length, lit, flash: +flash.toFixed(3), registry: !!combs, lava: !!lava, brummer: !!bz, sickle: +sa.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-7 Riesen-Dschungel

function giantJungle(ev, x, y, z) {
  // Riesenblume und Riesenpilz („alles übergroß“)
  const flower = [x - 8, y, z - 3], mush = [x + 8, y, z - 1];
  if (!bake9(ev, 'riesenpflanze', { kind: 'blume', size: 10 }, flower, FRONT + 0.3, 1, null, true, 4800)) {
    addGeo(ev, 'w9m:flowerfb', () => {
      const b = new Build();
      b.cyl(0.3, 0.4, 9, 0x5ab83a, { p: [0, 4.5, 0] }, 8);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; b.sphere(1.2, 0xff6aa8, { p: [Math.cos(a) * 1.6, 9.2, Math.sin(a) * 1.6 + 0.3], s: [1, 0.3, 0.6] }, 8, 5); }
      b.sphere(1, 0xffc23a, { p: [0, 9.3, 0.4] }, 10, 8);
      return b.geometry();
    }, ...flower);
  }
  solidCyl(ev, flower[0], flower[2], 0.6, y, y + 8, 'riesenblume');
  if (!bake9(ev, 'riesenpflanze', { kind: 'pilz', size: 8 }, mush, FRONT - 0.4, 1, null, true, 4800)) {
    addGeo(ev, 'w9m:mushfb', () => new Build().cyl(0.9, 1.2, 5, 0xfff6e8, { p: [0, 2.5, 0] }, 12).sphere(4, 0xe8323e, { p: [0, 5.4, 0], s: [1, 0.55, 1] }, 16, 10).geometry(), ...mush);
  }
  solidCyl(ev, mush[0], mush[2], 1.3, y, y + 5.5, 'riesenpilz');
  // Lianen zwischen den Riesen und Riesengras (Optik)
  addGeo(ev, 'w9m:lianas', () => {
    const b = new Build();
    b.tube([[-8, 8.6, -3], [-4, 6.2, -2], [0, 5.6, -1.5], [4, 6.4, -1], [8, 6.6, -1]], 0.09, 0x3e8a3a, null, 24, 5);
    for (let i = 0; i < 5; i++) b.sphere(0.32, { v: (px, py, pz, nx, ny) => mix(0x2e8a3a, 0x8ad86a, ny * 0.5 + 0.5) }, { p: [-6 + i * 3, 6.4 - (i % 2) * 0.6, -2 + i * 0.25], s: [1.4, 0.5, 0.9] }, 6, 4);
    // Riesengras: weiche, gebogene Halme (gestreckte Ellipsoide) in Büscheln
    for (let i = 0; i < 9; i++) {
      const gx = -10 + hash(i * 3.1) * 20, gz = -6 + hash(i * 7.7) * 4;
      for (let k = 0; k < 3; k++) {
        const h = 1.6 + hash(i * 1.3 + k) * 1.6, a = k * 2.1 + i;
        b.sphere(1, { v: (px, py, pz, nx, ny) => mix(0x2e8a3a, 0x9ae870, py + 0.6) }, { p: [gx + Math.cos(a) * 0.3, h * 0.9, gz + Math.sin(a) * 0.3], r: [Math.sin(a) * 0.35, a, Math.cos(a) * 0.35], s: [0.22, h, 0.08] }, 6, 5);
      }
    }
    return b.geometry();
  }, x, y, z, 0, true);
  // Großrollpilz rollt im Kreis
  const [rx, rz, rr] = ev.def.roll ?? [x + 6, z + 10, 4];
  let ra = 0;
  const roller = live9(ev, 'grossrollpilz', {}, [rx + rr, y, rz], 0, 1, () => ({ anim: 'walk', speed: 2 }), true, 6000, 55, true);
  if (roller) ev.updaters.push((dt, t) => { ra = t * 0.45; roller.root.position.set(rx + Math.cos(ra) * rr, y, rz - Math.sin(ra) * rr); roller.root.rotation.y = ra + PI / 2; });
  addInfo(ev, () => ({ jungle: { roll: +ra.toFixed(3), roller: !!roller } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-8 Nebelfriedhof

function fogYard(ev, x, y, z) {
  // Schneegräber (lächelnd) und ein großes Grab, Eisenzaun mit Goldspitzen
  const graves = [[x - 4, z + 1, 'rund', 0.1], [x - 1.5, z - 1, 'kreuz', -0.08], [x + 1.5, z - 1.4, 'spitz', 0.06], [x + 4.2, z + 0.6, 'rund', -0.12]];
  for (const [gx, gz, kind, tilt] of graves) {
    if (!bake9(ev, 'schneegrab', { kind, tilt, size: 1.3 }, [gx, y, gz], FRONT, 1, null, true, 2600)) {
      addGeo(ev, 'w9m:gravefb', () => new Build().box(0.9, 1.2, 0.3, 0x9a96b8, { p: [0, 0.6, 0] }, 0.12).box(1.1, 0.3, 0.6, 0xf4f6ff, { p: [0, 0.15, 0] }, 0.1).geometry(), gx, y, gz, tilt);
    }
    solidBox(ev, gx - 0.5, y, gz - 0.3, gx + 0.5, y + 1.3, gz + 0.3, 'grab');
  }
  const big = [x, y, z - 3.6];
  if (!bake9(ev, 'schneegrab', { kind: 'spitz', size: 2.4 }, big, FRONT, 1, null, true, 2600)) {
    addGeo(ev, 'w9m:biggravefb', () => new Build().box(1.6, 2.4, 0.5, 0x9a96b8, { p: [0, 1.2, 0] }, 0.2).geometry(), ...big);
  }
  solidBox(ev, big[0] - 0.9, y, big[2] - 0.5, big[0] + 0.9, y + 2.5, big[2] + 0.5, 'grab');
  addGeo(ev, 'w9m:fence', () => {
    const b = new Build();
    for (let i = -7; i <= 7; i++) {
      b.cyl(0.05, 0.05, 1.4, 0x3a2e5a, { p: [i * 0.9, 0.7, 0] }, 4);
      b.cone(0.09, 0.22, 0xffc83a, { p: [i * 0.9, 1.5, 0] }, 4);
    }
    b.box(13.2, 0.08, 0.08, 0x3a2e5a, { p: [0, 1.15, 0] }, 0);
    b.box(13.2, 0.08, 0.08, 0x3a2e5a, { p: [0, 0.35, 0] }, 0);
    return b.geometry();
  }, x, y, z - 6.4, 0, true);
  solidBox(ev, x - 6.6, y, z - 6.6, x + 6.6, y + 1.6, z - 6.2, 'zaun');
  // Nebelbänke ziehen über die Gräber (durchsichtig, eigene Objekte)
  const banks = [];
  for (const [bx, bz, w] of [[x - 2, z - 1, 10], [x + 6, z + 4, 8]]) {
    const m = live9(ev, 'nebelbank', { size: [w, 5], count: 8, opacity: 0.45, height: 1.1 }, [bx, y, bz], 0, 1, 'idle', false, 400, 55);
    if (m) banks.push(m);
  }
  // Nebelplattformen steigen und sinken vor der Insel über dem All und blenden aus und ein
  const plats = [];
  let fade = 1;
  for (const [px, pz, ph] of [[x - 4, z - 10.5, 0], [x + 2.6, z - 11.4, PI]]) {
    const m = live9(ev, 'nebelplattform', { size: [3, 3], thick: 0.5 }, [px, y - 3, pz], 0, 1, (dt, t) => {
      fade = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(t * 0.5 + ph));
      return { fade };
    }, true, 2600, 60);
    if (!m) continue;
    plats.push(m);
    ev.updaters.push((dt, t) => { m.root.position.y = y - 3 + Math.sin(t * 0.7 + ph) * 1.6; });
  }
  // Kreisgeist kreist um das große Grab
  let ga = 0;
  const ghost = live9(ev, 'kreisgeist', {}, [big[0] + 2.6, y + 1.6, big[2]], 0, 1, 'idle', false, 5000, 55, true);
  if (ghost) ev.updaters.push((dt, t) => { ga = t * 0.6; ghost.root.position.set(big[0] + Math.cos(ga) * 2.6, y + 1.6 + Math.sin(t * 1.5) * 0.3, big[2] - Math.sin(ga) * 2.6); ghost.root.rotation.y = ga + PI / 2; });
  // leiser Schneefall über dem Friedhof (ein Punkte-Objekt)
  const N = 160, W = 30, H = 12, Dp = 26;
  const pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) seeds.push([hash(i * 1.7) * W - W / 2, hash(i * 3.3) * H, hash(i * 5.1) * Dp - Dp / 2, 0.6 + hash(i * 7.9) * 0.8]);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sm = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, fog: true });
  const snow = new THREE.Points(sg, sm);
  snow.frustumCulled = false;
  snow.name = 'w9:schneefall';
  ev.view.add(snow);
  ev.own.push(sg, sm, { dispose: () => snow.parent?.remove(snow) });
  const cx = x + 4, cz = z + 3;
  const putS = (t) => {
    for (let i = 0; i < N; i++) {
      const [sx, sy, sz, v] = seeds[i];
      pos[i * 3] = cx + sx + Math.sin(t * 0.6 + i) * 0.4;
      pos[i * 3 + 1] = y + ((((sy - t * v) % H) + H) % H);
      pos[i * 3 + 2] = cz + sz;
    }
    sg.attributes.position.needsUpdate = true;
  };
  putS(0);
  ev.updaters.push((dt, t) => putS(t));
  cullByView(ev, snow, cx, y + H / 2, cz, 18, 60);
  addInfo(ev, () => ({ fogyard: { graves: graves.length + 1, banks: banks.length, platforms: plats.length, fade: +fade.toFixed(3), ghost: !!ghost, ga: +ga.toFixed(3), snow: N } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ S-9 Kanonen-Station

function cannonStation(ev, x, y, z) {
  // Glaskuppel mit Neon-Fensterband
  if (!bake9(ev, 'weltraum_kuppel', { size: 6.4 }, [x, y, z], FRONT, 1, null, true, 4200)) {
    addGeo(ev, 'w9m:domefb', () => new Build().cyl(3.2, 3.4, 1.2, 0xeef2fa, { p: [0, 0.6, 0] }, 20).dome(3, 0x6aa8ff, { p: [0, 1.2, 0] }).geometry(), x, y, z);
  }
  solidCyl(ev, x, z, 3.4, y, y + 4.2, 'kuppel');
  // Neonbogen über dem Weg zur Kuppel (leuchtet)
  addGeo(ev, 'w9m:neonarch', () => new Build().torus(2.6, 0.12, 0x5af0ff, null, 4, 20, PI).torus(2.3, 0.08, 0xff7ae0, null, 4, 20, PI).geometry(), x, y + 0.2, z + 4.6, 0, false, 'glow');
  addGeo(ev, 'w9m:neonarchposts', () => { const b = new Build(); for (const s of [-1, 1]) b.cyl(0.18, 0.22, 0.6, 0x8a96b8, { p: [s * 2.6, 0.3, 0] }, 8); return b.geometry(); }, x, y, z + 4.6, 0, true);
  // Rohrschiene mit Weiche; das Schienenbrett fährt hin und her
  const [rx, ry, rz0, rl] = ev.def.rail ?? [x - 12, y + 0.4, z + 14, 22];
  if (!bake9(ev, 'brett_schiene', { kind: 'gerade', length: rl, posts: 0.4 }, [rx, ry, rz0], PI / 2, 1, null, true, 6000)) {
    addGeo(ev, `w9m:railfb:${rl}`, () => new Build().cyl(0.12, 0.12, rl, 0x5af0ff, { p: [0, 0, -rl / 2], r: [PI / 2, 0, 0] }, 6).geometry(), rx, ry, rz0);
  }
  bake9(ev, 'weiche', {}, [rx, ry, rz0 - rl - 0.05], PI / 2, 1, { dir: 'links' }, true, 6000);
  solidBox(ev, rx - 0.6, y, rz0 - rl - 5, rx + 0.6, y + 1.4, rz0, 'schiene');
  let bzPos = rz0 - rl / 2, bv = 0;
  const brett = live9(ev, 'schienenbrett', { size: [3, 2] }, [rx, ry, bzPos], PI / 2, 1, () => ({ speed: Math.abs(bv) }), true, 2600, 60);
  if (brett) ev.updaters.push((dt, t) => {
    const prev = bzPos;
    bzPos = rz0 - rl / 2 + Math.sin(t * 0.5) * (rl / 2 - 2);
    bv = dt > 0 ? (bzPos - prev) / dt : 0;
    brett.root.position.z = bzPos;
    brett.root.rotation.y = bv <= 0 ? PI / 2 : -PI / 2;
  });
  if (brett) cullByView(ev, brett.root, rx, ry + 1, rz0 - rl / 2, rl / 2 + 2, 60);
  // Sternkanone (eigene Geometrie) schießt eine Kanonenkugel mit Gesicht im Bogen hinaus ins All
  const cpos = [x + 11, y, z + 2];
  addGeo(ev, 'w9m:cannon', () => {
    const b = new Build();
    b.cyl(1.0, 1.2, 0.8, 0x5a6488, { p: [0, 0.4, 0] }, 12);
    b.cyl(0.62, 0.7, 2.8, { v: (px, py) => mix(0x2a2e4a, 0x6a7090, py / 2.8 + 0.5) }, { p: [0, 1.9, -0.6], r: [-0.6, 0, 0] }, 12);
    b.torus(0.66, 0.12, 0xffc83a, { p: [0, 2.9, -1.25], r: [PI / 2 - 0.6, 0, 0] }, 4, 14);
    return b.geometry();
  }, ...cpos, 0, true);
  solidCyl(ev, cpos[0], cpos[2], 1.2, y, y + 3, 'sternkanone');
  let bu = 0;
  const ball = live9(ev, 'kanonenkugel_tritt', { size: 1.6 }, [cpos[0], y + 3.2, cpos[2] - 1.5], FRONT, 1, () => ({ anim: 'fly' }), false, 8000, 70, true);
  if (ball) {
    ev.updaters.push((dt, t) => {
      bu = (t % 4.2) / 4.2;
      const sx = cpos[0], sy = y + 3.2, sz = cpos[2] - 1.5, dx = 0, dz = -26;
      ball.root.position.set(sx + dx * bu, sy + 12 * Math.sin(bu * PI) - bu * 8, sz + dz * bu);
      ball.root.rotation.y = PI / 2;
      ball.root.scale.setScalar(bu < 0.06 ? bu / 0.06 : bu > 0.9 ? Math.max(0.001, (1 - bu) / 0.1) : 1);
    });
  }
  // Kanonen-Helm auf einem Sockel, dreht sich
  const hp = [x - 6, y, z + 6];
  addGeo(ev, 'w9m:helmpedestal', () => new Build().cyl(0.7, 0.85, 1.1, { v: (px, py) => mix(0x8a96b8, 0xeef2fa, py / 1.1 + 0.5) }, { p: [0, 0.55, 0] }, 12).torus(0.72, 0.06, 0x5af0ff, { p: [0, 1.08, 0], r: [PI / 2, 0, 0] }, 4, 16).geometry(), ...hp, 0, true);
  solidCyl(ev, hp[0], hp[2], 0.85, y, y + 1.6, 'helmsockel');
  let ha = 0;
  const helm = live9(ev, 'helm_kanone', {}, [hp[0], y + 1.15, hp[2]], 0, 1.1, 'idle', true, 3000, 55);
  if (helm) ev.updaters.push((dt, t) => { ha = t * 1.1; helm.root.rotation.y = ha; helm.root.position.y = y + 1.15 + Math.sin(t * 2) * 0.08; });
  addInfo(ev, () => ({ station: { brett: +bzPos.toFixed(3), registry: !!brett, ball: +bu.toFixed(3), helm: +ha.toFixed(3) } }));
  modelsInfo(ev);
}

void _c;
