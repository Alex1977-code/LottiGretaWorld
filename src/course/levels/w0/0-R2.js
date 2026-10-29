// Remix-Beispiel 0-R2 „Walzenhatz gegen die Uhr“ (Präzisierung „Motor und Bausteine Bonuswelten“, level/remix.js):
// Ausschnitt-Remix mit Zeitdruck aus 2-4 „Hügelmühle“ – nur der Rollhügel (z −22 … −110), Abendrot, 30 s Zeit, die Zeit-Uhren
// bilden die Ideallinie, Stachel-Hüpfmäuse statt Hüpfmäusen, Musik der Basis mit Klang-Variante 'schnell'. Basis als
// importiertes LEVEL-Objekt; der Aufbau-Haken der Basis (Mühle, Kaninchen, Untergrund-Dielen, Blumen) läuft gefiltert:
// alles ganz außerhalb des Bereichs entfällt. Test: tests/course_star_blocks.mjs (SB_PART=remix).
import { remixOf } from '../../level/remix.js';
import { LEVEL as HUEGELMUEHLE } from '../w2/2-4.js';

const YU = 6;

export const LEVEL = remixOf(HUEGELMUEHLE, {
  id: '0-R2',
  world: 0,
  title: 'Walzenhatz gegen die Uhr',
  keep: { box: [-14, -4, -24, 14, 24, -110], margin: 0.5 },
  // Kletterfels und Glasröhren am Rand des Ausschnitts, Röhre hinab in den (weggeschnittenen) Untergrund und ihr Schild
  remove: [{ box: [-10, 0, -25, 10, 12, -20] }, { id: ['g_links', 'g_rechts', 'p_hinab'] }, { type: 'sign', box: [-8, 0, -104, -2, 10, -100] }],
  replaceKind: { huepfmaus: 'huepfmaus_stachel' },
  light: 'abend',
  music: { variant: 'schnell' },
  timeLimit: 30,
  clocks: { id: 'uhren', sec: 8, list: [[0, YU + 1.2, -34], [0, YU + 1.2, -47.5], [0, YU + 1.2, -60.5], [-3, YU + 1.2, -78], [2, YU + 1.2, -92]] },
  start: { pos: [0, YU, -27], yaw: Math.PI / 2 },
  checkpoint: null,
  goal: { pos: [0, YU, -104], height: 7 },
  stamp: false,
  stars: [[9, YU + 1.2, -36], [7, YU + 4.4, -74], [-9, YU + 1.2, -100]],
  marks: { start: [0, YU, -27], uhr1: [0, YU + 0.2, -34], ziel: [0, YU, -100], keller: [0, -14, -250] },
});
