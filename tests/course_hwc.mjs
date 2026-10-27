// Halloween-Welt „Kürbisinsel“, Level H-4 „Hokuspokus-Hochhaus“ (vertikaler Hexenturm: Besen-Plattformen,
// Hexenkessel-Trampoline, Zaubertrank-Blasen, Spinnennetze) und H-Burg „Gruselgala auf Schloss Schlotterstein“
// (Gruselschloss, Boss Graf Brummbär): Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel,
// Gegnerzahlen), Verkleidung der Figuren, Routen-Bot (Lotti und Greta von Start bis Zielmast, deterministisch über
// __course.setInput/step, echte Eingaben – kein Teleport auf der Route; H-Burg mit dem ganzen Bosskampf: Kürbis-Bomben
// aufheben und zurückwerfen), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je
// Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera
// (tests/out/hwc_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_hwc.mjs [H-4|H-Burg]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur
//   Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, runUp, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { pound: [x, z] } (hinspringen, Stampfattacke) · { star: i } ·
// { stamp: true } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung, max } ·
// { bounce: [x, z], at: [x, z], steerBelow } (Kessel/Spinnennetz: hinaufspringen, hochfedern, zum Ziel lenken) ·
// { broom: id, auto, jumpOn, exit: [x, z] | leap: { to: [x, z] } } (Besen abwarten, aufsteigen, mitfliegen, am fernen Ende
// absteigen bzw. hinüberspringen) · { bubble: Kessel-Id, from: [x, z], to: [x, z] } (Zaubertrank-Blase besteigen,
// mitsteigen, oben hinüberspringen)
const ROUTES = {
  'H-4': {
    start: [0, 0, 7],
    meta: { stars: 3, stamp: true, time: 400, theme: 'witchtower', music: 'course_witchtower', archetype: 'parcours' },
    enemies: { hexenhut_huepfer: 6, flatterfledi: 4, spuk: 2 },
    main: [
      { name: 'zum Kessel', to: [1, -5], within: 0.5 },
      { name: 'Kessel-Hopser auf Turm 1', bounce: [1, -13], at: [1, -8.2], steerBelow: 30 },
      { name: 'Turm 1 hinten', to: [1, -20.4], within: 0.4, run: false },
      { name: 'Besen 1', broom: 'besen1', exit: [1, -36.6] },
      { to: [1, -41], within: 0.4, run: false },
      { name: 'Besen 2 (steigt)', broom: 'besen2', exit: [0.6, -56.4] },
      { name: 'Bücherturm', to: [0, -63.5], within: 0.6 },
      { name: 'Brücke', to: [0, -69.5], within: 0.6 },
      { to: [1, -73], within: 0.6 },
      { name: 'Küche', to: [1, -79.6], within: 0.6 },
      { to: [-2.6, -83.2], within: 0.5 },
      { name: 'Kessel-Hopser auf den Balkon', bounce: [-4, -90.4], at: [-4, -85.6], steerBelow: 30 },
      { name: 'Checkpoint', to: [-3, -95], within: 0.8 },
      { to: [0, -100.4], within: 0.4, run: false },
      { name: 'Besen 3 (fliegt allein)', broom: 'besen3', auto: true, exit: [0, -119.6] },
      { name: 'Spinnennetz', bounce: [0, -127.6], at: [0, -122.4], steerBelow: 30 },
      { name: 'Glockenterrasse', to: [4, -135.6], within: 0.5 },
      { name: 'oranger Kessel', bounce: [4, -144.4], at: [4, -138.4], steerBelow: 30 },
      { to: [4, -149.5], within: 0.4, run: false },
      { name: 'Besen 4', broom: 'besen4', exit: [4, -167.4] },
      { name: 'Brücke zur Krempe', to: [4, -176.6], within: 0.5 },
      { name: 'Zielmast', to: [2, -179.6], within: 0.2 },
    ],
    routeChecks: [
      { name: '4 Besen geflogen, 4× gefedert (3 Kessel, Netz), 30 m hinauf', ok: (r) => r.mech.brooms.length === 4 && r.mech.bounces.length === 4 && r.mech.maxY > 30 },
    ],
    targets: [
      { name: 'Stern 0: geheimer Besen am Bücherturm → Wolkeninsel', star: 0, from: [-3.6, 9.4, -59.7],
        legs: [{ broom: 'besen_stern', exit: [-23.6, -60.2] }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Besen (Weitsprung vom Bücherturm)', star: 0, expectNot: true, from: [-2, 9.4, -59.7], heroes: ['greta'],
        legs: [{ to: [-23.5, -59.7], jump: 40, runUp: 4, within: 0.6, max: 400, land: false }, { wait: 120 }] },
      { name: 'Stern 1: Zaubertrank-Blase des lila Kessels → Mondturm', star: 1, from: [6.2, 9.4, -79.6],
        legs: [{ bubble: 'kessel2', from: [6.2, -80.4], to: [11.4, -82.5] }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht mit dem Kessel allein (Hopser vom lila Kessel)', star: 1, expectNot: true, from: [6.2, 9.4, -79.6], heroes: ['lotti'],
        legs: [{ bounce: [11.4, -82.5], at: [6.2, -82.5], steerBelow: 30 }, { wait: 60 }] },
      { name: 'Stern 2: zweites Spinnennetz hinter dem Türmchen → hoch über dem Dach', star: 2, from: [-6.2, 23.5, -138.6],
        legs: [{ bounce: [-8.6, -134.6], at: [-8.6, -136.4], steerBelow: 6 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Netz (Sprung von der Terrasse)', star: 2, expectNot: true, from: [-8.6, 23.5, -133.4], heroes: ['lotti'],
        legs: [{ to: [-8.6, -134.6], within: 0.3, run: false }, { hop: 40 }, { wait: 30 }] },
      { name: 'Stempel: Besen-Aufzug auf der Krempe → Schornstein', stamp: true, from: [9, 30.6, -180.6],
        legs: [{ broom: 'besen_aufzug', jumpOn: true, leap: { to: [13, -185.2] } }, { expect: 'onChimney' }, { stamp: true }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Besen (Sprung von der Krempe)', stamp: true, expectNot: true, from: [10, 30.6, -184.2], heroes: ['lotti'],
        legs: [{ to: [13, -185.2], jump: 40, within: 0.4, max: 300, land: false }, { wait: 90 }] },
    ],
    extra: [
      { name: 'Winkender Kürbis winkt zurück', from: [0.5, 0, 7], heroes: ['lotti'],
        legs: [{ to: [2.4, 5], within: 0.4, run: false }, { wait: 60 }, { expect: 'waved' }] },
      { name: 'Extraleben: unsichtbarer Block über dem Spinnennetz am Start', from: [-4.4, 0, 3], heroes: ['lotti'], expectLives: 1,
        legs: [{ bounce: [-2.2, -0.4], at: [-4.4, -0.4], center: true, steerBelow: -1 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: Kiste auf der Wolkeninsel (Stampfattacke)', from: [-3.6, 9.4, -59.7], heroes: ['lotti'], expectLives: 1,
        legs: [{ broom: 'besen_stern', exit: [-22.6, -58.3] }, { pound: [-24.7, -58.3] }, { wait: 40 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Besen 1 wartet, bis man draufsteht', from: [1, 4.6, -16], heroes: ['lotti'],
        legs: [{ wait: 600 }, { expect: 'broomIdle' }] },
      { name: 'Checkpoint auf dem Balkon: Tod auf Besen 3 → Neustart auf dem Balkon', from: [-3, 16.8, -95], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [-3, -95.4], within: 0.6 }, { to: [-7.5, -103], within: 0.5, max: 300, autoJump: false }, { wait: 500 }, { expect: 'respawnBalkon' }] },
    ],
    shots: [
      ['start', [0, 0, 7]],
      ['winken', [2.4, 0, 6.4], 120],
      ['kessel0', [1, 0, -3]],
      ['turm1', [1, 4.6, -17]],
      ['besen1', [1, 4.6, -20.8]],
      ['turm2', [1, 4.6, -38]],
      ['turm3', [0, 9.4, -58]],
      ['geheimbesen', [-4.6, 9.4, -59.7]],
      ['wolke', [-23.5, 12.4, -59]],
      ['kueche', [0, 9.4, -70]],
      ['kueche2', [2, 9.4, -80]],
      ['balkon', [-3, 16.8, -95]],
      ['turm4', [0, 16.8, -120]],
      ['terrasse', [0, 23.5, -128]],
      ['netz2', [-6, 23.5, -134]],
      ['turm6', [4, 30.6, -146]],
      ['turm7', [4, 30.6, -168]],
      ['krempe', [4, 30.6, -175.6]],
      ['ziel', [2, 30.6, -178.6]],
    ],
  },
  'H-Burg': {
    start: [0, 2, 9],
    meta: { stars: 3, stamp: true, time: 400, theme: 'castle_night', music: 'course_brummula', archetype: 'boss' },
    enemies: { kuerbling: 5, klapperknochen: 4, spuk: 1, kreisgeist_kreis: 1, graf_brummbaer: 1 },
    main: [
      { name: 'Vorhof', to: [0, -4.4], within: 0.6 },
      { name: 'Zugbrücke', to: [0, -14.6], within: 0.6 },
      { name: 'Burgtor', to: [0, -22], within: 0.6 },
      { name: 'Ahnengalerie', to: [0, -58], within: 0.6 },
      { name: 'Spukball-Saal', to: [-7.4, -70], within: 0.6 },
      { to: [-7.4, -90], within: 0.6 },
      { name: 'Checkpoint', to: [0, -100.2], within: 0.6 },
      { name: 'Treppe', to: [0, -113.4], within: 0.6 },
      { to: [0, -120.4], within: 0.4, run: false },
      { name: 'Laternenpfahl abwarten', lightOn: 'bruckenpfahl' },
      { name: 'Geisterbrücke 1', to: [0, -124.3], jump: 14, within: 0.6, run: false },
      { name: 'Geisterbrücke 2', to: [0, -127.5], jump: 14, within: 0.6, run: false },
      { name: 'Geisterbrücke 3', to: [0, -130.7], jump: 14, within: 0.6, run: false },
      { name: 'Absatz 2', to: [0, -135.6], jump: 14, within: 0.6, run: false },
      { name: 'Treppe 2', to: [0, -150], within: 0.6 },
      { name: 'Wehrgang', to: [1.6, -183], within: 0.6 },
      { name: 'Graf Brummbär', boss: 'graf' }, { wait: 60 },
      { star: 2 },
      { name: 'Warp-Box', to: [0, -203.5], jump: 30, within: 0.3, run: false, stopIf: 'onBalkon' },
      { wait: 40 },
      { expect: 'onBalkon' },
      { name: 'Zielmast', to: [0, -243.2], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Graf Brummbär mit zurückgeworfenen Kürbis-Bomben besiegt (3 Treffer), Stern 2', ok: (r) => r.mech.boss?.state === 'gone' && r.mech.boss?.hits === 3 && r.rt.stars[2] },
    ],
    targets: [
      { name: 'Stern 0: Gruft – Grabstein-Schalter stampfen → Steinstufen zur Nische', star: 0, from: [3, 2, -36.3],
        legs: [{ to: [9, -35.7], within: 0.2, run: false }, { pound: [9, -34.6], hold: 40, r: 0.35 }, { wait: 90 }, { expect: 'gruftwegOffen' },
          { to: [9.6, -42.4], within: 0.4, run: false }, { to: [9.6, -44.8], jump: 24, jumpAt: 1.5, within: 0.5, run: false },
          { to: [11.4, -44.8], jump: 24, within: 0.5, run: false }, { to: [13.2, -44.8], jump: 24, within: 0.5, run: false },
          { to: [16, -45.2], jump: 30, within: 0.6, run: false }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Stampfen (Daraufspringen genügt nicht)', star: 0, expectNot: true, from: [7.6, 2, -36], heroes: ['lotti'],
        legs: [{ to: [9, -34.6], jump: 30, within: 0.5, run: false }, { wait: 60 }, { expect: 'gruftwegZu' }, { to: [13.8, -42], within: 0.4, run: false }, { hop: 40 }, { wait: 40 }] },
      { name: 'Stern 1: Kürbis-Bombe vom Karren auf den Bonbon-Tresor werfen', star: 1, from: [-3, 2, -90],
        legs: [{ bomb: { pick: [-4.6, -93.2], from: [-8, -92.6], aim: [-8, -97] } }, { wait: 60 }, { expect: 'tresorOffen' }, { to: [-8, -97], within: 0.25, run: false, autoJump: false }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht durch Stampfen (Tresor bleibt heil)', star: 1, expectNot: true, from: [-8, 2, -92.8], heroes: ['lotti'],
        legs: [{ pound: [-8, -96] }, { wait: 30 }, { pound: [-8, -97] }, { wait: 30 }, { expect: 'tresorHeil' }] },
      { name: 'Stern 2: Graf Brummbär besiegen (Kürbis-Bomben zurückwerfen)', star: 2, from: [0, 10, -181.6],
        legs: [{ boss: 'graf' }, { wait: 60 }, { star: 2 }], shot: 'stern2', mechText: (r) => JSON.stringify(r.mech.boss) },
      { name: 'Stempel: Spinnennetz in der Saal-Ecke → Kronleuchter', stamp: true, from: [7.4, 2, -93.6],
        legs: [{ bounce: [6.2, -86], at: [8.6, -90.6], steerBelow: 30 }, { stamp: true }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Netz (Sprung unter dem Kronleuchter)', stamp: true, expectNot: true, from: [6.2, 2, -84], heroes: ['lotti'],
        legs: [{ to: [6.2, -86], within: 0.3, run: false }, { hop: 40 }, { wait: 30 }] },
    ],
    extra: [
      { name: 'Geist lugt hinter dem Grabstein hervor und verschwindet kichernd', from: [-1, 2, 8], heroes: ['lotti'],
        legs: [{ to: [-3.6, 2], within: 0.5, run: false }, { wait: 30 }, { expect: 'kicherte' }] },
      { name: 'Extraleben: unsichtbarer Block in der Ahnengalerie', from: [0, 2, -41.5], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [0, -44], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Bomben-Nachschub: Bombe weggeworfen → neue auf dem Karren', from: [-3, 2, -90], heroes: ['lotti'],
        legs: [{ bomb: { pick: [-4.6, -93.2], from: [0, -88], aim: [4, -84] } }, { bomb: { pick: [-4.6, -93.2], from: [0, -88], aim: [4, -84] } }, { wait: 400 }, { expect: 'neueBombe' }, { expect: 'tresorHeil' }] },
      { name: 'Geisterbrücke: fest nur bei Laternenlicht', from: [0, 6, -119], heroes: ['lotti'],
        legs: [{ until: 'bruckeFest', max: 1200 }, { until: 'bruckeWeg', max: 1200 }] },
      { name: 'Krümel mit Laterne jubelt am Siegerbalkon', from: [0, 10, -233], heroes: ['lotti'],
        legs: [{ to: [1, -236.6], within: 0.4, run: false }, { wait: 30 }, { expect: 'kruemelJubelt' }] },
      { name: 'Tod im Kampf → Neustart vor dem Dach, Graf wieder 3/3', from: [0, 10, -181.6], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, -192], within: 0.6 }, { wait: 2400 }, { expect: 'respawnDach' }, { expect: 'grafVoll' }] },
    ],
    shots: [
      ['start', [0, 2, 9]],
      ['vorhof', [-3, 2, 1]],
      ['geist', [-1.5, 2, 6.5], 60],
      ['bruecke', [0, 2, -8]],
      ['tor', [0, 2, -14]],
      ['galerie', [0, 2, -30]],
      ['galerie2', [0, 2, -48]],
      ['gruft', [10, 2, -36.5]],
      ['saal', [0, 2, -66]],
      ['saal2', [-5, 2, -86]],
      ['tresor', [-6, 2, -91]],
      ['leuchter', [7, 2, -88]],
      ['treppe', [0, 2, -101]],
      ['absatz', [0, 6, -114]],
      ['geisterbruecke', [0, 6, -119]],
      ['wehrgang', [0, 10, -152]],
      ['wehrgang2', [0, 10, -172]],
      ['dach', [0, 10, -184]],
      ['ziel', [0, 10, -234]],
      ['kampf', [0, 10, -192], 420],
      ['kampf2', [2, 10, -195], 1500],
    ],
  },
};

const PORT = 4590;
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
  const COND = {
    // H-4
    broomIdle: () => !L.named.get('besen1')?.running,
    waved: () => (L.named.get('winkekuerbis')?.waves ?? 0) >= 1,
    respawnBalkon: () => Math.abs(P().pos.z + 95) < 2.5 && P().pos.y > 16.5 && !P().dead,
    onChimney: () => P().pos.y > 37.4,
    // H-Burg
    onBalkon: () => P().pos.z < -226 && P().pos.y > 9.5,
    gruftwegOffen: () => (L.named.get('gruftweg')?.parts ?? []).every((q) => q.shown),
    gruftwegZu: () => !L.named.get('gruftweg')?.shown && !(L.named.get('gruftweg')?.parts ?? []).some((q) => q.shown),
    tresorHeil: () => ['tresor_vorn', 'tresor_hinten', 'tresor_deckel'].every((id) => (L.named.get(id)?.broken ?? 0) === 0),
    tresorOffen: () => (L.named.get('tresor_vorn')?.broken ?? 0) > 0,
    kicherte: () => (L.named.get('kichergeist')?.giggles ?? 0) >= 1 && L.named.get('kichergeist')?.state === 'versteckt',
    kruemelJubelt: () => L.named.get('kruemel')?.state === 'jubelt',
    neueBombe: () => (L.named.get('nachschub')?.spawned ?? 0) >= 1 && L.entities.some((e) => e.kind === 'kuerbis_bombe' && !e.removed && Math.hypot(e.pos.x + 4.6, e.pos.z + 93.2) < 1.5),
    bruckeFest: () => L.named.get('bruckenpfahl')?.on && (L.named.get('geisterbruecke')?.parts ?? []).every((q) => q.solid),
    bruckeWeg: () => !L.named.get('bruckenpfahl')?.on && (L.named.get('geisterbruecke')?.parts ?? []).every((q) => !q.solid),
    pfahlAus: () => !L.named.get('bruckenpfahl')?.on,
    respawnDach: () => Math.abs(P().pos.z + 181.6) < 2.5 && P().pos.y > 9.5 && !P().dead,
    grafVoll: () => { const g = L.named.get('graf'); return g.hp === g.maxHp && g.state === 'wait'; },
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
      const mech = { hurts: 0, brooms: [], bounces: [], bubbles: 0, maxY: -99, bombs: 0 };
      const track = [];
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        mech.maxY = Math.max(mech.maxY, p.pos.y);
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2], (p.pos.y - t[1]) * 1.5) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const goTo = (tx, tz, within = 0.25, max = 900, run = false) => {
        let i = 0;
        for (; i < max; i++) {
          if (p.dead) return false;
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run });
        }
        return i < max;
      };
      const P3 = () => [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)];
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 360 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', ...P3()]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, ...P3()]); continue; }
        if (Lg.stamp) { const n = this.chase('stamp', { max: 900 }); log.push(['stempel', n, ...P3()]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, ...P3(), p.power]); continue; }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < (Lg.r ?? 0.4) && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < (Lg.hold ?? 34), run: false });
          }
          log.push(['stampfen auf', ...P3(), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ Kessel/Spinnennetz: hinaufspringen, hochfedern, zum Ziel lenken
        if (Lg.bounce) {
          const [ax, az] = Lg.at, [tx, tz] = Lg.bounce;
          let k = 0, bounced = false, landed = false, apex = -99;
          for (; k < 1200; k++) {
            if (p.dead) break;
            if (!bounced) {
              const dx = ax - p.pos.x, dz = az - p.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(ax, az, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz)))), jump: (p.mode === 'ground' && Math.hypot(dx, dz) < 2.4) || (p.mode === 'air' && p.vel.y > 0), run: false });
              if (p.jumpKind === 'bounce' && p.mode === 'air') bounced = true;
              continue;
            }
            apex = Math.max(apex, p.pos.y);
            // center: im Steigen über der Federmitte bleiben (Kopfstoß an einen Block darüber), erst im Fallen zum Ziel
            const up = Lg.center && p.vel.y > 0;
            const steer = up || p.vel.y < (Lg.steerBelow ?? 9);
            tick({ ...(steer ? this.airSteer(up ? ax : tx, up ? az : tz, 0, 0, up ? 4 : 2.6, 8) : {}), jump: true });
            if (p.mode === 'ground') { landed = true; break; }
          }
          log.push(['Federn', Lg.name ?? '', bounced, landed, k, ...P3(), +apex.toFixed(2)]);
          if (!bounced || !landed) { log.push(['FEHLER: Federn', Lg.at]); break; }
          mech.bounces.push(+apex.toFixed(2));
          continue;
        }
        // ------------------------------------------------ Besen: abwarten, aufsteigen, mitfliegen, absteigen/abspringen
        if (Lg.broom) {
          const b = L.named.get(Lg.broom);
          if (!b) { log.push(['FEHLER: Besen fehlt', Lg.broom]); break; }
          const pm = b.pm;
          // Besen, die selbst fliegen: warten, bis er am nahen Ende (s = 0) pausiert
          if (Lg.auto) { let k = 0; for (; k < 4000 && !(pm.s <= 0.001 && pm.pause > 0.35); k++) tick({}); log.push(['Besen abgewartet', Lg.broom, k]); }
          let j = 0, on = false;
          for (; j < 600; j++) {
            if (p.dead) break;
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            on = p.mode === 'ground' && p.ground === b.shape;
            if (on && d < 0.4) break;
            const jumpOn = Lg.jumpOn && !on && j < 26;
            tick({ ...(p.mode === 'air' ? this.airSteer(b.pos.x, b.pos.z, b.mover.vx, b.mover.vz) : this.stick(dx, dz, Math.max(0.25, Math.min(1, d / 1.2)))), jump: jumpOn, run: false });
          }
          log.push(['aufgestiegen', Lg.broom, on, j, ...P3()]);
          if (!on) { log.push(['FEHLER: nicht auf dem Besen', Lg.broom]); break; }
          mech.brooms.push(Lg.broom);
          // mitfliegen bis zum fernen Ende (s = Länge, Pause)
          let r = 0, fell = false;
          for (; r < 6000; r++) {
            if (p.dead) break;
            if (pm.s >= pm.length - 0.001 && pm.pause > 0) break;
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z;
            tick(Math.hypot(dx, dz) > 0.3 ? { ...this.stick(dx, dz, 0.4), run: false } : {});
            // am Ziel bündig auf den Turm getreten (gleiche Höhe) – sonst hinuntergefallen
            if (p.mode === 'ground' && p.ground !== b.shape) { fell = p.pos.y < b.shape.max[1] - 0.15; break; }
          }
          log.push(['geflogen', Lg.broom, r, fell, ...P3()]);
          if (fell) { log.push(['FEHLER: vom Besen gefallen', Lg.broom]); break; }
          if (Lg.leap) {
            const [tx, tz] = Lg.leap.to;
            let a = 0;
            for (; a < 400; a++) {
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.6, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 32, run: false });
              if (a > 10 && p.mode === 'ground') break;
            }
            log.push(['abgesprungen', Lg.broom, ...P3(), p.ground?.tag]);
          } else if (Lg.exit) {
            const ok = goTo(Lg.exit[0], Lg.exit[1], 0.4, 600);
            log.push(['abgestiegen', Lg.broom, ok, ...P3(), p.ground?.tag]);
            if (!ok) { log.push(['FEHLER: Absteigen', Lg.broom]); break; }
          }
          continue;
        }
        // ------------------------------------------------ Zaubertrank-Blase: abwarten, draufspringen, mitsteigen, oben hinüber
        if (Lg.bubble) {
          const k = L.named.get(Lg.bubble);
          const [fx, fz] = Lg.from;
          goTo(fx, fz, 0.3, 600);
          const y0 = p.pos.y;
          let w = 0, b = null;
          for (; w < 4000; w++) {
            b = k.bubbles.find((q) => q.state === 'rise' && q.sid !== null && q.y + q.r * 0.55 > y0 + 1.6 && q.y + q.r * 0.55 < y0 + 2.6);
            if (b && p.mode === 'ground') break;
            tick({});
          }
          if (!b) { log.push(['FEHLER: keine Blase']); break; }
          let j = 0, on = false;
          for (; j < 300; j++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(b.x, b.z, 0, 0, 3.4, 7) : this.stick(b.x - p.pos.x, b.z - p.pos.z, 1)), jump: j < 30, run: false });
            if (j > 6 && p.mode === 'ground') { on = p.ground?.owner === b; break; }
            if (p.dead) break;
          }
          log.push(['auf der Blase', on, j, ...P3()]);
          if (!on) { log.push(['FEHLER: nicht auf der Blase']); break; }
          mech.bubbles++;
          let r = 0;
          for (; r < 3000 && b.state !== 'wobble' && k.bubbles.includes(b); r++) {
            const dx = b.x - p.pos.x, dz = b.z - p.pos.z;
            tick(Math.hypot(dx, dz) > 0.2 ? { ...this.stick(dx, dz, 0.35), run: false } : {});
          }
          const [tx, tz] = Lg.to;
          let a = 0;
          for (; a < 400; a++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.8, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 30, run: false });
            if (a > 10 && p.mode === 'ground') break;
          }
          log.push(['von der Blase hinüber', r, a, ...P3(), p.ground?.tag]);
          continue;
        }
        // ------------------------------------------------ Laternenpfahl: frisch angegangen abwarten (aus → an)
        if (Lg.lightOn) {
          const lp = L.named.get(Lg.lightOn);
          let k = 0;
          for (; k < 2400 && lp.on; k++) tick({});
          for (; k < 4800 && !lp.on; k++) tick({});
          log.push(['Licht an', Lg.lightOn, k, lp.on]);
          continue;
        }
        // ------------------------------------------------ Kürbis-Bombe: aufheben, hintragen, in Richtung aim werfen
        if (Lg.bomb) {
          const B = Lg.bomb;
          const near = () => L.entities.filter((e) => e.kind === 'kuerbis_bombe' && !e.removed && !e.carrier && (e.state === 'idle' || e.state === 'lit') && Math.hypot(e.pos.x - B.pick[0], e.pos.z - B.pick[1]) < 3.5)
            .sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0];
          let k = 0, bomb = null;
          for (; k < 900 && !p.holding; k++) {
            bomb = near();
            if (!bomb) { tick({}); continue; }
            const dx = bomb.pos.x - p.pos.x, dz = bomb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.95 && p.mode === 'ground') { tick({ ...this.stick(dx, dz, 0.3), action: true }); tick({}); continue; }
            tick({ ...this.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false });
          }
          log.push(['Bombe aufgehoben', !!p.holding, k, ...P3()]);
          if (!p.holding) { log.push(['FEHLER: keine Bombe']); break; }
          const held = p.holding;
          goTo(B.from[0], B.from[1], 0.35, 600);
          for (let i = 0; i < 8; i++) tick({ ...this.stick(B.aim[0] - p.pos.x, B.aim[1] - p.pos.z, 0.3) });
          tick({ action: true }); tick({});
          mech.bombs++;
          let e = 0;
          for (; e < 400 && !held.exploded && !held.removed; e++) tick({});
          log.push(['Bombe geworfen', held.exploded, e, ...P3()]);
          continue;
        }
        // ------------------------------------------------ Bosskampf Graf Brummbär: gelandete Bomben aufheben, zurückwerfen
        if (Lg.boss) {
          const g = L.named.get(Lg.boss);
          const [cx, , cz] = g.home ? [g.home.x, g.home.y, g.home.z] : [0, 0, 0];
          goTo(cx, cz + 6.5, 0.6, 900);
          let k = 0, throws = 0, picks = 0, hits0 = g.hp;
          const t0 = steps;
          for (; k < 120 * 200 && g.state !== 'gone' && !p.dead; k++) {
            if (p.holding) {
              const dx = g.pos.x - p.pos.x, dz = g.pos.z - p.pos.z;
              for (let i = 0; i < 6; i++) tick({ ...this.stick(dx, dz, 0.3) });
              tick({ action: true }); tick({});
              throws++;
              continue;
            }
            const cand = g.vulnerable ? L.entities.filter((e) => e.kind === 'kuerbis_bombe' && !e.removed && !e.carrier && e.state === 'lit' && e.fuse > 1.1 && Math.hypot(e.pos.x - g.pos.x, e.pos.z - g.pos.z) > 2.2)
              .sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0] : null;
            if (cand) {
              const dx = cand.pos.x - p.pos.x, dz = cand.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.95 && p.mode === 'ground') { tick({ ...this.stick(dx, dz, 0.3), action: true }); tick({}); if (p.holding) picks++; continue; }
              tick({ ...this.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: d > 2.5 });
              continue;
            }
            const hx = cx, hz = cz + 4.5, dx = hx - p.pos.x, dz = hz - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.8 ? { ...this.stick(dx, dz, Math.min(1, d / 2)), run: false } : {});
          }
          mech.boss = { state: g.state, hp: g.hp, hits: hits0 - g.hp, throws, picks, swarms: g.swarms ?? 0, time: +((steps - t0) / 120).toFixed(1) };
          log.push(['kampf', JSON.stringify(mech.boss)]);
          if (g.state !== 'gone') log.push(['FEHLER: Graf nicht besiegt', g.state, g.hp]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});   // erst landen, dann abspringen
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && p.mode === 'ground'));
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
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, ...P3(), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.maxY = +mech.maxY.toFixed(2);
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  window.__hw = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__hw[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}hwc_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__hw.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, world: d.world }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: Welt 31, ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.world === 31 && meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    // Verkleidung (Präzisierung Figuren Halloween): Szene und Avatar tragen 'halloween' – sobald der Motor sie kennt
    const look = await sc(() => { const c = window.__course; return { has: 'outfit' in c, scene: c.outfit ?? null, avatar: c.rig?.avatar?.outfit ?? null, hero: c.player.hero }; });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    if (look.has) check(`${id}: ${hero} in Verkleidung (Szene ${look.scene}, Avatar ${look.avatar})`, look.scene === 'halloween' && look.avatar === 'halloween');
    else console.log(`  (Verkleidung: der Motor kennt noch keine – Szene ohne outfit)`);
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
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
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
