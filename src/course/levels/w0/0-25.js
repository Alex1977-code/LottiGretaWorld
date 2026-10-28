// Wolken-Bossarenen (0-25): Testlevel für die Endgegner der Welt 6 (tests/course_w6_enemies.mjs) mit Archetyp 'boss' und drei
// Kämpfen nacheinander (LEVEL.bosses, Präzisierung Gegner Welt 6):
//   A (z ≈ 0)     Festungskäfig 20 × 20 m (Innenfläche x/z −10 … 10, Boden y = 2) mit 2 × 3 Glasröhren an den Seitenwänden
//                 (Glasröhren-Netz 'roehren' der Welt-6-Bausteine: Öffnungen L-6/L0/L6 und R-6/R0/R6, je eine Röhre verbindet
//                 links und rechts auf gleicher Höhe und läuft hinter dem Käfig herum; für die Figur gesperrt) –
//                 **Schubser-Prinz** (6-A, net: 'roehren'). Die Figur startet vor dem Käfig
//                 (z 14) und geht durch das Tor (Sperre im Kampf). Sieg → Stern, Warp-Box in der Mitte → Arena B.
//   B (z ≈ −60)   Zirkus-Rundkäfig r 12 mit Tribünen – **Würfelblase** (6-C) mit Gelee-Brocken. Sieg → Stern, Warp-Box → C.
//   C (z ≈ −110)  Rundkäfig r 10,6 – **Wirbelbrocken mit Attrappen** (6-Panzer). Sieg → Stern, Warp-Box → Zielplateau (z −150).
// Checkpoints an jedem Arenastart (B und C erreicht man nur per Warp-Box). Thema 'fortress', Musik course_boss.

const Y = 2;
const W = 10;                   // halbe Innenweite des Prinzen-Käfigs
const ZB = -60, RB = 12;        // Würfelblasen-Arena
const ZC = -110, RC = 10.6;     // Wirbelbrocken-Arena
const PZ = [-6, 0, 6];          // Röhren-Mündungen (z) an beiden Seitenwänden

/** Glasröhren-Netz: linke Öffnung (z) hinter dem Käfig herum zur rechten (gleiches z); m = Schachtelung (innen 0). */
const NODES = {}, PIPES = [], ENDS = {};
PZ.forEach((z, m) => {
  const o = W + 1.3 + 2.3 * m, back = -(W + 1.3 + 2.3 * m), y = Y + 1;
  NODES[`L${z}`] = [-W + 0.05, y, z]; NODES[`R${z}`] = [W - 0.05, y, z];
  ENDS[`L${z}`] = { enter: false }; ENDS[`R${z}`] = { enter: false };
  PIPES.push({ from: `L${z}`, to: `R${z}`, via: [[-o, y, z], [-o, y, back], [o, y, back], [o, y, z]] });
});   // z −6 innen, 0 Mitte, 6 außen (schneiden sich nicht)

export const LEVEL = {
  id: '0-25',
  world: 0,
  title: 'Wolken-Bossarenen',
  archetype: 'boss',
  theme: 'fortress',
  music: 'course_boss',
  timeLimit: 999,
  start: { pos: [0, Y, 14], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 14], yaw: Math.PI / 2 }, { pos: [0, Y, ZB + 9.5], yaw: Math.PI / 2 }, { pos: [0, Y, ZC + 8.5], yaw: Math.PI / 2 }],
  camera: [
    { from: 24, to: -26, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -34, to: -84, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -88, to: -130, pitch: 48, dist: 18, x: 0, xLock: 0.3, ahead: 0.8, lead: 0.4, height: 1.6 },
    { from: -134, to: -170, pitch: 42, dist: 12.5, ahead: 2 },
  ],
  bosses: [
    {
      id: 'prinz', name: 'Schubser-Prinz', speed: 0,
      trigger: { min: [-W + 0.5, Y - 0.5, -W + 0.5], max: [W - 0.5, Y + 8, W - 1.5] },
      lock: { min: [-2.4, Y - 0.5, W], max: [2.4, Y + 6, W + 0.7] },
      warp: 'warp_a', warpPos: [0, Y, 0], warpTo: [0, Y + 0.3, ZB + 9.5], frame: 0.45, center: [0, Y, 0], musicAfter: 'course_boss',
    },
    {
      id: 'blase', name: 'Würfelblase', speed: 0,
      trigger: { min: [-RB, Y - 0.5, ZB - RB], max: [RB, Y + 10, ZB + 7] },
      warp: 'warp_b', warpPos: [0, Y, ZB], warpTo: [0, Y + 0.3, ZC + 8.5], frame: 0.4, center: [0, Y, ZB], musicAfter: 'course_boss',
    },
    {
      id: 'wirbel6', name: 'Wirbelbrocken', speed: 0,
      trigger: { min: [-RC, Y - 0.5, ZC - RC], max: [RC, Y + 6, ZC + 7] },
      warp: 'warp_c', warpPos: [0, Y, ZC], warpTo: [0, Y + 0.3, -144], frame: 0.35, center: [0, Y, ZC], musicAfter: 'course_grass',
    },
  ],
  segments: [
    // ---- A: Festungsplattform mit Käfig und Glasröhren
    { type: 'island', pos: [0, -1, -2], size: [44, Y + 1, 44], top: 'stone', under: 3 },
    { type: 'wall', pos: [-W - 0.3, Y, 0], size: [0.6, 3.2, 2 * W + 1.2], style: 0xd9c9e8 },
    { type: 'wall', pos: [W + 0.3, Y, 0], size: [0.6, 3.2, 2 * W + 1.2], style: 0xd9c9e8 },
    { type: 'wall', pos: [0, Y, -W - 0.3], size: [2 * W + 1.2, 3.2, 0.6], style: 0xd9c9e8 },
    { type: 'wall', pos: [-(W + 2.4) / 2 - 0.3, Y, W + 0.3], size: [W - 1.8, 1.0, 0.6], style: 0xd9c9e8, camIgnore: true },
    { type: 'wall', pos: [(W + 2.4) / 2 + 0.3, Y, W + 0.3], size: [W - 1.8, 1.0, 0.6], style: 0xd9c9e8, camIgnore: true },
    { type: 'glasnetz', id: 'roehren', radius: 1, nodes: NODES, pipes: PIPES, ends: ENDS },
    { type: 'torches', h: 2.2, items: [[-W - 1.6, Y, W + 1.6], [W + 1.6, Y, W + 1.6]] },
    { type: 'pennants', items: [{ pos: [-W - 1, Y + 4.2, -W - 1], color: 0x8a5ae0, h: 4 }, { pos: [W + 1, Y + 4.2, -W - 1], color: 0xe8322a, h: 4 }] },
    // ---- B: Zirkus-Rundkäfig
    { type: 'arena_cage', pos: [0, Y, ZB], radius: RB, height: 5, floor: Y + 2, ceiling: 9.5, gate: Math.PI, low: 0.85, color: 0xff5ab0 },
    { type: 'crowd', id: 'crowd_b', stands: [{ from: [-RB - 3, Y - 1, ZB - 6], to: [-RB - 3, Y - 1, ZB + 6], rows: 3, face: [1, 0] }, { from: [RB + 3, Y - 1, ZB - 6], to: [RB + 3, Y - 1, ZB + 6], rows: 3, face: [-1, 0] }] },
    { type: 'pennants', items: [{ pos: [-RB - 1, Y, ZB - RB], color: 0xffcf2a, h: 7 }, { pos: [RB + 1, Y, ZB - RB], color: 0x2ab4ff, h: 7 }, { pos: [0, Y, ZB - RB - 1.5], color: 0xe8322a, h: 8 }] },
    // ---- C: Rundkäfig
    { type: 'arena_cage', pos: [0, Y, ZC], radius: RC, height: 5, floor: Y + 2, ceiling: 6.4, gate: Math.PI, low: 0.85 },
    { type: 'torches', h: 2.6, items: [[-RC - 2.5, 0, ZC + 6], [RC + 2.5, 0, ZC + 6]] },
    // ---- Zielplateau
    { type: 'island', pos: [0, -1, -150], size: [16, Y + 1, 18], top: 'stone' },
    { type: 'killplane', y: -14 },
  ],
  enemies: [
    {
      kind: 'schubser_prinz', id: 'prinz', pos: [0, Y, -5], dir: [0, 1], arena: { min: [-W, -W], max: [W, W], y: Y },
      net: 'roehren',
      star: { pos: [0, Y + 0.4, 6.5], index: 0 },
    },
    {
      kind: 'wuerfelblase', id: 'blase', pos: [0, Y, ZB - 3], arena: { center: [0, Y, ZB], r: RB - 0.6 },
      star: { pos: [0, Y + 0.4, ZB + 6.5], index: 1 },
    },
    { kind: 'wirbelbrocken', id: 'wirbel6', pos: [0, Y, ZC - 3], arena: { center: [0, Y, ZC], r: RC - 0.4 }, decoys: true },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_a', pos: [0, Y, 0], target: [0, Y + 0.3, ZB + 9.5], hidden: true },
    { kind: 'warpbox', id: 'warp_b', pos: [0, Y, ZB], target: [0, Y + 0.3, ZC + 8.5], hidden: true },
    { kind: 'warpbox', id: 'warp_c', pos: [0, Y, ZC], target: [0, Y + 0.3, -144], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -148], r: 2.2, n: 8 },
  ],
  goal: [0, Y, -154],
  marks: { a: [0, Y, 0], b: [0, Y, ZB], c: [0, Y, ZC], startB: [0, Y, ZB + 9.5], startC: [0, Y, ZC + 8.5], plateau: [0, Y, -144] },
  // Prinzen-Käfig: unsichtbare Kollision über der niedrigen Vorderwand und eine Decke (kein Entkommen über die Wände)
  build(level) {
    const W2 = W + 0.6;
    level.world.add({ type: 'box', min: [-W2, Y + 1, W], max: [-2.4, Y + 6, W2], camIgnore: true, tag: 'kaefig-vorn' });
    level.world.add({ type: 'box', min: [2.4, Y + 1, W], max: [W2, Y + 6, W2], camIgnore: true, tag: 'kaefig-vorn' });
    level.world.add({ type: 'box', min: [-W2, Y + 3.2, -W2], max: [-W, Y + 6, W2], camIgnore: true, tag: 'kaefig-wand' });
    level.world.add({ type: 'box', min: [W, Y + 3.2, -W2], max: [W2, Y + 6, W2], camIgnore: true, tag: 'kaefig-wand' });
    level.world.add({ type: 'box', min: [-W2, Y + 3.2, -W2], max: [W2, Y + 6, -W], camIgnore: true, tag: 'kaefig-wand' });
    level.world.add({ type: 'box', min: [-W2, Y + 6, -W2], max: [W2, Y + 6.4, W2], camIgnore: true, tag: 'kaefig-decke' });
  },
};
