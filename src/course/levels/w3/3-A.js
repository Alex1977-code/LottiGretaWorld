// 3-A „Krötenzauber im Roten Zwinger“ (Archetyp arena, Bauplan 3-A: kleine Festung ca. 25 × 25 m, rot vergitterter
// Käfigraum mit zwei erhöhten Eckpodesten, 3 Zauberkröten besiegen → Stern). Thema fortress (tiefroter Abend, Lavasee
// tief unten, ferne Burgtürme), Musik course_arena, 200 s.
//
// Aufbau: Festungsplattform (28 × 28 m) auf einem hohen Festungsleib mit glühenden Fenstern. Darauf der Zwinger
// (20 × 20 m, Gitter 6,6 m hoch, vorn nur eine niedrige Brüstung, damit die Kamera alles sieht): Bodenplatten mit
// rotem Läufer und leuchtendem Zauberkreis, hinten links und rechts je ein 2,4 m hohes Eckpodest mit Steintreppe zur
// Raummitte und Feuerschalen. Rückwand mit Fallgatter (öffnet sich nach dem Sieg) und Brummbär-Bannern, Zinnenmauern,
// vier Rundtürme (hinten mit Spitzdach), wehende Brummbär-Fahnen, Glutfunken aus der Tiefe.
// Ablauf: Die drei Zauberkröten erscheinen reihum an ihren Plätzen (Boden und beide Podeste), zaubern Kugeln und
// verschwinden. Nur sichtbar verwundbar: draufspringen (oder Funkenblüte aus dem ?-Block am Start). Sind alle drei
// besiegt, pulsiert der Kreis, das Gatter fährt hoch und der Stern steigt in der Mitte auf; Einsammeln beendet das
// Level. Tod setzt die Arena zurück.

import { levelSetupE, buildFortress, fortressFx } from './_helpers_e.js';

const Y = 2;            // Bodenoberfläche des Zwingers
const R = 10;           // halbe Innenweite
const PH = 2.4;         // Podesthöhe
const PL = { x0: -R, x1: -R + 4.6, z0: -R, z1: -R + 4.6, h: PH, stairs: { x: -R + 4.6 + 3.2, dir: -1, n: 8, run: 0.4, w: 2.2, z: -R + 2.3 } };
const PR = { x0: R - 4.6, x1: R, z0: -R, z1: -R + 4.6, h: PH, stairs: { x: R - 4.6 - 3.2, dir: 1, n: 8, run: 0.4, w: 2.2, z: -R + 2.3 } };
const PODL = [(PL.x0 + PL.x1) / 2, Y + PH, (PL.z0 + PL.z1) / 2];
const PODR = [(PR.x0 + PR.x1) / 2, Y + PH, (PR.z0 + PR.z1) / 2];

function setup(level) {
  const fx = buildFortress(level, { y: Y, half: R, outer: 14, height: 6.6, ceiling: 7.2, podests: [PL, PR] });
  fortressFx(level, fx, { y: Y });
}

export const LEVEL = {
  id: '3-A',
  world: 3,
  title: 'Krötenzauber im Roten Zwinger',
  archetype: 'arena',
  theme: 'fortress',
  music: 'course_arena',
  timeLimit: 200,
  starSlots: 1,
  killY: -12,
  setup: levelSetupE(setup),
  start: { pos: [0, Y, 7.4], yaw: Math.PI / 2 },
  // Überblick über den ganzen Zwinger: steil und etwas weiter weg, Blick halb auf die Mitte fixiert
  camera: [{ from: 30, to: -30, pitch: 50, dist: 24, x: 0, xLock: 0.45, ahead: 0.6, lead: 0.4 }],
  arena: { enemies: 'all', star: [0, Y + 0.6, -0.5], starIndex: 0, intro: 'Besiege die drei Zauberkröten!', center: [0, Y, -1.5], camPull: 0.6 },
  segments: [
    // Festungsplattform (Kollision + Umriss für Himmel und Kulisse; die Mauern und den Leib baut der Haken)
    { type: 'island', pos: [0, Y - 4, 0], size: [28, 4, 28], top: 'stone', under: 0 },
    { type: 'killplane', y: -12 },
    // Feuerschalen: auf den Podesten, an der Brüstung vorn, neben dem Tor
    { type: 'torches', h: 1.4, items: [[PL.x0 + 0.8, Y + PH, PL.z1 - 0.8], [PR.x1 - 0.8, Y + PH, PR.z1 - 0.8]] },
    { type: 'torches', h: 1.6, items: [[-R + 0.6, Y, R - 0.6], [R - 0.6, Y, R - 0.6], [-3.4, Y, -R - 3.2], [3.4, Y, -R - 3.2]] },
    { type: 'pennants', items: [
      { pos: [-12.5, Y + 1.1, 13.4], color: 0xd01c26, h: 4 }, { pos: [12.5, Y + 1.1, 13.4], color: 0xffc21a, h: 4 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.2, Y + 3.0, 5.6], content: 'funken' },
    { kind: 'question', pos: [PODR[0], PODR[1] + 3.0, PODR[2] + 0.6], content: 'coins:5' },
    { kind: 'brick', pos: [3.2, Y + 3.0, 5.6], content: 'coin' },
  ],
  enemies: [
    // drei Zauberkröten, jede mit eigenen Auftrittsplätzen (Boden und Podeste), versetzte Pausen
    { kind: 'zauberkroete', id: 'kroete1', spots: [[-5.5, Y, -1.5], PODL, [3.5, Y, 3.5], [-6.5, Y, 5]], sight: 26, hidden: 1.5, linger: 0.8 },
    { kind: 'zauberkroete', id: 'kroete2', spots: [[5.5, Y, -1.5], PODR, [-3.5, Y, 3.5], [6.5, Y, 5]], sight: 26, hidden: 1.9, linger: 0.8 },
    { kind: 'zauberkroete', id: 'kroete3', spots: [[0, Y, -6.5], PODR, PODL, [0, Y, 1.5]], sight: 26, hidden: 2.4, linger: 0.9 },
  ],
  items: [
    { kind: 'coins', pos: [PODL[0], PODL[1] + 0.4, PODL[2]], r: 1.2, n: 6 },
    { kind: 'coins', pos: [-6.5, Y + 0.4, 6.5], r: 1.3, n: 6 },
    { kind: 'coins', pos: [6.5, Y + 0.4, 6.5], r: 1.3, n: 6 },
    { kind: 'coins', from: [-7.5, Y + 0.5, -1], to: [-7.5, Y + 0.5, -4.6], n: 3 },
    { kind: 'coins', from: [7.5, Y + 0.5, -1], to: [7.5, Y + 0.5, -4.6], n: 3 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 7.4], podL: PODL, podR: PODR },
};
