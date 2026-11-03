// Welt Blume (Remix-Welt 2, Präfix B, Welt 11): B-9 „Feuertürme im Abendrot“ (Remix von 5-1), B-10 „Honigwaben am Taghimmel“
// (Remix von S-6), B-11 „Stachelstege im Suchlicht“ (Remix von 8-1 mit Suchscheinwerfern aus 5-7) und B-12 „Boss-Blitz unterm
// Sternenzelt“ (Boss-Marathon). Prüft je Level: Laden ohne Konsolenfehler/-warnungen, Daten (Welt 11, Titel, Thema mit
// Licht-Variante, Musik mit Klang-Variante im Musiksystem, Zeit, Sterne, kein Stempel), Remix-Regeln wirksam (Licht im Thema,
// Klang-Variante, Gegner entfernt/getauscht/neu, Zeitlimit), Gegenprobe: das Basislevel bleibt unverändert (Rohdaten vor/nach
// dem Auflösen, Basis lädt wie bisher), Routen-Bot Lotti und Greta von Start bis Ziel (echte Eingaben über
// __course.setInput/step, kein Teleport auf der Route), alle Sterne mit der echten Mechanik samt Gegenproben, Extras,
// Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera
// (tests/out/blume_c_*.png).
//
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_blume_c.mjs [B-9|B-10|B-11|B-12]
//   PARTS=load,base,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min, z. B. erst load,base,route,sweep, dann
//   targets,extra, dann shots) · HEROES=lotti,greta · ONLY=<Text|Text> · VERBOSE=1 · TRACE=1 · SHOTS=<Name|Name> · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Treffer-Versuche werden gezählt.
// Gegenproben, die einen Tod erwarten, laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PI = Math.PI;

// ====================================================================================================================
// Routen
// ====================================================================================================================
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, jumpZ, runUp, within, run, slow, max, land,
//   autoJump, stopIf, partial } · { wait } · { hop } · { crouch } · { star: i } · { chaseKind, ids } · { expect } · { until, max }
//   (Bedingung: Name aus COND oder Ausdruck '=…') · { warp: [x, z] } · { pipe: [x, z] } (Glasröhre) · { stompAll: Id-Anfang | [Ids] }
//   · { shootR: [Ids], dist } (Gegner radial anvisieren, Aktion: Feuerball/Sichel) · { fire: [x, z] } / { throwAt: [x, z] }
//   (zum Ziel drehen, Aktion) · { bounce: Id, to2 } (Sprung gehalten auf den Gegner, hoher Abprall) · { pound: [x, z] }
//   · { glide } · { power: Name } · { setTime: s } · { mark } · { kill: true }
const Y9 = 1, SKY9 = 9, PX9 = 2.5, SX9 = 53.5, SZ9 = 9;   // B-9: Strand, Schwebeinsel, Glasröhre, schlafender Turm

const ROUTES = {
  'B-9': {
    base: '5-1',
    start: [0, Y9, 10],
    meta: { title: 'Feuertürme im Abendrot', stars: 3, time: 100, theme: 'beach@abend', music: 'course_beach', variant: 'abend', archetype: 'parcours', light: 'abend' },
    enemies: { pilzlingsturm: 5, feuer_werfer: 4, schluesselmuenze: 0, rammbock_bulle: 0, sandtaucher: 0, strandfackel: 4, kampfraum: 1, warpbox: 2, task: 0, checkpoint: 0 },
    baseEnemies: { pilzlingsturm: 0, feuer_werfer: 0, schluesselmuenze: 5, rammbock_bulle: 4, sandtaucher: 4, warpbox: 2 },
    remixChecks: [
      { name: 'nur Strand und Schwebeinsel (kein Ritt, kein Kontrollpunkt, keine Schlüsselmünzen), vier Pilzlingstürme aus je 4 Pilzlingen mit Feuer-Werfer als Reiter, schlafender Dreierturm (wake 0), Kampfraum über Türme und Werfer, Ziel-Warp-Box verborgen, vier Strandfackeln, sieben Zeit-Uhren je +10 s, Zielmast auf der Schwebeinsel',
        ok: (r) => r.b9 && r.b9.towers === 'turm_l:4+feuer_werfer,turm_m:4+feuer_werfer,turm_hain:4+feuer_werfer,turm_r:4+feuer_werfer' && r.b9.sleeper?.count === 3 && r.b9.sleeper.wake === 0
          && r.b9.room === 8 && r.b9.warpHidden && r.b9.torches === 4 && r.b9.clocks === 7 && r.b9.clockSec === 10 && !r.b9.ride && r.b9.archetype === 'parcours' && r.b9.keys === 0
          && r.b9.goalY === SKY9 && r.b9.cp === null && r.b9.star0hidden && r.rtLimit === 100 },
    ],
    main: [
      { name: '?-Block mit Funkenblüte', to: [-2, 3.4], within: 0.2, run: false }, { hop: 26 }, { wait: 20 }, { chaseKind: 'powerup', max: 900 },
      { expect: 'funken' },
      { name: 'Zeit-Uhr', to: [-9, 6], within: 0.6 },
      { name: 'Feuerturm links (Turm, dann Werfer)', shootR: ['turm_l', 'werfer_l'], dist: 4.6, gap: 34 },
      { name: 'Zeit-Uhr', to: [-22, -4], within: 0.6 },
      { to: [-13, -10.4], within: 0.8 },
      { name: 'Zeit-Uhr', to: [-6, -9.5], within: 0.6 },
      { name: 'Feuerturm Mitte (vom Ufer aus)', shootR: ['turm_m', 'werfer_m'], dist: 4.4, gap: 34 },
      { to: [-1, 2], within: 0.8 },
      { name: 'Zeit-Uhr', to: [9, 6.5], within: 0.6 },
      { to: [14.2, 12.4], within: 0.6 },
      { name: 'Feuerturm Palmenhain (von hinten)', shootR: ['turm_hain', 'werfer_hain'], dist: 4.0, gap: 34 },
      { name: 'Zeit-Uhr', to: [24.5, 2.5], within: 0.6 },
      { name: 'Feuerturm rechts', shootR: ['turm_r', 'werfer_r'], dist: 4.6, gap: 34 },
      { until: 'warpOffen9', max: 240 },
      { to: [25.4, -13.4], within: 0.8 },
      { name: 'Zeit-Uhr im Flachwasser', to: [6, -16.5], within: 0.6 },
      { to: [1, -20.4], within: 0.4, run: false },
      { name: 'Ziel-Warp-Box', warp: [1, -23] },
      { expect: 'onIsle9' },
      { to: [0, -46.5], jump: 12, within: 0.5 },
      { name: 'Zielmast', to: [0, -53.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'vier Feuertürme samt Werfern mit Feuerbällen besiegt (Kampfraum frei), Warp-Box zur Schwebeinsel, sechs Zeit-Uhren eingesammelt, Restzeit > 20 s',
        ok: (r) => r.mech.stomped.filter((x) => x.startsWith('turm_')).length === 4 && r.room === 'done' && r.mech.warps === 1 && r.clocks >= 6 && r.rt.time > 20 },
    ],
    targets: [
      { name: 'Stern 0: mit der Funkenblüte die vier Strandfackeln links anzünden – der Stern erscheint zwischen ihnen', star: 0, from: [-27, Y9, -1.6], place: { power: 'funken' },
        legs: [{ expect: 'stern0Versteckt' },
          { to: [-30.2, -4.4], within: 0.3, run: false }, { fire: [-33.2, -4.4], after: 50 },
          { to: [-29.4, -11.6], within: 0.3, run: false }, { fire: [-32.4, -11.8], after: 50 },
          { to: [-27.6, -12.0], within: 0.3, run: false }, { fire: [-24.6, -12.2], after: 50 },
          { to: [-26.4, -5.2], within: 0.3, run: false }, { fire: [-23.4, -5.2], after: 50 },
          { expect: 'fackelnAn' }, { until: 'stern0Sichtbar', max: 120 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Feuer (an die Fackeln laufen, draufspringen, stampfen)', star: 0, expectNot: true, from: [-30, Y9, -2], heroes: ['lotti'],
        legs: [{ to: [-33.2, -4.4], within: 0.4, max: 200, partial: true }, { pound: [-33.2, -4.4] }, { to: [-23.4, -5.2], within: 0.4, max: 400, partial: true }, { hop: 30 }, { wait: 60 }, { expect: 'fackelnAus' }] },
      { name: 'Stern 1: Glasröhre in der Mitte hinauf – das Ende schießt einen auf die Wolke, dort liegt der Stern', star: 1, from: [PX9, Y9, -1],
        legs: [{ pipe: [PX9, -4.4] }, { expect: 'aufWolke' }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Glasröhre (Sprung unter der Wolke)', star: 1, expectNot: true, from: [PX9 + 2.2, Y9, -15.2], heroes: ['lotti'],
        legs: [{ hop: 40 }, { wait: 30 }, { to: [PX9 + 1.4, -14.6], jump: 40, jumpAt: 0.5, within: 0.4, run: false, max: 200, partial: true }, { wait: 60 }] },
      { name: 'Stern 2: rechts auf den schlafenden Dreierturm springen (Sprung gehalten) – der hohe Abprall reicht bis zum Stern', star: 2, from: [SX9, Y9, SZ9 + 1.6],
        legs: [{ expect: 'turmSchlaeft' }, { bounce: 'schlafturm' }, { wait: 30 }], shot: 'stern2',
        mech: (r) => r.mech.bounces >= 1, mechText: (r) => `Abprall ${r.mech.bounces}, Scheitel y ${r.mech.apex?.toFixed(2)}` },
      { name: 'Stern 2 nicht ohne den Turm (Sprung daneben)', star: 2, expectNot: true, from: [SX9 - 1.1, Y9, SZ9], heroes: ['lotti'],
        legs: [{ hop: 40 }, { wait: 40 }] },
    ],
    extra: [
      { name: 'Ziel-Warp-Box bleibt verborgen, solange Feuertürme stehen', from: [1, Y9, -18.6], heroes: ['lotti'],
        legs: [{ expect: 'warpZu9' }, { to: [1, -23], jump: 30, within: 0.3, run: false, max: 300, partial: true }, { wait: 60 }, { expect: 'nichtAufInsel9' }] },
      { name: 'Feuer-Werfer reitet oben auf dem Turm und fällt mit ihm herab (Feuerbälle nehmen je eine Stufe)', from: [-19.4, Y9, 0.6], heroes: ['lotti'], place: { power: 'funken' },
        legs: [{ expect: 'werferOben' }, { shootR: ['turm_l'], dist: 4.6, gap: 34 }, { wait: 60 }, { expect: 'werferUnten' }] },
      { name: 'Zeit-Uhr: +10 s; nach einem Neustart liegen alle Uhren wieder da', from: [-9, Y9, 8.4], heroes: ['lotti'],
        legs: [{ mark: true }, { to: [-9, 5.2], within: 0.4, run: false }, { expect: '=L.runtime.timeLeft > window.__mark.time + 9' }, { expect: '=named("uhren").got === 1' },
          { kill: true }, { wait: 420 }, { expect: '=!P().dead && named("uhren").items.every((i) => !i.taken)' }] },
      { name: 'Zeitablauf: nach 100 s ohne Uhren ist der Versuch vorbei', from: [0, Y9, 10], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ setTime: 1.5 }, { wait: 300 }], mech: (r) => r.cause === 'time', mechText: (r) => `Ursache ${r.cause}` },
      { name: 'Schlafender Turm: Draufspringen nimmt eine Stufe, nach 2,4 s ist er wieder ein Dreierturm; er fällt nie ganz um', from: [SX9, Y9, SZ9 + 1.6], heroes: ['lotti'],
        legs: [{ bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { expect: '=ent("schlafturm").count === 2' }, { wait: 420 }, { expect: '=ent("schlafturm").count === 3' },
          { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] }, { bounce: 'schlafturm', to2: [SX9, SZ9 + 2.2] },
          { expect: '=!!ent("schlafturm") && ent("schlafturm").count >= 1 && !ent("schlafturm").defeated' }] },
      { name: 'Krümel feiert in seiner Wandhöhle (keine Käfer), dort liegt eine Zeit-Uhr', from: [48, Y9, 3.6], heroes: ['lotti'],
        legs: [{ expect: '=named("kruemel").state === "happy"' }, { mark: true }, { to: [48, -6], within: 0.5, run: false }, { expect: '=L.runtime.timeLeft > window.__mark.time + 7' }] },
    ],
    shots: [
      ['start', [0, Y9, 10]],
      ['fackeln', [-28.4, Y9, -3.2]],
      ['turm_links', [-19.4, Y9, 10.6]],
      ['roehre', [PX9, Y9, 0.4]],
      ['wolke', [PX9, 8.4, -14.6]],
      ['hain', [16.4, Y9, 12.4]],
      ['rechts', [30.6, Y9, 1.4]],
      ['schlafturm', [SX9 - 2, Y9, 13.4]],
      ['hoehle', [48, Y9, -3]],
      ['sandbank', [1, Y9, -18.6]],
      ['insel', [0, SKY9, -45]],
    ],
  },
};


// ====================================================================================================================
// Prüfstand
// ====================================================================================================================
const PORT = 5025;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split("|").some((o) => t.name.includes(o))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,base,route,sweep,targets,extra,shots').split(','));
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
  const named = (id) => L.named.get(id);
  const ent = (id) => L.entities.find((e) => e.spec?.id === id && !e.removed);
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? src?.tag ?? String(src); return orig(src); };
  };
  wrapHurt();
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const onGround = () => P().mode === 'ground' && !P().dead;
  const COND = {
    // allgemein
    funken: () => P().power === 'funken',
    sichel: () => P().power === 'sichel',
    krallen: () => P().power === 'krallen',
    goal: () => L.runtime.status === 'goal' || L.runtime.status === 'done',
    playing: () => L.runtime.status === 'play',
    stern0Versteckt: () => L.entities.some((e) => e.kind === 'star' && e.index === 0 && e.hidden && !e.removed),
    stern0Sichtbar: () => !!L.runtime.stars[0] || L.entities.some((e) => e.kind === 'star' && e.index === 0 && !e.hidden && !e.removed),
    stern1Sichtbar: () => !!L.runtime.stars[1] || L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && !e.removed),
    stern2Sichtbar: () => !!L.runtime.stars[2] || L.entities.some((e) => e.kind === 'star' && e.index === 2 && !e.hidden && !e.removed),
    // B-9
    warpOffen9: () => !named('warp1')?.hidden,
    warpZu9: () => !!named('warp1')?.hidden,
    onIsle9: () => P().pos.z < -36 && P().pos.y > 8.5 && !P().dead,
    nichtAufInsel9: () => P().pos.z > -32 && !P().dead,
    fackelnAn: () => L.entities.filter((e) => e.kind === 'strandfackel' && e.lit).length === 4,
    fackelnAus: () => L.entities.filter((e) => e.kind === 'strandfackel' && e.lit).length === 0,
    aufWolke: () => onGround() && P().pos.y > 8 && Math.abs(P().pos.z + 14.4) < 2,
    turmSchlaeft: () => { const e = ent('schlafturm'); return !!e && e.state === 'idle' && e.count === 3; },
    werferOben: () => { const t = ent('turm_l'), w = ent('werfer_l'); return !!t && !!w && w.pos.y > t.pos.y + 2.4; },
    werferUnten: () => { const t = L.entities.find((e) => e.spec?.id === 'turm_l'), w = ent('werfer_l'); return (!t || t.defeated || t.removed) && !!w && w.pos.y < 2.4; },
  };
  // Bedingung: Name aus COND oder Ausdruck '=…' (P, L, named, ent, c, onGround, at im Zugriff)
  const cond = (k) => (k.startsWith('=') ? Function('P', 'L', 'named', 'ent', 'c', 'onGround', 'at', `return (${k.slice(1)});`)(P, L, named, ent, c, onGround, at) : COND[k]());
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      if (p.helmet) p.dropHelmet?.('gone');
      p.holding = null;
      p.reset(pos, o.yaw ?? PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (o.helmet) p.wearHelmet(o.helmet);
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
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, taps: 0, props: 0, glides: 0, throws: 0, stomped: [], hurtList: [], schollen: 0 };
      const foes0 = L.entities.filter((e) => e.enemy && e.alive && !e.defeated);
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const schollenSeen = new Set();
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); if (window.__trace) log.push(['TREFFER', p.lastHurt, steps, JSON.stringify(hist.slice(-12))]); }
        if (p.mode === 'ground' && p.ground?.tag === 'sinkscholle' && !schollenSeen.has(p.ground)) { schollenSeen.add(p.ground); mech.schollen++; }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '', +Math.hypot(p.vel.x, p.vel.z).toFixed(1)]);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript && p.script?.type !== 'house') {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && p.script?.type !== 'house') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (o.house && L.house && L.house.phase !== 'play') { log.push(['Raum vorbei', L.house.phase]); break; }
        if (p.dead || L.runtime.status !== 'play') {
          if (Lg.until && cond(Lg.until)) { log.push(['bis', Lg.until, 0]); continue; }
          if (!(Lg.wait || Lg.expect || Lg.until)) break;
        }
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 40; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.kill) { p.invuln = 0; p.die('fall'); log.push(['tot gesetzt']); continue; }
        // ------------------------------------------------ Knochenflieger abwarten: stehen bleiben, beim Sturzflug hochspringen (Reflex) – er landet unter der Figur
        if (Lg.waitFlier) {
          const e = ent(Lg.waitFlier);
          let k = 0;
          for (; k < (Lg.max ?? 900) && e && e.alive && !e.defeated && !e.removed && !p.dead; k++) tick(p.mode === 'air' ? this.airSteer(Lg.hold?.[0] ?? p.pos.x, Lg.hold?.[1] ?? p.pos.z, 0, 0, 3, 4) : {});
          const ok = !e || !e.alive || e.defeated || e.removed;
          if (ok) mech.stomped.push(Lg.waitFlier);
          log.push(['flieger', Lg.waitFlier, ok, k]);
          for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick(this.airSteer(Lg.hold?.[0] ?? p.pos.x, Lg.hold?.[1] ?? p.pos.z, 0, 0, 3, 4));
          continue;
        }
        if (Lg.power) { p.setPower(Lg.power); log.push(['power', Lg.power]); continue; }
        if (Lg.dump) { log.push(['übrig', Lg.dump, L.entities.filter((e) => e.kind === Lg.dump && e.alive && !e.removed && !e.hidden).map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1)])]); continue; }
        if (Lg.unmask) { p.dropHelmet?.('gone'); log.push(['Maske ab', p.helmet ?? null]); continue; }
        // ------------------------------------------------ Kampf-Raum: Gegner der Reihe nach auf Abstand dist anvisieren (radial heran bzw. zurück), zu ihm
        // drehen, Aktion (Feuerball mit der Funkenblüte, Tatzenhieb mit dem Krallen-Anzug); visible: nur solange er verwundbar ist
        if (Lg.shootR) {
          const ids = Lg.shootR, done = [];
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          const alive = (e) => e && e.alive && !e.defeated && !e.removed;
          for (const id of ids) {
            const e = ent(id);
            if (!alive(e)) { if (e) done.push(id); continue; }
            let k = 0, shots = 0, cool = 0;
            const want = Lg.dist ?? 4.5;
            for (; k < (Lg.max ?? 1100) && alive(e) && !p.dead && !(o.house && L.house?.phase !== 'play'); k++) {
              if (cool > 0) cool--;
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode !== 'ground') { tick({}); continue; }
              const tooFar = d > want + (Lg.slack ?? 0.6), tooNear = d < (Lg.min ?? want - (Lg.slack ?? 0.6));
              if (tooFar || tooNear) { const s = tooFar ? 1 : -1; tick({ ...this.stick(dx * s, dz * s, Math.max(0.3, Math.min(1, Math.abs(d - want) / 1.2))), run: !!Lg.run }); continue; }
              const yawWant = Math.atan2(-dz, dx);
              if (Math.abs(wrap(yawWant - p.yaw)) > (Lg.aim ?? 0.08)) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              if (Lg.visible && !e.vulnerable) { tick({}); continue; }
              if (cool <= 0) { tick({ action: true }); shots++; cool = Lg.gap ?? 30; continue; }
              tick({});
            }
            if (!alive(e)) { done.push(id); mech.stomped.push(id); }
            log.push(['anvisiert', id, !alive(e), shots, k, e.count ?? e.hp ?? null, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]);
          }
          for (let i = 0; i < 20; i++) tick({});
          if (done.length < ids.length && !Lg.partial) log.push(['FEHLER: nicht alle besiegt', ids.filter((x) => !done.includes(x)).join(' ')]);
          continue;
        }
        // ------------------------------------------------ Stampfattacke auf Köpfe (Rankenschnapper: e.head) bzw. Gegner der Reihe nach
        if (Lg.poundOn) {
          const done = [];
          for (const id of Lg.poundOn) {
            const e = ent(id);
            let tries = 0;
            while (e && e.alive && !e.defeated && !e.removed && tries++ < (Lg.tries ?? 4) && !p.dead && !(o.house && L.house?.phase !== 'play')) {
              const tgt = () => e.head ?? e.pos;
              // Anlauf: in back m Abstand vor dem Kopf stehen (auf der Seite der Figur)
              for (let k = 0; k < 400; k++) {
                const h = tgt(), dx = h.x - p.pos.x, dz = h.z - p.pos.z, d = Math.hypot(dx, dz);
                if (p.mode === 'ground' && d < (Lg.back ?? 1.6) + 0.3 && d > (Lg.back ?? 1.6) - 0.5) break;
                if (p.mode !== 'ground') { tick({}); continue; }
                const s = d > (Lg.back ?? 1.6) ? 1 : -1;
                tick({ ...this.stick(dx * s, dz * s, Math.max(0.3, Math.min(1, Math.abs(d - (Lg.back ?? 1.6))))), run: false });
              }
              let k = 0, pounding = false;
              for (; k < 400; k++) {
                const h = tgt(), dx = h.x - p.pos.x, dz = h.z - p.pos.z, d = Math.hypot(dx, dz);
                if (k > 5 && p.mode === 'ground') break;
                if (!pounding && k > 8 && d < 0.35 && p.vel.y < 3 && p.pos.y > h.y + 0.2) pounding = true;
                tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(h.x, h.z, 0, 0, 3, 6) : this.stick(dx, dz, 1)), jump: k < 34, run: false });
              }
              for (let q = 0; q < (Lg.after ?? 12); q++) tick({});
            }
            if (!e || !e.alive || e.defeated || e.removed) { done.push(id); mech.stomped.push(id); }
            log.push(['stampfattacke', id, !e || !e.alive || e.defeated || e.removed, tries]);
          }
          if (done.length < Lg.poundOn.length && !Lg.partial) log.push(['FEHLER: nicht alle besiegt', Lg.poundOn.filter((x) => !done.includes(x)).join(' ')]);
          continue;
        }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.action) { for (let k = 0; k < Lg.action; k++) tick({ action: k % 2 === 0 }); log.push(['aktion', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.helmet]); continue; }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: Lg.max ?? 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Bildschirm-Tipp auf ein Antipp-Ziel (wie ein Finger)
        if (Lg.tap) {
          const h = named(Lg.tap);
          const t = L.taps?.targets.find((x) => x.owner === h);
          c.snapCamera();
          const sp = t ? L.taps.screenPos(t) : null;
          const before = JSON.stringify(h?.info?.() ?? null);
          if (sp?.visible) L.taps.tapScreen(sp.x, sp.y);
          for (let k = 0; k < (Lg.after ?? 60); k++) tick({});
          const after = JSON.stringify(h?.info?.() ?? null);
          mech.taps++;
          log.push(['antippen', Lg.tap, sp ? [Math.round(sp.x), Math.round(sp.y), sp.visible] : null, after]);
          if (!h || before === after) log.push(['FEHLER: Antippen ohne Wirkung', Lg.tap]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.rides;
          let k = 0;
          for (; k < (Lg.max ?? 900) && mech.rides === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: Lg.run ?? false, jump: !!Lg.jump && p.mode === 'ground' && Math.hypot(dx, dz) < (Lg.jumpAt ?? 1.6) });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.rides > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.rides === r0 && !Lg.partial) { log.push(['FEHLER: Glasröhre nicht betreten', Lg.pipe]); break; }
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
          if (!rode && !Lg.partial) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Gleitflug: Anlauf, Sprung (Taste gehalten), im Fall weiter halten
        if (Lg.glide) {
          const [tx, tz] = Lg.glide;
          const holdAll = Lg.hold !== false;
          let k = 0, air = false;
          const y0 = p.pos.y;
          for (; k < 1500 && !p.dead; k++) {
            if (air && p.mode === 'ground') break;
            if (p.mode === 'air') air = true;
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            const st = p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.2, 10) : this.stick(dx, dz, 1);
            tick({ ...st, run: true, jump: holdAll ? true : k < 30 });
          }
          if (air) mech.glides++;
          log.push(['gleiten', air, k, +y0.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '', p.state]);
          continue;
        }
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
        // ------------------------------------------------ Propeller-Helm: hochfliegen, mit gehaltener Aktion hinübergleiten
        if (Lg.prop) {
          const [tx, tz] = Lg.prop;
          if (p.helmet !== 'propeller') log.push(['FEHLER: kein Propeller-Helm']);
          tick({ action: true });
          let k = 0, apex = p.pos.y, via = Lg.via ?? null;
          for (; k < 1500; k++) {
            apex = Math.max(apex, p.pos.y);
            if (via && Math.hypot(via[0] - p.pos.x, via[1] - p.pos.z) < 0.6 && p.vel.y <= 0.5) via = null;
            const [gx, gz] = via ?? [tx, tz];
            const rising = p.vel.y > 0 && k < (Lg.rise ?? 60);
            const steer = rising && Lg.straight ? {} : this.airSteer(gx, gz, 0, 0, 2.2, Lg.vmax ?? 6);
            tick({ ...steer, run: true });
            if (k > 10 && p.mode === 'ground') break;
          }
          mech.props++;
          log.push(['Propeller', k, +apex.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.ground?.tag]);
          continue;
        }
        // ------------------------------------------------ Gegner (Ids bzw. Id-Anfang) nacheinander von oben besiegen (wie course_w6b:
        // Rollpilz per Stampfattacke; lineUp: Blick bleibt zum Gegner – mit Pilz-Maske sieht ein zugewandter Werfer die Figur nicht)
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          const done = [];
          let guard = 0;
          for (; guard < 60; guard++) {
            const want = (e) => (Array.isArray(pre) ? pre.includes(e.spec?.id) : String(e.spec?.id ?? '').startsWith(pre));
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && want(e));
            if (!list.length) break;
            if (Array.isArray(pre)) list.sort((a, b) => pre.indexOf(a.spec?.id) - pre.indexOf(b.spec?.id));
            else list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            let k = 0, jl = false, pounds = 0, phase = 0;
            // side (m): Werfer von vorn (zur Kamera, quer zu seinem Tänzeln) anspringen – vor ihm stehen bleiben, senkrecht
            // hochspringen, im Fallen auf ihn lenken (mit Pilz-Maske sieht er die zugewandte Figur nicht)
            const sideOn = Lg.side && e.kind === 'feuer_werfer';
            // Krakenpilz (bait: [x, z] Köderpunkt am Rand seiner Sicht, dodge: [x, z] Ausweichpunkt quer zur Wurflinie): hingehen, warten,
            // bis er spuckt, zur Seite treten (das Steinchen landet auf der alten Stelle), warten, bis es zerbröselt – dann anspringen
            if (Lg.bait && e.kind === 'krakenpilz' && !e.__baited) {
              e.__baited = true;
              const s0 = e.spits ?? 0;
              const goTo = ([x, z], run, max) => { for (let q = 0; q < max && !p.dead; q++) { const gx = x - p.pos.x, gz = z - p.pos.z, gd = Math.hypot(gx, gz); if (gd < 0.3 && p.mode === 'ground') break; tick(p.mode === 'ground' ? { ...this.stick(gx, gz, Math.max(0.3, Math.min(1, gd))), run } : {}); } };
              goTo(Lg.bait, false, 600);
              let q = 0;
              for (; q < 900 && (e.stones?.length ?? 0) === 0 && e.alive && !e.defeated; q++) tick({});
              goTo(Lg.dodge, true, 240);
              for (let w = 0; w < 600 && (e.stones?.length ?? 0) > 0; w++) tick({});
              log.push(['köder', e.spec?.id, (e.spits ?? 0) - s0, q]);
            }
            for (; k < (Lg.max ?? 1800) && e.alive && !e.defeated && !e.removed; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (sideOn) {
                if (p.mode === 'ground' && phase === 2) phase = 0;
                if (phase === 0) {
                  const qx = e.pos.x - p.pos.x, qz = e.pos.z + Lg.side - p.pos.z, qd = Math.hypot(qx, qz);
                  if (qd < 0.35 && p.mode === 'ground' && Math.hypot(p.vel.x, p.vel.z) < 0.4) { phase = 1; tick({ jump: true }); continue; }
                  tick(p.mode === 'ground' ? (qd > 0.12 ? { ...this.stick(qx, qz, Math.max(0.2, Math.min(1, qd / 1.2))), run: false } : {}) : {}); continue;
                }
                if (phase >= 1) {
                  phase = 2;
                  const up = p.vel.y > 1.5;
                  tick({ ...(up ? {} : this.airSteer(e.pos.x, e.pos.z, 0, 0, 4, 5)), jump: p.vel.y > 0 }); continue;
                }
              }
              // Flieger (Knochenflieger vom Podest, wie course_w7b): Sprung gehalten, sobald er nah ist
              if (Lg.fly && p.mode === 'ground') { tick(d < 2.0 ? { ...this.stick(dx, dz, 0.5), jump: true, run: false } : { ...this.stick(Lg.hold ? Lg.hold[0] - p.pos.x : 0, Lg.hold ? Lg.hold[1] - p.pos.z : 0, Lg.hold ? 0.6 : 0), run: false }); continue; }
              if (p.mode === 'ground' && d < (Lg.near ?? 2.2) && !e.overhead) { jl = !jl; tick({ ...this.stick(dx, dz, 0.5), jump: jl, run: false }); continue; }
              jl = false;
              // Rollpilz (und mit pound jeder Gegner): Stampfattacke – einfaches Draufspringen legt ihn nur auf den Rücken
              if (p.mode === 'air' && (e.kind === 'rollpilz' || Lg.stampf) && d < 0.55 && p.vel.y < 1.5 && p.pos.y > e.pos.y + 0.9) { pounds++; tick({ crouch: true }); continue; }
              if (p.mode === 'air' && Lg.lineUp) { tick({ ...(d > 0.08 ? this.stick(dx, dz, Math.min(1, d / 1.5)) : {}), jump: p.vel.y > 0 }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              if (d < 3 && e.overhead) { tick({}); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) { mech.stomped.push(e.spec?.id); done.push(e.spec?.id); }
            else break;
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', done.join(' ')]);
          if (!done.length && !Lg.partial) log.push(['FEHLER: nichts besiegt', `${pre}`]);
          continue;
        }
        // ------------------------------------------------ mit der Funkenblüte schießen: auf gleicher Höhe Abstand dist halten, zum Gegner
        // drehen, Feuerbälle werfen, bis er besiegt ist (Ids der Reihe nach)
        if (Lg.shoot) {
          const ids = Array.isArray(Lg.shoot) ? Lg.shoot : [Lg.shoot];
          const done = [];
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          for (const id of ids) {
            const e = ent(id);
            if (!e) continue;
            let k = 0, shots = 0, cool = 0;
            for (; k < (Lg.max ?? 1500) && e.alive && !e.defeated && !e.removed && !p.dead; k++) {
              if (cool > 0) cool--;
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              const want = Lg.dist ?? 4.5;
              // Stelle auf der Laufachse des Stockwerks (z der Figur bleibt, x im Abstand want vom Gegner, auf der Seite der Figur)
              const sx = e.pos.x + Math.sign(p.pos.x - e.pos.x || 1) * want, sz = Lg.z ?? p.pos.z;
              const ex = sx - p.pos.x, ez = sz - p.pos.z, ed = Math.hypot(ex, ez);
              if (p.mode !== 'ground') { tick({}); continue; }
              if (ed > 0.5 && d > want - 1) { tick({ ...this.stick(ex, ez, Math.max(0.25, Math.min(1, ed / 1.2))), run: false }); continue; }
              const yawWant = Math.atan2(-dz, dx);
              if (Math.abs(wrap(yawWant - p.yaw)) > 0.06) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              if (cool <= 0) { tick({ action: true }); shots++; cool = Lg.gap ?? 36; continue; }
              tick({});
            }
            if (!e.alive || e.defeated || e.removed) { done.push(id); mech.stomped.push(id); }
            log.push(['geschossen', id, !e.alive || e.defeated || e.removed, shots, k]);
          }
          for (let i = 0; i < 40; i++) tick({});
          if (done.length < ids.length && !Lg.partial) log.push(['FEHLER: nicht alle besiegt', ids.filter((x) => !done.includes(x)).join(' ')]);
          continue;
        }
        // ------------------------------------------------ Wurfball aufheben (hingehen, zu ihm drehen, Aktion)
        if (Lg.grab) {
          const b = named(Lg.grab) ?? ent(Lg.grab);
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          let n = 0;
          for (; n < 600 && b && !p.holding && !p.dead; n++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.85 && p.mode === 'ground') {
              const err = Math.abs(wrap(Math.atan2(-dz, dx) - p.yaw));
              if (err > 0.08) { tick({ ...this.stick(dx, dz, 0.12) }); continue; }
              tick({ action: true }); tick({});
              continue;
            }
            tick({ ...this.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false });
          }
          log.push(['ball', Lg.grab, p.holding === b, n]);
          if (p.holding !== b) log.push(['FEHLER: Ball nicht aufgehoben', Lg.grab]);
          continue;
        }
        // ------------------------------------------------ in Richtung des Ziels drehen und werfen (Ball bzw. mit fire: Feuerball)
        if (Lg.throwAt || Lg.fire) {
          const [tx, tz] = Lg.throwAt ?? Lg.fire;
          const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
          for (let n = 0; n < 60; n++) {
            const want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x);
            if (n >= 8 && Math.abs(wrap(want - p.yaw)) < 0.025) break;
            tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 0.35) });
          }
          for (let q = 0; q < (Lg.times ?? 1); q++) { tick({ action: true }); for (let w = 0; w < (Lg.gap ?? 2); w++) tick({}); }
          mech.throws++;
          for (let w = 0; w < (Lg.after ?? 90); w++) tick({});
          log.push(['wurf', `${tx},${tz}`, Lg.fire ? 'feuer' : 'ball', +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ fliegenden Zielmast abpassen: warten, bis er heranschwingt, dann hochspringen
        if (Lg.catchPole) {
          const m = ent(Lg.catchPole);
          let k = 0, jumped = 0;
          for (; k < (Lg.max ?? 2400) && m && L.runtime.status === 'play' && !p.dead; k++) {
            const px = m.pos.x, pz = m.pos.z, d = Math.hypot(px - p.pos.x, pz - p.pos.z);
            const vx = (m.pos.x - (m.__px ?? m.pos.x)) * 120; m.__px = m.pos.x;
            const coming = Math.sign(p.pos.x - px) === Math.sign(vx) || Math.abs(vx) < 0.1;
            if (p.mode === 'ground' && d < (Lg.reach ?? 4.2) && coming && Math.abs(px + vx * 0.45 - p.pos.x) < 1.2) { jumped++; tick({ ...this.stick(px - p.pos.x, pz - p.pos.z, 0.8), jump: true }); continue; }
            if (p.mode === 'air') { tick({ ...this.airSteer(px + vx * 0.2, pz, 0, 0, 3, 6), jump: true }); continue; }
            const hx = Lg.hold?.[0] ?? p.pos.x, hz = Lg.hold?.[1] ?? p.pos.z, hd = Math.hypot(hx - p.pos.x, hz - p.pos.z);
            tick(hd > 0.3 ? this.stick(hx - p.pos.x, hz - p.pos.z, Math.min(1, hd)) : {});
          }
          log.push(['zielmast', Lg.catchPole, k, jumped, L.runtime.status, m?.state]);
          continue;
        }
        // ------------------------------------------------ Schubser in Richtung dir stoßen (wie course_w7b)
        if (Lg.push) {
          const e = L.entities.find((x) => x.spec?.id === Lg.push);
          const dl = Math.hypot(Lg.dir[0], Lg.dir[1]) || 1;
          let dx = Lg.dir[0] / dl, dz = Lg.dir[1] / dl;
          const cx = Lg.center ?? 0, cz = Lg.centerZ ?? null, room = Lg.room ?? 2.2;
          const clampX = (x) => Math.max(cx - room, Math.min(cx + room, x));
          const clampZ = (z) => (cz === null ? z : Math.max(cz - (Lg.roomZ ?? room), Math.min(cz + (Lg.roomZ ?? room), z)));
          let tries = 0;
          const gone = () => !e || !e.alive || e.removed || e.defeated || e.state === 'defeated' || e.state === 'fall' || e.pos.y < e.spec.pos[1] - 1.2;
          const dodge = () => {
            if (p.mode !== 'ground') return false;
            const threat = L.entities.some((x) => x.kind === 'schubser' && x.alive && !x.defeated && x.state === 'charge'
              && Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) < 3.2 && ((p.pos.x - x.pos.x) * (x.vel?.x ?? 0) + (p.pos.z - x.pos.z) * (x.vel?.z ?? 0)) > 0);
            if (!threat) return false;
            for (let q = 0; q < 30; q++) tick({ jump: true });
            for (let q = 0; q < 200 && p.mode !== 'ground' && !p.dead; q++) tick({ ...this.airSteer(clampX(p.pos.x), clampZ(p.pos.z), 0, 0, 2, 3) });
            mech.dodged = (mech.dodged ?? 0) + 1;
            return true;
          };
          for (; tries < (Lg.tries ?? 12) && !gone() && !p.dead; tries++) {
            if (Lg.edges) { dx = (e.pos.x - Lg.edges[0]) < (Lg.edges[1] - e.pos.x) ? -1 : 1; dz = 0; }
            else if (Lg.auto !== false) {
              const ox = e.pos.x - cx, oz = cz === null ? 0 : e.pos.z - cz;
              if (Math.abs(ox) > 0.5 && Math.abs(ox) >= Math.abs(oz)) { dx = Math.sign(ox); dz = 0; } else if (cz !== null && Math.abs(oz) > 0.5) { dx = 0; dz = Math.sign(oz); }
            }
            for (let k = 0; k < 500 && !gone(); k++) {
              if (dodge()) continue;
              const ax = clampX(e.pos.x - dx * (Lg.back ?? 2.6)), az = clampZ(e.pos.z - dz * (Lg.back ?? 2.6));
              const qx = ax - p.pos.x, qz = az - p.pos.z, d = Math.hypot(qx, qz);
              if (d < 0.6 && p.mode === 'ground' && e.state !== 'warn' && e.state !== 'charge') break;
              tick({ ...this.stick(qx, qz, Math.min(1, Math.max(0.5, d / 1.0))), run: d > 2 });
            }
            const p0 = e.pushes ?? 0;
            let pounding = false;
            for (let k = 0; k < 220 && !gone() && (e.pushes ?? 0) === p0 && !p.dead; k++) {
              const tx = clampX(e.pos.x - dx * 0.3), tz = clampZ(e.pos.z - dz * 0.3);
              const hd = Math.hypot(tx - p.pos.x, tz - p.pos.z);
              if (!pounding && k > 6 && hd < 0.45 && p.vel.y < 3 && p.pos.y > e.pos.y + 1.2) pounding = true;
              if (pounding) { tick({ crouch: true }); continue; }
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, e.vel?.x ?? 0, e.vel?.z ?? 0, 3.4, 7) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: k < 26, run: false });
            }
            for (let k = 0; k < 240 && p.mode !== 'ground' && !p.dead; k++) tick({ ...this.airSteer(clampX(p.pos.x), clampZ(p.pos.z), 0, 0, 3, 5) });
            for (let k = 0; k < 150 && !gone(); k++) {
              const ox = p.pos.x - cx, oz = cz === null ? 0 : p.pos.z - cz;
              tick(p.mode === 'ground' && (Math.abs(ox) > 1.2 || Math.abs(oz) > 1.2) ? this.stick(-ox, -oz, 0.6) : {});
            }
          }
          for (let k = 0; k < 120 && e?.alive && !e?.removed && !e?.defeated; k++) tick({});
          // zurück zur Mitte (schwankendes Deck: nicht an der Kante stehen bleiben)
          if (Lg.center !== undefined) for (let k = 0; k < 160 && !p.dead && Math.abs(p.pos.x - cx) > 1.2; k++) tick(p.mode === 'ground' ? this.stick(cx - p.pos.x, 0, 0.8) : {});
          if (gone()) mech.pushedOff = (mech.pushedOff ?? 0) + 1;
          log.push(['schubser', Lg.push, gone(), tries, e?.state, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!gone() && !Lg.partial) { log.push(['FEHLER: Schubser nicht hinuntergestoßen', Lg.push]); break; }
          continue;
        }
        // ------------------------------------------------ warten: Pfeilplattform oben, Pendel weit weg, Zylinder-Stacheln weg
        if (Lg.waitPlat) {
          const h = named(Lg.waitPlat);
          let k = 0;
          if (Lg.fresh) for (; k < 1500 && h.state === 'oben'; k++) tick({});
          for (; k < 1500 && h.state !== 'oben'; k++) tick({});
          log.push(['plattform', Lg.waitPlat, k, h.state]);
        }
        if (Lg.waitPend) {
          const h = named(Lg.waitPend);
          const far = Lg.far ?? 3;
          let k = 0;
          let prev = Math.abs(h.ball.x - p.pos.x);
          for (; k < 900; k++) { tick({}); const d = Math.abs(h.ball.x - p.pos.x); if (d > far && d >= prev) break; prev = d; }
          log.push(['pendel', Lg.waitPend, k, +h.ball.x.toFixed(2)]);
        }
        if (Lg.waitZyl) {
          const h = named(Lg.waitZyl);
          const rows = h.info().rows, sp = h.speed, ahead = Lg.ahead ?? 1.8;
          const danger = () => {
            for (let i = 0; i < rows; i++) {
              const s = h.spikeAt(i);
              const a = Math.atan2(s.u, s.v) * Math.sign(sp || 1);
              if (a > -0.6 - Math.abs(sp) * ahead && a < 0.6) return true;
            }
            return false;
          };
          let k = 0;
          for (; k < 1800 && danger(); k++) tick({});
          log.push(['zylinder', Lg.waitZyl, k]);
        }
        // ------------------------------------------------ auf einen Gegner springen (Sprung gehalten → hoher Abprall), danach zu to2 lenken
        if (Lg.bounce) {
          const e = ent(Lg.bounce);
          const c0 = e?.count ?? 0, h0 = e?.hits ?? 0;
          let k = 0, bounced = false, fell = false, apex = p.pos.y;
          const y0 = p.pos.y;
          for (; k < (Lg.max ?? 420) && e && !p.dead; k++) {
            apex = Math.max(apex, p.pos.y);
            if (k > 5 && p.mode === 'ground') break;
            if (p.mode === 'air' && p.vel.y < -1 && apex > y0 + 0.5) fell = true;
            if (!bounced && ((e.count ?? 0) < c0 || (e.hits ?? 0) > h0 || (fell && p.vel.y > 8 && p.pos.y > y0 + 1.2))) bounced = true;
            const [tx, tz] = bounced && Lg.to2 ? Lg.to2 : [e.pos.x, e.pos.z];
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.2, Lg.vmax ?? 6) : this.stick(e.pos.x - p.pos.x, e.pos.z - p.pos.z, 1)), jump: Lg.hold !== false || k < 14, run: false });
          }
          mech.bounces = (mech.bounces ?? 0) + (bounced ? 1 : 0);
          mech.apex = Math.max(mech.apex ?? -99, apex);
          log.push(['abprall', Lg.bounce, bounced, +apex.toFixed(2), k, e?.count]);
          continue;
        }
        // ------------------------------------------------ Restzeit setzen (Zeitablauf prüfen)
        if (Lg.setTime !== undefined) { L.runtime.timeLeft = Lg.setTime; log.push(['Restzeit', Lg.setTime]); continue; }
        if (Lg.mark) { window.__mark = { time: L.runtime.timeLeft, coins: L.runtime.coins, ...(typeof Lg.mark === 'object' ? Lg.mark : {}) }; continue; }
        if (!Lg.to) continue;
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        const late = !!Lg.jumpAt || Lg.jumpZ !== undefined || Lg.runUp !== undefined;
        let best = Infinity, still = 0, auto = 0, j0 = late ? null : 0;
        if (holdJ && !late) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
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
          if (p.mode === 'air' && holdJ && j0 !== null && Lg.steer !== false) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else if (p.mode === 'air' && Lg.steer === false) st = {};
          else if (p.mode === 'air') st = this.airSteer(tx, tz, 0, 0, 2.6, Lg.run === false ? 6.5 : 10);   // Reflex-/Nachsprung: nicht übers Ziel hinaus
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && ((Lg.jumpAt && dist <= Lg.jumpAt) || (Lg.jumpZ !== undefined && p.pos.z <= Lg.jumpZ)
            || (Lg.runUp !== undefined && p.mode === 'ground' && ((p.vel.x * dx + p.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)))) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max && !Lg.partial) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.defeated = foes0.filter((e) => e.defeated || !e.alive || e.removed).length;
      return { log, autoJumps, steps, time: steps / 120, clocks: L.named.get('uhren')?.got ?? 0, room: L.named.get('feuertuerme')?.state ?? null, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, cause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) + Math.abs(x.pos.y - p.pos.y) * 0.5; if (d < best) { best = d; e = x; } }
        if (!e || best > (o.range ?? 40)) break;
        if (window.__trace && n % 30 === 0) (window.__clog ??= []).push([n, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1), p.state, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), e.state ?? '']);
        if (e.touch === false && kind === 'star') { p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); continue; }
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        p.invuln = Math.max(p.invuln, 5);
        // hoch oben (z. B. Power-up auf dem ?-Block): erst seitlich wegtreten, dann von der Seite anspringen
        if (dy > 1.6 && p.mode === 'ground' && dist < 1.25) { c.setInput({ ...this.stick(dist > 0.05 ? -dx : 1, dist > 0.05 ? -dz : 0, 0.6) }); c.step(1); continue; }
        if (dy > 1.6 && p.mode === 'air') { c.setInput({ ...this.airSteer(e.pos.x, e.pos.z, 0, 0, 3, 4), jump: p.vel.y > 0 }); c.step(1); continue; }
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200 && L.runtime.status === 'play' && p.script?.type !== 'house') { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; let nm = null; for (let q = o; q; q = q.parent) if (q.name) { nm = q.name.replace(/:\d+$/, ''); break; } return nm ?? o.type; };
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
    kinds: () => { const m = {}; for (const e of L.entities) if (!e.removed) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
    /** Remix-Kennwerte des laufenden Levels (je Level im Test ausgewertet). */
    remixInfo() {
      const d = L.data;
      const calls = window.__audio?.music?.__calls ?? [];
      return {
        kinds: this.kinds(), remix: d.remix ?? null, theme: d.theme, light: c.view.theme.light ?? null, music: d.music, variant: d.musicVariant ?? null,
        call: calls.filter((x) => x[0] === d.music).slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
        stamp: !!d.stamp, stars: (d.stars ?? []).length, world: d.world, title: d.title, timeLimit: d.timeLimit, rtLimit: L.runtime.timeLimit,
        b9: d.id === 'B-9' ? {
          towers: L.entities.filter((e) => e.kind === 'pilzlingsturm' && !e.removed && e.rider).map((e) => `${e.spec.id}:${e.max}+${e.rider.kind}`).join(','),
          sleeper: (() => { const e = ent('schlafturm'); return e ? { count: e.count, state: e.state, wake: e.spec.wake } : null; })(),
          warpHidden: !!named('warp1')?.hidden, room: named('feuertuerme')?.ids?.length ?? 0,
          torches: L.entities.filter((e) => e.kind === 'strandfackel').length, clocks: named('uhren')?.items?.length ?? 0, clockSec: named('uhren')?.sec ?? 0,
          ride: !!d.ride, archetype: d.archetype, keys: L.entities.filter((e) => e.kind === 'schluesselmuenze' && !e.removed).length,
          goalY: d.goal?.pos?.[1] ?? null, cp: d.checkpoint ?? null, star0hidden: !!d.stars?.[0]?.hidden,
        } : null,
      };
    },
  };
  window.__bc = W;
  return Object.keys(W);
}


const allErrors = [];
let loaded = null;
const SAVE = 'lotti-greta-course-v1';
async function load(id, o = {}) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !o.fresh) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    if (o.fresh) {
      // frischer Spielstand (Kampf-Haus: Ergebnis wird gespeichert)
      await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
      await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    }
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
  if (o.hero) await sc((h) => { const c = window.__course; c.player.setHero(h); c.level.runtime.save.lives = 9; }, o.hero);
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__bc[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}blume_c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__bc.detail());
    console.log(`      ${name}:`);
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

  // ------------------------------------------------ Laden, Daten, Remix-Regeln
  if (PARTS.has('load')) {
    const r = await W('remixInfo');
    console.log(`  „${r.title}“, Welt ${r.world}, Thema ${r.theme} (Licht ${r.light}), Musik ${r.music}/${r.variant} → ${JSON.stringify(r.call)} (music.variant ${r.mVariant}), ${r.timeLimit} s, Entitäten: ${JSON.stringify(r.kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const M = R.meta;
    const starsOk = M.archetype === 'house' ? (r.house?.rooms === M.stars) : r.stars === M.stars;
    check(`${id}: „${M.title}“, Welt 11, ${M.stars} Sterne, kein Stempel, ${M.time ? `${M.time} s, ` : ''}Thema ${M.theme}, Musik ${M.music}${M.variant ? ` (Variante ${M.variant})` : ''}`,
      r.title === M.title && r.world === 11 && starsOk && !r.stamp && (r.kinds.stamp ?? 0) === 0 && (!M.time || r.timeLimit === M.time) && r.theme === M.theme && r.music === M.music && (r.variant ?? null) === (M.variant ?? null));
    if (R.base) {
      check(`${id}: Remix von ${R.base} über remixOf (LEVEL.remix.base = ${r.remix?.base})`, r.remix?.base === R.base && !r.remix?.missing);
      if (M.light) check(`${id}: Licht-Variante ${M.light} wirksam (Thema ${r.theme}, Ansicht ${r.light})`, r.light === M.light);
      check(`${id}: Musik spielt ${M.music}${M.variant ? ` mit Klang-Variante ${M.variant}` : ' ohne Variante'} (music.play ${JSON.stringify(r.call)})`,
        !!r.call && (M.variant ? r.call[1]?.variant === M.variant && r.mVariant === M.variant : !r.call[1]?.variant));
    }
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${r.kinds[kind] ?? 0})`, (r.kinds[kind] ?? 0) === n);
    for (const m of R.remixChecks ?? []) check(`${id}: ${m.name}`, m.ok(r));
  }

  // ------------------------------------------------ Probe (Fehlersuche): PROBE='{"from":[x,y,z],"place":{…},"legs":[…],"dump":"js"}'
  if (process.env.PROBE) {
    const pr = JSON.parse(process.env.PROBE);
    for (const hero of HEROES) {
      await load(id);
      await W('place', pr.from ?? R.start, { hero, settle: 10, ...(pr.place ?? {}) });
      if (pr.pre) await sc((js) => Function('c', 'L', 'P', js)(window.__course, window.__course.level, () => window.__course.player), pr.pre);
      const res = await W('drive', pr.legs, { invuln: pr.invuln });
      for (const l of res.log) if (process.env.TRACE || l[0] !== 'spur') console.log('     ', JSON.stringify(l));
      console.log(`  ${hero}: ${res.time.toFixed(1)} s, Status ${res.status}, Ende ${res.pos.map((v) => v.toFixed(2)).join(', ')}, tot ${res.dead} ${res.cause ?? ''}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}, Sterne ${res.rt.stars}`);
      if (pr.dump) console.log('  dump', JSON.stringify(await sc((js) => Function('c', 'L', 'P', `return (${js});`)(window.__course, window.__course.level, () => window.__course.player), pr.dump)));
      if (pr.shot) await shot(`probe_${pr.shot}`);
    }
    continue;
  }

  // ------------------------------------------------ Gegenprobe: das Basislevel bleibt unverändert
  if (PARTS.has('base') && R.base) {
    const g = await sc((b) => {
      const CL = window.__courseLevels;
      const raw = CL.raw(b);
      const snap = (o) => JSON.stringify(o, (k, v) => (typeof v === 'function' ? `fn:${v.name}` : v));
      const before = snap(raw);
      const rawR = CL.raw(window.__course.level.data.id);
      CL.refreshRemix(rawR);
      CL.get(window.__course.level.data.id);
      const after = snap(raw);
      return { same: before === after, len: before.length, theme: raw.theme, music: raw.music, variant: raw.musicVariant ?? null, remix: raw.remix ?? null, stamp: !!raw.stamp, stars: (raw.stars ?? []).length, title: raw.title };
    }, R.base);
    check(`${id}: Gegenprobe – Rohdaten von ${R.base} bleiben beim Auflösen des Remix unverändert (${g.len} Zeichen, „${g.title}“, Thema ${g.theme}, Stempel ${g.stamp})`, g.same && !g.remix && g.variant === null && g.stamp);
    await load(R.base);
    const b = await W('remixInfo');
    const baseErr = errors.slice();
    const be = R.baseEnemies ?? {};
    const ok = Object.entries(be).every(([k, n]) => (b.kinds[k] ?? 0) === n);
    check(`${id}: Gegenprobe – ${R.base} lädt wie bisher (Thema ${b.theme}, Musik ${b.music} ohne Variante, Stempel, ${JSON.stringify(Object.fromEntries(Object.keys(be).map((k) => [k, b.kinds[k] ?? 0])))})`,
      ok && !b.remix && !b.variant && b.stamp && (b.kinds.stamp ?? 0) === 1 && baseErr.length === 0);
    loaded = null;
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
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.time} s (${res.time.toFixed(1)} s)`, reached && res.time < R.meta.time);
    check(`${id}: ${hero} – Protokoll ohne Fehler`, !res.log.some((l) => String(l[0]).startsWith('FEHLER')));
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
    const avg = per.reduce((a, q) => a + q[1], 0) / Math.max(1, per.length);
    console.log(`  Messgang: ${per.length} Punkte, Ø ${avg.toFixed(0)} Aufrufe, max ${worst.calls} / ${Math.round(worst.tris / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (Ø ${avg.toFixed(0)}, max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = rt.stars[t.star];
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
  for (const [name, pos, steps = 0, input = null, yaw = PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}


console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(30)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
