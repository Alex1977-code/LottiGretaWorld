// B-4 „Uhrenhatz durch die Werferburg“ – Welt Blume (Remix-Welt 2), Remix von 7-1 „Werferburg am Blauglutsee“ (Bauplan
// Welt Blume B-4: „30 s, nur Zeit-Uhren verlängern; gleicher Aufbau, Sterne an neuen Stellen; Geheimnisse: unsichtbare
// längliche ?-Blöcke links vom ersten Stampfstein; beleuchtete Bodenstelle nach den Lava-Glasröhren per Stampfen öffnen;
// Sterne: 1) oben auf einem Dreier-Pilzlingsturm am Start 2) ersten Stampfstein hochfahren, links 3) beleuchtete
// Bodenstelle“). Basis als Daten über remixOf (level/remix.js) – 7-1 bleibt unverändert. Thema und Musik der Basis, Musik mit
// der Klang-Variante schnell, kein Stempel.
//
// Remix-Regeln:
//   • Uhrenhatz: Start mit 30 s; nur goldene Zeit-Uhren (+10 s) verlängern – 13 auf der Ideallinie (Burghof, Werfer-Hof,
//     rechte Werfer-Insel, Hubinsel, beide Feuerstab-Plattformen, Werferturm-Platz, Kontrollpunkt, Gang, Torplatz) und drei
//     bei den Sternen (Pilzlingsturm, Bodenstelle, Stampfstein). Nach einem Neustart am Kontrollpunkt wieder 30 s; die
//     eingesammelten Uhren bleiben weg (dahinter liegen noch vier).
//   • Gleicher Aufbau wie die Basis; das Geheimnis der Basis (unsichtbare Blöcke zum Turm, grüne Röhre in den Kugelsaal) und
//     der Sternenring entfallen.
// Sterne (neu): 0 Stampfstein 1 hochfahren: auf den gefallenen Stein springen, oben mitfahren und links auf den Mauer-Erker
//   (vom Gang und von der Zinnenmauer zu hoch) · 1 beleuchtete Bodenstelle auf der Hubinsel (nach den Lava-Glasröhren):
//   Stampfattacke öffnet sie, der Stern steigt heraus · 2 oben auf dem Dreier-Pilzlingsturm im Burghof (alle drei Pilzlinge
//   abtragen).
// Geheimnis: zwei unsichtbare längliche ?-Blöcke links vom ersten Stampfstein (von unten anstoßen → je fünf Münzen).
import { remixOf } from '../../level/remix.js';
import { geheimLaengsblock } from '../w7/_helpers_a.js';
import { leuchtfleck } from './_helpers_ba.js';
import { Bld, litTop } from '../w5/_helpers_b.js';

const Y = 1;
const PI = Math.PI;
const FLECK = [4.6, Y, -89.4];                       // beleuchtete Bodenstelle (Hubinsel)
const ERKER = { x0: -4.6, x1: -3.0, z0: -176.7, z1: -174.3, top: Y + 8.2 };   // Mauer-Erker über dem ersten Stampfstein
const c = (x, z, y = Y + 1.0) => [x, y, z];

export const UHREN = [
  // Ideallinie
  c(0, -1), c(-3.5, -8), c(0, -37), c(7, -64.5), c(0, -84), c(-3.8, -101.5), c(-3.8, -114.5), c(0, -129), c(1.8, -160),
  c(2.6, -173), c(-2.6, -187), c(3, -198.6), c(0, -215),
  // bei den Sternen
  c(6.2, -9.6), c(5.6, -86.8), c(-3.0, -169.6),
];

export const LEVEL = remixOf('7-1', {
  id: 'B-4',
  world: 11,
  title: 'Uhrenhatz durch die Werferburg',
  timeLimit: 30,
  music: { variant: 'schnell' },
  stamp: false,
  clocks: { id: 'b4_uhren', list: UHREN, sec: 10 },
  remove: [
    // Geheimnis der Basis (unsichtbare Blöcke zum Turm, grüne Röhre in den Kugelsaal, Hinweis-Münzbogen) und Sternenring
    { id: ['geheim', 'saal_hin', 'sternring'] },
    { kind: 'coin', box: [-7.6, Y + 3, -164, -3.4, Y + 8, -161] },
  ],
  change: [
    // Stern 2 sitzt oben auf dem Dreier-Pilzlingsturm im Burghof
    { match: { id: 'turm1' }, set: { carries: 'star:2' } },
    { match: { type: 'sign', where: (s) => /Werferburg/.test(s.text ?? '') }, set: { text: 'Uhrenhatz!\nUhr: +10 s', size: [2.8, 1.1] } },
  ],
  stars: [
    [(ERKER.x0 + ERKER.x1) / 2, ERKER.top + 0.05, (ERKER.z0 + ERKER.z1) / 2],   // 0: Mauer-Erker über Stampfstein 1
    { pos: [FLECK[0], FLECK[1] + 0.3, FLECK[2]], hidden: true, id: 'b4_fleckstern' }, // 1: aus der Bodenstelle
  ],
  build(level) {
    // Mauer-Erker (fest) auf der linken Zinnenmauer des Gangs
    level.world.add({ type: 'box', min: [ERKER.x0, ERKER.top - 0.4, ERKER.z1], max: [ERKER.x1, ERKER.top, ERKER.z0], tag: 'erker' });
    if (level.view) {
      const b = new Bld();
      const stone = litTop(0x8a92b8), dark = litTop(0x646a88);
      b.box(ERKER.x1 - ERKER.x0, 0.4, ERKER.z0 - ERKER.z1, (ERKER.x0 + ERKER.x1) / 2, ERKER.top - 0.4, (ERKER.z0 + ERKER.z1) / 2, stone, { r: 0.04 });
      // Kragsteine unter dem Erker und Zinnen am Rand
      for (const z of [ERKER.z1 + 0.35, ERKER.z0 - 0.35]) b.box(0.5, 0.9, 0.4, ERKER.x0 + 0.3, ERKER.top - 1.3, z, dark, { r: 0.03 });
      for (const z of [ERKER.z1 + 0.3, (ERKER.z0 + ERKER.z1) / 2, ERKER.z0 - 0.3]) b.box(0.36, 0.42, 0.42, ERKER.x0 + 0.18, ERKER.top, z, stone, { r: 0.03 });
      b.flush(level);
    }
    // beleuchtete Bodenstelle (Stampfattacke → Stern 1) unter einer Laterne am Galgen
    leuchtfleck(level, { id: 'b4_fleck', pos: FLECK, r: 0.9, lamp: [FLECK[0] + 0.6, Y + 5.2, FLECK[2] - 0.4], onOpen: { star: 1 } });
    if (level.view) {
      const b = new Bld();
      const wood = litTop(0x5a3a22);
      b.cyl(0.12, 0.14, 5.6, FLECK[0] + 2.2, Y, FLECK[2] - 0.4, wood, 7);
      b.box(1.9, 0.16, 0.16, FLECK[0] + 1.3, Y + 5.5, FLECK[2] - 0.4, wood, { r: 0.02 });
      b.cyl(0.02, 0.02, 0.3, FLECK[0] + 0.6, Y + 5.2, FLECK[2] - 0.4, 0x2a2a30, 4);
      b.flush(level);
    }
    // zwei unsichtbare längliche ?-Blöcke links vom ersten Stampfstein
    geheimLaengsblock(level, { id: 'b4_geheim1', pos: [-2.6, Y + 2.5, -171.6], size: [2.4, 0.8, 1], coins: 5 });
    geheimLaengsblock(level, { id: 'b4_geheim2', pos: [-2.6, Y + 2.5, -179.4], size: [2.4, 0.8, 1], coins: 5 });
  },
  marks: {
    turm1: [3.5, Y, -9.5], fleck: FLECK, erker: [-3.8, ERKER.top, -175.5], stampf1: [-1.8, Y, -175.5], cp: [0, Y, -161],
  },
});
