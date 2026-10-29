// Welt 8, Level 8-Haus „Haus Krallenkraxel“ (Prüfungs-Haus: zehn Kletterräume à 10 s, alles mit dem Krallen-Anzug),
// 8-6 „Finsterfahrt im Spiegelspukhaus“ (stockdunkles Spukhaus mit Licht-Helm-Pflicht, runde Aufzugplattformen, Spuke,
// Kreisgeister, POW-Block, Großspuk, großer Spiegel, Türreihe mit Großspuk-Jagd, Figurenschalter) und 8-7 „Kullerklotz-Ritt
// durchs Glutinferno“ (Kristall-Felsklötze über Lava, Würfel mit zwei Abstürzen, Festland mit Hammer-Werfern, Lavahang,
// lange Kurvenroute):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120
// inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w8c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8c.mjs [8-Haus|8-6|8-7]
//   PARTS=load,route,sweep,targets,extra,shots,haus,haus-extra (Standard alle; je Lauf ≤ 10 min – 8-6 und 8-7 am besten in zwei
//   Läufen: PARTS=load,route,sweep und PARTS=targets,extra,shots) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras mit
//   diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe je
//   Objekt bei den Bildern) · RAUM=n (8-Haus: nur dieser Raum) · TRACE=1 (Spur der Figur im Protokoll)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Gegenproben
// und das Prüfungs-Haus laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf } ·
// { wait } · { hop } (Sprung auf der Stelle) · { star: i } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung } ·
// { stompAll: Id-Anfang } · { pound: [x, z], above } · { klotz: Id, pound: n (Stampfattacken unterwegs), leave: { z } (vorher
// abspringen), jumpAt: { z } (auf der Fahrt hochspringen), exit: [x, z] } · { warp: [x, z] } · { ride: mover-Id, board, exit, to } ·
// { light: Id-Anfang } (Licht-Helm auf Geister richten, bis sie verschwinden)
const S6 = { Y: 1, YU: 15, RB: 68 };
const ROUTES = {
  '8-6': {
    start: [0, 1, 5],
    meta: { stars: 3, time: 400, theme: 'darkghost', music: 'course_beamdark', archetype: 'parcours' },
    enemies: {
      'spuk (klein)': () => window.__course.level.entities.filter((e) => e.kind === 'spuk' && e.size < 1.5).length,
      'großspuk': () => window.__course.level.entities.filter((e) => e.kind === 'spuk' && e.size > 1.5).length,
      kreisgeist: () => window.__course.level.entities.filter((e) => e.kind === 'kreisgeist' || e.kind === 'kreisgeist_glied').length,
      knochenflieger: 10, helm_licht: 4, figurenschalter: 1, pow: 1, roter_ring: 1, warpbox: 2,
    },
    enemyCounts: { 'spuk (klein)': 10, 'großspuk': 2, kreisgeist: 44 },
    main: [
      { name: 'Licht-Helm vom Regal', to: [-1.8, 1.5], within: 0.3, run: false }, { expect: 'helm' },
      { name: 'auf die runde Aufzugplattform', to: [0, -9.6], within: 0.4, run: false },
      { name: 'erste Fahrt (Licht auf die Geister, POW-Block)', lift: 'lift1', guard: true, pow: { z: -15.5 }, exit: [0, -68.5] },
      { expect: 'saal' },
      { name: 'Großspuk mit Licht besiegen', light: 'grossspuk1' },
      { until: 'saaltuerOffen', max: 240 },
      { name: 'durch die Saaltür', to: [9.6, -72], within: 0.4, run: false },
      { name: 'zweite Fahrt (roter Ring)', lift: 'lift2', guard: true, exit: [0, -128] },
      { expect: 'cp' },
      { name: 'Kontrollpunkt', to: [0, -130], within: 0.5 },
      { name: 'Schnell-Aufzug im Statuenschacht', steig: 'steig', exit: [0, -146.5] },
      { expect: 'gang' },
      { name: 'Türreihe: Tür 1', to: [0, -153.8], within: 0.4, run: false },
      { name: 'Kreisgeist 1 (Lücke abwarten)', gap: 'kreisgeist', near: [0, -157, 3.2], to: [0, -160.4], clear: 1.3 },
      { name: 'Tür 2', to: [0, -163.8], within: 0.4, run: false },
      { name: 'Kreisgeist 2', gap: 'kreisgeist', near: [0, -167, 3.2], to: [0, -170.4], clear: 1.3 },
      { name: 'Tür 3', to: [0, -173.8], within: 0.4, run: false },
      { name: 'Kreisgeist 3', gap: 'kreisgeist', near: [0, -177, 3.2], to: [0, -180.4], clear: 1.3 },
      { name: 'zur Ausgangstür', to: [1.6, -190], within: 0.4, run: true },
      { to: [5.2, -190], within: 0.5, run: false },
      { expect: 'balkon' },
      { name: 'Sprung auf den Zielturm', to: [8.6, -190], within: 0.4, run: false },
      { name: 'Zielmast', to: [12.6, -190], jump: 40, within: 0.3, run: true }, { to: [13, -190], within: 0.15, run: false },
    ],
    routeChecks: [
      { name: 'Licht-Helm getragen, POW-Block verscheucht Geister, zwei Aufzugfahrten, Schnell-Aufzug', ok: (r) => r.mech.lifts === 3 && r.mech.schreck >= 3 && r.mech.lit >= 1 },
      { name: 'roter Ring auf der Fahrt: alle acht roten Münzen (Extraleben)', ok: (r) => r.mech.rotring === 'done' },
      { name: 'ohne Treffer-Versuch (Licht auf Geister, Lücken der Kreisgeister abgewartet)', ok: (r) => r.mech.hurts === 0 },
      { name: 'Großspuk 2 erwacht hinter der letzten Tür und jagt zur Ausgangstür', ok: (r) => r.mech.jagd === true },
    ],
    targets: [
      { name: 'Stern 0: Spiegelbild – über die unsichtbaren Spiegelstufen zum Stern', star: 0, from: [0, 1, -77.6], place: { invuln: 99 },
        legs: [{ to: [-1.0, -79.0], within: 0.3, run: false }, { to: [-1.0, -80.4], jump: 30, within: 0.4, run: false }, { expect: 'spiegelStufe1' },
          { to: [0.6, -82.0], jump: 30, within: 0.4, run: false }, { expect: 'spiegelStufe2' }, { to: [0.5, -82.25], within: 0.2, run: false }, { hop: 24 }], shot: 'stern0' },
      { name: 'Stern 0 ist im Saal unsichtbar (nur Spiegel-Ebene) und der Spiegel zeichnet sein Spiegelbild', star: 0, expectNot: true, from: [0, 1, -76], heroes: ['lotti'], place: { invuln: 99 },
        legs: [{ wait: 30 }], post: () => { const sp = window.__course.level.named.get('spiegel'); let l5 = !!sp.star?.model; sp.star?.model?.root?.traverse((o) => { if (o.isMesh && o.layers.mask !== 32) l5 = false; }); return { layer5: l5, renders: sp.renders, active: sp.active }; },
        postOk: (q) => q.layer5 && q.renders > 0 && q.active, postText: (q) => JSON.stringify(q) },
      { name: 'Stern 1: Rätselbox am Schnell-Aufzug – sechs Spuke mit Licht besiegen', star: 1, from: [0, 1, -137.6], place: { helmet: 'licht' },
        legs: [{ steig: 'steig', jumpTo: { y: 8.1, to: [-4.2, -141.8] } }, { until: 'rbraum', max: 600 }, { lightAll: 'rbspuk' }, { wait: 120 }, { star: 1 }, { warp: [68, -136.4] }, { expect: 'sims' }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Licht (Spuke nur anschauen)', star: 1, expectNot: true, from: [68, 1, -140], heroes: ['lotti'], place: { invuln: 99 },
        legs: [{ to: [64, -142], within: 0.5, run: false }, { wait: 240 }, { to: [72, -142], within: 0.5, run: false }, { wait: 240 }], mech: (r) => r.mech.rbLeft === 6, mechText: (r) => `${r.mech.rbLeft} Spuke` },
      { name: 'Stern 2: Ende des letzten Gangs – der Jäger-Großspuk erwacht, Stern holen, Großspuk mit Licht bannen', star: 2, from: [0, 15, -180.6], place: { helmet: 'licht' },
        legs: [{ to: [0, -196.6], within: 0.4 }, { expect: 'jagd' }, { star: 2 }, { light: 'grossspuk2', stay: true, max: 4200 }, { to: [1.6, -190], within: 0.4, run: false }, { to: [5.2, -190], within: 0.5, run: false }, { expect: 'balkon' }],
        mech: (r) => r.mech.hurts === 0, mechText: (r) => `Treffer ${r.mech.hurts}`, shot: 'stern2' },
      { name: 'Großspuk 2 jagt erst nach der letzten Tür (lauert vorher)', star: 2, expectNot: true, from: [0, 15, -175], heroes: ['lotti'], place: { invuln: 99 },
        legs: [{ wait: 240 }], mech: (r) => r.mech.jagd === false, mechText: (r) => `jagt ${r.mech.jagd}` },
      { name: 'Stempel: Figurenschalter nur für Greta – Leuchttreppe zur Empore', stamp: true, from: [3.6, 1, 3.6], heroes: ['greta'],
        legs: [{ to: [4.6, 2.2], within: 0.25, run: false }, { wait: 60 }, { expect: 'treppe' },
          ...[0, 1, 2, 3, 4, 5].map((i) => ({ to: [5.5, -0.6 - i * 0.96], jump: 26, within: 0.35, run: false })), { to: [5.6, -7.0], jump: 30, within: 0.4, run: false }, { hop: 20 }], shot: 'stempel' },
      { name: 'Stempel nicht mit Lotti (Schalter bleibt aus, Treppe verborgen)', stamp: true, expectNot: true, from: [3.6, 1, 3.6], heroes: ['lotti'],
        legs: [{ to: [4.6, 2.2], within: 0.25, run: false }, { wait: 90 }, { to: [5.5, -0.6], jump: 26, within: 0.35, run: false, max: 300 }, { wait: 30 }], mech: (r) => !r.mech.treppe, mechText: (r) => `Treppe ${r.mech.treppe ? 'da' : 'verborgen'}` },
    ],
    extra: [
      { name: 'Aufzugplattform ruht, bis man draufsteht', from: [0, 1, -6], heroes: ['lotti'], legs: [{ wait: 600 }], mech: (r) => r.mech.lift1s === 0, mechText: (r) => `s ${r.mech.lift1s}` },
      { name: 'Saaltür bleibt zu, solange Großspuk 1 da ist', from: [6.4, 1, -72], heroes: ['lotti'], place: { invuln: 99 },
        legs: [{ to: [10, -72], within: 0.4, run: false, max: 300, autoJump: false }], allowFail: true, mech: (r) => r.pos[0] < 8 && !r.mech.saaltuer, mechText: (r) => `x ${r.pos[0].toFixed(2)}` },
      { name: 'Extraleben: unsichtbarer Block im Spukzimmer', from: [62.5, 1, -137], heroes: ['lotti'], place: { invuln: 99 }, expectLives: 1,
        legs: [{ to: [62.5, -136], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['helmhalle', [-1.8, 1, 2.6], 0, null, 0],
      ['fahrt1', [0, 1.1, -11.6], 1500, null, Math.PI / 2, 'lift1'],
      ['spiegelsaal', [0, 1, -68.5]],
      ['spiegel', [0, 1, -77.2]],
      ['fahrt2', [13, 1.1, -72], 900, null, Math.PI / 2, 'lift2'],
      ['cp', [0, 1, -130]],
      ['schacht', [0, 1, -136.6]],
      ['gang', [0, 15, -147]],
      ['tueren', [0, 15, -170]],
      ['gangende', [0, 15, -188]],
      ['balkon', [6, 15, -190], 0, null, 0],
      ['spukzimmer', [68, 1, -138.5]],
    ],
  },
  '8-7': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'inferno', music: 'course_inferno', archetype: 'parcours' },
    enemies: { feuer_werfer: 3, lavablase: 10, knochenflieger: 2 },
    main: [
      { name: 'Wachstumsbeere aus dem ?-Block', to: [2.4, 1.2], within: 0.2, run: false }, { hop: 20 }, { chaseKind: 'powerup', max: 600 },
      { name: 'zum ersten Felsklotz', to: [0, -6.4], within: 0.4, run: false },
      { name: 'Felsklotz 1 (Schlangenlinie, zweimal Stampfen)', klotz: 'klotz1', pound: 2, exit: [0, -61] },
      { expect: 'plateau1' },
      { name: 'Würfel-Felsklotz (zwei Abstürze)', to: [0, -65], within: 0.4, run: false },
      { klotz: 'wuerfel', exit: [0, -131] },
      { expect: 'festland' },
      { name: 'Kontrollpunkt', to: [0, -134], within: 0.6 },
      { name: 'Hammer-Werfer 1', stompAll: 'hammer1' },
      { to: [-2, -160], within: 0.6 },
      { name: 'Hammer-Werfer 3', stompAll: 'hammer3' },
      { name: 'zum Lavahang', to: [0, -179.6], within: 0.4, run: false },
      { name: 'Felsklotz 3 (Lavahang hinab)', klotz: 'klotz3', exit: [0, -246] },
      { expect: 'plateau3' },
      { to: [0, -258], within: 0.5 },
      { name: 'Felsklotz 4 (lange Kurvenroute)', to: [0, -260.6], within: 0.4, run: false },
      { klotz: 'klotz4', pound: 2, exit: [0, -350] },
      { expect: 'zielinsel' },
      { name: 'Zielmast', to: [0, -356], within: 0.2 },
    ],
    routeChecks: [
      { name: 'vier Felsklotz-Fahrten, der Würfel stürzt zweimal 3 m ab, Stampfen gibt Schub', ok: (r) => r.mech.klotz === 4 && r.mech.falls === 2 && r.mech.boosts >= 2 },
    ],
    targets: [
      { name: 'Stern 0: vom Würfel auf die Kristall-Insel springen, der Stern-Klotz bringt zurück zum Festland', star: 0, from: [0, 0, -63],
        legs: [{ to: [0, -65], within: 0.4, run: false }, { klotz: 'wuerfel', hold: [-1.1, 0], leave: { z: -94.3 } }, { to: [5.5, -95], jump: 40, jumpAt: 4.0, within: 0.5, run: true }, { star: 0 },
          { klotz: 'sternklotz', exit: [8.4, -131] }, { expect: 'festland' }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne den Sprung (auf dem Würfel bleiben)', star: 0, expectNot: true, from: [0, 0, -63], heroes: ['lotti'],
        legs: [{ to: [0, -65], within: 0.4, run: false }, { klotz: 'wuerfel', exit: [0, -131] }] },
      { name: 'Stern 1: Sternenring – acht Sternmünzen auf den Kristallsäulen', star: 1, from: [0, -14, -244],
        legs: [{ to: [-1.6, -246.2], within: 0.3, run: false }, { to: [-6.6, -246.2], within: 0.4 },
          ...[[-9.2, -246], [-11.6, -246.8], [-13.8, -248.4], [-15.2, -250.8], [-15.2, -253.6], [-13.8, -256], [-11.6, -257.6], [-9.2, -258.4]].map(([x, z]) => ({ to: [x, z], jump: 26, within: 0.45, run: false })),
          { to: [-5.4, -257], jump: 30, within: 0.5, run: false }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne den Ring (Säulen ablaufen ohne Durchlaufen)', star: 1, expectNot: true, from: [-6.4, -14, -246.2], heroes: ['lotti'],
        legs: [...[[-9.2, -246], [-11.6, -246.8], [-13.8, -248.4]].map(([x, z]) => ({ to: [x, z], jump: 26, within: 0.45, run: false })), { wait: 60 }] },
      { name: 'Stern 2: auf der Kurvenfahrt unter dem Kristallbogen hochspringen', star: 2, from: [0, -14, -258],
        legs: [{ to: [0, -260.6], within: 0.4, run: false }, { klotz: 'klotz4', jumpAt: { z: -299.4 }, exit: [0, -350] }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Sprung (unter dem Bogen sitzen bleiben)', star: 2, expectNot: true, from: [0, -14, -258], heroes: ['lotti'],
        legs: [{ to: [0, -260.6], within: 0.4, run: false }, { klotz: 'klotz4', exit: [0, -350] }] },
      { name: 'Stempel: über den Absatz auf die Basaltsäule, Hammer-Werfer besiegen, zum Stempel hochspringen', stamp: true, from: [0, -6, -148],
        legs: [{ to: [1.4, -151.4], within: 0.4, run: false }, { to: [1.5, -154], jump: 30, within: 0.4, run: false }, { stompAll: 'hammer2' },
          { to: [4.5, -154], jump: 30, within: 0.3, run: false }, { hop: 40 }], shot: 'stempel' },
      { name: 'Stempel nicht vom Boden neben der Säule', stamp: true, expectNot: true, from: [4.5, -6, -156.4], heroes: ['lotti'],
        legs: [{ hop: 40 }, { to: [6.6, -154], within: 0.3, run: false }, { hop: 40 }] },
    ],
    extra: [
      { name: 'Felsklotz ruht in der Lava, solange niemand draufsteht', from: [0, 0, -5], heroes: ['lotti'],
        legs: [{ wait: 600 }], mech: (r) => r.mech.k1 === 'ruhe', mechText: (r) => `Zustand ${r.mech.k1}` },
      { name: 'Extraleben: unsichtbarer Block neben dem Rastplatz', from: [-4.4, 0, 1.2], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-4.4, -0.8], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block am Festland-Ende', from: [8.6, -6, -170], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [8.6, -172.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['klotz1', [0, 0.2, -9.2]],
      ['fahrt1', [0, 0.2, -9.2], 1200, null, Math.PI / 2, 'klotz1'],
      ['plateau1', [0, 0, -62]],
      ['wuerfel', [0, 0.2, -67.7], 1700, null, Math.PI / 2, 'wuerfel'],
      ['festland', [0, -6, -136]],
      ['saeule', [1.2, -6, -150]],
      ['hang', [0, -5.8, -183.2], 1200, null, Math.PI / 2, 'klotz3'],
      ['plateau3', [0, -14, -248]],
      ['kurve', [0, -13.8, -263.3], 2400, null, Math.PI / 2, 'klotz4'],
      ['ziel', [0, -14, -350]],
    ],
  },
};

const PORT = 4870;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const ALL = ['8-Haus', '8-6', '8-7'];
const LEVELS = only ? [only] : ALL;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots,haus,haus-extra').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;
const VERBOSE = !!process.env.VERBOSE;
const SAVE = 'lotti-greta-course-v1';

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
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const named = (id) => L.named.get(id);
  const COND = {
    // 8-6
    helm: () => P().helmet === 'licht',
    saal: () => at(-8, 8, 0.5, -65.5, -79),
    saaltuerOffen: () => named('saaltuer')?.locked === false,
    cp: () => at(-8, 8, 0.5, -125.5, -146),
    gang: () => P().pos.y > 14.5 && P().pos.z < -143 && !P().dead,
    balkon: () => at(3.6, 9.2, 14.5, -186, -194),
    spiegelStufe1: () => P().pos.y > 2.1 && P().mode === 'ground',
    spiegelStufe2: () => P().pos.y > 3.3 && P().mode === 'ground',
    rbraum: () => P().pos.x > 55 && !P().dead,
    sims: () => P().pos.x < -2 && P().pos.y > 8.5 && P().pos.z < -139 && !P().dead,
    treppe: () => named('stempeltreppe')?.info?.().hidden === false,
    jagd: () => L.entities.find((e) => e.spec?.id === 'grossspuk2')?.hunting === true,
    // 8-Haus
    schalter1: () => named('r1_schalter')?.state === 'active' || named('r1_schalter')?.state === 'done',
    rotFest: () => { const q = named('r3_rot')?.info?.()?.[0]; return !!q && q.on && !q.warn && q.solid > 0 && q.pending === 0; },
    blauFest: () => { const q = named('r3_blau')?.info?.()?.[0]; return !!q && q.on && !q.warn && q.solid > 0 && q.pending === 0; },
    rotAus: () => { const q = named('r3_rot')?.info?.()?.[0]; return !!q && !q.on && !q.warn; },
    ziegel6: () => L.entities.filter((e) => e.kind === 'brick' && !e.removed && e.spec?.roomId === 'r6').length <= 24,
    ziegel9: () => L.entities.filter((e) => e.kind === 'brick' && !e.removed && e.spec?.roomId === 'r9').length === 0,
    // 8-7
    plateau1: () => at(-7, 7, -0.5, -57.5, -67),
    festland: () => at(-11, 13, -6.5, -127.5, -183),
    plateau3: () => at(-8, 8, -14.5, -241.5, -263),
    zielinsel: () => at(-9, 9, -14.5, -345.5, -363),
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
      if (p.helmet) { p.helmet = null; p.helmetFx = null; }
      p.holding = null;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      p.updateHalf?.();
      if (o.power) p.setPower(o.power);
      if (o.helmet) L.spawn(`helm_${o.helmet}`, { pos: [pos[0], pos[1], pos[2]] });
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
      const mech = { hurts: 0, klotz: 0, falls: 0, boosts: 0, warps: 0, rides: 0, lifts: 0, stomped: [], hurtList: [] };
      const ghosts = new Set();
      const GHOSTS = ['spuk', 'kreisgeist', 'kreisgeist_glied'];
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if ((p.mode === 'ground' || p.mode === 'wall') && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 30 === 0) for (const e of L.entities) if (GHOSTS.includes(e.kind) && e.alive) ghosts.add(e);
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript && !o.house) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      // Prüfungs-Haus: Beine enden, sobald der Raum geschafft (Jubel, Überblendung) oder verloren ist
      const stop = () => p.dead || L.runtime.status !== 'play' || (o.house && L.house && L.house.phase !== 'play');
      const walk = (tx, tz, within = 0.4, max = 600, o2 = {}) => {
        let k = 0;
        for (; k < max && !p.dead; k++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2)))), run: o2.run ?? false, jump: o2.jump ?? false });
        }
        return k;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (stop()) break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait && !stop(); i++) tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ runde Aufzugplattform (mover, fährt beim Draufstehen los): Mitte halten,
        // Geister im Licht-Kegel halten (guard), unterwegs auf den mitfahrenden POW-Block springen (pow), am Ende aussteigen
        if (Lg.lift) {
          const h = L.named.get(Lg.lift), pm = h.pm;
          let n = 0;
          for (; n < 900 && !p.dead; n++) {
            const dx = pm.pos.x - p.pos.x, dz = pm.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && p.ground?.mover === h.mover && d < 0.4) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(pm.pos.x, pm.pos.z, h.mover.vx, h.mover.vz, 4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)))), run: false });
          }
          let started = false, powDone = false, guardT = 0;
          for (n = 0; n < 120 * 150 && !p.dead && L.runtime.status === 'play'; n++) {
            if (h.running) started = true;
            if (started && !h.running) break;
            const cx = pm.pos.x, cz = pm.pos.z, dc = Math.hypot(cx - p.pos.x, cz - p.pos.z);
            if (Lg.pow && !powDone && started && pm.pos.z <= Lg.pow.z && p.mode === 'ground') {
              powDone = true;
              const pw = L.entities.find((e) => e.kind === 'pow' && !e.removed);
              if (pw) {
                const n0 = pw.n;
                for (let q = 0; q < 200 && !p.dead && pw.n === n0; q++) {
                  const tx = pw.pos.x, tz = pw.pos.z;
                  tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, h.mover.vx, h.mover.vz, 5, 6) : this.stick(tx - p.pos.x, tz - p.pos.z, 0.6)), jump: q < 20, run: false });
                }
                log.push(['pow', pw.n - n0, L.geisterSchreck ?? 0]);
                for (let q = 0; q < 240 && p.mode !== 'ground' && !p.dead; q++) tick(this.airSteer(pm.pos.x, pm.pos.z, h.mover.vx, h.mover.vz, 4, 6));
              }
              continue;
            }
            let tgt = null;
            if (Lg.guard) {
              let best = 5.5;
              for (const e of L.entities) {
                if (!GHOSTS.includes(e.kind) || !e.alive || e.removed || e.defeated) continue;
                const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
                if (d < best && Math.abs(e.pos.y - p.pos.y) < 3) { best = d; tgt = e; }
              }
            }
            if (tgt) guardT++;
            if (dc > 1.0 || !tgt) tick(p.mode === 'air' ? this.airSteer(cx, cz, h.mover.vx, h.mover.vz, 4, 6) : (dc > 0.08 ? this.stick(cx - p.pos.x, cz - p.pos.z, Math.min(1, dc * 1.5)) : {}));
            else tick(this.stick(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z, 0.14));
          }
          mech.lifts++;
          log.push(['aufzug', Lg.lift, started, +pm.s.toFixed(1), n, guardT, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (Lg.exit) { const j = walk(Lg.exit[0], Lg.exit[1], 0.5, 900); if (j >= 900) log.push(['FEHLER: Ausstieg nicht erreicht', Lg.exit]); }
          continue;
        }
        // ------------------------------------------------ steigende Plattform (pingpong): unten aufsteigen, oben aussteigen bzw. unterwegs abspringen
        if (Lg.steig) {
          const h = L.named.get(Lg.steig), sh = h.shape;
          const top = () => sh.max[1], cx = () => (sh.min[0] + sh.max[0]) / 2, cz = () => (sh.min[2] + sh.max[2]) / 2;
          const th = sh.max[1] - sh.min[1];
          const lo = h.pm.pts[0].y + th, hi = h.pm.pts[h.pm.pts.length - 1].y + th;
          let n = 0;
          // warten, bis sie unten steht, dann zur Mitte
          for (; n < 3000 && !(top() < lo + 0.05 && h.pm.pause > 1.0 && Math.hypot(cx() - p.pos.x, cz() + 1.95 - p.pos.z) < 0.5); n++) { const ax = cx() - p.pos.x, az = cz() + 1.95 - p.pos.z; tick(this.stick(ax, az, Math.min(1, Math.hypot(ax, az)))); }
          for (let q = 0; q < 300 && !p.dead; q++) {
            const dx = cx() - p.pos.x, dz = cz() - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && p.ground?.mover === h.mover && d < 0.35) break;
            tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d * 1.2))), run: false });
          }
          const y0 = p.pos.y;
          const hold = () => { const ax = cx() - p.pos.x, az = cz() - p.pos.z, d = Math.hypot(ax, az); return d > 0.08 ? this.stick(ax, az, Math.min(1, d * 1.5)) : {}; };
          if (Lg.jumpTo) {
            for (n = 0; n < 900 && !p.dead && top() < Lg.jumpTo.y; n++) tick(hold());
            const [tx, tz] = Lg.jumpTo.to;
            for (let q = 0; q < 300 && !p.dead; q++) { tick({ ...this.airSteer(tx, tz, 0, 0, 3.6, 6), jump: q < 40 }); if (q > 6 && p.mode !== 'air') break; }
            log.push(['absprung', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          } else {
            for (n = 0; n < 900 && !p.dead && top() < hi - 0.05; n++) tick(hold());
            if (Lg.exit) { const j = walk(Lg.exit[0], Lg.exit[1], 0.5, 600); if (j >= 600) log.push(['FEHLER: Ausstieg nicht erreicht', Lg.exit]); }
          }
          mech.lifts++;
          log.push(['steigplattform', Lg.steig, +y0.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Licht-Helm: Geist(er) anleuchten, bis sie verschwinden
        if (Lg.light || Lg.lightAll) {
          const list = Lg.light ? [Lg.light] : L.entities.filter((e) => String(e.spec?.id ?? '').startsWith(Lg.lightAll) && e.alive && !e.removed).map((e) => e.spec.id);
          for (const id of list) {
            const e = L.entities.find((x) => x.spec?.id === id && !x.removed);
            let k = 0;
            for (; k < (Lg.max ?? 1500) && e && e.alive && !e.removed && !e.defeated && !p.dead; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              // heran bis in den Lichtkegel (7 m), dann stehen bleiben und ihn anschauen (angeschaut ist er langsam)
              // sitzt der Geist auf der Figur (anschauen unmöglich), erst ein Stück von ihm weg
              if (d < 1.2 && !Lg.stay) { const ax = d > 0.05 ? -dx : 1, az = d > 0.05 ? -dz : 0; for (let q = 0; q < 24; q++, k++) tick({ ...this.stick(ax, az, 1), run: true }); continue; }
              if (d > (Lg.dist ?? 5.5) && !Lg.stay) tick({ ...this.stick(dx, dz, Math.min(1, (d - 3) / 1.5 + 0.3)), run: false });
              else tick(this.stick(dx, dz, 0.07));
            }
            log.push(['licht', id, e ? e.vanishedBy ?? e.state : null, k, e ? +Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(1) : null, e ? +e.pos.y.toFixed(1) : null, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]);
            if (e && e.alive && !e.removed && !e.defeated) log.push(['FEHLER: Geist nicht besiegt', id]);
          }
          continue;
        }
        // ------------------------------------------------ Tatzenhieb (Krallen-Anzug) in Richtung [x, z]
        if (Lg.swipe) {
          const [tx, tz] = Lg.swipe;
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          for (let q = 0; q < 60; q++) { const want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x); if (q > 4 && Math.abs(wrap(want - p.yaw)) < 0.05) break; tick(this.stick(tx - p.pos.x, tz - p.pos.z, 0.1)); }
          tick({ action: true }); tick({});
          for (let q = 0; q < 30; q++) tick({});
          log.push(['tatzenhieb', +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Lücke zwischen kreisenden Gegnern (Art gap nahe near) abwarten
        if (Lg.gap) {
          const [cx, cz, cr] = Lg.near, [tx, tz] = Lg.to;
          const foes = () => L.entities.filter((x) => x.kind === Lg.gap && x.alive && !x.removed && !x.defeated && Math.hypot(x.pos.x - cx, x.pos.z - cz) < cr);
          const prevA = new Map();
          const safe = () => {
            const d0 = Math.hypot(tx - p.pos.x, tz - p.pos.z), T = d0 / 6.0 + 0.35;
            const list = foes().map((m) => {
              const rx = m.pos.x - cx, rz = m.pos.z - cz, a = Math.atan2(rz, rx);
              let w = 0;
              if (prevA.has(m)) { let da = a - prevA.get(m); if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; w = da * 120; }
              prevA.set(m, a);
              return { a, r: Math.hypot(rx, rz), w };
            });
            if (!list.length) return true;
            if (list.some((f) => f.w === 0)) return false;
            for (let t = 0; t <= T + 0.3; t += 0.05) {
              const k = Math.min(1, t / T), px = p.pos.x + (tx - p.pos.x) * k, pz = p.pos.z + (tz - p.pos.z) * k;
              for (const f of list) {
                const a = f.a + f.w * t;
                if (Math.hypot(cx + Math.cos(a) * f.r - px, cz + Math.sin(a) * f.r - pz) < (Lg.clear ?? 1.5)) return false;
              }
            }
            return true;
          };
          let k = 0;
          for (; k < 1200 && !safe(); k++) tick({});
          let j = 0;
          for (; j < 400 && !p.dead; j++) {
            const qx = tx - p.pos.x, qz = tz - p.pos.z, d = Math.hypot(qx, qz);
            if (d < (Lg.within ?? 0.4) && p.mode === 'ground') break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(qx, qz, 1)), run: true });
          }
          log.push(['lücke', Lg.gap, k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Kristall-Felsklotz: aufsteigen, mitfahren (Mitte halten), stampfen, absteigen
        if (Lg.klotz) {
          const k = L.named.get(Lg.klotz);
          const mb = k.mb;
          const topY = () => mb.pos.y + mb.size.y;
          let n = 0;
          for (; n < 600 && !p.dead; n++) {
            const dx = mb.pos.x - p.pos.x, dz = mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (k.carries(p) && d < 0.35 && p.mode === 'ground') break;
            const up = topY() > p.pos.y + 0.35 && p.mode === 'ground' && d < 2.6;
            tick({ ...(p.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)))), run: false, jump: up });
          }
          const b0 = k.boosts ?? 0, f0 = k.falls ?? 0;
          let pounds = 0, lastPound = 0, jumped = false;
          const [hx, hz] = Lg.hold ?? [0, 0];
          for (n = 0; n < 120 * 90 && !p.dead && L.runtime.status === 'play'; n++) {
            if (k.state === 'ende' || k.state === 'sinkt' || k.state === 'weg') break;
            if (Lg.leave && mb.pos.z <= Lg.leave.z) break;
            const dx = mb.pos.x + hx - p.pos.x, dz = mb.pos.z + hz - p.pos.z, d = Math.hypot(dx, dz);
            if (Lg.jumpAt && !jumped && mb.pos.z <= Lg.jumpAt.z && p.mode === 'ground') {
              jumped = true;
              for (let q = 0; q < 240 && !p.dead; q++) { tick({ ...this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6), jump: q < (Lg.jumpAt.hold ?? 40) }); if (q > 4 && p.mode === 'ground') break; }
              log.push(['hochsprung', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
              continue;
            }
            if (Lg.pound && pounds < Lg.pound && k.state === 'faehrt' && steps - lastPound > 300 && p.mode === 'ground' && d < 0.5) {
              pounds++; lastPound = steps;
              for (let q = 0; q < 14; q++) tick({ ...this.stick(dx, dz, Math.min(1, d)), jump: true });
              tick({ crouch: true }); tick({ crouch: true });
              for (let q = 0; q < 240 && p.mode !== 'ground' && !p.dead; q++) tick({});
              continue;
            }
            tick(p.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6) : (d > 0.08 ? this.stick(dx, dz, Math.min(1, d * 1.5)) : {}));
          }
          mech.klotz++;
          mech.falls += (k.falls ?? 0) - f0;
          mech.boosts += (k.boosts ?? 0) - b0;
          log.push(['felsklotz', Lg.klotz, k.state, n, (k.falls ?? 0) - f0, (k.boosts ?? 0) - b0, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (Lg.exit) {
            const [ex, ez] = Lg.exit;
            const j = walk(ex, ez, 0.5, 900, { run: false });
            if (j >= 900) log.push(['FEHLER: Ausstieg nicht erreicht', Lg.exit]);
          }
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
        // ------------------------------------------------ Sprung auf [x, z] mit Stampfattacke über dem Ziel
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounded = false;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && k > 4 && (pounded || p.state === 'groundpound')) break;
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5 && p.pos.y > (Lg.above ?? -99)) { pounded = true; }
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box / Rätselbox springen und hindurch
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
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          if (stop()) break;
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
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.lives = L.runtime.save?.lives;
      mech.k1 = L.named.get('klotz1')?.state ?? null;
      mech.lit = [...ghosts].filter((e) => e.vanishedBy === 'light').length;
      mech.schreck = L.geisterSchreck ?? 0;
      mech.rotring = L.entities.find((e) => e.kind === 'roter_ring')?.state ?? null;
      const sp = L.named.get('spiegel');
      if (sp) {
        let layer5 = true;
        sp.star?.model?.root?.traverse((o) => { if (o.isMesh && o.layers.mask !== (1 << 5)) layer5 = false; });
        mech.spiegel = { layer5: !!sp.star?.model && layer5, renders: sp.renders, active: sp.active };
      }
      mech.rbLeft = L.entities.filter((e) => String(e.spec?.id ?? '').startsWith('rbspuk') && e.alive && !e.removed && !e.defeated).length;
      mech.treppe = L.named.get('stempeltreppe')?.info?.().hidden === false;
      mech.lift1s = L.named.get('lift1')?.pm?.s ?? null;
      mech.saaltuer = L.named.get('saaltuer')?.locked === false;
      mech.jagd = L.entities.find((e) => e.spec?.id === 'grossspuk2')?.hunting ?? null;
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
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = ent(id); return e?.info?.() ?? null; },
    cond: (k) => COND[k](),
  };
  window.__w8 = W;
  return Object.keys(W);
}

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
    await go(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`);
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
  await sc((h) => { const c = window.__course; c.level.runtime.save.lives = 9; void h; }, o.hero ?? 'lotti');
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w8[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w8c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ====================================================================== 8-Haus: Raum-Bot (Beine wie die Route, echte Eingaben)
const HAUS_NAMES = ['Bauklotzturm (hinüber, Stern unten, Druckschalter oben)', 'Kristallhöhle (zwei Felsstufen)', 'Piep-Wand (rot, dann blau im Takt)',
  'Glutwand (Gasse zwischen den Lavarinnen)', 'Leuchtturm (zwei Stufen, Stern oben)', 'Ziegelsperre (Tatzenhieb, dann klettern)', 'Doppelwand (hinauf, hinüber, hinauf)',
  'Lavaquerung (zwei Basaltsäulen)', 'POW-Wand (POW-Block zerschlägt die Ziegel)', 'Bröckelturm (Bauklötze brechen hinter der Figur)'];
/** Beine je Raum (i, Z0 = Raumanfang): R(x, u) = Punkt u m in den Raum hinein. */
function hausLegs(i, Z0) {
  const R = (x, u) => [x, Z0 - u];
  const L = [
    [{ to: R(0, 5.2), within: 0.3, run: false }, { name: 'Turm hinauf', to: R(0, 8), jump: 40, within: 0.6, run: false }, { pound: R(0, 8) }, { expect: 'schalter1' },
      { to: R(0, 11.6), within: 0.5, run: false }, { to: R(0, 12.8), within: 0.3, run: false }, { wait: 40 }, { to: R(0, 13.1), within: 0.15, run: false }],
    [{ to: R(0, 4.2), within: 0.3, run: false }, { name: 'Felsstufe 1', to: R(0, 6.4), jump: 40, within: 0.6, run: false }, { name: 'Felsstufe 2', to: R(0, 9.2), jump: 40, within: 0.6, run: false },
      { to: R(0, 11.5), within: 0.3 }],
    [{ to: R(0, 4.0), within: 0.3, run: false }, { until: 'rotFest', max: 900 }, { name: 'rote Blöcke hinauf', to: R(0, 7), jump: 40, within: 0.5, run: false },
      { until: 'blauFest', max: 900 }, { name: 'blaue Blöcke hinauf', to: R(0, 10.4), jump: 40, within: 0.6, run: false }, { to: R(0, 12.5), within: 0.3 }],
    [{ to: R(2.75, 3.7), within: 0.25, run: false }, { name: 'über den Graben an die Wand (Gasse rechts)', to: R(2.75, 8.6), jump: 40, within: 0.6, run: true }, { to: R(0, 12), within: 0.3 }],
    [{ to: R(0, 4.6), within: 0.3, run: false }, { name: 'untere Stufe', to: R(0, 6.5), jump: 40, within: 0.35, run: false }, { name: 'obere Stufe', to: R(0, 8.5), jump: 40, within: 0.5, run: false }],
    [{ to: R(0, 4.3), within: 0.2, run: false }, { swipe: R(0, 5.5) }, { wait: 24 }, { expect: 'ziegel6' }, { to: R(0, 7.2), within: 0.3, run: false },
      { name: 'Bauwand hinauf', to: R(0, 10), jump: 40, within: 0.6, run: false }, { to: R(0, 12), within: 0.3 }],
    [{ to: R(0, 4.6), within: 0.3, run: false }, { name: 'vordere Wand', to: R(0, 7), jump: 40, within: 0.5, run: false }, { to: R(0, 7.65), within: 0.2, run: false, slow: 0.4 },
      { name: 'hinüber an die hintere Wand', to: R(0, 11), jump: 40, within: 0.6, run: false }, { to: R(2.5, 14), within: 0.3 }],
    [{ to: R(0, 2.8), within: 0.25, run: false }, { name: 'Säule 1', to: R(0, 5.75), jump: 40, within: 0.5, run: false }, { to: R(0, 6.2), within: 0.2, run: false, slow: 0.4 },
      { name: 'Säule 2', to: R(0, 9.75), jump: 40, within: 0.5, run: true }, { to: R(0, 10.2), within: 0.2, run: false, slow: 0.4 },
      { name: 'Zielpodest', to: R(0, 15), jump: 40, within: 0.6, run: true }, { to: R(0, 16.5), within: 0.3 }],
    [{ name: 'auf den POW-Block', to: R(0, 3.6), jump: 22, within: 0.35, run: false }, { wait: 20 }, { expect: 'ziegel9' }, { to: R(0, 6.9), within: 0.3, run: false },
      { name: 'Kletterspalte hinauf', to: R(0, 9.6), jump: 40, within: 0.6, run: false }, { to: R(0, 12), within: 0.3 }],
    [{ to: R(0, 5.4), within: 0.3, run: false }, { name: 'Bauklötze hinauf', to: R(0, 10), jump: 40, within: 0.6, run: false }, { to: R(0, 12.5), within: 0.3 }],
  ];
  return L[i];
}

function installHaus() {
  const c = window.__course, W8 = window.__w8, L = c.level;
  const A = () => c.arch.info();
  const waitPlay = (i, max = 1500) => { let n = 0; while (!(A().room === i && A().phase === 'play') && n++ < max) { c.setInput({}); c.step(1); } return A().room === i && A().phase === 'play'; };
  const waitClear = (i, max = 1600) => { let n = 0; while (A().room === i && A().phase === 'play' && !L.player.dead && n++ < max) { c.setInput({}); c.step(1); } for (let k = 0; k < 240 && A().flying; k++) c.step(1); return n; };
  window.__haus = {
    A, waitPlay, waitClear,
    solve(i, legs) {
      if (!waitPlay(i)) return { error: 'kein Start', a: A() };
      const t0 = L.time, h0 = L.player.hurtTries ?? 0;
      const res = W8.drive(legs, { invuln: false, house: true });
      const t = +(L.time - t0).toFixed(2);
      waitClear(i);
      const got = !!L.runtime.stars[i];
      return { t, got, log: res.log, hurts: (L.player.hurtTries ?? 0) - h0, a: A(), dead: L.player.dead, power: L.player.power };
    },
  };
  return true;
}

async function haus() {
  const id = '8-Haus';
  console.log(`\n${id}: zehn Kletterräume mit dem Krallen-Anzug`);
  for (const hero of HEROES) {
    if (!(await load(id, { fresh: true, hero }))) { check(`${id} lädt`, false); return; }
    await sc((h) => { window.__course.player.setHero(h); }, hero);
    if (hero === HEROES[0] && PARTS.has('load')) {
      const d = await sc(() => {
        const c = window.__course, L = c.level, D = L.data;
        return { title: D.title, theme: D.theme, music: D.music, arch: D.archetype, world: D.world, rooms: D.house.rooms.length, goals: D.house.rooms.map((r) => r.goal),
          times: D.house.rooms.map((r) => r.time), fail: D.house.fail, starCount: L.runtime.starCount, kinds: window.__w8.kinds(),
          kletter: (() => { let n = 0; L.world.forEach((s) => { if (s.climbable) n++; }); return n; })() };
      });
      console.log(`  „${d.title}“, Welt ${d.world}, Thema ${d.theme}, Musik ${d.music}, Räume ${d.rooms} (${d.goals.join(', ')}), Arten ${JSON.stringify(d.kinds)}, Kletterformen ${d.kletter}`);
      check(`${id}: lädt ohne Konsolenfehler/-warnungen`, errors.length === 0);
      for (const e of errors.slice(0, 8)) console.log('      ', e);
      check(`${id}: „Haus Krallenkraxel“, Welt 8, Archetyp house, Thema house, Musik course_house, 10 Räume à 10 s, 10 Sterne, fail 'exit'`,
        d.title === 'Haus Krallenkraxel' && d.world === 8 && d.arch === 'house' && d.theme === 'house' && d.music === 'course_house' && d.rooms === 10 && d.times.every((t) => t === 10) && d.fail === 'exit' && d.starCount === 10);
      check(`${id}: Ziegel 75, Bröckel-Bauklötze 8, POW 1, Druckschalter 1, Pilzlinge 3 (${JSON.stringify(d.kinds)})`,
        d.kinds.brick === 75 && d.kinds.bruchstueck === 8 && d.kinds.pow === 1 && d.kinds.pswitch === 1 && d.kinds.pilzling === 3);
    }
    await sc(installHaus);
    const Z0 = await sc(() => window.__course.level.data._haus.Z0);
    const RAUM = process.env.RAUM ? Number(process.env.RAUM) - 1 : null;
    const out = [];
    for (let i = 0; i < 10; i++) {
      if (RAUM !== null && i !== RAUM) continue;
      const r = await sc(([k, legs, R]) => {
        const c = window.__course;
        if (R !== null && c.arch.info().room !== k) c.arch.enterRoom(k);
        return window.__haus.solve(k, legs);
      }, [i, hausLegs(i, Z0[i]), RAUM]);
      out.push(r);
      const ok = r.got && !r.error && r.t < 10;
      check(`${id}: ${hero} Raum ${i + 1} ${HAUS_NAMES[i]} in ${r.t} s (< 10 s, Treffer ${r.hurts})`, ok);
      if (VERBOSE || !ok) { console.log(`       ${JSON.stringify(r.a)} tot ${r.dead} Anzug ${r.power}`); for (const l of r.log ?? []) console.log('      ', JSON.stringify(l)); }
      if (!ok) break;
    }
    if (RAUM === null) {
      const fin = await sc(() => { const c = window.__course; for (let k = 0; k < 2400 && !c.finished; k++) c.step(1); return { finished: c.finished, res: c.lastResult ?? null, a: c.arch.info(), save: window.__w8.save().levels?.['8-Haus'] ?? null }; });
      check(`${id}: ${hero} Ergebnis 10/10 gespeichert (${(fin.res?.stars ?? []).map(Number).join('')})`, fin.finished && fin.res?.stars?.filter(Boolean).length === 10 && fin.save?.stars?.filter(Boolean).length === 10 && !fin.a.exited);
    }
  }
}

/** Gegenproben im Krallen-Haus: ohne Anzug kommt man nirgends hinauf, Takt der Piep-Wand, Lavarinne, Ziegel, POW, Bröckeln, Zeitablauf. */
async function hausExtra() {
  const id = '8-Haus';
  console.log(`\n${id}: Gegenproben`);
  if (!(await load(id, { fresh: true, hero: 'lotti' }))) { check(`${id} lädt`, false); return; }
  await sc(installHaus);
  const Z0 = await sc(() => window.__course.level.data._haus.Z0);
  const run = (i, legs, o = {}) => sc(([k, lg, oo]) => {
    const c = window.__course, L = c.level, H = window.__haus, p = L.player;
    for (let q = 0; q < 900 && (p.dead || L.runtime.status !== 'play' || c.arch.info().phase !== 'play'); q++) { c.setInput({}); c.step(1); }   // nach einem Tod: Neustart des Raums abwarten
    if (c.arch.info().room !== k) c.arch.enterRoom(k);
    H.waitPlay(k);
    const kr = L.named.get('krallen');
    if (oo.ohne) { kr.off = true; p.setPower('none'); }
    if (oo.before) new Function('L', 'p', oo.before)(L, p);
    const y0 = p.pos.y;
    const res = window.__w8.drive(lg, { invuln: oo.invuln ? undefined : false, house: true });
    for (let q = 0; q < (oo.wait ?? 60); q++) c.step(1);
    const out = { star: !!L.runtime.stars[k], maxY: +Math.max(...res.track.map((t) => t[1]), p.pos.y).toFixed(2), y0: +y0.toFixed(2), dead: p.dead || res.log.some((l) => l[0] === 'TOD'), cause: res.log.find((l) => l[0] === 'TOD')?.[1] ?? p.deathCause ?? null, log: res.log.filter((l) => l[0] !== 'spur').slice(-8), a: { room: c.arch.info().room, phase: c.arch.info().phase },
      bricks: L.entities.filter((e) => e.kind === 'brick' && !e.removed && e.spec?.roomId === `r${k + 1}`).length,
      broke: L.named.get('broeckel')?.info?.().touched ?? 0, piep: L.named.get('r3_rot')?.info?.()?.[0] ?? null };
    kr.off = false;
    return out;
  }, [i, legs, o]);
  const R = (i, x, u) => [x, Z0[i] - u];
  const g = {};
  g.ohne2 = await run(1, [{ to: R(1, 0, 4.2), within: 0.3, run: false }, { to: R(1, 0, 6.4), jump: 40, within: 0.6, run: false, max: 400 }, { hop: 40 }], { ohne: true });
  g.ohne5 = await run(4, [{ to: R(4, 0, 4.6), within: 0.3, run: false }, { to: R(4, 0, 6.5), jump: 40, within: 0.35, run: false, max: 400 }, { hop: 40 }], { ohne: true });
  g.rotAus = await run(2, [{ to: R(2, 0, 4.0), within: 0.3, run: false }, { until: 'rotAus', max: 900 }, { to: R(2, 0, 7), jump: 40, within: 0.5, run: false, max: 200, autoJump: false }]);
  g.ziegel = await run(5, [{ to: R(5, 0, 4.3), within: 0.2, run: false }, { to: R(5, 0, 10), jump: 40, within: 0.6, run: false, max: 360, autoJump: false }]);
  g.pow = await run(8, [{ to: R(8, 1.4, 6.9), within: 0.3, run: false }, { to: R(8, 0, 9.6), jump: 40, within: 0.6, run: false, max: 360, autoJump: false }], { invuln: true });
  g.rinne = await run(3, [{ to: R(3, 0, 3.7), within: 0.25, run: false }, { to: R(3, 0, 8.6), jump: 40, within: 0.6, run: true, max: 400 }], { wait: 30 });
  g.broeckel = await run(9, [{ to: R(9, 0, 5.4), within: 0.3, run: false }, { to: R(9, 0, 10), jump: 40, within: 0.6, run: false }, { to: R(9, 0, 12.5), within: 0.3 }], { invuln: true, wait: 120 });
  for (const [k, v] of Object.entries(g)) console.log(`       ${k}: ${JSON.stringify({ ...v, piep: undefined })}`);
  const Y = 1;
  check(`${id}: ohne Krallen-Anzug nicht auf die erste Felsstufe (Raum 2, höchstens y ${g.ohne2.maxY} < ${Y + 6})`, !g.ohne2.star && g.ohne2.maxY < Y + 5.5);
  check(`${id}: ohne Krallen-Anzug nicht auf den Leuchtturm (Raum 5, höchstens y ${g.ohne5.maxY} < ${Y + 7})`, !g.ohne5.star && g.ohne5.maxY < Y + 6.5);
  check(`${id}: rote Piep-Blöcke aus → kein Halt an der Wand (höchstens y ${g.rotAus.maxY})`, g.rotAus.maxY < Y + 4.5);
  check(`${id}: mittlere Lavarinne ist tödlich (${g.rinne.cause})`, g.rinne.dead && g.rinne.cause === 'lava');
  check(`${id}: ohne Tatzenhieb versperren die Ziegel die Wand (Ziegel ${g.ziegel.bricks}, höchstens y ${g.ziegel.maxY})`, g.ziegel.bricks === 30 && g.ziegel.maxY < Y + 6 && !g.ziegel.star);
  check(`${id}: ohne POW-Block bleibt die Kletterspalte zu (Ziegel ${g.pow.bricks}, höchstens y ${g.pow.maxY})`, g.pow.bricks === 45 && !g.pow.star && g.pow.maxY < Y + 5);
  check(`${id}: Bröckelturm – berührte Bauklötze brechen (${g.broeckel.broke}), Stern oben (${g.broeckel.star})`, g.broeckel.broke >= 3 && g.broeckel.star);

  // Zeitablauf: zwei Räume lösen, im dritten nichts tun → Haus verlassen, Ergebnis 2 von 10 gespeichert
  if (!(await load(id, { fresh: true, hero: 'greta' }))) return;
  await sc(installHaus);
  const z = await sc(([l0, l1]) => {
    const c = window.__course, H = window.__haus;
    const r = [H.solve(0, l0), H.solve(1, l1)].map((o) => [o.t, o.got]);
    H.waitPlay(2);
    let n = 0;
    for (; n < 2400 && !c.finished; n++) { c.setInput({}); c.step(1); }
    return { r, n, a: c.arch.info(), res: c.lastResult ?? null, save: window.__w8.save().levels?.['8-Haus'] ?? null, finished: c.finished };
  }, [hausLegs(0, Z0[0]), hausLegs(1, Z0[1])]);
  console.log('      ', JSON.stringify({ r: z.r, n: z.n, exited: z.a.exited, timeouts: z.a.timeouts, stars: z.res?.stars, save: z.save?.stars }));
  check(`${id}: Zeitablauf in Raum 3 → Haus verlassen, Ergebnis 2 von 10 Sternen gespeichert`, z.finished && z.a.exited && z.a.timeouts === 1 && z.res?.stars?.filter(Boolean).length === 2 && z.save?.stars?.filter(Boolean).length === 2);
}

/** Bilder je Raum (Raumstart nach der Überblendung) und je Raum eines mitten im Klettern. */
async function hausShots() {
  const id = '8-Haus';
  if (!(await load(id, { fresh: true, hero: 'lotti' }))) return;
  await sc(installHaus);
  const Z0 = await sc(() => window.__course.level.data._haus.Z0);
  const KLETTERN = [[0, 5.2, 2.6], [0, 4.6, 3.2], [0, 6.6, 4.2], [2.75, 6.6, 4.4], [0, 5.4, 4.4], [0, 7.5, 4], [0, 5.6, 4.2], [0, 4.2, 2], [0, 7.5, 4.6], [0, 6.6, 4]];
  for (let i = 0; i < 10; i++) {
    if (SHOTS && !SHOTS.has(`raum${i + 1}`) && !SHOTS.has(`klettern${i + 1}`)) continue;
    await sc((k) => { const c = window.__course; if (c.arch.info().room !== k) c.arch.enterRoom(k); window.__haus.waitPlay(k); for (let q = 0; q < 6; q++) c.step(1); c.player.invuln = 0; }, i);
    if (!SHOTS || SHOTS.has(`raum${i + 1}`)) await shot(`${id}_raum${i + 1}`);
    // mitten an der Wand: Figur vor die Wand setzen und hinaufklettern lassen
    const [x, u, h] = KLETTERN[i];
    if (!SHOTS || SHOTS.has(`klettern${i + 1}`)) {
      await sc(([k, px, pz, n]) => {
        const c = window.__course, p = c.player, W8 = window.__w8;
        p.invuln = 99; p.reset([px, 1, pz], Math.PI / 2);
        for (let q = 0; q < 160 && p.pos.y < 1 + n; q++) { c.setInput({ ...W8.stick(0, -1, 1), jump: q < 30 }); c.step(1); }
        p.invuln = 0;
        c.setInput({});
      }, [i, x, Z0[i] - u, h]);
      await shot(`${id}_klettern${i + 1}`);
    }
  }
}

// ====================================================================== Parcours (8-6, 8-7)
async function parcours(id) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); return; }
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, world: d.world, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('      ', e);
    check(`${id}: Welt 8, ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.world === 8 && meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) {
      const have = typeof n === 'function' ? await sc(n) : (kinds[kind] ?? 0);
      const want = typeof n === 'function' ? R.enemyCounts[kind] : n;
      check(`${id}: ${want}× ${kind} (${have})`, have === want);
    }
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}`);
    if (!reached || VERBOSE) for (const l of res.log) console.log('      ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 300 s (${res.time.toFixed(1)} s)`, reached && res.time < 300);
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
    if (VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    console.log(`  Messgang: ${per.length} Punkte, Aufrufe Ø ${(per.reduce((a, q) => a + q[1], 0) / per.length).toFixed(1)}, Dreiecke Ø ${Math.round(per.reduce((a, q) => a + q[2], 0) / per.length / 1000)} k`);
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
      let postText = '';
      if (t.post) {
        const f0 = await sc(() => window.__course.view.frame);
        await page.waitForFunction((f) => window.__course.view.frame >= f + 12, f0, { timeout: 90000 });
        const q = await sc(t.post);
        if (!t.postOk(q)) ok = false;
        postText = `, ${t.postText(q)}`;
      }
      if (!ok || VERBOSE) for (const l of res.log) console.log('      ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''}${postText})`, !!ok);
      if (t.shot && hero === HEROES[0] && PARTS.has('shots')) await shot(`${id}_${t.shot}`);
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
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || VERBOSE) for (const l of res.log) console.log('      ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0] && PARTS.has('shots')) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) return;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2, rideKlotz = null] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) {
      await sc(([n, inp, kid]) => {
        const c = window.__course, L = c.level, p = c.player, W8 = window.__w8;
        p.invuln = 99;
        const k = kid ? L.named.get(kid) : null;
        for (let i = 0; i < n; i++) {
          const q = k?.mb?.pos ?? k?.pm?.pos ?? null;
          if (q) { const dx = q.x - p.pos.x, dz = q.z - p.pos.z, d = Math.hypot(dx, dz); c.setInput(d > 0.08 ? W8.stick(dx, dz, Math.min(1, d * 1.5)) : {}); } else c.setInput(inp ?? {});
          c.step(1);
        }
        p.invuln = 0; c.setInput(null);
      }, [steps, input ?? {}, rideKlotz]);
    }
    await shot(`${id}_${name}`);
  }
}

for (const id of LEVELS) {
  if (id === '8-Haus') {
    if (PARTS.has('haus') || PARTS.has('load')) await haus();
    if (PARTS.has('haus-extra')) await hausExtra();
    if (PARTS.has('shots') && !ONLY) await hausShots();
    continue;
  }
  await parcours(id);
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
