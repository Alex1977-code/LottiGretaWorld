// Kurs-Modus, Welt-5-Mechaniken und -Bausteine in der Strandwerkstatt 0-17: je Baustein das Kernverhalten deterministisch
// über window.__course.step(n) und setInput prüfen (Schlüsselmünzen → Warp-Box, Ritt-Abschnitt im Parcours, Trapez,
// Pendelplattform, Drehbrücke, Röhrenkanone, Rot-Blau-Flipper auch mit Klonen, Schiebekugel auf das Druckfeld,
// Suchscheinwerfer „entdeckt“, Kippquader, Donut-Block, blaue Lava, 3er-Lift); Sichtprüfung über Bilder tests/out/w5b_*.png
// (Kurs-Kamera), Kennzahlen (Zeichenaufrufe, Dreiecke), Themen-Bilder je Welt-5-Thema (w5b_thema_*.png).
// Aufruf: PORT_BASE=3200 node tests/course_w5_blocks.mjs   (Port 4390; vorher npm run build; nutzt vite preview)
// W5B_SHOTS=0 → ohne Bilder/Themen (schneller); W5B_PART=mech|themes → nur ein Teil.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4390;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W5B_SHOTS !== '0';
const PART = process.env.W5B_PART ?? 'all';

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-17&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Strandwerkstatt startet nicht. Konsole:');
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
      info: () => P().info(),
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      coins: () => L().runtime.coins,
      ground: () => { const g = P().ground; return g ? { tag: g.tag, top: g.top } : null; },
      ray: (x, y, z, opts) => { const h = L().world.raycastDown(x, y, z, 40, opts); return h ? { y: +h.y.toFixed(3), tag: h.shape.tag } : null; },
      starsAlive: (index) => L().entities.filter((e) => e.kind === 'star' && e.index === index && e.alive && !e.hidden).map((e) => [e.pos.x, e.pos.y, e.pos.z]),
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
  try { await page.screenshot({ path: `${OUT}w5b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

if (PART !== 'themes') {
await load();
const marks = await sc(() => window.__t.marks);
console.log('Strandwerkstatt 0-17');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()], arch: window.__course.state().archetype }));
  console.log(`  Arten: ${st.kinds.join(', ')}`);
  const need = ['schluesselmuenze', 'schiebekugel', 'warpbox', 'pfeld'];
  check('Level geladen (Welt-5-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['hubbruecke', 't1', 't2', 't3', 'pendel', 'kanone', 'dreh', 'felder', 'wechsel', 'licht', 'kq1', 'kq2', 'dreier', 'donuts', 'warp1', 'kugel', 'kugelfeld'];
  check('Bausteine benannt (level.named)', ids.every((id) => st.named.includes(id)));
  check('Archetyp parcours_ride: Ritt-Abschnitt, zu Fuß Standard-Kamera', st.arch?.section === true && st.arch?.rideCam === false && st.arch?.moored === true);
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
}

// ---------------------------------------------------------------- Schlüsselmünzen → Warp-Box
{
  const k0 = await sc(() => ({ hud: window.__course.level._keyHud?.state() ?? null, warp: window.__t.ent('warp1').hidden, keys: window.__course.level.keys }));
  const spots = await sc(() => window.__t.ents('schluesselmuenze').map((e) => [e.pos.x, e.pos.y - 0.2, e.pos.z]));
  const seq = [];
  for (const s of spots) {
    await T('place', s, { settle: 4 });
    seq.push(await sc(() => ({ hud: window.__course.level._keyHud.state(), warp: window.__t.ent('warp1').hidden })));
  }
  console.log(`  Schlüsselmünzen: Start ${JSON.stringify(k0.hud)}, Warp-Box versteckt ${k0.warp}; je Münze ${seq.map((q) => `${q.hud?.text}${q.warp ? '' : ' (Box!)'}`).join(' · ')}`);
  check('Schlüsselmünzen: HUD zeigt „Schlüssel 0/5“ und zählt hoch (1/5 … 5/5)', k0.hud?.text === 'Schlüssel 0/5' && seq.map((q) => q.hud?.n).join() === '1,2,3,4,5' && seq[4].hud.text === 'Schlüssel 5/5');
  check('Schlüsselmünzen: erst die fünfte öffnet die Warp-Box ({ reveal })', k0.warp === true && seq.slice(0, 4).every((q) => q.warp) && seq[4].warp === false && seq[4].hud.done);
  await shot('schluessel', 1200);
  // Warp-Box benutzen → Schwebeinsel
  await T('place', [3, 2.6, -22], { settle: 0 });
  const w = await T('play', [[{}, 260]]);
  const wp = await T('info');
  console.log(`  Warp-Box: Figur nach ${f2(wp.x)} ${f2(wp.y)} ${f2(wp.z)} (${wp.mode})`);
  check('Warp-Box (nach den Schlüsselmünzen) bringt die Figur zur Schwebeinsel', wp.x > 36 && wp.y > 5.5 && !wp.dead);
}

// ---------------------------------------------------------------- Ritt-Abschnitt (Pflaume im Fluss)
{
  // Hubbrücke unten festhalten → das Floß prallt gleich ab und wartet davor
  await sc(() => { const t = window.__t, b = t.named('hubbruecke'); b.hold('low'); for (let i = 0; i < 4 * 120 && b.state !== 'low'; i++) t.tick(1); });
  await T('place', marks.station, { settle: 10 });
  const r0 = await sc(() => window.__course.state().archetype);
  // zur Station laufen und zu Pflaume ins Wasser springen
  await T('play', [[{ y: 1 }, 30], [{ y: 1, jump: true }, 30], [{ y: 0.4 }, 60]]);
  const r1 = await sc(() => ({ a: window.__course.state().archetype, p: window.__course.player.info(), cy: window.__course.level.controlYaw }));
  console.log(`  Ritt: Station ${JSON.stringify(r0.raft)} → aufgestiegen ${r1.a.riding} (Floß-Kamera ${r1.a.rideCam}), Figur z ${f2(r1.p.z)}`);
  check('Ritt-Abschnitt: an der Station zu Pflaume springen → aufsteigen, Floß-Kamera übernimmt', r1.a.riding && r1.a.rideCam && r0.moored);
  const hold = await sc(() => {
    const t = window.__t, c = window.__course, b = t.named('hubbruecke');
    let minZ = 0;
    for (let i = 0; i < 9 * 120; i++) { t.tick(1); minZ = Math.min(minZ, c.player.pos.z); }
    return { minZ, hits: b.hits, y: b.y, state: b.state, riding: c.player.riding, dead: c.player.dead };
  });
  console.log(`  Hubbrücke unten (y ${f2(hold.y)}, ${hold.state}): Floß bis z ${f2(hold.minZ)}, Abpraller ${hold.hits}, reitet ${hold.riding}`);
  check('Bewegliche Brücke über dem Fluss: unten versperrt sie dem Floß den Weg (Abprall, wartet davor)', hold.hits > 0 && hold.minZ > -47.3 && hold.riding && !hold.dead);
  await shot('ritt', 1500);
  // Brücke fährt wieder → hebt sich → Pflaume schwimmt darunter durch bis zum Ende, Absteigen
  await sc(() => window.__t.named('hubbruecke').start());
  const end = await sc(() => {
    const t = window.__t, c = window.__course;
    let passed = null, dism = null;
    for (let i = 0; i < 30 * 120; i++) {
      t.tick(1);
      const p = c.player;
      if (passed === null && p.pos.z < -49.5) passed = { y: t.named('hubbruecke').y, t: i / 120 };
      if (p.dismounted && dism === null) dism = i / 120;
      if (dism !== null && i / 120 > dism + 1.5 && p.mode === 'ground') break;
    }
    return { passed, dism, p: c.player.info(), a: c.state().archetype };
  });
  console.log(`  Durchfahrt: unter der Brücke (Lauffläche y ${f2(end.passed?.y)}) nach ${f2(end.passed?.t)} s; abgestiegen nach ${f2(end.dism)} s → Figur ${f2(end.p.x)} ${f2(end.p.y)} ${f2(end.p.z)} (${end.p.mode}); Pflaume bleibt bei ${JSON.stringify(end.a.raft)}`);
  check('Ritt-Abschnitt: Strömung trägt unter der gehobenen Brücke durch; am Ende Absteigen an Land', !!end.passed && end.passed.y > 2 && end.dism !== null && end.p.mode === 'ground' && end.p.z < -74 && Math.abs(end.p.y - 1) < 0.05 && !end.a.riding);
  check('Ritt-Abschnitt: Pflaume bleibt am Ende im Wasser (wartet nicht mehr an der Station)', end.a.raft && end.a.raft[2] < -60 && end.a.dismounted);
  // Kamera zurück an die Standard-Kamera (nach dem Absteigen gleitet sie zurück)
  const cam = await sc(() => { const t = window.__t, c = window.__course; c.setInput({ y: 0.3 }); for (let i = 0; i < 5 * 120 && c.state().archetype.rideCam; i++) t.tick(1); c.setInput({}); return c.state().archetype; });
  check('Ritt-Abschnitt: nach dem Absteigen führt wieder die Standard-Kamera (Kameraschiene)', cam.rideCam === false);
}

// ---------------------------------------------------------------- Trapez
{
  // Figur unter die Stange von t1 in die Luft setzen → greift
  const grab = await sc(() => {
    const t = window.__t, c = window.__course, tr = t.named('t1');
    const b = tr.bar({});
    t.place([b.x, b.y - 1.21 - 0.15, b.z + 0.1], { settle: 0 });
    c.player.vel.y = 2;
    t.tick(3);
    const p = c.player;
    return { state: p.state, rider: tr.rider === p, mode: p.mode, tilt: p.swingTilt, theta: tr.theta, hand: p.pos.y + p.half.y * 2 + 0.26, bar: tr.bar({}).y };
  });
  console.log(`  Trapez: gegriffen ${grab.rider} (${grab.state}), Neigung ${f2(grab.tilt)} = Seilwinkel ${f2(grab.theta)}, Hände ${f2(grab.hand)} / Stange ${f2(grab.bar)}`);
  check('Trapez: Figur greift die Stange im Sprung (state trapeze, hängt darunter)', grab.rider && grab.state === 'trapeze' && grab.mode === 'script');
  // Schwingen: ohne Stick gleichbleibend, Stick in Schwungrichtung schaukelt auf
  const swing = await sc(() => {
    const t = window.__t, c = window.__course, tr = t.named('t1'), p = c.player;
    const amp = (n, inp) => {
      c.setInput(inp);
      let m = 0, dev = 0, tdev = 0;
      for (let i = 0; i < n; i++) {
        t.tick(1);
        m = Math.max(m, Math.abs(tr.theta));
        const b = tr.bar({}), h = p.half.y * 2 + 0.26, s = Math.sin(tr.theta), co = Math.cos(tr.theta);
        const fx = b.x + s * tr.dir.x * h, fy = b.y - co * h, fz = b.z + s * tr.dir.z * h;
        dev = Math.max(dev, Math.hypot(p.pos.x - fx, p.pos.y - fy, p.pos.z - fz));
        tdev = Math.max(tdev, Math.abs(p.swingTilt - tr.theta));
      }
      return { m: m * 180 / Math.PI, tiltOk: dev < 0.02 && tdev < 1e-6, dev, tdev };
    };
    t.tick(30);   // Übergang in die Hängelage (0,12 s)
    const a = amp(3 * 120, {});
    const b = amp(3 * 120, { y: 1 });
    c.setInput({});
    return { a, b, target: tr.targetAmp, vel: p.swingVel, phase: p.phase, rigTilt: c.rig.tilt ?? null, course: c.rig.proxy?.course?.state ?? null };
  });
  console.log(`  Trapez: Ausschlag ohne Stick ${f2(swing.a.m)}°, mit Stick ${f2(swing.b.m)}° (Ziel ${f2(swing.target)}°); Figur hängt am Seil ${swing.a.tiltOk && swing.b.tiltOk} (Abweichung ${f2(swing.a.dev)}/${f2(swing.b.dev)} m, Neigung ${swing.a.tdev}/${swing.b.tdev})`);
  check('Trapez: Figur schwingt mit (Fußpunkt entlang des Seils unter der Stange, Neigung = Seilwinkel)', swing.a.tiltOk && swing.b.tiltOk);
  check('Trapez: Stick in Schwungrichtung verstärkt den Schwung', swing.b.m > swing.a.m + 8 && swing.target > 50);
  // Absprung auf dem Weg nach vorn → erreicht das nächste Trapez (Aufhängungen 4,5 m auseinander)
  const leap = await sc(() => {
    const t = window.__t, c = window.__course, t1 = t.named('t1'), t2 = t.named('t2'), p = c.player;
    const DEG = Math.PI / 180;
    // warten, bis t1 nach vorn (−Z) schwingt und 20–40° erreicht
    let k = 0;
    while (k++ < 6 * 120 && !(t1.omega > 0 && t1.theta > 22 * DEG && t1.theta < 40 * DEG)) t.tick(1);
    const rel = { theta: t1.theta / DEG, z: p.pos.z, t2: t2.theta / DEG };
    c.setInput({ jump: true });
    let got = null, minD = 99;
    for (let i = 0; i < 2.5 * 120; i++) {
      t.tick(1);
      if (i === 30) c.setInput({});
      const b = t2.bar({});
      minD = Math.min(minD, Math.hypot(p.pos.x - b.x, p.pos.y + 1.21 - b.y, p.pos.z - b.z));
      if (t2.rider === p) { got = { i, z: p.pos.z }; break; }
    }
    c.setInput({});
    return { rel, got, minD, dist: Math.abs(t2.pivot.z - t1.pivot.z), state: p.state, dead: p.dead, rel1: t1.releases, aimed: t1.aimed ?? 0 };
  });
  console.log(`  Trapez-Absprung bei ${f2(leap.rel.theta)}° (t2 ${f2(leap.rel.t2)}°): nächstes Trapez ${leap.got ? `gegriffen nach ${f2(leap.got.i / 120)} s` : `verfehlt (min ${f2(leap.minD)} m)`}, Schwungabstand ${leap.dist} m, Zielhilfe ${leap.aimed}`);
  check('Trapez: Sprung lässt los (mit Schwung) und erreicht das nächste Trapez im Abstand 4–5 m', leap.rel1 >= 1 && !!leap.got && leap.dist >= 4 && leap.dist <= 5);
  await shot('trapez', 900);
  // weiter zu t3 und auf das Plateau
  const fin = await sc(() => {
    const t = window.__t, c = window.__course, t2 = t.named('t2'), t3 = t.named('t3'), p = c.player;
    const DEG = Math.PI / 180;
    const deaths0 = c.level.runtime.deaths;
    const leapFrom = (tr, next) => {
      let k = 0;
      c.setInput({ y: 1 });
      while (k++ < 8 * 120 && !(tr.omega > 0 && tr.theta > (next ? 25 : 12) * DEG && tr.theta < (next ? 42 : 30) * DEG && k > 240)) t.tick(1);
      c.setInput({ jump: true, y: next ? 1 : 0 });
      for (let i = 0; i < 3 * 120; i++) {
        t.tick(1);
        if (i === 30) c.setInput(next ? { y: 1 } : {});
        if (next && next.rider === p) break;
        if (!next && p.mode === 'ground') break;
      }
      c.setInput({});
      return next ? next.rider === p : p.mode === 'ground' && c.level.runtime.deaths === deaths0 && p.pos.z < -97.5;
    };
    const a = leapFrom(t2, t3);
    const b = a && leapFrom(t3, null);
    return { a, b, p: p.info() };
  });
  console.log(`  Trapez 2 → 3: ${fin.a}, 3 → Plateau: ${fin.b} (Figur z ${f2(fin.p.z)}, ${fin.p.mode})`);
  check('Trapez-Kette: 2 → 3 → Plateau (Absprung mit Stick nach vorn)', fin.a && fin.b && fin.p.z < -97.5 && !fin.p.dead);
}

// ---------------------------------------------------------------- Pendelplattform
{
  const pd = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('pendel'), p = c.player;
    // Figur auf die Plattform setzen (an ihrer aktuellen Lage)
    const q = h.pos;
    t.place([q.x, q.y + 0.05, q.z], { settle: 4 });
    const th0 = h.theta, z0 = p.pos.z;
    let on = 0, maxDev = 0, minTh = 9, maxTh = -9;
    for (let i = 0; i < 4 * 120; i++) {
      t.tick(1);
      const r = h.pos;
      if (p.mode === 'ground' && p.ground?.owner === h) on++;
      maxDev = Math.max(maxDev, Math.abs(p.pos.y - r.y));
      minTh = Math.min(minTh, h.theta); maxTh = Math.max(maxTh, h.theta);
    }
    return { on, maxDev, swing: (maxTh - minTh) * 180 / Math.PI, z0, z1: p.pos.z, th0, info: h.info(), dead: p.dead };
  });
  console.log(`  Pendelplattform: Ausschlag ${f2(pd.swing)}°, Figur ${pd.on}/480 Schritte darauf, Höhe ±${f2(pd.maxDev)} m, z ${f2(pd.z0)} → ${f2(pd.z1)}`);
  check('Pendelplattform: schwingt am Pendel und trägt die Figur (bleibt darauf, fährt mit)', pd.swing > 50 && pd.on > 470 && pd.maxDev < 0.06 && !pd.dead && Math.abs(pd.z1 - pd.z0) > 0.5);
  await shot('pendel', 900);
}

// ---------------------------------------------------------------- Drehbrücke
{
  const db = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('dreh'), p = c.player;
    // warten bis die Brücke ruht (entlang z) und nicht gleich dreht, dann aufs Ende stellen
    for (let i = 0; i < 8 * 120 && (h.turning || h.warn || Math.abs(Math.sin(h.angle)) < 0.99); i++) t.tick(1);
    const a0 = h.angle;
    t.place([0, 1.02, -167], { settle: 20 });
    const r0 = { x: p.pos.x, z: p.pos.z, g: p.ground?.tag };
    let turned = false, on = 0, n = 0;
    for (let i = 0; i < 6 * 120; i++) {
      t.tick(1); n++;
      if (p.mode === 'ground' && p.ground?.tag === 'drehbruecke') on++;
      if (Math.abs(h.angle - a0) > Math.PI / 2 - 0.01 && !h.turning) { turned = true; break; }
    }
    const d0 = Math.hypot(r0.x - 0, r0.z + 170.5), d1 = Math.hypot(p.pos.x - 0, p.pos.z + 170.5);
    const ang0 = Math.atan2(-(r0.z + 170.5), r0.x), ang1 = Math.atan2(-(p.pos.z + 170.5), p.pos.x);
    let rot = (ang1 - ang0) * 180 / Math.PI;
    if (rot > 180) rot -= 360; if (rot < -180) rot += 360;
    return { turned, on, n, d0, d1, rot, a: (h.angle - a0) * 180 / Math.PI, g0: r0.g, dead: p.dead, y: p.pos.y };
  });
  console.log(`  Drehbrücke: Drehung ${f2(db.a)}°, Figur ${db.on}/${db.n} Schritte darauf, Abstand zur Achse ${f2(db.d0)} → ${f2(db.d1)}, mitgedreht ${f2(db.rot)}° (Boden ${db.g0}, tot ${db.dead}, gedreht ${db.turned})`);
  check('Drehbrücke: dreht sich (Vierteldrehung) und trägt die Figur mit (Abstand zur Achse bleibt, Lage dreht mit)', db.turned && db.g0 === 'drehbruecke' && db.on >= db.n - 8 && Math.abs(db.d1 - db.d0) < 0.25 && Math.abs(Math.abs(db.rot) - 90) < 6 && !db.dead);
  await shot('drehbruecke', 900);
}

// ---------------------------------------------------------------- Röhrenkanone
{
  await T('place', [0, 4.6, -122.5], { settle: 0 });
  // Flug in Häppchen von 6 Schritten (0,05 s) mit je einem gezeichneten Bild dazwischen – wie im Echtbetrieb folgt die
  // Kamera dabei der Figur (größter Abstand Blickziel ↔ Figur wird gemessen)
  const kn = { states: new Set(), maxY: -99, cannonState: 0, hidden: 0, camMax: 0 };
  let flown = false;
  for (let k = 0; k < 120 && !flown; k++) {
    const r = await sc(() => {
      const t = window.__t, c = window.__course, h = window.__t.named('kanone'), p = c.player;
      const o = { states: [], maxY: -99, cannon: 0, hidden: 0, fly: h.state === 'fly' };
      for (let i = 0; i < 6; i++) { t.tick(1); o.states.push(p.state); if (p.hidden) o.hidden++; if (p.state === 'cannon') { o.cannon++; o.maxY = Math.max(o.maxY, p.pos.y); } if (h.state === 'fly') o.fly = true; }
      const tg = c.view.rig.target;
      o.cam = Math.hypot(tg.x - p.pos.x, tg.y - (p.pos.y + 1), tg.z - p.pos.z);
      o.done = o.fly && p.mode !== 'script';
      return o;
    });
    for (const st of r.states) kn.states.add(st);
    kn.maxY = Math.max(kn.maxY, r.maxY); kn.cannonState += r.cannon; kn.hidden += r.hidden;
    if (r.fly) kn.camMax = Math.max(kn.camMax, r.cam);
    flown = r.done;
    await freshFrames(1, 10000);
  }
  Object.assign(kn, await sc(() => ({ p: window.__course.player.info(), info: window.__t.named('kanone').info() })));
  kn.states = [...kn.states];
  const dist = Math.hypot(kn.p.x - marks.kanoneZiel[0], kn.p.z - marks.kanoneZiel[2]);
  console.log(`  Röhrenkanone: ${JSON.stringify(kn.info)}; Zustände ${kn.states.join(',')}; Scheitel y ${f2(kn.maxY)}; Landung ${f2(kn.p.x)} ${f2(kn.p.y)} ${f2(kn.p.z)} (${f2(dist)} m neben dem Ziel)`);
  check('Röhrenkanone: hineinspringen → in der Röhre (unsichtbar), dann Flug im Zustand „cannon“', kn.hidden > 20 && kn.cannonState > 60 && kn.states.includes('pipe'));
  check('Röhrenkanone: schießt in hohem Bogen genau auf das Ziel 40 m entfernt', kn.info.shots === 1 && Math.abs(kn.info.dist - 40) < 0.01 && dist < 0.1 && kn.maxY > 10 && !kn.p.dead);
  await freshFrames(3, 10000);
  const camd = await sc(() => { const c = window.__course; const tg = c.view.rig.target, p = c.player.pos; return Math.hypot(tg.x - p.x, tg.z - p.z); });
  console.log(`  Kamera: im Flug höchstens ${f2(kn.camMax)} m Blickziel ↔ Figur, nach der Landung ${f2(camd)} m`);
  check('Röhrenkanone: Kamera folgt der Figur im Flug und zum Ziel', kn.camMax < 9 && camd < 5);
  // Ducken auf der Öffnung startet ebenfalls
  await T('place', [0, 3.3, -122.5], { settle: 10 });
  const ck = await sc(() => { const t = window.__t, c = window.__course, h = t.named('kanone'); c.setInput({ crouch: true }); t.tick(2); c.setInput({}); t.tick(60); return { state: h.state, mode: c.player.mode }; });
  check('Röhrenkanone: auf der Öffnung ducken lädt ebenfalls', ck.state !== 'idle' && ck.mode === 'script');
  await sc(() => { const t = window.__t, c = window.__course; for (let i = 0; i < 4 * 120 && c.player.mode === 'script'; i++) t.tick(1); });
}

// ---------------------------------------------------------------- Rot-Blau-Flipper
{
  await sc(() => window.__course.level.flipper.set('rot'));
  await T('place', marks.felder0, { settle: 10 });
  const f0 = await sc(() => {
    const t = window.__t, L = window.__course.level;
    const F = L.flipper;
    const red = t.named('felder').tiles.find((q) => q.color === 'rot'), blue = t.named('felder').tiles.find((q) => q.color === 'blau');
    return { color: F.color, red: [red.x, red.z], blue: [blue.x, blue.z], rr: t.ray(red.x, 5, red.z), rb: t.ray(blue.x, 5, blue.z) };
  });
  const jump = async () => sc(() => { const t = window.__t, c = window.__course; const n0 = c.level.flipper.flips; c.setInput({ jump: true }); t.tick(2); c.setInput({}); for (let i = 0; i < 2 * 120 && c.player.mode !== 'ground'; i++) t.tick(1); t.tick(30); return { color: c.level.flipper.color, flips: c.level.flipper.flips - n0 }; });
  const j1 = await jump();
  const f1 = await sc(([r, b]) => ({ rr: window.__t.ray(r[0], 5, r[1]), rb: window.__t.ray(b[0], 5, b[1]) }), [f0.red, f0.blue]);
  const j2 = await jump();
  console.log(`  Flipper: Start ${f0.color} (rot fest ${f0.rr?.tag}, blau ${f0.rb?.tag}); Sprung 1 → ${j1.color} (rot ${f1.rr?.tag}, blau ${f1.rb?.tag}); Sprung 2 → ${j2.color} (Wechsel ${j2.flips})`);
  check('Rot-Blau-Flipper: aktive Farbe fest, andere durchlässig (Start rot)', f0.color === 'rot' && f0.rr?.tag === 'flipper' && f0.rb?.tag !== 'flipper');
  check('Rot-Blau-Flipper: jeder Sprung klappt um (rot ↔ blau, Kollision wechselt)', j1.color === 'blau' && f1.rb?.tag === 'flipper' && f1.rr?.tag !== 'flipper' && j2.color === 'rot' && j1.flips === 1 && j2.flips === 1);
  // Figur auf einem roten Feld: Wechsel (z. B. durch den Sprung eines Klons) → sie fällt durch
  const fall = await sc(([r]) => {
    const t = window.__t, c = window.__course, L = c.level;
    t.place([r[0], 1.05, r[1]], { settle: 10 });
    const g0 = c.player.ground?.tag;
    L.flipper.flip();
    t.tick(40);
    return { g0, y: c.player.pos.y, mode: c.player.mode };
  }, [f0.red]);
  check('Rot-Blau-Flipper: wer auf der nun inaktiven Farbe steht, fällt hindurch', fall.g0 === 'flipper' && fall.y < 0.4);
  // Klone: zwei Figuren springen im selben Schritt → einmal umklappen; ein Klon springt allein → umklappen
  const cl = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level;
    t.place([0, 1, -197], { settle: 10 });
    L.flipper.set('rot');
    c.addClone();
    t.tick(60);
    const before = L.flipper.flips;
    c.setInput({ jump: true }); t.tick(2); c.setInput({});
    const both = L.flipper.flips - before;
    for (let i = 0; i < 2 * 120 && L.players.some((f) => f.mode !== 'ground'); i++) t.tick(1);
    t.tick(20);
    // Haupt-Figur in die Luft (kein Boden), Klon am Boden → nur der Klon kann springen
    const main = L.players[0], clone = L.players.find((f) => f.clone);
    main.pos.y += 3; main.mode = 'air'; main.vel.set(0, 6, 0); main.setState('fall');
    const b2 = L.flipper.flips;
    c.setInput({ jump: true }); t.tick(2); c.setInput({});
    const one = L.flipper.flips - b2;
    const jumpedClone = !!clone && clone.mode === 'air';
    for (let i = 0; i < 3 * 120 && L.players.some((f) => f.mode !== 'ground'); i++) t.tick(1);
    return { n: L.players.length, both, one, jumpedClone, color: L.flipper.color };
  });
  console.log(`  Flipper mit Klon: ${cl.n} Figuren; beide springen gleichzeitig → ${cl.both} Wechsel; nur der Klon springt → ${cl.one} Wechsel (Klon in der Luft ${cl.jumpedClone})`);
  check('Rot-Blau-Flipper: Klonsprünge zählen (Klon allein → Wechsel; gleichzeitig → nur ein Wechsel)', cl.n === 2 && cl.both === 1 && cl.one === 1 && cl.jumpedClone);
  await sc(() => { window.__course.level.squad?.clear(); });
  await T('place', marks.felder0, { settle: 5 });
  await shot('flipper', 1000);
  // Wechselplattformen: Sprung für Sprung hinüber (blau → rot → blau → Plateau)
  await sc(() => window.__course.level.flipper.set('rot'));
  await T('place', [0, 1, -197.4], { settle: 10 });
  const wp = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const lands = [];
    const d0 = L.runtime.deaths;
    const targets = [-200, -204, -208, -211];
    for (const zt of targets) {
      // gezielter Hüpfer: Stick proportional zum Rest-Abstand (bremst über dem Ziel)
      const stick = () => Math.max(-1, Math.min(1, (p.pos.z - zt) * 0.9));
      c.setInput({ jump: true, y: stick() });
      t.tick(8);
      for (let i = 0; i < 2 * 120 && p.mode !== 'ground'; i++) { c.setInput({ jump: i < 20, y: stick() }); t.tick(1); }
      c.setInput({});
      t.tick(12);
      lands.push([+p.pos.z.toFixed(2), p.ground?.tag ?? '-', L.flipper.color]);
    }
    return { lands, dead: L.runtime.deaths !== d0, z: p.pos.z };
  });
  console.log(`  Wechselplattformen: Landungen ${JSON.stringify(wp.lands)}`);
  check('Wechselplattformen: Sprung für Sprung über rot/blau ans andere Ufer', !wp.dead && wp.z < -209 && wp.lands.slice(0, 3).every((l) => l[1] === 'flipper'));
}

// ---------------------------------------------------------------- Schiebekugel → Druckfeld
{
  const c0 = await T('coins');
  await T('place', marks.kugel, { yaw: 0, settle: 10 });
  const kb = await sc(() => {
    const t = window.__t, c = window.__course, ball = t.ent('kugel'), fld = t.ent('kugelfeld');
    const x0 = ball.pos.x;
    c.setInput({ x: 1 });
    for (let i = 0; i < 70; i++) t.tick(1);
    c.setInput({});
    for (let i = 0; i < 4 * 120; i++) t.tick(1);
    return { x0, ball: ball.info(), fld: { done: fld.done, count: fld.count, pressed: fld.pressed } };
  });
  const c1 = await T('coins');
  console.log(`  Schiebekugel: x ${f2(kb.x0)} → ${f2(kb.ball.x)} (gerollt ${kb.ball.rolled} m, liegt auf ${kb.ball.onField}); Druckfeld ${JSON.stringify(kb.fld)}, Münzen +${c1 - c0}`);
  check('Schiebekugel: Hineinlaufen rollt sie; auf dem Druckfeld bleibt sie liegen und zählt als Gewicht (löst aus)', kb.ball.rolled > 3 && !!kb.ball.onField && kb.fld.done && c1 - c0 >= 5 && Math.abs(kb.ball.x - 4) < 0.8);
  // Angriff stößt sie weg (Tatzenhieb)
  const at = await sc(() => {
    const t = window.__t, c = window.__course, ball = t.ent('kugel');
    t.place([ball.pos.x - 1.6, 1, ball.pos.z], { yaw: 0, power: 'krallen', settle: 5 });
    const x0 = ball.pos.x;
    c.setInput({ action: true }); t.tick(2); c.setInput({});
    t.tick(60);
    return { dx: ball.pos.x - x0 };
  });
  check('Schiebekugel: Angriff (Tatzenhieb) stößt sie weg', at.dx > 0.8);
  await T('place', [0, 1, -212], { settle: 4 });
  await shot('kugel', 900);
}

// ---------------------------------------------------------------- Suchscheinwerfer
{
  const sl = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, h = t.named('licht');
    let alarmSignals = 0, detectCalls = 0;
    const off1 = L.onSignal('alarm', () => { alarmSignals++; });
    const off2 = h.onDetect(() => { detectCalls++; });
    // Figur abseits (im Schatten): keine Meldung
    t.place([-10, 1, -232], { settle: 120 });
    const quiet = { alarms: h.alarms, seen: !!h.seen };
    // Figur an den Lichtfleck stellen → entdeckt
    const s = h.spot;
    t.place([s.x, 1, s.z], { settle: 2 });
    const a1 = { alarms: h.alarms, alarm: h.alarm, signals: L.signals.alarm ?? 0, banner: L.lastBanner ?? null };
    // im Licht bleiben: Abklingzeit – keine zweite Meldung sofort
    t.tick(120);
    const a2 = { alarms: h.alarms, alarm: h.alarm, seen: !!h.seen };
    off1(); off2();
    return { quiet, a1, a2, alarmSignals, detectCalls, info: h.info() };
  });
  console.log(`  Suchscheinwerfer: abseits ${JSON.stringify(sl.quiet)}; im Licht ${JSON.stringify(sl.a1)}; nach 1 s ${JSON.stringify(sl.a2)}; Signale ${sl.alarmSignals}, onDetect ${sl.detectCalls}`);
  check('Suchscheinwerfer: abseits des Lichtkegels keine Meldung', sl.quiet.alarms === 0 && !sl.quiet.seen);
  check('Suchscheinwerfer: Figur im Licht → „entdeckt“ (Aktion { signal: \'alarm\' }, onDetect, Alarmlicht, Ansage)', sl.a1.alarms === 1 && sl.a1.alarm && sl.a1.signals >= 1 && sl.alarmSignals >= 1 && sl.detectCalls >= 1 && sl.a1.banner === 'Entdeckt!');
  check('Suchscheinwerfer: Abklingzeit – im Licht bleiben meldet nicht sofort erneut', sl.a2.alarms === 1 && sl.a2.seen);
  // Verfolgen: der Fleck folgt der Figur, solange sie im Licht ist
  const tr = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('licht'), p = c.player;
    const s0 = { x: h.spot.x };
    c.setInput({ x: 0.5 });
    t.tick(90);
    c.setInput({});
    return { dx: h.spot.x - s0.x, px: p.pos.x, seen: !!h.seen };
  });
  check('Suchscheinwerfer: der Lichtfleck folgt der entdeckten Figur', tr.seen && Math.abs(tr.dx) > 0.8);
  // Verdeckt: unter dem Dach (fester Quader zwischen Lampe und Figur) sieht das Licht sie nicht
  const occ = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('licht');
    t.place([6, 1, -224], { settle: 2 });
    const a0 = h.alarms;
    let seen = 0, near = 0;
    for (let i = 0; i < 12 * 120; i++) {
      t.tick(1);
      if (h.seen) seen++;
      if (Math.hypot(h.spot.x - 6, h.spot.z + 224) < 1.2) near++;
    }
    return { seen, near, alarms: h.alarms - a0 };
  });
  console.log(`  Suchscheinwerfer unter dem Dach: Fleck ${occ.near} Schritte über der Figur, gesehen ${occ.seen}, Meldungen ${occ.alarms}`);
  check('Suchscheinwerfer: verdeckte Figur (Dach zwischen Lampe und Figur) bleibt unentdeckt', occ.near > 20 && occ.seen === 0 && occ.alarms === 0);
  await T('place', marks.licht, { settle: 4 });
  await shot('licht', 1100);
}

// ---------------------------------------------------------------- Kippquader
{
  // a) Figur steht in der Landezone vor dem Quader → er kippt auf sie: Treffer
  const kq = await sc(() => {
    const t = window.__t, c = window.__course, q = t.named('kq1'), p = c.player;
    // warten bis er ruht (stehend am Start), dann in die Landezone stellen
    // (er kippt seit dem Laden hin und her: warten, bis er wieder stehend am Start ruht und als Nächstes nach −z kippt)
    const atStart = () => { const b = q.info().box; return q.state === 'wait' && b[4] - b[1] > 3.9 && Math.abs(b[2] + 242) < 0.05 && q.info().next === '-z'; };
    for (let i = 0; i < 20 * 120 && !atStart(); i++) t.tick(1);
    const box0 = q.info().box, tips0 = q.tips;
    t.place([-5, 1, -243.6], { settle: 2 });
    let hint = null, hits0 = q.hits;
    for (let i = 0; i < 5 * 120 && q.tips === tips0; i++) { t.tick(1); if (q.state === 'warn' && !hint) hint = q.hint.info(); }
    const box1 = q.info().box;
    return { box0, box1, hint, hits: q.hits - hits0, big: p.big, invuln: p.invuln, out: !q.boxes.some((b) => p.pos.x + p.half.x > b.x0 && p.pos.x - p.half.x < b.x1 && p.pos.z + p.half.z > b.z0 && p.pos.z - p.half.z < b.z1 && p.pos.y < b.y1 && p.pos.y + p.half.y * 2 > b.y0), ray: t.ray(-5, 9, -245) };
  });
  console.log(`  Kippquader: stehend ${JSON.stringify(kq.box0)} → liegend ${JSON.stringify(kq.box1)}; Hinweis ${JSON.stringify(kq.hint)}; Treffer ${kq.hits} (groß ${kq.big}), hinausgeschoben ${kq.out}; Boden dort ${JSON.stringify(kq.ray)}`);
  check('Kippquader: kippt in Laufrichtung über die Kante (stehend → liegend)', kq.box0[4] - kq.box0[1] > 3.9 && kq.box1[4] - kq.box1[1] < 2.1 && kq.box1[2] < kq.box0[2] - 3.9);
  check('Kippquader: roter Landeboden-Hinweis vor dem Kippen (Grundriss der Landestelle)', kq.hint?.shown && kq.hint.rects.length === 1 && Math.abs(kq.hint.rects[0][1] - kq.box1[2]) < 0.05);
  check('Kippquader: kippt er auf die Figur → Treffer, Figur wird hinausgeschoben', kq.hits === 1 && (!kq.big || kq.invuln > 0) && kq.out);
  check('Kippquader: liegend ist er fest und begehbar (Oberseite)', kq.ray?.tag === 'kippquader' && Math.abs(kq.ray.y - kq.box1[4]) < 0.01);
  // b) auf ihm stehen, wenn er kippt → wird mitgenommen
  const ride = await sc(() => {
    const t = window.__t, c = window.__course, q = t.named('kq1'), p = c.player;
    for (let i = 0; i < 6 * 120 && q.state !== 'wait'; i++) t.tick(1);
    const b = q.info().box;
    t.place([(b[0] + b[3]) / 2, b[4] + 0.02, (b[2] + b[5]) / 2 + 0.4], { settle: 24 });
    const g0 = p.ground?.tag, c0 = q.carried, tips0 = q.tips;
    let script = 0;
    for (let i = 0; i < 6 * 120 && q.tips === tips0; i++) { t.tick(1); if (p.mode === 'script' && p.script?.kind === 'kippquader') script++; }
    t.tick(30);
    const b1 = q.info().box;
    return { g0, carried: q.carried - c0, script, p: p.info(), b1, g1: p.ground?.tag, dead: p.dead };
  });
  console.log(`  Kippquader mitgenommen: Boden vorher ${ride.g0}, ${ride.script} Schritte mitgefahren, danach auf ${ride.g1} bei y ${f2(ride.p.y)} (Oberseite ${ride.b1[4]})`);
  check('Kippquader: wer darauf steht, wenn er kippt, wird mitgenommen und landet auf der neuen Oberseite', ride.g0 === 'kippquader' && ride.carried === 1 && ride.script > 30 && ride.g1 === 'kippquader' && Math.abs(ride.p.y - ride.b1[4]) < 0.05 && !ride.dead);
  // c) Rahmen mit Loch: im Loch stehen ist sicher
  const hole = await sc(() => {
    const t = window.__t, c = window.__course, q = t.named('kq2'), p = c.player;
    const b0 = q.info().box;
    t.place([5, 1, -242.9], { settle: 4, invuln: 0 });
    const big0 = p.big;
    q.tip('-z');
    for (let i = 0; i < 4 * 120 && q.tips < 1; i++) t.tick(1);
    t.tick(10);
    return { b0, b1: q.info().box, hits: q.hits, big: p.big, big0, inv: p.invuln, y: p.pos.y, dead: p.dead };
  });
  console.log(`  Kippquader-Rahmen mit Loch: ${JSON.stringify(hole.b0)} → ${JSON.stringify(hole.b1)}, Treffer ${hole.hits}, Figur groß ${hole.big}`);
  check('Kippquader mit Loch (Rahmen): kippt per tip(), wer im Loch steht, bleibt heil', hole.b1[4] - hole.b1[1] < 1 && hole.hits === 0 && hole.big && hole.inv === 0 && !hole.dead);
  await T('place', marks.kq, { settle: 4 });
  await shot('kippquader', 1100);
}

// ---------------------------------------------------------------- Donut-Blöcke über blauer Lava
{
  const dn = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('donuts'), p = c.player;
    const b = h.blocks[1];
    t.place([b.x, b.y0 + 1.05, b.z], { settle: 2 });
    const s0 = b.state;
    let fellAt = null, yMin = 99, carried = 0, dead = false, cause = null;
    for (let i = 0; i < 3 * 120; i++) {
      t.tick(1);
      if (p.dead && !dead) { dead = true; cause = p.deathCause; }
      if (b.state === 'fall' && fellAt === null) fellAt = i / 120;
      if (b.state === 'fall' && p.mode === 'ground' && p.ground === b.shape) carried++;
      yMin = Math.min(yMin, b.y);
    }
    for (let i = 0; i < 6 * 120 && b.state !== 'idle'; i++) t.tick(1);
    return { s0, fellAt, carried, yMin, back: b.state, y: b.y, y0: b.y0, dead, cause };
  });
  console.log(`  Donut-Block: ${dn.s0} → fällt nach ${f2(dn.fellAt)} s (trägt ${dn.carried} Schritte), sinkt bis y ${f2(dn.yMin)}; danach ${dn.back} bei y ${f2(dn.y)} (Start ${dn.y0}); Figur tot ${dn.dead} (${dn.cause})`);
  check('Donut-Block: fällt kurz nach dem Betreten (≈ 0,5 s) und trägt die Figur mit', dn.fellAt !== null && dn.fellAt > 0.4 && dn.fellAt < 0.8 && dn.carried > 10 && dn.yMin < dn.y0 - 1);
  check('Donut-Block: kommt nach respawn s an seinem Platz wieder', dn.back === 'idle' && Math.abs(dn.y - dn.y0) < 1e-6);
  check('Blaue Lava: tödlich wie Lava (deathCause lava)', dn.dead && dn.cause === 'lava');
  const lv = await sc(() => { let n = 0; window.__course.level.world.forEach((s) => { if (s.kill === 'lava' && s.lavaColor === 'blau') n++; }); return n; });
  check('Blaue Lava: Baustein lava mit color „blau“ (Kollision kill: lava)', lv >= 1);
  await sc(() => { const L = window.__course.level; L.runtime.respawn(); window.__t.tick(5); });
  await T('place', marks.donut0, { settle: 4 });
  await shot('donut', 1100);
}

// ---------------------------------------------------------------- 3er-Lift (Mehrpersonen-Lift) und Figurenschalter
{
  const lf = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, h = t.named('dreier');
    const spots = [[-8.8, -261.6], [-7.2, -261.6], [-8, -262.7]];
    const onLift = () => { const fs = L.players; fs.forEach((f, k) => { f.pos.set(spots[k][0], h.shape?.max?.[1] ?? 1.5, spots[k][1]); f.vel.set(0, 0, 0); }); return fs.length; };
    t.place([-8.8, 1.6, -261.6], { settle: 10 });
    c.addClone(); t.tick(20);
    onLift(); t.tick(120);
    const two = { s: h.s, count: h.count, n: L.players.length };
    c.addClone(); t.tick(20);
    onLift();
    let maxS = 0;
    for (let i = 0; i < 3 * 120; i++) { t.tick(1); maxS = Math.max(maxS, h.s); }
    const three = { s: h.s, count: h.count, n: L.players.length, maxS };
    L.squad?.clear();
    return { two, three, need: h.need };
  });
  console.log(`  3er-Lift (need ${lf.need}): mit ${lf.two.n} Figuren s ${f2(lf.two.s)} (darauf ${lf.two.count}); mit ${lf.three.n} Figuren s bis ${f2(lf.three.maxS)}`);
  check('Mehrpersonen-Lift need 3: fährt nicht mit 2 Figuren, fährt mit 3 Figuren (Klone)', lf.need === 3 && lf.two.s < 0.05 && lf.three.n === 3 && lf.three.maxS > 2);
  const fs = await sc(() => !!window.__course.level.hasKind('figurenschalter'));
  check('Figurenschalter vorhanden (Entität figurenschalter, Präzisierung Motor Welt 2)', fs);
}

// ---------------------------------------------------------------- Ziel, Kennzahlen
{
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 70], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Strandwerkstatt erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 140 Zeichenaufrufe in allen Bildern', stats.every((s) => s[1] < 140));
  check('Budget: < 400 k Dreiecke in allen Bildern', stats.every((s) => s[2] < 400000));
}
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);

}

// ---------------------------------------------------------------- Themen (?theme=) mit Bildern
if (PART !== 'mech' && SHOTS) {
  console.log('Welt-5-Themen');
  // je Thema eine passende Station der Strandwerkstatt als Bild (Kulissen, Himmel, Gelände, Wasser/Lava)
  const VIEWS = { beach: ['keys', 'river'], bluelava: ['donut0'], savanna: ['kanone'], mine: ['lift'], cake: ['felder0'], sneak: ['licht'], temple: ['kq'] };
  const labels = {};
  for (const th of Object.keys(VIEWS)) {
    const e0 = errors.length;
    await load(`&theme=${th}`);
    const m = await sc(() => window.__t.marks);
    labels[th] = await sc(() => ({ label: window.__course.view.theme.label, backdrop: window.__course.view.theme.backdrop ?? null, lava: window.__course.view.theme.lavaColor ?? null }));
    for (const [k, w] of VIEWS[th].entries()) {
      await T('place', m[w], { settle: 30 });
      await shot(k ? `thema_${th}_${w}` : `thema_${th}`, 1600);
    }
    console.log(`  ${th}: ${labels[th].label} (Kulisse ${labels[th].backdrop}${labels[th].lava ? ', Lava ' + labels[th].lava : ''})${errors.length > e0 ? ' – Fehler!' : ''}`);
  }
  const ls = Object.values(labels).map((l) => l.label);
  check('Themen: alle sieben Welt-5-Themen registriert (eigene Namen, eigene Kulisse)', ls.every((l) => l && l !== 'Wiese') && new Set(ls).size === 7 && Object.values(labels).every((l) => l.backdrop));
  check('Thema bluelava: blaue Lava als Themen-Lava', labels.bluelava.lava === 'blau');
  const ts = stats.filter((s) => s[0].startsWith('thema_'));
  for (const s of ts) console.log(`    ${s[0].padEnd(22)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Themen-Bilder: < 140 Zeichenaufrufe, < 400 k Dreiecke', ts.length >= 7 && ts.every((s) => s[1] < 140 && s[2] < 400000));
  check('Themen: keine Konsolenfehler', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
