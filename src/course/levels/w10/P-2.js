// P-2 „Stachelranken im Abendrot“ – Remix von 1-3 „Kraxelei am Klötzchenberg“ (Bauplan Welt Pilz, Detail P-2: Sonnenuntergang;
// Stachelkugler und Walzenwerfer neu; Gipfelbrücke ersetzt durch 3 Glockenbäume (Krallen-Anzug); Ziel-Warp-Box öffnet mit
// 5 Schlüsselmünzen; hinter Stern 1 verbergen Ziegel in der Wand eine Röhre zum P-Schalter-Raum; 500 s; Bauplan-Tabelle:
// „Stacheln an Kletterwänden und Ranken“). Basis als Daten (remixOf, levels/w1/1-3.js bleibt unverändert). Musik der Basis
// (course_grass) mit Klang-Variante 'abend', Thema grass@abend, kein Stempel.
//
// Ablauf wie in der Basis bis zur dritten Ranke (Startplatz, Schnappblumenfeld, POW-Hang, Ranke an der Felswand, Wolkenpfad,
// Doppelhügel, Riesenblock-Treppe); an den Ranken fahren **Stachelringe** im Takt aus. Die dritte Ranke ist länger (bis
// y 36,6). Statt Gipfelbrücke und Riesenschnappblume: Rankenplateau (y 30) → **Glockenhain** mit drei Glockenbäumen
// (Kletterstämme, Kronen y 34,5 / 38,5 / 42,5; darunter ein Wurzelboden y 24 als Netz mit Rückweg-Ranke) → **Glockenplatz**
// (y 42,5) mit der verschlossenen Ziel-Warp-Box → Gipfel (y 50, nur über die Box).
// Schlüsselmünzen (Gruppe 'schluessel', alle 5 → Box springt auf): 1 hinter dem Start, 2 am Fuß der dritten Ranke, 3 über einer
//   Wandnische am Doppelhügel (zwei unsichtbare Blöcke als Stufen), 4 offen auf einer Plattform neben dem Glockenplatz,
//   5 ganz oben über die letzte Ranke (Wolke über dem Glockenplatz).
// Sterne (Index): 0 hinter der Spitze der dritten Ranke, 1 blaue Münzen im P-Schalter-Raum (Röhre hinter den Ziegeln in der
//   Wand der Rankennische, Tatzenhieb oder Stampfen), 2 über der Wolke am Gipfel (Sprung von der Wolke).
// Neue Gegner: Stachelkugler (rollen den POW-Hang hinab, pendeln am Doppelhügel), Walzenwerfer (oben am POW-Hang, am Doppelhügel).

import { remixOf } from '../../level/remix.js';
import { LEVEL as KLOETZCHENBERG } from '../w1/1-3.js';
import { stachelringe, glockenbaeume, isl, line, ring } from './_helpers_pa.js';

const YP = 30;       // Rankenplateau
const YW = 24;       // Wurzelboden unter den Glockenbäumen
const YG = 42.5;     // Glockenplatz
const YS = 50;       // Gipfel (in der Basis y 40, hier 10 m höher: nur über die Ziel-Warp-Box)

/** Schlüsselmünze der Gruppe 'schluessel' (alle 5 → Ziel-Warp-Box auf). */
const key = (id, x, y, z) => ({ kind: 'schluesselmuenze', id, pos: [x, y, z], group: 'schluessel', onAll: { fn: (level) => level.named.get('zielbox')?.unlock?.() } });
/** Deko-Einträge auf Gipfelhöhe (y 40) um 10 m anheben. */
const lift = (it) => {
  const up = (p) => (Array.isArray(p) && Math.abs(p[1] - 40) < 0.01 ? [p[0], YS, p[2]] : p);
  return { ...it, ...(it.pos ? { pos: up(it.pos) } : {}), ...(it.from ? { from: up(it.from) } : {}), ...(it.to ? { to: up(it.to) } : {}) };
};
const liftItems = (e) => ({ ...e, items: e.items.map(lift) });
const hasAt40 = (e) => Array.isArray(e.items) && e.items.some((i) => Array.isArray(i.pos) && Math.abs(i.pos[1] - 40) < 0.01);

// Kameraschienen der Basis bis zur Riesenblock-Treppe, dann Glockenhain und Gipfel (Gipfel höher), abseits wie in der Basis
const CAM = KLOETZCHENBERG.camera;
const camera = [
  ...CAM.slice(0, 6),
  { from: -176, to: -204, pitch: 44, dist: 15.5, yaw: 0, x: -1.5, xLock: 0.25 },
  { from: -204, to: -225, pitch: 40, dist: 14, yaw: 0, x: 0, xLock: 0.5 },
  ...CAM.slice(8),
];

export const LEVEL = remixOf(KLOETZCHENBERG, {
  id: 'P-2',
  world: 10,
  title: 'Stachelranken im Abendrot',
  light: 'abend',
  music: { variant: 'abend' },
  timeLimit: 500,
  stamp: false,
  camera,
  remove: [
    { type: 'bridge', box: [-3, 29, -185, 3, 31, -177] },                    // Gipfelbrücke
    { type: 'island', box: [-1, 17, -194, 1, 19, -193] },                    // Plateau der Riesenschnappblume
    { id: ['gipfelboss', 'zielbox', 'zuPRaum'] },                            // Zwischenboss, alte Warp-Box, Röhre in der POW-Nische
    { kind: 'task' },
    { kind: 'schnappblume', box: [-5, 29, -175, -4, 31, -174] },             // Brückenkopf
    { in: 'deco', kind: 'fence', box: [-6, 29, -177, 6, 31, -175] },
    { in: 'deco', kind: 'rockpile', box: [-8, 29, -201, 8, 31, -186] },
    { in: 'deco', kind: 'mushroom', box: [-11, 16, -149, -10, 18, -147] },   // Platz für die Wandnische
  ],
  change: [
    // dritte Ranke länger (Stern 0 hinter ihrer Spitze)
    { match: { type: 'beanstalk', box: [2, 24, -172, 3, 26, -170] }, set: { height: 11.6 } },
    // Gipfel 10 m höher (nur über die Ziel-Warp-Box), seine Zier mit
    { match: { type: 'island', box: [-1, 23, -212, 1, 25, -210] }, move: [0, 10, 0] },
    { match: { type: ['deco', 'deco_w1b'], where: hasAt40 }, fn: liftItems },
    // ?-Block vor dem Glockenhain: Krallen-Anzug statt Funkenblüte, tiefer (der Anzug bleibt oben liegen)
    { match: { kind: 'question', box: [-0.5, 33, -174.5, 0.5, 34, -173] }, set: { content: 'krallenAnzug', pos: [-4, YP + 2.2, -173.6] } },
    // Rückweg aus dem P-Schalter-Raum aufs Rankenplateau
    { match: { id: 'pRaumZiel' }, set: { pos: [-5, YP, -176.8] } },
  ],
  stars: [
    [2.5, 38.2, -172.1],                                     // 0: hinter der Spitze der dritten Ranke
    { pos: [70, 0.6, -70.5], hidden: true, id: 'stern2' },   // 1: P-Schalter-Raum (blaue Münzen, wie in der Basis)
    [-12, YS + 3.9, -194.6],                                 // 2: über der Wolke am Gipfel
  ],
  goal: { pos: [0, YS, -212], height: 8 },
  add: {
    segments: [
      // Rankenplateau nach hinten verlängert, Nische mit Ziegelwand (dahinter die Röhre zum P-Schalter-Raum)
      isl(-6, 6, -176, -180.6, YP, 5, { xray: true }),
      { type: 'wall', pos: [0.5, YP, -179], size: [1, 2.2, 3.2], style: 'stone' },
      { type: 'wall', pos: [4.5, YP, -179], size: [1, 2.2, 3.2], style: 'stone' },
      { type: 'wall', pos: [2.5, YP, -180.35], size: [3, 2.2, 0.5], style: 'stone' },
      { type: 'platform', style: 'stone', pos: [2.5, YP + 2.2, -179], size: [5, 0.5, 3.4] },
      { type: 'pipe', id: 'zuPRaum2', pos: [2.5, YP, -179.2], height: 0.6, target: 'pRaumEin' },
      { type: 'sign', pos: [-2.2, YP, -172.6], text: 'Glockenbäume:\nKrallen-Anzug!', size: [2.4, 0.9] },
      // Glockenhain: Wurzelboden mit Rückweg-Ranke, Glockenplatz mit Flügel links, Schlüssel-Plattform rechts, letzte Ranke, Wolke
      isl(-9, 9, -181.4, -200.5, YW, 6, { top: 'rock' }),
      { type: 'beanstalk', pos: [-5, YW, -181.05], height: 6.7 },
      isl(-4.5, 4.5, -198.2, -203.6, YG, 4, { top: 'rock' }),
      isl(-13, -4.5, -193.2, -203.6, YG, 4, { top: 'rock' }),
      { type: 'platform', style: 'block', color: 'orange', pos: [7.2, YG - 1.4, -197.4], size: [2.8, 0.6, 2.8] },
      { type: 'beanstalk', pos: [-10.5, YG, -193.6], height: 7.6 },
      { type: 'deco_w1b', kind: 'cloudplat', pos: [-12, YS - 0.6, -194.6], size: [4, 0.6, 4] },
      { type: 'sign', pos: [-3.4, YG, -199.6], text: 'Ziel-Warp-Box:\n5 Schlüssel!', size: [2.4, 0.9] },
      // Wandnische am Doppelhügel (Schlüsselmünze 3 über dem Dach, zwei unsichtbare Blöcke als Stufen)
      { type: 'wall', pos: [-10.4, 17, -148.6], size: [0.8, 3.8, 3.2], style: 'stone', noWallSlide: true },
      { type: 'wall', pos: [-6.6, 17, -148.6], size: [0.8, 3.8, 3.2], style: 'stone', noWallSlide: true },
      { type: 'wall', pos: [-8.5, 17, -149.9], size: [3, 3.8, 0.6], style: 'stone' },
      { type: 'platform', style: 'stone', pos: [-8.5, 20.8, -148.6], size: [4.8, 0.6, 3.6] },
      { type: 'deco_w1b', items: [
        { kind: 'flag', pos: [-12.2, YG, -202.6], size: 2.2, color: 'red' },
        { kind: 'tufts', pos: [0, YW, -190], size: [14, 14], n: 14 },
        { kind: 'mushroom', pos: [7.6, YW, -184], size: 1.2, color: 'red' }, { kind: 'mushroom', pos: [-7.8, YW, -197.6], size: 0.9, color: 'yellow' },
        { kind: 'rockpile', pos: [7.6, YG, -202], size: 1 },
        { kind: 'cloudpuff', pos: [16, 36, -190], size: 3 }, { kind: 'cloudpuff', pos: [-22, 40, -205], size: 3.4 },
      ] },
    ],
    blocks: [
      // unsichtbare Blöcke vor der Wandnische (Stufen hinauf aufs Dach)
      { kind: 'hidden', pos: [-6.2, 19.0, -145.2], content: 'coin' },
      { kind: 'hidden', pos: [-8.5, 21.4, -145.6], content: 'coins:3' },
      // Ziegelwand vor der Röhre in der Rankennische (Tatzenhieb mit dem Krallen-Anzug zerschlägt die untere Reihe)
      ...[1.5, 2.5, 3.5].flatMap((x) => [YP, YP + 1].map((y) => ({ kind: 'brick', pos: [x, y, -177.7] }))),
    ],
    enemies: [
      // Stachelkugler: rollen den POW-Hang hinab, pendeln am Doppelhügel und auf dem Wurzelboden
      { kind: 'stachelkugler', id: 'sk_hang1', pos: [-6, 8.9, -70.4], dir: [0, 1], wake: 40 },
      { kind: 'stachelkugler', id: 'sk_hang2', pos: [1.5, 8.9, -70.6], dir: [0, 1], wake: 40 },
      { kind: 'stachelkugler', id: 'sk_huegel', pos: [3, 17, -147.5], mode: 'pendel', dir: [1, 0], dist: 3.2, speed: 2 },
      { kind: 'stachelkugler', id: 'sk_wurzel', pos: [0, YW, -191], mode: 'pendel', dir: [1, 0], dist: 4.5, speed: 1.8 },
      // Walzenwerfer: oben am POW-Hang (Walzen rollen den Hang hinab), am Doppelhügel
      { kind: 'walzenwerfer', id: 'ww_hang', pos: [-8, 9, -78.5], pillar: 1.2, aim: 'player', sight: 15, interval: 3.2, first: 1.5 },
      { kind: 'walzenwerfer', id: 'ww_huegel', pos: [9.2, 17, -131], pillar: 1, aim: 'player', sight: 12, interval: 3.4, first: 1.2 },
    ],
    items: [
      key('key1', 5.8, 0, 9.4),                  // 1: hinter dem Start
      key('key2', 2.5, 25, -169.6),              // 2: am Fuß der dritten Ranke
      key('key3', -8.5, 21.4, -148.6),           // 3: über der Wandnische (Dach)
      key('key4', 7.2, YG - 0.8, -197.4),          // 4: offen auf der Plattform neben dem Glockenplatz
      key('key5', -12, YS, -194.6),              // 5: ganz oben über die letzte Ranke (Wolke)
      // verschlossene Ziel-Warp-Box (springt auf, sobald alle fünf Schlüssel da sind) → Gipfel
      { kind: 'bossblitz_box', id: 'zielbox', pos: [1.6, YG, -201.4], target: [0, YS + 0.3, -206.2], locked: true },
      ring([-8.5, 17.4, -148.4], 0.6, 3),
      line([0, 24.6, -183], [0, 24.6, -197], 5),
      line([2.6, YG + 0.6, -199], [-2.6, YG + 0.6, -199], 3),
    ],
  },
  build(level) {
    glockenbaeume(level, [
      { id: 'baum1', pos: [-3.5, YW, -184.2], top: YP + 4.5, side: -1 },
      { id: 'baum2', pos: [1.5, YW, -189.2], top: YP + 8.5, side: 1 },
      { id: 'baum3', pos: [-2.5, YW, -194.6], top: YP + 12.5, side: 1 },
    ]);
  },
  setup(level) {
    stachelringe(level, [
      { id: 'ring_start', pos: [-6.5, 4.6, -0.45], period: 3.4, phase: 0.1 },
      { id: 'ring_fels', pos: [-3, 12.4, -80.45], period: 3.2, phase: 0.3 },
      { id: 'ring_r3a', pos: [2.5, 28.4, -171.05], period: 3.2, phase: 0.55 },
      { id: 'ring_r3b', pos: [2.5, 33.0, -171.05], period: 3.2, phase: 0.05 },
      { id: 'ring_letzte', pos: [-10.5, 46.6, -193.6], period: 3.4, phase: 0.7 },
    ]);
  },
  marks: {
    start: [0, 0, 6], key1: [5.8, 0, 9.4], hang: [0, 3, -50], nische: [-8.5, 17, -145], ranke3: [2.5, 25, -169.6], plateau: [0, YP, -173],
    wurzel: [0, YW, -183], glockenplatz: [0, YG, -200], gipfel: [0, YS, -206], proom: [64, 0, -64],
  },
});
