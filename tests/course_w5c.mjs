// Welt 5, Level 5-5 „Kawumm im Kristallstollen“ (Mine: Zündköpfe, POW-Blöcke, lila Ziegelwände, Loren), Arena 5-B
// „Wackelturm am Glutsee“ (Werferturm aus 9 Pilzlingen mit Feuer-Werfer, zwei steigende Steinsäulen, 100 s) und 5-6
// „Flipp-Flapp-Tortenland“ (Rot-Blau-Flipper wechseln bei jedem Sprung, Feuerringe, Spiegelfrüchte):
// Laden ohne Konsolenfehler/-warnungen, Meta (Thema, Musik, Zeitlimit, Sterne), Gegnerzahlen, Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel mit der echten
// Mechanik (POW zerbricht das lila Tor, Loren tragen, Zündkopf werfen gegen lila Ziegel bzw. rissige Wand, Hase fangen,
// Wolkenkanone + Farbfeld; Werfer von der Steinsäule aus besiegen, Turm abtragen; jeder Sprung wechselt die Flipper-
// Farbe, Kugel auf das P-Feld, Sternring, 2er-Lift mit Spiegelfrucht-Klon), Extras (Extraleben-Geheimnisse), Zeit bis
// zum Ziel, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/w5c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5c.mjs [5-5|5-B|5-6]
//   PARTS=route,sweep,targets,extra,shots,arena (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist während der
// Fahrt unverwundbar (Treffer-Versuche werden gezählt), damit Geometrie und Mechanik geprüft werden.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const Y1 = 1, Y2 = -4, Y3 = -7, Y4 = -8, YG = 3;   // 5-5
// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land } · { wait } ·
// { hop } (Sprung auf der Stelle) · { stomp } · { crouch } (Röhre) · { star: i } · { chaseKind } · { expect } (COND) ·
// { until } · { mover: id, when, until } (Lore: abwarten, aufspringen, mitfahren) · { pickup: kind } (nächstes Objekt
// aufheben) · { throwAt: [x, z] } (Gehaltenes werfen) · { face: [x, z] } · { tile: [x, z] } (ein Flipper-Hüpfer auf ein
// Feld) · { clone } (Spiegelfrucht-Klon abwarten)
const ROUTES = {
  '5-5': {
    start: [0, Y1, 6],
    meta: { stars: 3, time: 400, theme: 'mine', music: 'course_mine' },
    enemies: { zuendkopf: 3, zuendkopf_quelle: 2, pilzlingsturm: 4, schnappblume: 5, feuer_schnappblume: 2, pow: 5 },
    main: [
      { name: 'Stolleneingang', to: [0, -14] },
      { name: 'auf den POW', to: [0, -24], jump: 22, jumpAt: 1.6, within: 0.5, run: false },
      { wait: 30 }, { expect: 'torOffen' },
      { name: 'durchs Tor', to: [0, -32] },
      { name: 'Schluchtkante', to: [0, -43.5], within: 0.3, run: false },
      { name: 'Lore 1', mover: 'lore1', when: { axis: 'z', gt: -47.5 }, until: { axis: 'z', lt: -56.4 }, run: false },
      { name: 'Mittelinsel', to: [0, -61.2], jump: 26, within: 0.5, run: false },
      { name: 'Lore 2', mover: 'lore2', runup: [0, -62.4], when: { axis: 'x', gt: -5.0, lt: -4.0, dir: 1 }, jumpAt: 5.6, lead: 0.9, until: { axis: 'x', gt: -100 }, run: false, jump: 30 },
      { name: 'Sims B', to: [null, -75.6], jump: 30, jumpAt: 5.4, within: 0.6, run: false },
      { to: [5, -80.4], within: 0.3, run: false },
      { name: 'Glasröhre zur Halle', enter: [5, -85] },
      { expect: 'inHalle' },
      { name: 'Checkpoint', to: [0, -108] },
      { name: 'Halle', to: [0, -138] },
      { name: 'Boost-Feld', to: [0, -176], jump: 30, jumpAt: 18.3, within: 0.8 },
      { expect: 'gelandet' },
      { name: 'Ausgangsröhre', to: [0, -191.6], within: 0.3, run: false },
      { to: [0, -193.4], jump: 30, within: 0.3, run: false },
      { crouch: 4 },
      { expect: 'amAusgang' },
      { name: 'Zielmast', to: [0, -220.3], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: POW zerbricht die lila Wand, Glasröhre hinauf auf den Kristallbalkon', star: 0, from: [0, Y1, -75.4],
        legs: [{ to: [0, -77], jump: 22, jumpAt: 1.5, within: 0.4, run: false }, { wait: 30 }, { expect: 'wandSternOffen' },
          { to: [-5, -78.4], within: 0.3, run: false }, { enter: [-5, -82] }, { expect: 'aufBalkon' }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0: Zündkopf aus der Nachschub-Röhre gegen die lila Wand werfen', star: 0, from: [-1, Y1, -81.4],
        legs: [{ pickup: 'zuendkopf', near: [0, -83.2], r: 4 }, { throwAt: [-5, -79.4], from: [-3.2, -77.4] }, { expect: 'wandSternLoch' },
          { to: [-5, -78.4], within: 0.3, run: false }, { enter: [-5, -82] }, { expect: 'aufBalkon' }, { star: 0 }], mech: { thrown: true } },
      { name: 'Stern 0: Tatzenhieb (Krallen-Anzug) zerbricht die lila Ziegel', star: 0, from: [-5, Y1, -78.1], power: 'krallen', heroes: ['lotti'],
        legs: [{ face: [-5, -80] }, { claw: 2 }, { expect: 'wandSternLoch' }, { to: [-5, -78.4], within: 0.3, run: false }, { enter: [-5, -82] }, { star: 0 }] },
      { name: 'Stern 0 nicht ohne Sprengen: Röhre hinter der Wand versperrt', star: 0, expectNot: true, from: [-5, Y1, -77], heroes: ['lotti'],
        legs: [{ to: [-5, -82], within: 0.3, run: false, max: 240, noFail: true }, { wait: 60 }, { expect: 'nichtHinterWand' }] },
      { name: 'Stern 1: Hase auf der Glühpilz-Wiese fangen', star: 1, from: [0, Y2, -118],
        legs: [{ to: [-1.2, -118], within: 0.4, run: false }, { chaseId: 'hase_stern', max: 2400 }, { wait: 40 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Wolkenkanone auf die Empore, Farbfeld 3 × 3 färben', star: 2, from: [7, Y2, -106.4],
        legs: [{ to: [7, -107.4], within: 0.3, run: false }, { cannon: [7, -110] }, { expect: 'aufEmpore' },
          { to: [5.2, -120.2], within: 0.3, run: false }, { to: [5.2, -121.8], within: 0.3, run: false }, { to: [5.2, -123.4], within: 0.3, run: false },
          { to: [6.8, -123.4], within: 0.3, run: false }, { to: [6.8, -121.8], within: 0.3, run: false }, { to: [6.8, -120.2], within: 0.3, run: false },
          { to: [8.4, -120.2], within: 0.3, run: false }, { to: [8.4, -121.8], within: 0.3, run: false }, { to: [8.4, -123.4], within: 0.3, run: false },
          { wait: 40 }, { expect: 'farbfeldFertig' }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: Zündkopf gegen die rissige Wand werfen, Geheimgang zur Kammer', stamp: true, from: [-6, Y2, -124],
        legs: [{ pickup: 'zuendkopf', near: [-7.8, -129], r: 7 }, { throwAt: [-10.5, -131.5], from: [-7.6, -131.5] }, { expect: 'rissOffen' },
          { to: [-15, -131.5], within: 0.4, run: false }, { to: [-25.4, -131.5], within: 0.3, run: false }, { wait: 20 }], shot: 'stempel', mech: { thrown: true } },
      { name: 'Stempel nicht ohne Sprengung: Stampfen und Kopfstoß lassen die rissige Wand stehen', stamp: true, expectNot: true, from: [-8.6, Y2, -131.5], heroes: ['lotti'],
        legs: [{ to: [-9.4, -131.5], within: 0.2, run: false }, { hop: 30 }, { stomp: true }, { to: [-12, -131.5], within: 0.3, run: false, max: 200, noFail: true }, { wait: 30 }, { expect: 'rissZu' }] },
    ],
    extra: [
      { name: 'Extraleben: versteckter Block über der Mittelinsel', from: [-1.4, Y1, -61.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-1.4, -62.6], within: 0.15, run: false, slow: 0.4 }, { hop: 30 }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: zweiter Hase auf der Wiese', from: [0, Y2, -118], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-1.2, -118], within: 0.4, run: false }, { chaseId: 'hase_leben', max: 2400 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Ohne Boost zu kurz: weich in der Grube, Treppe wieder hinauf', from: [0, Y3, -152.6], heroes: ['lotti'], expectAlive: true,
        legs: [{ to: [0, -170], jump: 30, jumpAt: 12.2, within: 0.8, run: true, max: 300, land: false }, { wait: 30 }, { expect: 'inGrube' },
          { to: [3.4, -163.4], within: 0.4, run: false }, { to: [3.4, -157.4], within: 0.4, run: false }, { expect: 'ausGrube' }] },
      { name: 'POW wirft beide Pilzlingstürme auf dem Landesims um', from: [0, Y4, -176.4], heroes: ['lotti'], expectAlive: true,
        legs: [{ wait: 120 }, { to: [0, -179.6], jump: 22, jumpAt: 1.4, within: 0.4, run: false }, { wait: 60 }, { expect: 'tuermeUm' }] },
    ],
    shots: [
      ['start', [0, Y1, 6]],
      ['start_rueck', [0, Y1, 2], 0, null, -Math.PI / 2],
      ['tor', [0, Y1, -18]],
      ['sims', [0, Y1, -33]],
      ['loren', [0, Y1, -42]],
      ['insel', [0, Y1, -62]],
      ['simsB', [0, Y1, -76]],
      ['balkon', [-11, Y1 + 9, -84]],
      ['halle', [0, Y2, -106]],
      ['empore', [6.8, Y2 + 13, -120]],
      ['wiese', [-4, Y2, -114]],
      ['risswand', [-7, Y2, -129]],
      ['kammer', [-24, Y2, -130]],
      ['boost', [0, Y2, -140]],
      ['grube', [0, Y3 - 4, -164]],
      ['lande', [0, Y4, -175]],
      ['ausgang', [0, Y4, -189]],
      ['ziel', [0, YG, -210]],
    ],
  },
};

const PORT = 4490;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'route,sweep,targets,extra,shots,arena').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');

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
  const COND = {
    // 5-5
    torOffen: () => (ent('tor')?.left ?? 1) === 0,
    inHalle: () => P().pos.y < -2 && P().pos.z < -100,
    gelandet: () => P().pos.z < -170 && P().pos.y > -9,
    amAusgang: () => P().pos.z < -204 && P().pos.y > 2,
    wandSternOffen: () => (ent('wand_stern')?.left ?? 1) === 0,
    wandSternLoch: () => (ent('wand_stern')?.broken ?? 0) >= 1,
    nichtHinterWand: () => P().pos.z > -79.9 || P().pos.y > 3,
    aufBalkon: () => P().pos.y > 9.5 && P().pos.x < -8,
    aufEmpore: () => P().pos.y > 8.5 && P().pos.x > 3,
    farbfeldFertig: () => !!ent('farbfeld')?.done,
    rissOffen: () => !!ent('risswand')?.broken,
    rissZu: () => !ent('risswand')?.broken && P().pos.x > -10.2,
    inGrube: () => P().pos.y < -10 && P().pos.z < -158,
    ausGrube: () => P().pos.y > -7.5 && P().pos.z > -159,
    tuermeUm: () => ['t3', 't4'].every((id) => ent(id)?.defeated),
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
    face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { carried: 0, rides: 0, hurts: 0, thrown: 0, pipes: 0, flips: 0, falls: 0 };
      const track = [];
      const hurtAt = new Map();
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) {
          lastHurts = p.hurtTries;
          const k = `${p.lastHurt}@${Math.round(p.pos.x)},${Math.round(p.pos.z)}`;
          hurtAt.set(k, (hurtAt.get(k) ?? 0) + 1);
        }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (p.ground?.tag === 'lore') mech.carried++;
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          mech.pipes++;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
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
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.face) { this.face(Lg.face[0], Lg.face[1]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.stomp) {
          for (let k = 0; k < 14; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: p.vel.y < 2 });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.claw) {
          for (let k = 0; k < Lg.claw; k++) { tick({ action: true }); for (let q = 0; q < 40; q++) tick({}); }
          log.push(['tatzenhieb', Lg.claw, p.power]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.chaseId) {
          const tgt = ent(Lg.chaseId);
          const caught = () => tgt?.state === 'caught' || tgt?.removed;
          const n = this.chase(tgt?.kind ?? 'bunny', { filter: (e) => e === tgt && !caught(), max: Lg.max ?? 2400, run: true });
          log.push(['jagd', Lg.chaseId, n, caught(), +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]);
          if (!caught()) log.push(['FEHLER: nicht gefangen', Lg.chaseId]);
          continue;
        }
        if (Lg.until && !Lg.to && !Lg.mover) {
          let k = 0;
          for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({});
          log.push(['bis', Lg.until, k]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhre hineinlaufen und mitfahren
        if (Lg.enter) {
          let k = 0;
          for (; k < (Lg.max ?? 600) && p.mode !== 'script'; k++) {
            const dx = Lg.enter[0] - p.pos.x, dz = Lg.enter[1] - p.pos.z;
            const st = this.stick(dx, dz, 0.8);
            c.setInput({ ...st, run: false });
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.step(1); steps++;
          }
          if (p.mode === 'script') tick({});
          for (let q = 0; q < 240 && p.mode !== 'ground'; q++) tick({});
          log.push([Lg.name ?? 'röhre', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          if (k >= (Lg.max ?? 600)) log.push(['FEHLER: nicht in die Röhre']);
          continue;
        }
        // ------------------------------------------------ Wolkenkanone: auf die Öffnung springen, Flug abwarten
        if (Lg.cannon) {
          let k = 0, fired = false;
          for (; k < 400 && !fired; k++) {
            const dx = Lg.cannon[0] - p.pos.x, dz = Lg.cannon[1] - p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(Lg.cannon[0], Lg.cannon[1], 0, 0, 3.6, 6) : this.stick(dx, dz, 0.5)), jump: k < 30, run: false });
            if (p.mode === 'script' || mech.pipes > 0) fired = true;
          }
          for (let q = 0; q < 400 && p.mode !== 'ground'; q++) tick({});
          log.push(['kanone', fired, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Zündkopf (o. ä.) aufheben
        if (Lg.pickup) {
          let k = 0, got = false;
          for (; k < (Lg.max ?? 2400) && !got; k++) {
            let e = null, best = Infinity;
            for (const x of L.entities) {
              if (x.kind !== Lg.pickup || !x.alive || x.removed || x.exploded || x.carrier || x.lit || x.state === 'air') continue;
              const dn = Math.hypot(x.pos.x - Lg.near[0], x.pos.z - Lg.near[1]);
              if (dn > (Lg.r ?? 6) || !x.grounded) continue;
              const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z);
              if (d < best) { best = d; e = x; }
            }
            if (!e) { tick({}); continue; }
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d > 1.2) { tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, (d - 1.1) / 1.2))), run: false }); continue; }
            this.face(e.pos.x, e.pos.z);
            tick({ action: true }); tick({});
            got = p.holding === e;
            if (!got) for (let q = 0; q < 6; q++) tick({ ...this.stick(-dx, -dz, 0.5) });
          }
          log.push(['aufgehoben', Lg.pickup, got, k, p.holding?.kind ?? null]);
          if (!got) log.push(['FEHLER: nichts aufgehoben']);
          continue;
        }
        // ------------------------------------------------ Gehaltenes von from aus auf throwAt werfen, Explosion abwarten
        if (Lg.throwAt) {
          const held = p.holding;
          if (Lg.from) goTo(Lg.from[0], Lg.from[1], 0.35, 600, true);
          const fuse = held?.fuse ?? null;
          this.face(Lg.throwAt[0], Lg.throwAt[1]);
          tick({ action: true }); tick({});
          mech.thrown++;
          let k = 0, how = null, at = null;
          for (; k < 480 && held && !held.exploded && !held.removed; k++) { how = held.state; at = [+held.pos.x.toFixed(2), +held.pos.y.toFixed(2), +held.pos.z.toFixed(2)]; tick({}); }
          log.push(['geworfen', !!held, held?.exploded ?? null, k, 'Lunte', fuse === null ? null : +fuse.toFixed(2), 'zuletzt', how, at, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (held && (how === 'carried' || k < 3)) log.push(['FEHLER: nicht geworfen (explodiert in der Hand)']);
          for (let q = 0; q < 30; q++) tick({});
          continue;
        }
        // ------------------------------------------------ bewegliche Plattform (Lore): abwarten, aufspringen, mitfahren
        if (Lg.mover) {
          const m = ent(Lg.mover);
          const ok = () => { const v = Lg.when.axis === 'x' ? m.pm.pos.x : m.pm.pos.z; return (Lg.when.lt === undefined || v < Lg.when.lt) && (Lg.when.gt === undefined || v > Lg.when.gt) && (Lg.when.dir === undefined || Math.sign(m.mover.vx + m.mover.vz) === Lg.when.dir); };
          if (Lg.runup) goTo(Lg.runup[0], Lg.runup[1], 0.3);
          let k = 0;
          for (; k < 3000 && !ok(); k++) tick({});
          let j = 0, on = false, left = false, j0 = Lg.jumpAt ? null : 0;
          for (; j < 400; j++) {
            const mv = m.mover ?? { vx: 0, vz: 0 };
            const tx = m.pm.pos.x, tz = m.pm.pos.z;
            const lead = Lg.lead ?? 0;
            const st = p.mode === 'air' ? this.airSteer(tx, tz, mv.vx ?? 0, mv.vz ?? 0, 2.8, 9) : this.stick(tx + (mv.vx ?? 0) * lead - p.pos.x, tz + (mv.vz ?? 0) * lead - p.pos.z);
            if (j0 === null && Math.hypot(tx - p.pos.x, tz - p.pos.z) <= Lg.jumpAt) j0 = j;
            tick({ ...st, jump: j0 !== null && j - j0 < (Lg.jump ?? 26), run: Lg.run ?? true });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') { on = p.ground?.mover === m.mover || p.ground === m.shape; break; }
          }
          log.push([Lg.name ?? `auf ${Lg.mover}`, k, j, on, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) { log.push(['FEHLER: nicht auf der Plattform', Lg.mover]); break; }
          mech.rides++;
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
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max && Lg.land !== false && !Lg.noFail) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.hurtAt = [...hurtAt.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, n]) => `${k}×${n}`);
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => L.named.get(id)?.info?.() ?? null,
  };
  window.__w5 = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w5[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w5c_${name}.png` });
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
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    const failed = res.log.some((l) => String(l[0]).startsWith('FEHLER'));
    if (!reached || failed || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached && !failed);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    if (R.mainMech) for (const [label, fn] of R.mainMech) check(`${id}: ${hero} – ${label(res.mech)}`, fn(res.mech));
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
      await W('place', t.from, { hero, settle: 10, power: t.power });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech?.thrown && !(res.mech.thrown > 0)) ok = false;
      if (t.mech?.flips && !(res.mech.flips >= t.mech.flips)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, ${res.time.toFixed(1)} s)`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, power: t.power });
      const res = await W('drive', t.legs, {});
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}, Ende y ${res.pos[1].toFixed(1)})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
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
