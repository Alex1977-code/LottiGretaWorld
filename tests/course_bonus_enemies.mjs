// Kurs-Modus: Gegner der Bonuswelten (Stern, Pilz, Blume, Krone) im Bonus-Gegnerzoo (0-35) und der Boss-Marathon B-12 in der
// Boss-Marathon-Probe (0-36) deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner:
//   Krakenpilz (hüpft, spuckt Steinchen im Bogen, Steinchen verletzt, fährt auf gleitenden Blöcken mit, patrouilliert/jagt, von oben
//   besiegbar, seitlich verletzt, Feuer/Wurfsichel), Stachelkugler (rollt den Hang hinab, pendelt, Bahn, prallt ab, nicht von oben
//   besiegbar, Power-ups/Wurfsichel/Kanone besiegen), Tintling (Stöße im Zickzack, weicht zurück, bleibt im Wasser, Strömung,
//   Kontakt verletzt, Stampfen/Kanone besiegen), Riesenhase (flieht, schlägt Haken, verschnauft, gefangen: Stern und Items),
//   Laufbombe (zündet bei Nähe, sprengt den Felsblock, Signal), Pilzlingsturm aus 30 Pilzlingen und mit Feuer-Werfer obenauf,
//   Topfpflanze frisst Wuschel, P-Haus-Kampfräume (alle Gegner eines Raums besiegt → Signal), Bestand, Modelle (Zustände,
//   dispose()); Boss-Marathon komplett (Hub, 5 Schlüssel, Boxen erledigt, letzte Box, Würfelblase mit mehr Wellen, Sterne,
//   Neustart nach Tod, Zeit läuft im Hub weiter). Bilder tests/out/be_*.png, Kennzahlen (Zeichenaufrufe, Dreiecke).
// Simulation nur über window.__course.step(n) (1 Schritt = 1/120 s) und setInput.
// Aufruf: PORT_BASE=0 node tests/course_bonus_enemies.mjs   (Port 4925; vorher npm run build)
//   BE_PART=1 (Krakenpilz, Stachelkugler, Tintling, Riesenhase) | 2 (Laufbombe, Türme, Topfpflanze, Kampfräume, Bestand, Modelle,
//   Bilder Gegnerzoo) | 3 (Boss-Marathon 0-36, Bilder) – ohne: alle Teile nacheinander (besser einzeln, je < 10 min).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4925;
const PART = process.env.BE_PART ?? 'all';
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
    L.onEnemyDefeated = (e) => { prevDef?.(e); L.defeatedLog.push(e.spec?.id ?? e.kind); };
    L.signalLog = [];
    L.onSignal('*', (data, name) => L.signalLog.push({ name, data: data && typeof data === 'object' ? { ...data, source: undefined } : data }));
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
          if (!o.free && (p.mode === 'air' || p.mode === 'swim') && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && (p.mode === 'air' || p.mode === 'swim') && p.vel.y > 4) { bounced = true; break; }
          if (p.mode === 'ground') { landed = true; break; }
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
      /** Bis Bedingung f() (höchstens n Schritte), Figur festgehalten (pos) und unverwundbar. */
      until(f, n, pos = null) { const p = P(); p.hurt = () => false; let i = 0; for (; i < n && !f(); i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); } delete p.hurt; return i; },
      model: (e) => e?.model?.root?.userData?.modelName ?? e?.model?.root?.name ?? null,
      r2: (v) => +(+v).toFixed(2),
      sig: (name) => L.signalLog.filter((s) => s.name === name),
      sichel(e) {
        const p = P();
        const s = { kind: 'wurfsichel', sichel: true, owner: p, pos: { x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z }, vel: { x: 0, y: 0, z: -14 } };
        if (typeof e.onSichelHit === 'function') { e.onSichelHit(s); return true; }
        if (e.enemy && e.touch !== false && !e.defeated) { e.onHit('throw', s); return true; }
        return false;
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
await load('0-35');
console.log('Bonus-Gegnerzoo 0-35');
{
  const st0 = await sc(() => {
    const c = window.__course, t = window.__t;
    const kinds = {};
    for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    const models = {};
    for (const id of ['kp1', 'sk_hang', 'tl1', 'riesenhase', 'lb1', 'turm30', 'fels']) {
      const e = t.ent(id);
      models[id] = e?.model ? (e.model.placeholder ? 'PLATZHALTER' : t.model(e)) : null;
    }
    return { kinds, n: c.level.entities.length, models };
  });
  console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
  console.log(`  Modelle: ${JSON.stringify(st0.models)}`);
  const NEED = ['krakenpilz', 'stachelkugler', 'tintling', 'bunny', 'kickbombe', 'felsblock', 'pilzlingsturm', 'feuer_werfer', 'topfpflanze', 'wuschel', 'kampfraum',
    'rammbock_bulle', 'schneesaeule', 'flatterkaefer', 'brummer', 'muenzmarder', 'funkenflaemmchen', 'zauberkroete', 'rankenschnapper', 'glotzfisch', 'kreisgeist_kreis', 'grossrollpilz', 'hackbeil_pilz'];
  check(`Alle Arten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
  const M = st0.models;
  check(`Modelle angebunden (kein Platzhalter): ${Object.values(M).join(', ')}`, Object.values(M).every((m) => m && m !== 'PLATZHALTER')
    && /krakenpilz/.test(M.kp1) && /stachelkugler/.test(M.sk_hang) && /tintling/.test(M.tl1) && /laufbombe/.test(M.lb1) && /pilzlingsturm/.test(M.turm30));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
  const smoke = await sc(() => { const c = window.__course; const t0 = performance.now(); for (let i = 0; i < 1200; i++) c.step(1); return { n: c.level.entities.length, ms: +((performance.now() - t0) / 1200).toFixed(3) }; });
  KPI.zooStep = smoke.ms;
  check(`10 s Simulation ohne Fehler (${smoke.n} Entitäten, ${smoke.ms} ms je Schritt)`, errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 1: Krakenpilz, Stachelkugler, Tintling, Riesenhase
// =====================================================================================================================
if (want(1)) {
await load('0-35');
console.log('Teil 1: Krakenpilz, Stachelkugler, Tintling, Riesenhase');

// ---- Krakenpilz: hüpft und spuckt Steinchen im Bogen
const kp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const k = t.ent('kp1');
  const fig = [-14, 1, t.Z(1, 1.5)];
  t.place(fig, { settle: 1 });
  const hops0 = k.hops;
  t.until(() => k.spits >= 1 && k.stones.length >= 1, 120 * 6, fig);
  const st = k.stones[0];
  out.spit = { spits: k.spits, state: k.state, stone: !!st, model: t.model(st) };
  let apex = -9, end = null, broke = false;
  const y0 = st?.pos.y ?? 0;
  t.until(() => {
    if (!st) return true;
    apex = Math.max(apex, st.pos.y - y0);
    if (st.state === 'break' || st.removed) { broke = true; end = [st.pos.x, st.pos.y, st.pos.z]; return true; }
    return false;
  }, 120 * 4, fig);
  out.stone = { apex: t.r2(apex), dist: end ? t.r2(Math.hypot(end[0] - fig[0], end[2] - fig[2])) : null, broke };
  // Steinchen ohne Figur im Weg: hüpft einmal auf und zerbröselt
  const s1 = L.spawn('krakenpilz_stein', { pos: [-6, 3, t.Z(1, 12)], vel: [-3, 4, 0] });
  let land = null;
  for (let i = 0; i < 120 * 3 && !(s1.state === 'break' || s1.removed); i++) { c.step(1); if (s1.bounces >= 1 && !land) land = t.r2(s1.pos.y); }
  out.bounce = { bounces: s1.bounces, land, broke: s1.state === 'break' || s1.removed };
  // hüpft zwischendurch
  t.until(() => k.hops > hops0 + 1, 120 * 8, [-14, 1, t.Z(1, -6)]);
  out.hops = k.hops - hops0;
  // Steinchen verletzt die Figur
  t.place([-11.5, 1, t.Z(1, 2)], { settle: 10 });
  t.fresh();
  const s2 = L.spawn('krakenpilz_stein', { pos: [p.pos.x, p.pos.y + 2.4, p.pos.z], vel: [0, 0, 0] });
  let hurt = false;
  for (let i = 0; i < 120 && !hurt; i++) { c.step(1); if (t.hurt()) hurt = true; }
  out.stoneHurt = { hurt, broke: s2.state === 'break' || s2.removed };
  t.fresh();
  // seitlich verletzt, von oben besiegt
  out.side = t.touch(k, 30, 1);
  t.fresh();
  const k2 = t.ent('kp2');
  const r = t.stomp(k2);
  out.stomp = { ...r, state: k2.state, defeated: k2.defeated };
  t.fresh();
  return out;
});
console.log(`  Krakenpilz: ${JSON.stringify(kp)}`);
check(`Krakenpilz spuckt ein Steinchen (Modell ${kp.spit.model}) im Bogen (Scheitel ${kp.stone.apex} m) auf die Figur (endet ${kp.stone.dist} m neben ihr); frei hüpft es einmal auf und zerbröselt`,
  kp.spit.spits >= 1 && /krakenpilz_stein/.test(kp.spit.model) && kp.stone.apex > 0.4 && kp.stone.dist !== null && kp.stone.dist < 2.5 && kp.stone.broke
  && kp.bounce.bounces === 1 && kp.bounce.land !== null && kp.bounce.broke);
check(`Krakenpilz hüpft (${kp.hops} Hüpfer), Steinchen verletzt die Figur`, kp.hops >= 1 && kp.stoneHurt.hurt && kp.stoneHurt.broke);
check('Krakenpilz: seitliche Berührung verletzt, von oben besiegt (platt, Abprall)', kp.side && kp.stomp.bounced && !kp.stomp.hurt && kp.stomp.defeated && kp.stomp.state === 'squashed');

// ---- Krakenpilz: gleitender Block, Patrouille, Jagd, Angriffe
const kp2 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const g = t.ent('gleiter'), k = t.ent('kp_gleit');
  t.place([0, 1, t.Z(1, -4)], { settle: 1 });
  let xmin = 99, xmax = -99, off = 0, ymin = 99, hops0 = k.hops, onBlock = 0, n = 0;
  for (let i = 0; i < 120 * 12; i++) {
    p.pos.set(0, 1, t.Z(1, -4)); p.vel.set(0, 0, 0);
    c.step(1);
    const s = g.shape, bx = (s.min[0] + s.max[0]) / 2;
    xmin = Math.min(xmin, k.pos.x); xmax = Math.max(xmax, k.pos.x);
    if (k.grounded) { n++; off = Math.max(off, Math.abs(k.pos.x - bx)); if (k.ground === s) onBlock++; ymin = Math.min(ymin, k.pos.y); }
  }
  out.gleit = { range: t.r2(xmax - xmin), off: t.r2(off), ymin: t.r2(ymin), hops: k.hops - hops0, onBlock, n, defeated: k.defeated };
  // Patrouille
  const kpp = t.ent('kp_patrol');
  t.place([0, 1, t.Z(2, -4)], { settle: 1 });
  let pmin = 99, pmax = -99;
  t.until(() => { pmin = Math.min(pmin, kpp.pos.x); pmax = Math.max(pmax, kpp.pos.x); return false; }, 120 * 10, [0, 1, t.Z(2, -4)]);
  out.patrol = { range: t.r2(pmax - pmin), min: t.r2(pmin), max: t.r2(pmax) };
  // Jagd: hüpft auf die Figur zu
  const kc = t.ent('kp_chase');
  const fig = [-11.5, 1, t.Z(2, 2)];
  t.place(fig, { settle: 1 });
  const d0 = Math.hypot(kc.pos.x - fig[0], kc.pos.z - fig[2]);
  t.until(() => false, 120 * 5, fig);
  out.chase = { d0: t.r2(d0), d1: t.r2(Math.hypot(kc.pos.x - fig[0], kc.pos.z - fig[2])) };
  // Angriffe: Feuer, Wurfsichel
  kpp.onHit('fire', p);
  t.sichel(kc);
  c.step(2);
  out.attacks = { fire: kpp.defeated && kpp.state === 'flipped', sichel: kc.defeated };
  return out;
});
console.log(`  Krakenpilz Block/Bahn: ${JSON.stringify(kp2)}`);
check(`Krakenpilz fährt auf dem gleitenden Block mit (${kp2.gleit.range} m, höchstens ${kp2.gleit.off} m neben der Blockmitte, ${kp2.gleit.hops} Hüpfer, bleibt oben)`,
  kp2.gleit.range > 5 && kp2.gleit.off < 1.2 && kp2.gleit.ymin > 1.9 && !kp2.gleit.defeated && kp2.gleit.onBlock > kp2.gleit.n * 0.9);
check(`Krakenpilz patrouilliert (${kp2.patrol.range} m) und hüpft auf die Figur zu (${kp2.chase.d0} → ${kp2.chase.d1} m)`, kp2.patrol.range > 4 && kp2.chase.d1 < kp2.chase.d0 - 2);
check('Krakenpilz: Feuer und Wurfsichel besiegen ihn', kp2.attacks.fire && kp2.attacks.sichel);

// ---- Stachelkugler
const sk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // frisch oben an den Hang setzen (der Level-Stachelkugler rollt seit dem Laden)
  t.ent('sk_hang').kill();
  const s = L.spawn('stachelkugler', { id: 'sk_hang2', pos: [11.5, 4, t.Z(2, 12.4)], dir: [0, 1], wake: 40 });
  t.place([0, 1, t.Z(2, -4)], { settle: 1 });
  let vmax = 0, down = false, zmax = -999, turns0 = s.turns;
  t.until(() => { vmax = Math.max(vmax, s.speedNow); if (s.downhill) down = true; zmax = Math.max(zmax, s.pos.z); return false; }, 120 * 9, [0, 1, t.Z(2, -4)]);
  out.hang = { vmax: t.r2(vmax), downhill: down, zmax: t.r2(zmax), turns: s.turns - turns0, speedEnd: t.r2(s.speedNow), alive: !s.defeated };
  // Pendel
  const sp = t.ent('sk_pendel');
  let xmin = 99, xmax = -99;
  const tp0 = sp.turns;
  t.until(() => { xmin = Math.min(xmin, sp.pos.x); xmax = Math.max(xmax, sp.pos.x); return false; }, 120 * 9, [0, 1, t.Z(3, -4)]);
  out.pendel = { min: t.r2(xmin), max: t.r2(xmax), turns: sp.turns - tp0 };
  // Bahn (Runde)
  const sb = t.ent('sk_bahn');
  const corners = sb.path.map(() => false);
  t.until(() => { sb.path.forEach((q, i) => { if (Math.hypot(q.x - sb.pos.x, q.z - sb.pos.z) < 0.8) corners[i] = true; }); return corners.every(Boolean); }, 120 * 25, [0, 1, t.Z(3, -4)]);
  out.bahn = corners;
  // nicht von oben besiegbar: Draufspringen und Stampfen verletzen
  t.fresh();
  const r1 = t.stomp(sp, { h: 1.0 });
  out.stomp = { ...r1, defeated: sp.defeated };
  t.fresh();
  const r2 = t.stomp(sp, { h: 1.6, pound: true });
  out.pound = { ...r2, defeated: sp.defeated };
  t.fresh();
  out.side = t.touch(sb, 30, 1);
  t.fresh();
  sp.onHit('pound', p);
  out.poundWave = sp.defeated;
  // Power-ups/Wurfsichel/Kanone
  t.sichel(sp);
  sb.onHit('fire', p);
  s.onHit('cannon', p);
  c.step(100);
  out.kill = { sichel: sp.defeated, fire: sb.defeated, cannon: s.defeated, gone: [sp, sb, s].every((e) => e.removed) };
  return out;
});
console.log(`  Stachelkugler: ${JSON.stringify(sk)}`);
check(`Stachelkugler rollt den Hang hinab (bis ${sk.hang.vmax} m/s, hangab), rollt unten weiter (z bis ${sk.hang.zmax}) und prallt ab (${sk.hang.turns}×)`,
  sk.hang.downhill && sk.hang.vmax > 4 && sk.hang.zmax > -33 && sk.hang.turns >= 1 && sk.hang.alive);
check(`Stachelkugler pendelt (x ${sk.pendel.min} … ${sk.pendel.max}, ${sk.pendel.turns} Wenden) und rollt seine Runde (${sk.bahn.filter(Boolean).length}/4 Ecken)`,
  sk.pendel.max - sk.pendel.min > 6 && sk.pendel.turns >= 2 && sk.bahn.every(Boolean));
check('Stachelkugler: nicht von oben besiegbar (Draufspringen und Stampfen verletzen), seitlich verletzt, Stampfwelle wirkungslos',
  sk.stomp.hurt && !sk.stomp.defeated && sk.pound.hurt && !sk.pound.defeated && sk.side && !sk.poundWave);
check('Stachelkugler: Wurfsichel, Feuer, Kanonenkugel besiegen ihn (verpufft)', sk.kill.sichel && sk.kill.fire && sk.kill.cannon && sk.kill.gone);

// ---- Tintling
const tl = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('tl1');
  out.idle = a.state;
  const top = L.waterAt(a.pos.x, a.pos.y + 0.5, a.pos.z)?.top ?? null;
  const fig = [-8.5, -1.3, t.Z(4, 7)];
  t.place(fig, { settle: 1 });
  const d0 = Math.hypot(a.pos.x - fig[0], a.pos.z - fig[2]);
  const sides = new Set();
  let dmin = 99, ymax = -99, strokes0 = a.strokes, retreats0 = a.retreats, seenRetreat = false, inWater = true;
  t.until(() => {
    if (a.strokes > strokes0) sides.add(a.side);
    dmin = Math.min(dmin, Math.hypot(a.pos.x - fig[0], a.pos.z - fig[2]));
    ymax = Math.max(ymax, a.pos.y + a.half.y * 2);
    if (a.state === 'retreat') seenRetreat = true;
    if (!a.inWater) inWater = false;
    return false;
  }, 120 * 7, fig);
  out.chase = { top, d0: t.r2(d0), dmin: t.r2(dmin), strokes: a.strokes - strokes0, sides: [...sides], retreats: a.retreats - retreats0, seenRetreat, ymax: t.r2(ymax), inWater };
  // Kontakt verletzt
  t.fresh();
  p.mode = 'swim';
  out.touch = t.touch(a, 30, 1);
  t.fresh();
  // von oben (schwimmend herab) besiegt
  const b = t.ent('tl2');
  // die Figur schwimmt über ihm und sinkt auf ihn herab (er steigt ihr entgegen)
  const above = [b.pos.x, b.pos.y + b.half.y * 2 + 0.05, b.pos.z];
  t.place(above, { settle: 0 });
  let stomped = false, hurt2 = false;
  for (let i = 0; i < 120 && !b.defeated; i++) {
    p.pos.set(b.pos.x, Math.max(b.pos.y + b.half.y * 2 - 0.1, p.pos.y), b.pos.z); p.vel.set(0, -0.4, 0);
    b.pos.y += 0.01;
    c.step(1);
    if (t.hurt()) hurt2 = true;
  }
  stomped = b.defeated;
  out.stomp = { defeated: stomped, hurt: hurt2, mode: p.mode };
  t.fresh();
  // Kanonenkugel besiegt
  a.onHit('cannon', p);
  c.step(2);
  out.cannon = a.defeated;
  // Strömung treibt den Tintling am Platz (x +)
  const s = t.ent('tl_strom');
  const x0 = s.home.x;
  t.place([0, 1, t.Z(4, -6)], { settle: 1 });
  t.until(() => false, 120 * 3, [0, 1, t.Z(4, -6)]);
  out.strom = { dx: t.r2(s.pos.x - x0), state: s.state };
  return out;
});
console.log(`  Tintling: ${JSON.stringify(tl)}`);
check(`Tintling schwimmt in Stößen im Zickzack auf die Figur zu (${tl.chase.strokes} Stöße, Seiten ${tl.chase.sides.join('/')}, ${tl.chase.d0} → ${tl.chase.dmin} m) und weicht zurück (${tl.chase.retreats}×)`,
  tl.idle === 'idle' && tl.chase.strokes >= 3 && tl.chase.sides.length === 2 && tl.chase.dmin < tl.chase.d0 - 2 && tl.chase.retreats >= 1 && tl.chase.seenRetreat);
check(`Tintling bleibt im Wasser (Mantelspitze bis ${tl.chase.ymax} m, Oberfläche ${tl.chase.top})`, tl.chase.inWater && tl.chase.top !== null && tl.chase.ymax <= tl.chase.top - 0.25);
check('Tintling: Kontakt verletzt, von oben besiegt, Kanonenkugel besiegt', tl.touch && tl.stomp.defeated && !tl.stomp.hurt && tl.cannon);
check(`Tintling: Strömung treibt ihn (${tl.strom.dx} m)`, tl.strom.dx > 0.2);

// ---- Riesenhase
const rh = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const h = t.ent('riesenhase');
  out.giant = { giant: h.giant, scale: h.baseScale, half: t.r2(h.half.x), speed: h.speed };
  // Pulver-ups zählen, die beim Fangen erscheinen
  const spawned = [];
  const sp0 = L.spawn.bind(L);
  L.spawn = (kind, spec) => { const e = sp0(kind, spec); if (kind === 'powerup' || kind === 'coin') spawned.push(kind); return e; };
  // gehend verfolgt: er flieht, bleibt in seinem Bereich und verschnauft nach einer Weile
  t.place([0, 1, -280], { settle: 1 });
  p.hurt = () => false;
  const run = (n, fast) => {
    for (let i = 0; i < n; i++) {
      const dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
      // Eingabe relativ zur Kamera (Blick nach −Z): y = vorwärts (−Z), x = rechts (+X)
      c.setInput({ x: dx / d, y: -dz / d, run: fast });
      c.step(1);
      if (h.state === 'flee') flee = true;
      if (!h.inside(h.pos.x, h.pos.z, -0.6)) inArea = false;
      if (h.state === 'caught') return true;
      if (!fast && h.state === 'rest') return false;
    }
    return false;
  };
  let flee = false, inArea = true;
  const caughtWalking = run(120 * 8, false);
  out.walk = { flee, rests: h.rests, state: h.state, caught: caughtWalking };
  // kommt die Figur ihm (fliehend) nahe, schlägt er einen Haken
  const hooks0 = h.hooks;
  c.setInput({});
  { const hold = [p.pos.x, p.pos.y, p.pos.z]; t.until(() => h.state === 'flee' && h.grounded && h.dodgeCool <= 0, 120 * 4, hold); }
  { const fx = h.pos.x - h.dir.x * 3.2, fz = h.pos.z - h.dir.z * 3.2; p.pos.set(fx, h.pos.y, fz); p.vel.set(0, 0, 0); }
  out.dodge = { before: [h.state, h.grounded, t.r2(h.dodgeCool), t.r2(t.dist(h, p))] };
  run(40, true);
  out.dodge.after = [h.state, h.hooks - hooks0];
  // rennend wird er eingeholt (spätestens beim Verschnaufen)
  const caught = run(120 * 12, true);
  c.setInput({});
  c.step(30);
  delete p.hurt;
  L.spawn = sp0;
  out.flee = { flee, hooks: h.hooks - hooks0, inArea };
  out.caught = { caught, state: h.state, star: L.entities.some((e) => e.kind === 'star' && e.index === 0 && !e.removed) || L.runtime.stars[0],
    powerups: spawned.filter((k) => k === 'powerup').length, coins: spawned.filter((k) => k === 'coin').length, signal: t.sig('riesenhase').length };
  // kleiner und großer Hase wie bisher
  const k = t.ent('hase_klein'), g = t.ent('hase_gross');
  k.catchMe(); g.catchMe();
  c.step(2);
  const pw = L.entities.filter((e) => e.kind === 'powerup').map((e) => e.power ?? e.spec?.power);
  out.small = { k: k.state, g: g.state, giant: [k.giant, g.giant], scale: [k.baseScale, g.baseScale], powers: pw };
  return out;
});
console.log(`  Riesenhase: ${JSON.stringify(rh)}`);
check(`Riesenhase: groß (× ${rh.giant.scale}), flink (${rh.giant.speed} m/s), flieht vor der gehenden Figur und verschnauft (${rh.walk.rests}×), bleibt in seinem Bereich`,
  rh.giant.giant && rh.giant.scale === 4 && rh.walk.flee && rh.walk.rests >= 1 && !rh.walk.caught && rh.flee.inArea);
check(`Riesenhase schlägt Haken (${rh.flee.hooks}×), rennend gefangen: Stern und Items (${rh.caught.powerups} Power-ups, ${rh.caught.coins} Münzen, Signal)`,
  rh.flee.hooks >= 1 && rh.caught.caught && rh.caught.state === 'caught' && rh.caught.star && rh.caught.powerups >= 3 && rh.caught.coins >= 5 && rh.caught.signal === 1);
check('Kleiner und großer Hase unverändert (Größe, Belohnung 1-Up bzw. Riesentrank)', rh.small.k === 'caught' && rh.small.g === 'caught' && !rh.small.giant[0] && !rh.small.giant[1]
  && rh.small.scale[0] === 1 && rh.small.scale[1] === 2.2);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
}

// =====================================================================================================================
// Teil 2: Laufbombe, Türme, Topfpflanze, Kampfräume, Bestand, Modelle, Bilder Gegnerzoo
// =====================================================================================================================
if (want(2)) {
await load('0-35');
console.log('Teil 2: Laufbombe, Pilzlingstürme, Topfpflanze, Kampfräume, Bestand, Modelle');

// ---- Laufbombe
const lb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('lb1'), b = t.ent('lb2'), f = t.ent('fels');
  // Nähe zündet (trigger 2,2), trigger 0 nicht
  t.place([a.pos.x + 1.6, 1, a.pos.z + 0.6], { settle: 0 });
  t.until(() => a.lit, 30, [a.pos.x + 1.6, 1, a.pos.z + 0.6]);
  out.near = { lit: a.lit, state: a.state, trigger: a.trigger, model: t.model(a) };
  t.place([b.pos.x - 1.4, 1, b.pos.z + 0.4], { settle: 0 });
  t.until(() => false, 40, [b.pos.x - 1.4, 1, b.pos.z + 0.4]);
  out.far = { lit: b.lit, trigger: b.trigger };
  // erste Bombe explodiert (weg von der Figur); Signal laufbombe
  t.until(() => a.exploded, 120 * 5, [-16, 1, t.Z(6, 1)]);
  out.boom1 = { exploded: a.exploded, sig: t.sig('laufbombe').length };
  // tragen und werfen: zweite Bombe aufheben, zum Felsblock werfen → Felsblock gesprengt (Signale felsblock, laufbombe)
  t.fresh();
  t.place([f.pos.x, 1, f.pos.z + 3.4], { settle: 10 });
  p.hurt = () => false;
  b.pos.set(p.pos.x + 0.6, 1, p.pos.z);
  c.step(2);
  const picked = p.pickUp(b);
  c.step(10);
  out.carry = { picked, carried: b.state === 'carried' && b.carrier === p, lit: b.lit };
  t.face(f.pos.x, f.pos.z);
  p.throwHeld({});
  out.thrown = { state: b.state, kicker: b.kicker === p };
  for (let i = 0; i < 120 * 4 && !b.exploded; i++) c.step(1);
  c.step(20);
  delete p.hurt;
  out.fels = { broken: f.broken, by: f.by, sigFels: t.sig('felsblock').length, sigLb: t.sig('laufbombe').length, hits: t.sig('laufbombe').map((x) => x.data.hits) };
  return out;
});
console.log(`  Laufbombe: ${JSON.stringify(lb)}`);
check(`Laufbombe (Modell ${lb.near.model}) zündet bei Nähe (trigger ${lb.near.trigger} m), mit trigger 0 nicht`, /laufbombe/.test(lb.near.model) && lb.near.lit && lb.near.trigger === 2.2 && !lb.far.lit && lb.far.trigger === 0);
check('Laufbombe explodiert (Signal laufbombe), ist tragbar und werfbar', lb.boom1.exploded && lb.boom1.sig >= 1 && lb.carry.picked && lb.carry.carried && lb.carry.lit && lb.thrown.kicker);
check(`Geworfene Laufbombe sprengt den Felsblock (Signal felsblock, by ${lb.fels.by}; Treffer ${lb.fels.hits.join('/')})`, lb.fels.broken && lb.fels.by === 'bomb' && lb.fels.sigFels === 1 && lb.fels.sigLb >= 2);

// ---- Pilzlingsturm aus 30 und mit Feuer-Werfer
const tw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const T = t.ent('turm30');
  const inst = T.model?.root?.children?.find((o) => o.isInstancedMesh);
  out.t30 = { count: T.count, height: t.r2(T.height), half: t.r2(T.half.y), modelCount: inst?.count ?? null };
  t.fresh();
  // von oben: oberste Stufe weg
  const r = t.stomp(T, { h: 1.0, max: 200 });
  out.stomp = { ...r, count: T.count };
  t.fresh();
  c.step(40);
  T.onHit('fire', p); c.step(40);
  out.fire = T.count;
  T.onHit('cannon', p); c.step(2);
  out.cannon = { defeated: T.defeated, state: T.state };
  // Turm mit Feuer-Werfer obenauf
  const W = t.ent('turm_werfer'), R = W.rider;
  out.rider = { kind: R?.kind, id: R?.spec?.id };
  const top0 = W.pos.y + W.height, x0 = W.pos.x;
  let off = 0, dy = 0, n = 0;
  t.until(() => { if (R.grounded) { off = Math.max(off, Math.hypot(R.pos.x - W.pos.x, R.pos.z - W.pos.z)); dy = Math.max(dy, Math.abs(R.pos.y - (W.pos.y + W.height))); n++; } return false; }, 120 * 6, [-11.5, 1, t.Z(7, -2)]);
  out.ride = { moved: t.r2(Math.abs(W.pos.x - x0)), off: t.r2(off), dy: t.r2(dy), n, top0: t.r2(top0), throws: R.throws };
  W.onHit('fire', p); c.step(30);
  t.until(() => R.grounded && R.state !== 'jump', 120 * 4, [-11.5, 1, t.Z(7, -2)]);
  out.lower = { count: W.count, ry: t.r2(R.pos.y), top: t.r2(W.pos.y + W.height) };
  W.onHit('bomb', p);
  t.until(() => false, 120 * 2, [-11.5, 1, t.Z(7, -2)]);
  out.fall = { tower: W.defeated, riderY: t.r2(R.pos.y), riderAlive: !R.defeated && !R.removed };
  return out;
});
console.log(`  Pilzlingstürme: ${JSON.stringify(tw)}`);
check(`Pilzlingsturm aus 30 (Modell ${tw.t30.modelCount} Stufen, ${tw.t30.height} m hoch); von oben −1 (${tw.stomp.count}), Feuer −1 (${tw.fire}), Kanonenkugel wirft ihn um (topple)`,
  tw.t30.count === 30 && tw.t30.modelCount === 30 && tw.t30.height > 18 && tw.stomp.bounced && tw.stomp.count === 29 && tw.fire === 28 && tw.cannon.defeated);
check(`Feuer-Werfer reitet oben auf dem Turm (Turm ${tw.ride.moved} m gelaufen, Werfer höchstens ${tw.ride.off} m daneben, ${tw.ride.dy} m Höhenfehler, ${tw.ride.throws} Würfe)`,
  tw.rider.kind === 'feuer_werfer' && tw.ride.moved > 1 && tw.ride.off < 0.7 && tw.ride.dy < 0.35 && tw.ride.n > 100);
check(`Stufe weg → der Werfer sinkt mit (${tw.lower.ry} m ≈ ${tw.lower.top} m); Turm umgeworfen → er fällt herab (${tw.fall.riderY} m) und kämpft weiter`,
  tw.lower.count === 2 && Math.abs(tw.lower.ry - tw.lower.top) < 0.35 && tw.fall.tower && tw.fall.riderY < 1.5 && tw.fall.riderAlive);

// ---- Topfpflanze frisst Wuschel
const tp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const T = t.ent('topf'), w = t.ent('wu_topf');
  t.place([T.pos.x + 0.6, 1, T.pos.z + 0.8], { settle: 10 });
  out.picked = p.pickUp(T);
  p.hurt = () => false;
  for (let i = 0; i < 120 * 6 && !w.defeated; i++) {
    // Figur nahe der Kreismitte, Blick zum Wuschel
    const a = Math.atan2(w.pos.z - t.Z(7, 7), w.pos.x - 11.5);
    p.pos.set(11.5 + Math.cos(a) * 0.6, 1, t.Z(7, 7) + Math.sin(a) * 0.6); p.vel.set(0, 0, 0);
    t.face(w.pos.x, w.pos.z);
    c.step(1);
  }
  delete p.hurt;
  out.wuschel = { defeated: w.defeated, bitten: !!w.bitten, bites: T.bites };
  const w2 = t.ent('wu_bestand');
  w2.onHit('fire', p); w2.onHit('claw', p);
  out.other = { fireClaw: w2.defeated };
  p.throwHeld({ crouch: true });
  return out;
});
console.log(`  Topfpflanze/Wuschel: ${JSON.stringify(tp)}`);
check(`Topfpflanze frisst den Wuschel (${tp.wuschel.bites} Bisse); Feuer/Tatze prallen am Wuschel weiter ab`, tp.picked && tp.wuschel.defeated && tp.wuschel.bitten && !tp.other.fireClaw);

// ---- Kampfräume (P-Haus): alle Gegner eines Raums besiegt → Signal
const kr = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const ROOMS = { raum_bullen: 3, raum_saeulen: 3, raum_flieger: 2, raum_bumerang: 3, raum_marder: 1, raum_tuerme: 3, raum_funken: 3, raum_kroeten: 3, raum_ranken: 3, raum_hammer: 3 };
  p.hurt = () => false;
  for (const [id, want] of Object.entries(ROOMS)) {
    const R = t.ent(id);
    const A = R.area;
    const mid = [(A.min[0] + A.max[0]) / 2, 1, (A.min[2] + A.max[2]) / 2];
    p.pos.set(mid[0], 1.2, mid[2]); p.vel.set(0, 0, 0);
    c.step(2);
    const total = R.total, state0 = R.state, enemies = R.targets.every((e) => e.enemy === true);
    const kinds = [...new Set(R.targets.map((e) => e.kind))];
    // besiegen: Funkelstern-Treffer (Zauberkröten nur sichtbar) – Figur bleibt im Raum
    let steps = 0;
    for (; steps < 120 * 20 && R.state !== 'done'; steps++) {
      if (steps % 15 === 0) for (const e of R.targets) if (!e.defeated && !e.removed) e.onHit('star', p);
      p.pos.set(mid[0], 1.2, mid[2]); p.vel.set(0, 0, 0);
      c.step(1);
    }
    const sig = t.sig('kampfraumFrei').filter((x) => x.data.id === id);
    out[id] = { want, total, state0, enemies, kinds, state: R.state, t: t.r2(steps / 120), sig: sig.length, count: sig[0]?.data?.count ?? null, log: R.targets.filter((e) => L.defeatedLog.includes(e.spec?.id)).length };
  }
  delete p.hurt;
  return out;
});
console.log(`  Kampfräume: ${JSON.stringify(kr)}`);
for (const [id, r] of Object.entries(kr)) {
  check(`Kampfraum ${id}: ${r.total} Gegner (${r.kinds.join(', ')}) gezählt, alle besiegt nach ${r.t} s → Signal kampfraumFrei (${r.count}), jeder Sieg meldet onEnemyDefeated (${r.log}/${r.total})`,
    r.state0 === 'active' && r.total === r.want && r.enemies && r.state === 'done' && r.sig === 1 && r.count === r.want && r.log === r.total);
}

// ---- Bestand (geprüft, unverändert)
const bs = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const g = t.ent('glotz'), k = t.ent('kreis'), gr = t.ent('gross'), hb = t.ent('hackbeil'), w = t.ent('wu_bestand');
  const j0 = g.jumps;
  t.until(() => g.jumps > j0, 120 * 6, [-11.5, 1, t.Z(13, -1)]);
  out.glotz = { jumps: g.jumps - j0, model: t.model(g) };
  out.kreis = { alive: k.aliveCount ?? null };
  gr.onHit('mega', p);
  hb.onHit('star', p);
  t.fresh();
  out.wuschelStomp = t.stomp(w, { h: 1.0 });
  t.fresh();
  w.onHit('star', p);
  c.step(5);
  out.defeats = { gross: gr.defeated, hackbeil: hb.defeated, wuschel: w.defeated };
  return out;
});
console.log(`  Bestand: ${JSON.stringify(bs)}`);
check(`Bestand: Glotzfisch springt (${bs.glotz.jumps}), Kreisgeist-Ring (${bs.kreis.alive}), Großrollpilz (Riese), Hackbeil-Pilz (Stern), Wuschel (Stern; Draufspringen verletzt)`,
  bs.glotz.jumps >= 1 && bs.kreis.alive === 8 && bs.defeats.gross && bs.defeats.hackbeil && bs.defeats.wuschel && bs.wuschelStomp.hurt);

// ---- Modelle: alle Zustände, dispose()
const md = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level;
  const out = {};
  const STATES = {
    krakenpilz: ['idle', { anim: 'walk', speed: 2 }, { anim: 'hop', progress: 0.1 }, { anim: 'hop', progress: 0.5 }, { anim: 'hop', progress: 0.9 }, { anim: 'spit', progress: 0.3 }, { anim: 'spit', progress: 0.7 }, 'squashed', 'defeated', 'unbekannt'],
    krakenpilz_stein: [{ spin: 0 }, { spin: 2 }],
    tintling: [{ anim: 'swim', pulse: 0.1 }, { anim: 'swim', pulse: 0.6 }, 'idle', 'retreat', { anim: 'defeated', progress: 0.5 }, 'unbekannt'],
    stachelkugler: [{ anim: 'roll', roll: 1.2 }, { anim: 'roll', speed: 4 }, 'idle', { anim: 'defeated', progress: 0.5 }, 'unbekannt'],
    bossblitz_schluessel: ['idle', { anim: 'rise', progress: 0.5 }, { anim: 'collect', progress: 0.5 }],
  };
  for (const [kind, states] of Object.entries(STATES)) {
    const e = L.spawn(kind, { pos: [0, 1, -250], vel: [0, 0, 0], wake: 0 });
    const m = e.model, root = m?.root;
    let meshes = 0, tris = 0, err = null;
    root?.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) { meshes++; const g = o.geometry; tris += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3; } });
    try { for (const st of states) for (let i = 0; i < 6; i++) m.update(1 / 30, st); } catch (x) { err = String(x); }
    e.kill();
    c.step(1);
    out[kind] = { name: root?.userData?.modelName, meshes, tris: Math.round(tris), err, disposed: !!root && root.parent === null && !L.entities.includes(e) };
  }
  // Box-Schmuck (Modell des Boss-Marathons)
  const e = L.spawn('bossblitz_box', { pos: [4, 1, -250], icon: 'blase', locked: true, target: [0, 1, 0] });
  const root = e.model?.root;
  let err = null;
  try { for (const st of [{ box: 'idle', deco: { locked: 1, open: 0 } }, { box: 'suck', deco: { locked: 0, open: 0.5 } }, { box: 'idle', deco: { done: 1 } }, { deco: { glow: 1 } }]) for (let i = 0; i < 6; i++) e.model.update(1 / 30, st); } catch (x) { err = String(x); }
  e.kill(); c.step(1);
  out.bossblitz_box = { err, disposed: !!root && root.parent === null };
  return out;
});
console.log(`  Modelle: ${JSON.stringify(md)}`);
for (const [k, r] of Object.entries(md)) check(`Modell ${k}: alle Zustände ohne Fehler${r.meshes ? ` (${r.meshes} Teile, ${r.tris} Dreiecke)` : ''}, dispose() hängt es aus`, !r.err && r.disposed && (r.name === undefined || r.name === k) && (r.tris === undefined || r.tris < 12000));
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);

// ---- Bilder Gegnerzoo und Zeichenaufrufe
await load('0-35');
const S = {};
S.krakenpilz = await SHOT('be', 'krakenpilz_spuckt', () => {
  const c = window.__course, t = window.__t, k = t.ent('kp1');
  const fig = [-12, 1, t.Z(1, 1.5)];
  t.place(fig, { settle: 1 });
  t.until(() => k.stones.some((s) => s.state === 'fly' && s.age > 0.35), 120 * 8, fig);
  t.face(k.pos.x, k.pos.z);
});
S.gleit = await SHOT('be', 'krakenpilz_gleitblock', () => {
  const c = window.__course, t = window.__t, k = t.ent('kp_gleit');
  const fig = [11.5, 1, t.Z(1, 1)];
  t.place(fig, { settle: 1 });
  t.until(() => k.state === 'air' && k.stateT > 0.12, 120 * 6, fig);
  t.face(11.5, t.Z(1, 9));
});
S.stachel = await SHOT('be', 'stachelkugler_hang', () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.ent('sk_hang').kill();
  const s = L.spawn('stachelkugler', { id: 'sk_bild', pos: [11.5, 4, t.Z(2, 12.4)], dir: [0, 1], wake: 40 });
  const fig = [8, 1, t.Z(2, 1.5)];
  t.place(fig, { settle: 1 });
  t.until(() => s.downhill && s.speedNow > 5, 120 * 4, fig);
  t.face(11.5, t.Z(2, 8));
});
S.tintling = await SHOT('be', 'tintling_zickzack', () => {
  const c = window.__course, t = window.__t, a = t.ent('tl1');
  const fig = [-8.5, -1.3, t.Z(4, 5)];
  t.place(fig, { settle: 1 });
  t.until(() => a.strokes >= 2 && a.state === 'chase' && a.clock > 0.5, 120 * 6, fig);
  t.face(a.pos.x, a.pos.z);
});
S.hase = await SHOT('be', 'riesenhase', () => {
  const c = window.__course, t = window.__t, h = t.ent('riesenhase');
  const fig = [0, 1, -278];
  t.place(fig, { settle: 1 });
  t.until(() => h.state === 'flee' && h.flightT > 0.6, 120 * 4, fig);
  t.face(h.pos.x, h.pos.z);
});
S.lauf = await SHOT('be', 'laufbomben_felsblock', () => {
  const c = window.__course, t = window.__t, a = t.ent('lb1');
  const fig = [-11.5, 1, t.Z(6, 1)];
  t.place(fig, { settle: 1 });
  a.light();
  t.until(() => false, 60, fig);
  t.face(-11.5, t.Z(6, 9));
});
S.turm = await SHOT('be', 'pilzlingsturm_30', () => {
  const c = window.__course, t = window.__t;
  const fig = [11.5, 1, t.Z(6, -9)];
  t.place(fig, { settle: 60 });
  t.face(11.5, t.Z(6, 9));
});
S.werfer = await SHOT('be', 'turm_mit_feuer_werfer', () => {
  const c = window.__course, t = window.__t, W = t.ent('turm_werfer');
  const fig = [-11.5, 1, t.Z(7, 1)];
  t.place(fig, { settle: 120 });
  t.face(W.pos.x, W.pos.z);
});
S.topf = await SHOT('be', 'topfpflanze_wuschel', () => {
  const c = window.__course, t = window.__t;
  const fig = [11.5, 1, t.Z(7, 2.5)];
  t.place(fig, { settle: 60 });
  t.face(11.5, t.Z(7, 7));
});
S.raeume = await SHOT('be', 'kampfraeume', () => {
  const c = window.__course, t = window.__t;
  const fig = [0, 1, t.Z(8, 1)];
  t.place(fig, { settle: 120 });
  t.face(0, t.Z(8, 9));
});
const zmax = Math.max(...Object.values(S).map((x) => x.calls));
KPI.zoo = { calls: zmax, tris: Math.round(Math.max(...Object.values(S).map((x) => x.triangles)) / 1000) };
console.log(`  Zeichenaufrufe Gegnerzoo: ${Object.entries(S).map(([k, x]) => `${k} ${x.calls}`).join(', ')}; höchstens ${KPI.zoo.tris} k Dreiecke`);
check(`Gegnerzoo: Zeichenaufrufe < 120 (höchstens ${zmax}), Dreiecke < 300 k (${KPI.zoo.tris} k)`, zmax < 120 && KPI.zoo.tris < 300);
check('Keine Konsolenfehler (Teil 2, Bilder)', errors.length === 0);
}

// =====================================================================================================================
// Teil 3: Boss-Marathon B-12 (Probe 0-36)
// =====================================================================================================================
const BLITZ_HELPERS = () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.arch = () => c.state().archetype;
  t.hub = () => t.ent('hub');
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._be) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._be = true; }
  /** Durch eine (Warp-)Box: oben auflanden, bis die Figur am Ziel wieder steuerbar ist → Lage. */
  t.viaBox = (box) => {
    const p = c.player;
    t.place([box.pos.x, box.pos.y + 1.9, box.pos.z], { settle: 0 });
    let seen = false, i = 0;
    for (; i < 900; i++) { c.step(1); if (p.mode === 'script') seen = true; else if (seen) break; }
    c.step(20);
    return { seen, steps: i, pos: [t.r2(p.pos.x), t.r2(p.pos.y), t.r2(p.pos.z)] };
  };
  /** In den Kampf: von der Ankunft vorwärts (−Z) gehen, bis der Archetyp den Kampf mit id beginnt. */
  t.engage = (id) => {
    const p = c.player;
    for (let i = 0; i < 900 && !(c.arch.started && c.arch.boss === t.ent(id)); i++) { c.setInput({ y: 0.7 }); c.step(1); }
    c.setInput({});
    return { started: c.arch.started, active: c.arch.cfg?.id, pos: [t.r2(p.pos.x), t.r2(p.pos.z)] };
  };
  /** Bis f() (Figur unverwundbar an pos). */
  t.wait = (f, n, pos) => t.until(f, n, pos);
  /** Schlüssel einsammeln, durch die Rück-Warp-Box in den Hub. */
  t.keyAndBack = (boss) => {
    const p = c.player, H = t.hub();
    const f = H.fights.find((x) => x.boss === boss);
    t.wait(() => f.key && f.key.state === 'idle', 120 * 8, null);
    const key = f.key;
    const out = { key: !!key, keyModel: t.model(key) };
    if (key) { t.place([key.pos.x, key.pos.y, key.pos.z], { settle: 5 }); c.step(80); }
    out.keyGot = f.keyGot;
    out.retBox = !!f.retBox && !f.retBox.hidden;
    if (f.retBox) out.via = t.viaBox(f.retBox);
    c.step(30);
    out.done = f.done;
    out.boxDone = f.box?.done;
    out.inHub = H.inHub();
    out.keys = H.keys;
    out.checkpoint = L.runtime.checkpoint?.pos?.map(t.r2);
    return out;
  };
  /** Figur sterben lassen und am Checkpoint neu beginnen (wie der Motor). */
  t.die = () => {
    const p = c.player;
    delete p.hurt;
    p.invuln = 0;
    p.die('hit');
    for (let i = 0; i < 120 * 6 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
    c.step(30);
    return { dead: p.dead, status: L.runtime.status, deaths: c.arch?.deaths, pos: [t.r2(p.pos.x), t.r2(p.pos.y), t.r2(p.pos.z)] };
  };
  /** Stern einsammeln (falls er liegt). */
  t.takeStar = (index) => {
    const st = L.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
    if (st) { t.place([st.pos.x, st.pos.y, st.pos.z], { settle: 20 }); }
    return !!L.runtime.stars[index];
  };
};

if (want(3)) {
await load('0-36');
await sc(BLITZ_HELPERS);
console.log('Teil 3: Boss-Marathon B-12 (0-36)');

// ---- Hub
const hb = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, H = t.hub();
  c.step(30);
  const boxes = L.entities.filter((e) => e.kind === 'bossblitz_box');
  return {
    boxes: boxes.length, locked: boxes.filter((b) => b.locked).map((b) => b.spec.id), models: boxes.map((b) => t.model(b) ?? (b.model ? 'gruppe' : null)),
    keys: H.keys, need: H.need, hud: L._keyHud?.state?.() ?? null, auras: H.auras.length, time: t.r2(L.runtime.timeLeft), limit: L.runtime.timeLimit,
    theme: L.data.theme, music: L.data.music, active: c.arch?.cfg?.id, bosses: L.data.bosses.length,
  };
});
console.log(`  Hub: ${JSON.stringify(hb)}`);
check(`Hub: 6 Warp-Boxen (verschlossen: ${hb.locked.join(', ')}), Schlüssel ${hb.keys}/${hb.need} im HUD, Sternenstaub an ${hb.auras} Endgegnern, ${hb.limit} s für alles`,
  hb.boxes === 6 && hb.locked.length === 1 && hb.locked[0] === 'hub_blase' && hb.keys === 0 && hb.need === 5 && hb.hud?.text === 'Schlüssel 0/5' && hb.auras === 7 && hb.limit === 500 && hb.bosses === 6);

// ---- Kampf 1: Kippquader-König (Zeit läuft im Hub weiter, Checkpoint am Eingang)
const k1 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level, H = t.hub();
  const out = {};
  const box = t.ent('hub_kq'), b = t.ent('kq');
  c.step(120 * 3);
  const time0 = L.runtime.timeLeft, sim0 = L.time;
  out.via = t.viaBox(box);
  out.time = { before: t.r2(time0), after: t.r2(L.runtime.timeLeft), elapsed: t.r2(L.time - sim0) };
  out.checkpoint = L.runtime.checkpoint?.pos?.map(t.r2);
  out.engage = t.engage('kq');
  out.hud = t.arch().hud?.boss ?? null;
  // drei Sprünge auf das Schwachpunkt-Feld
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.wait(() => b.state === 'lie' && b.stateT > 0.2, 120 * 30, [-80, 2, 48.6]);
    const f = b.backField();
    t.place([f.x, f.y + 1.6, f.z], { settle: 0 });
    t.fresh();
    const hp0 = b.hp;
    for (let i = 0; i < 240; i++) { c.step(1); if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = f.x; p.pos.z = f.z; } if (b.hp < hp0 || p.mode === 'ground') break; }
    hits.push(b.hp);
    p.pos.set(-80, 2, 48.6);
  }
  out.hits = hits;
  t.wait(() => b.state === 'gone', 120 * 8, [-80, 2, 48.6]);
  out.gone = { state: b.state, won: t.arch().won, corners: ['kq_ecke_vl', 'kq_ecke_hl'].map((id) => t.ent(id).state) };
  out.back = t.keyAndBack('kq');
  return out;
});
console.log(`  Kippquader-König: ${JSON.stringify(k1)}`);
check(`Warp-Box „Kippquader-König“ führt in den Arena-Raum (${k1.via.pos.join(', ')}); Checkpoint am Eingang; die Zeit läuft weiter (${k1.time.before} → ${k1.time.after} s)`,
  k1.via.seen && Math.abs(k1.via.pos[0] + 80) < 1.5 && Math.abs(k1.via.pos[2] - 48.6) < 1.5 && k1.checkpoint?.[2] === 48.6 && k1.time.after < k1.time.before - 0.5 && Math.abs(k1.time.before - k1.time.after - k1.time.elapsed) < 0.2);
check(`Kampf 1: Kippquader-König (Nacht-Weltraum-Raum) – Kampf beginnt (${k1.engage.active}), 3 Treffer (${k1.hits.join(' → ')}), Ecken brechen, Sieg`,
  k1.engage.started && k1.engage.active === 'kq' && k1.hits.join(',') === '2,1,0' && k1.gone.state === 'gone' && k1.gone.won && k1.gone.corners.every((s) => s !== 'solid'));
check(`Schlüssel (${k1.back.keyModel}) steigt auf und wird eingesammelt (${k1.back.keys}/5) → Rück-Warp-Box → zurück aus der Box im Hub, Box erledigt, Checkpoint im Hub`,
  k1.back.key && /bossblitz_schluessel/.test(k1.back.keyModel) && k1.back.keyGot && k1.back.retBox && k1.back.via.seen && k1.back.inHub && k1.back.done && k1.back.boxDone && k1.back.keys === 1 && k1.back.checkpoint?.[2] === 8.5);

// ---- Kampf 2: Schattenläuferin
const k2 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // erledigte Box ist zu
  const done = t.ent('hub_kq');
  const e0 = done.entered;
  t.place([0, 2, 8.5], { settle: 60 });
  t.place([done.pos.x, done.pos.y + 1.9, done.pos.z], { settle: 120 });
  out.closed = { entered: done.entered - e0, mode: p.mode, banner: t.banners.slice(-1)[0] };
  const b = t.ent('schatten');
  out.via = t.viaBox(t.ent('hub_schatten'));
  out.engage = t.engage('schatten');
  const hits = [];
  const safe = [-80, 2, -42.4];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.wait(() => b.vulnerable && (b.state === 'idle' || b.state === 'idle2') && b.appearances > k, 120 * 30, safe);
    t.stomp(b, { h: 1.0, max: 200 });
    hits.push(b.hp);
    t.fresh();
  }
  out.hits = hits;
  t.wait(() => b.state === 'gone', 120 * 8, safe);
  out.gone = { state: b.state, won: t.arch().won };
  out.back = t.keyAndBack('schatten');
  return out;
});
console.log(`  Schattenläuferin: ${JSON.stringify(k2)}`);
check('Erledigte Box ist zu (kein Hineinspringen, Ansage)', k2.closed.entered === 0 && k2.closed.mode !== 'script' && /schon gewonnen/.test(k2.closed.banner ?? ''));
check(`Kampf 2: Schattenläuferin – 3 Treffer (${k2.hits.join(' → ')}), Schlüssel ${k2.back.keys}/5, Box erledigt`,
  k2.engage.started && k2.engage.active === 'schatten' && k2.hits.join(',') === '2,1,0' && k2.gone.won && k2.back.keyGot && k2.back.done && k2.back.keys === 2);

// ---- Kampf 3: Lavafelsen-König (Stern 1)
const k3 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('lava');
  out.via = t.viaBox(t.ent('hub_lava'));
  out.engage = t.engage('lava');
  const safe = [80, 2, -41.4];
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.wait(() => b.vulnerable && b.brocken.some((g) => !g.removed && !g.defeated), 120 * 30, safe);
    const g = b.brocken.find((x) => !x.removed && !x.defeated);
    b.onHit('throw', g);   // wie ein geworfener Lavabrocken (Motor: onHit('throw', brocken))
    hits.push(b.hp);
    t.wait(() => b.state !== 'hit' && b.state !== 'spin', 120 * 6, safe);
  }
  out.hits = hits;
  t.wait(() => b.state === 'gone', 120 * 8, safe);
  out.gone = { state: b.state, won: t.arch().won };
  out.star = t.takeStar(0);
  out.back = t.keyAndBack('lava');
  return out;
});
console.log(`  Lavafelsen-König: ${JSON.stringify(k3)}`);
check(`Kampf 3: Lavafelsen-König – 3 Treffer (${k3.hits.join(' → ')}), Stern 1 eingesammelt, Schlüssel ${k3.back.keys}/5`,
  k3.engage.started && k3.engage.active === 'lava' && k3.hits.join(',') === '2,1,0' && k3.gone.won && k3.star && k3.back.keyGot && k3.back.done && k3.back.keys === 3);

// ---- Kampf 4: Wirbelbrocken, dabei Tod und Neustart
const k4 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level, H = t.hub();
  const out = {};
  const b = t.ent('wirbel');
  out.via = t.viaBox(t.ent('hub_wirbel'));
  out.engage = t.engage('wirbel');
  const safe = [80, 2, 48.6];
  t.wait(() => b.state === 'stunned', 120 * 20, safe);
  t.stomp(b, { h: 1.0, max: 200 });
  out.hp1 = b.hp;
  t.fresh();
  // Tod im Kampf: Kampf von vorn, Neustart am Eingang des Arena-Raums, Schlüssel bleiben
  const keys0 = H.keys;
  out.die = t.die();
  out.reset = { hp: b.hp, state: b.state, started: c.arch.started, keys: H.keys, keys0, cp: L.runtime.checkpoint?.pos?.map(t.r2) };
  out.engage2 = t.engage('wirbel');
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.wait(() => b.state === 'stunned', 120 * 25, safe);
    t.stomp(b, { h: 1.0, max: 200 });
    hits.push(b.hp);
    t.fresh();
  }
  out.hits = hits;
  t.wait(() => b.state === 'gone', 120 * 8, safe);
  out.gone = { state: b.state, won: t.arch().won };
  out.back = t.keyAndBack('wirbel');
  return out;
});
console.log(`  Wirbelbrocken: ${JSON.stringify(k4)}`);
check(`Tod im Kampf (Wirbelbrocken nach 1 Treffer): Neustart am Arena-Eingang (${k4.die.pos.join(', ')}), Kampf von vorn (${k4.reset.hp}/3, ${k4.reset.state}), Schlüssel bleiben (${k4.reset.keys})`,
  k4.hp1 === 2 && !k4.die.dead && k4.die.status === 'play' && Math.abs(k4.die.pos[2] - 48.6) < 1 && k4.reset.hp === 3 && k4.reset.state === 'wait' && !k4.reset.started && k4.reset.keys === k4.reset.keys0 && k4.engage2.started);
check(`Kampf 4: Wirbelbrocken – 3 Treffer (${k4.hits.join(' → ')}), Schlüssel ${k4.back.keys}/5`, k4.hits.join(',') === '2,1,0' && k4.gone.won && k4.back.keyGot && k4.back.done && k4.back.keys === 4);

// ---- Kampf 5: beide Schlangenkönige zugleich (Stern 2)
const k5 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level, H = t.hub();
  const out = {};
  const G = t.ent('koenige'), A = t.ent('sk_gruen'), B = t.ent('sk_rosa');
  out.via = t.viaBox(t.ent('hub_koenige'));
  out.before = { a: A.state, b: B.state, managed: [A.managed, B.managed] };
  out.engage = t.engage('koenige');
  c.step(60);
  out.start = { hp: G.hp, max: G.maxHp, hud: t.arch().hud?.boss ?? null, a: A.state, b: B.state, rosa: B.rosa };
  const safe = [0, 2, -98.6];
  const hits = [];
  for (let k = 0; k < 6 && G.hp > 0; k++) {
    t.wait(() => (A.hp > 0 && A.state === 'lean' && A.stateT > 0.8 && A.vulnerable) || (B.hp > 0 && B.state === 'lean' && B.stateT > 0.8 && B.vulnerable), 120 * 40, safe);
    const K = A.hp > 0 && A.state === 'lean' && A.vulnerable ? A : B;
    t.stomp(K, { h: 1.0, max: 200 });
    hits.push(`${K === A ? 'g' : 'r'}${K.hp}`);
    t.fresh();
  }
  out.hits = hits;
  out.hudMid = t.arch().hud?.boss ?? null;
  t.wait(() => G.state === 'gone', 120 * 10, safe);
  out.gone = { state: G.state, won: t.arch().won, a: A.state, b: B.state, banner: t.banners.some((x) => /noch einer/i.test(x)) };
  out.star = t.takeStar(1);
  out.back = t.keyAndBack('koenige');
  out.open = { open: H.open, unlocked: !t.ent('hub_blase').locked, signal: t.sig('bossblitzOffen').length };
  return out;
});
console.log(`  Schlangenkönige: ${JSON.stringify(k5)}`);
check(`Beide Schlangenkönige zugleich (grün + rosa, Gruppe): warten auf den Archetyp, beginnen gemeinsam, Lebensleiste ${k5.start.hp}/${k5.start.max}`,
  k5.before.a === 'wait' && k5.before.b === 'wait' && k5.before.managed.every(Boolean) && k5.engage.started && k5.engage.active === 'koenige' && k5.start.max === 6 && k5.start.hud?.max === 6 && k5.start.rosa && k5.start.a !== 'wait' && k5.start.b !== 'wait');
check(`Kampf 5: 6 Kopftreffer (${k5.hits.join(', ')}), „noch einer“, Gruppe weg → Sieg, Stern 2, Schlüssel ${k5.back.keys}/5`,
  k5.hits.length === 6 && k5.gone.state === 'gone' && k5.gone.won && k5.gone.banner && k5.star && k5.back.keyGot && k5.back.done && k5.back.keys === 5);
check(`Alle 5 Schlüssel: die letzte Box öffnet sich im Hub (Signal bossblitzOffen)`, k5.open.open && k5.open.unlocked && k5.open.signal === 1);

// ---- Kampf 6: Würfelblase (mehr, schnellere Schockwellen; Stern 3), Rück-Warp-Box zum Zielplatz
const k6 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level, H = t.hub();
  const out = {};
  const b = t.ent('blase');
  out.via = t.viaBox(t.ent('hub_blase'));
  out.engage = t.engage('blase');
  const safe = [6, 2, 117];
  // erste Riesen-Landung: drei weiße Schockwellen
  t.wait(() => b.state === 'gair', 120 * 20, safe);
  const seen = new Set();
  t.wait(() => { for (const e of L.entities) if (e.kind === 'schockwelle' && e.owner === b) seen.add(e); return b.state === 'grest' && b.stateT > 1.0; }, 120 * 6, safe);
  const ws = [...seen];
  out.waves = { n: ws.length, colors: [...new Set(ws.map((w) => w.color))], speeds: ws.map((w) => t.r2(w.speed)), multi: b.multi };
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.wait(() => b.state === 'flee' && b.vulnerable, 120 * 40, safe);
    t.stomp(b, { h: 1.2, max: 200 });
    hits.push(b.hp);
    t.fresh();
  }
  out.hits = hits;
  t.wait(() => b.state === 'gone', 120 * 8, safe);
  out.gone = { state: b.state, won: t.arch().won, signal: t.sig('bossblitzSieg').length };
  out.star = t.takeStar(2);
  const f = H.fights.find((x) => x.final);
  out.ret = !!f.retBox && !f.retBox.hidden;
  out.via2 = f.retBox ? t.viaBox(f.retBox) : null;
  out.stars = L.runtime.stars.slice(0, 3);
  // zum Zielmast
  let goal = false;
  for (let i = 0; i < 120 * 6 && !goal; i++) { c.setInput({ y: 1 }); c.step(1); if (L.runtime.status !== 'play') goal = true; }
  c.setInput({});
  out.goal = { status: L.runtime.status, goal };
  return out;
});
console.log(`  Würfelblase: ${JSON.stringify(k6)}`);
check(`Kampf 6 (letzte Box): Würfelblase mit mehr, schnelleren Schockwellen (${k6.waves.n} Wellen ${k6.waves.colors.join('/')}, ${k6.waves.speeds.join('/')} m/s)`,
  k6.via.seen && k6.engage.started && k6.engage.active === 'blase' && k6.waves.multi && k6.waves.n >= 3 && k6.waves.colors.includes('weiss') && Math.max(...k6.waves.speeds) >= 9);
check(`Würfelblase: 3 Hut-Treffer (${k6.hits.join(' → ')}), Stern 3, Signal bossblitzSieg, Rück-Warp-Box zum Zielplatz (${k6.via2?.pos?.join(', ')}), alle 3 Sterne, Zielmast`,
  k6.hits.join(',') === '2,1,0' && k6.gone.won && k6.gone.signal === 1 && k6.star && k6.ret && k6.via2?.seen && k6.via2.pos[2] > 140 && k6.stars.every(Boolean) && k6.goal.goal);
check('Keine Konsolenfehler (Teil 3)', errors.length === 0);

// ---- Bilder Boss-Marathon und Zeichenaufrufe
await load('0-36');
await sc(BLITZ_HELPERS);
const B = {};
B.hub = await SHOT('be', 'blitz_hub', () => {
  const c = window.__course, t = window.__t;
  t.place([0, 2, 8.5], { settle: 60 });
});
B.kq = await SHOT('be', 'blitz_kippquader', () => {
  const c = window.__course, t = window.__t, b = t.ent('kq');
  t.viaBox(t.ent('hub_kq'));
  t.engage('kq');
  t.wait(() => b.state === 'warn' && b.stateT > 0.3, 120 * 15, [-80, 2, 47]);
  t.face(b.pos.x, b.pos.z);
});
B.schatten = await SHOT('be', 'blitz_schattenlaeuferin', () => {
  const c = window.__course, t = window.__t, b = t.ent('schatten');
  c.arch.resetFight?.();
  t.viaBox(t.ent('hub_schatten'));
  t.engage('schatten');
  t.wait(() => b.state === 'throw' && b.clones.length >= 2 && b.stateT > 0.4, 120 * 20, [-80, 2, -43]);
  t.face(b.pos.x, b.pos.z);
});
B.lava = await SHOT('be', 'blitz_lavafelsen', () => {
  const c = window.__course, t = window.__t, b = t.ent('lava');
  c.arch.resetFight?.();
  t.viaBox(t.ent('hub_lava'));
  t.engage('lava');
  t.wait(() => b.state === 'roll' && b.stateT > 0.6, 120 * 20, [80, 2, -42]);
  t.face(b.pos.x, b.pos.z);
});
B.wirbel = await SHOT('be', 'blitz_wirbelbrocken', () => {
  const c = window.__course, t = window.__t, b = t.ent('wirbel');
  c.arch.resetFight?.();
  t.viaBox(t.ent('hub_wirbel'));
  t.engage('wirbel');
  t.wait(() => b.state === 'spin' && b.stateT > 0.5, 120 * 20, [80, 2, 47]);
  t.face(b.pos.x, b.pos.z);
});
B.koenige = await SHOT('be', 'blitz_schlangenkoenige', () => {
  const c = window.__course, t = window.__t, A = t.ent('sk_gruen'), Bk = t.ent('sk_rosa');
  c.arch.resetFight?.();
  t.viaBox(t.ent('hub_koenige'));
  t.engage('koenige');
  t.wait(() => A.state === 'lean' || Bk.state === 'lean', 120 * 25, [0, 2, -100]);
  t.face(0, -111);
});
B.blase = await SHOT('be', 'blitz_wuerfelblase_wellen', () => {
  const c = window.__course, t = window.__t, b = t.ent('blase'), L = c.level, H = t.hub();
  c.arch.resetFight?.();
  // Probe: Schlüssel gutschreiben, letzte Box öffnen
  for (const f of H.fights) if (!f.final) { f.won = true; f.keyGot = true; f.done = true; f.box.markDone(); }
  H.keys = 5;
  t.place([0, 2, 8.5], { settle: 10 });
  c.step(5);
  t.viaBox(t.ent('hub_blase'));
  t.engage('blase');
  t.wait(() => b.state === 'grest' && b.goldWaves.some((w) => !w.removed && w.r > 3), 120 * 25, [6, 2, 117]);
  t.face(b.pos.x, b.pos.z);
});
B.erledigt = await SHOT('be', 'blitz_hub_erledigt', () => {
  const c = window.__course, t = window.__t;
  c.arch.resetFight?.();
  t.place([0, 2, 8.5], { settle: 120 });
});
B.schluessel = await SHOT('be', 'blitz_schluessel', () => {
  const c = window.__course, t = window.__t, L = c.level;
  const k = L.spawn('bossblitz_schluessel', { pos: [0, 2, 2] });
  t.place([0, 2, 6.5], { settle: 120 });
  t.face(0, 2);
});
const bmax = Math.max(...Object.values(B).map((x) => x.calls));
KPI.blitz = { calls: bmax, tris: Math.round(Math.max(...Object.values(B).map((x) => x.triangles)) / 1000) };
console.log(`  Zeichenaufrufe Boss-Marathon: ${Object.entries(B).map(([k, x]) => `${k} ${x.calls}`).join(', ')}; höchstens ${KPI.blitz.tris} k Dreiecke`);
check(`Boss-Marathon: Zeichenaufrufe < 120 (höchstens ${bmax}), Dreiecke < 300 k (${KPI.blitz.tris} k)`, bmax < 120 && KPI.blitz.tris < 300);
check('Keine Konsolenfehler (Teil 3, Bilder)', errors.length === 0);
}

console.log(`Kennzahlen: ${JSON.stringify(KPI)}`);
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
