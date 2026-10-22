// Welt 2: Level 2-5 „Doppelgängersteig“, Arena 2-A „Glutsee-Rempelei“ und Prüfungs-Haus 2-Haus „Villa Tick-Tack“.
//   2-5    Laden ohne Konsolenfehler, Gegnerzahlen, Routen-Bot (Lotti und Greta) Start → Zielmast mit echten Klonen
//          (Spiegelfrucht einsammeln, Druckfeld für 2 öffnet das Tor, Glasrohr, Feuer-Werfer besiegen → Treppe,
//          Röhre), alle drei Sterne (Kiste, Zwillingsfelder mit Klon, Viererlift mit vier Figuren), Stempel (wachsender
//          ?-Block), Extras (Nischen-Druckfeld, roter Ring, Strauch wächst nach, Krallen-Kletterwand), Zeit < 180 s.
//   2-A    Arena per Skript gewinnen: Großrollpilze umwerfen und in die Lava stoßen (zwei Wellen), Stern, Ergebnis;
//          Tod setzt die Arena samt Wellen zurück.
//   2-Haus alle fünf Räume per Skript in je < 10 s, Ergebnis 5/5 gespeichert; Zeitablauf-Fall → Teilergebnis.
//   Kennzahlen (Zeichenaufrufe < 120 inkl. Schattenpass, mit Klonen < 150; Dreiecke < 300 k) und Bilder
//   tests/out/w2c_*.png aus der Spielkamera.
// Aufruf (nach npm run build): PORT_BASE=5400 node tests/course_w2c.mjs [2-5|2-A|2-Haus]
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), alle Figuren bekommen
// dieselbe Eingabe (Spiegelfrucht-Klone spiegeln sie). Gegner bleiben aktiv; alle Figuren sind für die Routenfahrt
// unverwundbar (Abpraller zählen weiter), damit die Geometrie und die Mehrfigur-Bausteine geprüft werden.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen 2-5
const R25 = {
  start: [0, 1, 5],
  enemies: { marschblock: 14, rollpilz: 2, feuer_werfer: 1 },
  main: [
    { name: 'Spiegelfrucht', to: [0, -5.6] },
    { name: 'Blütenweg', to: [1.5, -19] },
    { to: [0, -23] },
    { name: 'Treppe', to: [0, -30] },
    { to: [2.6, -34] },
    { name: 'Kistenhof', to: [2.6, -46] },
    { name: 'Tunnel', to: [0, -52] },
    { to: [0, -74] },
    { name: 'Druckfeld am Tor (2 Figuren)', to: [0, -78.6], within: 0.2, run: false, slow: 0.6 },
    { wait: 300 },
    { name: 'Glasrohr', to: [0, -83.4], within: 0.8 },
    { name: 'Blockgarten', to: [0, -100] },
    { to: [1, -112] },
    { name: 'Brücke', to: [1, -119] },
    { name: 'Hügel', to: [1.6, -134] },
    { to: [1.6, -150] },
    { name: 'Gasse', to: [0, -157] },
    { chase: 'feuer_werfer', name: 'Feuer-Werfer' },
    { wait: 90 },
    { name: 'vor der Treppe', to: [-3, -176.4], run: false },
    { name: 'Treppe 1', to: [-3, -179.4], jump: 40, jumpAt: 2.4, within: 0.5, run: false },
    { name: 'Treppe 2', to: [-1, -180.4], jump: 40, within: 0.5, run: false },
    { name: 'Treppe 3', to: [1, -179.4], jump: 40, within: 0.5, run: false },
    { name: 'Treppe 4', to: [3, -180.4], jump: 40, within: 0.5, run: false },
    { name: 'Felsturm', to: [4.7, -180], jump: 40, within: 0.4, run: false },
    { name: 'auf die Röhre', to: [6, -180], jump: 26, within: 0.3, run: false },
    { crouch: 4 },
    { name: 'Zielhügel', to: [-3.5, -212] },
    { to: [-4, -219.4] },
    { name: 'Terrasse 1', to: [-4, -221.4], jump: 40 },
    { name: 'Terrasse 2', to: [-4, -223.6], jump: 40 },
    { name: 'Zielmast', to: [-4, -226.6], jump: 40, within: 0.3 },
  ],
  targets: [
    { name: 'Stern 1 in der hinteren rechten Kiste (Stampfattacke)', star: 0, from: [-1.95, 2.2, -35.6],
      legs: [{ to: [-1.95, -38.5], jump: 40, within: 0.25, run: false, slow: 0.6 }, { stomp: true }, { wait: 60 }, { star: 0 }], shot: 'stern1' },
    { name: 'Stern 2 auf den Zwillingsfeldern (Heldin + Klon gleichzeitig)', star: 1, from: [8, 7.4, -142.5], clones: 1,
      legs: [{ pair: [8, -145.6] }, { wait: 40 }, { star: 1 }], shot: 'stern2' },
    { name: 'Stern 3 mit dem Viererlift (drei Spiegelfrüchte einsammeln, vier Figuren)', star: 2, from: [0, 3, -207],
      legs: [{ to: [2.4, -209.4] }, { to: [4.6, -211.4] }, { to: [-5.6, -211] }, { wait: 30 }, { figs: 4 },
        { to: [6, -212.6] }, { name: 'auf das Deck', to: [6, -217], within: 0.4, run: false, slow: 0.7 },
        { push: 80, dir: [0, -1], untilUp: 'vierer' }, { push: 240, dir: [1, 0], untilUp: 'vierer' }, { figs: 4 }, { wait: 480 },
        { to: [10, -222.4], run: false }, { star: 2 }], shot: 'stern3', lift: true },
    { name: 'Stempel über den wachsenden ?-Block (dreimal stampfen)', from: [-6.4, 7.8, -110],
      legs: [{ to: [-9, -110], jump: 40, within: 0.2, run: false, slow: 0.7, delay: 4 }, { stomp: true }, { stomp: true }, { stomp: true }, { wait: 60 },
        { to: [-11.6, -110.6], run: false }], shot: 'stempel' },
  ],
  extra: [
    { name: 'Nischen-Druckfeld (zwei Figuren) → Münzen und 1-Up', from: [-1, 2.2, -66], clones: 1, yaw: Math.PI,
      legs: [{ to: [-7.2, -66], within: 0.4, run: false, slow: 0.6 }, { wait: 60 }], expect: 'pf_nische' },
    { name: 'Druckfeld am Tor allein: Tor bleibt zu', from: [0, 2.2, -74],
      legs: [{ to: [0, -78.6], within: 0.2, run: false }, { wait: 240 }], expectNot: 'pf_tor' },
    { name: 'Spiegelfrucht-Strauch wächst nach', from: [6.2, 2.2, -46.6], legs: [{ to: [6.2, -48.6], run: false }, { to: [6.2, -45] }, { wait: 420 }], expectBush: 'strauch_tunnel' },
    { name: 'Roter Ring: acht rote Münzen in 12 s → Münzen + Spiegelfrucht', from: [7, 6.2, -124.2], ring: true },
    { name: 'Kletterwand am Stempel-Turm mit Krallen', from: [-8.6, 6.2, -108.6], power: 'krallen',
      legs: [{ to: [-9.3, -108.6], within: 0.15, run: false }, { push: 200, jump: 10, dir: [-1, 0] }, { to: [-11.4, -108.6], run: false }], expectY: 12 },
  ],
  shots: [
    ['start', [0, 1, 5]],
    ['bluetenweg', [0, 1, -10]],
    ['kistenhof', [0, 2.2, -32]],
    ['tunnel', [0, 2.2, -62]],
    ['tor', [0, 2.2, -75]],
    ['glasrohr', [0, 2.2, -81.5]],
    ['blockgarten', [-2, 6.2, -100]],
    ['huegel', [0, 6.2, -124]],
    ['zwilling', [6, 6.2, -139]],
    ['gasse', [0, 6.2, -160]],
    ['felsturm', [2, 6.2, -176]],
    ['zielhuegel', [0, 3, -210]],
    ['ziel', [-4, 5, -223]],
  ],
};

const PORT = 4402;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['2-5', '2-A', '2-Haus'];
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;   // nur passende Teile (Fehlersuche)
const want = (name) => !ONLY || ONLY.test(name);

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Klone, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = () => c.level;
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setInput({});
      c.squad?.clear();
      p.dropHeld?.();
      p.setHero(o.hero ?? 'lotti');
      p.dead = false; p.removedFigure = null; p.hidden = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.updateHalf?.();
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap?.(p);
      c.step(o.settle ?? 20);
      for (let i = 0; i < (o.clones ?? 0); i++) L().addClone(p);
      if (o.clones) c.step(40);
      c.snapCamera();
      return p.info();
    },
    figs: () => L().players.length,
    figInfo: () => L().players.map((f) => [+f.pos.x.toFixed(2), +f.pos.y.toFixed(2), +f.pos.z.toFixed(2), f.mode, !!f.clone]),
    named: (id) => { const e = L().named.get(id); return e ? { fired: e.fired ?? null, done: e.done ?? null, count: e.count ?? null, state: e.state ?? null, s: e.s ?? null, grown: e.grown ?? null, alive: e.alive ?? null, defeated: e.defeated ?? null, running: e.running ?? null, shown: e.shown ?? null } : null; },
    /** Stick-Eingabe für eine Welt-Richtung (dx, dz) relativ zur Steuerungs-Gier. */
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L().controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    /**
     * Wegpunkte abfahren (Format wie tests/course_w1a.mjs) – zusätzlich: chase: Art (Gegner verfolgen und besiegen),
     * pair: [x, z] (Haupt-Figur so lenken, dass die Mitte aus ihr und dem ersten Klon auf dem Punkt liegt),
     * figs: n (Zahl der Figuren protokollieren), star: Index (zum erschienenen Stern).
     */
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      const jumps = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      let rode = false;
      // Prüfungs-Haus: Raumwechsel beendet die Fahrt (die Figur steht dann im nächsten Raum)
      const roomOf = () => (L().house ? c.arch?.info?.()?.room : undefined);
      const room0 = roomOf();
      const moved = () => room0 !== undefined && roomOf() !== room0;
      const tick = (inp) => {
        if (hold) for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        const m = L().player;
        if (m.mode === 'script' && L().runtime.status === 'play' && !m.dead && m.script?.type !== 'house') {
          let n = 0;
          while (L().player.mode === 'script' && n++ < 2400 && !L().player.dead && L().runtime.status === 'play') {
            if (hold) for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
            c.setInput({}); c.step(1); steps++;
          }
          const q = L().player;
          log.push(['fahrt', n, +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const pl = L().player;
        if (pl.dead || L().runtime.status !== 'play' || moved()) break;
        rode = false;
        if (Lg.wait) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.figs !== undefined) { log.push(['figuren', L().players.length, JSON.stringify(this.figInfo())]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +L().player.pos.x.toFixed(1), +L().player.pos.y.toFixed(1), +L().player.pos.z.toFixed(1)]); continue; }
        if (Lg.hop) { for (let k = 0; k < Lg.hop; k++) tick({ jump: true }); for (let k = 0; k < 240 && L().player.mode !== 'ground'; k++) tick({}); continue; }
        if (Lg.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && L().player.mode !== 'ground'; k++) tick({ crouch: true });
          for (let k = 0; k < 20; k++) tick({});
          log.push(['stampfen', +L().player.pos.x.toFixed(2), +L().player.pos.y.toFixed(2), +L().player.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.chase) {
          const n = this.chase(Lg.chase, { max: 2400 });
          log.push([Lg.name ?? 'jagen', Lg.chase, n, +L().player.pos.x.toFixed(2), +L().player.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === Lg.star && !e.hidden, max: 900 });
          log.push(['stern', Lg.star, n, +L().player.pos.x.toFixed(2), +L().player.pos.y.toFixed(2), +L().player.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.pair) {
          // Mitte aus Haupt-Figur und erstem Klon auf den Punkt lenken (langsam, ohne Rennen)
          let i = 0;
          for (; i < 900; i++) {
            const m = L().player, k = L().players.find((f) => f !== m);
            if (!k) break;
            const cx = (m.pos.x + k.pos.x) / 2, cz = (m.pos.z + k.pos.z) / 2;
            const dx = Lg.pair[0] - cx, dz = Lg.pair[1] - cz, d = Math.hypot(dx, dz);
            if (d < 0.08) break;
            tick({ ...this.stick(dx, dz, Math.max(0.25, Math.min(0.7, d))), run: false });
          }
          for (let k2 = 0; k2 < 20; k2++) tick({});
          log.push(['paar', i, JSON.stringify(this.figInfo())]);
          continue;
        }
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        if (holdJ && Lg.to && !Lg.push) jumps.push([Lg.name ?? `leg${li}`, this.landingVisible(Lg.to[0], Lg.to[1])]);
        if (Lg.push) {
          for (let k = 0; k < Lg.push; k++) {
            if (Lg.untilUp && L().named.get(Lg.untilUp)?.state === 'up') break;
            const d = Lg.dir ? this.stick(Lg.dir[0], Lg.dir[1]) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([Lg.name ?? `push${li}`, Lg.push, +L().player.pos.x.toFixed(2), +L().player.pos.y.toFixed(2), +L().player.pos.z.toFixed(2), L().player.mode]);
          continue;
        }
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        for (; i < max; i++) {
          const m = L().player;
          if (m.dead || L().runtime.status !== 'play' || moved()) break;
          if (rode) break;
          const T = Lg.to;
          const dx = T[0] - m.pos.x, dz = T[1] - m.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (m.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || (landed && (m.mode === 'ground' || m.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (Lg.delay && i < Lg.delay) st = { x: 0, y: 0 };
          else if (m.mode === 'air' && holdJ && j0 !== null) {
            const k = 2.6, vmax = 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - m.vel.x, ez = vz - m.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? i - j0 < holdJ : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (m.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        const m = L().player;
        log.push([Lg.name ?? `leg${li}`, i, +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), m.mode, L().players.length]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      const m = L().player;
      return { log, jumps, autoJumps, steps, time: steps / 120, pos: [m.pos.x, m.pos.y, m.pos.z], dead: m.dead, status: L().runtime.status, info: m.info(), rt: L().runtime.info(), figs: L().players.length };
    },
    /** Ist der Landepunkt (x, z) aus der Spielkamera sichtbar? (wie course_w1a) */
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
    /** Auf Entitäten einer Art zulaufen (springen, wenn nah), bis keine passende mehr lebt. */
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = L().player;
        if (p.dead || L().runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L().entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = ((n % 48) < 20 && dist < 2.4) || (dy > 0.8 && (n % 48) < 30);
        for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
        // Stampfattacke: in der Luft über dem Ziel ducken
        const crouch = !!o.pound && p.mode === 'air' && dist < 0.7 && p.pos.y > e.pos.y + e.half.y * 2;
        c.setInput({ ...(crouch ? {} : st), run: dist > 1.5, jump: jump && !crouch, crouch, action: !!o.action && (n % 24) === 0 });
        c.step(1);
        if (p.mode === 'script' && p.script?.type !== 'house') { let k = 0; while (L().player.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => L().runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L().entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    arch: () => c.arch?.info?.() ?? null,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    /** Haupt-Figur fällt von oben auf einen Gegner (Draufspringen) – bis er reagiert. */
    stompOn(id, field = 'state', want = 'back', pound = false) {
      const p = P(), e = L().named.get(id);
      p.reset([e.pos.x, e.pos.y + e.half.y * 2 + 1.2, e.pos.z], Math.PI / 2);
      p.invuln = 999;
      for (let i = 0; i < 150; i++) {
        c.setInput(pound ? { crouch: true } : {}); c.step(1);
        if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; }
        if (e[field] === want || e.defeated) break;
      }
      for (let i = 0; i < 40 && p.mode !== 'ground'; i++) { c.setInput({}); c.step(1); }
      return { state: e.state, hp: e.hp, defeated: !!e.defeated };
    },
    /** Liegenden Großrollpilz von der Inselmitte weg (Richtung Rand) in die Lava stoßen: anlaufen und hineinrennen. */
    pushOut(id) {
      const p = P(), e = L().named.get(id);
      let dx = e.pos.x, dz = e.pos.z;
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      p.reset([e.pos.x - dx * 4, e.pos.y, e.pos.z - dz * 4], Math.atan2(-dz, dx));
      p.invuln = 999;
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      let i = 0, pushed = false;
      for (; i < 240 && !e.defeated; i++) {
        if (e.state === 'pushed') pushed = true;
        c.setInput(pushed ? {} : { ...this.stick(dx, dz), run: true }); c.step(1);
      }
      const at = [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2)];
      for (let k = 0; k < 360 && !e.defeated; k++) { c.setInput({}); c.step(1); }
      return { pushed, defeated: !!e.defeated, at, pushes: e.pushes, player: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], dead: p.dead };
    },
  };
  window.__w2 = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id, fresh = false) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !fresh) {
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
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 60000 });
  if (wait > 1000) { const f1 = await sc(() => window.__course.view.frame); await page.waitForFunction((f) => window.__course.view.frame >= f + 4, f1, { timeout: 60000 }); }
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  const figs = await sc(() => window.__course.level.players.length);
  stats.push([name, s.calls, s.triangles, figs]);
  await page.screenshot({ path: `${OUT}w2c_${name}.png` });
  return s;
}

// ====================================================================== 2-5
async function level25() {
  const id = '2-5', R = R25;
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“ (${meta.theme}, ${meta.music}), Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Thema pinkgrass, Musik course_cherry, 400 s`, meta.theme === 'pinkgrass' && meta.music === 'course_cherry' && meta.timeLimit === 400);
  for (const [kind, n] of Object.entries(R.enemies)) check(`${id}: ${n}× ${kind}`, (kinds[kind] ?? 0) === n);

  for (const hero of SHOTS_ONLY || !want('Route') ? [] : ['lotti', 'greta']) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    const figsAt = res.log.filter((l) => l[0] === 'Druckfeld am Tor (2 Figuren)').map((l) => l[6]);
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Figuren am Tor ${figsAt}`);
    if (!reached) for (const l of res.log) console.log('     ', JSON.stringify(l));
    const tor = await W('named', 'pf_tor');
    check(`${id}: ${hero} sammelt die Spiegelfrucht – zwei Figuren am Druckfeld, Tor öffnet sich (Druckfeld ausgelöst: ${tor?.fired})`, figsAt[0] >= 2 && tor?.fired >= 1);
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
    }
    check(`${id}: ${hero} Zeit bis zum Ziel < 180 s (${res.time.toFixed(1)} s)`, reached && res.time < 180);
  }

  for (const t of SHOTS_ONLY ? [] : R.targets.filter((x) => want(x.name))) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10, clones: t.clones, yaw: t.yaw });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      const ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      let extra = '';
      if (t.lift) { const lift = await W('named', 'vierer'); const nf = res.log.find((l) => l[0] === 'figuren'); extra = ` – ${nf?.[1]} Figuren, Lift ${lift?.state} s=${lift?.s?.toFixed(1)}`; }
      if (!ok) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})${extra}`, !!ok);
      if (t.shot && hero === 'lotti') await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of SHOTS_ONLY ? [] : R.extra.filter((x) => want(x.name))) {
    await load(id);
    await W('place', t.from, { power: t.power, settle: 10, clones: t.clones, yaw: t.yaw });
    if (t.ring) {
      const r = await sc(() => {
        const c = window.__course, L = c.level, W2 = window.__w2;
        const ring = L.named.get('ring');
        const coins0 = L.runtime.coins, figs0 = L.players.length;
        // durch den Ring (Fußpunkt auf dem Hügel) und dann die roten Münzen ablaufen
        W2.drive([{ to: [7, -130], jump: 40, within: 0.6 }, { to: [7, -133], run: false }]);
        const red = () => L.entities.filter((e) => e.kind === 'rote_muenze' && !e.removed && !e.hidden);
        let n = 0;
        while (red().length && n++ < 12) {
          const e = red().sort((a, b) => Math.hypot(a.pos.x - L.player.pos.x, a.pos.z - L.player.pos.z) - Math.hypot(b.pos.x - L.player.pos.x, b.pos.z - L.player.pos.z))[0];
          W2.drive([{ to: [e.pos.x, e.pos.z], within: 0.3 }]);
        }
        c.step(60);
        return { state: ring.state, got: ring.got, coins: L.runtime.coins - coins0, figs0, figs: L.players.length, power: L.entities.filter((e) => e.kind === 'powerup' && !e.removed).length };
      });
      check(`${id}: ${t.name} (Ring ${r.state}, ${r.got} rot, +${r.coins} Münzen)`, r.state === 'done' && r.got >= 8);
      continue;
    }
    const res = await W('drive', t.legs, {});
    let ok = true, note = '';
    if (t.expect) { const n = await W('named', t.expect); ok = n?.fired >= 1; note = `ausgelöst ${n?.fired}, Figuren ${res.figs}`; }
    if (t.expectNot) { const n = await W('named', t.expectNot); ok = !(n?.fired >= 1); note = `ausgelöst ${n?.fired}`; }
    if (t.expectBush) { const n = await W('named', t.expectBush); ok = n?.grown >= 2 && res.figs >= 2; note = `gewachsen ${n?.grown}×, Figuren ${res.figs}`; }
    if (t.expectY !== undefined) { ok = res.info.y >= t.expectY - 0.05; note = `y ${res.info.y.toFixed(2)}`; }
    if (!ok) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: ${t.name} (${note})`, ok);
  }

  // Bilder je Abschnitt (frisch geladen)
  if (!want('Bilder')) return;
  await load(id, true);
  for (const [name, pos, extra] of R.shots) {
    await W('place', pos, { settle: 10, ...(extra ?? {}) });
    await shot(`${id}_${name}`);
  }
  // Kennzahlen mit vier und fünf Figuren (Viererlift-Turm, dichteste Stelle)
  // Klone wachsen in 0,9 s auf volle Größe und laden ihre Darstellung nach: länger warten
  await W('place', [10, 3, -214], { settle: 10, clones: 3 });
  await sc(() => window.__course.step(150));
  await shot(`${id}_vier_figuren`, 2500);
  await W('place', [0, 6.2, -124], { settle: 10, clones: 4 });
  await sc(() => window.__course.step(150));
  await shot(`${id}_fuenf_figuren`, 2500);
  await W('place', [0, 6.2, -158], { settle: 10, clones: 4 });
  await sc(() => window.__course.step(150));
  await shot(`${id}_fuenf_gasse`, 2500);
}

// ====================================================================== 2-A
async function levelA() {
  const id = '2-A';
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, arch: d.archetype }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“ (${meta.arch}, ${meta.theme}, ${meta.music}), Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Arena, Thema lava, Musik course_arena, 200 s, 3 Großrollpilze`, meta.arch === 'arena' && meta.theme === 'lava' && meta.music === 'course_arena' && meta.timeLimit === 200 && kinds.grossrollpilz === 3);
  if (want('Bilder')) { await W('place', [0, 2, 7], { settle: 30 }); await shot(`${id}_start`); }
  for (const hero of ['lotti', 'greta']) {
    if (!want('Sieg')) break;
    await load(id, true);
    await W('place', [0, 2, 7], { hero, settle: 30 });
    const r = await sc(() => {
      const c = window.__course, L = c.level, W2 = window.__w2;
      const info = (id) => { const e = L.named.get(id); return { parked: !!e.parked, touch: e.touch, visible: e.model?.root.visible, y: +e.pos.y.toFixed(1), state: e.state }; };
      const a0 = W2.arch(), w0 = { g1: info('grp1'), g2: info('grp2'), g3: info('grp3') };
      // Welle 1: draufspringen, dann in die Lava stoßen
      const s1 = W2.stompOn('grp1');
      const p1 = W2.pushOut('grp1');
      const a1 = W2.arch();
      // Welle 2 fällt vom Himmel
      let n = 0;
      while (L.named.get('wellen').landed < 2 && n++ < 900) { c.setInput({}); c.player.invuln = 999; c.step(1); }
      const w2 = { g2: info('grp2'), g3: info('grp3'), wave: L.named.get('wellen').wave, landed: L.named.get('wellen').landed, steps: n };
      const s2 = W2.stompOn('grp2'), p2 = W2.pushOut('grp2');
      const s3 = W2.stompOn('grp3'), p3 = W2.pushOut('grp3');
      const a2 = W2.arch();
      // Stern erscheint in der Mitte und wird eingesammelt
      c.player.reset([0, 2, 3], Math.PI / 2);
      let k = 0;
      while (!W2.arch().starTouch && k++ < 600) { c.setInput({}); c.step(1); }
      const got = W2.chase('star', { max: 900 });
      for (let i = 0; i < 900 && !c.finished; i++) { c.setInput({}); c.step(1); }
      return { a0, w0, s1, p1, a1, w2, s2, p2, s3, p3, a2, won: W2.arch().won, finished: c.finished, res: c.lastResult, save: W2.save().levels?.['2-A'] ?? null };
    });
    if (hero === 'lotti') {
      check(`${id}: Welle 1 – ein Großrollpilz, die beiden anderen warten unsichtbar (HUD noch ${r.a0.left}/${r.a0.total})`, r.a0.total === 3 && r.a0.left === 3 && !r.w0.g1.parked && r.w0.g2.parked && r.w0.g3.parked && r.w0.g2.visible === false && r.w0.g2.touch === false);
      check(`${id}: Draufspringen wirft ihn um (${r.s1.state}, hp ${r.s1.hp}), Hineinlaufen stößt ihn in die Lava (gestoßen ${r.p1.pushed}, besiegt ${r.p1.defeated}, noch ${r.a1.left})`, r.s1.state === 'back' && r.s1.hp === 2 && r.p1.pushed && r.p1.defeated && r.a1.left === 2 && !r.p1.dead);
      check(`${id}: Welle 2 – zwei Großrollpilze fallen vom Himmel und landen (${r.w2.landed} gelandet nach ${(r.w2.steps / 120).toFixed(1)} s, sichtbar ${r.w2.g2.visible}/${r.w2.g3.visible})`, r.w2.wave === 1 && r.w2.landed === 2 && r.w2.g2.visible && r.w2.g3.visible && !r.w2.g2.parked && r.w2.g2.touch);
    }
    check(`${id}: ${hero} stößt alle drei Großrollpilze in die Lava (${[r.p1, r.p2, r.p3].map((p) => p.defeated).join('/')}), Stern erscheint`, r.p1.defeated && r.p2.defeated && r.p3.defeated && r.a2.left === 0 && r.a2.cleared);
    check(`${id}: ${hero} sammelt den Stern → Sieg, Ergebnis, Stern gespeichert`, r.won && r.finished && r.save?.done && r.save?.stars?.[0] === true);
    if (!(r.won && r.finished)) console.log('     ', JSON.stringify(r));
  }
  if (want('Neustart')) {
    await load(id, true);
    await W('place', [0, 2, 7], { settle: 30 });
    const r = await sc(() => {
      const c = window.__course, L = c.level, W2 = window.__w2, p = c.player;
      W2.stompOn('grp1'); W2.pushOut('grp1');
      let n = 0;
      while (L.named.get('wellen').landed < 2 && n++ < 900) { c.setInput({}); p.invuln = 999; c.step(1); }
      const before = { wave: L.named.get('wellen').wave, left: W2.arch().left };
      p.invuln = 0;
      p.die('lava');
      let k = 0;
      while ((p.dead || L.runtime.status !== 'play') && k++ < 900) c.step(1);
      c.step(30);
      const e2 = L.named.get('grp2'), e1 = L.named.get('grp1');
      return { before, after: W2.arch(), wave: L.named.get('wellen').wave, g2: { parked: !!e2.parked, visible: e2.model?.root.visible }, g1: { parked: !!e1.parked, defeated: !!e1.defeated, visible: e1.model?.root.visible }, alive: L.entities.filter((e) => e.kind === 'grossrollpilz' && !e.removed && !e.defeated).length, lives: L.runtime.info().lives };
    });
    check(`${id}: Tod → Arena von vorn (vorher Welle ${r.before.wave + 1}, noch ${r.before.left}; danach noch ${r.after.left}/${r.after.total}, ${r.alive} Großrollpilze, Welle ${r.wave + 1}, Welle-2 wartet wieder unsichtbar)`, r.before.wave === 1 && r.after.left === 3 && r.after.resets >= 1 && r.alive === 3 && r.wave === 0 && r.g2.parked && r.g2.visible === false && !r.g1.parked && !r.g1.defeated);
  }
  if (want('Bilder')) {
    await load(id, true);
    await W('place', [0, 2, 2], { settle: 30 });
    await shot(`${id}_kampf`);
    await sc(() => { const W2 = window.__w2; W2.stompOn('grp1'); const c = window.__course; c.player.reset([0, 2, 3], Math.PI / 2); c.step(20); });
    await shot(`${id}_umgeworfen`);
    await sc(() => { const W2 = window.__w2, c = window.__course; W2.pushOut('grp1'); for (let i = 0; i < 300; i++) { c.player.invuln = 999; c.setInput({}); c.step(1); if (c.level.named.get('grp2').pos.y < 8 && c.level.named.get('grp2').pos.y > 4) break; } });
    await shot(`${id}_welle2`);
  }
}

// ====================================================================== 2-Haus
async function levelHaus() {
  const id = '2-Haus';
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, theme: d.theme, music: d.music, arch: d.archetype, rooms: d.house.rooms.map((r) => [r.goal, r.time]) }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“ (${meta.arch}, ${meta.theme}, ${meta.music}), Räume ${JSON.stringify(meta.rooms)}, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Haus, Thema house, Musik course_house, 5 Räume à 10 s, Gegner laut Bauplan`, meta.arch === 'house' && meta.theme === 'house' && meta.music === 'course_house' && meta.rooms.length === 5 && meta.rooms.every((r) => r[1] === 10)
    && kinds.rollpilz === 2 && kinds.panzerkroete === 2 && kinds.krallen_pilzling === 2 && kinds.hackvogel === 4 && kinds.feuer_werfer === 2);

  // Skript für alle fünf Räume (je Raum: warten bis „play“, Ziel erfüllen, Restzeit messen)
  const solve = () => {
    const c = window.__course, L = c.level, W2 = window.__w2, p = c.player;
    const A = () => c.arch.info();
    const waitPlay = (room) => { let n = 0; while (!(A().room === room && A().phase === 'play') && n++ < 1200) { c.setInput({}); c.step(1); } return n; };
    const out = [];
    // Restzeit beim Erfüllen je Raum (Schritt-Haken: Phase „clear“ hält 1,5 s)
    const rec = {};
    L.onStep(() => { const a = A(); if (a.phase === 'clear' && rec[a.room] === undefined) rec[a.room] = +(10 - a.time).toFixed(2); });
    const settle = () => { let n = 0; while (A().phase === 'play' && n++ < 1300) { p.invuln = Math.max(p.invuln, 2); c.setInput({}); c.step(1); } };
    const finish = (room, ok) => {
      const a = A();
      if (rec[room] === undefined && a.room === room && a.phase === 'clear') rec[room] = +(10 - a.time).toFixed(2);
      out.push({ room, ok, cleared: rec[room] !== undefined, used: rec[room] ?? null, now: a.phase });
    };
    const R = (i) => L.data.house.rooms[i];
    const rel = (i, x, z) => [R(i).start.pos[0] + x, R(i).start.pos[2] - 4.6 + z];
    // 1 Kinderzimmer: Stampfattacke auf beide Rollpilze
    waitPlay(0);
    W2.chase('rollpilz', { filter: (e) => e.spec.roomId === 'r1', pound: true, max: 1200 });
    settle();
    finish(0);
    // 2 Bibliothek: auf beide Panzerkröten springen
    waitPlay(1);
    W2.chase('panzerkroete', { filter: (e) => e.spec.roomId === 'r2', max: 1200 });
    settle();
    finish(1);
    // 3 Küche: Münzen am Boden ablaufen, dann auf den Tisch
    waitPlay(2);
    const coinsLeft = () => L.entities.filter((e) => e.kind === 'coin' && e.spec.roomId === 'r3' && !e.removed && e.alive);
    const floor = coinsLeft().filter((e) => e.pos.y < 2).sort((a, b) => a.pos.z - b.pos.z);
    const legs = [];
    for (const e of floor.sort((a, b) => Math.atan2(a.pos.z - (R(2).start.pos[2] - 4.6), a.pos.x - R(2).start.pos[0]) - Math.atan2(b.pos.z - (R(2).start.pos[2] - 4.6), b.pos.x - R(2).start.pos[0]))) legs.push({ to: [e.pos.x, e.pos.z], within: 0.4 });
    W2.drive([{ to: rel(2, 0, 3.4), within: 0.4 }, { to: rel(2, 5, 2.4), within: 0.4 }, { to: rel(2, 5, -1.6), within: 0.4 }, { to: rel(2, -5, -1.6), within: 0.4 }, { to: rel(2, -5, 2.4), within: 0.4 },
      { to: rel(2, -0.9, 1.9) }, { to: rel(2, -0.9, 0.4), jump: 40, within: 0.4 }, { to: rel(2, 0.95, 0.4), within: 0.3, run: false }]);
    settle();
    finish(2, coinsLeft().length === 0);
    // 4 Uhrenstube: am rechten Rand des Uhrengangs vorbei, aufs Podest zum Stern
    waitPlay(3);
    W2.drive([{ to: rel(3, 1.9, 3.2) }, { to: rel(3, 1.9, -3.6) }, { to: rel(3, 0.6, -4.1), run: false }, { to: rel(3, 0, -5.1), jump: 40, within: 0.35, run: false }]);
    settle();
    finish(3);
    // 5 Kaminzimmer: beide Feuer-Werfer (einer auf der Galerie)
    waitPlay(4);
    W2.chase('feuer_werfer', { filter: (e) => e.spec.roomId === 'r5', max: 1200 });
    settle();
    finish(4);
    for (let i = 0; i < 900 && !c.finished; i++) { c.setInput({}); c.step(1); }
    return { out, finished: c.finished, res: c.lastResult, a: A(), save: W2.save().levels?.['2-Haus'] ?? null };
  };
  for (const hero of want('Räume') ? ['lotti', 'greta'] : []) {
    await load(id, true);
    await sc((h) => { const c = window.__course; c.setHero?.(h); c.player.setHero?.(h); }, hero);
    const r = await sc(solve);
    for (const o of r.out) {
      const name = ['Kinderzimmer (Rollpilze)', 'Bibliothek (Panzerkröten)', 'Küche (8 Münzen)', 'Uhrenstube (Stern erreichen)', 'Kaminzimmer (Feuer-Werfer)'][o.room];
      check(`${id}: ${hero} Raum ${o.room + 1} ${name} in ${o.used} s geschafft (< 10 s)`, o.cleared && o.used < 10 && o.ok !== false);
    }
    check(`${id}: ${hero} Ergebnis 5/5 gespeichert (${(r.res?.stars ?? []).map(Number).join('')})`, r.finished && r.res?.stars?.filter(Boolean).length === 5 && r.save?.stars?.filter(Boolean).length === 5 && !r.a.exited);
    if (!r.finished || r.out.some((o) => !o.cleared)) console.log("     ", JSON.stringify(r.out));
  }
  if (want('Zeit')) {
    await load(id, true);
    const r = await sc(() => {
      const c = window.__course, W2 = window.__w2;
      const A = () => c.arch.info();
      let n = 0;
      while (!(A().room === 0 && A().phase === 'play') && n++ < 600) c.step(1);
      W2.stompOn('r1a', 'defeated', true, true); W2.stompOn('r1b', 'defeated', true, true);
      n = 0;
      while (!(A().room === 1 && A().phase === 'play') && n++ < 1200) { c.setInput({}); c.step(1); }
      // Raum 2: nichts tun (unverwundbar), bis die Zeit abläuft
      n = 0;
      while (A().phase === 'play' && n++ < 1500) { c.player.invuln = 999; c.setInput({}); c.step(1); }
      const a = A();
      for (let i = 0; i < 900 && !c.finished; i++) { c.player.invuln = 999; c.step(1); }
      return { a, after: A(), finished: c.finished, res: c.lastResult, save: W2.save().levels?.['2-Haus'] ?? null };
    });
    check(`${id}: Zeit abgelaufen in Raum 2 → Haus verlassen, Teilergebnis 1/5 gespeichert (${(r.res?.stars ?? []).map(Number).join('')})`, r.a.phase === 'timeout' && r.finished && r.after.exited && r.res?.stars?.filter(Boolean).length === 1 && r.save?.stars?.[0] === true);
    await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 10000 }).catch(() => {});
    const texts = await sc(() => window.__game.scene.getScene('CourseResult').children.list.map((o) => o.text).filter(Boolean));
    check(`${id}: Ergebnis-Szene „Prüfungs-Haus: 1 von 5 Sternen“ (${texts.filter((t) => /Haus|Stern/.test(t)).join(' | ')})`, texts.includes('Prüfungs-Haus: 1 von 5 Sternen'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}w2c_${id}_ergebnis_teil.png` });
  }
  if (want('Bilder')) {
    await load(id, true);
    for (let i = 0; i < 5; i++) {
      await sc((i) => { const c = window.__course; if (i > 0) c.arch.enterRoom(i); let n = 0; while (c.arch.info().phase !== 'play' && n++ < 300) c.step(1); c.step(60); c.player.invuln = 0; }, i);
      await shot(`${id}_raum${i + 1}`);
    }
  }
}

for (const id of LEVELS) {
  if (id === '2-5') await level25();
  if (id === '2-A') await levelA();
  if (id === '2-Haus') await levelHaus();
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke, Figuren):');
for (const [n, c, t, f] of stats) console.log(`    ${n.padEnd(26)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  ${f} Fig.`);
const one = stats.filter((s) => s[3] === 1), many = stats.filter((s) => s[3] > 1);
if (one.length) {
  const maxCalls = Math.max(...one.map((s) => s[1])), maxTris = Math.max(...one.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 mit einer Figur (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k mit einer Figur (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
if (many.length) {
  const maxCalls = Math.max(...many.map((s) => s[1])), maxTris = Math.max(...many.map((s) => s[2]));
  check(`Zeichenaufrufe < 150 mit Klonen (max ${maxCalls})`, maxCalls < 150);
  check(`Dreiecke < 300 k mit Klonen (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
