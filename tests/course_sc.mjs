// Welt Stern, Level S-6 „Honigwaben im Sternenmeer“ (Draufsicht über Honigwaben: Wurfsichel, Schalter-Waben, Stachelwalzen,
// Glasröhre über den Lavasee zur Spiegelfrucht, Käferfeld, Splitterwege mit Feuer-Schnappblumen auf fliegenden Blöcken,
// Wabenfläche mit Brummern, Zielturm mit flinker Treppe) und S-7 „Riesenpilze im Tintenteich-Dschungel“ (übergroßer Dschungel:
// Pilzlingstürme, Rutschhang, Riesen-Pilzlingstürme, Riesentrank-Feld mit Großrollpilzen und Steinblock-Wänden, versteckter
// Gleitblatt-Block, Blockwächter-Wand, Unterwasser mit Tintlingen und Strömungen, Pilz-Trampoline durch zwei Großblock-Lagen,
// Röhre zum Ziel): Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot
// (Lotti und Greta von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der
// Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/sc_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_sc.mjs [S-6|S-7]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=1 (Spur der Figur)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Gegenproben
// laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } ·
// { expect: Bedingung } · { until: Bedingung } (Name aus COND oder Ausdruck '=…') · { pipe: [x, z] } (in eine Glasröhre) ·
// { stompAll: Id-Anfang } · { pound: [x, z] } (Stampfattacke) · { grab: [x, z] } (Power-up vom ?-Block holen) ·
// { throwAt: [x, z] } (Wurfsichel) · { steps: Id } (flinke Treppe hinauf) · { swim: [x, y, z] } · { die: Ursache }
const ROUTES = {
  'S-6': {
    start: [0, 0, 0],
    meta: { stars: 3, time: 400, theme: 'honeycomb', music: 'course_honeycomb', archetype: 'parcours' },
    enemies: { krabbelkaefer: 12, flatterkaefer: 6, feuer_schnappblume: 4, brummer: 4, pilzling: 2 },
    main: [
      { name: 'Startwabe', to: [-1.4, -12.6], within: 0.6 },
      { name: 'linker Weg', to: [-4.3, -19.5], within: 0.7 }, { to: [-4.3, -32], within: 0.7 }, { to: [-1.4, -40], within: 0.7 },
      { to: [-4.3, -48], within: 0.7 }, { to: [-2.8, -55], within: 0.7 },
      { name: 'vor Walze 1', to: [0, -58.6], within: 0.5 },
      { name: 'über Walze 1', to: [0, -66.2], jump: 30, jumpAt: 7.4, within: 0.8 },
      { to: [0, -68.6], within: 0.5 },
      { name: 'über Walze 2', to: [0, -76], jump: 30, jumpAt: 7.4, within: 0.8 },
      { name: 'über Walze 3', to: [0, -83.6], jump: 30, jumpAt: 7.4, within: 0.8 },
      { name: 'Röhren-Plattform', to: [0, -86.8], within: 0.4 },
      { name: 'Glasröhre über den Lavasee', pipe: [0, -88.6] },
      { expect: '=P().pos.z < -110 && P().pos.z > -127' },
      { name: 'Kontrollpunkt Spiegelfrucht-Insel', to: [0, -120.5], within: 0.6 },
      { expect: '=L.players.length >= 2' },
      { name: 'Käferfeld', to: [0, -135], within: 0.7 }, { to: [0, -160], within: 0.7 }, { to: [0, -171], within: 0.7 },
      { name: 'mittlerer Splitterweg', to: [0, -196], within: 0.7 }, { to: [0, -221], within: 0.7 },
      { name: 'Kontrollpunkt Wabenfläche', to: [0, -224], within: 0.6 },
      { name: 'Wabenfläche', to: [0, -250], within: 0.7 }, { to: [0, -276], within: 0.7 },
      { name: 'Turmsockel', to: [-5.8, -295.6], within: 0.4, run: false },
      { name: 'flinke Treppe', steps: 'treppe' },
      { name: 'auf den Turm', to: [2.3, -298.4], jump: 30, jumpAt: 6, within: 0.6, run: false },
      { name: 'Zielmast', to: [0, -298], within: 0.2, run: false },
    ],
    routeChecks: [
      { name: 'Glasröhre gefahren, Spiegelfrucht gibt einen Klon', ok: (r) => r.mech.pipes >= 1 && r.mech.maxFigs >= 2 },
    ],
    targets: [
      { name: 'Stern 0: Druckknopf an der Gabelung → rechter Weg erscheint (Schalter-Waben) → Stern am Ende', star: 0, from: [2.8, 0, -5],
        legs: [{ to: [4.25, -7.6], within: 0.3, run: false }, { to: [4.25, -9.8], jump: 20, jumpAt: 2.5, within: 0.25, run: false },
          { until: '=L.named.get(\'rechts\').shown', max: 600 }, { to: [4.3, -13], within: 0.5 }, { to: [7.07, -19.5], within: 0.6 },
          { to: [8.5, -30], within: 0.3 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Druckknopf (rechts nur Umrisse – Absturz)', star: 0, expectNot: true, from: [2.8, 0, -8], heroes: ['lotti'], invuln: false,
        legs: [{ to: [4.3, -13], within: 0.5, max: 240 }, { to: [7.07, -19.5], within: 0.6, max: 300 }, { wait: 200 }] },
      { name: 'Stern 1: alle sechs Flatterkäfer im Mittelteil des Käferfelds besiegen', star: 1, from: [0, 0, -137],
        legs: [{ stompAll: 'fk_' }, { until: 'stern1da', max: 300 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Wurfsichel (Kontrollpunkt-Block) über das Lavafeld werfen', star: 2, from: [0, 0, -224],
        legs: [{ grab: [2.83, -226.3], back: [2.83, -223.9] }, { to: [-0.6, -262.5], within: 0.3, run: false }, { throwAt: [-6.4, -262.5] }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Wurfsichel vom Rand aus', star: 2, expectNot: true, from: [0, 0, -258], heroes: ['lotti'],
        legs: [{ to: [-0.6, -262.5], within: 0.3, run: false }, { wait: 120 }] },
      { name: 'Stempel: mit der Wurfsichel vom linken Weg hinaus ins All', stamp: true, from: [0, 0, -2],
        legs: [{ grab: [-2.83, -4.9], back: [-2.83, -2.5] }, { to: [-1.4, -12.6], within: 0.6 }, { to: [-4.3, -19.5], within: 0.6 },
          { to: [-5.4, -26.2], within: 0.3, run: false }, { throwAt: [-11.6, -26.2] }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block hinter dem Start (links hinten bei den rosa Kristallen)', from: [-4.3, 0, 3.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-5.0, 4.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', power: 'oneup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block über der hohen Wabe im Käferfeld', from: [5.66, 0, -152], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [7.07, -154.5], jump: 20, jumpAt: 2.5, within: 0.25, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', power: 'oneup', max: 1200 }] },
      { name: 'Lava-Wabe: Draufspringen verletzt und schleudert hoch', from: [3.4, 0, -88.8], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [3.4, -93.4], within: 0.4, run: false, max: 200 }, { wait: 60 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Stachelwalze: Hineinlaufen verletzt', from: [0, 0, -58.6], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [-3, -62.6], within: 0.3, run: false, max: 240 }, { wait: 30 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'flinke Treppe: Stufen vergehen hinter einem (oben stehen bleiben → hinunter)', from: [-5.6, 0, -296], heroes: ['lotti'], allowFail: true,
        legs: [{ to: [-4.35, -299.16], jump: 20, jumpAt: 3, within: 0.3, run: false }, { to: [-3.69, -295.42], jump: 24, jumpAt: 4, within: 0.3, run: false }, { wait: 600 }],
        mech: (r) => r.pos[1] < 1.4, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
      { name: 'Wurfsichel aus dem ?-Block am Start', from: [-2.83, 0, -2.5], heroes: ['lotti'],
        legs: [{ grab: [-2.83, -4.9], back: [-2.83, -2.5] }, { expect: '=P().power === \'sichel\'' }] },
    ],
    shots: [
      ['start', [0, 0, 0]],
      ['gabel', [-1.4, 0, -14]],
      ['rechterweg', [4.25, 0, -8], 0, null, Math.PI / 2, 'rechts'],
      ['stempel_sicht', [-4.3, 0, -24]],
      ['walzen', [0, 0, -59]],
      ['walzen2', [0, 0, -70]],
      ['roehre', [0, 0, -87]],
      ['insel', [0, 0, -119]],
      ['kaefer', [0, 0, -132]],
      ['kaefermitte', [0, 0, -146]],
      ['splitter', [0, 0, -176]],
      ['splitter2', [0, 0, -205]],
      ['flaeche', [0, 0, -226]],
      ['lavafeld', [-1, 0, -258]],
      ['brummer', [3, 0, -272]],
      ['turm', [0, 0, -288]],
      ['turm_oben', [3.69, 7.2, -295.42]],
    ],
  },
};

const PORT = 4955;
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
  const ent = (id) => L.named.get(id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    stern1da: () => L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && e.alive),
    sichel: () => P().power === 'sichel',
    riese: () => P().power === 'riese',
    gleitblatt: () => P().power === 'gleitblatt',
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at). */
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', `return (${k.slice(1)});`)(P, L, ent, at) : COND[k]());
  const W = {
    place(pos, o = {}) {
      const p = P();
      if (typeof pos === 'string') pos = L.data.marks[pos];
      c.setInput(null);
      L.squad?.clear?.();
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
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, pipes: 0, rides: 0, stomped: [], hurtList: [], maxFigs: 1, swims: 0, maxPower: {} };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        mech.maxFigs = Math.max(mech.maxFigs, L.players.length);
        if (P().power && P().power !== 'none') mech.maxPower[P().power] = (mech.maxPower[P().power] ?? 0) + 1;
        if (P().mode === 'swim') mech.swims++;
        if ((P().hurtTries ?? 0) > lastHurts) { lastHurts = P().hurtTries; mech.hurtList.push(`${P().lastHurt}@${P().pos.x.toFixed(0)},${P().pos.y.toFixed(0)},${P().pos.z.toFixed(0)}`); }
        const q = P();
        if (q.mode === 'ground' && !q.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(q.pos.x - t[0], q.pos.z - t[2]) > 7 || Math.abs(q.pos.y - t[1]) > 2) track.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.state, q.power, q.ground?.tag ?? '']);
        if (q.dead && !deadLogged) { deadLogged = true; log.push(['TOD', q.deathCause, JSON.stringify(hist)]); }
        if (q.mode === 'script' && L.runtime.status === 'play' && !q.dead && !o.keepScript) {
          let n = 0;
          const kind = q.script?.kind ?? q.script?.type ?? q.scriptKind ?? '?';
          while (P().mode === 'script' && n++ < 2400 && !P().dead && L.runtime.status === 'play') { if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasspipe' || kind === 'pipe' || kind === 'glasnetz') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && P().mode !== 'ground' && P().mode !== 'swim' && !P().dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (P().mode !== 'ground' || P().hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : Lg.power ? (e) => e.power === Lg.power : null }); log.push(['jagd', Lg.chaseKind, n, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1), P().power]); continue; }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !P().dead; k++) {
            const dx = tx - P().pos.x, dz = tz - P().pos.z;
            tick({ ...this.stick(dx, dz, 1), run: false, jump: Lg.jumpIn && k % 40 < 12 });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - P().pos.x, a.pos.z - P().pos.z) - Math.hypot(b.pos.x - P().pos.x, b.pos.z - P().pos.z));
            const e = list[0];
            let k = 0;
            for (; k < 1500 && e.alive && !e.defeated && !e.removed && !P().dead; k++) {
              const q = P();
              const dx = e.pos.x - q.pos.x, dz = e.pos.z - q.pos.z, d = Math.hypot(dx, dz);
              const ev = e.vel ?? { x: 0, z: 0 };
              if (q.mode === 'ground' && d < (Lg.at ?? 2.4)) { tick({ ...this.stick(dx + ev.x * 0.3, dz + ev.z * 0.3, 0.7), jump: true, run: false }); continue; }
              if (q.mode === 'air') { tick({ ...this.airSteer(e.pos.x + ev.x * 0.15, e.pos.z + ev.z * 0.15, ev.x, ev.z, 3.6, 7), jump: q.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx + ev.x * 0.4, dz + ev.z * 0.4, Math.min(1, d / 2)), run: false });
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
          for (; k < 400 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            if (q.mode === 'ground' && k > 4 && (pounded || q.state === 'groundpound')) break;
            if (q.mode === 'air' && !pounded && d < 0.25 && q.vel.y < 1.5 && q.pos.y > (Lg.above ?? -99)) { pounded = true; }
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen (zum Ziel drehen, Aktion), Rückkehr abwarten
        if (Lg.throwAt) {
          const [tx, tz] = Lg.throwAt;
          let k = 0;
          for (; k < 200 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            const fv = q.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995) break;
            tick({ ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          for (let n = 0; n < (Lg.wait ?? 240); n++) tick({});
          log.push(['sichel', `${Lg.throwAt}`, k, P().power]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const goTo = (x, z, r = 0.2) => { for (let n = 0; n < 400 && !P().dead; n++) { const dx = x - P().pos.x, dz = z - P().pos.z, d = Math.hypot(dx, dz); if (d < r && P().mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); } };
          const pw0 = P().power;
          goTo(bx, bz);
          for (let k = 0; k < 90 && P().hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          let tries = 0;
          for (; tries < 4 && P().power === pw0 && !P().dead; tries++) {
            goTo(back[0], back[1]);
            for (let k = 0; k < 40; k++) tick({});
            for (let k = 0; k < 240 && !P().dead; k++) {
              const dx = bx - P().pos.x, dz = bz - P().pos.z;
              if (k > 10 && P().mode === 'ground') break;
              tick({ ...(P().mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 4) : this.stick(dx, dz, 0.5)), jump: k < 40, run: false });
            }
            for (let k = 0; k < 30; k++) tick({});
          }
          log.push(['power', Lg.grab.join(','), P().power, tries]);
          if (P().power === pw0) log.push(['FEHLER: Power-up nicht geholt', Lg.grab]);
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ flinke Treppe (S-6): Stufe für Stufe hinaufspringen, solange sie da sind
        if (Lg.steps) {
          const h = L.named.get(Lg.steps);
          let k = 0;
          for (let i = 0; i < h.steps.length && !P().dead; i++) {
            const s = h.steps[i];
            for (let w = 0; w < 600 && !s.up && !P().dead; w++, k++) tick({});
            let n = 0, air = false;
            for (; n < 300 && !P().dead; n++, k++) {
              const q = P();
              const dx = s.x - q.pos.x, dz = s.z - q.pos.z, d = Math.hypot(dx, dz);
              if (air && q.mode === 'ground') break;
              if (q.mode === 'air') { air = true; tick({ ...(q.pos.y > s.y + 0.1 || q.vel.y < 0 ? this.airSteer(s.x, s.z, 0, 0, 4, 6) : this.airSteer(q.pos.x + dx * 0.25, q.pos.z + dz * 0.25, 0, 0, 2, 3)), jump: q.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5)), jump: true, run: false });
            }
            for (let w = 0; w < 6; w++, k++) tick({});
            log.push(['stufe', i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().ground?.tag ?? '']);
            if (Math.abs(P().pos.y - s.y) > 0.15) { log.push(['FEHLER: Stufe verfehlt', i]); break; }
          }
          continue;
        }
        // ------------------------------------------------ Schwimmen zu [x, y, z] (Ducken taucht ab, Sprung/gehalten steigt)
        if (Lg.swim) {
          const [tx, ty, tz] = Lg.swim;
          let i = 0, ok = false;
          for (; i < (Lg.max ?? 1500) && !P().dead && L.runtime.status === 'play'; i++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            const dy = ty - q.pos.y;
            if (d < (Lg.within ?? 0.8) && Math.abs(dy) < (Lg.withinY ?? 0.9)) { ok = true; break; }
            const st = d > 0.05 ? this.stick(dx, dz, Lg.slow ?? (d < 0.8 ? Math.max(0.3, d / 0.8) : 1)) : { x: 0, y: 0 };
            if (q.mode !== 'swim') { tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : st), run: false }); continue; }
            const headDepth = (q.water?.top ?? 0) - (q.pos.y + q.half.y * 2);
            let crouch = false, jump = false;
            if (dy < -0.35) crouch = true;
            else if (dy > 0.5) jump = (i % 18) < 3 && headDepth > 0.5;
            else if (q.diving) jump = dy > -0.1 && headDepth > 0.3;
            tick({ ...st, crouch, jump, run: false });
          }
          log.push([Lg.name ?? `schwimm${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
          if (!ok && !Lg.soft) { log.push(['FEHLER: Schwimmziel nicht erreicht', li, JSON.stringify(Lg.swim)]); break; }
          continue;
        }
        // ------------------------------------------------ Sturz (Ursache die): Neustart abwarten (gleiches Level, Kontrollpunkt)
        if (Lg.die) {
          P().die(Lg.die);
          let k = 0;
          for (; k < 2400 && (P().dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? P().pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && P().mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          const q = P();
          if (q.dead || L.runtime.status !== 'play') break;
          const dx = tx - q.pos.x, dz = tz - q.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (q.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (q.mode === 'ground' || q.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (q.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = q.mode === 'swim' && Lg.swimJump !== false && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ, crouch: !!Lg.slide && q.mode === 'ground' });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = P().hurtTries ?? 0;
      mech.lives = L.runtime.save?.lives;
      const q = P();
      return { log, autoJumps, steps, time: steps / 120, pos: [q.pos.x, q.pos.y, q.pos.z], dead: q.dead, status: L.runtime.status, info: q.info(), rt: L.runtime.info(), mech, power: q.power, track };
    },
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
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
        if (P().mode === 'script') { let k = 0; while (P().mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
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
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? null; },
    cond: (k) => cond(k),
    reveal: (id) => { L.named.get(id)?.reveal?.(); c.step(240); return true; },
  };
  window.__sc = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__sc[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}sc_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__sc.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}, Welt 9`,
      meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype && meta.world === 9);
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
    const avgC = per.reduce((a, x) => a + x[1], 0) / per.length, avgT = per.reduce((a, x) => a + x[2], 0) / per.length;
    console.log(`  Messgang: Ø ${avgC.toFixed(1)} Aufrufe, Ø ${Math.round(avgT / 1000)} k Dreiecke`);
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
      if (t.expectAlive !== false && !t.allowFail) ok = ok && !res.dead;
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
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2, reveal = null] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    if (reveal) await W('reveal', reveal);
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
