// Kurs-Modus: Gegner und Power-ups im Gegnerpark (0-1) deterministisch prüfen – Verhalten und Konter je Gegner,
// jedes Power-up (Wirkung, Dauer, Ende), Tragen/Werfen; danach Screenshots tests/out/ce_*.png (Sichtprüfung,
// Gegner in Aktion aus der Kurs-Kamera). Simulation nur über window.__course.step(n) und setInput.
// Aufruf: PORT_BASE=1600 node tests/course_enemies.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4194;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const URL_ = `http://localhost:${port}/?course=0-1&scale=2&adapt=0`;

async function load() {
  await page.goto(URL_, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
  } catch {
    console.log('Gegnerpark startet nicht. Konsole:');
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  // Hilfen in der Seite
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    const P = () => c.player;
    const L = c.level;
    window.__t = {
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
      /** Von oben auf e fallen (x/z folgen e), bis Abprall oder Landung. */
      stomp(e, o = {}) {
        const p = P();
        const top = e.pos.y + e.half.y * 2;
        this.place([e.pos.x, top + (o.h ?? 1.2), e.pos.z], { settle: 0, ...o });
        let bounced = false, hurt = false;
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground') break;
        }
        c.setInput({});
        return { bounced, hurt };
      },
      /** Seitlich (von +x) gegen e laufen; Treffer? */
      side(e, o = {}) {
        const p = P();
        const gap = e.half.x + p.half.x + 0.08;
        this.place([e.pos.x + gap, o.y ?? e.pos.y, e.pos.z], { settle: 1, yaw: Math.PI });
        let hurt = false;
        for (let i = 0; i < (o.max ?? 40); i++) { c.setInput({ x: -0.6 }); c.step(1); if (p.invuln > 0 || !p.big || p.dead) { hurt = true; break; } }
        c.setInput({});
        return { hurt };
      },
      /** Aktion einmal drücken. */
      action(extra = {}) { c.setInput({ ...extra, action: true }); c.step(1); c.setInput({ ...extra }); c.step(1); },
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      info: () => P().info(),
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);

await load();
console.log('Gegnerpark 0-1');
const st0 = await sc(() => {
  const c = window.__course;
  const kinds = {};
  for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  return { kinds, player: c.player.info() };
});
const NEED = ['pilzling', 'krallen_pilzling', 'pilzlingsturm', 'panzerkroete', 'panzer', 'schnappblume', 'riesenschnappblume', 'rammbock_bulle',
  'krabbelkaefer', 'flatterkaefer', 'zauberkroete', 'brummer', 'stampfstein', 'wuehler', 'kickbombe', 'steinblock'];
check(`Alle Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
check('Keine Konsolenfehler beim Laden', errors.length === 0);

// ================================================================ Pilzling
const pz = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  t.place([0, 1, -15]);
  const walk = t.ent('pz_walk'), patrol = t.ent('pz_patrol');
  const xs = [], wx = [];
  for (let i = 0; i < 1600; i++) { c.step(1); xs.push(patrol.pos.x); wx.push(walk.dir.x); }
  const out = { pMin: Math.min(...xs), pMax: Math.max(...xs), turned: wx.some((v) => v < -0.5) && wx.some((v) => v > 0.5) };
  // Verfolgen: Hüpfer (alert), dann auf die Figur zu
  const ch = t.ent('pz_chase');
  ch.pos.set(-8, 1, -19.5); ch.setState('walk'); ch.dir = { x: 1, z: 0 };
  t.place([-12, 1, -19.5], { settle: 1, yaw: 0 });
  const seen = new Set();
  let maxVy = 0;
  for (let i = 0; i < 400; i++) { c.step(1); seen.add(ch.state); if (ch.state === 'alert') maxVy = Math.max(maxVy, ch.vel.y); if (p.invuln > 0) break; }
  out.alert = seen.has('alert'); out.chase = seen.has('chase'); out.chaseHurt = p.invuln > 0; out.hop = maxVy;
  // Draufspringen
  const s = t.stomp(walk);
  out.stomp = { ...s, state: walk.state, defeated: walk.defeated };
  out.side = t.side(patrol);
  return out;
});
console.log(`  Pilzling: Patrouille x ${f2(pz.pMin)} … ${f2(pz.pMax)}, Läufer kehrt um ${pz.turned}; Verfolger alert=${pz.alert} chase=${pz.chase}`);
check('Pilzling patrouilliert zwischen den Wegpunkten', pz.pMin < -15 && pz.pMax > -7);
check('Pilzling läuft geradeaus und kehrt an der Mauer um', pz.turned);
check('Pilzling (chase): Hüpfer mit „!“, verfolgt und trifft die Figur', pz.alert && pz.chase && pz.chaseHurt && pz.hop > 3);
check('Pilzling: draufspringen besiegt (platt, Abprall, kein Treffer)', pz.stomp.state === 'squashed' && pz.stomp.bounced && !pz.stomp.hurt && pz.stomp.defeated);
check('Pilzling: seitlich = Treffer', pz.side.hurt);

// ================================================================ Krallen-Pilzling
const kp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const k = t.ent('kp1');
  t.place([12.5, 1, -15], { settle: 1, yaw: Math.PI });
  k.pos.set(8, 1, -15); k.setState('walk'); k.cool = 0; k.dir = { x: 1, z: 0 };
  const seen = [];
  let leapFrom = null, leapMaxY = 0, hurtAt = -1;
  for (let i = 0; i < 300; i++) {
    c.step(1);
    if (seen[seen.length - 1] !== k.state) seen.push(k.state);
    if (k.state === 'leap') { if (!leapFrom) leapFrom = k.pos.x; leapMaxY = Math.max(leapMaxY, k.pos.y); }
    if (p.invuln > 0) { hurtAt = i; break; }
  }
  const out = { seen, leap: leapFrom !== null ? k.pos.x - leapFrom : 0, leapH: leapMaxY - 1, hurt: hurtAt >= 0, hurtT: hurtAt / 120 };
  const k2 = t.ent('kp2');
  k2.setState('walk'); k2.cool = 5;
  out.stomp = { ...t.stomp(k2), state: k2.state };
  return out;
});
console.log(`  Krallen-Pilzling: ${kp.seen.join(' → ')}, Sprung ${f2(kp.leap)} m weit / ${f2(kp.leapH)} m hoch, Treffer nach ${f2(kp.hurtT)} s`);
check('Krallen-Pilzling: Ankündigung (alert, ducken), dann Sprung auf die Figur', ['alert', 'crouch', 'leap'].every((s) => kp.seen.includes(s)) && kp.leap > 3 && kp.leapH > 0.8 && kp.hurt);
check(`Krallen-Pilzling: draufspringen besiegt (${JSON.stringify(kp.stomp)})`, kp.stomp.bounced && !kp.stomp.hurt && kp.stomp.state === 'squashed');

// ================================================================ Pilzlingsturm
const tw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, rt = c.level.runtime;
  const a = t.ent('turm3');
  const counts = [], res = [];
  for (let k = 0; k < 3; k++) {
    res.push(t.stomp(a, { h: 0.8 }));
    counts.push(a.count);
    t.place([-11, 1, -24.8], { settle: 40 });
  }
  const out = { counts, bounced: res.every((r) => r.bounced), hurt: res.some((r) => r.hurt), defeated: a.defeated, removed: a.removed };
  const b = t.ent('turm5');
  out.star0 = b.riding ? { touch: b.riding.touch } : null;
  out.side = t.side(b);
  const res5 = [];
  for (let k = 0; k < 5; k++) { res5.push(t.stomp(b, { h: 0.8 })); t.place([-4.8, 1, -31], { settle: 40 }); }
  out.counts5 = b.count;
  const star = c.level.entities.find((e) => e.kind === 'star' && e.index === 2);
  out.starFree = !!star && star.touch !== false;
  if (star) t.place([star.pos.x, star.pos.y, star.pos.z], { settle: 3 });
  out.starGot = rt.stars[2] === true;
  return out;
});
console.log(`  Pilzlingsturm: Stufen 3 → ${tw.counts.join(' → ')}, Fünferturm → ${tw.counts5}, Stern frei=${tw.starFree}`);
check('Pilzlingsturm: von oben stufenweise abtragen (Abprall, kein Treffer)', tw.counts.join() === '2,1,0' && tw.bounced && !tw.hurt && tw.defeated);
check('Pilzlingsturm: seitlich = Treffer', tw.side.hurt);
check('Pilzlingsturm trägt Stern 3: erst nach dem letzten Pilzling einsammelbar', tw.star0 && tw.star0.touch === false && tw.counts5 === 0 && tw.starFree && tw.starGot);

// ================================================================ Panzerkröte, Panzer, Panzerbahn, Goldpanzer
const pk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const kr = t.ent('kroete');
  const out = {};
  out.side = t.side(kr);
  const s = t.stomp(kr);
  const kx = kr.pos.x, kz = kr.pos.z;
  t.place([kx, 1, kz + 4], { settle: 40 });
  const sh = L.entities.find((e) => e.kind === 'panzer' && !e.removed && Math.hypot(e.pos.x - kx, e.pos.z - kz) < 1.5);
  out.stomp = { ...s, shell: !!sh, kroeteGone: kr.removed };
  if (sh) {
    // Kick: von der Seite anlaufen → gleitet mit ≈ 10 m/s davon
    t.place([sh.pos.x + 0.75, 1, sh.pos.z], { settle: 1, yaw: Math.PI });
    for (let i = 0; i < 20 && sh.state !== 'slide'; i++) { c.setInput({ x: -0.5 }); c.step(1); }
    c.setInput({});
    const x0 = sh.pos.x;
    c.step(12);
    out.kick = { state: sh.state, speed: Math.abs(sh.pos.x - x0) / (12 / 120), hurt: p.invuln > 0 };
    sh.kill();
  }
  // Panzerbahn: Kick → drei Pilzlinge besiegt → Rückpraller trifft
  const bs = t.ent('panzer');
  const bahn = [1, 2, 3].map((i) => t.ent(`bahn${i}`));
  bs.pos.set(-6.5, 1, -47); bs.setState('idle');
  t.place([-5.75, 1, -47], { settle: 1, yaw: Math.PI });
  for (let i = 0; i < 20 && bs.state !== 'slide'; i++) { c.setInput({ x: -0.5 }); c.step(1); }
  c.setInput({});
  let hurtAt = -1, turnedBack = false;
  for (let i = 0; i < 500; i++) { c.step(1); if (bs.dir.x > 0.5) turnedBack = true; if (p.invuln > 0) { hurtAt = i; break; } }
  out.bahn = { defeated: bahn.map((e) => e.defeated), turnedBack, hurt: hurtAt >= 0, hurtT: hurtAt / 120 };
  // Draufspringen hält den gleitenden Panzer an
  t.place([-12, 1, -50]);
  bs.pos.set(-8, 1, -50); bs.dir = { x: -1, z: 0 }; bs.setState('slide'); bs.grace = 0;
  const r = t.stomp(bs, { h: 0.8 });
  out.stopStomp = { ...r, state: bs.state };
  bs.kill();
  // Goldpanzer: Münzen beim Gleiten
  const g = t.ent('kroete_gold');
  t.stomp(g);
  const gx = g.pos.x, gz = g.pos.z;
  t.place([gx, 1, gz + 4], { settle: 40 });
  const gs = L.entities.find((e) => e.kind === 'panzer' && e.gold && !e.removed);
  out.gold = !!gs;
  if (gs) {
    const coins0 = L.runtime.coins;
    t.place([gs.pos.x - 0.75, 1, gs.pos.z], { settle: 1, yaw: 0 });
    for (let i = 0; i < 20 && gs.state !== 'slide'; i++) { c.setInput({ x: 0.5 }); c.step(1); }
    c.setInput({});
    c.step(150);
    out.goldCoins = L.runtime.coins - coins0;
    gs.kill();
  }
  return out;
});
console.log(`  Panzer: Kick ${f2(pk.kick?.speed)} m/s, Bahn besiegt ${pk.bahn.defeated}, Rückpraller nach ${f2(pk.bahn.hurtT)} s, Goldpanzer +${pk.goldCoins} Münzen`);
check('Panzerkröte: seitlich = Treffer', pk.side.hurt);
check('Panzerkröte: draufspringen → zieht sich in den Panzer zurück', pk.stomp.bounced && !pk.stomp.hurt && pk.stomp.shell && pk.stomp.kroeteGone);
check('Panzer: Berühren kickt ihn (≈ 10 m/s), ohne Treffer', pk.kick && pk.kick.state === 'slide' && pk.kick.speed > 9 && pk.kick.speed < 11 && !pk.kick.hurt);
check('Panzer gekickt besiegt Gegner in der Bahn', pk.bahn.defeated.every(Boolean));
check('Panzer prallt an der Wand ab und verletzt die Figur, wenn er zurückkommt', pk.bahn.turnedBack && pk.bahn.hurt);
check('Gleitenden Panzer durch Draufspringen anhalten', pk.stopStomp.bounced && !pk.stopStomp.hurt && pk.stopStomp.state === 'idle');
check('Goldpanzer gibt beim Gleiten Münzen', pk.gold && pk.goldCoins >= 3);

// ================================================================ Tragen und Werfen
const cw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  t.place([2, 1, -6.9], { yaw: Math.PI / 2 });
  const sh = L.spawn('panzer', { pos: [2, 1, -8] });
  c.step(2);
  t.action();
  out.picked = p.holding === sh && sh.state === 'carried';
  out.above = sh.pos.y - p.pos.y;
  c.setInput({ jump: true }); c.step(30); c.setInput({});
  out.airHold = p.mode === 'air' && p.holding === sh;
  for (let i = 0; i < 200 && p.mode !== 'ground'; i++) c.step(1);
  out.landedHold = p.holding === sh;
  const z0 = p.pos.z;
  t.action();
  c.step(30);
  out.thrown = !p.holding && sh.state === 'slide' && sh.pos.z < z0 - 2;
  out.throwState = p.throwTime > 0 || true;
  sh.kill();
  // Absetzen mit Ducken
  const sh2 = L.spawn('panzer', { pos: [2, 1, -8] });
  t.place([2, 1, -6.9], { yaw: Math.PI / 2 });
  t.action();
  c.setInput({ crouch: true, action: true }); c.step(1); c.setInput({}); c.step(20);
  out.setDown = !p.holding && sh2.state === 'idle' && Math.hypot(sh2.pos.x - p.pos.x, sh2.pos.z - p.pos.z) < 1.2;
  sh2.kill();
  // Treffer lässt fallen (Kickbombe tragen)
  const b = L.spawn('kickbombe', { pos: [2, 1, -8] });
  t.place([2, 1, -6.9], { yaw: Math.PI / 2 });
  b.pos.set(2, 1, -8);
  t.action();
  out.bombPicked = p.holding === b && b.lit;
  p.hurt({ pos: { x: p.pos.x + 1, z: p.pos.z } });
  c.step(2);
  out.dropped = !p.holding && b.state === 'lit' && b.touch;
  b.kill();
  // Rennen gehalten + Berührung greift
  const sh3 = L.spawn('panzer', { pos: [2, 1, -9] });
  t.place([2, 1, -6], { yaw: Math.PI / 2 });
  for (let i = 0; i < 60 && !p.holding; i++) { c.setInput({ y: 1, run: true }); c.step(1); }
  c.setInput({});
  out.runGrab = p.holding === sh3;
  p.holding = null; c.step(2); sh3.kill();
  return out;
});
console.log(`  Tragen: aufgehoben=${cw.picked} (${f2(cw.above)} m über den Füßen), im Sprung=${cw.airHold}, geworfen=${cw.thrown}, abgesetzt=${cw.setDown}, Treffer lässt fallen=${cw.dropped}, Renngriff=${cw.runGrab}`);
check('Tragen: Aktion hebt den Panzer auf (über dem Kopf)', cw.picked && cw.above > 0.8);
check('Tragen: Springen mit Last möglich', cw.airHold && cw.landedHold);
check('Werfen: Aktion wirft in Blickrichtung (Panzer gleitet)', cw.thrown);
check('Absetzen: Ducken + Aktion', cw.setDown);
check('Treffer lässt das Getragene fallen (Kickbombe brennt weiter)', cw.bombPicked && cw.dropped);
check('Rennen gehalten + Berührung greift den Panzer', cw.runGrab);

// ================================================================ Schnappblume, Riesenschnappblume
const fl = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const out = {};
  const f = t.ent('blume_topf');
  t.place([7, 1, -44 + 1.45], { settle: 1, yaw: Math.PI / 2 });
  const seen = new Set();
  for (let i = 0; i < 360; i++) { c.step(1); seen.add(f.state); if (p.invuln > 0) break; }
  out.snap = { seen: [...seen], hurt: p.invuln > 0 };
  const s = t.stomp(f, { h: 1.0 });
  out.above = { ...s, alive: f.alive && !f.defeated };
  // Stampfattacke direkt neben der Blume (Figur kurz unverwundbar, damit der Biss den Test nicht stört)
  const g = t.ent('blume_boden');
  t.place([g.pos.x + 1.25, 3.2, g.pos.z], { settle: 0, yaw: Math.PI });
  p.invuln = 3;
  c.step(4);
  c.setInput({ crouch: true }); c.step(2); c.setInput({});
  for (let i = 0; i < 120 && p.mode !== 'ground'; i++) c.step(1);
  c.step(2);
  out.pound = { defeated: g.defeated, state: g.state };
  // Röhren-Schnappblume steht auf der Röhre und schnappt
  const r = t.ent('blume_rohr');
  t.place([r.pos.x - 2.2, 1, r.pos.z + 1], { settle: 1 });
  p.invuln = 5;
  const seenR = new Set();
  for (let i = 0; i < 240; i++) { c.step(1); seenR.add(r.state); }
  out.onPipe = { y: r.pos.y, grounded: r.grounded, snap: seenR.has('snap') };
  // Feuerball besiegt (Topf-Schnappblume, aus 3,2 m – außerhalb ihrer Reichweite)
  t.place([f.pos.x, 1, f.pos.z + 3.2], { yaw: Math.PI / 2, power: 'funken' });
  t.action();
  for (let i = 0; i < 120 && !f.defeated; i++) c.step(1);
  out.fire = f.defeated && !(p.invuln > 0);
  // Riesenschnappblume: 3 Treffer
  const G = t.ent('riesenblume');
  t.place([G.pos.x, 1, G.pos.z + 6], { yaw: Math.PI / 2, power: 'funken' });
  const hp = [];
  for (let k = 0; k < 3; k++) { t.action(); c.step(150); hp.push(G.hp); }
  c.step(80);
  out.giant = { hp, defeated: G.defeated, removed: G.removed, hurt: p.invuln > 0 && !p.big };
  return out;
});
console.log(`  Schnappblume: Zustände ${fl.snap.seen.join('/')}, Biss=${fl.snap.hurt}; Riesenschnappblume hp ${fl.giant.hp.join(' → ')}`);
check('Schnappblume schnappt nach der Figur in Reichweite', fl.snap.seen.includes('snap') && fl.snap.hurt);
check('Schnappblume: draufspringen verletzt (nur seitlich verwundbar)', fl.above.hurt && fl.above.alive);
check('Schnappblume: Stampfattacke daneben besiegt sie', fl.pound.defeated);
check('Schnappblume auf der Röhre (steht, schnappt)', fl.onPipe.grounded && fl.onPipe.y > 2.1 && fl.onPipe.snap);
check('Schnappblume: Feuerball besiegt sie', fl.fire);
check('Riesenschnappblume braucht 3 Treffer', fl.giant.hp.join() === '2,1,0' && fl.giant.defeated && !fl.giant.hurt);

// ================================================================ Rammbock-Bulle
const bu = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const b = t.ent('bulle');
  const out = {};
  b.pos.set(-11, 3, -63); b.setState('idle'); b.cool = 0; b.yaw = 0;
  t.place([-7.6, 3, -63], { settle: 1, yaw: Math.PI });
  const seen = [];
  let hurtAt = -1, maxX = -99, maxSpeed = 0;
  for (let i = 0; i < 600; i++) {
    c.step(1);
    if (seen[seen.length - 1] !== b.state) seen.push(b.state);
    if (p.invuln > 0 && hurtAt < 0) hurtAt = i;
    maxX = Math.max(maxX, b.pos.x);
    maxSpeed = Math.max(maxSpeed, b.gs);
    if (hurtAt >= 0 && b.state === 'recover') break;
  }
  out.charge = { seen, hurt: hurtAt >= 0, warnT: 0, maxX, y: b.pos.y, maxSpeed };
  // Wand: Sturmlauf nach Westen gegen die Mauer → benommen
  b.pos.set(-11, 3, -63); b.setState('idle'); b.cool = 0; b.yaw = Math.PI;
  t.place([-14.3, 3, -63], { settle: 1, yaw: 0 });
  p.invuln = 30;
  const seen2 = [];
  for (let i = 0; i < 400; i++) { c.step(1); if (seen2[seen2.length - 1] !== b.state) seen2.push(b.state); if (b.state === 'bonk') break; }
  out.wall = seen2;
  // 3× draufspringen
  b.pos.set(-11, 3, -63); b.setState('idle'); b.cool = 2; b.hp = 3; b.hitGrace = 0;
  const hits = [];
  for (let k = 0; k < 3; k++) {
    const r = t.stomp(b, { h: 0.7 });
    hits.push({ hp: b.hp, state: b.state, bounced: r.bounced, hurt: r.hurt });
    if (k < 2) {
      // harmlos, solange betäubt
      out['stunTouch' + k] = b.state === 'hit' || b.state === 'stunned';
      t.place([0, 1, -40], { settle: 200 });
    }
  }
  c.step(200);
  out.hits = hits;
  out.removed = b.removed;
  return out;
});
console.log(`  Bulle: ${bu.charge.seen.join(' → ')} (max ${f2(bu.charge.maxSpeed)} m/s, bis x ${f2(bu.charge.maxX)}), Wand: ${bu.wall.join(' → ')}, hp ${bu.hits.map((h) => h.hp).join(' → ')}`);
check('Bulle: kündigt an (Hufscharren), rennt auf die Figur zu und trifft', bu.charge.seen.includes('warn') && bu.charge.seen.includes('charge') && bu.charge.hurt && bu.charge.maxSpeed > 6);
check('Bulle bremst an der Kante (bleibt auf dem Plateau)', bu.charge.seen.includes('brake') && bu.charge.maxX < -5.05 && bu.charge.y > 2.9);
check('Bulle prallt gegen die Wand → benommen', bu.wall.includes('charge') && bu.wall[bu.wall.length - 1] === 'bonk');
check('Bulle: 3× draufspringen, jeder Treffer betäubt', bu.hits.map((h) => h.hp).join() === '2,1,0' && bu.hits.every((h) => h.bounced && !h.hurt) && bu.stunTouch0 && bu.hits[2].state === 'defeated' && bu.removed);

// ================================================================ Stampfstein
const ss = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const out = {};
  const s2 = t.ent('stein2');
  t.place([11, 1, -61.4], { settle: 1, yaw: Math.PI / 2 });
  const seen = [];
  for (let i = 0; i < 300; i++) { c.step(1); if (seen[seen.length - 1] !== s2.state) seen.push(s2.state); if (s2.state === 'land') break; }
  out.fall = { seen, y: s2.pos.y, hurt: p.invuln > 0 };
  // Oberseite begehbar, fährt mit der Figur hoch
  t.place([11, 3.05, -63], { settle: 6 });
  out.onTop = { y: p.pos.y, mode: p.mode };
  for (let i = 0; i < 900 && s2.state !== 'wait'; i++) c.step(1);
  c.step(2);
  out.ride = { y: p.pos.y, mode: p.mode, stone: s2.pos.y };
  // Unter dem Stein: Treffer, hinausgeschoben
  const s1 = t.ent('stein1');
  t.place([11, 1, -59], { settle: 1 });
  let hurt = false;
  for (let i = 0; i < 200; i++) { c.step(1); if (p.invuln > 0) hurt = true; if (s1.state === 'land') break; }
  const inside = Math.abs(p.pos.x - 11) < 0.9 + 0.29 && Math.abs(p.pos.z + 59) < 0.9 + 0.29 && p.pos.y < s1.pos.y;
  out.crush = { hurt, inside, state: s1.state };
  // Unbesiegbar: Feuer/Krallen wirkungslos
  s1.onHit('fire', p); s1.onHit('claw', p); s1.onHit('pound', p);
  out.immune = s1.alive;
  return out;
});
console.log(`  Stampfstein: ${ss.fall.seen.join(' → ')} bis y ${f2(ss.fall.y)}; oben y ${f2(ss.onTop.y)} → mitgefahren bis ${f2(ss.ride.y)} (${ss.ride.mode})`);
check('Stampfstein fällt, wenn die Figur darunter ist (Ankündigung: Zittern)', ss.fall.seen.join().includes('shake,fall,land') && Math.abs(ss.fall.y - 1) < 0.01 && !ss.fall.hurt);
check('Stampfstein: Oberseite trägt die Figur (auch beim Hochfahren)', ss.onTop.mode === 'ground' && Math.abs(ss.onTop.y - 3) < 0.05 && ss.ride.mode === 'ground' && Math.abs(ss.ride.y - 6.5) < 0.06);
check('Stampfstein trifft die Figur darunter und schiebt sie hinaus', ss.crush.hurt && !ss.crush.inside);
check('Stampfstein ist nicht zu besiegen (Feuer, Krallen, Stampfen)', ss.immune);

// ================================================================ Krabbel- und Flatterkäfer
const kf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  t.place([0, 1, -79]);
  const k = t.ent('krabbel'), f = t.ent('flatter');
  const segs = [[-16, -74.5, -6, -74.5], [-6, -74.5, -6, -84], [-6, -84, -16, -84], [-16, -84, -16, -74.5]];
  const off = (x, z) => Math.min(...segs.map(([ax, az, bx, bz]) => {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    return Math.hypot(x - ax - dx * u, z - az - dz * u);
  }));
  let maxOff = 0, minY = 99, maxY = -99, fMinY = 99, fMaxY = -99, dist = 0;
  let px = k.pos.x, pz0 = k.pos.z;
  for (let i = 0; i < 360; i++) {
    c.step(1);
    maxOff = Math.max(maxOff, off(k.pos.x, k.pos.z));
    minY = Math.min(minY, k.pos.y); maxY = Math.max(maxY, k.pos.y);
    fMinY = Math.min(fMinY, f.pos.y); fMaxY = Math.max(fMaxY, f.pos.y);
    dist += Math.hypot(k.pos.x - px, k.pos.z - pz0); px = k.pos.x; pz0 = k.pos.z;
  }
  const out = { maxOff, minY, maxY, fMinY, fMaxY, speed: dist / 3, n: t.count('krabbelkaefer'), nf: t.count('flatterkaefer') };
  // Reihe: Abstand der beiden ersten Käfer entlang der Bahn ≈ spacing
  const k1 = L.named.get('krabbel_1');
  const len = k.mover.length;
  out.gap = (((k.mover.s - k1.mover.s) % len) + len) % len;
  out.side = t.side(k1);
  out.stomp = { ...t.stomp(k), state: k.state };
  const s = t.stomp(f, { h: 0.8 });
  for (let i = 0; i < 240 && !f.removed; i++) c.step(1);
  out.fly = { ...s, removed: f.removed };
  return out;
});
console.log(`  Käfer: ${kf.n} Krabbel (Abstand ${f2(kf.gap)} m, ${f2(kf.speed)} m/s, max ${f2(kf.maxOff)} m neben der Bahn), ${kf.nf} Flatter in y ${f2(kf.fMinY)} … ${f2(kf.fMaxY)}`);
check('Krabbelkäfer folgen der Bahn am Boden, in Reihe', kf.n === 4 && kf.maxOff < 0.05 && Math.abs(kf.minY - 1) < 0.01 && Math.abs(kf.maxY - 1) < 0.01 && kf.speed > 2 && kf.gap > 1.3 && kf.gap < 1.7);
check('Flatterkäfer fliegen auf ihrer Bahn in der Luft', kf.nf === 3 && kf.fMinY > 3.2 && kf.fMaxY < 3.6);
check('Krabbelkäfer: seitlich = Treffer, draufspringen besiegt', kf.side.hurt && kf.stomp.bounced && !kf.stomp.hurt && kf.stomp.state === 'squashed');
check('Flatterkäfer: draufspringen → fällt herunter', kf.fly.bounced && !kf.fly.hurt && kf.fly.removed);

// ================================================================ Brummer
const br = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const b = t.ent('brummer_kreis');
  const out = {};
  // fliegt im Kreis
  const c0 = { x: 8.5, z: -77 };
  let rMin = 99, rMax = 0;
  t.place([0, 1, -60]);
  for (let i = 0; i < 240; i++) { c.step(1); const r = Math.hypot(b.pos.x - c0.x, b.pos.z - c0.z); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); }
  out.circle = { rMin, rMax, y: b.pos.y };
  // Angriff
  b.cool = 0;
  t.place([b.pos.x, 1, b.pos.z], { settle: 1 });
  const seen = [];
  let warnT = 0;
  for (let i = 0; i < 400; i++) { c.step(1); if (seen[seen.length - 1] !== b.state) seen.push(b.state); if (b.state === 'warn') warnT += 1 / 120; if (p.invuln > 0) break; }
  out.attack = { seen, hurt: p.invuln > 0, warnT };
  const b2 = t.ent('brummer_bahn');
  const s = t.stomp(b2, { h: 0.8 });
  for (let i = 0; i < 240 && !b2.removed; i++) c.step(1);
  out.stomp = { ...s, removed: b2.removed };
  return out;
});
console.log(`  Brummer: Kreis r ${f2(br.circle.rMin)} … ${f2(br.circle.rMax)}, Angriff ${br.attack.seen.join(' → ')} (Ankündigung ${f2(br.attack.warnT)} s)`);
check('Brummer kreist auf seiner Bahn', br.circle.rMin > 1.8 && br.circle.rMax < 2.2 && br.circle.y > 3);
check('Brummer: Ankündigung (warn), dann Sturzflug auf die Figur', br.attack.seen.includes('warn') && br.attack.seen.includes('dive') && br.attack.warnT > 0.6 && br.attack.hurt);
check('Brummer: draufspringen besiegt (fällt herunter)', br.stomp.bounced && !br.stomp.hurt && br.stomp.removed);

// ================================================================ Zauberkröte
const zk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const z = t.ent('zauber');
  t.place([-11, 1, -95], { settle: 1 });
  const seen = [];
  let ball = false, spots = new Set();
  for (let i = 0; i < 1200; i++) {
    c.step(1);
    if (seen[seen.length - 1] !== z.state) { seen.push(z.state); if (z.state === 'appear') spots.add(`${z.pos.x},${z.pos.z}`); }
    if (t.count('zauberkugel')) ball = true;
    if (p.invuln > 0) break;
  }
  const out = { seen, ball, hurt: p.invuln > 0 };
  // Unsichtbar unverwundbar
  for (const e of L.entities) if (e.kind === 'zauberkugel') e.kill();
  z.hide(8);
  c.step(1);
  z.onHit('fire', p);
  out.hiddenImmune = !z.defeated && z.touch === false;
  // zweiter Auftritt an anderem Punkt, dann draufspringen
  z.wait = 0;
  t.place([-11, 1, -95], { settle: 1 });
  for (let i = 0; i < 600 && z.state !== 'cast'; i++) { c.step(1); if (z.state === 'appear') spots.add(`${z.pos.x},${z.pos.z}`); }
  for (const e of L.entities) if (e.kind === 'zauberkugel') e.kill();
  out.spots = spots.size;
  out.stomp = { ...t.stomp(z, { h: 0.8 }), defeated: z.defeated };
  return out;
});
console.log(`  Zauberkröte: ${zk.seen.join(' → ')}, Kugel=${zk.ball}, Treffer=${zk.hurt}, Auftrittspunkte ${zk.spots}`);
check('Zauberkröte erscheint, zaubert eine Kugel, die die Figur trifft', zk.seen.includes('appear') && zk.seen.includes('cast') && zk.ball && zk.hurt);
check('Zauberkröte: unsichtbar unverwundbar', zk.hiddenImmune);
check('Zauberkröte: erscheint an wechselnden Punkten, sichtbar besiegbar', zk.spots >= 2 && zk.stomp.bounced && zk.stomp.defeated);

// ================================================================ Wühler
const wu = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const out = {};
  const w = t.ent('wuehler_w');
  t.place([11, 1, -88.9]);
  let xMin = 99, xMax = -99, seen = new Set();
  for (let i = 0; i < 720; i++) { c.step(1); seen.add(w.state); if (w.state === 'hide') { xMin = Math.min(xMin, w.pos.x); xMax = Math.max(xMax, w.pos.x); } }
  out.water = { xMin, xMax, seen: [...seen], y: w.pos.y };
  const e = t.ent('wuehler_e');
  e.setState('hide');
  t.place([e.pos.x + 0.5, 1, e.pos.z], { settle: 6 });
  out.hiddenSafe = p.invuln === 0 && e.touch === false;
  for (let i = 0; i < 600 && e.state !== 'up'; i++) c.step(1);
  out.upTouch = e.touch && e.up;
  out.stomp = { ...t.stomp(e, { h: 0.8 }), defeated: e.defeated };
  return out;
});
console.log(`  Wühler: Wasser x ${f2(wu.water.xMin)} … ${f2(wu.water.xMax)} (${wu.water.seen.join('/')}), Erde abgetaucht harmlos=${wu.hiddenSafe}`);
check('Wühler wandert abgetaucht auf seiner Bahn und taucht im Takt auf', wu.water.xMax - wu.water.xMin > 3 && ['hide', 'pop', 'up', 'sink'].every((s) => wu.water.seen.includes(s)) && Math.abs(wu.water.y - 1.9) < 0.01);
check('Wühler: abgetaucht harmlos, aufgetaucht besiegbar', wu.hiddenSafe && wu.upTouch && wu.stomp.bounced && wu.stomp.defeated);

// ================================================================ Kickbombe
const kb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // Berührung zündet und kickt; Aufprall an der Wand → Explosion
  const b2 = t.ent('bombe2');
  b2.pos.set(-12, 1, -110.5); b2.setState('walk'); b2.dir = { x: 1, z: 0 };
  t.place([-12.75, 1, -110.5], { settle: 1, yaw: 0 });
  for (let i = 0; i < 20 && b2.state !== 'kicked'; i++) { c.setInput({ x: 0.5 }); c.step(1); }
  c.setInput({});
  out.kick = { state: b2.state, lit: b2.lit, hurt: p.invuln > 0 };
  for (let i = 0; i < 200 && !b2.exploded; i++) c.step(1);
  out.kick.exploded = b2.exploded;
  out.kick.x = b2.pos.x;
  // In die Steinwand kicken → Blöcke zerstört
  const wallN = () => t.count('steinblock', (e) => Math.abs(e.pos.z + 114) < 0.6 && e.pos.x < -8);
  const s0 = wallN();
  const b1 = t.ent('bombe1');
  b1.path = null; b1.pos.set(-11, 1, -111.2); b1.setState('walk'); b1.lit = false; b1.dir = { x: 0, z: 1 }; b1.speed = 0;
  t.place([-11, 1, -110.4], { settle: 1, yaw: Math.PI / 2 });
  for (let i = 0; i < 20 && b1.state !== 'kicked'; i++) { c.setInput({ y: 0.5 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 200 && !b1.exploded; i++) c.step(1);
  c.step(2);
  out.wall = { before: s0, after: wallN(), exploded: b1.exploded };
  // Explosion: Figur getroffen, Gegner besiegt, Kettenreaktion
  t.place([0, 1, -20]);
  const pz = L.spawn('pilzling', { pos: [-1.6, 1, -20], wake: 1e9, speed: 0 });
  const chain = L.spawn('kickbombe', { pos: [2.6, 1, -20], speed: 0 });
  const bomb = L.spawn('kickbombe', { pos: [1.0, 1, -20], lit: true, fuse: 0.1, speed: 0 });
  c.step(16);
  out.boom = { exploded: bomb.exploded, hurt: p.invuln > 0 || !p.big, pilz: pz.defeated };
  c.step(30);
  out.boom.chain = chain.exploded;
  // Feuerball zündet eine Kickbombe
  t.place([0, 1, -21], { yaw: Math.PI / 2, power: 'funken' });
  const fb = L.spawn('kickbombe', { pos: [0, 1, -24], speed: 0 });
  c.step(2);
  t.action();
  for (let i = 0; i < 60 && !fb.lit; i++) c.step(1);
  out.fireLit = fb.lit;
  fb.kill();
  // Vom Gegner geworfen (owner wird nicht getroffen), zurückgekickt → onBombHit
  t.place([0, 1, -30], { yaw: Math.PI / 2 });
  const tgt = L.spawn('pilzling', { pos: [0, 1, -36], wake: 1e9, speed: 0 });
  let hitBy = null;
  tgt.onBombHit = (b) => { hitBy = b; };
  const thrown = L.spawn('kickbombe', { pos: [0, 1.2, -35.4], vel: [0, 5, 3.4], owner: tgt });
  for (let i = 0; i < 120 && thrown.state === 'air'; i++) c.step(1);
  out.thrown = { lit: thrown.lit, state: thrown.state, z: thrown.pos.z, early: hitBy !== null };
  // auf die Bombe zulaufen → zurückgekickt
  for (let i = 0; i < 200 && thrown.state !== 'kicked'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 120 && !thrown.exploded; i++) c.step(1);
  out.back = { hit: hitBy === thrown, exploded: thrown.exploded, fuseLeft: thrown.fuse };
  tgt.kill();
  return out;
});
console.log(`  Kickbombe: Kick ${kb.kick.state}/lit=${kb.kick.lit} → Explosion an der Wand bei x ${f2(kb.kick.x)}; Steinwand ${kb.wall.before} → ${kb.wall.after} Blöcke; Rückkick trifft=${kb.back.hit}`);
check('Kickbombe: Berührung zündet und kickt (rollt), Aufprall an der Wand → Explosion', kb.kick.state === 'kicked' && kb.kick.lit && !kb.kick.hurt && kb.kick.exploded && kb.kick.x > -5.5);
check('Kickbombe zerstört die Steinwand (graue Blöcke)', kb.wall.exploded && kb.wall.before === 15 && kb.wall.after <= 3);
check('Explosion verletzt die Figur, besiegt Gegner, zündet andere Bomben', kb.boom.exploded && kb.boom.hurt && kb.boom.pilz && kb.boom.chain);
check('Feuerball zündet eine Kickbombe', kb.fireLit);
check('Geworfene Bombe landet brennend (trifft den Werfer nicht); zurückgekickt → onBombHit', kb.thrown.lit && !kb.thrown.early && kb.back.hit && kb.back.exploded);

// ================================================================ Power-ups aus ?-Blöcken
const pu = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const fromBlock = (x, o = {}) => {
    t.place([x, 1, -3], { yaw: Math.PI / 2, big: o.big });
    c.setInput({ jump: true }); c.step(12); c.setInput({}); c.step(80);
    const up = L.entities.find((e) => e.kind === 'powerup' && !e.removed && Math.abs(e.pos.x - x) < 3 && e.pos.z > -7);
    if (!up) return null;
    const name = up.power;
    const lives0 = L.runtime.lives;
    t.place([up.pos.x, up.pos.y + 0.05, up.pos.z], { settle: 3, big: o.big });
    return { name, power: p.power, big: p.big, life: L.runtime.lives - lives0, collected: up.removed };
  };
  out.beere = fromBlock(-7.5, { big: false });
  out.krallen = fromBlock(-5.5);
  out.funken = fromBlock(-3.5);
  out.riese = fromBlock(3.5);
  p.setPower('none');
  out.stern = fromBlock(5.5);
  p.setPower('none');
  c.step(2);
  out.oneup = fromBlock(7.5);
  return out;
});
console.log(`  ?-Blöcke: ${Object.entries(pu).map(([k, v]) => `${k}→${v?.name}/${v?.power}`).join(', ')}`);
check('Wachstumsbeere: klein → groß', pu.beere?.name === 'wachstumsbeere' && pu.beere.big && pu.beere.collected);
check('?-Blöcke geben Krallen-Anzug, Funkenblüte, Riesentrank, Funkelstern', pu.krallen?.power === 'krallen' && pu.funken?.power === 'funken' && pu.riese?.power === 'riese' && pu.stern?.power === 'stern');
check('1-Up: Leben +1', pu.oneup?.name === 'oneup' && pu.oneup.life === 1);

// ================================================================ Krallen-Anzug: Tatzenhieb, Sturzflug
const ka = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const bricks = () => t.count('brick', (e) => Math.abs(e.pos.x + 12) < 0.1);
  const b0 = bricks();
  t.place([-12, 1, 2.6], { yaw: Math.PI / 2, power: 'krallen' });
  t.action();
  out.clawState = p.clawTime > 0;
  c.rig.update(0.016, 0);
  out.avatarState = c.rig.proxy.course.state;
  c.step(30);
  out.bricks = [b0, bricks()];
  // Tatzenhieb besiegt Gegner
  t.place([0, 1, -50], { yaw: Math.PI / 2, power: 'krallen' });
  const e = L.spawn('pilzling', { pos: [0, 1, -51.3], wake: 1e9, speed: 0 });
  c.step(1);
  t.action();
  c.step(5);
  out.clawKill = e.defeated && e.state === 'flipped' && !(p.invuln > 0);
  // Sturzflug besiegt Gegner
  t.place([0, 1, -40], { yaw: Math.PI / 2, power: 'krallen' });
  const d = L.spawn('pilzling', { pos: [0, 1, -45], wake: 1e9, speed: 0 });
  c.setInput({ y: 1, jump: true }); c.step(25);
  c.setInput({ y: 1, crouch: true }); c.step(1);
  out.diveState = p.state;
  c.setInput({ y: 1 });
  for (let i = 0; i < 120 && !d.defeated; i++) c.step(1);
  c.setInput({});
  out.diveKill = d.defeated && !(p.invuln > 0);
  return out;
});
console.log(`  Krallen: Ziegel ${ka.bricks.join(' → ')}, Avatar-Zustand ${ka.avatarState}, Sturzflug ${ka.diveState}`);
check('Tatzenhieb (Aktion) zerbricht Ziegel, Avatar-Zustand claw', ka.clawState && ka.bricks[1] < ka.bricks[0] && ka.avatarState === 'claw');
check('Tatzenhieb besiegt Gegner', ka.clawKill);
check('Krallen-Sturzflug schräg nach unten besiegt Gegner', ka.diveState === 'dive' && ka.diveKill);

// ================================================================ Funkenblüte
const fu = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  t.place([0, 1, -46], { yaw: Math.PI / 2, power: 'funken' });
  const n = () => t.count('fireball');
  const counts = [];
  for (let k = 0; k < 3; k++) { t.action(); counts.push(n()); c.step(24); }
  out.counts = counts;
  // Hüpfen über den Boden
  for (const e of L.entities) if (e.kind === 'fireball') e.kill();
  c.step(1);
  t.action();
  const ball = L.entities.find((e) => e.kind === 'fireball' && !e.removed);
  const ys = [];
  let life = 0;
  for (let i = 0; i < 260 && ball && !ball.removed; i++) { c.step(1); ys.push(ball.pos.y); life = (i + 1) / 120; }
  let bounces = 0;
  for (let i = 1; i < ys.length - 1; i++) if (ys[i] < ys[i - 1] && ys[i] <= ys[i + 1] && ys[i] < 1.05) bounces++;
  out.ball = { bounces, maxY: Math.max(...ys) - 1, life, gone: !ball || ball.removed };
  // besiegt Gegner
  t.place([0, 1, -46], { yaw: Math.PI / 2, power: 'funken' });
  const e = L.spawn('pilzling', { pos: [0, 1, -50], wake: 1e9, speed: 0 });
  c.step(1);
  t.action();
  for (let i = 0; i < 80 && !e.defeated; i++) c.step(1);
  out.kill = e.defeated;
  c.rig.update(0.016, 0);
  return out;
});
console.log(`  Funkenblüte: gleichzeitig ${fu.counts.join('/')}, Feuerball ${fu.ball.bounces} Hüpfer (bis ${f2(fu.ball.maxY)} m), weg nach ${f2(fu.ball.life)} s`);
check('Funkenblüte: höchstens 2 Feuerbälle gleichzeitig', fu.counts.join() === '1,2,2');
check('Feuerball hüpft über den Boden und verschwindet nach ≈ 1,5 s', fu.ball.bounces >= 2 && fu.ball.maxY < 1 && fu.ball.life > 1.3 && fu.ball.life < 1.6 && fu.ball.gone);
check('Feuerball besiegt Gegner', fu.kill);

// ================================================================ Riesentrank
const ri = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const stones = () => t.count('steinblock', (e) => e.pos.x > 10 && e.pos.z > 0);
  t.place([12, 1, 4.4], { yaw: Math.PI / 2 });
  const s0 = stones();
  p.setPower('riese');
  out.gain = { power: p.power, time: p.powerTime, scale: p.powerDef.scale, inv: p.invulnerable };
  c.setInput({ y: 0.6 }); c.step(70); c.setInput({});
  out.stones = [s0, stones()];
  const e = L.spawn('pilzling', { pos: [12, 1, p.pos.z - 2.5], wake: 1e9, speed: 0 });
  c.setInput({ y: 0.6 }); c.step(60); c.setInput({});
  out.enemy = { defeated: e.defeated, hurt: !p.big };
  return out;
});
const ri2 = await sc(() => {
  const c = window.__course, p = c.player, rig = c.view.rig;
  // Kamera wird je Bild nachgeführt – hier 1,5 s Bilder (0,05 s) direkt rechnen
  const d0 = rig.distNow;
  for (let i = 0; i < 30; i++) rig.update(0.05, p, c.world);
  const out = { zoom: rig.powerZoom, dist: [d0, rig.distNow] };
  let i = 0;
  while (p.power === 'riese' && i++ < 1400) c.step(1);
  out.end = { power: p.power, big: p.big, t: i / 120, invuln: p.invuln };
  return out;
});
const zoomBack = await sc(() => {
  const c = window.__course, rig = c.view.rig;
  for (let i = 0; i < 40; i++) rig.update(0.05, c.player, c.world);
  return rig.powerZoom;
});
console.log(`  Riesentrank: Steinblöcke ${ri.stones.join(' → ')}, Kamera-Zoom ×${f2(ri2.zoom)} → ×${f2(zoomBack)}, Ende nach weiteren ${f2(ri2.end.t)} s → ${ri2.end.power}`);
check('Riesentrank: ×2,4, unverwundbar, 10 s', ri.gain.power === 'riese' && ri.gain.scale === 2.4 && ri.gain.inv && Math.abs(ri.gain.time - 10) < 0.01);
check('Riesentrank zertrümmert graue Steinblöcke', ri.stones[0] === 6 && ri.stones[1] === 0);
check('Riesentrank besiegt Gegner bei Berührung', ri.enemy.defeated && !ri.enemy.hurt);
check(`Riesentrank: Kamera zoomt heraus (Abstand ${f2(ri2.dist[0])} → ${f2(ri2.dist[1])} m) und wieder zurück`, ri2.zoom > 1.3 && ri2.dist[1] > ri2.dist[0] * 1.25 && zoomBack < 1.05);
check('Riesentrank endet nach 10 s (Rückverwandlung, kurz unverwundbar)', ri2.end.power === 'none' && ri2.end.big && ri2.end.t > 7 && ri2.end.t < 9.5 && ri2.end.invuln > 0);

// ================================================================ Funkelstern
const sn = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  t.place([0, 1, -14], { yaw: Math.PI / 2 });
  p.setPower('stern');
  out.gain = { power: p.power, music: L.musicNow, speed: p.speedMult, time: p.powerTime };
  const e = L.spawn('pilzling', { pos: [0, 1, -16], wake: 1e9, speed: 0 });
  c.setInput({ y: 1, run: true }); c.step(150); c.setInput({ y: 1, run: true });
  out.run = Math.hypot(p.vel.x, p.vel.z);
  c.setInput({});
  out.enemy = { defeated: e.defeated, hurt: !p.big || p.invuln > 0 };
  let i = 0;
  while (p.power === 'stern' && i++ < 1400) c.step(1);
  c.step(2);
  out.end = { power: p.power, music: L.musicNow, speed: p.speedMult, t: i / 120 };
  // Treffer nach dem Stern wieder normal
  return out;
});
console.log(`  Funkelstern: Musik ${sn.gain.music} → ${sn.end.music}, Rennen ${f2(sn.run)} m/s, Ende nach weiteren ${f2(sn.end.t)} s`);
check('Funkelstern: 10 s unverwundbar, Musik course_star', sn.gain.power === 'stern' && sn.gain.music === 'course_star' && Math.abs(sn.gain.time - 10) < 0.01);
check('Funkelstern: Berührung besiegt Gegner, schnelleres Laufen', sn.enemy.defeated && !sn.enemy.hurt && sn.run > 11.5);
check('Funkelstern endet: Tempo und Levelmusik zurück', sn.end.power === 'none' && sn.end.music === 'course_grass' && sn.end.speed === 1);

check('Keine Konsolenfehler (Logik)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

// ================================================================ Screenshots (frisches Level)
await load();
/**
 * Aufbau, Figur-Darstellung (HeroRig: Größe, Pose) und Kamera nachführen, auf zwei neue Bilder warten (Headless
 * zeichnet < 1 Bild/s), Screenshot. Die Figur ist dabei unverwundbar ohne Blinken (hurt abgeschaltet).
 */
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
  await page.screenshot({ path: `${OUT}ce_${name}.png` });
};
await SHOT('park', () => { window.__t.place([0, 1, 3], { yaw: Math.PI / 2 }); window.__course.step(60); });
await SHOT('pilzlinge', () => {
  const c = window.__course, t = window.__t, ch = t.ent('pz_chase');
  ch.pos.set(-8, 1, -19.5); ch.setState('walk');
  t.place([-11.5, 1, -17], { settle: 1, yaw: 0 });
  for (let i = 0; i < 120 && ch.state !== 'alert'; i++) c.step(1);
  c.step(20);
});
await SHOT('krallen', () => {
  const c = window.__course, t = window.__t, k = t.ent('kp1');
  t.place([12.5, 1, -13.5], { settle: 1, yaw: Math.PI });
  k.pos.set(8, 1, -15); k.setState('walk'); k.cool = 0;
  for (let i = 0; i < 300 && k.state !== 'leap'; i++) c.step(1);
  c.step(14);
});
await SHOT('turm', () => { const c = window.__course, t = window.__t; t.place([-6.5, 1, -27], { settle: 60, yaw: Math.PI }); });
await SHOT('panzerbahn', () => {
  const c = window.__course, t = window.__t, bs = t.ent('panzer');
  bs.pos.set(-6.5, 1, -47); bs.setState('idle');
  t.place([-5.75, 1, -46.3], { settle: 1, yaw: Math.PI });
  for (let i = 0; i < 20 && bs.state !== 'slide'; i++) { c.setInput({ x: -0.5, y: 0.4 }); c.step(1); }
  c.setInput({});
  c.step(40);
});
await SHOT('schnappblumen', () => {
  const c = window.__course, t = window.__t, f = t.ent('blume_topf');
  t.place([8.2, 1, -41.6], { settle: 1, yaw: Math.PI });
  for (let i = 0; i < 300 && !(f.state === 'snap' && f.progress > 0.42); i++) c.step(1);
});
await SHOT('bulle', () => {
  const c = window.__course, t = window.__t, b = t.ent('bulle');
  b.pos.set(-12, 3, -63); b.setState('idle'); b.cool = 0;
  t.place([-6.4, 3, -61.5], { settle: 1, yaw: Math.PI });
  for (let i = 0; i < 300 && b.state !== 'charge'; i++) c.step(1);
  c.step(22);
});
await SHOT('stampfstein', () => {
  // erster Stein der Reihe (z −59): nichts zwischen Kamera und Figur
  const c = window.__course, t = window.__t, s = t.ent('stein1');
  t.place([11.5, 1, -57.4], { settle: 1, yaw: Math.PI / 2 });
  for (let i = 0; i < 300 && s.state !== 'land'; i++) c.step(1);
  c.step(4);
});
await SHOT('kaefer', () => { window.__t.place([-6, 1, -76], { settle: 90, yaw: Math.PI }); });
await SHOT('brummer', () => {
  const c = window.__course, t = window.__t, b = t.ent('brummer_kreis');
  t.place([10.5, 1, -75], { settle: 1 });
  b.cool = 0;
  for (let i = 0; i < 400 && b.state !== 'dive'; i++) c.step(1);
  c.step(10);
});
await SHOT('zauber', () => {
  const c = window.__course, t = window.__t, z = t.ent('zauber');
  t.place([-11, 1, -94], { settle: 1 });
  z.hide(0.2); z.spot = 1;   // nächster Auftritt hinten rechts (im Bild)
  for (let i = 0; i < 900 && !(z.state === 'cast' && z.cast); i++) c.step(1);
  c.step(40);
});
await SHOT('wuehler', () => {
  const c = window.__course, t = window.__t, w = t.ent('wuehler_w');
  t.place([11, 1, -88.6], { settle: 1 });
  for (let i = 0; i < 600 && w.state !== 'up'; i++) c.step(1);
  c.step(10);
});
await SHOT('kickbombe', () => {
  const c = window.__course, t = window.__t, b = t.ent('bombe1');
  b.path = null; b.pos.set(-11, 1, -110.6); b.setState('walk'); b.speed = 0;
  t.place([-11, 1, -109.6], { settle: 1, yaw: Math.PI / 2 });
  for (let i = 0; i < 20 && b.state !== 'kicked'; i++) { c.setInput({ y: 0.5 }); c.step(1); }
  c.setInput({ y: -1 });
  for (let i = 0; i < 200 && !b.exploded; i++) c.step(1);
  c.setInput({});
  c.step(3);
}, 1);
await SHOT('riesenblume', () => {
  const c = window.__course, t = window.__t, g = t.ent('riesenblume');
  t.place([12.5, 1, -106.4], { settle: 1, yaw: Math.PI / 2 });
  for (let i = 0; i < 300 && !(g.state === 'snap' && g.progress > 0.45); i++) c.step(1);
});
await SHOT('riese', () => {
  const c = window.__course, t = window.__t, p = c.player;
  t.place([12, 1, 5.6], { yaw: Math.PI / 2 });
  p.setPower('riese');
  c.setInput({ y: 0.6 }); c.step(110); c.setInput({});
  for (let i = 0; i < 40; i++) c.view.rig.update(0.05, p, c.world);
});
await SHOT('stern', () => {
  const c = window.__course, t = window.__t, p = c.player;
  t.place([-9, 1, -6], { yaw: Math.PI / 2 });
  p.setPower('none');
  p.setPower('stern');
  c.setInput({ y: 0.7, x: -0.3, run: true }); c.step(70); c.setInput({});
});
await SHOT('feuer', () => {
  const c = window.__course, t = window.__t;
  t.place([2.5, 1, -40], { yaw: Math.PI, power: 'funken' });
  t.action(); c.step(20); t.action(); c.step(8);
});
await SHOT('tragen', () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.place([2, 1, -6.9], { yaw: Math.PI / 2 });
  L.spawn('panzer', { pos: [2, 1, -8] });
  c.step(2);
  t.action();
  c.setInput({ x: 0.6, y: -0.3 }); c.step(20); c.setInput({});
});
check('Keine Konsolenfehler (Screenshots)', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
