// B-1 „Funkentanz in der Kippfeld-Manege“ – Welt Blume (Remix-Welt 2), Remix von 1-5 „Kippfeld-Manege“ (Bauplan Welt Blume
// B-1: „Funkenflämmchen wandern über die Schaltfelder; Hammer-Werfer bei den Pilz-Trampolinen; bewegte Schaltfelder öffnen
// eine Glasrohr-Kanone. Sterne: 1) Rätselbox hinter dem Start, 4 Wand-Schaltfelder. 2) Sternring. 3) rechts neben dem Sims am
// Ende per Ball oder Wurfsichel.“). Basis als Daten über remixOf (level/remix.js) – 1-5 bleibt unverändert, Änderungen an 1-5
// wirken hier mit. Abendvorstellung: das Zelt bei Nacht (Thema circus@nacht, Scheinwerfer), Musik der Basis (course_circus,
// ohne Variante laut Vertrag), 400 s, kein Stempel.
//
// Remix-Regeln:
//   • Funkenflämmchen (5) hüpfen über die Schaltfelder: zwei umrunden Feld 1, je eines Feld 2 und die grüne Bühne, eines hüpft
//     auf der Wechselschalter-Fähre hin und her (verletzen bei jeder Berührung, nur Power-ups/Wurfsichel besiegen sie).
//   • Flatterkäfer-Zone: zwei Pilz-Trampoline (Bühnen A und B) federn zu zwei Hochbühnen, auf denen je ein Hammer-Werfer steht
//     – ihre Hämmer fliegen im Bogen auch auf den Weg darunter. Dort oben liegen die Sternmünzen des Sternrings.
//   • Die Glasrohr-Kanone zur Zielbühne ist mit einem goldenen Gitter verschlossen; erst wenn alle sechs Wechselfelder der
//     fahrenden Fähre an sind, springt das Schloss auf (sonst Stern 3 und Absturz der Wackelplattform der Basis).
//   • Der Krallen-?-Block an der Landebühne gibt die Wurfsichel; die Sternkiste im Kistenraum ein Extraleben.
// Sterne (neu): 0 Rätselbox hinter dem Start → Wandschalter-Kammer (x ≈ −60): vier Schaltfelder an den Innenwänden eines
//   Wandsprung-Schachts berühren (Wandsprung-Kette), der Stern erscheint oben im Schacht · 1 Sternring auf der Checkpoint-Trommel:
//   acht Sternmünzen über den Pilz-Trampolinen und auf den Hochbühnen der Hammer-Werfer in 16 s, der Stern erscheint auf Bühne C
//   · 2 Wurfbude rechts neben dem Sims an der Zielbühne: der Stern liegt hinter einem schmalen Fenster (zu niedrig für die
//   Figur) – nur der Wurfball vom Sims oder die Wurfsichel holen ihn.
import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS } from '../w1/1-5.js';
import { stage, ring, arc, wandSchalter, kanonenSperre, wurfbude } from './_helpers_ba.js';

const PI = Math.PI;
const RX = -60, RZ = -6.6;        // Wandschalter-Kammer: Mitte des Wandsprung-Schachts
const SIMS = { x0: 5, x1: 9, z: -189, top: 10 };
const BUDE = { x: 13.6, y: 10, z: -189, win: [10.6, 11.22] };

// Wand-Schaltfelder an den Innenseiten der beiden Schachtwände (links x −61,25 Normale +X, rechts x −58,75 Normale −X)
const WAND = [
  { pos: [RX - 1.24, 2.6, RZ], n: [1, 0] },
  { pos: [RX + 1.24, 5.0, RZ], n: [-1, 0] },
  { pos: [RX - 1.24, 7.4, RZ], n: [1, 0] },
  { pos: [RX + 1.24, 9.8, RZ], n: [-1, 0] },
];

const flamme = (id, path, o = {}) => ({ kind: 'funkenflaemmchen', id, pos: path[0], path, loop: true, hop: 0.8, height: 0.45, wake: 26, ...o });

export const LEVEL = remixOf('1-5', {
  id: 'B-1',
  world: 11,
  title: 'Funkentanz in der Kippfeld-Manege',
  light: 'nacht',
  timeLimit: 400,
  stamp: false,
  change: [
    // Wechselfelder der Fähre öffnen die Kanone (statt Stern 3); die Wackelplattform stürzt weiter ab
    { match: { id: 'wechsel', in: 'segments' }, set: { onAll: [{ open: 'b1_sperre' }, { drop: 'wackel' }] } },
    // Krallen-?-Block an der Landebühne → Wurfsichel (für die Wurfbude), Sternkiste → Extraleben
    { match: { kind: 'question', box: [-2.5, 6, -164.5, -1.5, 7, -163.5] }, set: { content: 'sichel' } },
    { match: { id: 'sternkiste' }, set: { content: 'oneup' } },
  ],
  stars: [
    { pos: [RX, 10.9, RZ], hidden: true, id: 'b1_wandstern' },     // 0: oben im Wandsprung-Schacht
    { pos: [-4.4, 4.4, -88.6], hidden: true, id: 'b1_ringstern' },  // 1: Sternring (erscheint auf Bühne C)
    [BUDE.x + 0.1, BUDE.y + 0.25, BUDE.z],                           // 2: in der Wurfbude hinter dem Fenster
  ],
  // Kameraschienen der Basis plus Wandschalter-Kammer und Sims/Wurfbude (abseits, über area)
  camera: [
    ...BASIS.camera,
    { from: 10, to: -14, pitch: 40, dist: 13.5, yaw: 0, x: RX, xLock: 0.6, area: [RX - 10, RX + 10] },
    { from: -185, to: -193, pitch: 42, dist: 13.5, yaw: 0, x: 9.5, xLock: 0.85, area: [SIMS.x0 + 0.5, SIMS.x1 + 6] },
  ],
  add: {
    segments: [
      // ------------------------------------------------ Wandschalter-Kammer (abseits links, x ≈ −60)
      { type: 'deco_w1b', items: [
        stage(RX, 0, -2, 15, 14, { color: 0x8a2ad0, bulbs: false }),
        stage(RX - 2, 12, RZ, 1.5, 4, { h: 12, color: 0xffc21a, skirt: [0xd0302a, 0xfff4e0], bulbs: false, inlay: false }),
        stage(RX + 2, 12, RZ, 1.5, 4, { h: 12, color: 0xffc21a, skirt: [0x2a4fd0, 0xfff4e0], bulbs: false, inlay: false }),
        stage(RX, 13, -9.1, 15, 1, { h: 13, color: 0xd0302a, skirt: [0x7a1aa0, 0xfff4e0], bulbs: false, inlay: false }),
        stage(RX - 7.9, 4, -2, 0.8, 14, { h: 4, color: 0xffc21a, bulbs: false, inlay: false, camIgnore: true }),
        stage(RX + 7.9, 4, -2, 0.8, 14, { h: 4, color: 0xffc21a, bulbs: false, inlay: false, camIgnore: true }),
        { kind: 'curtain', pos: [RX, 0, -8.55], size: [14, 12], color: 0xc81e2a },
        { kind: 'bunting', from: [RX - 7.5, 4.6, 4.6], to: [RX - 7.5, 4.6, -8.4], sag: 0.6, n: 16 },
        { kind: 'bunting', from: [RX + 7.5, 4.6, 4.6], to: [RX + 7.5, 4.6, -8.4], sag: 0.6, n: 16 },
        { kind: 'drum', pos: [RX - 5.4, 0, 2.6], size: [1.6, 0.9], color: 'blue' },
        { kind: 'balloons', pos: [RX + 5.6, 0, 3.2], n: 5, size: 1.8 },
        { kind: 'confetti', pos: [RX, 0, 0], size: [12, 8], n: 40 },
      ] },
      { type: 'sign', pos: [RX - 4.6, 0, -3.6], text: 'Vier Felder\nan der Wand!', size: [2.6, 1.0] },
      // ------------------------------------------------ Flatterkäfer-Zone: Pilz-Trampoline und Hochbühnen der Hammer-Werfer
      { type: 'pilztrampolin', id: 'b1_pilz1', pos: [-5.6, 3, -74.4], strength: 19 },
      { type: 'pilztrampolin', id: 'b1_pilz2', pos: [4.6, 3.5, -81.2], strength: 19 },
      { type: 'deco_w1b', items: [
        stage(-10.5, 10, -78, 4, 4, { color: 0x8a2ad0, inlay: false }),
        stage(8.6, 10.5, -84.2, 4, 4, { color: 0x2a9a5a, inlay: false }),
        { kind: 'pennant', pos: [-12, 10, -79.6], size: 1.8, color: 'yellow' },
        { kind: 'pennant', pos: [10.1, 10.5, -85.8], size: 1.8 },
      ] },
      // ------------------------------------------------ Landebühne: Hinweis zur verschlossenen Kanone
      { type: 'sign', pos: [6.6, 4, -159.4], text: 'Kanone zu!\nErst alle\nWechselfelder', size: [2.4, 1.2], yaw: -0.3 },
      // ------------------------------------------------ Zielbühne: Sims mit Wurfball, Wurfbude über dem Abgrund
      { type: 'deco_w1b', items: [
        stage((SIMS.x0 + SIMS.x1) / 2, SIMS.top, SIMS.z, SIMS.x1 - SIMS.x0, 3, { color: 0xd0302a, inlay: false }),
        { kind: 'pennant', pos: [SIMS.x1 - 0.5, SIMS.top, SIMS.z + 1.2], size: 1.6, color: 'blue' },
      ] },
      { type: 'sign', pos: [SIMS.x1 - 1.2, SIMS.top, SIMS.z - 1.1], text: 'Wurfbude', size: [1.8, 0.7], yaw: 0.6 },
      // Scheinwerfer der Abendvorstellung auf die neuen Stellen
      { type: 'deco_w1b', items: [
        { kind: 'spotlight', pos: [RX - 12, 18, 6], target: [RX, 6, RZ], r: 3.2, color: 0xffe0b0 },
        { kind: 'spotlight', pos: [26, 22, -176], target: [BUDE.x, BUDE.y + 1, BUDE.z], r: 2.6, color: 0xffd0f0 },
        { kind: 'spotlight', pos: [-24, 22, -66], target: [-10.5, 10, -78], r: 2.4, color: 0xc8e4ff },
        { kind: 'spotlight', pos: [24, 22, -70], target: [8.6, 10.5, -84.2], r: 2.4, color: 0xc8ffd8 },
      ] },
    ],
    enemies: [
      // Funkenflämmchen auf den Schaltfeldern (Feld 1: zwei gegenläufig versetzt, Feld 2, grüne Bühne, Fähre)
      flamme('b1_funke1', [[-5, 0, -1], [5, 0, -1], [5, 0, -7], [-5, 0, -7]]),
      flamme('b1_funke2', [[5, 0, -7], [-5, 0, -7], [-5, 0, -1], [5, 0, -1]], { phase: 0.5 }),
      flamme('b1_funke3', [[-2.5, 0, -29.5], [2.5, 0, -29.5], [2.5, 0, -33], [-2.5, 0, -33]], { color: 'blau' }),
      flamme('b1_funke4', [[-2.5, 1.5, -52.4], [0, 1.5, -54.4], [2.5, 1.5, -52.4]]),
      { kind: 'funkenflaemmchen', id: 'b1_funke5', pos: [-2.2, 4, -132.2], dir: [1, 0], hop: 0.7, height: 0.4, wake: 26, color: 'blau' },
      // Hammer-Werfer auf den Hochbühnen
      { kind: 'hammer_werfer', id: 'b1_hammer1', pos: [-10.5, 10, -78], axis: [0, 1], pace: 0.6, sight: 13, interval: 3.2, volley: 2, jumpEvery: 4.2 },
      { kind: 'hammer_werfer', id: 'b1_hammer2', pos: [8.6, 10.5, -84.2], axis: [0, 1], pace: 0.6, sight: 13, interval: 3.4, volley: 2, jumpEvery: 4.6, first: 1.8 },
    ],
    items: [
      // Rätselbox hinter dem Start ↔ Wandschalter-Kammer
      { kind: 'warpbox', id: 'b1_raetsel', style: 'mystery', pos: [3.2, 0, 6.4], target: 'b1_kammerAus' },
      { kind: 'warpbox', id: 'b1_kammerAus', style: 'mystery', pos: [RX + 5, 0, 2.4], target: [2.6, 0, 3.4] },
      ring([RX, 0.8, 0.6], 1.8, 8),
      // Sternring auf der Checkpoint-Trommel: acht Sternmünzen über den Pilz-Trampolinen und auf den Hochbühnen
      { kind: 'sternring', id: 'b1_ring', pos: [2.4, 2.5, -65.4], yaw: PI / 2, time: 16, star: 1, coins: [
        [-6.6, 8.2, -75.8], [-9.8, 10.7, -77.0], [-11.2, 10.7, -78.8],
        [1.6, 4.3, -79.2], [5.6, 8.8, -82.2], [7.8, 11.2, -83.4], [9.4, 11.2, -85.0], [-2.2, 4.8, -87.4],
      ] },
      ...arc([-5.6, 4.6, -74.4], [-10.5, 10.6, -78], 4, 2.2),
      // Wurfball auf dem Sims (für die Wurfbude)
      { kind: 'wurfball', id: 'b1_ball', pos: [SIMS.x1 - 1.4, SIMS.top, SIMS.z + 0.6], color: 'rot', respawn: 1.5 },
    ],
  },
  build(level) {
    wandSchalter(level, { id: 'b1_wand', tiles: WAND, onAll: { star: 0 }, at: [RX, 10.9, RZ] });
    kanonenSperre(level, { id: 'b1_sperre', pos: [3.5, 4, -162.25], width: 2.5, height: 2.3, axis: 'x', face: 1 });
    wurfbude(level, { id: 'b1_bude', pos: [BUDE.x, BUDE.y, BUDE.z], face: -1, size: [2.2, 2.6, 3], window: BUDE.win, pole: -14 });
  },
  marks: {
    raetsel: [3.2, 0, 6.4], kammer: [RX, 0, 0], schacht: [RX, 0, RZ + 1.6],
    pilz1: [-5.6, 3, -74.4], pilz2: [4.6, 3.5, -81.2], hoch1: [-10.5, 10, -78], hoch2: [8.6, 10.5, -84.2],
    ring: [2.4, 2.5, -65.4], sims: [SIMS.x1 - 0.8, SIMS.top, SIMS.z], bude: [BUDE.x, BUDE.y, BUDE.z], sperre: [3.5, 4, -161],
  },
});
