// B-10 „Honigwaben am Taghimmel“ – Remix von S-6 „Honigwaben im Sternenmeer“ (Bauplan Welt Blume, Detail B-10: 400 s,
// Taghimmel statt Weltraum, schwerer; Bauplan-Tabelle „Tag-Variante, schwerer“). Basis als Daten (remixOf,
// levels/w9/S-6.js bleibt unverändert – auch ihr Waben-Fugen-Workaround wabenOhneLoecher läuft als Basis-Haken mit). Musik der
// Basis (course_honeycomb) mit Klang-Variante 'tag', Thema honeycomb@tag (Taghimmel, Wolken statt Sternen), kein Stempel.
//
// Ablauf wie in S-6 (Draufsicht über Honigwaben, ≈ 300 m nach −Z), aber am hellen Tag hoch über den Wolken: Planeten, Raketen,
// Kometen und Sternenstaub entfallen, darunter treiben Wolkenberge. Schwerer: mehr Lava-Waben (vor der dritten Stachelwalze,
// als Hürden auf allen drei Splitterwegen, ein Lavastreifen und eine Lavareihe auf der großen Wabenfläche, das Lavafeld links
// nahe dem Ende ist fast doppelt so groß und nur noch von einer Eiswabe aus zu bewerfen), schnellere Stachelwalzen (× 1,5) und
// fliegende Blöcke (× 1,35), zwei Stachelkugler (linker Weg der Gabelung, Käferfeld – nur Wurfsichel oder drüberspringen),
// zwei Brummer mehr (einer kreist über dem Lavafeld). Der Kampfraum der Flatterkäfer gibt ein Extraleben statt eines Sterns,
// am Ende des rechten Wegs liegen Bitcoins.
// Sterne (Index): 0 neben dem **Schwebeblock nahe dem Start** im All – nur vom Schwebeblock aus mit der **Wurfsichel**
//   (vom Waben-Rand fliegt sie zu tief), 1 über der **Glasröhre** im ersten Lavabereich – oben auf der Röhre über den Lavasee
//   balancieren und am Scheitel hochspringen, 2 über dem **Lavafeld links nahe dem Ende** – nur mit der Wurfsichel, von der
//   Eiswabe am rechten Rand des Felds geworfen.

import { remixOf } from '../../level/remix.js';
import { schattenDiaet } from '../w5/_helpers_a.js';
import { ring, line, wabenUmmalen, wabenListe } from './_helpers_bc.js';

const PI = Math.PI;
const STAR0 = [-17.4, 2.2, -4.2];       // neben dem Schwebeblock (Oberseite 1,3) in Wurfhöhe
const ROHR = [0, 4.9, -101];            // über dem Scheitel der Glasröhre (Oberseite der Röhre ≈ 3,3)
const LAVA = [-7.07, 0.95, -262.39];    // Mitte des Lavafelds links nahe dem Ende

// Neu bemalte Waben [x, z, Zeichen] (Zellmitten des S-6-Gitters)
const MALEN = [
  // 3 Stachelwalzen-Feld: Lava vor der dritten Walze und neben Walze 2
  [-7.07, -76.02, 'l'], [-4.24, -76.02, 'l'], [4.24, -76.02, 'l'], [8.49, -68.67, 'l'], [-8.49, -58.86, 'l'],
  // 6 Splitterwege: Lava-Hürden (drüberspringen)
  [0, -181.47, 'l'], [0, -205.99, 'l'], [-8.49, -191.28, 'l'], [9.9, -183.92, 'l'], [9.9, -208.44, 'l'],
  // 7 große Wabenfläche: Lavastreifen rechts, Lavareihe in der Mitte
  [2.83, -245.22, 'l'], [5.66, -245.22, 'l'], [8.49, -245.22, 'l'], [-2.83, -274.65, 'l'], [0, -274.65, 'l'],
  // Lavafeld links nahe dem Ende: größer, am rechten Rand eine Eiswabe (Wurfplatz)
  [-9.9, -257.49, 'l'], [-7.07, -257.49, 'l'], [-4.24, -257.49, 'l'], [-9.9, -267.29, 'l'], [-7.07, -267.29, 'l'], [-4.24, -267.29, 'l'],
  [-11.32, -259.94, 'l'], [-11.32, -264.84, 'l'], [-1.41, -262.39, 'i'],
];
const BLOCK_IDS = ['flug1', 'flug2', 'flug3', 'flug4'];
const NEU_LAVA = MALEN.filter((m) => m[2] === 'l');
/** Münzreihe der Basis (kind 'coins', from–to, n) in Einzelmünzen; über neuen Lava-Waben schweben sie in Sprunghöhe. */
const muenzenUeberLava = (e) => Array.from({ length: e.n }, (_, i) => {
  const t = e.n === 1 ? 0.5 : i / (e.n - 1);
  const x = e.from[0] + (e.to[0] - e.from[0]) * t, z = e.from[2] + (e.to[2] - e.from[2]) * t;
  const heiss = NEU_LAVA.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 1.5);
  return { kind: 'coin', pos: [+x.toFixed(2), heiss ? 2.6 : e.from[1], +z.toFixed(2)] };
});
const linie = (x0, z0, x1, z1) => ({ kind: 'coins', where: (e) => Array.isArray(e.from) && Math.abs(e.from[0] - x0) < 0.1 && Math.abs(e.from[2] - z0) < 0.1 && Math.abs(e.to[0] - x1) < 0.1 && Math.abs(e.to[2] - z1) < 0.1 });

/** Wolkenberge tief unter den Waben (Taghimmel), seitlich und darunter. */
const WOLKEN = [
  [-34, -20, 6, 14], [33, -22, -30, 16], [-32, -20, -78, 12], [35, -22, -118, 15], [-35, -22, -160, 16], [32, -20, -196, 12],
  [-33, -22, -236, 14], [34, -22, -272, 15], [-4, -34, -60, 18], [4, -36, -180, 20], [-6, -34, -300, 18],
].map(([x, y, z, s], i) => ({ kind: 'wolkenberg', pos: [x, y, z], size: s, height: s * 0.5, shadow: false, yaw: i * 0.7 }));

export const LEVEL = remixOf('S-6', {
  id: 'B-10',
  world: 11,
  title: 'Honigwaben am Taghimmel',
  light: 'tag',
  music: { variant: 'tag' },
  timeLimit: 400,
  stamp: false,
  remove: [
    { in: 'deco', kind: ['planet', 'rakete', 'komet', 'sterne'] },          // Weltraum-Kulisse (am Tag: Wolken)
    { kind: 'coins', box: [-11.5, 0, -25, -7, 2, -21.5] },                 // Münzspur hinaus zum Stempel der Basis
  ],
  // Münzreihen der Splitterwege: über den neuen Lava-Hürden schweben die Münzen in Sprunghöhe
  replace: [linie(-8.5, -175, -8.5, -192), linie(0, -175, 0, -192), linie(0, -199, 0, -219)].map((m) => ({ match: m, with: muenzenUeberLava })),
  change: [
    { match: { type: 'waben' }, fn: (seg) => wabenUmmalen(seg, wabenListe(MALEN)) },
    { match: { type: 'stachelwalze_rot' }, fn: (e) => ({ ...e, speed: e.speed * 1.5 }) },
    { match: { type: 'mover', id: BLOCK_IDS }, fn: (e) => ({ ...e, speed: e.speed * 1.35, wait: 0.5 }) },
    // Flatterkäfer-Runde: Extraleben statt des Sterns der Basis
    { match: { id: 'kaeferrunde' }, set: { onClear: { power: 'oneup', pos: [0, 1.2, -148.4] }, banner: 'Alle Flatterkäfer besiegt – ein Extraleben!' } },
  ],
  stars: [
    STAR0,                                                               // 0: neben dem Schwebeblock (Wurfsichel)
    ROHR,                                                                // 1: über der Glasröhre
    LAVA,                                                                // 2: über dem Lavafeld links (nur Wurfsichel)
  ],
  add: {
    segments: [
      { type: 'deco_w6', items: WOLKEN },
    ],
    enemies: [
      // Stachelkugler: linker Weg der Gabelung (rollt hin und her), Käferfeld – nur Wurfsichel oder drüberspringen
      { kind: 'stachelkugler', id: 'sk_gabel', pos: [-4.24, 0, -26], mode: 'pendel', dir: [0, 1], dist: 4, speed: 2.2 },
      { kind: 'stachelkugler', id: 'sk_feld', pos: [0, 0, -143.4], mode: 'pendel', dir: [1, 0], dist: 6, speed: 2.4 },
      // Brummer: über dem Lavafeld und an der Lavareihe
      { kind: 'brummer', id: 'br5', center: [-6.4, 2.6, -262.5], radius: 2.2, sight: 6, phase: 0.4 },
      { kind: 'brummer', id: 'br6', center: [3, 2.6, -241], radius: 2.0, sight: 6, phase: 0.1 },
    ],
    items: [
      ring([8.5, 0.6, -30], 1.2, 6),                                     // Ende des rechten Wegs (früher Stern)
      line([-1.41, 0.5, -258.6], [-1.41, 0.5, -261.4], 2),                // zur Eiswabe am Lavafeld
    ],
  },
  setup(level) {
    // Budget (Taglicht mit Sonnenschatten, mehr Gegner): Käfer und Stachelkugler werfen keinen Sonnenschatten (Schattenfleck
    // bleibt) – von oben sieht man ohnehin vor allem den Fleck
    schattenDiaet(level, ['krabbelkaefer', 'flatterkaefer', 'stachelkugler'], 0);
  },
  marks: {
    start: [0, 0, 0], schwebe: [-10.2, 1.3, -4.2], stern0: STAR0, roehre: [0, 0, -87.5], rohr: ROHR, insel: [0, 0, -120.5],
    kaefer: [0, 0, -128], splitter: [0, 0, -173], flaeche: [0, 0, -223.8], eiswabe: [-1.41, 0, -262.39], lavafeld: LAVA,
    turm: [0, 0, -287], ziel: [0, 9.6, -296],
  },
});
