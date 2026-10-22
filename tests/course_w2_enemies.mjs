// Kurs-Modus: Welt-2-Gegner im Gegnerzoo (0-6) und der Endgegner Wirbelbrocken (0-7) deterministisch prüfen –
// Kernverhalten, Besiegen-Weg und Schadensweg je Gegner, Tragen/Werfen (Rollpilz besiegt Gegner), Kanone im Intervall,
// Lauerblock trägt und klemmt ein, Münzmarder gibt Münzen, alle drei Bossphasen, Treffer nur im verwundbaren Fenster,
// Sieg → Warp → Ziel; Zeichenaufrufe je Station. Danach Screenshots tests/out/w2en_*.png (Sichtprüfung).
// Simulation nur über window.__course.step(n) und setInput.
// Aufruf: PORT_BASE=3800 node tests/course_w2_enemies.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4199;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);

async function load(id) {
  await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
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
      /** z der Zoo-Reihe r, dz Meter hinter ihrer Vorderkante (wie Z in levels/w0/0-6.js). */
      Z: (r, dz) => -8 - 20 * (r - 1) - dz,
      ent: (id) => L.named.get(id),
      /** Figur setzen (groß, ohne Power-up, nichts in der Hand) und landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        p.setHero(o.hero ?? 'lotti');
        p.dead = false;
        p.holding = null;
        p.big = o.big ?? true;
        p.power = o.power ?? 'none';
        p.powerTime = 0;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.invuln = 0;
        L.runtime.status = 'play';
        L.controlYaw = c.view.rig.controlYaw(p.pos);
        c.step(o.settle ?? 30);
        return p.info();
      },
      /** Von oben auf e fallen (x/z folgen e, versetzt um off), bis Abprall oder Landung. */
      stomp(e, o = {}) {
        const p = P();
        const top = e.pos.y + e.half.y * 2;
        const off = o.off ?? [0, 0];
        this.place([e.pos.x + off[0], top + (o.h ?? 1.2), e.pos.z + off[1]], { settle: 0, ...o });
        let bounced = false, hurt = false;
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground') break;
        }
        c.setInput({});
        return { bounced, hurt };
      },
      /** Seitlich (von +x bzw. dir) gegen e laufen; Treffer? */
      side(e, o = {}) {
        const p = P();
        const sx = o.sx ?? 1;
        const gap = e.half.x + p.half.x + 0.08;
        this.place([e.pos.x + gap * sx, o.y ?? e.pos.y, e.pos.z], { settle: 1, yaw: sx > 0 ? Math.PI : 0 });
        let hurt = false;
        for (let i = 0; i < (o.max ?? 40); i++) { c.setInput({ x: -0.6 * sx }); c.step(1); if (p.invuln > 0 || !p.big || p.dead) { hurt = true; break; } }
        c.setInput({});
        return { hurt };
      },
      /** Aktion einmal drücken. */
      action(extra = {}) { c.setInput({ ...extra, action: true }); c.step(1); c.setInput({ ...extra }); c.step(1); },
      hurt: () => { const p = P(); return p.invuln > 0 || !p.big || p.dead; },
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      info: () => P().info(),
      /** Alle anderen Gegner/Fallen ruhigstellen (Tests stören sich nicht gegenseitig). */
      calm(keep = []) {
        for (const e of L.entities) {
          if (keep.includes(e)) continue;
          if (e.kind === 'kanone_turm') e.setActive(false);
        }
      },
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);

// =====================================================================================================================
// Gegnerzoo 0-6
// =====================================================================================================================
await load('0-6');
console.log('Gegnerzoo 0-6');
const st0 = await sc(() => {
  const c = window.__course;
  const kinds = {};
  for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  window.__t.calm();
  return { kinds, minis: c.level.entities.filter((e) => e.kind === 'pilzling' && e.mini).length };
});
const NEED = ['hackvogel', 'rollpilz', 'grossrollpilz', 'wuschel', 'huepfmaus', 'huepfmaus_stachel', 'marschblock', 'feuer_werfer',
  'kanone_turm', 'feuer_schnappblume', 'lauerblock', 'muenzmarder'];
check(`Alle Welt-2-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'}), ${st0.minis} Mini-Pilzlinge`, NEED.every((k) => st0.kinds[k] > 0) && st0.minis === 3);
check('Keine Konsolenfehler beim Laden', errors.length === 0);

// ================================================================ Hackvogel
const hv = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const h = t.ent('hv_stand');
  out.blocks0 = t.count('steinblock');
  // Takt: Zustandsfolge und Dauer des Feststeckens
  t.place([-16, 1, -9.5], { settle: 1 });
  const seq = [], stucks = [];
  let pecks0 = h.pecks, st0 = -1;
  for (let i = 0; i < 600; i++) {
    c.step(1);
    if (seq[seq.length - 1] !== h.state) {
      if (h.state === 'stuck') st0 = i;
      else if (st0 >= 0 && seq[seq.length - 1] === 'stuck') { stucks.push((i - st0) / 120); st0 = -1; }
      seq.push(h.state);
    }
  }
  out.seq = seq.join('>');
  out.pecks = h.pecks - pecks0;
  out.stuckT = stucks.length ? stucks.reduce((a, b) => a + b, 0) / stucks.length : 0;
  // Schnabel trifft die Figur (vor ihm, Spitze ≈ 1,05 m vor dem Fußpunkt)
  for (let i = 0; i < 400 && h.state !== 'wind'; i++) c.step(1);
  const tip = h.beakTip({});
  t.place([h.pos.x, 1, h.pos.z + 1.05], { settle: 1, yaw: -Math.PI / 2 });
  out.tip = { dz: +(tip.z - h.pos.z).toFixed(2) };
  let hit = false;
  for (let i = 0; i < 120; i++) { c.step(1); if (t.hurt()) { hit = true; break; } }
  out.beakHit = hit;
  out.beakHitState = h.state;
  // Von vorn draufspringen, Schnabel frei → nur Abprall
  for (let i = 0; i < 400 && h.state !== 'stand'; i++) c.step(1);
  h.cool = 3;
  const front = t.stomp(h, { off: [0, 0.25] });
  out.front = { ...front, defeated: h.defeated, state: h.state };
  t.place([-16, 1, -9.5], { settle: 1 });
  // Schnabel steckt → Draufspringen besiegt
  h.cool = 0;
  for (let i = 0; i < 400 && h.state !== 'stuck'; i++) c.step(1);
  const st = t.stomp(h, { h: 0.6 });
  out.stuck = { ...st, defeated: h.defeated, state: h.state };
  // Patrouille
  const pt = t.ent('hv_patrol');
  const xs = [];
  t.place([-12, 1, -9.5], { settle: 1 });
  for (let i = 0; i < 1800; i++) { c.step(1); xs.push(pt.pos.x); }
  out.pMin = Math.min(...xs); out.pMax = Math.max(...xs);
  // von hinten besiegt
  pt.cool = 3;
  const f = pt.facing();
  const back = t.stomp(pt, { off: [-f.x * 0.3, -f.z * 0.3] });
  out.back = { ...back, defeated: pt.defeated };
  // Ring: Hackvogel zerhackt den östlichen Steinblock (Münzen erscheinen)
  const ring = t.ent('hv_ring');
  const coins0 = t.count('coin');
  t.place([-5, 1, -11.5], { settle: 1 });
  const blocks0 = out.blocks0;
  for (let i = 0; i < 600 && t.count('steinblock') === blocks0; i++) c.step(1);
  for (let i = 0; i < 60; i++) c.step(1);
  out.ring = { blocks0, blocks: t.count('steinblock'), coins: t.count('coin') - coins0, hit: ring.blocksHit };
  // seitlich = Treffer
  out.side = t.side(ring, { sx: 1 }).hurt;
  return out;
});
console.log(`  Hackvogel: ${hv.seq.slice(0, 60)}… ${hv.pecks} Hiebe/5 s, steckt ${f2(hv.stuckT)} s; Schnabeltreffer ${hv.beakHit} (${hv.beakHitState}); Patrouille x ${f2(hv.pMin)}…${f2(hv.pMax)}`);
console.log(`    vorn ${JSON.stringify(hv.front)}, steckend ${JSON.stringify(hv.stuck)}, hinten ${JSON.stringify(hv.back)}, Ring ${JSON.stringify(hv.ring)}`);
check('Hackvogel: hackt im Takt (wind → peck → stuck ≈ 0,8 s → pull)', /wind>peck>stuck>pull/.test(hv.seq) && hv.pecks >= 2 && Math.abs(hv.stuckT - 0.8) < 0.05);
check('Hackvogel: Schnabel trifft die Figur vor ihm', hv.beakHit);
check('Hackvogel: von vorn bei freiem Schnabel nur Abprall (nicht besiegt)', hv.front.bounced && !hv.front.defeated && !hv.front.hurt);
check('Hackvogel: Schnabel steckt → Draufspringen besiegt (platt, Abprall)', hv.stuck.defeated && hv.stuck.state === 'squashed' && hv.stuck.bounced && !hv.stuck.hurt);
check('Hackvogel: patrouilliert und wird von hinten besiegt', hv.pMin < -15 && hv.pMax > -11 && hv.back.defeated && hv.back.bounced);
check('Hackvogel im Steinring hackt nur bei naher Figur und zerhackt dann seinen Block (Münzen erscheinen)', hv.ring.blocks0 === 4 && hv.ring.blocks === 3 && hv.ring.coins >= 3);
check('Hackvogel: seitlich = Treffer', hv.side);

// ================================================================ Rollpilz: umwerfen, tragen, werfen
const rp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const r = t.ent('rp1'), z1 = t.ent('ziel1');
  out.side = t.side(r, { sx: 1 }).hurt;
  const s = t.stomp(r);
  out.stomp = { ...s, state: r.state, defeated: r.defeated, carryable: r.canCarry() };
  // aufheben: neben ihn stellen, Blick zu ihm, Aktion
  t.place([r.pos.x - 0.75, 1, r.pos.z], { settle: 2, yaw: 0 });
  t.action();
  out.held = p.holding === r && r.state === 'carried';
  // zur Zielscheibe tragen und werfen
  t.place([z1.pos.x - 4.5, 1, z1.pos.z], { settle: 2, yaw: 0 });
  p.holding = r; r.carrier = p; r.onPickup(p);
  c.step(2);
  t.action();
  out.thrown = r.state;
  let hitT = -1;
  for (let i = 0; i < 200; i++) { c.step(1); if (z1.defeated) { hitT = i; break; } }
  out.target = { defeated: z1.defeated, t: hitT, rollDefeated: r.defeated };
  // Aufstehen nach ~6 s
  const r2 = t.ent('rp2');
  t.stomp(r2);
  t.place([0, 1, -15], { settle: 1 });
  const states = new Set();
  let upT = -1;
  for (let i = 0; i < 1000; i++) { c.step(1); states.add(r2.state); if (r2.state === 'walk' && upT < 0 && states.has('getup')) upT = i / 120; }
  out.up = { t: upT, states: [...states].join(',') };
  // Feuer besiegt
  r2.onHit('fire', p);
  out.fire = r2.defeated;
  return out;
});
console.log(`  Rollpilz: ${JSON.stringify(rp)}`);
check('Rollpilz: seitlich = Treffer', rp.side);
check('Rollpilz: Draufspringen wirft ihn auf den Rücken (nicht besiegt, tragbar, Abprall)', rp.stomp.state === 'back' && !rp.stomp.defeated && rp.stomp.carryable && rp.stomp.bounced);
check('Rollpilz: Aktion hebt ihn auf (Tragen-System)', rp.held);
check('Rollpilz geworfen rollt und besiegt eine Zielscheibe (zerplatzt dabei selbst)', rp.thrown === 'thrown' && rp.target.defeated && rp.target.rollDefeated);
check(`Rollpilz steht nach ≈ 6 s wieder auf (${f2(rp.up.t)} s)`, rp.up.t > 6 && rp.up.t < 7.5);
check('Rollpilz: Feuer besiegt', rp.fire);

// ================================================================ Großrollpilz: umwerfen und in die Lava stoßen
const gr = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const g = t.ent('grp');
  let defeatedCount = 0;
  const prev = L.onEnemyDefeated;
  L.onEnemyDefeated = (e) => { if (e === g) defeatedCount++; prev?.(e); };
  g.pos.set(-11.5, 2.2, t.Z(2, 7)); g.setState('walk');
  out.side = t.side(g, { sx: 1, y: 2.2 }).hurt;
  g.pos.set(-11.5, 2.2, t.Z(2, 7)); g.setState('walk'); c.step(2);
  const s = t.stomp(g);
  out.stomp = { ...s, state: g.state, hp: g.hp, carry: g.canCarry() };
  // seitlich hineinlaufen (von Osten) → rutscht nach Westen über die Kante in die Lava
  const ph = p.half.x;
  t.place([g.pos.x + g.half.x + ph + 0.05, 2.2, g.pos.z], { settle: 1, yaw: Math.PI });
  let pushedSeen = false;
  for (let i = 0; i < 150 && !g.removed; i++) { c.setInput({ x: -1, run: true }); c.step(1); if (g.state === 'pushed') pushedSeen = true; }
  c.setInput({});
  out.pushed = pushedSeen ? 'pushed' : g.state;
  let i = 0;
  for (; i < 600 && !g.removed; i++) c.step(1);
  out.lava = { removed: g.removed, defeated: g.defeated, fell: g.fellOut, counted: defeatedCount, t: i / 120, hurt: t.hurt() };
  // Drei Treffer: frischer Großrollpilz auf der Insel
  const g2 = L.spawn('grossrollpilz', { pos: [-11.5, 2.2, t.Z(2, 7)], wake: 1e9 });
  c.step(5);
  const hits = [];
  for (let k = 0; k < 3; k++) { g2.invuln = 0; const r = t.stomp(g2, { h: 0.8 }); hits.push(`${g2.hp}${r.bounced ? 'B' : ''}`); c.step(60); }
  out.three = { hits: hits.join(' '), defeated: g2.defeated, state: g2.state };
  // Kanonenkugel besiegt sofort
  const g3 = L.spawn('grossrollpilz', { pos: [-9, 2.2, t.Z(2, 5)], wake: 1e9 });
  c.step(2);
  g3.onHit('cannon', p);
  out.cannon = g3.defeated;
  L.onEnemyDefeated = prev;
  return out;
});
console.log(`  Großrollpilz: ${JSON.stringify(gr)}`);
check('Großrollpilz: seitlich = Treffer; Draufspringen wirft ihn um (−1 hp, nicht tragbar)', gr.side && gr.stomp.state === 'back' && gr.stomp.hp === 2 && !gr.stomp.carry && gr.stomp.bounced);
check('Großrollpilz liegend gestoßen rutscht in die Lava → besiegt (zählt für Arenen)', gr.pushed === 'pushed' && gr.lava.removed && gr.lava.fell && gr.lava.defeated && gr.lava.counted === 1 && !gr.lava.hurt);
check(`Großrollpilz: 3 Treffer von oben besiegen ihn (${gr.three.hits})`, gr.three.defeated && gr.three.state === 'squashed');
check('Großrollpilz: Kanonenkugel (starker Treffer) besiegt sofort', gr.cannon);

// ================================================================ Wuschel
const wu = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('wu_pendel'), k = t.ent('wu_kreis');
  t.place([0, 1, t.Z(2, 6)], { settle: 1 });
  const xs = [], rs = [];
  for (let i = 0; i < 900; i++) { c.step(1); xs.push(a.pos.x); rs.push(Math.hypot(k.pos.x - 14.5, k.pos.z - t.Z(2, 8.5))); }
  out.pendel = [Math.min(...xs), Math.max(...xs)];
  out.kreis = [Math.min(...rs), Math.max(...rs)];
  out.instanced = !a.model && !!a.slot;
  const s = t.stomp(a, { free: false });
  out.stomp = { hurt: s.hurt, defeated: a.defeated };
  a.onHit('fire', p); a.onHit('claw', p); a.onHit('cannon', p);
  out.immune = !a.defeated;
  a.onHit('star', p);
  out.star = a.defeated;
  return out;
});
console.log(`  Wuschel: Pendel x ${f2(wu.pendel[0])}…${f2(wu.pendel[1])}, Kreisradius ${f2(wu.kreis[0])}…${f2(wu.kreis[1])}, ${JSON.stringify(wu.stomp)}`);
check('Wuschel: fährt Pendelbahn und Kreisbahn (Radius konstant), Instanz-Darstellung', wu.pendel[0] < 6.3 && wu.pendel[1] > 15.7 && Math.abs(wu.kreis[0] - 2.6) < 0.05 && Math.abs(wu.kreis[1] - 2.6) < 0.05 && wu.instanced);
check('Wuschel: unverwundbar – Draufspringen verletzt, Feuer/Krallen/Kanone wirkungslos', wu.stomp.hurt && !wu.stomp.defeated && wu.immune);
check('Wuschel: Funkelstern vertreibt ihn', wu.star);

// ================================================================ Hüpfmaus
const hm = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const m = t.ent('hm1');
  t.place([m.pos.x + 3, 1, m.pos.z + 2.5], { settle: 30 });
  for (let i = 0; i < 200 && !(m.state === 'walk' && m.grounded); i++) c.step(1);
  const j0 = m.jumps;
  c.setInput({ jump: true }); c.step(1);
  out.sync = { jumps: m.jumps - j0, vy: +m.vel.y.toFixed(2), pState: p.state };
  let maxY = m.pos.y;
  for (let i = 0; i < 80; i++) { c.step(1); maxY = Math.max(maxY, m.pos.y); }
  c.setInput({});
  out.height = +(maxY - 1).toFixed(2);
  // kleine Hüpfer beim Laufen
  c.step(120);
  let hops = 0, last = m.state;
  for (let i = 0; i < 360; i++) { c.step(1); if (m.state === 'hop' && last !== 'hop') hops++; last = m.state; }
  out.hops = hops;
  out.side = t.side(m, { sx: 1 }).hurt;
  const s = t.stomp(m);
  out.stomp = { ...s, state: m.state, defeated: m.defeated };
  // Stachel-Hüpfmaus
  const sp = t.ent('hs1');
  const s2 = t.stomp(sp);
  out.spikyStomp = { ...s2, defeated: sp.defeated };
  const pd = t.stomp(sp, { input: {}, h: 1.5 });
  out.spikyFire = (() => { sp.onHit('fire', p); return sp.defeated; })();
  // Stampfwelle daneben besiegt die zweite
  const s3 = t.ent('hs2');
  s3.path = null; s3.speed = 0;
  t.place([s3.pos.x + 1.2, 3.5, s3.pos.z], { settle: 0 });
  for (let i = 0; i < 12; i++) { c.setInput({ crouch: true }); c.step(1); }
  for (let i = 0; i < 100 && p.mode !== 'ground'; i++) c.step(1);
  c.setInput({});
  c.step(2);
  out.wave = { defeated: s3.defeated, hurt: t.hurt(), pState: p.state };
  return out;
});
console.log(`  Hüpfmaus: ${JSON.stringify(hm)}`);
check(`Hüpfmaus springt im selben Schritt mit der Figur ab (${hm.height} m hoch)`, hm.sync.jumps === 1 && hm.sync.vy > 5 && hm.height > 1.3);
check(`Hüpfmaus: kleine Hüpfer beim Laufen (${hm.hops} in 3 s)`, hm.hops >= 3);
check('Hüpfmaus: seitlich = Treffer, Draufspringen besiegt', hm.side && hm.stomp.defeated && hm.stomp.bounced && !hm.stomp.hurt);
check('Stachel-Hüpfmaus: Draufspringen verletzt (nicht besiegt); Feuer besiegt', hm.spikyStomp.hurt && !hm.spikyStomp.defeated && hm.spikyFire);
check('Stachel-Hüpfmaus: Stampfwelle daneben besiegt (ohne Treffer)', hm.wave.defeated && !hm.wave.hurt);

// ================================================================ Marschblock
const mb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const col = L.entities.filter((e) => e.kind === 'marschblock').sort((a, b) => a.slotIndex - b.slotIndex);
  t.place([-2, 1, t.Z(4, 7)], { settle: 1 });
  c.step(240);
  const gaps = [];
  for (let i = 1; i < col.length; i++) gaps.push(Math.hypot(col[i].pos.x - col[i - 1].pos.x, col[i].pos.z - col[i - 1].pos.z));
  out.gaps = [Math.min(...gaps), Math.max(...gaps)].map((v) => +v.toFixed(2));
  out.allMarch = col.every((e) => e.state === 'march');
  out.instanced = col.every((e) => !e.model && !!e.slot);
  const x0 = col[0].pos.x, z0 = col[0].pos.z;
  c.step(120);
  out.moved = +Math.hypot(col[0].pos.x - x0, col[0].pos.z - z0).toFixed(2);
  const victim = col[2];
  const s = t.stomp(victim);
  out.stomp = { ...s, state: victim.state, defeated: victim.defeated };
  c.step(2);
  out.panic = col.filter((e) => e !== victim && e.state === 'panic').length;
  c.step(120 * 8);
  out.back = col.filter((e) => e !== victim && !e.defeated && e.state === 'march').length;
  out.side = t.side(col[0], { sx: 1 }).hurt;
  return out;
});
console.log(`  Marschblock: ${JSON.stringify(mb)}`);
check(`Marschblock-Kolonne marschiert im Gleichschritt (Abstände ${mb.gaps.join('…')} m), Instanz-Darstellung`, mb.allMarch && mb.gaps[0] > 1.0 && mb.gaps[1] < 1.6 && mb.moved > 1 && mb.instanced);
check('Marschblock: Draufspringen besiegt einen (platt)', mb.stomp.defeated && mb.stomp.state === 'squashed' && mb.stomp.bounced);
check(`Marschblock: Kolonne gerät in Panik (${mb.panic}) und marschiert danach weiter (${mb.back})`, mb.panic >= 4 && mb.back >= 4);
check('Marschblock: seitlich = Treffer', mb.side);

// ================================================================ Rutschen (Angriff gegen Welt-2-Gegner)
const sl = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const m = L.spawn('huepfmaus', { pos: [0, 1, t.Z(3, 6)], wake: 1e9, speed: 0, hopEvery: 99 });
  const r = L.spawn('rollpilz', { pos: [1.5, 1, t.Z(3, 6)], wake: 1e9, speed: 0 });
  t.place([0, 1, t.Z(3, -2)], { settle: 2 });
  let slid = false, crouch = false;
  for (let i = 0; i < 200 && !m.defeated; i++) { crouch = crouch || p.hSpeed() > 8.5; c.setInput({ y: 1, run: true, crouch }); c.step(1); if (p.state === 'slide') slid = true; }
  c.setInput({});
  out.maus = { slid, defeated: m.defeated, hurt: t.hurt() };
  t.place([1.5, 1, t.Z(3, -2)], { settle: 2 });
  slid = false; crouch = false;
  for (let i = 0; i < 200 && r.state !== 'back'; i++) { crouch = crouch || p.hSpeed() > 8.5; c.setInput({ y: 1, run: true, crouch }); c.step(1); if (p.state === 'slide') slid = true; }
  c.setInput({});
  out.roll = { slid, state: r.state, defeated: r.defeated, hurt: t.hurt() };
  m.kill(); r.kill();
  return out;
});
console.log(`  Rutschen: ${JSON.stringify(sl)}`);
check('Rutschen: Hüpfmaus besiegt, Rollpilz umgeworfen (kein Treffer der Figur)', sl.maus.slid && sl.maus.defeated && !sl.maus.hurt && sl.roll.state === 'back' && !sl.roll.defeated && !sl.roll.hurt);

// ================================================================ Mini-Pilzling
const mp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const m = t.ent('mini3');
  const out = { half: m.half.x, speed: m.speed };
  out.side = t.side(m, { sx: 1 }).hurt;
  const s = t.stomp(m);
  out.stomp = { ...s, state: m.state };
  return out;
});
console.log(`  Mini-Pilzling: ${JSON.stringify(mp)}`);
check('Mini-Pilzling: halbe Größe, schneller, seitlich Treffer, platt ohne Abprall', mp.half < 0.25 && mp.speed > 2 && mp.side && mp.stomp.state === 'squashed' && !mp.stomp.bounced && !mp.stomp.hurt);

// ================================================================ Werfer
const wf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('wf_feuer');
  t.place([-11.5, 1, t.Z(5, 3)], { settle: 1 });
  p.hurt = () => false;
  const tiers = new Set();
  let balls = 0;
  const seen = new Set();
  for (let i = 0; i < 120 * 9; i++) {
    c.step(1);
    tiers.add(f.tier);
    for (const e of L.entities) if (e.kind === 'feuerkugel' && e.owner === f && !seen.has(e)) { seen.add(e); balls++; }
  }
  out.feuer = { throws: f.throws, balls, tiers: [...tiers].join(','), jumps: f.jumps, bounces: Math.max(0, ...[...seen].map((b) => b.bounces)) };
  delete p.hurt;
  // Feuerkugel trifft
  const ball = [...seen].find((b) => !b.removed);
  // Hammer: wirft im Bogen auf die Figur, trifft
  const h = t.ent('wf_hammer');
  t.place([h.pos.x, 1, h.pos.z + 4.5], { settle: 1 });
  let hammers = 0, hurtH = false;
  const seenH = new Set();
  for (let i = 0; i < 120 * 6; i++) {
    c.step(1);
    for (const e of L.entities) if (e.kind === 'wurf_hammer' && !seenH.has(e)) { seenH.add(e); hammers++; }
    if (t.hurt()) { hurtH = true; break; }
  }
  out.hammer = { hammers, hurt: hurtH, throws: h.throws };
  // Bumerang kehrt zurück
  const b = t.ent('wf_bumerang');
  t.place([b.pos.x - 6, 1, b.pos.z + 1], { settle: 1 });
  p.hurt = () => false;
  let bm = null, maxD = 0, caught = false;
  for (let i = 0; i < 120 * 8; i++) {
    c.step(1);
    if (!bm) bm = L.entities.find((e) => e.kind === 'wurf_bumerang');
    if (bm) { maxD = Math.max(maxD, Math.hypot(bm.pos.x - b.pos.x, bm.pos.z - b.pos.z)); if (bm.removed) { caught = bm.caught; break; } }
  }
  delete p.hurt;
  out.bumerang = { maxD: +maxD.toFixed(2), caught };
  // Draufspringen besiegt (in der Wurfpause)
  b.throwCool = 5; b.jumpCool = 5;
  const s = t.stomp(b);
  out.stomp = { ...s, defeated: b.defeated, state: b.state };
  out.side = t.side(h, { sx: -1 }).hurt;
  return out;
});
console.log(`  Werfer: ${JSON.stringify(wf)}`);
check(`Feuer-Werfer wirft hüpfende Feuerkugeln (${wf.feuer.balls}) und springt zwischen zwei Ebenen (${wf.feuer.tiers})`, wf.feuer.balls >= 3 && wf.feuer.bounces >= 1 && wf.feuer.tiers.includes('low') && wf.feuer.tiers.includes('high'));
check(`Hammer-Werfer wirft Hämmer im Bogen auf die Figur und trifft (${wf.hammer.hammers})`, wf.hammer.hammers >= 1 && wf.hammer.hurt);
check(`Bumerang fliegt hinaus (${wf.bumerang.maxD} m) und kehrt zum Werfer zurück`, wf.bumerang.maxD > 3.5 && wf.bumerang.caught);
check('Werfer: Draufspringen besiegt, seitlich = Treffer', wf.stomp.defeated && wf.stomp.state === 'squashed' && wf.stomp.bounced && wf.side);

// ================================================================ Kanonenturm, Projektilkopf, Suchkopf
const kt = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const k1 = t.ent('kt1'), k2 = t.ent('kt2');
  k1.setActive(true); k2.setActive(false);
  t.place([-6, 1, t.Z(6, 3)], { settle: 1 });
  p.hurt = () => false;
  const shotT = [];
  let s0 = k1.shots, head = null;
  for (let i = 0; i < 120 * 10; i++) {
    c.step(1);
    if (k1.shots !== s0) { shotT.push(i / 120); s0 = k1.shots; if (!head) head = k1.heads[k1.heads.length - 1]; }
  }
  delete p.hurt;
  out.shots = shotT.map((v) => +v.toFixed(2));
  out.gaps = shotT.slice(1).map((v, i) => +(v - shotT[i]).toFixed(2));
  out.straight = head ? { dz: +Math.abs(head.pos.z - t.Z(6, 4.5)).toFixed(3), x: +head.pos.x.toFixed(1), burst: head.burst } : null;
  k1.setActive(false);
  for (const e of L.entities) if (e.kind === 'projektilkopf' || e.kind === 'suchkopf') e.kill();
  c.step(1);
  // Projektilkopf: Draufspringen = Abprall, stürzt ab
  const pk = L.spawn('projektilkopf', { pos: [-2, 2.2, t.Z(6, 4)], dir: [1, 0], speed: 3 });
  c.step(2);
  const s = t.stomp(pk);
  out.pkStomp = { ...s, state: pk.state, defeated: pk.defeated };
  const pk2 = L.spawn('projektilkopf', { pos: [-4, 1, -105], dir: [1, 0], speed: 4 });
  t.place([-2.5, 1, -105], { settle: 1, yaw: Math.PI });
  let hurt = false;
  for (let i = 0; i < 120; i++) { c.step(1); if (t.hurt()) { hurt = true; break; } }
  out.pkSide = hurt;
  pk2.kill();
  // Reit-Kopf trägt die Figur
  const rk = L.spawn('projektilkopf', { pos: [-3, 2.5, -105], dir: [1, 0], speed: 3, ride: true, life: 30 });
  c.step(1);
  t.place([-3, 3.5, -105], { settle: 40 });
  const x0 = p.pos.x;
  c.step(120);
  out.ride = { mode: p.mode, on: p.ground?.owner === rk, dx: +(p.pos.x - x0).toFixed(2), hurt: t.hurt() };
  rk.kill(); c.step(1);
  // Suchkopf folgt der Figur, stürzt danach ab
  k2.setActive(true); k2.cool = 0;
  t.place([-9, 1, t.Z(6, 5)], { settle: 1 });
  p.hurt = () => false;
  let sk = null;
  for (let i = 0; i < 400 && !sk; i++) { c.step(1); sk = k2.heads[0] ?? null; }
  const yaws = [];
  let fell = false;
  if (sk) {
    // Figur läuft quer → der Suchkopf dreht nach
    for (let i = 0; i < 120 * 5; i++) {
      c.setInput({ y: i < 240 ? 0.5 : -0.5 }); c.step(1);
      yaws.push(sk.yaw);
      if (sk.state === 'fall') fell = true;
      if (sk.removed) break;
    }
  }
  c.setInput({});
  delete p.hurt;
  k2.setActive(false);
  out.seek = { got: !!sk, turned: yaws.length ? +(Math.max(...yaws) - Math.min(...yaws)).toFixed(2) : 0, fell };
  // Kanone: unverwundbar gegen Springen/Feuer, Kanonenkugel zerstört
  const shots1 = t.count('kanone_turm');
  k1.onHit('fire', p); k1.onHit('claw', p); k1.onHit('pound', p);
  out.immune = t.count('kanone_turm') === shots1 && !k1.defeated;
  k1.onCannon({ pos: k1.pos });
  c.step(1);
  out.destroyed = k1.defeated && t.count('kanone_turm') === shots1 - 1;
  return out;
});
console.log(`  Kanone: Schüsse ${kt.shots.join(', ')} (Abstände ${kt.gaps.join(', ')}); Kopf ${JSON.stringify(kt.straight)}; ${JSON.stringify({ st: kt.pkStomp, side: kt.pkSide, ride: kt.ride, seek: kt.seek })}`);
check(`Kanonenturm feuert im Intervall (3 s): ${kt.gaps.length + 1} Schüsse in 10 s`, kt.shots.length >= 3 && kt.gaps.every((g) => Math.abs(g - 3) < 0.05));
check('Projektilkopf fliegt geradeaus und zerplatzt an der Mauer', kt.straight && kt.straight.dz < 0.01 && kt.straight.burst);
check('Projektilkopf: Draufspringen = Abprall, er stürzt ab; seitlich = Treffer', kt.pkStomp.bounced && !kt.pkStomp.hurt && kt.pkStomp.defeated && kt.pkStomp.state === 'fall' && kt.pkSide);
check(`Reit-Projektilkopf trägt die Figur (${kt.ride.dx} m in 1 s)`, kt.ride.on && kt.ride.mode === 'ground' && kt.ride.dx > 2.5 && !kt.ride.hurt);
check(`Suchkopf folgt der Figur (dreht ${kt.seek.turned} rad) und stürzt danach ab`, kt.seek.got && kt.seek.turned > 0.4 && kt.seek.fell);
check('Kanonenturm: Feuer/Krallen/Stampfen wirkungslos, Kanonenkugel zerstört ihn', kt.immune && kt.destroyed);

// ================================================================ Feuer-Schnappblume
const fs = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('fs_topf');
  t.place([f.pos.x - 2, 1, f.pos.z + 4.5], { settle: 1 });
  let ball = null, hurt = false, t0 = -1;
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    c.step(1);
    for (const e of L.entities) if (e.kind === 'feuerkugel' && e.owner === f) seen.add(e);
    if (!ball && seen.size) { ball = [...seen][0]; t0 = i; out.prog = +f.progress.toFixed(2); }
    if (t.hurt()) { hurt = true; break; }
  }
  out.spits = f.spits; out.hurt = hurt; out.tilt = f.tilt;
  out.top = t.stomp(f, { h: 0.8 });
  out.fire = (() => { f.invuln = 0; f.onHit('fire', p); return f.defeated; })();
  const g = t.ent('fs_boden');
  g.onHit('throw', p);
  out.throw = g.defeated;
  return out;
});
console.log(`  Feuer-Schnappblume: ${JSON.stringify(fs)}`);
check('Feuer-Schnappblume zielt und spuckt Feuerkugeln (bei 50 % des Spuckens), die die Figur treffen', fs.spits >= 1 && fs.hurt && Math.abs(fs.prog - 0.5) < 0.02);
check('Feuer-Schnappblume: von oben = Treffer; Feuer und Wurf besiegen', fs.top.hurt && fs.fire && fs.throw);

// ================================================================ Lauerblock
const lb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b1 = t.ent('lb1'), b3 = t.ent('lb3');
  // Figur in der Bahn → späht; sie geht weg → stößt ganz heraus (2,5 m), wartet, fährt zurück
  t.place([-11.2, 1, t.Z(7, 4)], { settle: 1 });
  const seq = [];
  let maxOut = 0;
  for (let i = 0; i < 400; i++) {
    c.step(1);
    if (b1.state === 'peek' && p.pos.z > t.Z(7, 6)) { p.pos.set(-11.2, 1, t.Z(7, 6)); p.vel.set(0, 0, 0); }
    if (seq[seq.length - 1] !== b1.state) seq.push(b1.state);
    maxOut = Math.max(maxOut, b1.out);
  }
  out.seq = seq.join('>'); out.maxOut = +maxOut.toFixed(2);
  // Tragen: auf lb3 (oben offen) stehen, während er ausfährt
  t.place([-13.5, 2.1, t.Z(7, 12)], { settle: 30 });
  out.onTop = { on: p.ground?.owner === b3, y: +p.pos.y.toFixed(2) };
  b3.setState('peek');
  const x0 = p.pos.x;
  for (let i = 0; i < 80; i++) c.step(1);
  out.carry = { dx: +(p.pos.x - x0).toFixed(2), out: b3.out, on: p.ground?.owner === b3, hurt: t.hurt() };
  // Einklemmen gegen die Gegenwand (x −10,2)
  t.place([-10.45, 1, t.Z(7, 4)], { settle: 1, yaw: Math.PI });
  b1.setState('wait'); b1.cool = 0; b1.out = 0; b1.syncShape();
  let crushed = false;
  for (let i = 0; i < 200; i++) { c.step(1); if (t.hurt()) { crushed = true; break; } }
  out.crush = { crushed, crushes: b1.crushes, state: b1.state };
  // Nicht eingeklemmt (frei vor ihm) → nur geschoben, kein Treffer
  const b2 = t.ent('lb2');
  t.place([-11, 1, t.Z(7, 10)], { settle: 1 });
  const n0 = b2.pushes;
  for (let i = 0; i < 120 * 8; i++) c.step(1);
  out.timed = { pushes: b2.pushes - n0 };
  return out;
});
console.log(`  Lauerblock: ${JSON.stringify(lb)}`);
check('Lauerblock: Figur in der Bahn → späht, stößt heraus (2,5 m) und fährt zurück', /peek>push>hold>back>wait/.test(lb.seq) && Math.abs(lb.maxOut - 2.5) < 0.01);
check(`Lauerblock trägt die Figur (steht darauf, ${lb.carry.dx} m mitgenommen)`, lb.onTop.on && lb.carry.dx > 1.2 && lb.carry.on && !lb.carry.hurt);
check('Lauerblock: eingeklemmt zwischen Block und Wand = Treffer', lb.crush.crushed && lb.crush.crushes >= 1);
check(`Lauerblock (Takt 2,6 s): stößt regelmäßig, auch ohne Figur in der Bahn (${lb.timed.pushes}× in 8 s)`, lb.timed.pushes >= 3 && lb.timed.pushes <= 4);

// ================================================================ Münzmarder
const mm = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const m = t.ent('marder');
  t.place([0, 1, t.Z(7, -3)], { settle: 30 });
  out.wait = m.state;
  // Annäherung → flieht; über den Graben springen (die Figur bleibt zurück)
  let jumped = false, maxY = 0, run = false;
  t.place([4.8, 1, t.Z(7, 2.5)], { settle: 1 });
  for (let i = 0; i < 400 && !m.removed; i++) {
    c.setInput({ x: i < 30 ? 1 : 0, run: true }); c.step(1);
    if (m.state === 'run') run = true;
    if (m.state === 'jump') { jumped = true; maxY = Math.max(maxY, m.pos.y); }
    if (jumped && m.state === 'run') break;
  }
  c.setInput({});
  out.run = run; out.jump = { jumped, maxY: +maxY.toFixed(2), hits: m.hits };
  // einholen: Figur direkt an ihn setzen
  const coins0 = L.runtime.coins ?? 0;
  t.place([m.pos.x, m.pos.y + 0.1, m.pos.z], { settle: 0 });
  c.step(2);
  out.hit = { hits: m.hits, state: m.state, flying: m.rained, hurt: t.hurt() };
  for (let i = 0; i < 120 && m.state === 'hit'; i++) c.step(1);
  t.place([m.pos.x, m.pos.y + 0.1, m.pos.z], { settle: 0 });
  c.step(2);
  out.second = { hits: m.hits, state: m.state, defeated: m.defeated, flying: m.rained };
  c.step(150);
  // Münzen einsammeln (alle liegenden Münzen nacheinander berühren)
  const flying = L.entities.filter((e) => e.kind === 'muenze_flug' && e.alive);
  out.resting = flying.filter((e) => e.resting).length;
  let got = 0;
  for (const e of flying) {
    if (e.removed) continue;
    p.pos.set(e.pos.x, e.pos.y + 0.05, e.pos.z);
    p.vel.set(0, 0, 0);
    c.step(1);
    if (e.removed) got++;
  }
  out.collected = got;
  out.coins = (L.runtime.coins ?? 0) - coins0;
  // Entkommen: zweiter Marder läuft bis zum Bahnende, ohne eingeholt zu werden
  const m2 = L.spawn('muenzmarder', { path: [[6, 1, -125], [18, 1, -125]], speed: 7, sight: 30, lead: 40 });
  t.place([0, 1, -125], { settle: 1 });
  let i = 0;
  for (; i < 600 && !m2.removed; i++) c.step(1);
  out.escape = { escaped: m2.escaped, defeated: m2.defeated, t: +(i / 120).toFixed(2) };
  return out;
});
console.log(`  Münzmarder: ${JSON.stringify(mm)}`);
check('Münzmarder wartet, flieht bei Annäherung und springt über den Graben', mm.wait === 'wait' && mm.run && mm.jump.jumped && mm.jump.maxY > 1.5 && mm.jump.hits === 0);
check(`Münzmarder eingeholt: Treffer → Münzregen (${mm.hit.flying}), zweiter Treffer besiegt ihn (${mm.second.flying} Münzen), Figur unverletzt`, mm.hit.hits === 1 && mm.hit.flying >= 8 && mm.second.defeated && mm.second.flying >= 30 && !mm.hit.hurt);
check(`Münzregen landet und lässt sich einsammeln (${mm.resting} liegen, +${mm.coins} Bitcoins)`, mm.resting >= 20 && mm.collected >= 20 && mm.coins >= 20);
check(`Münzmarder entkommt am Bahnende (verschwindet, ${mm.escape.t} s)`, mm.escape.escaped && !mm.escape.defeated);

check('Keine Konsolenfehler (Gegnerzoo)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

// ================================================================ Kennzahlen und Screenshots (frisches Level)
await load('0-6');
/** Aufbau, Kamera nachführen, auf neue Bilder warten, Screenshot. Figur unverwundbar ohne Blinken. */
const SHOT = async (name, setup, frames = 2) => {
  await sc(() => { const p = window.__course.player; p.hurt = () => false; });
  await sc(setup);
  const f0 = await sc(() => {
    const c = window.__course;
    c.player.invuln = 0;
    for (let i = 0; i < 30; i++) c.rig.update(0.05, c.view.time + i * 0.05);
    c.snapCamera();
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + frames, { timeout: 30000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w2en_${name}.png` });
  return sc(() => window.__course.stats());
};
const calls = {};
const rec = (name, s) => { calls[name] = s; };
rec('hackvogel', await SHOT('hackvogel', () => {
  const c = window.__course, t = window.__t, h = t.ent('hv_stand');
  t.place([-11, 1, -8.8], { settle: 1 });
  for (let i = 0; i < 400 && h.state !== 'stuck'; i++) c.step(1);
  c.step(12);
}));
rec('rollpilz', await SHOT('rollpilz', () => {
  const c = window.__course, t = window.__t, p = c.player, r = t.ent('rp1');
  t.stomp(r);
  t.place([r.pos.x - 0.75, 1, r.pos.z], { settle: 2, yaw: 0 });
  t.action();
  c.setInput({ x: 0.4, y: -0.3 }); c.step(30); c.setInput({});
}));
rec('lava', await SHOT('grossrollpilz', () => {
  const c = window.__course, t = window.__t, g = t.ent('grp');
  t.place([-9, 2.2, t.Z(2, 4)], { settle: 1 });
  g.pos.set(-12, 2.2, t.Z(2, 7.5));
  c.step(60);
}));
rec('wuschel', await SHOT('wuschel', () => { const c = window.__course, t = window.__t; t.place([8, 1, t.Z(2, -1)], { settle: 60 }); }));
rec('huepf', await SHOT('huepfmaus', () => {
  const c = window.__course, t = window.__t, m = t.ent('hm2');
  t.place([-8, 1, t.Z(3, 6)], { settle: 40 });
  c.setInput({ jump: true }); c.step(16); c.setInput({});
}));
rec('marsch', await SHOT('marschblock', () => { const c = window.__course, t = window.__t; t.place([-11.5, 1, t.Z(4, -1.5)], { settle: 120 }); }));
rec('mini', await SHOT('mini', () => { const c = window.__course, t = window.__t; t.place([10, 1, t.Z(4, 1)], { settle: 60 }); }));
rec('werfer', await SHOT('werfer', () => {
  const c = window.__course, t = window.__t, f = t.ent('wf_feuer');
  t.place([-9, 1, t.Z(5, 1)], { settle: 1 });
  for (let i = 0; i < 900 && !(f.state === 'throw' && f.stateT > 0.32); i++) c.step(1);
  c.step(10);
}));
rec('hammer', await SHOT('hammer', () => {
  const c = window.__course, t = window.__t, h = t.ent('wf_hammer');
  t.place([12, 1, t.Z(5, 1.5)], { settle: 1 });
  for (let i = 0; i < 900 && !(h.state === 'throw' && h.stateT > 0.36); i++) c.step(1);
  c.step(14);
}));
rec('kanone', await SHOT('kanone', () => {
  const c = window.__course, t = window.__t, k = t.ent('kt1');
  t.place([-7, 1, t.Z(6, 1.5)], { settle: 1 });
  for (let i = 0; i < 900 && !(k.state === 'fire' && k.stateT > 0.25); i++) c.step(1);
  c.step(30);
}));
rec('blume', await SHOT('feuerblume', () => {
  const c = window.__course, t = window.__t, f = t.ent('fs_topf');
  t.place([8, 1, t.Z(6, 1.6)], { settle: 1 });
  for (let i = 0; i < 900 && !(f.state === 'spit' && f.stateT > 0.45); i++) c.step(1);
  c.step(8);
}));
rec('lauer', await SHOT('lauerblock', () => {
  const c = window.__course, t = window.__t, b = t.ent('lb1'), p = c.player;
  t.place([-11.2, 1, t.Z(7, 4)], { settle: 1 });
  for (let i = 0; i < 300 && b.state !== 'hold'; i++) { c.step(1); if (b.state === 'peek') { p.pos.set(-11.4, 1, t.Z(7, 2)); p.vel.set(0, 0, 0); } }
  c.view.rig.rotate(1);
}));
rec('marder', await SHOT('muenzmarder', () => {
  const c = window.__course, t = window.__t, m = t.ent('marder');
  t.place([5, 1, t.Z(7, 0.8)], { settle: 1 });
  for (let i = 0; i < 200 && m.state !== 'jump'; i++) { c.setInput({ x: 1, run: true }); c.step(1); }
  c.setInput({});
  c.step(6);
}));
rec('marder_regen', await SHOT('muenzregen', () => {
  const c = window.__course, t = window.__t, m = t.ent('marder');
  t.place([m.pos.x + 0.5, m.pos.y + 0.1, m.pos.z], { settle: 0 });
  c.step(2);
  c.step(30);
}));
rec('start', await SHOT('zoo', () => { window.__t.place([0, 1, 3], { yaw: Math.PI / 2 }); window.__course.step(30); }));
const maxCalls = Math.max(...Object.values(calls).map((s) => s.calls));
const maxTri = Math.max(...Object.values(calls).map((s) => s.triangles));
console.log(`  Zeichenaufrufe je Station: ${Object.entries(calls).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${maxCalls}, ${Math.round(maxTri / 1000)} k Dreiecke`);
check(`Gegnerzoo: Zeichenaufrufe < 140 an jeder Station (höchstens ${maxCalls})`, maxCalls < 140);
check('Keine Konsolenfehler (Screenshots Zoo)', errors.length === 0);

// =====================================================================================================================
// Wirbelbrocken 0-7
// =====================================================================================================================
await load('0-7');
console.log('Wirbelbrocken-Arena 0-7');
await sc(() => {
  const c = window.__course, t = window.__t, L = c.level;
  t.boss = () => t.ent('wirbel');
  t.arch = () => c.state().archetype;
  /** In die Arena gehen (trigger) und warten, bis der Auftritt vorbei ist. */
  t.enter = () => {
    t.place([0, 2, 8.5], { settle: 2 });
    for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  /** Bis Zustand s (höchstens n Schritte). */
  t.until = (s, n = 1200) => { const b = t.boss(); let i = 0; for (; i < n && b.state !== s; i++) c.step(1); return i; };
  /** Figur außer Reichweite in Sicherheit halten (gegenüber vom Boss). */
  t.safe = () => {
    const b = t.boss(), p = c.player;
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d < 4.5) { const ang = Math.atan2(b.pos.z, b.pos.x) + Math.PI; p.pos.set(Math.cos(ang) * 8, 2, Math.sin(ang) * 8); p.vel.set(0, 0, 0); }
  };
  /** Schritte mit Sicherheitsabstand bis Zustand s. */
  t.untilSafe = (s, n = 1500) => { const b = t.boss(); let i = 0; for (; i < n && b.state !== s; i++) { t.safe(); c.step(1); } return i; };
});
const bf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.boss();
  out.before = { state: b.state, visible: b.visible };
  const a = t.enter();
  out.start = { started: a.started, state: b.state, hud: a.hud?.boss?.hp };
  t.until('run', 600);
  out.afterIntro = b.state;
  // Phase 1: Draufspringen im Lauf → nur Abprall, kein Treffer
  const s = t.stomp(b, { h: 0.6 });
  out.runStomp = { ...s, hp: b.hp, state: b.state };
  // Wirbeln: Fäuste treffen die Figur in Reichweite
  t.until('spin', 600);
  t.place([b.pos.x + 1.6, 2, b.pos.z], { settle: 0 });
  let spinHurt = false;
  for (let i = 0; i < 60; i++) { c.step(1); if (t.hurt()) { spinHurt = true; break; } }
  out.spinHurt = spinHurt;
  if (b.model) { b.model.update(0.02, b.modelState()); out.reach = b.model.root.userData.reach; }
  // Phase-1-Ablauf messen: Zahl der Wirbel bis zum Schwindel
  t.place([0, 2, 8], { settle: 1 });
  p.hurt = () => false;
  t.untilSafe('run', 1500);
  b.spinsDone = 0;
  let spins = 0, last = b.state;
  for (let i = 0; i < 1500 && b.state !== 'stunned'; i++) { t.safe(); c.step(1); if (b.state === 'spin' && last !== 'spin') spins++; last = b.state; }
  delete p.hurt;
  out.p1 = { spins, state: b.state, phase: b.phase };
  // Verwundbar: Draufspringen im Schwindel = Treffer
  const s1 = t.stomp(b, { h: 0.6 });
  out.hit1 = { ...s1, hp: b.hp, state: b.state, hud: t.arch().hud?.boss?.hp };
  t.until('hide', 200);
  // Panzerkugel: rollt, prallt an der Grenze ab, Berührung schadet
  const rs = [];
  let maxR = 0, dirs = new Set();
  for (let i = 0; i < 240 && b.state === 'hide'; i++) { t.safe(); c.step(1); maxR = Math.max(maxR, Math.hypot(b.pos.x, b.pos.z)); dirs.add(Math.sign(b.rollDir.x) + ',' + Math.sign(b.rollDir.z)); }
  out.hide = { maxR: +maxR.toFixed(2), dirs: dirs.size, half: b.half.y };
  // Kugel seitlich berühren = Treffer
  if (b.state === 'hide') {
    const d = b.rollDir;
    t.place([b.pos.x + d.x * 1.6, 2, b.pos.z + d.z * 1.6], { settle: 0 });
    let hurt = false;
    for (let i = 0; i < 40; i++) { c.step(1); if (t.hurt()) { hurt = true; break; } }
    out.hide.hurt = hurt;
  }
  return out;
});
console.log(`  Boss Start: ${JSON.stringify(bf)}`);
check('Wirbelbrocken: Kampf beginnt beim Betreten (Auftritt, Lebensleiste 3/3)', bf.before.state === 'wait' && bf.start.started && bf.start.state === 'intro' && bf.start.hud === 3 && bf.afterIntro === 'run');
check('Wirbelbrocken: Draufspringen beim Laufen = nur Abprall (kein Treffer)', bf.runStomp.bounced && bf.runStomp.hp === 3 && !bf.runStomp.hurt);
check('Wirbelbrocken: wirbelnde Fäuste treffen die Figur (Reichweite 1,4 m)', bf.spinHurt && bf.reach === 1.4);
check('Wirbelbrocken Phase 1: ein Wirbel, dann schwindelig', bf.p1.spins === 1 && bf.p1.state === 'stunned' && bf.p1.phase === 1);
check('Wirbelbrocken: im Schwindel Draufspringen = Treffer (3 → 2, Leiste)', bf.hit1.hp === 2 && bf.hit1.bounced && !bf.hit1.hurt && bf.hit1.hud === 2);
check('Wirbelbrocken: Panzerkugel rollt durch die Arena, prallt an der Grenze ab und verletzt bei Berührung', bf.hide.maxR > 8 && bf.hide.maxR < 10.7 && bf.hide.dirs >= 2 && bf.hide.hurt);

const bf2 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.boss();
  p.hurt = () => false;
  t.untilSafe('run', 800);
  let spins = 0, last = b.state, runSp = 0;
  const p0 = { x: b.pos.x, z: b.pos.z };
  for (let i = 0; i < 2000 && b.state !== 'stunned'; i++) {
    t.safe(); c.step(1);
    if (b.state === 'spin' && last !== 'spin') spins++;
    last = b.state;
  }
  out.p2 = { spins, phase: b.phase, run: b.P.run, hide: b.P.hide };
  delete p.hurt;
  // Kanonenkugel außerhalb des Fensters (Kugel) zählt nicht; im Schwindel per Kanonenkugel
  const s = t.stomp(b, { h: 0.6 });
  out.hit2 = { hp: b.hp, bounced: s.bounced };
  t.until('hide', 200);
  b.onCannon({ pos: { x: b.pos.x + 1, y: b.pos.y, z: b.pos.z } });
  out.cannonInHide = b.hp;
  p.hurt = () => false;
  t.untilSafe('run', 800);
  spins = 0; last = b.state;
  for (let i = 0; i < 2500 && b.state !== 'stunned'; i++) { t.safe(); c.step(1); if (b.state === 'spin' && last !== 'spin') spins++; last = b.state; }
  out.p3 = { spins, phase: b.phase, run: b.P.run, hide: b.P.hide };
  delete p.hurt;
  // Phase 3: Kanonenkugel des Kanonen-Helms (starker Treffer)
  b.onCannon({ pos: b.pos });
  out.final = { hp: b.hp, state: b.state, defeated: b.defeated, log: b.hitLog.map((h) => `${h.where}@${h.state}`).join(' ') };
  t.until('gone', 800);
  out.gone = { state: b.state, visible: b.visible };
  c.step(2);
  const a = t.arch();
  out.arch = { won: a.won, started: a.started };
  const w = t.ent('warp_sieg');
  out.warp = { hidden: w.hidden };
  return out;
});
console.log(`  Boss Phasen: ${JSON.stringify(bf2)}`);
check(`Wirbelbrocken Phase 2: schneller (${bf2.p2.run} m/s, Kugel ${bf2.p2.hide} m/s) und zwei Wirbel`, bf2.p2.phase === 2 && bf2.p2.spins === 2 && bf2.p2.run > 5);
check('Wirbelbrocken: Kanonenkugel prallt an der Panzerkugel ab (kein Treffer)', bf2.cannonInHide === 1 && bf2.hit2.hp === 1);
check(`Wirbelbrocken Phase 3: noch schneller (${bf2.p3.run} m/s) und drei Wirbel`, bf2.p3.phase === 3 && bf2.p3.spins === 3 && bf2.p3.run > bf2.p2.run);
check('Wirbelbrocken: Kanonenkugel im Fenster = Treffer, dritter Treffer besiegt (defeated → gone)', bf2.final.hp === 0 && bf2.final.defeated && bf2.gone.state === 'gone' && !bf2.gone.visible);
check('Sieg: Boss-Archetyp gewinnt, Warp-Box erscheint', bf2.arch.won && bf2.warp.hidden === false);

const fin = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = null;
  for (let i = 0; i < 400; i++) { c.step(1); if (p.pos.z < -35 && p.mode !== 'script') { arrived = p.info(); break; } }
  // zum Zielmast
  for (let i = 0; i < 600 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
  return { arrived: arrived && [arrived.x, arrived.z], finished: c.finished, status: L.runtime.status };
});
console.log(`  Ziel: ${JSON.stringify(fin)}`);
check('Warp-Box führt zum Zielplateau, Zielmast beendet das Level', !!fin.arrived && fin.finished);

// Tod im Kampf setzt den Kampf zurück
await load('0-7');
const dr = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const b = L.named.get('wirbel');
  t.place([0, 2, 8.5], { settle: 2 });
  for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 600 && b.state !== 'run'; i++) c.step(1);
  b.hp = 2;
  p.die('hit');
  for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  return { state: b.state, hp: b.hp, x: b.pos.x, z: b.pos.z, arch: c.state().archetype };
});
check('Tod im Kampf: Neustart, Wirbelbrocken wieder 3/3 in der Mitte, Kampf beginnt von vorn', dr.state === 'wait' && dr.hp === 3 && !dr.arch.started && dr.arch.deaths === 1);
check('Keine Konsolenfehler (Boss)', errors.length === 0);

// Screenshots Boss
const BSHOT = async (name, setup, frames = 2) => {
  await sc(() => { const p = window.__course.player; p.hurt = () => false; });
  await sc(setup);
  const f0 = await sc(() => {
    const c = window.__course;
    c.player.invuln = 0;
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + frames, { timeout: 30000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w2en_${name}.png` });
  return sc(() => window.__course.stats());
};
await load('0-7');
await sc(() => {
  const c = window.__course, t = window.__t;
  t.boss = () => t.ent('wirbel');
  t.untilB = (s, n = 1500) => { const b = t.boss(); for (let i = 0; i < n && b.state !== s; i++) c.step(1); };
  t.place([0, 2, 8.5], { settle: 2 });
  for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
});
const bs = {};
bs.intro = await BSHOT('boss_auftritt', () => { window.__course.step(110); });
bs.spin = await BSHOT('boss_wirbel', () => { const t = window.__t; t.untilB('spin'); window.__course.step(30); });
bs.stun = await BSHOT('boss_schwindel', () => { const t = window.__t; t.untilB('stunned'); window.__course.step(20); });
bs.hide = await BSHOT('boss_kugel', () => { const t = window.__t, b = t.boss(); t.stomp(b, { h: 0.6 }); t.untilB('hide'); window.__course.step(50); });
bs.p3 = await BSHOT('boss_phase3', () => {
  const t = window.__t, b = t.boss(), c = window.__course;
  t.untilB('stunned', 3000); t.stomp(b, { h: 0.6 }); t.untilB('run', 1500); t.untilB('spin', 1500); c.step(25);
});
bs.def = await BSHOT('boss_sieg', () => {
  const t = window.__t, b = t.boss(), c = window.__course;
  t.untilB('stunned', 4000); t.stomp(b, { h: 0.6 }); c.step(90);
});
const bMax = Math.max(...Object.values(bs).map((s) => s.calls));
console.log(`  Boss-Zeichenaufrufe: ${Object.entries(bs).map(([k, s]) => `${k} ${s.calls}`).join(', ')}`);
check(`Boss-Arena: Zeichenaufrufe < 140 (höchstens ${bMax})`, bMax < 140);
check('Keine Konsolenfehler (Screenshots Boss)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
