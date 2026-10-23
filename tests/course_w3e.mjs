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
// Teilprüfungen 3-Zug (ZUG=basis,lotti,greta,sterne,boss): zum schnellen Nachprüfen einzelner Teile
const ZPARTS = (process.env.ZUG ?? '').split(',').filter(Boolean);
const zpart = (n) => !ZPARTS.length || ZPARTS.includes(n);
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

// ====================================================================================================== 3-Zug
/** Zug-Hilfen (nach jedem Laden): Zug-Koordinate c, Fensterlage, Parken, Routen-Bot. */
const TRAIN_HELPERS = () => {
  const c = window.__course, t = window.__t, L = c.level, P = () => c.player;
  const TR = L.data.train;
  const ref = L.named.get('W1');
  t.cOf = (z) => TR.W1.cc - (z - ref.pos.z);
  t.at = (cc, x, y) => [x, y, ref.pos.z - (cc - TR.W1.cc)];
  t.cw = () => t.cOf(L.scroll.center.z);
  t.car = (id) => L.named.get(id);
  t.park = () => { const p = P(); p.invuln = 1e9; p.mode = 'script'; p.script = { type: 'test', t: 0 }; };
  /** bis die Fenstermitte bei Zug-Koordinate cc steht (Figur geparkt). */
  t.waitWin = (cc, max = 120 * 200) => { t.park(); let k = 0; while (t.cw() < cc && L.scroll.state !== 'done' && k < max) { c.step(1); k++; } return k; };
  /** Figur auf Zug-Koordinate cc, seitlich x setzen (Höhe: Deck/Dach darunter). */
  t.placeC = (cc, x, o = {}) => {
    const [X, , Z] = t.at(cc, x, 0);
    const hit = c.world.raycastDown(X, 12, Z, 14, { ignore: (s) => s.tag === 'riesenprojektil' || s.quicksand });
    return t.place([X, (hit?.y ?? 4) + 0.05, Z], o);
  };
  t.ground = () => P().ground?.mover?.vehicle?.spec?.id ?? P().ground?.tag ?? null;
  /** Tempo einer Entität (m/s, x und z) über einen Schritt gemessen. */
  t.velOf = (e) => { const x0 = e.pos.x, z0 = e.pos.z, t0 = L.time; c.step(1); const d = Math.max(1e-6, L.time - t0); return [(e.pos.x - x0) / d, (e.pos.z - z0) / d]; };
  /** Figur in der Luft über einem fahrenden Ziel absetzen: sie erbt dessen Tempo (wie nach einem Absprung). */
  t.placeMoving = (pos, vel, o = {}) => {
    t.place(pos, { ...o, settle: 0 });
    const st = c.arch.fstate(P());
    st.inh.x = vel[0]; st.inh.z = vel[1]; st.prev = 'air';
    if (o.settle) c.step(o.settle);
    return P().info();
  };
  const laneAt = (lane, cc) => {
    if (cc <= lane[0][0]) return lane[0][1];
    for (let i = 1; i < lane.length; i++) if (cc <= lane[i][0]) { const [c0, x0] = lane[i - 1], [c1, x1] = lane[i]; return x0 + (x1 - x0) * ((cc - c0) / (c1 - c0)); }
    return lane[lane.length - 1][1];
  };
  const SOLID = (s) => s.solid !== false && !s.oneWay && !s.trigger && !s.quicksand && !s.water && !s.kill && s.tag !== 'riesenprojektil';
  const groundAhead = (p, d, x = p.pos.x) => {
    const h = c.world.raycastDown(x, p.pos.y + 0.6, p.pos.z - d, 4.5, { ignore: (s) => s.tag === 'riesenprojektil' });
    return !!h && !h.shape.quicksand && !h.shape.kill && h.y > p.pos.y - 2.6;
  };
  const wallAhead = (p, d) => c.world.overlapAABB({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z - d }, { x: 0.22, y: 0.32, z: 0.12 }, { filter: SOLID }).length > 0;
  const farSide = (p) => { for (let d = 1.0; d < 6.5; d += 0.25) if (groundAhead(p, d)) return d; return Infinity; };
  /**
   * Routen-Bot über den fahrenden Zug bis zum Halt: lane = [[c, x], …], lead = Sollabstand vor der Fenstermitte.
   * Springt über Lücken und an Wagenstirnen hinauf, weicht Riesenprojektilen per Sprung aus.
   */
  t.bot = (lane, o = {}) => {
    const p = P(), w = L.scroll;
    const log = { jumps: 0, climbs: 0, dodges: 0, cars: [], deaths: 0, steps: 0, done: false, hurt: 0, maxC: -1e9 };
    let jumpHold = 0, prevJump = false, commit = false;
    const max = o.max ?? 120 * 160;
    const trace = [];
    for (let i = 0; i < max; i++) {
      log.steps = i;
      if (i % 30 === 0) { trace.push([+t.cOf(p.pos.z).toFixed(1), +p.pos.x.toFixed(1), +p.pos.y.toFixed(2), p.mode, p.state, t.ground(), +(t.cw()).toFixed(1)].join(' ')); if (trace.length > 24) trace.shift(); }
      if (p.dead) { log.deaths++; log.deathAt = +t.cOf(p.pos.z).toFixed(1); log.cause = p.deathCause; log.trace = trace; break; }
      const cp = t.cOf(p.pos.z), cw = t.cw();
      log.maxC = Math.max(log.maxC, cp);
      if (w.state === 'done' && p.mode === 'ground' && cp >= (o.stopC ?? 147)) { log.done = true; break; }
      const id = t.ground();
      if (id && log.cars[log.cars.length - 1] !== id && /^[A-Z]/.test(id)) log.cars.push(id);
      const lx = laneAt(lane, cp + 0.8);
      const inp = { x: Math.max(-1, Math.min(1, (lx - p.pos.x) * 1.6)) };
      const ahead = cw + (o.lead ?? 1.6);
      let jump = false;
      if (p.mode === 'ground') {
        commit = false;
        let edge = Infinity;
        for (let d = 0.5; d < 3.4; d += 0.25) if (!groundAhead(p, d)) { edge = d; break; }
        let far = Infinity;
        if (edge < Infinity) { const pz = p.pos.z; p.pos.z -= edge - 0.25; far = farSide(p) + edge - 0.25; p.pos.z = pz; }
        const ready = far < 7.5 && cp + far + 1.2 < cw + 7.4;
        // Riesenprojektil im Anflug auf Figurenhöhe → hochspringen
        const bullet = L.entities.find((e) => e.kind === 'riesenprojektil' && !e.removed && e.state !== 'fall' && Math.abs(e.pos.z - p.pos.z) < 2.9 && e.pos.x < p.pos.x + 0.5 && p.pos.x - e.pos.x < 5.2 && p.pos.y + 1 > e.pos.y && p.pos.y < e.pos.y + 2.4);
        if (bullet && !o.noDodge) { jump = true; log.dodges++; inp.y = 0; }
        else if (edge <= 0.75) {
          if (ready && p.gs > 2.5) { jump = true; inp.y = 1; commit = true; log.jumps++; }
          else inp.y = -0.5;
        } else if (wallAhead(p, 0.55) && cp < ahead + 4) { jump = true; inp.y = 1; commit = true; log.climbs++; }
        else if (edge < 1.4) inp.y = ready ? 1 : 0;
        else if (edge < 3.4) inp.y = ready ? 1 : (cp < ahead ? 0.5 : 0);
        else if (cp < ahead) inp.y = 1;
        if (o.stopC !== undefined && cp >= o.stopC && edge > 0.75) inp.y = 0;
      } else if (commit) inp.y = 1;
      if (jump && !prevJump) jumpHold = 34;
      inp.jump = jumpHold > 0;
      if (jumpHold > 0) jumpHold--;
      prevJump = inp.jump;
      c.setInput(inp);
      c.step(1);
      if (p.invuln > 0 && p.invuln < 1e8) log.hurt++;
    }
    c.setInput({});
    log.finalC = +t.cOf(p.pos.z).toFixed(1);
    log.stars = [...(L.runtime.stars ?? [])];
    log.stamp = !!L.runtime.stamp;
    log.cp = !!L.runtime.checkpoint;
    return log;
  };
};

// Spur der Bots: [c, x] – Stamm-Spur x 0.9 (an Röhren vorbei), durch den Postwagen in der Mitte
const LANE = [[0, 0.3], [70, 0.3], [75, 0.9], [96.5, 0.9], [97.6, 0], [107.5, 0], [108.5, 0.9], [140, 0.6], [147, 0], [160, 0]];

if (want('3-Zug')) {
  console.log('\n3-Zug „Volldampf durchs Schneetal“');
  await load('3-Zug', { fresh: true });
  check('3-Zug: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
  await sc(TRAIN_HELPERS);
  let r;
  if (zpart('basis')) {
  r = await sc(() => {
    const c = window.__course, L = c.level, d = L.data;
    const kinds = {};
    for (const e of L.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    return {
      title: d.title, arch: d.archetype, sub: d.scroll.with, theme: d.theme, music: d.music, time: d.timeLimit, kinds,
      cars: L.entities.filter((e) => e.kind === 'vehicle').map((e) => `${e.spec.id}:${e.style}`), stars: d.stars.length, stamp: !!d.stamp,
      ride: { T: +d.zug.ride.T.toFixed(1), D: +d.zug.ride.D.toFixed(1) },
    };
  });
  console.log(`  Arten: ${JSON.stringify(r.kinds)}  Fahrt ${JSON.stringify(r.ride)}`);
  check(`3-Zug: „${r.title}“, autoscroller + ${r.sub}, Thema ${r.theme}, Musik ${r.music}, ${r.time} s`, r.arch === 'autoscroller' && r.sub === 'boss' && r.theme === 'train' && r.music === 'course_train' && r.time === 400);
  check(`3-Zug: Schneetal-Express (Lok + 14 Wagen) und Brummbär-Zug (11 Wagen) mit Modell zug_waggon`, r.cars.length === 26 && r.cars.filter((x) => x.endsWith(':lok')).length === 2);
  check(`3-Zug: Gegner – Hüpfquallen ${r.kinds.huepfqualle}, Riesenkanonen ${r.kinds.riesenkanone}, Suchkopf-Kanone ${r.kinds.kanone_turm}, Pilzlingsturm, Feuer-Werfer ${r.kinds.feuer_werfer}, Schattenläuferin`, r.kinds.huepfqualle >= 5 && r.kinds.riesenkanone === 4 && r.kinds.kanone_turm === 1 && r.kinds.pilzlingsturm === 1 && r.kinds.feuer_werfer === 3 && r.kinds.schattenlaeuferin === 1);
  check(`3-Zug: 3 Sterne (Wagenkante, Pilzlingsturm, Krümel) + Stempel, Röhren und Krümel`, r.stars === 1 && r.stamp && r.kinds.zugroehre === 5 && r.kinds.star >= 2);
  await SHOT('zug_bahnsteig', () => { window.__course.step(30); });

  // Nicht aufgesprungen = Leben verloren
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    let n = 0, t0 = null;
    for (; n < 120 * 30 && !p.dead; n++) { c.setInput({}); c.step(1); if (t0 === null && L.scroll.state === 'run') t0 = L.time; }
    return { dead: p.dead, cause: p.deathCause, depart: t0, secs: +(n / 120).toFixed(1), z: +p.pos.z.toFixed(1) };
  });
  check(`3-Zug: Abfahrt nach 3,5 s (${r.depart?.toFixed(2)}); wer auf dem Bahnsteig bleibt, wird ans Ende geschoben und stürzt ab (${r.cause} nach ${r.secs} s)`, near(r.depart, 3.5, 0.05) && r.dead && r.cause === 'fall');

  // Aufspringen und Stern 0 an der Hinterkante des letzten Wagens
  await load('3-Zug');
  await sc(TRAIN_HELPERS);
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    // vom Bahnsteig quer aufs Dach von W1 springen
    for (let i = 0; i < 90; i++) { c.setInput({ x: -1, jump: i < 30, run: false }); c.step(1); if (p.mode === 'ground' && i > 10) break; }
    c.setInput({}); c.step(4);
    out.board = { ground: t.ground(), y: +p.pos.y.toFixed(2), time: +L.time.toFixed(2) };
    // nach hinten zur Wagenkante laufen (Stern 0)
    for (let i = 0; i < 400 && !L.runtime.stars[0]; i++) { c.setInput({ y: -1, x: (0 - p.pos.x) }); c.step(1); }
    c.setInput({});
    out.star = !!L.runtime.stars[0];
    out.at = { c: +t.cOf(p.pos.z).toFixed(2), time: +L.time.toFixed(2), state: L.scroll.state };
    return out;
  });
  check(`3-Zug: vom Bahnsteig aufs Wagendach (${r.board.ground}), Stern 0 an der Hinterkante (c ${r.at.c}, ${r.at.time} s, Fenster ${r.at.state})`, r.board.ground === 'W1' && r.star);
  }

  // Routen-Bot Lotti
  const BOT_RUN = (lane) => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    t.place([3.2, 1.15, p.pos.z], { settle: 2, invuln: 1e9 });
    // aufspringen: quer aufs Dach
    for (let i = 0; i < 90; i++) { c.setInput({ x: -1, jump: i < 30 }); c.step(1); if (p.mode === 'ground' && i > 10) break; }
    c.setInput({});
    const log = t.bot(lane, { lead: 1.4 });
    log.bullets = ['rk1', 'rk2', 'rk3', 'rk4'].map((id) => t.ent(id)?.shots ?? 0);
    log.heads = t.ent('suchkanone')?.shots ?? 0;
    log.state = L.scroll.state;
    log.pushes = t.arch().pushes;
    log.hero = p.hero;
    if (!log.deaths) delete log.trace;
    return log;
  };
  if (zpart('lotti')) {
  await load('3-Zug');
  await sc(TRAIN_HELPERS);
  const botL = await sc(BOT_RUN, LANE);
  console.log(`  Bot Lotti: ${JSON.stringify(botL)}`);
  check(`3-Zug Lotti: Route bis zum Zughalt ohne Tod (c ${botL.finalC}, ${botL.jumps} Lückensprünge, ${botL.climbs} Kletter-Sprünge, ${botL.dodges} Ausweichsprünge)`, botL.done && botL.deaths === 0 && botL.state === 'done');
  check(`3-Zug Lotti: trägt jeder Wagen des Express (${botL.cars.join(' → ')})`, ['W1', 'W2', 'F1', 'W3', 'W4', 'F2', 'W5', 'F3', 'W6', 'G1', 'F4', 'W7', 'B1', 'T1', 'L1'].every((id) => botL.cars.includes(id)));
  check(`3-Zug: Riesenkanonen feuern (${botL.bullets.join('/')}), Suchkopf-Kanone (${botL.heads})`, botL.bullets.every((n) => n >= 1) && botL.heads >= 2);
  await SHOT('zug_halt', () => { window.__course.step(60); });
  }

  // Routen-Bot Greta
  if (zpart('greta')) {
  await load('3-Zug', { hero: 'greta' });
  await sc(TRAIN_HELPERS);
  const botG = await sc(BOT_RUN, LANE);
  console.log(`  Bot Greta: ${JSON.stringify(botG)}`);
  check(`3-Zug Greta (${botG.hero}): Route bis zum Zughalt ohne Tod (c ${botG.finalC}, ${botG.climbs} Kletter-Sprünge, ${botG.dodges} Ausweichsprünge)`, botG.hero === 'greta' && botG.done && botG.deaths === 0 && botG.state === 'done');
  }

  // Vollständiger Lauf: Stern 0, Riesenprojektil, Pilzlingsturm (Stern 1), Kontrollpunkt, Geheimröhre + Krümel
  // (Stern 2), Postwagen (Stempel), Riesentrank + Steinblöcke, Bonuswagen, Lok-Röhre, Schattenläuferin, Baron, Ziel
  if (zpart('komplett')) {
  await load('3-Zug', { fresh: true });
  await sc(TRAIN_HELPERS);
  await sc(BOSS_HELPERS, ['schatten', [30, 1.6, -735.15]]);
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    for (let i = 0; i < 90; i++) { c.setInput({ x: -1, jump: i < 30 }); c.step(1); if (p.mode === 'ground' && i > 10) break; }
    for (let i = 0; i < 400 && !L.runtime.stars[0]; i++) { c.setInput({ y: -1, x: (0 - p.pos.x) }); c.step(1); }
    c.setInput({});
    out.star0 = !!L.runtime.stars[0];
    // Riesenprojektil: auf einem landen und mitfahren
    t.waitWin(25);
    t.placeC(t.cw(), 0, { settle: 2, invuln: 1e9 });
    let b = null;
    for (let i = 0; i < 120 * 14 && !b; i++) { c.step(1); b = L.entities.find((e) => e.kind === 'riesenprojektil' && !e.removed && e.state === 'fly' && e.pos.x < -4.2); }
    out.bullet = !!b;
    if (b) {
      const bv = t.velOf(b);
      t.placeMoving([b.pos.x, b.pos.y + 2.4, b.pos.z], bv, { invuln: 1e9 });
      const x0 = p.pos.x, bx0 = b.pos.x;
      let on = 0;
      for (let i = 0; i < 70; i++) { c.setInput({}); c.step(1); if (p.ground && (p.ground.tag === 'riesenprojektil' || p.ground.owner === b)) on++; }
      out.ride = { on, dx: +(p.pos.x - x0).toFixed(2), bdx: +(b.pos.x - bx0).toFixed(2), dz: +(p.pos.z - b.pos.z).toFixed(2), tag: p.ground?.tag ?? null };
      // Treffer: das nächste Projektil fliegt in die Figur auf dem Wagendach
      let b2 = null;
      t.placeC(t.cw(), 0, { settle: 4, invuln: 1e9 });
      // nächstes Projektil, das über ein Wagendach (nicht über einen Flachwagen) fliegen wird
      const roofAt = (z) => (c.world.raycastDown(0, 12, z, 14, { ignore: (sh) => sh.tag === 'riesenprojektil' || sh.quicksand })?.y ?? 0) > 3;
      for (let i = 0; i < 120 * 14 && !b2; i++) { c.step(1); b2 = L.entities.find((e) => e !== b && e.kind === 'riesenprojektil' && !e.removed && e.state === 'fly' && e.pos.x < -4.5 && roofAt(e.pos.z)); }
      if (b2) {
        t.place([0, 3.8, b2.pos.z], { settle: 0, invuln: 1e9 });
        let hurt = false;
        p.invuln = 0;
        for (let i = 0; i < 120 * 4 && !hurt && !b2.removed; i++) {
          p.pos.z = b2.pos.z; p.pos.x = Math.min(0.9, Math.max(-0.9, p.pos.x));
          c.setInput({}); c.step(1);
          hurt = p.invuln > 0.2 || p.dead;
        }
        out.bulletHurt = hurt;
        out.hurtInfo = { y: +p.pos.y.toFixed(2), by: +b2.pos.y.toFixed(2), bx: +b2.pos.x.toFixed(2), px: +p.pos.x.toFixed(2), ground: t.ground(), big: p.big };
        p.invuln = 1e9;
      }
    }
    // Pilzlingsturm auf F2 (Halt des Bildfensters): Stufe für Stufe von oben → Stern 1
    t.waitWin(57.6);
    const turm = t.ent('turm');
    out.turm = { count0: turm.count, stomps: [] };
    for (let k = 0; k < 7 && !turm.defeated && turm.count > 0; k++) {
      t.placeMoving([turm.pos.x, turm.pos.y + (turm.height ?? turm.half.y * 2) + 0.9, turm.pos.z], t.velOf(t.car('F2')), { invuln: 1e9 });
      for (let i = 0; i < 160; i++) {
        c.setInput({}); c.step(1);
        if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = turm.pos.x; p.pos.z = turm.pos.z; }
        if (i > 2 && p.mode === 'air' && p.vel.y > 4) break;
        if (p.mode === 'ground') break;
      }
      out.turm.stomps.push(turm.count);
      t.placeC(t.cOf(turm.pos.z) - 3.2, -0.9, { settle: 30, invuln: 1e9 });
    }
    c.step(60);
    const s1 = L.entities.find((e) => e.kind === 'star' && e.index === 1 && !e.removed);
    out.turm.star = !!s1;
    if (s1) for (let i = 0; i < 40 && !L.runtime.stars[1]; i++) { t.place([s1.pos.x, s1.pos.y - 0.4, s1.pos.z], { invuln: 1e9 }); c.step(2); }
    out.star1 = !!L.runtime.stars[1];
    // Kontrollpunkt auf dem Dach von W5
    const cp = L.entities.find((e) => e.kind === 'checkpoint' && e.spec.attach === 'W5');
    for (let i = 0; i < 30 && !L.runtime.checkpoint; i++) { t.place([cp.pos.x, cp.pos.y + 0.1, cp.pos.z], { invuln: 1e9 }); c.step(4); }
    out.cp = !!L.runtime.checkpoint;
    return out;
  });
  console.log(`  Lauf 1: ${JSON.stringify(r)}`);
  check('3-Zug: Stern 0 an der Hinterkante gleich am Start', r.star0);
  check(`3-Zug: auf einem Riesenprojektil landen und mitfahren (${r.ride?.on}/70 Schritte oben, Figur Δx ${r.ride?.dx} wie Projektil ${r.ride?.bdx}), Treffer verletzt (${r.bulletHurt})`, r.bullet && r.ride.on > 50 && Math.abs(r.ride.dx - r.ride.bdx) < 0.4 && r.ride.dx > 2 && r.bulletHurt === true);
  check(`3-Zug: Pilzlingsturm Stufe für Stufe abgetragen (${r.turm.count0} → ${r.turm.stomps.join(' → ')}), Stern 1 eingesammelt`, r.turm.stomps.at(-1) === 0 && r.star1);
  check('3-Zug: Kontrollpunkt auf dem fahrenden Wagen W5 aktiviert', r.cp);
  await SHOT('zug_pilzlingsturm', () => { const t = window.__t; t.placeC(t.cw() + 1, 0.6, { settle: 20, invuln: 1e9 }); });

  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    // Neustart am Kontrollpunkt: Fenster und Zug wie beim Aktivieren
    p.invuln = 0; p.die('hit');
    for (let i = 0; i < 900 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
    c.step(30);
    out.respawn = { ground: t.ground(), state: L.scroll.state, c: +t.cOf(p.pos.z).toFixed(1), cw: +t.cw().toFixed(1) };
    // Geheimröhre auf F3 → Brummbär-Zug (PX), Krümel befreien, Rückröhre → Dach von W6
    t.waitWin(79.05);
    const hin = t.ent('roehre_hin'), px = t.ent('roehre_px'), rueck = t.ent('roehre_rueck'), w6 = t.ent('roehre_w6');
    const vt = t.velOf(t.car('F3'));
    t.placeMoving([hin.pos.x, hin.pos.y + hin.H + 0.05, hin.pos.z], vt, { settle: 30, invuln: 1e9 });
    out.onPipe = t.ground();
    c.setInput({ crouch: true }); c.step(3); c.setInput({});
    out.modeAfter = p.mode;
    let arrived = null;
    for (let i = 0; i < 900; i++) { c.step(1); if (p.mode !== 'script' && Math.abs(p.pos.x - px.pos.x) < 2.5) { c.step(30); arrived = t.ground(); break; } }
    out.px = arrived;
    const kiste = t.ent('kiste_kruemel'), k = L._zugScene.kruemel;
    out.kruemel0 = k.state;
    t.placeMoving([kiste.pos.x, kiste.pos.y + 1.3 + 1.2, kiste.pos.z], t.velOf(t.car('PX')), { invuln: 1e9 });
    c.setInput({ crouch: true }); c.step(60); c.setInput({}); c.step(20);
    out.crate = !!(kiste.removed || !kiste.alive);
    for (let i = 0; i < 240 && k.state !== 'cheer'; i++) c.step(1);
    out.kruemel1 = k.state;
    c.step(20);
    const s2 = L.entities.find((e) => e.kind === 'star' && e.index === 2 && !e.removed);
    out.star = !!s2;
    if (s2) for (let i = 0; i < 40 && !L.runtime.stars[2]; i++) { t.place([s2.pos.x, s2.pos.y - 0.4, s2.pos.z], { invuln: 1e9 }); c.step(2); }
    out.star2 = !!L.runtime.stars[2];
    t.placeMoving([rueck.pos.x, rueck.pos.y + rueck.H + 0.05, rueck.pos.z], t.velOf(t.car('PX')), { settle: 30, invuln: 1e9 });
    c.setInput({ crouch: true }); c.step(3); c.setInput({});
    let back = null;
    for (let i = 0; i < 900; i++) { c.step(1); if (p.mode !== 'script' && Math.abs(p.pos.x - w6.pos.x) < 2.5) { c.step(30); back = t.ground(); break; } }
    out.back = back;
    for (let i = 0; i < 600 && !['pipe', 'gone'].includes(k.state); i++) c.step(1);
    out.kruemel2 = k.state;
    return out;
  });
  console.log(`  Lauf 2: ${JSON.stringify(r)}`);
  check(`3-Zug: Tod → Neustart am Kontrollpunkt auf ${r.respawn.ground} (Fenster ${r.respawn.state} bei c ${r.respawn.cw})`, r.respawn.ground === 'W5' && r.respawn.state === 'run');
  check(`3-Zug: Geheimröhre F3 → Brummbär-Zug (${r.px}), Kiste zerstampft, Krümel befreit (${r.kruemel0} → ${r.kruemel1}), Stern 2, Rückröhre aufs Dach von ${r.back} (Krümel: ${r.kruemel2})`, r.px === 'PX' && r.crate && r.kruemel1 === 'cheer' && r.star2 && r.back === 'W6' && ['pipe', 'gone'].includes(r.kruemel2));

  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    // Postwagen: durch die Dachluke hinein, Stempel neben dem Feuer-Werfer
    t.waitWin(100.6);
    const TR = L.data.train, g1 = t.car('G1');
    t.placeC(TR.G1.cc - 0.6, 0, { settle: 20, invuln: 1e9 });
    out.roof = t.ground();
    for (let i = 0; i < 240 && p.pos.y > g1.pos.y + 3.0; i++) { c.setInput({ y: -0.6 }); c.step(1); }
    c.setInput({});
    for (let i = 0; i < 120; i++) { c.step(1); if (p.mode === 'ground') break; }
    c.step(10);
    out.post = { inside: L._zugScene.post.inside, y: +(p.pos.y - g1.pos.y).toFixed(2), werfer: !!t.ent('post_werfer')?.alive };
    const st = L.entities.find((e) => e.kind === 'stamp' && !e.removed);
    if (st) t.go(st.pos.x, st.pos.z, { max: 300, r: 0.25 });
    out.stamp = !!L.runtime.stamp;
    // Riesentrank: versteckter Block über dem Deck von F4, dann die Steinblöcke zertrümmern
    t.waitWin(110.4);
    const blk = t.ent('block_riese');
    t.placeC(t.cOf(blk.pos.z), blk.pos.x, { settle: 10, invuln: 1e9 });
    c.setInput({ jump: true }); c.step(24); c.setInput({}); c.step(60);
    const pu = L.entities.find((e) => e.kind === 'powerup' && !e.removed && /riese/.test(e.power ?? e.spec?.power ?? ''));
    out.potion = !!pu;
    if (pu) for (let i = 0; i < 40 && p.power !== 'riese'; i++) { t.place([pu.pos.x, pu.pos.y + 0.2, pu.pos.z], { invuln: 1e9, keepPower: true }); c.step(3); }
    out.riese = p.power;
    const n0 = t.count('steinblock');
    t.placeC(TR.F4.cc - 1.2, 0, { settle: 6, invuln: 1e9, keepPower: true });
    const c0 = t.cOf(p.pos.z);
    for (let i = 0; i < 480 && t.count('steinblock') > 0; i++) { c.setInput({ y: 1, x: -p.pos.x }); c.step(1); }
    c.setInput({}); c.step(20);
    out.blocks = n0 - t.count('steinblock');
    out.giant = { c0: +c0.toFixed(1), c1: +t.cOf(p.pos.z).toFixed(1), power: p.power, blocksAt: L.entities.filter((e) => e.kind === 'steinblock' && e.alive).map((e) => +t.cOf(e.pos.z).toFixed(1)) };
    // Bonuswagen: acht Kisten (sieben Münzen, ein Extraleben)
    t.waitWin(130.5);
    if (p.power === 'riese') p.setPower('none');
    const coins0 = L.runtime.coins, lives0 = L.runtime.livesGained;
    for (let i = 0; i < 8; i++) {
      const k = t.ent(`bonus${i}`);
      if (!k || k.removed || !k.alive) continue;
      t.placeMoving([k.pos.x, k.pos.y + 1 + 1.0, k.pos.z], t.velOf(t.car('B1')), { invuln: 1e9 });
      c.setInput({ crouch: true }); c.step(45); c.setInput({}); c.step(4);
    }
    out.bonus = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => { const k = t.ent(`bonus${i}`); return !k || k.removed || !k.alive; }).length;
    for (let j = 0; j < 3; j++) {
      const up = L.entities.find((e) => e.kind === 'powerup' && !e.removed && /oneup/.test(e.power ?? e.spec?.power ?? ''));
      if (!up) break;
      t.place([up.pos.x, up.pos.y + 0.1, up.pos.z], { invuln: 1e9 }); c.step(4);
    }
    c.step(30);
    out.coins = L.runtime.coins - coins0;
    out.lives = L.runtime.livesGained - lives0;
    return out;
  });
  console.log(`  Lauf 3: ${JSON.stringify(r)}`);
  check(`3-Zug: Postwagen durch die Dachluke (innen ${r.post.inside}, Feuer-Werfer wacht ${r.post.werfer}), Stempel eingesammelt`, r.post.inside && r.post.werfer && r.stamp);
  check(`3-Zug: versteckter Block auf F4 → Riesentrank (${r.riese}), ${r.blocks} Steinblöcke zertrümmert`, r.potion && r.riese === 'riese' && r.blocks === 3);
  check(`3-Zug: Bonuswagen – ${r.bonus}/8 Kisten, +${r.coins} Münzen, +${r.lives} Leben`, r.bonus === 8 && r.coins >= 7 && r.lives === 1);
  await SHOT('zug_bonuswagen', () => { const t = window.__t; t.placeC(t.cw() + 1, 0, { settle: 20, invuln: 1e9 }); });

  // Halt, Lok-Röhre → Drehscheibe
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    t.waitWin(999);
    const TR = L.data.train;
    t.placeC(TR.T1.cc, 0, { settle: 4, invuln: 1e9 });
    c.step(260);
    const luke = t.ent('luke');
    out.luke = { open: luke.open, banner: t.banners.includes('Ab durch die Röhre auf der Lok!') };
    t.place([luke.pos.x, luke.pos.y + luke.H + 0.3, luke.pos.z], { settle: 20, invuln: 1e9 });
    c.setInput({ crouch: true }); c.step(3); c.setInput({});
    let arena = null;
    for (let i = 0; i < 900; i++) { c.step(1); if (p.mode !== 'script' && Math.abs(p.pos.x - 30) < 12) { c.step(20); arena = [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]; break; } }
    out.arena = arena;
    return out;
  });
  console.log(`  Halt: ${JSON.stringify(r)}`);
  check(`3-Zug: beim Halt öffnet die Lok-Röhre („Ab durch die Röhre auf der Lok!“ ${r.luke.banner}), sie führt in den Lokschuppen (${r.arena})`, r.luke.open && r.luke.banner && !!r.arena);
  await SHOT('zug_arena', () => { window.__course.step(30); });

  // Schattenläuferin in drei Phasen, danach Baron Brummbär
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = { phases: [], hits: [] };
    const b = t.boss(), home = [30, 1.6, -735.15];
    out.started = t.enter();
    for (let k = 0; k < 3; k++) {
      t.untilSafe('throw', 2400, home);
      for (let j = 0; j < 4 && t.count('schatten_doppelgaenger') === 0; j++) { t.untilSafe('teleport', 1500, home); t.untilSafe('throw', 1500, home); }
      out.phases.push({ phase: b.phase, clones: t.count('schatten_doppelgaenger'), hp: b.hp });
      const hp0 = b.hp;
      t.noShots();
      const s = t.stomp(b, { invuln: 1e9 });
      out.hits.push({ hit: b.hp < hp0, bounced: s.bounced });
      t.place(home, { settle: 2, invuln: 1e9 });
    }
    out.def = ['defeated', 'flee', 'gone'].includes(b.state) || !!b.defeated;
    t.untilSafe('gone', 900, home);
    const zs = L._zugScene;
    c.step(30);
    out.baron = { active: !!zs.baron.active, state: zs.baron.state };
    for (let i = 0; i < 120 * 16 && zs.baron.active; i++) { p.pos.set(...home); c.step(1); }
    out.baronEnd = zs.baron.state;
    out.banners = t.banners.slice(-6);
    const w = t.ent('warp_sieg');
    out.warp = !!w && !w.hidden;
    return out;
  });
  console.log(`  Boss: ${JSON.stringify(r)}`);
  check(`3-Zug: Kampf beginnt auf der Drehscheibe, Doppelgänger je Phase ${r.phases.map((x) => x.clones).join(' / ')}`, r.started && r.phases.map((x) => x.clones).join() === '2,3,5');
  check(`3-Zug: drei Treffer auf das Original mit Schleife (${r.hits.map((h) => (h.hit ? '✓' : '✗')).join('')}), Schattenläuferin besiegt`, r.hits.every((h) => h.hit) && r.def);
  check(`3-Zug: Baron Brummbär braust heran, schimpft und flieht (${r.baron.state} → ${r.baronEnd}), „Welt 3 geschafft!“, Warp-Box`, r.baron.active && r.banners.includes('Welt 3 geschafft!') && r.warp);

  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player, L = c.level;
    const out = {};
    const w = t.ent('warp_sieg');
    t.place([w.pos.x, (w.top ?? w.pos.y + 1.2) + 0.4, w.pos.z], { settle: 0, invuln: 1e9 });
    let arrived = null;
    for (let i = 0; i < 600; i++) { c.step(1); if (Math.abs(p.pos.x - 4.6) < 3 && p.mode === 'ground') { arrived = [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]; break; } }
    out.arrived = arrived;
    const g = L.data.goal.pos;
    t.go(g[0] - 0.4, g[2] + 3, { max: 900 });
    const kz = L._zugScene.land?.kruemelZiel;
    out.kruemelZiel = { visible: !!kz?.on, said: !!kz?.said };
    return out;
  });
  console.log(`  Ziel 1: ${JSON.stringify(r)}`);
  check(`3-Zug: Warp-Box → Zielbahnsteig (${r.arrived}), Krümel wartet und jubelt (${JSON.stringify(r.kruemelZiel)})`, !!r.arrived && r.kruemelZiel.visible && r.kruemelZiel.said);
  await SHOT('zug_ziel', () => {});
  r = await sc(() => {
    const c = window.__course, t = window.__t, L = c.level;
    const g = L.data.goal.pos;
    t.go(g[0] - 0.4, g[2] + 0.3, { max: 900 });
    for (let i = 0; i < 1500 && !c.finished; i++) c.step(1);
    return { finished: c.finished, save: t.save().levels?.['3-Zug'] ?? null };
  });
  console.log(`  Ziel 2: ${JSON.stringify(r)}`);
  check(`3-Zug: Zielmast erreicht, gespeichert mit drei Sternen und Stempel (${JSON.stringify(r.save)})`, r.finished && r.save?.done === true && r.save.stars?.length === 3 && r.save.stars.every((x) => x === true) && r.save.stamp === true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}w3z_zug_ergebnis.png` });
  }
  check('3-Zug: keine Konsolenfehler', errors.length === 0);
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
