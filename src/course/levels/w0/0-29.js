// Motor-Werkbank (0-29): je Motor-Feinschliff nach Welt 6 eine Station mit Schild, Kameraschiene und benannten Punkten
// (marks) für tests/course_motor_fixes.mjs (Präzisierung „Motor-Feinschliff nach Welt 6“). Thema clearpipe, Level nach −Z,
// Boden y = 1.
//   S0  Start                                                                          z    6 …   −6
//   S1  Instanz-Regeln je Art: acht ruhende Stachelkugeln, sechs Pilzlinge              z   −6 …  −40
//   S2  Stampfen auf fahrenden Trägern: Plattform (mover), Flachwagen (vehicle)       z  −40 …  −72
//   S3  Kamera: lange Rampe, einzelner ?-Block hinter der Figur, Ziegelreihe           z  −72 … −104
//   S4  Wurfball am steilen Hang                                                       z −104 … −128
//   S5  Eisflächen: Kante sparsam (Standard), ohne Kante, fein (Registry-Modell)        z −128 … −160
//   S6  Pilz-Maske über dem Stachelwerfer                                              z −160 … −186
//   S7  Gelee-Brocken ohne Boss (rot, blau, grün)                                       z −186 … −200
//   S8  Farbfeld 3 × 3 (switchtiles), Rot-Blau-Flipper weit rechts                      z −200 … −228
//   S9  Kraftfeld „nur Bälle“ (Form mit ballPass), Zielscheibe dahinter                 z −228 … −252
//   S10 Ziel                                                                           z −252 … −264

import * as THREE from 'three';

const plat = (z0, z1, top = 1, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

// Eisflächen der Station S5 (Bereiche für die Dreieckszählung in prebuild)
const LAKES = {
  sparsam: { x: -8.5, z: -144, size: [7, 0.2, 10] },
  ohne: { x: 0, z: -144, size: [7, 0.2, 10], edge: false },
  fein: { x: 8.5, z: -144, size: [7, 0.2, 10], edge: 'fein' },
};

/** Dreiecke der statischen Geometrie je Eisfläche zählen (Bereich der Fläche + 0,8 m Rand). */
function prebuild(level) {
  const view = level.view;
  if (!view) return;
  const count = level._lakeTris = { sparsam: 0, ohne: 0, fein: 0 };
  const orig = view.addStatic.bind(view);
  const box = new THREE.Box3();
  view.addStatic = (g, opts) => {
    if (g?.attributes?.position) {
      g.computeBoundingBox();
      box.copy(g.boundingBox);
      const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
      for (const [k, L] of Object.entries(LAKES)) {
        const hx = L.size[0] / 2 + 0.8, hz = L.size[2] / 2 + 0.8;
        if (box.min.x >= L.x - hx && box.max.x <= L.x + hx && box.min.z >= L.z - hz && box.max.z <= L.z + hz && box.max.y < 2.2) count[k] += n;
      }
    }
    return orig(g, opts);
  };
  level._lakeRestore = () => { view.addStatic = orig; };
}

/** Kraftfeld „nur Bälle“ (Form mit ballPass) und seine Optik; Zählung der Eisflächen beenden. */
function build(level) {
  level._lakeRestore?.();
  const min = [-3, 1, -240.3], max = [3, 4, -239.7];
  level.world.add({ type: 'box', min, max, ballPass: true, noWallSlide: true, camIgnore: true, tag: 'kraftfeld' });
  // Gegenprobe: gewöhnliche Wand gleicher Größe daneben
  level.world.add({ type: 'box', min: [6, 1, -240.3], max: [12, 4, -239.7], noWallSlide: true, camIgnore: true, tag: 'glaswand' });
  if (!level.view) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.35, depthWrite: false });
  const m = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.6), mat);
  m.position.set(0, 2.5, -240);
  m.userData.owned = true;
  level.view.add(m);
  const mat2 = new THREE.MeshBasicMaterial({ color: 0xd0d8e0, transparent: true, opacity: 0.5, depthWrite: false });
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.6), mat2);
  m2.position.set(9, 2.5, -240);
  m2.userData.owned = true;
  level.view.add(m2);
}

export const LEVEL = {
  id: '0-29',
  world: 0,
  title: 'Motor-Werkbank',
  archetype: 'parcours',
  theme: 'clearpipe',
  music: 'course_grass',
  timeLimit: 999,
  prebuild,
  build,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 42, dist: 14 },
    { from: -6, to: -40, pitch: 46, dist: 15 },
    { from: -40, to: -72, pitch: 44, dist: 15 },
    { from: -72, to: -104, pitch: 45, dist: 13 },
    { from: -104, to: -128, pitch: 44, dist: 14 },
    { from: -128, to: -160, pitch: 50, dist: 15 },
    { from: -160, to: -186, pitch: 42, dist: 14 },
    { from: -186, to: -228, pitch: 46, dist: 15 },
    { from: -228, to: -266, pitch: 44, dist: 14 },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -6),
    sign(-7, 1, 0, 'Motor-Werkbank'),

    // ---------------- S1 Instanz-Regeln
    plat(-6, -40),
    sign(-11, 1, -7, 'Instanz-Regeln'),

    // ---------------- S2 Stampfen auf fahrenden Trägern
    plat(-40, -72),
    sign(-11, 1, -41, 'Stampfen auf Trägern'),
    { type: 'mover', id: 'lift', path: [[-9, 3, -50], [9, 3, -50]], size: [4, 0.5, 4], speed: 3, wait: 0, mode: 'pingpong' },
    { type: 'platform', pos: [0, 3, -58], size: [4, 0.5, 4], style: 'stone' },

    // ---------------- S3 Kamera: Rampe, ?-Block, Ziegelreihe
    plat(-72, -104),
    sign(-11, 1, -73, 'Kamera'),
    { type: 'ramp', pos: [6, 1, -91], size: [6, 5, 22], axis: 'z', dir: -1 },
    { type: 'island', pos: [6, 1, -104.5], size: [6, 5, 3], under: 0 },

    // ---------------- S4 Wurfball am Hang
    plat(-104, -128),
    sign(-11, 1, -105, 'Wurfball am Hang'),
    { type: 'island', pos: [0, 1, -107.5], size: [4, 6, 3], under: 0 },
    { type: 'ramp', pos: [0, 1, -114], size: [4, 6, 10], axis: 'z', dir: 1 },
    { type: 'island', pos: [-6, 1, -107.5], size: [4, 6, 3], under: 0 },
    { type: 'ramp', pos: [-6, 1, -114], size: [4, 6, 10], axis: 'z', dir: 1 },

    // ---------------- S5 Eisflächen
    plat(-128, -160),
    sign(-12, 1, -129, 'Eiskante'),
    ...Object.values(LAKES).map((L) => ({ type: 'eisflaeche', pos: [L.x, 1, L.z], size: L.size, ...(L.edge !== undefined ? { edge: L.edge } : {}) })),

    // ---------------- S6 Pilz-Maske
    plat(-160, -186),
    sign(-11, 1, -161, 'Pilz-Maske'),

    // ---------------- S7 Gelee-Brocken
    plat(-186, -200),
    sign(-11, 1, -187, 'Gelee-Brocken'),

    // ---------------- S8 Farbfeld und Flipper
    plat(-200, -228),
    sign(-11, 1, -201, 'Farbfeld'),
    { type: 'switchtiles', id: 'farbfeld', pos: [0, 1, -212], grid: [3, 3], spacing: 1.6 },
    plat(-200, -228, 1, 16, 60),
    { type: 'flipper', id: 'flipper', pos: [60, 1, -214], grid: [5, 5], cell: 2 },

    // ---------------- S9 Kraftfeld
    plat(-228, -252),
    sign(-11, 1, -229, 'Kraftfeld'),
    { type: 'zielscheibe', group: 'kraft', stand: 1, targets: [{ id: 'ziel_kraft', pos: [0, 2.2, -246] }, { id: 'ziel_wand', pos: [9, 2.2, -246] }] },

    // ---------------- S10 Ziel
    plat(-252, -266),
  ],
  blocks: [
    // S3: einzelner ?-Block hinter der Figur (Kamerastrahl), Ziegelreihe (Mauer) als Gegenprobe
    { kind: 'question', pos: [-6, 3.3, -78.6], content: 'coin' },
    { kind: 'brick', pos: [-1, 3.3, -78.6] }, { kind: 'brick', pos: [0, 3.3, -78.6] }, { kind: 'brick', pos: [1, 3.3, -78.6] },
  ],
  enemies: [
    // S1: ruhende Stachelkugeln (Reihe quer) und Pilzlinge
    ...[-7, -5, -3, -1, 1, 3, 5, 7].map((x, i) => ({ kind: 'stachelkugel', id: `kugel${i}`, pos: [x, 1, -24] })),
    ...[-6, -3.6, -1.2, 1.2, 3.6, 6].map((x, i) => ({ kind: 'pilzling', id: `pilz${i}`, pos: [x, 1, -32], wake: 999, speed: 0 })),
    // S2: Flachwagen fährt quer hin und her
    { kind: 'vehicle', id: 'wagen', style: 'flat', path: [[-10, 1, -66], [10, 1, -66]], speed: 3, mode: 'pingpong' },
    // S6: Stachelwerfer blickt zur Figur (+Z)
    { kind: 'stachelwerfer', id: 'werfer', pos: [0, 1, -174], dir: [0, 1], sight: 10, first: 1.0, interval: 1.2 },
    // S7: Gelee-Brocken ohne Würfelblase
    { kind: 'gelee_brocken', id: 'gelee_rot', pos: [-4, 1, -193], color: 'rot', behavior: 'hop', speed: 0 },
    { kind: 'gelee_brocken', id: 'gelee_blau', pos: [0, 1, -193], color: 'blau', behavior: 'hop', speed: 0 },
    { kind: 'gelee_brocken', id: 'gelee_gruen', pos: [4, 1, -193], color: 'gruen', behavior: 'hop', speed: 0 },
  ],
  items: [
    { kind: 'wurfball', id: 'ball_hang', pos: [0, 7.1, -110.6] },
    { kind: 'wurfball', id: 'ball_alt', pos: [-6, 7.1, -110.6], slopeAir: 0 },
    { kind: 'wurfball', id: 'ball_kraft', pos: [0, 1, -236] },
    { kind: 'pilz_maske', id: 'maske', pos: [8, 1, -165] },
  ],
  goal: [0, 1, -260],
  marks: {
    start: [0, 1, 3], kugeln: [0, 1, -18], pilze: [0, 1, -28],
    lift: [0, 3.5, -50], stein: [0, 3.5, -58], wagen: [0, 2, -66],
    rampe: [6, 3.5, -91], fragezeichen: [-6, 1, -80], mauer: [0, 1, -80],
    hang: [0, 7, -110.6], eis: [0, 1, -136],
    maske: [0, 1, -168], gelee: [0, 1, -190], farbfeld: [0, 1, -206], flipper: [60, 1, -205],
    kraft: [0, 1, -234], ziel: [0, 1, -258],
  },
};
