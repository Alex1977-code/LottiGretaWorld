// Welt 1, Level 1-1 „Kraxelwiese“ und 1-2 „Laternengrotte“: Laden ohne Konsolenfehler, Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel (Teleport in die
// Nähe + kurze Eingabefolge), Zeit bis zum Ziel < 180 s Spielzeit, Kennzahlen (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Screenshots aus der Spielkamera je Abschnitt (tests/out/w1a_*.png).
// Aufruf (nach npm run build): PORT_BASE=2000 node tests/course_w1a.mjs [1-1|1-2]
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), rennt, springt an
// festgelegten Stellen (Taste gehalten) und wartet Röhrenfahrten ab. Gegner bleiben aktiv; die Figur ist für die
// Routenfahrt unverwundbar (Abpraller zählen weiter), damit nur die Geometrie geprüft wird.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Wegpunkte [x, z]; jump = Schritte mit gehaltener Sprungtaste (40 ≈ volle Höhe); if/ifNot = benannte Glasröhre
// vorhanden bzw. nicht vorhanden (Rückfallweg, solange es den Baustein nicht gibt); rideInput = Stick während einer
// Röhrenfahrt (Gabelung wählen).
const ROUTES = {
  '1-1': {
    start: [0, 1, 5],
    enemies: { pilzling: 7, krallen_pilzling: 3, schnappblume: 1 },
    main: [
      { name: 'Treppe', to: [-3, -3.8] },
      { name: 'Terrasse', to: [-3, -10.5], jump: 40 },
      { name: 'Brücke', to: [-4, -21] },
      { to: [-4, -31] },
      { name: 'Röhren-Wiese', to: [-1, -53.5] },
      { to: [-1, -55.5] },
      { name: 'Sprung Abschnitt 3', to: [-1, -62], jump: 40 },
      { to: [5.6, -67.6] },
      { name: 'Hügel 1', to: [6.5, -71.2], jump: 40 },
      { to: [6.5, -73.4] },
      { name: 'Hügel 2', to: [6.5, -78.6], jump: 40 },
      { to: [6.5, -81.2] },
      { name: 'Plateau', to: [6.5, -85], jump: 40 },
      { to: [-3.5, -90.4] },
      { name: 'Checkpoint', to: [-3.5, -98.4] },
      { to: [-1, -110] },
      { name: 'Hohlweg', to: [0, -123] },
      { to: [0, -135.6] },
      { name: 'Ziegelreihe', to: [0, -145.6] },
      { name: 'Brücke 2', to: [0, -157.6] },
      { name: 'Glasröhre Ziel', to: [0, -172], if: 'g_goal', within: 0.8 },
      { to: [0, -173.4], ifNot: 'g_goal' },
      { to: [0, -181], jump: 40, ifNot: 'g_goal' },
      { to: [0, -183], ifNot: 'g_goal' },
      { to: [0, -186.2], jump: 40, ifNot: 'g_goal' },
      { name: 'Zielmast', to: [0, -192.9], jump: 40, within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0 über den Abzweig der Glasröhre', star: 0, from: [6.5, 1, -7.5],
        legs: [{ to: [6.5, -12], rideInput: { x: 1, y: 0.4 } }, { to: [8.5, -46.5] }], shot: 'stern0' },
      { name: 'Stern 1 mit Krallen von unten', star: 1, from: [11, 0.5, -152], power: 'krallen',
        legs: [{ to: [9.3, -159], max: 400, within: 0.25 }, { push: 160, jump: 10, to: [6, -159] }, { to: [7.4, -159], within: 0.3 }], shot: 'stern1' },
      { name: 'Stern 1 mit Riesentrank vom Hügel (10 s)', star: 1, from: [8, 12, -98.5], power: 'riese',
        legs: [{ to: [3, -104] }, { to: [0, -123] }, { to: [0, -145] }, { to: [0.5, -156.5] }, { to: [0.5, -159] }, { to: [7.4, -159], within: 0.3, autoJump: false }, { wait: 60 }] },
      { name: 'Stern 2 (kleiner Hase am Teich)', star: 2, from: [1, 7, -106], chase: 'bunny' },
      { name: 'Stempel im Raum hinter der Teich-Röhre', from: [9.2, 8.2, -115.4],
        legs: [{ crouch: 4 }, { to: [86.4, -111.2] }, { to: [87.5, -113.4], jump: 30 }, { to: [90.4, -114.9], jump: 34 }, { to: [93.5, -113.6], jump: 40 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Krallen-Anzug aus dem ersten ?-Block (anstoßen, draufspringen)', from: [-4, 4, -9.6],
        legs: [{ to: [-4, -11.6], within: 0.25, run: false }, { hop: 20 }, { wait: 90 },
          { to: [-4, -8.9], within: 0.2, run: false }, { wait: 40 }, { to: [-4, -11.6], jump: 40, jumpAt: 2.3, slow: 0.45, run: false, within: 0.3 }, { wait: 30 }], expectPower: 'krallen' },
      { name: 'Kletterwand mit Krallen-Anzug (6 m)', from: [-3.5, 4, -71.5], power: 'krallen',
        legs: [{ to: [-3.5, -75.4], within: 0.25 }, { push: 150, jump: 10, to: [-3.5, -80] }, { to: [-3.5, -80] }], expectY: 9.9 },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['terrasse', [-2, 4, -15]],
      ['roehrenwiese', [-1, 4, -41]],
      ['kletterwand', [1, 4, -66]],
      ['plateau', [0, 10, -84]],
      ['checkpoint', [-2, 7, -100]],
      ['teich', [1, 7, -110]],
      ['hohlweg', [0, 7, -122]],
      ['bruecke', [0, 7, -147]],
      ['durchgang', [11, 0.5, -147]],
      ['nische', [0, 7, -160]],
      ['ziel', [0, 7, -179]],
      ['raum', [86, 1, -108]],
    ],
  },
  '1-2': {
    start: [0, 13, 5],
    enemies: { panzerkroete: 12, pilzling: 13, pilzlingsturm: 1 },
    main: [
      { name: 'zur Röhre', to: [3.6, -4.8] },
      { name: 'auf die Röhre', to: [4.2, -6.6], jump: 26, within: 0.3, run: false },
      { crouch: 4 },
      { name: 'Höhleneingang', to: [-2.5, -40] },
      { to: [-2.5, -54] },
      { name: 'Steg', to: [0, -58] },
      { name: 'Röhrenfeld', to: [1, -66] },
      { to: [-1.5, -72] },
      { to: [-1.5, -80.5] },
      { name: 'Checkpoint', to: [-1, -87.2] },
      { to: [-3.5, -87.4] },
      { name: 'Wolke 1', to: [-3.5, -89.5], jump: 40 },
      { name: 'Wolke 2', to: [1.5, -93.6], jump: 40 },
      { name: 'Wolke 3 (fährt)', to: [4.3, -98], jump: 40, within: 0.5 },
      { name: 'Wolke 4', to: [1.5, -102.4], jump: 40 },
      { name: 'Wolke 5', to: [-3, -106.4], jump: 40 },
      { name: 'obere Gerade', to: [-1, -111.6], jump: 40 },
      { name: 'Glasröhre hinab', to: [0, -116.4], if: 'g_down', within: 0.8 },
      { to: [0, -116.6], ifNot: 'g_down' },
      { to: [0, -129], jump: 40, ifNot: 'g_down' },
      { name: 'Dreitor-Raum', to: [0, -140] },
      { name: 'Tor 2', to: [0, -147.5] },
      { name: 'Gang', to: [0, -156.6] },
      { name: 'Röhre Arena', to: [0, -158.4], jump: 26, within: 0.3 },
      { crouch: 4 },
      { name: 'Arena', to: [56, -155] },
      { to: [57.4, -158] },
      { name: 'Röhre Ziel', to: [57.4, -159.6], jump: 26, within: 0.3 },
      { crouch: 4 },
      { name: 'Ziel', to: [50, -176.2] },
      { to: [50, -180.2], jump: 40 },
      { name: 'Zielmast', to: [50, -185.9], jump: 40, within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0 zwischen den Wolken', star: 0, from: [1.5, 5.3, -93.6],
        legs: [{ to: [4.3, -98], jump: 40, within: 0.5 }, { to: [7.4, -103], jump: 40 }, { to: [7.4, -103], jump: 20 }], shot: 'stern0' },
      { name: 'Stern 1 in der Rätselbox (zwei Panzerkröten)', star: 1, from: [8.3, 5.2, -138.4], power: 'funken',
        legs: [{ to: [8.3, -140.2], jump: 20, within: 0.4 }, { wait: 120 }],
        chase: 'panzerkroete', chaseOpts: { action: true, minX: 85 }, after: [{ wait: 60 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2 im Pilzlingsturm', star: 2, from: [50, 1, -145], power: 'funken',
        chase: 'pilzlingsturm', chaseOpts: { action: true }, after: [{ wait: 30 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel über die unsichtbare Blockkette', from: [-1.8, 1, -148.2],
        legs: [{ to: [-1.8, -150.4], jump: 30, within: 0.4 }, { to: [-2.9, -152.2], jump: 34, within: 0.35 },
          { to: [-2.9, -153.8], jump: 40, within: 0.35 }, { to: [-2.9, -155.4], jump: 40, within: 0.35 },
          { to: [-4.6, -155], jump: 20, within: 0.4 }, { to: [-7, -155], within: 0.8 }, { to: [-17.6, -155] }, { to: [-19, -155], jump: 24 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Funkenblüte aus dem ersten ?-Block', from: [-2.6, 13.4, -2.8],
        legs: [{ to: [-2.6, -4.6], within: 0.25, run: false }, { hop: 20 }, { wait: 90 },
          { to: [-2.6, -1.9], within: 0.2, run: false }, { wait: 40 }, { to: [-2.6, -4.6], jump: 40, jumpAt: 2.3, slow: 0.45, run: false, within: 0.3 }, { wait: 30 }], expectPower: 'funken' },
      { name: 'Welt-Warp: Kletterwand mit Krallen zur Röhre', from: [2.4, 1, -155], power: 'krallen',
        legs: [{ to: [3, -155], within: 0.2 }, { push: 150, jump: 10, to: [6, -155] }, { to: [6.4, -155], jump: 26, within: 0.3 }, { crouch: 4 }], expectX: 90 },
      { name: 'Versteckter Raum: Stampfen auf die Kristallblöcke', from: [3.2, 5.7, -45.2], startY: 5.5,
        legs: [{ to: [3.2, -47.6], within: 0.3, run: false }, { stomp: true }, { wait: 90 }], expectY: [0.9, 1.6], expectZ: [-51, -44.6] },
    ],
    shots: [
      ['start', [0, 13, 5]],
      ['eingang', [-2, 1, -33]],
      ['raumdach', [3.2, 5.7, -45.5]],
      ['roehrenfeld', [0, 1, -62]],
      ['wolken', [-1, 1, -87]],
      ['wolken_oben', [1.5, 9.3, -102.4]],
      ['gerade', [0, 13, -111]],
      ['dreitor', [0, 1, -132]],
      ['gang', [0, 1, -149]],
      ['gehege', [-15.6, 8, -155]],
      ['arena', [50, 1, -145]],
      ['ziel', [50, 1, -174]],
      ['goldraum', [-60, 1, -130]],
      ['raetselraum', [100, 1, -127]],
      ['welt2', [100, 1, -33]],
    ],
  },
};

const PORT = 4198;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['1-1', '1-2'];
const STRICT = true;

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
      c.level.runtime.status = 'play';
      c.level.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      return p.info();
    },
    /** Stick-Eingabe für eine Welt-Richtung (dx, dz) relativ zur Steuerungs-Gier. */
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = c.level.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    /**
     * Wegpunkte abfahren. leg = { to: [x, z], jump?: Halteschritte (true = 40), run?: true, within?: 0.6,
     * land?: true (bei Sprung: erst nach der Landung weiter), max?: 900, crouch?: Schritte (Röhre betreten),
     * wait?: Schritte ohne Eingabe, action?: true, ride?: true (auf Röhrenfahrt warten), push?: Schritte nur
     * drücken (Klettern), slow?: Stick-Stärke }. Liefert Protokoll.
     */
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      const jumps = [];
      const track = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      let rideInput = {};
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (steps % 24 === 0 && p.mode !== 'script') track.push([p.pos.x, p.pos.y, p.pos.z]);
        if (p.mode === 'script' && c.level.runtime.status === 'play' && !p.dead) {
          // Röhren-/Glasröhrenfahrt abwarten (rideInput: Stick an Gabelungen)
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && c.level.runtime.status === 'play') {
            if (hold) p.invuln = Math.max(p.invuln, 5);
            const ri = rideInput.x !== undefined ? this.stick(...this.worldOf(rideInput)) : {};
            c.setInput(ri); c.step(1); steps++;
          }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const L = legs[li];
        if (p.dead || c.level.runtime.status !== 'play') break;
        if (L.if && !c.level.named.has(L.if)) continue;
        if (L.ifNot && c.level.named.has(L.ifNot)) continue;
        rideInput = L.rideInput ?? {};
        if (L.wait) { for (let i = 0; i < L.wait; i++) tick({}); continue; }
        if (L.crouch) { for (let i = 0; i < L.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (L.action) { tick({ action: true }); tick({}); continue; }
        if (L.hop) {
          // auf der Stelle springen (z. B. Block von unten anstoßen), dann landen
          for (let k = 0; k < L.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          continue;
        }
        if (L.stomp) {
          // Stampfattacke: hochspringen, am Scheitel ducken
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (L.star !== undefined) {
          // zum (erschienenen) Stern Nr. L.star laufen
          const n = this.chase('star', { filter: (e) => e.index === L.star, max: 900 });
          log.push(['stern', L.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        const max = L.max ?? 900;
        const within = L.within ?? 0.6;
        const holdJ = L.jump === true ? 40 : (L.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        if (holdJ && L.to && !L.push) {
          const vis = this.landingVisible(L.to[0], L.to[1]);
          jumps.push([L.name ?? `leg${li}`, vis]);
        }
        if (L.push) {
          // gegen eine Wand drücken (anspringen: jump = Halteschritte), z. B. Klettern mit dem Krallen-Anzug
          for (let k = 0; k < L.push; k++) {
            const d = L.to ? this.stick(L.to[0] - p.pos.x, L.to[1] - p.pos.z) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([L.name ?? `push${li}`, L.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        let best = Infinity, still = 0, auto = 0, j0 = L.jumpAt ? null : 0;
        for (; i < max; i++) {
          if (p.dead || c.level.runtime.status !== 'play') break;
          const dx = L.to[0] - p.pos.x, dz = L.to[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          // festgefahren (Stufe im Weg)? → nachspringen
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && L.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          // Sprung-Etappen enden erst nach der Landung (oder im Wasser)
          const done = dist < within && (!holdJ || L.land === false || landed);
          if (done && i > 0) break;
          let mag = L.slow ?? 1;
          let st;
          if (L.delay && i < L.delay) {
            st = { x: 0, y: 0 };            // erst senkrecht hoch, dann lenken (auf einen Block springen)
          } else if (p.mode === 'air' && holdJ && j0 !== null) {
            // in der Luft: auf eine Wunsch-Geschwindigkeit zum Ziel hin lenken (bremst vor dem Landepunkt)
            const k = 2.6, vmax = 11;
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
          tick({ ...st, run: L.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([L.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, L.to]); break; }
      }
      c.setInput({});
      return { log, jumps, autoJumps, track, occluders: this.occluders(track), steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: c.level.runtime.status, info: p.info(), rt: c.level.runtime.info() };
    },
    /**
     * Ist der Landepunkt (x, z) aus der Spielkamera sichtbar? Kamera wie im Spiel aus der Schiene an der Figur
     * (Neigung, Abstand, Gier, Vorausschau); Strahl Kamera → Landepunkt (1 m über dem Boden) gegen feste Formen.
     */
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
    /**
     * Baumkronen (deco 'tree', Kugel-Näherung) zwischen Kamera und Kopf der Figur entlang einer Spur → Liste der
     * verdeckenden Bäume mit Anzahl der betroffenen Spurpunkte.
     */
    occluders(track) {
      const trees = [];
      for (const seg of c.level.data.segments ?? []) {
        for (const it of seg.items ?? [seg]) {
          if (it.kind !== 'tree' || !(seg.type === 'deco')) continue;
          const h = it.size ?? 4.5, R = h * 0.26;
          trees.push({ x: it.pos[0], y: it.pos[1] + h * 0.42 + R * 1.1, z: it.pos[2], r: R * 1.15, at: it.pos.join(','), n: 0 });
        }
      }
      const rig = c.view.rig, D = Math.PI / 180;
      for (const [px, py, pz] of track) {
        const r = rig.railAt(px, pz, {});
        const yaw = r.yaw * D, pitch = r.pitch * D;
        const tx = px - Math.sin(yaw) * r.ahead, ty = py + r.height, tz = pz - Math.cos(yaw) * r.ahead;
        const cam = [tx + Math.sin(yaw) * Math.cos(pitch) * r.dist, ty + Math.sin(pitch) * r.dist, tz + Math.cos(yaw) * Math.cos(pitch) * r.dist];
        const head = [px, py + 1.1, pz];
        for (const t of trees) {
          // Abstand Kugelmitte – Strecke Kamera→Kopf
          const d = [head[0] - cam[0], head[1] - cam[1], head[2] - cam[2]];
          const w = [t.x - cam[0], t.y - cam[1], t.z - cam[2]];
          const L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
          const k = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / L2));
          const q = [cam[0] + d[0] * k - t.x, cam[1] + d[1] * k - t.y, cam[2] + d[2] * k - t.z];
          if (Math.hypot(...q) < t.r) t.n++;
        }
      }
      return trees.filter((t) => t.n > 0).map((t) => `Baum ${t.at} (${t.n}×)`);
    },
    /** Welt-Richtung [dx, dz] aus { x: rechts, y: vorn } (Kamera ohne Drehung). */
    worldOf(v) { return [v.x ?? 0, -(v.y ?? 0)]; },
    /**
     * Lenkt auf eine Entität zu (Hasen fangen, Gegner besiegen, erschienene Sterne holen), bis keine passende mehr
     * lebt. o = { filter, max, action (Aktion – z. B. Feuerball – alle 24 Schritte), minX/maxX (Bereich) }.
     */
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && (!o.filter || o.filter(x)) && (o.minX === undefined || x.pos.x >= o.minX) && (o.maxX === undefined || x.pos.x <= o.maxX);
      for (; n < max; n++) {
        if (p.dead || c.level.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of c.level.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = ((n % 48) < 20 && dist < 2.4) || (dy > 0.8 && (n % 48) < 30);
        const action = !!o.action && (n % 24) === 0 && dist < 9;
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...st, run: dist > 1.5, jump, action });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => c.level.runtime.info(),
    info: () => P().info(),
    count: (kind) => c.level.entities.filter((e) => e.kind === kind).length,
    kinds: () => { const m = {}; for (const e of c.level.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
  };
  window.__w1 = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id) {
    // gleiches Level: Szene neu starten (schneller als die Seite neu zu laden)
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
  } else {
    await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 90000 });
    try {
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
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

const W = (name, ...args) => sc(([n, a]) => window.__w1[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 1100) {
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w1a_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, stars: d.stars?.length ?? 0, marks: d.marks }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind}`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of ['lotti', 'greta']) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}`);
    if (!reached) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
      check(`${id}: keine Baumkrone verdeckt die Figur auf der Hauptroute (${res.track.length} Spurpunkte)${res.occluders.length ? ' – ' + res.occluders.join('; ') : ''}`, res.occluders.length === 0);
    }
    check(`${id}: ${hero} Zeit bis zum Ziel < 180 s (${res.time.toFixed(1)} s)`, reached && res.time < 180);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of R.targets) {
    for (const hero of t.heroes ?? ['lotti']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      let res = null;
      if (t.legs) res = await W('drive', t.legs, {});
      if (t.chase) await W('chase', t.chase, t.chaseOpts ?? {});
      if (t.after) res = await W('drive', t.after, {});
      const rt = await W('rt');
      const ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (!ok && res) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of R.extra ?? []) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);                   // frisches Level je Heldin (Blöcke/Power-ups unverbraucht)
      const st0 = await W('place', t.from, { hero, power: t.power, settle: 10 });
      if (t.startY !== undefined && st0.y < t.startY) { check(`${id}: ${t.name} (${hero}) – Startpunkt fehlt (y ${st0.y.toFixed(2)})`, false); continue; }
      const res = await W('drive', t.legs, {});
      const inR = (v, r) => (r === undefined ? true : Array.isArray(r) ? v >= r[0] && v <= r[1] : v >= r);
      const ok = inR(res.info.x, t.expectX) && inR(res.info.y, t.expectY) && inR(res.info.z, t.expectZ) && !res.dead && (!t.expectPower || res.info.power === t.expectPower);
      if (!ok) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, bei ${res.info.x.toFixed(1)}, ${res.info.y.toFixed(1)}, ${res.info.z.toFixed(1)}${t.expectPower ? ', Power ' + res.info.power : ''})`, ok);
    }
  }

  // ------------------------------------------------ Screenshots je Abschnitt aus der Spielkamera
  await load(id);
  for (const [name, pos, steps = 0, input = null] of R.shots) {
    await W('place', pos, { settle: 10 });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.setInput(inp); c.step(n); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(22)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors.filter((e) => !/unbekannte (Entität|Baustein)/.test(e) || STRICT)) ? 0 : 1);
