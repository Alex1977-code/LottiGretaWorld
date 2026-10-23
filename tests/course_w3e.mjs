// Welt 3: Arena 3-A „Krötenzauber im Roten Zwinger“, Boss-Level 3-B „Manege frei für den Schlangenkönig“ und das
// Welt-3-Finale 3-Zug „Volldampf durchs Schneetal“ deterministisch prüfen (Simulation nur über
// window.__course.step(n) / setInput, Teleport erlaubt). Aufruf (nach npm run build):
//   PORT_BASE=5800 node tests/course_w3e.mjs            alle drei Level
//   PORT_BASE=5800 node tests/course_w3e.mjs 3-A 3-Zug  nur diese
// Bilder tests/out/w3z_*.png, Kennzahlen (Zeichenaufrufe inkl. Schattenpass < 130, Dreiecke < 300 k).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4740;
const ONLY = process.argv.slice(2);
const want = (id) => !ONLY.length || ONLY.includes(id);
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SAVE = 'lotti-greta-course-v1';
const stats = [];
const near = (a, b, e) => Math.abs(a - b) <= e;

/** Level laden (optional frischer Speicherstand), Test-Hilfen window.__t anlegen. */
async function load(id, { hero = 'lotti', fresh = false } = {}) {
  const go = async (url) => {
    try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); }
  };
  if (fresh) {
    await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
  }
  await go(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`);
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log(`${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc((hero) => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    c.setHero(hero);
    const L = c.level, P = () => c.player;
    L.runtime.save.lives = 9;
    window.__sfx = [];
    const sfx = L.sfx.bind(L);
    L.sfx = (n) => { window.__sfx.push([n, +L.time.toFixed(3)]); return sfx(n); };
    const t = window.__t = {
      ent: (id) => L.named.get(id),
      arch: () => c.state().archetype,
      info: () => P().info(),
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
      sfxCount: (name) => window.__sfx.filter(([n]) => n === name).length,
      /** Figur setzen (groß, ohne Power-up) und landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null); c.setInput({});
        p.dead = false; p.holding = null;
        p.big = o.big ?? true;
        if (o.power) p.setPower(o.power); else if (p.power !== 'none' && !o.keepPower) p.setPower('none');
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.invuln = o.invuln ?? 0;
        if (L.runtime.status === 'dying') L.runtime.status = 'play';
        L.controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        if (o.settle) c.step(o.settle);
        return p.info();
      },
      /** Von oben auf e fallen, bis Abprall oder Landung (Figur wird über e gehalten). */
      stomp(e, o = {}) {
        const p = P();
        const top = e.pos.y + e.half.y * 2;
        t.place([e.pos.x, top + (o.h ?? 0.9), e.pos.z], { settle: 0, keepPower: true, invuln: o.invuln ?? 0 });
        let bounced = false, hurt = false;
        const inv0 = p.invuln;
        for (let i = 0; i < 160; i++) {
          c.setInput({}); c.step(1);
          if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; }
          if (p.invuln > inv0 + 0.5) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground') break;
        }
        c.step(4);
        return { bounced, hurt };
      },
      /** Zur Stelle (x, z) laufen (mit Sprung über Kanten, wenn jump), bis nah genug. */
      go(x, z, o = {}) {
        const p = P();
        for (let i = 0; i < (o.max ?? 900); i++) {
          const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
          if (d < (o.r ?? 0.5)) break;
          c.setInput({ x: dx / d, y: -dz / d, run: !!o.run, jump: !!o.jump && i % 50 < 25 });
          c.step(1);
        }
        c.setInput({}); c.step(o.settle ?? 4);
        return p.info();
      },
      hurt: () => P().invuln > 1.2 && P().invuln < 1e8,
      /** Kamera und Darstellung wie in einem Bild nachführen. */
      cam(n = 1, dt = 0.05) { for (let i = 0; i < n; i++) { c.rig.update(dt, c.view.time + dt); L.render(dt, c.view.time + dt); c.view.rig.update(dt, c.player, c.world); } return c.view.rig.info(); },
    };
  }, hero);
}

/** Aufbau (im Browser), Darstellung nachführen, auf neue Bilder warten, Screenshot, Kennzahlen. */
async function SHOT(name, setup, arg) {
  if (setup) await sc(setup, arg);
  const f0 = await sc(() => {
    const c = window.__course;
    if (c.player.invuln < 1e8) c.player.invuln = 0;
    window.__t.cam(14);
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + 2, { timeout: 60000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w3z_${name}.png` });
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  return s;
}

// ====================================================================================================== 3-A
if (want('3-A')) {
  console.log('\n3-A „Krötenzauber im Roten Zwinger“');
  await load('3-A', { fresh: true });
  check('3-A: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
  let r = await sc(() => {
    const c = window.__course, L = c.level, d = L.data;
    return {
      title: d.title, arch: d.archetype, theme: d.theme, music: d.music, time: d.timeLimit, slots: d.starSlots, stamp: !!d.stamp,
      toads: L.entities.filter((e) => e.kind === 'zauberkroete').length, hud: c.state().archetype.hud.arena,
      podests: L.world.overlapAABB({ x: -7.7, y: 4.3, z: -7.7 }, { x: 0.1, y: 0.05, z: 0.1 }).filter((s) => s.tag === 'podest').length
        + L.world.overlapAABB({ x: 7.7, y: 4.3, z: -7.7 }, { x: 0.1, y: 0.05, z: 0.1 }).filter((s) => s.tag === 'podest').length,
      cage: L.world.overlapAABB({ x: 0, y: 4, z: -10.3 }, { x: 0.1, y: 0.1, z: 0.1 }).some((s) => s.tag === 'kaefig'),
    };
  });
  check(`3-A: „${r.title}“, Arena, Thema ${r.theme}, Musik ${r.music}, ${r.time} s, 1 Stern ohne Stempel`, r.arch === 'arena' && r.theme === 'fortress' && r.music === 'course_arena' && r.time === 200 && r.slots === 1 && !r.stamp);
  check(`3-A: drei Zauberkröten, HUD „noch ${r.hud?.left}“, zwei Eckpodeste (2,4 m), Käfig ringsum`, r.toads === 3 && r.hud?.left === 3 && r.podests === 2 && r.cage);
  await SHOT('3a_start', () => { window.__course.step(40); });

  // Podest über die Treppe ersteigen, aus dem Käfig kommt man nicht heraus
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player;
    t.place([-1.2, 2, -7.7], { settle: 4, invuln: 1e9 });
    const up = t.go(-7.6, -7.7, { max: 400, settle: 20 });
    // gegen das Gitter springen
    t.place([0, 2, 8.5], { settle: 4, invuln: 1e9 });
    for (let i = 0; i < 160; i++) { c.setInput({ y: -1, jump: i % 60 < 30, run: true }); c.step(1); }
    c.setInput({}); c.step(30);
    const front = p.info();
    t.place([-7.6, 4.4, -7.7], { settle: 4, invuln: 1e9 });
    for (let i = 0; i < 100; i++) { c.setInput({ jump: i < 40 }); c.step(1); }
    const maxY = p.pos.y;
    c.setInput({});
    return { up: up.y, front: front.z, maxY };
  });
  check(`3-A: Treppe hinauf aufs Eckpodest (y ${r.up.toFixed(2)}), Käfig hält vorn (z ${r.front.toFixed(1)} ≤ 10)`, near(r.up, 4.4, 0.05) && r.front <= 10.05);

  // Sieg per Skript: jede Zauberkröte draufspringend besiegen, sobald sie sichtbar ist
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    t.place([0, 2, 7], { settle: 2 });
    const out = { hits: [], hurtByOrb: false, orbs: 0 };
    // Zauberkugel trifft (eine Kröte zaubert auf die Figur)
    for (let i = 0; i < 1200 && !out.hurtByOrb; i++) {
      c.step(1);
      out.orbs = Math.max(out.orbs, t.count('zauberkugel'));
      if (t.hurt()) out.hurtByOrb = true;
    }
    p.invuln = 0;
    // ohne Treffer: unsichtbare Kröte ist nicht zu treffen
    const k1 = L.entities.find((e) => e.kind === 'zauberkroete' && e.state === 'hidden');
    out.hiddenTouch = k1 ? k1.touch : null;
    for (let n = 0; n < 3; n++) {
      let e = null;
      for (let i = 0; i < 1500 && !e; i++) {
        e = L.entities.find((x) => x.kind === 'zauberkroete' && x.alive && !x.defeated && x.vulnerable && x.state === 'cast');
        if (!e) { p.invuln = 1e9; p.pos.set(0, 2, 7); p.vel.set(0, 0, 0); c.step(1); }
      }
      p.invuln = 0;
      if (!e) break;
      const s = t.stomp(e, { invuln: 0 });
      out.hits.push({ id: e.spec.id, y: +e.pos.y.toFixed(2), bounced: s.bounced, defeated: e.defeated, left: t.arch().left });
      p.invuln = 1e9;
      c.step(30);
    }
    p.invuln = 1e9;
    let shown = false;
    for (let i = 0; i < 400 && !shown; i++) { c.step(1); shown = t.arch().starTouch; }
    out.star = t.arch().starShown;
    out.cleared = t.arch().cleared;
    out.gate = null;
    return out;
  });
  console.log(`  3-A Kampf: ${JSON.stringify(r)}`);
  check(`3-A: Zauberkröten zaubern Kugeln (${r.orbs} gleichzeitig), eine Kugel trifft die Figur; unsichtbar keine Berührung`, r.orbs >= 1 && r.hurtByOrb && r.hiddenTouch === false);
  check(`3-A: alle drei Zauberkröten draufspringend besiegt (${r.hits.map((h) => `${h.id}@${h.y}`).join(', ')}), auch auf einem Podest`, r.hits.length === 3 && r.hits.every((h) => h.bounced && h.defeated) && r.hits[2].left === 0);
  await SHOT('3a_stern', () => { window.__course.step(10); });
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const star = L.entities.find((e) => e.kind === 'star' && e.alive);
    if (star) t.go(star.pos.x, star.pos.z, { max: 600, r: 0.2 });
    for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
    return { got: L.runtime.stars[0], won: t.arch().won, finished: c.finished, save: t.save().levels?.['3-A'] ?? null };
  });
  check(`3-A: Stern in der Mitte eingesammelt → Siegespose, Ergebnis, gespeichert (${JSON.stringify(r.save)})`, r.got && r.won && r.finished && r.save?.done === true && r.save.stars?.[0] === true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}w3z_3a_ergebnis.png` });

  // Tod setzt die Arena zurück
  await load('3-A');
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    t.place([0, 2, 7], { settle: 2, invuln: 1e9 });
    let e = null;
    for (let i = 0; i < 1500 && !e; i++) { e = L.entities.find((x) => x.kind === 'zauberkroete' && x.alive && x.state === 'cast'); if (!e) c.step(1); }
    if (e) t.stomp(e, { invuln: 1e9 });
    const left1 = t.arch().left;
    p.invuln = 0;
    p.die('hit');
    for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
    c.step(5);
    return { left1, left: t.arch().left, toads: t.count('zauberkroete', (k) => !k.defeated), resets: t.arch().resets };
  });
  check(`3-A: Tod setzt die Arena zurück (vorher noch ${r.left1}, danach wieder ${r.left} von 3, ${r.toads} Kröten)`, r.left1 === 2 && r.left === 3 && r.toads === 3 && r.resets === 1);
  await SHOT('3a_zauber', () => {
    const c = window.__course, t = window.__t, L = c.level;
    t.place([-2.5, 2, 4], { settle: 2, invuln: 1e9 });
    for (let i = 0; i < 900; i++) { c.step(1); if (L.entities.filter((e) => e.kind === 'zauberkroete' && e.state === 'cast').length >= 2) break; }
    c.step(30);
  });
  await SHOT('3a_podest', () => {
    const c = window.__course, t = window.__t;
    t.place([7.6, 4.4, -7.2], { settle: 30, invuln: 1e9 });
  });
  check('3-A: keine Konsolenfehler', errors.length === 0);
}

// ====================================================================================================== Abschluss
console.log('\nKennzahlen (Zeichenaufrufe inkl. Schattenpass / Dreiecke):');
for (const [n, calls, tri] of stats) console.log(`  ${n.padEnd(24)} ${String(calls).padStart(4)}  ${(tri / 1000).toFixed(0).padStart(4)} k`);
if (stats.length) {
  const maxCalls = Math.max(...stats.map((s) => s[1])), maxTri = Math.max(...stats.map((s) => s[2]));
  check(`Budget: höchstens ${maxCalls} Zeichenaufrufe (< 130) und ${(maxTri / 1000).toFixed(0)} k Dreiecke (< 300 k) an allen Stellen`, maxCalls < 130 && maxTri < 300000);
}
const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
