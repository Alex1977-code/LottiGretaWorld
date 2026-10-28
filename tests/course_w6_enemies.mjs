// Kurs-Modus: Gegner der Welt 6 „Wolkeninseln“ im Wolken-Gegnerzoo (0-24) und die Endgegner in den Wolken-Bossarenen (0-25)
// deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Schubser (Rammen ohne Schaden, Stoß in die
// Lava, zurückstoßen per Draufspringen/Stampfen/Gegenrennen/Angriff, rutscht über Kanten in Lava und Wasser, bremst an
// Kanten, Funkelstern), Pustewolke (Atempause → Luftholen → Pusten, Wind schiebt am Boden schwächer als in der Luft, dreht
// sich zur Figur, nur in der Atempause zu besiegen), Glotzfisch (verborgen, lugt, Bogen von Loch zu Loch, von oben besiegbar,
// zielt), Stachelwerfer (Wurf über den Kopf, Kugel rollt und prallt ab, von oben/hinten), Werfer-Brüder, Wuschel-Horde
// (senkrecht und waagerecht, Neustart), Pilz-Maske (sehende Gegner übersehen eine zugewandte Figur), Bestand der Welt-6-Liste;
// Schubser-Prinz (Rammen, Feuerbälle, in die Röhre stoßen, zweiter Stoß, gequetscht heraus, Tritt, 3 Treffer), Würfelblase
// (Brocken sammeln sich zum Riesen, Sprünge mit Landemarke und Schockwelle, Trennung und Flucht, Hut-Treffer, besiegte Brocken
// verkleinern den Riesen, 3 Treffer), Wirbelbrocken mit Attrappen (Teleport mit 1 bzw. 2 Attrappen, nur das Original zählt);
// Sieg → Stern, Warp-Box; Tod setzt jeden Kampf zurück.
// Simulation nur über window.__course.step(n) (1 Schritt = 1/120 s) und setInput; Bilder tests/out/w6e_*.png.
// Aufruf: PORT_BASE=0 node tests/course_w6_enemies.mjs   (Port 4620; vorher npm run build)
//   W6E_PART=1 (Schubser, Pustewolke, Glotzfisch) | 2 (Stachelwerfer, Werfer, Wuschel-Horde, Pilz-Maske, Bestand) |
//   3 (Schubser-Prinz, Würfelblase, Wirbelbrocken mit Attrappen) | 4 (Bilder, Zeichenaufrufe) – ohne: alle Teile nacheinander
//   (besser einzeln, je < 10 min).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4620;
const PART = process.env.W6E_PART ?? 'all';
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
        c.squad?.clear?.();
        p.dead = false;
        p.removedFigure = null; p.hidden = false;
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
        let bounced = false, hurt = false, landed = false, vmax = -99;
        if (o.pound) { c.setInput({ crouch: true }); c.step(1); c.setInput({}); }
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          vmax = Math.max(vmax, p.vel.y);
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground' || p.mode === 'swim') { landed = true; break; }
        }
        c.setInput({});
        return { bounced, hurt, landed, vy: +vmax.toFixed(2) };
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
      fresh() { const p = P(); p.invuln = 0; if (!p.big) { p.big = true; p.updateHalf?.(); } },
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      ents: (kind) => L.entities.filter((e) => e.kind === kind && !e.removed),
      dist: (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z),
      coins: () => L.runtime.coins + L.entities.filter((e) => e.kind === 'coin' && !e.removed).length,
      face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
      action(o = {}) { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); },
      /** Figur festhalten (pos) für n Schritte (unverwundbar). */
      hold(pos, n, safe = true) { const p = P(); if (safe) p.hurt = () => false; for (let i = 0; i < n; i++) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); c.step(1); } if (safe) delete p.hurt; },
      /** Bis Bedingung f() (höchstens n Schritte), Figur festgehalten und unverwundbar. */
      until(f, n, pos = null) { const p = P(); p.hurt = () => false; let i = 0; for (; i < n && !f(); i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); } delete p.hurt; return i; },
      /** Pilz-Maske aufsetzen (Trage-Helm 'maske' der Bausteine; ohne ihn: Merkmal masked). */
      mask(on = true) {
        const p = P();
        if (!on) { if (p.helmet === 'maske') p.helmet = null; if (Object.getOwnPropertyDescriptor(p, 'masked')) delete p.masked; return p.masked ?? false; }
        try { p.wearHelmet?.('maske'); } catch (_) { /* ohne Helm */ }
        if (!p.masked) Object.defineProperty(p, 'masked', { value: true, configurable: true, writable: true });
        return !!p.masked;
      },
      model: (e) => e?.model?.root?.userData?.modelName ?? e?.model?.root?.name ?? null,
      r2: (v) => +(+v).toFixed(2),
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
await load('0-24');
console.log('Wolken-Gegnerzoo 0-24');
{
  const st0 = await sc(() => {
    const c = window.__course, t = window.__t;
    const kinds = {};
    for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    const models = {};
    for (const id of ['sb_lava', 'pw_fest', 'gf_eis', 'sw_wand', 'wf_hammer', 'wf_bumerang', 'pm_pilz']) {
      const e = t.ent(id);
      models[id] = e?.model ? (e.model.placeholder ? 'PLATZHALTER' : t.model(e)) : null;
    }
    const horde = t.ent('horde_y');
    const weapons = ['wf_hammer', 'wf_bumerang', 'wf_feuer', 'wf_hammer2', 'wf_bumerang2'].map((id) => t.ent(id)?.weapon).join(',');
    return { kinds, weapons, n: c.level.entities.length, models, horde: horde ? { layers: horde.layers.length, model: horde.layers[0]?.root?.userData?.modelName ?? horde.layers[0]?.root?.name } : null };
  });
  console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
  console.log(`  Modelle: ${JSON.stringify(st0.models)}`);
  const NEED = ['schubser', 'pustewolke', 'glotzfisch', 'stachelwerfer', 'wuschel_horde', 'feuer_werfer', 'gelee_brocken', 'pilz_maske'];
  check(`Alle Welt-6-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'}; Werfer ${st0.weapons})`, NEED.every((k) => st0.kinds[k] > 0) && st0.weapons === 'hammer,bumerang,feuer,hammer,bumerang');
  const M = st0.models;
  check(`Welt-6-Modelle angebunden (kein Platzhalter): ${Object.values(M).join(', ')}`, Object.values(M).every((m) => m && m !== 'PLATZHALTER')
    && M.sb_lava === 'schubser' && M.pw_fest === 'pustewolke' && M.gf_eis === 'glotzfisch' && M.sw_wand === 'stachelwerfer');
  check(`Wuschel-Horde als Instanz-Gruppe (${JSON.stringify(st0.horde)})`, st0.horde?.layers === 2 && st0.horde.model === 'wuschel_horde');
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
  const smoke = await sc(() => { const c = window.__course; const t0 = performance.now(); for (let i = 0; i < 1200; i++) c.step(1); return { n: c.level.entities.length, ms: +((performance.now() - t0) / 1200).toFixed(3) }; });
  KPI.zooStep = smoke.ms;
  check(`10 s Simulation ohne Fehler (${smoke.n} Entitäten, ${smoke.ms} ms je Schritt)`, errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 1: Schubser, Pustewolke, Glotzfisch
// =====================================================================================================================
if (want(1)) {
await load('0-24');
console.log('Teil 1: Schubser, Pustewolke, Glotzfisch');
const sb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const s = t.ent('sb_lava');
  // Rammen: Figur hinter ihm auf dem Podest – er dreht sich, scharrt, rammt; die Figur fliegt ohne Schaden in die Lava
  t.place([-11.5, 2.5, -16.5], { settle: 2 });
  const seq = [s.state];
  let ram = null, x0 = p.pos.x, z0 = p.pos.z, died = false;
  for (let i = 0; i < 600; i++) {
    c.step(1);
    if (seq[seq.length - 1] !== s.state) seq.push(s.state);
    if (s.rams > 0 && !ram) ram = { big: p.big, invuln: p.invuln, state: p.state, v: t.r2(Math.hypot(p.vel.x, p.vel.z)), vy: t.r2(p.vel.y) };
    if (p.dead) { died = p.deathCause; break; }
  }
  out.ram = { seq: seq.join('>'), ram, died, flew: t.r2(Math.hypot(p.pos.x - x0, p.pos.z - z0)) };
  for (let i = 0; i < 1600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  // Draufspringen: Abprall, er rutscht in Sprungrichtung, besiegt ihn nicht
  t.until(() => s.state === 'cool' && s.stateT > 0.95, 900, [0, 1, 0]);
  const b0 = { x: s.pos.x, z: s.pos.z };
  const st = t.stomp(s);
  const slideAfter = s.slideSpeed;
  c.step(90);
  out.stomp = { ...st, state0: s.state, defeated: s.defeated, pushes: s.pushes, slide: t.r2(slideAfter), moved: t.r2(Math.hypot(s.pos.x - b0.x, s.pos.z - b0.z)) };
  // Stampfattacke: rutscht über die Kante in die Lava → besiegt (zählt)
  t.until(() => ['cool', 'walk', 'idle'].includes(s.state), 600, [0, 1, 0]);
  const def0 = L.defeatedLog.length;
  const st2 = t.stomp(s, { pound: true, h: 2 });
  for (let i = 0; i < 300 && !s.removed; i++) c.step(1);
  out.pound = { ...st2, removed: s.removed, defeated: s.defeated, fellBy: s.fellBy, counted: L.defeatedLog.slice(def0).includes('schubser') };
  // Wasser: Streife; ein Feuerball stößt ihn vom Podest ins Wasser
  const w = t.ent('sb_wasser');
  t.until(() => w.pos.x > 13.2 && w.state === 'walk', 1800, [4.5, 1, t.Z(1, 1.5)]);
  out.water0 = { state: w.state, x: t.r2(w.pos.x) };
  w.onHit('fire', { pos: { x: w.pos.x - 1.6, y: w.pos.y, z: w.pos.z } });
  for (let i = 0; i < 300 && !w.removed; i++) c.step(1);
  out.water = { removed: w.removed, fellBy: w.fellBy, defeated: w.defeated, pushes: w.pushes };
  // frische Schubser auf dem Mittelweg
  const z = t.Z(2, -3);
  const a = L.spawn('schubser', { pos: [0, 1, z], dir: [1, 0], behavior: 'guard', sight: 0.01, wake: 0.01 });
  c.step(5);
  // Gegenrennen: Figur rennt gegen ihn → er rutscht davon, Figur unverletzt
  t.place([-3.2, 1, z], { settle: 1, yaw: 0 });
  let hit = false;
  for (let i = 0; i < 90 && a.pushes === 0; i++) { c.setInput({ x: 1, run: true }); c.step(1); }
  c.setInput({});
  const sl = a.slideSpeed;
  hit = t.hurt();
  c.step(120);
  out.run = { pushes: a.pushes, slide: t.r2(sl), hurt: hit, x: t.r2(a.pos.x) };
  // langsame Berührung: sanfter Schubs, kein Schaden
  t.place([a.pos.x - 1.2, 1, z], { settle: 1, yaw: 0 });
  for (let i = 0; i < 40; i++) { c.setInput({ x: 0.25 }); c.step(1); }
  c.setInput({});
  out.slow = { hurt: t.hurt(), figX: t.r2(p.pos.x), sx: t.r2(a.pos.x) };
  // Angriffe stoßen nur, Funkelstern besiegt
  const k0 = a.pushes;
  a.onHit('claw', p); c.step(100);
  a.onHit('throw', p); c.step(100);
  const alive = !a.defeated;
  t.place([a.pos.x - 1.5, 1, z], { settle: 1, yaw: 0, power: 'stern' });
  for (let i = 0; i < 60 && !a.defeated; i++) { c.setInput({ x: 1 }); c.step(1); }
  c.setInput({});
  c.step(5);
  out.attack = { pushes: a.pushes - k0, aliveAfterHits: alive, star: a.defeated, state: a.state };
  // Kante: er rammt zur Figur jenseits der Podestkante und bremst an der Kante (fällt nicht)
  const e = L.spawn('schubser', { pos: [11.5, 2.5, t.Z(1, 7)], dir: [1, 0], behavior: 'guard', sight: 6 });
  const fig = [16.3, 2.6, t.Z(1, 7)];
  const s3 = [e.state];
  p.hurt = () => false;
  for (let i = 0; i < 480; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); p.mode = 'ground'; c.step(1); if (s3[s3.length - 1] !== e.state) s3.push(e.state); }
  delete p.hurt;
  out.edge = { seq: s3.join('>'), x: t.r2(e.pos.x), y: t.r2(e.pos.y), defeated: e.defeated };
  return out;
});
console.log(`  Schubser: ${JSON.stringify(sb)}`);
check(`Schubser sieht die Figur, scharrt und rammt (${sb.ram.seq})`, /warn>charge/.test(sb.ram.seq));
check(`Rammstoß ohne Schaden (groß, ${sb.ram.ram?.v} m/s weg, ${sb.ram.ram?.vy} m/s hoch) – die Figur fliegt vom Podest in die Lava (${sb.ram.died})`, sb.ram.ram && sb.ram.ram.big && sb.ram.ram.invuln === 0 && sb.ram.ram.v >= 8 && sb.ram.died === 'lava');
check(`Draufspringen: Abprall, er rutscht davon (${sb.stomp.slide} m/s, ${sb.stomp.moved} m), nicht besiegt`, sb.stomp.bounced && !sb.stomp.hurt && !sb.stomp.defeated && sb.stomp.pushes >= 1 && sb.stomp.slide >= 4 && sb.stomp.moved >= 1.5);
check(`Stampfattacke stößt ihn über die Kante in die Lava (${sb.pound.fellBy}) – besiegt, zählt`, sb.pound.bounced && sb.pound.removed && sb.pound.defeated && sb.pound.fellBy === 'lava' && sb.pound.counted);
check(`Feuerball stößt ihn vom Podest ins Wasser (${sb.water.fellBy}) – besiegt`, sb.water.removed && sb.water.defeated && sb.water.fellBy === 'wasser');
check(`Gegenrennen stößt ihn weg (${sb.run.slide} m/s), Figur unverletzt; langsame Berührung schubst ohne Schaden`, sb.run.pushes >= 1 && sb.run.slide >= 4 && !sb.run.hurt && !sb.slow.hurt);
check(`Angriffe stoßen nur (${sb.attack.pushes} Stöße), Funkelstern besiegt (${sb.attack.state})`, sb.attack.pushes >= 2 && sb.attack.aliveAfterHits && sb.attack.star);
check(`An der Kante bremst er (${sb.edge.seq}) und bleibt oben (x ${sb.edge.x}, y ${sb.edge.y})`, /charge/.test(sb.edge.seq) && sb.edge.x < 15 && sb.edge.y > 2.4 && !sb.edge.defeated);

const pw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const w = t.ent('pw_fest');
  // Takt: rest → inhale → blow (Figur im Kegel)
  const fig = [-12.5, 1, w.pos.z];
  t.place(fig, { settle: 1 });
  const seq = [w.state];
  p.hurt = () => false;
  for (let i = 0; i < 120 * 6; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); if (seq[seq.length - 1] !== w.state) seq.push(w.state); }
  out.seq = seq.slice(0, 8).join('>');
  // Wind: am Boden schiebt er schwächer als in der Luft
  t.until(() => w.state === 'blow' && w.stateT > 0.3, 1200, fig);
  t.place(fig, { settle: 0 });
  p.mode = 'ground';
  const g0 = p.pos.x;
  c.step(30);
  const dGround = p.pos.x - g0;
  t.until(() => w.state === 'blow' && w.stateT > 0.3, 1200, fig);
  p.pos.set(fig[0], fig[1] + 1.5, fig[2]); p.vel.set(0, 0, 0); p.mode = 'air'; p.enterAir?.('fall', false);
  const a0 = p.pos.x;
  for (let i = 0; i < 30; i++) { p.vel.y = Math.max(p.vel.y, 0); p.vel.x = 0; p.vel.z = 0; c.step(1); }
  const dAir = p.pos.x - a0;
  // hinter der Wolke: kein Wind
  t.until(() => w.state === 'blow' && w.stateT > 0.3, 1200, fig);
  t.place([w.pos.x - 2.5, 1, w.pos.z], { settle: 0 });
  const b0 = p.pos.x;
  c.step(30);
  out.wind = { ground: t.r2(dGround), air: t.r2(dAir), behind: t.r2(p.pos.x - b0), pushed: w.info().pushed };
  // ganzer Stoß während einer Böe (frei, ohne Eingabe)
  t.until(() => w.state === 'inhale', 1200, fig);
  t.place(fig, { settle: 0 });
  const f0 = p.pos.x;
  for (let i = 0; i < 120 * 2.5; i++) c.step(1);
  out.wind.blowAway = t.r2(p.pos.x - f0);
  delete p.hurt;
  // Drehen: die freie Pustewolke dreht sich in der Pause zur Figur
  const d = t.ent('pw_dreh');
  const dfig = [d.pos.x - 4, 1, d.pos.z + 0.5];
  t.until(() => d.state === 'rest' && d.stateT > 0.6, 1500, dfig);
  out.turn = { dir: d.info().dir };
  // Draufspringen beim Pusten: nur Abprall; in der Atempause: besiegt
  const z = t.ent('pw_ziel');
  t.until(() => z.state === 'blow' && z.stateT > 0.4, 1500, [z.pos.x - 3, 1, z.pos.z]);
  const s1 = t.stomp(z, { h: 0.6 });
  out.blowStomp = { ...s1, defeated: z.defeated, state: z.state };
  t.until(() => z.state === 'rest' && z.stateT > 0.3, 1500, [z.pos.x - 3, 1, z.pos.z]);
  const s2 = t.stomp(z, { h: 0.6 });
  c.step(200);
  out.restStomp = { ...s2, defeated: z.defeated, removed: z.removed };
  // seitliche Berührung harmlos; Feuer besiegt immer
  const e = L.spawn('pustewolke', { pos: [0, 2, t.Z(2, -3)], dir: [1, 0], turn: false, phase: 2.5 });
  c.step(2);
  out.side = t.touch(e, 30);
  e.onHit('fire', p);
  c.step(200);
  out.fire = { defeated: e.defeated, removed: e.removed };
  return out;
});
console.log(`  Pustewolke: ${JSON.stringify(pw)}`);
check(`Pustewolke: Atempause → Luft holen → Pusten (${pw.seq})`, /rest>inhale>blow>rest/.test(pw.seq));
check(`Wind schiebt die Figur: am Boden ${pw.wind.ground} m, in der Luft ${pw.wind.air} m (je 0,25 s), hinter der Wolke ${pw.wind.behind} m; eine Böe ${pw.wind.blowAway} m (bis ans Kegelende)`, pw.wind.ground > 0.25 && pw.wind.air > pw.wind.ground * 1.2 && Math.abs(pw.wind.behind) < 0.15 && pw.wind.blowAway > 2.5);
check(`Freie Pustewolke dreht sich in der Pause zur Figur (Blasrichtung ${JSON.stringify(pw.turn.dir)})`, pw.turn.dir[0] < -0.75);
check('Draufspringen beim Pusten: nur Abprall; in der Atempause: besiegt', pw.blowStomp.bounced && !pw.blowStomp.defeated && pw.restStomp.bounced && pw.restStomp.defeated && pw.restStomp.removed);
check('Seitliche Berührung harmlos, Feuerball besiegt', !pw.side && pw.fire.defeated && pw.fire.removed);

const gf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('gf_eis');
  const fig = [-11.5, 2.1, t.Z(3, 2)];
  t.place(fig, { settle: 2 });
  const seq = [];
  let peek = false, hiddenTouch = true, apex = 0, visWait = false;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 8; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (f.state === 'peek') peek = true;
    if (f.state === 'wait' && f.touch) hiddenTouch = false;
    if (f.state === 'jump') apex = Math.max(apex, f.pos.y - 2.0);
    if (f.state === 'wait' && f.model?.root?.visible) visWait = true;
    if (f.state === 'jump' && f.jumps !== f._seen) { f._seen = f.jumps; seq.push(f.next); }
  }
  delete p.hurt;
  out.cycle = { holes: seq.join('>'), peek, hiddenSafe: hiddenTouch && !visWait, apex: t.r2(apex), jumps: f.jumps };
  // Berührung im Sprung verletzt, verborgen nicht
  t.until(() => f.state === 'wait', 600, fig);
  const hidden = t.touch(f, 10);
  t.until(() => f.state === 'jump' && f.stateT > 0.3, 900, fig);
  const air = t.touch(f, 10);
  out.touch = { hidden, air };
  // von oben besiegbar
  t.until(() => f.state === 'jump' && f.stateT > 0.2, 900, fig);
  const st = t.stomp(f, { h: 0.6 });
  c.step(200);
  out.stomp = { ...st, defeated: f.defeated, removed: f.removed };
  // Zielen: der zielende Glotzfisch springt ins Loch nächst der Figur
  const g = t.ent('gf_ziel');
  const sfig = [12.8, 2.55, t.Z(3, 7)];
  t.until(() => g.state === 'wait', 900, sfig);
  const tl = [];
  p.hurt = () => false;
  for (let i = 0; i < 120 * 8; i++) { p.pos.set(sfig[0], sfig[1], sfig[2]); p.vel.set(0, 0, 0); c.step(1); if (g.state === 'jump' && g.jumps !== g._seen) { g._seen = g.jumps; tl.push(g.next); } }
  delete p.hurt;
  const near = g.holes.map((h, i) => [i, Math.hypot(h.x - sfig[0], h.z - sfig[2])]).sort((a, b) => a[1] - b[1]);
  out.aim = { targets: tl.join('>'), near: near.slice(0, 2).map((x) => x[0]) };
  // Feuer besiegt den pendelnden im Sprung
  const q = t.ent('gf_pendel');
  t.until(() => q.state === 'jump' && q.stateT > 0.3, 900, [0, 1, 0]);
  q.onHit('fire', p);
  c.step(10);
  out.fire = { defeated: q.defeated };
  return out;
});
console.log(`  Glotzfisch: ${JSON.stringify(gf)}`);
check(`Glotzfisch springt reihum von Loch zu Loch (${gf.cycle.holes}, Scheitel ${gf.cycle.apex} m), lugt vorher, verborgen harmlos`, gf.cycle.jumps >= 3 && /^(1>2>0|2>0>1|0>1>2)/.test(gf.cycle.holes) && gf.cycle.peek && gf.cycle.hiddenSafe && Math.abs(gf.cycle.apex - 2.6) < 0.35);
check('Berührung im Sprung verletzt, verborgen nicht', gf.touch.air && !gf.touch.hidden);
check('Von oben besiegbar (Abprall)', gf.stomp.bounced && !gf.stomp.hurt && gf.stomp.defeated);
check(`Zielender Glotzfisch springt in die Löcher nahe der Figur (${gf.aim.targets}; nah ${gf.aim.near})`, gf.aim.targets.length > 0 && gf.aim.targets.split('>').every((x) => gf.aim.near.includes(+x)));
check('Feuerball besiegt den Glotzfisch im Sprung', gf.fire.defeated);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 2: Stachelwerfer, Werfer-Brüder, Wuschel-Horde, Pilz-Maske, Bestand
// =====================================================================================================================
if (want(2)) {
await load('0-24');
console.log('Teil 2: Stachelwerfer, Werfer, Wuschel-Horde, Pilz-Maske, Bestand');
const sw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const w = t.ent('sw_wand');
  const fig = [-10, 1, w.pos.z];
  t.place(fig, { settle: 1 });
  // Wurf: Kugel über dem Kopf, landet vor der Figur, rollt weiter und prallt an der Gehegewand ab
  let overhead = false, ball = null, land = null, bounces = 0;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 6; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (w.overhead) overhead = true;
    if (!ball) ball = L.entities.find((e) => e.kind === 'stachelkugel_wurf' && e.owner === w) ?? null;
    if (ball && !land && ball.landAt) land = t.r2(Math.hypot(ball.landAt.x - w.pos.x, ball.landAt.z - w.pos.z));
    if (ball) bounces = Math.max(bounces, ball.bounces);
  }
  delete p.hurt;
  out.throw = { throws: w.throws, overhead, land, bounces, model: ball ? t.model(ball) : null };
  // Kugel verletzt von der Seite und von oben; Feuer lenkt sie ab, Funkelstern zerstört sie
  const b = L.spawn('stachelkugel_wurf', { pos: [0, 1, t.Z(4, -3)], dir: [1, 0], roll: 0.001, life: 60 });
  c.step(2);
  const side = t.touch(b, 10);
  const st = t.stomp(b, { h: 0.6 });
  const d0 = b.rdir.x;
  b.onHit('fire', { pos: { x: b.pos.x + 1, y: 1, z: b.pos.z } });
  const deflect = { from: d0, to: t.r2(b.rdir.x), state: b.state };
  t.place([b.pos.x - 1.4, 1, b.pos.z], { settle: 1, yaw: 0, power: 'stern' });
  for (let i = 0; i < 40 && b.state !== 'break'; i++) { c.setInput({ x: 1 }); c.step(1); }
  c.setInput({});
  out.ball = { side, top: st.hurt && st.vy < 9, deflect, star: b.state };
  // Stachelwerfer: von oben besiegbar – außer, er stemmt eine Kugel über den Kopf; von hinten harmlos
  const s = L.spawn('stachelwerfer', { pos: [3, 1, t.Z(4, -3)], dir: [1, 0], sight: 0.01, wake: 0.01 });
  c.step(5);
  t.place([s.pos.x - 2, 1, s.pos.z + 3], { settle: 1 });   // ohne Funkelstern
  const behind = (() => { const pp = p; t.fresh(); let hurt = false; for (let i = 0; i < 10; i++) { pp.pos.set(s.pos.x - (s.half.x + pp.half.x - 0.05), s.pos.y, s.pos.z); pp.vel.set(0, 0, 0); c.step(1); if (t.hurt()) hurt = true; } return hurt; })();
  s.yaw = 0; s.sight = 20; s.cool = 0; s.wake = 50;
  t.place([s.pos.x + 4, 1, s.pos.z], { settle: 1 });
  t.until(() => s.overhead, 600, [s.pos.x + 4, 1, s.pos.z]);
  const over = t.stomp(s, { h: 0.5 });
  t.fresh();
  t.until(() => s.state === 'stand' && s.stateT > 0.1, 600, [s.pos.x + 6, 1, s.pos.z + 3]);
  for (const e of L.entities) if (e.kind === 'stachelkugel_wurf') e.kill();   // keine Kugel unter der Figur
  const ok = t.stomp(s, { h: 0.6 });
  c.step(5);
  out.thrower = { behind, over: over.hurt, stomp: ok.bounced && s.defeated, ok, st: s.state };
  // Rampe: die Kugel rollt hangabwärts schneller als auf der Ebene
  const h = t.ent('sw_hang');
  const hf = [7, 1, h.pos.z];
  let vmax = 0, hb = null;
  const old = new Set(L.entities.filter((e) => e.kind === 'stachelkugel_wurf'));
  p.hurt = () => false;
  for (let i = 0; i < 120 * 6; i++) {
    p.pos.set(hf[0], hf[1], hf[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (!hb) hb = L.entities.find((e) => e.kind === 'stachelkugel_wurf' && e.owner === h && e.state === 'roll' && !old.has(e)) ?? null;
    if (hb && hb.state === 'roll' && hb.ground?.type === 'ramp') vmax = Math.max(vmax, Math.hypot(hb.vel.x, hb.vel.z));
  }
  delete p.hurt;
  out.ramp = { vmax: t.r2(vmax), roll: hb?.rollSpeed ?? null };
  return out;
});
console.log(`  Stachelwerfer: ${JSON.stringify(sw)}`);
check(`Stachelwerfer stemmt die Kugel über den Kopf und wirft (${sw.throw.throws}×, Modell ${sw.throw.model}); sie landet ${sw.throw.land} m weit und prallt an der Wand ab (${sw.throw.bounces}×)`, sw.throw.throws >= 2 && sw.throw.overhead && sw.throw.model === 'stachelkugel' && sw.throw.land > 3 && sw.throw.land < 7.5 && sw.throw.bounces >= 1);
check('Stachelkugel verletzt seitlich und von oben, Feuer lenkt sie ab, Funkelstern zerstört sie', sw.ball.side && sw.ball.top && sw.ball.deflect.to < 0 && sw.ball.deflect.state !== 'break' && sw.ball.star === 'break');
check('Stachelwerfer: von hinten harmlos, mit Kugel über dem Kopf sticht er, sonst von oben besiegt', !sw.thrower.behind && sw.thrower.over && sw.thrower.stomp);
check(`Kugel rollt die Rampe schneller hinab (${sw.ramp.vmax} m/s > ${sw.ramp.roll})`, sw.ramp.vmax > (sw.ramp.roll ?? 4) * 1.15);

const wf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const fig = [0, 1, t.Z(5, 7)];
  t.place(fig, { settle: 1 });
  const seen = { wurf_hammer: 0, wurf_bumerang: 0, feuerkugel: 0 };
  const known = new Set();
  let caught = 0;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 7; i++) {
    // fliegt ein Bumerang, weicht die Figur seitlich aus (sonst zerplatzt er an ihr)
    const away = L.entities.some((e) => e.kind === 'wurf_bumerang' && !e.removed);
    p.pos.set(fig[0], fig[1], away ? fig[2] + 6 : fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    for (const e of L.entities) if (seen[e.kind] !== undefined && !known.has(e)) { known.add(e); seen[e.kind]++; }
    for (const e of known) if (e.kind === 'wurf_bumerang' && e.caught && !e._w6c) { e._w6c = true; caught++; }
  }
  delete p.hurt;
  const hw = t.ent('wf_hammer');
  t.until(() => hw.grounded && hw.state === 'walk', 600, [0, 1, t.Z(5, 2)]);
  const st = t.stomp(hw, { h: 0.6 });
  const bl = [...known].filter((e) => e.kind === 'wurf_bumerang').map((e) => ({ caught: !!e.caught, age: t.r2(e.age), returning: e.returning, owner: e.owner?.spec?.id, def: !!e.owner?.defeated }));
  return { seen, caught, bl, stomp: st.bounced && hw.defeated, models: [t.model(t.ent('wf_bumerang')), t.model(t.ent('wf_feuer'))] };
});
console.log(`  Werfer: ${JSON.stringify(wf)}`);
check(`Werfer-Brüder (6-B) werfen Hämmer (${wf.seen.wurf_hammer}), Bumerangs (${wf.seen.wurf_bumerang}, ${wf.caught} gefangen) und Feuer (${wf.seen.feuerkugel}); Draufspringen besiegt`, wf.seen.wurf_hammer >= 3 && wf.seen.wurf_bumerang >= 2 && wf.caught >= 1 && wf.seen.feuerkugel >= 2 && wf.stomp);

const wh = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const h = t.ent('horde_y');
  // wartet, bis die Figur den Schacht betritt; dann steigt die Front
  t.place([0, 1, t.Z(6, 3)], { settle: 30 });
  out.wait = h.state;
  const fig = [-11.5, 1, t.Z(6, 4)];
  t.place(fig, { settle: 1 });
  let n = 0, y0 = h.front;
  for (; n < 120 * 4 && h.hits === 0; n++) c.step(1);
  out.bite = { state: h.state, front: t.r2(h.front), y0: t.r2(y0), t: t.r2(n / 120), hits: h.hits, hurt: t.hurt(), vy: t.r2(p.vel.y) };
  // oben auf der höchsten Wolkenstufe ist sie sicher, bis die Front dort ankommt
  const top = [-10, 11.0, t.Z(6, 11)];
  t.place(top, { settle: 2 });
  const hits0 = h.hits;
  let firstHit = -1;
  for (let i = 0; i < 120 * 12; i++) {
    c.step(1);
    if (h.hits > hits0 && firstHit < 0) { firstHit = h.front; break; }
    if (p.dead) break;
  }
  out.top = { firstHit: t.r2(firstHit), feet: t.r2(p.pos.y) };
  // Tod → Neustart: die Front springt zurück
  p.die('hit');
  for (let i = 0; i < 2400 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  c.step(2);
  out.reset = { front: t.r2(h.front), resets: h.resets, state: h.state };
  // waagerechte Horde: jagt nach −z, Rückstoß in Jagdrichtung
  const z = t.ent('horde_z');
  const zf = [11.5, 1, t.Z(6, 7)];
  t.place(zf, { settle: 1 });
  let k = 0;
  p.hurt.bind(p);
  for (; k < 120 * 8 && z.hits === 0; k++) { p.pos.set(zf[0], zf[1], zf[2]); p.vel.set(0, 0, 0); p.mode = 'ground'; c.step(1); }
  out.flat = { hits: z.hits, front: t.r2(z.info().front), t: t.r2(k / 120), vz: t.r2(p.vel.z), state: z.state };
  return out;
});
console.log(`  Wuschel-Horde: ${JSON.stringify(wh)}`);
check(`Wuschel-Horde wartet bis zum Betreten (${wh.wait}), steigt dann (${wh.bite.y0} → ${wh.bite.front} m in ${wh.bite.t} s) und verletzt (Rückstoß nach oben ${wh.bite.vy} m/s)`, wh.wait === 'wait' && wh.bite.state === 'run' && wh.bite.hits >= 1 && wh.bite.hurt && wh.bite.t > 0.8 && wh.bite.t < 2 && wh.bite.vy > 5);
check(`Oben auf der Wolkenstufe sicher, bis die Front die Füße erreicht (Treffer bei Front ${wh.top.firstHit} m, Füße ${wh.top.feet} m)`, wh.top.firstHit > 10.5 && wh.top.firstHit <= 11.3);
check(`Tod → Neustart: die Front springt zurück (${wh.reset.front} m, ${wh.reset.resets}×)`, wh.reset.resets >= 1 && wh.reset.front < 0);
check(`Waagerechte Horde jagt nach −z und verletzt (nach ${wh.flat.t} s, Front z ${wh.flat.front}, Rückstoß vz ${wh.flat.vz})`, wh.flat.hits >= 1 && wh.flat.t > 2 && wh.flat.vz < -2);

const pm = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const pil = t.ent('pm_pilz');
  const fig = [pil.pos.x + 3.5, 1, pil.pos.z];
  // ohne Maske: der Pilzling sieht die Figur und verfolgt sie
  const look = (f, n, e, faceIt = true) => { let st = new Set(); p.hurt = () => false; for (let i = 0; i < n; i++) { p.pos.set(f[0], f[1], f[2]); p.vel.set(0, 0, 0); if (faceIt) t.face(e.pos.x, e.pos.z); else t.face(e.pos.x + 2 * (f[0] - e.pos.x), e.pos.z + 2 * (f[2] - e.pos.z)); c.step(1); st.add(e.state); } delete p.hurt; return [...st]; };
  t.place(fig, { settle: 1 });
  t.mask(false);
  out.none = look(fig, 90, pil);
  // mit Maske, zugewandt: übersieht sie
  pil.setState('walk'); pil.pos.set(pil.spec.pos[0], pil.spec.pos[1], pil.spec.pos[2]);
  out.masked = t.mask(true);
  out.maskedFacing = look(fig, 120, pil);
  // mit Maske, abgewandt: sieht sie wieder
  out.maskedAway = look(fig, 90, pil, false);
  // weitere sehende Gegner mit Maske (zugewandt)
  const kp = t.ent('pm_krall'), sp = t.ent('pm_spuk'), sb = t.ent('pm_schubser'), st = t.ent('pm_stachel'), wo = t.ent('pm_wolke'), hb = t.ent('pm_hack');
  const kf = [kp.pos.x + 3, 1, kp.pos.z];
  const k1 = look(kf, 120, kp);
  const s1 = look([sp.pos.x + 3, 1, sp.pos.z], 120, sp);
  const b1 = look([sb.pos.x, 1, sb.pos.z - 3.5], 150, sb);
  const th0 = st.throws;
  look([st.pos.x - 4, 1, st.pos.z - 2], 360, st);
  const w0 = wo.yaw;
  look([wo.pos.x - 4, 1, wo.pos.z], 360, wo);
  const h1 = look([hb.pos.x - 2.5, 1, hb.pos.z], 150, hb);
  out.others = { krall: k1, spuk: s1, schubser: b1, stachelThrows: st.throws - th0, wolkeTurn: t.r2(Math.abs(wo.yaw - w0)), hack: h1 };
  // ohne Maske: dieselben Gegner reagieren
  t.mask(false);
  const k2 = look(kf, 120, kp), b2 = look([sb.pos.x, 1, sb.pos.z - 3.5], 150, sb);
  const th1 = st.throws;
  look([st.pos.x - 4, 1, st.pos.z - 2], 400, st);
  out.unmasked = { krall: k2, schubser: b2, stachelThrows: st.throws - th1 };
  out.api = typeof L.isMaskedFrom === 'function' ? 'isMaskedFrom' : 'Rückfall';
  return out;
});
console.log(`  Pilz-Maske: ${JSON.stringify(pm)}`);
check(`Ohne Maske verfolgt der Pilzling die Figur (${pm.none.join('/')})`, pm.none.includes('chase') || pm.none.includes('alert'));
check(`Mit Pilz-Maske (${pm.api}), zugewandt: der Pilzling übersieht sie (${pm.maskedFacing.join('/')}); abgewandt sieht er sie (${pm.maskedAway.join('/')})`, pm.masked && !pm.maskedFacing.includes('chase') && !pm.maskedFacing.includes('alert') && (pm.maskedAway.includes('chase') || pm.maskedAway.includes('alert')));
check(`Maske: Krallen-Pilzling, Spuk, Schubser, Stachelwerfer, Pustewolke, Hackbeil-Pilz übersehen die zugewandte Figur (${JSON.stringify(pm.others)})`,
  !pm.others.krall.includes('alert') && !pm.others.spuk.includes('shy') && !pm.others.spuk.includes('chase') && !pm.others.schubser.includes('warn') && !pm.others.schubser.includes('charge')
  && pm.others.stachelThrows === 0 && pm.others.wolkeTurn < 0.05 && !pm.others.hack.includes('raise') && !pm.others.hack.includes('chop'));
check(`Ohne Maske reagieren sie (${JSON.stringify(pm.unmasked)})`, pm.unmasked.krall.includes('alert') && pm.unmasked.schubser.includes('warn') && pm.unmasked.stachelThrows >= 1);

const bs = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level;
  const KINDS = ['wuschel', 'kreisgeist', 'kreisgeist_kreis', 'rankenschnapper', 'brummer', 'projektilkopf', 'suchkopf', 'kanone_turm', 'zuendkopf', 'marschblock', 'rollpilz', 'pilzling', 'pilzlingsturm', 'schnappblume', 'feuer_schnappblume', 'spuk', 'stachelwalze', 'walzenwerfer', 'riesenprojektil', 'riesenkanone', 'stampfstein', 'feuer_werfer', 'hammer_werfer', 'bumerang_werfer', 'kickbombe', 'flossling',
    'schubser', 'pustewolke', 'glotzfisch', 'stachelwerfer', 'stachelkugel_wurf', 'wuschel_horde', 'schubser_prinz', 'wuerfelblase', 'gelee_brocken', 'wirbelbrocken', 'wirbelbrocken_attrappe'];
  const missing = KINDS.filter((k) => !L.hasKind(k));
  const ids = ['b_wuschel', 'b_kreisgeist', 'b_ranke', 'b_brummer', 'b_kanone', 'b_zuend', 'b_marsch', 'b_rollpilz', 'b_pilzling', 'b_schnapp', 'b_feuerblume', 'b_walze', 'b_stampf', 'b_gelee', 'b_spuk'];
  const absent = ids.filter((id) => !t.ent(id));
  const ph = ids.filter((id) => t.ent(id)?.model?.placeholder);
  // Gelee-Brocken einzeln: hüpft, Draufspringen besiegt (1 Bitcoin)
  const g = t.ent('b_gelee');
  t.until(() => g.hops >= 2, 900, [g.pos.x + 5, 1, g.pos.z]);
  const c0 = t.coins();
  const st = t.stomp(g, { h: 0.5 });
  c.step(3);
  return { missing, absent, ph, gelee: { hops: g.hops, bounced: st.bounced, defeated: g.defeated, coins: t.coins() - c0 } };
});
console.log(`  Bestand: ${JSON.stringify(bs)}`);
check(`Bestand der Welt-6-Liste als kind vorhanden (${bs.missing.join(', ') || 'vollständig'}), im Zoo ohne Platzhalter`, bs.missing.length === 0 && bs.absent.length === 0 && bs.ph.length === 0);
check(`Gelee-Brocken einzeln: hüpft (${bs.gelee.hops}), Draufspringen besiegt (+${bs.gelee.coins} Bitcoin)`, bs.gelee.hops >= 2 && bs.gelee.bounced && bs.gelee.defeated && bs.gelee.coins === 1);
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 3: Endgegner (0-25)
// =====================================================================================================================
const BOSS_HELPERS = () => {
  const c = window.__course, t = window.__t;
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
  if (hud && !hud._w6) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._w6 = true; }
  /** Bis Zustand s des Endgegners b (Figur unverwundbar an pos). */
  t.untilState = (b, s, n = 3000, pos = null) => t.until(() => b.state === s, n, pos);
};

if (want(3)) {
await load('0-25');
await sc(BOSS_HELPERS);
console.log('Teil 3: Endgegner 0-25');
const pr = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('prinz');
  const out = {};
  out.before = { state: b.state, hp: b.hp, model: t.model(b) };
  const a = t.enter([0, 2, 14], 'prinz');
  out.start = { started: a.started, active: a.active, state: b.state, hud: a.hud?.boss?.hp, name: a.hud?.boss?.name, lock: a.lock };
  // Ablauf: aim → charge → skid → fire (Feuerkugel)
  const fig = [5, 2, 4];
  const seq = [b.state];
  let fb = 0;
  const seenFb = new Set();
  p.hurt = () => false;
  for (let i = 0; i < 120 * 9; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (seq[seq.length - 1] !== b.state) seq.push(b.state);
    for (const e of L.entities) if (e.kind === 'feuerkugel' && !seenFb.has(e)) { seenFb.add(e); fb++; }
  }
  delete p.hurt;
  out.loop = { seq: seq.slice(0, 9).join('>'), fireballs: fb, charges: b.charges };
  // Rammstoß verletzt und schleudert die Figur weg
  t.untilState(b, 'aim', 1200, fig);
  t.place([b.pos.x + 3.2, 2, b.pos.z], { settle: 1 });
  t.fresh();
  let rammed = null;
  for (let i = 0; i < 240 && !rammed; i++) { c.step(1); if (b.rams > 0) rammed = { hurt: t.hurt(), v: t.r2(Math.hypot(p.vel.x, p.vel.z)) }; }
  out.ram = rammed;
  t.fresh();
  // Draufspringen (nicht benommen): Abprall, kein Treffer, er rutscht; Angriffe schaden nicht
  t.untilState(b, 'aim', 1200, [0, 2, 6]);
  const hd = t.stomp(b, { h: 0.8 });
  out.head = { ...hd, hp: b.hp, state: b.state, bounces: b.bounces };
  t.untilState(b, 'aim', 1200, [0, 2, 6]);
  b.onHit('fire', p); b.onHit('claw', p); b.onHit('star', p); b.onHit('mega', p); b.onHit('bomb', p);
  out.attacks = { hp: b.hp, pushes: b.pushes };
  // Treffer: in die Röhre stoßen (er steht links vor der Mündung L0), zweiter Stoß durch Gegenrennen, gequetscht heraus, Tritt
  const kick = (pipeZ, side) => {
    t.untilState(b, 'aim', 2400, [0, 2, 6]);
    const mx = side < 0 ? -6.5 : 6.5;
    b.pos.set(mx, 2, pipeZ); b.vel.set(0, 0, 0); b.slide.x = 0; b.slide.z = 0;
    // Figur rennt von der Arenamitte her gegen ihn (Richtung Wand)
    t.place([mx - side * 3.2, 2, pipeZ], { settle: 1, yaw: side < 0 ? Math.PI : 0 });
    const s1 = [b.state];
    for (let i = 0; i < 60 && b.state === 'aim'; i++) { c.setInput({ x: side, run: true }); c.step(1); }
    c.setInput({});
    for (let i = 0; i < 300 && b.state !== 'stuck'; i++) { c.step(1); if (s1[s1.length - 1] !== b.state) s1.push(b.state); }
    const stuck = { seq: s1.join('>'), state: b.state, pipe: b.pipe?.id ?? null };
    // zweiter Stoß: Figur läuft gegen den Steckenden
    t.place([b.pos.x - side * 2.6, 2, b.pos.z], { settle: 1, yaw: side < 0 ? Math.PI : 0 });
    for (let i = 0; i < 120 && b.state === 'stuck'; i++) { c.setInput({ x: side, run: true }); c.step(1); }
    c.setInput({});
    const s2 = [b.state];
    let vis = 0, n = 0;
    for (let i = 0; i < 900 && b.state !== 'stunned'; i++) { c.step(1); if (s2[s2.length - 1] !== b.state) s2.push(b.state); if (b.state === 'pipe') { n++; if (b.model?.root?.visible) vis++; } }
    const trip = { seq: s2.join('>'), log: b.tripLog[b.tripLog.length - 1], x: t.r2(b.pos.x), z: t.r2(b.pos.z), vis: n ? t.r2(vis / n) : 0 };
    const hp0 = b.hp;
    const st = t.stomp(b, { h: 0.8 });
    return { stuck, trip, kick: { ...st, hit: b.hp < hp0, hp: b.hp, hud: t.arch().hud?.boss?.hp } };
  };
  out.hit1 = kick(0, -1);
  // Phase 2: zwei Feuerkugeln je Spucken
  const fb2 = new Set();
  const per2 = [];
  t.untilState(b, 'fire', 2400, [5, 2, 4]);
  t.until(() => b.state !== 'fire', 300, [5, 2, 4]);
  for (const e of L.entities) if (e.kind === 'feuerkugel' && e.owner === b && e.age < 0.6) fb2.add(e);
  out.phase2 = { phase: b.phase, fire: fb2.size, banners: t.banners.slice(-3) };
  out.hit2 = kick(6, 1);
  const fb3 = new Set();
  t.untilState(b, 'fire', 2400, [5, 2, -4]);
  t.until(() => b.state !== 'fire', 300, [5, 2, -4]);
  for (const e of L.entities) if (e.kind === 'feuerkugel' && e.owner === b && e.age < 0.6) fb3.add(e);
  out.phase3 = { phase: b.phase, fire: fb3.size, banners: t.banners.slice(-3) };
  out.hit3 = kick(-6, -1);
  out.def = { state: b.state, defeated: b.defeated, banners: t.banners.slice(-2) };
  t.untilState(b, 'gone', 900, [0, 2, 6]);
  c.step(4);
  out.gone = { state: b.state, visible: b.visible, won: t.arch().won, warp: t.ent('warp_a').hidden, star: t.count('star'), lock: t.arch().lock };
  // Stern einsammeln, Warp-Box → Arena B
  const star = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (star) t.place([star.pos.x, star.pos.y, star.pos.z], { settle: 60 });
  out.starTaken = !L.entities.some((e) => e.kind === 'star' && !e.removed);
  const w = t.ent('warp_a');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -40 && p.mode !== 'script') { arrived = true; break; } }
  out.warp = { arrived, z: t.r2(p.pos.z) };
  out.info = b.info();
  return out;
});
console.log(`  Schubser-Prinz: ${JSON.stringify(pr)}`);
check(`Kampf beginnt beim Betreten (Lebensleiste „${pr.start.name}“ 3/3, Sperre, aktiver Kampf ${pr.start.active})`, pr.before.model === 'schubser_prinz' && pr.start.started && pr.start.active === 'prinz' && pr.start.state === 'intro' && pr.start.hud === 3 && pr.start.lock);
check(`Ablauf: Anlauf, Rammen, Ausrutschen, Feuerball (${pr.loop.seq}; ${pr.loop.fireballs} Feuerkugeln)`, /aim>charge>skid>fire>aim/.test(pr.loop.seq) && pr.loop.fireballs >= 1);
check(`Rammstoß verletzt und schleudert weg (${JSON.stringify(pr.ram)})`, pr.ram && pr.ram.hurt && pr.ram.v >= 8);
check('Draufspringen außerhalb der Benommenheit: Abprall, kein Treffer, er rutscht; Angriffe schaden nicht', pr.head.bounced && !pr.head.hurt && pr.head.hp === 3 && pr.head.bounces >= 1 && pr.attacks.hp === 3 && pr.attacks.pushes >= 2);
check(`Gegenrennen stößt ihn in die Röhre (${pr.hit1.stuck.seq}, ${pr.hit1.stuck.pipe}); zweiter Stoß: hindurch (${pr.hit1.trip.seq}, ${JSON.stringify(pr.hit1.trip.log)}, sichtbar ${pr.hit1.trip.vis})`, pr.hit1.stuck.state === 'stuck' && pr.hit1.stuck.pipe === 'L0' && /pipe>squeezed>stunned/.test(pr.hit1.trip.seq) && pr.hit1.trip.log?.to === 'R0' && pr.hit1.trip.vis > 0.9 && pr.hit1.trip.x > 2);
check(`Benommen: Tritt = Treffer (3 → ${pr.hit1.kick.hp}, Lebensleiste ${pr.hit1.kick.hud})`, pr.hit1.kick.bounced && pr.hit1.kick.hit && pr.hit1.kick.hp === 2 && pr.hit1.kick.hud === 2);
check(`Phase 2: ${pr.phase2.fire} Feuerkugeln, Ansage (${pr.phase2.banners.join(' | ')}); Treffer 2 über die Röhre R6 → L6`, pr.phase2.phase === 2 && pr.phase2.fire === 2 && pr.phase2.banners.includes('Er wird schneller!') && pr.hit2.stuck.pipe === 'R6' && pr.hit2.trip.log?.to === 'L6' && pr.hit2.kick.hp === 1);
check(`Phase 3: ${pr.phase3.fire} Feuerkugeln, Ansage; Treffer 3 besiegt ihn (${pr.def.state})`, pr.phase3.phase === 3 && pr.phase3.fire === 3 && pr.phase3.banners.includes('Jetzt spuckt er drei Feuerbälle!') && pr.hit3.kick.hp === 0 && pr.def.defeated && pr.def.banners.some((x) => /Schubser-Prinz ist besiegt/.test(x)));
check('Danach: gone, Archetyp siegt, Stern erscheint, Warp-Box sichtbar, Sperre weg; Stern einsammeln, Warp-Box → Arena B', pr.gone.state === 'gone' && !pr.gone.visible && pr.gone.won && pr.gone.warp === false && pr.gone.star === 1 && !pr.gone.lock && pr.starTaken && pr.warp.arrived);

// Würfelblase
const wb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('blase');
  const out = {};
  const a = t.enter([0, 2, -50.5], 'blase');
  out.start = { started: a.started, active: a.active, state: b.state, name: a.hud?.boss?.name, model: t.model(b) };
  // Auftritt: Brocken ploppen heraus und hüpfen zu ihr, sie gehen in ihr auf → silberner Riese
  const fig = [7, 2, -64];
  t.untilState(b, 'gather', 900, fig);
  out.pop = { bits: t.count('gelee_brocken') };
  const seq = [b.state];
  let markerSeen = false, waveHurt = 0, landHurt = 0, wavesJumped = 0;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 8 && b.state !== 'gcrouch'; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); if (seq[seq.length - 1] !== b.state) seq.push(b.state); }
  delete p.hurt;
  out.form = { seq: seq.join('>'), size: b.info().giantSize, merged: b.merged, model: b.giant?.root?.userData?.modelName ?? b.giant?.root?.name };
  // Sprung: Landemarke an der Stelle der Figur, Aufprall im Grundriss verletzt
  t.place(fig, { settle: 0 });
  t.fresh();
  let target = null;
  for (let i = 0; i < 120 * 3 && b.state !== 'gland'; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (b.state === 'gair' && !target) target = { x: t.r2(b.jump.x1), z: t.r2(b.jump.z1), marker: !!b.marker?.root?.visible };
  }
  out.jump = { target, hurt: t.hurt(), landings: b.landings };
  t.fresh();
  // Schockwelle: am Boden verletzt sie, drübergesprungen nicht
  t.untilState(b, 'grest', 600, [9.5, 2, -60]);
  t.untilState(b, 'gair', 600, [9.5, 2, -60]);
  t.until(() => b.state === 'gland', 600, null);
  t.place([b.pos.x + b.S / 2 + 2.6, 2, b.pos.z], { settle: 0 });
  p.mode = 'ground';
  t.fresh();
  for (let i = 0; i < 60; i++) c.step(1);
  out.wave = { hurt: t.hurt(), waves: b.wavesN };
  t.fresh();
  t.untilState(b, 'gland', 600, [b.pos.x + 9, 2, b.pos.z]);
  const wx = b.pos.x + b.S / 2 + 2.6, wz = b.pos.z;
  t.place([wx, 2, wz], { settle: 0 });
  p.mode = 'ground';
  c.step(1);
  t.fresh();
  // springen, wenn die Welle naht
  let jumped = false;
  for (let i = 0; i < 90; i++) {
    const w = b.waves[0];
    if (!jumped && w && Math.hypot(wx - w.x, wz - w.z) - w.r < 1.2) { c.setInput({ jump: true }); jumped = true; }
    c.step(1);
  }
  c.setInput({});
  out.waveJump = { hurt: t.hurt(), jumped };
  t.fresh();
  // letzter Sprung: der Riese platzt, sie trennt sich und flieht – verwundbar
  t.untilState(b, 'flee', 120 * 10, [-8, 2, -60]);
  c.step(110);
  out.split = { state: b.state, splits: b.splits, vulnerable: b.vulnerable, bits: t.count('gelee_brocken'), hidden: !b.giant?.root?.visible };
  // Brocken besiegen verkleinert den nächsten Riesen
  const bits = t.ents('gelee_brocken').filter((x) => !x.defeated).slice(0, 4);
  let down = 0;
  for (const g of bits) { t.until(() => g.grounded, 200, [-8, 2, -60]); const s = t.stomp(g, { h: 0.5 }); if (s.bounced && g.defeated) down++; }
  out.bitsDown = { down, count: b.bitsDown, banners: t.banners.slice(-3) };
  // Hut-Treffer in der Flucht
  if (b.state !== 'flee') t.untilState(b, 'flee', 120 * 20, [-8, 2, -60]);
  t.until(() => b.vulnerable, 200, null);
  const hp0 = b.hp;
  const h1 = t.stomp(b, { h: 0.6 });
  out.hit1 = { ...h1, hit: b.hp < hp0, hp: b.hp, state: b.state };
  // nächster Riese kleiner, mehr Brocken (Phase 2), mehr Sprünge
  t.untilState(b, 'gcrouch', 120 * 14, [-8, 2, -60]);
  out.giant2 = { sizes: b.sizes.slice(), merged: b.merged, phase: b.phase, banners: t.banners.slice(-3) };
  const j0 = b.jumpsDone;
  t.untilState(b, 'flee', 120 * 14, [-8, 2, -60]);
  out.giant2.jumps = b.jumpsDone - j0;
  c.step(60);
  t.until(() => b.vulnerable, 200, null);
  t.stomp(b, { h: 0.6 });
  out.hit2 = { hp: b.hp };
  t.untilState(b, 'gcrouch', 120 * 14, [-8, 2, -60]);
  const j1 = b.jumpsDone;
  t.untilState(b, 'flee', 120 * 16, [-8, 2, -60]);
  out.giant3 = { jumps: b.jumpsDone - j1, sizes: b.sizes.slice() };
  c.step(60);
  t.until(() => b.vulnerable, 200, null);
  t.stomp(b, { h: 0.6 });
  out.hit3 = { hp: b.hp, state: b.state, defeated: b.defeated, banners: t.banners.slice(-2) };
  t.untilState(b, 'gone', 900, [-8, 2, -60]);
  c.step(4);
  out.gone = { state: b.state, won: t.arch().won, warp: t.ent('warp_b').hidden, star: t.count('star'), bits: t.count('gelee_brocken', (x) => !x.defeated) };
  const star = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (star) t.place([star.pos.x, star.pos.y, star.pos.z], { settle: 60 });
  out.starTaken = !L.entities.some((e) => e.kind === 'star' && !e.removed);
  const w = t.ent('warp_b');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -95 && p.mode !== 'script') { arrived = true; break; } }
  out.warp = { arrived };
  out.info = b.info();
  return out;
});
console.log(`  Würfelblase: ${JSON.stringify(wb)}`);
check(`Würfelblase: Kampf beginnt (${wb.start.name}), Brocken ploppen heraus (${wb.pop.bits})`, wb.start.started && wb.start.active === 'blase' && wb.start.model === 'wuerfelblase' && wb.pop.bits === 10);
check(`Brocken hüpfen zu ihr und fügen sich zum silbernen Riesen (${wb.form.seq}; Kante ${wb.form.size} m aus ${wb.form.merged} Brocken, Modell ${wb.form.model})`, /gather>form/.test(wb.form.seq) && wb.form.merged === 10 && Math.abs(wb.form.size - 3.2) < 0.01 && wb.form.model === 'gelee_riese');
check(`Riesensprung zur Figur mit Landemarke (${JSON.stringify(wb.jump.target)}), Aufprall verletzt`, wb.jump.target && wb.jump.target.marker && Math.hypot(wb.jump.target.x - 7, wb.jump.target.z + 64) < 0.8 && wb.jump.hurt);
check(`Schockwelle verletzt am Boden (${wb.wave.waves} Wellen), drübergesprungen nicht`, wb.wave.hurt && wb.waveJump.jumped && !wb.waveJump.hurt);
check(`Letzter Sprung: Riese platzt (${wb.split.bits} Brocken), sie flieht und ist verwundbar`, wb.split.state === 'flee' && wb.split.splits === 1 && wb.split.vulnerable && wb.split.bits === 10 && wb.split.hidden);
check(`Brocken von oben besiegt (${wb.bitsDown.down}), Ansage „Der nächste Riese wird kleiner!“`, wb.bitsDown.down >= 3 && wb.bitsDown.count >= 3 && wb.bitsDown.banners.includes('Der nächste Riese wird kleiner!'));
check(`Hut-Treffer in der Flucht (3 → ${wb.hit1.hp})`, wb.hit1.bounced && wb.hit1.hit && wb.hit1.hp === 2);
check(`Nächster Riese aus weniger Brocken kleiner (${wb.giant2.sizes.join(' → ')} m, ${wb.giant2.merged} Brocken), Phase 2 mit ${wb.giant2.jumps} Sprüngen, Ansage`, wb.giant2.sizes.length === 2 && wb.giant2.sizes[1] < wb.giant2.sizes[0] && wb.giant2.phase === 2 && wb.giant2.jumps === 4 && wb.giant2.banners.includes('Mehr Gelee-Brocken!'));
check(`Phase 3: ${wb.giant3.jumps} Sprünge; Treffer 3 besiegt sie (${wb.hit3.state})`, wb.hit2.hp === 1 && wb.giant3.jumps === 5 && wb.hit3.hp === 0 && wb.hit3.defeated && wb.hit3.banners.some((x) => /Würfelblase ist besiegt/.test(x)));
check('Danach: gone, Brocken weg, Stern, Warp-Box; Stern einsammeln, Warp-Box → Arena C', wb.gone.state === 'gone' && wb.gone.won && wb.gone.warp === false && wb.gone.star === 1 && wb.gone.bits === 0 && wb.starTaken && wb.warp.arrived);

// Wirbelbrocken mit Attrappen
const wr = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const b = t.ent('wirbel6');
  const out = {};
  const a = t.enter([0, 2, -101.5], 'wirbel6');
  out.start = { started: a.started, active: a.active, state: b.state };
  const fig = [4, 2, -106];
  const hit = () => {
    t.untilState(b, 'stunned', 120 * 20, fig);
    const hp0 = b.hp;
    const s = t.stomp(b, { h: 0.8 });
    return { ...s, hit: b.hp < hp0, hp: b.hp };
  };
  out.hit1 = hit();
  // Teleport: verpufft, erscheint auf einem Ringplatz mit 1 Attrappe
  const seq = [b.state];
  t.until(() => { if (seq[seq.length - 1] !== b.state) seq.push(b.state); return b.state === 'run'; }, 600, fig);
  out.tele1 = { seq: seq.join('>'), decoys: b.decoys, teleports: b.teleports, banners: t.banners.slice(-2), models: t.ents('wirbelbrocken_attrappe').map((d) => t.model(d)) };
  // Attrappe im Takt; Draufspringen lässt sie verpuffen, kein Treffer
  const d = t.ents('wirbelbrocken_attrappe')[0];
  t.until(() => b.state === 'spin', 600, fig);
  const sync = d ? d.state : null;
  t.until(() => b.state === 'stunned', 120 * 10, fig);
  const hp0 = b.hp;
  const ds = d ? t.stomp(d, { h: 0.8 }) : null;
  c.step(70);
  out.decoy = { sync, bounced: ds?.bounced, poofed: d ? d.removed : null, hp: b.hp, same: b.hp === hp0, popped: b.decoysPopped };
  // Attrappe verletzt im Wirbel
  out.hit2 = hit();
  t.until(() => b.state === 'run', 600, fig);
  out.tele2 = { decoys: b.decoys, made: b.decoysMade };
  t.until(() => b.state === 'spin', 600, fig);
  const d2 = t.ents('wirbelbrocken_attrappe').find((x) => x.state === 'spin');
  out.decoyHurt = d2 ? t.touch(d2, 30) : null;
  t.fresh();
  out.hit3 = hit();
  t.untilState(b, 'gone', 900, fig);
  c.step(4);
  out.gone = { state: b.state, won: t.arch().won, warp: t.ent('warp_c').hidden, decoys: t.count('wirbelbrocken_attrappe') };
  const w = t.ent('warp_c');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -135 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 2400 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 3600 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  out.info = b.info();
  return out;
});
console.log(`  Wirbelbrocken mit Attrappen: ${JSON.stringify(wr)}`);
check(`Wirbelbrocken (6-Panzer): Treffer 1 (${wr.hit1.hp}) → Teleport mit 1 Attrappe (${wr.tele1.seq}, ${wr.tele1.decoys}), Ansage`, wr.start.active === 'wirbel6' && wr.hit1.hit && wr.hit1.hp === 2 && /hit>teleport>hidden>appear>run/.test(wr.tele1.seq) && wr.tele1.decoys === 1 && wr.tele1.models[0] === 'wirbelbrocken_attrappe' && wr.tele1.banners.includes('Nur der echte Wirbelbrocken zählt!'));
check(`Attrappe läuft im Takt (${wr.decoy.sync}), Draufspringen lässt sie verpuffen – kein Treffer`, wr.decoy.sync === 'spin' && wr.decoy.bounced && wr.decoy.poofed && wr.decoy.same && wr.decoy.popped === 1);
check(`Treffer 2 (${wr.hit2.hp}) → 2 Attrappen (${wr.tele2.decoys}); Fäuste der Attrappe verletzen`, wr.hit2.hit && wr.hit2.hp === 1 && wr.tele2.decoys === 2 && wr.decoyHurt === true);
check('Treffer 3 besiegt ihn, Attrappen weg, Warp-Box → Zielmast beendet das Level', wr.hit3.hit && wr.hit3.hp === 0 && wr.gone.state === 'gone' && wr.gone.won && wr.gone.warp === false && wr.gone.decoys === 0 && wr.finish.arrived && wr.finish.finished);

// Tod im Kampf setzt jeden Kampf zurück
await load('0-25');
await sc(BOSS_HELPERS);
const rs = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const die = () => { p.die('hit'); for (let i = 0; i < 2400 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1); c.step(10); };
  // Prinz: in der Röhre steckend sterben
  const b = t.ent('prinz');
  t.enter([0, 2, 14], 'prinz');
  t.untilState(b, 'aim', 1200, [5, 2, 4]);
  b.pos.set(-6.5, 2, 0); b.onHit('claw', { pos: { x: -3, y: 2, z: 0 } });
  t.untilState(b, 'stuck', 300, [5, 2, 4]);
  b.onHit('claw', { pos: { x: -3, y: 2, z: 0 } });
  t.untilState(b, 'stunned', 900, [5, 2, 4]);
  t.stomp(b, { h: 0.8 });
  const before = { hp: b.hp, fire: t.count('feuerkugel') };
  die();
  out.prinz = { before, state: b.state, hp: b.hp, z: t.r2(b.pos.z), started: t.arch().started, deaths: t.arch().deaths, fire: t.count('feuerkugel', (f) => f.owner === b) };
  const again = t.enter([0, 2, 14], 'prinz');
  out.prinz.again = again.started && b.state === 'intro';
  // Würfelblase: Riese aktiv, Brocken unterwegs
  const wb = t.ent('blase');
  p.reset([0, 2.3, -50.5]); L.runtime.setCheckpoint([0, 2, -50.5], Math.PI / 2);
  c.arch.resetFight?.call(c.arch);
  t.enter([0, 2, -50.5], 'blase');
  t.untilState(wb, 'gair', 120 * 12, [8, 2, -60]);
  out.blaseBefore = { state: wb.state, bits: t.count('gelee_brocken') };
  die();
  out.blase = { state: wb.state, hp: wb.hp, bits: t.count('gelee_brocken'), giant: !!wb.giant?.root?.visible, started: t.arch().started, active: t.arch().active, waves: wb.waves.length };
  // Wirbelbrocken mit Attrappe
  const wr = t.ent('wirbel6');
  L.runtime.setCheckpoint([0, 2, -101.5], Math.PI / 2);
  t.enter([0, 2, -101.5], 'wirbel6');
  t.untilState(wr, 'stunned', 120 * 20, [4, 2, -106]);
  t.stomp(wr, { h: 0.8 });
  t.until(() => wr.state === 'run', 600, [4, 2, -106]);
  out.wirbelBefore = { hp: wr.hp, decoys: wr.decoys };
  die();
  out.wirbel = { state: wr.state, hp: wr.hp, decoys: t.count('wirbelbrocken_attrappe'), visible: wr.visible };
  return out;
});
console.log(`  Tod im Kampf: ${JSON.stringify(rs)}`);
check('Tod im Kampf (Prinz): Neustart, Prinz 3/3 am Start, keine Feuerkugeln, Kampf von vorn', rs.prinz.before.hp === 2 && rs.prinz.state === 'wait' && rs.prinz.hp === 3 && rs.prinz.z === -5 && !rs.prinz.started && rs.prinz.deaths === 1 && rs.prinz.fire === 0 && rs.prinz.again);
check(`Tod im Kampf (Würfelblase): alles zurück (${JSON.stringify(rs.blase)})`, rs.blaseBefore.state === 'gair' && rs.blase.state === 'wait' && rs.blase.hp === 3 && rs.blase.bits === 0 && !rs.blase.giant && !rs.blase.started && rs.blase.waves === 0);
check(`Tod im Kampf (Wirbelbrocken): 3/3, Attrappen weg (${JSON.stringify(rs.wirbel)})`, rs.wirbelBefore.decoys === 1 && rs.wirbel.state === 'wait' && rs.wirbel.hp === 3 && rs.wirbel.decoys === 0 && rs.wirbel.visible);
check('Keine Konsolenfehler (Teil 3)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 4: Bilder (Kurs-Kamera) und Zeichenaufrufe
// =====================================================================================================================
if (want(4)) {
await load('0-24');
console.log('Teil 4: Bilder');
const S = {};
S.schubser = await SHOT('w6e', 'schubser_rammt', () => {
  const c = window.__course, t = window.__t, p = c.player, s = t.ent('sb_lava');
  const fig = [-11.5, 2.5, -16.8];
  t.place(fig, { settle: 1 });
  t.until(() => s.state === 'charge' && s.stateT > 0.15, 600, fig);
  t.face(s.pos.x, s.pos.z);
});
S.gestossen = await SHOT('w6e', 'schubser_gestossen', () => {
  const c = window.__course, t = window.__t, p = c.player, w = t.ent('sb_wasser');
  t.until(() => w.pos.x > 13 && w.state === 'walk', 1800, [0, 1, 0]);
  t.place([w.pos.x - 1.4, 2.5, w.pos.z + 1.2], { settle: 1 });
  w.onHit('claw', { pos: { x: w.pos.x - 1.6, y: w.pos.y, z: w.pos.z } });
  c.step(36);
  t.face(w.pos.x, w.pos.z);
});
S.wolke = await SHOT('w6e', 'pustewolke_pustet', () => {
  const c = window.__course, t = window.__t, p = c.player, w = t.ent('pw_fest');
  const fig = [-12.8, 1, w.pos.z + 0.3];
  t.until(() => w.state === 'blow' && w.stateT > 0.45, 1500, fig);
  t.place(fig, { settle: 0 });
  p.pos.y += 1.0; p.mode = 'air'; p.vel.set(0, 2, 0);
  c.step(14);
  t.face(w.pos.x, w.pos.z);
});
S.luftholen = await SHOT('w6e', 'pustewolke_luftholen', () => {
  const c = window.__course, t = window.__t, w = t.ent('pw_dreh');
  t.until(() => w.state === 'inhale' && w.stateT > 0.5, 1500, [w.pos.x - 3.5, 1, w.pos.z + 2]);
  t.face(w.pos.x, w.pos.z);
});
S.glotz = await SHOT('w6e', 'glotzfisch_eissee', () => {
  const c = window.__course, t = window.__t, f = t.ent('gf_eis');
  const fig = [-13.75, 2.1, t.Z(3, 3.5)];
  t.until(() => f.state === 'jump' && Math.abs(f.stateT / f.flight - 0.5) < 0.02, 1500, fig);
  t.face(f.pos.x, f.pos.z);
});
S.glotz2 = await SHOT('w6e', 'glotzfisch_lugt', () => {
  const c = window.__course, t = window.__t, f = t.ent('gf_ziel');
  const fig = [11, 2.55, t.Z(3, 7)];
  t.until(() => f.state === 'peek', 1500, fig);
  t.face(f.pos.x, f.pos.z);
});
S.stachel = await SHOT('w6e', 'stachelwerfer_wurf', () => {
  const c = window.__course, t = window.__t, w = t.ent('sw_wand');
  const fig = [-10.5, 1, w.pos.z + 1.5];
  t.until(() => w.state === 'throw' && w.stateT > 0.45, 1500, fig);
  t.face(w.pos.x, w.pos.z);
});
S.kugel = await SHOT('w6e', 'stachelkugel_rollt', () => {
  const c = window.__course, t = window.__t, h = t.ent('sw_hang');
  const fig = [7.5, 1, h.pos.z + 2.5];
  t.until(() => c.level.entities.some((e) => e.kind === 'stachelkugel_wurf' && e.owner === h && e.state === 'roll' && e.pos.x < 13), 1800, fig);
  t.face(13, h.pos.z);
});
S.werfer = await SHOT('w6e', 'werfer_brueder', () => {
  const c = window.__course, t = window.__t;
  const fig = [0, 1, t.Z(5, 4)];
  t.until(() => c.level.entities.some((e) => e.kind === 'wurf_bumerang') && c.level.entities.some((e) => e.kind === 'wurf_hammer'), 1500, fig);
  t.face(-11, t.Z(5, 7));
});
S.horde = await SHOT('w6e', 'wuschel_horde_schacht', () => {
  const c = window.__course, t = window.__t, h = t.ent('horde_y');
  const fig = [-10, 5.6 + 0.6, t.Z(6, 6)];
  t.place([-11.5, 1, t.Z(6, 4)], { settle: 1 });
  t.until(() => h.front > 3.6, 900, fig);
  t.face(-11.5, t.Z(6, 9));
});
S.horde2 = await SHOT('w6e', 'wuschel_horde_jagd', () => {
  const c = window.__course, t = window.__t, h = t.ent('horde_z');
  const fig = [11.5, 1, t.Z(6, 9)];
  t.until(() => h.state === 'run' && h.front * -1 < t.Z(6, 3.5) + 0.1, 1500, fig);
  t.face(11.5, t.Z(6, 0));
});
S.maske = await SHOT('w6e', 'pilz_maske', () => {
  const c = window.__course, t = window.__t, pil = t.ent('pm_pilz');
  t.mask(true);
  const fig = [pil.pos.x + 3, 1, pil.pos.z + 1.5];
  t.place(fig, { settle: 1 });
  t.mask(true);
  for (let i = 0; i < 60; i++) { c.player.pos.set(fig[0], fig[1], fig[2]); t.face(pil.pos.x, pil.pos.z); c.step(1); }
});
S.bestand = await SHOT('w6e', 'bestand', () => {
  const c = window.__course, t = window.__t;
  t.mask(false);
  t.place([0, 1, t.Z(8, 3)], { settle: 90 });
  t.face(-11, t.Z(8, 7));
});
const zmax = Math.max(...Object.values(S).map((s) => s.calls));
KPI.zoo = { calls: zmax, tris: Math.round(Math.max(...Object.values(S).map((s) => s.triangles)) / 1000) };
console.log(`  Zeichenaufrufe Gegnerzoo: ${Object.entries(S).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${KPI.zoo.tris} k Dreiecke`);
check(`Gegnerzoo: Zeichenaufrufe < 140 (höchstens ${zmax})`, zmax < 140);

await load('0-25');
await sc(BOSS_HELPERS);
const B = {};
B.prinz = await SHOT('w6e', 'prinz_rammt', () => {
  const c = window.__course, t = window.__t, b = t.ent('prinz');
  t.enter([0, 2, 14], 'prinz');
  const fig = [-3, 2, 4];
  t.until(() => b.state === 'charge' && b.stateT > 0.35, 2400, fig);
  t.face(b.pos.x, b.pos.z);
});
B.feuer = await SHOT('w6e', 'prinz_feuerball', () => {
  const c = window.__course, t = window.__t, b = t.ent('prinz');
  const fig = [-3, 2, 4];
  t.until(() => b.state === 'fire' && b.stateT > 0.5, 2400, fig);
  c.step(10);
  t.face(b.pos.x, b.pos.z);
});
B.steckt = await SHOT('w6e', 'prinz_steckt', () => {
  const c = window.__course, t = window.__t, b = t.ent('prinz');
  t.until(() => b.state === 'aim', 2400, [0, 2, 6]);
  b.pos.set(-6.5, 2, 0); b.onHit('claw', { pos: { x: -3, y: 2, z: 0 } });
  t.until(() => b.state === 'stuck', 400, [0, 2, 6]);
  c.step(30);
  t.place([-4.5, 2, 2.5], { settle: 1 });
  t.face(b.pos.x, b.pos.z);
});
B.roehre = await SHOT('w6e', 'prinz_in_der_roehre', () => {
  const c = window.__course, t = window.__t, b = t.ent('prinz');
  b.onHit('claw', { pos: { x: -3, y: 2, z: 0 } });
  t.until(() => b.state === 'pipe' && b.stateT > b.trip.T * 0.45, 400, [0, 2, -4]);
  t.face(0, -14);
});
B.benommen = await SHOT('w6e', 'prinz_benommen', () => {
  const c = window.__course, t = window.__t, b = t.ent('prinz');
  t.until(() => b.state === 'stunned' && b.stateT > 0.4, 900, [0, 2, 4]);
  t.place([b.pos.x - 2.5, 2, b.pos.z + 2.5], { settle: 1 });
  t.face(b.pos.x, b.pos.z);
});
B.blase = await SHOT('w6e', 'wuerfelblase_sammelt', () => {
  const c = window.__course, t = window.__t, b = t.ent('blase');
  c.player.reset([0, 2.3, -50.5]);
  t.enter([0, 2, -50.5], 'blase');
  t.until(() => b.state === 'gather' && b.stateT > 1.0, 900, [3, 2, -53]);
});
B.riese = await SHOT('w6e', 'gelee_riese_springt', () => {
  const c = window.__course, t = window.__t, b = t.ent('blase');
  t.until(() => b.state === 'gair' && b.stateT > b.jump.T * 0.3, 1800, [3, 2, -55]);
  t.face(b.pos.x, b.pos.z);
});
B.welle = await SHOT('w6e', 'gelee_riese_schockwelle', () => {
  const c = window.__course, t = window.__t, b = t.ent('blase');
  t.until(() => b.state === 'gland', 900, [5, 2, -58]);
  c.player.pos.set(b.pos.x + 5, 2, b.pos.z + 2);
  c.step(30);
  t.face(b.pos.x, b.pos.z);
});
B.flucht = await SHOT('w6e', 'wuerfelblase_flieht', () => {
  const c = window.__course, t = window.__t, b = t.ent('blase');
  t.until(() => b.state === 'flee' && b.stateT > 0.9, 120 * 12, [5, 2, -58]);
  c.player.pos.set(b.pos.x + 3, 2, b.pos.z + 3);
  c.step(2);
  t.face(b.pos.x, b.pos.z);
});
B.attrappen = await SHOT('w6e', 'wirbelbrocken_attrappen', () => {
  const c = window.__course, t = window.__t, b = t.ent('wirbel6');
  c.player.reset([0, 2.3, -101.5]);
  t.enter([0, 2, -101.5], 'wirbel6');
  t.until(() => b.state === 'stunned', 120 * 20, [4, 2, -106]);
  t.stomp(b, { h: 0.8 });
  t.until(() => b.state === 'run' && b.stateT > 0.2, 600, [3, 2, -104]);
  t.face(0, -110);
});
B.puff = await SHOT('w6e', 'wirbelbrocken_attrappe_puff', () => {
  const c = window.__course, t = window.__t, b = t.ent('wirbel6');
  t.until(() => b.state === 'stunned', 120 * 10, [3, 2, -104]);
  const d = t.ents('wirbelbrocken_attrappe')[0];
  if (d) { t.stomp(d, { h: 0.8 }); c.step(12); }
  t.face(0, -110);
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
