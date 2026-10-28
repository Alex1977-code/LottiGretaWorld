// Kurs-Modus: Gegner der Welt 7 „Lava-Festung“ im Lava-Gegnerzoo (0-27) und die Endgegner in den Lava-Bossarenen (0-28)
// deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Knochenflieger (Kreis/Bahn, Ankündigung,
// Sturzflug-Bogen durch die Figur, zurück auf die Bahn, von oben besiegbar), Platschfisch (verborgen, Bogen über die Lava,
// spuckt jedes 2. Mal, zielt, endlos nachkommend, nicht von oben – nur Power-ups/Wurfsichel, Feuer prallt ab), Lavadrache
// (taucht bei Nähe auf, speit Feuerbälle im Bogen auf die Figur, taucht ab, nächste Stelle, Hals/Kopf verletzen, nur Power-ups/
// Wurfsichel), Wutkaulquappe (schwimmt an, bläst sich auf und stößt, aufgeblasen stachelig, Angriffe besiegen, bleibt im
// Wasser), Funkenflämmchen (Hüpfer, Bahn, Kantenumkehr, verfolgt, heiß – nur Power-ups), Bestand (Stachelpanzer, Zauberkröte,
// Pilzlingsturm, Feuer-Werfer mit blauen Kugeln, Hammer-Werfer, Bumerang-Werfer lässt die Wurfsichel fallen), Rammfisch-
// Erweiterungen (groß und kreisend, auf und ab, Stern in der Blase), Wurfsichel-Treffer bei allen Gegnern; Endgegner: heller
// Lavafelsen-König mit Platschfischen, blauer Schubser-Prinz (blaue Feuerbälle in einer Kurve, nach jedem Treffer einer mehr),
// Baron Brummbär im Kampfwagen (Autoscroll-Straße, Sprung über Lavalücken, Kickbomben – auch kurz vor der Explosion –, Feuer,
// Stachelfallen, 9 Treffer durch zurückgekickte Bomben, Wurfsichel-Zusatzschaden, Flucht, Stern, Warp-Box); Tod setzt jeden
// Kampf zurück.
// Simulation nur über window.__course.step(n) (1 Schritt = 1/120 s) und setInput; Bilder tests/out/w7e_*.png.
// Aufruf: PORT_BASE=0 node tests/course_w7_enemies.mjs   (Port 4690; vorher npm run build)
//   W7E_PART=1 (Knochenflieger, Platschfisch, Lavadrache, Wutkaulquappe, Funkenflämmchen) | 2 (Bestand, Werfer, Rammfisch,
//   Wurfsichel) | 3 (Endgegner 0-28) | 4 (Bilder, Zeichenaufrufe) – ohne: alle Teile nacheinander (besser einzeln, je < 10 min).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4690;
const PART = process.env.W7E_PART ?? 'all';
const want = (n) => PART === 'all' || PART.split(',').includes(String(n));
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = async (fn, arg) => page.evaluate(fn, arg);
const KPI = {};

async function load(id) {
  const url = `http://localhost:${port}/?course=${id}&scale=2&adapt=0`;
  try { await page.goto(url, { waitUntil: 'load', timeout: 90000 }); }
  catch { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); }
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
    const L = c.level;
    L.defeatedLog = [];
    const prevDef = L.onEnemyDefeated;
    L.onEnemyDefeated = (e) => { prevDef?.(e); L.defeatedLog.push(e.kind); };
    window.__t = {
      Z: (r, dz) => -8 - 20 * (r - 1) - dz,
      ent: (id) => L.named.get(id),
      /** Figur setzen (groß, ohne Power-up, nichts in der Hand) und landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        p.dead = false;
        if (p.holding) { const e = p.holding; p.holding = null; e.carrier = null; }
        p.big = o.big ?? true;
        p.power = 'none';
        p.powerTime = 0;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        if (o.power) p.setPower(o.power);
        p.invuln = 0;
        L.runtime.status = 'play';
        L.controlYaw = c.view.rig.controlYaw(p.pos);
        c.step(o.settle ?? 30);
        return p.info();
      },
      /** Von oben auf e fallen (x/z folgen e), bis Abprall oder Landung. */
      stomp(e, o = {}) {
        const p = P();
        const top = e.pos.y + e.half.y * 2;
        const off = o.off ?? [0, 0];
        this.place([e.pos.x + off[0], top + (o.h ?? 1.2), e.pos.z + off[1]], { settle: 0, ...o });
        let bounced = false, hurt = false, landed = false;
        if (o.pound) { c.setInput({ crouch: true }); c.step(1); c.setInput({}); }
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground' || p.mode === 'swim') { landed = true; break; }
        }
        c.setInput({});
        return { bounced, hurt, landed };
      },
      /** Figur an e stellen (Hüllen berühren sich, von +x bzw. sx) und n Schritte halten; Treffer? */
      touch(e, n = 20, sx = 1) {
        const p = P();
        this.fresh();
        let hurt = false;
        for (let i = 0; i < n; i++) {
          const ec = e.center();
          p.pos.set(ec.x + sx * (e.half.x + p.half.x - 0.05), ec.y - p.half.y, ec.z); p.vel.set(0, 0, 0);
          c.step(1);
          if (p.invuln > 0 || !p.big || p.dead) { hurt = true; break; }
        }
        return hurt;
      },
      hurt: () => { const p = P(); return p.invuln > 0 || !p.big || p.dead; },
      fresh() { const p = P(); p.invuln = 0; p.dead = false; if (!p.big) { p.big = true; p.updateHalf?.(); } },
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      ents: (kind) => L.entities.filter((e) => e.kind === kind && !e.removed),
      dist: (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z),
      face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
      /** Figur festhalten (pos) für n Schritte (unverwundbar). */
      hold(pos, n, safe = true) { const p = P(); if (safe) p.hurt = () => false; for (let i = 0; i < n; i++) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); c.step(1); } if (safe) delete p.hurt; },
      /** Bis Bedingung f() (höchstens n Schritte), Figur festgehalten und unverwundbar. */
      until(f, n, pos = null) { const p = P(); p.hurt = () => false; let i = 0; for (; i < n && !f(); i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); } delete p.hurt; return i; },
      /** Pilz-Maske aufsetzen (Merkmal masked). */
      mask(on = true) {
        const p = P();
        if (!on) { if (Object.getOwnPropertyDescriptor(p, 'masked')) delete p.masked; return false; }
        if (!p.masked) Object.defineProperty(p, 'masked', { value: true, configurable: true, writable: true });
        return true;
      },
      model: (e) => e?.model?.root?.userData?.modelName ?? e?.model?.root?.name ?? null,
      r2: (v) => +(+v).toFixed(2),
      /** Wurfsichel-Treffer (onHit('sichel') wie vom Geschoss des Power-ups) – Quelle an der Figur. */
      sichel(e) { const p = P(); e.onHit('sichel', { kind: 'wurfsichel', pos: { x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, owner: p }); },
    };
  });
}

const SHOT = async (prefix, name, setup, frames = 2) => {
  await sc(() => { const p = window.__course.player; p.hurt = () => false; });
  await sc(setup);
  const f0 = await sc(() => {
    const c = window.__course;
    c.player.invuln = 0;
    for (let i = 0; i < 30; i++) c.rig.update(0.05, c.view.time + i * 0.05);
    c.snapCamera();
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + frames, { timeout: 40000, polling: 100 }).catch(() => {});
  try { await page.screenshot({ path: `${OUT}${prefix}_${name}.png`, timeout: 60000 }); }
  catch { await page.screenshot({ path: `${OUT}${prefix}_${name}.png`, timeout: 120000 }); }
  const st = await sc(() => window.__course.stats());
  await sc(() => { delete window.__course.player.hurt; });
  return st;
};

// =====================================================================================================================
// Teil 0: Laden (immer)
// =====================================================================================================================
await load('0-27');
console.log('Lava-Gegnerzoo 0-27');
{
  const st0 = await sc(() => {
    const c = window.__course, t = window.__t;
    const kinds = {};
    for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    const models = {};
    for (const id of ['kf_kreis', 'pf_pendel', 'ld_rot', 'wq_platz', 'ff_bahn', 'w_sichel', 'w_feuer', 'rf_gross']) {
      const e = t.ent(id);
      models[id] = e?.model ? (e.model.placeholder ? 'PLATZHALTER' : t.model(e)) : null;
    }
    return { kinds, n: c.level.entities.length, models };
  });
  console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
  console.log(`  Modelle: ${JSON.stringify(st0.models)}`);
  const NEED = ['knochenflieger', 'platschfisch', 'lavadrache', 'wutkaulquappe', 'funkenflaemmchen', 'stachelpanzer', 'zauberkroete', 'pilzlingsturm', 'feuer_werfer', 'rammfisch'];
  check(`Alle Welt-7-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
  const M = st0.models;
  check(`Welt-7-Modelle angebunden (kein Platzhalter): ${Object.values(M).join(', ')}`, Object.values(M).every((m) => m && m !== 'PLATZHALTER')
    && M.kf_kreis === 'knochenflieger' && M.pf_pendel === 'platschfisch' && M.ld_rot === 'lavadrache' && M.wq_platz === 'wutkaulquappe'
    && M.ff_bahn === 'funkenflaemmchen' && M.w_sichel === 'bumerang_werfer' && M.rf_gross === 'rammfisch');
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
  const smoke = await sc(() => { const c = window.__course; const t0 = performance.now(); for (let i = 0; i < 1200; i++) c.step(1); return { n: c.level.entities.length, ms: +((performance.now() - t0) / 1200).toFixed(3) }; });
  KPI.zooStep = smoke.ms;
  check(`10 s Simulation ohne Fehler (${smoke.n} Entitäten, ${smoke.ms} ms je Schritt)`, errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 1: Knochenflieger, Platschfisch, Lavadrache, Wutkaulquappe, Funkenflämmchen
// =====================================================================================================================
if (want(1)) {
await load('0-27');
console.log('Teil 1: Knochenflieger, Platschfisch, Lavadrache, Wutkaulquappe, Funkenflämmchen');

// ---- Knochenflieger
const kf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const k = t.ent('kf_kreis');
  // Kreis: Abstand zur Mitte ≈ Radius, Höhe gleich (Figur weit weg auf dem Mittelweg)
  let rMin = 99, rMax = 0, moved = 0, last = k.body();
  for (let i = 0; i < 240; i++) {
    t.hold([0, 1, 4], 1);
    const b = k.body();
    const r = Math.hypot(b.x + 11.5, b.z - t.Z(1, 7));
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    moved += Math.hypot(b.x - last.x, b.z - last.z); last = b;
  }
  out.circle = { rMin: t.r2(rMin), rMax: t.r2(rMax), moved: t.r2(moved), state: k.state };
  // Sturzflug: Figur darunter → Ankündigung → Bogen durch die Körpermitte der Figur → Treffer → zurück auf die Bahn
  const fig = [-11.5, 1, t.Z(1, 7)];
  t.place(fig, { settle: 1 });
  const seq = [k.state];
  let hurt = false, low = 99;
  for (let i = 0; i < 120 * 6 && !(seq.includes('rise') && k.state === 'fly'); i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (seq[seq.length - 1] !== k.state) seq.push(k.state);
    if (k.state === 'dive') low = Math.min(low, k.body().y);
    if (t.hurt()) hurt = true;
  }
  out.dive = { seq: seq.join('>'), diveLow: k.diveLow, low: t.r2(low), hurt, dives: k.dives, back: k.state };
  t.fresh();
  // Pilz-Maske: zugewandt sieht er sie nicht
  t.place(fig, { settle: 1 });
  t.mask(true);
  const d0 = k.dives;
  for (let i = 0; i < 120 * 3; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); const b = k.body(); t.face(b.x, b.z); c.step(1); }
  out.mask = { dives: k.dives - d0 };
  t.mask(false);
  // Draufspringen besiegt (Abprall, zählt)
  const s = t.ent('kf_schwebt');
  const def0 = L.defeatedLog.length;
  const st = t.stomp(s, { h: 1.0 });
  c.step(150);
  out.stomp = { ...st, defeated: s.defeated, removed: s.removed, counted: L.defeatedLog.slice(def0).includes('knochenflieger') };
  // Bahnflieger: fliegt die Wegpunkte ab; Feuer besiegt ihn; Wurfsichel besiegt einen frischen
  const b = t.ent('kf_bahn');
  const xs = [];
  for (let i = 0; i < 120 * 6; i++) { if (i % 60 === 0) xs.push(t.r2(b.body().x)); t.hold([0, 1, 4], 1); }
  out.path = { xs, mode: b.mode };
  b.onHit('fire', p);
  c.step(5);
  out.fire = { defeated: b.defeated, state: b.state };
  const f = L.spawn('knochenflieger', { pos: [0, 4, t.Z(1, -3)], sight: 0 });
  c.step(2);
  t.sichel(f);
  out.sichel = { defeated: f.defeated };
  // seitliche Berührung verletzt
  const g = L.spawn('knochenflieger', { pos: [0, 2.2, t.Z(1, -6)], sight: 0, bob: 0 });
  c.step(2);
  out.side = t.touch(g, 20);
  return out;
});
console.log(`  Knochenflieger: ${JSON.stringify(kf)}`);
check(`Knochenflieger kreist (Radius ${kf.circle.rMin}…${kf.circle.rMax} m, ${kf.circle.moved} m geflogen)`, Math.abs(kf.circle.rMin - 3) < 0.15 && Math.abs(kf.circle.rMax - 3) < 0.15 && kf.circle.moved > 3);
check(`Figur darunter: Ankündigung, Sturzflug genau durch die Figur (${kf.dive.seq}; tiefster Punkt ${kf.dive.low} m), Treffer, zurück auf die Bahn`, /warn>dive>rise>fly/.test(kf.dive.seq) && kf.dive.hurt && kf.dive.low < 2.0 && kf.dive.diveLow && Math.abs(kf.dive.diveLow[1] - 1.5) < 0.1);
check(`Pilz-Maske: zugewandt kein Sturzflug (${kf.mask.dives})`, kf.mask.dives === 0);
check('Draufspringen besiegt ihn (Abprall, zählt als besiegt)', kf.stomp.bounced && !kf.stomp.hurt && kf.stomp.defeated && kf.stomp.counted);
check(`Bahnflieger fliegt die Wegpunkte ab (x ${kf.path.xs.join(' → ')}); Feuer und Wurfsichel besiegen; seitlich verletzt`, kf.path.mode === 'path' && Math.max(...kf.path.xs) - Math.min(...kf.path.xs) > 4 && kf.fire.defeated && kf.sichel.defeated && kf.side === true);

// ---- Platschfisch
const pf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('pf_pendel');
  const podest = [-11.5, 2.5, t.Z(2, 7)];
  // Takt: verborgen (unberührbar, unsichtbar) → lugt → Sprung → verborgen …; Bogen 2,2 m über der Lava
  t.place(podest, { settle: 1 });
  const seq = [f.state];
  let hiddenTouch = null, apex = 0;
  t.until(() => { if (seq[seq.length - 1] !== f.state) seq.push(f.state); if (f.state === 'wait' && hiddenTouch === null) hiddenTouch = f.touch; if (f.state === 'jump') apex = Math.max(apex, f.pos.y); return seq.filter((s) => s === 'jump').length >= 2 && f.state === 'wait'; }, 120 * 12, [podest[0], podest[1], podest[2] + 1.6]);
  out.cycle = { seq: seq.slice(0, 12).join('>'), hiddenTouch, apex: t.r2(apex - 1.18), jumps: f.jumps, spits: f.spits };
  // im Sprung: Berührung verletzt, von oben verletzt (heiß)
  t.until(() => f.state === 'jump' && f.stateT > f.flight * 0.45, 120 * 6, [podest[0], podest[1], podest[2] + 1.6]);
  const st = t.stomp(f, { h: 0.6 });
  out.stomp = st;
  t.fresh();
  t.until(() => f.state === 'jump' && f.stateT > f.flight * 0.4, 120 * 6, [podest[0], podest[1], podest[2] + 1.6]);
  out.touch = t.touch(f, 4);
  t.fresh();
  // Spucken: Feuerkugel geradeaus auf die Figur
  const s0 = f.spits;
  let ball = null;
  t.until(() => { const b = L.entities.find((e) => e.kind === 'feuerkugel' && e.owner === f && !e.removed); if (b && !ball) ball = { mode: b.mode, vy: t.r2(b.vel.y), v: t.r2(Math.hypot(b.vel.x, b.vel.y, b.vel.z)) }; return f.spits > s0 && ball; }, 120 * 12, podest);
  out.spit = { spits: f.spits - s0, ball, shot: f.lastShot };
  c.step(30);
  // Feuer prallt ab, Krallen besiegen
  t.until(() => f.state === 'jump', 120 * 6, podest);
  f.onHit('fire', p); c.step(1);
  const afterFire = f.defeated;
  f.onHit('claw', p); c.step(1);
  out.hits = { fire: afterFire, claw: f.defeated };
  // Wurfsichel besiegt einen frischen Fisch (aufgetaucht)
  const g = L.spawn('platschfisch', { pos: [-11.5, 1.18, t.Z(2, 1.5)], dir: [1, 0], dist: 0.01, phase: 0.95 });
  t.until(() => g.state === 'jump' || g.state === 'peek', 120 * 3, podest);
  t.sichel(g);
  out.sichel = { defeated: g.defeated };
  // zielender Fisch: springt auf die Figur zu (landet näher an ihr)
  const a = t.ent('pf_ziel');
  const figA = [-11.5, 2.5, t.Z(2, 5.8)];
  const d0 = Math.hypot(a.home.x - figA[0], a.home.z - figA[2]);
  let dMin = 99;
  const j0 = a.jumps;
  t.until(() => { if (a.state === 'wait') dMin = Math.min(dMin, Math.hypot(a.cur.x - figA[0], a.cur.z - figA[2])); return false; }, 120 * 8, figA);
  out.aim = { before: t.r2(d0), after: t.r2(dMin), jumps: a.jumps - j0, end: t.r2(Math.hypot(a.cur.x - figA[0], a.cur.z - figA[2])) };
  // Spender: endlos nachkommend (höchstens 3 gleichzeitig), Fische hüpfen 3 Bögen und tauchen ab
  const q = t.ent('pf_strom');
  const steg = [11.5, 2.2, t.Z(2, 11)];
  let maxAlive = 0;
  t.until(() => { maxAlive = Math.max(maxAlive, q.kids.filter((k) => !k.removed).length); return false; }, 120 * 14, steg);
  out.stream = { spawned: q.spawned, maxAlive, isSource: q.isSource, jumps: q.kids.map((k) => k.jumps) };
  return out;
});
console.log(`  Platschfisch: ${JSON.stringify(pf)}`);
check(`Platschfisch verborgen unberührbar, lugt, springt im Bogen (${pf.cycle.seq}; Scheitel ${pf.cycle.apex} m über der Lava)`, pf.cycle.hiddenTouch === false && /wait>peek>jump>wait/.test(pf.cycle.seq) && Math.abs(pf.cycle.apex - 2.2) < 0.25);
check('Nicht von oben besiegbar: Draufspringen verletzt (heiß!); Berührung im Sprung verletzt', pf.stomp.hurt && pf.touch === true);
check(`Spuckt jedes 2. Mal eine Feuerkugel geradeaus auf die Figur (${JSON.stringify(pf.spit.ball)})`, pf.spit.spits >= 1 && pf.spit.ball?.mode === 'straight' && pf.spit.ball.v > 6);
check('Feuer prallt ab, Krallen und Wurfsichel besiegen ihn', pf.hits.fire === false && pf.hits.claw === true && pf.sichel.defeated);
check(`Zielender Platschfisch springt auf die Figur zu (${pf.aim.before} → ${pf.aim.after} m) und bleibt in ihrer Nähe (${pf.aim.end} m)`, pf.aim.jumps >= 2 && pf.aim.after < pf.aim.before - 1 && pf.aim.end < pf.aim.before - 1);
check(`Endlos nachkommend: ${pf.stream.spawned} Fische in 14 s, höchstens ${pf.stream.maxAlive} gleichzeitig`, pf.stream.isSource && pf.stream.spawned >= 5 && pf.stream.maxAlive <= 3 && pf.stream.maxAlive >= 2);

// ---- Lavadrache
const ld = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const d = t.ent('ld_rot');
  // weit weg: bleibt verborgen
  t.hold([0, 1, t.Z(3, -4)], 120 * 3);
  out.far = { state: d.state, touch: d.touch, rises: d.rises };
  // Figur auf dem Standplatz: taucht auf, speit 2 Feuerbälle im Bogen auf die Figur, taucht ab, nächste Stelle
  const fig = [-11.5, 2.2, t.Z(3, 2.2)];
  t.place(fig, { settle: 1 });
  const seq = [d.state];
  const balls = [];
  const seen = new Set();
  p.hurt = () => false;
  for (let i = 0; i < 120 * 12 && !(d.rises >= 2 && d.state === 'spit'); i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (seq[seq.length - 1] !== d.state) seq.push(d.state);
    for (const e of L.entities) {
      if (e.kind !== 'feuerkugel' || e.owner !== d) continue;
      if (!seen.has(e)) { seen.add(e); balls.push({ e, land: null, vy: t.r2(e.vel.y), last: null }); }
    }
    // Aufschlag: erster Bodenkontakt bzw. letzte Lage vor dem Verschwinden (trifft die Figur)
    for (const b of balls) {
      if (b.land) continue;
      if (b.e.bounces > 0 || b.e.removed) b.land = b.e.removed ? b.last : [t.r2(b.e.pos.x), t.r2(b.e.pos.z)];
      else b.last = [t.r2(b.e.pos.x), t.r2(b.e.pos.z)];
    }
  }
  delete p.hurt;
  out.cycle = { seq: seq.slice(0, 12).join('>'), rises: d.rises, spot: d.spot, fireballs: d.fireballs, balls: balls.map((b) => ({ vy: b.vy, land: b.land })) };
  // Draufspringen auf den Kopf verletzt (heiß), Feuer prallt ab, Krallen am Kopf besiegen
  t.until(() => d.state === 'idle' || (d.state === 'spit' && d.stateT < 0.3), 120 * 10, fig);
  const h = d.head(new d.pos.constructor());
  t.place([h.x, h.y + 1.6, h.z], { settle: 0 });
  let hurt = false;
  for (let i = 0; i < 60; i++) { p.pos.x = h.x; p.pos.z = h.z; c.step(1); if (t.hurt()) { hurt = true; break; } }
  out.stomp = { hurt };
  t.fresh();
  t.until(() => d.up && d.riseK > 0.9, 120 * 10, fig);
  d.onHit('fire', p);
  const afterFire = d.defeated;
  const def0 = L.defeatedLog.length;
  d.onHit('claw', p);
  c.step(200);
  out.hits = { fire: afterFire, claw: d.defeated, state: d.state, counted: L.defeatedLog.slice(def0).includes('lavadrache'), removed: d.removed };
  // blauer Drache: 2 Treffer (Wurfsichel), blaue Feuerkugeln, 3 Schüsse je Auftauchen
  const b = t.ent('ld_blau');
  const figB = [11.5, 2.2, t.Z(3, 2.2)];
  t.place(figB, { settle: 1 });
  let blue = null;
  t.until(() => { const k = L.entities.find((e) => e.kind === 'feuerkugel' && e.owner === b); if (k && !blue) blue = { color: k.color, model: t.model(k) }; return b.state === 'sink'; }, 120 * 12, figB);
  out.blue = { fireballs: b.fireballs, ball: blue };
  t.until(() => b.up && b.riseK > 0.9, 120 * 10, figB);
  t.sichel(b);
  const hp1 = b.hp, s1 = b.state;
  t.until(() => b.up && b.riseK > 0.9, 120 * 10, figB);
  t.sichel(b);
  out.blue.hits = { hp1, s1, hp2: b.hp, defeated: b.defeated };
  // Hals verletzt: Figur am Hals (auf halber Höhe)
  const n = L.spawn('lavadrache', { pos: [-14, 1.18, t.Z(3, 8)], sight: 30, hide: 0.1, shots: 9, interval: 2 });
  t.until(() => n.state === 'spit', 120 * 6, fig);
  const nh = n.head(new n.pos.constructor());
  t.fresh();
  let neck = false;
  for (let i = 0; i < 6 && !neck; i++) {
    p.pos.set((n.base.x + nh.x) / 2, (n.base.y + nh.y) / 2 - 0.6, (n.base.z + nh.z) / 2); p.vel.set(0, 0, 0); p.mode = 'air';
    c.step(1);
    if (t.hurt()) neck = true;
  }
  out.neck = neck;
  return out;
});
console.log(`  Lavadrache: ${JSON.stringify(ld)}`);
check(`Lavadrache: weit weg bleibt er verborgen (${ld.far.state}, unberührbar)`, ld.far.state === 'hidden' && ld.far.touch === false && ld.far.rises === 0);
const lb = ld.cycle.balls.filter((b) => b.land);
check(`Taucht bei Nähe auf, speit 2 Feuerbälle im Bogen, taucht ab, wechselt die Stelle (${ld.cycle.seq})`, /rise>idle>spit>sink>hidden>rise/.test(ld.cycle.seq) && ld.cycle.balls.length >= 2 && ld.cycle.balls.every((b) => b.vy > 3) && ld.cycle.spot === 1);
check(`Feuerbälle landen bei der Figur (${lb.map((b) => b.land.join('/')).join(', ')})`, lb.length >= 2 && lb.every((b) => Math.hypot(b.land[0] + 11.5, b.land[1] + 50.2) < 1.6));
check('Kopf von oben verletzt (heiß!), Feuer prallt ab, Krallen besiegen ihn (zählt)', ld.stomp.hurt && ld.hits.fire === false && ld.hits.claw && ld.hits.counted && ld.hits.removed);
check(`Blauer Lavadrache: blaue Feuerkugeln (${JSON.stringify(ld.blue.ball)}), 3 je Auftauchen, 2 Wurfsichel-Treffer`, ld.blue.ball?.color === 'blau' && ld.blue.ball.model === 'feuerkugel_blau' && ld.blue.fireballs === 3 && ld.blue.hits.hp1 === 1 && ld.blue.hits.s1 === 'hit' && ld.blue.hits.hp2 === 0 && ld.blue.hits.defeated);
check('Der Hals verletzt bei Berührung', ld.neck === true);

// ---- Wutkaulquappe
const wq = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const q = t.ent('wq_platz');
  // ohne Figur im Wasser: paddelt am Platz
  const b0 = q.body();
  t.hold([0, 1, t.Z(4, 7)], 240);
  const b1 = q.body();
  out.idle = { state: q.state, moved: t.r2(Math.hypot(b1.x - b0.x, b1.z - b0.z)), y: t.r2(b1.y) };
  // Figur schwimmt in der Nähe: anschwimmen → aufblasen → stoßen → aufgeblasen (verletzt)
  const fig = [-14.5, -0.6, t.Z(4, 7)];
  t.place([-14.5, 1.0, t.Z(4, 7)], { settle: 30 });
  const seq = [q.state];
  let hurt = false, maxY = -99;
  for (let i = 0; i < 120 * 5; i++) {
    if (p.mode === 'swim') { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); }
    c.step(1);
    if (seq[seq.length - 1] !== q.state) seq.push(q.state);
    if (t.hurt()) hurt = true;
    maxY = Math.max(maxY, q.body().y + q.half.y);
  }
  out.attack = { seq: seq.slice(0, 8).join('>'), hurt, swim: p.mode, puffs: q.puffs, shoves: q.shoves, maxTop: t.r2(maxY) };
  t.fresh();
  // aufgeblasen: Draufspringen verletzt; Angriff besiegt trotzdem
  t.until(() => q.state === 'puffed', 120 * 8, fig);
  out.puffed = { radius: t.r2(q.half.x), puff: q.puffK };
  const def0 = L.defeatedLog.length;
  q.onHit('claw', p);
  c.step(130);
  out.claw = { defeated: q.defeated, removed: q.removed, counted: L.defeatedLog.slice(def0).includes('wutkaulquappe') };
  // nicht aufgeblasen: von oben besiegbar
  const k = L.spawn('wutkaulquappe', { pos: [-11.5, 1.25, t.Z(4, 10)], sight: 0.01 });
  c.step(2);
  const st = t.stomp(k, { h: 0.6 });
  out.stomp = { ...st, defeated: k.defeated };
  // Kreisschwimmer bleibt auf seinem Kreis; Wurfsichel besiegt ihn
  const r = t.ent('wq_kreis');
  let rr = [99, 0];
  for (let i = 0; i < 240; i++) { t.hold([0, 1, t.Z(4, 4)], 1); const b = r.body(); const d = Math.hypot(b.x - 9.5, b.z - t.Z(4, 8)); rr = [Math.min(rr[0], d), Math.max(rr[1], d)]; }
  out.circle = rr.map((v) => t.r2(v));
  t.sichel(r);
  out.sichel = r.defeated;
  return out;
});
console.log(`  Wutkaulquappe: ${JSON.stringify(wq)}`);
check(`Wutkaulquappe paddelt am Platz (${wq.idle.moved} m) unter Wasser (y ${wq.idle.y})`, wq.idle.state === 'swim' && wq.idle.moved < 2 && wq.idle.y < 1.5);
check(`Schwimmt an, bläst sich auf und stößt (${wq.attack.seq}) – die Stachelkugel verletzt; bleibt im Wasser (Oberkante ${wq.attack.maxTop} m)`, /chase>inflate>shove>puffed/.test(wq.attack.seq) && wq.attack.hurt && wq.attack.maxTop < 1.85);
check(`Aufgeblasen größer (${wq.puffed.radius} m), Angriff besiegt sie trotzdem (zählt)`, wq.puffed.radius >= 0.45 && wq.claw.defeated && wq.claw.counted);
check('Nicht aufgeblasen: von oben besiegbar; Kreisschwimmer bleibt auf dem Kreis, Wurfsichel besiegt', wq.stomp.defeated && !wq.stomp.hurt && Math.abs(wq.circle[0] - 2.4) < 0.5 && Math.abs(wq.circle[1] - 2.4) < 0.5 && wq.sichel);

// ---- Funkenflämmchen
const ff = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('ff_bahn'), g = t.ent('ff_gerade');
  // Hüpfer: Höhe ≈ 0,45 m, Bahn, bleibt auf dem Podest; geradeaus kehrt an der Kante um
  const fig = [-11.5, 2, t.Z(5, 1.2)];
  let apex = 0, minY = 99, gx = [99, -99];
  const h0 = f.hops;
  for (let i = 0; i < 120 * 8; i++) {
    t.hold(fig, 1);
    apex = Math.max(apex, f.pos.y - 2); minY = Math.min(minY, f.pos.y, g.pos.y);
    gx = [Math.min(gx[0], g.pos.x), Math.max(gx[1], g.pos.x)];
  }
  out.hop = { hops: f.hops - h0, apex: t.r2(apex), minY: t.r2(minY), gx: gx.map(t.r2), x: t.r2(f.pos.x) };
  // Berührung und Draufspringen verletzen (heiß); Feuer prallt ab; Tatze besiegt
  out.touch = t.touch(g, 10);
  t.fresh();
  const st = t.stomp(g, { h: 0.6 });
  out.stomp = st;
  t.fresh();
  g.onHit('fire', p);
  const fire = g.defeated;
  g.onHit('claw', p);
  c.step(90);
  out.hits = { fire, claw: g.defeated, removed: g.removed };
  t.sichel(f);
  out.sichel = f.defeated;
  // Jäger verfolgt die Figur
  const j = t.ent('ff_jaeger');
  const figJ = [6, 1, t.Z(5, 9)];
  const d0 = Math.hypot(j.pos.x - figJ[0], j.pos.z - figJ[2]);
  t.until(() => false, 120 * 3, figJ);
  out.chase = { before: t.r2(d0), after: t.r2(Math.hypot(j.pos.x - figJ[0], j.pos.z - figJ[2])) };
  // Wasser löscht es
  const w = L.spawn('funkenflaemmchen', { pos: [-11.5, 2.5, t.Z(4, 3)], dir: [-1, 0], hop: 1.0, wake: 0 });
  t.until(() => w.defeated, 120 * 6, [0, 1, t.Z(4, 2)]);
  out.water = { defeated: w.defeated, x: t.r2(w.pos.x) };
  return out;
});
console.log(`  Funkenflämmchen: ${JSON.stringify(ff)}`);
check(`Funkenflämmchen hüpft (${ff.hop.hops} Hüpfer, ${ff.hop.apex} m hoch) und bleibt auf dem Podest (y ≥ ${ff.hop.minY}); geradeaus kehrt es an den Kanten um (x ${ff.hop.gx.join(' … ')})`, ff.hop.hops >= 10 && Math.abs(ff.hop.apex - 0.45) < 0.08 && ff.hop.minY > 1.95 && ff.hop.gx[0] > -16.6 && ff.hop.gx[1] < -6.4 && ff.hop.gx[1] - ff.hop.gx[0] > 6);
check('Heiß: Berührung und Draufspringen verletzen; Feuer prallt ab; Tatze und Wurfsichel besiegen', ff.touch === true && ff.stomp.hurt && ff.hits.fire === false && ff.hits.claw && ff.sichel);
check(`Jäger hüpft auf die Figur zu (${ff.chase.before} → ${ff.chase.after} m); Wasser löscht es`, ff.chase.after < ff.chase.before - 2 && ff.water.defeated);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

console.log(`Kennzahlen: ${JSON.stringify(KPI)}`);
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
