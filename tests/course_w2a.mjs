// Welt 2, Level 2-1 „Rieselschlucht“ und 2-2 „Sternenklavier“: Laden ohne Konsolenfehler, Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel (Teleport in die
// Nähe + kurze Eingabefolge mit der echten Mechanik: Krallen-Klettern, Hackvogel hacken lassen, Hackvogel besiegen,
// Sandblock-Treppe, Tastensteine, Antippen, Kristallwand stampfen, Propellerplattformen, Münzmarder einholen …),
// Mechanik-Prüfungen (Treibsand sinken/fließen, Goldröhre + Goldschalter, Extraleben-Geheimnis), Zeit bis zum Ziel
// < 180 s Spielzeit, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und
// Screenshots aus der Spielkamera je Abschnitt (tests/out/w2a_*.png).
// Aufruf (nach npm run build): PORT_BASE=5000 node tests/course_w2a.mjs [2-1|2-2]
//   SHOTS_ONLY=1 → nur Screenshots/Kennzahlen (schnelle Sichtprüfung)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), rennt, springt an
// festgelegten Stellen (Taste gehalten), wartet Röhrenfahrten ab und tippt Antipp-Ziele über den echten Bildschirm-
// Tipp an (taps.tapScreen an der Bildschirmlage des Ziels). Gegner bleiben aktiv; die Figur ist für die Routenfahrt
// unverwundbar (Abpraller zählen weiter), damit nur die Geometrie geprüft wird.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Wegpunkte [x, z]; jump = Schritte mit gehaltener Sprungtaste (40 ≈ volle Höhe); jumpAt = erst ab diesem Abstand
// springen; toNamed = bewegtes Ziel (level.named: box/pm/pos); tap = Antipp-Ziel (Daten-Id) per Bildschirm-Tipp;
// action = Aktionstaste; wait = Schritte ohne Eingabe; crouch = ducken (Röhre); push = Schritte nur drücken (Klettern).
const ROUTES = {
  '2-1': {
    start: [0, 1, 5],
    enemies: { hackvogel: 13, brummer: 4 },
    main: [
      { name: 'Start', to: [-0.6, -7.6] },
      { name: 'Trittstein 1', to: [-3, -11.4], jump: 30 },
      { name: 'Trittstein 2', to: [1.8, -15], jump: 34 },
      { name: 'Trittstein 3', to: [-2.2, -18.6], jump: 34 },
      { name: 'Ufer', to: [-2, -22.4], jump: 30 },
      { name: 'Goldwand', to: [0, -36] },
      { to: [0, -43] },
      { name: 'Felssäule', to: [0, -47], jump: 34 },
      { name: 'Oase', to: [-0.5, -51.6], jump: 34 },
      { name: 'Checkpoint', to: [-5.6, -57.2] },
      { to: [-4.6, -64] },
      { to: [-0.4, -68.6] },
      { name: 'Fliesen (ausweichend)', to: [0, -84.6], within: 0.8 },
      { name: 'Fliesen (kippend)', to: [0, -101.5], within: 0.8 },
      { name: 'Schmaler Steg 1', to: [0, -104.4], run: false, within: 0.3 },
      { name: 'Steg-Säulen', to: [0, -116.2], waitPeck: true, within: 0.3 },
      { name: 'Hackvogel Mittelinsel', to: [-1.6, -118], run: false, within: 0.3 },
      { to: [-1.6, -120], run: false, within: 0.3 },
      { name: 'Schmaler Steg 2', to: [0, -121], run: false, within: 0.3 },
      { to: [0, -131], waitPeck: true, within: 0.4 },
      { name: 'Ring-Plateau', to: [-3, -138] },
      { to: [-2, -154.6] },
      { name: 'Sandstrom', to: [-1, -162.6], jump: 40 },
      { name: 'Krümel', to: [0.6, -170] },
      { to: [0, -181] },
      { name: 'Schiebebrücke', toTile: 'fb_slide', to: [0, -203.4], within: 0.8 },
      { name: 'Zielmast', to: [0, -211.4], within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug aus dem ?-Block, Wachturm hochklettern', star: 0, from: [2.4, 1, -1.4],
        legs: [{ to: [2.4, -3.4], within: 0.25, run: false }, { hop: 20 }, { wait: 90 }, { to: [2.4, -0.9], within: 0.2, run: false }, { wait: 40 },
          { to: [2.4, -3.4], jump: 40, jumpAt: 2.3, slow: 0.45, run: false, within: 0.3 }, { wait: 30 },
          { to: [-7.2, 0], within: 0.3 }, { push: 170, jump: 10, to: [-7.2, -5] }, { to: [-7.2, -5.2] }], shot: 'stern0', expectPower: 'krallen' },
      { name: 'Stern 1: eingeschlossenen Hackvogel den Nordost-Block zerhacken lassen', star: 1, from: [6, 1, -142.2],
        legs: [{ wait: 420 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht, wenn man von Süden kommt (Block S zerhackt)', star: 1, expectNot: true, from: [2, 1, -132.4],
        legs: [{ wait: 360 }] },
      { name: 'Stern 2: Krümels Hackvogel besiegen', star: 2, from: [-1.4, 1, -171.2],
        legs: [{ stompEnemy: 'hv_kruemel' }, { wait: 60 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: bröselnde Sandblock-Treppe zum Sims', from: [3.6, 1, -178.4], stamp: true,
        legs: [{ to: [5.4, -178.4], jump: 30, within: 0.4 }, { to: [6.7, -178.4], jump: 30, within: 0.4 }, { to: [8, -178.4], jump: 30, within: 0.4 },
          { to: [11.6, -176.4], jump: 30 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Goldröhre auf der Wand (Sprungfeld) → Bonusraum mit goldenem Schalter', from: [3.4, 1, -34.6],
        legs: [{ to: [3.4, -36.6], within: 0.3, run: false, land: false }, { wait: 30 }, { toAir: [8.2, -33.2], max: 400 }, { to: [8.2, -33.2], within: 0.25, run: false }, { crouch: 4 },
          { to: [91, -34], within: 0.4 }, { hop: 20 }, { wait: 30 }, { collectRain: 600 }],
        expectX: [80, 100], expectCoins: 20, heroes: ['lotti'] },
      { name: 'Treibsand: Figur sinkt ein und springt heraus', from: [0, 1, -12.4], sand: true,
        legs: [{ wait: 120 }, { expectSand: true }, { to: [-3, -11.4], jump: 40, within: 0.5 }, { to: [-3, -11.4], jump: 40, within: 0.5 }], expectY: [1.4, 2], heroes: ['lotti'] },
      { name: 'Fließender Treibsand trägt nach rechts', from: [-2, 1, -159], heroes: ['lotti'],
        legs: [{ wait: 90 }, { expectSand: true }], expectX: [0.4, 6] },
      { name: 'Extraleben-Geheimnis über dem Säulenstumpf', from: [-7, 1, -64.8], heroes: ['lotti'],
        legs: [{ to: [-7, -65.4], within: 0.2, run: false }, { hop: 30 }, { wait: 60 }, { chaseKind: 'powerup' }], expectLives: 1 },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['wachturm', [-3, 1, 0]],
      ['becken', [0, 1, -7]],
      ['goldwand', [0, 1, -26]],
      ['saeule', [0, 1, -41]],
      ['oase', [-5, 1, -56]],
      ['fliesen', [0, 1, -69]],
      ['rast', [0, 1, -84.6]],
      ['steg', [0, 1, -103]],
      ['steg2', [0, 1, -119]],
      ['ring', [0, 1, -133]],
      ['sandstrom', [0, 1, -150]],
      ['kruemel', [0, 1, -166]],
      ['treppe', [2, 1, -178]],
      ['schiebebruecke', [0, 1, -186]],
      ['ziel', [0, 1, -204]],
      ['bonusraum', [85, 2.4, -29]],
    ],
  },
};

const PORT = 4361;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['2-1', '2-2'].filter((id) => ROUTES[id]);
const STRICT = true;
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;

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
    /** Antipp-Ziel (Besitzer = level.named.get(id)) über den echten Bildschirm-Tipp auslösen. */
    tap(id) {
      const owner = c.level.named.get(id);
      const taps = c.level.taps;
      const t = taps?.targets.find((x) => x.owner === owner);
      if (!t) return { ok: false, why: 'kein Ziel' };
      c.view.render?.();
      const s = taps.screenPos(t);
      const hit = taps.tapScreen(s.x, s.y);
      return { ok: hit === t, s, enabled: t.enabled() };
    },
    /** Mitte (x, z) eines bewegten Objekts (level.named: box/pm/pos). */
    namedPos(id) {
      const m = c.level.named.get(id);
      const q = m?.box?.pos ?? m?.pm?.pos ?? m?.pos;
      return q ? [q.x, q.z, q.y] : null;
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      const jumps = [];
      const track = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      let rideInput = {}, rode = false;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (steps % 24 === 0 && p.mode !== 'script') track.push([p.pos.x, p.pos.y, p.pos.z]);
        if (p.mode === 'script' && c.level.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && c.level.runtime.status === 'play') {
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.setInput(rideInput.x !== undefined ? this.stick(rideInput.x, -(rideInput.y ?? 0)) : {}); c.step(1); steps++;
          }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const L = legs[li];
        if (p.dead || c.level.runtime.status !== 'play') break;
        rideInput = L.rideInput ?? {};
        rode = false;
        if (L.wait) { for (let i = 0; i < L.wait; i++) tick({}); continue; }
        if (L.crouch) { for (let i = 0; i < L.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (L.action) { tick({ action: true }); tick({}); continue; }
        if (L.tap) { const r = this.tap(L.tap); log.push(['tipp', L.tap, r.ok, r.enabled]); tick({}); for (let i = 0; i < (L.after ?? 30); i++) tick({}); continue; }
        if (L.expectSand) { log.push(['sand', p.sand ? +p.sandDepth.toFixed(2) : 0]); if (!p.sand) log.push(['FEHLER: nicht im Treibsand']); continue; }
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
        if (L.stompEnemy) {
          // von hinten auf einen Gegner springen (Gegner-Blickrichtung beachten), bis er besiegt ist
          const e = c.level.named.get(L.stompEnemy);
          let n = 0;
          while (e && !e.defeated && n++ < 1600 && !p.dead) {
            const f = e.facing ? e.facing() : { x: Math.cos(e.yaw), z: -Math.sin(e.yaw) };
            const bx = e.pos.x - f.x * 1.6, bz = e.pos.z - f.z * 1.6;
            const dx = bx - p.pos.x, dz = bz - p.pos.z, d = Math.hypot(dx, dz);
            if (d > 0.35 && p.mode === 'ground') { tick({ ...this.stick(dx, dz, Math.min(1, d)), run: false }); continue; }
            // hinter ihm: Sprung nach vorn auf ihn
            for (let k = 0; k < 40 && !e.defeated; k++) {
              const ex = e.pos.x - p.pos.x, ez = e.pos.z - p.pos.z;
              tick({ ...this.stick(ex, ez, Math.min(1, Math.hypot(ex, ez))), jump: k < 26, run: false });
            }
            for (let k = 0; k < 120 && p.mode !== 'ground'; k++) tick({});
          }
          log.push(['gegner', L.stompEnemy, !!e?.defeated, n]);
          continue;
        }
        if (L.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === L.star, max: 900 });
          log.push(['stern', L.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (L.chaseKind) { const n = this.chase(L.chaseKind, { max: 900 }); log.push(['jagd', L.chaseKind, n]); continue; }
        if (L.collectRain) {
          // Münzregen einsammeln: zur nächsten liegenden/fallenden Münze laufen
          for (let i = 0; i < L.collectRain; i++) {
            let e = null, best = Infinity;
            for (const x of c.level.entities) { if (x.kind !== 'fallmuenze' || !x.alive || x.removed) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
            if (!e) { tick({}); continue; }
            tick({ ...this.stick(e.pos.x - p.pos.x, e.pos.z - p.pos.z), run: best > 1.2 });
          }
          continue;
        }
        if (L.toAir) {
          // in der Luft (Sprungfeld) zum Ziel steuern, bis gelandet
          let i = 0;
          for (; i < (L.max ?? 400); i++) {
            const dx = L.toAir[0] - p.pos.x, dz = L.toAir[1] - p.pos.z;
            tick({ ...this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz))), jump: true, run: false });
            if (i > 20 && p.mode === 'ground') break;
          }
          log.push(['luft', i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (L.waitPeck) {
          // vor Hackvögeln neben dem Steg: erst laufen, wenn kein Schnabel gerade ausholt/hackt (Takt abwarten)
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
        let best = Infinity, still = 0, auto = 0, j0 = L.jumpAt ? null : 0;
        const target = () => {
          if (L.toNamed) { const q = this.namedPos(L.toNamed); if (q) return [q[0] + (L.off?.[0] ?? 0), q[1] + (L.off?.[1] ?? 0)]; }
          if (L.toTile) {
            // Fliesenbrücke: auf die Fliese zielen, die gerade am weitesten vorn liegt und nahe der Mittellinie ist
            const fb = c.level.named.get(L.toTile);
            if (fb?.tiles && p.pos.z > L.to[1] + 2) {
              let bestT = null, bs = -Infinity;
              for (const t of fb.tiles) {
                const tx = t.box.pos.x, tz = t.box.pos.z;
                if (tz > p.pos.z - 0.5 || tz < p.pos.z - 4) continue;
                const s = -Math.abs(tx - p.pos.x) * 1.5 - (tz - p.pos.z);
                if (s > bs) { bs = s; bestT = [tx, tz]; }
              }
              if (bestT) return bestT;
            }
          }
          return L.to;
        };
        for (; i < max; i++) {
          if (p.dead || c.level.runtime.status !== 'play') break;
          if (rode && L.endOnRide !== false) break;
          const T = target();
          const dx = T[0] - p.pos.x, dz = T[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          const fd = Math.hypot(L.to[0] - p.pos.x, L.to[1] - p.pos.z);
          if (fd < best - 0.05) { best = fd; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && L.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = fd < within && (!holdJ || L.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = L.slow ?? 1;
          let st;
          if (L.waitPeck && this.peckDanger()) { st = { x: 0, y: 0 }; }
          else if (p.mode === 'air' && holdJ && j0 !== null) {
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
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, L.to ?? L.toNamed]); break; }
      }
      c.setInput({});
      return { log, jumps, autoJumps, track, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: c.level.runtime.status, info: p.info(), rt: c.level.runtime.info() };
    },
    /** Holt ein Hackvogel in der Nähe gerade aus oder hackt (Schnabel im Weg)? */
    peckDanger() {
      const p = P();
      for (const e of c.level.entities) {
        if (e.kind !== 'hackvogel' || e.defeated || !e.alive) continue;
        const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
        if (d > 3.2) continue;
        const f = e.facing ? e.facing() : { x: Math.cos(e.yaw), z: -Math.sin(e.yaw) };
        // nur Vögel, deren Schnabel zur Figur bzw. vor sie zeigt
        const ahead = ((p.pos.x - e.pos.x) * f.x + (p.pos.z - e.pos.z) * f.z);
        if (ahead < -0.5) continue;
        if (e.state === 'wind' || e.state === 'peck' || (e.state === 'stuck' && e.stateT > e.stuckTime - 0.1)) return true;
        // kurz vor dem nächsten Hieb: nicht in die Bahn laufen
        if ((e.state === 'stand' || e.state === 'walk') && e.cool !== undefined && e.cool < 0.45 && d < 2.6) return true;
      }
      return false;
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
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.escaped && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || c.level.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of c.level.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 2.4) || (dy > 0.8 && (n % 48) < 30);
        const action = !!o.action && (n % 24) === 0 && dist < 9;
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...st, run: dist > 1.5 || o.run, jump, action });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => c.level.runtime.info(),
    info: () => P().info(),
    named: (id) => { const e = c.level.named.get(id); return e ? { kind: e.kind, alive: e.alive, defeated: !!e.defeated, state: e.state, info: e.info?.() } : null; },
    kinds: () => { const m = {}; for (const e of c.level.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => c.level.runtime.save.lives,
  };
  window.__w2 = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id) {
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

const W = (name, ...args) => sc(([n, a]) => window.__w2[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 30000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w2a_${name}.png` });
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
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind}`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of SHOTS_ONLY ? [] : ['lotti', 'greta']) {
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
    check(`${id}: ${hero} Zeit bis zum Ziel < 180 s (${res.time.toFixed(1)} s)`, reached && res.time < 180);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of SHOTS_ONLY ? [] : R.targets) {
    for (const hero of t.heroes ?? ['lotti']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      let res = null;
      if (t.legs) res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (t.expectPower && res && res.info.power !== t.expectPower && !ok) ok = false;
      if ((!ok || process.env.VERBOSE) && res) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of SHOTS_ONLY ? [] : R.extra ?? []) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      const res = await W('drive', t.legs, {});
      const inR = (v, r) => (r === undefined ? true : Array.isArray(r) ? v >= r[0] && v <= r[1] : v >= r);
      const lives1 = await W('lives');
      let ok = inR(res.info.x, t.expectX) && inR(res.info.y, t.expectY) && inR(res.info.z, t.expectZ) && !res.dead;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, bei ${res.info.x.toFixed(1)}, ${res.info.y.toFixed(1)}, ${res.info.z.toFixed(1)}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0})`, ok);
    }
  }

  // ------------------------------------------------ Screenshots je Abschnitt aus der Spielkamera
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
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors.filter((e) => !/unbekannte (Entität|Baustein)/.test(e) || STRICT)) ? 0 : 1);
