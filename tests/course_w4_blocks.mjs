// Kurs-Modus, Welt-4-Bausteine in der Canyonwerkstatt 0-14: je Baustein das Kernverhalten deterministisch über
// window.__course.step(n) und setInput prüfen – Piep-Blöcke über die Taktuhr der Musik (music.setManualClock/advanceClock:
// jeder Simulationsschritt rückt die Musik-Uhr um 1/120 s vor); Sichtprüfung über Bilder tests/out/w4b_*.png
// (Kurs-Kamera), Kennzahlen (Zeichenaufrufe, Dreiecke), Themen-Bilder je Welt-4-Thema (w4b_thema_*.png).
// Aufruf: PORT_BASE=3900 node tests/course_w4_blocks.mjs   (Port 4370; vorher npm run build; nutzt vite preview)
// W4B_SHOTS=0 → ohne Bilder/Themen (schneller).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4370;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W4B_SHOTS !== '0';

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-14&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Canyonwerkstatt startet nicht. Konsole:');
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
    const M = () => window.__audio.music;
    window.__t = {
      marks: c.level.data.marks,
      /** Schritte; die Musik-Uhr (manuell) läuft je Schritt 1/120 s mit. */
      tick(n = 1) { for (let i = 0; i < n; i++) { if (M().manualClock) M().advanceClock(1 / 120); c.step(1); } },
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
        p.skidTurnTime = 0;
        if (o.power) p.setPower(o.power);
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        window.__t.tick(o.settle ?? 30);
        return p.info();
      },
      play(segs, every = 1) {
        const tr = [];
        for (const [inp, n] of segs) {
          c.setInput(inp);
          for (let i = 0; i < n; i++) {
            window.__t.tick(1);
            const p = P();
            if (i % every === 0) tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state, p.script?.kind ?? p.script?.type ?? '', +p.hSpeed().toFixed(2), p.ground?.tag ?? '', +p.vel.y.toFixed(2)]);
          }
        }
        c.setInput({});
        return tr;
      },
      /** Musik-Uhr (manuell) auf das Sync-Thema course_beep setzen: Zählzeit 0 jetzt. */
      beepMusic() { M().setManualClock(true); M().play('course_beep'); c.step(1); return L().beepClock.info(); },
      /** Musik-Uhr bis zur Zählzeit b vorspulen (in Simulationsschritten). */
      toBeat(b) { const clk = L().beepClock; let guard = 0; while (clk.beat < b - 1e-9 && guard++ < 120 * 60) window.__t.tick(1); return clk.info(); },
      info: () => P().info(),
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      coins: () => L().runtime.coins,
      ground: () => { const g = P().ground; return g ? { tag: g.tag, top: g.top } : null; },
      ray: (x, y, z, opts) => { const h = L().world.raycastDown(x, y, z, 40, opts); return h ? { y: +h.y.toFixed(3), tag: h.shape.tag } : null; },
      starsAlive: (index) => L().entities.filter((e) => e.kind === 'star' && e.index === index && e.alive && !e.hidden).map((e) => [e.pos.x, e.pos.y, e.pos.z]),
      starGot: (index) => !!L().runtime.stars?.[index],
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const stats = [];
async function freshFrames(n = 3, timeout = 30000) {
  const f0 = await sc(() => window.__course.view.frame);
  try { await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + n, { timeout }); } catch { /* weiter */ }
}
async function shot(name, wait = 1500) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  await freshFrames();
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  try { await page.screenshot({ path: `${OUT}w4b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

await load();
const marks = await sc(() => window.__t.marks);
console.log('Canyonwerkstatt 0-14');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()] }));
  console.log(`  Arten: ${st.kinds.join(', ')}`);
  const need = ['stachelstange', 'roulette_block', 'sternring'];
  check('Level geladen (Welt-4-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['pr', 'pb', 'pk', 'ptr', 'pein', 'prs', 'to1', 'to2', 'rt', 'm1', 'schwank', 'dteller', 'dflip', 'dlava', 'gift', 'aw', 'aw2'];
  check('Bausteine benannt (level.named)', ids.every((id) => st.named.includes(id)));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
}

// ---------------------------------------------------------------- Piep-Blöcke im Takt der Musik
{
  const c0 = await T('beepMusic');
  const seq = await sc(() => {
    const t = window.__t, L = window.__course.level;
    const at = (b) => { t.toBeat(b); return { beat: +L.beepClock.beat.toFixed(3), src: L.beepClock.source, pr: t.named('pr').info()[0], pb: t.named('pb').info()[0], rr: t.ray(0, 3, -14), rb: t.ray(0, 3, -18) }; };
    return [at(4.5), at(5.05), at(7.98), at(8.02), at(15.98), at(16.02)];
  });
  for (const s of seq) console.log(`  Zählzeit ${s.beat} (${s.src}): rot fest ${s.pr.on} warn ${s.pr.warn} | blau fest ${s.pb.on} warn ${s.pb.warn} | Strahl rot ${JSON.stringify(s.rr)} blau ${JSON.stringify(s.rb)}`);
  check('Taktuhr folgt der Musik (course_beep, manuelle Musik-Uhr)', c0.theme === 'course_beep' && seq.every((s) => s.src === 'music'));
  const [a, b, c, d, e, f] = seq;
  check('Piep-Blöcke: Achterblock 0 → rot fest, blau Umriss; Wechsel exakt auf Zählzeit 8 und 16', a.pr.on && !a.pb.on && c.pr.on && !c.pb.on && !d.pr.on && d.pb.on && e.pb.on && !e.pr.on && f.pr.on && !f.pb.on);
  check('Piep-Blöcke: Warn-Blinken nur in den 3 Zählzeiten vor dem Wechsel (5, 6, 7)', !a.pr.warn && b.pr.warn && b.pb.warn && c.pr.warn && !d.pr.warn);
  check('Piep-Blöcke: Kollision nur im festen Zustand (Strahl trifft piep_block bzw. fällt durch)',
    a.rr?.tag === 'piep_block' && Math.abs(a.rr.y - 1) < 0.01 && a.rb?.tag !== 'piep_block' && d.rb?.tag === 'piep_block' && d.rr?.tag !== 'piep_block');
}
{
  // Figur steht auf rot → rot wird Umriss → Figur fällt durch
  await T('toBeat', 17);
  await T('place', marks.pr, { settle: 20 });
  const g0 = await T('ground');
  await T('toBeat', 23.95);
  const g1 = await T('ground');
  await T('toBeat', 24.6);
  const p2 = await T('info');
  console.log(`  Figur auf Rot: Boden ${JSON.stringify(g0)} → kurz vor 24 ${JSON.stringify(g1)} → nach dem Wechsel y ${f2(p2.y)} (${p2.mode})`);
  check('Piep-Blöcke: Figur steht auf dem festen roten Feld und fällt nach dem Wechsel durch', g0?.tag === 'piep_block' && g1?.tag === 'piep_block' && p2.y < 0.3);
  // Herausschieben nach oben: Figur steckt im (Umriss-)Blau, Füße im oberen Teil → Blau erscheint → sanft nach oben
  await T('toBeat', 38);
  await T('place', [0, 0.45, -18], { settle: 0 });
  const r0 = await sc(() => { const p = window.__course.player; p.vel.set(0, 0, 0); return { y: p.pos.y, pushes: window.__course.level.piep.pushes }; });
  await sc(() => { const t = window.__t, L = window.__course.level; const out = []; while (L.beepClock.beat < 40.3) { const p = window.__course.player; p.pos.y = Math.max(p.pos.y, 0.45); p.vel.y = Math.max(0, p.vel.y); t.tick(1); } return out; });
  const r1 = await sc(() => ({ y: window.__course.player.pos.y, mode: window.__course.player.mode, dead: window.__course.player.dead, pushes: window.__course.level.piep.pushes, pb: window.__t.named('pb').info()[0] }));
  console.log(`  Herausschieben (oben): y ${f2(r0.y)} → ${f2(r1.y)} (${r1.mode}), Schübe ${r1.pushes - r0.pushes}, blau fest ${r1.pb.solid}/${r1.pb.pending}`);
  check('Piep-Blöcke: wer beim Erscheinen im Block steckt, wird sanft herausgeschoben (nach oben), dann wird der Block fest', r1.y > 0.99 && !r1.dead && r1.pushes - r0.pushes >= 3 && r1.pb.solid === 1 && r1.pb.pending === 0);
  // seitlich: Figur steht im Würfel (Füße unten) → zur nächsten Seite
  await T('toBeat', 54);
  await T('place', [1, 1, -30], { settle: 0 });
  const s0 = await T('info');
  await T('toBeat', 56.5);
  const s1 = await sc(() => { const p = window.__course.player; const e = window.__t.named('pein'); return { x: p.pos.x, y: p.pos.y, z: p.pos.z, dead: p.dead, solid: e.solid, info: e.info() }; });
  console.log(`  Herausschieben (seitlich): (${f2(s0.x)}, ${f2(s0.z)}) → (${f2(s1.x)}, ${f2(s1.z)}), fest ${s1.solid} ${JSON.stringify(s1.info)}`);
  check('Piep-Blöcke: steckt die Figur ganz im Block, schiebt er sie zur nächsten Seite hinaus', !s1.dead && s1.solid && (Math.abs(s1.z + 30) >= 0.79 || s1.x < -0.79 || s1.x > 2.79));
  await shot('piep', 1400);
  // Treppe, Farbkarte, Rutsche
  const tr = await sc(() => { const t = window.__t; return { ptr: t.named('ptr').info(), pk: t.named('pk').info(), prs: t.named('prs').info(), step1: t.ray(7, 9, -24), step2: t.ray(7, 9, -25.2) }; });
  console.log(`  Treppe ${JSON.stringify(tr.ptr)}, Stufe 1 ${JSON.stringify(tr.step1)}, Stufe 2 ${JSON.stringify(tr.step2)}; Karte ${JSON.stringify(tr.pk)}; Rutsche ${JSON.stringify(tr.prs)}`);
  check('Piep-Treppe/Farbkarte/Rutsche: beide Farben, Stufen wechseln (eine fest, die nächste Umriss)', tr.ptr.length === 2 && tr.pk.length === 2 && tr.prs.length === 2
    && ((tr.step1?.tag === 'piep_block') !== (tr.step2?.tag === 'piep_block' && Math.abs(tr.step2.y - 3) < 0.01)));
  // Rutsche: Figur auf dem festen Streifen rutscht (Flag slide)
  const band = await sc(() => { const t = window.__t; const on = t.named('prs').info().find((g) => g.on); return on?.color; });
  const zb = band === 'rot' ? -38.5 : -36.5;   // oberer Teil eines festen Streifens (Oberseite steigt nach +Z)
  const ry = await T('ray', -6, 9, zb);
  await T('place', [-6, (ry?.y ?? 4) + 0.05, zb], { settle: 2 });
  const trs = await T('play', [[{}, 90]]);
  const slid = trs.filter((r) => r[4] === 'slide').length;
  const zs = trs.filter((r) => r[4] === 'slide').map((r) => r[2]);
  console.log(`  Piep-Rutsche: fester Streifen ${band} bei z ${zb} (${JSON.stringify(ry)}), ${slid} Schritte im Rutschen, z ${zb} → ${f2(Math.min(...zs))}`);
  check('Piep-Rutsche: auf dem festen Streifen rutscht die Figur bergab', ry?.tag === 'piep_block' && slid > 30 && Math.min(...zs) < zb - 0.8);
}

// ---------------------------------------------------------------- Trampoline
{
  // oranges Trampolin gerade
  await T('place', marks.to1, { settle: 1 });
  const t1 = await T('play', [[{}, 150]]);
  const top1 = Math.max(...t1.map((r) => r[1]));
  const b1 = await sc(() => window.__t.named('to1').bounces);
  console.log(`  oranges Trampolin: ${b1} Abpraller, Höhe bis ${f2(top1)} (Matte 1,88)`);
  check('Oranges Trampolin: federt stark (> 6 m über der Matte)', b1 >= 1 && top1 > 1.88 + 6);
  // schräg: schleudert nach −Z
  await T('place', marks.to2, { settle: 1 });
  const t2 = await T('play', [[{}, 90]]);
  const z2 = Math.min(...t2.map((r) => r[2]));
  const top2 = Math.max(...t2.map((r) => r[1]));
  console.log(`  schräges Trampolin (35°): Höhe bis ${f2(top2)}, z ${marks.to2[2]} → ${f2(z2)}`);
  check('Oranges Trampolin schräg: schleudert in Richtung dir (≥ 4 m weit) und hoch', z2 < marks.to2[2] - 4 && top2 > 1.88 + 3);
  await shot('trampolin', 1200);
  // Riesentrampolin: Draufspringen startet die Fahrt, Figur federt und fährt mit
  const rt0 = await sc(() => window.__t.named('rt').info());
  await T('place', [rt0.x, rt0.y + 3, rt0.z], { settle: 1 });
  const tr = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, rt = t.named('rt');
    const out = { apex: [], timedApex: 0, plainApex: 0 };
    let pressed = false, prevVy = 0, bounces = rt.bounces, apex = -1e9, mode = 'plain';
    for (let i = 0; i < 10 * 120; i++) {
      const p = c.player, top = rt.pos.y + 0.9;
      // ab dem 3. Abprall: getimt drücken (kurz vor der Landung)
      if (rt.bounces >= 3 && p.vel.y < 0 && p.pos.y - top < 0.45 && !pressed) { c.setInput({ jump: true }); pressed = true; }
      t.tick(1);
      apex = Math.max(apex, c.player.pos.y - (rt.pos.y + 0.9));
      if (rt.bounces !== bounces) {
        out.apex.push(+apex.toFixed(2));
        bounces = rt.bounces; apex = -1e9;
        if (pressed) { c.setInput({}); pressed = false; }
      }
      prevVy = c.player.vel.y;
    }
    c.setInput({});
    out.end = rt.info(); out.p = c.player.info(); out.riders = rt.riders.size;
    return out;
  });
  console.log(`  Riesentrampolin: Start ${JSON.stringify(rt0)} → ${JSON.stringify(tr.end)}; Höhen je Abprall ${JSON.stringify(tr.apex)}; Figur ${f2(tr.p.x)} ${f2(tr.p.y)} ${f2(tr.p.z)} (${tr.p.mode})`);
  const plain = tr.apex[1], timed = Math.max(...tr.apex.slice(3));
  check('Riesentrampolin: Draufspringen startet die Fahrt, es fliegt seinen Pfad bis zum Ende', !rt0.running && tr.end.done && Math.abs(tr.end.z + 93) < 0.05 && tr.end.s > 20);
  check('Riesentrampolin: Figur federt darauf und fährt in der Luft mit (bleibt über der Matte)', tr.apex.length >= 5 && Math.hypot(tr.p.x - tr.end.x, tr.p.z - tr.end.z) < 3.2 && !tr.p.dead);
  check('Riesentrampolin: getimtes Drücken federt höher', timed > plain * 1.4);
}

// ---------------------------------------------------------------- Ruinen
{
  // Stachelstange trifft
  const s0 = await sc(() => ({ hits: window.__t.ent('ss1').hits, angle: window.__t.ent('ss1').angle }));
  await T('place', [marks.ss1[0] + 2.1, 1, marks.ss1[2]], { settle: 0 });
  const p0 = await T('info');
  await T('play', [[{}, 6 * 120]]);
  const s1 = await sc(() => ({ hits: window.__t.ent('ss1').hits }));
  const p1 = await T('info');
  console.log(`  Stachelstange: Treffer ${s0.hits} → ${s1.hits}; Figur groß ${p0.big} → ${p1.big}`);
  check('Stachelstange: drehende Stachelkugeln verletzen die Figur', s1.hits > s0.hits && (!p1.big || p1.invuln > 0));
  // auf fahrender Plattform: fährt mit
  const a0 = await sc(() => ({ e: window.__t.ent('ss2').pos.z, m: window.__t.named('m1').pm.pos.z }));
  await T('play', [[{}, 120]]);
  const a1 = await sc(() => ({ e: window.__t.ent('ss2').pos.z, m: window.__t.named('m1').pm.pos.z }));
  console.log(`  Stachelstange auf Plattform: Plattform z ${f2(a0.m)} → ${f2(a1.m)}, Stange ${f2(a0.e)} → ${f2(a1.e)}`);
  check('Stachelstange mit attach fährt auf der beweglichen Plattform mit', Math.abs(a1.m - a0.m) > 0.5 && Math.abs((a1.e - a0.e) - (a1.m - a0.m)) < 0.01);
  await T('place', [-9, 1, -112], { settle: 1 });
  await shot('ruinen', 1200);
  // Schwankplattform: kippt zur belasteten Seite, Figur rutscht; ohne Last zurück
  await T('place', [2.3, 1.3, -130.5], { settle: 1 });
  const sw = await T('play', [[{}, 150]]);
  const k1 = await sc(() => window.__t.named('schwank').info());
  const px = sw.map((r) => r[0]);
  console.log(`  Schwankplattform: belastet rechts → Neigung ${k1.tilt}°, rutscht ${k1.sliding}; Figur x ${f2(px[5])} → ${f2(px.at(-1))}`);
  check('Schwankplattform: kippt unter dem Gewicht der Figur (> 15°) zur belasteten Seite', k1.tilt > 15);
  check('Schwankplattform: bei starker Neigung rutscht die Figur hangabwärts', px.at(-1) > px[5] + 0.5);
  await T('place', [0, 1, -135], { settle: 4 * 120 });
  const k2 = await sc(() => window.__t.named('schwank').info());
  console.log(`  ohne Last: Neigung ${k2.tilt}°`);
  check('Schwankplattform: ohne Last schwingt sie zurück in die Waage', Math.abs(k2.tilt) < 2);
  // Drehteller trägt die Figur im Kreis
  const d0 = await sc(() => window.__t.named('dteller').info());
  const R = 3.2;
  await sc(([R]) => { const a = window.__t.named('dteller').angle; window.__t.place([Math.cos(a) * R, 1.2, -142 - Math.sin(a) * R], { settle: 4 }); }, [R]);
  await T('play', [[{}, 240]]);
  const d1 = await sc(() => window.__t.named('dteller').info());
  const pd = await T('info');
  const ex = Math.cos(d1.angle) * R, ez = -142 - Math.sin(d1.angle) * R;
  console.log(`  Drehteller: Winkel ${f2(d0.angle)} → ${f2(d1.angle)}; Figur (${f2(pd.x)}, ${f2(pd.z)}) erwartet (${f2(ex)}, ${f2(ez)})`);
  check('Drehplattform (Achse y): dreht sich und trägt die Figur mit', d1.angle - d0.angle > 0.9 && Math.hypot(pd.x - ex, pd.z - ez) < 0.35 && pd.mode === 'ground');
  // Wende-Plattform: fest → dreht um 180° (nicht fest) → wieder fest
  const fl = await sc(() => {
    const t = window.__t, h = t.named('dflip'), out = [];
    for (let i = 0; i < 8 * 120; i += 6) { t.tick(6); out.push([h.solid ? 1 : 0, h.flips, h.warn ? 1 : 0]); }
    return out;
  });
  const flips = Math.max(...fl.map((r) => r[1]));
  const gaps = fl.filter((r, i) => i > 0 && r[0] !== fl[i - 1][0]).length;
  console.log(`  Wende-Plattform: ${flips} Wenden, ${gaps} Wechsel fest/frei, Warnung gesehen ${fl.some((r) => r[2])}`);
  check('Drehplattform (Wende): steht, blinkt, wendet (dabei ohne Halt) und ist danach wieder begehbar', flips >= 2 && gaps >= 4 && fl.some((r) => r[2]));
}

// ---------------------------------------------------------------- Giftwald
{
  // Giftwasser tötet
  await T('place', marks.gift, { settle: 0 });
  await T('play', [[{}, 80]]);
  const pg = await sc(() => ({ dead: window.__course.player.dead, cause: window.__course.player.deathCause }));
  console.log(`  Giftwasser: Figur tot ${pg.dead} (${pg.cause})`);
  check('Giftwasser: Berührung = Tod (wie Lava)', pg.dead && pg.cause === 'lava');
  // Gegner versinkt
  const g0 = await sc(() => window.__t.named('gift').sunk);
  await sc(() => { window.__course.level.spawn('pilzling', { id: 'giftopfer', pos: [3, 1.2, -168] }); });
  await T('place', [0, 1, -156], { settle: 0 });
  await T('play', [[{}, 150]]);
  const g1 = await sc(() => ({ sunk: window.__t.named('gift').sunk, alive: !!window.__t.ent('giftopfer') }));
  console.log(`  Giftwasser: versunkene Gegner ${g0} → ${g1.sunk}, Pilzling noch da ${g1.alive}`);
  check('Giftwasser: Gegner versinken darin', g1.sunk === g0 + 1 && !g1.alive);
  // Roulette-Block: Symbol wechselt im Takt, Kopfstoß gibt das gezeigte
  const seq = await sc(() => { const t = window.__t, L = window.__course.level, e = t.ent('roul'); const out = []; const b0 = Math.ceil(L.beepClock.beat) + 0.1; for (let k = 0; k < 4; k++) { t.toBeat(b0 + k); out.push(e.item); } return out; });
  await T('place', marks.roul, { settle: 4 });
  const bump = await sc(() => {
    const t = window.__t, c = window.__course, e = t.ent('roul');
    c.setInput({ jump: true });
    let shown = null;
    for (let i = 0; i < 60 && !e.used; i++) { shown = e.item; t.tick(1); if (e.used) break; }
    c.setInput({});
    t.tick(30);
    const pu = window.__course.level.entities.filter((x) => x.kind === 'powerup' && !x.removed).map((x) => x.power ?? x.spec?.power);
    return { used: e.used, given: e.given, shown, pu };
  });
  console.log(`  Roulette-Block: Symbole je Zählzeit ${JSON.stringify(seq)}; Kopfstoß bei „${bump.shown}“ → gegeben „${bump.given}“, Power-ups ${JSON.stringify(bump.pu)}`);
  check('Roulette-Block: Symbol wechselt im Takt (jede Zählzeit ein anderes)', new Set(seq).size === 4);
  check('Roulette-Block: Kopfstoß gibt das gerade gezeigte Power-up', bump.used && bump.given === bump.shown && bump.pu.length >= 1);
  await shot('gift', 1200);
  // Sternring: Zeit um → zurück; erneut → 8 Sternmünzen → Belohnung (Stern 1)
  await T('place', [6, 1, -186.6], { yaw: Math.PI / 2, settle: 2 });
  await T('play', [[{ y: 1 }, 50], [{}, 10]]);
  const r0 = await sc(() => { const e = window.__t.ent('sring'); return { state: e.state, coins: window.__t.ents('sternmuenze').length }; });
  await T('play', [[{}, 11 * 120]]);
  const r1 = await sc(() => { const e = window.__t.ent('sring'); return { state: e.state, coins: window.__t.ents('sternmuenze').length }; });
  await T('place', [6, 1, -186.6], { yaw: Math.PI / 2, settle: 130 });
  await T('play', [[{ y: 1 }, 50], [{}, 4]]);
  const spots = await sc(() => window.__t.ents('sternmuenze').map((e) => [e.pos.x, e.pos.y - 0.3, e.pos.z]));
  const coinsBefore = await T('coins');
  for (const s of spots) await T('place', s, { settle: 6 });
  const r2 = await sc(() => { const e = window.__t.ent('sring'); return { state: e.state, got: e.got, star: window.__t.starsAlive(1).length }; });
  const coinsAfter = await T('coins');
  console.log(`  Sternring: aktiv ${r0.state} mit ${r0.coins} Sternmünzen → nach 11 s ${r1.state}/${r1.coins}; zweiter Versuch: ${spots.length} Münzen, eingesammelt ${r2.got} (+${coinsAfter - coinsBefore}), Zustand ${r2.state}, Stern 1 sichtbar ${r2.star}`);
  check('Sternring: Durchlaufen startet 8 Sternmünzen auf Zeit; Zeit um → Münzen weg, neuer Versuch möglich', r0.state === 'active' && r0.coins === 8 && r1.state === 'idle' && r1.coins === 0);
  check('Sternring: alle 8 Sternmünzen → Belohnung (Stern erscheint)', spots.length === 8 && r2.got === 8 && r2.state === 'done' && r2.star === 1);
  await shot('sternring', 1000);
}

// ---------------------------------------------------------------- Lava-Burg
{
  // Lava-Glasrohr: Figur gleitet durch, Münzen
  const c0 = await T('coins');
  await T('place', marks.lrohr, { yaw: Math.PI / 2, settle: 4 });
  const tr = await T('play', [[{ y: 1 }, 40], [{}, 400]]);
  const c1 = await T('coins');
  const inPipe = tr.some((r) => r[5] === 'glasspipe' || r[3] === 'script');
  const end = await T('info');
  console.log(`  Lava-Glasrohr: im Rohr ${inPipe}, Münzen +${c1 - c0}, Ende z ${f2(end.z)} y ${f2(end.y)} (${end.mode}, tot ${end.dead})`);
  check('Lava-Glasrohr: Figur gleitet durch das Rohr in der Lava (sicher) und sammelt die Münzen', inPipe && c1 - c0 >= 4 && end.z < -229 && !end.dead);
  // Drehbalken über Lava
  await T('place', [-4, 1, -205], { settle: 2 });
  await shot('lava', 1200);
  // Lavafall tötet (mitten im Fall, weit über der Lava)
  await T('place', [-10.5, 4, -220], { settle: 0 });
  const lf = await sc(() => { const t = window.__t, p = window.__course.player; let y = null; for (let i = 0; i < 30 && !p.dead; i++) { t.tick(1); if (p.dead) y = p.pos.y; } return { dead: p.dead, y, cause: p.deathCause }; });
  console.log(`  Lavafall: tot ${lf.dead} (${lf.cause}) bei y ${f2(lf.y)}`);
  check('Lavafall: Berührung = Tod (im Fall, nicht erst in der Lava)', lf.dead && lf.y > 2.5);
}

// ---------------------------------------------------------------- Ameisenweg (Datenformat)
{
  const aw = await sc(() => {
    const h = window.__t.named('aw'), h2 = window.__t.named('aw2');
    const a = (s) => { const o = h.at(s); return { p: [+o.pos.x.toFixed(2), +o.pos.y.toFixed(2), +o.pos.z.toFixed(2)], n: [+o.normal.x.toFixed(2), +o.normal.y.toFixed(2), +o.normal.z.toFixed(2)] }; };
    return { L: +h.L.toFixed(2), loop: h.loop, ground: a(1), wall: a(5), top: a(8), back: a(11.5), loopL: +h2.L.toFixed(2), loop2: h2.loop };
  });
  console.log(`  Ameisenweg: Länge ${aw.L}, Boden ${JSON.stringify(aw.ground)}, Wand ${JSON.stringify(aw.wall)}, oben ${JSON.stringify(aw.top)}, Rückwand ${JSON.stringify(aw.back)}; Rundweg ${aw.loopL} (loop ${aw.loop2})`);
  check('Ameisenweg: Pfad über Boden, senkrechte Wand und Oberseite mit Flächennormalen (Datenformat antpath)',
    Math.abs(aw.L - 16) < 0.01 && aw.ground.n[1] === 1 && aw.wall.n[2] === 1 && Math.abs(aw.wall.p[1] - 3) < 0.01 && aw.top.n[1] === 1 && Math.abs(aw.top.p[1] - 5) < 0.01 && aw.back.n[2] === -1 && aw.loop2 && Math.abs(aw.loopL - 10) < 0.01);
  await T('place', marks.aw, { settle: 2 });
  await shot('ameisen', 1200);
}

// ---------------------------------------------------------------- Ziel, Kennzahlen
{
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 70], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Canyonwerkstatt erreichbar', st === 'done' || st === 'goal');
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
  const themes = [['canyon', [0, 1, -8]], ['poison', [0, 1, -156]], ['beep', [0, 1, -8]], ['bounce', [0, 1, -56]], ['ruins', [0, 1, -108]], ['lavacastle', [0, 1, -203]]];
  const tstats = [];
  for (const [th, pos] of themes) {
    await load(`&theme=${th}`);
    await sc((p) => { const c = window.__course; for (const s of c.view.rig.sections) { s.pitch = Math.min(s.pitch, 24); s.dist = 15; } c.player.reset(p, Math.PI / 2); c.step(60); c.snapCamera(); }, pos);
    await page.waitForTimeout(1800);
    await freshFrames();
    const s = await sc(() => window.__course.stats());
    tstats.push([th, s.calls, s.triangles]);
    try { await page.screenshot({ path: `${OUT}w4b_thema_${th}.png`, timeout: 120000 }); } catch { console.log(`  (Bild ${th} übersprungen)`); }
    if (th === 'lavacastle') {
      await sc(() => { window.__course.view.setMood('innen'); window.__course.step(240); });
      await freshFrames(4);
      const m = await sc(() => ({ ...window.__course.view.mood.info(), fog: window.__course.view.three.fog.far }));
      console.log(`  Thema lavacastle: Stimmung innen ${JSON.stringify(m)}`);
      check('Thema lavacastle: Stimmung „innen“ (Burg-Gewölbe) blendet über (naher Rauch)', m.mood === 'innen' && m.fog < 100);
      try { await page.screenshot({ path: `${OUT}w4b_thema_lavacastle_innen.png`, timeout: 120000 }); } catch { /* weiter */ }
    }
  }
  console.log('  Themen (Zeichenaufrufe, Dreiecke): ' + tstats.map((s) => `${s[0]} ${s[1]}/${s[2]}`).join(', '));
  check('Themen canyon/poison/beep/bounce/ruins/lavacastle laden ohne Fehler', errors.length === 0);
  check('Themen im Budget (< 140 Aufrufe, < 400 k Dreiecke)', tstats.every((s) => s[1] < 140 && s[2] < 400000));
  if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
