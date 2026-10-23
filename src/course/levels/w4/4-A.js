// 4-A „Glutbrocken-Gerangel“ (Archetyp arena, Bauplan 4-A: ca. 25 m Felsinsel in Lava; erst 1 Lavabrocken, nach dessen
// Sieg 3 weitere → Stern). Thema lava, Musik course_arena, 200 s.
//
// Aufbau: eine runde, wellig gerandete Basaltinsel (≈ 24 m Durchmesser) mitten im Lavasee, durchzogen von glühenden
// Rissen, die im Takt der Glut pulsieren; am Rand und im See Gruppen sechseckiger Basaltsäulen, dahinter eine zackige
// Kraterwand mit zwei herabstürzenden Lavafällen, rauchende Vulkane am Horizont, Lavablasen, aufsteigende Glutfunken und
// Dampfschwaden aus den Spalten.
// Ablauf: Ein Lavabrocken watschelt heran, holt aus und stürmt. Konter (Präzisierung Gegner Welt 4): draufspringen →
// betäubt; aufheben (Aktion bzw. Rennen + Berühren) und werfen – in die Lava (zerschmilzt) oder gegen einen anderen
// Brocken (beide zerplatzen); betäubt + Stampfattacke zerbricht ihn ebenfalls. Ist der erste besiegt, springen drei
// weitere aus der Lava auf die Insel (Ansage). Sind alle vier besiegt, steigt der Stern in der Mitte auf; Einsammeln
// beendet das Level. Tod setzt Arena und Wellen zurück.
// Extras: ?-Block mit Krallen-Anzug (Tatzenhieb betäubt Brocken), Münzblock, zwei Münzkreise.

import {
  levelSetup, rockIsland, islandRadius, lavaLake, calderaWall, volcanoes, lavaBubbles, embers, basaltColumns, glowCracks,
  lavaWaves, steamVents, banner, shadowDiet,
} from './_helpers_c.js';

const Y = 2;           // Oberseite der Insel
const LAVA = -0.5;     // Lavaspiegel

const ISLAND = { center: [0, 0], top: Y, R: 11.6, depth: 5, lavaY: LAVA, wobble: [0.07, 0.045, 0.04], phase: [1.1, 0.3, 2.2] };
const rim = (a, d = 0) => { const r = islandRadius(ISLAND, a) + d; return [Math.cos(a) * r, Math.sin(a) * r]; };

/** Brocken der zweiten Welle: Startpunkt (Heimat) und Absprung in der Lava (radial außen). */
const WAVE2 = { lb2: [-6, Y, -3.5], lb3: [6, Y, -3.5], lb4: [0, Y, -7.5] };

function setup(level) {
  rockIsland(level, ISLAND);
  lavaLake(level, { center: [0, -6], size: 120, y: LAVA });
  // Basaltsäulen: Gruppen knapp außerhalb der Insel (Würfe in die Lava bleiben frei) und weiter draußen im See
  const cols = [];
  for (const [a, n] of [[-2.35, 5], [-0.75, 4], [2.75, 3], [0.5, 3]]) {
    for (let i = 0; i < n; i++) {
      const [x, z] = rim(a + (i - n / 2) * 0.08, 1.4 + (i % 2) * 0.9);
      cols.push([x, LAVA, z, 1.4 + ((i * 7) % 5) * 0.55, 0.55 + (i % 3) * 0.12]);
    }
  }
  for (const [x, z, h] of [[-17, -14, 5], [-15.6, -15.2, 3.6], [18, -12, 6], [16.8, -13.5, 4.2], [-22, 4, 3], [21, 6, 3.6]]) cols.push([x, LAVA, z, h, 0.8]);
  basaltColumns(level, cols, { lavaY: LAVA });
  const cracks = glowCracks(level, { center: [0, 0], top: Y, R: ISLAND.R, n: 10 });
  calderaWall(level, { center: [0, -4], r0: 29, r1: 40, n: 26, h: [8, 19], y: LAVA, gap: [1.05, 2.1] });
  volcanoes(level, [[-58, LAVA, -96, 26, 38], [52, LAVA, -108, 28, 44], [-14, LAVA, -150, 22, 30], [86, LAVA, -60, 16, 22]]);
  lavaBubbles(level, { center: [0, 0], r0: 13, r1: 26, n: 16, y: LAVA });
  embers(level, { center: [0, LAVA, 0], r0: 12.5, r1: 27, n: 100, h: 16 });
  steamVents(level, [[-4.6, Y, 3.2], [5.2, Y, -5.4], [-1.4, Y, -8.6], [7.6, Y, 4.4]], { per: 5, size: 2.2 });
  lavaWaves(level, [['lb1'], ['lb2', 'lb3', 'lb4']], {
    pause: 1.4,
    flight: 1.05,
    lavaY: LAVA,
    from: (id, home) => { const a = Math.atan2(home.z, home.x); const [x, z] = rim(a, 2.6); return [x, LAVA, z]; },
    banner: (lv) => banner(lv, 'Drei Lavabrocken springen aus der Lava!', { hold: 1.8, color: '#ffb46a' }),
  });
  // Budget: Brocken werfen den Sonnenschatten nur mit dem Körper (Blob bleibt)
  shadowDiet(level, ['lavabrocken'], 1);
  // Glutrisse glühen heller, solange ein Brocken stürmt
  level.view?.onFrame(() => {
    const charging = level.entities.some((e) => e.kind === 'lavabrocken' && e.alive && e.state === 'charge');
    if (cracks) cracks.opacity = Math.min(1, cracks.opacity + (charging ? 0.15 : 0));
  });
}

export const LEVEL = {
  id: '4-A',
  world: 4,
  title: 'Glutbrocken-Gerangel',
  archetype: 'arena',
  theme: 'lava',
  music: 'course_arena',
  timeLimit: 200,
  starSlots: 1,
  killY: -8,
  setup: levelSetup(setup),
  start: { pos: [0, Y, 7.6], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 47, dist: 21.5, x: 0, xLock: 0.35, ahead: 1, lead: 0.5 }],
  arena: { enemies: 'all', star: [0, Y + 0.6, -0.5], starIndex: 0, intro: 'Wirf die Lavabrocken in die Lava!', center: [0, Y, -1], camPull: 0.3 },
  segments: [
    // Lavafälle aus der Kraterwand (nur Kulisse, nicht tödlich) – Vorderseite zur Insel (+Z)
    { type: 'deco_w4', items: [
      { kind: 'lavafall', pos: [-17, LAVA, -30], width: 4, height: 15, yaw: -Math.PI / 2 + 0.5 },
      { kind: 'lavafall', pos: [19, LAVA, -28], width: 3.4, height: 13, yaw: -Math.PI / 2 - 0.55 },
      { kind: 'lavasteine', pos: [-6.5, Y, -6.8], size: [2.4, 1.8], n: 4 },
      { kind: 'lavasteine', pos: [7.6, Y, 1.6], size: [1.8, 2.4], n: 3 },
      { kind: 'lavasteine', pos: [-8.4, Y, 4.6], size: [1.6, 1.6], n: 3 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.4, Y + 2.3, 4.4], content: 'krallen' },
    { kind: 'coinblock', pos: [3.4, Y + 2.3, 4.4], count: 6 },
  ],
  enemies: [
    { kind: 'lavabrocken', id: 'lb1', pos: [0, Y, -4], behavior: 'chase', sight: 14, wake: 40 },
    { kind: 'lavabrocken', id: 'lb2', pos: WAVE2.lb2, behavior: 'chase', sight: 14, wake: 40 },
    { kind: 'lavabrocken', id: 'lb3', pos: WAVE2.lb3, behavior: 'chase', sight: 14, wake: 40 },
    { kind: 'lavabrocken', id: 'lb4', pos: WAVE2.lb4, behavior: 'chase', sight: 14, wake: 40 },
  ],
  items: [
    { kind: 'coins', pos: [-6.4, Y + 0.4, 1.8], r: 1.4, n: 6 },
    { kind: 'coins', pos: [6.4, Y + 0.4, 1.8], r: 1.4, n: 6 },
    { kind: 'coins', from: [-2, Y + 0.4, -9.2], to: [2, Y + 0.4, -9.2], n: 3 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 7.6], lb1: [0, Y, -4], ...WAVE2 },
};
