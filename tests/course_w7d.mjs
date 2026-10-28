// Welt 7, Arena 7-C „Siebenfeuer-Saal der Werfer-Bande“ (sieben Feuer-Werfer, erhöhte Empore, Kanzel, Balkone, 100 s),
// 7-7 „Ebbe und Glut im Brodelkrater“ (steigende/sinkende Lava, Platschfische, Glasröhre, Fontänenfeld mit Gitterboden und großer
// blauer Plattform, Drachenbucht mit Lavadrachen) und 7-Burg „Kampfwagen-Duell in der Glutfeste“ (Lava-Burg mit Lavablasen,
// Bumerang-Werfer mit Wurfsichel, Zugbrücke per Kickbombe/Druckknopf, Klappstampfer, Hammer-Werfer, dann Baron Brummbär im
// Kampfwagen auf der Boss-Straße):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast bzw. Arena-Stern, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der
// Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w7d_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w7d.mjs [7-C|7-7|7-Burg]
//   PARTS=load,route,sweep,targets,extra,arena,boss,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Gegenproben
// laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } ·
// { expect: Bedingung } · { until: Bedingung } · { pipe: [x, z], stick } (in eine Glasröhren-Öffnung laufen) · { warp: [x, z] }
// (auf eine Warp-Box springen) · { stompAll: Id-Anfang } · { clear: [Ids], at: [x, z], r } (warten, bis die Gegner weg sind) ·
// { sichel: [x, y, z] } (Wurfsichel aufs Ziel werfen, auch im Sprung) · { lava: 'unten'|'oben', id } (Lavaspiegel abwarten)
const ROUTES = {
  '7-C': {
    start: [0, 2, 8.4],
    meta: { stars: 1, arena: true, time: 100, theme: 'fortress', music: 'course_arena', archetype: 'arena' },
    enemies: { feuer_werfer: 7 },
    main: [],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über der rechten Emporen-Ecke', from: [8.6, 4, -4.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [8.6, -4.4], within: 0.15, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Wurfsichel aus dem ?-Block am Start', from: [-3, 2, 7.6], heroes: ['lotti'],
        legs: [{ to: [-3, 6.2], within: 0.15, run: false }, { hop: 20 }, { to: [-3, 8.2], within: 0.3, run: false }, { chaseKind: 'powerup', max: 900 }, { expect: 'sichel' }] },
    ],
    shots: [
      ['start', [0, 2, 8.4]],
      ['saal', [0, 2, 4]],
      ['links', [-6, 2, 2]],
      ['rechts', [6, 2, 2]],
      ['treppe', [0, 2, -0.6]],
      ['empore', [0, 4, -4.4]],
      ['kanzel', [0, 6.4, -6.2]],
      ['balkon', [-8.7, 4.4, 1.7]],
      ['kampf', [0, 2, 6], 700],
    ],
  },
  '7-7': {
    start: [0, 2, 5],
    meta: { stars: 3, time: 400, theme: 'volcano', music: 'course_volcano', archetype: 'parcours' },
    enemies: { knochenflieger: 7, lavadrache: 8, platschfisch: 7 },
    main: [
      { name: 'Start', to: [0, -8.4], within: 0.5 },
      { name: 'Hochsteine', to: [0, -11], jump: 20, within: 0.7, run: false },
      { to: [0, -14.6], jump: 20, within: 0.7, run: false },
      { to: [0, -18.2], jump: 20, within: 0.7, run: false },
      { expect: 'insel1' },
      { to: [0.4, -25.4], within: 0.3, run: false },
      { name: 'Ebbe abwarten (Bimssteine 1)', until: 'seeEbbe', max: 1700 },
      { to: [0.4, -28.2], jump: 18, within: 0.7, run: false },
      { to: [-0.6, -31.2], jump: 18, within: 0.7, run: false },
      { to: [0.5, -34.2], jump: 18, within: 0.7, run: false },
      { to: [-1, -37.6], jump: 24, within: 0.7, run: false },
      { expect: 'insel2' },
      { to: [1.2, -45], within: 0.3, run: false },
      { name: 'Ebbe abwarten (Bimssteine 2, Platschfische)', until: 'seeEbbe', max: 1700 },
      { to: [1.2, -47.4], jump: 18, within: 0.7, run: false },
      { to: [3.6, -50], jump: 18, within: 0.7, run: false },
      { to: [6, -52.6], jump: 18, within: 0.7, run: false },
      { to: [6.6, -56], jump: 24, within: 0.7, run: false },
      { expect: 'insel3' },
      { name: 'Steinbogen', to: [6.5, -64.6], within: 0.5 },
      { to: [6.5, -71], within: 0.5 },
      { expect: 'insel4' },
      { to: [-0.8, -79.4], within: 0.3, run: false },
      { name: 'Ebbe abwarten (Bimssteine 3, Platschfische)', until: 'seeEbbe', max: 1700 },
      { to: [-0.8, -81.6], jump: 18, within: 0.7, run: false },
      { to: [0.8, -84.6], jump: 18, within: 0.7, run: false },
      { to: [-0.8, -87.6], jump: 18, within: 0.7, run: false },
      { to: [0, -90.8], jump: 24, within: 0.7, run: false },
      { expect: 'insel5' },
      { name: 'Glasröhre zum Kontrollpunkt', pipe: [0, -96.2] },
      { expect: 'cp77' },
      { name: 'Kontrollpunkt', to: [0, -117.4], within: 0.6 },
      { name: 'Gitter über der Grube', to: [-2, -124], within: 0.6 },
      { to: [-2, -131], within: 0.6 },
      { name: 'Gitterboden mit heißen Fontänen', to: [-1.2, -140], within: 0.6 },
      { to: [-3, -149.4], within: 0.3, run: false },
      { name: 'tragende Fontäne hinauf zur Terrasse', carry: 'platte1', board: [-3, -155], to: [-3, -158.8] },
      { expect: 'terrasse' },
      { to: [-8.6, -163], within: 0.5 },
      { to: [-8.6, -173.4], within: 0.3, run: false },
      { name: 'große blaue Plattform', ride: 'blau', board: [-8.6, -178], exit: [8.6, -178], to: [9, -184.6], jumpAt: 4.2 },
      { expect: 'anleger' },
      { to: [9.2, -189.4], within: 0.5 },
      { name: 'Treppe hinab in die Drachenbucht', to: [9.2, -196.4], within: 0.6 },
      { name: 'Drachenbucht', to: [8.5, -205.6], within: 0.6 },
      { to: [3.5, -207.4], within: 0.6 },
      { to: [3.5, -218.6], within: 0.6 },
      { to: [-1.5, -220.6], within: 0.6 },
      { to: [-1.5, -231.6], within: 0.6 },
      { to: [0, -233.6], within: 0.6 },
      { to: [0, -247], within: 0.6 },
      { name: 'Zielmast', to: [0, -255.4], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Glasröhre, Krustenplatte und blaue Plattform genutzt, drei Ebbe-Übergänge lebend', ok: (r) => r.mech.pipes >= 1 && r.mech.carries === 1 && !r.dead },
    ],
    targets: [
      { name: 'Stern 0: Wurfsichel aus dem ?-Block auf Insel 1, im Sprung auf den Stern hoch über der Lava werfen', star: 0, from: [-3, 2, -20.4],
        legs: [{ to: [-3, -22.6], within: 0.15, run: false }, { hop: 20 }, { to: [-3, -19.4], within: 0.3, run: false }, { wait: 20 }, { to: [-3, -22.6], jump: 30, jumpAt: 2.1, within: 0.5, run: false }, { expect: 'sichel' },
          { to: [4.2, -21.4], jump: 24, jumpAt: 1.8, within: 0.3, run: false }, { sichelAt: [12, -21.4], from: [4.2, -21.4], feet: 6.1 }, { wait: 60 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Wurfsichel (Anlauf-Sprung vom Inselrand)', star: 0, expectNot: true, from: [-4, 2, -21.4], heroes: ['lotti'],
        legs: [{ to: [13, -21.4], jump: 40, jumpAt: 8.2, within: 0.3, max: 200, land: false }, { wait: 60 }] },
      { name: 'Stern 1: Sternenring auf Insel 4 – drei Sternmünzen über den Bimssteinen nur bei Ebbe', star: 1, from: [3.4, 2, -70.6],
        legs: [{ until: 'seeRing', max: 1700 }, { to: [3.4, -75], within: 0.6 }, { to: [2.4, -78.2], within: 0.5 }, { to: [8.4, -78.2], within: 0.5 }, { to: [8.4, -71.8], within: 0.5 },
          { to: [-2, -71.8], within: 0.5 }, { to: [-3.6, -75], jump: 24, jumpAt: 1.2, within: 0.6 }, { to: [-5.4, -73], within: 0.5 },
          { to: [-8.4, -72.4], jump: 16, within: 0.6, run: false }, { to: [-8.4, -75.4], jump: 16, within: 0.6, run: false }, { to: [-8.4, -78.4], jump: 16, within: 0.6, run: false },
          { to: [-4.6, -78], jump: 24, within: 0.6, run: false }, { wait: 60 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: von der blauen Plattform nach Süden auf den Basaltsockel', star: 2, from: [-8.6, 4.5, -172],
        legs: [{ ride: 'blau', board: [-8.6, -178], exit: [0, -178], to: [0, -172.6], jumpAt: 3.6 }, { wait: 30 }], shot: 'stern2' },
      { name: 'Stempel: unter dem Gitter nach dem Kontrollpunkt – nur bei Ebbe in die Grube', stamp: true, from: [0, 2, -117.4],
        legs: [{ to: [4.7, -120.8], within: 0.3, run: false }, { until: 'grubeEbbe', max: 1700 }, { to: [4.7, -123.4], within: 0.4, run: false },
          { to: [-3.8, -125.6], within: 0.3, run: false }, { to: [4.7, -123.6], within: 0.4, run: false }, { to: [4.7, -120.2], jump: 30, within: 0.6, run: false }], shot: 'stempel' },
      { name: 'Stempel nicht bei Flut (die Grube ist voll Lava)', stamp: true, expectNot: true, from: [0, 2, -117.4], heroes: ['lotti'],
        legs: [{ to: [4.7, -120.8], within: 0.3, run: false }, { until: 'grubeFlut', max: 1700 }, { to: [4.7, -123.4], within: 0.4, run: false }, { to: [-3.8, -125.6], within: 0.3, run: false }],
        mech: (r) => r.dead, mechText: (r) => (r.dead ? 'in der Lava' : 'lebt') },
    ],
    extra: [
      { name: 'Bimssteine bei Flut: Lava (Tod)', from: [0.4, 2, -25.4], heroes: ['lotti'], expectAlive: false, allowFail: true,
        legs: [{ until: 'seeFlut', max: 1700 }, { to: [0.4, -28.2], jump: 18, within: 0.7, run: false }, { wait: 60 }],
        mech: (r) => r.dead, mechText: (r) => (r.dead ? 'in der Lava' : 'lebt') },
      { name: 'Hochsteine bleiben bei Flut trocken', from: [0, 2, -8.4], heroes: ['lotti'],
        legs: [{ until: 'seeFlut', max: 1700 }, { to: [0, -11], jump: 20, within: 0.7, run: false }, { wait: 120 }],
        mech: (r) => !r.dead && r.pos[1] > 1.8, mechText: (r) => `y ${r.pos[1].toFixed(2)}` },
      { name: 'Extraleben: unsichtbarer Block auf Insel 3', from: [4.6, 2, -59.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [4.6, -61.6], within: 0.15, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: von der östlichen Krustenplatte auf die Säule', from: [3, 2, -149.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ carry: 'platte2', board: [3, -155], to: [6.4, -155] }, { wait: 30 }] },
    ],
    shots: [
      ['start', [0, 2, 5]],
      ['hochsteine', [0, 2, -7]],
      ['insel1', [0, 2, -20]],
      ['ebbe', [0, 2, -25], 0],
      ['insel2', [-2, 2, -40]],
      ['insel3', [7, 2, -58]],
      ['insel4', [2, 2, -74]],
      ['insel5', [0, 2, -92]],
      ['cp', [0, 2, -117]],
      ['grube', [4.6, 0, -124]],
      ['gitter', [0, 2, -137]],
      ['platten', [0, 2, -149]],
      ['terrasse', [-4, 4.5, -162]],
      ['blau', [-8.6, 4.5, -172]],
      ['anleger', [9, 4.5, -186]],
      ['bucht', [8.5, 2, -200]],
      ['bucht2', [-1.5, 2, -224]],
      ['ziel', [0, 2, -250]],
    ],
  },
  '7-Burg': {
    start: [0, 2, 5],
    meta: { stars: 3, time: 500, theme: 'lavacastle', music: 'course_keep', archetype: 'boss' },
    enemies: { feuer_werfer: 7, lavablase: 12, baron_kampfwagen: 1, kampfwagen_strasse: 1, bomb_cannon: 1, druckknopf: 1 },
    weapons: { bumerang: 3, feuer: 2, hammer: 2 },
    main: [
      { name: 'Vorplatz', to: [0, -7], within: 0.6 },
      { name: 'Bumerang-Werfer mit Wurfsichel', stompAll: 'bumerang1' },
      { name: 'Wurfsichel aufheben', chaseKind: 'powerup', max: 900 }, { expect: 'sichel' },
      { name: 'Bumerang-Werfer auf dem Podest', stompAll: 'bumerang2' },
      { to: [-1.2, -27.4], within: 0.4, run: false }, { wait: 15 },
      { name: 'Trittsteine', to: [-1.2, -30.2], jump: 18, within: 0.7, run: false },
      { to: [1.2, -32.6], jump: 18, within: 0.7, run: false },
      { to: [0, -35.6], jump: 18, within: 0.7, run: false },
      { name: 'dritter Bumerang-Werfer', stompAll: 'bumerang3' },
      { to: [0, -47], within: 0.6 },
      { name: 'Ufer am Burggraben', to: [0, -51.4], within: 0.5 },
      { to: [8.5, -50.4], within: 0.4, run: false },
      { name: 'Kickbombe der Burgkanone gegen die Blockwand', bombe: true, at: [8.5, -51.6], done: 'wandWeg' },
      { name: 'Druckknopf im Wachturm', to: [8.5, -58.2], within: 0.4, run: false },
      { to: [8.5, -60.2], jump: 20, within: 0.5, run: false }, { until: 'brueckeUnten', max: 600 },
      { to: [8.5, -52], within: 0.4, run: false },
      { to: [2, -52.4], within: 0.5, run: false },
      { name: 'Zugbrücke', to: [0, -59], within: 0.6 },
      { to: [0, -71], within: 0.6 },
      { name: 'Kontrollpunkt', to: [0, -77], within: 0.6 },
      { expect: 'burgCp' },
      { to: [1.9, -92.4], within: 0.5 },
      { name: 'Klappstampfer-Gang', to: [1.9, -98.4], within: 0.5 },
      { to: [-1.9, -99], within: 0.5 },
      { to: [-1.9, -104.6], within: 0.5 },
      { to: [0, -105.4], within: 0.5 },
      { name: 'großer Klappstampfer liegt', until: 'klapp3Liegt', max: 900 },
      { to: [0, -113], within: 0.6 },
      { name: 'schmaler Steg', to: [0, -125], within: 0.6 },
      { to: [0, -150.6], within: 0.6 },
      { name: 'zwei Hammer-Werfer', stompAll: 'hammer' },
      { until: 'warpBoss', max: 300 },
      { name: 'Warp-Box zum Boss', warp: [0, -161.4] },
      { expect: 'bossStart' },
      { to: [0, -205], within: 0.6 },
      { name: 'Baron Brummbär im Kampfwagen', boss: true },
      { until: 'warpSieg', max: 900 },
      { name: 'Warp-Box nach dem Sieg', warp: [3.5, -346] },
      { expect: 'siegerplateau' },
      { name: 'Zielmast', to: [0, -392.4], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Blockwand mit einer Kickbombe der Burgkanone gesprengt, Zugbrücke per Druckknopf gesenkt', ok: (r) => r.mech.wall && r.mech.bridge === 'unten' },
      { name: 'Baron im Kampfwagen besiegt (9 Treffer aus zurückgekickten Bomben und Wurfsichel-Kratzern, über alle Lavalücken)', ok: (r) => r.mech.boss?.state === 'gone' && r.mech.boss.hits >= 9 && r.mech.boss.bombHits + r.mech.boss.sichelTreffer === r.mech.boss.hits && r.mech.boss.gapJumps >= 3 },
    ],
    shots: [
      ['start', [0, 2, 5]],
      ['schacht', [-5, 2, -1]],
      ['vorhof', [0, 2, -16]],
      ['hof2', [0, 2, -36]],
      ['ufer', [0, 2, -52]],
      ['turm', [6, 2, -50.6]],
      ['bruecke', [-3, 2, -58]],
      ['cp', [0, 2, -77]],
      ['vordach', [7, 2, -84.5]],
      ['gang', [0, 2, -94]],
      ['hof3', [0, 2, -116]],
      ['steg', [0, 2, -132]],
      ['buehne', [0, 2, -153]],
      ['boss', [0, 2, -203]],
      ['ziel', [0, 2, -384]],
    ],
  },
};

const PORT = 4750;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,arena,boss,shots').split(','));
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
  const ent = (id) => L.named.get(id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  // Takt der Lavaspiegel (deterministisch auf der Level-Uhr, Plan wie im Baustein): Sekunde im Zyklus
  const seeT = () => ((L.time % 12.5) + 12.5) % 12.5;                 // 7-7 Lavasee: unten 0–3, warn 3–4,5, steigt –7, oben –10, sinkt –12,5
  const grubeT = () => (((L.time + 3) % 12) + 12) % 12;               // 7-7 Grube: unten 0–3,5, warn –5, steigt –7, oben –10, sinkt –12
  const COND = {
    sichel: () => P().power === 'sichel',
    // 7-7
    insel1: () => at(-5.5, 5.5, 1.5, -16.4, -26.2),
    insel2: () => at(-7.5, 3.5, 1.5, -36, -46),
    insel3: () => at(1.5, 12.5, 1.5, -54, -64.2),
    insel4: () => at(-6.5, 10.5, 1.5, -69.8, -80.2),
    insel5: () => at(-6.5, 6.5, 1.5, -89, -97.2),
    cp77: () => at(-7.5, 7.5, 1.5, -112.4, -121.8),
    terrasse: () => at(-10.6, 8.2, 4, -156.8, -174.6),
    anleger: () => at(6.2, 12.2, 4, -181.4, -190.2),
    // Bimssteine (Füße 1,0 m) sind sicher, solange die Lava ≤ 1,12 m steht: Zyklus 11,0 … 6,0 s; losgehen bei 11,0 … 1,2 s
    seeEbbe: () => { const t = seeT(); return t >= 11.0 || t < 1.2; },
    seeRing: () => { const t = seeT(); return t >= 8.8 && t < 9.4; },
    seeFlut: () => { const t = seeT(); return t >= 7.2 && t < 8.5; },
    grubeEbbe: () => { const t = grubeT(); return t >= 11.2 || t < 0.8; },
    grubeFlut: () => { const t = grubeT(); return t >= 7.4 && t < 8.6; },
    // 7-Burg
    wandWeg: () => (L.named.get('turmwand')?.broken ?? 0) > 0,
    brueckeUnten: () => L.named.get('bruecke')?.state === 'unten',
    brueckeOben: () => L.named.get('bruecke')?.state === 'oben',
    klapp3Liegt: () => L.named.get('klapp3')?.state === 'liegt',
    klapp3Oben: () => L.named.get('klapp3')?.state === 'oben',
    warpBoss: () => L.named.get('warp_boss') && !L.named.get('warp_boss').hidden,
    warpSieg: () => L.named.get('warp_sieg') && !L.named.get('warp_sieg').hidden,
    burgCp: () => at(-9.5, 9.5, 1.5, -72.8, -92.2),
    buehne: () => at(-8.5, 8.5, 1.5, -149.8, -164.2),
    bossStart: () => at(-7.5, 7.5, 1.5, -197.5, -212),
    siegerplateau: () => at(-8.5, 8.5, 1.5, -377.5, -398.5),
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
      const mech = { hurts: 0, keys: 0, pipes: 0, warps: 0, rides: 0, stomped: [], hurtList: [] };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasnetz' || kind === 'glasspipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
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
        // ------------------------------------------------ warten, bis Stachelkugeln (Ids) nicht mehr nahe am Weg sind
        if (Lg.clear) {
          const [cx, cz] = Lg.at, r = Lg.r ?? 3;
          const near = () => Lg.clear.some((id) => { const e = ent(id); return e && e.alive && !e.removed && Math.hypot(e.pos.x - cx, e.pos.z - cz) < r; });
          let k = 0, prev = null, ok = 0;
          // erst warten, bis die Kugeln weg sind und sich entfernen
          for (; k < 900; k++) {
            const d = Lg.clear.map((id) => { const e = ent(id); return e ? Math.hypot(e.pos.x - cx, e.pos.z - cz) : 99; });
            const away = prev ? d.every((v, i) => v >= prev[i] - 1e-4 || v > r + 3) : false;
            prev = d;
            if (!near() && away) { if (++ok > 3) break; } else ok = 0;
            tick({});
          }
          log.push(['frei', Lg.clear.join(','), k]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: false, jump: Lg.jumpIn && k % 40 < 12 });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box / Wolkenkanone springen und mitfahren
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
          if (!rode) { log.push(['FEHLER: Warp-Box/Kanone nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ tragende Fontäne (Krustenplatte): frisch in Ruhe aufspringen, hochfahren, hinüber
        if (Lg.carry) {
          const f = L.named.get(Lg.carry);
          const [bx, bz] = Lg.board, [tx, tz] = Lg.to;
          let k = 0, prev = f.state, boarded = false, top = false;
          for (; k < 2400 && !p.dead; k++) { tick({}); if (prev === 'sinkt' && f.state === 'ruhe') break; prev = f.state; }
          for (let n = 0; n < 400 && !p.dead; n++, k++) {
            const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && p.ground?.tag === 'fontaene-platte') { boarded = true; if (d < 0.5) break; }
            tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3.4, 11) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)))), run: !boarded, jump: p.mode === 'ground' && !boarded ? d < (Lg.jumpAt ?? 5.4) : p.vel.y > 0 && !boarded });
          }
          for (let n = 0; n < 1600 && !p.dead && f.state !== 'oben'; n++, k++) tick({});
          for (let n = 0; n < 40 && !p.dead; n++, k++) tick({});
          top = f.state === 'oben' && p.ground?.tag === 'fontaene-platte';
          for (let n = 0; n < 400 && !p.dead; n++, k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.5 && p.mode === 'ground' && n > 20) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 7) : this.stick(dx, dz, 1)), run: false, jump: n < 22 });
          }
          mech.carries = (mech.carries ?? 0) + (boarded && top ? 1 : 0);
          log.push(['fontäne', Lg.carry, boarded, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!boarded || !top) log.push(['FEHLER: Krustenplatte nicht genutzt', Lg.carry]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel im Sprung auf ein Ziel [x, z] werfen (ab Fußhöhe feet)
        if (Lg.sichelAt) {
          const [tx, tz] = Lg.sichelAt, [fx, fz] = Lg.from;
          let k = 0;
          for (; k < 600 && !p.dead; k++) {
            const dx = fx - p.pos.x, dz = fz - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.15 && p.mode === 'ground') break;
            tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.2, d / 1.2))), run: false });
          }
          for (let n = 0; n < 240; n++, k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (Math.hypot(dx, dz) || 1);
            if (dot > 0.995 && p.hSpeed() < 0.05) break;
            tick(dot > 0.995 ? {} : { ...this.stick(dx, dz, 0.1), run: false });
          }
          let thrown = false;
          for (let n = 0; n < 120 && !p.dead; n++, k++) {
            const act = !thrown && p.mode === 'air' && p.pos.y >= (Lg.feet ?? 0) && p.vel.y <= (Lg.vy ?? 0.8);   // am Scheitel werfen
            if (act) thrown = true;
            tick({ jump: n < 30, action: act });
          }
          for (let n = 0; n < 400 && L.entities.some((e) => e.kind === 'wurfsichel' && !e.removed); n++, k++) tick({});
          log.push(['wurfsichel', thrown, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!thrown) log.push(['FEHLER: Wurfsichel nicht geworfen']);
          continue;
        }
        // ------------------------------------------------ Kickbombe (Kanone) an der Stelle at abwarten und nach Norden (−z) kicken, bis until gilt
        if (Lg.bombe) {
          const [ax, az] = Lg.at;
          let k = 0, kicked = 0;
          for (; k < (Lg.max ?? 3600) && !p.dead && !COND[Lg.done](); k++) {
            const bomb = L.entities.find((e) => e.kind === 'kickbombe' && !e.removed && !e.kicker && e.grounded && Math.hypot(e.pos.x - ax, e.pos.z - az) < 2.2);
            let tx = ax, tz = az + 1.4;
            if (bomb) { tx = bomb.pos.x; tz = p.pos.z > bomb.pos.z + 0.3 && Math.abs(p.pos.x - bomb.pos.x) < 0.45 ? bomb.pos.z - 1 : bomb.pos.z + 1.1; }
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const was = L.entities.filter((e) => e.kind === 'kickbombe' && e.kicker).length;
            tick({ ...(d > 0.12 ? this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.2))) : {}), run: false });
            if (L.entities.filter((e) => e.kind === 'kickbombe' && e.kicker).length > was) kicked++;
          }
          for (let i = 0; i < 60; i++) tick({});
          mech.kicks = (mech.kicks ?? 0) + kicked;
          log.push(['kickbombe', Lg.done, COND[Lg.done](), kicked, k, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!COND[Lg.done]()) log.push(['FEHLER: Kickbombe', Lg.done]);
          continue;
        }
        // ------------------------------------------------ Baron Brummbär im Kampfwagen mit echter Eingabe besiegen
        if (Lg.boss) {
          const r = this.baronFight({ tick, ...Lg });
          mech.boss = r;
          log.push(['baron', r.state, `Treffer ${r.hits} (Bomben ${r.bombHits}, Wurfsichel ${r.sichelTreffer} aus ${r.sichelHits} Kratzern)`, `Lückensprünge ${r.gapJumps}`, `${r.time} s`]);
          if (r.state !== 'gone') { log.push(['FEHLER: Baron nicht besiegt', r.hp]); break; }
          continue;
        }
        // ------------------------------------------------ Schubser in Richtung dir vom Schiff stoßen (Anlauf von der Gegenseite)
        if (Lg.push) {
          const e = L.entities.find((x) => x.spec?.id === Lg.push);
          const dl = Math.hypot(Lg.dir[0], Lg.dir[1]) || 1;
          let dx = Lg.dir[0] / dl, dz = Lg.dir[1] / dl;
          const cx = Lg.center ?? 0;   // Schiffsmitte (x): Anlaufpunkt nie näher als 1,3 m an die Deckkante
          let tries = 0;
          const gone = () => !e || !e.alive || e.removed || e.defeated || e.state === 'defeated' || e.state === 'fall' || e.pos.y < (e.home?.y ?? 0) - 1.5;
          for (; tries < 10 && !gone() && !p.dead; tries++) {
            // auf die Gegenseite des Schubsers gehen (nah, damit die Figur nicht an die Deckkante gerät)
            // zur näheren Deckkante stoßen
            if (Math.abs(e.pos.x - cx) > 0.4) { dx = Math.sign(e.pos.x - cx); dz = 0; }
            // Anlauf zügig: auf die Gegenseite (≈ 2,6 m vor ihm, nie näher als 1,3 m an die Deckkante), von dort gleich abspringen
            const dodge = () => {
              // rammt er heran: hochspringen und über ihn hinweg (er rauscht darunter durch), dann zur Mitte zurück
              if (e.state !== 'charge' || Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > 3.2 || p.mode !== 'ground') return false;
              for (let q = 0; q < 30; q++) tick({ jump: true });
              for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick({ ...this.airSteer(Math.max(cx - 1.4, Math.min(cx + 1.4, p.pos.x)), p.pos.z, 0, 0, 2, 3) });
              mech.dodged = (mech.dodged ?? 0) + 1;
              return true;
            };
            for (let k = 0; k < 500 && !gone(); k++) {
              if (dodge()) continue;
              const ax = Math.max(cx - 2.2, Math.min(cx + 2.2, e.pos.x - dx * (Lg.back ?? 2.6))), az = e.pos.z - dz * (Lg.back ?? 2.6);
              const qx = ax - p.pos.x, qz = az - p.pos.z, d = Math.hypot(qx, qz);
              if (d < 0.6 && p.mode === 'ground' && e.state !== 'warn' && e.state !== 'charge') break;
              tick({ ...this.stick(qx, qz, Math.min(1, Math.max(0.5, d / 1.0))), run: d > 2 });
            }
            const p0 = e.pushes ?? 0;
            // Sprung auf ihn (Ziel knapp vor seiner Mitte auf unserer Seite), über ihm Stampfattacke → er rutscht in dir
            let pounding = false;
            for (let k = 0; k < 220 && !gone() && (e.pushes ?? 0) === p0 && !p.dead; k++) {
              const tx = Math.max(cx - 2.4, Math.min(cx + 2.4, e.pos.x - dx * 0.3)), tz = e.pos.z - dz * 0.3;
              const hd = Math.hypot(tx - p.pos.x, tz - p.pos.z);
              if (!pounding && k > 6 && hd < 0.45 && p.vel.y < 3 && p.pos.y > e.pos.y + 1.2) pounding = true;
              if (pounding) { tick({ crouch: true }); continue; }
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, e.vel?.x ?? 0, e.vel?.z ?? 0, 3.4, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: k < 26, run: false });
            }
            // nach dem Stoß in der Luft zur Deckmitte lenken, dann kurz warten
            for (let k = 0; k < 240 && p.mode !== 'ground' && !p.dead; k++) tick({ ...this.airSteer(Math.max(cx - 1.6, Math.min(cx + 1.6, p.pos.x)), p.pos.z, 0, 0, 3, 5) });
            // warten, dabei nicht an die Deckkante rutschen (zur Mitte zurück)
            for (let k = 0; k < 150 && !gone(); k++) {
              const off = p.pos.x - cx;
              tick(p.mode === 'ground' && Math.abs(off) > 1.2 ? this.stick(-off, 0, 0.6) : {});
            }
          }
          for (let k = 0; k < 120 && e?.alive && !e?.removed && !e?.defeated; k++) tick({});
          if (gone()) mech.pushedOff = (mech.pushedOff ?? 0) + 1;
          log.push(['schubser', Lg.push, gone(), tries, e?.state, e?.fellBy, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!gone()) { log.push(['FEHLER: Schubser nicht hinuntergestoßen', Lg.push]); break; }
          continue;
        }
        // ------------------------------------------------ durch die Lücke eines Kreisgeist-Rings zum Ziel (Lücke vorausrechnen)
        if (Lg.ringGap) {
          const ring = L.entities.find((x) => x.spec?.id === Lg.ringGap);
          const members = () => (ring?.members ?? []).filter((x) => x.alive && !x.removed);
          const [tx, tz] = Lg.to;
          // warten, bis auf dem Weg zum Ziel kein Geist näher als 1,35 m kommt (Vorausschau 1,2 s mit Ringdrehung)
          const safe = () => {
            const c = ring.pos, w = (ring.speed ?? 1.6) / Math.max(0.1, ring.radius ?? 3) * (ring.cw ? -1 : 1);
            const vx = 0, vz = 0; void vx; void vz;
            for (let t = 0; t <= 1.2; t += 0.1) {
              const k = Math.min(1, t / 0.9), px = p.pos.x + (tx - p.pos.x) * k, pz = p.pos.z + (tz - p.pos.z) * k;
              for (const m of members()) {
                const a0 = Math.atan2(m.pos.z - c.z, m.pos.x - c.x), r = Math.hypot(m.pos.x - c.x, m.pos.z - c.z);
                for (const sg of [1, -1]) {
                  const a = a0 + sg * w * t;
                  if (Math.hypot(c.x + Math.cos(a) * r - px, c.z + Math.sin(a) * r - pz) < 1.35) return false;
                }
              }
            }
            return true;
          };
          let k = 0;
          for (; k < 1200 && !safe(); k++) tick({});
          let j = 0;
          for (; j < 400 && !p.dead; j++) {
            const qx = tx - p.pos.x, qz = tz - p.pos.z, d = Math.hypot(qx, qz);
            if (d < 0.4 && p.mode === 'ground') break;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(qx, qz, 1)), run: true });
          }
          log.push(['ringlücke', Lg.ringGap, k, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Lücke zwischen kreisenden Gegnern (Art kind nahe near) abwarten
        if (Lg.gap) {
          const [cx, cz, cr] = Lg.near, [tx, tz] = Lg.to;
          const foes = () => L.entities.filter((x) => x.kind === Lg.gap && x.alive && !x.removed && Math.hypot(x.pos.x - cx, x.pos.z - cz) < cr);
          // Vorausschau: Gegner auf ihrer Kreisbahn um near (Winkelgeschwindigkeit aus zwei aufeinanderfolgenden Schritten)
          const prevA = new Map();
          const safe = () => {
            const d0 = Math.hypot(tx - p.pos.x, tz - p.pos.z), T = d0 / 6.5 + 0.35;
            const list = foes().map((m) => {
              const rx = m.pos.x - cx, rz = m.pos.z - cz, a = Math.atan2(rz, rx);
              let w = 0;
              if (prevA.has(m)) { let da = a - prevA.get(m); if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; w = da * 60; }
              prevA.set(m, a);
              return { a, r: Math.hypot(rx, rz), w };
            });
            if (!list.length) return true;
            if (list.some((f) => f.w === 0)) return false;   // erst nach zwei Schritten urteilen
            for (let t = 0; t <= T + 0.3; t += 0.1) {
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
            const pu0 = e.pushes ?? 0;
            for (; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              if (Lg.max && (e.pushes ?? 0) > pu0) { mech.bounced = (mech.bounced ?? 0) + 1; break; }
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
            if (Lg.max && guard + 1 >= Lg.max) break;
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
        // ------------------------------------------------ Feuerbälle (Funkenblüte) auf ein Ziel (Id), bis es getroffen ist
        if (Lg.fire) {
          const e = L.named.get(Lg.fire);
          const done = () => !e || !e.alive || e.removed || e.defeated || e.lit;
          let k = 0, shots = 0;
          for (; k < (Lg.max ?? 1500) && !done() && !p.dead; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const want = Lg.dist ?? 3.5;
            if (d > want + 0.6 || p.mode !== 'ground') { tick({ ...this.stick(dx, dz, Math.min(1, (d - want) / 1.5 + 0.3)), run: false }); continue; }
            // zum Ziel drehen (kleiner Schritt), dann werfen
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot < 0.97) { tick({ ...this.stick(dx, dz, 0.12), run: false }); continue; }
            const fire = k % 24 === 0;
            if (fire) shots++;
            tick({ action: fire });
          }
          for (let i = 0; i < 30; i++) tick({});
          log.push(['feuer', Lg.fire, done(), shots, k]);
          if (!done()) log.push(['FEHLER: Ziel nicht getroffen', Lg.fire]);
          continue;
        }
        // ------------------------------------------------ Fahrplattform (mover-Id): warten, aufsteigen, mitfahren, absteigen
        if (Lg.ride) {
          const m = L.named.get(Lg.ride);
          const sh = m.shape;
          const cz = () => (sh.z0 + sh.z1) / 2, cx = () => (sh.x0 + sh.x1) / 2, top = () => sh.y1;
          const [ax, az] = Lg.board, [bx, bz] = Lg.to;
          let k = 0;
          // warten, bis die Plattform am Einstieg steht
          for (; k < 2400 && Math.hypot(cx() - ax, cz() - az) > 0.4; k++) tick({});
          for (let n = 0; n < 300 && !p.dead; n++, k++) {
            const dx = cx() - p.pos.x, dz = cz() - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.35 && p.mode === 'ground' && Math.abs(p.pos.y - top()) < 0.2) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(cx(), cz(), 0, 0, 4, 6) : this.stick(dx, dz, Math.min(1, d))), run: false, jump: d < 2.2 && p.mode === 'ground' && p.pos.y < top() - 0.3 });
          }
          // mitfahren, bis die Plattform am Ausstieg ist
          for (let n = 0; n < 2400 && !p.dead && Math.hypot(cx() - Lg.exit[0], cz() - Lg.exit[1]) > 0.4; n++, k++) tick({ ...this.stick(cx() - p.pos.x, cz() - p.pos.z, Math.min(1, Math.hypot(cx() - p.pos.x, cz() - p.pos.z))), run: false });
          // absteigen: erst zur Plattformkante laufen (jumpAt m vor dem Ziel), dann springen
          let j0 = Lg.jumpAt ? null : 0;
          for (let n = 0; n < 400 && !p.dead; n++, k++) {
            const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.5 && p.mode === 'ground' && (j0 === null || n - j0 > 20)) break;
            if (j0 === null && d <= Lg.jumpAt) j0 = n;
            tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3.4, 8) : this.stick(dx, dz, 1)), run: false, jump: j0 !== null && n - j0 < 20 });
          }
          log.push(['fahrt', Lg.ride, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ alle Felder (Liste [x, z]) betreten
        if (Lg.tiles) {
          for (const [tx, tz] of Lg.tiles) {
            for (let n = 0; n < 400 && !p.dead; n++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.3) break;
              tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2))), run: false });
            }
            for (let n = 0; n < 6; n++) tick({});
          }
          log.push(['felder', Lg.tiles.length, Lg.group ? L.named.get(Lg.group)?.done : null]);
          continue;
        }
        // ------------------------------------------------ Schiebekugel über Wegpunkte rollen (Figur stellt sich dahinter)
        if (Lg.roll) {
          const ball = L.named.get(Lg.roll);
          let k = 0;
          for (const [wx, wz, near = 0.5] of Lg.via) {
            for (let n = 0; n < 2400 && !p.dead; n++, k++) {
              const bx = ball.pos.x, bz = ball.pos.z;
              const dx = wx - bx, dz = wz - bz, d = Math.hypot(dx, dz);
              if (d < near) break;
              const ux = dx / d, uz = dz / d, R = ball.size / 2 + 0.55;
              const sx = bx - ux * R, sz = bz - uz * R;            // Schiebepunkt hinter der Kugel
              const qx = sx - p.pos.x, qz = sz - p.pos.z, q = Math.hypot(qx, qz);
              // Abstand der Figur zur Schiebelinie: liegt sie seitlich, erst um die Kugel herum (Abstand halten)
              const rx = p.pos.x - bx, rz = p.pos.z - bz, along = rx * ux + rz * uz;
              if (q > 0.35 || along > -R + 0.2) {
                let gx = qx, gz = qz;
                const rl = Math.hypot(rx, rz);
                if (rl < R + 0.3 && along > -R + 0.4) { gx = rx / rl; gz = rz / rl; gx += -ux * 0.6; gz += -uz * 0.6; }   // vom Ball weg
                tick({ ...this.stick(gx, gz, Math.min(1, Math.max(0.35, q / 1.2))), run: false });
              } else {
                const sp = Math.min(1, Math.max(0.25, d / 3)) * (Lg.slow ?? 0.6);
                tick({ ...this.stick(ux + (sx - p.pos.x) * 0.8, uz + (sz - p.pos.z) * 0.8, sp), run: false });
              }
            }
          }
          for (let i = 0; i < 120; i++) tick({});
          log.push(['kugel', Lg.roll, k, +ball.pos.x.toFixed(2), +ball.pos.z.toFixed(2), ball.resets ?? 0]);
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
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.keys = L.keys?.tor?.n ?? 0;
      mech.lives = L.runtime.save?.lives;
      mech.stars = L.runtime.stars.slice();
      mech.stamp = !!L.runtime.stamp;
      mech.wall = (L.named.get('turmwand')?.broken ?? 0) > 0;
      mech.bridge = L.named.get('bruecke')?.state ?? null;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    /**
     * Baron im Kampfwagen mit echter Eingabe: im Kampffenster mitlaufen (Spur neben der Mittellücke), über Lavalücken springen,
     * gelandete eigene Bomben von hinten anlaufen und nach vorn kicken (Zielhilfe lenkt sie zum Wagen), mit der Wurfsichel werfen.
     */
    baronFight(o = {}) {
      const p = P(), b = L.named.get(o.id ?? 'baron'), road = L.named.get(o.road ?? 'strasse');
      const t0 = L.time;
      const tick = o.tick ?? ((inp) => { p.invuln = Math.max(p.invuln, 5); c.setInput(inp); c.step(1); });
      let gapJumps = 0, sichelThrows = 0, kicks = 0;
      for (let i = 0; i < 1500 && b.state === 'wait' && !p.dead; i++) tick({ ...this.stick(-p.pos.x * 0.3, -1, 1), run: false });
      const mine = () => L.entities.some((e) => e.kind === 'wurfsichel' && !e.removed && e.owner === p);
      for (let n = 0; n < (o.max ?? 120 * 240) && !p.dead && b.state !== 'gone' && L.runtime.status === 'play'; n++) {
        if (o.stopAfterHits && b.hits >= o.stopAfterHits) break;
        if (p.mode === 'ground') {
          const g = road.gapsBetween(p.pos.z - 0.1, p.pos.z - 1.8)[0];
          if (g && p.pos.z > g.near) {
            const tz = g.far - 1.8;
            for (let k = 0; k < 140 && !p.dead; k++) {
              tick({ ...(p.mode === 'air' ? this.airSteer(p.pos.x, tz, 0, 0, 3, 9) : this.stick(0, -1, 1)), jump: k < 24, run: true });
              if (k > 8 && p.mode === 'ground') break;
            }
            gapJumps++;
            continue;
          }
        }
        const side = Math.sign(p.pos.x - road.cx || 1);
        const crosses = (z1, z2) => road.gapsBetween(Math.max(z1, z2) + 0.3, Math.min(z1, z2) - 0.3);
        const midIn = (z1, z2) => road.midAt(Math.max(z1, z2) + 0.8, Math.min(z1, z2) - 0.8);
        const mid = midIn(p.pos.z + 1.5, p.pos.z - 5);
        const laneX = mid ? road.cx + side * (mid.half + 1.5) : road.cx;
        // nur Bomben ohne Lücke dazwischen (keine Querlücke, nicht über die Mittellücke)
        const bomb = L.entities.filter((e) => e.kind === 'kickbombe' && !e.removed && !e.kicker && e.owner === b && e.state === 'lit' && e.grounded
          && e.pos.z < p.pos.z + 2.5 && road.solidAt(e.pos.x, e.pos.z + 1.1, 0.25) && !crosses(p.pos.z, e.pos.z + 1.1).length
          && !(midIn(p.pos.z, e.pos.z) && Math.sign(e.pos.x - road.cx || 1) !== side))
          .sort((a, q) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z))[0];
        let tx, tz;
        if (bomb && b.vulnerable) {
          const behind = p.pos.z > bomb.pos.z + 0.35 && Math.abs(p.pos.x - bomb.pos.x) < 0.45;
          tx = bomb.pos.x; tz = behind ? bomb.pos.z - 1 : bomb.pos.z + 1.1;
        } else {
          tx = laneX; tz = b.pos.z + 7.5;
          // eben über eine Lücke gekommen: nicht zurücklaufen
          const g = crosses(p.pos.z, tz)[0];
          if (g && p.pos.z < g.z) tz = Math.min(tz, g.far - 0.9);
        }
        const m2 = midIn(Math.max(p.pos.z, tz), Math.min(p.pos.z, tz));
        if (m2 && Math.abs(tx - road.cx) < m2.half + 0.7) tx = road.cx + side * (m2.half + 0.7);
        const fv = p.facingVec();
        const act = p.power === 'sichel' && !mine() && p.mode === 'ground' && fv.z < -0.9 && Math.abs(p.pos.z - b.pos.z) < 8.5 && Math.abs(p.pos.x - b.pos.x) < 2.5 && b.vulnerable;
        if (act) sichelThrows++;
        const was = L.entities.filter((e) => e.kind === 'kickbombe' && e.kicker).length;
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
        tick({ ...(d > 0.12 ? this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.4))) : {}), run: d > 3, action: act });
        if (L.entities.filter((e) => e.kind === 'kickbombe' && e.kicker).length > was) kicks++;
      }
      const by = (k) => (b.hitLog ?? []).filter((h) => h.kind === k).length;
      return { state: b.state, hp: b.hp, hits: b.hits, bombHits: by('bombe'), sichelTreffer: by('sichel'), kicks, gapJumps, sichelThrows, sichelHits: b.sichelHits ?? 0, carHits: b.carHits ?? 0,
        bounces: b.bounces ?? 0, time: +(L.time - t0).toFixed(1), dead: p.dead, phase: b.phase, jumps: b.jumps, pushes: b.pushes };
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
    /** Gegner e mit echter Eingabe anlaufen und draufspringen (in der Luft auf ihn lenken). → { ok, steps } */
    jumpOn(e, o = {}) {
      const p = P();
      let n = 0;
      const done = o.until ?? ((x) => x.defeated || x.removed || !x.alive);
      let best = Infinity, still = 0, auto = 0;
      for (; n < (o.max ?? 2400) && !done(e) && !p.dead; n++) {
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        // steckt die Figur fest (z. B. vor der Emporen-Kante), springt sie mit vollem Stick nach
        if (p.mode === 'ground') { if (d < best - 0.05) { best = d; still = 0; } else if (++still > 30 && auto <= 0) { auto = 24; still = 0; best = Infinity; } }
        let inp;
        if (p.mode === 'air') {
          const vx = dx * 4 + (e.vel?.x ?? 0), vz = dz * 4 + (e.vel?.z ?? 0), ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
          inp = { ...(el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : {}), jump: p.vel.y > 0 };
        } else {
          const jump = d < (o.at ?? 2.0) && Math.abs(e.pos.y - p.pos.y) < 1.2;
          const high = e.pos.y - p.pos.y > 1.2 && d < 2.6;
          inp = { ...this.stick(dx, dz, 1), run: d > 3, jump: jump || high || auto > 0 };
        }
        if (auto > 0) auto--;
        if (o.safe) p.invuln = Math.max(p.invuln, 3);
        c.setInput(inp); c.step(1);
      }
      c.setInput({}); c.step(3);
      return { ok: done(e), steps: n };
    },
    /** Arena-Kampf gegen den Lavafelsen-König mit echter Eingabe: Brocken betäuben, aufheben, werfen; rollt er heran, ausweichen. */
    bossFight(id, o = {}) {
      const p = P(), b = L.named.get(id), log = [], hits = [];
      let throws = 0;
      const t0 = L.time;
      let maxFish = 0, fishJumps = 0;
      const fishNow = () => L.entities.filter((e) => e.kind === 'platschfisch' && !e.removed && e.alive && !e.isSource);
      const tick = (inp) => {
        p.invuln = Math.max(p.invuln, 5); c.setInput(inp); c.step(1);
        const f = fishNow(); maxFish = Math.max(maxFish, f.length); fishJumps = Math.max(fishJumps, f.reduce((a, e) => a + (e.jumps ?? 0), 0));
      };
      const dist = (e) => Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      const brocken = () => L.entities.filter((e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated && e.alive && e.owner === b);
      const danger = () => (b.state === 'roll' && dist(b) < 5) || (b.state === 'spin' && dist(b) < 3.2);
      const dodge = () => {
        const l = Math.hypot(b.vel.x, b.vel.z) || 1;
        let sx = -b.vel.z / l, sz = b.vel.x / l;
        const rx = p.pos.x - b.pos.x, rz = p.pos.z - b.pos.z;
        if (b.state === 'spin' || l < 0.5) { sx = rx; sz = rz; } else if (sx * rx + sz * rz < 0) { sx = -sx; sz = -sz; }
        const pr = Math.hypot(p.pos.x, p.pos.z + 0.6);
        if (pr > 8.2) { sx = sx * 0.3 - p.pos.x / pr; sz = sz * 0.3 - (p.pos.z + 0.6) / pr; }
        tick({ ...this.stick(sx, sz, 1), run: true });
      };
      for (let i = 0; i < 900 && b.state === 'wait'; i++) tick({ ...this.stick(-p.pos.x, -1 - p.pos.z, 0.7), run: false });
      const fighting = () => b.state !== 'gone' && b.state !== 'defeated' && !p.dead && L.runtime.status === 'play';
      for (let guard = 0; guard < 40 && fighting(); guard++) {
        if (o.stopAfterHits && hits.length >= o.stopAfterHits) break;
        // 1) einen Brocken am Boden betäuben (draufspringen) und aufheben
        if (!p.holding) {
          let br = null;
          for (let i = 0; i < 1800 && !br && fighting(); i++) {
            br = brocken().filter((e) => e.grounded && e.state !== 'air' && Math.hypot(e.pos.x, e.pos.z + 0.6) < 9.5).sort((a, q) => dist(a) - dist(q))[0] ?? null;
            if (!br) { if (danger()) dodge(); else tick({}); }
          }
          if (!br) { log.push(['kein Brocken', b.state]); continue; }
          for (let i = 0; i < 700 && br.state !== 'stunned' && !br.removed && fighting(); i++) {
            if (danger() && p.mode === 'ground') { dodge(); continue; }
            const dx = br.pos.x - p.pos.x, dz = br.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'air') {
              const vx = dx * 4 + (br.vel?.x ?? 0), vz = dz * 4 + (br.vel?.z ?? 0), ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
              tick({ ...(el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : {}), jump: p.vel.y > 0 });
            } else tick({ ...this.stick(dx, dz, 1), run: d > 3, jump: d < 1.9 });
          }
          if (br.removed || br.state !== 'stunned') { log.push(['nicht betäubt', br.state]); continue; }
          let dbg = null;
          for (let i = 0; i < 500 && p.holding !== br && !br.removed && br.state === 'stunned' && fighting(); i++) {
            if (p.mode !== 'ground') {
              // nach dem Abprall neben dem Brocken landen (zur Arenamitte hin), nicht wieder auf ihm
              let ax = -br.pos.x, az = -0.6 - br.pos.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
              tick(this.airSteer(br.pos.x + ax * 1.2, br.pos.z + az * 1.2, 0, 0, 4, 5));
              continue;
            }
            if (danger()) { dodge(); continue; }
            const dx = br.pos.x - p.pos.x, dz = br.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            dbg = [+d.toFixed(2), +dot.toFixed(2), p.state, br.carryable, br.canCarry?.(p), +(br.pos.y - p.pos.y).toFixed(2)];
            if (d > 0.85) { tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5 + 0.2)), run: false }); continue; }
            if (dot < 0.9) { tick({ ...this.stick(dx, dz, 0.15), run: false }); continue; }
            tick({ action: i % 8 === 0 });
          }
          if (p.holding !== br) { log.push(['nicht aufgehoben', br.state, dbg]); continue; }
          log.push(['Brocken', +(L.time - t0).toFixed(1)]);
        }
        // 2) werfen, sobald der König nicht rollt/wirbelt: auf 3–5 m heran, zielen, Aktion
        const hp0 = b.hp;
        let thrown = false;
        for (let i = 0; i < 3000 && p.holding && fighting(); i++) {
          if (!['summon', 'rest'].includes(b.state)) { if (danger()) dodge(); else tick({}); continue; }
          const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          if (d > 5) { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
          if (d < 3) { tick({ ...this.stick(-dx, -dz, 1), run: false }); continue; }
          const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
          if (dot < 0.97) { tick({ ...this.stick(dx, dz, 0.12), run: false }); continue; }
          tick({ action: true }); throws++; thrown = true; tick({});
        }
        for (let i = 0; i < 160 && b.hp === hp0 && thrown; i++) tick({});
        if (b.hp < hp0) hits.push(+(L.time - t0).toFixed(1));
        log.push(['Wurf', throws, b.hp, b.state]);
      }
      // 3) Sieg: Stern abwarten und einsammeln
      if (!o.stopAfterHits) {
        for (let i = 0; i < 900 && !this.arch().starTouch && !p.dead; i++) tick({});
        const star = L.entities.find((x) => x.kind === 'star' && x.alive);
        if (star) this.drive([{ to: [star.pos.x, star.pos.z], within: 0.2, run: true, max: 900 }], {});
        for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
      }
      c.setInput({});
      return { maxFish, fishJumps, fishAfter: fishNow().length, gone: b.state === 'gone' || b.hp === 0, hits, throws, time: +(L.time - t0).toFixed(1), got: !!L.runtime.stars[0], finished: !!c.finished,
        save: this.save().levels?.[L.id] ?? null, hurts: p.hurtTries ?? 0, log };
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  window.__w7d = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w7d[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w7d_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w7d.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots ?? null }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const starsOk = R.meta.arena ? meta.slots === 1 : (meta.stars === R.meta.stars && kinds.stamp === 1);
    check(`${id}: ${R.meta.stars} Stern(e)${R.meta.arena ? '' : ', Stempel'}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    if (R.weapons) {
      const ws = await sc(() => { const m = {}; for (const e of window.__course.level.entities) if (e.kind === 'feuer_werfer') m[e.weapon] = (m[e.weapon] ?? 0) + 1; return m; });
      check(`${id}: Werfer-Waffen ${JSON.stringify(ws)}`, Object.entries(R.weapons).every(([k, n]) => ws[k] === n));
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
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Arena 7-C: sieben Werfer werfen und springen, Kampf mit echter Eingabe,
  // Feuerschalen erlöschen, Tod setzt zurück, Wurfsichel, Zeitlimit
  if (id === '7-C' && PARTS.has('arena') && !ONLY) {
    await load(id);
    let r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      p.invuln = 1e9;
      const kinds = new Set();
      let high = 0;
      for (let i = 0; i < 2400; i++) {
        c.step(1);
        for (const e of L.entities) if (e.alive && /kugel/.test(e.kind)) kinds.add(e.kind);
        high = Math.max(high, L.entities.filter((e) => e.kind === 'feuer_werfer' && e.tier === 'high').length);
      }
      p.invuln = 0;
      const ws = L.entities.filter((e) => e.kind === 'feuer_werfer');
      return { throws: ws.map((e) => e.throws), jumps: ws.map((e) => e.jumps), high, kinds: [...kinds], lit: L.named.get('siebenfeuer')?.lit };
    });
    console.log(`  Werfer: ${JSON.stringify(r)}`);
    check(`${id}: alle sieben Werfer werfen (${r.throws.join('/')}) und springen (${r.jumps.join('/')}, ${r.high} gleichzeitig oben), Geschosse ${r.kinds.join(', ')}, ${r.lit} Feuer brennen`,
      r.throws.length === 7 && r.throws.every((n) => n > 0) && r.jumps.every((n) => n > 0) && r.high >= 1 && r.lit === 7);
    await shot(`${id}_werfer`);
    for (const hero of HEROES) {
      await load(id);
      await W('place', R.start, { hero, settle: 2 });
      r = await sc(() => {
        const c = window.__course, L = c.level, W = window.__w7d, p = c.player;
        const out = { hits: [], lit: [] };
        const start = L.time;
        const fire = L.named.get('siebenfeuer');
        for (let n = 0; n < 12 && W.arch().left > 0; n++) {
          const e = L.entities.filter((x) => x.kind === 'feuer_werfer' && x.alive && !x.removed && !x.defeated).sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0];
          if (!e) break;
          const res = W.jumpOn(e, { safe: true, max: 3000 });
          c.step(4);
          out.hits.push({ id: e.spec.id, ok: res.ok, steps: res.steps, y: +e.pos.y.toFixed(1), left: W.arch().left });
          out.lit.push(fire.lit);
        }
        for (let i = 0; i < 400 && !W.arch().starTouch; i++) c.step(1);
        const star = L.entities.find((x) => x.kind === 'star' && x.alive);
        if (star) W.drive([{ to: [star.pos.x, star.pos.z], within: 0.2, run: true, max: 900 }], {});
        for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
        out.time = +(L.time - start).toFixed(1);
        out.finished = !!c.finished;
        out.got = !!L.runtime.stars[0];
        out.out = fire.out;
        out.save = W.save().levels?.['7-C'] ?? null;
        out.hurts = p.hurtTries ?? 0;
        return out;
      });
      console.log(`  ${hero} Kampf: ${JSON.stringify({ ...r, hits: r.hits.map((h) => `${h.id}@${h.y}:${h.ok ? h.steps : 'X'}`) })}`);
      check(`${id}: ${hero} besiegt alle sieben Werfer draufspringend (${r.hits.map((h) => `${h.id}@${h.y}`).join(', ')})`, r.hits.length === 7 && r.hits.every((h) => h.ok));
      check(`${id}: ${hero} – je besiegtem Werfer erlischt eine Feuerschale (${r.lit.join('→')})`, r.lit.join(',') === '6,5,4,3,2,1,0' && r.out === 7);
      check(`${id}: ${hero} Stern auf dem Siebenfeuer-Mosaik, Ziel nach ${r.time} s (< 100 s), gespeichert`, r.got && r.finished && r.time < 100 && r.save?.done === true);
      if (hero === HEROES[0]) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}w7d_${id}_ergebnis.png` }); }
    }
    // Tod setzt die Arena zurück (alle sieben Werfer neu, alle Feuer brennen wieder)
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w7d, p = c.player;
      for (const id of ['w1', 'w2']) { const e = L.entities.find((x) => x.spec?.id === id); if (e) W.jumpOn(e, { safe: true, max: 3000 }); }
      c.step(4);
      const before = W.arch().left, litBefore = L.named.get('siebenfeuer').lit;
      p.invuln = 0;
      p.die('fall');
      for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(30);
      return { before, litBefore, left: W.arch().left, lit: L.named.get('siebenfeuer').lit, n: L.entities.filter((x) => x.kind === 'feuer_werfer' && x.alive && !x.defeated && !x.removed).length };
    });
    check(`${id}: Tod setzt die Arena zurück (vorher noch ${r.before}, ${r.litBefore} Feuer; danach ${r.left}, ${r.n} Werfer, ${r.lit} Feuer)`, r.before === 5 && r.litBefore === 5 && r.left === 7 && r.n === 7 && r.lit === 7);
    // Wurfsichel aus dem ?-Block: sie besiegt einen Werfer von weitem
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w7d, p = c.player;
      W.place([-3, 2, 7.6], {});
      W.drive([{ to: [-3, 6.2], within: 0.15, run: false }, { hop: 20 }, { to: [-3, 8.2], within: 0.3, run: false }, { chaseKind: 'powerup', max: 900 }, { to: [-1.6, 8.8], within: 0.3, run: false }], {});
      const power = p.power;
      const e = L.entities.find((x) => x.spec?.id === 'w1');
      let k = 0, throws = 0;
      for (; k < 1200 && e.alive && !e.defeated && !e.removed; k++) {
        p.invuln = Math.max(p.invuln, 3);
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
        const act = d < 7 && d > 2.5 && dot > 0.96 && p.mode === 'ground' && k % 20 === 0;
        if (act) throws++;
        // auf 4–6 m Abstand halten (zu nah: zurück), sonst zum Werfer drehen und werfen
        const st = d > 6.6 ? W.stick(dx, dz, 0.8) : W.stick(dx, dz, dot < 0.96 ? 0.12 : 0);
        c.setInput({ ...st, action: act });
        c.step(1);
      }
      c.setInput({});
      return { power, defeated: !e.alive || e.defeated || e.removed, k, throws, d: +Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(1), left: W.arch().left };
    });
    check(`${id}: Wurfsichel aus dem ?-Block besiegt einen Werfer aus ${r.d} m (${r.power}, ${r.throws} Würfe, noch ${r.left})`, r.power === 'sichel' && r.defeated && r.left === 6 && r.d > 2.5);
    // Zeitlimit 100 s: Zeit um → Tod
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      const h = p.hurt; p.hurt = () => false;
      let dead = false, cause = null;
      for (let i = 0; i < 101 * 120 && !dead; i++) { c.step(1); if (p.dead) { dead = true; cause = p.deathCause; } }
      p.hurt = h;
      return { dead, cause, t: +L.time.toFixed(1) };
    });
    check(`${id}: nach 100 s ist die Zeit um (${r.cause} bei ${r.t} s)`, r.dead && r.cause === 'time');
  }

  // ------------------------------------------------ 7-Burg: Baron nur mit Kickbomben (ohne Wurfsichel), Abprall, Tod setzt zurück
  if (id === '7-Burg' && PARTS.has('boss') && !ONLY) {
    for (const hero of HEROES) {
      await load(id);
      await W('place', [0, 2, -204], { hero, settle: 4 });
      const r = await sc(() => {
        const c = window.__course, L = c.level, W = window.__w7d, p = c.player;
        const fight = W.baronFight({});
        const out = { fight };
        for (let i = 0; i < 900 && L.named.get('warp_sieg')?.hidden; i++) c.step(1);
        out.warp = !L.named.get('warp_sieg')?.hidden;
        const res = W.drive([{ warp: [3.5, -346] }, { to: [-4.6, -386.4], within: 0.8 }, { wait: 60 }, { to: [0, -392.4], within: 0.2 }], {});
        for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
        out.finished = !!c.finished;
        out.friend = L.named.get('kruemel')?.freed ?? L.entities.find((e) => e.kind === 'rescue_friend')?.freed;
        out.status = res.status;
        out.save = W.save().levels?.['7-Burg'] ?? null;
        return out;
      });
      const f = r.fight;
      console.log(`  ${hero} Boss: ${JSON.stringify({ ...r, save: undefined })}`);
      check(`${id}: ${hero} besiegt Baron Brummbär nur mit zurückgekickten Kickbomben (${f.bombHits}/9 Bomben-Treffer, ${f.gapJumps} Lückensprünge, ${f.time} s)`, f.state === 'gone' && f.bombHits === 9 && f.sichelTreffer === 0 && f.gapJumps >= 3);
      check(`${id}: ${hero} – Warp-Box nach dem Sieg, Krümel befreit, Zielmast, gespeichert`, r.warp && r.finished && r.save?.done === true);
      if (hero === HEROES[0]) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}w7d_${id}_ergebnis.png` }); }
    }
    // Draufspringen auf den Wagen: Abprall ohne Schaden; Tod im Kampf setzt den Baron zurück (9/9, wartet)
    await load(id);
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w7d, p = c.player, b = L.named.get('baron');
      W.place([0, 2, -204], {});
      W.baronFight({ stopAfterHits: 2 });
      const hp0 = b.hp, bounces0 = b.bounces ?? 0;
      // auf den Wagen springen (unverwundbar), bis ein Abprall gezählt ist
      for (let i = 0; i < 1200 && (b.bounces ?? 0) === bounces0 && !p.dead; i++) {
        p.invuln = Math.max(p.invuln, 3);
        const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        c.setInput({ ...(p.mode === 'air' ? W.airSteer(b.pos.x, b.pos.z, b.vel?.x ?? 0, b.vel?.z ?? 0, 4, 9) : W.stick(dx, dz, 1)), jump: p.mode === 'ground' ? d < 4 : p.vel.y > 0, run: true });
        c.step(1);
      }
      const after = { hp: b.hp, bounces: (b.bounces ?? 0) - bounces0 };
      p.invuln = 0;
      p.die('fall');
      for (let i = 0; i < 900 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(30);
      return { hp0, after, hp: b.hp, state: b.state, pos: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)], bombs: L.entities.filter((e) => e.kind === 'kickbombe' && !e.removed).length };
    });
    console.log(`  Abprall/Tod: ${JSON.stringify(r)}`);
    check(`${id}: Draufspringen auf den Kampfwagen prallt ab ohne Schaden (${r.hp0} → ${r.after.hp}, Abpraller ${r.after.bounces})`, r.after.bounces >= 1 && r.after.hp === r.hp0);
    check(`${id}: Tod im Kampf setzt den Baron zurück (vorher ${r.hp0}/9, danach ${r.hp}/9, ${r.state}, Neustart bei z ${r.pos[1]}, Bomben ${r.bombs})`, r.hp0 === 7 && r.hp === 9 && r.state === 'wait' && r.pos[1] > -212 && r.pos[1] < -198 && r.bombs === 0);
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

