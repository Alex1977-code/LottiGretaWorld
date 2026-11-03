// B-9 „Feuertürme im Abendrot“ – Remix von 5-1 „Schlüsselsuche am Muschelstrand“ (Bauplan Welt Blume, Detail B-9: 100 s +
// Zeit-Uhren, nur der Strand (≈ 80 m), Sonnenuntergang; 4 Pilzlingstürme mit je einem Feuer-Werfer – alle besiegen →
// Ziel-Warp-Box). Basis als Daten (remixOf, levels/w5/5-1.js bleibt unverändert). Musik der Basis (course_beach) mit
// Klang-Variante 'abend', Thema beach@abend, kein Stempel, kein Kontrollpunkt.
//
// Ablauf: Sandstrand der Basis (x −34 … 40, Flachwasser, Sandbank, lila Fels) im Abendrot. Schlüsselmünzen, Rammbock-Bullen,
//   Sandtaucher und der Höhlenfluss entfallen (keep: nur Strand und Schwebeinsel). Auf dem Strand patrouillieren vier
//   **Feuertürme** – Pilzlingstürme aus vier Pilzlingen, oben reitet je ein Feuer-Werfer (rider): links am Rettungsturm,
//   in der Mitte am Ufer, im Palmenhain und rechts zwischen den Sandsteinmauern. Ein Kampfraum zählt Türme und Werfer; sind
//   alle besiegt, erscheint die **Ziel-Warp-Box** auf der Sandbank → Schwebeinsel mit dem Zielmast. Funkenblüte im ?-Block am
//   Start (zwei weitere ?-Blöcke mit Funkenblüte am Palmenhain und an den Sandsteinmauern). 100 s, sieben Zeit-Uhren je
//   +10 s auf der Ideallinie (eine davon in Krümels Wandhöhle); nach einem Neustart liegen alle Uhren wieder da.
// Sterne (Index): 0 links vier **Strandfackeln** mit Feuerbällen anzünden → der Stern erscheint zwischen ihnen,
//   1 Mitte: **Glasröhre** vom Strand hinauf (Ende senkrecht nach oben) schießt einen auf die **Wolke** darüber – der Stern
//   liegt auf der Wolke (vom Boden aus zu hoch), 2 rechts über einem **schlafenden Dreierturm** (Pilzlingsturm, der nie
//   aufwacht: Draufspringen gibt den hohen Abprall, er fällt nie ganz um und stapelt sich wieder auf).
// Krümel feiert in seiner Wandhöhle den Sonnenuntergang (die Krabbelkäfer sind fort, dort liegt eine Zeit-Uhr).

import { remixOf } from '../../level/remix.js';
import { line, ring, arc, uhrenZurueck, strandfackeln, schlafturm } from './_helpers_bc.js';

const Y = 1;            // Strand
const SKY = 9;          // Schwebeinsel (Ziel)
const PX = 2.5;         // Glasröhre (Mitte)
const SX = 53.5, SZ = 9;   // schlafender Dreierturm rechts
const FACKELN = [[-31.4, Y, 8.8], [-32.8, Y, -2.6], [-29.6, Y, -11.6], [-21.2, Y, -11.2]];
// Türme und Werfer (Kampfraum)
const TUERME = ['turm_l', 'turm_m', 'turm_hain', 'turm_r'];
const WERFER = ['werfer_l', 'werfer_m', 'werfer_hain', 'werfer_r'];
const turm = (id, rider, path, o = {}) => ({
  kind: 'pilzlingsturm', id, pos: path[0], path, count: 4, behavior: 'walk', speed: o.speed ?? 0.6,
  rider: { kind: 'feuer_werfer', id: rider, sight: o.sight ?? 10, interval: o.interval ?? 2.6, first: o.first ?? 1.6 },
});

export const LEVEL = remixOf('5-1', {
  id: 'B-9',
  world: 11,
  title: 'Feuertürme im Abendrot',
  archetype: 'parcours',
  ride: null,
  light: 'abend',
  music: { variant: 'abend' },
  timeLimit: 100,
  stamp: false,
  checkpoint: null,
  // nur der Sandstrand (mit lila Fels und Wandhöhle) und die Schwebeinsel; Farbfeld-Raum, Grotte und Zielinsel entfallen
  keep: { box: [-42, -14, 18, 60, 22, -60], margin: 0.5 },
  remove: [
    { kind: ['schluesselmuenze', 'rammbock_bulle', 'sandtaucher'] },
    { id: ['kr_hain1', 'kr_hain2', 'kr_hain3', 'kr_burg1', 'kr_burg2', 'kr_insel1', 'kr_insel2', 'kk_insel', 'kk_strand1', 'kk_hoehle1', 'kk_hoehle2', 'marder1', 'marder2'] },
    { id: ['aufgabe_hoehle', 'p_loch', 'p_insel'] },
    { type: 'sign', box: [-4, 8, -53, -3, 10, -52] },                 // „Zur Glitzergrotte“
  ],
  change: [
    { match: { type: 'sign', box: [-4, 0, 11, -3, 2, 12] }, set: { text: 'Feuertürme\nim Abendrot' } },
    { match: { type: 'sign', box: [2.9, 0, 4.3, 3.1, 2, 4.5] }, set: { text: 'Besiege alle\n4 Feuertürme!' } },
  ],
  start: { pos: [0, Y, 10], yaw: Math.PI / 2 },
  clocks: {
    id: 'uhren', sec: 10, list: [
      [-9, Y + 1.4, 6], [-22, Y + 1.4, -4], [-6, Y + 1.4, -9.5], [9, Y + 1.4, 6.5], [24.5, Y + 1.4, 2.5], [6, Y + 1.4, -16.5],
      [48, Y + 1.2, -6.5],                                         // in Krümels Wandhöhle
    ],
  },
  stars: [
    { pos: [-29.6, Y + 1.5, -2.6], hidden: true, id: 'stern_fackeln' },   // 0: zwischen den vier Strandfackeln
    [PX, 9.0, -14.6],                                                    // 1: auf der Wolke über der Glasröhre
    [SX, 7.0, SZ],                                                       // 2: über dem schlafenden Dreierturm
  ],
  goal: { pos: [0, SKY, -54], height: 9 },
  add: {
    segments: [
      // Glasröhre vom Strand hinauf, das Ende zeigt senkrecht nach oben (schießt die Figur auf die Wolke)
      { type: 'glasspipe', id: 'roehre', oneWay: true, radius: 0.95, exitSpeed: 12, coins: 4,
        path: [[PX, Y + 0.95, -4.4], [PX, Y + 0.95, -8.6], [PX, Y + 2.0, -11.6], [PX, Y + 4.0, -13.2], [PX, Y + 5.6, -13.7]] },
      { type: 'cloud', id: 'wolke', pos: [PX, 7.8, -14.4], size: [3.4, 0.6, 3.2] },
      { type: 'sign', pos: [-30.6, Y, 2.8], text: '4 Fackeln mit\nFeuer anzünden!', size: [2.6, 0.9], yaw: 0.35 },
      { type: 'sign', pos: [-4.2, Y, -16.6], text: 'Ziel-Warp-Box:\nerst alle Türme!', size: [2.4, 0.85] },
      { type: 'sign', pos: [46.2, Y, 12.8], text: 'Pst – hier\nschläft ein Turm', size: [2.4, 0.85], yaw: -0.3 },
    ],
    blocks: [
      { kind: 'question', pos: [16, Y + 2.4, 13], content: 'funken' },       // am Palmenhain
      { kind: 'question', pos: [30.5, Y + 2.4, 4.5], content: 'funken' },    // an den Sandsteinmauern
    ],
    enemies: [
      turm('turm_l', 'werfer_l', [[-22.4, Y, 5.6], [-16.4, Y, 5.6]]),
      turm('turm_m', 'werfer_m', [[-6.6, Y, -5.4], [-1.2, Y, -5.4]], { first: 2.2 }),
      turm('turm_hain', 'werfer_hain', [[13.4, Y, 8.6], [19.6, Y, 8.6]], { first: 2.8 }),
      turm('turm_r', 'werfer_r', [[27.4, Y, -4.6], [34.6, Y, -4.6]], { first: 3.2 }),
      // schlafender Dreierturm (wacht nie auf, zählt nicht zum Kampf)
      { kind: 'pilzlingsturm', id: 'schlafturm', pos: [SX, Y, SZ], count: 3, behavior: 'walk', speed: 0, wake: 0, sight: 0 },
    ],
    items: [
      // alle vier Türme samt Werfern besiegt → Ziel-Warp-Box (warp1 der Basis) auf der Sandbank erscheint
      { kind: 'kampfraum', id: 'feuertuerme', area: { min: [-42, -4, -32], max: [42, 16, 17] }, ids: [...TUERME, ...WERFER],
        onClear: { reveal: 'warp1' }, banner: 'Alle Feuertürme besiegt – ab zur Warp-Box!' },
      // Bitcoins: zur Glasröhre, auf der Wolke, zum schlafenden Turm, in der Wandhöhle
      line([PX, Y + 0.6, -0.4], [PX, Y + 0.6, -3.2], 3),
      ring([PX, 8.8, -14.4], 1.1, 6),
      ...arc([44, Y + 0.6, 10], [51.6, Y + 0.6, 9.4], 4, 1.2),
      ring([48, Y + 0.6, -4], 1.6, 6),
      line([0, SKY + 0.6, -44], [0, SKY + 0.6, -51], 5),
    ],
  },
  build(level) {
    // die rechte Sandskulptur trägt keinen Stern mehr (Glitzer aus, Bitcoins darin)
    const sk = level.named.get('skulptur_r');
    if (sk) { sk.content = { coins: 5 }; if (sk.sparkle) sk.sparkle.material.visible = false; }
    strandfackeln(level, FACKELN.map((pos, i) => ({ id: `fackel${i + 1}`, pos })), { group: 'fackeln', onAll: { reveal: 'stern_fackeln' } });
  },
  setup(level) {
    uhrenZurueck(level, 'uhren');
    schlafturm(level, 'schlafturm', { regrow: 2.4, min: 1 });
    // Krümel feiert in seiner Wandhöhle den Sonnenuntergang (keine Käfer mehr)
    const k = level.named.get('kruemel');
    if (k) { k.state = 'happy'; k.t = 99; }
  },
  marks: {
    start: [0, Y, 10], fackeln: [-29.6, Y, -2.6], turmL: [-19.4, Y, 5.6], turmM: [-4, Y, -5.4], hain: [16.5, Y, 8.6], turmR: [31, Y, -4.6],
    roehre: [PX, Y, -3.6], wolke: [PX, 8.4, -14.4], schlaf: [SX, Y, SZ], hoehle: [48, Y, -4], warp: [1, Y, -23], ziel: [0, SKY, -54],
  },
});
