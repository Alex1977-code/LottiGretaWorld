// Welt 8, Level 8-Zug „Brummbär-Express im Abendrot“ (Autoscroller + Boss: Fahrt-Illusion, Hackvogel-Wagen mit Schubsern,
// Wasserbecken mit Wutkaulquappen, Mini-Pilzling-Salon mit Hebeblock, Hammer-Werfer vor der Bossröhre, Schattenläuferin 2),
// 8-4 „Glimmstege der Mitternachtsfestung“ (unsichtbare Leuchtstege, Stampfsteine, Knochenflieger, Stachelwalzen,
// Kanonengasse) und 8-5 „Flutverlies der Brummbär-Festung“ (Steigbecken, Wasserkörper, Stachelblöcke, Pflaume-Ritt,
// Fallblock-Brücke, Stachelwände, Wolkenkanone in den Münzhimmel):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120
// inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w8b_<Level>_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8b.mjs [8-Zug|8-4|8-5]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
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
// { expect: Bedingung } · { until: Bedingung } · { warp: [x, z] } (auf eine Warp-Box springen) · { stompAll: Id-Anfang } ·
// { pound: [x, z], above } (Sprung mit Stampfattacke) · { mount: [x, z] } / { ride: [[z, lat], …] } (Pflaume) ·
// { coins: [[x, z, jump?], …] } (Münzen nacheinander einsammeln) · { swimTo: [x, y, z] } (unter Wasser schwimmen)
const RX4 = 80;
const ROUTES = {
  '8-4': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'nightfort', music: 'course_footlight', archetype: 'parcours' },
    enemies: { stampfstein: 5, knochenflieger_gruppe: 2, kanone_turm: 3 },
    main: [
      { name: 'Stampfstein-Steg: an der Laufseite entlang', to: [-1, -3], within: 0.5 },
      { to: [-1, -14.6], within: 0.5, run: false },
      { to: [-1, -16.8], within: 0.5, run: false }, { to: [7, -16.8], within: 0.5, run: false },
      { to: [7, -32.6], within: 0.5, run: false }, { to: [-4, -32.8], within: 0.5, run: false },
      { to: [-4, -49.8], within: 0.5, run: false }, { to: [0, -50], within: 0.5, run: false },
      { name: 'Knochenflieger-Steg', to: [0, -71.8], within: 0.5, run: false }, { to: [-5, -71.8], within: 0.5, run: false },
      { to: [-5, -85.8], within: 0.5, run: false }, { to: [2, -85.8], within: 0.5, run: false },
      { to: [2, -97], within: 0.5, run: false },
      { name: 'Laternenhof (Kontrollpunkt)', to: [0, -103.5], within: 0.6 },
      { name: 'Stachelwalzen', to: [0, -112.6], within: 0.3, run: false },
      { to: [0, -121.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [0, -128.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [3, -131.2], within: 0.4, run: false }, { to: [3, -135.6], within: 0.3, run: false },
      { to: [3, -144.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [3, -154.6], jump: 30, jumpAt: 5.6, within: 0.6, run: false },
      { to: [3, -160.2], within: 0.4, run: false }, { to: [-1.6, -160.4], within: 0.4, run: false },
      { name: 'Kanonengasse 1 (am Rand an den Projektilköpfen vorbei)', to: [-1.6, -189], within: 0.5, run: false },
      { name: 'Zwischenhof', to: [-2.6, -193], within: 0.5, run: false }, { to: [-1.2, -199], within: 0.5, run: false },
      { name: 'Kanonengasse 2 (Suchköpfe)', to: [0, -212.8], within: 0.5 }, { to: [5, -212.8], within: 0.5, run: false },
      { to: [5, -225.8], within: 0.5 }, { to: [0, -225.8], within: 0.5, run: false }, { to: [0, -232.6], within: 0.5, run: false },
      { name: 'Warp-Box zum Zielturm', warp: [0, -235.6] },
      { expect: 'zielturm' },
      { name: 'Zielmast', to: [0, -279], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Warp-Box benutzt, Stampfsteine sind gelandet und haben den Steg aufleuchten lassen', ok: (r) => r.mech.warps === 1 && r.mech.lands >= 3 && r.mech.impacts >= 3 },
    ],
    targets: [
      { name: 'Stern 1: Sprung vom türkisen Steg zum Stern über dem Abgrund – isolierter Steg trägt', star: 0, from: [-5, 0, -76],
        legs: [{ to: [-3.8, -80], within: 0.3, run: false }, { to: [-10.4, -80], jump: 40, jumpAt: 4.0, within: 0.4, run: true }, { wait: 20 }, { expect: 'aufIso' }, { star: 0 }], shot: 'stern1' },
      { name: 'Stern 2: Sternring am Laternenhof – acht Sternmünzen, ein Teil auf der unsichtbaren Schleife', star: 1, from: [0, 0, -103.5],
        legs: [{ to: [-2, -98.8], within: 0.4, run: false }, { to: [-2, -102.6], within: 0.4, run: false },
          { coins: [[-2.6, -106], [0, -104, 30], [2.6, -101], [5, -100.5], [6.6, -102.6], [6.6, -105.6], [5, -107.5], [2.6, -108]] }, { wait: 40 }, { star: 1 }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne alle Sternmünzen (Zeit läuft ab)', star: 1, expectNot: true, from: [0, 0, -103.5], heroes: ['lotti'],
        legs: [{ to: [-2, -98.8], within: 0.4, run: false }, { to: [-2, -102.6], within: 0.4, run: false }, { coins: [[-2.6, -106], [2.6, -101]] }, { wait: 120 * 16 }] },
      { name: 'Stempel: unsichtbare Treppe rechts vom Zwischenhof hinauf', stamp: true, from: [3, 0, -195],
        legs: [{ to: [4.6, -195], within: 0.3, run: false }, ...[7.2, 9.2, 11.2, 13.2, 15.2].map((x) => ({ to: [x, -195], jump: 26, within: 0.35, run: false }))], shot: 'stempel' },
      { name: 'Stern 3: Rätselbox hinter dem Stempel → Stampfstein-Kammer, an den Stampfsteinen vorbei', star: 2, from: [15.2, 3.75, -195],
        legs: [{ to: [17, -195], within: 0.3, run: false }, { warp: [18.8, -195] }, { expect: 'kammer' },
          { to: [RX4 - 1, -189.6], within: 0.4, run: false }, { to: [RX4 - 1, -198.8], within: 0.4, run: false }, { to: [RX4 + 5.9, -198.8], within: 0.4, run: false },
          { to: [RX4 + 5.9, -208.5], within: 0.4, run: false }, { star: 2 }], shot: 'stern3' },
    ],
    extra: [
      { name: 'Leuchtsteg: unsichtbar abseits der Figur, Stampfstein-Aufschlag lässt ihn weit voraus aufleuchten', from: [-1, 0, -3], heroes: ['lotti'],
        legs: [{ probe: 'vorher' }, { to: [-1, -8.8], within: 0.3, run: false }, { wait: 130 }, { probe: 'nachher' }],
        mech: (r) => r.mech.probe.vorher < 0.1 && r.mech.probe.nachher > 0.5, mechText: (r) => `Steg 7 m voraus: vorher ${r.mech.probe.vorher}, nach dem Aufschlag ${r.mech.probe.nachher}` },
      { name: 'Leuchtsteg: Stampfattacke lässt ihn aufleuchten', from: [0, 0, -60], heroes: ['lotti'],
        legs: [{ probe2: 'vorher' }, { pound: [0, -60.5] }, { wait: 10 }, { probe2: 'nachher' }],
        mech: (r) => r.mech.probe.vorher < 0.1 && r.mech.probe.nachher > 0.5, mechText: (r) => `Steg 6 m entfernt: vorher ${r.mech.probe.vorher}, nachher ${r.mech.probe.nachher}` },
      { name: 'Extraleben: unsichtbarer Block hinten am Burgbalkon', from: [3.6, 0, 5.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [3.6, 7.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Funkenblüte aus dem ?-Block am Start', from: [2.4, 0, 4.5], heroes: ['lotti'],
        legs: [{ to: [2.4, 2.5], within: 0.2, run: false }, { hop: 20 }, { to: [2.4, 4.8], within: 0.3, run: false }, { to: [2.4, 2.5], jump: 40, jumpAt: 1.6, within: 0.3, run: false }, { wait: 30 }, { expect: 'funken' }] },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['stampf', [-1, 0, -8]],
      ['zickzack', [7, 0, -24]],
      ['knochen', [-5, 0, -76]],
      ['hof', [0, 0, -103.5]],
      ['walzen', [0, 0, -114]],
      ['walzen2', [3, 0, -137]],
      ['gasse1', [-1.6, 0, -175], 300],
      ['zwischenhof', [0, 0, -195]],
      ['treppe', [9, 1.35, -195]],
      ['gasse2', [0, 0, -205], 360],
      ['kammer', [RX4, 0, -188]],
      ['ziel', [0, 0, -268]],
    ],
  },
};

const PORT = 4860;
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
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    // 8-4
    zielturm: () => at(-7, 7, -0.5, -258, -288),
    kammer: () => at(70, 92, -0.5, -180, -214),
    aufIso: () => P().pos.x < -8.9 && P().pos.y > -0.2 && P().mode === 'ground',
    funken: () => P().power === 'funken',
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
    /** Sichtbarkeit des Leuchtstegs (Id) an einem Punkt (0..1). */
    stegVis(id, x, y, z) { const h = L.named.get(id); return h ? +h.visibleAt(x, y, z).toFixed(2) : -1; },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, warps: 0, rides: 0, ride: 0, stomped: [], hurtList: [], probe: {}, lands: 0, impacts: 0, pipes: 0 };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const stones = L.entities.filter((e) => e.kind === 'stampfstein');
      const stoneState = new Map(stones.map((e) => [e, e.state]));
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.riding) mech.ride++;
        for (const e of stones) { const s0 = stoneState.get(e); if (e.state !== s0) { if (e.state === 'land') mech.lands++; stoneState.set(e, e.state); } }
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead && !p.riding) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !p.riding && p.script?.type !== 'mount' && p.script?.type !== 'dismount' && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && !p.riding) { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && p.mode !== 'swim' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        // ------------------------------------------------ Messpunkte (8-4): Steg 7 m voraus bzw. 6 m neben der Figur
        if (Lg.probe) { mech.probe[Lg.probe] = this.stegVis('steg_a', -1, 0, p.pos.z - 7); continue; }
        if (Lg.probe2) { mech.probe[Lg.probe2] = this.stegVis('steg_b', 0, 0, -66.5); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Münzen nacheinander einsammeln (optional mit Sprung)
        if (Lg.coins) {
          for (const [tx, tz, jmp = 0] of Lg.coins) {
            let k = 0;
            for (; k < 600 && !p.dead; k++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.35 && (!jmp || (p.mode === 'ground' && k > 30))) break;
              const jump = jmp && p.mode === 'ground' && d < 1.2 ? true : jmp && p.mode === 'air' && p.vel.y > 0;
              tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d / 1.2)))), run: false, jump: !!jump });
            }
            log.push(['münze', tx, tz, k]);
          }
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
        // ------------------------------------------------ zu Pflaume ins Wasser springen (Station)
        if (Lg.mount) {
          let k = 0;
          for (; k < 400 && !p.riding; k++) {
            const r = p.raftPos;
            const tx = r ? r.x : Lg.mount[0], tz = r ? r.z : Lg.mount[1];
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, 1)), jump: k % 60 < 24, run: false });
          }
          log.push(['aufgestiegen', !!p.riding, k, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!p.riding) log.push(['FEHLER: nicht aufgestiegen']);
          continue;
        }
        // ------------------------------------------------ Pflaume lenken: Seitenlage je z, Sprung in Bereichen, bis zum Absteigen
        if (Lg.ride) {
          const keys = Lg.ride;
          const latAt = (z) => {
            if (z >= keys[0][0]) return keys[0][1];
            for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (z <= a[0] && z >= b[0]) { const t = (a[0] - z) / (a[0] - b[0]); return a[1] + (b[1] - a[1]) * t; } }
            return keys[keys.length - 1][1];
          };
          let k = 0;
          for (; k < (Lg.max ?? 9000); k++) {
            if (p.dead) break;
            if (p.dismounted && !p.riding && p.mode === 'ground') break;
            if (!p.riding) { tick({}); continue; }
            const f = L.river.sample(p.pos.x, p.pos.z, {}, p.pos.y);
            const lat = latAt(p.pos.z);
            const q = f.ch.at(f.s + 3.5, {});
            const tx = q.x + q.rx * lat, tz = q.z + q.rz * lat;
            const jumpHere = (Lg.jump ?? []).some(([z0, z1]) => p.pos.z <= z0 && p.pos.z >= z1);
            const st = this.stick(tx - p.pos.x, tz - p.pos.z, 1);
            tick({ x: st.x, y: st.y * (Lg.push ?? 0.3), jump: jumpHere });
          }
          (mech.rideStops ??= []).push(+p.pos.z.toFixed(2));
          log.push(['ritt', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, !!p.dismounted]);
          if (!p.dismounted && !Lg.partial) log.push(['FEHLER: Ritt nicht beendet']);
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
      mech.lives = L.runtime.save?.lives;
      mech.impacts = window.__w8impacts?.() ?? 0;
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
    arch: () => c.state().archetype,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  // Zähler der Aufschläge (Welt-8-Sammelstelle, falls vorhanden)
  window.__w8impacts = () => L._w8?.impacts ?? L.w8?.impacts ?? 0;
  window.__w8b = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w8b[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w8b_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8b.detail());
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
    const starsOk = meta.stars === R.meta.stars && kinds.stamp === 1;
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
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
    const avg = per.reduce((a, q) => a + q[1], 0) / Math.max(1, per.length), avgT = per.reduce((a, q) => a + q[2], 0) / Math.max(1, per.length);
    console.log(`  Messgang: ${per.length} Punkte, Zeichenaufrufe Ø ${avg.toFixed(1)} (max ${worst.calls}), Dreiecke Ø ${Math.round(avgT / 1000)} k (max ${Math.round(worst.tris / 1000)} k)`);
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
