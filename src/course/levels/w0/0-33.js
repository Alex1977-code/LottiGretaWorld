// Rummel-Bossarenen (0-33): Testlevel für die Endgegner der Welt 8 „Brummbär-Rummelplatz“ (tests/course_w8_enemies.mjs) mit
// Archetyp 'boss' und vier Kämpfen nacheinander (LEVEL.bosses, Präzisierung Gegner Welt 6):
//   A (z ≈ 0)      Zirkus-Rundkäfig r 12 (wie 6-C) – **goldene Würfelblase** (8-A): goldene Riesen, Landungen mit Schockwellen.
//   B (z ≈ −60)    Manege r 11,5 (wie 3-B) – **rosa Schlangenkönig** (8-B): Lavabrocken hinterlassen Lavapfützen.
//   C (z ≈ −110)   Rundkäfig r 9 (wie 3-Zug) – **Schattenläuferin 2** (8-Zug): mehr Doppelgänger, schneller.
//   D (z ≈ −170 …) **Baron Brummbär im Krallen-Anzug** (8-Burg) in drei Abschnitten:
//                  Turm unten (Platz, Turmkern 8 × 7 m, 15 m hoch, Steinsimse links/rechts, Kletterrinne in der Mitte, drei
//                  Wandstücke 'wand1…3'; oben POW-Block 'pow_turm', Wachplatz, Sperre vor der Warp-Box „Kanone“),
//                  Oberer Turm (z ≈ −215, 20 m höher: drei Plattformen, Brücken aus je zwei Wegstücken 'steg1…4', zwei
//                  Spiegelfrüchte, Sturm-Bahnen der Doppelgänger), Gipfel (z ≈ −270, 30 m hoch, 25 × 25 m, Super-POW-Block
//                  'superpow' schwebt 2,6 m über dem Boden, Glas der Freunde obenauf). Sieg → Glasröhre (Warp-Box) → Zielplateau.
// Checkpoints an jedem Arenastart und an jedem Turm-Abschnitt (B, C, D nur per Warp-Box). Thema 'fortress', Musik course_finale.

const Y = 2;
const RA = 12, ZB = -60, RB = 11.5, ZC = -110, RC = 9;
const ZD = -170;                       // Turm unten: Platzmitte
const ZU = -215, U = Y + 20;           // Oberer Turm: Startplattform, Höhe
const ZG = -270, G = Y + 30;           // Gipfel
const ZE = -312;                       // Zielplateau
const FACE = ZD - 3, RECESS = ZD - 4;  // Turmfront, Kletterrinne

export const MARKS = { ZB, ZC, ZD, ZU, U, ZG, G, ZE, FACE, RECESS };

const ledge = (x, top, z0 = ZD - 2.4, z1 = ZD + 0.2, w = 3.4) => ({ type: 'platform', pos: [x, top - 0.6, (z0 + z1) / 2], size: [w, 0.6, z1 - z0], style: 'stone' });

export const LEVEL = {
  id: '0-33',
  world: 0,
  title: 'Rummel-Bossarenen',
  archetype: 'boss',
  theme: 'fortress',
  music: 'course_finale',
  timeLimit: 999,
  start: { pos: [0, Y, 9.5], yaw: Math.PI / 2 },
  checkpoint: [
    { pos: [0, Y, 9.5], yaw: Math.PI / 2 }, { pos: [0, Y, ZB + 9.6], yaw: Math.PI / 2 }, { pos: [0, Y, ZC + 7], yaw: Math.PI / 2 },
    { pos: [0, Y, ZD + 10], yaw: Math.PI / 2 }, { pos: [0, U, ZU + 2.2], yaw: Math.PI / 2 }, { pos: [0, G, ZG + 10.8], yaw: Math.PI / 2 },
  ],
  camera: [
    { from: 26, to: -16, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -34, to: -84, pitch: 46, dist: 18, x: 0, xLock: 0.35, ahead: 0.5, lead: 0.4, height: 1.6 },
    { from: -88, to: -128, pitch: 48, dist: 16, x: 0, xLock: 0.3, ahead: 1.2, lead: 0.5 },
    { from: -150, to: -190, pitch: 30, dist: 17, x: 0, xLock: 0.4, ahead: 0.2, lead: 0.3, height: 2.6 },
    { from: -205, to: -245, pitch: 38, dist: 15, x: 0, xLock: 0.4, ahead: 1.2, lead: 0.4, height: 2 },
    { from: -255, to: -290, pitch: 30, dist: 20, x: 0, xLock: 0.3, ahead: 0.5, lead: 0.3, height: 6.5 },
    { from: -300, to: -330, pitch: 42, dist: 12.5, ahead: 2 },
  ],
  bosses: [
    {
      id: 'blase8', name: 'Goldene Würfelblase', speed: 0,
      trigger: { min: [-RA, Y - 0.5, -RA], max: [RA, Y + 10, 7] },
      warp: 'warp_a', warpPos: [0, Y, 0], warpTo: [0, Y + 0.3, ZB + 9.6], frame: 0.4, center: [0, Y, 0], musicAfter: 'course_bossblob',
    },
    {
      id: 'koenig8', name: 'Rosa Schlangenkönig', speed: 0,
      trigger: { min: [-RB, Y - 0.5, ZB - RB], max: [RB, Y + 8, ZB + 8.4] },
      warp: 'warp_b', warpPos: [0, Y, ZB - 8.5], warpTo: [0, Y + 0.3, ZC + 7], frame: 0.25, center: [0, Y, ZB], musicAfter: 'course_boss',
    },
    {
      id: 'schatten8', name: 'Schattenläuferin', speed: 0,
      trigger: { min: [-RC, Y - 0.5, ZC - RC], max: [RC, Y + 6, ZC + 5.8] },
      warp: 'warp_c', warpPos: [0, Y, ZC], warpTo: [0, Y + 0.3, ZD + 10], frame: 0.3, center: [0, Y, ZC], musicAfter: 'course_baronexpress',
    },
    {
      id: 'baron', name: 'Baron Brummbär', speed: 0,
      trigger: { min: [-10, Y - 0.5, ZD - 2], max: [10, Y + 6, ZD + 6] },
      warp: 'glasroehre', warpPos: [0, G, ZG + 7], warpTo: [0, Y + 0.3, ZE + 4], frame: 0.2, center: [0, Y, ZD],
      warpBanner: 'Ab in die Glasröhre!', musicAfter: 'course_finale',
    },
  ],
  segments: [
    // ---- A: Zirkus-Rundkäfig (goldene Würfelblase)
    { type: 'arena_cage', pos: [0, Y, 0], radius: RA, height: 5, floor: Y + 2, ceiling: 9.5, gate: Math.PI, low: 0.85, color: 0xffcf2a },
    { type: 'crowd', id: 'crowd_a', stands: [{ from: [-RA - 3, Y - 1, -6], to: [-RA - 3, Y - 1, 6], rows: 3, face: [1, 0] }, { from: [RA + 3, Y - 1, -6], to: [RA + 3, Y - 1, 6], rows: 3, face: [-1, 0] }] },
    { type: 'pennants', items: [{ pos: [-RA - 1, Y, -RA], color: 0xffcf2a, h: 7 }, { pos: [RA + 1, Y, -RA], color: 0xff5ab0, h: 7 }, { pos: [0, Y, -RA - 1.5], color: 0xe8322a, h: 8 }] },
    // ---- B: Manege des rosa Schlangenkönigs
    { type: 'island', pos: [0, -1, ZB - 2], size: [36, 1, 34], top: 'stone', under: 0 },
    { type: 'arena_cage', pos: [0, Y, ZB], radius: RB, height: 5, floor: Y + 1, ceiling: 0, gate: Math.PI, low: 0.9, color: 0xff5ab0 },
    { type: 'pennants', items: [{ pos: [-13.5, 0, ZB + 8], color: 0xff5ab0, h: 7 }, { pos: [13.5, 0, ZB + 8], color: 0xffcf2a, h: 7 }] },
    // ---- C: Rundkäfig der Schattenläuferin
    { type: 'island', pos: [0, -1, ZC - 2], size: [28, 1, 28], top: 'stone', under: 0 },
    { type: 'arena_cage', pos: [0, Y, ZC], radius: RC, height: 5, floor: Y + 1, ceiling: 6.4, gate: Math.PI, low: 0.85, color: 0xc04cff },
    { type: 'torches', h: 2.6, items: [[-11.5, 0, ZC + 6], [11.5, 0, ZC + 6]] },
    // ---- D: Turm unten – Platz, Turmkern mit Kletterrinne, Simse
    { type: 'island', pos: [0, -1, ZD], size: [26, Y + 1, 26], top: 'stone', under: 2 },
    { type: 'island', pos: [-2.6, Y, ZD - 6.5], size: [2.8, 15, 7], top: 'stone', under: 0 },
    { type: 'island', pos: [2.6, Y, ZD - 6.5], size: [2.8, 15, 7], top: 'stone', under: 0 },
    { type: 'island', pos: [0, Y, ZD - 7], size: [2.4, 15, 6], top: 'stone', under: 0 },
    ledge(-2.2, Y + 3), ledge(2.2, Y + 6), ledge(-2.2, Y + 9), ledge(2.2, Y + 12),
    { type: 'torches', h: 2.4, items: [[-8, Y, ZD + 6], [8, Y, ZD + 6]] },
    { type: 'pennants', items: [{ pos: [-4.2, Y + 15, ZD - 10], color: 0xe8322a, h: 4 }, { pos: [4.2, Y + 15, ZD - 10], color: 0x8a5ae0, h: 4 }] },
    // ---- U: Oberer Turm – drei Plattformen, Brücken aus Wegstücken (Entitäten 'steg1…4')
    { type: 'island', pos: [0, U - 2, ZU], size: [8, 2, 6], top: 'stone', under: 0 },
    { type: 'island', pos: [0, U, ZU - 11], size: [8, 2, 6], top: 'stone', under: 0 },
    { type: 'island', pos: [0, U + 2, ZU - 22], size: [8, 2, 8], top: 'stone', under: 0 },
    { type: 'torches', h: 2, items: [[-3.4, U + 4, ZU - 25], [3.4, U + 4, ZU - 25]] },
    // ---- G: Gipfel 25 × 25 m
    { type: 'island', pos: [0, G - 3, ZG], size: [25, 3, 25], top: 'stone', under: 0 },
    // Super-POW-Block (Motor-Baustein): der Baron findet Lage und Kante über die Kollision (pow: 'superpow')
    { type: 'super_pow_block', id: 'superpow', pos: [0, G + 2.6, ZG - 1], size: 4.5, hits: 4 },
    { type: 'pennants', items: [{ pos: [-11.5, G, ZG - 11.5], color: 0xe8322a, h: 6 }, { pos: [11.5, G, ZG - 11.5], color: 0xffcf2a, h: 6 }, { pos: [-11.5, G, ZG + 11.5], color: 0x8a5ae0, h: 6 }, { pos: [11.5, G, ZG + 11.5], color: 0xff5ab0, h: 6 }] },
    // ---- Zielplateau
    { type: 'island', pos: [0, -1, ZE], size: [16, Y + 1, 18], top: 'stone' },
    { type: 'killplane', y: -16 },
  ],
  enemies: [
    { kind: 'wuerfelblase', id: 'blase8', color: 'gold', pos: [0, Y, -3], arena: { center: [0, Y, 0], r: RA - 0.6 }, star: { pos: [0, Y + 0.4, 6.5], index: 0 } },
    { kind: 'schlangenkoenig', id: 'koenig8', color: 'rosa', pos: [0, Y, ZB], arena: { center: [0, Y, ZB], r: RB - 0.5 }, plate: 2.8, star: { pos: [0, Y + 0.4, ZB + 6.5], index: 1 } },
    { kind: 'schattenlaeuferin', id: 'schatten8', round: 2, pos: [0, Y, ZC - 3.5], arena: { center: [0, Y, ZC], r: RC - 0.4 }, ring: 5 },
    {
      kind: 'baron_krallen', id: 'baron', pos: [0, Y, RECESS + 0.8], hp: 4,
      sections: [
        {
          type: 'turm', id: 'unten',
          trigger: { min: [-10, Y - 0.5, ZD - 2], max: [10, Y + 6, ZD + 6] },
          route: [[0, Y, RECESS + 0.8, 0, -1], [0, Y + 15, RECESS + 0.8, 0, -1], [0, Y + 15, ZD - 6]],
          lead: 3.5, climb: 2.2, every: 2.4, fire: { shots: 1, speed: 6.5, arc: true, flight: 1.0 }, slide: 4,
          walls: ['wand1', 'wand2', 'wand3'], swipeR: 2.8, warn: 1.2,
          pow: 'pow_turm', guard: [1.6, Y + 15, ZD - 6.5], block: { min: [0.9, Y + 15, ZD - 10], max: [4.2, Y + 18.5, ZD - 7.2] },
          throwTo: [9, Y + 26, ZD - 16],
        },
        {
          type: 'spiegel', id: 'oben',
          trigger: { min: [-4, U - 0.5, ZU - 3], max: [4, U + 4, ZU + 1] },
          route: [[0, U, ZU - 1], [0, U + 1, ZU - 5], [0, U + 2, ZU - 9.5], [0, U + 2, ZU - 12.5], [0, U + 3, ZU - 15], [0, U + 4, ZU - 19], [0, U + 4, ZU - 23]],
          follow: 'weg', ahead: 6.5, every: 3.0, fire: { shots: 1, speed: 6, arc: true, flight: 1.0 },
          fruits: [[0, U + 2.9, ZU - 11], [0, U + 4.9, ZU - 20.5]], clones: [2, 3],
          lanes: [[[-0.8, U + 2, ZU - 12.5], [-0.8, U, ZU - 0.5]], [[0.8, U + 4, ZU - 20], [0.8, U + 2, ZU - 9.5]]],
          breaks: ['steg1', 'steg2', 'steg3', 'steg4'], end: { min: [-4, U + 3.5, ZU - 26], max: [4, U + 8, ZU - 21.5] },
        },
        {
          type: 'gipfel', id: 'gipfel',
          trigger: { min: [-12, G - 0.5, ZG - 12], max: [12, G + 9, ZG + 9] },
          center: [0, G, ZG], size: [25, 25], pow: 'superpow',
          every: [2.8, 2.4, 2.1, 1.8], fire: [1, 2, 3, 3], shock: [0, 1, 1, 2], shockR: 11, clones: [0, 0, 2, 3],
          flyTo: [28, G + 18, ZG - 36],
        },
      ],
    },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_a', pos: [0, Y, 0], target: [0, Y + 0.3, ZB + 9.6], hidden: true },
    { kind: 'warpbox', id: 'warp_b', pos: [0, Y, ZB - 8.5], target: [0, Y + 0.3, ZC + 7], hidden: true },
    { kind: 'warpbox', id: 'warp_c', pos: [0, Y, ZC], target: [0, Y + 0.3, ZD + 10], hidden: true },
    // Turm unten: Wandstücke (Krallenhieb des Barons), POW-Block, Warp-Box „Kanone“ hinter der Sperre
    { kind: 'bruchstueck', id: 'wand1', pos: [-1.9, Y + 5, FACE + 0.4], size: [1.6, 0.9, 0.8], look: 'stein' },
    { kind: 'bruchstueck', id: 'wand2', pos: [1.9, Y + 8.4, FACE + 0.4], size: [1.6, 0.9, 0.8], look: 'stein' },
    { kind: 'bruchstueck', id: 'wand3', pos: [-1.9, Y + 11.4, FACE + 0.4], size: [1.6, 0.9, 0.8], look: 'stein' },
    { kind: 'coins', pos: [-1.9, Y + 6.3, FACE + 0.4], r: 0.6, n: 3 },
    { kind: 'pow', id: 'pow_turm', pos: [-2.4, Y + 15, ZD - 5.2], uses: 3, radius: 9, height: 4 },
    { kind: 'warpbox', id: 'kanone', pos: [2.6, Y + 15, ZD - 8.6], target: [0, U + 0.3, ZU + 2.2] },
    // Oberer Turm: Brücken aus Wegstücken
    { kind: 'bruchstueck', id: 'steg1', pos: [-0.8, U + 0.4, ZU - 5], size: [1.5, 0.6, 4], look: 'holz' },
    { kind: 'bruchstueck', id: 'steg2', pos: [0.8, U + 0.4, ZU - 5], size: [1.5, 0.6, 4], look: 'holz' },
    { kind: 'bruchstueck', id: 'steg3', pos: [-0.8, U + 2.4, ZU - 16], size: [1.5, 0.6, 4], look: 'holz' },
    { kind: 'bruchstueck', id: 'steg4', pos: [0.8, U + 2.4, ZU - 16], size: [1.5, 0.6, 4], look: 'holz' },
    { kind: 'warpbox', id: 'zum_gipfel', pos: [0, U + 4, ZU - 24.6], target: [0, G + 0.3, ZG + 10.8] },
    // Gipfel: Glasröhre zum Ziel (erscheint nach dem Sieg; Rückfall Warp-Box)
    { kind: 'warpbox', id: 'glasroehre', pos: [0, G, ZG + 7], target: [0, Y + 0.3, ZE + 4], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, ZE + 1], r: 2.2, n: 8 },
  ],
  goal: [0, Y, ZE - 4],
  marks: {
    a: [0, Y, 0], b: [0, Y, ZB], c: [0, Y, ZC], startB: [0, Y, ZB + 9.6], startC: [0, Y, ZC + 7], startD: [0, Y, ZD + 10],
    turmTop: [0, Y + 15, ZD - 5], pow: [-2.4, Y + 15, ZD - 5.2], startU: [0, U, ZU + 2.2], endU: [0, U + 4, ZU - 23], startG: [0, G, ZG + 10.8],
    gipfel: [0, G, ZG], superpow: [0, G + 2.6, ZG - 1], plateau: [0, Y, ZE + 4],
  },
};
