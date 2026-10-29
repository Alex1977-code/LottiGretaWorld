// P-4 „Schattenspuk-Gerangel“ – Remix von 2-3 „Scherenschnittkeller“ (Bauplan Welt Pilz, Detail P-4: nur der Schatten-Abschnitt,
// 100 s; dicht mit Gegnern, Kanonen-Helme, Pilzlingsturm aus 30 Pilzlingen; erst wenn alle Gegner besiegt sind, erscheint
// rechts die Ziel-Warp-Box; Bauplan-Tabelle: „mehr und schwerere Schatten-Rätsel“). Basis als Daten (remixOf, levels/w2/2-3.js
// bleibt unverändert). Musik der Basis (course_shadow) mit Klang-Variante 'schnell', Thema der Basis, kein Stempel.
//
// Ablauf: Seitenbühne (Gang, Kanonen-Helm) → Schattenbühne (Leinwand 70 × 9 m, frontal wie aus dem Zuschauerraum gespielt):
//   Holzbohlen, unsichtbare Schattenwege über den Lücken, zwei Wuschel auf senkrechten Bahnen (unbesiegbar, zählen nicht), elf
//   Gegner in der Bühnenmitte und der **große Turm** – ein Pilzlingsturm aus 30 Pilzlingen (18,8 m, ragt bis in den
//   Schnürboden). Er versperrt die Bohlen zwischen den beiden Lücken; ein Kanonen-Helm-Treffer wirft ihn ganz um (Panzer, Feuer
//   usw. nehmen je nur eine Stufe). Der Kampfraum zählt die elf Gegner (Liste GEGNER); sind alle besiegt, erscheint rechts auf
//   dem Podest die Ziel-Warp-Box → Applaus-Bühne mit dem Zielmast. Kanonen-Helme: im Gang, links auf der Bühne und hinter der
//   Falltür (liegen nach dem Aufheben wieder da).
// Sterne (Index): 0 über der Tür – Schattenstern in einer unsichtbaren Loge (nur ihr Schatten verrät sie: links ein schmaler
//   Schlitz, zu eng für die Figur). Nur die Wurfsichel aus dem ?-Block vor dem Podest fliegt hindurch – vom unsichtbaren Sims
//   links der Loge geworfen (vorher den Kanonen-Helm absetzen: Ducken + Aktion, sonst feuert die Aktion die Kanone). 1 links vom
//   großen Turm (Schattenstern auf einer unsichtbaren Stufe über dem linken Ende der Turm-Bohlen; erst den Turm umwerfen), 2 auf
//   dem Sims rechts vom Turm (von der ersten Schattenplatte über der Riesenschnappblume hinüberspringen). Stern 0 und 1 macht
//   der Aufbau-Haken der Basis zu Schattensternen (shadowStars: unsichtbar, nur ihr Schatten).
// Weggefallen: Foyer, Fahrplattformen, Checkpoint, Kulissen, Rätselbox, Stempel, Feuer-Schnappblume, Extraleben-Block.

import { remixOf } from '../../level/remix.js';
import { curtain, valance, footlights, carpet, deco, decoW1 } from '../w2/_helpers_b.js';
import { isl, line, arc } from './_helpers_pa.js';

const YC = 2.5, ZS = -87.5;             // Bühne, Mitte der Bühnentiefe (Leinwand bei z −90)
const GX = 88;                          // Applaus-Bühne (Ziel), rechts hinter der Kulisse
const LOGE = { x0: 62.0, x1: 64.8, y0: 9.9, floor: 10.2, slit: [10.53, 10.97], roof: 11.7, t: 0.3 };
const SIMS_TOP = 9.85;                  // Sims links der Loge: Wurfhöhe der Sichel (Mitte ≈ Füße + 0,9) = Schlitz-Mitte

/** Unsichtbarer Quader (nur Schatten) über die ganze Bühnentiefe: x0..x1, y0..y1. */
const sq = (x0, x1, y0, y1) => ({ pos: [(x0 + x1) / 2, y0, ZS], size: [x1 - x0, y1 - y0, 5] });
// Gegner des Kampfraums (alle besiegbaren Gegner der Bühne)
const GEGNER = ['g_p1', 'g_k1', 'g_s1', 'grosser_turm', 'g_pk', 'g_p3', 'riese', 'g_p4', 'g_p5', 'g_s2', 'g_k2'];
const kanone = (id, x, z = ZS) => ({ kind: 'helm_kanone', id, pos: [x, YC, z], respawn: 6 });
const pilz = (id, x0, x1, x = (x0 + x1) / 2) => ({ kind: 'pilzling', id, pos: [x, YC, ZS], path: [[x0, YC, ZS], [x1, YC, ZS]] });
const rock = (x0, x1, zA, zB, y0, y1, color = 0x5a3c30) => ({
  kind: 'rockwall', pos: [(x0 + x1) / 2, y0, (zA + zB) / 2], size: [x1 - x0, y1 - y0, Math.abs(zA - zB)], color,
});

export const LEVEL = remixOf('2-3', {
  id: 'P-4',
  world: 10,
  title: 'Schattenspuk-Gerangel',
  music: { variant: 'schnell' },
  timeLimit: 100,
  stamp: false,
  checkpoint: null,
  // nur Seitenbühne, Schattenbühne und Unterbühne (Foyer, Fahrplattformen, Checkpoint, Kulissen und Rätselbox entfallen)
  keep: { box: [-12, -12, -73, 72, 30, -97], margin: 0.5 },
  remove: [
    { kind: 'hidden', box: [60, 10, -88, 62, 11, -87] },          // Extraleben-Block über dem Podest (dort ist jetzt der Sims)
    { kind: 'crate' },                                            // Stempel-Kisten unter der Bühne
    { kind: 'wuschel', box: [22, 0, -88, 23, 4, -87] },           // Wuschel auf den Bohlen 22 … 29 (dort steht der Turm)
    { kind: 'feuer_schnappblume' },                               // Feuer-Schnappblume auf der Konsole
    { kind: 'wuschel', where: (e) => Array.isArray(e.center) },   // Kreis-Wuschel der weggeschnittenen Abschnitte
  ],
  change: [
    // Wuschel über den Schattenwegen benennen (unbesiegbar, zählen nicht)
    { match: { kind: 'wuschel', box: [14, 0, -88, 14.2, 3, -87] }, set: { id: 'wu_a' } },
    { match: { kind: 'wuschel', box: [56.8, 0, -88, 57, 3, -87] }, set: { id: 'wu_b' } },
    // Schnappblume der Basis vor dem Podest: benannt für den Kampfraum
    { match: { kind: 'schnappblume', box: [49, 0, -88, 50, 4, -87] }, set: { id: 'g_s2' } },
    // der Schatten-Baum der Leinwand stand genau über der Tür (dort hängt jetzt die Loge): an den Sichel-Block versetzt
    { match: { id: 'sw_buehne' }, fn: (e) => { e.casters = e.casters.map((q) => (q.pos[0] === 65 ? { ...q, pos: [48.2, q.pos[1], q.pos[2]] } : q)); } },
    // die Tür führte hinter die Kulissen (weggeschnitten): bleibt zu, ist nur noch Kulisse (Stern 0 schwebt darüber)
    { match: { id: 'tuer_a' }, set: { locked: true, target: null } },
  ],
  start: { pos: [0, YC, -74.4], yaw: Math.PI / 2 },
  camera: [
    // Gang (die Schiene endet früh genug, dass sie auf der Bühne nicht mehr mitblendet – keine Kante bei x 12)
    { from: -71, to: -79.5, pitch: 44, dist: 12.5, fov: 40, area: [-12, 72] },
    // Schattenbühne frontal wie aus dem Zuschauerraum: flacher und weiter weg als in der Basis – so verdeckt der Lambrequin
    // (Unterkante 12,2 m) die Loge über der Tür nicht, und der große Turm ragt sichtbar hoch hinauf
    { from: -83, to: -92, pitch: 6, dist: 19, height: 1.8, ahead: 0, fov: 42, area: [-12, 72] },
    { from: -80, to: -96, pitch: 16, dist: 14, height: 2.2, ahead: 0, fov: 40, x: GX, xLock: 0.6, area: [74, 104] },
  ],
  stars: [
    [63.4, 10.75, ZS],                      // 0: über der Tür in der unsichtbaren Loge (Schattenstern, nur mit der Wurfsichel)
    [23.1, 7.3, ZS],                        // 1: links vom großen Turm (Schattenstern auf einer unsichtbaren Stufe)
    [30.4, 9.0, ZS],                        // 2: Sims rechts vom Turm
  ],
  goal: { pos: [GX + 3, YC, -88], height: 9 },
  add: {
    segments: [
      // Schatten-Rätsel 1: Stufe links vom Turm (Stern 1)
      { type: 'schattenweg', id: 'sw_turmstufe', hint: 0.3, parts: [sq(22.2, 24.0, 6.2, 6.6)] },
      // Schatten-Rätsel 2: Loge über der Tür (Boden, Dach, rechte Wand, linke Wand mit Schlitz) und Sims links davon
      { type: 'schattenweg', id: 'sw_loge', hint: 0.2, parts: [
        sq(LOGE.x0, LOGE.x1, LOGE.y0, LOGE.floor),
        sq(LOGE.x0, LOGE.x1, LOGE.roof, LOGE.roof + LOGE.t),
        sq(LOGE.x1 - LOGE.t, LOGE.x1, LOGE.floor, LOGE.roof),
        sq(LOGE.x0, LOGE.x0 + LOGE.t, LOGE.floor, LOGE.slit[0]),
        sq(LOGE.x0, LOGE.x0 + LOGE.t, LOGE.slit[1], LOGE.roof),
      ] },
      { type: 'schattenweg', id: 'sw_sims', hint: 0.3, parts: [sq(60.3, 61.7, SIMS_TOP - 0.4, SIMS_TOP)] },
      // Sims rechts vom Turm (Stern 2), über der Falltür
      { type: 'platform', style: 'wood', pos: [30.4, 7.7, ZS], size: [2.2, 0.5, 2.6] },
      { type: 'sign', pos: [-1.3, YC, -81.6], text: 'Alle besiegen –\ndann öffnet sich\ndas Ziel!', size: [1.9, 0.9] },
      // Rückwand des Gangs (Checkpoint und Foyer sind weggeschnitten)
      decoW1([rock(-2.4, 2.4, -71.2, -72.3, YC - 4, YC + 4.5, 0x6e4a38)]),
      // Applaus-Bühne (Ziel) rechts hinter der Kulisse
      isl(GX - 8, GX + 8, -82, -94, YC, 3, { top: 'stone', under: 1 }),
      { type: 'platform', style: 'wood', pos: [GX, YC - 0.3, -88.4], size: [15, 0.3, 9.6] },
      deco([
        { kind: 'lantern', pos: [GX - 6.6, YC, -92.6] }, { kind: 'lantern', pos: [GX + 6.6, YC, -92.6] },
      ]),
      decoW1([
        rock(GX - 10.5, GX - 8, -80, -96, -2, 11), rock(GX + 8, GX + 10.5, -80, -96, -2, 11),
        rock(GX - 8, GX + 8, -94, -96.5, -2, 11),
        { kind: 'fireflies', pos: [GX, YC + 2, -88], size: [14, 4, 10], n: 10, colors: [0xffd27a, 0xfff2a0] },
        { kind: 'bunting', from: [GX - 7.4, 8.6, -85], to: [GX + 7.4, 8.6, -85], sag: 0.8, colors: [0xd8202a, 0xffc83a, 0xfff2d6] },
      ]),
    ],
    blocks: [
      // Wurfsichel vor dem Podest (für Stern 0)
      { kind: 'question', pos: [50.6, YC + 1.9, ZS], content: 'sichel' },
    ],
    enemies: [
      // der große Turm: Pilzlingsturm aus 30 Pilzlingen auf den Bohlen 22 … 29 (läuft langsam hin und her)
      { kind: 'pilzlingsturm', id: 'grosser_turm', pos: [25.8, YC, ZS], count: 30, behavior: 'walk', speed: 0.45, dir: [1, 0],
        topple: ['bomb', 'mega', 'star', 'bump', 'cannon'] },
      // dicht mit Gegnern (alle in der Bühnenmitte – die Kanonenkugeln fliegen die Bühne entlang)
      pilz('g_p1', 1.6, 6.6, 4.2),
      { kind: 'krallen_pilzling', id: 'g_k1', pos: [8.2, YC, ZS], dir: [-1, 0] },
      { kind: 'schnappblume', id: 'g_s1', pos: [9.4, YC, ZS] },
      { kind: 'panzerkroete', id: 'g_pk', pos: [28.2, YC, ZS], dir: [-1, 0] },
      pilz('g_p3', 32.6, 37, 35.6),
      pilz('g_p4', 42, 46.4, 44.4),
      pilz('g_p5', 42.4, 46.4, 42.6),
      { kind: 'krallen_pilzling', id: 'g_k2', pos: [52.8, YC, ZS], dir: [-1, 0] },
    ],
    items: [
      kanone('kanone1', 0, -78.6), kanone('kanone2', -2.4), kanone('kanone3', 32.6, -86.2),
      // Kampfraum: alle Gegner der Bühne → Ziel-Warp-Box rechts auf dem Podest
      // (Wuschel sind unbesiegbar und zählen nicht – daher die Liste)
      { kind: 'kampfraum', id: 'buehne', area: { min: [-6, -4, -91], max: [67, 30, -83.6] }, ids: GEGNER, onClear: { reveal: 'warp_ziel' },
        banner: 'Alle besiegt – Vorhang auf!' },
      { kind: 'warpbox', id: 'warp_ziel', hidden: true, pos: [65.2, 7, ZS], target: [GX - 6, YC + 0.1, -88] },
      line([GX - 4, YC + 0.6, -88], [GX + 1, YC + 0.6, -88], 5),
      ...arc([60.6, 7.6, ZS], [61.2, SIMS_TOP + 0.7, ZS], 3, 0.8),
    ],
  },
  build(level) {
    // Applaus-Bühne: Vorhänge, Lambrequin, Rampenlichter, roter Läufer
    curtain(level, { pos: [GX - 7.2, YC, -92.8], w: 1.8, h: 8, tie: 0.45, side: 'left' });
    curtain(level, { pos: [GX + 7.2, YC, -92.8], w: 1.8, h: 8, tie: 0.45, side: 'right' });
    valance(level, { pos: [GX, YC + 8.2, -92.6], w: 16, h: 1 });
    footlights(level, GX - 7, GX + 7, YC, -82.3);
    carpet(level, GX - 6.5, GX + 4.5, -87.2, -88.8, YC);
  },
  setup(level) {
    // Sparmaßnahme: der 30er-Turm wirft keinen Sonnenschatten (≈ 66 k Dreiecke im Schattenpass) – seinen Schatten zeigt die
    // Leinwand, am Boden bleibt der Schattenfleck
    level.named.get('grosser_turm')?.model?.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  },
  marks: {
    start: [0, YC, -74.4], gang: [0, YC, -80], buehne: [0.6, YC, ZS], turm: [25.8, YC, ZS], turmstufe: [23.1, 6.6, ZS],
    sims: [30.4, 8.2, ZS], riese: [39.6, YC, ZS], block: [50.6, YC, ZS], podest: [60, 7, ZS], logensims: [61, SIMS_TOP, ZS],
    tuer: [63.4, 7, -88.2], warp: [65.2, 7, ZS], ziel: [GX - 6, YC, -88],
  },
});
