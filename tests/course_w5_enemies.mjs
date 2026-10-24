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
      /** Treffer-Spuren löschen (unverwundbar-Zeit, klein). */
      fresh() { const p = P(); p.invuln = 0; if (!p.big) { p.big = true; p.updateHalf?.(); } },
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
  const OLD = ['panzerkroete', 'pilzling', 'rammbock_bulle', 'ameisensoldat', 'feuer_werfer', 'pilzlingsturm', 'kreisgeist', 'muenzmarder', 'spuk', 'krabbelkaefer', 'werferturm'];
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

// =====================================================================================================================
// Teil 2: Feuerring, Hackbeil-Pilz, Funkenling, Glutball, Suchkopf-Welle
// =====================================================================================================================
if (want(2)) {
await load('0-18');
console.log('Teil 2: Feuerring, Hackbeil-Pilz, Funkenling, Glutball, Suchkopf-Welle');
const fr = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('fr_puls');
  // Puls: Ring wächst von 0,6 m bis 4,5 m, flammt auf und erlischt, Pause
  let rMin = 99, rMax = 0, hMax = 0, off = 0;
  t.place([0, 1, t.Z(3, 7)], { settle: 1 });
  for (let i = 0; i < 360; i++) { c.step(1); if (f.flameH > 0.2) { rMin = Math.min(rMin, f.ring); rMax = Math.max(rMax, f.ring); } hMax = Math.max(hMax, f.flameH); if (f.flameH === 0) off++; }
  out.puls = { rMin: +rMin.toFixed(2), rMax: +rMax.toFixed(2), hMax: +hMax.toFixed(2), offS: +(off / 120).toFixed(2) };
  // stehen bleiben im Ring → Treffer
  const at3 = [f.base.x + 3, 1, f.base.z];
  t.place(at3, { settle: 1 });
  let hurt = false;
  for (let i = 0; i < 400 && !hurt; i++) { p.pos.set(at3[0], at3[1], at3[2]); p.vel.set(0, 0, 0); c.step(1); hurt = t.hurt(); }
  out.stand = hurt;
  // drüberspringen: im richtigen Augenblick springen → heil
  t.place(at3, { settle: 1 });
  for (let i = 0; i < 500 && !(f.anim === 'idle'); i++) { p.hurt = () => false; c.step(1); delete p.hurt; }
  t.fresh();
  let jumped = false, hurtJ = false, crossed = false;
  for (let i = 0; i < 480; i++) {
    const go = !jumped && f.anim === 'pulse' && f.ring >= 2.25;
    if (go) jumped = true;
    c.setInput(go ? { jump: true } : jumped && p.mode === 'air' ? { jump: true } : {});
    c.step(1);
    if (f.ring > 3.7) crossed = true;
    if (t.hurt() && !hurtJ) { hurtJ = true; out.dbg = { ring: +f.ring.toFixed(2), h: +f.flameH.toFixed(2), y: +p.pos.y.toFixed(2), mode: p.mode, state: p.state, i, inv: +p.invuln.toFixed(2), big: p.big }; }
    if (crossed && p.mode === 'ground') break;
  }
  c.setInput({});
  out.jumpOver = { jumped, crossed, hurt: hurtJ };
  // Kern verletzt, nicht besiegbar
  const coreHurt = t.touch(f, 10);
  f.onHit('star', p); f.onHit('bomb', p); f.onHit('fire', p);
  out.core = { hurt: coreHurt, alive: !f.removed };
  // Rad: dreht sich, Lücke lässt durch
  const r = t.ent('fr_rad');
  const a0 = r.angle;
  t.place([0, 1, t.Z(3, 7)], { settle: 120 });
  out.rad = { turned: +(r.angle - a0).toFixed(2), ring: r.ring };
  // Figur genau in die Lücke stellen (auf den Kreis): erst heil, dann trifft das Rad, wenn die Lücke weiterzieht
  const ga = r.angle;
  const gp = [r.base.x + Math.cos(ga) * r.ring, 1, r.base.z - Math.sin(ga) * r.ring];
  t.place(gp, { settle: 0 });
  let firstHurt = -1, inGapWhenHurt = null;
  for (let i = 0; i < 600 && firstHurt < 0; i++) {
    p.pos.set(gp[0], gp[1], gp[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (t.hurt()) { firstHurt = i / 120; inGapWhenHurt = r.gapAt(Math.atan2(-(gp[2] - r.base.z), gp[0] - r.base.x)); }
  }
  out.gap = { firstHurt: +firstHurt.toFixed(2), inGap: inGapWhenHurt };
  // blink: Flammen gehen im Takt aus
  const b = t.ent('fr_blink');
  let bOff = 0, bOn = 0;
  t.place([0, 1, t.Z(3, 7)], { settle: 1 });
  for (let i = 0; i < 400; i++) { c.step(1); if (b.flameH === 0) bOff++; if (b.flameH > 0.6) bOn++; }
  out.blink = { offS: +(bOff / 120).toFixed(2), onS: +(bOn / 120).toFixed(2) };
  return out;
});
console.log(`  Feuerring: ${JSON.stringify(fr)}`);
check(`Feuerring Puls: Ring wächst ${fr.puls.rMin} → ${fr.puls.rMax} m (Flammen ${fr.puls.hMax} m), dann Pause (${fr.puls.offS} s ohne Flammen)`, fr.puls.rMin < 1.2 && fr.puls.rMax > 4.2 && fr.puls.hMax > 0.6 && fr.puls.offS > 0.5);
check('Feuerring: wer im Ring stehen bleibt, wird getroffen; wer rechtzeitig drüberspringt, bleibt heil', fr.stand && fr.jumpOver.jumped && fr.jumpOver.crossed && !fr.jumpOver.hurt);
check('Feuerring: der Brennerkern verletzt; nicht besiegbar (Stern, Bombe, Feuer)', fr.core.hurt && fr.core.alive);
check(`Feuerring Rad dreht sich (${fr.rad.turned} rad in 1 s); in der Lücke heil, getroffen erst, als die Flammen kommen (${fr.gap.firstHurt} s)`, Math.abs(fr.rad.turned - 1) < 0.05 && fr.gap.firstHurt > 0.3 && fr.gap.inGap === false);
check(`Feuerring blink: Flammen im Takt aus (${fr.blink.offS} s) und an (${fr.blink.onS} s)`, fr.blink.offS > 0.6 && fr.blink.onS > 1.5);

const hb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const h = t.ent('hb_jaeger');
  const fig = [-9, 1, t.Z(4, 5)];
  t.place(fig, { settle: 1 });
  const d0 = t.dist(h, p);
  const seq = [];
  let raiseT = 0, hopSeen = false;
  p.hurt = () => false;
  for (let i = 0; i < 1500; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (h.state === 'hop') hopSeen = true;
    if (seq[seq.length - 1] !== h.state) seq.push(h.state);
    if (h.state === 'raise') raiseT = h.stateT;
    if (h.state === 'stuck') break;
  }
  delete p.hurt;
  out.approach = { d0: +d0.toFixed(2), d1: +t.dist(h, p).toFixed(2), hop: hopSeen, seq: seq.slice(-5).join('>'), raise: +raiseT.toFixed(2), blade: h.info().blade, hx: +h.pos.x.toFixed(2) };
  // Schneide trifft die Figur 1,25 m vor ihm
  for (let i = 0; i < 600 && h.state !== 'rest'; i++) { p.hurt = () => false; c.step(1); delete p.hurt; }
  const f = h.facing({});
  const front = [h.pos.x + f.x * 1.25, 1, h.pos.z + f.z * 1.25];
  t.place(front, { settle: 0 });
  p.hurt = () => false;
  for (let i = 0; i < 900 && h.state !== 'raise'; i++) { p.pos.set(front[0], front[1], front[2]); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  t.fresh();
  const hf = h.facing({});
  const front2 = [h.pos.x + hf.x * 1.25, 1, h.pos.z + hf.z * 1.25];
  let bladeHurt = false, hurtState = null;
  for (let i = 0; i < 600 && !bladeHurt; i++) { p.pos.set(front2[0], front2[1], front2[2]); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) { bladeHurt = true; hurtState = h.state; } }
  out.blade = { hurt: bladeHurt, state: hurtState };
  // steckt fest: von der Seite harmlos, von oben besiegbar
  for (let i = 0; i < 900 && h.state !== 'stuck'; i++) { p.hurt = () => false; p.pos.set(front2[0] + hf.x * 2, 1, front2[2] + hf.z * 2); c.step(1); delete p.hurt; }
  c.step(20);
  const stuck = h.state === 'stuck';
  const sideStuck = stuck ? t.touch(h, 5, -1) : null;
  const st = h.state === 'stuck' ? t.stomp(h, { h: 0.8 }) : { bounced: false };
  out.stuck = { stuck, sideHurt: sideStuck, ...st, defeated: h.defeated, state: h.state };
  // nicht festgesteckt: von vorn draufspringen trifft das Beil; von hinten besiegt; seitlich verletzt; Feuer besiegt
  const mk = (x) => L.spawn('hackbeil_pilz', { pos: [x, 1, t.Z(4, 9)], dir: [1, 0], behavior: 'patrol', hop: 0.001, sight: 0, wake: 99 });
  const a = mk(-16), b = mk(-12), d = mk(-8);
  t.place([-11, 1, t.Z(4, 2)], { settle: 2 });
  const sa = t.stomp(a, { h: 0.6, off: [0.25, 0] });
  out.front = { ...sa, defeated: a.defeated };
  t.place([-11, 1, t.Z(4, 2)], { settle: 30 });
  const sb = t.stomp(b, { h: 0.6, off: [-0.3, 0] });
  out.back = { ...sb, defeated: b.defeated };
  t.place([-11, 1, t.Z(4, 2)], { settle: 30 });
  out.side = t.touch(d, 6, 1);
  t.place([-11, 1, t.Z(4, 2)], { settle: 30 });
  d.onHit('fire', p);
  out.fire = d.defeated;
  return out;
});
console.log(`  Hackbeil-Pilz: ${JSON.stringify(hb)}`);
check(`Hackbeil-Pilz hüpft auf die Figur zu (${hb.approach.d0} → ${hb.approach.d1} m), holt aus (Vorwarnung ${hb.approach.raise} s), hackt, steckt fest`, hb.approach.hop && hb.approach.d1 < hb.approach.d0 - 2 && /raise>chop>stuck/.test(hb.approach.seq) && hb.approach.raise >= 0.5);
check(`Hackbeil-Pilz: die Schneide trifft 1,25 m vor ihm (im Hieb: ${hb.blade.state})`, hb.blade.hurt && (hb.blade.state === 'chop' || hb.blade.state === 'stuck'));
check('Hackbeil-Pilz steckt fest: seitlich harmlos, Draufspringen besiegt ihn (Abprall)', hb.stuck.stuck && hb.stuck.sideHurt === false && hb.stuck.bounced && !hb.stuck.hurt && hb.stuck.defeated);
check('Hackbeil-Pilz ohne Feststecken: von vorn draufspringen trifft das Beil (Treffer), von hinten besiegt ihn, seitlich verletzt, Feuer besiegt', hb.front.hurt && !hb.front.defeated && hb.back.bounced && hb.back.defeated && !hb.back.hurt && hb.side && hb.fire);

const fl = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('fl_block'), w = t.ent('fl_wand'), u = t.ent('fl_wusel');
  t.place([0, 1, t.Z(4, 7)], { settle: 1 });
  const m0 = [b.moved, w.moved, u.moved];
  let yb0 = 99, yb1 = -99, yw0 = 99, yw1 = -99, ux0 = 99, ux1 = -99;
  for (let i = 0; i < 480; i++) {
    c.step(1);
    yb0 = Math.min(yb0, b.pos.y); yb1 = Math.max(yb1, b.pos.y);
    yw0 = Math.min(yw0, w.pos.y); yw1 = Math.max(yw1, w.pos.y);
    ux0 = Math.min(ux0, u.pos.x); ux1 = Math.max(ux1, u.pos.x);
  }
  out.move = { block: +(b.moved - m0[0]).toFixed(1), blockY: [+yb0.toFixed(2), +yb1.toFixed(2)], wallY: [+yw0.toFixed(2), +yw1.toFixed(2)], wusel: +(u.moved - m0[2]).toFixed(1), wuselX: [+ux0.toFixed(1), +ux1.toFixed(1)] };
  // Draufspringen verbrennt; Feuer prallt ab; Tatzenhieb besiegt
  const st = t.stomp(u, { h: 0.6 });
  out.stomp = { hurt: st.hurt, defeated: u.defeated };
  t.place([0, 1, t.Z(4, 7)], { settle: 30 });
  u.onHit('fire', p); u.onHit('shell', p); u.onHit('throw', p);
  out.fire = u.defeated;
  // echter Tatzenhieb (Krallen-Anzug) gegen einen stehenden Funkenling
  const k = L.spawn('funkenling', { pos: [10, 1, t.Z(4, 12)], speed: 0.001, mode: 'wusel', wake: 99 });
  c.step(5);
  t.place([k.pos.x - 0.9, 1, k.pos.z], { settle: 3, power: 'krallen', yaw: 0 });
  t.face(k.pos.x, k.pos.z);
  t.action();
  c.step(30);
  out.claw = { defeated: k.defeated, state: k.state };
  c.step(100);
  out.claw.gone = k.removed;
  w.onHit('star', p);
  out.star = w.defeated;
  return out;
});
console.log(`  Funkenling: ${JSON.stringify(fl)}`);
check(`Funkenling läuft am Blockrand (${fl.move.block} m in 4 s, Höhe ${fl.move.blockY.join('–')}), die Wand hinauf (${fl.move.wallY.join('–')} m) und wuselt (${fl.move.wusel} m)`, fl.move.block > 6 && fl.move.blockY[0] > 2.1 && fl.move.wallY[0] < 1.1 && fl.move.wallY[1] > 3.9 && fl.move.wusel > 4 && fl.move.wuselX[0] > 4 && fl.move.wuselX[1] < 19);
check('Funkenling: Draufspringen verbrennt (Treffer), Feuer/Panzer/Wurf prallen ab', fl.stomp.hurt && !fl.stomp.defeated && !fl.fire);
check('Funkenling: nur Power-ups besiegen ihn (Tatzenhieb, Funkelstern) – er verpufft', fl.claw.defeated && fl.claw.state === 'poof' && fl.claw.gone && fl.star);

const gb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const g = [t.ent('gb'), t.ent('gb_1'), t.ent('gb_2')];
  t.place([0, 1, t.Z(5, 7)], { settle: 1 });
  const j0 = g.map((e) => e.jumps);
  let hMax = 0;
  const first = [-1, -1, -1];
  for (let i = 0; i < 576; i++) {
    c.step(1);
    hMax = Math.max(hMax, g[0].height());
    g.forEach((e, k) => { if (first[k] < 0 && e.jumps > j0[k]) first[k] = L.time; });
  }
  out.jumps = g.map((e, k) => e.jumps - j0[k]);
  out.hMax = +hMax.toFixed(2);
  const per = (x) => +((((x % 2.4) + 2.4) % 2.4)).toFixed(2);   // Versatz im Takt (2,4 s)
  out.lag = [per(first[1] - first[0]), per(first[2] - first[1])];
  out.color = g[0].color;
  // in der Luft verletzt, unten harmlos; Draufspringen verletzt; Stern besiegt
  const e = g[0];
  for (let i = 0; i < 400 && !(e.state === 'up' && e.height() > 1.5); i++) c.step(1);
  out.airHurt = t.touch(e, 3);
  t.place([0, 1, t.Z(5, 7)], { settle: 1 });
  for (let i = 0; i < 400 && e.state !== 'down'; i++) c.step(1);
  out.downTouch = e.touch;
  e.onHit('fire', p); e.onHit('claw', p);
  out.fire = e.defeated;
  for (let i = 0; i < 400 && e.state !== 'up'; i++) c.step(1);
  e.onHit('star', p);
  out.star = e.defeated;
  return out;
});
console.log(`  Glutball: ${JSON.stringify(gb)}`);
check(`Glutbälle springen im Takt (2,4 s: ${gb.jumps.join('/')} Sprünge in 4,8 s, ${gb.hMax} m hoch), Reihe versetzt (${gb.lag.join(' / ')} s), blau wie die Lava`, gb.jumps.every((n) => n === 2) && gb.hMax > 3 && gb.hMax < 3.4 && gb.lag.every((x) => Math.abs(x - 0.48) < 0.05) && gb.color === 'blau');
check('Glutball: in der Luft verletzt, in der Lava harmlos; Feuer/Krallen nicht, Stern besiegt', gb.airHurt && gb.downTouch === false && !gb.fire && gb.star);

const sw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const w = t.ent('welle'), k1 = t.ent('k1'), k2 = t.ent('k2'), licht = t.ent('licht');
  // ohne Alarm: Kanonen schweigen (Figur im Schussfeld, aber im Schatten des Dachs)
  const dach = [15.5, 1, t.Z(5, 7)];
  t.place(dach, { settle: 1 });
  p.hurt = () => false;
  for (let i = 0; i < 480; i++) { p.pos.set(dach[0], dach[1], dach[2]); p.vel.set(0, 0, 0); c.step(1); }
  out.quiet = { k1: k1.shots, k2: k2.shots, alarms: licht.alarms, state: w.state };
  // ins Licht: Alarm → Welle (2 Schüsse je Kanone)
  const a0 = L.signals.alarm ?? 0;
  let spotted = false;
  for (let i = 0; i < 1200 && !spotted; i++) { const s = licht.spot; p.pos.set(s.x, 1, s.z); p.vel.set(0, 0, 0); c.step(1); spotted = w.state === 'wave'; }
  const heads = new Set();
  let maxState = w.state;
  for (let i = 0; i < 1200 && w.state !== 'cool'; i++) {
    p.pos.set(12, 1, t.Z(5, 9)); p.vel.set(0, 0, 0);
    c.step(1);
    for (const e of L.entities) if (e.kind === 'suchkopf' && e.owner && (e.owner === k1 || e.owner === k2)) heads.add(e);
  }
  out.wave = { spotted, signals: (L.signals.alarm ?? 0) - a0, shots: [k1.shots, k2.shots], heads: heads.size, state: w.state, waves: w.waves, active: [k1.active, k2.active] };
  // Abklingzeit: neuer Alarm verpufft, danach wieder bereit
  const ig0 = w.ignored;
  w.trigger({});
  out.cool = { ignored: w.ignored - ig0, state: w.state };
  for (let i = 0; i < 480 && w.state !== 'ready'; i++) { p.pos.set(dach[0], dach[1], dach[2]); c.step(1); }
  out.ready = w.state;
  const s1 = [k1.shots, k2.shots];
  for (let i = 0; i < 360; i++) { p.pos.set(dach[0], dach[1], dach[2]); p.vel.set(0, 0, 0); c.step(1); }
  out.after = [k1.shots - s1[0], k2.shots - s1[1]];
  // breaks (5-7): ein Kopf zertrümmert beim Aufprall einen Ziegel und einen grauen Steinblock, ohne breaks nicht
  const z0 = t.Z(5, 1.5);
  const br1 = L.spawn('brick', { pos: [10, 1, z0] }), br2 = L.spawn('steinblock', { pos: [10, 1, z0 - 2] }), br3 = L.spawn('brick', { pos: [10, 1, z0 - 4] });
  L.spawn('projektilkopf', { pos: [6, 1.15, z0], dir: [1, 0], speed: 6, breaks: true });
  L.spawn('projektilkopf', { pos: [6, 1.15, z0 - 2], dir: [1, 0], speed: 6, breaks: true });
  L.spawn('projektilkopf', { pos: [6, 1.15, z0 - 4], dir: [1, 0], speed: 6 });
  for (let i = 0; i < 240; i++) { p.pos.set(dach[0], dach[1], dach[2]); p.vel.set(0, 0, 0); c.step(1); }
  out.breaks = { brick: br1.removed, stein: br2.removed, plain: br3.removed };
  delete p.hurt;
  return out;
});
console.log(`  Suchkopf-Welle: ${JSON.stringify(sw)}`);
check('Suchkopf-Kanonen schweigen ohne Alarm (Figur unter dem Dach)', sw.quiet.k1 === 0 && sw.quiet.k2 === 0 && sw.quiet.alarms === 0 && sw.quiet.state === 'ready');
check(`Alarm des Suchscheinwerfers → Suchkopf-Welle: ${sw.wave.heads} Suchköpfe (2 je Kanone), danach wieder still`, sw.wave.spotted && sw.wave.signals >= 1 && sw.wave.shots[0] === 2 && sw.wave.shots[1] === 2 && sw.wave.heads === 4 && sw.wave.state === 'cool' && !sw.wave.active[0] && !sw.wave.active[1]);
check('Suchkopf-Welle: Alarm in der Abklingzeit verpufft, danach wieder bereit, ohne Alarm keine Schüsse', sw.cool.ignored === 1 && sw.ready === 'ready' && sw.after[0] === 0 && sw.after[1] === 0);
check('Köpfe mit breaks zertrümmern beim Aufprall Ziegel und Steinblock (ohne breaks nicht)', sw.breaks.brick && sw.breaks.stein && !sw.breaks.plain);
const wt = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const tw = t.ent('wturm'), w = t.ent('wturm_werfer');
  out.start = { count: tw.count, height: +tw.height.toFixed(2), riderY: +(w.pos.y - tw.pos.y).toFixed(2), riding: w.riding === tw };
  // er wirft von oben auf die Figur
  const fig = [10, 1, t.Z(6, 3)];
  t.place(fig, { settle: 1 });
  const th0 = w.throws;
  p.hurt = () => false;
  for (let i = 0; i < 960; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  out.throws = w.throws - th0;
  out.riderStill = +(w.pos.y - tw.pos.y - tw.height).toFixed(2);
  // von oben eine Stufe abtragen: der Werfer sinkt mit (der Abprall vom Werfer besiegt ihn – hier nur die Stufe)
  const h0 = tw.height;
  tw.onHit('fire', p);
  c.step(2);
  out.pop = { count: tw.count, drop: +(h0 - tw.height).toFixed(2), riderY: +(w.pos.y - tw.pos.y).toFixed(2) };
  // Explosion wirft den Turm um, der Werfer springt ab und kämpft am Boden
  tw.onHit('bomb', p);
  for (let i = 0; i < 360; i++) c.step(1);
  out.fall = { tower: tw.defeated, rider: w.state, riderY: +w.pos.y.toFixed(2), riding: !!w.riding, alive: !w.defeated };
  return out;
});
console.log(`  Werferturm: ${JSON.stringify(wt)}`);
check(`Werferturm (5-B): 9 Pilzlinge (${wt.start.height} m), Werfer obenauf wirft (${wt.throws} Würfe in 8 s) und bleibt oben`, wt.start.count === 9 && wt.start.height > 5.5 && wt.start.riding && Math.abs(wt.start.riderY - wt.start.height) < 0.05 && wt.throws >= 2 && Math.abs(wt.riderStill) < 0.05);
check('Werferturm: ein Treffer nimmt die oberste Stufe, der Werfer sinkt mit; Explosion wirft den Turm um, der Werfer kämpft am Boden weiter', wt.pop.count === 8 && Math.abs(wt.pop.drop - 0.62) < 0.01 && wt.fall.tower && !wt.fall.riding && wt.fall.alive && wt.fall.riderY < 1.2);
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);
}

// =====================================================================================================================
// Teil 3: Kippquader-König (0-19)
// =====================================================================================================================
const BOSS_HELPERS = ([id, startZ]) => {
  const c = window.__course, t = window.__t, L = c.level;
  t.boss = () => t.ent(id);
  t.arch = () => c.state().archetype;
  t.enter = () => {
    t.place([0, 2, startZ], { settle: 2 });
    for (let i = 0; i < 960 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._w5) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._w5 = true; }
  /** Bis Zustand s; Figur unverwundbar an pos (null = bleibt). */
  t.untilSafe = (s, n = 3000, pos = null) => {
    const b = t.boss(), p = c.player;
    p.hurt = () => false;
    let i = 0;
    for (; i < n && b.state !== s; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); }
    delete p.hurt;
    return i;
  };
  /** Von oben auf den liegenden König fallen: Feld-Mitte + along m entlang seiner Blickrichtung (+ side quer). */
  t.backJump = (along = 0, side = 0, o = {}) => {
    const b = t.boss(), p = c.player;
    const f = b.backField(), D = [[1, 0], [0, -1], [-1, 0], [0, 1]][b.facing];
    const x = f.x + D[0] * along - D[1] * side, z = f.z + D[1] * along + D[0] * side;
    t.place([x, f.y + (o.h ?? 1.6), z], { settle: 0 });
    t.fresh();
    const hp0 = b.hp;
    let landed = false, bounced = false;
    if (o.pound) { c.setInput({ crouch: true }); c.step(1); }
    for (let i = 0; i < 240; i++) {
      c.setInput({});
      c.step(1);
      if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = x; p.pos.z = z; }
      if (b.hp < hp0 && p.vel.y > 5) { bounced = true; break; }
      if (p.mode === 'ground') { landed = true; if (i > 3) break; }
    }
    return { hp: b.hp, hit: b.hp < hp0, landed, bounced, onBoss: p.ground?.owner === b, misses: b.misses, x: +x.toFixed(2), z: +z.toFixed(2) };
  };
};

if (want(3)) {
await load('0-19');
await sc(BOSS_HELPERS, ['koenig', 17]);
console.log('Teil 3: Kippquader-König 0-19');
const kk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.boss();
  out.before = { state: b.state, hp: b.hp, maxHp: b.maxHp };
  const a = t.enter();
  out.start = { started: a.started, state: b.state, hud: a.hud?.boss?.hp, lock: a.lock };
  // Auftritt → Gehen: er kommt näher und richtet sich zur Figur aus
  const fig = [-3, 2, 4];
  t.untilSafe('walk', 900, fig);
  const d0 = Math.hypot(b.pos.x - fig[0], b.pos.z - fig[2]);
  let warnRect = null, warnHint = false;
  p.hurt = () => false;
  for (let i = 0; i < 1200 && b.state !== 'warn'; i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  c.step(2);
  warnHint = b.hint.info().shown;
  warnRect = b.hint.info().rects[0];
  const lieR = b.lieRect();
  out.walk = { d0: +d0.toFixed(2), d1: +Math.hypot(b.pos.x - fig[0], b.pos.z - fig[2]).toFixed(2), facing: b.facing, state: b.state, hint: warnHint, rect: warnRect, lie: [lieR.x0, lieR.z0, lieR.x1, lieR.z1].map((v) => +v.toFixed(2)) };
  // Kippen trifft die Figur in der Landefläche und schiebt sie hinaus
  t.fresh();
  const mid = [(lieR.x0 + lieR.x1) / 2 + 0.6, 2, (lieR.z0 + lieR.z1) / 2];
  let hurtTilt = false;
  for (let i = 0; i < 400 && b.state !== 'lie'; i++) { if (!hurtTilt) { p.pos.set(mid[0], mid[1], mid[2]); p.vel.set(0, 0, 0); } c.step(1); if (t.hurt()) hurtTilt = true; }
  const box = b.lyingBox();
  const inside = p.pos.x > box.x0 && p.pos.x < box.x1 && p.pos.z > box.z0 && p.pos.z < box.z1 && p.pos.y < box.y1 - 0.1;
  out.tilt = { hurt: hurtTilt, state: b.state, lying: b.lying, inside, tips: b.tips, hint: b.hint.info().shown };
  // liegend begehbar: Landung daneben (Fußende) zählt nicht
  const miss = t.backJump(-1.6);
  out.miss = miss;
  // Treffer von vorn/seitlich zählt nicht – im Liegen sind Angriffe wirkungslos
  b.onHit('fire', p); b.onHit('claw', p); b.onHit('bomb', p); b.onHit('star', p); b.onHit('mega', p);
  out.attacks = b.hp;
  // Sprung auf das Schwachpunkt-Feld: Treffer (3 → 2), Abprall
  const back = b.backField();
  if (b.model) { for (let k = 0; k < 30; k++) { b.syncModel(); b.model.update(0.2, b.modelState()); } }
  const mb = c.view ? b.model?.back?.() : null;
  out.backModel = mb ? [+mb.x.toFixed(2), +mb.z.toFixed(2)] : null;
  out.backField = [+back.x.toFixed(2), +back.z.toFixed(2)];
  const h1 = t.backJump(0);
  out.hit1 = { ...h1, hud: t.arch().hud?.boss?.hp, state: b.state };
  // aufstehen, Ecken brechen weg, Phase 2
  t.untilSafe('roar', 600, [0, 2, 8]);
  out.corners1 = ['ecke_vl', 'ecke_vr', 'ecke_hl', 'ecke_hr'].map((id) => t.ent(id).state);
  t.untilSafe('walk', 600, [0, 2, 8]);
  c.step(240);
  out.corners1b = ['ecke_vl', 'ecke_vr'].map((id) => t.ent(id).state);
  out.phase2 = { phase: b.phase, banners: t.banners.slice() };
  // stehend: seitliche Berührung verletzt, Kopfsprung prallt ab – beides ohne Schaden für ihn
  for (let i = 0; i < 900 && b.state !== 'walk'; i++) { p.hurt = () => false; c.step(1); delete p.hurt; }
  const side = t.touch(b, 6, 1);
  const head = t.stomp(b, { h: 0.6 });
  out.standing = { side, head: head.bounced, headHurt: head.hurt, hp: b.hp };
  // zweiter Treffer (Stampfattacke auf das Feld)
  t.untilSafe('lie', 3000, [0, 2, 8]);
  const h2 = t.backJump(0.3, -0.2, { pound: true, h: 2.2 });
  out.hit2 = { ...h2, pound: b.hitLog[1]?.pound ?? null };
  t.untilSafe('walk', 900, [0, 2, 8]);
  out.corners2 = ['ecke_vl', 'ecke_vr', 'ecke_hl', 'ecke_hr'].map((id) => t.ent(id).state);
  out.phase3 = { phase: b.phase, banners: t.banners.slice(-2) };
  // Phase 3: Schockwelle beim Aufschlag (verletzt am Boden, drüberspringen geht), Begleit-Kippquader kippen mit
  t.untilSafe('tilt', 3000, [0, 2, 8]);
  const kq = [t.ent('kq_l'), t.ent('kq_r')];
  const kqTips0 = kq.map((q) => q.tips);
  t.untilSafe('lie', 600, [0, 2, 8]);
  out.shock = { shocks: b.shocks, waves: b.waves.length, escortTips: b.escortTips };
  // Welle läuft auf die Figur (≈ 5 m von der Mitte) zu: stehend getroffen
  const wv = b.waves[0];
  let shockHurt = false;
  if (wv) {
    const sp = [wv.x + 5, 2, wv.z];
    const okSpot = Math.abs(sp[0]) < 6;
    const spot = okSpot ? sp : [wv.x - 5, 2, wv.z];
    t.place(spot, { settle: 0 });
    t.fresh();
    for (let i = 0; i < 200 && !shockHurt; i++) { p.pos.set(spot[0], spot[1], spot[2]); p.vel.set(0, 0, 0); c.step(1); shockHurt = t.hurt(); }
  }
  out.shock.hurt = shockHurt;
  t.place([0, 2, 8], { settle: 1 });
  p.hurt = () => false;
  c.step(360);
  delete p.hurt;
  out.escorts = kq.map((q, i) => q.tips - kqTips0[i]);
  // dritter Treffer: besiegt
  t.untilSafe('lie', 3000, [0, 2, 8]);
  const h3 = t.backJump(0);
  out.hit3 = { ...h3, defeated: b.defeated, state: b.state };
  t.untilSafe('gone', 900, [0, 2, 8]);
  c.step(4);
  out.gone = { state: b.state, visible: b.visible, won: t.arch().won, warp: t.ent('warp_sieg').hidden, star: t.count('star'), lying: b.lying, banners: t.banners.slice(-3) };
  // Stern einsammeln, Warp-Box → Plateau → Zielmast
  const st = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (st) t.place([st.pos.x, st.pos.y, st.pos.z], { settle: 60 });
  out.starTaken = !L.entities.some((e) => e.kind === 'star' && !e.removed);
  c.step(90);
  out.gone.escortsRun = ['kq_l', 'kq_r'].map((id) => t.ent(id).running);
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 1600; i++) { c.step(1); if (p.pos.z < -30 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 2400 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 3600 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  return out;
});
console.log(`  Kippquader-König: ${JSON.stringify(kk)}`);
check('Kippquader-König: Kampf beginnt beim Betreten (Auftritt, Lebensleiste 3/3, Sperre)', kk.before.state === 'wait' && kk.start.started && kk.start.state === 'intro' && kk.start.hud === 3 && kk.start.lock);
check(`Er watschelt auf die Figur zu (${kk.walk.d0} → ${kk.walk.d1} m) und kündigt das Kippen mit roter Landefläche an (genau sein Grundriss)`, kk.walk.d1 < kk.walk.d0 - 1 && kk.walk.state === 'warn' && kk.walk.hint && kk.walk.rect && kk.walk.rect.every((v, i) => Math.abs(v - kk.walk.lie[i]) < 0.01));
check('Kippen trifft die Figur in der Landefläche (hinausgeschoben); danach liegt er (Kollisions-Box), Hinweis weg', kk.tilt.hurt && !kk.tilt.inside && kk.tilt.state === 'lie' && kk.tilt.lying && !kk.tilt.hint);
check('Liegend begehbar: Landung neben dem Schwachpunkt-Feld zählt nicht; Angriffe (Feuer, Krallen, Bombe, Stern, Riese) zählen nicht', kk.miss.landed && kk.miss.onBoss && !kk.miss.hit && kk.miss.misses >= 1 && kk.attacks === 3);
check(`Sprung auf das Schwachpunkt-Feld (model.back ${JSON.stringify(kk.backModel)} ≈ ${JSON.stringify(kk.backField)}): Treffer 3 → 2, Abprall, Lebensleiste folgt`, kk.hit1.hit && kk.hit1.hp === 2 && kk.hit1.bounced && kk.hit1.hud === 2 && (!kk.backModel || Math.hypot(kk.backModel[0] - kk.backField[0], kk.backModel[1] - kk.backField[1]) < 0.3));
check(`Nach Treffer 1 brechen zwei Arenaecken weg (${kk.corners1b.join(', ')}), die hinteren bleiben (${kk.corners1.slice(2).join(', ')})`, kk.corners1b.every((s) => s === 'gone' || s === 'fall') && kk.corners1.slice(2).every((s) => s === 'solid'));
check(`Phase 2 mit eigener Ansage (${kk.phase2.banners.join(' | ')})`, kk.phase2.phase === 2 && kk.phase2.banners.includes('Er wird schneller!') && kk.phase2.banners.includes('Spring auf den blauen Stern auf seinem Rücken!') && !kk.phase2.banners.some((x) => /wütend|Feuerspur|Bomben/.test(x)));
check('Stehend: seitliche Berührung verletzt, Kopfsprung prallt ab – kein Treffer für ihn', kk.standing.side && kk.standing.head && !kk.standing.headHurt && kk.standing.hp === 2);
check('Zweiter Treffer per Stampfattacke auf das Feld (2 → 1); die hinteren Ecken brechen', kk.hit2.hit && kk.hit2.hp === 1 && kk.hit2.pound === true && kk.corners2.every((s) => s !== 'solid'));
check(`Phase 3: Ansage, Schockwelle beim Aufschlag (verletzt am Boden), Begleit-Kippquader kippen mit (${kk.escorts.join('/')})`, kk.phase3.phase === 3 && kk.phase3.banners.some((x) => /Welle/.test(x)) && kk.shock.shocks >= 1 && kk.shock.hurt && kk.shock.escortTips === 2 && kk.escorts.every((n) => n >= 1));
check('Dritter Treffer besiegt ihn: zerbröckelt → gone, Archetyp siegt, Stern erscheint, Warp-Box sichtbar', kk.hit3.hit && kk.hit3.hp === 0 && kk.hit3.defeated && kk.gone.state === 'gone' && !kk.gone.visible && kk.gone.won && kk.gone.warp === false && kk.gone.star === 1 && !kk.gone.lying && kk.gone.escortsRun.every((r) => !r));
check('Stern einsammeln, Warp-Box führt zum Zielplateau, Zielmast beendet das Level', kk.starTaken && kk.finish.arrived && kk.finish.finished);

// Tod im Kampf setzt alles zurück (König, Ecken, Begleit-Kippquader); Klon: er zielt auf die nächste Figur
await load('0-19');
await sc(BOSS_HELPERS, ['koenig', 17]);
const kr = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const b = t.boss();
  t.enter();
  const out = {};
  t.untilSafe('lie', 3000, [0, 2, 8]);
  t.backJump(0);
  out.hpBefore = b.hp;
  t.untilSafe('walk', 900, [0, 2, 8]);
  c.step(240);
  out.cornersBefore = t.ent('ecke_vl').state;
  p.die('hit');
  for (let i = 0; i < 2400 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  c.step(10);
  out.reset = { state: b.state, hp: b.hp, lying: b.lying, started: t.arch().started, deaths: t.arch().deaths, z: +b.pos.z.toFixed(2), corners: ['ecke_vl', 'ecke_vr', 'ecke_hl', 'ecke_hr'].map((id) => t.ent(id).state), kq: ['kq_l', 'kq_r'].map((id) => t.ent(id).running) };
  // erneut betreten: Kampf von vorn
  const a = t.enter();
  out.again = { started: a.started, state: b.state, hp: b.hp };
  // Klon: er richtet sich zur nächsten Figur aus
  if (typeof L.addClone === 'function') {
    t.untilSafe('walk', 900, [0, 2, 8]);
    const q = c.player;
    q.hurt = () => false;
    const k = L.addClone(q);
    if (k) {
      k.hurt = () => false;
      for (let i = 0; i < 400; i++) { q.pos.set(-4, 2, 8); k.pos.set(7.5, 2, -1); q.vel.set(0, 0, 0); k.vel.set(0, 0, 0); c.step(1); }
      out.clone = { target: b.player === k, facing: b.facing };
    }
    delete q.hurt;
  }
  return out;
});
console.log(`  Kippquader-König Tod/Klon: ${JSON.stringify(kr)}`);
check('Kippquader-König zielt auf die nächste Figur (Klon) und blickt zu ihr (+X)', !kr.clone || (kr.clone.target && kr.clone.facing === 0));
check('Tod im Kampf: Neustart, König 3/3 am Startplatz, Ecken wieder fest, Begleit-Kippquader ruhen, Kampf von vorn', kr.hpBefore === 2 && kr.cornersBefore !== 'solid' && kr.reset.state === 'wait' && kr.reset.hp === 3 && !kr.reset.lying && !kr.reset.started && kr.reset.deaths === 1 && kr.reset.z === -5 && kr.reset.corners.every((s) => s === 'solid') && kr.reset.kq.every((r) => r === false) && kr.again.started && kr.again.state === 'intro');
check('Keine Konsolenfehler (Teil 3)', errors.length === 0);
}

// =====================================================================================================================
// Teil 4: Bilder (Kurs-Kamera) und Zeichenaufrufe
// =====================================================================================================================
if (want(4)) {
await load('0-18');
console.log('Teil 4: Bilder');
const S = {};
const stand = (pos, yaw = Math.PI / 2) => sc(([q, y]) => { window.__t.place(q, { settle: 2, yaw: y }); }, [pos, yaw]);
S.sandtaucher = await SHOT('w5e', 'sandtaucher_versteckt', () => { const t = window.__t; t.place([-7, 1, t.Z(1, 2)], { settle: 2 }); window.__course.step(30); });
S.sandsprung = await SHOT('w5e', 'sandtaucher_sprung', () => {
  const c = window.__course, t = window.__t, p = c.player, f = t.ent('st_sand');
  const fig = [-7, 1, t.Z(1, 4)];
  for (let i = 0; i < 2400 && !(f.state === 'jump' && f.stateT > 0.42); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(f.pos.x, f.pos.z);
});
S.wasser = await SHOT('w5e', 'sandtaucher_wasser', () => {
  const c = window.__course, t = window.__t, p = c.player, f = t.ent('st_wasser'), m = c.level.data.marks.pool;
  for (let i = 0; i < 2400 && !(f.state === 'jump' && f.stateT > 0.45); i++) { p.pos.set(m[0], m[1] + 0.4, m[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(f.pos.x, f.pos.z);
});
S.zk = await SHOT('w5e', 'zuendkopf_brennt', () => {
  const c = window.__course, t = window.__t, p = c.player, j = t.ent('zk_jaeger');
  const fig = [-10, 1, t.Z(2, 4)];
  for (let i = 0; i < 1800 && !(j.lit && j.fuse < 1.6); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(j.pos.x, j.pos.z);
});
S.zkboom = await SHOT('w5e', 'zuendkopf_explosion', () => {
  const c = window.__course, t = window.__t, p = c.player, j = t.ent('zk_jaeger');
  for (let i = 0; i < 600 && !j.exploded; i++) { j.pos.set(-11.5, 1, t.Z(2, 11.2)); p.pos.set(-7, 1, t.Z(2, 7)); p.vel.set(0, 0, 0); c.step(1); }
  c.step(14);
});
S.zktrag = await SHOT('w5e', 'zuendkopf_tragen', () => {
  const c = window.__course, t = window.__t, p = c.player, z = t.ent('zk_wurf');
  t.place([z.pos.x - 0.75, 1, z.pos.z], { settle: 2, yaw: 0 });
  t.face(z.pos.x, z.pos.z); t.action(); c.step(20);
  t.face(z.pos.x + 2, z.pos.z - 4); c.step(2);
});
S.lila = await SHOT('w5e', 'lila_ziegel', () => {
  const c = window.__course, t = window.__t, p = c.player;
  // Wurf an die Wand: Explosion, Ziegel brechen
  const w2 = t.ent('lw2');
  t.moveTo([w2.pos.x - 1, 1, w2.pos.z + w2.half.z + 3.2], 10);
  t.face(w2.pos.x, w2.pos.z); c.step(1); t.action();
  for (let i = 0; i < 180 && p.holding; i++) c.step(1);
  for (let i = 0; i < 200; i++) { c.step(1); if (w2.broken > 0) break; }
  c.step(10);
});
S.puls = await SHOT('w5e', 'feuerring_puls', () => {
  const c = window.__course, t = window.__t, f = t.ent('fr_puls');
  t.place([-5.5, 1, t.Z(3, 3)], { settle: 2 });
  for (let i = 0; i < 600 && !(f.anim === 'pulse' && f.ring > 3 && f.ring < 3.4); i++) c.step(1);
  t.face(f.base.x, f.base.z);
});
S.rad = await SHOT('w5e', 'feuerring_rad', () => {
  const c = window.__course, t = window.__t, f = t.ent('fr_rad');
  t.place([6.5, 1, t.Z(3, 2)], { settle: 30 });
  t.face(f.base.x, f.base.z);
});
S.hb = await SHOT('w5e', 'hackbeil_ausholen', () => {
  const c = window.__course, t = window.__t, p = c.player, h = t.ent('hb_jaeger');
  const fig = [-9, 1, t.Z(4, 5)];
  for (let i = 0; i < 1800 && !(h.state === 'raise' && h.stateT > 0.3); i++) { p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0); c.step(1); }
  t.face(h.pos.x, h.pos.z);
});
S.hbstuck = await SHOT('w5e', 'hackbeil_steckt', () => {
  const c = window.__course, t = window.__t, p = c.player, h = t.ent('hb_jaeger');
  for (let i = 0; i < 600 && !(h.state === 'stuck' && h.stateT > 0.3); i++) c.step(1);
  const f = h.facing({});
  p.pos.set(h.pos.x - f.x * 1.6 + f.z * 1.2, 1, h.pos.z - f.z * 1.6 - f.x * 1.2);
  t.face(h.pos.x, h.pos.z);
});
S.fl = await SHOT('w5e', 'funkenling', () => { const t = window.__t; t.place([10, 1, t.Z(4, 0.6)], { settle: 60 }); t.face(12, t.Z(4, 7)); });
S.gb = await SHOT('w5e', 'glutball', () => {
  const c = window.__course, t = window.__t, g = t.ent('gb_1');
  t.place([-11.5, 1, t.Z(5, 1.2)], { settle: 2 });
  for (let i = 0; i < 600 && !(g.state === 'up' && g.vel.y < 1 && g.vel.y > -1); i++) c.step(1);
  t.face(-11.5, t.Z(5, 7));
});
S.welle = await SHOT('w5e', 'suchkopf_welle', () => {
  const c = window.__course, t = window.__t, p = c.player, w = t.ent('welle'), licht = t.ent('licht');
  p.hurt = () => false;
  for (let i = 0; i < 1200 && w.state !== 'wave'; i++) { const s = licht.spot; p.pos.set(s.x, 1, s.z); p.vel.set(0, 0, 0); c.step(1); }
  for (let i = 0; i < 230; i++) { p.pos.set(12, 1, t.Z(5, 9)); p.vel.set(0, 0, 0); c.step(1); }
  t.face(12, t.Z(5, 13));
});
S.alt = await SHOT('w5e', 'vorhandene', () => { const t = window.__t; t.place([0, 1, t.Z(6, 1)], { settle: 120 }); t.face(0, t.Z(6, 8)); });
S.turm = await SHOT('w5e', 'werferturm', () => {
  const c = window.__course, t = window.__t, tw = t.ent('wturm');
  t.place([tw.pos.x - 2, 1, t.Z(6, 4)], { settle: 2 });
  c.step(120);
  t.face(tw.pos.x, tw.pos.z);
});
// Modelle im Einzelporträt: Zündkopf, Hackbeil, Funkenling nah
S.nah = await SHOT('w5e', 'nah_zuendkopf_hackbeil', () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.place([0, 1, t.Z(2, 2)], { settle: 2 });
  L.spawn('zuendkopf', { pos: [-1.4, 1, t.Z(2, 4)], trigger: 0, speed: 0.001, behavior: 'walk', wake: 99 });
  L.spawn('zuendkopf', { pos: [0, 1, t.Z(2, 4.5)], lit: true, fuse: 60, trigger: 0, speed: 0.001, behavior: 'walk', wake: 99 });
  L.spawn('hackbeil_pilz', { pos: [1.6, 1, t.Z(2, 4)], dir: [0, 1], hop: 0.001, sight: 0, wake: 99 });
  L.spawn('funkenling', { pos: [3, 1, t.Z(2, 4.2)], speed: 0.001, mode: 'wusel', wake: 99, color: 'pink' });
  c.step(60);
  t.face(0, t.Z(2, 5));
});
const zmax = Math.max(...Object.values(S).map((s) => s.calls));
console.log(`  Zeichenaufrufe Werkstatt: ${Object.entries(S).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${Math.round(Math.max(...Object.values(S).map((s) => s.triangles)) / 1000)} k Dreiecke`);
check(`Gegnerwerkstatt: Zeichenaufrufe < 140 (höchstens ${zmax})`, zmax < 140);

await load('0-19');
await sc(BOSS_HELPERS, ['koenig', 17]);
const B = {};
B.intro = await SHOT('w5e', 'koenig_auftritt', () => { const c = window.__course, t = window.__t; t.enter(); t.untilSafe('walk', 600, [-2, 2, 7]); c.step(30); });
B.warn = await SHOT('w5e', 'koenig_landeflaeche', () => { const t = window.__t; t.untilSafe('warn', 2400, [-2, 2, 6]); window.__course.step(40); window.__course.player.pos.set(-4.5, 2, 6); });
B.tilt = await SHOT('w5e', 'koenig_kippt', () => { const t = window.__t, b = t.boss(); for (let i = 0; i < 300 && !(b.state === 'tilt' && b.stateT > 0.42); i++) window.__course.step(1); });
B.lie = await SHOT('w5e', 'koenig_liegt', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.untilSafe('lie', 600, [-4.5, 2, 6]);
  c.step(60);
  const f = b.backField(), D = [[1, 0], [0, -1], [-1, 0], [0, 1]][b.facing];
  t.place([f.x - D[0] * 1.5, f.y + 0.1, f.z - D[1] * 1.5], { settle: 20 });
  t.face(f.x, f.z);
});
B.hit = await SHOT('w5e', 'koenig_treffer', () => { const c = window.__course, t = window.__t; t.backJump(0); c.step(20); });
B.corner = await SHOT('w5e', 'koenig_ecken', () => { const c = window.__course, t = window.__t; t.untilSafe('roar', 600, [0, 2, 7]); c.step(90); });
B.shock = await SHOT('w5e', 'koenig_schockwelle', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.untilSafe('lie', 3000, [0, 2, 7]); t.backJump(0);
  t.untilSafe('lie', 3000, [0, 2, 7]);
  c.step(40);
  c.player.pos.set(0, 2, 7);
});
B.def = await SHOT('w5e', 'koenig_besiegt', () => {
  const c = window.__course, t = window.__t;
  t.untilSafe('lie', 3000, [0, 2, 7]);
  t.backJump(0);
  c.step(110);
  c.player.pos.set(0, 2, 7);
});
const bmax = Math.max(...Object.values(B).map((s) => s.calls));
console.log(`  Zeichenaufrufe Tempel: ${Object.entries(B).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${Math.round(Math.max(...Object.values(B).map((s) => s.triangles)) / 1000)} k Dreiecke`);
check(`Tempel-Arena: Zeichenaufrufe < 140 (höchstens ${bmax})`, bmax < 140);
check('Keine Konsolenfehler (Teil 4)', errors.length === 0);
}

// __TEILE__

// __ENDE__
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
