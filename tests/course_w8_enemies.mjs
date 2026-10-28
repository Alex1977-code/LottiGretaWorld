// Kurs-Modus: Gegner der Welt 8 „Brummbär-Rummelplatz“ im Rummel-Gegnerzoo (0-32) und die Endgegner in den Rummel-Bossarenen
// (0-33) deterministisch prüfen – Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Sandflosser (schwimmt verborgen,
// Schattenmarke vor dem Sprung, Bogen, im Sprung von oben besiegbar, Stern fällt in den Sand, zielend), Knochenflieger-Gruppe
// (Ring/Kette/Welle/Keil, gemeinsamer Sturzflug, Knochenhaufen → setzt sich neu zusammen, endgültig mit Power-up/Wurfsichel bzw.
// Stampfen auf den Haufen, respawn: false), Baron-Sandstatue und Pilzling-Sandskulptur (Ritt, Rammen, Stampfen, Power-ups, Stern,
// Mini-Pilzlinge), Flatterkäfer mit Stern, Kreisgeist-Ringe (Licht), Großspuk-Jäger, Hörner-Ameisen-Reihen aus Löchern,
// Schubser-Signale (Riesenrad-Aufgabe), Bestand, Wandstücke, Schockwelle, Lavapfütze, Wurfsichel bei allen neuen Arten;
// Endgegner: goldene Würfelblase (Schockwellen), rosa Schlangenkönig (Lavapfützen), Schattenläuferin 2, Baron Brummbär im
// Krallen-Anzug in allen Abschnitten bis zum Sieg (Turm mit Wandstücken und POW-Block, oberer Turm mit Spiegelfrüchten und
// Doppelgängern, Gipfel mit Super-POW-Block 4×, Glas zerbricht, Abspann-Signal) und Neustart nach Tod je Abschnitt.
// Simulation nur über window.__course.step(n) (1 Schritt = 1/120 s) und setInput; Bilder tests/out/w8e_*.png.
// Aufruf: PORT_BASE=0 node tests/course_w8_enemies.mjs   (Port 4790; vorher npm run build)
//   W8E_PART=1 (Sandflosser, Knochenflieger-Gruppe, Sandfiguren, Flatterkäfer) | 2 (Geister, Ameisen, Schubser, Bestand,
//   Wandstücke, Welle, Pfütze, Wurfsichel) | 3 (Endgegner 0-33: Varianten und Baron) | 4 (Bilder, Zeichenaufrufe) – ohne: alle
//   Teile nacheinander (besser einzeln, je < 10 min).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4790;
const PART = process.env.W8E_PART ?? 'all';
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
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground' || p.mode === 'swim') { landed = true; break; }
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
      /** Wurfsichel-Treffer wie vom Geschoss des Power-ups (Bausteine Welt 7): onSichelHit(sichel), sonst bei Gegnern
       *  onHit('throw', sichel) mit sichel.sichel = true, sichel.owner = Figur (nur berührbare Gegner, wie der Motor). */
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
await load('0-32');
console.log('Rummel-Gegnerzoo 0-32');
{
  const st0 = await sc(() => {
    const c = window.__course, t = window.__t;
    const kinds = {};
    for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    const models = {};
    for (const id of ['sf_stern', 'statue', 'skulptur', 'fk_stern', 'gs_jaeger', 'b_riesen', 'sb1']) {
      const e = t.ent(id);
      models[id] = e?.model ? (e.model.placeholder ? 'PLATZHALTER' : t.model(e)) : null;
    }
    const g = t.ent('kg_ring');
    models.kg_ring = g?.members?.[0]?.slot ? 'instanzen:knochenflieger' : null;
    const kgk = t.ent('kgk1');
    models.kgk1 = kgk?.model ? t.model(kgk) : null;
    return { kinds, n: c.level.entities.length, models, glieder: kinds.knochenflieger_glied ?? 0, geister: kinds.kreisgeist_glied ?? 0 };
  });
  console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
  console.log(`  Modelle: ${JSON.stringify(st0.models)}`);
  const NEED = ['sandflosser', 'knochenflieger_gruppe', 'knochenflieger_glied', 'baron_sandstatue', 'pilzling_sandskulptur', 'flatterkaefer', 'kreisgeist_kreis', 'spuk', 'ameisen_reihe', 'ameisensoldat_horn', 'riesenschnappblume', 'hackvogel', 'schubser', 'pilzling', 'krallen_pilzling', 'feuer_werfer', 'bruchstueck'];
  check(`Alle Welt-8-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
  const M = st0.models;
  check(`Welt-8-Modelle angebunden (kein Platzhalter): ${Object.values(M).join(', ')}`, Object.values(M).every((m) => m && m !== 'PLATZHALTER')
    && /sandflosser/.test(M.sf_stern) && /baron_sandstatue/.test(M.statue) && /sandskulptur_pilzling/.test(M.skulptur) && M.kg_ring);
  check(`Massen: ${st0.glieder} Knochenflieger in Gruppen, ${st0.geister} Kreisgeister in Ringen`, st0.glieder >= 40 && st0.geister >= 60);
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
  const smoke = await sc(() => { const c = window.__course; const t0 = performance.now(); for (let i = 0; i < 1200; i++) c.step(1); return { n: c.level.entities.length, ms: +((performance.now() - t0) / 1200).toFixed(3) }; });
  KPI.zooStep = smoke.ms;
  check(`10 s Simulation ohne Fehler (${smoke.n} Entitäten, ${smoke.ms} ms je Schritt)`, errors.length === 0);
  if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// =====================================================================================================================
// Teil 1: Sandflosser, Knochenflieger-Gruppe, Sandfiguren, Flatterkäfer mit Stern
// =====================================================================================================================
if (want(1)) {
await load('0-32');
console.log('Teil 1: Sandflosser, Knochenflieger-Gruppe, Sandfiguren, Flatterkäfer mit Stern');

// ---- Sandflosser
const sf = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const f = t.ent('sf_stern');
  const far = [0, 1, 4];
  // schwimmt verborgen (unberührbar), kündigt an (Schattenmarke an der Landestelle), springt im Bogen, taucht ein
  const seq = [f.state];
  let hiddenTouch = null, xs = [], markedBefore = false, apex = 0;
  for (let i = 0; i < 120 * 8; i++) {
    t.hold(far, 1);
    if (seq[seq.length - 1] !== f.state) seq.push(f.state);
    if (f.state === 'swim' && hiddenTouch === null) hiddenTouch = f.touch;
    if (f.state === 'warn' && f.marked) markedBefore = true;
    if (f.state === 'jump') apex = Math.max(apex, f.pos.y - 1);
    if (i % 60 === 0) xs.push(t.r2(f.pos.x));
  }
  out.cycle = { seq: seq.join('>'), hiddenTouch, markedBefore, apex: t.r2(apex), jumps: f.jumps, xs, from: f.jumpFrom, to: f.jumpTo };
  // im Sprung von oben: Abprall, besiegt; der Stern erscheint und fällt in den Sand
  t.until(() => f.state === 'jump' && f.stateT > f.flightT * 0.35, 120 * 8, far);
  const def0 = L.defeatedLog.length;
  const st = t.stomp(f, { h: 0.9 });
  out.stomp = { ...st, defeated: f.defeated, counted: L.defeatedLog.slice(def0).includes('sandflosser') };
  const star = L.entities.find((e) => e.kind === 'star' && e.index === 0 && !e.removed);
  const y0 = star ? t.r2(star.pos.y) : null;
  t.hold(far, 240);
  out.star = star ? { y0, y: t.r2(star.pos.y), landed: !!star.landed, touch: star.touch, removed: star.removed } : null;
  // seitliche Berührung im Sprung verletzt; verborgen nicht
  const k = t.ent('sf_kreis');
  t.until(() => k.state === 'swim' && k.stateT > 0.2, 120 * 8, far);
  out.hiddenSide = t.touch(k, 10);
  t.until(() => k.state === 'jump' && k.stateT > k.flightT * 0.4, 120 * 8, far);
  out.jumpSide = t.touch(k, 10);
  // Wurfsichel im Sprung besiegt
  t.fresh();
  t.until(() => k.state === 'jump' && k.stateT > 0.2, 120 * 8, far);
  out.sichel = { hit: t.sichel(k), defeated: k.defeated };
  // zielend: die Landestelle liegt bei der Figur (Vorhalt), auch wenn sie sich bewegt
  const a = t.ent('sf_ziel');
  const fig = [9, 1, t.Z(1, 6)];
  t.until(() => a.state !== 'warn', 120 * 8, fig);
  t.until(() => a.state === 'warn', 120 * 8, fig);
  out.aim = { to: a.jumpTo, d: a.jumpTo ? t.r2(Math.hypot(a.jumpTo[0] - fig[0], a.jumpTo[2] - fig[2])) : 99, marked: a.marked };
  return out;
});
console.log(`  Sandflosser: ${JSON.stringify(sf)}`);
check(`Sandflosser schwimmt verborgen (unberührbar) und springt im Takt (${sf.cycle.seq}; Scheitel ${sf.cycle.apex} m)`, sf.cycle.hiddenTouch === false && /swim>warn>jump>land>swim/.test(sf.cycle.seq) && Math.abs(sf.cycle.apex - 2.6) < 0.25 && sf.cycle.jumps >= 2);
check('Vor dem Sprung: Schattenmarke an der Landestelle (auch beim Ritt lesbar)', sf.cycle.markedBefore);
check('Im Sprung von oben besiegbar (Abprall mit Federung, zählt)', sf.stomp.bounced && !sf.stomp.hurt && sf.stomp.defeated && sf.stomp.counted);
check(`Stern-Sandflosser: Stern erscheint und fällt in den Sand (${JSON.stringify(sf.star)})`, !!sf.star && sf.star.landed && sf.star.y0 > 1.8 && sf.star.y < 1.4 && sf.star.touch !== false && !sf.star.removed);
check('Verborgen harmlos, im Sprung seitlich verletzend; Wurfsichel besiegt im Sprung', sf.hiddenSide === false && sf.jumpSide === true && sf.sichel.defeated);
check(`Zielender Sandflosser springt der Figur entgegen (Landestelle ${sf.aim.d} m von ihr)`, sf.aim.d < 1.6 && sf.aim.marked);

// ---- Knochenflieger-Gruppe
const kg = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const g = t.ent('kg_ring');
  const far = [0, 1, 4];
  // Ring: alle 5 Flieger auf dem Kreis um die Formationsmitte, Formation zieht ihre Bahn
  t.hold(far, 60);
  const rs = g.members.map((m) => t.r2(Math.hypot(m.body.x - g.mid.x, m.body.z - g.mid.z)));
  const m0 = { x: g.mid.x, z: g.mid.z };
  t.hold(far, 240);
  out.ring = { rs, moved: t.r2(Math.hypot(g.mid.x - m0.x, g.mid.z - m0.z)), state: g.state, formed: g.formed };
  // Figur darunter: Ankündigung → gemeinsamer Sturzflug (Zange um die Figur) → zurück in Formation
  const fig = [g.mid.x, 1, g.mid.z];
  const seq = [g.state];
  let minD = 99, hurt = false, diving = 0;
  t.place(fig, { settle: 1 });
  for (let i = 0; i < 120 * 7 && !(seq.includes('dive') && g.state === 'fly' && g.formed === 5); i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (seq[seq.length - 1] !== g.state) seq.push(g.state);
    const pc = p.center();
    for (const m of g.members) if (m.state === 'dive') minD = Math.min(minD, Math.hypot(m.body.x - pc.x, m.body.y - pc.y, m.body.z - pc.z));
    diving = Math.max(diving, g.members.filter((m) => m.state === 'dive').length);
    if (t.hurt()) hurt = true;
  }
  out.dive = { seq: seq.join('>'), minD: t.r2(minD), hurt, diving, formed: g.formed, dives: g.dives };
  t.fresh();
  // Draufspringen → Knochenhaufen am Boden (harmlos), nach respawn s zittert er und setzt sich neu zusammen
  t.hold(far, 120 * 3);
  const m = g.members[1];
  const st = t.stomp(m, { h: 0.8 });
  const bones = { state: m.state, touch: m.touch };
  let landedY = null, shaking = false, rebuildT = null;
  for (let i = 0; i < 120 * 7; i++) {
    t.hold(far, 1);
    if (m.state === 'bones' && m.landed && landedY === null) landedY = t.r2(m.body.y);
    if (m.shaking) shaking = true;
    if (m.state === 'rebuild' && rebuildT === null) rebuildT = t.r2(m.bonesT);
    if (m.state === 'form' && rebuildT !== null) break;
  }
  out.bones = { ...st, bones, landedY, shaking, rebuildT, back: m.state, rebuilds: g.rebuilds, defeated: m.defeated };
  // Knochenhaufen: Stampfattacke darauf besiegt endgültig (zählt)
  const m2 = g.members[2];
  t.stomp(m2, { h: 0.8 });
  t.until(() => m2.landed, 240, far);
  const def0 = L.defeatedLog.length;
  t.stomp(m2, { pound: true, h: 1.6, max: 240 });
  t.hold(far, 150);
  out.pile = { state: m2.state, defeated: m2.defeated, removed: m2.removed, counted: L.defeatedLog.slice(def0).includes('knochenflieger_glied') };
  // Power-up (Feuer) und Wurfsichel: endgültig; seitliche Berührung verletzt
  const m3 = g.members[3], m4 = g.members[4];
  m3.onHit('fire', p);
  t.sichel(m4);
  t.hold(far, 150);
  out.power = { fire: m3.defeated, sichel: m4.defeated, alive: g.aliveCount };
  out.side = t.touch(g.members[0], 20);
  t.fresh();
  // Kette (Linie): einer nach dem anderen durch die Figur
  const ln = t.ent('kg_linie');
  const fl = [11.5, 1, t.Z(2, 7)];
  t.place(fl, { settle: 1 });
  const starts = [];
  for (let i = 0; i < 120 * 8 && starts.length < ln.count; i++) {
    t.hold(fl, 1);
    for (const mm of ln.members) if (mm.state === 'dive' && !starts.some((s) => s.i === mm.index)) starts.push({ i: mm.index, t: t.r2(L.time) });
  }
  out.linie = { starts, spread: starts.length > 1 ? t.r2(starts[starts.length - 1].t - starts[0].t) : 0, form: ln.form };
  // Welle: nebeneinander, wippt; Keil ohne Neu-Zusammensetzen
  const w = t.ent('kg_welle');
  const ws = w.members.map((mm) => [t.r2(mm.body.x), t.r2(mm.body.z)]);
  out.welle = { ws, span: t.r2(Math.hypot(ws[0][0] - ws[ws.length - 1][0], ws[0][1] - ws[ws.length - 1][1])), form: w.form };
  const kl = t.ent('kg_keil');
  const k0 = kl.members[0];
  const sk = t.stomp(k0, { h: 0.8 });
  t.hold(far, 120 * 6);
  out.keil = { ...sk, state: k0.state, defeated: k0.defeated, removed: k0.removed };
  return out;
});
console.log(`  Knochenflieger-Gruppe: ${JSON.stringify(kg)}`);
check(`Ring-Formation: 5 Flieger im Radius 1,8 m, Formation zieht ihre Bahn (${kg.ring.rs.join('/')}; ${kg.ring.moved} m)`, kg.ring.rs.every((r) => Math.abs(r - 1.8) < 0.05) && kg.ring.moved > 1 && kg.ring.formed === 5);
check(`Gemeinsamer Sturzflug: Ankündigung → Zange um die Figur (${kg.dive.seq}; ${kg.dive.diving} zugleich, ${kg.dive.minD} m), Treffer, zurück in Formation`, /fly>warn>dive>fly/.test(kg.dive.seq) && kg.dive.diving === 5 && kg.dive.minD < 0.9 && kg.dive.hurt && kg.dive.formed === 5);
check(`Draufspringen → Knochenhaufen am Boden (y ${kg.bones.landedY}), Zittern, setzt sich nach ${kg.bones.rebuildT} s neu zusammen`, kg.bones.bounced && kg.bones.bones.state === 'bones' && kg.bones.landedY !== null && kg.bones.landedY < 1.8 && kg.bones.shaking && kg.bones.rebuildT >= 3.9 && kg.bones.back === 'form' && kg.bones.rebuilds >= 1 && !kg.bones.defeated);
check('Stampfattacke auf den Knochenhaufen besiegt endgültig (zählt)', kg.pile.defeated && kg.pile.counted && kg.pile.state === 'gone');
check(`Power-up (Feuer) und Wurfsichel besiegen endgültig (${kg.power.alive} übrig); seitliche Berührung verletzt`, kg.power.fire && kg.power.sichel && kg.power.alive === 2 && kg.side === true);
check(`Kette: einer nach dem anderen (${kg.linie.starts.length} Flieger, ${kg.linie.spread} s gestaffelt)`, kg.linie.form === 'linie' && kg.linie.starts.length === 4 && kg.linie.spread >= 0.5);
check(`Welle nebeneinander (${kg.welle.span} m breit), Keil ohne Neu-Zusammensetzen (Draufspringen endgültig)`, kg.welle.form === 'welle' && kg.welle.span > 5 && kg.keil.bounced && kg.keil.defeated && kg.keil.state === 'gone');

// ---- Sandfiguren, Flatterkäfer mit Stern
const fig = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const s = t.ent('statue');
  // seitliches Anlaufen hält auf (fest), Draufspringen trägt
  t.place([s.pos.x + 2.2, 1, s.pos.z], { settle: 2 });
  for (let i = 0; i < 90; i++) { c.setInput({ x: -1 }); c.step(1); }
  c.setInput({});
  out.blocked = { x: t.r2(p.pos.x), broken: s.broken };
  // Stampfattacke zerstört sie, Stern erscheint über ihr und fällt auf den Sockel
  t.stomp(s, { pound: true, h: 1.5, max: 300 });
  t.hold([0, 1, s.pos.z], 240);
  const st = L.entities.find((e) => e.kind === 'star' && e.index === 1 && !e.removed);
  out.statue = { broken: s.broken, by: s.by, star: st ? { y: t.r2(st.pos.y), landed: !!st.landed } : null, sig: t.sig('sandfigurKaputt').length };
  // Pilzling-Skulptur: Pflaume-Ritt (reitende Figur) zerstört sie, Mini-Pilzlinge springen heraus
  const k = t.ent('skulptur');
  t.place([k.pos.x + 2.5, 1, k.pos.z], { settle: 2 });
  p.riding = true;
  for (let i = 0; i < 40 && !k.broken; i++) { p.pos.set(k.pos.x + k.half.x + p.half.x - 0.1, 1, k.pos.z); p.vel.set(0, 0, 0); c.step(1); }
  delete p.riding;
  t.hold([0, 1, k.pos.z], 90);
  out.skulptur = { broken: k.broken, by: k.by, minis: L.entities.filter((e) => e.kind === 'pilzling' && e.mini && /skulptur_mini/.test(e.spec.id ?? '')).length };
  // Flatterkäfer mit Stern: trägt ihn unberührbar, besiegt → Stern fällt herab
  const f = t.ent('fk_stern');
  t.hold([0, 1, t.Z(4, 6)], 60);
  const sk = f.carry?.star;
  out.carry = { idx: f.carried, dy: sk ? t.r2(f.pos.y - sk.pos.y) : null, touch: sk?.touch };
  const sto = t.stomp(f, { h: 0.9 });
  t.hold([0, 1, t.Z(4, 6)], 240);
  out.kaefer = { ...sto, defeated: f.defeated, dropped: f.starDropped, starY: sk ? t.r2(sk.pos.y) : null, starTouch: sk?.touch, landed: !!sk?.landed };
  // einsammeln
  if (sk && !sk.removed) { t.place([sk.pos.x, 1, sk.pos.z], { settle: 20 }); }
  out.collected = !!sk && sk.removed;
  return out;
});
console.log(`  Sandfiguren/Flatterkäfer: ${JSON.stringify(fig)}`);
check(`Baron-Sandstatue hält seitlich auf (x ${fig.blocked.x}), Stampfattacke zerbröselt sie, Stern fällt auf den Sockel (${JSON.stringify(fig.statue.star)})`, !fig.blocked.broken && fig.blocked.x > -14 && fig.statue.broken && fig.statue.by === 'stampfen' && fig.statue.star?.landed && fig.statue.sig >= 1);
check(`Pilzling-Sandskulptur: Pflaume-Ritt zerstört sie, ${fig.skulptur.minis} Mini-Pilzlinge springen heraus`, fig.skulptur.broken && fig.skulptur.by === 'ritt' && fig.skulptur.minis === 2);
check(`Flatterkäfer trägt den Stern unberührbar unter sich (${fig.carry.dy} m), besiegt → Stern fällt herab und ist einsammelbar`, fig.carry.idx === 2 && fig.carry.dy > 0.4 && fig.carry.touch === false && fig.kaefer.bounced && fig.kaefer.defeated && fig.kaefer.dropped && fig.kaefer.landed && fig.collected);
check('Keine Konsolenfehler (Teil 1)', errors.length === 0);
}

// =====================================================================================================================
// Teil 2: Geister, Ameisen, Schubser, Bestand, Wandstücke, Schockwelle, Lavapfütze, Wurfsichel
// =====================================================================================================================
if (want(2)) {
await load('0-32');
console.log('Teil 2: Geister, Ameisen, Schubser, Bestand, Wandstücke, Schockwelle, Lavapfütze, Wurfsichel');
const g2 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  // ---- Kreisgeister: Ring aus 11 kreist, Licht löst einen auf, das Modell blendet ihn aus
  const r = t.ent('kgk1');
  const a0 = r.angle;
  t.hold([0, 1, t.Z(5, 7)], 120);
  const g = r.members[3];
  for (let i = 0; i < 120 && !g.defeated; i++) { g.onLight(1 / 120, p); c.step(1); }
  t.hold([0, 1, t.Z(5, 7)], 90);
  out.ring = { turned: t.r2(Math.abs(r.angle - a0)), count: r.count, alive: r.aliveCount, gone: g.defeated, list: r.aliveList.filter((v) => !v).length, hurt: false };
  out.ring.hurt = t.touch(r.members[5], 20);
  t.fresh();
  // ---- Großspuk-Jäger: lauert, Auslöser → verfolgt unablässig (angeschaut nur langsam), Licht löst ihn auf
  const j = t.ent('gs_jaeger');
  const outside = [11.5, 1, t.Z(5, -4)];
  t.hold(outside, 120 * 2);
  out.lurk = { state: j.state, hunting: j.hunting };
  const trig = [11.5, 1, t.Z(5, 1)];
  t.place(trig, { settle: 1 });
  t.hold(trig, 10);
  out.trigger = { state: j.state, hunting: j.hunting };
  // weglaufen: weggeschaut folgt er schnell, angeschaut langsam
  const pA = [6, 1, t.Z(4, 2)];
  const d0 = Math.hypot(j.pos.x - pA[0], j.pos.z - pA[2]);
  for (let i = 0; i < 240; i++) { p.pos.set(pA[0], pA[1], pA[2]); p.vel.set(0, 0, 0); t.face(pA[0], pA[2] + 10); p.hurt = () => false; c.step(1); }
  const d1 = Math.hypot(j.pos.x - pA[0], j.pos.z - pA[2]);
  for (let i = 0; i < 240; i++) { p.pos.set(pA[0], pA[1], pA[2]); p.vel.set(0, 0, 0); t.face(j.pos.x, j.pos.z); p.hurt = () => false; c.step(1); }
  const d2 = Math.hypot(j.pos.x - pA[0], j.pos.z - pA[2]);
  delete p.hurt;
  out.hunt = { d0: t.r2(d0), away: t.r2(d0 - d1), looked: t.r2(d1 - d2), state: j.state };
  // Licht: Großspuk braucht 2,2 s
  let lt = 0;
  for (let i = 0; i < 400 && !j.defeated; i++) { j.onLight(1 / 120, p); c.step(1); lt += 1 / 120; }
  out.light = { defeated: j.defeated, t: t.r2(lt) };
  // ---- Hörner-Ameisen-Reihen: kommen aus dem Loch, laufen zum zweiten und verschwinden; Horn verletzt von oben
  const ar = t.ent('ameisen');
  const sp0 = ar.spawned;
  t.hold([0, 1, t.Z(6, 7)], 120 * 8);
  const ants = t.ents('ameisensoldat_horn');
  out.ants = { spawned: ar.spawned - sp0, alive: ar.aliveCount, streams: ar.streams.length, holes: ar.holes?.length ?? 0 };
  const an = ants.find((e) => e.state === 'walk' && e.s > 2);
  if (an) {
    out.ants.stompHurt = t.stomp(an, { h: 0.6 }).hurt;
    t.fresh();
    const an2 = t.ents('ameisensoldat_horn').find((e) => e.state === 'walk' && !e.defeated);
    out.ants.sichel = an2 ? (t.sichel(an2), an2.defeated) : null;
  }
  // ---- Schubser auf Plattformen: hinunterstoßen → besiegt, Signale je Schubser und für die ganze Gruppe
  const s1 = t.ent('sb1'), s2 = t.ent('sb2');
  t.hold([0, 1, t.Z(7, 7)], 60);
  s1.shoveBy({ pos: { x: s1.pos.x, y: s1.pos.y, z: s1.pos.z + 1 } }, 7, 'hit');
  t.hold([0, 1, t.Z(7, 7)], 120 * 2);
  const f1 = t.sig('schubserFall');
  s2.shoveBy({ pos: { x: s2.pos.x + 1, y: s2.pos.y, z: s2.pos.z } }, 7, 'hit');
  t.hold([0, 1, t.Z(7, 7)], 120 * 2);
  out.schubser = { s1: s1.defeated, s2: s2.defeated, fall: t.sig('schubserFall').map((s) => ({ id: s.data.id, left: s.data.left, by: s.data.by })), gruppe: t.sig('schubserGruppe').map((s) => s.data), first: f1.length };
  // ---- Bestand: Mini-Pilzlinge (Draufspringen), Krallen-Pilzling, Riesenschnappblume (Wurfsichel = 1 Treffer), Hackvogel
  const mi = t.ent('mini3');
  out.mini = t.stomp(mi, { h: 0.6 });
  out.mini.defeated = mi.defeated;
  const rb = t.ent('b_riesen');
  const hp0 = rb.hp;
  t.sichel(rb);
  out.riesen = { hp0, hp1: rb.hp };
  out.hack = { kind: t.ent('b_hack')?.kind, krallen: t.ent('b_krallen')?.kind };
  // ---- Wandstücke: Vorwarnung, bricht, stürzt und verletzt, wen es trifft; restore
  const bs = t.ent('bs_steg');
  const under = [bs.pos.x, 1, bs.pos.z];
  t.place(under, { settle: 2 });
  bs.startWarn(1.0);
  const warnSeq = [];
  let hurtUnder = false, warnT = 0;
  for (let i = 0; i < 120 * 3; i++) {
    p.pos.set(under[0], under[1], under[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (warnSeq[warnSeq.length - 1] !== bs.state) warnSeq.push(bs.state);
    if (bs.state === 'warn') warnT += 1 / 120;
    if (t.hurt()) hurtUnder = true;
  }
  out.stueck = { seq: warnSeq.join('>'), warnT: t.r2(warnT), hurtUnder, hurts: bs.hurts };
  bs.restore();
  c.step(2);
  out.stueck.restored = bs.state === 'ganz' && bs.shapeId != null;
  t.fresh();
  // ---- Schockwelle: am Boden verletzt, darüber springen nicht
  t.place([0, 1, t.Z(8, 2)], { settle: 2 });
  const w = L.spawn('schockwelle', { pos: [0, 1, t.Z(8, 2) - 5], radius: 8, r0: 0.5, speed: 7 });
  let hw = false;
  for (let i = 0; i < 120 && !w.removed; i++) { p.pos.set(0, 1, t.Z(8, 2)); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) hw = true; }
  t.fresh();
  const w2 = L.spawn('schockwelle', { pos: [0, 1, t.Z(8, 2) - 5], radius: 8, r0: 0.5, speed: 7 });
  let hw2 = false;
  for (let i = 0; i < 120 && !w2.removed; i++) { p.pos.set(0, 1.8, t.Z(8, 2)); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) hw2 = true; }
  out.welle = { ground: hw, jump: hw2, model: w.model && !w.model.placeholder };
  t.fresh();
  // ---- Lavapfütze: breitet sich aus (harmlos), heiß (verletzt), kühlt ab
  const pf = L.spawn('lavapfuetze', { pos: [3, 1, t.Z(8, 2)], size: 2.2, life: 2, grow: 0.5 });
  const seqP = [];
  let hurtGrow = false, hurtHot = false;
  for (let i = 0; i < 120 * 5 && !pf.removed; i++) {
    t.fresh();
    p.pos.set(3, 1, t.Z(8, 2)); p.vel.set(0, 0, 0);
    c.step(1);
    if (seqP[seqP.length - 1] !== pf.state) seqP.push(pf.state);
    if (t.hurt()) { if (pf.state === 'grow') hurtGrow = true; else hurtHot = true; }
  }
  out.pfuetze = { seq: seqP.join('>'), hurtGrow, hurtHot, removed: pf.removed };
  t.fresh();
  // ---- Wurfsichel bei allen neuen Arten
  const res = {};
  const kfg = L.spawn('knochenflieger_gruppe', { pos: [0, 4, t.Z(8, 10)], count: 3, sight: 0 });
  c.step(2);
  res.knochenflieger_glied = (t.sichel(kfg.members[0]), kfg.members[0].defeated);
  const sfl = L.spawn('sandflosser', { pos: [0, 1, t.Z(8, 12)], dir: [1, 0], dist: 3, every: 2.2, warn: 0.3, flight: 1.2 });
  t.until(() => sfl.state === 'jump' && sfl.stateT > 0.3, 120 * 4, [0, 1, t.Z(8, 2)]);
  res.sandflosser = (t.sichel(sfl), sfl.defeated);
  const sta = L.spawn('baron_sandstatue', { pos: [6, 1, t.Z(8, 12)] });
  res.baron_sandstatue = (t.sichel(sta), sta.broken);
  const sku = L.spawn('pilzling_sandskulptur', { pos: [-6, 1, t.Z(8, 12)] });
  res.pilzling_sandskulptur = (t.sichel(sku), sku.broken);
  const fk = L.spawn('flatterkaefer', { pos: [3, 2.5, t.Z(8, 12)], star: 9 });
  c.step(2);
  res.flatterkaefer = (t.sichel(fk), fk.defeated && fk.starDropped);
  const kl = L.spawn('baron_klon', { pos: [0, 1, t.Z(8, 4)], target: [0, 1, t.Z(8, 4)], pop: 0.05 });
  t.until(() => kl.state === 'run', 240, [0, 1, t.Z(8, 1)]);
  res.baron_klon = (t.sichel(kl), kl.state === 'burst');
  const sp = L.spawn('spuk', { pos: [-3, 1.4, t.Z(8, 4)], size: 2.5, hunt: true });
  res.spuk = (t.sichel(sp), !sp.defeated);
  out.sichel = res;
  return out;
});
console.log(`  Teil 2: ${JSON.stringify(g2)}`);
check(`Kreisgeist-Ring (11) kreist (${g2.ring.turned} rad), Licht löst einen auf (${g2.ring.alive} übrig, Modell-Liste), Berührung verletzt`, g2.ring.count === 11 && g2.ring.turned > 0.5 && g2.ring.gone && g2.ring.alive === 10 && g2.ring.list === 1 && g2.ring.hurt);
check(`Großspuk-Jäger lauert (${g2.lurk.state}) bis zum Auslöser (${g2.trigger.state}), verfolgt weggeschaut schnell (${g2.hunt.away} m), angeschaut langsam (${g2.hunt.looked} m)`, g2.lurk.state === 'lurk' && !g2.lurk.hunting && g2.trigger.hunting && g2.hunt.away > 3 && g2.hunt.looked > 0.3 && g2.hunt.looked < g2.hunt.away * 0.6);
check(`Licht-Helm besiegt den Großspuk (${g2.light.t} s Licht)`, g2.light.defeated && g2.light.t >= 2.1 && g2.light.t < 2.5);
check(`Hörner-Ameisen-Reihen: ${g2.ants.spawned} Ameisen aus ${g2.ants.streams} Löchern (${g2.ants.holes} Erdlöcher), Horn verletzt von oben, Wurfsichel besiegt`, g2.ants.spawned >= 4 && g2.ants.streams === 2 && g2.ants.holes === 2 && g2.ants.stompHurt === true && g2.ants.sichel === true);
check(`Schubser vom Podest gestoßen (fallDefeat) → besiegt, Signale schubserFall (${g2.schubser.fall.map((f) => f.left).join(', ')}) und schubserGruppe`, g2.schubser.s1 && g2.schubser.s2 && g2.schubser.fall.length === 2 && g2.schubser.fall[0].left === 1 && g2.schubser.fall[1].left === 0 && g2.schubser.fall[0].by === 'fall' && g2.schubser.gruppe.length === 1 && g2.schubser.gruppe[0].group === 'rad' && g2.schubser.gruppe[0].count === 2);
check(`Bestand: Mini-Pilzling von oben, Riesenschnappblume verliert mit der Wurfsichel einen Treffer (${g2.riesen.hp0} → ${g2.riesen.hp1}), Hackvogel, Krallen-Pilzling`, g2.mini.defeated && g2.riesen.hp1 === g2.riesen.hp0 - 1 && g2.hack.kind === 'hackvogel' && g2.hack.krallen === 'krallen_pilzling');
check(`Wandstück: Vorwarnung ${g2.stueck.warnT} s, bricht, stürzt und verletzt darunter (${g2.stueck.seq}), lässt sich zurücksetzen`, /ganz>warn>fall>weg/.test(g2.stueck.seq) && Math.abs(g2.stueck.warnT - 1) < 0.05 && g2.stueck.hurtUnder && g2.stueck.restored);
check('Schockwelle verletzt am Boden, nicht im Sprung darüber', g2.welle.ground === true && g2.welle.jump === false && g2.welle.model);
check(`Lavapfütze: breitet sich harmlos aus, heiß verletzt sie, kühlt ab (${g2.pfuetze.seq})`, /grow>hot>cool/.test(g2.pfuetze.seq) && !g2.pfuetze.hurtGrow && g2.pfuetze.hurtHot && g2.pfuetze.removed);
const SI = g2.sichel;
check(`Wurfsichel bei allen neuen Arten sinnvoll (${Object.entries(SI).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(', ')})`, Object.values(SI).every((v) => v === true));
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);
}

console.log(`Kennzahlen: ${JSON.stringify(KPI)}`);
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
