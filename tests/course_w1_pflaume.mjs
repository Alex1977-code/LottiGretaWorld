// Kurs-Modus, Welt 1: die Pflaume-Level 1-4 „Pflaumes Wildwasserfahrt“ (Archetyp ride) und 1-Schatz „Pflaume und der
// Wolkenwürfel“ (Archetyp diorama) – deterministisch über window.__course.step(n)/setInput (Teleport erlaubt), danach
// Screenshots tests/out/w1p_*.png und Kennzahlen (Budget < 120 Zeichenaufrufe inkl. Schattenpass, < 300 k Dreiecke).
// Aufruf: PORT_BASE=2400 node tests/course_w1_pflaume.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4197;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);

async function load(id) {
  await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
  } catch {
    console.log(`${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    const P = () => c.player;
    window.__t = {
      /** Kanal ch auf Seitenlage lat folgen (Autopilot wie ein Kind mit Stick), n Schritte */
      auto(chId, lat, n, extra = {}) {
        const p = P(), ch = c.level.river.channel(chId);
        for (let i = 0; i < n; i++) {
          if (!p.riding || p.dead) { c.setInput({}); c.step(1); continue; }
          const q = ch.nearest(p.pos.x, p.pos.z, {});
          const cy = c.level.controlYaw, rx = Math.cos(cy), rz = -Math.sin(cy);
          const side = (q.x + q.rx * lat - p.pos.x) * rx + (q.z + q.rz * lat - p.pos.z) * rz;
          c.setInput({ x: Math.max(-1, Math.min(1, side * 0.7)), ...extra });
          c.step(1);
        }
        c.setInput({});
        return p.info();
      },
      /** wie auto, bis z unterschritten ist; beob(p) je Schritt */
      to(chId, lat, z, max = 9000, watch = null) {
        const p = P();
        let n = 0;
        while (p.pos.z > z && n < max && !c.finished) { this.auto(chId, lat, 5); n += 5; watch?.(p); }
        return n;
      },
      /** zu Fuß zu (tx, tz) laufen – Stick relativ zur Kamera */
      walk(tx, tz, max = 2000, tol = 0.25, extra = {}) {
        const p = P();
        for (let i = 0; i < max; i++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < tol || c.finished) break;
          const cy = c.level.controlYaw, rx = Math.cos(cy), rz = -Math.sin(cy), fx = -Math.sin(cy), fz = -Math.cos(cy);
          const k = Math.min(1, d / 0.6);
          c.setInput({ x: ((dx * rx + dz * rz) / d) * k, y: ((dx * fx + dz * fz) / d) * k, ...extra });
          c.step(1);
        }
        c.setInput({});
        return p.info();
      },
      waitFor(fn, max = 4000) { let i = 0; while (!fn() && i < max) { c.step(1); i++; } return i; },
      info: () => P().info(),
      rt: () => c.level.runtime.info(),
    };
  });
}

/** Bild zeichnen lassen und speichern; liefert Kennzahlen des Bildes. */
const stats = [];
async function shot(name, setup = null, arg = undefined) {
  if (setup) await sc(setup, arg);
  const f0 = await sc(() => {
    const c = window.__course;
    for (let i = 0; i < 20; i++) c.rig.update(0.05, c.view.time + i * 0.05);
    if (c.arch?.orbit) c.arch.orbit.inited = false;
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + 2, { timeout: 60000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w1p_${name}.png` });
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  return s;
}

// =============================================================================================== 1-4 Fluss-Ritt
await load('1-4');
console.log('1-4 Pflaumes Wildwasserfahrt');
const m = await sc(() => window.__course.level.data.marks);
const r0 = await sc(() => {
  const c = window.__course, L = c.level;
  return {
    arch: c.state().archetype, title: L.data.title, moles: L.entities.filter((e) => e.kind === 'wuehler').length,
    channels: L.river.channels.map((ch) => ch.id), p: c.player.info(), drums: c.arch.drums,
  };
});
check(`Archetyp ride, Titel „${r0.title}“, Kanäle ${r0.channels.join('/')}`, r0.arch && r0.channels.length === 3);
check(`29 Wühler im Fluss (${r0.moles})`, r0.moles === 29);
check('Start zu Fuß auf dem Steg, Pflaume wartet', !r0.p.riding && r0.p.moored && r0.p.mode === 'ground');
await shot('ritt_steg');

for (const hero of ['lotti', 'greta']) {
  // Aufsteigen: zum Floß laufen
  const mt = await sc((h) => {
    const c = window.__course, p = c.player;
    c.setHero(h);
    c.teleport(0, 0.62, 12.5);
    c.step(10);
    let n = 0;
    c.setInput({ y: 1 });
    while (!p.riding && n < 400) { c.step(1); n++; }
    c.setInput({});
    c.step(30);
    return { n, riding: p.riding, drums: c.arch.drums, y: p.pos.y };
  }, hero);
  check(`${hero}: Aufsteigen am Steg (${mt.n} Schritte), Energie-Ebene der Musik an`, mt.riding && mt.drums === true);
  // Strömung trägt
  const fl = await sc(() => {
    const c = window.__course, p = c.player;
    c.teleport(...window.__course.level.data.marks.ramp.map((v, i) => (i === 2 ? v - 20 : v)));
    c.step(5);
    const z0 = p.pos.z;
    c.setInput({});
    c.step(240);
    return { dz: p.pos.z - z0, flow: p.flow.speed, riding: p.riding };
  });
  check(`${hero}: Strömung trägt flussabwärts (${f2(fl.dz)} m in 2 s, Strömung ${f2(fl.flow)} m/s)`, fl.dz < -9 && fl.riding);
  // Lenken wirkt (rechts gegen links vom selben Punkt)
  const st = await sc(() => {
    const c = window.__course, p = c.player, net = c.level.river, ch = net.channel('main');
    const run = (x) => { c.teleport(1, 0, -32); c.step(3); c.setInput({ x }); c.step(70); c.setInput({}); return ch.nearest(p.pos.x, p.pos.z, {}).lat; };
    return { r: run(1), l: run(-1) };
  });
  check(`${hero}: Lenken wirkt quer zur Strömung (rechts ${f2(st.r)} m, links ${f2(st.l)} m)`, st.r - st.l > 4);
  // Hüpfer
  const hp = await sc(() => {
    const c = window.__course, p = c.player;
    c.teleport(1, 0, -32); c.step(5);
    const y0 = p.pos.y;
    c.setInput({ jump: true });
    let maxY = y0, air = false;
    for (let i = 0; i < 90; i++) { if (i === 45) c.setInput({}); c.step(1); maxY = Math.max(maxY, p.pos.y); if (p.mode === 'air') air = true; }
    c.setInput({});
    c.step(60);
    return { h: maxY - y0, air, back: p.mode === 'ground' && p.riding };
  });
  check(`${hero}: Floß-Hüpfer (${f2(hp.h)} m hoch, wieder auf dem Wasser)`, hp.air && hp.h > 1.3 && hp.back);
  // Ufer blockiert
  const bk = await sc(() => {
    const c = window.__course, p = c.player, ch = c.level.river.channel('main');
    c.teleport(0, 0, -36); c.step(3);
    let maxOut = -9;
    c.setInput({ x: 1 });
    for (let i = 0; i < 300; i++) { c.step(1); const q = ch.nearest(p.pos.x, p.pos.z, {}); maxOut = Math.max(maxOut, Math.abs(q.lat) - (q.w / 2 - 0.62)); }
    c.setInput({});
    return { maxOut, riding: p.riding };
  });
  check(`${hero}: Ufer blockiert (höchstens ${f2(bk.maxOut)} m über den Korridor)`, bk.maxOut < 0.05 && bk.riding);
}

// Wühler-Treffer (aufgetaucht = Hindernis), Figur bleibt auf dem Floß
const hit = await sc(() => {
  const c = window.__course, p = c.player, L = c.level, net = L.river;
  c.setHero('lotti');
  p.big = true; p.power = 'none';
  const mole = L.entities.find((e) => e.kind === 'wuehler' && Math.abs(e.pos.z + 24) < 1.5);
  mole.mover = null;
  const ch = net.channel('main'), q = ch.at(ch.nearest(1.5, -27, {}).s, {});
  mole.pos.set(q.x, q.y, q.z);
  c.teleport(q.x - q.tx * 4, q.y, q.z - q.tz * 4);
  p.big = true; p.updateHalf(); p.invuln = 0;
  mole.setState('up'); mole.stateT = -1; mole.touch = true;
  let hurt = false;
  for (let i = 0; i < 200 && !hurt; i++) { c.step(1); if (p.invuln > 0) hurt = true; mole.stateT = Math.min(mole.stateT, 0); }
  return { hurt, big: p.big, riding: p.riding, dead: p.dead };
});
check('Aufgetauchter Wühler trifft: groß → klein, Heldin bleibt auf dem Floß', hit.hurt && !hit.big && hit.riding && !hit.dead);

// Rampe → Stern 1
const s1 = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks;
  p.big = true;
  c.teleport(...m.ramp); c.step(3);
  let maxY = -99;
  for (let i = 0; i < 260; i++) { window.__t.auto('main', 0, 1); maxY = Math.max(maxY, p.pos.y); }
  return { star: c.level.runtime.stars[0], maxY };
});
check(`Rampe: weiter Sprung (Scheitel y ${f2(s1.maxY)}), Stern 1 über der Rampe`, s1.star && s1.maxY > 2);
await shot('ritt_rampe', () => { const c = window.__course; c.teleport(...c.level.data.marks.ramp); c.step(3); window.__t.auto('main', 0, 170); });

// Checkpoint beim Vorbeifahren, Neustart im Fluss
const cp = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks;
  c.teleport(m.cp[0], m.cp[1], m.cp[2] + 12); c.step(3);
  window.__t.to('main', 0, m.cp[2] - 4);
  const set = c.level.runtime.checkpoint;
  p.die('hit');
  for (let i = 0; i < 400 && (p.dead || !p.riding); i++) c.step(1);
  return { set: !!set, pos: set?.pos, riding: p.riding, z: p.pos.z, dead: p.dead };
});
check(`Checkpoint gesetzt, Neustart auf dem Floß im Fluss (z ${f2(cp.z)})`, cp.set && cp.riding && !cp.dead && Math.abs(cp.z - (m.cp[2] + 4)) < 3);

// Hauptroute (Zickzack) → Stempel; Seitenarm → Stern 2 (nicht im selben Durchgang)
const zz = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks, rt = c.level.runtime;
  p.hurt = () => false;
  rt.stamp = false; rt.stars[1] = false;
  c.teleport(...m.fork); c.step(3);
  let minX = 99, maxX = -99;
  window.__t.to('main', 0, -170, 9000, (q) => { minX = Math.min(minX, q.pos.x); maxX = Math.max(maxX, q.pos.x); });
  window.__t.to('main', 3.15, -180.5);
  const stamp = rt.stamp;
  window.__t.to('main', 0, -196);
  return { stamp, star2: rt.stars[1], swing: maxX - minX, ch: p.flow.ch.id };
});
check(`Zickzack-Strömung (Ausschlag ${f2(zz.swing)} m), Stempel am Ende der Zickzack-Strecke`, zz.stamp && zz.swing > 8);
check('Hauptroute: Stern 2 (Wasserfall) dort nicht erreichbar', !zz.star2);
const sd = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks, rt = c.level.runtime;
  rt.stamp = false;
  c.teleport(...m.fork); c.step(3);
  const chans = new Set();
  window.__t.to('side', 0, -186, 9000, (q) => chans.add(q.flow.ch.id));
  window.__t.to('main', 0, -196);
  return { star2: rt.stars[1], stamp: rt.stamp, side: chans.has('side'), z: p.pos.z };
});
check('Wasserfall-Abzweig erreichbar: Stern 2 in der Grotte hinter dem bunten Wasserfall', sd.side && sd.star2);
check('Seitenarm: Stempel dort nicht erreichbar (anderer Weg)', !sd.stamp);
await shot('ritt_wasserfall', () => { const c = window.__course; c.teleport(...c.level.data.marks.side); c.step(3); window.__t.to('side', 0, -131.5); });
await shot('ritt_zickzack', () => { const c = window.__course; c.teleport(...c.level.data.marks.zigzag); c.step(3); window.__t.to('main', 0, -140); });

// Klippe: Stern 3 an der Kante, 30 m Absturz in die Lagune, Strand, Absteigen, Ziel
const cl = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks, rt = c.level.runtime;
  c.teleport(...m.edge); c.step(3);
  const y0 = p.pos.y;
  let minY = 99, plunge = false;
  window.__t.to('main', -2.9, -222, 9000, (q) => { minY = Math.min(minY, q.pos.y); if (q.plunging) plunge = true; });
  window.__t.auto('lagoon', 0, 400);
  for (let i = 0; i < 40; i++) { c.step(1); minY = Math.min(minY, p.pos.y); }
  return { star3: rt.stars[2], plunge, fall: y0 - minY, riding: p.riding, y: p.pos.y };
});
check(`Klippe: Absturz ${f2(cl.fall)} m (Kamera folgt), Stern 3 an der Kante`, cl.plunge && cl.fall > 28 && cl.star3);
await shot('ritt_klippe', () => { const c = window.__course; c.teleport(...c.level.data.marks.edge); c.step(3); window.__t.to('main', -2.9, -217.3); });
await shot('ritt_absturz', () => { const c = window.__course; c.teleport(...c.level.data.marks.edge); c.step(3); window.__t.to('main', -1, -218); window.__t.auto('main', -1, 95); });
const gl = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks;
  c.teleport(...m.lagoon); c.step(3);
  let n = 0;
  while (!p.dismounted && n < 3000) { c.step(1); n++; }
  c.step(120);
  c.rig.update(0.05, c.view.time + 0.05);
  const beach = p.info();
  window.__t.walk(0, -261.6, 900, 0.3);
  c.setInput({ y: 1, jump: true }); c.step(40); c.setInput({ y: 1 }); c.step(40); c.setInput({});
  for (let i = 0; i < 600 && !c.finished; i++) c.step(1);
  return { beach, finished: c.finished, status: c.level.runtime.status, rig: !!c.rig.pflFree };
});
check('Strand: Absteigen, Pflaume hoppelt hinterher', gl.beach.dismounted && !gl.beach.riding && gl.beach.mode !== 'script' && gl.rig);
check('Ziel erreichbar: Röhre mit Zielmast', gl.finished && gl.status === 'done');
await sc(() => { const r = window.__game.scene.getScene('CourseResult'); if (r?.sys.isActive()) window.__game.scene.stop('CourseResult'); });

// Hauptroute von Anfang bis Ziel in Spielzeit (frisches Level, ohne Unverwundbarkeit-Tricks außer Wühler-Ausweichen)
await load('1-4');
const run = await sc(() => {
  const c = window.__course, p = c.player;
  p.hurt = () => false;     // Autopilot weicht Wühlern nicht aus
  c.setInput({ y: 1 });
  while (!p.riding) c.step(1);
  window.__t.to('main', 0, -218.5);
  window.__t.auto('lagoon', 0, 200);
  let n = 0;
  while (!p.dismounted && n < 4000) { window.__t.auto('lagoon', 0, 10); n += 10; }
  c.step(90);
  window.__t.walk(0, -261.6, 900, 0.3);
  c.setInput({ y: 1, jump: true }); c.step(40); c.setInput({ y: 1 }); c.step(40); c.setInput({});
  let k = 0;
  while (!c.level.runtime.pole && k < 300) { c.step(1); k++; }
  return { time: c.level.runtime.elapsed, goal: c.level.runtime.status };
});
check(`Hauptroute in ${f2(run.time)} s Spielzeit (< 180 s)`, run.time < 180 && (run.goal === 'goal' || run.goal === 'done'));

// Screenshots im Ritt (Greta) und Kennzahlen
await load('1-4');
await shot('ritt_start', () => { const c = window.__course, p = c.player; c.setHero('greta'); c.setInput({ y: 1 }); while (!p.riding) c.step(1); c.setInput({}); c.step(200); });
await shot('ritt_kaskade', () => { const c = window.__course; c.teleport(-1.5, -0.5, -40); c.step(3); window.__t.to('main', 0, -52.5); });
await shot('ritt_lagune', () => { const c = window.__course; c.teleport(...c.level.data.marks.lagoon); c.step(60); });
await shot('ritt_strand', () => {
  const c = window.__course, p = c.player;
  c.teleport(...c.level.data.marks.lagoon);
  let n = 0;
  while (!p.dismounted && n < 3000) { c.step(1); n++; }
  c.step(200);
  window.__t.walk(0, -258, 400);
});
check('Keine Konsolenfehler (1-4)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

// =============================================================================================== 1-Schatz Diorama
await load('1-Schatz');
console.log('1-Schatz Pflaume und der Wolkenwürfel');
const d0 = await sc(() => {
  const c = window.__course, L = c.level;
  return {
    arch: c.state().archetype, title: L.data.title, bugs: L.entities.filter((e) => e.kind === 'krabbelkaefer').length,
    stars: L.runtime.stars.length, hud: window.__game.scene.getScene('CourseUI').nStars, avatar: !!c.rig.avatar, gear: c.rig.proxy.course.gear,
  };
});
check(`Archetyp diorama, Titel „${d0.title}“, 5 Sterne, 9 Krabbelkäfer (${d0.bugs})`, d0.arch && d0.stars === 5 && d0.bugs === 9);
check('HUD zeigt 5 Stern-Plätze', d0.hud === 5);
check('Pflaume mit Stirnlampe und Rucksack (gear lamp)', d0.avatar && d0.gear === 'lamp');
const nj = await sc(() => {
  const c = window.__course, p = c.player;
  c.step(20);
  const y0 = p.pos.y;
  let maxY = y0;
  for (let i = 0; i < 90; i++) { c.setInput({ jump: true, crouch: i % 2 === 0 }); c.step(1); maxY = Math.max(maxY, p.pos.y); }
  c.setInput({});
  const x0 = p.pos.x, z0 = p.pos.z;
  c.setInput({ x: 1, run: true }); c.step(120); c.setInput({});
  return { dy: maxY - y0, speed: Math.hypot(p.pos.x - x0, p.pos.z - z0) };
});
check(`Kein Sprung möglich (Höhe ${f2(nj.dy)} m)`, nj.dy < 0.02);
const orb = await sc(() => {
  const c = window.__course, a = c.arch;
  a.setOrbit(0);
  let total = 0, last = a.orbit.yaw;
  c.setInput({ cam: 1 });
  for (let i = 0; i < 460; i++) { c.step(1); let d = a.orbit.yaw - last; d = ((d % 360) + 540) % 360 - 180; total += d; last = a.orbit.yaw; }
  c.setInput({});
  return { total };
});
check(`Orbit-Kamera dreht stufenlos 360° (${f2(orb.total)}°)`, orb.total >= 360);
const rel = await sc(() => {
  const c = window.__course, p = c.player, a = c.arch;
  const go = (deg) => { a.setOrbit(deg); c.teleport(-2, 0, 8); c.step(5); const x0 = p.pos.x, z0 = p.pos.z; c.setInput({ y: 1 }); c.step(160); c.setInput({}); return [p.pos.x - x0, p.pos.z - z0]; };
  return { a0: go(0), a90: go(90), a180: go(180) };
});
check(`Steuerung kamerarelativ (vor bei 0°: dz ${f2(rel.a0[1])}, 90°: dx ${f2(rel.a90[0])}, 180°: dz ${f2(rel.a180[1])})`, rel.a0[1] < -3 && rel.a90[0] < -3 && rel.a180[1] > 3);
check(`Tempo 3,5 m/s (Rennen wirkt nicht: ${f2(nj.speed / 1)} m in 1 s)`, nj.speed > 3 && nj.speed < 3.7);
// fahrende Plattform trägt
const mv = await sc(() => {
  const c = window.__course, p = c.player, P = c.level.named.get('gelb1');
  window.__t.waitFor(() => Math.abs(P.pm.pos.z + 3.5) < 0.05 && P.pm.pause > 1.8);
  c.teleport(P.pm.pos.x, P.pm.pos.y + 0.45, P.pm.pos.z);
  c.step(5);
  const z0 = p.pos.z;
  c.step(600);
  return { dz: p.pos.z - z0, onIt: p.ground === P.shape || p.ground?.mover === P.mover, y: p.pos.y };
});
check(`Gelbe Plattform trägt Pflaume (${f2(mv.dz)} m mitgefahren)`, mv.dz > 4 && mv.onIt);
// Absturz ins Leere → Neustart
const fall = await sc(() => {
  const c = window.__course, p = c.player, m = c.level.data.marks, rt = c.level.runtime;
  const lives = rt.lives;
  c.teleport(...m.void);
  let dead = false;
  for (let i = 0; i < 500; i++) { c.step(1); if (p.dead) dead = true; if (dead && !p.dead) break; }
  return { dead, cause: p.deathCause, back: !p.dead && Math.hypot(p.pos.x - m.start[0], p.pos.z - m.start[2]) < 1.5, lives: rt.lives, lives0: lives };
});
check(`Absturz ins Leere → Neustart am Start (Leben ${fall.lives0} → ${fall.lives})`, fall.dead && fall.back && fall.lives === fall.lives0 - 1);
await shot('diorama_absturz_neustart');

// Alle 5 Sterne (Bauplan-Reihenfolge), der 5. beendet das Level
const route = await sc(() => {
  const c = window.__course, p = c.player, L = c.level, rt = L.runtime, t = window.__t, m = L.data.marks;
  const log = [];
  const P1 = L.named.get('gelb1'), P2 = L.named.get('gelb2');
  const safe = () => { p.invuln = 1e6; };
  safe();
  c.arch.setOrbit(28);
  // 1: unter der gelben Plattform
  t.walk(8.5, 6.2); c.step(5); log.push(['s1', rt.stars[0]]);
  // 2: Hügelweg hinauf, mit Plattform 1 über die Lücke
  t.walk(9.4, 13.3); t.walk(12.5, 13.3); t.walk(12.5, 1); t.walk(10.45, -3.5); safe();
  t.waitFor(() => Math.abs(P1.pm.pos.z + 3.5) < 0.05 && P1.pm.pause > 1.8);
  t.walk(6.4, -3.5, 600); t.walk(4.6, -4.1); c.step(5); log.push(['s2', rt.stars[1]]);
  // 3: Plattform 2 durch das linke Loch
  t.walk(-3.3, -3.5); safe();
  t.waitFor(() => Math.abs(P2.pm.pos.x + 5.35) < 0.05 && P2.pm.pause > 1.8);
  t.walk(-5.35, -3.5, 600, 0.2);
  t.waitFor(() => Math.abs(P2.pm.pos.z + 9.7) < 0.05 && P2.pm.pause > 1.6);
  t.walk(-11, -12.8); c.step(5); log.push(['s3', rt.stars[2]]);
  // zurück mit Plattform 2
  t.walk(-11, -10.95, 300, 0.15); safe();
  t.waitFor(() => Math.abs(P2.pm.pos.z + 9.7) < 0.05 && P2.pm.pause > 1.8);
  t.walk(-11, -9.7, 300, 0.2);
  t.waitFor(() => Math.abs(P2.pm.pos.x + 5.35) < 0.05 && P2.pm.pause > 1.6);
  t.walk(-3, -3.5); log.push(['zurueck', +p.pos.x.toFixed(1), +p.pos.y.toFixed(1)]);
  // 4: rechtes Loch (Treppe) auf den obersten Hügel
  t.walk(3, -5.2); t.walk(3, -12.4); safe(); log.push(['oben', +p.pos.y.toFixed(1)]);
  t.walk(6.5, -12.6); t.walk(9, -10.5); c.step(5); log.push(['s4', rt.stars[3]]);
  // 5: an den Käfern vorbei auf den Sims
  t.walk(5, -14.2); t.walk(-6.6, -14.5); safe(); t.walk(-14.4, -14.5, 1200, 0.2);
  c.step(5);
  log.push(['s5', rt.stars[4], p.state, p.treasure]);
  return { log, stars: rt.stars.slice(), treasure: p.treasure, y: p.pos.y };
});
console.log('   Weg:', JSON.stringify(route.log));
check('Stern 1 unter der gelben Plattform', route.stars[0]);
check('Stern 2 nach der Lücke (Plattform 1)', route.stars[1]);
check('Stern 3 hinter dem linken Loch (Plattform 2)', route.stars[2]);
check('Stern 4 auf dem obersten Hügel (rechtes Loch, Treppe)', route.stars[3]);
check('Stern 5 auf dem schmalen Sims', route.stars[4]);
check('5. Stern startet den Siegesablauf (victory)', route.treasure);
await shot('diorama_sieg', () => { window.__course.player.invuln = 0; window.__course.step(30); });
const fin = await sc(() => {
  const c = window.__course;
  for (let i = 0; i < 600 && !c.finished; i++) c.step(1);
  const saved = JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').levels?.['1-Schatz'];
  return { finished: c.finished, result: c.lastResult, saved };
});
check('Level endet mit Ergebnis (Schatz statt Zielmast)', fin.finished && fin.result?.pole === null && fin.result.stars.length === 5);
check(`5 Sterne gespeichert (${JSON.stringify(fin.saved?.stars)})`, fin.saved?.stars?.filter(Boolean).length === 5 && fin.saved.done);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}w1p_diorama_ergebnis.png` });

// Diorama-Bilder aus 4 Kamerawinkeln, Pflaume mit Lampe (nah)
await load('1-Schatz');
for (const [i, deg] of [[0, 28], [1, 118], [2, -152], [3, -62]].values()) {
  const s = await shot(`diorama_${deg}`, (d) => { const c = window.__course; c.arch.setOrbit(d); c.step(3); }, deg);
  console.log(`   Winkel ${deg}°: ${s.calls} Aufrufe, ${s.triangles} Dreiecke`);
  void i;
}
await shot('pflaume_lampe', () => {
  const c = window.__course;
  c.arch.setOrbit(-150); c.arch.orbit.toggleZoom(); c.arch.orbit.tilt(-14);
  c.teleport(-6, 0, 9); c.setInput({ x: -0.6, y: -0.6 }); c.step(30); c.setInput({}); c.step(2);
});
await shot('pflaume_buddelt', () => {
  const c = window.__course;
  c.arch.setOrbit(20);
  window.__t.walk(-4.5, 7.5, 600, 0.15); c.step(170);
});
const dug = await sc(() => window.__course.arch.info().digs);
check(`Schatzstelle: Pflaume buddelt Bitcoins aus (${dug})`, dug >= 1);
check('Keine Konsolenfehler (1-Schatz)', errors.length === 0);

// ---------------------------------------------------------------- Kennzahlen
console.log('\nKennzahlen (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`   ${n.padEnd(26)} ${String(c).padStart(4)}  ${String(t).padStart(7)}`);
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTri = Math.max(...stats.map((s) => s[2]));
check(`Budget: höchstens ${maxCalls} Zeichenaufrufe (< 120)`, maxCalls < 120);
check(`Budget: höchstens ${maxTri} Dreiecke (< 300 k)`, maxTri < 300000);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
