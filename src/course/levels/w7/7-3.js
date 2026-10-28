// 7-3 „Pfeilflitzer über dem Glutstrom“ (Archetyp parcours – Sprint, Bauplan 7-3: „Zeitlimit 100 s, ca. 450 m
// Hochgeschwindigkeit, 3 Abschnitte: Rasstrecke 1 – schmale Wege, Stachelwalzen, Donut-Blöcke, insgesamt 56 Boost-Pfeile,
// Glasröhren verbinden die Teile; Rasstrecke 2 – Sternring am Anfang; Dreifach-Gabelung – drei Wege, jeder mit Glasröhre
// zum Ziel. Geheimnis: Grube bei Stern 2 mit Röhre in einen Geheimraum (24 Pilzlinge, Unverwundbarkeitsstern). Sterne:
// 1) Ende Abschnitt 1, rechter Weg 2) Sternring 3) Ende Abschnitt 2, mittlerer Weg durch die Walzen. Stempel: kurz nach
// Stern 2 linker Weg, über eine Lücke.“). Thema lavarun, Musik course_redhot.
//
// Eine Rennstrecke aus Basalt-Dämmen hoch über dem Glutstrom (die Lava fließt tief unten der Figur entgegen, Funken
// fliegen vorbei). Alle Wege haben eine glühende Kante; Boost-Pfeile schießen die Figur nach vorn (vor Lücken: weiter
// Sprung). Abschnitte (nach −Z):
//   Start      (z 12 … −6):     Startplateau mit Renn-Torbogen, Zuschauer-Tribünen, Fackeln; ?-Block mit Wurfsichel.
//   Rasstrecke 1 (z −6 … −196): 3-m-Damm mit Pfeilen und einer Lücke → Donut-Brücke → breiter Damm mit drei rotierenden
//              Stachelwalzen (Slalom links/rechts, dann drüberspringen) → Glasröhre 1 hinauf auf das Gabelungsplateau →
//              drei Wege (links Donut-Blöcke, Mitte Pfeile und Lücke, rechts zwei Walzen – an seinem Ende Stern 0) →
//              Checkpoint-Plateau.
//   Rasstrecke 2 (z −196 … −408): Sternring am Anfang (acht Sternmünzen den Pfeil-Damm entlang, 10 s → Stern 1 über der
//              Grube) → Grubenplateau (in der Grube die grüne Röhre ins Pilzling-Versteck) → linker Abzweig über eine Lücke
//              zum Stempel (zurück mit einem Sprung auf den Hauptweg) → Donut-Brücke → Walzen-Slalom → Glasröhre 2 hinauf →
//              drei Wege (links Pfeile und Lücke, Mitte durch drei Walzen – an ihrem Ende Stern 2, rechts Donut-Blöcke) →
//              Checkpoint 2.
//   Dreifach-Gabelung (z −408 … −480): drei lange Wege (links Donut-Zickzack, Mitte Pfeile und zwei Lücken, rechts
//              Walzen-Slalom), jeder endet in einer Glasröhre hinauf aufs Zielplateau (Torbogen, Tribünen, Zielmast).
//   Pilzling-Versteck (abseits bei x ≈ 140): ummauerter Glut-Hof mit 24 Pilzlingen; ?-Block mit Funkelstern, Münzringe,
//              unsichtbarer Extraleben-Block; Röhre zurück aufs Grubenplateau.
// Boost-Pfeile: genau 56. Extraleben: unsichtbarer Block auf dem Gabelungsplateau, unsichtbarer Block im Versteck.

import {
  isl, line, ring, arc, lavaGrund, stuetzen, pfeile, startTor, flaggen, basaltWand, glutfunken, wimpelkette, glowPoints, Bld, litTop,
  donutBloecke, bruestung, fahrbahn, karoLinie,
} from './_helpers_b.js';
import { buildDonutblock } from '../../blocks/types/w5_donut.js';

const Y0 = 2, Y1 = 5, Y2 = 8, YZ = 11;   // Wegehöhen: Start/Rasstrecke 1, Gabelung 1 + Rasstrecke 2, Rasstrecke 2 Ende + Gabelung, Ziel
const LAVA = -9;                          // Kulissen-Lava (Thema lavarun: 9 m unter dem tiefsten Teil; alle Inseln reichen bis y = 0)
const VX = 140;                           // Pilzling-Versteck (x)
const WR = 0.6, WH = WR + 0.55;           // Stachelwalzen: Trommelradius, Achshöhe über dem Boden (Eisenböcke)

// ------------------------------------------------------------------ Wege (Inseln bis hinab auf y = 0)
const B = (x0, x1, zA, zB, top) => isl(x0, x1, zA, zB, top, top);
const WEGE = [
  // Start und Rasstrecke 1
  [-13, 13, 12, -6, Y0],
  [-1.5, 1.5, -6, -30, Y0], [-1.5, 1.5, -35, -52, Y0],
  [-1.5, 1.5, -66, -74, Y0],
  [-4, 4, -74, -112, Y0],
  [-10, 10, -131, -146, Y1],
  [-8.5, -5.5, -146, -156, Y1], [-8.5, -5.5, -165, -178, Y1],
  [-1.5, 1.5, -146, -160, Y1], [-1.5, 1.5, -165, -178, Y1],
  [5.5, 8.5, -146, -178, Y1],
  [-10, 10, -178, -196, Y1],
  // Rasstrecke 2
  [-1.5, 1.5, -196, -244, Y1], [-1.5, 1.5, -237, -241, Y1 + 1.2],
  [-9, 2.5, -244, -262, Y1], [6.5, 9, -244, -262, Y1], [2.5, 6.5, -244, -249, Y1], [2.5, 6.5, -256, -262, Y1],
  [2.5, 6.5, -249, -256, Y1 - 2.5],
  [-9, -6, -262, -274, Y1], [-10, -6, -279, -288, Y1],
  [-1.5, 1.5, -262, -285, Y1], [-1.5, 1.5, -294, -312, Y1],
  [-4, 4, -312, -336, Y1],
  [-11, 11, -355, -366, Y2],
  [-10, -7, -366, -378, Y2], [-10, -7, -382, -396, Y2],
  [-1.5, 1.5, -366, -396, Y2],
  [7, 10, -366, -376, Y2], [7, 10, -386, -396, Y2],
  [-12, 12, -396, -408, Y2],
  // Dreifach-Gabelung und Ziel
  [-12, -9, -408, -418, Y2], [-12, -9, -428, -448, Y2],
  [-1.5, 1.5, -408, -421, Y2], [-1.5, 1.5, -425, -448, Y2],
  [8, 13, -408, -448, Y2],
  [-13, 13, -460, -482, YZ],
];

// ------------------------------------------------------------------ Boost-Pfeile (56)
const P = (x, y, z, dir) => ({ pos: [x, y, z], ...(dir ? { dir } : {}) });
const PFEILE = [
  // Start + Rasstrecke 1 (19)
  P(0, Y0, 0), P(0, Y0, -9), P(0, Y0, -17), P(0, Y0, -25), P(0, Y0, -39), P(0, Y0, -47),
  P(-2, Y0, -103.5, [0.29, -1]), P(2, Y0, -103.5, [-0.29, -1]), P(0, Y0, -108.5),
  P(-7, Y1, -141), P(0, Y1, -141),
  P(-7, Y1, -149), P(0, Y1, -149), P(0, Y1, -157), P(0, Y1, -169), P(0, Y1, -176), P(-7, Y1, -168), P(7, Y1, -172),
  P(0, Y1, -250),
  // Rasstrecke 2 (22)
  P(0, Y1, -193), P(0, Y1, -199), P(0, Y1, -207), P(0, Y1, -215), P(0, Y1, -223), P(0, Y1, -231), P(0, Y1 + 1.2, -239.6),
  P(0, Y1, -259), P(0, Y1, -266), P(0, Y1, -274), P(0, Y1, -282), P(0, Y1, -298), P(0, Y1, -306),
  P(-2, Y1, -330, [0.45, -1]), P(2, Y1, -330, [-0.45, -1]),
  P(-8.5, Y2, -362), P(8.5, Y2, -362),
  P(-8.5, Y2, -369), P(-8.5, Y2, -375), P(-8.5, Y2, -387), P(8.5, Y2, -369), P(8.5, Y2, -390),
  // Dreifach-Gabelung und Ziel (15)
  P(-10.5, Y2, -405), P(0, Y2, -405), P(10.5, Y2, -405),
  P(-10.5, Y2, -411), P(-10.5, Y2, -432), P(-10.5, Y2, -440),
  P(0, Y2, -411), P(0, Y2, -429), P(0, Y2, -437), P(0, Y2, -443),
  P(12, Y2, -411), P(10.5, Y2, -441),
  P(-4, YZ, -464), P(0, YZ, -464), P(4, YZ, -464),
];

// ------------------------------------------------------------------ Stachelwalzen (rotierend, rundum bestachelt)
const W = (id, x, y, z, length, speed = 1.4) => ({ type: 'stachelwalze_rot', id, pos: [x, y + WH, z], radius: WR, length, axis: 'x', speed, stand: true });
const WALZEN = [
  W('walze1', -1.75, Y0, -81, 4.5), W('walze2', 1.75, Y0, -89, 4.5, -1.4), W('walze3', 0, Y0, -100, 8),
  W('walze4', 7, Y1, -155, 3), W('walze5', 7, Y1, -164, 3, -1.3),
  W('walze6', -1.75, Y1, -319, 4.5), W('walze7', 1.75, Y1, -327, 4.5, -1.4),
  W('walze8', 0, Y2, -371, 3), W('walze9', 0, Y2, -380, 3, -1.5), W('walze10', 0, Y2, -389, 3),
  W('walze11', 9.5, Y2, -417, 3), W('walze12', 11.5, Y2, -426, 3, -1.3), W('walze13', 10.5, Y2, -435, 5),
];

// ------------------------------------------------------------------ Donut-Blöcke (fallen nach kurzem Stehen)
const reihe = (x, y, z0, z1) => { const out = []; for (let z = z0; z >= z1 - 1e-6; z -= 1) out.push([x, y, z]); return out; };
const quer = (z, y, x0, x1) => { const out = []; for (let x = x0; x <= x1 + 1e-6; x += 1) out.push([x, y, z]); return out; };
const DONUTS = [
  { id: 'donut1', blocks: [...reihe(-0.5, Y0 - 1, -52.5, -65.5), ...reihe(0.5, Y0 - 1, -52.5, -65.5)] },
  { id: 'donut2', blocks: [...reihe(-7.5, Y1 - 1, -156.5, -164.5), ...reihe(-6.5, Y1 - 1, -156.5, -164.5),
    ...reihe(-0.5, Y1 - 1, -285.5, -293.5), ...reihe(0.5, Y1 - 1, -285.5, -293.5)] },
  { id: 'donut3', blocks: [...reihe(8, Y2 - 1, -376.5, -385.5), ...reihe(9, Y2 - 1, -376.5, -385.5),
    // Dreifach-Gabelung links: Zickzack (vor, rechts, vor, links, vor)
    ...reihe(-11, Y2 - 1, -418.5, -420.5), ...reihe(-10, Y2 - 1, -418.5, -420.5),
    ...quer(-421.5, Y2 - 1, -11, -7), ...quer(-422.5, Y2 - 1, -11, -7),
    ...reihe(-8, Y2 - 1, -423.5, -424.5), ...reihe(-7, Y2 - 1, -423.5, -424.5),
    ...quer(-425.5, Y2 - 1, -11, -7), ...quer(-426.5, Y2 - 1, -11, -7),
    ...reihe(-11, Y2 - 1, -427.5, -427.5), ...reihe(-10, Y2 - 1, -427.5, -427.5)] },
];

// ------------------------------------------------------------------ Glasröhren
const ROHRE = [
  { type: 'glasspipe', id: 'rohr1', path: [[0, Y0 + 1, -110.4], [0, Y0 + 1.6, -116], [0, Y0 + 6, -123], [0, Y1 + 1.8, -129], [0, Y1 + 1, -133.4]], coins: 5, oneWay: true },
  { type: 'glasspipe', id: 'rohr2', path: [[0, Y1 + 1, -334.4], [0, Y1 + 1.6, -340], [0, Y2 + 4.5, -347], [0, Y2 + 1.8, -352], [0, Y2 + 1, -357.4]], coins: 5, oneWay: true },
  { type: 'glasspipe', id: 'rohrL', path: [[-10.5, Y2 + 1, -446.4], [-10.5, Y2 + 1.8, -452], [-7.5, YZ + 3.5, -456.5], [-4, YZ + 1, -461.4]], coins: 4, oneWay: true },
  { type: 'glasspipe', id: 'rohrM', path: [[0, Y2 + 1, -446.4], [0, Y2 + 1.8, -451], [0, YZ + 3.5, -456], [0, YZ + 1, -461.4]], coins: 4, oneWay: true },
  { type: 'glasspipe', id: 'rohrR', path: [[10.5, Y2 + 1, -446.4], [10.5, Y2 + 1.8, -452], [7.5, YZ + 3.5, -456.5], [4, YZ + 1, -461.4]], coins: 4, oneWay: true },
];

function build(level) {
  lavaGrund(level, LAVA);
  pfeile(level, PFEILE);
  donutBloecke(level, DONUTS.map((d) => ({ delay: 0.55, respawn: 2.6, ...d })), buildDonutblock);
  // Pfeiler unter allen Wegen (bis in die Lava)
  stuetzen(level, WEGE.filter((w) => w[0] < 100).map(([x0, x1, zA, zB, top]) => [x0, x1, zA, zB, 0]), { lava: LAVA });
  // Start: Renn-Torbogen, Karo-Fähnchen
  startTor(level, { x: 0, y: Y0, z: -5, w: 4.6, h: 4.4 });
  karoLinie(level, -2.3, 2.3, -3.4, Y0);
  karoLinie(level, -4.5, 4.5, -469.2, YZ);
  // Rennstrecken-Markierung auf den schmalen Dämmen (nicht unter den Boost-Pfeilen)
  fahrbahn(level, WEGE.filter(([x0, x1, zA, zB]) => x1 - x0 <= 3.2 && Math.abs(zA - zB) > 6), { skip: PFEILE.map((a) => [a.pos[2] + 1.4, a.pos[2] - 1.4]) });
  startTor(level, { x: 0, y: YZ, z: -467, w: 9, h: 5 });
  // Trichter vor den Röhren-Öffnungen: niedrige Mauern neben der Öffnung, die Röhre ist der einzige Weg
  bruestung(level, [
    [-4, -1.15, -111.2, -112, Y0, 1.1], [1.15, 4, -111.2, -112, Y0, 1.1],
    [-4, -1.15, -335.2, -336, Y1, 1.1], [1.15, 4, -335.2, -336, Y1, 1.1],
    [-12, -11.65, -447.2, -448, Y2, 1.1], [-9.35, -9, -447.2, -448, Y2, 1.1],
    [-1.5, -1.15, -447.2, -448, Y2, 1.1], [1.15, 1.5, -447.2, -448, Y2, 1.1],
    [8, 9.35, -447.2, -448, Y2, 1.1], [11.65, 13, -447.2, -448, Y2, 1.1],
  ], { color: 0x3e3036, top: 0x6a5660, merlon: false });
  flaggen(level, [
    [-7.4, Y0, 11.4, 2.2, 0], [7.4, Y0, 11.4, 2.2, Math.PI], [-7.4, Y0, -5.4, 2.2, 0], [7.4, Y0, -5.4, 2.2, Math.PI], [-12.4, Y0, -5.4, 2.4, 0], [12.4, Y0, -5.4, 2.4, Math.PI],
    [-1.25, Y0, -29.6, 1.6, 0], [1.25, Y0, -29.6, 1.6, Math.PI], [-1.25, Y0, -35.4, 1.6, 0], [1.25, Y0, -35.4, 1.6, Math.PI],
    [-9.6, Y1, -131.4, 2.2, 0], [9.6, Y1, -131.4, 2.2, Math.PI], [-9.6, Y1, -195.4, 2.2, 0], [9.6, Y1, -195.4, 2.2, Math.PI],
    [-10.6, Y2, -355.4, 2.2, 0], [10.6, Y2, -355.4, 2.2, Math.PI], [-11.6, Y2, -407.4, 2.2, 0], [11.6, Y2, -407.4, 2.2, Math.PI],
    [-7.6, YZ, -481.4, 2.6, 0], [7.6, YZ, -481.4, 2.6, Math.PI], [-12.4, YZ, -460.6, 2.4, 0], [12.4, YZ, -460.6, 2.4, Math.PI],
  ]);
  for (const z of [-29.6, -35.4]) wimpelkette(level, [-1.25, Y0 + 1.6, z], [1.25, Y0 + 1.6, z], 4, 0.15);
  wimpelkette(level, [-9.6, Y1 + 2.2, -195.4], [9.6, Y1 + 2.2, -195.4], 16, 0.7);
  wimpelkette(level, [-11.6, Y2 + 2.2, -407.4], [11.6, Y2 + 2.2, -407.4], 18, 0.8);
  wimpelkette(level, [-7.6, YZ + 2.6, -481.4], [7.6, YZ + 2.6, -481.4], 14, 0.6);
  // Felswände mit Lavafällen links und rechts der Strecke, Basaltnadeln
  basaltWand(level, [
    [-16, LAVA, -118, 12, 18, 0.2], [16, LAVA, -122, 10, 16, -0.2],
    [-17, LAVA, -340, 12, 20, 0.15], [17, LAVA, -346, 12, 20, -0.15],
    [-22, LAVA, -455, 14, 24, 0.3], [22, LAVA, -455, 14, 24, -0.3],
  ]);
  // Funken über den Lücken und der Röhren-Schlucht
  glutfunken(level, [-12, 12, LAVA, Y0 + 6, -110, -132], { n: 90, seed: 3 });
  glutfunken(level, [-12, 12, LAVA, Y2 + 6, -334, -356], { n: 90, seed: 4 });
  glowPoints(level, [[0, LAVA + 2, -32.5, 3], [0, LAVA + 2, -59, 4], [0, LAVA + 2, -162.5, 3], [-7, LAVA + 2, -160, 3], [-7.5, LAVA + 2, -276.5, 3],
    [0, LAVA + 2, -290, 3], [-8.5, LAVA + 2, -380, 3], [8.5, LAVA + 2, -381, 3], [0, LAVA + 2, -423.5, 3], [0, LAVA + 2, -436.5, 3]], { color: 0xff6a1a, size: 7, opacity: 0.6, pulse: 0.4 });
  // Pilzling-Versteck (Mauerkranz, Türme, Glutfenster, Banner)
  geheimHof(level);
}

/** Pilzling-Versteck: ummauerter Glut-Hof (abseits bei x ≈ 140), vorn offen für die Kamera. */
function geheimHof(level) {
  const x0 = VX - 14, x1 = VX + 14, z0 = -238, z1 = -266, y = Y1;
  // Mauern (hinten und an den Seiten, vorn niedrige Brüstung) mit Kollision
  const wall = (ax0, ax1, az0, az1, h) => level.world.add({ type: 'box', min: [ax0, y, az1], max: [ax1, y + h, az0], tag: 'versteck-mauer' });
  wall(x0 - 1, x0, z0 + 1, z1 - 1, 4); wall(x1, x1 + 1, z0 + 1, z1 - 1, 4); wall(x0 - 1, x1 + 1, z1, z1 - 1, 4);
  wall(x0 - 1, x1 + 1, z0 + 1, z0, 0.8);
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const st = 0x4a3a44, stH = 0x7a6470, red = 0xc8322a;
  b.box(1, 4, z0 - z1 + 2, x0 - 0.5, y, (z0 + z1) / 2, litTop(st, 0.6), { r: 0.08 });
  b.box(1, 4, z0 - z1 + 2, x1 + 0.5, y, (z0 + z1) / 2, litTop(st, 0.6), { r: 0.08 });
  b.box(x1 - x0 + 2, 4, 1, (x0 + x1) / 2, y, z1 - 0.5, litTop(st, 0.6), { r: 0.08 });
  b.box(x1 - x0 + 2, 0.8, 1, (x0 + x1) / 2, y, z0 + 0.5, litTop(stH, 0.6), { r: 0.08 });
  for (let x = x0; x <= x1; x += 2) b.box(0.8, 0.5, 1.1, x, y + 4, z1 - 0.5, litTop(stH, 0.6), { r: 0.05 });
  for (let z = z1; z <= z0; z += 2) for (const xx of [x0 - 0.5, x1 + 0.5]) b.box(1.1, 0.5, 0.8, xx, y + 4, z, litTop(stH, 0.6), { r: 0.05 });
  // Glutfenster in der Rückwand, rote Banner mit goldener Pilzling-Kappe
  for (let x = x0 + 3; x < x1 - 1; x += 5) {
    g.box(0.9, 1.6, 0.1, x, y + 1.4, z1 + 0.02, 0xffa040, { r: 0.1 });
    b.box(1.3, 2.4, 0.08, x + 2.5, y + 1.2, z1 + 0.06, litTop(red, 0.7), { r: 0.02 });
    b.sphere(0.36, x + 2.5, y + 2.6, z1 + 0.12, 0xffc21a, { s: [1, 0.6, 0.3] });
  }
  // Ecktürme
  for (const [tx, tz] of [[x0 - 1.2, z1 - 1.2], [x1 + 1.2, z1 - 1.2], [x0 - 1.2, z0 + 1.2], [x1 + 1.2, z0 + 1.2]]) {
    b.cyl(1.4, 1.6, 6, tx, y - 0.2, tz, litTop(st, 0.6), 10);
    b.cone(1.8, 2.6, tx, y + 5.8, tz, litTop(red, 0.6), 10);
    g.box(0.35, 0.7, 0.1, tx, y + 3.4, tz + 1.5, 0xffb040, { r: 0.05 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  stuetzen(level, [[x0 - 1, x1 + 1, z0 + 1, z1 - 1, 0]], { lava: LAVA, every: 7 });
}

export const LEVEL = {
  id: '7-3',
  world: 7,
  title: 'Pfeilflitzer über dem Glutstrom',
  archetype: 'parcours',
  theme: 'lavarun',
  music: 'course_redhot',
  timeLimit: 100,
  build,
  start: { pos: [0, Y0, 7], yaw: Math.PI / 2 },
  instances: { coin: { farHide: 46, shadow: false } },
  // Rennstrecke flach (Ausblick nach vorn), Gabelungen weiter weg (alle drei Wege im Bild), Versteck steil von oben
  camera: [
    { from: 14, to: -4, pitch: 44, dist: 14, ahead: 3, area: [-60, 60] },
    { from: -4, to: -70, pitch: 38, dist: 13, ahead: 3, area: [-60, 60] },
    { from: -70, to: -112, pitch: 42, dist: 14, ahead: 3, area: [-60, 60] },
    { from: -112, to: -136, pitch: 40, dist: 15, ahead: 3, area: [-60, 60] },
    { from: -136, to: -200, pitch: 44, dist: 17, ahead: 3, x: 0, xLock: 0.35, area: [-60, 60] },
    { from: -200, to: -262, pitch: 38, dist: 14, ahead: 3, area: [-60, 60] },
    { from: -262, to: -300, pitch: 42, dist: 16, ahead: 3, x: -3, xLock: 0.3, area: [-60, 60] },
    { from: -300, to: -356, pitch: 40, dist: 14, ahead: 3, area: [-60, 60] },
    { from: -356, to: -410, pitch: 44, dist: 17, ahead: 3, x: 0, xLock: 0.35, area: [-60, 60] },
    { from: -410, to: -450, pitch: 44, dist: 17, ahead: 3, x: 0, xLock: 0.3, area: [-60, 60] },
    { from: -450, to: -490, pitch: 40, dist: 15, ahead: 2, area: [-60, 60] },
    { from: -230, to: -275, pitch: 52, dist: 20, ahead: 1, area: [100, 180], x: VX, xLock: 0.45 },
  ],
  segments: [
    ...WEGE.map(([x0, x1, zA, zB, top]) => B(x0, x1, zA, zB, top)),
    // Pilzling-Versteck
    B(VX - 14, VX + 14, -238, -266, Y1),
    ...WALZEN,
    ...ROHRE,
    // Grube mit grüner Röhre ins Versteck, Röhren im Versteck und zurück
    { type: 'pipe', id: 'grube', pos: [4.5, Y1 - 2.5, -252.5], height: 1.1, target: 'versteck_ein' },
    { type: 'pipe', id: 'versteck_ein', pos: [VX - 10, Y1, -262], height: 1.2 },
    { type: 'pipe', id: 'versteck_aus', pos: [VX + 10, Y1, -242.5], height: 1.2, target: 'grube_aus' },
    { type: 'pipe', id: 'grube_aus', pos: [-6.5, Y1, -258.5], height: 1.0 },
    { type: 'crowd', id: 'crowd', stands: [
      { from: [-10, Y0, 9], to: [-10, Y0, -3], rows: 3, face: [1, 0] },
      { from: [10, Y0, -3], to: [10, Y0, 9], rows: 3, face: [-1, 0] },
      { from: [-10, YZ, -463], to: [-10, YZ, -479], rows: 3, face: [1, 0] },
      { from: [10, YZ, -479], to: [10, YZ, -463], rows: 3, face: [-1, 0] },
    ] },
    { type: 'deco_w7', items: [
      { kind: 'fackel', pos: [-6.6, Y0, 9.5], mount: 'stand' }, { kind: 'fackel', pos: [6.6, Y0, 9.5], mount: 'stand' },
      { kind: 'fackel', pos: [-4.4, Y0, -3.6], mount: 'stand' }, { kind: 'fackel', pos: [4.4, Y0, -3.6], mount: 'stand' },
      { kind: 'vulkanfels', pos: [-7.5, Y0, -4.5], size: 1.2 }, { kind: 'vulkanfels', pos: [7.6, Y0, 10.8], size: 1.4 }, { kind: 'knochen', pos: [6.8, Y0, -4.2], n: 3 },
      { kind: 'fahne', pos: [-6.8, Y0, 0.5], height: 4.5 }, { kind: 'fahne', pos: [6.8, Y0, 0.5], height: 4.5 },
      { kind: 'fackel', pos: [-9.2, Y1, -132.5], mount: 'stand' }, { kind: 'fackel', pos: [9.2, Y1, -132.5], mount: 'stand' },
      { kind: 'fackel', pos: [-9.2, Y1, -179], mount: 'stand' }, { kind: 'fackel', pos: [9.2, Y1, -179], mount: 'stand' },
      { kind: 'fackel', pos: [-10.2, Y2, -356.5], mount: 'stand' }, { kind: 'fackel', pos: [10.2, Y2, -356.5], mount: 'stand' },
      { kind: 'fahne', pos: [-7, YZ, -479], height: 5 }, { kind: 'fahne', pos: [7, YZ, -479], height: 5 },
      { kind: 'glutriss', pos: [0, Y0 + 0.02, -20], length: 3, yaw: 0.4 }, { kind: 'glutriss', pos: [2.5, Y0 + 0.02, -86], length: 2.4, yaw: -0.3 },
      { kind: 'glutriss', pos: [-6, Y1 + 0.02, -138], length: 3, yaw: 0.2 }, { kind: 'glutriss', pos: [5, Y1 + 0.02, -188], length: 3, yaw: -0.5 },
      { kind: 'knochen', pos: [-7.5, Y1, -259], n: 4 }, { kind: 'knochen', pos: [8, Y2, -404], n: 3 },
      // glühende Risse und Knochen auf den großen Plateaus (ohne Kollision – die Wege bleiben frei)
      { kind: 'glutriss', pos: [6.5, Y1 + 0.02, -135.5], length: 2.6, yaw: 0.7 }, { kind: 'glutriss', pos: [3.6, Y1 + 0.02, -144.6], length: 2, yaw: -0.2 },
      { kind: 'knochen', pos: [-8.6, Y1, -144.6], n: 3 },
      { kind: 'glutriss', pos: [-5, Y1 + 0.02, -247.8], length: 2.5, yaw: 0.7 }, { kind: 'glutriss', pos: [-3.5, Y1 + 0.02, -192], length: 2.4, yaw: 0.3 },
      { kind: 'glutriss', pos: [-4.5, Y2 + 0.02, -359.5], length: 2.6, yaw: 0.3 }, { kind: 'glutriss', pos: [4.6, Y2 + 0.02, -364.6], length: 2, yaw: -0.6 },
      { kind: 'knochen', pos: [-9.6, Y2, -364.8], n: 3 },
      { kind: 'glutriss', pos: [-6, Y2 + 0.02, -401.5], length: 3, yaw: -0.2 }, { kind: 'glutriss', pos: [5.5, Y2 + 0.02, -398.2], length: 2.2, yaw: 0.4 },
      { kind: 'fackel', pos: [-11.3, Y2, -397], mount: 'stand' }, { kind: 'fackel', pos: [11.3, Y2, -397], mount: 'stand' },
      { kind: 'lavafall', pos: [-15.5, LAVA + 17, -118], width: 3, height: 17, yaw: Math.PI / 2 },
      { kind: 'lavafall', pos: [15.5, LAVA + 15, -122], width: 3, height: 15, yaw: -Math.PI / 2 },
      { kind: 'lavafall', pos: [-16.5, LAVA + 19, -340], width: 3.4, height: 19, yaw: Math.PI / 2 },
      { kind: 'lavafall', pos: [16.5, LAVA + 19, -346], width: 3.4, height: 19, yaw: -Math.PI / 2 },
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-12, LAVA, -60], n: 5, height: [8, 14], size: [6, 20] },
      { kind: 'basaltsaeulen', pos: [12, LAVA, -170], n: 5, height: [9, 15], size: [6, 22] },
      { kind: 'basaltsaeulen', pos: [-14, LAVA, -230], n: 5, height: [9, 15], size: [6, 24] },
      { kind: 'basaltsaeulen', pos: [14, LAVA, -290], n: 5, height: [10, 16], size: [6, 24] },
      { kind: 'basaltsaeulen', pos: [-15, LAVA, -390], n: 5, height: [11, 18], size: [6, 20] },
      { kind: 'vulkanfelsen', pos: [13, LAVA + 0.5, -40], size: [6, 14], n: 3 },
      { kind: 'vulkanfelsen', pos: [-14, LAVA + 0.5, -190], size: [6, 14], n: 3 },
      { kind: 'vulkanfelsen', pos: [16, LAVA + 0.5, -400], size: [6, 14], n: 3 },
    ] },
    // Schanze auf dem Pfeil-Damm (Sternmünzen 7 und 8 auf dem Absatz)
    { type: 'ramp', pos: [0, Y1, -235], size: [3, 1.2, 4] },
    { type: 'sign', pos: [-5.2, Y0, 9], text: 'Glutpiste', size: [2.6, 0.9], yaw: 0 },
    { type: 'sign', pos: [-4, Y1, -142], text: 'Drei Wege!', size: [2.4, 0.9], yaw: 0 },
    { type: 'sign', pos: [-4, Y2, -362], text: 'Drei Wege!', size: [2.4, 0.9], yaw: 0 },
    { type: 'sign', pos: [-5.2, Y2, -404.5], text: 'Ziel-Röhren', size: [2.6, 0.9], yaw: 0 },
    { type: 'sign', pos: [VX - 6, Y1, -263.5], text: 'Pilzling-Versteck', size: [3.2, 0.9], yaw: 0 },
  ],
  blocks: [
    { kind: 'question', pos: [-3, Y0 + 2.2, 3], content: 'sichel' },
    { kind: 'question', pos: [3, Y0 + 2.2, 3], content: 'coins:5' },
    { kind: 'hidden', pos: [6.5, Y1 + 2.6, -140], content: 'oneup' },
    // Versteck: Funkelstern, Münzblock, unsichtbares Extraleben
    { kind: 'question', pos: [VX - 6, Y1 + 2.2, -259], content: 'stern' },
    { kind: 'coinblock', pos: [VX - 2, Y1 + 2.2, -259], count: 8 },
    { kind: 'hidden', pos: [VX + 10, Y1 + 2.6, -258], content: 'oneup' },
  ],
  enemies: [
    // 24 Pilzlinge im Versteck: vier Reihen marschieren quer durch den Hof
    ...[-243, -248, -253].flatMap((z, r) => [-11, -6.5, -2, 2.5, 7, 11.5].map((dx, i) => ({
      kind: 'pilzling', pos: [VX + dx, Y1, z], path: [[VX - 12.5, Y1, z], [VX + 12.5, Y1, z]], speed: 1.2 + 0.15 * ((i + r) % 3), drop: 'coin',
    }))),
    ...[-6, -1, 4, 9, 12, -11].map((dx) => ({ kind: 'pilzling', pos: [VX + dx, Y1, -256], path: [[VX + dx, Y1, -240], [VX + dx, Y1, -256]], speed: 1.1, drop: 'coin' })),
  ],
  items: [
    // Rasstrecke 1
    line([0, Y0 + 0.5, -8], [0, Y0 + 0.5, -27], 6), ...arc([0, Y0 + 1, -29], [0, Y0 + 1, -38], 5, 2.2),
    line([0, Y0 + 0.5, -42], [0, Y0 + 0.5, -50], 3), line([0, Y0 + 0.9, -54], [0, Y0 + 0.9, -64], 5),
    line([2.4, Y0 + 0.5, -80], [2.4, Y0 + 0.5, -84], 3), line([-2.4, Y0 + 0.5, -87], [-2.4, Y0 + 0.5, -92], 3),
    ...arc([0, Y0 + 1.5, -96], [0, Y0 + 1.5, -104], 5, 2.8),
    ring([0, Y1 + 0.5, -139], 2.2, 8),
    line([-7, Y1 + 0.9, -157], [-7, Y1 + 0.9, -164], 4), ...arc([0, Y1 + 1, -159], [0, Y1 + 1, -167], 4, 2.2),
    line([7, Y1 + 0.5, -158], [7, Y1 + 0.5, -161], 2), line([7, Y1 + 0.5, -167], [7, Y1 + 0.5, -171], 3),
    // Rasstrecke 2
    line([-6.5, Y1 + 0.5, -264], [-6.5, Y1 + 0.5, -272], 4), ...arc([-7.5, Y1 + 1, -274], [-8, Y1 + 1, -280], 4, 2),
    line([0, Y1 + 0.9, -287], [0, Y1 + 0.9, -292], 4), line([0, Y1 + 0.5, -297], [0, Y1 + 0.5, -309], 5),
    line([2.4, Y1 + 0.5, -317], [2.4, Y1 + 0.5, -321], 3), line([-2.4, Y1 + 0.5, -325], [-2.4, Y1 + 0.5, -329], 3),
    line([-8.5, Y2 + 0.5, -368], [-8.5, Y2 + 0.5, -377], 4), ...arc([-8.5, Y2 + 1, -377], [-8.5, Y2 + 1, -383], 3, 2),
    line([8.5, Y2 + 0.9, -378], [8.5, Y2 + 0.9, -384], 4), line([0, Y2 + 0.5, -374.5], [0, Y2 + 0.5, -377.5], 2), line([0, Y2 + 0.5, -382.5], [0, Y2 + 0.5, -385.5], 2),
    // Dreifach-Gabelung
    line([-10.5, Y2 + 0.5, -409], [-10.5, Y2 + 0.5, -417], 4), line([-9.5, Y2 + 0.9, -422.5], [-8, Y2 + 0.9, -425], 3),
    ...arc([0, Y2 + 1, -420], [0, Y2 + 1, -427], 4, 2), ...arc([0, Y2 + 1, -433], [0, Y2 + 1, -440], 4, 2),
    line([9.6, Y2 + 0.5, -421], [9.6, Y2 + 0.5, -423], 2), line([11.4, Y2 + 0.5, -429], [11.4, Y2 + 0.5, -432], 2),
    line([-4, YZ + 0.5, -470], [4, YZ + 0.5, -470], 5),
    // Versteck
    ring([VX, Y1 + 0.5, -250], 3, 10), ring([VX - 8, Y1 + 0.5, -246], 1.6, 6), ring([VX + 8, Y1 + 0.5, -246], 1.6, 6),
    // Sternring (Stern 1): acht Sternmünzen den Pfeil-Damm entlang
    {
      kind: 'starring', id: 'sternring', pos: [0, Y1, -189], star: 1,
      coins: [[0, Y1 + 0.5, -203], [0, Y1 + 0.5, -209], [0, Y1 + 0.5, -215], [0, Y1 + 0.5, -221], [0, Y1 + 0.5, -227], [0, Y1 + 0.5, -233],
        [0, Y1 + 1.7, -238], [0, Y1 + 1.7, -240.3]],
    },
  ],
  checkpoint: [{ pos: [0, Y1, -183], yaw: Math.PI / 2 }, { pos: [0, Y2, -400], yaw: Math.PI / 2 }],
  stars: [
    [7, Y1 + 1.1, -176.4],
    { pos: [4.5, Y1 + 1.0, -252.5], hidden: true, id: 'stern1' },
    [0, Y2 + 1.1, -394],
  ],
  stamp: [-8, Y1 + 0.25, -283.5],
  goal: [0, YZ, -476],
  marks: {
    start: [0, Y0, 7], cp1: [0, Y1, -183], ring: [0, Y1, -189], grube: [4.5, Y1 - 2.5, -252.5], versteck: [VX - 10, Y1, -260],
    stempel: [-8, Y1, -283.5], cp2: [0, Y2, -400], ziel: [0, YZ, -476],
  },
};
