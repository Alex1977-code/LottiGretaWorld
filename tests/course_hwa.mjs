// Halloween-Welt „Kürbisinsel“, Level H-1 „Kullerkürbisse im Abendrot“ (Kürbisfeld: Kürbis-Hüpfer im Bach, Kullerhang mit
// Riesenkürbissen, Laternenpfad durchs Maisfeld, Kürbis-Kanonen) und H-2 „Klingelstreich im Schlummerdorf“ (Süßes-oder-
// Saures-Dorf bei Nacht: Türen klingeln → Bitcoins, Süßes oder ein Kürbling):
// Laden ohne Konsolenfehler/-warnungen, Meta (Welt 31, Thema, Musik, Zeit, Sterne, Stempel), Gegnerzahlen, Routen-Bot
// (Lotti und Greta in Halloween-Verkleidung von Start bis Zielmast, deterministisch über __course.setInput/step, echte
// Eingaben – kein Teleport auf der Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras,
// Messgang entlang der Route (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera
// (tests/out/hwa_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_hwa.mjs [H-1|H-2]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; shotsA/shotsB = erste/zweite Hälfte der Bilder; je Lauf
//   ≤ 10 min: load,route · sweep · targets · extra · shotsA · shotsB getrennt) · HEROES=lotti,greta · ONLY=<Text> (nur
//   Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt in den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, runUp, within, run, slow, max, land, stopIf } ·
// { wait } · { hop } (Sprung auf der Stelle) · { pound: [x, z] } (hinspringen, Stampfattacke) · { crouch } · { star: i } ·
// { stamp: true } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung } · { door: id } (vor die Tür stellen und
// zu ihr schauen → klingeln) · { tapDoor: id } (Aktionstaste in Reichweite) · { stompDoor: id } (Stampfattacke auf die
// Schwelle) · { stompAll: Id-Anfang } · { bounce: [x, z], at: [x, z] } (Kessel/Trampolin hinauf, zum Ziel lenken)
const Y = 1;
const ROUTES = {
  'H-1': {
    start: [0, Y, 10],
    meta: { stars: 3, time: 400, theme: 'pumpkin', music: 'course_pumpkin', archetype: 'parcours', world: 31 },
    enemies: { kuerbling: 8, riesenkuerbling: 1, flatterfledi: 2, hexenhut_huepfer: 2 },
    main: [
      { name: 'Hof', to: [0, -6] },
      { name: 'Bachufer', to: [-1, -23.6], within: 0.4, run: false },
      { name: 'Kürbis 1', to: [-1.5, -28.4], jump: 24, within: 0.6, run: false },
      { name: 'Kürbis 2', to: [2.1, -32.6], jump: 24, within: 0.6, run: false },
      { name: 'Kürbis 3', to: [-1.2, -36.8], jump: 24, within: 0.6, run: false },
      { name: 'anderes Ufer', to: [0, -43], jump: 30, within: 0.8, run: false },
      { expect: 'steine3' },
      { name: 'Querroll-Feld', to: [0, -62] },
      { name: 'Kullerhang', to: [2.6, -95] },
      { name: 'am Verschlag vorbei', to: [2.8, -102] },
      { name: 'Checkpoint (Scheune)', to: [3, -104] },
      { name: 'Damm', to: [0, -132.4], within: 0.4 },
      { name: 'Lücke 1', to: [0, -137], jump: 22, within: 0.8, run: true },
      { to: [0, -146.4], within: 0.4, run: true },
      { name: 'Lücke 2', to: [0, -149.4], jump: 22, within: 0.8, run: true },
      { to: [-0.8, -156.4], within: 0.4, run: true },
      { name: 'Lücke 3', to: [0, -161.6], jump: 22, within: 0.8, run: true },
      { to: [0, -170.5], within: 0.4 },
      { expect: 'laternen8' },
      { name: 'Kürbis-Kanone', to: [0, -176.5], jump: 30, within: 0.25, run: false, stopIf: 'flown' },
      { crouchIf: 'notFlown', crouch: 12 },
      { wait: 30 },
      { expect: 'gelandet' },
      { name: 'Vogelscheuchen-Feld', to: [0, -244] },
      { name: 'Zielhügel', to: [0, -255.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Kürbis-Hüpfer: alle drei Bach-Kürbisse betreten', ok: (r) => r.mech.steine >= 3 },
      { name: 'Laternenpfad: alle acht Damm-Laternen gehen beim Vorbeilaufen an', ok: (r) => r.mech.laternen >= 8 },
      { name: 'mit der Kürbis-Kanone über die Kürbisschlucht geflogen (Zustand cannon)', ok: (r) => r.mech.cannon > 60 },
    ],
    targets: [
      { name: 'Stern 0: Winke-Kürbis stampfen', star: 0, from: [6, Y, -4],
        legs: [{ to: [8.6, -8.6], within: 0.3, run: false }, { pound: [9.5, -10.5] }, { wait: 60 }, { expect: 'winkeGegeben' }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Stampfen (Sprung auf den Kürbis)', star: 0, expectNot: true, from: [6, Y, -4], heroes: ['lotti'],
        legs: [{ to: [8.6, -8.6], within: 0.3, run: false }, { to: [9.5, -10.5], jump: 30, within: 0.5, run: false }, { wait: 60 }, { hop: 20 }, { wait: 60 }] },
      { name: 'Stern 1: Laternenweg in den Mais – Krümel finden', star: 1, from: [0, 5, -139],
        legs: [{ to: [-1, -141.2], within: 0.4, run: false }, { name: 'hinab in den Mais', to: [-5.2, -141.5], within: 0.6, run: false },
          { to: [-8.6, -145.5], within: 0.6, run: false }, { to: [-11.6, -149], within: 0.6, run: false }, { to: [-12.6, -150.8], within: 0.5, run: false },
          { wait: 30 }, { expect: 'kruemelFound' }, { star: 1 }], shot: 'stern1', mech: (r) => r.mech.kwLit >= 3, mechText: (r) => `Laternen am Weg ${r.mech.kwLit}/3` },
      { name: 'Stern 2: gelbe Kürbis-Kanone im Mais → Galerie der Windmühle', star: 2, from: [10.5, 3, -127],
        legs: [{ to: [10.5, -131], jump: 30, within: 0.25, run: false, stopIf: 'onGallery' }, { crouchIf: 'notFlownB', crouch: 12 }, { wait: 40 }, { expect: 'onGallery' }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Kanone (Rückwärtssalto unter der Galerie)', star: 2, expectNot: true, from: [24, 3, -132.8], heroes: ['lotti'],
        legs: [{ to: [23.6, -132.6], within: 0.2, run: false }, { backflip: true }, { wait: 60 }] },
      { name: 'Stempel: Lach-Grabstein → Laternen im Teich → Geisterbrücke zur Insel', stamp: true, from: [0, 5, -148.6],
        legs: [{ name: 'auf den Grabstein', to: [1, -151.6], jump: 20, within: 0.4, run: false }, { wait: 20 }, { expect: 'pfahlAn' },
          { to: [1.4, -153.6], within: 0.3, run: false },
          { name: 'Geisterplatte 1', to: [3.9, -154.4], jump: 22, within: 0.6, run: false },
          { name: 'Geisterplatte 2', to: [7.4, -156.2], jump: 24, within: 0.6, run: false },
          { name: 'Geisterplatte 3', to: [10.9, -157.8], jump: 24, within: 0.6, run: false },
          { name: 'Insel', to: [14.4, -158.2], jump: 28, within: 0.6, run: false },
          { to: [15.1, -158.6], within: 0.3, run: false }, { hop: 20 }, { wait: 30 }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Grabstein (Geisterplatten bleiben ungreifbar)', stamp: true, expectNot: true, from: [0, 5, -153.6], heroes: ['lotti'],
        legs: [{ to: [1.4, -153.6], within: 0.3, run: false }, { to: [3.9, -154.4], jump: 22, within: 0.6, run: false, max: 300, land: false }, { wait: 120 }] },
    ],
    extra: [
      { name: 'Kullerhang: Riesenkürbisse kullern im Zickzack herab und verletzen (ohne Unverwundbarkeit)', from: [0, 2.6, -76.2], heroes: ['lotti'], invuln: false, expectAlive: true,
        legs: [{ until: 'kuerbisTraf', max: 2400 }], mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Extraleben: unsichtbarer Block an der Scheune', from: [-4.6, 5, -103.8], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-4.6, -103.8], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Riesenkürbling: zwei Treffer → drei kleine Kürblinge', from: [3, 5, -112], heroes: ['lotti'],
        legs: [{ stompAll: 'kb_riese' }, { wait: 120 }, { expect: 'riesenKids' }] },
      { name: 'Checkpoint 2 nach der Kanone: Tod im Feld → Neustart am Landeplatz', from: [0, 4, -218.5], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, -220], within: 0.5 }, { to: [15, -222], within: 0.5, max: 500 }, { wait: 500 }, { expect: 'respawnLande' }] },
    ],
    shots: [
      ['start', [0, Y, 10]],
      ['winke', [6, Y, -4]],
      ['bach', [0, Y, -22]],
      ['kuerbis_huepfer', [-1.5, 1.25, -28.4]],
      ['querroll', [0, Y, -50], 300],
      ['kullerhang', [0, Y, -64], 360],
      ['kullerhang_oben', [6.2, 3.7, -84], 200],
      ['scheune', [3, 5, -100]],
      ['laternenpfad', [0, 5, -128], 600],
      ['damm', [0, 5, -142]],
      ['kruemel', [-10.4, 3, -147.6]],
      ['teich', [1, 5, -149.6]],
      ['kanone_mais', [10.5, 3, -126]],
      ['muehle', [24, 10.5, -133.6]],
      ['kanone', [0, 5, -171]],
      ['landeplatz', [0, 4, -213]],
      ['vogelscheuchen', [0, 4, -229], 240],
      ['ziel', [0, 7, -251]],
    ],
  },
  'H-2': {
    start: [0, Y, 11],
    meta: { stars: 3, time: 400, theme: 'candyvillage', music: 'course_candyvillage', archetype: 'parcours', world: 31 },
    enemies: { kuerbling: 4, hexenhut_huepfer: 3, flatterfledi_schwarm: 1, flatterfledi_glied: 5, flatterfledi: 1, suessigkeiten_tuer: 13 },
    main: [
      { name: 'erste Tür klingeln', door: 'tuer_e' },
      { name: 'Dorfeingang', to: [0, -18] },
      { name: 'Marktplatz', to: [3, -34] },
      { to: [3, -56] },
      { name: 'Gasse', to: [0, -74] },
      { to: [0, -112] },
      { name: 'Checkpoint (Brunnen)', to: [2, -118.5] },
      { name: 'Kirchplatz', to: [0, -144.4], within: 0.4 },
      { name: 'Markise → Stadtmauer', bounce: [0, -151.6], at: [0, -147.4], steerBelow: 30 },
      { expect: 'aufDerMauer' },
      { name: 'Treppe hinab', to: [0, -166] },
      { name: 'Kürbisfest', to: [0, -196], within: 0.4 },
      { name: 'Bühne', to: [0, -200.4], jump: 16, within: 0.5, run: false },
      { name: 'Zielmast', to: [0, -204.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'über eine federnde Markise auf die Stadtmauer (Tor bleibt zu)', ok: (r) => (r.mech.bounces ?? 0) >= 1 },
      { name: 'Eingangstür geklingelt (Hinlaufen)', ok: (r) => r.mech.rings.some((x) => x[0] === 'tuer_e' && x[1] === 1 && x[2] === 'walk') },
    ],
    targets: [
      { name: 'Stern 0: alle sechs Markt-Türen klingeln (Hinlaufen, Antippen, Stampfen) → Stern über dem Kessel, mit dem Kessel hinauf', star: 0, from: [0, Y, -22],
        legs: [{ door: 'markt1' }, { tapDoor: 'markt2' }, { door: 'markt3' }, { to: [0, -50], within: 0.6 }, { stompDoor: 'markt6' }, { door: 'markt5' }, { door: 'markt4' },
          { expect: 'marktAlle' }, { expect: 'marktHud' }, { expect: 'marktStern' }, { to: [0, -46.4], within: 0.4, run: false },
          { name: 'Kessel-Brunnen', bounce: [2.8, -43], at: [0, -43] }, { star: 0 }], shot: 'stern0',
        mech: (r) => r.mech.rings.map((x) => x[2]).join(',') === 'walk,action,walk,stomp,walk,walk', mechText: (r) => `Klingeln: ${r.mech.rings.map((x) => x[2]).join(', ')}` },
      { name: 'Stern 0 nicht mit fünf Türen (Kessel allein)', star: 0, expectNot: true, from: [0, Y, -22], heroes: ['lotti'],
        legs: [{ door: 'markt1' }, { door: 'markt2' }, { door: 'markt3' }, { door: 'markt4' }, { door: 'markt5' }, { to: [0, -46.4], within: 0.4, run: false },
          { name: 'Kessel-Brunnen', bounce: [2.8, -43], at: [0, -43] }, { wait: 60 }] },
      { name: 'Stern 1: Durchgang in den Hinterhof, die rosa Tür klingeln', star: 1, from: [0, 2, -90],
        legs: [{ name: 'Durchgang', to: [6, -90], within: 0.5, run: false }, { to: [10.5, -91.4], within: 0.5, run: false }, { door: 'geheim' }, { wait: 30 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Lach-Grabstein im Kirchhof → Steinstufen zur Glockenstube', star: 2, from: [-6, 3, -127],
        legs: [{ name: 'auf den Grabstein', to: [-10.2, -131.2], jump: 20, within: 0.4, run: false }, { wait: 60 }, { expect: 'turmweg' },
          { to: [-6.6, -132], within: 0.4, run: false },
          { name: 'Stufe 1', to: [-6.6, -133.6], jump: 22, within: 0.5, run: false },
          { name: 'Stufe 2', to: [-5.2, -136.2], jump: 26, within: 0.5, run: false },
          { name: 'Stufe 3', to: [-6.6, -138.8], jump: 26, within: 0.5, run: false },
          { name: 'Stufe 4', to: [-8.3, -136.4], jump: 26, within: 0.5, run: false },
          { name: 'Stufe 5', to: [-10.4, -136.8], jump: 26, within: 0.5, run: false },
          { name: 'Glockenstube', to: [-11, -139.4], jump: 26, within: 0.5, run: false }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Grabstein (Rückwärtssalto am Turm)', star: 2, expectNot: true, from: [-11, 3, -137.6], heroes: ['lotti'],
        legs: [{ to: [-11, -137.9], within: 0.2, run: false }, { backflip: true }, { wait: 60 }] },
      { name: 'Stempel: Spinnennetz-Trampolin → oben auf den Kürbis-Turm', stamp: true, from: [-6.6, 3, -196.4],
        legs: [{ name: 'Netz', bounce: [-11, -203.5], at: [-8, -200.2], steerBelow: 30 }, { expect: 'aufDemTurm' }, { hop: 20 }, { wait: 30 }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Netz (Rückwärtssalto am Kürbis-Turm)', stamp: true, expectNot: true, from: [-9.2, 3, -203.5], heroes: ['lotti'],
        legs: [{ to: [-9.5, -203.5], within: 0.2, run: false }, { backflip: true }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Tür am Eingang: Hinlaufen klingelt, fünf Bitcoins kommen heraus', from: [-3, Y, -4], heroes: ['lotti'], expectCoins: 5,
        legs: [{ door: 'tuer_e' }, { chaseKind: 'coin', max: 900, ids: null }] },
      { name: 'Kürbling hüpft aus der Tür (Markt 3) und zerplatzt beim Draufspringen', from: [-8, Y, -52], heroes: ['lotti'],
        legs: [{ door: 'markt3' }, { expect: 'kuerblingAusTuer' }, { stompKind: 'kuerbling', near: [-9, -55] }],
        mech: (r) => r.mech.kbStomped >= 1, mechText: (r) => `Kürblinge zerplatzt ${r.mech.kbStomped}` },
      { name: 'Markise auf dem Marktplatz federt zur Bitcoin-Säule', from: [-6.6, Y, -58], heroes: ['lotti'], expectCoins: 3,
        legs: [{ bounce: [-6.6, -58.6], at: [-6.6, -61.1], steerBelow: -3 }] },
      { name: 'Extraleben: unsichtbarer Block im Hinterhof', from: [10.5, 2, -95.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [10.5, -96.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Kichernder Geist verschwindet hinter dem Grabstein', from: [-10, 3, -127], heroes: ['lotti'],
        legs: [{ to: [-14, -129.4], within: 0.5, run: false }, { wait: 30 }, { expect: 'geistVersteckt' }] },
    ],
    shots: [
      ['start', [0, Y, 11]],
      ['eingangstuer', [-2.6, Y, -4]],
      ['markt', [0, Y, -24]],
      ['kessel', [0, Y, -36]],
      ['markt_hinten', [0, Y, -54]],
      ['gasse', [0, Y, -74], 240],
      ['gasse_oben', [0, 2, -92]],
      ['hinterhof', [9, 2, -89]],
      ['brunnen', [2, 3, -117]],
      ['kirchhof', [-6, 3, -127]],
      ['marktstaende', [0, 3, -142]],
      ['mauer', [0, 8, -151.6]],
      ['fest', [0, 3, -168]],
      ['kuerbisturm', [-6, 3, -194]],
      ['ziel', [0, 3, -196]],
    ],
  },
};

const PORT = 4570;
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
  const named = (id) => L.named.get(id);
  const COND = {
    // H-1
    steine3: () => (window.__hwaMech?.steine ?? 0) >= 3,
    laternen8: () => (named('laternenpfad')?.on ?? []).slice(0, 8).every(Boolean),
    flown: () => (named('kanone')?.shots ?? 0) > 0,
    notFlown: () => (named('kanone')?.shots ?? 0) === 0,
    notFlownB: () => (named('kanone_muehle')?.shots ?? 0) === 0,
    gelandet: () => P().pos.z < -205 && P().pos.y > 3.5 && P().mode === 'ground',
    winkeGegeben: () => !!named('winke')?.given,
    kruemelFound: () => !!named('kruemel')?.found,
    onGallery: () => P().pos.y > 10 && P().pos.x > 20 && P().mode === 'ground',
    pfahlAn: () => !!named('gp1')?.on && !!named('gp2')?.on,
    kuerbisTraf: () => (P().hurtTries ?? 0) > 0,
    riesenKids: () => (named('kb_riese')?.kids?.length ?? 0) >= 3,
    respawnLande: () => Math.abs(P().pos.z + 218.5) < 2 && P().pos.y > 3.5 && !P().dead,
    // H-2
    aufDerMauer: () => P().pos.y > 7.8 && P().pos.z < -150 && P().pos.z > -153,
    marktAlle: () => !!L.hwDoors?.markt?.done,
    marktHud: () => L._hwHud?.state()?.['tueren:markt']?.text === 'Türen 6/6',
    marktStern: () => L.entities.some((e) => e.kind === 'star' && e.index === 0 && !e.hidden && !e.removed),
    turmweg: () => !!L.named.get('turmweg')?.shown,
    aufDemTurm: () => P().pos.y > 10.5 && Math.hypot(P().pos.x + 11, P().pos.z + 203.5) < 1.6 && P().mode === 'ground',
    kuerblingAusTuer: () => L.entities.some((e) => e.kind === 'kuerbling' && e.spec?.fromDoor === 'markt3' && !e.removed),
    geistVersteckt: () => (L.named.get('kichergeist')?.hides ?? 0) >= 1,
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
      const mech = { hurts: 0, steine: 0, laternen: 0, cannon: 0, kwLit: 0, stomped: [], rings: [] };
      const steineSeen = new Set();
      window.__hwaMech = mech;
      const track = [];
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.mode === 'ground' && p.ground?.tag === 'kuerbis:stein') { steineSeen.add(p.ground.id); mech.steine = steineSeen.size; }
        if (p.state === 'cannon') mech.cannon++;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') {
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.setInput({}); c.step(1); steps++;
            if (p.state === 'cannon') mech.cannon++;
          }
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const goTo = (tx, tz, within = 0.25, max = 900) => {
        let i = 0;
        for (; i < max; i++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run: false });
        }
        return i < max;
      };
      /** Vor eine Tür stellen (1 m vor der Schwelle) und zu ihr schauen. */
      const faceDoor = (d) => {
        const fx = d.pos.x + d.nx * 1.0, fz = d.pos.z + d.nz * 1.0;
        goTo(fx, fz, 0.25, 1200);
        for (let k = 0; k < 20; k++) tick({ ...this.stick(-d.nx, -d.nz, 0.25), run: false });
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouchIf && !COND[Lg.crouchIf]()) continue;
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.backflip) {
          for (let k = 0; k < 8; k++) tick({ crouch: true });
          let top = p.pos.y;
          for (let k = 0; k < 40; k++) { tick({ crouch: true, jump: true }); top = Math.max(top, p.pos.y); }
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) { tick({}); top = Math.max(top, p.pos.y); }
          mech.backflipTop = top;
          log.push(['rückwärtssalto', p.state, +top.toFixed(2), +p.pos.y.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.4 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 34, run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ Türen klingeln (Hinlaufen / Antippen / Stampfen)
        if (Lg.door || Lg.tapDoor || Lg.stompDoor) {
          const id = Lg.door ?? Lg.tapDoor ?? Lg.stompDoor;
          const d = L.named.get(id);
          if (!d) { log.push(['FEHLER: Tür fehlt', id]); continue; }
          const r0 = d.rings;
          if (Lg.door) { faceDoor(d); for (let k = 0; k < 90 && d.rings === r0; k++) tick({ ...this.stick(-d.nx, -d.nz, 0.12), run: false }); }
          else if (Lg.tapDoor) { faceDoor(d); tick({ action: true }); tick({}); }
          else {
            const tx = d.pos.x + d.nx * 0.5, tz = d.pos.z + d.nz * 0.5;
            goTo(d.pos.x + d.nx * 2.2, d.pos.z + d.nz * 2.2, 0.3, 1200);
            let k = 0, pounding = false;
            for (; k < 400; k++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z, dd = Math.hypot(dx, dz);
              if (k > 5 && p.mode === 'ground') break;
              if (!pounding && k > 8 && dd < 0.35 && p.vel.y < 3) pounding = true;
              tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, dd * 1.2))), jump: k < 30, run: false });
            }
          }
          for (let k = 0; k < (Lg.after ?? 150); k++) tick({});
          mech.rings.push([id, d.rings - r0, d.via]);
          log.push(['tür', id, d.rings - r0, d.via, d.state]);
          if (d.rings === r0) log.push(['FEHLER: Tür klingelt nicht', id]);
          continue;
        }
        // ------------------------------------------------ Kessel/Trampolin: hinaufspringen, hochfedern, zum Ziel lenken
        if (Lg.bounce) {
          const [ax, az] = Lg.at, [tx, tz] = Lg.bounce;
          let k = 0, bounced = false, landed = false;
          for (; k < 900; k++) {
            if (p.dead) break;
            if (!bounced) {
              const dx = ax - p.pos.x, dz = az - p.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(ax, az, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz)))), jump: (p.mode === 'ground' && Math.hypot(dx, dz) < 2.2) || (p.mode === 'air' && p.vel.y > 0), run: false });
              if (p.jumpKind === 'bounce' && p.mode === 'air') bounced = true;
              continue;
            }
            const steer = p.vel.y < (Lg.steerBelow ?? 9);
            tick({ ...(steer ? this.airSteer(tx, tz, 0, 0, 2.6, 8) : {}), jump: true });
            if (p.mode === 'ground') { landed = true; break; }
          }
          log.push(['Trampolin', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed) { log.push(['FEHLER: Trampolin', Lg.at]); break; }
          mech.bounces = (mech.bounces ?? 0) + 1;
          continue;
        }
        // ------------------------------------------------ nächsten Gegner einer Art (nahe near) von oben besiegen
        if (Lg.stompKind) {
          const [nx, nz] = Lg.near ?? [p.pos.x, p.pos.z];
          const list = L.entities.filter((e) => e.kind === Lg.stompKind && e.alive && !e.removed && !e.defeated).sort((a, b) => Math.hypot(a.pos.x - nx, a.pos.z - nz) - Math.hypot(b.pos.x - nx, b.pos.z - nz));
          const e = list[0];
          let k = 0;
          for (; e && k < 1200 && e.alive && !e.defeated && !e.removed; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
            if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
            tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
          }
          if (e && (!e.alive || e.defeated || e.removed)) mech.kbStomped = (mech.kbStomped ?? 0) + 1;
          for (let i = 0; i < 60; i++) tick({});
          log.push(['zerplatzt', Lg.stompKind, !!e, k]);
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
            const hp0 = e.hp;
            let k = 0;
            for (; k < 900 && e.alive && !e.defeated && !e.removed && (Lg.once ? e.hp === hp0 : true); k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
            if (Lg.once) break;
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
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
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          if (j0 === null && Lg.runUp && p.mode === 'ground' && ((p.vel.x * dx + p.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to, JSON.stringify(hist.slice(-25))]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.laternen = (named('laternenpfad')?.on ?? []).slice(0, 8).filter(Boolean).length;
      mech.kwLit = (named('laternenpfad')?.on ?? []).slice(8).filter(Boolean).length;
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
    /** Aufschlüsselung des nächsten Bildes je Objekt: Aufrufe, Dreiecke. */
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
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
    /** Halloween-Verkleidung der Figur (Vertrag „Figuren Halloween“): Kennung am Avatar bzw. benannte Kostümteile. */
    costume: () => {
      const a = c.rig?.avatar ?? null;
      const tags = [];
      a?.root?.traverse?.((o) => { if (/hexenhut|katzen|kostuem|kostüm|halloween|witch|cat_/i.test(o.name ?? '')) tags.push(o.name); });
      const flag = a?.hwOutfit ?? a?.halloweenOutfit ?? a?.outfit ?? null;
      return { halloween: !!(flag && flag !== 'none') || tags.length > 0, flag, tags: tags.slice(0, 4), hero: P().hero };
    },
  };
  window.__hwa = W;
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
    await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
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

const W = (name, ...args) => sc(([n, a]) => window.__hwa[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 5, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}hwa_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__hwa.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: Welt ${R.meta.world}, ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.world === R.meta.world && meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    // 10 s laufen lassen (Gegner, Spender, Laternen) – ohne Fehler
    await sc(() => { const c = window.__course; c.player.invuln = 99; c.step(1200); c.player.invuln = 0; });
    check(`${id}: 10 s Simulation ohne Konsolenfehler`, errors.length === loadErrors.length);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const cos = await W('costume');
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}${cos.halloween ? ` (verkleidet: ${cos.flag ?? cos.tags.join(', ')})` : ' (ohne erkennbare Verkleidung)'}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
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
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
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
  if (ONLY || !(PARTS.has('shots') || PARTS.has('shotsA') || PARTS.has('shotsB'))) continue;
  loaded = null;
  await load(id);
  const half = Math.ceil(R.shots.length / 2);
  for (const [k, [name, pos, steps = 0, input = null, yaw = Math.PI / 2]] of R.shots.entries()) {
    if (SHOTS && !SHOTS.has(name)) continue;
    if (!PARTS.has('shots') && (PARTS.has('shotsA') ? k >= half : k < half)) continue;
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
