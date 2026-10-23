// Kulissen der Welt-3-Eingänge (Kurs-Karte „Schnee und Eis“), aufgerufen aus EntranceView.decorate():
//   snowfield    3-1  Schneefeld-Tor: Säulen aus Schneeblöcken, Holzbalken mit Eiszapfen, Schild mit Schneeflocke,
//                     Schneeballhaufen, Ski, Schlitten, kleiner Schneemann
//   skyladder    3-2  Himmelsleiter: Mast mit Kettenzäunen im Zickzack bis in die Wolken, oben ein drehender Stern
//   spookhouse   3-3  Spukhaus auf dem Hügel: schiefe Villa mit Turm, flackernde Fenster, Spuk-Tür, Gewitterwölkchen,
//                     drei Gespenster kreisen um den Turm
//   kapitaen     3-Kapitän  Krümels See-Diorama (Vitrine mit Mini-See, Steg und Glasröhren), Krümel winkt; erscheint
//                     erst nach 3-3 (def.appear: taucht mit Platschen aus dem See auf)
//   pavilion     3-4  Pastell-Garten-Pavillon: Rundtempel mit gestreifter Kuppel, Girlanden, Hecken-Hasen, Blumen
//   redfortress  3-A  rote Käfig-Festung: Burgmauer mit Türmen, rote Gitter (def.cage), Eckpodeste (def.podests)
//   lagoon       3-5  Lagune mit Röhren: grüne Röhren ragen aus dem Wasser, Korallen, Wrack, Rettungsring
//   racehill     3-6  Rennberg: Rennstraße als Rampe (def.road), Startbogen, Banden, Boost-Pfeile, Zielflaggen
//   circustent   3-B  Zirkuszelt mit Kassenhäuschen und Wimpeln; Seilbahn (def.ropeway) mit fahrender Gondel
//   autumnfalls  3-7  Herbstwald: Wasserfall (def.waterfall) ins Becken, Schienen auf Stützen mit fahrender
//                     Schalttafel (def.rail)
//   station      3-Zug Bahnhof: Bahnsteigdach, Bahnhofshäuschen mit Uhr, Zug (Lok + Wagen) am Gleis (def.train),
//                     Baron-Brummbär-Flagge auf dem Dach
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (Registry-Modelle über bakeModel), bewegte
// sind eigene Objekte (ev.updaters). Lage: decor = [x, y, z] (Fuß der Kulisse), Podest = def.pos.

import * as THREE from 'three';
import { mix, TAU, cached, vcol, basic, std, starShape, glowTexture, sparkleTexture } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { schneeblockGeo, eiszapfenGeo } from '../models/lib/schnee_w3.js';
import { wedge } from '../blocks/kit.js';
import { bakeModel } from './bake.js';
import { baronFlagTexture, glassBoxMesh, cageGeo } from './props.js';
import { LowBuild as Build, place } from './desert.js';
import { flame, wavingFlag } from './decor_w2.js';
import {
  SNOW, snowballsGeo, skisGeo, sledGeo, snowRockGeo, lampGeo, lampGlowGeo, trackGeo, buoyGeo, buntingGeo, iceFloeGeo,
  snowDriftGeo, benchGeo, firGeo, crystalGeo, pastelBlockGeo, barrierGeo, railGeo, snowmanGeo, flowerClumpGeo, wagonGeo, campfireGeo,
  topiaryBunnyGeo, rowboatGeo, coralGeo, wreckGeo,
} from './snow.js';

/** Kulisse für eine Welt-3-Art bauen; false = unbekannte Art. */
export function decorateW3(ev, kind, x, y, z) {
  switch (kind) {
    case 'snowfield': snowfieldGate(ev, x, y, z); return true;
    case 'skyladder': skyLadder(ev, x, y, z); return true;
    case 'spookhouse': spookHouse(ev, x, y, z); return true;
    case 'kapitaen': kapitaenDiorama(ev, x, y, z); return true;
    case 'pavilion': pavilion(ev, x, y, z); return true;
    case 'redfortress': redFortress(ev, x, y, z); return true;
    case 'lagoon': lagoon(ev, x, y, z); return true;
    case 'racehill': raceHill(ev, x, y, z); return true;
    case 'circustent': circusTent(ev, x, y, z); return true;
    case 'autumnfalls': autumnFalls(ev, x, y, z); return true;
    case 'station': station(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const adder = (ev) => (g, o) => ev.addStatic(g, o);
/** Registry-Modell als statische Kulisse einbacken (Modelle blicken nach +X). */
function bake(ev, name, opts, pos, yaw = 0, scale = 1, state = null, cast = true) {
  // cast = false: ohne Sonnenschatten (vielteilige Modelle; ggf. wirft ein einfacher Stellvertreter den Schatten)
  const add = cast ? adder(ev) : (g, o) => ev.addStatic(g, { ...o, castShadow: false });
  return bakeModel(add, name, opts, pos, yaw, scale, state);
}
/** Schattenwerfer für ein ohne Schatten eingebackenes Modell: schlichter Körper, im Modell verborgen. */
function shadowProxy(ev, geo, x, y, z, yaw = 0) { ev.addStatic(place(geo, x, y, z, yaw), { castShadow: true }); }
/** Registry-Modell als bewegtes Objekt (eigene Zeichenaufrufe), state je Bild. */
function live(ev, name, opts, pos, yaw = 0, scale = 1, state = 'idle', parent = null) {
  if (!hasModel(name)) return null;
  const m = getModel(name, opts ?? {});
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  if (parent) parent.add(m.root); else ev.view.add(m.root);
  ev.own.push(m);
  ev.updaters.push((dt) => m.update(dt, typeof state === 'function' ? state() : state));
  return m;
}
const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color) => { const m = new THREE.MeshBasicMaterial({ color, fog: true }); ev.own.push(m); return m; };

/** Sechsstrahlige Schneeflocke als flache Form (Fläche XY). */
function flakeShape(R) {
  const s = new THREE.Shape();
  const arm = R * 0.17;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r = i % 2 ? R * 0.38 : R;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  void arm;
  return s;
}

// ------------------------------------------------------------------ 3-1 Schneefeld-Tor

function snowfieldGate(ev, x, y, z) {
  const g = cached('w3m:snowgate', () => {
    const b = new Build();
    const block = schneeblockGeo(true);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const bg = block.clone();
        bg.rotateY((k - 1) * 0.08 * s);
        bg.translate(s * 2.75, k * 0.98, 0);
        b.parts.push(bg);
      }
      b.sphere(0.5, { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [s * 2.75, 3.05, 0], s: [1.2, 0.55, 1.2] }, 8, 5);
    }
    // Balken mit Schneedecke und Eiszapfen
    b.box(6.6, 0.42, 0.55, { v: (px, py) => mix(0x6a4428, 0x9a6a40, py / 0.42 + 0.5) }, { p: [0, 3.28, 0] }, 0.06, 1);
    b.box(6.8, 0.26, 0.7, { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [0, 3.58, 0] }, 0.12, 1);
    for (let i = 0; i < 7; i++) {
      const ic = eiszapfenGeo(3, 0.55 + (i % 3) * 0.18, true).clone();
      ic.translate(-2.1 + i * 0.7, 3.06, 0.2);
      b.parts.push(ic);
    }
    // hängendes Schild mit Schneeflocke
    for (const s of [-1, 1]) b.cyl(0.025, 0.025, 0.5, 0xe8d8b0, { p: [s * 0.75, 2.85, 0.18] }, 4);
    b.box(2.0, 0.95, 0.12, 0x2a6ae8, { p: [0, 2.2, 0.2] }, 0.06, 1);
    b.box(1.82, 0.78, 0.04, 0xeaf4ff, { p: [0, 2.2, 0.27] }, 0, 1);
    b.extrude(flakeShape(0.34), 0.05, 0x5ab4f0, { p: [-0.45, 2.2, 0.3] }, 0, 1);
    b.extrude(flakeShape(0.22), 0.05, 0x8ad0ff, { p: [0.15, 2.32, 0.3] }, 0, 1);
    b.extrude(flakeShape(0.16), 0.05, 0x3a8ae8, { p: [0.55, 2.05, 0.3] }, 0, 1);
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z));
  for (const s of [-1, 1]) solidBox(ev, x + s * 2.75 - 0.55, y, z - 0.55, x + s * 2.75 + 0.55, y + 3.4, z + 0.55);
  // Schneeballhaufen, Ski und Schlitten links, Schneemann rechts
  ev.addStatic(place(snowballsGeo(9, 0.3), x - 4.6, y, z + 1.6, 0.3), { castShadow: true });
  solidCyl(ev, x - 4.6, z + 1.6, 0.9, y, y + 1.2);
  ev.addStatic(place(skisGeo(), x - 4.4, y, z - 0.2, 0.2), { castShadow: true });
  ev.addStatic(place(sledGeo(), x + 4.8, y, z + 3.3, -0.5), { castShadow: true });
  // Lagerfeuer vor den Iglus (Flamme flackert)
  const fx = x + (ev.def.fire?.[0] ?? -4.6), fz = z + (ev.def.fire?.[1] ?? 8.1);
  ev.addStatic(place(campfireGeo(), fx, y, fz), { castShadow: true });
  solidCyl(ev, fx, fz, 0.75, y, y + 0.5);
  flame(ev, fx, y + 0.75, fz, 1.15);
  ev.addStatic(place(snowmanGeo(7), x + 4.3, y, z + 0.9, 0.5), { castShadow: true });
  solidCyl(ev, x + 4.3, z + 0.9, 0.55, y, y + 2.1);
}

// ------------------------------------------------------------------ 3-2 Himmelsleiter

function skyLadder(ev, x, y, z) {
  const H = ev.def.height ?? 17;
  const panels = [];
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 1.35;
    panels.push({ a, y: y + 0.6 + i * 2.85, x: x + Math.cos(a) * 1.25, z: z + Math.sin(a) * 1.25 });
  }
  // Fundament, Mast mit Ringen, Wolkenbänke
  const g = new Build();
  g.box(2.6, 0.7, 2.6, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xf2f6fb : 0x8a96aa) }, { p: [x, y + 0.35, z] }, 0.08, 1);
  g.cyl(0.16, 0.2, H, { v: (px, py, pz, nx) => mix(0x2f5aa8, 0x6a9ae8, nx * 0.5 + 0.5) }, { p: [x, y + H / 2, z] }, 10);
  for (let i = 1; i < 6; i++) g.torus(0.21, 0.05, 0xffc21a, { p: [x, y + i * (H / 6), z], r: [Math.PI / 2, 0, 0] }, 4, 12);
  const cloud = (cx, cy, cz, s) => {
    for (const [dx, dy, dz, r] of [[0, 0, 0, 1], [-0.9, -0.1, 0.1, 0.7], [0.9, -0.12, -0.1, 0.75], [0.3, 0.3, -0.25, 0.65]]) {
      g.sphere(r * s, { v: (px, py, pz, nx, ny) => mix(0xc4d8f2, 0xffffff, ny * 0.5 + 0.55) }, { p: [cx + dx * s, cy + dy * s, cz + dz * s], s: [1, 0.72, 1] }, 9, 6);
    }
  };
  cloud(x + 1.9, y + 4.6, z + 0.6, 1.0);
  cloud(x - 1.8, y + 9.8, z - 0.4, 1.1);
  cloud(x + 0.2, y + H + 0.4, z, 1.9);
  cloud(x - 1.3, y + H - 0.2, z + 1.0, 1.2);
  ev.addStatic(g.geometry(), { castShadow: true });
  solidBox(ev, x - 1.3, y, z - 1.3, x + 1.3, y + H, z + 1.3);
  // Kettenzäune: Rahmen eingebacken, die Netze (Textur) als eine gemeinsame Fläche
  let netMat = null;
  const netParts = [];
  for (const p of panels) {
    const yaw = -p.a + Math.PI / 2;
    bake(ev, 'kettenzaun', { width: 2.6, height: 2.6 }, [p.x, p.y, p.z], yaw, 1, null, false);
    if (!netMat && hasModel('kettenzaun')) {
      const m = getModel('kettenzaun', { width: 2.6, height: 2.6 });
      m.root.traverse((o) => { if (o.isMesh && o.material?.map && !netMat) netMat = o.material; });
      m.dispose?.();
    }
    const pg = new THREE.PlaneGeometry(2.6, 2.48);
    const uv = pg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.6 / 0.3, uv.getY(i) * 2.48 / 0.3);
    pg.rotateY(Math.PI / 2);
    pg.translate(0, 0.06 + 1.3, 0);
    pg.rotateY(yaw);
    pg.translate(p.x, p.y, p.z);
    netParts.push(pg);
  }
  if (netMat && netParts.length) {
    const merged = mergeNets(netParts);
    ev.own.push(merged);
    const nets = new THREE.Mesh(merged, netMat);
    nets.castShadow = true;
    ev.view.add(nets);
  }
  // goldener Stern auf der Wolkenspitze (dreht sich)
  const star = new THREE.Mesh(cached('w3m:skystar', () => {
    const b = new Build();
    b.extrude(starShape(0.75, 0.34), 0.28, 0xffd23a, { p: [0, 0, 0] }, 0.08, 1);
    return b.geometry();
  }), vcol(0.3, { emissive: 0x4a3200 }, 'w3skystar'));
  star.position.set(x + 0.2, y + H + 2.4, z);
  star.castShadow = true;
  ev.view.add(star);
  const spMat = new THREE.SpriteMaterial({ map: sparkleTexture(), color: 0xfff6b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  ev.own.push(spMat);
  const sp = new THREE.Sprite(spMat);
  sp.position.set(x + 0.7, y + H + 2.9, z + 0.3);
  ev.view.add(sp);
  ev.updaters.push((dt, t) => {
    star.rotation.y = t * 1.2;
    star.position.y = y + H + 2.4 + Math.sin(t * 1.7) * 0.18;
    sp.scale.setScalar(0.3 + 0.6 * Math.max(0, Math.sin(t * 2.6)));
  });
}

function mergeNets(parts) {
  const n = parts.reduce((s, p) => s + (p.index ? p.index.count : p.attributes.position.count), 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const p0 of parts) {
    const p = p0.index ? p0.toNonIndexed() : p0;
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    uv.set(p.attributes.uv.array, o * 2);
    o += p.attributes.position.count;
    p.dispose(); p0.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ 3-3 Spukhaus

function spookHouse(ev, x, y, z) {
  const g = cached('w3m:spookhouse', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx) => mix(0x4a3a6a, 0x6a5590, (py / 5.6) * 0.7 + 0.15 + Math.abs(nx) * -0.08) };
    const boards = (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0x3a2e52 : Math.floor((px + pz) * 2.4 + 20) % 2 ? 0x5a4880 : 0x4e3e72);
    // Hauptbau (leicht schief), Vorbau
    b.box(7.4, 5.4, 5.2, boards, { p: [0.4, 2.7, 0], r: [0, 0, 0.02] }, 0.1, 1);
    // Dach: steiles Satteldach (First entlang x), Schneeflecken
    const roof = new THREE.Shape();
    roof.moveTo(-3.1, 0); roof.lineTo(0, 3.4); roof.lineTo(3.1, 0); roof.lineTo(-3.1, 0);
    b.extrude(roof, 8.2, { v: (px, py) => mix(0x1e1a36, 0x3a3462, py / 3.4) }, { p: [0.4, 5.35, 0], r: [0, Math.PI / 2, 0.02] }, 0.06, 1);
    for (const [px, pz, s] of [[-1.6, 1.4, 1.1], [1.9, -1.2, 0.9], [2.8, 1.6, 0.7]]) b.sphere(s, 0xf2f6fb, { p: [px, 5.35 + 3.4 * (1 - Math.abs(pz) / 3.1) + 0.04, pz], s: [1.3, 0.22, 0.9], r: [Math.sign(pz) * 0.83, 0, 0] }, 8, 4);
    // Turm links mit spitzem, krummem Dach
    b.cyl(1.35, 1.45, 8.2, wall, { p: [-3.9, 4.1, 0.6] }, 12);
    b.cone(1.9, 3.6, { v: (px, py) => mix(0x1e1a36, 0x3e3870, py / 3.6 + 0.5) }, { p: [-3.75, 9.9, 0.55], r: [0, 0, 0.12] }, 12);
    b.sphere(0.2, 0xffc21a, { p: [-3.35, 11.75, 0.55] }, 8, 6);
    b.torus(1.5, 0.12, 0x2a2244, { p: [-3.9, 8.15, 0.6], r: [Math.PI / 2, 0, 0] }, 4, 16);
    // schiefer Schornstein
    b.box(0.8, 2.2, 0.8, 0x5a4a5a, { p: [2.6, 7.4, -1.0], r: [0, 0, -0.16] }, 0.06, 1);
    b.box(1.0, 0.25, 1.0, 0x3a2a3a, { p: [2.8, 8.5, -1.0], r: [0, 0, -0.16] }, 0, 1);
    // Veranda mit Säulen, Stufen
    b.box(4.2, 0.35, 1.8, 0x3a2e46, { p: [0.6, 0.18, 3.4] }, 0, 1);
    b.box(3.0, 0.2, 0.8, 0x4a3e56, { p: [0.6, 0.1, 4.6] }, 0, 1);
    for (const sx of [-1.2, 2.4]) b.cyl(0.14, 0.16, 2.8, 0xd8d0e8, { p: [sx, 1.75, 4.05] }, 8);
    b.box(4.6, 0.3, 2.0, 0x2a2244, { p: [0.6, 3.2, 3.35], r: [0.16, 0, 0] }, 0, 1);
    b.box(4.7, 0.18, 2.1, 0xf2f6fb, { p: [0.6, 3.42, 3.35], r: [0.16, 0, 0] }, 0.06, 1);
    // Fensterrahmen (die Scheiben leuchten separat)
    for (const [px, py] of [[-1.7, 3.9], [2.6, 3.9], [-1.7, 1.6], [2.6, 1.6]]) b.box(1.1, 1.2, 0.14, 0x2a1e30, { p: [px, py, 2.62] }, 0, 1);
    b.torus(0.5, 0.1, 0x2a1e30, { p: [-3.9, 6.2, 2.0], r: [0, -0.3, 0] }, 5, 14);
    // Spinnennetz-Ecke und Fledermaus-Wetterfahne am Turm
    b.extrude(batShape(), 0.06, 0x1a1626, { p: [-3.35, 12.3, 0.55] }, 0, 2);
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z), { castShadow: true });
  solidBox(ev, x - 3.4, y, z - 2.8, x + 4.2, y + 7, z + 2.8);
  solidCyl(ev, x - 3.9, z + 0.6, 1.5, y, y + 11);
  solidBox(ev, x - 1.6, y, z + 2.6, x + 2.8, y + 0.35, z + 4.4);   // Veranda (begehbar)
  // Spuk-Tür (Modell; Flügel halb offen, dunkler Gang)
  bake(ev, 'spuk_tuer', {}, [x + 0.6, y + 0.35, z + 2.68], -Math.PI / 2, 0.82, { open: 0.25 }, false);
  // flackernde Fenster (grünlich-gelb), eine Fläche
  const winGeo = cached('w3m:spookwin', () => {
    const b = new Build();
    for (const [px, py] of [[-1.7, 3.9], [2.6, 3.9], [-1.7, 1.6], [2.6, 1.6]]) {
      b.box(0.42, 0.48, 0.04, 0xffffff, { p: [px - 0.24, py + 0.27, 2.7] }, 0);
      b.box(0.42, 0.48, 0.04, 0xffffff, { p: [px + 0.24, py + 0.27, 2.7] }, 0);
      b.box(0.42, 0.42, 0.04, 0xffffff, { p: [px - 0.24, py - 0.27, 2.7] }, 0);
      b.box(0.42, 0.42, 0.04, 0xffffff, { p: [px + 0.24, py - 0.27, 2.7] }, 0);
    }
    b.cyl(0.4, 0.4, 0.04, 0xffffff, { p: [-3.9 + 0.62, 6.2, 2.0 - 0.12], r: [Math.PI / 2, 0, -0.3], order: 'YXZ' }, 12);
    return b.geometry();
  });
  const wm = glowMat(ev, 0xd8ff8a);
  const win = new THREE.Mesh(winGeo, wm);
  win.position.set(x, y, z);
  ev.view.add(win);
  // Gewitterwölkchen über dem Turm
  ev.addStatic(place(cached('w3m:spookcloud', () => {
    const b = new Build();
    for (const [dx, dy, dz, r] of [[0, 0, 0, 1], [-1.1, -0.15, 0.1, 0.75], [1.0, -0.1, -0.1, 0.8], [0.3, 0.35, -0.3, 0.7]]) {
      b.sphere(r * 1.3, { v: (px, py, pz, nx, ny) => mix(0x4a4466, 0x8a84a8, ny * 0.5 + 0.5) }, { p: [dx * 1.3, dy * 1.3, dz * 1.3], s: [1, 0.7, 1] }, 9, 6);
    }
    return b.geometry();
  }).clone(), x - 3.4, y + 14.2, z + 0.2), { castShadow: false });
  // drei Gespenster kreisen um den Turm (eine Instanz-Fläche)
  const gh = new THREE.InstancedMesh(ghostGeo(), vcol(0.5, { emissive: 0x30304a }, 'w3ghost'), 3);
  gh.frustumCulled = false;
  gh.castShadow = true;
  ev.view.add(gh);
  ev.own.push(gh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tx = x - 3.9, tz = z + 0.6;
  const place3 = (t) => {
    for (let i = 0; i < 3; i++) {
      const a = t * (0.55 + i * 0.07) + (i / 3) * TAU;
      const r = 2.8 + Math.sin(t * 0.9 + i) * 0.4;
      p.set(tx + Math.cos(a) * r, y + 5.5 + i * 1.4 + Math.sin(t * 1.8 + i * 2) * 0.4, tz + Math.sin(a) * r);
      e.set(0, -a - Math.PI / 2 + Math.PI, Math.sin(t * 3 + i) * 0.15);
      q.setFromEuler(e);
      s.setScalar(0.85 + i * 0.12);
      m4.compose(p, q, s);
      gh.setMatrixAt(i, m4);
    }
    gh.instanceMatrix.needsUpdate = true;
  };
  place3(0);
  ev.updaters.push((dt, t) => {
    place3(t);
    wm.color.setHex(Math.sin(t * 6.1) + Math.sin(t * 2.3) > 1.35 ? 0xf6ffc8 : 0xc8f07a);
  });
  // Laterne mit grünem Schein am Weg
  ev.addStatic(place(lampGeo(2.6), x + 4.6, y, z + 4.2));
  ev.addStatic(place(lampGlowGeo(2.6), x + 4.6, y, z + 4.2), { castShadow: false });
  solidCyl(ev, x + 4.6, z + 4.2, 0.25, y, y + 3.3);
}

function batShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.25, 0.25, 0.55, 0.12); s.quadraticCurveTo(0.45, 0.02, 0.5, -0.12); s.quadraticCurveTo(0.3, -0.04, 0.2, -0.14);
  s.quadraticCurveTo(0.1, -0.05, 0, -0.18); s.quadraticCurveTo(-0.1, -0.05, -0.2, -0.14); s.quadraticCurveTo(-0.3, -0.04, -0.5, -0.12);
  s.quadraticCurveTo(-0.45, 0.02, -0.55, 0.12); s.quadraticCurveTo(-0.25, 0.25, 0, 0);
  return s;
}

/** Niedliches Gespenst (Tropfenform, Wellensaum, Augen, Mund), Blick +Z. */
function ghostGeo() {
  return cached('w3m:ghost', () => {
    const b = new Build();
    b.lathe([[0, 1.0], [0.24, 0.96], [0.4, 0.8], [0.46, 0.5], [0.44, 0.22], [0.36, 0.0], [0, 0.04]], { v: (x, y) => mix(0xd8e2f4, 0xffffff, y) }, null, 14, 1);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(0.13, 0xe6eefa, { p: [Math.cos(a) * 0.32, 0.02, Math.sin(a) * 0.32] }, 6, 4); }
    for (const s of [-1, 1]) {
      b.sphere(0.07, 0x1a1a2a, { p: [s * 0.14, 0.62, 0.38], s: [0.8, 1.2, 0.5] }, 8, 6);
      b.sphere(0.045, 0xff9ab8, { p: [s * 0.25, 0.48, 0.36], s: [1, 0.6, 0.4] }, 6, 4);
      b.sphere(0.12, 0xf2f6fe, { p: [s * 0.46, 0.42, 0.06], s: [0.6, 1, 0.7], r: [0, 0, s * 0.6] }, 6, 4);
    }
    b.sphere(0.07, 0x3a1a2a, { p: [0, 0.44, 0.41], s: [1.2, 0.8, 0.4] }, 8, 5);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ 3-Kapitän Krümels See-Diorama

function kapitaenDiorama(ev, x, y, z) {
  // alles in einer Gruppe: erscheint erst nach 3-3 (ev.setHidden / ev.reveal)
  const grp = new THREE.Group();
  grp.name = 'kulisse:kapitaen';
  grp.position.set(x, y, z);
  const K = ev.def.scale ?? 1.25;
  grp.scale.setScalar(K);
  ev.decorGroup = grp;
  const base = new THREE.Mesh(cached('w3m:kapdiorama', () => {
    const b = new Build();
    // Sockel wie ein Bootssteg: Holz mit Goldrand, Rettungsring
    b.box(3.0, 0.55, 3.0, { v: (px, py) => mix(0x6a3a22, 0x9a5a34, py + 0.5) }, { p: [0, 0.27, 0] }, 0.08, 1);
    b.box(3.1, 0.08, 3.1, 0xffc21a, { p: [0, 0.57, 0] }, 0, 1);
    b.torus(0.32, 0.09, (px, py) => (Math.floor((Math.atan2(py, px) / TAU + 1) * 8) % 2 ? 0xe8283a : 0xffffff), { p: [0, 0.3, 1.56] }, 5, 14);
    // Mini-See im Glas: Wasser, Steg, Felsen mit Wiese und Schnee, Glasröhren-Bögen, Stern
    b.box(2.2, 0.36, 2.2, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0x3ab4e8 : 0x2a78c0) }, { p: [0, 0.8, 0] }, 0, 1);
    b.box(0.9, 0.9, 0.9, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0x7ad04a : 0x8a7a6a) }, { p: [-0.55, 1.2, -0.5] }, 0.06, 1);
    b.box(0.92, 0.1, 0.92, 0xf6f9fd, { p: [-0.55, 1.66, -0.5] }, 0, 1);
    b.box(1.1, 0.06, 0.32, 0xb07a44, { p: [0.45, 1.05, 0.55] }, 0, 1);
    for (const px of [0.0, 0.9]) b.cyl(0.04, 0.04, 0.4, 0x7a4a2c, { p: [px, 0.88, 0.55] }, 5);
    b.torus(0.5, 0.08, 0x9adcff, { p: [0.35, 1.0, -0.3], r: [0, 0.6, 0] }, 6, 16, Math.PI);
    b.torus(0.32, 0.07, 0x9adcff, { p: [-0.55, 1.66, 0.25], r: [0, -0.4, 0] }, 6, 12, Math.PI);
    b.extrude(starShape(0.2, 0.09), 0.06, 0xffd23a, { p: [-0.55, 2.0, -0.5] }, 0.02, 1);
    // Fahnenmast mit Möhren-Wimpel
    b.cyl(0.04, 0.05, 2.4, 0xe0e4ee, { p: [1.25, 1.75, -1.25] }, 6);
    const pen = new THREE.Shape(); pen.moveTo(0, 0); pen.lineTo(0.75, -0.2); pen.lineTo(0, -0.4); pen.lineTo(0, 0);
    b.extrude(pen, 0.03, 0xff8a1a, { p: [1.28, 2.85, -1.25] }, 0, 1);
    b.sphere(0.08, 0x3fae3a, { p: [1.25, 2.98, -1.25] }, 6, 4);
    // Kiste für Krümel, Ruderboot am Ufer
    b.box(0.7, 0.55, 0.6, (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0xc89a5a : 0xb07a44), { p: [2.0, 0.28, 1.0] }, 0, 1);
    return b.geometry();
  }), vcol(0.5, {}, 'w3kapdiorama'));
  base.castShadow = true; base.receiveShadow = true;
  grp.add(base);
  const glass = glassBoxMesh();
  glass.scale.set(1.0, 0.95, 1.0);
  glass.position.y = 1.45;
  grp.add(glass);
  // Ruderboot
  const boat = new THREE.Mesh(cached('w3m:rowboat', () => rowboatGeo()), vcol(0.5, {}, 'w3boat'));
  boat.position.set(1.6, -0.92, -3.5);
  boat.rotation.y = 0.5;
  boat.castShadow = true;
  grp.add(boat);
  // Krümel auf der Kiste, freut sich
  const k = live(ev, 'kruemel', {}, [2.0, 0.56, 1.0], -Math.PI / 2 + 0.3, 1.25, () => (ev.revealT > 0 && ev.revealT < 2.2 ? 'cheer' : 'idle'), grp);
  void k;
  ev.view.add(grp);
  ev.updaters.push((dt, t) => { boat.position.y = -0.92 + Math.sin(t * 1.6) * 0.04; boat.rotation.z = Math.sin(t * 1.1) * 0.04; });
  solidBox(ev, x - 1.5 * K, y, z - 1.5 * K, x + 1.5 * K, y + 2.6 * K, z + 1.5 * K, 'kapitaen');
  solidBox(ev, x + 1.6 * K, y, z + 0.65 * K, x + 2.4 * K, y + 0.56 * K, z + 1.35 * K, 'kapitaen');
}

// ------------------------------------------------------------------ 3-4 Pastell-Garten-Pavillon

function pavilion(ev, x, y, z) {
  const g = cached('w3m:pavilion', () => {
    const b = new Build();
    const R = 2.7;
    b.cyl(R + 0.3, R + 0.45, 0.45, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xfdf6fa : 0xe8dce6) }, { p: [0, 0.22, 0] }, 16);
    b.cyl(R - 0.2, R - 0.2, 0.06, (px, py, pz) => ((Math.floor(Math.atan2(pz, px) / TAU * 16 + 16) + Math.floor(Math.hypot(px, pz) * 1.5)) % 2 ? 0xffd6ea : 0xd6f6ea), { p: [0, 0.47, 0] }, 16);
    const cols = [0xffb8da, 0xa8ecd0, 0xd4c4ff, 0xfff0a0];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const cx = Math.cos(a) * R, cz = Math.sin(a) * R;
      b.cyl(0.16, 0.19, 3.1, 0xfffaf6, { p: [cx, 2.0, cz] }, 8);
      for (let k = 0; k < 2; k++) b.torus(0.19, 0.045, cols[(i + k) % 4], { p: [cx, 1.3 + k * 1.2, cz], r: [Math.PI / 2, 0, 0] }, 3, 8);
      b.box(0.5, 0.18, 0.5, 0xfffaf6, { p: [cx, 3.6, cz] }, 0, 1);
    }
    b.torus(R, 0.18, 0xfffaf6, { p: [0, 3.72, 0], r: [Math.PI / 2, 0, 0] }, 4, 24);
    // gestreifte Kuppel mit Spitze und Herz
    b.dome(R + 0.25, (px, py, pz) => cols[Math.floor((Math.atan2(pz, px) / TAU + 1) * 12) % 4], { p: [0, 3.75, 0], s: [1, 0.78, 1] }, Math.PI / 2, 24, 7);
    b.cyl(0.08, 0.1, 0.9, 0xffc21a, { p: [0, 6.25, 0] }, 6);
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.28); heart.bezierCurveTo(0.35, 0.02, 0.28, 0.32, 0, 0.16); heart.bezierCurveTo(-0.28, 0.32, -0.35, 0.02, 0, -0.28);
    b.extrude(heart, 0.12, 0xff6aa8, { p: [0, 6.95, 0] }, 0.04, 6);
    // Girlanden zwischen den Säulen (vorn)
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU + Math.PI / 8, a1 = ((i + 1) / 8) * TAU + Math.PI / 8;
      const p0 = [Math.cos(a0) * R, 3.35, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, 3.35, Math.sin(a1) * R];
      const m = [(p0[0] + p1[0]) / 2 * 1.04, 2.85, (p0[2] + p1[2]) / 2 * 1.04];
      b.tube([p0, m, p1], 0.07, 0x9ae0b8, null, 6, 4);
      b.sphere(0.12, cols[i % 4], { p: [m[0], m[1] - 0.05, m[2]] }, 6, 4);
    }
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z), { castShadow: true });
  solidCyl(ev, x, z, 3.0, y, y + 7);
  // Hecken-Hasen links und rechts des Wegs, Blumen, bunte Steine
  // zwei Hecken-Hasen in Kartenqualität (gespiegelt)
  ev.addStatic(place(topiaryBunnyGeo(0.95), x - 4.8, y, z + 2.2, Math.PI + 0.5), { castShadow: true });
  ev.addStatic(place(topiaryBunnyGeo(0.95), x + 4.8, y, z + 2.2, -0.5), { castShadow: true });
  for (const dx of [-4.8, 4.8]) solidCyl(ev, x + dx, z + 2.2, 0.9, y, y + 2);
  for (const [dx, dz] of [[3.5, 3.6], [-3.4, 3.8], [-6.2, -0.8], [6.4, -0.6], [-2.6, -3.6]]) ev.addStatic(place(flowerClumpGeo(6, Math.round(dx * 11)), x + dx, y, z + dz, dx), { castShadow: false });
  for (const [dx, dz, s] of [[-6.6, 2.8, 1], [6.8, 3.2, 0.8], [-7.4, 1.6, 0.6]]) {
    ev.addStatic(place(pastelBlockGeo(s), x + dx, y, z + dz, 0.3 * s), { castShadow: true });
    solidBox(ev, x + dx - 0.55 * s, y, z + dz - 0.55 * s, x + dx + 0.55 * s, y + s, z + dz + 0.55 * s);
  }
}

// ------------------------------------------------------------------ 3-A rote Käfig-Festung

function redFortress(ev, x, y, z) {
  const g = cached('w3m:redfort', () => {
    const b = new Build();
    const brick = (px, py, pz, nx, ny) => (ny > 0.6 ? 0xd8c8c8 : ((Math.floor(py * 2.2) + Math.floor((px + pz) * 1.1)) & 1) ? 0xb02a32 : 0xc83a3e);
    // Mauer mit Zinnen und Tor (Vorderseite +Z), zwei Rundtürme
    b.box(12, 4.2, 2.2, brick, { p: [0, 2.1, 0] }, 0.08, 1);
    for (let i = 0; i < 11; i++) b.box(0.7, 0.7, 2.3, 0xa02028, { p: [-5.5 + i * 1.1, 4.55, 0] }, 0, 1);
    for (const s of [-1, 1]) {
      b.cyl(1.6, 1.75, 6.4, brick, { p: [s * 6.2, 3.2, 0.2] }, 14);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.5, 0.6, 0.5, 0xa02028, { p: [s * 6.2 + Math.cos(a) * 1.45, 6.7, 0.2 + Math.sin(a) * 1.45] }, 0, 1); }
      b.cone(2.0, 2.8, { v: (px, py) => mix(0x5a1a2a, 0x8a2a3a, py / 2.8 + 0.5) }, { p: [s * 6.2, 8.4, 0.2] }, 14);
      b.sphere(0.6, 0xf6f9fd, { p: [s * 6.2, 7.55, 0.2], s: [3.3, 0.55, 3.3] }, 10, 4);
      b.sphere(0.16, 0xffc21a, { p: [s * 6.2, 9.9, 0.2] }, 8, 6);
    }
    const door = new THREE.Shape();
    door.moveTo(-1.3, 0); door.lineTo(-1.3, 1.9); door.absarc(0, 1.9, 1.3, Math.PI, 0, true); door.lineTo(1.3, 0); door.lineTo(-1.3, 0);
    b.extrude(door, 0.16, 0x2a1216, { p: [0, 0, 1.12] }, 0, 10);
    for (let i = -2; i <= 2; i++) b.box(0.1, 3.0, 0.1, 0x3a3a46, { p: [i * 0.45, 1.5, 1.22] }, 0, 1);
    for (const yy of [0.8, 2.0]) b.box(2.4, 0.1, 0.1, 0x3a3a46, { p: [0, yy, 1.22] }, 0, 1);
    // Schnee auf der Mauerkrone, Zauber-Wimpel (violett mit Stern)
    b.box(12.2, 0.18, 2.3, 0xf6f9fd, { p: [0, 4.28, 0] }, 0.06, 1);
    for (const sx of [-3, 3]) {
      b.box(1.0, 2.0, 0.08, 0x6a2a9a, { p: [sx, 2.6, 1.14] }, 0, 1);
      b.extrude(starShape(0.3, 0.13), 0.04, 0xffd23a, { p: [sx, 2.7, 1.2] }, 0, 1);
    }
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z), { castShadow: true });
  solidBox(ev, x - 7.8, y, z - 1.3, x + 7.8, y + 6.6, z + 1.3);
  // rote Gitter um den Käfig (Linien wie 1-A)
  for (const [x0, z0, x1, z1] of ev.def.cage ?? []) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cg = cageGeo(len, 1.9);
    const col = cg.attributes.color;
    for (let i = 0; i < col.count; i++) {
      // gelb → rot
      const r = col.getX(i), gg = col.getY(i);
      col.setXYZ(i, Math.min(1, r * 0.95), gg * 0.12, gg * 0.1);
    }
    ev.addStatic(place(cg, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0)), { castShadow: true });
  }
  // erhöhte Eckpodeste mit Kristall-Leuchtern
  for (const [px, pz] of ev.def.podests ?? []) {
    ev.addStatic(place(cached('w3m:podest', () => {
      const b = new Build();
      b.box(3.2, 1.3, 3.2, (qx, qy, qz, nx, ny) => (ny > 0.6 ? 0xd8c0c4 : ((Math.floor(qy * 2.5) + Math.floor((qx + qz) * 1.3)) & 1) ? 0xa82a32 : 0xc0383c), { p: [0, 0.65, 0] }, 0.06, 1);
      // goldene Kante, roter Belag mit Stern
      for (const s of [-1, 1]) {
        b.box(3.3, 0.14, 0.18, 0xffc21a, { p: [0, 1.32, s * 1.56] }, 0, 1);
        b.box(0.18, 0.14, 3.3, 0xffc21a, { p: [s * 1.56, 1.32, 0] }, 0, 1);
      }
      b.box(2.95, 0.06, 2.95, 0x8a1c2a, { p: [0, 1.31, 0] }, 0, 1);
      b.extrude(starShape(0.55, 0.24), 0.04, 0xffd23a, { p: [0, 1.36, 0], r: [-Math.PI / 2, 0, 0] }, 0, 1);
      return b.geometry();
    }).clone(), px, y, pz), { castShadow: true });
    solidBox(ev, px - 1.6, y, pz - 1.6, px + 1.6, y + 1.3, pz + 1.6, 'podest');
    ev.addStatic(place(crystalGeo(1.1, Math.round(px * 7)), px, y + 1.39, pz), { castShadow: true });
  }
}

// ------------------------------------------------------------------ 3-5 Lagune mit Röhren

function lagoon(ev, x, y, z) {
  const sea = 0;
  // grüne Röhren aus dem Wasser (eigene Geometrie: senkrechte Röhren mit dunkler Öffnung und hellem Rand)
  const pipes = ev.def.pipes ?? [[0, 0, 2.6], [3.2, -2.8, 1.6], [-2.6, -3.6, 3.4], [-4.2, 1.6, 1.2]];
  const b = new Build();
  for (const [dx, dz, h] of pipes) {
    const px = x + dx, pz = z + dz;
    b.cyl(0.85, 0.85, h + 0.6, { v: (qx, qy, qz, nx) => mix(0x1f8a2e, 0x4fd04a, nx * 0.4 + 0.5) }, { p: [px, sea + (h - 0.6) / 2, pz] }, 16, true);
    b.torus(0.92, 0.18, 0x6fe05a, { p: [px, sea + h, pz], r: [Math.PI / 2, 0, 0] }, 6, 18);
    b.cyl(0.78, 0.78, 0.05, 0x0e2a12, { p: [px, sea + h - 0.15, pz] }, 16);
    b.sphere(0.75, 0xffffff, { p: [px, sea + 0.05, pz], s: [1.5, 0.12, 1.5] }, 10, 3);
  }
  ev.addStatic(b.geometry(), { castShadow: true });
  for (const [dx, dz, h] of pipes) solidCyl(ev, x + dx, z + dz, 1.0, sea - 1, sea + h, 'roehre');
  // liegendes Röhrenstück zwischen zwei Röhren, Korallen am Ufer, Wrack hinten, Eisschollen
  // liegendes Röhrenstück (halb im Wasser) zwischen zwei Röhren
  ev.addStatic(place(cached('w3m:lyingpipe', () => {
    const b2 = new Build();
    b2.cyl(0.7, 0.7, 3.2, { v: (qx, qy, qz, nx, ny) => mix(0x1f8a2e, 0x4fd04a, ny * 0.4 + 0.5) }, { r: [0, 0, Math.PI / 2] }, 12, true);
    for (const s2 of [-1, 1]) b2.torus(0.74, 0.14, 0x6fe05a, { p: [s2 * 1.6, 0, 0], r: [0, Math.PI / 2, 0] }, 5, 14);
    return b2.geometry();
  }).clone(), x - 1.4, sea - 0.1, z - 0.6, -0.6), { castShadow: true });
  for (const [dx, dz, kind, s] of ev.def.corals ?? [[4.0, 4.6, 'ast', 1.1], [4.4, -1.6, 'faecher', 1], [-5.2, 4.8, 'ast', 0.8]]) {
    const cg = coralGeo(kind, Math.round(dx * 7 + dz));
    cg.scale(s, s, s);
    ev.addStatic(place(cg, x + dx, sea - 0.3, z + dz, dx + dz), { castShadow: false });
  }
  const wr = ev.def.wreck;
  if (wr) {
    const wg = wreckGeo();
    const k = (wr[3] ?? 0.8) * 1.25;
    wg.scale(k, k, k);
    ev.addStatic(place(wg, wr[0], wr[1], wr[2], wr[4] ?? 0.6), { castShadow: true });
  }
  for (const [dx, dz, r] of [[-7.5, 5.0, 1.4], [7.8, 7.4, 1.1], [-8.4, -6.2, 1.7], [1.5, -8.6, 1.2]]) ev.addStatic(place(iceFloeGeo(r, Math.round(dx * 13)), x + dx, sea, z + dz, dx), { castShadow: false });
  // Rettungsring am Ufer
  const bp = ev.def.buoy;
  if (bp) { ev.addStatic(place(buoyGeo(), bp[0], bp[1], bp[2], 0.3)); solidCyl(ev, bp[0], bp[2], 0.2, bp[1], bp[1] + 1.5); }
  // Blasen steigen aus den Röhren (Funken-Effekt, nur Optik)
  let next = 0;
  ev.updaters.push((dt, t) => {
    if (t < next) return;
    next = t + 0.6;
    const fx = ev.level.effects;
    const [dx, dz, h] = pipes[Math.floor(t * 7) % pipes.length];
    fx?.splash?.({ x: x + dx, z: z + dz }, sea + h + 0.1);
  });
}

// ------------------------------------------------------------------ 3-6 Rennberg

function raceHill(ev, x, y, z) {
  const r = ev.def.road;
  if (r) {
    // Rennstraße als Rampe (begehbar): Asphalt mit Mittellinie, rot-weiße Randsteine
    const { x0, x1, z0, z1, y0, y1 } = r;
    ev.level.world.add({ type: 'ramp', min: [x0, y0 - 3, z0], max: [x1, y1, z1], axis: 'z', dir: -1, low: y0, tag: 'ramp' });
    const top = 0x3a3e4c, side = 0x6a6e7c;
    const wg = wedge(x0, y0 - 3, z0, x1, y1, z1, 'z', -1, y0, top, side);
    ev.addStatic(wg, { castShadow: true });
    const b = new Build();
    const L = z1 - z0, slope = Math.atan2(y1 - y0, L);
    const at = (zz) => y0 + (y1 - y0) * ((z1 - zz) / L);
    for (let zz = z1 - 1; zz > z0 + 0.5; zz -= 2.4) b.box(0.22, 0.04, 1.2, 0xf6f6f0, { p: [(x0 + x1) / 2, at(zz) + 0.03, zz], r: [slope, 0, 0] }, 0, 1);
    for (const sx of [x0 + 0.25, x1 - 0.25]) {
      for (let zz = z1 - 0.5, i = 0; zz > z0; zz -= 1, i++) b.box(0.5, 0.18, 0.98, i % 2 ? 0xe8283a : 0xf6f6f0, { p: [sx, at(zz) + 0.06, zz], r: [slope, 0, 0] }, 0, 1);
    }
    // Boost-Pfeile (leuchtend) auf der Straße
    const gb = new Build();
    for (const zz of r.boosts ?? []) {
      for (let k = 0; k < 3; k++) {
        const s = new THREE.Shape();
        s.moveTo(-0.9, 0); s.lineTo(0, 0.7); s.lineTo(0.9, 0); s.lineTo(0.9, -0.32); s.lineTo(0, 0.38); s.lineTo(-0.9, -0.32); s.lineTo(-0.9, 0);
        gb.extrude(s, 0.03, k === 1 ? 0xffe23a : 0x3ad8ff, { p: [(x0 + x1) / 2, at(zz - k * 0.9) + 0.05, zz - k * 0.9], r: [-Math.PI / 2 + slope, 0, 0] }, 0, 1);
      }
    }
    ev.addStatic(b.geometry(), { castShadow: false });
    if (gb.parts.length) ev.addStatic(gb.geometry(), { castShadow: false });
  }
  // Startbogen (Textur-Banner → als bewegtes Modell, Ampel springt auf Grün)
  const arch = live(ev, 'start_bogen', { width: ev.def.archWidth ?? 8 }, [x, y, z], Math.PI / 2, 1, () => ({ anim: Math.floor(ev.view.time / 2.5) % 2 ? 'go' : 'idle' }));
  if (arch) arch.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const hw = (ev.def.archWidth ?? 8) / 2;
  for (const s of [-1, 1]) solidBox(ev, x + s * (hw + 0.45) - 0.5, y, z - 0.5, x + s * (hw + 0.45) + 0.5, y + 5, z + 0.5);
  // Banden am Startplatz, Reifenstapel, Zielflaggen
  for (const [bx, bz, yaw, len] of ev.def.barriers ?? []) {
    ev.addStatic(place(barrierGeo(len), bx, y, bz, yaw), { castShadow: true });
    const c = Math.abs(Math.cos(yaw)) > 0.7;
    const hx = c ? len / 2 : 0.35, hz = c ? 0.35 : len / 2;
    solidBox(ev, bx - hx, y, bz - hz, bx + hx, y + 1, bz + hz, 'bande');
  }
  const tires = new Build();
  for (const [tx, tz] of ev.def.tires ?? []) for (let k = 0; k < 3; k++) tires.torus(0.42, 0.2, 0x22242c, { p: [tx, y + 0.2 + k * 0.38, tz], r: [Math.PI / 2, 0, 0] }, 5, 10);
  if (tires.parts.length) ev.addStatic(tires.geometry(), { castShadow: true });
  for (const [tx, tz] of ev.def.tires ?? []) solidCyl(ev, tx, tz, 0.65, y, y + 1.2);
  for (const [fx, fy, fz] of ev.def.flags ?? []) {
    ev.addStatic(place(cached('w3m:checkflag', () => {
      const b2 = new Build();
      b2.cyl(0.05, 0.06, 3.2, 0xe0e4ee, { p: [0, 1.6, 0] }, 6);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b2.box(0.3, 0.3, 0.03, (i + j) % 2 ? 0x16161e : 0xffffff, { p: [0.2 + i * 0.3, 2.9 - j * 0.3, 0] }, 0, 1);
      return b2.geometry();
    }).clone(), fx, fy, fz, 0.3));
  }
}

// ------------------------------------------------------------------ 3-B Zirkuszelt und Seilbahn

function circusTent(ev, x, y, z) {
  const R = ev.def.tentRadius ?? 6.4;
  if (!bake(ev, 'zirkuszelt', { radius: R, height: 8.5 }, [x, y, z], 0, 1, null, false)) ev.addStatic(place(snowDriftGeo(2, 1), x, y, z));
  // Schatten: Zylinder und Kegel knapp innerhalb der Zeltbahnen
  shadowProxy(ev, new Build().cyl(R - 0.15, R - 0.15, 2.9, 0xffffff, { p: [0, 1.45, 0] }, 12, true).cone(R - 0.2, 5.4, 0xffffff, { p: [0, 2.95 + 2.6, 0] }, 12).geometry(), x, y, z);
  solidCyl(ev, x, z, R + 0.2, y, y + 9);
  // Eingangs-Vorhang (dunkle Öffnung mit roten Vorhängen) zur Kamera, Schnee auf dem Zeltrand
  ev.addStatic(place(cached(`w3m:tentdoor:${R}`, () => {
    const b = new Build();
    const door = new THREE.Shape();
    door.moveTo(-1.3, 0); door.lineTo(-1.15, 2.1); door.quadraticCurveTo(0, 3.0, 1.15, 2.1); door.lineTo(1.3, 0); door.lineTo(-1.3, 0);
    b.extrude(door, 0.12, 0x2a0e1a, { p: [0, 0, R + 0.04] }, 0, 8);
    for (const s of [-1, 1]) b.cyl(0.22, 0.34, 2.6, 0xc81e2e, { p: [s * 1.35, 1.3, R + 0.12], r: [0, 0, -s * 0.12] }, 10);
    b.box(3.4, 0.4, 0.3, 0xffc21a, { p: [0, 2.85, R + 0.12] }, 0, 1);
    b.extrude(starShape(0.3, 0.13), 0.06, 0xe8283a, { p: [0, 2.85, R + 0.3] }, 0, 1);
    // Schneekranz auf der Traufe
    for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU; b.sphere(0.34, 0xf6f9fd, { p: [Math.cos(a) * (R + 0.05), Math.max(2.5, 8.5 * 0.35) + 0.1, Math.sin(a) * (R + 0.05)], s: [1.5, 0.5, 1] , r: [0, -a, 0] }, 6, 3); }
    return b.geometry();
  }).clone(), x, y, z), { castShadow: false });
  // Kassenhäuschen (rot-weiß gestreift) und Wimpelkette zum Mast
  const kx = x + (ev.def.booth?.[0] ?? -R - 2.6), kz = z + (ev.def.booth?.[1] ?? 3.4);
  ev.addStatic(place(cached('w3m:booth', () => {
    const b = new Build();
    b.box(1.8, 2.2, 1.6, (px) => (Math.floor((px + 0.9) / 0.3) % 2 ? 0xe8283a : 0xfff6ee), { p: [0, 1.1, 0] }, 0, 1);
    b.box(1.2, 0.7, 0.1, 0x2a1626, { p: [0, 1.5, 0.81] }, 0, 1);
    b.cone(1.5, 1.0, (px, py, pz) => (Math.floor((Math.atan2(pz, px) / TAU + 1) * 8) % 2 ? 0xe8283a : 0xfff6ee), { p: [0, 2.7, 0], r: [0, Math.PI / 4, 0] }, 8);
    b.sphere(0.12, 0xffc21a, { p: [0, 3.25, 0] }, 6, 4);
    b.sphere(0.9, 0xf6f9fd, { p: [0, 2.45, 0], s: [1.4, 0.25, 1.3] }, 8, 3);
    return b.geometry();
  }).clone(), kx, y, kz, 0.3), { castShadow: true });
  solidBox(ev, kx - 1.1, y, kz - 1.0, kx + 1.1, y + 3, kz + 1.0);
  for (const [ax, az, bx, bz] of ev.def.bunting ?? []) {
    const len = Math.hypot(bx - ax, bz - az);
    ev.addStatic(place(buntingGeo(len, 0.7, Math.round(ax)), (ax + bx) / 2, y + 3.6, (az + bz) / 2, Math.atan2(-(bz - az), bx - ax)), { castShadow: false });
    for (const [px, pz] of [[ax, az], [bx, bz]]) {
      ev.addStatic(place(cached('w3m:pole', () => new Build().cyl(0.06, 0.08, 3.7, 0xffc21a, { p: [0, 1.85, 0] }, 6).sphere(0.14, 0xe8283a, { p: [0, 3.75, 0] }, 6, 4).geometry()).clone(), px, y, pz));
      solidCyl(ev, px, pz, 0.15, y, y + 3.7);
    }
  }
  // Seilbahn: zwei Masten, Seil mit Durchhang, Gondel pendelt hin und her
  const rw = ev.def.ropeway;
  if (rw) ropeway(ev, rw);
}

function ropeway(ev, rw) {
  const [ax, ay, az] = rw.from, [bx, by, bz] = rw.to;
  const b = new Build();
  for (const [px, py, pz, h] of [[ax, ay, az, rw.hFrom ?? 7], [bx, by, bz, rw.hTo ?? 6]]) {
    b.box(1.4, 0.4, 1.4, 0x5a6478, { p: [px, py + 0.2, pz] }, 0, 1);
    b.cyl(0.16, 0.24, h, { v: (qx, qy, qz, nx) => mix(0xb83a2a, 0xe85a3a, nx * 0.5 + 0.5) }, { p: [px, py + h / 2, pz] }, 8);
    b.box(1.6, 0.3, 0.4, 0xffc21a, { p: [px, py + h, pz] }, 0, 1);
    b.sphere(0.3, 0xffffff, { p: [px, py + h + 0.2, pz], s: [2.2, 0.5, 1.2] }, 7, 4);
  }
  const p0 = new THREE.Vector3(ax, ay + (rw.hFrom ?? 7), az), p1 = new THREE.Vector3(bx, by + (rw.hTo ?? 6), bz);
  const sag = rw.sag ?? 1.2;
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; const p = p0.clone().lerp(p1, u); p.y -= Math.sin(u * Math.PI) * sag; pts.push([p.x, p.y, p.z]); }
  b.tube(pts, 0.04, 0x2a2a34, null, 32, 4);
  ev.addStatic(b.geometry(), { castShadow: true });
  ev.level.world.add({ type: 'cyl', x: ax, z: az, r: 0.6, y0: ay, y1: ay + (rw.hFrom ?? 7), tag: 'mast' });
  ev.level.world.add({ type: 'cyl', x: bx, z: bz, r: 0.6, y0: by, y1: by + (rw.hTo ?? 6), tag: 'mast' });
  const m = live(ev, 'seilbahn_gondel', {}, [ax, ay, az], Math.atan2(-(bz - az), bx - ax), 1, () => ({ anim: 'move' }));
  if (!m) return;
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const P = 14;   // s je Hin- und Rückfahrt
  const pos = new THREE.Vector3();
  ev.updaters.push((dt, t) => {
    const ph = (t % P) / P;
    const u0 = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const u = Math.min(1, Math.max(0, (u0 - 0.08) / 0.84));
    const e = u * u * (3 - 2 * u);
    pos.copy(p0).lerp(p1, e);
    pos.y -= Math.sin(e * Math.PI) * sag;
    m.root.position.copy(pos);
  });
}

// ------------------------------------------------------------------ 3-7 Herbstwald mit Wasserfall und Schienen

function autumnFalls(ev, x, y, z) {
  const wf = ev.def.waterfall;
  if (wf) {
    ev.buildWaterfall(wf);
    // Becken (glänzend) mit Steinrand, Gischt-Felsen
    const pool = ev.def.pool;
    if (pool) {
      const [px0, pz0, px1, pz1, py] = pool;
      const b = new Build();
      b.box(px1 - px0, 0.08, pz1 - pz0, { v: (qx, qy, qz) => mix(0x2a8ad8, 0x5ad0f4, 0.5 + 0.5 * Math.sin(qx * 2 + qz)) }, { p: [(px0 + px1) / 2, py, (pz0 + pz1) / 2] }, 0, 1);
      ev.addStatic(b.geometry(), { material: 'stone', castShadow: false });
      const rim = new Build();
      for (let i = 0; i < 14; i++) {
        const u = i / 13;
        rim.add(new THREE.DodecahedronGeometry(0.45, 0), { v: (qx, qy, qz, nx, ny) => mix(0x6a6472, 0xa8a2b0, Math.max(0, ny)) }, { p: [px0 + (px1 - px0) * u, py + 0.15, pz1 + 0.1], r: [i, i * 2, 0], s: [1, 0.7, 1] });
      }
      ev.addStatic(rim.geometry(), { castShadow: true });
    }
  }
  // Schiene auf Stützen mit fahrender Schalttafel
  const rl = ev.def.rail;
  if (rl) {
    const [ax, ay, az] = rl.from, [bx, , bz] = rl.to;
    const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
    const h = rl.height ?? 1.6;
    const n = Math.max(1, Math.round(len / 4));
    ev.addStatic(place(railGeo(len, h), (ax + bx) / 2, ay, (az + bz) / 2, yaw), { castShadow: true });
    let tfState = { anim: 'active', dir: 1 };
    const tf = live(ev, 'schalttafel', { size: 2.6 }, [ax, ay + h, az], yaw, 1, () => tfState);
    if (tf) {
      tf.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const P = 12;
      ev.updaters.push((dt, t) => {
        const ph = (t % P) / P;
        const u0 = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        const u = Math.min(1, Math.max(0, (u0 - 0.06) / 0.88));
        const e = u * u * (3 - 2 * u);
        tf.root.position.set(ax + (bx - ax) * e, ay + h, az + (bz - az) * e);
        tfState = { anim: u > 0 && u < 1 ? 'active' : 'idle', dir: ph < 0.5 ? 1 : -1 };
      });
    }
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      solidCyl(ev, ax + (bx - ax) * u, az + (bz - az) * u, 0.25, ay, ay + h, 'schienenstuetze');
    }
  }
  // Laubhaufen und ein Holzschild mit Blatt
  void x; void y; void z;
}

// ------------------------------------------------------------------ 3-Zug Bahnhof

function station(ev, x, y, z) {
  // Bahnhofshäuschen (Vorderseite +Z): Fachwerk, Uhr am Giebel, Schneedach, Bänke
  const g = cached('w3m:station', () => {
    const b = new Build();
    b.box(6.4, 3.4, 4.2, (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0xd8c8a8 : py < 0.9 ? 0x8a5a3a : 0xf2e2c2), { p: [0, 1.7, 0] }, 0.06, 1);
    for (const sx of [-3.0, -1.0, 1.0, 3.0]) b.box(0.2, 3.4, 0.1, 0x6a3a22, { p: [sx, 1.7, 2.12] }, 0, 1);
    b.box(6.4, 0.2, 0.1, 0x6a3a22, { p: [0, 2.4, 2.12] }, 0, 1);
    const roof = new THREE.Shape();
    roof.moveTo(-3.8, 0); roof.lineTo(0, 2.4); roof.lineTo(3.8, 0); roof.lineTo(-3.8, 0);
    b.extrude(roof, 5.2, { v: (px, py) => mix(0x7a2a2a, 0xa83a34, py / 2.4) }, { p: [0, 3.35, 0] }, 0.05, 1);
    for (const s of [-1, 1]) b.box(4.5, 0.32, 5.5, { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [s * 1.9, 4.6, 0], r: [0, 0, -s * Math.atan2(2.4, 3.8)] }, 0.12, 1);
    // Uhr am Giebel
    b.cyl(0.62, 0.62, 0.12, 0xffffff, { p: [0, 4.2, 2.66], r: [Math.PI / 2, 0, 0] }, 20);
    b.torus(0.64, 0.07, 0x2a2a34, { p: [0, 4.2, 2.7] }, 5, 20);
    b.box(0.06, 0.42, 0.04, 0x16161e, { p: [0, 4.36, 2.76] }, 0, 1);
    b.box(0.3, 0.06, 0.04, 0x16161e, { p: [0.13, 4.2, 2.76] }, 0, 1);
    // Tür, Fenster, Schild
    b.box(1.1, 2.2, 0.12, 0x5a321e, { p: [0, 1.1, 2.14] }, 0, 1);
    for (const sx of [-2.0, 2.0]) b.box(1.2, 1.0, 0.1, 0xf4ecdc, { p: [sx, 1.9, 2.13] }, 0, 1);
    b.box(3.2, 0.6, 0.12, 0x2a4a8a, { p: [0, 3.0, 2.2] }, 0, 1);
    b.box(2.9, 0.08, 0.04, 0xffc21a, { p: [0, 3.0, 2.28] }, 0, 1);
    // Fahnenmast auf dem First
    b.cyl(0.06, 0.07, 3.0, 0xd9dce6, { p: [2.2, 5.6, -0.4] }, 6);
    b.sphere(0.13, 0xffc21a, { p: [2.2, 7.15, -0.4] }, 8, 6);
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z), { castShadow: true });
  ev.addStatic(place(cached('w3m:stationglow', () => {
    const b = new Build();
    for (const sx of [-2.0, 2.0]) b.box(1.0, 0.8, 0.04, 0xffd27a, { p: [sx, 1.9, 2.2] }, 0, 1);
    return b.geometry();
  }).clone(), x, y, z), { castShadow: false });
  solidBox(ev, x - 3.4, y, z - 2.3, x + 3.4, y + 6, z + 2.3);
  wavingFlag(ev, x + 2.26, y + 6.75, z - 0.4, 1.6, 1.0, baronFlagTexture());
  // Bahnsteigdach entlang des Gleises
  const cp = ev.def.canopy;
  if (cp) {
    const [cx, cz0, cz1] = cp;
    const b = new Build();
    const n = Math.max(2, Math.round((cz1 - cz0) / 4) + 1);
    for (let i = 0; i < n; i++) {
      const zz = cz0 + (i / (n - 1)) * (cz1 - cz0);
      b.cyl(0.1, 0.12, 3.4, 0x2a5a3a, { p: [cx, y + 1.7, zz] }, 8);
      b.box(1.6, 0.12, 0.12, 0x2a5a3a, { p: [cx + 0.6, y + 3.3, zz], r: [0, 0, 0.12] }, 0, 1);
      solidCyl(ev, cx, zz, 0.2, y, y + 3.4, 'pfosten');
    }
    b.box(3.4, 0.14, cz1 - cz0 + 1.2, (px, py, pz) => (Math.floor((pz + 100) / 0.6) % 2 ? 0x2f6a46 : 0x3a7a52), { p: [cx + 0.7, y + 3.45, (cz0 + cz1) / 2], r: [0, 0, 0.12] }, 0, 1);
    b.box(3.5, 0.18, cz1 - cz0 + 1.3, { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [cx + 0.7, y + 3.6, (cz0 + cz1) / 2], r: [0, 0, 0.12] }, 0.06, 1);
    ev.addStatic(b.geometry(), { castShadow: true });
  }
  // Gleis und Zug (Lok mit Wagen, Blick zur Kamera)
  const tr = ev.def.train;
  if (tr) {
    const [tx, ty, tz0, tz1] = tr.track;
    ev.addStatic(place(trackGeo(tz1 - tz0), tx, ty, (tz0 + tz1) / 2, Math.PI / 2), { castShadow: false });
    let zz = tr.lok;
    const wheels = [];
    const addLok = (gg, o) => {
      gg.computeBoundingBox();
      const bb = gg.boundingBox, sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
      // Räder (im Modell je ≈ 900 Dreiecke) → schlichte Scheiben, s. u.
      if (gg.attributes.position.count / 3 > 400 && Math.max(sx, sy, sz) < 1.7 && Math.min(sx, sz) < 0.45) { wheels.push(bb.clone()); gg.dispose(); return; }
      ev.addStatic(gg, { ...o, castShadow: false });
    };
    if (bakeModel(addLok, 'zug_waggon', { kind: 'lok' }, [tx, ty + 0.31, zz], -Math.PI / 2)) {
      if (wheels.length) {
        const wb = new Build();
        for (const bb of wheels) {
          const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
          const alongX = s.x < s.z, R = Math.max(s.y, alongX ? s.z : s.x) / 2, T = alongX ? s.x : s.z;
          const r = alongX ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
          wb.cyl(R, R, T, 0x2a2a34, { p: [c.x, c.y, c.z], r }, 12);
          wb.cyl(R * 0.5, R * 0.5, T + 0.04, 0xd8283a, { p: [c.x, c.y, c.z], r }, 8);
        }
        ev.addStatic(wb.geometry(), { castShadow: false });
      }
      // Schatten der Lok: Kessel und Führerhaus als schlichte Körper (in der Lok verborgen)
      shadowProxy(ev, new Build().box(2.2, 2.4, 3.0, 0x222222, { p: [0, 2.0, -2.4] }, 0, 1).cyl(0.95, 0.95, 5.0, 0x222222, { p: [0, 2.0, 1.4], r: [Math.PI / 2, 0, 0] }, 8).geometry(), tx, ty + 0.31, zz);
      solidBox(ev, tx - 1.6, ty, zz - 4.4, tx + 1.6, ty + 4.2, zz + 4.4, 'zug');
      for (let i = 0; i < (tr.cars ?? 1); i++) {
        zz -= i === 0 ? 9.2 : 9.6;
        ev.addStatic(place(wagonGeo(9), tx, ty + 0.31, zz), { castShadow: true });
        solidBox(ev, tx - 1.6, ty, zz - 4.6, tx + 1.6, ty + 4.0, zz + 4.6, 'zug');
      }
    }
    // Dampfwölkchen aus dem Schornstein (Rauch-Effekt)
    let next = 0;
    ev.updaters.push((dt, t) => {
      if (t < next) return;
      next = t + 0.9;
      ev.level.effects?.dust?.({ x: tx, y: ty + 4.6, z: tr.lok + 2.6 }, 3, 0.6);
    });
  }
  // Laternen, Bänke, Gepäck
  for (const [lx, lz] of ev.def.lamps ?? []) {
    ev.addStatic(place(lampGeo(2.8), lx, y, lz));
    ev.addStatic(place(lampGlowGeo(2.8), lx, y, lz), { castShadow: false });
    solidCyl(ev, lx, lz, 0.25, y, y + 3.4);
  }
  for (const [bxp, bzp, yaw] of ev.def.benches ?? []) {
    ev.addStatic(place(benchGeo(), bxp, y, bzp, yaw), { castShadow: true });
    solidBox(ev, bxp - 0.85, y, bzp - 0.85, bxp + 0.85, y + 0.6, bzp + 0.85, 'bank');
  }
  void firGeo; void snowRockGeo; void flame; void std; void basic; void glowTexture;
}
