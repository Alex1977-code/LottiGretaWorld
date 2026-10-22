// Welt-2-Finale 2-Panzer „Brummbärs Panzerparade“ (Autoscroller + Boss) deterministisch prüfen:
//   Laden ohne Konsolenfehler, Abendrot/Level-Haken, Konvoi (Panzer fahren gemeinsam, halten am Ende), Routen-Bot für
//   Lotti und Greta über alle Panzer bis zum Zughalt (Lücken springbar, Kisten/Metalltor überklettert, Bildfenster
//   schiebt), Einklemmen = Tod, Kanonen feuern Projektilköpfe, Marschblöcke marschieren auf den fahrenden Decks,
//   Kanonen-Helm (Holzwand mit drei Treffern → Stern 3, Kanone und Metalltor), alle 3 Sterne + Stempel, roter Ring auf
//   dem fahrenden Panzer (rote Münzen fahren mit), Checkpoint auf dem Panzer, Luke beim Halt → Bossarena, Wirbelbrocken
//   in drei Phasen per Skript besiegt, Baron-Flucht, Warp-Box → Oase → Zielmast → Ergebnis + Speicherstand.
//   Kennzahlen (Zeichenaufrufe inkl. Schattenpass < 130, Dreiecke < 300 k) je Abschnitt, Bilder tests/out/w2d_*.png.
// Simulation nur über window.__course.step(n) / setInput (Teleport erlaubt). Aufruf (nach npm run build):
//   PORT_BASE=5600 node tests/course_w2d.mjs
//
// Konvoi-Koordinate c: Meter entlang des Zugs nach vorn (beim Fahrtbeginn z = −c; LEVEL.convoy). Der Bot fährt in
// dieser Koordinate: Wegpunkte [c, x] (Spur), er hält sich etwas vor der Fenstermitte, springt an Deckkanten über
// Lücken (wartet, bis die Gegenseite im Fenster liegt) und springt an Hindernissen (Kisten, Tor) hinauf.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4560;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SAVE = 'lotti-greta-course-v1';
const stats = [];
const near = (a, b, e) => Math.abs(a - b) <= e;

// Spur des Bots: [c, x] (Weltlage x beim Fahrtbeginn = Spur, Panzer fahren geradeaus)
const LANE_LOTTI = [[0, -1.8], [16, -1.5], [24, -1.5], [28.5, 1.4], [44.5, 1.4], [47.5, -2.0], [66, -2.0], [69, -1.0],
  [83, -0.6], [94, -1.8], [106, -1.0], [112, -0.7], [118, -0.7], [121, -1.2], [139, -1.4], [143, -1.8], [148, -1.8], [150.5, -0.9], [155, -0.6],
  [163, -0.6], [166, -1.5], [190, -1.5]];
// Greta holt den Kanonen-Helm am Heck von T3 (Kasten bei c 37, x −1,5)
const LANE_GRETA = [[0, -1.8], [16, -1.5], [36, -1.5], [38.5, -1.5], [41, 1.4], [44.5, 1.4], [47.5, -2.0], [66, -2.0], [69, -1.0],
  [83, -0.6], [94, -1.8], [106, -1.0], [121, -1.2], [139, -1.4], [143, -1.8], [148, -1.8], [150.5, -0.9], [155, -0.6], [163, -0.6], [166, -1.5], [190, -1.5]];

async function load({ hero = 'lotti', fresh = false } = {}) {
  // Seitenaufruf mit großzügiger Frist und einem zweiten Versuch (parallel laufende Tests belasten die Maschine)
  const go = async (url) => {
    try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); }
  };
  if (fresh) {
    await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
  }
  await go(`http://localhost:${port}/?course=2-Panzer&scale=2&adapt=0`);
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
  } catch {
    console.log('2-Panzer startet nicht. Konsole:');
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(({ hero, laneL, laneG }) => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    c.setHero(hero);
    const L = c.level, P = () => c.player;
    L.runtime.save.lives = 9;
    window.__sfx = [];
    L.sfx = (n) => { window.__sfx.push([n, +L.time.toFixed(3)]); };
    const CV = L.data.convoy;
    const t = window.__t = {
      ent: (id) => L.named.get(id),
      arch: () => c.state().archetype,
      win: () => L.scroll,
      /** Verschiebung des Zugs seit dem Fahrtbeginn (alle Panzer gleich schnell). */
      dz: () => L.named.get('T1').pos.z - -CV.T1.c,
      /** Konvoi-Koordinate eines Weltpunkts bzw. Weltpunkt zu c. */
      cOf: (z) => -(z - t.dz()),
      at: (cc, x, y) => [x, y, -cc + t.dz()],
      cw: () => t.cOf(L.scroll.center.z),
      /** Figur „parken“ (Skript-Modus, unverwundbar) – Zeit vergeht, ohne dass sie fällt. */
      park() { const p = P(); p.invuln = 1e9; p.mode = 'script'; p.script = { type: 'test', t: 0 }; },
      /** Bis die Fenstermitte bei Konvoi-Koordinate cc steht (Figur geparkt). */
      waitWin(cc, max = 120 * 150) { t.park(); let k = 0; while (t.cw() < cc && L.scroll.state !== 'done' && k < max) { c.step(1); k++; } return k; },
      /** Figur setzen (groß, ohne Power-up) und kurz landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null); c.setInput({});
        p.dead = false; p.holding = null;
        p.big = o.big ?? true;
        if (p.power !== 'none') p.setPower('none');
        if (p.helmet && !o.keepHelmet) p.dropHelmet?.('gone');
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.invuln = o.invuln ?? 0;
        if (L.runtime.status === 'dying') L.runtime.status = 'play';
        L.controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        if (o.settle) c.step(o.settle);
        return p.info();
      },
      /** Figur auf Konvoi-Koordinate cc, Spur x setzen (Höhe: Deck darunter). */
      placeC(cc, x, o = {}) {
        const [X, , Z] = t.at(cc, x, 0);
        const hit = c.world.raycastDown(X, 12, Z, 14);
        return t.place([X, (hit?.y ?? 2) + 0.05, Z], o);
      },
      ground: () => P().ground?.mover?.vehicle?.spec?.id ?? P().ground?.tag ?? null,
      sfxCount: (name) => window.__sfx.filter(([n]) => n === name).length,
      save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
      /** Kamera und Darstellung wie in einem Bild nachführen. */
      cam(n = 1, dt = 0.05) { for (let i = 0; i < n; i++) { c.rig.update(dt, c.view.time + dt); L.render(dt, c.view.time + dt); c.view.rig.update(dt, c.player, c.world); } return c.view.rig.info(); },
    };

    /** x der Spur bei Konvoi-Koordinate cc (stückweise linear). */
    const laneAt = (lane, cc) => {
      if (cc <= lane[0][0]) return lane[0][1];
      for (let i = 1; i < lane.length; i++) if (cc <= lane[i][0]) { const [c0, x0] = lane[i - 1], [c1, x1] = lane[i]; return x0 + (x1 - x0) * ((cc - c0) / (c1 - c0)); }
      return lane[lane.length - 1][1];
    };
    const SOLID = (s) => s.solid !== false && !s.oneWay && !s.trigger && !s.quicksand && !s.water && !s.kill;
    /** Boden in d m vor der Figur (in Fahrtrichtung −Z) auf etwa ihrer Höhe? */
    const groundAhead = (p, d, x = p.pos.x) => {
      const h = c.world.raycastDown(x, p.pos.y + 0.6, p.pos.z - d, 4.5);
      return !!h && !h.shape.quicksand && !h.shape.kill && h.y > p.pos.y - 2.5;
    };
    /** Hindernis vor der Figur (Kniehöhe bis Kopfhöhe)? */
    const wallAhead = (p, d) => c.world.overlapAABB({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z - d }, { x: 0.22, y: 0.32, z: 0.12 }, { filter: SOLID }).length > 0;
    /** Nächstes Deck jenseits einer Lücke (Abstand bis zur Gegenseite), sonst Infinity. */
    const farSide = (p, x2) => { for (let d = 1.0; d < 6.5; d += 0.25) if (groundAhead(p, d) || (x2 !== undefined && groundAhead(p, d, x2))) return d; return Infinity; };

    /**
     * Routen-Bot über den fahrenden Zug bis zum Halt. lane = Wegpunkte [c, x]; lead = Sollabstand vor der Fenstermitte.
     * Liefert ein Protokoll: erreichte Konvoi-Koordinate, Sprünge, Panzer unter den Füßen, Tode, Ende erreicht.
     */
    t.bot = (lane, o = {}) => {
      const p = P(), w = L.scroll;
      const log = { jumps: 0, climbs: 0, tanks: [], deaths: 0, maxC: -1e9, steps: 0, done: false, hurt: 0, stars: [], stamp: false, cp: false };
      let jumpHold = 0, prevJump = false, commit = false, longGap = false;
      const max = o.max ?? 120 * 130;
      for (let i = 0; i < max; i++) {
        log.steps = i;
        if (p.dead) { log.deaths++; log.deathAt = +t.cOf(p.pos.z).toFixed(1); log.cause = p.deathCause; break; }
        const cp = t.cOf(p.pos.z), cw = t.cw();
        log.maxC = Math.max(log.maxC, cp);
        if (w.state === 'done' && p.mode === 'ground' && cp >= (o.stopC ?? 174)) { log.done = true; break; }
        const id = t.ground();
        if (id && log.tanks[log.tanks.length - 1] !== id && /^T/.test(id)) log.tanks.push(id);
        const lx = laneAt(lane, cp + 0.8);
        const inp = { x: Math.max(-1, Math.min(1, (lx - p.pos.x) * 1.6)) };
        const ahead = cw + (o.lead ?? 1.6);
        let jump = false;
        if (p.mode === 'ground') {
          commit = false;
          // nächste Deckkante (Lücke) und Abstand bis zur Gegenseite
          let edge = Infinity;
          for (let d = 0.5; d < 3.4; d += 0.25) if (!groundAhead(p, d)) { edge = d; break; }
          let far = Infinity;
          if (edge < Infinity) { const pz = p.pos.z; p.pos.z -= edge - 0.25; far = farSide(p, laneAt(lane, cp + edge + 2.5)) + edge - 0.25; p.pos.z = pz; }
          // springen erst, wenn die Gegenseite gut im Fenster liegt (sonst bremst die Vordergrenze den Sprung)
          const ready = far < 7.5 && cp + far + 1.4 < cw + 7.2;
          // lange Lücken (> 3,6 m) mit Anlauf im Rennen
          longGap = edge < Infinity && far - edge > 3.6;
          inp.run = longGap && ready;
          if (edge <= 0.75) {
            if (ready && p.gs > 4.2) { jump = true; inp.y = 1; commit = true; log.jumps++; }
            else inp.y = -0.6;                       // zu nah ohne Anlauf: ein Stück zurück
          } else if (wallAhead(p, 0.55) && cp < ahead + 4) { jump = true; inp.y = 1; commit = true; log.climbs++; }
          else if (edge < 1.4) inp.y = ready ? 1 : 0;
          else if (edge < 3.4) inp.y = ready ? 1 : (cp < ahead ? 0.5 : 0);
          else if (cp < ahead) inp.y = 1;
          if (o.stopC !== undefined && cp >= o.stopC && edge > 0.75) inp.y = 0;
        } else {
          // in der Luft: weiter nach vorn, Sprungtaste gehalten
          if (commit) { inp.y = 1; inp.run = longGap; }
        }
        if (jump && !prevJump) jumpHold = 40;
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
  }, { hero, laneL: null, laneG: null });
}

/** Aufbau (im Browser), Darstellung nachführen, auf neue Bilder warten, Screenshot, Kennzahlen. */
async function SHOT(name, setup, arg) {
  if (setup) await sc(setup, arg);
  const f0 = await sc(() => {
    const c = window.__course;
    c.player.invuln = 0;   // kein Blinken auf dem Bild (zwischen den Bildern wird nicht gerechnet)
    window.__t.cam(12);
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + 2, { timeout: 30000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w2d_${name}.png` });
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  return s;
}

// ====================================================================== Laden, Aufbau
console.log('\n2-Panzer „Brummbärs Panzerparade“');
await load({ fresh: true });
check('Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
let r = await sc(() => {
  const c = window.__course, L = c.level, t = window.__t;
  const kinds = {};
  for (const e of L.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  const v = c.view;
  return {
    title: L.data.title, arch: L.data.archetype, sub: L.data.scroll.with, music: L.data.music, theme: L.data.theme, timeLimit: L.data.timeLimit,
    kinds, sky: v.theme.label, fog: v.three.fog.color.getHexString(), panzer: !!L._panzer?.init || !!L._panzer,
    tanks: L.entities.filter((e) => e.kind === 'vehicle').map((e) => [e.spec.id, e.ext ? 'modell' : 'eigen']),
    stars: L.data.stars.length, stamp: !!L.data.stamp, end: L.scroll.s1, boss: L.data.boss.id,
    archBoss: !!c.arch?.sub && c.arch.boss === L.named.get('wirbel'),
  };
});
console.log(`  ${JSON.stringify({ ...r, kinds: undefined, tanks: r.tanks.length })}`);
console.log(`  Arten: ${JSON.stringify(r.kinds)}`);
check(`Titel/Archetyp: „${r.title}“, autoscroller + ${r.sub}, Thema ${r.theme} (${r.sky}), Musik ${r.music}, 400 s`, r.arch === 'autoscroller' && r.sub === 'boss' && r.theme === 'desert' && r.music === 'course_tank' && r.timeLimit === 400 && /Abendrot/.test(r.sky));
check(`Konvoi: 14 Panzer (Modell panzer_fahrzeug), Kanonen ${r.kinds.kanone_turm}, Marschblöcke ${r.kinds.marschblock}, Feuer-Schnappblumen ${r.kinds.feuer_schnappblume}, Wirbelbrocken`, r.tanks.length === 14 && r.tanks.every(([, m]) => m === 'modell') && r.kinds.kanone_turm === 2 && r.kinds.marschblock === 25 && r.kinds.feuer_schnappblume === 4 && r.kinds.wirbelbrocken === 1);
check('Level-Haken aktiv (Luke, Holzwand, Metalltor, Kanonen-Helme), Wirbelbrocken-Ansage über den Autoscroller erreichbar', r.panzer && r.kinds.panzerluke === 1 && r.kinds.brummwand === 1 && r.kinds.metalltor === 1 && r.kinds.helm_kanone >= 1 && r.archBoss);
check('3 Sterne + Stempel im Level', r.stars === 3 && r.stamp);
await SHOT('start', () => { window.__course.step(30); });

// ====================================================================== Konvoi und Bildfenster
r = await sc(() => {
  const c = window.__course, L = c.level, t = window.__t, w = L.scroll;
  t.park();
  let n = 0;
  while (w.state === 'wait' && n < 1000) { c.step(1); n++; }
  const t0 = L.time;
  const vs = L.entities.filter((e) => e.kind === 'vehicle');
  const z0 = vs.map((v) => v.pos.z), wz0 = w.center.z;
  c.step(240);
  const dz = vs.map((v, i) => v.pos.z - z0[i]);
  const wz1 = w.center.z;
  c.step(240);
  const dw = w.center.z - wz1;
  return { t0, dz: [Math.min(...dz), Math.max(...dz)], dw, speed: w.speed, vspeed: vs.map((v) => v.speedNow) };
});
check(`Abfahrt nach 2 s (${r.t0.toFixed(2)}); alle Panzer gemeinsam ${(-r.dz[0] / 2).toFixed(2)} m/s, Fenster ${(-r.dw / 2).toFixed(2)} m/s (gleitet am Zug entlang)`,
  near(r.t0, 2, 0.02) && near(r.dz[0], r.dz[1], 1e-6) && near(-r.dz[0] / 2, 3, 0.02) && near(r.speed, 5.2, 1e-6) && -r.dw > -r.dz[0] + 4);

// Marschblöcke marschieren auf dem fahrenden Deck, Helm und rote Münzen fahren mit
r = await sc(() => {
  const c = window.__course, L = c.level, t = window.__t;
  const T1 = t.ent('T1'), mb = t.ent('mb1'), helm = t.ent('helm1'), T3 = t.ent('T3');
  const rel = () => ({ mb: mb.pos.z - T1.pos.z, mbx: mb.pos.x, helm: helm.pos.z - T3.pos.z, y: mb.pos.y });
  const a = rel();
  c.step(240);
  const b = rel();
  const on = Math.abs(b.mb) < 7.5 && Math.abs(b.mbx) < 2.6;
  return { a, b, on, moved: Math.hypot(b.mb - a.mb, b.mbx - a.mbx) };
});
check(`Marschblöcke marschieren auf dem fahrenden Panzer (relativ ${r.a.mb.toFixed(2)} → ${r.b.mb.toFixed(2)}, Deck y ${r.b.y.toFixed(2)})`, r.on && r.moved > 0.5 && near(r.b.y, 2, 0.05));
check(`Kanonen-Helm liegt auf dem Kasten von T3 und fährt mit (${r.a.helm.toFixed(2)} → ${r.b.helm.toFixed(2)})`, near(r.a.helm, r.b.helm, 0.02));

// ====================================================================== Routen-Bot Lotti (ohne Helm, über Kisten und Tor)
await load({ hero: 'lotti' });
const botL = await sc((lane) => {
  const c = window.__course, t = window.__t, p = c.player;
  t.place(t.at(3, -0.6, 2.05), { invuln: 1e9, settle: 2 });
  const log = t.bot(lane, { lead: 1.6 });
  const k1 = t.ent('kanone1'), k2 = t.ent('kanone2');
  log.shots = [k1?.shots ?? 0, k2?.shots ?? 0];
  log.state = c.level.scroll.state;
  log.helmet = p.helmet;
  log.pushes = t.arch().pushes;
  log.coins = c.level.runtime.coins;
  return log;
}, LANE_LOTTI);
console.log(`  Bot Lotti: ${JSON.stringify(botL)}`);
check(`Lotti: Route bis zum Zughalt ohne Tod (c ${botL.finalC}, ${botL.jumps} Lückensprünge, ${botL.climbs} Kletter-Sprünge, Fenster ${botL.state})`, botL.done && botL.deaths === 0 && botL.state === 'done');
check(`Lotti: trägt jeder Hauptpanzer (${botL.tanks.join(' → ')})`, ['T1', 'T2', 'T3', 'T4L', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'TK'].every((id) => botL.tanks.includes(id)));
check(`Lotti: Stempel über dem Metalltor (über die Kisten), Checkpoint auf T5 berührt`, botL.stamp && botL.cp);
check(`Kanonen feuern Projektilköpfe (${botL.shots.join(' / ')} Schüsse)`, botL.shots[0] >= 2 && botL.shots[1] >= 2);
await SHOT('zughalt', () => { window.__course.step(60); });

// Luke beim Halt → Bossarena
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const luke = t.ent('luke');
  // unabhängig vom Bot-Ergebnis: Zug bis zum Halt fahren lassen
  if (L.scroll.state !== 'done') { t.waitWin(1e9); c.step(30); }
  const open = luke.open;
  // auf die Luke springen und ducken
  t.place([luke.pos.x, luke.pos.y + 1.4, luke.pos.z], { invuln: 0, settle: 30 });
  c.setInput({ crouch: true }); c.step(2); c.setInput({});
  let n = 0;
  while ((p.mode === 'script' || p.pos.z > -470) && n < 600) { c.step(1); n++; }
  c.step(20);
  return { open, p: p.info(), arch: t.arch().sub, camK: t.arch().camK };
});
check(`Luke ist beim Halt offen und führt in die Bossarena (Figur bei z ${r.p.z.toFixed(1)}, y ${r.p.y.toFixed(1)})`, r.open && r.p.z < -475 && r.p.y > 6.5 && !r.p.dead);

// ====================================================================== Bosskampf (Skript)
const boss = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('wirbel');
  const out = { start: b.state };
  // Ansagen mitschreiben (Autoscroller-HUD und Boss-HUD)
  const banners = [];
  for (const h of [c.arch.hud, c.arch.sub.hud]) { const f = h.banner.bind(h); h.banner = (txt, o) => { banners.push(txt); return f(txt, o); }; }
  out.banners = banners;
  // Checkpoint an der Arena berühren, dann hinein (trigger)
  for (let i = 0; i < 300 && !c.arch.sub.started; i++) { c.setInput({ y: 0.7 }); c.step(1); }
  c.setInput({});
  out.started = c.arch.sub.started;
  out.cp = L.runtime.checkpoint?.pos?.slice?.();
  const until = (s, n = 1500) => { let i = 0; for (; i < n && b.state !== s; i++) { safe(); c.step(1); } return i; };
  const A = L.data.boss;
  const cz = -492;
  function safe() {
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d < 4.5) { const ang = Math.atan2(b.pos.z - cz, b.pos.x) + Math.PI; p.pos.set(Math.cos(ang) * 7.5, 7.05, cz + Math.sin(ang) * 7.5); p.vel.set(0, 0, 0); }
  }
  const stomp = () => {
    p.reset([b.pos.x, b.pos.y + b.half.y * 2 + 0.6, b.pos.z], Math.PI / 2);
    let bounced = false;
    for (let i = 0; i < 150; i++) { c.step(1); if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = b.pos.x; p.pos.z = b.pos.z; } if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; } if (p.mode === 'ground') break; }
    return bounced;
  };
  until('run', 600);
  out.phases = [];
  for (let k = 0; k < 3; k++) {
    p.hurt = () => false;
    let spins = 0, last = b.state;
    for (let i = 0; i < 3000 && b.state !== 'stunned'; i++) { safe(); c.step(1); if (b.state === 'spin' && last !== 'spin') spins++; last = b.state; }
    delete p.hurt;
    const ph = b.phase;
    const bounced = stomp();
    out.phases.push({ phase: ph, spins, hp: b.hp, bounced });
    if (b.hp > 0) { p.hurt = () => false; until('run', 900); delete p.hurt; }
  }
  out.defeated = b.defeated;
  // Baron-Flucht beginnt, Boss verschwindet, Warp-Box erscheint
  let baronSeen = false, i = 0;
  for (; i < 900 && b.state !== 'gone'; i++) { c.step(1); if (L._panzer.flucht.active) baronSeen = true; }
  c.step(10);
  out.gone = b.state;
  out.baron = { seen: baronSeen, state: L._panzer.flucht.state };
  out.won = c.arch.sub.won;
  out.warp = !t.ent('warp_sieg').hidden;
  return out;
});
console.log(`  Boss: ${JSON.stringify(boss)}`);
check('Bossarena: Kampf beginnt beim Betreten (Checkpoint in der Arena gesetzt)', boss.started && Array.isArray(boss.cp) && boss.cp[2] < -480);
check(`Wirbelbrocken Phase 1/2/3: ${boss.phases.map((x) => `${x.spins} Wirbel`).join(', ')}, jeweils im Schwindel getroffen`, boss.phases.length === 3 && boss.phases.map((x) => x.phase).join() === '1,2,3' && boss.phases.map((x) => x.spins).join() === '1,2,3' && boss.phases[2].hp === 0);
check(`Ansagen im Autoscroller+Boss: eigene Phase-3-Ansage des Wirbelbrockens, keine „Feuerspur“ (${boss.banners.join(' | ')})`, boss.banners.some((x) => /wild/.test(x)) && !boss.banners.some((x) => /Feuerspur/.test(x)));
check(`Sieg: Wirbelbrocken besiegt, Baron flieht im Sportwagen (${boss.baron.state}), Warp-Box erscheint`, boss.defeated && boss.gone === 'gone' && boss.won && boss.baron.seen && boss.warp);

// Warp-Box → Oase → befreite Flocke → Zielmast → Ergebnis + Speicherstand
const fin = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  for (let i = 0; i < 600 && L._panzer.flucht.active; i++) c.step(1);
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = null;
  for (let i = 0; i < 400; i++) { c.step(1); if (p.pos.x > 50 && p.mode !== 'script') { arrived = p.info(); break; } }
  const fr = t.ent('flocke');
  // zum Käfig, dann zum Zielmast
  const go = (x, z, n = 600) => { for (let i = 0; i < n; i++) { const dx = x - p.pos.x, dz = z - p.pos.z; if (Math.hypot(dx, dz) < 0.6 || c.finished) break; const l = Math.hypot(dx, dz); c.setInput({ x: dx / l, y: -dz / l }); c.step(1); } c.setInput({}); };
  go(fr.pos.x + 1.0, fr.pos.z + 1.6);
  c.step(120);
  const freed = fr.freed;
  const g = L.data.goal.pos;
  go(g[0] - 0.4, g[2] + 0.2, 900);
  for (let i = 0; i < 1200 && !c.finished; i++) c.step(1);
  return { arrived: arrived && [arrived.x, arrived.z], freed, finished: c.finished, result: c.lastResult ? { pole: c.lastResult.pole } : null, save: t.save().levels?.['2-Panzer'] ?? null };
});
console.log(`  Ziel: ${JSON.stringify(fin)}`);
check('Warp-Box führt zur Oase, Flocke wird befreit', !!fin.arrived && fin.freed);
check(`Zielmast beendet das Level, Speicherstand 2-Panzer erledigt (${JSON.stringify(fin.save)})`, fin.finished && fin.save?.done === true && fin.save.stamp === true);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}w2d_ergebnis.png` });

// ====================================================================== Routen-Bot Greta (mit Kanonen-Helm)
await load({ hero: 'greta' });
const botG = await sc((lane) => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  t.place(t.at(3, -0.6, 2.05), { invuln: 1e9, settle: 2 });
  let helmAt = null;
  const orig = p.wearHelmet.bind(p);
  p.wearHelmet = (n) => { const r = orig(n); if (r && helmAt === null) helmAt = +t.cOf(p.pos.z).toFixed(1); return r; };
  const log = t.bot(lane, { lead: 1.6 });
  log.helmAt = helmAt;
  log.helmet = p.helmet;
  log.state = L.scroll.state;
  log.k1 = t.ent('kanone1')?.defeated ?? null;
  log.tor = t.ent('tor').opened;
  log.balls = window.__sfx.filter(([n]) => n === 'cannon').length;
  return log;
}, LANE_GRETA);
console.log(`  Bot Greta: ${JSON.stringify(botG)}`);
check(`Greta: Route bis zum Zughalt ohne Tod (c ${botG.finalC}, ${botG.jumps} Lückensprünge)`, botG.done && botG.deaths === 0 && botG.state === 'done');
check(`Greta: trägt jeder Hauptpanzer (${botG.tanks.join(' → ')})`, ['T1', 'T2', 'T3', 'T4L', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'TK'].every((id) => botG.tanks.includes(id)));
check(`Greta: Kanonen-Helm am Heck von T3 aufgesetzt (c ${botG.helmAt}), feuert unterwegs (${botG.balls} Kugeln)`, botG.helmAt !== null && botG.helmAt < 40 && botG.balls > 10);

// ====================================================================== Sterne, Stempel, roter Ring, Helm, Einklemmen
await load({ hero: 'lotti' });
// Einklemmen: hinter der Kanone auf T3 stehen bleiben, bis die hintere Grenze kommt
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const k = t.ent('kanone1');
  t.waitWin(t.cOf(k.pos.z) - 2.4);
  const spot = [k.pos.x, k.pos.y + 0.05, k.pos.z + 0.6 + 0.32];
  t.place(spot, { invuln: 1e9, settle: 1 });
  k.setActive(false);
  const c0 = t.arch().crushed;
  let n = 0;
  while (!p.dead && n < 120 * 12) { c.step(1); n++; }
  return { dead: p.dead, cause: p.deathCause, crushed: t.arch().crushed - c0, secs: n / 120 };
});
check(`Einklemmen zwischen Kanone und hinterer Grenze = Tod (${r.cause} nach ${r.secs.toFixed(1)} s)`, r.dead && r.cause === 'crush' && r.crushed === 1);

// Neustart ohne Checkpoint: Fahrt von vorn
r = await sc(() => {
  const c = window.__course, p = c.player, w = c.level.scroll;
  let n = 0; while (p.dead && n < 800) { c.step(1); n++; }
  c.step(2);
  return { state: w.state, s: w.s, z: p.pos.z, T1: window.__t.ent('T1').pos.z };
});
check(`Neustart: Fahrt von vorn (Fenster ${r.state}, Figur z ${r.z.toFixed(1)} auf T1)`, r.state === 'wait' && near(r.T1, -8, 0.01) && near(r.z, -3, 0.4));

// Roter Ring auf T3: rote Münzen fahren mit, alle acht in 10 s → 1-up
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const ring = t.ent('ring'), T3 = t.ent('T3');
  t.waitWin(t.cOf(ring.pos.z) - 1);
  t.place([ring.pos.x, ring.pos.y + 0.05, ring.pos.z + 1.2], { invuln: 1e9, settle: 2 });
  c.setInput({ y: 1 }); c.step(40); c.setInput({});
  const st = ring.state;
  const coins = ring.coins.slice();
  const rel0 = coins.map((m) => m.pos.z - T3.pos.z);
  const lives0 = L.runtime.lives;
  c.step(60);
  const drift = Math.max(...coins.map((m, i) => Math.abs(m.pos.z - T3.pos.z - rel0[i])));
  // jede Münze anfliegen (auf dem jeweiligen Panzer, Fenster läuft weiter)
  for (const m of coins) {
    if (!m.alive) continue;
    p.reset([m.pos.x, m.pos.y - 0.45, m.pos.z], Math.PI / 2);
    for (let i = 0; i < 6 && m.alive; i++) c.step(1);
  }
  c.step(3);
  const rewardOn = L.entities.filter((e) => e.kind === 'powerup' && e.power === 'oneup').map((e) => e.spec.attach);
  // 1-up einsammeln
  const up = L.entities.find((e) => e.kind === 'powerup' && e.power === 'oneup');
  if (up) { p.reset([up.pos.x, up.pos.y, up.pos.z], Math.PI / 2); c.step(3); }
  return { st, n: coins.length, drift, state: ring.state, rewardOn, lives: L.runtime.lives - lives0, attached: coins.map((m) => m.spec.attach) };
});
check(`Roter Ring auf dem fahrenden T3: 8 rote Münzen erscheinen auf den Panzern (${r.attached.join(',')}) und fahren mit (Abdrift ${r.drift.toFixed(3)} m)`, r.st === 'active' && r.n === 8 && r.drift < 0.01 && r.attached.every(Boolean));
check(`Roter Ring: alle acht eingesammelt → 1-up (fährt auf dem Panzer mit: ${r.rewardOn.join(",") || "gleich eingesammelt"}) gibt ein Leben`, r.state === 'done' && r.lives >= 1);
await SHOT('ring', () => {
  const c = window.__course, t = window.__t;
  const ring = t.ent('ring');
  ring.state = 'idle'; ring.rearm = 0;
  t.place([ring.pos.x, ring.pos.y + 0.05, ring.pos.z + 1.2], { invuln: 1e9, settle: 2 });
  c.setInput({ y: 1 }); c.step(30); c.setInput({}); c.step(20);
  c.player.yaw = Math.PI / 2;
});

// Stern 1 zwischen drei Feuer-Schnappblumen (T4R): Blumen spucken, Stern erreichbar
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const s1 = t.ent('stern1');
  t.waitWin(t.cOf(s1.pos.z) - 1);
  t.place([s1.pos.x, s1.pos.y - 0.85, s1.pos.z + 3.6], { invuln: 0, settle: 2 });
  const fs = ['fs1', 'fs2', 'fs3'].map((id) => t.ent(id));
  let spits = 0;
  for (let i = 0; i < 240; i++) c.step(1);
  spits = fs.reduce((a, f) => a + (f.spits ?? 0), 0);
  // zum Stern laufen (unverwundbar, nur die Erreichbarkeit zählt)
  p.invuln = 1e9;
  for (let i = 0; i < 300 && s1.alive; i++) { const dz = s1.pos.z - p.pos.z, dx = s1.pos.x - p.pos.x; c.setInput({ x: Math.max(-1, Math.min(1, dx * 2)), y: Math.max(-1, Math.min(1, -dz * 2)), jump: i % 60 < 20 }); c.step(1); }
  c.setInput({});
  return { got: !!L.runtime.stars[0], spits, ground: t.ground() };
});
console.log(`  Stern 1: ${JSON.stringify(r)}`);
check(`Stern 1 zwischen drei Feuer-Schnappblumen (spucken ${r.spits}×) erreicht`, r.got && r.spits > 0);
await SHOT('stern1', () => {
  const c = window.__course, t = window.__t;
  const f = t.ent('fs3');
  t.place([f.pos.x - 1.2, f.pos.y + 0.05, f.pos.z + 4.6], { invuln: 1e9, settle: 30 });
  c.player.invuln = 0;
});

// Stern 2: Kiste auf dem kleinen Beipanzer T7s – Stampfattacke zerbricht sie
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const k = t.ent('kiste_stern'), s2 = t.ent('stern2');
  t.waitWin(t.cOf(k.pos.z) - 1);
  const hidden0 = s2.hidden;
  t.place([k.pos.x, k.pos.y + 3.2, k.pos.z], { invuln: 1e9, settle: 0 });
  for (let i = 0; i < 20; i++) { p.pos.x = k.pos.x; p.pos.z = k.pos.z; c.step(1); }
  c.setInput({ crouch: true }); c.step(2); c.setInput({});
  for (let i = 0; i < 90; i++) { if (p.mode === "air") { p.pos.x = k.pos.x; p.pos.z = k.pos.z; } c.step(1); }
  return { hidden0, broken: !k.alive, shown: !s2.hidden, got: !!L.runtime.stars[1], rel: s2.alive ? s2.pos.z - t.ent('T7s').pos.z : null };
});
console.log(`  Stern 2: ${JSON.stringify(r)}`);
check(`Stern 2: Stampfattacke auf die Kiste des Beipanzers → Stern erscheint und wird eingesammelt`, r.hidden0 && r.broken && r.got);

// Kanonen-Helm: Holzwand mit Baron-Gesicht (3 Kanonenkugeln) → Stern 3; Kanone 2 zerstört
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const wand = t.ent('wand'), s3 = t.ent('stern3');
  t.waitWin(t.cOf(wand.pos.z) - 4);
  t.place([wand.pos.x, wand.pos.y + 0.05, wand.pos.z + 3.2], { invuln: 1e9, settle: 2 });
  // Kammer ist zu: der Stern ist ohne Helm nicht zu erreichen (Stampfen/Tatze klopfen nur)
  wand.onHit('pound'); wand.onHit('claw');
  const hp0 = wand.hp;
  p.wearHelmet('kanone');
  const hits = [];
  for (let i = 0; i < 300 && !wand.broken; i++) { c.step(1); if (hits[hits.length - 1] !== wand.hp) hits.push(wand.hp); }
  for (let i = 0; i < 60; i++) c.step(1);
  // hinein zum Stern
  for (let i = 0; i < 240 && s3.alive; i++) { const dx = s3.pos.x - p.pos.x, dz = s3.pos.z - p.pos.z; c.setInput({ x: Math.max(-1, Math.min(1, dx * 2)), y: Math.max(-1, Math.min(1, -dz * 2)) }); c.step(1); }
  c.setInput({});
  return { hp0, hits, broken: wand.broken, got: !!L.runtime.stars[2] };
});
check(`Holzwand: Stampfen/Tatze klopfen nur (hp ${r.hp0}), drei Kanonenkugeln (${r.hits.join(' → ')}) zerlegen sie, Stern 3 dahinter`, r.hp0 === 3 && r.broken && r.got);
await SHOT('holzwand', () => {
  const c = window.__course, t = window.__t;
  const k = t.ent('kanone2');
  t.place([k.pos.x + 1.6, k.pos.y + 0.05, k.pos.z + 5], { invuln: 1e9, settle: 20 });
});
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const k = t.ent('kanone2');
  t.waitWin(t.cOf(k.pos.z) - 2);
  t.place([k.pos.x, k.pos.y + 0.05, k.pos.z + 4], { invuln: 1e9, settle: 2, keepHelmet: true });
  if (!p.helmet) p.wearHelmet('kanone');
  for (let i = 0; i < 240 && !k.defeated; i++) c.step(1);
  return { destroyed: k.defeated };
});
check('Kanone 2 mit dem Kanonen-Helm zerstört', r.destroyed);

// Stempel über dem Metalltor (über die Kisten) und Tor per Kanonenkugel
await load({ hero: 'lotti' });
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const tor = t.ent('tor');
  t.waitWin(t.cOf(tor.pos.z) - 3);
  // ohne Helm gegen das Tor: es bleibt zu (Stampfen klopft nur)
  tor.onHit('pound');
  const closed = !tor.opened;
  t.place([tor.pos.x, tor.pos.y + 0.05, tor.pos.z + 2.4], { invuln: 1e9, settle: 2 });
  p.wearHelmet('kanone');
  for (let i = 0; i < 200 && !tor.opened; i++) c.step(1);
  // durch das offene Tor laufen
  const z0 = p.pos.z;
  c.setInput({ y: 1 }); c.step(80); c.setInput({});
  return { closed, opened: tor.opened, through: p.pos.z < tor.pos.z - 0.5, z0, z: p.pos.z };
});
check(`Metalltor: zu ohne Kanone; eine Kanonenkugel öffnet es, Durchgang frei`, r.closed && r.opened && r.through);

// Checkpoint auf T5: Neustart mit der Fensterlage von damals
await load({ hero: 'lotti' });
r = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level, w = L.scroll;
  const cp = L.entities.find((e) => e.kind === 'checkpoint' && e.spec.attach === 'T5');
  t.waitWin(t.cOf(cp.pos.z) - 2);
  t.place([cp.pos.x, cp.pos.y + 0.05, cp.pos.z], { invuln: 0, settle: 2 });
  const snap = { s: w.s, T5: t.ent('T5').pos.z };
  c.step(120 * 4);
  p.die('hit');
  let n = 0; while (p.dead && n < 800) { c.step(1); n++; }
  c.step(1);
  return { active: cp.active, snap, s: w.s, T5: t.ent('T5').pos.z, p: p.info(), ground: t.ground() };
});
check(`Checkpoint auf T5 (fährt mit): Neustart mit Fensterlage von damals (s ${r.s.toFixed(1)} = ${r.snap.s.toFixed(1)}), Figur steht wieder auf T5`, r.active && near(r.s, r.snap.s, 0.2) && near(r.T5, r.snap.T5, 0.3) && (r.ground === 'T5' || near(r.p.y, 2, 0.1)));

// ====================================================================== Bilder und Kennzahlen je Abschnitt
await load({ hero: 'lotti' });
const SECTIONS = [
  ['a1_erster_panzer', 8, -1.2], ['a2_zweiter_panzer', 24, -1.4], ['a3_dritter_panzer', 40, 1.4], ['a4_doppelreihe', 58, -2.0],
  ['a4_checkpoint', 73, -1.0], ['a5_luecken', 98, -1.8], ['a5_tor', 112, -1.0], ['a5_holzwand', 128, -1.4], ['a5_kanone2', 143, 0.8],
  ['a6_kommandopanzer', 172, -1.5],
];
for (const [name, cc, x] of SECTIONS) {
  await SHOT(name, ({ cc, x }) => {
    const c = window.__course, t = window.__t;
    t.waitWin(cc - 1.5);
    t.placeC(cc, x, { invuln: 1e9, settle: 4 });
    c.player.yaw = Math.PI / 2;
  }, { cc, x });
}
await SHOT('a6_luke', () => {
  const c = window.__course, t = window.__t;
  t.waitWin(999);
  c.step(200);
  const l = t.ent('luke');
  t.place([l.pos.x - 1.4, l.pos.y + 0.05, l.pos.z + 2.6], { invuln: 1e9, settle: 30 });
});
await SHOT('a7_arena', () => {
  const c = window.__course, t = window.__t, p = c.player;
  const l = t.ent('luke');
  t.place([l.pos.x, l.pos.y + 1.4, l.pos.z], { invuln: 1e9, settle: 30 });
  c.setInput({ crouch: true }); c.step(2); c.setInput({});
  c.step(200);
  for (let i = 0; i < 300 && !c.arch.sub.started; i++) { c.setInput({ y: 0.7 }); c.step(1); }
  c.setInput({});
  c.step(150);
});
await SHOT('a7_boss_wirbel', () => {
  const c = window.__course, t = window.__t, b = t.ent('wirbel');
  c.player.invuln = 1e9;   // SHOT setzt die Unverwundbarkeit fürs Bild zurück
  for (let i = 0; i < 1500 && b.state !== 'spin'; i++) c.step(1);
  c.step(40);
});
await SHOT('a7_boss_kugel', () => {
  const c = window.__course, t = window.__t, b = t.ent('wirbel');
  c.player.invuln = 1e9;
  for (let i = 0; i < 2000 && b.state !== 'stunned'; i++) c.step(1);
  b.takeHit('stomp');
  for (let i = 0; i < 200 && b.state !== 'hide'; i++) c.step(1);
  c.step(60);
});
await SHOT('a7_baron', () => {
  const c = window.__course, t = window.__t, b = t.ent('wirbel'), L = c.level;
  c.player.invuln = 1e9;
  b.hp = 1; b.takeHit('stomp');
  for (let i = 0; i < 500 && !(L._panzer.flucht.state === 'stop'); i++) c.step(1);
  c.step(40);
});
await SHOT('a7_oase', () => {
  const c = window.__course, t = window.__t, L = c.level;
  c.player.invuln = 1e9;
  for (let i = 0; i < 900 && L._panzer.flucht.active; i++) c.step(1);
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  c.step(200);
  c.setInput({ y: 0.6, x: 0.3 }); c.step(60); c.setInput({}); c.step(30);
});

console.log('\nKennzahlen (Zeichenaufrufe inkl. Schattenpass / Dreiecke):');
for (const [n, calls, tri] of stats) console.log(`  ${n.padEnd(22)} ${String(calls).padStart(4)}  ${(tri / 1000).toFixed(0).padStart(4)} k`);
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTri = Math.max(...stats.map((s) => s[2]));
check(`Budget: höchstens ${maxCalls} Zeichenaufrufe (< 130) und ${(maxTri / 1000).toFixed(0)} k Dreiecke (< 300 k) an allen Stellen`, maxCalls < 130 && maxTri < 300000);

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
