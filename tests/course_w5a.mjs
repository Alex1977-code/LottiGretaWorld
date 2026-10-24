// Welt 5, Level 5-1 „Schlüsselsuche am Muschelstrand“ (Strand, fünf Schlüsselmünzen öffnen die Warp-Box, Ritt auf Pflaume
// durch den Höhlenfluss) und 5-2 „Zirkus Schwingeschwung“ (Seilbahnen, Trapeze, Pendel-/Drehplattformen, Riesentrank-Gasse):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne
// und der Stempel mit der echten Mechanik (Sandskulptur zerstampfen, Farbfeld-Raum durch die Röhre im Meeresloch, Krabbelkäfer
// der Wandhöhle besiegen; Stempel über der Holzschanze im Ritt; 5-2: hoher Sims, Blaumünzen-Raum, Sternring, Stempel per
// Pilz-Trampolin), Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus
// der Spielkamera (tests/out/w5a_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5a.mjs [5-1|5-2]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/
//   Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump } ·
// { wait } · { hop } (Sprung auf der Stelle) · { pound: [x, z] } (hinspringen, Stampfattacke) · { crouch } (Röhre) ·
// { star: i } · { chaseKind, filter } · { expect: Bedingung } · { until: Bedingung } ·
// { mount: [x, z] } (zu Pflaume springen) · { ride: [[z, lat, jump?], …] } (Floß lenken: Seitenlage im Kanal je z) ·
// { tiles: id } (alle Schaltfelder betreten) · { stompAll: [ids] } (Gegner nacheinander von oben besiegen)
const Y = 1;
const ROUTES = {
  '5-1': {
    start: [0, Y, 10],
    meta: { stars: 3, time: 500, theme: 'beach', music: 'course_beach', archetype: 'parcours_ride' },
    enemies: { panzerkroete: 10, krabbelkaefer: 22, flatterkaefer: 4, rammbock_bulle: 4, sandtaucher: 4, muenzmarder: 3, schluesselmuenze: 5 },
    main: [
      { name: 'Palmenhain (Schlüssel 2)', to: [16, 8], within: 0.4 },
      { to: [25, 2] },
      { to: [30.4, -7.2], within: 0.4 },
      { name: 'Fels hinter den Bullen (Schlüssel 5)', to: [33, -9], jump: 30, within: 0.45, run: false },
      { to: [30, -1] },
      { to: [20, -1] },
      { to: [-7.6, -1.6], within: 0.4 },
      { name: 'Sandburg hinauf', to: [-12, -2], jump: 34, jumpAt: 3.6, within: 0.6, run: false },
      { name: 'Schlüssel 1 über der Sandburg', hop: 30 },
      { to: [-16.2, -3], jump: 20, within: 0.6, run: false },
      { to: [-24, 9] },
      { to: [-27, 11.6], within: 0.4 },
      { name: 'Rettungsturm (Schlüssel 4)', to: [-27, 3.4], within: 0.5, run: false },
      { to: [-27, 9] },
      { to: [-21, -10] },
      { to: [-21, -19.4], within: 0.4 },
      { name: 'Fels im Flachwasser (Schlüssel 3)', to: [-22, -22], jump: 30, within: 0.45, run: false },
      { expect: 'keys5' },
      { expect: 'warpOpen' },
      { to: [-6, -21.6], jump: 14, within: 0.6, run: true },
      { to: [-2, -23], within: 0.4 },
      { name: 'Warp-Box', to: [1, -23], jump: 30, within: 0.3, run: false, stopIf: 'onIsle' },
      { wait: 30 },
      { expect: 'onIsle' },
      { name: 'Checkpoint', to: [0, -45.5], jump: 12, within: 0.5 },
      { name: 'Röhre zur Grotte', to: [0, -54.6], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { to: [0, -73.6], jump: 12, within: 0.5, run: false },
      { name: 'Steg', to: [0, -79.8], within: 0.4, run: false },
      { name: 'zu Pflaume', mount: [0, -82.6] },
      { name: 'Höhlenfluss', ride: [[-80, 0], [-118, 0], [-128, 0], [-140, 0], [-200, 0]], jump: [[-131, -137]], bridges: ['bruecke_a', 'bruecke_b'] },
      { to: [0, -199.4], within: 0.4, run: false },
      { name: 'Röhre zur Zielinsel', to: [0, -201.5], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { expect: 'onGoalIsle' },
      { name: 'Zielmast', to: [0, -236.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'fünf Schlüsselmünzen gesammelt, Warp-Box benutzt', ok: (r) => r.mech.keys === 5 },
      { name: 'auf Pflaume durch den Höhlenfluss geritten', ok: (r) => r.mech.ride > 120 * 20 },
    ],
    targets: [
      { name: 'Stern 0: rechte Sandskulptur zerstampfen', star: 0, from: [13.2, Y, 4],
        legs: [{ to: [13.2, 1.4], within: 0.3, run: false }, { pound: [13.2, -1] }, { wait: 90 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Zerstampfen (Sprung auf die Skulptur)', star: 0, expectNot: true, from: [13.2, Y, 4], heroes: ['lotti'],
        legs: [{ to: [13.2, -1], jump: 30, within: 0.4, run: false }, { wait: 60 }] },
      { name: 'Stern 1: Meeresloch → Röhre → Farbfeld-Raum, alle Felder betreten', star: 1, from: [9, 0.7, -16],
        legs: [{ to: [9, -19.4], within: 0.3, run: false }, { name: 'auf die Röhre im Meeresloch', to: [9, -22.5], jump: 24, within: 0.3, run: false }, { crouch: 4 }, { expect: 'inRoom' },
          { tiles: 'farbfelder' }, { wait: 40 }, { star: 1 }], shot: 'stern1', mech: (r) => r.mech.tiles === 16 },
      { name: 'Stern 2: Wandhöhle – Krabbelkäfer besiegen, Krümel gibt den Stern', star: 2, from: [48, Y, 4],
        legs: [{ to: [48, -1], within: 0.5 }, { stompAll: 'kk_hoehle' }, { until: 'taskDone', max: 240 }, { star: 2 }], shot: 'stern2', mech: (r) => r.mech.stomped.length === 6, mechText: (r) => `besiegt ${r.mech.stomped.length}` },
      { name: 'Stempel: über der Holzschanze im Flussritt (Sprung gehalten)', stamp: true, from: [0, 0.62, -72],
        legs: [{ to: [0, -79.8], within: 0.4, run: false }, { mount: [0, -82.6] }, { ride: [[-80, 0], [-200, 0]], jump: [[-131, -137]] }], shot: 'stempel',
        mechText: (r) => `Scheitel über der Schanze y ${r.mech.maxRampY.toFixed(2)}` },
      { name: 'Stempel nicht ohne Sprung (Schanze nur mitgenommen)', stamp: true, expectNot: true, from: [0, 0.62, -72], heroes: ['lotti'],
        legs: [{ to: [0, -79.8], within: 0.4, run: false }, { mount: [0, -82.6] }, { ride: [[-80, 0], [-200, 0]] }],
        mechText: (r) => `Scheitel y ${r.mech.maxRampY.toFixed(2)}` },
    ],
    extra: [
      { name: 'Mini-Pilzlinge: mittlere Sandskulptur zerstampfen → sechs Mini-Pilzlinge', from: [9.6, Y, 4], heroes: ['lotti'],
        legs: [{ to: [9.6, 1.4], within: 0.3, run: false }, { pound: [9.6, -1] }, { wait: 120 }, { expect: 'minis6' }] },
      { name: 'Extraleben: unsichtbarer Block vor dem roten Strandkorb', from: [-13, Y, 4.5], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-13, 6.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: Schatztruhe hinter dem Leuchtturm', from: [4, Y, -236], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6.4, -240.6], within: 0.4 }, { to: [10.2, -239.6], within: 0.4, run: false }, { wait: 60 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: dritten Münzmarder einholen', from: [21, Y, 12], heroes: ['lotti'], expectLives: 1,
        legs: [{ chaseKind: 'muenzmarder', ids: ['marder3'], run: true, max: 3000 }, { wait: 60 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Warp-Box versteckt, solange Schlüssel fehlen', from: [1, Y, -18], heroes: ['lotti'],
        legs: [{ to: [1, -23], within: 0.3, run: false }, { wait: 60 }, { expect: 'notOnIsle' }] },
    ],
    shots: [
      ['start', [0, Y, 10]],
      ['skulpturen', [9.6, Y, 5]],
      ['burg', [-10, Y, 3]],
      ['turm', [-24, Y, 9]],
      ['flachwasser', [-16, Y, -10]],
      ['sandbank', [1, Y, -16]],
      ['loch', [8, 0.7, -17]],
      ['hain', [16, Y, 13]],
      ['bullen', [30, Y, 4]],
      ['hoehle_vor', [48, Y, 7]],
      ['hoehle', [48, Y, -2]],
      ['farbraum', [102, Y, -12]],
      ['schwebeinsel', [0, 9, -42]],
      ['steg', [0, 0.62, -71]],
      ['grotte_a', [0, 0.62, -78]],
      ['grottenstrand', [0, 0.62, -197]],
      ['zielinsel', [0, Y, -219]],
      ['ziel', [0, Y, -231]],
    ],
  },
  '5-2': {
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'circus', music: 'course_trapeze', archetype: 'parcours' },
    enemies: {},
    main: [],
    targets: [],
    extra: [],
    shots: [['start', [0, Y, 6]]],
  },
};

const PORT = 4470;
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
  const COND = {
    keys5: () => (L.keys?.tor?.n ?? 0) >= 5,
    warpOpen: () => !L.named.get('warp1')?.hidden,
    onIsle: () => P().pos.y > 8 && P().pos.z < -36 && P().pos.z > -60,
    notOnIsle: () => !(P().pos.y > 8 && P().pos.z < -36 && P().pos.z > -60),
    minis6: () => L.entities.filter((e) => e.kind === 'pilzling' && e.mini && !e.removed).length === 6,
    riding: () => !!P().riding,
    dismounted: () => !!P().dismounted && !P().riding,
    inRoom: () => P().pos.x > 90,
    tilesDone: () => !!L.named.get('farbfelder')?.done,
    taskDone: () => L.named.get('aufgabe_hoehle')?.state === 'done',
    onGoalIsle: () => P().pos.z < -210,
    fire: () => P().power === 'funken',
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
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, keys: [], ride: 0, maxRampY: -99, bridgeHits: 0, tiles: 0, stomped: [], pipes: 0 };
      const track = [];
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.riding) mech.ride++;
        if (p.mode === 'ground' && !p.dead && !p.riding) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !p.riding && p.script?.type !== 'mount' && p.script?.type !== 'dismount' && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && !p.riding) { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
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
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen (Sandskulptur)
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
        // ------------------------------------------------ Floß lenken: Seitenlage je z, Sprung in Bereichen, bis zum Absteigen
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
            if (p.mode === 'air' && p.riding) mech.maxRampY = Math.max(mech.maxRampY, p.pos.y);
          }
          for (const id of Lg.bridges ?? []) mech.bridgeHits += L.named.get(id)?.hits ?? 0;
          log.push(['ritt', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, !!p.dismounted]);
          if (!p.dismounted) log.push(['FEHLER: Ritt nicht beendet']);
          continue;
        }
        // ------------------------------------------------ alle Felder einer Schaltfeld-Gruppe betreten
        if (Lg.tiles) {
          const g = L.named.get(Lg.tiles);
          let guard = 0;
          while (g && !g.done && guard++ < 40) {
            const left = g.tiles.filter((t) => !t.on);
            if (!left.length) break;
            left.sort((a, b) => Math.hypot(a.x - p.pos.x, a.z - p.pos.z) - Math.hypot(b.x - p.pos.x, b.z - p.pos.z));
            goTo(left[0].x, left[0].z, 0.3, 600);
          }
          mech.tiles = g ? g.count : 0;
          log.push(['felder', g?.count, g?.done]);
          if (!g?.done) log.push(['FEHLER: Felder nicht alle']);
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
      mech.keys = L.keys?.tor?.n ?? 0;
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
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
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
  await page.screenshot({ path: `${OUT}w5a_${name}.png` });
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
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
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
