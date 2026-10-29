// S-1 „Regenbogenritt durchs Sternenzelt“ – Welt Stern „Sternenzelt“ (Bonuswelt 9; Bauplan: Detail S-1). Parcours mit
// Ritt-Abschnitt (Archetyp parcours_ride): schwebende Regenbogen-Plattformen mit Hüpfmäusen und Trapezen über die Lücken,
// ein Sprung auf Pflaume, die im Sternenbach schwimmt, Reitfahrt durchs All, Fackelplatz mit Sternfackeln und Wolkenkanone,
// Riesentrank-Strecke mit Sternblock-Mauern, Druckknopf-Finale mit Münzregen. Thema rainbow, Musik course_rainbow, 400 s,
// ≈ 350 m Weg nach −Z.
//
// Abschnitte (+X = rechts im Bild; Plattformen oben y 0, Sternenbach y −1 … −2):
//   1  Regenbogenwege   z  10 …  −87   Startplatz (Krallen-Anzug im ?-Block), Weg mit dem ersten Ziegelpaar und dem
//                                     Kristallturm (oben: Röhrensims über den Ziegeln), drei Lücken mit Trapezen
//                                     (eins, drei, eins) unter Regenbogen-Bögen, Hüpfmäuse auf jeder Plattform
//   2  Pflaume-Sprung   z −87 … −108   vom Steg auf Pflaume springen (sie schwimmt im Sternenbach), Kontrollpunkt am Ufer
//   3  Reitfahrt        z −108 … −207  Sternenbach mit Kurven, Temposchwellen, versteckter ?-Block (Funkenblüte), rechter
//                                     Seitenarm mit dem Stempel („rechts halten“), Strand am Fackelplatz
//   4  Fackelplatz      z −204 … −236  zwei Sternfackeln (nur Feuer) → Wolkenkanone in den Wolkenhimmel (Sternring);
//                                     ?-Block mit Funkenblüte, zweiter Kontrollpunkt
//   5  Riesentrank      z −240 … −300  ?-Block mit Riesentrank, Sternblock-Mauern (nur als Riese), Hüpfmäuse; hinter der
//                                     rechten Mauer die Röhre in den Farbfeld-Raum, versteckter Block mit zweitem Riesentrank
//   6  Finale           z −302 … −346  Druckknopf → Münzregen, Treppe zum Zielmast
// Geheimnisse: Röhre auf dem Kristallturm (nur mit Krallen-Anzug) → Kugelraum (x ≈ 120); versteckter ?-Block mit
// Funkenblüte über dem Sternenbach; versteckter Block mit Riesentrank; Farbfeld-Raum (x ≈ −120) hinter der Sternblock-Mauer.
// Sterne: 0 Kugelraum – zwei Kugeln in die Tore schieben · 1 Farbfeld-Raum – alle 16 Felder · 2 Sternring im Wolkenhimmel.
// Stempel: im rechten Seitenarm des Sternenbachs. Extraleben: unsichtbarer Block am Start, Ende des Wolkenhimmels, hinter der
// letzten Sternblock-Mauer (nur als Riese).

import { RiverChannel } from '../../archetypes/RiverNet.js';
import {
  line, arc, ring, column, sign, regenbogenPlatten, regenbogenBogen, sternenbachThema, sternfackeln, wolkenkanoneSpaeter,
  flussbloecke, kugeltore, muenzregen, sternmauern, leuchtsterne, planetchen, funkeln, Bld, litTop, gradY,
} from './_helpers_a.js';

const Y = 0;          // Plattformen
const WY = -1.0;      // Sternenbach am Steg
const FY = -1;        // Fackelplatz, Riesentrank-Strecke, Finale
const HY = 18;        // Wolkenhimmel
const TH = 6.2;       // Trapez-Aufhängung über der Plattform

// ---------------------------------------------------------------- Maße (auch für den Test)
export const MS1 = {
  START: { x0: -7, x1: 7, z0: 10, z1: -12.2 },
  WEG: { x0: -3, x1: 3, z0: -12.2, z1: -26 },
  TURM: { x0: -6.8, x1: -3.0, z0: -12.2, z1: -15.8, top: 9.8 },
  SIMS: { x0: -6.8, x1: 1.8, z0: -12.2, z1: -15.8, top: 9.8, under: 9.0 },
  P2: { x0: -3.5, x1: 3.5, z0: -32, z1: -46 },
  P3: { x0: -3.5, x1: 3.5, z0: -61, z1: -73 },
  STEG: { x0: -5, x1: 5, z0: -79, z1: -87 },
  KUGEL: { x0: 112, x1: 128, z0: -4, z1: -24 },           // Kugelraum (abseits)
  FACKEL: { x0: -9, x1: 9, z0: -204, z1: -236 },
  RIESE: { x0: -7, x1: 7, z0: -240, z1: -300 },
  FINALE: { x0: -8, x1: 8, z0: -302, z1: -336 },
  TOP: { x0: -6, x1: 6, z0: -336, z1: -348, top: -1 + 4 },
  NISCHE: { x0: 7, x1: 11.5, z0: -271, z1: -283 },        // Röhre zum Farbfeld-Raum (Sternblock-Mauer davor)
  KAEFIG: { x0: 7, x1: 11, z0: -290, z1: -298 },          // Extraleben (Sternblock-Mauer davor)
  FARB: { x0: -128, x1: -112, z0: -262, z1: -278 },        // Farbfeld-Raum (abseits)
};
const { START, WEG, TURM, SIMS, P2, P3, STEG, KUGEL, FACKEL, RIESE, FINALE, TOP, NISCHE, KAEFIG, FARB } = MS1;
export const TRAPEZE = { t1: WEG.z1 - 1.5, t2: [P2.z1 - 1.5, P2.z1 - 6, P2.z1 - 10.5], t3: P3.z1 - 1.5 };
export const WALLS = [-258, -270, -284];
/** Wolkenpfad im Wolkenhimmel (Mitte je Wolke 4 × 4 m). */
export const WOLKEN = [[13, -252], [11, -256.5], [8.8, -261], [6.8, -265.5], [5.2, -270], [4, -274.5], [3, -279]];

// ---------------------------------------------------------------- Sternenbach [x, y (Oberfläche), z, Breite, Strömung]
export const BACH = [
  [0, WY, -86, 10, 0.3], [0, WY, -93, 9.5, 1.4], [0.5, -1.05, -100, 9, 3.0], [-1.5, -1.12, -109, 9, 3.6], [-3.5, -1.2, -119, 9, 4.0],
  [-2, -1.3, -130, 9, 4.2], [1.5, -1.4, -141, 9, 4.2], [2, -1.5, -152, 9, 4.2], [-1, -1.6, -163, 9, 4.2], [-3, -1.7, -174, 9, 4.2],
  [-1, -1.8, -185, 9, 4.0], [0, -1.9, -195, 10, 3.0], [0, -1.95, -201, 12, 1.4], [0, -2.0, -206, 13, 0.5],
];
const bach = new RiverChannel({ points: BACH });
const sAt = (ch, z) => { const S = ch.S; let i = 0; while (i < S.length - 1 && S[i + 1].z > z) i++; const a = S[i], b = S[Math.min(S.length - 1, i + 1)]; const t = a.z === b.z ? 0 : (a.z - z) / (a.z - b.z); return a.s + (b.s - a.s) * Math.max(0, Math.min(1, t)); };
const yBach = (z) => bach.at(sAt(bach, z)).y;
/** Rechter Seitenarm (Stempel): zweigt bei z −141 ab, mündet bei z −175 wieder. */
export const ARM = [[1.6, -141, 5.5, 4.2], [6.5, -146, 5.5, 4.2], [11, -153, 5.5, 4.0], [12, -160, 5.5, 4.0], [9.5, -166, 5.5, 4.0],
  [3.5, -171, 5.5, 4.2], [-2.2, -175, 6, 4.2]].map(([x, z, w, v]) => [x, +yBach(z).toFixed(2), z, w, v]);
const arm = new RiverChannel({ points: ARM });
/** Punkt [x, y, z] im Kanal bei z mit Seitenlage lat (+ = rechts) und Höhe dy über der Oberfläche. */
const P = (ch, z, lat = 0, dy = 0) => { const q = ch.at(sAt(ch, z)); return [+(q.x + q.rx * lat).toFixed(2), +(q.y + dy).toFixed(2), +(q.z + q.rz * lat).toFixed(2)]; };
const XZ = (ch, z, lat = 0) => { const p = P(ch, z, lat); return [p[0], p[2]]; };
const bachCoins = (ch, z0, z1, lat0, lat1, n, dy = 0.6) => Array.from({ length: n }, (_, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return { kind: 'coin', pos: P(ch, z0 + (z1 - z0) * t, lat0 + (lat1 - lat0) * t, dy) }; });
export const STAMP = P(arm, -159.5, 0, 1.25);
export const FLUSSBLOCK = P(bach, -126, -1.2, 2.55);

// ---------------------------------------------------------------- Plattformen (Regenbogen) und Mauern
const PLATTEN = [
  { ...START, top: Y, h: 1.2, axis: 'z' },
  { ...WEG, top: Y, h: 1.2 },
  { ...P2, top: Y, h: 1.2 },
  { ...P3, top: Y, h: 1.2 },
  { ...STEG, top: Y, h: 1.2, axis: 'z' },
  { ...FACKEL, top: FY, h: 1.4, axis: 'z' },
  { x0: -2.2, x1: 2.2, z0: FACKEL.z1, z1: RIESE.z0, top: FY, h: 0.8 },
  { ...RIESE, top: FY, h: 1.4 },
  { ...NISCHE, top: FY, h: 1.2, axis: 'z' },
  { ...KAEFIG, top: FY, h: 1.2, axis: 'z' },
  { x0: -2.2, x1: 2.2, z0: RIESE.z1, z1: FINALE.z0, top: FY, h: 0.8 },
  { ...FINALE, top: FY, h: 1.4 },
  { ...TOP, h: 5.4, axis: 'x' },
  // Wolkenhimmel: kleine Regenbogen-Inseln zwischen den Wolken
  { x0: 11, x1: 17, z0: -243, z1: -249, top: HY, h: 0.8, under: false },
  { x0: 0, x1: 5, z0: -282, z1: -289, top: HY, h: 0.8, under: false },
];

/** Aufbau vor den Bausteinen: Sternenbach-Farben, Regenbogen-Plattformen, Kristallturm mit Röhrensims. */
function prebuild(level) {
  sternenbachThema(level);
  regenbogenPlatten(level, PLATTEN);
  // Kristallturm (Krallen-Anzug: kletterbar) und Sims darüber (über dem ersten Ziegelpaar)
  level.world.add({ type: 'box', min: [TURM.x0, Y - 1.2, TURM.z1], max: [TURM.x1, TURM.top, TURM.z0], climbable: true, tag: 'kristallturm' });
  level.world.add({ type: 'box', min: [TURM.x1, SIMS.under, SIMS.z1], max: [SIMS.x1, SIMS.top, SIMS.z0], tag: 'roehrensims' });
  // Dächer über der Röhren-Nische und dem Extraleben-Käfig: hinein nur durch die Sternblock-Mauer (Riesentrank)
  for (const n of [NISCHE, KAEFIG]) {
    level.world.add({ type: 'box', min: [n.x0, FY + 3, n.z1], max: [n.x1, FY + 3.8, n.z0], tag: 'nischendach' });
    level.world.add({ type: 'box', min: [n.x1, FY, n.z1], max: [n.x1 + 0.3, FY + 3, n.z0], tag: 'nischenwand' });
    level.world.add({ type: 'box', min: [n.x0 + 1, FY, n.z0 - 0.3], max: [n.x1, FY + 3, n.z0], tag: 'nischenwand' });
    level.world.add({ type: 'box', min: [n.x0 + 1, FY, n.z1], max: [n.x1, FY + 3, n.z1 + 0.3], tag: 'nischenwand' });
  }
  if (level.view) {
    const b = new Bld(), g = new Bld();
    for (const n of [NISCHE, KAEFIG]) {
      const nw = n.x1 - n.x0, nd = n.z0 - n.z1;
      b.box(nw + 0.3, 0.8, nd + 0.3, (n.x0 + n.x1) / 2 + 0.15, FY + 3, (n.z0 + n.z1) / 2, gradY(0x8a70e0, 0xf4ecff, FY + 3, FY + 3.8), { r: 0.2, seg: 2 });
      b.box(0.6, 3, nd + 0.3, n.x1 + 0.15, FY, (n.z0 + n.z1) / 2, gradY(0x7a60d0, 0xd8c8ff, FY, FY + 3), { r: 0.12 });
      for (const zz of [n.z0 + 0.15, n.z1 - 0.15]) b.box(nw - 0.6, 3, 0.3, (n.x0 + n.x1) / 2 + 0.2, FY, zz, gradY(0x7a60d0, 0xd8c8ff, FY, FY + 3), { r: 0.1 });
      g.star(0.45, 0.2, 0.1, (n.x0 + n.x1) / 2 + 0.2, FY + 3.4, n.z0 + 0.22, 0xffe070);
    }
    const w = TURM.x1 - TURM.x0, d = TURM.z0 - TURM.z1, cx = (TURM.x0 + TURM.x1) / 2, cz = (TURM.z0 + TURM.z1) / 2;
    // Turm: Kristallsäule mit Krallen-Kratzspuren-Streifen (hellblau/lila)
    b.box(w, TURM.top - 0.8 - Y, d, cx, Y, cz, gradY(0x7a6ad8, 0xb8e8ff, Y, TURM.top), { r: 0.18, seg: 2 });
    for (let k = 0; k < 6; k++) b.box(0.08, TURM.top - 1.6, 0.06, TURM.x1 - 0.5 - k * 0.55, Y + 0.4, TURM.z0 + 0.02, 0xe8f8ff, { r: 0 });
    // Sims: Regenbogenplatte (Unterseite lila)
    const sw = SIMS.x1 - SIMS.x0, scx = (SIMS.x0 + SIMS.x1) / 2;
    b.box(sw, SIMS.top - SIMS.under - 0.06, d, scx, SIMS.under, cz, gradY(0xa890f0, 0xffffff, SIMS.under, SIMS.top), { r: 0.16, seg: 2 });
    for (let k = 0; k < 5; k++) b.box((sw - 0.4) / 5 - 0.03, 0.07, d - 0.4, SIMS.x0 + 0.2 + (k + 0.5) * ((sw - 0.4) / 5), SIMS.top - 0.07, cz, litTop([0xff5a72, 0xffd84a, 0x6ad86a, 0x4ab8ff, 0xc072ff][k]), { r: 0.02 });
    // Kristallspitzen am Turmfuß und oben
    for (const [x, y, z, s, c] of [[TURM.x0 - 0.3, Y, -12.6, 1.0, 0xb8e8ff], [TURM.x0 - 0.2, Y, -15.4, 0.8, 0xffb0e0], [TURM.x0 + 0.4, SIMS.top, -12.6, 0.7, 0xc8b0ff]]) g.cone(0.32 * s, 1.4 * s, x, y, z, c, 5);
    b.flush(level);
    g.flush(level, { material: 'glow', castShadow: false });
  }
}

/** Aufbau nach den Bausteinen (vor Items): Regenbogen-Bögen über den Trapez-Lücken, Kulisse, Mechanik. */
function build(level) {
  regenbogenBogen(level, { y0: Y, y1: TH + 1.6, zA: WEG.z1 + 2, zB: P2.z0 - 2, hang: [TRAPEZE.t1], hy: TH + 0.05 });
  regenbogenBogen(level, { y0: Y, y1: TH + 3, zA: P2.z1 + 2.5, zB: P3.z0 - 2.5, hang: TRAPEZE.t2, hy: TH + 0.05 });
  regenbogenBogen(level, { y0: Y, y1: TH + 1.6, zA: P3.z1 + 2, zB: STEG.z0 - 2, hang: [TRAPEZE.t3], hy: TH + 0.05 });
  // ---------------- Fackelplatz: zwei Sternfackeln → Wolkenkanone
  sternfackeln(level, [{ pos: [-5, FY, -221], id: 'fackel_l' }, { pos: [5, FY, -221], id: 'fackel_r' }], { group: 'fackelplatz', onAll: { reveal: 'wolkenkanone' } });
  wolkenkanoneSpaeter(level, { id: 'wolkenkanone', pos: [0, FY, -229], target: [14, HY, -246], arc: 5, yaw: -Math.PI / 2 });
  // ---------------- Sternenbach: versteckter ?-Block mit Funkenblüte
  flussbloecke(level, [{ id: 'flussblock', pos: FLUSSBLOCK, power: 'funken', water: yBach(-126) }]);
  // ---------------- Kugelraum: zwei Kugeln in zwei Tore
  kugeltore(level, {
    id: 'kugeltore', balls: ['kugel_rosa', 'kugel_blau'], onAll: { star: 0 },
    goals: [{ pos: [KUGEL.x0 + 4, Y, KUGEL.z1 + 3.2], dir: [0, -1], width: 3, depth: 1.8, color: 0xff7ac8 }, { pos: [KUGEL.x1 - 4, Y, KUGEL.z1 + 3.2], dir: [0, -1], width: 3, depth: 1.8, color: 0x5ab8ff }],
  });
  // Kugelraum-Boden: je eine gepunktete Farbbahn mit Pfeilen von der Kugel zu ihrem Tor (aufgemalt), Sternchen an den Wänden
  if (level.view) {
    const b = new Bld(), g = new Bld();
    for (const [x, col, dot] of [[KUGEL.x0 + 4, 0xffb8e0, 0xff7ac8], [KUGEL.x1 - 4, 0xb8dcff, 0x5ab8ff]]) {
      const za = KUGEL.z0 - 10.4, zb = KUGEL.z1 + 4.4, len = za - zb;
      b.box(2.2, 0.02, len, x, Y + 0.002, (za + zb) / 2, col, { r: 0.01 });
      for (let k = 0; k < 4; k++) {
        const z = za - 1.2 - k * (len - 1.6) / 3;
        b.cone(0.5, 0.02, x, Y + 0.024, z, dot, 3, { yaw: Math.PI });
      }
    }
    for (let k = 0; k < 6; k++) {
      const z = KUGEL.z0 - 2 - k * 3.4, c = [0xfff2a0, 0xffb8e8, 0xb8f0ff][k % 3];
      g.star(0.3, 0.13, 0.05, KUGEL.x0 + 0.06, Y + 3.2 + (k % 2) * 0.6, z, c, { yaw: Math.PI / 2 });
      g.star(0.3, 0.13, 0.05, KUGEL.x1 - 0.06, Y + 3.2 + ((k + 1) % 2) * 0.6, z, c, { yaw: -Math.PI / 2 });
    }
    b.flush(level);
    g.flush(level, { material: 'glow', castShadow: false });
  }
  // ---------------- Riesentrank-Strecke: Sternblock-Mauern (nur als Riese); links bleibt ein schmaler Pfad
  sternmauern(level, [
    ...WALLS.map((z, i) => ({ id: `mauer${i + 1}`, x0: -5, x1: 7, z0: z + 0.5, z1: z - 0.5, y: FY, h: 3, coins: 3 })),
    { id: 'mauer_nische', x0: 7, x1: 8, z0: NISCHE.z0, z1: NISCHE.z1, y: FY, h: 3, coins: 0 },
    { id: 'mauer_kaefig', x0: 7, x1: 8, z0: KAEFIG.z0, z1: KAEFIG.z1, y: FY, h: 3, coins: 0 },
  ]);
  // ---------------- Finale: Münzregen über der Treppe
  muenzregen(level, { id: 'regen', area: [-6, -306, 6, -330], n: 46, height: 11, signal: 'muenzregen', top: 6 });
  // ---------------- Kulisse
  leuchtsterne(level, [
    [-11, 5, 2, 1.4], [12, 7, -6, 1.1], [-9, 9, -38, 1.2], [10, 4, -52, 0.9], [-12, 6, -66, 1.3], [11, 9, -80, 1.2],
    [-14, 4, -120, 1], [14, 6, -150, 1.4], [-15, 7, -190, 1.1], [15, 5, -214, 1], [-14, 8, -232, 1.3], [13, 9, -262, 1.1],
    [-12, 6, -296, 1.2], [12, 7, -318, 1.4], [-11, 10, -340, 1.3], [0, 12, -352, 1.8],
  ]);
  planetchen(level, [
    { pos: [-18, 2, -20], r: 3, color: [0xff9ad0, 0xffe0f0], tilt: 0.4 }, { pos: [20, -6, -60], r: 4, color: [0x7ae8c0, 0xd8fff0] },
    { pos: [-22, -8, -140], r: 5, color: [0xffc83a, 0xfff0a0], tilt: -0.3 }, { pos: [16, 12, -176], r: 2.4, color: [0xa87aff, 0xe8d8ff] },
    { pos: [-20, 4, -262], r: 3.4, color: [0x6aa8ff, 0xd0e8ff] }, { pos: [22, -4, -330], r: 4.4, color: [0xff9a3a, 0xffe0b0], tilt: 0.2 },
  ]);
  funkeln(level, { center: [0, 3, -40], size: [14, 4, 46], n: 36, seed: 3 });
  funkeln(level, { center: [0, 2, -150], size: [16, 4, 58], n: 40, seed: 8, color: 0xd8f0ff });
  funkeln(level, { center: [8, HY + 2, -266], size: [12, 3, 26], n: 30, seed: 11, color: 0xffe8a0 });
}

export const LEVEL = {
  id: 'S-1',
  world: 9,
  title: 'Regenbogenritt durchs Sternenzelt',
  archetype: 'parcours_ride',
  theme: 'rainbow',
  music: 'course_rainbow',
  timeLimit: 400,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  killY: -16,
  instances: { coin: { farHide: 46, shadow: false }, huepfmaus: { farHide: 40, shadowDist: 18 } },
  farHide: 40,
  sky: { clouds: 'below' },
  ride: {
    section: true,
    raft: [0, WY, -90.5],
    raftYaw: -Math.PI / 2,
    dock: { min: [-6, -87.5], max: [6, -78] },
    beach: { min: [-9, -205.5], max: [9, -197], land: [0, FY, -207.5] },
    swim: true,
    after: 'stay',
    footCamYaw: 0,
  },
  prebuild,
  build,
  camera: [
    // 1 Regenbogenwege; abseits der Kugelraum
    { from: 14, to: -90, pitch: 42, dist: 13, fov: 40, ahead: 2.4, area: [-30, 40] },
    { from: 0, to: -30, pitch: 52, dist: 12.5, fov: 40, area: [100, 140] },
    // 2–3 Steg und Sternenbach (zu Fuß; im Ritt führt die Ritt-Kamera)
    { from: -90, to: -204, pitch: 40, dist: 12, fov: 42, ahead: 2.6 },
    // 4 Fackelplatz
    { from: -204, to: -238, pitch: 44, dist: 13, fov: 40, area: [-30, 40] },
    // 5 Riesentrank-Strecke (als Riese etwas weiter weg)
    { from: -238, to: -300, pitch: 42, dist: 14, fov: 40, area: [-30, 40] },
    { from: -255, to: -285, pitch: 52, dist: 12.5, fov: 40, area: [-140, -100] },
    // 6 Finale
    { from: -300, to: -360, pitch: 40, dist: 13, fov: 40, area: [-30, 40] },
  ],
  segments: [
    // =============================================================== 1  Regenbogenwege
    sign(-4.6, Y, 7.4, 'Regenbogenritt\ndurchs Sternenzelt', { size: [3.2, 1.1] }),
    sign(4.4, Y, -4.6, 'Krallen-Anzug:\nKristall hinauf!', { size: [2.6, 0.9], yaw: -0.25 }),
    sign(2.4, Y, -24.4, 'Spring ans\nTrapez!', { size: [2.2, 0.8] }),
    { type: 'pipe', id: 'p_turm', pos: [-0.6, SIMS.top, -14], height: 1.1, target: 'p_kugel' },
    ...[TRAPEZE.t1, ...TRAPEZE.t2, TRAPEZE.t3].map((z, i) => ({ type: 'trapez', id: ['t1', 't2a', 't2b', 't2c', 't3'][i], pos: [0, Y + TH, z], length: 3, swing: 30, frame: false, color: ['rot', 'gold', 'blau', 'rot', 'gold'][i] })),
    { type: 'deco_star', shadow: false, items: [
      { kind: 'rakete', pos: [5.6, Y, 7.4], height: 3.6, color: 'rot', solid: true }, { kind: 'kristall', pos: [-6, Y, -6], n: 5, color: 'lila' },
      { kind: 'stern', pos: [-6.2, Y, 2.4], pole: 2.2, size: 1.1 }, { kind: 'kristall', pos: [2.4, Y, -86.2], n: 4, color: 'rosa' },
      { kind: 'regenbogen', pos: [0, Y, -88.2], width: 7, height: 3.4 },
    ] },
    // Kugelraum (abseits): Röhre zurück, zwei Kugeln, zwei Tore (im Haken)
    { type: 'room', pos: [(KUGEL.x0 + KUGEL.x1) / 2, Y, (KUGEL.z0 + KUGEL.z1) / 2], size: [KUGEL.x1 - KUGEL.x0, 5, KUGEL.z0 - KUGEL.z1], style: 0x8a70e0, top: 'stone' },
    { type: 'pipe', id: 'p_kugel', pos: [(KUGEL.x0 + KUGEL.x1) / 2, Y, KUGEL.z0 - 2.4], height: 1.1, target: 'p_turm' },
    sign(KUGEL.x0 + 3.2, Y, KUGEL.z0 - 1.4, 'Kugeln\nins Tor!', { size: [2, 0.8] }),

    // =============================================================== 2–3  Sternenbach
    { type: 'river', channels: [
      { id: 'bach', points: BACH, bank: { height: 0.9, out: 3.4, skirt: false }, deco: 0 },
      { id: 'arm', points: ARM, bank: { height: 0.9, out: 3.4, skirt: false }, deco: 0 },
    ] },
    { type: 'river_wave', pos: XZ(bach, -114, 0), boost: 4 },
    { type: 'river_wave', pos: XZ(bach, -184, 0), boost: 4 },
    { type: 'riverrock', pos: XZ(bach, -134, 2.6), r: 0.8, h: 1.0 },
    { type: 'riverrock', pos: XZ(bach, -168, -2.4), r: 0.9, h: 1.1 },
    { type: 'river_deco', items: [
      { kind: 'arrow', pos: XZ(bach, -97, 0) }, { kind: 'arrow', pos: XZ(bach, -138, 1.6), yaw: undefined },
      { kind: 'lilies', pos: XZ(bach, -150, -3), r: 0.9, n: 4 }, { kind: 'lilies', pos: XZ(arm, -162, 1.6), r: 0.6, n: 3 },
    ] },

    // =============================================================== 4  Fackelplatz (Strand des Sternenbachs)
    sign(-6.4, FY, -209, 'Fackeln mit\nFeuer anzünden!', { size: [2.6, 0.9], yaw: 0.2 }),

    // =============================================================== 5  Riesentrank-Strecke
    // Sternblock-Mauern: Mitte und rechts nur als Riese; links bleibt ein schmaler Pfad
    // Wolkenhimmel: Wolkenpfad vom Landeplatz zur kleinen Regenbogeninsel über der Strecke
    ...WOLKEN.map(([x, z]) => ({ type: 'cloud', pos: [x, HY - 0.6, z], size: [4, 0.6, 4] })),
    { type: 'pipe', id: 'p_riese', pos: [9.6, FY, -277], height: 1.1, target: 'p_farb' },
    sign(-5.2, FY, -243, 'Als Riese\ndurch die Mauern!', { size: [2.6, 0.9], yaw: 0.2 }),
    // Farbfeld-Raum (abseits)
    { type: 'room', pos: [(FARB.x0 + FARB.x1) / 2, FY, (FARB.z0 + FARB.z1) / 2], size: [FARB.x1 - FARB.x0, 5, FARB.z0 - FARB.z1], style: 0x7a5ad8, top: 'stone' },
    { type: 'pipe', id: 'p_farb', pos: [FARB.x0 + 2.2, FY, FARB.z0 - 2.2], height: 1.1, target: 'p_riese' },
    { type: 'switchtiles', id: 'farbfelder', pos: [(FARB.x0 + FARB.x1) / 2 + 0.8, FY, (FARB.z0 + FARB.z1) / 2 - 0.6], grid: [4, 4], spacing: 2, onAll: { star: 1 } },
    sign(FARB.x0 + 4.6, FY, FARB.z0 - 1, 'Alle Felder\nbetreten!', { size: [2.4, 0.85] }),

    // =============================================================== 6  Finale
    { type: 'stairs', pos: [0, FY, FINALE.z1 + 4], dir: '-z', steps: 4, rise: 1, width: 6 },
    { type: 'deco_star', shadow: false, items: [
      { kind: 'rakete', pos: [-4.4, TOP.top, -345], height: 4, color: 'blau', solid: true }, { kind: 'stern', pos: [6, FY, -309], pole: 2.4, size: 1.2 },
      { kind: 'kristall', pos: [-6.4, FY, -304], n: 5, color: 'mint' }, { kind: 'regenbogen', pos: [0, TOP.top, -347], width: 8, height: 4 },
    ] },
  ],
  blocks: [
    // Start: Krallen-Anzug (Kristallturm), Münzen
    { kind: 'question', pos: [-1, Y + 1.9, 1.6], content: 'krallen' },
    { kind: 'question', pos: [1, Y + 1.9, 1.6], content: 'coins:3' },
    { kind: 'hidden', pos: [-4.4, Y + 3.2, 6.2], content: 'oneup' },
    // erstes Ziegelpaar (unter dem Röhrensims)
    { kind: 'brick', pos: [-0.5, Y + 2.4, -14], content: 'coins:2' },
    { kind: 'brick', pos: [0.5, Y + 2.4, -14] },
    // Fackelplatz: Funkenblüte (für die Fackeln)
    { kind: 'question', pos: [0, FY + 1.9, -214], content: 'funken' },
    { kind: 'question', pos: [-2, FY + 1.9, -214], content: 'coins:5' },
    // Riesentrank-Strecke
    { kind: 'question', pos: [0, FY + 1.9, -244], content: 'riese' },
    { kind: 'hidden', pos: [3.5, FY + 3.2, -265], content: 'riese' },
    { kind: 'brick', pos: [-1, FY + 2.4, -293], content: 'coins:3' }, { kind: 'brick', pos: [0, FY + 2.4, -293] }, { kind: 'brick', pos: [1, FY + 2.4, -293], content: 'coins:3' },
  ],
  enemies: [
    // Hüpfmäuse auf den Regenbogenwegen
    { kind: 'huepfmaus', id: 'hm1', pos: [-1.5, Y, -19], path: [[-2, Y, -19], [2, Y, -19]] },
    { kind: 'huepfmaus', id: 'hm2', pos: [1.5, Y, -22], path: [[2, Y, -22], [-2, Y, -22]] },
    { kind: 'huepfmaus', id: 'hm3', pos: [0, Y, -35], path: [[-2.5, Y, -35], [2.5, Y, -35]] },
    { kind: 'huepfmaus', id: 'hm4', pos: [2, Y, -39.5], path: [[2.5, Y, -38], [2.5, Y, -42]] },
    { kind: 'huepfmaus', id: 'hm5', pos: [-2, Y, -42.5], path: [[-2.5, Y, -42.5], [1, Y, -42.5]] },
    { kind: 'huepfmaus', id: 'hm6', pos: [0, Y, -64], path: [[-2.5, Y, -64], [2.5, Y, -64]] },
    { kind: 'huepfmaus', id: 'hm7', pos: [-2, Y, -68], path: [[-2.5, Y, -66.5], [-2.5, Y, -70]] },
    { kind: 'huepfmaus', id: 'hm8', pos: [2, Y, -69.5], path: [[2.5, Y, -67], [2.5, Y, -71]] },
    // Fackelplatz und Riesentrank-Strecke
    { kind: 'huepfmaus', id: 'hm9', pos: [6, FY, -226], path: [[6.5, FY, -224], [6.5, FY, -232]] },
    { kind: 'huepfmaus', id: 'hm10', pos: [0, FY, -250], path: [[-3, FY, -250], [3, FY, -250]] },
    { kind: 'huepfmaus', id: 'hm11', pos: [2, FY, -264], path: [[0, FY, -264], [5, FY, -264]] },
    { kind: 'huepfmaus', id: 'hm12', pos: [-1, FY, -277], path: [[-3, FY, -277], [3, FY, -277]] },
    { kind: 'huepfmaus', id: 'hm13', pos: [2, FY, -289], path: [[0, FY, -289], [5, FY, -289]] },
    // Finale
    { kind: 'huepfmaus', id: 'hm14', pos: [-3, FY, -318], path: [[-5, FY, -318], [-1, FY, -318]] },
    { kind: 'huepfmaus', id: 'hm15', pos: [3, FY, -322], path: [[5, FY, -322], [1, FY, -322]] },
  ],
  items: [
    // ---------------- Kugelraum: zwei Schiebekugeln
    { kind: 'schiebekugel', id: 'kugel_rosa', pos: [KUGEL.x0 + 4, Y, KUGEL.z0 - 9], color: 'rosa', size: 1.5 },
    { kind: 'schiebekugel', id: 'kugel_blau', pos: [KUGEL.x1 - 4, Y, KUGEL.z0 - 9], color: 'blau', size: 1.5 },
    line([KUGEL.x0 + 4, Y + 0.6, KUGEL.z0 - 5], [KUGEL.x1 - 4, Y + 0.6, KUGEL.z0 - 5], 6),
    // ---------------- Bitcoin-Pfade
    line([0, Y + 0.6, 0], [0, Y + 0.6, -7], 5),
    column(-4.8, -14, Y + 1.6, Y + 8.2, 5),
    line([0, Y + 0.6, -17], [0, Y + 0.6, -24], 4),
    ...arc([0, Y + 2.2, TRAPEZE.t1 + 0.5], [0, Y + 1, P2.z0 - 0.6], 4, 1.8),
    line([0, Y + 0.6, -36.5], [0, Y + 0.6, -44.5], 5),
    ...arc([0, Y + 3.2, TRAPEZE.t2[0] - 1], [0, Y + 3.2, TRAPEZE.t2[2] + 1], 6, 1.4),
    line([0, Y + 0.6, -62], [0, Y + 0.6, -71], 5),
    ...arc([0, Y + 2.2, TRAPEZE.t3 + 0.5], [0, Y + 1, STEG.z0 - 0.6], 4, 1.8),
    // Sternenbach
    ...bachCoins(bach, -96, -104, 0, 0, 4),
    ...bachCoins(bach, -116, -124, -1.4, 1.4, 5),
    ...bachCoins(bach, -146, -156, -1.6, 1.6, 5),
    ...bachCoins(arm, -150, -168, 0, 0, 6),
    ...bachCoins(bach, -178, -192, 1.2, -1.2, 6),
    // Fackelplatz
    ring([0, FY + 0.8, -221], 2.2, 8),
    // Wolkenhimmel: Sternring und Wolkenpfad
    { kind: 'starring', id: 'sternring', pos: [14, HY, -248], star: 2, yaw: Math.PI / 2, time: 12,
      coins: [...WOLKEN.map(([x, z]) => [x, HY + 0.7, z]), [1.4, HY + 0.7, -285.6]] },
    { kind: 'powerup', pos: [3.6, HY, -287.6], power: 'oneup', speed: 0 },
    // Riesentrank-Strecke
    line([-5.4, FY + 0.6, -246], [-5.4, FY + 0.6, -296], 10),
    ring([4, FY + 1.2, -297], 1.4, 6),
    { kind: 'powerup', pos: [9.4, FY, (KAEFIG.z0 + KAEFIG.z1) / 2], power: 'oneup', speed: 0 },
    line([9.6, FY + 0.6, -273], [9.6, FY + 0.6, -275], 2),
    // Finale
    line([0, FY + 0.6, -303], [0, FY + 0.6, -306], 3),
  ],
  checkpoint: [{ pos: [-7.6, -0.2, -105], yaw: Math.PI / 2 }, { pos: [6.2, FY, -212], yaw: Math.PI / 2 }],
  stars: [
    { pos: [(KUGEL.x0 + KUGEL.x1) / 2, Y + 1.4, KUGEL.z1 + 6], hidden: true, id: 'stern_kugeln' },   // 0 Kugelraum
    { pos: [(FARB.x0 + FARB.x1) / 2 + 0.8, FY + 1.6, (FARB.z0 + FARB.z1) / 2 - 0.6], hidden: true, id: 'stern_farbfeld' },  // 1 Farbfeld-Raum
    { pos: [2.6, HY + 0.4, -283.8], hidden: true, id: 'stern_ring' },                                   // 2 Sternring
  ],
  stamp: STAMP,
  goal: { pos: [0, TOP.top, -343], height: 9 },
  marks: {
    start: [0, Y, 6], ziegel: [0, Y, -12], turm: [-4.6, Y, -11.6], sims: [-0.6, SIMS.top, -14], kugel: [KUGEL.x0 + 8, Y, KUGEL.z0 - 4],
    p2: [0, Y, -33], p3: [0, Y, -62], steg: [0, Y, -82], raft: [0, WY, -90.5], bach: [0.4, -1.05, -100], cp1: [0, -1.1, -108],
    fackel: [0, FY, -210], riese: [0, FY, -242], farb: [FARB.x0 + 4, FY, FARB.z0 - 4], himmel: [14, HY, -246], finale: [0, FY, -304],
    stamp: STAMP, flussblock: FLUSSBLOCK,
  },
};

// Druckknopf → Münzregen (im Finale)
LEVEL.items.push({ kind: 'druckknopf', id: 'regenknopf', pos: [0, FY, -309], color: 'blau', onPress: { signal: 'muenzregen' } });
