// Welt 6, Level 6-7 „Wuschelflucht im Glitzerschacht“ (senkrechter Autoscroller: Mine nach oben, Wuschel-Horde jagt von
// unten, Quetschblöcke, danach Wippen-Galerie), 6-Panzer „Kawumm-Kolonne über den Wolken“ (zweite Panzerkolonne als
// Autoscroller, Zündköpfe, große ?-Blöcke wachsen zu Türmen; Boss Wirbelbrocken mit Attrappen) und 6-C „Glibber-Gala im
// Wolkenzirkus“ (Spiegelfrucht-Platz, Seilbahn, Zirkuszelt-Arena mit Boss Würfelblase):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne
// und der Stempel mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w6d_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w6d.mjs [6-7|6-Panzer|6-C]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/
//   Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Im
// Autoscroller wartet der Bot vor Sprüngen, bis das Bildfenster das Ziel erreicht hat (vorne bremst die Bildgrenze).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], y (Mindesthöhe beim Landen), jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow,
//   max, land, need (m Höhe, die das Bildfenster vor dem Absprung frei haben muss) } · { wait } · { hop } (Sprung auf der
//   Stelle) · { bounce: [x, z] (Landeziel), at: [x, z] (Sprungfeld), y } · { crusher: id } (warten, bis der Quetschblock
//   gerade hochgefahren ist) · { mover: id, on: [x, z] | null, off: [x, z], y, until: cond } (fahrende Plattform/Wolke) ·
//   { star: i } · { chaseKind } · { expect: cond } · { until: cond } · { pound: [x, z] } · { wippeStern } (6-7)
const ZL = -1;
const ROUTES = {
  '6-7': {
    start: [0.5, 0, ZL],
    meta: { stars: 3, time: 400, theme: 'fuzzymine', music: 'course_fuzzymine', archetype: 'autoscroller' },
    enemies: { wuschel_horde: 2, wuschel: 4 },
    main: [
      { name: 'Sprungfeld auf der Sohle', bounce: [5.6, ZL], at: [4.4, ZL], y: 4.4 },
      { expect: 'scrollRuns' },
      { name: 'Bretter L2', to: [0, ZL], y: 7, jump: 30, jumpAt: 2.8 },
      { name: 'Wolke c3', to: [3.2, ZL], y: 9.6, jump: 30, jumpAt: 2.2 },
      { name: 'Bretter R4', to: [4.3, ZL], y: 12.2, jump: 30, jumpAt: 3 },
      { name: 'Bretter L5', to: [-0.6, ZL], y: 14.8, jump: 30, jumpAt: 4.4 },
      { name: 'Puffwolke 1', to: [-5.6, ZL], y: 17.4, jump: 30, jumpAt: 2.4, win: 25.8 },
      { name: 'Puffwolke 2', to: [-2.2, ZL], y: 20.0, jump: 30, jumpAt: 3.0 },
      { name: 'Puffwolke 3', to: [1.6, ZL], y: 22.6, jump: 30, jumpAt: 3.4 },
      { name: 'Mittelstation', to: [2.6, ZL], y: 25.2, jump: 30 },
      { name: 'Kontrollpunkt 1', to: [-5.4, -2.0], within: 0.5 },
      { to: [4.8, ZL], within: 0.4 },
      { name: 'Sprungfeld Mittelstation → R6', bounce: [5.4, ZL], at: [6.2, ZL], y: 30.8 },
      { name: 'Sprungfeld R6 → L8', bounce: [3.6, ZL], at: [6.6, ZL], y: 35.2 },
      { name: 'Wolke c9', to: [-1.6, ZL], y: 37.8, jump: 30, jumpAt: 3.4 },
      { name: 'Bretter R10', to: [2.6, ZL], y: 40.4, jump: 30, jumpAt: 3.2 },
      { name: 'Sprungfeld R10 → L11', bounce: [3.4, ZL], at: [4.2, ZL], y: 44.8 },
      { name: 'Goldwolke', mover: 'goldwolke', on: 'right', stand: [3.2, ZL], off: [-5.6, ZL], y: 50.0, rideUntil: 'goldLeft' },
      { name: 'Puffwolke c13', to: [-1.4, ZL], y: 52.6, jump: 30, jumpAt: 3.0, win: 58.4 },
      { name: 'Puffwolke c14', to: [0.6, ZL], y: 55.2, jump: 30, jumpAt: 3.0 },
      { name: 'Felssims', to: [3.8, ZL], y: 57.8, jump: 36, jumpAt: 4 },
      { crusher: 'q6' },
      { name: 'Sprungfeld am Felssims → R16', bounce: [5.6, ZL], at: [7.3, ZL], y: 63.6, keepX: 6.9 },
      { name: 'Wolke c17', to: [0.6, ZL], y: 66.2, jump: 30, jumpAt: 2.9 },
      { name: 'Bretter L18', to: [-3.4, ZL], y: 68.8, jump: 30, jumpAt: 3.4 },
      { name: 'schwebende Wolke', mover: 'c_fahrt', on: 'low', stand: [-3.0, ZL], at: [0.2, ZL], off: [3.6, ZL], y: 75.2, rideUntil: 'cloudHigh' },
      { name: 'Schachtkrone', to: [2.2, ZL], y: 77.8, jump: 30 },
      { until: 'scrollDone', max: 2400 },
      { name: 'Kontrollpunkt 2', to: [0, -9.4], within: 0.5 },
      { name: 'Wippe 1', to: [0, -13.8], within: 0.4, run: false },
      { to: [0, -20.4], within: 0.4, run: false },
      { name: 'Fels 1', to: [0, -22.6], y: 77.8, jump: 30, jumpAt: 2.4 },
      { name: 'Wippe 2', to: [0, -25.8], within: 0.4, run: false },
      { to: [0, -32.4], within: 0.4, run: false },
      { name: 'Fels 2', to: [0, -34.2], y: 77.8, jump: 30, jumpAt: 2.0 },
      { crusher: 'q7' },
      { to: [0, -38.2], within: 0.4, run: false },
      { name: 'Wippe 3', to: [0, -40.0], within: 0.4, run: false },
      { crusher: 'q8' },
      { to: [0, -48.4], within: 0.5, run: true },
      { name: 'Fels 3', to: [0, -50.6], y: 77.8, jump: 30, jumpAt: 2.4 },
      { name: 'Wolkenbrücke', to: [0, -55], within: 0.6, run: false },
      { to: [0, -61], within: 0.6, run: true },
      { name: 'Grubentor', to: [0, -66.5], within: 0.6 },
      { name: 'Zielmast', to: [0, -74], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Fahrt beendet, Horde folgte dem Bild (keine Absturz-Tode)', ok: (r) => r.mech.scrollDone && !r.dead },
      { name: 'Grubentor geöffnet', ok: (r) => r.mech.gate },
    ],
    targets: [],
    extra: [],
    shots: [],
  },
};

const PORT = 4670;
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
  const named = (id) => L.named.get(id);
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
    scrollRuns: () => L.scroll && L.scroll.state !== 'wait',
    scrollDone: () => L.scroll?.state === 'done',
    goldLeft: () => { const m = named('goldwolke'); return m && m.mb.pos.x < -2.6; },
    cloudHigh: () => { const w = named('c_fahrt'); return w && w.mb.pos.y > 71.9; },
    gateOpen: () => !!named('grubentor')?.open,
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
      const mech = { hurts: 0, pipes: 0, bounces: 0, waits: 0, scrollDone: false, gate: false, maxY: -99 };
      const track = [];
      let lastJump = false;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        lastJump = !!inp?.jump;
        c.setInput(inp); c.step(1); steps++;
        mech.maxY = Math.max(mech.maxY, p.pos.y);
        if (L.scroll?.state === 'done') mech.scrollDone = true;
        if (named('grubentor')?.open) mech.gate = true;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.y - t[1], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +(L.scroll?.s ?? 0).toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '', +(L.scroll?.center?.y ?? 0).toFixed(1)]); if (hist.length > 40) hist.shift(); }
        if (window.__trace && window.__trace(p, steps)) log.push(['T', steps, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), p.mode, p.state, p.jumpKind, p.ground?.tag ?? '', +p.vel.y.toFixed(2), JSON.stringify(inp)]);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      /** Im Autoscroller: warten, bis die vordere Bildgrenze über der Höhe y liegt (Landeplatz), höchstens max Schritte. */
      const gate = (y, max = 2400) => {
        const w = L.scroll, arch = L.archetype;
        if (y === undefined || !w || w.state === 'done' || !arch?.frame || w.dir.y < 0.5) return 0;
        let k = 0;
        while (k < max && w.state !== 'done' && y + 0.5 > w.center.y + arch.frame.front) { tick({}); k++; }
        if (k) mech.waits += k;
        return k;
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
        // gehaltene Sprungtaste vom vorigen Bein loslassen (ein neuer Sprung braucht einen neuen Druck)
        if (lastJump) tick(p.mode === 'air' ? { jump: false } : {});
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](Lg.arg); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](Lg.arg); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until](Lg.arg)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Quetschblock: warten, bis er gerade wieder oben ist
        if (Lg.crusher) {
          const q = named(Lg.crusher);
          let k = 0, seenBack = q.state === 'zurueck';
          for (; k < 1600; k++) {
            if (q.state === 'zurueck') seenBack = true;
            if (seenBack && q.state === 'ruhe') break;
            tick({});
          }
          log.push(['quetschblock', Lg.crusher, k, q.state]);
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
        // ------------------------------------------------ Sprungfeld: hinaufspringen, hochfedern, zum Ziel lenken
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
            // zuerst senkrecht (an Gehäusen/Brettern vorbei), dann zum Ziel
            const steer = p.vel.y < (Lg.steerBelow ?? 6) || Lg.keepX === undefined;
            const gx = Lg.keepX !== undefined && p.vel.y >= (Lg.steerBelow ?? 6) ? Lg.keepX : tx;
            tick({ ...(steer || Lg.keepX !== undefined ? this.airSteer(gx, tz, 0, 0, 2.6, 7) : {}), jump: true });
            if (p.mode === 'ground') { landed = true; break; }
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['Sprungfeld', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed || !okY) { log.push(['FEHLER: Sprungfeld', Lg.name ?? Lg.at, JSON.stringify(hist.slice(-25))]); break; }
          continue;
        }
        // ------------------------------------------------ fahrende Plattform/Wolke: abwarten, aufspringen, mitfahren, abspringen
        if (Lg.mover) {
          const m = named(Lg.mover);
          const mpos = () => (m.pm ? m.pm.pos : m.mb.pos);
          const ready = () => {
            if (Lg.on === 'right') return m.mb.pos.x > 3.1 && Math.abs(p.pos.x - Lg.stand[0]) < 0.4;
            if (Lg.on === 'low') return m.mb.pos.y < 70.8 && Math.abs(p.pos.x - Lg.stand[0]) < 0.4;
            return true;
          };
          let k = 0;
          for (; k < 2400 && !ready(); k++) {
            const sp = Lg.stand ?? null;
            if (sp) { const dx = sp[0] - p.pos.x, dz = sp[1] - p.pos.z; tick(Math.hypot(dx, dz) > 0.3 ? { ...this.stick(dx, dz, 0.5), run: false } : {}); }
            else tick({});
          }
          // aufspringen
          let j = 0, on = false;
          for (; j < 300; j++) {
            const q = mpos();
            const tx = q.x, tz = Lg.at?.[1] ?? q.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, (m.pm ? m.mover : m.mb.mover)?.vx ?? 0, 0, 3.2, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: j < 26, run: false });
            if (j > 8 && p.mode === 'ground') { on = p.pos.y > (Lg.onY ?? (m.pm ? q.y + 0.2 : q.y + 0.3)); break; }
          }
          if (!on) { log.push(['FEHLER: nicht auf', Lg.mover, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2)]); break; }
          // mitfahren, bis rideUntil gilt und das Bildfenster das Ziel zeigt
          const winOk = () => { const w = L.scroll, fr = L.archetype?.frame, y = Lg.win ?? Lg.y; return y === undefined || !w || w.state === 'done' || !fr || y + 0.5 <= w.center.y + fr.front; };
          let r = 0;
          for (; r < 3600 && !(COND[Lg.rideUntil]() && winOk()); r++) {
            const q = mpos();
            const dx = q.x - p.pos.x;
            tick(Math.abs(dx) > 0.3 ? { ...this.stick(dx, 0, 0.5), run: false } : {});
          }
          // abspringen zum Ziel
          const [tx, tz] = Lg.off;
          let a = 0;
          for (; a < 400; a++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.8, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 30, run: false });
            if (a > 10 && p.mode === 'ground') break;
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['gefahren', Lg.mover, k, j, r, a, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!okY) { log.push(['FEHLER: Abprung von', Lg.mover]); break; }
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        if (holdJ) { for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({}); gate(Lg.win ?? Lg.y); }
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        const y0 = p.pos.y;
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const highEnough = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          const done = dist < within && highEnough && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          // Sprung misslungen (wieder unten gelandet): neu anlaufen
          if (holdJ && landed && p.mode === 'ground' && !highEnough && i > 20) { landed = false; airborne = false; j0 = i + 1; gate(Lg.win ?? Lg.y); }
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 8);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 >= 0 && i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? false, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, +(L.scroll?.center?.y ?? 0).toFixed(1)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to, Lg.y, y0]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
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
  window.__w6 = W;
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
  // TRACE='<Bedingung über p, s>' protokolliert jeden Schritt, für den sie gilt (Fehlersuche)
  if (process.env.TRACE) await sc((src) => { window.__trace = new Function('p', 's', `return (${src});`); }, process.env.TRACE);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w6[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w6d_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w6.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) if (n) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
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
      await W('place', pt.slice(0, 3), { settle: 6, scroll: pt[3] });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(30)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, scroll: t.scroll });
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
      await W('place', t.from, { hero, settle: 10, scroll: t.scroll, ...(t.place ?? {}) });
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
  for (const [name, pos, scroll, steps = 0, input = null] of R.shots) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, scroll });
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
