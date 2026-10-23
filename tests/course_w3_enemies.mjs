// Kurs-Modus: Welt-3-Gegner im Gegnerzoo Schnee (0-10), Schattenläuferin (0-11) und Schlangenkönig (0-12)
// deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner (Schneesäule verliert Segmente,
// Eisläufer gibt Schlittschuh und trägt, Spuk folgt nur bei abgewandtem Blick und löst sich im Licht auf,
// Kreisgeist-Ring, Funken, Hüpfquallen im Takt, Riesenprojektil zum Mitfahren, Reifen-Pilzling, Fische, Stachelwand im
// Takt, Rammfisch), Klone (level.addClone), beide Bosse vollständig (Doppelgänger 2/3/5, nur das Original trifft;
// Teller-Weg nach oben, Teller brechen, 3 Treffer, Ende); Zeichenaufrufe je Station. Screenshots tests/out/w3en_*.png.
// Simulation nur über window.__course.step(n) und setInput.
// Aufruf: PORT_BASE=3800 node tests/course_w3_enemies.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4231;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = async (fn, arg) => {
  const t0 = Date.now();
  const r = await page.evaluate(fn, arg);
  if (process.env.W3_TIME && Date.now() - t0 > 3000) console.log(`    (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return r;
};

async function load(id) {
  // unter Last (parallele Läufe) einmal wiederholen
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
      /** z der Zoo-Reihe r, dz Meter hinter ihrer Vorderkante (wie Z in levels/w0/0-10.js). */
      Z: (r, dz) => -8 - 20 * (r - 1) - dz,
      ent: (id) => L.named.get(id),
      /** Figur setzen (groß, ohne Power-up/Helm, nichts in der Hand) und landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        c.squad?.clear?.();
        p.setHero(o.hero ?? 'lotti');
        p.dead = false;
        p.removedFigure = null; p.hidden = false;
        p.holding = null;
        if (p.helmet && !o.keepHelmet) p.dropHelmet('gone');
        p.helmetCooldown = 0;
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
        let bounced = false, hurt = false;
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground' || p.mode === 'swim') break;
        }
        c.setInput({});
        return { bounced, hurt };
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
      /** Blick der Figur zu Punkt (x, z) bzw. weg davon. */
      face(x, z, away = false) { const p = P(); let a = Math.atan2(-(z - p.pos.z), x - p.pos.x); if (away) a += Math.PI; p.yaw = a; },
      /** Figur unverwundbar machen (für Ablauf-Messungen) bzw. wieder normal. */
      safe(on = true) { const p = P(); if (on) p.hurt = () => false; else delete p.hurt; },
      calm() { for (const e of L.entities) if (e.kind === 'riesenkanone') e.setActive(false); },
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
  // unter Last (parallele Läufe) einmal wiederholen
  try { await page.screenshot({ path: `${OUT}${prefix}_${name}.png`, timeout: 60000 }); }
  catch { await page.screenshot({ path: `${OUT}${prefix}_${name}.png`, timeout: 120000 }); }
  return sc(() => window.__course.stats());
};

// =====================================================================================================================
// Gegnerzoo Schnee 0-10
// =====================================================================================================================
await load('0-10');
console.log('Gegnerzoo Schnee 0-10');
const st0 = await sc(() => {
  const c = window.__course;
  const kinds = {};
  for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  window.__t.calm();
  return { kinds, clones: typeof c.level.addClone === 'function', skates: c.level.hasKind('schlittschuh') };
});
const NEED = ['schneesaeule', 'pilzling_eis', 'pilzling_reifen', 'spuk', 'kreisgeist', 'kreisgeist_kreis', 'kreisgeist_glied', 'funkenlaeufer',
  'funkenkaefer', 'huepfqualle', 'riesenkanone', 'flossling', 'stachelfisch', 'rammfisch'];
check(`Alle Welt-3-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'}), Ring mit ${st0.kinds.kreisgeist_glied} Gliedern`, NEED.every((k) => st0.kinds[k] > 0) && st0.kinds.kreisgeist_glied === 8);
check('Keine Konsolenfehler beim Laden', errors.length === 0);

// ================================================================ Schneesäule
const ss = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const out = {};
  const k = t.ent('ss_klein'), b = t.ent('ss_bahn'), j = t.ent('ss_jagd');
  out.side = t.side(k).hurt;
  // Draufspringen: je ein Segment, Kopf sinkt nach, Abprall
  const h0 = b.half.y * 2;
  const s1 = t.stomp(b);
  out.s1 = { ...s1, seg: b.segments, h: +(b.half.y * 2).toFixed(2), h0: +h0.toFixed(2), state: b.state };
  c.step(60);
  const s2 = t.stomp(b);
  out.s2 = { ...s2, seg: b.segments };
  c.step(60);
  b.onHit('tail', p);            // Schwanzhieb (unbekannte Art) = normaler Treffer
  out.tail = b.segments;
  c.step(60);
  const s3 = t.stomp(b);
  out.s3 = { ...s3, seg: b.segments, defeated: b.defeated, state: b.state };
  // Verfolger: kommt näher
  t.place([j.pos.x + 4, 1, j.pos.z], { settle: 1 });
  const d0 = t.dist(j, p);
  c.step(240);
  out.chase = { d0: +d0.toFixed(2), d1: +t.dist(j, p).toFixed(2), state: j.state };
  // Feuer schmilzt die ganze Säule
  j.onHit('fire', p);
  out.fire = { defeated: j.defeated, melted: j.melted, state: j.state };
  // Kleine Säule: Tatzenhieb nimmt ein Segment
  k.onHit('claw', p);
  out.claw = k.segments;
  // Schwanzhieb des Gleitblatts (Motor: onHit('claw') mit attackInfo.style 'tail') nimmt ebenfalls eins
  c.step(60);
  t.place([k.pos.x + 1.0, 1, k.pos.z], { settle: 1, yaw: Math.PI });
  p.setPower('gleitblatt');
  t.safe(true);
  const sg0 = k.segments;
  c.setInput({ action: true }); c.step(1);
  const style = p.attackInfo?.style ?? null;
  c.setInput({}); c.step(30);
  t.safe(false);
  out.tailReal = { before: sg0, after: k.segments, style };
  return out;
});
console.log(`  Schneesäule: ${JSON.stringify(ss)}`);
check('Schneesäule: seitlich = Treffer (Stacheln)', ss.side);
check('Schneesäule: Draufspringen nimmt ein Segment (4 → 3, Kopf sinkt, Abprall, kein Schaden)', ss.s1.seg === 3 && ss.s1.bounced && !ss.s1.hurt && ss.s1.h < ss.s1.h0 - 0.3);
check('Schneesäule: zweites Draufspringen → 2, Schwanzhieb (unbekannte Art) → 1, letztes Draufspringen besiegt', ss.s2.seg === 2 && ss.tail === 1 && ss.s3.defeated && ss.s3.seg === 0);
check('Schneesäule (chase) folgt der Figur', ss.chase.d1 < ss.chase.d0 - 1 && ss.chase.state === 'chase');
check('Schneesäule: Feuer schmilzt die ganze Säule', ss.fire.defeated && ss.fire.melted && ss.fire.state === 'melt');
check('Schneesäule: Tatzenhieb nimmt ein Segment (3 → 2)', ss.claw === 2);
check(`Schneesäule: Schwanzhieb des Gleitblatts (${ss.tailReal.style}) nimmt ein Segment (${ss.tailReal.before} → ${ss.tailReal.after})`, ss.tailReal.style === 'tail' && ss.tailReal.before === 2 && ss.tailReal.after === 1);

// ================================================================ Eisläufer-Pilzling
const ei = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const k = t.ent('eis_kreis'), s = t.ent('eis_slalom'), j = t.ent('eis_jagd'), r = t.ent('eis_reit');
  t.place([0, 1, t.Z(1, 7)], { settle: 1 });
  // Kreis: schnell auf Eis, Bögen (Gier dreht sich), bleibt auf der Eisfläche
  let maxSp = 0, ice = 0, yaw0 = k.yaw, turned = 0, minX = 99, maxX = -99, minZ = 99, maxZ = -99;
  for (let i = 0; i < 600; i++) {
    c.step(1);
    const sp = Math.hypot(k.vel.x, k.vel.z);
    maxSp = Math.max(maxSp, sp); if (k.onIce) ice++;
    turned += Math.abs(Math.atan2(Math.sin(k.yaw - yaw0), Math.cos(k.yaw - yaw0))); yaw0 = k.yaw;
    minX = Math.min(minX, k.pos.x); maxX = Math.max(maxX, k.pos.x); minZ = Math.min(minZ, k.pos.z); maxZ = Math.max(maxZ, k.pos.z);
  }
  out.kreis = { maxSp: +maxSp.toFixed(2), ice, turned: +turned.toFixed(2), x: [+minX.toFixed(1), +maxX.toFixed(1)], z: [+minZ.toFixed(1), +maxZ.toFixed(1)], anim: k.modelState().anim };
  // Slalom: Gier pendelt
  let sMin = 9, sMax = -9;
  for (let i = 0; i < 480; i++) { c.step(1); sMin = Math.min(sMin, s.heading - s.baseHeading); sMax = Math.max(sMax, s.heading - s.baseHeading); }
  out.slalom = { span: +(sMax - sMin).toFixed(2), alive: !s.defeated };
  // Verfolger: sieht die Figur und kommt in Bögen näher
  t.place([j.pos.x - 3.5, 1.12, j.pos.z], { settle: 1 });
  t.safe(true);
  let seen = false, dmin = 99;
  for (let i = 0; i < 360; i++) { c.step(1); if (j.state === 'chase' || j.state === 'alert') seen = true; dmin = Math.min(dmin, t.dist(j, p)); }
  t.safe(false);
  out.jagd = { seen, dmin: +dmin.toFixed(2) };
  // Draufspringen: besiegt, Schlittschuh bleibt zurück
  const sk0 = t.count('schlittschuh');
  const st = t.stomp(k);
  c.step(2);
  out.stomp = { ...st, defeated: k.defeated, state: k.state, skate: k.skateDrop, skates: t.count('schlittschuh') - sk0 };
  // der Schlittschuh lässt sich anziehen (Motor: Berührung → Figur steigt hinein)
  const sk = k.skateEntity;
  if (sk && !sk.removed) {
    t.place([sk.pos.x, sk.pos.y + 0.3, sk.pos.z], { settle: 20 });
    out.wear = p.skate === sk;
    if (p.skate) { p.skate = null; sk.release?.(p, 'gone'); }
  }
  // Seitlich = Treffer
  t.place([s.pos.x + 1.2, s.pos.y, s.pos.z], { settle: 0 });
  out.side = t.touch(s);
  // Reit-Eisläufer: landen, mitfahren, Stampfen besiegt (Schlittschuh)
  t.place([r.pos.x, r.pos.y + 2.2, r.pos.z], { settle: 0 });
  let rode = 0, moved = 0, last = null, hurtR = false;
  for (let i = 0; i < 240; i++) {
    if (p.mode === 'air' && !rode) { p.pos.x = r.pos.x; p.pos.z = r.pos.z; }
    c.step(1);
    if (t.hurt()) hurtR = true;
    if (r.riding(p)) { rode++; if (last) moved += Math.hypot(p.pos.x - last.x, p.pos.z - last.z); last = { x: p.pos.x, z: p.pos.z }; }
  }
  out.ride = { rode, moved: +moved.toFixed(2), hurt: hurtR, onTop: +(p.pos.y - r.pos.y).toFixed(2) };
  c.setInput({ jump: true }); c.step(1); c.setInput({}); c.step(25);
  c.setInput({ crouch: true }); c.step(1);
  for (let i = 0; i < 90 && !r.defeated; i++) { c.setInput({}); c.step(1); }
  out.pound = { defeated: r.defeated, skate: r.skateDrop };
  return out;
});
console.log(`  Eisläufer: ${JSON.stringify(ei)}`);
check(`Eisläufer gleitet schnell auf Eis (${ei.kreis.maxSp} m/s, Animation ${ei.kreis.anim}) in Bögen und bleibt auf der Eisfläche`, ei.kreis.maxSp > 3.5 && ei.kreis.ice > 500 && ei.kreis.turned > 4 && ei.kreis.x[0] > 4.5 && ei.kreis.x[1] < 18.5 && ei.kreis.anim === 'skate');
check('Eisläufer (Slalom) fährt Bögen um die Grundrichtung', ei.slalom.span > 0.8 && ei.slalom.alive);
check('Eisläufer (chase) bemerkt die Figur und fährt auf sie zu', ei.jagd.seen && ei.jagd.dmin < 1.2);
check(`Eisläufer: Draufspringen besiegt ihn und er lässt einen Schlittschuh zurück (${ei.stomp.skate})`, ei.stomp.defeated && ei.stomp.bounced && !ei.stomp.hurt && (ei.stomp.skate === 'schlittschuh' ? ei.stomp.skates === 1 : ei.stomp.skate === 'fehlt'));
check('Eisläufer: seitlich = Treffer', ei.side);
check('Der zurückgelassene Schlittschuh lässt sich anziehen', ei.stomp.skate !== 'schlittschuh' || ei.wear === true);
check(`Reit-Eisläufer: Figur landet oben und fährt mit (${ei.ride.moved} m), Stampfen besiegt ihn (Schlittschuh)`, ei.ride.rode > 150 && ei.ride.moved > 2 && !ei.ride.hurt && ei.pound.defeated && !!ei.pound.skate);

// ================================================================ Spuk / Großspuk (Spukraum)
const sp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const out = {};
  const s1 = t.ent('spuk1'), s2 = t.ent('spuk2'), g = t.ent('grossspuk');
  t.place([-11, 1, t.Z(2, 6)], { settle: 2 });
  t.safe(true);
  // Figur schaut weg → Spuk folgt
  t.face(s1.pos.x, s1.pos.z, true);
  c.step(2);
  const a0 = t.dist(s1, p), g0 = t.dist(g, p);
  let chase = 0;
  for (let i = 0; i < 120; i++) { t.face(s1.pos.x, s1.pos.z, true); p.pos.set(-11, 1, t.Z(2, 6)); p.vel.set(0, 0, 0); c.step(1); if (s1.state === 'chase') chase++; }
  out.away = { d0: +a0.toFixed(2), d1: +t.dist(s1, p).toFixed(2), chase, g: +(g0 - t.dist(g, p)).toFixed(2), state: s1.state };
  // Figur schaut hin → er versteckt sich und bleibt stehen
  t.face(s1.pos.x, s1.pos.z, false);
  for (let i = 0; i < 30; i++) { t.face(s1.pos.x, s1.pos.z, false); p.pos.set(-11, 1, t.Z(2, 6)); p.vel.set(0, 0, 0); c.step(1); }
  const b0 = t.dist(s1, p);
  let shy = 0;
  for (let i = 0; i < 120; i++) { t.face(s1.pos.x, s1.pos.z, false); p.pos.set(-11, 1, t.Z(2, 6)); p.vel.set(0, 0, 0); c.step(1); if (s1.state === 'shy') shy++; }
  out.look = { d0: +b0.toFixed(2), d1: +t.dist(s1, p).toFixed(2), shy, anim: s1.modelState().anim, looked: s1.looked };
  // Wieder wegschauen → folgt wieder
  for (let i = 0; i < 40; i++) { t.face(s1.pos.x, s1.pos.z, true); p.pos.set(-11, 1, t.Z(2, 6)); p.vel.set(0, 0, 0); c.step(1); }
  out.again = s1.state;
  // Statue (Gleitblatt: Ducken + Aktion): für Geister unsichtbar – er folgt nicht
  t.place([-11, 1, t.Z(2, 6)], { settle: 2 });
  p.setPower('gleitblatt');
  t.face(s1.pos.x, s1.pos.z, true);
  c.setInput({ crouch: true, action: true }); c.step(1); c.setInput({ crouch: true });
  const sd0 = t.dist(s1, p);
  let statue = 0;
  for (let i = 0; i < 120; i++) { c.step(1); if (p.statue) statue++; }
  c.setInput({});
  out.statue = { frames: statue, d0: +sd0.toFixed(2), d1: +t.dist(s1, p).toFixed(2), state: s1.state };
  c.step(120);
  // Großspuk ist langsamer
  out.speed = { spuk: s1.speed, gross: g.speed, size: g.size };
  t.safe(false);
  // Berührung verletzt – auch von oben; Feuer geht hindurch
  t.place([s2.pos.x + 2.5, 1, s2.pos.z], { settle: 1 });
  t.face(s2.pos.x, s2.pos.z, false);
  out.touch = t.touch(s2);
  const st = t.stomp(s2, { h: 0.8 });
  out.stomp = { ...st, defeated: s2.defeated };
  s2.onHit('fire', p);
  s2.onHit('claw', p);
  out.fire = { defeated: s2.defeated, state: s2.state };
  // Licht-Helm: Spuk verblasst und verschwindet nach ≈ 0,8 s Licht
  t.place([s1.pos.x + 3, 1, s1.pos.z], { settle: 1 });
  t.safe(true);
  p.wearHelmet('licht');
  let tLit = -1, fadeSeen = false;
  for (let i = 0; i < 300; i++) {
    t.face(s1.pos.x, s1.pos.z, false); p.pos.set(s1.pos.x + 3, 1, s1.pos.z); p.vel.set(0, 0, 0);
    c.step(1);
    if (s1.state === 'fade') fadeSeen = true;
    if (s1.defeated) { tLit = (i + 1) / 120; break; }
  }
  out.light = { t: +tLit.toFixed(2), fade: fadeSeen, by: s1.vanishedBy, calls: s1.lightCalls };
  // Großspuk braucht länger Licht (Lichtzeit von vorhin zurücksetzen)
  g.light = 0;
  let tg = -1, alive12 = false;
  for (let i = 0; i < 600; i++) {
    t.face(g.pos.x, g.pos.z, false); p.pos.set(g.pos.x + 3.5, 1, g.pos.z); p.vel.set(0, 0, 0);
    c.step(1);
    if (i === 144) alive12 = !g.defeated;
    if (g.defeated) { tg = (i + 1) / 120; break; }
  }
  out.lightGross = { t: +tg.toFixed(2), alive12 };
  p.dropHelmet('gone');
  t.safe(false);
  c.step(80);
  out.gone = t.count('spuk');
  return out;
});
console.log(`  Spuk: ${JSON.stringify(sp)}`);
check('Spuk folgt, solange die Figur wegschaut (Großspuk langsamer)', sp.away.d1 < sp.away.d0 - 1 && sp.away.chase > 100 && sp.away.g > 0.5 && sp.speed.gross < sp.speed.spuk && sp.speed.size > 2);
check('Spuk versteckt sich (shy), wenn die Figur ihn ansieht, und bleibt stehen', sp.look.shy >= 118 && Math.abs(sp.look.d1 - sp.look.d0) < 0.05 && sp.look.anim === 'shy' && sp.look.looked);
check('Spuk folgt wieder, sobald die Figur wegschaut', sp.again === 'chase');
check(`Statue (Gleitblatt) ist für den Spuk unsichtbar: er folgt nicht (${sp.statue.d0} → ${sp.statue.d1} m)`, sp.statue.frames > 100 && Math.abs(sp.statue.d1 - sp.statue.d0) < 0.05 && sp.statue.state === 'idle');
check('Spuk: Berührung verletzt, auch von oben; Feuer/Krallen gehen hindurch', sp.touch && sp.stomp.hurt && !sp.stomp.defeated && !sp.fire.defeated);
check(`Licht-Helm: Spuk verblasst und löst sich nach ${sp.light.t} s auf`, sp.light.t > 0.7 && sp.light.t < 1.2 && sp.light.fade && sp.light.by === 'light');
check(`Licht-Helm: Großspuk braucht länger (${sp.lightGross.t} s); aufgelöste verschwinden`, sp.lightGross.alive12 && sp.lightGross.t > 2 && sp.lightGross.t < 3.2 && sp.gone <= 1);

// ================================================================ Kreisgeister
const kg = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const ring = t.ent('ring'), big = t.ent('kg_gross');
  const members = ring.members;
  t.place([4.8, 1, t.Z(2, 13)], { settle: 1 });
  const a0 = ring.angle;
  c.step(120);
  out.turn = +(ring.angle - a0).toFixed(3);
  out.onCircle = members.every((m) => Math.abs(Math.hypot(m.pos.x - ring.pos.x, m.pos.z - ring.pos.z) - 3.2) < 0.02);
  out.bigR = +Math.hypot(big.pos.x - ring.pos.x, big.pos.z - ring.pos.z).toFixed(2);
  // Berührung verletzt, Draufspringen auch
  out.touch = t.touch(members[0]);
  const st = t.stomp(members[2], { h: 0.6 });
  out.stomp = { hurt: st.hurt, defeated: members[2].defeated };
  // Licht aus der Ringmitte nach +X: nur Geister im Kegel lösen sich auf
  t.place([ring.pos.x, 1, ring.pos.z], { settle: 1 });
  t.safe(true);
  p.wearHelmet('licht');
  for (let i = 0; i < 180; i++) { p.yaw = 0; p.pos.set(ring.pos.x, 1, ring.pos.z); p.vel.set(0, 0, 0); c.step(1); }
  const gone = members.filter((m) => m.defeated);
  out.light = { gone: gone.length, alive: ring.aliveCount, mask: ring.mask, bits: members.filter((m) => (ring.mask >> m.index) & 1).length, by: gone.map((m) => m.vanishedBy) };
  p.dropHelmet('gone');
  t.safe(false);
  // Funkelstern vertreibt einen Geist; ein Feuerball nicht
  const m5 = members.find((m) => !m.defeated);
  m5.onHit('fire', p);
  const fireAlive = !m5.defeated;
  m5.onHit('star', p);
  out.star = { fireAlive, starGone: m5.defeated };
  c.step(90);
  out.after = { entities: t.count('kreisgeist_glied'), alive: ring.aliveCount };
  return out;
});
console.log(`  Kreisgeister: ${JSON.stringify(kg)}`);
check(`Kreisgeist-Ring dreht sich (${kg.turn} rad/s), alle 8 auf dem Kreis (r 3,2); einzelner Kreisgeist auf r ${kg.bigR}`, kg.turn > 0.4 && kg.turn < 0.48 && kg.onCircle && Math.abs(kg.bigR - 5.6) < 0.05);
check('Kreisgeist: Berührung verletzt, Draufspringen auch (kein Besiegen)', kg.touch && kg.stomp.hurt && !kg.stomp.defeated);
check(`Licht löst einzelne Kreisgeister im Kegel auf (${kg.light.gone} von 8), der Ring bleibt (Maske passt)`, kg.light.gone >= 1 && kg.light.gone <= 4 && kg.light.bits === kg.light.alive && kg.light.by.every((b) => b === 'light'));
check('Kreisgeist: Feuer geht hindurch, Funkelstern vertreibt ihn; aufgelöste verschwinden', kg.star.fireAlive && kg.star.starGone && kg.after.entities === kg.after.alive);

// ================================================================ Funkenläufer / Funkenkäfer
const fu = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const out = {};
  const b = t.ent('fl_block'), k = t.ent('fl_kreis'), f1 = t.ent('fk1');
  t.place([-6, 1, t.Z(3, 1)], { settle: 1 });
  let rim = true, ymin = 9, ymax = -9, s0 = b.s, laps = 0, last = b.s;
  const cx = -14, cz = t.Z(3, 7);
  for (let i = 0; i < 720; i++) {
    c.step(1);
    const m = Math.max(Math.abs(b.pos.x - cx), Math.abs(b.pos.z - cz));
    if (Math.abs(m - 1.5) > 0.02) rim = false;
    ymin = Math.min(ymin, b.pos.y); ymax = Math.max(ymax, b.pos.y);
    if (b.s < last - 1) laps++;
    last = b.s;
  }
  out.block = { rim, y: [+ymin.toFixed(2), +ymax.toFixed(2)], laps };
  out.kreis = t.count('funkenlaeufer');
  // unverwundbar: Draufspringen verletzt, Feuer/Krallen prallen ab; Funkelstern vertreibt
  const st = t.stomp(k, { h: 0.6 });
  out.stomp = { hurt: st.hurt, bounced: st.bounced, defeated: k.defeated };
  k.onHit('fire', p); k.onHit('claw', p); k.onHit('cannon', p);
  out.hits = k.defeated;
  k.onHit('star', p);
  out.star = k.defeated;
  // Funkenkäfer: lädt auf und stürzt sich auf die Figur
  t.place([f1.pos.x + 1.5, 1, f1.pos.z + 2.5], { settle: 1 });
  let charged = false, hurt = false, dove = false;
  for (let i = 0; i < 360 && !hurt; i++) { c.step(1); if (f1.state === 'charge') charged = true; if (f1.state === 'dive') dove = true; if (t.hurt()) hurt = true; }
  out.kaefer = { charged, dove, hurt, dives: f1.dives };
  c.step(240);
  const s2 = t.stomp(f1, { h: 0.7 });
  out.kStomp = { ...s2, defeated: f1.defeated, state: f1.state };
  const f2 = t.ent('fk2');
  f2.onHit('tail', p);
  out.tail = f2.defeated;
  return out;
});
console.log(`  Funken: ${JSON.stringify(fu)}`);
check('Funkenläufer saust auf dem Rand des Blocks entlang (Runden)', fu.block.rim && Math.abs(fu.block.y[0] - 2.2) < 0.01 && fu.block.y[1] - fu.block.y[0] < 0.01 && fu.block.laps >= 1);
check('Funkenläufer: unverwundbar (Draufspringen verletzt, Feuer/Krallen/Kanone prallen ab), Funkelstern vertreibt', fu.kreis === 4 && fu.stomp.hurt && !fu.stomp.defeated && !fu.hits && fu.star);
check('Funkenkäfer: lädt auf, stürzt sich auf die Figur und verletzt', fu.kaefer.charged && fu.kaefer.dove && fu.kaefer.hurt && fu.kaefer.dives >= 1);
check('Funkenkäfer: Draufspringen besiegt ihn, Schwanzhieb ebenso', fu.kStomp.defeated && fu.kStomp.bounced && !fu.kStomp.hurt && fu.tail);

// ================================================================ Hüpfquallen
const hq = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const a = t.ent('hq_stelle'), b = t.ent('hq_bahn'), j = t.ent('hq_jagd');
  t.place([-6, 1, t.Z(4, 1)], { settle: 1 });
  const y0 = a.pos.y, h0 = a.hops, hb0 = b.hops, x0 = b.pos.x;
  const sa = [], sb = [];
  let ymax = y0, la = a.state, lb = b.state, xs = [];
  for (let i = 0; i < 720; i++) {
    c.step(1);
    ymax = Math.max(ymax, a.pos.y);
    if (a.state === 'crouch' && la !== 'crouch') sa.push(L.time);
    if (b.state === 'crouch' && lb !== 'crouch') sb.push(L.time);
    la = a.state; lb = b.state; xs.push(b.pos.x);
  }
  out.hops = { a: a.hops - h0, b: b.hops - hb0, h: +(ymax - y0).toFixed(2) };
  out.gapA = sa.length > 1 ? +((sa[sa.length - 1] - sa[0]) / (sa.length - 1)).toFixed(3) : 0;
  out.offset = sa.length && sb.length ? +(((sb[0] - sa[0]) % 1.2 + 1.2) % 1.2).toFixed(3) : -1;
  out.moved = +(Math.max(...xs) - Math.min(...xs)).toFixed(2);
  // Verfolger springt auf die Figur zu
  t.place([j.pos.x + 4.5, 1, j.pos.z], { settle: 1 });
  t.safe(true);
  const d0 = t.dist(j, p);
  for (let i = 0; i < 300; i++) { p.pos.set(j.pos.x > -12 ? -5 : -5, 1, t.Z(4, 10)); p.vel.set(0, 0, 0); c.step(1); }
  out.jagd = { d0: +d0.toFixed(2), d1: +t.dist(j, p).toFixed(2) };
  t.safe(false);
  // Draufspringen besiegt (am Boden), seitlich = Treffer
  for (let i = 0; i < 200 && a.state !== 'idle'; i++) c.step(1);
  const st = t.stomp(a, { h: 0.6 });
  out.stomp = { ...st, defeated: a.defeated };
  for (let i = 0; i < 200 && b.state !== 'idle'; i++) c.step(1);
  t.place([b.pos.x + 1.2, 1, b.pos.z], { settle: 0 });
  out.side = t.touch(b, 10);
  return out;
});
console.log(`  Hüpfquallen: ${JSON.stringify(hq)}`);
check(`Hüpfqualle hüpft im Takt (alle ${hq.gapA} s, ${hq.hops.h} m hoch), versetzte Qualle um eine halbe Periode`, Math.abs(hq.gapA - 1.2) < 0.02 && hq.hops.a >= 4 && hq.hops.h > 1.2 && hq.hops.h < 1.6 && Math.abs(hq.offset - 0.6) < 0.05);
check('Hüpfqualle auf der Bahn springt voran, Verfolger springt auf die Figur zu', hq.moved > 2 && hq.jagd.d1 < hq.jagd.d0 - 2);
check('Hüpfqualle: Draufspringen besiegt, seitlich = Treffer', hq.stomp.defeated && hq.stomp.bounced && !hq.stomp.hurt && hq.side);

// ================================================================ Riesenkanone und Riesenprojektil
const rp = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const k = t.ent('rk');
  t.place([2.5, 1, t.Z(4, 1)], { settle: 1 });
  k.setActive(true);
  let first = -1, xmin = 99, popped = false, bullet = null, times = [], n = 0;
  for (let i = 0; i < 1560; i++) {
    c.step(1);
    if (k.shots > n) { n = k.shots; times.push((i + 1) / 120); }
    if (k.shots > 0 && first < 0) { first = (i + 1) / 120; bullet = k.bullets[0]; }
    if (bullet && !bullet.removed) xmin = Math.min(xmin, bullet.pos.x);
    if (bullet && bullet.removed && !popped) { popped = true; out.popAt = +xmin.toFixed(2); }
  }
  out.cannon = { first: +first.toFixed(2), shots: k.shots, popped, gap: times.length > 1 ? +(times[1] - times[0]).toFixed(2) : 0 };
  k.setActive(false);
  for (const e of L.entities) if (e.kind === 'riesenprojektil') e.kill();
  c.step(2);
  // Mitfahren: Riesenprojektil auf dem Mittelweg (nach −Z), Figur landet oben
  const b = L.spawn('riesenprojektil', { pos: [0, 1.6, -2], dir: [0, -1], speed: 3 });
  t.place([0, 1.6 + 2.35 + 1.2, -2.6], { settle: 0 });
  let rode = 0, z0 = null, hurt = false;
  for (let i = 0; i < 360; i++) {
    c.step(1);
    if (t.hurt()) hurt = true;
    if (b.riding(p)) { rode++; if (z0 === null) z0 = p.pos.z; }
  }
  out.ride = { rode, dz: +((z0 ?? p.pos.z) - p.pos.z).toFixed(2), hurt, riders: b.riders() };
  // abspringen und wieder landen
  c.setInput({ jump: true }); c.step(1); c.setInput({});
  let air = false, back = false;
  for (let i = 0; i < 200; i++) { c.step(1); if (p.mode === 'air') air = true; if (air && b.riding(p)) { back = true; break; } }
  out.rejump = { air, back };
  // Stampfen (von oben auf die Oberseite) bringt es zum Absturz
  t.place([b.pos.x, b.pos.y + 2.35 + 2.2, b.pos.z], { settle: 0 });
  c.step(6);
  c.setInput({ crouch: true }); c.step(1); c.setInput({});
  for (let i = 0; i < 120 && b.state !== 'fall'; i++) { if (p.mode === 'air') { p.pos.x = b.pos.x; p.pos.z = b.pos.z; } c.step(1); }
  out.pound = { state: b.state, defeated: b.defeated };
  c.step(400);
  out.popped = b.removed;
  // Nase/Seite verletzt
  const b2 = L.spawn('riesenprojektil', { pos: [0, 1, -10], dir: [0, 1], speed: 3 });
  t.place([0, 1, -6.2], { settle: 1, yaw: -Math.PI / 2 });
  let hurt2 = false;
  for (let i = 0; i < 200 && !hurt2; i++) { c.step(1); if (t.hurt()) hurt2 = true; }
  out.front = hurt2;
  b2.onHit('fire', p);
  out.fire = b2.state;
  b2.onCannon({ pos: p.pos });
  out.cannonHit = b2.state;
  return out;
});
console.log(`  Riesenprojektil: ${JSON.stringify(rp)}`);
check(`Riesenkanone feuert (erst nach ${rp.cannon.first} s, dann alle ${rp.cannon.gap} s), das Projektil zerplatzt an der Gegenmauer (x ${rp.popAt})`, rp.cannon.first > 1.5 && rp.cannon.first < 2.2 && rp.cannon.shots === 2 && Math.abs(rp.cannon.gap - 6) < 0.05 && rp.cannon.popped && rp.popAt > 4.5 && rp.popAt < 7.5);
check(`Riesenprojektil: man landet darauf und fährt mit (${rp.ride.dz} m), springt ab und wieder drauf`, rp.ride.rode > 300 && rp.ride.dz > 7 && !rp.ride.hurt && rp.ride.riders === 1 && rp.rejump.air && rp.rejump.back);
check('Riesenprojektil: Stampfen bringt es zum Absturz (besiegt), es zerplatzt', rp.pound.state === 'fall' && rp.pound.defeated && rp.popped);
check('Riesenprojektil: Nase verletzt; Feuer prallt ab, Kanonenkugel bringt es zum Absturz', rp.front && rp.fire === 'fly' && rp.cannonHit === 'fall');

// ================================================================ Wasserbecken: Reifen-Pilzling, Flosslinge
const wa = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const r1 = t.ent('rf1'), r2 = t.ent('rf2');
  // Figur auf dem Steg: der Reifen-Pilzling paddelt heran, bleibt aber im Wasser (vor dem Steg)
  t.place([-0.9, 1, r1.pos.z], { settle: 1 });
  t.safe(true);
  const d0 = t.dist(r1, p);
  let xmax = -99, paddle = 0, yMin = 9, yMax = -9;
  for (let i = 0; i < 600; i++) {
    p.pos.set(-0.9, 1, r1.pos.z); p.vel.set(0, 0, 0);
    c.step(1);
    xmax = Math.max(xmax, r1.pos.x); if (r1.state === 'paddle') paddle++;
    yMin = Math.min(yMin, r1.line); yMax = Math.max(yMax, r1.line);
  }
  t.safe(false);
  out.paddle = { d0: +d0.toFixed(2), d1: +t.dist(r1, p).toFixed(2), xmax: +xmax.toFixed(2), paddle, line: [+yMin.toFixed(2), +yMax.toFixed(2)] };
  // Draufspringen besiegt ihn
  const st = t.stomp(r1, { h: 1.0 });
  out.stomp = { ...st, defeated: r1.defeated, state: r1.state };
  // schwimmend seitlich berühren = Treffer
  t.place([r2.pos.x + 1.0, 0.1, r2.pos.z], { settle: 2 });
  out.swimMode = p.mode;
  out.swimTouch = t.touch(r2, 30);
  // Flossling-Schwarm: alle unter Wasser, in Bewegung
  const sw = L.entities.filter((e) => e.kind === 'flossling' && e.mode === 'swim');
  const pos0 = sw.map((f) => ({ x: f.pos.x, z: f.pos.z }));
  let under = true;
  for (let i = 0; i < 240; i++) { c.step(1); for (const f of sw) if (f.pos.y + 0.56 > 0.8) under = false; }
  out.swarm = { n: sw.length, under, moved: sw.every((f, i) => Math.hypot(f.pos.x - pos0[i].x, f.pos.z - pos0[i].z) > 0.5) };
  // Springender Flossling: springt im Takt über den Steg (pendelt)
  const j = t.ent('fs_spring');
  t.place([0, 1, j.pos.z - 4], { settle: 1 });
  const j0 = j.jumps;
  let ymax = -9, xs = new Set();
  for (let i = 0; i < 720; i++) { c.step(1); ymax = Math.max(ymax, j.pos.y); if (j.state === 'wait') xs.add(Math.round(j.pos.x)); }
  out.jump = { jumps: j.jumps - j0, ymax: +ymax.toFixed(2), sides: [...xs].sort((a, b) => a - b) };
  // im Sprung berührt = Treffer; im Sprung draufspringen = besiegt
  for (let i = 0; i < 400 && !(j.state === 'jump' && j.stateT > 0.2); i++) c.step(1);
  t.place([j.pos.x + 0.8, j.pos.y, j.pos.z], { settle: 0 });
  out.jumpTouch = t.touch(j, 4);
  // am Scheitel (senkrecht kaum Tempo) knapp über ihm loslassen
  for (let i = 0; i < 400 && !(j.state === 'jump' && j.stateT >= j.flight * 0.5); i++) c.step(1);
  const st2 = t.stomp(j, { h: 0.05, max: 60 });
  out.jumpStomp = { ...st2, defeated: j.defeated };
  return out;
});
console.log(`  Wasser 1: ${JSON.stringify(wa)}`);
check('Reifen-Pilzling paddelt zur Figur, bleibt im Wasser (vor dem Steg) und schwimmt auf der Wasserlinie', wa.paddle.d1 < wa.paddle.d0 - 4 && wa.paddle.xmax < -1.5 && wa.paddle.paddle > 500 && Math.abs(wa.paddle.line[0] - 0.8) < 0.01 && Math.abs(wa.paddle.line[1] - 0.8) < 0.01);
check('Reifen-Pilzling: Draufspringen besiegt ihn; schwimmend berührt = Treffer', wa.stomp.defeated && wa.stomp.bounced && !wa.stomp.hurt && wa.swimMode === 'swim' && wa.swimTouch);
check('Flossling-Schwarm (4) schwimmt unter Wasser seine Bahn', wa.swarm.n >= 4 && wa.swarm.under && wa.swarm.moved);
check(`Springender Flossling: springt im Takt aus dem Wasser über den Steg (${wa.jump.jumps}×, bis ${wa.jump.ymax} m, pendelt)`, wa.jump.jumps >= 3 && wa.jump.ymax > 2.5 && wa.jump.sides.length >= 2);
check('Springender Flossling: berührt = Treffer, im Sprung draufspringen = besiegt', wa.jumpTouch && wa.jumpStomp.defeated);

// ================================================================ Stachelfisch, Stachelwand, Rammfisch
const wb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const s = t.ent('st_jagd'), w1 = t.ent('st_w1'), w2 = t.ent('st_w2'), rm = t.ent('ramm');
  // Oberfläche: verfolgt die schwimmende Figur
  t.place([s.pos.x + 5, 0.2, s.pos.z + 1], { settle: 2 });
  t.safe(true);
  const d0 = t.dist(s, p);
  let chase = 0, yA = 9, yB = -9;
  for (let i = 0; i < 240; i++) { p.pos.set(14, 0.2, t.Z(6, 3)); p.vel.set(0, 0, 0); c.step(1); if (s.state === 'chase') chase++; yA = Math.min(yA, s.pos.y); yB = Math.max(yB, s.pos.y); }
  t.safe(false);
  out.chase = { d0: +d0.toFixed(2), d1: +t.dist(s, p).toFixed(2), chase, y: [+yA.toFixed(2), +yB.toFixed(2)] };
  out.stomp = t.stomp(s, { h: 0.8 });
  out.stompDef = s.defeated;
  s.onHit('fire', p); s.onHit('claw', p);
  out.fire = s.defeated;
  s.onHit('cannon', p);
  out.cannon = s.defeated;
  // Stachelwand: Takt (2,4 s), Reichweite, versetzte Löcher
  t.place([10, 1, t.Z(6, 14) - 3], { settle: 1 });
  const seq = [], sh1 = [], sh2 = [];
  let ext = 0, n1 = w1.shots, n2 = w2.shots, l1 = w1.state, l2 = w2.state, hiddenTouch = 0;
  for (let i = 0; i < 1152; i++) {
    c.step(1);
    if (w1.state !== l1) { seq.push(w1.state); if (w1.state === 'shoot') sh1.push(L.time); }
    if (w2.state !== l2 && w2.state === 'shoot') sh2.push(L.time);
    l1 = w1.state; l2 = w2.state;
    ext = Math.max(ext, w1.ext);
    if (w1.state === 'hide' && w1.touch) hiddenTouch++;
  }
  out.wall = { seq: seq.slice(0, 10).join('>'), shots1: w1.shots - n1, shots2: w2.shots - n2, ext: +ext.toFixed(2), gap: sh1.length > 1 ? +(sh1[1] - sh1[0]).toFixed(3) : 0, off: sh1.length && sh2.length ? +((((sh2[0] - sh1[0]) % 2.4) + 2.4) % 2.4).toFixed(3) : -1, hiddenTouch };
  // ausgefahren berührt = Treffer; versteckt am Loch = nichts
  for (let i = 0; i < 400 && w1.state !== 'hold'; i++) c.step(1);
  t.place([w1.pos.x - 1.2, w1.pos.y + 0.3, w1.pos.z], { settle: 0 });
  out.wallHit = t.touch(w1, 6);
  for (let i = 0; i < 400 && w1.state !== 'hide'; i++) c.step(1);
  t.place([w1.hole.x - 0.6, 0.3, w1.hole.z], { settle: 0 });
  let hurt = false;
  for (let i = 0; i < 20 && w1.state === 'hide'; i++) { p.pos.set(w1.hole.x - 0.6, 0.3, w1.hole.z); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) hurt = true; }
  out.wallHidden = hurt;
  // Rammfisch: sieht die schwimmende Figur vor sich, dreht, rammt, ist betäubt
  t.place([-9, 0.1, rm.pos.z], { settle: 2 });
  t.safe(true);
  const seqR = [];
  let lr = rm.state;
  for (let i = 0; i < 1200 && rm.rams < 2; i++) { p.pos.set(-9, 0.1, rm.pos.z); p.vel.set(0, 0, 0); c.step(1); if (rm.state !== lr) { seqR.push(rm.state); lr = rm.state; } }
  t.safe(false);
  out.ramm = { seq: seqR.slice(0, 8).join('>'), rams: rm.rams };
  // Rammen verletzt; betäubt harmlos (Draufspringen nur Abprall)
  for (let i = 0; i < 1200 && rm.state !== 'turn'; i++) { p.pos.set(-9, 0.1, rm.pos.z); p.vel.set(0, 0, 0); c.step(1); }
  let rhurt = false;
  for (let i = 0; i < 400 && !rhurt; i++) { c.step(1); if (t.hurt()) rhurt = true; if (rm.state === 'stunned') break; }
  out.rammHurt = rhurt;
  for (let i = 0; i < 600 && rm.state !== 'stunned'; i++) c.step(1);
  t.place([rm.pos.x + 1.4, rm.pos.y + 0.2, rm.pos.z], { settle: 0 });
  out.stunTouch = t.touch(rm, 20) && rm.state === 'stunned';
  for (let i = 0; i < 600 && rm.state !== 'stunned'; i++) c.step(1);
  const st3 = t.stomp(rm, { h: 0.6, max: 60 });
  out.stunStomp = { ...st3, defeated: rm.defeated, state: rm.state };
  rm.onHit('bomb', p);
  out.rammBomb = rm.defeated;
  // Wasserspiegel steigt (Motor: level.setWaterLevel): Reifen-Pilzling und Stachelfisch treiben oben mit
  const r2 = t.ent('rf2'), sw = L.spawn('stachelfisch', { pos: [9, 0, t.Z(6, 1)] });
  t.place([0, 1, t.Z(5, -2)], { settle: 1 });
  out.level0 = { reifen: +r2.line.toFixed(2), stachel: +(sw.surface ?? 0).toFixed(2) };
  if (typeof L.setWaterLevel === 'function') {
    L.setWaterLevel('becken', 1.3, 2);
    c.step(60);
    out.level1 = { reifen: +r2.line.toFixed(2), stachel: +sw.surface.toFixed(2), water: +(L.waterLevel?.('becken') ?? 0).toFixed(2) };
    L.setWaterLevel('becken', 0.8, 0);
    c.step(2);
  }
  return out;
});
console.log(`  Wasser 2: ${JSON.stringify(wb)}`);
check('Stachelfisch verfolgt die schwimmende Figur an der Oberfläche', wb.chase.d1 < wb.chase.d0 - 2 && wb.chase.chase > 200 && wb.chase.y[1] - wb.chase.y[0] < 0.01);
check('Stachelfisch: Draufspringen verletzt (Stacheln), Feuer/Krallen prallen ab, Kanonenkugel besiegt', wb.stomp.hurt && !wb.stompDef && !wb.fire && wb.cannon);
check(`Stachelwand: Lochschütze im Takt (${wb.wall.gap} s, ${wb.wall.shots1} Schüsse in 9,6 s, ${wb.wall.ext} m weit), Nachbarloch um ⅓ Takt versetzt (${wb.wall.off} s)`, /hide>peek>shoot>hold>back/.test(wb.wall.seq) && Math.abs(wb.wall.gap - 2.4) < 0.02 && wb.wall.shots1 === 4 && wb.wall.shots2 === 4 && Math.abs(wb.wall.ext - 3.5) < 0.01 && Math.abs(wb.wall.off - 1.6) < 0.05 && wb.wall.hiddenTouch === 0);
check('Stachelwand: ausgefahrener Fisch verletzt, versteckt nicht', wb.wallHit && !wb.wallHidden);
check(`Rammfisch: dreht sich zur Figur, rammt, ist betäubt, dreht um (${wb.ramm.seq})`, /charge>stunned>swim/.test(wb.ramm.seq) && /swim>turn>charge/.test(wb.ramm.seq) && wb.ramm.rams >= 2);
check(`Steigt der Wasserspiegel (0,8 → 1,3), treiben Reifen-Pilzling und Stachelfisch oben mit (${wb.level1?.reifen} / ${wb.level1?.stachel})`, !!wb.level1 && Math.abs(wb.level1.water - 1.3) < 0.01 && Math.abs(wb.level1.reifen - 1.3) < 0.02 && Math.abs(wb.level1.stachel - 1.3) < 0.02 && Math.abs(wb.level0.reifen - 0.8) < 0.02);
check('Rammfisch: Rammen verletzt (steigt zur schwimmenden Figur auf), betäubt harmlos, Explosion besiegt', wb.rammHurt && wb.stunTouch === false && !wb.stunStomp.hurt && !wb.stunStomp.defeated && wb.rammBomb);

// ================================================================ Klone: Gegner zielen auf die nächste Figur
const cl = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level;
  if (typeof L.addClone !== 'function') return { api: false };
  const out = { api: true };
  const r2 = t.ent('rf2'), q = t.ent('hq_jagd');
  const f2 = L.spawn('funkenkaefer', { pos: [14, 4.2, t.Z(3, 7)] });
  const p = c.player;
  // Reifen-Pilzling: Haupt-Figur auf dem Steg (weit), Klon schwimmt nah bei ihm
  t.place([0, 1, r2.pos.z], { settle: 1 });
  p.hurt = () => false;
  const k = L.addClone(p);
  if (!k) return { api: true, clone: false };
  k.hurt = () => false;
  const kz = r2.pos.z, kx = r2.pos.x + 5;
  k.reset([kx, 0.3, kz], Math.PI / 2);
  c.step(2);
  out.target = r2.player === k;
  const d0 = t.dist(r2, k);
  for (let i = 0; i < 240; i++) { k.pos.set(kx, 0.3, kz); k.vel.set(0, 0, 0); p.pos.set(0, 1, kz); p.vel.set(0, 0, 0); c.step(1); }
  out.reifen = { d0: +d0.toFixed(2), d1: +t.dist(r2, k).toFixed(2) };
  // Funkenkäfer stürzt sich auf den Klon (Haupt-Figur seitlich weiter weg)
  p.reset([5.5, 1, f2.pos.z], Math.PI / 2);
  k.reset([f2.pos.x, 1, f2.pos.z + 1.5], Math.PI / 2);
  let dove = false;
  for (let i = 0; i < 500 && !dove; i++) { p.pos.set(5.5, 1, f2.pos.z); c.step(1); if (f2.state === 'dive') dove = f2.player === k; }
  out.kaefer = dove;
  // Hüpfqualle (Verfolger) springt zum Klon
  out.qualle = { d0: 0, d1: 99 };
  if (!q.defeated) {
    p.reset([-1, 1, q.pos.z], Math.PI / 2);
    const qx = q.pos.x - 3.5, qz = q.pos.z;
    k.reset([qx, 1, qz], Math.PI / 2);
    const dq = t.dist(q, k);
    for (let i = 0; i < 300; i++) { p.pos.set(-1, 1, qz); k.pos.set(qx, 1, qz); c.step(1); }
    out.qualle = { d0: +dq.toFixed(2), d1: +t.dist(q, k).toFixed(2) };
  }
  delete p.hurt;
  c.squad?.clear?.();
  return out;
});
console.log(`  Klone: ${JSON.stringify(cl)}`);
check('Klon: Reifen-Pilzling paddelt zur nächsten Figur (Klon), Funkenkäfer stürzt sich auf ihn, Hüpfqualle springt zu ihm', cl.api && cl.target && cl.reifen.d1 < cl.reifen.d0 - 1.5 && cl.kaefer && cl.qualle.d1 < cl.qualle.d0 - 1.5);
check('Keine Konsolenfehler (Zoo-Prüfungen)', errors.length === 0);

// ================================================================ Bilder und Kennzahlen (Zoo, frisch geladen)
await load('0-10');
await sc(() => window.__t.calm());
const calls = {};
const rec = (name, s) => { calls[name] = s; };
const ZSHOT = (name, setup) => SHOT('w3en', name, setup);
rec('start', await ZSHOT('zoo', () => { window.__t.place([0, 1, 3]); window.__course.step(30); }));
rec('saeule', await ZSHOT('schneesaeule', () => {
  const c = window.__course, t = window.__t;
  t.place([-6, 1, t.Z(1, 2)], { settle: 1 }); c.step(150);
  t.ent('ss_bahn').onHit('claw', c.player); c.step(20);
}));
rec('eis', await ZSHOT('eislaeufer', () => {
  const c = window.__course, t = window.__t, r = t.ent('eis_reit');
  t.place([6, 1, t.Z(1, 1.5)], { settle: 1 }); c.step(90);
  t.place([r.pos.x, r.pos.y + 2, r.pos.z], { settle: 120 });
}));
rec('spuk', await ZSHOT('spukraum', () => {
  const c = window.__course, t = window.__t, p = c.player, s = t.ent('spuk1'), g = t.ent('grossspuk');
  t.place([-11, 1, t.Z(2, 5)], { settle: 1 });
  for (let i = 0; i < 120; i++) { t.face(s.pos.x, s.pos.z, true); c.step(1); }
  p.wearHelmet('licht');
  for (let i = 0; i < 40; i++) { t.face(g.pos.x, g.pos.z, false); c.step(1); }
}));
rec('kreis', await ZSHOT('kreisgeister', () => {
  const c = window.__course, t = window.__t;
  t.place([4.8, 1, t.Z(2, 7)], { settle: 60 });
}));
rec('funken', await ZSHOT('funken', () => {
  const c = window.__course, t = window.__t;
  t.place([-6, 1, t.Z(3, 2)], { settle: 90 });
}));
rec('kaefer', await ZSHOT('funkenkaefer', () => {
  const c = window.__course, t = window.__t, f = t.ent('fk1');
  t.place([f.pos.x + 1.5, 1, f.pos.z + 3], { settle: 1 });
  for (let i = 0; i < 400 && f.state !== 'charge'; i++) c.step(1);
  c.step(40);
}));
rec('qualle', await ZSHOT('huepfquallen', () => {
  const c = window.__course, t = window.__t, a = t.ent('hq_stelle');
  t.place([-6, 1, t.Z(4, 2)], { settle: 1 });
  for (let i = 0; i < 300 && !(a.state === 'air' && a.vel.y < 1); i++) c.step(1);
}));
rec('kanone', await ZSHOT('riesenprojektil', () => {
  const c = window.__course, t = window.__t, k = t.ent('rk');
  t.place([3, 1, t.Z(4, 1)], { settle: 1 });
  k.setActive(true);
  for (let i = 0; i < 900 && !(k.bullets[0] && k.bullets[0].pos.x < 10); i++) c.step(1);
}));
rec('becken', await ZSHOT('wasserbecken', () => {
  const c = window.__course, t = window.__t, j = t.ent('fs_spring');
  t.place([-1, 1, t.Z(5, 7)], { settle: 1 });
  for (let i = 0; i < 600 && !(j.state === 'jump' && j.stateT > j.flight * 0.4); i++) c.step(1);
}));
rec('wand', await ZSHOT('stachelwand', () => {
  const c = window.__course, t = window.__t, w = t.ent('st_w2'), p = c.player;
  t.place([12.5, 0.3, t.Z(6, 4)], { settle: 1 });
  for (let i = 0; i < 600 && w.state !== 'hold'; i++) { p.pos.set(12.5, 0.3, t.Z(6, 4)); p.vel.set(0, 0, 0); c.step(1); }
}));
rec('ramm', await ZSHOT('rammfisch', () => {
  const c = window.__course, t = window.__t, rm = t.ent('ramm'), p = c.player;
  t.place([-9.5, 0.1, rm.pos.z + 0.5], { settle: 1 });
  for (let i = 0; i < 1200 && rm.state !== 'charge'; i++) { p.pos.set(-9.5, 0.1, rm.pos.z + 0.5); p.vel.set(0, 0, 0); c.step(1); }
  c.step(4);
}));
const maxCalls = Math.max(...Object.values(calls).map((s) => s.calls));
const maxTri = Math.max(...Object.values(calls).map((s) => s.triangles));
console.log(`  Zeichenaufrufe je Station: ${Object.entries(calls).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${maxCalls}, ${Math.round(maxTri / 1000)} k Dreiecke`);
check(`Gegnerzoo Schnee: Zeichenaufrufe < 140 an jeder Station (höchstens ${maxCalls})`, maxCalls < 140);
check('Keine Konsolenfehler (Screenshots Zoo)', errors.length === 0);

// =====================================================================================================================
// Schattenläuferin 0-11
// =====================================================================================================================
await load('0-11');
console.log('Schattenläuferin-Arena 0-11');
const BOSS_HELPERS = ([id, startZ]) => {
  const c = window.__course, t = window.__t, L = c.level;
  t.boss = () => t.ent(id);
  t.arch = () => c.state().archetype;
  t.enter = () => {
    t.place([0, 2, startZ], { settle: 2 });
    for (let i = 0; i < 240 && !c.arch.started; i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  t.until = (s, n = 1500) => { const b = t.boss(); let i = 0; for (; i < n && b.state !== s; i++) c.step(1); return i; };
  // Ansagen mitschreiben
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._w3) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._w3 = true; }
  t.untilSafe = (s, n = 1500, pos = null) => {
    const b = t.boss(), p = c.player;
    p.hurt = () => false;
    let i = 0;
    for (; i < n && b.state !== s; i++) { if (pos) { p.pos.set(pos[0], pos[1], pos[2]); p.vel.set(0, 0, 0); } c.step(1); }
    delete p.hurt;
    return i;
  };
  t.noBoomerangs = () => { for (const e of L.entities) if (e.kind === 'schatten_bumerang' || e.kind === 'felsbrocken') e.kill(); c.step(1); };
};
await sc(BOSS_HELPERS, ['schatten', 7]);
const sl = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.boss();
  out.before = { state: b.state, hp: b.hp };
  const a = t.enter();
  out.start = { started: a.started, state: b.state, hud: a.hud?.boss?.hp };
  // Auftritt → erster Wurf: Bumerang fliegt hinaus und kehrt zurück
  t.untilSafe('throw', 900, [0, 2, 7]);
  let boom = null, maxD = 0;
  for (let i = 0; i < 700; i++) {
    p.hurt = () => false; p.pos.set(6, 2, 4); p.vel.set(0, 0, 0);
    c.step(1);
    if (!boom) boom = L.entities.find((e) => e.kind === 'schatten_bumerang') ?? null;
    if (boom && !boom.removed) maxD = Math.max(maxD, Math.hypot(boom.pos.x - boom.start.x, boom.pos.z - boom.start.z));
    if (boom && boom.removed) break;
  }
  delete p.hurt;
  out.boom = { seen: !!boom, maxD: +maxD.toFixed(2), caught: boom?.caught ?? false };
  // Bumerang verletzt
  t.place([5, 2, 5], { settle: 1 });
  L.spawn('schatten_bumerang', { pos: [2, 2.7, 5], target: [5, 5], speed: 7.5 });
  let bh = false;
  for (let i = 0; i < 120 && !bh; i++) { p.pos.set(5, 2, 5); c.step(1); if (t.hurt()) bh = true; }
  out.boomHurt = bh;
  // Teleport → Auftauchen mit 2 Doppelgängern auf dem Ring
  t.untilSafe('appear', 900, [0, 2, 7.5]);
  out.appear1 = { clones: b.clones.length, kinds: b.clones.every((k) => k.kind === 'schatten_doppelgaenger' && k.owner === b) };
  t.untilSafe('idle', 300, [0, 2, 7.5]);
  const all = [b, ...b.clones];
  out.ring = all.map((e) => +Math.hypot(e.pos.x, e.pos.z).toFixed(2));
  // Salve: Original + 1 Doppelgänger werfen
  t.noBoomerangs();
  t.untilSafe('throw', 400, [0, 2, 7.5]);
  for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(0, 2, 7.5); c.step(1); }
  delete p.hurt;
  out.volley1 = t.count('schatten_bumerang');
  // Doppelgänger: Draufspringen → Rauch (Abprall, kein Treffer); seitlich = Treffer
  t.noBoomerangs();
  const k0 = b.clones[0], k1 = b.clones[1];
  const s0 = t.stomp(k0, { h: 0.6 });
  out.cloneStomp = { ...s0, poofed: k0.poofed, hp: b.hp };
  t.noBoomerangs();
  t.place([k1.pos.x + 0.9, 2, k1.pos.z], { settle: 0 });
  out.cloneSide = t.touch(k1, 6);
  // Original: Draufspringen = Treffer, Doppelgänger lösen sich auf
  t.noBoomerangs();
  for (let i = 0; i < 300 && !b.vulnerable; i++) c.step(1);
  const s1 = t.stomp(b, { h: 0.6 });
  out.hit1 = { ...s1, hp: b.hp, state: b.state, poofed: b.clones.every((k) => k.poofed), hud: t.arch().hud?.boss?.hp };
  // Phase 2: drei Doppelgänger
  t.untilSafe('appear', 900, [0, 2, 7.5]);
  out.appear2 = b.clones.length;
  t.untilSafe('idle', 300, [0, 2, 7.5]);
  t.noBoomerangs();
  const s2 = t.stomp(b, { h: 0.6 });
  out.hit2 = { ...s2, hp: b.hp, phase: b.phase };
  // Phase 3: fünf Doppelgänger
  t.untilSafe('appear', 900, [0, 2, 7.5]);
  out.appear3 = b.clones.length;
  t.untilSafe('idle', 300, [0, 2, 7.5]);
  t.noBoomerangs();
  // Salve in Phase 3: Original + 3 Doppelgänger
  t.untilSafe('throw', 400, [0, 2, 7.5]);
  for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(0, 2, 7.5); c.step(1); }
  delete p.hurt;
  out.volley3 = t.count('schatten_bumerang');
  t.noBoomerangs();
  for (let i = 0; i < 300 && !b.vulnerable; i++) c.step(1);
  const s3 = t.stomp(b, { h: 0.6 });
  out.hit3 = { ...s3, hp: b.hp, defeated: b.defeated, state: b.state };
  out.cloneLog = b.cloneLog.slice();
  out.banners = t.banners.slice();
  t.untilSafe('gone', 900, [0, 2, 7.5]);
  c.step(2);
  out.gone = { state: b.state, visible: b.visible, won: t.arch().won, warp: t.ent('warp_sieg').hidden };
  // Warp-Box → Plateau → Zielmast
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 400; i++) { c.step(1); if (p.pos.z < -30 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 600 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  return out;
});
console.log(`  Schattenläuferin: ${JSON.stringify(sl)}`);
check('Schattenläuferin: Kampf beginnt beim Betreten (Auftritt, Lebensleiste 3/3)', sl.before.state === 'wait' && sl.start.started && sl.start.state === 'intro' && sl.start.hud === 3);
check(`Wurfstern-Bumerang fliegt hinaus (${sl.boom.maxD} m) und kehrt in ihre Pfote zurück; er verletzt`, sl.boom.seen && sl.boom.maxD > 3 && sl.boom.caught && sl.boomHurt);
check(`Sie verschwindet im Rauch und taucht mit 2 Doppelgängern auf dem Ring auf (r ${sl.ring.join('/')})`, sl.appear1.clones === 2 && sl.appear1.kinds && sl.ring.length === 3 && sl.ring.every((r) => Math.abs(r - 5) < 0.05));
check(`Salve: Original + Doppelgänger werfen (Phase 1: ${sl.volley1}, Phase 3: ${sl.volley3} Bumerangs)`, sl.volley1 === 2 && sl.volley3 === 4);
check('Doppelgänger: Draufspringen → Rauch (Abprall, kein Treffer am Boss); seitlich = Treffer', sl.cloneStomp.poofed && sl.cloneStomp.bounced && !sl.cloneStomp.hurt && sl.cloneStomp.hp === 3 && sl.cloneSide);
check('Original (Schleife): Draufspringen = Treffer (3 → 2), alle Doppelgänger lösen sich in Rauch auf', sl.hit1.hp === 2 && sl.hit1.bounced && !sl.hit1.hurt && sl.hit1.poofed && sl.hit1.hud === 2);
check(`Doppelgänger je Phase 2 / 3 / 5 (Erscheinen: ${sl.cloneLog.join('/')})`, sl.cloneLog.filter((n, i, a) => n !== a[i - 1]).join(',') === '2,3,5' && sl.appear2 === 3 && sl.appear3 === 5 && sl.hit2.hp === 1);
check(`Eigene Phasen-Ansagen (${sl.banners.filter((x) => /Doppel|Schleife/.test(x)).join(' | ')}), keine fremden`, sl.banners.includes('Noch mehr Doppelgänger!') && sl.banners.includes('Achte auf die pinke Schleife!') && !sl.banners.some((x) => /Feuerspur|wütend/.test(x)));
check('Dritter Treffer besiegt sie (defeated → gone), Archetyp gewinnt, Warp-Box erscheint', sl.hit3.hp === 0 && sl.hit3.defeated && sl.gone.state === 'gone' && !sl.gone.visible && sl.gone.won && sl.gone.warp === false);
check('Warp-Box führt zum Zielplateau, Zielmast beendet das Level', sl.finish.arrived && sl.finish.finished);

// Klon: Bumerang zielt auf die nächste Figur; Tod setzt den Kampf zurück
await load('0-11');
await sc(BOSS_HELPERS, ['schatten', 7]);
const sk = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const b = t.boss();
  t.enter();
  const out = {};
  if (typeof L.addClone === 'function') {
    t.untilSafe('idle', 900, [0, 2, 7]);
    p.hurt = () => false;
    const k = L.addClone(p);
    if (k) {
      k.hurt = () => false;
      p.reset([-7, 2, 3], Math.PI / 2);
      k.reset([b.pos.x + 2.5, 2, b.pos.z + 1.5], Math.PI / 2);
      for (let i = 0; i < 600 && b.state !== 'throw'; i++) { p.pos.set(-7, 2, 3); c.step(1); }
      for (let i = 0; i < 80; i++) { p.pos.set(-7, 2, 3); c.step(1); }
      const bm = L.entities.find((e) => e.kind === 'schatten_bumerang' && e.owner === b);
      let toClone = false;
      if (bm) { const dx = k.pos.x - bm.start.x, dz = k.pos.z - bm.start.z, l = Math.hypot(dx, dz) || 1; toClone = (bm.d.x * dx + bm.d.z * dz) / l > 0.9; }
      out.clone = { boom: !!bm, toClone, target: b.player === k };
    }
    delete p.hurt;
  }
  // Tod im Kampf
  t.untilSafe('appear', 900, [0, 2, 7]);
  c.squad?.clear?.();
  p.die('hit');
  for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  c.step(5);
  out.reset = { state: b.state, hp: b.hp, clones: t.count('schatten_doppelgaenger'), started: t.arch().started, deaths: t.arch().deaths };
  return out;
});
console.log(`  Schattenläuferin Klon/Tod: ${JSON.stringify(sk)}`);
check('Schattenläuferin wirft auf die nächste Figur (Klon)', !!sk.clone && sk.clone.boom && sk.clone.target && sk.clone.toClone);
check('Tod im Kampf: Neustart, Schattenläuferin wieder 3/3 ohne Doppelgänger, Kampf beginnt von vorn', sk.reset.state === 'wait' && sk.reset.hp === 3 && sk.reset.clones === 0 && !sk.reset.started && sk.reset.deaths === 1);
check('Keine Konsolenfehler (Schattenläuferin)', errors.length === 0);

// Bilder Schattenläuferin
await load('0-11');
await sc(BOSS_HELPERS, ['schatten', 7]);
await sc(() => { const t = window.__t; t.enter(); });
const bs = {};
bs.intro = await SHOT('w3en', 'schatten_auftritt', () => { window.__course.step(100); });
bs.throw = await SHOT('w3en', 'schatten_wurf', () => { const t = window.__t; t.untilSafe('throw', 900, [0, 2, 7]); window.__course.step(70); });
bs.clones = await SHOT('w3en', 'schatten_doppelgaenger', () => { const t = window.__t; t.untilSafe('appear', 900, [0, 2, 7]); t.untilSafe('throw', 900, [0, 2, 7]); window.__course.step(50); });
bs.five = await SHOT('w3en', 'schatten_fuenf', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.noBoomerangs(); t.stomp(b, { h: 0.6 }); t.untilSafe('appear', 900, [0, 2, 7]); t.untilSafe('idle', 300, [0, 2, 7]);
  t.noBoomerangs(); t.stomp(b, { h: 0.6 }); t.untilSafe('appear', 900, [0, 2, 7]); t.untilSafe('idle', 300, [0, 2, 7]);
  c.player.pos.set(0, 2, 7.5); c.step(20);
}, 3);
bs.def = await SHOT('w3en', 'schatten_besiegt', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.noBoomerangs(); t.stomp(b, { h: 0.6 }); c.step(110);
});
const sMax = Math.max(...Object.values(bs).map((s) => s.calls));
console.log(`  Zeichenaufrufe Schattenläuferin: ${Object.entries(bs).map(([k, s]) => `${k} ${s.calls}`).join(', ')}`);
check(`Schattenläuferin-Arena: Zeichenaufrufe < 140 (höchstens ${sMax})`, sMax < 140);

// =====================================================================================================================
// Schlangenkönig 0-12
// =====================================================================================================================
await load('0-12');
console.log('Schlangenkönig im Zirkuszelt 0-12');
const SNAKE_HELPERS = () => {
  const c = window.__course, t = window.__t;
  /** Vom Teller (Diener sv) aufs Haupt springen: Sprung halten, im Fallen über den Kopf lenken. */
  t.plateJump = (sv, o = {}) => {
    const b = t.boss(), p = c.player;
    // keine fallenden Steine während des Sprungs (Phase 2/3), alte Steine weg
    b.rainT = 99;
    for (const e of c.level.entities) if (e.kind === 'felsbrocken') e.kill();
    if (sv) t.place([sv.pos.x, sv.plateTop + 0.05, sv.pos.z], { settle: 14 });
    const standing = sv ? sv.standing : 0, y0 = p.pos.y;
    let apex = p.pos.y, hit = false, hurt = false;
    const hp0 = b.hp;
    c.setInput({ jump: true });
    for (let i = 0; i < 220; i++) {
      c.step(1);
      apex = Math.max(apex, p.pos.y);
      if (t.hurt()) hurt = true;
      const h = b.headWorld({});
      if (p.mode === 'air' && p.vel.y < 0) { p.pos.x += (h.x - p.pos.x) * 0.3; p.pos.z += (h.z - p.pos.z) * 0.3; }
      if (b.hp < hp0) { hit = true; break; }
      if ((p.mode === 'ground' || p.dead) && i > 5) break;
    }
    c.setInput({});
    const h = b.headWorld({});
    return { standing, y0: +y0.toFixed(2), apex: +apex.toFixed(2), headTop: +(b.pos.y + b.half.y * 2).toFixed(2), headY: +h.y.toFixed(2), hit, hurt, hp: b.hp, bounced: p.vel.y > 4 };
  };
  /** Teller, über dem der Kopf schwebt (sonst irgendein heiler). */
  t.plate = (cracked = false) => {
    const b = t.boss();
    const up = b.servants.filter((s) => s.state === 'up' && !s.broken && s.cracked === cracked);
    return (!cracked && up.includes(b.target)) ? b.target : up[0] ?? null;
  };
};
await sc(BOSS_HELPERS, ['koenig', 9.5]);
await sc(SNAKE_HELPERS);
const sn = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.boss();
  out.before = { state: b.state, head: b.headWorld({}).y };
  const a = t.enter();
  out.start = { started: a.started, state: b.state, hud: a.hud?.boss?.hp };
  // bricht aus dem Boden
  let ymax = 0;
  for (let i = 0; i < 300 && b.state !== 'throw'; i++) { p.hurt = () => false; c.step(1); ymax = Math.max(ymax, b.headWorld({}).y); }
  delete p.hurt;
  out.rise = { state: b.state, headUp: +ymax.toFixed(2) };
  // Steinwurf: Landeanzeige, Stein trifft die stehende Figur
  t.place([3, 2, 7], { settle: 1 });
  let marker = 0, hurt = false, broke = 0;
  const thrown0 = b.rocksThrown;
  for (let i = 0; i < 400 && b.state === 'throw'; i++) {
    p.pos.set(3, 2, 7); p.vel.set(0, 0, 0);
    c.step(1);
    marker = Math.max(marker, b.markers.list.length);
    if (t.hurt()) hurt = true;
    broke = Math.max(broke, L.entities.filter((e) => e.kind === 'felsbrocken' && e.state === 'break').length);
  }
  out.rocks = { thrown: b.rocksThrown - thrown0, marker, hurt, broke };
  // Diener steigen auf (3, Teller auf 2,8 m)
  t.untilSafe('lean', 600, [3, 2, 9]);
  for (let i = 0; i < 80; i++) { p.hurt = () => false; p.pos.set(3, 2, 9); c.step(1); }
  delete p.hurt;
  const up = b.servants.filter((s) => s.state === 'up');
  out.summon = { n: up.length, tops: up.map((s) => +(s.plateTop - 2).toFixed(2)), cracked: up.filter((s) => s.cracked).length, claw: up.filter((s) => s.item).length };
  // Vom Boden aus unerreichbar (Kopf über dem Teller)
  const h = b.headWorld({});
  t.place([h.x, 2, h.z], { settle: 1 });
  out.floor = t.plateJump(null);
  // Teller-Weg: auf den Teller unter dem Kopf, von dort auf den Kopf
  for (let i = 0; i < 60; i++) { p.hurt = () => false; c.step(1); }
  delete p.hurt;
  out.plate = t.plateJump(t.plate(false));
  out.hit1 = { hp: b.hp, state: b.state, hud: t.arch().hud?.boss?.hp };
  // Diener versinken nach dem Treffer
  t.untilSafe('throw', 900, [3, 2, 9]);
  out.afterHit = { servants: b.servants.filter((s) => s.state === 'up').length, phase: b.phase };
  // Phase 2: rissiger Teller bricht nach dem Betreten
  t.untilSafe('lean', 900, [3, 2, 9]);
  for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(3, 2, 9); c.step(1); }
  delete p.hurt;
  const up2 = b.servants.filter((s) => s.state === 'up');
  out.summon2 = { n: up2.length, cracked: up2.filter((s) => s.cracked).length, claw: up2.filter((s) => s.item && !s.item.removed).length };
  const cr = t.plate(true);
  if (cr) {
    t.place([cr.pos.x, cr.plateTop + 0.05, cr.pos.z], { settle: 1 });
    let tb = -1, fell = false;
    for (let i = 0; i < 200; i++) { c.step(1); if (cr.broken && tb < 0) tb = (i + 1) / 120; if (tb > 0 && p.pos.y < cr.plateTop - 0.5) { fell = true; break; } }
    out.crack = { t: +tb.toFixed(2), by: cr.brokenBy, fell };
  }
  // Krallen-Anzug auf einem Teller: an der Diener-Schlange hochklettern
  const cs = b.servants.find((s) => s.state === 'up' && s.item && !s.item.removed);
  if (cs) {
    t.place([cs.pos.x + 0.9, 2, cs.pos.z], { settle: 1, power: 'krallen' });
    const climbable = !!L.world.overlapAABB({ x: cs.pos.x, y: 3, z: cs.pos.z }, { x: 0.1, y: 0.1, z: 0.1 }).find((s) => s.owner === cs && s.climbable);
    out.claw = { climbable, item: cs.item.power };
  }
  // herabfallender Stein zerschlägt einen Teller; Fenster läuft ab → Stoß verletzt
  let rockBreak = false, strikeHurt = false, struck = false;
  for (let i = 0; i < 1400 && b.state !== 'gap'; i++) {
    if (b.state === 'lean') { p.hurt = () => false; p.pos.set(0, 2, 9.5); p.vel.set(0, 0, 0); }
    else if (b.state === 'strike') { delete p.hurt; struck = true; if (b.stateT < 0.05) { p.reset([0, 2, 6.5], Math.PI / 2); p.invuln = 0; } }
    c.step(1);
    if (b.servants.some((s) => s.brokenBy === 'rock')) rockBreak = true;
    if (b.state === 'strike' && t.hurt()) strikeHurt = true;
  }
  delete p.hurt;
  out.window = { rockBreak, fallen: b.rocksFallen, struck, strikeHurt };
  // zweiter Treffer (Phase 2, nächste Runde)
  t.place([0, 2, 9.5], { settle: 1 });
  t.untilSafe('lean', 1200, [0, 2, 9.5]);
  for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(0, 2, 9.5); c.step(1); }
  delete p.hurt;
  out.hit2 = t.plateJump(t.plate(false));
  // Phase 3: 4 Diener, 2 rissig; dritter Treffer
  t.untilSafe('lean', 1500, [0, 2, 9.5]);
  for (let i = 0; i < 60; i++) { p.hurt = () => false; p.pos.set(0, 2, 9.5); c.step(1); }
  delete p.hurt;
  const up3 = b.servants.filter((s) => s.state === 'up');
  out.summon3 = { n: up3.length, cracked: up3.filter((s) => s.cracked).length, phase: b.phase };
  out.hit3 = t.plateJump(t.plate(false));
  out.def = { hp: b.hp, defeated: b.defeated, state: b.state };
  out.banners = t.banners.slice();
  t.untilSafe('gone', 900, [0, 2, 9.5]);
  c.step(2);
  const star = L.entities.find((e) => e.kind === 'star');
  out.gone = { state: b.state, won: t.arch().won, warp: t.ent('warp_sieg').hidden, star: !!star, servants: t.count('dienerschlange') };
  // Stern einsammeln, Warp-Box → Ziel
  if (star) { t.place([star.pos.x, 2, star.pos.z], { settle: 10 }); }
  out.starTaken = !L.entities.find((e) => e.kind === 'star' && e.alive);
  const w = t.ent('warp_sieg');
  t.place([w.pos.x, w.pos.y + 1.6, w.pos.z], { settle: 0 });
  let arrived = false;
  for (let i = 0; i < 400; i++) { c.step(1); if (p.pos.z < -34 && p.mode !== 'script') { arrived = true; break; } }
  for (let i = 0; i < 600 && !c.finished && L.runtime.status === 'play'; i++) { c.setInput({ y: 1 }); c.step(1); }
  c.setInput({});
  for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
  out.finish = { arrived, finished: c.finished };
  return out;
});
console.log(`  Schlangenkönig: ${JSON.stringify(sn)}`);
check('Schlangenkönig: Kampf beginnt beim Betreten, er bricht aus dem Sockel (Lebensleiste 3/3)', sn.before.state === 'wait' && sn.start.started && sn.start.state === 'rise' && sn.start.hud === 3 && sn.rise.headUp > 5);
check(`Schlangenkönig schleudert Steine (${sn.rocks.thrown}, Landeanzeige), sie zerspringen und treffen die Figur`, sn.rocks.thrown === 2 && sn.rocks.marker >= 1 && sn.rocks.hurt && sn.rocks.broke >= 1);
check(`Er ruft 3 Diener-Schlangen mit Tellern (2,8 m) herbei`, sn.summon.n === 3 && sn.summon.tops.every((y) => Math.abs(y - 2.8) < 0.01) && sn.summon.cracked === 0);
check(`Vom Boden aus ist der Kopf nicht erreichbar (Scheitel ${sn.floor.apex} < Kopf ${sn.floor.headTop})`, !sn.floor.hit && sn.floor.apex < sn.floor.headTop && sn.floor.hp === 3);
check(`Teller-Weg: auf dem Teller stehen, aufs Haupt springen = Treffer (Scheitel ${sn.plate.apex} > Kopf ${sn.plate.headTop})`, sn.plate.standing === 1 && sn.plate.hit && !sn.plate.hurt && sn.plate.apex > sn.plate.headTop && sn.hit1.hp === 2 && sn.hit1.hud === 2);
check('Nach dem Treffer versinken die Diener, neue Runde in Phase 2', sn.afterHit.servants === 0 && sn.afterHit.phase === 2);
check(`Phase 2: ein rissiger Teller bricht nach dem Betreten (${sn.crack?.t} s), die Figur fällt`, sn.summon2.cracked === 1 && !!sn.crack && sn.crack.by === 'step' && sn.crack.t > 0.4 && sn.crack.t < 0.6 && sn.crack.fell);
check('Gelegentlich trägt ein Teller einen Krallen-Anzug; die Diener-Schlange ist kletterbar', sn.summon2.claw === 1 && !!sn.claw && sn.claw.climbable && sn.claw.item === 'krallen');
check('Herabfallende Steine zerschlagen Teller; läuft das Fenster ab, stößt er zu und verletzt', sn.window.rockBreak && sn.window.fallen >= 2 && sn.window.struck && sn.window.strikeHurt);
check('Zweiter Treffer vom Teller (2 → 1)', sn.hit2.hit && sn.hit2.hp === 1);
check(`Eigene Phasen-Ansagen (${sn.banners.filter((x) => /Teller|Kuppel/.test(x)).join(' | ')}), keine fremden`, sn.banners.includes('Vorsicht, rissige Teller!') && sn.banners.includes('Steine fallen von der Kuppel!') && !sn.banners.some((x) => /Feuerspur|wütend/.test(x)));
check('Phase 3: 4 Diener, 2 rissig; dritter Treffer besiegt ihn', sn.summon3.n === 4 && sn.summon3.cracked === 2 && sn.summon3.phase === 3 && sn.hit3.hit && sn.def.hp === 0 && sn.def.defeated);
check('Ende: er versinkt (gone), Stern erscheint, Archetyp gewinnt, Warp-Box (Röhre) erscheint, Diener weg', sn.gone.state === 'gone' && sn.gone.won && sn.gone.warp === false && sn.gone.star && sn.gone.servants === 0 && sn.starTaken);
check('Warp-Box führt zum Zielplateau, Zielmast beendet das Level', sn.finish.arrived && sn.finish.finished);

// Sockel schubst, Klon als Ziel, Tod setzt zurück
await load('0-12');
await sc(BOSS_HELPERS, ['koenig', 9.5]);
await sc(SNAKE_HELPERS);
const sn2 = await sc(() => {
  const c = window.__course, t = window.__t, L = c.level, p = c.player;
  const b = t.boss();
  t.enter();
  t.untilSafe('throw', 600, [0, 2, 9.5]);
  const out = {};
  // auf den Sockel springen → heruntergeschubst (kein Schaden)
  t.place([1.2, 3.6, 0.8], { settle: 0 });
  let maxR = 0, onDrum = false;
  for (let i = 0; i < 120; i++) { c.step(1); if (p.ground?.owner === b) onDrum = true; maxR = Math.max(maxR, Math.hypot(p.pos.x, p.pos.z)); }
  out.shove = { shoves: b.shoves ?? 0, onDrum, offR: +Math.hypot(p.pos.x, p.pos.z).toFixed(2), big: p.big, y: +p.pos.y.toFixed(2) };
  if (typeof L.addClone === 'function') {
    p.hurt = () => false;
    const k = L.addClone(p);
    if (k) {
      k.hurt = () => false;
      p.reset([-9, 2, 2], Math.PI / 2);
      k.reset([5, 2, -5], Math.PI / 2);
      for (let i = 0; i < 150; i++) { p.pos.set(-9, 2, 2); k.pos.set(5, 2, -5); c.step(1); }
      const az = Math.atan2(-(k.pos.z - b.home.z), k.pos.x - b.home.x);
      out.clone = { target: b.player === k, faces: Math.abs(Math.atan2(Math.sin(b.az - az), Math.cos(b.az - az))) < 0.6 };
    }
    delete p.hurt;
  }
  c.squad?.clear?.();
  t.untilSafe('lean', 1500, [0, 2, 9.5]);
  p.die('hit');
  for (let i = 0; i < 600 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
  c.step(5);
  out.reset = { state: b.state, hp: b.hp, servants: t.count('dienerschlange'), started: t.arch().started, deaths: t.arch().deaths };
  return out;
});
console.log(`  Schlangenkönig Sockel/Klon/Tod: ${JSON.stringify(sn2)}`);
check('Sockel: wer daraufspringt, wird heruntergeschubst (ohne Schaden)', sn2.shove.shoves >= 1 && sn2.shove.offR > 2.6 && sn2.shove.big);
check('Schlangenkönig wendet sich der nächsten Figur (Klon) zu', !!sn2.clone && sn2.clone.target && sn2.clone.faces);
check('Tod im Kampf: Neustart, König wieder 3/3 im Sockel, Diener weg, Kampf von vorn', sn2.reset.state === 'wait' && sn2.reset.hp === 3 && sn2.reset.servants === 0 && !sn2.reset.started && sn2.reset.deaths === 1);
check('Keine Konsolenfehler (Schlangenkönig)', errors.length === 0);

// Bilder Schlangenkönig
await load('0-12');
await sc(BOSS_HELPERS, ['koenig', 9.5]);
await sc(SNAKE_HELPERS);
await sc(() => { window.__t.enter(); });
const ks = {};
ks.rise = await SHOT('w3en', 'koenig_auftritt', () => { window.__course.step(70); });
ks.rock = await SHOT('w3en', 'koenig_steine', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.untilSafe('throw', 600, [0, 2, 9.5]);
  for (let i = 0; i < 200 && !(b.rocks.length && b.rocks[0].state === 'air' && b.rocks[0].stateT > 0.5); i++) { c.player.pos.set(2, 2, 8); c.step(1); }
});
ks.plates = await SHOT('w3en', 'koenig_teller', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.untilSafe('lean', 900, [0, 2, 9.5]);
  c.step(90);
  const sv = t.plate(false);
  if (sv) t.place([sv.pos.x, sv.plateTop + 0.05, sv.pos.z], { settle: 20 });
});
ks.hit = await SHOT('w3en', 'koenig_treffer', () => {
  const c = window.__course, t = window.__t;
  t.plateJump(null);
  c.step(10);
});
ks.p3 = await SHOT('w3en', 'koenig_phase3', () => {
  const c = window.__course, t = window.__t, b = t.boss();
  t.untilSafe('lean', 1500, [0, 2, 9.5]); c.step(60); t.plateJump(t.plate(false));
  t.untilSafe('lean', 1500, [0, 2, 9.5]); c.step(70);
  c.player.pos.set(0, 2, 9.5);
}, 3);
ks.def = await SHOT('w3en', 'koenig_besiegt', () => {
  const c = window.__course, t = window.__t;
  t.plateJump(t.plate(false)); t.untilSafe('defeated', 300, [0, 2, 9.5]); c.step(150);
});
const kMax = Math.max(...Object.values(ks).map((s) => s.calls));
console.log(`  Zeichenaufrufe Schlangenkönig: ${Object.entries(ks).map(([k, s]) => `${k} ${s.calls}`).join(', ')}`);
check(`Zirkus-Arena: Zeichenaufrufe < 140 (höchstens ${kMax})`, kMax < 140);

// __ENDE__
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
