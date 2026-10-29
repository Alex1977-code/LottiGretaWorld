// Kulissen der Eingänge der Bonuswelt Pilz (Kurs-Karte „Pilz-Remix“, Welt 10, eigene Gestaltung), aufgerufen aus
// EntranceView.decorate() über bonuskit.decorateBonus. Jeder Pilzhut trägt eine verkleinerte, „geremixte“ Erinnerung an das
// Basislevel mit kleinen Remix-Hinweisen; in Klammern die Registry-Modelle (mit Dreiecks-Obergrenze, sonst eigene Geometrie):
//   nighthills   P-1 (2-4)  Rollhügel bei Nacht: gestreifte Hügelwalze rollt je Zählzeit ein Stück weiter, darüber der Mond
//                           ('mond_gesicht') mit Schein und funkelnden Sternen, eine Stachel-Hüpfmaus ('huepfmaus_stachel') hüpft im
//                           Kreis, goldene Zeit-Uhren schweben als Ideallinie, ein Stachelkugler ('stachelkugler') rollt hin und her
//   spikybean    P-2 (1-3)  Bohnenranken mit Stacheln im Sonnenuntergang: zwei Ranken ('beanstalk') mit Stachelkränzen, drei
//                           Glockenbäume (Glocken schwingen im Takt), fünf Schlüsselmünzen drehen sich, tief stehende Abendsonne
//   darkjungle   P-3 (6-4)  dunkler Dschungel mit Lichtkegeln: dunkler Teich mit Blatt-Floß ('leaf_raft') und Kreisgeist
//                           ('kreisgeist'), vier Licht-Helme ('helm_licht') auf Pfählen – ihre Lichtkegel schwenken je Zählzeit,
//                           Riesenblätter ('riesenblatt') als dunkles Blätterdach
//   shadowalley  P-4 (2-3)  Schattenspiel-Gasse: beleuchtete Wand mit Schattenfiguren (Pilzlingsturm aus 30 Pilzlingen, Stern,
//                           Hase), die sich im Takt wiegen, zwei Gassenhäuschen mit Licht, Kanonen-Helm ('helm_kanone')
//   dayhall      P-5 (6-3)  Fernost-Halle bei Tag: rote Säulen, Fernost-Dach ('fernost_dach'), Pilz-Maske ('pilz_maske'), Gong
//                           ('gong') schlägt je Takt, Papierlaternen ('papierlaterne'), Sonne mit Strahlen, Wolken und ein pendelnd
//                           fliegender Zielmast ('zielmast_fluegel'), Hammer-Werfer ('hammer_werfer')
//   giantwreck   P-6 (6-2)  Riesen-Schiffswrack: riesiger Wrack-Bug ('geisterschiff_wrack' × 2,4) auf dem Hut, ein Geisterschiff
//                           ('geisterschiff') schaukelt im Meer, Schubser ('schubser') stapft, Pustewolke ('pustewolke') bläst,
//                           Krakenpilz ('krakenpilz'), fünf Warp-Boxen ('warp_box')
//   brokenbelt   P-7 (7-4)  zerbrochene Plattformen über blauer Lava: blaues Lavabecken (fließende Textur), Plattenbruchstücke
//                           sinken je Takt und tauchen wieder auf, Laufzylinder ('zylinder_walze' blau) dreht sich, Stachelwalze
//                           ('stachelwalze_rot'), ein Gleitblatt ('powerup_gleitblatt') schwebt
//   brawlhouse   P-Haus     Prüfungs-Haus der zehn Kampf-Räume: lila Haus mit goldenem Fragezeichen, zehn Fenster leuchten je
//                           Zählzeit der Reihe nach auf, Boxring mit Seilen davor, Boxhandschuh-Schild
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (Registry-Modelle je Eingang in die Kachel 'w10:<Id>' mit
// Fern-Ausblendung), bewegte sind eigene Objekte (ev.updaters) mit Sichtprüfung, gleichartige als Instanzen.

import * as THREE from 'three';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import {
  registerKit, BONUS_KITS, Build, place, mix, TAU, cached, vcol, PI, FRONT, hash1, cullByView, instanced, setInst, addGeo, mover,
  addInfo, solidBox, solidCyl, haloSprite, camDisc, beamGeo, beamMat, inView,
} from './bonuskit.js';
import { BEAT10, MK10, GLOW_TILE10, smallShroomGeo } from './pilz10.js';

const MK = MK10;
const beatAt = (t) => BEAT10.at(t);
const glow = (ev, key, make, x, y, z, yaw = 0) => addGeo(ev, key, make, x, y, z, yaw, false, 'glow', GLOW_TILE10);
const pulse = (ev, key, make, x, y, z, yaw = 0) => addGeo(ev, key, make, x, y, z, yaw, false, 'bglow', GLOW_TILE10);
const modelsInfo = (ev) => addInfo(ev, () => MK.info());
/** Weicher Übergang 0 → 1 in den ersten share Anteilen einer Zählzeit (Bewegung je Schlag, dann Halt). */
const stepEase = (frac, share = 0.4) => { const u = Math.min(1, frac / share); return u * u * (3 - 2 * u); };

export function decoratePilz(ev, kind, x, y, z) {
  switch (kind) {
    case 'nighthills': nightHills(ev, x, y, z); return true;
    case 'spikybean': spikyBean(ev, x, y, z); return true;
    case 'darkjungle': darkJungle(ev, x, y, z); return true;
    case 'shadowalley': shadowAlley(ev, x, y, z); return true;
    case 'dayhall': dayHall(ev, x, y, z); return true;
    case 'giantwreck': giantWreck(ev, x, y, z); return true;
    case 'brokenbelt': brokenBelt(ev, x, y, z); return true;
    case 'brawlhouse': brawlHouse(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ gemeinsame Kleinteile

/** Goldener Wecker (Zeit-Uhr), Mitte im Ursprung, Zifferblatt nach +Z. */
function clockGeo() {
  return cached('w10m:clock', () => {
    const b = new Build();
    b.cyl(0.42, 0.42, 0.18, 0xffc83a, { p: [0, 0, 0], r: [PI / 2, 0, 0] }, 16);
    b.cyl(0.35, 0.35, 0.02, 0xfff8ea, { p: [0, 0, 0.1], r: [PI / 2, 0, 0] }, 16);
    for (const s of [-1, 1]) b.sphere(0.14, 0xffc83a, { p: [s * 0.28, 0.4, 0] }, 7, 5);
    b.box(0.04, 0.24, 0.02, 0x3a2a3a, { p: [0, 0.1, 0.12] }, 0);
    b.box(0.18, 0.04, 0.02, 0x3a2a3a, { p: [0.08, 0, 0.12] }, 0);
    for (const s of [-1, 1]) b.cyl(0.04, 0.04, 0.2, 0xd89a2a, { p: [s * 0.24, -0.42, 0], r: [0, 0, s * 0.4] }, 5);
    return b.geometry();
  });
}
/** Schlüsselmünze (gold, Schlüsselloch), Mitte im Ursprung, Fläche nach +Z. */
function keyCoinGeo() {
  return cached('w10m:keycoin', () => {
    const b = new Build();
    b.cyl(0.42, 0.42, 0.1, 0xffc83a, { r: [PI / 2, 0, 0] }, 16);
    b.torus(0.4, 0.04, 0xffe27a, { p: [0, 0, 0.05] }, 4, 16);
    b.cyl(0.08, 0.08, 0.12, 0x6a4a12, { p: [0, 0.06, 0], r: [PI / 2, 0, 0] }, 8);
    b.box(0.07, 0.18, 0.12, 0x6a4a12, { p: [0, -0.08, 0] }, 0);
    return b.geometry();
  });
}
/** Stachelkranz (Stacheln ringsum, Radius r). */
function spikeRingGeo(r = 0.6, n = 8) {
  return cached(`w10m:spikering:${r}:${n}`, () => {
    const b = new Build();
    b.torus(r, 0.08, 0x6a4a6a, {}, 4, 14);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; b.cone(0.1, 0.42, { v: (x, y) => mix(0x9aa0b8, 0xffffff, y + 0.5) }, { p: [Math.cos(a) * (r + 0.18), 0, Math.sin(a) * (r + 0.18)], r: [0, -a, -PI / 2] }, 5); }
    return b.geometry();
  });
}
/** Funkelstern (Glow), zur Kamera gedreht. */
function sparkStarGeo(R = 0.4) {
  return cached(`w10m:sparkstar:${R}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - PI / 2, r = i % 2 ? R * 0.4 : R; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const b = new Build();
    b.add(new THREE.ShapeGeometry(s, 1), 0xfff4c0, { r: [-0.3, 0, 0] });
    return b.geometry();
  });
}

// ------------------------------------------------------------------ P-1 Rollhügel bei Nacht

function nightHills(ev, x, y, z) {
  // Gestell der Walze (Nachtfarben, Pfosten mit Leuchtkugeln) und bunte Blöcke
  addGeo(ev, 'w10m:rollframe', () => {
    const b = new Build();
    for (const s of [-1, 1]) b.box(0.5, 2.4, 0.5, 0xc8d0f0, { p: [s * 4.1, 1.2, 0] }, 0.08);
    b.box(1, 1, 1, 0x3a5aa8, { p: [-5.6, 0.5, 1.2] }, 0.12);
    b.box(1, 1, 1, 0x6a4ab8, { p: [-5.6, 1.5, 1.2] }, 0.12);
    b.box(1, 1, 1, 0x2a8a7a, { p: [5.4, 0.5, 1.6] }, 0.12);
    return b.geometry();
  }, x, y, z);
  pulse(ev, 'w10m:rollknobs', () => { const b = new Build(); for (const s of [-1, 1]) b.sphere(0.34, 0xa8e8ff, { p: [s * 4.1, 2.55, 0] }, 9, 6); return b.geometry(); }, x, y, z);
  for (const s of [-1, 1]) solidBox(ev, x + s * 4.1 - 0.3, y, z - 0.3, x + s * 4.1 + 0.3, y + 2.6, z + 0.3);
  solidBox(ev, x - 3.8, y, z - 2, x + 3.8, y + 3.8, z + 2);
  solidBox(ev, x - 6.1, y, z + 0.7, x - 5.1, y + 2, z + 1.7);
  solidBox(ev, x + 4.9, y, z + 1.1, x + 5.9, y + 1, z + 2.1);
  // Hügelwalze: gestreift in Nachtgrün mit Mondlicht-Streifen, dreht je Zählzeit eine Zwölftelrunde weiter
  const roller = mover(ev, cached('w10m:roller', () => {
    const b = new Build();
    b.cyl(1.9, 1.9, 7.2, (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 12) % 2 ? 0x2e7a5a : 0x3e9a6a), { r: [0, 0, PI / 2] }, 24);
    for (const s of [-1, 1]) b.cyl(1.95, 1.95, 0.18, 0x8a7ab8, { p: [s * 3.6, 0, 0], r: [0, 0, PI / 2] }, 24);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(0.16, i % 2 ? 0xd8f0ff : 0xfff0a0, { p: [-2.4 + i * 0.95, Math.cos(a) * 1.92, Math.sin(a) * 1.92] }, 6, 4); }
    return b.geometry();
  }), x, y + 1.95, z, 'w10:huegelwalze', true);
  let roll = 0, rstep = 0;
  ev.updaters.push((dt, t) => {
    const bt = beatAt(t);
    rstep = bt.whole;
    roll = -(bt.whole + stepEase(bt.frac, 0.45)) * (TAU / 12);
    roller.rotation.x = roll;
  });
  cullByView(ev, roller, x, y + 2, z, 4.5, 70);
  // Mond über der Insel (Registry 'mond_gesicht', sonst eigene Scheibe) mit weichem Schein und Sternen
  const [mx, my, mz] = ev.def.moon ?? [x + 6, y + 11, z - 5];
  const moonOk = MK.bake(ev, 'mond_gesicht', { size: 2.4, fog: true }, [mx, my, mz], -PI / 2 + 0.25, 1, null, false, 5000);
  if (!moonOk) glow(ev, 'w10m:moon', () => { const b = new Build(); b.add(new THREE.CircleGeometry(2.4, 24), 0xfff2c8, { r: [-0.3, 0, 0] }); return b.geometry(); }, mx, my, mz);
  const halo = haloSprite(ev, 0xb8d0ff, 11, 0.4);
  halo.position.set(mx, my, mz - 0.4);
  halo.name = 'w10:mondschein';
  ev.view.add(halo);
  for (const [dx, dy, s] of [[-4.5, 1.5, 0.5], [3.8, 2.4, 0.36], [-2, 4, 0.3], [5, -1.5, 0.28], [-6.5, -0.5, 0.32], [1.5, 4.6, 0.42]]) glow(ev, `w10m:spark:${s}`, () => sparkStarGeo(s), mx + dx, my + dy, mz + 0.5);
  // Zeit-Uhren als Ideallinie (Instanzen, drehen sich, schweben)
  const clocks = ev.def.clocks ?? [[x - 3, y + 1.6, z + 4], [x - 1, y + 1.8, z + 4.6], [x + 1, y + 2.0, z + 4.8], [x + 3, y + 1.8, z + 4.6], [x + 5, y + 1.6, z + 4]];
  const cm = instanced(ev, clockGeo(), clocks.length, { name: 'w10:zeituhren', key: 'w10clock', rough: 0.3 });
  let cspin = 0;
  ev.updaters.push((dt, t) => {
    if (!(cm.visible = inView(ev.view, clocks[2][0], clocks[2][1], clocks[2][2], 6, 60))) return;
    cspin = t * 1.6;
    clocks.forEach(([cx, cy, cz], i) => setInst(cm, i, cx, cy + Math.sin(t * 2 + i) * 0.12, cz, cspin + i * 0.5, 1));
    cm.instanceMatrix.needsUpdate = true;
  });
  // Stachel-Hüpfmaus hüpft im Kreis
  const [hx, hy, hz] = ev.def.mice?.[0] ?? [x - 8, y, z + 6];
  let hop = 0;
  const mouse = MK.live(ev, 'huepfmaus_stachel', {}, [hx, hy, hz], 0, 1.1, (dt, t) => { const u = (t % 0.9) / 0.9; hop = u; return u < 0.75 ? { anim: 'hop', progress: u / 0.75 } : { anim: 'land' }; }, true, 7200, 45, true);
  if (mouse) ev.updaters.push((dt, t) => { const a = t * 0.55; mouse.root.position.set(hx + Math.cos(a) * 2.2, hy + (hop < 0.75 ? Math.sin((hop / 0.75) * PI) * 0.85 : 0), hz + Math.sin(a) * 2.2); mouse.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); });
  // Stachelkugler rollt am Fuß der Walze hin und her
  const [kx, ky, kz] = ev.def.kugler ?? [x + 7, y, z + 4];
  let kpos = 0;
  const kug = MK.live(ev, 'stachelkugler', {}, [kx, ky, kz], 0, 1, (dt, t) => { const s = Math.sin(t * 0.8); kpos = s * 2.2; return { anim: 'roll', roll: s * 2.2 / 0.42, speed: 1 }; }, true, 6400, 45, true);
  if (kug) ev.updaters.push(() => { kug.root.position.x = kx + kpos; });
  addInfo(ev, () => ({ nighthills: { roll: +roll.toFixed(3), step: rstep, moon: moonOk ? 'registry' : 'eigen', mouse: !!mouse, hop: +hop.toFixed(3), clocks: clocks.length, spin: +cspin.toFixed(2), kugler: !!kug } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-2 Bohnenranken mit Stacheln im Sonnenuntergang

function spikyBean(ev, x, y, z) {
  // tief stehende Abendsonne hinter den Ranken
  const [sx, sy, sz] = ev.def.sun ?? [x - 1, y + 7, z - 7];
  glow(ev, 'w10m:sunset', () => { const b = new Build(); b.add(new THREE.CircleGeometry(3.4, 28), 0xffa060, { r: [-0.15, 0, 0] }); b.add(new THREE.CircleGeometry(2.6, 28), 0xffc880, { p: [0, 0, 0.02], r: [-0.15, 0, 0] }); return b.geometry(); }, sx, sy, sz);
  const sun = haloSprite(ev, 0xff8a5a, 16, 0.5);
  sun.position.set(sx, sy, sz - 0.3);
  sun.name = 'w10:abendsonne';
  ev.view.add(sun);
  // zwei Bohnenranken mit Stachelkränzen
  const stalks = ev.def.stalks ?? [[x - 3, z - 1, 8.5], [x + 3.4, z + 0.6, 6]];
  let beanReg = 0;
  for (const [bx, bz, h] of stalks) {
    if (MK.bake(ev, 'beanstalk', { height: h }, [bx, y, bz], 0, 1, { anim: 'idle' }, true, 4200)) beanReg++;
    else addGeo(ev, `w10m:stalk:${h}`, () => { const b = new Build(); const pts = []; for (let i = 0; i <= 8; i++) pts.push([Math.sin(i * 0.9) * 0.4, (i / 8) * h, Math.cos(i * 0.9) * 0.4]); b.tube(pts, 0.24, 0x3ea84a, null, 24, 6); return b.geometry(); }, bx, y, bz);
    for (let k = 1; k <= Math.floor(h / 2.2); k++) addGeo(ev, 'w10m:spikering:0.55', () => spikeRingGeo(0.55, 8).clone(), bx, y + k * 2.1, bz, k * 0.6);
    solidCyl(ev, bx, bz, 0.8, y, y + h);
  }
  // drei Glockenbäume (Glocken schwingen je Zählzeit)
  const trees = ev.def.bells ?? [[x - 8, z + 2], [x + 8, z + 1.5], [x + 0.5, z - 6]];
  const bellPos = [];
  for (const [tx, tz] of trees) {
    addGeo(ev, 'w10m:belltree', () => {
      const b = new Build();
      b.cyl(0.2, 0.3, 2.6, 0x8a5a3a, { p: [0, 1.3, 0] }, 7);
      b.sphere(1.5, { v: (px, py, pz, nx, ny) => mix(0xb8582a, 0xffa04a, ny * 0.5 + 0.5) }, { p: [0, 3.2, 0], s: [1, 0.82, 1] }, 10, 7);
      for (const s of [-1, 1]) b.cyl(0.05, 0.05, 1.2, 0x8a5a3a, { p: [s * 0.9, 2.3, 0.4], r: [0, 0, s * 1.1] }, 4);
      return b.geometry();
    }, tx, y, tz);
    solidCyl(ev, tx, tz, 0.5, y, y + 3.6);
    for (const s of [-1, 1]) bellPos.push([tx + s * 1.25, y + 2.15, tz + 0.4]);
  }
  const bellGeo = cached('w10m:bell', () => { const b = new Build(); b.lathe([[0, 0], [0.26, -0.05], [0.3, -0.42], [0.36, -0.5], [0, -0.5]], { v: (px, py) => mix(0xd8a02a, 0xffe07a, -py * 1.6) }, null, 10); b.sphere(0.07, 0x8a6a2a, { p: [0, -0.52, 0] }, 5, 3); return b.geometry(); });
  const bells = instanced(ev, bellGeo, bellPos.length, { name: 'w10:glocken', key: 'w10bell', rough: 0.3 });
  let swing = 0;
  ev.updaters.push((dt, t) => {
    if (!(bells.visible = inView(ev.view, x, y + 2, z, 10, 65))) return;
    const bt = beatAt(t);
    swing = Math.sin(bt.frac * TAU) * Math.exp(-2.2 * bt.frac) * 0.6 * ((bt.whole & 1) ? 1 : -1);
    bellPos.forEach(([bx, by, bz], i) => setInst(bells, i, bx, by, bz, 0, 1, 0, swing * (i & 1 ? -1 : 1)));
    bells.instanceMatrix.needsUpdate = true;
  });
  // fünf Schlüsselmünzen im Bogen um die große Ranke
  const coins = [];
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; coins.push([stalks[0][0] + Math.sin(a) * 2.2, y + 1.6 + i * 1.3, stalks[0][1] + Math.cos(a) * 2.2]); }
  const km = instanced(ev, keyCoinGeo(), coins.length, { name: 'w10:schluesselmuenzen', key: 'w10coin', rough: 0.25 });
  ev.updaters.push((dt, t) => {
    if (!(km.visible = bells.visible)) return;
    coins.forEach(([cx, cy, cz], i) => setInst(km, i, cx, cy + Math.sin(t * 2.2 + i) * 0.1, cz, t * 2 + i, 0.9));
    km.instanceMatrix.needsUpdate = true;
  });
  // Stachelkugler und Walzenwerfer (Remix-Gegner) als Kulisse
  MK.bake(ev, 'stachelkugler', {}, [x + 6.5, y, z + 4.5], FRONT + 0.4, 1, { anim: 'idle' }, true, 6400);
  MK.bake(ev, 'walzenwerfer', {}, [x - 7.5, y, z - 2.5], FRONT + 0.3, 1, { anim: 'idle' }, true, 9200);
  addInfo(ev, () => ({ beanstalk: { stalks: stalks.length, registry: beanReg, bells: bellPos.length, swing: +swing.toFixed(3), coins: coins.length } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-3 dunkler Dschungel mit Lichtkegeln

function darkJungle(ev, x, y, z) {
  const R = ev.def.pond ?? 4.6;
  // dunkler Teich (glänzend) mit Seerosen und Uferkranz
  ev.addStatic(place(cached(`w10m:pond:${R}`, () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(R, 32).rotateX(-PI / 2), { v: (px, py, pz) => mix(0x0e1a3a, 0x24406a, Math.hypot(px, pz) / R) }, { p: [0, 0.03, 0] });
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.3; b.add(new THREE.CircleGeometry(0.45, 10, 0.4, TAU - 0.8).rotateX(-PI / 2), 0x2e7a44, { p: [Math.cos(a) * R * 0.72, 0.05, Math.sin(a) * R * 0.72] }); }
    return b.geometry();
  }).clone(), x, y, z), { material: 'stone', castShadow: false });
  addGeo(ev, `w10m:pondrim:${R}`, () => {
    const b = new Build();
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; b.sphere(0.42 + hash1(i) * 0.2, { v: (px, py, pz, nx, ny) => mix(0x1e3a2e, 0x3e6a4a, ny * 0.5 + 0.5) }, { p: [Math.cos(a) * (R + 0.2), 0.1, Math.sin(a) * (R + 0.2)], s: [1.3, 0.55, 1.1] }, 6, 4); }
    return b.geometry();
  }, x, y, z, 0, false);
  solidCyl(ev, x, z, R + 0.5, y, y + 0.6, 'teich');
  // Blätterdach: Riesenblätter und dunkle Stämme hinter dem Teich
  let leaves = 0;
  for (const [lx, lz, yaw, s] of [[x - 6, z - 3.5, 0.8, 1.2], [x + 6.2, z - 3, -0.9, 1.1], [x, z - 6.5, 0.1, 1.3]]) {
    if (MK.bake(ev, 'riesenblatt', {}, [lx, y, lz], yaw, s, null, true, 1600)) leaves++;
  }
  addGeo(ev, 'w10m:jungletrees', () => {
    const b = new Build();
    for (const [tx, tz, h] of [[-8.5, -1, 7], [8.5, -2, 6.5], [-3.5, -7.5, 8], [4.5, -7, 7.4]]) {
      b.cyl(0.35, 0.5, h, { v: (px, py) => mix(0x2a1e18, 0x4a3426, py / h + 0.5) }, { p: [tx, h / 2, tz] }, 7);
      b.sphere(2.4, { v: (px, py, pz, nx, ny) => mix(0x0e2e22, 0x2a5a3a, ny * 0.5 + 0.5) }, { p: [tx, h + 0.6, tz], s: [1.3, 0.62, 1.2] }, 9, 6);
      const pts = []; for (let i = 0; i <= 5; i++) pts.push([tx + 0.4 + i * 0.05, h - i * 0.9, tz + 0.5]);
      b.tube(pts, 0.05, 0x2e6a3a, null, 8, 3);
    }
    return b.geometry();
  }, x, y, z);
  for (const [tx, tz] of [[-8.5, -1], [8.5, -2], [-3.5, -7.5], [4.5, -7]]) solidCyl(ev, x + tx, z + tz, 0.6, y, y + 6);
  // Blatt-Floß mit Kreisgeist kreist auf dem Teich
  let raftA = 0;
  const raft = MK.live(ev, 'leaf_raft', {}, [x + R * 0.5, y + 0.05, z], 0, 0.9, 'idle', false, 2200, 55, true);
  const ghost = MK.live(ev, 'kreisgeist', {}, [x + R * 0.5, y + 0.9, z], 0, 0.9, 'idle', false, 5000, 55, true);
  ev.updaters.push((dt, t) => {
    raftA = t * 0.35;
    const px = x + Math.cos(raftA) * R * 0.5, pz = z + Math.sin(raftA) * R * 0.45;
    if (raft) { raft.root.position.set(px, y + 0.05 + Math.sin(t * 1.7) * 0.03, pz); raft.root.rotation.y = -raftA - PI / 2; }
    if (ghost) { ghost.root.position.set(px, y + 1.1 + Math.sin(t * 2.3) * 0.15, pz); ghost.root.rotation.y = -raftA; }
  });
  // vier Licht-Helme auf Pfählen, Lichtkegel schwenken je Zählzeit zu einem neuen Ziel
  const lamps = ev.def.lamps ?? [[x - 5.6, z + 3.4], [x + 5.6, z + 3.2], [x - 4.4, z - 4.2], [x + 4.6, z - 4.4]];
  const beamM = beamMat(0xffe08a, 0.22);
  ev.own.push(beamM);
  const beams = [];
  lamps.forEach(([lx, lz], i) => {
    addGeo(ev, 'w10m:lamppost', () => { const b = new Build(); b.cyl(0.08, 0.1, 2.6, 0x4a3426, { p: [0, 1.3, 0] }, 6); b.box(0.5, 0.08, 0.5, 0x5a4030, { p: [0, 2.62, 0] }, 0.02); return b.geometry(); }, lx, y, lz);
    solidCyl(ev, lx, lz, 0.25, y, y + 2.7);
    const toPond = Math.atan2(-(z - lz), x - lx);
    if (!MK.bake(ev, 'helm_licht', {}, [lx, y + 2.66, lz], toPond, 1, { on: true }, false, 3000)) {
      addGeo(ev, 'w10m:helmbox', () => { const b = new Build(); b.box(0.5, 0.4, 0.5, 0xffc83a, { p: [0, 0.2, 0] }, 0.06); b.sphere(0.18, 0xfff4c0, { p: [0.28, 0.24, 0] }, 7, 5); return b.geometry(); }, lx, y + 2.66, lz, toPond);
    }
    const pivot = new THREE.Group();
    pivot.position.set(lx, y + 2.95, lz);
    const cone = new THREE.Mesh(cached('w10m:beam', () => beamGeo(0.95, 4.0)), beamM);
    cone.rotation.z = 0;
    cone.renderOrder = 5;
    pivot.add(cone);
    pivot.name = `w10:lichtkegel:${i}`;
    ev.view.add(pivot);
    beams.push({ pivot, cone, base: toPond, ph: i * 1.3 });
  });
  let aim = 0, aimStep = 0;
  ev.updaters.push((dt, t) => {
    const vis = inView(ev.view, x, y + 1.5, z, 9, 60);
    const bt = beatAt(t);
    aimStep = bt.whole;
    const e = stepEase(bt.frac, 0.5);
    for (const bm of beams) {
      bm.pivot.visible = vis;
      if (!vis) continue;
      const a0 = Math.sin((bt.whole + bm.ph) * 1.7) * 0.55, a1 = Math.sin((bt.whole + 1 + bm.ph) * 1.7) * 0.55;
      aim = a0 + (a1 - a0) * e;
      bm.pivot.rotation.set(0, bm.base + aim, 0);
      bm.cone.rotation.z = 0.95;   // schräg nach vorn-unten zum Teich
    }
    beamM.opacity = 0.14 + 0.1 * bt.k;
  });
  // dunkler Dunst über dem Teich
  const mist = haloSprite(ev, 0x2a3a6a, 12, 0.35);
  mist.position.set(x, y + 1.5, z);
  mist.name = 'w10:dunst';
  ev.view.add(mist);
  addInfo(ev, () => ({ darkjungle: { lamps: lamps.length, beams: beams.length, aim: +aim.toFixed(3), step: aimStep, raft: !!raft, ghost: !!ghost, raftA: +raftA.toFixed(3), leaves } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-4 Schattenspiel-Gasse

function shadowAlley(ev, x, y, z) {
  // beleuchtete Wand (Putz) mit Holzrahmen
  addGeo(ev, 'w10m:shadowwall', () => {
    const b = new Build();
    b.box(10, 5.2, 0.7, { v: (px, py, pz, nx, ny) => (pz > 0.3 ? mix(0xf2dcb8, 0xffecc8, py / 5 + 0.5) : 0xc8a888) }, { p: [0, 2.6, 0] }, 0.08);
    b.box(10.4, 0.36, 0.9, 0x6a4a3a, { p: [0, 5.3, 0] }, 0.05);
    for (const s of [-1, 1]) b.box(0.36, 5.4, 0.85, 0x6a4a3a, { p: [s * 5.1, 2.7, 0] }, 0.05);
    for (let i = 0; i < 9; i++) b.box(1.05, 0.34, 0.05, mix(0xd8b890, 0xe8c8a0, hash1(i)), { p: [-4.4 + i * 1.1, 0.3 + (i % 2) * 0.36, 0.37] }, 0.02);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 5.3, y, z - 0.45, x + 5.3, y + 5.5, z + 0.45, 'wand');
  // Gassenhäuschen links und rechts mit leuchtenden Fenstern
  for (const s of [-1, 1]) {
    const hx = x + s * 8.2, hz = z + 1.5;
    addGeo(ev, 'w10m:alleyhouse', () => {
      const b = new Build();
      b.box(3.4, 3.6, 3.2, { v: (px, py) => mix(0x8a6a8a, 0xa888a8, py / 3.6 + 0.5) }, { p: [0, 1.8, 0] }, 0.08);
      const roof = new THREE.Shape(); roof.moveTo(-2, 0); roof.lineTo(0, 1.6); roof.lineTo(2, 0); roof.lineTo(-2, 0);
      b.extrude(roof, 3.6, 0x5a3a5a, { p: [0, 3.6, 0] }, 0.05, 1);
      b.box(0.8, 1.5, 0.08, 0x4a2a2a, { p: [0, 0.75, 1.62] }, 0.03);
      return b.geometry();
    }, hx, y, hz);
    pulse(ev, 'w10m:alleywin', () => { const b = new Build(); for (const wx of [-0.95, 0.95]) b.box(0.62, 0.62, 0.04, 0xffd88a, { p: [wx, 2.4, 1.64] }, 0); return b.geometry(); }, hx, y, hz);
    solidBox(ev, hx - 1.8, y, hz - 1.7, hx + 1.8, y + 4.8, hz + 1.7, 'haus');
  }
  // Lampe vor der Wand (warmer Schein) – sie wirft die Schatten
  const [lx, ly, lz] = [x, y, z + 5];
  addGeo(ev, 'w10m:alleylamp', () => { const b = new Build(); b.cyl(0.08, 0.1, 2.2, 0x3a2a2a, { p: [0, 1.1, 0] }, 6); b.box(0.5, 0.5, 0.5, 0x3a2a2a, { p: [0, 2.4, 0] }, 0.04); return b.geometry(); }, lx, ly, lz);
  glow(ev, 'w10m:alleylampglow', () => { const b = new Build(); b.box(0.36, 0.36, 0.52, 0xfff0b0, { p: [0, 2.4, 0] }, 0); return b.geometry(); }, lx, ly, lz);
  solidCyl(ev, lx, lz, 0.25, ly, ly + 2.7);
  const lamp = haloSprite(ev, 0xffd08a, 4.5, 0.55);
  lamp.position.set(lx, ly + 2.4, lz);
  lamp.name = 'w10:gassenlampe';
  ev.view.add(lamp);
  // heller Lichtfleck auf der Wand (hinter den Schattenfiguren)
  const spot = haloSprite(ev, 0xffe0a0, 7, 0.4);
  spot.position.set(x, y + 2.6, z + 0.5);
  spot.name = 'w10:wandlicht';
  ev.view.add(spot);
  // Schattenfiguren: Turm aus 30 Pilzlingen (gestapelte Silhouetten), Stern und Hase – wiegen sich im Takt
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x3a2638, transparent: true, opacity: 0.82, depthWrite: false, fog: true });
  ev.own.push(shadowMat);
  const figs = new THREE.Group();
  figs.position.set(x, y, z + 0.37);
  figs.name = 'w10:schattenfiguren';
  const tower = new THREE.Mesh(cached('w10m:shadowtower', () => {
    const b = new Build();
    for (let i = 0; i < 30; i++) {
      const yy = 0.4 + i * 0.15, w = 0.36 + Math.sin(i * 0.7) * 0.04;
      b.add(new THREE.CircleGeometry(w, 10, 0, PI), 0xffffff, { p: [0, yy, 0] });
      b.add(new THREE.PlaneGeometry(w * 1.1, 0.1), 0xffffff, { p: [0, yy - 0.03, 0] });
    }
    return b.geometry();
  }), shadowMat);
  tower.position.set(-2.8, 0, 0.01);
  const star = new THREE.Mesh(cached('w10m:shadowstar', () => { const b = new Build(); b.add(sparkStarGeo(0.55).clone(), 0xffffff, { r: [0.3, 0, 0] }); return b.geometry(); }), shadowMat);
  star.position.set(0.6, 3.6, 0.01);
  const bunny = new THREE.Mesh(cached('w10m:shadowbunny', () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(0.55, 14), 0xffffff, { p: [0, 0.9, 0], s: [1.3, 0.9, 1] });
    b.add(new THREE.CircleGeometry(0.34, 12), 0xffffff, { p: [0.62, 1.42, 0] });
    for (const dx of [0.5, 0.72]) b.add(new THREE.CircleGeometry(0.12, 8), 0xffffff, { p: [dx, 2.0, 0], s: [0.7, 3, 1] });
    return b.geometry();
  }), shadowMat);
  bunny.position.set(2.6, 0, 0.01);
  figs.add(tower, star, bunny);
  ev.view.add(figs);
  let sway = 0;
  ev.updaters.push((dt, t) => {
    if (!(figs.visible = inView(ev.view, x, y + 2.5, z, 7, 60))) return;
    const bt = beatAt(t);
    sway = Math.sin((bt.whole + stepEase(bt.frac, 0.5)) * PI * 0.5) * 0.12;
    tower.rotation.z = sway; bunny.position.y = Math.abs(Math.sin((bt.whole + bt.frac) * PI)) * 0.4; star.rotation.z = -t * 0.8;
  });
  // Kanonen-Helm auf einer Kiste, Kisten an der Wand
  addGeo(ev, 'w10m:alleycrates', () => { const b = new Build(); b.box(1.1, 1.1, 1.1, 0x9a6a3a, { p: [0, 0.55, 0] }, 0.05); b.box(0.9, 0.9, 0.9, 0x8a5a32, { p: [1.1, 0.45, 0.2] }, 0.05); return b.geometry(); }, x + 3.8, y, z + 1.6);
  solidBox(ev, x + 3.2, y, z + 1, x + 5.2, y + 1.1, z + 2.2, 'kisten');
  MK.bake(ev, 'helm_kanone', {}, [x + 3.8, y + 1.1, z + 1.6], FRONT + 0.4, 1, null, true, 3000);
  addInfo(ev, () => ({ shadowalley: { figures: figs.children.length, tower: 30, sway: +sway.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-5 Fernost-Halle bei Tag

function dayHall(ev, x, y, z) {
  // Sockel, rote Säulen, Schiebewände (Papier) und Dach
  addGeo(ev, 'w10m:hallbase', () => {
    const b = new Build();
    b.box(9, 0.5, 5.4, 0xe8dcc8, { p: [0, 0.25, 0] }, 0.06);
    for (const sx of [-3.9, -1.3, 1.3, 3.9]) b.cyl(0.24, 0.26, 3.6, 0xd8302a, { p: [sx, 2.3, 2.3] }, 9);
    for (const sx of [-3.9, 3.9]) b.cyl(0.24, 0.26, 3.6, 0xd8302a, { p: [sx, 2.3, -2.3] }, 9);
    for (const sx of [-2.6, 0, 2.6]) {
      b.box(2.4, 3.2, 0.12, 0xfff8ea, { p: [sx, 2.1, -2.2] }, 0.02);
      for (let k = 1; k < 4; k++) b.box(2.4, 0.04, 0.14, 0x6a3a2a, { p: [sx, 0.5 + k * 0.8, -2.2] }, 0);
      b.box(0.04, 3.2, 0.14, 0x6a3a2a, { p: [sx, 2.1, -2.2] }, 0);
    }
    b.box(9.2, 0.3, 5.6, 0x6a3a2a, { p: [0, 4.2, 0] }, 0.04);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 4.6, y, z - 2.8, x + 4.6, y + 4.4, z + 2.8, 'halle');
  if (!MK.bake(ev, 'fernost_dach', {}, [x, y + 4.3, z], 0, 1.25, null, true, 7000)) {
    addGeo(ev, 'w10m:hallroof', () => { const b = new Build(); b.cone(6.6, 2.6, { v: (px, py) => mix(0x1e8a6a, 0x3ac89a, py / 2.6 + 0.5) }, { p: [0, 1.3, 0], s: [1, 1, 0.66] }, 4); return b.geometry(); }, x, y + 4.3, z, PI / 4);
  }
  MK.bake(ev, 'pilz_maske', {}, [x, y + 4.2, z + 2.9], FRONT, 1.4, { rise: 1 }, true, 6000);
  for (const s of [-1, 1]) MK.bake(ev, 'papierlaterne', { color: s > 0 ? 'rot' : 'gelb', mount: 'pfahl' }, [x + s * 5.6, y, z + 2.6], s > 0 ? PI : 0, 1, { lit: true }, true, 3600);
  for (const s of [-1, 1]) solidCyl(ev, x + s * 5.6, z + 2.6, 0.25, y, y + 2.4);
  // Gong neben der Halle: schlägt je Takt (vier Zählzeiten)
  const [gx, gz] = ev.def.gong ?? [x - 7, z + 0.5];
  let strikes = 0, bar = -1, gk = 0;
  const gong = MK.live(ev, 'gong', {}, [gx, y, gz], -PI / 2 + 0.5, 1, (dt, t) => {
    const bt = beatAt(t);
    const b = Math.floor(bt.beat / 4);
    if (b !== bar) { if (bar >= 0) strikes++; bar = b; }
    const p = ((bt.beat / 4) % 1) * 4 * 60 / bt.bpm / 1.6;
    gk = Math.max(0, 1 - p);
    return { anim: 'ring', progress: Math.min(1, p) };
  }, true, 6000, 55);
  solidCyl(ev, gx, gz, 1.2, y, y + 2.8);
  // Sonne mit Strahlen (Tag!) und Wolken
  const [sx, sy, sz] = ev.def.sun ?? [x + 5, y + 10, z - 6];
  glow(ev, 'w10m:daysun', () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(1.8, 24), 0xfff2a0, { r: [-0.3, 0, 0] });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.add(new THREE.PlaneGeometry(0.34, 1.2), 0xffd84a, { p: [Math.cos(a) * 2.6, Math.sin(a) * 2.6 * Math.cos(0.3), -Math.sin(a) * 0.8], r: [-0.3, 0, a - PI / 2] }); }
    return b.geometry();
  }, sx, sy, sz);
  const sun = haloSprite(ev, 0xfff0a0, 12, 0.55);
  sun.position.set(sx, sy, sz - 0.3);
  sun.name = 'w10:tagsonne';
  ev.view.add(sun);
  addGeo(ev, 'w10m:dayclouds', () => {
    const b = new Build();
    for (const [cx, cy, cz, r] of [[-3, 0, 0, 1.4], [-1.6, 0.3, 0.2, 1.1], [3.4, -0.8, 0.4, 1.2], [4.6, -0.6, 0, 0.9], [0, 1.5, -1, 1.0]]) b.sphere(r, { v: (px, py, pz, nx, ny) => mix(0xd8e4f8, 0xffffff, ny * 0.5 + 0.5) }, { p: [cx, cy, cz], s: [1.3, 0.72, 1] }, 9, 6);
    return b.geometry();
  }, x, y + 7.5, z - 3.5, 0, false);
  // pendelnd fliegender Zielmast über den Wolken
  let poleS = 0;
  const [px, py, pz] = ev.def.pole ?? [x + 1, y + 7.2, z - 4];
  const pole = MK.live(ev, 'zielmast_fluegel', { height: 5 }, [px, py, pz], FRONT, 0.6, (dt, t) => ({ fly: 1, flap: 0.5 + 0.5 * Math.sin(t * 9) }), false, 7600, 60, true);
  if (pole) ev.updaters.push((dt, t) => { poleS = Math.sin(t * 0.7); pole.root.position.set(px + poleS * 4.5, py + Math.abs(Math.cos(t * 0.7)) * -0.8, pz); pole.root.rotation.z = -poleS * 0.2; });
  // Hammer-Werfer auf der Treppe
  MK.bake(ev, 'hammer_werfer', {}, [x + 2.6, y + 0.5, z + 3.6], FRONT + 0.3, 1, { anim: 'idle' }, true, 9400);
  addInfo(ev, () => ({ dayhall: { gong: !!gong, strikes, bar, ring: +gk.toFixed(3), pole: !!pole, poleS: +poleS.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-6 Riesen-Schiffswrack

function giantWreck(ev, x, y, z) {
  // riesiger Wrack-Bug ragt schräg aus dem Hut, geknickter Mast daneben
  const bow = MK.bake(ev, 'geisterschiff_wrack', { kind: 'bug', size: 2.3 }, [x, y, z], FRONT + 0.5, 1, null, true, 4000);
  const mast = MK.bake(ev, 'geisterschiff_wrack', { kind: 'mast', size: 1.6 }, [x + 8, y, z - 1.5], FRONT - 0.4, 1, null, true, 4000);
  if (!bow) addGeo(ev, 'w10m:bowfallback', () => { const b = new Build(); b.box(5, 3, 11, { v: (px, py) => mix(0x3a4a3a, 0x6a7a5a, py / 3 + 0.5) }, { p: [0, 1.5, 0], r: [0.4, 0.3, 0] }, 0.2); return b.geometry(); }, x, y, z);
  solidBox(ev, x - 3.8, y, z - 4, x + 3.8, y + 6, z + 2.4, 'wrack');
  if (mast || true) solidCyl(ev, x + 8, z - 1.5, 0.7, y, y + 6);
  // Geisterschiff schaukelt im Meer hinter dem Hut
  const [sx, sy, sz] = ev.def.ship ?? [x - 4, 0.4, z - 15];
  let roll = 0;
  const ship = MK.live(ev, 'geisterschiff', { part: 'ganz', length: 12, width: 5 }, [sx, sy, sz], 0.4, 1.4, (dt, t) => ({ anim: 'idle', lit: true, wind: 0.5 + 0.3 * Math.sin(t * 0.8), sway: 1 }), false, 11000, 80);
  if (ship) ev.updaters.push((dt, t) => { roll = Math.sin(t * 0.6) * 0.08; ship.root.rotation.x = roll; ship.root.position.y = sy + Math.sin(t * 0.9) * 0.25; });
  // Schubser stapft hin und her, Pustewolke bläst, Krakenpilz
  const [bx, bz] = ev.def.schubser ?? [x - 7, z + 4];
  let walkU = 0;
  const sch = MK.live(ev, 'schubser', {}, [bx, y, bz], 0, 1, (dt, t) => ({ anim: 'walk', speed: 1.4 }), true, 10000, 50, true);
  if (sch) ev.updaters.push((dt, t) => { walkU = Math.sin(t * 0.5); sch.root.position.x = bx + walkU * 2.4; sch.root.rotation.y = Math.cos(t * 0.5) > 0 ? 0 : PI; });
  const puff = MK.live(ev, 'pustewolke', {}, [x + 5, y + 4.6, z + 2.5], PI, 1, (dt, t) => { const u = (t % 3) / 3; return u < 0.35 ? { anim: 'inhale', progress: u / 0.35 } : { anim: 'blow', power: 1 }; }, false, 10500, 55);
  if (puff) ev.updaters.push((dt, t) => { puff.root.position.y = y + 4.6 + Math.sin(t * 1.4) * 0.3; });
  MK.bake(ev, 'krakenpilz', {}, [x + 3.4, y, z + 5.2], FRONT + 0.6, 1, { anim: 'idle' }, true, 8400);
  // fünf Warp-Boxen
  const boxes = ev.def.boxes ?? [[x - 9, z - 3], [x - 5.5, z - 5], [x + 4, z - 5.5], [x + 10, z + 2.5], [x + 9, z + 6]];
  let wb = 0;
  for (const [wx, wz] of boxes) {
    if (MK.bake(ev, 'warp_box', {}, [wx, y, wz], FRONT, 0.85, null, true, 3800)) wb++;
    else addGeo(ev, 'w10m:warpbox', () => { const b = new Build(); b.box(1.4, 1, 1.4, 0x8a5ad8, { p: [0, 0.5, 0] }, 0.08); return b.geometry(); }, wx, y, wz);
    solidBox(ev, wx - 0.75, y, wz - 0.75, wx + 0.75, y + 1.1, wz + 0.75, 'warpbox');
  }
  addInfo(ev, () => ({ giantwreck: { bow, mast, ship: !!ship, roll: +roll.toFixed(3), schubser: !!sch, walk: +walkU.toFixed(3), puff: !!puff, boxes: boxes.length, registryBoxes: wb } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-7 zerbrochene Plattformen über blauer Lava

function blueLavaTexture() {
  // weiche, kachelbare Glut-Adern (Sinus-Muster, an den Rändern nahtlos)
  return canvasTexture('w10:bluelava2', 128, 128, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const u = (i / w) * TAU, v = (j / h) * TAU;
        const f = Math.sin(u * 2 + Math.sin(v * 3) * 1.2) * 0.5 + Math.sin(v * 2 - Math.sin(u * 1) * 1.6) * 0.5;
        const vein = Math.max(0, 1 - Math.abs(f) * 4.5);
        const k = 0.55 + 0.45 * vein;
        const o = (j * w + i) * 4;
        img.data[o] = 30 + 200 * vein * vein; img.data[o + 1] = 110 + 140 * k * vein + 40 * k; img.data[o + 2] = 230 + 25 * vein; img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: true });
}

function brokenBelt(ev, x, y, z) {
  const [p0x, p0z, p1x, p1z] = ev.def.pool ?? [x - 7, z - 5, x + 7, z + 3];
  const pw = p1x - p0x, pd = p1z - p0z, pcx = (p0x + p1x) / 2, pcz = (p0z + p1z) / 2;
  // blaue Lava: fließende Textur (eigenes Mesh); den Basaltrand legt der Kartenrand 'lavarim10' (pilz10.js)
  const tex = blueLavaTexture().clone();
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(pw / 7, pd / 7);
  ev.own.push(tex);
  const lavaM = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, fog: true });
  ev.own.push(lavaM);
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd).rotateX(-PI / 2), lavaM);
  ev.own.push(lava.geometry);
  lava.position.set(pcx, y + 0.06, pcz);
  lava.name = 'w10:blaue-lava';
  ev.view.add(lava);
  const shine = haloSprite(ev, 0x4ab8ff, Math.max(pw, pd) * 1.1, 0.35);
  shine.position.set(pcx, y + 1.2, pcz);
  shine.name = 'w10:lavaschein';
  ev.view.add(shine);
  // zerbrochene Plattformen: Bruchstücke sinken je Takt ein Stück, tauchen nach dem Takt wieder auf (Instanzen)
  const plates = ev.def.plates ?? [[pcx - 4.5, pcz + 0.5, 0.2], [pcx - 1.5, pcz - 1.5, -0.3], [pcx + 1.6, pcz + 1, 0.5], [pcx + 4.4, pcz - 1, -0.15], [pcx, pcz + 2.2, 0.9]];
  const pg = cached('w10m:brokenplate', () => {
    const b = new Build();
    const s = new THREE.Shape(); s.moveTo(-1.2, -1); s.lineTo(0.9, -1.15); s.lineTo(1.25, 0.2); s.lineTo(0.4, 1.1); s.lineTo(-1.1, 0.9); s.lineTo(-1.2, -1);
    b.extrude(s, 0.4, { v: (px, py, pz, nx, ny) => (Math.abs(pz) < 0.18 && Math.abs(nx) + Math.abs(ny) > 0.9 ? 0x6a6a8a : mix(0x8a94b8, 0xc8d0e8, ny * 0.5 + 0.5)) }, { r: [-PI / 2, 0, 0] }, 0.04, 1);
    b.box(1.2, 0.03, 0.08, 0x3a3a5a, { p: [0.1, 0.21, 0.1], r: [0, 0.7, 0] }, 0);
    return b.geometry();
  });
  const pm = instanced(ev, pg, plates.length, { name: 'w10:bruchplatten', key: 'w10plate', rough: 0.6 });
  let sink = 0;
  ev.updaters.push((dt, t) => {
    tex.offset.x = (t * 0.05) % 1; tex.offset.y = (t * 0.03) % 1;
    const vis = inView(ev.view, pcx, y, pcz, Math.max(pw, pd), 70);
    pm.visible = vis;
    if (!vis) return;
    const bt = beatAt(t);
    const barU = ((bt.beat % 4) + 4) % 4 / 4;
    sink = barU < 0.8 ? barU / 0.8 : 1 - (barU - 0.8) / 0.2;
    plates.forEach(([px, pz, yaw], i) => {
      const k = (sink + i * 0.2) % 1;
      setInst(pm, i, px, y + 0.25 - k * 0.5, pz, yaw, 1, Math.sin(t * 1.3 + i) * 0.06 + k * 0.12, Math.cos(t * 1.1 + i) * 0.05);
    });
    pm.instanceMatrix.needsUpdate = true;
  });
  // Laufzylinder in der Lava (blau), Stachelwalze am Rand, Gleitblatt schwebt
  let rollA = 0;
  const cyl = MK.live(ev, 'zylinder_walze', { length: 5, radius: 1.1, color: 'blau' }, [pcx, y + 0.5, p0z + 1.3], 0, 1, (dt, t) => { rollA = t * 0.9; return { angle: rollA }; }, true, 6000, 60);
  if (!cyl) addGeo(ev, 'w10m:cylfallback', () => { const b = new Build(); b.cyl(1.1, 1.1, 5, 0x3a6ad8, { r: [0, 0, PI / 2] }, 14); return b.geometry(); }, pcx, y + 0.5, p0z + 1.3);
  const spk = MK.live(ev, 'stachelwalze_rot', { length: 3, radius: 0.5 }, [p1x + 2.2, y, pcz - 2], PI / 2, 1, { speed: 1.6 }, true, 6000, 50);
  if (spk) solidBox(ev, p1x + 2.2 - 0.9, y, pcz - 3.6, p1x + 2.2 + 0.9, y + 1.4, pcz - 0.4, 'walze');
  const leaf = MK.live(ev, 'powerup_gleitblatt', {}, [pcx + 2, y + 2.8, pcz - 1], 0, 1.6, 'idle', false, 1200, 55);
  if (leaf) ev.updaters.push((dt, t) => { leaf.root.position.y = y + 2.8 + Math.sin(t * 1.6) * 0.35; leaf.root.rotation.y = t * 0.8; });
  addInfo(ev, () => ({ brokenbelt: { plates: plates.length, sink: +sink.toFixed(3), lava: tex.offset.x > 0 || tex.offset.y > 0, cylinder: !!cyl, rollA: +rollA.toFixed(3), spikes: !!spk, leaf: !!leaf } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ P-Haus Prüfungs-Haus der zehn Kampf-Räume

// Fenster der zehn Kampf-Räume (x, y relativ zum Hausfuß; dz vor die Giebelfläche)
const BRAWL_WINS = [[-3.3, 3.3], [-1.65, 3.3], [0, 3.3], [1.65, 3.3], [3.3, 3.3], [-3.3, 1.5], [-1.65, 1.5], [1.65, 1.5], [3.3, 1.5], [0, 5.5, 0.34]];

function brawlHouse(ev, x, y, z) {
  addGeo(ev, 'w10m:brawlhouse', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx) => mix(0x6a4a9a, 0x8a6ac0, (py + 2.2) / 4.4 * 0.6 + Math.abs(nx) * -0.1 + 0.3) };
    b.box(8, 4.4, 4.4, wall, { p: [0, 2.2, 0] }, 0.12);
    const roof = new THREE.Shape(); roof.moveTo(-4.4, 0); roof.lineTo(0, 2.6); roof.lineTo(4.4, 0); roof.lineTo(-4.4, 0);
    b.extrude(roof, 5, { v: (px, py) => mix(0x2a1a4a, 0x4a2e7a, py / 2.6) }, { p: [0, 4.38, 0] }, 0.08, 1);
    const door = new THREE.Shape(); door.moveTo(-0.7, 0); door.lineTo(-0.7, 1.6); door.absarc(0, 1.6, 0.7, PI, 0, true); door.lineTo(0.7, 0); door.lineTo(-0.7, 0);
    b.extrude(door, 0.12, 0x2a1630, { p: [0, 0, 2.22] }, 0.03, 10);
    b.box(2.2, 0.2, 0.8, 0x8a7a8a, { p: [0, 0.1, 2.6] }, 0.04);
    for (const [wx, wy, dz = 0] of BRAWL_WINS) b.box(0.86, 0.86, 0.06, 0x3a2a4a, { p: [wx, wy, 2.2 + dz] }, 0.02);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 4.1, y, z - 2.3, x + 4.1, y + 5.6, z + 2.3, 'haus');
  // zehn Fenster (Kampf-Räume) leuchten je Zählzeit der Reihe nach auf (Instanzen): fünf oben, vier unten neben der Tür,
  // ein Rundfenster im Giebel
  const wins = BRAWL_WINS.map(([wx, wy, dz = 0]) => [x + wx, y + wy, z + 2.24 + dz]);
  const winMat = new THREE.MeshBasicMaterial({ vertexColors: false, color: 0xffffff, fog: true, toneMapped: false });
  ev.own.push(winMat);
  const wm = new THREE.InstancedMesh(cached('w10m:winquad', () => new THREE.PlaneGeometry(0.74, 0.74)), winMat, wins.length);
  wm.frustumCulled = false;
  wm.name = 'w10:kampfraum-fenster';
  wins.forEach(([wx, wy, wz], i) => setInst(wm, i, wx, wy, wz + 0.02, 0, 1));
  wm.instanceMatrix.needsUpdate = true;
  ev.view.add(wm);
  ev.own.push(wm);
  const cA = new THREE.Color(0x5a3a6a), cB = new THREE.Color(0xffe07a), cC = new THREE.Color();
  let lit = 0;
  ev.updaters.push((dt, t) => {
    if (!(wm.visible = inView(ev.view, x, y + 2.5, z, 6, 60))) return;
    const bt = beatAt(t);
    lit = ((bt.whole % 10) + 10) % 10;
    for (let i = 0; i < wins.length; i++) {
      const on = i === lit ? bt.k : i < lit ? 0.55 : 0;
      wm.setColorAt(i, cC.copy(cA).lerp(cB, on));
    }
    if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
  });
  // goldenes Fragezeichen auf dem Dach (schwebt, dreht)
  const q = mover(ev, cached('w10m:qmark', () => {
    const b = new Build();
    b.torus(0.5, 0.17, 0xffd23a, { p: [0, 0.85, 0], r: [0, 0, -0.5] }, 8, 20, PI * 1.4);
    b.cyl(0.17, 0.17, 0.45, 0xffd23a, { p: [0.02, 0.3, 0] }, 10);
    b.sphere(0.19, 0xffd23a, { p: [0.02, -0.24, 0] }, 10, 8);
    return b.geometry();
  }), x, y + 8, z, 'w10:fragezeichen', true, vcol(0.35, { emissive: 0x6a4a00 }, 'w10qmark'));
  ev.updaters.push((dt, t) => { q.rotation.y = Math.sin(t * 1.4) * 0.6; q.position.y = y + 8 + Math.sin(t * 2.2) * 0.15; });
  cullByView(ev, q, x, y + 8, z, 1.5, 70);
  // Boxring vor dem Haus: vier Pfosten, drei Seile je Seite
  const [rx, rz] = ev.def.ring ?? [x + 6.5, z + 4.5];
  addGeo(ev, 'w10m:boxring', () => {
    const b = new Build();
    b.box(4.6, 0.3, 4.6, 0x4a6ad8, { p: [0, 0.15, 0] }, 0.04);
    b.box(4.2, 0.02, 4.2, 0xf4f0e8, { p: [0, 0.31, 0] }, 0);
    for (const [cx, cz] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]]) b.cyl(0.1, 0.1, 1.5, 0xe8e8f0, { p: [cx, 1.05, cz] }, 6);
    for (let k = 0; k < 3; k++) {
      const yy = 0.65 + k * 0.38, c = [0xe8302a, 0xffffff, 0x3a6ae8][k];
      for (const [ax, az, bx, bz] of [[-2.2, -2.2, 2.2, -2.2], [2.2, -2.2, 2.2, 2.2], [2.2, 2.2, -2.2, 2.2], [-2.2, 2.2, -2.2, -2.2]]) b.cyl(0.035, 0.035, Math.hypot(bx - ax, bz - az), c, { p: [(ax + bx) / 2, yy, (az + bz) / 2], r: [0, Math.atan2(-(bz - az), bx - ax), PI / 2] }, 4);
    }
    return b.geometry();
  }, rx, y, rz);
  solidBox(ev, rx - 2.4, y, rz - 2.4, rx + 2.4, y + 0.32, rz + 2.4, 'boxring');
  // Boxhandschuh-Schild
  addGeo(ev, 'w10m:glovesign', () => {
    const b = new Build();
    b.cyl(0.08, 0.1, 2.2, 0x6a4a3a, { p: [0, 1.1, 0] }, 6);
    b.box(1.4, 0.9, 0.12, 0xf6e8c8, { p: [0, 2.3, 0] }, 0.04);
    for (const s of [-1, 1]) { b.sphere(0.24, 0xe8302a, { p: [s * 0.3, 2.32, 0.1], s: [1, 1.1, 0.7] }, 9, 6); b.box(0.24, 0.16, 0.16, 0xffffff, { p: [s * 0.3, 2.04, 0.1] }, 0.03); }
    return b.geometry();
  }, x - 5.8, y, z + 3.4, 0.25);
  solidCyl(ev, x - 5.8, z + 3.4, 0.25, y, y + 2.8);
  addInfo(ev, () => ({ brawlhouse: { windows: wins.length, lit, ring: true } }));
  modelsInfo(ev);
}

// Anmeldung: die Kulissen hängen am Kit 'pilz' (pilz10.js meldet es an)
if (BONUS_KITS.pilz) BONUS_KITS.pilz.decorate = decoratePilz;
else registerKit('pilz', { name: 'pilz', decorate: decoratePilz });
void smallShroomGeo; void FRONT;
