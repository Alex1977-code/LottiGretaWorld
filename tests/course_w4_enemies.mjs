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

// ================================================================ Vorhandene im Welt-4-Einsatz
const vh = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const w = t.ent('bumerang'), turm = t.ent('turm');
  t.place([w.pos.x - 4, 1, w.pos.z + 1], { settle: 1 });
  t.safe(true);
  let boom = 0;
  const seen = new Set();
  for (let i = 0; i < 960; i++) { c.step(1); for (const e of L.entities) if (e.kind === 'wurf_bumerang' && !seen.has(e)) { seen.add(e); boom++; } }
  t.safe(false);
  return { boom, turm: !turm.defeated && turm.alive };
});
console.log(`  Vorhandene: ${JSON.stringify(vh)}`);
check(`Bumerang-Werfer wirft im Zoo (${vh.boom} Bumerangs), Pilzlingsturm da`, vh.boom >= 2 && vh.turm);

// ================================================================ Klone: Gegner zielen auf die nächste Figur, Ameise trägt den Klon
const cl = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  if (typeof L.addClone !== 'function') return { api: false };
  const out = { api: true };
  t.place([0, 1, t.Z(3, 6)], { settle: 1 });
  p.hurt = () => false;
  const k = L.addClone(p);
  if (!k) return { api: true, clone: false };
  k.hurt = () => false;
  // Lavabrocken: Haupt-Figur auf dem Mittelweg (weit), Klon nah → läuft zum Klon
  const b = L.spawn('lavabrocken', { pos: [-15, 1, t.Z(3, 6)], charge: false });
  const kx = -11.5, kz = t.Z(3, 6);
  k.reset([kx, 1, kz], Math.PI); c.step(2);
  const d0 = t.dist(b, k);
  for (let i = 0; i < 240; i++) { p.pos.set(0, 1, t.Z(3, 6)); p.vel.set(0, 0, 0); k.pos.set(kx, 1, kz); k.vel.set(0, 0, 0); c.step(1); }
  out.brocken = { target: b.player === k, d0: +d0.toFixed(2), d1: +t.dist(b, k).toFixed(2) };
  b.kill();
  // Walzenwerfer dreht sich zum Klon
  const w = L.spawn('walzenwerfer', { pos: [11.5, 1, t.Z(3, 2)], dir: [0, 1], aim: 'player', sight: 12, first: 99 });
  k.reset([7, 1, t.Z(3, 2)], 0);
  for (let i = 0; i < 240; i++) { p.pos.set(0.5, 1, t.Z(3, 12)); p.vel.set(0, 0, 0); k.pos.set(7, 1, t.Z(3, 2)); k.vel.set(0, 0, 0); c.step(1); }
  const want = Math.atan2(-(k.pos.z - w.pos.z), k.pos.x - w.pos.x);
  out.werfer = { target: w.player === k, err: +Math.abs(Math.atan2(Math.sin(w.yaw - want), Math.cos(w.yaw - want))).toFixed(2) };
  w.kill();
  // Träger-Ameise trägt den Klon
  const a = L.spawn('ameisensoldat', { ride: true, antpath: [[-16, 1, t.Z(1, 13)], [-7, 1, t.Z(1, 13)]], speed: 1.2 });
  c.step(2);
  k.reset([a.foot.x, a.box.max.y + 0.6, a.foot.z], 0);
  p.pos.set(0, 1, t.Z(1, 6));
  let rode = 0;
  for (let i = 0; i < 240; i++) { p.pos.set(0, 1, t.Z(1, 6)); p.vel.set(0, 0, 0); c.step(1); if (a.riding(k)) rode++; }
  out.ameise = { rode, riders: a.riders.size, defeated: a.defeated };
  // Rankenschnapper schnappt nach dem Klon
  const r = t.ent('rs_stufe3');
  k.reset([r.headC.x + 1.3, 1, r.headC.z], Math.PI);
  let snap = false;
  for (let i = 0; i < 60; i++) { p.pos.set(0, 1, t.Z(1, 6)); k.pos.set(r.headC.x + 1.3, r.headC.y - 0.6, r.headC.z); k.vel.set(0, 0, 0); c.step(1); if (r.snapping) snap = true; }
  out.ranke = snap;
  delete p.hurt;
  c.squad?.clear?.();
  return out;
});
console.log(`  Klone: ${JSON.stringify(cl)}`);
check('Klon: Lavabrocken läuft zur nächsten Figur (Klon), Walzenwerfer zielt auf ihn', cl.api && cl.brocken.target && cl.brocken.d1 < cl.brocken.d0 - 1.5 && cl.werfer.target && cl.werfer.err < 0.3);
check('Klon: Träger-Ameise trägt den Klon, Rankenschnapper schnappt nach ihm', cl.ameise.rode > 200 && !cl.ameise.defeated && cl.ranke);
check('Keine Konsolenfehler (Zoo-Prüfungen)', errors.length === 0);

// ================================================================ Bilder und Kennzahlen (Zoo, frisch geladen)
await load('0-15');
const calls = {};
const Zr = (r, dz) => -8 - 20 * (r - 1) - dz;
calls.ameisen = await SHOT('w4en', 'ameisen', () => { const c = window.__course, t = window.__t; t.place([-5.5, 1, t.Z(1, -1)], { settle: 1 }); c.step(240); });
calls.wand = await SHOT('w4en', 'ameisenwand', () => {
  const c = window.__course, t = window.__t, p = c.player, a = t.ent('amw');
  let ok = false;
  for (let i = 0; i < 6000 && !ok; i++) { c.step(1); ok = a.normal.z > 0.95 && a.sdir > 0 && a.foot.y > 1.6 && a.foot.y < 2.2; }
  t.place([(a.box.min.x + a.box.max.x) / 2, a.box.max.y + 0.8, (a.box.min.z + a.box.max.z) / 2 + 0.05], { settle: 0 });
  for (let i = 0; i < 80 && !a.riding(p); i++) { c.step(1); if (p.mode === 'air') { p.pos.x = (a.box.min.x + a.box.max.x) / 2; p.pos.z = (a.box.min.z + a.box.max.z) / 2 + 0.05; } }
  c.step(150);
});
calls.riesen = await SHOT('w4en', 'riesenameisen', () => {
  const c = window.__course, t = window.__t, L = c.level;
  let g = null;
  for (let i = 0; i < 900 && !g; i++) { c.step(1); g = L.entities.find((e) => e.kind === 'riesenameise' && e.state === 'walk' && e.pos.x < -6.2 && e.pos.x > -8 && e.scale >= 1); }
  t.place([g.pos.x - 0.2, g.deckTop + 0.5, g.pos.z], { settle: 0 });
  c.step(300);
});
calls.ranken = await SHOT('w4en', 'rankenschnapper', () => {
  const c = window.__course, t = window.__t, z = t.ent('rs_zyklus');
  t.place([12, 1, t.Z(2, 9)], { settle: 1 });
  for (let i = 0; i < 1200 && !(z.grow >= 1 && z.t > z.times.wait + z.times.out + 0.3); i++) c.step(1);
});
calls.lava = await SHOT('w4en', 'lavabrocken', () => {
  const c = window.__course, t = window.__t, p = c.player, b = t.ent('lb2');
  t.stomp(b);
  t.place([b.pos.x + 0.9, 1, b.pos.z], { settle: 4, yaw: Math.PI });
  t.action();
  c.step(30);
});
calls.walzen = await SHOT('w4en', 'walzenwerfer', () => {
  const c = window.__course, t = window.__t;
  t.place([5.5, 1, t.Z(3, 2)], { settle: 1 });
  const w = t.ent('ww_saeule');
  for (let i = 0; i < 1200; i++) { c.step(1); if (w.state === 'throw' && w.stateT > 0.5) break; }
  c.step(110);
});
calls.panzer = await SHOT('w4en', 'stachelpanzer_springklotz', () => {
  const c = window.__course, t = window.__t, p = c.player, k = t.ent('sk1');
  t.place([k.pos.x, k.pos.y + 3.2, k.pos.z], { settle: 0 });
  for (let i = 0; i < 70; i++) { c.step(1); if (p.mode === 'air' && p.vel.y < 0) { p.pos.x = k.pos.x; p.pos.z = k.pos.z; } }
});
calls.funken = await SHOT('w4en', 'lavafunken', () => {
  const c = window.__course, t = window.__t, f = t.ent('funke');
  t.place([5.5, 1, t.Z(4, 1)], { settle: 1 });
  for (let i = 0; i < 600 && !(f.state === 'up' && f.vel.y < 1 && f.vel.y > -1); i++) c.step(1);
  c.step(30);
});
calls.rad = await SHOT('w4en', 'kaefer_rad', () => { const c = window.__course, t = window.__t; t.place([-5.5, 1, t.Z(5, 1)], { settle: 1 }); c.step(120); });
calls.vorhandene = await SHOT('w4en', 'vorhandene', () => { const c = window.__course, t = window.__t; t.place([5.5, 1, t.Z(5, 1)], { settle: 1 }); c.step(240); });
const maxCalls = Math.max(...Object.values(calls).map((s) => s.calls));
const maxTri = Math.max(...Object.values(calls).map((s) => s.triangles));
console.log(`  Zeichenaufrufe je Station: ${Object.entries(calls).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${maxCalls}, ${Math.round(maxTri / 1000)} k Dreiecke`);
check(`Gegnerzoo Canyon: Zeichenaufrufe < 140 je Station (höchstens ${maxCalls})`, maxCalls < 140);
const step = await sc(() => {
  const c = window.__course, L = c.level;
  const t0 = performance.now();
  for (let i = 0; i < 240; i++) L.step(1 / 120, {});
  return { ms: +((performance.now() - t0) / 240).toFixed(3), n: L.entities.length };
});
console.log(`  Simulation: ${step.ms} ms je Schritt (${step.n} Entitäten)`);
}

// =====================================================================================================================
// Lavafelsen-König 0-16
// =====================================================================================================================
const BOSS_HELPERS = ([id, startZ]) => {
  const c = window.__course, t = window.__t, L = c.level;
  t.boss = () => t.ent(id);
  t.arch = () => c.state().archetype;
  t.enter = () => {
    t.place([0, 2, startZ], { settle: 2 });
    for (let i = 0; i < 480 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  t.until = (s, n = 3000) => { const b = t.boss(); let i = 0; for (; i < n && b.state !== s; i++) c.step(1); return i; };
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._w4) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._w4 = true; }
  /** Bis Zustand s; Figur unverwundbar an pos (null = bleibt). */
  t.untilSafe = (s, n = 3000, pos = null) => {
    const b = t.boss(), p = c.player;
    p.hurt = () => false;
    let i = 0;
    for (; i < n && b.state !== s; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); }
    delete p.hurt;
    return i;
  };
  t.brocken = () => L.entities.filter((e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated && e.owner === t.boss());
  /** Einen gerufenen Lavabrocken betäuben und aufheben → Brocken | null. */
  t.grab = () => {
    const p = c.player;
    let br = null;
    p.hurt = () => false;
    for (let i = 0; i < 1200 && !br; i++) { br = t.brocken().find((e) => e.grounded && (e.state === 'walk' || e.state === 'chase' || e.state === 'stunned')) ?? null; if (!br) c.step(1); }
    if (!br) { delete p.hurt; return null; }
    if (br.state !== 'stunned') t.stomp(br);
    p.hurt = () => false;
    // zur Arenamitte hin danebenstellen und aufheben
    const ax = -br.pos.x, az = -br.pos.z, al = Math.hypot(ax, az) || 1;
    t.place([br.pos.x + (ax / al) * 0.9, br.pos.y, br.pos.z + (az / al) * 0.9], { settle: 2 });
    p.hurt = () => false;
    if (br.state !== 'stunned') br.stun();
    t.face(br.pos.x, br.pos.z);
    t.action();
    delete p.hurt;
    return p.holding === br ? br : null;
  };
  /** Getragenen Brocken aus dist m auf den König werfen (wartet auf 'rest'); → { thrown, hit } */
  t.throwAtBoss = (dist = 4, wait = 'rest') => {
    const p = c.player, b = t.boss(), br = p.holding;
    if (!br) return { thrown: false };
    p.hurt = () => false;
    for (let i = 0; i < 3000 && b.state !== wait; i++) { p.vel.set(0, 0, 0); c.step(1); }
    const ax = -b.pos.x, az = -b.pos.z, al = Math.hypot(ax, az) || 1;
    const hp0 = b.hp;
    t.moveTo([b.pos.x + (ax / al) * dist, b.pos.y + 0.2, b.pos.z + (az / al) * dist], 6);
    t.face(b.pos.x, b.pos.z);
    c.step(1);
    t.action();
    const thrown = br.state === 'thrown' || br.removed;
    for (let i = 0; i < 120 && !br.removed && br.state === 'thrown'; i++) c.step(1);
    delete p.hurt;
    return { thrown, hit: b.hp < hp0, hp: b.hp, state: b.state, br: br.state };
  };
};

if (PART === 'all' || PART === 'boss') {
await load('0-16');
await sc(BOSS_HELPERS, ['koenig', 9.5]);
console.log('Lavafelsen-König 0-16');
const kb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.boss();
  out.before = { state: b.state, hp: b.hp };
  const a = t.enter();
  out.start = { started: a.started, state: b.state, hud: a.hud?.boss?.hp };
  // Ruf: Lavabrocken springen aus dem Boden
  t.untilSafe('roll', 1200, [0, 2, 8]);
  c.step(60);
  out.summon = { summoned: b.summoned, brocken: t.brocken().length, airborne: t.brocken().filter((e) => e.state === 'air').length };
  // Rollen: auf die Figur zu (begrenzt lenkend), Berührung verletzt
  t.untilSafe('rest', 1200, [0, 2, 8]);
  t.untilSafe('roll', 1500, [0, 2, 8]);
  const d0 = Math.hypot(b.pos.x - 6, b.pos.z - 6);
  p.hurt = () => false;
  for (let i = 0; i < 90; i++) { p.pos.set(6, 2, 6); p.vel.set(0, 0, 0); c.step(1); }
  delete p.hurt;
  out.roll = { d0: +d0.toFixed(2), d1: +Math.hypot(b.pos.x - 6, b.pos.z - 6).toFixed(2), state: b.state };
  for (const e of t.brocken()) e.kill();
  c.step(1);
  t.place([b.pos.x + b.half.x + 0.6, 2, b.pos.z], { settle: 0 });
  let hurtRoll = false;
  for (let i = 0; i < 20 && !hurtRoll; i++) { const bc = b.center(); p.pos.set(bc.x + b.half.x + p.half.x - 0.05, b.pos.y, bc.z); p.vel.set(0, 0, 0); c.step(1); hurtRoll = t.hurt(); }
  out.rollHurt = hurtRoll;
  // Draufspringen: Abprall ohne Schaden; Feuer, Kanonenkugel, Stern prallen ab
  t.untilSafe('rest', 1500, [0, 2, 8]);
  const s = t.stomp(b, { h: 0.6 });
  b.onHit('fire', p); b.onHit('cannon', p); b.onHit('star', p); b.onHit('throw', { kind: 'rollpilz', pos: b.pos });
  out.stomp = { ...s, hp: b.hp };
  // Wurf eines Lavabrockens: Treffer (3 → 2), Wirbel, Feuerbrocken
  for (const e of L.entities) if (e.kind === 'feuerbrocken') e.kill();
  const g1 = t.grab();
  out.grab1 = { ok: !!g1, holding: !!p.holding };
  const w1 = t.throwAtBoss(4);
  out.hit1 = { ...w1, hud: t.arch().hud?.boss?.hp };
  t.untilSafe('spin', 200, [0, 2, 9.5]);
  out.spinState = b.state;
  t.untilSafe('summon', 600, [0, 2, 9.5]);
  out.feuer1 = { total: b.feuer, alive: t.count('feuerbrocken') };
  // Feuerbrocken brennen und verlöschen; Berührung verletzt
  const fb = L.entities.find((e) => e.kind === 'feuerbrocken' && e.state === 'burn');
  out.fbFound = !!fb;
  if (fb) {
    t.place([fb.pos.x + 0.55, fb.pos.y, fb.pos.z], { settle: 0 });
    let hurtF = false;
    for (let i = 0; i < 10 && !hurtF; i++) { p.pos.set(fb.pos.x + fb.half.x + p.half.x - 0.05, fb.pos.y, fb.pos.z); p.vel.set(0, 0, 0); c.step(1); hurtF = t.hurt(); }
    out.fbHurt = hurtF;
  }
  t.untilSafe('rest', 1500, [0, 2, 9.5]);
  p.hurt = () => false; c.step(400); delete p.hurt;
  out.feuerOut = t.count('feuerbrocken');
  // nicht verwundbar im Wirbel: Wurf in 'spin' zählt nicht
  const g2 = t.grab();
  const w2 = t.throwAtBoss(4, 'rest');
  out.hit2 = { ...w2, ok: !!g2 };
  t.untilSafe('spin', 200, [0, 2, 9.5]);
  const g3 = t.grab();
  const hpSpin = b.hp;
  let w3 = { thrown: false };
  if (g3 && b.state === 'spin') {
    const ax = -b.pos.x, az = -b.pos.z, al = Math.hypot(ax, az) || 1;
    p.hurt = () => false;
    t.moveTo([b.pos.x + (ax / al) * 4, b.pos.y + 0.2, b.pos.z + (az / al) * 4], 4);
    t.face(b.pos.x, b.pos.z); c.step(1); t.action();
    for (let i = 0; i < 120 && !g3.removed && g3.state === 'thrown'; i++) c.step(1);
    delete p.hurt;
    w3 = { thrown: true, state: b.state, hp: b.hp };
  }
  out.spinThrow = { ...w3, hp0: hpSpin, ok: !!g3 };
  // dritter Treffer
  t.untilSafe('rest', 3000, [0, 2, 9.5]);
  const g4 = p.holding ?? t.grab();
  const w4 = t.throwAtBoss(4, 'rest');
  out.hit3 = { ...w4, ok: !!g4, defeated: b.defeated };
  out.endless = { summoned: b.summoned, summons: b.summons };
  t.untilSafe('gone', 1500, [0, 2, 9.5]);
  c.step(2);
  out.feuerTotal = b.feuer;
  out.banners = t.banners.slice();
  out.gone = { state: b.state, visible: b.visible, won: t.arch().won, warp: t.ent('warp_sieg').hidden, star: t.count('star'), brocken: t.brocken().length + L.entities.filter((e) => e.kind === 'lavabrocken' && !e.removed && !e.defeated).length };
  // Stern einsammeln, Warp-Box → Plateau → Zielmast
  const st = L.entities.find((e) => e.kind === 'star' && !e.removed);
  if (st) { t.place([st.pos.x, st.pos.y, st.pos.z], { settle: 30 }); }
  out.starTaken = !L.entities.some((e) => e.kind === 'star' && !e.removed);
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 800; i++) { c.step(1); if (p.pos.z < -30 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 1200 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 1800 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  return out;
});
console.log(`  Lavafelsen-König: ${JSON.stringify(kb)}`);
check('Lavafelsen-König: Kampf beginnt beim Betreten (Auftritt, Lebensleiste 3/3)', kb.before.state === 'wait' && kb.start.started && kb.start.state === 'intro' && kb.start.hud === 3);
check(`Er ruft Lavabrocken (${kb.summon.summoned} springen aus dem Boden)`, kb.summon.summoned >= 2 && kb.summon.brocken >= 2);
check(`Er rollt auf die Figur zu (${kb.roll.d0} → ${kb.roll.d1} m); Berührung im Rollen verletzt`, kb.roll.d1 < kb.roll.d0 - 2 && kb.rollHurt);
check('Draufspringen: Abprall ohne Schaden; Feuer, Kanonenkugel, Stern, anderer Wurf zählen nicht', kb.stomp.bounced && !kb.stomp.hurt && kb.stomp.hp === 3);
check('Geworfener Lavabrocken trifft (3 → 2), Lebensleiste folgt; danach wirbelt er', kb.grab1.ok && kb.hit1.thrown && kb.hit1.hit && kb.hit1.hp === 2 && kb.hit1.hud === 2 && kb.spinState === 'spin');
check(`Wirbel verstreut Feuerbrocken (${kb.feuer1.total}), sie verletzen und verlöschen`, kb.feuer1.total === 6 && kb.fbFound && kb.fbHurt && kb.feuerOut === 0);
check('Zweiter Wurf trifft (2 → 1); Wurf während des Wirbelns zählt nicht', kb.hit2.ok && kb.hit2.hit && kb.hit2.hp === 1 && kb.spinThrow.ok && kb.spinThrow.thrown && kb.spinThrow.hp === kb.spinThrow.hp0);
check(`Dritter Treffer besiegt ihn; Feuerbrocken 6 + 8 + 10 = ${kb.feuerTotal}; ruft endlos (${kb.endless.summoned} Brocken in ${kb.endless.summons} Rufen)`, kb.hit3.ok && kb.hit3.hit && kb.hit3.hp === 0 && kb.hit3.defeated && kb.feuerTotal === 24 && kb.endless.summons >= 4);
check(`Eigene Ansagen (${kb.banners.join(' | ')}), keine fremden`, kb.banners.includes('Wirf Lavabrocken auf ihn!') && kb.banners.includes('Er rollt schneller!') && kb.banners.includes('Jetzt wird es heiß!') && !kb.banners.some((x) => /Feuerspur|wütend|Bomben/.test(x)));
check('Sieg: gone, Archetyp gewinnt, Stern erscheint, Warp-Box sichtbar, gerufene Brocken zerfallen', kb.gone.state === 'gone' && !kb.gone.visible && kb.gone.won && kb.gone.warp === false && kb.gone.star === 1 && kb.gone.brocken === 0);
check('Stern einsammeln, Warp-Box führt zum Zielplateau, Zielmast beendet das Level', kb.starTaken && kb.finish.arrived && kb.finish.finished);

// Klon: König rollt zur nächsten Figur; Tod setzt den Kampf zurück
await load('0-16');
await sc(BOSS_HELPERS, ['koenig', 9.5]);
const kk = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const b = t.boss();
  t.enter();
  const out = {};
  if (typeof L.addClone === 'function') {
    t.untilSafe('rest', 1500, [0, 2, 9]);
    p.hurt = () => false;
    const k = L.addClone(p);
    if (k) {
      k.hurt = () => false;
      for (let i = 0; i < 1500 && b.state !== 'roll'; i++) { p.pos.set(-8, 2, 6); k.pos.set(7, 2, -4); p.vel.set(0, 0, 0); k.vel.set(0, 0, 0); c.step(1); }
      const d0 = Math.hypot(b.pos.x - 7, b.pos.z + 4);
      for (let i = 0; i < 90; i++) { p.pos.set(-8, 2, 6); k.pos.set(7, 2, -4); p.vel.set(0, 0, 0); k.vel.set(0, 0, 0); c.step(1); }
      out.clone = { target: b.player === k, d0: +d0.toFixed(2), d1: +Math.hypot(b.pos.x - 7, b.pos.z + 4).toFixed(2) };
    }
    delete p.hurt;
  }
  // Tod im Kampf: alles zurück
  t.untilSafe('rest', 1500, [0, 2, 9]);
  const g = t.grab();
  t.throwAtBoss(4);
  out.hpBefore = b.hp;
  t.untilSafe('spin', 300, [0, 2, 9]);
  c.step(60);
  c.squad?.clear?.();
  p.die('hit');
  for (let i = 0; i < 1200 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  c.step(5);
  out.reset = { state: b.state, hp: b.hp, brocken: L.entities.filter((e) => e.kind === 'lavabrocken' && !e.removed).length, feuer: t.count('feuerbrocken'), started: t.arch().started, deaths: t.arch().deaths, x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2) };
  return out;
});
console.log(`  Lavafelsen-König Klon/Tod: ${JSON.stringify(kk)}`);
check('Lavafelsen-König rollt zur nächsten Figur (Klon)', !!kk.clone && kk.clone.target && kk.clone.d1 < kk.clone.d0 - 2);
check('Tod im Kampf: Neustart, König wieder 3/3 am Startplatz, Brocken und Feuerbrocken weg, Kampf von vorn', kk.hpBefore === 2 && kk.reset.state === 'wait' && kk.reset.hp === 3 && kk.reset.brocken === 0 && kk.reset.feuer === 0 && !kk.reset.started && kk.reset.deaths === 1 && kk.reset.z === -3);
check('Keine Konsolenfehler (Lavafelsen-König)', errors.length === 0);
}

// __ENDE__
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
