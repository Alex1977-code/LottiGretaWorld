// 3-B „Manege frei für den Schlangenkönig“ (Archetyp boss, Bauplan 3-B: Vorplatz ca. 20 m mit ?-Block (Krallen-Anzug),
// Treppe und Seilbahn zur Arena ca. 25 m Durchmesser im Zirkuszelt; Boss Schlangenkönig; danach Stern und Röhre zum Ziel).
// Thema circus (Winternacht vor dem Zelt), Musik course_boss, 1 Stern, 400 s.
//
//   1 Vorplatz        z  14 … −10   verschneiter Zirkusplatz: Kassenhäuschen, Zirkuswagen, Plakat, Lichterketten, Ballons,
//                                   Schneemann, Tannen; ?-Block mit Krallen-Anzug
//   2 Prachttreppe    z −10 … −19   18 Stufen (0,25 m, ohne Springen) mit rotem Läufer hinauf zur Seilbahnstation (4,5 m)
//   3 Seilbahn        z −27 … −47   Gondel pendelt selbständig über die Schlucht zum Zeltplateau (7 m), Münzspur
//   4 Zelteingang     z −47 … −56   Checkpoint, Torbogen mit Glühbirnen; im Zelt wird die vordere Zelthälfte ausgeblendet
//   5 Manege          Ø ≈ 25 m      Bande mit Tor (schließt im Kampf), Ränge mit Publikum-Silhouetten und Leuchtstäben,
//                                   Scheinwerfer, Wimpelketten; Schlangenkönig auf dem Sockel in der Mitte
//   6 Hinterhof       x 40 … 64     nur über die Röhre nach dem Sieg: Zielmast, Zirkuswagen, Feuerwerk
// Boss: Der Schlangenkönig bricht aus dem Sockel, schleudert Felsbrocken (Landeanzeige), ruft Diener-Schlangen mit
// Tellern auf dem Kopf (Phase 1: 3 heile, 2: 3 mit 1 rissigen, 3: 4 mit 2 rissigen; ab Phase 2 fallen Steine von der
// Kuppel). Auf einen Teller springen und von dort auf seinen Kopf: Treffer. Manchmal liegt ein Krallen-Anzug auf
// einem Teller (an den Dienern hochklettern). 3 Treffer → er versinkt, der Stern erscheint vor dem Sockel, hinter dem
// Sockel fährt die grüne Röhre zum Hinterhof aus dem Boden. Das Publikum jubelt bei jedem Treffer.

import { levelSetupE, grandStairs, circusProps, cutawayTent, circusArena, RisingPipe, spawnLocal, particles, snowCover, discG, bake, plainIslands, shadowDiet, cliffDeco } from './_helpers_e.js';

const AY = 7;                    // Boden des Zeltplateaus
const AZ = -68;                  // Manegenmitte
const AR = 12.3;                 // Innenradius der Bande
const TR = 19.5, TH = 18;        // Zelt (Optik)
const SY = 4.5;                  // Seilbahnstation
const GX = 52, GZ = -64;         // Hinterhof (Ziel)

const ISLANDS = [
  { pos: [0, -20, -2.5], size: [30, 20, 33], top: 'stone', color: 0x6a6a86 },          // Vorplatz (mit Treppe)
  { pos: [0, -20, -23], size: [16, 20 + SY, 8], top: 'stone', color: 0x6a6a86 },        // Seilbahnstation
  { pos: [0, -20, -75], size: [56, 20 + AY, 56], top: 'stone', color: 0x6a6a86 },       // Zeltplateau
  { pos: [GX, -20, GZ - 4], size: [26, 20 + AY, 30], top: 'stone', color: 0x6a6a86 },   // Hinterhof
  { pos: [0, -20, -37], size: [44, 8, 20], top: 'stone', color: 0x5a5a76 },             // Schluchtgrund
];

function setup(level) {
  plainIslands(level, ISLANDS);
  // Schluchtwände: Schneewulst, Eiszapfen, Simse, gefrorene Wasserfälle
  cliffDeco(level, { x0: -27.8, x1: 27.8, z: -47, y: AY, h: 26, face: 1, fall: -12, seed: 3 });
  cliffDeco(level, { x0: -7.8, x1: 7.8, z: -27, y: SY, h: 24, face: -1, seed: 7 });
  cliffDeco(level, { x0: -14.8, x1: 14.8, z: 14, y: 0, h: 20, face: 1, seed: 9 });
  cliffDeco(level, { x0: GX - 12.8, x1: GX + 12.8, z: GZ + 11, y: AY, h: 26, face: 1, fall: GX + 6, seed: 11 });
  // Schneedecken auf Vorplatz, Station, Zeltplateau (ohne das Zelt), Hinterhof, Schluchtgrund; Holzboden im Zelt
  bake(level, [
    snowCover(-14.9, -18.9, 14.9, 13.9, 0.02),
    snowCover(-7.9, -26.9, 7.9, -19.1, SY + 0.02),
    snowCover(-27.9, -102.9, -19.7, -47.1, AY + 0.02), snowCover(19.7, -102.9, 27.9, -47.1, AY + 0.02),
    snowCover(-19.7, -102.9, 19.7, -87.7, AY + 0.02), snowCover(-19.7, -48.4, 19.7, -47.1, AY + 0.02),
    snowCover(GX - 12.9, GZ - 18.9, GX + 12.9, GZ + 10.9, AY + 0.02),
    snowCover(-21.9, -46.9, 21.9, -27.1, -12 + 0.02, 2.5),
  ], { castShadow: false });
  bake(level, [
    discG(0, TR, 0, AY + 0.01, AZ, 0x5a1a2a, 64, { fn: (p, n, o) => { const r = Math.hypot(p.x, p.z - AZ); const k = (Math.floor(r * 1.2) & 1) * 0.12; o[0] = 0.09 + k * 0.1; o[1] = 0.012; o[2] = 0.03 + k * 0.03; } }),
  ], { castShadow: false });
  grandStairs(level, { x: 0, z: -10, y: 0, n: 18, rise: SY / 18, run: 0.5, width: 6 });
  circusProps(level, [
    { kind: 'kasse', pos: [-8.5, 0, 6.5] },
    { kind: 'wagen', pos: [9, 0, 7.5], yaw: 0.35, color: 0x2a6ae8, trim: 0xe8283a },
    { kind: 'wagen', pos: [-10, 0, -5], yaw: -0.25, color: 0xffb020, trim: 0x2a4ac8 },
    { kind: 'wagen', pos: [10.5, 0, -6.5], yaw: 0.2, color: 0x3ab84a, trim: 0xfff2e0 },
    { kind: 'plakat', pos: [6, 0, -0.5], yaw: -0.25 },
  ]);
  circusProps(level, [
    { kind: 'wagen', pos: [GX + 7, AY, GZ + 7], yaw: -0.5, color: 0xe8283a, trim: 0xffc21a },
    { kind: 'wagen', pos: [GX - 8, AY, GZ - 8], yaw: 0.6, color: 0x7a2ad8, trim: 0xffc21a },
  ], { shadow: false });
  const tent = cutawayTent(level, { center: [0, AY, AZ], radius: TR, height: TH, cut: 2.5, inside: (p) => p.pos.z < AZ + TR - 1 && Math.abs(p.pos.x) < TR + 2 && p.pos.y > AY - 2 });
  const ring = circusArena(level, { center: [0, AY, AZ], arena: AR, door: 4.2, rows: 5, rowDepth: 1.0, rowRise: 0.6, span: [-0.45, Math.PI + 0.45] });
  level._circus = { tent, ring };
  // Budget: Diener-Schlangen und Felsbrocken werfen den Sonnenschatten nur mit einem Teil
  shadowDiet(level, ['dienerschlange', 'felsbrocken']);
  // Publikum jubelt bei Treffern und beim Sieg
  const prevHit = level.onBossHit, prevDef = level.onBossDefeated;
  level.onBossHit = (b, w) => { prevHit?.(b, w); ring.cheer(1, 2.4); };
  level.onBossDefeated = (b) => { prevDef?.(b); ring.cheer(1, 6); };
  // Röhre statt Warp-Box: Ansage des Boss-Archetyps anpassen
  const hud = level.archetype?.hud;
  if (hud?.banner) {
    const banner = hud.banner.bind(hud);
    hud.banner = (text, o) => banner(text === 'Spring in die Warp-Box!' ? 'Ab in die Röhre!' : text, o);
  }
  spawnLocal(level, new RisingPipe(level, { id: 'roehre_ziel', pos: [0, AY, AZ - 8.6], hidden: true, height: 1.5, target: 'ziel_ausgang', color: 0x2fbf4a }));
  // Schneefall vor dem Zelt (folgt der Kamera), Feuerwerk im Hinterhof
  particles(level, { follow: () => { const t = level.view.rig.target; return { x: t.x, y: t.y - 4, z: t.z - 6 }; }, size: [44, 40], n: 140, h: 22, dir: -1, speed: [1.2, 2.2], dot: 0.22, sway: 0.8, colors: [0xffffff, 0xeef4ff], additive: false, opacity: 0.85, name: 'schneefall' });
  // Seilbahn-Rückruf: steht die Gondel leer am Plateau und wartet jemand an der Station, kommt sie zurück
  const g = level.named.get('gondel');
  let callT = 0;
  level.onStep((dt) => {
    const p = level.player;
    if (!g || !p || p.dead) return;
    const atStation = p.pos.z < -19.5 && p.pos.z > -27.4 && Math.abs(p.pos.y - SY) < 1.5;
    const away = g.state === 'wait' && g.u >= 1 && !(p.pos.z < -44 && p.pos.z > -47 && p.pos.y > AY - 0.5);
    callT = atStation && away ? callT + dt : 0;
    if (callT > 0.8) { g.state = 'move'; g.dir = -1; g.needEmpty = false; callT = 0; level.sfx('switch'); }
  });
  let fw = 0;
  level.onStep((dt) => {
    const p = level.player;
    if (!level.view || !p || p.pos.x < 35) return;
    fw -= dt;
    if (fw > 0) return;
    fw = 0.55;
    const a = level.rnd.real(0, Math.PI * 2), r = level.rnd.real(4, 12);
    level.effects?.sparks({ x: GX + Math.cos(a) * r, y: AY + level.rnd.real(9, 15), z: GZ - 6 + Math.sin(a) * r * 0.5 }, 26);
  });
}

/** Münzbogen von a nach b (Scheitel h). */
function arc(a, b, n, h) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

export const LEVEL = {
  id: '3-B',
  world: 3,
  title: 'Manege frei für den Schlangenkönig',
  archetype: 'boss',
  theme: 'circus',
  music: 'course_boss',
  timeLimit: 400,
  starSlots: 1,
  killY: -8,
  setup: levelSetupE(setup),
  start: { pos: [0, 0, 9.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, AY, -49.5], yaw: Math.PI / 2 }],
  camera: [
    { from: 22, to: -9, pitch: 29, dist: 14.5, ahead: 4, area: [-32, 32] },
    { from: -9, to: -27, pitch: 36, dist: 14, ahead: 3, area: [-32, 32] },
    { from: -27, to: -47, pitch: 25, dist: 13, x: 0, xLock: 0.6, ahead: 3.5, area: [-32, 32] },
    { from: -47, to: -100, pitch: 46, dist: 19, x: 0, xLock: 0.35, ahead: 0.6, lead: 0.4, height: 1.6, area: [-32, 32] },
    { from: -40, to: -90, pitch: 40, dist: 14, ahead: 2, area: [35, 70] },
  ],
  boss: {
    id: 'koenig', name: 'Schlangenkönig', speed: 0,
    trigger: { min: [-11, AY - 0.5, AZ - 11], max: [11, AY + 9, AZ + AR - 1.2] },
    lock: { min: [-2.7, AY, AZ + AR - 0.2], max: [2.7, AY + 9, AZ + AR + 1.1] },
    warp: 'roehre_ziel', frame: 0.25, musicAfter: 'course_circus',
  },
  segments: [
    // Gelände (Inseln ohne Schattenwurf) baut der Haken: ISLANDS
    { type: 'killplane', y: -8 },
    { type: 'deco_w3', items: [
      { kind: 'schneemann', pos: [-4.5, 0, 11.5], yaw: -1.2 },
      { kind: 'tanne', pos: [-13, 0, 12], size: 4.2 }, { kind: 'tanne', pos: [13, 0, 12.5], size: 3.8 },
      { kind: 'tanne', pos: [-13.2, 0, -14], size: 4.6 }, { kind: 'tanne', pos: [13, 0, -15], size: 4.4 },
      { kind: 'tannen', pos: [-23, AY, -62], size: [6, 26], n: 4, scale: [0.9, 1.5], shadow: false },
      { kind: 'tannen', pos: [23, AY, -64], size: [6, 26], n: 4, scale: [0.9, 1.5], shadow: false },
      { kind: 'laternen', pos: [-3.6, 0, 12], from: [-3.6, 0, 12], to: [-3.6, 0, -8], every: 7 },
      { kind: 'laternen', pos: [3.6, 0, 12], from: [3.6, 0, 12], to: [3.6, 0, -8], every: 7 },
      { kind: 'laternen', pos: [-4, AY, -48], from: [-4, AY, -48], to: [-4, AY, -54], every: 6 },
      { kind: 'laternen', pos: [4, AY, -48], from: [4, AY, -48], to: [4, AY, -54], every: 6 },
      { kind: 'felsen', pos: [0, -12, -37], size: [34, 16], n: 7, height: [2, 6], shadow: false },
      { kind: 'tanne', pos: [GX - 9, AY, GZ + 9], size: 4.4, shadow: false }, { kind: 'tanne', pos: [GX + 9, AY, GZ - 12], size: 4.8, shadow: false },
      { kind: 'schneemann', pos: [GX + 3, AY, GZ + 10], yaw: -1.8, shadow: false },
    ] },
    // Zirkus-Zier: Lichterketten, Ballons, Wimpel, Scheinwerfer, Wimpelketten im Zelt, Seilbahnstation, Torbogen
    { type: 'deco_w1b', items: [
      { kind: 'bulbs', from: [-8.5, 3.4, 7.6], to: [9, 3.2, 8.6], sag: 1.2, n: 26 },
      { kind: 'bulbs', from: [-10, 3.0, -4], to: [10.5, 3.0, -5.5], sag: 1.4, n: 30 },
      { kind: 'balloons', pos: [-6.6, 0, 6.2], n: 6, size: 2.6 },
      { kind: 'balloons', pos: [12.4, 0, 2], n: 5, size: 2.2 },
      { kind: 'pennant', pos: [-3.6, SY, -19.4], size: 3.2 }, { kind: 'pennant', pos: [3.6, SY, -19.4], size: 3.2 },
      { kind: 'drum', pos: [-6.5, 0, 0.5], size: [1.8, 0.9], color: 'blue' }, { kind: 'ball', pos: [-5.2, 0, -1.2], size: 0.7 },
      { kind: 'pole', pos: [-3.2, SY, -26.4], size: 5.6, r: 0.22 }, { kind: 'pole', pos: [3.2, SY, -26.4], size: 5.6, r: 0.22 },
      { kind: 'bunting', from: [-3.2, SY + 5.4, -26.4], to: [3.2, SY + 5.4, -26.4], sag: 0.6, n: 9 },
      { kind: 'pole', pos: [-3.3, AY, -49], size: 6, r: 0.25 }, { kind: 'pole', pos: [3.3, AY, -49], size: 6, r: 0.25 },
      { kind: 'bulbs', from: [-3.3, AY + 5.9, -49], to: [3.3, AY + 5.9, -49], sag: 0.9, n: 14 },
      { kind: 'curtain', pos: [-4.4, AY, -49.2], size: [2, 6] }, { kind: 'curtain', pos: [4.4, AY, -49.2], size: [2, 6] },
      // im Zelt: Scheinwerfer von der Zeltkuppel auf die Manege, Wimpelketten, Lichterketten
      { kind: 'spotlight', pos: [-13, AY + 14, AZ - 6], target: [-3, AY, AZ + 2], r: 3.2, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [13, AY + 14, AZ - 6], target: [3, AY, AZ + 2], r: 3.2, color: 0xffd0f0 },
      { kind: 'spotlight', pos: [0, AY + 15.5, AZ - 14], target: [0, AY, AZ - 1], r: 3.6, color: 0xc8e4ff },
      { kind: 'spotlight', pos: [-15, AY + 12, AZ + 2], target: [-6, AY, AZ + 6], r: 2.4, color: 0xfff2c8, strength: 0.05 },
      { kind: 'spotlight', pos: [15, AY + 12, AZ + 2], target: [6, AY, AZ + 6], r: 2.4, color: 0xffe0b0, strength: 0.05 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [-17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [0, AY + 7.5, AZ - 18], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [-12, AY + 7.5, AZ - 14], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [12, AY + 7.5, AZ - 14], sag: 1.6, n: 18 },
      { kind: 'bulbs', from: [-18, AY + 7.2, AZ + 2], to: [-10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      { kind: 'bulbs', from: [18, AY + 7.2, AZ + 2], to: [10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      // Hinterhof
      { kind: 'bulbs', from: [GX - 8, AY + 3.4, GZ - 8], to: [GX + 7, AY + 3.4, GZ + 7], sag: 1.4, n: 28 },
      { kind: 'balloons', pos: [GX - 4, AY, GZ - 14], n: 7, size: 3 },
      { kind: 'confetti', pos: [GX, AY + 0.05, GZ - 6], size: [14, 14], n: 60 },
    ] },
    { type: 'pennants', items: [
      { pos: [-13.5, 0, 13], color: 0xe8322a, h: 6 }, { pos: [13.5, 0, 13], color: 0xffcf2a, h: 6 },
      { pos: [-13.5, 0, -1], color: 0x3a7ae8, h: 6 }, { pos: [13.5, 0, -1], color: 0xe8322a, h: 6 },
      { pos: [-6.5, SY, -20], color: 0xffcf2a, h: 5 }, { pos: [6.5, SY, -20], color: 0x3a7ae8, h: 5 },
      { pos: [-25, AY, -50], color: 0xe8322a, h: 7 }, { pos: [25, AY, -50], color: 0xffcf2a, h: 7 },
      { pos: [GX - 11, AY, GZ + 12], color: 0x3a7ae8, h: 6 }, { pos: [GX + 11, AY, GZ + 12], color: 0xe8322a, h: 6 },
    ] },
    // Seilbahn: fährt los, sobald jemand in der Gondel steht; leer zurückgerufen, wer an der Station wartet (Haken)
    { type: 'seilbahn', id: 'gondel', from: [0, SY + 2.3, -28.6], to: [0, AY + 2.3, -45.4], speed: 2.6, wait: 1.5, trigger: 'stand', mode: 'pingpong' },
    { type: 'sign', pos: [-4.6, SY, -22], text: 'Zur Manege', yaw: 0.2 },
    // Hinterhof: Ausgang der Röhre
    { type: 'pipe', id: 'ziel_ausgang', pos: [GX - 4, AY, GZ + 6], height: 1.2, color: 'green' },
  ],
  blocks: [
    { kind: 'question', pos: [2.8, 2.5, 4.0], content: 'krallen' },
    { kind: 'question', pos: [-2.8, 2.5, 4.0], content: 'coins:5' },
  ],
  enemies: [
    { kind: 'schlangenkoenig', id: 'koenig', pos: [0, AY, AZ], arena: { center: [0, AY, AZ], r: AR - 1.1 }, plate: 2.8, star: { pos: [0, AY + 0.4, AZ + 6.5], index: 0 } },
  ],
  items: [
    { kind: 'coins', pos: [0, 0.6, 1], r: 2.0, n: 8 },
    { kind: 'coins', from: [0, 1.6, -11], to: [0, SY + 1.0, -18.5], n: 6 },
    // Münzspur entlang der Seilbahn (in Kopfhöhe in der Gondel)
    { kind: 'coins', from: [0, SY + 1.0, -31], to: [0, AY + 1.0, -43], n: 7 },
    ...arc([-3, AY + 0.6, -51], [3, AY + 0.6, -51], 5, 1.2),
    { kind: 'coins', pos: [GX, AY + 0.8, GZ - 6], r: 2.6, n: 10 },
  ],
  stars: [],
  goal: { pos: [GX, AY, GZ - 12], height: 8 },
  marks: {
    start: [0, 0, 9.5], station: [0, SY, -25], gondel: [0, SY, -28.6], plateau: [0, AY, -49.5], center: [0, AY, AZ],
    pipe: [0, AY, AZ - 8.6], hof: [GX - 4, AY, GZ + 6], goal: [GX, AY, GZ - 12],
  },
};
