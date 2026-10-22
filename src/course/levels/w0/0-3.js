// Klonwiese (0-3): Testlevel der Motor-Erweiterungen für Welt 2 (tests/course_w2engine.mjs). Ein Mittelweg führt
// nach −Z, jede Station hat ein Schild und benannte Punkte (marks):
//   Start / Spiegelfrucht (z 6 … −20)   Spiegelfrucht am Weg, ?-Block mit Spiegelfrucht, Pilzling im Gehege
//   Druckfelder (−22 … −34)             Feld für 2 Figuren (→ Stern 1), Feld-Paar „gleichzeitig“ (→ Stern 2)
//   Viererlift (−36 … −50)              Lift fährt erst mit 4 Figuren auf den Turm (Stern 3)
//   Figurenschalter (−52 … −60)         Lotti-Schalter (→ Truhe links), Greta-Schalter (→ Truhe rechts)
//   Helme (−62 … −84)                   Kanonen-Helm + Holzwand + Pilzling · Propeller-Helm + Sims (8 m) · Licht-Helm + Testgeist
//   Topfpflanze (−86 … −98)             Topfpflanze, Pilzling im Gehege
//   Treibsand (−100 … −118)             Treibsandbecken (Mitte), fließender Treibsand nach rechts über die Kante
//   Sandblöcke (−118 … −125)            Brücke aus Sandblöcken über eine Lücke
//   Ziel (−125 … −137)

const Y = 1;

/** Gehege: vier niedrige Mauern um x0..x1 × z0..z1 (z0 > z1). */
function pen(x0, x1, z0, z1, h = 1.2) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
  return [
    { type: 'wall', pos: [cx, Y, z0], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [cx, Y, z1], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [x0, Y, cz], size: [0.5, h, d], camIgnore: true },
    { type: 'wall', pos: [x1, Y, cz], size: [0.5, h, d], camIgnore: true },
  ];
}

export const LEVEL = {
  id: '0-3',
  world: 0,
  title: 'Klonwiese',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_grass',
  timeLimit: 999,
  start: { pos: [0, Y, 4], yaw: Math.PI / 2 },
  camera: [{ from: 12, to: -145, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, 0, -46], size: [26, 1, 108] },
    { type: 'island', pos: [-8.5, 0, -106], size: [9, 1, 12] },
    { type: 'island', pos: [8.5, 0, -106], size: [9, 1, 12] },
    { type: 'island', pos: [-3.5, 0, -115], size: [19, 1, 6] },
    { type: 'island', pos: [0, 0, -131], size: [26, 1, 12] },
    { type: 'killplane', y: -16 },
    // Schilder
    { type: 'sign', pos: [-5, Y, 1], text: 'Spiegelfrucht' },
    { type: 'sign', pos: [-9, Y, -21], text: 'Druckfelder' },
    { type: 'sign', pos: [-5, Y, -37], text: 'Viererlift' },
    { type: 'sign', pos: [-9, Y, -52], text: 'Figurenschalter' },
    { type: 'sign', pos: [-10, Y, -61], text: 'Helme' },
    { type: 'sign', pos: [-9, Y, -86], text: 'Topfpflanze' },
    { type: 'sign', pos: [-9, Y, -100.5], text: 'Treibsand' },
    // Gehege
    ...pen(-12, -5, -12, -19),
    ...pen(-7, 1, -91, -95),
    // Viererlift → Turm mit Stern 3
    { type: 'multilift', id: 'vierer', pos: [0, Y, -44], rise: 6, need: 4, size: [3.2, 0.5, 3.2] },
    { type: 'island', pos: [0, 0, -49], size: [4, 7.5, 3], top: 'stone', under: 0 },
    // Figurenschalter → Truhen
    { type: 'figurenschalter', pos: [-3, Y, -56], hero: 'lotti', on: { reveal: 'truhe_l' } },
    { type: 'figurenschalter', pos: [3, Y, -56], hero: 'greta', on: { reveal: 'truhe_g' } },
    // Helme: Holzwand vor einer Nische (Kanonen-Helm), Sims 8 m (Propeller-Helm)
    { type: 'holzwand', id: 'holzwand', pos: [-7, Y, -72], size: [4, 3, 0.6], content: 'coins:3' },
    { type: 'island', pos: [0, Y, -79], size: [4, 7, 3], top: 'stone', under: 0 },
    // Treibsand (Becken) und fließender Treibsand über die Kante
    { type: 'quicksand', id: 'sandbecken', pos: [0, -0.2, -106], size: [8, 1.2, 12] },
    { type: 'quicksand', id: 'sandfluss', pos: [9.5, -0.2, -115], size: [7, 1.2, 6], flow: [1.6, 0] },
    // Brücke aus Sandblöcken
    { type: 'sandblock', id: 'sb', from: [0, 0, -118.5], to: [0, 0, -124.5], respawn: 3 },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-11, Y, 5], size: 4.4 }, { kind: 'flowers', pos: [3, Y, 6], size: [3, 2], n: 8 },
      { kind: 'bush', pos: [10, Y, -30], size: 0.8 }, { kind: 'tree', pos: [11, Y, -88], size: 4.6 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [3, 3.4, -10], content: 'spiegel' },
  ],
  enemies: [
    { kind: 'pilzling', id: 'pz_pen', pos: [-8.5, Y, -15.5], path: [[-11, Y, -15.5], [-6, Y, -15.5]] },
    { kind: 'pilzling', id: 'pz_wand', pos: [-7, Y, -75], dir: [1, 0], path: [[-9, Y, -75], [-5, Y, -75]] },
    { kind: 'testgeist', id: 'geist', pos: [7, 1.4, -72], follow: false },
    { kind: 'pilzling', id: 'pz_pflanze', pos: [-3, Y, -92.4], path: [[-5.5, Y, -92.4], [-0.5, Y, -92.4]] },
  ],
  items: [
    { kind: 'powerup', pos: [0, Y, -6], power: 'spiegel' },
    { kind: 'pfeld', id: 'pf2', pos: [-4, Y, -27], need: 2, on: { star: 0 } },
    { kind: 'pfeld', id: 'paar_a', pos: [3, Y, -27], group: 'paar', need: 1, on: { star: 1 }, size: [1.8, 1.8] },
    { kind: 'pfeld', id: 'paar_b', pos: [7, Y, -27], group: 'paar', need: 1, size: [1.8, 1.8] },
    { kind: 'chest', id: 'truhe_l', hidden: true, pos: [-3, Y, -59.5], content: 'coins:5' },
    { kind: 'chest', id: 'truhe_g', hidden: true, pos: [3, Y, -59.5], content: 'coins:5' },
    { kind: 'helm_kanone', id: 'hk', pos: [-7, Y, -65], respawn: 5 },
    { kind: 'helm_propeller', id: 'hp', pos: [0, Y, -65], respawn: 5 },
    { kind: 'helm_licht', id: 'hl', pos: [7, Y, -65], respawn: 5 },
    { kind: 'coins', from: [-1, 8.4, -79], to: [1, 8.4, -79], n: 3 },
    { kind: 'topfpflanze', id: 'pflanze', pos: [-3, Y, -88.5] },
    { kind: 'coins', from: [-2, Y, -89.5], to: [2, Y, -89.5], n: 3 },
  ],
  stars: [
    { pos: [-4, Y + 0.4, -30], hidden: true, id: 'stern_pf' },
    { pos: [5, Y + 0.4, -30], hidden: true, id: 'stern_paar' },
    [0, 7.6, -49],
  ],
  checkpoint: [0, Y, -84],
  goal: [0, Y, -132],
  marks: {
    start: [0, Y, 4], spiegel: [0, Y, -6], block: [3, Y, -10],
    pen: [-8.5, Y, -15.5], pf2: [-4, Y, -27], paar_a: [3, Y, -27], paar_b: [7, Y, -27],
    lift: [0, Y, -44], lift_top: [0, 7.5, -49],
    sw_lotti: [-3, Y, -56], sw_greta: [3, Y, -56],
    helm_k: [-7, Y, -65], wand: [-7, Y, -72], helm_p: [0, Y, -65], sims: [0, 8, -79], helm_l: [7, Y, -65], geist: [7, 1.4, -72],
    pflanze: [-3, Y, -88.5], pz_pflanze: [-3, Y, -92.4],
    sand: [0, Y, -106], sand_flow: [9.5, Y, -115], sandblock: [0, Y, -121.5], goal: [0, Y, -132],
  },
};
