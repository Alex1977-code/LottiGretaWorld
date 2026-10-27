// H-2 „Klingelstreich im Schlummerdorf“ – Süßes-oder-Saures-Dorf der Halloween-Welt „Kürbisinsel“ bei Nacht (Welt 31).
// Offener Parcours nach −Z, ≈ 230 m, Thema candyvillage, Musik course_candyvillage, 400 s. Jede Haustür lässt sich
// klingeln (vor die Tür stellen und hinschauen, Antippen bzw. Aktionstaste oder Stampfen auf die Matte): heraus kommen
// Bitcoins, Süßigkeiten – oder ein Kürbling hüpft heraus. Stürze gibt es nur von der Stadtmauer (ungefährlich).
//
// Abschnitte (+X = rechts im Bild; Bodenhöhen 1 → 2 → 3):
//   A  Dorfeingang      z  14 … −18   Kürbistor, erste Tür („Klingeln!“), Laternen, Süßes
//   B  Marktplatz       z −18 … −72   sechs Türen rings um den Platz (Zähler „Türen n/6“; alle → Stern 0 über dem
//                                    Kessel-Brunnen, mit dem Hexenkessel hinauf), Markisen zum Hüpfen, Fledermaus-Schwarm
//   C  Schiefe Gasse    z −72 … −124  enge, steigende Gasse mit Türen auf beiden Seiten, Hexenhut-Hüpfer; ein schmaler
//                                    Durchgang rechts führt in einen Hinterhof: dort gibt eine Tür Stern 1;
//                                    Brunnenplatz mit Checkpoint
//   D  Kirchplatz       z −124 … −153 Kirchlein mit Glockenturm, Kirchhof mit Lach-Grabsteinen und kicherndem Geist; ein
//                                    Grabstein ist ein Schalter → Steinstufen zur Glockenstube (Stern 2). Stadtmauer mit
//                                    verschlossenem Tor: über die federnden Markisen der Marktstände hinauf
//   E  Kürbisfest       z −153 … −215 Festplatz mit Bühne und Zielmast, zwei Türen, Kürbis-Turm (Spinnennetz-Trampolin →
//                                    Stempel ganz oben)
// Gegner: Kürblinge (4 + 4 aus Türen), Hexenhut-Hüpfer 3, Flatterfledi-Schwarm (5), Flatterfledi 1.

import {
  isl, line, candy, candyRing, candyArc, sign, rampe, hoftor, kuerbisDeko, laternenPfad, haeuschen, marktstand,
  stadtmauer, kirchlein, brunnen, kicherGeist, buehne,
} from './_helpers_a.js';

const Y0 = 1, Y2 = 2, Y3 = 3;

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M2 = {
  EINGANG: { x0: -16, x1: 16, z0: 14, z1: -18 },
  MARKT: { x0: -15, x1: 15, z0: -18, z1: -72 },
  GASSE: { x0: -4.5, x1: 4.5, z0: -72, z1: -124 },
  HOF: { x0: 8, x1: 18, z0: -84, z1: -99 },          // Hinterhof (Höhe 2; Insel x 8 … 21, z −82 … −103)
  KIRCHE: { x0: -22, x1: 20, z0: -124, z1: -150 },
  MAUER: { z: -150, depth: 3, h: 5 },
  FEST: { x0: -15, x1: 15, z0: -153, z1: -215 },
  TURM: { x: -11, z: -140, T: 10 },
  KESSEL: { x: 0, z: -43 },
};
const { EINGANG, MARKT, GASSE, HOF, KIRCHE, MAUER, FEST, TURM, KESSEL } = M2;

// Türen: Häuschen mit Tür (Baustein suessigkeiten_tuer). yaw 0 = Tür nach +X (linke Seite), π = nach −X (rechte Seite).
const tuer = (id, x, y, z, yaw, content, o = {}) => ({ type: 'suessigkeiten_tuer', id, pos: [x, y, z], yaw, content, ...o });
export const TUEREN_MARKT = ['markt1', 'markt2', 'markt3', 'markt4', 'markt5', 'markt6'];

// Kürbis-Turm (Stempel): vier gestapelte Riesenkürbisse, oben ein Holzteller
export const KTURM = { x: -11, z: -203.5, sizes: [3.0, 2.8, 2.6, 2.4], r: 1.12 };
export const NETZ = { x: -8, z: -200.2 };
export const KTURM_TOP = Y3 + KTURM.sizes.reduce((a, s) => a + s * 0.74, 0) + 0.2;
const kturmY = (i) => Y3 + KTURM.sizes.slice(0, i).reduce((a, s) => a + s * 0.74, 0);

// Laternen im Dorf (brennen von Anfang an)
const LATERNEN = [
  [-5.4, Y0, 2, Math.PI], [5.4, Y0, -2, 0], [-5.4, Y0, -14, Math.PI], [5.4, Y0, -14, 0],
  [-8, Y0, -21, Math.PI], [8, Y0, -21, 0], [-8, Y0, -68, Math.PI], [8, Y0, -68, 0],
  [-4.1, Y2, -92, Math.PI], [4.1, Y3, -112, 0],
  [-4, Y3, -146.5, Math.PI], [4, Y3, -146.5, 0], [-8, Y3, -158, Math.PI], [8, Y3, -158, 0], [-6.6, Y3, -196, Math.PI], [6.6, Y3, -196, 0],
].map(([x, y, z, yaw], i) => ({ id: `dl${i + 1}`, pos: [x, y, z], yaw, height: 2.4 }));

function build(level) {
  // Gasse: Rampen zwischen den Stufen (Kamera sieht durch)
  rampe(level, { x0: GASSE.x0, x1: GASSE.x1, z0: -84, z1: -89, y: Y0, h: Y2 - Y0, top: 'stone' });
  rampe(level, { x0: GASSE.x0, x1: GASSE.x1, z0: -101, z1: -106, y: Y2, h: Y3 - Y2, top: 'stone' });
  // hinter der Mauer: Treppe hinab zum Festplatz
  rampe(level, { x0: -2.2, x1: 2.2, z0: MAUER.z - MAUER.depth, z1: -165, y: Y3, h: MAUER.h, dir: 1, top: 'stone' });
  hoftor(level, { pos: [0, Y0, 7], w: 6.4, h: 3.6 });
  laternenPfad(level, LATERNEN, 7, { allOn: true });
  stadtmauer(level, { x0: KIRCHE.x0, x1: KIRCHE.x1, z: MAUER.z, depth: MAUER.depth, y: Y3, h: MAUER.h, backGap: [-2.6, 2.6] });
  kirchlein(level, { pos: [TURM.x, Y3, TURM.z], tower: TURM.T, nave: 'links', gap: 4.5 });
  brunnen(level, { pos: [-5.5, Y3, -119.5] });
  buehne(level, { x0: -5, x1: 5, z0: -199, z1: -209, y: Y3 + 0.6, h: 3.6 });
  kicherGeist(level, { pos: [-16.4, Y3, -131.6], side: 1, near: 5 });
  // Kürbis-Turm: eine glatte Säule (keine Simse zum Hochklettern), oben ein Holzteller
  level.world.add({ type: 'cyl', x: KTURM.x, z: KTURM.z, r: KTURM.r, y0: Y3, y1: KTURM_TOP, tag: 'kuerbisturm' });
  kuerbisDeko(level, [{ pos: [KTURM.x, KTURM_TOP - 0.22, KTURM.z], size: 2.6, shape: 'flach', color: 'gelb', leaf: false }]);
  // Marktstände: auf dem Marktplatz zum Üben (Markisen federn), vor der Mauer als Weg hinauf
  marktstand(level, { pos: [-6.6, Y0, -62], yaw: -Math.PI / 2, colors: [0xff5a8a, 0xfff2e0], bounce: 14 });
  marktstand(level, { pos: [-6.4, Y0, -27.5], yaw: 0, colors: [0xffd23a, 0xfff2e0], bounce: 14 });
  marktstand(level, { pos: [6.4, Y0, -31], yaw: Math.PI, colors: [0x9a6aff, 0xfff2e0], bounce: 14 });
  marktstand(level, { pos: [-8.6, Y3, -170], yaw: 0, colors: [0xff8a2a, 0xfff2e0], bounce: 14 });
  marktstand(level, { pos: [8.6, Y3, -180], yaw: Math.PI, colors: [0x6aea7a, 0xfff2e0], bounce: 14 });
  marktstand(level, { pos: [6.6, Y0, -62], yaw: -Math.PI / 2, colors: [0x6ad8ff, 0xfff2e0], bounce: 14 });
  marktstand(level, { pos: [-6.5, Y3, -148.3], yaw: -Math.PI / 2, colors: [0x9a6aff, 0xfff2e0], bounce: 16.5 });
  marktstand(level, { pos: [0, Y3, -148.3], yaw: -Math.PI / 2, colors: [0xff8a2a, 0xfff2e0], bounce: 16.5 });
  marktstand(level, { pos: [6.5, Y3, -148.3], yaw: -Math.PI / 2, colors: [0x6aea7a, 0xfff2e0], bounce: 16.5 });
  // Häuschen ohne Tür-Gimmick (Kulisse, sparsam)
  haeuschen(level, [
    // Eingang
    { pos: [-6.4, Y0, 4], yaw: 0, color: 'orange', w: 4.4 }, { pos: [6.4, Y0, 3], yaw: Math.PI, color: 'blau', w: 4.6 },
    { pos: [6.4, Y0, -8], yaw: Math.PI, color: 'gruen', w: 4.2, windows: 1 },
    // Marktplatz hinten (Blick +Z) und Ecken
    { pos: [-11, Y0, -68.6], yaw: -Math.PI / 2, color: 'rosa', w: 7.6, d: 3.2, windows: 3 },
    { pos: [11, Y0, -68.6], yaw: -Math.PI / 2, color: 'gruen', w: 7.6, d: 3.2, windows: 3 },
    { pos: [-11.6, Y0, -20.6], yaw: 0, color: 'creme', w: 4.2, windows: 1 }, { pos: [11.6, Y0, -20.6], yaw: Math.PI, color: 'lila', w: 4.2, windows: 1 },
    { pos: [-11.6, Y0, -48], yaw: 0, color: 'blau', w: 4.2, windows: 1, door: false }, { pos: [11.6, Y0, -37], yaw: Math.PI, color: 'rosa', w: 4.2, windows: 1, door: false },
    { pos: [11.6, Y0, -51], yaw: Math.PI, color: 'creme', w: 4.2, windows: 1, door: false }, { pos: [-11.6, Y0, -34], yaw: 0, color: 'orange', w: 4.2, windows: 1, door: false },
    { pos: [-11.6, Y0, -61.8], yaw: 0, color: 'lila', w: 3.6, windows: 1, door: false }, { pos: [11.6, Y0, -64.4], yaw: Math.PI, color: 'blau', w: 3.4, windows: 1, door: false },
    // Gasse links (Blick +X) und rechts (Blick −X); rechts bei z −90,5 der schmale Durchgang in den Hinterhof
    { pos: [GASSE.x0, Y0, -73.6], yaw: 0, color: 'gruen', w: 3.2 }, { pos: [GASSE.x0, Y0, -85.2], yaw: 0, color: 'blau', w: 6, windows: 3 },
    { pos: [GASSE.x0, Y2, -100.2], yaw: 0, color: 'rosa', w: 4.8 }, { pos: [GASSE.x0, Y3, -106.4], yaw: 0, color: 'creme', w: 3.6, windows: 1, h: 3.6 },
    { pos: [GASSE.x1, Y0, -75], yaw: Math.PI, color: 'orange', w: 6 }, { pos: [GASSE.x1, Y0, -84.2], yaw: Math.PI, color: 'lila', w: 8, windows: 3 },
    { pos: [GASSE.x1, Y2, -99.2], yaw: Math.PI, color: 'gruen', w: 6 }, { pos: [GASSE.x1, Y3, -106.8], yaw: Math.PI, color: 'blau', w: 4.4, windows: 1 },
    // Hinterhof: Rückseiten und Schuppen
    { pos: [HOF.x1 - 0.2, Y2, -87], yaw: Math.PI, color: 'creme', w: 3.6, windows: 1, door: false }, { pos: [12.5, Y2, HOF.z1 + 0.2], yaw: -Math.PI / 2, color: 'orange', w: 6, windows: 2 },
    // Brunnenplatz
    { pos: [-9, Y3, -113.5], yaw: -Math.PI / 2, color: 'lila', w: 4, windows: 1 }, { pos: [9.5, Y3, -114], yaw: -Math.PI / 2, color: 'gruen', w: 4.6 },
    { pos: [13, Y3, -129], yaw: Math.PI, color: 'rosa', w: 5 }, { pos: [13, Y3, -137], yaw: Math.PI, color: 'orange', w: 5, windows: 3 },
    // Festplatz
    { pos: [-12, Y3, -164], yaw: 0, color: 'blau', w: 5, windows: 3 }, { pos: [12, Y3, -166], yaw: Math.PI, color: 'creme', w: 5 },
    { pos: [12, Y3, -198], yaw: Math.PI, color: 'gruen', w: 5, windows: 3 }, { pos: [-12, Y3, -188], yaw: 0, color: 'orange', w: 4, windows: 1, door: false },
    { pos: [-9, Y3, -214.5], yaw: -Math.PI / 2, color: 'rosa', w: 6, windows: 3 }, { pos: [9, Y3, -214.5], yaw: -Math.PI / 2, color: 'lila', w: 6, windows: 3 },
  ]);
  kuerbisDeko(level, [
    { pos: [-2.6, Y0, 9.5], size: 0.7, face: 'lachen' }, { pos: [2.6, Y0, 9.5], size: 0.7, face: 'grinsen' },
    { pos: [-4.4, Y0, -5], size: 0.6, face: 'lachen' }, { pos: [-4.6, Y0, -9.4], size: 0.9, face: 'staunen', color: 'gelb' },
    { pos: [-1.8, Y0, -44.8], size: 0.6, face: 'lachen' }, { pos: [1.8, Y0, -44.8], size: 0.6, face: 'grinsen' },
    { pos: [-9.6, Y0, -65.5], size: 1.3, face: 'lachen', light: true }, { pos: [9.6, Y0, -23.4], size: 1.2, face: 'grinsen', light: true },
    { pos: [3.6, Y2, -96.2], size: 0.55, face: 'lachen' }, { pos: [-3.6, Y3, -108.2], size: 0.55, face: 'staunen' },
    { pos: [9.5, Y2, -92], size: 0.6, face: 'lachen', light: true }, { pos: [12.5, Y2, -88.5], size: 0.7, face: 'grinsen' },
    { pos: [-7.4, Y3, -127.8], size: 0.55, face: 'lachen' },
    { pos: [-3.25, Y3, -148.8], size: 1.3, face: 'grinsen' }, { pos: [3.25, Y3, -149], size: 1.2, face: 'lachen', color: 'gelb' }, { pos: [-9.6, Y3, -149], size: 1.0, face: 'staunen' },
    { pos: [-4.2, Y3 + 0.6, -200.2], size: 0.9, face: 'lachen', light: true }, { pos: [4.2, Y3 + 0.6, -200.2], size: 0.9, face: 'grinsen', light: true },
    { pos: [7, Y3, -191.5], size: 1.4, face: 'lachen' }, { pos: [8.3, Y3, -192.6], size: 1.0, color: 'gelb', face: 'grinsen' }, { pos: [7.6, Y3 + 1.0, -192], size: 0.8, color: 'weiss', face: 'staunen' },
    { pos: [-2.4, Y3, -126], size: 0.9, face: 'lachen' }, { pos: [6.5, Y3, -121], size: 1.1, face: 'grinsen', color: 'gelb' }, { pos: [7.4, Y3, -122], size: 0.6 },
    { pos: [-10.6, Y3, -181.5], size: 0.8, face: 'lachen' }, { pos: [10.6, Y3, -173], size: 0.8, face: 'staunen' },
  ]);
}

export const LEVEL = {
  id: 'H-2',
  world: 31,
  title: 'Klingelstreich im Schlummerdorf',
  archetype: 'parcours',
  theme: 'candyvillage',
  music: 'course_candyvillage',
  timeLimit: 400,
  candyHud: true,
  killY: -8,
  start: { pos: [0, Y0, 11], yaw: Math.PI / 2 },
  build,
  instances: { coin: { farHide: 40, shadow: false } },
  farHide: 40,
  camera: [
    { from: 20, to: -18, pitch: 42, dist: 13, fov: 40 },
    { from: -18, to: -72, pitch: 46, dist: 15, fov: 42 },                       // Marktplatz
    { from: -72, to: -112, pitch: 46, dist: 12.5, fov: 40 },                    // Gasse
    { from: -112, to: -142, pitch: 42, dist: 14, fov: 42 },                     // Brunnen, Kirchplatz
    { from: -142, to: -160, pitch: 36, dist: 14, fov: 42, height: 2.2 },        // Markisen, Mauer
    { from: -160, to: -222, pitch: 42, dist: 14, fov: 42 },                     // Kürbisfest
    { from: -82, to: -102, pitch: 50, dist: 12, fov: 40, area: [7.5, 22] },     // Hinterhof
  ],
  segments: [
    // =============================================================== A  Dorfeingang
    isl(-5, 5, EINGANG.z0, EINGANG.z1, Y0, 5, { top: 'stone' }),
    isl(EINGANG.x0, -5, EINGANG.z0, EINGANG.z1, Y0, 5),
    isl(5, EINGANG.x1, EINGANG.z0, EINGANG.z1, Y0, 5),
    sign(-3.4, Y0, 11.6, 'Klingelstreich im\nSchlummerdorf', { size: [3.4, 1.2] }),
    sign(-3.4, Y0, -2.4, 'Klingeln: vor die\nTür stellen!', { size: [2.4, 0.9] }),
    tuer('tuer_e', -6.4, Y0, -7.6, 0, 'muenzen', { n: 5, group: 'dorf', hud: false, color: 'lila' }),
    { type: 'deco_hw', items: [
      { kind: 'zaun', from: [EINGANG.x0 + 0.4, Y0, 13], to: [EINGANG.x0 + 0.4, Y0, -17], style: 'holz' },
      { kind: 'zaun', from: [EINGANG.x1 - 0.4, Y0, 13], to: [EINGANG.x1 - 0.4, Y0, -17], style: 'holz' },
      { kind: 'fledermaus_girlande', from: [-3, Y0 + 3.6, 7], to: [-6.4, Y0 + 3.2, 4], n: 4, sag: 0.4 },
      { kind: 'fledermaus_girlande', from: [3, Y0 + 3.6, 7], to: [6.4, Y0 + 3.2, 3], n: 4, sag: 0.4 },
      { kind: 'strohballen', pos: [-9.5, Y0, 9], form: 'rund', yaw: 0.3 },
    ] },

    // =============================================================== B  Marktplatz
    isl(MARKT.x0, MARKT.x1, MARKT.z0, MARKT.z1, Y0, 5, { top: 'stone' }),
    tuer('markt1', -11.6, Y0, -27, 0, 'muenzen', { n: 5, group: 'markt', color: 'orange', onAll: { reveal: 'stern_markt' } }),
    tuer('markt2', -11.6, Y0, -41, 0, 'suesses', { n: 6, group: 'markt', color: 'gruen' }),
    tuer('markt3', -11.6, Y0, -55, 0, 'kuerbling', { group: 'markt', color: 'blau', enemy: { sight: 6 } }),
    tuer('markt4', 11.6, Y0, -30, Math.PI, 'suesses', { n: 6, group: 'markt', color: 'lila' }),
    tuer('markt5', 11.6, Y0, -44, Math.PI, 'muenzen', { n: 5, group: 'markt', color: 'orange' }),
    tuer('markt6', 11.6, Y0, -58, Math.PI, 'kuerbling', { group: 'markt', color: 'gruen', enemy: { sight: 6 } }),
    { type: 'hexenkessel', id: 'brunnenkessel', pos: [KESSEL.x, Y0, KESSEL.z], size: 2.6, height: 1.2, jump: 9.5, color: 'lila' },
    sign(3.2, Y0, -20.5, 'Marktplatz:\nklingel überall!', { size: [2.4, 0.9] }),
    { type: 'deco_hw', items: [
      { kind: 'fledermaus_girlande', from: [-11, Y0 + 4.6, -31], to: [11, Y0 + 4.6, -34], n: 10, sag: 1.0 },
      { kind: 'fledermaus_girlande', from: [-11, Y0 + 4.6, -52], to: [11, Y0 + 4.6, -49], n: 10, sag: 1.0 },
      { kind: 'strohballen', pos: [-3.6, Y0, -66.4], form: 'eckig', yaw: 0.2 },
    ] },

    // =============================================================== C  Schiefe Gasse
    isl(GASSE.x0, GASSE.x1, GASSE.z0, -84, Y0, 5, { top: 'stone' }),
    isl(GASSE.x0, GASSE.x1, -89, -101, Y2, 6, { top: 'stone' }),
    isl(GASSE.x0, GASSE.x1, -106, -114, Y3, 7, { top: 'stone' }),
    // Seitenterrassen (Häuser) links und rechts
    isl(-14, GASSE.x0, GASSE.z0, -89, Y0, 5), isl(-14, GASSE.x0, -89, -104, Y2, 6), isl(-14, GASSE.x0, -104, -112, Y3, 7),
    isl(GASSE.x1, 14, GASSE.z0, -82, Y0, 5), isl(GASSE.x1, HOF.x0, -82, -104, Y2, 6), isl(GASSE.x1, 14, -104, -112, Y3, 7),
    // Hinterhof (Stern 1) hinter den rechten Häusern
    isl(HOF.x0, HOF.x1 + 3, HOF.z0 + 2, HOF.z1 - 4, Y2, 6),
    tuer('gasse1', GASSE.x0, Y0, -79, 0, 'suesses', { n: 6, group: 'dorf', hud: false, color: 'orange' }),
    tuer('gasse2', GASSE.x1, Y2, -94, Math.PI, 'kuerbling', { group: 'dorf', hud: false, color: 'blau', enemy: { sight: 5 } }),
    tuer('gasse3', GASSE.x0, Y2, -95.6, 0, 'muenzen', { n: 5, group: 'dorf', hud: false, color: 'lila' }),
    tuer('geheim', HOF.x1 - 0.4, Y2, -93.6, Math.PI, { star: 1 }, { group: 'geheim', hud: false, color: 'rosa' }),
    sign(7.2, Y2, -88.6, 'Psst!', { size: [1.2, 0.6] }),
    { type: 'deco_hw', items: [
      { kind: 'fledermaus_girlande', from: [GASSE.x0 + 0.3, Y0 + 4.4, -80.5], to: [GASSE.x1 - 0.3, Y0 + 4.4, -81.5], n: 6, sag: 0.6 },
      { kind: 'fledermaus_girlande', from: [GASSE.x0 + 0.3, Y2 + 4.4, -97.5], to: [GASSE.x1 - 0.3, Y2 + 4.4, -96.5], n: 6, sag: 0.6 },
      { kind: 'spinnweben', pos: [GASSE.x1 - 0.2, Y2 + 3.4, -91.2], size: 1.2, yaw: Math.PI / 2 },
      { kind: 'zaun', from: [HOF.x0 + 0.3, Y2, -82.4], to: [HOF.x1 + 2.6, Y2, -82.4], style: 'holz', solid: true },
      { kind: 'zaun', from: [HOF.x1 + 2.6, Y2, -82.4], to: [HOF.x1 + 2.6, Y2, -102.6], style: 'holz', solid: true },
      { kind: 'zaun', from: [HOF.x0 + 0.3, Y2, -102.6], to: [HOF.x1 + 2.6, Y2, -102.6], style: 'holz', solid: true },
      { kind: 'strohballen', pos: [10.5, Y2, -97], form: 'eckig', yaw: 0.4 },
    ] },
    // Brunnenplatz (Checkpoint)
    isl(-12, 12, -112, KIRCHE.z0, Y3, 7, { top: 'stone' }),

    // =============================================================== D  Kirchplatz, Stadtmauer
    isl(KIRCHE.x0, KIRCHE.x1, KIRCHE.z0, MAUER.z, Y3, 7, { top: 'stone' }),
    isl(KIRCHE.x0, -6.5, KIRCHE.z0 - 1.5, -136.6, Y3 + 0.05, 0.6),                // Kirchhof (Gras)
    { type: 'grabstein_schalter', id: 'turmschalter', pos: [-10.2, Y3 + 0.05, -131.2], on: { reveal: 'turmweg' } },
    { type: 'appear', id: 'turmweg', style: 'stone', parts: [
      { pos: [-6.6, Y3 + 1.4, -133.6], size: [2, 0.5, 2] },
      { pos: [-5.2, Y3 + 3.1, -136.2], size: [2, 0.5, 2] },
      { pos: [-6.6, Y3 + 4.8, -138.8], size: [2, 0.5, 2] },
      { pos: [-8.3, Y3 + 6.5, -136.4], size: [2, 0.5, 2] },
      { pos: [-10.4, Y3 + 8.2, -136.8], size: [2, 0.5, 2] },
    ] },
    sign(-5.6, Y3, -125.6, 'Kirchhof', { size: [1.8, 0.7] }),
    { type: 'deco_hw', items: [
      { kind: 'grabsteine', pos: [-14.5, Y3 + 0.05, -130.4], size: [9, 6], n: 6, avoid: [[-10.2, -131.2, 1.6], [-16.4, -131.6, 1.2]], seed: 4 },
      { kind: 'grabstein', pos: [-16.4, Y3 + 0.05, -130.8], style: 'rund', size: 1.15 },
      { kind: 'krummer_baum', pos: [-20, Y3 + 0.05, -127], height: 5 },
      { kind: 'zaun', from: [KIRCHE.x0 + 0.5, Y3, -125.2], to: [-6.8, Y3, -125.2], style: 'holz' },
      { kind: 'kerzen', pos: [-12.6, Y3 + 0.05, -133.4], n: 3, size: 0.9 },
      { kind: 'spinnweben', pos: [-10.4, Y3 + 4.2, -138.3], size: 1.2 },
    ] },
    sign(4.6, Y3, -141.6, 'Tor zu?\nHüpf drüber!', { size: [2.2, 0.9] }),

    // =============================================================== E  Kürbisfest
    isl(FEST.x0, FEST.x1, MAUER.z - MAUER.depth, FEST.z1, Y3, 7, { top: 'stone' }),
    isl(-5, 5, -199, -209, Y3 + 0.6, 1.2, { top: 'stone' }),                      // Bühne
    tuer('fest1', -12, Y3, -176, 0, 'suesses', { n: 8, group: 'dorf', hud: false, color: 'gruen' }),
    tuer('fest2', 12, Y3, -186, Math.PI, 'kuerbling', { group: 'dorf', hud: false, color: 'orange', enemy: { sight: 6 } }),
    { type: 'spinnennetz_trampolin', id: 'netz', pos: [NETZ.x, Y3, NETZ.z], size: [3, 3], height: 1, jump: 8.5 },
    sign(-10.2, Y3, -195.4, 'Kürbis-Turm', { size: [1.9, 0.7] }),
    sign(-2.6, Y3 + 0.6, -207.6, 'Kürbisfest!', { size: [2.6, 0.9], post: 2.0 }),
    { type: 'deco_hw', items: [
      ...KTURM.sizes.map((s, i) => ({ kind: 'kuerbis', pos: [KTURM.x, kturmY(i), KTURM.z], size: s, face: ['lachen', 'grinsen', 'staunen', 'lachen'][i], color: ['orange', 'gelb', 'orange', 'weiss'][i], seed: i, solid: false })),
      { kind: 'fledermaus_girlande', from: [-11, Y3 + 4.6, -170], to: [11, Y3 + 4.6, -172], n: 11, sag: 1.0 },
      { kind: 'fledermaus_girlande', from: [-11, Y3 + 4.6, -188], to: [11, Y3 + 4.6, -186], n: 11, sag: 1.0 },
      { kind: 'fledermaus_girlande', from: [-4.6, Y3 + 5.8, -207.5], to: [4.6, Y3 + 5.8, -207.5], n: 7, sag: 0.6 },
      { kind: 'suessigkeiten', pos: [5.6, Y3, -174], size: 1.2 },
      { kind: 'strohballen', pos: [-3.2, Y3, -194.4], form: 'eckig', yaw: 0 },
      { kind: 'strohballen', pos: [3.2, Y3, -194.4], form: 'eckig', yaw: 0 },
      { kind: 'strohballen', pos: [-3.6, Y3, -192.6], form: 'eckig', yaw: 0.1 },
      { kind: 'strohballen', pos: [3.6, Y3, -192.6], form: 'eckig', yaw: -0.1 },
      { kind: 'strohballen', pos: [-5.6, Y3, -181], form: 'rund', yaw: 0.2 },
    ] },
  ],
  enemies: [
    { kind: 'kuerbling', id: 'kb1', pos: [2.4, Y0, -12], behavior: 'patrol', path: [[2.4, Y0, -10], [2.4, Y0, -16]], sight: 0 },
    { kind: 'kuerbling', id: 'kb2', pos: [-7, Y0, -34], sight: 6 },
    { kind: 'kuerbling', id: 'kb3', pos: [8, Y0, -52], sight: 6 },
    { kind: 'kuerbling', id: 'kb4', pos: [-6, Y3, -176], sight: 6 },
    { kind: 'hexenhut_huepfer', id: 'hh1', pos: [0, Y0, -78], sight: 6 },
    { kind: 'hexenhut_huepfer', id: 'hh2', pos: [0, Y2, -96], sight: 6 },
    { kind: 'hexenhut_huepfer', id: 'hh3', pos: [6, Y3, -190], sight: 6 },
    // Fledermaus-Schwarm kreist über dem Marktplatz (Fußpunkt über Kopfhöhe), eine hängt an der Stadtmauer
    { kind: 'flatterfledi_schwarm', id: 'ff_markt', pos: [0, Y0 + 2.6, -56], count: 5, radius: 3.2, speed: 1.8 },
    { kind: 'flatterfledi', id: 'ff_mauer', pos: [10.5, Y3 + 3.0, MAUER.z + 0.6], sight: 5 },
  ],
  blocks: [
    { kind: 'question', pos: [-1.3, Y0 + 2.6, -2.5], content: 'coins:3' },
    { kind: 'question', pos: [1.3, Y0 + 2.6, -2.5], content: 'wachstumsbeere' },
    { kind: 'question', pos: [0, Y3 + 2.6, -126.5], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [10.5, Y2 + 3.4, -97], content: 'oneup' },
  ],
  items: [
    // A
    candy([0, Y0, 9], [0, Y0, 3], 4),
    line([0, Y0 + 0.6, -6], [0, Y0 + 0.6, -15], 4),
    // B
    candyRing([KESSEL.x, Y0, KESSEL.z], 3.6, 8),
    ...[0, 1, 2].map((i) => ({ kind: 'coin', pos: [-6.6, Y0 + 4.2 + i * 1.1, -61.3] })),
    ...[0, 1, 2].map((i) => ({ kind: 'suessigkeit', pos: [6.6, Y0 + 3.8 + i * 1.1, -61.3] })),
    line([0, Y0 + 0.6, -60], [0, Y0 + 0.6, -70], 4),
    ...[0, 1, 2].map((i) => ({ kind: 'suessigkeit', pos: [-6.4, Y0 + 3.8 + i * 1.1, -27.5] })),
    ...[0, 1, 2].map((i) => ({ kind: 'coin', pos: [6.4, Y0 + 4.2 + i * 1.1, -31] })),
    // C
    candy([0, Y0, -74], [0, Y0, -82], 3),
    candy([0, Y2, -90], [0, Y2, -99], 3),
    line([0, Y3 + 0.6, -107], [0, Y3 + 0.6, -113], 3),
    candy([5.6, Y2, -90.6], [7.8, Y2, -90.6], 2),
    candyRing([12.5, Y2, -92.5], 1.8, 6),
    // D
    candy([-6, Y3, -121], [6, Y3, -121], 4),
    ...[0, 1, 2].map((i) => ({ kind: 'coin', pos: [0, Y3 + 4.6 + i * 1.2, -148.3] })),
    candyArc([0, MAUER.h + Y3, -151.5], [0, Y3, -165], 4, 1),
    // E
    line([0, Y3 + 0.6, -168], [0, Y3 + 0.6, -190], 5),
    ...[0, 1, 2].map((i) => ({ kind: 'suessigkeit', pos: [-8.6, Y3 + 3.8 + i * 1.1, -170] })),
    ...[0, 1, 2].map((i) => ({ kind: 'suessigkeit', pos: [8.6, Y3 + 3.8 + i * 1.1, -180] })),
    candyRing([0, Y3, -182], 3.2, 8),
    candyArc([NETZ.x, Y3 + 4.5, NETZ.z], [KTURM.x, KTURM_TOP, KTURM.z], 3, 1.5),
  ],
  checkpoint: [{ pos: [2, Y3, -118.5], yaw: Math.PI / 2 }],
  stars: [
    { pos: [KESSEL.x, Y0 + 9.4, KESSEL.z], hidden: true, id: 'stern_markt' },        // 0: alle sechs Markt-Türen → über dem Kessel
    { pos: [HOF.x1 - 2.2, Y2 + 1.0, -93.6], hidden: true, id: 'stern_hinterhof' },     // 1: Hinterhof-Tür
    [TURM.x, Y3 + TURM.T + 1.0, TURM.z + 0.4],                                         // 2: Glockenstube (Grabstein-Schalter)
  ],
  stamp: [KTURM.x, KTURM_TOP + 1.1, KTURM.z],
  goal: { pos: [0, Y3 + 0.6, -205], height: 9 },
  marks: {
    start: [0, Y0, 11], tuer_e: [-5.4, Y0, -7.6], markt: [0, Y0, -24], kessel: [0, Y0, -39], gasse: [0, Y0, -74], hinterhof: [10, Y2, -91],
    brunnen: [2, Y3, -118.5], kirchhof: [-8, Y3, -128], turm: [TURM.x, Y3 + TURM.T, TURM.z], mauer: [0, Y3, -143], fest: [0, Y3, -170],
    netz: [NETZ.x, Y3, -196.6], goal: [0, Y3 + 0.6, -202],
  },
};
