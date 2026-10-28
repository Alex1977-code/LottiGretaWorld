// Welt 6, Level 6-3 „Schiebetüren im Kirschblütensaal“ (Fernost-Halle: Schiebetüren antippen, dreistöckiger Saal, Gong,
// Pilz-Maske, Tempelaußenseite mit Propeller-Helmen), 6-4 „Floßfahrt durch den Giftsee-Dschungel“ (Floß im lila Giftsee,
// Brummer, Rankenschnapper, Klettergitter, Abwärtsströmung) und 6-A „Schubser-Prinz im Röhrenzwinger“ (Arena mit Boss):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und
// Greta von Start bis Zielmast bzw. Arena-Stern, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport
// auf der Route), alle Sterne und der Stempel mit der echten Mechanik (samt Gegenproben), Extras, Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w6b_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w6b.mjs [6-3|6-4|6-A]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/
//   Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, runUp, within, run, slow, max, land, autoJump,
//   stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { pound: [x, z] } · { crouch } (Röhre/Warp-Box) · { star: i } ·
//   { stamp: true } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung, max } · { tap: Id } (Bildschirm-Tipp auf
//   die Zielmitte, Strahl wie im Spiel) · { action: n } (Aktionstaste) · { fight: Id } (Schubser-Prinz: vor eine Mündung
//   locken, ausweichen, anstoßen, Tritt) · { raft: Id, until, hops } (auf dem Floß mitfahren) · { board: Id } (auf das Floß
//   springen) · { hang: [x, z], to: [x, z] } (Deckengitter greifen, hangeln, loslassen) · { climb: [x, z], over: [x, z] }
//   (Wandgitter hinauf, oben abspringen) · { prop: [x, z], rise } (Propeller-Helm: hochfliegen, langsam hinübergleiten)
const ROUTES = {
  '6-A': {
    start: [0, 2, 13.4],
    meta: { stars: 1, stamp: false, time: 300, theme: 'fortress', music: 'course_arena', archetype: 'arena' },
    enemies: { schubser_prinz: 1 },
    main: [
      { name: 'durch das Kronentor', to: [0, 7.5], within: 0.6 },
      { expect: 'fightOn' },
      { name: 'Kampf', fight: 'prinz' },
      { until: 'arenaStar', max: 900 },
      { name: 'Stern', star: 0 },
      { until: 'arenaDone', max: 900 },
    ],
    routeChecks: [
      { name: 'drei Röhrenfahrten und drei Tritte (echte Mechanik)', ok: (r) => r.mech.trips === 3 && r.mech.kicks === 3 },
    ],
    targets: [],
    extra: [
      { name: 'Tor schließt sich beim Betreten, der Prinz stampft auf (Lebensleiste 3/3)', from: [0, 2, 14], heroes: ['lotti'],
        legs: [{ to: [0, 7.5], within: 0.6 }, { wait: 30 }, { expect: 'fightOn' }, { expect: 'gateLocked' }, { expect: 'hud3' }, { to: [0, 12.5], within: 0.5, max: 200, partial: true }, { expect: 'insideCage' }] },
      { name: 'Draufspringen ohne Röhre ist nur ein Abprall (kein Treffer)', from: [0, 2, 9], heroes: ['lotti'],
        legs: [{ to: [0, 7.5], within: 0.6 }, { until: 'prinzAim', max: 600 }, { stompBoss: 'prinz' }, { wait: 30 }, { expect: 'prinzFull' }] },
      { name: 'Extraleben: unsichtbarer Block rechts vor dem Kronentor', from: [5.8, 2, 13.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [5.8, 15.5], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Tod im Kampf: Neustart vor dem Tor, Prinz wieder 3/3, Tor offen', from: [0, 2, 14], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, 7.5], within: 0.6 }, { fight: 'prinz', kicks: 1, max: 6000 }, { kill: true }, { wait: 300 }, { expect: 'prinzReset' }] },
    ],
    shots: [
      ['start', [0, 2, 13.4]],
      ['tor', [0, 2, 11.5]],
      ['mitte', [0, 2, 3]],
      ['roehre_links', [-6, 2, 0], 0, null, Math.PI],
      ['ecke', [6, 2, -6]],
    ],
  },
};

const PORT = 4650;
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
  const hud = () => L.archetype?.hud?.state?.() ?? {};
  const COND = {
    // 6-A
    fightOn: () => !!named('prinzKampf')?.started && named('prinz')?.state !== 'wait',
    gateLocked: () => !!named('prinzKampf')?.locked,
    hud3: () => hud().boss?.hp === 3,
    insideCage: () => P().pos.z < 10,
    prinzAim: () => named('prinz')?.state === 'aim',
    prinzFull: () => named('prinz')?.hp === 3,
    prinzReset: () => { const b = named('prinz'); return b.hp === 3 && b.state === 'wait' && !named('prinzKampf').started && !named('prinzKampf').locked && P().pos.z > 12 && !P().dead; },
    prinzWon: () => named('prinz')?.state === 'gone' && named('prinz')?.hits === 3,
    arenaStar: () => !!L.archetype?.info?.().starTouch,
    arenaDone: () => L.runtime.status === 'done' || L.runtime.status === 'goal',
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
      if (p.helmet) p.dropHelmet('gone');
      p.reset(pos, o.yaw ?? Math.PI / 2);
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
      const mech = { hurts: 0, trips: 0, kicks: 0, taps: 0, pipes: 0, rafts: 0, hangs: 0, climbs: 0, props: 0 };
      const track = [];
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 3) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
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
        if (p.dead || L.runtime.status !== 'play') {
          if (Lg.until && COND[Lg.until]?.()) { log.push(['bis', Lg.until, 0]); continue; }
          if (!(Lg.wait || Lg.expect || Lg.until)) break;
        }
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { if (p.dead) { c.setInput({}); c.step(1); steps++; } else tick({}); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['ducken', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.kill) { p.invuln = 0; p.die('fall'); log.push(['tot gesetzt']); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.action) { for (let k = 0; k < Lg.action; k++) tick({ action: k % 2 === 0 }); log.push(['aktion', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.helmet]); continue; }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 1200 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Bildschirm-Tipp auf ein Antipp-Ziel (wie ein Finger)
        if (Lg.tap) {
          const h = named(Lg.tap);
          const t = L.taps?.targets.find((x) => x.owner === h);
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
        // ------------------------------------------------ Endgegner einmal von oben treffen (ohne Röhre: nur Abprall)
        if (Lg.stompBoss) {
          const b = named(Lg.stompBoss);
          let k = 0, bounced = false;
          for (; k < 600 && !bounced; k++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && d < 2.4) { tick({ ...this.stick(dx, dz, 0.6), jump: true }); continue; }
            if (p.mode === 'air') { tick({ ...this.airSteer(b.pos.x, b.pos.z, 0, 0, 3.6, 7), jump: p.vel.y > 0 }); if (p.jumpKind === 'bounce' || (b.bounces ?? 0) > 0) bounced = true; continue; }
            tick({ ...this.stick(dx, dz, 1) });
          }
          log.push(['Kopfsprung', bounced, b.hp, b.state, b.bounces]);
          continue;
        }
        // ------------------------------------------------ Schubser-Prinz: in die Röhren stoßen und treten
        if (Lg.fight) {
          const r = this.fight(Lg.fight, { tick, max: Lg.max ?? 24000, kicks: Lg.kicks ?? 3 });
          mech.trips += r.trips; mech.kicks += r.kicks;
          log.push(['Kampf', JSON.stringify(r)]);
          if (r.kicks < (Lg.kicks ?? 3)) log.push(['FEHLER: Kampf nicht gewonnen']);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});   // erst landen, dann abspringen
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
          if (j0 === null && Lg.runUp && p.mode === 'ground' && ((p.vel.x * dx + p.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)) j0 = i;
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
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    /**
     * Kampf gegen den Schubser-Prinzen mit echten Eingaben: eine Röhrenmündung wählen, die vom Prinzen aus gerade
     * anzulaufen ist, zwischen ihn und die Mündung stellen, im Anlauf seitlich ausweichen (er rammt sich fest), dann in ihn
     * hineinlaufen (zweiter Stoß), zur Ausgangsmündung rennen und auf den Benommenen springen.
     */
    fight(id, o) {
      const p = P(), b = named(id), tick = o.tick;
      const mouths = b.pipes;
      const r = { trips0: b.trips, kicks0: b.hits, steps: 0, dodges: 0, stuckSeen: 0, states: [] };
      let dodge = null, spot = null;
      for (let k = 0; k < o.max; k++) {
        if (b.hits - r.kicks0 >= o.kicks || b.state === 'gone' || p.dead || L.runtime.status !== 'play') break;
        r.steps++;
        const s = b.state;
        if (r.states[r.states.length - 1] !== s) { r.states.push(s); if (r.states.length > 60) r.states.shift(); }
        const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (s === 'stunned') {
          dodge = null;
          if (p.mode === 'ground' && d < 2.3) { tick({ ...this.stick(dx, dz, 0.5), jump: true }); continue; }
          if (p.mode === 'air') { tick({ ...this.airSteer(b.pos.x, b.pos.z, 0, 0, 3.6, 8), jump: p.vel.y > 0 }); continue; }
          tick({ ...this.stick(dx, dz, 1), run: true });
          continue;
        }
        if (s === 'stuck') {
          dodge = null;
          r.stuckSeen++;
          tick({ ...this.stick(dx, dz, 1), run: true });
          continue;
        }
        if (s === 'pipe' || s === 'squeezed') {
          dodge = null;
          const t = b.exit ?? b.trip?.to;
          if (t) { const tx = t.x + t.dx * 4.2, tz = t.z + t.dz * 4.2; const ex = tx - p.pos.x, ez = tz - p.pos.z; tick(Math.hypot(ex, ez) > 0.4 ? { ...this.stick(ex, ez, 1), run: true } : {}); }
          else tick({});
          continue;
        }
        if (s === 'hit' || s === 'defeated' || s === 'wait') { tick({}); continue; }
        // Ausweichen im Anlauf: seitlich weg (quer zur Anlaufrichtung), mit Sprung
        if (s === 'charge' && !dodge && d < 3.4) {
          const cx = b.chargeDir.x, cz = b.chargeDir.z;
          let sx = -cz, sz = cx;
          if (sx * (p.pos.x - b.pos.x) + sz * (p.pos.z - b.pos.z) < 0) { sx = -sx; sz = -sz; }
          // nicht in die Wand ausweichen
          const nx = p.pos.x + sx * 2.5, nz = p.pos.z + sz * 2.5;
          if (Math.abs(nx) > 9.2 || Math.abs(nz) > 9.2) { sx = -sx; sz = -sz; }
          dodge = { x: sx, z: sz, t: 0 };
          r.dodges++;
        }
        if (dodge) {
          dodge.t++;
          tick({ ...this.stick(dodge.x, dodge.z, 1), run: true, jump: dodge.t < 14 });
          if (dodge.t > 70 && p.mode === 'ground') dodge = null;
          continue;
        }
        // Mündung wählen: die der Prinz am geradesten anlaufen würde (Abstand ≥ 5 m)
        let best = null, bs = Infinity;
        for (const m of mouths) {
          const rx = b.pos.x - m.x, rz = b.pos.z - m.z, l = Math.hypot(rx, rz);
          if (l < 5) continue;
          const cos = (rx * m.dx + rz * m.dz) / l;
          const score = -cos + Math.hypot(p.pos.x - m.x, p.pos.z - m.z) * 0.01;
          if (score < bs) { bs = score; best = m; }
        }
        if (best) {
          const rx = b.pos.x - best.x, rz = b.pos.z - best.z, l = Math.hypot(rx, rz) || 1;
          spot = { x: best.x + (rx / l) * 2.6, z: best.z + (rz / l) * 2.6 };
        }
        if (spot) {
          const ex = spot.x - p.pos.x, ez = spot.z - p.pos.z, el = Math.hypot(ex, ez);
          tick(el > 0.25 ? { ...this.stick(ex, ez, Math.min(1, el / 1.2)), run: el > 2 } : {});
        } else tick({});
      }
      r.trips = b.trips - r.trips0;
      r.kicks = b.hits - r.kicks0;
      r.states = r.states.slice(-14).join('>');
      r.hp = b.hp;
      r.log = b.tripLog;
      return r;
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
        if (e.touch === false && kind === 'star') { p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); continue; }
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200 && L.runtime.status === 'play') { c.setInput({}); c.step(1); } }
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

const W = (name, ...args) => sc(([n, a]) => window.__w6[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w6b_${name}.png` });
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, starSlots: d.starSlots ?? null, stamp: !!d.stamp }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const nStars = meta.archetype === 'arena' ? (meta.starSlots ?? 0) : meta.stars;
    check(`${id}: ${R.meta.stars} Stern(e)${R.meta.stamp ? ', Stempel' : ''}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      nStars === R.meta.stars && meta.stamp === R.meta.stamp && (kinds.stamp ?? 0) === (R.meta.stamp ? 1 : 0) && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
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
    check(`${id}: Routen-Bot ${hero} erreicht ${R.meta.archetype === 'arena' ? 'den Arena-Sieg' : 'den Zielmast'}`, reached);
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
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, {});
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
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
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
