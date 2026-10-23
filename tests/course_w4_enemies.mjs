// Kurs-Modus: Welt-4-Gegner im Gegnerzoo Canyon (0-15) und der Lavafelsen-König (0-16) deterministisch prüfen –
// Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Ameisen (Kolonne, Rundweg, Hörner nicht von oben, Träger-Ameise,
// **trägt die Figur die Wand hinauf** und über die Kante), Riesenameisen-Strom als Untergrund über dem Stachelfeld,
// Rankenschnapper (wächst/zieht zurück, Körper begehbar, Abprall vom Kopf, Stampfattacke/Feuer besiegen, hängend),
// Lavabrocken (betäuben, tragen, werfen: Zielscheibe, Druckfeld), Walzenwerfer + Stachelwalze (rollt hangabwärts,
// zerbricht an der Mauer, Stampfen zerstört sie nicht), Stachelpanzer, Springklotz (schleudert hoch), Lavafunken im Takt,
// Flatterkäfer-Rad (dreht sich), Klone; Boss nur durch geworfene Lavabrocken verwundbar, 3 Treffer, Feuerbrocken, Ende
// → Stern + Warp → Ziel, Tod setzt zurück. Zeichenaufrufe je Station; Screenshots tests/out/w4en_*.png.
// Simulation nur über window.__course.step(n) und setInput.
// Aufruf: PORT_BASE=3800 node tests/course_w4_enemies.mjs   (W4_PART=zoo|boss|shots: nur ein Teil)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4262;
const PART = process.env.W4_PART ?? 'all';
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = async (fn, arg) => page.evaluate(fn, arg);

async function load(id) {
  try { await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 60000 }); }
  catch { await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 90000 }); }
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
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
        if (p.helmet) p.dropHelmet('gone');
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
        const off = o.off ?? [0, 0];
        this.place([e.pos.x + off[0], top + (o.h ?? 1.2), e.pos.z + off[1]], { settle: 0, ...o });
        let bounced = false, hurt = false, landed = false;
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground' || p.mode === 'swim') { landed = true; if (!o.stay) break; }
          if (o.stay && landed && i > (o.stay + 2)) break;
        }
        c.setInput({});
        return { bounced, hurt, landed };
      },
      /** Seitlich (von +x) gegen e laufen; Treffer? */
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
      /** Figur an e stellen (Hüllen berühren sich) und n Schritte warten; Treffer? */
      touch(e, n = 20) {
        const p = P();
        let hurt = false;
        for (let i = 0; i < n; i++) {
          const ec = e.center();
          p.pos.set(ec.x + e.half.x + p.half.x - 0.05, ec.y - p.half.y, ec.z); p.vel.set(0, 0, 0);
          c.step(1);
          if (p.invuln > 0 || !p.big || p.dead) { hurt = true; break; }
        }
        return hurt;
      },
      hurt: () => { const p = P(); return p.invuln > 0 || !p.big || p.dead; },
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      dist: (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z),
      safe(on = true) { const p = P(); if (on) p.hurt = () => false; else delete p.hurt; },
      /** Figur zu (x, z) drehen. */
      face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
      /** Aktion drücken (ein Schritt), dann loslassen. */
      action(o = {}) { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); },
      /** Figur versetzen, ohne Getragenes loszulassen. */
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
// Gegnerzoo Canyon 0-15
// =====================================================================================================================
if (PART === 'all' || PART === 'zoo') {
await load('0-15');
console.log('Gegnerzoo Canyon 0-15');
const st0 = await sc(() => {
  const c = window.__course;
  const kinds = {};
  for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  return { kinds, n: c.level.entities.length };
});
console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
const NEED = ['ameisensoldat', 'ameisensoldat_horn', 'riesenameise', 'riesenameise_strom', 'rankenschnapper', 'lavabrocken', 'walzenwerfer',
  'stachelpanzer', 'springklotz', 'lavafunke', 'flatterkaefer_rad', 'flatterkaefer'];
check(`Alle Welt-4-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
check('Keine Konsolenfehler beim Laden', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);

// ================================================================ Ameisen am Boden
const am = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a0 = t.ent('amf'), a1 = t.ent('amf_1'), a2 = t.ent('amf_2'), h = t.ent('amh'), r = t.ent('amr'), frei = t.ent('amfrei');
  t.place([0, 1, t.Z(1, 6)], { settle: 1 });
  const s0 = [a0.s, a1.s, a2.s], f0 = { x: frei.pos.x, z: frei.pos.z };
  const L0 = a0.track.L;
  const gap = (a, b) => ((a.s - b.s) % L0 + L0) % L0;
  out.gaps0 = [+gap(a0, a1).toFixed(2), +gap(a1, a2).toFixed(2)];
  let turned = 0, minX = 99, maxX = -99;
  let yaw0 = a0.quat.clone();
  for (let i = 0; i < 2400; i++) { c.step(1); minX = Math.min(minX, a0.foot.x); maxX = Math.max(maxX, a0.foot.x); turned += a0.quat.angleTo(yaw0); yaw0 = a0.quat.clone(); }
  out.loop = { moved: +(((a0.s - s0[0]) % L0 + L0) % L0).toFixed(2), L: +L0.toFixed(2), x: [+minX.toFixed(1), +maxX.toFixed(1)], turned: +turned.toFixed(2), gaps: [+gap(a0, a1).toFixed(2), +gap(a1, a2).toFixed(2)] };
  out.frei = +Math.hypot(frei.pos.x - f0.x, frei.pos.z - f0.z).toFixed(2);
  // seitlich = Treffer
  out.side = t.touch(a1, 10);
  t.place([0, 1, t.Z(1, 6)], { settle: 20 });
  // Draufspringen: platt, Abprall
  const st = t.stomp(a2);
  out.stomp = { ...st, defeated: a2.defeated, state: a2.state };
  // Hörner-Ameise: von oben = Treffer, nicht besiegt; Feuer besiegt
  t.place([0, 1, t.Z(1, 6)], { settle: 20 });
  const sh = t.stomp(h);
  out.horn = { ...sh, defeated: h.defeated };
  t.place([0, 1, t.Z(1, 6)], { settle: 20 });
  h.onHit('fire', p);
  out.hornFire = { defeated: h.defeated, state: h.state };
  // Träger-Ameise (ride: true): landen, mitfahren, nicht besiegt
  t.place([0, 1, t.Z(1, 6)], { settle: 20 });
  const sr = t.stomp(r, { stay: 5 });
  let rode = 0, moved = 0, last = null;
  for (let i = 0; i < 240; i++) { c.step(1); if (r.riding(p)) { rode++; if (last) moved += Math.hypot(p.pos.x - last.x, p.pos.z - last.z); last = { x: p.pos.x, z: p.pos.z }; } }
  out.ride = { ...sr, rode, moved: +moved.toFixed(2), defeated: r.defeated, carried: r.carried, anim: r.riders.size ? 'carry' : '-', top: +(p.pos.y - r.foot.y).toFixed(2) };
  // Stampfattacke besiegt auch die Träger-Ameise
  c.setInput({ jump: true }); c.step(1); c.setInput({}); c.step(18);
  c.setInput({ crouch: true }); c.step(1);
  for (let i = 0; i < 80 && !r.defeated; i++) { c.setInput({}); c.step(1); if (p.mode === 'air' && p.state === 'groundpound') { p.pos.x = r.foot.x; p.pos.z = r.foot.z; } }
  out.pound = { defeated: r.defeated, state: r.state };
  return out;
});
console.log(`  Ameisen: ${JSON.stringify(am)}`);
check('Ameisen-Kolonne: läuft den Rundweg (Ecken gedreht), Abstand entlang des Pfads bleibt 1,7 m', am.loop.L > 29 && am.loop.turned > 5 && am.loop.x[1] - am.loop.x[0] > 6 && Math.abs(am.loop.gaps[0] - 1.7) < 0.05 && Math.abs(am.loop.gaps[1] - 1.7) < 0.05);
check('Freie Ameise (ohne Pfad) läuft', am.frei > 1);
check('Ameise seitlich = Treffer', am.side);
check('Ameise: Draufspringen besiegt (platt, Abprall, kein Schaden)', am.stomp.bounced && !am.stomp.hurt && am.stomp.defeated && am.stomp.state === 'squashed');
check('Hörner-Ameise: von oben = Treffer, nicht besiegt; Feuer besiegt', am.horn.hurt && !am.horn.defeated && am.hornFire.defeated);
check(`Träger-Ameise (ride: true): Figur landet, fährt mit (${am.ride.moved} m), nicht besiegt`, am.ride.rode > 200 && am.ride.moved > 2 && !am.ride.hurt && am.ride.carried >= 1 && Math.abs(am.ride.top - 0.62) < 0.08);
check('Stampfattacke besiegt die Träger-Ameise', am.pound.defeated);

// ================================================================ Ameisenwand
const aw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('amw'), h = t.ent('amwh');
  t.place([7, 1, t.Z(1, 2)], { settle: 1 });
  // warten, bis die Ameise unten an der Vorderwand hochläuft (Normale +Z, Fuß 1,2 … 2,2 m)
  let ok = false;
  for (let i = 0; i < 6000 && !ok; i++) { c.step(1); ok = a.normal.z > 0.95 && a.sdir > 0 && a.foot.y > 1.6 && a.foot.y < 2.2; }
  out.found = ok;
  out.onWall = a.onWall;
  // Figur von oben auf das obere Körperende fallen lassen
  const top = a.box.max.y;
  const cx = (a.box.min.x + a.box.max.x) / 2, cz = (a.box.min.z + a.box.max.z) / 2;
  t.place([cx, top + 0.8, cz], { settle: 0 });
  let landed = false, hurt = false;
  for (let i = 0; i < 80 && !landed; i++) {
    c.step(1);
    if (p.mode === 'air') { p.pos.x = (a.box.min.x + a.box.max.x) / 2; p.pos.z = (a.box.min.z + a.box.max.z) / 2 + 0.05; }
    if (t.hurt()) hurt = true;
    landed = a.riding(p);
  }
  out.land = { landed, hurt, defeated: a.defeated, y: +p.pos.y.toFixed(2), aY: +a.foot.y.toFixed(2) };
  // mitfahren: hinauf bis auf die Oberseite
  const y0 = p.pos.y;
  let maxY = y0, rideSteps = 0, onTopRide = 0, hurt2 = false;
  for (let i = 0; i < 800; i++) {
    c.step(1);
    if (a.riding(p)) { rideSteps++; if (a.normal.y > 0.9 && a.foot.y > 4.9) onTopRide++; }
    maxY = Math.max(maxY, p.pos.y);
    if (t.hurt()) hurt2 = true;
  }
  out.ride = { y0: +y0.toFixed(2), maxY: +maxY.toFixed(2), rideSteps, onTopRide, hurt: hurt2, defeated: a.defeated, carried: a.carried, figY: +p.pos.y.toFixed(2) };
  // Hörner-Ameise an der Wand: draufspringen = mitfahren (kein Schaden)
  ok = false;
  for (let i = 0; i < 6000 && !ok; i++) { c.step(1); ok = h.onWall && h.foot.y > 1.6 && h.foot.y < 3.2 && !h.riders.size; }
  const top2 = h.box.max.y;
  t.place([(h.box.min.x + h.box.max.x) / 2, top2 + 0.8, (h.box.min.z + h.box.max.z) / 2], { settle: 0 });
  let l2 = false, hurt3 = false;
  for (let i = 0; i < 80 && !l2; i++) {
    c.step(1);
    if (p.mode === 'air') { p.pos.x = (h.box.min.x + h.box.max.x) / 2; p.pos.z = (h.box.min.z + h.box.max.z) / 2 + (h.normal.z > 0 ? 0.05 : -0.05); }
    if (t.hurt()) hurt3 = true;
    l2 = h.riding(p);
  }
  out.horn = { found: ok, landed: l2, hurt: hurt3, defeated: h.defeated };
  return out;
});
console.log(`  Ameisenwand: ${JSON.stringify(aw)}`);
check('Ameise läuft die Wand hinauf (Normale +Z)', aw.found && aw.onWall);
check('Figur landet auf der Wand-Ameise ohne Schaden (kein Besiegen an der Wand)', aw.land.landed && !aw.land.hurt && !aw.land.defeated);
check(`Ameise trägt die Figur die Wand hinauf (${aw.ride.y0} → ${aw.ride.maxY} m) und über die Kante auf die Oberseite`, aw.ride.maxY > 5.4 && aw.ride.onTopRide > 10 && !aw.ride.hurt && !aw.ride.defeated);
check('Hörner-Ameise an der Wand: landen = mitfahren (Horn zeigt zur Seite)', aw.horn.found && aw.horn.landed && !aw.horn.hurt && !aw.horn.defeated);

// ================================================================ Riesenameisen-Strom über dem Stachelfeld
const ra = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const sp = t.ent('strom');
  const giants = () => L.entities.filter((e) => e.kind === 'riesenameise' && !e.removed);
  out.start = { alive: giants().length, spawned: sp.spawned };
  // Stachelfeld ist gefährlich
  t.place([-11.5, 1.5, t.Z(2, 7)], { settle: 0 });
  let hurtSpikes = false;
  for (let i = 0; i < 60 && !hurtSpikes; i++) { c.step(1); hurtSpikes = t.hurt(); }
  out.spikes = hurtSpikes;
  // auf eine Riesenameise nahe der Höhle (Anfang, x ≈ −6) setzen und mitfahren
  let g = null;
  for (let i = 0; i < 900 && !g; i++) { c.step(1); g = giants().find((e) => e.state === 'walk' && e.pos.x < -6.2 && e.pos.x > -8 && e.scale >= 1); }
  out.found = !!g;
  const x0 = g.pos.x;
  t.place([g.pos.x - 0.2, g.deckTop + 0.5, g.pos.z], { settle: 0 });
  let rode = 0, hurt = false, minX = 99;
  for (let i = 0; i < 600; i++) { c.step(1); if (g.riders.has(p)) rode++; if (t.hurt()) hurt = true; minX = Math.min(minX, p.pos.x); if (g.state !== 'walk') break; }
  out.ride = { rode, hurt, figX0: +x0.toFixed(2), minX: +minX.toFixed(2), y: +(p.pos.y - g.pos.y).toFixed(2), carried: g.carried };
  // Strom: neue Ameisen kommen, alte verschwinden am Ende (höchstens max)
  t.place([0, 1, t.Z(2, 7)], { settle: 1 });
  const sp0 = sp.spawned;
  let maxAlive = 0, left = 0;
  const seen = new Set();
  for (let i = 0; i < 3600; i++) { c.step(1); const gs = giants(); maxAlive = Math.max(maxAlive, gs.length); for (const e of gs) { if (e.state === 'leave' && !seen.has(e)) { seen.add(e); left++; } } }
  out.stream = { spawned: sp.spawned - sp0, maxAlive, left, max: sp.max };
  return out;
});
console.log(`  Riesenameisen: ${JSON.stringify(ra)}`);
check('Stachelfeld verletzt die Figur', ra.spikes);
check(`Riesenameisen-Strom: beim Start schon gefüllt (${st0.kinds.riesenameise} Riesenameisen)`, st0.kinds.riesenameise >= 3);
check(`Riesenameise trägt die Figur über das Stachelfeld (Deck 1,25 m, ohne Schaden, ${ra.ride.figX0} → ${ra.ride.minX})`, ra.found && ra.ride.rode > 400 && !ra.ride.hurt && ra.ride.minX < ra.ride.figX0 - 5 && Math.abs(ra.ride.y - 1.25) < 0.05);
check(`Riesenameisen kommen endlos (30 s: +${ra.stream.spawned}, verschwinden am Ende: ${ra.stream.left}, höchstens ${ra.stream.maxAlive})`, ra.stream.spawned >= 7 && ra.stream.left >= 7 && ra.stream.maxAlive <= ra.stream.max);

// ================================================================ Rankenschnapper
const rs = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const z = t.ent('rs_zyklus'), s1 = t.ent('rs_stufe1'), s2 = t.ent('rs_stufe2'), s3 = t.ent('rs_stufe3'), h = t.ent('rs_haengend');
  t.place([0, 1, t.Z(2, 2)], { settle: 1 });
  // Zyklus: wächst über den Weg und zieht sich zurück
  let gMin = 9, gMax = -9, solidMax = 0, solidMin = 99;
  for (let i = 0; i < 960; i++) { c.step(1); gMin = Math.min(gMin, z.grow); gMax = Math.max(gMax, z.grow); const n = z.boxes.filter((b) => b.shape.solid).length; solidMax = Math.max(solidMax, n); solidMin = Math.min(solidMin, n); }
  out.cycle = { gMin: +gMin.toFixed(2), gMax: +gMax.toFixed(2), solidMax, solidMin, L: +z.L.toFixed(2), tipX: +z.headC.x.toFixed(2) };
  // ausgewachsen: auf dem Körper stehen, beim Zurückziehen fällt die Figur
  for (let i = 0; i < 1200 && !(z.grow >= 1 && z.t > z.times.wait + z.times.out + 0.1); i++) c.step(1);
  const pt = z.curve.getPointAt(0.55);
  t.place([pt.x, pt.y + 0.6, pt.z], { settle: 20 });
  out.walk = { on: p.mode === 'ground' && p.ground?.owner === z, y: +p.pos.y.toFixed(2), hurt: t.hurt() };
  let fell = false;
  for (let i = 0; i < 600 && !fell; i++) { c.step(1); fell = p.ground?.owner !== z; }
  out.walk.fell = fell;
  // Kopf: seitlich = Biss; draufspringen = Abprall ohne Schaden
  for (let i = 0; i < 1200 && !(z.grow >= 1); i++) c.step(1);
  t.place([z.headC.x + 1.6, 1, z.headC.z], { settle: 1 });
  let snap = false;
  for (let i = 0; i < 30; i++) { c.step(1); if (z.snapping) snap = true; }
  out.snap = snap;
  out.bite = t.touch(z, 20);
  for (let i = 0; i < 1200 && !(z.grow >= 1); i++) c.step(1);
  t.place([0, 1, t.Z(2, 2)], { settle: 20 });
  for (let i = 0; i < 1200 && !(z.grow >= 1 && z.t > z.times.wait + z.times.out + 0.05); i++) c.step(1);
  const b = t.stomp(z, { h: 1.4 });
  out.bounce = { ...b, defeated: z.defeated, bounces: z.bounces };
  // Stampfattacke auf den Kopf besiegt
  for (let i = 0; i < 1200 && !(z.grow >= 1 && z.t > z.times.wait + z.times.out + 0.05); i++) c.step(1);
  t.place([z.headC.x, z.headC.y + 2.2, z.headC.z], { settle: 0 });
  c.step(4);
  c.setInput({ crouch: true }); c.step(1);
  for (let i = 0; i < 120 && !z.defeated; i++) { c.setInput({ crouch: true }); c.step(1); if (p.mode === 'air') { p.pos.x = z.headC.x; p.pos.z = z.headC.z; } }
  c.setInput({});
  out.pound = { defeated: z.defeated, state: z.state };
  c.step(200);
  out.gone = z.removed;
  // Stufen: auf dem mittleren stehen; Feuer besiegt die erste
  t.place([s2.curve.getPointAt(0.8).x, s2.curve.getPointAt(0.8).y + 0.5, s2.curve.getPointAt(0.8).z], { settle: 30 });
  out.step = { on: p.ground?.owner === s2, y: +p.pos.y.toFixed(2), hurt: t.hurt() };
  s1.onHit('fire', p);
  out.fire = s1.defeated;
  // hängend: wächst nur, wenn eine Figur nah ist
  t.place([0, 1, t.Z(2, 7)], { settle: 240 });
  const gFar = h.grow;
  t.place([12, 1, t.Z(2, 8.5)], { settle: 240 });
  out.hang = { far: +gFar.toFixed(2), near: +h.grow.toFixed(2), headY: +h.headC.y.toFixed(2), rootY: +h.root.y.toFixed(2) };
  return out;
});
console.log(`  Rankenschnapper: ${JSON.stringify(rs)}`);
check(`Rankenschnapper wächst über den Weg und zieht sich zurück (${rs.cycle.gMin} … ${rs.cycle.gMax}, Lauf-Quader ${rs.cycle.solidMin} … ${rs.cycle.solidMax})`, rs.cycle.gMin < 0.15 && rs.cycle.gMax > 0.99 && rs.cycle.solidMax >= 8 && rs.cycle.solidMin === 0);
check('Rankenschnapper: Körper begehbar, beim Zurückziehen fällt die Figur', rs.walk.on && !rs.walk.hurt && rs.walk.fell);
check('Rankenschnapper schnappt nach einer nahen Figur; Kopf seitlich = Biss', rs.snap && rs.bite);
check('Rankenschnapper: auf den Kopf springen = Abprall ohne Schaden', rs.bounce.bounced && !rs.bounce.hurt && !rs.bounce.defeated && rs.bounce.bounces >= 1);
check('Rankenschnapper: Stampfattacke auf den Kopf besiegt (welkt, verschwindet)', rs.pound.defeated && rs.gone);
check('Rankenschnapper als Stufe (fest): Figur steht darauf; Feuer besiegt', rs.step.on && !rs.step.hurt && rs.fire);
check(`Hängender Rankenschnapper wächst nur bei naher Figur (${rs.hang.far} → ${rs.hang.near}), Kopf unter der Decke`, rs.hang.far < 0.2 && rs.hang.near > 0.95 && rs.hang.headY < rs.hang.rootY - 0.8);

// ================================================================ Lavabrocken
const lb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('lb1'), b = t.ent('lb2'), ziel = t.ent('lb_ziel'), feld = t.ent('lbfeld');
  // b verfolgt die Figur, holt aus und stürmt
  t.place([b.pos.x + 5, 1, b.pos.z], { settle: 1 });
  t.safe(true);
  const d0 = t.dist(b, p);
  let charged = false, wind = false, dmin = 99;
  for (let i = 0; i < 480; i++) { c.step(1); if (b.state === 'windup') wind = true; if (b.state === 'charge') charged = true; dmin = Math.min(dmin, t.dist(b, p)); }
  t.safe(false);
  out.chase = { d0: +d0.toFixed(2), dmin: +dmin.toFixed(2), wind, charged };
  // seitlich (wach) = Treffer
  t.place([-9, 1, t.Z(3, 9)], { settle: 1 });
  out.side = t.touch(b, 10);
  // Draufspringen betäubt (Abprall, kein Schaden), dann harmlos
  t.place([-9, 1, t.Z(3, 6)], { settle: 20 });
  const s = t.stomp(b);
  out.stomp = { ...s, state: b.state, carryable: b.canCarry(), defeated: b.defeated };
  t.place([b.pos.x + 1.2, 1, b.pos.z], { settle: 1, yaw: Math.PI });
  out.stunTouch = t.touch(b, 10);
  // Feuer prallt ab
  b.onHit('fire', p);
  out.fire = b.defeated;
  // aufheben, zur Zielscheibe drehen und werfen → Pilzling besiegt, Brocken zerplatzt
  t.place([b.pos.x + 0.9, 1, b.pos.z], { settle: 4, yaw: Math.PI });
  t.action();
  out.pick = { holding: p.holding === b, state: b.state };
  t.moveTo([ziel.pos.x + 3.6, 1.2, ziel.pos.z]);
  t.face(ziel.pos.x, ziel.pos.z);
  c.step(1);
  t.action();
  const thrown = b.state === 'thrown';
  let zielHit = false;
  for (let i = 0; i < 120 && !b.removed; i++) { c.step(1); if (ziel.defeated) zielHit = true; }
  out.throw = { thrown, zielHit, burst: b.state === 'burst' || b.removed, bDefeated: b.defeated };
  // Druckfeld: a betäuben, aufheben, aufs Feld werfen
  t.place([a.pos.x, 1, a.pos.z + 3], { settle: 1 });
  const s2 = t.stomp(a);
  t.place([a.pos.x, 1, a.pos.z + 0.9], { settle: 4, yaw: Math.PI / 2 });
  t.face(a.pos.x, a.pos.z);
  t.action();
  const held = p.holding === a;
  t.moveTo([feld.pos.x, 1.2, feld.pos.z + 3.4]);
  t.face(feld.pos.x, feld.pos.z);
  c.step(1);
  t.action();
  for (let i = 0; i < 240; i++) c.step(1);
  out.plate = { stomped: s2.bounced, held, onPlate: a.onPlate, state: a.state, done: feld.done, count: feld.count };
  // bleibt auf dem Feld liegen (wacht nicht auf)
  c.step(1200);
  out.plate.stay = { state: a.state, onPlate: a.onPlate };
  // Stampfattacke auf den betäubten zerbricht ihn
  t.place([a.pos.x, a.pos.y + 3, a.pos.z], { settle: 0 });
  c.step(6);
  c.setInput({ crouch: true }); c.step(1);
  for (let i = 0; i < 120 && !a.defeated; i++) { c.setInput({ crouch: true }); c.step(1); if (p.mode === 'air') { p.pos.x = a.pos.x; p.pos.z = a.pos.z; } }
  c.setInput({});
  out.pound = a.defeated;
  // Lava: ein Brocken über dem Lavabecken zerschmilzt
  const lv = L.spawn('lavabrocken', { pos: [11.5, 2.5, t.Z(4, 7)], vel: [0, 0, 0] });
  for (let i = 0; i < 120 && !lv.defeated; i++) c.step(1);
  out.lava = { defeated: lv.defeated, fellOut: lv.fellOut };
  return out;
});
console.log(`  Lavabrocken: ${JSON.stringify(lb)}`);
check(`Lavabrocken verfolgt die Figur, holt aus und stürmt (${lb.chase.d0} → ${lb.chase.dmin} m)`, lb.chase.dmin < lb.chase.d0 - 2 && lb.chase.wind && lb.chase.charged);
check('Lavabrocken seitlich (wach) = Treffer', lb.side);
check('Lavabrocken: Draufspringen betäubt (Abprall, kein Schaden, tragbar, nicht besiegt), betäubt harmlos', lb.stomp.bounced && !lb.stomp.hurt && lb.stomp.state === 'stunned' && lb.stomp.carryable && !lb.stomp.defeated && !lb.stunTouch);
check('Lavabrocken: Feuer prallt ab', !lb.fire);
check('Lavabrocken: aufheben (Aktion) und werfen – Zielscheibe besiegt, Brocken zerplatzt', lb.pick.holding && lb.pick.state === 'carried' && lb.throw.thrown && lb.throw.zielHit && lb.throw.burst);
check(`Lavabrocken aufs Druckfeld geworfen löst es aus und bleibt liegen (${JSON.stringify(lb.plate.stay)})`, lb.plate.onPlate && lb.plate.done && lb.plate.stay.state === 'stunned' && lb.plate.stay.onPlate);
check('Lavabrocken: Stampfattacke auf den betäubten zerbricht ihn', lb.pound);
check('Lavabrocken: Lava = besiegt (zerschmilzt)', lb.lava.defeated && lb.lava.fellOut);

// ================================================================ Walzenwerfer und Stachelwalze
const ww = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const w = t.ent('ww_saeule'), wb = t.ent('ww_boden');
  t.place([0, 1, t.Z(3, 6)], { settle: 1 });
  const th0 = w.throws;
  const walzen = new Map();
  for (let i = 0; i < 1200; i++) {
    c.step(1);
    for (const e of L.entities) if (e.kind === 'stachelwalze' && e.owner === w && !walzen.has(e)) walzen.set(e, { maxSp: 0, maxZ: -99, broke: false, minY: 99, onRamp: 0 });
    for (const [e, r] of walzen) {
      if (e.removed) continue;
      r.maxSp = Math.max(r.maxSp, e.speed()); r.maxZ = Math.max(r.maxZ, e.pos.z); r.minY = Math.min(r.minY, e.pos.y);
      if (e.ground?.type === 'ramp') r.onRamp++;
      if (e.state === 'break') r.broke = true;
    }
  }
  const list = [...walzen.values()];
  out.saeule = { throws: w.throws - th0, walzen: list.length, first: list[0] ? { maxSp: +list[0].maxSp.toFixed(2), maxZ: +list[0].maxZ.toFixed(2), broke: list[0].broke, onRamp: list[0].onRamp } : null, wallZ: t.Z(3, 0) };
  // Stampfattacke zerstört eine Walze nicht (verletzt)
  let wz = null;
  for (let i = 0; i < 900 && !wz; i++) { c.step(1); wz = L.entities.find((e) => e.kind === 'stachelwalze' && e.state === 'roll' && e.owner === w && e.ground?.type === 'ramp' && e.pos.z > t.Z(3, 9) && e.pos.z < t.Z(3, 6)); }
  out.found = !!wz;
  if (wz) {
    t.place([wz.pos.x, wz.pos.y + 3, wz.pos.z], { settle: 0 });
    c.step(4);
    c.setInput({ crouch: true }); c.step(1);
    let hurt = false;
    for (let i = 0; i < 90 && !hurt; i++) { c.setInput({ crouch: true }); c.step(1); if (p.mode === 'air') { p.pos.x = wz.pos.x; p.pos.z = wz.pos.z; } if (t.hurt()) hurt = true; }
    c.setInput({});
    out.pound = { hurt, broke: wz.state === 'break' || wz.removed };
    wz.onHit('cannon', p);
    out.cannon = wz.state === 'break';
  }
  // Walzenwerfer am Boden: dreht sich zur Figur; Draufspringen besiegt
  t.place([wb.pos.x - 5, 1, wb.pos.z + 3], { settle: 1 });
  t.safe(true);
  for (let i = 0; i < 240; i++) c.step(1);
  t.safe(false);
  const want = Math.atan2(-(p.pos.z - wb.pos.z), p.pos.x - wb.pos.x);
  out.aim = +Math.abs(Math.atan2(Math.sin(wb.yaw - want), Math.cos(wb.yaw - want))).toFixed(2);
  for (const e of L.entities) if (e.kind === 'stachelwalze') e.kill();
  c.step(1);
  t.place([wb.pos.x - 3, 1, wb.pos.z], { settle: 1 });
  out.side = t.touch(wb, 10);
  t.place([wb.pos.x - 3, 1, wb.pos.z], { settle: 20 });
  const sw = t.stomp(wb);
  out.stomp = { ...sw, defeated: wb.defeated };
  // Säulen-Werfer: Feuer besiegt, die Säule bleibt stehen
  w.onHit('fire', p);
  c.step(120);
  const top = L.world.raycastDown(w.base.x, w.base.y + 6, w.base.z, 8);
  out.fire = { defeated: w.defeated, removed: w.removed, pillar: top ? +(top.y - w.base.y).toFixed(2) : null };
  return out;
});
console.log(`  Walzenwerfer: ${JSON.stringify(ww)}`);
check(`Walzenwerfer auf der Säule wirft im Takt (${ww.saeule.throws} Würfe in 10 s: 1,2 + 0,6 + 2,6 s)`, ww.saeule.throws >= 2);
check(`Stachelwalze rollt die Rampe hinab und wird schneller (${ww.saeule.first?.maxSp} m/s), zerbricht an der Gehegemauer`, ww.saeule.first && ww.saeule.first.maxSp > 4.6 && ww.saeule.first.broke && ww.saeule.first.maxZ > ww.saeule.wallZ - 1.2);
check('Stachelwalze: Stampfattacke zerstört sie nicht (verletzt), Kanonenkugel zerbricht sie', ww.found && ww.pound.hurt && !ww.pound.broke && ww.cannon);
check(`Walzenwerfer am Boden dreht sich zur Figur (Abweichung ${ww.aim} rad)`, ww.aim < 0.3);
check('Walzenwerfer: seitlich = Treffer, Draufspringen besiegt', ww.side && ww.stomp.bounced && !ww.stomp.hurt && ww.stomp.defeated);
check('Walzenwerfer auf der Säule: Feuer besiegt, die Säule bleibt (begehbar)', ww.fire.defeated && !ww.fire.removed && Math.abs(ww.fire.pillar - 2.6) < 0.05);

// ================================================================ Stachelpanzer und Springklotz
const sp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('sp1'), b = t.ent('sp2'), k = t.ent('sk1'), h = t.ent('sk2');
  t.place([0, 1, t.Z(4, 6)], { settle: 1 });
  let walked = 0, lx = a.pos.x;
  for (let i = 0; i < 240; i++) { c.step(1); walked += Math.abs(a.pos.x - lx); lx = a.pos.x; }
  out.walk = +walked.toFixed(2);
  const s = t.stomp(a);
  out.stomp = { ...s, defeated: a.defeated };
  t.place([0, 1, t.Z(4, 6)], { settle: 20 });
  out.side = t.touch(a, 10);
  t.place([0, 1, t.Z(4, 6)], { settle: 20 });
  a.onHit('claw', p);
  out.claw = a.defeated;
  a.onHit('fire', p);
  out.fire = a.defeated;
  // Stampfwelle daneben → Rücken, dann Berührung besiegt
  t.place([b.pos.x + 1.0, b.pos.y + 3, b.pos.z], { settle: 0 });
  t.safe(true);
  c.step(4);
  c.setInput({ crouch: true }); c.step(1);
  for (let i = 0; i < 120 && p.mode !== 'ground'; i++) { c.setInput({ crouch: true }); c.step(1); if (p.mode === 'air') { p.pos.x = b.pos.x + 1.0; p.pos.z = b.pos.z; } }
  c.setInput({});
  c.step(2);
  t.safe(false);
  out.back = b.state;
  c.step(30);
  out.backTouch = t.touch(b, 10);
  out.backDefeated = b.defeated;
  // Springklotz: von oben → hoch geschleudert (ohne Schaden)
  t.place([k.pos.x, k.pos.y + 3.2, k.pos.z], { settle: 0 });
  let maxY = 0, hurt = false;
  for (let i = 0; i < 240; i++) { c.step(1); if (p.mode === 'air' && p.vel.y < 0 && maxY < 2) { p.pos.x = k.pos.x; p.pos.z = k.pos.z; } maxY = Math.max(maxY, p.pos.y - k.pos.y); if (t.hurt()) hurt = true; }
  out.spring = { maxY: +maxY.toFixed(2), launches: k.launches, hurt };
  // Seitlich: weggestoßen, kein Schaden
  t.place([k.pos.x + 1.2, 1, k.pos.z], { settle: 1, yaw: Math.PI });
  let pushed = false, hurt2 = false;
  for (let i = 0; i < 40; i++) { c.setInput({ x: -0.6 }); c.step(1); if (p.state === 'hurt' || p.vel.x > 2) pushed = true; if (!p.big || p.dead) hurt2 = true; }
  c.setInput({});
  out.push = { pushed, hurt: hurt2 };
  // hüpfender Springklotz bewegt sich
  const hx = h.pos.x;
  c.step(600);
  out.hop = +Math.abs(h.pos.x - hx).toFixed(2);
  k.onHit('fire', p);
  out.kFire = k.defeated;
  return out;
});
console.log(`  Stachelpanzer/Springklotz: ${JSON.stringify(sp)}`);
check(`Stachelpanzer läuft (${sp.walk} m in 2 s); von oben = Treffer (nicht besiegt), seitlich = Treffer`, sp.walk > 2 && sp.stomp.hurt && !sp.stomp.defeated && sp.side);
check('Stachelpanzer: Krallen prallen ab, Feuer besiegt', !sp.claw && sp.fire);
check('Stachelpanzer: Stampfwelle daneben → auf dem Rücken, dann besiegt Berührung', sp.back === 'back' && !sp.backTouch && sp.backDefeated);
check(`Springklotz schleudert die Figur hoch (${sp.spring.maxY} m über dem Fuß, ohne Schaden)`, sp.spring.maxY > 5 && sp.spring.launches >= 1 && !sp.spring.hurt);
check('Springklotz: seitlich weggestoßen ohne Schaden; hüpfender bewegt sich; Feuer besiegt', sp.push.pushed && !sp.push.hurt && sp.hop > 1 && sp.kFire);

// ================================================================ Lavafunken im Takt
const lf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = [0, 1, 2, 3, 4].map((i) => t.ent(i ? `funke_${i}` : 'funke'));
  t.place([0, 1, t.Z(4, 7)], { settle: 1 });
  const peaks = f.map(() => []);
  const prev = f.map((e) => e.vel.y);
  let maxH = 0;
  const j0 = f.map((e) => e.jumps);
  const t0 = L.time;
  for (let i = 0; i < 1152; i++) {
    c.step(1);
    f.forEach((e, k) => { if (e.state === 'up' && prev[k] > 0 && e.vel.y <= 0) peaks[k].push(+(L.time - t0).toFixed(3)); prev[k] = e.vel.y; maxH = Math.max(maxH, e.height()); });
  }
  out.jumps = f.map((e, k) => e.jumps - j0[k]);
  out.maxH = +maxH.toFixed(2);
  out.peaks = peaks.map((x) => x.slice(0, 2));
  const per = peaks[0].length >= 2 ? peaks[0][1] - peaks[0][0] : 0;
  out.period = +per.toFixed(3);
  out.offset = +(peaks[1][0] - peaks[0][0]).toFixed(3);
  // Berührung in der Luft verletzt, in der Lava harmlos
  const e = f[0];
  for (let i = 0; i < 600 && !(e.state === 'up' && e.height() > 2); i++) c.step(1);
  t.place([e.pos.x + 0.55, e.pos.y, e.pos.z], { settle: 0 });
  p.pos.set(e.pos.x + 0.55, e.pos.y, e.pos.z); p.vel.set(0, 0, 0); p.mode = 'air';
  c.step(1);
  out.hurtUp = t.hurt();
  for (let i = 0; i < 600 && e.state !== 'down'; i++) c.step(1);
  out.downTouch = e.touch;
  return out;
});
console.log(`  Lavafunken: ${JSON.stringify(lf)}`);
check(`Lavafunken springen im Takt (2,4 s gemessen ${lf.period} s, Höhe ${lf.maxH} m, je 4 Sprünge in 9,6 s)`, Math.abs(lf.period - 2.4) < 0.02 && Math.abs(lf.maxH - 3.4) < 0.15 && lf.jumps.every((n) => n === 4));
check(`Lavafunken-Reihe versetzt (${lf.offset} s ≈ 0,14 Takt)`, Math.abs(lf.offset - 0.336) < 0.02);
check('Lavafunke: Berührung in der Luft verletzt, in der Lava harmlos', lf.hurtUp && lf.downTouch === false);

// ================================================================ Flatterkäfer-Rad
const rad = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const r = t.ent('rad');
  const m0 = t.ent('rad_0') ?? r.members[0], m3 = r.members[3];
  t.place([0, 1, t.Z(5, 7)], { settle: 1 });
  const a0 = r.angle, p0 = { x: m3.pos.x, y: m3.pos.y };
  c.step(240);
  let dev = 0;
  for (const m of r.members) dev = Math.max(dev, Math.abs(Math.hypot(m.pos.x - r.cx, m.home.y - r.cy) - r.radius));
  out.turn = { da: +(r.angle - a0).toFixed(3), omega: +r.omega.toFixed(3), moved: +Math.hypot(m3.pos.x - p0.x, m3.pos.y - p0.y).toFixed(2), dev: +dev.toFixed(3) };
  // ein Glied von oben besiegen (fällt herunter), die anderen drehen weiter
  const low = r.members.reduce((a, b) => (b.pos.y < a.pos.y ? b : a));
  const s = t.stomp(low, { h: 1.0 });
  out.stomp = { ...s, defeated: low.defeated };
  c.step(240);
  out.after = { alive: r.aliveCount, angle: +r.angle.toFixed(2) };
  return out;
});
console.log(`  Flatterkäfer-Rad: ${JSON.stringify(rad)}`);
check(`Flatterkäfer-Rad dreht sich (${rad.turn.da} rad in 2 s, ω ${rad.turn.omega}), Glieder auf dem Kreis (±${rad.turn.dev} m)`, Math.abs(rad.turn.da - rad.turn.omega * 2) < 0.02 && rad.turn.moved > 2 && rad.turn.dev < 0.01);
check('Flatterkäfer im Rad: Draufspringen besiegt, die anderen drehen weiter', rad.stomp.bounced && rad.stomp.defeated && rad.after.alive === 7);
}

// __ENDE__
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
