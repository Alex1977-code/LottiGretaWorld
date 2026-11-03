// P-7 „Sinkschollen über dem Blauglutsee“ – Remix der Welt Pilz (Bauplan Welt Pilz P-7, Basis 7-4 „Schubser-Rummel im
// Blauglutkessel“: „keine Schubser; sinkende Plattformen über blauer Lava, Stachelwalzen; ?-Blöcke mit Gleitblatt zum
// Gleiten. Sterne: 1) sinkende Plattform am Start 2) über einer Stachelwalzen-Plattform 3) unsichtbare Plattform hinter der
// Zielröhre, nur gleitend“). Zugang auf der Karte ab 310 Sternen (worlds/w10.js).
//
// Übernimmt 7-4 als Daten (remixOf) – Steinbauten, Pendelstacheln, Zylinder, Stachelwalzen, Röhre zum Finale und die
// Kippplattform bleiben, wie sie sind; Änderungen an 7-4 wirken hier mit. Regeln:
//   - Nacht im Kessel (Thema bluelava@nacht, Musik course_bluebelt mit Klang-Variante 'nacht'), kein Stempel, 400 s.
//   - Keine Schubser (alle sechs entfernt, samt Kippplattform-Aufgabe und Sternring) und keine Knochenflieger – nachts zählen
//     nur Schollen, Walzen, Pendel und Zylinder; die Rätselbox führt nur noch in einen Münzraum (ohne Aufgabe).
//   - Statt der Pfeilplattformen aus der Lava liegen zerbrochene **Sinkschollen** im Zickzack (_helpers_pb.js
//     sinkschollen): wer darauf stehen bleibt, versinkt mit ihr in der Lava. Die drei Mauer-Pfeilplattformen bleiben.
//   - Beide ?-Blöcke mit Wurfsichel geben jetzt das **Gleitblatt**, ein dritter steht auf Steinbau I vor der Röhre.
//   - Sterne neu: 0 auf der zweiten Sinkscholle links vom Startplatz (über die Seitensäule, hochspringen, bevor sie
//     sinkt) · 1 über der Stachelwalze auf der **Walzeninsel** links von Zylinder 3 (Seitenweg G → Scholle → Insel →
//     Scholle → H; im Sprung über die Walze) · 2 auf einer **unsichtbaren Plattform** 18 m hinter der Röhre zum Finale –
//     nur im Gleitflug vom Röhrendach erreichbar (sie wird beim Landen sichtbar; Warp-Box zurück auf Steinbau I).
import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS } from '../w7/7-4.js';
import { festungRand } from '../w7/_helpers_b.js';
import { sinkschollen, geheimPlatte, isl, line, arc } from './_helpers_pb.js';

const Y = 1.5;          // Oberseite der Steinbauten (wie 7-4)
const PT = 1.0;         // Oberseite der Schollen (wie die Pfeilplattformen der Basis)
const FX = 60;          // Finale (x)
const WH = 0.6 + 0.55;  // Achshöhe der Stachelwalzen über dem Boden (radius + Böcke)

// Sinkschollen: Hauptweg (statt pf1 … pf7 und pz1 … pz3), Sternkette am Start, Walzen-Seitenweg
export const SCHOLLEN = [
  { id: 's1', pos: [-1.2, PT, -10.2] }, { id: 's2', pos: [1.2, PT, -13.8] }, { id: 's3', pos: [-1.2, PT, -17.4] },
  { id: 's4', pos: [1.5, PT, -33.4] }, { id: 's5', pos: [-0.5, PT, -37.6] },
  { id: 's6', pos: [3, PT, -58.6] }, { id: 's7', pos: [1, PT, -62.6] },
  { id: 'z1', pos: [FX - 1, PT, -207.6] }, { id: 'z2', pos: [FX + 1, PT, -211.6] }, { id: 'z3', pos: [FX - 1, PT, -215.6] },
  { id: 'sa', pos: [-11.8, PT, -3.6] }, { id: 'sb', pos: [-15.2, PT, -7.6] },
  { id: 'sw1', pos: [-8.1, PT, -144.5] }, { id: 'sw2', pos: [-8.1, PT, -159] },
];
export const M7 = {
  Y, PT, FX, WH,
  STERN0: [-15.2, PT + 2.7, -7.6],
  INSEL: { x0: -12.5, x1: -7, zA: -147, zB: -156.5 }, WALZE: [-9.75, Y + WH, -151.8], STERN1: [-9.75, Y + 3.4, -151.8],
  GEHEIM: { x0: -2.5, x1: 2.5, zA: -199.5, zB: -204.5, top: Y }, STERN2: [0, Y + 1.0, -202],
  ROHR: [0, Y, -181], ZURUECK: [3.5, Y, -172.5],
};

const near = (p, q, r = 0.6) => Math.hypot(p[0] - q[0], p[2] - q[2]) < r;

export const LEVEL = remixOf('7-4', {
  id: 'P-7',
  world: 10,
  title: 'Sinkschollen über dem Blauglutsee',
  light: 'nacht',
  music: { variant: 'nacht' },
  timeLimit: 400,
  stamp: false,
  remove: [
    { kind: ['schubser', 'knochenflieger'] },
    { id: ['kipp_aufgabe', 'sternring'] },
    { type: 'pfeilplattform', id: ['pf1', 'pf2', 'pf3', 'pf4', 'pf5', 'pf6', 'pf7', 'pz1', 'pz2', 'pz3'] },
  ],
  change: [
    // ?-Blöcke: Gleitblatt statt Wurfsichel
    { match: { kind: 'question', in: 'blocks' }, fn: (e) => (e.content === 'sichel' ? { ...e, content: 'gleitblatt' } : e) },
    // Rätselbox ohne Aufgabe (kein Schubser mehr im Raum): nur noch ein Münzraum
    { match: { id: 'rb2' }, fn: (e) => { const x = { ...e }; delete x.task; return x; } },
    // Lavablase neben Zylinder 3 weicht der Walzeninsel aus
    { match: { type: 'lavablase' }, fn: (e) => ({ ...e, list: e.list.map((b) => (near(b.pos, [-9.5, 0, -151.5]) ? { ...b, pos: [-13, 0, -164.5] } : b)) }) },
  ],
  stars: [M7.STERN0, M7.STERN1, M7.STERN2],
  camera: [
    ...BASIS.camera,
    // Gleitflug hinter die Röhre zum Finale
    { from: -184, to: -212, pitch: 40, dist: 16, ahead: 3, area: [-40, 40] },
  ],
  add: {
    segments: [
      // Walzeninsel (Stern 1) links von Zylinder 3
      isl(M7.INSEL.x0, M7.INSEL.x1, M7.INSEL.zA, M7.INSEL.zB, Y, Y + 2, { top: 'stone' }),
      { type: 'stachelwalze_rot', id: 'w_insel', pos: M7.WALZE, radius: 0.6, length: 5.6, axis: 'x', speed: 1.5, stand: true, shadow: false },
      { type: 'sign', pos: [4.2, Y, -180.6], text: 'Gleiten?', size: [1.8, 0.8], yaw: 0 },
    ],
    blocks: [
      { kind: 'question', pos: [3.5, Y + 2.2, -171.6], content: 'gleitblatt' },
      { kind: 'question', pos: [-11.4, Y + 2.2, -155.4], content: 'coins:5' },
    ],
    items: [
      // Sternkette am Start, Walzen-Seitenweg, Gleitspur hinter der Röhre
      ...arc([-8.2, Y + 1.2, -1.5], [-11.8, PT + 0.6, -3.6], 3, 1),
      ...arc([-11.8, PT + 0.6, -3.6], [-15.2, PT + 0.6, -7.6], 3, 1.2),
      ...arc([-5, Y + 0.6, -146], [-8.1, PT + 0.6, -144.5], 3, 1),
      line([-8.1, PT + 0.6, -157.6], [-8.1, PT + 0.6, -160.4], 2),
      line([0, Y + 3.4, -186], [0, Y + 1.8, -197], 6),
      // unsichtbare Plattform: Warp-Box zurück auf Steinbau I (erscheint mit der Plattform)
      { kind: 'warpbox', id: 'geheim_zurueck', pos: [1.7, Y, -203.6], target: M7.ZURUECK, hidden: true },
    ],
  },
  build(level) {
    sinkschollen(level, SCHOLLEN, { sink: 0.42, rise: 0.7, low: -0.45 });
    festungRand(level, [{ x0: M7.INSEL.x0, x1: M7.INSEL.x1, zA: M7.INSEL.zA, zB: M7.INSEL.zB, y: Y, edges: 'l', windows: true }]);
  },
  setup(level) {
    const g = geheimPlatte(level, { id: 'geheim', ...M7.GEHEIM });
    level.onStep(() => {
      if (g.shown && !g.revealed) { g.revealed = true; level.named.get('geheim_zurueck')?.reveal?.(); }
    });
  },
  marks: {
    start: [0, Y, 6], sternkette: [-8.2, Y + 0.6, -1.5], walzeninsel: [-9.75, Y, -149], roehre: [0, Y, -178.2], geheim: [0, Y, -202],
    finale: [FX, Y, -181], ziel: [FX, Y, -227.5],
  },
});
