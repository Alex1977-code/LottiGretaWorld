// Welt 6, Level 6-5 „Pustewind am Eisgipfel“, 6-6 „Kanonenturm im Wolkenwerk“ und 6-Haus „Haus Volltreffer“ deterministisch
// prüfen (Simulation nur über window.__course.step(n) / setInput – echte Eingaben, kein Teleport auf den Routen):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot Lotti und
// Greta von Start bis Zielmast (6-5, 6-6), alle Sterne und Stempel mit der echten Mechanik samt Gegenproben, Extras,
// Prüfungs-Haus (alle fünf Räume mit Wurfbällen in je < 10 s, Gegenproben, Zeitablauf), Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w6c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w6c.mjs [6-5|6-6|6-Haus]
//   PARTS=load,route,sweep,targets,extra,shots,haus,haus-extra (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta ·
//   ONLY=<Text> (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> · DETAIL=1
//   (Zeichenaufrufe je Objekt) · RAUM=n (6-Haus: nur dieser Raum)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Auf den Routen ist die
// Figur unverwundbar (Treffer werden gezählt), damit Geometrie und Mechanik geprüft werden; im Prüfungs-Haus nicht.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4660;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const ALL = ['6-5', '6-6', '6-Haus'];
const LEVELS = only ? [only] : ALL;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots,haus,haus-extra').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;
const VERBOSE = !!process.env.VERBOSE;
const SAVE = 'lotti-greta-course-v1';

// ====================================================================== Routen (6-5, 6-6)
const ROUTES = {
  '6-5': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'snowwind', music: 'course_snowwind', archetype: 'parcours', world: 6, title: 'Pustewind am Eisgipfel' },
    enemies: { pustewolke: 5, glotzfisch: 5, pilzling_eis: 3 },
    main: [
      { name: 'zum Eissee', to: [0, -15], within: 0.8 },
      { name: 'über den Eissee', to: [5.6, -30], within: 1.2, dodge: true, run: false },
      { to: [-4.5, -44], within: 1.2, dodge: true, run: false },
      { to: [0, -52], within: 1.4, run: false, autoJump: false },
      { to: [0, -57], within: 0.8, autoJump: false },
      { name: 'Hang 1', to: [0, -67.6], within: 0.5 },
      { name: 'Hang 2', to: [-1, -82.6], within: 0.6 },
      { name: 'Hang 3', to: [0, -96], within: 0.6 },
      { name: 'Glasröhre 1', to: [0, -100.4], within: 0.3, stopIf: 'aufSee2' },
      { wait: 10 },
      { expect: 'aufSee2' },
      { name: 'Checkpoint', to: [-4, -122.5], within: 0.6 },
      { name: 'Eissee 2', to: [-3, -140], within: 1.0, dodge: true },
      { to: [-2, -163], within: 0.6, dodge: true },
      { to: [0, -165.2], within: 0.4, run: false },
      { name: 'Scholle 2', waitWind: 'boe1', to: [0, -176.8], jump: 30, jumpAt: 8.0, within: 0.7, run: true },
      { to: [0, -175.4], within: 0.4, run: false },
      { name: 'Scholle 3', waitWind: 'boe2', to: [0, -187.4], jump: 30, jumpAt: 8.0, within: 0.7, run: true },
      { to: [0, -185.8], within: 0.4, run: false },
      { name: 'Scholle 4', waitWind: 'aufwind', to: [0, -198], jump: 30, jumpAt: 8.1, within: 0.7, run: true },
      { name: 'Checkpoint 2', to: [0, -199.5], within: 0.5 },
      { to: [0, -204.4], within: 0.4, run: false },
      { name: 'Scholle F2', fishFree: 7, to: [-2, -209.75], jump: 26, within: 0.6, run: false },
      { to: [0, -211.4], within: 0.4, run: false },
      { name: 'Scholle F3', fishFree: 7, to: [2, -216.75], jump: 26, within: 0.6, run: false },
      { to: [0, -218.4], within: 0.4, run: false },
      { name: 'Scholle F4', fishFree: 7, to: [-1.5, -223.75], jump: 26, within: 0.6, run: false },
      { to: [0, -225.4], within: 0.4, run: false },
      { name: 'Scholle F5', fishFree: 7, to: [1.5, -230.75], jump: 26, within: 0.6, run: false },
      { to: [1, -232.4], within: 0.4, run: false },
      { name: 'Scholle F6', fishFree: 7, to: [0, -237.5], jump: 26, within: 0.6, run: false },
      { name: 'Glasröhre 2', to: [0, -243.4], within: 0.3, stopIf: 'aufGipfel' },
      { wait: 10 },
      { expect: 'aufGipfel' },
      { name: 'Zielmast', to: [0, -265.6], within: 0.25 },
    ],
    routeChecks: [
      { name: 'zwei Glasröhren, drei Windlücken abgewartet', ok: (r) => r.log.filter((l) => l[0] === 'fahrt').length >= 2 && r.log.filter((l) => l[0] === 'Böe abgewartet').length === 3 },
    ],
    targets: [
      { name: 'Stern 0: versteckten Block aufdecken, Treppe ?-Block → versteckter Block → ?-Block hinauf', star: 0, from: [-2, 0, -1.5],
        legs: [{ to: [-1.9, -3], within: 0.15, run: false }, { wait: 20 }, { hop: 30 }, { wait: 20 }, { expect: 'blockDa' },
          { to: [-4, -0.6], within: 0.5, run: false }, { to: [-7.2, -0.6], within: 0.4, run: false }, { wait: 10 },
          { name: 'Stufe', to: [-7.4, -3], jump: 30, within: 0.3, run: false }, { to: [-7.75, -3], within: 0.15, run: false }, { wait: 20 },
          { name: 'Block A', to: [-4.4, -3], jump: 64, jumpAt: 2.75, within: 0.3, run: false }, { expect: 'aufA' },
          { name: 'versteckter Block', to: [-1.9, -3], jump: 64, within: 0.3, run: false },
          { name: 'Block B', to: [0.6, -3], jump: 64, within: 0.3, run: false },
          { hop: 30 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne den versteckten Block (vom ?-Block A zu B)', star: 0, expectNot: true, from: [-6.8, 1.4, -3], heroes: ['lotti'],
        legs: [{ to: [-7.75, -3], within: 0.15, run: false }, { wait: 20 }, { name: 'Block A', to: [-4.4, -3], jump: 64, jumpAt: 2.75, within: 0.3, run: false }, { expect: 'aufA' },
          { to: [0.6, -3], jump: 64, within: 0.3, run: false, max: 200, land: false }, { hop: 64 }, { wait: 60 }],
        mech: (r) => r.log.some((l) => l[0] === 'erwartet' && l[1] === 'aufA' && l[2]) },
      { name: 'Stempel: Schlittschuh an, die Rampe hinauf über die Stachelplattform', stamp: true, from: [2, 0, 3],
        legs: [{ to: [4.2, 1.8], within: 0.2, run: false, stopIf: 'skates' }, { expect: 'skates' }, { to: [6, -6], within: 0.8, run: false, vmax: 4 },
          { to: [12, -6], within: 0.8, run: false, vmax: 4 }, { to: [20.5, -9.5], within: 0.4, run: false, vmax: 4 }, { wait: 20 }, { expect: 'skates' }],
        mech: (r) => !r.mech.hurts, mechText: (r) => `Treffer ${r.mech.hurts}`, invuln: false, shot: 'stempel' },
      { name: 'Stempel nicht unverletzt ohne Schlittschuh (Stacheln)', stamp: true, from: [6, 0, -6], heroes: ['lotti'], invuln: false,
        legs: [{ to: [12, -6], within: 0.8, run: false, max: 120, autoJump: false }, { wait: 30 }, { expect: 'verletzt' }],
        mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts}`, expectNot: true },
      { name: 'Stern 1: Schlittschuh, Stachelbrücke, Rätselbox, Zeitring – acht blaue Münzen auf dem Stachelrahmen', star: 1, from: [-4, -6, -122.5], invuln: false,
        legs: [{ to: [4.4, -121.5], within: 0.2, run: false, stopIf: 'skates' }, { expect: 'skates' },
          { to: [2, -127], within: 0.8, run: false, vmax: 4 }, { to: [5, -130.1], within: 0.6, run: false, vmax: 4 }, { to: [16, -130.1], within: 0.8, run: false, vmax: 6 }, { to: [20, -130], within: 0.6, run: false, vmax: 4 },
          { name: 'Rätselbox', to: [21.5, -130], jump: 24, within: 0.3, run: false, stopIf: 'aufBahn' }, { wait: 30 }, { expect: 'aufBahn' },
          { to: [79, -117.5], within: 0.2, run: false, stopIf: 'skates' }, { wait: 30 }, { expect: 'skates' },
          { to: [83.1, -121.5], within: 0.6, run: false, vmax: 4 }, { to: [83.1, -131.2], within: 0.8, run: false, vmax: 6, stopIf: 'bahnAktiv' }, { expect: 'bahnAktiv' },
          { name: 'Kreis', circle: [90, -130], r: 7.25, span: 6.05 },
          { star: 1 }],
        mech: (r) => !r.mech.hurts, mechText: (r) => `Münzen ${r.rt.coins}, Treffer ${r.mech.hurts}`, shot: 'stern1' },
      { name: 'Rätselbox: ohne Schlittschuh verletzen die Stacheln (Ring durchlaufen, Kreis zu Fuß)', star: 1, from: [80, -6, -130], heroes: ['lotti'], invuln: false,
        legs: [{ to: [83.1, -130], within: 0.6, run: false, max: 200, autoJump: false }, { wait: 30 }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts}`, expectNot: true },
      { name: 'Stern 2: im Aufwind über der dritten Lücke hoch hinauf', star: 2, from: [0, -6, -188.6],
        legs: [{ to: [0, -189.2], within: 0.3, run: false }, { waitWind: 'aufwind', afterWind: 0, waitFor: 'boe', to: [0, -193], jump: 30, within: 0.5, run: false, land: false, max: 140 },
          { to: [0, -197], within: 0.6, run: false }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Aufwind (Sprung in der Ruhe)', star: 2, expectNot: true, from: [0, -6, -188.6], heroes: ['lotti'],
        legs: [{ to: [0, -189.2], within: 0.3, run: false }, { waitWind: 'aufwind', to: [0, -197], jump: 30, within: 0.6, run: false }, { wait: 30 }] },
    ],
    extra: [
      { name: 'Extraleben: versteckter Block an der Start-Treppe', from: [-1.9, 0, -2.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-1.9, -3], within: 0.15, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', power: 'oneup', max: 1200 }] },
      { name: 'Windböe: Sprung mitten in der Böe verweht über den Schollenrand', from: [0, -6, -165.2], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ waitWind: 'boe1', waitFor: 'boe', to: [0, -176.8], straight: [0, -1], jump: 30, jumpAt: 8.0, within: 0.7, run: true, max: 160, land: false, stopIf: 'verweht' }, { expect: 'verweht' }],
        mech: (r) => r.log.some((l) => l[0] === 'erwartet' && l[1] === 'verweht' && l[2]), allowFail: true },
      { name: 'Checkpoint am zweiten Eissee: Absturz am Abgrund → Neustart dort', from: [-3, -6, -120], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [-4, -122.5], within: 0.5, run: false }, { to: [0, -162], within: 0.8, max: 1500 }, { to: [0, -166], within: 0.5, run: false },
          { to: [9, -166], within: 0.5, max: 200, autoJump: false }, { wait: 500 }, { expect: 'neustartD' }] },
    ],
    shots: [
      ['start', [0, 0, 5]], ['treppe', [-3, 0, 2]], ['stacheln', [7, 0, -4]], ['see', [0, 0, -20]], ['see_ende', [0, 0, -48]], ['hang', [0, 0, -55]],
      ['absatz1', [0, -4, -68]], ['absatz2', [0, -8, -84]], ['roehre1', [0, -10.5, -97]], ['see2', [0, -6, -122]], ['bruecke', [6, -6, -130]],
      ['bahn', [77, -6, -118]], ['abgrund', [0, -6, -166]], ['aufwind', [0, -6, -188]], ['bucht', [0, -6.5, -202]], ['bucht_mitte', [-2, -6.5, -224]],
      ['roehre2', [0, -6.5, -240]], ['gipfel', [0, 4, -256]],
    ],
  },
  '6-6': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 500, theme: 'factory', music: 'course_factory', archetype: 'parcours', world: 6, title: 'Kanonenturm im Wolkenwerk' },
    enemies: { kanone_turm: 7, riesenkanone: 1, pilzling: 4 },
    main: [
      { name: 'Kletterwand', fence: 'kletterwand', lane: -1.5, exit: [-1.5, -15.6], cannon: 'kanone_wand', danger: [5.4, 8.6] },
      { name: 'Blockende', to: [-1.2, -23.2], within: 0.4, run: false },
      { name: 'Wolke 1', to: [-1.2, -27], jump: 24, within: 0.6, run: false },
      { name: 'Wolke 2', to: [0, -30.6], jump: 24, within: 0.9, run: false, max: 400 },
      { name: 'Deck C1', to: [-0.5, -34.2], jump: 24, within: 0.6, run: false },
      { name: 'links am Gegenband', to: [-3.6, -38], within: 0.5, dodge: true },
      { to: [-3.6, -51.6], within: 0.4, dodge: true },
      { name: 'Aufzugsband', lift: 'aufzug_c', at: [0, -51.4], face: [0, -1], top: 20, exit: [0, -54.8] },
      { name: 'Querband', to: [-1.5, -61.2], within: 0.4 },
      { name: 'Wolke C3', to: [-2, -64], jump: 24, within: 0.5, run: false },
      { name: 'Wolke C4', to: [2, -66.2], jump: 24, within: 0.6, run: false },
      { name: 'Deck C2b', to: [1.5, -69.2], jump: 24, within: 0.6, run: false },
      { to: [0, -75.4], within: 0.3, dodge: true },
      { name: 'Warp-Box', to: [0, -77.6], jump: 24, within: 0.3, run: false, stopIf: 'onD' },
      { wait: 20 },
      { expect: 'onD' },
      { name: 'Checkpoint', to: [-3, -91.5], within: 0.5 },
      { name: 'Kanonen-Floß', ride: 'kanonenfloss', at: [1, 2.6], exit: [1, -147.5] },
      { to: [0, -152.4], within: 0.3, run: false },
      { name: 'Wolke F1', to: [0, -156.2], jump: 24, within: 0.5, run: false },
      { name: 'Wolke F2', to: [2.4, -159.6], jump: 24, within: 0.5, run: false },
      { name: 'Deck F1', to: [0.5, -163], jump: 24, within: 0.6, run: false, jumpAt: 3.2 },
      { name: 'Riesenprojektil', bullet: 'riesenkanone', edge: [0, -167.7], exit: [0, -194], minY: 35 },
      { name: 'Krallen-Automat', chaseKind: 'powerup', power: 'krallen', max: 900 },
      { expect: 'claws' },
      { name: 'Bandwand 1', climb: [0, -206], top: 44 },
      { name: 'Bandwand 2', climb: [0, -207.5], top: 54 },
      { name: 'Bandwand 3', climb: [0, -209], top: 59 },
      { name: 'Zielmast', to: [0, -219.6], within: 0.25 },
    ],
    routeChecks: [
      { name: 'Klettergitter, Aufzugsband, Warp-Box, Kanonen-Floß, Riesenprojektil, drei Bandwände mit Krallen', ok: (r) => r.mech.fence === 1 && r.mech.lifts === 1 && r.mech.warps >= 1 && r.mech.rides === 1 && r.mech.bullets === 1 && r.mech.climbs === 3 },
    ],
    targets: [
      { name: 'Stern 0: Schlot-Aufzugsband hoch – höchster Punkt des ersten Abschnitts', star: 0, from: [-1, 14, -17],
        legs: [{ lift: 'schlotband', at: [0.15, -21.5], face: [1, 0], top: 21, exit: [2.4, -21.5] }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Aufzugsband (Sprung an den Schlot)', star: 0, expectNot: true, from: [-1, 14, -17], heroes: ['lotti'],
        legs: [{ to: [0.3, -21.5], within: 0.3, run: false }, { hop: 40, dir: [1, 0] }, { wait: 60 }] },
      { name: 'Stern 1: Rätselbox → Rundband-Raum, acht blaue Münzen rund ums Rundband in 10 s', star: 1, from: [0, 30, -92],
        legs: [{ name: 'Rätselbox', to: [3.6, -94], jump: 24, within: 0.3, run: false, stopIf: 'inRaum' }, { wait: 30 }, { expect: 'inRaum' },
          { to: [71.0, -95], within: 0.2, run: false }, { path: [[73.4, -95, false, 0.2]] },
          { cleat: 'rundband', at: [73.5, -95], top: 34, minY: 31.5 },
          { path: [[77, -95], [80, -95], [83.6, -95], [87.4, -95, 24], [86.6, -95], [82.5, -95, false, 0.5], [78, -95, false, 0.5], [75.2, -95, false, 0.5], [72.6, -92.2]] },
          { star: 1 }], shot: 'stern1', mechText: (r) => `Münzen ${r.rt.coins}` },
      { name: 'Rätselbox: Zeit abgelaufen → Münzen weg, kein Stern', star: 1, expectNot: true, from: [71, 30, -95], heroes: ['lotti'],
        legs: [{ path: [[73.9, -95, false, 0.2]] }, { to: [72, -99], within: 0.4 }, { wait: 1400 }] },
      { name: 'Stern 2: linkes Senkrechtband hoch, oben nach rechts', star: 2, from: [-6, 34, -197],
        legs: [{ lift: 'linksband', at: [-6.5, -205.2], face: [0, -1], top: 48, exit: [-6.8, -205.3], hold: 24 }, { to: [5.6, -205.5], within: 0.4, run: false }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: vom Ziegel auf dem Sockel hochspringen', stamp: true, from: [1.6, 59, -211],
        legs: [{ to: [3.5, -213], jump: 40, within: 0.3, run: false }, { wait: 30 }, { hop: 40 }, { wait: 30 }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Ziegel (Ziegel zerstampft, Sprung vom Sockel)', stamp: true, expectNot: true, from: [1.6, 59, -211], heroes: ['lotti'],
        legs: [{ to: [3.5, -213], jump: 40, within: 0.3, run: false }, { wait: 30 }, { pound: [3.5, -213], hold: 3, early: 4 }, { wait: 40 }, { expect: 'ziegelWeg' }, { hop: 40 }, { wait: 30 }] },
    ],
    extra: [
      { name: 'Extraleben: versteckter Block über dem Aufzugsband', from: [-3, 20, -54.0], heroes: ['lotti'], expectLives: 1,
        legs: [{ hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', power: 'oneup', max: 1200 }] },
      { name: 'Kanonen-Floß wartet, bis man draufsteht', from: [0, 30, -96], heroes: ['lotti'],
        legs: [{ wait: 600 }, { expect: 'flossSteht' }, { ride: 'kanonenfloss', at: [1, 2.6], exit: [1, -147.5] }, { expect: 'flossAmZiel' }] },
      { name: 'Bandwand nicht ohne Krallen-Anzug', from: [0, 34, -203], heroes: ['lotti'], allowFail: true,
        legs: [{ climb: [0, -206], top: 44, soft: true, max: 600 }, { expect: 'unterT1' }], mech: (r) => r.log.some((l) => l[0] === 'erwartet' && l[1] === 'unterT1' && l[2]) },
      { name: 'Checkpoint-Deck nur per Warp-Box (Weitsprung von Deck C2 ins Leere)', from: [0, 20, -78], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, -79.6], within: 0.3, run: false }, { to: [0, -90], jump: 40, within: 0.5, max: 300 }, { wait: 300 }, { expect: 'nichtD' }] },
      { name: 'Checkpoint 2 am Förderband-Turm: Tod → Neustart auf Deck G', from: [0, 34, -196], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [-5.5, -195.5], within: 0.4 }, { to: [0, -194], within: 0.4 }, { to: [10, -194], within: 0.4, max: 300 }, { to: [14, -194], max: 200 }, { wait: 500 }, { expect: 'neustartG' }] },
    ],
    shots: [
      ['start', [0, 0, 5]], ['wand', [0, 0, -9]], ['wand_mitte', [-1.5, 6, -13.4]], ['block', [0, 14, -16]], ['wolken_c', [0, 14, -24]], ['deck_c1', [0, 14, -36]],
      ['aufzug', [0, 14, -50]], ['deck_c2', [0, 20, -56]], ['wolken_c2', [0, 20, -61]], ['warp', [0, 20, -72]], ['checkpoint', [-3, 30, -88]], ['raum', [73, 30, -90]],
      ['floss', [1, 30, -101]], ['f0', [0, 30, -147]], ['f1', [0, 34, -164]], ['turm', [0, 34, -195]], ['terrasse1', [0, 44, -206.8]], ['steg', [-6, 48, -205.4]], ['ziel', [0, 59, -212]],
    ],
  },
};

/** Bedingungen für expect/until/stopIf (in der Seite). */
function installCond() {
  const c = window.__course, L = c.level, P = () => c.player;
  window.__w6cond = {
    onD: () => P().pos.y > 29 && P().pos.z < -84 && P().pos.z > -100,
    nichtD: () => !(P().pos.y > 29 && P().pos.z < -84 && P().pos.z > -100 && !P().dead),
    flossSteht: () => (L.named.get('kanonenfloss')?.s ?? 1) < 0.01,
    flossAmZiel: () => (L.named.get('kanonenfloss')?.s ?? 0) > 36.5,
    unterT1: () => P().pos.y < 43,
    ziegelWeg: () => !L.entities.some((e) => e.kind === 'brick' && !e.removed && e.alive !== false && Math.abs(e.pos.y - 61) < 0.2),
    neustartG: () => Math.abs(P().pos.z + 195.5) < 2.5 && Math.abs(P().pos.y - 34) < 0.5 && !P().dead,
    claws: () => P().power === 'krallen',
    inRaum: () => P().pos.x > 60,
    aufSee2: () => P().pos.z < -117 && P().pos.y > -7 && P().pos.y < -3,
    aufGipfel: () => P().pos.z < -250 && P().pos.y > 3,
    skates: () => !!P().skate,
    ohneSkates: () => !P().skate,
    aufBahn: () => P().pos.x > 60 && P().pos.z < -110,
    bahnAktiv: () => L.named.get('bahnring')?.state === 'active',
    blockDa: () => L.entities.some((e) => e.spec?.id === 'versteckt' && e.kind !== 'hidden'),
    verletzt: () => (P().hurtTries ?? 0) > 0,
    verweht: () => P().dead || P().mode === 'script' || Math.abs(P().pos.x) > 3.4 || P().pos.y < -7,
    aufA: () => P().pos.y > 3.9 && Math.abs(P().pos.x + 4.4) < 0.7,
    neustartD: () => Math.abs(P().pos.z + 122.5) < 2.5 && Math.abs(P().pos.y + 6) < 0.6 && !P().dead,
  };
  return true;
}

// ====================================================================== Seiten-Hilfen (allgemein)
/** In der Seite: window.__w6 mit place, stick, drive (Wegpunkte), chase, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = () => c.level;
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); (p.hurtKinds ??= {})[p.lastHurt] = (p.hurtKinds[p.lastHurt] ?? 0) + 1; return orig(src); };
  };
  wrapHurt();
  const W = {
    P, L,
    place(pos, o = {}) {
      const p = P();
      c.setInput(null); c.setInput({});
      c.squad?.clear?.();
      if (p.holding) { const e = p.holding; p.holding = null; e.carrier = null; }
      p.setHero(o.hero ?? p.hero ?? 'lotti');
      p.dead = false;
      p.big = o.big ?? true;
      p.power = 'none'; p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.updateHalf?.();
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (L().runtime.status === 'dying') L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L().controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    /**
     * Routen-Bot: Beine (legs) nacheinander mit echten Eingaben. Beinarten:
     *   { to: [x, z], jump, jumpAt, runUp, within, run, slow, max, land, dodge, stopIf, autoJump }  Wegpunkt (optional Sprung)
     *   { wait } · { hop } · { expect: Bedingung } · { until: Bedingung, max } · { star: i } · { chaseKind, ids }
     *   { fence: id, lane, exit: [x, z] }       Klettergitter: anspringen, hochklettern (Projektilköpfen ausweichen), oben
     *                                           abspringen und auf die Plattform dahinter lenken
     *   { lift: bandId, at: [x, z], exit: [x, z] }   Förderband-Aufzug (Wand mit Stufen): auf eine Stufe springen, mitfahren,
     *                                           oben auf die Plattform springen
     *   { ride: fahrzeugId, at: [x, z] (Stand relativ zur Fahrzeugmitte), exit: [x, z] }   mitfahren, Köpfen ausweichen
     *   { bullet: kanoneId, edge: [x, z], exit: [x, z] }   auf ein Riesenprojektil springen, mitfahren, abspringen
     *   { climb: [x, z] (Wandpunkt), top }      Krallen: an die Wand springen, hochklettern, oben über die Kante
     *   { path: [[x, z, jump?], …] }            schnelle Punktfolge (Zeitring)
     *   { cleat: bandId, at: [x, z] }           Rundband: auf einen Mitnehmer der Rückseite springen, hochfahren
     */
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, fence: 0, lifts: 0, rides: 0, bullets: 0, climbs: 0, dodges: 0, warps: 0, maxY: -99 };
      const track = [];
      const COND = window.__w6cond ?? {};
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.pos.y > mech.maxY) mech.maxY = p.pos.y;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 4) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L().runtime.status === 'play' && !p.dead) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L().runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (/warp|pipe/.test(kind)) mech.warps++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      /** Drohender Projektilkopf (Annäherung in ≤ horizon s näher als r m, gleiche Höhe ± 1,1 m)? */
      const threat = (horizon = 0.5, r = 1.1) => {
        for (const e of L().entities) {
          if (e.kind === 'pilzling' && e.alive && !e.removed && !e.defeated && e.state !== 'squashed') {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dd = Math.hypot(dx, dz);
            const ahead = (dx * p.vel.x + dz * p.vel.z) / Math.max(0.1, dd * Math.hypot(p.vel.x, p.vel.z));
            if (dd < 1.6 && Math.abs(e.pos.y - p.pos.y) < 1 && (ahead > 0.3 || dd < 0.9)) return { e, t: 0.2 };
            continue;
          }
          if (e.kind === 'pilzling_eis' && !e.removed && !e.defeated) {
            // Eisläufer: nächste Annäherung mit seiner Geschwindigkeit vorhersagen
            const rvx = e.vel.x - p.vel.x, rvz = e.vel.z - p.vel.z, rx = e.pos.x - p.pos.x, rz = e.pos.z - p.pos.z;
            if (Math.abs(e.pos.y - p.pos.y) > 1.2) continue;
            const vv = rvx * rvx + rvz * rvz;
            const t = vv > 1e-6 ? Math.max(0, Math.min(horizon + 0.15, -(rx * rvx + rz * rvz) / vv)) : 0;
            if (Math.hypot(rx + rvx * t, rz + rvz * t) < r + 0.3) return { e, t };
            continue;
          }
          if ((e.kind !== 'projektilkopf' && e.kind !== 'suchkopf') || e.removed || e.state === 'fall' || e.state === 'burst') continue;
          const dir = e.dir ?? { x: Math.cos(e.yaw ?? 0), z: -Math.sin(e.yaw ?? 0) };
          const sp = e.speed ?? 5;
          const rvx = dir.x * sp - p.vel.x, rvz = dir.z * sp - p.vel.z;
          const rx = e.pos.x - p.pos.x, rz = e.pos.z - p.pos.z;
          if (Math.abs(e.pos.y + 0.33 - (p.pos.y + 0.5)) > 1.1) continue;
          const vv = rvx * rvx + rvz * rvz;
          const t = vv > 1e-6 ? Math.max(0, Math.min(horizon, -(rx * rvx + rz * rvz) / vv)) : 0;
          if (Math.hypot(rx + rvx * t, rz + rvz * t) < r && t < horizon) return { e, t };
        }
        return null;
      };
      const goTo = (tx, tz, within = 0.25, max = 900, run = false) => {
        let i = 0;
        for (; i < max; i++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run });
        }
        return i < max;
      };
      const jumpTo = (tx, tz, o2 = {}) => {
        let k = 0;
        for (; k < (o2.max ?? 300); k++) {
          if (p.dead) break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, o2.vx ?? 0, o2.vz ?? 0, o2.k ?? 3.2, o2.vmax ?? 8) : this.stick(dx, dz, 1)), jump: k < (o2.hold ?? 30), run: false });
          if (k > 6 && (p.mode === 'ground' || p.mode === 'wall')) break;
        }
        return k;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L().runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect]?.(); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        // ------------------------------------------------ Kreisfahrt (Schlittschuh): Winkel a von pos = (cx + cos a·r, cz − sin a·r), dir −1 = a fällt
        if (Lg.circle) {
          const [cx, cz] = Lg.circle, r = Lg.r, dir = Lg.dir ?? -1, la = Lg.la ?? 0.55, vmax = Lg.vmax ?? 7.5;
          const ang = () => Math.atan2(-(p.pos.z - cz), p.pos.x - cx);
          let a0 = ang(), prev = a0, done = 0, k = 0;
          for (; k < (Lg.max ?? 1200) && done < Lg.span; k++) {
            if (p.dead || L().runtime.status !== 'play') break;
            const a = ang();
            let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
            done += d * dir; prev = a;
            const ta = a + dir * la, rc = Math.hypot(p.pos.x - cx, p.pos.z - cz);
            const rt = Math.max(r - 1.5, Math.min(r + 1.5, r + 1.3 * (r - rc) + r * (1 / Math.cos(la / 2) - 1)));
            const tx = cx + Math.cos(ta) * rt, tz = cz - Math.sin(ta) * rt;
            const sp = Math.hypot(p.vel.x, p.vel.z);
            tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, sp > vmax ? 0.25 : 1), run: false });
          }
          log.push(['Kreis', k, +done.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), !!p.skate]);
          continue;
        }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true, ...(Lg.dir ? this.stick(Lg.dir[0], Lg.dir[1], 0.3) : {}) });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : Lg.power ? (e) => e.power === Lg.power : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > (Lg.early ?? 8) && d < 0.4 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < (Lg.hold ?? 34), run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ Klettergitter (Zaun): anspringen, klettern, oben abspringen
        if (Lg.fence) {
          const fe = L().fences?.find((f) => f.spec?.id === Lg.fence || f.id === Lg.fence) ?? L().named.get(Lg.fence)?.fence ?? null;
          const plane = (fe ?? L().fences?.[0])?.plane;
          if (!plane) { log.push(['FEHLER: Gitter fehlt', Lg.fence]); break; }
          const lane = Lg.lane ?? plane.x;
          goTo(lane, plane.z + plane.nz * 1.0 + plane.nx * 0, 0.2, 600);
          let k = 0;
          for (; k < 120 && p.mode !== 'wall'; k++) tick({ ...this.stick(-plane.nx, -plane.nz, 1), jump: k < 20 });
          if (p.mode !== 'wall') { log.push(['FEHLER: Gitter nicht gegriffen', Lg.fence, p.mode]); break; }
          mech.fence++;
          const top = plane.y + plane.h - p.half.y * 2 + 0.3;
          const kan = Lg.cannon ? L().named.get(Lg.cannon) : null;
          let stuck = 0, last = p.pos.y, waits = 0;
          for (k = 0; k < 2400 && p.mode === 'wall'; k++) {
            // Projektilkopf: unterhalb des Gefahrenbands warten, solange einer fliegt oder die Kanone lädt
            const band = Lg.danger;
            let up = 1;
            if (band && kan) {
              // vor dem Gefahrenband warten, bis ein Kopf gerade an der Figur vorbei ist (dann bleibt Zeit bis zum nächsten)
              const dirx = Math.cos(kan.yaw ?? 0);
              const passed = kan.heads?.some((h) => !h.removed && h.state !== 'fall' && (h.pos.x - p.pos.x) * dirx > 0.9);
              if (p.pos.y < band[0] && p.pos.y > band[0] - 1.2 && !passed) { up = 0; waits++; }
            }
            tick({ x: 0, y: up });
            if (p.pos.y >= top - 0.03) break;
            if (Math.abs(p.pos.y - last) < 1e-4 && up) stuck++; else stuck = 0;
            last = p.pos.y;
            if (stuck > 30) break;
          }
          log.push(['geklettert', +p.pos.y.toFixed(2), k, waits]);
          // oben: abspringen, zurück über die Kante lenken
          const [ex, ez] = Lg.exit;
          k = jumpTo(ex, ez, { hold: 24, k: 4, vmax: 6 });
          log.push(['über die Kante', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          if (p.mode !== 'ground' || p.pos.y < top) { log.push(['FEHLER: nicht oben', Lg.fence]); break; }
          continue;
        }
        // ------------------------------------------------ Förderband-Aufzug: Stufe abwarten, aufspringen, oben absteigen
        if (Lg.lift) {
          const band = L().named.get(Lg.lift);
          const [ax, az] = Lg.at;
          goTo(ax, az, 0.2, 600);
          const y0 = p.pos.y;
          let k = 0, on = false;
          for (; k < 1200 && !on; k++) {
            // eine Stufe ist knapp über Fußhöhe und kommt hoch → aufspringen
            const ly = band.ledgeInfo?.() ?? [];
            const ready = ly.some((y) => y > y0 + (Lg.lo ?? 0.35) && y < y0 + (Lg.hi ?? 0.75));
            if (!ready || p.mode !== 'ground') { tick({}); continue; }
            const [fx, fz] = Lg.face;
            let j = 0;
            for (; j < 120; j++) {
              tick({ ...this.stick(fx, fz, j < 6 ? 0.6 : 0.25), jump: j < 14 });
              if (j > 6 && p.mode === 'ground') break;
            }
            on = p.mode === 'ground' && p.ground?.tag === 'foerderband:stufe';
          }
          if (!on) { log.push(['FEHLER: keine Stufe', Lg.lift, p.ground?.tag]); break; }
          mech.lifts++;
          // mitfahren bis oben, dann zur Ausstiegsstelle springen
          let r = 0;
          for (; r < 1500; r++) {
            if (p.pos.y >= Lg.top - (Lg.early ?? 0.5)) break;
            tick(p.mode === 'ground' ? { ...this.stick(Lg.face[0], Lg.face[1], 0.15) } : {});
          }
          const [ex, ez] = Lg.exit;
          jumpTo(ex, ez, { hold: Lg.hold ?? 20, k: 3, vmax: 5 });
          goTo(ex, ez, 0.3, 300);
          log.push(['Aufzug', Lg.lift, k, r, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (Math.abs(p.pos.y - Lg.top) > 0.6) { log.push(['FEHLER: Aufzug oben nicht erreicht']); break; }
          continue;
        }
        // ------------------------------------------------ Fahrzeug: draufsteigen, mitfahren, Köpfen ausweichen, absteigen
        if (Lg.ride) {
          const v = L().named.get(Lg.ride);
          const [ox, oz] = Lg.at;
          let k = 0;
          for (; k < 900; k++) {
            const tx = v.pos.x + ox, tz = v.pos.z + oz;
            if (p.mode === 'ground' && p.ground?.mover === v.mover && Math.hypot(tx - p.pos.x, tz - p.pos.z) < 0.4) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(tx - p.pos.x, tz - p.pos.z, Math.min(1, Math.hypot(tx - p.pos.x, tz - p.pos.z)))), run: false });
          }
          mech.rides++;
          let r = 0, still = 0;
          for (; r < 6000; r++) {
            if (p.dead) break;
            const tx = v.pos.x + ox, tz = v.pos.z + oz;
            const th = p.mode === 'ground' ? threat(0.45, 1.0) : null;
            if (th) mech.dodges++;
            const d = Math.hypot(tx - p.pos.x, tz - p.pos.z);
            tick({ ...(d > 0.15 ? (p.mode === 'air' ? this.airSteer(tx, tz, v.mover.vx, v.mover.vz) : this.stick(tx - p.pos.x, tz - p.pos.z, Math.min(1, d))) : {}), jump: !!th });
            if ((v.speedNow ?? 0) < 0.01 && r > 120) still++; else still = 0;
            if (still > 60) break;
          }
          const [ex, ez] = Lg.exit;
          goTo(ex, ez, 0.4, 600);
          log.push(['Fahrt', Lg.ride, k, r, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Riesenprojektil: aufspringen, mitfahren, abspringen
        if (Lg.bullet) {
          const [ax, az] = Lg.edge;
          goTo(ax, az + (Lg.runup ?? 2.2), 0.2, 600);
          let k = 0, b = null;
          for (; k < 1800 && !b; k++) {
            b = L().entities.find((e) => e.kind === 'riesenprojektil' && !e.removed && e.state === 'fly' && e.pos.z < az - (Lg.near ?? 4.6) && e.pos.z > az - (Lg.far ?? 6.2)) ?? null;
            if (!b) tick({});
          }
          if (!b) { log.push(['FEHLER: kein Riesenprojektil']); break; }
          // anlaufen (vom Wartepunkt hinter der Kante), an der Kante abspringen, auf der Oberseite landen
          let j = 0, on = false, jumped = false;
          for (; j < 300; j++) {
            const vz = (b.dir?.z ?? -1) * (b.speed ?? 3.5);
            const tx = b.pos.x, tz = b.pos.z + (Lg.aim ?? 0.4);
            if (!jumped && p.mode === 'ground' && p.pos.z <= az + 0.15) jumped = true;
            if (!jumped) { tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 1), run: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, vz, 3.2, 10) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: j < 200, run: true });
            if (p.mode === 'ground' && p.pos.y > az * 0 + (Lg.minY ?? 34.5)) { on = true; break; }
            if (p.pos.y < (Lg.minY ?? 34.5) - 3) break;
          }
          if (!on) { log.push(['FEHLER: nicht auf dem Riesenprojektil', p.ground?.tag, +p.pos.y.toFixed(2)]); break; }
          mech.bullets++;
          const [ex, ez] = Lg.exit;
          let r = 0;
          for (; r < 3000; r++) {
            if (b.pos.z - 1.6 < ez + (Lg.lead ?? 4.5) || b.removed) break;
            const tx = b.pos.x, tz = b.pos.z - 0.4;
            tick(p.mode === 'ground' ? { ...this.stick(tx - p.pos.x, tz - p.pos.z, Math.min(1, Math.hypot(tx - p.pos.x, tz - p.pos.z))) } : {});
          }
          jumpTo(ex, ez, { hold: 26, k: 3, vmax: 7 });
          goTo(ex, ez, 0.4, 300);
          log.push(['Riesenprojektil', k, r, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Krallen: an die Wand, hochklettern, über die Kante
        if (Lg.climb) {
          const [wx, wz] = Lg.climb;
          const fx = Lg.face?.[0] ?? 0, fz = Lg.face?.[1] ?? -1;
          goTo(wx - fx * 1.2, wz - fz * 1.2, 0.2, 600);
          let k = 0, climbed = false;
          for (; k < (Lg.max ?? 900); k++) {
            if (p.dead) break;
            tick({ ...this.stick(fx, fz, 1), jump: p.mode === 'ground' && k % 40 < 10 });
            if (p.state === 'climb') climbed = true;
            if (p.mode === 'ground' && p.pos.y > Lg.top - 0.2) break;
          }
          if (climbed) mech.climbs++;
          log.push(['Krallen', k, climbed, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.power]);
          if (p.pos.y < Lg.top - 0.2) { log.push([Lg.soft ? 'nicht erklommen (erwartet)' : 'FEHLER: Wand nicht erklommen', Lg.climb]); if (!Lg.soft) break; }
          continue;
        }
        // ------------------------------------------------ Rundband: auf einen Mitnehmer der Rückseite springen
        if (Lg.cleat) {
          const band = L().named.get(Lg.cleat);
          const [ax, az] = Lg.at;
          goTo(ax, az, 0.15, 300);
          let k = 0, on = false;
          for (; k < 900 && !on; k++) {
            const cl = band.cleats.find((cc) => cc.side === 'hinten' && cc.mb.pos.y > p.pos.y + (Lg.lo ?? 1.3) && cc.mb.pos.y < p.pos.y + (Lg.hi ?? 1.9));
            if (!cl || p.mode !== 'ground') { tick({}); continue; }
            let j = 0;
            for (; j < 100; j++) {
              const tx = cl.mb.pos.x, tz = cl.mb.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(tx + (Lg.dx ?? 0), tz, 0, 0, 4, 4) : this.stick(tx - p.pos.x, tz - p.pos.z, 0.5)), jump: j < 30 });
              if (j > 6 && p.mode === 'ground') break;
            }
            on = p.mode === 'ground' && p.pos.y > Lg.minY;
            if (!on) { log.push(['Mitnehmer verfehlt', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2)]); goTo(ax, az, 0.15, 300); }
          }
          log.push(['Mitnehmer', k, on, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.ground?.tag]);
          if (!on) { log.push(['FEHLER: kein Mitnehmer']); break; }
          for (let r = 0; r < 400 && p.pos.y < Lg.top - 0.2; r++) tick({});
          continue;
        }
        // ------------------------------------------------ schnelle Punktfolge
        if (Lg.path) {
          for (const [tx, tz, jmp, w] of Lg.path) {
            if (jmp) jumpTo(tx, tz, { hold: jmp === true ? 26 : jmp, k: 3.4, vmax: 8 });
            else {
              let i = 0;
              for (; i < 400; i++) {
                const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
                if (d < (w ?? 0.35)) break;
                tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, 1)), run: true });
              }
            }
          }
          log.push(['Pfad', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ vor dem Sprung warten: Windböe vorbei (waitWind) bzw. kein Glotzfisch in der Nähe in der Luft (fishFree)
        if (Lg.waitWind) {
          const wf = L().named.get(Lg.waitWind);
          let k = 0, prev = wf.state;
          const want = Lg.waitFor ?? 'ruhe';
          for (; k < 1200; k++) { if (want === 'boe' ? (prev !== 'boe' && wf.state === 'boe') : (prev === 'boe' && wf.state === 'ruhe')) break; prev = wf.state; tick({}); }
          for (let w = 0; w < (Lg.afterWind ?? 0); w++) tick({});
          log.push(['Böe abgewartet', Lg.waitWind, k]);
        }
        if (Lg.fishFree) {
          let k = 0;
          const busy = () => L().entities.some((e) => e.kind === 'glotzfisch' && !e.removed && !e.defeated && (e.state === 'jump' || e.state === 'peek') && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < Lg.fishFree);
          let free = 0;
          for (; k < 1500; k++) { if (!busy()) free++; else free = 0; if (free > (Lg.freeFor ?? 6)) break; tick({}); }
          log.push(['Fische abgewartet', k]);
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          if (p.dead || L().runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim'))) && (!Lg.dodge || p.mode === 'ground');
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (Lg.straight) st = this.stick(Lg.straight[0], Lg.straight[1], 1);   // „naiv“: Stick stur in eine Richtung
          else if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.vmax && p.mode === 'ground') {
            const hs = Math.hypot(p.vel.x, p.vel.z), lim = dist < 3 ? Math.min(Lg.vmax, 3.5) : Lg.vmax;
            if (hs > lim + 1.5) st = this.stick(-p.vel.x, -p.vel.z, 1);
            else if (hs > lim) st = { x: st.x * 0.2, y: st.y * 0.2 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]?.()) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          if (j0 === null && Lg.runUp && p.mode === 'ground' && ((p.vel.x * dx + p.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          let dodgeJ = false;
          if (Lg.dodge && p.mode === 'ground') { const th = threat(0.4, 1.1); if (th) { dodgeJ = true; mech.dodges++; } }
          tick({ ...st, run: Lg.run ?? true, jump: jump || dodgeJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.hurtKinds = p.hurtKinds ?? {};
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L().runtime.status, info: p.info(), rt: L().runtime.info(), mech, power: p.power, track };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L().runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L().entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
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
    rt: () => L().runtime.info(),
    info: () => P().info(),
    arch: () => c.arch?.info?.() ?? null,
    kinds: () => { const m = {}; for (const e of L().entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L().runtime.save.lives,
    named: (id) => { const e = L().named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    /** Aufschlüsselung des nächsten Bildes je Objekt: Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L().entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
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
  };
  window.__w6 = W;
  return Object.keys(W);
}

// ====================================================================== 6-Haus: Raum-Bot (in der Seite)
/**
 * window.__haus: solve(i) löst Raum i mit Wurfbällen (echte Eingaben: Stick, Sprung, Aktion), zählt Treffer und Würfe.
 * Hilfen: walkTo (Wegpunkt), grab (zum Ball, Aktion), throwToward (ein paar Schritte in Zielrichtung, Aktion), waitPlay.
 */
function installHaus() {
  const c = window.__course, W6 = window.__w6, L = c.level, H = L.data._haus;
  const A = () => c.arch.info();
  const zu = (i, u) => H.Z0[i] - u;
  const S = { hits: 0, lastInv: 0, throws: 0, jumps: 0 };
  const step = (inp) => {
    c.setInput(inp); c.step(1);
    const p = L.player;
    if (p.invuln > S.lastInv + 0.5 && !p.dead && A().phase === 'play') S.hits++;
    S.lastInv = p.invuln;
  };
  const live = (i) => A().room === i && A().phase === 'play' && !L.player.dead;
  const walkTo = (i, x, u, o = {}) => {
    const tz = zu(i, u);
    let n = 0;
    for (; n < (o.max ?? 600) && live(i); n++) {
      const p = L.player, dx = x - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
      if (d < (o.within ?? 0.3) && p.mode === 'ground') break;
      step({ ...W6.stick(dx, dz, Math.max(o.minMag ?? 0.25, Math.min(o.mag ?? 1, d / 1.0))), run: o.run ?? false });
    }
    return n;
  };
  const ball = (id) => L.named.get(id);
  /** Zum Ball gehen (er liegt danach vor der Brust), zu ihm drehen und aufheben. */
  const grab = (i, id) => {
    const b = ball(id);
    if (!b) return false;
    const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
    let n = 0;
    for (; n < 400 && live(i) && !L.player.holding; n++) {
      const p = L.player, dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.85 && p.mode === 'ground') {
        const err = Math.abs(wrap(Math.atan2(-dz, dx) - p.yaw));
        if (err > 0.08) { step({ ...W6.stick(dx, dz, 0.12) }); continue; }
        step({ action: true }); step({});
        continue;
      }
      step({ ...W6.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false });
    }
    if (L.player.holding && L.player.holding !== b) log.push(['falscher Ball', L.player.holding.spec?.id]);
    return L.player.holding === b;
  };
  /** In Richtung (tx, tz) drehen (sanft lenken, bis die Blickrichtung passt) und werfen. */
  const throwToward = (i, tx, tz, k = 8, mag = 0.35) => {
    const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
    for (let n = 0; n < Math.max(k, 30) && live(i); n++) {
      const p = L.player, want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x);
      if (n >= k && Math.abs(wrap(want - p.yaw)) < 0.025) break;
      step({ ...W6.stick(tx - p.pos.x, tz - p.pos.z, mag) });
    }
    step({ action: true }); step({});
    S.throws++;
  };
  const waitPlay = (i, max = 1500) => { let n = 0; while (!(A().room === i && A().phase === 'play') && n++ < max) step({}); return A().room === i && A().phase === 'play'; };
  const waitClear = (i, max = 1200) => {
    let n = 0;
    while (live(i) && n++ < max) step({});
    for (let k = 0; k < 240 && A().flying; k++) step({});   // Stern fliegt noch zur Figur
    return n;
  };
  const log = [];
  const solve = [
    // 1 Kullerbahn: Ball vom Balkon in die Rinne werfen – er rollt durchs Mauseloch auf den Stern
    (i) => {
      grab(i, 'r1_ball');
      walkTo(i, 0, 5.2, { within: 0.25, mag: 0.6 });
      throwToward(i, 0, zu(i, 20));
      log.push(['wurf1', +L.player.pos.x.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
    },
    // 2 Bühne frei: an das Kraftfeld, warten bis die Hebebühne oben ankommt, dann werfen
    (i) => {
      grab(i, 'r2_ball3');
      walkTo(i, 0, 7.4, { within: 0.25 });
      const lift = L.named.get('r2_buehne');
      const top = H.R2.liftHi + 0.5;
      let prev = lift.shape.y1, n = 0;
      for (; n < 900 && live(i); n++) {
        const y = lift.shape.y1;
        if (y > top - 0.12 && prev <= top - 0.12) break;   // gerade oben angekommen
        prev = y;
        step({});
      }
      throwToward(i, 0, zu(i, H.R2.lift), 4, 0.2);
      log.push(['wurf2', n]);
    },
    // 3 Sprungfeld: Ball holen, aufs Sprungfeld springen, im Scheitel werfen, dann den Stern über dem Sprungfeld holen
    (i) => {
      grab(i, 'r3_ball');
      walkTo(i, 0, H.R3.sprung - 2.0, { within: 0.3 });
      const tz = zu(i, H.R3.sprung);
      let n = 0, bounced = false, thrown = false, apex = 0;
      for (; n < 900 && live(i); n++) {
        const p = L.player;
        if (!bounced && p.jumpKind === 'bounce') bounced = true;
        if (bounced && !thrown && p.vel.y < 0.6) { apex = p.pos.y; step({ ...W6.stick(0, -1, 0.15), action: true }); step({}); S.throws++; thrown = true; continue; }
        const st = p.mode === 'air' ? W6.airSteer(0, tz, 0, 0, 3, 5) : W6.stick(-p.pos.x, tz - p.pos.z, 1);
        if (bounced && !thrown) { step({ ...W6.stick(0, -1, 0.15), jump: true }); continue; }
        step({ ...st, jump: p.mode === 'ground' ? n % 30 < 12 : true });
        if (thrown && p.mode === 'ground' && p.ground?.tag !== 'trampoline') break;
      }
      log.push(['sprung3', bounced, thrown, +apex.toFixed(2), L.named.get('r3_schalter')?.state]);
      // weiter hüpfen, bis der Stern eingesammelt ist
      for (let k = 0; k < 900 && live(i); k++) {
        const p = L.player;
        const st = p.mode === 'air' ? W6.airSteer(0, tz, 0, 0, 3, 5) : W6.stick(-p.pos.x, tz - p.pos.z, 1);
        step({ ...st, jump: p.mode === 'ground' ? k % 30 < 12 : false });
      }
    },
    // 4 Gehege: Ball ans Kraftfeld tragen, auf den POW-Block werfen
    (i) => {
      grab(i, 'r4_ball2');
      walkTo(i, 0, 6.6, { within: 0.25 });
      throwToward(i, 0, zu(i, H.R4.pow), 4, 0.2);
      log.push(['wurf4', L.named.get('r4_pow')?.n ?? null]);
    },
    // 5 Schießbude: fünf Bälle, fünf Scheiben (je ein Ball, ein Wurf)
    (i) => {
      H.ZIELE5.forEach(([x, u], k) => {
        if (!live(i)) return;
        const t0 = c.level.time;
        walkTo(i, H.BAELLE5[k], H.R5.baelle - 0.85, { within: 0.12, mag: 0.7 });
        const ok = grab(i, `r5_ball${k + 1}`);
        const t1 = c.level.time;
        throwToward(i, x, zu(i, u), 7, 0.3);
        for (let n = 0; n < (k === 4 ? 70 : 24) && live(i); n++) step({});
        log.push(['scheibe', k + 1, ok, +(t1 - t0).toFixed(2), L.targets?.ziele5?.n ?? 0, +L.player.pos.x.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
      });
      // Stern auf der Wurfbühne holen
      const st = L.entities.find((e) => e.kind === 'star' && e.index === 4 && !e.removed && !e.hidden);
      log.push(['stern5', !!st, A().time, st ? [+st.pos.x.toFixed(2), +st.pos.y.toFixed(2), +(H.Z0[i] - st.pos.z).toFixed(2), st.touch] : null]);
      if (st) walkTo(i, st.pos.x, H.Z0[i] - st.pos.z, { within: 0.2, max: 400 });
      log.push(['ende5', A().time, +L.player.pos.x.toFixed(2), +L.player.pos.y.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
    },
  ];
  window.__haus = {
    solve: (i) => {
      log.length = 0;
      const h0 = S.hits, t0 = S.throws;
      if (!waitPlay(i)) return { error: 'kein Start', a: A() };
      const f0 = c.level.time;
      solve[i](i);
      waitClear(i);
      return { log: log.slice(), hits: S.hits - h0, throws: S.throws - t0, a: A(), t: +(c.level.time - f0).toFixed(2) };
    },
    step, waitPlay, walkTo, grab, throwToward, live, S, A, zu,
  };
  return true;
}

// ====================================================================== Laden
const allErrors = [];
let loaded = null;
async function load(id, o = {}) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !o.fresh) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    const go = async (url) => { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); } };
    if (o.fresh) {
      await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
      await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    }
    await go(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`);
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
  await sc((h) => { const c = window.__course; c.setHero(h); c.level.runtime.save.lives = 9; }, o.hero ?? 'lotti');
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w6[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w6c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w6.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ====================================================================== 6-Haus
const HAUS_NAMES = ['Kullerbahn (Ball durchs Mauseloch auf den Stern)', 'Bühne frei (Stern auf der roten Hebebühne treffen)', 'Sprungfeld (vom Sprungfeld auf den Druckschalter)',
  'Pilzling-Gehege (Ball auf den POW-Block)', 'Schießbude (fünf Schalterscheiben)'];

async function haus() {
  const id = '6-Haus';
  console.log(`\n${id}: fünf Räume mit Wurfbällen`);
  for (const hero of HEROES) {
    if (!(await load(id, { fresh: true, hero }))) { check(`${id} lädt`, false); return; }
    if (hero === HEROES[0] && PARTS.has('load')) {
      const d = await sc(() => {
        const c = window.__course, L = c.level, D = L.data;
        return { title: D.title, theme: D.theme, music: D.music, arch: D.archetype, world: D.world, rooms: D.house.rooms.length, goals: D.house.rooms.map((r) => r.goal),
          times: D.house.rooms.map((r) => r.time), fail: D.house.fail, starCount: L.runtime.starCount, kinds: window.__w6.kinds(),
          tapeten: (() => { const n = new Set(); L.view.three.traverse((o) => { if (/^tapete:/.test(o.name)) n.add(o.name); }); return n.size; })(),
          felder: (() => { let n = 0; L.view.three.traverse((o) => { if (o.name === 'kraftfeld') n++; }); return n; })() };
      });
      console.log(`  „${d.title}“, Welt ${d.world}, Thema ${d.theme}, Musik ${d.music}, Räume ${d.rooms} (${d.goals.join(', ')}), Arten ${JSON.stringify(d.kinds)}`);
      check(`${id}: lädt ohne Konsolenfehler/-warnungen`, errors.length === 0);
      for (const e of errors.slice(0, 8)) console.log('     ', e);
      check(`${id}: „Haus Volltreffer“, Welt 6, Archetyp house, Thema house, Musik course_house, 5 Räume à 10 s, 5 Sterne, fail 'exit'`,
        d.title === 'Haus Volltreffer' && d.world === 6 && d.arch === 'house' && d.theme === 'house' && d.music === 'course_house' && d.rooms === 5 && d.times.every((t) => t === 10) && d.fail === 'exit' && d.starCount === 5);
      check(`${id}: Ziele reach, reach, reach, defeatAll, reach`, d.goals.join() === 'reach,reach,reach,defeatAll,reach');
      check(`${id}: Wurfbälle 14, Zielscheiben 5, Druckschalter 1, POW 1, Pilzlinge 6 (${JSON.stringify(d.kinds)})`,
        d.kinds.wurfball === 14 && d.kinds.zielscheibe === 5 && d.kinds.pswitch === 1 && d.kinds.pow === 1 && d.kinds.pilzling === 6);
      check(`${id}: fünf eigene Tapeten, drei Kraftfelder (${d.tapeten}, ${d.felder})`, d.tapeten === 5 && d.felder === 3);
    }
    await sc(installHaus);
    const RAUM = process.env.RAUM ? Number(process.env.RAUM) - 1 : null;
    const r = await sc((R) => {
      const c = window.__course, Hs = window.__haus;
      const out = [];
      for (let i = 0; i < 5; i++) {
        if (R !== null && i !== R) { if (i < R) { c.arch.enterRoom(i + 1); } continue; }
        if (R !== null && i === R && c.arch.info().room !== i) c.arch.enterRoom(i);
        const res = Hs.solve(i);
        out.push({ room: i, cleared: c.arch.info().cleared, ...res, stars: c.level.runtime.stars.slice(0, 5) });
        Hs.step({});
      }
      for (let i = 0; i < 1800 && !c.finished && R === null; i++) Hs.step({});
      return { out, finished: c.finished, res: c.lastResult ?? null, a: c.arch.info(), save: window.__w6.save().levels?.['6-Haus'] ?? null };
    }, RAUM);
    for (const o of r.out) {
      const ok = o.stars[o.room] && !o.error && o.t < 10 && o.hits === 0;
      check(`${id}: ${hero} Raum ${o.room + 1} ${HAUS_NAMES[o.room]} in ${o.t} s (< 10 s, Würfe ${o.throws}, Treffer ${o.hits})`, ok);
      if (VERBOSE || !ok) console.log(`     Raum ${o.room + 1}: ${JSON.stringify(o.log)} ${JSON.stringify(o.a)}`);
    }
    if (RAUM === null) check(`${id}: ${hero} Ergebnis 5/5 gespeichert (${(r.res?.stars ?? []).map(Number).join('')})`, r.finished && r.res?.stars?.filter(Boolean).length === 5 && r.save?.stars?.filter(Boolean).length === 5 && !r.a.exited);
  }
}

// ====================================================================== Parcours (6-5, 6-6)
async function parcours(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
  await sc(installCond);
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: „${R.meta.title}“, Welt 6, ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.title === R.meta.title && meta.world === 6 && meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Fehlersuche: PARTS=probe FROM='[x,y,z]' LEGS='[…]' (Spur alle 6 Schritte)
  if (PARTS.has('probe')) {
    await W('place', JSON.parse(process.env.FROM), { hero: HEROES[0], settle: 10 });
    await sc(() => { const c = window.__course, L = c.level; window.__trace = []; L.onStep(() => { const p = c.player; if (Math.round(L.time * 120) % 6 === 0) { const b = L.entities.find((e) => e.kind === 'riesenprojektil' && !e.removed); window.__trace.push([+L.time.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '', b ? +b.pos.y.toFixed(2) : '', b ? +b.pos.z.toFixed(2) : '']); } }); });
    const res = await W('drive', JSON.parse(process.env.LEGS), {});
    for (const l of res.log) console.log('   ', JSON.stringify(l));
    if (process.env.TRACE) for (const t of await sc(() => window.__trace)) console.log('     ', JSON.stringify(t));
    console.log('   ', JSON.stringify(res.mech), res.status, JSON.stringify(res.rt.stars), res.rt.stamp);
    console.log('    übrige blaue Münzen:', JSON.stringify(await sc(() => window.__course.level.entities.filter((e) => e.kind === 'bluecoin' && !e.removed).map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1)]))));
    return;
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main.length ? [] : HEROES) {
    await load(id, { hero });
    await sc(installCond);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    if (!reached || VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 300 s (${res.time.toFixed(1)} s)`, reached && res.time < 300);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route
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
    if (VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id, { hero });
      await sc(installCond);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id, { hero });
      await sc(installCond);
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
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER')) && !t.allowFail) ok = false;
      if (!ok || VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) return;
  await load(id, { fresh: true });
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

// ====================================================================== Ablauf
for (const id of LEVELS) {
  if (id === '6-Haus') {
    if (PARTS.has('haus') || PARTS.has('load')) await haus();
    continue;
  }
  if (ROUTES[id]) await parcours(id);
}

if (stats.length) {
  console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
  for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
  const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
