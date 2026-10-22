// Kurs-Modus, Welt-2-Bausteine in der Wüstenwerkstatt 0-8: je Baustein das Kernverhalten deterministisch über
// window.__course.step(n) und setInput prüfen (Antippen auch mit echtem Mausklick auf die Leinwand); Sichtprüfung über
// Bilder tests/out/w2b_*.png (Kurs-Kamera), Kennzahlen (Zeichenaufrufe, Dreiecke), Themen-Bilder je Welt-2-Thema.
// Aufruf: PORT_BASE=3900 node tests/course_w2_blocks.mjs   (Port 4340; vorher npm run build; nutzt vite preview)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4340;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W2B_SHOTS !== '0';

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-8&scale=2&adapt=0${extra}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
  } catch {
    console.log('Wüstenwerkstatt startet nicht. Konsole:');
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
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        p.setHero(o.hero ?? 'lotti');
        p.dead = false;
        p.big = o.big ?? true;
        p.power = 'none';
        p.powerTime = 0;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.skidTurnTime = 0;   // Player.reset setzt es nicht zurück (sonst wird jeder Sprung danach ein Seitwärtssalto)
        if (o.power) p.setPower(o.power);
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        c.step(o.settle ?? 30);
        return p.info();
      },
      play(segs, every = 1) {
        const tr = [];
        for (const [inp, n] of segs) {
          c.setInput(inp);
          for (let i = 0; i < n; i++) {
            c.step(1);
            const p = P();
            if (i % every === 0) tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state, p.script?.kind ?? p.script?.type ?? '']);
          }
        }
        c.setInput({});
        return tr;
      },
      info: () => P().info(),
      named: (id) => L().named.get(id),
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      starsAlive: (index) => L().entities.filter((e) => e.kind === 'star' && e.index === index && e.alive && !e.hidden).map((e) => [e.pos.x, e.pos.y, e.pos.z]),
      coins: () => L().runtime.coins,
      ground: () => { const g = P().ground; return g ? { tag: g.tag, top: g.top } : null; },
      ray: (x, y, z, opts) => { const h = L().world.raycastDown(x, y, z, 30, opts); return h ? { y: +h.y.toFixed(3), tag: h.shape.tag } : null; },
      /** Stampfattacke aus dem Stand: springen, in der Luft ducken. */
      pound() {
        c.setInput({ jump: true }); c.step(16);
        c.setInput({ crouch: true }); c.step(70);
        c.setInput({}); c.step(30);
        return P().info();
      },
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const stats = [];
async function shot(name, wait = 1600) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  try { await page.screenshot({ path: `${OUT}w2b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

await load();
const marks = await sc(() => window.__t.marks);
console.log('Wüstenwerkstatt 0-8');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()] }));
  console.log(`  Arten: ${st.kinds.join(', ')}`);
  const need = ['antipp_block', 'antipp_muenze', 'crate', 'goldschalter', 'holz_silhouette', 'kristallwand', 'roter_ring', 'tuer', 'wachs_block'];
  check('Level geladen (Welt-2-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['treppe', 'melodie', 'ap1', 'ap2', 'pp_sink', 'fb_slide', 'gold_ein', 'zr_y', 'rw1', 'dr1', 'ff1', 'sw', 'sweg', 'lampe'];
  check('Bausteine benannt (level.named)', ids.every((id) => st.named.includes(id)));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  await shot('start', 1500);
}

// ---------------------------------------------------------------- Tastensteine
{
  const st0 = await sc(() => window.__t.named('treppe').stones.map((s) => +s.top().toFixed(2)));
  await T('place', [marks.ts1[0], 2.3, marks.ts1[2]], { settle: 90 });
  const s1 = await sc(() => { const s = window.__t.named('treppe').stones[0]; return { on: s.on, k: s.k, top: +s.top().toFixed(3) }; });
  const p1 = await T('info');
  console.log(`  Tastenstein 1: Oberkanten vorher ${st0.join('/')} → an ${s1.on}, Hub ${f2(s1.k)}, oben ${s1.top}, Figur y ${p1.y}`);
  check('Tastenstein: Betreten drückt ihn, er fährt um rise hoch und trägt die Figur', s1.on && s1.k === 1 && Math.abs(s1.top - (st0[0] + 0.5)) < 0.01 && Math.abs(p1.y - s1.top) < 0.05 && p1.mode === 'ground');
  await shot('taststein', 1200);
  await T('place', [marks.ts2[0], 2.3, marks.ts2[2]], { settle: 100 });
  await T('place', [marks.ts3[0], 2.3, marks.ts3[2]], { settle: 160 });
  const g = await sc(() => { const g = window.__t.named('treppe'); return { done: g.done, count: g.count, tops: g.stones.map((s) => +s.top().toFixed(2)) }; });
  const star0 = await T('starsAlive', 0);
  console.log(`  Treppe: ${g.count}/3, fertig ${g.done}, Oberkanten ${g.tops.join('/')}, Stern 0 ${JSON.stringify(star0)}`);
  check('Tastenstein-Treppe: alle gedrückt → Aktion (Stern erscheint), Stufen 2,5/3,5/4,5 m', g.done && star0.length === 1 && g.tops.join() === '2.5,3.5,4.5');
  // Melodie: falsche Reihenfolge setzt zurück
  const c0 = await T('coins');
  await T('place', [marks.mel2[0], 2.3, marks.mel2[2]], { settle: 60 });
  const wrong = await sc(() => window.__t.named('melodie').stones.map((s) => s.on));
  for (const m of ['mel1', 'mel2', 'mel3']) await T('place', [marks[m][0], 2.3 + (m === 'mel2' ? 1 : 0), marks[m][2]], { settle: 60 });
  const mel = await sc(() => window.__t.named('melodie').done);
  const c1 = await T('coins');
  console.log(`  Melodie: falscher Anfang → ${JSON.stringify(wrong)}; richtig → fertig ${mel}, Münzen +${c1 - c0}`);
  check('Tastenstein-Melodie: falscher Ton setzt zurück, richtige Folge löst aus', wrong.every((b) => !b) && mel && c1 - c0 >= 5);
}

// ---------------------------------------------------------------- Antippen (Touch-Tipp per Mausklick, Aktionstaste)
{
  await T('place', marks.ap_stand, { settle: 30 });
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(600);
  const before = await T('ray', 0, 5, -36);
  // Bildschirmlage der Plattform → echter Klick auf die Leinwand
  const sp = await sc(() => { const c = window.__course; const t = c.level.taps.targets.find((q) => q.owner === c.level.named.get('ap1')); return c.level.taps.screenPos(t); });
  const rect = await sc(() => { const r = window.__game.canvas.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.click(rect.x + (sp.x / 480) * rect.w, rect.y + (sp.y / 270) * rect.h);
  await page.waitForTimeout(100);
  await T('play', [[{}, 4]]);
  const ap1 = await sc(() => ({ state: window.__t.named('ap1').state, taps: window.__course.level.taps.info() }));
  const after = await T('ray', 0, 5, -36);
  console.log(`  Antipp-Plattform: Klick bei ${f2(sp.x)}/${f2(sp.y)} → ${ap1.state} (${JSON.stringify(ap1.taps)}); Boden vorher ${JSON.stringify(before)}, nachher ${JSON.stringify(after)}`);
  check('Antippen (Touch): Tipp auf die Plattform im Bild → sie erscheint und ist fest', ap1.state === 'on' && after?.tag === 'antipp' && Math.abs(after.y - 1) < 0.01 && before?.tag !== 'antipp');
  // Tipp daneben (Himmel) trifft nichts
  await page.mouse.click(rect.x + rect.w * 0.5, rect.y + rect.h * 0.08);
  await page.waitForTimeout(80);
  const miss = await sc(() => window.__course.level.taps.info().last);
  check('Antippen: Tipp ins Leere trifft kein Ziel', miss && !miss.hit);
  // über die erschienene Plattform auf die andere Seite
  await T('place', [0, 1.2, -36], { settle: 30 });
  const on = await T('ground');
  await shot('antipp', 1400);
  check('Antipp-Plattform trägt die Figur', on?.tag === 'antipp');
  // Aktionstaste in Reichweite: ausfahrende Plattform
  await T('place', marks.ap2_stand, { yaw: -Math.PI / 2, settle: 20 });
  const z0 = await sc(() => window.__t.named('ap2').box.pos.z);
  await T('play', [[{ action: true }, 2], [{}, 90]]);
  const ap2 = await sc(() => { const h = window.__t.named('ap2'); return { state: h.state, z: h.box.pos.z }; });
  console.log(`  Ausfahr-Plattform (Aktionstaste): ${ap2.state}, z ${f2(z0)} → ${f2(ap2.z)}`);
  check('Antippen (Aktionstaste in Reichweite): Plattform fährt um length aus', ap2.state === 'out' && Math.abs((z0 - ap2.z) - 3.5) < 0.05);
  // Zeitplattform verschwindet wieder
  await sc(() => { const c = window.__course; const t = c.level.taps.targets.find((q) => q.owner === c.level.named.get('ap3')); c.level.taps.tapTarget(t); });
  await T('play', [[{}, 3]]);
  const ap3a = await sc(() => window.__t.named('ap3').state);
  await T('play', [[{}, 4.2 * 120]]);
  const ap3b = await sc(() => window.__t.named('ap3').state);
  check('Antipp-Plattform mit time: erscheint, verschwindet nach time s', ap3a === 'on' && ap3b === 'off');
  // Antipp-Block (Aktionstaste) und Antipp-Münze (Tipp)
  const c0 = await T('coins');
  await T('place', marks.ab_stand, { yaw: -Math.PI / 2 + 0.3, settle: 10 });
  await T('play', [[{ action: true }, 2], [{}, 30]]);
  const ab = await sc(() => ({ ab1: !!window.__course.level.entities.find((e) => e.spec.id === 'ab1' && !e.removed), ab2: !!window.__course.level.entities.find((e) => e.spec.id === 'ab2' && !e.removed) }));
  await sc(() => { const c = window.__course; const t = c.level.taps.targets.find((q) => q.owner === c.level.named.get('am1')); c.level.taps.tapTarget(t); });
  await T('play', [[{}, 60]]);
  const c1 = await T('coins');
  const am = await sc(() => !!window.__course.level.entities.find((e) => e.spec.id === 'am1' && !e.removed));
  console.log(`  Antipp-Block: ab1 noch da ${ab.ab1}, ab2 noch da ${ab.ab2}; Münze aus der Ferne: noch da ${am}; Münzen +${c1 - c0}`);
  check('Antipp-Block: Aktion in Reichweite zerbricht ihn, Inhalt (3 Münzen) kommt heraus', !ab.ab1 && c1 - c0 >= 3);
  check('Antipp-Münze: Tipp sammelt sie aus der Ferne', !am && c1 - c0 >= 4);
}

// ---------------------------------------------------------------- Propellerplattformen
{
  const s0 = await sc(() => window.__t.named('pp_sink').box.pos.y);
  await T('place', [marks.pp_sink[0], 2.4, marks.pp_sink[2]], { settle: 20 });
  await T('play', [[{}, 240]]);
  const s1 = await sc(() => window.__t.named('pp_sink').box.pos.y);
  const p1 = await T('info');
  await shot('propeller', 1200);
  await T('place', [-6, 1, -48], { settle: 10 });
  await T('play', [[{}, 360]]);
  const s2 = await sc(() => window.__t.named('pp_sink').box.pos.y);
  console.log(`  Propeller (sinkt): ${f2(s0)} → ${f2(s1)} (Figur y ${p1.y}, ${p1.mode}), danach zurück ${f2(s2)}`);
  check('Propellerplattform sinkt langsam, solange man darauf steht (trägt), steigt danach zurück', s0 - s1 > 1.4 && s0 - s1 < 2.1 && Math.abs(p1.y - (s1 + 0.4)) < 0.05 && Math.abs(s2 - s0) < 0.12);
  const r0 = await sc(() => window.__t.named('pp_rise').box.pos.y);
  await T('place', [marks.pp_rise[0], 1.4, marks.pp_rise[2]], { settle: 10 });
  await T('play', [[{}, 240]]);
  const r1 = await sc(() => window.__t.named('pp_rise').box.pos.y);
  const q0 = await sc(() => window.__t.named('pp_path').box.pos.z);
  await T('play', [[{}, 120]]);
  const q1 = await sc(() => window.__t.named('pp_path').box.pos.z);
  console.log(`  Propeller (steigt): ${f2(r0)} → ${f2(r1)}; Pfad z ${f2(q0)} → ${f2(q1)}`);
  check('Propellerplattform (rise) steigt beim Draufstehen, (path) fliegt ihre Bahn', r1 - r0 > 2.5 && Math.abs(q1 - q0) > 1.5);
}

// ---------------------------------------------------------------- Kristallwände
{
  const c0 = await T('coins');
  await T('place', [marks.kw1_top[0], 3.3, marks.kw1_top[2]], { settle: 20 });
  const pd = await T('pound');
  const kw1 = await sc(() => { const e = window.__t.named('kw1'); return { broken: e.broken, ray: window.__t.ray(-5, 5, -73) }; });
  const c1 = await T('coins');
  console.log(`  Kristallwand (Stampfen): zerbrochen ${kw1.broken}, Boden darunter ${JSON.stringify(kw1.ray)}, Figur ${pd.y} ${pd.mode}, Münzen +${c1 - c0}`);
  check('Kristallwand: Stampfattacke von oben zerbricht sie, Geheimnis (onBreak) erscheint', kw1.broken && c1 - c0 >= 5 && kw1.ray?.tag !== 'kristallwand');
  // Kanonen-Wand: Stampfen prallt ab (Figur landet normal), onHit('cannon') bricht
  await T('place', [marks.kw2_top[0], 4.3, marks.kw2_top[2]], { settle: 20 });
  const pd2 = await T('pound');
  const kw2a = await sc(() => { const e = window.__t.named('kw2'); e.onHit('pound', window.__course.player); e.onHit('claw'); return e.broken; });
  await sc(() => window.__t.named('kw2').onHit('cannon', { pos: { x: 5, y: 2, z: -70 } }));
  await T('play', [[{}, 30]]);
  const kw2b = await sc(() => ({ broken: window.__t.named('kw2').broken, chest: !window.__t.named('truhe_kw').hidden }));
  console.log(`  Kristallwand (Kanone): nach Stampfen ${pd2.mode}/${pd2.state} bei y ${pd2.y}, heil ${!kw2a}; onHit('cannon') → ${kw2b.broken}, Truhe sichtbar ${kw2b.chest}`);
  check('Kristallwand breakable cannon: Stampfen prallt ab (keine Endlosschleife), Kanonenkugel zerbricht sie', !kw2a && pd2.mode === 'ground' && pd2.y > 3.9 && kw2b.broken && kw2b.chest);
  const climb = await sc(() => { const e = window.__t.named('kw3'); const s = window.__course.level.world.get(e.shapes[0]); return !!s?.climbable; });
  check('Kristallwand climbable: Kletterwand-Flag gesetzt', climb);
  await T('place', [0, 1, -76], { settle: 10 });
  await shot('kristall', 1200);
}

// ---------------------------------------------------------------- Fliesenbrücken, schmale Brücke, Fliese
{
  const tileAt = (id, i) => sc(([a, k]) => { const t = window.__t.named(a).tiles[k]; return { x: +t.box.pos.x.toFixed(3), y: +t.box.pos.y.toFixed(3), z: +t.box.pos.z.toFixed(3), state: t.state, off: +t.off.toFixed(3) }; }, [id, i]);
  const a0 = await tileAt('fb_slide', 2);
  await T('play', [[{}, 90]]);
  const a1 = await tileAt('fb_slide', 2);
  // Figur auf eine Fliese: wird seitlich mitgenommen
  await T('place', [a1.x, 1.3, a1.z], { settle: 12 });
  const pa = await T('info');
  const ta = await tileAt('fb_slide', 2);
  await T('play', [[{}, 60]]);
  const pb = await T('info');
  const tb = await tileAt('fb_slide', 2);
  console.log(`  Fliesenbrücke (slide): Fliese x ${a0.x} → ${a1.x}; Figur x ${pa.x} → ${pb.x} (Fliese ${ta.x} → ${tb.x}), y ${pb.y}`);
  check('Fliesenbrücke verschiebt ihre Fliesen seitlich (Wellentakt) und trägt die Figur mit', Math.abs(a1.x - a0.x) > 0.5 && Math.abs((pb.x - pa.x) - (tb.x - ta.x)) < 0.08 && Math.abs(pb.y - 1) < 0.05);
  await shot('fliesen', 1200);
  // Ausweich-Fliese (shift)
  const s0 = await tileAt('fb_shift', 0);
  await T('place', [s0.x, 1.3, s0.z], { settle: 12 });
  await T('play', [[{}, 110]]);
  const s1 = await tileAt('fb_shift', 0);
  console.log(`  Fliesenbrücke (shift): Fliese 0 ${s0.state} x ${s0.x} → ${s1.state} x ${s1.x} (Versatz ${s1.off})`);
  check('Fliesenbrücke (shift): betretene Fliese weicht zur Seite aus', Math.abs(s1.off) > 2 && s1.x !== s0.x);
  // Aufbau-Brücke (build)
  const b0 = await sc(() => window.__t.named('fb_build').tiles.filter((t) => t.state !== 'hidden').length);
  await T('place', marks.fb_build_start, { settle: 60 });
  const b1 = await sc(() => window.__t.named('fb_build').tiles.filter((t) => t.state !== 'hidden').length);
  const t0 = await tileAt('fb_build', 0);
  await T('place', [t0.x, 1.3, t0.z], { settle: 60 });
  const b2 = await sc(() => window.__t.named('fb_build').tiles.filter((t) => t.state !== 'hidden').length);
  console.log(`  Fliesenbrücke (build): sichtbar ${b0} → ${b1} (vor der Brücke) → ${b2} (auf der ersten Fliese)`);
  check('Fliesenbrücke (build): Fliesen bauen sich vor der Figur nacheinander auf', b0 === 0 && b1 === 2 && b2 === 3);
  // schmale Brücke
  const n0 = await T('ray', 0, 5, -112), n1 = await T('ray', 0.7, 5, -112);
  check('Schmale Brücke: 1 m breit (Mitte fest, 0,7 m daneben nicht)', n0?.tag === 'schmale_bruecke' && Math.abs(n0.y - 1) < 0.01 && n1?.tag !== 'schmale_bruecke');
  // Kipp-Fliese (drop)
  await T('place', [-6, 1.3, -112], { settle: 10 });
  await T('play', [[{}, 150]]);
  const d1 = await tileAt('fl_drop', 0);
  await T('place', [0, 1.2, -110], { settle: 10 });
  await T('play', [[{}, 360]]);
  const d2 = await tileAt('fl_drop', 0);
  console.log(`  Fliese (drop): ${d1.state} y ${d1.y} → später ${d2.state} y ${d2.y}`);
  check('Fliese (drop): kippt nach dem Betreten weg, kommt wieder', (d1.state === 'fall' || d1.state === 'gone') && d2.state === 'idle' && Math.abs(d2.y - 0.6) < 0.01);
}

// ---------------------------------------------------------------- Goldröhre, Goldschalter (Münzregen), Oase
{
  await T('place', [-7, 2.8, -131], { settle: 30 });
  await T('play', [[{ crouch: true }, 4], [{}, 200]]);
  const pg = await T('info');
  console.log(`  Goldröhre: Figur danach bei ${pg.x}, ${pg.y}, ${pg.z} (${pg.mode})`);
  check('Goldröhre: ducken → Teleport in den Bonusraum (Zielröhre)', Math.abs(pg.x - 74) < 1.5 && Math.abs(pg.z + 126) < 1.5 && pg.y > 2);
  const c0 = await T('coins');
  await T('place', [80, 2.6, -131], { settle: 60 });
  const gs = await sc(() => window.__t.named('gs1').state);
  await T('play', [[{}, 240]]);
  const nRain = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'fallmuenze').length);
  await shot('goldschalter', 1000);
  // ein paar Münzen einsammeln
  for (let i = 0; i < 4; i++) await T('play', [[{ x: i % 2 ? 1 : -1, y: 0.3 }, 40]]);
  await T('play', [[{}, 1300]]);
  const c1 = await T('coins');
  const left = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'fallmuenze').length);
  console.log(`  Goldschalter: ${gs}, fallende Münzen ${nRain}, eingesammelt +${c1 - c0}, nach dem Regen liegen noch ${left}`);
  check('Goldschalter: Draufspringen → Münzregen im Bereich (einsammelbar, verschwindet wieder)', gs === 'rain' && nRain >= 15 && c1 - c0 >= 1 && left === 0);
  const w = await T('ray', 7, 5, -132, { water: true });
  await T('place', [7, 1.6, -132], { settle: 60 });
  const sw = await T('info');
  console.log(`  Oase: Wasseroberfläche ${JSON.stringify(w)}, Figur ${sw.mode}`);
  check('Oase: Becken mit Wasser (schwimmbar), Sandrand fest', w && Math.abs(w.y - (1 - 0.22)) < 0.05 && sw.mode === 'swim' && (await T('ray', 7, 5, -128.6))?.tag === 'oase');
  await T('place', [0, 1, -127], { settle: 10 });
  await shot('oase', 1200);
}

// ---------------------------------------------------------------- Zahnräder, Rollwalzen, Drehrad
{
  // Drehteller (Achse y): Figur wird mitgedreht
  await T('place', [marks.zr_y[0] + 1.6, 2.0, marks.zr_y[2]], { settle: 12 });
  const a0 = await T('info');
  await T('play', [[{}, 120]]);
  const a1 = await T('info');
  const ang = (q) => Math.atan2(-(q.z - marks.zr_y[2]), q.x - marks.zr_y[0]);
  const r0 = Math.hypot(a0.x - marks.zr_y[0], a0.z - marks.zr_y[2]), r1 = Math.hypot(a1.x - marks.zr_y[0], a1.z - marks.zr_y[2]);
  console.log(`  Zahnrad (Achse y): Winkel ${f2(ang(a0))} → ${f2(ang(a1))}, Radius ${f2(r0)} → ${f2(r1)}, ${a1.mode}`);
  check('Zahnrad-Drehteller nimmt die Figur mit (Drehung ≈ 0,8 rad/s, Abstand bleibt)', Math.abs(ang(a1) - ang(a0) - 0.8) < 0.08 && Math.abs(r1 - r0) < 0.1 && a1.mode === 'ground');
  // stehendes Rad (Achse x): Oberfläche läuft nach +Z
  await T('place', [marks.zr_x[0], marks.zr_x[1] + 0.3, marks.zr_x[2]], { settle: 8 });
  const b0 = await T('info');
  await T('play', [[{}, 60]]);
  const b1 = await T('info');
  console.log(`  Zahnrad (Achse x): z ${b0.z} → ${b1.z}, y ${b0.y} → ${b1.y}`);
  check('Zahnrad (Achse x): Rad trägt die Figur nach +Z (dagegen anlaufen)', b1.z - b0.z > 0.6);
  // Rollwalze (Laufband)
  await T('place', [marks.rw1[0], marks.rw1[1] + 0.3, marks.rw1[2]], { settle: 8 });
  const c0 = await T('info');
  await T('play', [[{}, 60]]);
  const c1 = await T('info');
  console.log(`  Rollwalze: z ${c0.z} → ${c1.z}`);
  check('Rollwalze: Oberfläche bewegt die Figur (Laufband, 2 m/s nach +Z)', c1.z - c0.z > 0.7 && c1.z - c0.z < 1.3);
  await T('place', [marks.rw1[0], marks.rw1[1] + 0.3, marks.rw1[2]], { settle: 8 });
  await T('play', [[{ y: 0.3 }, 120]]);
  const c2 = await T('info');
  console.log(`  Rollwalze, langsam dagegen: ${c2.y}/${c2.z}`);
  check('Rollwalze: langsam dagegen anlaufen hält die Figur oben', c2.y > 4.5 && Math.abs(c2.z - marks.rw1[2]) < 1);
  await shot('walzen', 1200);
  // rollende Walze als Hindernis
  // Figur 2,5 m vor die rollende Walze stellen (in Fahrtrichtung)
  const ahead = await sc(() => { const h = window.__t.named('rw2'); const pz = h.pos.z; window.__course.step(2); const d = Math.sign(h.pos.z - pz) || -1; return [-8, 1, Math.max(-176.5, Math.min(-163, h.pos.z + d * 2.6))]; });
  await T('place', ahead, { settle: 2 });
  let hurt = false;
  for (let i = 0; i < 40 && !hurt; i++) { await T('play', [[{}, 10]]); hurt = await sc(() => !window.__course.player.big || window.__course.player.hurtTime > 0); }
  const rw2 = await sc(() => window.__t.named('rw2').pos.z);
  console.log(`  Rollende Walze: Treffer ${hurt}, Walze bei z ${f2(rw2)}`);
  check('Rollende Walze (path) rollt ihre Bahn und verletzt bei seitlicher Berührung', hurt);
  // Drehrad: Stege bleiben waagerecht und tragen
  const planks = () => sc(() => window.__t.named('dr1').planks.map((b) => ({ y: +b.pos.y.toFixed(3), z: +b.pos.z.toFixed(3), h: +(b.shape.max[1] - b.shape.min[1]).toFixed(3) })));
  const pl0 = await planks();
  const topI = pl0.reduce((bi, q, i, a) => (q.y > a[bi].y ? i : bi), 0);
  await T('place', [marks.dr1[0], pl0[topI].y + 0.6, pl0[topI].z], { settle: 6 });
  const d0 = await T('info');
  await T('play', [[{}, 120]]);
  const d1 = await T('info');
  const pl1 = await planks();
  const gr = await T('ground');
  const radiusOk = pl1.every((q) => Math.abs(Math.hypot(q.y + 0.12 - 6.3, q.z + 169) - 3.4) < 0.01);
  console.log(`  Drehrad: Stege ${pl0.map((q) => `${q.y}/${q.z}`).join(' ')} → ${pl1.map((q) => `${q.y}/${q.z}`).join(' ')}; Figur ${d0.y}/${d0.z} → ${d1.y}/${d1.z} auf ${gr?.tag}`);
  check('Drehrad: Stege laufen im Kreis, bleiben waagerecht (Dicke 0,24) und tragen die Figur', radiusOk && pl1.every((q) => q.h === 0.24) && gr?.tag === 'drehrad:steg' && Math.abs(d1.z - d0.z) > 0.5 && d1.mode === 'ground');
  await shot('drehrad', 1200);
}

// ---------------------------------------------------------------- Farbfeld
{
  const tiles = await sc(() => window.__t.named('ff1').tiles.map((t) => [t.x, t.y, t.z]));
  for (const [i, t] of tiles.entries()) {
    await T('place', [t[0], t[1] + 0.4, t[2]], { settle: 14 });
    if (i === 4) await shot('farbfeld', 1000);
  }
  await T('play', [[{}, 30]]);
  const g = await sc(() => ({ done: window.__t.named('ff1').done, count: window.__t.named('ff1').count }));
  const star1 = await T('starsAlive', 1);
  console.log(`  Farbfeld: ${g.count}/${tiles.length} gefärbt, fertig ${g.done}, Stern 1 ${JSON.stringify(star1)}`);
  check('Farbfeld: Betreten färbt die Platten, alle gefärbt → Aktion (Stern)', g.done && g.count === 9 && star1.length === 1);
}

// ---------------------------------------------------------------- Wachsender ?-Block
{
  // obendrauf stehen und von unten (wie ein Klon) stoßen lassen → trägt mit nach oben
  await T('place', [marks.wb_under[0], 4.6, marks.wb_under[2]], { settle: 20 });
  const top0 = await T('info');
  await sc(() => window.__t.named('wb1').onBump(window.__course.player));
  await T('play', [[{}, 60]]);
  const top1 = await T('info');
  // von unten stoßen, bis er ganz oben ist
  const c0 = await T('coins');
  await T('place', marks.wb_under, { settle: 20 });
  const curs = [];
  for (let i = 0; i < 4; i++) { await T('play', [[{ jump: true }, 40], [{}, 50]]); curs.push(await sc(() => { const e = window.__t.named('wb1'); const p = window.__course.player; return `${e.cur.toFixed(1)}@${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(1)}`; })); }
  console.log(`  Wachs-Block Stöße: ${curs.join(' | ')}`);
  const wb = await sc(() => { const e = window.__t.named('wb1'); return { cur: e.cur, grow: e.grow, used: e.used, n: e.n }; });
  const c1 = await T('coins');
  const pw = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'powerup' && !e.removed).map((e) => e.power));
  console.log(`  Wachs-Block: Figur oben ${top0.y} → ${top1.y}; nach Stößen Höhe ${f2(wb.cur)} (grow ${f2(wb.grow)}), leer ${wb.used}, Stöße ${wb.n}, Münzen +${c1 - c0}, Power-ups ${pw.join(',')}`);
  check('Wachsender Block: wächst je Kopfstoß um 1 m und trägt, wer obendrauf steht', Math.abs(top1.y - top0.y - 1) < 0.05 && top1.mode === 'ground');
  check('Wachsender Block: bis height, gibt Münzen, ganz oben den letzten Inhalt (Krallen-Anzug)', wb.cur === 4 && wb.used && c1 - c0 >= 3 && pw.includes('krallen'));
  await T('place', [0, 1, -194], { settle: 10 });
  await shot('wachsblock', 1200);
}

// ---------------------------------------------------------------- Roter Ring
{
  await T('place', marks.rr_start, { settle: 10 });
  await T('play', [[{ y: 1 }, 70], [{}, 10]]);
  const rr = await sc(() => ({ state: window.__t.named('rr1').state, coins: window.__course.level.entities.filter((e) => e.kind === 'rote_muenze' && !e.removed).length }));
  await shot('roter_ring', 1000);
  const pos = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'rote_muenze' && !e.removed).map((e) => [e.pos.x, e.pos.y, e.pos.z]));
  for (const p of pos) await T('place', [p[0], p[1] - 0.2, p[2]], { settle: 6 });
  await T('play', [[{}, 20]]);
  const done = await sc(() => window.__t.named('rr1').state);
  const star2 = await T('starsAlive', 2);
  console.log(`  Roter Ring: Durchlaufen → ${rr.state}, ${rr.coins} rote Münzen; alle gesammelt → ${done}, Stern 2 ${JSON.stringify(star2)}`);
  check('Roter Ring: Durchlaufen → 8 rote Münzen (Zeitanzeige), alle → Belohnung (Stern)', rr.state === 'active' && rr.coins === 8 && done === 'done' && star2.length === 1);
}

// ---------------------------------------------------------------- Kistenfeld
{
  const n = await sc(() => window.__t.named('kf1').crates.length);
  await sc(() => { const k = window.__t.named('kf1').crates; k[1 + 1 * 4].onHit('claw', window.__course.player); });
  await T('play', [[{}, 10]]);
  const pw = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'powerup' && !e.removed).map((e) => e.power));
  const left = await sc(() => window.__t.named('kf1').left);
  console.log(`  Kistenfeld: ${n} Kisten, nach Tatzenhieb noch ${left}, Power-ups ${pw.join(',')}`);
  check('Kistenfeld: Gitter aus Holzkisten mit Inhalt je Feld', n === 12 && left === 11 && pw.includes('funken'));
  await T('place', [0, 1, -222.5], { settle: 10 });
  await shot('kistenfeld', 1000);
}

// ---------------------------------------------------------------- Türen
{
  await T('place', marks.tuer_c, { yaw: -Math.PI / 2, settle: 60 });
  const lockedK = await sc(() => window.__t.named('tuer_c').openK);
  await sc(() => { window.__t.named('tuer_c').open(); });
  await T('play', [[{}, 60]]);
  const openK = await sc(() => window.__t.named('tuer_c').openK);
  check('Tür (verschlossen): bleibt zu, Signal open öffnet sie', lockedK === 0 && openK === 1);
  await T('place', marks.tuer_a, { yaw: -Math.PI / 2, settle: 40 });
  await shot('tuer', 1000);
  const tr = await T('play', [[{ y: 1 }, 60], [{}, 150]]);
  const p = await T('info');
  const entered = tr.some((s) => s[5] === 'tuer');
  console.log(`  Tür mit Ziel: hinein ${entered}, Figur danach ${p.x}, ${p.y}, ${p.z} (${p.mode})`);
  check('Tür mit Ziel: hineingehen → kommt an der Zieltür wieder heraus', entered && Math.abs(p.x - 110) < 1 && p.z > -243.5 && p.z < -241 && p.mode === 'ground');
}

// ---------------------------------------------------------------- Schattenspiel, Holz-Silhouette
{
  await T('place', marks.sw_view, { settle: 30 });
  await shot('schatten_wand', 1600);
  const sh = await sc(() => { const h = window.__t.named('sw'); h.refresh(); return { count: h.count, counts: h.counts }; });
  console.log(`  Schattenwand: ${sh.count} Schatten ${JSON.stringify(sh.counts)}`);
  check('Schattenwand zeigt Schatten (Figur als Scherenschnitt, Formen der Zone, Stern-Schatten)', sh.counts.ball >= 8 && sh.counts.box >= 4 && sh.counts.star >= 1);
  const hidden = await T('ray', -4, 6, -264);
  // Schatten des unsichtbaren Wegs liegt an der Wand, wo der Weg ist (Projektion)
  const proj = await sc(() => window.__t.named('sw').project(-4, 2.7, -264));
  await T('place', [marks.sw_step[0], 3.4, marks.sw_step[2]], { settle: 20 });
  const onWeg = await T('ground');
  const pi = await T('info');
  await shot('schatten_weg', 1600);
  console.log(`  Schattenweg: Boden ${JSON.stringify(hidden)}, Schatten bei ${proj.map(f2).join('/')}, Figur steht auf ${onWeg?.tag} (y ${pi.y})`);
  check('Versteckter Schattenweg: unsichtbar, aber fest – trägt die Figur', hidden?.tag === 'schattenweg' && onWeg?.tag === 'schattenweg' && Math.abs(pi.y - 2.7) < 0.05);
  // Holz-Silhouette: Stampfwelle daneben wirft sie um
  const c0 = await T('coins');
  await T('place', [marks.hs[0] + 1, 1, marks.hs[2] + 0.6], { settle: 10 });
  const pp = await T('pound');
  console.log(`  Holz-Silhouette: nach Stampfen Figur ${pp.x}/${pp.y}/${pp.z} ${pp.state}, Silhouette ${await sc(() => window.__t.named('hs1').state)}`);
  await T('play', [[{}, 120]]);
  const hs = await sc(() => window.__t.named('hs1').state);
  const c1 = await T('coins');
  console.log(`  Holz-Silhouette: ${hs}, Münzen +${c1 - c0}`);
  check('Holz-Silhouette: Stampfen daneben wirft sie um, dahinter Belohnung (onFall)', hs === 'down' && c1 - c0 >= 5);
  await shot('silhouette', 1200);
}

// ---------------------------------------------------------------- Ziel, Kennzahlen
{
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 80], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Wüstenwerkstatt erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 140 Zeichenaufrufe in allen Bildern', stats.every((s) => s[1] < 140));
  check('Budget: < 400 k Dreiecke in allen Bildern', stats.every((s) => s[2] < 400000));
}
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);

// ---------------------------------------------------------------- Themen (Stimmung), je ein Bild
if (SHOTS) {
  const themes = [['desert', [0, 1, -40]], ['space', [0, 1, -8]], ['shadow', [0, 1, -262]], ['pinkgrass', [0, 1, -150]], ['lava', [0, 1, -66]], ['house', [0, 1, -222]]];
  const tstats = [];
  for (const [th, pos] of themes) {
    await load(`&theme=${th}`);
    // flachere Kamera (nur für das Bild), damit Himmel und Kulisse des Themas zu sehen sind
    await sc((p) => { const c = window.__course; for (const s of c.view.rig.sections) { s.pitch = Math.min(s.pitch, 24); s.dist = 15; } c.player.reset(p, Math.PI / 2); c.step(60); c.snapCamera(); }, pos);
    await page.waitForTimeout(1800);
    const s = await sc(() => window.__course.stats());
    tstats.push([th, s.calls, s.triangles]);
    try { await page.screenshot({ path: `${OUT}w2b_thema_${th}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${th} übersprungen)`); }
  }
  console.log('  Themen (Zeichenaufrufe, Dreiecke): ' + tstats.map((s) => `${s[0]} ${s[1]}/${s[2]}`).join(', '));
  check('Themen desert/space/shadow/pinkgrass/lava/house laden ohne Fehler', errors.length === 0);
  check('Themen im Budget (< 140 Aufrufe)', tstats.every((s) => s[1] < 140));
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
