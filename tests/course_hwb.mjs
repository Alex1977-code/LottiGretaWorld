// Halloween-Welt „Kürbisinsel“, Level H-Kapitän „Krümel im Kürbis-Kuddelmuddel“ (Diorama: Krümel trägt eine Laterne durchs
// Kürbislabyrinth, Geistertreppe am Riesenkürbis, Pfahl-Brücke) und H-3 „Gekicher auf dem Nebelfriedhof“ (Laternenlicht
// zeigt Geisterplattformen, Klapperknochen, Kreisgeister, Floß auf dem Glibberbach, blinkende Laternenpfähle,
// Grabstein-Schalter): Laden ohne Konsolenfehler/-warnungen, Daten (Welt 31, Thema, Musik, Zeit, Sterne, Stempel,
// Gegnerzahlen, Verkleidung), Routen-Bot (H-3: Lotti und Greta von Start bis Zielmast; H-Kapitän: Krümel, alle Sterne in
// einem Lauf) mit echter Eingabe (__course.setInput/step, Stick relativ zur Kamera-Gier – kein Teleport auf der Route),
// alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/hwb_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_hwb.mjs [H-Kapitän|H-3]
//   PARTS=load,route,targets,extra,sweep,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text|Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt. Die Figur ist auf der Route unverwundbar (Berührungen werden gezählt),
// damit Geometrie und Mechanik geprüft werden; Gegenproben laufen ohne den Bot-Schutz, wo es darauf ankommt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const ROUTES = {};

// =====================================================================================================================
// H-Kapitän „Krümel im Kürbis-Kuddelmuddel“ (Diorama, Thema pumpkin_night)
// =====================================================================================================================
{
  const YT = 2.5;
  // Labyrinth: Zellmitten (Spalte c von links, Zeile r von vorn) – wie im Level (x0 −13, z0 12, Zelle 2,6 m)
  const C = (c, r) => [-13 + 2.6 * (c + 0.5), 12 - 2.6 * (r + 0.5)];
  const TO_FIELD = [{ name: 'Geistersteg (Laternenlicht)', to: [7.5, 13.0], within: 0.3 }, { to: [7.0, 11.2], within: 0.35 }];
  const MAZE = [{ to: [1.2, C(4, 0)[1]], within: 0.3 }, { name: 'Labyrinth-Eingang', to: C(4, 0), within: 0.3 }, { to: C(0, 0), within: 0.3 }, { to: C(0, 4), within: 0.3 },
    { to: C(4, 4), within: 0.3 }, { to: C(4, 3), within: 0.3 }, { to: C(3, 3), within: 0.3 }, { to: C(3, 2), within: 0.3 }, { name: 'Herz des Labyrinths', to: C(2, 2), within: 0.3 }, { star: 0 }];
  const MAZE_OUT = [{ to: C(3, 2), within: 0.3 }, { to: C(3, 3), within: 0.3 }, { to: C(4, 3), within: 0.3 }, { to: C(4, 4), within: 0.3 }, { to: C(0, 4), within: 0.3 },
    { to: C(0, 0), within: 0.3 }, { to: C(4, 0), within: 0.3 }, { to: [1.4, C(4, 0)[1]], within: 0.3 }, { to: [10.9, 9.6], within: 0.35 }];
  const TO_TERRACE = [{ to: [10.9, 9.6], within: 0.35 }, { to: [10.9, 2.2], within: 0.3 }, { name: 'Rampe hinauf', to: [10.75, -4.7], within: 0.3 }];
  const STAIRS = [{ to: [9.4, -5.3], within: 0.35 }, { to: [-2.6, -5.3], within: 0.3 }, { to: [-2.9, -5.4], within: 0.2 }, { clear: 'kg_kuerbis', name: 'Kreisgeist hinter dem Kürbis abwarten' },
    { name: 'Geistertreppe vorn', to: [-11.0, -5.4], within: 0.2 }, { name: 'Geistertreppe links', to: [-11.0, -8.4], within: 0.2 }, { name: 'auf den Deckel', to: [-8.2, -8.7], within: 0.3 }, { star: 1 }];
  const STAIRS_DOWN = [{ to: [-11.0, -8.4], within: 0.2 }, { to: [-11.0, -5.4], within: 0.2 }, { to: [-3.0, -5.4], within: 0.25 }, { to: [-2.4, -5.3], within: 0.3 }];
  const BRIDGE = [{ to: [9.6, -5.6], within: 0.35 }, { to: [13.0, -8.0], within: 0.2 }, { light: 'pfahl', name: 'warten, bis der Laternenpfahl brennt' },
    { name: 'Pfahl-Brücke', to: [18.6, -8.0], within: 0.3 }, { star: 2 }];
  ROUTES['H-Kapitän'] = {
    kind: 'diorama',
    start: [8.6, 0, 20.4],
    orbit: 16,
    meta: { stars: 3, time: 400, theme: 'pumpkin_night', music: 'course_diorama' },
    enemies: { kuerbling: 2, kreisgeist: 1, laternenpfahl: 1 },
    targets: [
      { name: 'Stern 1: Herz des Labyrinths (Laternensteg, richtiger Weg durch die Strohgänge)', star: 0, legs: [...TO_FIELD, ...MAZE], shot: 'herz' },
      { name: 'Stern 2: Geistertreppe am Riesenkürbis (nur im Laternenlicht, Kreisgeist abwarten) → Deckel', star: 1, legs: [...TO_FIELD, ...TO_TERRACE, ...STAIRS], shot: 'kuerbis' },
      { name: 'Stern 3: Laternenpfahl brennt → blaue Pfahl-Brücke zur Vogelscheuchen-Insel', star: 2, legs: [...TO_FIELD, ...TO_TERRACE, ...BRIDGE], shot: 'insel' },
      { name: 'Gegenprobe: ohne Laterne ist der Geistersteg nicht da (Krümel fällt hinunter)', star: 0, expectNot: true, noLantern: true,
        legs: [{ to: [7.5, 13.0], within: 0.3, max: 500, autoJump: false }], check: '(L) => L.player.pos.y < -2 || L.player.dead' },
      { name: 'Gegenprobe: Pfahl-Brücke nicht, solange der Pfahl aus ist (die Handlaterne zeigt sie nicht)', star: 2, expectNot: true,
        legs: [...TO_FIELD, ...TO_TERRACE, { to: [9.6, -5.6], within: 0.35 }, { to: [13.0, -8.0], within: 0.2 }, { dark: 'pfahl' }, { to: [18.6, -8.0], within: 0.3, max: 400, autoJump: false }],
        check: '(L) => L.player.pos.y < 0 || L.player.dead' },
    ],
    allInOne: [...TO_FIELD, ...MAZE, ...MAZE_OUT, ...TO_TERRACE, ...STAIRS, ...STAIRS_DOWN, ...BRIDGE],
    extra: [
      { name: 'Kürbis winkt zurück (Sackgasse rechts im Labyrinth)', legs: [...TO_FIELD, { to: [1.2, C(4, 0)[1]], within: 0.3 }, { to: C(4, 0), within: 0.3 }, { to: C(1, 0), within: 0.3 },
        { to: C(1, 1), within: 0.3 }, { to: C(4, 1), within: 0.3 }, { to: [C(4, 2)[0], C(4, 2)[1] + 1.2], within: 0.3 }, { wait: 60 }], check: '(L) => L.named.get("winkekuerbis").info().waves >= 1', shot: 'winkt' },
      { name: 'Schatzstelle in der Sackgasse: Krümel buddelt 3 Bitcoins', legs: [...TO_FIELD, { to: [1.2, C(4, 0)[1]], within: 0.3 }, ...MAZE.slice(1, 4), { to: C(0, 2), within: 0.3 }, { to: C(1, 2), within: 0.3 },
        { to: C(1, 3), within: 0.3 }, { to: C(2, 3), within: 0.2 }, { wait: 240 }], check: '(L) => L.archetype.info().digs >= 1' },
    ],
    shots: [
      ['ueberblick', [8.6, 0, 20.4], 16, false],
      ['ueberblick_links', [8.6, 0, 20.4], -40, false],
      ['ueberblick_rechts', [8.6, 0, 20.4], 70, false],
      ['hinten', [8.6, 0, 20.4], 165, false],
      ['start', [8.6, 0, 20.4], 16, true],
      ['steg', [7.5, 0, 15.2], 16, true],
      ['labyrinth', [-6.5, 0, 8.1], 10, true],
      ['herz_nah', [-6.5, 0, 5.5], 30, true],
      ['treppe', [-6.0, 3.5, -5.4], 20, true],
      ['deckel', [-7.9, 5.0, -8.8], 35, true],
      ['scheune', [2.5, YT, -6.0], 0, true],
      ['pfahl', [13.0, YT, -8.0], 30, true],
    ],
  };
}

// =====================================================================================================================
// H-3 „Gekicher auf dem Nebelfriedhof“ (Parcours, Thema graveyard)
// =====================================================================================================================
{
  const Y = 1, PL = 2.5;
  const CREEK = [[0, -80], [0, -84], [3, -94], [-1, -106], [2, -116], [0, -127.6]];
  const GATE = [{ name: 'Laterne aufheben', to: [0, -5.4], within: 0.5 }, { expect: 'lantern' }];
  const DITCH = [{ to: [0, -12.4], within: 0.4, run: false }, { name: 'Geistersteg über den Nebelgraben', to: [0, -19.2], within: 0.5, run: false, autoJump: false }];
  const CHASM = [{ to: [0, -29.2], within: 0.35, run: false },
    { name: 'Geisterplatte 1', to: [0, -32.0], jump: 14, within: 0.7, run: false }, { name: 'Geisterplatte 2', to: [1.6, -35.4], jump: 26, within: 0.7, run: false },
    { name: 'Geisterplatte 3', to: [3.2, -38.8], jump: 26, within: 0.7, run: false }, { name: 'Grabinsel', to: [3.2, -42.4], jump: 24, within: 0.7, run: false },
    { to: [2.2, -47.8], within: 0.4, run: false }, { name: 'Geisterplatte 4', to: [2.0, -50.4], jump: 14, within: 0.7, run: false },
    { name: 'Geisterplatte 5', to: [0.0, -53.8], jump: 26, within: 0.7, run: false }, { name: 'Geisterplatte 6', to: [-2.0, -57.2], jump: 16, within: 0.7, run: false },
    { name: 'Geisterplatte 7', to: [-0.4, -60.4], jump: 16, within: 0.7, run: false }, { name: 'Steg am Glibberbach', to: [0, -64.0], jump: 16, within: 0.7, run: false }];
  const RAFT = [{ name: 'Checkpoint', to: [0, -66.2], within: 0.6 }, { to: [0, -71.2], within: 0.4, run: false }, { name: 'zu Pflaume aufs Floß', mount: [0, -75.5] }];
  const RIDE = (jump) => ({ name: 'Floßfahrt auf dem Glibberbach', ride: CREEK, ...(jump ? { jump: [[-110.6, -114.2]] } : {}) });
  const GRUFT = [{ to: [0, -139.2], within: 0.4, run: false }, { light: 'pfahl_schlucht', name: 'warten, bis der Laternenpfahl brennt' },
    { name: 'blaue Pfahl-Brücke', to: [0, -153.2], within: 0.6, autoJump: false }, { to: [0, -176.0], within: 0.6 },
    { to: [5.6, -178.8], within: 0.3, run: false }, { name: 'Grabstein-Schalter', to: [5.6, -180.4], jump: 30, within: 0.35, run: false }, { until: 'brueckeAn', max: 120 }];
  const HILL = [{ to: [0, -185.6], within: 0.4, run: false }, { name: 'Pfahl-Brücke zum Kapellenhügel', to: [0, -195.0], within: 0.6, autoJump: false },
    { name: 'Treppe hinauf', to: [0, -211.0], within: 0.6 }, { name: 'Zielmast', to: [3.4, -219.6], within: 0.2 }];
  const TOWER = [{ to: [-3.4, -224.4], within: 0.3, run: false }, { name: 'Stufe 1 (lila)', to: [-4.4, -227.0], jump: 22, within: 0.6, run: false }, { light: 'pfahl_turm' },
    { name: 'Stufe 2 (blau)', to: [-4.4, -230.6], jump: 26, within: 0.6, run: false }, { name: 'Stufe 3 (lila)', to: [-7.0, -232.0], jump: 26, within: 0.6, run: false },
    { light: 'pfahl_turm' }, { name: 'Stufe 4 (blau)', to: [-9.6, -230.6], jump: 26, within: 0.6, run: false }, { name: 'Stufe 5 (lila)', to: [-9.6, -227.4], jump: 26, within: 0.6, run: false },
    { light: 'pfahl_turm' }, { name: 'Stufe 6 (blau)', to: [-7.0, -226.0], jump: 26, within: 0.6, run: false }, { name: 'Turmspitze', to: [-7.0, -228.7], jump: 28, within: 0.6, run: false }, { stamp: true }];
  const SECRET = [{ to: [-7.6, -23.0], within: 0.4, run: false }, { to: [-8.6, -24.2], within: 0.3, run: false },
    { name: 'Geisterstufe A', to: [-10.4, -24.6], jump: 20, within: 0.6, run: false }, { name: 'Geisterstufe B', to: [-12.9, -25.4], jump: 28, within: 0.6, run: false },
    { name: 'Geisterstufe C', to: [-15.0, -24.4], jump: 28, within: 0.6, run: false }, { name: 'schwebende Gruft', to: [-18.2, -24.8], jump: 30, within: 0.6, run: false }];
  ROUTES['H-3'] = {
    kind: 'parcours',
    start: [0, Y, 5],
    meta: { stars: 3, time: 400, theme: 'graveyard', music: 'course_graveyard', archetype: 'parcours' },
    enemies: { klapperknochen: 8, kreisgeist: 2, kreisgeist_kreis: 1, kreisgeist_glied: 8, spuk: 1, flatterfledi: 3, laterne: 1, laternenpfahl: 3, grabstein_schalter: 1, raft: 1 },
    sections: [['1 Friedhofstor', 12, -30], ['2 Nebelschlucht', -30, -62], ['3 Glibberbach', -62, -140], ['4 Gruftgarten', -140, -194], ['5 Kapellenhügel', -194, -240]],
    sweepExtra: [[-5.5, Y, -84], [5.6, Y, -80], [-2, Y, -93], [-5, Y, -112], [7, Y, -118], [-9, Y, -165], [6, Y, -168], [-6, PL, -226], [-7, 8.1, -229]],
    main: [...GATE, ...DITCH, ...CHASM, ...RAFT, RIDE(false), ...GRUFT, ...HILL],
    routeChecks: [
      { name: 'Laterne getragen, Floßfahrt auf dem Glibberbach (Pflaume) bis ans Ende', ok: (r) => r.mech.ride > 120 * 8 },
      { name: 'auf den blinkenden Laternenpfahl gewartet (blaue Brücke nur im Pfahl-Licht)', ok: (r) => r.mech.lightWait > 0 },
    ],
    targets: [
      { name: 'Stern 0: kichernder Geist huscht hinter den Grabstein – unsichtbare Geisterstufen (Laterne) zur schwebenden Gruft', star: 0, from: [0, Y, -20],
        legs: [...SECRET, { star: 0 }], shot: 'stern0', check: '(L) => L.named.get("kichergeist").info().giggles >= 1' },
      { name: 'Gegenprobe Stern 0: ohne Laterne keine Stufen (Sprung ins Leere)', star: 0, expectNot: true, noLantern: true, from: [0, Y, -20], heroes: ['lotti'],
        legs: [SECRET[0], SECRET[1], { ...SECRET[2], max: 300 }, { wait: 120 }], check: '(L) => L.player.dead || L.player.pos.y < 0' },
      { name: 'Stern 1: über dem Glibberbach mit dem Floß hochhüpfen', star: 1, from: [0, Y, -70.6],
        legs: [{ to: [0, -71.2], within: 0.4, run: false }, { mount: [0, -75.5] }, RIDE(true)], shot: 'stern1', mechText: (r) => `Scheitel y ${(r.mech.maxRideY ?? 0).toFixed(2)}` },
      { name: 'Gegenprobe Stern 1: ohne Hüpfer bleibt der Stern hängen', star: 1, expectNot: true, from: [0, Y, -70.6], heroes: ['lotti'],
        legs: [{ to: [0, -71.2], within: 0.4, run: false }, { mount: [0, -75.5] }, RIDE(false)] },
      { name: 'Stern 2: Klappergarten – alle drei Klapperknochen mit der Stampfattacke auf den Knochenhaufen besiegen', star: 2, from: [0, Y, -160],
        legs: [{ to: [-2.8, -165.7], within: 0.4, run: false }, { to: [-6.2, -165.7], within: 0.5, run: false }, { bones: 'kg_' }, { star: 2 }], shot: 'stern2',
        mech: (r) => (r.mech.bones ?? []).length === 3, mechText: (r) => `besiegt ${(r.mech.bones ?? []).length}, Stampfer ${r.mech.pounds}` },
      { name: 'Gegenprobe Stern 2: nur draufspringen – die Klapperknochen bauen sich wieder auf, kein Stern', star: 2, expectNot: true, from: [0, Y, -160], heroes: ['lotti'],
        legs: [{ to: [-2.8, -165.7], within: 0.4, run: false }, { to: [-6.2, -165.7], within: 0.5, run: false }, { bones: 'kg_', noPound: true }, { wait: 600 }],
        check: '(L) => L.entities.filter((e) => e.kind === "klapperknochen" && /^kg_/.test(e.spec?.id ?? "") && !e.defeated && !e.removed).length === 3' },
      { name: 'Stempel: Glockenturm – lila Stufen (Laterne) und blaue Stufen (nur wenn der Turm-Pfahl brennt) im Wechsel', stamp: true, from: [-1.6, PL, -221.4],
        legs: TOWER, shot: 'stempel' },
      { name: 'Gegenprobe Stempel: blaue Stufe bei ausgeschaltetem Pfahl trägt nicht', stamp: true, expectNot: true, from: [-1.6, PL, -221.4], heroes: ['lotti'],
        legs: [TOWER[0], TOWER[1], { dark: 'pfahl_turm' }, { ...TOWER[3], max: 260 }, { wait: 90 }], check: '(L) => L.player.pos.y < 3.6' },
    ],
    extra: [
      { name: 'Nebelgraben: Hineinfallen ist harmlos (wieder hinausspringen)', from: [0, Y, -10], heroes: ['lotti'], noLantern: true,
        legs: [{ to: [0, -13.6], within: 0.5, run: false, autoJump: false, max: 200 }, { wait: 60 }, { to: [0, -15.5], within: 0.6, run: false }, { name: 'hinaus', to: [0, -19.0], jump: 34, within: 0.7, run: false }],
        check: '(L) => !L.player.dead && L.player.pos.y > 0.9 && L.player.pos.z < -18' },
      { name: 'Glibberbach: Hineinfallen = Neustart am Checkpoint', from: [0, Y, -63.6], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ name: 'Checkpoint', to: [0, -66.6], within: 0.5, run: false }, { to: [-5.2, -80], within: 0.5, run: false }, { to: [-5.2, -88], within: 0.4, run: false },
          { name: 'in den Glibber', to: [0, -88], jump: 12, within: 0.8, max: 300, lenient: true }], after: 900,
        check: '(L) => !L.player.dead && Math.abs(L.player.pos.z + 66) < 2.5' },
      { name: 'Gruft-Durchfahrt: zu Fuß führt kein Weg am Ufer entlang (Mauer)', from: [-4.5, Y, -88], heroes: ['lotti'],
        legs: [{ to: [-4.5, -104], within: 0.5, max: 500, lenient: true }], check: '(L) => L.player.pos.z > -97.2' },
      { name: 'Krümel winkt mit der Laterne vom Ufer, wenn das Floß vorbeifährt', from: [0, Y, -70.6], heroes: ['lotti'],
        legs: [{ to: [0, -71.2], within: 0.4, run: false }, { mount: [0, -75.5] }, RIDE(false)], check: '(L) => L.named.get("kruemel_ufer").info().cheers >= 1', shot: 'kruemel' },
      { name: 'Gegenprobe Grabstein-Schalter: ungedrückt bleibt der Pfahl aus, die blaue Brücke fehlt', from: [0, Y, -183.6], heroes: ['lotti'], expectAlive: false,
        legs: [{ to: [0, -185.4], within: 0.4, run: false }, { to: [0, -195.0], within: 0.6, autoJump: false, max: 300, lenient: true }],
        check: '(L) => !L.named.get("pfahl_bruecke").on && (L.player.dead || L.player.pos.y < 0)' },
      { name: 'Grabstein-Schalter: Greta springt drauf → Pfahl brennt, blaue Brücke trägt', from: [0, Y, -176], heroes: ['greta'],
        legs: [GRUFT[4], GRUFT[5], GRUFT[6], ...HILL.slice(0, 2)], check: '(L) => L.player.pos.z < -194 && L.player.pos.y > 0.9' },
    ],
    shots: [
      ['start', [0, Y, 5]],
      ['tor', [0, Y, 1.5]],
      ['laterne', [0, Y, -4.4]],
      ['graben', [0, Y, -12.4], 30, { y: 0 }],
      ['geist', [-4.6, Y, -21.6]],
      ['gruft0', [-17.4, Y + 3.2, -24.8]],
      ['schlucht', [0, Y, -29.0]],
      ['insel', [3.4, Y + 1.2, -42.6]],
      ['dock', [0, Y, -70.6]],
      ['bach', [-4.8, Y, -86]],
      ['tunnel', [-3.0, Y, -93.5]],
      ['ufer', [4.6, Y, -108.5]],
      ['floss', { from: [0, Y, -70.6], legs: [{ to: [0, -71.2], within: 0.4, run: false }, { mount: [0, -75.5] }, { ride: CREEK, untilZ: -88, partial: true }] }],
      ['floss_gruft', { from: [0, Y, -70.6], legs: [{ to: [0, -71.2], within: 0.4, run: false }, { mount: [0, -75.5] }, { ride: CREEK, untilZ: -99, partial: true }] }],
      ['floss_kruemel', { from: [0, Y, -70.6], legs: [{ to: [0, -71.2], within: 0.4, run: false }, { mount: [0, -75.5] }, { ride: CREEK, untilZ: -106.5, partial: true }] }],
      ['landung', [0, Y, -131]],
      ['pfahl', [0, Y, -139.4]],
      ['garten', [-2.6, Y, -163]],
      ['gruftring', [1.4, Y, -168]],
      ['schalter', [5.6, Y, -177.6]],
      ['bruecke', [0, Y, -185.0]],
      ['huegel', [0, Y, -199]],
      ['kapelle', [3.4, PL, -213.6]],
      ['turm', [-3.4, PL, -222.4]],
      ['turmspitze', [-7.0, 8.1, -228.6]],
    ],
  };
}

// =====================================================================================================================
// Ablauf
// =====================================================================================================================
const PORT = 4580;
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
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  if (L.runtime.save) L.runtime.save.lives = 99;
  const wrapHurt = () => {
    for (const p of L.players ?? [L.player]) {
      if (p.__hurtWrapped) continue;
      p.__hurtWrapped = true;
      p.hurtTries = 0;
      const orig = p.hurt.bind(p);
      p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
    }
  };
  wrapHurt();
  const named = (id) => L.named.get(id);
  const ent = (id) => L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  const COND = {
    lantern: () => !!L.hwLight?.carried,
    noLantern: () => !L.hwLight?.carried,
    riding: () => P().mode === 'mount',
    stamp: () => !!L.runtime.stamp,
    brueckeAn: () => !!named('pfahl_bruecke')?.on,
  };
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setInput({});
      if (o.hero) c.setHero(o.hero);
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      L.runtime.status = 'play';
      L.controlYaw = c.arch?.orbit ? c.arch.orbit.controlYaw() : c.view.rig.controlYaw(p.pos);
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
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false, lastHurt = -999;
      const mech = { hurts: 0, episodes: 0, by: {}, ride: 0, pounds: 0, lightWait: 0, maxRideZ: 0 };
      const track = [];
      const tick = (inp) => {
        const p = P();
        if (hold) p.invuln = Math.max(p.invuln, 5);
        const h0 = p.hurtTries ?? 0;
        c.setInput(inp); c.step(1); steps++;
        wrapHurt();
        if ((p.hurtTries ?? 0) > h0) {
          if (steps - lastHurt > 24) { mech.episodes++; const k = p.lastHurt ?? '?'; mech.by[k] = (mech.by[k] ?? 0) + 1; }
          lastHurt = steps;
        }
        if (p.mode === 'mount') mech.ride++;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 6) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 16) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript && p.script?.type !== 'treasure') {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (P().mode === 'script' && n++ < 2400 && !P().dead && L.runtime.status === 'play' && P().script?.type !== 'treasure') { if (hold) P().invuln = Math.max(P().invuln, 5); c.setInput({}); c.step(1); steps++; }
          log.push(['fahrt', kind, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.orbit !== undefined) { c.arch?.setOrbit?.(Lg.orbit); tick({}); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) {
          const vis = () => L.entities.some((e) => e.kind === 'star' && e.index === Lg.star && e.alive && !e.removed && !e.hidden);
          for (let w = 0; w < 360 && !vis() && !L.runtime.stars[Lg.star]; w++) tick({});
          const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900, jump: Lg.jump }); log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.stamp) { const n = this.chase('stamp', { max: 900 }); log.push(['stempel', n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1)]); continue; }
        // ------------------------------------------------ Laternenpfahl: warten, bis er gerade angeht (light) bzw. ausgeht (dark)
        if (Lg.light || Lg.dark) {
          const h = named(Lg.light ?? Lg.dark);
          const want = !!Lg.light;
          let k = 0, prev = h.on;
          for (; k < (Lg.max ?? 2400); k++) { tick({}); const now = h.on; if (now === want && prev !== want) break; prev = now; }
          mech.lightWait += k;
          log.push([Lg.name ?? (want ? 'Licht an' : 'Licht aus'), Lg.light ?? Lg.dark, k, h.on]);
          if (h.on !== want) log.push(['FEHLER: Laternenpfahl', Lg.light ?? Lg.dark]);
          continue;
        }
        // ------------------------------------------------ Kreisgeist (H-Kapitän): warten, bis er hinter dem Riesenkürbis ist
        if (Lg.clear) {
          const g = ent(Lg.clear);
          let k = 0;
          const zMax = Lg.zMax ?? -10.2;
          for (; k < (Lg.max ?? 4000); k++) { if (!g || g.removed || (g.pos.z < zMax && g.pos.x < (Lg.xMax ?? -6))) break; tick({}); }
          log.push([Lg.name ?? 'Geist', k, g ? [+g.pos.x.toFixed(2), +g.pos.z.toFixed(2)] : null]);
          continue;
        }
        // ------------------------------------------------ Stampfattacke auf einen Punkt (Klapperknochen-Haufen, Schalter)
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && q.mode === 'ground') break;
            if (!pounding && k > 8 && d < (Lg.r ?? 0.35) && q.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < (Lg.hold ?? 30), run: false });
          }
          mech.pounds++;
          log.push(['stampfen auf', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state, pounding]);
          continue;
        }
        // ------------------------------------------------ auf das Floß (Pflaume) springen
        if (Lg.mount) {
          let k = 0;
          const r = ent(Lg.mount[2] ?? 'floss');
          for (; k < 400 && P().mode !== 'mount'; k++) {
            const q = P();
            const tx = r ? r.pos.x : Lg.mount[0], tz = r ? r.pos.z : Lg.mount[1];
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz) : this.stick(tx - q.pos.x, tz - q.pos.z, 1)), jump: k % 60 < 24, run: false });
          }
          log.push(['aufgestiegen', P().mode === 'mount', k, +P().pos.x.toFixed(2), +P().pos.z.toFixed(2)]);
          if (P().mode !== 'mount') log.push(['FEHLER: nicht aufgestiegen']);
          continue;
        }
        // ------------------------------------------------ Floß auf dem Glibberbach lenken: Wegpunkte der Bachmitte (+ Seitenlage), Sprünge
        if (Lg.ride) {
          const pts = Lg.ride;   // [[x, z], …]
          let k = 0, seg = 0;
          for (; k < (Lg.max ?? 9000); k++) {
            const q = P();
            if (q.dead) break;
            if (q.mode !== 'mount') { if (k > 30 && q.mode === 'ground') break; tick({}); continue; }
            if (Lg.untilZ !== undefined && q.pos.z < Lg.untilZ) break;
            while (seg < pts.length - 1 && q.pos.z < pts[seg][1] + 0.5) seg++;
            const [tx, tz] = pts[seg];
            const jumpHere = (Lg.jump ?? []).some(([z0, z1]) => q.pos.z <= z0 && q.pos.z >= z1);
            const st = this.stick(tx - q.pos.x, tz - q.pos.z, 1);
            tick({ x: st.x * (Lg.steer ?? 1), y: st.y * (Lg.push ?? 0.4), jump: jumpHere });
            mech.maxRideY = Math.max(mech.maxRideY ?? -99, q.pos.y);
          }
          log.push(['ritt', k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode]);
          if (P().mode !== 'ground' && !Lg.partial) log.push(['FEHLER: Ritt nicht beendet']);
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander anspringen, dann den Haufen stampfen
        if (Lg.bones) {
          const pre = Lg.bones;
          const done = [], tried = new Set();
          let guard = 0;
          for (; guard < 40; guard++) {
            const list = L.entities.filter((e) => e.kind === 'klapperknochen' && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre) && !(Lg.noPound && tried.has(e)));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - P().pos.x, a.pos.z - P().pos.z) - Math.hypot(b.pos.x - P().pos.x, b.pos.z - P().pos.z));
            const e = list[0];
            let k = 0;
            // 1) anspringen, bis er liegt
            for (; k < 1200 && !e.defeated && !e.removed && !e.lying; k++) {
              const q = P();
              const dx = e.pos.x - q.pos.x, dz = e.pos.z - q.pos.z, d = Math.hypot(dx, dz);
              if (q.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (q.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: q.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            for (let w = 0; w < 240 && P().mode !== 'ground'; w++) tick({});
            tried.add(e);
            if (Lg.noPound) { if (e.lying) done.push(e.spec?.id); continue; }
            // 2) Stampfattacke auf den Haufen
            let j = 0;
            for (; j < 3 && !e.defeated && !e.removed && e.lying; j++) {
              const tx = e.pos.x, tz = e.pos.z;
              let m = 0, pounding = false;
              for (; m < 400; m++) {
                const q = P();
                const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
                if (m > 5 && q.mode === 'ground') break;
                if (!pounding && m > 8 && d < 0.35 && q.vel.y < 3) pounding = true;
                tick(pounding ? { crouch: true } : { ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: m < 26, run: false });
              }
              mech.pounds++;
              for (let w = 0; w < 30; w++) tick({});
            }
            if (e.defeated || e.removed || !e.alive) done.push(e.spec?.id);
            else { log.push(['FEHLER: Klapperknochen nicht besiegt', e.spec?.id, e.state]); break; }
          }
          for (let i = 0; i < 60; i++) tick({});
          mech.bones = done;
          log.push(['Knochen besiegt', done.length, done.join(' ')]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? P().pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && P().mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          const q = P();
          if (q.dead || L.runtime.status !== 'play') break;
          const dx = tx - q.pos.x, dz = tz - q.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (q.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false && L.data.archetype !== 'diorama') { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && q.mode === 'ground'));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (q.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          if (j0 === null && Lg.runUp && q.mode === 'ground' && ((q.vel.x * dx + q.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max && !o.lenient && !Lg.lenient) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = P().hurtTries ?? 0;
      const p = P();
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, track };
    },
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = o.jump !== false && L.data.archetype !== 'diorama' && (((n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30));
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script' && p.script?.type !== 'treasure') { let k = 0; while (P().mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const n = L.named.get(id); return n?.info?.() ?? null; },
    cond: (k) => COND[k](),
    noLantern: () => { L.hwLight?.carry(false); },
    giveLantern: () => { L.hwLight?.carry(true); for (const e of L.entities) if (e.kind === 'laterne' && !e.hidden) { e.hidden = true; e.touch = false; if (e.model) e.model.root.visible = false; } },

  };
  window.__hw = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__hw[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 300) {
  // Bot-Unverwundbarkeit aus (sonst blinkt die Figur und fehlt im Bild); im Handbetrieb läuft keine Simulation weiter
  await sc(() => { const c = window.__course; c.player.invuln = 0; c.snapCamera(); if (c.arch?.orbit) c.arch.orbit.inited = false; });
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}hwb_${name}.png` });
  if (process.env.DETAIL) {
    const rows = await sc(() => new Promise((done) => {
      const c = window.__course, view = c.view, r = view.renderer, orig = r.renderBufferDirect, acc = new Map();
      for (const e of c.level.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
      r.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
        const t0 = r.info.render.triangles;
        orig.call(this, cam, scene, geo, mat, obj, grp);
        const k = `${scene ? '' : 'S:'}${label(obj)}`;
        const a = acc.get(k) ?? [0, 0]; a[0]++; a[1] += r.info.render.triangles - t0; acc.set(k, a);
      };
      const f0 = view.frame;
      const wait = () => { if (view.frame < f0 + 1) { requestAnimationFrame(wait); return; } r.renderBufferDirect = orig; done([...acc.entries()].sort((a, b) => b[1][1] - a[1][1]).slice(0, 16)); };
      requestAnimationFrame(wait);
    }));
    console.log(`     ${name}: ${rows.map(([k, [n, t]]) => `${k} ${n}/${Math.round(t / 1000)}k`).join(' · ')}`);
  }
  return s;
}

/** Level mit Laternen-Item (H-3): Bilder hinter dem Fundort zeigen die Figur mit Laterne. */
const L_has_lantern_item = (id) => id === 'H-3';

/** Bild aus der nahen Zoomstufe der Orbit-Kamera (Diorama). */
async function nearShot(name) {
  await sc(() => { const o = window.__course.arch?.orbit; if (o && o.zoom === 0) o.toggleZoom(); });
  return shot(name);
}

/** Ergebnis eines Bot-Laufs ausgeben (bei Fehler oder VERBOSE das ganze Protokoll). */
function report(res, ok) {
  if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
}

/** Verkleidung (Kostüm-Zubehör) der Figur, sofern die Figuren-Ansicht sie meldet. */
const costumeInfo = () => sc(() => {
  const c = window.__course;
  return { has: 'outfit' in c, scene: c.outfit ?? null, avatar: c.rig?.avatar?.outfit ?? null, kind: c.rig?.kind ?? null };
});
/** Verkleidung prüfen, sobald der Motor sie kennt (Präzisierung „Figuren Halloween: Verkleidung“), sonst nur melden. */
function checkCostume(id, who, ci, avatar = true) {
  if (!ci.has) { console.log(`  (Verkleidung: der Motor kennt noch keine – Szene ohne outfit)`); return; }
  check(`${id}: ${who} in Verkleidung (Szene ${ci.scene}${avatar ? `, Avatar ${ci.avatar}` : ''})`, ci.scene === 'halloween' && (!avatar || ci.avatar === 'halloween'));
}

// ------------------------------------------------------------------------------------------------------- Diorama
async function diorama(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => {
    const c = window.__course, L = c.level, d = L.data;
    return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, world: d.world, stars: L.runtime.stars.length, stamp: !!d.stamp,
      hud: window.__game.scene.getScene('CourseUI').nStars, rig: c.rig?.info?.(), figure: d.diorama?.figure, lantern: !!L.hwLight?.carried };
  });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  if (PARTS.has('load')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const m = R.meta;
    check(`${id}: Welt 31, Diorama, ${m.stars} Sterne (HUD ${meta.hud}), kein Stempel, ${m.time} s, Thema ${m.theme}, Musik ${m.music}, Figur Krümel mit Laterne`,
      meta.world === 31 && meta.archetype === 'diorama' && meta.stars === m.stars && meta.hud === m.stars && !meta.stamp && meta.timeLimit === m.time && meta.theme === m.theme
      && meta.music === m.music && meta.figure === 'kruemel' && meta.rig?.kind === 'kruemel' && meta.lantern);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    checkCostume(id, 'Krümel', await costumeInfo(), false);
    const nj = await sc(() => {
      const c = window.__course, p = c.player;
      c.step(20);
      const y0 = p.pos.y; let maxY = y0;
      for (let i = 0; i < 90; i++) { c.setInput({ jump: true }); c.step(1); maxY = Math.max(maxY, p.pos.y); }
      c.setInput({});
      for (let i = 0; i < 240; i++) c.step(1);
      return { dy: maxY - y0, dead: p.dead };
    });
    check(`${id}: Krümel springt nicht (Höhe ${nj.dy.toFixed(2)} m), 3 s ohne Fehler`, nj.dy < 0.02 && !nj.dead && errors.length === 0);
  }
  const runLegs = async (legs, o = {}) => {
    await load(id);
    await W('place', o.from ?? R.start, { settle: 4, yaw: Math.PI / 2 });
    await sc((d) => window.__course.arch.setOrbit(d), o.orbit ?? R.orbit);
    if (o.noLantern) await W('noLantern');
    return W('drive', legs, { invuln: o.invuln });
  };
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    const res = await runLegs(t.legs, t);
    let ok = res.rt.stars[t.star];
    if (t.expectNot) ok = !ok;
    if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
    if (t.check) ok = ok && (await sc(new Function(`return (${t.check})(window.__course.level);`)));
    report(res, ok);
    check(`${id}: ${t.name} (${res.time.toFixed(1)} s, Berührungen ${res.mech.episodes})`, !!ok);
    if (t.shot && ok) await nearShot(`${id}_${t.shot}`);
  }
  if (PARTS.has('route')) {
    const res = await runLegs(R.allInOne);
    const fin = await sc(() => { const c = window.__course; for (let i = 0; i < 900 && !c.finished; i++) c.step(1); return { finished: c.finished, res: c.lastResult, treasure: c.player.treasure }; });
    const ok = res.rt.stars.every(Boolean) && fin.finished && fin.res?.stars?.length === R.meta.stars;
    console.log(`  alles in einem Lauf: ${res.time.toFixed(1)} s, Sterne ${res.rt.stars.map((s) => (s ? 1 : 0)).join('')}, Berührungen ${res.mech.episodes} ${JSON.stringify(res.mech.by)}, Münzen ${res.rt.coins}`);
    report(res, ok);
    check(`${id}: alle ${R.meta.stars} Sterne in einem Lauf (${res.time.toFixed(1)} s < ${R.meta.time} s), letzter Stern → Siegesablauf und Ergebnis`, ok && res.time < R.meta.time);
  }
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    const res = await runLegs(t.legs, t);
    let ok = !res.log.some((l) => String(l[0]).startsWith('FEHLER'));
    if (t.check) ok = ok && (await sc(new Function(`return (${t.check})(window.__course.level);`)));
    report(res, ok);
    check(`${id}: ${t.name} (Münzen ${res.rt.coins})`, !!ok);
    if (t.shot && ok) await nearShot(`${id}_${t.shot}`);
  }
  if (PARTS.has('sweep') || PARTS.has('shots')) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: '', atT: '' };
    for (const [name, pos, deg, zoom] of R.shots) {
      if (SHOTS && !SHOTS.has(name)) continue;
      await W('place', pos, { settle: 6, yaw: Math.PI / 2 });
      await sc(([d, z]) => { const c = window.__course; c.arch.setOrbit(d); if (z && c.arch.orbit.zoom === 0) c.arch.orbit.toggleZoom(); if (!z && c.arch.orbit.zoom === 1) c.arch.orbit.toggleZoom(); c.step(30); }, [deg, !!zoom]);
      const st = PARTS.has('shots') ? await shot(`${id}_${name}`) : await sc(() => window.__course.stats());
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = name; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = name; }
    }
    if (PARTS.has('sweep')) check(`${id}: Messgang über ${R.shots.length} Ansichten – Zeichenaufrufe < 120 (max ${worst.calls}, ${worst.at}), Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k, ${worst.atT})`, worst.calls < 120 && worst.tris < 300000);
  }
}

for (const id of LEVELS) {
  if (ROUTES[id]?.kind === 'diorama') await diorama(id);
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

// ------------------------------------------------------------------------------------------------------- Parcours
async function parcours(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, world: d.world, stamp: !!d.stamp }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  if (PARTS.has('load')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const m = R.meta;
    check(`${id}: Welt 31, ${m.stars} Sterne + Stempel, ${m.time} s, Thema ${m.theme}, Musik ${m.music}, Archetyp ${m.archetype}`,
      meta.world === 31 && meta.stars === m.stars && meta.stamp && kinds.stamp === 1 && meta.timeLimit === m.time && meta.theme === m.theme && meta.music === m.music && meta.archetype === m.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const ci = await costumeInfo();
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    checkCostume(id, hero, ci);
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Berührungen ${res.mech.episodes} ${JSON.stringify(res.mech.by)}, Münzen ${res.rt.coins}`);
    report(res, reached);
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }
  if (sweepTrack?.length) {
    sweepTrack.push(...(R.sweepExtra ?? []));
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
    // Kennzahlen je Abschnitt
    for (const [name, z0, z1] of R.sections ?? []) {
      const q = per.filter(([pt]) => pt[2] <= z0 && pt[2] > z1);
      if (!q.length) continue;
      const mc = Math.max(...q.map((x) => x[1])), mt = Math.max(...q.map((x) => x[2]));
      const ac = q.reduce((a, x) => a + x[1], 0) / q.length, at = q.reduce((a, x) => a + x[2], 0) / q.length;
      console.log(`    ${name.padEnd(26)} ${String(q.length).padStart(3)} Punkte  Aufrufe Ø ${ac.toFixed(0)} (max ${mc})  Dreiecke Ø ${Math.round(at / 1000)} k (max ${Math.round(mt / 1000)} k)`);
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      if (t.noLantern) await W('noLantern');
      else if (t.from[2] < -6) await W('giveLantern');
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (t.check) ok = ok && (await sc(new Function(`return (${t.check})(window.__course.level);`)));
      report(res, ok);
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0] && ok) await shot(`${id}_${t.shot}`);
    }
  }
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      if (t.noLantern) await W('noLantern');
      else if (t.from[2] < -6) await W('giveLantern');
      const res = await W('drive', t.legs, { invuln: t.invuln });
      if (t.after) await sc((n) => { const c = window.__course; c.setInput({}); for (let i = 0; i < n; i++) c.step(1); }, t.after);
      let ok = !res.log.some((l) => String(l[0]).startsWith('FEHLER'));
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (t.check) ok = ok && (await sc(new Function(`return (${t.check})(window.__course.level);`)));
      report(res, ok);
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0] && ok) await shot(`${id}_${t.shot}`);
    }
  }
  if (ONLY || !PARTS.has('shots')) return;
  await load(id, true);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    if (pos?.legs) {
      // Bild unterwegs (z. B. auf dem Floß): Beine fahren, dann knipsen
      await load(id);
      await W('place', pos.from, { settle: 10 });
      if (pos.from[2] < -6) await W('giveLantern');
      await W('drive', pos.legs, { lenient: true });
      await shot(`${id}_${name}`);
      continue;
    }
    await W('place', pos, { settle: 10, yaw });
    if (pos[2] < -6 && L_has_lantern_item(id)) { await W('giveLantern'); await sc(() => window.__course.step(12)); }
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}
