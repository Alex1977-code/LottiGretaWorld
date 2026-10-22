// Welt 2, Level 2-3 „Scherenschnittkeller“ und 2-4 „Hügelmühle“: Laden ohne Konsolenfehler/-warnungen, Routen-Bot
// (Lotti und Greta von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel
// (Teleport in die Nähe + kurze Eingabefolge mit der echten Mechanik: Schattenstern, Rätselbox mit Druckfeld und
// Schattentreppe, Holz-Silhouette umwerfen, Kisten unter der Bühne, Kletterfels, Farbfeld, Riesenräder,
// Figurenschalter mit Heldinnen-Wechsel), weitere Mechanik-Prüfungen (Topfpflanze frisst Münzen durch die Gitter,
// Schattenweg unsichtbar aber fest und als Schatten an der Wand, unsichtbarer Block, Lauerblock, Hügelwalze schiebt,
// Kristalldeckel über der Röhre), Zeit bis zum Ziel < 180 s Spielzeit, Kennzahlen je Abschnitt (Zeichenaufrufe < 120
// inkl. Schattenpass, Dreiecke < 300 k) und Screenshots aus der Spielkamera (tests/out/w2lv_*.png).
// Aufruf (nach npm run build): PORT_BASE=5200 node tests/course_w2b.mjs [2-3|2-4]   (SHOTS_ONLY=1: nur Bilder)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), rennt, springt an
// festgelegten Stellen (Taste gehalten), wartet auf fahrende Plattformen (waitFor), fährt Röhren/Türen/Glasröhren und
// reitet die Stege der Riesenräder. Gegner bleiben aktiv; die Figur ist für die Routenfahrt unverwundbar (Abpraller
// zählen weiter), damit nur die Geometrie geprüft wird.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Wegpunkte [x, z]; jump = Halteschritte der Sprungtaste (40 ≈ volle Höhe); toNamed = fahrende Plattform (mover);
// waitFor = [{ id, x?, z?, y?, r }] warten, bis die benannten Plattformen dort sind; plank/toPlank/ridePlank = Stege
// eines Riesenrads (Winkelbereich in rad); door = in die Tür laufen; hero = Heldin wechseln (wie Pause → Figur).
const ROUTES = {
  '2-3': {
    start: [0, 1, 5],
    enemies: { wuschel: 11, lauerblock: 11, schnappblume: 3, riesenschnappblume: 1, feuer_schnappblume: 4, pilzling: 3 },
    main: [
      { name: 'Foyer', to: [2.4, -6] },
      { to: [8.6, -14] },
      { name: 'Durchgang', to: [6.4, -27.4] },
      { waitFor: [{ id: 'm1', x: 6, r: 1.2 }] },
      { name: 'Plattform 1', toNamed: 'm1', jump: 40, within: 0.7 },
      { waitFor: [{ id: 'm1', x: 1.6, r: 0.1 }, { id: 'm2', z: -36.6, r: 0.1 }], ride: true },
      { name: 'Plattform 2', toNamed: 'm2', jump: 40, within: 0.7 },
      { waitFor: [{ id: 'm2', z: -42.2, r: 0.3 }], ride: true },
      { name: 'Felsinsel', to: [2.2, -47.6], jump: 40 },
      { to: [2.2, -50], within: 0.25, run: false },
      { waitFor: [{ id: 'm3', y: 2.2, r: 0.05 }] },
      { name: 'Plattform 3', toNamed: 'm3', jump: 40, within: 0.7 },
      { name: 'Checkpoint-Sims', to: [2, -59.4], jump: 40 },
      { name: 'Checkpoint', to: [0, -63] },
      { name: 'Seitenbühne', to: [0, -84] },
      { name: 'Bühne', to: [0.6, -87.5] },
      { to: [9.4, -87.5] },
      { name: 'Schattenplatte A', to: [12.3, -87.5], jump: 40 },
      { name: 'Schattenplatte B', to: [15.9, -87.5], jump: 40 },
      { name: 'Schattenplatte C', to: [19.5, -87.5], jump: 40 },
      { name: 'Bühnenboden 2', to: [23.6, -87.5], jump: 40 },
      { to: [28.4, -87.5] },
      { name: 'über die Falltür', to: [32.6, -87.5], jump: 40 },
      { name: 'Schattenplatte D', to: [34, -87.5], jump: 40 },
      { name: 'Schattenplatte E', to: [37.3, -87.5], jump: 40 },
      { name: 'Schattenplatte F', to: [41.7, -87.5], jump: 40 },
      { name: 'Schattenplatte G', to: [45, -87.5], jump: 40 },
      { name: 'Bühnenboden 4', to: [47.4, -87.5], jump: 24 },
      { name: 'über die Schnappblume', to: [51.8, -87.5], jump: 40 },
      { to: [53.4, -87.5] },
      { name: 'Schattenstufe H', to: [55.6, -87.5], jump: 40 },
      { name: 'Schattenstufe I', to: [58.2, -87.5], jump: 40 },
      { name: 'Podest', to: [61, -87.5], jump: 40 },
      { name: 'zur Tür', to: [63.4, -88], within: 0.25, run: false },
      { name: 'Tür hinter die Kulissen', to: [63.4, -91], door: true, run: false },
      { name: 'Kulissen', to: [112, 92] },
      { name: 'Lauerblock-Gasse', to: [112, 73.4] },
      { waitFor: [{ id: 'm4', x: 112, r: 0.9 }] },
      { name: 'Fähre 1', toNamed: 'm4', jump: 40, within: 0.7 },
      { waitFor: [{ id: 'm4', x: 112, r: 0.3 }], ride: true },
      { name: 'Fähre 2', toNamed: 'm5', jump: 34, within: 0.7, run: false },
      { waitFor: [{ id: 'm5', x: 112, r: 0.4 }], ride: true },
      { name: 'Landung', to: [112, 59.4], jump: 34, run: false },
      { name: 'zur Ausgangstür', to: [112, 47], within: 0.25, run: false },
      { name: 'Ausgangstür', to: [112, 44], door: true, run: false },
      { name: 'Ausgang', to: [112, 32] },
      { to: [112, 28.4], jump: 30 },
      { name: 'Zielmast', to: [112, 21.7], jump: 40, within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0: Schattenstern über den Bühnenkisten', star: 0, from: [-3, 4.1, -16],
        legs: [{ to: [-0.6, -16], jump: 40, within: 0.3 }, { wait: 30 }], shot: 'stern0' },
      { name: 'Stern 1: Rätselbox, Druckfeld, Schattentreppe', star: 1, from: [117, 1, 90],
        legs: [{ to: [117, 92.4], jump: 30, within: 0.4 }, { wait: 30 }, { to: [260, 47] }, { to: [260, 33.6] },
          { name: 'Druckfeld', to: [255.6, 27.4], within: 0.3 }, { wait: 40 },
          { to: [258.6, 26.6], jump: 30, within: 0.3 }, { to: [261.2, 26.6], jump: 34, within: 0.3 },
          { to: [263.8, 26.6], jump: 34, within: 0.3 }, { to: [266.2, 26.6], jump: 40, within: 0.4 }, { wait: 30 }], shot: 'stern1' },
      { name: 'Stern 2: Holz-Silhouette umrennen, Krümel schenkt den Stern', star: 2, from: [107.6, 1, 51.8],
        legs: [{ to: [97.6, 51.6], within: 0.4 }, { wait: 150 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: Kisten unter der Bühne (Krallen-Anzug)', from: [28.2, -1.5, -87.5], power: 'krallen',
        legs: [{ to: [32.1, -87.5], within: 0.2, run: false }, { action: true }, { wait: 40 }, { action: true }, { wait: 60 },
          { action: true }, { wait: 40 }, { to: [34.7, -87.5], within: 0.3, run: false }, { wait: 20 }], shot: 'stempel' },
      { name: 'Stempel: Kisten unter der Bühne (Funkenblüte)', from: [28.2, -1.5, -87.5], power: 'funken',
        legs: [{ to: [30.4, -87.5], within: 0.2, run: false }, { face: [1, 0] }, { action: true }, { wait: 50 }, { action: true },
          { wait: 70 }, { action: true }, { wait: 50 }, { to: [34.7, -87.5], within: 0.3, run: false }, { wait: 20 }] },
    ],
    extra: [
      { name: 'Silhouette per Tatzenhieb (Krallen-Anzug)', from: [98.2, 1, 51.6], power: 'krallen', heroes: ['lotti'],
        legs: [{ face: [-1, 0] }, { action: true }, { wait: 150 }], check: 'silhouette' },
      { name: 'Topfpflanze tragen, sie frisst die Münzen im Käfig', from: [-2.75, 2.6, -64.4], heroes: ['lotti'],
        legs: [{ face: [-1, 0] }, { action: true }, { wait: 20 }, { to: [4.15, -67.4], within: 0.2, run: false }, { face: [1, 0] }, { wait: 240 }],
        check: 'pot' },
      { name: 'Schattenweg: unsichtbar, fest, Schatten an der Wand', from: [9.4, 2.6, -87.5], heroes: ['lotti'],
        legs: [{ to: [12.3, -87.5], jump: 40, within: 0.3 }, { wait: 10 }], check: 'shadowpath' },
      { name: 'Unsichtbarer Block (nur sein Schatten) gibt Münzen', from: [8, 2.6, -87.5], heroes: ['lotti'],
        legs: [{ hop: 22 }, { wait: 40 }], check: 'hiddenblock' },
      { name: 'Lauerblock stößt heraus, wenn man stehen bleibt', from: [112, 1, 90.8], heroes: ['lotti'],
        legs: [{ to: [111.4, 88], within: 0.2, run: false }, { wait: 90 }], check: 'lauer' },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['foyer', [2, 1, -9]],
      ['leinwand', [-3, 4.1, -16]],
      ['schlucht', [6.4, 1, -27.4]],
      ['insel', [2.2, 2.1, -47.6]],
      ['checkpoint', [0, 2.6, -62]],
      ['buehne', [3, 2.6, -87.5]],
      ['buehne_platten', [17, 4.9, -87.5]],
      ['riesenblume', [34, 5.1, -87.5]],
      ['unterbuehne', [28.2, -1.5, -87.5]],
      ['podest', [60.6, 7.1, -87.5]],
      ['kulissen', [112, 1, 91]],
      ['gasse', [112, 1, 82]],
      ['schacht', [112, 1, 73.4]],
      ['nische', [103.4, 1, 51.8]],
      ['ziel', [112, 1, 34]],
      ['raetselraum', [260, 1, 40]],
      ['raetselwand', [256, 1, 29]],
    ],
  },
  '2-4': {
    start: [0, 1, 5],
    enemies: { rollpilz: 10, huepfmaus: 6, huepfmaus_stachel: 6, pilzling: 5, kristallwand: 1 },
    main: [
      { name: 'Graswiese', to: [3, -6] },
      { to: [7, -13] },
      { name: 'Glasröhre rechts', to: [7, -17.6], within: 0.8 },
      { name: 'Wiese oben', to: [3, -31] },
      { name: 'Hügelwalze 1', to: [0, -40.4] },
      { to: [0, -44] },
      { name: 'Hügelwalze 2', to: [0, -53.6] },
      { to: [0, -57] },
      { name: 'Hügelwalze 3', to: [0, -67] },
      { name: 'Rollhügel', to: [-1, -84] },
      { name: 'Checkpoint', to: [-1.6, -100] },
      { name: 'Röhre hinab', to: [-1.6, -105.4], jump: 26, within: 0.3, run: false },
      { crouch: 4 },
      { name: 'Untergrund', to: [0, -249.4] },
      { name: 'Zahnrad 1', to: [0, -254], jump: 40, within: 0.4 },
      { to: [-1.0, -255.3], within: 0.3, run: false },
      { name: 'Zahnrad 2', to: [-4.5, -260], jump: 40, within: 0.4 },
      { to: [-3.5, -261.2], within: 0.3, run: false },
      { name: 'Zahnrad 3', to: [1, -266.5], jump: 40, within: 0.4 },
      { to: [0.8, -268.1], within: 0.3, run: false },
      { name: 'Stehendes Rad', to: [0, -272.6], jump: 40, within: 0.5 },
      { to: [0, -273.8], within: 0.3 },
      { name: 'Boden B', to: [0, -279.2], jump: 40 },
      { name: 'Radkante', to: [0, -303.7], within: 0.25, run: false },
      { plank: 'rad1', pick: [-0.28, -0.12] },
      { name: 'Riesenrad 1', toPlank: true, jump: 12, within: 0.6, run: false },
      { ridePlank: true, until: [2.8, 3.0] },
      { plank: 'rad2', pick: [-0.5, 0.0] },
      { name: 'Riesenrad 2', toPlank: true, jump: 26, within: 0.6, run: false },
      { ridePlank: true, until: [2.6, 2.8] },
      { name: 'Ausgang', to: [0, -325.4], jump: 40 },
      { name: 'Röhre zum Ziel', to: [0, -329.6], jump: 30, within: 0.3, run: false },
      { crouch: 4 },
      { name: 'Zielkuppe', to: [0, -392] },
      { name: 'Zielmast', to: [0, -400.3], jump: 40, within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0: Kletterfels mit dem Krallen-Anzug', star: 0, from: [0, 1.1, -19.6], power: 'krallen',
        legs: [{ to: [0, -21], within: 0.15, run: false }, { push: 200, jump: 12, dir: [0, -1] }, { to: [0, -23], within: 0.3 }, { wait: 30 }], shot: 'stern0' },
      { name: 'Stern 1: Kristalldeckel stampfen, Röhre, alle Farbfelder', star: 1, from: [1.8, -14, -290],
        legs: [{ to: [5, -290], jump: 34, within: 0.25, delay: 6 }, { to: [5, -290], within: 0.1, run: false, slow: 0.4 }, { wait: 40 },
          { stomp: true }, { wait: 40 },
          { to: [5, -290], jump: 26, within: 0.2, run: false }, { wait: 10 }, { crouch: 4 }, { wait: 30 },
          ...[-287.6, -289.6, -291.6, -293.6].flatMap((z, r) => [57, 59, 61, 63].map((x) => ({ to: [r % 2 ? 63 - (x - 57) : x, z], within: 0.4, run: false }))),
          { wait: 40 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: zwischen die Riesenräder fallen lassen', star: 2, from: [0, -14, -303.7],
        legs: [{ plank: 'rad1', pick: [-0.28, -0.12] }, { toPlank: true, jump: 12, within: 0.6, run: false }, { ridePlank: true, until: [2.95, 3.3] },
          { to: [0, -313.8], within: 0.4, run: false }, { wait: 90 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: Lotti- und Greta-Schalter (Heldin wechseln)', from: [-3, 1, 3],
        legs: [{ to: [-4.4, 0.2], within: 0.25, run: false }, { wait: 30 }, { to: [-8.6, 0.2], within: 0.25, run: false }, { wait: 30 },
          { hero: 'greta' }, { wait: 30 }, { to: [-6, -1.4], within: 0.3, run: false },
          { to: [-6, -3.2], jump: 26, within: 0.35 }, { to: [-6, -6], jump: 34, within: 0.35 }, { to: [-6, -8.8], jump: 40, within: 0.35 },
          { to: [-9.5, -7.5], jump: 40, within: 0.35 }, { wait: 20 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Figurenschalter: nur die richtige Heldin löst aus', from: [-3, 1, 3], heroes: ['lotti'],
        legs: [{ to: [-8.6, 0.2], within: 0.25, run: false }, { wait: 40 }], check: 'wrongHero' },
      { name: 'Hügelwalze schiebt die stehende Figur zurück', from: [0, 7.5, -36], heroes: ['lotti'],
        legs: [{ wait: 120 }], check: 'drum' },
      { name: 'Roter Ring: acht rote Münzen → Extraleben', from: [7, 9.1, -72.4], heroes: ['lotti'],
        legs: [{ to: [7, -74.4], within: 0.3, run: false }, { to: [7, -76.2], within: 0.4 },
          { to: [3, -79] }, { to: [-5, -76] }, { to: [-8, -70] }, { to: [-8, -82] }, { to: [-3, -82] }, { to: [1, -86] },
          { to: [6, -90] }, { to: [10, -84] }, { wait: 30 }], check: 'ring' },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['schalter', [-5, 1, 2]],
      ['klippe', [2, 1, -15]],
      ['wiese', [0, 6.1, -28]],
      ['walze', [0, 7.5, -33.6]],
      ['walze3', [0, 6.1, -57]],
      ['ring', [2, 6.1, -71]],
      ['checkpoint', [0, 6.1, -98]],
      ['untergrund', [0, -13.9, -236]],
      ['zahnraeder', [0, -13.9, -249]],
      ['kristall', [1.8, -13.9, -287]],
      ['raeder', [0, -13.9, -303]],
      ['sims', [0, -19.9, -313.6]],
      ['ausgang', [0, -13.9, -325]],
      ['ziel', [0, 10.1, -388]],
      ['farbraum', [60, -13.9, -284]],
    ],
  },
};

const PORT = 4300;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['2-3', '2-4'];
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
// PARTS=route,targets,extra,shots (Standard alle) – Teilläufe beim Bauen
const PARTS = new Set((process.env.PARTS ?? (SHOTS_ONLY ? 'shots' : 'route,targets,extra,shots')).split(','));

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const TAU = Math.PI * 2;
  const norm = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a <= -Math.PI) a += TAU; return a; };
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setHero(o.hero ?? 'lotti');
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
    /** Lage eines benannten Objekts (mover: pm.pos, sonst pos). */
    namedPos(id) { const m = c.level.named.get(id); return m?.pm?.pos ?? m?.pos ?? null; },
    /** Steg-Winkel eines Riesenrads (normiert auf (−π, π]). */
    plankAngle(id, i) { const h = c.level.named.get(id); return norm(h.angle + (i / h.planks.length) * TAU); },
    /**
     * Wegpunkte abfahren (Format siehe ROUTES). Liefert Protokoll, Sprünge (Landepunkt sichtbar?), Spur, Zeit.
     */
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      const jumps = [];
      const track = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      let rode = false;
      let plank = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (steps % 24 === 0 && p.mode !== 'script') track.push([p.pos.x, p.pos.y, p.pos.z]);
        if (p.mode === 'script' && c.level.runtime.status === 'play' && !p.dead) {
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
        if (L.wait) { for (let i = 0; i < L.wait; i++) tick({}); continue; }
        if (L.hero) { c.setHero(L.hero); tick({}); log.push(['heldin', p.hero]); continue; }
        if (L.face) { const st = this.stick(L.face[0], L.face[1], 0.3); for (let i = 0; i < 6; i++) tick(st); for (let i = 0; i < 12; i++) tick({}); continue; }
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
          for (let k = 0; k < 30; k++) tick({});
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (L.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === L.star, max: 900 });
          log.push(['stern', L.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (L.waitFor) {
          // warten, bis alle genannten Plattformen am Ort sind (ride: auf der Plattform stehen bleiben)
          let n = 0;
          const ok = () => L.waitFor.every((w) => {
            const q = this.namedPos(w.id);
            if (!q) return false;
            return (w.x === undefined || Math.abs(q.x - w.x) <= w.r) && (w.z === undefined || Math.abs(q.z - w.z) <= w.r) && (w.y === undefined || Math.abs(q.y - w.y) <= w.r);
          });
          while (!ok() && n++ < (L.max ?? 2400)) tick({});
          log.push(['warten', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (n >= (L.max ?? 2400)) { log.push(['FEHLER: Plattform kommt nicht', li]); break; }
          continue;
        }
        if (L.plank) {
          // auf einen Steg des Riesenrads warten, dessen Winkel im Bereich pick liegt
          const h = c.level.named.get(L.plank);
          let n = 0, idx = -1;
          for (; n < 2400; n++) {
            for (let i = 0; i < h.planks.length; i++) { const a = this.plankAngle(L.plank, i); if (a >= L.pick[0] && a <= L.pick[1]) { idx = i; break; } }
            if (idx >= 0) break;
            tick({});
          }
          plank = { id: L.plank, i: idx };
          log.push(['steg', L.plank, idx, n]);
          if (idx < 0) { log.push(['FEHLER: kein Steg', li]); break; }
          continue;
        }
        if (L.ridePlank) {
          // mitfahren (Mitte des Stegs halten), bis der Steg-Winkel im Bereich until liegt
          const b = c.level.named.get(plank.id).planks[plank.i];
          let n = 0;
          for (; n < 2400; n++) {
            const a = this.plankAngle(plank.id, plank.i);
            if (a >= L.until[0] && a <= L.until[1]) break;
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.45 ? { ...this.stick(dx, dz, Math.min(0.5, d)), run: false } : {});
          }
          log.push(['mitfahren', plank.id, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
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
          for (let k = 0; k < L.push; k++) {
            const d = L.dir ? this.stick(L.dir[0], L.dir[1]) : L.to ? this.stick(L.to[0] - p.pos.x, L.to[1] - p.pos.z) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([L.name ?? `push${li}`, L.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        let best = Infinity, still = 0, auto = 0, j0 = L.jumpAt ? null : 0;
        const target = () => {
          if (L.toNamed) { const q = this.namedPos(L.toNamed); if (q) return [q.x + (L.off?.[0] ?? 0), q.z + (L.off?.[1] ?? 0)]; }
          if (L.toPlank) { const b = c.level.named.get(plank.id).planks[plank.i]; return [b.pos.x, b.pos.z]; }
          return L.to;
        };
        for (; i < max; i++) {
          if (p.dead || c.level.runtime.status !== 'play') break;
          if (rode && L.endOnRide !== false) break;
          const T = target();
          const dx = T[0] - p.pos.x, dz = T[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && L.autoJump !== false && !L.door) { auto = 26; still = 0; autoJumps++; }
          const done = !L.door && dist < within && (!holdJ || L.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = L.slow ?? 1;
          let st;
          if (L.delay && i < L.delay) {
            st = { x: 0, y: 0 };
          } else if (p.mode === 'air' && holdJ && j0 !== null) {
            const k = 2.6, vmax = 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ && !L.door) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
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
    /** Ist der Landepunkt (x, z) aus der Spielkamera sichtbar? (wie tests/course_w1a.mjs) */
    landingVisible(x, z) {
      const p = P(), rig = c.view.rig;
      const r = rig.railAt(p.pos.x, p.pos.z, {});
      const D = Math.PI / 180, yaw = r.yaw * D, pitch = r.pitch * D;
      const tx = p.pos.x - Math.sin(yaw) * r.ahead, ty = p.pos.y + r.height, tz = p.pos.z - Math.cos(yaw) * r.ahead;
      const cam = { x: tx + Math.sin(yaw) * Math.cos(pitch) * r.dist, y: ty + Math.sin(pitch) * r.dist, z: tz + Math.cos(yaw) * Math.cos(pitch) * r.dist };
      const g = c.world.raycastDown(x, p.pos.y + 14, z, 40);
      const land = { x, y: (g ? g.y : p.pos.y) + 1.0, z };
      const hit = c.world.raycast(cam, land);
      return !hit || hit.t > 0.97 || !!hit.shape?.camIgnore;
    },
    /** Lenkt auf eine Entität zu (erschienene Sterne holen), bis keine passende mehr lebt. */
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || c.level.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of c.level.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz, Math.min(1, Math.max(0.3, dist)));
        const dy = e.pos.y - p.pos.y;
        const jump = ((n % 48) < 20 && dist < 1.2) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...st, run: dist > 2.5, jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => c.level.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of c.level.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    /** Mechanik-Prüfungen nach einer Eingabefolge (extra[].check). */
    probe(name) {
      const L = c.level, p = P();
      const ents = (k) => L.entities.filter((e) => e.kind === k);
      switch (name) {
        case 'silhouette': { const s = L.named.get('baron'); const st = ents('star').some((e) => e.index === 2 && !e.hidden); return { ok: s?.state === 'down' && st, state: s?.state, star: st }; }
        case 'pot': { const pot = ents('topfpflanze')[0]; return { ok: (pot?.bites ?? 0) >= 0 && L.runtime.info().coins >= 4 && p.holding === pot, coins: L.runtime.info().coins, holding: !!p.holding }; }
        case 'shadowpath': {
          const w = L.named.get('sw_buehne');
          const sh = L.world.raycastDown(p.pos.x, p.pos.y + 1, p.pos.z, 3);
          return { ok: p.mode === 'ground' && Math.abs(p.pos.y - 3.5) < 0.05 && sh?.shape?.tag === 'schattenweg' && (w?.counts?.box ?? 0) >= 10 && w.count > 0, y: +p.pos.y.toFixed(2), tag: sh?.shape?.tag, shadows: w?.count, boxes: w?.counts?.box };
        }
        case 'hiddenblock': { const coins = L.runtime.info().coins; return { ok: coins >= 1, coins }; }
        case 'lauer': { const lb = ents('lauerblock').find((e) => Math.abs(e.wall.z - 88) < 0.1); return { ok: (lb?.pushes ?? 0) >= 1 && p.pos.x > 111.5, pushes: lb?.pushes, x: +p.pos.x.toFixed(2) }; }
        case 'wrongHero': { const lotti = L.named.get('weg_lotti'), greta = L.named.get('weg_greta'), fs = L.named.get('fs_greta'); return { ok: !greta.want && fs.wrongCount >= 1 && !fs.done, wrong: fs.wrongCount, greta: greta.want, lotti: lotti.want }; }
        case 'drum': return { ok: p.pos.z > -35.6 || p.pos.y < 6.2, z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2) };
        case 'ring': { const r = L.named.get('ring'); return { ok: r?.state === 'done', state: r?.state, got: r?.got, lives: L.runtime.info().lives }; }
        default: return { ok: false };
      }
    },
  };
  window.__w2b = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w2b[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 30000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w2lv_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, stars: d.stars?.length ?? 0, stamp: !!d.stamp, goal: !!d.goal, cps: [d.checkpoint].flat().length }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“ (${meta.theme}, ${meta.music}), Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Stempel und Zielmast vorhanden`, meta.stamp && meta.goal);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of PARTS.has('route') ? (process.env.HERO ? [process.env.HERO] : ['lotti', 'greta']) : []) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Münzen ${res.rt.coins}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
    }
    check(`${id}: ${hero} Zeit bis zum Ziel < 180 s (${res.time.toFixed(1)} s)`, reached && res.time < 180);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of PARTS.has('targets') ? R.targets : []) {
    for (const hero of t.heroes ?? ['lotti']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      const ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Mechanik
  for (const t of PARTS.has('extra') ? R.extra ?? [] : []) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const pr = await W('probe', t.check);
      if (!pr.ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}) ${JSON.stringify(pr)}`, !!pr.ok);
    }
  }

  // ------------------------------------------------ Screenshots je Abschnitt aus der Spielkamera
  loaded = null;
  if (PARTS.has('shots')) await load(id);
  for (const [name, pos, steps = 0, input = null] of PARTS.has('shots') ? R.shots : []) {
    await W('place', pos, { settle: 10 });
    await sc(() => { window.__course.player.invuln = 0; });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.setInput(inp); c.step(n); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(24)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
if (stats.length) {
  const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
