// 2-A „Glutsee-Rempelei“ (Archetyp arena, Bauplan 2-A: Felsinsel im Lavasee, große Rollpilze): eine runde, wellig
// gerandete Felsinsel (≈ 22 m Durchmesser) mitten in einem Lavasee, umringt von einer zackigen Kraterwand; dahinter
// rauchende Vulkane. Drei Großrollpilze in zwei Wellen: erst einer, dann plumpsen zwei vom Himmel. Konter: draufspringen
// wirft ihn auf den Rücken, dann hineinlaufen (oder rutschen, Tatzenhieb) – er schlittert über die Kante in die Lava.
// Dreimal draufspringen geht auch. Sind alle besiegt, steigt der Stern in der Mitte auf; Einsammeln beendet das Level.
// Zeitlimit 200 s. Kulisse: Feuerschalen am Rand, Glutkristalle, aufsteigende Glutfunken, blubbernde Lavablasen.
// Geheimnisse: keine (Bauplan). Ein ?-Block mit Krallen-Anzug (Tatzenhieb stößt Liegende) und zwei Münzkreise.
// Level-Haken (LEVEL.setup, _helpers_c.js): Felsinsel, Lavasee, Kraterwand, Vulkane, Funken, Blasen, Wellen.

import { levelSetup, rockIsland, islandRadius, lavaLake, calderaWall, volcanoes, lavaBubbles, embers, arenaWaves, rockStumps } from './_helpers_c.js';

const Y = 2;          // Oberseite der Insel
const LAVA = -0.5;    // Lavaspiegel

const ISLAND = { center: [0, 0], top: Y, R: 10.6, depth: 5, lavaY: LAVA };
/** Felsstümpfe im Lavasee knapp vor dem Inselrand (Feuerschalen) – auf der Insel würden sie Stöße bremsen. */
const STUMP_A = [-2.2, -0.95, -2.75, -0.4, 2.65, 0.6, 1.15];
const stump = (a, d = 4.4) => { const r = islandRadius(ISLAND, a) + d; return [Math.cos(a) * r, 0.3, Math.sin(a) * r]; };

function setup(level) {
  rockIsland(level, ISLAND);
  rockStumps(level, STUMP_A.map((a) => stump(a)), { lavaY: LAVA });
  lavaLake(level, { center: [0, -6], size: 110, y: LAVA });
  calderaWall(level, { center: [0, -4], r0: 27, r1: 36, n: 24, h: [7, 17], y: LAVA, gap: [1.15, 2.0] });
  volcanoes(level, [[-62, LAVA, -92, 24, 36], [48, LAVA, -112, 30, 46], [-18, LAVA, -150, 22, 30], [80, LAVA, -54, 16, 22], [-88, LAVA, -40, 18, 24]]);
  lavaBubbles(level, { center: [0, 0], r0: 12, r1: 24, n: 14, y: LAVA });
  embers(level, { center: [0, LAVA, 0], r0: 11.5, r1: 26, n: 90, h: 15 });
  arenaWaves(level, [['grp1'], ['grp2', 'grp3']], {
    pause: 1.6,
    banner: (lv) => lv.archetype?.hud?.banner?.('Zwei Großrollpilze fallen vom Himmel!', { hold: 1.6, color: '#ffd28a' }),
  });
}

/** Punkt auf dem Inselrand (Winkel a, 0 = +X, π/2 = +Z zur Kamera), r m von der Mitte. */
const at = (a, r, y = Y) => [Math.cos(a) * r, y, Math.sin(a) * r];

export const LEVEL = {
  id: '2-A',
  world: 2,
  title: 'Glutsee-Rempelei',
  archetype: 'arena',
  theme: 'lava',
  music: 'course_arena',
  timeLimit: 200,
  starSlots: 1,
  killY: -8,
  setup: levelSetup(setup),
  start: { pos: [0, Y, 7], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 52, dist: 19.5, x: 0, xLock: 0.35, ahead: 1, lead: 0.5 }],
  arena: { enemies: 'all', star: [0, Y + 0.6, -1], starIndex: 0, intro: 'Stoß die Großrollpilze in die Lava!', center: [0, Y, -1], camPull: 0.3 },
  segments: [
    { type: 'torches', h: 1.5, items: STUMP_A.map((a) => stump(a)) },
    { type: 'deco_w1', items: [
      { kind: 'crystals', pos: at(-1.6, 9.6), size: 1.1, n: 5, color: 'gold' },
      { kind: 'crystals', pos: at(3.4, 9.3), size: 0.9, n: 4, color: 'gold' },
      { kind: 'crystals', pos: at(1.25, 9.4), size: 0.8, n: 4, color: 'pink' },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.6, Y + 2.3, 4.6], content: 'krallen' },
  ],
  enemies: [
    { kind: 'grossrollpilz', id: 'grp1', pos: [0, Y, -4], behavior: 'chase', sight: 18, wake: 40 },
    { kind: 'grossrollpilz', id: 'grp2', pos: [-5, Y, -3], behavior: 'chase', sight: 18, wake: 40 },
    { kind: 'grossrollpilz', id: 'grp3', pos: [5, Y, -3], behavior: 'chase', sight: 18, wake: 40 },
  ],
  items: [
    { kind: 'coins', pos: [-6, Y + 0.4, 2], r: 1.4, n: 6 },
    { kind: 'coins', pos: [6, Y + 0.4, 2], r: 1.4, n: 6 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 7], grp1: [0, Y, -4], grp2: [-5, Y, -3], grp3: [5, Y, -3] },
};
