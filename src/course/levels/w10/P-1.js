// P-1 „Mondscheinwalzen am Mühlenhügel“ – Remix von 2-4 „Hügelmühle“ (Bauplan Welt Pilz, Detail P-1: Nacht, kürzer, 30 s,
// Ziel nur mit eingesammelten Zeit-Uhren erreichbar – die Uhren bilden die Ideallinie –, Stachel-Hüpfmäuse statt Hüpfmäusen,
// zusätzlich Stachelkugler). Basis als Daten (remixOf, levels/w2/2-4.js bleibt unverändert). Musik der Basis (course_hills)
// mit Klang-Variante 'nacht', Thema grass@nacht (Mond, Sterne, Mondlicht), kein Stempel.
//
// Ablauf (≈ 175 m nach −Z): Start oben auf dem Rollhügel (die Graswiese mit Glasröhren und Kletterfels entfällt) → drei
//   Hügelwalzen, rollender Baumstamm, Stufenhügel → Röhre an der Mühle hinab → Mühlenkeller (y −14): Zahnrad-Drehteller
//   (unterer Weg) oder Bretter an der rechten Wand (oberer Weg) → Kristalldeckel → Riesenräder → Röhre hinauf → Zielkuppe.
//   Kein Checkpoint: 30 s Startzeit, jede Zeit-Uhr +5 s; nach einem Neustart sind alle Uhren wieder da (_helpers_pa.js).
// Sterne (Index): 0 Sternring über der dritten Hügelwalze (anspringen → acht Sternmünzen auf dem Hügel, 12 s),
//   1 oberer Weg im Mühlenkeller (Bretter über dem Zahnrad-Schacht), 2 unterer Weg bis zur Röhre unter dem Kristalldeckel
//   (stampfen) → Farbfeld-Raum: alle 16 Felder färben (wie in der Basis).
// Gegner: Stachel-Hüpfmäuse (alle Hüpfmäuse der Basis und neue), Stachelkugler (neu: pendeln zwischen den Walzen, rollen den
//   Grashügel hinab, im Keller), Rollpilze und Pilzlinge der Basis.

import { remixOf } from '../../level/remix.js';
import { uhrenZurueck, holzbretter, line } from './_helpers_pa.js';

const YU = 6;      // Rollhügel
const YD = -14;    // Mühlenkeller
const YG = 10;     // Zielkuppe

/** Stachelkugler (neu im Remix). */
const kugler = (id, x, y, z, o = {}) => ({ kind: 'stachelkugler', id, pos: [x, y, z], ...o });

export const LEVEL = remixOf('2-4', {
  id: 'P-1',
  world: 10,
  title: 'Mondscheinwalzen am Mühlenhügel',
  light: 'nacht',
  music: { variant: 'nacht' },
  timeLimit: 30,
  stamp: false,
  checkpoint: null,
  // nur Rollhügel, Mühlenkeller, Farbfeld-Raum und Zielkuppe (die Graswiese z > −24,5 entfällt)
  keep: { box: [-14, -40, -25, 75, 30, -412], margin: 0.5 },
  remove: [
    { id: ['g_links', 'g_rechts'] },                       // Glasröhren der Graswiese
    { kind: 'roter_ring' },                                // Stufenhügel: statt des roten Rings der Sternring
  ],
  replaceKind: { huepfmaus: 'huepfmaus_stachel' },
  // Rasenmuster im Mondlicht (das helle Wiesengrün der Basis leuchtete nachts zu sehr)
  change: [{ match: { type: 'deco_w1', kind: 'checker' }, set: { color: 0x4f8a62 } }],
  start: { pos: [0, YU, -26.5], yaw: Math.PI / 2 },
  // Zeit-Uhren = Ideallinie (über die Walzenkämme, an der Mühle, durch den Keller und über die Räder)
  clocks: {
    id: 'uhren', sec: 5, list: [
      [0, YU + 2.6, -36], [0, YU + 2.6, -49], [0, YU + 3.0, -62], [-1, YU + 1.0, -86],
      [0, YD + 1.0, -241], [1, YD + 1.4, -266.5], [0, YD + 1.0, -284], [0, YD + 2.4, -314], [0, YD + 1.0, -327],
    ],
  },
  stars: [
    { pos: [0, YU + 1.4, -97], hidden: true, id: 'stern_ring' },     // 0: erscheint nach allen Sternmünzen
    [6.5, YD + 5.9, -268.8],                                          // 1: oberer Weg im Keller
    { pos: [60, YD + 0.4, -290.6], hidden: true, id: 'stern_farbe' }, // 2: Farbfeld-Raum (Basis)
  ],
  add: {
    segments: [
      { type: 'sign', pos: [3.6, YD, -244.6], text: 'Oben lang?', size: [1.8, 0.7] },
      // Nacht auf dem Rollhügel: Glühwürmchen und Leuchtpilze, im Keller Glühwürmchen über dem oberen Weg
      { type: 'deco_w1', items: [
        { kind: 'fireflies', pos: [0, YU + 1.5, -60], size: [22, 4, 70], n: 30, colors: [0xd8ff7a, 0xfff27a, 0x9ff2ff] },
        { kind: 'mushrooms', pos: [-10.4, YU, -47], size: 0.9, color: 'cyan', glow: true },
        { kind: 'mushrooms', pos: [10.6, YU, -58.5], size: 0.8, color: 'violet', glow: true },
        { kind: 'mushrooms', pos: [-10.6, YU, -77], size: 1, color: 'gold', glow: true },
        { kind: 'mushrooms', pos: [3.4, YU, -99], size: 0.8, color: 'cyan', glow: true },
        { kind: 'fireflies', pos: [6.5, YD + 4, -258], size: [3, 3, 22], n: 10, colors: [0xfff27a, 0x9ff2ff] },
      ] },
    ],
    enemies: [
      kugler('sk_walze', 5, YU, -55.5, { mode: 'pendel', dir: [1, 0], dist: 3, speed: 2 }),
      kugler('sk_huegel', -6, YU + 0.9, -80.4, { dir: [0, 1], wake: 40 }),
      kugler('sk_keller1', -3, YD, -287.6, { mode: 'pendel', dir: [1, 0], dist: 3.2, speed: 2 }),
      kugler('sk_keller2', 3, YD, -331.6, { mode: 'pendel', dir: [1, 0], dist: 3, speed: 1.8 }),
      { kind: 'huepfmaus_stachel', id: 'hm_neu1', pos: [4, YU, -90], path: [[1, YU, -90], [8, YU, -90]] },
      { kind: 'huepfmaus_stachel', id: 'hm_neu2', pos: [-3, YD, -278.6], path: [[-6, YD, -278.6], [2, YD, -278.6]] },
    ],
    items: [
      // Sternring über der dritten Hügelwalze: anspringen → acht Sternmünzen rund um den Stufenhügel und oben drauf (12 s)
      // → Stern 0 erscheint vor der Mühle
      { kind: 'starring', id: 'sternring', pos: [0, YU + 2.9, -62], star: 0, time: 12, coins: [
        ...[90, 141.4, 192.9, 244.3, 295.7, 347.1, 38.6].map((a) => [7 + 4.4 * Math.cos(a * Math.PI / 180), YU + 0.6, -74 + 4.4 * Math.sin(a * Math.PI / 180)]),
        [7, YU + 3.6, -74],
      ] },
      line([6.5, YD + 3.6, -255.6], [6.5, YD + 4.4, -264.4], 3),
    ],
  },
  // oberer Weg im Mühlenkeller: Kiste, Sims und Bretter an der rechten Wand über dem Zahnrad-Schacht (Dielen-Optik)
  build(level) {
    holzbretter(level, [
      [6.4, YD + 1.4, -247.6, 2.2, 2.2, 1.4], [6.5, YD + 2.9, -251.2, 2.6, 2.6, 0.5],
      [6.5, YD + 3.3, -255.6], [6.5, YD + 3.7, -260], [6.5, YD + 4.1, -264.4], [6.5, YD + 4.5, -268.8, 2.6, 2.6],
    ]);
  },
  setup(level) { uhrenZurueck(level, 'uhren'); },
  marks: {
    start: [0, YU, -26.5], drum1: [0, YU, -32], ring: [0, YU, -58], hill: [0, YU, -80], pipe: [-1.6, YU, -103],
    under: [0, YD, -236], upper: [6.5, YD + 4.5, -268.8], gears: [0, YD, -249], crystal: [5, YD, -287.6], wheels: [0, YD, -302.6],
    exit: [0, YD, -326], goal: [0, YG, -387], paint: [60, YD, -284],
  },
});
