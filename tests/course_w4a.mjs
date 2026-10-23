// Welt 4, Level 4-1 „Kribbelkrabbel-Schlucht“ (Canyon, Ameisen an Wänden, Stachelfeld) und 4-2 „Das Lila Nebelmoor“
// (Giftsumpf, Rankenschnapper, Welt-Warp): Laden ohne Konsolenfehler/-warnungen, Gegnerzahlen, Routen-Bot (Lotti und
// Greta von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel mit der echten
// Mechanik (Ameise trägt die Figur eine Wand hinauf bzw. waagerecht an der Wand über die Schlucht, Riesenameisen tragen
// über das Stachelfeld ohne Stachelkontakt, Krallen-Anzug an der Kletterwand; Rankenschnapper als Stufen, Abprall vom
// Kopf, Sternring mit acht Sternmünzen, Welt-Warp-Röhre hinter dem Giftwasserfall), Extras (Extraleben-Geheimnisse,
// Funkelstern, endloser Strom), Zeit bis zum Ziel, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass,
// Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w4a_*.png).
// Aufruf (nach npm run build): PORT_BASE=5000 node tests/course_w4a.mjs [4-1|4-2]
//   PARTS=route,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras
//   mit diesem Namensteil) · SHOTS_ONLY=1 · VERBOSE=1 (Protokoll der Beine)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist während der
// Fahrt unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Treffer-Versuche
// (player.hurt) und Stachelkontakt werden trotzdem gezählt und bei den Mechanik-Prüfungen ausgewertet.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const Y = 1, WS = 0, U = 5, LB = -6;   // 4-1 Boden; 4-2 Seespiegel, Oberland, Seegrund
// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land } · { wait } ·
// { hop } (Sprung auf der Stelle) · { stomp } · { crouch } (Röhre) · { push, jump, dir } (Kletterwand drücken) ·
// { star: i } · { chaseKind } · { expect: Bedingung } (COND) ·
// { board: [Ameisen-Ids], wait: [x, z], fy: [y0, y1] (Fußhöhe der Ameise beim Absprung), wall, zr: [z0, z1], reach } ·
// { ride: true, top: y | z: z | x: x } (auf der Ameise mitfahren bis Oberseite/Ort) ·
// { giant: [x, z] } (Warteplatz am Stachelfeld; auf das nächste Lastdeck springen) · { onDeck: true, z: z | cond } ·
// { bounceOn: id } (auf den Kopf eines Rankenschnappers springen) · { ringRun: id } (Sternring: alle Sternmünzen)
const ROUTES = {
  '4-1': {
    start: [0, Y, 8],
    meta: { stars: 3, time: 400, theme: 'canyon', music: 'course_canyon' },
    enemies: { ameisensoldat: 41, ameisensoldat_horn: 23, riesenameise_strom: 1 },
    main: [
      { name: 'Wüstenstart', to: [0, -8] },
      { to: [-1.2, -19] },
      { name: 'Kolonne queren', to: [-1.2, -26.6], jump: 30, jumpAt: 3.4 },
      { name: 'Spalte', to: [0, -34.4], jump: 34, jumpAt: 4.6 },
      { name: 'Höhle', to: [-3, -43.6] },
      { name: 'Warteplatz Ameisenwand', to: [-0.86, -48.62], within: 0.15, run: false },
      { name: 'Ameise an der Wand', board: ['w1b'], wait: [-0.86, -48.62], face: [0, 0, 1], fy: [Y + 0.25, Y + 0.9], reach: 1.6 },
      { name: 'hinauf getragen', ride: true, top: Y + 6.3 },
      { to: [null, -50.4], within: 0.25, run: false, rel: true },
      { name: 'hinab', to: [-3, -54], run: false },
      { name: 'Fähre', to: [-5.7, -61.2], within: 0.2, run: false },
      { name: 'Ameise an der Seitenwand', board: ['faehre_l'], wait: [-5.7, -61.2], fy: [Y + 0.3, Y + 0.6], sdir: 1, near: [0.9, 2.2], reach: 2.4, steerAt: 6 },
      { name: 'über die Schlucht getragen', ride: true, z: -77.2 },
      { name: 'abspringen', to: [-4, -79.4], jump: 16, within: 0.4 },
      { name: 'Ausgang', to: [0, -97] },
      { name: 'Checkpoint', to: [0, -110] },
      { name: 'Hörner 1', to: [0, -121.6], jump: 30, jumpAt: 3.2 },
      { to: [-1, -132.4] },
      { name: 'Hörner 3', to: [-1, -139.6], jump: 30, jumpAt: 2.8 },
      { name: 'Mauer 1', to: [-2.5, -146.8], jump: 30, jumpAt: 2.8 },
      { name: 'Mauer 2', to: [-2.5, -153.6], jump: 30, jumpAt: 2.8 },
      { name: 'Stachelfeld-Rand', to: [5.2, -157.3], within: 0.25, run: false },
      { name: 'aufs Lastdeck', giant: [5.2, -157.3] },
      { name: 'über die Stacheln getragen', onDeck: true, z: -210.6 },
      { name: 'aufs Endsims', to: [-4.6, -215.8], jump: 30, within: 0.5 },
      { name: 'Zielröhre', to: [3.2, -219.6], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Zielmast', to: [0, -250.8], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug, Kletterwand hinauf zum Sims', star: 0, from: [-2, Y, -98.6],
        legs: [{ to: [-4.6, -100.6], within: 0.12, run: false, slow: 0.5 }, { wait: 30 }, { hop: 20 }, { wait: 60 }, { to: [-8.4, -100.6], within: 0.3, run: false },
          { to: [-4.6, -100.6], jump: 34, jumpAt: 2.9, within: 0.35, run: false }, { wait: 10 }, { expect: 'krallen' },
          { to: [-9.2, -101.8], within: 0.3, run: false }, { push: 220, jump: 12, dir: [0, -1] }, { to: [-9.2, -106.4], within: 0.4, run: false }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Krallen (Rückwärtssalto vor der Wand)', star: 0, expectNot: true, from: [-9.2, Y, -101.2], heroes: ['lotti'],
        legs: [{ to: [-9.2, -102.2], within: 0.2, run: false }, { push: 220, jump: 40, dir: [0, -1] }, { wait: 60 }] },
      { name: 'Stern 1: Riesenameise → Felsinsel → Röhre → Ameisenraum, Ameise trägt auf den Vorratsturm', star: 1, from: [5.2, Y, -157.3],
        legs: [{ giant: [5.2, -157.3] }, { onDeck: true, z: -180.2 }, { to: [-6.1, -182], jump: 30, within: 0.3, run: false }, { crouch: 4 }, { expect: 'raum' },
          { to: [68.54, -186.65], within: 0.15, run: false }, { board: ['vorrat1'], wait: [68.54, -186.65], face: [0, 0, 1], fy: [Y + 0.25, Y + 0.9], reach: 1.6 },
          { ride: true, top: Y + 6.1 }, { star: 1 }], shot: 'stern1', mech: { carried: true, noSpikes: true } },
      { name: 'Stern 2: vom Lastdeck auf die Felssäule am Ende des Stachelfelds', star: 2, from: [5.2, Y, -157.3],
        legs: [{ giant: [5.2, -157.3] }, { onDeck: true, z: -198.8 }, { to: [3.4, -201.5], jump: 30, within: 0.35, run: false }, { wait: 20 }, { star: 2 }], shot: 'stern2', mech: { noSpikes: true } },
      { name: 'Stempel: Ameise trägt den Stempelturm hinauf', stamp: true, from: [0, Y, -52.6],
        legs: [{ to: [3.05, -57.12], within: 0.15, run: false }, { board: ['turm1'], wait: [3.05, -57.12], face: [0, 0, 1], fy: [Y + 0.25, Y + 0.9], reach: 1.6 },
          { ride: true, top: Y + 10.4 }, { to: [4.5, -58.5], within: 0.3, run: false, slow: 0.5 }, { hop: 30 }, { wait: 20 }], shot: 'stempel', mech: { carried: true } },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über dem großen Ameisenhügel', from: [-7, Y, 3.6], heroes: ['lotti'],
        legs: [{ to: [-7, 0], jump: 30, within: 0.25, run: false }, { hop: 30 }, { wait: 60 }, { chaseKind: 'powerup', max: 1200 }], expectLives: 1 },
      { name: 'Funkelstern auf der Plattform', from: [1.6, Y, -131.4], heroes: ['lotti'],
        legs: [{ to: [3.6, -131.4], jump: 20, within: 0.4 }, { chaseKind: 'powerup', max: 900 }, { expect: 'stern' }] },
      { name: 'Ameisenwand: ohne Ameise nicht hinauf (Rückwärtssalto)', from: [-2.3, Y, -47.6], heroes: ['lotti'], expectBelow: Y + 6,
        legs: [{ to: [-2.3, -48.2], within: 0.2, run: false }, { push: 200, jump: 40, dir: [0, -1] }, { wait: 40 }] },
      { name: 'Riesenameisen-Strom: endlos aus der Höhle', from: [0, Y, -152], heroes: ['lotti'],
        legs: [{ wait: 2400 }, { expect: 'stromEndlos' }] },
    ],
    shots: [
      ['start', [0, Y, 8]],
      ['lagerfeuer', [4, Y, 1.6], 0, null, Math.PI * 0.8],
      ['kolonne', [0, Y, -18]],
      ['hoehle', [-3, Y, -40]],
      ['ameisenwand', [-2.3, Y, -46.6], 220],
      ['turm', [-1, Y, -53]],
      ['schlucht', [-4.9, Y, -60.6], 120],
      ['ausgang', [0, Y, -90]],
      ['sims', [-4, Y, -99]],
      ['hoerner', [0, Y, -112]],
      ['funkelstern', [1, Y, -128]],
      ['mauern', [0, Y, -140.5]],
      ['stachelfeld', [5, Y, -157]],
      ['insel', [-2.6, Y + 0.3, -176]],
      ['saeule', [1, Y + 0.3, -196]],
      ['endsims', [0, Y, -216]],
      ['ziel', [0, Y + 5, -240]],
      ['ameisenraum', [70, Y, -181]],
    ],
  },
  '4-2': {
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'poison', music: 'course_poison' },
    enemies: { rankenschnapper: 26, brummer: 3 },
    main: [
      { name: 'Start', to: [0, -5] },
      { name: 'Giftpfad', to: [0, -15.6] },
      { to: [-7.4, -17.6] },
      { to: [-7.4, -33] },
      { to: [3, -34.2] },
      { to: [3, -45.4] },
      { to: [0, -50] },
      { name: 'Höhle', to: [-3, -62] },
      { to: [-3, -98] },
      { name: 'Checkpoint', to: [0, -104.4] },
      { name: 'Brücke', to: [0, -125] },
      { name: 'Insel 1', to: [0, -134], jump: 24, jumpAt: 3.6 },
      { to: [-1.4, -135.4], within: 0.4 },
      { name: 'Insel 2', to: [-4.6, -141.8], jump: 34, jumpAt: 5.4 },
      { to: [-3.4, -143.8], within: 0.4 },
      { name: 'Insel 3', to: [2.8, -150.2], jump: 34, jumpAt: 6.6 },
      { to: [1.6, -152.4], within: 0.4 },
      { name: 'Insel 4', to: [-3.4, -159.2], jump: 34, jumpAt: 6.6 },
      { to: [-2.2, -161.4], within: 0.4 },
      { name: 'Insel 5', to: [0.4, -168.6], jump: 34, jumpAt: 6.2 },
      { name: 'Röhre hinauf', to: [2, -175.4], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Oberland', to: [0, -190.6], within: 0.3, run: false },
      { name: 'Plattform 1', mover: 'mp1', when: { axis: 'z', gt: -196 }, until: { axis: 'z', lt: -203.1 } },
      { name: 'Plattform 2', mover: 'mp2', when: { axis: 'x', lt: 0.4 }, until: { axis: 'x', gt: 6.3 }, run: false },
      { name: 'Rastinsel', to: [7.4, -212], jump: 24, within: 0.5, run: false },
      { to: [6.6, -213.8], within: 0.3, run: false },
      { name: 'Plattform 3', mover: 'mp3', when: { axis: 'x', gt: 6.1 }, until: { axis: 'x', lt: -2.3 }, run: false },
      { name: 'Plattform 4', mover: 'mp4', when: { axis: 'z', gt: -221 }, until: { axis: 'z', lt: -227.1 }, run: false },
      { name: 'Sternring-Insel', to: [-4.4, -231.2], jump: 24, within: 0.6, run: false },
      { name: 'Zielröhre', to: [3, -235.6], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Zielmast', to: [0, -259.8], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: vier Rankenschnapper als Stufen zur Warp-Box zwischen zwei hängenden → Sternkammer', star: 0, from: [0.2, Y, -73],
        legs: [{ to: [3.4, -74.4], jump: 24, within: 0.35, run: false }, { wait: 10 }, { to: [3.6, -76.8], jump: 30, within: 0.35, run: false }, { wait: 10 },
          { to: [3.8, -79.2], jump: 30, within: 0.35, run: false }, { wait: 10 }, { to: [4, -81.6], jump: 30, within: 0.35, run: false }, { wait: 10 },
          { to: [4.4, -84.4], jump: 30, within: 0.4, run: false }, { to: [6.2, -85.8], jump: 20, within: 0.3, run: false }, { wait: 20 }, { expect: 'kammer' }, { star: 0 }],
        shot: 'stern0', mech: { vines: 4 } },
      { name: 'Stern 0 nicht ohne Ranken (Sprung vom Weg zum Sims)', star: 0, expectNot: true, from: [0.6, Y, -82], heroes: ['lotti'],
        legs: [{ to: [3.4, -84.6], jump: 40, within: 0.4, max: 300 }, { wait: 60 }] },
      { name: 'Stern 1: ganz unten im Moorsee', star: 1, from: [-3.4, WS + 0.6, -142.6],
        legs: [{ to: [-1.6, -143], run: false }, { dive: [4.4, -141.6], y: LB + 0.4, within: 0.6 }, { star: 1 }, { swimOut: [3, -150] }], shot: 'stern1' },
      { name: 'Stempel: vom Rankenschnapper abprallen, versteckter Münzpfad über die Felssimse', stamp: true, from: [8.2, WS + 0.6, -141.6],
        legs: [{ to: [8.2, -141.4], within: 0.3, run: false }, { bounceOn: 'rs_abprall', to: [10.7, -147.2] }, { wait: 10 },
          { to: [10.7, -153.9], jump: 30, within: 0.4, run: false }, { to: [10.4, -160.2], jump: 30, within: 0.4, run: false }, { hop: 30 }, { wait: 20 }], shot: 'stempel', mech: { bounce: true } },
      { name: 'Stempel-Sims nicht ohne Abprall (Sprung vom Inselchen)', stamp: true, expectNot: true, from: [8.2, WS + 0.6, -142.6], heroes: ['lotti'],
        legs: [{ to: [10.7, -147.2], jump: 40, within: 0.4, max: 300 }, { wait: 60 }, { expect: 'nichtAufSims' }] },
      { name: 'Stern 2: Sternring – acht Sternmünzen in 10 s', star: 2, from: [-5.4, U, -228.6],
        legs: [{ to: [-5.4, -233.4], within: 0.5 }, { chaseKind: 'sternmuenze', max: 1300 }, { wait: 60 }, { star: 2 }], shot: 'stern2' },
    ],
    extra: [
      { name: 'Welt-Warp: Roulette-Block (Krallen-Anzug), Felswand hinauf, Plattformen, hinter dem Giftwasserfall die Röhre nach Welt 5', from: [-4.6, U, -184.2], expectWarp: 5,
        legs: [{ to: [-4.6, -186.4], within: 0.12, run: false, slow: 0.5 }, { wait: 20 }, { roulette: { item: 'krallen' } }, { wait: 60 },
          { to: [-1.2, -186.4], within: 0.3, run: false }, { to: [-4.6, -186.4], jump: 34, jumpAt: 2.9, within: 0.35, run: false }, { wait: 10 }, { expect: 'krallen' },
          { to: [-7.6, -186.5], within: 0.3, run: false }, { push: 220, jump: 12, dir: [-1, 0] }, { to: [-12.6, -186.5], within: 0.4, run: false },
          { name: 'Warp-Plattform 1', mover: 'warp1', when: { axis: 'x', gt: -16.2 }, until: { axis: 'x', lt: -20.5 }, run: false },
          { name: 'Warp-Plattform 2', mover: 'warp2', when: { axis: 'x', gt: -24.2 }, until: { axis: 'x', lt: -26.5 }, run: false },
          { name: 'durch den Vorhang', to: [-29.6, -186.5], jump: 20, within: 0.4, run: false }, { to: [-33.2, -186.5], jump: 30, within: 0.25, run: false }, { crouch: 4 }, { wait: 30 }] },
      { name: 'Extraleben: Rankenschnapper auf der Röhre mit Stampfattacke besiegen, Röhre → Moorkeller', from: [6, Y, -48], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [9.2, -48], within: 0.3, run: false }, { poundAt: 'rs_roehre' }, { wait: 90 }, { expect: 'roehreFrei' }, { to: [10, -48], jump: 30, within: 0.25, run: false }, { crouch: 4 },
          { expect: 'keller' }, { chaseKind: 'powerup', max: 1500 }] },
      { name: 'Röhre versperrt: auf dem Kopf des Rankenschnappers nur Abprall', from: [6, Y, -48], heroes: ['lotti'],
        legs: [{ to: [9.2, -48], within: 0.3, run: false }, { to: [10, -48], jump: 30, within: 0.25, run: false, max: 240 }, { crouch: 4 }, { wait: 30 }, { expect: 'nichtImKeller' }] },
      { name: 'Großer Rankenschnapper: drei Stampfattacken auf den Kopf', from: [0, Y, -113], heroes: ['lotti'],
        legs: [{ until: 'grossDa', max: 1200 }, { poundAt: 'rs_gross' }, { wait: 70 }, { until: 'grossDa', max: 1200 }, { poundAt: 'rs_gross' }, { wait: 70 }, { until: 'grossDa', max: 1200 }, { poundAt: 'rs_gross' }, { wait: 70 }, { expect: 'grossBesiegt' }] },
    ],
    shots: [
      ['start', [0, Y, 6]],
      ['huette', [-4, Y, 4], 0, null, Math.PI * 0.8],
      ['giftpfad', [-7.4, Y, -24]],
      ['roehre', [6, Y, -48]],
      ['hoehle', [-3, Y, -64]],
      ['stufen', [0.2, Y, -73]],
      ['warpbox', [4.6, Y + 6.2, -84.4]],
      ['rueckkehr', [0, Y, -106]],
      ['grosser', [0, Y, -110], 240],
      ['see', [0, WS + 0.6, -133.4]],
      ['abprall', [8.2, WS + 0.6, -141.6]],
      ['simse', [10.6, WS + 6.2, -153.8]],
      ['hinauf', [0.4, WS + 0.6, -170]],
      ['oberland', [0, U, -186]],
      ['warpweg', [-12.6, U + 7, -186.5], 0, null, Math.PI],
      ['vorhang', [-29.4, U + 7, -186.5], 0, null, Math.PI],
      ['plattformen', [0, U, -191.4]],
      ['sternring', [-2, U, -230]],
      ['ziel', [0, U + 3.5, -250]],
      ['sternkammer', [70, Y, -75]],
      ['moorkeller', [69, Y, -41]],
    ],
  },
};

const PORT = 4412;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'route,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  // Treffer-Versuche zählen (auch wenn die Figur unverwundbar ist)
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? (src?.spikes ? 'stacheln' : String(src)); return orig(src); };
  };
  wrapHurt();
  const COND = {
    krallen: () => P().power === 'krallen',
    stern: () => P().power === 'stern',
    raum: () => P().pos.x > 55,
    stromEndlos: () => { const s = L.entities.find((e) => e.kind === 'riesenameise_strom'); return !!s && s.spawned > 16 && s.aliveCount >= 6; },
    kammer: () => P().pos.x > 55 && P().pos.z < -60,
    keller: () => P().pos.x > 55 && P().pos.z > -55,
    nichtImKeller: () => P().pos.x < 30,
    roehreFrei: () => !!L.named.get('rs_roehre')?.defeated,
    nichtAufSims: () => P().pos.y < 4,
    grossDa: () => { const e = L.named.get('rs_gross'); return !!e && !e.defeated && e.grow > 0.98 && e.state !== 'hit'; },
    grossBesiegt: () => !!L.named.get('rs_gross')?.defeated,
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
    deckOf(a) {
      const sh = a.deckId !== null && a.deckId !== undefined ? L.world.get(a.deckId) : null;
      if (!sh) return null;
      const mn = Array.isArray(sh.min) ? { x: sh.min[0], y: sh.min[1], z: sh.min[2] } : sh.min, mx = Array.isArray(sh.max) ? { x: sh.max[0], y: sh.max[1], z: sh.max[2] } : sh.max;
      return { x: (mn.x + mx.x) / 2, z: (mn.z + mx.z) / 2, top: mx.y, vx: a.mover?.vx ?? 0, vz: a.mover?.vz ?? 0 };
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { carried: 0, wallRide: 0, maxRideY: -99, spikes: 0, deckSteps: 0, hurts: 0, vines: [], bounces: 0, poison: 0 };
      const vineSet = new Set();
      let curAnt = null, curGiant = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.mode === 'ground' && p.ground?.spikes) mech.spikes++;
        if (p.mode === 'ground' && p.ground?.owner?.kind === 'rankenschnapper') vineSet.add(p.ground.owner.spec?.id ?? '?');
        if (p.dead && p.deathCause === 'lava') mech.poison++;
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
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
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to && !Lg.board) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.stomp) {
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.push) {
          const holdJ = Lg.jump ?? 0;
          for (let k = 0; k < Lg.push; k++) tick({ ...this.stick(Lg.dir[0], Lg.dir[1]), run: false, jump: k < holdJ });
          log.push([Lg.name ?? `drücken${li}`, Lg.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Ameise an einer Wand besteigen
        if (Lg.board) {
          const ants = Lg.board.map((id) => L.named.get(id)).filter(Boolean);
          let on = false, tries = 0, k = 0;
          const max = Lg.max ?? 6000;
          goTo(Lg.wait[0], Lg.wait[1]);
          for (; k < max && !on && !p.dead; k++) {
            let a = null;
            for (const e of ants) {
              if (!e.alive || e.defeated || e.removed || e.boxId === null) continue;
              if (Lg.face && e.normal.x * Lg.face[0] + e.normal.y * Lg.face[1] + e.normal.z * Lg.face[2] < 0.9) continue;
              if (e.foot.y < Lg.fy[0] || e.foot.y > Lg.fy[1]) continue;
              if (Lg.sdir && e.sdir !== Lg.sdir) continue;
              if (Lg.zr && (e.foot.z > Lg.zr[0] || e.foot.z < Lg.zr[1])) continue;
              const cx = (e.box.min.x + e.box.max.x) / 2, cz = (e.box.min.z + e.box.max.z) / 2;
              const d = Math.hypot(cx - p.pos.x, cz - p.pos.z);
              if (d > (Lg.reach ?? 2.8)) continue;
              // an der Wand: Ameise steigt; auf der Bahn: Ameise kommt auf die Figur zu (Abstand near)
              if (Lg.face && Math.abs(Lg.face[1]) < 0.5 && Lg.up !== false && (e.mover?.vy ?? 0) < 0.2) continue;
              if (Lg.near && (d < Lg.near[0] || d > Lg.near[1] || ((p.pos.x - cx) * (e.mover?.vx ?? 0) + (p.pos.z - cz) * (e.mover?.vz ?? 0)) < 0)) continue;
              a = e; break;
            }
            if (!a) { tick({}); continue; }
            tries++;
            // Sprung: erst senkrecht steigen (Rumpf nicht seitlich in die Ameise), nahe dem Scheitel über den Rücken lenken
            let j = 0, left = false;
            for (; j < 220; j++) {
              const cx = (a.box.min.x + a.box.max.x) / 2, cz = (a.box.min.z + a.box.max.z) / 2;
              const rising = p.vel.y > (Lg.steerAt ?? 6);
              const st = p.mode === 'air' && !rising ? this.airSteer(cx, cz, a.mover?.vx ?? 0, a.mover?.vz ?? 0) : { x: 0, y: 0 };
              tick({ ...st, jump: j < 30, run: false });
              if (p.mode === 'air') left = true;
              if (a.riding(p)) { on = true; break; }
              if (left && p.mode === 'ground') break;
            }
            log.push(['Absprung', a.spec?.id ?? '?', on, j, +a.foot.y.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.hurtTries]);
            if (!on) { if (tries > 6) break; goTo(Lg.wait[0], Lg.wait[1]); }
            else curAnt = a;
          }
          if (!on) log.push(['FEHLER: Ameise nicht bestiegen', Lg.board.join(',')]);
          continue;
        }
        if (Lg.ride) {
          const a = curAnt;
          let k = 0, rode = 0;
          const y0 = p.pos.y;
          const max = Lg.max ?? 3000;
          for (; k < max && a; k++) {
            if (p.dead) break;
            if (a.riding(p)) { rode++; mech.carried++; if (a.onWall) mech.wallRide++; }
            mech.maxRideY = Math.max(mech.maxRideY, p.pos.y);
            if (Lg.top !== undefined && a.normal.y > 0.9 && p.pos.y > Lg.top) break;
            if (Lg.z !== undefined && a.foot.z < Lg.z) break;
            if (!a.riding(p) && p.mode === 'ground') { log.push(['FEHLER: von der Ameise gefallen', k]); break; }
            tick({});
          }
          log.push([Lg.name ?? 'mitgefahren', k, rode, +y0.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), JSON.stringify(a?.info?.())]);
          if (k >= max) log.push(['FEHLER: Fahrt endet nicht']);
          continue;
        }
        // ------------------------------------------------ Riesenameise (Lastdeck) besteigen und mitfahren
        if (Lg.giant) {
          goTo(Lg.giant[0], Lg.giant[1]);
          let on = false, k = 0, tries = 0;
          for (; k < 4000 && !on && !p.dead; k++) {
            let a = null;
            for (const e of L.entities) {
              if (e.kind !== 'riesenameise' || e.removed || e.state === 'leave' || e.scale < 0.95) continue;
              const d = this.deckOf(e);
              if (!d) continue;
              // Deck kommt von rechts (−X) entlang z ≈ −160,6: abspringen, wenn es knapp rechts vor der Figur ist
              if (d.z < -161.6 || d.z > -159.4) continue;
              const ahead = d.x - p.pos.x;
              if (ahead < 0.6 || ahead > 2.6) continue;
              a = e; break;
            }
            if (!a) { tick({}); continue; }
            tries++;
            let j = 0, left = false;
            for (; j < 220; j++) {
              const d = this.deckOf(a);
              if (!d) break;
              tick({ ...(p.mode === 'air' ? this.airSteer(d.x, d.z, d.vx, d.vz) : this.stick(d.x - p.pos.x, d.z - p.pos.z)), jump: j < 24, run: false });
              if (p.mode === 'air') left = true;
              if (p.mode === 'ground' && p.ground?.owner === a) { on = true; break; }
              if (left && p.mode === 'ground') break;
            }
            log.push(['aufs Deck', on, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
            if (on) curGiant = a; else { if (tries > 5) break; goTo(Lg.giant[0], Lg.giant[1]); }
          }
          if (!on) log.push(['FEHLER: nicht aufs Lastdeck']);
          continue;
        }
        if (Lg.onDeck) {
          const a = curGiant;
          let k = 0;
          for (; k < 6000 && a; k++) {
            if (p.dead) break;
            const d = this.deckOf(a);
            if (!d) { log.push(['FEHLER: Deck verschwunden', k]); break; }
            if (p.mode === 'ground' && p.ground?.owner === a) mech.deckSteps++;
            if (Lg.z !== undefined && a.pos.z < Lg.z) break;
            const dx = d.x - p.pos.x, dz = d.z - p.pos.z, dd = Math.hypot(dx, dz);
            tick(dd > 0.25 ? { ...this.stick(dx, dz, Math.min(0.5, dd)), run: false } : {});
            if (p.mode === 'ground' && p.ground?.owner !== a) { log.push(['FEHLER: vom Deck gefallen', k, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]); break; }
          }
          log.push([Lg.name ?? 'auf dem Deck', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), mech.spikes]);
          continue;
        }
        if (Lg.until && !Lg.to && !Lg.mover) {
          let k = 0;
          for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({});
          log.push(['bis', Lg.until, k]);
          continue;
        }
        // ------------------------------------------------ bewegliche Plattform: abwarten, aufspringen, mitfahren
        if (Lg.mover) {
          const m = L.named.get(Lg.mover);
          const ok = () => { const v = Lg.when.axis === 'x' ? m.pm.pos.x : m.pm.pos.z; return (Lg.when.lt === undefined || v < Lg.when.lt) && (Lg.when.gt === undefined || v > Lg.when.gt); };
          let k = 0;
          for (; k < 3000 && !ok(); k++) tick({});
          let j = 0, on = false, left = false;
          for (; j < 260; j++) {
            const mv = m.mover ?? { vx: 0, vz: 0 };
            const tx = m.pm.pos.x, tz = m.pm.pos.z;
            const st = p.mode === 'air' ? this.airSteer(tx, tz, mv.vx ?? 0, mv.vz ?? 0, 2.8, 9) : this.stick(tx - p.pos.x, tz - p.pos.z);
            tick({ ...st, jump: j < (Lg.jump ?? 26), run: Lg.run ?? true });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') { on = p.ground?.mover === m.mover || p.ground === m.shape; break; }
          }
          log.push([Lg.name ?? `auf ${Lg.mover}`, k, j, on, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) { log.push(['FEHLER: nicht auf der Plattform', Lg.mover]); break; }
          if (Lg.until) {
            const done = () => { const v = Lg.until.axis === 'x' ? m.pm.pos.x : m.pm.pos.z; return (Lg.until.lt === undefined || v < Lg.until.lt) && (Lg.until.gt === undefined || v > Lg.until.gt); };
            let r = 0;
            for (; r < 3000 && !done() && !p.dead; r++) {
              const dx = m.pm.pos.x - p.pos.x, dz = m.pm.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              tick(d > 0.2 ? { ...this.stick(dx, dz, Math.min(0.5, d)), run: false } : {});
              if (p.mode === 'ground' && p.ground !== m.shape && p.ground?.mover !== m.mover) { log.push(['FEHLER: von der Plattform gefallen', Lg.mover]); break; }
            }
          }
          continue;
        }
        // ------------------------------------------------ Roulette-Block: warten, bis das Symbol passt, dann stoßen
        if (Lg.roulette) {
          const b = L.named.get(Lg.roulette.id) ?? L.entities.find((e) => e.kind === 'roulette_block');
          let k = 0;
          for (; k < 4000; k++) {
            if (b.used) break;
            const frac = b.clock ? (((b.clock.beat / b.beats) % 1) + 1) % 1 : 0;
            const want = b.item === Lg.roulette.item && frac < 0.3;
            if (want) {
              for (let q = 0; q < 22; q++) tick({ jump: true });
              for (let q = 0; q < 200 && p.mode !== 'ground'; q++) tick({});
              if (b.used) break;
            } else tick({});
          }
          log.push(['Roulette', k, b.used, b.given ?? b.item]);
          if (!b.used || (b.given && b.given !== Lg.roulette.item)) log.push(['FEHLER: Roulette', b.given ?? b.item]);
          continue;
        }
        // ------------------------------------------------ tauchen (Tiefe y) bzw. hinausschwimmen
        if (Lg.dive) {
          let k = 0;
          for (; k < (Lg.max ?? 2400); k++) {
            if (p.dead) break;
            const dx = Lg.dive[0] - p.pos.x, dz = Lg.dive[1] - p.pos.z, d = Math.hypot(dx, dz);
            if (d < (Lg.within ?? 0.8) && Math.abs(p.pos.y - Lg.y) < 0.8) break;
            let dc = { crouch: false, jump: false };
            if (p.mode === 'swim') {
              if (p.pos.y > Lg.y + 0.35) dc = { crouch: true, jump: false };
              else if (p.pos.y < Lg.y - 0.4) dc = { crouch: false, jump: (k % 26) < 3 };
            }
            tick({ ...(d > 0.3 ? this.stick(dx, dz, Math.min(1, d)) : {}), ...dc, run: false });
          }
          log.push([Lg.name ?? 'tauchen', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          continue;
        }
        if (Lg.swimOut) {
          let k = 0;
          for (; k < 1500; k++) {
            if (p.dead) break;
            const dx = Lg.swimOut[0] - p.pos.x, dz = Lg.swimOut[1] - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && d < 0.6) break;
            if (p.mode === 'swim') {
              const head = (p.water?.top ?? 0) - (p.pos.y + p.half.y * 2);
              tick({ ...this.stick(dx, dz, 1), jump: d < 4.5 ? (k % 30) < 22 : (head > 0.2 && (k % 26) < 3), run: false });
            } else tick({ ...this.stick(dx, dz, Math.min(1, d)), jump: p.mode === 'air' && p.vel.y > 0, run: false });
          }
          log.push([Lg.name ?? 'hinaus', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          if (k >= 1500) log.push(['FEHLER: nicht aus dem Wasser']);
          continue;
        }
        // ------------------------------------------------ vom Kopf eines Rankenschnappers abprallen, zum Ziel lenken
        if (Lg.bounceOn) {
          const e = L.named.get(Lg.bounceOn);
          const b0 = e.bounces;
          let k = 0, bounced = false, left = false;
          for (; k < 600; k++) {
            if (p.dead) break;
            const tgt = bounced ? Lg.to : [e.headC.x, e.headC.z];
            const st = p.mode === 'air' ? (bounced || p.vel.y < 4 ? this.airSteer(tgt[0], tgt[1], 0, 0, 2.6, 8) : { x: 0, y: 0 }) : this.stick(tgt[0] - p.pos.x, tgt[1] - p.pos.z, 0.6);
            tick({ ...st, jump: (k < 24) || bounced || p.vel.y > 0, run: false });
            if (p.mode === 'air') left = true;
            if (!bounced && e.bounces > b0) { bounced = true; mech.bounces++; }
            if (left && p.mode === 'ground' && k > 30) break;
          }
          log.push(['Abprall', Lg.bounceOn, bounced, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced) log.push(['FEHLER: kein Abprall']);
          continue;
        }
        if (Lg.poundAt) {
          let k = 0, pounding = false;
          const tgt = () => (typeof Lg.poundAt === 'string' ? (() => { const e = L.named.get(Lg.poundAt); return [e.headC.x, e.headC.z]; })() : Lg.poundAt);
          for (; k < 300; k++) {
            const [tx2, tz2] = tgt();
            const dx = tx2 - p.pos.x, dz = tz2 - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.35 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx2, tz2, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 26, run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
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
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
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
      mech.vines = [...vineSet];
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: dist > 1.5 || o.run, jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => L.named.get(id)?.info?.() ?? null,
    worldWarp: () => c.worldWarp ?? null,
  };
  window.__w4 = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w4[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w4a_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, stars: d.stars.length }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}`, meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of SHOTS_ONLY || ONLY || !PARTS.has('route') ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (id === '4-1') {
      check(`${id}: ${hero} – Ameisen tragen die Figur (Wand hinauf bis ${res.mech.maxRideY.toFixed(1)} m, ${res.mech.wallRide} Schritte an Wänden)`, res.mech.wallRide > 400 && res.mech.maxRideY > Y + 6);
      check(`${id}: ${hero} – Riesenameisen über das Stachelfeld ohne Stachelkontakt (${res.mech.deckSteps} Schritte auf Decks, ${res.mech.spikes} auf Stacheln)`, res.mech.deckSteps > 2000 && res.mech.spikes === 0);
    }
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of SHOTS_ONLY || !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech?.carried && !(res.mech.carried > 200)) ok = false;
      if (t.mech?.noSpikes && res.mech.spikes > 0) ok = false;
      if (t.mech?.vines && res.mech.vines.length < t.mech.vines) ok = false;
      if (t.mech?.bounce && !(res.mech.bounces > 0)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      const mtxt = !t.mech ? '' : id === '4-1' ? `, getragen ${res.mech.carried}, Stacheln ${res.mech.spikes}, Trefferversuche ${res.mech.hurts}` : `, Ranken betreten ${res.mech.vines.length} (${res.mech.vines.join(' ')}), Abpraller ${res.mech.bounces}`;
      check(`${id}: ${t.name} (${hero}${mtxt})`, !!ok);
      if (t.shot && hero === 'lotti') await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of SHOTS_ONLY || !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectBelow !== undefined) ok = ok && res.pos[1] < t.expectBelow;
      if (t.expectWarp !== undefined) ok = ok && (await W('worldWarp')) === t.expectWarp;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}, Ende y ${res.pos[1].toFixed(1)})`, ok);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(26)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
