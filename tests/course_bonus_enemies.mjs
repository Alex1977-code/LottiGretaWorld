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

console.log(`Kennzahlen: ${JSON.stringify(KPI)}`);
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
