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
    await sc(() => { window.__oldCourse = window.__course; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course !== window.__oldCourse && window.__course.level, null, { timeout: 60000 });
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

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
