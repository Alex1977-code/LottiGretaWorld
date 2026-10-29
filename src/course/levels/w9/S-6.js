// S-6 „Honigwaben im Sternenmeer“ (Bauplan S-6: Parcours in Draufsicht, 400 s, ca. 400 m – Weltraum, Kamera senkrecht von
// oben, Waben-Plattformen aus Lava/Eis; Wurfsichel, Schalterblock-Weg, Stachelwalzen, Glasröhre zur Spiegelfrucht, Käferfeld,
// Splitterwege mit Feuer-Schnappblumen auf fliegenden Blöcken, große Wabenfläche mit Brummern, Zielturm mit erscheinenden
// Blöcken). Thema honeycomb, Musik course_honeycomb. Remix-Basis von B-10 (Taghimmel).
//
// Ein Waben-Sternenweg hoch über einem leuchtenden Honiggitter: alle Wege sind sechseckige Honigwaben (Baustein waben) auf
// einem gemeinsamen Gitter (Zellen Q, R; Zeilen nach −Z). Die Kamera schaut senkrecht von oben (Baustein draufsicht) – nur am
// Zielturm neigt sie sich, damit man die Stufen hinauf sieht. Ein Leuchtring unter jeder Figur macht die Heldin von oben gut
// sichtbar. Abschnitte (Oberseite der Waben y 0, Absturz ins All unter y −12):
//   1. Startwabe (z 6 … −12): ?-Block mit der Wurfsichel, Schwebeblock links, Druckknopf rechts.
//   2. Erste Gabelung (z −12 … −56): linker Weg mit Krabbelkäfern; der rechte Weg erscheint erst per Druckknopf (Schalter-
//      Waben) und trägt Stern 0. Links draußen im All schwebt der Stempel – nur mit der Wurfsichel zu holen.
//   3. Stachelwalzen (z −56 … −86): drei rote Walzen quer über dem Feld, daneben Lava- und Eiswaben.
//   4. Glasröhre (z −86 … −112): über den Lavasee gleitet man in der Glasröhre zur Spiegelfrucht-Insel (Kontrollpunkt).
//   5. Käferfeld (z −126 … −172): Krabbelkäfer-Kolonnen; im Mittelteil kreisen sechs Flatterkäfer – alle besiegt → Stern 1.
//   6. Splitterwege (z −172 … −221): drei schmale Wege; dazwischen fliegende Blöcke mit Feuer-Schnappblumen.
//   7. Große Wabenfläche (z −221 … −283, Kontrollpunkt): Lava- und Eismuster, Brummer; links nahe dem Ende ein Lavafeld mit
//      Stern 2 darüber – nur mit der Wurfsichel zu holen.
//   8. Zielturm (z −283 … −301): Waben-Stufen erscheinen beim Hinaufsteigen und vergehen hinter einem – flink hinauf zum Ziel.

import { hexLattice, WabenMaler, line, ring, arc, column, schalterWaben, flinkeTreppe, leuchtring, wabenOhneLoecher, muenzenFlach } from './_helpers_c.js';

const PI = Math.PI;
const L = hexLattice({ R: 1.6, gap: 0.06, x0: 0, z0: 4.9, y: 0, height: 0.6 });
const at = (x, z, dy = 0) => { const [Q, R] = L.cell(x, z); return L.at(Q, R, dy); };

// ---------------------------------------------------------------------------------------------- Waben malen
const M = new WabenMaler(L);
// 1 Startwabe
M.rect(-7.2, 7.2, 6.2, -12.4);
// 2 Gabelung: linker Weg (fest)
const LINKS = [[-1.4, -12], [-4.3, -19.5], [-4.3, -32], [-1.4, -40], [-4.3, -48], [-2.8, -56]];
M.lane(LINKS, 1.9);
// 3 Stachelwalzen-Feld mit Lava und Eis
M.rect(-8.6, 8.6, -55, -86.5);
M.pick([L.cell(5.66, -61.4), L.cell(8.5, -61.4), L.cell(7.07, -63.8)], 'l');     // Lava rechts neben Walze 1
M.pick([L.cell(-5.66, -71.2), L.cell(-8.5, -71.2), L.cell(-7.07, -73.6)], 'l');  // Lava links neben Walze 2
M.lane([[-7.07, -56.4], [-7.07, -66]], 0.6, 'i');                                // Eisspur links vorn
M.lane([[7.07, -76], [7.07, -86]], 0.6, 'i');                                    // Eisspur rechts hinten
M.pick([L.cell(0, -83.3), L.cell(-2.83, -83.3), L.cell(2.83, -83.3)], 'i');
// 4 Röhren-Plattform, Lavasee, Spiegelfrucht-Insel
M.rect(-4.3, 4.3, -86.5, -91.5);
M.rect(-8.6, 8.6, -91.6, -109.9, 'l');
M.rect(-7.2, 7.2, -110, -126.5);
// 5 Käferfeld
M.rect(-10, 10, -126.6, -172);
M.pick([L.cell(7.07, -154.5)], 'h');                                            // hohe Wabe (Extraleben darüber)
M.lane([[-8.5, -130], [-8.5, -137]], 0.8, 'i');
M.lane([[8.5, -160], [8.5, -170]], 0.8, 'i');
// 6 Splitterwege (drei schmale Wege, ein Querweg)
M.lane([[-8.5, -172], [-9.9, -182], [-8.5, -196], [-9.9, -208], [-8.5, -221.5]], 1.45);
M.lane([[0, -172], [0, -221.5]], 1.45);
M.lane([[8.5, -172], [9.9, -184], [8.5, -198], [9.9, -210], [8.5, -221.5]], 1.45);
M.rect(-9.9, 9.9, -195.6, -197.6);
// 7 Große Wabenfläche
M.rect(-11.4, 11.4, -221.6, -283);
M.disc(-6.4, -262.5, 4.6, 'l');                    // Lavafeld links nahe dem Ende (Stern 2)
M.ring(6.4, -238, 2.4, 4.3, 'l');                   // Lavaring rechts (Mitte frei: Insel)
M.lane([[-11, -228], [-2, -244], [-11, -252]], 0.9, 'i');
M.lane([[11, -255], [2, -270], [11, -281]], 0.9, 'i');
// 8 Zielturm-Sockel
M.rect(-7.2, 7.2, -283.1, -301.5);

const WABEN = M.fields({ rows: 5 });

// rechter Weg (Schalter-Waben): Zellen, die nicht schon zu den festen Feldern gehören, von der Gabelung aus nach −Z
const MR = new WabenMaler(L);
MR.lane([[4.3, -12.6], [7.07, -19.5], [8.5, -30], [7.07, -41], [4.3, -49.5], [1.4, -56]], 1.9);
const RECHTS = MR.list().filter((c) => !M.get(c.Q, c.R)).sort((a, b) => b.z - a.z || a.x - b.x).map((c) => [+c.x.toFixed(3), 0, +c.z.toFixed(3)]);

// ---------------------------------------------------------------------------------------------- Zielturm
const TURM = { x: 0, z: -298, r: 3.1, top: 9.6 };
// Stufen im Bogen vor dem Turm (von links nach rechts, je 1,2 m höher; keine Stufe liegt über einer anderen)
const STUFEN = Array.from({ length: 7 }, (_, i) => {
  const a = (-105 + i * 35) * PI / 180;
  return [+(TURM.x + Math.sin(a) * 4.5).toFixed(3), +(1.2 * (i + 1)).toFixed(2), +(TURM.z + Math.cos(a) * 4.5).toFixed(3)];
});

function build(level) {
  wabenOhneLoecher(level, 1.5);
  schalterWaben(level, { id: 'rechts', cells: RECHTS, delay: 0.07, r: 1.5 });
  flinkeTreppe(level, { id: 'treppe', steps: STUFEN, life: 3.6, ahead: 2, size: 1.05, height: 0.45 });
  // Zielturm: feste Waben-Säule (Kollision), Optik über deco_star (wabensaeule)
  level.world.add({ type: 'cyl', x: TURM.x, z: TURM.z, r: TURM.r, y0: -8, y1: TURM.top, tag: 'zielturm' });
}

function setup(level) {
  leuchtring(level);
  muenzenFlach(level);
}

const DECO = [
  // Wabensäulen tief unten im All (weit weg vom Weg: von oben deutlich kleiner, keine Verwechslung mit Wegen)
  ...[[-26, -10], [27, -48], [-28, -96], [26, -140], [-27, -196], [28, -250], [-25, -300]]
    .map(([x, z], i) => ({ kind: 'wabe', pos: [x, -40, z], radius: 2.2 + (i % 3) * 0.6, height: 14, variant: i % 3 === 1 ? 'lava' : i % 3 === 2 ? 'eis' : 'normal' })),
  // Planeten in der Tiefe
  { kind: 'planet', pos: [-24, -14, -20], radius: 6, variant: 'ring', color: 'gold' },
  { kind: 'planet', pos: [22, -18, -86], radius: 7, variant: 'blume', color: 'rosa' },
  { kind: 'planet', pos: [-22, -16, -160], radius: 5, variant: 'eis', color: 'blau' },
  { kind: 'planet', pos: [24, -20, -232], radius: 8, variant: 'pilz', color: 'lila' },
  { kind: 'planet', pos: [-20, -12, -280], radius: 4, variant: 'ring', color: 'mint' },
  // Honigtöpfe, Sterne, Raketen
  { kind: 'honigtopf', pos: [-4.25, 0, 2.45], size: 0.9 }, { kind: 'honigtopf', pos: [4.25, 0, -117.7], size: 0.8 },
  { kind: 'honigtopf', pos: [-8.5, 0, -167.8], size: 1 }, { kind: 'honigtopf', pos: [9.9, 0, -235.5], size: 0.9 },
  { kind: 'sterne', pos: [0, 2, -40], size: [30, 30], n: 14, height: 3 },
  { kind: 'sterne', pos: [0, 2, -150], size: [30, 30], n: 14, height: 3 },
  { kind: 'sterne', pos: [0, 2, -250], size: [30, 30], n: 14, height: 3 },
  { kind: 'rakete', pos: [-18, -6, -120], height: 4, color: 'rot', yaw: 0.4 },
  { kind: 'rakete', pos: [17, -8, -205], height: 5, color: 'blau', yaw: -0.6 },
  { kind: 'komet', pos: [16, -2, -20], size: 1.2, dir: [-1, -0.2, 0.3] },
  { kind: 'komet', pos: [-17, -3, -186], size: 1, dir: [1, -0.3, -0.2] },
  { kind: 'kristall', pos: [-7.07, 0, -164.3], n: 4, color: 'lila', size: 0.7 },
  { kind: 'kristall', pos: [5.66, 0, -2.45], n: 3, color: 'gold', size: 0.6 },
];

export const LEVEL = {
  id: 'S-6',
  world: 9,
  title: 'Honigwaben im Sternenmeer',
  archetype: 'parcours',
  theme: 'honeycomb',
  music: 'course_honeycomb',
  timeLimit: 400,
  killY: -12,
  farHide: 40,
  instances: { coin: { farHide: 36, shadow: false } },
  build,
  setup,
  start: { pos: [0, 0, 0], yaw: PI / 2 },
  camera: [
    { from: 14, to: -282, pitch: 52, dist: 14, fov: 40 },
    { from: -282, to: -320, pitch: 40, dist: 16, fov: 40, height: 3.5, x: 0, xLock: 0.6 },
  ],
  segments: [
    { type: 'draufsicht', id: 'oben', area: [-60, 14, 60, -284], height: 17, fov: 42, ahead: 3, blend: 7 },
    ...WABEN,
    { type: 'platform', pos: [-10.2, 0.6, -4.2], size: [3, 0.7, 3], style: 'block', color: 'orange' },   // Schwebeblock links vom Start
    { type: 'glasspipe', id: 'roehre', path: [[0, 1.0, -88.6], [0, 1.0, -93], [0, 2.4, -101], [0, 1.0, -108], [0, 1.0, -112.4]], radius: 1, coins: 6, exitSpeed: 6 },
    // Stachelwalzen (rot, rundum bestachelt, drehen auf der Stelle) – mit Lücken über Lava/Eis daneben
    { type: 'stachelwalze_rot', id: 'walze1', pos: [-2.4, 0.5, -62.6], axis: 'x', radius: 1.0, length: 12, speed: 1.3 },
    { type: 'stachelwalze_rot', id: 'walze2', pos: [2.4, 0.5, -72.4], axis: 'x', radius: 1.0, length: 12, speed: -1.3 },
    { type: 'stachelwalze_rot', id: 'walze3', pos: [0, 0.5, -79.8], axis: 'x', radius: 1.0, length: 9, speed: 1.6 },
    // fliegende Blöcke mit Feuer-Schnappblumen zwischen den Splitterwegen
    { type: 'mover', id: 'flug1', path: [[-4.25, -0.3, -176], [-4.25, -0.3, -192]], size: [2.4, 0.6, 2.4], speed: 1.8, wait: 0.8, color: 'orange' },
    { type: 'mover', id: 'flug2', path: [[4.25, -0.3, -201], [4.25, -0.3, -185]], size: [2.4, 0.6, 2.4], speed: 1.8, wait: 0.8, color: 'orange', phase: 0.3 },
    { type: 'mover', id: 'flug3', path: [[-4.25, -0.3, -200], [-4.25, -0.3, -216]], size: [2.4, 0.6, 2.4], speed: 1.6, wait: 0.8, color: 'orange', phase: 0.6 },
    { type: 'mover', id: 'flug4', path: [[4.25, -0.3, -218], [4.25, -0.3, -204]], size: [2.4, 0.6, 2.4], speed: 1.6, wait: 0.8, color: 'orange' },
    { type: 'deco_star', items: DECO },
    { type: 'deco_star', items: [{ kind: 'wabe', pos: [TURM.x, -8, TURM.z], radius: 3.6, height: TURM.top + 8, variant: 'normal' }] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.83, 1.9, -4.9], content: 'sichel' },
    { kind: 'coinblock', pos: [2.83, 2.2, -4.9], count: 6 },
    { kind: 'hidden', pos: [5.66, 2.4, 4.9], content: 'oneup' },                         // Extraleben hinter dem Start
    { kind: 'question', pos: [-2.83, 1.9, -122.6], content: 'sichel' },                 // Spiegelfrucht-Insel
    { kind: 'question', pos: [2.83, 1.9, -226.3], content: 'sichel' },                  // Kontrollpunkt 2
    { kind: 'question', pos: [0, 1.9, -139.6], content: 'coins:5' },
    { kind: 'hidden', pos: [7.07, 3.4, -154.5], content: 'oneup' },                     // Extraleben über der hohen Wabe im Käferfeld
  ],
  enemies: [
    // Gabelung links
    { kind: 'krabbelkaefer', id: 'kk_links', path: [[-4.3, 1, -21], [-4.3, 1, -31]], count: 3, spacing: 1.5, color: 'yellow' },
    { kind: 'pilzling', id: 'pz1', pos: [-2.8, 0, -44], path: [[-2.8, 0, -42], [-4.3, 0, -48]] },
    // Stachelwalzen-Feld
    { kind: 'pilzling', id: 'pz2', pos: [4.25, 0, -67.5], path: [[1.4, 0, -67.5], [7.07, 0, -67.5]] },
    // Käferfeld: Krabbelkäfer-Kolonnen und Flatterkäfer im Mittelteil
    { kind: 'krabbelkaefer', id: 'kk1', path: [[-7, 1, -130], [7, 1, -130], [7, 1, -134], [-7, 1, -134]], count: 4, spacing: 1.6, color: 'blue' },
    { kind: 'krabbelkaefer', id: 'kk2', path: [[7, 1, -162], [-7, 1, -162], [-7, 1, -168], [7, 1, -168]], count: 5, spacing: 1.6, color: 'red', phase: 0.4 },
    { kind: 'flatterkaefer', id: 'fk_a', path: [[-4, 2.3, -140], [4, 2.3, -140], [4, 2.3, -146], [-4, 2.3, -146]], count: 3, spacing: 2.2, color: 'pink', speed: 1.8 },
    { kind: 'flatterkaefer', id: 'fk_b', path: [[4, 2.3, -150], [-4, 2.3, -150], [-4, 2.3, -157], [4, 2.3, -157]], count: 3, spacing: 2.2, color: 'pink', speed: 1.8, phase: 0.5 },
    // Splitterwege: Feuer-Schnappblumen auf den fliegenden Blöcken
    { kind: 'feuer_schnappblume', id: 'fs1', pos: [-4.25, 0.3, -176], base: 'pot', range: 8.5, pause: 1.8 },
    { kind: 'feuer_schnappblume', id: 'fs2', pos: [4.25, 0.3, -196.2], base: 'pot', range: 8.5, pause: 1.8 },
    { kind: 'feuer_schnappblume', id: 'fs3', pos: [-4.25, 0.3, -204.8], base: 'pot', range: 8.5, pause: 2 },
    { kind: 'feuer_schnappblume', id: 'fs4', pos: [4.25, 0.3, -218], base: 'pot', range: 8.5, pause: 2 },
    // Große Wabenfläche: Brummer
    { kind: 'brummer', id: 'br1', center: [-4, 2.6, -232], radius: 2.4, sight: 6 },
    { kind: 'brummer', id: 'br2', center: [5, 2.6, -250], radius: 2.6, sight: 6, phase: 0.5 },
    { kind: 'brummer', id: 'br3', center: [-3, 2.6, -268], radius: 2.2, sight: 6, phase: 0.25 },
    { kind: 'brummer', id: 'br4', center: [6, 2.6, -276], radius: 2.0, sight: 6, phase: 0.75 },
  ],
  items: [
    { kind: 'druckknopf', id: 'schalter', pos: [4.25, 0, -9.8], color: 'blau', once: true, onPress: { reveal: 'rechts' } },
    { kind: 'powerup', id: 'spiegel', pos: [0, 0, -116.4], power: 'spiegel' },
    { kind: 'kampfraum', id: 'kaeferrunde', ids: ['fk_a', 'fk_a_1', 'fk_a_2', 'fk_b', 'fk_b_1', 'fk_b_2'], area: { min: [-11, -2, -158], max: [11, 8, -136] },
      onClear: { reveal: 'kaeferstern' }, banner: 'Alle Flatterkäfer besiegt!' },
    // Münzen
    ring([0, 0.4, 0], 2.2, 8),
    { kind: 'coins', pos: [-10.2, 1.7, -4.2], r: 0.8, n: 4 },
    line([-1.4, 0.5, -13], [-4.3, 0.5, -19], 3), line([-4.3, 0.5, -34], [-1.4, 0.5, -40], 3),
    line([-11.2, 1.0, -22], [-7.4, 1.0, -24.5], 3),                                   // Hinweis: hinaus zum Stempel
    line([7.07, 0.5, -19.5], [8.5, 0.5, -30], 4), line([7.07, 0.5, -41], [4.3, 0.5, -49.5], 3),
    line([0, 0.5, -57], [0, 0.5, -60], 2), line([-6, 0.5, -66], [-6, 0.5, -70], 2), line([6, 0.5, -75], [6, 0.5, -78], 2),
    ...arc([-5.5, 0.4, -61.2], [-5.5, 0.4, -64], 3, 2.6), ...arc([5.5, 0.4, -71], [5.5, 0.4, -73.8], 3, 2.6),
    ring([0, 0.4, -121], 2.8, 8),
    line([-7, 0.5, -148], [7, 0.5, -148], 6),
    line([-8.5, 0.5, -175], [-8.5, 0.5, -192], 6), line([0, 0.5, -175], [0, 0.5, -192], 6), line([8.5, 0.5, -175], [8.5, 0.5, -192], 6),
    line([0, 0.5, -199], [0, 0.5, -219], 7),
    ring([6.4, 0.4, -238], 1.2, 5),
    line([-8, 0.5, -230], [-2, 0.5, -244], 5), line([4, 0.5, -258], [9, 0.5, -270], 4),
    column(0, -292.4, 2.4, 9.4, 6),
  ],
  checkpoint: [{ pos: [0, 0, -120.5], yaw: PI / 2 }, { pos: [0, 0, -223.8], yaw: PI / 2 }],
  stars: [
    at(8.5, -30, 1.2),                                                               // 0: Ende des rechten Wegs (Schalter-Waben)
    { pos: [0, 1.0, -148.4], hidden: true, id: 'kaeferstern' },                     // 1: alle Flatterkäfer im Mittelteil besiegt
    at(-6.4, -262.5, 1.1),                                                          // 2: über dem Lavafeld links (Wurfsichel)
  ],
  stamp: [-11.6, 0.9, -26.2],
  goal: { pos: [TURM.x, TURM.top, TURM.z], height: 6 },
  marks: {
    start: [0, 0, 0], schalter: [4.25, 0, -9.8], gabel: [-1.4, 0, -13], links: [-4.3, 0, -26], rechts: [8.5, 0, -30],
    walzen: [0, 0, -57], roehre: [0, 0, -87.5], insel: [0, 0, -120.5], kaefer: [0, 0, -128], kaeferMitte: [0, 0, -148],
    splitter: [0, 0, -173], flaeche: [0, 0, -223.8], lavafeld: [-1.4, 0, -262.5], turm: [0, 0, -287], ziel: [0, TURM.top, -296],
  },
};
