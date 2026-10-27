// Kurs-Modus: Gegner der Halloween-Welt „Kürbisinsel“ in der Gruselwerkstatt (0-21) und Graf Brummbär auf dem Schlossdach
// (0-22) deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Kürbling (hüpft im Bogen heran,
// Streife, Draufspringen → zerplatzt mit Bitcoin, seitlich verletzt), Riesenkürbling (2 Treffer, zerfällt in 3 kleine),
// Klapperknochen (Streife, Draufspringen → Knochenhaufen harmlos, Zittern, setzt sich nach ≈ 4 s wieder zusammen, nur
// Stampfattacke auf den Haufen bzw. Feuer/Explosion besiegt), Flatterfledi (hängt, wacht auf, Sturzflug-Bogen durch die
// Figur, kehrt zurück; Draufspringen besiegt; kreisender Schwarm), Hexenhut-Hüpfer (Krempe federt in der Luft ab – hoher
// Abprall, gelandet platt), Kürbis-Bombe (tragen, werfen, Aufprall, Lunte, Kette, Stern entschärft), Halloween-Spuk und
// -Kreisgeister (Modelle, Verhalten unverändert); Graf Brummbär (Auftritt, Würfe mit roter Markierung, Kopfsprung prallt
// ab, nur zurückgeworfene Bomben treffen, Fledermaus-Schwarm mit Bitcoins, Phasen 2/3 mit mehr Bomben und Rundumwurf,
// Sieg → Konfetti, Stern, Warp → Ziel, Tod setzt alles zurück).
// Simulation nur über window.__course.step(n) (1 Schritt = 1/120 s) und setInput; Bilder tests/out/hwe_*.png.
// Aufruf: PORT_BASE=0 node tests/course_hw_enemies.mjs   (Port 4540; vorher npm run build)
//   HWE_PART=1 (Kürbling, Riesenkürbling, Klapperknochen) | 2 (Flatterfledi, Hexenhut-Hüpfer, Kürbis-Bombe, Spuke) |
//   3 (Graf Brummbär) | 4 (Bilder, Zeichenaufrufe) – ohne: alle Teile nacheinander (besser einzeln, je < 10 min).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4540;
const PART = process.env.HWE_PART ?? 'all';
const want = (n) => PART === 'all' || PART.split(',').includes(String(n));
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = async (fn, arg) => page.evaluate(fn, arg);

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
      /** Figur an e stellen (Hüllen berühren sich, von +x) und n Schritte halten; Treffer? */
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
      moveTo(pos, n = 20) { const p = P(); p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); p.mode = 'air'; c.setInput({}); c.step(n); },
      model: (e) => e?.model?.root?.userData?.modelName ?? e?.model?.root?.name ?? null,
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
  return sc(() => window.__course.stats());
};

// =====================================================================================================================
// Teil 0: Laden (immer)
// =====================================================================================================================
await load('0-21');
console.log('Gruselwerkstatt 0-21');
{
  const st0 = await sc(() => {
    const c = window.__course, t = window.__t;
    const kinds = {};
    for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    const models = {};
    for (const id of ['kb_jaeger', 'kb_riese', 'kk_streife', 'ff_haeng', 'ff_kreis', 'hh_jaeger', 'kbb_1', 'hw_spuk', 'hw_grossspuk', 'hw_kreisgeist', 'hw_kreis']) {
      const e = t.ent(id);
      models[id] = e?.model ? (e.model.placeholder ? 'PLATZHALTER' : t.model(e)) : null;
    }
    const swarm = t.ent('ff_schwarm');
    return { kinds, n: c.level.entities.length, models, swarm: swarm ? { members: swarm.members.length, view: !!swarm.view.mi } : null, hw: [t.ent('hw_spuk').halloween, t.ent('hw_kreisgeist').halloween, t.ent('hw_kreis').halloween] };
  });
  console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
  console.log(`  Modelle: ${JSON.stringify(st0.models)}`);
  const NEED = ['kuerbling', 'riesenkuerbling', 'klapperknochen', 'flatterfledi', 'flatterfledi_schwarm', 'flatterfledi_glied', 'hexenhut_huepfer', 'kuerbis_bombe', 'spuk', 'kreisgeist', 'kreisgeist_kreis', 'kreisgeist_glied'];
  check(`Alle Halloween-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
  const M = st0.models;
  check(`Halloween-Modelle angebunden (kein Platzhalter): ${Object.values(M).join(', ')}`, Object.values(M).every((m) => m && m !== 'PLATZHALTER')
    && M.kb_jaeger === 'kuerbling' && M.kk_streife === 'klapperknochen' && M.ff_haeng === 'flatterfledi' && M.hh_jaeger === 'hexenhut_huepfer' && M.kbb_1 === 'kuerbis_bombe');
  check(`Spuk/Großspuk/Kreisgeist/Kreisgeist-Kreis in Halloween-Optik (${M.hw_spuk}, ${M.hw_kreisgeist}, ${M.hw_kreis})`, st0.hw.every(Boolean) && M.hw_spuk === 'spuk_halloween' && M.hw_grossspuk === 'spuk_halloween' && M.hw_kreisgeist === 'kreisgeist_halloween' && M.hw_kreis === 'kreisgeist_kreis_halloween');
  check(`Fledermaus-Schwarm: 6 Glieder als eine Instanz-Gruppe (${JSON.stringify(st0.swarm)})`, st0.swarm?.members === 6 && st0.swarm.view);
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
  const smoke = await sc(() => { const c = window.__course; for (let i = 0; i < 1200; i++) c.step(1); return c.level.entities.length; });
  check(`10 s Simulation ohne Fehler (${smoke} Entitäten)`, errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 1: Kürbling, Riesenkürbling, Klapperknochen
// =====================================================================================================================
if (want(1)) {
await load('0-21');
console.log('Teil 1: Kürbling, Riesenkürbling, Klapperknochen');
const kb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const j = t.ent('kb_jaeger');
  // Verfolgen: Figur steht still, der Kürbling hüpft in Bögen heran
  const fig = [-6.5, 1, t.Z(1, 3)];
  t.place(fig, { settle: 1 });
  const d0 = Math.hypot(j.pos.x - fig[0], j.pos.z - fig[2]), y0 = j.pos.y;
  let peak = 0, dMin = 99;
  const seen = new Set();
  p.hurt = () => false;
  for (let i = 0; i < 720; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    peak = Math.max(peak, j.pos.y - y0); seen.add(j.state);
    dMin = Math.min(dMin, Math.hypot(j.pos.x - fig[0], j.pos.z - fig[2]));
  }
  delete p.hurt;
  out.chase = { d0: +d0.toFixed(2), dMin: +dMin.toFixed(2), hops: j.hops, peak: +peak.toFixed(2), states: [...seen].join('>') };
  // seitliche Berührung verletzt
  out.side = t.touch(j, 40);
  // Draufspringen: zerplatzt (Abprall), Bitcoin
  const c0 = t.coins();
  const st = t.stomp(j);
  c.step(2);
  out.stomp = { ...st, state: j.state, defeated: j.defeated, coins: t.coins() - c0 };
  c.step(120);
  out.stomp.removed = j.removed;
  // Streife: hüpft auf ihrer Bahn hin und her (sight 0), dreht an den Enden um
  const s = t.ent('kb_streife');
  t.place([0, 1, t.Z(1, 4)], { settle: 1 });
  let xMin = 99, xMax = -99, zDev = 0;
  p.hurt = () => false;
  for (let i = 0; i < 1800; i++) { p.pos.set(0, 1, t.Z(1, 4)); p.vel.set(0, 0, 0); c.step(1); xMin = Math.min(xMin, s.pos.x); xMax = Math.max(xMax, s.pos.x); zDev = Math.max(zDev, Math.abs(s.pos.z - t.Z(1, 11))); }
  delete p.hurt;
  out.patrol = { xMin: +xMin.toFixed(2), xMax: +xMax.toFixed(2), zDev: +zDev.toFixed(2), hops: s.hops };
  // Riesenkürbling: erster Treffer platt (hp 1), zweiter zerplatzt → 3 kleine Kürblinge, Bitcoins
  const g = t.ent('kb_riese');
  const g1 = t.stomp(g);
  out.giant1 = { ...g1, hp: g.hp, state: g.state, defeated: g.defeated };
  c.step(100);
  out.giant1.after = g.state;
  const kids0 = t.count('kuerbling');
  const gc0 = t.coins();
  const g2 = t.stomp(g);
  c.step(3);
  out.giant2 = { ...g2, hp: g.hp, state: g.state, defeated: g.defeated, kids: g.kids.length, kidsAir: g.kids.filter((k) => k.state === 'air').length, coins: t.coins() - gc0 };
  t.place([0, 1, t.Z(1, 2)], { settle: 1 });
  p.hurt = () => false;
  for (let i = 0; i < 480; i++) { p.pos.set(0, 1, t.Z(1, 2)); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  out.giant2.kidsAlive = g.kids.filter((k) => !k.removed && !k.defeated).length;
  out.giant2.kidsHopped = g.kids.filter((k) => k.hops >= 1).length;
  out.giant2.kidsGround = g.kids.filter((k) => Math.abs(k.pos.y - 1) < 0.05 || k.grounded).length;
  out.giant2.newKuerblinge = t.count('kuerbling') - kids0;
  // starker Treffer (Explosion) zerplatzt den Riesen ganz, ohne Kleine; Feuer zerplatzt einen kleinen
  const g3 = L.spawn('kuerbling', { riese: true, pos: [11.5, 1, t.Z(1, 12)], wake: 0.1 });
  g3.onHit('bomb', null);
  const k3 = L.spawn('kuerbling', { pos: [8, 1, t.Z(1, 12)], wake: 0.1 });
  k3.onHit('fire', p);
  out.strong = { giant: g3.state, kids: g3.kids.length, small: k3.state };
  return out;
});
console.log(`  Kürbling: ${JSON.stringify(kb)}`);
check(`Kürbling hüpft in Bögen auf die Figur zu (${kb.chase.hops} Hüpfer, Höhe ${kb.chase.peak} m, ${kb.chase.d0} → ${kb.chase.dMin} m; ${kb.chase.states})`, kb.chase.hops >= 3 && kb.chase.peak > 0.35 && kb.chase.dMin < 1.2 && /crouch/.test(kb.chase.states) && /air/.test(kb.chase.states) && /land/.test(kb.chase.states));
check('Kürbling: seitliche Berührung verletzt', kb.side);
check(`Kürbling: Draufspringen → zerplatzt (Abprall), ${kb.stomp.coins} Bitcoin, danach weg`, kb.stomp.bounced && !kb.stomp.hurt && kb.stomp.state === 'burst' && kb.stomp.defeated && kb.stomp.coins === 1 && kb.stomp.removed);
check(`Kürbling-Streife hüpft auf ihrer Bahn hin und her (x ${kb.patrol.xMin} … ${kb.patrol.xMax}, z-Abweichung ${kb.patrol.zDev} m)`, kb.patrol.xMin < -15 && kb.patrol.xMax > -9 && kb.patrol.zDev < 0.5 && kb.patrol.hops >= 6);
check('Riesenkürbling: erster Treffer drückt ihn platt (hp 2 → 1, Abprall), danach hüpft er weiter', kb.giant1.bounced && kb.giant1.hp === 1 && kb.giant1.state === 'hurt' && !kb.giant1.defeated && kb.giant1.after !== 'hurt');
check(`Riesenkürbling: zweiter Treffer → zerplatzt in 3 kleine Kürblinge (${kb.giant2.kidsAir} im Flug, ${kb.giant2.kidsHopped} hüpfen danach), ${kb.giant2.coins} Bitcoins`, kb.giant2.bounced && kb.giant2.state === 'burst' && kb.giant2.defeated && kb.giant2.kids === 3 && kb.giant2.kidsAir === 3 && kb.giant2.kidsAlive === 3 && kb.giant2.kidsHopped === 3 && kb.giant2.coins === 2);
check('Explosion zerplatzt den Riesen ganz (ohne Kleine), Feuer zerplatzt einen kleinen', kb.strong.giant === 'burst' && kb.strong.kids === 0 && kb.strong.small === 'burst');

const kk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const k = t.ent('kk_streife');
  // Streife: läuft auf der Bahn hin und her
  t.place([0, 1, t.Z(2, 4)], { settle: 1 });
  let xMin = 99, xMax = -99;
  p.hurt = () => false;
  for (let i = 0; i < 1800; i++) { p.pos.set(0, 1, t.Z(2, 4)); p.vel.set(0, 0, 0); c.step(1); xMin = Math.min(xMin, k.pos.x); xMax = Math.max(xMax, k.pos.x); }
  delete p.hurt;
  out.walk = { xMin: +xMin.toFixed(2), xMax: +xMax.toFixed(2), state: k.state };
  out.side = t.touch(k, 30);
  // Draufspringen: fällt zum Knochenhaufen zusammen (Abprall, nicht besiegt)
  const st = t.stomp(k);
  out.stomp = { ...st, state: k.state, lying: k.lying, defeated: k.defeated, collapses: k.collapses, halfY: +k.half.y.toFixed(2) };
  // Haufen harmlos und begehbar: hindurchlaufen und daraufstehen tut nichts
  t.fresh();
  let pileHurt = false;
  for (let i = 0; i < 40; i++) { p.pos.set(k.pos.x + 0.6 - i * 0.03, 1, k.pos.z); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) pileHurt = true; }
  // Zeit bis zum Wiederaufbau, Vorwarnung (Zittern) davor
  const t0 = k.lieT;
  let shiverAt = null, rebuildAt = null, walkAt = null, steps = 0;
  p.hurt = () => false;
  for (let i = 0; i < 1200 && walkAt === null; i++) {
    p.pos.set(0, 1, t.Z(2, 2)); p.vel.set(0, 0, 0);
    c.step(1); steps++;
    const tt = t0 + steps / 120;
    if (k.state === 'shiver' && shiverAt === null) shiverAt = tt;
    if (k.state === 'rebuild' && rebuildAt === null) rebuildAt = tt;
    if (k.state === 'walk' && rebuildAt !== null) walkAt = tt;
  }
  delete p.hurt;
  out.rebuild = { pileHurt, shiverAt: shiverAt && +shiverAt.toFixed(2), rebuildAt: rebuildAt && +rebuildAt.toFixed(2), walkAt: walkAt && +walkAt.toFixed(2), rebuilds: k.rebuilds, defeated: k.defeated, halfY: +k.half.y.toFixed(2) };
  out.sideAgain = t.touch(k, 90);
  // Stampfattacke: auf den Stehenden → nur Haufen; auf den Haufen → endgültig besiegt
  const s = t.ent('kk_stampf');
  const p1 = t.stomp(s, { pound: true, h: 1.8 });
  out.pound1 = { ...p1, state: s.state, defeated: s.defeated, lying: s.lying };
  c.step(40);
  const p2 = t.stomp(s, { pound: true, h: 1.8 });
  c.step(2);
  out.pound2 = { ...p2, state: s.state, defeated: s.defeated };
  c.step(130);
  out.pound2.removed = s.removed;
  // gewöhnliches Draufspringen auf den Haufen besiegt nicht
  const b = t.ent('kk_bombe');
  t.stomp(b);
  c.step(10);
  const jumpPile = t.stomp(b, { h: 1.0 });
  out.jumpPile = { ...jumpPile, defeated: b.defeated, lying: b.lying };
  // Feuer (Funkenblüte: echter Feuerball) besiegt den Stehenden endgültig, mit Beute
  const f = t.ent('kk_feuer');
  const coins0 = t.coins();
  t.place([f.pos.x, 1, f.pos.z + 3.2], { settle: 10, power: 'funken' });
  t.face(f.pos.x, f.pos.z);
  c.step(1);
  t.action();
  let fireSteps = 0;
  for (let i = 0; i < 240 && !f.defeated; i++) { c.step(1); fireSteps++; }
  out.fire = { defeated: f.defeated, state: f.state, steps: fireSteps, coins: t.coins() - coins0, power: p.power };
  return out;
});
console.log(`  Klapperknochen: ${JSON.stringify(kk)}`);
check(`Klapperknochen läuft hin und her (x ${kk.walk.xMin} … ${kk.walk.xMax})`, kk.walk.xMin < -15 && kk.walk.xMax > -9 && kk.walk.state === 'walk');
check('Klapperknochen: seitliche Berührung verletzt', kk.side);
check('Draufspringen → fällt zu einem Knochenhaufen zusammen (Abprall, nicht besiegt, flache Hülle)', kk.stomp.bounced && !kk.stomp.hurt && kk.stomp.lying && !kk.stomp.defeated && kk.stomp.collapses === 1 && kk.stomp.halfY < 0.25);
check('Knochenhaufen ist harmlos und begehbar', !kk.rebuild.pileHurt);
check(`Setzt sich nach ≈ 4 s wieder zusammen (Zittern ab ${kk.rebuild.shiverAt} s, Aufbau ab ${kk.rebuild.rebuildAt} s, läuft ab ${kk.rebuild.walkAt} s)`, Math.abs(kk.rebuild.rebuildAt - 4) < 0.1 && Math.abs(kk.rebuild.shiverAt - 3.2) < 0.1 && kk.rebuild.walkAt > kk.rebuild.rebuildAt + 0.7 && kk.rebuild.rebuilds === 1 && !kk.rebuild.defeated && kk.rebuild.halfY > 0.5);
check('Nach dem Wiederaufbau verletzt die Berührung wieder', kk.sideAgain);
check('Stampfattacke auf den Stehenden → nur Haufen; Stampfattacke auf den Haufen → endgültig besiegt', !kk.pound1.defeated && kk.pound1.lying && kk.pound2.defeated && kk.pound2.state === 'defeated' && kk.pound2.removed);
check('Gewöhnliches Draufspringen auf den Haufen besiegt nicht', !kk.jumpPile.defeated && kk.jumpPile.lying);
check(`Feuer (Funkenblüte) besiegt den stehenden Klapperknochen endgültig, Beute (${kk.fire.steps} Schritte)`, kk.fire.defeated && kk.fire.state === 'defeated' && kk.fire.coins >= 1);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 2: Flatterfledi, Hexenhut-Hüpfer, Kürbis-Bombe, Halloween-Spuk/-Kreisgeister
// =====================================================================================================================
if (want(2)) {
await load('0-21');
console.log('Teil 2: Flatterfledi, Hexenhut-Hüpfer, Kürbis-Bombe, Spuke');
const ff = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('ff_haeng');
  out.hang0 = { state: f.state, body: +(f.pos.y + f.half.y).toFixed(2), anchor: +f.anchor.y.toFixed(2) };
  // Figur weit weg: sie schläft weiter
  t.place([0, 1, t.Z(3, 7)], { settle: 1 });
  t.hold([0, 1, t.Z(3, 7)], 240);
  out.far = f.state;
  // Figur darunter: aufwachen, Sturzflug-Bogen durch die Figur, zurück an den Balken
  const fig = [f.anchor.x + 2, 1, f.anchor.z];
  t.place(fig, { settle: 1 });
  p.hurt = () => false;
  const seq = [];
  let dMin = 99, low = 99, wakeAt = null;
  for (let i = 0; i < 1600; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (seq[seq.length - 1] !== f.state) seq.push(f.state);
    if (f.state === 'wake' && wakeAt === null) wakeAt = i;
    if (f.state === 'dive') { const b = f.body(); dMin = Math.min(dMin, Math.hypot(b.x - p.pos.x, b.y - (p.pos.y + p.half.y), b.z - p.pos.z)); low = Math.min(low, b.y); }
    if (seq.length >= 4 && f.state === 'hang') break;
  }
  delete p.hurt;
  out.dive = { seq: seq.join('>'), wakeAt, dMin: +dMin.toFixed(2), low: +low.toFixed(2), dives: f.dives, back: +Math.hypot(f.pos.x - f.home.x, f.pos.y - f.home.y, f.pos.z - f.home.z).toFixed(3), from: f.diveFrom, to: f.diveTo };
  // stehen bleiben: der nächste Sturzflug trifft
  t.fresh();
  let hurt = false;
  for (let i = 0; i < 900 && !hurt; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); hurt = t.hurt(); }
  out.dive.hurt = hurt;
  out.dive.dives2 = f.dives;
  // Draufspringen besiegt (kreisende Flatterfledi)
  const k = t.ent('ff_kreis');
  const kx0 = k.pos.x, kz0 = k.pos.z;
  t.place([12, 1, t.Z(3, 4)], { settle: 1 });
  t.hold([12, 1, t.Z(3, 4)], 120);
  out.circle = { moved: +Math.hypot(k.pos.x - kx0, k.pos.z - kz0).toFixed(2), r: +Math.hypot(k.pos.x - 16, k.pos.z - t.Z(3, 11.5)).toFixed(2) };
  out.circle.side = t.touch(k, 20);
  const st = t.stomp(k);
  c.step(2);
  out.circle.stomp = { ...st, defeated: k.defeated, state: k.state };
  c.step(100);
  out.circle.removed = k.removed;
  // Schwarm: kreist, jede Fledermaus einzeln besiegbar
  const s = t.ent('ff_schwarm');
  const a0 = s.angle;
  t.place([6, 1, t.Z(3, 1.5)], { settle: 1 });
  t.hold([6, 1, t.Z(3, 1.5)], 240);
  const m = s.members;
  const radii = m.map((q) => Math.hypot(q.pos.x - s.pos.x, q.pos.z - s.pos.z));
  out.swarm = { turned: +(s.angle - a0).toFixed(2), rMin: +Math.min(...radii).toFixed(2), rMax: +Math.max(...radii).toFixed(2), alive: s.aliveCount };
  out.swarm.side = t.touch(m[1], 20);
  const sm = t.stomp(m[0]);
  c.step(2);
  out.swarm.stomp = { ...sm, defeated: m[0].defeated };
  c.step(100);
  out.swarm.alive2 = s.aliveCount;
  out.swarm.removed0 = m[0].removed;
  out.swarm.others = m.slice(1).every((q) => !q.defeated && !q.removed);
  return out;
});
console.log(`  Flatterfledi: ${JSON.stringify(ff)}`);
check(`Flatterfledi hängt kopfüber unter dem Balken und schläft, solange die Figur weit weg ist (${ff.far})`, ff.hang0.state === 'hang' && ff.hang0.body < ff.hang0.anchor && ff.far === 'hang');
check(`Wacht in Figurennähe auf, Sturzflug-Bogen durch die Figur (${ff.dive.dMin} m), kehrt zurück und hängt sich auf (${ff.dive.seq})`, ff.dive.seq === 'wake>dive>return>hang' && ff.dive.dMin < 0.35 && ff.dive.low < 2.2 && ff.dive.back < 0.01 && ff.dive.dives === 1);
check('Der Sturzflug trifft eine stehende Figur', ff.dive.hurt && ff.dive.dives2 === 2);
check(`Kreisende Flatterfledi fliegt ihren Kreis (r ${ff.circle.r} m), seitlich verletzt, Draufspringen besiegt`, ff.circle.moved > 0.5 && Math.abs(ff.circle.r - 1.6) < 0.3 && ff.circle.side && ff.circle.stomp.bounced && ff.circle.stomp.defeated && ff.circle.removed);
check(`Fledermaus-Schwarm kreist (${ff.swarm.turned} rad in 2 s, r ${ff.swarm.rMin} … ${ff.swarm.rMax} m); einzelne Fledermaus: seitlich verletzt, Draufspringen besiegt nur sie (${ff.swarm.alive} → ${ff.swarm.alive2})`, ff.swarm.turned > 1.2 && ff.swarm.rMin > 1.8 && ff.swarm.rMax < 3.4 && ff.swarm.side && ff.swarm.stomp.bounced && ff.swarm.stomp.defeated && ff.swarm.alive2 === 5 && ff.swarm.removed0 && ff.swarm.others);

const hh = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const h = t.ent('hh_jaeger');
  const fig = [-6.5, 1, t.Z(4, 3)];
  t.place(fig, { settle: 1 });
  const d0 = Math.hypot(h.pos.x - fig[0], h.pos.z - fig[2]), y0 = h.pos.y;
  let peak = 0;
  p.hurt = () => false;
  for (let i = 0; i < 720; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); peak = Math.max(peak, h.pos.y - y0); }
  delete p.hurt;
  out.chase = { d0: +d0.toFixed(2), d1: +Math.hypot(h.pos.x - fig[0], h.pos.z - fig[2]).toFixed(2), hops: h.hops, peak: +peak.toFixed(2) };
  // In der Luft: die Krempe federt ab (kein Treffer, hoher Abprall)
  t.place([-12, 1, t.Z(4, 1.5)], { settle: 1 });
  p.hurt = () => false;
  for (let i = 0; i < 600 && !(h.state === 'air' && h.vel.y > 1.5); i++) { p.pos.set(-12, 1, t.Z(4, 1.5)); p.vel.set(0, 0, 0); c.step(1); }
  const top = h.pos.y + 2 * h.half.y;
  p.pos.set(h.pos.x, top + 0.12, h.pos.z); p.vel.set(0, -2, 0); p.mode = 'air'; p.setState?.('fall');
  let vmax = -99, apex = -99, brim = false, defApex = null;
  for (let i = 0; i < 160; i++) {
    c.step(1);
    vmax = Math.max(vmax, p.vel.y); apex = Math.max(apex, p.pos.y);
    if (h.brimBounces > 0) brim = true;
    if (brim && vmax > 5 && p.vel.y <= 0) { defApex = h.defeated; break; }   // Scheitel erreicht
  }
  delete p.hurt;
  out.brim = { brim, bounces: h.brimBounces, defeated: defApex, vmax: +vmax.toFixed(2), apex: +(apex - 1).toFixed(2), podest: 3.2 };
  // Gelandet: von oben platt (besiegt)
  const s = t.ent('hh_streife');
  out.side = t.touch(s, 40);
  t.place([0, 1, t.Z(4, 1)], { settle: 1 });
  p.hurt = () => false;
  for (let i = 0; i < 900 && !(s.state === 'rest' && s.stateT < 0.02); i++) { p.pos.set(0, 1, t.Z(4, 1)); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  const st = t.stomp(s, { h: 0.15 });
  c.step(2);
  out.ground = { ...st, defeated: s.defeated, state: s.state, brim: s.brimBounces };
  return out;
});
console.log(`  Hexenhut-Hüpfer: ${JSON.stringify(hh)}`);
check(`Hexenhut-Hüpfer hüpft unter seiner Krempe heran (${hh.chase.hops} Hüpfer, Höhe ${hh.chase.peak} m, ${hh.chase.d0} → ${hh.chase.d1} m)`, hh.chase.hops >= 3 && hh.chase.peak > 0.6 && hh.chase.d1 < hh.chase.d0 - 2);
check(`In der Luft federt die Krempe ab: kein Treffer, hoher Abprall (${hh.brim.vmax} m/s, Scheitel ${hh.brim.apex} m – Podest ${hh.brim.podest} m erreichbar)`, hh.brim.brim && hh.brim.bounces === 1 && !hh.brim.defeated && hh.brim.vmax >= 13.9 && hh.brim.apex > 3.4);
check('Hexenhut-Hüpfer: seitliche Berührung verletzt', hh.side);
check('Gelandet: Draufspringen drückt ihn platt (besiegt, Abprall)', hh.ground.bounced && hh.ground.defeated && hh.ground.state === 'squashed' && hh.ground.brim === 0);

const bo = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // Aufheben (zündet), tragen, auf die Zielscheibe werfen → Aufprall explodiert, Ziel besiegt
  const b1 = t.ent('kbb_1');
  t.place([b1.pos.x - 0.75, 1, b1.pos.z], { settle: 10, yaw: 0 });
  t.face(b1.pos.x, b1.pos.z);
  out.idle = { state: b1.state, lit: b1.lit };
  t.action();
  out.pick = { holding: p.holding === b1, state: b1.state, lit: b1.lit, fuse: +b1.fuse.toFixed(2) };
  const tg = t.ent('kbb_ziel');
  p.pos.set(tg.pos.x - 3.4, 1, tg.pos.z); p.vel.set(0, 0, 0);
  c.step(6);
  t.face(tg.pos.x, tg.pos.z);
  c.step(1);
  out.carry = { holding: p.holding === b1, dy: +(b1.pos.y - p.pos.y).toFixed(2) };
  t.action();
  out.thrown = { state: b1.state, thrownBy: !!b1.thrownBy };
  for (let i = 0; i < 160 && !b1.exploded; i++) c.step(1);
  out.hit = { exploded: b1.exploded, target: tg.defeated, ents: b1.explosion?.entities ?? 0 };
  // Lunte: angezündet explodiert sie nach 3 s und verletzt die Figur daneben
  const b3 = t.ent('kbb_3');
  t.place([b3.pos.x + 1.2, 1, b3.pos.z], { settle: 2 });
  b3.onHit('fire', p);
  let steps = 0;
  for (let i = 0; i < 600 && !b3.exploded; i++) { p.pos.set(b3.pos.x + 1.2, 1, b3.pos.z); p.vel.set(0, 0, 0); c.step(1); steps++; }
  c.step(1);
  out.fuse = { exploded: b3.exploded, s: +(steps / 120).toFixed(2), hurt: t.hurt() };
  // Kette und Ziegel: eine Explosion zündet die Nachbarbombe und zerbricht den Ziegel daneben
  t.place([0, 1, t.Z(4, 4)], { settle: 2 });
  const brick = t.ent('ziegel');
  const A = L.spawn('kuerbis_bombe', { pos: [brick.pos.x, 1, brick.pos.z + 1.2], lit: true, fuse: 0.2 });
  const B = L.spawn('kuerbis_bombe', { pos: [brick.pos.x - 1.3, 1, brick.pos.z + 1.2] });
  for (let i = 0; i < 120; i++) c.step(1);
  out.chain = { A: A.exploded, B: B.exploded, brick: !!brick.removed || brick.alive === false };
  // Stern entschärft
  const C = L.spawn('kuerbis_bombe', { pos: [3, 1, t.Z(4, 2)], lit: true, fuse: 2 });
  C.onHit('star', p);
  for (let i = 0; i < 300; i++) c.step(1);
  out.star = { fizzled: C.fizzled, exploded: C.exploded, removed: C.removed };
  // Explosion besiegt einen stehenden Klapperknochen endgültig
  const kk = t.ent('kk_bombe');
  L.spawn('kuerbis_bombe', { pos: [kk.pos.x + 1, 1, kk.pos.z], lit: true, fuse: 0.1 });
  for (let i = 0; i < 40; i++) c.step(1);
  out.kk = { defeated: kk.defeated, state: kk.state };
  return out;
});
console.log(`  Kürbis-Bombe: ${JSON.stringify(bo)}`);
check('Kürbis-Bombe: liegt ungezündet; Aktion hebt sie auf (zündet, Lunte ≥ 1,6 s), über dem Kopf getragen', bo.idle.state === 'idle' && !bo.idle.lit && bo.pick.holding && bo.pick.state === 'carried' && bo.pick.lit && bo.pick.fuse >= 1.6 && bo.carry.holding && bo.carry.dy > 0.8);
check('Geworfen fliegt sie im Bogen und explodiert beim Aufprall am Gegner (Ziel besiegt)', bo.thrown.state === 'thrown' && bo.thrown.thrownBy && bo.hit.exploded && bo.hit.target && bo.hit.ents >= 1);
check(`Angezündet explodiert sie nach ${bo.fuse.s} s und verletzt die Figur daneben`, bo.fuse.exploded && Math.abs(bo.fuse.s - 3) < 0.05 && bo.fuse.hurt);
check('Explosion zündet die Nachbarbombe (Kette) und zerbricht den Ziegel', bo.chain.A && bo.chain.B && bo.chain.brick);
check('Funkelstern entschärft sie (keine Explosion); Explosion besiegt einen Klapperknochen endgültig', bo.star.fizzled && !bo.star.exploded && bo.star.removed && bo.kk.defeated && bo.kk.state === 'defeated');

const sp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const s = t.ent('hw_spuk');
  const fig = [-9.5, 1, t.Z(5, 5)];
  t.place(fig, { settle: 1 });
  // wegschauen (Blick +X): der Spuk folgt
  const d0 = Math.hypot(s.pos.x - fig[0], s.pos.z - fig[2]);
  p.hurt = () => false;
  for (let i = 0; i < 240; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); p.yaw = 0; c.step(1); }
  const d1 = Math.hypot(s.pos.x - fig[0], s.pos.z - fig[2]);
  out.chase = { d0: +d0.toFixed(2), d1: +d1.toFixed(2), state: s.state };
  // hinschauen: er versteckt sich
  t.face(s.pos.x, s.pos.z);
  const yaw = p.yaw;
  for (let i = 0; i < 120; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); p.yaw = yaw; c.step(1); }
  const d2 = Math.hypot(s.pos.x - fig[0], s.pos.z - fig[2]);
  out.shy = { state: s.state, d2: +d2.toFixed(2) };
  delete p.hurt;
  s.onHit('fire', p); s.onHit('claw', p);
  out.attacks = s.defeated;
  s.onHit('star', p);
  out.star = s.defeated;
  out.big = t.ent('hw_grossspuk').info();
  const kg = t.ent('hw_kreisgeist');
  const x0 = kg.pos.x, z0 = kg.pos.z;
  c.step(120);
  out.kreis = { moved: +Math.hypot(kg.pos.x - x0, kg.pos.z - z0).toFixed(2), side: t.touch(kg, 20), ring: t.ent('hw_kreis').info() };
  return out;
});
console.log(`  Halloween-Spuke: ${JSON.stringify(sp)}`);
check(`Halloween-Spuk folgt, wenn man wegschaut (${sp.chase.d0} → ${sp.chase.d1} m), versteckt sich beim Hinschauen (${sp.shy.state}) – Verhalten unverändert`, sp.chase.d1 < sp.chase.d0 - 1 && sp.chase.state === 'chase' && sp.shy.state === 'shy' && !sp.attacks && sp.star);
check(`Großspuk (Hexenhut) in Halloween-Optik, Kreisgeist kreist und verletzt, Kreisgeist-Kreis mit ${sp.kreis.ring.alive} Geistern`, sp.big.size === 2.5 && sp.big.halloween && sp.kreis.moved > 0.5 && sp.kreis.side && sp.kreis.ring.alive === 8 && sp.kreis.ring.halloween);
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 3: Graf Brummbär (0-22)
// =====================================================================================================================
const BOSS_HELPERS = ([id, startZ]) => {
  const c = window.__course, t = window.__t, L = c.level;
  t.boss = () => t.ent(id);
  t.arch = () => c.state().archetype;
  t.enter = () => {
    t.place([0, 2, startZ], { settle: 2 });
    for (let i = 0; i < 1200 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._hw) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._hw = true; }
  /** Bis Zustand s; Figur unverwundbar an pos (null = bleibt). */
  t.untilSafe = (s, n = 3000, pos = null) => {
    const b = t.boss(), p = c.player;
    p.hurt = () => false;
    let i = 0;
    for (; i < n && b.state !== s; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); }
    delete p.hurt;
    return i;
  };
  /** Eine gelandete Bombe des Grafen aufheben und auf ihn zurückwerfen (Figur unverwundbar). */
  t.throwBack = (pos) => {
    const g = t.boss(), p = c.player;
    p.hurt = () => false;
    let b = null;
    for (let i = 0; i < 4000 && !b; i++) {
      const cand = L.entities.find((e) => e.kind === 'kuerbis_bombe' && !e.removed && e.state === 'lit' && e.owner === g && e.fuse > 1.2);
      if (cand && g.vulnerable && t.dist(cand, g) > 2.5) { b = cand; break; }
      p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0);
      c.step(1);
    }
    if (!b) { delete p.hurt; return { found: false }; }
    const dx = b.pos.x - g.pos.x, dz = b.pos.z - g.pos.z, d = Math.hypot(dx, dz) || 1;
    p.pos.set(b.pos.x + (dx / d) * 0.7, b.pos.y, b.pos.z + (dz / d) * 0.7); p.vel.set(0, 0, 0);
    c.step(2);
    t.face(b.pos.x, b.pos.z);
    t.action();
    const picked = p.holding === b;
    t.face(g.pos.x, g.pos.z);
    c.step(1);
    const hp0 = g.hp, dist = +Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z).toFixed(2);
    t.action();
    let steps = 0;
    for (let i = 0; i < 240 && !b.exploded && !b.removed; i++) { c.step(1); steps++; }
    delete p.hurt;
    return { found: true, picked, assisted: b.assisted, exploded: b.exploded, hit: g.hp < hp0, hp: g.hp, dist, flight: +(steps / 120).toFixed(2) };
  };
};

if (want(3)) {
await load('0-22');
await sc(BOSS_HELPERS, ['graf', 20]);
console.log('Teil 3: Graf Brummbär 0-22');
const gb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const g = t.boss();
  const out = {};
  out.before = { state: g.state, hp: g.hp, maxHp: g.maxHp, model: t.model(g) };
  const a = t.enter();
  out.start = { started: a.started, state: g.state, hud: a.hud?.boss?.hp, name: a.hud?.boss?.name, lock: a.lock };
  // Auftritt → spazieren und werfen: Bomben fliegen mit roter Markierung und landen kurz vor der Figur
  const fig = [-2, 2, 4];
  t.untilSafe('walk', 600, fig);
  const thrown0 = g.bombsThrown;
  let markerMax = 0, keepMin = 99, keepMax = 0, rMax = 0, markerModel = null;
  const land = [];
  const seen = new Set();
  p.hurt = () => false;
  for (let i = 0; i < 120 * 9; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    markerMax = Math.max(markerMax, g.markers.list.length);
    if (g.markers.list[0]?.model) markerModel = g.markers.list[0].model.root?.userData?.modelName ?? g.markers.list[0].model.root?.name;
    for (const b of L.entities) {
      if (b.kind !== 'kuerbis_bombe' || seen.has(b) || b.state !== 'lit') continue;
      seen.add(b);
      land.push(+Math.hypot(b.pos.x - fig[0], b.pos.z - fig[2]).toFixed(2));
    }
    if (g.state === 'walk') { const d = Math.hypot(g.pos.x - fig[0], g.pos.z - fig[2]); keepMin = Math.min(keepMin, d); keepMax = Math.max(keepMax, d); }
    rMax = Math.max(rMax, Math.hypot(g.pos.x, g.pos.z));
  }
  delete p.hurt;
  out.throws = { n: g.bombsThrown - thrown0, markerMax, land, keep: [+keepMin.toFixed(2), +keepMax.toFixed(2)], rMax: +rMax.toFixed(2), model: markerModel };
  // Kopfsprung prallt ab (kein Treffer), seitliche Berührung verletzt, Angriffe und Explosion daneben zählen nicht
  t.untilSafe('walk', 900, fig);
  const head = t.stomp(g, { h: 0.8 });
  out.head = { ...head, hp: g.hp, bounces: g.bounces };
  t.untilSafe('walk', 900, fig);
  out.side = t.touch(g, 10);
  g.onHit('fire', p); g.onHit('claw', p); g.onHit('star', p); g.onHit('mega', p); g.onHit('shell', p);
  const nb = L.spawn('kuerbis_bombe', { pos: [g.pos.x + 1.0, 2, g.pos.z], lit: true, fuse: 0.05 });
  p.hurt = () => false;
  c.step(30);
  delete p.hurt;
  out.attacks = { hp: g.hp, exploded: nb.exploded, misses: g.misses };
  // Treffer 1: eine gelandete Bombe aufheben und zurückwerfen
  const h1 = t.throwBack(fig);
  out.hit1 = { ...h1, hud: t.arch().hud?.boss?.hp, state: g.state, log: g.hitLog[0] ?? null };
  // Verwandlung in den Fledermaus-Schwarm
  const seq = [g.state];
  p.hurt = () => false;
  for (let i = 0; i < 900 && g.state !== 'swarm'; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); if (seq[seq.length - 1] !== g.state) seq.push(g.state); }
  delete p.hurt;
  out.trans = { seq: seq.join('>'), hidden: g.hidden, touch: g.touch, bats: g.bats.length, legs: g.swarmPath().length, total: +g.swarmTotal.toFixed(2), banners: t.banners.slice() };
  // Draufspringen auf eine einzelne Fledermaus gibt einen Bitcoin; Berührung des Schwarms verletzt
  const bat = g.bats[0];
  const c0 = t.coins();
  const bs = t.stomp(bat, { h: 0.6 });
  c.step(2);
  out.bat = { ...bs, defeated: bat.defeated, coins: t.coins() - c0, batsDown: g.batsDown, kind: bat.kind };
  const bat2 = g.bats.find((m) => !m.defeated);
  out.batHurt = bat2 ? t.touch(bat2, 4) : null;
  // Bögen über die Arena, Landung weit weg von der Figur
  let rSwarm = 0;
  const cx = [];
  p.hurt = () => false;
  for (let i = 0; i < 2400 && g.state === 'swarm'; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    rSwarm = Math.max(rSwarm, Math.hypot(g.pos.x, g.pos.z));
    if (i % 60 === 0) cx.push([+g.pos.x.toFixed(1), +g.pos.z.toFixed(1)]);
  }
  delete p.hurt;
  out.land = { state: g.state, dFig: +Math.hypot(g.pos.x - fig[0], g.pos.z - fig[2]).toFixed(2), rSwarm: +rSwarm.toFixed(2), path: cx };
  t.untilSafe('walk', 600, fig);
  out.land.after = { state: g.state, hidden: g.hidden, touch: g.touch, bats: L.entities.filter((e) => e.kind === 'graf_fledermaus' && !e.removed).length, phase: g.phase };
  // Phase 2: zwei Bomben je Wurf
  const n0 = g.bombsThrown;
  let per2 = null;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 8 && per2 === null; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); if (g.bombsThrown > n0) per2 = g.bombsThrown - n0; }
  delete p.hurt;
  out.phase2 = { phase: g.phase, per: per2, banners: t.banners.slice(-3) };
  // Treffer 2 → größerer Schwarm
  const h2 = t.throwBack(fig);
  p.hurt = () => false;
  for (let i = 0; i < 900 && g.state !== 'swarm'; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  out.hit2 = { ...h2, swarm: g.bats.length, legs: g.swarmPath().length };
  t.untilSafe('walk', 3000, fig);
  // Phase 3: kurzer Rundumwurf (4 Bomben im Kreis um ihn)
  let ring = null, per3 = [];
  let last = g.bombsThrown;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 20 && !ring; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (g.bombsThrown > last) {
      const n = g.bombsThrown - last;
      per3.push(n);
      last = g.bombsThrown;
      if (n === 4) ring = g.markers.list.slice(-4).map((m) => +Math.hypot(m.x - g.pos.x, m.z - g.pos.z).toFixed(2));
    }
  }
  delete p.hurt;
  out.phase3 = { phase: g.phase, per: per3, ring, banners: t.banners.slice(-3) };
  // Treffer 3: besiegt → Konfetti, Fanfare (Archetyp), gone → Stern, Warp-Box
  const h3 = t.throwBack(fig);
  out.hit3 = { ...h3, defeated: g.defeated, state: g.state, confetti: !!g.confetti, live: g.bombs, banners: t.banners.slice(-2) };
  t.untilSafe('gone', 900, fig);
  c.step(4);
  out.gone = { state: g.state, visible: g.visible, won: t.arch().won, warp: t.ent('warp_sieg').hidden, star: t.count('star'), bats: t.count('graf_fledermaus'), markers: g.markers.list.length };
  // Stern einsammeln, Warp-Box → Plateau → Zielmast
  const st = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (st) t.place([st.pos.x, st.pos.y, st.pos.z], { settle: 60 });
  out.starTaken = !L.entities.some((e) => e.kind === 'star' && !e.removed);
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -30 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 2400 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 3600 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  out.info = g.info();
  return out;
});
console.log(`  Graf Brummbär: ${JSON.stringify(gb)}`);
check(`Kampf beginnt beim Betreten (Auftritt, Lebensleiste „${gb.start.name}“ 3/3, Sperre)`, gb.before.state === 'wait' && gb.before.model === 'graf_brummbaer' && gb.start.started && gb.start.state === 'intro' && gb.start.hud === 3 && gb.start.name === 'Graf Brummbär' && gb.start.lock);
check(`Er wirft gezündete Kürbis-Bomben (${gb.throws.n} in 9 s) mit roter Markierung; sie landen kurz vor der Figur (${gb.throws.land.join(', ')} m)`, gb.throws.n >= 2 && gb.throws.markerMax >= 1 && gb.throws.model === 'boss_marker' && gb.throws.land.length >= 2 && gb.throws.land.every((d) => d < 2.2));
check(`Er hält Abstand zur Figur (${gb.throws.keep.join(' … ')} m) und bleibt auf dem Dach (r ≤ ${gb.throws.rMax} m)`, gb.throws.keep[0] > 2.5 && gb.throws.keep[1] < 9 && gb.throws.rMax < 8.2);
check('Kopfsprung prallt ab (kein Schaden für beide), seitliche Berührung verletzt', gb.head.bounced && !gb.head.hurt && gb.head.hp === 3 && gb.head.bounces >= 1 && gb.side);
check('Feuer, Krallen, Stern, Riese, Panzer und eine Explosion daneben zählen nicht', gb.attacks.hp === 3 && gb.attacks.exploded);
check(`Zurückgeworfene Bombe trifft (${gb.hit1.dist} m, Zielhilfe ${gb.hit1.assisted}): 3 → 2, Lebensleiste folgt`, gb.hit1.found && gb.hit1.picked && gb.hit1.hit && gb.hit1.hp === 2 && gb.hit1.hud === 2 && gb.hit1.state === 'hit');
check(`Verwandlung in den Fledermaus-Schwarm (${gb.trans.seq}; ${gb.trans.bats} Fledermäuse, ${gb.trans.legs} Bögen, ${gb.trans.total} s)`, gb.trans.seq === 'hit>stunned>bats>swarm' && gb.trans.hidden && !gb.trans.touch && gb.trans.bats === 8 && gb.trans.legs === 3 && gb.trans.banners.some((x) => /Schwarm/.test(x)));
check(`Draufspringen auf eine Fledermaus: Abprall, ${gb.bat.coins} Bitcoin; Berührung des Schwarms verletzt`, gb.bat.bounced && gb.bat.defeated && gb.bat.coins === 1 && gb.bat.batsDown === 1 && gb.bat.kind === 'graf_fledermaus' && gb.batHurt === true);
check(`Schwarm fliegt in Bögen über die Arena (r ≤ ${gb.land.rSwarm} m) und landet weit weg von der Figur (${gb.land.dFig} m); danach wieder verwundbar, Phase 2`, gb.land.state === 'land' && gb.land.dFig > 5 && gb.land.rSwarm < 8 && gb.land.after.state === 'walk' && !gb.land.after.hidden && gb.land.after.touch && gb.land.after.bats === 0 && gb.land.after.phase === 2);
check(`Phase 2: ${gb.phase2.per} Bomben je Wurf, eigene Ansage (${gb.phase2.banners.join(' | ')})`, gb.phase2.phase === 2 && gb.phase2.per === 2 && gb.phase2.banners.includes('Jetzt fliegen mehr Bomben!'));
check(`Treffer 2 (2 → 1): größerer Schwarm (${gb.hit2.swarm} Fledermäuse, ${gb.hit2.legs} Bögen)`, gb.hit2.hit && gb.hit2.hp === 1 && gb.hit2.swarm === 12 && gb.hit2.legs === 4);
check(`Phase 3: kurzer Rundumwurf (Würfe ${gb.phase3.per.join('/')}, Ring ${JSON.stringify(gb.phase3.ring)} m), Ansage`, gb.phase3.phase === 3 && gb.phase3.ring && gb.phase3.ring.every((d) => Math.abs(d - 2.8) < 0.5) && gb.phase3.banners.includes('Vorsicht – Rundumwurf!'));
check('Treffer 3 besiegt ihn: Konfetti aus Süßigkeiten, Bomben entschärft, Sieg-Ansage', gb.hit3.hit && gb.hit3.hp === 0 && gb.hit3.defeated && gb.hit3.state === 'defeated' && gb.hit3.confetti && gb.hit3.live === 0 && gb.hit3.banners.some((x) => /Graf Brummbär ist besiegt/.test(x)));
check('Danach: gone, Archetyp siegt, Stern erscheint, Warp-Box sichtbar, kein Schwarm/keine Markierung mehr', gb.gone.state === 'gone' && !gb.gone.visible && gb.gone.won && gb.gone.warp === false && gb.gone.star === 1 && gb.gone.bats === 0 && gb.gone.markers === 0);
check('Stern einsammeln, Warp-Box führt zum Zielplateau, Zielmast beendet das Level', gb.starTaken && gb.finish.arrived && gb.finish.finished);

// Tod im Kampf setzt alles zurück (Graf 3/3 am Start, keine Bomben, kein Schwarm); Kampf von vorn
await load('0-22');
await sc(BOSS_HELPERS, ['graf', 20]);
const gr = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const g = t.boss();
  const out = {};
  t.enter();
  const fig = [2, 2, 3];
  t.untilSafe('walk', 600, fig);
  const h = t.throwBack(fig);
  p.hurt = () => false;
  for (let i = 0; i < 900 && g.state !== 'swarm'; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  out.before = { hit: h.hit, hp: g.hp, state: g.state, bats: t.count('graf_fledermaus') };
  p.die('hit');
  for (let i = 0; i < 2400 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  c.step(10);
  out.reset = { state: g.state, hp: g.hp, hidden: g.hidden, visible: g.visible, z: +g.pos.z.toFixed(2), bats: t.count('graf_fledermaus'), bombs: t.count('kuerbis_bombe'), markers: g.markers.list.length, started: t.arch().started, deaths: t.arch().deaths, hud: t.arch().hud?.boss };
  const a = t.enter();
  out.again = { started: a.started, state: g.state, hp: g.hp };
  return out;
});
console.log(`  Graf Brummbär Tod: ${JSON.stringify(gr)}`);
check('Tod im Kampf: Neustart, Graf 3/3 am Startplatz, keine Bomben, kein Schwarm, keine Markierung, Kampf von vorn', gr.before.hit && gr.before.state === 'swarm' && gr.before.bats === 8 && gr.reset.state === 'wait' && gr.reset.hp === 3 && !gr.reset.hidden && gr.reset.visible && gr.reset.z === -4 && gr.reset.bats === 0 && gr.reset.bombs === 0 && gr.reset.markers === 0 && !gr.reset.started && gr.reset.deaths === 1 && gr.again.started && gr.again.state === 'intro' && gr.again.hp === 3);
check('Keine Konsolenfehler (Teil 3)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 4: Bilder (Kurs-Kamera) und Zeichenaufrufe
// =====================================================================================================================
if (want(4)) {
await load('0-21');
console.log('Teil 4: Bilder');
const S = {};
S.kuerbling = await SHOT('hwe', 'kuerbling_huepft', () => {
  const c = window.__course, t = window.__t, p = c.player, j = t.ent('kb_jaeger');
  const fig = [-7.5, 1, t.Z(1, 2.5)];
  t.place(fig, { settle: 1 });
  for (let i = 0; i < 1200 && !(j.state === 'air' && j.stateT > j.airT * 0.45 && Math.hypot(j.pos.x - fig[0], j.pos.z - fig[2]) < 3.2); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(j.pos.x, j.pos.z);
});
S.riese = await SHOT('hwe', 'riesenkuerbling_zerfaellt', () => {
  const c = window.__course, t = window.__t, g = t.ent('kb_riese');
  t.stomp(g);
  c.step(90);
  t.stomp(g);
  c.step(16);
  c.player.pos.set(g.pos.x - 3.5, 1, g.pos.z + 2.5); c.player.vel.set(0, 0, 0); c.player.mode = 'ground';
  t.face(g.pos.x, g.pos.z);
});
S.knochen = await SHOT('hwe', 'klapperknochen_haufen', () => {
  const c = window.__course, t = window.__t, k = t.ent('kk_streife'), k2 = t.ent('kk_jaeger');
  t.stomp(k);
  c.step(60);
  t.place([k.pos.x + 2.4, 1, k.pos.z + 2], { settle: 2 });
  t.face(k.pos.x, k.pos.z);
});
S.aufbau = await SHOT('hwe', 'klapperknochen_zittert', () => {
  const c = window.__course, t = window.__t, k = t.ent('kk_streife'), p = c.player;
  const fig = [p.pos.x, p.pos.y, p.pos.z];
  for (let i = 0; i < 900 && k.state !== 'shiver'; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  c.step(40);
  t.face(k.pos.x, k.pos.z);
});
S.rebuild = await SHOT('hwe', 'klapperknochen_aufbau', () => {
  const c = window.__course, t = window.__t, k = t.ent('kk_streife'), p = c.player;
  const fig = [p.pos.x, p.pos.y, p.pos.z];
  for (let i = 0; i < 900 && !(k.state === 'rebuild' && k.stateT > 0.4); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(k.pos.x, k.pos.z);
});
S.haengt = await SHOT('hwe', 'flatterfledi_haengt', () => {
  const c = window.__course, t = window.__t, f = t.ent('ff_haeng');
  t.place([f.anchor.x + 0.5, 1, f.anchor.z + 5.6], { settle: 30 });
  t.face(f.anchor.x, f.anchor.z);
});
S.sturz = await SHOT('hwe', 'flatterfledi_sturzflug', () => {
  const c = window.__course, t = window.__t, p = c.player, f = t.ent('ff_haeng');
  const fig = [f.anchor.x + 2.2, 1, f.anchor.z + 0.8];
  for (let i = 0; i < 1200 && !(f.state === 'dive' && f.stateT > f.diveT * 0.38); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(f.anchor.x, f.anchor.z + 6);
});
S.schwarm = await SHOT('hwe', 'fledermaus_schwarm', () => {
  const t = window.__t;
  t.place([8, 1, t.Z(3, 0.8)], { settle: 30 });
  t.face(12, t.Z(3, 8));
});
S.hut = await SHOT('hwe', 'hexenhut_krempe', () => {
  const c = window.__course, t = window.__t, p = c.player, h = t.ent('hh_jaeger');
  t.place([-12, 1, t.Z(4, 1.5)], { settle: 1 });
  for (let i = 0; i < 900 && !(h.state === 'air' && h.vel.y > 1.5); i++) { p.pos.set(-12, 1, t.Z(4, 1.5)); p.vel.set(0, 0, 0); c.step(1); }
  p.pos.set(h.pos.x, h.pos.y + 2 * h.half.y + 0.12, h.pos.z); p.vel.set(0, -2, 0); p.mode = 'air';
  for (let i = 0; i < 40 && h.brimBounces === 0; i++) c.step(1);
  c.step(10);
  t.face(h.pos.x + 3, h.pos.z - 3);
});
S.bombe = await SHOT('hwe', 'kuerbis_bombe_tragen', () => {
  const c = window.__course, t = window.__t, p = c.player, b = t.ent('kbb_1');
  t.place([b.pos.x - 0.75, 1, b.pos.z], { settle: 10, yaw: 0 });
  t.face(b.pos.x, b.pos.z);
  t.action();
  c.step(60);
  t.face(b.pos.x + 4, b.pos.z - 3);
});
S.boom = await SHOT('hwe', 'kuerbis_bombe_explosion', () => {
  const c = window.__course, t = window.__t, p = c.player, tg = t.ent('kbb_ziel');
  p.pos.set(tg.pos.x - 3.4, 1, tg.pos.z); p.vel.set(0, 0, 0);
  c.step(4);
  t.face(tg.pos.x, tg.pos.z);
  c.step(1);
  t.action();
  const b = c.level.entities.find((e) => e.kind === 'kuerbis_bombe' && e.state === 'thrown');
  for (let i = 0; i < 160 && b && !b.exploded; i++) c.step(1);
  c.step(10);
});
S.spuk = await SHOT('hwe', 'halloween_spuke', () => {
  const c = window.__course, t = window.__t, p = c.player;
  const fig = [-6.5, 1, t.Z(5, 2.5)];
  t.place(fig, { settle: 1 });
  for (let i = 0; i < 160; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); p.yaw = 0; c.step(1); }
  t.face(-12, t.Z(5, 8));
});
S.kreis = await SHOT('hwe', 'halloween_kreisgeister', () => {
  const c = window.__course, t = window.__t;
  t.place([6, 1, t.Z(5, 0.8)], { settle: 60 });
  t.face(11, t.Z(5, 8));
});
// Porträt: alle Halloween-Gegner nebeneinander auf dem Mittelweg
S.nah = await SHOT('hwe', 'nah_alle', () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.place([0, 1, t.Z(2, -2)], { settle: 2 });
  const z = t.Z(2, 1.5);
  L.spawn('kuerbling', { pos: [-3.2, 1, z], dir: [0, 1], sight: 0, wake: 0.01, pause: 99 });
  L.spawn('klapperknochen', { pos: [-1.8, 1, z - 0.3], dir: [0, 1], speed: 0.001, wake: 99 });
  L.spawn('flatterfledi', { pos: [-0.4, 1.9, z], hang: false });
  L.spawn('hexenhut_huepfer', { pos: [1.0, 1, z - 0.2], dir: [0, 1], sight: 0, wake: 0.01, pause: 99 });
  L.spawn('kuerbis_bombe', { pos: [2.3, 1, z + 0.2], lit: true, fuse: 60 });
  L.spawn('spuk', { pos: [3.6, 1.5, z - 0.4], sight: 0, hat: 'kuerbis' });
  c.step(60);
  t.face(0, z - 4);
});
const zmax = Math.max(...Object.values(S).map((s) => s.calls));
console.log(`  Zeichenaufrufe Gruselwerkstatt: ${Object.entries(S).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${Math.round(Math.max(...Object.values(S).map((s) => s.triangles)) / 1000)} k Dreiecke`);
check(`Gruselwerkstatt: Zeichenaufrufe < 140 (höchstens ${zmax})`, zmax < 140);

await load('0-22');
await sc(BOSS_HELPERS, ['graf', 20]);
const B = {};
B.intro = await SHOT('hwe', 'graf_auftritt', () => { const c = window.__course, t = window.__t; t.enter(); for (let i = 0; i < 150; i++) c.step(1); });
B.wurf = await SHOT('hwe', 'graf_wurf', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player;
  const fig = [-2, 2, 4];
  p.hurt = () => false;
  for (let i = 0; i < 2400 && !(g.state === 'throw' && g.stateT > 0.7); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(g.pos.x, g.pos.z);
});
B.tragen = await SHOT('hwe', 'graf_bombe_tragen', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player, L = c.level;
  let b = null;
  for (let i = 0; i < 2400 && !b; i++) { b = L.entities.find((e) => e.kind === 'kuerbis_bombe' && e.state === 'lit' && e.owner === g && e.fuse > 1.5) ?? null; if (!b) { p.pos.set(-2, 2, 4); p.vel.set(0, 0, 0); c.step(1); } }
  if (!b) return;
  const dx = b.pos.x - g.pos.x, dz = b.pos.z - g.pos.z, d = Math.hypot(dx, dz) || 1;
  p.pos.set(b.pos.x + (dx / d) * 0.7, b.pos.y, b.pos.z + (dz / d) * 0.7); p.vel.set(0, 0, 0);
  c.step(2);
  t.face(b.pos.x, b.pos.z);
  t.action();
  t.face(g.pos.x, g.pos.z);
  c.step(20);
  t.face(g.pos.x, g.pos.z);
});
B.treffer = await SHOT('hwe', 'graf_treffer', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player;
  t.face(g.pos.x, g.pos.z);
  c.step(1);
  t.action();
  for (let i = 0; i < 300 && g.state !== 'hit'; i++) c.step(1);
  c.step(26);
});
B.schwarm = await SHOT('hwe', 'graf_schwarm', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player;
  t.untilSafe('swarm', 900, [2, 2, 4]);
  for (let i = 0; i < 150; i++) { p.pos.set(2, 2, 5); p.vel.set(0, 0, 0); c.step(1); }
  t.face(g.pos.x, g.pos.z);
});
B.landung = await SHOT('hwe', 'graf_landung', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player;
  t.untilSafe('land', 2400, [2, 2, 5]);
  c.step(60);
  t.face(g.pos.x, g.pos.z);
});
B.ring = await SHOT('hwe', 'graf_rundumwurf', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player;
  t.untilSafe('walk', 900, [2, 2, 5]);
  t.throwBack([2, 2, 5]);
  t.untilSafe('walk', 3000, [2, 2, 5]);
  let last = g.bombsThrown, ring = false;
  p.hurt = () => false;
  for (let i = 0; i < 120 * 20 && !ring; i++) { p.pos.set(2, 2, 5); p.vel.set(0, 0, 0); c.step(1); if (g.bombsThrown - last === 4) ring = true; last = g.bombsThrown; }
  c.step(50);
  t.face(g.pos.x, g.pos.z);
});
B.besiegt = await SHOT('hwe', 'graf_besiegt', () => {
  const c = window.__course, t = window.__t, g = t.boss(), p = c.player;
  t.throwBack([2, 2, 5]);
  c.step(110);
  p.pos.set(g.pos.x + 1.5, 2, g.pos.z + 4.5); p.vel.set(0, 0, 0);
  t.face(g.pos.x, g.pos.z);
});
const bmax = Math.max(...Object.values(B).map((s) => s.calls));
console.log(`  Zeichenaufrufe Schlossdach: ${Object.entries(B).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${Math.round(Math.max(...Object.values(B).map((s) => s.triangles)) / 1000)} k Dreiecke`);
check(`Schlossdach: Zeichenaufrufe < 140 (höchstens ${bmax})`, bmax < 140);
check('Keine Konsolenfehler (Teil 4)', errors.length === 0);
}

check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
