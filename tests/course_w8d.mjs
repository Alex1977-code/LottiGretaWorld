// Welt 8, Level 8-A „Goldglibber-Zugabe im Brummbär-Zirkus“ (Rummelplatz mit Hau den Lukas, Zirkuskanone und Losbude,
// Seilbahn mit Sternenring, Zirkusarena mit der goldenen Würfelblase: Landungen schicken goldene Schockwellen) und 8-B
// „Heiße Manege für den rosa Schlangenkönig“ (Rummel am Glutsee: Krallen-Kletterturm, Riesenrad, Schiffschaukel,
// Glutgasse mit Lavabrocken-Regen, Prachttreppe, Seilbahn über die Lavaschlucht, Manege mit dem rosa Schlangenkönig, dessen
// Lavabrocken Lavapfützen hinterlassen):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route, auch im
// Bosskampf), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras (Extraleben, Kontrollpunkte,
// Gefahren), Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/w8d_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8d.mjs [8-A|8-B]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text|Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=<Bedingung über p, s> (Schritt-Protokoll)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar, wo es um Gefahren geht.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], y (Mindesthöhe beim Landen), jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow,
//   max, land, edgeJump, autoJump } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } ·
//   { stamp: true } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung } · { die: true } ·
//   { pound: [x, z] } (hinspringen und stampfen) · { kanone: [x, z] } (in die Zirkuskanone springen, Flug abwarten) ·
//   { gondel: true, coins } (Seilbahn fahren; mit coins: in der fahrenden Gondel zu den Sternmünzen laufen und nach den
//   hohen springen) · { roulette: id, want: Index } (unter dem Glücksrad-Block warten, im richtigen Takt hochspringen) ·
//   { blase: true } (goldene Würfelblase: ausweichen, über die goldenen Wellen springen, im Fliehen auf den Hut) ·
//   { koenig: true } (rosa Schlangenkönig: Lavabrocken und Pfützen meiden, auf den Teller, vom Teller aufs Haupt) ·
//   { warp: id } (Warp-Box anspringen) · { pipe: id } (auf die Röhre und ducken) · { climb: [x, z], top } (Krallen-Anzug:
//   an der Wand hochklettern) · { rad: id, board: [x, z], at: 'oben', jumpTo: [x, z] } (Riesenrad) · { schaukel: id,
//   stand: [x, z], jumpTo: [x, z], y } (Schiffschaukel: am höchsten Punkt abspringen)
const ROUTES = {
  // ================================================================ 8-A (Rummelplatz, Seilbahn, Manege mit der goldenen Würfelblase)
  '8-A': {
    start: [0, 0, 11.5],
    meta: { stars: 2, slots: 3, time: 400, theme: 'circus', music: 'course_bossblob', archetype: 'boss' },
    enemies: { wuerfelblase: 1, gelee_brocken: 4, hau_den_lukas: 1, starring: 1, rouletteblock: 1 },
    main: [
      { name: 'Rummelplatz', to: [0, 2.0], within: 0.6 },
      { to: [0.4, -13.8], within: 0.5 },
      { name: 'Prachttreppe', to: [0, -24.8], y: 4.3, within: 0.6 },
      { name: 'Talstation', to: [0, -29.8], within: 0.3 },
      { name: 'in die Gondel', to: [0, -31.7], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
      { name: 'Seilbahn', gondel: true },
      { name: 'aufs Zeltplateau', to: [0, -62.6], y: 7.8, jump: 30, jumpAt: 3.2, within: 0.8 },
      { name: 'Kontrollpunkt Zeltplateau', to: [1.2, -63.4], within: 0.6 },
      { name: 'in die Manege', to: [0, -80], within: 0.8 },
      { name: 'goldene Würfelblase', blase: true },
      { star: 2 },
      { name: 'Warp-Box', warp: 'warp_sieg' },
      { name: 'Zielmast', to: [56, -93.6], within: 0.4 },
    ],
    routeChecks: [
      { name: 'goldene Würfelblase: 3 goldene Riesen, Landungen mit je zwei goldenen Schockwellen, 3 Hut-Treffer in der Flucht, Stern 3',
        ok: (r) => r.mech.blase?.hits === 3 && r.mech.blase.giants >= 3 && r.mech.blase.gold && r.mech.blase.goldWaves >= 6 && r.rt.stars[2] },
      { name: 'goldenes Zelt aufgeschnitten (Blick in die Manege)', ok: (r) => r.mech.zelt },
    ],
    targets: [
      { name: 'Stern 1: Hau den Lukas – Stampfattacke auf die Schlagplatte, die Glocke klingelt', star: 0, from: [-6.6, 0, 4.6],
        legs: [{ pound: [-6.6, 1.6] }, { wait: 150 }, { expect: 'stern1Sichtbar' }, { to: [-4.6, 5.6], within: 0.5 }, { star: 0 }],
        mech: (r) => r.mech.lukas?.rings >= 1 && r.mech.lukas.via === 'stampfen', mechText: (r) => `Lukas ${JSON.stringify(r.mech.lukas)}`, shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Stampfen (Sprung auf die Platte, Darüberlaufen)', star: 0, expectNot: true, from: [-6.6, 0, 4.6], heroes: ['lotti'],
        legs: [{ to: [-6.6, 1.6], y: 0.3, jump: 30, jumpAt: 3.0, within: 0.3 }, { wait: 120 }, { to: [-3.6, 1.6], within: 0.4 }, { to: [-6.6, 1.6], within: 0.3 }, { wait: 120 }],
        mech: (r) => r.mech.lukas?.strikes >= 1 && r.mech.lukas.rings === 0 && r.mech.lukas.best < 1, mechText: (r) => `Lukas ${JSON.stringify(r.mech.lukas)}` },
      { name: 'Stern 2: Sternenring an der Talstation – acht Sternmünzen entlang der Seilbahn, in der Gondel springen', star: 1, from: [0, 4.5, -26.0],
        legs: [{ name: 'durch den Sternenring', to: [3.6, -27.6], within: 0.4 }, { to: [0.6, -29.8], within: 0.4 },
          { name: 'in die Gondel', to: [0, -31.7], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 }, { gondel: true, coins: true },
          { expect: 'stern2Sichtbar' }, { name: 'aufs Zeltplateau', to: [0, -62.6], y: 7.8, jump: 30, jumpAt: 3.2, within: 0.8 }, { star: 1 }],
        mech: (r) => r.mech.ringGot === 8, mechText: (r) => `Sternmünzen ${r.mech.ringGot}/8`, shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Springen (in der Gondel stehen bleiben: nur die tiefen Sternmünzen)', star: 1, expectNot: true, from: [0, 4.5, -26.0], heroes: ['lotti'],
        legs: [{ to: [3.6, -27.6], within: 0.4 }, { to: [0.6, -29.8], within: 0.4 }, { to: [0, -31.7], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 }, { gondel: true }, { wait: 600 }],
        mech: (r) => r.mech.ringGot < 8, mechText: (r) => `Sternmünzen ${r.mech.ringGot}/8` },
      { name: 'Stempel: goldene Zirkuskanone hinauf in die Ballonloge', stamp: true, from: [8.0, 0, -7.6],
        legs: [{ kanone: [10.4, -9.6] }, { expect: 'loge' }, { stamp: true }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Kanone (vom Rummelplatz und von der Talstation aus springen)', stamp: true, expectNot: true, from: [-8.6, 0, -15.6], heroes: ['lotti'],
        legs: [{ to: [-8.6, -19.0], within: 0.3 }, { hop: 40 }, { wait: 30 }, { to: [-5.6, -26.0], y: 4.3, max: 400 }, { to: [-7.6, -22.2], jump: 40, jumpAt: 2.0, within: 0.4, max: 300 }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Extraleben: verborgener Block über der Zuckerwatte-Wolke an der Ballonloge', from: [-8.6, 10.2, -20.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ name: 'auf die Zuckerwatte', to: [-6.0, -24.6], y: 7.6, jump: 30, jumpAt: 3.4, within: 0.35, edgeJump: true }, { hop: 34 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Glücksrad-Block der Losbude: im richtigen Takt angestoßen gibt er ein Extraleben', from: [6.2, 0, 4.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6.2, 3.0], within: 0.15, slow: 0.5 }, { roulette: 'gluecksrad', want: 1 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Kontrollpunkt Talstation: Neustart dort, die Gondel kommt zurück', from: [0, 4.5, -25.0], heroes: ['lotti'], invuln: false, expectAlive: true,
        legs: [{ to: [0, -26.0], within: 0.4 }, { wait: 20 }, { to: [0, -29.8], within: 0.3 }, { to: [0, -31.7], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
          { until: 'gondelOben', max: 2400 }, { die: true }, { expect: 'anTalstation' }, { until: 'gondelUnten', max: 2400 }] },
      { name: 'Goldener Gelee-Brocken: Draufspringen besiegt ihn (1 Bitcoin)', from: [2.6, 0, 3.6], heroes: ['lotti'], expectCoins: 1,
        legs: [{ chaseKind: 'gelee_brocken', ids: ['gb1'], max: 900 }, { wait: 30 }] },
      { name: 'Goldene Schockwelle trifft, wer am Boden stehen bleibt', from: [0, 8, -80], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -82], within: 0.6 }, { welle: 'blase' }],
        mech: (r) => r.mech.waveHits >= 1 && r.mech.hurts >= 1, mechText: (r) => `Wellentreffer ${r.mech.waveHits}, Treffer ${r.mech.hurts}`, expectAlive: true },
      { name: 'Wer vom Rummelplatz fällt, stürzt in die Tiefe', from: [10, 0, -12], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [16.5, -12], within: 0.3, max: 300, autoJump: false }, { wait: 300 }], mech: (r) => r.mech.died && r.mech.deathCause === 'fall', mechText: (r) => `Tod ${r.mech.deathCause}` },
    ],
    // Bilder: [Name, Figur, Schritte, Vorbereitung (Code in der Seite: c, L, p)]
    shots: [
      ['start', [0, 0, 11.5], 30],
      ['lukas', [-4.2, 0, 5.4], 30],
      ['losbude', [4.6, 0, 6.0], 30],
      ['kanone', [7.6, 0, -4.6], 30],
      ['treppe', [0, 0, -12.0], 30],
      ['talstation', [0, 4.5, -25.6], 30],
      ['loge', [-8.6, 10.2, -19.4], 30],
      ['seilbahn', [0, 4.5, -29.8], 0, 'gondelFahrt'],
      ['zeltplateau', [1.4, 8, -63.4], 30],
      ['manege', [0, 8, -79], 300, 'kampf'],
      ['riese', [0, 8, -79], 0, 'riese'],
      ['hof', [52, 8, -74], 60],
    ],
  },
  // ================================================================ 8-B (Glut-Rummel, Seilbahn über die Lavaschlucht, Manege mit dem rosa Schlangenkönig)
  '8-B': {
    start: [0, 0, 11.5],
    meta: { stars: 2, slots: 3, time: 500, theme: 'circus', music: 'course_boss', archetype: 'boss' },
    enemies: { schlangenkoenig: 1, funkenflaemmchen: 2, lavablase: 4, schiffschaukel: 1 },
    main: [
      { name: 'Vorplatz', to: [0, 2.0], within: 0.6 },
      { to: [0, -14.6], within: 0.5 },
      { name: 'Holzbrücke über den Lavagraben', to: [0, -21.2], within: 0.5 },
      { name: 'Glutgasse (Lavabrocken-Regen)', to: [0.4, -31.2], within: 0.5 },
      { name: 'Prachttreppe', to: [0, -41.4], y: 4.3, within: 0.6 },
      { name: 'Talstation', to: [0, -44.6], within: 0.3 },
      { name: 'in die Gondel', to: [0, -46.5], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
      { name: 'Seilbahn über die Lavaschlucht', gondel: true },
      { name: 'aufs Zeltplateau', to: [0, -76.6], y: 7.8, jump: 30, jumpAt: 3.2, within: 0.8 },
      { name: 'Kontrollpunkt Zeltplateau', to: [1.2, -77.6], within: 0.6 },
      { name: 'in die Manege', to: [0, -94], within: 0.8 },
      { name: 'rosa Schlangenkönig', koenig: true },
      { star: 2 },
      { name: 'am Sockel vorbei', to: [4.2, -102], within: 0.6 }, { to: [2.4, -107.6], within: 0.6 },
      { name: 'Röhre zum Hinterhof', pipe: 'roehre_ziel' },
      { name: 'Zielmast', to: [56, -109.6], within: 0.4 },
    ],
    routeChecks: [
      { name: 'rosa Schlangenkönig: drei Treffer vom Teller aufs Haupt, Lavabrocken hinterlassen Lavapfützen, Stern 3',
        ok: (r) => r.mech.koenig?.hits === 3 && r.mech.koenig.rosa && r.mech.koenig.puddlesMade >= 1 && r.rt.stars[2] },
      { name: 'Lavabrocken-Regen über der Glutgasse (Landemarken, Einschläge)', ok: (r) => r.mech.regen?.impacts >= 1 },
      { name: 'rosa Zelt aufgeschnitten (Blick in die Manege)', ok: (r) => r.mech.zelt },
    ],
    targets: [
      { name: 'Stern 1: Krallen-Anzug aus dem ?-Block, den Kletterturm hinauf', star: 0, from: [2.8, 0, 4.0],
        legs: [{ hop: 30 }, { wait: 60 }, { to: [2.8, 5.8], within: 0.3 }, { name: 'auf den ?-Block', to: [2.8, 4.0], y: 2.8, jump: 40, jumpAt: 1.6, rise: 3.1, within: 0.5 }, { chaseKind: 'powerup', max: 400 },
          { expect: 'krallen' }, { to: [-10.2, 2.4], within: 0.4 }, { climb: [-10.2, 0.1], into: [0, -1], top: 7.5 }, { star: 0 }],
        mech: (r) => r.mech.climbs >= 1, mechText: (r) => `Klettern ${r.mech.climbs}`, shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Krallen (an den Kletterturm springen, Wandsprung)', star: 0, expectNot: true, from: [-10.2, 0, 2.6], heroes: ['lotti'],
        legs: [{ climb: [-10.2, 0.1], into: [0, -1], top: 7.5, max: 300 }, { wait: 60 }, { to: [-10.2, 2.4], within: 0.4 }, { hop: 40 }, { wait: 30 }] },
      { name: 'Stern 2: Riesenrad – oben aus der Gondel zum Stern springen', star: 1, from: [8.3, 0, 1.4],
        legs: [{ name: 'Trittstein', to: [8.3, -0.55], y: 0.4, jump: 20, jumpAt: 1.2, within: 0.4 }, { name: 'Einstiegssteg', to: [10.4, -0.4], y: 0.9, jump: 20, jumpAt: 1.4, within: 0.4 },
          { rad: 'rad', starIdx: 1 }],
        mech: (r) => r.mech.rad?.top > 13 && !r.dead, mechText: (r) => `Riesenrad ${JSON.stringify(r.mech.rad)}`, shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Riesenrad (vom Steg aus springen)', star: 1, expectNot: true, from: [11.2, 1.0, -0.6], heroes: ['lotti'], place: { settle: 4 },
        legs: [{ hop: 40 }, { wait: 30 }] },
      { name: 'Stempel: Schiffschaukel aufschaukeln, am höchsten Punkt auf den Ausguck springen', stamp: true, from: [-6.4, 0, -21.6],
        legs: [{ schaukel: 'schaukel', jumpTo: [-17.4, -24.0], y: 6.7 }, { stamp: true }],
        mech: (r) => r.mech.schaukel?.maxA >= 55, mechText: (r) => `Schaukel ${JSON.stringify(r.mech.schaukel)}`, shot: 'stempel' },
      { name: 'Stempel nicht ohne Schaukel (vom Boden an den Ausguck springen)', stamp: true, expectNot: true, from: [-14.6, 0, -24.0], heroes: ['lotti'],
        legs: [{ to: [-15.8, -24.0], within: 0.3 }, { hop: 40 }, { wait: 30 }, { to: [-13.6, -24.0], within: 0.3 }, { to: [-17.0, -24.0], jump: 40, jumpAt: 2.4, within: 0.3, max: 300 }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Extraleben: verborgener Block über dem Kletterturm (nur mit Krallen erreichbar)', from: [-10.2, 7.5, -1.4], heroes: ['lotti'], expectLives: 1, place: { power: 'krallen' },
        legs: [{ hop: 34 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: verborgener Block über der Holzbrücke', from: [0, 0.3, -14.2], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [0, -18.0], within: 0.2, slow: 0.5 }, { hop: 34 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Lavabrocken trifft, wer auf der Landemarke stehen bleibt', from: [0, 0, -9.6], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -12.6], within: 0.4 }, { until: 'regenTrifft', max: 120 * 20 }], mech: (r) => r.mech.hurts >= 1 && r.mech.regen?.impacts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}, Regen ${JSON.stringify(r.mech.regen)}`, expectAlive: true },
      { name: 'Krallen-Anzug: Krallenhieb besiegt das Funkenflämmchen', from: [-9.0, 0, -12.6], heroes: ['lotti'], place: { power: 'krallen' },
        legs: [{ attack: 'flamme1' }], mech: (r) => r.mech.attack?.defeated, mechText: (r) => `Flämmchen ${JSON.stringify(r.mech.attack)}` },
      { name: 'Wer in den Lavagraben fällt, verbrennt', from: [6, 0, -14.6], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [6, -18.0], within: 0.3, max: 300, autoJump: false }, { wait: 300 }], mech: (r) => r.mech.died && r.mech.deathCause === 'lava', mechText: (r) => `Tod ${r.mech.deathCause}` },
      { name: 'Kontrollpunkt Talstation: Neustart dort, die Gondel kommt zurück', from: [0, 4.5, -41.0], heroes: ['lotti'], invuln: false, expectAlive: true,
        legs: [{ to: [0, -41.8], within: 0.4 }, { wait: 20 }, { to: [0, -44.6], within: 0.3 }, { to: [0, -46.5], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
          { until: 'gondelOben', max: 2400 }, { die: true }, { expect: 'anTalstationB' }, { until: 'gondelUnten', max: 2400 }] },
      { name: 'Rosa Schlangenkönig: Lavabrocken hinterlassen heiße Lavapfützen; Tod im Kampf setzt den Kampf zurück', from: [0, 8, -92], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -95], within: 0.6 }, { until: 'pfuetze', max: 120 * 30 }, { die: true }, { expect: 'kampfZurueck' }],
        mech: (r) => r.mech.koenigInfo?.puddlesMade >= 1, mechText: (r) => `König ${JSON.stringify(r.mech.koenigInfo)}` },
    ],
    shots: [
      ['start', [0, 0, 11.5], 30],
      ['kletterturm', [-7.0, 0, 4.8], 30],
      ['riesenrad', [7.6, 0, 3.6], 30],
      ['riesenrad_oben', [11.2, 1.0, -0.6], 0, 'radOben'],
      ['glutgasse', [0, 0, -13.2], 200],
      ['schaukel', [-6.0, 0, -19.6], 0, 'schaukeln'],
      ['ausguck', [-17.4, 7.0, -22.6], 30],
      ['treppe', [0, 0, -29.6], 30],
      ['seilbahn', [0, 4.5, -44.6], 0, 'gondelFahrt'],
      ['zeltplateau', [1.4, 8, -77.6], 30],
      ['manege', [0, 8, -93], 300, 'kampf'],
      ['teller', [0, 8, -93], 0, 'teller'],
      ['pfuetzen', [0, 8, -93], 0, 'pfuetzen'],
      ['hof', [52, 8, -90], 60],
    ],
  },
};

const PORT = 4880;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((o) => t.name.includes(o))) : list);
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
  const named = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    gondelOben: () => { const g = named('gondel'); return !!g && g.u >= 0.999 && g.state === 'wait'; },
    gondelUnten: () => { const g = named('gondel'); return !!g && g.u <= 0.001 && g.state === 'wait'; },
    anTalstation: () => { const p = P(); return !p.dead && L.runtime.status === 'play' && Math.abs(p.pos.z + 26.0) < 1.2 && Math.abs(p.pos.y - 4.5) < 0.4; },
    // 8-A
    stern1Sichtbar: () => { const s = L.entities.find((e) => e.kind === 'star' && e.index === 0 && !e.removed); return !!s && !s.hidden; },
    stern2Sichtbar: () => { const s = L.entities.find((e) => e.kind === 'star' && e.index === 1 && !e.removed); return !!s && !s.hidden; },
    loge: () => at(-10.6, -6.6, 9.9, -18.6, -22.6),
    welleTrifft: () => (P().hurtTries ?? 0) > 0,
    // 8-B
    krallen: () => P().power === 'krallen',
    anTalstationB: () => { const p = P(); return !p.dead && L.runtime.status === 'play' && Math.abs(p.pos.z + 41.8) < 1.2 && Math.abs(p.pos.y - 4.5) < 0.4; },
    regenTrifft: () => (P().hurtTries ?? 0) > 0 && (named('regen')?.impacts ?? 0) > 0,
    pfuetze: () => (named('koenig')?.puddlesMade ?? 0) > 0 && L.entities.some((e) => e.kind === 'lavapfuetze' && !e.removed),
    kampfZurueck: () => { const b = named('koenig'); return !!b && b.state === 'wait' && b.hp === 3 && !L.archetype?.started && !P().dead && P().pos.z > -80; },
  };
  const W = {
    COND,
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
      const mech = { hurts: 0, pipes: 0, bounces: 0, maxY: -99, hurtBy: {} };
      const track = [];
      let lastJump = false, prevState = p.state;
      let hurt0 = p.hurtTries ?? 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        lastJump = !!inp?.jump;
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > hurt0) { mech.hurtBy[p.lastHurt] = (mech.hurtBy[p.lastHurt] ?? 0) + (p.hurtTries - hurt0); hurt0 = p.hurtTries; }
        mech.maxY = Math.max(mech.maxY, p.pos.y);
        if (p.state === 'climb' && prevState !== 'climb') mech.climbs = (mech.climbs ?? 0) + 1;
        prevState = p.state;
        if ((L._zirkus?.tent?.k ?? 0) > 0.95) mech.zelt = true;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.y - t[1], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (window.__trace && window.__trace(p, steps)) log.push(['T', steps, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '', +p.vel.y.toFixed(2), JSON.stringify(inp)]);
        if (p.dead && !deadLogged) { deadLogged = true; mech.died = true; mech.deathCause = p.deathCause; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const ringInfo = () => { const r = L.entities.find((e) => e.kind === 'starring'); if (r) mech.ringGot = Math.max(mech.ringGot ?? 0, r.got ?? 0); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        // gehaltene Sprungtaste vom vorigen Bein loslassen (ein neuer Sprung braucht einen neuen Druck)
        if (lastJump) tick(p.mode === 'air' ? { jump: false } : {});
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { tick({}); ringInfo(); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](Lg.arg); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](Lg.arg); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until](Lg.arg)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900, walk: Lg.walk, jump: Lg.jump }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.stamp) { const n = this.chase('stamp', { max: 900, walk: true }); log.push(['stempel', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.die) { p.invuln = 0; p.die('hit'); let k = 0; for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) tick({}); log.push(['gestorben, Neustart nach', k]); continue; }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && Math.abs(dx) < (Lg.r ?? 0.5) && Math.abs(dz) < (Lg.r ?? 0.5) && p.vel.y < 4) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 5, 7) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 34, run: false });
          }
          for (let i = 0; i < 12; i++) tick({});
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ in die Zirkuskanone springen (Röhrenkanone), Flug abwarten
        if (Lg.kanone) {
          const [tx, tz] = Lg.kanone;
          const kan = named(Lg.id ?? 'kanone');
          const shots0 = kan?.shots ?? 0;
          let k = 0;
          for (; k < 900 && (kan?.shots ?? 0) === shots0 && kan?.state === 'idle'; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' ? d < 2.4 && (k % 50) < 30 : p.vel.y > -2 });
          }
          for (let i = 0; i < 600 && (p.mode !== 'ground' || kan?.state !== 'idle'); i++) tick({});
          for (let i = 0; i < 20; i++) tick({});
          log.push(['Kanone', kan?.shots, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if ((kan?.shots ?? 0) === shots0) { log.push(['FEHLER: Kanone feuert nicht']); break; }
          continue;
        }
        // ------------------------------------------------ Seilbahn fahren (mit coins: nach den Sternmünzen springen)
        if (Lg.gondel) {
          const g = named(Lg.id ?? 'gondel');
          let k = 0, jumps = 0, j0 = -99;
          for (; k < 120 * 30 && !(g.state === 'wait' && g.u >= 0.999 && k > 30); k++) {
            ringInfo();
            const fx = g.pos.x, fz = g.pos.z, floor = g.floorY;
            let tx = fx, tz = fz, jump = false;
            if (Lg.coins) {
              const coins = L.entities.filter((e) => e.kind === 'starcoin' && e.alive && !e.removed && !e.hidden);
              // nächste Münze vor der Gondel (Fahrtrichtung −Z), in Reichweite der Gondel
              let best = null;
              for (const e of coins) { const dz = e.pos.z - p.pos.z; if (dz < 1.0 && dz > -5.5 && (!best || e.pos.z > best.pos.z)) best = e; }
              if (best) {
                tx = fx + Math.max(-0.75, Math.min(0.75, best.pos.x - fx));
                const high = best.pos.y - floor > 1.6;
                if (high && p.mode === 'ground' && Math.abs(best.pos.z - p.pos.z) < 1.25 && Math.abs(best.pos.x - p.pos.x) < 0.45 && k - j0 > 40) { jump = true; j0 = k; jumps++; }
              }
            }
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const vx = (g.dir ?? 1) * 0, mv = p.mode === 'air' ? this.airSteer(tx, tz, 0, -2.6 * (g.state === 'move' ? 1 : 0), 3, 5) : (d > 0.12 ? this.stick(dx, dz, Math.min(0.6, d * 1.5)) : {});
            tick({ ...mv, run: false, jump: jump || (k - j0 < 18 && p.mode === 'air' && p.vel.y > 0) });
          }
          ringInfo();
          log.push(['Seilbahn', k, jumps, mech.ringGot ?? 0, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +g.u.toFixed(2)]);
          if (p.pos.y < g.floorY - 0.3) { log.push(['FEHLER: aus der Gondel gefallen']); break; }
          continue;
        }
        // ------------------------------------------------ Glücksrad-Block: im Takt anstoßen (Inhalt Index want)
        if (Lg.roulette) {
          const b = named(Lg.roulette);
          const n = b.contents.length, per = b.period;
          let k = 0;
          // Sprung dauert bis zum Kopfstoß ≈ 0,22 s: Absprung, wenn der gewünschte Inhalt in dieser Zeit beginnt
          for (; k < 120 * 6; k++) { const ph = ((L.time + 0.12) / per) % n; if (Math.floor(ph) === Lg.want && ph - Lg.want > 0.2 && ph - Lg.want < 0.6 && p.mode === 'ground') break; tick({}); }
          const shown = b.current;
          for (let i = 0; i < 30; i++) tick({ jump: true });
          for (let i = 0; i < 120 && p.mode !== 'ground'; i++) tick({});
          log.push(['Glücksrad', k, shown, b.used]);
          continue;
        }
        // ------------------------------------------------ goldene Würfelblase: ausweichen, über die Wellen springen, auf den Hut
        if (Lg.blase) {
          const b = named(Lg.blase === true ? 'blase' : Lg.blase);
          const A = b.arena;
          const sub = L.archetype;
          let k = 0;
          for (; k < 600 && !sub?.started && b.state === 'wait'; k++) tick({ ...this.stick(A.x - p.pos.x, A.z + 4 - p.pos.z, 0.8) });
          let j0 = -1, stomps = 0, jumps = 0, n = 0;
          const maxK = Lg.max ?? 120 * 300;
          const goldSeen = new Set();
          const waveList = () => { for (const w of b.goldWaves ?? []) goldSeen.add(w); return [...(b.waves ?? []), ...(b.goldWaves ?? []).filter((w) => !w.removed).map((w) => ({ x: w.pos.x, z: w.pos.z, r: w.r ?? 0 }))]; };
          for (; n < maxK && b.state !== 'gone' && !p.dead && L.runtime.status === 'play'; n++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            let inp;
            if (b.vulnerable || (b.state === 'flee' && b.grace > 0)) {
              if (p.mode === 'ground' && j0 < 0 && d < 2.2 && b.vulnerable) { j0 = n; stomps++; }
              const jump = j0 >= 0 && n - j0 < 20;
              inp = p.mode === 'air' ? { ...this.airSteer(b.pos.x, b.pos.z, b.vel.x, b.vel.z, 4, 9), jump } : { ...this.stick(dx, dz, 1), run: d > 2.5, jump };
              if (p.mode === 'ground' && j0 >= 0 && n - j0 > 26) j0 = -1;
            } else {
              j0 = -1;
              const rx = p.pos.x - A.x, rz = p.pos.z - A.z, rr = Math.hypot(rx, rz) || 1;
              let ax = -rz / rr * 0.6, az = rx / rr * 0.6;
              ax += (6.5 - rr) / rr * rx * 0.35; az += (6.5 - rr) / rr * rz * 0.35;
              const push = (x, z, R, w = 1) => { const ex = p.pos.x - x, ez = p.pos.z - z, ed = Math.max(0.3, Math.hypot(ex, ez)); if (ed < R) { ax += (ex / ed) * w * (R - ed) / R * 3; az += (ez / ed) * w * (R - ed) / R * 3; } };
              const giant = /^g/.test(b.state) || b.state === 'form';
              if (giant) push(b.pos.x, b.pos.z, (b.S ?? 3) / 2 + 3.2, 1.5);
              if (b.jump && (b.state === 'gcrouch' || b.state === 'gair')) push(b.jump.x1, b.jump.z1, (b.S ?? 3) / 2 + 2.6, 2);
              for (const e of b.bits ?? []) if (!e.removed && !e.defeated && e.alive) push(e.pos.x, e.pos.z, 1.6, 0.8);
              inp = { ...this.stick(ax, az, Math.min(1, Math.hypot(ax, az))), run: false };
              // Schockwellen (auch die goldenen): kurz vor dem Ring springen
              for (const w of waveList()) {
                const wd = Math.hypot(p.pos.x - w.x, p.pos.z - w.z);
                if (p.mode === 'ground' && w.r < wd && wd - w.r < 1.3) { inp.jump = true; jumps++; }
              }
              if (p.mode === 'air' && p.vel.y > 0) inp.jump = true;
            }
            tick(inp);
          }
          mech.blase = { started: !!sub?.started, hits: b.hits, hp: b.hp, giants: b.giants, sizes: b.sizes, waves: b.wavesN, gold: !!b.gold, goldWaves: goldSeen.size, waveHits: b.waveHits ?? 0, bitsDown: b.bitsDown, flees: b.flees, stomps, jumps, steps: n, state: b.state };
          for (let i = 0; i < 300 && b.state !== 'gone'; i++) tick({});
          for (let i = 0; i < 90; i++) tick({});
          mech.blase.won = !!sub?.won;
          log.push(['Würfelblase', JSON.stringify(mech.blase)]);
          if (!sub?.won) { log.push(['FEHLER: Würfelblase nicht besiegt']); break; }
          continue;
        }
        // ------------------------------------------------ Gegenprobe: neben der Landestelle des Riesen stehen bleiben (Welle)
        if (Lg.welle) {
          const b = named(Lg.welle);
          let k = 0, open = 0;
          for (; k < 120 * 40 && !(b.waveHits > 0) && !p.dead; k++) {
            let inp = {};
            if ((b.state === 'gcrouch' || b.state === 'gair') && b.jump) {
              // weg von der Landestelle (4,5 m), dann stehen bleiben
              let ex = p.pos.x - b.jump.x1, ez = p.pos.z - b.jump.z1, ed = Math.hypot(ex, ez);
              if (ed < 0.4) { ex = p.pos.x - b.arena.x > 0 ? -1 : 1; ez = 0; ed = 1; }
              if (ed < 4.5) inp = this.stick(ex / ed, ez / ed, 1);
            }
            // geschützt bis zur Landung; danach 1,2 s verwundbar – nur die Welle kann treffen
            if (b.state === 'gland' && open <= 0 && Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z) > (b.S ?? 3) / 2 + 1.2) open = 144;
            if (open > 0) { open--; p.invuln = 0; } else p.invuln = Math.max(p.invuln, 5);
            tick(inp);
          }
          log.push(['Welle', k, b.waveHits, p.hurtTries]);
          continue;
        }
        // ------------------------------------------------ Krallen-Anzug: an der Wand hochklettern (into = Richtung in die Wand)
        if (Lg.climb) {
          const [wx, wz] = Lg.climb, [ix, iz] = Lg.into;
          const top = Lg.top;
          // vor die Wand stellen
          for (let k = 0; k < 600; k++) { const dx = wx - ix * 1.4 - p.pos.x, dz = wz - iz * 1.4 - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.2 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.max(0.25, Math.min(1, d))), run: false }); }
          let k = 0, j = -99;
          for (; k < (Lg.max ?? 900); k++) {
            if (p.mode === 'ground' && p.pos.y > top - 0.3) break;
            const dz2 = Math.hypot(wx - p.pos.x, wz - p.pos.z);
            let jump = false;
            if (p.mode === 'ground' && dz2 < 1.0 && k - j > 40) { j = k; }
            if (k - j < 24) jump = true;
            if (p.mode === 'wall' && p.state !== 'climb' && k - j > 60 && !Lg.noWallJump) { j = k; }   // Wandrutschen: neu anspringen
            tick({ ...this.stick(ix, iz, 1), run: false, jump });
          }
          for (let i = 0; i < 30 && p.mode !== 'ground'; i++) tick({ ...this.stick(ix, iz, 0.6) });
          for (let i = 0; i < 20; i++) tick({});
          log.push(['Klettern', k, mech.climbs ?? 0, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        // ------------------------------------------------ Riesenrad: einsteigen, hinauffahren, oben zum Stern springen
        if (Lg.rad) {
          const r = named(Lg.rad);
          const top0 = r.radius + (r.gondolas[0].mb.top - r.gondolas[0].mb.pos.y) + Math.max(...r.gondolas.map((g) => g.mb.pos.y)) - Math.max(...r.gondolas.map((g) => g.mb.pos.y));
          const hubTop = () => Math.max(...r.gondolas.map((g) => g.mb.top));
          const on = () => r.gondolas.find((g) => p.mode === 'ground' && p.ground === g.mb.shape) ?? null;
          // warten, bis eine Gondel unten vor dem Steg ist, dann hinüber
          let k = 0, g = null;
          for (; k < 120 * 40 && !(g = on()); k++) {
            const low = r.gondolas.reduce((a, b) => (b.mb.pos.y < a.mb.pos.y ? b : a));
            const near = Math.abs(low.mb.pos.x - p.pos.x) < 0.9 && low.mb.top < p.pos.y + 0.35 && low.mb.top > p.pos.y - 0.8;
            const dx = low.mb.pos.x - p.pos.x, dz = low.mb.pos.z - p.pos.z;
            if (p.mode === 'air') tick({ ...this.airSteer(low.mb.pos.x, low.mb.pos.z, low.mb.mover.vx, low.mb.mover.vz, 3, 6) });
            else tick(near ? { ...this.stick(dx, dz, 0.8), jump: Math.abs(dz) > 0.9 && (k % 30) < 10 } : {});
          }
          if (!g) { log.push(['FEHLER: nicht in die Gondel']); break; }
          // mitfahren (mittig stehen), bis die Gondel ganz oben ist (höchste Planke gerade erreicht)
          let maxTop = 0, n = 0, prevTop = -1e9;
          for (; n < 120 * 60; n++) {
            const cur = on() ?? g;
            maxTop = Math.max(maxTop, cur.mb.top);
            if (cur.mb.top < prevTop - 1e-4 && cur.mb.top > 8 && p.mode === 'ground') break;   // Scheitel überschritten
            prevTop = cur.mb.top;
            const dx = cur.mb.pos.x - p.pos.x, dz = cur.mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.25 && p.mode === 'ground' ? { ...this.stick(dx, dz, Math.min(0.5, d)) } : {});
          }
          const star = L.entities.find((e) => e.kind === 'star' && e.index === Lg.starIdx && !e.removed);
          const sx = star ? star.pos.x : p.pos.x, sz = star ? star.pos.z : p.pos.z;
          let a = 0;
          for (; a < 300; a++) { tick({ ...(p.mode === 'air' ? this.airSteer(sx, sz, 0, 0, 3, 5) : {}), jump: a < 36 }); if (a > 8 && p.mode === 'ground') break; }
          for (let i = 0; i < 60; i++) tick({});
          mech.rad = { boardK: k, rideN: n, top: +maxTop.toFixed(2), hubTop: +hubTop().toFixed(2), top0: +top0.toFixed(2) };
          log.push(['Riesenrad', k, n, +maxTop.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Schiffschaukel: einsteigen, aufschaukeln lassen, am Scheitel abspringen
        if (Lg.schaukel) {
          const s = named(Lg.schaukel);
          const [tx, tz] = Lg.jumpTo;
          const side = Math.sign(tx - s.pos.x) || -1;           // Scheitel auf der Seite des Ziels
          const inBoat = () => p.mode === 'ground' && p.ground === s.mb.shape;
          let k = 0;
          for (; k < 900 && !inBoat(); k++) {
            const bx = s.mb.pos.x, bz = s.mb.pos.z, dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, s.mb.mover.vx, s.mb.mover.vz, 3, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' ? d < 1.9 && (k % 40) < 20 : p.vel.y > 0 });
          }
          if (!inBoat()) { log.push(['FEHLER: nicht in die Schiffschaukel']); break; }
          // in der Mitte stehen bleiben, bis der Ausschlag groß ist und das Schiff am Scheitel auf der Zielseite ankommt
          let n = 0;
          const ampDeg = Lg.amp ?? 64;
          for (; n < 120 * 30; n++) {
            const A = s.A * 180 / Math.PI, th = s.theta * 180 / Math.PI;
            if (A >= ampDeg && side * th > A - 3 && inBoat()) break;
            const dx = s.mb.pos.x - p.pos.x, dz = s.mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.3 && p.mode === 'ground' ? { ...this.stick(dx, dz, Math.min(0.4, d)) } : {});
          }
          let a = 0;
          for (; a < 400; a++) { tick({ ...(p.mode === 'air' && a > 4 ? this.airSteer(tx, tz, 0, 0, 3, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 36 }); if (a > 10 && p.mode === 'ground') break; }
          for (let i = 0; i < 20; i++) tick({});
          log.push(['Schiffschaukel', k, n, +(s.A * 180 / Math.PI).toFixed(1), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (Lg.y !== undefined && p.pos.y < Lg.y - 0.3) { log.push(['FEHLER: Ausguck nicht erreicht']); break; }
          continue;
        }
        // ------------------------------------------------ Angriff (Aktion: Krallenhieb) auf einen Gegner
        if (Lg.attack) {
          const e = named(Lg.attack);
          let k = 0;
          for (; k < 1200 && e && !e.defeated && !e.removed; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...this.stick(dx, dz, d > 1.2 ? 1 : 0.3), action: d < 1.4 && (k % 24) === 0 });
          }
          mech.attack = { k, defeated: !!e?.defeated || !!e?.removed, power: p.power };
          log.push(['Angriff', Lg.attack, k, JSON.stringify(mech.attack)]);
          continue;
        }
        // ------------------------------------------------ Röhre (fährt nach dem Sieg aus dem Boden): hinauf und ducken
        if (Lg.pipe) {
          const r = named(Lg.pipe);
          let k = 0;
          for (; k < 900 && (r.hidden || r.k < 0.95); k++) tick({});
          const x0 = p.pos.x;
          for (k = 0; k < 900 && Math.abs(p.pos.x - x0) < 20; k++) {
            const dx = r.pos.x - p.pos.x, dz = r.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const onTop = p.mode === 'ground' && p.pos.y > r.pos.y + r.H - 0.2;
            tick(onTop ? { crouch: (k % 10) < 5 } : { ...(p.mode === 'air' ? this.airSteer(r.pos.x, r.pos.z, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' ? d < 2.0 && (k % 40) < 22 : p.vel.y > 0 });
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['Röhre', k, mech.pipes, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (p.pos.x < 30) { log.push(['FEHLER: Röhre']); break; }
          continue;
        }
        // ------------------------------------------------ rosa Schlangenkönig: ausweichen, auf den Teller, vom Teller aufs Haupt
        if (Lg.koenig) {
          const b = named(Lg.koenig === true ? 'koenig' : Lg.koenig);
          const A = b.arena;
          const sub = L.archetype;
          let k = 0;
          for (; k < 600 && !sub?.started && b.state === 'wait'; k++) tick({ ...this.stick(A.x - p.pos.x, A.z + 6 - p.pos.z, 0.8) });
          let n = 0, plateJumps = 0, headJumps = 0, j0 = -99, standN = 0, phase = 'evade';
          const maxK = Lg.max ?? 120 * 360;
          const puddles = () => L.entities.filter((e) => e.kind === 'lavapfuetze' && !e.removed);
          for (; n < maxK && b.state !== 'gone' && !p.dead && L.runtime.status === 'play'; n++) {
            const t = b.target;
            const win = (b.state === 'lean' || b.state === 'summon') && t && t.state === 'up' && !t.broken;
            let inp = {};
            if (win) {
              const onPlate = p.mode === 'ground' && p.ground?.owner === t;
              if (onPlate) {
                standN++;
                if (standN > 3) { j0 = n; headJumps++; standN = 0; phase = 'kopf'; }
                inp = { jump: n - j0 < 32 };
              } else if (p.mode === 'air' && phase === 'kopf') {
                const h = b.headWorld({});
                inp = { ...(p.vel.y < 3 ? this.airSteer(h.x, h.z, 0, 0, 3.4, 6) : {}), jump: n - j0 < 32 };
              } else {
                standN = 0;
                const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, d = Math.hypot(dx, dz);
                if (p.mode === 'ground') {
                  phase = 'teller';
                  if (d < 1.7 && n - j0 > 40) { j0 = n; plateJumps++; }
                  inp = { ...this.stick(dx, dz, d > 1.2 ? 1 : 0.5), jump: n - j0 < 30 };
                } else {
                  inp = { ...(p.pos.y > t.plateTop + 0.2 || p.vel.y < 0 ? this.airSteer(t.pos.x, t.pos.z, 0, 0, 3.6, 6) : this.stick(dx, dz, 0.6)), jump: n - j0 < 30 };
                }
              }
            } else {
              phase = 'evade';
              standN = 0;
              // ausweichen: Kreis r ≈ 8 um die Mitte, weg von Landemarken der Brocken und von Lavapfützen
              const rx = p.pos.x - A.x, rz = p.pos.z - A.z, rr = Math.hypot(rx, rz) || 1;
              let ax = -rz / rr * 0.5, az = rx / rr * 0.5;
              ax += (8 - rr) / rr * rx * 0.35; az += (8 - rr) / rr * rz * 0.35;
              const push = (x, z, R, w = 1) => { const ex = p.pos.x - x, ez = p.pos.z - z, ed = Math.max(0.3, Math.hypot(ex, ez)); if (ed < R) { ax += (ex / ed) * w * (R - ed) / R * 3; az += (ez / ed) * w * (R - ed) / R * 3; } };
              for (const m of b.markers?.list ?? []) push(m.x, m.z, 2.2, 1.5);
              for (const q of puddles()) push(q.pos.x, q.pos.z, (q.size ?? 2.2) / 2 + 0.8, 1.5);
              if (b.state === 'strike') { const h = b.headWorld({}); push(h.x, h.z, 3.2, 2); }
              inp = { ...this.stick(ax, az, Math.min(1, Math.hypot(ax, az))), run: false };
              if (p.mode === 'air' && p.vel.y > 0 && n - j0 < 32) inp.jump = true;
            }
            tick(inp);
          }
          const info = b.info();
          mech.koenig = { started: !!sub?.started, hits: b.hits, hp: b.hp, rosa: !!info.rosa, puddlesMade: info.puddlesMade, thrown: info.thrown, plateJumps, headJumps, steps: n, state: b.state };
          for (let i = 0; i < 400 && b.state !== 'gone'; i++) tick({});
          for (let i = 0; i < 90; i++) tick({});
          mech.koenig.won = !!sub?.won;
          log.push(['Schlangenkönig', JSON.stringify(mech.koenig)]);
          if (!sub?.won) { log.push(['FEHLER: Schlangenkönig nicht besiegt']); break; }
          continue;
        }
        // ------------------------------------------------ Warp-Box anspringen (hineinfallen)
        if (Lg.warp) {
          const wb = named(Lg.warp);
          let k = 0;
          const x0 = p.pos.x, z0 = p.pos.z;
          for (; k < 900 && Math.hypot(p.pos.x - x0, p.pos.z - z0) < 25; k++) {
            const dx = wb.pos.x - p.pos.x, dz = wb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(wb.pos.x, wb.pos.z, 0, 0, 3, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' ? d < 1.8 && (k % 40) < 16 : p.vel.y > 0 });
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['Warp-Box', !wb.hidden, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= 900) { log.push(['FEHLER: Warp-Box']); break; }
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        const y0 = p.pos.y;
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          ringInfo();
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const highEnough = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          const done = dist < within && highEnough && (Lg.y === undefined || p.mode === 'ground') && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          if (holdJ && landed && p.mode === 'ground' && !highEnough && i > 20) { landed = false; airborne = false; j0 = i + 1; }
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = Lg.rise && p.pos.y < Lg.rise && p.vel.y > 0 ? { x: 0, y: 0 } : this.airSteer(tx, tz, 0, 0, 2.6, 8);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          if (j0 === null && Lg.jumpAt && Lg.edgeJump && p.mode === 'ground' && dist > 0.6) {
            const ux = dx / dist, uz = dz / dist, h = c.world.raycastDown(p.pos.x + ux * 0.45, p.pos.y + 0.6, p.pos.z + uz * 0.45, 1.2);
            if (!h || h.y < p.pos.y - 0.4) j0 = i;
          }
          const jump = (holdJ && j0 !== null ? (i - j0 >= 0 && i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? false, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to, Lg.y, y0]); break; }
      }
      c.setInput({});
      ringInfo();
      mech.hurts = p.hurtTries ?? 0;
      const lk = named('lukas');
      if (lk?.info) mech.lukas = lk.info();
      const bl = named('blase');
      if (bl) mech.waveHits = bl.waveHits ?? 0;
      const rg = named('regen');
      if (rg?.info) mech.regen = rg.info();
      const kg = named('koenig');
      if (kg?.info) mech.koenigInfo = kg.info();
      const sk = named('schaukel');
      if (sk?.info) mech.schaukel = sk.info();
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, deathCause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
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
    /** Vorbereitungen für Bilder (in der Seite). */
    prep(what) {
      const p = P();
      p.invuln = 99;
      if (what === 'gondelFahrt') {
        const g = named('gondel');
        // in die Gondel und mitfahren bis zur Mitte
        for (let i = 0; i < 300 && !(g.state === 'move'); i++) { const dx = g.pos.x - p.pos.x, dz = g.pos.z - p.pos.z; c.setInput({ ...this.stick(dx, dz, 0.8), jump: i < 20 && i > 2 }); c.step(1); }
        for (let i = 0; i < 120 * 6 && g.u < 0.45; i++) { c.setInput({}); c.step(1); }
      } else if (what === 'kampf' || what === 'riese') {
        const b = named('blase') ?? named('koenig');
        for (let i = 0; i < 400 && !L.archetype?.started; i++) { c.setInput({ ...this.stick(0, -1, 0.6) }); c.step(1); }
        c.setInput({});
        if (what === 'riese') for (let i = 0; i < 120 * 25 && !(b.state === 'gland' || b.state === 'grest'); i++) { p.invuln = 99; c.step(1); }
        if (what === 'riese') for (let i = 0; i < 14; i++) c.step(1);
      }
      c.setInput(null);
      return p.info();
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = named(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  window.__w8d = W;
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
  if (process.env.TRACE) await sc((src) => { window.__trace = new Function('p', 's', `return (${src});`); }, process.env.TRACE);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w8d[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w8d_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8d.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.slots} Sterne (${R.meta.stars} im Level + Stern des Endgegners), Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.stars === R.meta.stars && meta.slots === R.meta.slots && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) if (n) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.time - 100} s (${res.time.toFixed(1)} s)`, reached && res.time < R.meta.time - 100);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt.slice(0, 3), { settle: 6, invuln: 99 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(30)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
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
  for (const [name, pos, steps = 0, prep = null] of R.shots) {
    if (SHOTS && !SHOTS.has(name)) continue;
    loaded = null;
    await load(id);
    await W('place', pos, { settle: 10, invuln: 99 });
    if (prep) await W('prep', prep);
    if (steps) await sc((n) => { const c = window.__course; c.player.invuln = 99; c.setInput({}); c.step(n); c.setInput(null); }, steps);
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
