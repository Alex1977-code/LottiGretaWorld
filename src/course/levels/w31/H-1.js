// H-1 „Kullerkürbisse im Abendrot“ – Kürbisfeld der Halloween-Welt „Kürbisinsel“ (Sonderwelt, Präfix H, Welt 31).
// Parcours nach −Z, ≈ 270 m, Thema pumpkin (Abendrot), Musik course_pumpkin, 400 s. Kindgerecht: breite Wege, Stürze in
// Bach, Mais oder Teich sind ungefährlich (schwimmen, zurücklaufen); nur die Kürbisschlucht vor dem Ziel ist tief (dort
// fliegt man mit der Kürbis-Kanone).
//
// Abschnitte (+X = rechts im Bild; Bodenhöhen 1 → 5 → 3/5 → 4 → 7):
//   A  Hof                z  16 … −25   Hoftor, rote Scheune, Vogelscheuche, Winke-Kürbis (winkt zurück; Stampfen → Stern 0),
//                                     Kürbisbeete, ?-Blöcke, erste Kürblinge
//   B  Kürbisbach          z −25 … −42   über riesige Kürbisse durch den Bach hüpfen (Kürbis-Hüpfer); Hineinfallen = schwimmen
//   C  Kullerhang          z −42 … −124  Lernen: Kürbisse rollen quer übers Feld · Steigern: Hohlweg hinauf, Riesenkürbisse
//                                     kullern im Zickzack herab (Strohballen-Nischen) · Scheunen-Plateau, Checkpoint
//   D  Laternenpfad        z −124 … −169 Damm durchs Maisfeld, Kürbislaternen gehen an, sobald man vorbeikommt; links ein
//                                     versteckter Laternenweg zu Krümel (Stern 1); rechts Lach-Grabstein → Laternen im Teich
//                                     zeigen für 12 s eine Geisterbrücke zur Stempel-Insel; im Mais rechts eine gelbe
//                                     Kürbis-Kanone zur Galerie der Windmühle (Stern 2)
//   E  Kürbis-Kanone       z −169 … −182 große Kürbis-Kanone über die Kürbisschlucht (Süßes und Bitcoins im Flug)
//   F  Vogelscheuchen-Feld z −208 … −246 Checkpoint 2, Kürbisse rollen von beiden Seiten, Kürblinge (Kombinieren)
//   G  Zielhügel           z −244 … −264 Rampe hinauf, Zielmast zwischen Kürbislaternen
// Gegner: Kürbling 8 + Riesenkürbling 1, Flatterfledi 2 (kreisen), Hexenhut-Hüpfer 2.

import {
  isl, line, arc, ring, candy, candyRing, candyArc, sign, rampe, scheune, windmuehle, hoftor, ackerFurchen,
  kuerbisSteineDeco, kuerbisSteine, kuerbisTop, kraehen, winkeKuerbisse, kruemelLaterne, laternenPfad, kuerbisDeko, kuerbisStreu,
  maisStreu, ohneSonnenschatten,
} from './_helpers_a.js';

const Y0 = 1, YP = 5, YM = 3, YF = 4, YG = 7;

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M1 = {
  HOF: { x0: -15, x1: 15, z0: 16, z1: -25 },
  BACH: { z0: -25, z1: -41, bed: -1, surf: 0.3 },
  FELD: { z0: -41, z1: -64 },
  HANG: { z0: -64, z1: -96 },                       // Rampe 1 → 5
  PLATEAU: { x0: -15, x1: 15, z0: -96, z1: -124 },
  DAMM: [[-124, -133], [-135.2, -145], [-147.4, -157], [-159.6, -169]],
  KANONE: { x0: -5, x1: 5, z0: -169, z1: -182 },
  LANDE: { x0: -14, x1: 14, z0: -208, z1: -246 },
  ZIEL: { x0: -9, x1: 9, z0: -244, z1: -264 },
  TEICH: { x0: 3, x1: 22, z0: -149.5, z1: -166, bed: 1.4, surf: 2.9 },
  INSEL: { x0: 13.2, x1: 17, z0: -155, z1: -161, top: 7.5 },
  MUEHLE: { x: 25, z: -137, base: YM, height: 15, gallery: 7.5 },
};
const { HOF, BACH, PLATEAU, DAMM, KANONE, LANDE, ZIEL, TEICH, INSEL, MUEHLE } = M1;

// Kürbis-Trittsteine im Bach (Fußpunkt auf dem Bachbett)
export const STEINE = [
  { pos: [-1.5, BACH.bed, -28.4], size: 3.0 },
  { pos: [2.1, BACH.bed, -32.6], size: 3.2, shape: 'dick' },
  { pos: [-1.2, BACH.bed, -36.8], size: 3.0 },
];

// Kullerhang: Zickzack-Bahn der Riesenkürbisse (Bodenpunkte; Rampe y = 1 + (−64 − z) / 8). Die Bahn schwingt bis x ±4,4;
// die Nischen am Rand (x ±6,3) bleiben frei.
export const hangY = (z) => Y0 + Math.max(0, Math.min(4, (-64 - z) / 8));
export const BAHN = [[0, YP, -98.6], [0, YP, -96.4], [4.4, hangY(-89), -89], [-4.4, hangY(-80.5), -80.5], [4.4, hangY(-72), -72], [0, Y0, -64.5], [0, Y0, -59.5]];

// Kanonenflug (Röhrenkanonen-Mechanik: Scheitel arc m über dem höheren Punkt, g = 30)
export const KANONE_A = { pos: [0, YP, -176.5], to: [0, YF, -215], arc: 8 };
export const KANONE_B = { pos: [10.5, YM, -131], to: [MUEHLE.x, MUEHLE.base + MUEHLE.gallery, MUEHLE.z + 3.3], arc: 5 };
/** Punkte entlang der Flugbahn (from = Öffnung der Kanone), t in (0, 1). */
function flug(from, to, arcH, ts) {
  const g = 30, apex = Math.max(from[1], to[1]) + arcH;
  const vy = Math.sqrt(2 * g * (apex - from[1]));
  const T = vy / g + Math.sqrt(2 * (apex - to[1]) / g);
  return ts.map((t) => { const k = t * T; return [from[0] + (to[0] - from[0]) * t, from[1] + vy * k - 0.5 * g * k * k - 0.9, from[2] + (to[2] - from[2]) * t]; });
}
const FLUG_A = flug([KANONE_A.pos[0], KANONE_A.pos[1] + 2, KANONE_A.pos[2]], KANONE_A.to, KANONE_A.arc, [0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78]);

// Laternen am Damm (gehen an, sobald man vorbeikommt), versteckter Laternenweg zu Krümel
const LATERNEN = [[-1.45, -127], [1.45, -132], [-1.45, -138], [1.45, -143], [-1.45, -150], [1.45, -155.5], [-1.45, -162], [1.45, -167]]
  .map(([x, z], i) => ({ id: `lp${i + 1}`, pos: [x, YP, z], yaw: x < 0 ? Math.PI : 0 }));
const KRUEMEL_WEG = [[-5.2, -141.5], [-8.6, -145.5], [-11.6, -149]].map(([x, z], i) => ({ id: `kw${i + 1}`, pos: [x, YM, z], yaw: Math.PI / 2, height: 1.8 }));
const KRUEMEL = { pos: [-13.6, YM, -151.6] };

function build(level) {
  ohneSonnenschatten(level, ['riesenkuerbis']);
  rampe(level, { x0: -7, x1: 7, z0: M1.HANG.z0, z1: M1.HANG.z1, y: Y0, h: YP - Y0, path: 3.2 });
  rampe(level, { x0: -4, x1: 4, z0: -245, z1: -251, y: YF, h: YG - YF });
  scheune(level, { pos: [-10, Y0, -4], w: 7, d: 8, h: 4 });
  scheune(level, { pos: [-9.5, YP, -111], w: 8, d: 10, h: 4.6, roof: 3 });
  windmuehle(level, { pos: [MUEHLE.x, MUEHLE.base, MUEHLE.z], height: MUEHLE.height, gallery: MUEHLE.gallery, speed: 0.5 });
  hoftor(level, { pos: [0, Y0, 5], w: 5.4, h: 3.4 });
  ackerFurchen(level, [
    { x0: -14, x1: -5, z0: -12, z1: -23, y: Y0 }, { x0: 5, x1: 14, z0: -13, z1: -23, y: Y0 },
    { x0: -14, x1: -6, z0: -44, z1: -62, y: Y0, dir: 'x' }, { x0: 6, x1: 14, z0: -44, z1: -54, y: Y0, dir: 'x' },
    { x0: -13, x1: -4, z0: -212, z1: -222, y: YF }, { x0: 4, x1: 13, z0: -212, z1: -222, y: YF },
  ]);
  kuerbisSteine(level, STEINE);
  // sparsame Kulissen-Kürbisse, Laternen und Mais (eigene Geometrie)
  kuerbisDeko(level, [
    { pos: [3.6, Y0, 9], size: 1.0, face: 'grinsen', shape: 'dick' },
    { pos: [-2.2, Y0, -1], size: 0.6, face: 'lachen' }, { pos: [2.2, Y0, -1], size: 0.6, face: 'lachen' },
    { pos: [-9, BACH.bed, -31], size: 1.6, shape: 'flach' }, { pos: [8.5, BACH.bed, -35.5], size: 1.4, color: 'gelb' },
    { pos: [-6.6, hangY(-76), -76], size: 0.55, face: 'lachen' }, { pos: [6.6, hangY(-84.5), -84.5], size: 0.55, face: 'grinsen' },
    { pos: [-6.6, hangY(-93), -93], size: 0.55, face: 'lachen' },
    { pos: [6.5, hangY(-67), -67], size: 0.9 }, { pos: [6.3, hangY(-69), -69], size: 0.6, color: 'gelb' }, { pos: [-6.4, hangY(-66.5), -66.5], size: 0.8, shape: 'flach' },
    { pos: [-6.5, hangY(-86), -86], size: 1.0, shape: 'dick' }, { pos: [6.5, hangY(-93.5), -93.5], size: 0.7, color: 'weiss' }, { pos: [6.4, hangY(-77), -77], size: 0.5 },
    { pos: [-5.2, YP, -105.5], size: 0.7, face: 'lachen', light: true },
    { pos: [-14.8, YM, -150.2], size: 0.55, face: 'staunen' },
    { pos: [8.2, YM, -133.2], size: 1.3, face: 'staunen', color: 'gelb' },
    { pos: [-4.2, YP, -181.2], size: 0.7, face: 'lachen', mount: 'pfahl', light: true }, { pos: [4.2, YP, -181.2], size: 0.7, face: 'grinsen', mount: 'pfahl', light: true },
    { pos: [-2.5, YF, -209.5], size: 0.6, face: 'lachen' }, { pos: [2.5, YF, -209.5], size: 0.6, face: 'lachen' },
    { pos: [-3.4, YG, -254], size: 1.1, face: 'lachen', mount: 'pfahl', light: true }, { pos: [3.4, YG, -254], size: 1.1, face: 'grinsen', mount: 'pfahl', light: true },
    { pos: [-6.5, YG, -259], size: 2.2, face: 'lachen', shape: 'dick' }, { pos: [6.6, YG, -259.5], size: 1.8, face: 'grinsen', color: 'gelb' },
  ]);
  kuerbisStreu(level, { pos: [-9.5, Y0, -17.5], size: [8, 9], n: 9, faces: 0.4, seed: 3 });
  kuerbisStreu(level, { pos: [10, Y0, -18.5], size: [7, 8], n: 8, faces: 0.4, seed: 7, avoid: [[9.5, -10.5, 2.4]] });
  kuerbisStreu(level, { pos: [-10.5, YP, -82], size: [6, 20], n: 9, faces: 0.3, seed: 11 }, { shadow: false });
  kuerbisStreu(level, { pos: [10.5, YP, -74], size: [6, 16], n: 8, faces: 0.3, seed: 12 }, { shadow: false });
  kuerbisStreu(level, { pos: [9.5, YP, -116], size: [8, 10], n: 9, faces: 0.5, seed: 4 });
  kuerbisStreu(level, { pos: [-12, YM, -126.5], size: [8, 3], n: 5, faces: 0.6, seed: 27 });
  kuerbisStreu(level, { pos: [-10, YF, -217], size: [7, 8], n: 8, faces: 0.4, seed: 31 });
  kuerbisStreu(level, { pos: [10, YF, -217], size: [7, 8], n: 8, faces: 0.4, seed: 32 });
  maisStreu(level, { pos: [-13.4, Y0, -23.4], size: [2, 1.2], n: 2, seed: 2 });
  maisStreu(level, { pos: [13.4, Y0, -23.4], size: [2, 1.2], n: 2, seed: 3 });
  maisStreu(level, { pos: [11, YP, -93], size: [6, 6], n: 7, seed: 5 }, { shadow: false });
  // Maisfeld in Reihen auf Ackerfurchen; frei bleiben Krümels Laternenweg und Lichtung, Rampen, Kanone, Mühle
  const KW = [...KRUEMEL_WEG.map((l) => [l.pos[0], l.pos[2], 1.6]), [-4, -141.2, 1.6], [KRUEMEL.pos[0], KRUEMEL.pos[2], 3.2], [-3.7, -140, 2.6], [-3.7, -164, 2.6], [-3.6, -147, 1.2]];
  maisStreu(level, { x0: -18, x1: -2.4, z0: -124.6, z1: -169.4, y: YM, row: 1.9, step: 1.6, seed: 21, avoid: KW }, { shadowX: [-6, 6] });
  maisStreu(level, { x0: 2.4, x1: 20, z0: -124.6, z1: -149, y: YM, row: 1.9, step: 1.6, seed: 24, avoid: [[KANONE_B.pos[0], KANONE_B.pos[2], 3.4], [3.7, -129, 2.6], [8.2, -133.2, 1.4]] }, { shadowX: [-6, 6] });
  maisStreu(level, { x0: 2.4, x1: 24, z0: -166.6, z1: -169.4, y: YM, row: 1.9, step: 1.6, seed: 26, avoid: [[3.7, -167, 2.6]] }, { shadowX: [-6, 6] });
  ackerFurchen(level, [
    { x0: -18, x1: -1.8, z0: -124.4, z1: -169.6, y: YM, gap: 1.8 },
    { x0: 1.8, x1: 20.8, z0: -124.4, z1: -149.3, y: YM, gap: 1.8 },
  ]);
  kraehen(level, [[-14.6, 2.15, 2], [14.6, 2.15, -8, -2.2], [-14.6, 2.15, -20], [-9.5, 9.7, -107], [14.4, 5.15, -230, -2.2]]);
  winkeKuerbisse(level, [{ id: 'winke', pos: [9.5, Y0, -10.5], size: 2.4, content: { star: 0 } }]);
  kruemelLaterne(level, { id: 'kruemel', pos: KRUEMEL.pos, yaw: -0.4, content: { star: 1 } });
  laternenPfad(level, [...LATERNEN, ...KRUEMEL_WEG], 7);
  laternenPfad(level, [[-7.6, -69], [7.6, -76], [-7.6, -83], [7.6, -90]].map(([x, z], i) => ({ id: `hl${i}`, pos: [x, YP, z], yaw: x < 0 ? 0 : Math.PI, height: 2.4 })), 9, { id: 'hanglaternen' });
}

export const LEVEL = {
  id: 'H-1',
  world: 31,
  title: 'Kullerkürbisse im Abendrot',
  archetype: 'parcours',
  theme: 'pumpkin',
  music: 'course_pumpkin',
  timeLimit: 400,
  candyHud: true,
  killY: -10,
  start: { pos: [0, Y0, 10], yaw: Math.PI / 2 },
  build,
  instances: { coin: { farHide: 40, shadow: false } },
  farHide: 40,
  camera: [
    { from: 20, to: -24, pitch: 40, dist: 12.5, fov: 40 },
    { from: -24, to: -44, pitch: 42, dist: 13, fov: 40 },                         // Kürbisbach
    { from: -44, to: -62, pitch: 40, dist: 13, fov: 40 },
    { from: -62, to: -84, pitch: 31, dist: 14, fov: 42, height: 2.4, ahead: 3 }, // Kullerhang (hinauf, Blick den Hang hoch)
    { from: -84, to: -98, pitch: 37, dist: 13.5, fov: 42, height: 1.8 },
    { from: -98, to: -124, pitch: 40, dist: 13, fov: 40 },                        // Scheunen-Plateau
    { from: -124, to: -170, pitch: 44, dist: 14, fov: 42 },                       // Laternenpfad
    { from: -170, to: -186, pitch: 40, dist: 13.5, fov: 42, height: 1.4 },       // Kürbis-Kanone
    { from: -186, to: -270, pitch: 40, dist: 13, fov: 40 },                       // Feld, Ziel
    { from: -120, to: -156, pitch: 40, dist: 14, fov: 42, area: [19, 34] },      // Windmühle
  ],
  segments: [
    // =============================================================== A  Hof
    isl(HOF.x0, HOF.x1, HOF.z0, HOF.z1, Y0, 5),
    sign(-3.6, Y0, 11, 'Kullerkürbisse\nim Abendrot', { size: [3.2, 1.2] }),
    sign(4.2, Y0, 1.4, 'Huhu!\nWer winkt da?', { size: [2.2, 0.9] }),
    { type: 'deco_hw', items: [
      { kind: 'vogelscheuche', pos: [7.6, Y0, 7] },
      { kind: 'strohballen', pos: [-5.6, Y0, 9.5], form: 'rund', yaw: 0.2 },
      { kind: 'strohballen', pos: [-5.2, Y0, 7.6], form: 'eckig', yaw: 1.4 },
      { kind: 'strohballen', pos: [-6, Y0, -10], form: 'eckig', yaw: 0.1 },
      { kind: 'strohballen', pos: [-6.4, Y0, -11.4], form: 'eckig', yaw: 0.3 },
      { kind: 'suessigkeiten', pos: [-5.4, Y0, 3], size: 1.1 },
      { kind: 'zaun', from: [HOF.x0 + 0.4, Y0, 15], to: [HOF.x0 + 0.4, Y0, -24], style: 'holz' },
      { kind: 'zaun', from: [HOF.x1 - 0.4, Y0, 15], to: [HOF.x1 - 0.4, Y0, -24], style: 'holz' },
      { kind: 'zaun', from: [HOF.x0 + 0.4, Y0, 15.4], to: [-3, Y0, 15.4], style: 'holz' },
      { kind: 'zaun', from: [3, Y0, 15.4], to: [HOF.x1 - 0.4, Y0, 15.4], style: 'holz' },
      { kind: 'krummer_baum', pos: [12.6, Y0, 12], height: 5 },
    ] },

    // =============================================================== B  Kürbisbach
    isl(HOF.x0, HOF.x1, BACH.z0, BACH.z1, BACH.bed, 3),
    { type: 'water', pos: [0, BACH.bed, (BACH.z0 + BACH.z1) / 2], size: [HOF.x1 - HOF.x0, BACH.surf - BACH.bed, BACH.z0 - BACH.z1] },
    { type: 'ramp', pos: [11.5, BACH.bed, BACH.z1 + 1.6], size: [4, Y0 - BACH.bed, 3.2], axis: 'z', dir: -1, top: 'stone' },
    { type: 'ramp', pos: [-11.5, BACH.bed, BACH.z1 + 1.6], size: [4, Y0 - BACH.bed, 3.2], axis: 'z', dir: -1, top: 'stone' },
    { type: 'deco_hw', items: [
      ...kuerbisSteineDeco(STEINE).map((k, i) => ({ ...k, face: i === 1 ? 'staunen' : false, seed: i })),
    ] },
    sign(-4.6, Y0, -22.8, 'Kürbis-\nHüpfer', { size: [1.9, 0.8] }),

    // =============================================================== C  Kullerhang
    isl(HOF.x0, HOF.x1, BACH.z1, M1.FELD.z1, Y0, 5),
    // quer rollende Kürbisse (Lernen): Spender links, Strohballen rechts fangen sie auf
    { type: 'riesenkuerbis_roll', id: 'quer', pos: [-13.4, Y0, -56.5], dir: [1, 0], every: 4.2, first: 0.6, max: 2, size: 1.6, speed: 3.2, vmax: 4, start: 'near', near: 22, life: 12 },
    // Hohlweg: Rampe 1 → 5, Hänge links und rechts; oben stößt ein Verschlag Riesenkürbisse aus, die im Zickzack herabkullern
    isl(HOF.x0, -7, M1.HANG.z0, M1.HANG.z1, YP, 9),
    isl(7, HOF.x1, M1.HANG.z0, M1.HANG.z1, YP, 9),
    { type: 'riesenkuerbis_roll', id: 'kuller', pos: BAHN[0], dir: [0, 1], path: BAHN, every: 4.2, first: 0.3, max: 3, size: 1.8, speed: 3, vmax: 6, start: 'near', near: 44 },
    isl(PLATEAU.x0, PLATEAU.x1, PLATEAU.z0, PLATEAU.z1, YP, 9),
    sign(-3.2, Y0, -59, 'Achtung,\nKullerkürbis!', { size: [2.2, 0.9] }),
    { type: 'deco_hw', items: [
      // Fangballen (rechts) und Nischen am Hohlweg
      { kind: 'strohballen', pos: [14, Y0, -55.8], form: 'rund', yaw: 1.57 },
      { kind: 'strohballen', pos: [14, Y0, -57.4], form: 'rund', yaw: 1.57 },
      { kind: 'vogelscheuche', pos: [-9.5, YP, -70], size: 1.1 },
      { kind: 'strohballen', pos: [6.4, hangY(-72.5), -72.5], form: 'eckig', yaw: 1.57 },
      { kind: 'strohballen', pos: [-6.4, hangY(-79.5), -79.5], form: 'eckig', yaw: 1.57 },
      { kind: 'strohballen', pos: [6.4, hangY(-88), -88], form: 'eckig', yaw: 1.57 },
      // Plateau
      { kind: 'strohballen', pos: [-3.8, YP, -104.5], form: 'rund', yaw: 0.4 },
      { kind: 'strohballen', pos: [-4.6, YP, -103], form: 'eckig', yaw: 1.2 },
      { kind: 'zaun', from: [PLATEAU.x1 - 0.4, YP, -97], to: [PLATEAU.x1 - 0.4, YP, -123], style: 'holz' },
    ] },

    // =============================================================== D  Laternenpfad im Maisfeld
    // Feld links und rechts (Höhe 3), Damm (Höhe 5) mit Lücken, Teich mit Stempel-Insel rechts
    isl(-18, -1.7, -124, -160, YM, 7), isl(-18, -1.7, -160, -170, YM, 7),
    isl(-1.7, 1.7, -124, -160, YM, 7), isl(-1.7, 1.7, -160, -170, YM, 7),
    isl(1.7, 30, -124, TEICH.z0, YM, 7),
    isl(1.7, TEICH.x0, TEICH.z0, -160, YM, 7), isl(1.7, TEICH.x0, -160, TEICH.z1, YM, 7),
    isl(TEICH.x1, 30, TEICH.z0, -160, YM, 7), isl(TEICH.x1, 30, -160, TEICH.z1, YM, 7),
    isl(1.7, 30, TEICH.z1, -170, YM, 7),
    isl(TEICH.x0, TEICH.x1, TEICH.z0, TEICH.z1, TEICH.bed, 5),
    { type: 'water', pos: [(TEICH.x0 + TEICH.x1) / 2, TEICH.bed, (TEICH.z0 + TEICH.z1) / 2], size: [TEICH.x1 - TEICH.x0, TEICH.surf - TEICH.bed, TEICH.z0 - TEICH.z1] },
    { type: 'ramp', pos: [TEICH.x1 - 2, TEICH.bed, (TEICH.z0 + TEICH.z1) / 2], size: [4, YM - TEICH.bed, 4], axis: 'x', dir: 1, top: 'stone' },
    isl(INSEL.x0, INSEL.x1, INSEL.z0, INSEL.z1, INSEL.top, 6.5, { top: 'grass' }),
    ...DAMM.map(([a, b]) => isl(-1.7, 1.7, a, b, YP, 3)),
    // Rampen vom Feld zurück auf den Damm
    { type: 'ramp', pos: [-3.7, YM, -140], size: [4, YP - YM, 3], axis: 'x', dir: 1 },
    { type: 'ramp', pos: [3.7, YM, -129], size: [4, YP - YM, 3], axis: 'x', dir: -1 },
    { type: 'ramp', pos: [-3.7, YM, -164], size: [4, YP - YM, 3], axis: 'x', dir: 1 },
    { type: 'ramp', pos: [3.7, YM, -167], size: [4, YP - YM, 3], axis: 'x', dir: -1 },
    // Laternen
    // Lach-Grabstein schaltet zwei Laternen im Teich für 12 s an: Geisterbrücke zur Stempel-Insel
    { type: 'grabstein_schalter', id: 'schalter', pos: [1, YP, -151.6], time: 12, on: { start: ['gp1', 'gp2'] }, off: { stop: ['gp1', 'gp2'] } },
    isl(5.1, 6.1, -151.2, -152.2, TEICH.surf + 0.1, 1.6, { top: 'rock' }),
    isl(11.6, 12.6, -153.4, -154.4, TEICH.surf + 0.1, 1.6, { top: 'rock' }),
    { type: 'laternenpfahl', id: 'gp1', pos: [5.6, TEICH.surf + 0.1, -151.7], on: false, radius: 6.5, style: 'laterne', yaw: -Math.PI / 2 },
    { type: 'laternenpfahl', id: 'gp2', pos: [12.1, TEICH.surf + 0.1, -153.9], on: false, radius: 6.5, style: 'laterne', yaw: -Math.PI / 2 },
    { type: 'geisterplattform', id: 'geistbruecke', light: 'pfahl', color: 'lila', parts: [
      { pos: [3.9, 5.2, -154.4], size: [2.4, 0.5, 2.4] },
      { pos: [7.4, 6.0, -156.2], size: [2.4, 0.5, 2.4] },
      { pos: [10.9, 6.8, -157.8], size: [2.4, 0.5, 2.4] },
    ] },
    // versteckte Kürbis-Kanone im Mais → Galerie der Windmühle
    { type: 'kuerbis_kanone', id: 'kanone_muehle', pos: KANONE_B.pos, to: KANONE_B.to, arc: KANONE_B.arc, color: 'gelb', face: 'staunen' },
    sign(-3.4, YP, -121.6, 'Laternenpfad', { size: [2.2, 0.8] }),
    { type: 'deco_hw', items: [
      { kind: 'strohballen', pos: [-12.6, YM, -153.4], form: 'rund', yaw: 0.6 },
      { kind: 'strohballen', pos: [21.5, YM, -131.5], form: 'rund', yaw: 0.3 },
      { kind: 'krummer_baum', pos: [28, YM, -146], height: 6 },
    ] },

    // =============================================================== E  Kürbis-Kanone
    isl(KANONE.x0, KANONE.x1, KANONE.z0, KANONE.z1, YP, 9),
    { type: 'kuerbis_kanone', id: 'kanone', pos: KANONE_A.pos, to: KANONE_A.to, arc: KANONE_A.arc, face: 'grinsen' },
    sign(-3.4, YP, -171, 'Hinein in\nden Kürbis!', { size: [2.2, 0.9] }),
    { type: 'deco_hw', items: [
      { kind: 'strohballen', pos: [3.6, YP, -171.5], form: 'eckig', yaw: 0.2 },
    ] },

    // =============================================================== F  Vogelscheuchen-Feld
    isl(LANDE.x0, LANDE.x1, LANDE.z0, LANDE.z1, YF, 8),
    { type: 'riesenkuerbis_roll', id: 'feld_l', pos: [-11.4, YF, -227.5], dir: [1, 0], every: 4.4, first: 0.4, max: 2, size: 1.6, speed: 3, vmax: 4, start: 'near', near: 20, life: 11 },
    { type: 'riesenkuerbis_roll', id: 'feld_r', pos: [11.4, YF, -236.5], dir: [-1, 0], every: 4.4, first: 2.6, max: 2, size: 1.6, speed: 3, vmax: 4, start: 'near', near: 20, life: 11 },
    { type: 'deco_hw', items: [
      { kind: 'vogelscheuche', pos: [-6.5, YF, -232], size: 1.1 },
      { kind: 'strohballen', pos: [12.6, YF, -227.5], form: 'rund', yaw: 0 },
      { kind: 'strohballen', pos: [-12.6, YF, -236.5], form: 'rund', yaw: 0 },
      { kind: 'zaun', from: [LANDE.x0 + 0.4, YF, -209], to: [LANDE.x0 + 0.4, YF, -224], style: 'holz' },
      { kind: 'zaun', from: [LANDE.x1 - 0.4, YF, -209], to: [LANDE.x1 - 0.4, YF, -224], style: 'holz' },
    ] },

    // =============================================================== G  Zielhügel
    isl(ZIEL.x0, ZIEL.x1, -251, ZIEL.z1, YG, 11),
    { type: 'deco_hw', items: [
      { kind: 'strohballen', pos: [-6.6, YF, -246], form: 'rund', yaw: 0.2 },
      { kind: 'strohballen', pos: [6.6, YF, -246], form: 'rund', yaw: -0.2 },
      { kind: 'strohballen', pos: [-6.8, YF, -247.6], form: 'eckig', yaw: 0.1 },
      { kind: 'suessigkeiten', pos: [5.6, YG, -255.5], size: 1.2 },
      { kind: 'fledermaus_girlande', from: [-5, YG + 5.6, -256.5], to: [5, YG + 5.6, -256.5], n: 9, sag: 0.8 },
    ] },
  ],
  enemies: [
    // Kürblinge: Verfolger und Streifen (hüpfen nicht über Kanten), ein Riesenkürbling auf dem Plateau
    { kind: 'kuerbling', id: 'kb1', pos: [-3, Y0, -15], sight: 6 },
    { kind: 'kuerbling', id: 'kb2', pos: [3, Y0, -19.5], behavior: 'patrol', path: [[2, Y0, -19.5], [8, Y0, -19.5]], sight: 0, coins: 2 },
    { kind: 'kuerbling', id: 'kb3', pos: [-3, Y0, -47], behavior: 'patrol', path: [[-7, Y0, -47], [-1, Y0, -47]], sight: 0 },
    { kind: 'kuerbling', id: 'kb4', pos: [5, Y0, -50], sight: 6 },
    { kind: 'kuerbling', id: 'kb_riese', riese: true, pos: [6, YP, -116.5], sight: 7 },
    { kind: 'kuerbling', id: 'kb6', pos: [0, YP, -138], behavior: 'patrol', path: [[0, YP, -137], [0, YP, -144]], sight: 0 },
    { kind: 'kuerbling', id: 'kb7', pos: [0, YP, -166], sight: 5 },
    { kind: 'kuerbling', id: 'kb8', pos: [-5, YF, -232], sight: 6 },
    { kind: 'kuerbling', id: 'kb9', pos: [5, YF, -241], sight: 6 },
    // Flatterfledis kreisen in Kopfhöhe (drüberspringen oder draufspringen)
    { kind: 'flatterfledi', id: 'ff1', center: [0, YP + 0.8, -153], radius: 1.4, flySpeed: 1.6 },
    { kind: 'flatterfledi', id: 'ff2', center: [6.5, YF + 0.8, -226.5], radius: 1.8, flySpeed: 1.8 },
    // Hexenhut-Hüpfer im Vogelscheuchen-Feld (nur gelandet von oben besiegbar)
    { kind: 'hexenhut_huepfer', id: 'hh1', pos: [-8, YF, -239], sight: 6 },
    { kind: 'hexenhut_huepfer', id: 'hh2', pos: [8.5, YF, -233.5], sight: 6 },
  ],
  blocks: [
    { kind: 'question', pos: [-1.3, Y0 + 2.6, -5], content: 'coins:3' },
    { kind: 'question', pos: [1.3, Y0 + 2.6, -5], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [-4.6, YP + 3.2, -103.8], content: 'oneup' },
    { kind: 'question', pos: [0, YP + 2.6, -121], content: 'coins:5' },
    { kind: 'question', pos: [0, YF + 2.6, -223], content: 'wachstumsbeere' },
  ],
  items: [
    // A
    candy([0, Y0, 8], [0, Y0, 1.5], 4),
    candyRing([9.5, Y0, -10.5], 2.6, 6),
    line([0, Y0 + 0.6, -10], [0, Y0 + 0.6, -21], 4),
    // B: Bitcoins über den Kürbissen
    ...arc([0, Y0 + 0.6, -24.5], [STEINE[0].pos[0], kuerbisTop(STEINE[0]) + 0.6, STEINE[0].pos[2]], 3, 1.2),
    ...arc([STEINE[0].pos[0], kuerbisTop(STEINE[0]) + 0.6, STEINE[0].pos[2]], [STEINE[1].pos[0], kuerbisTop(STEINE[1]) + 0.6, STEINE[1].pos[2]], 4, 1.2).slice(1),
    ...arc([STEINE[1].pos[0], kuerbisTop(STEINE[1]) + 0.6, STEINE[1].pos[2]], [STEINE[2].pos[0], kuerbisTop(STEINE[2]) + 0.6, STEINE[2].pos[2]], 4, 1.2).slice(1),
    ...candyArc([STEINE[2].pos[0], kuerbisTop(STEINE[2]), STEINE[2].pos[2]], [0, Y0, -43], 3, 1.2).slice(1),
    // C
    line([0, Y0 + 0.6, -46], [0, Y0 + 0.6, -52], 3),
    candy([-6, Y0, -57], [6, Y0, -57], 4),
    candy([-6.2, hangY(-73), -73], [-6.2, hangY(-75), -75], 2),
    candy([6.2, hangY(-81.5), -81.5], [6.2, hangY(-83.5), -83.5], 2),
    candy([-6.2, hangY(-90), -90], [-6.2, hangY(-92), -92], 2),
    ...arc([0, hangY(-66) + 0.6, -66], [0, hangY(-94) + 0.6, -94], 6, 0.3),
    line([3, YP + 0.6, -100], [3, YP + 0.6, -108], 4),
    // D
    candy([0, YP, -126], [0, YP, -131], 3),
    ...arc([0, YP + 0.6, -132], [0, YP + 0.6, -136.4], 3, 1.4),
    candy([0, YP, -138], [0, YP, -144], 3),
    ...arc([0, YP + 0.6, -144.2], [0, YP + 0.6, -148.6], 3, 1.4),
    ...arc([0, YP + 0.6, -156.4], [0, YP + 0.6, -160.8], 3, 1.4),
    candy([0, YP, -161], [0, YP, -167], 3),
    candy([-3.4, YM, -143], [-10.2, YM, -147.5], 3),
    ...arc([2, YP + 0.6, -153], [INSEL.x0 + 0.8, INSEL.top + 0.6, -158], 5, 1.2),
    { kind: 'powerup', power: 'oneup', pos: [16.2, INSEL.top, -156.2] },
    // E: im Flug
    ...FLUG_A.map((p, i) => (i % 2 ? { kind: 'suessigkeit', pos: [p[0], p[1] - 0.4, p[2]] } : { kind: 'coin', pos: p })),
    // F
    candy([-4, YF, -213], [4, YF, -213], 4),
    ring([0, YF + 0.6, -232], 2.4, 8),
    candy([-9, YF, -236], [-9, YF, -242], 3),
    candy([9, YF, -226], [9, YF, -232], 3),
    // G
    line([0, YF + 0.8, -246], [0, YG + 0.6, -250], 3),
  ],
  checkpoint: [{ pos: [3, YP, -103.5], yaw: Math.PI / 2 }, { pos: [0, YF, -218.5], yaw: Math.PI / 2 }],
  stars: [
    { pos: [9.5, Y0 + 1.0, -8.2], hidden: true, id: 'stern_winke' },               // 0: Winke-Kürbis stampfen
    { pos: [KRUEMEL.pos[0] + 1.4, YM + 1.0, KRUEMEL.pos[2] + 0.8], hidden: true, id: 'stern_kruemel' }, // 1: Krümel finden
    [MUEHLE.x - 2.09, MUEHLE.base + MUEHLE.gallery + 0.75, MUEHLE.z + 2.09],       // 2: Galerie der Windmühle
  ],
  stamp: [(INSEL.x0 + INSEL.x1) / 2, INSEL.top + 1.1, (INSEL.z0 + INSEL.z1) / 2 - 0.6],
  goal: { pos: [0, YG, -256], height: 9 },
  marks: {
    start: [0, Y0, 10], winke: [9.5, Y0, -6.5], bach: [0, Y0, -24], feld: [0, Y0, -48], hang: [0, Y0, -64], plateau: [3, YP, -103.5],
    damm: [0, YP, -126], kruemel: [-12, YM, -150], schalter: [1, YP, -151.6], insel: [15.8, INSEL.top, -158], kanoneB: [KANONE_B.pos[0], YM, KANONE_B.pos[2] + 2],
    muehle: [MUEHLE.x, MUEHLE.base + MUEHLE.gallery, MUEHLE.z + 3.3], kanone: [0, YP, -172], lande: [0, YF, -215], feld2: [0, YF, -224], goal: [0, YG, -254],
  },
};
