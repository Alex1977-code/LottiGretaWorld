// Welt 5, Level 5-3 „Klon-Gewusel in den Blauglut-Gassen“, 5-A „Hörnerherde am Lila Strand“, 5-4 „Kanonenflug über die
// Goldsavanne“ und 5-Kapitän „Krümel im Kicherschlösschen“: Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik,
// Zeitlimit, Sterne, Gegnerzahlen), Routen-Bot (Lotti und Greta von Start bis Zielmast, deterministisch über
// __course.setInput/step), alle Sterne und der Stempel mit der echten Mechanik (5-3: Stampfattacke auf die rissige
// Fliese, Spiegelfrucht-Klone auf dem 3er- und 4er-Lift, Krallen-Anzug an der Kletterwand, Figurenschalter nur für
// Greta; 5-A: fünf Rammbock-Bullen in zwei Wellen; 5-4: Röhrenkanone, Glasröhren, grün leuchtender Hase, Ameisenloch →
// Warp-Box → Höhle, Stempel auf dem Rücken der Riesenameise, Sternring; 5-Kapitän: Krümel springt nicht, Türen,
// Antipp-Plattformen, Kreisgeister, Donut-Blöcke), Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w5b_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5b.mjs [5-3|5-A|5-4|5-Kapitän]
//   PARTS=load,route,targets,extra,sweep,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta ·
//   ONLY=<Text> (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist während der
// Fahrt unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Treffer-Versuche werden
// trotzdem gezählt. Alle Figuren (Spiegelfrucht-Klone) bekommen dieselbe Eingabe – wie im Spiel.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const ROUTES = {};

// =====================================================================================================================
// 5-3 Klon-Gewusel in den Blauglut-Gassen
// =====================================================================================================================
{
  const Y = 1;
  ROUTES['5-3'] = {
    start: [-8, Y, 6.6],
    meta: { stars: 3, stamp: true, time: 100, theme: 'bluelava', music: 'course_bluelava', archetype: 'parcours' },
    enemies: { feuer_schnappblume: 2, pilzling: 2, glutball: 2 },
    timeMax: 60,
    main: [
      { name: 'Südgasse', to: [-11.75, 0.4] },
      { name: 'Lavaspalt West (Glutball)', to: [-11.75, -10.4], jump: 30, jumpAt: 3.6 },
      { name: 'Westgasse', to: [-11.75, -25] },
      { name: 'Nordgasse', to: [-6, -29.6] },
      { name: 'Zielmast', to: [10.6, -30.4], within: 0.3 },
    ],
    alt: [
      { name: 'Brücke A', to: [1.6, 1.4] },
      { to: [1.6, -9.6], run: false },
      { name: 'Marktinsel', to: [1.4, -18.6], run: false },
      { name: 'Brücke B', to: [1.2, -27], run: false },
      { name: 'Zielmast', to: [10.6, -30.4], within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0: Stampfattacke auf die rissige Fliese, Stern in der Grube', star: 0, from: [-8, Y, 6.6],
        legs: [{ to: [-9.4, 4.6], within: 0.2, run: false }, { poundAt: [-11.2, 4.6] }, { expect: 'fliese' }, { wait: 20 }, { star: 0 },
          { to: [-11.2, 4.6], within: 0.3, run: false }, { to: [-11.2, 2.4], jump: 30, within: 0.4, run: false }, { expect: 'ausDerGrube' }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Stampfattacke (darüberlaufen und -springen)', star: 0, expectNot: true, from: [-8, Y, 6.6], heroes: ['lotti'],
        legs: [{ to: [-13, 4.6], run: false }, { to: [-9.4, 4.6], jump: 30, run: false }, { to: [-11.2, 4.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { expect: 'flieseHeil' }] },
      { name: 'Stern 1: zwei Spiegelfrüchte, drei Figuren auf dem 3er-Lift → Uhrturm', star: 1, from: [1.6, Y, -9.4],
        legs: [{ to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs2' }, { to: [1.4, -10.6], run: false }, { wait: 240 },
          { to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs3' },
          { to: [-2.4, -11.4], run: false, within: 0.3 }, { gather: [-1, 0.1], steps: 150, lift: 'dreier' }, { gather: [-0.25, -1], steps: 360, lift: 'dreier' }, { liftTop: 'dreier' }, { expect: 'drei' }, { gather: [0, -1], steps: 90 }, { star: 1 }], shot: 'stern1', mech: { lift: 'dreier' } },
      { name: 'Stern 1 nicht mit zwei Figuren (3er-Lift bleibt unten)', star: 1, expectNot: true, from: [1.6, Y, -9.4], heroes: ['lotti'],
        legs: [{ to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs2' }, { to: [-2.4, -11.4], run: false, within: 0.3 }, { gather: [-1, 0.1], steps: 150 }, { gather: [-0.25, -1], steps: 420 }, { expect: 'dreierUnten' }] },
      { name: 'Stern 2: vier Figuren auf dem 4er-Lift → Felsterrasse', star: 2, from: [-1.2, Y, -28.4],
        legs: [{ to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { to: [-4.0, -30.4], within: 0.15, run: false, slow: 0.6 }, { wait: 40 },
          { to: [-2.4, -28.4], run: false }, { wait: 240 }, { to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs4' },
          { to: [-7.4, -30.0], run: false, within: 0.3 }, { gather: [0.05, -1], steps: 150 }, { gather: [-1, -0.25], steps: 420, lift: 'vierer' }, { liftTop: 'vierer' }, { expect: 'vier' }, { gather: [0, -1], steps: 90 }, { star: 2 }], shot: 'stern2', mech: { lift: 'vierer' } },
      { name: 'Stern 2 mit dem Krallen-Anzug (Kletterwand neben dem 4er-Lift)', star: 2, from: [-3.4, Y, -28.4],
        legs: [{ to: [-5.2, -29.4], within: 0.12, run: false, slow: 0.5 }, { wait: 20 }, { hop: 20 }, { wait: 60 }, { to: [-5.2, -26.6], within: 0.3, run: false },
          { to: [-5.2, -28.1], within: 0.2, run: false }, { climbOnto: [-5.2, -29.4, 3.0] }, { wait: 10 }, { expect: 'krallen' },
          { to: [-11.8, -30.2], within: 0.4, run: false }, { to: [-12.6, -33.2], within: 0.3, run: false }, { push: 220, jump: 12, dir: [0, -1] }, { to: [-9, -35.8], within: 0.4, run: false }, { star: 2 }], shot: 'kletterwand' },
      { name: 'Stempel: Greta drückt den Figurenschalter, Kristallstufen zum Dach', stamp: true, from: [11.6, Y, -1.4], heroes: ['greta'],
        legs: [{ to: [11.6, -4.8], within: 0.15, run: false, slow: 0.5 }, { wait: 60 }, { expect: 'stufen' }, { to: [12.4, -5.2], within: 0.3, run: false },
          { to: [12.4, -7.2], jump: 30, within: 0.4, run: false }, { to: [12.4, -9.4], jump: 30, within: 0.4, run: false }, { to: [12.4, -11.6], jump: 30, within: 0.4, run: false },
          { to: [15.0, -11.2], jump: 30, within: 0.4, run: false }, { hop: 20 }, { wait: 20 }], shot: 'stempel' },
      { name: 'Stempel: Lotti drückt den Greta-Schalter nicht', stamp: true, expectNot: true, from: [11.6, Y, -1.4], heroes: ['lotti'],
        legs: [{ to: [11.6, -4.8], within: 0.15, run: false, slow: 0.5 }, { wait: 90 }, { expect: 'keineStufen' }] },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über dem Blauglut-Brunnen', from: [1, Y, -14], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [1.6, -15.6], jump: 24, within: 0.3, run: false }, { to: [3.2, -15.6], jump: 30, within: 0.25, run: false }, { hop: 40 }, { wait: 30 }, { chaseKind: 'powerup', filter: 'oneup', max: 900 }] },
      { name: 'Abkürzung über die Marktinsel (Brücken A und B) bis zum Ziel', routeAlt: true, heroes: ['lotti', 'greta'] },
      { name: 'Alles in einem Lauf (3 Sterne + Stempel + Ziel) unter 100 s, Heldin über das Pause-Menü auf Greta', allInOne: true, heroes: ['lotti'] },
    ],
    // alles in einem Lauf (Lotti, Heldin wechselt für den Stempel über das Pause-Menü zu Greta)
    allInOne: [
      // Heldin zuerst auf Greta (Pause-Menü „Figur“), damit der Figurenschalter drückt
      { hero: 'greta' },
      { to: [-9.4, 4.6], within: 0.2, run: false }, { poundAt: [-11.2, 4.6] }, { star: 0 }, { to: [-11.2, 4.6], within: 0.3, run: false }, { to: [-11.2, 2.4], jump: 30, within: 0.4, run: false },
      { to: [11.6, 3.0] }, { to: [11.6, -4.8], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'stufen' }, { to: [12.4, -5.2], within: 0.3, run: false },
      { to: [12.4, -7.2], jump: 30, within: 0.4, run: false }, { to: [12.4, -9.4], jump: 30, within: 0.4, run: false }, { to: [12.4, -11.6], jump: 30, within: 0.4, run: false },
      { to: [15.0, -11.2], jump: 30, within: 0.4, run: false }, { hop: 20 }, { to: [11.6, -8], run: false, within: 0.5 }, { to: [11.6, 0.4], within: 0.5 },
      { to: [1.6, 1.6] }, { to: [1.6, -9.4], run: false }, { to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [1.4, -10.6], run: false }, { wait: 230 },
      { to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { expect: 'figs3' },
      { to: [-2.4, -11.4], run: false, within: 0.3 }, { gather: [-1, 0.1], steps: 150, lift: 'dreier' }, { gather: [-0.25, -1], steps: 360, lift: 'dreier' }, { liftTop: 'dreier' },
      { gather: [0, -1], steps: 90 }, { star: 1 }, { to: [0.2, -15.6], run: false, within: 0.4 }, { to: [1.2, -18.8], run: false, within: 0.4 }, { to: [1.2, -27.4], run: false, within: 0.5 },
      { to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [-4.0, -30.4], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [-2.4, -28.4], run: false }, { wait: 200 },
      { to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [-4.0, -30.4], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { expect: 'figs4' },
      { to: [-7.4, -30.0], run: false, within: 0.3 }, { gather: [0.05, -1], steps: 150, lift: 'vierer' }, { gather: [-1, -0.25], steps: 420, lift: 'vierer' }, { liftTop: 'vierer' },
      { gather: [0, -1], steps: 90 }, { star: 2 }, { gather: [0, 1], steps: 240 }, { wait: 40 }, { to: [10.6, -30.4], within: 0.3 },
    ],
    sweepPts: [[-8, Y, 6.6], [-11.75, Y, -2], [-11.75, Y, -14], [-11.75, Y, -24], [-6, Y, -30], [4, Y, -30], [10, Y, -30], [1.6, Y, -2], [1.6, Y, -11],
      [1.2, Y, -18.6], [11.6, Y, -4], [11.6, Y, -14], [11.6, Y, -24], [-2.6, 6.5, -15.6], [-9, 8.4, -35.6], [15, 6.5, -11]],
    shots: [
      ['start', [-8, Y, 6.6]],
      ['fliese', [-10, Y, 7.4], 0, null, Math.PI * 0.9],
      ['westgasse', [-11.75, Y, -3]],
      ['lavaspalt', [-11.75, Y, -4.6], 140],
      ['bruecke_a', [1.6, Y, 2.2]],
      ['marktinsel', [1.6, Y, -9]],
      ['brunnen', [1.4, Y, -12.4]],
      ['uhrturm', [-2.6, 6.5, -15]],
      ['ostgasse', [11.6, Y, -2]],
      ['schalter', [11.6, Y, -4]],
      ['nordgasse', [-2, Y, -27.6]],
      ['vierer', [-6, Y, -29]],
      ['terrasse', [-9, 8.4, -35.4]],
      ['ziel', [7, Y, -28]],
    ],
  };
}

// =====================================================================================================================
// 5-4 Kanonenflug über die Goldsavanne
// =====================================================================================================================
{
  const S1 = 10, T2 = 10.5, T3 = 14.5, T4 = 19, Y3 = 9, LEDGE = 24, TOP = 39;
  const CAVE_BOX = [395.4, -152.6];
  const RIDE_LEFT = { x: -1, y: 0 };            // Stick nach links (Kamera blickt nach −Z): Abzweig in die Mulde
  ROUTES['5-4'] = {
    start: [0, S1, 3.6],
    meta: { stars: 3, dataStars: 1, stamp: true, time: 400, theme: 'savanna', music: 'course_savanna', archetype: 'parcours' },
    enemies: { wuschel: 8, riesenameise: 1, ameisensoldat_horn: 2 },
    timeMax: 200,
    main: [
      { name: 'Röhrenkanone 1', to: [0, -2.6], jump: 30, jumpAt: 1.4, within: 0.3, run: false, ride: true, max: 1500 },
      { name: 'Landeplatz → Rampe', to: [5, -51], run: false },
      { to: [5, -58.6], run: false },
      { to: [4, -59.6], within: 0.3, run: false },
      { name: 'Glasröhre B', to: [4, -63], ride: true, run: false },
      { to: [3, -78.4], within: 0.3, run: false },
      { name: 'Glasröhre C', to: [3, -82], ride: true, run: false },
      { name: 'Gipfel', to: [1, -98.7], within: 0.25, run: false },
      { until: 'brueckeZneu', max: 2400 },
      { name: 'Drehbrücke', to: [1, -110.8], within: 0.4 },
      { name: 'Röhrenkanone 2', to: [1, -114], jump: 30, jumpAt: 1.4, within: 0.3, run: false, ride: true, max: 1500 },
      { name: 'Dritter Berg', to: [2, -187] },
      { name: 'Glasröhre D (Hohe Wand)', to: [2, -192], ride: true, run: false },
      { name: 'Sims', to: [-5, -201.6], within: 0.4, run: false },
      { name: 'Glasröhre E', to: [-9, -201.6], ride: true, run: false },
      { name: 'Plateau', to: [0, -221.3], within: 0.25, run: false, autoJump: false },
      { name: 'Drehbalken 1', bar: 'balken1', arms: 2, L: 4.9, hub: [0, -227], to: [0, -234.6] },
      { to: [0, -241.3], within: 0.25, run: false, autoJump: false },
      { name: 'Drehbalken 2', bar: 'balken2', arms: 3, L: 4.9, hub: [0, -247], to: [0, -254.8] },
      { name: 'Zielmast', to: [0, -272], within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0: Glasröhre A, Abzweig in die Mulde (Wuschel kreist um den Stern), wieder hinauf', star: 0, from: [-4, T2, -58.6],
        legs: [{ to: [-4, -59.6], within: 0.25, run: false }, { to: [-4, -63], ride: true, run: false, rideInput: RIDE_LEFT }, { star: 0 },
          { to: [-11.8, -80.9], within: 0.4, run: false }, { to: [-5.6, -80.9], jump: 30, jumpAt: 3.4, within: 0.6 }, { expect: 'aufT3' }], shot: 'mulde' },
      { name: 'Stern 0: von der Terrasse in die Mulde springen', star: 0, from: [-5.5, T3, -76], heroes: ['greta'],
        legs: [{ to: [-11, -76], run: false }, { star: 0 }] },
      { name: 'Stern 1: grün leuchtenden Hasen fangen', star: 1, from: [6, Y3, -150],
        legs: [{ chaseKind: 'bunny', filter: 'sternhase', max: 3600 }, { wait: 30 }, { star: 1 }], shot: 'hase' },
      { name: 'Stern 2: Sternring auf Insel B, acht Sternmünzen bis aufs Zielplateau', star: 2, from: [0, TOP, -232.8],
        legs: [{ to: [0, -237.6], run: false }, { to: [-3.4, -233.4], within: 0.4 }, { to: [3.4, -233.4], within: 0.4 },
          { to: [3.4, -240.4], within: 0.4 }, { to: [-3.4, -240.4], within: 0.4 }, { to: [0, -241.3], within: 0.25, run: false, autoJump: false },
          { name: 'Drehbalken 2', bar: 'balken2', arms: 3, L: 4.9, hub: [0, -247], to: [0, -254.8] }, { chaseKind: 'sternmuenze', max: 1200 }, { wait: 20 }, { star: 2 }], shot: 'sternring' },
      { name: 'Stempel: Ameisenloch → Warp-Box → Ameisenbau, Stempel vom Rücken der Riesenameise, zurück', stamp: true, from: [-10, Y3, -176],
        legs: [{ to: [-14, -179.4], within: 0.3, run: false }, { name: 'ins Loch', to: [-14, -182], jump: 24, jumpAt: 2.2, within: 0.25, run: false, ride: true }, { expect: 'imBau' },
          { chaseKind: 'stamp', max: 2400 }, { expect: 'stempel' }, { to: [CAVE_BOX[0], CAVE_BOX[1]], jump: 24, jumpAt: 1.6, within: 0.25, run: false, ride: true }, { expect: 'zurueck' },
          { to: [-14, -177], run: false, within: 0.5 }], shot: 'bau' },
    ],
    extra: [
      { name: 'Funkelstern am Eingang der Hohen Wand, unverwundbar über den Wuschel-Sims', from: [-3, Y3, -183.5], heroes: ['lotti'],
        legs: [{ to: [-3, -186.5], within: 0.15, run: false, slow: 0.5 }, { hop: 30 }, { wait: 10 }, { chaseKind: 'powerup', filter: 'stern', max: 900 }, { expect: 'sternKraft' },
          { to: [2, -187] }, { to: [2, -192], ride: true, run: false }, { expect: 'aufSims' }, { to: [-5, -201.6], within: 0.4, run: false }, { to: [-9, -201.6], ride: true, run: false }, { expect: 'aufPlateau' }],
        expectAlive: true, invuln: false },
      { name: 'Extraleben: unsichtbarer Block am Gipfel neben der Drehbrücke', from: [-3.6, T4, -96.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-3.6, -98.2], within: 0.15, run: false, slow: 0.5 }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', filter: 'oneup', max: 900 }] },
      { name: 'Extraleben: kleinen Hasen fangen', from: [-14, Y3, -188], heroes: ['lotti'], expectLives: 1,
        legs: [{ chaseKind: 'bunny', filter: 'hase1', max: 3600 }, { wait: 30 }, { chaseKind: 'powerup', filter: 'oneup', max: 900 }] },
      { name: 'Alles in einem Lauf (3 Sterne + Stempel + Ziel) unter 400 s', allInOne: true, heroes: ['lotti'] },
    ],
    // alles in einem Lauf: Kanone → Mulde (Stern 0) → Gipfel → Kanone 2 → Hase (Stern 1) → Ameisenbau (Stempel) → Hohe
    // Wand → Sternring (Stern 2) → Ziel
    allInOne: [
      { name: 'Röhrenkanone 1', to: [0, -2.6], jump: 30, jumpAt: 1.4, within: 0.3, run: false, ride: true, max: 1500 },
      { to: [5, -51], run: false }, { to: [5, -58.6], run: false }, { to: [-4, -59.6], within: 0.25, run: false },
      { name: 'Glasröhre A → Mulde', to: [-4, -63], ride: true, run: false, rideInput: RIDE_LEFT }, { star: 0 },
      { to: [-11.8, -80.9], within: 0.4, run: false }, { to: [-5.6, -80.9], jump: 30, jumpAt: 3.4, within: 0.6 }, { expect: 'aufT3' },
      { to: [3, -78.4], within: 0.3, run: false }, { name: 'Glasröhre C', to: [3, -82], ride: true, run: false },
      { to: [1, -98.7], within: 0.25, run: false }, { until: 'brueckeZneu', max: 2400 }, { name: 'Drehbrücke', to: [1, -110.8], within: 0.4 },
      { name: 'Röhrenkanone 2', to: [1, -114], jump: 30, jumpAt: 1.4, within: 0.3, run: false, ride: true, max: 1500 },
      { to: [8, -150], within: 0.5 }, { chaseKind: 'bunny', filter: 'sternhase', max: 3600 }, { wait: 30 }, { star: 1 },
      { to: [-10, -176], within: 0.5 }, { to: [-14, -179.4], within: 0.3, run: false },
      { name: 'ins Ameisenloch', to: [-14, -182], jump: 24, jumpAt: 2.2, within: 0.25, run: false, ride: true }, { expect: 'imBau' },
      { chaseKind: 'stamp', max: 2400 }, { expect: 'stempel' }, { to: [CAVE_BOX[0], CAVE_BOX[1]], jump: 24, jumpAt: 1.6, within: 0.25, run: false, ride: true }, { expect: 'zurueck' },
      { to: [-14, -177], run: false, within: 0.5 }, { to: [2, -187] }, { name: 'Glasröhre D', to: [2, -192], ride: true, run: false },
      { to: [-5, -201.6], within: 0.4, run: false }, { name: 'Glasröhre E', to: [-9, -201.6], ride: true, run: false },
      { to: [0, -221.3], within: 0.25, run: false, autoJump: false },
      { name: 'Drehbalken 1', bar: 'balken1', arms: 2, L: 4.9, hub: [0, -227], to: [0, -234.6] },
      { to: [0, -237.6], run: false }, { to: [-3.4, -233.4], within: 0.4 }, { to: [3.4, -233.4], within: 0.4 }, { to: [3.4, -240.4], within: 0.4 }, { to: [-3.4, -240.4], within: 0.4 },
      { to: [0, -241.3], within: 0.25, run: false, autoJump: false },
      { name: 'Drehbalken 2', bar: 'balken2', arms: 3, L: 4.9, hub: [0, -247], to: [0, -254.8] }, { chaseKind: 'sternmuenze', max: 1200 }, { wait: 20 }, { star: 2 },
      { name: 'Zielmast', to: [0, -272], within: 0.3 },
    ],
    sweepPts: [[0, S1, 3.6], [0, 7, -45], [0, T2, -62], [-10, 12, -77], [2, T3, -80], [1, T4, -96], [1, T4, -114], [0, Y3, -147], [-14, Y3, -178], [14, Y3, -160],
      [0, Y3, -180], [2, Y3, -188], [-2, LEDGE, -201], [-10, TOP, -210], [0, TOP, -230], [0, TOP, -240], [0, TOP, -260], [0, TOP, -272], [404, 0, -156]],
    shots: [
      ['start', [0, S1, 3.6]],
      ['flug', [0, S1, 3.6], 0, 'cannon1'],
      ['landeplatz', [0, 7, -45]],
      ['roehren', [0, T2, -58.6]],
      ['terrasse', [0, T3, -77]],
      ['gipfel', [1, T4, -97]],
      ['checkpoint', [0, Y3, -148]],
      ['wasserloch', [10, Y3, -168]],
      ['ameisenloch', [-11, Y3, -177]],
      ['hoehle', [398, 0, -154]],
      ['wand', [2, Y3, -184]],
      ['sims', [-1, LEDGE, -200.6]],
      ['plateau', [-6, TOP, -213]],
      ['balken', [0, TOP, -220.6]],
      ['ziel', [0, TOP, -264]],
    ],
  };
}

// =====================================================================================================================
// 5-Kapitän Krümel im Kicherschlösschen (Diorama)
// =====================================================================================================================
{
  const RING = { ring: 'ring', center: [5.8, 9], r: 3 };
  const S4 = [{ to: [10.2, 9], within: 0.2 }, { ...RING, name: 'in den Ring', to: [5.9, 9] }, { star: 3 }, { ...RING, name: 'aus dem Ring', to: [10.2, 9] }];
  const S1 = [{ to: [12.75, 8.4], within: 0.25 }, { name: 'Tür Gruft-Häuschen', to: [12.75, 4.4], ride: true }, { to: [9.5, -6.5], within: 0.2 }, { tap: 'kristall' },
    { to: [4.5, -6.5], within: 0.25 }, { star: 0 }];
  const S1_BACK = [{ to: [12, -6.4], within: 0.25 }, { name: 'Tür zurück in den Garten', to: [12, -9.6], ride: true }];
  const S5 = [{ to: [10.2, 7], within: 0.3 }, { to: [10.4, 3.2], within: 0.3 }, { to: [11.5, 2.4], within: 0.3 }, { name: 'Rampe hinter den Kreisgeistern', to: [11.5, -3.2], within: 0.3 }, { to: [3.2, -5], within: 0.25 },
    { name: 'Terrassenkante → Donut-Blöcke → Säule', to: [-5, -5], within: 0.3, max: 900 }, { star: 4 }];
  const TO_HOF = [{ to: [9.6, 12.2], within: 0.3 }, { to: [5.8, 13.2], within: 0.3 }, { to: [2, 13.2], within: 0.3 }, { to: [-1.2, 10.5], within: 0.3 }, { name: 'Hang hinab', to: [-9, 10.5], within: 0.3 }, { to: [-8, 3], within: 0.3 }];
  const S2 = [{ to: [-11.5, -5.6], within: 0.2 }, { name: 'linke Tür', to: [-11.5, -9.6], ride: true }, { to: [-9.6, -6.4], within: 0.25 }, { star: 1 }];
  const S3 = [{ to: [-8.9, -6.6], within: 0.2 }, { tap: 'tipp1' }, { tap: 'tipp2' }, { to: [-0.8, -6.5], within: 0.25 }, { star: 2 }];
  ROUTES['5-Kapitän'] = {
    kind: 'diorama',
    start: [11, 0, 12],
    orbit: 24,
    meta: { stars: 5, time: 400, theme: 'ghost', music: 'course_diorama' },
    enemies: { kreisgeist_glied: 7, kreisgeist_kreis: 1, spuk: 2, spuk_tuer: 6 },
    targets: [
      { name: 'Stern 4: Weg durch den Kreisgeist-Ring (Lücke abwarten)', star: 3, legs: S4, shot: 'ring' },
      { name: 'Stern 1: Tür vom Start (Gruft-Häuschen) → rechter Balkon, Kristallplattform antippen → Erker', star: 0, legs: S1, shot: 'kristall' },
      { name: 'Stern 1 nicht ohne Antippen (Krümel fällt aus der Lücke auf die Terrasse)', star: 0, expectNot: true,
        legs: [...S1.slice(0, 3), { to: [4.5, -6.5], within: 0.25, max: 500, autoJump: false }], check: '(L) => L.player.pos.y < 5' },
      { name: 'Stern 2: Hang hinab, linke Tür im Hof → linker Balkon', star: 1, legs: [...TO_HOF, ...S2], shot: 'balkon_links' },
      { name: 'Stern 3: vom linken Balkon über die zwei Tippblöcke (antippen, fahren aus der Wand) → mittlerer Erker', star: 2, legs: [...TO_HOF, ...S2, ...S3], shot: 'tippbloecke' },
      { name: 'Stern 5: Rampe hinter den Kreisgeistern, auf die Donut-Blöcke fallen → Säule', star: 4, legs: S5, shot: 'donuts' },
    ],
    allInOne: [...S4, ...S1, ...S1_BACK, ...S5, { to: [-5, -1], within: 0.4 }, { to: [-8, 3], within: 0.3 }, ...S2, ...S3],
    extra: [
      { name: 'Donut-Block fällt, wenn Krümel darauf stehen bleibt (Krümel fällt mit in den Hof)', legs: [...S5.slice(0, 5), { to: [1.2, -5], within: 0.25 }, { wait: 6 }, { to: [0.5, -5], within: 0.12, autoJump: false }, { wait: 150 }],
        check: '(L) => L.named.get("donuts").falls > 0 && L.player.pos.y < 0 && !L.player.dead' },
      { name: 'Rechte Tür im Hof führt aufs Dach (Großspuk, Münzring), Dachtür zurück', legs: [...TO_HOF, { to: [-2, -2], within: 0.3 }, { to: [-0.5, -5.6], within: 0.2 }, { name: 'rechte Tür', to: [-0.5, -9.6], ride: true },
        { to: [3, -9], within: 0.4 }, { to: [-4, -9], within: 0.4 }, { to: [-4, -11.2], within: 0.4 }, { to: [-4, -9], within: 0.4 }, { to: [3, -9], within: 0.4 },
        { to: [5, -11.4], within: 0.25 }, { name: 'Dachtür', to: [5, -14.2], ride: true }], check: '(L) => L.player.pos.y < -2 && L.runtime.coins >= 8', shot: 'dach' },
    ],
    shots: [
      ['ueberblick', [11, 0, 12], 24, false],
      ['ueberblick_links', [11, 0, 12], -35, false],
      ['ueberblick_rechts', [11, 0, 12], 75, false],
      ['hinten', [11, 0, 12], 160, false],
      ['start', [11, 0, 12], 24, true],
      ['hof', [-9, -3, 6], 10, true],
      ['balkone', [11, 7, -6.5], 20, true],
      ['terrasse', [6, 3, -4], 30, true],
      ['dach_nah', [-2, 11, -10.5], 20, true],
    ],
  };
}

// =====================================================================================================================
// 5-A Hörnerherde am Lila Strand (Arena)
// =====================================================================================================================
{
  const Y = 2.4;
  ROUTES['5-A'] = {
    kind: 'arena',
    start: [0, Y, 7],
    meta: { time: 200, theme: 'grass', music: 'course_arena', archetype: 'arena', starSlots: 1 },
    enemies: { rammbock_bulle: 5 },
    waves: [['bulle1', 'bulle2'], ['bulle3', 'bulle4', 'bulle5']],
    cageR: 11.9,
    timeMax: 120,
    oneUp: { from: [0, Y, 5.2], under: [0, 3.4] },
    funken: { from: [-3.4, Y, 7.4], under: [-3.4, 5.4] },
    sweepPts: [[0, Y, 7], [0, Y, 0], [-7, Y, -4], [7, Y, -4], [0, Y, -9], [-9, Y, 3], [9, Y, 3]],
    shots: [
      ['start', [0, Y, 7], 30],
      ['kampf', [1, Y, 3], 0, 'charge'],
      ['welle2', null, 0, 'wave2'],
      ['stern', null, 0, 'star'],
    ],
  };
}

// =====================================================================================================================
// Ablauf
// =====================================================================================================================
const PORT = 4480;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((o) => t.name.includes(o))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,targets,extra,sweep,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const figs = () => L.players.filter((f) => !f.dead && !f.removedFigure);
  const wrapHurt = () => {
    for (const p of L.players) {
      if (p.__hurtWrapped) continue;
      p.__hurtWrapped = true;
      p.hurtTries = 0;
      const orig = p.hurt.bind(p);
      p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
    }
  };
  wrapHurt();
  const named = (id) => L.named.get(id);
  const COND = {
    krallen: () => P().power === 'krallen',
    stern: () => P().power === 'stern',
    figs2: () => figs().length >= 2,
    figs3: () => figs().length >= 3,
    figs4: () => figs().length >= 4,
    fliese: () => !!named('fliese')?.broken,
    flieseHeil: () => !named('fliese')?.broken,
    ausDerGrube: () => P().pos.y > 0.9,
    drei: () => (named('dreier')?.trips ?? 0) > 0,
    dreierUnten: () => (named('dreier')?.trips ?? 0) === 0 && (named('dreier')?.s ?? 0) < 0.01,
    vier: () => (named('vierer')?.trips ?? 0) > 0,
    stufen: () => !!named('stempelweg')?.want,
    keineStufen: () => !named('stempelweg')?.want,
    // 5-4
    brueckeZneu: (() => { let was = null; return () => { const b = named('drehbruecke'); const z = Math.abs(Math.sin(b.angle)) > 0.985; const ok = was === true && !b.turning && z; was = b.turning; return ok; }; })(),
    stempel: () => !!L.runtime.stamp,
    imBau: () => P().pos.x > 300,
    zurueck: () => P().pos.x < 100,
    aufT3: () => P().pos.y > 14,
    sternKraft: () => P().power === 'stern',
    aufSims: () => P().pos.y > 23.5 && P().pos.y < 30,
    aufPlateau: () => P().pos.y > 38.5,
  };
  const W = {
    place(pos, o = {}) {
      // Klone entfernen, Heldin setzen
      for (const f of L.players.slice()) if (f !== L.player) L.removeFigure?.(f, 'clear');
      const p = P();
      c.setInput(null);
      c.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L.runtime.status = 'play';
      L.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    drive(legs, o = {}) {
      const p0 = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, maxFigs: 1, liftTrips: {}, pounds: 0, episodes: 0, by: {} };
      const track = [];
      let lastHurt = -999;
      const tick = (inp) => {
        const p = P();
        if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5);
        const h0 = p.hurtTries ?? 0;
        c.setInput(inp); c.step(1); steps++;
        wrapHurt();
        if ((p.hurtTries ?? 0) > h0) {
          // Berührungs-Ereignis (zusammenhängende Bilder = eins): Verursacher zählen
          if (steps - lastHurt > 24) { mech.episodes++; const k = p.lastHurt ?? '?'; mech.by[k] = (mech.by[k] ?? 0) + 1; }
          lastHurt = steps;
        }
        mech.maxFigs = Math.max(mech.maxFigs, figs().length);
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 6) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (P().mode === 'script' && n++ < 2400 && !P().dead && L.runtime.status === 'play') { if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5); c.setInput(Lg_?.rideInput ?? {}); c.step(1); steps++; }
          rode = true;
          log.push(['fahrt', n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
        }
      };
      let Lg_ = null, rode = false;
      const goTo = (tx, tz, within = 0.25, max = 900) => {
        let i = 0;
        for (; i < max; i++) {
          const p = P();
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run: false });
        }
        return i < max;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        Lg_ = Lg;
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.hero) { c.setHero(Lg.hero); tick({}); log.push(['Heldin', Lg.hero]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.push) {
          const holdJ = Lg.jump ?? 0;
          for (let k = 0; k < Lg.push; k++) tick({ ...this.stick(Lg.dir[0], Lg.dir[1]), run: false, jump: k < holdJ });
          log.push([Lg.name ?? `drücken${li}`, Lg.push, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
          continue;
        }
        if (Lg.gather) {
          // alle Figuren in eine Richtung drücken (Ecke am Lift); optional aufhören, sobald der Lift fährt
          for (let k = 0; k < Lg.steps; k++) {
            if (Lg.lift && named(Lg.lift)?.state === 'up') break;
            tick({ ...this.stick(Lg.gather[0], Lg.gather[1], Lg.mag ?? 0.7), run: false });
          }
          log.push(['sammeln', figs().length, JSON.stringify(c.squad?.log?.slice(-3) ?? []), figs().map((f) => `${f.pos.x.toFixed(1)},${f.pos.y.toFixed(1)},${f.pos.z.toFixed(1)}`).join(' ')]);
          continue;
        }
        if (Lg.liftTop) {
          const lift = named(Lg.liftTop);
          let k = 0;
          for (; k < (Lg.max ?? 900) && lift.state !== 'top'; k++) tick({});
          log.push(['Lift', Lg.liftTop, lift.state, lift.count, k, +lift.s.toFixed(2)]);
          mech.liftTrips[Lg.liftTop] = lift.trips;
          if (lift.state !== 'top') log.push(['FEHLER: Lift nicht oben', Lg.liftTop]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) {
          const filter = Lg.filter ? (e) => e.spec?.power === Lg.filter || e.power === Lg.filter || e.name === Lg.filter || e.spec?.id === Lg.filter : null;
          const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter });
          log.push(['jagd', Lg.chaseKind, n, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1), P().power]);
          continue;
        }
        if (Lg.until && !Lg.to) {
          let k = 0;
          for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({});
          log.push(['bis', Lg.until, k]);
          continue;
        }
        if (Lg.climbOnto) {
          // senkrecht hochspringen, erst über der Oberkante (y) zum Ziel lenken – z. B. auf einen ?-Block
          const [cx, cz, top] = Lg.climbOnto;
          let k = 0, left = false;
          for (; k < 300; k++) {
            const q = P();
            const above = q.pos.y > top + 0.15;
            tick({ ...(q.mode === 'air' && above ? this.airSteer(cx, cz, 0, 0, 3.5, 6) : {}), jump: k < 40, run: false });
            if (P().mode === 'air') left = true;
            if (left && P().mode === 'ground') break;
          }
          log.push(['hinauf', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode]);
          continue;
        }
        if (Lg.poundAt) {
          const [tx2, tz2] = Lg.poundAt;
          let k = 0, pounding = false;
          for (; k < 300; k++) {
            const q = P();
            const dx = tx2 - q.pos.x, dz = tz2 - q.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && q.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.3 && q.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(q.mode === 'air' ? this.airSteer(tx2, tz2, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 26, run: false });
          }
          mech.pounds++;
          log.push(['stampfen auf', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state, pounding]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        if (Lg.orbit !== undefined) { c.arch?.setOrbit?.(Lg.orbit); tick({}); continue; }
        if (Lg.tap) {
          // Antippen wie im Spiel: Bildschirm-Tipp auf die Zielmitte (Strahl von der Kamera), danach kurz warten
          const h = named(Lg.tap);
          const t = L.taps?.targets.find((x) => x.owner === h);
          const sp = t ? L.taps.screenPos(t) : null;
          const before = h?.state;
          if (sp?.visible) L.taps.tapScreen(sp.x, sp.y);
          for (let k = 0; k < (Lg.wait ?? 60); k++) tick({});
          log.push(['antippen', Lg.tap, sp ? [Math.round(sp.x), Math.round(sp.y), sp.visible] : null, before, h?.state]);
          if (!h || h.state === before) log.push(['FEHLER: Antippen ohne Wirkung', Lg.tap]);
          continue;
        }
        if (Lg.ring) {
          // Kreisgeist-Ring: am Startpunkt warten, bis keine Geister die Bahn kreuzen, solange Krümel im Geister-Band ist
          const rg = named(Lg.ring), [cx, cz] = Lg.center, R0 = Lg.r, band = Lg.band ?? 0.85, half = Lg.half ?? 0.36;
          const v = Lg.speed ?? 3.5;
          const angs = () => rg.members.filter((m) => m.alive && !m.removed).map((m) => Math.atan2(m.pos.z - cz, m.pos.x - cx));
          const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
          const a0 = angs(); tick({}); const a1 = angs();
          const om = a0.length ? wrapA(a1[0] - a0[0]) * 120 : 0;
          const q0 = P();
          const d0 = Math.hypot(q0.pos.x - cx, q0.pos.z - cz);
          const [tx, tz] = Lg.to;
          const d1 = Math.hypot(tx - cx, tz - cz);
          // Weg geradlinig von der Figur zum Ziel: Zeiten im Band und Winkel dort
          const segs = [];
          const L1 = Math.hypot(tx - q0.pos.x, tz - q0.pos.z);
          for (let u = 0; u <= 1.0001; u += 0.02) {
            const x = q0.pos.x + (tx - q0.pos.x) * u, z = q0.pos.z + (tz - q0.pos.z) * u, rr = Math.hypot(x - cx, z - cz);
            if (Math.abs(rr - R0) < band) segs.push([u * L1 / v + 0.08, Math.atan2(z - cz, x - cx)]);
          }
          const safe = () => { const now = angs(); return segs.every(([t, pa]) => now.every((g) => Math.abs(wrapA(g + om * t - pa)) > half)); };
          let w = 0;
          for (; w < 2400 && !safe(); w++) tick({});
          let k = 0;
          for (; k < 900; k++) { const q = P(); const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz); if (d < (Lg.within ?? 0.3)) break; tick({ ...this.stick(dx, dz, 1) }); }
          log.push([Lg.name ?? 'Ring', 'gewartet', w, 'gelaufen', k, +om.toFixed(3), +d0.toFixed(2), +d1.toFixed(2), +P().pos.x.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.bar) {
          // Drehbalken (5-4): warten, bis ein Arm zur Figur zeigt, zur Nabe, warten, bis ein Arm zum Ziel zeigt, entlang des
          // Arms zur Spitze, Absprung zum Ziel
          const bar = named(Lg.bar), [hx, hz] = Lg.hub, L0 = Lg.L, n = Lg.arms;
          const df = (a, w) => Math.atan2(Math.sin(a - w), Math.cos(a - w));
          const best = (w) => { let b = null; for (let i = 0; i < n; i++) { const a = bar.angle + (i / n) * Math.PI * 2; if (b === null || Math.abs(df(a, w)) < Math.abs(df(b, w))) b = a; } return b; };
          const back = Math.atan2(-(P().pos.z - hz), P().pos.x - hx);   // Richtung Nabe → Figur (Winkel wie die Arme)
          const toA = Math.atan2(-(Lg.to[1] - hz), Lg.to[0] - hx);
          const out = { w1: 0, w2: 0, ride: 0, jump: 0 };
          for (; out.w1 < 2400 && (P().mode !== 'ground' || Math.abs(df(best(back), back)) > (Lg.tol ?? 0.1)); out.w1++) tick({});
          for (let k = 0; k < 400; k++) { const q = P(); const d = Math.hypot(hx - q.pos.x, hz - q.pos.z); if (d < 0.6) break; tick({ ...this.stick(hx - q.pos.x, hz - q.pos.z, Math.min(1, 0.4 + d * 0.3)), run: false }); out.ride++; }
          for (; out.w2 < 2400 && Math.abs(df(best(toA), toA)) > (Lg.tol2 ?? 0.12); out.w2++) { const q = P(); tick({ ...this.stick(hx - q.pos.x, hz - q.pos.z, 0.25), run: false }); }
          let jumped = false, air = false;
          for (let k = 0; k < 600; k++) {
            const q = P();
            if (q.dead || L.runtime.status !== 'play') break;
            const d = Math.hypot(q.pos.x - hx, q.pos.z - hz);
            if (!jumped && d > L0 - 1.0) jumped = true;
            if (jumped) {
              tick({ ...(q.mode === 'air' ? this.airSteer(Lg.to[0], Lg.to[1], 0, 0, 2.6, 8) : this.stick(Lg.to[0] - q.pos.x, Lg.to[1] - q.pos.z, 1)), jump: out.jump++ < 26, run: false });
              if (P().mode === 'air') air = true; else if (air) break;
            } else {
              const a = best(toA);
              tick({ ...this.stick(hx + Math.cos(a) * L0 - q.pos.x, hz - Math.sin(a) * L0 - q.pos.z, 1), run: false });
            }
          }
          log.push([Lg.name ?? `balken ${Lg.bar}`, JSON.stringify(out), +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode]);
          continue;
        }
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? P().pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        rode = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        for (; i < max; i++) {
          const q = P();
          if (q.dead || L.runtime.status !== 'play') break;
          const dx = tx - q.pos.x, dz = tz - q.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (q.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (q.mode === 'ground' || q.mode === 'swim')));
          if (done && i > 0) break;
          if (Lg.ride && rode) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (q.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = L.players.reduce((a, f) => a + (f.hurtTries ?? 0), 0);
      const p = P();
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track, figs: figs().length };
    },
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        for (const f of L.players) f.invuln = Math.max(f.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (P().mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /**
     * Arena-Bot (5-A): den nächsten aktiven Bullen anspringen und auf seinem Kopf weiterhüpfen (echte Eingabe: Stick,
     * Sprung), vor anstürmenden Bullen seitlich ausweichen; sind alle besiegt, den Stern holen. o.only: nur diese
     * Bullen angreifen (dann Ende, sobald sie besiegt sind); o.until: 'wave2air' | 'starTouch' | 'charge' (Bild-Halt).
     */
    fight(o = {}) {
      const log = [];
      let steps = 0, stomps = 0, jumpHold = 0, dodges = 0, wave2 = null, episodes = 0, lastHurt = -999;
      const wl = () => named('wellen');
      const hold = o.invuln !== false;
      const active = (e) => e.kind === 'rammbock_bulle' && !e.removed && e.alive && !e.defeated && !e.parked && !(wl()?.jumping ?? []).some((j) => j.e === e)
        && (!o.only || o.only.includes(e.spec?.id));
      const hp = new Map();
      const tick = (inp) => {
        if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5);
        const h0 = P().hurtTries ?? 0;
        c.setInput(inp); c.step(1); steps++;
        wrapHurt();
        if ((P().hurtTries ?? 0) > h0) { if (steps - lastHurt > 24) episodes++; lastHurt = steps; }
        if ((P().hurtTries ?? 0) > h0 && steps - lastHurt < 2 && log.filter((l) => l[0] === 'au').length < 30 && (log.at(-1)?.[0] !== 'au')) {
          const p = P();
          const near = L.entities.filter((e) => e.kind === 'rammbock_bulle' && !e.removed).map((e) => [e.spec?.id, e.state, +Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(2), +(p.pos.y - e.pos.y).toFixed(2)]).sort((a, b) => a[2] - b[2])[0];
          log.push(['au', +(steps / 120).toFixed(2), p.mode, +p.vel.y.toFixed(1), ...near]);
        }
        for (const e of L.entities) {
          if (e.kind !== 'rammbock_bulle') continue;
          const was = hp.get(e);
          if (was !== undefined && e.hp < was) { stomps++; log.push(['Treffer', e.spec?.id, e.hp, +(steps / 120).toFixed(2), P().mode]); }
          hp.set(e, e.hp);
          if (e.defeated && !e.__logged) { e.__logged = true; log.push(['besiegt', e.spec?.id, +(steps / 120).toFixed(2)]); }
        }
      };
      const stop = () => {
        if (o.until === 'wave2air') return (wl()?.jumping ?? []).some((j) => j.delay <= 0 && j.t > j.T * 0.45);
        if (o.until === 'starTouch') return !!c.arch?.info?.().starTouch;
        if (o.until === 'charge') return L.entities.some((e) => e.kind === 'rammbock_bulle' && e.state === 'charge' && e.stateT > 0.2);
        return false;
      };
      const max = o.max ?? 120 * 150;
      while (steps < max) {
        const p = P();
        if (c.finished || L.runtime.status !== 'play' || p.dead || stop()) break;
        if (wl()?.wave > 0 && wave2 === null) { wave2 = +(steps / 120).toFixed(2); log.push(['Welle 2 springt', wave2]); }
        if (p.mode === 'script' || o.idle) { tick({}); continue; }
        const ts = L.entities.filter(active);
        if (!ts.length) {
          if (o.only) break;
          const s = L.entities.find((e) => e.kind === 'star' && !e.removed);
          if (s?.touch) {
            const dx = s.pos.x - p.pos.x, dz = s.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...this.stick(dx, dz, Math.min(1, 0.3 + d)), jump: d < 1.4 && s.pos.y > p.pos.y + 0.9 });
          } else tick({});
          continue;
        }
        let b = null, bd = Infinity;
        for (const e of ts) { const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < bd) { bd = d; b = e; } }
        if (p.mode === 'air') { tick({ ...this.airSteer(b.pos.x, b.pos.z, b.vel.x, b.vel.z, 3.5, 8), jump: jumpHold-- > 0 }); continue; }
        // anstürmender Bulle auf die Figur zu? seitlich (nach innen) ausweichen
        const threat = ts.find((e) => e.state === 'charge' && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 6
          && ((p.pos.x - e.pos.x) * e.dir.x + (p.pos.z - e.pos.z) * e.dir.z) > 0);
        if (threat) {
          const side = (p.pos.x - threat.pos.x) * threat.dir.z - (p.pos.z - threat.pos.z) * threat.dir.x >= 0 ? 1 : -1;
          let sx = threat.dir.z * side, sz = -threat.dir.x * side;
          if (Math.hypot(p.pos.x + sx * 2, p.pos.z + sz * 2) > 9.5) { sx = -sx; sz = -sz; }
          dodges++;
          tick({ ...this.stick(sx, sz, 1), run: true });
          continue;
        }
        const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z;
        if (bd < 2.3) { jumpHold = 22; tick({ ...this.stick(dx, dz, 0.6), jump: true }); continue; }
        tick({ ...this.stick(dx, dz, 1), run: bd > 4 });
      }
      c.setInput({});
      const A = c.arch?.info?.() ?? {};
      return { log, steps, time: steps / 120, stomps, dodges, wave2, arena: { total: A.total, left: A.left, won: A.won, resets: A.resets, starTouch: A.starTouch },
        finished: !!c.finished, status: L.runtime.status, hurts: L.players.reduce((a, f) => a + (f.hurtTries ?? 0), 0), episodes, stars: L.runtime.info().stars, dead: P().dead,
        waveLog: wl()?.log ?? [], landed: wl()?.landed ?? 0 };
    },
    /** Bullen-Zustand (5-A): je Id Position, geparkt, berührbar, Zustand, hp. */
    bulls: () => L.entities.filter((e) => e.kind === 'rammbock_bulle' && !e.removed).map((e) => ({ id: e.spec?.id, pos: [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2)], parked: !!e.parked, touch: !!e.touch, state: e.state, hp: e.hp })),
    arena: () => { const A = c.arch?.info?.() ?? {}; return { total: A.total, left: A.left, won: A.won, resets: A.resets, starShown: A.starShown, starTouch: A.starTouch, hudLeft: A.hud?.arena?.left, wave: named('wellen')?.wave, jumping: named('wellen')?.jumping?.length ?? 0 }; },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const n = L.named.get(id); return n?.info?.() ?? (n ? JSON.parse(JSON.stringify(n, (k, v) => (typeof v === 'object' && v && (v.isVector3 || k === 'shape' || k === 'badge') ? undefined : v))) : null); },
    figs: () => figs().length,
  };
  window.__w5 = W;
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
    await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
    try {
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
    } catch {
      console.log(`Level ${id} startet nicht. Konsole:`);
      for (const x of errors) console.log('  ', x);
      return false;
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w5[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 500) {
  // Bot-Unverwundbarkeit aus (sonst blinkt die Figur und fehlt im Bild); im Handbetrieb läuft keine Simulation weiter
  await sc(() => { for (const f of window.__course.level.players) f.invuln = 0; window.__course.snapCamera(); });
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w5b_${name}.png` });
  if (process.env.DETAIL) {
    // Aufschlüsselung der Zeichenaufrufe dieses Bildes (Fehlersuche Budget)
    const rows = await sc(() => new Promise((done) => {
      const c = window.__course, view = c.view, r = view.renderer, orig = r.renderBufferDirect, acc = new Map();
      for (const e of c.level.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
      r.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) { orig.call(this, cam, scene, geo, mat, obj, grp); const k = `${scene ? '' : 'S:'}${label(obj)}`; acc.set(k, (acc.get(k) ?? 0) + 1); };
      const origR = r.render;
      r.render = function (scene, cam) { const c0 = r.info.render.calls; origR.call(this, scene, cam); acc.set(`render:${scene.name || scene.type}`, (acc.get(`render:${scene.name || scene.type}`) ?? 0) + (r.info.render.calls - c0)); };
      const f0 = view.frame;
      const wait = () => { if (view.frame < f0 + 1) { requestAnimationFrame(wait); return; } r.renderBufferDirect = orig; r.render = origR; done([...acc.entries()].sort((a, b) => b[1] - a[1])); };
      requestAnimationFrame(wait);
    }));
    console.log(`     ${name}: ${rows.map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  }
  return s;
}

/** Ergebnis eines Bot-Laufs ausgeben (bei Fehler oder VERBOSE das ganze Protokoll). */
function report(res, ok) {
  if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
}

async function parcours(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, world: d.world }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  if (PARTS.has('load')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const m = R.meta;
    check(`${id}: Welt 5, ${m.archetype}, ${m.stars} Sterne${m.stamp ? ' + Stempel' : ''}, ${m.time} s, Thema ${m.theme}, Musik ${m.music}`,
      meta.world === 5 && meta.archetype === m.archetype && meta.stars === (m.dataStars ?? m.stars) && (kinds.stamp ?? 0) === (m.stamp ? 1 : 0) && meta.timeLimit === m.time && meta.theme === m.theme && meta.music === m.music);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    const s = await sc(() => { const c = window.__course; c.step(240); return c.state(); });
    check(`${id}: 2 s ohne Fehler`, errors.length === 0 && !s.player.dead);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Gegner-Berührungen ${res.mech.episodes} ${JSON.stringify(res.mech.by)} (${res.mech.hurts} Bilder)`);
    report(res, reached);
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.timeMax} s (${res.time.toFixed(1)} s)`, reached && res.time < R.timeMax);
    if (hero === HEROES[0]) sweepTrack = res.track;
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech?.lift && !(res.mech.liftTrips[t.mech.lift] > 0)) ok = false;
      report(res, ok);
      check(`${id}: ${t.name} (${hero}, Figuren max ${res.mech.maxFigs}${t.mech?.lift ? `, Liftfahrten ${res.mech.liftTrips[t.mech.lift] ?? 0}` : ''})`, !!ok);
      if (t.shot && hero === 'lotti' || (t.shot && !t.heroes?.includes('lotti') && hero === t.heroes?.[0])) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Extras
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      if (t.routeAlt) {
        await W('place', R.start, { hero, settle: 2 });
        const res = await W('drive', R.alt, {});
        const reached = res.status === 'goal' || res.status === 'done';
        report(res, reached);
        check(`${id}: ${t.name} (${hero}, ${res.time.toFixed(1)} s)`, reached);
        continue;
      }
      if (t.allInOne) {
        await W('place', R.start, { hero, settle: 2 });
        const legs = R.allInOne ?? [];
        const res = await W('drive', legs, { invuln: true });
        const rt = res.rt;
        const reached = res.status === 'goal' || res.status === 'done';
        const ok = reached && rt.stars.every(Boolean) && rt.stamp && res.time < (await sc(() => window.__course.level.data.timeLimit));
        report(res, ok);
        check(`${id}: ${t.name} (${hero}, ${res.time.toFixed(1)} s, Sterne ${rt.stars.map((s) => (s ? 1 : 0)).join('')}, Stempel ${rt.stamp})`, ok);
        continue;
      }
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      report(res, ok);
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0})`, ok);
    }
  }

  // ------------------------------------------------ Kennzahlen entlang der Route und an festen Punkten
  if (PARTS.has('sweep') && !ONLY) {
    await load(id);
    const pts = [...(sweepTrack ?? []), ...(R.sweepPts ?? [])];
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    for (const pt of pts) {
      await W('place', pt, { settle: 6 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      if (process.env.VERBOSE) console.log(`      ${pt.map((v) => v.toFixed(1)).join(', ').padEnd(26)} ${st.calls} Aufrufe ${Math.round(st.triangles / 1000)} k`);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    check(`${id}: Messgang über ${pts.length} Punkte – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) return;
  await load(id, true);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
    await W('place', pos, { settle: 10, yaw });
    if (input === 'cannon1') {
      // Flugbild: über der Öffnung der ersten Röhrenkanone fallen lassen, bis zur Mitte des Flugs
      await sc(() => { const c = window.__course, k = c.level.named.get('kanone1'); c.player.invuln = 99; c.teleport(0, 13.8, -2.6); for (let i = 0; i < 600 && k.state !== 'fly'; i++) c.step(1); c.step(70); });
    } else if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

/** Bot-Protokoll kurz: Treffer zusammenfassen. */
function fightLog(res) {
  const out = [];
  for (const l of res.log) if (l[0] !== 'Treffer') out.push(JSON.stringify(l));
  return out.join(' ');
}

async function arena(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, starSlots: d.starSlots, world: d.world }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  const second = R.waves.slice(1).flat();
  if (PARTS.has('load')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const m = R.meta;
    check(`${id}: Welt 5, Arena, 1 Stern (erscheint nach dem Sieg), kein Stempel, ${m.time} s, Thema ${m.theme}, Musik ${m.music}`,
      meta.world === 5 && meta.archetype === 'arena' && meta.starSlots === 1 && meta.stars === 0 && !kinds.stamp && meta.timeLimit === m.time && meta.theme === m.theme && meta.music === m.music);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    const a = await W('arena');
    const b0 = await W('bulls');
    await sc(() => window.__course.step(240));
    const b1 = await W('bulls');
    const s = await sc(() => window.__course.state());
    const wait = b1.filter((b) => second.includes(b.id));
    console.log(`  wartend: ${wait.map((b) => `${b.id} ${b.pos.join(',')} ${b.parked ? 'geparkt' : 'frei'}`).join(' · ')}`);
    check(`${id}: Arena zählt ${R.enemies.rammbock_bulle} Bullen („noch ${a.hudLeft}“)`, a.total === 5 && a.left === 5 && a.hudLeft === 5);
    check(`${id}: zweite Welle wartet draußen auf den Felsen (außerhalb des Gitters, nicht berührbar, bleibt 2 s stehen)`,
      wait.length === 3 && wait.every((b) => b.parked && !b.touch && Math.hypot(b.pos[0], b.pos[2]) > R.cageR + 1)
      && wait.every((b) => { const o = b0.find((x) => x.id === b.id); return Math.hypot(o.pos[0] - b.pos[0], o.pos[2] - b.pos[2]) < 0.01; }));
    check(`${id}: 2 s ohne Fehler`, errors.length === 0 && !s.player.dead);
  }

  // ------------------------------------------------ Kampf-Bot je Heldin (alle Bullen → Stern → Sieg)
  for (const hero of !PARTS.has('route') ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('fight', {});
    const t = (bid) => res.log.find((l) => l[0] === 'besiegt' && l[1] === bid)?.[2];
    const firstDone = Math.max(...R.waves[0].map((bid) => t(bid) ?? Infinity));
    const ok = res.finished && res.stars[0] && res.arena.won;
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, ${res.stomps} Kopftreffer, ${res.dodges} Ausweichschritte, Gegner-Berührungen ${res.episodes} (${res.hurts} Bilder), Welle 2 bei ${res.wave2} s (erste Welle besiegt bei ${firstDone} s), gelandet ${res.landed}`);
    if (!ok || process.env.VERBOSE) console.log(`     ${fightLog(res)}`);
    check(`${id}: ${hero} besiegt alle fünf Bullen mit Kopfsprüngen (${res.stomps} Treffer à 1 hp)`, res.stomps >= 15 && res.arena.left === 0);
    check(`${id}: ${hero}: zweite Welle springt erst nach dem Sieg über die ersten zwei über das Gitter`, res.wave2 !== null && res.wave2 >= firstDone && res.landed === 3);
    check(`${id}: ${hero}: Stern erscheint, Einsammeln → Siegespose und Ergebnis (${res.time.toFixed(1)} s < ${R.timeMax} s)`, ok && res.time < R.timeMax);
  }

  // ------------------------------------------------ Wellen-Regeln und Tod
  if (PARTS.has('targets')) {
    await load(id);
    await W('place', R.start, { hero: 'lotti', settle: 2 });
    const r1 = await W('fight', { only: [R.waves[0][0]] });
    await sc(() => window.__course.step(600));
    const mid = await W('bulls');
    const a1 = await W('arena');
    check(`${id}: ein Bulle besiegt → die zweite Welle wartet weiter (noch ${a1.left})`, a1.left === 4 && mid.filter((b) => second.includes(b.id)).every((b) => b.parked) && a1.wave === 0);
    const r2 = await W('fight', { until: 'wave2air' });
    await sc(() => { const c = window.__course; for (let i = 0; i < 600 && c.level.named.get('wellen').jumping.length; i++) { c.player.invuln = 5; c.step(1); } });
    const landed = await W('bulls');
    const inCage = landed.filter((b) => second.includes(b.id));
    console.log(`  gelandet: ${inCage.map((b) => `${b.id} ${b.pos.join(',')} ${b.state}`).join(' · ')}`);
    check(`${id}: zweite Welle landet im Käfig (auf dem Arenaboden, berührbar)`, inCage.length === 3 && inCage.every((b) => !b.parked && b.touch && Math.hypot(b.pos[0], b.pos[2]) < R.cageR - 1 && Math.abs(b.pos[1] - R.start[1]) < 0.3));
    const d = await sc(() => {
      const c = window.__course, L = c.level;
      const lives0 = L.runtime.save.lives;
      c.player.invuln = 0;
      c.player.die('hit');
      for (let i = 0; i < 600 && (c.player.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(30);
      return { lives0, lives: L.runtime.save.lives };
    });
    const a2 = await W('arena');
    const b2 = await W('bulls');
    check(`${id}: Tod setzt Arena und Wellen zurück (noch ${a2.left}, zweite Welle wieder draußen, Leben ${d.lives0} → ${d.lives})`,
      a2.left === 5 && a2.resets === 1 && a2.wave === 0 && b2.length === 5 && b2.filter((b) => second.includes(b.id)).every((b) => b.parked && Math.hypot(b.pos[0], b.pos[2]) > R.cageR + 1) && d.lives === d.lives0 - 1);
    if (process.env.VERBOSE) console.log(`     ${fightLog(r1)} | ${fightLog(r2)}`);
    // nach dem Neustart noch einmal ganz durch
    const r3 = await W('fight', {});
    check(`${id}: nach dem Neustart wieder lösbar (${r3.time.toFixed(1)} s)`, r3.finished && r3.stars[0]);
  }

  // ------------------------------------------------ Extras: Extraleben, Funkenblüte
  if (PARTS.has('extra')) {
    await load(id);
    const lives0 = await W('lives');
    await W('place', R.oneUp.from, { hero: 'lotti', settle: 4 });
    const r = await W('drive', [{ to: R.oneUp.under, within: 0.15, run: false, slow: 0.5 }, { hop: 30 }, { wait: 20 }, { chaseKind: 'powerup', filter: 'oneup', max: 900 }], {});
    const lives1 = await W('lives');
    report(r, lives1 > lives0);
    check(`${id}: Extraleben aus dem unsichtbaren Block über dem Sternmosaik (Leben ${lives0} → ${lives1})`, lives1 === lives0 + 1);
    await load(id);
    await W('place', R.funken.from, { hero: 'lotti', settle: 4 });
    const f = await W('drive', [{ to: R.funken.under, within: 0.15, run: false, slow: 0.5 }, { hop: 30 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 }], {});
    const shotRes = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      const b = L.named.get('bulle1');
      const hp0 = b.hp;
      // aus 5 m Abstand zielen und feuern (Aktionstaste), Bulle hält still, solange er die Figur noch nicht sieht
      const out = { power: p.power, hp0 };
      for (let k = 0; k < 6 && b.hp === hp0; k++) {
        const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z;
        p.yaw = Math.atan2(-dz, dx);
        c.setInput({ action: true }); c.step(1); c.setInput({}); c.step(50);
        p.invuln = 5;
      }
      out.hp1 = b.hp;
      out.dist = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
      return out;
    });
    check(`${id}: Funkenblüte aus dem ?-Block trifft einen Bullen von weitem (${shotRes.power}, hp ${shotRes.hp0} → ${shotRes.hp1}, Abstand ${shotRes.dist.toFixed(1)} m)`, shotRes.power === 'funken' && shotRes.hp1 < shotRes.hp0 && shotRes.dist > 2.5);
    if (shotRes.power !== 'funken') report(f, false);
  }

  // ------------------------------------------------ Kennzahlen
  if (PARTS.has('sweep')) {
    await load(id);
    let worst = { calls: 0, tris: 0 };
    for (const pt of R.sweepPts) {
      await W('place', pt, { settle: 6 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      worst = { calls: Math.max(worst.calls, st.calls), tris: Math.max(worst.tris, st.triangles) };
    }
    check(`${id}: Messgang über ${R.sweepPts.length} Punkte – Zeichenaufrufe < 120 (max ${worst.calls}), Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k)`, worst.calls < 120 && worst.tris < 300000);
  }

  // ------------------------------------------------ Bilder
  if (!PARTS.has('shots')) return;
  for (const [name, pos, steps = 0, mode = null] of R.shots) {
    await load(id);
    await W('place', pos ?? R.start, { settle: 10 });
    if (steps) await sc((n) => { const c = window.__course; c.player.invuln = 99; c.step(n); }, steps);
    if (mode === 'charge') await W('fight', { until: 'charge', idle: true, max: 1200 });
    if (mode === 'wave2') await W('fight', { until: 'wave2air' });
    if (mode === 'star') {
      await W('fight', { until: 'starTouch' });
      await sc(() => { const c = window.__course; c.player.invuln = 99; c.step(20); });
    }
    await shot(`${id}_${name}`);
  }
}

async function diorama(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => {
    const c = window.__course, L = c.level, d = L.data;
    return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, world: d.world, stars: L.runtime.stars.length,
      hud: window.__game.scene.getScene('CourseUI').nStars, rig: c.rig?.info?.(), figure: d.diorama?.figure };
  });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  if (PARTS.has('load')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const m = R.meta;
    check(`${id}: Welt 5, Diorama, ${m.stars} Sterne (HUD ${meta.hud}), ${m.time} s, Thema ${m.theme}, Musik ${m.music}, Figur Krümel`,
      meta.world === 5 && meta.archetype === 'diorama' && meta.stars === m.stars && meta.hud === m.stars && meta.timeLimit === m.time && meta.theme === m.theme && meta.music === m.music && meta.figure === 'kruemel' && meta.rig?.kind === 'kruemel');
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    const nj = await sc(() => {
      const c = window.__course, p = c.player;
      c.step(20);
      const y0 = p.pos.y; let maxY = y0;
      for (let i = 0; i < 90; i++) { c.setInput({ jump: true }); c.step(1); maxY = Math.max(maxY, p.pos.y); }
      c.setInput({});
      return { dy: maxY - y0, dead: p.dead };
    });
    check(`${id}: Krümel springt nicht (Höhe ${nj.dy.toFixed(2)} m), 2 s ohne Fehler`, nj.dy < 0.02 && !nj.dead && errors.length === 0);
  }

  // ------------------------------------------------ alle Sterne einzeln (je ab Start) und alles in einem Lauf
  const runLegs = async (legs, hero, o = {}) => {
    await load(id);
    await W('place', o.from ?? R.start, { hero, settle: 4, yaw: Math.PI });
    if (o.orbit !== undefined) await sc((d) => window.__course.arch.setOrbit(d), o.orbit);
    return W('drive', legs, { invuln: o.invuln });
  };
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? ['lotti']).filter((h) => HEROES.includes(h))) {
      const res = await runLegs(t.legs, hero, t);
      const rt = res.rt;
      let ok = rt.stars[t.star];
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.check) ok = ok && (await sc(new Function(`return (${t.check})(window.__course.level);`)));
      report(res, ok);
      check(`${id}: ${t.name} (${res.time.toFixed(1)} s, Geister-Berührungen ${res.mech.episodes})`, !!ok);
      if (t.shot) await shot(`${id}_${t.shot}`);
    }
  }
  if (PARTS.has('route')) {
    const res = await runLegs(R.allInOne, 'lotti', { orbit: R.orbit });
    const fin = await sc(() => { const c = window.__course; for (let i = 0; i < 900 && !c.finished; i++) c.step(1); return { finished: c.finished, res: c.lastResult, treasure: c.player.treasure }; });
    const ok = res.rt.stars.every(Boolean) && fin.finished && fin.res?.stars?.length === 5;
    console.log(`  alles in einem Lauf: ${res.time.toFixed(1)} s, Sterne ${res.rt.stars.map((s) => (s ? 1 : 0)).join('')}, Geister-Berührungen ${res.mech.episodes} ${JSON.stringify(res.mech.by)}`);
    report(res, ok);
    check(`${id}: alle 5 Sterne in einem Lauf (${res.time.toFixed(1)} s < ${R.meta.time} s), 5. Stern → Siegesablauf und Ergebnis`, ok && res.time < R.meta.time);
  }
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    const res = await runLegs(t.legs, 'lotti', t);
    let ok = !res.log.some((l) => String(l[0]).startsWith('FEHLER'));
    if (t.check) ok = ok && (await sc(new Function(`return (${t.check})(window.__course.level);`)));
    report(res, ok);
    if (!ok) console.log('     Zustand:', JSON.stringify(await sc(() => { const L = window.__course.level; return { pos: L.player.pos.toArray().map((v) => +v.toFixed(2)), dead: L.player.dead, coins: L.runtime.coins, falls: L.named.get('donuts')?.falls }; })));
    check(`${id}: ${t.name} (Münzen ${res.rt.coins})`, !!ok);
    if (t.shot) await shot(`${id}_${t.shot}`);
  }

  // ------------------------------------------------ Kennzahlen und Bilder (Orbit-Kamera aus mehreren Richtungen)
  if (PARTS.has('sweep') || PARTS.has('shots')) {
    await load(id);
    let worst = { calls: 0, tris: 0 };
    for (const [name, pos, deg, zoom] of R.shots) {
      await W('place', pos, { settle: 6, yaw: Math.PI });
      await sc(([d, z]) => { const c = window.__course; c.arch.setOrbit(d); if (z && c.arch.orbit.zoom === 0) c.arch.orbit.toggleZoom(); if (!z && c.arch.orbit.zoom === 1) c.arch.orbit.toggleZoom(); c.step(30); }, [deg, !!zoom]);
      const st = PARTS.has('shots') ? await shot(`${id}_${name}`) : await sc(() => window.__course.stats());
      worst = { calls: Math.max(worst.calls, st.calls), tris: Math.max(worst.tris, st.triangles) };
    }
    if (PARTS.has('sweep')) check(`${id}: Messgang über ${R.shots.length} Ansichten – Zeichenaufrufe < 120 (max ${worst.calls}), Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k)`, worst.calls < 120 && worst.tris < 300000);
  }
}

for (const id of LEVELS) {
  if (ROUTES[id]?.kind === 'diorama') await diorama(id);
  else if (ROUTES[id]?.kind === 'arena') await arena(id);
  else if (ROUTES[id]) await parcours(id);
  else console.log(`Unbekanntes Level ${id}`);
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(30)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Bilder: Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Bilder: Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
