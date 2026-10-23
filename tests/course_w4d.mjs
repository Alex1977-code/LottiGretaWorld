// Welt 4: Finale 4-Burg „Glutburg des Felsenkönigs“ und Prüfungs-Haus 4-Haus „Haus Sausewind“ deterministisch prüfen
// (Simulation nur über window.__course.step(n) / setInput; Teleport erlaubt). Aufruf (nach npm run build):
//   PORT_BASE=5600 node tests/course_w4d.mjs <Teil> [<Teil> …]
// Teile (je < 10 min):
//   burg-route    Laden ohne Konsolenfehler, Daten (Thema, Musik, Zeit, Sterne/Stempel), Gegnerzahlen, Routen-Bot Lotti
//                 und Greta vom Start bis zur Boss-Röhre (Hang, Vorhof, drei Drehplattformen, Lavarohr, Burgpfad,
//                 Lavafunken-Reihe, Röhre → Thronsaal); Lavafunken verletzen, Lava tötet
//   burg-sterne   Stern 1 (Lavabrocken aufs Druckfeld werfen, selbst aufs andere → Fallbrücke), Stern 2 (zwei Brocken auf
//                 zwei Felder, Figur auf das dritte → Fallgitter), Stern 3 (Warp-Box → Turmbalkon, Brocken von der Kante
//                 aufs Druckfeld → Trittsteine), Stempel (Krallen-Anzug aus dem ?-Block, Kletterwand), unsichtbarer Block
//                 hinter der Boss-Röhre, Lavaschlot liefert nach, roter Ring
//   burg-boss     ein Lauf: alle Sterne + Stempel, Röhre, Kampf (3 Treffer mit geworfenen Lavabrocken), Baron-Szene, Warp-Box,
//                 Zielmast, Speicherstand; Tod im Kampf setzt zurück
//   burg-bilder   Bilder je Abschnitt (tests/out/w4d_burg_*.png) und Kennzahlen
//   haus          alle zehn Räume per Skript in je < 10 s (Lotti und Greta), Ergebnis 10/10 gespeichert
//   haus-extra    Zeitablauf → Teilergebnis, Tod → Raum neu, Bilder je Raum (tests/out/w4d_haus_*.png), Kennzahlen
// Umgebung: ONLY=<RegExp> (nur passende Prüfungen), VERBOSE=1 (Fahrtprotokolle).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4612;
const PARTS = process.argv.slice(2);
const part = (n) => !PARTS.length || PARTS.includes(n);
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const want = (name) => !ONLY || ONLY.test(name);
const VERBOSE = !!process.env.VERBOSE;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SAVE = 'lotti-greta-course-v1';
const stats = [];
const allErrors = [];

// ====================================================================== Seiten-Hilfen
/** In der Seite: window.__w4 mit place, stick, drive (Wegpunkte), chase, Lavabrocken greifen/werfen, Drehplattformen. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = () => c.level;
  const W = {
    ent: (id) => L().named.get(id),
    rt: () => L().runtime.info(),
    info: () => P().info(),
    arch: () => c.arch?.info?.() ?? null,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    kinds: () => { const m = {}; for (const e of L().entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    count: (kind, f = () => true) => L().entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
    /** Figur setzen (groß, ohne Power-up, nichts in der Hand) und landen lassen. */
    place(pos, o = {}) {
      const p = P();
      c.setInput(null); c.setInput({});
      c.squad?.clear?.();
      if (p.holding) { const e = p.holding; p.holding = null; e.carrier = null; }
      if (o.hero) p.setHero(o.hero);
      p.dead = false; p.removedFigure = null; p.hidden = false;
      p.big = o.big ?? true;
      p.power = 'none'; p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.updateHalf?.();
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (L().runtime.status === 'dying') L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap?.(p);
      c.step(o.settle ?? 20);
      return p.info();
    },
    /** Stick-Eingabe für eine Welt-Richtung (dx, dz) relativ zur Steuerungs-Gier. */
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L().controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
    action(o = {}) { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); },
    hurt: () => { const p = P(); return p.invuln > 0.2 || !p.big || p.dead; },
    /**
     * Wegpunkte abfahren: { to: [x, z], jump: Haltedauer, jumpAt: m vor dem Ziel abspringen, within, run, slow, max } |
     * { wait: n } | { crouch: n } | { stomp: true } | { dreh: id, c: [x, z], out: [x, z], arms, speed, len } (Nabe einer
     * Drehplattform anspringen, warten, bis ein Arm zum Ziel zeigt, den Arm entlang und hinüber) | { star: Index }.
     */
    drive(legs, o = {}) {
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      let rode = false;
      const room0 = L().house ? c.arch?.info?.()?.room : undefined;
      const moved = () => room0 !== undefined && c.arch?.info?.()?.room !== room0;
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
      const go = (Lg, li) => {
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false, best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        for (; i < max; i++) {
          const m = L().player;
          if (m.dead || L().runtime.status !== 'play' || moved()) break;
          if (rode) break;
          const T = Lg.to;
          const dx = T[0] - m.pos.x, dz = T[1] - m.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (m.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || (landed && m.mode === 'ground'));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (m.mode === 'air' && holdJ && j0 !== null) {
            const k = 2.6, vmax = Lg.vmax ?? 11;
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
        log.push([Lg.name ?? `leg${li}`, i, +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), m.mode]);
        return i < max;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const pl = L().player;
        if (pl.dead || L().runtime.status !== 'play' || moved()) break;
        rode = false;
        if (Lg.wait) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['ducken', li, +L().player.pos.x.toFixed(1), +L().player.pos.y.toFixed(1), +L().player.pos.z.toFixed(1)]); continue; }
        if (Lg.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && L().player.mode !== 'ground'; k++) tick({ crouch: true });
          for (let k = 0; k < 20; k++) tick({});
          continue;
        }
        if (Lg.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === Lg.star && !e.hidden, max: 900 });
          log.push(['stern', Lg.star, n]);
          continue;
        }
        if (Lg.dreh) {
          // 1) auf die Nabe springen
          if (!go({ to: Lg.c, jump: 40, jumpAt: Lg.jumpAt ?? 6.4, within: 0.5, name: `${Lg.dreh}:nabe` }, li)) { log.push(['FEHLER: Nabe', Lg.dreh]); break; }
          // 2) warten, bis ein Arm zum Ziel zeigt (mit Vorhalt)
          const h = L().named.get(Lg.dreh);
          const want = Math.atan2(-(Lg.out[1] - Lg.c[1]), Lg.out[0] - Lg.c[0]);
          const lead = (Lg.speed ?? 0) * (Lg.lead ?? 0.32);
          let w = 0;
          for (; w < 1600; w++) {
            let ok = false;
            for (let k = 0; k < (Lg.arms ?? 2); k++) {
              const a = h.angle + (k / (Lg.arms ?? 2)) * Math.PI * 2 + lead;
              const d = Math.atan2(Math.sin(a - want), Math.cos(a - want));
              if (Math.abs(d) < (Lg.tol ?? 0.07)) ok = true;
            }
            if (ok) break;
            // auf der Nabe bleiben (Mitte halten)
            const m = L().player, dx = Lg.c[0] - m.pos.x, dz = Lg.c[1] - m.pos.z, dd = Math.hypot(dx, dz);
            tick(dd > 0.15 ? { ...this.stick(dx, dz, Math.min(0.5, dd)), run: false } : {});
          }
          log.push([`${Lg.dreh}:warten`, w, +h.angle.toFixed(2)]);
          // 3) den Arm entlang und hinüber
          if (!go({ to: Lg.out, jump: 40, jumpAt: Lg.jumpAt2 ?? 3.4, within: 0.7, name: `${Lg.dreh}:hinueber` }, li)) { log.push(['FEHLER: hinüber', Lg.dreh]); break; }
          continue;
        }
        if (!go(Lg, li)) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      const m = L().player;
      return { log, autoJumps, steps, time: steps / 120, pos: [m.pos.x, m.pos.y, m.pos.z], dead: m.dead, status: L().runtime.status, info: m.info(), rt: L().runtime.info() };
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
        if (o.safe !== false) for (const f of L().players) f.invuln = Math.max(f.invuln, 5);
        const crouch = !!o.pound && p.mode === 'air' && dist < 0.7 && p.pos.y > e.pos.y + e.half.y * 2;
        c.setInput({ ...(crouch ? {} : st), run: dist > 1.5, jump: jump && !crouch, crouch });
        c.step(1);
        if (p.mode === 'script' && p.script?.type !== 'house') { let k = 0; while (L().player.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Von oben auf e fallen (x/z folgen e), bis Abprall oder Landung. */
    stomp(e, o = {}) {
      const p = P();
      const top = e.pos.y + e.half.y * 2;
      p.reset([e.pos.x, top + (o.h ?? 1.0), e.pos.z], p.yaw);
      p.invuln = 0;
      let bounced = false;
      for (let i = 0; i < 150; i++) {
        c.setInput({}); c.step(1);
        if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; }
        if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
        if (p.mode === 'ground') break;
      }
      for (let i = 0; i < 90 && p.mode !== 'ground'; i++) { c.setInput({}); c.step(1); }
      c.step(4);
      return bounced;
    },
    /** Nächsten (wachen oder betäubten) Lavabrocken nahe (x, z) betäuben und aufheben → Brocken | null. */
    grab(x, z, o = {}) {
      const p = P();
      const list = L().entities.filter((e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated && e.state !== 'burst' && !e.carrier && e.grounded && (!o.filter || o.filter(e)))
        .sort((a, b) => Math.hypot(a.pos.x - x, a.pos.z - z) - Math.hypot(b.pos.x - x, b.pos.z - z));
      const br = list[0];
      if (!br || Math.hypot(br.pos.x - x, br.pos.z - z) > (o.r ?? 14)) return null;
      const safe = p.hurt; p.hurt = () => false;
      if (br.state !== 'stunned') this.stomp(br);
      if (br.state !== 'stunned' && br.state !== 'getup') { p.hurt = safe; return null; }
      // daneben stellen (Seite zur Figur hin) und aufheben
      const ax = (o.from?.[0] ?? p.pos.x) - br.pos.x, az = (o.from?.[1] ?? p.pos.z) - br.pos.z, al = Math.hypot(ax, az) || 1;
      p.reset([br.pos.x + (ax / al) * 0.85, br.pos.y + 0.05, br.pos.z + (az / al) * 0.85], p.yaw);
      p.vel.set(0, 0, 0);
      c.step(6);
      this.face(br.pos.x, br.pos.z);
      this.action();
      delete p.hurt; if (safe) p.hurt = safe;
      return p.holding === br ? br : null;
    },
    /**
     * Getragenen Brocken auf (tx, tz) werfen: Figur in dist m Abstand (Richtung from) hinstellen, zum Ziel drehen,
     * werfen; warten, bis er liegt → { thrown, state, onPlate, x, z }.
     */
    throwTo(tx, tz, o = {}) {
      const p = P(), br = p.holding;
      if (!br) return { thrown: false };
      const dist = o.dist ?? 4.5;
      const fx = o.dir?.[0] ?? 0, fz = o.dir?.[1] ?? 1, fl = Math.hypot(fx, fz) || 1;
      if (!o.here) {
        p.pos.set(tx + (fx / fl) * dist, o.y ?? p.pos.y, tz + (fz / fl) * dist); p.vel.set(0, 0, 0); p.mode = 'air';
        c.setInput({}); c.step(30);
      }
      this.face(tx, tz);
      c.step(1);
      this.action();
      const thrown = br.state === 'thrown';
      for (let i = 0; i < 160 && br.state === 'thrown' && !br.removed; i++) c.step(1);
      c.step(20);
      return { thrown, state: br.state, onPlate: !!br.onPlate, removed: !!br.removed, x: +br.pos.x.toFixed(2), y: +br.pos.y.toFixed(2), z: +br.pos.z.toFixed(2) };
    },
  };
  window.__w4 = W;
  return Object.keys(W);
}

let loaded = null;
async function load(id, { fresh = false, hero = 'lotti', newPage = false } = {}) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !fresh && !newPage) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    const go = async (url) => { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); } };
    if (fresh) {
      await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
      await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    }
    await go(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`);
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
  await sc((h) => { const c = window.__course; c.setHero(h); c.level.runtime.save.lives = 9; }, hero);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w4[n](...a), [name, args]);

async function shot(name, setup, o = {}) {
  if (setup) await sc(setup, o.arg);
  await sc((snap) => { const c = window.__course; for (const f of c.level.players) f.invuln = 0; c.step(1); if (snap) c.snapCamera(); }, o.snap !== false);
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 60000 });
  await page.waitForTimeout(o.wait ?? 400);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  try { await page.screenshot({ path: `${OUT}w4d_${name}.png`, timeout: 60000 }); } catch { await page.screenshot({ path: `${OUT}w4d_${name}.png`, timeout: 120000 }); }
  return s;
}

// ====================================================================== 4-Burg: Route
const BURG_ROUTE = [
  { name: 'Hang', to: [0, -2] },
  { to: [0, -17] },
  { name: 'Vorhof', to: [-1.5, -26] },
  { to: [-1.5, -39] },
  { name: 'Treppe', to: [0, -45.5] },
  { name: 'Drehplattform 1', dreh: 'dreh1', c: [0, -54], out: [0, -61.6], arms: 2, speed: 0.7 },
  { name: 'Drehplattform 2', dreh: 'dreh2', c: [0, -69], out: [0, -76.6], arms: 3, speed: -0.65 },
  { name: 'Drehplattform 3', dreh: 'dreh3', c: [0, -84], out: [0, -92], arms: 4, speed: 0.8 },
  { name: 'Kontrollpunkt', to: [0, -96] },
  { name: 'Lavarohr', to: [0, -104], within: 0.4, max: 400 },
  { name: 'Rohrhof', to: [0, -134] },
  { to: [0, -150] },
  { name: 'Burgpfad', to: [0, -162] },
  { to: [-1.5, -176] },
  { to: [0, -187.6], within: 0.4 },
  { name: 'Funken 1', to: [0, -190.8], jump: 30, within: 0.5, run: false },
  { name: 'Funken 2', to: [0, -194.8], jump: 30, within: 0.5, run: false },
  { name: 'Funken 3', to: [0, -198.8], jump: 30, within: 0.5, run: false },
  { name: 'Funken 4', to: [0, -203.2], jump: 30, within: 0.5, run: false },
  { name: 'vor der Röhre', to: [0, -206.6], within: 0.4, run: false },
  { name: 'auf die Röhre', to: [0, -209], jump: 30, within: 0.3, run: false },
  { crouch: 4 },
];

async function burgRoute() {
  const id = '4-Burg';
  console.log(`\n${id}: Laden, Daten, Routen`);
  if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, theme: d.theme, music: d.music, time: d.timeLimit, arch: d.archetype, stars: d.stars.length, stamp: !!d.stamp, boss: d.boss?.name }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“ (${meta.arch}, ${meta.theme}, ${meta.music}, ${meta.time} s), Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: boss, Thema lavacastle, Musik course_lavacastle, 400 s, 3 Sterne + Stempel, Lavafelsen-König`, meta.arch === 'boss' && meta.theme === 'lavacastle' && meta.music === 'course_lavacastle' && meta.time === 400 && meta.stars === 3 && meta.stamp && meta.boss === 'Lavafelsen-König');
  check(`${id}: Gegner laut Bauplan (Lavabrocken ${kinds.lavabrocken}, Pilzlingstürme ${kinds.pilzlingsturm}, Lavafunken ${kinds.lavafunke}, König ${kinds.lavafelsen_koenig})`, kinds.lavabrocken >= 8 && kinds.pilzlingsturm === 3 && kinds.lavafunke >= 12 && kinds.lavafelsen_koenig === 1 && kinds.pfeld === 6 && kinds.roter_ring === 1);
  for (const hero of want('Route') ? ['lotti', 'greta'] : []) {
    await load(id, { hero });
    await W('place', [0, 10, 5], { hero, settle: 2 });
    const res = await W('drive', BURG_ROUTE, {});
    await sc(() => { const c = window.__course; for (let i = 0; i < 240 && c.player.mode === 'script'; i++) c.step(1); c.step(30); });
    const after = await sc(() => { const c = window.__course, p = c.player; return { x: p.pos.x, y: p.pos.y, z: p.pos.z, started: c.arch.info().started, dead: p.dead }; });
    const pipe = res.log.filter((l) => l[0] === 'fahrt');
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Nachsprünge ${res.autoJumps}, Glasrohr ${JSON.stringify(pipe[0] ?? null)}, danach z ${after.z.toFixed(1)} y ${after.y.toFixed(1)}`);
    if (VERBOSE || after.z > -226) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: ${hero} fährt vom Start durch Drehplattformen und Lavarohr bis zur Boss-Röhre in den Thronsaal (${res.time.toFixed(1)} s)`, !res.dead && after.z < -226 && after.z > -232 && Math.abs(after.y - 2) < 0.6 && pipe.length >= 1);
  }
  if (want('Gefahren')) {
    await load(id);
    const r = await sc(() => {
      const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
      const out = {};
      // Lavafunke an der Spitze von Drehbalken 1 verletzt beim Hochspringen
      const f = L.entities.find((e) => e.kind === 'lavafunke' && Math.abs(e.base.z + 54) < 0.1 && e.base.x < 0);
      W4.place([f.base.x, 2.2, f.base.z + 4], { settle: 4 });
      let hurt = false;
      for (let i = 0; i < 400 && !hurt; i++) { p.pos.set(f.base.x, 2.6, f.base.z); p.vel.set(0, 0, 0); p.mode = 'air'; c.step(1); hurt = W4.hurt(); }
      out.funke = { hurt, state: f.state };
      // Lava tötet
      W4.place([0, 4, -50.5], { settle: 0 });
      p.pos.set(-8, 1.5, -50); p.vel.set(0, -2, 0); p.mode = 'air';
      for (let i = 0; i < 240 && !p.dead; i++) c.step(1);
      out.lava = { dead: p.dead, cause: p.deathCause };
      for (let i = 0; i < 600 && L.runtime.status !== 'play'; i++) c.step(1);
      c.step(30);
      out.respawn = { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), status: L.runtime.status };
      return out;
    });
    check(`${id}: Lavafunke an der Drehplattform verletzt (${JSON.stringify(r.funke)})`, r.funke.hurt);
    check(`${id}: Lava tötet (${r.lava.cause}), Neustart am Start`, r.lava.dead && r.lava.cause === 'lava' && r.respawn.status === 'play');
  }
}

// ====================================================================== 4-Burg: Sterne, Stempel, Extras
async function burgSterne() {
  const id = '4-Burg';
  console.log(`\n${id}: Sterne, Stempel, Extras`);
  if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
  if (want('Stern 1')) {
    const r = await sc(() => {
      const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
      const out = {};
      W4.place([0, 4.2, -24], { settle: 10 });
      const br = W4.grab(-3, -24.5, { from: [0, -24] });
      out.grab = !!br;
      // Brocken aufs Druckfeld 1 werfen (von +z, 4,5 m)
      out.wurf = W4.throwTo(-5, -27.4, { dist: 4.6, dir: [0, 1], y: 4.2 });
      c.step(30);
      out.feld1 = { count: W4.ent('pf_bruecke1').count, pressed: W4.ent('pf_bruecke1').pressed };
      out.bridge0 = W4.ent('fallbruecke').state;
      // selbst aufs zweite Feld
      const d = W4.drive([{ to: [-5, -34.6], within: 0.25, run: false, slow: 0.6 }, { wait: 60 }], { invuln: true });
      out.feld2 = { pressed: W4.ent('pf_bruecke2').pressed, d: d.pos };
      for (let i = 0; i < 240 && W4.ent('fallbruecke').state !== 'liegt'; i++) c.step(1);
      out.bridge = W4.ent('fallbruecke').info();
      // über die Brücke zum Sternturm
      const g = W4.drive([{ to: [-7, -31] }, { name: 'Brücke', to: [-18, -31] }, { to: [-24.5, -31] }, { star: 0 }]);
      out.walk = { pos: g.pos.map((v) => +v.toFixed(1)), dead: g.dead };
      out.star = L.runtime.stars[0];
      return out;
    });
    console.log(`  Stern 1: ${JSON.stringify(r)}`);
    check('Stern 1: Lavabrocken gegriffen und aufs Druckfeld geworfen – er bleibt darauf liegen', r.grab && r.wurf.thrown && r.wurf.onPlate && r.feld1.pressed && r.bridge0 === 'haengt');
    check('Stern 1: Figur aufs zweite Druckfeld → Ketten reißen, Fallbrücke kracht herunter', r.feld2.pressed && r.bridge.state === 'liegt' && Math.abs(r.bridge.y - 4) < 0.01);
    check('Stern 1: über die Fallbrücke zum Sternturm, Stern eingesammelt', !r.walk.dead && r.star === true);
  }
  if (want('Stern 2')) {
    const r = await sc(() => {
      const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
      const out = { throws: [] };
      W4.place([0, 2.2, -136], { settle: 10 });
      // zwei Lavabrocken nacheinander auf Feld 1 und 2 werfen
      for (const [tx, tz] of [[1.5, -144], [4.5, -144]]) {
        let br = null;
        for (let k = 0; k < 4 && !br; k++) {
          br = W4.grab(4, -142, { from: [tx, tz + 4], filter: (e) => !e.onPlate && e.pos.z > -151 && e.pos.z < -125 });
          if (!br) c.step(240);   // Lavaschlot liefert nach
        }
        out.throws.push(br ? W4.throwTo(tx, tz, { dist: 4.6, dir: [0, 1], y: 2.2 }) : { thrown: false });
        c.step(20);
      }
      out.plates = ['pf_drei1', 'pf_drei2', 'pf_drei3'].map((id) => W4.ent(id).pressed);
      out.gitter0 = W4.ent('gitter2').openK;
      const d = W4.drive([{ to: [7.5, -140] }, { to: [7.5, -144], within: 0.25, run: false, slow: 0.6 }, { wait: 90 }], { invuln: true });
      out.plates2 = ['pf_drei1', 'pf_drei2', 'pf_drei3'].map((id) => W4.ent(id).pressed);
      for (let i = 0; i < 240 && W4.ent('gitter2').openK < 1; i++) c.step(1);
      out.gitter = W4.ent('gitter2').openK;
      const g = W4.drive([{ to: [7.5, -148.5] }, { to: [7.5, -153] }, { star: 1 }]);
      out.star = L.runtime.stars[1];
      out.schlot = W4.ent('schlot2').info();
      return out;
    });
    console.log(`  Stern 2: ${JSON.stringify(r)}`);
    check('Stern 2: zwei Lavabrocken auf zwei Druckfelder geworfen (bleiben liegen), Fallgitter noch zu', r.throws.every((t) => t.thrown && t.onPlate) && r.plates[0] && r.plates[1] && !r.plates[2] && r.gitter0 === 0);
    check('Stern 2: Figur aufs dritte Feld → Fallgitter öffnet, Stern in der Nische eingesammelt', r.plates2.every(Boolean) && r.gitter === 1 && r.star === true);
  }
  if (want('Stern 3')) {
    const r = await sc(() => {
      const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
      const out = {};
      // Warp-Box auf dem Burgpfad → Turmbalkon
      W4.place([7.6, 2.2, -166], { settle: 10 });
      const w = W4.drive([{ to: [7.6, -169], jump: 30, within: 0.3, run: false }, { wait: 60 }]);
      out.warp = { x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(1), z: +p.pos.z.toFixed(1) };
      // Brocken greifen, an die Kante, hinunter aufs Druckfeld werfen
      let br = null;
      for (let k = 0; k < 4 && !br; k++) { br = W4.grab(30, -165, { from: [30, -163] }); if (!br) c.step(300); }
      out.grab = !!br;
      W4.drive([{ to: [30, -169.4], within: 0.25, run: false, slow: 0.5 }], { invuln: true });
      out.wurf = W4.throwTo(30, -178.2, { here: true });
      c.step(60);
      out.feld = W4.ent('pf_balkon').pressed;
      out.weg = L.named.get('weg3')?.shown ?? null;
      c.step(120);
      // hinunter auf die Trittsteine, zum Podest, Stern
      const g = W4.drive([{ to: [30, -172.6], jump: 20, within: 0.6, run: false }, { to: [27.2, -175.8], jump: 30, within: 0.6, run: false },
        { to: [27.2, -179.6], jump: 30, within: 0.6, run: false }, { to: [28.6, -183], jump: 30, within: 0.6, run: false }, { to: [30, -187], jump: 30, within: 0.6 }, { star: 2 }]);
      out.walk = { pos: g.pos.map((v) => +v.toFixed(1)), dead: g.dead, log: g.log };
      out.star = L.runtime.stars[2];
      // Warp-Box zurück auf den Burgpfad
      W4.drive([{ to: [32.6, -192], jump: 30, within: 0.3, run: false }, { wait: 60 }]);
      out.back = { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1) };
      return out;
    });
    console.log(`  Stern 3: ${JSON.stringify({ ...r, walk: { ...r.walk, log: undefined } })}`);
    if (VERBOSE || !r.star) for (const l of r.walk.log) console.log('     ', JSON.stringify(l));
    check(`Stern 3: Warp-Box führt auf den Turmbalkon (${JSON.stringify(r.warp)})`, Math.abs(r.warp.x - 30) < 3 && r.warp.y > 6.6 && r.warp.y < 8.6);
    check('Stern 3: Lavabrocken von der Kante aufs Druckfeld geworfen → Trittsteine steigen aus der Lava', r.grab && r.wurf.thrown && r.wurf.onPlate && r.feld);
    check('Stern 3: über die Trittsteine zum Podest, Stern eingesammelt, Warp-Box zurück', !r.walk.dead && r.star === true && Math.abs(r.back.x - 7.6) < 2.5);
  }
  if (want('Stempel')) {
    const r = await sc(() => {
      const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
      const out = {};
      W4.place([-2, 2.2, -129], { settle: 10 });
      // ?-Block von unten stoßen → Krallen-Anzug, einsammeln
      W4.drive([{ to: [-2, -130.5], within: 0.2, run: false, slow: 0.5 }]);
      for (let i = 0; i < 30; i++) { c.setInput({ jump: i < 20 }); c.step(1); }
      for (let i = 0; i < 90 && p.mode !== 'ground'; i++) { c.setInput({}); c.step(1); }
      c.step(60);
      out.pu = L.entities.filter((e) => e.kind === 'powerup' && !e.removed).map((e) => [e.spec.power ?? e.power, +e.pos.y.toFixed(1)]);
      const pu = L.entities.find((e) => e.kind === 'powerup' && !e.removed);
      if (pu) { p.pos.set(pu.pos.x, pu.pos.y + 0.2, pu.pos.z); p.vel.set(0, 0, 0); p.mode = 'air'; c.step(60); }
      out.power = p.power;
      // Kletterwand: anlaufen, springen, hochklettern
      W4.place([-5.8, 2.2, -135], { settle: 6, power: out.power === 'krallen' ? 'krallen' : undefined });
      for (let i = 0; i < 480; i++) { c.setInput({ ...W4.stick(-1, 0), jump: i < 10 }); c.step(1); if (p.pos.y > 8.8 && p.mode === 'ground') break; }
      c.setInput({});
      out.top = { y: +p.pos.y.toFixed(2), x: +p.pos.x.toFixed(2), mode: p.mode };
      W4.drive([{ to: [-8.5, -135], within: 0.3, run: false }, { wait: 30 }]);
      out.stamp = L.runtime.stamp;
      // ohne Krallen kommt man nicht hinauf
      W4.place([-5.8, 2.2, -135], { settle: 6 });
      let maxY = 0;
      for (let i = 0; i < 300; i++) { c.setInput({ ...W4.stick(-1, 0), jump: i % 60 < 20 }); c.step(1); maxY = Math.max(maxY, p.pos.y); }
      c.setInput({});
      out.noClaw = +maxY.toFixed(2);
      return out;
    });
    console.log(`  Stempel: ${JSON.stringify(r)}`);
    check('Stempel: ?-Block gibt den Krallen-Anzug', r.power === 'krallen');
    check(`Stempel: mit Krallen die Kletterwand links nach dem Lavarohr hinauf (y ${r.top.y}), Stempel eingesammelt; ohne Krallen nicht (max. y ${r.noClaw})`, r.top.y > 8.8 && r.stamp === true && r.noClaw < 8.5);
  }
  if (want('Extras')) {
    const r = await sc(() => {
      const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
      const out = {};
      // unsichtbarer Block hinter der Boss-Röhre → Wachstumsbeere
      W4.place([0, 2.2, -211.8], { settle: 10 });
      for (let i = 0; i < 30; i++) { c.setInput({ jump: i < 20 }); c.step(1); }
      for (let i = 0; i < 120 && p.mode !== 'ground'; i++) { c.setInput({}); c.step(1); }
      const blk = W4.ent('geheim_beere');
      out.hidden = { used: blk?.used ?? null, look: blk?.look ?? null, pu: L.entities.filter((e) => e.kind === 'powerup' && !e.removed).map((e) => e.power ?? e.spec.power) };
      // Lavaschlot im Vorhof liefert Lavabrocken nach, wenn sie in die Lava fallen
      const s0 = W4.ent('schlot1').spawned;
      for (const e of L.entities) if (e.kind === 'lavabrocken' && e.pos.z < -18 && e.pos.z > -42 && e.pos.y > 3) e.kill();
      W4.place([0, 4.2, -30], { settle: 2 });
      for (let i = 0; i < 1400; i++) { p.invuln = 5; c.step(1); }
      out.schlot = { before: s0, after: W4.ent('schlot1').spawned, here: W4.ent('schlot1').count() };
      // roter Ring: durchlaufen → acht rote Münzen auf Zeit (Münzen an Testpunkte holen)
      W4.place([0, 2.2, -59.8], { settle: 5 });
      W4.drive([{ to: [0, -63], within: 0.4 }]);
      const ring = W4.ent('ring');
      out.ring0 = ring.state;
      const reds = L.entities.filter((e) => e.kind === 'rote_muenze' && !e.removed);
      for (const m of reds) { p.pos.set(m.pos.x, m.pos.y - 0.4, m.pos.z); p.vel.set(0, 0, 0); p.mode = 'air'; p.invuln = 5; c.step(3); }
      c.step(30);
      out.ring = { state: ring.state, got: ring.got, reds: reds.length };
      return out;
    });
    console.log(`  Extras: ${JSON.stringify(r)}`);
    check('Unsichtbarer Block hinter der Boss-Röhre gibt eine Wachstumsbeere', r.hidden.pu.includes('wachstumsbeere') || r.hidden.used === true);
    check(`Lavaschlot liefert Lavabrocken nach (${r.schlot.before} → ${r.schlot.after}, jetzt ${r.schlot.here})`, r.schlot.after > r.schlot.before && r.schlot.here >= 2);
    check(`Roter Ring: acht rote Münzen → Belohnung (${JSON.stringify(r.ring)})`, r.ring0 === 'active' && r.ring.reds === 8 && r.ring.state === 'done');
  }
}

// ====================================================================== 4-Burg: ganzer Lauf mit Bosskampf
async function burgBoss() {
  const id = '4-Burg';
  console.log(`\n${id}: Sterne + Stempel, Bosskampf, Baron-Szene, Ziel`);
  if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
  // Sterne und Stempel schnell (Teleport), damit das Ergebnis alles enthält
  const pre = await sc(() => {
    const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
    for (const i of [0, 1, 2]) {
      const s = L.entities.find((e) => e.kind === 'star' && e.index === i && !e.removed);
      if (!s) continue;
      if (s.hidden) s.reveal?.();
      W4.place([s.pos.x, s.pos.y - 0.6, s.pos.z], { settle: 30 });
    }
    W4.place([-8.5, 9.2, -135], { settle: 30 });
    return { stars: L.runtime.stars.slice(0, 3), stamp: L.runtime.stamp };
  });
  check(`Vorbereitung: drei Sterne und Stempel im selben Lauf (${JSON.stringify(pre)})`, pre.stars.every(Boolean) && pre.stamp);
  // Tod im Kampf setzt zurück
  const dead = await sc(() => {
    const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
    W4.place([0, 2.2, -202.6], { settle: 5 });
    W4.drive([{ name: 'Kontrollpunkt', to: [0, -204.8], within: 0.4, run: false }, { to: [0, -206.6], within: 0.4, run: false }, { to: [0, -209], jump: 30, within: 0.3, run: false }, { crouch: 4 }]);
    for (let i = 0; i < 240 && p.mode === 'script'; i++) c.step(1);
    for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput(W4.stick(0, -1, 0.6)); c.step(1); }
    c.setInput({});
    const b = W4.ent('koenig');
    for (let i = 0; i < 600 && b.state !== 'summon'; i++) c.step(1);
    const started = c.arch.started;
    p.die('lava');
    for (let i = 0; i < 600 && L.runtime.status !== 'play'; i++) c.step(1);
    c.step(30);
    return { started, after: { started: c.arch.started, state: b.state, hp: b.hp, deaths: c.arch.deaths, z: +p.pos.z.toFixed(1) } };
  });
  check(`Tod im Kampf: Neustart am Kontrollpunkt vor der Röhre, König wieder 3/3 und wartet (${JSON.stringify(dead)})`, dead.started && !dead.after.started && dead.after.state === 'wait' && dead.after.hp === 3 && Math.abs(dead.after.z + 204.5) < 2);
  const r = await sc(() => {
    const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
    const out = { hits: [] };
    const banners = [];
    const hud = c.arch.hud;
    const orig = hud.banner.bind(hud);
    hud.banner = (t, o) => { banners.push(t); return orig(t, o); };
    // Röhre → Thronsaal
    W4.place([0, 2.2, -206], { settle: 5 });
    W4.drive([{ to: [0, -209], jump: 30, within: 0.3, run: false }, { crouch: 4 }]);
    for (let i = 0; i < 240 && p.mode === 'script'; i++) c.step(1);
    c.step(20);
    out.arrive = { x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(1), z: +p.pos.z.toFixed(1), mood: L.moodNow };
    for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput(W4.stick(0, -1, 0.6)); c.step(1); }
    c.setInput({});
    const b = W4.ent('koenig');
    out.start = { started: c.arch.started, state: b.state, hud: c.arch.info().hud?.boss?.hp ?? null };
    const AZ = -240;
    const safeStep = (n, pos) => { p.hurt = () => false; for (let i = 0; i < n; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); } delete p.hurt; };
    const until = (s, n, pos) => { p.hurt = () => false; let i = 0; for (; i < n && b.state !== s; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); } delete p.hurt; return i; };
    for (let k = 0; k < 3; k++) {
      // gerufenen Lavabrocken greifen
      until('roll', 1500, [0, 2, AZ + 9]);
      until('rest', 1500, [0, 2, AZ + 9]);
      let br = null;
      for (let t = 0; t < 6 && !br; t++) {
        p.hurt = () => false;
        const list = L.entities.filter((e) => e.kind === 'lavabrocken' && e.owner === b && !e.removed && !e.defeated && e.grounded);
        if (list.length) br = W4.grab(list[0].pos.x, list[0].pos.z, { from: [0, AZ] });
        delete p.hurt;
        if (!br) safeStep(120, [0, 2, AZ + 9]);
      }
      // warten, bis er keucht (rest), aus 4 m werfen
      p.hurt = () => false;
      for (let i = 0; i < 3000 && b.state !== 'rest'; i++) { p.vel.set(0, 0, 0); c.step(1); }
      const hp0 = b.hp;
      const ax = -b.pos.x, az = AZ - b.pos.z, al = Math.hypot(ax, az) || 1;
      p.pos.set(b.pos.x + (ax / al) * 4, b.pos.y + 0.2, b.pos.z + (az / al) * 4); p.vel.set(0, 0, 0); p.mode = 'air';
      c.step(12);
      W4.face(b.pos.x, b.pos.z); c.step(1); W4.action();
      for (let i = 0; i < 120 && br && !br.removed && br.state === 'thrown'; i++) c.step(1);
      delete p.hurt;
      out.hits.push({ grabbed: !!br, hp0, hp: b.hp, state: b.state });
      until('summon', 900, [0, 2, AZ + 9.5]);
    }
    out.defeated = { hp: b.hp, defeated: b.defeated, feuer: b.feuer };
    until('gone', 1500, [0, 2, AZ + 9.5]);
    out.gone = { state: b.state, won: c.arch.info().won };
    // Baron-Szene
    const bz = L._baron;
    out.baron0 = bz?.info?.() ?? null;
    safeStep(120 * 10, null);
    out.baron = bz?.info?.() ?? null;
    out.banners = banners;
    out.warp = W4.ent('warp_sieg').hidden;
    // Warp-Box → Burgtor → Zielmast
    const w = W4.ent('warp_sieg');
    W4.place([w.pos.x, w.pos.y + 1.4, w.pos.z], { settle: 0 });
    let arrived = false;
    for (let i = 0; i < 800; i++) { c.step(1); if (p.pos.z < -270 && p.mode !== 'script') { arrived = true; break; } }
    c.step(5);
    out.arrived = { arrived, z: +p.pos.z.toFixed(1), mood: L.moodNow };
    W4.drive([{ to: [0, -297], within: 0.3, max: 900 }], { invuln: true });
    out.goalStatus = L.runtime.status;
    for (let i = 0; i < 2400 && !c.finished; i++) { c.setInput({}); c.step(1); }
    out.finish = { finished: c.finished, res: c.lastResult ?? null };
    out.save = W4.save().levels?.['4-Burg'] ?? null;
    return out;
  });
  console.log(`  Kampf: ${JSON.stringify({ ...r, banners: undefined })}`);
  console.log(`  Ansagen: ${r.banners.join(' | ')}`);
  check(`Röhre führt in den Thronsaal (Stimmung innen), Kampf beginnt beim ersten Schritt (Lebensleiste 3)`, r.arrive.z < -226 && r.arrive.mood === 'innen' && r.start.started && r.start.hud === 3);
  check(`Drei Treffer mit geworfenen Lavabrocken (${r.hits.map((h) => `${h.hp0}→${h.hp}`).join(', ')})`, r.hits.length === 3 && r.hits.every((h) => h.grabbed && h.hp === h.hp0 - 1) && r.defeated.defeated);
  check(`König besiegt (Feuerbrocken ${r.defeated.feuer}), Archetyp gewinnt, Warp-Box erscheint`, r.gone.state === 'gone' && r.gone.won && r.warp === false);
  check(`Baron-Szene: Baron braust heran, schimpft und flieht (${r.baron?.log?.join(' → ')}), „Welt 4 geschafft!“`, r.baron && r.baron.log.join(',') === 'in,stop,away,gone' && r.banners.some((t) => /Baron Brummbär/.test(t)) && r.banners.includes('Welt 4 geschafft!'));
  check('Warp-Box führt zum Burgtor (Stimmung außen), Zielmast beendet das Level', r.arrived.arrived && r.arrived.mood === null && r.finish.finished);
  check(`Speicherstand: 4-Burg geschafft, drei Sterne und Stempel (${JSON.stringify(r.save)})`, r.save?.done === true && r.save?.stars?.filter(Boolean).length === 3 && r.save?.stamp === true);
}

// ====================================================================== 4-Burg: Bilder
async function burgBilder() {
  const id = '4-Burg';
  console.log(`\n${id}: Bilder und Kennzahlen`);
  if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
  const at = (pos, o = {}) => ({ pos, ...o });
  const views = [
    ['start', at([0, 10, 5])], ['hang', at([0, 8, -8])], ['vorhof', at([1, 4, -27])], ['sternturm', at([-20, 4, -31], { drop: true })],
    ['dreh1', at([0, 2, -47])], ['dreh2', at([2.4, 2, -63])], ['dreh3', at([0, 2, -77])], ['kontrollpunkt', at([0, 2, -97])],
    ['lavarohr', at([0, 2, -101])], ['rohrhof', at([0, 2, -132])], ['dreifeld', at([4, 2, -140])], ['kletterwand', at([-5, 2, -133])],
    ['burgpfad', at([0, 2, -158])], ['warpbox', at([5, 2, -168])], ['balkon', at([30, 7, -166])], ['podest', at([30, 2, -188], { reveal: true })],
    ['funkenreihe', at([0, 2, -187])], ['roehre', at([0, 2, -205])], ['thronsaal', at([0, 2, -230])], ['ziel', at([0, 2, -282])],
  ];
  for (const [name, o] of views) {
    await shot(`burg_${name}`, (o) => {
      const c = window.__course, W4 = window.__w4, L = c.level;
      if (o.drop) { const h = L.named.get('fallbruecke'); if (h.state === 'haengt') { h.drop(); c.step(200); } }
      if (o.reveal) { L.named.get('weg3')?.reveal?.(); L.named.get('stern3')?.reveal?.(); c.step(90); }
      W4.place(o.pos, { settle: 40, invuln: 999 });
      c.player.invuln = 0;
    }, { arg: o });
  }
  // Kampf (Auftritt) und Baron
  await shot('burg_kampf', () => {
    const c = window.__course, W4 = window.__w4, L = c.level, p = c.player;
    W4.place([0, 2, -229], { settle: 5, invuln: 999 });
    for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput(W4.stick(0, -1, 0.6)); c.step(1); }
    c.setInput({});
    p.hurt = () => false;
    const b = L.named.get('koenig');
    for (let i = 0; i < 1500 && b.state !== 'roll'; i++) c.step(1);
    c.step(60);
    delete p.hurt;
  });
  await shot('burg_baron', () => {
    const c = window.__course, L = c.level, p = c.player;
    const b = L.named.get('koenig');
    p.hurt = () => false;
    b.hp = 1; b.takeHit('brocken');
    for (let i = 0; i < 2400 && b.state !== 'gone'; i++) { p.pos.set(0, 2, -231); p.vel.set(0, 0, 0); c.step(1); }
    for (let i = 0; i < 2400 && L._baron?.state !== 'stop'; i++) c.step(1);
    c.step(80);
    delete p.hurt;
  }, { snap: false });                // Kamera schwenkt weich zum Wagen – nicht auf die Figur zurückschnappen
  console.log(`  Baron im Bild: ${JSON.stringify(await sc(() => ({ baron: window.__course.level._baron.info(), boss: window.__course.level.named.get('koenig').state, rig: window.__course.view.rig.info(), cam: window.__course.view.camera.position.toArray().map((v) => +v.toFixed(1)) })))}`);
}

// ====================================================================== 4-Haus: Raum-Bot (in der Seite)
/**
 * In der Seite: window.__haus mit run(i, legs) (Wegpunkte [x, u] im Raum i; hops = Sprünge vor Kordeln/Lücken, dodge =
 * Gefahren-Arten, über die bei drohender Berührung gesprungen wird, gate = Ameisenbahnen abwarten), swing(i) (Raum 7)
 * und solve(i) (Raum i nach ROUTE). Zählt Treffer (Unverwundbarkeit springt hoch) und Sprünge.
 */
function installHaus() {
  const c = window.__course, W4 = window.__w4, L = c.level, H = L.data._haus;
  const A = () => c.arch.info();
  const zu = (i, u) => H.Z0[i] - u;
  const prev = new Map();
  const HZ = new Set(['ameisensoldat_horn', 'stachelwalze', 'pilzling', 'suchkopf', 'riesenprojektil', 'walzenwerfer', 'stampfstein']);
  const S = { hits: 0, lastInv: 0, jumps: 0 };
  const track = () => {
    for (const e of L.entities) {
      if (!HZ.has(e.kind)) continue;
      const q = prev.get(e);
      if (q) { q.vx = (e.pos.x - q.x) * 120; q.vz = (e.pos.z - q.z) * 120; q.x = e.pos.x; q.z = e.pos.z; } else prev.set(e, { x: e.pos.x, z: e.pos.z, vx: 0, vz: 0 });
    }
  };
  const step = (inp) => {
    c.setInput(inp); c.step(1); track();
    const p = L.player;
    if (p.invuln > S.lastInv + 0.5 && !p.dead && A().phase === 'play') S.hits++;
    S.lastInv = p.invuln;
  };
  const dead = new Set(['break', 'squashed', 'burst', 'fall', 'leave', 'down', 'flipped', 'gone', 'defeated']);
  const alive = (e) => !e.removed && e.alive !== false && !e.defeated && !dead.has(e.state);
  /** Nächste drohende Berührung (Annäherung in ≤ horizon s näher als r m). */
  const danger = (kinds, o = {}) => {
    const p = L.player;
    let best = null;
    for (const e of L.entities) {
      if (!kinds.includes(e.kind) || !alive(e)) continue;
      if (e.kind === 'stachelwalze' && e.state === 'air' && e.pos.y > p.pos.y + 2) continue;
      const q = prev.get(e) ?? { vx: 0, vz: 0 };
      const rx = e.pos.x - p.pos.x, rz = e.pos.z - p.pos.z;
      if (Math.hypot(rx, rz) > 12 || Math.abs(e.pos.y - p.pos.y) > 2.6) continue;
      const vx = q.vx - p.vel.x, vz = q.vz - p.vel.z, vv = vx * vx + vz * vz;
      const t = vv > 1e-6 ? Math.max(0, Math.min(o.horizon ?? 0.6, -(rx * vx + rz * vz) / vv)) : 0;
      const d = Math.hypot(rx + vx * t, rz + vz * t);
      if (d < (o.r ?? 1.2) && (!best || t < best.t)) best = { e, t, d };
    }
    return best;
  };
  /** Ameisenbahn vor der Figur in den nächsten Augenblicken belegt? */
  const blocked = (i, g) => {
    const p = L.player;
    for (const lane of g.lanes) {
      const lz = zu(i, lane), a = p.pos.z - lz;
      if (a < 1.3 || a > (g.look ?? 3.8)) continue;
      const tArr = Math.max(0, a - 1.3) / 8;
      for (const e of L.entities) {
        if (!g.kinds.includes(e.kind) || !alive(e) || Math.abs(e.pos.z - lz) > 1.2) continue;
        const q = prev.get(e) ?? { vx: 0 };
        for (const t of [tArr, tArr + 0.2, tArr + 0.4, tArr + 0.6]) if (Math.abs(e.pos.x + q.vx * t - p.pos.x) < (g.w ?? 1.5)) return true;
      }
    }
    return false;
  };
  const run = (i, legs) => {
    const log = [];
    for (const Lg of legs) {
      if (A().room !== i || A().phase !== 'play') break;
      const tx = Lg.to[0], tz = zu(i, Lg.to[1]);
      let n = 0, hold = 0, rode = false;
      for (; n < (Lg.max ?? 1500); n++) {
        const p = L.player;
        if (A().room !== i || A().phase !== 'play' || p.dead) break;
        if (p.mode === 'script') { rode = true; step({}); continue; }       // Sprungfeld-Flug
        if (rode) break;
        const dx = tx - p.pos.x, dz = tz - p.pos.z, dist = Math.hypot(dx, dz);
        if (dist < (Lg.within ?? 0.6) && p.mode === 'ground') break;
        let jump = hold > 0;
        if (hold > 0) hold--;
        if (p.mode === 'ground' && hold <= 0) {
          for (const hz of Lg.hops ?? []) {
            const a = p.pos.z - zu(i, hz);
            if (a > 0.4 && a < (Lg.hopAt ?? 2.2)) { hold = Lg.hopHold ?? 14; jump = true; S.jumps++; log.push(['hop', hz, +(H.Z0[i] - p.pos.z).toFixed(2)]); }
          }
          if (Lg.dodge && !jump) {
            const d = danger(Lg.dodge, Lg);
            if (d && d.t > (Lg.tMin ?? 0.05) && d.t < (Lg.tJump ?? 0.42)) { hold = Lg.dodgeHold ?? 16; jump = true; S.jumps++; log.push(['sprung', d.e.kind, +d.t.toFixed(2), +(H.Z0[i] - p.pos.z).toFixed(1)]); }
          }
        }
        if (window.__hausTrace && Lg.dodge && n % 24 === 0) {
          const hz = L.entities.filter((e) => Lg.dodge.includes(e.kind) && alive(e)).map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +(H.Z0[i] - e.pos.z).toFixed(1)]);
          log.push(['g', n, +(H.Z0[i] - p.pos.z).toFixed(1), ...hz.slice(0, 4)]);
        }
        const mag = Lg.gate && p.mode === 'ground' && blocked(i, Lg.gate) ? 0 : (Lg.slow ?? 1);
        const st = mag > 0 && dist > 0.05 ? W4.stick(dx, dz, mag) : { x: 0, y: 0 };
        step({ ...st, run: Lg.run ?? true, jump });
      }
      log.push([Lg.name ?? 'weg', n, +L.player.pos.x.toFixed(2), +L.player.pos.y.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
    }
    return log;
  };
  /** Raum 7: von der Kante auf Schaukel 1, 2, 3 und hinüber (Sprung so, dass die Landung in den Umkehrpunkt fällt). */
  const swing = (i) => {
    const sw = [1, 2, 3].map((k) => L.named.get(`schaukel${k}`));
    const Pd = sw[0].period, amp = sw[0].amp;
    const now = () => sw[0].t ?? 0;
    const at = (k, t) => { const th = amp * Math.sin(2 * Math.PI * (t / Pd + sw[k].phase)); return { x: 0, z: sw[k].pivot[2] + Math.sin(th) * sw[k].rope, y: sw[k].pivot[1] - Math.cos(th) * sw[k].rope }; };
    const log = run(i, [{ to: [0, 5.55], within: 0.25, run: false, slow: 0.7, name: 'kante' }]);
    const ledge = { x: 0, z: L.player.pos.z };
    const end = { x: 0, z: zu(i, 32.4) };
    const FL = 0.85;
    const hops = [[() => ledge, (t) => at(0, t)], [(t) => at(0, t), (t) => at(1, t)], [(t) => at(1, t), (t) => at(2, t)], [(t) => at(2, t), () => end]];
    for (let h = 0; h < hops.length; h++) {
      if (A().room !== i || A().phase !== 'play') break;
      const [from, to] = hops[h];
      // nächsten Zeitpunkt suchen, an dem der Abstand Halt → Ziel ein Minimum hat (Umkehrpunkt)
      const g = (t) => Math.abs(to(t).z - from(t).z);
      const t0 = now();
      let best = null;
      for (let s = FL * 0.5 + 0.3; s < Pd * 1.5; s += 1 / 120) {     // ≥ 0,3 s zum Ruhigstehen
        const v = g(t0 + s);
        if (v < 4.6 && v <= g(t0 + s - 1 / 120) && v <= g(t0 + s + 1 / 120)) { best = s; break; }
      }
      if (best === null) { log.push(['FEHLER: kein Umkehrpunkt', h]); break; }
      const tJump = t0 + best - FL * 0.5;
      let w = 0;
      while (now() < tJump && w++ < 900) {
        const p = L.player, f = from(now());
        const dx = f.x - p.pos.x, dz = f.z - p.pos.z, dd = Math.hypot(dx, dz);
        step(dd > 0.12 && p.mode === 'ground' ? { ...W4.stick(dx, dz, Math.min(0.6, dd)), run: false } : {});
      }
      let k = 0, landed = false;
      for (; k < 200; k++) {
        const p = L.player;
        if (A().phase !== 'play' || p.dead) break;
        const tg = to(now() + Math.max(0, FL - k / 120));
        const dx = tg.x - p.pos.x, dz = tg.z - p.pos.z;
        step({ ...W4.stick(dx, dz, Math.min(1, Math.hypot(dx, dz) / 1.2)), run: true, jump: k < 30 });
        if (window.__hausTrace && k % 6 === 0) { const nb = to(now()); log.push(['t', k, +p.pos.y.toFixed(2), +(H.Z0[i] - p.pos.z).toFixed(2), +p.vel.z.toFixed(2), nb.y !== undefined ? +nb.y.toFixed(2) : null, +(H.Z0[i] - nb.z).toFixed(2), p.mode]); }
        if (k > 8 && p.mode === 'ground') { landed = true; break; }
      }
      const p = L.player;
      log.push([`schaukel${h + 1}`, w, k, landed, p.ground?.tag ?? null, +p.pos.y.toFixed(2), +(H.Z0[i] - p.pos.z).toFixed(2)]);
      if (!landed) break;
    }
    log.push(...run(i, [{ to: [0, 35] }]));
    return log;
  };
  const ROUTE = [
    [{ to: [0, 5.5], within: 0.3, name: 'sprungfeld1' }, { to: [0, 19], within: 0.3, name: 'sprungfeld2' }, { to: [0, 37.5], name: 'stern' }],
    [{ to: [0, 38], gate: { kinds: ['ameisensoldat_horn'], lanes: H.LANES2 }, name: 'sandweg' }],
    [{ to: [0, 41.6], hops: H.ROPES3, hopAt: 2.0, name: 'galerie' }],
    [{ to: [0, 38], dodge: ['stachelwalze'], name: 'backstube' }],
    [{ to: [0, 36.5], hops: [15, 26], hopAt: 1.4, name: 'steg' }],
    [{ to: [0, 38], name: 'maschinengang' }],
    null,
    [{ to: [0, 36.5], dodge: ['pilzling'], name: 'parade' }],
    [{ to: [0, 38], dodge: ['suchkopf'], name: 'kanonengang' }],
    [{ to: [0, 33.4], dodge: ['stachelwalze'], name: 'dachboden' }],
  ];
  const waitPlay = (i, max = 1500) => { let n = 0; while (!(A().room === i && A().phase === 'play') && n++ < max) step({}); return A().room === i && A().phase === 'play'; };
  const solve = (i) => {
    const h0 = S.hits, j0 = S.jumps, r0 = A().resets;
    const log = ROUTE[i] ? run(i, ROUTE[i]) : swing(i);
    // Rückfall: Stern direkt anlaufen
    if (A().room === i && A().phase === 'play' && !L.player.dead) {
      const n = W4.chase('star', { filter: (e) => e.index === i && !e.hidden, max: 600, safe: false });
      log.push(['rueckfall', n]);
    }
    return { log, hits: S.hits - h0, jumps: S.jumps - j0, resets: A().resets - r0 };
  };
  window.__haus = { run, swing, solve, waitPlay, danger, step, S, zu, A };
  return true;
}

const HAUS_NAMES = ['Bauklotz-Zimmer (Sprungfelder an Klippen)', 'Sandkasten-Diele (Hörner-Ameisen aus Röhren)', 'Ahnengalerie (Flucht vor dem Riesenprojektil)',
  'Backstube (Weg zwischen Walzenwerfern)', 'Seiltänzer-Saal (dünner Steg, Münzblock)', 'Maschinenhalle (Boost-Pfeile unter 8 Stampfsteinen)', 'Schaukelzimmer (drei Schaukeln)',
  'Pilzlingsparade (Pilzlinge und Mini-Pilzlinge)', 'Kanonengang (dünner Weg, Suchköpfe)', 'Dachboden (Bröckelblöcke, rollende Walzen)'];

// ====================================================================== 4-Haus: einzelner Raum (Fehlersuche: RAUM=n, Protokoll)
async function hausRaum() {
  const n = Number(process.env.RAUM ?? 1) - 1;
  if (!(await load('4-Haus', { fresh: true, hero: process.env.HERO ?? 'lotti' }))) return;
  await sc(installHaus);
  const r = await sc(([n, pre, legs]) => {
    const c = window.__course, Hs = window.__haus, L = c.level;
    window.__hausTrace = true;
    for (let k = 0; k < pre; k++) Hs.step({});
    if (n > 0) c.arch.enterRoom(n);
    Hs.waitPlay(n);
    let res;
    if (legs) {
      const h0 = Hs.S.hits, tr = [];
      const off = L.onStep(() => { const p = L.player; if (L.time % 0.1 < 1 / 120) tr.push([+(L.data._haus.Z0[n] - p.pos.z).toFixed(2), +p.pos.y.toFixed(2), +p.invuln.toFixed(2), p.big, L.entities.filter((e) => e.kind === 'stampfstein').map((e) => e.state[0]).join('')]); });
      const log = Hs.run(n, legs);
      off();
      res = { log: [...log, ...tr], hits: Hs.S.hits - h0, resets: 0 };
    } else res = Hs.solve(n);
    let k = 0;
    while (c.arch.info().phase === 'play' && k++ < 1300) Hs.step({});
    const shots = {};
    for (const [k, e] of c.level.named) if (/^r\d+_(kanone|werfer)/.test(k)) shots[k] = e.shots ?? e.throws;
    return { ...res, a: c.arch.info(), shots };
  }, [n, Number(process.env.PRE ?? 0), process.env.LEGS ? JSON.parse(process.env.LEGS) : null]);
  console.log('   Schüsse/Würfe:', JSON.stringify(r.shots));
  for (const l of r.log) console.log('   ', JSON.stringify(l));
  check(`Raum ${n + 1}: ${r.a.phase} (Treffer ${r.hits}, Neustarts ${r.resets})`, r.a.cleared === 1 && r.hits === 0);
}

// ====================================================================== 4-Haus: alle Räume
async function haus() {
  const id = '4-Haus';
  console.log(`\n${id}: zehn Räume per Skript`);
  for (const hero of ['lotti', 'greta']) {
    if (!want(hero)) continue;
    if (!(await load(id, { fresh: true, hero }))) { check(`${id} lädt`, false); return; }
    if (hero === 'lotti') {
      const d = await sc(() => {
        const c = window.__course, L = c.level, D = L.data, a = c.arch.info();
        return { title: D.title, theme: D.theme, music: D.music, arch: D.archetype, rooms: D.house.rooms.length, goals: D.house.rooms.map((r) => r.goal), times: D.house.rooms.map((r) => r.time), fail: D.house.fail,
          starCount: L.runtime.starCount, kinds: window.__w4.kinds(), a, tapeten: (() => { const n = new Set(); L.view.three.traverse((o) => { if (/^tapete:/.test(o.name)) n.add(o.name); }); return n.size; })() };
      });
      console.log(`  Daten: ${JSON.stringify({ ...d, kinds: undefined })}`);
      console.log(`  Arten: ${JSON.stringify(d.kinds)}`);
      check(`${id}: „${d.title}“, Archetyp house, Thema house, Musik course_house, 10 Räume à 10 s, Ziel jeweils „Stern erreichen“, fail 'exit'`,
        d.title === 'Haus Sausewind' && d.arch === 'house' && d.theme === 'house' && d.music === 'course_house' && d.rooms === 10 && d.goals.every((g) => g === 'reach') && d.times.every((t) => t === 10) && d.fail === 'exit' && d.starCount === 10);
      check(`${id}: Gimmicks vorhanden (8 Stampfsteine, 6 Walzenwerfer, 5 Kanonen, 4 Ameisenströme, 14 Pilzlinge + 4 Mini, Münzblock)`,
        d.kinds.stampfstein === 8 && d.kinds.walzenwerfer === 6 && d.kinds.kanone_turm === 5 && d.kinds.ameisensoldat_horn_strom === 4 && d.kinds.pilzling === 18 && d.kinds.coinblock === 1);
      check(`${id}: zehn eigene Tapeten (${d.tapeten})`, d.tapeten === 10);
    }
    await sc(installHaus);
    if (process.env.TRACE) await sc(() => { window.__hausTrace = true; });
    const r = await sc(() => {
      const c = window.__course, L = c.level, Hs = window.__haus;
      const rec = {};
      L.onStep(() => { const a = c.arch.info(); if (a.phase === 'clear' && rec[a.room] === undefined) rec[a.room] = +(10 - a.time).toFixed(2); });
      const out = [];
      for (let i = 0; i < 10; i++) {
        if (!Hs.waitPlay(i)) { out.push({ room: i, error: 'kein Start', a: Hs.A() }); break; }
        const res = Hs.solve(i);
        let n = 0;
        while (c.arch.info().phase === 'play' && c.arch.info().room === i && n++ < 1300) Hs.step({});
        Hs.step({});                                   // Haken (vor dem Archetyp) sieht die Phase „clear“ erst jetzt
        out.push({ room: i, cleared: rec[i] !== undefined, used: rec[i] ?? null, ...res });
      }
      for (let i = 0; i < 1800 && !c.finished; i++) Hs.step({});
      return { out, finished: c.finished, res: c.lastResult ?? null, a: c.arch.info(), save: window.__w4.save().levels?.['4-Haus'] ?? null };
    });
    for (const o of r.out) {
      check(`${id}: ${hero} Raum ${o.room + 1} ${HAUS_NAMES[o.room]} in ${o.used} s (< 10 s, Treffer ${o.hits}, Sprünge ${o.jumps})`, o.cleared && o.used < 10 && o.resets === 0 && o.hits === 0);
      if (VERBOSE || !o.cleared || o.hits) console.log(`     Raum ${o.room + 1}: ${JSON.stringify(o.log)}`);
    }
    check(`${id}: ${hero} Ergebnis 10/10 gespeichert (${(r.res?.stars ?? []).map(Number).join('')})`, r.finished && r.res?.stars?.filter(Boolean).length === 10 && r.save?.stars?.filter(Boolean).length === 10 && !r.a.exited);
  }
}

// ====================================================================== 4-Haus: Zeitablauf, Tod, Gimmicks, Bilder
async function hausExtra() {
  const id = '4-Haus';
  console.log(`\n${id}: Zeitablauf, Tod, Gimmicks, Bilder`);
  if (want('Zeit') && (await load(id, { fresh: true }))) {
    await sc(installHaus);
    const r = await sc(() => {
      const c = window.__course, L = c.level, Hs = window.__haus;
      Hs.waitPlay(0);
      // große Raumuhr: roter Zeiger läuft die 10 s ab
      for (let i = 0; i < 480; i++) { L.player.invuln = 999; Hs.step({}); }
      const uhr = { angle: L.named.get('haus_uhren')?.bigAngle?.[0] ?? null, time: c.arch.info().time };
      Hs.solve(0);
      Hs.waitPlay(1);
      let n = 0;
      while (c.arch.info().phase === 'play' && n++ < 1500) { L.player.invuln = 999; Hs.step({}); }
      const a = c.arch.info();
      for (let i = 0; i < 900 && !c.finished; i++) { L.player.invuln = 999; c.step(1); }
      return { uhr, a, after: c.arch.info(), finished: c.finished, res: c.lastResult ?? null, save: window.__w4.save().levels?.['4-Haus'] ?? null };
    });
    check(`Große Raumuhr zeigt die Restzeit (nach 4 s: Zeiger ${r.uhr.angle?.toFixed(2)} rad ≈ −0,4·2π, Rest ${r.uhr.time.toFixed(2)} s)`, r.uhr.angle !== null && Math.abs(r.uhr.angle + (10 - r.uhr.time) / 10 * 2 * Math.PI) < 0.02 && r.uhr.time > 5.9 && r.uhr.time < 6.1);
    check(`Zeit abgelaufen in Raum 2 → Haus verlassen, Teilergebnis 1/10 gespeichert (${(r.res?.stars ?? []).map(Number).join('')})`, r.a.phase === 'timeout' && r.finished && r.after.exited && r.res?.stars?.filter(Boolean).length === 1 && r.save?.stars?.[0] === true);
    await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 10000 }).catch(() => {});
    const texts = await sc(() => window.__game.scene.getScene('CourseResult')?.children.list.map((o) => o.text).filter(Boolean) ?? []);
    check(`Ergebnis-Szene „Prüfungs-Haus: 1 von 10 Sternen“ (${texts.filter((t) => /Haus|Stern/.test(t)).join(' | ')})`, texts.includes('Prüfungs-Haus: 1 von 10 Sternen'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}w4d_haus_ergebnis_teil.png` });
  }
  if (want('Tod|Gimmick') && (await load(id, { fresh: true }))) {
    await sc(installHaus);
    const r = await sc(() => {
      const c = window.__course, L = c.level, Hs = window.__haus, H = L.data._haus;
      const out = {};
      const enter = (i) => { c.arch.enterRoom(i); return Hs.waitPlay(i); };
      // Tod im Seiltänzer-Saal: vom Steg in den Abgrund → Leben −1, Raum von vorn
      enter(4);
      const lives0 = L.runtime.save.lives, r0 = c.arch.info().resets;
      Hs.run(4, [{ to: [0, 9], name: 'steg' }]);
      for (let i = 0; i < 240 && !L.player.dead; i++) Hs.step(window.__w4.stick(1, 0));
      out.dead = L.player.dead;
      for (let i = 0; i < 900 && !(c.arch.info().phase === 'play' && !L.player.dead && c.arch.info().resets > r0); i++) Hs.step({});
      out.after = { ...c.arch.info(), lives: L.runtime.save.lives, lives0, z: +(H.Z0[4] - L.player.pos.z).toFixed(2) };
      out.solve5 = Hs.solve(4);
      out.cleared5 = c.arch.info().phase !== 'play';
      // Ahnengalerie: Riesenprojektil kommt 1 s nach dem Start; wer stehen bleibt, wird getroffen
      enter(2);
      const kugel = L.named.get('r3_kugel');
      const shots0 = kugel.shots;
      let hit = false, minNear = 99;
      for (let i = 0; i < 600 && !hit; i++) { Hs.step({}); if (kugel.bullet && !kugel.bullet.removed) minNear = Math.min(minNear, kugel.near ?? 99); if (L.player.invuln > 0.5 || L.player.dead) hit = true; }
      out.kugel = { spawned: kugel.shots - shots0, hit, minNear: +minNear.toFixed(2) };
      // frisch in die Galerie (Figur wieder groß, ohne Schutzzeit)
      for (let i = 0; i < 300 && L.player.dead; i++) Hs.step({});
      const fit = () => { const p = L.player; p.big = true; p.updateHalf?.(); p.invuln = 0; Hs.S.lastInv = 0; };
      fit();
      enter(2);
      fit();
      // Lauf: Kugel bleibt hinter der Figur
      let gapMin = 99;
      const t0 = kugel.shots;
      const watch = () => { if (kugel.bullet && !kugel.bullet.removed) gapMin = Math.min(gapMin, kugel.near ?? 99); };
      L.onStep(watch);
      const s3 = Hs.solve(2);
      Hs.step({}); Hs.step({});
      out.flucht = { spawned: kugel.shots - t0, gapMin: +gapMin.toFixed(2), hits: s3.hits, cleared: c.arch.info().phase !== 'play', bulletGone: !kugel.bullet };
      // Maschinenhalle: ohne Boost (hinter dem ersten Pfeil abgesetzt) langsam unter den Stampfsteinen → Treffer;
      // mit Boost → keiner (siehe Teil haus)
      enter(5);
      const h0 = Hs.S.hits;
      L.player.reset([0, H.Y, Hs.zu(5, 10.3)], Math.PI / 2);
      Hs.run(5, [{ to: [0, 18.5], run: false, slow: 0.5, name: 'langsam', max: 600 }]);
      out.stein = { hits: Hs.S.hits - h0, fell: L.entities.filter((e) => e.kind === 'stampfstein' && e.state !== 'wait').length };
      // Dachboden: Bröckelblöcke zerfallen hinter der Figur; nach einem Neustart sind alle wieder da
      enter(9);
      Hs.run(9, [{ to: [0, 14], dodge: ['stachelwalze'], name: 'bloecke' }]);
      for (let i = 0; i < 90; i++) Hs.step({});
      const bl = () => ['broeckel_a', 'broeckel_b'].reduce((n, k) => n + L.named.get(k).left(), 0);
      const zA = H.Z0[9], zB = H.Z0[9] - 38;
      out.broeckel = { left: bl(), dead: L.player.dead, walzen: L.named.get('r10_werfer')?.throws ?? null,
        rollen: L.entities.filter((e) => e.kind === 'stachelwalze' && !e.removed && e.pos.z < zA && e.pos.z > zB).map((e) => +(e.vel?.z ?? 0).toFixed(1)) };
      for (let i = 0; i < 600 && !L.player.dead; i++) Hs.step({});
      for (let i = 0; i < 900 && !(c.arch.info().phase === 'play' && !L.player.dead && c.arch.info().room === 9); i++) Hs.step({});
      Hs.step({}); Hs.step({});
      out.broeckel.restored = bl();
      return out;
    });
    console.log(`  ${JSON.stringify({ ...r, solve5: { ...r.solve5, log: undefined } })}`);
    check(`Tod im Seiltänzer-Saal: Absturz, Leben −1, Raum 5 beginnt von vorn mit 10 s (Raum ${r.after.room + 1}, Zeit ${r.after.time})`, r.dead && r.after.room === 4 && r.after.lives === r.after.lives0 - 1 && r.after.time > 9.5 && r.after.z < 4);
    check('Nach dem Neustart: Raum 5 per Skript geschafft', r.cleared5 && r.solve5.hits === 0);
    check(`Ahnengalerie: Riesenprojektil startet hinter der Figur und trifft, wer stehen bleibt (Abstand min ${r.kugel.minNear} m)`, r.kugel.spawned === 1 && r.kugel.hit);
    check(`Ahnengalerie: Flucht gelingt (Kugel jagt hinterher, Abstand min ${r.flucht.gapMin} m, keine Treffer), Kugel weg nach dem Stern`, r.flucht.spawned === 1 && r.flucht.gapMin < 8 && r.flucht.gapMin > 0 && r.flucht.hits === 0 && r.flucht.cleared && r.flucht.bulletGone);
    check(`Maschinenhalle: wer langsam geht, wird von einem Stampfstein getroffen (${r.stein.hits} Treffer, ${r.stein.fell} gefallen)`, r.stein.hits >= 1 && r.stein.fell >= 1);
    check(`Dachboden: Bröckelblöcke zerfallen (${r.broeckel.left}/52 übrig), nach dem Neustart alle zurück (${r.broeckel.restored}), Walzen rollen heran (${r.broeckel.walzen} geworfen, vz ${r.broeckel.rollen.join('/')})`, r.broeckel.left < 52 && r.broeckel.restored === 52 && r.broeckel.walzen > 0 && r.broeckel.rollen.some((v) => v > 1));
  }
  if (want('Bild')) {
    if (!(await load(id, { fresh: true }))) return;
    await sc(installHaus);
    for (let i = 0; i < 10; i++) {
      await shot(`haus_raum${i + 1}`, (i) => {
        const c = window.__course, Hs = window.__haus;
        if (i > 0) c.arch.enterRoom(i);
        Hs.waitPlay(i);
        const prog = [12, 0, 6, 0, 0, 0, 0, 0, 0, 0][i];
        if (prog) Hs.run(i, [{ to: [0, prog], name: 'bild' }]);
        for (let k = 0; k < 50; k++) { c.level.player.invuln = 999; Hs.step({}); }
      }, { arg: i });
    }
    // besondere Augenblicke
    await shot('haus_flucht', () => {
      const c = window.__course, Hs = window.__haus;
      c.arch.enterRoom(2); Hs.waitPlay(2);
      Hs.run(2, [{ to: [0, 16], hops: [13], name: 'bild' }]);
    });
    await shot('haus_stampfsteine', () => {
      const c = window.__course, Hs = window.__haus;
      c.arch.enterRoom(5); Hs.waitPlay(5);
      Hs.run(5, [{ to: [0, 22], name: 'bild' }]);
      for (let k = 0; k < 10; k++) Hs.step({});
    });
    await shot('haus_schaukel', () => {
      const c = window.__course, Hs = window.__haus;
      c.arch.enterRoom(6); Hs.waitPlay(6);
      const p = c.level.player;
      const sw = c.level.named.get('schaukel2');
      p.reset([0, sw.y + 0.1, sw.z], Math.PI / 2);
      for (let k = 0; k < 40; k++) { p.invuln = 999; Hs.step({}); }
    });
    await shot('haus_dachboden', () => {
      const c = window.__course, Hs = window.__haus;
      c.arch.enterRoom(9); Hs.waitPlay(9);
      Hs.run(9, [{ to: [0, 10], dodge: ['stachelwalze'], name: 'bild' }]);
    });
  }
}

// ====================================================================== Ablauf
for (const p of PARTS.length ? PARTS : ['burg-route', 'burg-sterne', 'burg-boss', 'burg-bilder', 'haus', 'haus-extra']) {
  if (p === 'burg-route') await burgRoute();
  if (p === 'burg-sterne') await burgSterne();
  if (p === 'burg-boss') await burgBoss();
  if (p === 'burg-bilder') await burgBilder();
  if (p === 'haus') await haus();
  if (p === 'haus-extra') await hausExtra();
  if (p === 'haus-raum') await hausRaum();
}

if (stats.length) {
  console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
  for (const [n, c, t] of stats) console.log(`    ${n.padEnd(26)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
  const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 130 (max ${maxCalls})`, maxCalls < 130);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
