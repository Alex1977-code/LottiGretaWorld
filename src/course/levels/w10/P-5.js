// P-5 „Werfertrubel im Sonnensaal“ – Remix der Welt Pilz (Bauplan Welt Pilz P-5, Basis 6-3 „Schiebetüren im
// Kirschblütensaal“: „Tag; innen Feuer-, Hammer-, Bumerang-Werfer, Wurfbälle, Glasröhren, Stacheln; 5 Schlüsselmünzen (unter
// der Treppe; 2. Stock bei 2 Hammer-Werfern; hinter Schiebetüren im 2. und 3. Stock; per Gong hinter einer Schattenblock-
// Wand); Zielmast fliegt pendelnd, über Wolken erreichbar. Geheimnisse: Glasröhre im 3. Stock durch Stachelkugel verstopft
// (Ball oder Funkenblüte); Gong nach dem Checkpoint → Warp-Box in einen Münzraum. Sterne: 1) verstopfte Glasröhre 2) 8 grüne
// Münzen am Checkpoint 3) Münzraum“). Stockwerke des Bauplans (1.–3.) = Erdgeschoss, 1. und 2. Stock der Basis.
//
// Übernimmt 6-3 als Daten (remixOf) – Hof, Korridor mit Schiebetüren, Pilz-Masken, Saal, Scheinwände, Tempeldächer,
// Stampfsteine, Propeller-Helme und Gong-Garten bleiben; Änderungen an 6-3 wirken hier mit. Regeln:
//   - Heller Mittag (Thema fareast@tag), Musik der Basis ohne Variante, kein Stempel, 400 s.
//   - Im Saal Werfer statt Pilzlingen und Stachelwerfern: Erdgeschoss ein Bumerang-Werfer, 1. Stock zwei Hammer-Werfer,
//     2. Stock ein Feuer-Werfer (Pilz-Maske: zugewandte Werfer werfen nicht; sie sehen nur ihr eigenes Stockwerk und
//     tänzeln im Saal nur, statt zu springen – unter den Decken ist kein Platz für Werfer-Sprünge).
//     Krallen-Pilzlinge, Pilzling und Rollpilze bleiben.
//   - Fünf **Schlüsselmünzen** öffnen erst die Warp-Box hinaus auf die Tempelaußenseite: am Fuß der Treppe im Erdgeschoss
//     (unter dem Treppenlauf), im 1. Stock zwischen den Hammer-Werfern, hinter der Schiebetür 1a (Nische), hinter den beiden
//     Scheinwänden des 2. Stocks (früher Stern 0) und hinter der **Schattenblock-Wand** in der Nische 2a – der Gong im 2. Stock
//     lässt sie verschwinden (statt der Rätselbox; Käfig und Dach-Schlüssel der Basis entfallen).
//   - Wurfbälle in allen drei Stockwerken, ein niedriger ?-Block mit Funkenblüte im Erdgeschoss; im 2. Stock steckt eine Stachelkugel in
//     der Mündung einer **Glasröhre** (Ball oder Feuer sprengt sie heraus) – sie führt über die Saalwand auf den **Sternbalkon**.
//   - Tempelaußenseite: **Sternring** (8 grüne Münzen) auf der Ankunftsterrasse am Checkpoint, ein **Gong** daneben lässt die
//     Warp-Box in den **Münzraum** (Gong-Garten der Basis mit vielen Bitcoins) erscheinen; der goldene Gong zeigt dort den Stern.
//   - Kein Zielmast auf dem Dach: der **Zielmast fliegt pendelnd** hoch über dem obersten Dach, über zwei Wolken erreichbar.
import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS, M63 } from '../w6/6-3.js';
import { schattenDiaet } from '../w5/_helpers_a.js';
import { farHide, heroShadowDiet } from '../w4/_helpers_d.js';
import { pfropfen, werferStockwerk, sternBalkon, isl, line, ring } from './_helpers_pb.js';

const PI = Math.PI;
const { Y0, F, PZ, YE, RX } = M63;
const WERFER = ['feuer_werfer', 'hammer_werfer', 'bumerang_werfer'];

const KEY = (pos) => ({ kind: 'schluesselmuenze', pos, group: 'saal', onAll: [{ reveal: 'aussen' }, { sfx: 'powerup_appear' }] });
const werfer = (kind, id, pos, o = {}) => () => ({ kind, id, pos, sight: 9, interval: 2.6, first: 2.2, pace: 0.9, jumpEvery: 60, ...o });

export const M5 = {
  F, PZ, YE, RX,
  KEYS: [[18.8, F[0], -45.8], [-5, F[1], PZ], [10, F[1], -51.9], [6, F[2], -53.5], [-6, F[2], -52.3]],
  ROHR: [[-14.8, F[2] + 1.0, -42.7], [-17.4, F[2] + 1.1, -42.7], [-21.0, F[2] + 3.8, -42.7], [-24.6, F[2] + 5.9, -42.9], [-28.0, F[2] + 5.4, -43.6], [-30.6, F[2] + 2.7, -44.6]],
  PFROPFEN: [-15.0, F[2], -42.7],
  BALKON: { x0: -34.2, x1: -28.2, zA: -41.6, zB: -47.8 },
  STERN0: [-31.4, F[2] + 1.1, -45.6],
  SCHATTEN: { x: -6, y: F[2], z: -51.35 },
  GONG2: [4.4, YE, -81.2], MUENZWARP: [-3.4, YE, -80.6],
  STERN1: [0, YE + 1.3, -74.6], STERN2: [RX, 3.3, -120.4],
  WOLKEN: [[-5, YE + 9.4, -138.2], [3.4, YE + 11.2, -138.4]],
  MAST: { y: YE + 13.2, z: -140.6, x: 5.5 },
};

// Schattenblock-Wand in der Nische hinter Tür 2a (ein dunkler Block, verschwindet beim Gongschlag)
const SCHATTEN_TEILE = [{ pos: [M5.SCHATTEN.x, M5.SCHATTEN.y, M5.SCHATTEN.z], size: [2.5, 3.1, 0.5], color: 0x33245a }];

// Sternring am Checkpoint: acht grüne Münzen auf der Ankunftsterrasse (zwei hoch über dem Weg)
const RING = [[-4.2, YE + 0.5, -70.4], [-6.0, YE + 0.5, -75.6], [-1.0, YE + 0.5, -80.2], [3.0, YE + 0.5, -77.8], [6.0, YE + 0.5, -75.4], [3.8, YE + 0.5, -70.4], [0, YE + 3.1, -73.6], [0, YE + 3.1, -78.0]];

export const LEVEL = remixOf('6-3', {
  id: 'P-5',
  world: 10,
  title: 'Werfertrubel im Sonnensaal',
  light: 'tag',
  timeLimit: 400,
  stamp: false,
  goal: null,
  instances: { ...BASIS.instances, feuer_werfer: { shadow: false }, hammer_werfer: { shadow: false }, bumerang_werfer: { shadow: false }, wurfball: { shadow: false } },
  remove: [
    { id: ['raetsel1', 'raetsel2', 'gongwarp', 'swk'] },
    { kind: 'schluesselmuenze' },
  ],
  replace: [
    { match: { id: 'p1' }, with: werfer('bumerang_werfer', 'w_eg_b', [-10, F[0], PZ]) },
    { match: { id: 'sw1' }, with: werfer('hammer_werfer', 'w_1_h1', [3, F[1], PZ]) },
    { match: { id: 'sw2' }, with: werfer('hammer_werfer', 'w_1_h2', [-13, F[1], PZ], { first: 2.6 }) },
    { match: { id: 'k2' }, with: werfer('feuer_werfer', 'w_2_f', [-10, F[2], PZ], { interval: 2.8 }) },
  ],
  change: [
    { match: { id: 'aussen' }, set: { hidden: true } },
    { match: { id: 'gong' }, set: { onHit: { hide: 'schattenwand' }, coins: 6 } },
    { match: { id: 'gongzurueck' }, set: { target: 'muenzwarp' } },
    { match: { id: 'goldgong' }, set: { onHit: [{ reveal: 'stern_muenz' }, { coins: 5 }] } },
  ],
  // oberstes Dach: flacherer Blick nach oben, damit der fliegende Zielmast im Bild ist
  camera: [
    ...BASIS.camera.map((c) => (c.from === -60 && c.to === -154 ? { ...c, to: -132 } : c)),
    { from: -132, to: -154, pitch: 30, dist: 16, height: 3.4, ahead: 1, area: [-40, 40] },
  ],
  stars: [
    M5.STERN0,
    { pos: M5.STERN1, hidden: true, id: 'stern_ring' },
    { pos: M5.STERN2, hidden: true, id: 'stern_muenz' },
  ],
  add: {
    segments: [
      { type: 'appear', id: 'schattenwand', visible: true, hint: false, style: 'block', parts: SCHATTEN_TEILE },
      { type: 'glasspipe', id: 'sternrohr', path: M5.ROHR, radius: 1, oneWay: true, coins: 4, exitSpeed: 4 },
      isl(M5.BALKON.x0, M5.BALKON.x1, M5.BALKON.zA, M5.BALKON.zB, F[2], 4, { top: 'stone' }),
      { type: 'gong', id: 'terrassengong', pos: M5.GONG2, yaw: -PI / 2, size: 1.6, coins: 6, cooldown: 2, onHit: { reveal: 'muenzwarp' } },
      ...M5.WOLKEN.map((pos, i) => ({ type: 'wolkenplattform', id: `mastwolke${i + 1}`, pos, size: [3, 0.6, 3], color: 'weiss' })),
    ],
    blocks: [
      // niedriger ?-Block mit Funkenblüte im Erdgeschoss (Feuer besiegt Werfer und sprengt die Stachelkugel aus der Röhre)
      { kind: 'question', pos: [-14, F[0] + 2.1, -42.8], content: 'funkenbluete' },
    ],
    enemies: [
      { kind: 'stachelkugel', id: 'pfropfen', pos: M5.PFROPFEN, size: 1.2 },
    ],
    items: [
      ...M5.KEYS.map(KEY),
      // Wurfbälle je Stockwerk (der im 2. Stock liegt vor der verstopften Röhre)
      { kind: 'wurfball', id: 'ball_eg', pos: [-20.5, F[0], -46.8], color: 'rot', respawn: 2 },
      { kind: 'wurfball', id: 'ball_1', pos: [15.4, F[1], -42.8], color: 'gelb', respawn: 2 },
      { kind: 'wurfball', id: 'ball_2', pos: [-9.6, F[2], -42.6], color: 'weiss', respawn: 2 },
      // Sternbalkon: Warp-Box zurück in den 2. Stock
      { kind: 'warpbox', id: 'balkon_zurueck', pos: [-32.8, F[2], -42.9], target: [-12, F[2], -44.5] },
      // Sternring am Checkpoint, Warp-Box in den Münzraum (erscheint beim Gong)
      { kind: 'starring', id: 'sternring', pos: [-3.2, YE, -72.6], star: 1, time: 12, coins: RING },
      { kind: 'warpbox', id: 'muenzwarp', pos: M5.MUENZWARP, target: 'gongzurueck', hidden: true },
      // Münzraum: viele Bitcoins
      ring([RX - 6, 0.9, -108], 2, 8), ring([RX + 6, 0.9, -108], 2, 8), line([RX - 8, 0.6, -116], [RX + 8, 0.6, -116], 9),
      line([RX - 4, 2.6, -104], [RX + 4, 2.6, -104], 5), ring([RX, 3.3, -120.4], 1.3, 8),
      // fliegender Zielmast über dem obersten Dach (pendelt über die ganze Breite)
      { kind: 'fliegender_zielmast', id: 'flugmast', pos: [-M5.MAST.x, M5.MAST.y, M5.MAST.z], path: [[-M5.MAST.x, M5.MAST.y, M5.MAST.z], [M5.MAST.x, M5.MAST.y, M5.MAST.z]],
        mode: 'pendel', start: 'auto', speed: 2.2, height: 7, bob: 0.3, land: [0, YE + 7.8, -140.6] },
      line([-5, YE + 10.6, -138.2], [3.4, YE + 12.4, -138.4], 4),
    ],
  },
  build(level) {
    sternBalkon(level, { ...M5.BALKON, y: F[2], sides: ['l', 'f', 'b'], boxes: [[-33.2, -47.1]] });
  },
  setup(level) {
    pfropfen(level, 'pfropfen', { block: { min: [-14.4, F[2], -43.8], max: [-13.4, F[2] + 2.1, -41.6] } });
    werferStockwerk(level, WERFER, F);
    schattenDiaet(level, [...WERFER, 'wurfball', 'stachelkugel', 'schluesselmuenze'], 0);
    // Zeichenaufrufe im dreistöckigen Saal: Fernes (Tempeldach, Münzraum) zeichnet erst in der Nähe, kleine Teile der Heldin
    // werfen keinen Sonnenschatten
    farHide(level, ['starring', 'star', 'stampfstein', 'helm_propeller', 'fliegender_zielmast', 'wurfball', 'schluesselmuenze', 'checkpoint'], 34);
    heroShadowDiet(level, 0.12);
  },
  marks: {
    start: [0, Y0, 7], saal: [-21, F[0], PZ], stock1: [16, F[1], PZ], stock2: [-16, F[2], PZ], rohr: [-12, F[2], -42.8], balkon: [-31, F[2], -45],
    gong: [21, F[2], PZ], ankunft: [0, YE, -74], dach: [0, YE + 7.8, -139], garten: [RX, 0, -103],
  },
});
