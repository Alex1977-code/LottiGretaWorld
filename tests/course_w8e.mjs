// Welt 8, Finale 8-Burg „Gipfelsturm am Brummbär-Turm“ (Unfallstelle mit Seilbahn, Dächer mit Lavabrocken-Regen, Stachelfallen,
// Krallen-Pilzlingen und Feuer-Werfern, Riesenrad mit vier Schubsern, Seilbahn zum Turm; Baron Brummbär im Krallen-Anzug: Turm
// unten mit POW-Block, oberer Turm mit Spiegelfrucht-Doppelgängern, Gipfel mit Super-POW-Block; Glasröhre zum Siegerturm, Abspann):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast – der ganze Kampf eingeschlossen –, deterministisch über __course.setInput/step, echte Eingaben, kein
// Teleport auf der Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extraleben, Kampf-Neustart je
// Abschnitt, Abspann nach dem Ziel (Szene Credits, Spielstand finished), Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w8e_8-Burg_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8e.mjs
//   PARTS=load,route,sweep,targets,extra,boss,credits,shots (Standard alle; Teilläufe je ≤ 10 min, z. B. PARTS=load,route ·
//   PARTS=targets,extra · PARTS=boss,credits · PARTS=sweep,shots) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras mit diesem
//   Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe je Objekt)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller und Stöße wirken weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const ID = '8-Burg';
const Y0 = 2, PZ = 8, ST = 34, T0 = 30, STEP = 2.8, TT = T0 + 7 * STEP, UA = 62, UB = 64, UC = 66, G = 82, ZG = -248, ZIEL = 76;

// ------------------------------------------------------------------ Route und Ziele
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump } · { wait } ·
// { hop } (Sprung auf der Stelle) · { star: i } · { chaseKind } · { expect: Bedingung } · { until: Bedingung } · { stompAll: Id-Anfang } ·
// { pipeIn: [x, z] } (in eine Glasröhren-Öffnung laufen und mitfahren) · { wheel: true } (Riesenrad: leere Gondel abpassen, hinauf,
// oben zur Bergstation springen) · { pow: [x, z] } (auf den POW-Block springen) · { bridge: [[Id, x], …], to: z } (über ein heiles
// Wegstück auf das nächste Türmchen) · { bump: n } (n Kopfstöße gegen den Super-POW-Block, je in der Ruhe des Barons) · { schubser:
// [Ids] } (Schubser von den Gondeln stoßen) · { tree: [x, z] } (Glockenbaum hinaufklettern und oben abspringen) · { stand: n }
// (verwundbar stehen bleiben) · { triple: [x, z] } (Dreifachsprung) · { climb: [x, z], top } (Kletterwand mit Krallen)
const MAIN = [
  { name: 'Unfallstelle', to: [0, -8.4], within: 0.4, run: false },
  { name: 'in die Seilbahn', to: [0, -11.6], jump: 16, within: 0.5, run: false },
  { expect: 'inGondel1' },
  { until: 'gondel1Drueben', max: 2400 },
  { name: 'Dach 1', to: [0, -37.5], jump: 18, within: 0.5, run: false },
  { expect: 'dach1' },
  { to: [0, -46.4], within: 0.5 },
  { name: 'Lücke 1', to: [0, -53.6], jump: 30, jumpAt: 6.2, within: 0.6, autoJump: false },
  { name: 'Stachelfallen', to: [0, -60], within: 0.6 },
  { name: 'Krallen-Pilzling 1', stompAll: 'kp1', area: [-3.6, 3.6, -52.5, -62.8] },
  { to: [0, -59.5], within: 0.5 },
  { name: 'Lücke 2', to: [0, -71], jump: 28, jumpAt: 7.4, within: 0.6, autoJump: false },
  { name: 'Feuer-Werfer 1', stompAll: 'fw1', area: [-4, 4, -69, -79] },
  { to: [0, -74.5], within: 0.5 },
  { name: 'Lücke 3 (hinauf)', to: [0, -86.6], jump: 40, jumpAt: 7.1, within: 0.6, autoJump: false },
  { name: 'Krallen-Pilzling 2', stompAll: 'kp2', area: [-3.6, 3.6, -84.6, -94] },
  { to: [0, -89.5], within: 0.5 },
  { name: 'Lücke 4', to: [0, -102.6], jump: 36, jumpAt: 8.0, within: 0.6, autoJump: false },
  { name: 'Krallen-Pilzling 3', stompAll: 'kp3', area: [-4, 4, -100.6, -109] },
  { name: 'Feuer-Werfer 2', stompAll: 'fw2', area: [-4, 4, -100.6, -109] },
  { name: 'Riesenrad-Platz (Kontrollpunkt)', to: [0, -115.8], within: 0.6 },
  { expect: 'platz' },
  { name: 'Riesenrad', wheel: true },
  { expect: 'station' },
  { name: 'in die Seilbahn 2', to: [0, -147.6], jump: 16, within: 0.5, run: false },
  { expect: 'inGondel2' },
  { until: 'gondel2Drueben', max: 2400 },
  { name: 'Turmplatz (Kontrollpunkt)', to: [0, -171.4], jump: 18, within: 0.5, run: false },
  { expect: 'turmplatz' },
  { name: 'Baron tritt auf', to: [0, -182.6], within: 0.6, run: false },
  { until: 'baronKlettert', max: 900 },
  { to: [-1.4, -183.2], within: 0.3, run: false }, { name: 'Sims 1', to: [-2.8, -185.3], jump: 40, within: 0.5, run: false },
  { to: [-1.9, -185.4], within: 0.3, run: false }, { name: 'Sims 2', to: [2.8, -185.2], jump: 40, within: 0.5, run: false },
  { to: [1.9, -185.4], within: 0.3, run: false }, { name: 'Sims 3', to: [-2.8, -185.2], jump: 40, within: 0.5, run: false },
  { to: [-1.9, -185.4], within: 0.3, run: false }, { name: 'Sims 4', to: [2.8, -185.2], jump: 40, within: 0.5, run: false },
  { to: [1.9, -185.4], within: 0.3, run: false }, { name: 'Sims 5', to: [-2.8, -185.2], jump: 40, within: 0.5, run: false },
  { to: [-1.9, -185.4], within: 0.3, run: false }, { name: 'Sims 6', to: [2.8, -185.2], jump: 40, within: 0.5, run: false },
  { to: [2.6, -186.5], within: 0.25, run: false }, { name: 'Turmterrasse', up: [2.4, -189.2], top: TT },
  { expect: 'terrasse' },
  { until: 'baronWacht', max: 1800 },
  { name: 'POW-Block', pow: [-2.6, -190.4] },
  { until: 'sperreWeg', max: 600 },
  { name: 'Kanonen-Glasröhre 1', pipeIn: [2.95, -194.6] },
  { expect: 'aufA' },
  { name: 'Kontrollpunkt Türmchen A', to: [-2.4, -205.2], within: 0.5, run: false },
  { until: 'baronOben', max: 600 },
  { to: [0.8, -208.4], within: 0.4, run: false },
  { name: 'Brücke 1', bridge: [['steg2', 0.8], ['steg1', -0.8]], to: -215.0 },
  { expect: 'aufB' },
  { to: [-0.8, -219.6], within: 0.5, run: false },
  { name: 'Brücke 2', bridge: [['steg3', -0.8], ['steg4', 0.8]], to: -226.6 },
  { expect: 'aufC' },
  { name: 'Kanonentor 2 (Ende des oberen Turms)', to: [0, -228.2], within: 0.4, run: false, autoJump: false },
  { until: 'obenGeschafft', max: 900 },
  { name: 'Kanonen-Glasröhre 2', pipeIn: [0, -230.4] },
  { expect: 'gipfel' },
  { name: 'Kontrollpunkt Gipfel', to: [0, -237.4], within: 0.5, run: false },
  { name: 'Gipfelkampf', to: [0, -244.4], within: 0.6, run: false },
  { name: 'Super-POW-Block 4×', bump: 4 },
  { until: 'baronFort', max: 1800 },
  { until: 'roehreDa', max: 600 },
  { name: 'Glasröhre zum Siegerturm', pipeIn: [0, -257.6] },
  { expect: 'sieger' },
  { name: 'Zielmast', to: [0, -295.6], within: 0.2 },
];

const TARGETS = [
  { name: 'Stern 0: nach Seilbahn 1 rechts hinauf auf den Uhrturm des ersten Hauses', star: 0, from: [0, 8, -37.6],
    legs: [{ to: [3.6, -41.2], within: 0.3, run: false }, { to: [6.6, -41.2], jump: 30, within: 0.4, run: false }, { to: [9, -40.2], jump: 34, within: 0.4, run: false }, { wait: 30 }], shot: 'stern0' },
  { name: 'Stern 0 nicht ohne den Flügel (vom Dach 1 reicht kein Sprung auf den Uhrturm)', star: 0, expectNot: true, from: [4.4, 8, -40.2], heroes: ['lotti'],
    legs: [{ to: [8.4, -40.2], jump: 40, within: 0.4, run: false, max: 240 }, { wait: 30 }], mech: (r) => r.pos[1] < 13 },
  { name: 'Stern 1: alle vier Schubser vom Riesenrad stoßen', star: 1, from: [0, PZ, -131.6], invuln: true,
    legs: [{ schubser: ['rs1', 'rs2', 'rs3', 'rs4'] }, { until: 'stern1Da', max: 600 }, { star: 1 }], shot: 'stern1',
    mech: (r) => r.mech.schubserWeg === 4, mechText: (r) => `${r.mech.schubserWeg}/4 Schubser hinuntergestoßen` },
  { name: 'Stern 1 nicht mit nur drei Schubsern', star: 1, expectNot: true, from: [0, PZ, -131.6], heroes: ['lotti'], invuln: true,
    legs: [{ schubser: ['rs1', 'rs2', 'rs3'] }, { wait: 240 }], mech: (r) => r.mech.schubserWeg === 3 && !r.mech.stern1Da, mechText: (r) => `${r.mech.schubserWeg}/4, Stern ${r.mech.stern1Da ? 'da' : 'versteckt'}` },
  { name: 'Stern 2: Sternenring in der ersten Finalphase (acht Sternmünzen, dann Super-POW)', star: 2, from: [0, UA, -203.6], prep: 'oben',
    legs: [{ until: 'baronOben', max: 600 }, { to: [0.8, -208.4], within: 0.4, run: false }, { bridge: [['steg2', 0.8], ['steg1', -0.8]], to: -215.0 },
      { to: [-0.8, -219.6], within: 0.5, run: false }, { bridge: [['steg3', -0.8], ['steg4', 0.8]], to: -226.6 },
      { to: [0, -228.2], within: 0.4, run: false, autoJump: false }, { until: 'obenGeschafft', max: 900 },
      { pipeIn: [0, -230.4] }, { expect: 'ringDa' }, { name: 'Sternenring', to: [-6.4, -239.8], within: 0.4, run: false },
      { name: 'acht Sternmünzen', chaseKind: 'starcoin', max: 2400 }, { until: 'stern2Da', max: 300 }, { star: 2 }],
    mech: (r) => r.mech.phase1 === true, mechText: (r) => `Phase ${r.mech.phaseAtStar}`, shot: 'stern2' },
  { name: 'Sternenring erst mit dem Gipfelkampf (vorher unsichtbar, Durchlaufen startet nichts)', star: 2, expectNot: true, from: [-6.4, G, -236.2], heroes: ['lotti'],
    legs: [{ to: [-6.4, -240.4], within: 0.3, run: false }, { wait: 60 }], mech: (r) => !r.mech.ringAktiv, mechText: (r) => `Ring ${r.mech.ringAktiv ? 'läuft' : 'versteckt'}` },
  { name: 'Stempel: am Zielmast den Glockenbaum hinaufklettern und oben abspringen', stamp: true, from: [-4.6, ZIEL, -289.4],
    legs: [{ tree: [-4.6, -292.5] }, { wait: 40 }], shot: 'stempel' },
  { name: 'Stempel nicht mit einem Dreifachsprung vom Boden', stamp: true, expectNot: true, from: [-4.6, ZIEL, -283.2], heroes: ['lotti'],
    legs: [{ triple: [-4.6, -291.3] }, { wait: 60 }] },
];

const EXTRA = [
  { name: 'Extraleben: unsichtbarer Block über dem Autowrack („Hupe“)', from: [-4.3, Y0, 0.8], heroes: ['lotti'], expectLives: 1,
    legs: [{ to: [-4.3, -2.2], jump: 26, within: 0.3, run: false }, { hop: 24 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
  { name: 'Extraleben: unsichtbarer Block über dem Kamin auf Dach 4', from: [-3.4, 8.6, -90.6], heroes: ['lotti'], expectLives: 1,
    legs: [{ to: [-3.4, -93.6], jump: 30, within: 0.25, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
  { name: 'Krallen-Anzug aus dem ?-Block am Start', from: [3.2, Y0, 3.6], heroes: ['lotti'],
    legs: [{ to: [3.2, 1.6], within: 0.15, run: false }, { hop: 20 }, { to: [3.2, 3.6], within: 0.3, run: false }, { chaseKind: 'powerup', max: 900 }, { expect: 'krallen' }] },
  { name: 'Krallen-Anzug: die Kletterfront hinauf bis zur Terrasse', from: [-3.4, T0, -184.6], heroes: ['lotti'], place: { power: 'krallen' }, prep: 'ohneBaron',
    legs: [{ climb: [-3.4, -187], top: TT }], mech: (r) => r.pos[1] > TT - 0.2, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
  { name: 'Lavabrocken-Regen startet auf Dach 2 und trifft (verwundbar stehen bleiben)', from: [0, 8, -46], heroes: ['lotti'], invuln: false, expectAlive: false,
    legs: [{ to: [0, -56.6], jump: 30, jumpAt: 6, within: 0.6 }, { stand: 900 }], mech: (r) => r.mech.regenAn && r.mech.regenTreffer >= 1, mechText: (r) => `Regen ${r.mech.regenAn ? 'an' : 'aus'}, Treffer ${r.mech.regenTreffer}`, allowFail: true },
  { name: 'Lavabrocken-Regen schweigt vor Dach 2', from: [0, 8, -37.6], heroes: ['lotti'],
    legs: [{ to: [0, -46], within: 0.6, run: false }, { wait: 240 }], mech: (r) => !r.mech.regenAn, mechText: (r) => `Regen ${r.mech.regenAn ? 'an' : 'aus'}` },
  { name: 'Stachelfallen verletzen, wenn die Stacheln draußen sind', from: [-1.3, 8, -52.6], heroes: ['lotti'], invuln: false, expectAlive: true,
    legs: [{ to: [-1.3, -55.5], within: 0.3, run: false }, { stand: 480 }], mech: (r) => r.mech.fallenTreffer >= 1, mechText: (r) => `${r.mech.fallenTreffer} Treffer`, allowFail: true },
  { name: 'Sperre: das Kanonenhaus ist zu, solange der Baron am POW-Block wacht', from: [-1, TT, -189.2], heroes: ['lotti'], prep: 'wache',
    legs: [{ to: [2.95, -192.4], within: 0.4, run: false, max: 300 }, { to: [2.95, -197], within: 0.3, run: false, max: 300, autoJump: false }],
    mech: (r) => r.pos[1] > TT - 0.5 && r.pos[2] > -193.3 && r.mech.rides === 0, mechText: (r) => `z ${r.pos[2].toFixed(2)}, Fahrten ${r.mech.rides}`, allowFail: true },
  { name: 'Glasröhre zum Siegerturm erst nach dem Sieg (vorher keine Fahrt)', from: [0, G, -252], heroes: ['lotti'], prep: 'gipfelOhneKampf',
    legs: [{ to: [0, -258.2], within: 0.3, run: false, max: 300, autoJump: false }, { wait: 60 }], mech: (r) => r.mech.rides === 0, mechText: (r) => `Fahrten ${r.mech.rides}`, allowFail: true },
];

const SHOTS_LIST = [
  ['start', [0, Y0, 5.5]],
  ['wrack', [-1.4, Y0, 2.4], 0, null, 0.9],
  ['seilbahn1', [0, Y0, -6]],
  ['dach1', [0, 8, -38]],
  ['uhrturm', [6.2, 10.6, -42.6]],
  ['dach2', [0, 8, -52.4]],
  ['dach3', [0, 6.6, -69]],
  ['dach4', [0, 8.6, -85]],
  ['dach5', [0, 8, -101]],
  ['platz', [0, PZ, -114.4]],
  ['rad', [0, PZ, -131.6]],
  ['station', [0, ST, -140.4]],
  ['seilbahn2', [0, T0, -169.8]],
  ['turmplatz', [0, T0, -174]],
  ['terrasse', [-1, TT, -188.6]],
  ['tuermchenA', [0, UA, -203.4]],
  ['bruecke', [0.8, UA, -208.6]],
  ['tuermchenC', [0, UC, -226]],
  ['gipfel', [0, G, -237.6]],
  ['sieger', [0, ZIEL, -281.6]],
  ['ziel', [-1, ZIEL, -288.6]],
];

const PORT = 4890;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,boss,credits,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install(K) {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const named = (id) => L.named.get(id);
  const baron = () => L.named.get('baron');
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
  const on = () => P().mode === 'ground';
  const COND = {
    inGondel1: () => P().ground?.tag === 'seilbahn' && P().pos.z > -20,
    gondel1Drueben: () => { const g = named('seilbahn1'); return g && g.u >= 0.999 && g.state === 'wait'; },
    inGondel2: () => P().ground?.tag === 'seilbahn' && P().pos.z < -140,
    gondel2Drueben: () => { const g = named('seilbahn2'); return g && g.u >= 0.999 && g.state === 'wait'; },
    dach1: () => at(-5, 5, 7.5, -34.8, -48) && on(),
    platz: () => at(-13, 13, 7.5, -110.6, -134.2) && on(),
    station: () => at(-5, 5, K.ST - 0.5, -138.9, -146.3) && on(),
    turmplatz: () => at(-13, 13, K.T0 - 0.5, -168.4, -187) && on(),
    baronKlettert: () => baron()?.state === 'climb',
    terrasse: () => P().pos.y > K.TT - 0.3 && on(),
    baronWacht: () => !!baron()?.guarding && ['guard', 'fire'].includes(baron()?.state),
    sperreWeg: () => !baron()?.guarding && (baron()?.cur ?? 0) >= 1,
    aufA: () => P().pos.y > K.UA - 0.4 && Math.hypot(P().pos.x, P().pos.z + 205.5) < 4.3 && on(),
    aufB: () => P().pos.y > K.UB - 0.4 && Math.hypot(P().pos.x, P().pos.z + 217) < 4.1 && on(),
    aufC: () => P().pos.y > K.UC - 0.4 && Math.hypot(P().pos.x, P().pos.z + 228.7) < 4.3 && on(),
    baronOben: () => baron()?.cur === 1 && !['wait', 'between', 'intro'].includes(baron()?.state),
    obenGeschafft: () => baron()?.done?.[1] === true,
    gipfel: () => P().pos.y > K.G - 0.4 && on(),
    perch: () => baron()?.state === 'perch',
    baronFort: () => baron()?.state === 'gone',
    roehreDa: () => named('glasroehre')?.hidden === false,
    sieger: () => P().pos.y > K.ZIEL - 0.5 && P().pos.z < -279 && on(),
    stern1Da: () => L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && e.alive),
    stern2Da: () => L.entities.some((e) => e.kind === 'star' && e.index === 2 && !e.hidden && e.alive) || !!L.runtime.stars[2],
    ringDa: () => named('sternring') && !named('sternring').hidden,
    krallen: () => P().power === 'krallen',
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
    /** Prüfstand: Baron-Abschnitte vor dem Startpunkt als geschafft markieren (wie tests/course_w8_enemies.mjs). */
    prep(kind) {
      const b = baron();
      if (kind === 'oben') { b.done[0] = true; b.cur = 1; b.setState('between'); b.placeWait(); }
      if (kind === 'gipfelOhneKampf') { b.done[0] = true; b.done[1] = true; b.cur = 2; b.setState('between'); b.placeWait(); }
      if (kind === 'ohneBaron') { b.done[0] = true; b.cur = 1; b.setState('between'); b.visible = false; }
      if (kind === 'wache') {
        // Baron oben am POW-Block wachen lassen (Kampf wie im Spiel: Figur betritt den Auslöser, er klettert hinauf)
        this.place([0, K.T0, -176.5], {});
        for (let i = 0; i < 120 * 40 && !(b.guarding && b.state === 'guard'); i++) {
          P().invuln = 99; c.setInput(i < 40 ? this.stick(0, -1, 0.5) : {}); c.step(1);
          // Prüfstand: die Figur steigt mit ihm (so bleibt er „lead“ über ihr und klettert bis oben)
          if (b.state === 'climb' && i % 60 === 0) P().pos.set(0, Math.min(K.TT, b.pos.y - 3), -184.6);
        }
        c.setInput({});
      }
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
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, rides: 0, pipes: 0, stomped: [], hurtList: [], schubserWeg: 0, powHits: 0, phases: [], regenAn: false, regenTreffer: 0, fallenTreffer: 0, ringAktiv: false };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (named('sternring')?.state === 'active') mech.ringAktiv = true;
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          const kind = p.script?.kind ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 3000 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 400 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      const goTo = (tx, tz, within = 0.4, max = 600, run = false) => {
        for (let n = 0; n < max && !p.dead; n++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') return true;
          tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2)))), run });
        }
        return false;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.stand) {
          // verwundbar stehen bleiben (Prüfung von Fallen/Regen)
          const rg = named('regen'), fl = L.entities.filter((e) => e.kind === 'stachelfalle');
          const h0 = rg?.info?.().hits ?? 0, f0 = fl.reduce((s, e) => s + e.hurts, 0);
          for (let i = 0; i < Lg.stand && !p.dead; i++) { tick({}); if (rg?.state === 'an') mech.regenAn = true; }
          mech.regenTreffer = (rg?.info?.().hits ?? 0) - h0;
          mech.fallenTreffer = fl.reduce((s, e) => s + e.hurts, 0) - f0;
          continue;
        }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), baron()?.state]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); if (Lg.star === 2) { mech.phaseAtStar = baron()?.phase; mech.phase1 = baron()?.hp === 4; } continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          for (let guard = 0; guard < 20; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            const e = list[0];
            const A = Lg.area;   // sichere Fläche [x0, x1, z0, z1]: Ziele dorthin klemmen (nie über die Dachkante)
            const cl = (x, z) => (A ? [Math.max(A[0], Math.min(A[1], x)), Math.max(Math.min(A[2], A[3]), Math.min(Math.max(A[2], A[3]), z))] : [x, z]);
            for (let k = 0; k < 900 && e.alive && !e.defeated && !e.removed && !p.dead; k++) {
              const [ex, ez] = cl(e.pos.x, e.pos.z);
              const dx = ex - p.pos.x, dz = ez - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0 && Math.abs(e.pos.y - p.pos.y) < 1.5) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; const [ax, az] = cl(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2); tick({ ...this.airSteer(ax, az, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['besiegt', pre, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen und mitfahren
        if (Lg.pipeIn) {
          const [tx, tz] = Lg.pipeIn;
          const r0 = mech.rides;
          let k = 0;
          for (; k < 900 && mech.rides === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: false });
          }
          settle();
          for (let q = 0; q < 20; q++) tick({});
          mech.pipes++;
          log.push(['röhre', `${Lg.pipeIn}`, mech.rides > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.rides === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipeIn]); break; }
          continue;
        }
        // ------------------------------------------------ Riesenrad: leere Gondel abpassen, hinauf, oben zur Bergstation
        if (Lg.wheel) {
          const rad = named('rad');
          const cy = K.RAD.y, R = K.RAD.r, w = rad.speed;
          const ang = (g) => Math.atan2(g.mb.pos.y + 1.65 - cy, g.mb.pos.x - K.RAD.x);
          const busy = (g) => L.entities.some((e) => e.kind === 'schubser' && e.alive && !e.removed && !e.defeated && Math.abs(e.pos.x - g.mb.pos.x) < 2.2 && Math.abs(e.pos.y - g.mb.top) < 1.6);
          goTo(0, -133.4, 0.3);
          let g = null, k = 0;
          for (; k < 120 * 60 && !g; k++) {
            g = rad.gondolas.find((q) => { const a = ang(q); return a > -Math.PI / 2 - 0.16 && a < -Math.PI / 2 - 0.07 && !busy(q); }) ?? null;
            if (!g) tick({});
          }
          log.push(['gondel', g ? g.i : null, k]);
          if (!g) { log.push(['FEHLER: keine leere Gondel']); break; }
          // hinüberspringen (Gondel fährt nach +X)
          let n = 0;
          for (; n < 300 && !(p.mode === 'ground' && p.ground?.tag === 'riesenrad-gondel'); n++) {
            const gx = g.mb.pos.x + 0.35, gz = g.mb.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(gx, gz, w * R, 0, 4, 6) : this.stick(gx - p.pos.x, gz - p.pos.z, 1)), jump: p.mode === 'ground' ? n < 30 : p.vel.y > 0, run: false });
            if (p.dead) break;
          }
          log.push(['eingestiegen', n, p.ground?.tag ?? null, +p.pos.y.toFixed(2)]);
          if (p.ground?.tag !== 'riesenrad-gondel') { log.push(['FEHLER: Gondel verfehlt']); break; }
          // mitfahren: auf der Planke mittig bleiben, bis die Gondel oben ist
          for (n = 0; n < 120 * 40 && !p.dead; n++) {
            const a = ang(g);
            if (a > Math.PI / 2 - 0.12 && a < Math.PI / 2 + 0.3) break;
            const dx = g.mb.pos.x - p.pos.x, dz = g.mb.pos.z - p.pos.z;
            tick(Math.hypot(dx, dz) > 0.35 && p.mode === 'ground' ? this.stick(dx, dz, 0.4) : {});
          }
          log.push(['oben', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2)]);
          // Sprung zur Bergstation
          for (n = 0; n < 300 && !(p.mode === 'ground' && p.pos.z < -139.2 && p.pos.y > K.ST - 0.4); n++) {
            const tx = Math.max(-3.5, Math.min(3.5, p.pos.x)), tz = -141.2;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: p.mode === 'ground' ? n < 26 : p.vel.y > 0, run: false });
            if (p.dead) break;
          }
          settle();
          log.push(['bergstation', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Schubser von den Gondeln stoßen (von der Platzkante aus, Stampfen nach hinten)
        if (Lg.schubser) {
          const rad = named('rad');
          const cy = K.RAD.y, w = rad.speed;
          const ent = (id) => L.entities.find((e) => e.spec?.id === id);
          const gone = (e) => !e || !e.alive || e.removed || e.defeated || e.state === 'defeated';
          const gondelOf = (e) => rad.gondolas.reduce((best, q) => (Math.hypot(q.mb.pos.x - e.pos.x, q.mb.top - e.pos.y) < Math.hypot((best?.mb.pos.x ?? 1e9) - e.pos.x, (best?.mb.top ?? 1e9) - e.pos.y) ? q : best), null);
          const ang = (g) => Math.atan2(g.mb.pos.y + 1.65 - cy, g.mb.pos.x - K.RAD.x);
          for (const id of Lg.schubser) {
            const e = ent(id);
            let tries = 0;
            for (; tries < 6 && !gone(e) && !p.dead; tries++) {
              // in der Grube? Treppe hinauf zum Platz
              if (p.pos.y < K.PZ - 1) { goTo(10.6, -139.0, 0.5, 900, false); goTo(10.6, -133.2, 0.5, 900, false); }
              goTo(0, -133.6, 0.3);
              const g = gondelOf(e);
              // warten, bis seine Gondel unten links ankommt
              let k = 0;
              for (; k < 120 * 60; k++) { const a = ang(g); if (a > -Math.PI / 2 - 0.42 && a < -Math.PI / 2 - 0.3) break; tick(p.pos.y > K.PZ - 0.2 && Math.abs(p.pos.z + 133.6) > 0.3 ? this.stick(0 - p.pos.x, -133.6 - p.pos.z, 0.5) : {}); }
              // Sprung auf ihn, über ihm Stampfattacke (er rutscht nach −Z von der Planke)
              let pounding = false, n = 0;
              const p0 = e.pushes ?? 0;
              for (; n < 260 && !gone(e) && (e.pushes ?? 0) === p0 && !p.dead; n++) {
                const tx = e.pos.x + 0.15, tz = e.pos.z + 0.25;
                const hd = Math.hypot(tx - p.pos.x, tz - p.pos.z);
                if (!pounding && n > 6 && hd < 0.5 && p.vel.y < 2 && p.pos.y > e.pos.y + 1.1) pounding = true;
                if (pounding) { tick({ crouch: true }); continue; }
                tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, (e.vel?.x ?? 0) + w * K.RAD.r, (e.vel?.z ?? 0) - 1.2, 3.6, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: n < 26, run: false });
              }
              for (let q = 0; q < 240 && !gone(e); q++) tick({});
              settle();
              log.push(['schubser', id, gone(e), e?.state, e?.fellBy ?? null, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
            }
            if (gone(e)) mech.schubserWeg++;
            else log.push(['FEHLER: Schubser blieb oben', id]);
          }
          mech.stern1Da = COND.stern1Da();
          continue;
        }
        // ------------------------------------------------ POW-Block anspringen
        if (Lg.pow) {
          const [tx, tz] = Lg.pow;
          const pw = named('pow_turm'), n0 = pw?.n ?? 0;
          let k = 0;
          for (; k < 600 && (pw?.n ?? 0) === n0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, Math.min(1, d / 1.5 + 0.2))), jump: p.mode === 'ground' ? d < 2.4 : p.vel.y > 0, run: false });
          }
          settle();
          log.push(['pow', (pw?.n ?? 0) > n0, k, baron()?.state]);
          if ((pw?.n ?? 0) === n0) { log.push(['FEHLER: POW nicht getroffen']); break; }
          continue;
        }
        // ------------------------------------------------ über ein heiles Wegstück zum nächsten Türmchen
        if (Lg.bridge) {
          let pickX = null;
          for (const [id, x] of Lg.bridge) { const s = named(id); if (s && (s.state === 'ganz')) { pickX = x; break; } }
          const x = pickX ?? 0;
          const zMid = Lg.to + 4.2;
          log.push(['brücke', pickX === null ? 'Sprung' : x]);
          // aufs Wegstück (1 m höher), dann aufs Türmchen (1 m höher)
          for (const [tz, hold] of [[zMid, 14], [Lg.to, 16]]) {
            let n = 0;
            for (; n < 400 && !p.dead; n++) {
              const dx = x - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.5 && p.mode === 'ground' && n > 20) break;
              tick({ ...(p.mode === 'air' ? this.airSteer(x, tz, 0, 0, 3, 6) : this.stick(dx, dz, 1)), jump: p.mode === 'ground' ? n < hold : p.vel.y > 0, run: false });
            }
          }
          settle();
          log.push(['brücke drüben', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Super-POW-Block: n Kopfstöße, je in der Ruhe des Barons
        if (Lg.bump) {
          const b = baron(), blk = named('superpow');
          for (let i = 0; i < Lg.bump && !p.dead; i++) {
            let k = 0;
            for (; k < 120 * 12 && !(b.state === 'perch' && b.stateT > 0.4); k++) tick({});
            mech.phases.push(b.phase);
            goTo(0.6, K.ZG - 1, 0.35, 600, false);
            const h0 = blk.hits;
            for (let q = 0; q < 30 && blk.hits === h0; q++) tick({ jump: true });
            for (let q = 0; q < 200 && p.mode !== 'ground'; q++) tick({});
            log.push(['stoß', i + 1, blk.hits, b.hp, b.state, k]);
            if (blk.hits === h0) { log.push(['FEHLER: Block nicht getroffen']); break; }
            mech.powHits++;
          }
          continue;
        }
        // ------------------------------------------------ Glockenbaum hinaufklettern und oben abspringen
        if (Lg.tree) {
          const [tx, tz] = Lg.tree;
          let n = 0;
          for (; n < 300 && p.mode !== 'stalk' && !p.dead; n++) tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 0.8), run: false });
          log.push(['stamm', p.mode, n]);
          if (p.mode !== 'stalk') { log.push(['FEHLER: Stamm nicht gegriffen']); break; }
          let y0 = -1e9;
          for (n = 0; n < 900 && p.mode === 'stalk'; n++) { tick({ x: 0, y: 1 }); if (n % 30 === 0) { if (p.pos.y <= y0 + 0.01) break; y0 = p.pos.y; } }
          log.push(['oben am Stamm', +p.pos.y.toFixed(2)]);
          // zur Kamera hin abspringen, in der Luft über dem Stamm halten
          tick({ ...this.stick(0, 1, 0.8), jump: true });
          for (n = 0; n < 200 && p.mode !== 'ground' && !p.dead; n++) tick({ ...this.airSteer(tx, tz + 0.9, 0, 0, 2.5, 3), jump: p.vel.y > 0 });
          log.push(['abgesprungen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Dreifachsprung auf ein Ziel (Gegenprobe Stempel)
        if (Lg.triple) {
          const [tx, tz] = Lg.triple;
          for (let j = 0; j < 3 && !p.dead; j++) {
            let n = 0;
            for (; n < 200 && !p.dead; n++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z;
              const jump = p.mode === 'ground' ? (n > 2 || j > 0) : p.vel.y > 0;
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.6, 10) : this.stick(dx, dz, 1)), jump, run: true });
              if (p.mode === 'ground' && n > 10) break;
            }
          }
          log.push(['dreifach', +p.pos.y.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ senkrecht hochspringen, oben über die Kante (z. B. auf die Turmterrasse)
        if (Lg.up) {
          const [tx, tz] = Lg.up;
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          let n = 0, over = false;
          for (; n < 300 && !p.dead; n++) {
            if (!over && p.pos.y > Lg.top + 0.15) over = true;
            if (p.mode === 'ground' && n > 10) break;
            tick({ ...(over ? this.airSteer(tx, tz, 0, 0, 3, 5) : {}), jump: p.mode === 'ground' ? true : p.vel.y > 0 });
          }
          settle();
          log.push(['hoch', over, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (p.pos.y < Lg.top - 0.2) { log.push(['FEHLER: nicht oben', Lg.top]); break; }
          continue;
        }
        // ------------------------------------------------ Kletterwand mit dem Krallen-Anzug
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let maxY = p.pos.y;
          for (let n = 0; n < 120 * 30 && !p.dead && p.pos.y < Lg.top - 0.1; n++) {
            const onTop = p.mode === 'ground' && p.pos.y > Lg.top - 0.2;
            if (onTop) break;
            const jump = p.mode === 'ground' ? (n % 40) < 20 : p.mode === 'wall' && p.vel.y < 0.5 && (n % 50) < 10;
            tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 1), jump, run: false });
            maxY = Math.max(maxY, p.pos.y);
          }
          for (let n = 0; n < 200 && p.pos.y < Lg.top - 0.2; n++) tick({ ...this.stick(0, -1, 1), jump: n < 10 });
          settle();
          log.push(['klettern', +maxY.toFixed(2), +p.pos.y.toFixed(2)]);
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
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track, baron: baron()?.info?.() ?? null };
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
      const wait = () => { if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; } r.renderBufferDirect = orig; res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[2] - x[2]).slice(0, 30)); };
      requestAnimationFrame(wait);
    }),
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    cond: (k) => COND[k](),
  };
  window.__w8 = W;
  return Object.keys(W);
}

const K = { Y0, PZ, ST, T0, TT, UA, UB, UC, G, ZG, ZIEL, RAD: { x: 0, y: 22.2, z: -136.5, r: 13 } };
const allErrors = [];
let loaded = false;
async function load() {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(ID)}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
    try {
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
    } catch {
      console.log(`Level ${ID} startet nicht. Konsole:`);
      for (const x of errors) console.log('  ', x);
      return false;
    }
    loaded = true;
  }
  await page.waitForTimeout(300);
  await sc(install, K);
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
  await page.screenshot({ path: `${OUT}w8e_${ID}_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

console.log(`\nLevel ${ID}`);
if (!(await load())) { check(`${ID} lädt`, false); }
else {
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, credits: d.credits }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${ID}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${ID}: 3 Sterne, Stempel, 500 s, Thema baronpark, Musik course_finale, Archetyp boss, Abspann (credits)`,
      meta.stars === 3 && kinds.stamp === 1 && meta.timeLimit === 500 && meta.theme === 'baronpark' && meta.music === 'course_finale' && meta.archetype === 'boss' && meta.credits === true);
    for (const [kind, n] of Object.entries({ krallen_pilzling: 3, feuer_werfer: 2, schubser: 4, stachelfalle: 3, baron_krallen: 1, bruchstueck: 9, starring: 1, pow: 1 })) check(`${ID}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast, ganzer Endkampf)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') ? [] : HEROES) {
    await load();
    await W('place', [0, Y0, 5.5], { hero, settle: 2 });
    const res = await W('drive', MAIN, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts}, Baron ${JSON.stringify(res.baron && { state: res.baron.state, hp: res.baron.hp, done: res.baron.done, swipes: res.baron.swipes, walls: res.baron.wallsBroken, fire: res.baron.fireballs, slides: res.baron.slides, clones: res.baron.clonesMade, eaten: res.baron.eaten, powHit: res.baron.powHit, waves: res.baron.waves })}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${ID}: Routen-Bot ${hero} erreicht den Zielmast (Seilbahnen, Riesenrad, Turm, Glasröhren)`, reached);
    check(`${ID}: ${hero} Zeit bis zum Ziel < 400 s (${res.time.toFixed(1)} s von 500 s)`, reached && res.time < 400);
    check(`${ID}: ${hero} – Baron in allen drei Abschnitten besiegt (POW-Block, Spiegelfrüchte ${res.baron?.eaten}, Super-POW 4×), Glasröhren ${res.mech.pipes}`,
      !!res.baron && res.baron.state === 'gone' && res.baron.done.every(Boolean) && res.baron.powHit === 1 && res.baron.eaten === 2 && res.mech.powHits === 4 && res.mech.pipes === 3);
    check(`${ID}: ${hero} – Gipfelphasen 1 → 4 der Reihe nach (${res.mech.phases.join(' ')})`, res.mech.phases.join() === '1,2,3,4');
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (PARTS.has('sweep') && !sweepTrack && !ONLY) {
    // ohne Routenlauf: Messpunkte aus der Bildliste
    sweepTrack = SHOTS_LIST.map((s) => s[1]);
  }
  if (sweepTrack?.length) {
    await load();
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
    check(`${ID}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${ID}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(TARGETS)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load();
      if (t.prep) await W('prep', t.prep);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${ID}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(t.shot);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(EXTRA)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load();
      const lives0 = await W('lives');
      if (t.prep) await W('prep', t.prep);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${ID}: ${t.name} (${hero}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
    }
  }

  // ------------------------------------------------ Endkampf: Tod setzt nur den Abschnitt zurück, faire Kontrollpunkte
  if (PARTS.has('boss') && !ONLY) {
    await load();
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w8, p = c.player, b = L.named.get('baron');
      const out = {};
      // Turm unten: Kampf beginnt, Tod → Abschnitt von vorn, Neustart am Turmplatz
      W.place([0, 30, -171.2], { settle: 4 });
      W.drive([{ to: [0, -182.6], within: 0.6, run: false }, { until: 'baronKlettert', max: 900 }, { to: [-2.4, -185.2], jump: 40, within: 0.45, run: false }], {});
      for (let i = 0; i < 120 * 6; i++) { p.invuln = 5; c.step(1); }
      out.turm = { state: b.state, cur: b.cur, swipes: b.swipes, fire: b.fireballs };
      p.invuln = 0; p.die('fall');
      for (let i = 0; i < 900 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(20);
      out.turmTod = { state: b.state, cur: b.cur, walls: ['wand1', 'wand2', 'wand3', 'wand4', 'wand5'].map((id) => L.named.get(id).state), pos: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)] };
      // wieder hinein: der Kampf beginnt erneut
      W.drive([{ to: [0, -182.6], within: 0.6, run: false }, { until: 'baronKlettert', max: 900 }], {});
      out.wieder = { state: b.state, started: L.archetype.started };
      return out;
    });
    console.log(`  Kampf-Neustart Turm: ${JSON.stringify(r)}`);
    check(`${ID}: Tod im Turm-Abschnitt → Neustart am Turmplatz, Wandstücke zurück, Kampf beginnt beim Betreten neu (${JSON.stringify(r.turmTod.pos)})`,
      r.turmTod.state === 'wait' && r.turmTod.cur === 0 && r.turmTod.walls.every((s) => s === 'ganz') && Math.abs(r.turmTod.pos[2] + 170.6) < 1.5 && r.turmTod.pos[1] > 29 && r.wieder.state === 'climb' && r.wieder.started);
    // Gipfel: Tod nach zwei Stößen → Neustart am Gipfel-Kontrollpunkt, Baron mit 2/4 (Stöße bleiben)
    await load();
    const g = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w8, p = c.player, b = L.named.get('baron');
      W.prep('gipfelOhneKampf');
      W.place([0, 82, -237.4], { settle: 4 });
      const res = W.drive([{ to: [0, -244.4], within: 0.6, run: false }, { bump: 2 }], {});
      p.invuln = 0; p.die('fall');
      for (let i = 0; i < 900 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(20);
      const after = { state: b.state, hp: b.hp, hits: L.named.get('superpow').hits, pos: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)] };
      W.drive([{ to: [0, -244.4], within: 0.6, run: false }, { bump: 2 }, { until: 'baronFort', max: 1800 }], {});
      return { hits: res.mech.powHits, after, again: { state: b.state, hits: L.named.get('superpow').hits, won: L.archetype.won, glas: b.glassState } };
    });
    console.log(`  Kampf-Neustart Gipfel: ${JSON.stringify(g)}`);
    check(`${ID}: Tod auf dem Gipfel → Neustart am Gipfel-Kontrollpunkt, die Stöße bleiben (Baron ${g.after.hp}/4), zwei weitere Stöße gewinnen`,
      g.hits === 2 && g.after.state === 'wait' && g.after.hp === 2 && g.after.hits === 2 && g.after.pos[1] > 81 && g.again.state === 'gone' && g.again.won && g.again.glas.break === 1);
  }

  // ------------------------------------------------ Abspann: Ziel → „Weiter“ startet den Abspann, Spielstand finished
  if (PARTS.has('credits') && !ONLY) {
    await load();
    const r = await sc(() => {
      const c = window.__course, L = c.level, W = window.__w8;
      W.prep('gipfelOhneKampf');
      W.place([0, 82, -237.4], { settle: 4 });
      const before = !!L.creditsWanted;
      const res = W.drive([{ to: [0, -244.4], within: 0.6, run: false }, { bump: 4 }, { until: 'baronFort', max: 1800 }, { until: 'roehreDa', max: 600 }, { pipeIn: [0, -257.6] }, { expect: 'sieger' }, { wait: 240 }, { to: [0, -295.6], within: 0.2 }], {});
      for (let i = 0; i < 1800 && !c.finished; i++) c.step(1);
      const fest = L.burg?.fest?.shown, fw = L.burg?.fw?.bursts ?? 0;
      return { before, wanted: L.creditsWanted ?? null, status: res.status, finished: !!c.finished, fest, fw, save: W.save().levels?.['8-Burg'] ?? null, log: res.log.filter((l) => String(l[0]).startsWith('FEHLER')) };
    });
    console.log(`  Ziel und Abspann: ${JSON.stringify(r)}`);
    check(`${ID}: Sieg → Glas zerbricht, Freunde feiern am Siegerturm, Feuerwerk (${r.fw} Raketen), Zielmast, gespeichert`, r.finished && r.fest === true && r.fw >= 2 && r.save?.done === true);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}w8e_${ID}_ergebnis.png` });
    await sc(() => window.__course.exitToMap({ done: '8-Burg' }));
    let started = true;
    try { await page.waitForFunction(() => window.__game.scene.isActive('Credits') && window.__credits?.from === '8-Burg', null, { timeout: 60000 }); } catch { started = false; }
    const fin = await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').finished === true);
    check(`${ID}: „Weiter“ nach dem Ziel startet den Abspann (Szene Credits, from 8-Burg), Spielstand „Spiel geschafft“ (Abspann vorher nicht angefordert: ${!r.before})`, started && fin && !r.before && r.wanted === 'nach-ziel');
    if (started) {
      await sc(() => { window.__credits.setManual?.(true); window.__credits.advance?.(30); });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}w8e_${ID}_abspann.png` });
    }
    loaded = false;
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (PARTS.has('shots') && !ONLY) {
    loaded = false;
    await load();
    for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of SHOTS_LIST) {
      if (SHOTS && !SHOTS.has(name)) continue;
      await W('place', pos, { settle: 10, yaw });
      if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
      await shot(name);
    }
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
