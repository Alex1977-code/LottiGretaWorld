// Welt 3, Level 3-1 „Flockenwiese“ und 3-4 „Marzipangarten“: Laden ohne Konsolenfehler, Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel mit der echten
// Mechanik (Wandloch hinter den Flatterkäfern, Hasen fangen, Schneebaum + Gleitblatt / Propeller-Helm / Krallen-Anzug,
// schmaler Eissteg; unsichtbarer Wolkenlift, Wolkenkanone in den Münzhimmel, Figurenschalter Lotti/Greta),
// Mechanik-Prüfungen (Schneebälle zerschellen und kegeln, Eisläufer mitfahren + Schlittschuh, Stachelstreifen mit
// Schlittschuh, Eiszapfen, Extraleben-Geheimnisse, Endlos-Münzblock, Zeitlimit), Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Screenshots je Abschnitt (tests/out/w3a_*.png).
// Aufruf (nach npm run build): PORT_BASE=5000 node tests/course_w3a.mjs [3-1|3-4]
//   SHOTS_ONLY=1 → nur Screenshots/Kennzahlen · ONLY=<Text> → nur passende Ziele/Prüfungen · VERBOSE=1 → Protokolle
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), rennt, springt an
// festgelegten Stellen (Taste gehalten), wartet Röhrenfahrten ab. Gegner bleiben aktiv; die Figur ist für die Fahrt
// unverwundbar (Abpraller zählen weiter), damit die Geometrie geprüft wird.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Wegpunkte [x, z]; jump = Schritte mit gehaltener Sprungtaste (40 ≈ volle Höhe, länger = Gleiten mit Gleitblatt);
// jumpAt = erst ab diesem Abstand springen; hold = zusätzliche Eingabe je Schritt (z. B. { action: true } = Propeller
// sinkt langsam); press = Aktion beim Beginn des Abschnitts; toNamed = bewegtes Ziel; wait = Schritte ohne Eingabe;
// crouch = ducken (Röhre); push = Schritte nur drücken (Klettern); mount = auf eine Entität springen und mitfahren.
const ROUTES = {
  '3-1': {
    start: [0, 1, 5],
    timeLimit: 400,
    enemies: { schneesaeule: 6, flatterkaefer: 9, pilzling_eis: 4, krabbelkaefer: 7, pilzling: 4 },
    main: [
      { name: 'Start', to: [0, -8] },
      { to: [0.6, -24] },
      { name: 'Frosttor', to: [0, -46] },
      { name: 'Abgrund', to: [0, -68.5], jump: 30, jumpAt: 5.6 },
      { to: [2, -90] },
      { name: 'Checkpoint', to: [0, -102] },
      { name: 'Eisbahn 1', to: [0, -128], run: false },
      { to: [0, -139.2], run: false, within: 0.5 },
      { name: 'Eissteg A', to: [0, -148.5], run: false, slow: 0.55, within: 0.5 },
      { name: 'Eissteg B', to: [9, -148.5], run: false, slow: 0.55, within: 0.5 },
      { name: 'Eissteg C', to: [9, -159], run: false, slow: 0.55, within: 0.6 },
      { name: 'Eisbahn 2', to: [5, -172], run: false },
      { name: 'Zielplateau', to: [3, -193.4] },
      { name: 'Zielröhre', to: [3, -196], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Baumhain', to: [0, -240] },
      { name: 'Zielmast', to: [0, -253.7], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: Wandloch hinter den neun Flatterkäfern', star: 0, from: [6.4, 1, -77.5],
        legs: [{ to: [9.6, -77.5], within: 0.3, run: false }, { to: [10.2, -77.5], jump: 30, within: 0.3, run: false }, { wait: 20 },
          { to: [13.6, -77.5], jump: 40, within: 0.4, run: false }], shot: 'stern0' },
      { name: 'Stern 1: Hasen auf der Hasenwiese fangen', star: 1, from: [-13, 1, -108],
        legs: [{ chaseKind: 'bunny', max: 3000 }, { wait: 60 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Schneebaum hinauf, mit dem Gleitblatt in die Nische', star: 2, from: [12, 1, -185], power: 'gleitblatt',
        legs: [{ to: [10.5, -185.1], jump: 30, within: 0.35, run: false }, { wait: 10 }, { to: [8.6, -189.3], jump: 34, within: 0.35, run: false }, { wait: 10 },
          { to: [4.1, -188.1], jump: 34, within: 0.35, run: false }, { wait: 10 }, { to: [5.6, -186.6], jump: 34, within: 0.4, run: false }, { wait: 10 },
          { to: [8.6, -186], within: 0.3, run: false }, { to: [-10.4, -184.8], jump: 900, jumpAt: 14.8, within: 0.6 }], shot: 'stern2', expectPower: 'gleitblatt' },
      { name: 'Stern 2: mit dem Propeller-Helm hinauf', star: 2, from: [3, 1, -177.6],
        legs: [{ to: [1.2, -177.6], within: 0.3, run: false }, { wait: 10 }, { to: [-7, -184.8], within: 0.3, run: false }, { press: true, to: [-10.4, -184.8], hold: { action: true }, holdJump: 0, within: 0.6, run: false, airOnly: true }] },
      { name: 'Stern 2: mit dem Krallen-Anzug die Wand hinauf', star: 2, from: [-5, 1, -176.6],
        legs: [{ to: [-5, -178.6], within: 0.25, run: false }, { hop: 20 }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }, { wait: 20 },
          { to: [-8.2, -184.8], within: 0.3, run: false }, { push: 200, jump: 12, dir: [-1, 0] }, { to: [-10.6, -184.8], within: 0.4, run: false }], expectPower: 'krallen' },
      { name: 'Stern 2 nicht ohne Hilfsmittel (Sprung von der Krone)', star: 2, expectNot: true, from: [7, 8.9, -186],
        legs: [{ to: [8.8, -186], within: 0.3, run: false }, { to: [-10.4, -184.8], jump: 40, jumpAt: 14.8, within: 0.6, max: 400, land: true }, { wait: 60 }] },
      { name: 'Stempel: schmaler Eissteg hinter der Hasenwiese', from: [-19.5, 1, -116.4], stamp: true,
        legs: [{ to: [-19.5, -131], run: false, slow: 0.6, within: 0.4 }, { to: [-19.6, -132.6], run: false, within: 0.3 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Schneeball am Felsriegel: zerschellt, 5 Münzen', from: [-7.4, 1, -6.8], heroes: ['lotti'],
        legs: [{ to: [-7.4, -19.4], run: false, within: 0.4, max: 900 }, { wait: 60 }, { chaseKind: 'coin', max: 600 }], expectBroken: 'ball_riegel', expectCoins: 5 },
      { name: 'Schneeball kegelt die Krabbelkäfer um', from: [6.8, 1, -16.2], heroes: ['lotti'],
        legs: [{ to: [6.8, -29], run: false, within: 0.5, max: 900 }, { wait: 120 }], expectDefeatedKind: ['krabbelkaefer', 1] },
      { name: 'Eisläufer: mitfahren, stampfen → Schlittschuh', from: [-6, 1.3, -79.6], heroes: ['lotti', 'greta'],
        legs: [{ mount: 'eis_reit' }, { ride: 'eis_reit', steps: 240 }, { stomp: true }, { wait: 40 }, { chaseKind: 'schlittschuh', max: 600 }], expectSkate: true },
      { name: 'Stachelstreifen: mit Schlittschuh sicher, Münzen', from: [8.2, 1, -115.6], heroes: ['lotti'], skate: true, vulnerable: true,
        legs: [{ to: [8.2, -136.5], run: true, within: 0.6, max: 900 }], expectCoins: 6, expectNotHurt: true },
      { name: 'Eiszapfen im Frosttor fallen', from: [-2.6, 1, -38], heroes: ['lotti'],
        legs: [{ to: [-2.6, -42.4], run: false, within: 0.4 }, { wait: 50 }], expectNamedState: ['ez1', ['shake', 'fall', 'gone']] },
      { name: 'Extraleben im unsichtbaren Block über der Iglu-Kuppel', from: [-5.6, 1, 3.5], heroes: ['lotti'],
        legs: [{ to: [-7.0, 3.5], jump: 20, within: 0.3, run: false }, { to: [-8.5, 3.5], jump: 24, within: 0.25, run: false }, { wait: 20 }, { hop: 40 }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }], expectLives: 1 },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['iglu', [-4, 1, 1]],
      ['schneebaelle', [0, 1, -12]],
      ['frosttor', [0, 1, -34]],
      ['abgrund', [0, 1, -57]],
      ['wandloch', [7, 1, -72]],
      ['teich', [-3, 1, -80]],
      ['checkpoint', [0, 1, -98]],
      ['hasenwiese', [-16, 1, -103]],
      ['stempelsteg', [-19.5, 1, -121]],
      ['eisbahn1', [0, 1, -118]],
      ['eisstege', [0, 1, -141]],
      ['eisbahn2', [9, 1, -160]],
      ['zielplateau', [3, 1, -177]],
      ['nische', [-6, 1, -182]],
      ['baumkrone', [7, 8.9, -186]],
      ['baumhain', [0, 1, -232]],
      ['ziel', [0, 1, -244]],
    ],
  },
};

const PORT = 4371;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['3-1', '3-4'].filter((id) => ROUTES[id]);
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
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
      if (o.skate) p.collectPowerup('schlittschuh');
      c.level.runtime.status = 'play';
      c.level.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = c.level.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    namedPos(id) {
      const m = c.level.named.get(id);
      const q = m?.box?.pos ?? m?.pm?.pos ?? m?.pos;
      return q ? [q.x, q.z, q.y] : null;
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [], jumps = [], track = [];
      let steps = 0, autoJumps = 0, hurt = 0;
      const hold = o.invuln !== false;
      let rode = false;
      const hist = [];
      let deadLogged = false;
      const inv0 = p.invuln;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        const before = p.invuln;
        c.setInput(inp); c.step(1); steps++;
        if (!hold && p.invuln > before + 0.5) hurt++;
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (steps % 24 === 0 && p.mode !== 'script') track.push([p.pos.x, p.pos.y, p.pos.z]);
        if (p.mode === 'script' && c.level.runtime.status === 'play' && !p.dead && !p.statue) {
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && c.level.runtime.status === 'play') {
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.setInput({}); c.step(1); steps++;
          }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const L = legs[li];
        if (p.dead || c.level.runtime.status !== 'play') break;
        rode = false;
        if (L.wait) { for (let i = 0; i < L.wait; i++) tick(L.hold ?? {}); continue; }
        if (L.crouch) { for (let i = 0; i < L.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (L.action) { tick({ action: true }); tick({}); continue; }
        if (L.hop) {
          for (let k = 0; k < L.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          continue;
        }
        if (L.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (L.mount) {
          // auf eine Entität (Reit-Oberseite) springen: hinlaufen, abspringen, in der Luft zu ihr lenken
          const e = c.level.named.get(L.mount);
          let n = 0, on = false;
          for (; n < 2400 && !on && e && !e.defeated; n++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' && d < 2.2 && p.pos.y < e.pos.y + 0.6;
            let st;
            if (p.mode === 'air') {
              let vx = dx * 3 + (e.vel?.x ?? 0), vz = dz * 3 + (e.vel?.z ?? 0);
              const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
              st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
            } else st = d > 0.1 ? this.stick(dx, dz, Math.min(1, d)) : { x: 0, y: 0 };
            tick({ ...st, jump: jump || (p.mode === 'air' && p.vel.y > 0), run: false });
            on = p.mode === 'ground' && p.ground?.owner === e;
          }
          log.push(['aufgesprungen', L.mount, on, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) log.push(['FEHLER: nicht aufgesprungen', L.mount]);
          continue;
        }
        if (L.ride) {
          // mitfahren: zur Mitte der Entität lenken
          const e = c.level.named.get(L.ride);
          let onSteps = 0;
          const x0 = p.pos.x, z0 = p.pos.z;
          for (let k = 0; k < L.steps; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.15 ? { ...this.stick(dx, dz, Math.min(1, d * 0.8)), run: false } : {});
            if (p.ground?.owner === e) onSteps++;
          }
          log.push(['mitgefahren', L.ride, onSteps, +Math.hypot(p.pos.x - x0, p.pos.z - z0).toFixed(2)]);
          if (onSteps < L.steps * 0.8) log.push(['FEHLER: abgerutscht', onSteps]);
          continue;
        }
        if (L.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === L.star, max: 900 });
          log.push(['stern', L.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (L.chaseKind) { const n = this.chase(L.chaseKind, { max: L.max ?? 2400, run: L.run, radius: L.radius }); log.push(['jagd', L.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (L.untilNamed) {
          let k = 0;
          for (; k < (L.max ?? 1500); k++) {
            const q = this.namedPos(L.untilNamed);
            const v = L.axis === 'x' ? q[0] : L.axis === 'y' ? q[2] : q[1];
            if ((L.lt !== undefined && v < L.lt) || (L.gt !== undefined && v > L.gt)) break;
            if (L.ride) { const r = this.namedPos(L.untilNamed); const dx = r[0] - p.pos.x, dz = r[1] - p.pos.z, d = Math.hypot(dx, dz); tick(d > 0.2 ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {}); }
            else tick(L.hold ?? {});
          }
          log.push(['warte', L.untilNamed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= (L.max ?? 1500)) log.push(['FEHLER: Lage nicht erreicht', L.untilNamed]);
          continue;
        }
        const max = L.max ?? 900;
        const within = L.within ?? 0.6;
        const holdJ = L.jump === true ? 40 : (L.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        if (holdJ && L.to && !L.push && !L.toNamed) jumps.push([L.name ?? `leg${li}`, this.landingVisible(L.to[0], L.to[1])]);
        if (L.push) {
          for (let k = 0; k < L.push; k++) {
            const d = L.dir ? this.stick(L.dir[0], L.dir[1]) : L.to ? this.stick(L.to[0] - p.pos.x, L.to[1] - p.pos.z) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([L.name ?? `push${li}`, L.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (L.press) { tick({ action: true }); }
        let best = Infinity, still = 0, auto = 0, j0 = L.jumpAt ? null : 0;
        const target = () => {
          if (L.toNamed) { const q = this.namedPos(L.toNamed); if (q) return [q[0] + (L.off?.[0] ?? 0), q[1] + (L.off?.[1] ?? 0)]; }
          return L.to;
        };
        for (; i < max; i++) {
          if (p.dead || c.level.runtime.status !== 'play') break;
          if (rode && L.endOnRide !== false) break;
          const T = target();
          const dx = T[0] - p.pos.x, dz = T[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          const fd = L.to ? Math.hypot(L.to[0] - p.pos.x, L.to[1] - p.pos.z) : dist;
          if (fd < best - 0.05) { best = fd; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && L.autoJump !== false && !L.airOnly) { auto = 26; still = 0; autoJumps++; }
          const done = fd < within && (!holdJ || L.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0 && (!L.airOnly || p.mode === 'ground')) break;
          let mag = L.slow ?? 1;
          let st;
          if (p.mode === 'air' && (holdJ || L.airOnly) && j0 !== null) {
            const k = 2.6, vmax = L.vmax ?? 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= L.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: L.run ?? true, jump, ...(L.hold ?? {}) });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([L.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, L.to ?? L.toNamed]); break; }
      }
      c.setInput({});
      p.invuln = hold ? 0 : p.invuln;
      return { log, jumps, autoJumps, track, steps, hurt, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: c.level.runtime.status, info: p.info(), rt: c.level.runtime.info(), skate: !!p.skate, inv0 };
    },
    landingVisible(x, z) {
      const p = P(), rig = c.view.rig;
      const r = rig.railAt(p.pos.x, p.pos.z, {});
      const D = Math.PI / 180, yaw = r.yaw * D, pitch = r.pitch * D;
      const tx = p.pos.x - Math.sin(yaw) * r.ahead, ty = p.pos.y + r.height, tz = p.pos.z - Math.cos(yaw) * r.ahead;
      const cam = { x: tx + Math.sin(yaw) * Math.cos(pitch) * r.dist, y: ty + Math.sin(pitch) * r.dist, z: tz + Math.cos(yaw) * Math.cos(pitch) * r.dist };
      const g = c.world.raycastDown(x, p.pos.y + 14, z, 40);
      const land = { x, y: (g ? g.y : p.pos.y) + 1.0, z };
      const hit = c.world.raycast(cam, land);
      return !hit || hit.t > 0.97;
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.escaped && !x.hidden && !x.caught && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || c.level.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of c.level.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best && d < (o.radius ?? 40)) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 2.4 && dy > -0.5) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...st, run: dist > 1.5 || o.run, jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => c.level.runtime.info(),
    info: () => P().info(),
    named: (id) => { const e = c.level.named.get(id); return e ? { kind: e.kind, alive: e.alive, defeated: !!e.defeated, state: e.state, broken: !!e.broken, info: e.info?.() } : null; },
    kinds: () => { const m = {}; for (const e of c.level.entities) m[e.kind] = (m[e.kind] ?? 0) + (e.count > 1 && e.members ? 0 : 1); return m; },
    defeated: (kind) => c.level.entities.filter((e) => e.kind === kind && e.defeated).length,
    lives: () => c.level.runtime.save.lives,
  };
  window.__w3 = W;
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
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
        break;
      } catch (err) {
        if (attempt === 1) {
          console.log(`Level ${id} startet nicht. Konsole:`);
          for (const x of errors) console.log('  ', x);
          return false;
        }
      }
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w3[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w3a_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Zeitlimit ${R.timeLimit} s`, meta.timeLimit === R.timeLimit);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of SHOTS_ONLY || ONLY ? [] : ['lotti', 'greta']) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
    }
    const lim = Math.min(180, R.timeLimit * 0.6);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${lim} s (${res.time.toFixed(1)} s)`, reached && res.time < lim);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of SHOTS_ONLY ? [] : pick(R.targets)) {
    for (const hero of t.heroes ?? ['lotti']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      let res = null;
      if (t.legs) res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (t.expectPower && res && res.log.every((l) => l[7] !== t.expectPower)) ok = false;
      if ((!ok || process.env.VERBOSE) && res) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot && ok) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of SHOTS_ONLY ? [] : pick(R.extra ?? [])) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, power: t.power, skate: t.skate, settle: 10 });
      const res = await W('drive', t.legs, { invuln: t.vulnerable ? false : undefined });
      const inR = (v, r) => (r === undefined ? true : Array.isArray(r) ? v >= r[0] && v <= r[1] : v >= r);
      const lives1 = await W('lives');
      let ok = inR(res.info.x, t.expectX) && inR(res.info.y, t.expectY) && inR(res.info.z, t.expectZ) && !res.dead;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectSkate) ok = ok && res.skate;
      if (t.expectNotHurt) ok = ok && res.hurt === 0;
      if (t.expectBroken) { const nm = await W('named', t.expectBroken); res.log.push(['zerbrochen?', t.expectBroken, JSON.stringify(nm)]); ok = ok && (!!nm?.broken || nm?.alive === false); }
      if (t.expectDefeated) { const nm = await W('named', t.expectDefeated); res.log.push(['besiegt?', t.expectDefeated, JSON.stringify(nm)]); ok = ok && !!nm?.defeated; }
      if (t.expectDefeatedKind) { const n = await W('defeated', t.expectDefeatedKind[0]); res.log.push(['besiegt', t.expectDefeatedKind[0], n]); ok = ok && n >= t.expectDefeatedKind[1]; }
      if (t.expectNamedState) { const nm = await W('named', t.expectNamedState[0]); res.log.push(['zustand', JSON.stringify(nm)]); ok = ok && t.expectNamedState[1].includes(nm?.state); }
      if (t.expectRt) { const rt = res.rt; ok = ok && t.expectRt(rt); }
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, bei ${res.info.x.toFixed(1)}, ${res.info.y.toFixed(1)}, ${res.info.z.toFixed(1)}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0})`, ok);
    }
  }

  // ------------------------------------------------ Screenshots je Abschnitt aus der Spielkamera
  if (ONLY) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null] of R.shots) {
    await W('place', pos, { settle: 10 });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.setInput(inp); c.step(n); }, [steps, input ?? {}]);
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
