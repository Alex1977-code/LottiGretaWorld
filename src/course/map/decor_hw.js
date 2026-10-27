// Kulissen der Eingänge der Halloween-Karte „Kürbisinsel“ (Welt 31), aufgerufen aus EntranceView.decorate():
//   pumpkinfield  H-1        Kürbisfeld: Vogelscheuche mit Kürbiskopf und Hexenhut (wiegt sich im Wind, Rabe auf dem
//                            Arm), Riesenkürbis mit Laternengesicht, Strohballen, Schubkarre voller Kürbisse
//   spookvillage  H-2        Gruseldorf: drei schiefe Häuschen mit beleuchteten Fenstern (flackern sanft), Wimpelkette
//                            mit Fledermäusen, Kürbisse vor den Türen, schwarze Katze auf dem Dach
//   pumpkinmaze   H-Kapitän  Kürbislabyrinth aus Formschnitthecken mit Laternenkürbissen auf den Ecken; Krümel (Registry-
//                            Modell 'kruemel') mit Mini-Vampirumhang und schaukelnder Laterne am Eingang (def.kruemel)
//   foggraveyard  H-3        Nebelfriedhof: schmiedeeisernes Tor zwischen Steinpfeilern mit Kürbislaternen, Eisenzaun
//                            (def.fence: [x0, x1]), Gruft mit leuchtender Tür, Grabsteine mit Lachgesichtern; ein kleiner
//                            Geist schaut ab und zu hinter einem Grabstein hervor (def.ghost), Nebel zieht durch
//   witchtower    H-4        schiefer Hexenturm (Stein, Holz, verbogene Spitze, leuchtende Fenster), davor der
//                            Hexenkessel auf Glut (def.cauldron): grüner Trank blubbert (Blasen steigen und platzen);
//                            ein Besen fliegt Runden um die Turmspitze
//   spookcastle   H-Burg     Gruselschloss: Bergfried mit Zinnen und Spitzbogentor, zwei Türme mit lila Spitzdächern,
//                            leuchtende Fenster, wehende Fledermaus-Fahne; Fledermäuse kreisen (Weltdaten bats)
//   pipe + dress: 'halloween'  Glasröhre (Welt 1: HW, Welt 31: W1) geschmückt mit Kürbissen, zwei Laternen und einer
//                            Fledermaus-Girlande; def.ownSign: eigenes Schild „Halloween!“ (orange, mit Fledermaus),
//                            def.arrowSign: [x, y, z, yaw] Wegweiser „Halloween“ zur Röhre; def.deco: Requisiten wie
//                            map.props der Kürbisinsel (Laub, Kürbisse …) – auch in Welt 1 (halloween.js buildHwProp)
// Registry-Modelle der Halloween-Welt (models/kinds/*_hw.js) werden benutzt, sobald es sie gibt (je Einsatz mit
// Dreiecks-Obergrenze: bakeHw/live, eigene kompakte Kachel je Eingang); sonst eigene sparsame Geometrie. Lichter (Kürbisgesichter, Laternen) im Material
// hwglow – sie flackern im Takt der Kartenmusik (halloween.js). Bewegte Objekte stehen schon beim Bau an ihrer
// Startlage (Fern-Ausblendung lod.js). ev.liveInfo() meldet den Zustand für Tests (state().decor).

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { Rnd } from '../../three/world/geometry.js';
import { bakeModel } from './bake.js';
import { LowBuild as Build, place } from './desert.js';
import { wavingFlag } from './decor_w2.js';
import { modelTris } from './beach5.js';
import {
  hwGlow, glowing, pumpkinGeo, pumpkinFaceGeo, lanternPostGeo, lanternPostGlowGeo, spookTreeGeo, graveGeo, spookHouseGeo,
  spookHouseGlowGeo, hwHedgeGeo, cobwebGeo, hwPropGeo, buildHwProp, mistGeo, mistTexture,
} from './halloween.js';

/** Kulisse für eine Halloween-Art bauen; false = unbekannte Art. */
export function decorateHW(ev, kind, x, y, z) {
  switch (kind) {
    case 'pumpkinfield': pumpkinField(ev, x, y, z); return true;
    case 'spookvillage': spookVillage(ev, x, y, z); return true;
    case 'pumpkinmaze': pumpkinMaze(ev, x, y, z); return true;
    case 'foggraveyard': fogGraveyard(ev, x, y, z); return true;
    case 'witchtower': witchTower(ev, x, y, z); return true;
    case 'spookcastle': spookCastle(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, fog: true, ...extra }); ev.own.push(m); return m; };
const FRONT = -Math.PI / 2;   // Registry-Modelle blicken nach +X, Kulissen nach +Z (Kamera)
/** Statische Geometrie (gecacht) an (x, y, z) einbacken. */
function addGeo(ev, key, make, x, y, z, yaw = 0, cast = true) {
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), { castShadow: cast });
}
/** Licht (Material hwglow, flackert im Takt) an (x, y, z) einbacken. */
function addGlow(ev, g, x, y, z, yaw = 0) {
  hwGlow(ev.view);
  ev.addStatic(place(g, x, y, z, yaw), { material: 'hwglow', castShadow: false });
}
/** Kürbis (mit Laternengesicht) einbacken; face: false | 0 | 1 | 2. pool: Lichtfleck am Boden (Radius, 0 = keiner). */
function pumpkinAt(ev, x, y, z, s = 1, face = 0, yaw = 0, seed = 1, pool = 1) {
  ev.addStatic(place(pumpkinGeo(s, seed), x, y, z, yaw), { castShadow: true });
  if (face !== false) addGlow(ev, pumpkinFaceGeo(s, face).clone(), x, y, z, yaw);
  if (face !== false) light(ev, x + Math.sin(yaw) * 0.5 * s, y + 0.4 * s, z + Math.cos(yaw) * 0.5 * s, 1.3 * s, pool ? (s + 0.4) * pool : 0, [x, y, z]);
}
/** Großer Kürbis mit Grinsegesicht: Registry-Modell 'kuerbis' (≤ 7 k Dreiecke), sonst eigene Geometrie; Schein im Takt. */
function bigPumpkinAt(ev, x, y, z, s = 2.3, yaw = 0) {
  if (!bakeHw(ev, 'kuerbis', { size: s, face: 'grinsen', seed: 3 }, [x, y, z], yaw, 7000)) { pumpkinAt(ev, x, y, z, s, 0, yaw, 3); return false; }
  light(ev, x + Math.sin(yaw) * 0.5 * s, y + 0.42 * s, z + Math.cos(yaw) * 0.5 * s, 1.3 * s, s + 0.4, [x, y, z]);
  return true;
}
/** Laternenmast mit Licht im Takt (Schein und Lichtfleck). */
function lanternAt(ev, x, y, z, yaw = 0, h = 2.6) {
  ev.addStatic(place(lanternPostGeo(h), x, y, z, yaw), { castShadow: true });
  addGlow(ev, lanternPostGlowGeo(h), x, y, z, yaw);
  const lx = x + Math.cos(yaw) * 0.5, lz = z - Math.sin(yaw) * 0.5;
  light(ev, lx, y + h - 0.42, lz, 1.7, 2.4, [lx, y, lz]);
}
/** Lichtschein (und Lichtfleck) im Takt an (x, y, z) – halloween.js hwGlow(view).spot. */
function light(ev, x, y, z, s = 1, pool = 0, ground = null, color = null) {
  const L = hwGlow(ev.view);
  L.spot(x, y, z, s, pool, ground, color);
  if (!ev.own.includes(L)) ev.own.push(L);   // Aufräumen der Scheine (mehrfach aufrufbar)
}
// Registry-Modelle der Halloween-Welt (models/kinds/*_hw.js) mit Dreiecks-Obergrenze je Einsatz (Budget der Karte:
// < 300 k Dreiecke inkl. Schattenpass) – fehlt ein Modell oder ist es zu schwer, bleibt die eigene Geometrie.
// Benutzt (Stand der Modelle): vogelscheuche (≈ 9,4 k, wiegt sich), kuerbis (Riesenkürbis, ≈ 6,2 k), strohballen, maisstaude,
// dorfhaus_nacht (≈ 10,9 k ×3), laterne_hand (Krümels Laterne), gruft, grabstein, halloween_baum, kreisgeist_halloween
// (schaut hervor), hexenturm (≈ 10,8 k), hexenkessel (≈ 9 k), graf_brummbaer (≈ 21,8 k, am Schlosstor), fledermaus_schwarm.
// Bewusst eigene Geometrie (zu schwer für die vielen Exemplare): Kürbisse und Laternen am Weg, Eisenzaun (≈ 12,7 k je 13 m).
const hwOk = (name, opts, max) => hasModel(name) && modelTris(name, opts) <= max;
/**
 * Registry-Modell als statische Kulisse einbacken (Vorderseite +Z bei yaw 0); false, wenn es fehlt oder zu schwer ist.
 * Alle Modelle eines Eingangs liegen in einer eigenen, kompakten Kachel (Standard 'hw:<Id>') – sie zählen nur in den
 * Ansichten (und im Schattenpass), die sie wirklich sehen, statt in jeder Ansicht ihrer großen Gelände-Kachel.
 */
function bakeHw(ev, name, opts, pos, yaw = 0, max = 8000, { scale = 1, state = null, tile = `hw:${ev.id}`, shadow = true } = {}) {
  if (!hwOk(name, opts, max)) return false;
  const add = (g, o) => ev.addStatic(g, { ...o, ...(shadow ? {} : { castShadow: false }), ...(tile ? { tile, lod: true } : {}) });
  return !!bakeModel(add, name, opts, pos, yaw + FRONT, scale, state);
}
/** Registry-Modell als bewegtes Objekt (null, wenn es fehlt oder zu schwer ist); yaw wie bakeHw (Vorderseite +Z bei 0). */
function live(ev, name, opts, pos, yaw = 0, scale = 1, state = () => ({ anim: 'idle' }), maxTris = 12000, parent = null) {
  if (!hwOk(name, opts, maxTris)) return null;
  const m = getModel(name, opts ?? {});
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw + FRONT;
  if (scale !== 1) m.root.scale.setScalar(scale);
  (parent ?? ev.view).add(m.root);
  ev.own.push(m);
  const st = (dt, t) => (typeof state === 'function' ? state(dt, t) : state);
  m.update(0, st(0, 0));
  ev.updaters.push((dt, t) => m.update(dt, st(dt, t)));
  return m;
}
const TOPS = new Map();
/** Oberkante (m über dem Ursprung) eines Registry-Modells mit opts (einmal gebaut und vermessen), null wenn es fehlt. */
function modelTop(name, opts) {
  const key = `${name}|${JSON.stringify(opts)}`;
  if (TOPS.has(key)) return TOPS.get(key);
  let top = null;
  if (hasModel(name)) {
    const m = getModel(name, opts);
    m.root.updateMatrixWorld(true);
    const b = new THREE.Box3();
    m.root.traverseVisible((o) => { if (o.isMesh && !o.isSprite) b.expandByObject(o); });
    top = b.isEmpty() ? null : b.max.y;
    m.dispose?.();
  }
  TOPS.set(key, top);
  return top;
}
/** Eigenes bewegtes Mesh (Vertexfarben) an (x, y, z). */
function mover(ev, geo, x, y, z, name, shadow = true) {
  const m = new THREE.Mesh(geo, vcol(0.6, {}, 'hwdecor'));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.name = name;
  ev.view.add(m);
  return m;
}
/** Zustand für Tests (state().decor) ergänzen. */
function addInfo(ev, fn) {
  const prev = ev.liveInfo;
  ev.liveInfo = () => ({ ...(prev ? prev() : {}), ...fn() });
}

// ------------------------------------------------------------------ Wimpelkette, Fledermaus-Girlande, Schilder

/** Fledermaus-Silhouette (flach, Vorderseite +Z), Breite w. */
function batShape(w = 0.5) {
  const s = new THREE.Shape(), h = w * 0.5;
  s.moveTo(0, h * 0.1);
  s.quadraticCurveTo(w * 0.18, h * 0.55, w * 0.5, h * 0.45);
  s.quadraticCurveTo(w * 0.36, h * 0.1, w * 0.4, -h * 0.25);
  s.quadraticCurveTo(w * 0.26, -h * 0.05, w * 0.16, -h * 0.25);
  s.quadraticCurveTo(w * 0.08, -h * 0.05, 0, -h * 0.35);
  s.quadraticCurveTo(-w * 0.08, -h * 0.05, -w * 0.16, -h * 0.25);
  s.quadraticCurveTo(-w * 0.26, -h * 0.05, -w * 0.4, -h * 0.25);
  s.quadraticCurveTo(-w * 0.36, h * 0.1, -w * 0.5, h * 0.45);
  s.quadraticCurveTo(-w * 0.18, h * 0.55, 0, h * 0.1);
  return s;
}

/**
 * Girlande zwischen a und b (Weltpunkte) mit Durchhang sag: Schnur, abwechselnd Fledermäuse (schwarz-lila) und
 * kleine Kürbisse bzw. orange-lila Wimpel (style 'flags').
 */
function garlandGeo(a, b, sag = 0.6, style = 'bats', seed = 1) {
  const g = new Build();
  const rnd = new Rnd(seed);
  const P = (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag, a[2] + (b[2] - a[2]) * u];
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(P(i / 10));
  g.tube(pts, 0.025, 0xe8dcc8, null, 20, 3);
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const yaw = -Math.atan2(b[2] - a[2], b[0] - a[0]);
  const n = Math.max(3, Math.round(len / 0.6));
  for (let i = 1; i < n; i++) {
    const [x, y, z] = P(i / n);
    if (style === 'flags') {
      const c = [0xff8a1a, 0x8a4ad8, 0x2a2238, 0x7ad04a][(i + seed) % 4];
      g.cone(0.17, 0.36, c, { p: [x, y - 0.2, z], r: [Math.PI, yaw, 0], s: [1, 1, 0.15] }, 3);
    } else if (i % 2) {
      g.extrude(batShape(0.46 + rnd.real(-0.04, 0.04)), 0.03, 0x2a2238, { p: [x, y - 0.16, z], r: [rnd.real(-0.2, 0.2), yaw, rnd.real(-0.2, 0.2)] }, 0, 4);
      for (const sx of [-1, 1]) g.sphere(0.022, 0xffd84a, { p: [x + sx * 0.03 * Math.cos(yaw), y - 0.13, z - sx * 0.03 * Math.sin(yaw) + 0.025], s: [1, 1, 0.5] }, 4, 3);
    } else {
      g.sphere(0.1, 0xff8a1a, { p: [x, y - 0.12, z], s: [1.2, 0.9, 1.2] }, 6, 4);
      g.cyl(0.015, 0.015, 0.06, 0x4a6a2a, { p: [x, y - 0.02, z] }, 3);
    }
  }
  return g.geometry();
}

/** Schild mit eigener Aufschrift (orange Tafel mit Fledermaus und Kürbis), Vorderseite +Z, Pfosten. */
function hwSign(ev, text, x, y, z, yaw = 0, scale = 1) {
  const grp = new THREE.Group();
  const board = new THREE.Mesh(cached('hw:signboard', () => {
    const b = new Build();
    for (const sx of [-0.8, 0.8]) b.box(0.12, 1.4, 0.12, 0x4a3428, { p: [sx, 0.7, -0.02] }, 0.02, 1);
    b.box(2.0, 0.92, 0.12, { v: (px, py, pz, nx, ny, nz) => (nz > 0.5 ? 0xff9a2a : 0x8a4a1a) }, { p: [0, 1.5, 0], r: [0, 0, 0.04] }, 0.06, 1);
    b.cone(0.18, 0.3, 0x2a2238, { p: [-0.92, 2.02, 0.02], r: [0, 0, 0.5] }, 4);
    return b.geometry();
  }), vcol(0.6, {}, 'hwsign'));
  board.castShadow = true;
  const tex = canvasTexture(`hw:signtext:${text}`, 256, 112, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const lines = String(text).split('\n');
    const font = (px) => `900 ${px}px "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif`;
    let px = lines.length > 1 ? 44 : 60;
    c.font = font(px);
    const widest = Math.max(...lines.map((l) => c.measureText(l).width));
    if (widest > w - 18) { px = Math.floor(px * (w - 18) / widest); c.font = font(px); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = '#fff4d0';
    lines.forEach((l, i) => { const yy = h / 2 + 3 + (i - (lines.length - 1) / 2) * px * 1.02; c.strokeText(l, w / 2, yy); c.fillStyle = '#2e1440'; c.fillText(l, w / 2, yy); });
  });
  const plate = new THREE.Mesh(cached('hw:signplate', () => new THREE.PlaneGeometry(1.86, 0.82)), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true }));
  ev.own.push(plate.material);
  plate.position.set(0, 1.5, 0.075);
  plate.rotation.z = 0.04;
  grp.add(board, plate);
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;
  grp.scale.setScalar(scale);
  grp.name = 'hw:schild';
  ev.view.add(grp);
  ev.level.world.add({ type: 'cyl', x, z, r: 0.25, y0: y, y1: y + 2, tag: 'schild' });
  return grp;
}

// ------------------------------------------------------------------ Glasröhre geschmückt (Welt 1: HW, Welt 31: W1)

/**
 * Röhre mit Halloween-Schmuck: Kürbisse um den Röhrenfuß (einer mit Laternengesicht), zwei Laternen links/rechts,
 * dazwischen eine Fledermaus-Girlande vor der Röhre (über der Hüpf-Bahn), Spinnennetz am Laternenmast; def.ownSign:
 * Schild „Halloween!“ statt des Holzschilds; def.arrowSign: [x, y, z, yaw] Wegweiser.
 */
export function dressPipeHW(ev, x, y, z) {
  const d = ev.def;
  if (d.dress !== 'halloween') return false;
  // Laternen links und rechts des Röhrenfußes, Girlande dazwischen (vor der Röhre, über der Hüpf-Bahn)
  const lx = 2.7;
  for (const s of [-1, 1]) lanternAt(ev, x + s * lx, y, z + 0.3, s > 0 ? Math.PI : 0, 3.4);
  ev.addStatic(garlandGeo([x - lx + 0.05, y + 3.5, z + 0.32], [x + lx - 0.05, y + 3.5, z + 0.32], 0.5, 'bats', 3), { castShadow: false });
  ev.addStatic(garlandGeo([x - lx + 0.05, y + 4.1, z + 0.55], [x + lx - 0.05, y + 4.1, z + 0.55], 0.35, 'flags', 5), { castShadow: false });
  ev.addStatic(place(cobwebGeo(0.55).clone(), x - lx + 0.05, y + 1.5, z + 0.36, 0), { castShadow: false });
  for (const s of [-1, 1]) solidCyl(ev, x + s * lx, z + 0.3, 0.2, y, y + 3.4, 'laterne');
  // Kürbisse um den Röhrenfuß
  const pk = d.pumpkins ?? [[-1.9, -0.9, 1.15, 1], [1.7, -1.1, 0.8, 2], [1.5, 1.6, 0.55, false], [-2.0, 1.7, 0.6, false], [-0.9, -1.8, 0.5, false]];
  pk.forEach(([dx, dz, s, face], i) => {
    pumpkinAt(ev, x + dx, y, z + dz, s, face, face === false ? i * 1.3 : (dx < 0 ? 0.3 : -0.3), 40 + i);
    solidCyl(ev, x + dx, z + dz, 0.45 * s, y, y + 0.8 * s, 'kuerbis');
  });
  if (d.ownSign) {
    const sp = d.signPos ?? [-2.9, 0, 2.6];
    hwSign(ev, typeof d.ownSign === 'string' ? d.ownSign : 'Halloween!', ev.pos.x + sp[0], ev.pos.y + sp[1], ev.pos.z + sp[2], d.signYaw ?? 0.35);
  }
  (d.deco ?? []).forEach((it, i) => buildHwProp(ev.level, null, { isWalk: () => true }, it, 900 + i));
  if (d.arrowSign) {
    const [ax, ay, az, ayaw] = d.arrowSign;
    hwSign(ev, '→ Halloween', ax, ay, az, ayaw ?? 0, 0.75);
    pumpkinAt(ev, ax + 0.7, ay, az + 0.5, 0.5, 2, 0, 77);
  }
  const lights = hwGlow(ev.view);
  if (!ev.own.includes(lights)) ev.own.push(lights);
  addInfo(ev, () => ({ lanterns: { ...lights.info(), shown: lights.shown, ...lights.info2() } }));
  return true;
}

// ------------------------------------------------------------------ H-1 Kürbisfeld

/** Vogelscheuche (Blick +Z): Pfahlkreuz, karierte Jacke, Strohbüschel, Kürbiskopf mit Hexenhut, Rabe auf dem Arm. */
function scarecrowGeo() {
  return cached('hw:scarecrow', () => {
    const b = new Build();
    b.cyl(0.07, 0.09, 2.4, 0x6a4a34, { p: [0, 1.2, -0.05] }, 6);
    b.box(2.0, 0.12, 0.12, 0x6a4a34, { p: [0, 1.75, -0.05] }, 0.02, 1);
    const plaid = (px, py) => ((Math.floor(px * 6 + 20) + Math.floor(py * 6)) % 2 ? 0x8a3ab0 : 0xe06a2a);
    b.box(0.72, 0.8, 0.42, plaid, { p: [0, 1.45, 0] }, 0.1, 1);
    for (const sx of [-1, 1]) {
      b.box(0.6, 0.26, 0.28, plaid, { p: [sx * 0.62, 1.74, 0] }, 0.08, 1);
      for (let k = 0; k < 3; k++) b.cone(0.07, 0.3, 0xf0c85a, { p: [sx * (0.98 + k * 0.02), 1.72 + (k - 1) * 0.07, 0.02], r: [0, 0, sx * (Math.PI / 2 + (k - 1) * 0.4)] }, 4);
    }
    for (let k = 0; k < 5; k++) b.cone(0.07, 0.34, 0xf0c85a, { p: [-0.24 + k * 0.12, 0.98, 0.05], r: [Math.PI, 0, (k - 2) * 0.15] }, 4);
    b.box(0.16, 0.16, 0.03, 0x4a8a3a, { p: [0.15, 1.5, 0.22] }, 0);
    // Kürbiskopf mit Hexenhut
    b.parts.push(place(pumpkinGeo(0.7, 9), 0, 1.86, 0, 0));
    b.cyl(0.42, 0.42, 0.04, 0x2e2240, { p: [0, 2.38, 0], r: [0.12, 0, 0.1] }, 10);
    b.cone(0.24, 0.62, 0x2e2240, { p: [0.05, 2.7, -0.02], r: [0.1, 0, -0.25] }, 9);
    b.cyl(0.25, 0.25, 0.07, 0xa04ad8, { p: [0, 2.44, 0], r: [0.12, 0, 0.1] }, 9);
    // Rabe auf dem rechten Arm
    b.sphere(0.13, 0x2a2436, { p: [0.72, 1.98, 0.02], s: [1.3, 1, 0.9] }, 7, 5);
    b.sphere(0.09, 0x2a2436, { p: [0.84, 2.1, 0.02] }, 6, 4);
    b.cone(0.03, 0.09, 0xffb43a, { p: [0.93, 2.09, 0.02], r: [0, 0, -Math.PI / 2] }, 4);
    b.sphere(0.022, 0xffffff, { p: [0.87, 2.13, 0.08] }, 4, 3);
    b.cone(0.08, 0.2, 0x2a2436, { p: [0.55, 1.95, 0.02], r: [0, 0, 1.9] }, 4);
    return b.geometry();
  });
}

function pumpkinField(ev, x, y, z) {
  // Vogelscheuche (wiegt sich sanft): Registry-Modell 'vogelscheuche', sonst eigene mit Kürbisgesicht im Takt
  const sway = { v: 0 };
  const sc = live(ev, 'vogelscheuche', { size: 1.25 }, [x, y, z], 0, 1, (dt, t) => { sway.v = 0.5 + 0.5 * Math.sin(t * 0.9); return { sway: sway.v }; }, 10000);
  if (!sc) {
    const crow = mover(ev, scarecrowGeo(), x, y, z, 'hw:vogelscheuche');
    const face = new THREE.Mesh(pumpkinFaceGeo(0.7, 1), hwGlow(ev.view).mat);
    face.position.set(0, 1.86, 0);
    crow.add(face);
    ev.updaters.push((dt, t) => { sway.v = 0.5 + 0.5 * Math.sin(t * 0.9); crow.rotation.z = Math.sin(t * 0.9) * 0.05; crow.rotation.y = Math.sin(t * 0.6) * 0.08; });
    light(ev, x, y + 2.1, z + 0.4, 1.2);
  }
  // Riesenkürbis mit Grinsegesicht, Strohballen mit Kürbissen, Maisstauden, Schubkarre
  bigPumpkinAt(ev, x + 3.6, y, z + 0.6, 2.3, -0.25);
  const hay = [['strohballen', { kind: 'eckig' }, [x - 4.6, y, z + 0.4], 0.15], ['strohballen', { kind: 'eckig' }, [x - 3.5, y, z + 0.5], 0.25],
    ['strohballen', { kind: 'rund' }, [x - 4.2, y, z - 1.0], 1.4]];
  if (hay.every(([n, o, p, yw]) => bakeHw(ev, n, o, p, yw, 1500))) {
    pumpkinAt(ev, x - 4.1, y + 0.6, z + 0.45, 0.5, 2, 0.2, 21, 0);
  } else {
    addGeo(ev, 'hw:haystack', () => {
      const b = new Build();
      b.parts.push(hwPropGeo({ kind: 'hay', size: 1 }, 1), place(hwPropGeo({ kind: 'hay', size: 1 }, 2), 1.15, 0, 0.1, 0.1), place(hwPropGeo({ kind: 'hay', size: 1 }, 3), 0.55, 0.6, 0.05, -0.05));
      b.parts.push(place(pumpkinGeo(0.5, 21, true), 0.5, 1.2, 0.05, 0), place(pumpkinGeo(0.35, 22, true), 1.3, 0.6, 0.15, 0.5));
      return b.geometry();
    }, x - 4.6, y, z + 0.4, 0.15);
  }
  for (const [dx, dz] of [[-7.2, -0.6], [7.4, -0.2], [-1.6, -2.2]]) bakeHw(ev, 'maisstaude', { count: 4, height: 2.2 }, [x + dx, y, z + dz], dx * 0.3, 1600);
  addGeo(ev, 'hw:wheelbarrow', () => {
    const b = new Build();
    b.box(1.2, 0.4, 0.8, 0x7a5a44, { p: [0, 0.55, 0], r: [0, 0, -0.08] }, 0.04, 1);
    b.torus(0.22, 0.06, 0x3a3044, { p: [0.72, 0.24, 0] }, 4, 10);
    for (const sz of [-1, 1]) b.box(1.2, 0.05, 0.05, 0x5a4434, { p: [-0.75, 0.5, sz * 0.3], r: [0, 0, 0.25] }, 0);
    b.parts.push(place(pumpkinGeo(0.45, 31, true), -0.15, 0.68, 0, 0), place(pumpkinGeo(0.4, 32, true), 0.25, 0.7, 0.12, 1), place(pumpkinGeo(0.32, 33, true), 0.05, 0.95, -0.1, 2));
    return b.geometry();
  }, x - 2.2, y, z + 2.1, 0.5);
  if (!sc) ev.addStatic(place(cobwebGeo(0.5).clone(), x + 0.4, y + 1.9, z - 0.04, 0), { castShadow: false });
  addInfo(ev, () => ({ scarecrow: { sway: +sway.v.toFixed(3), model: !!sc } }));
}

// ------------------------------------------------------------------ H-2 Gruseldorf

/** Schwarze Katze mit gelben Augen (sitzend, Blick +Z), Schwanz geringelt. */
function catGeo() {
  return cached('hw:cat', () => {
    const b = new Build();
    b.sphere(0.24, 0x241c30, { p: [0, 0.24, 0], s: [0.9, 1.1, 0.8] }, 8, 6);
    b.sphere(0.17, 0x241c30, { p: [0, 0.55, 0.05] }, 8, 6);
    for (const s of [-1, 1]) {
      b.cone(0.07, 0.15, 0x241c30, { p: [s * 0.1, 0.72, 0.03], r: [0, 0, -s * 0.25] }, 4);
      b.sphere(0.04, 0xffe04a, { p: [s * 0.07, 0.58, 0.19], s: [1, 1.2, 0.5] }, 5, 3);
    }
    b.tube([[0, 0.08, -0.18], [0.18, 0.12, -0.3], [0.3, 0.35, -0.25], [0.24, 0.5, -0.12]], 0.04, 0x241c30, null, 8, 4);
    return b.geometry();
  });
}

function spookVillage(ev, x, y, z) {
  const houses = [[-6.2, 0.6, 0.28, [3.2, 3], 0x9a7ab8, 0x3a2a5a, 3], [0, -0.8, 0, [3.8, 3.4], 0x6a9a9a, 0x2e3e5a, 7], [6.4, 0.5, -0.3, [3.2, 3], 0xc88a5a, 0x4a2a4a, 11]];
  const winB = new Build();
  const colors = ['lila', 'gruen', 'orange'];
  let catY = y + 5.03, models = 0;
  houses.forEach(([dx, dz, yaw, [w, d], wall, roof, seed], i) => {
    const hx = x + dx, hz = z + dz;
    const at = (lx, ly, lz) => [hx + lx * Math.cos(yaw) + lz * Math.sin(yaw), y + ly, hz - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
    const opts = { width: w, depth: d, height: 2.6, color: colors[i % 3], lean: 0.12 };
    // ohne Schattenwurf: die Schatten fielen nach hinten (Nordosten), weg von der Kamera – spart den Schattenpass
    // Registry-Haus nur in der Mitte (≈ 10,9 k Dreiecke je Haus – drei wären für die Ansicht des Dorfplatzes zu schwer)
    if (i === 1 && bakeHw(ev, 'dorfhaus_nacht', opts, [hx, y, hz], yaw, 11500, { shadow: false })) {
      models++;
      for (const sx of [-1, 1]) { const p = at(sx * w * 0.3, 1.35, d / 2 + 0.2); light(ev, p[0], p[1], p[2], 1.5, 0, null, 0xffc060); }
      const pd = at(0, 0.3, d / 2 + 0.6);
      light(ev, pd[0], pd[1], pd[2], 1.2, 1.3, [pd[0], y, pd[2]]);
      if (i === 1) { const top = modelTop('dorfhaus_nacht', opts); if (top) catY = y + top - 0.12; }
      return;
    }
    ev.addStatic(place(spookHouseGeo(w, d, seed, wall, roof), hx, y, hz, yaw), { castShadow: true });
    winB.parts.push(place(spookHouseGlowGeo(w, d, seed), hx, y, hz, yaw));
    light(ev, hx + Math.sin(yaw) * (d / 2 + 0.3) + Math.cos(yaw) * w * 0.24, y + 1.45, hz + Math.cos(yaw) * (d / 2 + 0.3) - Math.sin(yaw) * w * 0.24, 1.6, 0, null, 0xffc060);
    // Kürbisse vor der Tür
    pumpkinAt(ev, hx - w * 0.18 * Math.cos(yaw) + 0.75, y, hz + d / 2 + 0.55, 0.55, seed % 3, 0, seed);
  });
  // Fenster: eigenes warmes Licht, das sanft flackert (Kerzen hinter den Scheiben)
  const wm = glowMat(ev, 0xffffff, { vertexColors: true });
  if (winB.parts.length) {
    const win = new THREE.Mesh(winB.geometry(), wm);
    win.name = 'hw:dorffenster';
    ev.own.push(win.geometry);
    ev.view.add(win);
  }
  ev.updaters.push((dt, t) => { const k = 0.86 + 0.1 * Math.sin(t * 3.1) * Math.sin(t * 1.7 + 2) + 0.04 * Math.sin(t * 11); wm.color.setScalar(k); });
  // Wimpelkette und Fledermaus-Girlande zwischen den Häusern, Katze auf dem Dach, Laternen
  ev.addStatic(garlandGeo([x - 4.6, y + 2.9, z + 1.8], [x - 1.9, y + 3.1, z + 1.0], 0.4, 'flags', 2), { castShadow: false });
  ev.addStatic(garlandGeo([x + 1.9, y + 3.1, z + 1.0], [x + 4.8, y + 2.9, z + 1.8], 0.4, 'bats', 4), { castShadow: false });
  const cat = mover(ev, catGeo(), x + 0.4, catY, z - 0.9, 'hw:katze');
  cat.scale.setScalar(1.3);
  const tail = { wag: 0 };
  ev.updaters.push((dt, t) => { tail.wag = Math.sin(t * 1.4); cat.rotation.y = tail.wag * 0.25; cat.position.y = catY + Math.max(0, Math.sin(t * 0.8)) ** 8 * 0.25; });
  lanternAt(ev, x - 9.2, y, z + 2.4, 0, 2.8);
  lanternAt(ev, x + 9.4, y, z + 2.4, Math.PI, 2.8);
  addInfo(ev, () => ({ village: { windows: +wm.color.r.toFixed(3), houseModels: models } }));
}

// ------------------------------------------------------------------ H-Kapitän Kürbislabyrinth

function pumpkinMaze(ev, x, y, z) {
  // Hecken des Labyrinths (Quader lokal [x0, z0, x1, z1]); Eingang vorn in der Mitte, Laternenkürbisse auf den Ecken
  const walls = [
    [-5, -3.6, 5, -2.8], [-5, -2.8, -4.2, 3.2], [4.2, -2.8, 5, 3.2], [-5, 2.4, -1.2, 3.2], [1.2, 2.4, 5, 3.2],
    [-2.6, -0.4, 2.6, 0.4], [-2.6, 0.4, -1.8, 1.6], [1.8, -1.6, 2.6, -0.4], [-0.4, -2.8, 0.4, -1.4],
  ];
  const H = 1.25;
  const b = new Build();
  walls.forEach(([x0, z0, x1, z1], i) => {
    const w = x1 - x0, d = z1 - z0;
    const g = hwHedgeGeo(Math.max(w, d), H, 5 + i);
    if (d > w) g.rotateY(Math.PI / 2);
    g.scale(w > d ? 1 : d / Math.max(w, d) > 0 ? 1 : 1, 1, 1);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    b.parts.push(g);
    solidBox(ev, x + x0, y, z + z0, x + x1, y + H, z + z1, 'hecke');
  });
  const g = b.geometry();
  g.translate(x, y, z);
  ev.addStatic(g, { castShadow: true });
  for (const [cx, cz, f] of [[-4.6, -3.2, 0], [4.6, -3.2, 1], [-4.6, 2.8, 2], [4.6, 2.8, 0], [-1.6, 2.8, 1], [1.6, 2.8, 2]]) pumpkinAt(ev, x + cx, y + H, z + cz, 0.55, f, 0, 50 + Math.round(cx * 3));
  // Wegweiser-Laternen am Eingang
  lanternAt(ev, x - 1.9, y, z + 4.2, 0, 2.2);
  // Krümel mit Mini-Vampirumhang und Laterne
  const kp = ev.def.kruemel ?? [x + 2.6, y, z + 4.4];
  const kr = live(ev, 'kruemel', {}, kp, FRONT + 0.35, 1.6, () => ({ anim: Math.sin(ev.view.time * 0.5) > 0.92 ? 'cheer' : 'idle' }));
  if (kr) solidCyl(ev, kp[0], kp[2], 0.45, kp[1], kp[1] + 0.9, 'kruemel');
  // Mini-Vampirumhang: hinten offen-halbrund (außen schwarz, innen rot), hoher Kragen
  const cape = mover(ev, cached('hw:cape', () => {
    const c = new Build();
    c.add(new THREE.CylinderGeometry(0.3, 0.46, 0.6, 10, 1, true, Math.PI * 0.55, Math.PI * 0.9), 0x2a1a30, { p: [0, 0.36, -0.02] });
    c.add(new THREE.CylinderGeometry(0.28, 0.44, 0.58, 10, 1, true, Math.PI * 0.55, Math.PI * 0.9), 0xd02040, { p: [0, 0.37, -0.01] });
    c.add(new THREE.CylinderGeometry(0.2, 0.17, 0.2, 8, 1, true, Math.PI * 0.5, Math.PI), 0xd02040, { p: [0, 0.74, -0.03], r: [-0.25, 0, 0] });
    return c.geometry();
  }), kp[0], kp[1], kp[2], 'hw:umhang');
  cape.rotation.y = 0.35;
  cape.material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 });
  ev.own.push(cape.material);
  // Laterne am Stab (schaukelt)
  const lan = new THREE.Group();
  lan.position.set(kp[0] + 0.55, kp[1] + 1.15, kp[2] + 0.25);
  lan.name = 'hw:kruemel_laterne';
  const stickOnly = cached('hw:lanstick0', () => { const s = new Build(); s.cyl(0.025, 0.025, 0.7, 0x6a4a34, { p: [-0.18, -0.12, 0], r: [0, 0, 0.9] }, 4); return s.geometry(); });
  ev.view.add(lan);
  lan.add(new THREE.Mesh(stickOnly, vcol(0.6, {}, 'hwdecor')));
  const hand = live(ev, 'laterne_hand', {}, [0, 0, 0], 0, 0.7, () => ({ lit: true, sway: 0 }), 4600, lan);
  if (!hand) {
    const cage = new THREE.Mesh(cached('hw:lancage', () => { const s = new Build(); s.box(0.2, 0.26, 0.2, 0x2a2436, { p: [0, -0.42, 0] }, 0.02, 1); s.cone(0.16, 0.12, 0x2a2436, { p: [0, -0.24, 0], r: [0, Math.PI / 4, 0] }, 4); return s.geometry(); }), vcol(0.6, {}, 'hwdecor'));
    const flameMesh = new THREE.Mesh(cached('hw:lanflame', () => { const s = new Build(); s.box(0.14, 0.18, 0.14, 0xffc04a, { p: [0, -0.43, 0] }, 0); return s.geometry(); }), hwGlow(ev.view).mat);
    lan.add(cage, flameMesh);
  }
  light(ev, kp[0] + 0.55, kp[1] + 0.73, kp[2] + 0.25, 1.4, 1.6, [kp[0] + 0.5, kp[1], kp[2] + 0.3]);
  ev.updaters.push((dt, t) => { lan.rotation.z = Math.sin(t * 2.2) * 0.18; });
  addInfo(ev, () => ({ maze: { walls: walls.length, kruemel: !!kr } }));
}

// ------------------------------------------------------------------ H-3 Nebelfriedhof

/** Kleiner Geist (Blick +Z): Tropfenform mit Wellensaum, große Augen, rosa Bäckchen, offenes Lächeln. */
function ghostGeo() {
  return cached('hw:ghost', () => {
    const b = new Build();
    b.lathe([[0, 1.0], [0.26, 0.95], [0.42, 0.78], [0.48, 0.5], [0.46, 0.2], [0.38, 0.0], [0, 0.04]], { v: (px, py) => mix(0xdcd6f6, 0xffffff, py) }, null, 12, 1);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(0.13, 0xe8e4fa, { p: [Math.cos(a) * 0.33, 0.02, Math.sin(a) * 0.33] }, 6, 3); }
    for (const s of [-1, 1]) {
      b.sphere(0.08, 0x1e1a2e, { p: [s * 0.15, 0.62, 0.4], s: [0.8, 1.2, 0.5] }, 7, 5);
      b.sphere(0.025, 0xffffff, { p: [s * 0.15 + 0.02, 0.66, 0.44] }, 4, 3);
      b.sphere(0.05, 0xff9ab8, { p: [s * 0.27, 0.48, 0.38], s: [1, 0.6, 0.4] }, 5, 3);
      b.sphere(0.09, 0xf4f0ff, { p: [s * 0.5, 0.42, 0.05], s: [0.9, 0.6, 0.6] }, 6, 4);   // Ärmchen
    }
    b.sphere(0.07, 0x5a2a4a, { p: [0, 0.44, 0.44], s: [1.2, 0.8, 0.4] }, 7, 4);
    return b.geometry();
  });
}

function fogGraveyard(ev, x, y, z) {
  // Tor: zwei Steinpfeiler mit Kürbislaternen, Eisenbogen mit Fledermaus, Torflügel leicht offen
  addGeo(ev, 'hw:gravegate', () => {
    const b = new Build();
    for (const s of [-1, 1]) {
      b.box(0.8, 2.4, 0.8, { v: (px, py, pz, nx, ny) => mix(0x5a5070, 0x8a80a2, ny * 0.3 + (py + 1.2) / 3) }, { p: [s * 2.0, 1.2, 0] }, 0.06, 1);
      b.box(1.0, 0.18, 1.0, 0x4a4260, { p: [s * 2.0, 2.48, 0] }, 0.04, 1);
    }
    b.torus(2.0, 0.06, 0x2a2436, { p: [0, 2.3, 0] }, 4, 24, Math.PI);
    b.torus(1.75, 0.05, 0x2a2436, { p: [0, 2.3, 0] }, 4, 22, Math.PI);
    b.extrude(batShapeGeoShape(), 0.05, 0x2a2436, { p: [0, 4.05, 0] }, 0, 4);
    // Torflügel (leicht geöffnet)
    for (const s of [-1, 1]) {
      const wing = new Build();
      for (let i = 0; i < 6; i++) { const h = 1.8 + Math.sin((i / 5) * Math.PI) * (s > 0 ? 0.25 : 0.25); wing.box(0.05, h, 0.05, 0x2a2436, { p: [s * (0.12 + i * 0.28), h / 2, 0] }, 0, 1); wing.cone(0.06, 0.14, 0x2a2436, { p: [s * (0.12 + i * 0.28), h + 0.06, 0] }, 4); }
      for (const yy of [0.3, 1.4]) wing.box(1.6, 0.05, 0.05, 0x2a2436, { p: [s * 0.82, yy, 0] }, 0, 1);
      wing.torus(0.18, 0.025, 0x2a2436, { p: [s * 0.82, 0.85, 0] }, 3, 10);
      const g = wing.geometry();
      g.translate(-s * 1.6, 0, 0);
      g.rotateY(s * 0.35);
      g.translate(s * 1.6, 0, 0);
      b.parts.push(g);
    }
    return b.geometry();
  }, x, y, z);
  for (const s of [-1, 1]) {
    solidBox(ev, x + s * 2.0 - 0.45, y, z - 0.45, x + s * 2.0 + 0.45, y + 2.6, z + 0.45, 'torpfeiler');
    pumpkinAt(ev, x + s * 2.0, y + 2.57, z, 0.6, s > 0 ? 1 : 2, 0, 60 + s);
  }
  // Eisenzaun links und rechts bis zum Rand (def.fence: [x0, x1]), Torflügel als Kollision
  const [fx0, fx1] = ev.def.fence ?? [x - 14, x + 14];
  for (const [a, c] of [[fx0, x - 2.45], [x + 2.45, fx1]]) {
    const len = c - a;
    if (len < 0.5) continue;
    ev.addStatic(place(hwPropGeo({ kind: 'ironfence', len }, Math.round(a)), (a + c) / 2, y, z, 0), { castShadow: true });
  }
  solidBox(ev, x - 1.6, y, z - 0.6, x + 1.6, y + 2, z + 0.2, 'tor');
  // Gruft mit leuchtender Tür (hinten links), Grabsteine, Spukbaum mit Eule (rechts)
  const cx = x - 6.5, cz = z - 5;
  const crypt = bakeHw(ev, 'gruft', { size: 1 }, [cx, y + 0.15, cz], 0, 5600);
  if (crypt) { solidBox(ev, cx - 1.9, y, cz - 2.2, cx + 1.9, y + 4, cz + 2.2, 'gruft'); light(ev, cx, y + 1.2, cz + 2.3, 2.2, 2.0, [cx, y + 0.15, cz + 2.9], 0xffb860); }
  else addGeo(ev, 'hw:crypt', () => {
    const b = new Build();
    b.box(3.4, 2.6, 3, { v: (px, py, pz, nx, ny) => mix(0x5e5674, 0x8e86a8, ny * 0.3 + (py + 1.3) / 3.4) }, { p: [0, 1.3, 0] }, 0.08, 1);
    const roof = new THREE.Shape(); roof.moveTo(-2, 0); roof.lineTo(0, 1.2); roof.lineTo(2, 0); roof.closePath();
    b.extrude(roof, 3.3, 0x4a4262, { p: [0, 2.6, 0] }, 0.05, 1);
    for (const s of [-1, 1]) b.cyl(0.18, 0.2, 2.4, 0xa49ec0, { p: [s * 1.2, 1.2, 1.6] }, 7);
    b.box(1.0, 0.12, 0.3, 0x3a3250, { p: [0, 3.0, 1.55] }, 0);
    return b.geometry();
  }, cx, y + 0.15, cz);
  if (!crypt) {
    const door = new THREE.Shape(); door.moveTo(-0.5, 0); door.lineTo(-0.5, 1.2); door.absarc(0, 1.2, 0.5, Math.PI, 0, true); door.lineTo(0.5, 0); door.closePath();
    const dg = new Build(); dg.extrude(door, 0.04, 0xd8ff8a, { p: [0, 0, 1.52] }, 0, 8);
    addGlow(ev, dg.geometry(), cx, y + 0.15, cz);
    light(ev, cx, y + 1.0, cz + 1.8, 2.4, 2.2, [cx, y + 0.15, cz + 2.4], 0x9aff6a);
  }
  const KINDS = ['rund', 'kreuz', 'spitz'];
  const graves = [[-3.2, -2.4, 1.1], [-1.2, -3.6, 0.9], [1.4, -2.6, 1.0], [3.4, -2.0, 1.2], [5.6, -3.2, 0.95], [-8.6, -2.0, 1.0], [8.0, -2.4, 1.05], [10.4, -3.6, 0.9]];
  graves.forEach(([dx, dz, s], i) => {
    const yaw = (i % 3 - 1) * 0.2;
    if (!bakeHw(ev, 'grabstein', { kind: KINDS[i % 3], size: s * 1.1, tilt: ((i * 7) % 5 - 2) * 0.05, pumpkin: i % 4 === 1 }, [x + dx, y + 0.15, z + dz], yaw, 2000)) ev.addStatic(place(graveGeo(i * 7 + 3, s), x + dx, y + 0.15, z + dz, yaw), { castShadow: true });
  });
  if (bakeHw(ev, 'halloween_baum', { height: 5.4, lanterns: 3, seed: 1 }, [x + 7.2, y + 0.15, z - 5.4], -0.4, 8000)) light(ev, x + 7.2, y + 3.4, z - 5.0, 1.0);
  else ev.addStatic(place(spookTreeGeo(5.2, 77), x + 7.2, y + 0.15, z - 5.4, 0), { castShadow: true });
  ev.addStatic(place(hwPropGeo({ kind: 'owl', size: 0.9 }, 1), x + 9.6, y + 0.15, z - 5.0, -0.3), { castShadow: true });
  ev.addStatic(place(hwPropGeo({ kind: 'candles' }, 5), x + 1.4, y + 0.15, z - 2.0, 0), { castShadow: false });
  addGlow(ev, hwPropGlowCandles(5), x + 1.4, y + 0.15, z - 2.0);
  light(ev, x + 1.4, y + 0.6, z - 1.95, 0.8);
  // Geist schaut hinter dem großen Grabstein hervor (alle 7 s: hoch, zur Seite lehnen, winken, wieder weg)
  const gp = ev.def.ghost ?? [x + 3.4, y + 0.15, z - 2.0];
  if (!bakeHw(ev, 'grabstein', { kind: 'rund', size: 1.7 }, gp, 0.05, 2000)) ev.addStatic(place(graveGeo(4, 1.6), gp[0], gp[1], gp[2], 0.05), { castShadow: true });
  const PERIOD = 7;
  const gstate = { phase: 'hidden', peek: 0, peeks: 0, model: false };
  // Geist: Registry-Modell 'kreisgeist_halloween' (Lakengeist mit Zipfelmütze, schaut), sonst eigener kleiner Geist
  const gm = live(ev, 'kreisgeist_halloween', {}, gp, 0, 1, () => ({ anim: gstate.phase === 'peek' ? 'peek' : 'circle' }), 5000);
  const ghostMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x3a3460, transparent: true, opacity: 0.95 });
  ev.own.push(ghostMat);
  const ghost = gm ? gm.root : new THREE.Mesh(ghostGeo(), ghostMat);
  ghost.name = 'hw:geist';
  gstate.model = !!gm;
  if (!gm) { ghost.castShadow = false; ev.view.add(ghost); }
  const baseYaw = gm ? -0.2 + FRONT : -0.2;
  const placeGhost = (t) => {
    const u = (t % PERIOD) / PERIOD;
    // 0–0.45 versteckt, 0.45–0.6 hoch und zur Seite, 0.6–0.85 schaut und wackelt, 0.85–1 zurück
    const up = u < 0.45 ? 0 : u < 0.6 ? (u - 0.45) / 0.15 : u < 0.85 ? 1 : 1 - (u - 0.85) / 0.15;
    const e = up * up * (3 - 2 * up);
    gstate.peek = +e.toFixed(3);
    gstate.phase = e < 0.02 ? 'hidden' : u < 0.6 ? 'rise' : u < 0.85 ? 'peek' : 'hide';
    gstate.peeks = Math.floor(t / PERIOD);
    ghost.visible = e > 0.01;
    ghost.position.set(gp[0] + 0.55 * e, gp[1] + 0.25 + 1.05 * e + Math.sin(t * 3) * 0.04 * e, gp[2] - 0.45);
    ghost.rotation.set(0, baseYaw, -0.35 * e + (gstate.phase === 'peek' ? Math.sin(t * 6) * 0.08 : 0), 'YXZ');
    ghost.scale.setScalar(gm ? 0.9 : 0.8);
    ghostMat.opacity = 0.35 + 0.6 * e;
  };
  placeGhost(0);
  ev.updaters.push((dt, t) => placeGhost(t));
  // Nebelschwaden zwischen den Gräbern (Instanzen, ziehen langsam)
  const N = 9;
  const fogMat = new THREE.MeshBasicMaterial({ map: mistTexture(), color: 0xeae0ff, transparent: true, opacity: 0.55, depthWrite: false, fog: true });
  ev.own.push(fogMat);
  const fog = new THREE.InstancedMesh(mistGeo(), fogMat, N);
  fog.frustumCulled = false; fog.renderOrder = 2; fog.name = 'hw:friedhofsnebel';
  ev.view.add(fog);
  ev.own.push(fog);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const putFog = (t) => {
    for (let i = 0; i < N; i++) {
      const ph = i * 2.1, span = 24;
      const fx = x - 12 + ((i * 3.1 + t * 0.35 + Math.sin(ph) * 3) % span + span) % span;
      p.set(fx, y + 0.45 + (i % 3) * 0.12 + Math.sin(t * 0.8 + ph) * 0.06, z - 1.6 - (i % 3) * 1.6 + Math.sin(t * 0.3 + ph) * 0.4);
      const k = 1.1 + 0.3 * Math.sin(t * 0.5 + ph);
      sc.set(k * 4.2, 1, k * 2.6);
      m4.compose(p, q, sc);
      fog.setMatrixAt(i, m4);
    }
    fog.instanceMatrix.needsUpdate = true;
  };
  putFog(0);
  ev.updaters.push((dt, t) => putFog(t));
  addInfo(ev, () => ({ ghost: { ...gstate } }));
}
function batShapeGeoShape() { return batShape(1.1); }
function hwPropGlowCandles(seed) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) {
    const h = rnd.real(0.18, 0.36), xx = [-0.12, 0.1, 0][i], zz = [0, 0.06, 0.14][i];
    b.cone(0.035, 0.11, 0xfff0a0, { p: [xx, h + 0.06, zz] }, 5);
  }
  return b.geometry();
}

// ------------------------------------------------------------------ H-4 Hexenturm mit Kessel

function witchTowerGeo() {
  return cached('hw:witchtower', () => {
    const b = new Build();
    // Steinsockel, Holzgeschoss, oberes Steingeschoss (leicht versetzt – schief), verbogene Spitze
    b.cyl(2.5, 2.8, 3.2, (px, py, pz) => ((Math.floor(py * 2.2 + 10) + Math.floor(Math.atan2(pz, px) * 2.6 + 10)) % 2 ? 0x6e6688 : 0x5e5676), { p: [0, 1.6, 0] }, 12);
    b.cyl(2.2, 2.5, 3.0, (px, py, pz) => (Math.floor(Math.atan2(pz, px) * 4 + 20) % 2 ? 0x8a6a5a : 0x7a5a4c), { p: [0.15, 4.7, 0] }, 12);
    b.torus(2.3, 0.14, 0x4a3a32, { p: [0.15, 3.25, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
    b.cyl(1.9, 2.2, 2.8, (px, py, pz) => ((Math.floor(py * 2.2 + 10) + Math.floor(Math.atan2(pz, px) * 2.6 + 10)) % 2 ? 0x7a6a92 : 0x6a5a82), { p: [0.45, 7.6, 0], r: [0, 0, -0.05] }, 12);
    b.torus(2.0, 0.14, 0x4a3a32, { p: [0.4, 6.2, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
    b.cyl(2.3, 2.3, 0.3, 0x3a2e4a, { p: [0.6, 9.1, 0] }, 12);
    // Spitzdach mit verbogener Spitze
    b.cone(2.7, 3.0, (px, py) => (Math.floor(py * 3 + 20) % 2 ? 0x4a2a6e : 0x5a3a82), { p: [0.6, 10.7, 0] }, 12);
    b.tube([[0.6, 11.8, 0], [0.7, 12.9, 0], [1.3, 13.6, 0.1], [2.0, 13.5, 0.15]], 0.32, 0x4a2a6e, null, 10, 6);
    b.sphere(0.2, 0xffc21a, { p: [2.1, 13.45, 0.15] }, 6, 4);
    // Tür, Fensterrahmen, Kamin-Rohr
    const door = new THREE.Shape(); door.moveTo(-0.55, 0); door.lineTo(-0.55, 1.3); door.absarc(0, 1.3, 0.55, Math.PI, 0, true); door.lineTo(0.55, 0); door.closePath();
    b.extrude(door, 0.12, 0x4a2a1e, { p: [0, 0, 2.62] }, 0, 8);
    for (const [fx, fy, fz] of [[1.0, 5.0, 2.22], [-0.6, 7.9, 1.92], [1.3, 7.4, 1.6]]) b.box(0.66, 0.8, 0.1, 0x2a2030, { p: [fx, fy, fz] }, 0, 1);
    b.cyl(0.18, 0.2, 1.4, 0x3a3044, { p: [-1.6, 6.2, -0.8], r: [0, 0, 0.2] }, 6);
    return b.geometry();
  });
}
function witchTowerGlowGeo() {
  return cached('hw:witchtowerglow', () => {
    const b = new Build();
    for (const [fx, fy, fz] of [[1.0, 5.0, 2.27], [-0.6, 7.9, 1.97], [1.3, 7.4, 1.65]]) b.box(0.46, 0.6, 0.04, 0x9aff6a, { p: [fx, fy, fz] }, 0);
    return b.geometry();
  });
}

function witchTower(ev, x, y, z) {
  const towerModel = bakeHw(ev, 'hexenturm', { part: 'ganz', height: 8, radius: 2.4, lean: 0.55, windows: 3 }, [x, y, z], -0.15, 12000, { state: { lit: true }, tile: 'hw:hexenturm' });
  if (!towerModel) {
    ev.addStatic(place(witchTowerGeo().clone(), x, y, z, 0), { castShadow: true });
    const wm = glowMat(ev, 0xffffff, { vertexColors: true });
    const win = new THREE.Mesh(witchTowerGlowGeo(), wm);
    win.position.set(x, y, z);
    win.name = 'hw:turmfenster';
    ev.view.add(win);
    ev.updaters.push((dt, t) => wm.color.setScalar(0.8 + 0.2 * Math.sin(t * 2.3) * Math.sin(t * 0.9)));
  }
  solidCyl(ev, x, z, 2.8, y, y + 12, 'hexenturm');
  if (!towerModel) ev.addStatic(place(cobwebGeo(0.9).clone(), x - 1.9, y + 2.6, z + 1.9, 0.6), { castShadow: false });
  // Hexenkessel auf Glut: grüner Trank, Blasen steigen und platzen, grüner Schein
  const [kx, ky, kz] = ev.def.cauldron ?? [x + 4.6, y, z + 2.6];
  const kessel = live(ev, 'hexenkessel', { size: 1.05 }, [kx, ky, kz], 0, 1, (dt, t) => ({ bounce: 0, bubble: 0.8 + 0.2 * Math.sin(t * 2) }), 9500);
  const brewY = kessel ? ky + (kessel.root.userData.top ?? 1.0) : ky + 1.18;
  if (kessel) {
    addGeo(ev, 'hw:potions', () => {
      const b = new Build();
      for (let i = 0; i < 3; i++) { const c = [0xb44aff, 0x4ad8ff, 0xff5a9a][i]; b.sphere(0.16, c, { p: [1.25 + i * 0.32, 0.16, 0.5 - i * 0.2], s: [1, 1.1, 1] }, 7, 5); b.cyl(0.05, 0.06, 0.16, c, { p: [1.25 + i * 0.32, 0.36, 0.5 - i * 0.2] }, 5); b.cyl(0.06, 0.06, 0.06, 0x8a5a3a, { p: [1.25 + i * 0.32, 0.46, 0.5 - i * 0.2] }, 5); }
      b.box(0.6, 0.12, 0.45, 0x8a2a4a, { p: [-1.3, 0.06, 0.6], r: [0, 0.4, 0] }, 0.03, 1);
      b.box(0.56, 0.06, 0.41, 0xfff0d0, { p: [-1.3, 0.15, 0.6], r: [0, 0.4, 0] }, 0, 1);
      return b.geometry();
    }, kx, ky, kz);
  } else {
    addGeo(ev, 'hw:cauldron', () => {
      const b = new Build();
      b.lathe([[0.01, 0.25], [0.6, 0.3], [0.88, 0.62], [0.92, 1.0], [0.82, 1.22], [0.86, 1.3], [0.76, 1.32]], { v: (px, py) => mix(0x1e1a28, 0x3e3650, py / 1.3) }, null, 14, 1);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.3; b.cyl(0.07, 0.05, 0.4, 0x1e1a28, { p: [Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6], r: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] }, 4); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cyl(0.08, 0.08, 0.9, 0x5a3a2a, { p: [Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55], r: [0, -a, Math.PI / 2] }, 5); }
      // Tränke-Fläschchen und Zauberbuch daneben
      for (let i = 0; i < 3; i++) { const c = [0xb44aff, 0x4ad8ff, 0xff5a9a][i]; b.sphere(0.16, c, { p: [1.25 + i * 0.32, 0.16, 0.5 - i * 0.2], s: [1, 1.1, 1] }, 7, 5); b.cyl(0.05, 0.06, 0.16, c, { p: [1.25 + i * 0.32, 0.36, 0.5 - i * 0.2] }, 5); b.cyl(0.06, 0.06, 0.06, 0x8a5a3a, { p: [1.25 + i * 0.32, 0.46, 0.5 - i * 0.2] }, 5); }
      b.box(0.6, 0.12, 0.45, 0x8a2a4a, { p: [-1.3, 0.06, 0.6], r: [0, 0.4, 0] }, 0.03, 1);
      b.box(0.56, 0.06, 0.41, 0xfff0d0, { p: [-1.3, 0.15, 0.6], r: [0, 0.4, 0] }, 0, 1);
      return b.geometry();
    }, kx, ky, kz);
    addGlow(ev, (() => { const b = new Build(); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.sphere(0.16, i % 2 ? 0xffb03a : 0xff6a1a, { p: [Math.cos(a) * 0.3, 0.12, Math.sin(a) * 0.3], s: [1.2, 0.6, 1.2] }, 5, 3); } return b.geometry(); })(), kx, ky, kz);
  }
  solidCyl(ev, kx, kz, 0.95, ky, ky + 1.3, 'kessel');
  const brew = new THREE.Mesh(cached('hw:brew', () => new THREE.CircleGeometry(0.8, 16).rotateX(-Math.PI / 2)), glowMat(ev, 0x7aff5a));
  brew.position.set(kx, brewY, kz);
  brew.name = 'hw:trank';
  brew.visible = !kessel;   // das Kessel-Modell hat seinen eigenen Blubber
  ev.view.add(brew);
  light(ev, kx, brewY + 0.3, kz, 2.6, 2.6, [kx, ky, kz], 0x8aff6a);
  const NB = 8;
  const bubMat = new THREE.MeshBasicMaterial({ color: 0xb4ff8a, transparent: true, opacity: 0.85, fog: true });
  ev.own.push(bubMat);
  const bub = new THREE.InstancedMesh(cached('hw:bubble', () => new THREE.IcosahedronGeometry(1, 1)), bubMat, NB);
  bub.frustumCulled = false; bub.name = 'hw:blasen';
  ev.view.add(bub);
  ev.own.push(bub);
  const cstate = { bubbles: 0, pops: 0 };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const putBubbles = (t) => {
    let alive = 0;
    for (let i = 0; i < NB; i++) {
      const life = 1.6, ph = (i / NB) * life * 1.7;
      const u = ((t + ph) % (life * 1.7)) / life;   // 0..1 steigen, danach Pause
      let s = 0;
      if (u < 1) {
        const a = i * 2.4;
        p.set(kx + Math.cos(a) * 0.38 * (1 - u * 0.5), brewY + 0.02 + u * 0.9, kz + Math.sin(a) * 0.38 * (1 - u * 0.5));
        s = (0.07 + 0.08 * Math.sin(u * Math.PI)) * (u > 0.88 ? 1 + (u - 0.88) * 6 : 1);
        alive++;
      } else p.set(kx, brewY - 0.1, kz);
      sc.setScalar(Math.max(0.0001, s));
      m4.compose(p, q, sc);
      bub.setMatrixAt(i, m4);
    }
    bub.instanceMatrix.needsUpdate = true;
    cstate.bubbles = alive;
    cstate.pops = Math.floor(t / (1.6 * 1.7)) * NB;
    brew.position.y = brewY + Math.sin(t * 5) * 0.02;
  };
  putBubbles(0);
  ev.updaters.push((dt, t) => putBubbles(t));
  // Besen fliegt Runden um die Turmspitze
  const broom = mover(ev, cached('hw:broom', () => {
    const b = new Build();
    b.cyl(0.04, 0.05, 1.7, 0x8a5a34, { p: [0, 0, 0], r: [0, 0, Math.PI / 2] }, 5);
    b.cone(0.22, 0.6, 0xe0b05a, { p: [-1.05, 0, 0], r: [0, 0, Math.PI / 2] }, 7);
    b.cyl(0.1, 0.1, 0.08, 0x8a2a4a, { p: [-0.72, 0, 0], r: [0, 0, Math.PI / 2] }, 7);
    return b.geometry();
  }), x, y + 9.5, z, 'hw:besen');
  const R = 4.2;
  const flyBroom = (t) => {
    const a = t * 0.9;
    broom.position.set(x + 0.6 + Math.cos(a) * R, y + 9.2 + Math.sin(t * 1.7) * 0.5, z + Math.sin(a) * R * 0.85);
    broom.rotation.set(0, -a - Math.PI, Math.sin(t * 1.7) * 0.15, 'YXZ');
  };
  flyBroom(0);
  ev.updaters.push((dt, t) => flyBroom(t));
  addInfo(ev, () => ({ cauldron: { ...cstate, model: !!kessel } }));
}

// ------------------------------------------------------------------ H-Burg Gruselschloss

function castleGeo() {
  return cached('hw:castle', () => {
    const b = new Build();
    const stone = (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a6286 : ((Math.floor(py * 1.5) + Math.floor((px + pz) * 0.8)) & 1) ? 0x4e4664 : 0x585070);
    // Bergfried mit Zinnen
    b.box(9, 7.5, 5, stone, { p: [0, 3.75, 0] }, 0.08, 1);
    for (let i = 0; i < 8; i++) b.box(0.7, 0.8, 5.1, 0x3e3858, { p: [-3.9 + i * 1.12, 7.9, 0] }, 0, 1);
    b.cone(3.6, 4.2, (px, py) => (Math.floor(py * 3 + 20) % 2 ? 0x6a2a8a : 0x7a3a9a), { p: [0, 10.4, -0.6], r: [0, Math.PI / 4, 0] }, 4);
    // Seitentürme mit Spitzdächern
    for (const s of [-1, 1]) {
      b.cyl(2.0, 2.2, 11, stone, { p: [s * 5.6, 5.5, 0.4] }, 12);
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.box(0.55, 0.65, 0.55, 0x3e3858, { p: [s * 5.6 + Math.cos(a) * 1.85, 11.3, 0.4 + Math.sin(a) * 1.85] }, 0, 1); }
      b.cone(2.6, 4.6, (px, py) => (Math.floor(py * 3 + 20) % 2 ? 0x6a2a8a : 0x7a3a9a), { p: [s * 5.6, 14.0, 0.4] }, 12);
      b.cyl(0.04, 0.04, 1.4, 0x2a2238, { p: [s * 5.6, 16.9, 0.4] }, 4);
    }
    // Spitzbogentor mit Holzflügeln, Stufen
    const door = new THREE.Shape(); door.moveTo(-1.4, 0); door.lineTo(-1.4, 2.2); door.quadraticCurveTo(-1.3, 3.5, 0, 3.9); door.quadraticCurveTo(1.3, 3.5, 1.4, 2.2); door.lineTo(1.4, 0); door.closePath();
    b.extrude(door, 0.2, (px) => (Math.floor(px * 2.5 + 10) % 2 ? 0x5a2a2a : 0x4a2224), { p: [0, 0, 2.55] }, 0, 8);
    b.torus(1.55, 0.14, 0x6a6286, { p: [0, 2.35, 2.6], s: [1, 1.05, 1] }, 4, 16, Math.PI);
    for (const sx of [-0.35, 0.35]) b.torus(0.14, 0.04, 0xffc21a, { p: [sx, 1.6, 2.72] }, 3, 10);
    for (let i = 0; i < 3; i++) b.box(4.4 - i * 0.6, 0.22, 0.7, 0x6a6286, { p: [0, 0.11 + i * 0.22, 3.25 - i * 0.5] }, 0.03, 1);
    // Fensterrahmen
    for (const [fx, fy, fz] of CASTLE_WIN) b.box(0.8, 1.2, 0.1, 0x2a2238, { p: [fx, fy, fz] }, 0, 1);
    return b.geometry();
  });
}
const CASTLE_WIN = [[-2.8, 5.2, 2.52], [2.8, 5.2, 2.52], [-5.6, 7.6, 2.42], [5.6, 7.6, 2.42], [-5.6, 4.2, 2.42], [5.6, 4.2, 2.42], [0, 6.2, 2.52]];
function castleGlowGeo() {
  return cached('hw:castleglow', () => {
    const b = new Build();
    for (const [fx, fy, fz] of CASTLE_WIN) {
      const sh = new THREE.Shape(); sh.moveTo(-0.28, -0.42); sh.lineTo(-0.28, 0.2); sh.absarc(0, 0.2, 0.28, Math.PI, 0, true); sh.lineTo(0.28, -0.42); sh.closePath();
      b.extrude(sh, 0.03, 0xffc04a, { p: [fx, fy, fz + 0.06] }, 0, 6);
    }
    return b.geometry();
  });
}
/** Fahne: Fledermaus über einem Zylinder mit Monokel (Graf Brummbär) auf Lila. */
function castleFlagTexture() {
  return canvasTexture('hw:castleflag', 128, 80, (c, w, h) => {
    c.fillStyle = '#5a2a8a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff8a1a'; c.fillRect(0, h - 10, w, 10);
    c.fillStyle = '#1e1430';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.42);
    c.quadraticCurveTo(w * 0.36, h * 0.12, w * 0.12, h * 0.3); c.quadraticCurveTo(w * 0.22, h * 0.42, w * 0.2, h * 0.62);
    c.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.38, h * 0.62); c.quadraticCurveTo(w * 0.44, h * 0.5, w * 0.5, h * 0.7);
    c.quadraticCurveTo(w * 0.56, h * 0.5, w * 0.62, h * 0.62); c.quadraticCurveTo(w * 0.7, h * 0.5, w * 0.8, h * 0.62);
    c.quadraticCurveTo(w * 0.78, h * 0.42, w * 0.88, h * 0.3); c.quadraticCurveTo(w * 0.64, h * 0.12, w * 0.5, h * 0.42); c.fill();
    c.fillRect(w * 0.43, h * 0.08, w * 0.14, h * 0.2); c.fillRect(w * 0.38, h * 0.26, w * 0.24, h * 0.05);
    c.strokeStyle = '#ffd23a'; c.lineWidth = 2; c.beginPath(); c.arc(w * 0.55, h * 0.47, 4, 0, TAU); c.stroke();
  });
}

function spookCastle(ev, x, y, z) {
  ev.addStatic(place(castleGeo().clone(), x, y, z, 0), { castShadow: true });
  const wm = glowMat(ev, 0xffffff, { vertexColors: true });
  const win = new THREE.Mesh(castleGlowGeo(), wm);
  win.position.set(x, y, z);
  win.name = 'hw:schlossfenster';
  ev.view.add(win);
  ev.updaters.push((dt, t) => wm.color.setScalar(0.82 + 0.16 * Math.sin(t * 1.9 + 1) * Math.sin(t * 0.7)));
  solidBox(ev, x - 4.5, y, z - 2.5, x + 4.5, y + 8, z + 2.5, 'schloss');
  for (const s of [-1, 1]) solidCyl(ev, x + s * 5.6, z + 0.4, 2.2, y, y + 11, 'schlossturm');
  solidBox(ev, x - 2.2, y, z + 2.5, x + 2.2, y + 0.66, z + 3.6, 'treppe');
  // Fahne mit Fledermaus auf dem Bergfried, Kürbisse und Laternen am Tor, Spinnweben
  wavingFlag(ev, x + 0.05, y + 12.9, z - 0.6, 2.0, 1.25, castleFlagTexture());
  addGeo(ev, 'hw:flagpole', () => { const b = new Build(); b.cyl(0.05, 0.06, 2.8, 0x2a2238, { p: [0, 1.4, 0] }, 5); b.sphere(0.1, 0xffc21a, { p: [0, 2.85, 0] }, 6, 4); return b.geometry(); }, x, y + 11.4, z - 0.6);
  for (const s of [-1, 1]) {
    pumpkinAt(ev, x + s * 2.7, y, z + 3.6, 0.9, s > 0 ? 1 : 0, -s * 0.2, 90 + s);
    lanternAt(ev, x + s * 3.6, y, z + 2.9, s > 0 ? Math.PI : 0, 3.0);
  }
  ev.addStatic(place(cobwebGeo(1.0).clone(), x - 3.4, y + 6.2, z + 2.6, 0), { castShadow: false });
  ev.addStatic(place(cobwebGeo(0.8).clone(), x + 3.6, y + 3.0, z + 2.6, Math.PI), { castShadow: false });
  // Graf Brummbär (Registry-Modell) steht auf der obersten Stufe vor dem Tor und wiegt sich, zwirbelt den Bart
  const graf = live(ev, 'graf_brummbaer', {}, [x + 0.2, y + 0.66, z + 2.9], 0.15, 0.82, { anim: 'idle', hp: 3 }, 23000);
  // Fledermaus-Schwarm des Grafen kreist um die Türme (Registry-Modell, sonst nur die Schwärme aus den Weltdaten)
  const swarm = live(ev, 'fledermaus_schwarm', { count: 10, spread: 1.6, leader: true }, [x, y + 13, z], 0, 1, { anim: 'fly' }, 8500);
  if (swarm) {
    const fly = (t) => { const a = t * 0.5; swarm.root.position.set(x + Math.cos(a) * 7.5, y + 12.5 + Math.sin(t * 1.1) * 0.8, z + Math.sin(a) * 4.5); swarm.root.rotation.y = -a; };
    fly(0);
    ev.updaters.push((dt, t) => fly(t));
  }
  addInfo(ev, () => ({ castle: { graf: !!graf, swarm: !!swarm } }));
}
