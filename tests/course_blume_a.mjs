// Welt Blume (Remix-Welt 2), Remix-Level B-1 „Funkentanz in der Kippfeld-Manege“ (Basis 1-5), B-2 „Wasserwürfel im
// Glitzerschacht“ (Basis 6-7), B-3 „Fackelnacht am Lila Nebelmoor“ (Basis 4-2) und B-4 „Uhrenhatz durch die Werferburg“
// (Basis 7-1): Laden ohne Konsolenfehler/-warnungen, Remix-Daten (Platzhalter, Basis, Thema/Licht, Musik-Variante, Zeit,
// Sterne, kein Stempel, Gegnertausch), Gegenprobe „Basislevel unverändert“ (Rohdaten der Basis und die Basis selbst geladen),
// Remix-Regeln wirksam (je Level mit Gegenprobe), Routen-Bot Lotti und Greta von Start bis Zielmast (deterministisch über
// __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne und Geheimnisse mit der echten Mechanik
// samt Gegenproben, Kennzahlen entlang der Route (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus
// der Spielkamera (tests/out/blume_a_*.png).
// Aufruf (nach npm run build): node tests/course_blume_a.mjs [B-1|B-2|B-3|B-4]
//   PARTS=load,rules,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min, z. B. PARTS=load,rules,route und
//   PARTS=targets,extra getrennt) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras/Regeln mit diesem Namensteil) ·
//   VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe je Objekt) · PORT_BASE
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar, wo es um Treffer geht.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], y (Mindesthöhe beim Landen), jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow,
//   max, land, autoJump, edgeJump, swimJump, stopIf } · { wait } · { hop } · { crouch } (Röhre) · { star: i } · { chaseKind,
//   ids } · { expect } · { until } (Name aus COND oder Ausdruck '=…') · { acts: [...] } (Aktionen wie course_w1b: go/jump/
//   waitfor/wallclimb/input/wait, track = mitfahren auf einer Plattform) · { tiles: [[x, z] …] } · { pipe: [x, z] } ·
//   { warp: [x, z] } · { stompAll: Id-Anfang } · { pound: [x, z], above } · { bounce: [x, z], at: [x, z], y } (Sprungfeld/Pilz-
//   Trampolin) · { crusher: id } · { cloud: id, … } (fahrende Wolke im Autoscroller) · { plat: id, when, until } (Plattform
//   abwarten, aufspringen, mitfahren) · { ride: id, board, exit, to } · { leap: [x, z], from, over } (aus dem Wasser springen) ·
//   { dive: [x, z], y } · { swimOut: [x, z] } · { fire: Ziel } (Feuerbälle) · { torch: i } (Fackel anzünden) · { throwAt: [x, z] }
//   (Wurfsichel) · { ball: id, throwTo: [x, z] } (Wurfball aufheben und werfen) · { grab: [x, z] } (Power-up aus ?-Block) ·
//   { climb: [x, z], top } (Krallen-Anzug) · { long: [x, z] } (Weitsprung) · { die } · { upOnto: [x, z, top] }
const Y = 1;
const PI = Math.PI;
const ROUTES = {
  // ================================================================================================ B-1 (Basis 1-5)
  'B-1': {
    base: '1-5',
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'circus@nacht', music: 'course_circus', variant: null, archetype: 'parcours', title: 'Funkentanz in der Kippfeld-Manege' },
    enemies: { funkenflaemmchen: 5, feuer_werfer: 2, krabbelkaefer: 8, brummer: 8, flatterkaefer: 6, zauberkroete: 1 },
    baseEnemies: { funkenflaemmchen: 0, feuer_werfer: 0, krabbelkaefer: 8, brummer: 8, flatterkaefer: 6, zauberkroete: 1, stamp: 1 },
    main: [
      { name: 'Schalter-Feld 1 (Funkenflämmchen wandern über die Felder)', tiles: [[-5, -1], [0, -1], [5, -1], [5, -7], [0, -7], [-5, -7]], group: 'feld1' },
      { until: 'steg1', max: 400 },
      { name: 'Steg', acts: [
        { go: [-1, -13.4], run: true }, { jump: [-1, -16.5], run: false }, { go: [-0.3, -17.6], tol: 0.3 }, { jump: [0, -20], run: false },
        { go: [0.6, -21.1], tol: 0.3 }, { jump: [1, -23.5], run: false }, { go: [1, -24.6], tol: 0.3 }, { jump: [0.5, -28.5], run: false },
      ] },
      { name: 'Schalter-Feld 2: fahrende Plattformen', acts: [
        { go: [0, -33] }, { waitfor: 'Math.abs(bot.mover("lift1").x - p.pos.x) < 1.2 && bot.mover("lift1").sh.mover.vx * (p.pos.x - bot.mover("lift1").x) <= 0', max: 2000 },
        { go: [0, -34.6], tol: 0.3 }, { jump: [0, 0], track: 'lift1', run: false },
        { go: [0, 1.2], track: 'lift1', tol: 0.3 }, { waitfor: 'Math.abs(bot.mover("lift2").x - p.pos.x) < 1.6', max: 2000 },
        { go: [0, -1.2], track: 'lift1', tol: 0.3 }, { jump: [0, 0], track: 'lift2', run: false },
        { go: [0, 1.2], track: 'lift2', tol: 0.3 }, { waitfor: 'Math.abs(bot.mover("lift2").x) < 0.6', max: 2000 },
        { go: [0, -1.2], track: 'lift2', tol: 0.3 }, { jump: [0, -52], run: false },
      ] },
      { expect: '=at(-5, 5, 1.2, -50, -57)' },
      { name: 'Checkpoint-Trommel (am Sternring vorbei)', acts: [{ go: [-0.6, -55.4] }, { jump: [-0.6, -61], run: false }, { go: [-2.4, -63.2] }, { wait: 10 }] },
      { name: 'Flatterkäfer-Zone (an den Pilz-Trampolinen vorbei)', acts: [
        { go: [-2.6, -67.2], tol: 0.3 }, { jump: [-2.4, -72.6], run: false }, { go: [-1.6, -75.1], tol: 0.3 }, { jump: [1.4, -79.4], run: false },
        { go: [1.4, -82.1], tol: 0.3 }, { jump: [-1, -86.5], run: false }, { go: [-2, -91.4] },
      ] },
      { name: 'Krabbelkäfer-Gang', acts: [{ go: [0, -91.6], tol: 0.3 }, { jump: [0, -97], run: false }, { go: [0, -122.4], run: true }, { go: [0, -124.2], tol: 0.25 }, { wait: 30 }] },
      { name: 'Wechselschalter-Fähre: alle sechs Felder (öffnet die Kanone)', acts: [
        { waitfor: 'bot.mover("faehre").z > -132.6', max: 3000 }, { jump: [0, 4.4], track: 'faehre', run: false }, { wait: 10 },
        { go: [-3.5, 3.5], track: 'faehre', tol: 0.35 }, { go: [-4.2, 0], track: 'faehre', tol: 0.35 }, { go: [-3.5, -3.5], track: 'faehre', tol: 0.35 },
        { go: [3.5, -3.5], track: 'faehre', tol: 0.35 }, { go: [4.2, 0], track: 'faehre', tol: 0.35 }, { go: [3.5, 3.5], track: 'faehre', tol: 0.35 },
        { go: [0, -3.6], track: 'faehre', tol: 0.35 },
        { waitfor: 'bot.mover("faehre").z < -151.6', max: 3000 }, { go: [0, -157.2], tol: 0.3 }, { jump: [0, -161], run: false },
      ] },
      { expect: 'sperreOffen' },
      { to: [3.5, -160.4], within: 0.25, run: false },
      { name: 'Glasrohr-Kanone → Zielbühne', pipe: [3.5, -163.5] },
      { expect: '=at(-5, 5, 9.5, -184, -196)' },
      { name: 'Zielmast', to: [0, -191.4], within: 0.2, run: false },
    ],
    routeChecks: [
      { name: 'Kanone erst nach allen Wechselfeldern offen, eine Kanonenfahrt', ok: (r) => r.mech.pipes >= 1 && r.log.some((l) => l[0] === 'erwartet' && l[1] === 'sperreOffen' && l[2]) },
    ],
    targets: [
      { name: 'Stern 0: Rätselbox hinter dem Start → Wandschalter-Kammer, Wandsprung-Kette an allen vier Wand-Schaltfeldern vorbei', star: 0, from: [2.6, 0, 4.4],
        legs: [{ warp: [3.2, 6.4] }, { until: '=P().pos.x < -50 && P().mode === \'ground\'', max: 900 }, { to: [-60.6, -4.3], within: 0.3, run: false },
          { to: [-60.6, -6.6], within: 0.15, run: false, slow: 0.5 }, { wait: 20 },
          { acts: [{ wallclimb: { dir: -1, until: 10.6, z: -6.6, stop: 'c.level.runtime.stars[0]' } }, { wait: 40 }] }],
        shot: 'stern0', mech: (r) => r.mech.wand === '1111', mechText: (r) => `Wandfelder ${r.mech.wand}` },
      { name: 'Stern 0 nicht ohne die Wandfelder (Rückwärtssalto im Schacht: nur unten)', star: 0, expectNot: true, from: [-60, 0, -6.6], heroes: ['lotti'],
        legs: [{ backflip: [0, 1] }, { wait: 40 }], mech: (r) => r.mech.wand !== '1111', mechText: (r) => `Wandfelder ${r.mech.wand}` },
      { name: 'Stern 1: Sternring auf der Trommel, Pilz-Trampoline zu den Hochbühnen der Hammer-Werfer, acht Sternmünzen', star: 1, from: [2.4, 2.5, -62.6],
        legs: [{ to: [2.4, -67.2], within: 0.4, run: true }, { expect: 'ringAn' },
          { to: [-2.6, -72.6], jump: 24, within: 0.5, run: false },
          { bounce: [-10.2, -77.2], at: [-5.6, -74.4], y: 10 }, { to: [-11.2, -78.8], within: 0.4, run: false },
          { to: [-3.4, -73.4], jump: 30, within: 0.6, run: false }, { to: [1.6, -79.2], jump: 24, within: 0.5, run: false },
          { bounce: [8.2, -83.6], at: [4.6, -81.2], y: 10.5 }, { to: [9.4, -85.0], within: 0.4, run: false },
          { to: [-2.2, -87.4], jump: 40, within: 0.6, run: true }, { until: 'stern1da', max: 240 }, { star: 1 }],
        shot: 'stern1', mech: (r) => r.mech.bounces >= 2, mechText: (r) => `Pilz-Trampoline ${r.mech.bounces}×, Sternmünzen ${r.mech.ring}` },
      { name: 'Stern 2: Wurfball vom Sims durch das Fenster der Wurfbude', star: 2, from: [7.4, 10, -188.4],
        legs: [{ ball: 'b1_ball', throwTo: [13.7, -189] }, { wait: 120 }], shot: 'stern2' },
      { name: 'Stern 2 mit der Wurfsichel vom Sims', star: 2, from: [8.4, 10, -189], place: { power: 'sichel' },
        legs: [{ throwAt: [13.7, -189] }] },
      { name: 'Stern 2 nicht mit einem Sprung zur Wurfbude (Fenster zu niedrig, Wand davor)', star: 2, expectNot: true, from: [6, 10, -189], heroes: ['lotti', 'greta'],
        legs: [{ to: [13.7, -189], jump: 40, jumpAt: 4.2, within: 0.3, run: true, max: 300, autoJump: false }, { wait: 120 }] },
    ],
    extra: [
      { name: 'Kanone ohne alle Wechselfelder verschlossen (Gitter vor der Öffnung)', from: [3.5, 4, -159.6], heroes: ['lotti'],
        legs: [{ to: [3.5, -164], within: 0.3, run: false, max: 240 }, { wait: 30 }, { expect: 'sperreZu' }],
        mech: (r) => r.mech.pipes === 0 && r.pos[2] > -162.6, mechText: (r) => `Röhrenfahrten ${r.mech.pipes}, z ${r.pos[2].toFixed(2)}` },
      { name: 'Funkenflämmchen auf Feld 1 verletzt bei Berührung', from: [-5, 0, 2], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ until: '=Math.hypot(ent(\'b1_funke1\').pos.x - P().pos.x, ent(\'b1_funke1\').pos.z - P().pos.z) < 2.2', max: 3000 },
          { chaseKind: 'funkenflaemmchen', ids: ['b1_funke1'], max: 240, jump: false }, { wait: 60 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Hammer-Werfer auf der Hochbühne wirft Hämmer auf den Weg darunter', from: [-2.6, 3, -72.6], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ wait: 120 * 8 }], mech: (r) => r.mech.hammers >= 2, mechText: (r) => `Hämmer ${r.mech.hammers}, Treffer ${r.mech.hurts}` },
      { name: 'Pilz-Trampolin federt auf die Hochbühne, Hammer-Werfer von oben besiegt', from: [-3.2, 3, -73.2], heroes: ['lotti'],
        legs: [{ bounce: [-10.5, -78], at: [-5.6, -74.4], y: 10 }, { stompAll: 'b1_hammer1' }],
        mech: (r) => r.mech.stomped.includes('b1_hammer1'), mechText: (r) => `besiegt ${r.mech.stomped.join(' ')}` },
      { name: 'Wurfsichel aus dem ?-Block an der Landebühne', from: [-2, 4, -161.8], heroes: ['lotti'],
        legs: [{ grab: [-2, -164] }, { expect: 'sichel' }] },
      { name: 'Extraleben: Sternkiste im Kistenraum (Stampfattacke)', from: [53.2, 0, -90.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ pound: [53.2, -92.8] }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['feld1', [-5, 0, 2], 90],
      ['raetsel', [3.2, 0, 4.4], 0, null, PI / 2],
      ['kammer', [-60, 0, 1]],
      ['schacht', [-60, 6, -6.6], 1],
      ['feld2', [0, 0, -28]],
      ['trommel', [0, 2.5, -61]],
      ['pilze', [-2.6, 3, -71]],
      ['hochbuehne', [-10.5, 10, -77]],
      ['hochbuehne2', [8.6, 10.5, -83]],
      ['faehre', [0, 4, -124]],
      ['sperre', [3, 4, -159.4]],
      ['zielbuehne', [0, 10, -186.5]],
      ['wurfbude', [7.6, 10, -188.4]],
    ],
  },
};

const PORT = 5005;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,rules,route,sweep,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

// Musik-Aufrufe mitschneiden (music.play(name, opts)): window.__audio wird in main.js gesetzt → Setter umhüllt play
await page.addInitScript(() => {
  let a;
  Object.defineProperty(window, '__audio', {
    configurable: true,
    get() { return a; },
    set(v) {
      a = v;
      const m = v?.music;
      if (m && !m.__spy) { const orig = m.play.bind(m); m.__calls = []; m.play = (n, o) => { m.__calls.push([n, o ?? null]); return orig(n, o); }; m.__spy = true; }
    },
  });
});

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const PI = Math.PI;
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
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? (src?.spikes ? 'stacheln' : String(src)); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const starVisible = (i) => L.entities.some((e) => e.kind === 'star' && e.index === i && !e.hidden && e.alive && !e.removed);
  const COND = {
    // B-1
    steg1: () => { const h = L.named.get('steg1'); return !!h && h.parts?.every?.((q) => q.shown); },
    sperreOffen: () => !!L.named.get('b1_sperre')?.opened,
    sperreZu: () => !L.named.get('b1_sperre')?.opened,
    ringAn: () => ent('b1_ring')?.state === 'active',
    stern1da: () => starVisible(1),
    sichel: () => P().power === 'sichel',
    krallen: () => P().power === 'krallen',
    funken: () => P().power === 'funken',
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at, starVisible). */
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', 'starVisible', 'Y', `return (${k.slice(1)});`)(P, L, ent, at, starVisible, 1) : COND[k]());
  const movers = () => [...c.world.shapes.values()].filter((sh) => sh.mover);
  /** Mitte/Oberseite einer bewegten Plattform (benannt bzw. nächste zu z0). */
  const mover = (z0, x0) => {
    if (typeof z0 === 'string') {
      const n = L.named.get(z0), sh = n?.shape;
      if (!sh) return null;
      const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
      return { x: cx, y: sh.top, z: cz, sh };
    }
    let best = null, bd = Infinity;
    for (const sh of movers()) {
      const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
      const d = Math.abs(cz - z0) + (x0 === undefined ? 0 : Math.abs(cx - x0));
      if (d < bd) { bd = d; best = { x: cx, y: sh.top, z: cz, sh }; }
    }
    return best;
  };
  const bot = { mover, named: (id) => L.named.get(id) ?? null, star: (i) => { const e = L.entities.find((x) => x.kind === 'star' && x.index === i && x.alive && !x.hidden); return e ? [e.pos.x, e.pos.z, e.pos.y] : null; } };
  const W = {
    place(pos, o = {}) {
      const p = P();
      if (typeof pos === 'string') pos = L.data.marks[pos];
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L.runtime.status = 'play';
      if (o.scroll !== undefined && L.scroll) {
        // Bildfenster auf Pfadlänge s (laufend), damit die Figur im Bild steht
        L.scroll.restore({ s: o.scroll, speed: 0, clock: 10, waitT: 9, triggered: true, state: o.scroll >= L.scroll.s1 ? 'done' : 'run' });
        if (L.archetype?.onRespawn && o.scroll >= L.scroll.s1) { L.archetype.ended = true; L.archetype.camK = 0; }
      }
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
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, bounces: 0, waits: 0, stomped: [], hurtList: [], scrollDone: false, maxY: -99, hammers: 0, swims: 0 };
      const track = [];
      let lastJump = false;
      const hammerSeen = new Set();
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        lastJump = !!inp?.jump;
        c.setInput(inp); c.step(1); steps++;
        mech.maxY = Math.max(mech.maxY, p.pos.y);
        if (L.scroll?.state === 'done') mech.scrollDone = true;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (steps % 10 === 0) for (const e of L.entities) if (e.kind === 'wurf_hammer') hammerSeen.add(e);
        if (p.mode === 'swim') mech.swims++;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.y - t[1], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +(L.scroll?.s ?? 0).toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; mech.died = true; mech.deathCause = p.deathCause; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasnetz' || kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && p.mode !== 'swim' && !p.dead; k++) tick({}); };
      /** Im Autoscroller: warten, bis die vordere Bildgrenze über der Höhe y liegt (Landeplatz). */
      const gate = (y, max = 2400) => {
        const w = L.scroll, arch = L.archetype;
        if (y === undefined || !w || w.state === 'done' || !arch?.frame || w.dir.y < 0.5) return 0;
        let k = 0;
        while (k < max && w.state !== 'done' && y + 0.5 > w.center.y + arch.frame.front) { tick({}); k++; }
        if (k) mech.waits += k;
        return k;
      };
      const goTo = (x, z, r = 0.2, max = 400) => { for (let n = 0; n < max && !p.dead; n++) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz); if (d < r && p.mode === 'ground') return true; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); } return false; };
      // ------------------------------------------------ Aktionen wie course_w1b (go/jump/waitfor/wallclimb/input/wait, track)
      const acts = (actions) => {
        for (let ai = 0; ai < actions.length; ai++) {
          const a = actions[ai];
          const max = a.max ?? 1500;
          let n = 0;
          const dead = () => p.dead || L.runtime.status === 'dying';
          const fnOf = (s, args) => (typeof s === 'string' ? new Function(...args, `return (${s});`) : s);
          const until = a.until ? fnOf(a.until, ['p', 'c']) : null;
          if (a.go) {
            let [tx, tz] = a.go;
            const tol = a.tol ?? 0.45;
            for (; n < max; n++) {
              if (a.track !== undefined) { const m = mover(a.track); if (m) { tx = m.x + a.go[0]; tz = m.z + a.go[1]; } }
              const dx = tx - p.pos.x, dz = tz - p.pos.z;
              if (Math.hypot(dx, dz) < tol) break;
              if (until && until(p, c)) break;
              tick({ ...this.stick(dx, dz, 1), run: !!a.run, jump: !!a.hold });
              if (dead()) break;
            }
          } else if (a.waitfor) {
            const f = fnOf(a.waitfor, ['p', 'c', 'bot']);
            for (; n < max; n++) { if (f(p, c, bot)) break; tick({}); if (dead()) break; }
            if (n >= max) log.push(['FEHLER: Bedingung nicht erreicht', a.waitfor]);
          } else if (a.jump) {
            let [tx, tz] = a.jump;
            const holdN = a.hold ?? 60;
            let air = false;
            for (; n < max; n++) {
              if (a.track !== undefined) { const m = mover(a.track); if (m) { tx = m.x + (a.jump[0] ?? 0); tz = m.z + (a.jump[1] ?? 0); } }
              const dx = tx - p.pos.x, dz = tz - p.pos.z;
              const k = a.gain ?? 2.2, vmax = a.vmax ?? 11;
              let vx = dx * k, vz = dz * k;
              const vl = Math.hypot(vx, vz);
              if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
              const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
              const d = el < 0.3 ? { x: 0, y: 0 } : this.stick(ex, ez, 1);
              if (el < 2) { d.x *= el / 2; d.y *= el / 2; }
              tick({ ...d, run: a.run !== false, jump: n < holdN });
              if (p.mode !== 'ground') air = true;
              if (air && (p.mode === 'ground' || p.mode === 'wall' || p.mode === 'swim')) break;
              if (dead()) break;
            }
          } else if (a.wallclimb) {
            // Wandsprung-Kette zwischen zwei Wänden: erste Wand in Richtung dir (±X), bis Höhe until, dann zum Ziel
            const w = a.wallclimb;
            const stopF = w.stop ? fnOf(w.stop, ['p', 'c']) : null;
            let dir = w.dir, last = false, phase = 'in', top = false;
            const zfix = () => (w.z === undefined ? 0 : -Math.max(-1, Math.min(1, ((w.z - p.pos.z) * 3 - p.vel.z) * 0.5)));
            const dirInp = (x, yv) => { const s = this.stick(x, -yv, Math.min(1, Math.hypot(x, yv))); return s; };
            for (; n < max; n++) {
              if (phase === 'in') {
                const s = dirInp(dir, zfix());
                tick({ ...s, jump: n < 24 });
                last = n < 24;
                if (p.mode === 'wall') phase = 'chain';
              } else if (p.mode === 'wall' && !top) {
                if (last) { tick({ x: 0, y: 0, jump: false }); last = false; }
                else { tick({ x: 0, y: 0, jump: true }); last = true; if (p.mode !== 'wall') dir = -dir; }
              } else {
                top = top || p.pos.y >= w.until;
                let inp = dirInp(dir, zfix());
                if (top && w.then) {
                  const vx = (w.then[0] - p.pos.x) * 2.5 - p.vel.x, vz = (w.then[1] - p.pos.z) * 2.5 - p.vel.z;
                  inp = Math.hypot(vx, vz) < 0.3 ? { x: 0, y: 0 } : this.stick(vx, vz, 1);
                } else if (top) inp = { x: 0, y: 0 };
                tick({ ...inp, jump: !top });
                last = !top;
                if (p.mode === 'ground' && phase === 'chain') break;
              }
              if (w.trace && n % 3 === 0) log.push(['t', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.vel.x.toFixed(1), p.mode, p.state, top]);
              if (dead()) break;
              if (stopF && stopF(p, c)) top = true;
            }
          } else if (a.input) {
            for (; n < (a.n ?? 1); n++) { tick(a.input); if (dead()) break; }
          } else if (a.wait) {
            for (; n < a.wait; n++) { tick({}); if (dead()) break; }
          }
          log.push(['akt', ai, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          if (dead()) { log.push(['FEHLER: tot', p.deathCause]); return false; }
          if (a.go && n >= max) { log.push(['FEHLER: Ziel nicht erreicht', a.go]); return false; }
        }
        return true;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        // gehaltene Sprungtaste vom vorigen Bein loslassen (ein neuer Sprung braucht einen neuen Druck)
        if (lastJump) tick(p.mode === 'air' ? { jump: false } : {});
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until && !Lg.to && !Lg.plat) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.acts) { const ok = acts(Lg.acts); log.push([Lg.name ?? `akt${li}`, ok, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (!ok) break; continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900, walk: Lg.walk, jump: Lg.jump }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.die) {
          p.invuln = 0; p.die(typeof Lg.die === 'string' ? Lg.die : 'hit');
          let k = 0;
          for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Rückwärtssalto: kurz in Blickrichtung tippen, ducken, springen
        if (Lg.backflip) {
          const [fx, fz] = Lg.backflip;
          for (let k = 0; k < 4; k++) tick({ ...this.stick(fx, fz, 0.35) });
          for (let k = 0; k < 20 && Math.hypot(p.vel.x, p.vel.z) > 0.05; k++) tick({});
          for (let k = 0; k < 12; k++) tick({ crouch: true });
          for (let k = 0; k < 36; k++) tick({ crouch: k < 4, jump: true });
          for (let k = 0; k < 300 && p.mode !== 'ground'; k++) tick({});
          log.push(['Rückwärtssalto', p.jumpKind, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +mech.maxY.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Quetschblock: warten, bis er gerade wieder oben ist
        if (Lg.crusher) {
          const q = ent(Lg.crusher);
          let k = 0, seenBack = q.state === 'zurueck' || (Lg.fresh === false);
          for (; k < 1600; k++) {
            if (q.state === 'zurueck') seenBack = true;
            if ((seenBack || Lg.fresh === false) && q.state === 'ruhe') break;
            tick({});
          }
          log.push(['quetschblock', Lg.crusher, k, q.state]);
          continue;
        }
        // ------------------------------------------------ Sprungfeld / Pilz-Trampolin: hinaufspringen, hochfedern, zum Ziel lenken
        if (Lg.bounce) {
          const [ax, az] = Lg.at, [tx, tz] = Lg.bounce;
          gate(Lg.win ?? Lg.y);
          let k = 0, bounced = false, landed = false;
          for (; k < 900; k++) {
            if (p.dead) break;
            if (!bounced) {
              const dx = ax - p.pos.x, dz = az - p.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(ax, az, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz)))), jump: (p.mode === 'ground' && Math.hypot(dx, dz) < 1.6 && (k % 16) < 8) || (p.mode === 'air' && p.vel.y > 0), run: false });
              if (p.jumpKind === 'bounce' && p.mode === 'air') { bounced = true; mech.bounces++; }
              continue;
            }
            const steer = p.vel.y < (Lg.steerBelow ?? 6) || Lg.keepX === undefined;
            const gx = Lg.keepX !== undefined && p.vel.y >= (Lg.steerBelow ?? 6) ? Lg.keepX : tx;
            tick({ ...(steer || Lg.keepX !== undefined ? this.airSteer(gx, tz, 0, 0, 2.6, 7) : {}), jump: true });
            if (p.mode === 'ground' || p.mode === 'swim') { landed = true; break; }
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['Sprungfeld', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed || !okY) { log.push(['FEHLER: Sprungfeld', Lg.name ?? Lg.at, JSON.stringify(hist.slice(-25))]); break; }
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) { const dx = tx - p.pos.x, dz = tz - p.pos.z; tick({ ...this.stick(dx, dz, 1), run: false, jump: Lg.jumpIn && k % 40 < 12 }); }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
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
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
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
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5 && p.pos.y > (Lg.above ?? -99)) pounded = true;
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
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
          if (Lg.group && !L.named.get(Lg.group)?.done) log.push(['FEHLER: Felder nicht alle an', Lg.group]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen (zum Ziel drehen, Aktion), Rückkehr abwarten
        if (Lg.throwAt) {
          const [tx, tz] = Lg.throwAt;
          let k = 0;
          for (; k < 200 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995) break;
            tick({ ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          for (let n = 0; n < (Lg.wait ?? 240); n++) tick({});
          log.push(['sichel', `${Lg.throwAt}`, k, p.power]);
          continue;
        }
        // ------------------------------------------------ Wurfball (Id) aufheben, zum Ziel drehen, werfen
        if (Lg.ball) {
          const b = ent(Lg.ball);
          let k = 0;
          for (; k < 600 && p.holding !== b && !p.dead; k++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (d > 0.8) { tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5 + 0.2)), run: false }); continue; }
            if (dot < 0.9) { tick({ ...this.stick(dx, dz, 0.15), run: false }); continue; }
            tick({ action: k % 8 === 0 });
          }
          const got = p.holding === b;
          const [tx, tz] = Lg.throwTo;
          if (Lg.stand) goTo(Lg.stand[0], Lg.stand[1], 0.2);
          for (let n = 0; n < 200 && !p.dead; n++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995 && p.hSpeed() < 0.3) break;
            tick(dot > 0.995 ? {} : { ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          mech.thrown = got && p.holding !== b;
          log.push(['wurfball', Lg.ball, got, mech.thrown, k, +b.pos.x.toFixed(2), +b.pos.y.toFixed(2), +b.pos.z.toFixed(2)]);
          if (!got) log.push(['FEHLER: Ball nicht aufgehoben', Lg.ball]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const pw0 = p.power;
          goTo(bx, bz);
          for (let k = 0; k < 90 && p.hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          let tries = 0;
          for (; tries < 4 && p.power === pw0 && !p.dead; tries++) {
            goTo(back[0], back[1]);
            for (let k = 0; k < 40; k++) tick({});
            for (let k = 0; k < 240 && !p.dead; k++) {
              const dx = bx - p.pos.x, dz = bz - p.pos.z;
              if (k > 10 && p.mode === 'ground') break;
              tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 4) : this.stick(dx, dz, 0.5)), jump: k < 40, run: false });
            }
            for (let k = 0; k < 30; k++) tick({});
            if (p.power === pw0) { const n = this.chase('powerup', { max: 300 }); void n; }
          }
          log.push(['power', Lg.grab.join(','), p.power, tries]);
          if (p.power === pw0) log.push(['FEHLER: Power-up nicht geholt', Lg.grab]);
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf: zur Wand springen und dagegen drücken
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.pos.y > (Lg.top ?? 99) - 0.1 && p.mode === 'ground') { top = true; break; }
            if (p.mode === 'wall') { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: false, jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : p.vel.y > 0 });
          }
          if (Lg.then) for (let n = 0; n < 300 && !p.dead; n++, k++) { const dx = Lg.then[0] - p.pos.x, dz = Lg.then[1] - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d))), run: false }); }
          log.push(['klettern', `${Lg.climb}`, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!top && !Lg.allowFail) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ------------------------------------------------ Weitsprung: Anlauf Richtung Ziel, ducken, springen; in der Luft zum Ziel lenken
        if (Lg.long) {
          const [tx, tz] = Lg.long;
          let k = 0, longed = false;
          const ru = Lg.runup ?? 10;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (k > ru + 20 && p.mode === 'ground') break;
            if (p.state === 'longjump') longed = true;
            if (p.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            const crouch = k >= ru && k < ru + 3, jump = k >= ru + 2 && k < ru + 6;
            tick({ ...this.stick(dx, dz, 1), run: true, crouch, jump });
          }
          log.push(['weitsprung', `${Lg.long}`, longed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        if (holdJ) { for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({}); gate(Lg.win ?? Lg.y); }
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        const y0 = p.pos.y;
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const highEnough = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          const done = dist < within && highEnough && (Lg.y === undefined || p.mode === 'ground' || p.mode === 'swim') && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          if (holdJ && landed && p.mode === 'ground' && !highEnough && i > 20) { landed = false; airborne = false; j0 = i + 1; gate(Lg.win ?? Lg.y); }
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, Lg.vmax ?? 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          if (j0 === null && Lg.jumpAt && Lg.edgeJump && p.mode === 'ground' && dist > 0.6) {
            const ux = dx / dist, uz = dz / dist, h = c.world.raycastDown(p.pos.x + ux * 0.45, p.pos.y + 0.6, p.pos.z + uz * 0.45, 1.2);
            if (!h || h.y < p.pos.y - 0.4) j0 = i;
          }
          const jump = (holdJ && j0 !== null ? (i - j0 >= 0 && i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && Lg.swimJump !== false && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, +(L.scroll?.center?.y ?? 0).toFixed(1)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to, Lg.y, y0]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.hammers = hammerSeen.size;
      mech.lives = L.runtime.save?.lives;
      mech.wand = L.named.get('b1_wand')?.info?.().on ?? '';
      mech.ring = L.entities.find((e) => e.kind === 'sternring')?.got ?? 0;
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
        p.invuln = Math.max(p.invuln, o.vuln ? 0 : 5);
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
    kinds: () => { const m = {}; for (const e of L.entities) if (e.alive !== false && !e.removed) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
  };
  window.__ba = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__ba[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}blume_a_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__ba.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ------------------------------------------------------------------ Remix-Daten und Gegenprobe Basis (in der Seite)
/** Remix-Kennzahlen des geladenen Levels und Rohdaten der Basis (Registry). */
function remixInfo(baseId) {
  const c = window.__course, L = c.level, d = L.data, CL = window.__courseLevels;
  const raw = CL.raw(d.id), base = CL.raw(baseId);
  const calls = window.__audio?.music?.__calls ?? [];
  const sum = (l) => JSON.stringify(l, (k, v) => (typeof v === 'function' ? `fn:${v.name}` : v));
  return {
    stub: CL.isRemix(raw) && raw.remix?.base === baseId && !raw.segments, remix: d.remix ? { base: d.remix.base, light: d.remix.light, variant: d.remix.variant, added: d.remix.added, changed: d.remix.changed, removed: d.remix.removed } : null,
    title: d.title, world: d.world, theme: d.theme, light: c.view.theme.light ?? null, music: d.music, variant: d.musicVariant ?? null, timeLimit: L.runtime.timeLimit,
    archetype: d.archetype, stamp: L.entities.filter((e) => e.kind === 'stamp').length, starsData: d.stars?.length ?? 0,
    starEntities: L.entities.filter((e) => e.kind === 'star').length + L.entities.filter((e) => e.kind === 'pilzlingsturm' && e.carry?.star !== undefined).length,
    call: calls.filter((x) => x[0] === d.music).slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
    baseHash: sum(base), baseTheme: base.theme, baseMusic: base.music, baseVariant: base.musicVariant ?? null, baseRemix: base.remix ?? null, baseStamp: !!base.stamp,
    baseStars: base.stars?.length ?? 0, baseTime: base.timeLimit, baseTitle: base.title,
  };
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id} (Remix von ${R.base})`);
  // Gegenprobe vorab: Rohdaten der Basis vor dem ersten Laden eines Remix (frische Seite mit dem Basislevel)
  let baseBefore = null;
  if (PARTS.has('load') || PARTS.has('rules')) {
    loaded = null;
    if (!(await load(R.base))) { check(`${R.base} lädt`, false); continue; }
    baseBefore = await sc((b) => {
      const CL = window.__courseLevels, L = window.__course.level;
      const sum = (l) => JSON.stringify(l, (k, v) => (typeof v === 'function' ? `fn:${v.name}` : v));
      const k = {}; for (const e of L.entities) k[e.kind] = (k[e.kind] ?? 0) + 1;
      return { hash: sum(CL.raw(b)), kinds: k, theme: L.data.theme, music: L.data.music, variant: L.data.musicVariant ?? null, time: L.runtime.timeLimit, title: L.data.title, stars: L.data.stars?.length ?? 0 };
    }, R.base);
  }
  loaded = null;
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const info = await sc(remixInfo, R.base);
    const kinds = await W('kinds');
    console.log(`  „${info.title}“, Welt ${info.world}, Thema ${info.theme} (Licht ${info.light}), Musik ${info.music} (Variante ${info.variant}; music.play ${JSON.stringify(info.call)}), Zeitlimit ${info.timeLimit} s, Sterne ${info.starEntities}, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: Remix-Platzhalter (remixOf, Basis ${R.base}) wird von der Registry aufgelöst`, info.stub && info.remix?.base === R.base);
    check(`${id}: „${R.meta.title}“, Welt 11, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}${R.meta.variant ? ` (Variante ${R.meta.variant})` : ' (ohne Variante)'}, Archetyp ${R.meta.archetype}, ${R.meta.stars} Sterne, kein Stempel`,
      info.title === R.meta.title && info.world === 11 && info.timeLimit === R.meta.time && info.theme === R.meta.theme && info.music === R.meta.music && info.variant === R.meta.variant
      && info.archetype === R.meta.archetype && info.starEntities === R.meta.stars && info.stamp === 0
      && (R.meta.variant ? info.call?.[1]?.variant === R.meta.variant && info.mVariant === R.meta.variant : !info.call?.[1]?.variant));
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    // Gegenprobe: Rohdaten der Basis unverändert, Basis selbst wie vorher
    check(`${id}: Gegenprobe – Rohdaten der Basis ${R.base} nach dem Remix unverändert (Thema ${info.baseTheme}, Musik ${info.baseMusic} ohne Variante, ${info.baseStars} Sterne, Stempel, ${info.baseTime} s, kein Remix-Feld)`,
      !!baseBefore && info.baseHash === baseBefore.hash && !info.baseRemix && info.baseVariant === null && info.baseStamp);
    // die Basis noch einmal laden: Gegnerzahlen und Daten wie vor dem Remix
    loaded = null;
    await load(R.base);
    const baseAfter = await sc(() => { const L = window.__course.level; const k = {}; for (const e of L.entities) k[e.kind] = (k[e.kind] ?? 0) + 1; return { kinds: k, theme: L.data.theme, music: L.data.music, variant: L.data.musicVariant ?? null, time: L.runtime.timeLimit, title: L.data.title }; });
    const same = Object.entries(R.baseEnemies ?? {}).every(([k, n]) => (baseAfter.kinds[k] ?? 0) === n) && baseAfter.theme === baseBefore.theme && baseAfter.title === baseBefore.title && baseAfter.time === baseBefore.time && baseAfter.variant === null;
    check(`${id}: Gegenprobe – Basis ${R.base} geladen wie vorher („${baseAfter.title}“, ${baseAfter.theme}, ${baseAfter.time} s, ${Object.entries(R.baseEnemies ?? {}).map(([k, n]) => `${k} ${baseAfter.kinds[k] ?? 0}/${n}`).join(', ')})`, same);
    loaded = null;
    await load(id);
  }

  // ------------------------------------------------ Remix-Regeln wirksam (je Level, mit Gegenprobe)
  for (const r of !PARTS.has('rules') ? [] : pick(R.rules ?? [])) {
    await load(id);
    const res = await sc(r.fn, r.arg ?? null);
    if (process.env.VERBOSE) console.log('     ', JSON.stringify(res));
    check(`${id}: Regel – ${r.name}${r.text ? ` (${r.text(res)})` : ''}`, !!r.ok(res));
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2, ...(R.place ?? {}) });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Restzeit ${res.rt.time} s`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}${m.text ? ` (${m.text(res)})` : ''}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt.slice(0, 3), { settle: 6, ...(R.sweepScroll ? { scroll: pt[3] } : {}) });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.slice(0, 3).join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne
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

  // ------------------------------------------------ Geheimnisse und Mechanik
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

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = PI / 2, scroll] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw, ...(scroll !== undefined ? { scroll } : {}) });
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
