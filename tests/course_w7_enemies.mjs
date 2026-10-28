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
      /** Wurfsichel-Treffer wie vom Geschoss des Power-ups (Bausteine Welt 7): onSichelHit(sichel), sonst bei Gegnern
       *  onHit('throw', sichel) mit sichel.sichel = true, sichel.owner = Figur. */
      sichel(e) {
        const p = P();
        const s = { kind: 'wurfsichel', sichel: true, owner: p, pos: { x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, vel: { x: 0, y: 0, z: -14 } };
        if (typeof e.onSichelHit === 'function') e.onSichelHit(s);
        else if (e.enemy && e.touch !== false && !e.defeated) e.onHit('throw', s);
      },
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
  out.cycle = { seq: seq.slice(0, 12).join('>'), hiddenTouch, apex: t.r2(apex - 1.3), jumps: f.jumps, spits: f.spits };
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
check(`Funkenflämmchen hüpft (${ff.hop.hops} Hüpfer, ${ff.hop.apex} m hoch) und bleibt auf dem Podest (y ≥ ${ff.hop.minY}); geradeaus kehrt es an den Kanten um (x ${ff.hop.gx.join(' … ')})`, ff.hop.hops >= 10 && Math.abs(ff.hop.apex - 0.45) < 0.08 && ff.hop.minY > 1.95 && ff.hop.gx[0] > -16.6 && ff.hop.gx[1] < -6.4 && ff.hop.gx[1] - ff.hop.gx[0] > 5);
check('Heiß: Berührung und Draufspringen verletzen; Feuer prallt ab; Tatze und Wurfsichel besiegen', ff.touch === true && ff.stomp.hurt && ff.hits.fire === false && ff.hits.claw && ff.sichel);
check(`Jäger hüpft auf die Figur zu (${ff.chase.before} → ${ff.chase.after} m); Wasser löscht es`, ff.chase.after < ff.chase.before - 2 && ff.water.defeated);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 2: Bestand Welt 7 (Werfer, Stachelpanzer, Zauberkröte, Pilzlingsturm), Rammfisch-Erweiterungen, Wurfsichel bei allen
// =====================================================================================================================
if (want(2)) {
await load('0-27');
console.log('Teil 2: Bestand, Werfer, Rammfisch, Wurfsichel');

const wf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // Bumerang-Werfer mit Wurfsichel: trägt sie (Modell), wirft Bumerangs, lässt sie beim Besiegen fallen
  const w = t.ent('w_sichel');
  const fig = [11.5, 1, t.Z(6, 1.5)];
  const dropped0 = w.modelState().dropped;
  let boom = null, flyDropped = null, hurt = false;
  t.place(fig, { settle: 1 });
  for (let i = 0; i < 120 * 8 && !(boom && boom.removed); i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    const s = L.entities.find((e) => e.kind === 'wurfsichel' && e.owner === w && !e.removed);
    if (s && !boom) { boom = s; flyDropped = w.modelState().dropped; }
    if (t.hurt()) hurt = true;
  }
  out.carry = { sichel: w.sichel, model: t.model(w), dropped: dropped0, flyDropped, boom: !!boom, caught: boom?.caught ?? false, catches: w.sichelCatch ?? 0, hurt, back: w.modelState().dropped };
  t.fresh();
  const st = t.stomp(w, { h: 0.8 });
  c.step(30);
  const item = w.sichelItem;
  out.drop = { ...st, defeated: w.defeated, dropped: w.sichelDropped, modelDropped: w.modelState().dropped, item: item ? { kind: item.kind, power: item.power ?? null, d: t.r2(Math.hypot(item.pos.x - w.pos.x, item.pos.z - w.pos.z)), y: t.r2(item.pos.y) } : null };
  // in die Lava gefallen: die Sichel erscheint an seinem Platz (home)
  const v = L.spawn('bumerang_werfer', { pos: [-11.5, 2.5, t.Z(2, 7)], sichel: true, sight: 0.01 });
  c.step(20);
  v.fallOut('lava');
  c.step(2);
  out.lava = { item: v.sichelItem ? { x: t.r2(v.sichelItem.pos.x), y: t.r2(v.sichelItem.pos.y), z: t.r2(v.sichelItem.pos.z) } : null };
  // Feuer-Werfer mit blauen Feuerkugeln
  const f = t.ent('w_feuer');
  let blue = null;
  t.until(() => { const k = L.entities.find((e) => e.kind === 'feuerkugel' && e.owner === f); if (k && !blue) blue = { color: k.color, model: t.model(k) }; return !!blue; }, 120 * 8, [7, 1, t.Z(6, 1.5)]);
  out.blue = blue;
  // Hammer-Werfer: Wurfsichel besiegt ihn
  const h = t.ent('w_hammer');
  t.sichel(h);
  c.step(4);
  out.hammer = h.defeated;
  // Stachelpanzer: von oben verletzt, Feuer und Wurfsichel besiegen
  const sp = t.ent('b_stachelpanzer');
  const s1 = t.stomp(sp, { h: 0.6 });
  t.fresh();
  t.sichel(sp);
  c.step(4);
  out.stachelpanzer = { stompHurt: s1.hurt, sichel: sp.defeated };
  // Zauberkröte: erscheint, Wurfsichel besiegt sie (sichtbar)
  const z = t.ent('b_zauber');
  t.until(() => z.vulnerable, 120 * 8, [-11, 1, t.Z(6, 1.5)]);
  t.sichel(z);
  c.step(4);
  out.zauber = { vulnerable: true, defeated: z.defeated };
  // echte Wurfsichel (Power-up der Bausteine Welt 7): Aktion wirft, die Sichel trifft einen Knochenflieger und kehrt zurück
  const kz = t.Z(1, -6);
  const k = L.spawn('knochenflieger', { pos: [0, 1.95, kz], sight: 0, bob: 0 });
  t.place([0, 1, kz + 4.5], { settle: 10, power: 'sichel' });
  t.face(0, kz);
  out.real = { power: p.power };
  c.setInput({ action: true }); c.step(1); c.setInput({}); 
  let sic = null;
  for (let i = 0; i < 240 && !(sic && sic.removed); i++) { c.step(1); if (!sic) sic = L.entities.find((e) => e.kind === 'wurfsichel' && e.owner === p) ?? null; }
  out.real.thrown = !!sic;
  out.real.hit = k.defeated;
  out.real.caught = sic?.caught ?? false;
  // Pilzlingsturm: Wurfsichel trägt eine Stufe ab
  const pt = t.ent('b_turm');
  const n0 = pt.count;
  t.sichel(pt);
  c.step(30);
  out.turm = { before: n0, after: pt.count };
  return out;
});
console.log(`  Werfer/Bestand: ${JSON.stringify(wf)}`);
check(`Bumerang-Werfer trägt die Wurfsichel (Modell ${wf.carry.model}), wirft sie (Gegner-Sichel, trifft die Figur, ${JSON.stringify(wf.carry)}) und fängt sie wieder`, wf.carry.sichel && wf.carry.model === 'bumerang_werfer' && wf.carry.dropped === false && wf.carry.boom && wf.carry.flyDropped === true && wf.carry.hurt && wf.carry.caught && wf.carry.catches >= 1 && wf.carry.back === false);
check(`Besiegt lässt er die Wurfsichel fallen (${JSON.stringify(wf.drop.item)}), Modell ohne Sichel`, wf.drop.bounced && wf.drop.defeated && wf.drop.dropped && wf.drop.modelDropped && wf.drop.item?.kind === 'powerup' && wf.drop.item.power === 'sichel' && wf.drop.item.d < 0.6);
check(`In die Lava gefallen: Wurfsichel an seinem Platz (${JSON.stringify(wf.lava.item)})`, wf.lava.item && Math.abs(wf.lava.item.x + 11.5) < 0.1 && wf.lava.item.y > 2.4);
check(`Feuer-Werfer mit blauen Feuerkugeln (${JSON.stringify(wf.blue)}); Wurfsichel besiegt den Hammer-Werfer`, wf.blue?.color === 'blau' && wf.blue.model === 'feuerkugel_blau' && wf.hammer);
check(`Echte Wurfsichel (Power-up ${wf.real.power}): Wurf trifft den Knochenflieger, die Sichel kehrt zurück`, wf.real.power === 'sichel' && wf.real.thrown && wf.real.hit && wf.real.caught);
check(`Stachelpanzer: von oben verletzt, Wurfsichel besiegt; Zauberkröte (sichtbar) besiegt; Pilzlingsturm ${wf.turm.before} → ${wf.turm.after} Stufen`, wf.stachelpanzer.stompHurt && wf.stachelpanzer.sichel && wf.zauber.defeated && wf.turm.after === wf.turm.before - 1);

const rf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // großer kreisender Rammfisch: Größe 2, Kreis r 3,4, rammt nicht – auch nicht, wenn die Figur davor schwimmt
  const g = t.ent('rf_gross');
  const C = [-11.5, t.Z(7, 7)];
  let rr = [99, 0];
  t.place([-11.5, 1.0, t.Z(7, 1.5)], { settle: 30 });
  p.hurt = () => false;
  for (let i = 0; i < 120 * 6; i++) { if (p.mode === 'swim') { p.pos.set(-11.5, -0.6, t.Z(7, 2)); p.vel.set(0, 0, 0); } c.step(1); const d = Math.hypot(g.pos.x - C[0], g.pos.z - C[1]); rr = [Math.min(rr[0], d), Math.max(rr[1], d)]; }
  delete p.hurt;
  out.big = { size: g.size, half: t.r2(g.half.x), r: rr.map(t.r2), rams: g.rams, state: g.state, swim: p.mode };
  t.fresh();
  // auf und ab: Höhe wechselt ≈ 3,3 m
  const v = t.ent('rf_hoch');
  let ys = [99, -99];
  for (let i = 0; i < 120 * 6; i++) { t.hold([0, 1, t.Z(7, 1)], 1); ys = [Math.min(ys[0], v.pos.y), Math.max(ys[1], v.pos.y)]; }
  out.vertical = ys.map(t.r2);
  // Stern in der Blase: wandert mit dem Fisch, Berührung sammelt ihn ein; nur starke Treffer besiegen den Fisch
  const s = t.ent('rf_stern');
  const star = s.carryStar;
  let sx = [99, -99];
  for (let i = 0; i < 480; i++) { t.hold([0, 1, t.Z(7, 1)], 1); sx = [Math.min(sx[0], star.pos.x), Math.max(sx[1], star.pos.x)]; }
  out.star = { index: star.index, moved: t.r2(sx[1] - sx[0]), above: t.r2(star.pos.y - (s.pos.y + s.half.y * 2)), dx: t.r2(star.pos.x - s.pos.x), bubble: !!s.bubble };
  t.sichel(s); s.onHit('fire', p); s.onHit('claw', p);
  out.star.weak = s.defeated;
  t.place([star.pos.x, star.pos.y - 0.3, star.pos.z], { settle: 0 });
  p.hurt = () => false;
  for (let i = 0; i < 30 && !star.removed; i++) { p.pos.set(star.pos.x, star.pos.y - 0.3, star.pos.z); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  c.step(2);
  out.star.collected = star.removed && L.runtime.stars[star.index] === true;
  out.star.bubbleGone = !s.bubble;
  s.onHit('bomb', p);
  out.star.strong = s.defeated;
  return out;
});
console.log(`  Rammfisch: ${JSON.stringify(rf)}`);
check(`Großer Rammfisch (×${rf.big.size}, Hülle ${rf.big.half} m) kreist (r ${rf.big.r.join('…')} m) und rammt nicht`, rf.big.size === 2 && rf.big.half === 1.5 && Math.abs(rf.big.r[0] - 3.4) < 0.25 && Math.abs(rf.big.r[1] - 3.4) < 0.25 && rf.big.rams === 0);
check(`Auf- und abziehender Rammfisch (y ${rf.vertical.join(' … ')})`, rf.vertical[1] - rf.vertical[0] > 3);
check(`Rammfisch trägt Stern ${rf.star.index} in der Blase (wandert mit, ${rf.star.moved} m); Wurfsichel/Feuer/Krallen prallen ab, Berührung sammelt den Stern, die Blase platzt; Explosion besiegt ihn`,
  rf.star.moved > 2 && rf.star.above > 0.2 && Math.abs(rf.star.dx) < 0.01 && rf.star.bubble && rf.star.weak === false && rf.star.collected && rf.star.bubbleGone && rf.star.strong);

// Wurfsichel bei allen Gegnerarten: frisch erzeugt, Treffer wie die Wurfsichel des Motors (t.sichel) – erwartete Wirkung je Art
const ws = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const KINDS = {
    // besiegt (wie ein Feuerball bzw. Tatzenhieb)
    besiegt: ['pilzling', 'krallen_pilzling', 'panzerkroete', 'schnappblume', 'krabbelkaefer', 'flatterkaefer', 'brummer', 'wuehler', 'hackvogel', 'rollpilz', 'huepfmaus',
      'huepfmaus_stachel', 'marschblock', 'feuer_werfer', 'hammer_werfer', 'bumerang_werfer', 'projektilkopf', 'suchkopf', 'feuer_schnappblume', 'flossling', 'pilzling_eis', 'pilzling_reifen', 'funkenkaefer',
      'ameisensoldat', 'ameisensoldat_horn', 'rankenschnapper', 'walzenwerfer', 'stachelpanzer', 'springklotz', 'hackbeil_pilz', 'funkenling', 'kuerbling', 'hexenhut_huepfer', 'klapperknochen',
      'flatterfledi', 'pustewolke', 'glotzfisch', 'stachelwerfer', 'gelee_brocken', 'lavabrocken', 'knochenflieger', 'platschfisch', 'wutkaulquappe', 'funkenflaemmchen'],
    // ein Trefferpunkt (zähe Gegner)
    treffer: ['riesenschnappblume', 'rammbock_bulle', 'grossrollpilz', 'riesenkuerbling', 'muenzmarder'],
    // unverwundbar bzw. nur starke Treffer: nichts
    nichts: ['stampfstein', 'wuschel', 'spuk', 'kreisgeist', 'stachelfisch', 'rammfisch', 'funkenlaeufer', 'riesenameise', 'stachelwalze', 'lavafunke', 'glutball', 'feuerring'],
  };
  const out = { wrong: [], n: 0, special: {} };
  let x = -14;
  const spawnAt = (k) => {
    x += 2.5;
    return L.spawn(k, { pos: [x, 1, t.Z(1, -4)], dir: [1, 0], wake: 99, sight: 0.01, phase: 0.5, path: k.endsWith('kaefer') ? [[x, 1, t.Z(1, -4)], [x + 1, 1, t.Z(1, -4)]] : undefined });
  };
  for (const [want, list] of Object.entries(KINDS)) {
    for (const k of list) {
      const e = spawnAt(k);
      if (!e) { out.wrong.push(`${k}: fehlt`); continue; }
      t.hold([0, 1, 6], 30);
      const hp0 = e.hp;
      t.sichel(e);
      c.step(4);
      const got = e.defeated ? 'besiegt' : hp0 !== undefined && e.hp < hp0 ? 'treffer' : 'nichts';
      out.n++;
      if (got !== want) out.wrong.push(`${k}: ${got} statt ${want}`);
      e.kill?.();
    }
  }
  // Sonderfälle: Panzer wird weggestoßen, Kickbombe/Zündkopf zünden, Schubser rutscht, Pilzlingsturm verliert eine Stufe
  const sp = (k, f) => { const e = spawnAt(k); t.hold([0, 1, 6], 30); t.sichel(e); c.step(4); const r = f(e); e.kill?.(); return r; };
  out.special.panzer = sp('panzer', (e) => e.state);
  out.special.kickbombe = sp('kickbombe', (e) => e.lit);
  out.special.zuendkopf = sp('zuendkopf', (e) => e.lit);
  out.special.schubser = sp('schubser', (e) => e.state);
  out.special.pilzlingsturm = sp('pilzlingsturm', (e) => e.count);
  return out;
});
console.log(`  Wurfsichel: ${JSON.stringify(ws)}`);
check(`Wurfsichel-Treffer bei ${ws.n} Gegnerarten wie erwartet (${ws.wrong.join('; ') || 'alle'})`, ws.wrong.length === 0 && ws.n >= 55);
check(`Sonderfälle: Panzer gleitet (${ws.special.panzer}), Kickbombe/Zündkopf zünden, Schubser wird gestoßen (${ws.special.schubser}), Pilzlingsturm ${ws.special.pilzlingsturm} Stufen`,
  ws.special.panzer === 'slide' && ws.special.kickbombe && ws.special.zuendkopf && ws.special.schubser !== 'idle' && ws.special.pilzlingsturm === 3);
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 3: Endgegner (0-28)
// =====================================================================================================================
const BOSS_HELPERS = () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.arch = () => c.state().archetype;
  /** Arena betreten: von start in Richtung −z gehen, bis der Kampf mit Endgegner id beginnt. */
  t.enter = (start, id) => {
    t.place(start, { settle: 2 });
    for (let i = 0; i < 1200 && !(c.arch.started && c.arch.boss === t.ent(id)); i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._w7) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._w7 = true; }
  t.untilState = (b, s, n = 3000, pos = null) => t.until(() => b.state === s, n, pos);
  t.action = (o = {}) => { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); };
  /** Lavabrocken des Königs b betäuben und aufheben → Brocken | null. */
  t.grab = (b) => {
    const p = c.player;
    let br = null;
    p.hurt = () => false;
    for (let i = 0; i < 1200 && !br; i++) { br = L.entities.find((e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated && e.owner === b && e.grounded) ?? null; if (!br) c.step(1); }
    if (!br) { delete p.hurt; return null; }
    const ax = b.arena.x - br.pos.x, az = b.arena.z - br.pos.z, al = Math.hypot(ax, az) || 1;
    t.place([br.pos.x + (ax / al) * 0.9, br.pos.y, br.pos.z + (az / al) * 0.9], { settle: 2 });
    p.hurt = () => false;
    if (br.state !== 'stunned') br.stun();
    t.face(br.pos.x, br.pos.z);
    t.action();
    delete p.hurt;
    return p.holding === br ? br : null;
  };
  /** Gehaltenen Brocken aus dist m auf den König b werfen (wartet auf Zustand wait). */
  t.throwAt = (b, dist = 4, wait = 'rest') => {
    const p = c.player, br = p.holding;
    if (!br) return { thrown: false };
    p.hurt = () => false;
    for (let i = 0; i < 3000 && b.state !== wait; i++) { p.vel.set(0, 0, 0); c.step(1); }
    const ax = b.arena.x - b.pos.x, az = b.arena.z - b.pos.z, al = Math.hypot(ax, az) || 1;
    const hp0 = b.hp;
    p.pos.set(b.pos.x + (ax / al) * dist, b.pos.y + 0.05, b.pos.z + (az / al) * dist);
    p.vel.set(0, 0, 0);
    t.face(b.pos.x, b.pos.z);
    c.step(1);
    t.action();
    for (let i = 0; i < 120 && !br.removed && br.state === 'thrown'; i++) c.step(1);
    delete p.hurt;
    return { hit: b.hp < hp0, hp: b.hp, state: b.state };
  };
  /** Baron: Figur läuft im Kampffenster mit (9 m hinter dem Wagen auf fester Fahrbahn, unverwundbar) – ein Schritt. */
  t.follow = (b) => {
    const p = c.player, road = t.ent('strasse');
    let z = Math.min(b.pos.z + 9, b.backZ - 0.2);
    for (let k = 0; k < 30 && !road.solidAt(b.pos.x, z, 0.5); k++) z += 0.5;
    p.pos.set(b.pos.x, 2, z); p.vel.set(0, 0, 0);
    p.hurt = () => false;
    c.step(1);
    delete p.hurt;
  };
  t.untilB = (b, f, n) => { let i = 0; for (; i < n && !f(); i++) t.follow(b); return i; };
  /** Baron: gelandete Kickbombe im Fenster zurückkicken (Figur 1 m dahinter, läuft auf sie zu) → { kicked, hit }. */
  t.kickBack = (b, n = 120 * 20) => {
    const p = c.player;
    let bomb = null;
    for (let i = 0; i < n && !bomb && b.hp > 0; i++) {
      bomb = L.entities.find((e) => e.kind === 'kickbombe' && !e.removed && !e.kicker && e.owner === b && e.state === 'lit' && e.grounded && e.pos.z < b.backZ - 1.3) ?? null;
      if (bomb && !b.vulnerable) bomb = null;
      if (!bomb) t.follow(b);
    }
    p.hurt = () => false;
    if (!bomb) { delete p.hurt; return { kicked: false, hit: false }; }
    const h0 = b.hits;
    p.reset([bomb.pos.x, bomb.pos.y + 0.05, bomb.pos.z + 1.0], Math.PI / 2);
    c.step(1);
    for (let k = 0; k < 60 && !bomb.kicker; k++) { c.setInput({ y: 1 }); c.step(1); }
    c.setInput({});
    const kicked = !!bomb.kicker;
    for (let k = 0; k < 300 && !bomb.removed; k++) c.step(1);
    delete p.hurt;
    return { kicked, hit: b.hits > h0, short: !!bomb.shortFuse };
  };
};

if (want(3)) {
await load('0-28');
await sc(BOSS_HELPERS);
console.log('Teil 3: Endgegner 0-28');

// ---- heller Lavafelsen-König (7-A)
const kg = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('koenig7');
  const out = {};
  out.before = { state: b.state, model: t.model(b), variant: b.variant, fish: b.fishList.length };
  const a = t.enter([0, 2, 19], 'koenig7');
  out.start = { started: a.started, active: a.active, name: a.hud?.boss?.name, lock: a.lock };
  t.untilState(b, 'summon', 1200, [0, 2, 8]);
  c.step(2);
  const fish = b.fishList.map((f) => {
    const [h0, h1] = f.holes;
    const mx = (h0.x + h1.x) / 2, mz = (h0.z + h1.z) / 2;
    return { r0: t.r2(Math.hypot(h0.x, h0.z)), mid: t.r2(Math.hypot(mx, mz)), ang: t.r2(Math.atan2(mz, mx)) };
  });
  out.fish1 = { n: b.fishList.length, fish };
  // ein Platschfisch springt über den Arenarand (Figur am Rand wird getroffen)
  const f0 = b.fishList[0];
  let jumpedIn = false;
  t.until(() => { if (f0.state === 'jump' && Math.hypot(f0.pos.x, f0.pos.z) < 10.4 && f0.pos.y > 2) jumpedIn = true; return jumpedIn; }, 120 * 8, [0, 2, 8]);
  out.fishJump = jumpedIn;
  // Treffer nur durch geworfene Lavabrocken (3×), Phase 2 → 3 Fische, Phase 3 → 4 Fische
  const hits = [];
  for (let k = 0; k < 3; k++) {
    const br = t.grab(b);
    const w = br ? t.throwAt(b, 4, 'rest') : { hit: false };
    hits.push({ grabbed: !!br, ...w, fish: b.fishList.length });
    if (b.hp > 0) { t.untilState(b, 'summon', 120 * 8, [0, 2, 8]); c.step(2); hits[hits.length - 1].fishAfter = b.fishList.length; }
  }
  out.hits = hits;
  out.banners = t.banners.slice();
  t.untilState(b, 'gone', 120 * 8, [0, 2, 8]);
  c.step(4);
  out.gone = { state: b.state, won: t.arch().won, warp: t.ent('warp_a').hidden, star: t.count('star'), fish: t.count('platschfisch', (f) => f.owner === b && !f.defeated) };
  const star = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (star) t.place([star.pos.x, star.pos.y, star.pos.z], { settle: 60 });
  out.starTaken = !L.entities.some((e) => e.kind === 'star' && !e.removed);
  const w = t.ent('warp_a');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -40 && p.mode !== 'script') { arrived = true; break; } }
  out.warp = { arrived, z: t.r2(p.pos.z) };
  return out;
});
console.log(`  Heller König: ${JSON.stringify(kg)}`);
check(`Heller Lavafelsen-König: Variante ${kg.before.variant}, Modell ${kg.before.model}; Kampf beginnt beim Betreten (${kg.start.name}, Sperre)`, kg.before.variant === 'hell' && kg.before.model === 'lavafelsen_koenig' && kg.before.fish === 0 && kg.start.started && kg.start.active === 'koenig7' && kg.start.lock);
check(`Platschfische rings um die Arena (${kg.fish1.n}; Löcher r ${kg.fish1.fish.map((f) => f.r0).join('/')}, Sehnen bis r ${kg.fish1.fish.map((f) => f.mid).join('/')}), Steg frei, springen über den Rand`,
  kg.fish1.n === 2 && kg.fish1.fish.every((f) => Math.abs(f.r0 - 12) < 0.05 && f.mid < 10.4 && Math.abs(f.ang - Math.PI / 2) > 0.9) && kg.fishJump);
check(`Nur geworfene Lavabrocken treffen: 3 Treffer (${kg.hits.map((h) => h.hp).join(' → ')}), je Phase mehr Platschfische (${kg.hits.map((h) => h.fishAfter ?? '-').join(', ')})`,
  kg.hits.every((h) => h.grabbed && h.hit) && kg.hits[2].hp === 0 && kg.hits[0].fishAfter === 3 && kg.hits[1].fishAfter === 4);
check(`Ansagen wie 4-Burg (${kg.banners.filter((x) => /Lavabrocken|schneller|heiß/.test(x)).join(' | ')})`, kg.banners.includes('Wirf Lavabrocken auf ihn!') && kg.banners.includes('Er rollt schneller!') && kg.banners.includes('Jetzt wird es heiß!'));
check('Sieg: Platschfische weg, Stern, Warp-Box; Stern einsammeln, Warp-Box → Käfig B', kg.gone.state === 'gone' && kg.gone.won && kg.gone.warp === false && kg.gone.star === 1 && kg.gone.fish === 0 && kg.starTaken && kg.warp.arrived);

// ---- blauer Schubser-Prinz (7-B)
const pr = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('prinz7');
  const ZB = -60;
  const out = {};
  out.before = { model: t.model(b), blue: b.blue };
  const a = t.enter([0, 2, ZB + 14], 'prinz7');
  out.start = { started: a.started, active: a.active, name: a.hud?.boss?.name };
  // Spucken: 3 blaue Feuerkugeln nacheinander auf einer Bogenbahn
  const fig = [5, 2, ZB + 4];
  t.untilState(b, 'fire', 2400, fig);
  const balls = [];
  const seen = new Set();
  t.until(() => {
    for (const e of L.entities) if (e.kind === 'feuerkugel' && e.owner === b && !seen.has(e)) { seen.add(e); balls.push({ e, t0: L.time, yaw0: Math.atan2(-e.vel.z, e.vel.x), yaw1: null }); }
    for (const x of balls) if (!x.e.removed && L.time - x.t0 < 0.8) x.yaw1 = Math.atan2(-x.e.vel.z, x.e.vel.x);
    return b.state === 'aim' && balls.length > 0;
  }, 600, fig);
  c.step(60);
  out.volley1 = { n: balls.length, color: balls[0]?.e.color, model: t.model(balls[0]?.e), turn: balls.map((x) => t.r2(Math.abs(Math.atan2(Math.sin(x.yaw1 - x.yaw0), Math.cos(x.yaw1 - x.yaw0))))), t: balls.map((x) => t.r2(x.t0 - balls[0].t0)) };
  // Treffer über die Röhren (wie 6-A): stoßen → steckt → zweiter Stoß → gequetscht heraus → Tritt
  const kick = (pipeZ, side) => {
    t.untilState(b, 'aim', 2400, [0, 2, ZB + 6]);
    const mx = side < 0 ? -6.5 : 6.5;
    b.pos.set(mx, 2, ZB + pipeZ); b.vel.set(0, 0, 0); b.slide.x = 0; b.slide.z = 0;
    t.place([mx - side * 3.2, 2, ZB + pipeZ], { settle: 1, yaw: side < 0 ? Math.PI : 0 });
    for (let i = 0; i < 60 && b.state === 'aim'; i++) { c.setInput({ x: side, run: true }); c.step(1); }
    c.setInput({});
    for (let i = 0; i < 300 && b.state !== 'stuck'; i++) c.step(1);
    const stuck = b.state === 'stuck';
    t.place([b.pos.x - side * 2.6, 2, b.pos.z], { settle: 1, yaw: side < 0 ? Math.PI : 0 });
    for (let i = 0; i < 120 && b.state === 'stuck'; i++) { c.setInput({ x: side, run: true }); c.step(1); }
    c.setInput({});
    for (let i = 0; i < 900 && b.state !== 'stunned'; i++) c.step(1);
    const hp0 = b.hp;
    const st = t.stomp(b, { h: 0.8 });
    return { stuck, trip: b.tripLog[b.tripLog.length - 1], hit: b.hp < hp0, hp: b.hp, bounced: st.bounced };
  };
  out.hit1 = kick(0, -1);
  const volley = () => {
    t.untilState(b, 'fire', 2400, [5, 2, ZB + 4]);
    const s0 = new Set();
    t.until(() => { for (const e of L.entities) if (e.kind === 'feuerkugel' && e.owner === b) s0.add(e); return b.state === 'aim'; }, 600, [5, 2, ZB + 4]);
    return s0.size;
  };
  out.v2 = volley();
  out.ph2 = t.banners.slice(-2);
  out.hit2 = kick(6, 1);
  out.v3 = volley();
  out.ph3 = t.banners.slice(-2);
  out.hit3 = kick(-6, -1);
  t.untilState(b, 'gone', 900, [5, 2, ZB + 4]);
  c.step(4);
  out.gone = { state: b.state, won: t.arch().won, warp: t.ent('warp_b').hidden, star: t.count('star') };
  const star = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (star) t.place([star.pos.x, star.pos.y, star.pos.z], { settle: 60 });
  const w = t.ent('warp_b');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -100 && p.mode !== 'script') { arrived = true; break; } }
  out.warp = { arrived };
  return out;
});
console.log(`  Blauer Prinz: ${JSON.stringify(pr)}`);
check(`Blauer Schubser-Prinz (Modell ${pr.before.model}): Kampf beginnt (${pr.start.name})`, pr.before.blue && pr.before.model === 'schubser_prinz' && pr.start.started && pr.start.active === 'prinz7');
check(`Drei blaue Feuerkugeln (${pr.volley1.color}, ${pr.volley1.model}) nacheinander (${pr.volley1.t.join('/')} s) in einer Kurve (Drehung ${pr.volley1.turn.join('/')} rad)`,
  pr.volley1.n === 3 && pr.volley1.color === 'blau' && pr.volley1.model === 'feuerkugel_blau' && pr.volley1.turn.every((x) => x > 0.25) && pr.volley1.turn[0] > 0.5 && pr.volley1.t[2] > 0.15);
check(`Nach jedem Treffer einer mehr: ${pr.volley1.n} → ${pr.v2} → ${pr.v3} (Ansagen ${[...pr.ph2, ...pr.ph3].join(' | ')})`, pr.v2 === 4 && pr.v3 === 5 && pr.ph2.includes('Jetzt spuckt er vier Feuerbälle!') && pr.ph3.includes('Jetzt spuckt er fünf Feuerbälle!'));
check(`Ablauf wie 6-A: Röhre, zweiter Stoß, gequetscht heraus, Tritt (Treffer ${pr.hit1.hp}/${pr.hit2.hp}/${pr.hit3.hp})`, [pr.hit1, pr.hit2, pr.hit3].every((h) => h.stuck && h.hit && h.bounced) && pr.hit3.hp === 0);
check('Sieg: Stern, Warp-Box → Boss-Straße', pr.gone.state === 'gone' && pr.gone.won && pr.gone.warp === false && pr.gone.star === 1 && pr.warp.arrived);

// ---- Baron Brummbär im Kampfwagen (7-Burg)
const bn = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('baron'), road = t.ent('strasse');
  const out = {};
  out.before = { state: b.state, visible: b.visible, model: t.model(b), road: road.info(), traps: t.count('stachelfalle'), roadModels: road.models.length };
  const a = t.enter([0, 2, -106], 'baron');
  out.start = { started: a.started, active: a.active, name: a.hud?.boss?.name, hp: a.hud?.boss?.hp, max: a.hud?.boss?.max, state: b.state };
  // Auftritt, dann Autoscroll: das Fenster wandert, die Grenze schiebt die stehende Figur vorwärts
  t.untilState(b, 'drive', 600, [0, 2, -113]);
  const fig0 = p.pos.z, s0 = b.s;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 6; i++) { p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  out.scroll = { v: b.v, ds: t.r2(b.s - s0), fig: t.r2(p.pos.z - fig0), behind: t.r2(p.pos.z - b.backZ), pushes: b.pushes > 0, banner: t.banners.includes('Kick die Bomben zurück!') };
  // Würfe: Bomben landen vor der Figur, nie in einer Lücke; Landemarke
  const thrown = [];
  const seenB = new Set();
  let marker = false;
  const landed = [];
  t.untilB(b, () => {
    for (const e of L.entities) if (e.kind === 'kickbombe' && e.owner === b && !seenB.has(e)) { seenB.add(e); thrown.push(e); }
    for (const e of thrown) if (e.state === 'lit' && e.grounded && !landed.includes(e)) { landed.push(e); e.landOk = road.solidAt(e.pos.x, e.pos.z, 0.1); }
    if (b.markers.list.length) marker = true;
    return landed.length >= 3;
  }, 120 * 15);
  out.bombs = { n: landed.length, onRoad: landed.every((e) => e.landOk), marker };
  // Sprung über die erste Lavalücke (a = 26)
  t.untilB(b, () => b.jumps >= 1 && !b.jump, 120 * 20);
  out.jump = { jumps: b.jumps, z: t.r2(b.pos.z), deaths: t.arch().deaths };
  // 9 Treffer: zurückgekickte Bomben (Phase 2 nach 3, Phase 3 nach 6); dazwischen Wurfsichel-Kratzer
  const kicks = [];
  const phases = [];
  let sichelDone = false, short = 0, fireballs = 0, burst = 0;
  for (let k = 0; k < 40 && b.hp > 0; k++) {
    if (b.hp <= 7 && !sichelDone) {
      // Wurfsichel: zwei Kratzer = ein Treffer (Zusatzschaden)
      sichelDone = true;
      t.untilB(b, () => b.vulnerable && !b.jump, 600);
      const hp0 = b.hp;
      // echte Wurfsichel: Figur 4 m hinter dem Wagen, Wurf nach vorn
      const throwSichel = () => {
        const road = t.ent('strasse');
        let z = b.pos.z + 2.75 + 4;
        for (let k = 0; k < 20 && !road.solidAt(b.pos.x, z, 0.5); k++) z += 0.5;
        t.place([b.pos.x, 2, z], { settle: 2, power: 'sichel' });
        p.hurt = () => false;
        t.face(b.pos.x, b.pos.z);
        c.setInput({ action: true }); c.step(1); c.setInput({});
        let sic = null;
        for (let i = 0; i < 300 && !(sic && sic.removed); i++) { p.pos.z = Math.min(p.pos.z, b.backZ); c.step(1); if (!sic) sic = L.entities.find((e) => e.kind === 'wurfsichel' && e.owner === p) ?? null; }
        delete p.hurt;
        return !!sic;
      };
      const th1 = throwSichel();
      const k1 = { car: b.carHits, hp: b.hp, thrown: th1 };
      t.untilB(b, () => b.vulnerable && !b.jump, 600);
      throwSichel();
      kicks.push({ sichel: true, k1, hp: b.hp, from: hp0, car: b.carHits });
      p.setPower('none');
      t.untilB(b, () => b.vulnerable, 600);
      continue;
    }
    const r = t.kickBack(b);
    kicks.push({ ...r, hp: b.hp, ph: b.phase });
    if (r.short) short++;
    if (!phases.includes(b.phase)) phases.push(b.phase);
  }
  out.kicks = kicks;
  out.phases = phases;
  out.info = b.info();
  out.banners = t.banners.slice();
  // Niederlage → Flucht → gone, Stern, Warp-Box → Zielmast
  const sDef = b.s;
  const seq = [b.state];
  t.untilB(b, () => { if (seq[seq.length - 1] !== b.state) seq.push(b.state); return b.state === 'gone'; }, 120 * 10);
  c.step(4);
  out.end = { seq: seq.join('>'), moved: t.r2(b.s - sDef), won: t.arch().won, warp: t.ent('warp_c').hidden, star: t.count('star'), bombs: t.count('kickbombe', (e) => e.owner === b && !e.defeated), traps: road.trapsOn };
  const w = t.ent('warp_c');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -275 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 2400 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 3600 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  return out;
});
console.log(`  Baron im Kampfwagen: ${JSON.stringify(bn)}`);
check(`Boss-Straße: ${bn.before.road.length} m, ${bn.before.road.gaps} Lavalücken, ${bn.before.road.middle} Mittellücke, ${bn.before.traps} Stachelfallen; Baron wartet unsichtbar (Modell ${bn.before.model})`,
  bn.before.road.length === 150 && bn.before.road.gaps === 3 && bn.before.road.middle === 1 && bn.before.traps === 11 && bn.before.state === 'wait' && !bn.before.visible && bn.before.model === 'baron_kampfwagen');
check(`Kampf beginnt am Straßenanfang: Lebensleiste „${bn.start.name}“ ${bn.start.hp}/${bn.start.max}`, bn.start.started && bn.start.active === 'baron' && bn.start.hp === 9 && bn.start.max === 9 && bn.start.state === 'intro');
check(`Autoscroll: Fenster wandert (${bn.scroll.ds} m in 6 s), die Grenze schiebt die Figur mit (${bn.scroll.fig} m)`, Math.abs(bn.scroll.ds - 14.4) < 0.3 && bn.scroll.fig < -10 && bn.scroll.pushes && bn.scroll.behind <= 0.01 && bn.scroll.banner);
check(`Kickbomben vor die Figur, nie in eine Lücke, mit Landemarke (${bn.bombs.n})`, bn.bombs.n >= 3 && bn.bombs.onRoad && bn.bombs.marker);
check(`Der Wagen springt über die Lavalücke (${bn.jump.jumps} Sprung, z ${bn.jump.z})`, bn.jump.jumps >= 1 && bn.jump.z < -112 - 26 && bn.jump.deaths === 0);
const kk = bn.kicks.filter((k) => !k.sichel);
const sk = bn.kicks.find((k) => k.sichel);
check(`Zurückgekickte Kickbomben treffen (${kk.filter((k) => k.hit).length} Treffer aus ${kk.filter((k) => k.kicked).length} Kicks), 9 Treffer in 3 Phasen (${bn.phases.join(',')})`, kk.filter((k) => k.hit).length >= 7 && kk.filter((k) => k.hit).length >= kk.filter((k) => k.kicked).length * 0.75 && bn.info.hp === 0 && bn.phases.join(',') === '1,2,3');
check(`Echte Wurfsichel trifft den Wagen: Kratzer (${sk?.k1.car}) und Zusatzschaden – 2 Kratzer = 1 Treffer (${sk?.from} → ${sk?.hp})`, sk && sk.k1.thrown && sk.k1.car === 1 && sk.k1.hp === sk.from && sk.hp === sk.from - 1 && sk.car === 0);
check(`Angriffe: ${bn.info.bombs} Bomben (${bn.info.shortBombs} kurz vor der Explosion), ${bn.info.fires} Feuerangriffe (${bn.info.fireballs} Kugeln)`, bn.info.shortBombs >= 2 && bn.info.fires >= 2 && bn.info.fireballs > bn.info.fires);
check(`Phasen-Ansagen (${bn.banners.filter((x) => /Bomben|schneller|explodiert|Kratzer/.test(x)).join(' | ')})`, bn.banners.includes('Mehr Bomben – und ein Feuerstoß!') && bn.banners.includes('Er wird schneller – Vorsicht, Stacheln!') && bn.banners.includes('Kratzer!') && bn.banners.some((x) => /Baron Brummbär ist besiegt/.test(x)));
check(`Besiegt: ${bn.end.seq}; Bomben verpufft, Stachelfallen eingefahren, Stern, Warp-Box → Zielmast`, /defeated>flee>gone/.test(bn.end.seq) && bn.end.won && bn.end.warp === false && bn.end.star === 1 && bn.end.bombs === 0 && !bn.end.traps && bn.finish.arrived && bn.finish.finished);

// ---- Stachelfallen und Tod im Kampf
await load('0-28');
await sc(BOSS_HELPERS);
const rs = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const settle = () => { for (let i = 0; i < 2400 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1); };
  const die = () => { settle(); delete p.hurt; p.invuln = 0; p.die('hit'); settle(); c.step(10); };
  const b = t.ent('baron'), road = t.ent('strasse');
  L.runtime.setCheckpoint([0, 2, -106], Math.PI / 2);
  t.enter([0, 2, -106], 'baron');
  t.untilState(b, 'drive', 600, [0, 2, -113]);
  // Stachelfalle: Warnung, dann Stacheln – wer darauf steht, wird getroffen
  const trap = road.traps[1];
  const seq = [trap.state];
  t.untilB(b, () => { if (seq[seq.length - 1] !== trap.state) seq.push(trap.state); return trap.state === 'up'; }, 120 * 8);
  t.fresh();
  p.pos.set(trap.pos.x, trap.pos.y, trap.pos.z); p.vel.set(0, 0, 0);
  let hurt = false;
  for (let i = 0; i < 20 && !hurt; i++) { p.pos.x = trap.pos.x; p.pos.z = Math.min(trap.pos.z, b.backZ); c.step(1); if (t.hurt()) hurt = true; }
  out.trap = { seq: seq.join('>'), hurt, period: road.trapPeriod };
  t.fresh();
  // Mitten im Kampf: 2 Treffer, Bomben unterwegs → Tod → alles zurück
  for (let k = 0; k < 8 && b.hits < 2; k++) t.kickBack(b);
  t.untilB(b, () => L.entities.some((e) => e.kind === 'kickbombe' && e.owner === b), 120 * 6);
  out.before = { hp: b.hp, s: t.r2(b.s), bombs: t.count('kickbombe', (e) => e.owner === b) };
  die();
  out.after = { state: b.state, hp: b.hp, s: b.s, z: t.r2(b.pos.z), visible: b.visible, bombs: t.count('kickbombe', (e) => e.owner === b), traps: road.trapsOn, trapUp: road.traps.some((x) => x.upK > 0), started: t.arch().started, deaths: t.arch().deaths, fig: t.r2(p.pos.z) };
  const again = t.enter([0, 2, -106], 'baron');
  out.again = again.started && b.state === 'intro' && b.hp === 9;
  // Prinz und König setzen ebenfalls zurück
  L.runtime.setCheckpoint([0, 2, 19], Math.PI / 2);
  die();
  const k = t.ent('koenig7');
  t.enter([0, 2, 19], 'koenig7');
  t.untilState(k, 'summon', 1200, [0, 2, 8]);
  c.step(2);
  const kf = k.fishList.length;
  die();
  out.koenig = { fishBefore: kf, deaths: t.arch().deaths, state: k.state, hp: k.hp, fish: t.count('platschfisch', (f) => f.owner === k), brocken: t.count('lavabrocken', (e) => e.owner === k) };
  return out;
});
console.log(`  Stachelfalle / Tod im Kampf: ${JSON.stringify(rs)}`);
check(`Stachelfalle: Warnung, dann Stacheln (${rs.trap.seq}, Takt ${rs.trap.period} s) – wer darauf steht, wird getroffen`, /warn>up/.test(rs.trap.seq) && rs.trap.hurt);
check(`Tod im Kampf (Baron): Neustart, Baron 9/9 am Anfang, Fenster zurück, Bomben weg, Stachelfallen eingefahren (${JSON.stringify(rs.after)})`,
  rs.before.hp === 7 && rs.before.s > 5 && rs.after.state === 'wait' && rs.after.hp === 9 && rs.after.s === 0 && !rs.after.visible && rs.after.bombs === 0 && !rs.after.traps && !rs.after.trapUp && !rs.after.started && rs.after.deaths === 1 && rs.again);
check(`Tod im Kampf (heller König): 3/3, Platschfische und Brocken weg (${JSON.stringify(rs.koenig)})`, rs.koenig.fishBefore === 2 && rs.koenig.state === 'wait' && rs.koenig.hp === 3 && rs.koenig.fish === 0 && rs.koenig.brocken === 0);
check('Keine Konsolenfehler (Teil 3)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 4: Bilder (Kurs-Kamera) und Zeichenaufrufe
// =====================================================================================================================
if (want(4)) {
await load('0-27');
console.log('Teil 4: Bilder');
const S = {};
S.flieger = await SHOT('w7e', 'knochenflieger_sturzflug', () => {
  const c = window.__course, t = window.__t, k = t.ent('kf_kreis');
  const fig = [-11.5, 1, t.Z(1, 8)];
  t.place(fig, { settle: 1 });
  t.until(() => k.state === 'dive' && k.stateT > k.diveT * 0.3, 1200, fig);
  t.face(k.pos.x, k.pos.z);
});
S.platsch = await SHOT('w7e', 'platschfisch_sprung', () => {
  const c = window.__course, t = window.__t, f = t.ent('pf_pendel');
  const fig = [-11.2, 2.5, t.Z(2, 6.2)];
  t.place(fig, { settle: 1 });
  t.until(() => f.state === 'jump' && Math.abs(f.stateT / f.flight - 0.32) < 0.02, 1500, fig);
  t.face(-17, t.Z(2, 7));
});
S.spucken = await SHOT('w7e', 'platschfisch_spuckt', () => {
  const c = window.__course, t = window.__t, f = t.ent('pf_pendel');
  const fig = [-11.2, 2.5, t.Z(2, 6.2)];
  t.until(() => f.state === 'spit' && f.stateT > 0.42, 120 * 12, fig);
  c.step(8);
  t.face(f.pos.x, f.pos.z);
});
S.strom = await SHOT('w7e', 'platschfisch_endlos', () => {
  const c = window.__course, t = window.__t, q = t.ent('pf_strom');
  const fig = [9.5, 1.2, t.Z(2, -2)];
  t.place(fig, { settle: 1 });
  t.until(() => q.kids.filter((k) => k.state === 'jump').length >= 2, 120 * 12, fig);
  t.face(9.5, t.Z(2, 6.5));
});
S.drache = await SHOT('w7e', 'lavadrache_speit', () => {
  const c = window.__course, t = window.__t, d = t.ent('ld_rot');
  const fig = [-12.5, 2.2, t.Z(3, 2.2)];
  t.place(fig, { settle: 1 });
  t.until(() => d.state === 'spit' && d.stateT > 0.62, 120 * 10, fig);
  t.face(d.base.x, d.base.z);
});
S.drache2 = await SHOT('w7e', 'lavadrache_blau', () => {
  const c = window.__course, t = window.__t, d = t.ent('ld_blau');
  const fig = [10.5, 2.2, t.Z(3, 2.2)];
  t.place(fig, { settle: 1 });
  t.until(() => d.state === 'spit' && d.stateT > 0.3, 120 * 10, fig);
  t.face(d.base.x, d.base.z);
});
S.quappe = await SHOT('w7e', 'wutkaulquappe_aufgeblasen', () => {
  const c = window.__course, t = window.__t, p = c.player, q = t.ent('wq_platz');
  t.place([-14, 1.0, t.Z(4, 6)], { settle: 30 });
  t.until(() => q.state === 'puffed' || q.state === 'shove', 120 * 6, p.mode === 'swim' ? [-14, 1.2, t.Z(4, 6)] : null);
  c.step(10);
  t.face(q.pos.x, q.pos.z);
});
S.flammchen = await SHOT('w7e', 'funkenflaemmchen', () => {
  const c = window.__course, t = window.__t, f = t.ent('ff_bahn');
  const fig = [-11.5, 2, t.Z(5, 1.5)];
  t.place(fig, { settle: 1 });
  t.until(() => f.state === 'air' && f.stateT > f.airT * 0.45, 120 * 3, fig);
  t.face(-11.5, t.Z(5, 6));
});
S.werfer = await SHOT('w7e', 'bumerang_werfer_sichel', () => {
  const c = window.__course, t = window.__t, w = t.ent('w_sichel');
  const fig = [13, 1, t.Z(6, 2.5)];
  t.place(fig, { settle: 1 });
  t.until(() => c.level.entities.some((e) => e.kind === 'wurf_bumerang' && e.owner === w && e.age > 0.3) || w.state === 'jump', 120 * 6, fig);
  t.face(w.pos.x, w.pos.z);
});
S.ramm = await SHOT('w7e', 'rammfisch_stern', () => {
  const c = window.__course, t = window.__t;
  t.place([2.5, 1, t.Z(7, 1.5)], { settle: 1 });
  t.hold([2.5, 1, t.Z(7, 1.5)], 60);
  t.face(11.5, t.Z(7, 6));
});
S.bestand = await SHOT('w7e', 'bestand', () => {
  const c = window.__course, t = window.__t;
  t.place([0, 1, t.Z(8, 2)], { settle: 90 });
  t.face(-11, t.Z(8, 7));
});
const zmax = Math.max(...Object.values(S).map((s) => s.calls));
KPI.zoo = { calls: zmax, tris: Math.round(Math.max(...Object.values(S).map((s) => s.triangles)) / 1000) };
console.log(`  Zeichenaufrufe Gegnerzoo: ${Object.entries(S).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${KPI.zoo.tris} k Dreiecke`);
check(`Gegnerzoo: Zeichenaufrufe < 140 (höchstens ${zmax})`, zmax < 140);

await load('0-28');
await sc(BOSS_HELPERS);
const B = {};
B.koenig = await SHOT('w7e', 'koenig_hell_platschfische', () => {
  const c = window.__course, t = window.__t, b = t.ent('koenig7');
  t.enter([0, 2, 19], 'koenig7');
  const fig = [3, 2, 5];
  t.until(() => b.state === 'roll' && b.fishList.some((f) => f.state === 'jump' && f.stateT > 0.35), 120 * 12, fig);
  t.face(b.pos.x, b.pos.z);
});
B.koenigW = await SHOT('w7e', 'koenig_hell_wirbel', () => {
  const c = window.__course, t = window.__t, b = t.ent('koenig7');
  const br = t.grab(b);
  if (br) t.throwAt(b, 4, 'rest');
  t.until(() => b.state === 'spin' && b.stateT > 0.5, 600, null);
  t.face(b.pos.x, b.pos.z);
});
await load('0-28');
await sc(BOSS_HELPERS);
B.prinz = await SHOT('w7e', 'prinz_blau_feuerkurve', () => {
  const c = window.__course, t = window.__t, b = t.ent('prinz7');
  c.player.reset([0, 2.3, -46], Math.PI / 2); c.level.runtime.setCheckpoint([0, 2, -46], Math.PI / 2);
  t.enter([0, 2, -46], 'prinz7');
  const fig = [4, 2, -56];
  t.until(() => b.state === 'aim' && b.fireballs >= 3 && c.level.entities.filter((e) => e.kind === 'feuerkugel' && !e.removed).length >= 3, 120 * 14, fig);
  t.face(b.pos.x, b.pos.z);
});
await load('0-28');
await sc(BOSS_HELPERS);
B.auftritt = await SHOT('w7e', 'baron_auftritt', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  c.player.reset([0, 2.3, -106], Math.PI / 2); c.level.runtime.setCheckpoint([0, 2, -106], Math.PI / 2);
  t.enter([0, 2, -106], 'baron');
  t.until(() => b.state === 'intro' && b.stateT > 1.6, 600, null);
});
B.wurf = await SHOT('w7e', 'baron_kickbomben', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.untilB(b, () => b.state === 'throw' && b.stateT > 0.75 && b.bombs.length >= 1, 120 * 12);
});
B.sprung = await SHOT('w7e', 'baron_sprung', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.untilB(b, () => b.jump && b.jump.t > 0.35, 120 * 20);
});
B.mitte = await SHOT('w7e', 'baron_mittelluecke', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron'), road = t.ent('strasse');
  t.untilB(b, () => road.midAt(b.pos.z + 4, b.pos.z - 2) && b.state === 'throw' && b.stateT > 0.7, 120 * 40);
});
B.treffer = await SHOT('w7e', 'baron_treffer', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  for (let k = 0; k < 6 && b.hits < 1; k++) t.kickBack(b);
  t.untilB(b, () => b.state === 'hit' && b.stateT > 0.15, 120 * 20);
});
B.flucht = await SHOT('w7e', 'baron_flucht', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  for (let k = 0; k < 30 && b.hp > 0; k++) t.kickBack(b);
  t.untilB(b, () => b.state === 'flee' && b.stateT > 0.9, 120 * 10);
});
const bmax = Math.max(...Object.values(B).map((s) => s.calls));
KPI.arenen = { calls: bmax, tris: Math.round(Math.max(...Object.values(B).map((s) => s.triangles)) / 1000) };
console.log(`  Zeichenaufrufe Bossarenen: ${Object.entries(B).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${KPI.arenen.tris} k Dreiecke`);
check(`Bossarenen: Zeichenaufrufe < 140 (höchstens ${bmax})`, bmax < 140);
check('Keine Konsolenfehler (Teil 4)', errors.length === 0);
}

console.log(`Kennzahlen: ${JSON.stringify(KPI)}`);
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
