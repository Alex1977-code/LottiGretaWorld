// Welt 7, Level 7-3 „Pfeilflitzer über dem Glutstrom“ (Sprint 100 s: 56 Boost-Pfeile, Donut-Blöcke, Stachelwalzen,
// Glasröhren, Sternring, Grube mit Röhre ins Pilzling-Versteck, Dreifach-Gabelung), 7-4 „Schubser-Rummel im Blauglutkessel“
// (blaue Lava: auftauchende Pfeilplattformen, Zylinder, rotierende Stachelwalzen, Pendelstacheln, Schubser, Knochenflieger,
// Kippplattform) und Arena 7-B „Blaufeuer-Prinz im Glutzwinger“ (blauer Schubser-Prinz mit blauen Feuerbällen, 300 s):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegner- und Bausteinzahlen), Routen-Bot
// (Lotti und Greta von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf
// der Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Geheimnisse und Extraleben, Kennzahlen
// entlang der Route und je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/w7b_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w7b.mjs [7-3|7-4|7-B]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · TRACE=1 (Spur) · SHOTS=<Name|Name> (nur
//   diese Bilder) · DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt – die
// Routen kommen ohne einen aus (Walzen übersprungen bzw. umlaufen, Pendel und Plattformen abgewartet). Gegenproben laufen
// verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } · { expect } ·
// { until } · { pipe: [x, z], stick } (in eine Glasröhren-Öffnung laufen) · { warp: [x, z] } (Warp-/Rätselbox) ·
// { push: Id, dir } (Schubser in Richtung dir in die Lava stoßen) · { stompAll } · { fight: Id } (Schubser-Prinz) ·
// { kill } · { arrowUp: Id } (warten, bis die Pfeilplattform oben ist und bleibt) · { onPlat: Id, to } (auf eine
// fahrende/kippende Fläche springen)
const VX = 140;
const Y0 = 2, Y1 = 5, Y2 = 8, YZ = 11;        // 7-3
const B4 = 1.5, FX4 = 60, RX4 = 100;          // 7-4
const ROUTES = {
  '7-3': {
    start: [0, Y0, 7],
    meta: { stars: 3, time: 100, theme: 'lavarun', music: 'course_redhot', archetype: 'parcours' },
    enemies: { pilzling: 24 },
    blocks: { pfeile: 56, walzen: 13 },
    main: [
      { name: 'Start-Pfeile', to: [0, -28.9], within: 0.9 },
      { name: 'Lücke 1 (Boost-Sprung)', to: [0, -40], jump: 30, within: 1.2 },
      { to: [0, -51], within: 0.9 },
      { name: 'Donut-Brücke', to: [0, -66.5], within: 0.9 },
      { name: 'Walzen-Slalom', to: [1.6, -76.5], within: 0.8 },
      { to: [2.25, -83.6], within: 0.7 },
      { to: [-2.25, -86.6], within: 0.7 },
      { to: [-2.25, -94], within: 0.7 },
      { name: 'über Walze 3', to: [0, -108.4], jumpZ: -97.2, jump: 30, within: 0.9 },
      { name: 'Glasröhre 1', pipe: [0, -111.5], run: true },
      { expect: 'onP1' },
      { name: 'Mittelweg', to: [0, -159.5], within: 0.8 },
      { name: 'Lücke Mitte', to: [0, -172], jump: 30, within: 1.2 },
      { name: 'Checkpoint 1', to: [0, -183.2], within: 0.6 },
      { name: 'Pfeil-Damm', to: [0, -243.5], within: 0.9 },
      { to: [0, -284.6], within: 0.9 },
      { name: 'Donut-Brücke 2', to: [0, -295], within: 0.9 },
      { to: [0, -311.5], within: 0.8 },
      { name: 'Walzen-Slalom 2', to: [2.25, -316], within: 0.8 },
      { to: [2.25, -323.6], within: 0.7 },
      { to: [-2.25, -326.6], within: 0.7 },
      { name: 'Glasröhre 2 (Pfeil lenkt hinein)', pipe: [-1.2, -335.5], run: true },
      { expect: 'onP4' },
      { name: 'rechter Weg (Donuts)', to: [8.5, -362.5], within: 1.6 },
      { to: [8.5, -395], within: 0.9 },
      { name: 'Checkpoint 2', to: [0, -400.5], within: 0.7 },
      { name: 'Mittelweg der Gabelung', to: [0, -420.6], within: 0.9 },
      { name: 'Lücke', to: [0, -431], jump: 30, within: 1.2 },
      { name: 'Ziel-Röhre Mitte', pipe: [0, -447.5], run: true },
      { expect: 'onGoalPlat' },
      { name: 'Zielmast', to: [0, -476], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Boost-Pfeile genutzt (≥ 25), drei Glasröhren-Fahrten', ok: (r) => r.mech.boosts >= 25 && r.mech.pipes === 3 },
      { name: 'ohne einen Treffer-Versuch (Walzen umlaufen bzw. übersprungen)', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: rechter Weg am Ende von Rasstrecke 1 – über zwei Stachelwalzen', star: 0, from: [7, Y1, -144],
        legs: [{ to: [7, -152.2], within: 0.4, run: false }, { to: [7, -158.6], jump: 30, run: false, within: 0.8 }, { to: [7, -161.3], within: 0.4, run: false },
          { to: [7, -167.8], jump: 30, run: false, within: 0.8 }, { star: 0 }, { to: [0, -183], within: 0.8 }], shot: 'stern0' },
      { name: 'Stern 0 nicht auf dem Mittelweg', star: 0, expectNot: true, from: [0, Y1, -144], heroes: ['lotti'],
        legs: [{ to: [0, -159.5], within: 0.8 }, { to: [0, -172], jump: 30, within: 1.2 }, { to: [0, -183], within: 0.8 }] },
      { name: 'Stern 1: Sternring – acht Sternmünzen in 10 s, Stern über der Grube', star: 1, from: [0, Y1, -184],
        legs: [{ to: [0, -241.6], within: 1.0 }, { until: 'stern1Visible', max: 300 }, { star: 1 }, { expect: 'inPit' }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Sternring (über die Grube springen)', star: 1, expectNot: true, from: [0, Y1, -246], heroes: ['lotti'],
        legs: [{ to: [4.5, -252.5], jump: 30, within: 0.6, run: false }, { wait: 60 }] },
      { name: 'Stern 2: Mittelweg der zweiten Gabelung durch drei Stachelwalzen', star: 2, from: [0, Y2, -361],
        legs: [{ to: [0, -368.6], within: 0.4, run: false }, { to: [0, -374.8], jump: 30, run: false, within: 0.8 }, { to: [0, -377.6], within: 0.4, run: false },
          { to: [0, -383.8], jump: 30, run: false, within: 0.8 }, { to: [0, -386.6], within: 0.4, run: false }, { to: [0, -392.6], jump: 30, run: false, within: 0.8 },
          { star: 2 }], shot: 'stern2', mech: (r) => r.mech.hurts === 0, mechText: (r) => `Treffer-Versuche ${r.mech.hurts}` },
      { name: 'Stern 2 nicht auf dem linken Weg', star: 2, expectNot: true, from: [-8.5, Y2, -361], heroes: ['lotti'],
        legs: [{ to: [-8.5, -377.4], within: 0.8 }, { to: [-8.5, -388], jump: 30, within: 1.2 }, { to: [-8.5, -395], within: 0.8 }] },
      { name: 'Stempel: linker Abzweig nach Stern 1, über die Lücke, Sprung zurück auf den Hauptweg', stamp: true, from: [-7.5, Y1, -258],
        legs: [{ to: [-7.5, -273.2], within: 0.6 }, { to: [-8, -283.5], jump: 30, within: 0.8 }, { expect: 'onStampIsland' }, { to: [-6.6, -284], within: 0.5, run: false },
          { to: [0, -283.5], jump: 30, within: 0.9 }], shot: 'stempel' },
      { name: 'Stempel nicht vom Hauptweg aus', stamp: true, expectNot: true, from: [0, Y1, -262], heroes: ['lotti'],
        legs: [{ to: [0, -284.6], within: 0.9 }, { to: [0, -295], within: 0.9 }] },
    ],
    extra: [
      { name: 'Geheimnis: Grube → Röhre ins Pilzling-Versteck, Funkelstern, Pilzlinge, Röhre zurück', from: [4.5, Y1 - 2.5, -250.6], heroes: ['lotti'], expectCoins: 10,
        legs: [{ to: [4.5, -252.5], jump: 20, within: 0.3, run: false }, { crouch: 20 }, { expect: 'inVersteck' }, { to: [VX - 6, -259], within: 0.3, run: false }, { hop: 24 },
          { chaseKind: 'powerup', max: 900 }, { expect: 'funkelstern' }, { chaseKind: 'pilzling', max: 1200 },
          { to: [VX + 10, -242.5], jump: 20, within: 0.3, run: false }, { crouch: 20 }, { expect: 'backOnP3' }],
        mech: (r) => r.mech.defeated >= 5, mechText: (r) => `Pilzlinge besiegt ${r.mech.defeated}` },
      { name: 'Extraleben: unsichtbarer Block auf dem Gabelungsplateau', from: [6.5, Y1, -138], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6.5, -140], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block im Pilzling-Versteck', from: [VX + 10, Y1, -256], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [VX + 10, -258], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Donut-Blöcke fallen unter einer stehenden Figur (Lava)', from: [0.5, Y0, -51.4], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0.5, -55.5], within: 0.2, run: false }, { wait: 400 }], mech: (r) => r.dead && r.cause === 'lava', mechText: (r) => `tot: ${r.dead} (${r.cause})` },
      { name: 'Zeitlimit 100 s: danach ist die Zeit um', from: [0, Y0, 7], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ wait: 101 * 120 }], mech: (r) => r.cause === 'time', mechText: (r) => `${r.cause}` },
      { name: 'Stachelwalze verletzt (nicht gesprungen)', from: [0, Y0, -95], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -103], within: 0.6, run: false, autoJump: false, max: 240, partial: true }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts}` },
    ],
    shots: [
      ['start', [0, Y0, 7]],
      ['damm', [0, Y0, -20]],
      ['luecke', [0, Y0, -28]],
      ['donut', [0, Y0, -48]],
      ['walzen', [1, Y0, -75]],
      ['walzen2', [-2, Y0, -92]],
      ['rohr1', [0, Y0, -106]],
      ['gabelung1', [0, Y1, -136]],
      ['rechts1', [7, Y1, -150]],
      ['cp1', [0, Y1, -184]],
      ['damm2', [0, Y1, -210]],
      ['grube', [-1, Y1, -246]],
      ['stempelweg', [-7.5, Y1, -266]],
      ['donut2', [0, Y1, -280]],
      ['walzen3', [2.5, Y1, -313]],
      ['gabelung2', [0, Y2, -360]],
      ['mitte2', [0, Y2, -368]],
      ['cp2', [0, Y2, -401]],
      ['gabelung3', [0, Y2, -412]],
      ['links3', [-10.5, Y2, -415]],
      ['rechts3', [12, Y2, -414]],
      ['ziel', [0, YZ, -463]],
      ['versteck', [VX - 10, Y1, -260]],
    ],
  },
  '7-4': {
    start: [0, B4, 6],
    meta: { stars: 3, time: 400, theme: 'bluelava', music: 'course_bluebelt', archetype: 'parcours' },
    enemies: { schubser: 6, knochenflieger: 5 },
    blocks: { walzen: 14, pendulums: 6, zylinder: 4, pfeilplatten: 13 },
    main: [
      { name: 'Hofkante', to: [0, -6.3], within: 0.4, run: false },
      { name: 'Pfeilplattform 1', waitPlat: 'pf1', to: [0, -10], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pf2', to: [0, -13.75], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pf3', to: [0, -17.5], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau A', to: [0, -22], jump: 20, within: 0.8, run: false },
      { name: 'Pendel 1', waitPend: 'pd1', to: [0, -26], within: 0.5, run: true },
      { name: 'Pendel 2', waitPend: 'pd2', to: [0.5, -29.6], within: 0.6, run: true }, { to: [0.5, -30.5], within: 0.4, run: false },
      { waitPlat: 'pf4', to: [0.5, -33.25], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pf5', to: [0.5, -37.5], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau B', to: [1, -42.5], jump: 20, within: 0.8, run: false },
      { name: 'Schubser B in die Lava', push: 'sb_b', dir: [1, 0], center: 1, centerZ: -48.5, room: 3.4, roomZ: 1.4, edges: [-5, 7] },
      { to: [3, -43], within: 0.6, run: false }, { to: [3, -47.6], within: 0.5, run: false },
      { to: [-1.5, -49], within: 0.5, run: false }, { to: [-1.5, -55.3], within: 0.4, run: false }, { to: [2, -55.4], within: 0.4, run: false },
      { waitPlat: 'pf6', to: [2, -58.5], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pf7', to: [2, -62.5], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau C', to: [-1.5, -67.5], jump: 20, within: 0.8, run: false },
      { to: [-1.6, -76.4], within: 0.4, run: false },
      { name: 'Brücken-Pendel', waitPend: 'pd3', far: 3.2, to: [0, -80.1], within: 0.4, run: true },
      { waitPend: 'pd4', far: 3.2, to: [0, -84.5], within: 0.5, run: true },
      { name: 'Checkpoint', to: [0, -86.6], within: 0.5 },
      { to: [1.4, -88.6], within: 0.4, run: false }, { to: [1.4, -91.6], within: 0.4, run: false }, { to: [0.5, -92.6], within: 0.4, run: false },
      { name: 'Zylinder 1', to: [0, -96.5], jump: 20, within: 0.9, run: false },
      { to: [0, -101.5], jumpZ: -97.4, jump: 24, within: 0.9, run: true },
      { name: 'Steinbau E', to: [3, -102], within: 0.5, run: false }, { to: [3, -105.6], within: 0.4, run: false },
      { to: [-3, -105.9], within: 0.4, run: false }, { to: [-3, -110.4], within: 0.4, run: false }, { to: [4.4, -111.6], within: 0.4, run: false },
      { name: 'Mauer-Pfeilplattformen', waitPlat: 'pw1', to: [5, -114.5], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pw2', to: [5, -118], jump: 20, within: 0.8, run: false },
      { waitPlat: 'pw3', to: [5, -121.5], jump: 20, within: 0.8, run: false },
      { name: 'Steinbau F', to: [4, -124], jump: 20, within: 0.8, run: false },
      { name: 'Schubser F in die Lava', push: 'sb_f', dir: [1, 0], center: 0, centerZ: -127, room: 4, roomZ: 2.6, edges: [-6, 6] },
      { to: [-3.4, -128.4], within: 0.5, run: false }, { to: [-3.4, -132.6], within: 0.4, run: false },
      { name: 'Stachel-Zylinder 2', waitZyl: 'zyl2', to: [0, -136.5], jump: 20, within: 0.9, run: false },
      { to: [0, -141], jumpZ: -137.4, jump: 24, within: 0.9, run: true },
      { name: 'Pendel G', waitPend: 'pd5', far: 3.2, to: [0, -144], within: 0.4, run: true },
      { waitPend: 'pd6', far: 3.2, to: [0, -147.6], within: 0.4, run: true },
      { name: 'Zylinder 3', to: [0, -151.5], jump: 20, within: 0.9, run: false },
      { to: [0, -156], jumpZ: -152.4, jump: 24, within: 0.9, run: true },
      { name: 'Steinbau H', to: [3, -156.6], within: 0.4, run: false }, { to: [3, -159.8], within: 0.4, run: false },
      { to: [-3, -159.9], within: 0.4, run: false }, { to: [-1, -162.6], within: 0.4, run: false },
      { name: 'Zylinder 4', to: [0, -166.5], jump: 20, within: 0.9, run: false },
      { to: [0, -171], jumpZ: -167.4, jump: 24, within: 0.9, run: true },
      { name: 'Steinbau I', to: [3, -171.6], within: 0.4, run: false }, { to: [3, -175], within: 0.4, run: false },
      { to: [-3, -175.2], within: 0.4, run: false }, { to: [-3, -178.2], within: 0.4, run: false },
      { name: 'Röhre zum Finale', to: [0, -181], jump: 20, within: 0.3, run: false }, { crouch: 20 },
      { expect: 'onFinale' },
      { to: [62.5, -182], within: 0.4, run: false }, { to: [62.5, -184.7], within: 0.4, run: false },
      { to: [57.5, -184.9], within: 0.4, run: false }, { to: [58.5, -189.3], within: 0.4, run: false },
      { name: 'Kippplattform: Schubser 1', push: 'sb_k1', dir: [-1, 0], center: 60, centerZ: -197.5, room: 2.2, roomZ: 5, edges: [56, 64] },
      { name: 'Schubser 2', push: 'sb_k2', dir: [1, 0], center: 60, centerZ: -197.5, room: 2.2, roomZ: 5, edges: [56, 64] },
      { name: 'Schubser 3', push: 'sb_k3', dir: [1, 0], center: 60, centerZ: -197.5, room: 2.2, roomZ: 5, edges: [56, 64] },
      { until: 'pfeileZiel', max: 600 },
      { to: [60, -204], within: 0.5, run: false },
      { to: [60, -208.5], jump: 20, within: 0.8, run: false }, { to: [60, -212.5], jump: 20, within: 0.8, run: false },
      { to: [60, -216.5], jump: 20, within: 0.8, run: false }, { to: [60, -220.5], jump: 20, within: 0.8, run: false },
      { name: 'Zielmast', to: [60, -227.5], within: 0.2 },
    ],
    routeChecks: [
      { name: 'fünf Schubser in die Lava gestoßen (B, F, drei auf der Kippplattform)', ok: (r) => r.mech.pushedOff === 5 },
      { name: 'ohne einen Treffer-Versuch (Pendel, Walzen, Stacheln abgewartet)', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: Sternring am Start – acht Sternmünzen (Hof, zwei Seitensäulen, zwei Sprünge) in 15 s', star: 0, from: [0, B4, 6],
        legs: [{ to: [-3.2, 1.2], within: 0.6 }, { to: [-3.6, -2], within: 0.5 }, { to: [-5.4, -1.5], within: 0.3, run: false },
          { to: [-8.2, -1.5], jump: 24, within: 0.6, run: false }, { to: [-4.8, -2.2], jump: 24, within: 0.8, run: false },
          { to: [-3, -5], within: 0.5, run: false }, { to: [-1.6, -3], within: 0.4, run: false }, { to: [0.8, -1.2], jump: 22, within: 0.8, run: false },
          { to: [3, -5], within: 0.5, run: false }, { to: [5.4, -1.5], within: 0.3, run: false }, { to: [8.2, -1.5], jump: 24, within: 0.6, run: false },
          { to: [4.8, -2.2], jump: 24, within: 0.8, run: false }, { to: [3.6, -2], within: 0.4, run: false }, { to: [1.4, 0.3], within: 0.4, run: false },
          { to: [-0.8, 2.6], jump: 22, within: 0.8, run: false },
          { until: 'stern0Visible', max: 240 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Sternring', star: 0, expectNot: true, from: [2, B4, -1], heroes: ['lotti'],
        legs: [{ to: [0, -3.5], within: 0.3, run: false }, { hop: 30 }, { wait: 30 }] },
      { name: 'Stern 1: Rätselbox hinter den Walzen von Steinbau C – Schubser in die Lava stoßen', star: 1, from: [-1.6, B4, -75.8],
        legs: [{ to: [2.4, -75.9], within: 0.4, run: false }, { warp: [4.2, -75.6] }, { expect: 'inRaetsel' },
          { push: 'sb_raetsel', dir: [0, -1], center: RX4, centerZ: -70, room: 3.6, roomZ: 3.6 },
          { until: 'stern1Visible4', max: 400 }, { star: 1 }, { warp: [RX4, -65.2] }, { expect: 'backFromRaetsel' }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Schubser in der Lava', star: 1, expectNot: true, from: [RX4, B4, -67.5], heroes: ['lotti'],
        legs: [{ to: [RX4, -70], within: 0.3, run: false }, { hop: 30 }, { wait: 30 }] },
      { name: 'Stern 2: vom vorletzten Zylinder seitlich auf das Sims', star: 2, from: [0, B4, -147.6],
        legs: [{ to: [0, -151.4], jump: 20, within: 0.9, run: false }, { to: [7.4, -151.5], jumpAt: 3.4, jump: 26, within: 0.6, run: true }, { star: 2 }, { expect: 'onLedge' }], shot: 'stern2' },
      { name: 'Stern 2 nicht beim Überqueren des Zylinders', star: 2, expectNot: true, from: [0, B4, -147.6], heroes: ['lotti'],
        legs: [{ to: [0, -151.4], jump: 20, within: 0.9, run: false }, { to: [0, -156], jumpZ: -152.4, jump: 24, within: 0.9, run: true }] },
      { name: 'Stempel: kleine runde Plattform vor der Rätselbox', stamp: true, from: [-1.6, B4, -69],
        legs: [{ to: [-3.5, -69], within: 0.4, run: false }, { to: [-7.2, -69], jump: 24, within: 0.5, run: false }, { expect: 'onRound' },
          { to: [-2.5, -69], jump: 24, within: 0.6, run: false }], shot: 'stempel' },
      { name: 'Stempel nicht auf dem Weg über Steinbau C', stamp: true, expectNot: true, from: [-1, B4, -67.5], heroes: ['lotti'],
        legs: [{ to: [-1.6, -76.4], within: 0.4, run: false }] },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über Steinbau B', from: [6, B4, -52], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6, -54], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block am Röhrenausgang des Finales', from: [FX4 + 3.5, B4, -179.5], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [FX4 + 3.5, -177.5], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Knochenflieger vom Podest aus besiegen (Draufspringen)', from: [3.4, B4 + 1.2, -86], heroes: ['lotti', 'greta'],
        legs: [{ stompAll: 'kf1' }, { expect: 'kf1weg' }], mech: (r) => r.mech.stomped.includes('kf1') && r.mech.hurts === 0, mechText: (r) => `besiegt ${r.mech.stomped.join(',')}, Treffer-Versuche ${r.mech.hurts}` },
      { name: 'Pfeilplattform versinkt mit der Figur in der Lava', from: [0, B4, -6.3], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ waitPlat: 'pf1', to: [0, -10], jump: 20, within: 0.8, run: false }, { wait: 900 }], mech: (r) => r.cause === 'lava', mechText: (r) => `${r.cause}` },
      { name: 'Pendelstachel verletzt (nicht abgewartet)', from: [0, B4, -22], heroes: ['lotti'], invuln: false,
        legs: [{ wait: 1 }, { to: [0, -24], within: 0.3, run: false }, { wait: 400 }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Zylinder dreht der Figur entgegen (Mitnahme zur Kamera)', from: [0, B4, -92.6], heroes: ['lotti'],
        legs: [{ to: [0, -96.5], jump: 20, within: 0.9, run: false }, { expect: 'onZyl1' }, { wait: 60 }, { expect: 'zylMitnahme' }] },
      { name: 'Kippplattform neigt sich unter der Figur', from: [60, B4, -191], heroes: ['lotti'],
        place: { settle: 4 }, legs: [{ to: [60, -191.4], within: 0.3, run: false }, { wait: 240 }, { expect: 'kippVorn' }] },
      { name: 'Schubser F (zwischen zwei Walzen) in die Lava', from: [4, B4, -123.6],
        legs: [{ push: 'sb_f', dir: [1, 0], center: 0, centerZ: -127, room: 4, roomZ: 2.6, edges: [-6, 6] }], mech: (r) => r.mech.pushedOff === 1 },
      { name: 'Kippplattform: drei Schubser in die Lava → drei Pfeilplattformen zum Ziel', from: [58.5, B4, -189.3],
        legs: [
          { expect: 'pfeileZielWeg' },
          { push: 'sb_k1', dir: [-1, 0], center: 60, centerZ: -197.5, room: 2.2, roomZ: 5, edges: [56, 64] },
          { push: 'sb_k2', dir: [1, 0], center: 60, centerZ: -197.5, room: 2.2, roomZ: 5, edges: [56, 64] },
          { push: 'sb_k3', dir: [1, 0], center: 60, centerZ: -197.5, room: 2.2, roomZ: 5, edges: [56, 64] },
          { until: 'pfeileZiel', max: 600 }],
        mech: (r) => r.mech.pushedOff === 3, mechText: (r) => `Schubser in der Lava ${r.mech.pushedOff ?? 0}` },
    ],
    shots: [
      ['start', [0, B4, 6]],
      ['pfeile1', [0, B4, -5]],
      ['bauA', [0, B4, -22]],
      ['bauB', [0, B4, -42]],
      ['bauC', [0, B4, -67]],
      ['stempel', [-2, B4, -70]],
      ['bruecke', [0, B4, -77.5]],
      ['cp', [0, B4, -87]],
      ['zyl1', [0, B4, -92]],
      ['wand', [3, B4, -110]],
      ['zyl2', [0, B4, -130]],
      ['zyl3', [0, B4, -145]],
      ['bauI', [0, B4, -169]],
      ['finale', [FX4, B4, -180]],
      ['kipp', [FX4, B4, -188]],
      ['ziel', [FX4, B4, -219]],
      ['raetsel', [RX4, B4, -66]],
    ],
  },
  '7-B': {
    start: [0, 2, 13.4],
    meta: { stars: 1, arena: true, time: 300, theme: 'fortress', music: 'course_arena', archetype: 'arena' },
    enemies: { schubser_prinz: 1 },
    main: [
      { name: 'durch das Fallgitter-Tor', to: [0, 7.5], within: 0.6 },
      { expect: 'fightOn' },
      { expect: 'prinzBlau' },
      { name: 'Kampf', fight: 'prinz' },
      { until: 'arenaStar', max: 900 },
      { name: 'Stern', star: 0 },
      { until: 'arenaDone', max: 900 },
    ],
    routeChecks: [
      { name: 'drei Röhrenfahrten und drei Tritte (echte Mechanik)', ok: (r) => r.mech.trips === 3 && r.mech.kicks === 3 },
    ],
    targets: [],
    extra: [
      { name: 'Tor schließt sich beim Betreten, der blaue Prinz stampft auf (Lebensleiste 3/3)', from: [0, 2, 14], heroes: ['lotti'],
        legs: [{ to: [0, 7.5], within: 0.6 }, { wait: 30 }, { expect: 'fightOn' }, { expect: 'gateLocked' }, { expect: 'hud3' }, { to: [0, 12.5], within: 0.5, max: 200, partial: true }, { expect: 'insideCage7B' }] },
      { name: 'Phase 1: drei blaue Feuerbälle in einer Kurve', from: [0, 2, 14], heroes: ['lotti'],
        legs: [{ to: [0, 3], within: 0.6 }, { until: 'ersteSalve', max: 3000 }, { wait: 90 }, { expect: 'dreiBlaue' }] },
      { name: 'nach jedem Tritt ein blauer Feuerball mehr (4, dann 5)', from: [0, 2, 14], heroes: ['lotti'],
        legs: [{ to: [0, 7.5], within: 0.6 }, { fight: 'prinz', kicks: 1, max: 8000 }, { to: [0, 3], within: 0.6 }, { expect: 'merkeSalve' }, { until: 'naechsteSalve', max: 3000 },
          { wait: 90 }, { expect: 'vierBlaue' }, { fight: 'prinz', kicks: 1, max: 8000 }, { to: [0, 3], within: 0.6 }, { expect: 'merkeSalve' },
          { until: 'naechsteSalve', max: 3000 }, { wait: 90 }, { expect: 'fuenfBlaue' }] },
      { name: 'Draufspringen ohne Röhre ist nur ein Abprall (kein Treffer)', from: [0, 2, 9], heroes: ['lotti'],
        legs: [{ to: [0, 7.5], within: 0.6 }, { until: 'prinzAim', max: 600 }, { stompBoss: 'prinz' }, { wait: 30 }, { expect: 'prinzFull' }] },
      { name: 'Extraleben: unsichtbarer Block rechts vor dem Tor', from: [5.8, 2, 13.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [5.8, 15.5], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Tod im Kampf: Neustart vor dem Tor, Prinz wieder 3/3, Tor offen', from: [0, 2, 14], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, 7.5], within: 0.6 }, { fight: 'prinz', kicks: 1, max: 6000 }, { kill: true }, { wait: 300 }, { expect: 'prinzReset' }] },
    ],
    shots: [
      ['start', [0, 2, 13.4]],
      ['tor', [0, 2, 11.5]],
      ['mitte', [0, 2, 3]],
      ['kampf', [3, 2, 5], 330],
      ['roehre_links', [-6, 2, 0], 0, null, Math.PI],
      ['ecke', [6, 2, -6]],
    ],
  },
};

const PORT = 4720;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const named = (id) => L.named.get(id);
  const ent = (id) => L.entities.find((e) => e.spec?.id === id && !e.removed);
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? src?.tag ?? String(src); return orig(src); };
  };
  wrapHurt();
  const hud = () => L.archetype?.hud?.state?.() ?? {};
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    // 7-3
    onP1: () => at(-10, 10, 4.5, -130, -147),
    onP4: () => at(-11, 11, 7.5, -354, -367),
    onGoalPlat: () => at(-13, 13, 10.5, -459, -483),
    inPit: () => at(2.5, 6.5, 2.2, -248.8, -256.2),
    inVersteck: () => P().pos.x > 110,
    backOnP3: () => at(-9, 9, 4.5, -243, -263),
    funkelstern: () => P().power === 'stern',
    sternring: () => !!ent('sternring')?.active || (named('sternring')?.state ?? '') === 'run',
    stern1Visible: () => !!L.runtime.stars[1] || L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && !e.removed),
    onStampIsland: () => at(-10, -6, 4.5, -278.8, -286.2),
    // 7-4
    onFinale: () => at(53, 67, 1, -175, -191),
    inRaetsel: () => P().pos.x > 85,
    backFromRaetsel: () => at(-4, 6, 1, -65, -78),
    pfeileZiel: () => ['pz1', 'pz2', 'pz3'].every((id) => named(id)?.state === 'oben'),
    pfeileZielWeg: () => ['pz1', 'pz2', 'pz3'].every((id) => named(id)?.state === 'weg'),
    onLedge: () => P().mode === 'ground' && P().pos.y > 2.8 && P().pos.x > 6,
    onRound: () => P().mode === 'ground' && Math.hypot(P().pos.x + 7.2, P().pos.z + 69) < 1.4,
    onKipp: () => P().mode === 'ground' && P().ground?.tag === 'wippe',
    stern0Visible: () => !!L.runtime.stars[0] || L.entities.some((e) => e.kind === 'star' && e.index === 0 && !e.hidden && !e.removed),
    stern1Visible4: () => !!L.runtime.stars[1] || L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && !e.removed),
    onZyl1: () => { window.__zylZ = P().pos.z; return P().mode === 'ground' && P().ground?.tag === 'zylinder'; },
    zylMitnahme: () => P().pos.z > window.__zylZ + 0.4,
    kippVorn: () => Math.abs(named('kipp')?.angle ?? 0) > 2,
    kf1weg: () => { const e = ent('kf1'); return !e || e.defeated || !e.alive; },
    // 6-A-artig (7-B)
    fightOn: () => !!named('prinzKampf')?.started && named('prinz')?.state !== 'wait',
    gateLocked: () => !!named('prinzKampf')?.locked,
    hud3: () => hud().boss?.hp === 3,
    prinzAim: () => named('prinz')?.state === 'aim',
    prinzFull: () => named('prinz')?.hp === 3,
    prinzReset: () => { const b = named('prinz'); return b.hp === 3 && b.state === 'wait' && !named('prinzKampf').started && !named('prinzKampf').locked && !P().dead; },
    insideCage7B: () => P().pos.z < 10,
    prinzBlau: () => !!named('prinz')?.blue,
    ersteSalve: () => (named('prinz')?.volleys ?? 0) >= 1,
    dreiBlaue: () => { const b = named('prinz'); const blaue = L.entities.filter((e) => e.kind === 'feuerkugel' && e.owner === b && e.spec?.color === 'blau').length; window.__blaue = blaue; return b.fireballs === 3 && b.volleys === 1; },
    merkeSalve: () => { const b = named('prinz'); window.__salve = { f: b.fireballs, v: b.volleys }; return true; },
    naechsteSalve: () => (named('prinz')?.volleys ?? 0) > window.__salve.v,
    vierBlaue: () => named('prinz').fireballs - window.__salve.f === 4,
    fuenfBlaue: () => named('prinz').fireballs - window.__salve.f === 5,
    arenaStar: () => !!L.archetype?.info?.().starTouch,
    arenaDone: () => L.runtime.status === 'done' || L.runtime.status === 'goal',
  };
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
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
    /** Lenkung in der Luft: Wunschgeschwindigkeit zum Ziel (tx, tz) plus Mitbewegung (vx, vz). */
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, boosts: 0, trips: 0, kicks: 0, stomped: [], hurtList: [] };
      const foes0 = L.entities.filter((e) => e.enemy && e.alive && !e.defeated);
      const track = [];
      let lastHurts = p.hurtTries ?? 0, lastBoost = 0;
      let stickInScript = null;
      let reflex = 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        // Reflex wie ein Kind: stößt ein Knochenflieger herab, hochspringen – er saust unter der Figur durch, im Fallen
        // landet sie auf ihm (Draufspringen besiegt ihn)
        if (o.reflex !== false) {
          if (reflex > 0) { reflex--; inp = { ...(inp ?? {}), jump: true }; }
          else if (p.mode === 'ground') {
            for (const e of L.entities) {
              if (e.kind !== 'knochenflieger' || !e.alive || e.defeated || e.state !== 'dive') continue;
              // Sprung so, dass die Figur oben ist, wenn er den tiefsten Punkt seines Bogens erreicht
              const low = e.diveLow, tLow = e.diveT / 2 - e.stateT;
              const near = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 2.6 && e.pos.y - p.pos.y < 2.2 && e.pos.y - p.pos.y > -0.3;
              if (!near && (!low || tLow > 0.42 || tLow < 0.05 || Math.hypot(low[0] - p.pos.x, low[2] - p.pos.z) > 1.6)) continue;
              reflex = 26; mech.reflex = (mech.reflex ?? 0) + 1; inp = { ...(inp ?? {}), jump: true }; break;
            }
          }
        }
        c.setInput(inp); c.step(1); steps++;
        if (p.boostTime > lastBoost + 0.2) mech.boosts++;
        lastBoost = p.boostTime;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '', +Math.hypot(p.vel.x, p.vel.z).toFixed(1)]);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasspipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') {
          if (Lg.until && COND[Lg.until]?.()) { log.push(['bis', Lg.until, 0]); continue; }
          if (!(Lg.wait || Lg.expect || Lg.until)) break;
        }
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { if (p.dead) { c.setInput({}); c.step(1); steps++; } else tick({}); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 40; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.kill) { p.invuln = 0; p.die('fall'); log.push(['tot gesetzt']); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: Lg.run ?? false });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Glasröhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, rode = false;
          const r0 = mech.rides;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' ? d < 2.0 : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { rode = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            let k = 0;
            for (; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ Schubser in Richtung dir in die Lava stoßen (Anlauf von der Gegenseite,
        // Sprung auf ihn, Stampfattacke → er rutscht; seinem Rammen springt die Figur aus dem Weg; Mitte cx/cz halten)
        if (Lg.push) {
          const e = L.entities.find((x) => x.spec?.id === Lg.push);
          const dl = Math.hypot(Lg.dir[0], Lg.dir[1]) || 1;
          let dx = Lg.dir[0] / dl, dz = Lg.dir[1] / dl;
          const cx = Lg.center ?? 0, cz = Lg.centerZ ?? null, room = Lg.room ?? 2.2;
          const clampX = (x) => Math.max(cx - room, Math.min(cx + room, x));
          const clampZ = (z) => (cz === null ? z : Math.max(cz - (Lg.roomZ ?? room), Math.min(cz + (Lg.roomZ ?? room), z)));
          let tries = 0;
          const gone = () => !e || !e.alive || e.removed || e.defeated || e.state === 'defeated' || e.state === 'fall' || e.pos.y < (e.home?.y ?? e.spec.pos[1]) - 1.2;
          const dodge = () => {
            if (p.mode !== 'ground') return false;
            // jeder rammende Schubser in der Nähe (auch die anderen Wächter) – rechtzeitig hochspringen
            const threat = L.entities.some((x) => x.kind === 'schubser' && x.alive && !x.defeated && x.state === 'charge'
              && Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) < 3.2 && ((p.pos.x - x.pos.x) * (x.vel?.x ?? 0) + (p.pos.z - x.pos.z) * (x.vel?.z ?? 0)) > 0);
            if (!threat) return false;
            for (let q = 0; q < 30; q++) tick({ jump: true });
            for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick({ ...this.airSteer(clampX(p.pos.x), clampZ(p.pos.z), 0, 0, 2, 3) });
            mech.dodged = (mech.dodged ?? 0) + 1;
            return true;
          };
          for (; tries < 12 && !gone() && !p.dead; tries++) {
            if (Lg.edges) {
              // zur näheren Kante (x) stoßen – je Versuch neu gewählt
              dx = (e.pos.x - Lg.edges[0]) < (Lg.edges[1] - e.pos.x) ? -1 : 1; dz = 0;
            } else if (Lg.auto !== false) {
              // zur näheren Kante stoßen (x bzw. z), wenn er schon außer der Mitte steht
              const ox = e.pos.x - cx, oz = cz === null ? 0 : e.pos.z - cz;
              if (Math.abs(ox) > 0.5 && Math.abs(ox) >= Math.abs(oz)) { dx = Math.sign(ox); dz = 0; } else if (cz !== null && Math.abs(oz) > 0.5) { dx = 0; dz = Math.sign(oz); }
            }
            for (let k = 0; k < 500 && !gone(); k++) {
              if (dodge()) continue;
              const ax = clampX(e.pos.x - dx * (Lg.back ?? 2.6)), az = clampZ(e.pos.z - dz * (Lg.back ?? 2.6));
              const qx = ax - p.pos.x, qz = az - p.pos.z, d = Math.hypot(qx, qz);
              if (d < 0.6 && p.mode === 'ground' && e.state !== 'warn' && e.state !== 'charge') break;
              tick({ ...this.stick(qx, qz, Math.min(1, Math.max(0.5, d / 1.0))), run: d > 2 });
            }
            const p0 = e.pushes ?? 0;
            let pounding = false;
            for (let k = 0; k < 220 && !gone() && (e.pushes ?? 0) === p0 && !p.dead; k++) {
              const tx = clampX(e.pos.x - dx * 0.3), tz = clampZ(e.pos.z - dz * 0.3);
              const hd = Math.hypot(tx - p.pos.x, tz - p.pos.z);
              if (!pounding && k > 6 && hd < 0.45 && p.vel.y < 3 && p.pos.y > e.pos.y + 1.2) pounding = true;
              if (pounding) { tick({ crouch: true }); continue; }
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, e.vel?.x ?? 0, e.vel?.z ?? 0, 3.4, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: k < 26, run: false });
            }
            for (let k = 0; k < 240 && p.mode !== 'ground' && !p.dead; k++) tick({ ...this.airSteer(clampX(p.pos.x), clampZ(p.pos.z), 0, 0, 3, 5) });
            for (let k = 0; k < 150 && !gone(); k++) {
              const ox = p.pos.x - cx, oz = cz === null ? 0 : p.pos.z - cz;
              tick(p.mode === 'ground' && (Math.abs(ox) > 1.2 || Math.abs(oz) > 1.2) ? this.stick(-ox, -oz, 0.6) : {});
            }
            if (window.__trace) log.push(['stoß', tries, pounding, e.state, e.pushes ?? 0, +e.pos.x.toFixed(2), +e.pos.z.toFixed(2), +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          }
          for (let k = 0; k < 120 && e?.alive && !e?.removed && !e?.defeated; k++) tick({});
          if (gone()) mech.pushedOff = (mech.pushedOff ?? 0) + 1;
          log.push(['schubser', Lg.push, gone(), tries, e?.state, e?.fellBy, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!gone()) { log.push(['FEHLER: Schubser nicht in die Lava gestoßen', Lg.push]); break; }
          continue;
        }
        // ------------------------------------------------ Endgegner einmal von oben treffen (ohne Röhre: nur Abprall)
        if (Lg.stompBoss) {
          const b = named(Lg.stompBoss);
          let k = 0, bounced = false;
          const b0 = b.bounces ?? 0;
          for (; k < 600 && !bounced; k++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && d < 2.4) { tick({ ...this.stick(dx, dz, 0.6), jump: true }); continue; }
            if (p.mode === 'air') { tick({ ...this.airSteer(b.pos.x, b.pos.z, 0, 0, 3.6, 7), jump: p.vel.y > 0 }); if ((b.bounces ?? 0) > b0) bounced = true; continue; }
            tick({ ...this.stick(dx, dz, 1) });
          }
          log.push(['Kopfsprung', bounced, b.hp, b.state, b.bounces]);
          continue;
        }
        // ------------------------------------------------ Schubser-Prinz: in die Röhren stoßen und treten
        if (Lg.fight) {
          const r = this.fight(Lg.fight, { tick, max: Lg.max ?? 24000, kicks: Lg.kicks ?? 3 });
          mech.trips += r.trips; mech.kicks += r.kicks; mech.fireballs = r.fireballs; mech.volleys = r.volleys;
          log.push(['Kampf', JSON.stringify(r)]);
          if (r.kicks < (Lg.kicks ?? 3)) log.push(['FEHLER: Kampf nicht gewonnen']);
          continue;
        }
        // ------------------------------------------------ warten: Pfeilplattform oben, Pendel weit weg, Zylinder-Stacheln weg
        if (Lg.waitPlat) {
          const h = named(Lg.waitPlat);
          let k = 0;
          // erst eine frisch aufgetauchte Plattform nehmen (vorher „oben“ → bis zum nächsten Auftauchen warten)
          if (Lg.fresh) for (; k < 1500 && h.state === 'oben'; k++) tick({});
          for (; k < 1500 && h.state !== 'oben'; k++) tick({});
          log.push(['plattform', Lg.waitPlat, k, h.state]);
        }
        if (Lg.waitPend) {
          const h = named(Lg.waitPend);
          const far = Lg.far ?? 3;
          let k = 0;
          // Kugel weit weg und auf dem Weg nach außen (Abstand wächst)
          let prev = Math.abs(h.ball.x - p.pos.x);
          for (; k < 900; k++) { tick({}); const d = Math.abs(h.ball.x - p.pos.x); if (d > far && d >= prev) break; prev = d; }
          log.push(['pendel', Lg.waitPend, k, +h.ball.x.toFixed(2)]);
        }
        if (Lg.waitZyl) {
          const h = named(Lg.waitZyl);
          const rows = h.info().rows, sp = h.speed, ahead = Lg.ahead ?? 1.8;
          const danger = () => {
            for (let i = 0; i < rows; i++) {
              const s = h.spikeAt(i);
              let a = Math.atan2(s.u, s.v) * Math.sign(sp || 1);   // 0 = oben, wächst in Drehrichtung
              if (a > -0.6 - Math.abs(sp) * ahead && a < 0.6) return true;
            }
            return false;
          };
          let k = 0;
          for (; k < 1800 && danger(); k++) tick({});
          log.push(['zylinder', Lg.waitZyl, k]);
        }
        if (!Lg.to) continue;
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        const late = !!Lg.jumpAt || Lg.jumpZ !== undefined;
        let best = Infinity, still = 0, auto = 0, j0 = late ? null : 0;
        if (holdJ && !late) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null && Lg.steer !== false) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else if (p.mode === 'air' && Lg.steer === false) st = {};
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && ((Lg.jumpAt && dist <= Lg.jumpAt) || (Lg.jumpZ !== undefined && p.pos.z <= Lg.jumpZ))) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max && !Lg.partial) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.defeated = foes0.filter((e) => e.defeated || !e.alive || e.removed).length;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, cause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    /**
     * Kampf gegen den Schubser-Prinzen mit echten Eingaben (wie course_w6b): eine Röhrenmündung wählen, die vom Prinzen aus
     * gerade anzulaufen ist, zwischen ihn und die Mündung stellen, im Anlauf seitlich ausweichen (er rammt sich fest), dann in
     * ihn hineinlaufen (zweiter Stoß), zur Ausgangsmündung rennen und auf den Benommenen springen. Blaue Feuerbälle: hoch-
     * springen, wenn eine Kugel nahe heranfliegt.
     */
    fight(id, o) {
      const p = P(), b = named(id), tick = o.tick;
      const mouths = b.pipes;
      const r = { trips0: b.trips, kicks0: b.hits, steps: 0, dodges: 0, stuckSeen: 0, states: [], hops: 0 };
      let dodge = null, spot = null, hop = 0;
      for (let k = 0; k < o.max; k++) {
        if (b.hits - r.kicks0 >= o.kicks || b.state === 'gone' || p.dead || L.runtime.status !== 'play') break;
        r.steps++;
        const s = b.state;
        if (r.states[r.states.length - 1] !== s) { r.states.push(s); if (r.states.length > 60) r.states.shift(); }
        const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        // Feuerkugeln: über eine nahe Kugel hinwegspringen
        if (hop > 0) hop--;
        const ball = p.mode === 'ground' && hop <= 0 && L.entities.some((e) => e.kind === 'feuerkugel' && e.alive && !e.removed && e.owner === b
          && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 1.9 && e.pos.y < p.pos.y + 1.4);
        if (ball) { hop = 30; r.hops++; }
        const J = hop > 18;
        if (s === 'stunned') {
          dodge = null;
          if (p.mode === 'ground' && d < 2.3) { tick({ ...this.stick(dx, dz, 0.5), jump: true }); continue; }
          if (p.mode === 'air') { tick({ ...this.airSteer(b.pos.x, b.pos.z, 0, 0, 3.6, 8), jump: p.vel.y > 0 }); continue; }
          tick({ ...this.stick(dx, dz, 1), run: true, jump: J });
          continue;
        }
        if (s === 'stuck') {
          dodge = null;
          r.stuckSeen++;
          tick({ ...this.stick(dx, dz, 1), run: true });
          continue;
        }
        if (s === 'pipe' || s === 'squeezed') {
          dodge = null;
          const t = b.exit ?? b.trip?.to;
          if (t) { const tx = t.x + t.dx * 4.2, tz = t.z + t.dz * 4.2; const ex = tx - p.pos.x, ez = tz - p.pos.z; tick(Math.hypot(ex, ez) > 0.4 ? { ...this.stick(ex, ez, 1), run: true, jump: J } : { jump: J }); }
          else tick({ jump: J });
          continue;
        }
        if (s === 'hit' || s === 'defeated' || s === 'wait') { tick({ jump: J }); continue; }
        if (s === 'charge' && !dodge && d < 3.4) {
          const cx = b.chargeDir.x, cz = b.chargeDir.z;
          let sx = -cz, sz = cx;
          if (sx * (p.pos.x - b.pos.x) + sz * (p.pos.z - b.pos.z) < 0) { sx = -sx; sz = -sz; }
          const nx = p.pos.x + sx * 2.5, nz = p.pos.z + sz * 2.5;
          if (Math.abs(nx) > 9.2 || Math.abs(nz) > 9.2) { sx = -sx; sz = -sz; }
          dodge = { x: sx, z: sz, t: 0 };
          r.dodges++;
        }
        if (dodge) {
          dodge.t++;
          tick({ ...this.stick(dodge.x, dodge.z, 1), run: true, jump: dodge.t < 14 || J });
          if (dodge.t > 70 && p.mode === 'ground') dodge = null;
          continue;
        }
        let best = null, bs = Infinity;
        for (const m of mouths) {
          const rx = b.pos.x - m.x, rz = b.pos.z - m.z, l = Math.hypot(rx, rz);
          if (l < 5) continue;
          const cos = (rx * m.dx + rz * m.dz) / l;
          const score = -cos + Math.hypot(p.pos.x - m.x, p.pos.z - m.z) * 0.01;
          if (score < bs) { bs = score; best = m; }
        }
        if (best) {
          const rx = b.pos.x - best.x, rz = b.pos.z - best.z, l = Math.hypot(rx, rz) || 1;
          spot = { x: best.x + (rx / l) * 2.6, z: best.z + (rz / l) * 2.6 };
        }
        if (spot) {
          const ex = spot.x - p.pos.x, ez = spot.z - p.pos.z, el = Math.hypot(ex, ez);
          tick(el > 0.25 ? { ...this.stick(ex, ez, Math.min(1, el / 1.2)), run: el > 2, jump: J } : { jump: J });
        } else tick({ jump: J });
      }
      r.trips = b.trips - r.trips0;
      r.kicks = b.hits - r.kicks0;
      r.states = r.states.slice(-14).join('>');
      r.hp = b.hp;
      r.fireballs = b.fireballs; r.volleys = b.volleys;
      r.log = b.tripLog;
      return r;
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        if (e.touch === false && kind === 'star') { p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); continue; }
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200 && L.runtime.status === 'play') { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; let nm = null; for (let q = o; q; q = q.parent) if (q.name) { nm = q.name.replace(/:\d+$/, ''); break; } if (nm && nm.startsWith('kurs:')) nm += `/${o.type}${o.count ? '×' + o.count : ''}/${o.geometry?.index ? o.geometry.index.count / 3 : (o.geometry?.attributes?.position?.count ?? 0) / 3 | 0}`; return nm ?? o.type; };
      const acc = new Map();
      const orig = r.renderBufferDirect;
      r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
        const t0 = r.info.render.triangles;
        orig.call(this, camera, scene, geometry, material, object, group);
        const key = `${scene ? '' : 'S:'}${label(object)}`;
        const a = acc.get(key) ?? { calls: 0, tris: 0 };
        a.calls++; a.tris += r.info.render.triangles - t0;
        acc.set(key, a);
      };
      const f0 = v.frame;
      const wait = () => {
        if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; }
        r.renderBufferDirect = orig;
        res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[1] - x[1] || y[2] - x[2]).slice(0, 40));
      };
      requestAnimationFrame(wait);
    }),
    arch: () => c.state().archetype,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    blocks: () => {
      const w7 = L.w7 ?? {};
      return {
        pfeile: named('pfeile')?.n ?? 0,
        walzen: (w7.rollers ?? []).filter((r) => r.kind === 'stachelwalze_rot').length,
        zylinder: (w7.rollers ?? []).filter((r) => r.kind === 'zylinder').length,
        pfeilplatten: (w7.arrows ?? []).length, pendulums: (w7.pendulums ?? []).length,
      };
    },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  window.__w7b = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id) {
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
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w7b[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w7b_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w7b.detail());
    console.log(`      ${name}:`);
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots ?? null, stamp: !!d.stamp }; });
    const kinds = await W('kinds');
    const blocks = await W('blocks');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}, Bausteine: ${JSON.stringify(blocks)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const starsOk = R.meta.arena ? meta.slots === 1 && !meta.stamp : (meta.stars === R.meta.stars && kinds.stamp === 1);
    check(`${id}: ${R.meta.stars} Stern(e)${R.meta.arena ? '' : ', Stempel'}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    for (const [k, n] of Object.entries(R.blocks ?? {})) check(`${id}: ${n}× ${k} (${blocks[k] ?? 0})`, (blocks[k] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.time} s (${res.time.toFixed(1)} s)`, reached && res.time < R.meta.time);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt, { settle: 6 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
