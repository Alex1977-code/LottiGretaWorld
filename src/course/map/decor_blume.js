// Kulissen der Eingänge der Bonuswelt Blume (Kurs-Karte „Blumen-Remix“, Welt 11, eigene Gestaltung), aufgerufen aus
// EntranceView.decorate() über bonuskit.decorateBonus. Jedes Blütenblatt trägt eine verkleinerte, „geremixte“ Erinnerung an das
// Basislevel mit kleinen Remix-Hinweisen; in Klammern die Registry-Modelle (mit Dreiecks-Obergrenze, sonst eigene Geometrie):
//   sparkcircus   B-1 (1-5)   Zirkus mit Funken: Zirkuszelt ('zirkuszelt'), Schaltfelder ('switch_tile', Instanzen) – je Zählzeit
//                             springt ein Funkenflämmchen ('funkenflaemmchen') aufs nächste Feld und schaltet es um, Hammer-Werfer
//   cubemine      B-2 (6-7)   Wasserwürfel-Mine: Fördergerüst ('schacht_geruest'), schwebende Wasserwürfel ('wasserkoerper') statt
//                             Kippplattformen, zwei Wuschel-Horden ('wuschel_horde'), Lore mit Kristallen
//   bunnysavanna  B-5 (5-4)   Savanne am Morgen: Schirmakazien ('akazie'), Morgensonne in Rosa, ein Riesenhase ('bunny_small' × 3)
//                             und eine Hasenschar (Instanzen) hüpfen, Wolkenlifte ('wolkenlift') schweben
//   torchcreek    B-3 (4-2)   Fackeln bei Nacht: Mond ('mond_gesicht'), drei Gruppen Fackeln – je Zählzeit entzündet sich die
//                             nächste, Giftwasser ('giftwasser'), Rankenschnapper ('rankenschnapper')
//   clockfort     B-4 (7-1)   Werferburg mit großer Uhr: blaue Burgtürme ('festungsturm' blau), Mauer mit großem Zifferblatt –
//                             der Zeiger springt je Zählzeit weiter (30 s!), Feuer-Werfer ('feuer_werfer') auf der Mauer
//   graymansion   B-6 (3-3)   Spukhaus in Schwarz-Weiß: Haus, Spuke ('spuk') und falsche Zielmasten ('zielmast_spuk') ganz in Grau
//                             (Vertexfarben in Graustufen gebacken), ein grauer Großspuk schwebt
//   cannonlagoon  B-7 (3-5)   Lagune mit Kanonen-Helm: Lagunenbecken mit Röhren, Kanonen-Helm ('helm_kanone') dreht sich, ein
//                             Rammfisch ('rammfisch') springt im Bogen, Felsblockwand ('felsblock_riss')
//   beepskyway    B-8 (4-3)   Piep-Block-Himmelsweg: zwei Sätze Piep-Blöcke wechseln JE Zählzeit (viermal so schnell wie in Welt 4,
//                             ohne Warnblinken), Lautsprecher ('lautsprecher') pumpen im Takt, Stachelblock ('stachelblock_blau')
//   sunsetbeach   B-9 (5-1)   Sonnenuntergangs-Strand: Sand, tief stehende Abendsonne, Strandkorb ('strandkorb'), Sonnenschirm,
//                             Palmen ('palme'), ein Pilzlingsturm ('pilzlingsturm') mit Feuer-Werfer obenauf; die Brandung rollt je
//                             Zählzeit an, ein Wasserball hüpft im Takt
//   dayhive       B-10 (S-6)  Waben am Taghimmel: Wabenfeld (Instanzen, leuchten Ring für Ring im Takt), Wabensäulen ('wabensaeule'),
//                             Sonne und Wattewolken statt Weltraum
//   spotbridge    B-11 (8-1)  Stachelbrücke mit Suchscheinwerfer: Brücke über einen Graben, ein Suchscheinwerfer ('suchscheinwerfer')
//                             schwenkt seinen Lichtfleck – wo er die Brücke trifft, fahren Stacheln aus
//   bossdome      B-12        Boss-Marathon-Sternenkuppel: Kuppel mit Nachthimmel und Sternen, sechs Warp-Boxen ('warp_box' +
//                             'bossblitz_box_deko') im Kreis, goldene Schlüssel ('bossblitz_schluessel') kreisen, Würfelblase
//                             ('wuerfelblase') hüpft auf der Kuppel
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (Registry-Modelle in die Kachel 'w11:<Id>' mit
// Fern-Ausblendung), bewegte sind eigene Objekte (ev.updaters) mit Sichtprüfung, gleichartige als Instanzen.

import * as THREE from 'three';
import {
  registerKit, BONUS_KITS, Build, place, mix, TAU, cached, vcol, PI, FRONT, hash1, cullByView, instanced, setInst, addGeo, mover,
  addInfo, solidBox, solidCyl, haloSprite, beamGeo, beamMat, inView,
} from './bonuskit.js';
import { bakeModel } from './bake.js';
import { BEAT11, MK11, GLOW_TILE11, tulipGeo } from './blume11.js';

const MK = MK11;
const beatAt = (t) => BEAT11.at(t);
const glow = (ev, key, make, x, y, z, yaw = 0) => addGeo(ev, key, make, x, y, z, yaw, false, 'glow', GLOW_TILE11);
const pulse = (ev, key, make, x, y, z, yaw = 0) => addGeo(ev, key, make, x, y, z, yaw, false, 'bglow', GLOW_TILE11);
const modelsInfo = (ev) => addInfo(ev, () => MK.info());
const stepEase = (frac, share = 0.4) => { const u = Math.min(1, frac / share); return u * u * (3 - 2 * u); };
const _c = new THREE.Color();

export function decorateBlume(ev, kind, x, y, z) {
  switch (kind) {
    case 'sparkcircus': sparkCircus(ev, x, y, z); return true;
    case 'cubemine': cubeMine(ev, x, y, z); return true;
    case 'bunnysavanna': bunnySavanna(ev, x, y, z); return true;
    case 'torchcreek': torchCreek(ev, x, y, z); return true;
    case 'clockfort': clockFort(ev, x, y, z); return true;
    case 'graymansion': grayMansion(ev, x, y, z); return true;
    case 'cannonlagoon': cannonLagoon(ev, x, y, z); return true;
    case 'beepskyway': beepSkyway(ev, x, y, z); return true;
    case 'sunsetbeach': sunsetBeach(ev, x, y, z); return true;
    case 'dayhive': dayHive(ev, x, y, z); return true;
    case 'spotbridge': spotBridge(ev, x, y, z); return true;
    case 'bossdome': bossDome(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Hilfen

/** Scheibe (Sonne/Mond) zur Kamera gedreht mit weichem Schein. */
function skyDisc(ev, key, x, y, z, r, inner, outer, halo, haloSize, name) {
  glow(ev, key, () => { const b = new Build(); b.add(new THREE.CircleGeometry(r, 28), outer, { r: [-0.15, 0, 0] }); b.add(new THREE.CircleGeometry(r * 0.78, 28), inner, { p: [0, 0, 0.02], r: [-0.15, 0, 0] }); return b.geometry(); }, x, y, z);
  const h = haloSprite(ev, halo, haloSize, 0.5);
  h.position.set(x, y, z - 0.3);
  h.name = name;
  ev.view.add(h);
  return h;
}
/** Wattewolken (statisch) um (x, y, z). */
function puffClouds(ev, key, x, y, z, list) {
  addGeo(ev, key, () => {
    const b = new Build();
    for (const [cx, cy, cz, r] of list) b.sphere(r, { v: (px, py, pz, nx, ny) => mix(0xd8e4f8, 0xffffff, ny * 0.5 + 0.5) }, { p: [cx, cy, cz], s: [1.3, 0.72, 1] }, 9, 6);
    return b.geometry();
  }, x, y, z, 0, false);
}
/** Registry-Modell in Graustufen einbacken (B-6 Schwarz-Weiß). */
function bakeGray(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, maxTris = 6000) {
  if (!MK.has(name, opts, maxTris)) return false;
  const add = (g, o) => {
    const c = g.attributes.color;
    if (c) for (let i = 0; i < c.count; i++) { const l = c.getX(i) * 0.3 + c.getY(i) * 0.59 + c.getZ(i) * 0.11; c.setXYZ(i, l, l, l); }
    ev.addStatic(g, o?.material === 'glow' ? { ...o, castShadow: false, tile: GLOW_TILE11 } : { ...o, tile: `w11:${ev.id}`, lod: true });
  };
  const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state);
  if (ok) MK.used.add(name);
  return ok;
}

// ------------------------------------------------------------------ B-1 Zirkus mit Funken

function sparkCircus(ev, x, y, z) {
  if (!MK.bake(ev, 'zirkuszelt', { radius: 4.2, height: 5.2 }, [x, y, z - 1.5], 0, 1, null, true, 4600)) {
    addGeo(ev, 'w11m:tent', () => { const b = new Build(); b.cyl(4, 4.2, 2.4, (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 16) % 2 ? 0xff4a5a : 0xffffff), { p: [0, 1.2, 0] }, 16); b.cone(4.6, 2.8, (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 16) % 2 ? 0xff4a5a : 0xffffff), { p: [0, 3.8, 0] }, 16); return b.geometry(); }, x, y, z - 1.5);
  }
  solidCyl(ev, x, z - 1.5, 4.3, y, y + 5);
  // Schaltfelder 3 × 3 vor dem Zelt: Funkenflämmchen springt je Zählzeit aufs nächste und schaltet es um
  const tiles = [];
  const [t0x, t0z] = ev.def.tiles ?? [x + 2.2, z + 3.6];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tiles.push([t0x + c * 1.7, y + 0.02, t0z + r * 1.7]);
  const tg = cached('w11m:tile', () => { const b = new Build(); b.box(1.4, 0.14, 1.4, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xffffff : 0x8a8aa0) }, { p: [0, 0.07, 0] }, 0.04); return b.geometry(); });
  const tm = new THREE.InstancedMesh(tg, vcol(0.35, {}, 'w11tile'), tiles.length);
  tm.frustumCulled = false; tm.name = 'w11:schaltfelder';
  tiles.forEach(([tx, ty, tz], i) => setInst(tm, i, tx, ty, tz, 0, 1));
  tm.instanceMatrix.needsUpdate = true;
  ev.view.add(tm); ev.own.push(tm);
  const ON = new THREE.Color(0xffc82a), OFF = new THREE.Color(0x4a7ae8);
  const order = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  let at = 0, onCount = 0, hopK = 0;
  const spark = MK.live(ev, 'funkenflaemmchen', {}, tiles[0], 0, 1, (dt, t) => { const bt = beatAt(t); hopK = bt.frac; return { anim: 'hop', progress: bt.frac, height: 0.6 }; }, false, 6200, 50, true);
  ev.updaters.push((dt, t) => {
    if (!(tm.visible = inView(ev.view, t0x + 1.7, y, t0z + 1.7, 5, 60))) return;
    const bt = beatAt(t);
    at = ((bt.whole % 9) + 9) % 9;
    const cyc = Math.floor(bt.whole / 9);
    onCount = 0;
    order.forEach((ti, k) => { const on = (k <= at) !== (cyc % 2 === 1); if (on) onCount++; tm.setColorAt(ti, on ? ON : OFF); });
    if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
    if (spark) {
      const from = tiles[order[(at + 8) % 9]], to = tiles[order[at]];
      const e = stepEase(bt.frac, 0.5);
      spark.root.position.set(from[0] + (to[0] - from[0]) * e, y + 0.16 + Math.sin(Math.min(1, bt.frac / 0.5) * PI) * 0.6, from[2] + (to[2] - from[2]) * e);
    }
  });
  const [hx, hz] = ev.def.werfer ?? [x + 7.4, z - 1.5];
  MK.bake(ev, 'hammer_werfer', {}, [hx, y, hz], FRONT - 0.4, 1, { anim: 'idle' }, true, 9400);
  addGeo(ev, 'w11m:trampoline', () => { const b = new Build(); b.cyl(0.9, 1, 0.5, 0xff8a3a, { p: [0, 0.25, 0] }, 12); b.cyl(0.8, 0.8, 0.06, 0xffe07a, { p: [0, 0.52, 0] }, 12); return b.geometry(); }, hx + 1.2, y, hz + 2.4);
  solidCyl(ev, hx + 1.2, hz + 2.4, 1, y, y + 0.55);
  addInfo(ev, () => ({ sparkcircus: { tiles: tiles.length, at, on: onCount, spark: !!spark, hop: +hopK.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-2 Wasserwürfel-Mine

function cubeMine(ev, x, y, z) {
  if (!MK.bake(ev, 'schacht_geruest', { width: 4, depth: 3, height: 7 }, [x, y, z - 2], 0, 1, null, true, 6000)) {
    addGeo(ev, 'w11m:tower', () => { const b = new Build(); for (const [px, pz] of [[-1.5, -2], [1.5, -2], [-1.5, 2], [1.5, 2]]) b.box(0.3, 7, 0.3, 0x8a6a4a, { p: [px, 3.5, pz] }, 0.04); b.box(3.4, 0.3, 4.4, 0x6a4a3a, { p: [0, 7, 0] }, 0.04); return b.geometry(); }, x, y, z - 2);
  }
  solidBox(ev, x - 1.7, y, z - 4.2, x + 1.7, y + 7, z + 0.2, 'geruest');
  addGeo(ev, 'w11m:minecart', () => { const b = new Build(); b.box(1.6, 0.9, 1.1, 0x6a5a5a, { p: [0, 0.75, 0] }, 0.08); for (const s of [-1, 1]) for (const t of [-1, 1]) b.cyl(0.22, 0.22, 0.1, 0x3a3a3a, { p: [s * 0.55, 0.25, t * 0.58], r: [PI / 2, 0, 0] }, 8); b.box(4, 0.06, 0.1, 0x8a8a8a, { p: [0.8, 0.03, 0.42] }, 0); b.box(4, 0.06, 0.1, 0x8a8a8a, { p: [0.8, 0.03, -0.42] }, 0); return b.geometry(); }, x + 4, y, z + 2);
  glow(ev, 'w11m:crystals', () => { const b = new Build(); for (let i = 0; i < 4; i++) b.cone(0.16, 0.6, [0x7ae8ff, 0xff9ae8, 0xb4a0ff, 0x9affc8][i], { p: [-0.4 + i * 0.26, 1.3, (i % 2) * 0.2 - 0.1], r: [0, 0, (i - 1.5) * 0.25] }, 4); return b.geometry(); }, x + 4, y, z + 2);
  solidBox(ev, x + 3.1, y, z + 1.4, x + 4.9, y + 1.2, z + 2.6, 'lore');
  // schwebende Wasserwürfel (statt Kippplattformen) wippen auf und ab
  const cubes = ev.def.cubes ?? [[x - 5.5, y + 2.2, z + 1], [x - 3, y + 3.4, z - 3], [x + 5.5, y + 3, z - 2.5]];
  const cm = [];
  for (const [cx, cy, cz] of cubes) {
    const m = MK.live(ev, 'wasserkoerper', { size: 1.8 }, [cx, cy, cz], 0, 1, 'idle', false, 3000, 55);
    if (m) cm.push({ m, cy });
    else { const own = mover(ev, cached('w11m:cube', () => { const b = new Build(); b.box(1.8, 1.8, 1.8, 0x5ac8ff, { p: [0, 0.9, 0] }, 0.2); return b.geometry(); }), cx, cy, cz, 'w11:wasserwuerfel', false, new THREE.MeshStandardMaterial({ color: 0x6ad0ff, transparent: true, opacity: 0.7, roughness: 0.1 })); cm.push({ m: { root: own }, cy }); }
  }
  let bob = 0;
  ev.updaters.push((dt, t) => { const bt = beatAt(t); cm.forEach((c, i) => { bob = Math.sin((bt.beat + i * 1.3) * PI * 0.5) * 0.35; c.m.root.position.y = c.cy + bob; }); });
  // zwei Wuschel-Horden (Remix: die zweite kurz vor dem Ende)
  let hordes = 0;
  for (const [hx, hz, yaw] of ev.def.hordes ?? [[x - 4.5, z + 5.5, 0.3], [x + 7, z + 5.5, -0.5]]) if (MK.bake(ev, 'wuschel_horde', { count: 16, width: 2.6, depth: 1.6 }, [hx, y, hz], yaw, 1, { anim: 'idle' }, true, 15000)) hordes++;
  addInfo(ev, () => ({ cubemine: { cubes: cm.length, bob: +bob.toFixed(3), hordes } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-5 Savanne am Morgen mit Hasen

function bunnyGeo() {
  return cached('w11m:bunny', () => {
    const b = new Build();
    b.sphere(0.3, 0xd8a868, { p: [0, 0.3, 0], s: [1.3, 1, 1] }, 8, 6);
    b.sphere(0.2, 0xe0b478, { p: [0.32, 0.52, 0] }, 7, 5);
    for (const s of [-1, 1]) b.sphere(0.07, 0xe0b478, { p: [0.3, 0.82, s * 0.08], s: [0.8, 3, 0.5] }, 5, 3);
    b.sphere(0.1, 0xffffff, { p: [-0.36, 0.38, 0] }, 5, 3);
    b.sphere(0.12, 0xfff0e0, { p: [0.15, 0.22, 0], s: [1, 0.8, 1.2] }, 5, 3);
    return b.geometry();
  });
}
function bunnySavanna(ev, x, y, z) {
  // Morgensonne (rosa-orange, tief im Osten)
  const [sx, sy, sz] = ev.def.sun ?? [x + 9, y + 5.5, z - 7];
  skyDisc(ev, 'w11m:morningsun', sx, sy, sz, 2.6, 0xffd0b0, 0xff9a8a, 0xffb0a0, 13, 'w11:morgensonne');
  // Schirmakazien und Steppengras
  let acc = 0;
  for (const [ax, az, h] of ev.def.acacias ?? [[x - 6, z - 2, 4.6], [x + 5, z - 4, 5.2]]) {
    if (MK.bake(ev, 'akazie', { height: h, radius: 2.6 }, [ax, y, az], hash1(ax) * TAU, 1, { sway: 0.3 }, true, 6400)) acc++;
    else addGeo(ev, `w11m:acacia:${h}`, () => { const b = new Build(); b.cyl(0.18, 0.26, h * 0.8, 0x8a5a3a, { p: [0, h * 0.4, 0] }, 6); b.sphere(2.4, 0x6aa84a, { p: [0, h, 0], s: [1, 0.28, 1] }, 10, 5); return b.geometry(); }, ax, y, az);
    solidCyl(ev, ax, az, 0.4, y, y + h * 0.8);
  }
  addGeo(ev, 'w11m:grass', () => { const b = new Build(); for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 2 + (i % 5) * 1.4; b.cone(0.12, 0.7, { v: (px, py) => mix(0xb8a04a, 0xe8d88a, py + 0.5) }, { p: [Math.cos(a) * r, 0.35, Math.sin(a) * r] }, 4); } return b.geometry(); }, x, y, z);
  // Riesenhase (Registry, dreifach) hüpft vorn hin und her
  const [gx, gz] = ev.def.giant ?? [x - 1, z + 3.5];
  let gHop = 0;
  const giant = MK.live(ev, 'bunny_small', {}, [gx, y, gz], 0, 3, (dt, t) => { gHop = (t % 0.9) / 0.9; return { anim: 'hop', progress: gHop }; }, true, 5600, 55, true);
  if (giant) ev.updaters.push((dt, t) => { const s = Math.sin(t * 0.45); giant.root.position.x = gx + s * 3; giant.root.position.y = y + Math.sin(gHop * PI) * 0.6; giant.root.rotation.y = Math.cos(t * 0.45) > 0 ? 0 : PI; });
  // Hasenschar (Instanzen): hüpfen je Zählzeit, eine Gruppe nach der anderen
  const n = 9;
  const bm = instanced(ev, bunnyGeo(), n, { name: 'w11:hasen', key: 'w11bunny', rough: 0.6, shadow: false });
  const spots = [];
  for (let i = 0; i < n; i++) spots.push([x - 8 + (i % 5) * 4 + hash1(i) * 1.5, z + 1 + Math.floor(i / 5) * 4 - hash1(i + 7) * 2, hash1(i * 3) * TAU]);
  let hops = 0;
  ev.updaters.push((dt, t) => {
    if (!(bm.visible = inView(ev.view, x, y + 1, z + 2, 10, 60))) return;
    const bt = beatAt(t);
    hops = bt.whole;
    spots.forEach(([bx, bz, yaw], i) => {
      const mine = i % 3 === ((bt.whole % 3) + 3) % 3;
      const hh = mine ? Math.sin(Math.min(1, bt.frac / 0.6) * PI) * 0.5 : 0;
      setInst(bm, i, bx + Math.cos(yaw + t * 0.1) * 0.6, y + hh, bz + Math.sin(yaw + t * 0.1) * 0.6, yaw + t * 0.1 + PI / 2, 1);
    });
    bm.instanceMatrix.needsUpdate = true;
  });
  // Wolkenlifte schweben
  const lifts = [];
  for (const [lx, ly, lz] of ev.def.lifts ?? [[x - 7, y + 3, z - 6], [x + 1, y + 4.5, z - 7.5]]) {
    const m = MK.live(ev, 'wolkenlift', { width: 2.6 }, [lx, ly, lz], 0, 1, 'idle', false, 3000, 60);
    if (m) lifts.push({ m, ly });
  }
  ev.updaters.push((dt, t) => lifts.forEach((l, i) => { l.m.root.position.y = l.ly + Math.sin(t * 0.8 + i * 2) * 0.6; }));
  addInfo(ev, () => ({ savanna: { acacias: acc, giant: !!giant, bunnies: n, hops, lifts: lifts.length } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-3 Fackeln bei Nacht

function torchCreek(ev, x, y, z) {
  const [mx, my, mz] = ev.def.moon ?? [x - 6, y + 10, z - 6];
  if (!MK.bake(ev, 'mond_gesicht', { size: 2.2, fog: true }, [mx, my, mz], -PI / 2 + 0.3, 1, null, false, 5000)) glow(ev, 'w11m:moon', () => { const b = new Build(); b.add(new THREE.CircleGeometry(2.2, 24), 0xfff2c8, { r: [-0.3, 0, 0] }); return b.geometry(); }, mx, my, mz);
  const mh = haloSprite(ev, 0x9ab0ff, 10, 0.45);
  mh.position.set(mx, my, mz - 0.4);
  mh.name = 'w11:mondschein';
  ev.view.add(mh);
  // Giftwasser-Bach mit Rankenschnapper
  const [px, pz] = ev.def.pond ?? [x + 1, z - 2.5];
  if (!MK.bake(ev, 'giftwasser', { size: [7, 4], bubbles: 8 }, [px, y + 0.05, pz], 0, 1, null, false, 4000)) {
    ev.addStatic(place(cached('w11m:poison', () => { const b = new Build(); b.add(new THREE.PlaneGeometry(7, 4).rotateX(-PI / 2), 0x9a4ad0, {}); return b.geometry(); }).clone(), px, y + 0.05, pz), { material: 'stone', castShadow: false });
  }
  solidBox(ev, px - 3.6, y, pz - 2.1, px + 3.6, y + 0.7, pz + 2.1, 'giftwasser');
  MK.bake(ev, 'rankenschnapper', { segments: 8 }, [px + 3.5, y, pz - 1.6], PI - 0.4, 1, { anim: 'idle' }, true, 9000);
  // drei Fackel-Gruppen (3 + 3 + 3): je Zählzeit entzündet sich die nächste, nach neun alle aus und von vorn
  const torches = ev.def.torches ?? [
    [x - 7, z + 3], [x - 5.5, z + 4.5], [x - 4, z + 3],
    [x - 1.5, z - 6], [x + 1.5, z - 6.5], [x + 4.5, z - 6],
    [x + 6, z + 3], [x + 7.5, z + 1], [x + 6.5, z - 1.5],
  ];
  const stand = cached('w11m:torchstand', () => { const b = new Build(); b.cyl(0.07, 0.1, 1.5, 0x5a4030, { p: [0, 0.75, 0] }, 6); b.cyl(0.22, 0.12, 0.25, 0x3a2a2a, { p: [0, 1.6, 0] }, 8); return b.geometry(); });
  for (const [tx, tz] of torches) { ev.addStatic(place(stand.clone(), tx, y, tz), { castShadow: true }); solidCyl(ev, tx, tz, 0.2, y, y + 1.7); }
  const fl = cached('w11m:flame', () => { const b = new Build(); b.cone(0.18, 0.55, 0xffa030, { p: [0, 0.27, 0] }, 7); b.cone(0.1, 0.34, 0xfff0a0, { p: [0, 0.2, 0.02] }, 6); return b.geometry(); });
  const fm = new THREE.InstancedMesh(fl, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }), torches.length);
  ev.own.push(fm.material);
  fm.frustumCulled = false; fm.name = 'w11:fackelflammen';
  ev.view.add(fm); ev.own.push(fm);
  let lit = 0;
  ev.updaters.push((dt, t) => {
    if (!(fm.visible = inView(ev.view, x, y + 1, z, 9, 60))) return;
    const bt = beatAt(t);
    lit = ((bt.whole % 10) + 10) % 10;   // 0 … 9 Fackeln brennen
    torches.forEach(([tx, tz], i) => { const on = i < lit; const k = on ? 1 + Math.sin(t * 13 + i) * 0.1 : 0.001; setInst(fm, i, tx, y + 1.72, tz, 0, [k, k * (1 + Math.sin(t * 9 + i) * 0.12), k]); });
    fm.instanceMatrix.needsUpdate = true;
  });
  addInfo(ev, () => ({ torches: { n: torches.length, lit, groups: 3 } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-4 Werferburg mit großer Uhr

function clockFort(ev, x, y, z) {
  // Mauer mit Zinnen zwischen zwei blauen Türmen, darauf das große Zifferblatt
  addGeo(ev, 'w11m:fortwall', () => {
    const b = new Build();
    b.box(9, 4.2, 1.4, { v: (px, py, pz, nx, ny) => mix(0x3a4a7a, 0x6a7ab0, ny * 0.3 + 0.5 + Math.sin(px * 2.1 + py * 3) * 0.05) }, { p: [0, 2.1, 0] }, 0.06);
    for (let i = 0; i < 7; i++) b.box(0.8, 0.7, 1.4, 0x5a6aa0, { p: [-3.9 + i * 1.3, 4.55, 0] }, 0.05);
    b.box(1.8, 2.4, 0.2, 0x2a2a4a, { p: [0, 1.2, 0.72] }, 0.04);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 4.6, y, z - 0.8, x + 4.6, y + 4.9, z + 0.8, 'mauer');
  let towers = 0;
  for (const s of [-1, 1]) {
    if (MK.bake(ev, 'festungsturm', { height: 6, radius: 1.6, color: 'blau' }, [x + s * 5.6, y, z], 0, 1, null, true, 6000)) towers++;
    else addGeo(ev, 'w11m:tower', () => { const b = new Build(); b.cyl(1.6, 1.7, 6, 0x4a5a8a, { p: [0, 3, 0] }, 12); b.cone(2, 2.4, 0x3a5ad8, { p: [0, 7.2, 0] }, 12); return b.geometry(); }, x + s * 5.6, y, z);
    solidCyl(ev, x + s * 5.6, z, 1.8, y, y + 8);
  }
  // großes Zifferblatt (vorn an der Mauer) und Zeiger: springt je Zählzeit eine Sekunde weiter
  glow(ev, 'w11m:clockface', () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(1.7, 32), 0xfff8e8, {});
    b.add(new THREE.RingGeometry(1.7, 1.9, 32), 0xffc83a, { p: [0, 0, 0.01] });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.add(new THREE.PlaneGeometry(i % 3 ? 0.08 : 0.16, 0.32), 0x3a2a3a, { p: [Math.sin(a) * 1.4, Math.cos(a) * 1.4, 0.02], r: [0, 0, -a] }); }
    return b.geometry();
  }, x, y + 2.9, z + 0.75);
  const hand = mover(ev, cached('w11m:hand', () => { const b = new Build(); b.box(0.12, 1.35, 0.05, 0xe8302a, { p: [0, 0.6, 0] }, 0.02); b.cyl(0.14, 0.14, 0.08, 0x3a2a3a, { r: [PI / 2, 0, 0] }, 10); return b.geometry(); }), x, y + 2.9, z + 0.82, 'w11:uhrzeiger', false);
  let tick = 0;
  ev.updaters.push((dt, t) => { const bt = beatAt(t); tick = ((bt.whole % 30) + 30) % 30; hand.rotation.z = -((tick + stepEase(bt.frac, 0.18)) / 30) * TAU; });
  cullByView(ev, hand, x, y + 2.9, z, 2.5, 60);
  // „30“ unter der Uhr (Zeitdruck-Remix)
  MK.bake(ev, 'feuer_werfer', {}, [x - 2.6, y + 4.2, z], FRONT, 1, { anim: 'idle' }, true, 9400);
  addInfo(ev, () => ({ clockfort: { towers, tick, seconds: 30 - tick } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-6 Spukhaus in Schwarz-Weiß

function grayMansion(ev, x, y, z) {
  addGeo(ev, 'w11m:graymansion', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx) => mix(0x5a5a5a, 0x8a8a8a, (py + 2.4) / 4.8 * 0.6 + Math.abs(nx) * -0.1 + 0.3) };
    b.box(8, 4.8, 4.6, wall, { p: [0, 2.4, 0] }, 0.1);
    b.box(3.2, 3.2, 3.2, wall, { p: [-2.4, 6.4, 0] }, 0.08);
    const roof = new THREE.Shape(); roof.moveTo(-4.4, 0); roof.lineTo(0, 2.4); roof.lineTo(4.4, 0); roof.lineTo(-4.4, 0);
    b.extrude(roof, 5, { v: (px, py) => mix(0x2a2a2a, 0x4a4a4a, py / 2.4) }, { p: [0.6, 4.78, 0] }, 0.08, 1);
    b.cone(2.4, 2.4, 0x3a3a3a, { p: [-2.4, 9.1, 0] }, 4);
    const door = new THREE.Shape(); door.moveTo(-0.7, 0); door.lineTo(-0.7, 1.7); door.absarc(0, 1.7, 0.7, PI, 0, true); door.lineTo(0.7, 0); door.lineTo(-0.7, 0);
    b.extrude(door, 0.12, 0x1a1a1a, { p: [0, 0, 2.32] }, 0.03, 10);
    for (const [wx, wy] of [[-2.6, 3.2], [2.6, 3.2], [-2.4, 6.5]]) b.box(0.9, 1.1, 0.06, 0x2a2a2a, { p: [wx, wy, 2.32] }, 0.02);
    return b.geometry();
  }, x, y, z);
  pulse(ev, 'w11m:graywin', () => { const b = new Build(); for (const [wx, wy] of [[-2.6, 3.2], [2.6, 3.2], [-2.4, 6.5]]) b.box(0.7, 0.9, 0.04, 0xf0f0f0, { p: [wx, wy, 2.36] }, 0); return b.geometry(); }, x, y, z);
  solidBox(ev, x - 4.1, y, z - 2.4, x + 4.1, y + 5.4, z + 2.4, 'spukhaus');
  // Spuke und falsche Zielmasten in Grau
  let ghosts = 0, poles = 0;
  for (const [gx, gy, gz, s] of ev.def.ghosts ?? [[x - 5.6, y + 1.4, z + 2.5, 1], [x + 5.8, y + 2.2, z + 1, 0.8]]) if (bakeGray(ev, 'spuk', { size: s }, [gx, gy, gz], FRONT + 0.3, 1, { anim: 'idle' }, 6000)) ghosts++;
  for (const [px, pz] of ev.def.poles ?? [[x + 7, z + 4.5], [x - 7.2, z - 1]]) { if (bakeGray(ev, 'zielmast_spuk', { height: 4.5 }, [px, y, pz], FRONT, 1, { anim: 'idle' }, 4000)) poles++; solidCyl(ev, px, pz, 0.6, y, y + 1.2); }
  // grauer Großspuk schwebt um das Haus (eigene Figur, Graustufen)
  const big = mover(ev, cached('w11m:bigboo', () => {
    const b = new Build();
    b.sphere(1.1, { v: (px, py, pz, nx, ny) => mix(0xb8b8b8, 0xf4f4f4, ny * 0.5 + 0.5) }, { p: [0, 1.1, 0], s: [1, 1.05, 1] }, 12, 9);
    b.cone(0.4, 0.9, 0xe0e0e0, { p: [-1, 0.6, 0], r: [0, 0, 1.2] }, 6);
    for (const s of [-1, 1]) b.sphere(0.16, 0x1a1a1a, { p: [0.95, 1.35, s * 0.32], s: [0.5, 1.2, 1] }, 6, 4);
    b.sphere(0.3, 0x2a2a2a, { p: [0.98, 0.85, 0], s: [0.4, 0.6, 1.2] }, 6, 4);
    return b.geometry();
  }), x, y + 4, z + 3, 'w11:grossspuk', false, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.88, roughness: 0.6 }));
  ev.own.push(big.material);
  let ba = 0;
  ev.updaters.push((dt, t) => { ba = t * 0.4; big.position.set(x + Math.cos(ba) * 6.5, y + 3.2 + Math.sin(t * 1.3) * 0.5, z + 2 + Math.sin(ba) * 3); big.rotation.y = -ba - PI / 2; });
  cullByView(ev, big, x, y + 3, z + 2, 9, 60);
  addInfo(ev, () => ({ graymansion: { ghosts, poles, boo: +ba.toFixed(3), gray: true } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-7 Lagune mit Kanonen-Helm

function cannonLagoon(ev, x, y, z) {
  const R = ev.def.lagoon ?? 4.4;
  ev.addStatic(place(cached(`w11m:lagoon:${R}`, () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(R, 30).rotateX(-PI / 2), { v: (px, py, pz) => mix(0x1ab8c8, 0x7ae8e8, Math.hypot(px, pz) / R) }, { p: [0, 0.03, 0] });
    return b.geometry();
  }).clone(), x, y, z), { material: 'stone', castShadow: false });
  addGeo(ev, `w11m:lagoonrim:${R}`, () => {
    const b = new Build();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; b.sphere(0.45, { v: (px, py, pz, nx, ny) => mix(0xc8b89a, 0xf0e4c8, ny * 0.5 + 0.5) }, { p: [Math.cos(a) * (R + 0.25), 0.12, Math.sin(a) * (R + 0.25)], s: [1.3, 0.5, 1.1] }, 6, 4); }
    // grüne Röhren am Rand
    for (const [px, pz, h] of [[-R - 1.5, -1.5, 1.6], [R + 1.4, -2, 2.2]]) { b.cyl(0.6, 0.6, h, 0x2ec85a, { p: [px, h / 2, pz] }, 12); b.cyl(0.72, 0.72, 0.4, 0x3ae86a, { p: [px, h + 0.1, pz] }, 12); }
    return b.geometry();
  }, x, y, z);
  solidCyl(ev, x, z, R + 0.5, y, y + 0.6, 'lagune');
  for (const [px, pz] of [[-R - 1.5, -1.5], [R + 1.4, -2]]) solidCyl(ev, x + px, z + pz, 0.75, y, y + 2.4);
  // Kanonen-Helm dreht sich auf der linken Röhre
  let helmA = 0;
  const helm = MK.live(ev, 'helm_kanone', {}, [x - R - 1.5, y + 1.95, z - 1.5], 0, 1.3, 'idle', true, 3000, 55);
  if (helm) ev.updaters.push((dt, t) => { helmA = t * 0.8; helm.root.rotation.y = helmA; });
  // Rammfisch springt im Bogen aus der Lagune (je zwei Takte ein Sprung)
  let jumpU = 0;
  const fish = MK.live(ev, 'rammfisch', {}, [x, y, z], 0, 0.8, 'swim', false, 8000, 55, true);
  ev.updaters.push((dt, t) => {
    if (!fish) return;
    const bt = beatAt(t);
    jumpU = ((bt.beat % 8) + 8) % 8 / 8;
    const u = Math.min(1, jumpU / 0.4);
    fish.root.visible = fish.root.visible && jumpU < 0.4;
    const ang = u * PI;
    fish.root.position.set(x - 2.4 + u * 4.8, y - 0.5 + Math.sin(ang) * 2.6, z);
    fish.root.rotation.set(0, 0, Math.cos(ang) * 0.9);
  });
  // Felsblockwand hinter der Lagune
  const rock = MK.bake(ev, 'felsblock_riss', { size: [2.6, 2, 1.6] }, [x + 1, y, z - R - 1.6], FRONT, 1, { break: 0 }, true, 11000);
  solidBox(ev, x - 0.4, y, z - R - 2.5, x + 2.4, y + 2, z - R - 0.7, 'felsblock');
  addInfo(ev, () => ({ lagoon: { helm: !!helm, helmA: +helmA.toFixed(3), fish: !!fish, jump: +jumpU.toFixed(3), rock } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-8 Piep-Block-Himmelsweg

function beepSkyway(ev, x, y, z) {
  // zwei Sätze Piep-Blöcke (rot/blau) – Remix: Wechsel JE Zählzeit (Welt 4: alle vier), kein Warnblinken
  const setA = ev.def.beepA ?? [[x - 6, y + 0.5, z + 2], [x - 4, y + 1.5, z], [x - 2, y + 2.5, z - 2], [x, y + 3.5, z - 4]];
  const setB = ev.def.beepB ?? [[x - 5, y + 1, z + 1], [x - 3, y + 2, z - 1], [x - 1, y + 3, z - 3], [x + 1, y + 4, z - 5]];
  const blockGeo = (c) => cached(`w11m:beep:${c}`, () => { const b = new Build(); b.box(1, 1, 1, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? mix(c, 0xffffff, 0.35) : c) }, {}, 0.08); b.torus(0.25, 0.04, 0xffffff, { p: [0, 0, 0.51] }, 4, 12, PI); return b.geometry(); });
  const ma = new THREE.InstancedMesh(blockGeo(0xff3a7a), vcol(0.3, {}, 'w11beep'), setA.length);
  const mb = new THREE.InstancedMesh(blockGeo(0x3a6ae8), vcol(0.3, {}, 'w11beep'), setB.length);
  for (const [m, n] of [[ma, 'a'], [mb, 'b']]) { m.frustumCulled = false; m.name = `w11:piepbloecke-${n}`; ev.view.add(m); ev.own.push(m); }
  let active = 'a', flips = 0, last = null;
  ev.updaters.push((dt, t) => {
    const vis = inView(ev.view, x - 2, y + 2, z - 1, 7, 60);
    ma.visible = mb.visible = vis;
    const bt = beatAt(t);
    active = (bt.whole & 1) ? 'b' : 'a';
    if (active !== last) { flips++; last = active; }
    if (!vis) return;
    const pop = 1 - Math.exp(-14 * bt.frac);
    setA.forEach(([bx, by, bz], i) => setInst(ma, i, bx, by, bz, 0, active === 'a' ? 0.4 + 0.6 * pop : 0.001));
    setB.forEach(([bx, by, bz], i) => setInst(mb, i, bx, by, bz, 0, active === 'b' ? 0.4 + 0.6 * pop : 0.001));
    ma.instanceMatrix.needsUpdate = true; mb.instanceMatrix.needsUpdate = true;
  });
  // Lautsprecher pumpen im Takt
  const speakers = [];
  for (const [sx, sz, yaw] of ev.def.speakers ?? [[x + 4.5, z - 3, -PI / 2 - 0.3], [x + 6.5, z + 1.5, -PI / 2 - 0.6]]) {
    const m = MK.live(ev, 'lautsprecher', { height: 2 }, [sx, y, sz], yaw, 1, (dt, t) => ({ beat: beatAt(t).k > 0.85 ? 1 : 0 }), true, 3000, 55);
    if (m) speakers.push(m);
    solidCyl(ev, sx, sz, 0.7, y, y + 2);
  }
  MK.bake(ev, 'stachelblock_blau', { size: 1, faces: 'alle' }, [x + 2.5, y, z + 3.5], 0, 1, null, true, 6000);
  solidBox(ev, x + 2, y, z + 3, x + 3, y + 1, z + 4, 'stachelblock');
  // Gleitblätter schweben
  const leaves = [];
  for (const [lx, ly, lz] of [[x - 3, y + 5, z - 5], [x + 2, y + 5.5, z - 6]]) { const m = MK.live(ev, 'powerup_gleitblatt', {}, [lx, ly, lz], 0, 1.4, 'idle', false, 1200, 55); if (m) leaves.push({ m, ly }); }
  ev.updaters.push((dt, t) => leaves.forEach((l, i) => { l.m.root.position.y = l.ly + Math.sin(t * 1.5 + i) * 0.3; l.m.root.rotation.y = t + i; }));
  addInfo(ev, () => ({ beep: { active, flips, speakers: speakers.length, every: 1, warn: false, a: setA.length, b: setB.length } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-9 Sonnenuntergangs-Strand

function sunsetBeach(ev, x, y, z) {
  const [sx, sy, sz] = ev.def.sun ?? [x - 8, y + 4.5, z - 8];
  skyDisc(ev, 'w11m:sunsetsun', sx, sy, sz, 3.2, 0xffd080, 0xff7a4a, 0xff8a5a, 16, 'w11:abendsonne');
  // Sandfläche und Wellenkante
  ev.addStatic(place(cached('w11m:beachsand', () => { const b = new Build(); b.add(new THREE.CircleGeometry(6.5, 24).rotateX(-PI / 2), { v: (px, py, pz) => mix(0xf4d898, 0xfff0c8, Math.hypot(px, pz) / 6.5) }, { s: [1.3, 1, 0.8] }); return b.geometry(); }).clone(), x, y + 0.02, z), { castShadow: false });
  // Brandung: rollt je Zählzeit an den Strand (eigenes Mesh, unbeleuchtet)
  const surfM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: true, depthWrite: false });
  ev.own.push(surfM);
  const surf = new THREE.Mesh(cached('w11m:surf2', () => new THREE.RingGeometry(6.3, 6.9, 24, 1, PI * 1.1, PI * 0.8).rotateX(-PI / 2)), surfM);
  surf.position.set(x, y + 0.03, z);
  surf.name = 'w11:brandung';
  ev.view.add(surf);
  cullByView(ev, surf, x, y, z, 8, 70);
  // Wasserball hüpft im Takt über den Sand
  const ball = mover(ev, cached('w11m:beachball', () => {
    const b = new Build();
    b.sphere(0.42, { v: (px, py, pz) => { const a = Math.atan2(pz, px); const k = Math.floor(((a + PI) / TAU) * 6); return py > 0.36 || py < -0.36 ? 0xffffff : [0xff4a4a, 0xffffff, 0x3a8aff, 0xffffff, 0xffd02a, 0xffffff][k % 6]; } }, {}, 14, 10);
    return b.geometry();
  }), x - 2, y + 0.42, z + 2.5, 'w11:wasserball');
  cullByView(ev, ball, x - 2, y + 1, z + 2.5, 3, 60);
  let wave = 0, bounce = 0;
  ev.updaters.push((dt, t) => {
    const bt = beatAt(t);
    wave = bt.frac;
    const s = 0.94 + 0.1 * wave;
    surf.scale.set(1.3 * s, 1, 0.8 * s);
    surfM.opacity = 0.9 - 0.6 * wave;
    bounce = Math.sin(bt.frac * PI);
    const bar = Math.floor(bt.beat / 4);
    ball.position.set(x - 2 + Math.sin(bar * 1.7) * 1.2, y + 0.42 + bounce * 1.1, z + 2.5 + Math.cos(bar * 1.3) * 0.8);
    ball.rotation.set(t * 1.3, t * 0.7, 0);
  });
  if (MK.bake(ev, 'strandkorb', { color: 'rot' }, [x + 4, y, z + 1.5], FRONT - 0.5, 1, null, true, 4600)) solidBox(ev, x + 3.2, y, z + 0.7, x + 4.8, y + 1.8, z + 2.3, 'strandkorb');
  MK.bake(ev, 'sonnenschirm', { color: 'gelb', height: 2.6 }, [x + 6, y, z - 1], 0, 1, null, true, 2600);
  solidCyl(ev, x + 6, z - 1, 0.2, y, y + 2.4);
  for (const [px, pz, h] of [[x - 5.5, z - 1.5, 5.2], [x - 7.5, z + 2, 4.4]]) { MK.bake(ev, 'palme', { height: h }, [px, y, pz], hash1(px) * TAU, 1, null, true, 2000); solidCyl(ev, px, pz, 0.35, y, y + h); }
  // Pilzlingsturm mit Feuer-Werfer obenauf (Remix)
  const [tx, tz] = ev.def.tower ?? [x, z - 3];
  let th = 0;
  if (MK.bake(ev, 'pilzlingsturm', { count: 4 }, [tx, y, tz], FRONT, 1, { anim: 'idle' }, true, 17000)) th = 2.5;
  else addGeo(ev, 'w11m:pilzlingtower', () => { const b = new Build(); for (let i = 0; i < 4; i++) { b.cyl(0.32, 0.36, 0.4, 0xf0d8b0, { p: [0, i * 0.62 + 0.2, 0] }, 8); b.dome(0.48, 0xc86a3a, { p: [0, i * 0.62 + 0.4, 0], s: [1, 0.6, 1] }, PI / 2, 9, 3); } return b.geometry(); }, tx, y, tz);
  th = th || 2.5;
  MK.bake(ev, 'feuer_werfer', {}, [tx, y + th, tz], FRONT, 1, { anim: 'idle' }, true, 9400);
  solidCyl(ev, tx, tz, 0.55, y, y + th + 1.4);
  addInfo(ev, () => ({ beach: { tower: th, sunset: true, wave: +wave.toFixed(3), ball: +bounce.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-10 Waben am Taghimmel

function dayHive(ev, x, y, z) {
  const [sx, sy, sz] = ev.def.sun ?? [x + 6, y + 9, z - 7];
  skyDisc(ev, 'w11m:daysun', sx, sy, sz, 1.9, 0xfff8c0, 0xffe07a, 0xfff0a0, 11, 'w11:tagsonne');
  puffClouds(ev, 'w11m:hiveclouds', x, y + 6.5, z - 5, [[-4, 0, 0, 1.4], [-2.6, 0.3, 0.2, 1.1], [4, -0.6, 0.4, 1.3], [5.4, -0.4, 0, 1.0], [0.5, 1.4, -1.2, 1.0]]);
  // Wabenfeld (19 Sechsecke), Ringe leuchten je Zählzeit nacheinander auf
  const R = 0.95, D = Math.sqrt(3) * R;
  const cells = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { const s = -q - r; if (Math.abs(s) > 2) continue; cells.push({ x: x + D * (q + r / 2), z: z + 1.5 * R * r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) }); }
  const hg = cached('w11m:hex', () => { const b = new Build(); b.cyl(R * 0.92, R * 0.92, 0.3, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xffc83a : 0xb07a2a) }, { p: [0, 0.15, 0], r: [0, PI / 6, 0] }, 6); return b.geometry(); });
  const hm = new THREE.InstancedMesh(hg, vcol(0.35, {}, 'w11hex'), cells.length);
  hm.frustumCulled = false; hm.name = 'w11:waben';
  cells.forEach((c, i) => setInst(hm, i, c.x, y, c.z, 0, 1));
  hm.instanceMatrix.needsUpdate = true;
  ev.view.add(hm); ev.own.push(hm);
  const base = new THREE.Color(0xffffff), lit = new THREE.Color(0xfff8c0);
  let ringLit = 0;
  ev.updaters.push((dt, t) => {
    if (!(hm.visible = inView(ev.view, x, y, z, 6, 60))) return;
    const bt = beatAt(t);
    ringLit = ((bt.whole % 3) + 3) % 3;
    cells.forEach((c, i) => hm.setColorAt(i, _c.copy(base).lerp(lit, c.ring === ringLit ? bt.k : 0).multiplyScalar(c.ring === ringLit ? 1 + bt.k * 0.4 : 0.85)));
    if (hm.instanceColor) hm.instanceColor.needsUpdate = true;
  });
  solidCyl(ev, x, z, 4.2, y, y + 0.3, 'waben');
  let pillars = 0;
  for (const [px, pz, h] of ev.def.pillars ?? [[x - 6, z - 3, 5], [x + 6.5, z + 1, 3.6]]) { if (MK.bake(ev, 'wabensaeule', { height: h, kind: 'normal' }, [px, y, pz], 0, 1, null, true, 3400)) pillars++; solidCyl(ev, px, pz, 1.1, y, y + h); }
  addInfo(ev, () => ({ dayhive: { cells: cells.length, ring: ringLit, pillars } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-11 Stachelbrücke mit Suchscheinwerfer

function spotBridge(ev, x, y, z) {
  // Graben (dunkle Spalte) und eine blaue Steinbrücke darüber
  ev.addStatic(place(cached('w11m:gap', () => { const b = new Build(); b.add(new THREE.PlaneGeometry(10, 2.6).rotateX(-PI / 2), 0x1a1830, {}); return b.geometry(); }).clone(), x, y + 0.02, z), { castShadow: false });
  addGeo(ev, 'w11m:spikebridge', () => {
    const b = new Build();
    b.box(2.4, 0.4, 3.4, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0x6a8ae8 : 0x3a4a9a) }, { p: [0, 0.2, 0] }, 0.05);
    for (const s of [-1, 1]) b.box(0.2, 0.5, 3.4, 0xd8e0ff, { p: [s * 1.2, 0.45, 0] }, 0.04);
    return b.geometry();
  }, x, y, z);
  // Stacheln (Instanzen) fahren aus, wenn der Lichtfleck die Brücke trifft
  const spikes = [];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) spikes.push([x - 0.6 + k * 1.2, z - 1.2 + i * 0.8]);
  const sg = cached('w11m:spike', () => { const b = new Build(); b.cone(0.16, 0.6, { v: (px, py) => mix(0x8a94a8, 0xf4f6fa, py + 0.5) }, { p: [0, 0.3, 0] }, 6); return b.geometry(); });
  const sm = instanced(ev, sg, spikes.length, { name: 'w11:stacheln', key: 'w11spike', rough: 0.3 });
  // Suchscheinwerfer auf einem Mast, Lichtfleck kreist
  const [lx, lz] = ev.def.lamp ?? [x - 6, z - 3.5];
  addGeo(ev, 'w11m:spotmast', () => { const b = new Build(); b.cyl(0.14, 0.2, 4, 0x4a4a6a, { p: [0, 2, 0] }, 8); b.box(1, 0.3, 1, 0x3a3a5a, { p: [0, 0.15, 0] }, 0.04); return b.geometry(); }, lx, y, lz);
  solidCyl(ev, lx, lz, 0.5, y, y + 4.2);
  let aim = 0;
  const head = MK.live(ev, 'suchscheinwerfer', { color: 0xfff2b0 }, [lx, y + 4.4, lz], 0, 1, 'idle', false, 6000, 60);
  const spotM = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  ev.own.push(spotM);
  const spot = new THREE.Mesh(cached('w11m:spotdisc', () => new THREE.CircleGeometry(1.6, 24).rotateX(-PI / 2)), spotM);
  spot.renderOrder = 5; spot.name = 'w11:lichtfleck';
  ev.view.add(spot);
  const beam = new THREE.Mesh(cached('w11m:spotbeam', () => beamGeo(1.5, 1)), beamMat(0xfff2b0, 0.16));
  ev.own.push(beam.material);
  beam.renderOrder = 5;
  ev.view.add(beam);
  let out = 0, hits = 0, was = false;
  ev.updaters.push((dt, t) => {
    const vis = inView(ev.view, x, y + 1, z, 8, 60);
    spot.visible = beam.visible = sm.visible = vis;
    const bt = beatAt(t);
    aim = (bt.beat / 8) * TAU;   // eine Runde je zwei Takte
    const sxp = x - 0.8 + Math.cos(aim) * 3.4, szp = z + Math.sin(aim) * 2.6;
    spot.position.set(sxp, y + 0.06, szp);
    const dx = sxp - lx, dz = szp - lz, dy = y + 4.4 - (y + 0.06), L = Math.hypot(dx, dz, dy);
    beam.position.set(lx, y + 4.4, lz);
    beam.scale.set(1, L, 1);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(dx / L, -dy / L, dz / L));
    if (head) head.root.rotation.y = Math.atan2(-dz, dx);
    const on = Math.abs(sxp - x) < 1.9 && Math.abs(szp - z) < 2.4;
    if (on && !was) hits++;
    was = on;
    out += ((on ? 1 : 0) - out) * Math.min(1, dt * 8 + (on ? 0.2 : 0));
    spotM.color.setHex(on ? 0xff6a5a : 0xfff2b0);
    if (!vis) return;
    spikes.forEach(([px, pz], i) => setInst(sm, i, px, y + 0.4 - 0.55 + out * 0.55, pz, 0, 1));
    sm.instanceMatrix.needsUpdate = true;
  });
  addInfo(ev, () => ({ spotbridge: { spikes: spikes.length, out: +out.toFixed(3), hits, aim: +aim.toFixed(3), lamp: !!head } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ B-12 Boss-Marathon-Sternenkuppel

function bossDome(ev, x, y, z) {
  const R = 5.2;
  // Kuppel mit Nachthimmel (innen dunkel, Sterne leuchten), goldener Sockelring, Tor
  addGeo(ev, 'w11m:dome', () => {
    const b = new Build();
    b.dome(R, { v: (px, py, pz, nx, ny) => mix(0x14143a, 0x2a2a7a, ny * 0.4 + 0.4) }, { p: [0, 0.4, 0] }, PI / 2, 24, 10);
    b.cyl(R + 0.3, R + 0.4, 0.5, 0xd8a82a, { p: [0, 0.25, 0] }, 24);
    const door = new THREE.Shape(); door.moveTo(-1, 0); door.lineTo(-1, 1.8); door.absarc(0, 1.8, 1, PI, 0, true); door.lineTo(1, 0); door.lineTo(-1, 0);
    b.extrude(door, 0.4, 0x3a2a6a, { p: [0, 0.4, R - 0.1] }, 0.04, 10);
    return b.geometry();
  }, x, y, z);
  pulse(ev, 'w11m:domestars', () => {
    const b = new Build();
    for (let i = 0; i < 46; i++) {
      const a = hash1(i * 1.3) * TAU, e = 0.12 + hash1(i * 2.7) * 1.3;
      const px = Math.cos(a) * Math.cos(e) * (R + 0.02), py = Math.sin(e) * (R + 0.02) + 0.4, pz = Math.sin(a) * Math.cos(e) * (R + 0.02);
      b.sphere(0.07 + hash1(i) * 0.09, i % 5 ? 0xfff4c0 : 0xa8e0ff, { p: [px, py, pz] }, 4, 3);
    }
    b.extrude((() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - PI / 2, r = i % 2 ? 0.28 : 0.7; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; })(), 0.12, 0xffd23a, { p: [0, 4.2, R - 0.9], r: [-0.6, 0, 0] }, 0, 1);
    return b.geometry();
  }, x, y, z);
  solidCyl(ev, x, z, R + 0.4, y, y + R);
  // sechs Warp-Boxen im Kreis vor der Kuppel (eine verschlossen) mit Boss-Plaketten
  const boxes = [];
  for (let i = 0; i < 6; i++) { const a = PI * (0.15 + 0.7 * (i / 5)); boxes.push([x + Math.cos(a) * (R + 3.4), z + Math.sin(a) * (R + 2.2) * 0.9]); }
  let wb = 0, deco = 0;
  boxes.forEach(([bx, bz], i) => {
    const yaw = Math.atan2(-(bz - z), bx - x);
    if (MK.bake(ev, 'warp_box', {}, [bx, y, bz], yaw, 0.85, null, true, 3800)) wb++;
    if (MK.bake(ev, 'bossblitz_box_deko', { icon: ['kippquader', 'schatten', 'lavafelsen', 'wirbel', 'schlangen', 'blase'][i] }, [bx, y, bz], yaw, 0.85, { locked: i === 5 ? 1 : 0, done: 0, glow: 0.6 }, true, 4200)) deco++;
    solidBox(ev, bx - 0.75, y, bz - 0.75, bx + 0.75, y + 1.1, bz + 0.75, 'warpbox');
  });
  // goldene Schlüssel kreisen um die Kuppel
  const keys = [];
  for (let i = 0; i < 5; i++) { const m = MK.live(ev, 'bossblitz_schluessel', {}, [x + R + 1, y + 2, z], 0, 0.9, 'idle', false, 2000, 60, true); if (m) keys.push(m); }
  let ka = 0;
  ev.updaters.push((dt, t) => { ka = t * 0.5; keys.forEach((k, i) => { const a = ka + (i / 5) * TAU; k.root.position.set(x + Math.cos(a) * (R + 1.4), y + 2.6 + Math.sin(t * 1.5 + i) * 0.3, z + Math.sin(a) * (R + 1.4)); }); });
  // Würfelblase hüpft auf der Kuppel
  let jump = 0;
  const blob = MK.live(ev, 'wuerfelblase', { size: 1.1, color: 'lila' }, [x, y + R + 0.4, z], FRONT, 1, 'idle', true, 12000, 65);
  if (blob) ev.updaters.push((dt, t) => { const bt = beatAt(t); jump = Math.sin(Math.min(1, bt.frac / 0.5) * PI); blob.root.position.y = y + R + 0.35 + jump * 0.6; });
  addInfo(ev, () => ({ bossdome: { boxes: boxes.length, registryBoxes: wb, deco, keys: keys.length, ka: +ka.toFixed(3), blob: !!blob, jump: +jump.toFixed(3) } }));
  modelsInfo(ev);
}

// Anmeldung: die Kulissen hängen am Kit 'blume' (blume11.js meldet es an)
if (BONUS_KITS.blume) BONUS_KITS.blume.decorate = decorateBlume;
else registerKit('blume', { name: 'blume', decorate: decorateBlume });
void tulipGeo; void beamGeo;
