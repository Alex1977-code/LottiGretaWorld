// 8-Burg „Gipfelsturm am Brummbär-Turm“ (Archetyp boss, Finale der Welt 8 „Brummbär-Rummelplatz“; Bauplan 8-Burg: Rummelplatz
// um den hohen Turm, ≈ 300 m, davon ≈ 80 m Höhe, 500 s; frei nach 8-A und 8-B und ab 190 Sternen). Thema baronpark, Musik
// course_finale, 3 Sterne + Stempel. Level verläuft nach −Z; die Dächer, Plätze und der Turm stehen auf dem Rummelboden der
// Kulisse (22 m unter y = 0) – Abstürze enden unter killY.
//
// Abschnitte:
//   A Unfallstelle  z  +9 … −34   Start bei den qualmenden Trümmern von Baron Brummbärs Rennwagen (Leitkegel, Torbogen, Buden),
//                                 Seilbahn 1 über den Abgrund hinauf zu den Dächern
//   B Dächer        z −34 … −110  fünf Rummelhaus-Dächer mit 3–4,5-m-Lücken: Bodenstacheln (Stachelfallen im Takt), Lavabrocken-
//                                 Regen aus dem Vulkan, Krallen-Pilzlinge, Feuer-Werfer; Uhrturm des ersten Hauses (Stern 0)
//   C Riesenrad     z −110 … −147 Riesenrad-Platz (Kontrollpunkt, Karussell, Buden), Riesenrad Ø 26 m mit acht Gondeln, vier
//                                 davon mit Schubsern; mit einer Gondel hinauf zur Bergstation; Grube unter dem Rad (Treppe zurück)
//   D Seilbahn 2    z −147 … −168 hinüber zum Turmplatz
//   E Turm unten    z −168 … −197 Turmplatz (Kontrollpunkt), Kletterfront mit Simsen (≈ 20 m): **Baron Brummbär im Krallen-Anzug**
//                                 klettert voraus, spuckt Feuer, rutscht herab und reißt Wandstücke ein; oben bewacht er den
//                                 POW-Block – getroffen fliegt er davon, die Sperre vor dem Kanonenhaus fällt
//   F Oberer Turm   z −197 … −235 Kanonen-Glasröhre auf Türmchen A (Kontrollpunkt), Brücken aus Wegstücken zu Türmchen B und C:
//                                 er frisst Spiegelfrüchte, Doppelgänger stürmen die Brücken und lassen Wegstücke zerbröckeln;
//                                 Kanonen-Glasröhre 2 hinauf zum Gipfel
//   G Gipfel        z −235 … −261 Gipfel Ø 26 m (Kontrollpunkt): Super-POW-Block 4× anstoßen, der Baron fliegt davon, das Glas
//                                 der Freunde zerbricht; Sternenring in der ersten Finalphase; Glasröhre zum Siegerturm
//   H Siegerturm    z −279 … −298 Kelch-Plattform mit den befreiten Freunden, Glockenbaum (Stempel) und Zielmast; Feuerwerk;
//                                 nach dem Ergebnis startet der Abspann ({ credits: true })
// Sterne: 0 **nach der ersten Seilbahn rechts oben auf dem Uhrturm** des ersten Hauses · 1 **alle vier Schubser vom Riesenrad
//         stoßen** (onGroup) · 2 **Sternenring in der ersten Finalphase** auf dem Gipfel (acht Sternmünzen, 16 s).
// Stempel: am Zielmast **über dem Glockenbaum** (Stamm hinaufklettern, oben abspringen).
// Extraleben: unsichtbarer Block über dem Autowrack („Hupe“) · unsichtbarer Block über dem Kamin auf Dach 4.
// Power-ups: Krallen-Anzug am Start und am Turmplatz, Wachstumsbeere auf Dach 1 und am Riesenrad-Platz.
// Gegner: Krallen-Pilzlinge 3, Feuer-Werfer 2, Schubser 4 (Riesenrad), Stachelfallen 3, Baron Brummbär im Krallen-Anzug.

import {
  FY, dach, line, ring, arc, column, sign, Bld, HAUS, TURM, haus, kamin, vulkan, trommel, tuermchen, kletterfront, schaft, kelchturm,
  birnenKette, schilder, glockenbaum, bodenRummel, seilPortal, kanonenTor, rundDeckel, parkKulisse, freundeFest, feuerwerk, glockenKlang, glowPoints,
} from './_helpers_e.js';
import { runAction } from '../../entities/gimmick.js';

// ---------------------------------------------------------------- Maße
const Y0 = 2;                        // Unfallstelle (Start)
const RAD = { x: 0, y: 22.2, z: -136.5, r: 13 };   // Riesenrad-Achse (unterste Planke auf 8, oberste auf 34)
const PZ = 8;                        // Riesenrad-Platz
const ST = 34;                       // Bergstation
const T0 = 30;                       // Turmplatz
const STEP = 2.8;                    // Simse der Kletterfront
const TT = T0 + 7 * STEP;            // 49.6 Turmterrasse
const FACE = -187;                   // Vorderseite der Kletterfront
const DRUM = { z: -212, r: 20 };     // Turm-Trommel
const UA = 62, UB = 64, UC = 66;     // Türmchen A, B, C (Oberseiten)
const ZA = -205.5, ZB = -217, ZC = -228.7;
const G = 82, ZG = -248;             // Gipfel
const ZIEL = { y: 76, z: -288.5, r: 9 };

const STEG = (id, x, y, zc, len) => ({ kind: 'bruchstueck', id, pos: [x, y, zc], size: [1.5, 0.6, len], look: 'holz' });
const WAND = (id, x, y) => ({ kind: 'bruchstueck', id, pos: [x, y, FACE + 0.4], size: [1.6, 0.9, 0.8], look: 'stein' });
const SIMS = (x, top) => ({ type: 'platform', pos: [x, top - 0.6, FACE + 1.3], size: [3.6, 0.6, 2.6], style: 'stone' });
const SCHUB = (id, i, extra = {}) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 4;
  return { kind: 'schubser', id, pos: [+(RAD.x + Math.cos(a) * RAD.r).toFixed(3), +(RAD.y + Math.sin(a) * RAD.r - 1.2 + 0.3).toFixed(3), RAD.z], behavior: 'guard', sight: 2.5, group: 'riesenrad', fallDefeat: 1.6, ...extra };
};

// ---------------------------------------------------------------- Aufbau (Kulisse, Kollision; vor dem Verschmelzen)
function prebuild(level) {
  parkKulisse(level);
  // DEBUG-TRIS (vorübergehend)
  if (typeof location !== 'undefined' && location.search.includes('w8edebug') && level.view) {
    const v = level.view, orig = v.addStatic.bind(v);
    const acc = window.__w8tris = { phase: 'seg' };
    v.addStatic = (gg, o) => {
      const key = `${acc.phase}${o?.material === 'glow' ? ':glow' : ''}${o?.castShadow === false ? '' : ':S'}`;
      const n = gg?.index ? gg.index.count / 3 : (gg?.attributes?.position?.count ?? 0) / 3;
      acc[key] = (acc[key] ?? 0) + Math.round(n);
      (acc.seq ??= []).push([acc.phase, Math.round(n), o?.material ?? 'w', o?.castShadow === false ? 0 : 1, Math.round(gg?.boundingSphere?.center?.z ?? (gg.computeBoundingSphere(), gg.boundingSphere.center.z))]);
      return orig(gg, o);
    };
  }
}

function build(level) {
  if (typeof window !== 'undefined' && window.__w8tris) window.__w8tris.phase = 'build';
  const W = level.world;
  // ---- Kollision des Turms
  // Kletterfront (kletterbar mit dem Krallen-Anzug): links, rechts, Rinne in der Mitte
  W.add({ type: 'box', min: [-5, T0, -195], max: [-1.2, TT, FACE], climbable: true, tag: 'kletterfront' });
  W.add({ type: 'box', min: [1.2, T0, -195], max: [5, TT, FACE], climbable: true, tag: 'kletterfront' });
  W.add({ type: 'box', min: [-1.2, T0, -195], max: [1.2, TT, FACE - 1], climbable: true, tag: 'kletterrinne' });
  W.add({ type: 'cyl', x: 0, z: DRUM.z, r: DRUM.r, y0: T0, y1: TT, tag: 'trommel' });
  // Brüstung um die Terrasse (nicht über der Kletterfront), unsichtbar über den Zinnen
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.34) continue;
    const x = Math.cos(a) * (DRUM.r - 0.3), z = DRUM.z + Math.sin(a) * (DRUM.r - 0.3);
    W.add({ type: 'box', min: [x - 1.05, TT, z - 1.05], max: [x + 1.05, TT + 1.2, z + 1.05], camIgnore: true, tag: 'zinne' });
  }
  // Kanonenhaus auf der Terrasse (Glasröhre dahinter; der Baron sperrt die Öffnung, solange er wacht)
  W.add({ type: 'box', min: [0.9, TT, -199.4], max: [1.3, TT + 4.6, -193.2], tag: 'kanonenhaus' });
  W.add({ type: 'box', min: [4.6, TT, -199.4], max: [5.0, TT + 4.6, -193.2], tag: 'kanonenhaus' });
  W.add({ type: 'box', min: [0.9, TT, -199.8], max: [5.0, TT + 4.6, -199.4], tag: 'kanonenhaus' });
  W.add({ type: 'box', min: [0.9, TT + 4.6, -197.6], max: [5.0, TT + 5.0, -193.2], tag: 'kanonenhaus' });
  // Türmchen
  W.add({ type: 'cyl', x: 0, z: ZA, r: 4.2, y0: TT, y1: UA, tag: 'tuermchen' });
  W.add({ type: 'cyl', x: 0, z: ZB, r: 4.0, y0: TT, y1: UB, tag: 'tuermchen' });
  W.add({ type: 'cyl', x: 0, z: ZC, r: 4.2, y0: TT, y1: UC, tag: 'tuermchen' });
  // Gipfel (Plattform Ø 26 m) mit unsichtbarem Zaun über den Zinnen und Fahnenmasten
  W.add({ type: 'cyl', x: 0, z: ZG, r: 13, y0: G - 2, y1: G, tag: 'gipfel' });
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, x = Math.cos(a) * 13.35, z = ZG + Math.sin(a) * 13.35;
    W.add({ type: 'box', min: [x - 1.25, G, z - 1.25], max: [x + 1.25, G + 2.4, z + 1.25], camIgnore: true, tag: 'gipfelzaun' });
  }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; W.add({ type: 'cyl', x: Math.cos(a) * 11.8, z: ZG + Math.sin(a) * 11.8, r: 0.28, y0: G, y1: G + 7, tag: 'fahnenmast' }); }
  // Siegerturm (Kelch) mit Zaun
  W.add({ type: 'cyl', x: 0, z: ZIEL.z, r: ZIEL.r, y0: ZIEL.y - 4, y1: ZIEL.y, tag: 'siegerturm' });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, x = Math.cos(a) * (ZIEL.r + 0.45), z = ZIEL.z + Math.sin(a) * (ZIEL.r + 0.45);
    W.add({ type: 'box', min: [x - 1.05, ZIEL.y, z - 1.05], max: [x + 1.05, ZIEL.y + 2.2, z + 1.05], camIgnore: true, tag: 'kelchzaun' });
  }
  // Autowrack (fest), Kamin mit Geheimnis auf Dach 4, Grube unter dem Riesenrad
  W.add({ type: 'box', min: [-6.4, Y0, -4.1], max: [-2.2, Y0 + 1.5, -0.3], tag: 'autowrack' });
  W.add({ type: 'box', min: [-4.0, 8.6, -94.2], max: [-2.8, 10.6, -93.0], tag: 'kamin' });
  W.add({ type: 'box', min: [-13.8, 4, -142.4], max: [-5, 9, -141.6], tag: 'grube' });
  W.add({ type: 'box', min: [5, 4, -142.4], max: [13.8, 9, -141.6], tag: 'grube' });
  W.add({ type: 'box', min: [-13.8, 4, -142.4], max: [-13, 9, -134.2], tag: 'grube' });
  W.add({ type: 'box', min: [13, 4, -142.4], max: [13.8, 9, -134.2], tag: 'grube' });

  // ---- Kulisse (verschmolzen)
  // b: große Kulisse ohne Sonnenschatten (Fassaden, Turmkörper, Vulkan), bs: kleine Teile auf begehbaren Flächen (mit Schatten)
  const b = new Bld(), bs = new Bld(), g = new Bld();
  // Häuser unter den Dächern (Rummelhäuser vom Rummelboden bis zum Dach)
  haus(level, b, g, { x0: -9, x1: 9, z0: 9, z1: -10.2, top: Y0, color: HAUS.flieder, markise: 1, step: 3.2 });
  haus(level, b, g, { x0: -5, x1: 5, z0: -34.8, z1: -48, top: 8, color: HAUS.rosa, markise: 0 });
  haus(level, b, g, { x0: 5, x1: 11, z0: -36, z1: -46.5, top: 10.6, color: HAUS.himmel, markise: 3, faces: ['vorn', 'rechts'] });
  haus(level, b, g, { x0: -4.5, x1: 4.5, z0: -51, z1: -64, top: 8, color: HAUS.mint, markise: 2 });
  haus(level, b, g, { x0: -5, x1: 5, z0: -68, z1: -80, top: 6.6, color: HAUS.zitrone, markise: 4 });
  haus(level, b, g, { x0: -4.5, x1: 4.5, z0: -83.5, z1: -95, top: 8.6, color: HAUS.pfirsich, markise: 5 });
  haus(level, b, g, { x0: -5, x1: 5, z0: -99.5, z1: -110, top: 8, color: HAUS.himmel, markise: 0 });
  haus(level, b, g, { x0: -13, x1: 13, z0: -110.6, z1: -134.2, top: PZ, color: HAUS.flieder, markise: 3, step: 3.4 });
  haus(level, b, g, { x0: -5, x1: 5, z0: -138.9, z1: -146.3, top: ST, color: HAUS.rosa, markise: 2, faces: ['vorn', 'links', 'rechts'] });
  haus(level, b, g, { x0: -13, x1: 13, z0: -168.4, z1: -197, top: T0, color: HAUS.mint, markise: 1, step: 3.4, faces: ['vorn', 'links', 'rechts'] });
  // Uhrturm des ersten Hauses (Stern 0 obenauf)
  haus(level, b, g, { x0: 7.6, x1: 10.4, z0: -38.6, z1: -41.4, top: 13.2, base: 10.6, color: HAUS.zitrone, markise: false, door: false, faces: ['vorn', 'rechts'] });
  bs.cyl(1.05, 1.05, 0.18, 9, 11.2, -38.5, 0xfff6e0, 20, { rx: Math.PI / 2 });
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; b.box(0.08, 0.16, 0.06, 9 + Math.cos(a) * 0.86, 11.21 + Math.sin(a) * 0.86 - 0.08, -38.38, 0x3a2a4a, { r: 0 }); }
  b.box(0.08, 0.7, 0.05, 9.1, 11.25, -38.36, 0x3a2a4a, { r: 0, rz: -0.5 });
  b.box(0.08, 0.5, 0.05, 8.92, 11.28, -38.35, 0x3a2a4a, { r: 0, rz: 1.1 });
  bs.cone(2.2, 1.6, 9, 13.2 - 0.02, -40, 0xe8423a, 4, { yaw: Math.PI / 4, s: [1, 0.35, 1] });
  // Kamine auf den Dächern (einer mit Geheimnis)
  kamin(bs, -3.4, 8.6, -93.6, 2.0, 1.2, 0xc86a4a);
  kamin(bs, 3.6, 8, -46.2, 1.4, 0.8); kamin(bs, -3.6, 6.6, -78.6, 1.6, 0.9, 0x8a5a9a); kamin(bs, 3.8, 8, -108.8, 1.2, 0.8, 0x5a6aa8);
  // Vulkan (Quelle des Lavabrocken-Regens) links hinten
  vulkan(level, b, g, -62, -150, FY, 58, 34);
  // Der große Turm: Turmplatz-Haus darunter, Trommel, Kletterfront, Türmchen, Gipfelschaft, Kanonenhaus
  trommel(level, b, g, { x: 0, z: DRUM.z, r: DRUM.r, y0: FY, y1: TT, skip: [Math.PI / 2 - 0.36, Math.PI / 2 + 0.36], seg: 56, band0: 8, winFrom: T0 - 4 });
  kletterfront(level, b, g, { x0: -5, x1: 5, face: FACE, d: 8, y0: T0, y1: TT, rx: 1.2, rd: 1, torches: [[-4.4, T0 + 2.2], [4.4, T0 + 2.2], [-4.4, TT - 3], [4.4, TT - 3]] });
  rundDeckel(b, 0, TT + 0.02, DRUM.z, DRUM.r - 0.5, [0xb8aac8, 0xa898c0]);
  b.box(10, 0.14, 8, 0, TT - 0.12, FACE - 4, 0xb8aac8, { r: 0 });
  tuermchen(level, bs, g, 0, ZA, 4.2, TT - 0.5, UA, { flagAt: [3.0, -2.6], flagColor: 0xffc83a });
  tuermchen(level, bs, g, 0, ZB, 4.0, TT - 0.5, UB, { flagAt: [-2.8, -2.6], phase: 0.4 });
  tuermchen(level, bs, g, 0, ZC, 4.2, TT - 0.5, UC, { flagAt: [3.0, -2.2], flagColor: 0x9a5ae8 });
  schaft(level, b, g, { x: 0, z: ZG, r: 11.2, y0: FY, y1: G - 11.8, seg: 44, band0: 10, winFrom: TT });
  // Kanonenhaus (Ziegel, Goldrand, Dach)
  bs.box(0.4, 4.6, 6.2, 1.1, TT, -196.3, TURM.brick, { r: 0.04 });
  bs.box(0.4, 4.6, 6.2, 4.8, TT, -196.3, TURM.brick, { r: 0.04 });
  bs.box(4.1, 4.6, 0.4, 2.95, TT, -199.6, TURM.brickLow, { r: 0.04 });
  bs.box(4.5, 0.42, 4.8, 2.95, TT + 4.6, -195.4, TURM.red, { r: 0.08 });
  bs.box(4.7, 0.16, 5.0, 2.95, TT + 4.5, -195.4, TURM.gold, { r: 0.04 });
  // Siegerturm (Kelch)
  kelchturm(level, b, g, 0, ZIEL.z, ZIEL.r, ZIEL.y);
  // Glockenbaum am Zielmast (Stempel darüber)
  glockenbaum(level, bs, g, -4.6, ZIEL.y, -292.5, 5.2);
  // Rummelboden unter den Dächern: Zelte, Buden, Laternen (sparsame eigene Geometrie)
  bodenRummel(level, b, g, [[-19, -20, 6, 0], [21, -44, 5, 1], [-18, -78, 7, 2], [20, -108, 6, 3], [-22, -150, 7, 4], [22, -186, 6, 5], [-24, -228, 8, 0], [24, -262, 7, 2], [-20, -300, 6, 1]]);
  // Seilbahn-Stationen: Portale an beiden Enden (Seil hängt am Querbalken, der Weg bleibt frei)
  seilPortal(bs, g, 0, Y0, -9.9, 4.2); seilPortal(bs, g, 0, 8, -35.1, 2.2); seilPortal(bs, g, 0, ST, -145.9, 2.2); seilPortal(bs, g, 0, T0, -168.7, 2.2);
  // Unfallstelle: Bremsspuren, Ruß, verbogene Leitplanke hinten
  for (const sx of [-0.75, 0.75]) for (let i = 0; i < 5; i++) b.box(0.26, 0.02, 1.5, -1.6 + sx - i * 0.42, Y0 + 0.012, 6.4 - i * 1.45, 0x4a3a4e, { r: 0, yaw: 0.28 });
  b.cyl(2.2, 2.2, 0.02, -4.3, Y0 + 0.008, -2.2, 0x3a2a34, 20);
  // Glühbirnen-Ketten über den Lücken (zeigen den Weg)
  birnenKette(level, g, [-4.6, 11.4, -47.8], [-4.4, 11.4, -51.2], 4, 0.5);
  birnenKette(level, g, [4.6, 11.4, -47.8], [4.4, 11.4, -51.2], 4, 0.5);
  birnenKette(level, g, [-4.3, 11, -63.8], [-4.6, 10, -68.2], 5, 0.6);
  birnenKette(level, g, [4.3, 11, -63.8], [4.6, 10, -68.2], 5, 0.6);
  birnenKette(level, g, [-4.6, 10, -79.8], [-4.3, 11.6, -83.7], 5, 0.5);
  birnenKette(level, g, [4.6, 10, -79.8], [4.3, 11.6, -83.7], 5, 0.5);
  birnenKette(level, g, [-4.3, 11.6, -94.8], [-4.6, 11, -99.7], 6, 0.7);
  birnenKette(level, g, [4.3, 11.6, -94.8], [4.6, 11, -99.7], 6, 0.7);
  for (const sx of [-1, 1]) birnenKette(level, g, [sx * 4.6, ST + 3.2, -146.3], [sx * 9, T0 + 4.2, -168.6], 18, 1.4);
  // Gipfel: Funkeln um den Super-POW-Block
  glowPoints(level, [[0, G + 7.5, ZG - 1, 3.5]], { color: 0x7ab8ff, size: 4, opacity: 0.35, pulse: 0.4 });
  b.flush(level, { castShadow: false });
  bs.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  // Leuchtschilder (ein Atlas, ein Zeichenaufruf)
  schilder(level, [
    { pos: [0, Y0 + 6.3, -8.2], text: 'Brummbär-Rummel', w: 4.6, bg: '#8a2a6a' },
    { pos: [0, 6.2, -34.86], text: 'Zuckerwatte', w: 3.4, bg: '#e8508a' },
    { pos: [0, 6.2, -51.06], text: 'Losbude', w: 3.0, bg: '#2a8a6a' },
    { pos: [0, 4.8, -68.06], text: 'Popcorn', w: 3.0, bg: '#c8781a' },
    { pos: [0, 6.8, -83.56], text: 'Geisterbahn', w: 3.4, bg: '#5a3a9a' },
    { pos: [0, 6.2, -99.56], text: 'Autoscooter', w: 3.4, bg: '#2a5ac8' },
    { pos: [0, PZ - 1.6, -110.66], text: 'Riesenrad', w: 5.2, bg: '#a82a5a' },
    { pos: [0, ST - 1.8, -138.96], text: 'Bergstation', w: 3.6, bg: '#8a2a6a' },
    { pos: [0, T0 - 1.8, -168.46], text: 'Brummbär-Turm', w: 5.6, bg: '#5a1a4a' },
    { pos: [0, ZIEL.y + 6.2, -297.6], text: 'Danke, ihr Lieben!', w: 6.4, bg: '#d83a7a', edge: '#ffe46a' },
  ]);
}

// ---------------------------------------------------------------- Ablauf (je Schritt, Signale)
function setup(level) {
  if (level._burg) return;
  level._burg = true;
  const fest = freundeFest(level, [[2.4, ZIEL.y, -284.6], [4.6, ZIEL.y, -287.2], [-2.6, ZIEL.y, -285.2], [2.8, ZIEL.y, -290.6]]);
  const fw = feuerwerk(level, [0, ZIEL.y + 4, -300], { n: 30, every: 0.8, spread: 22 });
  level.burg = { fest, fw };
  glockenKlang(level);
  const baron = level.named.get('baron');
  // Gitter vor den Kanonen-Glasröhren: zu, bis der jeweilige Kampfabschnitt geschafft ist (wer dem Baron davonläuft, kommt
  // nicht an ihm vorbei); POW-Block erscheint erst, wenn der Baron oben an ihm wacht
  const tore = [
    kanonenTor(level, { min: [1.3, TT, -193.8], max: [4.6, TT + 4.6, -193.2] }),
    kanonenTor(level, { min: [-1.4, UC, -230.0], max: [1.4, UC + 2.6, -228.9] }),
  ];
  level.onSignal('baronAbschnitt', (d) => { if (d?.index === 0) tore[0].open(); if (d?.index === 1) tore[1].open(); });
  level.onStep(() => {
    const pw = level.named.get('pow_turm');
    if (pw?.hidden && baron?.guarding) runAction(level, { reveal: 'pow_turm' }, { pos: [-2.6, TT, -190.4] });
  });
  // Sternenring erscheint mit dem Gipfelkampf (oberer Turm geschafft), verschwindet mit dem Sieg (wenn nicht geschafft)
  level.onSignal('baronAbschnitt', (d) => { if (d?.index === 1) runAction(level, { reveal: 'sternring' }, { pos: [0, G, ZG] }); });
  let hiddenAfter = false;
  level.onStep(() => {
    if (hiddenAfter || !baron) return;
    if (baron.state === 'defeated' || baron.state === 'flyaway' || baron.state === 'gone') {
      hiddenAfter = true;
      const r = level.named.get('sternring');
      if (r && r.state !== 'done') { if (r.state === 'active') r.fail(); runAction(level, { hide: 'sternring' }); }
    }
  });
  // Befreiung: die Freunde warten am Siegerturm, Feuerwerk über dem Ziel
  level.onSignal('freundeFrei', () => fest.show());
  level.onSignal('finaleWon', () => { fest.show(); fw.start(); });
  // Ansage am Siegerturm
  let greeted = false;
  level.onStep(() => {
    const p = level.player;
    if (greeted || !p || p.dead || p.mode === 'script' || !fest.shown) return;
    if (p.pos.z < ZIEL.z + 8 && p.pos.y > ZIEL.y - 1 && p.mode === 'ground') {
      greeted = true;
      level.archetype?.hud?.banner?.('Ihr habt uns befreit – danke!', { hold: 2.6, size: 14, color: '#ffe080' });
      level.sfx('victory');
    }
  });
}

export const LEVEL = {
  id: '8-Burg',
  world: 8,
  title: 'Gipfelsturm am Brummbär-Turm',
  archetype: 'boss',
  theme: 'baronpark',
  music: 'course_finale',
  timeLimit: 500,
  credits: true,
  start: { pos: [0, Y0, 5.5], yaw: Math.PI / 2 },
  killY: -8,
  prebuild,
  build,
  setup,
  camera: [
    { from: 14, to: -12, pitch: 40, dist: 13.5, ahead: 2.2 },
    { from: -12, to: -35, pitch: 38, dist: 14, ahead: 2 },
    { from: -35, to: -111, pitch: 44, dist: 14, ahead: 2.6 },
    { from: -111, to: -131, pitch: 36, dist: 16, ahead: 2 },
    { from: -131, to: -141, pitch: 14, dist: 27, height: 4, ahead: 0 },
    { from: -141, to: -168, pitch: 36, dist: 15, ahead: 2.2 },
    { from: -168, to: -199, pitch: 26, dist: 18, x: 0, xLock: 0.45, ahead: 0.3, lead: 0.3, height: 2.6 },
    { from: -199, to: -235, pitch: 36, dist: 15, x: 0, xLock: 0.4, ahead: 1.4, lead: 0.4, height: 1.8 },
    { from: -235, to: -262, pitch: 30, dist: 20, x: 0, xLock: 0.3, ahead: 0.5, lead: 0.3, height: 6.5 },
    { from: -262, to: -306, pitch: 38, dist: 13, ahead: 2 },
  ],
  boss: {
    id: 'baron', name: 'Baron Brummbär', speed: 0,
    trigger: { min: [-12, T0 - 0.5, -186], max: [12, T0 + 6, -176] },
    warp: 'glasroehre', warpPos: [0, G, ZG - 9.6], frame: 0.2, center: [0, T0, -186],
    warpBanner: 'Ab in die Glasröhre!', musicAfter: 'course_finale',
  },
  segments: [
    // ================================================================ A Unfallstelle
    dach(-9, 9, 9, -10.2, Y0, { top: 'stone', h: 2 }),
    { type: 'seilbahn', id: 'seilbahn1', from: [0, Y0 + 2.2, -11.6], to: [0, 10.2, -33.4], speed: 3, trigger: 'stand', mode: 'pingpong', masts: false },
    { type: 'hwdeco', items: [
      { kind: 'cones', from: [-7.6, Y0, 6.5], to: [-7.6, Y0, 0.5], n: 4 }, { kind: 'cone', pos: [-1.2, Y0, -5.2] }, { kind: 'cone', pos: [7.2, Y0, 7.4] },
      { kind: 'barrier', from: [5.2, Y0, 8.4], to: [8.4, Y0, 8.4] },
    ] },
    { type: 'deco_w8', items: [
      { kind: 'modell', name: 'autowrack', pos: [-4.3, Y0, -2.2], yaw: 0.55, state: { smoke: true }, animate: true },
      { kind: 'torbogen', pos: [0, Y0, -8.7], width: 6.4, height: 5.2, yaw: Math.PI / 2 },
      { kind: 'bude', pos: [-7.4, Y0, -5.2], width: 3.2, color: 'rot', yaw: 0, solid: true, seed: 2 },
      { kind: 'bude', pos: [7.4, Y0, -2.6], width: 3.2, color: 'gelb', yaw: Math.PI, solid: true, seed: 5 },
      { kind: 'gluehbirnen', from: [-8.4, Y0 + 4.6, 2.6], to: [8.4, Y0 + 4.6, 2.6], sag: 1.0 },
      { kind: 'wimpel', from: [-8.4, Y0 + 4.2, -7.6], to: [8.4, Y0 + 4.2, -7.6], sag: 0.8 },
      { kind: 'mast', pos: [-8.4, Y0, 2.6], height: 4.8 }, { kind: 'mast', pos: [8.4, Y0, 2.6], height: 4.8 },
      { kind: 'mast', pos: [-8.4, Y0, -7.6], height: 4.4 }, { kind: 'mast', pos: [8.4, Y0, -7.6], height: 4.4 },
      { kind: 'ballons', pos: [5.6, Y0, -7.2], n: 5, color: 'lila' },
    ] },
    sign(4.4, Y0, 4.2, 'Zum Turm!\nSeilbahn ↑', { yaw: -0.25, size: [2.4, 1.1] }),

    // ================================================================ B Dächer
    dach(-5, 5, -34.8, -48, 8, { color: 0xd0684a }),
    dach(5, 11, -36, -46.5, 10.6, { color: 0x5a6ab8, side: 0x3a3a6a, h: 4 }),
    dach(7.6, 10.4, -38.6, -41.4, 13.2, { color: 0xe8423a, side: 0x7a2a2a, h: 4 }),
    dach(-4.5, 4.5, -51, -64, 8, { color: 0x4aa88a, side: 0x2a5a5a }),
    dach(-5, 5, -68, -80, 6.6, { color: 0x9a5aaa, side: 0x4a2a5a }),
    dach(-4.5, 4.5, -83.5, -95, 8.6, { color: 0xd0684a }),
    dach(-5, 5, -99.5, -110, 8, { color: 0x5a6ab8, side: 0x3a3a6a }),
    { type: 'bridge', from: [0, 8, -109.8], to: [0, 8, -110.8], width: 2.4 },
    { type: 'lavabrocken_regen', id: 'regen', area: [-3.8, -52, 3.8, -108], period: 1.5, count: 1, flight: 2.2, warn: 1.3, radius: 1.1, aim: 3, from: [-60, 38, -148], seed: 8, start: { box: [-12, 4, -112, 12, 18, -49] } },
    { type: 'deco_w8', items: [
      { kind: 'ballons', pos: [-3.4, 8, -44.6], n: 3, color: 'rot' },
      { kind: 'mast', pos: [-4.4, 8, -36], height: 3.6 }, { kind: 'mast', pos: [4.4, 8, -36], height: 3.6 },
      { kind: 'gluehbirnen', from: [-4.4, 11.2, -36], to: [4.4, 11.2, -36], sag: 0.6 },
      { kind: 'ballons', pos: [3.6, 8.6, -85.2], n: 3, color: 'gelb' },
      { kind: 'wimpel', from: [-4.6, 11, -100.2], to: [4.6, 11, -100.2], sag: 0.7 },
      { kind: 'mast', pos: [-4.6, 8, -100.2], height: 3.4 }, { kind: 'mast', pos: [4.6, 8, -100.2], height: 3.4 },
    ] },
    sign(-3.6, 8, -36.4, 'Vorsicht:\nLavabrocken!', { yaw: 0.25, size: [2.4, 1.1] }),

    // ================================================================ C Riesenrad
    dach(-13, 13, -110.6, -134.2, PZ, { top: 'stone', h: 8 }),
    dach(-13, 13, -134.4, -141.6, 4, { top: 'stone', h: 1 }),
    dach(-5, 5, -138.9, -146.3, ST, { top: 'stone', h: 30 }),
    { type: 'ramp', pos: [11.4, 4, -137.4], size: [2.6, 4, 6.0], axis: 'z', dir: 1, top: 'stone' },
    { type: 'riesenrad', id: 'rad', pos: [RAD.x, RAD.y, RAD.z], radius: RAD.r, gondolas: 8, speed: 0.16, angle: -Math.PI / 2, ground: 4 },
    { type: 'deco_w8', items: [
      { kind: 'bude', pos: [-10.6, PZ, -119.5], width: 3.4, color: 'blau', yaw: 0, solid: true, seed: 3 },
      { kind: 'bude', pos: [10.6, PZ, -117], width: 3.4, color: 'gruen', yaw: Math.PI, solid: true, seed: 7 },
      { kind: 'bude', pos: [10.6, PZ, -124.4], width: 3.2, color: 'rot', yaw: Math.PI, solid: true, seed: 9 },
      { kind: 'karussell', pos: [-8.2, PZ, -128], radius: 2.8, height: 3.6, speed: 0.7 },
      { kind: 'ballons', pos: [7.6, PZ, -130.6], n: 6, color: 'rot' }, { kind: 'ballons', pos: [-11.4, PZ, -113.2], n: 4, color: 'gelb' },
      { kind: 'lampions', from: [-12.4, PZ + 4.6, -112.6], to: [12.4, PZ + 4.6, -112.6], sag: 1.0 },
      { kind: 'mast', pos: [-12.4, PZ, -112.6], height: 4.8 }, { kind: 'mast', pos: [12.4, PZ, -112.6], height: 4.8 },
      { kind: 'gluehbirnen', from: [-12.6, PZ + 4.2, -133.2], to: [-4.2, PZ + 4.2, -133.2], sag: 0.8 },
      { kind: 'gluehbirnen', from: [4.2, PZ + 4.2, -133.2], to: [12.6, PZ + 4.2, -133.2], sag: 0.8 },
      { kind: 'mast', pos: [-12.6, PZ, -133.2], height: 4.4 }, { kind: 'mast', pos: [-4.2, PZ, -133.2], height: 4.4 },
      { kind: 'mast', pos: [4.2, PZ, -133.2], height: 4.4 }, { kind: 'mast', pos: [12.6, PZ, -133.2], height: 4.4 },
      { kind: 'picknick', pos: [-6, 4, -138.6], size: 2.2 },
    ] },
    sign(-3.2, PZ, -131.2, 'Einsteigen!\nGondel nach oben', { yaw: 0.2, size: [2.6, 1.1] }),
    { type: 'seilbahn', id: 'seilbahn2', from: [0, ST + 2.2, -147.6], to: [0, T0 + 2.2, -167.0], speed: 3, trigger: 'stand', mode: 'pingpong', masts: false },

    // ================================================================ E Turm unten (Kletterfront, Simse, POW)
    dach(-13, 13, -168.4, -197, T0, { top: 'stone', h: 2 }),
    SIMS(-3.2, T0 + STEP), SIMS(3.2, T0 + 2 * STEP), SIMS(-3.2, T0 + 3 * STEP), SIMS(3.2, T0 + 4 * STEP), SIMS(-3.2, T0 + 5 * STEP), SIMS(3.2, T0 + 6 * STEP),
    { type: 'torches', h: 2.4, items: [[-9, T0, -173], [9, T0, -173]] },
    { type: 'pennants', items: [{ pos: [-11.6, T0, -184], color: 0xe8322a, h: 6 }, { pos: [11.6, T0, -184], color: 0x8a5ae0, h: 6 }] },
    { type: 'deco_w8', items: [
      { kind: 'bude', pos: [-10.6, T0, -176.5], width: 3.0, color: 'lila', yaw: 0, solid: true, seed: 4 },
      { kind: 'ballons', pos: [10.4, T0, -178.6], n: 5, color: 'blau' },
      { kind: 'gluehbirnen', from: [-12, T0 + 4.4, -169.6], to: [12, T0 + 4.4, -169.6], sag: 1.1 },
      { kind: 'mast', pos: [-12, T0, -169.6], height: 4.6 }, { kind: 'mast', pos: [12, T0, -169.6], height: 4.6 },
    ] },
    // Kanonen-Glasröhre 1 (im Kanonenhaus hinter der Sperre) → Türmchen A
    { type: 'glasspipe', id: 'kanone1', path: [[2.95, TT + 1, -194.4], [2.95, TT + 1, -197.0], [2.95, TT + 2.6, -198.6], [2.95, TT + 6, -199.0], [2.95, UA - 1.6, -199.0]], radius: 1, speed: 12, oneWay: true, cannon: { target: [0.6, UA, -203.4], arc: 2.6 }, coins: 3 },

    // ================================================================ F Oberer Turm (Türmchen, Brücken aus Wegstücken)
    { type: 'glasspipe', id: 'kanone2', path: [[0, UC + 1, -230.4], [0, UC + 1, -232.6], [0, UC + 2.6, -234.0], [0, UC + 6, -234.4], [0, G - 4, -234.4]], radius: 1, speed: 12, oneWay: true, cannon: { target: [0, G, ZG + 9.2], arc: 3 }, coins: 4 },

    // ================================================================ G Gipfel
    { type: 'super_pow_block', id: 'superpow', pos: [0, G + 2.6, ZG - 1], size: 4.5, hits: 4 },
    { type: 'deco_w8', items: [{ kind: 'baron_turm', part: 'spitze', pos: [0, G, ZG], yaw: -Math.PI / 2 }] },
    // Glasröhre zum Siegerturm (erscheint nach dem Sieg; Archetyp boss → reveal)
    { type: 'glasnetz', id: 'glasroehre', hidden: true, radius: 1, speed: 11, exitSpeed: 6,
      nodes: { S: [0, G + 1, ZG - 9.6], Z: [0, ZIEL.y + 1, -280.4] },
      pipes: [{ from: 'S', to: 'Z', oneWay: true, via: [[0, G + 1.2, -261.6], [4.6, G + 0.4, -265], [6.2, G - 1, -269.5], [3, G - 2.2, -273], [-2.6, G - 2.8, -273.6], [-4.8, G - 3.4, -276.2], [-3.4, G - 4.2, -277.2], [-0.8, ZIEL.y + 1.2, -278.2]] }],
      ends: { Z: { enter: false } } },

    // ================================================================ H Siegerturm
    { type: 'deco_w8', items: [
      { kind: 'picknick', pos: [5.2, ZIEL.y, -291.6], size: 2.6 },
      { kind: 'mast', pos: [-7.4, ZIEL.y, -284], height: 4.6 }, { kind: 'mast', pos: [7.4, ZIEL.y, -284], height: 4.6 },
      { kind: 'mast', pos: [-7.4, ZIEL.y, -294], height: 4.6 }, { kind: 'mast', pos: [7.4, ZIEL.y, -294], height: 4.6 },
      { kind: 'lampions', from: [-7.4, ZIEL.y + 4.4, -284], to: [7.4, ZIEL.y + 4.4, -284], sag: 0.9 },
      { kind: 'lampions', from: [-7.4, ZIEL.y + 4.4, -294], to: [7.4, ZIEL.y + 4.4, -294], sag: 0.9 },
      { kind: 'ballons', pos: [6.6, ZIEL.y, -296.2], n: 6, color: 'gelb' }, { kind: 'ballons', pos: [-7.2, ZIEL.y, -289], n: 4, color: 'rot' },
    ] },

  ],
  blocks: [
    { kind: 'question', pos: [3.2, Y0 + 2.2, 1.6], content: 'krallenAnzug' },
    { kind: 'question', pos: [0.2, Y0 + 2.2, 1.6], content: 'coin' },
    { kind: 'hidden', pos: [-4.3, Y0 + 3.6, -2.2], content: 'oneup' },
    { kind: 'question', pos: [-2.4, 10.2, -40.6], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [0, 10.4, -70.5], count: 6 },
    { kind: 'hidden', pos: [-3.4, 13.0, -93.6], content: 'oneup' },
    { kind: 'question', pos: [-3, PZ + 2.2, -122], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [3, PZ + 2.2, -122], count: 8 },
    { kind: 'question', pos: [-4, T0 + 2.2, -174.6], content: 'krallenAnzug' },
    { kind: 'coinblock', pos: [4, T0 + 2.2, -174.6], count: 6 },
  ],
  enemies: [
    // Dächer: Krallen-Pilzlinge, Feuer-Werfer, Stachelfallen
    { kind: 'krallen_pilzling', id: 'kp1', pos: [-1.6, 8, -61.2], sight: 5.5 },
    { kind: 'krallen_pilzling', id: 'kp2', pos: [-1.4, 8.6, -91.6], sight: 5.5 },
    { kind: 'krallen_pilzling', id: 'kp3', pos: [2.2, 8, -103.4], sight: 5.5 },
    { kind: 'stachelfalle', id: 'falle1', pos: [-1.3, 8, -55.4], size: [2.4, 2.2], period: 3.2, up: 1.2, warn: 0.8, phase: 0 },
    { kind: 'stachelfalle', id: 'falle2', pos: [1.3, 8, -58.8], size: [2.4, 2.2], period: 3.2, up: 1.2, warn: 0.8, phase: 0.5 },
    { kind: 'stachelfalle', id: 'falle3', pos: [1.6, 8.6, -87.6], size: [2.2, 2.2], period: 3.0, up: 1.2, warn: 0.8, phase: 0.25 },
    { kind: 'feuer_werfer', id: 'fw1', pos: [1.6, 6.6, -76.2], axis: [1, 0], pace: 1.4, sight: 12, interval: 2.6, first: 1.6, jumpEvery: 3.8 },
    { kind: 'feuer_werfer', id: 'fw2', pos: [-1.6, 8, -106.6], axis: [1, 0], pace: 1.4, sight: 12, interval: 2.8, first: 2.2, jumpEvery: 4.2 },
    // Riesenrad: vier Schubser auf den Gondeln 0, 2, 4, 6 (alle hinunterstoßen → Stern 1)
    SCHUB('rs1', 0, { onGroup: { star: 1 } }), SCHUB('rs2', 2), SCHUB('rs3', 4), SCHUB('rs4', 6),
    // Baron Brummbär im Krallen-Anzug
    {
      kind: 'baron_krallen', id: 'baron', pos: [0, T0, FACE - 0.2], hp: 4,
      sections: [
        {
          type: 'turm', id: 'unten',
          trigger: { min: [-12, T0 - 0.5, -186], max: [12, T0 + 6, -176] },
          route: [[0, T0, FACE - 0.2, 0, -1], [0, TT, FACE - 0.2, 0, -1], [0, TT, -191.6]],
          lead: 3.5, climb: 2.2, every: 2.4, fire: { shots: 1, speed: 6.5, arc: true, flight: 1.0 }, slide: 4,
          walls: ['wand1', 'wand2', 'wand3', 'wand4', 'wand5'], swipeR: 2.8, warn: 1.2,
          pow: 'pow_turm', guard: [1.9, TT, -191.4], block: { min: [1.3, TT, -193.8], max: [4.6, TT + 4.6, -193.2] },
          throwTo: [14, TT + 12, -206],
        },
        {
          type: 'spiegel', id: 'oben',
          trigger: { min: [-4.2, UA - 0.5, -209.5], max: [4.2, UA + 4, -201.4] },
          route: [[0, UA, -202.4], [0, UA, -208], [0, UA + 1, -211.4], [0, UB, -214.4], [0, UB, -219.6], [0, UB + 1, -222.8], [0, UC, -226], [0, UC, -231]],
          follow: 'weg', ahead: 6.5, walk: 4.2, every: 3.0, fire: { shots: 1, speed: 6, arc: true, flight: 1.0 },
          fruits: [[0, UA + 0.9, -206.6], [0, UB + 0.9, -217.4]], clones: [2, 3],
          lanes: [[[-0.8, UB, -214.4], [-0.8, UA, -203]], [[0.8, UC, -226.4], [0.8, UB, -214.8]]],
          breaks: ['steg1', 'steg2', 'steg3', 'steg4'], end: { min: [-4.2, UC - 0.5, -232.9], max: [4.2, UC + 4, -228.0] },
        },
        {
          type: 'gipfel', id: 'gipfel',
          trigger: { min: [-11, G - 0.5, ZG - 11], max: [11, G + 9, ZG + 6.6] },
          center: [0, G, ZG], size: [24, 24], pow: 'superpow',
          every: [2.8, 2.4, 2.1, 1.8], fire: [1, 2, 3, 3], shock: [0, 1, 1, 2], shockR: 11, clones: [0, 0, 2, 3],
          flyTo: [30, G + 20, ZG - 40],
        },
      ],
    },
  ],
  items: [
    // Turm unten: Wandstücke unter den Simsen (Krallenhieb des Barons), POW-Block auf der Terrasse
    WAND('wand1', 2.4, T0 + 3.7), WAND('wand2', -2.4, T0 + 6.5), WAND('wand3', 2.4, T0 + 9.3), WAND('wand4', -2.4, T0 + 12.1), WAND('wand5', 2.4, T0 + 14.9),
    { kind: 'pow', id: 'pow_turm', pos: [-2.6, TT, -190.4], uses: 3, radius: 9, height: 4, hidden: true },
    // Oberer Turm: Brücken aus je zwei Wegstücken
    STEG('steg1', -0.8, UA + 0.4, -211.35, 4.4), STEG('steg2', 0.8, UA + 0.4, -211.35, 4.4),
    STEG('steg3', -0.8, UB + 0.4, -222.75, 4.6), STEG('steg4', 0.8, UB + 0.4, -222.75, 4.6),
    // Gipfel: Sternenring (erscheint mit dem Gipfelkampf)
    { kind: 'starring', id: 'sternring', pos: [-6.4, G, ZG + 7.6], star: 2, hidden: true, time: 16, coins: { pos: [0, G + 0.6, ZG - 1], r: 8.6, n: 8 } },
    // Münzen (Bitcoin-Pfade)
    line([0, Y0 + 0.6, 3.6], [0, Y0 + 0.6, -6], 5),
    line([0, Y0 + 3.4, -15], [0, 8.6, -30], 6),
    line([0, 8.6, -37.5], [0, 8.6, -45.5], 4),
    ...arc([0, 8.6, -47.6], [0, 8.6, -51.6], 4, 1.6),
    column(9, -40, 11.2, 12.4, 2),
    line([0, 8.6, -53.5], [0, 8.6, -60.5], 4),
    ...arc([0, 8.6, -63.8], [0, 7.2, -68.4], 5, 1.8),
    ...arc([0, 7.2, -79.8], [0, 9.2, -84], 4, 1.4),
    column(-3.4, -93.6, 11.2, 11.8, 2),
    ...arc([0, 9.2, -95], [0, 8.6, -99.8], 5, 2.0),
    ring([0, PZ + 0.6, -125], 2.4, 8),
    column(0, RAD.z - 1.5, 12, 32, 6),
    line([0, ST + 0.6, -140.5], [0, ST + 0.6, -145.4], 3),
    line([0, T0 + 3.4, -150], [0, T0 + 3.4, -164], 5),
    line([0, T0 + 0.6, -170.5], [0, T0 + 0.6, -175], 3),
    ...[1, 2, 3, 4, 5, 6].map((k) => ({ kind: 'coin', pos: [(k % 2 ? -3.4 : 3.4), T0 + k * STEP + 0.7, FACE + 2.1] })),
    line([-2, UA + 0.6, -206.8], [2, UA + 0.6, -206.8], 3),
    ring([0, UB + 0.6, -217], 2.2, 6),
    ring([0, UC + 0.6, -228.7], 2.2, 6),
    ring([0, ZIEL.y + 0.6, -287.4], 2.0, 8),
  ],
  checkpoint: [
    { pos: [0, PZ, -115.6], yaw: Math.PI / 2 },
    { pos: [0, T0, -171.2], yaw: Math.PI / 2 },
    { pos: [-2.4, UA, -204.8], yaw: Math.PI / 2 },
    { pos: [0, G, ZG + 10.6], yaw: Math.PI / 2 },
  ],
  stars: [
    [9, 14.1, -40],                                    // 0: oben auf dem Uhrturm des ersten Hauses (rechts nach Seilbahn 1)
    { pos: [0, PZ + 1.2, -129.4], hidden: true },      // 1: alle vier Schubser vom Riesenrad gestoßen
    { pos: [6.2, G + 0.3, ZG + 7.6], hidden: true },   // 2: Sternenring in der ersten Finalphase
  ],
  stamp: [-4.6, ZIEL.y + 7.4, -291.3],
  goal: { pos: [0, ZIEL.y, -295.6], height: 8 },
  marks: {
    start: [0, Y0, 5.5], seilbahn1: [0, Y0, -9.6], dach1: [0, 8, -37], uhrturm: [9, 13.2, -40], dach2: [0, 8, -53], dach3: [0, 6.6, -70],
    dach4: [0, 8.6, -86], dach5: [0, 8, -102], platz: [0, PZ, -118], rad: [0, PZ, -133.4], grube: [0, 4, -137.5], station: [0, ST, -142],
    turmplatz: [0, T0, -172], sims1: [-2.4, T0 + STEP, -185.6], terrasse: [0, TT, -189.4], pow: [-2.6, TT, -190.4], kanonenhaus: [2.95, TT, -194],
    tuermchenA: [0, UA, -204], tuermchenB: [0, UB, -217], tuermchenC: [0, UC, -228.7], gipfel: [0, G, ZG + 9.2], superpow: [0, G, ZG - 1],
    sieger: [0, ZIEL.y, -284], glockenbaum: [-4.6, ZIEL.y, -292.5], ziel: [0, ZIEL.y, -295.6],
  },
};
