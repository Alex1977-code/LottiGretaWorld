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
      /** Nach vorn (−Z) bis kurz vor eine Kante gehen, dann hinüberspringen und über tz abbremsen (Gondel, Lücke). */
      hopTo(tz, o = {}) {
        const p = P();
        const edge = o.edge ?? tz + 1.9;
        for (let i = 0; i < 400 && p.pos.z > edge; i++) { c.setInput({ y: 0.6 }); c.step(1); }
        let left = false;
        for (let i = 0; i < 300; i++) {
          const over = p.pos.z < tz + (o.brake ?? 0.7);
          c.setInput({ y: over ? (p.vel.z < -0.3 ? -1 : 0) : 0.7, jump: i < (o.hold ?? 18) });
          c.step(1);
          if (p.mode !== 'ground') left = true;
          if (left && p.mode === 'ground') break;
          if (p.dead) break;
        }
        c.setInput({}); c.step(4);
        return p.mode === 'ground' && Math.abs(p.pos.z - tz) < 1.0 && (o.y === undefined || Math.abs(p.pos.y - o.y) < 0.2);
      },
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
    const out = { hits: [], hurtByOrb: false, orbs: 0, deaths: [] };
    const prevDef = L.onEnemyDefeated;
    L.onEnemyDefeated = (e) => { out.deaths.push([e.spec?.id, +L.time.toFixed(2), +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.state, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), e.state]); prevDef?.(e); };
    // Zauberkugel trifft (eine Kröte zaubert auf die Figur)
    for (let i = 0; i < 1200 && !out.hurtByOrb; i++) {
      c.step(1);
      out.orbs = Math.max(out.orbs, t.count('zauberkugel'));
      if (t.hurt()) out.hurtByOrb = true;
    }
    p.invuln = 0;
    // ohne Treffer: unsichtbare Kröte ist nicht zu treffen
    let k1 = null;
    for (let i = 0; i < 900 && !k1; i++) { k1 = L.entities.find((e) => e.kind === 'zauberkroete' && e.state === 'hidden' && e.stateT > 0.1) ?? null; if (!k1) { p.invuln = 1e9; c.step(1); } }
    p.invuln = 0;
    out.hiddenTouch = k1 ? k1.touch : null;
    for (let n = 0; n < 3; n++) {
      let e = null;
      // erster Treffer möglichst auf einem Eckpodest (y 4,4)
      const okE = (x, i) => x.kind === 'zauberkroete' && x.alive && !x.defeated && x.vulnerable && x.state === 'cast' && (n > 0 || i > 1400 || x.pos.y > 4);
      for (let i = 0; i < 2400 && !e; i++) {
        e = L.entities.find((x) => okE(x, i)) ?? null;
        if (!e) { p.invuln = 1e9; p.pos.set(0, 2, 7); p.vel.set(0, 0, 0); c.step(1); }
      }
      p.invuln = 0;
      if (!e) break;
      const s = t.stomp(e, { invuln: 0 });
      out.hits.push({ id: e.spec.id, y: +e.pos.y.toFixed(2), bounced: s.bounced, defeated: e.defeated, left: t.arch().left });
      // sofort weg (der Abprall soll nicht auf einer anderen Kröte landen)
      t.place([0, 2, 7], { settle: 2, invuln: 1e9 });
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
  check(`3-A: alle drei Zauberkröten draufspringend besiegt (${r.hits.map((h) => `${h.id}@${h.y}`).join(', ')}), eine davon auf einem Podest`, r.hits.length === 3 && r.hits.every((h) => h.bounced && h.defeated) && r.hits[2].left === 0 && r.hits.some((h) => h.y > 4));
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

// ====================================================================================================== 3-B
/** Boss-Hilfen (nach jedem Laden): Kampf betreten, Zustand abwarten (Figur geschützt), Teller-Sprung aufs Haupt. */
const BOSS_HELPERS = ([id, enterPos]) => {
  const c = window.__course, t = window.__t, L = c.level;
  t.boss = () => t.ent(id);
  t.enter = () => {
    t.place(enterPos, { settle: 2 });
    const a = c.arch.sub ?? c.arch;
    for (let i = 0; i < 400 && !a.started; i++) { c.setInput({ y: 0.7 }); c.step(1); }
    c.setInput({});
    return a.started;
  };
  t.bossArch = () => c.arch.sub ?? c.arch;
  t.untilSafe = (s, n = 1500, pos = null) => {
    const b = t.boss(), p = c.player;
    p.hurt = () => false;
    let i = 0;
    for (; i < n && b.state !== s; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); }
    delete p.hurt;
    return i;
  };
  t.noShots = () => { for (const e of L.entities) if (e.kind === 'schatten_bumerang' || e.kind === 'felsbrocken') e.kill(); c.step(1); };
  t.banners = [];
  for (const h of [c.arch?.hud, c.arch?.sub?.hud]) {
    if (!h || h._w3z) continue;
    const orig = h.banner.bind(h);
    h.banner = (text, o) => { t.banners.push(text); return orig(text, o); };
    h._w3z = true;
  }
};
const SNAKE_HELPERS = () => {
  const c = window.__course, t = window.__t;
  /** Vom Teller (Diener sv) aufs Haupt springen: Sprung halten, im Fallen über den Kopf lenken. */
  t.plateJump = (sv) => {
    const b = t.boss(), p = c.player;
    b.rainT = 99;
    for (const e of c.level.entities) if (e.kind === 'felsbrocken') e.kill();
    if (sv) t.place([sv.pos.x, sv.plateTop + 0.05, sv.pos.z], { settle: 14 });
    const standing = sv ? sv.standing : 0, y0 = p.pos.y;
    let apex = p.pos.y, hit = false, hurt = false;
    const hp0 = b.hp;
    c.setInput({ jump: true });
    for (let i = 0; i < 220; i++) {
      c.step(1);
      apex = Math.max(apex, p.pos.y);
      if (t.hurt()) hurt = true;
      const h = b.headWorld({});
      if (p.mode === 'air' && p.vel.y < 0) { p.pos.x += (h.x - p.pos.x) * 0.3; p.pos.z += (h.z - p.pos.z) * 0.3; }
      if (b.hp < hp0) { hit = true; break; }
      if ((p.mode === 'ground' || p.dead) && i > 5) break;
    }
    c.setInput({});
    return { standing, y0: +y0.toFixed(2), apex: +apex.toFixed(2), hit, hurt, hp: b.hp };
  };
  t.plate = (cracked = false) => {
    const b = t.boss();
    const up = b.servants.filter((s) => s.state === 'up' && !s.broken && s.cracked === cracked);
    return (!cracked && up.includes(b.target)) ? b.target : up[0] ?? null;
  };
};

if (want('3-B')) {
  console.log('\n3-B „Manege frei für den Schlangenkönig“');
  await load('3-B', { fresh: true });
  check('3-B: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
  let r = await sc(() => {
    const c = window.__course, L = c.level, d = L.data;
    return {
      title: d.title, arch: d.archetype, theme: d.theme, music: d.music, time: d.timeLimit, slots: d.starSlots,
      boss: L.entities.filter((e) => e.kind === 'schlangenkoenig').length, gondel: !!L.named.get('gondel'), pipe: L.named.get('roehre_ziel')?.hidden,
      seats: L._circus?.ring?.seats ?? 0,
    };
  });
  check(`3-B: „${r.title}“, Boss, Thema ${r.theme}, Musik ${r.music}, ${r.time} s, 1 Stern`, r.arch === 'boss' && r.theme === 'circus' && r.music === 'course_boss' && r.time === 400 && r.slots === 1);
  check(`3-B: Schlangenkönig, Seilbahn, versteckte Ziel-Röhre, Publikum (${r.seats} Plätze)`, r.boss === 1 && r.gondel && r.pipe === true && r.seats > 80);
  await SHOT('3b_vorplatz', () => { window.__course.step(30); });

  // Vorplatz: ?-Block mit Krallen-Anzug, Treppe ohne Springen, Seilbahn über die Schlucht
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    // von unten anstoßen, dann seitlich auf den Block springen (der Anzug liegt oben)
    t.place([2.8, 0, 4.0], { settle: 4 });
    c.setInput({ jump: true }); c.step(30); c.setInput({}); c.step(60);
    out.item = L.entities.find((e) => e.kind === 'powerup' && e.alive)?.power ?? null;
    t.place([2.8, 0, 5.6], { settle: 4 });
    for (let i = 0; i < 90 && p.power === 'none'; i++) { c.setInput({ y: i > 8 ? 0.45 : 0, jump: i < 40 }); c.step(1); }
    c.setInput({}); c.step(20);
    out.power = p.power;
    // Treppe: nur laufen
    t.place([0, 0, -7], { settle: 4, keepPower: true });
    let jumped = false;
    for (let i = 0; i < 600; i++) { c.setInput({ y: 1 }); c.step(1); if (p.mode === 'air' && p.vel.y > 2) jumped = true; if (p.pos.z < -22) break; }
    c.setInput({}); c.step(10);
    out.stairs = { y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(1), jumped };
    // in die Gondel (hineinspringen über das Geländer), mitfahren, auf dem Plateau aussteigen
    const g = L.named.get('gondel');
    out.waiting = g.state === 'wait' && g.u <= 0;
    let inGondel = t.hopTo(-28.6, { y: 4.6 });
    let u = 0, i = 0;
    for (; i < 120 * 14 && !(g.u >= 1 && g.state === 'wait'); i++) { c.step(1); u = g.u; }
    out.ride = { inGondel, u: +u.toFixed(2), secs: +(i / 120).toFixed(1), y: +p.pos.y.toFixed(2), dead: p.dead };
    // aussteigen: hinüberspringen aufs Plateau
    t.hopTo(-49.6, { y: 7, edge: -45.6, brake: 1.2 });
    c.step(20);
    out.plateau = { y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(1), cp: L.runtime.checkpoint?.pos ?? null };
    // Rückruf: wer an der Station wartet, holt die leere Gondel zurück
    t.place([0, 4.6, -25], { settle: 4 });
    let back = 0;
    for (; back < 120 * 12 && !(g.state === 'wait' && g.u <= 0); back++) c.step(1);
    out.recall = { u: g.u, state: g.state, secs: +(back / 120).toFixed(1) };
    return out;
  });
  console.log(`  3-B Weg: ${JSON.stringify(r)}`);
  check(`3-B: ?-Block auf dem Vorplatz gibt den Krallen-Anzug (${r.item} → ${r.power})`, r.item === 'krallen' && r.power === 'krallen');
  check(`3-B: Prachttreppe ohne Springen hinauf zur Seilbahnstation (y ${r.stairs.y})`, Math.abs(r.stairs.y - 4.5) < 0.05 && !r.stairs.jumped);
  check(`3-B: Seilbahn wartet an der Station, trägt über die Schlucht (${r.ride.secs} s), Ausstieg aufs Zeltplateau (y ${r.plateau.y}), Checkpoint; leer zurückgerufen (${r.recall.secs} s)`, r.waiting && r.ride.inGondel && r.ride.u >= 1 && !r.ride.dead && Math.abs(r.plateau.y - 7) < 0.05 && Array.isArray(r.plateau.cp) && r.recall.u <= 0 && r.recall.state === 'wait');
  await SHOT('3b_seilbahn', () => {
    const c = window.__course, t = window.__t, L = c.level, p = c.player;
    const g = L.named.get('gondel');
    t.place([0, 4.6, -25], { settle: 2, invuln: 1e9 });
    for (let i = 0; i < 120 * 8 && !(g.state === 'wait' && g.u <= 0 && g.t > 0.2); i++) c.step(1);
    t.hopTo(-28.6);
    for (let i = 0; i < 120 * 4 && g.u < 0.5; i++) c.step(1);
  });

  // Bosskampf: Teller-Weg, drei Treffer, Phasen, Sieg → Stern, Röhre → Hinterhof → Zielmast
  await sc(BOSS_HELPERS, ['koenig', [0, 7, -50]]);
  await sc(SNAKE_HELPERS);
  const sn = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    const b = t.boss();
    out.before = { state: b.state, tent: L._circus.tent?.k ?? null };
    out.started = t.enter();
    out.lock = t.bossArch().lockId !== null;
    // Tür zu: zurück nach draußen geht nicht
    const z0 = p.pos.z;
    t.place([0, 7, -57.5], { settle: 2, invuln: 1e9 });
    for (let i = 0; i < 200; i++) { c.setInput({ y: -1 }); c.step(1); }
    c.setInput({});
    out.locked = p.pos.z < -55.0;
    out.tent = L._circus.tent?.k ?? null;
    p.invuln = 0;
    t.untilSafe('lean', 900, [3, 7, -59]);
    for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(3, 7, -59); c.step(1); }
    delete p.hurt;
    const up = b.servants.filter((s) => s.state === 'up');
    out.summon = { n: up.length, tops: up.map((s) => +(s.plateTop - 7).toFixed(2)) };
    out.hits = [];
    out.phases = [];
    for (let k = 0; k < 3; k++) {
      if (k > 0) {
        t.untilSafe('lean', 1600, [0, 7, -58.5]);
        for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(0, 7, -58.5); c.step(1); }
        delete p.hurt;
      }
      const ups = b.servants.filter((s) => s.state === 'up');
      out.phases.push({ phase: b.phase, servants: ups.length, cracked: ups.filter((s) => s.cracked).length });
      out.hits.push(t.plateJump(t.plate(false)));
    }
    out.def = { hp: b.hp, defeated: b.defeated };
    out.cheer = L._circus.ring.cheerT > 0;
    t.untilSafe('gone', 900, [0, 7, -58.5]);
    c.step(2);
    out.winBanner = t.bossArch().hud.state().banner;
    c.step(148);
    const star = L.entities.find((e) => e.kind === 'star' && e.alive);
    const pipe = t.ent('roehre_ziel');
    out.after = { won: t.bossArch().won, star: !!star, pipe: !pipe.hidden, pipeK: +pipe.k.toFixed(2), banner: t.bossArch().hud.state().banner };
    if (star) t.go(star.pos.x, star.pos.z, { max: 600, r: 0.2 });
    out.starGot = !!L.runtime.stars[0];
    // Röhre → Hinterhof → Zielmast
    t.place([pipe.pos.x, pipe.pos.y + pipe.H + 0.3, pipe.pos.z], { settle: 40 });
    c.setInput({ crouch: true }); c.step(3); c.setInput({});
    let arrived = null;
    for (let i = 0; i < 400; i++) { c.step(1); if (p.pos.x > 40 && p.mode !== 'script') { arrived = [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]; break; } }
    out.arrived = arrived;
    const g = L.data.goal.pos;
    t.go(g[0] - 0.4, g[2] + 0.3, { max: 900 });
    for (let i = 0; i < 1200 && !c.finished; i++) c.step(1);
    out.finished = c.finished;
    out.save = t.save().levels?.['3-B'] ?? null;
    return out;
  });
  console.log(`  3-B Kampf: ${JSON.stringify(sn)}`);
  check(`3-B: Kampf beginnt in der Manege, Tor schließt sich (Sperre), vordere Zelthälfte ausgeblendet (k ${sn.tent})`, sn.before.state === 'wait' && sn.started && sn.lock && sn.locked && sn.tent === 1);
  check(`3-B: Diener-Schlangen mit Tellern auf 2,8 m (${sn.summon.n}: ${sn.summon.tops.join('/')})`, sn.summon.n === 3 && sn.summon.tops.every((y) => Math.abs(y - 2.8) < 0.02));
  check(`3-B: drei Treffer vom Teller aufs Haupt (Phasen ${sn.phases.map((x) => `${x.phase}: ${x.servants} Diener, ${x.cracked} rissig`).join(' · ')})`, sn.hits.length === 3 && sn.hits.every((h) => h.hit && !h.hurt && h.standing === 1) && sn.phases.map((x) => x.phase).join() === '1,2,3' && sn.phases[2].servants === 4 && sn.def.defeated);
  check(`3-B: Publikum jubelt, Stern erscheint und wird eingesammelt, Röhre fährt aus dem Boden („${sn.winBanner}“)`, sn.cheer && sn.after.won && sn.after.star && sn.starGot && sn.after.pipe && sn.after.pipeK === 1 && sn.winBanner === 'Ab in die Röhre!');
  check(`3-B: Röhre → Hinterhof (${sn.arrived}), Zielmast, gespeichert (${JSON.stringify(sn.save)})`, !!sn.arrived && sn.finished && sn.save?.done === true && sn.save.stars?.[0] === true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}w3z_3b_ergebnis.png` });

  // Bilder vom Kampf, Tod setzt den Kampf zurück
  await load('3-B');
  await sc(BOSS_HELPERS, ['koenig', [0, 7, -50]]);
  await sc(SNAKE_HELPERS);
  await sc(() => { window.__t.enter(); });
  await SHOT('3b_auftritt', () => { const c = window.__course; c.player.invuln = 1e9; c.step(70); });
  await SHOT('3b_teller', () => {
    const c = window.__course, t = window.__t;
    t.untilSafe('lean', 900, [0, 7, -58.5]); c.step(80);
    const sv = t.plate(false);
    if (sv) t.place([sv.pos.x, sv.plateTop + 0.05, sv.pos.z], { settle: 20, invuln: 1e9 });
  });
  await SHOT('3b_treffer', () => { const c = window.__course, t = window.__t; t.plateJump(null); c.step(8); });
  await SHOT('3b_phase3', () => {
    const c = window.__course, t = window.__t;
    t.untilSafe('lean', 1500, [0, 7, -58.5]); c.step(60); t.plateJump(t.plate(false));
    t.untilSafe('lean', 1500, [0, 7, -58.5]); c.step(70);
    c.player.pos.set(0, 7, -58.5);
  });
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const b = t.boss();
    p.invuln = 0;
    p.die('hit');
    for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
    c.step(5);
    return { state: b.state, hp: b.hp, servants: t.count('dienerschlange'), started: t.bossArch().started, deaths: t.bossArch().deaths, at: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)], lock: t.bossArch().lockId !== null };
  });
  check(`3-B: Tod im Kampf → Neustart am Zelteingang (${r.at.join(', ')}), König wieder 3/3, Tor offen`, r.state === 'wait' && r.hp === 3 && r.servants === 0 && !r.started && r.deaths === 1 && r.at[2] > -51 && !r.lock);
  await SHOT('3b_sieg', () => {
    const c = window.__course, t = window.__t, b = t.boss();
    t.enter(); c.player.invuln = 1e9;
    for (let k = 0; k < 3; k++) { t.untilSafe('lean', 1600, [0, 7, -58.5]); c.step(40); t.plateJump(t.plate(false)); }
    t.untilSafe('gone', 900, [0, 7, -58.5]); c.step(140);
    t.place([2, 7, -60], { settle: 20, invuln: 1e9 });
  });
  await SHOT('3b_hinterhof', () => {
    const c = window.__course, t = window.__t;
    t.place([52 - 4, 7.3, -64 + 3], { settle: 60, invuln: 1e9 });
  });
  check('3-B: keine Konsolenfehler', errors.length === 0);
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
