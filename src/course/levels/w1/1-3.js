// 1-3 „Kraxelei am Klötzchenberg“ – vertikaler Bergparcours (Welt 1), ca. 230 m nach −Z, 40 m Höhengewinn,
// kein Checkpoint (Bauplan). Ranken zum Klettern, bunte Riesenblöcke im 8-Bit-Stil (deco_w1b pixelblock).
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild):
//   1  Startplatz      (z 10 … −11, y 0)   Zwei Kobolde mit Fernglas in Bäumen; linker Baum hat eine Ranke →
//                      Krone mit Stern 1. Rechts zwei enge Wände (Wandsprung-Schacht) – Stempel oben dazwischen.
//   2  Brücke und Schnappblumenfeld (z −11 … −47, y 0 → 1)   6 Schnappblumen, POW-Block, unsichtbarer 1-Up-Block
//                      am Ende der Münzspur links.
//   3  POW-Hang        (z −47 … −81, y 3 → 9)   Hang mit Ziegelreihen, Krallen-Pilzlinge; POW-Blöcke sprengen die
//                      Ziegelwand vor einer Nische → Warp-Röhre in den P-Schalter-Raum (Stern 2, blaue Münzen).
//   4  Wolkenpfad      (z −81 … −126, y 9 → 17)   Ranke an der Felswand, Wolken mit 3–3,5 m Lücken, Holzbrücke.
//   5  Doppelhügel     (z −126 … −152, y 17)   links Wolkenkanone → Münzhimmel (Stern 3 am Ende, Röhre zurück),
//                      rechts blaue Plattform mit Extraleben.
//   6  Gipfelbrücke    (z −152 … −200, y 17 → 30)   Riesenblock-Treppe, Ranke, Gipfelbrücke, Riesenschnappblume
//                      (Zwischenboss) → Warp-Box zum Ziel auf dem Gipfel (y 40).
//   Abseits: P-Schalter-Raum bei x ≈ 70, Münzhimmel bei x ≈ −46, y ≈ 46 (eigene Kameraschienen).
// Gegner: Krallen-Pilzling 8, Schnappblume 14, Riesenschnappblume 1.

const coinsLine = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzbogen von a nach b mit Scheitelhöhe h (n Münzen). */
const arc = (a, b, h, n) => Array.from({ length: n }, (_, i) => {
  const t = n === 1 ? 0.5 : i / (n - 1);
  return { kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] };
});
/** Bergplateau: Rechteck x0…x1, z0…z1 mit Oberseite top und Unterkante base (Erdkörper, verjüngter Fuß). */
const plateau = (x0, x1, z0, z1, top, base, o = {}) => ({
  type: 'island', pos: [(x0 + x1) / 2, base, (z0 + z1) / 2], size: [x1 - x0, top - base, Math.abs(z1 - z0)], under: 4, ...o,
});
const pix = (x, y, z, w, h, d, color, motif) => ({ kind: 'pixelblock', pos: [x, y, z], size: [w, h, d], color, motif });
const snap = (x, y, z, o = {}) => ({ kind: 'schnappblume', pos: [x, y, z], ...o });
const kralle = (x, y, z, path, o = {}) => ({ kind: 'krallen_pilzling', pos: [x, y, z], ...(path ? { path } : {}), ...o });

export const LEVEL = {
  id: '1-3',
  world: 1,
  title: 'Kraxelei am Klötzchenberg',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_grass',
  timeLimit: 500,
  start: { pos: [0, 0, 6], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -11, pitch: 44, dist: 13, yaw: 0 },
    { from: -11, to: -47, pitch: 44, dist: 13.5, yaw: 0 },
    { from: -47, to: -80, pitch: 47, dist: 13, yaw: 0 },
    { from: -80, to: -118, pitch: 46, dist: 14, yaw: 0 },
    { from: -118, to: -152, pitch: 44, dist: 14, yaw: 0 },
    { from: -152, to: -176, pitch: 48, dist: 13.5, yaw: 0 },
    { from: -176, to: -201, pitch: 43, dist: 15, yaw: 0, x: 0, xLock: 0.3 },
    { from: -201, to: -225, pitch: 40, dist: 14, yaw: 0, x: 0, xLock: 0.5 },
    // P-Schalter-Raum (abseits)
    { from: -55, to: -82, pitch: 52, dist: 12.5, yaw: 0, x: 70, xLock: 0.6, area: [55, 90] },
    // Münzhimmel (abseits, hoch oben)
    { from: -112, to: -180, pitch: 42, dist: 14, yaw: 0, x: -46, xLock: 0.6, area: [-75, -28] },
  ],
  segments: [
    // ======================================================== 1  Startplatz
    plateau(-10, 10, 11, -11, 0, -12),
    { type: 'deco_w1b', items: [
      { kind: 'bigtree', pos: [-6.5, 0, -3], size: 7, r: 2.3 },
      { kind: 'bigtree', pos: [7.2, 0, 5.2], size: 4.4, r: 1.7, color: 'autumn' },
      { kind: 'sign', pos: [2.6, 0, -8.6], yaw: Math.PI / 2 },
      { kind: 'mushroom', pos: [-8.6, 0, 4], size: 1.3, color: 'red' },
      { kind: 'mushroom', pos: [-7.7, 0, 5.3], size: 0.8, color: 'yellow' },
      { kind: 'tufts', pos: [-2, 0, 2], size: [6, 6], n: 10 },
      { kind: 'tufts', pos: [3, 0, -6], size: [4, 4], n: 6 },
      { kind: 'rockpile', pos: [9, 0, -10], size: 1 },
      { kind: 'path', from: [0.6, 0, 9.5], to: [0, 0, -10.5], n: 16 },
      { kind: 'path', from: [-1.5, 0, 0.8], to: [-5.6, 0, 0.6], n: 4 },
    ] },
    { type: 'beanstalk', pos: [-6.5, 0, -0.45], height: 8.2 },
    // Wandsprung-Schacht (Stempel oben zwischen den Wänden)
    { type: 'wall', pos: [5, 0, -6.6], size: [1, 9, 3.2], style: 'stone' },
    { type: 'wall', pos: [9, 0, -6.6], size: [1, 11.5, 3.2], style: 'stone' },
    { type: 'deco', items: [
      { kind: 'flowers', pos: [-3, 0, 7.5], size: [3, 2], n: 8 }, { kind: 'flowers', pos: [3.5, 0, 0], size: [2.5, 2], n: 8 },
      { kind: 'bush', pos: [-9, 0, -9.5], size: 0.8 }, { kind: 'bush', pos: [9.2, 0, 1], size: 0.7 }, { kind: 'bush', pos: [-3.5, 0, 9.5], size: 0.6 },
      { kind: 'fence', from: [-9.6, 0, 10.6], to: [-4.5, 0, 10.6] }, { kind: 'fence', from: [4.5, 0, 10.6], to: [9.6, 0, 10.6] },
      { kind: 'flower', pos: [6.2, 0, -7.6], color: 'yellow' }, { kind: 'flower', pos: [7.8, 0, -7.7], color: 'pink' },
    ] },

    // ======================================================== 2  Brücke und Schnappblumenfeld
    { type: 'bridge', from: [0, 0, -11], to: [0, 1, -19], width: 3 },
    plateau(-10, 10, -19, -47, 1, -11),
    { type: 'deco_w1b', items: [
      { kind: 'tufts', pos: [-4, 1, -27], size: [5, 6], n: 10 },
      { kind: 'tufts', pos: [4, 1, -38], size: [6, 6], n: 10 },
      { kind: 'mushroom', pos: [8.8, 1, -21], size: 1.1, color: 'blue' },
      { kind: 'mushroom', pos: [-9, 1, -30], size: 0.9, color: 'red' },
      { kind: 'rockpile', pos: [8.6, 1, -45.5], size: 1 },
      pix(-6, 1, -45.8, 3, 1, 2.4, 'yellow'),
      pix(8.5, 1, -40, 2, 2, 2, 'blue', 'star'),
      { kind: 'path', from: [0, 1, -19.6], to: [-2.6, 1, -27.5], n: 7 },
      { kind: 'path', from: [-2.6, 1, -28.6], to: [2.2, 1, -37], n: 8 },
      { kind: 'path', from: [2.2, 1, -38.2], to: [0.5, 1, -46.5], n: 7 },
    ] },
    { type: 'deco', items: [
      { kind: 'flowers', pos: [6, 1, -21.5], size: [3, 2], n: 8 }, { kind: 'flowers', pos: [-6, 1, -42], size: [3, 3], n: 8 },
      { kind: 'flowers', pos: [0, 1, -36.5], size: [2, 2], n: 6 },
      { kind: 'bush', pos: [9.2, 1, -27], size: 0.8 }, { kind: 'bush', pos: [-9.2, 1, -21], size: 0.7 },
      { kind: 'tree', pos: [-9, 1, -38.5], size: 4.2, color: 'green' },
      { kind: 'fence', from: [9.6, 1, -31], to: [9.6, 1, -36] },
    ] },

    // ======================================================== 3  POW-Hang
    plateau(-10, 10, -47, -71, 3, -9),
    { type: 'ramp', pos: [-3, 3, -62], size: [14, 6, 18], axis: 'z', dir: -1 },
    { type: 'deco_w1b', items: [{ kind: 'slopegrass', pos: [-3, 3, -62], size: [14, 6, 18], axis: 'z', dir: -1, n: 22, keep: [-3, 1.6] }] },
    plateau(-10, 10, -71, -81, 9, -5),
    // rechte Bahn: Riesenblock-Treppe als zweiter Weg hinauf
    { type: 'deco_w1b', items: [
      pix(7, 3, -55.5, 4, 1.5, 3, 'blue'),
      pix(7, 3, -60, 4, 3, 3, 'yellow', 'heart'),
      pix(7, 3, -64.5, 4, 4.5, 3, 'red'),
      pix(7, 3, -69, 4, 6, 3, 'green', 'face'),
      { kind: 'tufts', pos: [-6, 3, -50], size: [6, 3], n: 8 },
      { kind: 'tufts', pos: [0, 9, -74], size: [8, 4], n: 10 },
      { kind: 'sign', pos: [2.5, 9, -74.5], yaw: Math.PI * 0.12 },
      { kind: 'waterfall', pos: [-7.4, 9, -80.92], size: [2.4, 6], pool: 1.5 },
      { kind: 'path', from: [-3, 9, -71.6], to: [-3, 9, -79.2], n: 7 },
    ] },
    // Nische mit Warp-Röhre (Ziegelwand davor, POW sprengt sie frei)
    { type: 'wall', pos: [4.5, 9, -79], size: [1, 3.4, 4], style: 'stone' },
    { type: 'wall', pos: [8.5, 9, -79], size: [1, 3.4, 4], style: 'stone' },
    { type: 'platform', style: 'stone', pos: [6.5, 12, -79], size: [5, 0.6, 4] },
    { type: 'pipe', id: 'zuPRaum', pos: [6.5, 9, -79.6], height: 1.2, target: 'pRaumEin' },
    { type: 'deco', items: [
      { kind: 'bush', pos: [-9.2, 9, -71.8], size: 0.8 }, { kind: 'flowers', pos: [-9, 9, -75.5], size: [1.6, 3], n: 8 },
      { kind: 'rock', pos: [9.2, 3, -49.5], size: 0.6 }, { kind: 'tree', pos: [9, 9, -72.2], size: 4.2, color: 'autumn' },
    ] },

    // ======================================================== 4  Ranke an der Felswand, Wolkenpfad, Holzbrücke
    plateau(-8, 8, -81, -88, 15, 3),
    { type: 'beanstalk', pos: [-3, 9, -80.45], height: 7.4 },
    { type: 'deco_w1b', items: [
      { kind: 'flag', pos: [-6.6, 15, -86.8], size: 2.2, color: 'red' },
      { kind: 'tufts', pos: [0, 15, -84.5], size: [10, 4], n: 10 },
    ] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-1, 14.5, -92], size: [3.4, 0.6, 3] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [2.5, 15, -98.5], size: [3.4, 0.6, 3] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-1.5, 15.5, -105], size: [3.4, 0.6, 3] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [1.5, 16, -111.5], size: [4.2, 0.6, 3.4] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-7.5, 16.5, -101], size: [3, 0.6, 3] },    // Seitenwolke mit Münzen
    { type: 'deco_w1b', kind: 'cloudplat', pos: [7.5, 15.5, -108], size: [3, 0.6, 3] },     // Seitenwolke (Schnappblume)
    { type: 'bridge', from: [1.5, 16.6, -116.5], to: [1.5, 17, -126], width: 3, color: 0xc98a4a },
    { type: 'killplane', pos: [0, 5, -104], size: [80, 46] },

    // ======================================================== 5  Doppelhügel
    plateau(-12, 12, -126, -152, 17, 5),
    { type: 'hill', pos: [-5.5, 17, -137.5], radius: 4.5, height: 3, steps: 2 },
    { type: 'cloudcannon', id: 'wolkenkanone', pos: [-5.5, 20, -137.5], target: [-46, 46, -121.5], arc: 6 },
    { type: 'hill', pos: [5.5, 17, -140], radius: 4.5, height: 3, steps: 2 },
    { type: 'platform', pos: [5.5, 22.2, -140], size: [2.6, 0.6, 2.6], color: 'blue' },
    { type: 'killplane', pos: [0, 8, -139.5], size: [80, 25] },
    { type: 'killplane', pos: [0, -8, -35], size: [80, 100] },
    { type: 'deco_w1b', items: [
      { kind: 'tufts', pos: [0, 17, -129], size: [10, 4], n: 10 },
      { kind: 'mushroom', pos: [10.5, 17, -129], size: 1.4, color: 'red' },
      { kind: 'mushroom', pos: [-10.6, 17, -148], size: 1.0, color: 'blue' },
      { kind: 'rockpile', pos: [10.3, 17, -150.5], size: 1.1 },
      { kind: 'sign', pos: [-2.4, 17, -128], yaw: Math.PI * 0.75 },
      { kind: 'path', from: [1.5, 17, -126.6], to: [0.4, 17, -134.5], n: 7 },
      { kind: 'path', from: [0.4, 17, -143.5], to: [-3, 17, -151.5], n: 7 },
      { kind: 'waterfall', pos: [-8, 9.5, -125.92], size: [2.2, 7.5], pool: 0 },
      { kind: 'mushroom', pos: [-8, 17, -127.6], size: 0.7, color: 'yellow' },
    ] },
    { type: 'deco', items: [
      { kind: 'flowers', pos: [0, 17, -145], size: [3, 3], n: 8 }, { kind: 'flowers', pos: [-10, 17, -131], size: [2, 3], n: 8 },
      { kind: 'tree', pos: [10.3, 17, -136], size: 4.6, color: 'green' }, { kind: 'bush', pos: [-10.6, 17, -140], size: 0.8 },
    ] },

    // ======================================================== 6  Riesenblock-Treppe, Ranke, Gipfelbrücke
    plateau(-10, 10, -152, -172, 17, 5),
    { type: 'deco_w1b', items: [
      pix(-3.5, 17, -155.5, 5, 2, 4, 'yellow', 'star'),
      pix(2.5, 17, -159.5, 5, 4, 4, 'red', 'face'),
      pix(-3.5, 17, -163.5, 5, 6, 4, 'blue', 'heart'),
      pix(2.5, 17, -168.5, 5, 8, 6, 'green'),
      { kind: 'tufts', pos: [6, 17, -154], size: [6, 3], n: 8 },
      { kind: 'rockpile', pos: [-8.6, 17, -170], size: 1.2 },
    ] },
    { type: 'deco', items: [
      { kind: 'bush', pos: [8.5, 17, -164], size: 0.8 }, { kind: 'flowers', pos: [7, 17, -157], size: [3, 2], n: 8 },
      { kind: 'tree', pos: [-8.6, 17, -158], size: 4.4, color: 'autumn' },
    ] },
    { type: 'beanstalk', pos: [2.5, 25, -171.05], height: 6.6 },
    plateau(-6, 6, -171.5, -176, 30, 5),
    { type: 'bridge', from: [0, 30, -176], to: [0, 30, -186], width: 4 },
    plateau(-8, 8, -186, -201, 30, 18),
    // Gipfel mit Zielmast (über die Warp-Box erreichbar)
    plateau(-7, 7, -204, -218, 40, 24),
    { type: 'killplane', pos: [0, 9, -190], size: [80, 76] },
    { type: 'deco_w1b', items: [
      { kind: 'flag', pos: [-6.3, 40, -205], size: 2.6, color: 'red' },
      { kind: 'flag', pos: [6.3, 40, -205], size: 2.6, color: 'blue' },
      { kind: 'tufts', pos: [0, 40, -210], size: [10, 8], n: 10 },
      { kind: 'cairn', pos: [5, 40, -216], size: 1.2 },
      { kind: 'path', from: [0, 40, -204.6], to: [0, 40, -209.6], n: 5 },
      { kind: 'rockpile', pos: [-7, 30, -200], size: 1.0 },
      { kind: 'rockpile', pos: [7.2, 30, -187], size: 0.9 },
    ] },
    { type: 'deco', items: [
      { kind: 'flowers', pos: [3.5, 40, -214], size: [3, 3], n: 8 }, { kind: 'bush', pos: [-5.8, 40, -216], size: 0.8 },
      { kind: 'fence', from: [-5, 30, -175.8], to: [-2, 30, -175.8] }, { kind: 'fence', from: [2, 30, -175.8], to: [5, 30, -175.8] },
    ] },

    // ======================================================== Kulisse: Bergpanorama, Wolken
    { type: 'deco_w1b', items: [
      { kind: 'mountain', pos: [0, -48, -330], size: [70, 120] },
      { kind: 'mountain', pos: [-95, -48, -260], size: [55, 95] },
      { kind: 'mountain', pos: [100, -48, -280], size: [60, 100] },
      { kind: 'mountain', pos: [-120, -48, -120], size: [50, 70], snow: false },
      { kind: 'mountain', pos: [125, -48, -90], size: [48, 64], snow: false },
      { kind: 'cloudpuff', pos: [-16, 6, -30], size: 2.6 },
      { kind: 'cloudpuff', pos: [17, 9, -60], size: 3 },
      { kind: 'cloudpuff', pos: [-15, 11, -100], size: 2.4 },
      { kind: 'cloudpuff', pos: [12, 10, -95], size: 2.2 },
      { kind: 'cloudpuff', pos: [-18, 22, -150], size: 3.2 },
      { kind: 'cloudpuff', pos: [18, 24, -180], size: 3 },
      { kind: 'cloudpuff', pos: [-14, 31, -212], size: 2.6 },
      { kind: 'cloudpuff', pos: [0, 6, -105], size: 3.4 },
      { kind: 'pixelblock', backdrop: true, pos: [15, 1, -14], size: [2, 2, 2], color: 'green' },
      { kind: 'pixelblock', backdrop: true, pos: [-16, 5, -38], size: [2, 2, 2], color: 'yellow', motif: 'star' },
      { kind: 'pixelblock', backdrop: true, pos: [17, 11, -66], size: [3, 3, 3], color: 'blue', motif: 'heart' },
      { kind: 'pixelblock', backdrop: true, pos: [-20, 13, -78], size: [2, 2, 2], color: 'purple' },
      { kind: 'pixelblock', backdrop: true, pos: [-17, 19, -112], size: [3, 3, 3], color: 'red', motif: 'face' },
      { kind: 'pixelblock', backdrop: true, pos: [16, 21, -120], size: [2, 2, 2], color: 'green' },
      { kind: 'pixelblock', backdrop: true, pos: [-15, 27, -168], size: [3, 3, 3], color: 'yellow', motif: 'heart' },
      { kind: 'pixelblock', backdrop: true, pos: [17, 32, -192], size: [3, 3, 3], color: 'red', motif: 'star' },
      { kind: 'pixelblock', backdrop: true, pos: [-15, 38, -214], size: [2, 2, 2], color: 'blue' },
    ] },

    // ======================================================== P-Schalter-Raum (abseits, x ≈ 70)
    plateau(61, 79, -59, -77, 0, -3, { top: 'stone', under: 0 }),
    { type: 'wall', pos: [70, 0, -77.5], size: [20, 4, 1], style: 'stone' },
    { type: 'wall', pos: [60.5, 0, -68], size: [1, 4, 19], style: 'stone', camIgnore: true },
    { type: 'wall', pos: [79.5, 0, -68], size: [1, 4, 19], style: 'stone', camIgnore: true },
    { type: 'pipe', id: 'pRaumEin', pos: [64, 0, -61.5], height: 1.4 },
    { type: 'pipe', id: 'pRaumAus', pos: [76, 0, -74], height: 1.4, target: 'pRaumZiel' },
    { type: 'pipe', id: 'pRaumZiel', pos: [5, 15, -85.6], height: 1.2 },
    { type: 'deco_w1b', items: [
      pix(66, 0, -72, 2, 1.5, 2, 'red'),
      pix(74, 0, -66, 2, 2.5, 2, 'blue', 'star'),
      pix(70, 0, -75.5, 4, 1, 2, 'yellow'),
    ] },

    // ======================================================== Münzhimmel (abseits, x ≈ −46, y ≈ 46)
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-46, 45.4, -122], size: [6, 0.6, 6] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-46, 45.4, -133], size: [4, 0.6, 12] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-43, 46.4, -145], size: [4, 0.6, 6] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-48, 47.4, -154], size: [4, 0.6, 6] },
    { type: 'deco_w1b', kind: 'cloudplat', pos: [-46, 47.4, -165], size: [6, 0.6, 9] },
    { type: 'pipe', id: 'himmelAus', pos: [-46, 48, -168.6], height: 1.4, target: [0, 17, -154] },
    { type: 'killplane', pos: [-46, 30, -145], size: [40, 70] },
    { type: 'deco_w1b', items: [
      { kind: 'cloudpuff', pos: [-52, 44, -128], size: 2.4 }, { kind: 'cloudpuff', pos: [-39, 45, -140], size: 2.2 },
      { kind: 'cloudpuff', pos: [-54, 46, -160], size: 2.8 }, { kind: 'cloudpuff', pos: [-38, 46, -170], size: 2.4 },
    ] },
  ],
  blocks: [
    // Startplatz: Funkenblüte (Schnappblumen!) und Münzen
    { kind: 'brick', pos: [-1.5, 3.4, -0.8] },
    { kind: 'question', pos: [-0.5, 3.4, -0.8], content: 'funken' },
    { kind: 'brick', pos: [0.5, 3.4, -0.8] },
    { kind: 'brick', pos: [1.5, 3.4, -0.8] },
    // Schnappblumenfeld
    { kind: 'question', pos: [3, 3.4, -21.5], content: 'wachstumsbeere' },
    { kind: 'pow', pos: [0, 3.5, -33], uses: 3, radius: 10, height: 3 },
    { kind: 'hidden', pos: [-8.2, 3.4, -42.5], content: 'oneup' },
    { kind: 'coinblock', pos: [-4, 3.4, -21.5], count: 6 },
    // POW-Hang: Ziegelreihen auf dem Hang, POW-Blöcke, Ziegelwand vor der Röhren-Nische
    ...[-8, -7, -6, -2, -1, 0].map((x) => ({ kind: 'brick', pos: [x, 7.4, -58] })),
    ...[-9, -8, -4, -3, -2].map((x) => ({ kind: 'brick', pos: [x, 9.9, -65] })),
    { kind: 'pow', pos: [-5, 7.4, -58], uses: 3, radius: 9, height: 3.5 },
    { kind: 'pow', pos: [2, 11.4, -73.5], uses: 3, radius: 8, height: 3 },
    ...[5.5, 6.5, 7.5].flatMap((x) => [9, 10, 11].map((y) => ({ kind: 'brick', pos: [x, y, -77.5] }))),
    // Doppelhügel
    { kind: 'question', pos: [5.5, 25.2, -140], content: 'oneup' },
    // Münzhimmel: Funkelstern (Bauplan: Wolkenkanone „zum Unverwundbarkeitsstern“)
    { kind: 'question', pos: [-46, 48.6, -131], content: 'stern' },
    // vor der Gipfelbrücke: Funkenblüte gegen die Riesenschnappblume
    { kind: 'question', pos: [0, 33.4, -173.8], content: 'funken' },
  ],
  enemies: [
    // Krallen-Pilzlinge (8)
    kralle(0, 1, -44, [[-6, 1, -44], [6, 1, -44]]),
    kralle(-3, 4.5, -56, null, { dir: [0, 1] }),
    kralle(-6, 7, -66, null, { dir: [0, 1] }),
    kralle(0, 9, -75.5, [[-6, 9, -75.5], [3, 9, -75.5]]),
    kralle(0, 17, -131, [[-4, 17, -131], [4, 17, -131]]),
    kralle(0, 17, -150, [[-7, 17, -150], [7, 17, -150]]),
    kralle(-5, 17, -167, [[-8, 17, -167], [-1, 17, -167]]),
    kralle(5, 17, -154, [[1, 17, -154], [8, 17, -154]]),
    // Schnappblumen (14)
    snap(-6, 1, -24), snap(5.5, 1, -26), snap(-1.5, 1, -29.5), snap(6, 1, -34), snap(-6.5, 1, -36), snap(2, 1, -40.5),
    snap(-9, 3, -53.5), snap(4.2, 9, -72.5),
    snap(7.5, 16.1, -108),
    snap(9.5, 17, -130), snap(-9.8, 17, -145.5), snap(-0.5, 17, -145.5),
    snap(-5, 23, -164.5), snap(4.5, 25, -166.2),
    // Zwischenboss (3 Treffer: Feuerbälle, Tatzenhieb oder Stampfen direkt neben ihr)
    { kind: 'riesenschnappblume', pos: [0, 30, -196.5], id: 'gipfelboss', hp: 3, base: 'ground', yaw: Math.PI / 2 },
  ],
  items: [
    // 1 Startplatz: Münzen an der Ranke, Spur zur Brücke, Bogen im Schacht
    coinsLine([-6.5, 2, 0.25], [-6.5, 6, 0.25], 3),
    coinsLine([0, 0.2, 1], [0, 0.2, -7], 3),
    coinsLine([7, 2.6, -6.2], [7, 5.4, -6.2], 3),
    // 2 Feld
    coinsLine([0, 0.6, -12.5], [0, 1.3, -17.5], 3),
    coinsLine([-8.2, 1.2, -26], [-8.2, 1.2, -38], 5),
    arc([-3, 1.2, -31.5], [3, 1.2, -31.5], 1.6, 4),
    // 3 Hang
    coinsLine([7, 4.9, -55.5], [7, 9.4, -69], 4),
    arc([-3, 4, -52], [-3, 6.5, -60], 1.4, 3),
    coinsLine([-3, 9.5, -73], [-3, 13.5, -79.8], 3),
    // 4 Ranke, Wolken
    coinsLine([-3, 11.5, -79.75], [-3, 14.5, -79.75], 2),
    arc([-0.5, 15.5, -88.5], [-1, 15.5, -92], 1.2, 3),
    arc([-0.5, 15.5, -94.5], [2.5, 16, -98.5], 1.6, 3),
    arc([2, 16, -101], [-1.5, 16.5, -105], 1.6, 3),
    arc([-1.5, 16.5, -107.5], [1.5, 17, -111.5], 1.6, 3),
    { kind: 'coins', pos: [-7.5, 17.2, -101], r: 1, n: 5 },
    // 5 Doppelhügel
    { kind: 'coins', pos: [-5.5, 20.3, -137.5], r: 1.7, n: 5 },
    coinsLine([1.5, 17.2, -128], [1.5, 17.2, -134], 3),
    // 6 Treppe
    coinsLine([-3.5, 19.3, -155.5], [2.5, 21.3, -159.5], 3),
    coinsLine([2.5, 26.5, -170.2], [2.5, 29.5, -170.2], 2),
    coinsLine([0, 30.3, -177.5], [0, 30.3, -184.5], 4),
    // Gipfel
    arc([-3, 40.2, -207], [3, 40.2, -207], 1.2, 4),
    // Kobolde mit Fernglas in den Bäumen (Deko mit Leben)
    { kind: 'spotter', pos: [-7.4, 7, -4.4], yaw: -0.9 },
    { kind: 'spotter', pos: [7.7, 4.4, 4.6], yaw: -2.2 },
    // Gipfel: Sieg über die Riesenschnappblume → Warp-Box zum Ziel erscheint
    { kind: 'task', type: 'defeatAll', ids: ['gipfelboss'], area: { pos: [0, 30, -193.5], r: 10 }, reward: { reveal: 'zielbox' } },
    { kind: 'warpbox', id: 'zielbox', hidden: true, pos: [0, 30, -191], target: [0, 40, -206.2] },
    // P-Schalter-Raum: Druckschalter → 8 blaue Münzen für 12 s, alle → Stern 2
    { kind: 'pswitch', id: 'pRaumSchalter', pos: [70, 0, -67], time: 12, star: 1,
      coins: [[63.5, 0.3, -66], [66, 1.8, -72], [66, 0.3, -63.5], [70, 1.3, -75.5], [74, 2.8, -66], [76.5, 0.3, -70], [73.5, 0.3, -61], [70, 2.6, -62]] },
    { kind: 'coins', pos: [-46, 46.2, -122], r: 2, n: 6 },
    coinsLine([-47.2, 46.2, -128.5], [-47.2, 46.2, -137.5], 5), coinsLine([-44.8, 46.2, -128.5], [-44.8, 46.2, -137.5], 5),
    arc([-46, 46.3, -139.5], [-43, 47.3, -144], 1.8, 4), arc([-43, 47.3, -147.5], [-48, 48.3, -153], 2, 4),
    coinsLine([-48, 48.2, -154], [-48, 48.2, -157], 3), arc([-48, 48.3, -158], [-46, 48.3, -161], 1.5, 3),
    { kind: 'coins', pos: [-46, 48.2, -164.5], r: 2.2, n: 8 },
  ],
  stars: [
    [-6.5, 7.05, -3.2],                                    // 1: Krone des Rankenbaums links vom Start
    { pos: [70, 0.6, -70.5], hidden: true, id: 'stern2' }, // 2: P-Schalter-Raum (erscheint nach allen blauen Münzen)
    [-46, 48.05, -164.5],                                  // 3: Ende des Münzhimmels (im Münzkreis)
  ],
  stamp: [7, 7.4, -6.2],         // zwischen den zwei Wänden am Start (nur per Wandsprung)
  goal: { pos: [0, 40, -212], height: 8 },
  marks: {
    start: [0, 0, 6],
    tree: [-6.5, 0, 0.6],
    shaft: [7, 0, -6],
    field: [0, 1, -20.5],
    pow: [0, 1, -33],
    slope: [0, 3, -48.5],
    niche: [6.5, 9, -76],
    vine: [-3, 9, -79.4],
    clouds: [0, 15, -86.5],
    hills: [1.5, 17, -127],
    stairs: [0, 17, -153],
    bridge: [0, 30, -175],
    arena: [0, 30, -188],
    summit: [0, 40, -206],
    goal: [0, 40, -209],
    proom: [64, 0, -64],
    heaven: [-46, 45.4, -121],
  },
};
