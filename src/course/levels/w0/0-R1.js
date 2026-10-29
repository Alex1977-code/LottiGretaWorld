// Remix-Beispiel 0-R1 „Kraxelwiese bei Mondschein“ (Präzisierung „Motor und Bausteine Bonuswelten“, level/remix.js):
// Nacht-Remix des Welt-1-Levels 1-1, nur über Regeln – das Basislevel bleibt unverändert, Änderungen an 1-1 wirken hier mit.
// Basis per Id ('1-1', über die Registry). Regeln: Nacht-Beleuchtung (Thema grass@nacht: Mond, Sterne, Mondlicht), Musik
// des Basislevels mit Klang-Variante 'nacht', kein Stempel, Pilzlinge → Hüpfmäuse (auch was ?-Blöcke später erzeugen),
// Hasen und Item-Baum entfernt, der Krallen-?-Block auf der Terrasse gibt die Funkenblüte, Stachel-Hüpfmäuse und Zeit-Uhren
// neu, Sterne an neuen Stellen. Test: tests/course_star_blocks.mjs (SB_PART=remix).
import { remixOf } from '../../level/remix.js';

export const LEVEL = remixOf('1-1', {
  id: '0-R1',
  world: 0,
  title: 'Kraxelwiese bei Mondschein',
  light: 'nacht',
  music: { variant: 'nacht' },
  timeLimit: 400,
  stamp: false,
  replaceKind: { pilzling: 'huepfmaus' },
  remove: [{ kind: ['bunny', 'itemtree'] }],
  change: [{ match: { kind: 'question', box: [-4.5, 5, -12.2, -3.5, 7, -11] }, set: { content: 'funkenbluete' } }],
  stars: [
    [-3.5, 11.2, -76],     // 0: oben auf der Kletterwand
    [8, 13.2, -98.5],      // 1: Gipfel des großen Hügels (früher Riesen-Hase)
    [7.4, 4.95, -159],     // 2: Nische unter den Steinblöcken (wie in der Basis)
  ],
  clocks: { id: 'uhren', list: [[0, 2.2, -2], [-4, 5.4, -26], [-1, 5.4, -58]], sec: 10 },
  add: {
    enemies: [
      { kind: 'huepfmaus_stachel', id: 'nacht_stachel', pos: [0, 7, -112], path: [[-4, 7, -112], [4, 7, -112]] },
    ],
  },
  marks: { mond: [0, 7, -100] },
});
