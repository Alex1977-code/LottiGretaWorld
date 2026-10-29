// Kurs-Modus, Bonuswelten: Remix-Technik (level/remix.js) und Motor/Bausteine/Themen der Bonuswelt Stern (Sternenwerkstatt
// 0-34) – deterministisch über window.__course.step(n) und setInput, je Regel bzw. Mechanik mit Gegenprobe, Sichtprüfung über
// Bilder tests/out/sb_*.png, Kennzahlen (Zeichenaufrufe inkl. Schattenpass, Dreiecke), keine Konsolenfehler.
//   remix   Remix-Beispiele 0-R1 (Nacht-Remix von 1-1) und 0-R2 (Ausschnitt von 2-4 mit Zeitdruck): Platzhalter/Registry,
//           Basis unverändert (Gegenprobe), Änderungen der Basis wirken mit, replaceKind (Daten und Laufzeit-spawn), remove,
//           change, Sterne neu, Stempel aus, Zeitlimit + Zeit-Uhren (ohne Uhr Zeitablauf, mit Uhr länger), Abschnitt kürzen
//           (keep, Basis-Haken gefiltert), Licht-Varianten (nacht/abend/morgen/tag/dunkel), Schwarz-Weiß-Filter, Musik-Variante
//           (music.play(thema, { variant })), Piep-Tempo (beepSpeed/beepWarn), replace/replaceType/move/in: 'deco'
//   mech    jede Stern-Mechanik in 0-34 mit Gegenprobe
//   themes  zehn Stern-Themen (?theme=) mit Bildern
// Aufruf: node tests/course_star_blocks.mjs   (Port 4900 + PORT_BASE; vorher npm run build; nutzt vite preview)
// SB_PART=remix|mech|themes → nur ein Teil; SB_SHOTS=0 → ohne Bilder; SB_DEBUG=1 → mehr Ausgaben.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4900;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SHOTS = process.env.SB_SHOTS !== '0';
const PART = process.env.SB_PART ?? 'all';
const DEBUG = !!process.env.SB_DEBUG;
const want = (p) => PART === 'all' || PART === p;

// Musik-Aufrufe mitschneiden (music.play(name, opts)): window.__audio wird in main.js gesetzt → Setter umhüllt play
await page.addInitScript(() => {
  let a;
  Object.defineProperty(window, '__audio', {
    configurable: true,
    get() { return a; },
    set(v) {
      a = v;
      const m = v?.music;
      if (m && !m.__spy) { const orig = m.play.bind(m); m.__calls = []; m.play = (n, o) => { m.__calls.push([n, o ?? null]); return orig(n, o); }; m.__spy = true; }
    },
  });
});

async function load(id, extra = '') {
  await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log(`Level ${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    const P = () => c.player;
    const L = () => c.level;
    window.__t = {
      marks: c.level.data.marks,
      tick(n = 1) { for (let i = 0; i < n; i++) c.step(1); },
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        p.setHero(o.hero ?? 'lotti');
        p.dead = false;
        p.big = o.big ?? true;
        p.power = o.power ?? 'none';
        p.powerTime = o.power ? 99 : 0;
        if (p.helmet && !o.keepHelmet) { p.helmet = null; p.helmetFx = null; }
        p.holding = null;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.skidTurnTime = 0;
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        window.__t.tick(o.settle ?? 30);
        return p.info();
      },
      until(cond, n = 1200) { for (let i = 0; i < n; i++) { if (cond()) return i; c.step(1); } return cond() ? n : -1; },
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      kinds() { const k = {}; for (const e of L().entities) if (!e.removed) k[e.kind] = (k[e.kind] ?? 0) + 1; return k; },
      hurt: () => { const p = P(); return p.dead || !p.big || p.invuln > 0.05; },
      hs: () => Math.hypot(P().vel.x, P().vel.z),
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const stats = [];
async function freshFrames(n = 3, timeout = 30000) {
  const f0 = await sc(() => window.__course?.view?.frame ?? 0);
  try { await page.waitForFunction((f) => (window.__course?.view?.frame ?? 1e9) >= f, f0 + n, { timeout }); } catch { /* weiter */ }
}
async function shot(name, wait = 1500) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  await freshFrames();
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  if (DEBUG) console.log('  [Bild]', name, s.calls, s.triangles);
  try { await page.screenshot({ path: `${OUT}sb_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}
function budget(from, label) {
  const ss = stats.slice(from);
  for (const s of ss) console.log(`    ${s[0].padEnd(30)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  if (ss.length) check(`${label}: < 120 Zeichenaufrufe (inkl. Schattenpass), < 300 k Dreiecke in allen Bildern`, ss.every((s) => s[1] < 120 && s[2] < 300000));
}

// =====================================================================================================================
// Remix
// =====================================================================================================================
if (want('remix')) {
  console.log('Remix-Technik');
  const e0 = errors.length, s0 = stats.length;
  await load('0-R1');
  {
    const r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t, CL = window.__courseLevels;
      const base = CL.get('1-1'), raw = CL.raw('0-R1');
      const k = t.kinds();
      const pz = base.enemies.filter((e) => e.kind === 'pilzling').length;
      const q = L.data.blocks.find((b) => b.kind === 'question' && b.pos[0] === -4 && b.pos[2] === -11.6);
      const qb = base.blocks.find((b) => b.kind === 'question' && b.pos[0] === -4 && b.pos[2] === -11.6);
      const st = L.entities.filter((e) => e.kind === 'star').map((e) => [e.pos.x, e.pos.y, e.pos.z]);
      const sp = L.spawn('pilzling', { pos: [3, 1, 2] });
      const spKind = sp?.kind;
      if (sp) { sp.removed = true; sp.alive = false; }
      const calls = window.__audio.music.__calls ?? [];
      return {
        stub: CL.isRemix(raw) && raw.remix.base === '1-1' && !raw.segments, remix: L.data.remix, theme: L.data.theme, light: c.view.theme.light,
        hemi: c.view.theme.hemi.intensity, pl: !!c.view.theme.playerLight, starsSky: !!c.view.sky.lightStars, moon: !!c.view.sky.lightMoon,
        pilz: k.pilzling ?? 0, maus: k.huepfmaus ?? 0, pz, bunny: k.bunny ?? 0, tree: k.itemtree ?? 0, stamp: k.stamp ?? 0, spKind,
        q: q?.content, qb: qb?.content, stars: st, music: L.data.music, variant: L.data.musicVariant,
        call: calls.filter((x) => x[0] === 'course_grass').slice(-1)[0] ?? null,
        baseTheme: base.theme, baseBunny: base.items.filter((i) => i.kind === 'bunny').length, baseStamp: !!base.stamp, baseRemix: base.remix ?? null,
        baseVariant: base.musicVariant ?? null, baseTitle: base.title, title: L.data.title, timeLimit: L.runtime.timeLimit,
      };
    });
    if (DEBUG) console.log(JSON.stringify(r));
    console.log(`  0-R1: Thema ${r.theme} (${r.light}, Himmelslicht ${r.hemi}, Figurenlicht ${r.pl}, Sterne ${r.starsSky}, Mond ${r.moon}); Pilzlinge ${r.pilz} → Hüpfmäuse ${r.maus} (Basis ${r.pz}); Laufzeit-spawn pilzling → ${r.spKind}; Musik ${JSON.stringify(r.call)}`);
    check('Remix-Platzhalter: remixOf liefert { id, world, title, remix } ohne Daten; die Registry löst ihn auf (Basis 1-1)', r.stub && r.remix?.base === '1-1' && r.title === 'Kraxelwiese bei Mondschein');
    check('Remix: Nacht-Beleuchtung (Thema grass@nacht: dunkles Himmelslicht, Mond, Sterne, Figurenlicht)', r.theme === 'grass@nacht' && r.light === 'nacht' && r.hemi < 0.8 && r.pl && r.starsSky && r.moon);
    check('Remix: replaceKind pilzling → huepfmaus (alle Pilzlinge der Basis, auch Laufzeit-spawns)', r.pilz === 0 && r.maus === r.pz + 0 && r.pz >= 5 && r.spKind === 'huepfmaus');
    check('Remix: remove (Hasen, Item-Baum), change (?-Block gibt Funkenblüte), Sterne neu (3), Stempel aus', r.bunny === 0 && r.tree === 0 && r.q === 'funkenbluete' && r.stars.length === 3 && r.stars.some((s) => s[1] > 13) && r.stamp === 0);
    check('Remix: Musik des Basislevels mit Klang-Variante → music.play(\'course_grass\', { variant: \'nacht\' })', r.music === 'course_grass' && r.variant === 'nacht' && r.call?.[1]?.variant === 'nacht');
    check('Gegenprobe Basis 1-1 unverändert (Thema grass, Hasen, Stempel, Krallen-?-Block, ohne Variante/Remix-Feld)', r.baseTheme === 'grass' && r.baseBunny >= 2 && r.baseStamp && r.qb === 'krallenAnzug' && r.baseVariant === null && r.baseRemix === null && r.baseTitle === 'Kraxelwiese');
    // Änderung der Basis wirkt im Remix mit (Daten-Ebene), die Regeln gelten auch für das Neue
    const prop = await sc(() => {
      const CL = window.__courseLevels, raw1 = CL.raw('1-1'), rawR = CL.raw('0-R1');
      raw1.enemies.push({ kind: 'pilzling', id: 'remix_probe', pos: [1, 1, -2] });
      CL.refreshRemix(rawR);
      const e = CL.get('0-R1').enemies.find((x) => x.id === 'remix_probe');
      raw1.enemies.pop();
      CL.refreshRemix(rawR);
      const gone = !CL.get('0-R1').enemies.some((x) => x.id === 'remix_probe');
      return { kind: e?.kind ?? null, gone, baseKind: raw1.enemies.some((x) => x.id === 'remix_probe') };
    });
    check('Remix: Änderung am Basislevel wirkt mit (neuer Pilzling der Basis erscheint im Remix – als Hüpfmaus), danach wieder weg', prop.kind === 'huepfmaus' && prop.gone && !prop.baseKind);
    // Zeit-Uhr: +10 s; Gegenprobe 3 m daneben nichts
    const clk = await sc(() => {
      const t = window.__t, L = window.__course.level;
      t.place([3, 1.2, -2], { settle: 2 });
      const a = L.runtime.timeLeft;
      t.tick(30);
      const b = L.runtime.timeLeft;
      t.place([0, 1.2, -2], { settle: 2 });
      t.tick(2);
      const c2 = L.runtime.timeLeft;
      return { near: +(b - a).toFixed(2), got: +(c2 - b).toFixed(2), n: t.named('uhren').got };
    });
    console.log(`  Zeit-Uhr: daneben ${clk.near} s, berührt +${clk.got} s (${clk.n})`);
    check('Zeit-Uhr: Berühren gibt +10 s Restzeit (Gegenprobe 3 m daneben: nur die Zeit läuft)', clk.near < 0 && clk.got > 9 && clk.n === 1);
    await T('place', [0, 1, 3], { settle: 30 });
    await shot('remix_nacht', 1600);
    await T('place', [0, 7, -102], { settle: 30 });
    await shot('remix_nacht_mitte', 1200);
  }
  // ---------------- 0-R2: Ausschnitt mit Zeitdruck
  await load('0-R2');
  {
    const r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t, CL = window.__courseLevels;
      const base = CL.get('2-4');
      const k = t.kinds();
      let deep = 0, far = 0;
      L.world.forEach((s) => { if (s.kill) return; if (s.top < -6) deep++; if (s.z0 < -125) far++; });
      const outside = L.entities.filter((e) => !e.removed && (e.pos.z < -112 || e.pos.z > -20)).map((e) => e.kind);
      return {
        remix: L.data.remix, theme: L.data.theme, variant: L.data.musicVariant, time: L.runtime.timeLeft, limit: L.runtime.timeLimit,
        maus: k.huepfmaus ?? 0, stachel: k.huepfmaus_stachel ?? 0, cp: k.checkpoint ?? 0, goalZ: L.entities.find((e) => e.kind === 'goal')?.pos.z,
        pipe: !!L.named.get('p_hinab'), deep, far, outside, under: L.world.raycastDown(0, -8, -250, 30),
        baseDeep: base.segments.some((s) => Array.isArray(s.pos) && s.pos[1] <= -14), baseMaus: base.enemies.filter((e) => e.kind === 'huepfmaus').length,
        baseCp: !!base.checkpoint, baseLimit: base.timeLimit, baseBuild: typeof base.build,
      };
    });
    if (DEBUG) console.log(JSON.stringify(r));
    console.log(`  0-R2: ${r.remix.cut} Objekte weggeschnitten, ${r.remix.kept} bleiben; Formen unten ${r.deep}, hinten ${r.far}; Entitäten außerhalb ${r.outside.length}; Hüpfmäuse ${r.maus}/${r.stachel}; Zeit ${r.limit} s`);
    check('Remix keep: nur der Rollhügel bleibt (Untergrund-Formen, ferne Formen und Entitäten außerhalb entfallen – auch aus dem Basis-Haken)', r.remix.cut > 20 && r.deep === 0 && r.far === 0 && r.outside.length === 0 && !r.under && !r.pipe);
    check('Gegenprobe Basis 2-4: Untergrund, Hüpfmäuse, Checkpoint, 500 s und Aufbau-Haken unverändert', r.baseDeep && r.baseMaus >= 5 && r.baseCp && r.baseLimit === 500 && r.baseBuild === 'function');
    check('Remix: replaceKind huepfmaus → huepfmaus_stachel, kein Checkpoint, neues Ziel, Abendrot, Variante schnell', r.maus === 0 && r.stachel >= 3 && r.cp === 0 && Math.abs(r.goalZ + 104) < 0.01 && r.theme === 'grass@abend' && r.variant === 'schnell');
    // Zeitdruck: ohne Uhr läuft die Zeit nach 30 s ab, eine Uhr verlängert um 8 s
    const tp = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, p = c.player;
      t.place([6, 6, -28], { settle: 2, invuln: 999 });
      const t0 = L.runtime.timeLeft;
      t.tick(120 * 25);
      const alive25 = !p.dead;
      p.pos.set(0, 6.2, -34); p.vel.set(0, 0, 0);
      t.tick(3);
      const after = L.runtime.timeLeft;
      t.tick(120 * 8);
      const alive33 = !p.dead;
      const n = t.until(() => p.dead, 120 * 6);
      return { t0: +t0.toFixed(1), alive25, gain: +(after - (t0 - 25)).toFixed(1), alive33, died: n >= 0, cause: p.deathCause };
    });
    console.log(`  Zeitdruck: Start ${tp.t0} s, nach 25 s lebt ${tp.alive25}, Uhr +${tp.gain} s, nach 33 s lebt ${tp.alive33}, dann ${tp.cause}`);
    check('Remix timeLimit 30 + Zeit-Uhren: ohne Uhr wäre die Zeit nach 30 s um, mit Uhr (+8 s) lebt die Figur bei 33 s, danach Zeitablauf', tp.t0 <= 30 && tp.alive25 && tp.gain >= 7.5 && tp.alive33 && tp.died && tp.cause === 'time');
    await load('0-R2');
    await T('place', [0, 6, -28], { settle: 30 });
    await shot('remix_abend', 1500);
    // Schwarz-Weiß-Filter (CSS über der 3D-Leinwand, endet mit der Szene)
    const bw = await sc(() => {
      const c = window.__course, CL = window.__courseLevels;
      const before = c.view.canvas.style.filter;
      const ok = CL.applyFilter(c.level, c, 'schwarzweiss');
      return { before, ok, after: c.view.canvas.style.filter };
    });
    await shot('remix_schwarzweiss', 900);
    // Phaser startet dieselbe Szene neu (gleiches Objekt) → auf ein neues Level-Objekt warten
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course?.level && window.__course.level !== window.__oldLevel, null, { timeout: 60000 });
    const bw2 = await sc(() => window.__course.view.canvas.style.filter);
    check('Remix filter schwarzweiss: Graustufen-Filter über der 3D-Ansicht, beim Szenenende wieder aus (Gegenprobe vorher/nachher ohne)', !bw.before && bw.ok && bw.after.includes('grayscale') && !bw2);
  }
  // ---------------- Regeln nur auf Daten-Ebene (Remix zur Laufzeit auflösen)
  {
    const r = await sc(() => {
      const CL = window.__courseLevels;
      const R = (base, rules) => CL.resolveRemix(CL.remixOf(base, rules));
      const b43 = CL.get('4-3');
      const piepB = b43.segments.filter((s) => /^piep_/.test(s.type));
      const p = R('4-3', { id: 'tp', beepSpeed: 4, beepWarn: false });
      const piep = p.segments.filter((s) => /^piep_/.test(s.type));
      const b11 = CL.get('1-1');
      const nBridge = b11.segments.filter((s) => s.type === 'bridge').length;
      const nTree = b11.segments.filter((s) => s.type === 'deco').reduce((a, s) => a + s.items.filter((i) => i.kind === 'tree').length, 0);
      const x = R('1-1', {
        id: 'tx', replaceType: { bridge: { type: 'bridge', width: 1.2 } },
        replace: [{ match: { kind: 'crate' }, with: { kind: 'brick', content: 'coins:2' } }, { match: { kind: 'schnappblume' }, with: (e) => [e, { ...e, pos: [e.pos[0] - 2, e.pos[1], e.pos[2]] }] }],
        change: [{ match: { kind: 'krallen_pilzling' }, move: [0, 0, -1] }],
        remove: [{ in: 'deco', kind: 'tree' }, { box: [80, -5, -130, 110, 20, -100] }],
        filter: 'schwarzweiss', light: 'dunkel', stars: { 1: null },
      });
      const lights = ['nacht', 'abend', 'morgen', 'tag', 'dunkel'].map((l) => R('1-1', { id: `tl_${l}`, light: l }).theme);
      const space = R('2-2', { id: 'ts', light: 'tag' }).theme;
      return {
        piep: piep.map((s) => `${s.every}/${s.warn}`), piepB: piepB.map((s) => `${s.every ?? '-'}/${s.warn ?? '-'}`), beep: p.beepSpeed,
        bridges: x.segments.filter((s) => s.type === 'bridge' && s.width === 1.2).length, nBridge,
        crates: x.items.filter((i) => i.kind === 'crate').length, bricks: x.items.filter((i) => i.kind === 'brick' && i.content === 'coins:2').length,
        blumen: x.enemies.filter((e) => e.kind === 'schnappblume').length,
        kp: x.enemies.filter((e) => e.kind === 'krallen_pilzling').map((e) => e.pos[2]), kpB: b11.enemies.filter((e) => e.kind === 'krallen_pilzling').map((e) => e.pos[2]),
        trees: x.segments.filter((s) => s.type === 'deco').reduce((a, s) => a + s.items.filter((i) => i.kind === 'tree').length, 0), nTree,
        room: x.items.filter((i) => Array.isArray(i.pos) && i.pos[0] > 80).length + x.segments.filter((s) => Array.isArray(s.pos) && s.pos[0] > 80).length,
        theme: x.theme, filter: x.filter, stars: x.stars.length, lights, space,
      };
    });
    if (DEBUG) console.log(JSON.stringify(r));
    console.log(`  Piep-Blöcke: Basis ${r.piepB.slice(0, 4).join(' ')} → Remix ${r.piep.slice(0, 4).join(' ')}; Licht-Varianten ${r.lights.join(', ')}; Weltraum am Tag ${r.space}`);
    check('Remix beepSpeed 4 / beepWarn false: alle Piep-Blöcke wechseln alle 2 Zählzeiten ohne Vorwarnung (Gegenprobe Basis 4-3 unverändert)', r.piep.length >= 3 && r.piep.every((x) => x === '2/0') && r.piepB.every((x) => x !== '2/0') && r.beep === 4);
    check('Remix replaceType/replace (Objekt und Funktion)/change move/remove in deco und per Bereich, Stern je Index entfernen', r.bridges === r.nBridge && r.nBridge > 0 && r.crates === 0 && r.bricks === 3 && r.blumen === 2
      && r.kp.every((z, i) => Math.abs(z - (r.kpB[i] - 1)) < 1e-6) && r.trees === 0 && r.nTree > 3 && r.room === 0 && r.stars === 1);
    check('Remix Licht/Filter: Themen-Varianten grass@nacht|abend|morgen|tag|dunkel, schwarzweiss (+sw), Weltraum am Tag (space@tag)', r.lights.join() === 'grass@nacht,grass@abend,grass@morgen,grass@tag,grass@dunkel' && r.theme === 'grass@dunkel+sw' && r.filter === 'schwarzweiss' && r.space === 'space@tag');
  }
  // Licht-Varianten ansehen (?theme=<thema>@<licht>)
  if (SHOTS) {
    for (const [th, mark] of [['grass@morgen', [0, 6, -28]], ['grass@dunkel', [0, 6, -28]], ['space@tag', null]]) {
      await load(mark ? '0-R2' : '2-2', `&theme=${th}`);
      const ok = await sc((n) => window.__course.view.theme.label?.includes('(') && window.__course.level.data.theme === n, th);
      if (mark) await T('place', mark, { settle: 20 });
      await shot(`remix_licht_${th.replace('@', '_')}`, 1500);
      if (!ok) console.log(`   Thema ${th} nicht gesetzt`);
    }
  }
  budget(s0, 'Remix-Bilder');
  check('Remix: keine Konsolenfehler', errors.length === e0);
  if (errors.length > e0) for (const e of errors.slice(e0, e0 + 10)) console.log('   ', e);
}

// =====================================================================================================================
// Mechaniken der Welt Stern (Sternenwerkstatt 0-34)
// =====================================================================================================================
if (want('mech')) {
  console.log('Sternenwerkstatt 0-34');
  const e0 = errors.length, s0 = stats.length;
  // frischer Spielstand ohne Kostüme (Sternenglanz-Gegenprobe)
  await page.goto(`http://localhost:${port}/?course=0-34&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
  await sc(() => { try { const k = 'lotti-greta-course-v1'; const d = JSON.parse(localStorage.getItem(k) ?? 'null'); if (d) { delete d.outfits; localStorage.setItem(k, JSON.stringify(d)); } } catch { /* leer */ } });
  await load('0-34');
  const marks = await sc(() => window.__t.marks);
  {
    const st = await sc(() => ({ kinds: Object.keys(window.__t.kinds()).sort(), named: [...window.__course.level.named.keys()] }));
    const ids = ['uhren', 'glanz_signal', 'dreh', 'boostbahn', 'farb', 'wand', 'treppe', 'walze', 'raum', 'schein', 'flugmast', 'turm', 'turm2', 'fels', 'felswand', 'oben', 'waben', 'nebelboden', 'nebel', 'brett', 'brett:B', 'kugeln', 'diorama', 'glanz'];
    const miss = ids.filter((id) => !st.named.includes(id));
    check('Sternenwerkstatt geladen, alle Stern-Bausteine benannt (level.named), Entitäten fliegender_zielmast/scheinziel/felsblock/riesen_frageturm/kickbombe', miss.length === 0
      && ['fliegender_zielmast', 'scheinziel', 'felsblock', 'riesen_frageturm', 'kickbombe', 'druckknopf'].every((k) => st.kinds.includes(k)));
    if (miss.length) console.log('   fehlen:', miss.join(', '));
    const deco = await sc(() => { const n = {}; window.__course.level.world.forEach((s) => { if (String(s.tag).startsWith('deco_star:')) n[s.tag] = (n[s.tag] ?? 0) + 1; }); return n; });
    check('Kulisse deco_star: alle Arten gebaut, solid-Arten mit Kollision (Rakete, Holzkiste, Riesenpilz, Riesenblock, Röhre)', ['rakete', 'holzkiste', 'riesenpilz', 'riesenblock', 'roehre_deko'].every((k) => deco[`deco_star:${k}`] === 1));
    check('Keine Konsolenfehler beim Laden', errors.length === e0);
    if (errors.length > e0) for (const e of errors.slice(e0, e0 + 8)) console.log('   ', e);
  }
  // ---------------------------------------------------------------- Zeit-Uhren, Sternenglanz, Hüllen als kind
  {
    const r = await sc(async () => {
      const t = window.__t, c = window.__course, L = c.level;
      t.place([0, 0, 2], { settle: 2 });
      const tl0 = L.runtime.timeLeft;
      t.place([4, 0.7, -2], { settle: 3 });
      const gain = L.runtime.timeLeft - tl0;
      const g = t.named('glanz_signal');
      const before = !!JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').outfits?.stern_probe;
      L.signal('sternenglanz');
      const after = !!JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').outfits?.stern_probe;
      const kinds = ['drehplatte', 'farbplatten', 'plattenwand', 'schienenwalze', 'walzenraum', 'waben', 'nebelplattform', 'schienenbrett', 'kanonenkugel_wand', 'drehdiorama', 'zeituhren'];
      const spawned = kinds.map((k, i) => {
        const spec = { id: `huelle_${k}`, pos: [40 + i * 8, 0, -20] };
        if (k === 'schienenwalze') spec.path = [[40 + i * 8, 0, -20], [40 + i * 8, 0, -30]];
        if (k === 'schienenbrett') { spec.nodes = { A: [40 + i * 8, 0, -20], B: [40 + i * 8, 0, -30] }; spec.rails = [['A', 'B']]; }
        if (k === 'zeituhren') spec.list = [[40 + i * 8, 1, -20]];
        return L.spawn(k, spec);
      });
      await new Promise((res) => setTimeout(res, 0));
      t.tick(2);
      const ok = kinds.filter((k) => { const h = L.named.get(`huelle_${k}`); return h && typeof h.info === 'function' && h.kind !== undefined; });
      return { gain: +gain.toFixed(1), before, after, fired: g.fired, kinds: spawned.map((e) => e?.kind), ok };
    });
    console.log(`  Zeit-Uhr +${r.gain} s; Sternenglanz (Signal): vorher ${r.before}, nachher ${r.after}; Hüllen ${r.ok.length}/${r.kinds.length}`);
    check('Zeit-Uhren (zeituhren): +10 s', r.gain > 9);
    check('Sternenglanz: Signal schaltet das Kostüm im Spielstand frei (courseSave.data.outfits, Gegenprobe vorher nicht)', !r.before && r.after && r.fired);
    check('Hüllen: alle Stern-Bausteine auch als kind (named liefert den Griff des Bausteins)', r.ok.length === r.kinds.length);
  }
  await T('place', marks.start, { settle: 30 });
  await shot('start', 1200);

  // ---------------------------------------------------------------- Drehplatten
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, d = t.named('dreh');
      t.place([0, 0.05, -15.3], { settle: 2 });
      const plate = d.plates.find((q) => Math.abs(q.x) < 0.1 && Math.abs(q.z + 15.3) < 0.1);
      const other = d.plates.find((q) => q.x > 2 && Math.abs(q.z + 15.3) < 0.1);
      const s0 = plate.state;
      t.tick(30);
      const warn = plate.state, yWarn = +p.pos.y.toFixed(2);
      t.tick(60);
      const tilted = plate.state, k = +plate.k.toFixed(2);
      t.tick(60);
      const fell = p.pos.y < -1.5, otherState = other.state;
      t.place(window.__t.marks.dreh, { settle: 2 });
      t.tick(200);
      return { s0, warn, yWarn, tilted, k, fell, otherState, back: plate.state, solid: plate.id !== null, tilts: d.tilts };
    });
    console.log(`  Drehplatte: ${r.s0} → ${r.warn} (y ${r.yWarn}) → ${r.tilted} (k ${r.k}), Figur fällt ${r.fell}; Nachbarplatte ${r.otherState}; später ${r.back} (fest ${r.solid})`);
    check('Drehplatte: Betreten → Vorwarnung, dann kippt sie und die Figur fällt; Gegenprobe Nachbarplatte ohne Figur bleibt ruhig; danach dreht sie zurück und ist wieder fest', r.s0 === 'warn' || r.s0 === 'ruhe'
      ? r.warn === 'warn' && r.yWarn > -0.1 && (r.tilted === 'kippt' || r.tilted === 'haengt') && r.fell && r.otherState === 'ruhe' && r.back === 'ruhe' && r.solid : false);
    await T('place', marks.dreh, { settle: 30 });
    await sc(() => { const t = window.__t; t.named('dreh').plates[1].state = 'warn'; t.named('dreh').plates[1].t = 0.3; t.tick(24); });
    await shot('drehplatte', 1200);
  }
  // ---------------------------------------------------------------- Boost-Strecke auf Drehplatten
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player;
      t.place([0, 0, -20.6], { settle: 20, yaw: Math.PI / 2 });
      c.setInput({ y: 1, run: true });
      t.tick(190);
      c.setInput({});
      t.tick(20);
      const fast = { z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2), dead: p.dead };
      // Gegenprobe: hinter dem Boost-Pfeil langsam gehen → die Platten kippen unter der Figur
      t.named('boostbahn').reset();
      t.place([0, 0.05, -27.8], { settle: 2, yaw: Math.PI / 2 });
      c.setInput({ y: 0.35 });
      t.tick(160);
      c.setInput({});
      const slow = { z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2) };
      return { fast, slow, tilts: t.named('boostbahn').tilts };
    });
    console.log(`  Boost-Strecke: mit Boost bis z ${r.fast.z} (y ${r.fast.y}); langsam: z ${r.slow.z}, y ${r.slow.y}; gekippt ${r.tilts}`);
    check('Boost-Strecke: mit Boost-Pfeil und Rennen über sechs Drehplatten ans andere Ende; Gegenprobe zu langsam → Absturz', r.fast.z < -39 && Math.abs(r.fast.y) < 0.1 && !r.fast.dead && r.slow.y < -1.5);
  }
  // ---------------------------------------------------------------- Farbplatten
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, g = t.named('farb');
      const st = L.entities.find((e) => e.kind === 'star' && e.index === 0);
      const hidden0 = st.hidden;
      const counts = [];
      g.plates.forEach((q, i) => {
        t.place([q.x, q.y + 0.05, q.z], { settle: 8 });
        if (i === 0) { t.place([q.x, q.y + 0.05, q.z], { settle: 8 }); }
        counts.push(g.count);
      });
      return { hidden0, counts, done: g.done, star: !st.hidden, info: g.info() };
    });
    console.log(`  Farbplatten: ${r.counts.join(' ')}; fertig ${r.done}; Stern ${r.hidden0 ? 'versteckt' : 'sichtbar'} → ${r.star ? 'sichtbar' : 'versteckt'}`);
    check('Farbplatten: jedes Betreten färbt eine Platte um (zweimal dieselbe zählt nicht doppelt), alle 9 → Ereignis (Stern 0 erscheint; Gegenprobe vorher versteckt)', r.counts.join() === '1,2,3,4,5,6,7,8,9' && r.done && r.hidden0 && r.star);
    await T('place', [0, 0, -46], { settle: 20 });
    await shot('farbplatten', 1200);
  }
  // ---------------------------------------------------------------- Plattenwand (Takt) und Plattentreppe
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, w = t.named('wand'), tr = t.named('treppe');
      t.place([-3, 0, -73], { settle: 2 });
      // eine herausgeklappte Platte suchen, Figur daraufstellen, bis sie einklappt
      // eine eben herausgeklappte Platte der zweiten Reihe suchen, Figur daraufstellen, bis sie einklappt
      t.until(() => w.panels.every((x) => x.row !== 1 || x.state !== 'aussen'), 1500);
      const n = t.until(() => w.panels.some((q) => q.solid && q.row === 1 && q.state === 'aussen'), 1500);
      const q = w.panels.find((x) => x.solid && x.row === 1);
      let stood = false, fell = false, yOn = null;
      if (q) {
        t.place([q.cx, q.y + 0.05, q.cz + 1], { settle: 12, invuln: 99 });
        stood = p.mode === 'ground' && Math.abs(p.pos.y - q.y) < 0.1;
        yOn = +p.pos.y.toFixed(2);
        const m = t.until(() => !q.solid, 900);
        t.tick(60);
        fell = m >= 0 && p.pos.y < q.y - 0.5;
      }
      const innenOhneForm = w.panels.filter((x) => x.k < 0.01).every((x) => x.id === null);
      // Treppe: klappt erst aus, wenn man nah kommt, und bleibt draußen
      const before = tr.info().out;
      t.place([7, 0, -75], { settle: 2 });
      t.tick(600);
      const after = tr.info();
      t.place([0, 0, -64], { settle: 30 });
      return { n, stood, yOn, fell, innenOhneForm, before, after };
    });
    console.log(`  Plattenwand: Stufe nach ${r.n} Schritten, Figur steht ${r.stood} (y ${r.yOn}), fällt beim Einklappen ${r.fell}; Treppe ${r.before} → ${r.after.out} (${r.after.solid} fest)`);
    check('Plattenwand: Platten klappen im Takt heraus (Stufe trägt), vor dem Einklappen Vorwarnung, dann fällt die Figur; eingeklappt ohne Form', r.n >= 0 && r.stood && r.fell && r.innenOhneForm);
    check('Plattentreppe: klappt erst aus, wenn die Figur nah ist (Gegenprobe vorher alle innen), dann bleiben alle Stufen draußen', /^\.+$/.test(r.before) && /^#+$/.test(r.after.out) && r.after.solid === r.after.out.length);
    await T('place', marks.wand, { settle: 30 });
    await shot('plattenwand', 1400);
  }
  // ---------------------------------------------------------------- Schienenwalze
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, w = t.named('walze');
      w.reset();
      const s0 = w.state;
      t.place([0, 0.05, -86.8], { settle: 2, invuln: 99 });
      t.tick(60);
      const rolling = w.state, z1 = +w.pos.z.toFixed(2);
      // mitlaufen (je Schritt nachregeln: wer hinter der Walzenmitte ist, geht vor): bleibt oben
      for (let i = 0; i < 480; i++) { const rel = p.pos.z - w.pos.z; c.setInput({ y: Math.max(0, Math.min(0.8, 0.22 + rel * 1.2)) }); c.step(1); }
      c.setInput({});
      const onTop = p.mode === 'ground' && p.ground?.owner === w, zP = +p.pos.z.toFixed(2), zW = +w.pos.z.toFixed(2);
      // Gegenprobe: stehen bleiben → rutscht hinten herunter
      w.reset();
      t.place([0, 0.05, -86.8], { settle: 2, invuln: 99 });
      t.tick(60 + 480);
      const stillOn = p.mode === 'ground' && p.ground?.owner === w;
      // Ende: fällt und kommt wieder
      w.reset(); w.start();
      t.place([0, 0, -84], { settle: 2 });
      const end = t.until(() => w.state === 'faellt', 2400);
      const back = t.until(() => w.state === 'ruhe', 1200);
      return { s0, rolling, z1, onTop, zP, zW, stillOn, end, back, rolls: w.rolls };
    });
    console.log(`  Schienenwalze: ${r.s0} → ${r.rolling} (z ${r.z1}); mitgelaufen oben ${r.onTop} (Figur z ${r.zP}, Walze ${r.zW}); stehen geblieben oben ${r.stillOn}; Ende nach ${r.end}, zurück nach ${r.back}`);
    check('Schienenwalze: ruht, bis man draufsteht, rollt dann; wer mitläuft, bleibt oben und fährt mit (Gegenprobe: wer steht, rutscht herunter)', r.s0 === 'ruhe' && r.rolling === 'rollt' && r.z1 < -86.9 && r.onTop && r.zW < -95 && Math.abs(r.zP - r.zW) < 1.5 && !r.stillOn);
    check('Schienenwalze: am Schienenende fällt sie und erscheint nach respawn s wieder am Anfang', r.end > 0 && r.back > 0);
    await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, w = t.named('walze');
      w.reset(); t.place([0, 0.05, -86.8], { settle: 2, invuln: 99 });
      for (let i = 0; i < 300; i++) { const rel = p.pos.z - w.pos.z; c.setInput({ y: Math.max(0, Math.min(0.8, 0.22 + rel * 1.2)) }); c.step(1); }
      c.setInput({});
    });
    await shot('schienenwalze', 1200);
  }
  // ---------------------------------------------------------------- Walzenraum
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, p = c.player, raum = t.named('raum');
      t.place([0, 0.2, -139], { settle: 30 });
      const floor = +p.pos.y.toFixed(2);
      const box = () => { const out = []; L.world.forEach((s) => { if (s.tag === 'walzenraum') out.push([+((s.x0 + s.x1) / 2).toFixed(2), +((s.bot + s.top) / 2).toFixed(2), +(s.x1 - s.x0).toFixed(2), +(s.top - s.bot).toFixed(2)]); }); return out; };
      const b0 = box();
      const coin = L.entities.find((e) => e.kind === 'coin' && Math.abs(e.pos.z + 139) < 0.01);
      const c0 = coin ? [+coin.pos.x.toFixed(2), +coin.pos.y.toFixed(2)] : null;
      // Druckknopf drücken (auf den Knopf springen) → eine Vierteldrehung
      const knopf = t.named('raumknopf');
      t.place([6, 2.5, -131], { settle: 1 });
      t.tick(60);
      const pressed = knopf.presses;
      t.until(() => !raum.turning, 300);
      const b1 = box(), turn1 = raum.turn;
      const c1 = coin ? [+coin.pos.x.toFixed(2), +coin.pos.y.toFixed(2)] : null;
      // Figur im Raum (in der Luft) während der nächsten Drehung: schwebt an ihrem Platz, landet danach
      t.place([0, 1.5, -139], { settle: 1 });
      const yAt = p.pos.y;
      raum.toggle();
      t.tick(30);
      const heldY = +(p.pos.y - yAt).toFixed(3), turning = raum.turning;
      t.tick(150);
      return { floor, b0, b1, c0, c1, pressed, turn: turn1, turns: raum.turns, heldY, turning, landed: p.mode === 'ground' };
    });
    console.log(`  Walzenraum: Boden y ${r.floor}; Einbauten ${JSON.stringify(r.b0)} → ${JSON.stringify(r.b1)}; Münze ${r.c0} → ${r.c1}; Knopf ${r.pressed}, Stellung ${r.turn} (${r.turns} Drehungen), Figur während der Drehung Δy ${r.heldY}`);
    const find = (list, x, y) => list.some((b) => Math.abs(b[0] - x) < 0.05 && Math.abs(b[1] - y) < 0.05);
    check('Walzenraum: innen begehbar; Druckknopf dreht ihn um 90° (Einbau (2,4 | −1,6) → (1,6 | 2,4), Maße getauscht), Münze dreht mit, Figur schwebt während der Drehung und landet danach', r.floor > -0.1 && r.floor < 0.4
      && find(r.b0, 2.4, 2.4) && find(r.b1, 1.6, 6.4) && r.b1.some((b) => Math.abs(b[2] - 0.4) < 0.05 && Math.abs(b[3] - 2.4) < 0.05) && r.c1 && Math.abs(r.c1[0] - 0.9) < 0.05 && Math.abs(r.c1[1] - 6.4) < 0.05
      && r.pressed >= 1 && r.turn === 1 && r.turns >= 2 && r.turning && Math.abs(r.heldY) < 0.02 && r.landed);
    await T('place', [0, 0, -129], { settle: 30 });
    await shot('walzenraum', 1400);
  }
  // ---------------------------------------------------------------- Scheinziel und fliegender Zielmast (Fang am Schluss)
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, m = t.named('flugmast'), s = t.named('schein');
      const w0 = m.state;
      t.place([0, 0, -152], { settle: 10 });
      const w1 = m.state;
      t.place([0, 0.05, -155.4], { settle: 6 });
      const touched = s.touched, startState = m.state, goalStatus = c.level.runtime.status;
      t.tick(240);
      const s1 = m.s;
      // weit zurück → er wartet
      t.place([0, 0, -152], { settle: 2 });
      t.tick(300);
      const s2 = m.s; t.tick(120);
      const s3 = m.s, waiting = m.state;
      // nachlaufen → er fliegt weiter bis zur Landung
      let landed = -1;
      for (let i = 0; i < 40 && landed < 0; i++) { const q = m.pos; t.place([q.x, 0, q.z + 6], { settle: 1 }); t.tick(30); if (m.state === 'gelandet') landed = i; }
      return { w0, w1, touched, startState, goalStatus, s1: +s1.toFixed(2), s2: +s2.toFixed(2), s3: +s3.toFixed(2), waiting, landed, L: m.L, state: m.state, schein: s.alive };
    });
    console.log(`  Scheinziel berührt ${r.touched} (Ziel-Status ${r.goalStatus}); Mast ${r.w0}/${r.w1} → ${r.startState}; Weg ${r.s1} → ${r.s2} → ${r.s3} (${r.waiting}); gelandet nach ${r.landed} Runden (${r.state})`);
    check('Scheinziel: Berühren ist kein Ziel (Status bleibt play), es fliegt davon und startet den Mast (Gegenprobe vorher wartet er)', r.w0 === 'wartet' && r.w1 === 'wartet' && r.touched && r.goalStatus === 'play' && r.startState === 'fliegt');
    check('Fliegender Zielmast: fliegt davon, solange man nah ist; fällt man zurück, schwebt er und wartet (Weg wächst nicht); holt man auf, fliegt er bis zur Landung', r.s1 > 3 && r.s3 - r.s2 < 0.05 && r.waiting === 'schwebt' && r.landed >= 0 && r.state === 'gelandet');
    await T('place', [3, 0, -196], { settle: 10 });
    await shot('flugmast', 1400);
  }
  // ---------------------------------------------------------------- Riesen-?-Turm
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, p = c.player, tw = t.named('turm'), tw2 = t.named('turm2');
      const s0 = tw.state, coins0 = L.runtime.coins;
      t.place([-5, 0, -214], { settle: 6 });
      c.setInput({ jump: true }); t.tick(40); c.setInput({});
      t.tick(200);
      const s1 = tw.state, top = tw.top, grown = tw.grown, coins1 = L.runtime.coins;
      // Stampfen auf turm2: wächst, die Figur fährt oben mit
      t.place([5, 3.2, -211], { settle: 0, invuln: 99 });
      c.setInput({ crouch: true }); t.tick(2); c.setInput({});
      t.until(() => p.mode === 'ground', 300);
      t.tick(120);
      return { s0, s1, top: +top.toFixed(2), grown, dc: coins1 - coins0, s2: tw2.state, y2: +p.pos.y.toFixed(2), top2: +tw2.top.toFixed(2) };
    });
    console.log(`  Riesen-?-Turm: ${r.s0} → ${r.s1} (${r.grown} Blöcke, Oberseite ${r.top}, Münzen +${r.dc}); Stampfen: ${r.s2}, Figur y ${r.y2} (Turm ${r.top2})`);
    check('Riesen-?-Turm: Kopfstoß von unten lässt ihn nach oben zu einem Turm aus 4 Riesen-?-Blöcken wachsen (Münzen); Stampfen auf einen zweiten: er wächst und die Figur fährt oben mit', r.s0 === 'bereit' && r.s1 === 'turm' && r.grown === 4 && Math.abs(r.top - 12.6) < 0.05 && r.dc >= 8 && r.s2 === 'turm' && Math.abs(r.y2 - r.top2) < 0.1 && r.top2 > 7.9);
    await T('place', [0, 0, -206.5], { settle: 30 });
    await shot('frageturm', 1400);
  }
  // ---------------------------------------------------------------- Felsblock, Laufbombe, Kanonen-Helm
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, p = c.player;
      const fels = t.ent('fels'), wand = t.ent('felswand'), bomb = t.ent('bombe');
      const coins0 = L.runtime.coins;
      // Gegenprobe: Stampfen bricht ihn nicht
      t.place([5, 3.6, -224], { settle: 0, invuln: 99 });
      c.setInput({ crouch: true }); t.tick(2); c.setInput({});
      t.until(() => p.mode === 'ground', 300);
      t.tick(30);
      const afterPound = fels.broken;
      // Laufbombe neben dem Felsblock zünden
      t.place([0, 0, -206.5], { settle: 2 });
      bomb.pos.set(5, 0, -222.2); bomb.vel.set(0, 0, 0);
      bomb.lit = true; bomb.fuse = 0.3;
      t.tick(120);
      const byBomb = fels.broken && fels.by === 'bomb';
      t.tick(60);
      const coins1 = L.runtime.coins;
      // Felswand mit dem Kanonen-Helm sprengen → Stern 1
      const st1 = L.entities.find((e) => e.kind === 'star' && e.index === 1);
      const hidden1 = st1.hidden;
      t.place([-5, 0, -224], { settle: 4, yaw: Math.PI / 2 });
      p.wearHelmet('kanone');
      c.setInput({ action: true }); t.tick(3); c.setInput({});
      t.tick(120);
      const byCannon = wand.broken && wand.by === 'cannon';
      p.helmet = null; p.helmetFx = null;
      return { afterPound, byBomb, dc: coins1 - coins0, byCannon, hidden1, star1: !st1.hidden };
    });
    console.log(`  Felsblock: nach Stampfen heil ${!r.afterPound}; Laufbombe sprengt ${r.byBomb} (+${r.dc} Münzen); Felswand per Kanonenkugel ${r.byCannon}, Stern 1 ${r.hidden1 ? 'versteckt' : '?'} → ${r.star1 ? 'sichtbar' : 'versteckt'}`);
    check('Felsblock: Stampfen prallt ab (Gegenprobe), die Laufbombe (Kickbombe) sprengt ihn → Inhalt', !r.afterPound && r.byBomb && r.dc >= 3);
    check('Rissige Felswand: Kanonenkugel des Kanonen-Helms sprengt sie, dahinter erscheint Stern 1', r.byCannon && r.hidden1 && r.star1);
  }
  // ---------------------------------------------------------------- Draufsicht und Waben
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, p = c.player, rig = c.view.rig, wb = t.named('waben');
      const out = rig.railAt(0, -220, {}).pitch, inn = rig.railAt(0, -255, {}).pitch, edge = rig.railAt(0, -239, {}).pitch;
      const yawIn = rig.controlYaw({ x: 0, y: 0, z: -255 });
      // Steuerung: Stick nach oben läuft nach −Z
      const n = wb.cells.find((q) => q.type === 'normal' && q.r === 4 && q.q === 2);
      t.place([n.x, 0.05, n.z], { settle: 10 });
      const x0 = p.pos.x, z0 = p.pos.z;
      c.setInput({ y: 1 }); t.tick(40); c.setInput({});
      const move = { dx: +(p.pos.x - x0).toFixed(2), dz: +(p.pos.z - z0).toFixed(2) };
      // normale Wabe trägt, Eis-Wabe glatt, hohe Wabe 1 m höher
      t.place([n.x, 0.05, n.z], { settle: 20 });
      const normal = p.mode === 'ground' && Math.abs(p.pos.y) < 0.05;
      const ice = wb.cells.find((q) => q.type === 'eis');
      t.place([ice.x, 0.05, ice.z], { settle: 20 });
      const onIce = !!p.ground?.ice;
      const hi = wb.cells.find((q) => q.type === 'hoch');
      t.place([hi.x, 1.1, hi.z], { settle: 20 });
      const high = +p.pos.y.toFixed(2);
      // Lava-Wabe: Treffer und Hochspringen
      const lava = wb.cells.find((q) => q.type === 'lava');
      t.place([lava.x, 0.3, lava.z], { settle: 0 });
      t.until(() => p.vel.y > 2, 90);
      const burned = !p.big || p.invuln > 0.05, up = p.vel.y > 2;
      t.tick(120);
      return { out: +out.toFixed(1), inn: +inn.toFixed(1), edge: +edge.toFixed(1), yawIn: +yawIn.toFixed(3), move, normal, onIce, high, burned, up, hits: wb.hits, info: wb.info() };
    });
    console.log(`  Draufsicht: Neigung außen ${r.out}°, innen ${r.inn}°, am Rand ${r.edge}°; Steuer-Gier ${r.yawIn}; Stick oben → dx ${r.move.dx}, dz ${r.move.dz}`);
    console.log(`  Waben: ${JSON.stringify(r.info)}; normal trägt ${r.normal}, Eis glatt ${r.onIce}, hoch y ${r.high}, Lava: Treffer ${r.burned}, hoch ${r.up}`);
    check('Draufsicht: im Bereich Kamera senkrecht von oben (89,5°), außerhalb die Schiene (Gegenprobe), am Rand überblendet; Steuerung intuitiv (Stick nach oben → −Z)', r.inn > 89 && r.out < 60 && r.edge > r.out && r.edge < r.inn && Math.abs(r.yawIn) < 1e-6 && r.move.dz < -1 && Math.abs(r.move.dx) < 0.2);
    check('Waben-Platten: normal trägt, Eis-Wabe glatt (ice), hohe Wabe 1 m höher, Lava-Wabe gibt einen Treffer und schleudert hoch', r.normal && r.onIce && Math.abs(r.high - 1) < 0.05 && r.burned && r.up && r.hits >= 1);
    await T('place', [0, 0, -252], { settle: 30 });
    await page.waitForTimeout(800);
    await shot('draufsicht_waben', 1600);
  }
  // ---------------------------------------------------------------- Nebelplattformen und Nebelboden
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, nb = t.named('nebel'), boden = t.named('nebelboden');
      const q = nb.parts[0];
      // warten, bis die erste oben ist, daraufstellen, mitsinken
      t.until(() => q.state === 'oben', 1200);
      t.place([q.x, q.top + 0.05, q.z], { settle: 2, invuln: 99 });
      const y0 = +p.pos.y.toFixed(2);
      const sink = t.until(() => q.state === 'sinkt', 900);
      t.tick(60);
      const yMid = +p.pos.y.toFixed(2), carried = p.mode === 'ground' && p.ground === q.mb.shape;
      t.until(() => p.dead, 600);
      const dead = p.dead, cause = p.deathCause;
      t.until(() => !p.dead && c.level.runtime.status === 'play', 900);
      // Gegenprobe: eine oben stehende Platte ist fest
      t.place([0, 0, -274], { settle: 2 });
      const any = t.until(() => nb.parts.some((x) => x.state === 'oben' && x.solid), 600);
      // erscheinende Bodenstücke im Nebel: mal fest, mal weg
      const parts = boden.parts;
      const seen = new Set();
      for (let i = 0; i < 700; i++) { c.step(1); seen.add(parts.parts[0].solid ? 'fest' : 'weg'); }
      t.place([0, 0, -274], { settle: 2 });
      return { y0, sink, yMid, carried, dead, cause, any, seen: [...seen].sort().join('/') };
    });
    console.log(`  Nebelplattform: oben y ${r.y0}, sinkt (nach ${r.sink}) → y ${r.yMid} (trägt ${r.carried}); bleibt man drauf: tot ${r.dead} (${r.cause}); Bodenstücke ${r.seen}`);
    check('Nebelplattform: steigt und sinkt im Takt, trägt die Figur mit hinab in den Nebel (dort Absturz); Gegenprobe oben fest', r.y0 > -0.1 && r.sink >= 0 && r.yMid < r.y0 - 0.3 && r.carried && r.dead && r.cause === 'fall' && r.any >= 0);
    check('Nebelboden: Bodenstücke erscheinen und verschwinden (mal fest, mal weg)', r.seen === 'fest/weg');
    await T('place', marks.nebel, { settle: 30 });
    await shot('nebel', 1500);
  }
  // ---------------------------------------------------------------- Schienenbrett mit Weiche
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, b = t.named('brett'), w = b.weichen.B;
      b.reset();
      t.place([0, 0.75, -316], { settle: 4, invuln: 99 });
      t.until(() => b.state === 'faehrt', 200);
      t.until(() => b.state === 'weg', 1200);
      const route1 = b.route.join(''), fell = p.pos.y < -1.5;
      t.until(() => !p.dead && c.level.runtime.status === 'play', 900);
      // Weiche mit dem Kanonen-Helm umschießen: auf dem Brett stehend nach vorn feuern, bevor es die Weiche erreicht
      b.reset();
      const s0 = w.state;
      t.place([0, 0.75, -316], { settle: 4, yaw: Math.PI / 2, invuln: 99 });
      p.wearHelmet('kanone');
      c.setInput({ action: true }); t.tick(2); c.setInput({});
      t.until(() => w.hits > 0, 240);
      p.helmet = null; p.helmetFx = null;
      const s1 = w.state, hits = w.hits;
      t.until(() => b.state === 'faellt' || b.state === 'weg', 1800);
      const route2 = b.route.join('');
      return { route1, fell, s0, s1, hits, route2 };
    });
    console.log(`  Schienenbrett: Weiche ${r.s0}: Route ${r.route1} (Figur fällt ${r.fell}); Kanonenkugel → Weiche ${r.s1} (${r.hits} Treffer): Route ${r.route2}`);
    check('Schienenbrett: Betreten startet die Fahrt, an der Weiche der eingestellte Abzweig, am Ende stürzt es ab', r.route1 === 'ABC' && r.fell);
    check('Weiche: Kanonenkugel (Kanonen-Helm) stellt sie um → das Brett nimmt den anderen Weg (Gegenprobe vorher ABC)', r.s0 === 0 && r.s1 === 1 && r.hits >= 1 && r.route2 === 'ABDE');
    await sc(() => { const t = window.__t; t.named('brett').reset(); t.place([0, 0.75, -316], { settle: 4 }); t.tick(150); });
    await shot('schienenbrett', 1400);
  }
  // ---------------------------------------------------------------- Kanonenkugel-Wand
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, p = c.player, k = t.named('kugeln');
      t.place([0, 0, -358], { settle: 2 });
      t.tick(500);
      const flying = k.balls, shots = k.shots;
      // auf eine Kugel der untersten Reihe stellen → fährt mit nach +X
      const L = c.level;
      let ball = null;
      t.until(() => { L.world.forEach((s) => { if (s.tag === 'kanonenkugel' && s.bot < 1 && (s.x0 + s.x1) / 2 < -5) ball = s; }); return !!ball; }, 600);
      if (!ball) return { flying, shots, rode: false };
      const bx = (ball.x0 + ball.x1) / 2;
      t.place([bx, ball.top + 0.05, (ball.z0 + ball.z1) / 2], { settle: 2, invuln: 99 });
      const x0 = p.pos.x;
      t.tick(120);
      const rode = p.mode === 'ground' && p.ground?.tag === 'kanonenkugel' && p.pos.x - x0 > 2.5;
      t.tick(600);
      const gone = p.ground?.tag !== 'kanonenkugel';
      return { flying, shots, rode, dx: +(p.pos.x - x0).toFixed(2), gone };
    });
    console.log(`  Kanonenkugel-Wand: ${r.flying} Kugeln unterwegs (${r.shots} Schüsse); Figur fährt auf einer Kugel ${r.rode}, verliert sie am Ende ${r.gone}`);
    check('Kanonenkugel-Wand: Kanonen schießen im Takt Kugeln, die als Trittstufen tragen und mitnehmen; nach der Flugweite sind sie weg', r.flying >= 3 && r.shots >= 5 && r.rode && r.gone);
    await sc(() => window.__t.place([0, 0, -357], { settle: 2 }));
    await sc(() => window.__t.tick(240));
    await shot('kanonenkugeln', 1400);
  }
  // ---------------------------------------------------------------- Drehdiorama
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, p = c.player, d = t.named('diorama');
      // Formen je Teil (lange Teile sind in Stücke zerlegt): Hülle aller Stücke gleicher Höhe
      const shapes = () => {
        const g = new Map();
        L.world.forEach((s) => { if (s.tag !== 'drehdiorama' || s.type !== 'box') return; const k = s.top.toFixed(2); const b = g.get(k) ?? { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }; b.x0 = Math.min(b.x0, s.x0); b.x1 = Math.max(b.x1, s.x1); b.z0 = Math.min(b.z0, s.z0); b.z1 = Math.max(b.z1, s.z1); g.set(k, b); });
        return [...g.values()].map((b) => [+((b.x0 + b.x1) / 2).toFixed(2), +((b.z0 + b.z1) / 2).toFixed(2), +(b.x1 - b.x0).toFixed(2), +(b.z1 - b.z0).toFixed(2)]);
      };
      const a0 = shapes();
      const star = L.entities.find((e) => e.kind === 'star' && e.spec?.id === 'blickstern');
      t.place([3, 0.05, -388], { settle: 10 });
      const hidden0 = star.hidden;
      // Druckknopf (Draufspringen)
      const knopf = t.named('drehknopf');
      t.place([8, 2.5, -377], { settle: 1 });
      t.tick(60);
      const pressed = knopf.presses;
      t.until(() => !d.turning, 300);
      const a1 = shapes(), turn = d.turn;
      // Figur auf der Scheibe dreht mit (nächste Vierteldrehung)
      t.place([0, 0.05, -385], { settle: 4 });
      d.toggle();
      t.tick(200);
      const pos = [+p.pos.x.toFixed(2), +p.pos.z.toFixed(2)];
      return { a0, a1, hidden0, pressed, pos, turn, collect0: L.runtime.stars[2] };
    });
    console.log(`  Drehdiorama: Teile ${JSON.stringify(r.a0)} → ${JSON.stringify(r.a1)}; Knopf ${r.pressed}, Stellung ${r.turn}; Figur auf der Scheibe → (${r.pos})`);
    // Blick-Stern: Kamera von hinten → sichtbar und einsammelbar
    await sc(() => {
      const c = window.__course, cam = c.view.camera;
      c.view.rig.custom = () => { cam.position.set(14, 8, -394); cam.lookAt(0, 0, -388); return true; };
      c.view.rig.custom();
    });
    await page.waitForTimeout(400);
    await freshFrames(3);
    const vis = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, star = L.entities.find((e) => e.kind === 'star' && e.spec?.id === 'blickstern');
      t.tick(2);
      const visible = !star.hidden;
      // Gegenprobe zurück: Kamera wieder normal → versteckt
      return { visible, pos: [star.pos.x, star.pos.y, star.pos.z] };
    });
    await shot('drehdiorama_hinten', 1000);
    const col = await sc((sp) => {
      const t = window.__t, c = window.__course, L = c.level;
      c.view.rig.custom?.();   // die Bildaufnahme hat die Kamera zurückgesetzt (snapCamera)
      t.place([sp[0], 0.05, sp[2]], { settle: 0 });
      c.view.rig.custom?.();
      t.tick(6);
      const got = L.runtime.stars[2];
      c.view.rig.custom = null;
      return { got };
    }, vis.pos);
    await page.waitForTimeout(300);
    await freshFrames(3);
    const hid = await sc(() => { window.__t.tick(2); const s = window.__course.level.named.get('diorama'); return s.info(); });
    const find = (list, x, z, w, d) => list.some((b) => Math.abs(b[0] - x) < 0.06 && Math.abs(b[1] - z) < 0.06 && Math.abs(b[2] - w) < 0.06 && Math.abs(b[3] - d) < 0.06);
    console.log(`  Blick-Stern: vorher versteckt ${r.hidden0}, Kamera hinten sichtbar ${vis.visible}, eingesammelt ${col.got} (vorher ${r.collect0})`);
    check('Drehdiorama: Druckknopf dreht es um 90° (Steg (0 | −391) quer → (−3 | −388) längs), die Figur auf der Scheibe dreht mit', r.pressed >= 1 && r.turn === 1 && find(r.a0, 0, -391, 8, 1.4) && find(r.a1, -3, -388, 1.4, 8)
      && Math.abs(r.pos[0] - 3) < 0.15 && Math.abs(r.pos[1] + 388) < 0.15);
    check('Blick-Stern: aus der Standardansicht unsichtbar (Gegenprobe), mit gedrehter Kamera sichtbar und einsammelbar', r.hidden0 && vis.visible && col.got === true && !r.collect0);
    void hid;
    await T('place', marks.diorama, { settle: 30 });
    await shot('drehdiorama', 1400);
  }
  // ---------------------------------------------------------------- Fang des fliegenden Zielmasts = Ziel, Sternenglanz beim Abschluss
  await load('0-34');
  {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, m = t.named('flugmast');
      const before = !!JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').outfits?.stern;
      m.start();
      t.place([4, 0, -160], { settle: 2 });
      t.tick(60);
      const q = m.pos;
      t.place([q.x - 0.5, q.y + 1.5, q.z], { settle: 1 });
      t.tick(2);
      const caught = m.state, status = L.runtime.status;
      t.until(() => L.runtime.status === 'done', 1200);
      const after = !!JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').outfits?.stern;
      return { before, caught, status, done: L.runtime.status, after, pole: L.runtime.pole };
    });
    console.log(`  Fang: Mast ${r.caught}, Status ${r.status} → ${r.done} (Greifhöhe ${r.pole?.toFixed?.(2)}); Sternenglanz-Kostüm vorher ${r.before}, nach dem Abschluss ${r.after}`);
    check('Fliegender Zielmast: Fangen = Ziel (Zielmast-Ablauf bis zum Ergebnis)', r.caught === 'gefangen' && r.status === 'goal' && r.done === 'done');
    check('Sternenglanz (when ziel): erst beim Levelabschluss schaltet das Kostüm stern frei (Gegenprobe vorher nicht)', !r.before && r.after);
  }
  budget(s0, 'Werkstatt-Bilder');
  check('Werkstatt: keine Konsolenfehler', errors.length === e0);
  if (errors.length > e0) for (const e of errors.slice(e0, e0 + 10)) console.log('   ', e);
}

// =====================================================================================================================
// Themen der Welt Stern (?theme=) mit Bildern
// =====================================================================================================================
if (want('themes') && SHOTS) {
  console.log('Stern-Themen');
  const VIEWS = {
    starspace: ['start'], rainbow: ['farb'], galaxy: ['dreh'], woodspace: ['walze'], blockland: ['turm'], honeycomb: ['waben'],
    grotto: ['raum'], fogbog: ['nebel'], cosmic: ['brett'], bossblitz: ['diorama'],
  };
  const labels = {};
  const e0 = errors.length, t0 = stats.length;
  for (const th of Object.keys(VIEWS)) {
    const e1 = errors.length;
    await load('0-34', `&theme=${th}`);
    const m = await sc(() => window.__t.marks);
    labels[th] = await sc(() => {
      const c = window.__course, t = c.view.theme, s = c.view.sky;
      return { label: t.label, backdrop: t.backdrop ?? null, hemi: t.hemi.intensity, pl: !!t.playerLight, uw: !!t.underwater, fogNear: t.fog.near, kids: s.group.children.length + s.domeGroup.children.length, star: !!s.star, below: !!s.star?.stars };
    });
    for (const [k, w] of VIEWS[th].entries()) {
      await T('place', m[w], { settle: 30 });
      if (th === 'honeycomb') await T('place', [0, 0, -252], { settle: 30 });
      await shot(k ? `thema_${th}_${w}` : `thema_${th}`, 1700);
    }
    // Rundblick: flache Kamera neben der Figur, quer zur Werkstatt-Achse (Kulisse und Himmel – nicht die 400 m lange
    // Test-Werkstatt mit allen 14 Stationen hintereinander, die so kein Spiel-Level zeigt), danach wieder die Schiene
    if (th !== 'honeycomb') {
      await sc(() => { const c = window.__course, cam = c.view.camera, p = c.player.pos; c.view.rig.custom = () => { cam.position.set(p.x - 12, p.y + 4, p.z + 4); cam.lookAt(p.x + 40, p.y + 8, p.z - 14); return true; }; });
      await page.waitForTimeout(1500); await freshFrames(3);
      const s2 = await sc(() => window.__course.stats());
      stats.push([`thema_${th}_rundblick`, s2.calls, s2.triangles]);
      try { await page.screenshot({ path: `${OUT}sb_thema_${th}_rundblick.png` }); } catch { /* weiter */ }
      await sc(() => { window.__course.view.rig.custom = null; });
    }
    console.log(`  ${th}: ${labels[th].label} (Kulisse ${labels[th].backdrop}, ${labels[th].kids} Teile${labels[th].pl ? ', Figurenlicht' : ''}${labels[th].uw ? ', Unterwasser' : ''}, Himmelslicht ${labels[th].hemi})${errors.length > e1 ? ' – Fehler!' : ''}`);
  }
  const ls = Object.values(labels).map((l) => l.label);
  check('Themen: alle zehn Stern-Themen registriert (eigene Namen, eigene Kulisse mit Teilen)', ls.every((l) => l && l !== 'Wiese') && new Set(ls).size === 10 && Object.values(labels).every((l) => l.backdrop && l.kids >= 2 && l.star));
  check('Themen: fogbog nebelig mit Figurenlicht, grotto mit Unterwasser-Stimmung, honeycomb mit Sternen rundum (Draufsicht)', labels.fogbog.pl && labels.fogbog.fogNear < 30 && labels.grotto.uw && labels.honeycomb.below);
  budget(t0, 'Themen-Bilder');
  check('Themen: keine Konsolenfehler', errors.length === e0);
  if (errors.length > e0) for (const e of errors.slice(e0, e0 + 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
