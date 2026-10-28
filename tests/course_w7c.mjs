// Welt 7, Level 7-5 „Stampfsteinturm und Giftnebel-Flucht“ (Stufenturm mit Stampfstein-Fahrstühlen, Aufzügen, Fähre,
// Kletterpfeiler, Zauberkröten, Sinkwolke, Seilbahn, runder Funkenturm mit Funkenflämmchen, fünf Schlüsselmünzen, Ziegel-
// Würfel, Flucht vor dem Giftnebel und steigender Lava), 7-Kapitän „Krümel in der Zahnradschmiede“ (Maschinen-Diorama:
// Förderbänder, Stampfsteine als Trittstufen, Projektilköpfe, 5 Sterne) und 7-6 „Rammfisch-Riff am Feuerberg“ (Unterwasser:
// Rammfische, zerbrechliche Kisten, Vulkaninsel mit Wutkaulquappen, große rotierende Rammfische):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und
// Greta von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route),
// alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je Abschnitt (Zeichenaufrufe
// < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w7c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w7c.mjs [7-5|7-Kapitän|7-6]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min, empfohlen je Level zwei Läufe:
//   load,route,sweep und load,targets,extra,shots) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras mit diesem
//   Namensteil) · VERBOSE=1 (Protokoll der Beine) · TRACE=1 · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe
//   je Objekt bei den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Giftnebel, Lava und Absturz töten trotzdem (die Flucht ist echt). Gegenproben laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Maße 7-5 (wie src/course/levels/w7/7-5.js)
const E0 = 0, E1 = 6, E2 = 12, E3 = 18, TOP = 24, G1 = 20, WT = 16.8, R1 = 25, R2 = 30, R3 = 35, R4 = 40, GOAL = 30;
const C2 = { x: 0, z: -112 };
/** Punkt auf einem Ring des Funkenturms (Winkel in Grad, 0 = vorn/+Z, 90 = rechts/+X) → [x, z]. */
const ring = (a, r) => [+(C2.x + Math.sin((a * Math.PI) / 180) * r).toFixed(3), +(C2.z + Math.cos((a * Math.PI) / 180) * r).toFixed(3)];

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt (Abstand zum Ziel, ab dem gesprungen wird),
// within, run, slow, max, land, autoJump, hopping (Treppe: immer wieder hüpfen), stopIf } · { wait } · { hop } (Sprung auf der
// Stelle) · { poundAt: [x, z] } · { climbOnto: [x, z, oberkante] } · { push: Schritte, dir: [dx, dz], jump } (gegen eine
// Wand drücken, z. B. Klettern) · { star: i } · { stamp: true } · { chaseKind, filter } · { expect: Bedingung } ·
// { until: Bedingung } · { warp: [x, z] } · { toads: [Ids] } (Zauberkröten anspringen, sobald sie sichtbar sind)
const FLUCHT = [
  { name: 'Flucht: Krone → Ring 3', to: ring(73, 3.4), within: 0.5, run: false },
  { to: ring(73, 5.4), within: 0.6, run: false },
  { to: ring(45, 5.0), within: 0.6 },
  { to: ring(20, 5.3), within: 0.6 },
  { name: 'Ring 3 → Ring 2', to: ring(20, 8.4), within: 0.7, run: false },
  { to: ring(48, 7.9), within: 0.6 },
  { to: ring(75, 8.1), within: 0.6 },
  { name: 'Ring 2 → Ring 1', to: ring(75, 11.2), within: 0.7, run: false },
  { to: ring(58, 10.8), within: 0.6 },
  { to: ring(39, 11.3), within: 0.6 },
  { name: 'Ring 1 → Vorhof', to: ring(39, 14.4), within: 0.7, run: false },
  { to: [9.4, -93], within: 0.5 },
  { name: 'Treppe hinab, Glutbrücke', to: [15.2, -93], within: 0.5 },
  { name: 'Warp-Terrasse', to: [17.4, -93], jump: 14, within: 0.5, run: false },
];
const ROUTES = {
  '7-5': {
    start: [0, E0, 10],
    meta: { stars: 3, time: 400, theme: 'lavatower', music: 'course_traptower', archetype: 'parcours' },
    enemies: { stampfstein: 3, knochenflieger: 3, zauberkroete: 3, funkenflaemmchen: 6, schluesselmuenze: 5 },
    main: [
      { to: [3.6, -7.6], within: 0.4, run: false },
      { name: 'Stampfstein 1 herunterlocken', to: [4, -9.5], within: 0.2, run: false, slow: 0.5 },
      { until: 'stampf1Liegt', max: 400 },
      { name: 'auf den liegenden Stampfstein', to: [4, -11.1], jump: 18, within: 0.45, run: false },
      { expect: 'aufStampf1' },
      { until: 'stampf1Oben', max: 900 },
      { name: 'Etage 1', to: [4, -14], within: 0.5, run: false },
      { to: [-6, -19.6], within: 0.5 },
      { name: 'Aufzug 1', to: [-10.5, -20.5], within: 0.45, run: false },
      { until: 'lift1Oben', max: 900 },
      { name: 'Etage 2 links', to: [-8, -25], within: 0.5, run: false },
      { to: [-4.7, -27], within: 0.25, run: false },
      { until: 'faehreLinks', max: 1200 },
      { name: 'Fähre über den Schacht', to: [-2.2, -27], within: 0.4, run: false },
      { until: 'faehreRechts', max: 1200 },
      { name: 'Etage 2 rechts', to: [6, -27.6], within: 0.5, run: false },
      { name: 'Aufzug 2', to: [10.5, -30.5], within: 0.45, run: false },
      { until: 'lift2Oben', max: 900 },
      { name: 'Etage 3', to: [8, -35], within: 0.5, run: false },
      { to: [-3.6, -37.6], within: 0.4, run: false },
      { name: 'Stampfstein 2 herunterlocken', to: [-4, -39.4], within: 0.2, run: false, slow: 0.5 },
      { until: 'stampf2Liegt', max: 400 },
      { to: [-4, -41.1], jump: 18, within: 0.45, run: false },
      { until: 'stampf2Oben', max: 900 },
      { name: 'Turmspitze', to: [-4, -44.2], within: 0.5, run: false },
      { to: [0, -52.6], within: 0.35, run: false },
      { name: 'in die Gondel', to: [0, -55.25], jump: 16, within: 0.5, run: false },
      { expect: 'inGondel' },
      { until: 'gondelDruben', max: 2400 },
      { name: 'Vorhof (Checkpoint)', to: [0, -89.8], jump: 18, within: 0.5, run: false },
      { name: 'Schlüssel 1', to: [-8.6, -90.6], within: 0.5 },
      { to: [-5, -92.4], within: 0.4, run: false },
      { name: 'Treppe auf Ring 1', to: [-5, -100.4], within: 0.5, run: false, hopping: true },
      { to: ring(-38, 11.0), within: 0.6 },
      { to: ring(-58, 10.6), within: 0.6 },
      { name: 'Schlüssel 2', to: ring(-75, 11.4), within: 0.5 },
      { to: ring(-58, 11.0), within: 0.5, run: false },
      { name: 'Sprungfeder', to: ring(-45, 11.5), jump: 10, within: 0.35, run: false, land: false },
      { name: 'Ring 2', to: ring(-45, 8.2), within: 0.6, run: false },
      { name: 'Schlüssel 3', to: ring(-64, 8.6), within: 0.5, run: false },
      { to: [-8.5, -109.3], within: 0.3, run: false },
      { until: 'pfeilOben', max: 1200 },
      { name: 'Pfeilplattform', to: [-8.6, -112], jump: 24, within: 0.5, run: false },
      { name: 'Ring 3', to: [-5.5, -112], jump: 26, within: 0.5, run: false },
      { to: ring(-62, 5.6), within: 0.5, run: false },
      { name: 'Schlüssel 4', to: ring(-45, 5.6), within: 0.5, run: false },
      { to: ring(-22, 5.7), within: 0.5, run: false },
      { name: 'Stampfstein 3 herunterlocken', to: [-1.7, -106.2], within: 0.2, run: false, slow: 0.5 },
      { until: 'stampf3Liegt', max: 400 },
      { to: [0, -106.7], jump: 18, within: 0.45, run: false },
      { until: 'stampf3Oben', max: 900 },
      { name: 'Turmkrone: Schlüssel 5 weckt den Giftnebel', to: [0, -112], within: 0.3, run: false },
      { expect: 'keys5' },
      { expect: 'nebelAn' },
      ...FLUCHT,
      { name: 'Warp-Box zum Ziel', warp: [19.4, -93.4] },
      { expect: 'zielterrasse' },
      { name: 'Zielmast', to: [0, -149.3], within: 0.2 },
    ],
    routeChecks: [
      { name: 'drei Stampfstein-Fahrten, zwei Aufzüge, Fähre, Seilbahn, Sprungfeder, Pfeilplattform', ok: (r) => r.mech.stampfFahrten === 3 && r.mech.aufzug >= 2 && r.mech.gondel && r.mech.feder },
      { name: 'fünf Schlüsselmünzen, Warp-Box erschienen und benutzt', ok: (r) => r.mech.keys === 5 && r.mech.warps === 1 },
      { name: 'Giftnebel gejagt, Lava gestiegen, Flucht gelungen (nicht im Nebel gestorben)', ok: (r) => r.mech.nebel === 'jagt' || r.mech.nebel === 'ende' ? r.mech.lavaTop > 0 && !r.dead : false },
      { name: 'Flucht von der Krone bis in die Warp-Box < 16 s (Nebel erreicht Ring 1 erst nach ≈ 23 s, die Lava die Glutbrücke nach ≈ 28 s)', ok: (r) => r.mech.flucht !== null && r.mech.flucht < 16 },
      { name: 'ohne einen Treffer-Versuch', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug aus dem ?-Block, Aufzug 2, Kletterpfeiler hinauf', star: 0, from: [6, E2, -27.6],
        legs: [{ to: [6.6, -25.6], within: 0.2, run: false }, { hop: 20 }, { to: [6.6, -24.1], within: 0.2, run: false, slow: 0.5 }, { climbOnto: [6.6, -25.6, E2 + 2.6] },
          { chaseKind: 'powerup', max: 300 }, { expect: 'krallen' },
          { to: [10.5, -30.5], within: 0.4, run: false }, { until: 'lift2Oben', max: 900 }, { wait: 20 },
          { push: 300, jump: 14, dir: [1, 0], stopIf: 'aufPfeiler' }, { wait: 20 }, { expect: 'aufPfeiler' }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Krallen-Anzug (Pfeiler zu hoch)', star: 0, expectNot: true, from: [10.5, E2, -30.5], heroes: ['lotti'],
        legs: [{ until: 'lift2Oben', max: 900 }, { wait: 20 }, { push: 200, jump: 30, dir: [1, 0] }, { wait: 30 }] },
      { name: 'Stern 1: alle drei Zauberkröten auf der Turmspitze besiegen', star: 1, from: [0, TOP, -46],
        legs: [{ expect: 'sternKroetenVersteckt' }, { toads: ['zk1', 'zk2', 'zk3'], max: 7200 }, { until: 'sternKroeten', max: 300 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: auf den Ziegel-Würfel, Stampfattacke, hinein zum Stern', star: 2, from: [-3.6, R1, -101.4],
        legs: [{ to: [-1.9, -100.9], within: 0.25, run: false }, { climbOnto: [0, -100.5, R1 + 3] }, { expect: 'aufWuerfel' }, { to: [0, -100.5], within: 0.15, run: false, slow: 0.4 },
          { poundAt: [0, -100.5] }, { wait: 30 }, { hop: 24 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Stampfen (Ziegel halten Springen aus)', star: 2, expectNot: true, from: [-3.6, R1, -101.4], heroes: ['lotti'],
        legs: [{ to: [-1.9, -100.9], within: 0.25, run: false }, { climbOnto: [0, -100.5, R1 + 3] }, { hop: 24 }, { hop: 24 }, { wait: 30 }] },
      { name: 'Stempel: von der Turmspitze links hinunter auf die Sinkwolke, mit ihr hinab zur Etage 3', stamp: true, from: [1, TOP, -47],
        legs: [{ to: [-16, -47], jumpAt: 8.6, jump: 30, within: 0.7, run: true }, { expect: 'aufWolke' }, { until: 'wolkeUnten', max: 1500 },
          { to: [-6, -39.6], within: 0.5, run: false }, { expect: 'etage3' }], shot: 'stempel' },
      { name: 'Stempel nicht von Etage 3 aus (Wolke zu hoch)', stamp: true, expectNot: true, from: [4, E3, -41.2], heroes: ['lotti'],
        legs: [{ to: [-16, -47], jumpAt: 8.2, jump: 30, within: 0.7, run: true, max: 400 }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block auf Etage 1', from: [-7.2, E1, -13.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-7.2, -15.2], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Warp-Box versteckt, solange Schlüssel fehlen', from: [17.4, WT, -93], heroes: ['lotti'],
        legs: [{ to: [19.4, -93.4], jump: 30, within: 0.3, run: false, max: 300 }, { wait: 60 }, { expect: 'nichtZiel' }] },
      { name: 'Giftnebel: wer auf der Krone stehen bleibt, stirbt im Nebel', from: [0, R4, -109.4], heroes: ['lotti'], expectAlive: false, invuln: false,
        legs: [{ to: [0, -112], within: 0.4, run: false }, { wait: 1500 }], mech: (r) => r.mech.death === 'gift', mechText: (r) => `Tod: ${r.mech.death}` },
      { name: 'Lava steigt: Glutbrücke nach ≈ 30 s geflutet, Warp-Terrasse bleibt trocken (Nebel hält darüber)', from: [0, R4, -109.4], heroes: ['lotti'],
        legs: [{ to: [0, -112], within: 0.4, run: false }, ...FLUCHT, { to: [18, -95.6], within: 0.4, run: false },
          { wait: 60 * 120 }, { expect: 'lavaHoch' }, { expect: 'brueckeGeflutet' }], mech: (r) => !r.dead, mechText: (r) => `Lava ${r.mech.lavaTop.toFixed(2)}, Nebel ${r.mech.nebel}` },
      { name: 'Neustart nach dem Nebel-Tod: Nebel wartet wieder, Lava unten, Checkpoint auf dem Vorhof', pre: [-3.5, G1, -92.2], from: [0, R4, -109.4], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -112], within: 0.4, run: false }, { wait: 1500 }, { until: 'lebt', max: 900 }, { wait: 60 }, { expect: 'nebelWartet' }, { expect: 'lavaUnten' }, { expect: 'amCheckpoint' }],
        mech: (r) => r.mech.death === 'gift', mechText: (r) => `Tod: ${r.mech.death}` },
    ],
    shots: [
      ['start', [0, E0, 9]],
      ['stampf1', [2.6, E0, -7.2]],
      ['etage1', [-2, E1, -15]],
      ['aufzug1', [-8, E1, -20]],
      ['etage2', [-7, E2, -26]],
      ['faehre', [6, E2, -27]],
      ['pfeiler', [10.5, E2, -28]],
      ['etage3', [2, E3, -36]],
      ['spitze', [0, TOP, -47]],
      ['spitzeVorn', [-4, TOP, -43]],
      ['wolke', [-5, TOP, -47, 0, Math.PI]],
      ['seilbahn', [0, TOP, -56.2], 360],
      ['vorhof', [0, G1, -92]],
      ['ring1', [...[ring(-40, 11.2)].map((p) => [p[0], R1, p[1]])[0]]],
      ['ring2', [...[ring(-60, 8.6)].map((p) => [p[0], R2, p[1]])[0]]],
      ['ring3', [...[ring(-40, 5.6)].map((p) => [p[0], R3, p[1]])[0]]],
      ['krone', [0, R4, -109.8]],
      ['flucht', [...[ring(45, 8.0)].map((p) => [p[0], R2, p[1]])[0]], 0, null, Math.PI / 2, 'flucht'],
      ['bruecke', [12, 15.4, -93]],
      ['warp', [17.6, WT, -91]],
      ['ziel', [0, GOAL, -141]],
    ],
  },
  '7-Kapitän': {
    start: [10, 0, 12],
    meta: { stars: 5, stamp: false, time: 400, theme: 'lavamachine', music: 'course_diorama', archetype: 'diorama' },
    enemies: { stampfstein: 3, kanone_turm: 2 },
    // alle fünf Sterne in einem Lauf (der fünfte beendet das Level)
    main: [
      { name: 'Stern 1: Stampfstein am Lavagraben herunterlocken', to: [-4.65, 10], within: 0.2, slow: 0.6 },
      { until: 'kStampf1Liegt', max: 600 },
      { name: 'über den Stein auf die Insel', to: [-11, 10], within: 0.4 },
      { expect: 'kStern0' },
      { to: [-7.4, 10], within: 0.2, slow: 0.6 },
      { until: 'kStampf1Liegt', max: 900 },
      { name: 'zurück über den Stein', to: [-3.6, 9.4], within: 0.4 },
      { name: 'Stern 3: an den Rand des Förderbands', to: [0, 6.5], within: 0.3, slow: 0.6 },
      { until: 'band1Frei', max: 1200 },
      { name: 'gegen das Band zum Stern', to: [0, -3], within: 0.5, full: true },
      { expect: 'kStern2' },
      { name: 'Maschinenboden', to: [0, -7.4], within: 0.4 },
      { name: 'Stern 4: Stampfstein 2 herunterlocken', to: [4.1, -7.5], within: 0.2, slow: 0.5 },
      { until: 'kStampf2Liegt', max: 600 },
      { name: 'auf den Stein, mit hinauf', to: [4.1, -9.1], within: 0.3, slow: 0.6 },
      { until: 'kStampf2Oben', max: 900 },
      { expect: 'kStern3' },
      { name: 'aufs Deck', to: [4.4, -11.8], within: 0.4 },
      { name: 'Stern 2: Fahrplattform', to: [6.7, -15.9], within: 0.4, slow: 0.7 },
      { until: 'kFahrtOben', max: 900 },
      { name: 'Kesselturm-Dach', to: [9.6, -15.4], within: 0.4 },
      { name: 'ins Loch im Dach', to: [10, -11], within: 0.4 },
      { name: 'aus der Kesselkammer aufs Deck', to: [7, -11.2], within: 0.4 },
      { expect: 'kStern1' },
      { to: [3.4, -12], within: 0.4 },
      { until: 'kanone2Vorbei', max: 1200 },
      { name: 'Stern 5: zum Durchgang im Maschinenblock', to: [-2, -12], within: 0.5 },
      { to: [-10, -12.1], within: 0.4 },
      { name: 'durch das Loch', to: [-10, -15.2], within: 0.4 },
      { to: [-7.45, -16.5], within: 0.2, slow: 0.5 },
      { until: 'kStampf3Liegt', max: 600 },
      { name: 'auf Stampfstein 3, hinauf aufs Dach', to: [-6, -16.4], within: 0.3, slow: 0.6 },
      { until: 'kStampf3Oben', max: 900 },
      { to: [-6.4, -14.2], within: 0.4 },
      { name: 'in den Schacht fallen', to: [-12.1, -13.8], within: 0.4 },
      { until: 'fertig', max: 900 },
    ],
    routeChecks: [
      { name: 'fünf Sterne, Schatz gefunden (Level beendet)', ok: (r) => r.rt.stars.filter(Boolean).length === 5 && (r.status === 'done' || r.status === 'goal') },
      { name: 'zwei Stampfstein-Fahrten und die Fahrplattform', ok: (r) => r.mech.stampfFahrten >= 2 && r.mech.fahrt >= 1 },
      { name: 'ohne Treffer (Projektilköpfe abgewartet)', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 1: Stampfstein als Brücke über den Lavagraben zur Insel', star: 0, from: [-3, 0, 10.4], heroes: ['lotti'],
        legs: [{ to: [-4.65, 10], within: 0.2, slow: 0.6 }, { until: 'kStampf1Liegt', max: 600 }, { to: [-11, 10], within: 0.4 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Stein (Graben = Lava)', star: 0, expectNot: true, from: [-3, 0, 12.6], heroes: ['lotti'], invuln: false,
        legs: [{ to: [-11, 12.6], within: 0.4, max: 600 }, { wait: 60 }], mech: (r) => r.mech.death === 'lava', mechText: (r) => `Tod: ${r.mech.death}` },
      { name: 'Stern 3: gegen das Förderband laufen (Projektilkopf abwarten)', star: 2, from: [0, 0, 7], heroes: ['lotti'],
        legs: [{ to: [0, 6.5], within: 0.3, slow: 0.6 }, { until: 'band1Frei', max: 1200 }, { to: [0, -3], within: 0.5, full: true }], shot: 'stern3' },
      { name: 'Stern 3: wer auf dem Band stehen bleibt, wird zurück zum Start getragen', star: 2, expectNot: true, from: [0, 0, 3.5], heroes: ['lotti'],
        legs: [{ wait: 420 }, { expect: 'zurueckAmStart' }] },
      { name: 'Stern 4: Stampfstein 2 locken, draufgehen, mitfahren', star: 3, from: [1, 0, -7.4], heroes: ['lotti'],
        legs: [{ to: [4.1, -7.5], within: 0.2, slow: 0.5 }, { until: 'kStampf2Liegt', max: 600 }, { to: [4.1, -9.1], within: 0.3, slow: 0.6 }, { until: 'kStampf2Oben', max: 900 }], shot: 'stern4' },
      { name: 'Stern 4 nicht ohne Stein (vom Boden aus zu hoch)', star: 3, expectNot: true, from: [4.1, 0, -6.4], heroes: ['lotti'],
        legs: [{ to: [4.1, -6.6], within: 0.2, slow: 0.5, max: 200 }, { wait: 30 }, { to: [4.1, -5.6], within: 0.3 }, { wait: 600 }] },
      { name: 'Stern 2: Fahrplattform aufs Kesselturm-Dach, ins Loch fallen', star: 1, from: [5, 4.5, -13.4], heroes: ['lotti'],
        legs: [{ to: [6.7, -15.9], within: 0.4, slow: 0.7 }, { until: 'kFahrtOben', max: 900 }, { to: [9.6, -15.4], within: 0.4 }, { to: [10, -11], within: 0.4 }, { to: [7, -11.2], within: 0.4 }], shot: 'stern2' },
      { name: 'Stern 2 nicht durch die Kammertür (Stufe zu hoch für Krümel)', star: 1, expectNot: true, from: [6.6, 4.5, -11], heroes: ['lotti'],
        legs: [{ to: [10, -11], within: 0.4, max: 360 }, { wait: 30 }] },
      { name: 'Stern 5: durch das Loch im Maschinenblock, Stampfstein hinauf, in den Schacht fallen', star: 4, from: [-8, 4.5, -11.8], heroes: ['lotti'],
        legs: [{ to: [-10, -12.1], within: 0.4 }, { to: [-10, -15.2], within: 0.4 }, { to: [-7.45, -16.5], within: 0.2, slow: 0.5 }, { until: 'kStampf3Liegt', max: 600 },
          { to: [-6, -16.4], within: 0.3, slow: 0.6 }, { until: 'kStampf3Oben', max: 900 }, { to: [-6.4, -14.2], within: 0.4 }, { to: [-12.1, -13.8], within: 0.4 }, { wait: 60 }], shot: 'stern5' },
      { name: 'Stern 5 nicht durch die Schachttür (Stern hängt zu hoch)', star: 4, expectNot: true, from: [-12.1, 4.5, -11.4], heroes: ['lotti'],
        legs: [{ to: [-12.1, -14.4], within: 0.4, max: 400 }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Krümel springt nicht', from: [10, 0, 10], heroes: ['lotti'],
        legs: [{ hop: 40 }, { expect: 'keinSprung' }] },
      { name: 'Projektilkopf trifft Krümel, der ohne Warten übers Band läuft', from: [0, 0, 6.6], heroes: ['lotti'], invuln: false,
        legs: [{ until: 'kanone1Feuert', max: 1200 }, { wait: 380 }, { push: 420, dir: [0, -1] }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts} (${r.mech.hurtList[0] ?? ''})` },
      { name: 'Stampfstein trifft Krümel, der darunter stehen bleibt', from: [-3, 0, 10], heroes: ['lotti'], invuln: false,
        legs: [{ to: [-5.0, 10], within: 0.15, slow: 0.4 }, { wait: 240 }], mech: (r) => r.mech.hurts > 0 || r.mech.death, mechText: (r) => `Treffer ${r.mech.hurts}, Tod ${r.mech.death ?? '-'}` },
    ],
    shots: [
      ['start', [10, 0, 12]],
      ['graben', [-3.6, 0, 10]],
      ['band', [0, 0, 5.5]],
      ['maschinenboden', [1, 0, -7.4]],
      ['deck', [2, 4.5, -11.5]],
      ['kesseldach', [9.4, 9, -15.4]],
      ['durchgang', [-8, 4.5, -11.8]],
      ['hof', [-8.4, 4.5, -16.6]],
      ['blockdach', [-7, 9, -14]],
      ['nah', [-3, 0, 10], 0, null, Math.PI / 2, 'nah'],
    ],
  },
  '7-6': {
    start: [0, 1, 10],
    meta: { stars: 3, time: 400, theme: 'reef', music: 'course_rammreef', archetype: 'parcours' },
    enemies: { rammfisch: 10, wutkaulquappe: 3, kiste_wasser: 7, stachelkugel: 1 },
    main: [
      { name: 'ins Wasser', to: [0, 1.5], within: 0.6 },
      { name: 'Kammer A: abtauchen', swim: [1, -6.8, -12], within: 0.8, withinY: 0.8 },
      { swim: [-0.5, -6.9, -21.6], within: 0.5, withinY: 0.5 },
      { name: 'Kistentunnel Riffwand 1', swim: [-0.5, -6.9, -27.6], within: 0.8, max: 1500, full: true },
      { name: 'Kammer B', swim: [0, -3, -38], within: 1.0, withinY: 1 },
      { swim: [0, -3, -52.6], within: 0.6, withinY: 0.8 },
      { clearFish: ['rf2', 'rf3'], x: 0, minDx: 5, depth: -3, max: 3600 },
      { swim: [0, -6.9, -53.6], within: 0.6, withinY: 0.5, full: true },
      { name: 'Kistentunnel Riffwand 2', swim: [0, -6.9, -59.4], within: 0.8, max: 1500, full: true },
      { name: 'Kammer C (Zickzack)', swim: [5, -2.6, -61.5], within: 1, withinY: 1, full: true },
      { swim: [11.5, -2.6, -61.5], within: 1, withinY: 1 },
      { swim: [11.5, -2.6, -69.5], within: 1, withinY: 1 },
      { swim: [-11.5, -2.6, -69.5], within: 1, withinY: 1 },
      { swim: [-11.5, -2.6, -78], within: 1, withinY: 1 },
      { swim: [11.5, -2.6, -78], within: 1, withinY: 1 },
      { swim: [11.5, -2.4, -85.4], within: 1, withinY: 1 },
      { name: 'über die Sandrampe auf die Felsplattform', swim: [1.5, -0.5, -85.2], within: 0.8, withinY: 1.4, soft: true, max: 600 },
      { to: [1, -89], within: 0.6, run: false },
      { name: 'Warp-Box zur Vulkaninsel', warp: [0, -90.4] },
      { expect: 'vInsel' },
      { name: 'Checkpoint', to: [3.2, -104], within: 0.6 },
      { to: [4.2, -112], within: 0.6 },
      { to: [4.2, -126], within: 0.6 },
      { to: [0, -131.4], within: 0.4, run: false },
      { name: 'Trittstein', to: [0, -136], jump: 20, within: 0.5, run: false },
      { name: 'über Becken 2', to: [0, -141], jump: 20, within: 0.6, run: false },
      { to: [2, -156], within: 0.6 },
      { name: 'von der Klippe ins Finale', to: [2, -163], within: 0.8, run: false },
      { swim: [-3.4, -2.6, -174], within: 0.6, withinY: 0.6 },
      { fishLow: 'rf_v1', below: -5, hold: [-3.4, -174], depth: -2.6 },
      { name: 'durch das Fenster (Rammfisch unten)', swim: [-3.4, -2.6, -184], within: 0.8, withinY: 1, full: true },
      { name: 'unter den großen Rammfischen durch', swim: [0, -7.2, -196], within: 1, withinY: 1 },
      { swim: [0, -7.2, -204], within: 1, withinY: 1, full: true },
      { name: 'zum Zielriff auftauchen', swim: [0, -1.6, -206.4], within: 0.8, withinY: 1, full: true },
      { swim: [0, -0.6, -209.6], within: 0.8, withinY: 1.4, soft: true, max: 600 },
      { name: 'Sandrampe hinauf aufs Zielriff', to: [0, -216], within: 0.6, run: false },
      { name: 'Zielmast', to: [6, -235.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Kistentunnel durch Schwimmstoß geöffnet (4 Kisten), Warp-Box zur Vulkaninsel', ok: (r) => r.mech.kisten >= 4 && r.mech.warps === 1 },
      { name: 'Treffer-Versuche höchstens 2 (Rammfische und Kaulquappen meist umschwommen)', ok: (r) => r.mech.hurts <= 2 },
    ],
    targets: [
      { name: 'Stern 0: Kisten vor der Nische mit dem Schwimmstoß zerbrechen', star: 0, from: [0, 1, 2],
        legs: [{ swim: [-9.6, -7.2, -8], within: 0.6, withinY: 0.6 }, { name: 'Schwimmstoß in die Kisten', swim: [-14.2, -7.4, -8], within: 0.7, withinY: 0.8, full: true, max: 900 }], shot: 'stern0' },
      { name: 'Stern 0 nicht mit langsamem Schwimmen (Kisten halten)', star: 0, expectNot: true, from: [0, 1, 2], heroes: ['lotti'],
        legs: [{ swim: [-10, -7.2, -8], within: 0.6, withinY: 0.6 }, { swim: [-10.2, -7.3, -8], within: 0.4, withinY: 0.25, slow: 0.3 }, { swim: [-14.2, -7.3, -8], within: 0.7, withinY: 0.8, slow: 0.35, noStroke: true, max: 600, soft: true }, { wait: 60 }], mech: (r) => r.mech.kisten === 0, mechText: (r) => `Kisten zerbrochen ${r.mech.kisten}` },
      { name: 'Stern 1: der Rammfisch trägt ihn in einer Blase – von oben anschwimmen', star: 1, from: [0, -3, -34],
        legs: [{ swimTo: 'star', index: 1, dy: 0.45, within: 0.5, withinY: 0.6, max: 1500, full: true }, { wait: 20 }], shot: 'stern1' },
      { name: 'Stern 2: Funkenblüte aus dem ?-Block, Stachelkugel in der Glasröhre verbrennen', star: 2, from: [-14.4, 1, -214.8],
        legs: [{ to: [-14.4, -216.6], within: 0.2, run: false }, { hop: 20 }, { to: [-14.4, -215.2], within: 0.2, run: false, slow: 0.5 }, { climbOnto: [-14.4, -216.6, 4.0] },
          { chaseKind: 'powerup', max: 300 }, { expect: 'funken' }, { to: [-13.4, -219], within: 0.2, run: false }, { fire: [1, 0], until2: 'kugelWeg', max: 1200 },
          { expect: 'kugelWeg' }, { to: [-5, -219], within: 0.4, run: false }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Funkenblüte (Stachelkugel versperrt die Röhre)', star: 2, expectNot: true, from: [-13.4, 1, -219], heroes: ['lotti'], invuln: false,
        legs: [{ to: [-5, -219], within: 0.4, run: false, max: 600 }, { wait: 60 }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Stempel: durchs Fenster (Rammfisch unten) und hinab auf den Felsturm', stamp: true, from: [3.4, -2.5, -173],
        legs: [{ fishLow: 'rf_v2', below: -5, hold: [3.4, -174], depth: -2 }, { swim: [3.4, -1.6, -182.4], within: 0.7, withinY: 1, full: true }, { swim: [3.4, -2.2, -184], within: 0.5, withinY: 0.5 }, { wait: 30 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Extraleben: Kiste am Rand von Kammer B', from: [10, -3, -40.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ swim: [12.4, -7.4, -40.6], within: 0.6, withinY: 0.6 }, { swim: [14.6, -7.4, -40.6], within: 0.6, withinY: 0.8, full: true, soft: true, max: 300 }, { wait: 60 }, { swimTo: 'powerup', within: 0.4, withinY: 0.8, max: 900, soft: true }] },
      { name: 'Extraleben: unsichtbarer Block auf der Vulkaninsel', from: [6, 1.2, -106.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6, -108], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Rammfisch rammt die Figur in seiner Tiefe', from: [-8, -6, -78], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ swim: [8, -6, -78], within: 0.8, withinY: 1, max: 900, soft: true }, { wait: 240 }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts} (${r.mech.hurtList[0] ?? ''})` },
      { name: 'Wutkaulquappe stößt die Figur im Gezeitenbecken', from: [-3, 0.2, -136], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ wait: 600 }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts} (${r.mech.hurtList[0] ?? ''})` },
      { name: 'Checkpoint auf der Vulkaninsel: nach einem Tod im Finale geht es dort weiter', pre: [3.2, 1.2, -104], from: [2, 1.2, -156], heroes: ['lotti'], invuln: false,
        legs: [{ to: [2, -163], within: 0.8, run: false }, { swim: [0, -3, -170], within: 0.6, withinY: 0.8 }, { die: 'test' }, { wait: 300 }, { until: 'lebt', max: 900 }, { wait: 30 }, { expect: 'amInselCheckpoint' }] },
    ],
    shots: [
      ['start', [0, 1, 9]],
      ['kammerA', [0, -4, -6]],
      ['nische', [-9, -6.5, -8]],
      ['wand1', [-0.5, -6.5, -19]],
      ['kammerB', [0, -4, -34]],
      ['wand2', [0, -6.5, -51]],
      ['kammerC', [0, -4, -69.5]],
      ['warp', [0, 1, -87]],
      ['insel', [0, 1.2, -104]],
      ['becken', [0, 1.2, -128]],
      ['feuerberg', [0, 1.2, -146]],
      ['finale', [0, -3, -168]],
      ['fenster', [0, -4, -174]],
      ['grosse', [0, -2.5, -195]],
      ['glasroehre', [-13, 1, -217.5]],
      ['ziel', [4, 1, -228]],
    ],
  },
};

const PORT = 4730;
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
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id);
  const named = (id) => L.named.get(id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const lava = () => named('glutsee');
  const E3 = 18, G1 = 20, WT = 16.8, R1 = 25;   // Maße 7-5 (in der Seite)
  const COND = {
    // 7-5
    stampf1Liegt: () => ent('stampf1')?.state === 'land',
    stampf2Liegt: () => ent('stampf2')?.state === 'land',
    stampf3Liegt: () => ent('stampf3')?.state === 'land',
    aufStampf1: () => P().ground?.owner === ent('stampf1'),
    stampf1Oben: () => ent('stampf1')?.state === 'wait' && P().pos.y > 5.8,
    stampf2Oben: () => ent('stampf2')?.state === 'wait' && P().pos.y > 23.8,
    stampf3Oben: () => ent('stampf3')?.state === 'wait' && P().pos.y > 39.8,
    lift1Oben: () => named('aufzug1')?.state === 'ende',
    lift2Oben: () => named('aufzug2')?.state === 'ende',
    faehreLinks: () => { const h = named('faehre'); return h && h.pm.s < 0.15; },
    faehreRechts: () => { const h = named('faehre'); return h && h.pm.s > h.pm.length - 0.15; },
    inGondel: () => P().ground?.tag === 'seilbahn',
    gondelDruben: () => { const g = named('gondel'); return g && g.u >= 0.999 && g.state === 'wait'; },
    // Pfeilplattform gerade eben ganz oben (Übergang beobachtet – dann bleibt genug Zeit für zwei Sprünge)
    pfeilOben: (() => { let prev = null; return () => { const s = named('pfeil')?.state; const ok = s === 'oben' && prev !== null && prev !== 'oben'; prev = s; return ok; }; })(),
    keys5: () => (L.keys?.tor?.n ?? 0) >= 5,
    nebelAn: () => ['verzoegert', 'jagt'].includes(named('nebel')?.state),
    nebelWartet: () => named('nebel')?.state === 'wartet',
    zielterrasse: () => at(-8, 8, 29.5, -134, -158),
    nichtZiel: () => !at(-8, 8, 29.5, -134, -158),
    krallen: () => P().power === 'krallen',
    aufPfeiler: () => P().pos.y > 26.8 && P().pos.x > 12 && P().mode === 'ground',
    sternKroetenVersteckt: () => { const s = L.entities.find((e) => e.kind === 'star' && e.index === 1); return !!s && s.hidden; },
    sternKroeten: () => { const s = L.entities.find((e) => e.kind === 'star' && e.index === 1); return !!s && !s.hidden; },
    aufWuerfel: () => P().pos.y > R1 + 2.9,
    aufWolke: () => P().ground?.tag === 'cloud',
    wolkeUnten: () => named('wolkenfahrt')?.state === 'ende',
    etage3: () => at(-9, 12, E3 - 0.2, -32, -42),
    lavaHoch: () => (lava()?.top ?? -99) > 15.6,
    lavaUnten: () => (lava()?.top ?? 99) < 0,
    brueckeGeflutet: () => (lava()?.top ?? -99) > 15.4 + 0.15 && (lava()?.top ?? 99) < WT,
    lebt: () => !P().dead && L.runtime.status === 'play',
    // 7-Kapitän
    kStampf1Liegt: () => ent('stampf1')?.state === 'land',
    kStampf2Liegt: () => ent('stampf2')?.state === 'land',
    kStampf3Liegt: () => ent('stampf3')?.state === 'land',
    kStampf2Oben: () => ent('stampf2')?.state === 'wait' && P().pos.y > 4.4,
    kStampf3Oben: () => ent('stampf3')?.state === 'wait' && P().pos.y > 8.9,
    kFahrtOben: () => named('fahrt')?.state === 'ende',
    kStern0: () => !!L.runtime.stars[0], kStern1: () => !!L.runtime.stars[1], kStern2: () => !!L.runtime.stars[2], kStern3: () => !!L.runtime.stars[3],
    // Projektilkopf der Kanone 1 gerade über dem Band → dahinter ist bis zum nächsten Schuss Zeit
    band1Frei: () => L.entities.some((e) => e.kind === 'projektilkopf' && e.alive && !e.removed && e.owner === ent('kanone1') && e.pos.x > -1.8 && e.pos.x < 3),
    kanone1Feuert: () => L.entities.some((e) => e.kind === 'projektilkopf' && e.alive && !e.removed && e.owner === ent('kanone1') && e.pos.x < -7),
    kanone2Vorbei: () => L.entities.some((e) => e.kind === 'projektilkopf' && e.alive && !e.removed && e.owner === ent('kanone2') && e.pos.z > -11.2),
    zurueckAmStart: () => P().pos.z > 6.2 && !P().dead,
    keinSprung: () => P().pos.y < 0.3,
    fertig: () => L.runtime.status === 'done' || L.runtime.status === 'goal',
    // 7-6
    vInsel: () => P().pos.z < -97 && P().pos.z > -112 && P().pos.y > 0.9,
    kugelWeg: () => { const e = L.entities.find((x) => x.spec?.id === 'seeigel'); return !e || !e.alive || e.removed; },
    funken: () => P().power === 'funken',
    amInselCheckpoint: () => at(-18, 18, 0.9, -95, -112),
    amCheckpoint: () => at(-10, 10, G1 - 0.2, -88, -99),
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
      const mech = { hurts: 0, keys: 0, warps: 0, rides: 0, stampfFahrten: 0, aufzug: 0, gondel: false, feder: false, hurtList: [], lavaTop: -99, nebel: null, flucht: null };
      let fogT0 = null;
      const kisten0 = L.entities.filter((e) => e.kind === 'kiste_wasser' && e.alive && !e.removed);
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let lastStampf = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        const g = p.ground;
        if (p.mode === 'ground' && g?.tag === 'stampfstein' && g.owner !== lastStampf && g.owner?.state === 'rise') { lastStampf = g.owner; mech.stampfFahrten++; }
        if (p.mode === 'ground' && g?.tag === 'seilbahn') mech.gondel = true;
        if (p.vel.y > 15 && p.pos.y > 24 && p.pos.y < 27) mech.feder = true;
        if (fogT0 === null && ['verzoegert', 'jagt'].includes(named('nebel')?.state)) fogT0 = steps;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2.5) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; mech.death = p.deathCause; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && p.mode !== 'swim' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if ((p.dead || L.runtime.status !== 'play') && !(Lg.until === 'lebt' || (Lg.wait && o.waitDead))) break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait && (!p.dead || o.waitDead); i++) tick({}); continue; }
        if (Lg.die) { p.die(Lg.die); log.push(['tot (Test)', Lg.die]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) {
          let k = 0, ok = false;
          for (; k < (Lg.max ?? 1200); k++) { if (COND[Lg.until]()) { ok = true; break; } tick({}); }
          log.push(['bis', Lg.until, k]);
          if (!ok) log.push(['FEHLER: bis', Lg.until]);
          continue;
        }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground' && p.mode !== 'swim'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.push) {
          const holdJ = Lg.jump ?? 0;
          for (let k = 0; k < Lg.push; k++) { if (Lg.stopIf && COND[Lg.stopIf]()) break; tick({ ...this.stick(Lg.dir[0], Lg.dir[1]), run: false, jump: k < holdJ }); }
          log.push([Lg.name ?? `drücken${li}`, Lg.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.climbOnto) {
          // senkrecht hochspringen, erst über der Oberkante zum Ziel lenken
          const [cx, cz, top] = Lg.climbOnto;
          let k = 0, left = false;
          for (; k < 300; k++) {
            const above = p.pos.y > top + 0.15;
            tick({ ...(p.mode === 'air' && above ? this.airSteer(cx, cz, 0, 0, 3.5, 6) : {}), jump: k < 40, run: false });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') break;
          }
          log.push(['hinauf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          continue;
        }
        if (Lg.poundAt) {
          const [tx2, tz2] = Lg.poundAt;
          let k = 0, pounding = false;
          for (; k < 300; k++) {
            const dx = tx2 - p.pos.x, dz = tz2 - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.3 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx2, tz2, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 26, run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) {
          const filter = Lg.filter ? (e) => e.spec?.power === Lg.filter || e.power === Lg.filter || e.spec?.id === Lg.filter : null;
          const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter });
          log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]);
          continue;
        }
        // ------------------------------------------------ Zauberkröten: sichtbare anspringen, sonst zur Mitte und warten
        if (Lg.toads) {
          const list = () => Lg.toads.map((id) => L.entities.find((e) => e.spec?.id === id)).filter((e) => e && e.alive && !e.removed && !e.defeated);
          let k = 0;
          const home = Lg.home ?? [0, -48];
          for (; k < (Lg.max ?? 6000) && list().length && !p.dead; k++) {
            const vis = list().filter((e) => e.touch && (e.state === 'appear' || e.state === 'cast' || e.state === 'linger'));
            vis.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = vis[0];
            if (!e) {
              if (p.mode === 'air') { tick({}); continue; }
              const dx = home[0] - p.pos.x, dz = home[1] - p.pos.z, d = Math.hypot(dx, dz);
              tick(d > 0.6 ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {});
              continue;
            }
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'air') { tick({ ...this.airSteer(e.pos.x, e.pos.z, 0, 0, 4, 8), jump: p.vel.y > 0 }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: d > 3, jump: d < 2.4 });
          }
          log.push(['kröten', k, list().length, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (list().length) log.push(['FEHLER: Zauberkröten übrig', list().length]);
          continue;
        }
        // ------------------------------------------------ Schwimmen zu [x, y, z] (Ducken taucht ab, Sprung/gehalten steigt)
        if (Lg.swim || Lg.swimTo) {
          const target = () => {
            if (Lg.swim) return Lg.swim;
            const e = L.entities.find((x) => x.kind === Lg.swimTo && x.alive && !x.removed && !x.hidden && (Lg.index === undefined || x.index === Lg.index));
            return e ? [e.pos.x, e.pos.y + (Lg.dy ?? 0.2), e.pos.z] : null;
          };
          let i = 0, ok = false;
          for (; i < (Lg.max ?? 1200) && !p.dead && L.runtime.status === 'play'; i++) {
            const t = target();
            if (!t) { ok = true; break; }
            const [tx, ty, tz] = t;
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const dy = ty - p.pos.y;
            if (d < (Lg.within ?? 0.6) && Math.abs(dy) < (Lg.withinY ?? 0.7)) { ok = true; break; }
            if (Lg.stopIf && COND[Lg.stopIf]()) { ok = true; break; }
            const st = d > 0.05 ? this.stick(dx, dz, Lg.slow ?? (d < 0.8 && !Lg.full ? Math.max(0.3, d / 0.8) : 1)) : { x: 0, y: 0 };
            if (p.mode !== 'swim') { tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : st), run: false }); continue; }
            const headDepth = (p.water?.top ?? 0) - (p.pos.y + p.half.y * 2);
            let crouch = false, jump = false;
            if (dy < -0.35) crouch = true;
            else if (Lg.noStroke) jump = false;                            // ohne Schwimmzüge (langsam sinken)
            else if (dy > 0.5) jump = (i % 18) < 3 && headDepth > 0.5;   // Schwimmzug (nicht an der Oberfläche: sonst Aussprung)
            else if (p.diving) jump = dy > -0.1 && headDepth > 0.3;       // schweben: gehalten langsam steigen
            tick({ ...st, crouch, jump, run: false });
          }
          log.push([Lg.name ?? `schwimm${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          if (!ok && !Lg.soft) { log.push(['FEHLER: Schwimmziel nicht erreicht', li, JSON.stringify(Lg.swim ?? Lg.swimTo)]); break; }
          continue;
        }
        // ------------------------------------------------ warten, bis die genannten Rammfische seitlich weit genug weg sind (Tiefe halten)
        if (Lg.clearFish) {
          const fish = Lg.clearFish.map((id) => L.entities.find((x) => x.spec?.id === id)).filter(Boolean);
          let k = 0;
          const far = () => fish.every((e) => !e.alive || e.removed || Math.abs(e.pos.x - (Lg.x ?? 0)) > (Lg.minDx ?? 6));
          for (; k < (Lg.max ?? 2400) && !far(); k++) tick({ jump: p.diving && p.pos.y < (Lg.depth ?? -3) - 0.2, crouch: p.pos.y > (Lg.depth ?? -3) + 0.4 });
          log.push(['fische weg', Lg.clearFish.join(','), k]);
          continue;
        }
        // ------------------------------------------------ warten, bis ein auf und ab ziehender Rammfisch unten ist (und abwärts zieht)
        if (Lg.fishLow) {
          const e = L.entities.find((x) => x.spec?.id === Lg.fishLow);
          let k = 0, prev = e?.pos.y ?? 0;
          for (; k < (Lg.max ?? 1200); k++) {
            const y = e.pos.y, down = y < prev - 1e-4;
            prev = y;
            if (y < (Lg.below ?? -4.5) && down) break;
            const st = Lg.hold ? this.stick(Lg.hold[0] - p.pos.x, Lg.hold[1] - p.pos.z, Math.min(1, Math.hypot(Lg.hold[0] - p.pos.x, Lg.hold[1] - p.pos.z))) : {};
            tick({ ...st, jump: p.diving && p.pos.y < (Lg.depth ?? -2) - 0.2, crouch: p.pos.y > (Lg.depth ?? -2) + 0.4 });
          }
          log.push(['fisch unten', Lg.fishLow, k, +(e?.pos.y ?? 0).toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Funkenblüte: Feuerbälle in Richtung dir werfen, bis die Bedingung gilt
        if (Lg.fire) {
          let k = 0;
          for (; k < (Lg.max ?? 900) && !(Lg.until2 && COND[Lg.until2]()); k++) tick({ ...this.stick(Lg.fire[0], Lg.fire[1], k < 20 ? 0.2 : 0), action: k % 24 < 2 });
          log.push(['feuer', k, p.power]);
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
          if (rode) { mech.warps++; if (fogT0 !== null && mech.flucht === null) mech.flucht = +((steps - fogT0) / 120).toFixed(1); }
          log.push(['warp', `${Lg.warp}`, rode, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
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
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ && !Lg.full) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          let jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (Lg.hopping && p.mode === 'ground' && (i % 22) < 8) jump = true;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ, crouch: !!Lg.dive && p.mode === 'swim' });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.keys = L.keys?.tor?.n ?? 0;
      mech.aufzug = (named('aufzug1')?.trips ?? 0) + (named('aufzug2')?.trips ?? 0);
      mech.fahrt = named('fahrt')?.trips ?? 0;
      mech.kisten = kisten0.filter((e) => e.broken || e.removed || !e.alive).length;
      mech.lavaTop = lava()?.top ?? -99;
      mech.nebel = named('nebel')?.state ?? null;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
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
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
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
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? null; },
    cond: (k) => COND[k](),
    /** Giftnebel für ein Bild auslösen (Stimmung „flucht“, Front ein Stück herab). */
    fogShot: (steps = 600) => { const f = named('nebel'); f?.start(); const p = P(); for (let i = 0; i < steps; i++) { p.invuln = 99; c.step(1); } },
  };
  window.__w7 = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w7[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w7c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w7.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots ?? null }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const starsOk = meta.stars === R.meta.stars && (R.meta.stamp === false ? !kinds.stamp : kinds.stamp === 1);
    check(`${id}: ${R.meta.stars} Sterne${R.meta.stamp === false ? '' : ', Stempel'}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}, Welt 7`,
      starsOk && meta.world === 7 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
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
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
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
      await W('place', t.from, { hero, settle: 10 });
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
      if (t.pre) await W('place', t.pre, { hero, settle: 30 });   // Checkpoint vorher berühren
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln, waitDead: t.expectAlive === false || t.waitDead || !!t.pre });
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
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2, special = null] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (special === 'flucht') await W('fogShot', 900);
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
