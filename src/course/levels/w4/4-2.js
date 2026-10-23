// 4-2 „Das Lila Nebelmoor“ – Giftwald im Dämmerlicht (Welt 4, Bauplan: Detail 4-2). Kernidee: Rankenschnapper wachsen
// aus dem Giftsumpf über den Weg und ziehen sich zurück – ihr Rankenkörper ist begehbar (Stufen), vom Kopf prallt man ab,
// Stampfen auf den Kopf besiegt sie. Parcours nach −Z, ≈ 260 m, Thema poison, Musik course_poison, 400 s.
//
// Abschnitte (Y = 1 Weghöhe, Giftspiegel PY = 0,2, +X = rechts im Bild):
//   1  Giftpfad      z  10 … −58   gewundener Moospfad durch den lila Giftsumpf (Sumpfhütte auf Stelzen, Nebelschwaden,
//                                  Libellen, Giftpilze); Rankenschnapper wachsen im Takt quer über den Weg; ?-Blöcke mit
//                                  Funkenblüte; rechts eine Röhre, auf der ein Rankenschnapper liegt (Kopf besiegen →
//                                  Röhre frei → Moorkeller mit Extraleben).
//   2  Höhle         z −58 … −100  dunkle Grotte (Leuchtkristalle, Tropfsteine, Glühwürmchen): Rankenschnapper hängen
//                                  von Felsvorsprüngen; rechts ein Giftbecken mit **vier Rankenschnappern als Stufen**
//                                  hinauf zum Sims mit der **Warp-Box zwischen zwei hängenden Rankenschnappern** →
//                                  Sternkammer (**Stern 0**).
//   3  Rückkehr      z −100 … −130 Checkpoint, dann die schmale Brücke, über die der **große Rankenschnapper** wächst
//                                  (drei Treffer).
//   4  Wasserzone    z −130 … −182 klarer Moorsee (türkis, sicher): Inseln, Rankenschnapper wachsen aus dem Wasser quer
//                                  über die Sprünge; **Stern 1 ganz unten im See**; daneben ein Rankenschnapper im Wasser –
//                                  **vom Kopf abprallen** → versteckter Münzpfad über Felssimse zum **Stempel**;
//                                  **Röhre hinauf** zum Oberland.
//   5  Plattformfahrt z −182 … −262 Oberland mit dem **Roulette-Block**; bewegliche Plattformen über Gift (Brummer),
//                                  Sternring-Insel (**Stern 2**: acht Sternmünzen in 10 s), **Röhre zum Ziel** → Zielinsel.
// Welt-Warp: Mit dem Krallen-Anzug (Roulette-Block) die bewachsene Felswand links hinauf → versteckte Plattform →
// zwei fahrende Plattformen → Sims am Giftwasserfall; hinter dem Vorhang die Röhre nach Welt 5 (warpWorld: 5).
// Gegner: Rankenschnapper 26, Brummer 3.

import {
  isl, rock, wallBox, line, ring, arc, column, levelSetupLate, cullStatic, areaMoods, cullInstances, creeperInstances,
  fogBanks, dragonflies, lilies, reeds, logs, swampHut, frogs, fireflies, glowCrystals, stalactites, tintWater, gegnerSicht,
  chunkBackdrop, heroShadowDiet, rockLids,
} from './_helpers_a.js';

const Y = 1;
const PY = 0.2;           // Giftspiegel
const W = 0;              // Seespiegel (Wasserzone)
const U = 5;              // Oberland (Plattformfahrt)
const CAM = { pitch: 44, dist: 13, fov: 40 };
const ROCK = 0x5c4c6c;    // Felsfarbe der Überhänge (wie die Höhlenwände)

export const M42 = {
  PIPE_BLOCK: { x: 10, z: -48, top: Y + 1.3 },
  POOL: { x0: 1, x1: 10.5, z0: -70, z1: -88 },              // Giftbecken in der Höhle
  STEPS: [-74.4, -76.5, -78.6, -80.7],                      // z der vier Stufen-Ranken (waagerecht entlang +X)
  STEP_TOPS: [Y + 1.2, Y + 2.5, Y + 3.8, Y + 5.1],
  STEP_X: [3.0, 7.4],                                       // waagerechtes Stück der Stufen von x … bis x
  SHELF: { x0: 2.2, x1: 10.5, z0: -82.4, z1: -88, top: Y + 6.2 },
  BOX: [6.2, Y + 6.2, -85.4],
  KAMMER: { x0: 62, x1: 78, z0: -68, z1: -88 },
  KELLER: { x0: 62, x1: 76, z0: -36, z1: -50 },
  LAKE: { x0: -12, x1: 12, z0: -130, z1: -180, bottom: W - 6 },
  ISLET: { x0: 7.6, x1: 9.9, z0: -140.8, z1: -143.6, top: W + 0.6 },   // Inselchen neben dem Abprall-Schnapper
  BOUNCE: { x: 10.7, z: -140.6 },                                       // Wurzel des Abprall-Schnappers (Kopf bei z ≈ −143,2)
  LEDGES: [{ x0: 9.6, x1: 12, z0: -144.3, z1: -148.3, top: W + 5.1 }, { x0: 9.4, x1: 12, z0: -150.6, z1: -153.6, top: W + 6.1 }, { x0: 8.8, x1: 12, z0: -156.4, z1: -160.4, top: W + 7.1 }],
  UP: { x0: -8, x1: 8, z0: -182, z1: -192, top: U },
  HIDDEN: { x0: -14, x1: -8.4, z0: -183, z1: -190, top: U + 7 },
  WARP: { x0: -40, x1: -28.6, z0: -182.5, z1: -190.5, top: U + 7, face: -30.4 },
  FINAL: { x0: -10, x1: 6, z0: -229, z1: -238, top: U },
  GOAL: { x0: -10, x1: 10, z0: -246, z1: -264, top: U + 3.5 },
};
const { PIPE_BLOCK, POOL, STEPS, STEP_TOPS, STEP_X, SHELF, BOX, KAMMER, KELLER, LAKE, ISLET, BOUNCE, LEDGES, UP, HIDDEN, WARP, FINAL, GOAL } = M42;

const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.8, 0.95], yaw: o.yaw ?? 0 });
/** Rankenschnapper quer über den Weg (Zyklus). */
const creeper = (id, x, y, z, dir, length, o = {}) => ({ kind: 'rankenschnapper', id, pos: [x, y, z], dir, length, ...o });
/**
 * Stufen-Ranke (fest, Maßstab size): Wurzel im Becken am linken Rand (x = STEP_X[0] − 0,9·size), steigt senkrecht auf,
 * dann waagerecht nach +X bis STEP_X[1]; Oberkante des begehbaren Stücks top, Kopf blickt zur rechten Höhlenwand.
 */
const SZ = 1.5;
const stepVine = (id, z, top) => {
  const x0 = STEP_X[0] - 0.9 * SZ, h = top - 0.16 * SZ - PY, rest = STEP_X[1] - STEP_X[0];
  return { kind: 'rankenschnapper', id, pos: [x0, PY, z], dir: [1, 0], height: h, length: h + 0.25 * SZ + rest, size: SZ, mode: 'static' };
};

/** Level-Haken: Kulisse, Stimmungen, sparsame Darstellung. */
function setup(level) {
  rockLids(level, { top: 0x74648a, side: 0x55475f });   // Moorfels-Oberseiten (top 'none' zeichnet keine)
  areaMoods(level, {
    hoehle: { fog: { color: 0x241a38, near: 12, far: 70 }, background: 0x1a1228, hemi: { sky: 0x9a8acc, ground: 0x2a3a2a, intensity: 0.78 }, sun: { color: 0xb8e8aa, intensity: 1.0 }, dome: 0x3a2a5a },
    kammer: { fog: { color: 0x1e1a3a, near: 12, far: 60 }, background: 0x141028, hemi: { sky: 0xa8a0ff, ground: 0x2a2a4a, intensity: 0.85 }, sun: { color: 0xc8f0ff, intensity: 1.1 }, dome: 0x2a2a5a },
  }, [
    { min: [-14, -100], max: [16, -59], mood: 'hoehle' },
    { min: [55, -95], max: [90, -60], mood: 'kammer' },
    { min: [55, -58], max: [90, -28], mood: 'kammer' },
  ]);

  // ---------------- 1 Giftpfad: Hütte, Stämme, Schilf, Nebel, Libellen
  swampHut(level, -11.6, PY - 0.4, 3.6, { deck: Y + 0.4, yaw: 0.35 });
  logs(level, [[8.4, Y, 4.6, 2.6, 0.4, 0.38], [-7.2, Y, -18.6, 2.2, 1.2, 0.34], [5.4, Y, -50.4, 2.4, -0.3, 0.36], [-3.6, Y, -105.6, 2.4, 0.2, 0.36]], { solid: true });
  reeds(level, [
    [6.4, PY, 8.2, 6, 1.7], [-6.6, PY, -4.4, 5, 1.5], [2.4, PY, -12.6, 4, 1.4], [-10, PY, -22, 6, 1.6], [-4.6, PY, -29.2, 4, 1.3],
    [5.4, PY, -33.4, 5, 1.6], [0.6, PY, -42.4, 4, 1.4], [7.6, PY, -44, 5, 1.6], [-6, PY, -52.6, 6, 1.7], [2.6, PY, -56.4, 4, 1.4],
    [-3, PY, -110, 5, 1.5], [3, PY, -118, 5, 1.6], [-3.2, PY, -122.6, 4, 1.4], [4, PY, -200, 5, 1.6], [-7, PY, -214, 6, 1.7],
  ]);
  fogBanks(level, [
    { pos: [0, PY + 0.25, -25], size: [36, 60], n: 26, scale: 5, drift: [0.22, 0.05] },
    { pos: [0, PY + 0.25, -116], size: [28, 20], n: 10, scale: 4.5, drift: [-0.2, 0] },
    { pos: [0, PY + 0.3, -212], size: [34, 44], n: 20, scale: 5, drift: [0.18, -0.04] },
    { pos: [-24, PY + 0.3, -188], size: [24, 22], n: 8, scale: 5, drift: [0.15, 0] },
  ]);
  dragonflies(level, [
    { pos: [4, Y + 1.6, 2], r: 2.4 }, { pos: [-4.6, Y + 1.8, -24], r: 2 }, { pos: [6, Y + 1.4, -38], r: 2.6 }, { pos: [-2, W + 1.4, -140], r: 2.8 },
    { pos: [4, W + 1.2, -158], r: 2.2 }, { pos: [-6, W + 1.6, -170], r: 2.4 }, { pos: [2, U + 1.8, -210], r: 3 }, { pos: [-4, GOAL.top + 1.6, -252], r: 2.4 },
  ]);

  // ---------------- 2 Höhle: Kristalle, Tropfsteine, Glühwürmchen
  glowCrystals(level, [
    [-6.4, Y, -62, 1.2, 0x7ae8ff], [-6.5, Y, -79, 1.0, 0xd88aff], [0.6, Y, -66, 0.8, 0x9aff6a], [-6.3, Y, -94, 1.3, 0x7ae8ff],
    [9.8, SHELF.top, -87.2, 0.8, 0xd88aff], [3, SHELF.top, -87.4, 0.9, 0x7ae8ff], [0.8, Y, -97.4, 0.9, 0xd88aff],
    // Sternkammer
    [63, Y, -70, 1.4, 0x7ae8ff], [77, Y, -71, 1.2, 0xd88aff], [63.4, Y, -86, 1.1, 0x9aff6a], [76.6, Y, -86.4, 1.3, 0x7ae8ff],
    // Moorkeller
    [63, Y, -49, 1.0, 0x9aff6a], [75, Y, -49.2, 0.9, 0xd88aff],
  ]);
  stalactites(level, [
    [-6.2, Y + 12, -60, -3, 0.6], [-6.4, Y + 12, -76, -2.6, 0.5], [-5.8, Y + 12, -90, -3.4, 0.7], [0.6, Y + 12, -70, -2.2, 0.45],
    [10, Y + 12, -66, -2.8, 0.6], [10, Y + 12, -92, -3, 0.6], [-6.3, Y, -86, 1.2, 0.45], [0.7, Y, -59.6, 0.9, 0.4], [10, Y, -95, 1.3, 0.5],
  ]);
  fireflies(level, [
    { pos: [-2, Y + 1, -70], size: [10, 4, 20], n: 18 }, { pos: [4, Y + 2, -90], size: [10, 5, 16], n: 14 },
    { pos: [70, Y + 0.6, -78], size: [14, 4, 16], n: 18 }, { pos: [69, Y + 0.5, -43], size: [12, 3, 12], n: 10 },
    { pos: [0, W + 1, -150], size: [22, 3, 40], n: 16, }, { pos: [0, GOAL.top + 1, -254], size: [18, 3, 14], n: 12 },
  ], { color: 0xc8ff7a });

  // ---------------- 4 Wasserzone: klares Wasser, Seerosen, Frösche
  tintWater(level);
  lilies(level, [
    [-6, W, -138, 0.7, 1], [-4.6, W, -139.4, 0.5, 0], [8.6, W, -137, 0.8, 0xffffff], [-9, W, -150, 0.6, 1], [-7.8, W, -152, 0.55, 0],
    [4, W, -146, 0.6, 0], [9.4, W, -158, 0.7, 1], [-10, W, -166, 0.8, 0xffffff], [-3.4, W, -157, 0.5, 1], [7.6, W, -168, 0.6, 0],
    [-7, W, -176, 0.7, 1], [9.6, W, -176, 0.6, 0],
  ]);
  frogs(level, [[-6, W + 0.03, -138, -0.6, 1], [9.4, W + 0.03, -158, 2.4, 0.9], [-10, W + 0.03, -166, 0.4, 1.1], [4.4, U, -186.6, -1.2, 0.9]]);

  // ---------------- Budget
  creeperInstances(level, { far: 40 });
  chunkBackdrop(level, { far: 150, chunk: 96 });
  gegnerSicht(level, { brummer: { dist: 28, shadow: false } });
  heroShadowDiet(level, 0.16);
  cullInstances(level, { coin: { far: 40, radius: 0.8, shadow: false } });
}

export const LEVEL = {
  id: '4-2',
  world: 4,
  title: 'Das Lila Nebelmoor',
  archetype: 'parcours',
  theme: 'poison',
  music: 'course_poison',
  timeLimit: 400,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  killY: -12,
  setup: levelSetupLate(setup, (level) => {
    cullStatic(level);
  }),
  camera: [
    { ...CAM, from: 14, to: -58 },
    { ...CAM, from: -58, to: -100, pitch: 46, dist: 12.5 },
    { ...CAM, from: -100, to: -128, pitch: 45 },
    { ...CAM, from: -128, to: -180, pitch: 47, dist: 13.5 },
    { ...CAM, from: -180, to: -192, pitch: 44, area: [-12.5, 50] },
    { ...CAM, from: -192, to: -240, pitch: 46, dist: 13.5, area: [-12.5, 50] },
    { ...CAM, from: -244, to: -266, pitch: 42, dist: 13 },
    { ...CAM, from: -178, to: -196, pitch: 40, dist: 13, yaw: 64, area: [-46, -12.5] },
    { ...CAM, from: -60, to: -96, pitch: 48, dist: 13, area: [55, 90] },
    { ...CAM, from: -30, to: -56, pitch: 48, dist: 13, area: [55, 90] },
  ],
  segments: [
    // =============================================================== Kulisse: Giftbäume auf Schlamminseln (ohne Schatten in der Ferne)
    { type: 'deco_w4', shadow: false, items: [
      { kind: 'giftbaeume', pos: [-24, PY, -40], size: [10, 70], n: 7, scale: [1, 1.5] },
      { kind: 'giftbaeume', pos: [24, PY, -60], size: [10, 90], n: 8, scale: [1, 1.5] },
      { kind: 'giftbaeume', pos: [-26, PY, -150], size: [10, 70], n: 6, scale: [1, 1.5] },
      { kind: 'giftbaeume', pos: [26, PY, -200], size: [10, 70], n: 6, scale: [1, 1.5] },
    ] },

    // =============================================================== 1  Giftpfad
    { type: 'giftwasser', id: 'sumpf', pos: [0, PY - 1.4, -24], size: [48, 1.4, 82], flow: [0.25, 0.08] },
    isl(-6, 6, 10, -6, Y, 4),
    sign(-4, Y, 7.6, 'Das Lila\nNebelmoor', { size: [2.6, 1.1] }),
    isl(-1.6, 1.6, -6, -14, Y, 4),
    isl(-9, 1.6, -14, -21, Y, 4),
    isl(-9, -5.8, -21, -31, Y, 4),
    isl(-9, 4.6, -31, -37, Y, 4),
    isl(1.4, 4.6, -37, -44, Y, 4),
    isl(-5, 6.5, -44, -52, Y, 4),
    isl(-1.6, 1.6, -52, -58, Y, 4),
    isl(8, 12, -45.5, -50.5, Y, 4),
    { type: 'pipe', id: 'p_keller_ein', pos: [PIPE_BLOCK.x, Y, PIPE_BLOCK.z], height: PIPE_BLOCK.top - Y, target: 'p_keller', color: 'purple' },
    sign(-0.4, Y, -2.6, 'Ranken sind\nbegehbar!', { size: [2.4, 0.9] }),
    { type: 'deco_w4', items: [
      { kind: 'giftbaum', pos: [-5.2, Y, -3.4], height: 6.5 }, { kind: 'giftbaum', pos: [5.2, Y, 2.4], height: 5.5 },
      { kind: 'giftpilze', pos: [4.4, Y, 7.4], size: [2, 2], n: 3 }, { kind: 'leuchtpilze', pos: [-5, Y, -2.6], n: 5 },
      { kind: 'giftpilz', pos: [-7.8, Y, -16.2], height: 1.6 }, { kind: 'leuchtpilze', pos: [-8, Y, -35.6], n: 4 },
      { kind: 'giftpilz', pos: [5.4, Y, -45], height: 2.2 }, { kind: 'leuchtpilze', pos: [-4, Y, -51], n: 4 },
      { kind: 'sumpfgras', pos: [0, Y, 2], size: [10, 12], n: 10 }, { kind: 'sumpfgras', pos: [-4, Y, -34], size: [9, 4], n: 5 },
      { kind: 'sumpfgras', pos: [1, Y, -48], size: [10, 6], n: 6 }, { kind: 'giftbaum', pos: [11, Y, -46.4], height: 5 },
      { kind: 'liane', pos: [-3.2, Y + 6.2, 6.8], length: 2.6 },
    ] },

    // =============================================================== 2  Höhle
    rock(-12, -7, -58, -100, Y + 12, 16),
    rock(10.5, 15, -58, -100, Y + 12, 16),
    isl(-7, POOL.x0, -58, -100, Y, 5),
    isl(POOL.x0, POOL.x1, -58, POOL.z0, Y, 5),
    isl(POOL.x0, POOL.x1, POOL.z1, -100, Y, 5),
    rock(POOL.x0, POOL.x1, POOL.z0, POOL.z1, PY - 0.8, 4),
    { type: 'giftwasser', id: 'becken', pos: [(POOL.x0 + POOL.x1) / 2, PY - 0.8, (POOL.z0 + POOL.z1) / 2], size: [POOL.x1 - POOL.x0, 0.8, POOL.z0 - POOL.z1], flow: [0, -0.1], color: 'gruen' },
    // Felsvorsprünge (hängende Rankenschnapper), Sims mit Warp-Box, Überhang darüber
    wallBox(-7, -4.4, -63.4, -65.6, Y + 5.4, 0.9, { camIgnore: true, style: ROCK }),
    wallBox(-7, -4.4, -83.4, -85.6, Y + 5.4, 0.9, { camIgnore: true, style: ROCK }),
    wallBox(-1.2, 1, -91.4, -93.6, Y + 5.6, 0.9, { camIgnore: true, style: ROCK }),
    wallBox(-7, -4.6, -73, -75, Y + 11.4, 1, { camIgnore: true, style: ROCK }),
    wallBox(8, 10.5, -94.6, -96.6, Y + 11.4, 1, { camIgnore: true, style: ROCK }),
    rock(SHELF.x0, SHELF.x1, SHELF.z0, SHELF.z1, SHELF.top, SHELF.top - PY + 0.8),
    wallBox(BOX[0] - 3, BOX[0] + 3, BOX[2] + 0.6, BOX[2] - 0.6, Y + 12.2, 0.8, { camIgnore: true, style: ROCK }),
    { type: 'deco_w4', items: [
      { kind: 'liane', pos: [-6.4, Y + 11.6, -61], length: 4 }, { kind: 'liane', pos: [9.8, Y + 11.6, -98], length: 3.6 },
      { kind: 'leuchtpilze', pos: [-5.6, Y, -71], n: 6 }, { kind: 'leuchtpilze', pos: [0, Y, -99], n: 5 },
      { kind: 'giftpilz', pos: [-6.2, Y, -88.6], height: 2.6 }, { kind: 'giftpilz', pos: [9.6, Y, -60.6], height: 2 },
    ] },
    sign(-3.4, Y, -60.6, 'Achtung,\nhängende Ranken!', { size: [2.6, 0.9] }),

    // =============================================================== 3  Rückkehr
    isl(-6, 6, -100, -108, Y, 4),
    { type: 'giftwasser', id: 'graben', pos: [0, PY - 1.4, -116], size: [32, 1.4, 18], flow: [-0.3, 0] },
    isl(-1.8, 1.8, -108, -124, Y, 4),
    isl(-6, 6, -124, -130, Y, 4),
    sign(3.6, Y, -106.6, 'Großer\nRankenschnapper!', { size: [2.4, 0.9] }),

    // =============================================================== 4  Wasserzone (klares Moorwasser, sicher)
    rock(LAKE.x0, LAKE.x1, LAKE.z0, LAKE.z1, LAKE.bottom, 3),
    { type: 'water', id: 'see', pos: [0, LAKE.bottom, (LAKE.z0 + LAKE.z1) / 2], size: [LAKE.x1 - LAKE.x0, W - LAKE.bottom, LAKE.z0 - LAKE.z1] },
    rock(-16, LAKE.x0, LAKE.z0 + 2, LAKE.z1, Y + 7, 14),
    rock(LAKE.x1, 16, LAKE.z0 + 2, LAKE.z1, Y + 8, 15),
    isl(-3, 3, -132, -136, W + 0.6, 6.6),
    isl(-8, -2.6, -139.6, -144.6, W + 0.6, 6.6),
    isl(0.8, 6, -148, -153, W + 0.6, 6.6),
    isl(ISLET.x0, ISLET.x1, ISLET.z0, ISLET.z1, ISLET.top, 6.6),
    isl(-6.4, -1, -157, -162, W + 0.6, 6.6),
    isl(-3, 6, -166.6, -180, W + 0.6, 6.6),
    ...LEDGES.map((l) => isl(l.x0, l.x1, l.z0, l.z1, l.top, l.top - LAKE.bottom)),
    { type: 'pipe', id: 'p_hinauf', pos: [2, W + 0.6, -175.4], height: 1.4, target: 'p_oben', color: 'purple' },
    sign(-1.2, W + 0.6, -172.6, 'Röhre\nhinauf', { size: [1.8, 0.8] }),
    { type: 'deco_w4', items: [
      { kind: 'giftbaum', pos: [-14, Y + 7, -140], height: 6 }, { kind: 'giftbaum', pos: [14, Y + 8, -170], height: 7 },
      { kind: 'leuchtpilze', pos: [-1, W + 0.6, -134.6], n: 3 }, { kind: 'leuchtpilze', pos: [4, W + 0.6, -177.6], n: 4 },
      { kind: 'sumpfgras', pos: [-4.4, W + 0.6, -142], size: [4, 4], n: 4 }, { kind: 'sumpfgras', pos: [3, W + 0.6, -151], size: [4, 4], n: 4 },
    ] },

    // =============================================================== 5  Oberland, Plattformfahrt, Ziel
    isl(UP.x0, UP.x1, UP.z0, UP.z1, UP.top, 9),
    { type: 'pipe', id: 'p_oben', pos: [3, U, -184.6], height: 1.2, color: 'purple' },
    // bewachsene Felswand links (Krallen-Anzug) und versteckte Plattform oben
    wallBox(-8.4, -8, -183.6, -189.4, U, HIDDEN.top - U, { climbable: true }),
    rock(-12.5, -8.4, -182, -192, HIDDEN.top - 0.01, HIDDEN.top - U + 4),
    isl(HIDDEN.x0, -8.4, HIDDEN.z0, HIDDEN.z1, HIDDEN.top, 1.2),
    // zwei fahrende Plattformen im gleichen Takt (gleiche Periode, versetzt): kommt die erste am fernen Ende an, wartet die
    // zweite schon am nahen Ende (Pfad der zweiten beginnt am fernen Ende, Phase knapp über 0)
    { type: 'mover', id: 'warp1', path: [[-15.8, HIDDEN.top - 0.5, -186.5], [-20.8, HIDDEN.top - 0.5, -186.5]], size: [3, 0.5, 3], speed: 1.8, wait: 0.8, color: 'purple' },
    { type: 'mover', id: 'warp2', path: [[-26.8, HIDDEN.top + 0.3, -186.5], [-23.8, HIDDEN.top + 0.3, -186.5]], size: [2.6, 0.5, 2.6], speed: 3 / (5 / 1.8), wait: 0.8, phase: 0.064, color: 'purple' },
    { type: 'giftwasser', id: 'warpsumpf', pos: [-27, PY - 1.4, -188], size: [30, 1.4, 22], flow: [0.2, 0] },
    // Sims am Giftwasserfall mit Nische und Welt-Warp-Röhre (hinter dem Vorhang)
    rock(WARP.x0, WARP.x1, WARP.z0, WARP.z1, WARP.top, WARP.top - PY + 1.4),
    rock(WARP.x0 - 2, WARP.x0 + 3.6, WARP.z0 + 1, WARP.z1 - 1, WARP.top + 9, 9),
    rock(WARP.x0 + 3.6, WARP.face, WARP.z0 + 1, -184.6, WARP.top + 9, 9),
    rock(WARP.x0 + 3.6, WARP.face, -188.4, WARP.z1 - 1, WARP.top + 9, 9),
    rock(WARP.x0 + 3.6, WARP.face, -184.6, -188.4, WARP.top + 9, 5.4),
    { type: 'giftfall', id: 'vorhang', pos: [WARP.face + 0.15, WARP.top, -186.5], width: 3.6, height: 9, yaw: Math.PI / 2, kill: false },
    { type: 'pipe', id: 'p_welt5', pos: [WARP.face - 2.8, WARP.top, -186.5], height: 1.2, target: [WARP.face - 2.8, WARP.top + 2.4, -186.5], warpWorld: 5, color: '#ffc21a' },
    { type: 'deco_w4', items: [
      { kind: 'giftwasserfall', pos: [WARP.x1 + 0.4, PY, -186.5], width: 3.2, height: WARP.top - PY, yaw: 0 },
    ] },
    // Plattformfahrt über Gift
    { type: 'giftwasser', id: 'giftsee', pos: [0, PY - 1.4, -214], size: [40, 1.4, 52], flow: [0.2, -0.1] },
    // Plattformen paarweise im Takt (gleiche Periode): mp2 wartet am Anschluss, wenn mp1 ankommt; ebenso mp4 für mp3
    { type: 'mover', id: 'mp1', path: [[0, U - 0.5, -195.4], [0, U - 0.5, -203.4]], size: [3, 0.5, 3], speed: 2.2, wait: 0.6, color: 'purple' },
    { type: 'mover', id: 'mp2', path: [[6.6, U - 0.5, -206.6], [0, U - 0.5, -206.6]], size: [3, 0.5, 3], speed: 6.6 / (8 / 2.2), wait: 0.6, phase: 0.037, color: 'purple' },
    isl(4.6, 10.4, -209.6, -214.4, U, 5),
    { type: 'mover', id: 'mp3', path: [[6.4, U - 0.5, -217.6], [-2.6, U + 0.6, -217.6]], size: [3, 0.5, 3], speed: 2, wait: 0.6, color: 'purple' },
    { type: 'mover', id: 'mp4', path: [[-5.6, U - 0.5, -227.4], [-5.6, U + 0.1, -220.6]], size: [3, 0.5, 3], speed: Math.hypot(0.6, 6.8) / (Math.hypot(9, 1.1) / 2), wait: 0.6, phase: 0.027, color: 'purple' },
    isl(FINAL.x0, FINAL.x1, FINAL.z0, FINAL.z1, FINAL.top, 5),
    { type: 'pipe', id: 'p_ziel', pos: [3, U, -235.6], height: 1.3, target: 'p_ziel_aus', color: 'purple' },
    sign(-0.2, U, -233.2, 'Zum Ziel', { size: [1.8, 0.7] }),
    isl(GOAL.x0, GOAL.x1, GOAL.z0, GOAL.z1, GOAL.top, 7),
    { type: 'pipe', id: 'p_ziel_aus', pos: [0, GOAL.top, -249.4], height: 1.2, color: 'purple' },
    { type: 'deco_w4', items: [
      { kind: 'giftbaum', pos: [-7.6, U, -189.6], height: 6 }, { kind: 'giftpilze', pos: [6, U, -190], size: [2, 2], n: 3 },
      { kind: 'leuchtpilze', pos: [-8, FINAL.top, -236], n: 5 }, { kind: 'giftbaum', pos: [5, FINAL.top, -231], height: 5 },
      { kind: 'giftbaum', pos: [-8, GOAL.top, -260], height: 7 }, { kind: 'giftbaum', pos: [8.4, GOAL.top, -251], height: 6 },
      { kind: 'leuchtpilze', pos: [7, GOAL.top, -261], n: 6 }, { kind: 'giftpilze', pos: [-7.4, GOAL.top, -250], size: [2.4, 2.4], n: 3 },
      { kind: 'sumpfgras', pos: [0, GOAL.top, -255], size: [16, 14], n: 10 },
    ] },

    // =============================================================== Sternkammer (Warp-Box) und Moorkeller (Röhre)
    isl(KAMMER.x0, KAMMER.x1, KAMMER.z0, KAMMER.z1, Y, 4),
    rock(KAMMER.x0 - 3, KAMMER.x1 + 3, KAMMER.z1, KAMMER.z1 - 3, Y + 7, 11),
    rock(KAMMER.x0 - 3, KAMMER.x0, KAMMER.z0, KAMMER.z1, Y + 7, 11),
    rock(KAMMER.x1, KAMMER.x1 + 3, KAMMER.z0, KAMMER.z1, Y + 7, 11),
    rock(68.4, 71.6, -80.4, -83.6, Y + 1.2, 1.2),
    { type: 'deco_w4', items: [
      { kind: 'giftpilz', pos: [64.4, Y, -83.6], height: 2.8 }, { kind: 'giftpilz', pos: [75.6, Y, -83.4], height: 2.2 },
      { kind: 'leuchtpilze', pos: [70, Y, -71], n: 6 }, { kind: 'liane', pos: [66, Y + 7, -86.4], length: 3 }, { kind: 'liane', pos: [74.4, Y + 7, -86.4], length: 3.6 },
    ] },
    isl(KELLER.x0, KELLER.x1, KELLER.z0, KELLER.z1, Y, 4),
    rock(KELLER.x0 - 3, KELLER.x1 + 3, KELLER.z1, KELLER.z1 - 3, Y + 6, 10),
    rock(KELLER.x0 - 3, KELLER.x0, KELLER.z0, KELLER.z1, Y + 6, 10),
    rock(KELLER.x1, KELLER.x1 + 3, KELLER.z0, KELLER.z1, Y + 6, 10),
    { type: 'pipe', id: 'p_keller', pos: [64.4, Y, -38.4], height: 1.2, color: 'purple' },
    { type: 'pipe', id: 'p_keller_aus', pos: [73.6, Y, -38.4], height: 1.2, target: [4.4, Y + 1, -48.6], color: 'purple' },
    sign(69, Y, -36.6, 'Moorkeller', { size: [2.2, 0.8] }),
    { type: 'deco_w4', items: [
      { kind: 'giftpilze', pos: [64, Y, -47], size: [2, 2], n: 3 }, { kind: 'leuchtpilze', pos: [74.4, Y, -47.4], n: 5 },
    ] },
  ],
  blocks: [
    // 1: Funkenblüte in Sichtweite des Starts, zweite auf I3
    { kind: 'brick', pos: [-1, Y + 2.4, -2.4], content: 'coins:2' },
    { kind: 'question', pos: [0, Y + 2.4, -2.4], content: 'funken' },
    { kind: 'brick', pos: [1, Y + 2.4, -2.4] },
    { kind: 'question', pos: [-2.2, Y + 2.4, -47.6], content: 'funken' },
    // 3: Wachstumsbeere am Checkpoint
    { kind: 'question', pos: [-3, Y + 2.4, -103.4], content: 'wachstumsbeere' },
    // 5: Roulette-Block im Oberland (Krallen-Anzug für die Felswand)
    { kind: 'roulette_block', id: 'roulette', pos: [-4.6, U + 2, -186.4], items: ['wachstumsbeere', 'krallen', 'funken', 'stern'] },
    { kind: 'brick', pos: [-3.6, U + 2, -186.4], content: 'coins:3' },
  ],
  enemies: [
    // ---------------- 1 Giftpfad (8)
    creeper('rs_c1', 5, PY, -10, [-1, 0], 8.6, { grow: { out: 1.4, hold: 2.2, back: 1.2, wait: 2.2 } }),
    creeper('rs_c2', -12.4, PY, -26, [1, 0], 8, { phase: 0.4 }),
    creeper('rs_c3', 8.2, PY, -40.6, [-1, 0], 8.2, { phase: 0.15 }),
    creeper('rs_c4', -8.6, PY, -47.2, [1, 0], 9, { phase: 0.55 }),
    creeper('rs_c5', 9.6, PY, -55, [-1, 0], 11, { phase: 0.8, grow: { out: 1.6, hold: 2.0, back: 1.4, wait: 2.4 } }),
    creeper('rs_roehre', 13.6, PY, PIPE_BLOCK.z, [-1, 0], 5.07, { height: 2.5, mode: 'static' }),
    creeper('rs_deko1', -12, PY, -7.6, [1, 0], 4.6, { mode: 'sense', sight: 6 }),
    creeper('rs_deko2', 10.4, PY, -24, [-1, 0], 4.8, { mode: 'sense', sight: 6 }),
    // ---------------- 2 Höhle (11): hängend, Stufen, Wächter der Warp-Box
    creeper('rs_h1', -5.6, Y + 5.4, -64.5, [1, 0], 4.2, { hang: true, height: 2.0, mode: 'sense', sight: 6 }),
    creeper('rs_h2', -5.6, Y + 5.4, -84.5, [1, 0], 4.2, { hang: true, height: 2.0, mode: 'sense', sight: 6 }),
    creeper('rs_h3', -0.1, Y + 5.6, -92.5, [-1, 0], 4.4, { hang: true, height: 2.2, mode: 'cycle', phase: 0.3 }),
    creeper('rs_h4', -5.8, Y + 11.4, -74, [1, 0], 5.6, { hang: true, height: 6, mode: 'cycle', phase: 0.7 }),
    creeper('rs_h5', 9.2, Y + 11.4, -95.6, [-1, 0], 6.4, { hang: true, height: 6.2, mode: 'cycle', phase: 0.1 }),
    stepVine('rs_stufe1', STEPS[0], STEP_TOPS[0]),
    stepVine('rs_stufe2', STEPS[1], STEP_TOPS[1]),
    stepVine('rs_stufe3', STEPS[2], STEP_TOPS[2]),
    stepVine('rs_stufe4', STEPS[3], STEP_TOPS[3]),
    creeper('rs_wache1', BOX[0] - 2.4, Y + 12.2, BOX[2], [0, 1], 3.05, { hang: true, height: 2.6, mode: 'sense', sight: 3.6 }),
    creeper('rs_wache2', BOX[0] + 2.4, Y + 12.2, BOX[2], [0, 1], 3.05, { hang: true, height: 2.6, mode: 'sense', sight: 3.6 }),
    // ---------------- 3 Rückkehr (2)
    creeper('rs_gross', -8.2, PY, -116.6, [1, 0], 8.4, { size: 1.7, hp: 3, grow: { out: 1.8, hold: 2.4, back: 1.6, wait: 2.6 } }),
    creeper('rs_r2', 8, PY, -110, [-1, 0], 4.6, { mode: 'sense', sight: 5 }),
    // ---------------- 4 Wasserzone (5)
    creeper('rs_w1', -9.8, W, -137.8, [1, 0], 8.6, { height: 1.7, phase: 0.2 }),
    creeper('rs_w2', -10, W, -146.4, [1, 0], 10.6, { height: 1.7, phase: 0.6 }),
    creeper('rs_w3', -10.2, W, -155, [1, 0], 9.2, { height: 1.7, phase: 0.35 }),
    creeper('rs_w4', 10.2, W, -164.4, [-1, 0], 9.6, { height: 1.7, phase: 0.85 }),
    creeper('rs_abprall', BOUNCE.x, W, BOUNCE.z, [0, -1], 3.6, { height: 2.4, mode: 'static', walk: false }),
    // ---------------- 5 Brummer (3)
    { kind: 'brummer', id: 'br1', center: [3.4, U + 2.6, -205], radius: 2.6 },
    { kind: 'brummer', id: 'br2', center: [0.4, U + 3, -217.6], radius: 1.2 },
    { kind: 'brummer', id: 'br3', path: [[-6, U + 2.6, -219], [-6, U + 2.6, -228], [-1, U + 2.6, -224]] },
  ],
  items: [
    // ---------------- 1
    line([0, Y + 0.6, 3], [0, Y + 0.6, -1], 3),
    line([0, Y + 0.6, -7], [0, Y + 0.6, -13], 4),
    line([-4, Y + 0.6, -17.5], [-7.4, Y + 0.6, -20], 3),
    line([-7.4, Y + 0.6, -22], [-7.4, Y + 0.6, -30], 4),
    line([-5, Y + 0.6, -34], [1.6, Y + 0.6, -34], 4),
    line([3, Y + 0.6, -37.6], [3, Y + 0.6, -43], 4),
    line([0, Y + 0.6, -53], [0, Y + 0.6, -57], 3),
    // ---------------- 2
    line([-3, Y + 0.6, -62], [-3, Y + 0.6, -72], 5),
    ...STEPS.map((z, i) => ({ kind: 'coin', pos: [4.6, STEP_TOPS[i] + 0.7, z] })),
    line([-3, Y + 0.6, -86], [-3, Y + 0.6, -96], 5),
    // ---------------- 3
    line([0, Y + 0.6, -110], [0, Y + 0.6, -122], 6),
    // ---------------- 4: Sprünge über den See, Münzpfad zum Stempel (nach dem Abprall)
    ...arc([0, W + 1.2, -136.6], [-5.3, W + 1.2, -139.8], 3, 1.2),
    ...arc([-4, W + 1.2, -144.6], [2.6, W + 1.2, -148.2], 4, 1.4),
    ...arc([2, W + 1.2, -153], [-3.4, W + 1.2, -157.2], 4, 1.4),
    ...arc([-3.4, W + 1.2, -162], [0.6, W + 1.2, -167], 3, 1.2),
    ...column(BOUNCE.x, -143.4, W + 3.8, W + 5.8, 2),
    line([10.8, LEDGES[0].top + 0.7, -145.2], [10.8, LEDGES[0].top + 0.7, -147.4], 2),
    ...arc([10.7, LEDGES[0].top + 0.7, -148.2], [10.7, LEDGES[1].top + 0.7, -151.4], 3, 1),
    ...arc([10.7, LEDGES[1].top + 0.7, -153.4], [10.4, LEDGES[2].top + 0.7, -157.2], 3, 1),
    // ---------------- 5
    line([0, U + 0.6, -188], [0, U + 0.6, -191.4], 2),
    line([0, U + 1, -196], [0, U + 1, -203], 3),
    line([8, U + 0.6, -211], [6, U + 0.6, -213.4], 2),
    ring([-2, GOAL.top + 1, -254], 1.6, 6),
    // ---------------- Warp-Box zwischen den hängenden Rankenschnappern ↔ Sternkammer
    { kind: 'warpbox', id: 'wb_hoehle', pos: BOX, target: 'wb_kammer' },
    { kind: 'warpbox', id: 'wb_kammer', pos: [65.6, Y, -72.4], target: 'wb_hoehle' },
    // ---------------- Sternkammer, Moorkeller
    ring([70, Y + 1, -76], 1.8, 8),
    line([66, Y + 0.6, -42], [72, Y + 0.6, -42], 4),
    line([66, Y + 0.6, -45], [72, Y + 0.6, -45], 4),
    { kind: 'powerup', pos: [69, Y + 0.1, -47.6], power: 'oneup', dir: [1, 0] },
    // ---------------- Sternring (Stern 2): acht Sternmünzen rund um die Zielröhren-Insel und auf der letzten Plattform
    { kind: 'sternring', id: 'sternring', pos: [-5.4, FINAL.top, -231.4], star: 2, time: 10, coins: [
      [-7.4, FINAL.top + 0.8, -233.8], [-4.6, FINAL.top + 2.4, -235.4], [-2.4, FINAL.top + 0.8, -236.4], [0.6, FINAL.top + 0.8, -235],
      [0.6, FINAL.top + 2.2, -233], [-1.2, FINAL.top + 0.8, -230.8], [-3.6, FINAL.top + 0.8, -233.2], [-6.6, FINAL.top + 2.2, -232],
    ] },
    // Krallen-Hinweis: zwei Münzen an der bewachsenen Wand
    ...column(-7.6, -186.5, U + 2.4, U + 5.4, 3),
    line([-15.8, HIDDEN.top + 1.4, -186.5], [-26.8, HIDDEN.top + 1.8, -186.5], 6),
  ],
  checkpoint: { pos: [0, Y, -104], yaw: Math.PI / 2 },
  stars: [
    [70, Y + 1.2 + 0.9, -82],                                  // 0: Sternkammer hinter der Warp-Box
    [4.4, LAKE.bottom + 0.9, -141.6],                           // 1: ganz unten im Moorsee
    { pos: [-5.4, FINAL.top + 1.4, -231.4], hidden: true, id: 'stern_ring' },   // 2: Sternring
  ],
  stamp: [10.4, LEDGES[2].top + 1.4, -158.6],
  goal: { pos: [0, GOAL.top, -260], height: 9 },
  marks: {
    start: [0, Y, 6],
    roehre: [PIPE_BLOCK.x, Y, PIPE_BLOCK.z],
    hoehle: [-3, Y, -60],
    stufen: [0.4, Y, -73.6],
    box: BOX,
    checkpoint: [0, Y, -104],
    bruecke: [0, Y, -108.4],
    see: [0, W + 0.6, -133],
    abprall: [8.2, ISLET.top, -142],
    hinauf: [2, W + 0.6, -175.4],
    oben: [3, U, -187],
    roulette: [-4.6, U, -186.4],
    warp: [WARP.face - 2.8, WARP.top, -186.5],
    final: [-2, FINAL.top, -231],
    goal: [0, GOAL.top, -256],
  },
};
