// Kurs-Modus: Welt-5-Gegner in der Gegnerwerkstatt Lila Strand (0-18) und der Kippquader-König im Tempel (0-19)
// deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Sandtaucher (verborgen harmlos, folgt,
// späht, springt im Bogen, Stampfen im Sprung besiegt, seitlich verletzt, Wasser folgt dem Spiegel), Zündkopf (zündet bei
// Nähe/Stampfen, explodiert nach 3 s, Explosion verletzt/besiegt/zerstört lila Ziegel, tragen und werfen, Aufprall
// explodiert, Nachschub-Spender, Stern entschärft), lila Ziegel (nur Explosion/Tatzenhieb/POW), Feuerring (Puls wächst,
// drüberspringen, Rad mit Lücke, blink), Hackbeil-Pilz (Vorwarnung, Hieb, Schneide verletzt, steckt fest → von oben
// besiegbar, von vorn Treffer), Funkenling (Blockrand, Wand, wuseln; nur Power-ups), Glutball (Takt, Farbe der Lava),
// Suchkopf-Welle (Alarm des Suchscheinwerfers → Kanonen feuern, Abklingzeit), vorhandene Welt-5-Gegner; Kippquader-König
// (Auftritt, Gehen, rote Landefläche, Kippen trifft, liegend begehbar, nur das Rückenfeld trifft – 3 Treffer, vorn/seitlich
// und daneben zählt nicht, Ecken brechen, Schockwelle, Begleit-Kippquader, Sieg → Stern + Warp → Ziel, Tod setzt zurück).
// Simulation nur über window.__course.step(n) und setInput; Bilder tests/out/w5e_*.png.
// Aufruf: PORT_BASE=3800 node tests/course_w5_enemies.mjs   (Port 4400; vorher npm run build)
//   W5E_PART=1 (Sandtaucher, Zündkopf, lila Ziegel) | 2 (Feuerring, Hackbeil-Pilz, Funkenling, Glutball, Suchkopf-Welle,
//   Vorhandene) | 3 (Kippquader-König) | 4 (Bilder) – ohne: alle Teile nacheinander.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4400;
const PART = process.env.W5E_PART ?? 'all';
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
      /** Von oben auf e fallen (x/z folgen e bzw. der Körpermitte), bis Abprall oder Landung. */
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
      /** Figur an e stellen (Hüllen berühren sich, von +x) und n Schritte halten; Treffer? */
      touch(e, n = 20, sx = 1) {
        const p = P();
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
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      ents: (kind) => L.entities.filter((e) => e.kind === kind && !e.removed),
      dist: (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z),
      safe(on = true) { const p = P(); if (on) p.hurt = () => false; else delete p.hurt; },
      face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
      action(o = {}) { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); },
      /** Figur festhalten (pos) für n Schritte. */
      hold(pos, n, safe = true) { const p = P(); if (safe) p.hurt = () => false; for (let i = 0; i < n; i++) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); c.step(1); } if (safe) delete p.hurt; },
      moveTo(pos, n = 20) { const p = P(); p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); p.mode = 'air'; c.setInput({}); c.step(n); },
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
await load('0-18');
console.log('Gegnerwerkstatt Lila Strand 0-18');
{
  const st0 = await sc(() => {
    const c = window.__course;
    const kinds = {};
    for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    return { kinds, n: c.level.entities.length };
  });
  console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
  const NEED = ['sandtaucher', 'zuendkopf', 'zuendkopf_quelle', 'lila_ziegelwand', 'lila_ziegel', 'feuerring', 'hackbeil_pilz', 'funkenling', 'glutball', 'suchkopf_welle', 'kanone_turm'];
  check(`Alle Welt-5-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
  const OLD = ['panzerkroete', 'pilzling', 'rammbock_bulle', 'ameisensoldat', 'feuer_werfer', 'pilzlingsturm', 'kreisgeist', 'muenzmarder', 'spuk', 'krabbelkaefer'];
  check(`Vorhandene Welt-5-Gegner bereit (${OLD.filter((k) => !st0.kinds[k]).join(', ') || 'alle'})`, OLD.every((k) => st0.kinds[k] > 0));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
  const smoke = await sc(() => { const c = window.__course; for (let i = 0; i < 600; i++) c.step(1); return c.level.entities.length; });
  check(`10 s Simulation ohne Fehler (${smoke} Entitäten)`, errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 1: Sandtaucher, Zündkopf, lila Ziegel
// =====================================================================================================================
if (want(1)) {
await load('0-18');
console.log('Teil 1: Sandtaucher, Zündkopf, lila Ziegel');
const sd = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('st_sand');
  // verborgen: schwimmt Kreise, harmlos, unangreifbar
  t.place([0, 1, t.Z(1, 7)], { settle: 1 });
  const x0 = f.pos.x, z0 = f.pos.z;
  let maxBody = -9, touchHidden = false;
  for (let i = 0; i < 240; i++) { c.step(1); maxBody = Math.max(maxBody, f.bodyY); if (f.touch) touchHidden = true; }
  f.onHit('fire', p); f.onHit('claw', p);
  out.hidden = { moved: +Math.hypot(f.pos.x - x0, f.pos.z - z0).toFixed(2), maxBody: +maxBody.toFixed(2), touch: touchHidden, state: f.state, defeated: f.defeated };
  // folgen → spähen → Sprung im Bogen durch die Stelle der Figur
  const fig = [-6, 1, t.Z(1, 3)];
  const d0 = Math.hypot(f.pos.x - fig[0], f.pos.z - fig[2]);
  const seq = [];
  let dMin = 99, peak = -9, jumpFrom = null, jumpTo = null;
  p.hurt = () => false;
  for (let i = 0; i < 1200; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (seq[seq.length - 1] !== f.state) seq.push(f.state);
    if (f.state === 'swim') dMin = Math.min(dMin, Math.hypot(f.pos.x - fig[0], f.pos.z - fig[2]));
    if (f.state === 'jump') { peak = Math.max(peak, f.bodyY); if (!jumpFrom) jumpFrom = { x: f.from.x, z: f.from.z }; jumpTo = { x: f.to.x, z: f.to.z }; }
    if (seq.includes('dive')) break;
  }
  delete p.hurt;
  out.jump = { d0: +d0.toFixed(2), dMin: +dMin.toFixed(2), seq: seq.join('>'), peak: +peak.toFixed(2), jumps: f.jumps, from: jumpFrom, to: jumpTo };
  // hinter der Figur gelandet? (Figur liegt zwischen Absprung und Landung)
  if (jumpFrom && jumpTo) {
    const ax = jumpTo.x - jumpFrom.x, az = jumpTo.z - jumpFrom.z, L2 = ax * ax + az * az;
    const k = ((fig[0] - jumpFrom.x) * ax + (fig[2] - jumpFrom.z) * az) / L2;
    out.jump.k = +k.toFixed(2);
  }
  // seitliche Berührung im Sprung verletzt
  let hurtSide = false;
  for (let i = 0; i < 1600 && f.state !== 'jump'; i++) { p.hurt = () => false; p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); delete p.hurt; }
  c.step(50);
  if (f.state === 'jump') {
    t.place([f.pos.x + 2, 1, f.pos.z], { settle: 0 });
    hurtSide = t.touch(f, 4);
  }
  out.side = { hurt: hurtSide, defeated: f.defeated };
  // Stampfen in der Sprungphase besiegt
  t.place([-6, 1, t.Z(1, 3)], { settle: 20 });
  p.hurt = () => false;
  for (let i = 0; i < 1800 && !(f.state === 'jump' && f.stateT > 0.18); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  const st = f.state === 'jump' ? t.stomp(f, { h: 0.6 }) : { bounced: false };
  for (let i = 0; i < 20; i++) c.step(1);
  out.stomp = { ...st, defeated: f.defeated, state: f.state };
  c.step(160);
  out.gone = f.removed;
  // Wasser: Oberfläche = Wasserspiegel, springt zur Figur auf dem Steg
  const w = t.ent('st_wasser');
  const m = L.data.marks.pool;
  t.place([m[0], m[1] + 0.4, m[2]], { settle: 10 });
  let wj = 0, wPeak = -9;
  p.hurt = () => false;
  for (let i = 0; i < 1800 && wj < 1; i++) { c.step(1); if (w.state === 'jump') { wPeak = Math.max(wPeak, w.bodyY); } if (w.state === 'dive') wj++; }
  delete p.hurt;
  out.water = { surf: +w.surf.toFixed(2), ground: w.groundKind, jumps: w.jumps, peak: +wPeak.toFixed(2), poolTop: m[1] };
  return out;
});
console.log(`  Sandtaucher: ${JSON.stringify(sd)}`);
check(`Sandtaucher verborgen: schwimmt (${sd.hidden.moved} m), nur die Flosse (Körper ≤ ${sd.hidden.maxBody}), harmlos und unangreifbar`, sd.hidden.moved > 1 && sd.hidden.maxBody < -0.3 && !sd.hidden.touch && !sd.hidden.defeated);
check(`Sandtaucher folgt verborgen (${sd.jump.d0} → ${sd.jump.dMin} m), späht (peek) und springt im Bogen (Gipfel ${sd.jump.peak} m)`, sd.jump.dMin < sd.jump.d0 - 1 && /swim>peek>jump>dive/.test(sd.jump.seq) && sd.jump.peak > 1.2);
check(`Sandtaucher springt durch die Stelle der Figur und landet dahinter (Anteil ${sd.jump.k})`, sd.jump.k > 0.4 && sd.jump.k < 0.95);
check('Sandtaucher: seitliche Berührung im Sprung verletzt', sd.side.hurt && !sd.side.defeated);
check('Sandtaucher: Draufspringen in der Sprungphase besiegt ihn (platt, Abprall), dann verschwindet er', sd.stomp.bounced && !sd.stomp.hurt && sd.stomp.defeated && sd.stomp.state === 'squashed' && sd.gone);
check(`Sandtaucher im Wasser: Oberfläche = Wasserspiegel (${sd.water.surf}), springt zur Figur auf dem Steg`, sd.water.ground === 'wasser' && Math.abs(sd.water.surf - sd.water.poolTop) < 0.05 && sd.water.jumps >= 1 && sd.water.peak > 1);

const zk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const j = t.ent('zk_jaeger'), wand = t.ent('lw1'), ziel = t.ent('zk_ziel');
  // Nähe zündet: Figur steht still, der Zündkopf kommt und glimmt
  const fz = [-10, 1, t.Z(2, 4)];
  t.place(fz, { settle: 1 });
  let litAt = -1, d0 = t.dist(j, p), dLit = 0;
  p.hurt = () => false;
  for (let i = 0; i < 1800 && litAt < 0; i++) { p.pos.set(fz[0], fz[1], fz[2]); p.vel.set(0, 0, 0); c.step(1); if (j.lit) { litAt = L.time; dLit = t.dist(j, p); } }
  delete p.hurt;
  out.near = { lit: j.lit, d0: +d0.toFixed(2), dLit: +dLit.toFixed(2), state: j.state, model: j.modelState().anim };
  // brennend: an die Ziegelwand stellen, Zielscheibe und Figur daneben → Explosion nach 3 s
  const bx = -11.5, bz = t.Z(2, 11.2);
  ziel.pos.set(bx + 1.3, 1, bz); ziel.vel.set(0, 0, 0);
  let blink = false, exT = -1;
  t.place([bx - 1.3, 1, bz], { settle: 0 });
  for (let i = 0; i < 800 && !j.exploded; i++) {
    j.pos.set(bx, 1, bz); j.vel.set(0, 0, 0);
    ziel.pos.set(bx + 1.3, 1, bz); ziel.vel.set(0, 0, 0);
    p.pos.set(bx - 1.3, 1, bz); p.vel.set(0, 0, 0);
    c.step(1);
    if (j.modelState().anim === 'blink') blink = true;
    if (j.exploded) exT = L.time;
  }
  out.boom = { exploded: j.exploded, fuse: +(exT - litAt).toFixed(2), blink, wallBroken: wand.broken, wallLeft: wand.left, ziel: ziel.defeated, hurt: t.hurt(), explosion: j.explosion };
  c.step(100);
  out.boomGone = j.removed;
  // Draufspringen zündet (Abprall, kein Schaden)
  const s = L.spawn('zuendkopf', { pos: [-15, 1, t.Z(2, 3)], trigger: 0, speed: 0.001, behavior: 'walk' });
  t.place([0, 1, t.Z(2, 6)], { settle: 30 });
  const st = t.stomp(s);
  out.stomp = { ...st, lit: s.lit, defeated: s.defeated };
  // seitliche Berührung: kein Schaden (zündet, schubst)
  out.sideHurt = t.touch(s, 6);
  // Kettenreaktion: Explosion zündet einen Nachbarn (0,12 s), dann explodiert er
  const a = L.spawn('zuendkopf', { pos: [-15, 1, t.Z(2, 6)], lit: true, fuse: 0.3, trigger: 0, speed: 0.001, behavior: 'walk' });
  const b = L.spawn('zuendkopf', { pos: [-13.6, 1, t.Z(2, 6)], trigger: 0, speed: 0.001, behavior: 'walk' });
  t.place([0, 1, t.Z(2, 6)], { settle: 1 });
  let chainT = -1;
  for (let i = 0; i < 240; i++) { c.step(1); if (b.exploded && chainT < 0) chainT = L.time; }
  out.chain = { a: a.exploded, b: b.exploded };
  // Stern entschärft (fliegt weg, zählt als besiegt, keine Explosion)
  const d = L.spawn('zuendkopf', { pos: [-8, 1, t.Z(2, 7)], trigger: 0, speed: 0.001, behavior: 'walk' });
  t.place([-6.5, 1, t.Z(2, 7)], { settle: 1, power: 'stern' });
  let defeatedCount = 0;
  const prev = L.onEnemyDefeated;
  L.onEnemyDefeated = (e) => { prev?.(e); if (e === d) defeatedCount++; };
  for (let i = 0; i < 80 && !d.defeated; i++) { c.setInput({ x: -1 }); c.step(1); }
  c.setInput({});
  L.onEnemyDefeated = prev;
  out.star = { defeated: d.defeated, exploded: d.exploded, state: d.state, counted: defeatedCount };
  t.place([0, 1, t.Z(2, 6)], { settle: 1 });
  // Nachschub-Spender: höchstens 1 gleichzeitig, kommt nach
  const q = L.entities.find((e) => e.kind === 'zuendkopf_quelle');
  const n0 = q.spawned;
  t.place([-12, 1, t.Z(2, 3)], { settle: 1 });
  let maxAlive = 0, killed = 0;
  p.hurt = () => false;
  for (let i = 0; i < 2400; i++) {
    p.pos.set(-6, 1, t.Z(2, 2)); p.vel.set(0, 0, 0); c.step(1); maxAlive = Math.max(maxAlive, q.kids.length);
    for (const k of q.kids) if (k.stateT > 2 && k.state === 'walk') { k.kill(); killed++; }   // „besiegt“ → Nachschub
  }
  delete p.hurt;
  out.killed = killed;
  out.spawner = { spawned: q.spawned - n0, maxAlive };
  return out;
});
console.log(`  Zündkopf: ${JSON.stringify(zk)}`);
check(`Zündkopf läuft heran und zündet bei Nähe (${zk.near.d0} → ${zk.near.dLit} m), Zündschnur glimmt`, zk.near.lit && zk.near.dLit < 2.6 && zk.near.model === 'lit');
check(`Zündkopf explodiert nach ${zk.boom.fuse} s (blinkt vorher)`, zk.boom.exploded && Math.abs(zk.boom.fuse - 3) < 0.1 && zk.boom.blink);
check(`Explosion (Radius 2 m): verletzt die Figur, besiegt die Zielscheibe, zerstört lila Ziegel (${zk.boom.wallBroken} von 8)`, zk.boom.hurt && zk.boom.ziel && zk.boom.wallBroken >= 3 && zk.boomGone);
check('Draufspringen zündet den Zündkopf (Abprall, kein Schaden); seitliche Berührung verletzt nicht', zk.stomp.bounced && !zk.stomp.hurt && zk.stomp.lit && !zk.sideHurt);
check('Kettenreaktion: eine Explosion zündet den Nachbarn, der ebenfalls explodiert', zk.chain.a && zk.chain.b);
check('Funkelstern entschärft den Zündkopf (keine Explosion, zählt als besiegt)', zk.star.defeated && !zk.star.exploded && zk.star.counted === 1);
check(`Nachschub-Spender: ${zk.spawner.spawned} Zündköpfe in 20 s, höchstens ${zk.spawner.maxAlive} gleichzeitig`, zk.spawner.spawned >= 2 && zk.spawner.maxAlive === 1);

const zw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const z = t.ent('zk_wurf'), w2 = t.ent('lw2');
  // aufheben (Aktion) zündet, tragen, werfen → Aufprall an der lila Wand explodiert
  t.place([z.pos.x - 0.75, 1, z.pos.z], { settle: 2, yaw: 0 });
  t.face(z.pos.x, z.pos.z);
  t.action();
  out.pick = { holding: p.holding === z, lit: z.lit, state: z.state, model: z.modelState().anim };
  c.step(10);
  // zur Wand drehen (3 m davor) und werfen
  const wx = w2.pos.x, wz = w2.pos.z + w2.half.z + 3.2;
  t.moveTo([wx, 1, wz], 10);
  t.face(wx, w2.pos.z);
  c.step(1);
  const coins0 = L.runtime.coins;
  const fuse0 = z.fuse;
  t.action();
  const thrown = z.state === 'thrown';
  for (let i = 0; i < 180 && !z.exploded; i++) c.step(1);
  out.throw = { thrown, exploded: z.exploded, fuseLeft: +z.fuse.toFixed(2), fuse0: +fuse0.toFixed(2), broken: w2.broken, left: w2.left };
  c.step(120);
  out.coins = L.entities.filter((e) => e.kind === 'coin' && !e.removed).length;
  out.coinsGot = L.runtime.coins - coins0;
  // lila Ziegel: Stampfattacke und Kopfstoß lassen ihn nur wackeln, Tatzenhieb zerbricht ihn, POW zerbricht die übrigen
  const z1 = t.ent('lz1'), z2 = t.ent('lz2');
  const st = t.stomp({ pos: { x: z1.pos.x, y: z1.pos.y, z: z1.pos.z }, half: { x: 0.5, y: 0.5, z: 0.5 } }, { pound: true, h: 1.5 });
  out.pound = { left: z1.left, landed: st.landed };
  t.place([z2.pos.x, 1, z2.pos.z + 1.1], { settle: 5, power: 'krallen' });
  t.face(z2.pos.x, z2.pos.z);
  c.step(1);
  t.action();
  c.step(20);
  out.claw = { left: z2.left };
  // POW: draufspringen
  const pow = t.ent('pow');
  t.place([pow.pos.x, pow.pos.y + 2.4, pow.pos.z], { settle: 80 });
  out.pow = { lz1: z1.left, uses: pow.uses };
  // Explosion zerstört auch Ziegel und graue Steinblöcke (breakable/mega)
  const zg = t.ent('ziegel'), sb = t.ent('stein');
  const bomb = L.spawn('zuendkopf', { pos: [8.5, 1, zg.pos.z + 1.0], lit: true, fuse: 0.3, trigger: 0, speed: 0.001, behavior: 'walk' });
  t.place([0, 1, t.Z(2, 2)], { settle: 80 });
  out.blocks = { brick: zg.removed, stein: sb.removed, exploded: bomb.exploded };
  return out;
});
console.log(`  Zündkopf werfen / lila Ziegel: ${JSON.stringify(zw)}`);
check('Zündkopf aufheben (Aktion) zündet ihn, er wird getragen', zw.pick.holding && zw.pick.lit && zw.pick.state === 'carried' && zw.pick.model === 'carried');
check(`Geworfener Zündkopf explodiert beim Aufprall an der Wand (vor Ablauf der Lunte, ${zw.throw.fuseLeft} s übrig) und sprengt lila Ziegel (${zw.throw.broken})`, zw.throw.thrown && zw.throw.exploded && zw.throw.fuseLeft > 0.3 && zw.throw.broken >= 2);
check(`Lila Ziegel geben ihren Inhalt frei (${zw.coins} Münzen liegen)`, zw.coins >= 2 || zw.coinsGot >= 2);
check('Lila Ziegel: Stampfattacke zerbricht ihn nicht, Tatzenhieb schon, der POW-Block zerbricht die übrigen', zw.pound.left === 1 && zw.claw.left === 0 && zw.pow.lz1 === 0 && zw.pow.uses === 2);
check('Explosion zerstört auch Ziegel und graue Steinblöcke', zw.blocks.exploded && zw.blocks.brick && zw.blocks.stein);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
}

// __TEILE__

// __ENDE__
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
