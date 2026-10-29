// S-9 „Kanonenhelm-Express durch die Neonstation“ (Bauplan S-9: Parcours, 400 s, ca. 350 m – futuristischer Weltraum mit
// Kanonen-Helm; Zugang ab 280 Sternen über die Weltkarte; eigene Gestaltung). Thema cosmic, Musik course_cosmic.
//
// 1. Startdeck (z 10 … −8): Kanonen-Helme liegen bereit (Helm feuert von selbst geradeaus, Aktion = sofort).
// 2. Schienenbrett-Fahrt (≈ 100 m): Brett 1 (z −10 … −62) an einer Bärenwand auf dem Gleis vorbei (abschießen oder
//    drüberspringen), Kanonenturm und Krakenpilz auf Seitendecks → Station M1 (rechts die rissige Wand: sprengen → Stern 0)
//    → Brett 2 mit der ersten Weiche (Zielscheibe am Signalmast links; umschießen, sonst dreht das Brett eine Kehrschleife)
//    → Kugelwand-Platz (Kontrollpunkt).
// 3. Kugelwand: Kanonen schießen große, langsame Kugeln quer – von Kugel zu Kugel 20 m hinauf zur Gipfelplattform. Dort drei
//    ?-Blöcke über dem All: alle drei beschießen → eine Brücke erscheint zum Stempel-Planetoiden.
// 4. Sprung ins Sternenbecken, Unterwassertunnel (≈ 60 m) unter einer Glasdecke mit Tintlingen; rechts in der Wand Ziegel:
//    abtauchen und wegschießen → Stern 1. Ausstieg am Kontrollpunkt-Deck.
// 5. Schienennetz (≈ 150 m): Brett „Netz“ mit drei Weichen – die ersten beiden führen in Kehrschleifen (umschießen, sonst
//    neuer Anlauf), die dritte (Sternweiche) zweigt zum Sternweg ab: dort die Sternkapsel abschießen, bevor das Brett am
//    Gleisende fällt (Stern 2; unten fängt eine Rettungsplattform auf, Warp-Box zurück). Am Ende des Hauptgleises fällt das
//    Brett unter das Zieldeck – man steigt dabei aufs Deck → Zielmast.
// Gegner: Kanonentürme 3 (Projektilköpfe), Krakenpilze 3, Tintlinge 3.

import { PI, line, ring, arc, column, sign, isl, Bld, litTop, sternkapsel, kanonenFrageBloecke, glasdecke, deckZier, signalLampen, tunnelZier, fernSicht, neonBoden, weltraumPflanzen, riffZier, irrlichter, klaresWasser, asteroiden, bojen } from './_helpers_d.js';

const Y = -0.62;          // Knotenhöhe für Decks mit Oberseite 0 (Brett-Deck 0,62 m über der Schiene)
const Y6 = -0.02;         // Knotenhöhe für Decks mit Oberseite 0,6
const YT = 20;            // Gipfelplattform der Kugelwand

const deck = (x0, x1, zA, zB, top = 0, o = {}) => isl(x0, x1, zA, zB, top, o.h ?? 1.2, { top: 'stone', under: o.under ?? 1.4, ...o });

/** Statische Kulisse und Sonderbauten (vor den Items). */
function build(level) {
  deckZier(level, [
    { x0: -7, x1: 7, z0: 10, z1: -8.2, top: 0 },
    { x0: 4.4, x1: 9.4, z0: -28, z1: -36, top: 0, edge: 'pink', stripes: false },
    { x0: -10, x1: -4.6, z0: -24, z1: -32, top: 0, edge: 'gruen', stripes: false },
    { x0: -13, x1: -3, z0: -63.3, z1: -76, top: 0 },
    { x0: -1.6, x1: 2.4, z0: -91.4, z1: -98.6, top: 0, edge: 'pink', stripes: false },
    { x0: -16, x1: 8, z0: -113.3, z1: -136.6, top: 0, edge: 'gold' },
    { x0: -15, x1: 6, z0: -130.1, z1: -137.6, top: YT, edge: 'pink', jets: true, under: 1 },
    { x0: 18.6, x1: 26, z0: -129.4, z1: -137.6, top: YT, edge: 'gruen', stripes: false },
    { x0: -14, x1: 2, z0: -216, z1: -230, top: 0.6 },
    { x0: 0, x1: 6, z0: -281, z1: -289, top: 0.6, edge: 'pink', stripes: false },
    { x0: -18, x1: -12.6, z0: -305, z1: -313, top: 0.6, edge: 'gruen', stripes: false },
    { x0: -10, x1: 4, z0: -308, z1: -322, top: -7, edge: 'gold', stripes: false, jets: false },
    { x0: -16, x1: 4, z0: -347.4, z1: -362, top: 0.6, edge: 'gold' },
  ]);
  // Rissige Wand an der Station M1 (Stern 0): Nische rechts, hohe Stationswände ringsum (unsichtbare Sperre darüber)
  {
    const b = new Bld();
    b.box(6.4, 6, 0.6, 0.2, 0, -65.7, litTop(0x8a90b8), { r: 0 });
    b.box(6.4, 6, 0.6, 0.2, 0, -73.3, litTop(0x8a90b8), { r: 0 });
    b.box(0.6, 6, 8.2, 3.4, 0, -69.5, litTop(0x7a80a8), { r: 0 });
    b.box(6.4, 0.4, 8.2, 0.2, 6, -69.5, 0xd8e0f4, { r: 0 });
    for (const z of [-66.2, -72.8]) b.box(6, 0.12, 0.1, 0.2, 3.4, z + (z > -69 ? -0.35 : 0.35), 0x4ae8ff, { r: 0 });
    b.flush(level, { castShadow: true });
    level.world.add({ type: 'box', min: [-3, 0, -66], max: [3.4, 6, -65.4], tag: 'stationswand' });
    level.world.add({ type: 'box', min: [-3, 0, -73.6], max: [3.4, 6, -73], tag: 'stationswand' });
    level.world.add({ type: 'box', min: [3.1, 0, -73.6], max: [3.7, 6, -65.4], tag: 'stationswand' });
    level.world.add({ type: 'box', min: [-3.4, 4.2, -73.6], max: [-2.6, 12, -65.4], camIgnore: true, tag: 'sperre' });
  }
  // Kanonen-Turm (Mast der Kugelwand), Becken, Tunnel
  {
    const b = new Bld(), g = new Bld();
    b.box(2.2, 21, 13.6, -15.8, 0, -123.1, litTop(0x6a6e98), { r: 0 });
    for (let i = 0; i < 9; i++) g.box(0.12, 0.12, 13.4, -14.66, 1.6 + i * 2.2, -123.1, i % 2 ? 0x4ae8ff : 0xff4ad8, { r: 0 });
    b.cyl(0.5, 0.7, 2.4, -15.8, 21, -123.1, 0xd8e0f4, 8);
    g.sphere(0.6, -15.8, 24, -123.1, 0xff4ad8);
    // Sprungbrett und Beckenrand
    b.box(2.4, 0.3, 2.4, -6, YT - 0.3, -138.6, 0xd8e0f4, { r: 0 });
    for (const x of [-7, -5]) b.box(0.2, 0.2, 2.4, x, YT, -138.6, 0x4ae8ff, { r: 0 });
    b.flush(level, { castShadow: true });
    g.flush(level, { material: 'glow' });
    level.world.add({ type: 'box', min: [-7.2, YT - 0.3, -139.8], max: [-4.8, YT, -137.4], tag: 'sprungbrett' });
    // Becken- und Tunnelwände (fest), Tunnelboden, Nische mit Ziegeln (Stern 1)
    const W = (x0, x1, y0, y1, z0, z1, col = 0x7a80a8) => {
      level.world.add({ type: 'box', min: [x0, y0, z1], max: [x1, y1, z0], tag: 'tunnelwand' });
      if (level.view) b.box(x1 - x0, y1 - y0, z0 - z1, (x0 + x1) / 2, y0, (z0 + z1) / 2, litTop(col), { r: 0 });
    };
    W(-10.8, -10, -8.4, 1, -137.4, -216);
    W(-2, -1.2, -8.4, 1, -137.4, -176.5); W(-2, -1.2, -8.4, -3, -176.5, -179.5); W(-2, -1.2, -1, 1, -176.5, -179.5); W(-2, -1.2, -8.4, 1, -179.5, -216);
    W(-10.8, -1.2, -8.4, 1, -136.6, -137.4);
    W(-10.8, -1.2, -8.4, -1.2, -216, -216.8);
    // Nische hinter den Ziegeln
    W(-1.2, 2.2, -3.4, -3, -176.3, -179.7, 0x5a6088); W(-1.2, 2.2, -1, -0.6, -176.3, -179.7, 0x5a6088);
    W(1.8, 2.2, -3, -1, -176.3, -179.7, 0x5a6088); W(-1.2, 2.2, -3, -1, -176, -176.3, 0x5a6088); W(-1.2, 2.2, -3, -1, -179.7, -180, 0x5a6088);
    b.flush(level, { castShadow: false });
  }
  klaresWasser(level, { pos: [-6, -8.4, -176.7], size: [8, 8.4, 78.6], surface: [[-137.4, -150], [-208, -216]] });
  glasdecke(level, { x0: -10, x1: -2, z0: -150, z1: -208, y: -0.6, thick: 0.35, ribs: 4 });
  // unsichtbare Sperre über der Glasdecke: der Tunnel wird durchtaucht, nicht oben überlaufen (die Decke liegt knapp unter
  // dem Wasserspiegel des offenen Beckens)
  level.world.add({ type: 'box', min: [-10, -0.25, -208], max: [-2, 25, -150], camIgnore: true, noWallSlide: true, tag: 'sperre' });
  tunnelZier(level, { x0: -10, x1: -2, z0: -151, z1: -207, y0: -5, y1: -0.6 });
  signalLampen(level, [
    { pos: [-9.6, 0, -88], color: 'gruen' }, { pos: [-7.6, 0.6, -242], color: 'pink' }, { pos: [-0.8, 0.6, -266], color: 'cyan' }, { pos: [-7.6, 0.6, -290], color: 'gold' },
  ]);
  // Rettungsplattform unter dem Sternweg: Netz-Optik
  {
    const g = new Bld();
    for (let i = 0; i <= 7; i++) { g.box(14, 0.05, 0.08, -3, -6.98, -308 - i * 2, 0x8af4ff, { r: 0 }); g.box(0.08, 0.05, 14, -10 + i * 2, -6.98, -315, 0x8af4ff, { r: 0 }); }
    g.flush(level, { material: 'glow' });
  }
  // Neon-Bodenzeichen, Weltraum-Pflanzen, Riff im Tunnel, Leuchtquallen
  neonBoden(level, [
    { kind: 'ring', pos: [0, 0, -2.6], r: 1.3, color: 'cyan' }, { kind: 'pfeile', pos: [0, 0, -5.4], color: 'gold' }, { kind: 'feld', pos: [-4.4, 0, 2.8], n: 3, cell: 0.9 },
    { kind: 'feld', pos: [4.6, 0, -2.2], n: 2, cell: 0.9 },
    { kind: 'pfeile', pos: [-8, 0, -72.6], color: 'gruen' }, { kind: 'feld', pos: [-5, 0, -74.6], n: 2, cell: 0.9 },
    { kind: 'feld', pos: [5.4, 0, -120.6], n: 3, cell: 1 }, { kind: 'pfeile', pos: [-4, 0, -114.6], dir: [-1, 0], color: 'pink' },
    { kind: 'pfeile', pos: [-6, YT, -135.4], color: 'cyan' }, { kind: 'ring', pos: [22, YT, -133.5], r: 1.1, color: 'gold' },
    { kind: 'pfeile', pos: [-6, 0.6, -225.6], color: 'gold' }, { kind: 'feld', pos: [-1.2, 0.6, -218.4], n: 2, cell: 0.9 },
    { kind: 'ring', pos: [-6, 0.6, -355.4], r: 2.6, color: 'pink' }, { kind: 'pfeile', pos: [-6, 0.6, -349.2], color: 'cyan' }, { kind: 'feld', pos: [0.4, 0.6, -352.4], n: 3, cell: 1 },
  ]);
  weltraumPflanzen(level, [
    { pos: [6, 0, 2.6] }, { pos: [-6.2, 0, 3.4], size: 0.9 }, { pos: [-4.4, 0, -64.4], size: 0.85 }, { pos: [7, 0, -135.2] },
    { pos: [4.6, YT, -131], size: 0.8 }, { pos: [4.6, YT, -136.4], size: 0.8 }, { pos: [25, YT, -133.6], size: 0.9 },
    { pos: [1, 0.6, -217.2], size: 0.85 }, { pos: [-13.2, 0.6, -223], size: 0.9 }, { pos: [2.6, 0.6, -349.2] }, { pos: [-14.6, 0.6, -355] },
  ]);
  const RIFF = [];
  const kinds = ['koralle', 'tang', 'roehren', 'seestern', 'faecher', 'muschel', 'koralle', 'tang', 'seestern'];
  for (let i = 0, z = -151.6; z > -207; z -= 2.1, i++) {
    RIFF.push({ pos: [-9.2 + (i % 2) * 0.4, -5, z], kind: kinds[i % kinds.length], size: 1.4 + (i % 3) * 0.2 });
    if (z > -174 || z < -182) RIFF.push({ pos: [-2.8 - (i % 2) * 0.4, -5, z - 1.05], kind: kinds[(i + 4) % kinds.length], size: 1.3 + (i % 2) * 0.25 });
  }
  // Sandstreifen am Tunnelrand (unter dem Riff)
  {
    const b = new Bld();
    for (const [xa, xb] of [[-10, -8.2], [-3.8, -2]]) b.box(xb - xa, 0.06, 56, (xa + xb) / 2, -5, -179, 0xf4dcb0, { r: 0 });
    b.flush(level, { castShadow: false });
  }
  RIFF.push({ pos: [-9, -8, -140], kind: 'koralle', size: 1.4 }, { pos: [-3, -8, -146], kind: 'roehren', size: 1.3 }, { pos: [-8.6, -8, -147], kind: 'tang', size: 1.4 },
    { pos: [-3.2, -6.5, -211], kind: 'faecher', size: 1.2 }, { pos: [-9, -6.5, -213], kind: 'koralle', size: 1.2 });
  riffZier(level, RIFF);
  irrlichter(level, [[-8.6, -3.4, -158, 0xff8ad8], [-3.4, -3, -169, 0x8af4ff], [-8.4, -2.8, -186, 0xc8ff6a], [-3.4, -3.6, -197, 0xffb0e8], [-8.6, -3.2, -204, 0x8af4ff],
    [-4, -6, -142, 0xffe27a]].map(([x, y, z, color]) => ({ pos: [x, y, z], color })), { size: 1.6 });
  // Schwebende Asteroiden unter den Gleisen, Leucht-Bojen neben den Gleisen
  asteroiden(level, [
    { pos: [-20, -4, -250], r: 2 }, { pos: [12, -6, -240], r: 1.4 }, { pos: [14, -3, -300], r: 1.8 }, { pos: [-22, -2, -290], r: 1.2 },
    { pos: [-26, -6, -330], r: 2.4 }, { pos: [10, -8, -335], r: 1.6 }, { pos: [18, 2, -60], r: 1.5 }, { pos: [-20, -5, -45], r: 2 },
    { pos: [-24, 3, -100], r: 1.4 }, { pos: [14, -5, -100], r: 1.8 }, { pos: [12, -4, -14], r: 1.3 }, { pos: [-18, -7, -200], r: 2.2 },
  ]);
  bojen(level, [
    { pos: [2.6, 0, -16] }, { pos: [-2.6, 0, -42] }, { pos: [-11, 0, -56] }, { pos: [-10.8, 0, -84] }, { pos: [-1.6, 0, -106] },
    { pos: [-3, 0.6, -238] }, { pos: [-12.6, 0.6, -246] }, { pos: [1.2, 0.6, -262] }, { pos: [-8.4, 0.6, -268] }, { pos: [-13.2, 0.6, -296] },
    { pos: [0.8, 0.6, -312] }, { pos: [-12.6, 0.6, -324] }, { pos: [-2.6, 0.6, -336] },
  ]);
  // Sternkapsel am Ende des Sternwegs (Stern 2): Kanonenkugel trifft → der Stern fliegt zur Schützin
  sternkapsel(level, { id: 'kapsel', pos: [-2.4, 1.5, -321], star: 2, r: 0.9 });
}

function setup(level) {
  // ?-Blöcke über dem All lösen auch bei Kanonenkugeln aus; alle drei benutzt → Brücke zum Stempel-Planetoiden
  fernSicht(level, { dist: 85, models: ['weiche'], modelDist: 60 });
  kanonenFrageBloecke(level, { id: 'stempelbloecke', ids: ['qb1', 'qb2', 'qb3'], onAll: { reveal: 'sternbruecke' }, pos: [18, YT + 1.5, -133.5] });
}

export const LEVEL = {
  id: 'S-9',
  world: 9,
  title: 'Kanonenhelm-Express durch die Neonstation',
  archetype: 'parcours',
  theme: 'cosmic',
  music: 'course_cosmic',
  timeLimit: 400,
  killY: -18,
  farHide: 60,
  instances: { coin: { farHide: 46, shadow: false } },
  build,
  setup,
  start: { pos: [0, 0, 6], yaw: PI / 2 },
  camera: [
    { from: 14, to: -62, pitch: 42, dist: 14, fov: 40, height: 1.2 },
    { from: -62, to: -112, pitch: 44, dist: 14, fov: 40, height: 1.2 },
    { from: -112, to: -129.5, pitch: 34, dist: 17, fov: 44, height: 3.2, x: -6, xLock: 0.6 },
    { from: -129.5, to: -140, pitch: 48, dist: 14, fov: 42, height: 1.4 },
    { from: -140, to: -214, pitch: 52, dist: 13, fov: 40, height: 0.4, x: -6, xLock: 0.8 },
    { from: -214, to: -364, pitch: 44, dist: 14.5, fov: 40, height: 1.2 },
  ],
  segments: [
    // ================================================================ 1 Startdeck
    deck(-7, 7, 10, -8.2, 0, { h: 1.6 }),
    sign(-4.6, 0, 7.6, 'Neonstation', { yaw: 0.2 }),
    sign(4.4, 0, 7.4, 'Helm auf –\nund feuern!', { size: [2.6, 1.05], yaw: -0.2 }),
    // ================================================================ 2 Schienenbrett-Fahrt
    { type: 'schienenbrett', id: 'brett1', start: 'A', next: 'B', speed: 5, end: 'halt',
      nodes: { A: [0, Y, -9.6], B: [0, Y, -38], C: [-8, Y, -50], D: [-8, Y, -62] }, rails: [['A', 'B'], ['B', 'C'], ['C', 'D']] },
    deck(4.4, 9.4, -28, -36),                           // Seitendeck Kanonenturm
    deck(-10, -4.6, -24, -32),                          // Seitendeck Krakenpilz
    deck(-13, -3, -63.3, -76),                          // Station M1
    deck(-3, 3.1, -66, -73),                            // Nische hinter der rissigen Wand
    sign(-11.6, 0, -66.4, 'Station M1', { yaw: 0.3 }),
    { type: 'schienenbrett', id: 'brett2', start: 'E', next: 'F', speed: 5, end: 'halt',
      nodes: { E: [-8, Y, -77.3], F: [-8, Y, -90], G: [-4.4, Y, -100], I: [-4.4, Y, -112], H: [-11.6, Y, -100], H2: [-15, Y, -92] },
      rails: [['E', 'F'], ['F', 'G'], ['G', 'I'], ['F', 'H'], ['H', 'H2'], ['H2', 'E']], weichen: { F: { to: ['H', 'G'], state: 0 } } },
    deck(-1.6, 2.4, -91.4, -98.6),                      // Seitendeck Kanonenturm 2
    // ================================================================ 3 Kugelwand-Platz, Kugelwand, Gipfel, Stempel
    deck(-16, 8, -113.3, -136.6, 0, { h: 1.6 }),
    sign(4.6, 0, -116, 'Auf die Kugeln!', { yaw: -0.3 }),
    { type: 'kanonenkugel_wand', id: 'kugeln', pos: [-14, 0.6, -117.5], dir: [1, 0], rows: 9, rise: 2.2, step: [0, 0, -1.4], range: 14, speed: 3, period: 3.2, stagger: 0.55, shadow: false },
    isl(-15, 6, -130.1, -137.6, YT, 1.2, { top: 'stone', under: 1 }),
    sign(-12.6, YT, -134.6, 'Kopfsprung\nins Becken!', { size: [2.6, 1.05], yaw: 0.2 }),
    { type: 'appear', id: 'sternbruecke', style: 'block', color: 'cyan', delay: 0.14,
      parts: [7.1, 9.3, 11.5, 13.7, 15.9, 18.1].map((x) => ({ pos: [x, YT - 0.5, -133.5], size: [2.1, 0.5, 2.4] })) },
    isl(18.6, 26, -129.4, -137.6, YT, 1.2, { top: 'stone', under: 1 }),
    // ================================================================ 4 Sternenbecken und Unterwassertunnel
    { type: 'water', id: 'tunnelwasser', pos: [-6, -8.4, -176.7], size: [8, 8.4, 78.6], show: false },   // Darstellung: klaresWasser
    isl(-10, -2, -137.4, -150, -8, 1, { top: 'stone', under: 0 }),
    isl(-10, -2, -150, -208, -5, 3.4, { top: 'stone', under: 0 }),
    isl(-10, -2, -208, -216, -6.5, 1.9, { top: 'stone', under: 0 }),
    // ================================================================ 5 Kontrollpunkt-Deck, Schienennetz, Ziel
    deck(-14, 2, -216, -230, 0.6, { h: 1.8 }),
    sign(-12, 0.6, -218.6, 'Weichen\numschießen!', { size: [2.6, 1.05], yaw: 0.3 }),
    { type: 'schienenbrett', id: 'netz', start: 'N0', next: 'N1', speed: 5, end: 'fallen', respawn: 2.5,
      nodes: {
        N0: [-6, Y6, -231.4], N1: [-6, Y6, -244], N2l: [-9.6, Y6, -254], L1a: [-17, Y6, -248], L1b: [-16, Y6, -236],
        N2r: [-2.4, Y6, -254], N3: [-2.4, Y6, -268], N4r: [1.2, Y6, -278], L2a: [8, Y6, -272], L2b: [7, Y6, -258],
        N4l: [-6, Y6, -278], N5: [-6, Y6, -292], N6s: [-2.4, Y6, -302], S1: [-2.4, Y6, -315],
        N6: [-9.6, Y6, -302], N7: [-9.6, Y6, -318], N8: [-6, Y6, -330], G: [-6, Y6, -346.6],
      },
      // Reihenfolge zählt: an N0 und N2r führt das erste Gleis weiter (Kehrschleifen münden dort ein)
      rails: [['N0', 'N1'], ['N1', 'N2l'], ['N2l', 'L1a'], ['L1a', 'L1b'], ['L1b', 'N0'],
        ['N2r', 'N3'], ['N1', 'N2r'], ['N3', 'N4r'], ['N4r', 'L2a'], ['L2a', 'L2b'], ['L2b', 'N2r'],
        ['N3', 'N4l'], ['N4l', 'N5'], ['N5', 'N6'], ['N5', 'N6s'], ['N6s', 'S1'], ['N6', 'N7'], ['N7', 'N8'], ['N8', 'G']],
      weichen: { N1: { to: ['N2l', 'N2r'], state: 0 }, N3: { to: ['N4r', 'N4l'], state: 0 }, N5: { to: ['N6', 'N6s'], state: 0 } } },
    deck(0, 6, -281, -289, 0.6),                        // Seitendeck Kanonenturm 3
    deck(-18, -12.6, -305, -313, 0.6),                  // Seitendeck Krakenpilz 2
    isl(-10, 4, -308, -322, -7, 1.4, { top: 'stone', under: 1 }),   // Rettungsplattform unter dem Sternweg
    isl(-16, 4, -347.4, -362, 0.6, 1.4, { top: 'stone', under: 1.2 }),
    sign(-13, 0.6, -350, 'Endstation\nZielmast', { size: [2.6, 1.05], yaw: 0.3 }),
    // ================================================================ Kulisse (Neon, Planeten, Raketen, Kuppeln)
    { type: 'deco_star', items: [
      { kind: 'antenne', pos: [-5.6, 0, -5.4], yaw: 0.6 }, { kind: 'neonring', pos: [5.4, 0, -6.2], radius: 1.3, color: 'pink', yaw: 0.4 }, { kind: 'leuchtsaeule', pos: [-6.2, 0, 8.6], height: 4.5 },
      { kind: 'leuchtsaeule', pos: [6.2, 0, 8.6], height: 4.5 }, { kind: 'rakete', pos: [-12, -3, -16], height: 5, color: 'rot' },
      { kind: 'planet', pos: [22, 8, -30], radius: 4, color: 'mint', variant: 'ring' }, { kind: 'planet', pos: [-26, 12, -80], radius: 5, color: 'rosa', variant: 'eis' },
      { kind: 'kristall', pos: [-12, 0, -74.6], n: 4, color: 'lila' }, { kind: 'neonring', pos: [-11.6, 0, -70], radius: 1.1, color: 'gruen', yaw: 1.2 },
      { kind: 'antenne', pos: [6.6, 0, -33.4], yaw: -2.2 }, { kind: 'leuchtsaeule', pos: [-13.6, 0, -114.6], height: 5 }, { kind: 'leuchtsaeule', pos: [6.6, 0, -114.6], height: 5 },
      { kind: 'neonring', pos: [2, 0, -126], radius: 2.2, color: 'cyan', yaw: PI / 2 }, { kind: 'planet', pos: [30, 14, -140], radius: 6, color: 'lila', variant: 'ring' },
      { kind: 'komet', pos: [-30, 24, -150], size: 1.6, dir: [1, -0.3, 0] }, { kind: 'leuchtsaeule', pos: [-13, YT, -136.6], height: 3.4 }, { kind: 'neonring', pos: [24.6, YT, -136.4], radius: 1.2, color: 'pink', yaw: 0.3 },
      { kind: 'kristall', pos: [24.4, YT, -130.4], n: 5, color: 'mint' }, { kind: 'planet', pos: [16, -2, -180], radius: 7, color: 'blau', variant: 'pilz' },
      { kind: 'antenne', pos: [-12.6, 0.6, -228], yaw: 0.8 }, { kind: 'leuchtsaeule', pos: [0.8, 0.6, -228.6], height: 4 },
      { kind: 'rakete', pos: [16, -6, -260], height: 6, color: 'blau' }, { kind: 'planet', pos: [-34, 10, -300], radius: 7, color: 'gold', variant: 'ring' },
      { kind: 'neonring', pos: [-14.6, 0.6, -360.4], radius: 1.4, color: 'gold', yaw: 0.2 }, { kind: 'leuchtsaeule', pos: [2.4, 0.6, -360.4], height: 5 },
      { kind: 'kristall', pos: [-14.4, 0.6, -349.4], n: 4, color: 'rosa' }, { kind: 'komet', pos: [24, 20, -330], size: 1.4, dir: [-1, -0.2, 0.3] },
    ] },
    { type: 'deco_star', kind: 'modell', pos: [-6, 0.6, -361], name: 'sternen_torbogen', opts: { width: 7, height: 5.5 }, yaw: -PI / 2 },
    { type: 'deco_star', kind: 'modell', pos: [4.2, 0, -132], name: 'weltraum_kuppel', opts: { size: 5 } },
  ],
  blocks: [
    { kind: 'question', id: 'qb1', pos: [18, YT + 0.5, -129.6], content: 'coin' },
    { kind: 'question', id: 'qb2', pos: [18, YT + 0.5, -131.4], content: 'coin' },
    { kind: 'question', id: 'qb3', pos: [18, YT + 0.5, -136.2], content: 'coin' },
    { kind: 'blockwand', pos: [-1.05, -3, -178], size: [1, 2, 3], block: 'brick' },      // Ziegel im Tunnel (Stern 1), 0,45 m eingelassen
    { kind: 'hidden', pos: [3.4, 2.4, 1], content: 'oneup' },                            // Extraleben auf dem Startdeck
    { kind: 'hidden', pos: [-8, 2.4, -122.6], content: 'oneup' },                        // Extraleben unter der Kugelwand
    { kind: 'question', pos: [-2.6, 2.4, -224], content: 'coins:5' },
  ],
  enemies: [
    { kind: 'kanone_turm', id: 'turm1', pos: [7, 0, -32], dir: [-1, 0], interval: 3.2, range: 22, first: 2.2 },
    { kind: 'kanone_turm', id: 'turm2', pos: [0.4, 0, -95], dir: [-1, 0], interval: 3.2, range: 20, first: 2.2 },
    { kind: 'kanone_turm', id: 'turm3', pos: [3, 0.6, -285], dir: [-1, 0], interval: 3.2, range: 22, first: 2.2 },
    { kind: 'krakenpilz', id: 'kp1', pos: [-7.3, 0, -28], sight: 9, interval: 3 },
    { kind: 'krakenpilz', id: 'kp2', pos: [-15.3, 0.6, -309], sight: 9, interval: 3, first: 1.6 },
    { kind: 'krakenpilz', id: 'kp3', pos: [-11, 0, -73.6], behavior: 'hop', sight: 6, spit: false },
    { kind: 'tintling', id: 'tl1', pos: [-6, -4.6, -164], sight: 8, range: 2.6 },
    { kind: 'tintling', id: 'tl2', pos: [-5, -4.6, -192], sight: 8, range: 2.6, phase: 0.5 },
    { kind: 'tintling', id: 'tl3', pos: [-6, -7.6, -145], sight: 7, range: 2.4 },
  ],
  items: [
    // Kanonen-Helme (liegen nach dem Aufheben bald wieder bereit)
    { kind: 'helm_kanone', id: 'helm1', pos: [-2.2, 0, 1.6], respawn: 3 }, { kind: 'helm_kanone', id: 'helm1b', pos: [2.2, 0, 1.6], respawn: 3 },
    { kind: 'helm_kanone', id: 'helm2', pos: [-11, 0, -67], respawn: 3 },
    { kind: 'helm_kanone', id: 'helm3', pos: [-4, 0, -117], respawn: 3 },
    { kind: 'helm_kanone', id: 'helm4', pos: [-10, YT, -132.6], respawn: 3 },
    { kind: 'helm_kanone', id: 'helm5', pos: [-2.4, 0.6, -221], respawn: 3 },
    // Bärenwand auf dem Gleis (abschießen oder drüberspringen), rissige Wand (Stern 0)
    { kind: 'holzwand', id: 'baerenwand', pos: [0, 0, -22], size: [2.8, 1.3, 0.5], face: true, content: 'coins:3' },
    { kind: 'felsblock', id: 'risswand', pos: [-3, 0, -69.5], size: [0.8, 4.2, 7], look: 'wand', by: ['bomb', 'cannon', 'mega'] },
    // Warp-Boxen: Rettungsplattform → Kontrollpunkt-Deck
    { kind: 'warpbox', id: 'rettung', pos: [-3, -7, -314], target: 'cpbox' },
    { kind: 'warpbox', id: 'cpbox', pos: [-11, 0.6, -226], target: 'rettung' },
    // Bitcoin-Pfade
    line([0, 0.6, 4], [0, 0.6, -6], 5), line([0, 1.4, -12], [0, 1.4, -20], 4), line([0, 1.4, -25], [0, 1.4, -36], 5), line([-1.4, 1.4, -40], [-6.6, 1.4, -48], 4),
    line([-8, 1.4, -52], [-8, 1.4, -60], 4), ring([1, 1, -69.5], 1.6, 6), line([-8, 1.4, -80], [-8, 1.4, -88], 4), line([-5, 1.4, -98], [-4.4, 1.4, -110], 6),
    ...arc([-12.6, 2.8, -117.5], [1, 2.8, -117.5], 6, 0.6), ring([-6, YT + 0.6, -134], 2, 8),
    line([7, YT + 0.6, -133.5], [17, YT + 0.6, -133.5], 6), ring([22, YT + 0.6, -133.5], 2, 6),
    line([-6, -1.6, -152], [-6, -1.6, -172], 7), line([-6, -1.6, -182], [-6, -1.6, -204], 8), column(-6, -146, -6, -2, 4),
    line([-6, 1.8, -234], [-6, 1.8, -242], 3), line([-2.4, 1.8, -256], [-2.4, 1.8, -266], 4), line([-6, 1.8, -280], [-6, 1.8, -290], 4),
    line([-9.6, 1.8, -304], [-9.6, 1.8, -316], 4), line([-8.4, 1.8, -332], [-6, 1.8, -344], 4), line([-2.4, 1.8, -304], [-2.4, 1.8, -312], 3),
    ring([-6, 1.2, -356], 2.2, 8), line([-16, 1.8, -240], [-12, 1.8, -250], 3), line([8, 1.8, -262], [8, 1.8, -270], 3),
  ],
  checkpoint: [{ pos: [-4, 0, -117.6], yaw: PI / 2 }, { pos: [-6, 0.6, -220], yaw: PI / 2 }],
  stars: [
    [0.6, 0.4, -69.5],                                                   // 0: hinter der rissigen Wand an Station M1
    [0.4, -2.75, -178],                                                  // 1: in der Ziegelnische im Unterwassertunnel
    { pos: [-2.4, 0.9, -321], hidden: true, id: 'kapselstern' },          // 2: in der Sternkapsel am Ende des Sternwegs
  ],
  stamp: [22, YT + 0.3, -133.5],
  goal: [-6, 0.6, -355.4],
  marks: {
    start: [0, 0, 6], brett1: [0, 0, -8], m1: [-8, 0, -66], riss: [-5.4, 0, -69.5], brett2: [-8, 0, -75.8], platz: [-4, 0, -116], kugeln: [-10, 0, -118],
    gipfel: [-6, YT, -133.4], bloecke: [5.6, YT, -133.5], sprung: [-6, YT, -138.4], becken: [-6, -2, -143], tunnel: [-6, -1.6, -170], ziegel: [-3, -2.4, -178],
    cp: [-6, 0.6, -222], netz: [-6, 0.6, -229.4], sternweg: [-2.4, 0.6, -306], rettung: [-3, -7, -311], ziel: [-6, 0.6, -351],
  },
};
