// B-11 „Stachelstege im Suchlicht“ – Remix von 8-1 „Stachelstege der Regenfestung“ mit den Suchscheinwerfern aus 5-7 „Auf
// Zehenspitzen durch die Glutfestung“ (Bauplan Welt Blume, Detail B-11: 400 s, Suchscheinwerfer über den blauen Brücken – im
// Licht fahren Stacheln aus und bleiben draußen; orange Brücken fahren schneller). Basis als Daten (remixOf,
// levels/w8/8-1.js bleibt unverändert). Musik der Basis (course_rainfort) mit Klang-Variante 'nacht', Thema rainfort@nacht
// (Regennacht mit Mond), kein Stempel.
//
// Ablauf wie in 8-1 (≈ 300 m nach −Z: Torhof → zwei Stachelstege → Warp-Box → Werferstege → Kontrollpunkt-Insel →
//   Knochenflieger-Strecke → Stachel-Schwebeplattformen → Zielturm), aber nachts:
//   - Die schmalen Stege mit den Stachelfallen sind **blau** gepflastert, über jedem kreist ein **Suchscheinwerfer**
//     (Baustein suchscheinwerfer). Liegt sein Lichtfleck auf einer Falle, fährt sie aus und **bleibt draußen**, solange das Licht
//     auf ihr liegt (und 2 s danach); wer sich erwischen lässt („Entdeckt!“), lässt alle Fallen seines Stegs 4 s lang
//     ausfahren. Ohne Licht laufen die Fallen im Takt der Basis. Am besten huscht man hinter dem Lichtfleck her – oder springt
//     über ausgefahrene Fallen.
//   - Die Stachel-Schwebeplattformen sind **orange** und fahren 1,6× so schnell (kürzere Pausen); die mittlere ist die **große
//     Stachelplattform** (4,4 × 4,4 m).
//   - Neu: Feuer-Werfer auf dem Turmplatz am Ende von Abschnitt 1, ?-Block mit Krallen-Anzug auf Turm 1, zwei Kletter-Säulen.
//     Die Kletter-Säule der Basis im Werferabschnitt entfällt; die Wachstube gibt ein Extraleben statt eines Sterns, am Ende der
//     Fallblöcke nach der Keil-Gruppe liegen Bitcoins.
// Sterne (Index): 0 **Ende Abschnitt 1**: Kletter-Säule links vom Feuer-Werfer auf Turm 2 (Krallen-Anzug), 1 **Säule nach dem
//   Kontrollpunkt** am Platz der Keil-Gruppe (Krallen-Anzug aus dem ?-Block am Kontrollpunkt), 2 **Bröckelblock-Brücke bei der
//   großen Stachelplattform**: von der großen Plattform nach links über drei Bröckelblöcke auf einen Säulenkopf.

import { remixOf } from '../../level/remix.js';
import { isl, ring, column, fallblockRuhig } from '../w8/_helpers_a.js';
import { suchlichtFallen, orangeBloecke, blaueStege } from './_helpers_bc.js';

const Y = 1;
const SAEULE1 = [-3.4, Y, -49.6];       // Ende Abschnitt 1, links vom Feuer-Werfer (Turm 2)
const SAEULE2 = [-5.0, Y, -188.8];      // nach dem Kontrollpunkt (Platz der Keil-Gruppe)
const KOPF = [-12.6, Y, -251.2];        // Säulenkopf hinter der Bröckelblock-Brücke
const licht = (id, path, lamp, o = {}) => ({ type: 'suchscheinwerfer', id, path, lamp, radius: 2.3, speed: 2.4, cooldown: 3, alarmTime: 1.6, track: false, ...o });
// Stege mit Stachelfallen [x0, x1, zA, zB] (wie in 8-1): blau gepflastert
const STACHELSTEGE = [[-1.3, 1.3, -6, -20], [-1.2, 1.2, -27, -45], [-1.5, 1.5, -192, -208], [-16, -8, -148.3, -150.7]];

export const LEVEL = remixOf('8-1', {
  id: 'B-11',
  world: 11,
  title: 'Stachelstege im Suchlicht',
  light: 'nacht',
  music: { variant: 'nacht' },
  timeLimit: 400,
  stamp: false,
  remove: [
    { type: 'wall', box: [-5, 0, -96, -4, 2, -95] },                      // Kletter-Säule der Basis (Stern 0 von 8-1)
    { kind: 'coins', box: [-4.6, 0, -97.4, -4.2, 8, -97] },              // ihre Münzsäule
  ],
  change: [
    // orange Schwebebrücken: 1,6× so schnell, kürzere Pausen; die mittlere ist groß. Alle drei im gleichen Takt (6,68 s), so
    // versetzt, dass die nächste Plattform wartet, wenn die vorige ankommt (wie in der Basis, nur flinker)
    { match: { id: 'schwebe1' }, fn: (e) => ({ ...e, speed: e.speed * 1.6, wait: 1.0, phase: 0 }) },
    { match: { id: 'schwebe2' }, fn: (e) => ({ ...e, speed: e.speed * 1.6, wait: 1.26, phase: 3.34, size: [4.4, 1, 4.4] }) },
    { match: { id: 'schwebe3' }, fn: (e) => ({ ...e, speed: e.speed * 1.6, wait: 0.91, phase: 6.48 }) },
    // Wachstube: Extraleben statt Stern
    { match: { id: 'raetsel2' }, fn: (e) => ({ ...e, task: { area: e.task.area, reward: { power: 'oneup' }, pos: e.task.pos } }) },
  ],
  stars: [
    [SAEULE1[0], Y + 6.7, SAEULE1[2]],                                   // 0: Säule links vom Feuer-Werfer (Ende Abschnitt 1)
    [SAEULE2[0], Y + 6.7, SAEULE2[2]],                                   // 1: Säule nach dem Kontrollpunkt
    [KOPF[0], Y + 1.1, KOPF[2]],                                         // 2: hinter der Bröckelblock-Brücke
  ],
  add: {
    segments: [
      // Suchscheinwerfer über den Stachelstegen (Lampe auf dem nächsten Turmplatz bzw. am Kontrollpunkt)
      licht('licht_steg1', [[0, Y, -7.4], [0, Y, -18.6]], [3.4, Y + 9, -21.2], { speed: 2.2 }),
      licht('licht_steg2', [[0, Y, -28.4], [0, Y, -43.6]], [3.6, Y + 9.5, -46.4], { speed: 2.6, phase: 0.3 }),
      licht('licht_steg3', [[0, Y, -193.4], [0, Y, -206.6]], [-4.4, Y + 9.5, -210.2], { speed: 2.4 }),
      licht('licht_stempel', [[-8.6, Y, -149.5], [-15.4, Y, -149.5]], [-7.2, Y + 8.5, -146.2], { speed: 1.8, radius: 2.0 }),
      // Kletter-Säulen
      { type: 'wall', pos: SAEULE1, size: [1.6, 6.6, 1.6], climbable: true },
      { type: 'wall', pos: SAEULE2, size: [1.6, 6.6, 1.6], climbable: true },
      // Bröckelblock-Brücke von der großen Stachelplattform nach links, Säulenkopf mit dem Stern
      { type: 'fallblock_bruecke', id: 'broeckel', mode: 'einzeln', blocks: [[-3.9, Y - 0.6, -251.2], [-6.5, Y - 0.4, -251.2], [-9.1, Y - 0.2, -251.2]], size: [1.6, 0.6, 1.6], respawn: 4 },
      isl(KOPF[0] - 1.2, KOPF[0] + 1.2, KOPF[2] + 1.2, KOPF[2] - 1.2, Y, 8, { top: 'stone' }),
    ],
    blocks: [
      { kind: 'question', pos: [2.6, Y + 1.9, -24.4], content: 'krallen' },              // Turm 1
    ],
    enemies: [
      { kind: 'feuer_werfer', id: 'werfer0', pos: [1.4, Y, -48.6], axis: [1, 0], pace: 1.0, sight: 10, interval: 2.8 },
    ],
    items: [
      column(SAEULE1[0], SAEULE1[2] + 1.2, Y + 1.2, Y + 5.6, 4),
      column(SAEULE2[0], SAEULE2[2] + 1.2, Y + 1.2, Y + 5.6, 4),
      ring([17.2, Y + 1, -186.3], 0.8, 5),                                              // Ende der Fallblöcke (früher Stern 2)
      ring([KOPF[0], Y + 0.8, KOPF[2]], 0.7, 4),
    ],
  },
  build(level) {
    blaueStege(level, STACHELSTEGE, Y);
  },
  setup(level) {
    suchlichtFallen(level, [
      { light: 'licht_steg1', traps: ['falle1'] },
      { light: 'licht_steg2', traps: ['falle2', 'falle3', 'falle4'] },
      { light: 'licht_steg3', traps: ['falle5', 'falle6'] },
      { light: 'licht_stempel', traps: ['falle7'] },
    ]);
    fallblockRuhig(level, 'broeckel');
    orangeBloecke(level, ['schwebe1', 'schwebe2', 'schwebe3']);
  },
  marks: {
    start: [0, Y, 6], steg1: [0, Y, -10], turm1: [0, Y, -23], steg2: [0, Y, -29], turm2: [0, Y, -48], saeule1: SAEULE1,
    ankunft: [0, Y, -71], cp: [0, Y, -157], keil: [0, Y, -183], saeule2: SAEULE2, schwebe: [0, Y, -232], kopf: KOPF, ziel: [0, Y, -296],
  },
});
