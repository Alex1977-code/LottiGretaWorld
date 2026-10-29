// 8-2 „Pflaumes Dünenrutsche“ (Archetyp ride, Thema dunes, Musik course_dunes) – Wüsten-Abfahrt auf Pflaume (Bauplan 8-2,
// eigene Umsetzung): Die Heldin steigt auf Pflaumes Blatt, und der Sandstrom trägt beide eine lange Düne hinab (−Z, ≈ 29 m
// tiefer); Stick lenkt quer und bremst/beschleunigt, A hüpft. Das Ritt-Netz (Baustein river, Form A) ist hier Sand:
// lokale Farbvariante (LEVEL.prebuild), matte Sandfläche und Sandschlieren (LEVEL.setup, _helpers_a.js).
//   1 Dünenkamm (z 44 … 6): Sandstein-Plateau mit Holzsteg, Palmen, Kakteen; Pflaume wartet im Sand.
//   2 Startmulde (z 6 … −24): breite, langsame Mulde; der funkelnde Stern-Sandflosser springt quer hin und her – rote
//     Schattenmarke zeigt die Landestelle (Stern 1: im richtigen Moment von oben auf ihn hüpfen).
//   3 Erste Abfahrt (z −24 … −110): S-Kurven, Schubfelder, Pilzling-Sandskulpturen (rammen → Münzen), Sandflosser; Checkpoint.
//   4 Käferschlucht (z −110 … −142): Schubfeld und Holzrampe; hinter der Rampe flattert der Flatterkäfer mit dem Stern
//     (Stern 2: Rampe mit gehaltener Sprungtaste, von oben auf den Käfer).
//   5 Zweite Abfahrt (z −142 … −226): schneller; links zweigt der Felsentor-Arm ab (Sandsteinbogen, Münzen, Extraleben);
//     Checkpoint vor dem Statuenfeld.
//   6 Statuenfeld (z −226 … −292): breite Sandebene mit Baron-Sandstatuen zum Umreiten (rammen → Münzen); die große Statue
//     kurz vor dem Ende trägt den Stern (Stern 3: zerbröseln, der Stern fällt vor Pflaume in den Strom).
//   7 Oase (z −292 … −346): Absteigen am Strand; drei Baron-Statuen, dazwischen unsichtbare Wolken (Münzen schweben
//     darüber) hinauf zum ?-Block mit dem Stempel; Extraleben im unsichtbaren Block; Zielmast.
// Sterne, die in den Sand fallen, treiben mit dem Strom (sandStrom) – verpasst man einen, holt man ihn mit Bremsen ein.

import { RiverChannel } from '../../archetypes/RiverNet.js';
import { riverBankHeight } from '../../blocks/types/river.js';
import { isl, duenenThema, sandAnsicht, sandStrom, stempelBlock, sandDunst } from './_helpers_a.js';

const Y0 = 20;                 // Sandstrom am Start
const BANK_H = 2.6;            // Dünenkämme links und rechts
const YB = -8.15;              // Oase (Strand) – 0,35 m über dem Strom-Ende
const LOWLAND = -14;

// ---------------------------------------------------------------- Sandstrom [x, y (Oberfläche), z, Breite, Tempo m/s]
const MAIN = [
  [0, Y0, 16, 17, 1.6], [0, Y0, 6, 18, 1.9], [0, Y0 - 0.05, -4, 19, 2.0], [0, Y0 - 0.15, -14, 18, 2.3],
  [0.5, Y0 - 0.4, -24, 14, 3.2], [1.5, Y0 - 1.2, -33, 11, 4.8],
  // erste Abfahrt
  [3, 17.4, -43, 10, 6.0], [0, 15.8, -54, 10, 6.4], [-4.5, 14.1, -65, 10.5, 6.6], [-3, 12.5, -77, 11, 6.6],
  [3, 10.9, -89, 11, 6.4], [4.5, 9.7, -99, 12, 5.6], [2, 8.9, -109, 13, 5.0],
  // Käferschlucht
  [0, 8.45, -119, 12, 5.2], [0, 8.1, -130, 12, 5.0], [-1.5, 7.3, -141, 11, 5.6],
  // zweite Abfahrt
  [-3.5, 5.7, -152, 10, 6.4], [-1, 3.9, -163, 10, 7.0], [4, 1.9, -175, 10, 7.2], [5, -0.1, -187, 10, 7.2],
  [0, -2.0, -199, 10.5, 7.0], [-4, -3.6, -211, 11, 6.6], [-2, -4.9, -222, 14, 5.8],
  // Statuenfeld
  [0, -5.7, -233, 20, 5.2], [0, -6.5, -246, 24, 5.0], [0, -7.3, -260, 24, 4.8], [0, -7.9, -274, 22, 4.6],
  [0, -8.3, -286, 18, 3.8], [0, -8.5, -296, 16, 2.4],
];
/** Oberfläche des Hauptstroms bei z (linear zwischen den Punkten). */
const yMain = (z) => {
  for (let i = 0; i < MAIN.length - 1; i++) {
    const a = MAIN[i], b = MAIN[i + 1];
    if (z <= a[2] && z >= b[2]) return a[1] + (b[1] - a[1]) * ((a[2] - z) / (a[2] - b[2]));
  }
  return z > MAIN[0][2] ? MAIN[0][1] : MAIN[MAIN.length - 1][1];
};
// Felsentor-Arm (links): zweigt bei z −159 ab, mündet bei z −208 wieder ein
const ARM = [[-2.5, -159, 7, 6.0], [-8, -167, 6.5, 6.0], [-14, -177, 6, 5.6], [-16.5, -187, 6, 5.4], [-13, -197, 6.5, 5.8],
  [-6.5, -204, 7, 6.2], [-3, -208, 8, 6.4]].map(([x, z, w, v]) => [x, +yMain(z).toFixed(2), z, w, v]);

const main = new RiverChannel({ points: MAIN });
const arm = new RiverChannel({ points: ARM });
/** Bogenlänge s des Kanals bei z (Kanäle laufen stetig nach −Z). */
const sAt = (ch, z) => { const S = ch.S; let i = 0; while (i < S.length - 1 && S[i + 1].z > z) i++; const a = S[i], b = S[Math.min(S.length - 1, i + 1)]; const t = a.z === b.z ? 0 : (a.z - z) / (a.z - b.z); return a.s + (b.s - a.s) * Math.max(0, Math.min(1, t)); };
/** Punkt [x, y, z] im Kanal bei z mit Seitenlage lat (m, + = rechts) und Höhe dy über der Oberfläche. */
const P = (ch, z, lat = 0, dy = 0) => { const q = ch.at(sAt(ch, z)); return [+(q.x + q.rx * lat).toFixed(2), +(q.y + dy).toFixed(2), +(q.z + q.rz * lat).toFixed(2)]; };
const XZ = (ch, z, lat = 0) => { const p = P(ch, z, lat); return [p[0], p[2]]; };
/** Punkt auf dem Dünenkamm (Seite +1 rechts / −1 links), off m hinter der Kante. */
const BANK = (ch, z, side, off = 1.2, base = BANK_H) => { const s = sAt(ch, z), q = ch.at(s), lat = side * (q.w / 2 + 1.05 + off); return [+(q.x + q.rx * lat).toFixed(2), +(q.y + riverBankHeight(base, s, side) - 0.02).toFixed(2), +(q.z + q.rz * lat).toFixed(2)]; };

// ---------------------------------------------------------------- Bausteine/Gegner relativ zum Strom
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
/** Sandflosser quer zum Strom (springt zwischen lat ± d/2 hin und her bzw. pendelt unter dem Sand). */
const flosser = (id, ch, z, lat, o = {}) => {
  const p = P(ch, z, lat);
  const s = sAt(ch, z), q = ch.at(s);
  return { kind: 'sandflosser', id, pos: p, dir: [+q.rx.toFixed(3), +q.rz.toFixed(3)], every: 3.2, ...o };
};
/** Baron-Sandstatue im Strom: Sockel im Sand versenkt (die Figur steht auf der Oberfläche). */
const statue = (id, ch, z, lat, size = 1, o = {}) => ({ kind: 'baron_sandstatue', id, pos: P(ch, z, lat, -1.0 * size), size, ...o });
const skulptur = (id, ch, z, lat, o = {}) => ({ kind: 'pilzling_sandskulptur', id, pos: P(ch, z, lat), height: 2.6, content: { coins: 3 }, ...o });
const schub = (id, ch, z, lat, color = 'gold', o = {}) => ({ type: 'schubfeld', id, pos: P(ch, z, lat), size: [3.4, 4], boost: 4.5, color, ...o });

const RAMP_Z = -121.5;
const KAEFER_Z = -129.6;
const STAR_STATUE_LAT = 7;
const CP1_Z = -105, CP2_Z = -217;
const STAR_STATUE_Z = -272;
// Oase: drei Statuen, unsichtbare Wolken dazwischen, ?-Block mit Stempel
const WOLKEN = [[-3, YB + 2.2, -317.6], [0, YB + 4.4, -319.6], [3, YB + 6.6, -317.6], [0, YB + 8.8, -315.6]];
const QBLOCK = [0, YB + 8.8 + 1.65, -315.6];
const STAMP = [0, QBLOCK[1] + 1.05, -315.6];

// ---------------------------------------------------------------- Kulisse entlang des Stroms (deterministisch)
const KAKTUS = ['saeule', 'kugel', 'feige', 'gruppe'];
const UFER = (() => {
  const palmen = [], kakteen = [], wimpel = [];
  let i = 0;
  for (let z = -30; z > -292; z -= 11) {
    i++;
    for (const side of [-1, 1]) {
      if (side < 0 && z < -150 && z > -214) continue;          // links liegt hier der Felsentor-Arm
      const zz = z + side * 2.2, k = (i * 5 + (side > 0 ? 2 : 0)) % 6;
      if (k === 0 || k === 3) palmen.push({ kind: 'palm', pos: BANK(main, zz, side, 1.4 + (i % 3) * 0.8), size: 4.2 + (i % 4) * 0.5, lean: 0.28, yaw: side > 0 ? 2.6 + (i % 3) * 0.3 : -0.4 - (i % 3) * 0.3 });
      else kakteen.push({ kind: 'kaktus', pos: BANK(main, zz, side, 1.8 + (i % 4) * 0.9), variant: KAKTUS[(i + k) % 4], size: 0.9 + (i % 3) * 0.2, yaw: i * 1.3 });
      if (i % 3 === side + 1) kakteen.push({ kind: 'ruine', pos: BANK(main, zz - 3, side, 7 + (i % 4) * 2), height: 2.2 + (i % 3) * 0.8 });
      if (i % 4 === 1) palmen.push({ kind: 'bloom', pos: BANK(main, zz + 1.5, side, 0.9) });
    }
  }
  // Seitenarm: Kakteen und Palmen auf dem Kamm zwischen den Strömen und links außen
  for (const [z, side, palm] of [[-170, 1, true], [-182, 1, false], [-194, 1, true], [-168, -1, false], [-180, -1, true], [-196, -1, false]]) {
    if (palm) palmen.push({ kind: 'palm', pos: BANK(arm, z, side, 1.2), size: 4.4, lean: 0.3, yaw: side > 0 ? 2.8 : -0.6 });
    else kakteen.push({ kind: 'kaktus', pos: BANK(arm, z, side, 1.6), variant: 'saeule', size: 1.1 });
  }
  // Wimpelketten quer über den Strom (Schubfelder, Kontrollpunkte, Statuenfeld)
  for (const z of [-36, -84, CP1_Z + 2, -166, CP2_Z + 2, -238, -284]) {
    const a = BANK(main, z, -1, 0.4), b = BANK(main, z, 1, 0.4), y = +(Math.max(a[1], b[1]) + 3.4).toFixed(2);
    wimpel.push({ kind: 'wimpel', from: [a[0], y, a[2]], to: [b[0], y, b[2]], sag: 1.1 });
  }
  return { palmen, kakteen, wimpel };
})();
/** Große Dünen auf der Tiefebene beiderseits der Abfahrt. */
const DUENEN = [[-12, -1], [-40, 1], [-75, -1], [-110, 1], [-150, -1], [-190, 1], [-230, -1], [-262, 1]]
  .map(([z, side], i) => { const q = P(main, z, side * (34 + (i % 3) * 8)); return { kind: 'duene', pos: [q[0], LOWLAND, q[2]], size: 2.4 + (i % 4) * 0.5, seed: 10 + i, yaw: side > 0 ? -1.4 + (i % 3) * 0.3 : 1.6 - (i % 3) * 0.3 }; });

export const LEVEL = {
  id: '8-2',
  world: 8,
  title: 'Pflaumes Dünenrutsche',
  archetype: 'ride',
  theme: 'dunes',
  music: 'course_dunes',
  timeLimit: 400,
  killY: -60,
  // Leistung: ferne Gegner/Sandfiguren nicht zeichnen, Münzen ohne Schatten (Präzisierung Leistung und Level-Haken 2)
  farHide: 48,
  instances: {
    baron_sandstatue: { farHide: 46, shadowDist: 10 }, pilzling_sandskulptur: { farHide: 46, shadowDist: 20 },
    sandflosser: { farHide: 46, shadowDist: 20 }, coin: { farHide: 46, shadow: false },
  },
  start: { pos: [0, Y0 + 0.62, 23], yaw: Math.PI / 2 },
  ride: {
    raft: [0, Y0, 5.4],
    raftYaw: -Math.PI / 2,     // Pflaume schaut der Heldin entgegen, dreht beim Aufsteigen um
    dock: { min: [-30, 6.2], max: [30, 50] },
    beach: { min: [-26, -350], max: [26, -290.5], land: [0, YB + 0.05, -299.5], raft: [0, -8.5, -294] },
    footCamYaw: 0,
  },
  prebuild: (level) => duenenThema(level),
  // Oase: unsichtbare Leitplanken an den Rändern (zurück in den Sandstrom bzw. über die Kante geht es zu Fuß nicht)
  build: (level) => {
    for (const [min, max] of [[[-26, YB - 1, -293.9], [26, YB + 4, -293.5]], [[-26.4, YB - 1, -346], [-26, YB + 4, -293.5]],
      [[26, YB - 1, -346], [26.4, YB + 4, -293.5]], [[-26, YB - 1, -346.4], [26, YB + 4, -346]]]) {
      level.world.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, tag: 'oasenrand' });
    }
  },
  setup: (level, scene) => {
    sandAnsicht(level, scene);
    sandDunst(level, { dist: 106, near: 40, far: 160 });
    sandStrom(level);
    stempelBlock(level, QBLOCK);
  },
  camera: [
    { from: 60, to: 4, pitch: 22, dist: 12.5, ahead: 3, height: 2.2 },
    { from: 4, to: -26, pitch: 30, dist: 12.5, ahead: 2.6, height: 1.5, fov: 44 },
    { from: -26, to: -110, pitch: 27, dist: 11, ahead: 3, height: 1.3, fov: 44 },
    { from: -110, to: -142, pitch: 25, dist: 11.5, ahead: 2.8, height: 1.7, fov: 44 },
    { from: -142, to: -226, pitch: 27, dist: 11, ahead: 3, height: 1.3, fov: 44 },
    { from: -226, to: -291, pitch: 30, dist: 12.5, ahead: 3.2, height: 1.4, fov: 44 },
    { from: -291, to: -360, pitch: 21, dist: 12.5, ahead: 2.5, height: 2.8 },
  ],
  segments: [
    // ---------------- Sandstrom (beide Kanäle in einem Aufruf: Dünenkämme öffnen sich an Gabelung und Mündung)
    {
      type: 'river',
      channels: [
        { id: 'main', points: MAIN, bank: { height: BANK_H, out: 22 }, deco: 0 },
        { id: 'arm', points: ARM, bank: { height: BANK_H, out: 14 }, deco: 0 },
      ],
      lowland: { y: LOWLAND, trees: 0 },
      life: { butterflies: 26, dragonflies: 0 },
    },
    // ---------------- 1 Dünenkamm: Sandstein-Plateau, Holzsteg unter dem Rummel-Torbogen, Rahmen der Startmulde
    isl(-30, 30, 15.6, 44, Y0 + 0.62, 4, { top: 'grass' }),
    isl(-30, -8.6, 15.6, 22, Y0 + BANK_H, 5, { top: 'grass' }),
    isl(8.6, 30, 15.6, 22, Y0 + BANK_H, 5, { top: 'grass' }),
    { type: 'river_deco', items: [
      { kind: 'dock', from: [0, Y0 + 0.62, 17.5], to: [0, Y0 + 0.62, 6.8], width: 2.4 },
      { kind: 'sign', pos: [2.2, Y0 + 0.62, 18.6], yaw: Math.PI / 2 },
      { kind: 'palm', pos: [-4.6, Y0 + 0.62, 21.5], size: 5.2, lean: 0.25, yaw: -1.2 }, { kind: 'palm', pos: [6.5, Y0 + 0.62, 25], size: 5.6, lean: 0.2, yaw: 2.4 },
      { kind: 'palm', pos: [-11, Y0 + 0.62, 28], size: 5 }, { kind: 'palm', pos: [12.5, Y0 + BANK_H, 19.5], size: 4.6, lean: 0.3, yaw: 0.6 },
      { kind: 'palm', pos: [-12.5, Y0 + BANK_H, 18.8], size: 4.8, lean: 0.3, yaw: 2.2 },
      { kind: 'bloom', pos: [2.6, Y0 + 0.62, 23] }, { kind: 'bloom', pos: [-2.8, Y0 + 0.62, 24.5] },
    ] },
    { type: 'deco_w2', items: [
      { kind: 'kakteen', pos: [-16, Y0 + 0.62, 33], size: [16, 10], n: 4, seed: 82 },
      { kind: 'kakteen', pos: [17, Y0 + 0.62, 33], size: [14, 10], n: 4, seed: 83 },
      { kind: 'ruine', pos: [9, Y0 + 0.62, 21], height: 2.6 }, { kind: 'ruine', pos: [-9, Y0 + 0.62, 25], height: 3.2 },
      { kind: 'kaktus', pos: [-6.5, Y0 + 0.62, 17.6], variant: 'gruppe', size: 1.1 },
      { kind: 'pyramide', pos: [0, Y0 + 0.62, 40], size: 9, steps: 5 },
    ] },
    { type: 'deco_w8', items: [
      { kind: 'torbogen', pos: [0, Y0 + 0.62, 16.2], width: 5.6, height: 4.6, yaw: Math.PI / 2 },
      { kind: 'bude', pos: [-8.5, Y0 + 0.62, 30], width: 3.4, color: 'rot', yaw: -Math.PI / 2 + 0.3 },
      { kind: 'bude', pos: [8.5, Y0 + 0.62, 30.5], width: 3.4, color: 'blau', yaw: -Math.PI / 2 - 0.3 },
      { kind: 'wimpel', from: [-2.8, Y0 + 4.9, 16.2], to: [-10.5, Y0 + 4.9, 22], sag: 0.8 },
      { kind: 'wimpel', from: [2.8, Y0 + 4.9, 16.2], to: [10.5, Y0 + 4.9, 22], sag: 0.8 },
      { kind: 'ballons', pos: [5.6, Y0 + 0.62, 20.5], n: 5, height: 3.2, color: 'gelb' },
    ] },
    // Dünenmeer ringsum (Kulisse auf der Tiefebene), Pyramiden und Tafelberge in der Ferne
    { type: 'deco_w8', castShadow: false, items: DUENEN },
    { type: 'deco_w2', castShadow: false, items: [
      { kind: 'pyramide', pos: [-62, LOWLAND, -120], size: 22, steps: 7, yaw: 0.3 },
      { kind: 'pyramide', pos: [70, LOWLAND, -40], size: 18, steps: 6, yaw: -0.2 },
      { kind: 'pyramide', pos: [58, LOWLAND, -250], size: 20, steps: 7, yaw: 0.5 },
      { kind: 'felsen', pos: [-70, LOWLAND, -250], size: [40, 60], n: 5, height: [8, 18], seed: 828 },
      { kind: 'felsen', pos: [80, LOWLAND, -150], size: [30, 70], n: 4, height: [8, 16], seed: 829 },
    ] },
    // Dünenkämme: Palmen, Kakteen, Ruinen; bunte Wimpelketten über dem Strom
    { type: 'river_deco', items: UFER.palmen },
    { type: 'deco_w2', castShadow: false, items: UFER.kakteen },
    { type: 'deco_w8', castShadow: false, items: UFER.wimpel },
    // ---------------- 2–6 Schubfelder, Rampe
    schub('schub1', main, -36, 0, 'rosa'),
    schub('schub2', main, -84, -1, 'tuerkis'),
    schub('schub3', main, -114.5, 0, 'gold'),
    schub('schub4', main, -166, 1, 'rosa'),
    schub('schub5', main, -226, 0, 'tuerkis'),
    { type: 'river_ramp', pos: XZ(main, RAMP_Z, 0), len: 4.5, wid: 3.4, h: 1.4, kick: 6 },
    // ---------------- 5 Felsentor im Seitenarm (Sandsteinbogen über dem Strom)
    { type: 'deco_w2', items: [
      { kind: 'bogen', pos: P(arm, -186.5, 0, -0.1), width: 7.6, height: 4.6, thickness: 1.2, yaw: Math.PI / 2 + 0.25 },
    ] },
    // ---------------- 7 Oase (zu Fuß): Strand rund um das Becken
    isl(-6, 26, -293.6, -346, YB, 6, { top: 'grass' }),
    isl(-26, -6, -293.6, -302.6, YB, 6, { top: 'grass' }),
    isl(-26, -6, -313.4, -346, YB, 6, { top: 'grass' }),
    isl(-26, -18, -302.6, -313.4, YB, 6, { top: 'grass' }),
    { type: 'oase', pos: [-12, YB, -308], size: [8, 6.8], depth: 1.4, rim: 2, base: 1, palms: [[-17.2, -303.6, 5.2], [-6.8, -304, 4.6], [-16.8, -312.6, 4.4]] },
    ...WOLKEN.map(([x, y, z], i) => ({ type: 'wolkenlift', id: `wolke${i}`, pos: [x, y - 0.55, z], width: 2.8, reveal: 'touch' })),
    { type: 'deco_w2', items: [
      { kind: 'palmen', pos: [17, YB, -312], size: [10, 18], n: 2, seed: 821 },
      { kind: 'kakteen', pos: [18, YB, -336], size: [10, 12], n: 3, seed: 822 },
      { kind: 'duenen', pos: [0, YB, -343], size: [48, 5], n: 6, height: [0.8, 1.8], seed: 825 },
    ] },
    { type: 'deco_w8', items: [
      { kind: 'torbogen', pos: [0, YB, -331], width: 6, height: 5, yaw: Math.PI / 2 },
      { kind: 'wimpel', from: [-3, YB + 5.2, -331], to: [-11, YB + 5.2, -336], sag: 0.9 },
      { kind: 'wimpel', from: [3, YB + 5.2, -331], to: [11, YB + 5.2, -336], sag: 0.9 },
      { kind: 'bude', pos: [10.5, YB, -303], width: 3.2, color: 'gelb', yaw: -Math.PI / 2 - 0.5 },
      { kind: 'picknick', pos: [6.5, YB, -307.5], size: 2.6 },
      { kind: 'ballons', pos: [3.6, YB, -339], n: 5, height: 3.2, color: 'blau' },
      { kind: 'duene', pos: [-38, YB - 4, -318], size: 2.2, seed: 3, yaw: 1.2 },
      { kind: 'duene', pos: [40, YB - 4, -322], size: 2.4, seed: 4, yaw: -1.4 },
      { kind: 'duene', pos: [0, YB - 5, -362], size: 3, seed: 5, yaw: 0.1 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: QBLOCK, content: 'coin' },          // Stoß → Stempel steigt heraus (stempelBlock)
    { kind: 'hidden', pos: [7, YB + 2.6, -333], content: 'oneup' },
  ],
  enemies: [
    // 2 Startmulde: Stern-Sandflosser (springt quer hin und her)
    flosser('sf_stern', main, -10, 0, { jump: 4.4, every: 2.7, height: 2.2, flight: 1.1, warn: 0.9, star: 0 }),
    // 3 erste Abfahrt
    flosser('sf1', main, -47, 0, { dist: 6, every: 3.0, phase: 0.2 }),
    flosser('sf2', main, -70, 1, { aim: true, sight: 11, every: 3.4, phase: 0.5 }),
    flosser('sf3', main, -94, 0, { dist: 7, every: 3.0, phase: 0.7 }),
    // 5 zweite Abfahrt und Felsentor-Arm
    flosser('sf4', main, -171, 0, { aim: true, sight: 11, every: 3.4, phase: 0.1 }),
    flosser('sf5', main, -191, 0, { dist: 6, every: 2.9, phase: 0.45 }),
    flosser('sf6', main, -210, 0, { aim: true, sight: 10, every: 3.6, phase: 0.8 }),
    flosser('sf_arm', arm, -178, 0, { dist: 4, every: 3.2, phase: 0.3 }),
    // 6 Statuenfeld
    { kind: 'sandflosser', id: 'sf7', pos: P(main, -243, 0), center: P(main, -243, 0), radius: 4, every: 3.4, jump: 4, phase: 0.6 },
    flosser('sf8', main, -262, 2, { aim: true, sight: 10, every: 3.6, phase: 0.3 }),
    // 4 Flatterkäfer mit Stern links hinter der Rampe (pendelt 2,3 m über dem Sand): nur mit der Rampe erreichbar, in der
    //   Luft nach links lenken – wer geradeaus springt, fliegt an ihm vorbei
    { kind: 'flatterkaefer', id: 'kaefer_stern', path: [P(main, KAEFER_Z, -3.4, 2.3), P(main, KAEFER_Z, -1.9, 2.3)], speed: 0.8, star: 1, color: 'pink' },
    // Sandfiguren im Strom (rammen → zerbröseln, Münzen)
    skulptur('sk1', main, -40, -2.6), skulptur('sk2', main, -59, 2.4), skulptur('sk3', main, -80, -2.4), skulptur('sk4', main, -101, 3),
    skulptur('sk5', main, -181, -2.2), skulptur('sk6', main, -203, 2.6),
    statue('st1', main, -236, -5, 1.0, { content: { coins: 2 } }), statue('st2', main, -241, 5, 1.1, { content: { coins: 2 } }),
    statue('st3', main, -249, -1.5, 1.2, { content: { coins: 2 } }),
    statue('st5', main, -256, 6.5, 1.1, { content: { coins: 2 } }), statue('st6', main, -264, -4.5, 1.2, { content: { coins: 2 } }),
    statue('st8', main, -280, -6, 1.0, { content: { coins: 2 } }),
    // Stern 3: große Statue kurz vor dem Ende – der Stern fällt vor Pflaume in den Strom
    statue('st_stern', main, STAR_STATUE_Z, STAR_STATUE_LAT, 1.4, { star: { index: 2, pos: P(main, STAR_STATUE_Z - 2.5, STAR_STATUE_LAT, 2.8) } }),
    // 7 Oase (zu Fuß): drei Statuen, dazwischen die unsichtbaren Wolken
    { kind: 'baron_sandstatue', id: 'oase_a', pos: [-7.5, YB, -319], size: 1.0 },
    { kind: 'baron_sandstatue', id: 'oase_b', pos: [0, YB, -325], size: 1.3 },
    { kind: 'baron_sandstatue', id: 'oase_c', pos: [7.5, YB, -319], size: 1.0 },
  ],
  items: [
    // Startmulde: Münzring um den Stern-Sandflosser, Münzen zum Hals
    { kind: 'coins', pos: P(main, -10, 0, 0.6), r: 3.2, n: 8 },
    ...coinLine(main, -18, -28, 0, 0.5, 4),
    // erste Abfahrt: Ideallinien
    ...coinLine(main, -33, -38, 0, 0, 3), ...coinLine(main, -50, -56, -1.5, -1.5, 3), ...coinLine(main, -63, -69, -2, -2, 3),
    ...coinLine(main, -86, -91, -1, -1, 3), ...coinLine(main, -96, -100, 1.5, 1.5, 2),
    // Käferschlucht: Bogen über die Rampe
    ...coinLine(main, -110, -116, 0, 0, 3),
    ...coinArc(main, RAMP_Z - 2.6, RAMP_Z - 9, 0, 1.8, 5, 1.6),
    // zweite Abfahrt
    ...coinLine(main, -148, -156, -1.5, -1.5, 4), ...coinLine(main, -170, -176, 2, 2, 3), ...coinLine(main, -194, -199, -1, -1, 3),
    // Felsentor-Arm: Münzen und Extraleben unter dem Bogen
    ...coinLine(arm, -164, -174, 0, 0, 5), ...coinLine(arm, -190, -200, 0, 0, 5),
    { kind: 'powerup', power: 'oneup', pos: P(arm, -186.5, 0, 0.4), speed: 0 },
    // Statuenfeld
    ...coinLine(main, -230, -236, 0, 0, 3), ...coinLine(main, -258, -268, 0, 0, 4),
    // Oase: je eine Münze über den unsichtbaren Wolken (Hinweis), Münzring am Teich
    ...WOLKEN.map(([x, y, z]) => ({ kind: 'coin', pos: [x, y + 1.2, z] })),
    { kind: 'coins', pos: [-4, YB + 0.6, -306], r: 1.6, n: 6 },
  ],
  checkpoint: [
    { pos: BANK(main, CP1_Z, 1, 1.4), yaw: Math.PI / 2 },
    { pos: BANK(main, CP2_Z, 1, 1.4), yaw: Math.PI / 2 },
  ],
  // Die Sterne bringen ihre Träger selbst mit (Stern-Sandflosser, Flatterkäfer, Statue); hier nur die verborgenen Plätze
  // (Zahl der Sterne für Karte und Ergebnis).
  stars: [
    { pos: P(main, -10, 0, 1.2), hidden: true },             // 1: Stern-Sandflosser in der Startmulde
    { pos: P(main, KAEFER_Z, -2.6, 1.6), hidden: true },     // 2: Flatterkäfer hinter der Rampe
    { pos: P(main, STAR_STATUE_Z, STAR_STATUE_LAT, 4.6), hidden: true },   // 3: große Baron-Sandstatue kurz vor dem Ende
  ],
  stamp: STAMP,
  goal: { pos: [0, YB, -338], height: 7 },
  marks: {
    start: [0, Y0 + 0.62, 23], raft: [0, Y0, 5.4], basin: P(main, 2, 0), neck: P(main, -26, 0), cp1: P(main, CP1_Z, 0),
    ramp: P(main, RAMP_Z + 7, 0), gorge: P(main, -112, 0), descent2: P(main, -145, 0), fork: P(main, -156, 0), arm: P(arm, -164, 0),
    cp2: P(main, CP2_Z, 0), field: P(main, -229, 0), starStatue: P(main, STAR_STATUE_Z, STAR_STATUE_LAT), kaefer: P(main, KAEFER_Z, -2.6), beach: [0, YB, -300], goal: [0, YB, -338],
    wolken: WOLKEN, qblock: QBLOCK, stamp: STAMP, yB: YB,
  },
};
