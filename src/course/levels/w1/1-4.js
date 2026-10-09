// 1-4 „Pflaumes Wildwasserfahrt“ (Archetyp ride, Thema river, Musik course_river) – Fluss-Ritt nach dem Bauplan:
// die Heldin reitet auf Pflaume, die auf einem großen Blatt-Floß paddelt; die Strömung trägt flussabwärts (−Z),
// Stick lenkt quer, A hüpft. Ca. 240 m Fluss + 30 m Absturz + Strand.
//   1 Start-Steg (z 20 … 4): Holzsteg in einer ruhigen Bucht, Pflaume wartet am Ende des Stegs (aufsteigen = hinlaufen).
//   2 Oberer Fluss (z 4 … −100): S-Kurven, Sprungrampe (Stern 1), Temposchwellen, Kaskade, Wühler, Felsgasse am
//     rechten Ufer mit Extraleben (nur mit genauem Steuern), Checkpoint am Ende.
//   3 Mittelteil (z −100 … −192): Gabelung – rechts Zickzack-Strömung mit 5 Kehren (Stempel am Ende in einer
//     Bucht rechts), links der Seitenarm mit dem bunten Wasserfall (Stern 2 in der Grotte dahinter). Stern 2 und
//     Stempel liegen auf verschiedenen Routen (gegen die Strömung kommt man nicht zurück).
//   4 Absturz (z −192 … −220): Schub zur Klippe, 30 m freier Fall in die Lagune (Stern 3 direkt an der Kante links).
//   5 Strand und Ziel (z −220 … −285): Lagune treibt ans Ufer, Absteigen, Röhre mit Zielmast.
// Wühler: 29 (Bauplan). Hilfsfunktionen legen alles relativ zur Flusskurve (RiverChannel wie im Spiel).

import { RiverChannel } from '../../archetypes/RiverNet.js';
import { riverBankHeight } from '../../blocks/types/river.js';

// ---------------------------------------------------------------- Flusskanäle [x, y (Oberfläche), z, Breite, Strömung]
const MAIN = [
  [0, 0, 18, 15, 1.2], [0, 0, 8, 14, 1.6], [0.3, 0, -2, 11, 4.6],
  [1.5, -0.1, -12, 10, 6.2], [2.5, -0.3, -24, 10, 6.5], [0, -0.5, -36, 10.5, 6.5], [-3.5, -0.7, -47, 10, 6.6],
  [-4, -0.8, -53, 10, 6.8], [-4, -1.9, -54.8, 10, 7.6], [-2, -2.1, -66, 10, 6.8], [3, -2.3, -78, 10, 6.6],
  [4, -2.5, -88, 10, 6.4], [1, -2.7, -98, 10.5, 6.0], [2, -2.9, -108, 8.5, 5.6],
  // Zickzack (5 Kehren)
  [7, -3.1, -118, 8, 5.4], [-5, -3.3, -130, 8, 5.4], [6, -3.5, -142, 8, 5.4], [-5, -3.7, -154, 8, 5.4], [5, -3.9, -166, 8, 5.4],
  [1, -4.1, -176, 8.5, 5.6], [0, -4.3, -188, 10, 6.0], [0, -4.5, -200, 10, 6.6], [0, -4.6, -210, 10.5, 7.2], [0, -4.7, -218, 11, 7.6],
];
const SIDE = [
  [0, -2.75, -101, 7, 5.6], [-5, -2.9, -110, 6.5, 5.6], [-13, -3.1, -120, 6, 5.4], [-20, -3.3, -131, 6.2, 5.0],
  [-21, -3.4, -140, 6.2, 5.0], [-20, -3.6, -152, 6, 5.2], [-16, -3.8, -164, 6, 5.4], [-11, -4.0, -176, 6.5, 5.6],
  [-4, -4.25, -186, 7, 5.8], [0, -4.37, -192, 8, 6.0],
];
const LAGOON = [[0, -34.7, -217.4, 11, 3.6], [0, -34.7, -221.5, 19, 3.3], [0, -34.7, -232, 27, 2.8], [0, -34.7, -244, 23, 2.4], [0, -34.7, -252, 17, 2.0]];
const LOW = -34.35;         // Strand/Ufer der Lagune
const LOWLAND = -35.3;      // Tiefland-Ebene (unter dem Lagunenwasser)

const main = new RiverChannel({ points: MAIN });
const side = new RiverChannel({ points: SIDE });
/** Bogenlänge s des Kanals bei z (Kanäle laufen stetig nach −Z). */
const sAt = (ch, z) => { const S = ch.S; let i = 0; while (i < S.length - 1 && S[i + 1].z > z) i++; const a = S[i], b = S[Math.min(S.length - 1, i + 1)]; const t = a.z === b.z ? 0 : (a.z - z) / (a.z - b.z); return a.s + (b.s - a.s) * Math.max(0, Math.min(1, t)); };
/** Punkt [x, y, z] im Kanal bei z mit Seitenlage lat (m, + = rechts) und Höhe dy über der Oberfläche. */
const P = (ch, z, lat = 0, dy = 0) => { const q = ch.at(sAt(ch, z)); return [+(q.x + q.rx * lat).toFixed(2), +(q.y + dy).toFixed(2), +(q.z + q.rz * lat).toFixed(2)]; };
const XZ = (ch, z, lat = 0) => { const p = P(ch, z, lat); return [p[0], p[2]]; };
const hwAt = (ch, z) => ch.at(sAt(ch, z)).w / 2;
/** Punkt auf dem Ufer (Seite +1 rechts / −1 links), off m hinter der Uferkante. */
const BANK = (ch, z, side, base, off = 1.2) => { const s = sAt(ch, z), q = ch.at(s), lat = side * (q.w / 2 + 1.05 + off); return [+(q.x + q.rx * lat).toFixed(2), +(q.y + riverBankHeight(base, s, side) - 0.02).toFixed(2), +(q.z + q.rz * lat).toFixed(2)]; };

// Wühler: an (z, lat), wandert abgetaucht quer (von lat−d bis lat+d), Takt-Versatz ph
const mole = (ch, z, lat, d, ph, o = {}) => ({
  kind: 'wuehler', ground: 'water', pos: P(ch, z, lat), path: d ? [P(ch, z, lat - d), P(ch, z, lat + d)] : undefined,
  speed: 1.3, phase: ph, hide: o.hide ?? 1.7, up: o.up ?? 1.3,
});
const coinLine = (ch, z0, z1, lat0, lat1, n, dy = 0.55) => {
  const out = [];
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); out.push({ kind: 'coin', pos: P(ch, z0 + (z1 - z0) * t, lat0 + (lat1 - lat0) * t, dy) }); }
  return out;
};
const coinArc = (ch, z0, z1, lat, h, n, dy0 = 0.6) => {
  const out = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push({ kind: 'coin', pos: P(ch, z0 + (z1 - z0) * t, lat, dy0 + h * Math.sin(Math.PI * t)) }); }
  return out;
};

const RAMP_Z = -15.5;
const CP_Z = -95;
const STAMP = P(main, -178.5, 3.15, 0.35);
const STAR2 = P(side, -137, 0, 0.45);
const EDGE_STAR = [-2.9, -4.95, -219.7];

export const LEVEL = {
  id: '1-4',
  world: 1,
  title: 'Pflaumes Wildwasserfahrt',
  archetype: 'ride',
  theme: 'river',
  music: 'course_river',
  timeLimit: 400,
  killY: -60,
  start: { pos: [0, 0.62, 12.5], yaw: Math.PI / 2 },
  ride: {
    raft: [0, 0, 5.4],
    raftYaw: -Math.PI / 2,     // Pflaume schaut der Heldin entgegen, dreht beim Aufsteigen um
    dock: { min: [-30, 6.2], max: [30, 45] },
    beach: { min: [-20, -300], max: [20, -244.5], land: [0, -34.3, -251.5], raft: [0, -34.7, -246] },
    footCamYaw: 0,
  },
  camera: [
    { from: 45, to: 3, pitch: 40, dist: 11.5, ahead: 2.5, height: 1 },
    { from: 3, to: -98, pitch: 36, dist: 11, ahead: 2.6, height: 1.0, fov: 42 },
    { from: -98, to: -188, pitch: 42, dist: 11.5, ahead: 2.4, height: 1.0, fov: 42 },
    { from: -188, to: -217, pitch: 36, dist: 11, ahead: 2.6, height: 1.0, fov: 42 },
    { from: -217, to: -247, pitch: 42, dist: 14, ahead: 3, height: 1.1, fov: 42 },
    { from: -247, to: -290, pitch: 41, dist: 11.5, ahead: 2, height: 1 },
  ],
  segments: [
    // ---------------- Fluss (alle Kanäle in einem Aufruf: Ufer öffnen sich an Gabelung und Mündung)
    {
      type: 'river',
      channels: [
        { id: 'main', points: MAIN, bank: { height: 2.1, out: 20 }, deco: 1 },
        { id: 'side', points: SIDE, bank: { height: 2.4, out: 16 }, deco: 1 },
        { id: 'lagoon', points: LAGOON, bank: { height: 0.45, out: 16 }, deco: 0.8 },
      ],
      lowland: { y: LOWLAND, trees: 36 },
      life: { butterflies: 34, dragonflies: 16 },
    },
    // ---------------- 1 Start-Steg: Bucht, Ufer hinter dem Becken, Holzsteg
    { type: 'island', pos: [0, -3, 30], size: [60, 3.62, 24], top: 'sand', under: 0 },
    { type: 'island', pos: [-17, -3, 21], size: [26, 5.1, 6], under: 0 },
    { type: 'island', pos: [17, -3, 21], size: [26, 5.1, 6], under: 0 },
    { type: 'river_deco', items: [
      { kind: 'dock', from: [0, 0.62, 18.5], to: [0, 0.62, 6.6], width: 2.4 },
      { kind: 'hut', pos: [-7, 0.62, 24], yaw: 0.4 }, { kind: 'totem', pos: [4.5, 0.62, 21], yaw: -0.3 },
      { kind: 'sign', pos: [2.2, 0.62, 18.4], yaw: Math.PI / 2 },
      { kind: 'palm', pos: [-3.5, 0.62, 21.5], size: 5.2, lean: 0.25, yaw: -1.2 }, { kind: 'palm', pos: [6.5, 0.62, 25], size: 5.6, lean: 0.2, yaw: 2.4 },
      { kind: 'palm', pos: [12, 0.62, 23], size: 4.8 }, { kind: 'palm', pos: [-12, 0.62, 27], size: 5 },
      { kind: 'fern', pos: [-1.8, 0.62, 19.6] }, { kind: 'bloom', pos: [2.4, 0.62, 23] }, { kind: 'bush', pos: [9, 0.62, 20.5] },
      { kind: 'reeds', pos: [-5.5, 0, 15.2] }, { kind: 'reeds', pos: [6, 0, 14.5] },
      { kind: 'lilies', pos: [-4.5, 11], r: 2.2, n: 8 }, { kind: 'lilies', pos: [5, 9], r: 1.8, n: 6 }, { kind: 'lilies', pos: [-3.5, 2], r: 1.4, n: 4 },
    ] },
    // ---------------- 2 Oberer Fluss
    { type: 'river_ramp', pos: XZ(main, RAMP_Z, 0), len: 4.6, wid: 3.4, h: 1.4, kick: 6 },
    { type: 'river_wave', pos: XZ(main, -31, -1.5), len: 3.2, wid: 3.4, boost: 4 },
    { type: 'river_wave', pos: XZ(main, -60, 0), len: 3.2, wid: 3.6, boost: 4 },
    { type: 'river_wave', pos: XZ(main, -84, -2), len: 3.2, wid: 3.4, boost: 4.5 },
    // Felsgasse rechts (Extraleben): Felsreihe, dahinter ein schmaler Durchlass am Ufer
    ...[-68, -71.5, -75, -78.5].map((z) => ({ type: 'riverrock', pos: XZ(main, z, 2.2), r: 0.95, h: 1.3 })),
    { type: 'riverrock', pos: XZ(main, -41, -3.4), r: 1.1, h: 1.5 },
    { type: 'riverrock', pos: XZ(main, -45, 3.6), r: 0.8, h: 1.1 },
    { type: 'riverrock', pos: XZ(main, -91, 3.2), r: 0.9, h: 1.2 },
    { type: 'river_deco', items: [
      { kind: 'lilies', pos: XZ(main, -8, -4.2), r: 0.9, n: 4 }, { kind: 'lilies', pos: XZ(main, -27, 4.1), r: 0.8, n: 3 },
      { kind: 'lilies', pos: XZ(main, -63, -4.2), r: 0.9, n: 4 }, { kind: 'sign', pos: BANK(main, -64, 1, 2.1, 0.6), yaw: Math.PI / 2 + 0.3 },
    ] },
    // ---------------- 3 Gabelung, Seitenarm mit buntem Wasserfall
    { type: 'riverrock', pos: XZ(side, -112.5, 4.4), r: 1.3, h: 1.8 },
    { type: 'river_deco', items: [
      { kind: 'sign', pos: BANK(main, -97, -1, 2.1, 0.6), yaw: Math.PI / 2 + 0.7 },
      { kind: 'lilies', pos: XZ(side, -146, -2.3), r: 0.8, n: 4 }, { kind: 'lilies', pos: XZ(side, -160, 2.3), r: 0.7, n: 3 },
      { kind: 'lilies', pos: XZ(main, -183, -4.2), r: 0.8, n: 3 },
    ] },
    { type: 'river_arch', pos: P(side, -135.5), span: 6.6, height: 4.4, depth: 3.2 },
    { type: 'river_fall', from: P(side, -134.1, 0, 4.25), to: P(side, -134.4, 0, 0), width: 6.2, lip: 0.4, rainbow: true },
    // Zickzack: Pfeile an den Kehren übernehmen die Schaumstreifen; Temposchwelle vor der Klippe
    { type: 'river_wave', pos: XZ(main, -206, 0), len: 3.4, wid: 4, boost: 3.5 },
    // ---------------- 4 Absturz: Klippe, großer Wasserfall, Lagune
    { type: 'river_cliff', from: [-26, -216.9], to: [26, -216.9], y0: LOWLAND - 0.5, y1: -4.85, depth: 2.4 },
    { type: 'river_fall', from: [0, -4.72, -218.05], to: [0, -34.7, -222.5], width: 11, lip: 1.6, mist: true },
    // ---------------- 5 Strand und Ziel
    { type: 'island', pos: [0, -37, -268], size: [44, 2.65, 38], top: 'sand', under: 0 },
    { type: 'island', pos: [-17, -37, -260], size: [10, 4.2, 22], under: 0 },
    { type: 'island', pos: [17, -37, -260], size: [10, 4.2, 22], under: 0 },
    { type: 'pipe', pos: [0, LOW, -264], height: 1.25, radius: 1.5, color: 'green' },
    { type: 'river_deco', items: [
      { kind: 'palm', pos: [-7, LOW, -255], size: 5.6, lean: 0.3, yaw: 0.3 }, { kind: 'palm', pos: [8, LOW, -257], size: 5.2, lean: 0.25, yaw: 2.6 },
      { kind: 'palm', pos: [-10, LOW, -270], size: 6 }, { kind: 'palm', pos: [11, LOW, -272], size: 5.4 },
      { kind: 'hut', pos: [7, LOW, -276], yaw: -0.5 }, { kind: 'totem', pos: [-5, LOW, -273], yaw: 0.4 },
      { kind: 'bloom', pos: [-3, LOW, -258] }, { kind: 'bloom', pos: [4, LOW, -268] }, { kind: 'fern', pos: [3.5, LOW, -254] },
      { kind: 'rock', pos: [-4.5, LOW, -262], size: 0.7 }, { kind: 'bush', pos: [-9, LOW, -264] },
      { kind: 'lilies', pos: [-9, -236], r: 2, n: 7 }, { kind: 'lilies', pos: [9.5, -240], r: 2, n: 6 }, { kind: 'reeds', pos: [-11, -34.7, -244] },
    ] },
  ],
  enemies: [
    // Oberer Fluss (11)
    mole(main, -24, -2, 2, 0.1), mole(main, -36, 2.5, 1.5, 0.55), mole(main, -44, 0, 2.5, 0.3), mole(main, -50, -2.5, 1, 0.8),
    mole(main, -58, 2.2, 1.5, 0.45), mole(main, -63, -1.5, 2, 0.05), mole(main, -73, -1.8, 1.5, 0.6), mole(main, -80, -3, 1, 0.25),
    mole(main, -86, 1.5, 2, 0.75), mole(main, -92, -1, 2, 0.4), mole(main, -97, 2.5, 1, 0.9),
    // Zickzack (8)
    mole(main, -116, 0, 1.5, 0.2), mole(main, -125, -1, 1.5, 0.65), mole(main, -136, 1, 1.5, 0.35), mole(main, -147, 0, 1.5, 0.85),
    mole(main, -152, -1.5, 1, 0.1), mole(main, -160, 1, 1.5, 0.5), mole(main, -168, -1, 1.5, 0.3), mole(main, -173, 1.5, 1, 0.75),
    // nach der Mündung bis zur Kante (3)
    mole(main, -195, -2.5, 1.5, 0.4), mole(main, -201, 2.5, 1.5, 0.1), mole(main, -212, 0, 2, 0.6),
    // Seitenarm (4)
    mole(side, -124, 0, 1.5, 0.3), mole(side, -146, 1, 1.2, 0.7), mole(side, -158, -1, 1.2, 0.15), mole(side, -170, 0.5, 1.5, 0.5),
    // Lagune (3)
    { kind: 'wuehler', ground: 'water', pos: [-6, -34.7, -236], path: [[-8, -34.7, -236], [-3, -34.7, -238]], speed: 1, phase: 0.3 },
    { kind: 'wuehler', ground: 'water', pos: [6, -34.7, -232], path: [[4, -34.7, -230], [8, -34.7, -233]], speed: 1, phase: 0.7 },
    { kind: 'wuehler', ground: 'water', pos: [1, -34.7, -240], path: [[-1, -34.7, -240], [3, -34.7, -241]], speed: 1, phase: 0.05 },
  ],
  items: [
    // Startbucht und Rampe
    ...coinLine(main, -3, -11, 0, 1, 4),
    ...coinArc(main, RAMP_Z - 2.6, RAMP_Z - 8.5, 0, 2.1, 5, 1.2),
    // Wellen: Münzen auf der Ideallinie
    ...coinLine(main, -27, -35, -1.5, -1.5, 4),
    ...coinLine(main, -55, -62, 0, 0, 4),
    // Felsgasse rechts mit Extraleben (Pilz schwebt, wandert nicht)
    ...coinLine(main, -66.5, -79, 4.05, 4.05, 5),
    { kind: 'powerup', power: 'oneup', pos: P(main, -73.25, 4.05, 0.4), speed: 0 },
    ...coinLine(main, -85, -90, -2, -2, 3),
    // Zickzack: Münzen in den Kehren (Innenkurve)
    ...coinLine(main, -120, -124, -1.5, -1.5, 3), ...coinLine(main, -132, -136, 1.5, 1.5, 3), ...coinLine(main, -144, -148, -1.5, -1.5, 3),
    ...coinLine(main, -156, -160, 1.5, 1.5, 3), ...coinLine(main, -168, -171, -1.2, -1.2, 2),
    // Wachstumsbeere nach dem Checkpoint (wer klein ist, wird wieder groß)
    { kind: 'powerup', power: 'wachstumsbeere', pos: P(main, -103, -1.5, 0.35), speed: 0 },
    // Seitenarm: Münzbogen vor dem Wasserfall
    ...coinLine(side, -118, -128, 0, 0, 5),
    ...coinLine(side, -150, -170, 0.8, -0.8, 6),
    // Absturz: Münzen fallen mit
    ...coinLine(main, -196, -212, 0, 0, 5),
    { kind: 'coins', pos: [0, -24, -229], r: 1.6, n: 6 },
    // Strand
    ...[-4, -2, 2, 4].map((x) => ({ kind: 'coin', pos: [x, LOW, -258] })),
  ],
  checkpoint: [{ pos: BANK(main, CP_Z, 1, 2.1, 1.4), yaw: Math.PI / 2 }],
  stars: [
    P(main, RAMP_Z - 5.2, 0, 2.45),   // 1: über der Rampe kurz nach dem Start
    STAR2,                             // 2: in der Grotte hinter dem bunten Wasserfall (Seitenarm)
    EDGE_STAR,                         // 3: direkt an der Klippenkante (links)
  ],
  stamp: STAMP,                        // Bucht rechts am Ende der Zickzack-Strecke
  goal: { pos: [0, LOW + 1.25, -264], height: 7 },
  marks: {
    start: [0, 0.62, 12.5], raft: [0, 0, 5.4], ramp: P(main, RAMP_Z + 6, 0), fork: P(main, -98, 0), zigzag: P(main, -112, 0),
    side: P(side, -112, 0), stamp: STAMP, star2: STAR2, edge: P(main, -212, 0), edgeStar: EDGE_STAR, lagoon: [0, -34.7, -230],
    beach: [0, LOW, -252], goal: [0, LOW + 1.25, -264], cp: P(main, CP_Z, 0), passage: P(main, -66, 4.05), moleA: P(main, -44, 0),
    hwMain: hwAt(main, -50),
  },
};
