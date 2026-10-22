// 2-4 „Hügelmühle“ – Grashügel mit rollenden Walzen, darunter das Räderwerk der Mühle (Bauplan: Detail 2-4).
// Level verläuft nach −Z. Thema grass (Untergrund: Licht gedämpft, Kristalle und Leuchtpilze), Musik course_hills.
//
// Abschnitte:
//   1  Graswiese        z   9 … −24  (x −12 … 12, y 1) ?-Block mit Krallen-Anzug, Rollpilze, Hüpfmäuse;
//                                      Lotti- und Greta-Schalter (Pause → Figur wechseln) lassen die Stufen zum
//                                      Stempel-Turm erscheinen. Zwei Glasröhren führen die 5-m-Klippe hinauf; zwischen
//                                      ihnen der Kletterfels (Krallen-Anzug) mit Stern 0.
//   2  Rollhügel        z −24 … −95  (y 6) drei Hügelwalzen (Oberfläche läuft der Figur entgegen, immer schneller),
//                                      rollender Baumstamm, Hüpfmäuse, Rollpilze, Pilzlinge; Stufenhügel mit dem roten
//                                      Ring (acht rote Münzen → Extraleben); unsichtbarer Block über der dritten Walze.
//   3  Checkpoint       z −95 … −108 Fahne neben der Hügelmühle (Windmühle), Röhre hinab ins Räderwerk.
//   4  Untergrund       y −14, z −228 … −304 (Mühlenkeller: Dielen, Pfosten, Mehlsäcke): Rollpilze, Stachel-
//                                      Hüpfmäuse, Mini-Pilzlinge; drei liegende Zahnräder (Drehteller) und ein stehendes
//                                      Zahnrad über dem Schacht; grüne Röhre unter einem Kristalldeckel (Stampfen) →
//                                      Farbfeld-Raum.
//   5  Ausgang          z −304 … −334: zwei Riesenräder mit waagerechten Stegen; wer sich zwischen die Räder fallen
//                                      lässt, landet auf dem Sims mit Stern 2 (Röhre zurück). Röhre hinauf zum Ziel.
//   Ziel: Hügelkuppe y 10, z −380 … −408 (Röhre aus dem Untergrund), Zielmast.
//   Abseits: Farbfeld-Raum (x ≈ 60, y −14, z −280 … −300): alle 16 Felder färben → Stern 1.
//   Lage: Oberwelt, Untergrund und Zielkuppe liegen in getrennten z-Bändern (Röhren teleportieren) – so kappt die
//   Abschnitts-Verschmelzung (32 m in z) die gerade nicht sichtbaren Teile, und keine Kamera sieht in einen anderen Teil.
// Sterne (Index): 0 Kletterfels zwischen den Glasröhren, 1 Farbfeld-Raum, 2 zwischen den Riesenrädern.
// Stempel: auf dem Turm am Start (Lotti- und Greta-Schalter).

import {
  isl, lawn, line, ring, arc, column, deco, decoW1, fence, hook, windmill, Hopper, dimZone, bake, planks, millCellar,
} from './_helpers_b.js';

const Y = 1;            // Graswiese
const YU = 6;           // Rollhügel, Checkpoint
const YD = -14;         // Untergrund
const YG = 10;          // Zielkuppe
const UX = 0;           // Untergrund (Mitte x; liegt in z hinter der Oberwelt, damit die Abschnitte getrennt gekappt werden)
const CAM = { pitch: 44, dist: 13.5, fov: 40 };
const ROCK = 0x6a5a6e, ROCK2 = 0x5a4c62;

/** Felswand (Untergrund) über ihre Grundfläche. */
const rock = (x0, x1, zA, zB, y0, y1, o = {}) => ({
  kind: 'rockwall', pos: [(x0 + x1) / 2, y0, (zA + zB) / 2], size: [x1 - x0, y1 - y0, Math.abs(zA - zB)], color: o.color ?? ROCK, ...o,
});
/** Hügelwalze (Rasenwalze, quer liegend, Oberseite r·2 über der Auflage) zwischen zwei Wiesenstücken. */
const drum = (id, z, radius, speed, top = YU + 1.4) => ({
  type: 'rollwalze', id, pos: [0, top - 2 * radius, z], radius, length: 10, speed, style: 'gras',
});
/** Breite des Walzenkörpers auf Wiesenhöhe (Schlitz in der Wiese). */
const slot = (radius, top = YU + 1.4) => { const c = top - radius, dy = YU - c; return Math.sqrt(Math.max(0, radius * radius - dy * dy)); };

function scene(level) {
  windmill(level, { pos: [8.6, YU, -104.5], h: 7.4, r: 2.3, speed: 0.55 });
  new Hopper(level, { pos: [-9.6, Y, -18], r: 2, seed: 3 });
  new Hopper(level, { pos: [9.6, YU, -56], r: 1.8, seed: 7 });
  new Hopper(level, { pos: [-9, YU, -86], r: 2.2, seed: 11 });
  new Hopper(level, { pos: [4, YG, -397], r: 2.4, seed: 5 });
  dimZone(level, { inside: (x, y) => y < -6, hemi: 0.42, sun: 0.3, fog: 0x1c1a2a });
  // Mühlenkeller: Dielenböden (das Farbfeld bleibt frei)
  planks(level, UX - 7.5, UX + 7.5, -230.5, -249.5, YD);
  planks(level, UX - 7.5, UX + 7.5, -277.1, -303.5, YD);
  planks(level, UX - 7.5, UX + 7.5, -324.1, -333.5, YD);
  planks(level, UX - 2.6, UX + 2.6, -312.8, -314.8, YD - 6, { along: 'x' });
  planks(level, 52.5, 67.5, -280.5, -299.5, YD, { skip: [[55.8, 64.2, -294.8, -286.4]] });
  // Pfosten und Längsbalken vor den Felswänden, Mehlsäcke in den Ecken
  millCellar(level, { xs: [UX - 7.95, UX + 7.95], y: YD, posts: [-237, -244], sacks: [[UX - 6.4, -247.8, 0.4, 3], [UX + 6.2, -231.6, -0.3, 2]] });
  millCellar(level, { xs: [UX - 7.95, UX + 7.95], y: YD, posts: [-284.5, -291, -297.5], sacks: [[UX - 5.6, -278.4, 0.2, 3], [UX + 6.6, -285.8, -0.5, 2]] });
  millCellar(level, { xs: [UX - 7.95, UX + 7.95], y: YD, posts: [-326.6, -331.6], sacks: [[UX + 5.6, -332.6, 0.6, 4]] });
  millCellar(level, { y: YD, sacks: [[66, -281.6, 0, 2], [53.8, -298.4, 1, 3]] });
  bake(level, [
    { name: 'pastell_blume', pos: [-10.6, Y, 6], scale: 1.1 },
    { name: 'pastell_blume', pos: [10.8, Y, -1], scale: 0.9 },
    { name: 'pastell_blume', pos: [-10.8, YU, -40], scale: 1 },
    { name: 'pastell_blume', pos: [10.6, YU, -78], scale: 1.1 },
    { name: 'pastell_blume', pos: [-5, YG, -388], scale: 1.2 },
    { name: 'hecken_hase', pos: [-10.4, YU, -98.6], yaw: 0.6, scale: 0.8 },
  ]);
}

export const LEVEL = {
  id: '2-4',
  world: 2,
  title: 'Hügelmühle',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_hills',
  timeLimit: 500,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -32,
  camera: [
    { ...CAM, from: 12, to: -22, pitch: 42, area: [-40, 40] },
    { ...CAM, from: -24, to: -94, pitch: 44, area: [-40, 40] },
    { ...CAM, from: -95, to: -110, pitch: 46, dist: 13, area: [-40, 40] },
    // Untergrund (z −228 … −336, hinter der Oberwelt)
    { ...CAM, from: -228, to: -278, pitch: 46, dist: 13, area: [-30, 30] },
    { ...CAM, from: -278, to: -304, pitch: 47, dist: 12.5, area: [-30, 30] },
    // Riesenräder schräg von der Seite (die Räder stehen in Laufrichtung, frontal von hinten sähe man sie nur als Strich)
    { ...CAM, from: -306, to: -338, pitch: 38, dist: 14, yaw: 30, area: [-30, 30] },
    // Farbfeld-Raum (x ≈ 60) und Zielkuppe (z −380 … −408)
    { from: -276, to: -304, pitch: 54, dist: 12.5, fov: 40, area: [45, 75] },
    { ...CAM, from: -378, to: -410, pitch: 40, dist: 14, area: [-40, 40] },
  ],
  segments: [
    // =============================================================== 1  Graswiese
    ...lawn(-12, 12, 9, -24, Y, 3, { under: 3 }),
    // Stempel-Turm (links) mit Stufen, die die Figurenschalter erscheinen lassen
    { type: 'wall', pos: [-9.5, Y, -7.5], size: [3, 7.6, 3], style: 'grass' },
    { type: 'appear', id: 'weg_lotti', color: 'blue', parts: [
      { pos: [-6, 2.4, -3.2], size: [2, 0.5, 2] }, { pos: [-6, 3.7, -6], size: [2, 0.5, 2] },
    ] },
    { type: 'appear', id: 'weg_greta', color: 'green', parts: [{ pos: [-6, 6.1, -8.8], size: [2, 0.5, 2] }] },
    { type: 'sign', pos: [-2.4, Y, 2.2], text: 'Lotti- und Greta-\nSchalter', size: [2.6, 0.9] },
    { type: 'sign', pos: [-3.2, Y, -10.2], text: 'Heldin wechseln:\nPause → Figur', size: [2.6, 0.9] },
    // Kletterfels zwischen den Glasröhren (Krallen-Anzug, Stern 0)
    { type: 'wall', pos: [0, Y, -21.7], size: [5, 9, 0.6], climbable: true },
    { type: 'wall', pos: [0, Y, -23.2], size: [5, 9, 2.4], style: 'grass' },
    { type: 'sign', pos: [3.6, Y, -18.6], text: 'Kletterfels', size: [2, 0.7] },
    { type: 'glasspipe', id: 'g_links', radius: 1, oneWay: true, coins: 3,
      path: [[-7, 2.05, -16.5], [-7, 2.05, -20], [-7, 7.05, -22.6], [-7, 7.05, -27.4]] },
    { type: 'glasspipe', id: 'g_rechts', radius: 1, oneWay: true, coins: 3,
      path: [[7, 2.05, -16.5], [7, 2.05, -20], [7, 7.05, -22.6], [7, 7.05, -27.4]] },
    deco([
      { kind: 'tree', pos: [10.2, Y, 6.4], size: 4.6 }, { kind: 'tree', pos: [-10.4, Y, -12.8], size: 4.2, color: 'green' },
      { kind: 'tree', pos: [10.6, Y, -12], size: 3.8 },
      { kind: 'bush', pos: [4.6, Y, 7.4], size: 0.7 }, { kind: 'bush', pos: [11, Y, -6], size: 0.8 },
      { kind: 'bush', pos: [-3.6, Y, -20.8], size: 0.6 }, { kind: 'bush', pos: [3.8, Y, -21], size: 0.6 },
      { kind: 'flowers', pos: [8.4, Y, -3], size: [3, 4], n: 7 },
      { kind: 'flowers', pos: [-1.6, Y, -14], size: [3, 2.4], n: 5, colors: ['pink', 'white', 'yellow'] },
      { kind: 'rock', pos: [-11, Y, -21.6], size: 0.6 },
      ...fence([[-11.6, 8.6], [-11.6, -2]], Y), ...fence([[11.6, 8.6], [11.6, -10]], Y),
    ]),
    decoW1([
      { kind: 'daisies', pos: [4, Y, 0], size: [10, 10], n: 30 },
      { kind: 'daisies', pos: [-4, Y, -16], size: [8, 8], n: 22, colors: ['white', 'pink', 'yellow'] },
      { kind: 'bellflowers', pos: [-10.6, Y, -3], size: [1.4, 6], n: 9 },
      { kind: 'butterflies', pos: [5, Y, -6], n: 3, r: 2.4 },
      { kind: 'mushrooms', pos: [10.6, Y, -18], size: 0.9, color: 'red' },
      { kind: 'stump', pos: [9.6, Y, 1.8], size: 0.45 },
      { kind: 'tufts', pos: [0, Y, -8], size: [20, 26], n: 14 },
      { kind: 'cloudbank', pos: [-18, -4, -6], size: 5 }, { kind: 'cloudbank', pos: [19, -5, -18], size: 5 },
      { kind: 'cloudbank', pos: [2, -9, 16], size: 5, n: 7 },
    ]),

    // =============================================================== 2  Rollhügel
    ...lawn(-12, 12, -24, -36 + slot(2.2), YU, 6, { under: 3 }),
    drum('rw1', -36, 2.2, 1.6),
    isl(-12, -5, -36 + slot(2.2), -36 - slot(2.2), YU, 6, { under: 3 }),
    isl(5, 12, -36 + slot(2.2), -36 - slot(2.2), YU, 6, { under: 3 }),
    ...lawn(-12, 12, -36 - slot(2.2), -49 + slot(2.3), YU, 6, { under: 3 }),
    { type: 'rollwalze', id: 'stamm', pos: [-9, YU, -43.4], radius: 0.75, length: 2.6, axis: 'z', style: 'holz',
      path: [[-9.5, YU, -43.4], [9.5, YU, -43.4]], rollSpeed: 3.2, wait: 0.8 },
    drum('rw2', -49, 2.3, 2.4),
    isl(-12, -5, -49 + slot(2.3), -49 - slot(2.3), YU, 6, { under: 3 }),
    isl(5, 12, -49 + slot(2.3), -49 - slot(2.3), YU, 6, { under: 3 }),
    ...lawn(-12, 12, -49 - slot(2.3), -62 + slot(2.6, YU + 1.8), YU, 6, { under: 3 }),
    drum('rw3', -62, 2.6, 3.2, YU + 1.8),
    isl(-12, -5, -62 + slot(2.6, YU + 1.8), -62 - slot(2.6, YU + 1.8), YU, 6, { under: 3 }),
    isl(5, 12, -62 + slot(2.6, YU + 1.8), -62 - slot(2.6, YU + 1.8), YU, 6, { under: 3 }),
    ...lawn(-12, 12, -62 - slot(2.6, YU + 1.8), -95, YU, 6, { under: 3 }),
    { type: 'hill', pos: [7, YU, -74], radius: 3.6, height: 3, steps: 3 },
    { type: 'mound', pos: [-6, YU, -82], radius: 3.4, height: 1.1 },
    { type: 'sign', pos: [-3.4, YU, -27.4], text: 'Hügelwalzen:\nrennen!', size: [2.4, 0.8] },
    deco([
      { kind: 'tree', pos: [-10.6, YU, -30], size: 4.8 }, { kind: 'tree', pos: [10.8, YU, -42], size: 4.4, color: 'green' },
      { kind: 'tree', pos: [-10.8, YU, -55], size: 4 }, { kind: 'tree', pos: [11, YU, -66.6], size: 4.6 },
      { kind: 'tree', pos: [-10.6, YU, -71], size: 4.2, color: 'green' }, { kind: 'tree', pos: [10.6, YU, -90], size: 4.6 },
      { kind: 'bush', pos: [-11, YU, -45.6], size: 0.7 }, { kind: 'bush', pos: [11.2, YU, -54], size: 0.6 },
      { kind: 'bush', pos: [-11.2, YU, -66], size: 0.8 }, { kind: 'bush', pos: [11, YU, -82], size: 0.7 },
      { kind: 'flowers', pos: [-9, YU, -39.6], size: [3, 2], n: 6, colors: ['yellow', 'white'] },
      { kind: 'flowers', pos: [9, YU, -52.6], size: [3, 2], n: 6, colors: ['pink', 'red'] },
      { kind: 'flowers', pos: [-8, YU, -66], size: [4, 2.4], n: 7 },
      { kind: 'flowers', pos: [2, YU, -88], size: [8, 4], n: 9, colors: ['white', 'pink', 'yellow'] },
      ...fence([[-11.6, -24.4], [-11.6, -33.6]], YU), ...fence([[11.6, -24.4], [11.6, -33.6]], YU),
      ...fence([[-11.6, -66], [-11.6, -94.6]], YU),
    ]),
    decoW1([
      { kind: 'daisies', pos: [0, YU, -29], size: [20, 7], n: 26 },
      { kind: 'daisies', pos: [0, YU, -42.6], size: [20, 5], n: 22, colors: ['white', 'yellow'] },
      { kind: 'daisies', pos: [0, YU, -55.6], size: [20, 5], n: 22, colors: ['white', 'pink'] },
      { kind: 'daisies', pos: [-2, YU, -80], size: [18, 26], n: 40 },
      { kind: 'bellflowers', pos: [10.6, YU, -30], size: [1.2, 5], n: 7 },
      { kind: 'butterflies', pos: [-6, YU, -78], n: 4, r: 3 },
      { kind: 'haybale', pos: [-9.8, YU, -60], yaw: 0.6 }, { kind: 'haybale', pos: [9.8, YU, -46.4], yaw: -0.4 },
      { kind: 'picnic', pos: [-7.8, YU, -90.6], yaw: 0.3 },
      { kind: 'mushrooms', pos: [10.6, YU, -73], size: 0.9, color: 'orange' },
      { kind: 'tufts', pos: [0, YU, -80], size: [22, 26], n: 14 },
      { kind: 'bunting', from: [-11.4, 9.4, -94.4], to: [11.4, 9.4, -94.4], sag: 1, colors: [0xff4a3d, 0xffd23d, 0x3d8bff, 0x4fd04a] },
      { kind: 'cloudbank', pos: [-20, 0, -50], size: 6 }, { kind: 'cloudbank', pos: [22, 1, -70], size: 6 },
      { kind: 'cloudbank', pos: [-22, -2, -90], size: 5 },
    ]),

    // =============================================================== 3  Checkpoint mit Röhre
    ...lawn(-12, 12, -95, -110, YU, 6, { under: 3 }),
    { type: 'pipe', id: 'p_hinab', pos: [-1.6, YU, -105.4], height: 1.4, target: 'p_unten' },
    { type: 'sign', pos: [-5.4, YU, -102.4], text: 'Zur Mühle hinab', size: [2.4, 0.8] },
    deco([
      { kind: 'tree', pos: [-10.6, YU, -108], size: 4.6, color: 'green' },
      { kind: 'bush', pos: [3.6, YU, -108.8], size: 0.7 }, { kind: 'flowers', pos: [-6, YU, -97], size: [3, 2], n: 6 },
      ...fence([[-11.6, -95.4], [-11.6, -109.6]], YU), ...fence([[11.6, -95.4], [11.6, -109.6]], YU),
    ]),
    decoW1([
      { kind: 'daisies', pos: [0, YU, -102], size: [20, 12], n: 24 },
      { kind: 'cloudbank', pos: [0, -4, -122], size: 6, n: 8 },
    ]),
    { type: 'killplane', y: -6, pos: [0, -6, -55], size: [60, 140] },

    // =============================================================== 4  Untergrund (y −14, z −228 … −336)
    isl(UX - 8, UX + 8, -230, -250, YD, 3, { top: 'stone', under: 2 }),
    { type: 'pipe', id: 'p_unten', pos: [UX, YD, -233.4], height: 1.2 },
    // Zahnräder über dem Schacht (Drehteller) und ein stehendes Rad
    { type: 'zahnradplattform', id: 'zr1', pos: [UX, YD - 0.3, -254], radius: 2.4, thick: 0.6, axis: 'y', speed: 0.9 },
    { type: 'zahnradplattform', id: 'zr2', pos: [UX - 4.5, YD - 0.3, -260], radius: 2.4, thick: 0.6, axis: 'y', speed: -1 },
    { type: 'zahnradplattform', id: 'zr3', pos: [UX + 1, YD - 0.3, -266.5], radius: 2.6, thick: 0.6, axis: 'y', speed: 1.1 },
    { type: 'zahnradplattform', id: 'zr4', pos: [UX, YD - 2.6, -273], radius: 2.6, thick: 2.4, axis: 'x', speed: 0.7 },
    isl(UX - 8, UX + 8, -276.6, -304, YD, 3, { top: 'stone', under: 2 }),
    // grüne Röhre unter Kristallblöcken → Farbfeld-Raum; Rückweg-Röhre daneben
    { type: 'pipe', id: 'p_farbe', pos: [UX + 5, YD, -290], height: 1.2, target: 'p_farbraum' },
    // Kristalldeckel auf der Röhre (Stampfattacke von oben zerbricht ihn)
    { type: 'kristallwand', id: 'deckel', pos: [UX + 5, YD + 1.2, -290], size: [2, 1.4, 2], color: 'cyan', onBreak: { coins: 3 } },
    { type: 'pipe', id: 'p_farbe_back', pos: [UX + 5.6, YD, -296.6], height: 0.9 },
    { type: 'sign', pos: [UX + 1.6, YD, -287.4], text: 'Kristall: stampfen!', size: [2.4, 0.8] },
    // Ausgang: zwei Riesenräder, Sims mit Stern 2 darunter, Röhre zurück
    { type: 'drehrad', id: 'rad1', pos: [UX, YD, -309], radius: 3.4, platforms: 4, plank: [2.6, 1.6], speed: 0.5 },
    { type: 'drehrad', id: 'rad2', pos: [UX, YD, -318.5], radius: 3.4, platforms: 4, plank: [2.6, 1.6], speed: 0.5 },
    isl(UX - 3, UX + 3, -312.4, -315.2, YD - 6, 2, { top: 'stone', under: 2 }),
    { type: 'pipe', id: 'p_zurueck', pos: [UX + 1.9, YD - 6, -314.2], height: 0.9, target: 'p_rad' },
    { type: 'pipe', id: 'p_rad', pos: [UX - 6, YD, -301.6], height: 0.9 },
    isl(UX - 8, UX + 8, -323.6, -334, YD, 3, { top: 'stone', under: 2 }),
    { type: 'pipe', id: 'p_hoch', pos: [UX, YD, -329.6], height: 1.6, target: 'p_gipfel' },
    deco([{ kind: 'lantern', pos: [UX - 7, YD, -232] }, { kind: 'lantern', pos: [UX + 7, YD, -279] }, { kind: 'lantern', pos: [UX - 7, YD, -324.6] }]),
    decoW1([
      rock(UX - 10.5, UX - 8, -228, -336, YD - 12, YD + 12), rock(UX + 8, UX + 10.5, -228, -336, YD - 12, YD + 12, { color: ROCK2 }),
      rock(UX - 8, UX + 8, -334, -336.5, YD, YD + 12),
      rock(UX - 8, UX + 8, -227.5, -230, YD, YD + 3, { camIgnore: true }),
      { kind: 'stalactites', pos: [UX - 8.3, YD + 11.6, -282], size: [0.8, 100], n: 26, len: [1.2, 3.4] },
      { kind: 'stalactites', pos: [UX + 8.3, YD + 11.6, -282], size: [0.8, 100], n: 26, len: [1.2, 3.4] },
      { kind: 'crystals', pos: [UX - 7, YD, -240], size: 1.2, color: 'cyan' },
      { kind: 'crystals', pos: [UX + 7, YD, -246], size: 1, color: 'violet' },
      { kind: 'crystals', pos: [UX - 7, YD, -292], size: 1.1, color: 'pink' },
      { kind: 'crystals', pos: [UX + 7.2, YD, -302], size: 0.9, color: 'cyan' },
      { kind: 'crystals', pos: [UX + 7, YD, -328], size: 1.2, color: 'gold' },
      { kind: 'crystals', pos: [UX - 2.4, YD - 6, -312.8], size: 0.8, color: 'gold' },
      { kind: 'mushrooms', pos: [UX + 6.8, YD, -236], size: 0.9, color: 'cyan', glow: true },
      { kind: 'mushrooms', pos: [UX - 6.8, YD, -282], size: 0.8, color: 'violet', glow: true },
      { kind: 'mushrooms', pos: [UX - 6.6, YD, -331.4], size: 0.9, color: 'gold', glow: true },
      { kind: 'stalagmites', pos: [UX, YD - 9, -265], size: [12, 22], n: 8, len: [1, 3] },
      { kind: 'fireflies', pos: [UX, YD, -282], size: [14, 6, 90], n: 22, colors: [0x9ff2ff, 0xd8ff7a, 0xfff27a] },
    ]),
    { type: 'killplane', y: YD - 12, pos: [UX, YD - 12, -282], size: [40, 120] },

    // =============================================================== Ziel: Hügelkuppe (y 10, z −380 … −408)
    ...lawn(-10, 10, -380, -408, YG, 6, { under: 4 }),
    { type: 'pipe', id: 'p_gipfel', pos: [0, YG, -383.6], height: 1.2 },
    { type: 'mound', pos: [0, YG, -391], radius: 3.4, height: 0.8 },
    { type: 'sign', pos: [-4.4, YG, -386.4], text: 'Hügelmühle –\ngeschafft!', size: [2.4, 0.8] },
    deco([
      { kind: 'tree', pos: [-8.4, YG, -382.6], size: 4.2, color: 'green' }, { kind: 'tree', pos: [8.6, YG, -406], size: 4.6 },
      { kind: 'bush', pos: [8.4, YG, -384], size: 0.8 }, { kind: 'flowers', pos: [0, YG, -396], size: [12, 4], n: 10 },
      ...fence([[-9.6, -407.6], [9.6, -407.6]], YG),
    ]),
    decoW1([
      { kind: 'daisies', pos: [0, YG, -394], size: [18, 26], n: 40 },
      { kind: 'butterflies', pos: [-4, YG, -398], n: 4, r: 2.6 },
      { kind: 'bunting', from: [-8, 13.6, -404], to: [8, 13.6, -404], sag: 1, colors: [0xff4a3d, 0xffd23d, 0x3d8bff, 0x4fd04a] },
      { kind: 'cloudbank', pos: [-16, 4, -396], size: 6 }, { kind: 'cloudbank', pos: [16, 3, -386], size: 6 },
    ]),

    // =============================================================== Farbfeld-Raum (abseits, x ≈ 60, y −14)
    isl(52, 68, -280, -300, YD, 3, { top: 'stone', under: 2 }),
    { type: 'pipe', id: 'p_farbraum', pos: [55, YD, -282.6], height: 1.2 },
    { type: 'farbfeld', id: 'farbe', pos: [60, YD, -290.6], grid: [4, 4], cell: 2, onAll: { reveal: 'stern_farbe' }, indicator: [60, YD + 3.6, -297] },
    { type: 'pipe', id: 'p_farbraus', pos: [65.6, YD, -297.4], height: 1.2, target: 'p_farbe_back' },
    { type: 'sign', pos: [54.6, YD, -286.6], text: 'Alle Felder\nfärben!', size: [2, 0.8] },
    decoW1([
      rock(49.5, 52, -278, -302, YD, YD + 8), rock(68, 70.5, -278, -302, YD, YD + 8, { color: ROCK2 }),
      rock(52, 68, -300, -302.5, YD, YD + 8), rock(52, 68, -277.5, -280, YD, YD + 2.5, { camIgnore: true }),
      { kind: 'crystals', pos: [53, YD, -299], size: 1.2, color: 'pink' },
      { kind: 'crystals', pos: [67, YD, -282], size: 1, color: 'cyan' },
      { kind: 'mushrooms', pos: [67, YD, -299], size: 0.8, color: 'gold', glow: true },
      { kind: 'fireflies', pos: [60, YD, -290], size: [14, 5, 18], n: 12, colors: [0x9ff2ff, 0xfff27a] },
    ]),
  ],
  blocks: [
    // 1: Krallen-Anzug in Sichtweite des Starts
    { kind: 'question', pos: [0, 3.4, -4], content: 'krallenAnzug' },
    { kind: 'brick', pos: [-1, 3.4, -4], content: 'coins:3' },
    { kind: 'brick', pos: [1, 3.4, -4] },
    // 2: Wachstumsbeere vor der ersten Walze, Extraleben unsichtbar über der dritten Walze
    { kind: 'question', pos: [-3, YU + 2.4, -30], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [0, YU + 5.4, -62], content: 'oneup' },
    // 4: Kristallblöcke über der Röhre zum Farbfeld-Raum, Funkenblüte
    { kind: 'question', pos: [UX - 3, YD + 2.4, -240], content: 'funkenbluete' },
  ],
  enemies: [
    // Rollpilze (10)
    { kind: 'rollpilz', pos: [4, Y, -8], path: [[1.5, Y, -8], [8.5, Y, -8]] },
    { kind: 'rollpilz', pos: [-2, Y, -15.6], path: [[-5, Y, -15.6], [2.4, Y, -15.6]] },
    { kind: 'rollpilz', pos: [3, YU, -41], path: [[-3, YU, -41], [6, YU, -41]] },
    { kind: 'rollpilz', pos: [-4, YU, -55], behavior: 'chase', sight: 6 },
    { kind: 'rollpilz', pos: [2, YU, -70], path: [[-3, YU, -70], [3, YU, -70]] },
    { kind: 'rollpilz', pos: [-2, YU, -88], behavior: 'chase', sight: 6 },
    { kind: 'rollpilz', pos: [UX + 3, YD, -242], path: [[UX - 3, YD, -242], [UX + 5, YD, -242]] },
    { kind: 'rollpilz', pos: [UX - 3, YD, -246], behavior: 'chase', sight: 6 },
    { kind: 'rollpilz', pos: [UX, YD, -284], path: [[UX - 5, YD, -284], [UX + 3, YD, -284]] },
    { kind: 'rollpilz', pos: [UX - 2, YD, -298], behavior: 'chase', sight: 6 },
    // Hüpfmäuse (6)
    { kind: 'huepfmaus', pos: [-4, Y, -6], path: [[-7, Y, -6], [-1, Y, -6]] },
    { kind: 'huepfmaus', pos: [6, Y, -15], dir: [-1, 0] },
    { kind: 'huepfmaus', pos: [-5, YU, -29.6], path: [[-8, YU, -29.6], [-1, YU, -29.6]] },
    { kind: 'huepfmaus', pos: [-6, YU, -76], path: [[-9, YU, -76], [-2, YU, -76]] },
    { kind: 'huepfmaus', pos: [4, YU, -84], dir: [-1, 0] },
    { kind: 'huepfmaus', pos: [0, YG, -394], path: [[-5, YG, -394], [5, YG, -394]] },
    // Stachel-Hüpfmäuse (6)
    { kind: 'huepfmaus_stachel', pos: [UX + 2, YD, -236], path: [[UX - 4, YD, -236], [UX + 5, YD, -236]] },
    { kind: 'huepfmaus_stachel', pos: [UX - 4, YD, -248], dir: [1, 0] },
    { kind: 'huepfmaus_stachel', pos: [UX + 3, YD, -293], path: [[UX - 4, YD, -293], [UX + 3, YD, -293]] },
    { kind: 'huepfmaus_stachel', pos: [UX - 4, YD, -327], path: [[UX - 6, YD, -327], [UX + 4, YD, -327]] },
    { kind: 'huepfmaus_stachel', pos: [57, YD, -287], path: [[55, YD, -287], [65, YD, -287]] },
    { kind: 'huepfmaus_stachel', pos: [63, YD, -294], path: [[55, YD, -294.6], [65, YD, -294.6]] },
    // Pilzlinge (2: Hügel und Mühlenkeller) und Mini-Pilzlinge (3)
    { kind: 'pilzling', pos: [-3, YU, -64.6], path: [[-4.6, YU, -64.6], [4.6, YU, -64.6]] },
    { kind: 'pilzling', pos: [UX - 4, YD, -281], path: [[UX - 6, YD, -281], [UX - 1, YD, -281]] },
    { kind: 'pilzling', mini: true, pos: [-1, YU, -79], behavior: 'chase', sight: 5 },
    { kind: 'pilzling', mini: true, pos: [UX + 4, YD, -300], behavior: 'chase', sight: 5 },
    { kind: 'pilzling', mini: true, pos: [UX - 5, YD, -331], dir: [1, 0] },
  ],
  items: [
    // Aufbau-Haken (Laterne am Wegrand): Mühlen, Kaninchen, Untergrund-Licht, Blumen
    hook([10.8, Y, 4.2], scene),
    // Figurenschalter: Lotti und Greta (beide nötig für den Stempel)
    { kind: 'figurenschalter', id: 'fs_lotti', pos: [-4.4, Y, 0.2], hero: 'lotti', on: { reveal: 'weg_lotti' } },
    { kind: 'figurenschalter', id: 'fs_greta', pos: [-8.6, Y, 0.2], hero: 'greta', on: { reveal: 'weg_greta' } },
    // 1: Wegweiser
    line([0, 1.5, 2.6], [0, 1.5, -1.6], 3),
    line([5.6, 1.5, -10], [7, 1.5, -15], 3),
    ...column(0.6, -21.2, 3, 9, 5),
    // 2: Bögen über die Walzen, Ring auf dem Hügel
    line([0, YU + 0.6, -26], [0, YU + 0.6, -31.6], 3),
    ...arc([0, YU + 0.8, -33.4], [0, YU + 0.8, -38.6], 4, 2.2),
    line([0, YU + 0.6, -41], [0, YU + 0.6, -45.6], 3),
    ...arc([0, YU + 0.8, -46.2], [0, YU + 0.8, -51.8], 4, 2.4),
    ...arc([0, YU + 0.8, -59], [0, YU + 0.8, -65], 4, 2.8),
    { kind: 'roter_ring', id: 'ring', pos: [7, YU + 3, -74], yaw: Math.PI / 2, time: 12,
      coins: [[-8, YU + 0.8, -70], [-5, YU + 0.8, -76], [-8, YU + 0.8, -82], [-3, YU + 1.4, -82], [1, YU + 0.8, -86], [6, YU + 0.8, -90], [10, YU + 0.8, -84], [3, YU + 0.8, -79]] },
    line([0, YU + 0.6, -96], [0, YU + 0.6, -101], 3),
    // 4: Untergrund
    line([UX, YD + 0.6, -237], [UX, YD + 0.6, -248], 4),
    ring([UX, YD + 0.9, -254], 1.4, 6), ring([UX - 4.5, YD + 0.9, -260], 1.4, 6), ring([UX + 1, YD + 0.9, -266.5], 1.5, 6),
    line([UX, YD + 0.8, -272], [UX, YD + 0.8, -274], 2),
    line([UX, YD + 0.6, -280], [UX, YD + 0.6, -302], 6),
    ...arc([UX, YD + 1, -315], [UX, YD + 1, -322.8], 4, 2),
    ring([UX, YD - 5, -313.8], 1.2, 6),
    line([UX, YD + 0.6, -325], [UX, YD + 0.6, -328], 2),
    // Ziel
    line([0, YG + 0.6, -387], [0, YG + 0.6, -394], 4),
    // Farbfeld-Raum
    ring([60, YD + 0.8, -290.6], 2.8, 8),
  ],
  checkpoint: [3.2, YU, -100.6],
  stars: [
    [0, Y + 9.2, -23],                                                    // 0: Kletterfels (Krallen-Anzug)
    { pos: [60, YD + 0.4, -290.6], hidden: true, id: 'stern_farbe' },    // 1: Farbfeld-Raum
    [UX, YD - 6, -313.8],                                                 // 2: zwischen den Riesenrädern
  ],
  stamp: [-9.5, Y + 7.6, -7.5],
  goal: { pos: [0, YG, -400.6], height: 9 },
  marks: {
    start: [0, Y, 5],
    switches: [-6.4, Y, 2.6],
    lotti: [-4.4, Y, 0.2],
    greta: [-8.6, Y, 0.2],
    tower: [-9.5, Y + 7.6, -7.5],
    cliff: [0, Y, -19.8],
    pipeR: [7, Y, -14.6],
    meadow: [0, YU, -28],
    drum1: [0, YU, -32],
    drum3: [0, YU, -58],
    ring: [7, YU + 3, -74],
    checkpoint: [0, YU, -100],
    under: [UX, YD, -236],
    gears: [UX, YD, -249],
    crystal: [UX + 5, YD, -287.6],
    wheels: [UX, YD, -302.6],
    ledge: [UX, YD - 6, -313.8],
    exit: [UX, YD, -326],
    goal: [0, YG, -387],
    paint: [60, YD, -284],
  },
};
