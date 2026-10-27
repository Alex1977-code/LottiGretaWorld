// H-Burg „Gruselgala auf Schloss Schlotterstein“ – Finale der Halloween-Welt „Kürbisinsel“ (Archetyp boss mit Parcours,
// Thema castle_night, Musik course_brummula, 400 s). Graf Brummbär (Baron Brummbär im Vampirumhang) lädt zur Gruselgala:
// Ein roter Teppich führt über die Zugbrücke ins Gruselschloss – durch die Ahnengalerie der Familie Brummbär (lustige
// Gemälde, klappernde Skelette), den Spukball-Saal (Geisterreigen auf dem Tanzboden, Großspuk mit Hexenhut, Bankett-Tafeln
// voller Süßigkeiten) und den Turmaufgang mit der Geisterbrücke, die nur ein blinkender Laternenpfahl zeigt, hinauf aufs
// Schlossdach. Dort wirft der Graf Kürbis-Bomben – zurückwerfen trifft! Danach Warp-Box zum Siegerbalkon, wo Krümel mit
// der Laterne wartet. Parcours nach −Z (Vorhof/Säle y 2, Turmaufgang → Wehrgang y 10, Arena y 10).
//
// Abschnitte:
//   1  Vorhof            z  12 …  −21   y 2   roter Teppich, Kürbiskutsche, Lach-Grabsteine (ein Geist lugt hervor und
//                                             verschwindet kichernd), zwei Kürblinge, Zugbrücke über den Nebelgraben
//                                             (unsichtbarer Block mit Extraleben), Torbogen mit Türmen
//   2  Ahnengalerie       z −21 …  −60   y 2   Gemälde der Familie Brummbär, Kerzenleuchter, zwei Klapperknochen;
//                                             rechts die Gruft: Grabstein-Schalter (nur Stampfattacke) → Steinstufen
//                                             zur Nische hoch oben (Stern 0, Zeit 12 s)
//   3  Spukball-Saal      z −60 … −104   y 2   Tanzboden mit Geisterreigen (Kreisgeist-Kreis), Großspuk, Bankett-Tafeln,
//                                             Bonbon-Tresor aus lila Ziegeln (Kürbis-Bombe vom Karren werfen → Stern 1),
//                                             Kronleuchter (Spinnennetz in der Ecke → Stempel), Checkpoint
//   4  Turmaufgang        z −104 … −148  y 2 → 10  Treppe, Geisterbrücke (blinkender Laternenpfahl), Treppe, Wehrgang
//                                             mit Zinnen (Klapperknochen, Kürbling), Checkpoint vor dem Dach
//   5  Schlossdach        Mitte z −197   y 10  Graf Brummbär (Muster 0-22): nur zurückgeworfene Kürbis-Bomben treffen;
//                                             besiegt → Stern 2 vorn, Warp-Box → Siegerbalkon mit Krümel und Zielmast
// Gegner: Kürbling 5, Klapperknochen 4, Großspuk 1, Kreisgeist-Kreis 1 (8 Geister), Graf Brummbär.

import {
  isl, line, ring, arc, naschen, naschKreis, sign, teppich, zinnenMauer, torbogen, ahnenGalerie, tanzboden, kronleuchter,
  schlossDach, kicherGeist, kruemelLaterne, kuerbisKutsche, bankett, bombenNachschub, stimmungen, turm, funkelSpur,
  hexenKueche,
} from './_helpers_c.js';

const PI = Math.PI;
const Y = 2;            // Vorhof, Säle
const YT = 6;           // Treppenabsatz 1
const YT2 = 6.5;        // Treppenabsatz 2
const YW = 10;          // Wehrgang, Schlossdach, Siegerbalkon
const AZ = -197;        // Mitte des Schlossdachs
const R = 9.6;          // Innenradius des Dachs (bis zur Brüstung)
const HW = 6;           // Wandhöhe der Säle

// ---------------------------------------------------------------- Maße (auch für den Test)
export const MBURG_H = {
  Y, YT, YT2, YW, AZ, R,
  GRUFT: { x0: 6.8, x1: 19, z0: -31, z1: -48 },
  NISCHE: { x0: 14.6, x1: 19, z0: -42.4, z1: -48, top: Y + 6.5 },     // Stern 0
  SCHALTER: [9, Y, -34.6],
  TRESOR: { x: -8, z: -97 },                                          // Stern 1 (lila Ziegel 3 × 3 × 3)
  KARREN: [-4.6, Y, -93.2],
  LEUCHTER: { x: 6.2, z: -86, top: Y + 6.6 },                         // Stempel
  NETZ: [8.6, Y, -90.6],
  PFAHL: [4.2, YT, -127.5],
};
const { GRUFT, NISCHE, SCHALTER, TRESOR, KARREN, LEUCHTER, NETZ, PFAHL } = MBURG_H;

const wand = (x0, x1, z0, z1, y = Y, h = HW, o = {}) => ({ type: 'wall', pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], size: [Math.abs(x1 - x0), h, Math.abs(z0 - z1)], style: 'stone', ...o });
const kb = (id, pos, o = {}) => ({ kind: 'kuerbling', id, pos, sight: 6, ...o });
const kk = (id, a, b, o = {}) => ({ kind: 'klapperknochen', id, pos: [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2], path: [a, b], ...o });

/** Aufbau-Haken: Teppiche, Mauern, Galerie, Saal, Dach-Arena (vor dem Verschmelzen; Kollision zählt zum Umriss). */
function build(level) {
  teppich(level, [
    { x0: -1.3, x1: 1.3, z0: 11.4, z1: -4.8, y: Y },
    { x0: -1.3, x1: 1.3, z0: -15.2, z1: -59.6, y: Y },
    { x0: -1.6, x1: 1.6, z0: -97, z1: -103.6, y: Y },
    { x0: -1.2, x1: 1.2, z0: -149, z1: -185.6, y: YW },
  ]);
  // Tor mit Türmen
  torbogen(level, [{ x: 0, y: Y, z: -18, width: 4.4, height: 4, depth: 3 }]);
  zinnenMauer(level, [
    { from: [-9, Y, -18], to: [-3.2, Y, -18], h: 4.6, d: 3 },
    { from: [3.2, Y, -18], to: [9, Y, -18], h: 4.6, d: 3 },
    // Gruft: niedrige Brüstung vorn (zur Kamera), Treppenabsätze, Wehrgang
    { from: [GRUFT.x0, Y, GRUFT.z0 - 0.3], to: [GRUFT.x1, Y, GRUFT.z0 - 0.3], h: 0.9, d: 0.5 },
    { from: [-5.3, YT, -112], to: [-5.3, YT, -121], h: 1, d: 0.6 },
    { from: [5.3, YT, -112], to: [5.3, YT, -121], h: 1, d: 0.6 },
    { from: [-5.3, YT2, -134], to: [-5.3, YT2, -142], h: 1, d: 0.6 },
    { from: [5.3, YT2, -134], to: [5.3, YT2, -142], h: 1, d: 0.6 },
    { from: [-3.3, YW, -148.3], to: [-3.3, YW, -186.4], h: 1, d: 0.6 },
    { from: [3.3, YW, -148.3], to: [3.3, YW, -186.4], h: 1, d: 0.6 },
  ]);
  turm(level, { x: -7, z: -18, r: 2.3, top: Y + 6.5, depth: 7, under: 10, rim: 0.7, gaps: [], floor: 'stein', color: 'grau', glow: 0xffc860, windows: [[0.2, -2.4], [0.6, -4.6]], circle: false, id: 'torturm_l' });
  turm(level, { x: 7, z: -18, r: 2.3, top: Y + 6.5, depth: 7, under: 10, rim: 0.7, gaps: [], floor: 'stein', color: 'grau', glow: 0xffc860, windows: [[-0.2, -2.4], [-0.6, -4.6]], circle: false, id: 'torturm_r' });
  turm(level, { x: -6.6, z: -166, r: 2.2, top: YW + 4.5, depth: 12, under: 10, rim: 0.7, gaps: [], floor: 'stein', color: 'grau', glow: 0xffc860, windows: [[0.5, -2.2], [1.2, -5]], circle: false, id: 'wehrturm_l' });
  turm(level, { x: 6.6, z: -166, r: 2.2, top: YW + 4.5, depth: 12, under: 10, rim: 0.7, gaps: [], floor: 'stein', color: 'grau', glow: 0xffc860, windows: [[-0.5, -2.2], [-1.2, -5]], circle: false, id: 'wehrturm_r' });
  // Ahnengalerie
  ahnenGalerie(level, [
    { pos: [-5.95, Y + 2.6, -25], yaw: PI / 2, motiv: 0 },
    { pos: [-5.95, Y + 2.6, -32], yaw: PI / 2, motiv: 1 },
    { pos: [-5.95, Y + 2.6, -39], yaw: PI / 2, motiv: 2 },
    { pos: [-5.95, Y + 2.6, -46], yaw: PI / 2, motiv: 3 },
    { pos: [-5.95, Y + 2.6, -53], yaw: PI / 2, motiv: 5 },
    { pos: [5.95, Y + 2.6, -27.5], yaw: -PI / 2, motiv: 4, size: 2 },
    { pos: [5.95, Y + 2.6, -46], yaw: -PI / 2, motiv: 2 },
    { pos: [5.95, Y + 2.6, -54], yaw: -PI / 2, motiv: 1 },
  ]);
  // Spukball-Saal
  tanzboden(level, { x0: -5, x1: 5, z0: -73, z1: -87, y: Y });
  kronleuchter(level, { x: LEUCHTER.x, z: LEUCHTER.z, top: LEUCHTER.top, r: 1.7, chain: 5 });
  kronleuchter(level, { x: -6.2, z: -76, top: Y + 7.4, r: 1.3, chain: 4 });
  bankett(level, [{ pos: [-8.2, Y, -68.5], len: 4.4, yaw: PI / 2 }, { pos: [8.2, Y, -68.5], len: 4.4, yaw: PI / 2 }]);
  kuerbisKutsche(level, { pos: [5.6, Y, 4.6], yaw: -0.6, size: 1.35 });
  hexenKueche(level, [
    { kind: 'fass', pos: [KARREN[0] - 1.2, Y, KARREN[2] - 0.6] }, { kind: 'fass', pos: [KARREN[0] + 1.6, Y, KARREN[2] - 1.4] },
    { kind: 'fass', pos: [18, Y, -46.6] },
  ]);
  // Schlossdach (Arena wie 0-22)
  schlossDach(level, { x: 0, z: AZ, y: YW, R, gap: 0.24 });
  funkelSpur(level, [[TRESOR.x, Y + 3.6, TRESOR.z], [LEUCHTER.x, LEUCHTER.top + 1.6, LEUCHTER.z]], 0xfff0a0, 1.2, { name: 'hinweis-glitzer' });
}

/** Haken nach dem Aufbau: Stimmungen, Geist, Krümel, Bomben-Nachschub, Stern des Grafen, Kulissen-Fledermäuse. */
function setup(level) {
  stimmungen(level, [{ min: [-12.5, -105], max: [21, -20.5], mood: 'innen' }]);
  kicherGeist(level, { id: 'kichergeist', pos: [-6.4, Y, -0.4], yaw: -PI / 2, near: 4.5 });
  kruemelLaterne(level, { id: 'kruemel', pos: [3.4, YW, -239.4], yaw: -PI / 2 - 0.5, near: 7, text: 'Juhu!', sub: 'Was für eine Gruselgala!' });
  bombenNachschub(level, { id: 'nachschub', pos: KARREN, r: 3.2, delay: 2, until: () => (level.named.get('tresor_vorn')?.broken ?? 0) > 0 });
  // Stern 2 erscheint vorn auf dem Dach, sobald der Graf besiegt ist (er selbst wirft keinen Stern)
  level.onStep(() => {
    const g = level.named.get('graf'), s = level.named.get('stern_graf');
    if (g?.state === 'gone' && s?.hidden) s.reveal();
  });
  // Kulissen-Fledermäuse des Themas castle_night: bei der hohen Kampfkamera höher fliegen lassen (wie 0-22)
  for (const bt of level.view?.sky?.bats?.bats ?? []) bt.cy += 14;
}

export const LEVEL = {
  id: 'H-Burg',
  world: 31,
  title: 'Gruselgala auf Schloss Schlotterstein',
  archetype: 'boss',
  theme: 'castle_night',
  music: 'course_brummula',
  timeLimit: 400,
  candyHud: true,
  killY: -8,
  start: { pos: [0, Y, 9], yaw: PI / 2 },
  build,
  setup,
  instances: { coin: { farHide: 40, shadow: false } },
  farHide: 44,
  camera: [
    { from: 16, to: -16, pitch: 42, dist: 14, height: 1.4, ahead: 2.2 },
    { from: -16, to: -60, pitch: 47, dist: 14, height: 1.2, ahead: 2.2 },
    { from: -29, to: -50, pitch: 50, dist: 14, x: 12.4, xLock: 0.55, height: 1.6, ahead: 1.6, area: [6.6, 22] },
    { from: -60, to: -104, pitch: 47, dist: 15, height: 1.4, ahead: 2.2 },
    { from: -104, to: -148, pitch: 42, dist: 14, height: 1.6, ahead: 2.4 },
    { from: -148, to: -183, pitch: 42, dist: 14, height: 1.4, ahead: 2.4 },
    { from: AZ + 12, to: AZ - 16, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -226, to: -252, pitch: 42, dist: 13.5, ahead: 2 },
  ],
  boss: {
    id: 'graf', name: 'Graf Brummbär', speed: 0,
    trigger: { min: [-8.5, YW - 0.5, AZ - 8.5], max: [8.5, YW + 8, AZ + 8.2] },
    lock: { min: [-2.6, YW - 0.5, AZ + R + 0.1], max: [2.6, YW + 5, AZ + R + 0.9] },
    warp: 'warp_sieg', warpPos: [0, YW, AZ - 6.5], warpTo: [0, YW + 0.3, -233], frame: 0.45, musicAfter: 'course_halloween_map',
    center: [0, YW, AZ], warpBanner: 'Ab in die Warp-Box!',
  },
  segments: [
    // ================================================================ 1 Vorhof
    isl(-9, 9, 12, -5, Y, 6),
    sign(-3.6, Y, 10.4, 'Schloss Schlotterstein\nHeute: Gruselgala!', { size: [3, 1.0] }),
    sign(3.4, Y, -3.4, 'Bitte die Skelette\nnicht erschrecken!', { size: [2.6, 0.9] }),
    { type: 'deco_hw', items: [
      { kind: 'grabsteine', pos: [-6.2, Y, 5.2], size: [4, 5], n: 4 },
      { kind: 'grabstein', pos: [-6.4, Y, 0.6], style: 'kreuz', size: 1.2 },
      { kind: 'grabstein', pos: [-4.6, Y, -1.6], style: 'rund' },
      { kind: 'zaun', from: [-3.4, Y, 9.6], to: [-3.4, Y, 2.4], style: 'eisen' },
      { kind: 'krummer_baum', pos: [-7.6, Y, -3.4], height: 5 },
      { kind: 'kuerbislaterne', pos: [-2.2, Y, 7.6], mount: 'pfahl', size: 0.7 },
      { kind: 'kuerbislaterne', pos: [2.2, Y, 7.6], mount: 'pfahl', size: 0.7 },
      { kind: 'kuerbislaterne', pos: [-2.2, Y, 1.6], mount: 'pfahl', size: 0.7 },
      { kind: 'kuerbislaterne', pos: [2.2, Y, 1.6], mount: 'pfahl', size: 0.7 },
      { kind: 'kuerbisse', pos: [6.6, Y, -2.6], size: [3, 3], n: 5, faces: 0.6 },
      { kind: 'kerzen', pos: [7.4, Y, 9.6], n: 4 },
    ] },
    { type: 'bridge', from: [0, Y, -5], to: [0, Y, -15], width: 3.6 },
    { type: 'nebel', pos: [0, Y - 4.5, -10], size: [24, 10], height: 2.2, density: 0.45 },
    isl(-9, 9, -15, -21, Y, 6),

    // ================================================================ 2 Ahnengalerie + Gruft
    isl(-6, 6, -21, -60, Y, 6),
    wand(-6.8, -6, -21, -60),
    wand(6, 6.8, -21, -34), wand(6, 6.8, -38.6, -60),
    { type: 'wall', pos: [6.4, Y + 3.4, -36.3], size: [0.8, HW - 3.4, 4.6], style: 'stone' },
    isl(GRUFT.x0, GRUFT.x1, GRUFT.z0, GRUFT.z1, Y, 6),
    wand(GRUFT.x0, GRUFT.x1 + 0.8, GRUFT.z1, GRUFT.z1 - 0.8, Y, 7.5),
    wand(GRUFT.x1, GRUFT.x1 + 0.8, GRUFT.z0, GRUFT.z1, Y, 7.5),
    isl(NISCHE.x0, NISCHE.x1, NISCHE.z0, NISCHE.z1, NISCHE.top, 6.5),
    { type: 'grabstein_schalter', id: 'gruftschalter', pos: SCHALTER, yaw: -PI / 2, press: 'pound', time: 12, on: { reveal: 'gruftweg' }, off: { hide: 'gruftweg' } },
    { type: 'appear', id: 'gruftweg', style: 'stone', delay: 0.15, parts: [
      { pos: [9.6, Y + 1.2, -44.8], size: [1.6, 0.5, 1.8] },
      { pos: [11.4, Y + 2.9, -44.8], size: [1.6, 0.5, 1.8] },
      { pos: [13.2, Y + 4.6, -44.8], size: [1.6, 0.5, 1.8] },
    ] },
    sign(11.6, Y, -32.4, 'Gruft der Brummbärs:\nfest aufstampfen!', { size: [2.6, 0.9] }),
    { type: 'deco_hw', items: [
      { kind: 'kerzenleuchter', pos: [-5.3, Y, -28.6], arms: 5, height: 1.6, light: true },
      { kind: 'kerzenleuchter', pos: [-5.3, Y, -42.4], arms: 3, height: 1.6 },
      { kind: 'kerzenleuchter', pos: [5.3, Y, -31.4], arms: 3, height: 1.6 },
      { kind: 'kerzenleuchter', pos: [5.3, Y, -57.4], arms: 5, height: 1.6, light: true },
      { kind: 'spinnweben', pos: [-5.8, Y + 4.8, -21.4], size: 1.4, yaw: 0.8 },
      { kind: 'spinnweben', pos: [5.8, Y + 4.8, -59.4], size: 1.4, yaw: -2.2 },
      { kind: 'fledermaus_girlande', from: [-6, Y + 4.6, -36], to: [6, Y + 4.6, -36], n: 9, sag: 0.9 },
      { kind: 'fledermaus_girlande', from: [-6, Y + 4.6, -50], to: [6, Y + 4.6, -50], n: 9, sag: 0.9 },
      // Gruft
      { kind: 'grabsteine', pos: [9.6, Y, -39.4], size: [3, 3], n: 3, avoid: [[SCHALTER[0], SCHALTER[2], 1.8]] },
      { kind: 'kerzen', pos: [8, Y, -46.6], n: 4, light: true },
      { kind: 'kerzen', pos: [18, Y + 6.5, -47], n: 3 },
      { kind: 'spinnweben', pos: [18.8, Y + 6, -31.4], size: 1.6, yaw: -0.8 },
    ] },

    // ================================================================ 3 Spukball-Saal
    isl(-11, 11, -60, -104.8, Y, 6),
    wand(-11.8, -11, -60, -104.8), wand(11, 11.8, -60, -104.8),
    wand(-11.8, -6, -60, -60.8), wand(6, 11.8, -60, -60.8),
    wand(-11.8, -2.2, -104, -104.8), wand(2.2, 11.8, -104, -104.8),
    { type: 'wall', pos: [0, Y + 4.4, -104.4], size: [4.4, HW - 4.4, 0.8], style: 'stone' },
    { type: 'spinnennetz_trampolin', id: 'saalnetz', pos: NETZ, size: [2.4, 2.4], height: 1, jump: 7.2 },
    sign(-4, Y, -89.6, 'Bonbon-Tresor:\nnur mit Kürbis-Bombe!', { size: [2.6, 0.9] }),
    { type: 'deco_hw', items: [
      { kind: 'kerzenleuchter', pos: [-10.2, Y, -62], arms: 5, height: 1.8, light: true },
      { kind: 'kerzenleuchter', pos: [10.2, Y, -62], arms: 5, height: 1.8, light: true },
      { kind: 'kerzenleuchter', pos: [10.2, Y, -102.6], arms: 3, height: 1.8 },
      { kind: 'kerzen', pos: [-10, Y, -80], n: 5, light: true },
      { kind: 'suessigkeiten', pos: [10, Y, -79], size: 1.3 },
      { kind: 'suessigkeiten', pos: [-10, Y, -88], size: 1.1 },
      { kind: 'fledermaus_girlande', from: [-11, Y + 5, -66], to: [11, Y + 5, -66], n: 13, sag: 1.2 },
      { kind: 'fledermaus_girlande', from: [-11, Y + 5, -94], to: [11, Y + 5, -94], n: 13, sag: 1.2 },
      { kind: 'spinnweben', pos: [-10.8, Y + 5, -103.8], size: 1.6, yaw: 0.8 },
      { kind: 'kuerbisse', pos: [KARREN[0] + 0.4, Y, KARREN[2] - 2.4], size: [2, 1.4], n: 3, faces: 1 },
    ] },

    // ================================================================ 4 Turmaufgang
    { type: 'stairs', pos: [0, Y, -104.8], dir: '-z', steps: 8, rise: 0.5, run: 0.9, width: 4.2, style: 'stone' },
    isl(-5, 5, -112, -121, YT),
    { type: 'geisterplattform', id: 'geisterbruecke', light: 'pfahl', color: 'lila', from: [0, YT - 0.5, -124.3], to: [0, YT - 0.5, -130.7], n: 3, size: [2.6, 0.5, 2.4] },
    isl(PFAHL[0] - 0.8, PFAHL[0] + 0.8, PFAHL[2] + 0.8, PFAHL[2] - 0.8, YT, 12, { top: 'rock' }),
    { type: 'laternenpfahl', id: 'bruckenpfahl', pos: PFAHL, radius: 6.2, blink: [5, 2.2], yaw: PI, style: 'laterne' },
    isl(-5, 5, -134, -142, YT2),
    sign(-3.6, YT, -113.4, 'Geisterbrücke:\nnur im Laternenlicht!', { size: [2.6, 0.9] }),
    { type: 'stairs', pos: [0, YT2, -142], dir: '-z', steps: 7, rise: 0.5, run: 0.9, width: 4.2, style: 'stone' },
    isl(-3, 3, -148.3, -186.5, YW),
    { type: 'deco_hw', items: [
      { kind: 'kuerbislaterne', pos: [-4.4, YT, -113], size: 0.6 },
      { kind: 'kuerbislaterne', pos: [4.4, YT, -113], size: 0.6 },
      { kind: 'kuerbislaterne', pos: [-3.3, YW + 1, -154], size: 0.55 },
      { kind: 'kuerbislaterne', pos: [3.3, YW + 1, -160], size: 0.55 },
      { kind: 'kuerbislaterne', pos: [-3.3, YW + 1, -172], size: 0.55 },
      { kind: 'kuerbislaterne', pos: [3.3, YW + 1, -178], size: 0.55 },
      { kind: 'fledermaus_girlande', from: [-4.6, YW + 4.4, -166], to: [4.6, YW + 4.4, -166], n: 8, sag: 0.8 },
      { kind: 'kerzen', pos: [-4.2, YT2, -140.6], n: 3 },
    ] },
    { type: 'deco_hw', shadow: false, items: [
      { kind: 'hexenturm', part: 'dach', pos: [-7, Y + 7.2, -18], radius: 2.3 },
      { kind: 'hexenturm', part: 'dach', pos: [7, Y + 7.2, -18], radius: 2.3 },
      { kind: 'hexenturm', part: 'dach', pos: [-6.6, YW + 5.2, -166], radius: 2.2 },
      { kind: 'hexenturm', part: 'dach', pos: [6.6, YW + 5.2, -166], radius: 2.2 },
    ] },

    // ================================================================ 5 Siegerbalkon
    isl(-7, 7, -229, -248, YW, 6, { top: 'grass' }),
    { type: 'deco_hw', items: [
      { kind: 'kuerbislaterne', pos: [-5.6, YW, -231], size: 0.8 },
      { kind: 'kuerbislaterne', pos: [5.6, YW, -231], size: 0.8 },
      { kind: 'kerzen', pos: [-5.6, YW, -246], n: 5, light: true },
      { kind: 'suessigkeiten', pos: [-4.4, YW, -240], size: 1.3 },
      { kind: 'kuerbisse', pos: [5.2, YW, -245.4], size: [2.6, 2.4], n: 4, faces: 0.8 },
    ] },
    { type: 'killplane', y: -10 },
  ],
  blocks: [
    { kind: 'question', pos: [0, Y + 2.3, 3.6], content: 'wachstumsbeere' },
    { kind: 'hidden', id: 'geheim_galerie', pos: [0, Y + 2.5, -44], content: 'oneup' },
    { kind: 'question', pos: [-3.2, YT + 2.3, -114.6], content: 'coins:5' },
    { kind: 'question', pos: [-1, Y + 2.3, -97], content: 'wachstumsbeere' },
  ],
  enemies: [
    kb('kb1', [4, Y, -1.6], { sight: 6 }),
    kb('kb2', [-2.5, Y, -3], { behavior: 'patrol', path: [[-3, Y, -3], [3, Y, -3]], sight: 0 }),
    kk('kk1', [-4, Y, -29], [4, Y, -29]),
    kk('kk2', [4, Y, -51], [-4, Y, -51]),
    { kind: 'spuk', id: 'grossspuk', pos: [-7, Y + 0.5, -72], size: 2.5, hat: 'hexe', sight: 12 },
    { kind: 'kreisgeist_kreis', id: 'geisterreigen', pos: [0, Y + 0.2, -80], count: 8, radius: 3.4, speed: 1.3 },
    kk('kk3', [-3, YT, -116.5], [3, YT, -116.5]),
    kb('kb4', [1.5, YT2, -138.5], { sight: 5 }),
    kk('kk4', [0, YW, -158], [0, YW, -170]),
    kb('kb5', [1.4, YW, -177.5], { sight: 5 }),
    kb('kb6', [-1.4, YW, -152], { behavior: 'patrol', path: [[-2, YW, -152], [2, YW, -152]], sight: 0 }),
    { kind: 'graf_brummbaer', id: 'graf', pos: [0, YW, AZ - 4], dir: [0, 1], arena: { center: [0, YW, AZ], r: 9 } },
  ],
  items: [
    // ---- 1
    naschen([0, Y + 0.6, 6.5], [0, Y + 0.6, 0.5], 4),
    line([0, Y + 1.2, -6.5], [0, Y + 1.2, -13.5], 5),
    naschKreis([-6.4, Y + 0.6, 6.6], 1.2, 4, 'lolli'),
    // ---- 2
    naschen([0, Y + 0.6, -23], [0, Y + 0.6, -27], 3, 'schoko'),
    line([0, Y + 0.6, -34], [0, Y + 0.6, -44], 5),
    naschen([0, Y + 0.6, -54], [0, Y + 0.6, -58], 3),
    naschen([9.6, Y + 2.3, -44.8], [13.2, Y + 5.7, -44.8], 3, 'zuckermais'),
    naschKreis([16.8, NISCHE.top + 0.6, -45.2], 1.1, 4, 'bonbon'),
    // ---- 3
    ring([0, Y + 0.6, -80], 5.2, 12),
    naschen([-7.2, Y + 0.6, -84], [-7.2, Y + 0.6, -90], 3, 'lolli'),
    naschKreis([LEUCHTER.x, LEUCHTER.top + 0.6, LEUCHTER.z], 1.0, 4, 'schoko'),
    // Bonbon-Tresor: 3 × 3 × 3 lila Ziegel, innen der Stern (Vorderwand bricht zuerst)
    { kind: 'lila_ziegelwand', id: 'tresor_vorn', pos: [TRESOR.x, Y, TRESOR.z + 1], size: [3, 2, 1], onBreak: { coins: 3 } },
    { kind: 'lila_ziegelwand', id: 'tresor_hinten', pos: [TRESOR.x, Y, TRESOR.z - 1], size: [3, 2, 1] },
    { kind: 'lila_ziegel', id: 'tresor_links', pos: [TRESOR.x - 1, Y, TRESOR.z] },
    { kind: 'lila_ziegel', id: 'tresor_links2', pos: [TRESOR.x - 1, Y + 1, TRESOR.z] },
    { kind: 'lila_ziegel', id: 'tresor_rechts', pos: [TRESOR.x + 1, Y, TRESOR.z] },
    { kind: 'lila_ziegel', id: 'tresor_rechts2', pos: [TRESOR.x + 1, Y + 1, TRESOR.z] },
    { kind: 'lila_ziegelwand', id: 'tresor_deckel', pos: [TRESOR.x, Y + 2, TRESOR.z], size: [3, 1, 3] },
    { kind: 'kuerbis_bombe', id: 'bombe1', pos: KARREN },
    { kind: 'kuerbis_bombe', id: 'bombe2', pos: [KARREN[0] + 0.9, Y, KARREN[2] - 0.3] },
    // ---- 4
    line([0, YT + 1.2, -124.3], [0, YT + 1.2, -130.7], 3),
    naschen([0, YW + 0.6, -150], [0, YW + 0.6, -156], 3, 'schoko'),
    line([0, YW + 0.6, -173], [0, YW + 0.6, -183], 5),
    // ---- 5
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, YW, AZ - 6.5], target: [0, YW + 0.3, -233], hidden: true },
    naschKreis([0, YW + 0.6, -237], 2.2, 8),
    ring([-3.6, YW + 0.6, -243], 1.2, 6),
  ],
  checkpoint: [{ pos: [0, Y, -100.6], yaw: PI / 2 }, { pos: [0, YW, -181.6], yaw: PI / 2 }],
  stars: [
    { pos: [17, NISCHE.top + 0.5, -45.6] },                                  // 0: Gruftnische (Grabstein-Schalter)
    { pos: [TRESOR.x, Y + 0.25, TRESOR.z] },                                  // 1: Bonbon-Tresor (Kürbis-Bombe)
    { pos: [0, YW + 0.4, AZ + 5], hidden: true, id: 'stern_graf' },           // 2: Graf Brummbär besiegt
  ],
  stamp: [LEUCHTER.x, LEUCHTER.top + 1.0, LEUCHTER.z],
  goal: { pos: [0, YW, -243.4], height: 9 },
  marks: {
    start: [0, Y, 9], bruecke: [0, Y, -10], tor: [0, Y, -18], galerie: [0, Y, -40], gruft: [10, Y, -36.5], schalter: SCHALTER,
    nische: [17, NISCHE.top, -45.6], saal: [0, Y, -80], tresor: [TRESOR.x, Y, TRESOR.z], karren: KARREN, leuchter: [LEUCHTER.x, LEUCHTER.top, LEUCHTER.z],
    checkpoint: [0, Y, -100.6], absatz: [0, YT, -116], geisterbruecke: [0, YT, -127.5], wehrgang: [0, YW, -165], arena: [0, YW, AZ], ziel: [0, YW, -243.4],
  },
};
