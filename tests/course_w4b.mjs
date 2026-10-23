// Welt 4: Level 4-3 „Neonsteg im Takt“ (Piep-Blöcke) und 4-4 „Trampolin-Alm“ (Trampoline, Riesentrampolin-Fahrt).
//   Laden ohne Konsolenfehler/-warnungen, Thema/Musik/Zeitlimit, Gegnerzahlen, Routen-Bot Start → Zielmast für Lotti und
//   Greta (deterministisch über __course.setInput/step; Piep-Blöcke im Takt: die Musik-Uhr läuft im Test manuell –
//   music.setManualClock(true) + music.play('course_beep'), je Simulationsschritt advanceClock(1/120) –, der Bot wartet
//   an den Reihen auf die passende Zählzeit; 4-4 mit der Riesentrampolin-Fahrt), alle Sterne und Stempel mit echter
//   Mechanik (Klon auf Druckfeld, Viererlift mit vier Figuren, Bonusraum mit Druckschalter und blauen Münzen, Springklotz
//   als Feder, Krallen-Anzug, Pilztrampoline, Kletterzaun-Raum, Stempel während der Fahrt), Extras (Laserzaun, Rundweg,
//   Fangnetz, Zeit-Uhren, 1-Up-Geheimnisse, Takt), Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, mit
//   Klonen < 150; Dreiecke < 300 k) und Bilder tests/out/w4lb_*.png aus der Spielkamera.
// Aufruf (nach npm run build): PORT_BASE=5200 node tests/course_w4b.mjs [4-3|4-4] [a|b|c|all]
//   a = Laden, Gegner, Routen-Bot Lotti + Greta · b = Sterne, Stempel, Extras · c = Bilder und Kennzahlen
//   ONLY=<Text|Text> → nur passende Ziele/Prüfungen · VERBOSE=1 → Protokolle
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Steuerungs-Gier wie im Spiel), alle Figuren bekommen
// dieselbe Eingabe (Spiegelfrucht-Klone machen alles mit). Gegner bleiben aktiv; alle Figuren sind für die Fahrt
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Takt geprüft werden.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PI = Math.PI;
const BX = 90, BZ = -232;     // 4-3 Bonusraum

// ====================================================================== 4-3
const R43 = {
  start: [0, 1, 5],
  theme: 'beep', music: 'course_beep', timeLimit: 400,
  enemies: { feuer_werfer: 7 },
  beep: true,
  main: [
    { name: 'Start', to: [0, -6.4] },
    { name: 'Taktgasse: warten auf Blau', waitBeat: [8.2, 9.2] },
    { name: 'Taktgasse', to: [0, -17.5] },
    { to: [0, -19.2], run: false, within: 0.3 },
    { name: 'Reihe 1: warten auf Rot', waitBeat: [0.2, 1] },
    { to: [0, -21], run: false, within: 0.4 },
    { name: 'Reihe 1', to: [0, -25], jump: 14, within: 0.6 },
    { to: [0, -29], jump: 14, within: 0.6 },
    { to: [0, -33], jump: 14, within: 0.6 },
    { name: 'Insel 1 (Spiegelfrucht)', to: [0, -38.5] },
    { to: [0, -43.4], run: false, within: 0.3 },
    { name: 'Reihe 2: warten auf Rot', waitBeat: [0.2, 4.6] },
    { to: [0, -48.6], run: false, within: 0.35 },
    { waitBeat: [6.6, 7.0] },
    { name: 'Reihe 2: Sprung im Wechsel', to: [0, -54], jump: 30, within: 0.7, switchJump: true },
    { name: 'Insel 2 (Spiegelfrucht)', to: [-2.5, -59.6] },
    { to: [1, -65.4], within: 0.3, run: false },
    { name: 'Reihe 3: warten auf Rot', waitBeat: [0.2, 0.8] },
    { to: [1, -67.2], run: false, within: 0.4 },
    { name: 'Reihe 3 (Schachbrett)', to: [1, -71], jump: 14, within: 0.6 },
    { to: [1, -75], jump: 14, within: 0.6 },
    { to: [1, -75.6], run: false, within: 0.3 },
    { waitBeat: [6.7, 7.1] },
    { name: 'Reihe 3: Sprung im Wechsel', to: [1, -77.4], jump: 24, within: 0.6, switchJump: true },
    { to: [1, -81], jump: 14, within: 0.6 },
    { name: 'Druckfeld-Insel', to: [1, -84], run: false },
    { figs: true },
    { name: 'Druckfelder (Heldin + Klon)', pair: [0, -88.5] },
    { wait: 60 },
    { named: 'laser' },
    { name: 'Reihe 4: warten', to: [0, -93.4], run: false, within: 0.3 },
    { name: 'Reihe 4: Laufwelle', waitBeat: [4.1, 4.6] },
    { to: [0, -98.5], run: false, within: 0.4 },
    { waitBeat: [8.1, 8.6] },
    { to: [0, -101.5], run: false, within: 0.4 },
    { waitBeat: [12.1, 12.6] },
    { to: [0, -104.5], run: false, within: 0.4 },
    { waitBeat: [0.1, 0.6] },
    { to: [0, -107.5], run: false, within: 0.4 },
    { name: 'Warp-Insel', to: [-1, -125] },
    { name: 'Warp-Box', to: [-2.5, -130.5], jump: 30, within: 0.35, run: false },
    { name: 'Turmfuß', to: [-6.6, -157.4] },
    { to: [-6.4, -159.2], run: false, within: 0.2 },
    { name: 'Lauf 1 (rot): warten', waitBeat: [0.1, 2.0] },
    { name: 'Lauf 1', to: [-5.25, -159.2], jump: 14, within: 0.4, run: false },
    { to: [-3.75, -159.2], jump: 14, within: 0.4, run: false },
    { to: [-2.25, -159.2], jump: 14, within: 0.4, run: false },
    { to: [-0.75, -159.2], jump: 14, within: 0.4, run: false },
    { name: 'Absatz 1', to: [1.5, -159.4], jump: 14, within: 0.45, run: false },
    { to: [1.5, -160.9], run: false, within: 0.2 },
    { name: 'Lauf 2 (blau): warten', waitBeat: [8.1, 10.0] },
    { name: 'Lauf 2', to: [1.5, -161.95], jump: 14, within: 0.4, run: false },
    { to: [1.5, -163.45], jump: 14, within: 0.4, run: false },
    { to: [1.5, -164.95], jump: 14, within: 0.4, run: false },
    { to: [1.5, -166.45], jump: 14, within: 0.4, run: false },
    { name: 'Absatz 2', to: [1.5, -168.8], jump: 14, within: 0.45, run: false },
    { to: [0.3, -169], run: false, within: 0.2 },
    { name: 'Lauf 3 (rot): warten', waitBeat: [0.1, 2.0] },
    { name: 'Lauf 3', to: [-0.75, -169], jump: 14, within: 0.4, run: false },
    { to: [-2.25, -169], jump: 14, within: 0.4, run: false },
    { to: [-3.75, -169], jump: 14, within: 0.4, run: false },
    { to: [-5.25, -169], jump: 14, within: 0.4, run: false },
    { name: 'Absatz 3', to: [-7.5, -169.2], jump: 14, within: 0.45, run: false },
    { to: [-7.5, -170.5], run: false, within: 0.2 },
    { name: 'Lauf 4 (rot, rot, blau, blau): warten', waitBeat: [0.1, 3.0] },
    { name: 'Lauf 4', to: [-7.5, -171.55], jump: 14, within: 0.4, run: false },
    { to: [-7.5, -173.05], jump: 14, within: 0.4, run: false },
    { waitBeat: [6.8, 7.2] },
    { name: 'Lauf 4: Sprung im Wechsel', to: [-7.5, -174.55], jump: 16, within: 0.45, run: false, switchJump: true },
    { to: [-7.5, -176.05], jump: 14, within: 0.4, run: false },
    { name: 'Checkpoint-Plateau', to: [-7.5, -178.4], jump: 14, within: 0.6, run: false },
    { name: 'Checkpoint', to: [6.5, -182.4] },
    { name: 'Abstieg', to: [6, -192.4], run: false },
    { name: 'Absatz D1', to: [6, -198.5], jump: 8, within: 0.8 },
    { to: [2, -200.6], run: false, within: 0.4 },
    { name: 'Absatz D2', to: [1, -206.5], jump: 8, within: 0.8 },
    { to: [1, -209.4], run: false, within: 0.4 },
    { name: 'Piep-Platten: warten auf Rot', waitBeat: [0.2, 1.2] },
    { name: 'Piep-Platte', to: [1, -214.5], jump: 10, within: 0.8, run: false },
    { to: [1, -215.6], run: false, within: 0.3 },
    { name: 'Absatz D4', to: [1, -220.5], jump: 24, within: 0.8 },
    { name: 'Warp-Box zum Uhrenplatz', to: [1, -224], jump: 30, within: 0.35, run: false },
    { name: 'Uhrenplatz', to: [0, -237.5] },
    { to: [0, -237.8], run: false, within: 0.3 },
    { name: 'Rutsche: warten auf Rot', waitBeat: [0.1, 1.5] },
    { name: 'Rutsche', to: [0, -244], within: 1, max: 600 },
    { name: 'Rutschenfuß', to: [0, -258] },
    { to: [0, -266.7], run: false, within: 0.3 },
    { name: 'Schlussaufstieg: warten auf Rot', waitBeat: [0.1, 2.0] },
    { name: 'Treppe G1', to: [0, -267.75], jump: 14, within: 0.4, run: false },
    { to: [0, -269.25], jump: 14, within: 0.4, run: false },
    { to: [0, -270.75], jump: 14, within: 0.4, run: false },
    { to: [0, -272.25], jump: 14, within: 0.4, run: false },
    { name: 'Absatz', to: [0, -274.4], jump: 14, within: 0.45, run: false },
    { to: [0, -276.2], run: false, within: 0.2 },
    { name: 'Treppe G2 (blau, blau, rot, rot): warten', waitBeat: [8.1, 11.0] },
    { name: 'Treppe G2', to: [0, -277.25], jump: 14, within: 0.4, run: false },
    { to: [0, -278.75], jump: 14, within: 0.4, run: false },
    { waitBeat: [14.8, 15.2] },
    { name: 'Treppe G2: Sprung im Wechsel', to: [0, -280.25], jump: 16, within: 0.45, run: false, switchJump: true },
    { to: [0, -281.75], jump: 14, within: 0.4, run: false },
    { name: 'Zielplateau', to: [0, -284.2], jump: 14, within: 0.6, run: false },
    { name: 'Zielmast', to: [0, -290.3], within: 0.2 },
  ],
  targets: [
    { name: 'Stern 1: am Bumerang-Werfer vorbei über den Steg', star: 0, from: [-6, 1, -116],
      legs: [{ to: [-11, -116], run: false, within: 0.3 }, { chase: 'feuer_werfer', filter: 'bw3', max: 1200 }, { to: [-19.6, -116], run: false, within: 0.4 }, { star: 0 }], shot: 'stern1' },
    { name: 'Stern 2: Bonusraum – Druckschalter, alle blauen Münzen', star: 1, from: [1.6, 24, -233.6],
      legs: [{ to: [3.6, -233.6], jump: 30, within: 0.3, run: false }, { crouch: 4 }, { to: [BX - 1.4, BZ + 1.4], run: false, within: 0.6 },
        { to: [BX, BZ], jump: 24, within: 0.4, run: false }, { wait: 10 },
        { to: [95.00, -232.00], within: 0.5 }, { to: [94.05, -234.94], within: 0.5, jump: 14, jumpAt: 1.6, land: false }, { to: [91.55, -236.76], within: 0.5 }, { to: [88.45, -236.76], within: 0.5, jump: 14, jumpAt: 1.6, land: false }, { to: [85.95, -234.94], within: 0.5 }, { to: [85.00, -232.00], within: 0.5, jump: 14, jumpAt: 1.6, land: false }, { to: [85.95, -229.06], within: 0.5 }, { to: [88.45, -227.24], within: 0.5, jump: 14, jumpAt: 1.6, land: false }, { to: [91.55, -227.24], within: 0.5 }, { to: [94.05, -229.06], within: 0.5, jump: 14, jumpAt: 1.6, land: false },
        { chaseKind: 'bluecoin', max: 600 }, { wait: 30 }, { star: 1 }], shot: 'stern2' },
    { name: 'Stern 3: zwei Druckfelder am Rutschenfuß (Heldin + Klon vom Klon-Automaten)', star: 2, from: [-3, 11, -258.5],
      legs: [{ to: [-4.4, -258.5], run: false, within: 0.3 }, { wait: 60 }, { figs: true }, { pair: [0, -261.5] }, { wait: 40 }, { star: 2 }], shot: 'stern3' },
    { name: 'Stempel: Viererlift mit vier Figuren (Klon-Automat dreimal)', stamp: true, from: [2.4, 31, -184.6],
      legs: [{ to: [0.6, -184.6], run: false, within: 0.25 }, { to: [2.6, -184.6], run: false, within: 0.4 }, { wait: 340 }, { to: [0.6, -184.6], run: false, within: 0.25 },
        { to: [2.6, -184.6], run: false, within: 0.4 }, { wait: 340 }, { to: [0.6, -184.6], run: false, within: 0.25 }, { to: [-1, -184.4], run: false, within: 0.4 }, { figs: true },
        { push: 260, dir: [-1, -0.7], untilUp: 'vierer' }, { figs: true }, { wait: 420 }, { to: [-4.5, -189.2], run: false, within: 0.4 }, { wait: 20 }], shot: 'stempel' },
    { name: 'Stempel: Krallen-Anzug aus dem ?-Block, Kletterwand hinauf', stamp: true, from: [9, 31, -178.2],
      legs: [{ to: [9, -180], run: false, within: 0.15 }, { hop: 20 }, { wait: 50 }, { chaseKind: 'powerup', max: 900 }, { wait: 10 },
        { to: [-0.5, -189.1], run: false, within: 0.3 }, { push: 240, jump: 12, dir: [-1, 0] }, { to: [-4.5, -189.2], run: false, within: 0.4 }, { wait: 20 }], expectPower: 'krallen' },
  ],
  extra: [
    { name: 'Laserzaun: ein Feld allein schaltet ihn nicht ab', from: [-1.1, 1, -86], heroes: ['lotti'],
      legs: [{ to: [-1.1, -88.5], run: false, within: 0.2 }, { wait: 120 }, { to: [0, -92.6], run: false, max: 300, within: 0.3 }, { wait: 60 }], expectNamed: ['laser', 'opened', false], expectZ: [-93, 0] },
    { name: 'Viererlift fährt mit drei Figuren nicht', from: [-1, 31, -184.4], clones: 2, heroes: ['lotti'],
      legs: [{ push: 260, dir: [-1, -0.7] }, { wait: 240 }], expectY: [0, 33] },
    { name: 'Rundweg rechts führt im Kreis zur Warp-Insel zurück', from: [3, 1, -115.5], heroes: ['lotti'],
      legs: [{ to: [12.6, -115.5], jump: 24, jumpAt: 4.9, within: 0.6 }, { to: [14.1, -115.5], run: false, within: 0.25 }, { waitBeat: [0.1, 1.0] },
        { to: [16.5, -115.5], jump: 14, within: 0.45, run: false }, { to: [19.5, -115.5], jump: 14, within: 0.45, run: false }, { to: [22.6, -115.5], jump: 14, within: 0.5, run: false },
        { to: [23.25, -117.2], run: false, within: 0.25 }, { waitBeat: [8.1, 9.0] },
        { to: [23.25, -119.75], jump: 14, within: 0.45, run: false }, { to: [23.25, -123], jump: 14, within: 0.45, run: false }, { to: [23.25, -126.25], jump: 14, within: 0.45, run: false },
        { to: [23.25, -129.4], jump: 14, within: 0.5, run: false }, { to: [21.8, -130.75], run: false, within: 0.25 }, { waitBeat: [0.1, 1.0] },
        { to: [19.5, -130.75], jump: 14, within: 0.45, run: false }, { to: [16.5, -130.75], jump: 14, within: 0.45, run: false }, { to: [13.2, -130.75], jump: 14, within: 0.5, run: false },
        { to: [11.4, -130.75], run: false, within: 0.25 }, { to: [5, -130.75], jump: 20, within: 0.8 }], expectX: [-8, 8], expectZ: [-134, -109], expectY: [0.9, 1.3] },
    { name: '1-Up im unsichtbaren Block auf dem Rundweg', from: [23.25, 1, -130.2], heroes: ['lotti'],
      legs: [{ to: [23.25, -130.75], run: false, within: 0.15 }, { hop: 30 }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }], expectLives: 1 },
    { name: 'Fangnetz fängt den Sturz von Lauf 3 auf', from: [-3.75, 23, -172], heroes: ['lotti'], vulnerable: true,
      legs: [{ wait: 240 }], expectY: [15, 15.6] },
    { name: 'Takt: Achterblock 0 – Reihe 1 rot fest, blau nur Umriss', from: [0, 1, -10], heroes: ['lotti'],
      legs: [{ waitBeat: [4, 4.5] }], expectNamed: ['r1_0', 'solid', true], expectNamed2: ['r1_1', 'solid', false] },
    { name: 'Takt: Achterblock 1 – Reihe 1 blau fest, rot nur Umriss', from: [0, 1, -10], heroes: ['lotti'],
      legs: [{ waitBeat: [12, 12.5] }], expectNamed: ['r1_0', 'solid', false], expectNamed2: ['r1_1', 'solid', true] },
    { name: 'Zeit-Uhren am Uhrenplatz: +10 s je Uhr', from: [4, 24, -231.4], heroes: ['lotti'],
      legs: [{ to: [6, -231.4], jump: 20, within: 0.3, run: false }, { to: [6.2, -233.6], jump: 20, within: 0.3, run: false }, { to: [6, -235.8], jump: 20, within: 0.3, run: false }], expectInfo: ['uhren', 'got', 3] },
  ],
  shots: [
    ['start', [0, 1, 5]],
    ['taktgasse', [0, 1, -6]],
    ['reihe1', [0, 1, -18.5]],
    ['insel1', [0, 1, -36]],
    ['reihe2', [0, 1, -42]],
    ['reihe3', [0, 1, -63]],
    ['druckfelder', [0, 1, -85]],
    ['reihe4', [0, 1, -92]],
    ['warpinsel', [0, 1, -118]],
    ['rundweg', [16, 1, -120]],
    ['turmfuss', [0, 1, -154]],
    ['treppe_mitte', [1.5, 16, -169]],
    ['treppe_oben', [-7.5, 23.5, -169]],
    ['checkpoint', [6, 31, -180]],
    ['viererlift', [0, 31, -184]],
    ['abstieg', [5, 25, -198]],
    ['uhrenplatz', [0, 24, -232]],
    ['rutsche', [0, 24, -238]],
    ['rutschenfuss', [0, 11, -259]],
    ['schlussaufstieg', [0, 18.5, -274.5]],
    ['ziel', [0, 26, -284.5]],
    ['bonusraum', [BX - 2, 0, BZ + 4]],
  ],
};


// ====================================================================== 4-4
const KX = -107, KZ = -161;   // Kletterzaun-Raum
const R44 = {
  start: [0, 1, 6],
  theme: 'bounce', music: 'course_bounce', timeLimit: 400,
  enemies: { krabbelkaefer: 4, flatterkaefer: 55, stachelpanzer: 5, springklotz: 9, flatterkaefer_rad: 6 },
  main: [
    { name: 'Startwiese', to: [0, -14.4] },
    { name: 'Pilztrampolin 1', to: [-1.5, -20.5], untilBounce: true, jump: 10, run: true },
    { name: 'Pilztrampolin 2', to: [1.5, -25.5], untilBounce: true },
    { name: 'Terrasse B', to: [0, -32], jump: 1, within: 0.8 },
    { to: [0, -47.6] },
    { name: 'Springklotz (Feder)', to: [0, -50.3], untilBounce: true, jump: 12, hold: true },
    { name: 'Terrasse C', to: [0, -55], jump: 1, within: 0.8 },
    { to: [0, -64.5] },
    { name: 'Treppe', to: [0, -74.6] },
    { name: 'Checkpoint', to: [3, -76.3] },
    { to: [0, -95.2], run: false },
    { name: 'Riesentrampolin', to: [0, -99.5], untilBounce: true, run: false },
    { name: 'Fahrt', ride: 'rt', until: 'done' },
    { name: 'Zielinsel', to: [0, -210], jump: 1, within: 1 },
    { name: 'Zielmast', to: [0, -223.6], within: 0.2 },
  ],
  targets: [
    { name: 'Stern 1: Wandloch – Springklotz als Feder', star: 0, from: [-8, 1, -7.6],
      legs: [{ to: [-8, -9.2], run: false, within: 0.2 }, { to: [-8, -10.8], untilBounce: true, jump: 14 }, { to: [-8, -14.6], jump: 1, within: 0.5 }, { star: 0 }], shot: 'stern1' },
    { name: 'Stern 1: Wandloch – Krallen-Anzug aus dem ?-Block', star: 0, from: [-5, 1, 2.6], expectPower: 'krallen',
      legs: [{ to: [-5, 1], run: false, within: 0.15 }, { hop: 20 }, { wait: 50 }, { chaseKind: 'powerup', max: 900 }, { wait: 10 },
        { to: [-8, -12.5], run: false, within: 0.25 }, { push: 260, jump: 10, dir: [0, -1] }, { to: [-8, -14.6], run: false, within: 0.4 }, { star: 0 }] },
    { name: 'Stern 2: hinter der Treppe über zwei Pilztrampoline', star: 1, from: [-6, 13, -78],
      legs: [{ to: [-8.5, -80], untilBounce: true, jump: 10 }, { to: [-11, -85], untilBounce: true }, { to: [-10.5, -91], jump: 1, within: 0.5 }, { star: 1 }], shot: 'stern2' },
    { name: 'Stempel: während der Fahrt zwischen zwei Flatterkäfer-Rädern (getimter Sprung)', stamp: true, from: [0, 13, -95.2],
      legs: [{ to: [0, -99.5], untilBounce: true, run: false }, { ride: 'rt', boostZ: -139.6, boostTo: [0, -144.2], untilZ: -152 }], shot: 'stempel' },
    { name: 'Stern 3: Warp-Box auf der Wolke → Kletterzaun-Raum', star: 2, from: [0, 13, -95.2],
      legs: [{ to: [0, -99.5], untilBounce: true, run: false }, { ride: 'rt', untilZ: -170.4 }, { name: 'zur Wolke', to: [-9.5, -174], jump: 1, within: 0.6, land: false, max: 300 },
        { wait: 200 }, { name: 'zum Zaun', to: [-116, -164.4], run: false, within: 0.3 },
        { name: 'Zaun 1', grab: [-116, -166] }, { climb: [-114.6, 14.6] },
        { name: 'warten auf Zaun 2', climb: [-114.6, 14.6], until: ['kz2', 'x', '<', -110.7] }, { name: 'Zaun 2', hopTo: -111.8, hold: 18 },
        { climb: [1.0, 2.6], rel: 'kz2', until: ['kz2', 'x', '>', -107.3] }, { name: 'Zaun 3', hopTo: -103.2, hold: 20 },
        { climb: [1.0, 3.0], rel: 'kz3', until: ['kz3', 'y', '>', 16.7] }, { name: 'Zaun 4', hopTo: -99.8, hold: 22, into: 0.5 },
        { climb: [-96.9, 22.4] }, { name: 'Sims', hopTo: -94.6, land: true, hold: 16, into: 0.5 }, { star: 2 }], shot: 'stern3' },
  ],
  extra: [
    { name: 'Riesentrampolin wartet, bis man draufspringt', from: [0, 13, -90], heroes: ['lotti'],
      legs: [{ wait: 240 }, { named: 'rt' }], expectNamed: ['rt', 'running', false] },
    { name: 'Stempel nicht ohne getimten Sprung (Sprungtaste nur gehalten)', from: [0, 13, -95.2], heroes: ['lotti', 'greta'], expectNoStamp: true,
      legs: [{ to: [0, -99.5], untilBounce: true, run: false }, { ride: 'rt', holdJump: true, untilZ: -152 }] },
    { name: 'Springklotz auf der Zielinsel: 1-Up im unsichtbaren Block', from: [-3.6, 10.5, -213], heroes: ['lotti'],
      legs: [{ to: [-4.4, -213], run: false, within: 0.2 }, { to: [-6, -213], untilBounce: true, jump: 14 }, { wait: 90 }, { chaseKind: 'powerup', max: 900 }], expectLives: 1 },
    { name: 'Kletterzaun-Raum: Ausgang zur Zielinsel', from: [-96, 10, -158], heroes: ['lotti'],
      legs: [{ to: [-94, -155], jump: 30, within: 0.35, run: false }, { wait: 20 }], expectZ: [-230, -206], expectY: [10, 12.5] },
  ],
  shots: [
    ['start', [0, 1, 6]],
    ['wandloch', [-6, 1, -6]],
    ['schlucht', [0, 1, -13]],
    ['terrasseB', [0, 3, -33]],
    ['federn', [0, 3, -45]],
    ['terrasseC', [0, 9, -56]],
    ['treppe', [0, 9, -63]],
    ['checkpoint', [2, 13, -78]],
    ['sims', [-9.5, 18, -84]],
    ['trampolin', [0, 13, -93]],
    ['fahrt_rad1', null, { ride: 14 }],
    ['fahrt_ring', null, { ride: 29 }],
    ['fahrt_stempel', null, { ride: 42 }],
    ['fahrt_wolke', null, { ride: 72 }],
    ['fahrt_ende', null, { ride: 96 }],
    ['zielinsel', [0, 10.5, -209]],
    ['ziel', [0, 10.5, -218]],
    ['zaunraum', [-112, 10, -158]],
    ['zaunraum_oben', [-102.5, 18, -163.6]],
  ],
};

const ROUTES = { '4-3': R43, '4-4': R44 };

const PORT = 4630;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const args = process.argv.slice(2);
const LEVELS = args[0] && args[0] !== 'all' ? [args[0]] : Object.keys(ROUTES);
const PART = args[1] ?? 'all';
const want = (p) => PART === 'all' || PART.includes(p);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((k) => t.name.includes(k))) : list);

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt (taktgenau), Klone, Zustand. */
function install() {
  const PI = Math.PI;
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const L = () => c.level;
  const P = () => c.level.player;
  const M = () => window.__audio?.music;
  const W = {
    /** Ein Simulationsschritt; die Musik-Uhr (manuell) läuft 1/120 s mit. */
    step(n = 1) { for (let i = 0; i < n; i++) { if (M()?.manualClock) M().advanceClock(1 / 120); c.step(1); } },
    /** Takt: Musik-Uhr manuell, Sync-Thema läuft (Zählzeit 0 jetzt). */
    beepMusic() { const m = M(); m.setManualClock(true); m.stop(); m.play(L().data.music); W.step(1); return L().beepClock?.info() ?? null; },
    beat: () => L().beepClock?.beat ?? 0,
    clock: () => L().beepClock?.info() ?? null,
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setInput({});
      c.squad?.clear();
      p.dropHeld?.();
      p.setHero(o.hero ?? 'lotti');
      p.dead = false; p.removedFigure = null; p.hidden = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? PI / 2);
      p.updateHalf?.();
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap?.(p);
      W.step(o.settle ?? 20);
      for (let i = 0; i < (o.clones ?? 0); i++) L().addClone(p);
      if (o.clones) W.step(40);
      c.snapCamera();
      return p.info();
    },
    figs: () => L().players.length,
    figInfo: () => L().players.map((f) => [+f.pos.x.toFixed(2), +f.pos.y.toFixed(2), +f.pos.z.toFixed(2), f.mode, !!f.clone]),
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L().controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    drive(legs, o = {}) {
      const log = [], jumps = [];
      let steps = 0, autoJumps = 0, hurt = 0;
      const hold = o.invuln !== false;
      let rode = false;
      const hist = [];
      let deadLogged = false;
      const tick = (inp) => {
        if (hold) for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
        const before = P().invuln;
        c.setInput(inp); W.step(1); steps++;
        const m = P();
        if (!hold && m.invuln > before + 0.5) hurt++;
        if (window.__dbg) log.push(['s', +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), m.mode, m.state, +m.vel.y.toFixed(1), +m.vel.z.toFixed(1), JSON.stringify(inp)]);
        if (steps % 6 === 0) { hist.push([+m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), m.mode, +W.beat().toFixed(2)]); if (hist.length > 14) hist.shift(); }
        if (m.dead && !deadLogged) { deadLogged = true; log.push(['TOD', m.deathCause, JSON.stringify(hist)]); }
        if (m.mode === 'script' && L().runtime.status === 'play' && !m.dead) {
          let n = 0;
          while (L().player.mode === 'script' && n++ < 2400 && !L().player.dead && L().runtime.status === 'play') {
            if (hold) for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
            c.setInput({}); W.step(1); steps++;
          }
          const q = L().player;
          log.push(['fahrt', n, +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const pl = P();
        if (pl.dead || L().runtime.status !== 'play') break;
        rode = false;
        if (Lg.wait) { for (let i = 0; i < Lg.wait; i++) tick(Lg.hold ?? {}); continue; }
        if (Lg.waitBeat) {
          const mod = Lg.mod ?? 16, [lo, hi] = Lg.waitBeat;
          let k = 0;
          const inWin = () => { const b = ((W.beat() % mod) + mod) % mod; return b >= lo && b < hi; };
          while (!inWin() && k++ < 120 * 30) tick({});
          log.push([Lg.name ?? 'takt', k, +W.beat().toFixed(2), +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.figs) { log.push(['figuren', L().players.length, JSON.stringify(W.figInfo())]); continue; }
        const airTo = (m, tx, tz, k = 2.6, vmax = 11) => {
          let vx = (tx - m.pos.x) * k, vz = (tz - m.pos.z) * k;
          const vl = Math.hypot(vx, vz);
          if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
          const ex = vx - m.vel.x, ez = vz - m.vel.z, el = Math.hypot(ex, ez);
          return el > 0.05 ? W.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
        };
        if (Lg.untilBounce) {
          // zu (x, z) – am Boden laufen/abspringen, in der Luft lenken – bis die Figur von einer Feder abprallt
          let k = 0, prev = P().vel.y, bounced = false;
          for (; k < (Lg.max ?? 600); k++) {
            const m = P();
            if (m.dead || L().runtime.status !== 'play') break;
            const dx = Lg.to[0] - m.pos.x, dz = Lg.to[1] - m.pos.z, d = Math.hypot(dx, dz);
            const st = m.mode === 'air' ? airTo(m, Lg.to[0], Lg.to[1]) : (d > 0.05 ? W.stick(dx, dz, Math.min(1, Math.max(0.3, d))) : { x: 0, y: 0 });
            tick({ ...st, run: Lg.run ?? false, jump: k < (Lg.jump ?? 0) || (!!Lg.hold && m.mode === 'air') });
            const vy = P().vel.y;
            if (vy > 8 && prev <= 1 && k > 1) { bounced = true; break; }
            prev = vy;
          }
          log.push([Lg.name ?? `feder${li}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), +P().vel.y.toFixed(1)]);
          if (!bounced) { log.push(['FEHLER: kein Abprall', li]); break; }
          continue;
        }
        if (Lg.ride) {
          // auf dem Riesentrampolin mitfahren: über der Matte halten; boostZ: getimter Sprung (Taste kurz vor der
          // Landung), danach zum Punkt boostTo lenken; untilZ / until 'done': Ende
          const rt = L().named.get(Lg.ride);
          let k = 0, boosted = 0, phase = 'ride', jumpSteps = 0, apexY = -1e9;
          for (; k < (Lg.max ?? 120 * 60); k++) {
            const m = P();
            if (m.dead || L().runtime.status !== 'play') break;
            if (Lg.untilZ !== undefined && rt.pos.z <= Lg.untilZ) break;
            if (Lg.untilS !== undefined && rt.s >= Lg.untilS) break;
            if (Lg.until === 'done' && rt.done && m.mode === 'air' && m.vel.y > 0) break;
            const mat = rt.pos.y + 0.9;
            let tx = rt.pos.x, tz = rt.pos.z;
            if (phase === 'stamp') { tx = Lg.boostTo[0]; tz = Lg.boostTo[1]; apexY = Math.max(apexY, m.pos.y); if (m.vel.y < -2) phase = 'ride'; }
            if (Lg.boostZ !== undefined && !boosted && rt.pos.z <= Lg.boostZ && m.mode === 'air' && m.vel.y < 0 && m.pos.y - mat < 0.9) { boosted = 1; jumpSteps = 6; }
            const st = m.mode === 'air' ? airTo(m, tx, tz, phase === 'stamp' ? 2.2 : 3) : W.stick(tx - m.pos.x, tz - m.pos.z, 0.5);
            const jump = jumpSteps > 0 || !!Lg.holdJump;
            if (jumpSteps > 0) { jumpSteps--; if (jumpSteps === 0) phase = 'stamp'; }
            if (Lg.holdJump) apexY = Math.max(apexY, m.pos.y);
            tick({ ...st, run: false, jump });
          }
          log.push([Lg.name ?? `fahrt${li}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), JSON.stringify(rt.info()), boosted || Lg.holdJump ? +apexY.toFixed(2) : '']);
          continue;
        }
        if (Lg.grab) {
          // an einen Zaun springen (in der Luft zum Zaun drücken), bis die Figur am Zaun hängt
          let k = 0;
          for (; k < (Lg.max ?? 300); k++) {
            const m = P();
            if (m.dead) break;
            if (k > 4 && m.mode === 'wall') break;
            const dx = Lg.grab[0] - m.pos.x;
            tick({ x: Math.max(-1, Math.min(1, dx * 2)), y: 1, jump: k < (Lg.hold ?? 24) });
          }
          log.push([Lg.name ?? `greifen${li}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().fence?.obj?.spec?.id ?? null]);
          if (P().mode !== 'wall') { log.push(['FEHLER: Zaun nicht gegriffen', li]); break; }
          continue;
        }
        if (Lg.climb) {
          // am Zaun klettern: relativ zur Zaunmitte (rel) oder absolut, bis am Ziel (oder until-Bedingung)
          let k = 0;
          const f = Lg.rel ? L().named.get(Lg.rel) : null;
          for (; k < (Lg.max ?? 900); k++) {
            const m = P();
            if (m.dead || m.mode !== 'wall') break;
            const tx = (f ? f.pos.x : 0) + Lg.climb[0], ty = (f ? f.pos.y : 0) + Lg.climb[1];
            const dx = tx - m.pos.x, dy = ty - m.pos.y;
            const there = Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2;
            if (Lg.until) { const e = L().named.get(Lg.until[0]); const v = e.pos[Lg.until[1]]; if ((Lg.until[2] === '<' ? v < Lg.until[3] : v > Lg.until[3]) && there) break; }
            else if (there) break;
            tick({ x: Math.max(-1, Math.min(1, dx * 3)), y: Math.max(-1, Math.min(1, dy * 3)) });
          }
          log.push([Lg.name ?? `klettern${li}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().fence?.obj?.spec?.id ?? null]);
          if (P().mode !== 'wall') { log.push(['FEHLER: vom Zaun gefallen', li]); break; }
          continue;
        }
        if (Lg.hopTo !== undefined) {
          // vom Zaun abspringen (seitlich zu x) und wieder greifen (Stick zum Zaun) bzw. landen (land: true)
          let k = 0;
          for (; k < (Lg.max ?? 240); k++) {
            const m = P();
            if (m.dead) break;
            if (k > 4 && !Lg.land && m.mode === 'wall') break;
            if (k > 4 && m.mode === 'ground') break;
            tick({ x: Math.max(-1, Math.min(1, (Lg.hopTo - m.pos.x) * 2)), y: Lg.into ?? 1, jump: k < (Lg.hold ?? 30) });
          }
          log.push([Lg.name ?? `hüpfen${li}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().fence?.obj?.spec?.id ?? null]);
          if (!Lg.land && P().mode !== 'wall') { log.push(['FEHLER: Zaun verfehlt', li]); break; }
          continue;
        }
        if (Lg.named) { const e = L().named.get(Lg.named); log.push(['benannt', Lg.named, JSON.stringify(e?.info?.() ?? null)]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1)]); continue; }
        if (Lg.hop) { for (let k = 0; k < Lg.hop; k++) tick({ jump: true }); for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({}); continue; }
        if (Lg.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && P().mode !== 'ground'; k++) tick({ crouch: true });
          for (let k = 0; k < 20; k++) tick({});
          continue;
        }
        if (Lg.chase) { const n = W.chase(Lg.chase, { max: Lg.max ?? 2400, id: Lg.filter }); log.push([Lg.name ?? 'jagen', Lg.chase, n, +P().pos.x.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = W.chase(Lg.chaseKind, { max: Lg.max ?? 2400, jump: Lg.noJump ? false : undefined }); log.push(['jagd', Lg.chaseKind, n, +P().pos.x.toFixed(1), +P().pos.z.toFixed(1)]); continue; }
        if (Lg.star !== undefined) {
          const n = W.chase('star', { filter: (e) => e.index === Lg.star && !e.hidden, max: 900 });
          log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.pair) {
          // Mitte aus Haupt-Figur und erstem Klon auf den Punkt lenken (langsam, ohne Rennen)
          let i = 0;
          for (; i < 900; i++) {
            const m = P(), k = L().players.find((f) => f !== m);
            if (!k) break;
            const cx = (m.pos.x + k.pos.x) / 2, cz = (m.pos.z + k.pos.z) / 2;
            const dx = Lg.pair[0] - cx, dz = Lg.pair[1] - cz, d = Math.hypot(dx, dz);
            if (d < 0.08) break;
            tick({ ...W.stick(dx, dz, Math.max(0.25, Math.min(0.7, d))), run: false });
          }
          for (let k2 = 0; k2 < 20; k2++) tick({});
          log.push(['paar', i, JSON.stringify(W.figInfo())]);
          continue;
        }
        if (Lg.push) {
          const holdJ = Lg.jump ?? 0;
          for (let k = 0; k < Lg.push; k++) {
            if (Lg.untilUp && ['up', 'top'].includes(L().named.get(Lg.untilUp)?.state)) break;
            const d = Lg.dir ? W.stick(Lg.dir[0], Lg.dir[1]) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([Lg.name ?? `push${li}`, Lg.push, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, L().players.length, L().named.get(Lg.untilUp ?? '')?.state ?? '']);
          continue;
        }
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        // Sprung im Wechsel: das Ziel erscheint erst während des Sprungs (Piep-Block noch Umriss) – Landepunkt nicht prüfbar
        if (holdJ && Lg.to && !Lg.switchJump) jumps.push([Lg.name ?? `leg${li}`, W.landingVisible(Lg.to[0], Lg.to[1])]);
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        for (; i < max; i++) {
          const m = P();
          if (m.dead || L().runtime.status !== 'play') break;
          if (rode) break;
          const T = Lg.to;
          const dx = T[0] - m.pos.x, dz = T[1] - m.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (m.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && m.mode === 'ground'));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (m.mode === 'air' && holdJ && j0 !== null) {
            const k = 2.6, vmax = Lg.vmax ?? 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - m.vel.x, ez = vz - m.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? W.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? W.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? i - j0 < holdJ : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump, ...(Lg.hold ?? {}) });
          if (m.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        const m = P();
        log.push([Lg.name ?? `leg${li}`, i, +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), m.mode, L().players.length, +W.beat().toFixed(2)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      const m = P();
      return { log, jumps, autoJumps, steps, hurt, time: steps / 120, pos: [m.pos.x, m.pos.y, m.pos.z], dead: m.dead, status: L().runtime.status, info: m.info(), rt: L().runtime.info(), figs: L().players.length, power: m.power };
    },
    /** Ist der Landepunkt (x, z) aus der Spielkamera sichtbar? (wie course_w1a) */
    landingVisible(x, z) {
      const p = P(), rig = c.view.rig;
      const r = rig.railAt(p.pos.x, p.pos.z, {});
      const D = PI / 180, yaw = r.yaw * D, pitch = r.pitch * D;
      const tx = p.pos.x - Math.sin(yaw) * r.ahead, ty = p.pos.y + r.height, tz = p.pos.z - Math.cos(yaw) * r.ahead;
      const cam = { x: tx + Math.sin(yaw) * Math.cos(pitch) * r.dist, y: ty + Math.sin(pitch) * r.dist, z: tz + Math.cos(yaw) * Math.cos(pitch) * r.dist };
      const g = c.world.raycastDown(x, p.pos.y + 14, z, 40);
      const land = { x, y: (g ? g.y : p.pos.y) + 1.0, z };
      const hit = c.world.raycast(cam, land);
      return !hit || hit.t > 0.97;
    },
    /** Auf Entitäten einer Art zulaufen (springen, wenn nah), bis keine passende mehr da ist. */
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.id || x.spec?.id === o.id) && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
        if (p.dead || L().runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L().entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best && d < (o.radius ?? 40)) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = W.stick(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 2.4 && dy > -0.5) || (dy > 0.8 && (n % 48) < 30);
        for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
        c.setInput({ ...st, run: dist > 1.5, jump });
        W.step(1);
        if (p.mode === 'script') { let k = 0; while (L().player.mode === 'script' && k++ < 1200) { c.setInput({}); W.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Riesentrampolin neu starten und mitfahren, bis s ≥ s0 (für Bilder). */
    rideTo(s0) {
      const rt = L().named.get('rt');
      rt.reset();
      W.place([rt.pos.x, rt.pos.y + 3, rt.pos.z], { settle: 1 });
      return W.drive([{ ride: 'rt', untilS: s0 }]);
    },
    rt: () => L().runtime.info(),
    info: () => P().info(),
    named: (id) => { const e = L().named.get(id); return e ? { kind: e.kind, alive: e.alive, defeated: !!e.defeated, state: e.state, opened: e.opened, got: e.got, info: e.info?.() ?? null } : null; },
    kinds: () => { const m = {}; for (const e of L().entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L().runtime.save.lives,
  };
  window.__w4 = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id, fresh = false) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !fresh) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
        break;
      } catch {
        if (attempt === 1) {
          console.log(`Level ${id} startet nicht. Konsole:`);
          for (const x of errors) console.log('  ', x);
          return false;
        }
      }
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  if (process.env.DBG) await sc(() => { window.__dbg = true; });
  if (ROUTES[id].beep) await W('beepMusic');
  return true;
}

const W = (name, ...a) => sc(([n, aa]) => window.__w4[n](...aa), [name, a]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => { const c = window.__course; for (const f of c.level.players) f.invuln = 0; window.__w4.step(1); });
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  const figs = await sc(() => window.__course.level.players.length);
  stats.push([name, s.calls, s.triangles, figs]);
  await page.screenshot({ path: `${OUT}w4lb_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  if (want('a')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: Thema ${R.theme}, Musik ${R.music}, ${R.timeLimit} s`, meta.theme === R.theme && meta.music === R.music && meta.timeLimit === R.timeLimit);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    if (R.beep) {
      const ck = await W('clock');
      check(`${id}: Taktuhr folgt der Musik (${JSON.stringify(ck)})`, ck?.source === 'music' && ck?.bpm === 128 && ck?.every === 8 && ck?.warn === 3);
    }
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of want('a') && !ONLY ? (process.env.HERO ? [process.env.HERO] : ['lotti', 'greta']) : []) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Figuren ${res.figs}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
    }
    const lim = Math.min(180, R.timeLimit * 0.6);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${lim} s (${res.time.toFixed(1)} s)`, reached && res.time < lim);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of want('b') ? pick(R.targets) : []) {
    for (const hero of t.heroes ?? ['lotti']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, clones: t.clones, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectPower) { const pw = await sc(() => window.__course.level.player.power); res.log.push(['power', pw]); ok = ok && (pw === t.expectPower || res.power === t.expectPower); }
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot && ok) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of want('b') ? pick(R.extra ?? []) : []) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      const time0 = (await W('rt')).time;
      await W('place', t.from, { hero, power: t.power, clones: t.clones, settle: 10 });
      const res = await W('drive', t.legs, { invuln: t.vulnerable ? false : undefined });
      const inR = (v, r) => (r === undefined ? true : Array.isArray(r) ? v >= r[0] && v <= r[1] : v >= r);
      const lives1 = await W('lives');
      let ok = inR(res.info.x, t.expectX) && inR(res.info.y, t.expectY) && inR(res.info.z, t.expectZ) && !res.dead;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectNoStamp) ok = ok && !res.rt.stamp;
      if (t.expectNamed) { const v = await sc(([nid, k]) => window.__course.level.named.get(nid)?.[k], [t.expectNamed[0], t.expectNamed[1]]); res.log.push(['benannt', ...t.expectNamed, v]); ok = ok && v === t.expectNamed[2]; }
      if (t.expectNamed2) { const v = await sc(([nid, k]) => window.__course.level.named.get(nid)?.[k], [t.expectNamed2[0], t.expectNamed2[1]]); res.log.push(['benannt', ...t.expectNamed2, v]); ok = ok && v === t.expectNamed2[2]; }
      if (t.expectInfo) { const v = await sc(([nid, k]) => window.__course.level.named.get(nid)?.[k] ?? window.__course.level.named.get(nid)?.info?.()?.[k], [t.expectInfo[0], t.expectInfo[1]]); res.log.push(['info', ...t.expectInfo, v]); ok = ok && v >= t.expectInfo[2]; }
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, bei ${res.info.x.toFixed(1)}, ${res.info.y.toFixed(1)}, ${res.info.z.toFixed(1)}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}, Zeit ${(res.rt.time - time0).toFixed(1)} s)`, ok);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (!want('c') || ONLY) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, o = {}] of R.shots) {
    if (o.ride !== undefined) await W('rideTo', o.ride);
    else await W('place', pos, { settle: o.settle ?? 10, clones: o.clones });
    await shot(`${id}_${name}`);
  }
}

if (stats.length) {
  console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke, Figuren):');
  for (const [n, c, t, f] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  ${f} Fig.`);
  const one = stats.filter((s) => s[3] <= 1), many = stats.filter((s) => s[3] > 1);
  const maxCalls = Math.max(0, ...one.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 mit einer Figur (max ${maxCalls})`, maxCalls < 120);
  if (many.length) { const m2 = Math.max(...many.map((s) => s[1])); check(`Zeichenaufrufe < 150 mit Klonen (max ${m2})`, m2 < 150); }
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
