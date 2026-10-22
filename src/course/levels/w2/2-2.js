// 2-2 „Sternenklavier“ – schwebende Inseln im Weltraum mit Tastensteinen, Antipp-Plattformen, Kristallen und
// Propellerplattformen (Bauplan: Detail 2-2). Level verläuft nach −Z; unter den Inseln nur Sterne und Planeten.
//
// Abschnitte (Länge entlang z):
//   1  Start             z   8 … −22  (30 m) Startinsel, ein großer Tastenstein hebt die Heldin auf die obere Insel
//                                     (Schnappblumen, Rollpilze). Zwei Schwebeplattformen zum Antippen: links hebt
//                                     sie zu einem Münzkranz, rechts gibt sie eine Röhre frei → Stempel-Raum (zwei
//                                     Rollpilze, abseits bei x ≈ 80).
//   2  Antipp-Plattformen z −22 … −46 (24 m) Leere mit Antipp-Plattformen (erscheinen, fahren aus einer Säule,
//                                     verschwinden nach 5 s, heben sich), Lücken 2–2,5 m; Antipp-Münzen im All.
//   3  Kristallwand       z −46 … −88 (42 m) Insel mit Mini-Pilzlingen, Kristallstufen hinauf (2-m-Stufen), links ein
//                                     Kamin aus zwei Kristallwänden (Wandsprung → Stern 0 oben), Checkpoint, Kristall-
//                                     block mit Geheimnis (Stampfen → Truhe mit Extraleben), steigende Propeller-
//                                     plattform hinauf zur Warp-Box.
//   4  Warp-Box           z −84 … −88  oben auf dem Sims; bringt die Heldin zum Plattformnetz (Leere dazwischen).
//   5  Plattformnetz      z −100 … −172 (72 m) Propellerplattformen (Pendel, sinkend, schwebend) zur Schnappblumen-
//                                     Insel; links ein Sternensteg, auf dem der Münzmarder flieht (einholen → Münzen);
//                                     rechts über eine Pendel-Propellerplattform zur Wolkenkanone → Münzhimmel mit
//                                     Stern 1 am Ende.
//   6  Ziel               z −172 … −204 (32 m) Klaviatur-Insel mit einer Tastenstein-Treppe (jede Taste ein Ton) hinauf
//                                     zur Zielinsel; drei Kristallplatten im Boden, unter der dritten Stern 2.
// Sterne (Index): 0 Kristall-Kamin (Wandsprung), 1 Ende des Münzhimmels (Wolkenkanone), 2 unter der dritten
//                 Kristallplatte. Stempel: Raum unter der rechten Schwebeplattform.

import { isl, line, ring, arc, column, setupHook, farHide, shadowless } from './_helpers_a.js';

const Y = 1;
const CAM = { pitch: 44, dist: 13.5, fov: 40, area: [-40, 40] };

/** Schwebende Insel (lavendel Decke, violetter Körper, Felskegel darunter). */
const fl = (x0, x1, zA, zB, top = Y, o = {}) => isl(x0, x1, zA, zB, top, o.h ?? 2.4, { under: o.under ?? 3, ...o });
/** Kristallsäule als Stufe (bunter Block von base bis top). */
const step = (x, z, top, color = 'cyan', w = 3, d = 3, base = top - 1.2) => ({ type: 'platform', pos: [x, base, z], size: [w, top - base, d], color });

/** Klaviatur: weiße und dunkle Tasten auf der Insel (Kulisse, flach). */
function keys(x0, x1, z0, z1, y) {
  const out = [];
  const n = Math.round((z0 - z1) / 1.2);
  for (let i = 0; i < n; i++) {
    const z = z0 - 0.6 - i * 1.2;
    out.push({ type: 'platform', pos: [(x0 + x1) / 2, y - 0.02, z], size: [x1 - x0 - 0.2, 0.08, 1.1], color: 0xfaf6ff });
    if (i % 7 !== 2 && i % 7 !== 6 && i < n - 1) out.push({ type: 'platform', pos: [x0 + (x1 - x0) * 0.32, y + 0.04, z - 0.6], size: [(x1 - x0) * 0.62, 0.1, 0.55], color: 0x2a2048 });
  }
  return out;
}

/** Ferne Kulisse (Planeten, ohne Sonnenschatten). */
const FAR = [
  { type: 'deco_w2', items: [
    { kind: 'planet', pos: [-34, -14, -30], radius: 7, color: 'orange' },
    { kind: 'planet', pos: [38, 4, -80], radius: 4, color: 'blue', ring: false },
    { kind: 'planet', pos: [-40, 10, -150], radius: 5, color: 'violet' },
    { kind: 'planet', pos: [30, -18, -190], radius: 8, color: 'green' },
  ] },
];

export const LEVEL = {
  id: '2-2',
  world: 2,
  title: 'Sternenklavier',
  archetype: 'parcours',
  theme: 'space',
  music: 'course_space',
  timeLimit: 400,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -12,
  camera: [
    { ...CAM, from: 12, to: -22 },
    { ...CAM, from: -22, to: -46, pitch: 46 },
    { ...CAM, from: -46, to: -66 },
    { ...CAM, from: -66, to: -94, pitch: 42, dist: 14 },
    { ...CAM, from: -94, to: -134 },
    { ...CAM, from: -134, to: -172, yaw: -6 },
    { ...CAM, from: -172, to: -210, pitch: 42 },
    // Stempel-Raum (abseits)
    { from: -4, to: -28, pitch: 50, dist: 12.5, fov: 40, x: 80, xLock: 0.7, area: [62, 100] },
  ],
  segments: [
    // =============================================================== 1  Start
    fl(-8, 8, 8, -9.4, Y, { h: 3 }),
    { type: 'taststein', id: 'ts_start', pos: [0, Y, -7.6], rise: 3.4, note: 0 },
    fl(-8, 8, -9, -22, 5, { h: 3 }),
    // Schwebeplattformen zum Antippen: links (Münzkranz oben), rechts über der Röhre zum Stempel-Raum
    fl(-6.6, -4.4, -14.4, -16.8, 5.9, { h: 0.9, under: 0, top: 'stone' }),
    { type: 'antipp', id: 'schwebe_l', pos: [-5.5, 5.9, -15.6], size: [2.6, 0.5, 2.6], mode: 'lift', length: 2.6, color: 'cyan' },
    { type: 'pipe', id: 'p_stempel', pos: [5.5, 5, -15.6], height: 0.9, radius: 0.8, target: 'p_raum' },
    { type: 'antipp', id: 'schwebe_r', pos: [5.5, 5.9, -15.6], size: [2.6, 0.5, 2.6], mode: 'lift', length: 2.4, color: 'pink' },
    { type: 'sign', pos: [-3.4, Y, -2.4], text: 'Tastenstein:\ndrauftreten!' },
    { type: 'deco_w1', items: [
      { kind: 'crystals', pos: [-6.6, Y, 5.6], size: 1.1, color: 'violet' },
      { kind: 'crystals', pos: [6.8, Y, -6.6], size: 0.8, color: 'cyan' },
      { kind: 'crystals', pos: [6.6, 5, -20.6], size: 0.9, color: 'pink' },
      { kind: 'fireflies', pos: [0, Y, 0], size: [16, 4, 16], n: 12, colors: [0xfff6c8, 0xc8e8ff, 0xffd0f0] },
    ] },

    // =============================================================== 2  Antipp-Plattformen
    { type: 'sign', pos: [-4.4, 5, -20.4], text: 'Antippen!' },
    { type: 'antipp', id: 'ap1', pos: [0, 4.5, -25.3], size: [2.6, 0.5, 2.6], mode: 'appear' },
    { type: 'antipp', id: 'ap2', pos: [2.6, 4.5, -30], size: [2.6, 0.5, 2.6], mode: 'appear', color: 'yellow' },
    fl(-6.2, -3.8, -33.8, -36.2, 5, { h: 1.6, under: 2, top: 'stone' }),
    { type: 'antipp', id: 'ap3', pos: [-5, 4.5, -35], size: [2.6, 0.5, 2.4], mode: 'slide', dir: [1, 0], length: 4.2, color: 'pink' },
    { type: 'antipp', id: 'ap4', pos: [0.4, 4.5, -40], size: [2.6, 0.5, 2.6], mode: 'appear', time: 5, color: 'yellow' },
    { type: 'antipp', id: 'ap5', pos: [0, 3.2, -44.4], size: [2.6, 0.5, 2.6], mode: 'lift', length: 2.6 },

    // =============================================================== 3  Kristallwand und Checkpoint
    fl(-10, 8, -46, -66, 6.5, { h: 3 }),
    // Kristallstufen hinauf (2 m je Stufe)
    step(1.6, -58.6, 8.5, 'cyan', 3.6, 3, 6.5),
    step(-0.8, -61.9, 10.5, 'violet', 4, 3.2, 6.5),
    step(1.2, -65, 12.5, 'pink', 5, 3.2, 6.5),
    fl(-10, 8, -66, -78, 12.5, { h: 3 }),
    // Kamin aus zwei Kristallwänden (links): Wandsprung hinauf zu Stern 0
    { type: 'wall', pos: [-9.2, 6.5, -58.6], size: [1, 7.6, 5], style: 0x8a6ae0 },
    { type: 'wall', pos: [-5.9, 6.5, -58.6], size: [0.8, 10, 5], style: 0x9a7af0 },
    fl(-12.4, -8.7, -56.4, -60.8, 14.1, { h: 1.4, under: 2, top: 'stone' }),
    { type: 'wall', pos: [-12.2, 14.1, -58.6], size: [0.4, 0.8, 4.4], style: 0x9a7af0 },
    // steigende Propellerplattform hinauf zum Warp-Sims
    { type: 'propellerplattform', id: 'pp_lift', pos: [0, 12.1, -79.6], size: [3, 3], mode: 'rise', height: 6, climb: 1.8 },
    fl(-4, 4, -81.4, -89, 18.6, { h: 2, under: 3, top: 'stone' }),
    { type: 'deco_w1', items: [
      { kind: 'crystals', pos: [-7.6, 6.5, -49], size: 1.2, color: 'violet' },
      { kind: 'crystals', pos: [6.8, 6.5, -52], size: 0.9, color: 'cyan' },
      { kind: 'crystals', pos: [-10.2, 14.1, -57], size: 0.7, color: 'pink' },
      { kind: 'crystals', pos: [6.4, 12.5, -76.4], size: 1, color: 'gold' },
      { kind: 'crystals', pos: [-8.4, 12.5, -70], size: 1.1, color: 'cyan' },
      { kind: 'crystals', pos: [3, 18.6, -87.8], size: 0.8, color: 'violet' },
    ] },

    // =============================================================== 5  Plattformnetz
    fl(-6, 6, -100, -110, Y, { h: 3 }),
    // Hauptweg: Pendel-Propeller → Insel F → sinkende und schwebende Propellerplattform → Insel G
    { type: 'propellerplattform', id: 'pp1', pos: [0, 0.6, -112.6], mode: 'path', path: [[0, 0.6, -112.6], [0, 0.6, -120.4]], speed: 2.2, wait: 0.8 },
    fl(-4, 6, -122.4, -132, Y, { h: 3 }),
    { type: 'propellerplattform', id: 'pp2', pos: [1, 0.6, -135.4], mode: 'sink', sink: 0.7, drop: 4 },
    { type: 'propellerplattform', id: 'pp3', pos: [-1, 0.6, -139.6], mode: 'float' },
    // Sternensteg links (Münzmarder flieht hier entlang): kleine Inseln mit Lücken
    fl(-13, -6, -101, -110, Y, { h: 2 }),
    fl(-13, -9, -110, -118, Y, { h: 2 }),
    fl(-13, -9, -120.2, -127, Y, { h: 2 }),
    fl(-13, -9, -129.2, -135, Y, { h: 2 }),
    fl(-13, -9, -137.2, -143, Y, { h: 2 }),
    // Abzweig rechts: Pendel-Propeller zur Wolkenkanone, Münzhimmel hoch oben
    { type: 'propellerplattform', id: 'pp_k', pos: [8.8, 0.6, -127.2], mode: 'path', path: [[8.8, 0.6, -127.2], [14.4, 0.6, -127.2]], speed: 1.8, wait: 1 },
    fl(16, 21, -124.4, -130.4, Y, { h: 2 }),
    { type: 'cloudcannon', pos: [18.6, Y, -127.6], target: [16, 24.4, -134] },
    { type: 'cloud', pos: [16, 23.8, -134], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [14, 23.8, -139.4], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [11, 23.8, -144.6], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [8, 23.8, -149.8], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [5, 23.8, -155], size: [3.4, 0.6, 3.4] },
    // Insel G und Schnappblumen-Insel H
    fl(-13, 8, -143.4, -156, Y, { h: 3 }),
    fl(-8, 8, -156, -172, Y, { h: 3 }),
    { type: 'deco_w1', items: [
      { kind: 'crystals', pos: [-4.6, Y, -102], size: 0.9, color: 'cyan' },
      { kind: 'crystals', pos: [4.6, Y, -130.6], size: 0.8, color: 'violet' },
      { kind: 'crystals', pos: [19.6, Y, -129.4], size: 0.7, color: 'pink' },
      { kind: 'crystals', pos: [6.6, Y, -146], size: 1, color: 'gold' },
      { kind: 'crystals', pos: [-6.6, Y, -170.4], size: 1.1, color: 'violet' },
      { kind: 'fireflies', pos: [10, 23.8, -144], size: [12, 3, 24], n: 10, colors: [0xfff6c8, 0xc8e8ff] },
    ] },

    // =============================================================== 6  Ziel: Klaviatur mit Tastenstein-Treppe
    fl(-4, 4, -172, -184, Y, { h: 2.4 }),
    ...keys(-4, 4, -172, -184, Y),
    { type: 'taststeine', id: 'treppe', speed: 3,
      stones: [{ pos: [0, Y, -176.4], rise: 0.9, note: 0 }, { pos: [0, Y, -179.6], rise: 2.3, note: 2 }, { pos: [0, Y, -182.8], rise: 3.6, note: 4 }],
      onAll: { coins: 5 } },
    // Zielinsel mit drei Kristallplatten im Boden (darunter Mulden; unter der dritten Stern 2)
    fl(-9, 3.6, -184, -204, 5.6, { h: 5 }),
    fl(6.4, 9, -184, -204, 5.6, { h: 5 }),
    fl(3.6, 6.4, -184, -186.6, 5.6, { h: 5 }),
    fl(3.6, 6.4, -189.4, -190.4, 5.6, { h: 3 }),
    fl(3.6, 6.4, -193.2, -194.2, 5.6, { h: 3 }),
    fl(3.6, 6.4, -197, -204, 5.6, { h: 5 }),
    fl(3.6, 6.4, -186.6, -197, 3.9, { h: 1.3, under: 0, top: 'stone' }),
    { type: 'kristallwand', id: 'kp1', pos: [5, 5, -188], size: [2.8, 0.6, 2.8], color: 'cyan' },
    { type: 'kristallwand', id: 'kp2', pos: [5, 5, -191.8], size: [2.8, 0.6, 2.8], color: 'violet' },
    { type: 'kristallwand', id: 'kp3', pos: [5, 5, -195.6], size: [2.8, 0.6, 2.8], color: 'pink' },
    { type: 'deco_w1', items: [
      { kind: 'crystals', pos: [-7.6, 5.6, -186], size: 1, color: 'gold' },
      { kind: 'crystals', pos: [-7.4, 5.6, -202], size: 1.2, color: 'cyan' },
      { kind: 'bunting', from: [-6, 9.6, -201.6], to: [6, 9.6, -201.6], sag: 0.8 },
    ] },

    // =============================================================== Stempel-Raum (abseits bei x ≈ 80)
    { type: 'room', pos: [80, Y, -15], size: [14, 6, 12], top: 'stone', style: 0x6a54b8 },
    { type: 'pipe', id: 'p_raum', pos: [74.5, Y, -11], height: 1.2 },
    { type: 'pipe', id: 'p_raum_aus', pos: [85.5, Y, -11], height: 1.2, target: [-3, 5.4, -20] },
    step(84.4, -18.6, 2.6, 'violet', 2.4, 2.4),
  ],
  blocks: [
    { kind: 'question', pos: [-2.6, 7.4, -13], content: 'wachstumsbeere' },
  ],
  enemies: [
    // 1: obere Startinsel
    { kind: 'schnappblume', pos: [-3.6, 5, -19.4], base: 'pot' },
    { kind: 'rollpilz', id: 'rp1', pos: [0, 5, -16.4], path: [[-2.4, 5, -16.4], [2.6, 5, -16.4]] },
    // 3
    { kind: 'pilzling', id: 'mini1', mini: true, pos: [-2, 6.5, -50], path: [[-5, 6.5, -50], [3, 6.5, -50]] },
    { kind: 'pilzling', id: 'mini2', mini: true, pos: [3, 6.5, -54.4], behavior: 'chase', sight: 5 },
    { kind: 'rollpilz', id: 'rp2', pos: [2, 12.5, -72], path: [[-3, 12.5, -72], [4, 12.5, -72]] },
    // 5
    { kind: 'muenzmarder', id: 'marder', path: [[-10.4, Y, -104], [-10.6, Y, -116], [-11, Y, -124], [-11, Y, -132], [-11, Y, -140], [-8, Y, -149], [-1, Y, -151], [5, Y, -147]], coins: 30, sight: 6, speed: 6, lead: 10 },
    { kind: 'pilzling', id: 'mini3', mini: true, pos: [1, Y, -126], path: [[-2.4, Y, -126], [4.4, Y, -126]] },
    { kind: 'pilzling', id: 'mini4', mini: true, pos: [2, Y, -148], behavior: 'chase', sight: 5 },
    // Schnappblumen-Feld
    { kind: 'schnappblume', pos: [-3.6, Y, -160], base: 'pot' },
    { kind: 'schnappblume', pos: [3.6, Y, -162], base: 'pot' },
    { kind: 'schnappblume', pos: [4.6, Y, -168.6], base: 'pot' },
    // Stempel-Raum: zwei Rollpilze
    { kind: 'rollpilz', id: 'rp_raum1', pos: [78, Y, -16], path: [[76, Y, -16], [82, Y, -16]] },
    { kind: 'rollpilz', id: 'rp_raum2', pos: [80, Y, -19], dir: [-1, 0] },
  ],
  items: [
    // 1
    line([0, 1.4, 2.4], [0, 1.4, -3.6], 3),
    ...column(0, -7.6, 3, 5.4, 3),
    ...column(-5.5, -15.6, 10.4, 12.2, 3),
    // 2
    ...arc([0, 5.4, -22.4], [0, 5.4, -25.3], 2, 0.5),
    ...arc([0, 5.4, -25.3], [2.6, 5.4, -30], 3, 1),
    ...arc([2.6, 5.4, -30], [-0.8, 5.4, -35], 3, 1),
    ...arc([-0.8, 5.4, -35], [0.4, 5.4, -40], 3, 1),
    { kind: 'antipp_muenze', pos: [-6, 6.4, -27] }, { kind: 'antipp_muenze', pos: [7, 6.8, -33] },
    { kind: 'antipp_muenze', pos: [-7, 7.2, -41] }, { kind: 'antipp_muenze', pos: [6.4, 4.8, -43] },
    // 3
    line([0, 6.9, -47.4], [0, 6.9, -54], 3),
    { kind: 'coin', pos: [1.6, 9, -58.6] }, { kind: 'coin', pos: [-0.8, 11, -61.9] }, { kind: 'coin', pos: [1.2, 13, -65] },
    ...column(-7.5, -58.6, 8.6, 12.6, 3),
    { kind: 'antipp_block', pos: [5.6, 6.5, -49.4], content: 'coins:3', look: 'question' },
    { kind: 'antipp_block', pos: [3, 9, -50.6], content: 'coins:5', look: 'question' },
    { kind: 'antipp_block', pos: [-6.4, 12.5, -68], content: 'coins:2', look: 'question' },
    // Kristallblock mit Geheimnis: oben stampfen → Truhe mit Extraleben
    { kind: 'kristallwand', id: 'kw_geheim', pos: [-5.4, 12.5, -74.4], size: [2.4, 2, 2.4], color: 'violet', onBreak: { reveal: 'truhe_1up' } },
    { kind: 'chest', id: 'truhe_1up', hidden: true, pos: [-5.4, 12.5, -74.4], content: 'oneup' },
    ...column(0, -79.6, 13.6, 18, 3),
    // 5
    line([0, 1.4, -102], [0, 1.4, -108], 3),
    line([0, 1.5, -113], [0, 1.5, -120], 3),
    line([-10.6, 1.4, -107], [-11, 1.4, -142], 9),
    line([1, 1.5, -135.4], [-1, 1.5, -139.6], 2),
    ...arc([9.4, 1.6, -127.2], [14.2, 1.6, -127.2], 3, 1),
    // Münzhimmel
    line([16, 24.8, -132.6], [5, 24.8, -156], 12),
    ring([5, 25.6, -155], 2, 6),
    // Schnappblumen-Feld
    line([0, 1.4, -158], [0, 1.4, -170], 5),
    // 6
    line([0, 6.2, -186], [0, 6.2, -194], 4),
    // Mulden unter den Kristallplatten
    line([4.4, 4.3, -188], [5.6, 4.3, -188], 2),
    line([4.4, 4.3, -191.8], [5.6, 4.3, -191.8], 2),
    // Stempel-Raum
    ...arc([77, 1.3, -14], [84.4, 2.9, -18.6], 4, 1.6),
    ...setupHook((level) => { shadowless(level, FAR); farHide(level, ['schnappblume', 'rollpilz', 'pilzling', 'muenzmarder'], 40); }, [0, -1, -16]),
  ],
  checkpoint: { pos: [0, 12.5, -69.4], yaw: Math.PI / 2 },
  stars: [
    [-9.8, 14.6, -58.6],        // 0: oben auf dem Kristall-Kamin (Wandsprung)
    [5, 24.8, -155],            // 1: Ende des Münzhimmels (Wolkenkanone)
    [5, 4.3, -195.6],           // 2: unter der dritten Kristallplatte
  ],
  stamp: [84.4, 3.2, -18.6],
  goal: { pos: [0, 5.6, -198], height: 9 },
  marks: {
    start: [0, Y, 5],
    stone: [0, Y, -7.6],
    upper: [0, 5, -12],
    lift_r: [5.5, 5, -15.6],
    s2: [0, 5, -21],
    s3: [0, 6.5, -47],
    chimney: [-7.5, 6.5, -58.6],
    cp: [0, 12.5, -69.4],
    secret: [-5.4, 12.5, -74.4],
    lift: [0, 12.5, -79.6],
    warp: [0, 18.6, -85],
    s5: [0, Y, -104],
    cannon: [18.6, Y, -127.6],
    field: [0, Y, -157],
    keys: [0, Y, -173],
    goal: [0, 5.6, -192],
    room: [74.5, 2.2, -11],
  },
};

// Warp-Box (Bauplan 2-2 Abschnitt 4): auf dem Sims nach der steigenden Propellerplattform → Plattformnetz
LEVEL.items.push(
  { kind: 'warpbox', id: 'wb1', pos: [0, 18.6, -85.4], target: [2.4, Y + 0.2, -104.4] },
);
