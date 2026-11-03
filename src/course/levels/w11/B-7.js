// B-7 „Kanonenhelm-Tauchgang im Leuchtturmriff“ – Remix von 3-5 „Leuchtturmriff“ (Bauplan Welt Blume, Detail B-7: Kanonen-Helme
// überall; Tintlinge und Rammfische statt Flosslinge; 3 Felsblockwände, hinter denen Sterne liegen; Sterne: Ende Tauchabschnitt 1
// hinter Felsblöcken, über den ersten 3 Stachelblöcken in Tauchabschnitt 2, tief darunter 4 Felsblöcke sprengen → Sternring;
// 400 s). Basis als Daten (remixOf, levels/w3/3-5.js bleibt unverändert). Musik und Licht der Basis (course_water, Thema
// water), kein Stempel.
//
// Ablauf wie in der Basis: Strand → Tiefwasser (Tauchabschnitt 1) → Flutkammer → Wrackbucht (Checkpoint) → Stachelwand-Kanal
//   (Tauchabschnitt 2) → Glasrohr-Kanone → Zielinsel. Neu:
//   **Kanonen-Helme überall** (Strand, Riffkante, Flutkammer-Sims, Bucht, Kanalufer, Zielinsel; liegen nach dem Aufheben wieder da):
//     die Kanone feuert auch unter Wasser – sie sprengt Felsblöcke und vertreibt Tintlinge und Rammfische.
//   Statt der Flossling-Schwärme: **Tintlinge** (Zickzack-Stöße, Tintenwölkchen) und **Rammfische** (rammen geradeaus).
//   **Drei Felsblockwände** (rissige Felswand, nur Kanonenkugel/Bombe/Riesentrank sprengen sie):
//     1 am Ende des Tiefwassers rechts unten: Nische in der Felswand, davor eine Felswand → Stern 0.
//     2 im Kanal: drei **Stachelblöcke** ragen aus dem Wasser (Trittsteine, die Seiten stechen); neben ihnen eine Felskanzel an der
//       rechten Kanalwand, vorn eine Felswand → Stern 1 (vom zweiten Stachelblock aus schießen, dann hineingehen).
//     3 tief darunter am Kanalgrund eine Grotte, verschlossen von **vier Felsblöcken** (2 × 2) → Sternring: acht Sternmünzen im
//       Kanal (18 s) → Stern 2.
// Weggefallen: Sterne der Basis (Flutkammer-Nische, Goldraum, versteckter Raum – Goldraum und Raum bleiben als Münz-Geheimnisse),
//   Stempel; die springenden Flosslinge am Holzsteg (dort patrouilliert ein Rammfisch).

import { remixOf } from '../../level/remix.js';
import { felsen } from '../w3/_helpers_d.js';

const Y = 1;           // Land
const ROCK = { color: 0xc8a882, dark: 0x7a6250, top: 0xb8d870 };

// Felsnischen [x0, x1, zA, zB, y0, y1] (Kollision + Fels-Optik der Basis)
const NISCHE1 = [    // Ende Tiefwasser, rechts unten (Innenraum x 8,6 … 11, z −86,2 … −89,8, y −8 … −4,6; offen nach −x)
  [8.0, 11, -85.6, -86.2, -8, -4.0], [8.0, 11, -89.8, -90.4, -8, -4.0], [8.0, 11, -85.6, -90.4, -4.6, -4.0],
];
const KANZEL = [     // Kanal, rechte Wand über den Stachelblöcken (Innenraum x 7 … 9, z −170,4 … −175,6, y 1 … 3,6; offen nach −x;
  //                    Boden bündig mit den Stachelblöcken – nach dem Sprengen geht man hinein)
  [6.4, 9, -169.8, -176.2, 0.4, 1.0], [6.4, 9, -169.8, -170.4, 1.0, 4.2], [6.4, 9, -175.6, -176.2, 1.0, 4.2], [6.4, 9, -169.8, -176.2, 3.6, 4.2],
];
const GROTTE = [     // Kanalgrund unter der Kanzel (Innenraum x 7 … 9, z −169,8 … −176,2, y −6 … −2,8; offen nach −x)
  [6.6, 9, -169.2, -169.8, -6, -2.2], [6.6, 9, -176.2, -176.8, -6, -2.2], [6.6, 9, -169.2, -176.8, -2.8, -2.2],
];

const helm = (id, x, y, z) => ({ kind: 'helm_kanone', id, pos: [x, y, z], respawn: 4 });
const wand = (id, pos, size) => ({ kind: 'felsblock', id, pos, size, look: 'wand' });
const tint = (id, x, y, z, o = {}) => ({ kind: 'tintling', id, pos: [x, y, z], sight: 7, range: 4, ...o });
const ramm = (id, path, o = {}) => ({ kind: 'rammfisch', id, pos: path[0], path, speed: 1.4, sight: 7, ...o });

export const LEVEL = remixOf('3-5', {
  id: 'B-7',
  world: 11,
  title: 'Kanonenhelm-Tauchgang im Leuchtturmriff',
  timeLimit: 400,
  stamp: false,
  remove: [{ kind: 'flossling' }],
  // der Stachelfisch an der Kanal-Oberfläche weicht den Stachelblöcken aus
  change: [{ match: { id: 'sK' }, set: { pos: [-4, 0, -170] } }],
  stars: [
    [9.8, -7.4, -88],                                    // 0: Nische hinter der Felswand am Ende des Tiefwassers
    [8, Y + 0.2, -173],                                  // 1: Felskanzel neben den Stachelblöcken
    { pos: [3.4, -4.6, -173], hidden: true, id: 'stern_ring' },   // 2: Sternring in der Grotte (vier Felsblöcke)
  ],
  add: {
    segments: [
      // drei Stachelblöcke als Trittsteine im Kanal (oben begehbar, Seiten stechen)
      { type: 'stachelblock', id: 'sb1', pos: [5.2, -1, -167.6], size: [2, 2, 2], color: 'blau', spikes: ['-x', '+z', '-z'] },
      { type: 'stachelblock', id: 'sb2', pos: [5.2, -1, -173], size: [2, 2, 2], color: 'blau', spikes: ['-x', '+z', '-z'] },
      { type: 'stachelblock', id: 'sb3', pos: [5.2, -1, -178.2], size: [2, 2, 2], color: 'blau', spikes: ['-x', '+z', '-z'] },
      { type: 'sign', pos: [-3.6, Y, -158.6], text: 'Felswände?\nKanone!', size: [2.2, 0.9], yaw: 0.3 },
    ],
    enemies: [
      // Tiefwasser: Rammfische und Tintlinge statt der Flossling-Schwärme
      ramm('rf_t1', [[-7, -5, -48], [7, -5, -48]]),
      ramm('rf_t2', [[6, -3, -70], [-6, -3, -80]]),
      tint('tl_t1', -6, -7.6, -58),
      tint('tl_t2', 6, -7.6, -66, { phase: 0.5 }),
      tint('tl_t3', -3, -7.6, -84, { range: 3 }),
      // Wrackbucht: Rammfisch unter dem Holzsteg (statt der springenden Flosslinge)
      ramm('rf_b1', [[-6, -1.8, -141.8], [6, -1.8, -141.8]], { sight: 6 }),
      // Kanal: Tintling zwischen den Säulen
      tint('tl_k1', 0, -5.6, -189, { range: 3, sight: 6 }),
    ],
    items: [
      // Kanonen-Helme überall
      helm('helm_start', 2.6, Y, 4.4), helm('helm_riff', -3, Y, -34.6), helm('helm_flut', 2, 5.6, -109.6),
      helm('helm_kanal', 2.6, Y, -161.6), helm('helm_ziel', 2.6, 5, -238.6),
      // Felswand 1 vor der Nische am Ende des Tiefwassers
      wand('fels1', [8.3, -8, -88], [0.6, 3.4, 3.6]),
      // Felswand 2 vor der Kanzel über den Stachelblöcken
      wand('fels2', [6.7, 1.0, -173], [0.6, 2.6, 5.2]),
      // Felswand 3: vier Felsblöcke vor der Grotte am Kanalgrund
      wand('fels3a', [6.7, -6, -171.4], [0.6, 1.6, 3.2]), wand('fels3b', [6.7, -6, -174.6], [0.6, 1.6, 3.2]),
      wand('fels3c', [6.7, -4.4, -171.4], [0.6, 1.6, 3.2]), wand('fels3d', [6.7, -4.4, -174.6], [0.6, 1.6, 3.2]),
      // Sternring in der Grotte: acht Sternmünzen im Kanal
      { kind: 'starring', id: 'sternring', pos: [8, -6, -173], yaw: 0, star: 2, time: 18, coins: [
        [3.4, -5.2, -170], [0, -5.2, -168.5], [-3.6, -5, -171], [-5, -4.6, -175], [-2.4, -5.2, -178.5], [1.2, -3.6, -180], [4, -4.2, -177.5], [1.6, -2.6, -174],
      ] },
    ],
  },
  // Felsnischen, Kanzel und Grotte im Fels der Basis
  build(level) {
    felsen(level, [...NISCHE1, ...KANZEL, ...GROTTE], ROCK);
  },
  marks: {
    start: [0, Y, 8], riff: [0, Y, -32], tief: [0, 0, -40], nische1: [9.8, -8, -88], flut: [0, -4, -100], bucht: [0, Y, -132],
    checkpoint: [0, Y, -156], ufer: [2.6, Y, -162], sb1: [5.2, 1, -167.6], sb2: [5.2, 1, -173], kanzel: [8, Y + 0.2, -173], grotte: [8, -6, -173],
    kanal: [0, 0, -178], ausgang: [0, Y, -229], ziel: [0, 5, -245],
  },
});
