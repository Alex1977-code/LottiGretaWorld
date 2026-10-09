// Kurs-Modus: Kampf-Level von Welt 1 deterministisch prüfen – Arena 1-A (zwei Rammbock-Bullen, Stern erst nach dem
// Sieg, Einsammeln beendet und speichert, Tod setzt die Arena zurück) und Bosslevel 1-Burg (Kanonen, graue
// Blockwände per Bombe, Warp-Boxen, Sterne und Stempel, Krallenrad, Pflichtsprünge, Bosskampf gegen Baron Brummbär
// mit drei Treffern, Phasen mit Doppelwurf und Feuerspur, Flucht, Zielbereich mit befreitem Krümel, Ergebnis
// gespeichert) – für Lotti und Greta. Danach Screenshots tests/out/w1c_*.png und Kennzahlen (Zeichenaufrufe < 120,
// Dreiecke < 300 k). Simulation nur über window.__course.step(n) / setInput; Teleport erlaubt.
// Aufruf: PORT_BASE=2300 node tests/course_w1_combat.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4197;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SAVE = 'lotti-greta-course-v1';
const stats = [];

async function load(id, { hero = 'lotti', fresh = false } = {}) {
  if (fresh) {
    await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`, { waitUntil: 'load' });
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
  }
  await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
  } catch {
    console.log(`${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc((h) => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    c.setHero(h);
    const P = () => c.player;
    const L = c.level;
    window.__t = {
      ent: (id) => L.named.get(id),
      /** Figur setzen (groß, ohne Power-up) und landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null); c.setInput({});
        p.dead = false; p.holding = null;
        p.big = o.big ?? true;
        if (o.power) p.setPower(o.power); else if (p.power !== 'none') p.setPower('none');
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.invuln = 0;
        L.runtime.status = L.runtime.status === 'dying' ? 'play' : L.runtime.status;
        L.controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        c.step(o.settle ?? 20);
        return p.info();
      },
      /** Von oben auf e fallen, bis Abprall oder Landung. */
      stomp(e, o = {}) {
        const p = P();
        const top = e.pos.y + e.half.y * 2;
        this.place([e.pos.x, top + (o.h ?? 1.0), e.pos.z], { settle: 0 });
        let bounced = false;
        for (let i = 0; i < 150; i++) {
          c.setInput({}); c.step(1);
          if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; }
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground') break;
        }
        c.step(4);
        return bounced;
      },
      run(input, n) { c.setInput(input); c.step(n); c.setInput({}); },
      /** Springen (gedrückt halten) mit Richtung, bis gelandet. */
      jump(input, hold = 30, max = 240) {
        const p = P();
        c.setInput({ ...input, jump: true }); c.step(hold);
        for (let i = 0; i < max; i++) { c.setInput(input); c.step(1); if (p.mode === 'ground') break; }
        c.setInput({}); c.step(2);
        return p.info();
      },
      /** Sprung nach vorn (−Z) bis etwa zur Zeile tz, dann Richtung loslassen (wie ein Spieler, der steuert). */
      jumpTo(tz, max = 260) {
        const p = P();
        let left = false;
        for (let i = 0; i < max; i++) {
          const near = p.pos.z < tz + 0.4;
          // am Ziel gegensteuern (bremsen), bis kaum noch Vorwärtsfahrt
          c.setInput(near ? (p.vel.z < -0.6 ? { y: -1, jump: i < 30 } : { jump: i < 30 }) : { y: 1, jump: i < 30 });
          c.step(1);
          if (p.mode !== 'ground') left = true;
          if (left && p.mode === 'ground') break;
        }
        c.setInput({}); c.step(2);
        return p.info();
      },
      info: () => P().info(),
      arch: () => c.state().archetype,
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    };
  }, hero);
}

/** Aufbau (setup im Browser), Figur- und Kamera-Darstellung nachführen, auf neue Bilder warten, Screenshot, Kennzahlen. */
async function SHOT(name, setup, arg) {
  if (setup) await sc(setup, arg);
  const f0 = await sc(() => {
    const c = window.__course;
    for (let i = 0; i < 24; i++) { c.rig.update(0.05, c.view.time + i * 0.05); c.level.render(0.05, c.view.time + i * 0.05); c.view.rig.update(0.05, c.player, c.world); }
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + 2, { timeout: 30000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w1c_${name}.png` });
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
}

/** Hilfen für 1-Burg (nach jedem Laden neu anlegen). */
async function burgHelpers() {
  await sc(() => {
    const c = window.__course, t = window.__t, L = c.level;
    t.kickToward = (owner, tx, tz, maxWait = 2400) => {
      const p = c.player;
      let bomb = null, n = 0;
      for (; n < maxWait; n++) {
        bomb = L.entities.find((e) => e.kind === 'kickbombe' && (!owner || e.owner === owner) && e.state === 'lit' && !e.removed && !e.kicker && e.grounded);
        if (bomb) break;
        c.setInput({}); c.step(1);
      }
      if (!bomb) return { err: 'keine Bombe', n };
      const dx = tx - bomb.pos.x, dz = tz - bomb.pos.z, d = Math.hypot(dx, dz);
      const ux = dx / d, uz = dz / d;
      p.reset([bomb.pos.x - ux * 1.05, bomb.pos.y, bomb.pos.z - uz * 1.05], Math.atan2(-uz, ux));
      p.invuln = 0;
      let kicked = false;
      for (let m = 0; m < 60 && !kicked; m++) { c.setInput({ x: ux, y: -uz }); c.step(1); kicked = !!bomb.kicker; }
      c.setInput({});
      for (let k = 0; k < 300 && !bomb.removed; k++) { c.setInput({ x: -ux * 0.7, y: uz * 0.7 }); c.step(1); }
      c.setInput({});
      return { kicked, n, exploded: bomb.exploded, at: bomb.pos.toArray().map((v) => +v.toFixed(2)) };
    };
  });

  await sc(() => {
    const c = window.__course, t = window.__t, L = c.level;
    t.crossMovers = () => {
      const p = c.player;
      const m1 = t.ent('plattform1'), m2 = t.ent('plattform2');
      const out = [];
      // warten, bis die Plattform in ~0,8 s (Flugzeit) unter der Figur ist
      // (die Figur fährt auf einer Plattform mit und nimmt deren Schwung in den Sprung mit)
      const waitAlign = (m) => { for (let i = 0; i < 1500; i++) { const own = p.ground?.mover?.vx ?? 0; if (Math.abs(m.pm.pos.x + m.mover.vx * 0.8 - p.pos.x - own * 0.8) < 0.5 && Math.abs(m.mover.vx) > 0.1) return true; c.step(1); } return false; };
      // Straßenende z −80 → Plattform 1 (z −84)
      t.place([0, 0, -79.4], { settle: 4 });
      waitAlign(m1);
      out.push(t.jumpTo(-84));
      const on1 = p.ground?.mover === m1.mover;
      // Plattform 1 → Plattform 2 (z −89,5): an die Vorderkante, dann abpassen
      if (p.pos.z > -84.3) t.run({ y: 0.4 }, 20);
      waitAlign(m2);
      out.push(t.jumpTo(-89.5));
      const on2 = p.ground?.mover === m2.mover;
      // Plattform 2 → Straße (z −93)
      if (p.pos.z > -89.8) t.run({ y: 0.4 }, 15);
      out.push(t.jumpTo(-94.5));
      t.run({ y: 0.6 }, 30);
      return { on1, on2, end: p.info(), out: out.map((o) => [o.x, o.y, o.z]) };
    };
  });

  await sc(() => {
    const c = window.__course, t = window.__t;
    t.climbStairs = () => {
      const p = c.player;
      t.place([0, 0, -299.6], { settle: 4 });
      for (let i = 0; i < 1000 && !(p.pos.z < -318.6 && p.pos.y > 7.9); i++) { c.setInput({ y: 1 }); c.step(1); }
      c.setInput({}); c.step(10);
      return p.info();
    };
  });

  await sc(() => {
    const c = window.__course, t = window.__t, L = c.level;
    t.startFight = () => {
      const p = c.player;
      t.place([0, 8, -319], { settle: 4 });
      for (let i = 0; i < 400 && !t.arch().started; i++) { c.setInput({ y: 1 }); c.step(1); }
      c.setInput({});
      return t.arch();
    };
    t.fight = (opts = {}) => {
      const b = t.ent('baron'), p = c.player;
      p.hurt = () => false;
      const log = { phases: new Set(), maxFire: 0, throws: [], kicks: [], doubles: 0 };
      let lastThrows = 0, lastBombs = 0;
      const watch = () => {
        log.phases.add(b.phase);
        log.maxFire = Math.max(log.maxFire, b.trail.count);
        if (b.throws > lastThrows) { if (b.bombsThrown - lastBombs >= 2) log.doubles++; lastThrows = b.throws; lastBombs = b.bombsThrown; }
      };
      const stepW = (n) => { for (let i = 0; i < n; i++) { c.step(1); watch(); } };
      for (let i = 0; i < 600 && b.state !== 'drive'; i++) stepW(1);
      // Steht die Figur auf der fahrenden Straße, zeigt der Avatar die Laufbewegung
      p.reset([0, 8, -335], Math.PI / 2); stepW(30);
      c.rig.update(0.02, c.view.time);
      log.runState = c.rig.proxy.course.state;
      log.speed = L.highway?.speed;
      log.firstThrowAt = null;
      for (let k = 0; k < (opts.max ?? 14) && b.hp > 0; k++) {
        // wartet auf eine gelandete Bombe des Barons und kickt sie zum Wagen
        let bomb = null;
        for (let n = 0; n < 2400 && b.hp > 0; n++) {
          bomb = L.entities.find((e) => e.kind === 'kickbombe' && e.owner === b && e.state === 'lit' && !e.removed && !e.kicker && e.grounded);
          if (bomb) break;
          c.setInput({}); stepW(1);
        }
        if (!bomb || b.hp <= 0) break;
        if (log.firstThrowAt === null) log.firstThrowAt = b.throws;
        const tx = b.pos.x, tz = b.pos.z + 2.4;
        const dx = tx - bomb.pos.x, dz = tz - bomb.pos.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
        p.reset([bomb.pos.x - ux * 1.05, bomb.pos.y, bomb.pos.z - uz * 1.05], Math.atan2(-uz, ux));
        p.invuln = 0;
        const hits0 = b.hits;
        let kicked = false;
        for (let m = 0; m < 60 && !kicked; m++) { c.setInput({ x: ux, y: -uz }); stepW(1); kicked = !!bomb.kicker; }
        c.setInput({});
        for (let m = 0; m < 300 && !bomb.removed; m++) { c.setInput(m < 40 ? { y: -0.5 } : {}); stepW(1); }
        c.setInput({});
        // zurück in die Mitte des Kampffensters (die nächste Bombe landet vor der Figur)
        if (p.pos.z > -334) { p.reset([p.pos.x * 0.5, 8, -335.5], Math.PI / 2); p.invuln = 0; }
        log.kicks.push({ kicked, hit: b.hits > hits0, hp: b.hp, where: b.hitLog.at(-1)?.kind });
        if (opts.fireCheck && b.phase === 3 && !log.fireHurt) {
          for (let n = 0; n < 1500 && !b.trail.patches.some((q) => q.t > 0.4 && q.t < q.life - 0.8); n++) stepW(1);
          const patch = b.trail.patches.find((q) => q.t > 0.35 && q.t < q.life - 0.7 && q.z < -332);
          if (patch) {
            delete p.hurt;
            p.invuln = 0;
            const big0 = p.big, hits0f = b.trail.hits;
            p.reset([patch.x, patch.y + 0.05, patch.z], Math.PI / 2);
            stepW(2);
            log.fireHurt = { hit: b.trail.hits > hits0f, big0, big: p.big };
            p.hurt = () => false;
            p.big = true; p.invuln = 0;
            t.place([0, 8, -335.5], { settle: 2 });
          }
        }
      }
      for (let i = 0; i < 1200 && b.state !== 'gone'; i++) stepW(1);
      delete p.hurt;
      return { hp: b.hp, state: b.state, hits: b.hits, throws: b.throws, bombs: b.bombsThrown, phases: [...log.phases], maxFire: log.maxFire, doubles: log.doubles, kicks: log.kicks, fireHurt: log.fireHurt ?? null, firstThrowAt: log.firstThrowAt, runState: log.runState, speed: log.speed, arch: t.arch() };
    };
    t.finish = () => {
      const p = c.player, w = t.ent('warp_sieg');
      const revealed = !w.hidden;
      t.place([w.pos.x, w.top + 0.4, w.pos.z], { settle: 0 });
      let arrived = null;
      for (let i = 0; i < 600; i++) { c.step(1); if (p.mode !== 'script' && p.pos.z < -470) { arrived = p.info(); break; } }
      c.step(30);
      // Krümel befreien
      const fr = t.ent('kruemel');
      t.place([fr.pos.x + 1.2, 0, fr.pos.z + 2.2], { settle: 4 });
      c.step(240);
      const friend = { freed: fr.freed, state: fr.state, thanks: fr.thanks };
      // Zielmast
      const g = c.level.entities.find((e) => e.kind === 'goal');
      t.place([g.pos.x + 0.9, g.pos.y + 4.5, g.pos.z], { settle: 0 });
      for (let i = 0; i < 40 && c.level.runtime.status === 'play'; i++) { c.setInput({ x: -1 }); c.step(1); }
      c.setInput({});
      for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
      return { revealed, arrived, friend, finished: c.finished, res: c.lastResult, save: t.save().levels?.['1-Burg'] };
    };
  });
}

// =====================================================================================================================
// Arena 1-A
// =====================================================================================================================
console.log('Arena 1-A');
await load('1-A', { fresh: true });
const a0 = await sc(() => ({ arch: window.__t.arch(), stars: window.__t.count('star'), title: window.__course.level.data.title, music: window.__course.level.data.music, time: window.__course.level.runtime.timeLimit }));
check(`Arena geladen: ${a0.title}, 2 Bullen, kein Stern (${JSON.stringify({ left: a0.arch.left, stars: a0.stars })})`, a0.arch.total === 2 && a0.arch.left === 2 && a0.stars === 0);
check('Arena: Musik course_arena, Zeitlimit 200 s, HUD-Anzeige „noch 2“', a0.music === 'course_arena' && a0.time === 200 && a0.arch.hud.arena?.left === 2);
await SHOT('arena_start', () => { window.__course.step(30); });

// Tod setzt die Arena zurück
const ad = await sc(() => {
  const c = window.__course, t = window.__t, b = t.ent('bulle_links');
  const lives0 = c.level.runtime.lives;
  t.stomp(b);
  const hp1 = b.hp;
  c.player.die('hit');
  for (let i = 0; i < 400 && (c.player.dead || c.level.runtime.status !== 'play'); i++) c.step(1);
  const nb = t.ent('bulle_links');
  return { hp1, fresh: nb !== b, hp: nb.hp, hp2: t.ent('bulle_rechts').hp, arch: t.arch(), lives: c.level.runtime.lives, lives0, oldRemoved: b.removed };
});
console.log(`  Tod: Bulle nach Treffer hp ${ad.hp1} → neu ${ad.hp}/${ad.hp2}, Leben ${ad.lives0} → ${ad.lives}`);
check('Arena: Tod startet die Arena neu (Bullen frisch mit 3 Treffern, noch 2)', ad.hp1 === 2 && ad.fresh && ad.oldRemoved && ad.hp === 3 && ad.hp2 === 3 && ad.arch.left === 2 && ad.arch.resets === 1 && ad.lives === ad.lives0 - 1);

// Beide Bullen besiegen (je 3 Treffer), Stern erst danach
const ab = await sc(() => {
  const c = window.__course, t = window.__t;
  const out = { hits: [] };
  const beat = (id) => {
    const b = t.ent(id);
    for (let k = 0; k < 6 && !b.defeated; k++) {
      for (let i = 0; i < 200 && (b.state === 'hit' || b.hitGrace > 0); i++) c.step(1);
      const hp = b.hp;
      t.stomp(b);
      out.hits.push(`${id}:${hp}→${b.hp}`);
    }
    return b.defeated;
  };
  out.left1 = beat('bulle_links');
  out.after1 = { arch: t.arch(), stars: t.count('star') };
  c.step(200);
  out.after1b = t.count('star');
  out.right = beat('bulle_rechts');
  out.after2 = t.arch();
  out.starNow = t.count('star');
  for (let i = 0; i < 400 && !t.arch().starTouch; i++) c.step(1);
  out.after3 = t.arch();
  out.starPos = c.level.entities.find((e) => e.kind === 'star')?.pos.toArray();
  return out;
});
console.log(`  Treffer: ${ab.hits.join(', ')}`);
check('Arena: Bulle 1 mit 3 Sprüngen besiegt, danach noch kein Stern', ab.left1 && ab.after1.arch.left === 1 && ab.after1.stars === 0 && ab.after1b === 0);
check('Arena: Bulle 2 besiegt → „frei!“, Stern erscheint (nach kurzer Pause, dann einsammelbar)', ab.right && ab.after2.left === 0 && ab.after2.cleared && ab.after3.starShown && ab.after3.starTouch);
await SHOT('arena_stern', () => { const c = window.__course; const s = c.level.entities.find((e) => e.kind === 'star'); window.__t.place([s.pos.x + 2.5, s.pos.y - 0.5, s.pos.z + 3], { settle: 2 }); });
const aw = await sc(() => {
  const c = window.__course, t = window.__t;
  const s = c.level.entities.find((e) => e.kind === 'star');
  t.place([s.pos.x, s.pos.y, s.pos.z + 0.3], { settle: 2 });
  const got = c.level.runtime.stars[0];
  for (let i = 0; i < 600 && c.player.state !== 'victory'; i++) c.step(1);
  c.step(60);
  return { got, state: c.player.state };
});
await SHOT('arena_jubel');
const aw2 = await sc(() => {
  const c = window.__course, t = window.__t;
  for (let i = 0; i < 600 && !c.finished; i++) c.step(1);
  return { finished: c.finished, res: c.lastResult, save: t.save().levels?.['1-A'] };
});
Object.assign(aw, aw2);
check('Arena: Stern einsammeln → Siegespose, Ergebnis, Stern gespeichert', aw.got && aw.state === 'victory' && aw.finished && aw.save?.done && aw.save?.stars?.[0] === true);
await SHOT('arena_sieg');

// Greta: Arena ebenfalls lösbar
await load('1-A', { hero: 'greta' });
const ag = await sc(() => {
  const c = window.__course, t = window.__t;
  for (const id of ['bulle_links', 'bulle_rechts']) {
    const b = t.ent(id);
    for (let k = 0; k < 6 && !b.defeated; k++) { for (let i = 0; i < 200 && (b.state === 'hit' || b.hitGrace > 0); i++) c.step(1); t.stomp(b); }
  }
  for (let i = 0; i < 400 && !t.arch().starTouch; i++) c.step(1);
  const s = c.level.entities.find((e) => e.kind === 'star');
  if (s) t.place([s.pos.x, s.pos.y, s.pos.z + 0.3], { settle: 2 });
  for (let i = 0; i < 600 && !c.finished; i++) c.step(1);
  return { hero: c.player.hero, finished: c.finished };
});
check('Arena: auch mit Greta lösbar', ag.hero === 'greta' && ag.finished);
// Kampf-Bild: Bulle stürmt
await load('1-A');
await SHOT('arena_kampf', () => {
  const c = window.__course, t = window.__t;
  c.player.hurt = () => false;
  t.place([2, 2.4, 4], { yaw: Math.PI / 2 });
  const b = t.ent('bulle_links');
  for (let i = 0; i < 400 && b.state !== 'charge'; i++) c.step(1);
  c.step(25);
});

// =====================================================================================================================
// Bosslevel 1-Burg
// =====================================================================================================================
console.log('\nBosslevel 1-Burg');
await load('1-Burg');
await burgHelpers();
const b0 = await sc(() => {
  const c = window.__course, L = c.level;
  const kinds = {};
  for (const e of L.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  let pilz = 0; for (const e of L.entities) if (e.kind === 'pilzlingsturm') pilz += e.count;
  return { kinds, pilz, title: L.data.title, music: L.data.music, time: L.runtime.timeLimit, theme: c.view.theme.label, arch: window.__t.arch() };
});
console.log(`  ${b0.title}: ${JSON.stringify(b0.kinds)}`);
const NEED = ['baron', 'bomb_cannon', 'starring', 'warpbox', 'megacolumn', 'stampfstein', 'pilzlingsturm', 'kickbombe', 'rescue_friend', 'pixelegg', 'fire_trail', 'goal'];
check(`Bosslevel: alle Bausteine geladen (${NEED.filter((k) => !b0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => b0.kinds[k] > 0));
check(`Bosslevel: Thema Autobahn, Musik course_boss, 500 s; 9 Türme mit ${b0.pilz} Pilzlingen, 3 Stampfsteine, 4 Kanonen`,
  b0.theme === 'Autobahn' && b0.music === 'course_boss' && b0.time === 500 && b0.kinds.pilzlingsturm === 9 && b0.pilz === 22 && b0.kinds.stampfstein === 3 && b0.kinds.bomb_cannon === 4);
await SHOT('start', () => { window.__t.place([0.5, 0, 6], { yaw: Math.PI / 2 }); window.__course.step(150); });

// Kanonen feuern Kickbomben (mit Landeanzeige)
const kc = await sc(() => {
  const c = window.__course, t = window.__t, k = t.ent('kanone1');
  c.player.hurt = () => false;
  t.place([0, 0, -47]);
  let marker = 0, own = 0;
  for (let i = 0; i < 700; i++) {
    c.step(1);
    marker = Math.max(marker, k.markers.list.length);
    own = Math.max(own, c.level.entities.filter((e) => e.kind === 'kickbombe' && e.owner === k).length);
  }
  delete c.player.hurt;
  return { shots: k.shots, marker, own, shots2: t.ent('kanone2').shots };
});
check(`Kanonen-Zone: Kanonen feuern (${kc.shots} + ${kc.shots2} Schüsse, Landeanzeige ${kc.marker})`, kc.shots >= 2 && kc.shots2 >= 1 && kc.marker >= 1 && kc.own >= 1);
await SHOT('kanonen', () => {
  const c = window.__course, t = window.__t;
  c.player.hurt = () => false;
  t.place([0.5, 0, -36]);
  const k = t.ent('kanone1');
  for (let i = 0; i < 600 && !(k.state === 'fire' && k.stateT > 0.35); i++) c.step(1);
});

// Graue Blockwand im Turm: Kanonenbombe hineinkicken → Stempel
const st = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level;
  c.player.hurt = () => false;
  t.place([12.5, 0, -101.5]);
  const cols = () => L.entities.filter((e) => e.kind === 'megacolumn' && e.alive && Math.abs(e.pos.z + 109.5) < 0.6).length;
  const before = cols();
  let r = null;
  for (let k = 0; k < 4 && cols() === before; k++) r = t.kickToward(t.ent('kanone_hof'), 12.5, -110);
  const after = cols();
  t.place([12.5, 0.2, -112.2], { settle: 10 });
  const stamp = L.runtime.stamp;
  delete c.player.hurt;
  return { before, after, r, stamp };
});
console.log(`  Blockwand im Turm: Säulen ${st.before} → ${st.after} (${JSON.stringify(st.r)})`);
check('Blockwand (Turm): Kanonenbombe gekickt sprengt sie, Stempel erreichbar', st.before === 2 && st.after < st.before && st.stamp);

// Krallenrad → Plattformen → Turm → Stern 2
const kw = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const wheel = t.ent('krallenrad');
  t.place([9.5, 0, -102.4], { power: 'krallen', yaw: Math.PI / 2 });
  // zur Wand laufen, springen, klettern (Richtung gehalten)
  c.setInput({ y: 1, jump: true }); c.step(20);
  let maxY = 0, climb = false;
  for (let i = 0; i < 400; i++) { c.setInput({ y: 1 }); c.step(1); maxY = Math.max(maxY, p.pos.y); if (p.state === 'climb') climb = true; if (p.mode === 'ground' && p.pos.y > 5.5) break; }
  c.setInput({}); c.step(30);
  const top = p.info();
  const progress = wheel.progress;
  // Sprung oben vom Rad auf Plattform 1 (y 6), dann hinauf zu Plattform 2 (y 8,5) und auf den Turm (y 11)
  t.run({ y: 0.5 }, 30);
  const j1 = t.jump({ x: 0.4, y: 1 }, 30);
  t.place([11.4, 6.1, -108.6], { settle: 10 });
  const j2 = t.jump({ x: 0.75, y: 0.3 }, 40);
  t.place([13.7, 8.6, -108.6], { settle: 10 });
  const j3 = t.jump({ y: 1 }, 40);
  t.place([12.5, 11.1, -113.6], { settle: 10 });
  t.run({ y: 0.6 }, 30);
  return { climb, maxY: +maxY.toFixed(2), top, progress, j1: [j1.y, j1.z], j2: [j2.x, j2.y], j3: [j3.y, j3.z], star: L.runtime.stars[1] };
});
console.log(`  Krallenrad: geklettert bis ${kw.maxY} m, Fortschritt ${kw.progress}; Sprünge ${JSON.stringify([kw.j1, kw.j2, kw.j3])}`);
check('Krallenrad: mit Krallen-Anzug hochklettern dreht das Rad, Plattformen fahren aus', kw.climb && kw.progress >= 1 && kw.top.y > 5.5);
check('Krallenrad: Plattformen 1 → 2 → Turm erreichbar (je ≤ 2,5 m hinauf), Stern 2 oben', Math.abs(kw.j1[0] - 6) < 0.2 && Math.abs(kw.j2[1] - 8.5) < 0.2 && Math.abs(kw.j3[0] - 11) < 0.2 && kw.star);
await SHOT('hof', () => {
  const c = window.__course, t = window.__t;
  t.place([9, 0, -99.5], { yaw: Math.PI / 2 });
  c.step(60);
});

// Sternenring: durchlaufen, 8 Sternmünzen → Stern 1
const sr = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, ring = t.ent('sternenring');
  c.player.hurt = () => false;
  t.place([2.5, 0, -3.6], { yaw: Math.PI / 2 });
  t.run({ y: 1 }, 50);
  const active = ring.state;
  const coins = L.entities.filter((e) => e.kind === 'starcoin' && e.alive);
  for (const k of coins) { t.place([k.pos.x, Math.max(0, k.pos.y - 0.4), k.pos.z], { settle: 3 }); }
  const done = ring.state;
  const s = L.entities.find((e) => e.kind === 'star' && e.index === 0);
  if (s) t.place([s.pos.x, s.pos.y, s.pos.z], { settle: 3 });
  delete c.player.hurt;
  return { active, n: coins.length, done, star: L.runtime.stars[0] };
});
check(`Sternenring: ${sr.n} Sternmünzen erscheinen, alle gesammelt → Stern 1`, sr.active === 'active' && sr.n === 8 && sr.done === 'done' && sr.star);
await SHOT('sternenring', () => {
  const c = window.__course, t = window.__t;
  t.place([1.5, 0, -1.5], { yaw: Math.PI / 2 });
  c.step(30);
});

// Pilzlingsturm mit Stern 3
const ts = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, tw = t.ent('turm_stern');
  for (let k = 0; k < 8 && !tw.removed; k++) { for (let i = 0; i < 40 && tw.hitCool > 0; i++) c.step(1); t.stomp(tw); }
  c.step(20);
  const s = L.entities.find((e) => e.kind === 'star' && e.index === 2 && e.alive);
  if (s) t.place([s.pos.x, s.pos.y, s.pos.z], { settle: 3 });
  return { gone: tw.removed, star: L.runtime.stars[2] };
});
check('Pilzlingsturm (5 Stufen) von oben abgetragen → Stern 3', ts.gone && ts.star);

const mv = await sc(() => window.__t.crossMovers());
console.log(`  Plattformen (Lotti): ${JSON.stringify(mv.out)}`);
check('Gefahrenstrecke: Lücke über zwei bewegliche Plattformen überwindbar (Lotti)', mv.on1 && mv.on2 && mv.end.z < -92.5 && mv.end.y > -0.1 && !mv.end.dead);

// Steinwand quer über die Straße: Kanonenbombe hineinkicken → Durchgang → Warp-Box
const sw = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  c.player.hurt = () => false;
  const cols = () => L.entities.filter((e) => e.kind === 'megacolumn' && e.alive && Math.abs(e.pos.z + 146) < 0.6);
  const before = cols().length;
  t.place([0, 0, -138.5]);
  let r = null;
  for (let k = 0; k < 4 && cols().length === before; k++) r = t.kickToward(t.ent('kanone_wand'), p.pos.x * 0.3, -147);
  const gone = cols();
  const left = gone.map((e) => e.pos.x);
  // Durchgang: eine Lücke in der Wand (fehlende Säule)
  let gapX = null;
  for (let x = -3.5; x <= 3.5; x += 1) if (!left.some((v) => Math.abs(v - x) < 0.1)) { gapX = x; break; }
  let through = false;
  if (gapX !== null) {
    t.place([gapX, 0, -143.5], { settle: 5 });
    t.run({ y: 1 }, 110);
    through = p.pos.z < -147.2;
  }
  // Warp-Box hinter der Wand → Ankunft unten an der Bossstraße
  const w = t.ent('warp_wand');
  t.place([w.pos.x, w.top + 0.4, w.pos.z], { settle: 0 });
  let arrived = null;
  for (let i = 0; i < 600; i++) { c.step(1); if (p.mode !== 'script' && p.pos.z < -280) { arrived = p.info(); break; } }
  delete c.player.hurt;
  return { before, after: gone.length, r, gapX, through, arrived };
});
console.log(`  Steinwand: Säulen ${sw.before} → ${sw.after}, Lücke bei x ${sw.gapX}, Ankunft ${JSON.stringify(sw.arrived && [sw.arrived.x, sw.arrived.y, sw.arrived.z])}`);
check('Steinwand: Kanonenbombe gekickt sprengt eine Lücke, Figur kommt hindurch', sw.before === 8 && sw.after < 8 && sw.through);
check('Warp-Box hinter der Wand führt zur Bossstraße (Ankunft unten an der Treppe)', !!sw.arrived && Math.abs(sw.arrived.z + 296) < 1.5);
await SHOT('wand', () => {
  const c = window.__course, t = window.__t;
  c.player.hurt = () => false;
  t.place([1, 0, -137], { yaw: Math.PI / 2 });
  const k = t.ent('kanone_wand');
  for (let i = 0; i < 500 && !(k.state === 'fire' && k.stateT > 0.5); i++) c.step(1);
});

const cs = await sc(() => window.__t.climbStairs());
check(`Treppe zur Bossstraße (8 m, Stufen 0,25 m) hinauf – Lotti (oben bei y ${cs.y}, z ${cs.z})`, cs.y > 7.9 && cs.z < -318.5);

// Bosskampf (Lotti)
const bs = await sc(() => window.__t.startFight());
check('Bosskampf beginnt beim Betreten der Arena (Sperre hinter der Figur, Lebensleiste 3/3, Straße fährt an)', bs.started && bs.lock && bs.hud.boss?.hp === 3 && bs.boss.state === 'intro');
await SHOT('boss_auftritt', () => { window.__course.step(150); });
const fl = await sc(() => window.__t.fight({ fireCheck: true }));
console.log(`  Kampf (Lotti): ${fl.throws} Würfe/${fl.bombs} Bomben, Treffer ${fl.hits}, Phasen ${fl.phases}, Doppelwürfe ${fl.doubles}, Feuer max ${fl.maxFire}`);
console.log(`  Kicks: ${fl.kicks.map((k) => `${k.kicked ? 'K' : '-'}${k.hit ? `!${k.where}` : ''}`).join(' ')}; Feuer-Treffer ${JSON.stringify(fl.fireHurt)}`);
check('Bosskampf: Baron wirft Kickbomben (Landeanzeige), Figur kickt sie zurück, onBombHit zählt Treffer', fl.throws >= 3 && fl.kicks.some((k) => k.kicked && k.hit));
check(`Fahrende Straße: Laufband ${fl.speed?.toFixed?.(1) ?? '?'} m/s, nach dem Sieg 0; stehende Heldin zeigt Laufbewegung (${fl.runState})`, fl.runState === 'run' && fl.speed > 5 && fl.arch.speed === 0);
check('Bosskampf: 3 Treffer → besiegt, Flucht im qualmenden Wagen (state gone)', fl.hp === 0 && fl.hits >= 3 && fl.state === 'gone');
check('Bosskampf: Phasen steigern sich – Doppelwürfe (Phase 2) und Feuerspur (Phase 3), die verletzt', fl.phases.includes(3) && fl.doubles >= 1 && fl.maxFire >= 6 && fl.fireHurt?.hit);
const fin = await sc(() => window.__t.finish());
console.log(`  Ziel: Warp ${fin.revealed}, Ankunft ${JSON.stringify(fin.arrived && [fin.arrived.x, fin.arrived.z])}, Krümel ${JSON.stringify(fin.friend)}`);
check('Nach dem Sieg: Warp-Box erscheint und führt zum Rastplatz', fin.revealed && !!fin.arrived);
check('Rastplatz: Krümel wird befreit und bedankt sich', fin.friend.freed && fin.friend.state === 'happy' && /Danke/.test(fin.friend.thanks ?? ''));
check('Zielmast erreicht → Ergebnis, Sterne 1–3 und Stempel gespeichert', fin.finished && fin.save?.done && fin.save?.stars?.every(Boolean) && fin.save?.stamp);

// Greta: Treppe, Plattformen, Tod im Kampf setzt ihn zurück, Kampf gewinnen
await load('1-Burg', { hero: 'greta' });
await burgHelpers();
const mg = await sc(() => window.__t.crossMovers());
console.log(`  Plattformen (Greta): ${JSON.stringify(mg.out)}`);
check('Gefahrenstrecke: bewegliche Plattformen auch mit Greta', mg.on1 && mg.on2 && mg.end.z < -92.5 && !mg.end.dead);
const cg = await sc(() => window.__t.climbStairs());
check('Treppe zur Bossstraße auch mit Greta', cg.y > 7.9 && cg.z < -318.5);
const dr = await sc(() => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.startFight();
  for (let i = 0; i < 700 && b.state !== 'drive'; i++) c.step(1);
  b.hp = 2; // als hätte die Figur schon getroffen
  c.player.die('hit');
  for (let i = 0; i < 500 && (c.player.dead || c.level.runtime.status !== 'play'); i++) c.step(1);
  const after = { state: b.state, hp: b.hp, arch: t.arch(), pos: c.player.info() };
  return after;
});
check('Tod im Bosskampf: Neustart am Checkpoint vor der Treppe, Kampf beginnt von vorn (3/3)', dr.state === 'wait' && dr.hp === 3 && !dr.arch.started && dr.arch.deaths === 1 && dr.pos.z > -300.5 && dr.pos.z < -297);
const fg = await sc(() => { window.__t.climbStairs(); window.__t.startFight(); return window.__t.fight(); });
console.log(`  Kampf (Greta): Treffer ${fg.hits}, Würfe ${fg.throws}, Zustand ${fg.state}`);
check('Bosskampf auch mit Greta gewonnen', fg.hp === 0 && fg.state === 'gone' && fg.arch.won);
const fing = await sc(() => window.__t.finish());
check('Greta: Warp-Box → Rastplatz → Zielmast → Ergebnis', fin.revealed && fing.finished && fing.save?.done);

// Easter-Egg: oben auf der Mautmauer warten
await load('1-Burg');
await burgHelpers();
const ee = await sc(() => {
  const c = window.__course, t = window.__t, e = c.level.entities.find((x) => x.kind === 'pixelegg');
  t.place([-7.6, 6.1, 6.5], { settle: 10 });
  c.step(5 * 120);
  return { shown: e.shown };
});
check('Easter-Egg: auf der Mautmauer still stehen → Pixel-Heldin erscheint', ee.shown);
await SHOT('easteregg', () => { window.__course.step(120); });

// =====================================================================================================================
// Screenshots der Bossfahrt und Gefahrenstrecke
// =====================================================================================================================
await load('1-Burg');
await burgHelpers();
await SHOT('gefahr', () => {
  const c = window.__course, t = window.__t;
  c.player.hurt = () => false;
  t.place([1.6, 0, -64.5], { yaw: Math.PI / 2 });
  c.setInput({ y: 0.5 }); c.step(60); c.setInput({});
  c.step(30);
});
await SHOT('plattformen', () => {
  const c = window.__course, t = window.__t;
  t.place([0, 0, -79.2], { yaw: Math.PI / 2 });
  c.step(90);
});
await SHOT('boss_phase1', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  c.player.hurt = () => false;
  t.startFight();
  for (let i = 0; i < 900 && !(b.state === 'throw' && b.stateT > 0.75); i++) c.step(1);
});
await SHOT('boss_treffer', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  for (let k = 0; k < 6 && b.hits < 1; k++) t.kickToward(b, b.pos.x, b.pos.z + 2.4);
  // zurück in die Treffer-Pose
  b.setState('hit'); b.stateT = 0.18;
});
await SHOT('boss_phase2', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  for (let i = 0; i < 400 && b.state !== 'drive'; i++) c.step(1);
  b.throwCount = 1;
  for (let i = 0; i < 900 && !(b.state === 'throw' && b.stateT > 0.85); i++) c.step(1);
  c.step(20);
});
await SHOT('boss_phase3', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  b.hp = 1; b.setState('drive'); b.throwCount = 2; b.swerveCool = 0; b.throwCool = 0.2;
  for (let i = 0; i < 1200 && !(b.state === 'swerve' && b.stateT > 2.0); i++) c.step(1);
  c.player.pos.x = 0; c.player.pos.z = -333;
});
await SHOT('boss_sieg', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  b.takeHit('driver');
  for (let i = 0; i < 1200 && !(b.state === 'flee' && b.stateT > 0.6); i++) c.step(1);
});
await SHOT('ziel', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  for (let i = 0; i < 1200 && b.state !== 'gone'; i++) c.step(1);
  c.step(60);
  const fr = t.ent('kruemel');
  t.place([fr.pos.x + 1.2, 0, fr.pos.z + 2.0], { settle: 4 });
  c.step(260);
});

// Kennzahlen
console.log('\nKennzahlen (inkl. Schattenpass):');
for (const [n, cl, tr] of stats) console.log(`    ${n.padEnd(16)} ${String(cl).padStart(4)} Aufrufe  ${String(Math.round(tr / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
check(`Budget: höchstens ${maxCalls} Zeichenaufrufe (< 120), ${Math.round(maxTris / 1000)} k Dreiecke (< 300 k)`, maxCalls < 120 && maxTris < 300000);
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
