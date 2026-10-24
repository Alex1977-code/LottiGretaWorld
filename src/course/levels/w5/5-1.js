// 5-1 „Schlüsselsuche am Muschelstrand“ – Sonnenstrand der Lila Strand-Insel (Welt 5, Bauplan: Detail 5-1). Parcours mit
// Ritt-Abschnitt (Archetyp parcours_ride): Am offenen Strand liegen fünf Schlüsselmünzen verstreut; erst alle fünf lassen die
// Warp-Box auf der Sandbank erscheinen. Sie bringt zur Schwebeinsel (Checkpoint, Röhre) – die Röhre führt hinab in die
// Glitzergrotte, wo Pflaume am Steg wartet und die Heldin durch den Höhlenfluss trägt (bewegliche Hubbrücken, Sandtaucher,
// Holzschanze). Am Grottenstrand bringt eine Röhre zur Zielinsel mit Leuchtturm. Thema beach, Musik course_beach, 500 s,
// ≈ 260 m Weg nach −Z.
//
// Abschnitte (+X = rechts im Bild):
//   1  Sandstrand      x −34 … 40, z 16 … −30   offener Strand (≈ 74 × 46 m): Palmen, Sandburgen, Strandkörbe, Rettungsturm,
//                                              Flachwasser mit Sandbank; fünf Schlüsselmünzen (Sandburg, Palmenhain der
//                                              Panzerkröten, Fels im Flachwasser, Rettungsturm, Fels hinter den Rammbock-
//                                              Bullen); drei Pilzlings-Sandskulpturen nahe dem Start (links Münzen, Mitte
//                                              sechs Mini-Pilzlinge, rechts der Stern); das Meer endet an der Kante im
//                                              Abgrund (Wasserfälle). Rechts der lila Fels mit der Wandhöhle (Krümel).
//   2  Schwebeinsel    z −38 … −58, y 9         Ankunft der Warp-Box, Checkpoint, Röhre hinab in die Grotte.
//   3  Glitzergrotte   z −66 … −206             Steg mit Pflaume (Station), Höhlenfluss ≈ 120 m: zwei Hubbrücken, zwei
//                                              Sandtaucher im Wasser, Holzschanze (Stempel darüber); Grottenstrand, Röhre.
//   4  Zielinsel       z −212 … −242            Sandinsel im Meer, Leuchtturm, Zielmast.
// Geheimnisse: Meeresloch neben der Warp-Box – im Loch ragt eine Röhre aus dem Wasser → Farbfeld-Raum (x ≈ 106; Stern 1:
// alle 16 Felder betreten); Wandhöhle ganz rechts (Stern 2: Krabbelkäfer besiegen, Krümel gibt den Stern).
// Extraleben: unsichtbarer Block über dem linken Strandkorb, Schatztruhe hinter dem Leuchtturm, der dritte Münzmarder.
// Gegner: Panzerkröte 10, Krabbelkäfer 22, Flatterkäfer 4, Rammbock-Bulle 4, Mini-Pilzling 6 (aus der Skulptur),
// Sandtaucher 4, Münzmarder 3.

import { RiverChannel } from '../../archetypes/RiverNet.js';
import {
  isl, rock, line, arc, ring, column, areaMoods, sandSkulpturen, kruemelHoehle, rettungsturm, leuchtturm, strandtuecher,
  krabben, delfine, brandung, kristalle, tropfsteine, lichtschaechte, grottenStaub, holzsteg, tiefwasser, schattenDiaet,
} from './_helpers_a.js';
import { bakeModel } from '../../blocks/w2kit.js';

const Y = 1;            // Strand (Sand)
const SEA = 0.7;        // Meeresboden im Flachwasser (0,3 m Wasser – man watet)
const WT = 1.0;         // Wasseroberfläche Flachwasser
const SKY = 9;          // Schwebeinsel
const DK = 0.62;        // Steg/Boden in der Grotte
const LILA = { topColor: 0xd8a8e0, sideColor: 0x9a6ab0, color: 0xa070c0 };      // lila Fels (Strand)
const GROTTE = { topColor: 0xb890d0, sideColor: 0x7a4a98, color: 0x8a5aa8 };    // Grottenfels
const SANDST = { topColor: 0xf0d8a8, sideColor: 0xc8a070, color: 0xd8b07a };    // Sandstein

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M51 = {
  BEACH: { x0: -34, x1: 40, z0: 16, z1: -14 },
  SHALLOW: { x0: -40, x1: 40, z0: -14, z1: -30 },
  HOLE: { x0: 7, x1: 11, z0: -20, z1: -25, bot: -2.6 },
  BAR: { x0: -3, x1: 5, z0: -19, z1: -27 },               // Sandbank mit Warp-Box
  MASSIF: { x0: 40, x1: 58, z0: 2, z1: -30, top: 8.6 },    // lila Fels rechts
  CAVE: { x0: 43, x1: 53, z0: 1.4, z1: -9.4, h: 7 },      // Wandhöhle (Innenmaße, Boden Y)
  ROOM: { x0: 98, x1: 114, z0: -8, z1: -24 },             // Farbfeld-Raum (abseits)
  ISLE: { x0: -9, x1: 9, z0: -38, z1: -58, top: SKY },    // Schwebeinsel
  GROTTO: { x0: -19, x1: 19, z0: -64, z1: -206 },
  GOAL: { x0: -12, x1: 12, z0: -212, z1: -242 },          // Zielinsel
  TOWER: [-27, Y, 3],                                     // Rettungsturm
  CASTLE: [-12, Y, -2],                                   // große Sandburg
  K3ROCK: { x: -22, z: -22, top: 2.4 },
  K5ROCK: { x: 33, z: -9, top: 2.6 },
};
const { BEACH, SHALLOW, HOLE, BAR, MASSIF, CAVE, ROOM, ISLE, GOAL, TOWER, CASTLE, K3ROCK, K5ROCK } = M51;

// ---------------------------------------------------------------- Höhlenfluss [x, y (Oberfläche), z, Breite, Strömung]
export const RIVER = [
  [0, 0, -73.5, 10, 0.6], [0, 0, -82, 9, 2.0], [1.5, -0.05, -94, 8.5, 3.6], [3, -0.12, -106, 8.5, 4.0], [1.5, -0.2, -118, 8.5, 4.2],
  [-2, -0.28, -130, 8.5, 4.2], [-3, -0.36, -142, 9, 4.0], [-0.5, -0.44, -154, 9, 4.0], [2.5, -0.52, -166, 8.5, 4.2],
  [1.5, -0.6, -178, 9.5, 3.4], [0, -0.66, -186, 12, 1.8], [0, -0.7, -193, 13, 0.6],
];
const ch = new RiverChannel({ points: RIVER });
/** Bogenlänge s bei z (Kanal läuft stetig nach −Z). */
const sAt = (z) => { const S = ch.S; let i = 0; while (i < S.length - 1 && S[i + 1].z > z) i++; const a = S[i], b = S[Math.min(S.length - 1, i + 1)]; const t = a.z === b.z ? 0 : (a.z - z) / (a.z - b.z); return a.s + (b.s - a.s) * Math.max(0, Math.min(1, t)); };
/** Punkt [x, y, z] im Kanal bei z, Seitenlage lat (m, + = rechts), dy über der Oberfläche. */
const P = (z, lat = 0, dy = 0) => { const q = ch.at(sAt(z)); return [+(q.x + q.rx * lat).toFixed(2), +(q.y + dy).toFixed(2), +(q.z + q.rz * lat).toFixed(2)]; };
const XZ = (z, lat = 0) => { const p = P(z, lat); return [p[0], p[2]]; };
const halfW = (z) => ch.at(sAt(z)).w / 2;
const riverCoins = (z0, z1, lat0, lat1, n, dy = 0.55) => Array.from({ length: n }, (_, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return { kind: 'coin', pos: P(z0 + (z1 - z0) * t, lat0 + (lat1 - lat0) * t, dy) }; });
const riverArc = (z0, z1, lat, h, n, dy0 = 0.6) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return { kind: 'coin', pos: P(z0 + (z1 - z0) * t, lat, dy0 + h * Math.sin(Math.PI * t)) }; });

export const RAMP_Z = -134;
export const BRIDGES = { a: -112, b: -160 };
const STAMP = P(RAMP_Z - 5.4, 0, 3.4);

/** Grottenwände entlang des Flusses: je 6 m ein Felsblock links und rechts (Innenkante = Ufer + 1,6 m). */
function grottoWalls() {
  const out = [];
  for (let z = -74; z > -192; z -= 6) {
    const zm = z - 3, q = ch.at(sAt(zm)), hw = q.w / 2 + 1.6;
    out.push(rock(-19, q.x - hw, z, z - 6, 12, 14, { tag: 'grotte', ...GROTTE }));
    out.push(rock(q.x + hw, 19, z, z - 6, 12, 14, { tag: 'grotte', ...GROTTE }));
  }
  return out;
}

const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.6, 0.9], yaw: o.yaw ?? 0 });
const key = (pos, extra = {}) => ({ kind: 'schluesselmuenze', pos, group: 'tor', ...extra });

/** Level-Haken: Kulisse, Stimmungen, Gimmick-Szenen. */
function setup(level) {
  // ---------------- Stimmung in der Glitzergrotte (türkis-violettes Dämmerlicht) und in den Höhlen
  areaMoods(level, {
    grotte: { fog: { color: 0x1e2a48, near: 14, far: 80 }, background: 0x141a32, hemi: { sky: 0x9adcff, ground: 0x4a2a6a, intensity: 0.95 }, sun: { color: 0xc8f0ff, intensity: 1.35 }, dome: 0x2a3a6a },
    hoehle: { fog: { color: 0x2a2040, near: 10, far: 60 }, background: 0x1a1428, hemi: { sky: 0xffd8b0, ground: 0x4a2a5a, intensity: 1.0 }, sun: { color: 0xffe0b0, intensity: 1.3 }, dome: 0x3a2a5a },
  }, [
    { min: [-22, -206], max: [22, -63], mood: 'grotte' },
    { min: [CAVE.x0 - 0.6, CAVE.z1 - 0.6], max: [CAVE.x1 + 0.6, CAVE.z0], mood: 'hoehle' },
    { min: [ROOM.x0 - 2, ROOM.z1 - 2], max: [ROOM.x1 + 2, ROOM.z0 + 2], mood: 'hoehle' },
  ]);

  // ---------------- 1 Sandstrand: Sandskulpturen (links Münzen, Mitte Mini-Pilzlinge, rechts Stern 0)
  sandSkulpturen(level, [
    { id: 'skulptur_l', pos: [6, Y, -1], height: 2.4, content: { coins: 5 }, shadow: false },
    { id: 'skulptur_m', pos: [9.6, Y, -1], height: 2.6, minis: 6, shadow: false },
    { id: 'skulptur_r', pos: [13.2, Y, -1], height: 2.4, content: { star: 0 }, sparkle: true, shadow: false },
  ]);
  // Krümel in der Wandhöhle
  kruemelHoehle(level, { pos: [51.3, Y + 0.9, CAVE.z1 + 1.4], yaw: -Math.PI / 2 - 0.4, task: 'aufgabe_hoehle' });
  rettungsturm(level, TOWER[0], TOWER[1], TOWER[2], { top: 3.2 });
  leuchtturm(level, 8.5, Y, -238, { h: 9 });
  strandtuecher(level, [
    [-6, Y, 6.5, 0.3, 0xff5a8a, 0xffffff], [-8.4, Y, 6, -0.2, 0x3ab0ff, 0xfff4a0], [20.5, Y, -3, 0.5, 0x6ad86a, 0xffffff],
    [-19, Y, -9, 1.2, 0xffb02e, 0xffffff], [25, Y, 10, -0.4, 0xb070ff, 0xfff0ff], [-4, Y, -238, 0.4, 0xff5a8a, 0xffffff],
    [3, ISLE.top, -50, 0.2, 0x3ab0ff, 0xffffff],
  ]);
  krabben(level, [
    { from: [-14, Y, -12.4], to: [-6, Y, -12.8], speed: 1.8 }, { from: [14, Y, -13], to: [22, Y, -12.6], speed: 1.5, pause: 2 },
    { from: [-30, Y, -11], to: [-26, Y, -13], speed: 1.2 }, { from: [2, Y, 13], to: [8, Y, 12], speed: 1.4, pause: 2.5 },
    { from: [26, Y, 4], to: [30, Y, 1], speed: 1.6 }, { from: [-6, Y, -214], to: [-2, Y, -215], speed: 1.4 },
    { from: [4, Y, -241], to: [-1, Y, -240], speed: 1.2, pause: 2 }, { from: [-4, ISLE.top, -56], to: [2, ISLE.top, -56.4], speed: 1.2 },
  ]);
  delfine(level, [
    { pos: [-46, -11.5, -40], dir: [1, 0.2], period: 5.2, phase: 0, len: 8, h: 4 },
    { pos: [-52, -11.5, -46], dir: [1, 0.1], period: 5.2, phase: 0.18, len: 8, h: 3.4 },
    { pos: [36, -11.5, -58], dir: [-1, -0.3], period: 6, phase: 0.5, len: 9, h: 4.5 },
    { pos: [-30, -11.5, -226], dir: [0.3, -1], period: 5.6, phase: 0.3, len: 8, h: 4 },
  ]);
  // Brandung an der Uferlinie und an der Kante
  brandung(level, [
    [[BEACH.x0, WT, BEACH.z1 - 0.2], [BAR.x0 - 0.2, WT, BEACH.z1 - 0.2]], [[BAR.x1 + 0.2, WT, BEACH.z1 - 0.2], [BEACH.x1, WT, BEACH.z1 - 0.2]],
    [[BEACH.x0 - 0.2, WT, BEACH.z0], [BEACH.x0 - 0.2, WT, BEACH.z1]],
    [[BAR.x0 - 0.3, WT, BAR.z0], [BAR.x0 - 0.3, WT, BAR.z1]], [[BAR.x1 + 0.3, WT, BAR.z0], [BAR.x1 + 0.3, WT, BAR.z1]],
    [[GOAL.x0 - 0.3, WT, GOAL.z0], [GOAL.x0 - 0.3, WT, GOAL.z1]], [[GOAL.x1 + 0.3, WT, GOAL.z0], [GOAL.x1 + 0.3, WT, GOAL.z1]],
  ]);
  // Strandkörbe, Muscheln (Registry-Modelle, verschmolzen)
  for (const [x, z, color, yaw] of [[-9.5, 8.4, 'blau', -Math.PI / 2 - 0.3], [-13, 8.8, 'rot', -Math.PI / 2 + 0.2], [-5, -232, 'gruen', -Math.PI / 2 + 0.3]]) {
    bakeModel(level, 'strandkorb', { color }, x, Y, z, yaw);
    level.world.add({ type: 'cyl', x, z, r: 0.7, y0: Y, y1: Y + 1.6, tag: 'strandkorb' });
  }
  for (const [x, z, kind, s] of [[-3, 4, 'faecher', 1.2], [-17, 1, 'stern', 1.3], [28, 11, 'schnecke', 1.1], [2, -235, 'stern', 1.2]]) {
    bakeModel(level, 'muschel', { kind, size: s }, x, Y, z, x * 0.7, 1, {}, { castShadow: false });
  }

  // ---------------- Wandhöhle: Kristalle, Laterne
  kristalle(level, [[CAVE.x0 + 0.6, Y, CAVE.z1 + 0.8, 1.1, 0xd88aff], [CAVE.x1 - 0.7, Y, CAVE.z1 + 1, 1.2, 0x7ae8ff], [CAVE.x1 - 0.6, Y, -1, 0.8, 0xffa8e0]], { seed: 3 });
  // ---------------- Farbfeld-Raum: Kristalle in den Ecken
  kristalle(level, [[ROOM.x0 + 0.8, Y, ROOM.z1 + 0.8, 1.1, 0x7ae8ff], [ROOM.x1 - 0.8, Y, ROOM.z1 + 0.8, 1.1, 0xd88aff], [ROOM.x0 + 0.8, Y, ROOM.z0 - 0.8, 0.8, 0xffa8e0], [ROOM.x1 - 0.8, Y, ROOM.z0 - 0.8, 0.8, 0x9aff8a]], { seed: 5 });

  // ---------------- 3 Glitzergrotte: Steg zu Pflaume, Kristalle an den Wänden, Tropfsteine, Lichtschächte, Glitzerstaub
  holzsteg(level, -1.3, 1.3, -73.4, -80.4, DK, { rails: true, postDown: 2.2 });
  const wallCrystals = [];
  const drips = [];
  for (let z = -82; z > -190; z -= 7) {
    const q = ch.at(sAt(z)), hw = q.w / 2 + 1.6;
    const cols = [0x7ae8ff, 0xd88aff, 0xffa8e0, 0x8affd8];
    wallCrystals.push([q.x - hw + 0.2, 1.2 + ((z * 7) % 3 + 3) % 3, z, 0.9 + ((-z) % 5) * 0.08, cols[(-z) % 4 | 0], 1.1]);
    wallCrystals.push([q.x + hw - 0.2, 1.6 + ((z * 5) % 4 + 4) % 4, z - 3, 0.8 + ((-z) % 3) * 0.1, cols[((-z) + 1) % 4 | 0], -1.1]);
    drips.push([q.x - hw + 0.8, 12, z - 1.5, -2.4 - ((-z) % 3) * 0.5, 0.5], [q.x + hw - 0.8, 12, z - 4.5, -2 - ((-z) % 4) * 0.4, 0.45]);
  }
  kristalle(level, wallCrystals, { seed: 9 });
  tropfsteine(level, drips);
  tropfsteine(level, [[-4.6, 1, -191, 1.6, 0.5], [5.2, 1, -193, 2.2, 0.6], [-6, 1, -200, 1.2, 0.4], [6, 1, -202, 1.6, 0.45]]);
  lichtschaechte(level, [[2, 12, -100, 1.8, 12], [-2, 12, -138, 2.2, 12.5], [2, 12, -172, 1.8, 12.5], [-9, 12, -199, 2, 12]], { opacity: 0.16 });
  tiefwasser(level, HOLE.x0, HOLE.x1, HOLE.z0, HOLE.z1, WT - 0.08, HOLE.bot);
  grottenStaub(level, { inside: (p) => !!p && p.pos.z < -66 && p.pos.z > -206 && Math.abs(p.pos.x) < 20, y0: 0 });
  // ---------------- Budget: Gegner werfen den Sonnenschatten nur mit ihrem größten Teil
  schattenDiaet(level, ['panzerkroete', 'rammbock_bulle', 'krabbelkaefer', 'flatterkaefer', 'sandtaucher', 'muenzmarder', 'pilzling'], 1);
}

export const LEVEL = {
  id: '5-1',
  world: 5,
  title: 'Schlüsselsuche am Muschelstrand',
  archetype: 'parcours_ride',
  theme: 'beach',
  music: 'course_beach',
  timeLimit: 500,
  start: { pos: [0, Y, 10], yaw: Math.PI / 2 },
  killY: -7,
  instances: { coin: { farHide: 44, shadow: false }, krabbelkaefer: { farHide: 40, shadowDist: 16 } },
  farHide: 34,
  ride: {
    section: true,
    raft: [0, 0, -82.6],
    raftYaw: -Math.PI / 2,
    dock: { min: [-7, -80.6], max: [7, -62] },
    beach: { min: [-8, -196], max: [8, -185.5], land: [0, DK, -196] },
    swim: true,
    after: 'stay',
    footCamYaw: 0,
  },
  build: setup,
  camera: [
    // 1 Sandstrand (bis zur Kante), rechts die Wandhöhle, abseits der Farbfeld-Raum
    { from: 22, to: -31, pitch: 44, dist: 13.5, fov: 40, area: [-50, 41] },
    { from: 22, to: -31, pitch: 44, dist: 13.5, fov: 40, area: [41, 60] },
    { from: 1.6, to: -12, pitch: 34, dist: 10.5, fov: 42, height: 1.2, area: [42.6, 53.4] },
    { from: 0, to: -30, pitch: 52, dist: 12.5, fov: 40, area: [90, 125] },
    // 2 Schwebeinsel
    { from: -34, to: -62, pitch: 42, dist: 13, fov: 40 },
    // 3 Steg in der Grotte (zu Fuß), Grottenstrand
    { from: -62, to: -86, pitch: 40, dist: 12, fov: 42, ahead: 2.4 },
    { from: -86, to: -186, pitch: 38, dist: 12, fov: 42, ahead: 2.6 },
    { from: -186, to: -207, pitch: 42, dist: 12, fov: 42 },
    // 4 Zielinsel
    { from: -207, to: -250, pitch: 40, dist: 13.5, fov: 40 },
  ],
  segments: [
    // =============================================================== 1  Sandstrand
    isl(BEACH.x0, BEACH.x1, BEACH.z0, BEACH.z1, Y, 13, { top: 'sand', shadow: false }),
    isl(BEACH.x1, MASSIF.x1, BEACH.z0, MASSIF.z0, Y, 13, { top: 'sand', shadow: false }),
    // Flachwasser: Meeresboden (um das Meeresloch herum), linker Uferstreifen
    isl(SHALLOW.x0, HOLE.x0, SHALLOW.z0, SHALLOW.z1, SEA, 12.7, { top: 'sand', shadow: false }),
    isl(HOLE.x1, SHALLOW.x1, SHALLOW.z0, SHALLOW.z1, SEA, 12.7, { top: 'sand', shadow: false }),
    isl(HOLE.x0, HOLE.x1, SHALLOW.z0, HOLE.z0, SEA, 12.7, { top: 'sand', shadow: false }),
    isl(HOLE.x0, HOLE.x1, HOLE.z1, SHALLOW.z1, SEA, 12.7, { top: 'sand', shadow: false }),
    isl(HOLE.x0, HOLE.x1, HOLE.z0, HOLE.z1, HOLE.bot, 9.4, { top: 'sand', shadow: false }),
    isl(SHALLOW.x0, BEACH.x0, BEACH.z0, BEACH.z1, SEA, 12.7, { top: 'sand', shadow: false }),
    { type: 'water', pos: [(SHALLOW.x0 + SHALLOW.x1) / 2, SEA, (SHALLOW.z0 + SHALLOW.z1) / 2], size: [SHALLOW.x1 - SHALLOW.x0, WT - SEA, SHALLOW.z0 - SHALLOW.z1] },
    { type: 'water', pos: [(SHALLOW.x0 + BEACH.x0) / 2, SEA, (BEACH.z0 + BEACH.z1) / 2], size: [BEACH.x0 - SHALLOW.x0, WT - SEA, BEACH.z0 - BEACH.z1] },
    { type: 'water', pos: [(HOLE.x0 + HOLE.x1) / 2, HOLE.bot, (HOLE.z0 + HOLE.z1) / 2], size: [HOLE.x1 - HOLE.x0, WT - HOLE.bot, HOLE.z0 - HOLE.z1], show: false },
    // Sandbank mit der Warp-Box, Röhre im Meeresloch (ragt knapp aus dem Wasser)
    isl(BAR.x0, BAR.x1, BAR.z0, BAR.z1, Y, 2, { top: 'sand' }),
    { type: 'pipe', id: 'p_loch', pos: [(HOLE.x0 + HOLE.x1) / 2, HOLE.bot, (HOLE.z0 + HOLE.z1) / 2], height: WT - HOLE.bot + 0.15, target: 'p_farb' },
    // Wasserfälle über die Kante des Flachwassers in den Abgrund
    { type: 'river_fall', from: [-24, WT, SHALLOW.z1], to: [-24, -11, SHALLOW.z1 - 3], width: 12, lip: 1.4, mist: false },
    { type: 'river_fall', from: [-2, WT, SHALLOW.z1], to: [-2, -11, SHALLOW.z1 - 3], width: 10, lip: 1.4, rainbow: true },
    { type: 'river_fall', from: [24, WT, SHALLOW.z1], to: [24, -11, SHALLOW.z1 - 3], width: 12, lip: 1.4, mist: false },
    sign(-3.6, Y, 11.4, 'Schlüsselsuche\nam Muschelstrand', { size: [3.2, 1.1] }),
    sign(3, Y, 4.4, 'Finde die 5\nSchlüsselmünzen!', { size: [2.6, 0.9] }),
    sign(10.2, Y, 2.2, 'Stampf auf\nden Hut!', { size: [2.2, 0.8] }),
    // Rettungsturm (Schlüssel 4 oben) – Kollision im Level-Haken; Sandburg (Schlüssel 1 darüber)
    { type: 'deco_w5', items: [
      { kind: 'sandburg', pos: CASTLE, size: 3.2, solid: true },
      { kind: 'sandburg', pos: [-16.5, Y, 1.5], size: 1.6, solid: true }, { kind: 'sandburg', pos: [-8.2, Y, -5.4], size: 1.3, solid: true },
      { kind: 'palme', pos: [-11.5, Y, 12], height: 6, lean: 0.25, yaw: 0.6 }, { kind: 'palme', pos: [9, Y, 12.6], height: 5.6, lean: 0.3, yaw: 2.6 },
      { kind: 'palme', pos: [-30, Y, 12], height: 6.4 }, { kind: 'palme', pos: [-31.5, Y, -6], height: 5.2, lean: 0.35, yaw: -0.6 },
      { kind: 'palmen', pos: [16, Y, 8], size: [8, 7], n: 5, height: [4.6, 6.4], avoid: [[16, 8, 2.2]] },
      { kind: 'palme', pos: [36, Y, 12], height: 6.2, lean: 0.2, yaw: 3.4 }, { kind: 'palme', pos: [37.5, Y, 4], height: 5, lean: 0.3, yaw: 3 },
      { kind: 'sonnenschirm', pos: [-7, Y, 8.5], color: 'rot' }, { kind: 'sonnenschirm', pos: [21.5, Y, -1.5], color: 'gelb' },
      { kind: 'sonnenschirm', pos: [-20, Y, -7.5], color: 'blau' }, { kind: 'sonnenschirm', pos: [26.5, Y, 11.5], color: 'lila' },
      { kind: 'liegestuhl', pos: [-4.5, Y, 7.5], yaw: -0.3, color: 'rot' }, { kind: 'liegestuhl', pos: [24, Y, 9.5], yaw: 0.4, color: 'lila' },
      { kind: 'strandball', pos: [2.5, Y, 1.5] }, { kind: 'strandball', pos: [-15, Y, -10], size: 0.7 },
      { kind: 'muscheln', pos: [0, Y, 2], size: [60, 24], n: 30, shadow: false, avoid: [[0, 10, 2], [9.6, -1, 3.8], [-12, -2, 2.6]] },
      { kind: 'duenen', pos: [0, Y, 15.5], size: [60, 3], n: 6, shadow: false },
    ] },
    // Fels im Flachwasser (Schlüssel 3), Fels hinter den Bullen (Schlüssel 5), Bullen-Mäuerchen
    rock(K3ROCK.x - 1.6, K3ROCK.x + 1.6, K3ROCK.z + 1.6, K3ROCK.z - 1.6, K3ROCK.top, K3ROCK.top - SEA + 1, LILA),
    rock(K5ROCK.x - 1.4, K5ROCK.x + 1.4, K5ROCK.z + 1.4, K5ROCK.z - 1.4, K5ROCK.top, K5ROCK.top - Y + 1, LILA),
    rock(23, 24.4, 0, -12, Y + 1.1, 1.1, SANDST),
    rock(37, 39.8, 3, -12, Y + 1.1, 1.1, SANDST),
    // Lila Fels rechts mit Wandhöhle (Raum mit Ausschnitt-Ansicht, Eingang vorn)
    rock(MASSIF.x0, CAVE.x0 - 0.6, MASSIF.z0, MASSIF.z1, MASSIF.top, MASSIF.top - Y + 12, LILA),
    rock(CAVE.x1 + 0.6, MASSIF.x1, MASSIF.z0, MASSIF.z1, MASSIF.top, MASSIF.top - Y + 12, LILA),
    rock(CAVE.x0 - 0.6, CAVE.x1 + 0.6, CAVE.z1 - 0.6, MASSIF.z1, MASSIF.top, MASSIF.top - Y + 12, LILA),
    { type: 'room', pos: [(CAVE.x0 + CAVE.x1) / 2, Y, (CAVE.z0 + CAVE.z1) / 2], size: [CAVE.x1 - CAVE.x0, CAVE.h, CAVE.z0 - CAVE.z1], style: 0x9a6ab0, top: 'stone', door: { side: '+z', w: 2.8, h: 3.2 } },
    rock(CAVE.x1 - 3.2, CAVE.x1 - 0.2, CAVE.z1 + 2.6, CAVE.z1 + 0.2, Y + 0.9, 0.9, LILA),   // Krümels Fels
    sign(44.5, Y, 3.6, 'Höhle', { size: [1.6, 0.7] }),

    // =============================================================== Farbfeld-Raum (abseits, nur durch die Röhre im Meeresloch)
    { type: 'room', pos: [(ROOM.x0 + ROOM.x1) / 2, Y, (ROOM.z0 + ROOM.z1) / 2], size: [ROOM.x1 - ROOM.x0, 5, ROOM.z0 - ROOM.z1], style: 0x8a5aa8, top: 'stone' },
    { type: 'pipe', id: 'p_farb', pos: [ROOM.x0 + 2.2, Y, ROOM.z0 - 2.2], height: 1.2, target: 'p_loch' },
    { type: 'switchtiles', id: 'farbfelder', pos: [(ROOM.x0 + ROOM.x1) / 2 + 0.8, Y, (ROOM.z0 + ROOM.z1) / 2 - 0.6], grid: [4, 4], spacing: 2, onAll: { star: 1 } },
    sign(ROOM.x0 + 4.6, Y, ROOM.z0 - 1, 'Alle Felder\nbetreten!', { size: [2.4, 0.85] }),

    // =============================================================== 2  Schwebeinsel
    isl(ISLE.x0, ISLE.x1, ISLE.z0, ISLE.z1, ISLE.top, 3, { top: 'sand', under: 3.5 }),
    { type: 'pipe', id: 'p_insel', pos: [0, ISLE.top, -54.6], height: 1.3, target: 'p_dock' },
    sign(-3.4, ISLE.top, -52.6, 'Zur\nGlitzergrotte', { size: [2.2, 0.8] }),
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [-7, ISLE.top, -40.5], height: 5.4, lean: 0.3, yaw: 0.8 }, { kind: 'palme', pos: [7.2, ISLE.top, -56.5], height: 5, lean: 0.25, yaw: 3.6 },
      { kind: 'palme', pos: [7, ISLE.top, -40], height: 4.4 }, { kind: 'sonnenschirm', pos: [-6, ISLE.top, -56], color: 'lila' },
      { kind: 'muscheln', pos: [0, ISLE.top, -48], size: [16, 18], n: 10, avoid: [[0, -41, 1.6], [0, -54.6, 1.8], [0, -45, 1.4]] },
      { kind: 'sandburg', pos: [5.6, ISLE.top, -48], size: 1.4, solid: true },
    ] },

    // =============================================================== 3  Glitzergrotte (Höhlenfluss)
    // Vorderwand der Grotte mit Höhlenmaul (Kulisse hinter der Schwebeinsel), Grottenboden am Steg
    rock(-19, -6.5, -62, -66, 12, 18, LILA),
    rock(6.5, 19, -62, -66, 12, 18, LILA),
    rock(-6.5, 6.5, -62, -66, 12, 6.6, LILA),
    rock(-19, 19, -64, -74, DK, 8, GROTTE),
    { type: 'pipe', id: 'p_dock', pos: [0, DK, -69.6], height: 1.1 },
    sign(-3.2, DK, -72, 'Pflaume wartet\nam Steg!', { size: [2.4, 0.85] }),
    { type: 'river', channels: [{ id: 'grotte', points: RIVER, bank: { height: DK, out: 1.8, skirt: false }, deco: 0 }] },
    ...grottoWalls(),
    // Felsbögen über dem Fluss
    { type: 'river_arch', pos: P(-100, 0, -0.1), span: 11.5, height: 6.5, depth: 3 },
    { type: 'river_arch', pos: P(-148, 0, -0.1), span: 12, height: 6.5, depth: 3 },
    { type: 'river_arch', pos: P(-182, 0, -0.1), span: 13, height: 6.5, depth: 3 },
    // Hubbrücken, Holzschanze, Felsen im Fluss
    { type: 'flussbruecke', id: 'bruecke_a', from: [P(BRIDGES.a, -halfW(BRIDGES.a) - 0.6)[0], P(BRIDGES.a)[1] + 0.35, BRIDGES.a], to: [P(BRIDGES.a, halfW(BRIDGES.a) + 0.6)[0], P(BRIDGES.a)[1] + 0.35, BRIDGES.a], width: 2.6, lift: 2.8, wait: 1.6, speed: 1.8, phase: 0 },
    { type: 'flussbruecke', id: 'bruecke_b', from: [P(BRIDGES.b, -halfW(BRIDGES.b) - 0.6)[0], P(BRIDGES.b)[1] + 0.35, BRIDGES.b], to: [P(BRIDGES.b, halfW(BRIDGES.b) + 0.6)[0], P(BRIDGES.b)[1] + 0.35, BRIDGES.b], width: 2.6, lift: 2.8, wait: 1.4, speed: 1.8, phase: 1.6 },
    { type: 'river_ramp', pos: XZ(RAMP_Z, 0), len: 4.6, wid: 3.4, h: 1.4, kick: 6 },
    { type: 'riverrock', pos: XZ(-90, -2.8), r: 0.9, h: 1.1 },
    { type: 'riverrock', pos: XZ(-124, 2.9), r: 1, h: 1.3 },
    { type: 'riverrock', pos: XZ(-146, -3), r: 0.8, h: 1 },
    { type: 'riverrock', pos: XZ(-172, 2.8), r: 0.9, h: 1.2 },
    { type: 'river_deco', items: [
      { kind: 'lilies', pos: XZ(-88, 3), r: 0.9, n: 4 }, { kind: 'lilies', pos: XZ(-128, -3.2), r: 0.8, n: 3 }, { kind: 'lilies', pos: XZ(-176, -3.4), r: 0.9, n: 4 },
      { kind: 'arrow', pos: XZ(-92, 0) }, { kind: 'arrow', pos: XZ(-128, -1.2) },
    ] },
    // Grottenstrand (Absteigen) und Röhre zur Zielinsel
    rock(-19, 19, -191, -206, DK, 8, SANDST),
    rock(-19, 19, -206, -209, 12, 18, LILA),
    { type: 'pipe', id: 'p_grotte_aus', pos: [0, DK, -201.5], height: 1.2, target: 'p_ziel_ein' },
    sign(-3.2, DK, -199.5, 'Zur Zielinsel', { size: [2.2, 0.75] }),

    // =============================================================== 4  Zielinsel
    isl(GOAL.x0, GOAL.x1, GOAL.z0, GOAL.z1, Y, 13, { top: 'sand', shadow: false }),
    isl(GOAL.x0 - 6, GOAL.x0, GOAL.z0, GOAL.z1, SEA, 12.7, { top: 'sand', shadow: false }),
    isl(GOAL.x1, GOAL.x1 + 6, GOAL.z0, GOAL.z1, SEA, 12.7, { top: 'sand', shadow: false }),
    { type: 'water', pos: [GOAL.x0 - 3, SEA, (GOAL.z0 + GOAL.z1) / 2], size: [6, WT - SEA, GOAL.z0 - GOAL.z1] },
    { type: 'water', pos: [GOAL.x1 + 3, SEA, (GOAL.z0 + GOAL.z1) / 2], size: [6, WT - SEA, GOAL.z0 - GOAL.z1] },
    { type: 'pipe', id: 'p_ziel_ein', pos: [0, Y, -216], height: 1.2 },
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [-9, Y, -215], height: 6, lean: 0.3, yaw: 0.5 }, { kind: 'palme', pos: [-9.5, Y, -230], height: 5.4, lean: 0.25, yaw: 0.2 },
      { kind: 'palme', pos: [10, Y, -222], height: 5.8, lean: 0.3, yaw: 3 }, { kind: 'sonnenschirm', pos: [-6.5, Y, -236.5], color: 'gelb' },
      { kind: 'sandburg', pos: [5, Y, -226], size: 1.6, solid: true },
      { kind: 'muscheln', pos: [0, Y, -228], size: [20, 24], n: 14, avoid: [[0, -216, 1.8], [0, -237, 2], [8.5, -238, 2]] },
    ] },
  ],
  blocks: [
    // Start: Funkenblüte in Sichtweite (Feuer zerbricht Sandskulpturen, hilft gegen die Bullen)
    { kind: 'brick', pos: [-3, Y + 2.4, 3.4], content: 'coins:2' },
    { kind: 'question', pos: [-2, Y + 2.4, 3.4], content: 'funken' },
    { kind: 'question', pos: [-1, Y + 2.4, 3.4], content: 'coins:5' },
    // Extraleben: unsichtbarer Block über dem linken Strandkorb
    { kind: 'hidden', pos: [-13, Y + 3.1, 6.6], content: 'oneup' },
    // Schwebeinsel: Wachstumsbeere
    { kind: 'question', pos: [2.6, ISLE.top + 2.4, -46], content: 'wachstumsbeere' },
    // Zielinsel
    { kind: 'question', pos: [-2.4, Y + 2.4, -224], content: 'coins:5' },
  ],
  enemies: [
    // ---------------- 1 Sandstrand: Panzerkröte 6, Krabbelkäfer 8, Flatterkäfer 4, Rammbock-Bulle 3, Sandtaucher 2, Münzmarder 3
    { kind: 'panzerkroete', id: 'kr_hain1', pos: [12, Y, 8], path: [[12, Y, 4.5], [20, Y, 4.5], [20, Y, 11.5], [12, Y, 11.5]], loop: true },
    { kind: 'panzerkroete', id: 'kr_hain2', pos: [20, Y, 11.5], path: [[20, Y, 11.5], [12, Y, 11.5], [12, Y, 4.5], [20, Y, 4.5]], loop: true },
    { kind: 'panzerkroete', id: 'kr_hain3', pos: [16, Y, 3], path: [[13, Y, 3], [19, Y, 3]] },
    { kind: 'panzerkroete', id: 'kr_burg1', pos: [-15, Y, -5], path: [[-17, Y, -6], [-9, Y, -6]] },
    { kind: 'panzerkroete', id: 'kr_burg2', pos: [-6, Y, 0], path: [[-8, Y, 1.5], [-8, Y, -4]] },
    { kind: 'panzerkroete', id: 'kr_turm', pos: [-24, Y, -2], path: [[-29, Y, -2], [-21, Y, -2]] },
    { kind: 'krabbelkaefer', id: 'kk_strand1', path: [[-6, Y, -9], [6, Y, -9], [6, Y, -12], [-6, Y, -12]], count: 4, spacing: 1.6, loop: true, color: 'pink' },
    { kind: 'krabbelkaefer', id: 'kk_strand2', path: [[26, Y, 6], [34, Y, 6], [34, Y, 9], [26, Y, 9]], count: 4, spacing: 1.6, loop: true, color: 'yellow' },
    { kind: 'flatterkaefer', id: 'fk_meer1', path: [[-26, Y + 2.6, -19], [-18, Y + 2.6, -19], [-18, Y + 2.6, -25], [-26, Y + 2.6, -25]], count: 2, spacing: 2.4, loop: true, color: 'blue' },
    { kind: 'flatterkaefer', id: 'fk_meer2', path: [[13, Y + 2.8, -17], [22, Y + 2.8, -21], [13, Y + 2.8, -26]], count: 2, spacing: 2.4, loop: true, color: 'pink' },
    { kind: 'rammbock_bulle', id: 'bulle1', pos: [27, Y, -5], dir: [-1, 0], sight: 9 },
    { kind: 'rammbock_bulle', id: 'bulle2', pos: [34, Y, -2], dir: [-1, 0], sight: 9 },
    { kind: 'rammbock_bulle', id: 'bulle3', pos: [30, Y, -11], dir: [0, 1], sight: 9 },
    { kind: 'sandtaucher', id: 'st_strand1', pos: [-2, Y, -4], ground: 'sand', area: { min: [-8, -7], max: [4, -2] } },
    { kind: 'sandtaucher', id: 'st_strand2', pos: [26, Y, -2], ground: 'sand', area: { min: [24.5, -1], max: [36.5, 3] } },
    { kind: 'muenzmarder', id: 'marder1', path: [[-4, Y, -1], [-12, Y, -9], [-22, Y, -10], [-30, Y, -4], [-31, Y, 8]], coins: 20 },
    { kind: 'muenzmarder', id: 'marder2', path: [[18, Y, -8], [10, Y, -12], [0, Y, -13], [-8, Y, -13.2]], coins: 20 },
    { kind: 'muenzmarder', id: 'marder3', path: [[24, Y, 13], [32, Y, 13], [38, Y, 8], [38, Y, -1]], coins: 20, drop: 'oneup' },
    // ---------------- Wandhöhle (Krabbelkäfer 6 – Aufgabe: alle besiegen)
    { kind: 'krabbelkaefer', id: 'kk_hoehle1', path: [[44.5, Y, -1], [51.5, Y, -1], [51.5, Y, -4.5], [44.5, Y, -4.5]], count: 3, spacing: 2.2, loop: true, color: 'green' },
    { kind: 'krabbelkaefer', id: 'kk_hoehle2', path: [[45, Y, -6], [50, Y, -6], [50, Y, -8.4], [45, Y, -8.4]], count: 3, spacing: 2.2, loop: true, color: 'red' },
    // ---------------- Farbfeld-Raum (Krabbelkäfer 4)
    { kind: 'krabbelkaefer', id: 'kk_farb', path: [[ROOM.x0 + 1.4, Y, ROOM.z0 - 4.5], [ROOM.x1 - 1.4, Y, ROOM.z0 - 4.5], [ROOM.x1 - 1.4, Y, ROOM.z1 + 1.4], [ROOM.x0 + 1.4, Y, ROOM.z1 + 1.4]], count: 4, spacing: 4.5, loop: true, color: 'blue' },
    // ---------------- 2 Schwebeinsel (Panzerkröte 2, Krabbelkäfer 2)
    { kind: 'panzerkroete', id: 'kr_insel1', pos: [-5, ISLE.top, -47], path: [[-6, ISLE.top, -47], [-1, ISLE.top, -50]] },
    { kind: 'panzerkroete', id: 'kr_insel2', pos: [5, ISLE.top, -52], path: [[6, ISLE.top, -52], [2, ISLE.top, -44]] },
    { kind: 'krabbelkaefer', id: 'kk_insel', path: [[-6, ISLE.top, -42], [6, ISLE.top, -42]], count: 2, spacing: 1.6 },
    // ---------------- 3 Grotte: Sandtaucher im Fluss (Revier = Kanal)
    { kind: 'sandtaucher', id: 'st_fluss1', pos: P(-122, -1.5), ground: 'wasser', area: { min: [P(-118)[0] - 3.6, -127], max: [P(-118)[0] + 3.6, -117] } },
    { kind: 'sandtaucher', id: 'st_fluss2', pos: P(-168, 1.5), ground: 'wasser', area: { min: [P(-168)[0] - 3.6, -173], max: [P(-168)[0] + 3.6, -163] } },
    // ---------------- 4 Zielinsel (Panzerkröte 2, Krabbelkäfer 2, Rammbock-Bulle 1)
    { kind: 'panzerkroete', id: 'kr_ziel1', pos: [-6, Y, -228], path: [[-7, Y, -226], [-3, Y, -232]] },
    { kind: 'panzerkroete', id: 'kr_ziel2', pos: [6, Y, -232], path: [[7, Y, -230], [3, Y, -220]] },
    { kind: 'krabbelkaefer', id: 'kk_ziel', path: [[-5, Y, -221], [5, Y, -221]], count: 2, spacing: 1.6, color: 'yellow' },
    { kind: 'rammbock_bulle', id: 'bulle_ziel', pos: [-7, Y, -234], dir: [1, 0], sight: 7 },
  ],
  items: [
    // ---------------- Schlüsselmünzen (Gruppe tor → Warp-Box erscheint)
    key([CASTLE[0], Y + 4.6, CASTLE[2]], { id: 'schluessel_burg', onAll: { reveal: 'warp1' } }),
    key([16, Y + 0.2, 8], { id: 'schluessel_hain' }),
    key([K3ROCK.x, K3ROCK.top + 0.2, K3ROCK.z], { id: 'schluessel_fels' }),
    key([TOWER[0], Y + 3.4, TOWER[2]], { id: 'schluessel_turm' }),
    key([K5ROCK.x, K5ROCK.top + 0.2, K5ROCK.z], { id: 'schluessel_bullen' }),
    { kind: 'warpbox', id: 'warp1', pos: [1, Y, -23], target: 'warp2', hidden: true },
    { kind: 'warpbox', id: 'warp2', pos: [0, ISLE.top, -41], target: 'warp1' },
    // ---------------- Bitcoin-Pfade zu den Schlüsseln
    line([-2, Y + 0.6, 6.5], [-9, Y + 0.6, 0.5], 5),
    ...arc([-9.6, Y + 0.6, -0.6], [CASTLE[0] + 0.8, Y + 3.6, CASTLE[2] + 0.6], 4, 0.6),
    line([4, Y + 0.6, 8.5], [11, Y + 0.6, 8.5], 5),
    ring([16, Y + 1.2, 8], 2.2, 8),
    line([-14, Y + 0.6, -11.5], [-18.5, WT + 0.6, -19.5], 5),
    ...arc([-19.6, WT + 0.6, -21], [K3ROCK.x, K3ROCK.top + 0.7, K3ROCK.z], 4, 0.8),
    line([-22, Y + 0.6, 0], [TOWER[0], Y + 0.6, TOWER[2] + 4.2], 5),
    line([TOWER[0], Y + 1.4, TOWER[2] + 3.2], [TOWER[0], Y + 3.2, TOWER[2] + 1.6], 3),
    line([24, Y + 0.6, -6], [31, Y + 0.6, -6], 5),
    ...column(K5ROCK.x, K5ROCK.z + 1.8, Y + 0.8, K5ROCK.top + 0.6, 3),
    // Sandbank, Meeresloch
    line([0, Y + 0.6, -15.5], [0, Y + 0.6, -20.5], 4),
    ring([(HOLE.x0 + HOLE.x1) / 2, WT + 1.2, (HOLE.z0 + HOLE.z1) / 2], 1.6, 6),
    // Wandhöhle, Farbfeld-Raum
    line([48, Y + 0.6, 4.5], [48, Y + 0.6, 0.5], 4),
    ...arc([ROOM.x0 + 2.2, Y + 2.2, ROOM.z0 - 2.2], [ROOM.x0 + 6, Y + 0.6, ROOM.z0 - 4], 4, 0.8),
    // ---------------- 2 Schwebeinsel
    line([0, ISLE.top + 0.6, -43.5], [0, ISLE.top + 0.6, -51], 5),
    ring([-4, ISLE.top + 1, -49], 1.4, 6),
    // ---------------- 3 Grotte: Münzen im Fluss, Bogen zur Schanze, Stempel darüber
    ...riverCoins(-90, -100, 0, 1.2, 5),
    ...riverCoins(-114, -122, -1.4, 1.4, 5),
    ...riverArc(RAMP_Z - 1.6, RAMP_Z - 9.4, 0, 2.6, 6, 1.4),
    ...riverCoins(-150, -156, 1.6, -1.6, 4),
    ...riverCoins(-174, -184, -1, 1, 5),
    // Grottenstrand
    line([-2.5, DK + 0.6, -194], [2.5, DK + 0.6, -194], 4),
    // ---------------- 4 Zielinsel
    line([0, Y + 0.6, -219.5], [0, Y + 0.6, -232], 6),
    { kind: 'chest', id: 'truhe_leuchtturm', pos: [10.2, Y, -240.6], yaw: Math.PI, content: 'oneup' },
    // ---------------- Aufgabe in der Wandhöhle: alle Krabbelkäfer besiegt → Krümel gibt den Stern
    { kind: 'task', id: 'aufgabe_hoehle', area: { min: [CAVE.x0, Y - 0.5, CAVE.z1], max: [CAVE.x1, Y + CAVE.h, CAVE.z0] }, star: 2, pos: [49.6, Y + 1.0, CAVE.z1 + 4.2] },
  ],
  checkpoint: { pos: [0, ISLE.top, -45.5], yaw: Math.PI / 2 },
  stars: [
    { pos: [13.2, Y + 1.0, -1], hidden: true, id: 'stern_skulptur' },              // 0: rechte Sandskulptur
    { pos: [(ROOM.x0 + ROOM.x1) / 2 + 0.8, Y + 1.6, (ROOM.z0 + ROOM.z1) / 2 - 0.6], hidden: true, id: 'stern_farbfeld' },  // 1: Farbfeld-Raum
    { pos: [49.6, Y + 1.0, CAVE.z1 + 4.2], hidden: true, id: 'stern_hoehle' },          // 2: Wandhöhle (Krümel)
  ],
  stamp: STAMP,
  goal: { pos: [0, Y, -237], height: 9 },
  marks: {
    start: [0, Y, 10],
    castle: CASTLE, tower: TOWER, k3: [K3ROCK.x, K3ROCK.top, K3ROCK.z], k5: [K5ROCK.x, K5ROCK.top, K5ROCK.z],
    warp: [1, Y, -23], hole: [(HOLE.x0 + HOLE.x1) / 2, WT, (HOLE.z0 + HOLE.z1) / 2], room: [ROOM.x0 + 4, Y, ROOM.z0 - 3],
    cave: [48, Y, 3], isle: [0, ISLE.top, -45.5], dock: [0, DK, -72], raft: [0, 0, -84.5], ramp: XZ(RAMP_Z, 0),
    beachGrotto: [0, DK, -196], goalIsle: [0, Y, -218.5], goal: [0, Y, -235],
  },
};
