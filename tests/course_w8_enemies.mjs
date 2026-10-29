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
      /** Griff des Super-POW-Blocks (Motor-Baustein; als kind gespawnt zunächst die Hülle mit .handle). */
      pow: (id = 'superpow') => { const n = L.named.get(id); return n && n.handle && typeof n.handle.hit === 'function' ? n.handle : n; },
      /** Stoß gegen den Super-POW-Block, sobald er wieder bereit ist (Sperre cool) – höchstens n Schritte warten. */
      powHit(via = 'test', n = 240, at = null) {
        const h = window.__t.pow();
        for (let i = 0; i < n; i++) { if (h.hit(via)) return true; if (at) window.__t.until(() => false, 1, at); else c.step(1); }
        return false;
      },
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
  const kw0 = t.sig('keilWeg').length;
  out.keil.seq = [];
  for (const mm of kl.members.slice(1)) { mm.defeat(p); c.step(2); out.keil.seq.push(t.sig('keilWeg').length - kw0); }
  out.keil.onAll = t.sig('keilWeg').length - kw0;
  out.keil.gruppe = t.sig('knochenGruppe').filter((x) => x.data.id === 'kg_keil').map((x) => x.data.count);
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
check(`Alle Keil-Flieger endgültig besiegt → Aktion onAll (${kg.keil.onAll}×) und Signal knochenGruppe (${kg.keil.gruppe.join()})`, kg.keil.onAll === 1 && kg.keil.seq.join() === '0,0,0,1' && kg.keil.gruppe.length === 1 && kg.keil.gruppe[0] === 5);

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
  // ---- Riesenrad (Motor-Baustein): 4 Schubser fahren auf den Gondeln mit; alle hinuntergestoßen → schubserGruppe 'riesenrad'
  {
    const rad = t.ent('rad');
    const rs = ['rs1', 'rs2', 'rs3', 'rs4'].map((id) => t.ent(id));
    const onG = (e) => rad.gondolas.some((g) => { const sh = g.mb.shape; return e.pos.x > sh.min[0] - 0.2 && e.pos.x < sh.max[0] + 0.2 && e.pos.z > sh.min[2] - 0.2 && e.pos.z < sh.max[2] + 0.2 && Math.abs(e.pos.y - sh.max[1]) < 0.12; });
    const fig = [3, 1, -210];
    t.hold(fig, 30);
    const a0 = rad.angle, y0 = rs.map((e) => e.pos.y);
    const onStart = rs.map(onG);
    t.hold(fig, 120 * 2);
    const r = { onStart, turned: +(rad.angle - a0).toFixed(2), onGondel: rs.map(onG), dy: rs.map((e, i) => +(e.pos.y - y0[i]).toFixed(2)) };
    const g0 = t.sig('schubserGruppe').length, f0 = t.sig('schubserFall').length;
    for (const e of rs) {
      t.until(() => e.grounded && e.pos.y > 4.5, 120 * 25, fig);
      e.shoveBy({ pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z - 1 } }, 8, 'hit');
      t.hold(fig, 120 * 1.5);
    }
    t.hold(fig, 120);
    r.fall = t.sig('schubserFall').slice(f0).filter((x) => x.data.group === 'riesenrad').map((x) => x.data.left);
    r.gruppe = t.sig('schubserGruppe').slice(g0).map((x) => x.data);
    r.defeated = rs.map((e) => e.defeated);
    r.onGroup = t.sig('radStern').length;
    out.rad = r;
  }
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
  const warnSeq = [bs.state];
  bs.startWarn(1.0);
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
  const wModel = !!w.model && !w.model.placeholder && t.model(w);
  let hw = false;
  for (let i = 0; i < 120 && !w.removed; i++) { p.pos.set(0, 1, t.Z(8, 2)); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) hw = true; }
  t.fresh();
  const w2 = L.spawn('schockwelle', { pos: [0, 1, t.Z(8, 2) - 5], radius: 8, r0: 0.5, speed: 7 });
  let hw2 = false;
  for (let i = 0; i < 120 && !w2.removed; i++) { p.pos.set(0, 1.8, t.Z(8, 2)); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) hw2 = true; }
  out.welle = { ground: hw, jump: hw2, model: wModel };
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
check(`Riesenrad (Motor): 4 Schubser stehen auf Gondeln und fahren mit (${g2.rad.dy.join(' / ')} m), hinuntergestoßen → besiegt (${g2.rad.fall.join(', ')}), schubserGruppe 'riesenrad' (${g2.rad.gruppe[0]?.count})`, g2.rad.onStart.every(Boolean) && g2.rad.onGondel.every(Boolean) && g2.rad.turned > 0.25 && g2.rad.dy.some((d) => Math.abs(d) > 0.3) && g2.rad.defeated.every(Boolean) && g2.rad.fall.join() === '3,2,1,0' && g2.rad.gruppe.length === 1 && g2.rad.gruppe[0].group === 'riesenrad' && g2.rad.gruppe[0].count === 4 && g2.rad.onGroup === 1);
check(`Bestand: Mini-Pilzling von oben, Riesenschnappblume verliert mit der Wurfsichel einen Treffer (${g2.riesen.hp0} → ${g2.riesen.hp1}), Hackvogel, Krallen-Pilzling`, g2.mini.defeated && g2.riesen.hp1 === g2.riesen.hp0 - 1 && g2.hack.kind === 'hackvogel' && g2.hack.krallen === 'krallen_pilzling');
check(`Wandstück: Vorwarnung ${g2.stueck.warnT} s, bricht, stürzt und verletzt darunter (${g2.stueck.seq}), lässt sich zurücksetzen`, /ganz>warn>fall>weg/.test(g2.stueck.seq) && Math.abs(g2.stueck.warnT - 1) < 0.05 && g2.stueck.hurtUnder && g2.stueck.restored);
check('Schockwelle verletzt am Boden, nicht im Sprung darüber', g2.welle.ground === true && g2.welle.jump === false && g2.welle.model);
check(`Lavapfütze: breitet sich harmlos aus, heiß verletzt sie, kühlt ab (${g2.pfuetze.seq})`, /grow>hot>cool/.test(g2.pfuetze.seq) && !g2.pfuetze.hurtGrow && g2.pfuetze.hurtHot && g2.pfuetze.removed);
const SI = g2.sichel;
check(`Wurfsichel bei allen neuen Arten sinnvoll (${Object.entries(SI).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(', ')})`, Object.values(SI).every((v) => v === true));
check('Keine Konsolenfehler (Teil 2)', errors.length === 0);
}

// =====================================================================================================================
// Teil 3: Endgegner (0-33) – goldene Würfelblase, rosa Schlangenkönig, Schattenläuferin 2, Baron Brummbär im Krallen-Anzug
// =====================================================================================================================
const BOSS_HELPERS = () => {
  const c = window.__course, t = window.__t, L = c.level;
  t.arch = () => c.state().archetype;
  /** Arena betreten: von start in Richtung −z gehen, bis der Kampf mit Endgegner id beginnt. */
  t.enter = (start, id, n = 1200) => {
    c.player.reset(start, Math.PI / 2);
    L.runtime.setCheckpoint(start, Math.PI / 2);
    t.place(start, { settle: 2 });
    for (let i = 0; i < n && !(c.arch.started && c.arch.boss === t.ent(id)); i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({});
    return t.arch();
  };
  t.banners = [];
  const hud = c.arch?.hud;
  if (hud && !hud._w8) { const orig = hud.banner.bind(hud); hud.banner = (text, o) => { t.banners.push(text); orig(text, o); }; hud._w8 = true; }
  /** Laufenden Kampf abbrechen (Bilder: nächste Arena). */
  t.leave = () => { const a = c.arch; if (a?.started) a.resetFight(); };
  /** Figur sterben lassen und am Checkpoint neu beginnen (wie der Motor). */
  t.die = () => {
    const p = c.player;
    delete p.hurt;
    p.invuln = 0;
    p.die('hit');
    for (let i = 0; i < 120 * 6 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
    c.step(30);
    return { dead: p.dead, status: L.runtime.status, deaths: c.arch?.deaths };
  };
};

if (want(3)) {
await load('0-33');
await sc(BOSS_HELPERS);
console.log('Teil 3: Endgegner – goldene Würfelblase, rosa Schlangenkönig, Schattenläuferin 2');

// ---- goldene Würfelblase
const gb = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('blase8');
  const a = t.enter([0, 2, 9.5], 'blase8');
  out.start = { started: a.started, gold: b.gold, air: b.val('air', [9]), flee: b.val('fleeSpeed', [9]), model: !!b.model && !b.model.placeholder };
  // erste Riesen-Landung: zwei goldene Schockwellen; die Figur steht 4 m daneben am Boden → getroffen
  t.until(() => b.state === 'gair', 120 * 20, [4, 2, 4]);
  const j = b.jump;
  const fig = [j.x1 + 4.5 * Math.sign(-j.x1 || 1), 2, j.z1];
  const w0 = L.entities.filter((e) => e.kind === 'schockwelle').length;
  let maxW = 0, hurt = false, spawned = 0;
  const seen = new Set();
  p.invuln = 0;
  for (let i = 0; i < 300; i++) {
    p.pos.set(fig[0], fig[1], fig[2]); p.vel.set(0, 0, 0);
    c.step(1);
    const ws = L.entities.filter((e) => e.kind === 'schockwelle' && !e.removed);
    for (const w of ws) seen.add(w);
    maxW = Math.max(maxW, ws.length);
    if (t.hurt()) hurt = true;
  }
  spawned = [...seen].filter((w) => w.owner === b && w.color === 'gold').length;
  out.wave = { spawned, maxW, hurt, waveHits: b.waveHits, landings: b.landings, w0 };
  t.fresh();
  // drei Hut-Treffer in der Flucht → besiegt, Stern
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.until(() => b.state === 'flee' && b.vulnerable, 120 * 40, [8, 2, 6]);
    const r = t.stomp(b, { h: 1.2, max: 200 });
    hits.push({ ...r, hp: b.hp });
    t.fresh();
  }
  t.until(() => b.state === 'gone', 120 * 8, [8, 2, 6]);
  for (let i = 0; i < 60; i++) c.step(1);
  out.hits = hits;
  out.end = { state: b.state, hp: b.hp, won: t.arch().won, star: L.entities.some((e) => e.kind === 'star' && e.index === 0), waves: L.entities.filter((e) => e.kind === 'schockwelle' && !e.removed).length };
  return out;
});
console.log(`  Goldene Würfelblase: ${JSON.stringify(gb)}`);
check(`Goldene Würfelblase: golden und etwas schneller (Flug ${gb.start.air} s, Flucht ${gb.start.flee} m/s)`, gb.start.started && gb.start.gold && gb.start.air === 1.1 && gb.start.flee === 3.4 && gb.start.model);
check(`Riesen-Landung: ${gb.wave.spawned} goldene Schockwellen, treffen die Figur am Boden daneben`, gb.wave.spawned >= 2 && gb.wave.hurt && gb.wave.waveHits >= 1);
check(`3 Kopftreffer (${gb.hits.map((h) => h.hp).join(' → ')}) → besiegt, Stern, Sieg`, gb.hits.length === 3 && gb.hits.every((h) => h.bounced) && gb.end.hp === 0 && gb.end.state === 'gone' && gb.end.won && gb.end.star && gb.end.waves === 0);

// ---- rosa Schlangenkönig
const rk = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('koenig8');
  const a = t.enter([0, 2, -60 + 9.6], 'koenig8');
  out.start = { started: a.started, rosa: b.rosa, model: !!b.model && !b.model.placeholder };
  // Lavabrocken fliegen auf die Figur und hinterlassen Lavapfützen
  const fig = [4, 2, -60 + 7];
  t.until(() => b.puddlesMade >= 1, 120 * 20, fig);
  const rocks = L.entities.filter((e) => e.kind === 'felsbrocken' && e.lava);
  const pf = b.puddles.find((q) => !q.removed);
  out.puddle = { made: b.puddlesMade, lavaRocks: rocks.length + b.puddlesMade, state: pf?.state, model: pf?.model && !pf.model.placeholder };
  // wer in der heißen Pfütze steht, wird verletzt
  if (pf) {
    t.until(() => pf.state === 'hot' || pf.removed, 240, fig);
    t.fresh();
    let hurt = false;
    for (let i = 0; i < 60 && !pf.removed; i++) { p.pos.set(pf.pos.x, pf.pos.y, pf.pos.z); p.vel.set(0, 0, 0); c.step(1); if (t.hurt()) { hurt = true; break; } }
    out.puddle.hurt = hurt;
    t.fresh();
  }
  // drei Kopftreffer im Fenster (vom Teller bzw. von oben)
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.until(() => b.state === 'lean' && b.stateT > 0.8 && b.vulnerable, 120 * 40, [0, 2, -60 + 9.5]);
    const r = t.stomp(b, { h: 1.0, max: 200 });
    hits.push({ ...r, hp: b.hp });
    t.fresh();
  }
  out.maxPuddles = b.puddlesMade;
  t.until(() => b.state === 'gone', 120 * 8, [0, 2, -60 + 9.5]);
  t.hold([0, 2, -60 + 9.5], 240);
  out.hits = hits;
  out.end = { state: b.state, won: t.arch().won, hot: L.entities.filter((e) => e.kind === 'lavapfuetze' && !e.removed && e.hot).length, star: L.entities.some((e) => e.kind === 'star' && e.index === 1) };
  return out;
});
console.log(`  Rosa Schlangenkönig: ${JSON.stringify(rk)}`);
check('Rosa Schlangenkönig: rosa Modell, Ablauf wie 3-B', rk.start.started && rk.start.rosa && rk.start.model);
check(`Geschleuderte Lavabrocken hinterlassen Lavapfützen (${rk.maxPuddles}), heiß verletzen sie`, rk.puddle.made >= 1 && rk.puddle.model && rk.puddle.hurt === true);
check(`3 Kopftreffer (${rk.hits.map((h) => h.hp).join(' → ')}) → besiegt, Pfützen kühlen ab, Stern`, rk.hits.length === 3 && rk.end.state === 'gone' && rk.end.won && rk.end.hot === 0 && rk.end.star);

// ---- Schattenläuferin 2
const s2 = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('schatten8');
  const a = t.enter([0, 2, -110 + 7], 'schatten8');
  out.start = { started: a.started, round: b.round, tempo: b.tempo };
  const hits = [];
  for (let k = 0; k < 3 && b.hp > 0; k++) {
    t.until(() => b.vulnerable && (b.state === 'idle' || b.state === 'idle2') && b.appearances > k, 120 * 30, [0, 2, -110 + 7.5]);
    const r = t.stomp(b, { h: 1.0, max: 200 });
    hits.push({ ...r, hp: b.hp, clones: b.cloneLog.slice() });
    t.fresh();
  }
  t.until(() => b.state === 'gone', 120 * 8, [0, 2, -110 + 7.5]);
  out.hits = hits;
  out.end = { state: b.state, won: t.arch().won, cloneLog: b.cloneLog.slice() };
  return out;
});
console.log(`  Schattenläuferin 2: ${JSON.stringify(s2)}`);
check(`Schattenläuferin 2: zweiter Kampf, schneller (tempo ${s2.start.tempo})`, s2.start.started && s2.start.round === 2 && s2.start.tempo > 1.1);
check(`Mehr Doppelgänger je Phase (${s2.end.cloneLog.join(', ')}), 3 Treffer → besiegt`, s2.end.cloneLog[0] === 3 && s2.end.cloneLog.includes(4) && s2.end.cloneLog.includes(6) && s2.hits.length === 3 && s2.end.state === 'gone' && s2.end.won);

// ---- Baron Brummbär im Krallen-Anzug: Turm unten
console.log('Teil 3: Baron Brummbär im Krallen-Anzug');
const bt = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('baron');
  const ZD = -170, Y = 2;
  out.wait = { state: b.state, visible: b.visible, model: !!b.model && !b.model.placeholder };
  // Wandstücke: Zeitpunkte der Vorwarnung und des Einbruchs mitschreiben
  const wlog = [];
  for (const id of ['wand1', 'wand2', 'wand3']) {
    const w = t.ent(id), sw = w.startWarn.bind(w), bn = w.breakNow.bind(w);
    w.startWarn = (...a) => { const r = sw(...a); if (r) wlog.push({ id, warn: L.time }); return r; };
    w.breakNow = (...a) => { const r = bn(...a); const e = wlog.find((x) => x.id === id); if (r && e) e.broke = L.time; return r; };
  }
  const a = t.enter([0, Y, ZD + 10], 'baron');
  out.start = { started: a.started, state: b.state, section: b.section?.id, hud: a.hud?.boss?.hp, max: a.hud?.boss?.max };
  t.until(() => b.state === 'climb', 600, [0, Y, ZD + 3]);
  // klettert vor der Figur: immer lead m über ihr
  const lead = [];
  for (const [fx, fy] of [[0, Y], [2.2, Y + 6], [-2.2, Y + 9]]) {
    const pos = [fx, fy, ZD - 1];
    t.until(() => false, 120 * 5, pos);
    lead.push(t.r2(b.pos.y - fy));
  }
  out.lead = lead;
  // Angriffe: Feuerbälle (Bogen mit Landemarke), Krallenhieb auf ein Wandstück (Vorwarnung), Rutschen
  // Figur auf dem Sims schräg unter ihm: Feuerbälle (Bogen mit Landemarke), Rutschen auf sie (Berührung verletzt)
  t.place([-0.6, Y + 9, ZD - 2.2], { settle: 1 });
  let marks = 0, slideHurt = false, slid = false;
  const fire0 = b.fireballs;
  const pos0 = [-0.6, Y + 9, ZD - 2.2];
  for (let i = 0; i < 120 * 30 && !(slid && b.state === 'climb'); i++) {
    if (b.state === 'slide') { slid = true; delete p.hurt; } else p.hurt = () => false;
    p.pos.set(pos0[0], pos0[1], pos0[2]); p.vel.set(0, 0, 0);
    c.step(1);
    if (b.state === 'slide' && t.hurt()) slideHurt = true;
    marks = Math.max(marks, b.markers.count);
    if (t.hurt()) t.fresh();
  }
  delete p.hurt;
  out.attacks = { fireballs: b.fireballs - fire0, marks, swipes: b.swipes, broken: b.wallsBroken, warn: wlog.filter((x) => x.broke).map((x) => t.r2(x.broke - x.warn)), slides: b.slides, slideHurt };
  t.fresh();
  // Kontakt: seitlich verletzt, von oben Abprall ohne Schaden; Wurfsichel: zuckt (kein Schaden)
  const bb = b.bounces;
  out.stomp = t.stomp(b, { h: 1.0, max: 200 });
  out.stomp.bounces = b.bounces - bb;
  t.fresh();
  const f0 = b.flinches;
  t.until(() => b.state === 'climb' && b.flinchT <= 0, 600, [0, Y, ZD + 2]);
  t.sichel(b);
  out.sichel = { flinches: b.flinches - f0, hp: b.hp };
  // oben: Wache am POW-Block mit Sperre; POW → weggeschleudert, Weg frei
  const top = [-2.4, Y + 15, ZD - 3.6];
  t.place(top, { settle: 2 });
  t.until(() => b.state === 'guard' || b.state === 'fire' && b.guarding, 120 * 15, top);
  const sperre = L.world.overlapAABB({ x: 2.6, y: Y + 16, z: ZD - 8.6 }, { x: 0.2, y: 0.2, z: 0.2 }).some((s) => s.tag === 'baron-sperre');
  out.guard = { state: b.state, guarding: b.guarding, sperre };
  const pow = t.ent('pow_turm');
  pow.fire();
  const sig0 = t.sig('baronPow').length;
  t.until(() => b.state === 'between', 120 * 4, top);
  const sperre2 = L.world.overlapAABB({ x: 2.6, y: Y + 16, z: ZD - 8.6 }, { x: 0.2, y: 0.2, z: 0.2 }).some((s) => s.tag === 'baron-sperre');
  out.pow = { state: b.state, done: b.done.slice(), signal: t.sig('baronPow').length - sig0 + sig0, sperre: sperre2, powHit: b.powHit, cur: b.cur, banner: t.banners.includes('Weg frei!') };
  return out;
});
console.log(`  Baron Turm: ${JSON.stringify(bt)}`);
check(`Baron wartet sichtbar am Turmfuß, Kampf beginnt am Auslöser (Lebensleiste ${bt.start.hud}/${bt.start.max})`, bt.wait.visible && bt.wait.model && bt.start.started && bt.start.section === 'unten' && bt.start.max === 4 && bt.start.hud === 4);
check(`Klettert vor der Figur den Turm hinauf (${bt.lead.join(' / ')} m über ihr)`, bt.lead.every((d) => d > 2.6 && d < 4.4));
check(`Feuerbälle im Bogen mit Landemarke (${bt.attacks.fireballs}), Krallenhiebe reißen Wandstücke ein (${bt.attacks.broken}; Vorwarnung ${bt.attacks.warn.join('/')} s), Rutschen auf die Figur verletzt`, bt.attacks.fireballs >= 1 && bt.attacks.marks >= 1 && bt.attacks.broken >= 1 && bt.attacks.warn.length >= 1 && bt.attacks.warn.every((w) => w >= 1.2) && bt.attacks.slides >= 1 && bt.attacks.slideHurt);
check('Von oben Abprall ohne Schaden; Wurfsichel lässt ihn zucken (kein Schaden)', bt.stomp.bounced && !bt.stomp.hurt && bt.stomp.bounces >= 1 && bt.sichel.flinches === 1 && bt.sichel.hp === 4);
check('Oben bewacht er den POW-Block (Sperre vor der Kanone)', bt.guard.guarding && bt.guard.sperre);
check(`POW-Block getroffen → weggeschleudert, Sperre fällt, Signal baronPow, Abschnitt geschafft (${JSON.stringify(bt.pow.done)})`, bt.pow.state === 'between' && bt.pow.done[0] === true && bt.pow.signal >= 1 && !bt.pow.sperre && bt.pow.powHit === 1 && bt.pow.cur === 1 && bt.pow.banner);

// ---- Baron: oberer Turm (Spiegelfrüchte, Doppelgänger, Wegstücke) und Neustart nach Tod
const bo = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('baron');
  const ZU = -215, U = 22;
  // durch die Kanone (Warp-Box) nach oben
  t.place([0, U, ZU + 2.2], { settle: 2 });
  L.runtime.setCheckpoint([0, U, ZU + 2.2], Math.PI / 2);
  for (let i = 0; i < 300 && b.state === 'between'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  out.begin = { state: b.state, section: b.section?.id, started: t.arch().started };
  // Figur folgt ihm die Plattformen entlang; er frisst eine Frucht → Doppelgänger stürmen die Bahnen, Wegstücke zerbröckeln
  const path = [[0, U, ZU + 1], [0, U + 1, ZU - 4], [0, U + 2, ZU - 9]];
  let k = 0;
  for (let i = 0; i < 120 * 14 && b.eaten < 1; i++) { t.until(() => false, 1, path[Math.min(path.length - 1, Math.floor(i / 300))]); k = i; }
  out.eat1 = { eaten: b.eaten, state: b.state };
  t.until(() => b.clonesMade >= 2, 240, [0, U + 2, ZU - 9]);
  const clones = b.clones.slice();
  out.clones1 = { made: b.clonesMade, model: clones[0]?.model && !clones[0].model.placeholder, lanes: clones.map((q) => !!q.lane) };
  t.until(() => clones.every((q) => q.state === 'run'), 240, [0, U + 2, ZU - 9]);
  // Neustart nach Tod: nur dieser Abschnitt beginnt von vorn
  const before = { s1: t.ent('steg1').state, done: b.done.slice() };
  out.die = t.die();
  out.reset = { state: b.state, cur: b.cur, done: b.done.slice(), eaten: b.section.eaten ?? 0, clones: b.clones.length, stege: ['steg1', 'steg2', 'steg3', 'steg4'].map((id) => t.ent(id).state), before };
  // zweiter Versuch: Abschnitt bis zum Ende
  t.place([0, U, ZU + 2.2], { settle: 2 });
  for (let i = 0; i < 300 && b.state === 'wait'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  out.again = { state: b.state, started: t.arch().started };
  const steps = [[0, U, ZU + 1], [0, U + 1, ZU - 4], [0, U + 2, ZU - 9], [0, U + 2, ZU - 13], [0, U + 3, ZU - 16], [0, U + 4, ZU - 19]];
  let stomped = 0, maxClones = 0;
  const sec = b.section;
  for (let i = 0; i < 120 * 26 && (sec.eaten ?? 0) < 2; i++) {
    t.until(() => false, 1, steps[Math.min(steps.length - 1, Math.floor(i / 240))]);
    maxClones = Math.max(maxClones, b.clones.length);
  }
  // einen stürmenden Doppelgänger von oben besiegen: platzt in Funken
  for (let i = 0; i < 120 * 3 && !stomped; i++) {
    const q = b.clones.find((x) => x.state === 'run' && x.stateT > 0.2);
    if (q) { const r = t.stomp(q, { h: 0.8, max: 200 }); stomped = r.bounced && q.state === 'burst' ? 1 : -1; t.fresh(); break; }
    t.until(() => false, 1, [0, U + 4, ZU - 19]); maxClones = Math.max(maxClones, b.clones.length);
  }
  for (let i = 0; i < 120 * 4; i++) t.until(() => false, 1, [0, U + 4, ZU - 19]);
  out.full = { eaten: sec.eaten, made: b.clonesMade, maxClones, stomped, broken: ['steg1', 'steg2', 'steg3', 'steg4'].filter((id) => t.ent(id).breaks > 0), byKlon: ['steg1', 'steg2', 'steg3', 'steg4'].filter((id) => t.ent(id).by === 'klon').length };
  // Ende des oberen Turms: er springt davon
  t.until(() => b.state === 'between', 120 * 6, [0, U + 4, ZU - 23]);
  out.end = { state: b.state, done: b.done.slice(), cur: b.cur, clones: b.clones.length };
  return out;
});
console.log(`  Baron oben: ${JSON.stringify(bo)}`);
check(`Oberer Turm beginnt nach der Kanone (${bo.begin.state}, ${bo.begin.section})`, bo.begin.section === 'oben' && bo.begin.state !== 'between');
check(`Er frisst eine Spiegelfrucht und vervielfacht sich (${bo.clones1.made} Doppelgänger auf Sturm-Bahnen, Modell clone)`, bo.eat1.eaten === 1 && bo.clones1.made >= 2 && bo.clones1.model && bo.clones1.lanes.every(Boolean));
check(`Tod im Kampf: nur der obere Turm beginnt von vorn (Stege ${bo.reset.stege.join('/')}, Turm unten bleibt geschafft)`, bo.reset.state === 'wait' && bo.reset.cur === 1 && bo.reset.done[0] === true && bo.reset.clones === 0 && bo.reset.eaten === 0 && bo.reset.stege.every((s) => s === 'ganz'));
check(`Zweiter Versuch: beide Früchte (${bo.full.made} Doppelgänger, höchstens ${bo.full.maxClones} zugleich), Wegstücke zerbröckeln unter ihnen (${bo.full.broken.join(', ')}), Draufspringen lässt einen platzen`, bo.again.started && bo.full.eaten === 2 && bo.full.made >= 5 && bo.full.maxClones <= 4 && bo.full.broken.length >= 1 && bo.full.byKlon >= 1 && bo.full.stomped === 1);
check('Am Ende des oberen Turms springt er zum Gipfel (Abschnitt geschafft)', bo.end.state === 'between' && bo.end.done[1] === true && bo.end.cur === 2);

// ---- Baron: Gipfel mit Super-POW-Block bis zum Sieg
const bg = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('baron');
  const ZG = -270, G = 32;
  t.place([0, G, ZG + 10.8], { settle: 2 });
  L.runtime.setCheckpoint([0, G, ZG + 10.8], Math.PI / 2);
  for (let i = 0; i < 300 && b.state === 'between'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  const blk = t.pow();
  out.begin = { state: b.state, section: b.section?.id, block: blk ? (blk.kind ?? (typeof blk.top === 'number' ? 'super_pow_block (Motor)' : 'Griff')) : null, glass: !!b.glass, hp: b.hp };
  t.until(() => b.state === 'perch', 600, [0, G, ZG + 8]);
  out.perch = { y: t.r2(b.pos.y), top: t.r2(b.powTop()) };
  // Angriffe von oben in Phase 1: Feuerbälle mit Landemarken
  const f0 = b.fireballs;
  t.until(() => b.fireballs > f0, 120 * 8, [5, G, ZG + 6]);
  out.fire = { n: b.fireballs - f0, marks: b.markers.count };
  // Kopfstoß von unten gegen den Super-POW-Block: der Baron wird hochgeschleudert und taumelt
  const under = [0, G, ZG - 1];
  const bump = () => {
    t.fresh();
    t.place(under, { settle: 2 });
    p.hurt = () => false;
    c.setInput({ jump: true });
    let hit = false;
    const h0 = b.powHits;
    for (let i = 0; i < 90 && !hit; i++) { c.step(1); if (b.powHits > h0) hit = true; }
    c.setInput({});
    delete p.hurt;
    return hit;
  };
  const log = [];
  const phases = [];
  for (let k = 0; k < 4 && b.hp > 0; k++) {
    t.until(() => b.state === 'perch' && b.stateT > 0.3, 120 * 10, [6, G, ZG + 6]);
    if (k === 1) {
      // Phase 2: Sprung-Schockwellen um den Block
      const w0 = b.wavesN;
      t.until(() => b.wavesN > w0, 120 * 12, [7, G, ZG + 7]);
      phases.push({ phase: b.phase, waves: b.wavesN - w0 });
    }
    if (k === 2) {
      // Phase 3: Doppelgänger springen herab
      const c0 = b.clonesMade;
      t.until(() => b.clonesMade > c0, 120 * 14, [7, G, ZG + 7]);
      phases.push({ phase: b.phase, clones: b.clonesMade - c0 });
      t.until(() => b.state === 'perch' && b.stateT > 0.3, 120 * 10, [7, G, ZG + 7]);
    }
    const hit = bump();
    const st = [];
    for (let i = 0; i < 120 * 3; i++) { t.until(() => false, 1, [6, G, ZG + 6]); if (st[st.length - 1] !== b.state) st.push(b.state); if (b.state === 'flyaway') break; }
    log.push({ hit, hp: b.hp, hud: t.arch().hud?.boss?.hp, seq: st.join('>') });
  }
  out.log = log;
  out.phases = phases;
  // Flucht mit Hut in der Tatze, Glas zerbricht, Freunde jubeln, Glasröhre erscheint, Abspann-Signal
  const sig0 = t.sig('finaleWon').length;
  t.until(() => b.state === 'gone', 120 * 8, [6, G, ZG + 6]);
  t.hold([6, G, ZG + 6], 240);
  const warp = t.ent('glasroehre');
  out.win = { state: b.state, won: t.arch().won, glass: b.glassState, finale: t.sig('finaleWon').length - sig0, frei: t.sig('freundeFrei').length, warpHidden: warp?.hidden, credits: L.creditsWanted ?? null, banners: t.banners.filter((x) => /Freunde|Ojemine|besiegt/.test(x)) };
  // in die Glasröhre → Zielplateau
  t.place([warp.pos.x, warp.pos.y + 2.2, warp.pos.z], { settle: 0 });
  for (let i = 0; i < 400 && p.pos.z < -300 === false; i++) { p.hurt = () => false; c.step(1); }
  delete p.hurt;
  out.warp = { z: t.r2(p.pos.z), y: t.r2(p.pos.y) };
  return out;
});
console.log(`  Baron Gipfel: ${JSON.stringify(bg)}`);
check(`Gipfel: Super-POW-Block (${bg.begin.block}), Glas der Freunde, Baron obenauf (y ${bg.perch.y} = ${bg.perch.top})`, bg.begin.section === 'gipfel' && !!bg.begin.block && bg.begin.glass && Math.abs(bg.perch.y - bg.perch.top) < 0.05);
check(`Phase 1: Feuerbälle mit Landemarken (${bg.fire.n})`, bg.fire.n >= 1 && bg.fire.marks >= 1);
check(`Super-POW-Block 4× angestoßen (${bg.log.map((l) => `${l.hp}`).join(' → ')}): je Stoß hochgeschleudert und taumelnd, Lebensleiste 4 Stufen`, bg.log.length === 4 && bg.log.every((l) => l.hit) && bg.log.map((l) => l.hp).join() === '3,2,1,0' && bg.log.slice(0, 3).every((l) => /launched>stunned/.test(l.seq)) && /defeated>flyaway/.test(bg.log[3].seq) && bg.log[2].hud === 1);
check(`Phasen: Sprung-Schockwellen (${JSON.stringify(bg.phases)}) und Doppelgänger`, bg.phases[0]?.waves >= 1 && bg.phases[1]?.clones >= 2);
check(`Nach dem 4. Stoß fliegt er davon, das Glas zerbricht, die Freunde jubeln, Glasröhre erscheint, Signal finaleWon, Abspann angefordert (${bg.win.credits})`, bg.win.state === 'gone' && bg.win.won && bg.win.glass.break === 1 && bg.win.glass.cheer === 1 && bg.win.finale === 1 && bg.win.frei === 1 && bg.win.warpHidden === false && bg.win.credits === 'nach-ziel');
check(`Glasröhre führt zum Zielplateau (z ${bg.warp.z})`, bg.warp.z < -300);

// ---- Neustart nach Tod auf dem Gipfel (frisches Level)
await load('0-33');
await sc(BOSS_HELPERS);
const br = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, L = c.level;
  const out = {};
  const b = t.ent('baron');
  // Abschnitte 1 und 2 als geschafft markieren (Prüfstand): direkt zum Gipfel
  b.done[0] = true; b.done[1] = true; b.cur = 2; b.state = 'between'; b.visible = false;
  const ZG = -270, G = 32;
  t.place([0, G, ZG + 10.8], { settle: 2 });
  L.runtime.setCheckpoint([0, G, ZG + 10.8], Math.PI / 2);
  for (let i = 0; i < 300 && b.state === 'between'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  out.start = { state: b.state, started: t.arch().started };
  t.until(() => b.state === 'perch', 600, [0, G, ZG + 8]);
  t.powHit('test');
  t.until(() => b.state === 'perch', 120 * 4, [6, G, ZG + 6]);
  out.hit = { hp: b.hp };
  out.die = t.die();
  out.after = { state: b.state, hp: b.hp, powHits: b.powHits, cur: b.cur, waves: L.entities.filter((e) => e.kind === 'schockwelle' && !e.removed).length, clones: b.clones.length, powReset: typeof t.pow().reset === 'function' };
  // zurück in den Auslöser: der Gipfelkampf beginnt wieder (mit den verbliebenen Stufen)
  t.place([0, G, ZG + 10.8], { settle: 2 });
  for (let i = 0; i < 300 && b.state === 'wait'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  t.until(() => b.state === 'perch', 600, [0, G, ZG + 8]);
  out.again = { state: b.state, hp: b.hp, y: t.r2(b.pos.y), top: t.r2(b.powTop()) };
  return out;
});
console.log(`  Baron Neustart: ${JSON.stringify(br)}`);
check(`Tod auf dem Gipfel setzt nur den Gipfel zurück (Baron ${br.after.hp}/4, Block ${br.after.powHits} Stöße ${br.after.powReset ? 'zurückgesetzt' : 'bleiben (Motor-Block ohne reset)'})`, br.hit.hp === 3 && br.after.state === 'wait' && br.after.cur === 2 && br.after.hp === 4 - br.after.powHits && (br.after.powReset ? br.after.powHits === 0 : br.after.powHits === 1) && br.after.clones === 0 && br.after.waves === 0);
check(`Wieder in den Auslöser: Gipfelkampf beginnt neu (${br.again.state}, ${br.again.hp}/4, Baron auf dem gesunkenen Block y ${br.again.y} = ${br.again.top})`, br.again.state === 'perch' && br.again.hp === br.after.hp && Math.abs(br.again.y - br.again.top) < 0.05);
check('Keine Konsolenfehler (Teil 3)', errors.length === 0);
}

// =====================================================================================================================
// Teil 4: Bilder tests/out/w8e_*.png und Zeichenaufrufe
// =====================================================================================================================
if (want(4)) {
await load('0-32');
console.log('Teil 4: Bilder');
const S = {};
S.sandflosser = await SHOT('w8e', 'sandflosser_sprung', () => {
  const c = window.__course, t = window.__t, f = t.ent('sf_stern');
  const fig = [-11.5, 1, t.Z(1, -1.5)];
  t.place(fig, { settle: 1 });
  t.until(() => f.state === 'jump' && f.stateT > f.flightT * 0.42, 120 * 8, fig);
  t.face(f.pos.x, f.pos.z);
});
S.sandMarke = await SHOT('w8e', 'sandflosser_marke', () => {
  const c = window.__course, t = window.__t, f = t.ent('sf_ziel');
  const fig = [10, 1, t.Z(1, 0.8)];
  t.place(fig, { settle: 1 });
  t.until(() => f.state !== 'warn', 120 * 8, fig);
  t.until(() => f.state === 'warn' && f.stateT > 0.4, 120 * 8, fig);
  t.face(f.pos.x, f.pos.z);
});
S.ring = await SHOT('w8e', 'knochenflieger_ring_sturzflug', () => {
  const c = window.__course, t = window.__t, g = t.ent('kg_ring');
  const fig = [g.mid.x + 1, 1, g.mid.z + 1];
  t.place(fig, { settle: 1 });
  t.until(() => g.state === 'dive' && g.members.some((m) => m.state === 'dive' && m.stateT > m.diveT * 0.3), 120 * 8, fig);
  t.face(g.mid.x, g.mid.z - 2);
});
S.haufen = await SHOT('w8e', 'knochenflieger_haufen', () => {
  const c = window.__course, t = window.__t, g = t.ent('kg_linie');
  const fig = [11.5, 1, t.Z(2, 2.5)];
  t.hold(fig, 240);
  for (const m of g.members.slice(0, 2)) { m.collapse(c.player); }
  t.hold(fig, 120 * 2);
  const m2 = g.members[2]; m2.collapse(c.player);
  t.hold(fig, 120 * 3.9);
  t.face(11.5, t.Z(2, 7));
});
S.welle = await SHOT('w8e', 'knochenflieger_welle_keil', () => {
  const c = window.__course, t = window.__t;
  t.place([-11.5, 1, t.Z(3, 2.5)], { settle: 60 });
  t.face(-11.5, t.Z(3, 8));
});
S.figuren = await SHOT('w8e', 'sandfiguren_flatterkaefer', () => {
  const c = window.__course, t = window.__t;
  t.place([-11.5, 1, t.Z(4, 0.6)], { settle: 90 });
  t.face(-11.5, t.Z(4, 7));
});
S.geister = await SHOT('w8e', 'kreisgeister', () => {
  const c = window.__course, t = window.__t;
  t.place([-11.5, 1, t.Z(5, 0.6)], { settle: 60 });
  t.face(-11.5, t.Z(5, 7));
});
S.jaeger = await SHOT('w8e', 'grossspuk_jaeger', () => {
  const c = window.__course, t = window.__t, j = t.ent('gs_jaeger');
  t.place([11.5, 1, t.Z(5, 1)], { settle: 1 });
  t.hold([11.5, 1, t.Z(5, 1)], 120 * 1.5);
  t.face(11.5, t.Z(5, -6));
});
S.ameisen = await SHOT('w8e', 'ameisen_reihen', () => {
  const c = window.__course, t = window.__t;
  t.place([-11.5, 1, t.Z(6, 0.6)], { settle: 120 * 3 });
  t.face(-11.5, t.Z(6, 7));
});
S.schubser = await SHOT('w8e', 'schubser_minis', () => {
  const c = window.__course, t = window.__t;
  t.place([-11.5, 1, t.Z(7, 0.6)], { settle: 90 });
  t.face(-11.5, t.Z(7, 7));
});
S.riesenrad = await SHOT('w8e', 'riesenrad_schubser', () => {
  const c = window.__course, t = window.__t;
  t.place([-3, 1, -207], { settle: 240 });
  t.face(-8, -219);
});
S.massen = await SHOT('w8e', 'massen_44_kreisgeister_24_knochenflieger', () => {
  const c = window.__course, t = window.__t;
  t.place([0, 1, t.Z(9, 8)], { settle: 90 });
  t.face(0, t.Z(9, 16));
});
const zmax = Math.max(...Object.values(S).map((s) => s.calls));
KPI.zoo = { calls: zmax, massen: S.massen.calls, tris: Math.round(Math.max(...Object.values(S).map((s) => s.triangles)) / 1000) };
console.log(`  Zeichenaufrufe Gegnerzoo: ${Object.entries(S).map(([k, s]) => `${k} ${s.calls}`).join(', ')}; höchstens ${KPI.zoo.tris} k Dreiecke`);
check(`Massen-Feld (44 Kreisgeister, 24 Knochenflieger): ${S.massen.calls} Zeichenaufrufe < 120`, S.massen.calls < 120);
check(`Gegnerzoo: Zeichenaufrufe < 120 (höchstens ${zmax})`, zmax < 120);

await load('0-33');
await sc(BOSS_HELPERS);
const B = {};
B.blase = await SHOT('w8e', 'blase_gold_schockwelle', () => {
  const c = window.__course, t = window.__t, b = t.ent('blase8');
  t.enter([0, 2, 9.5], 'blase8');
  t.until(() => b.state === 'gair', 120 * 20, [5, 2, 5]);
  const fig = [b.jump.x1 + 5, 2, b.jump.z1 + 3];
  t.until(() => b.goldWaves.some((w) => !w.removed && w.r > 3), 120 * 4, fig);
  t.face(b.pos.x, b.pos.z);
});
B.koenig = await SHOT('w8e', 'koenig_rosa_lavapfuetzen', () => {
  const c = window.__course, t = window.__t, b = t.ent('koenig8');
  t.leave();
  t.enter([0, 2, -60 + 9.6], 'koenig8');
  t.until(() => b.puddles.filter((q) => !q.removed && q.state !== 'cool').length >= 2 && b.state === 'throw', 120 * 30, [4, 2, -60 + 7]);
  t.face(0, -60);
});
B.schatten = await SHOT('w8e', 'schattenlaeuferin2_doppelgaenger', () => {
  const c = window.__course, t = window.__t, b = t.ent('schatten8');
  t.leave();
  t.enter([0, 2, -110 + 7], 'schatten8');
  t.until(() => b.state === 'throw' && b.clones.length >= 3 && b.stateT > 0.5, 120 * 20, [0, 2, -110 + 7.5]);
  t.face(0, -110);
});
B.turm = await SHOT('w8e', 'baron_turm_klettern', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.leave();
  t.enter([0, 2, -160], 'baron');
  t.until(() => b.state === 'climb' && b.pos.y > 4.5, 120 * 8, [2.2, 8, -171]);
  t.until(() => b.state === 'fire' && b.stateT > 0.5, 120 * 8, [2.2, 8, -171]);
  t.face(0, -175);
});
B.hieb = await SHOT('w8e', 'baron_krallenhieb_wandstueck', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.until(() => b.state === 'swipe' && b.stateT > b.swipeWarn + 0.3, 120 * 25, [-2.2, 11, -171]);
  t.face(0, -175);
});
B.pow = await SHOT('w8e', 'baron_pow_wache', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.place([-2.4, 17, -173.6], { settle: 2 });
  t.until(() => b.state === 'guard' && b.stateT > 0.6, 120 * 15, [-2.4, 17, -173.6]);
  t.face(b.pos.x, b.pos.z);
});
B.geworfen = await SHOT('w8e', 'baron_pow_geschleudert', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.ent('pow_turm').fire();
  t.until(() => b.state === 'thrown' && b.stateT > 0.35, 240, [-2.4, 17, -173.6]);
  t.face(b.pos.x, b.pos.z);
});
B.spiegel = await SHOT('w8e', 'baron_spiegel_doppelgaenger', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.place([0, 22, -212.8], { settle: 2 });
  c.level.runtime.setCheckpoint([0, 22, -212.8], Math.PI / 2);
  for (let i = 0; i < 300 && b.state === 'between'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  const steps = [[0, 22, -214], [0, 23, -219], [0, 24, -224]];
  for (let i = 0; i < 120 * 14 && !(b.clones.length >= 2 && b.clones.every((q) => q.state === 'run' && q.stateT > 0.3)); i++) t.until(() => false, 1, steps[Math.min(2, Math.floor(i / 300))]);
  t.face(0, -228);
});
B.gipfel = await SHOT('w8e', 'baron_gipfel_superpow', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  b.finishSection('');
  t.place([0, 32, -259.2], { settle: 2 });
  c.level.runtime.setCheckpoint([0, 32, -259.2], Math.PI / 2);
  for (let i = 0; i < 300 && b.state === 'between'; i++) { c.setInput({ y: 0.6 }); c.step(1); }
  c.setInput({});
  t.until(() => b.state === 'fire' && b.stateT > 0.6, 120 * 10, [4, 32, -264]);
  t.face(0, -271);
});
B.stoss = await SHOT('w8e', 'baron_superpow_stoss', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.until(() => b.state === 'perch', 120 * 6, [4, 32, -264]);
  t.powHit('test', 240, [4, 32, -264]);
  t.until(() => b.state === 'launched' && b.stateT > 0.5, 240, [4, 32, -264]);
  t.face(0, -271);
});
B.flucht = await SHOT('w8e', 'baron_flucht_glas', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  for (let k = 0; k < 6 && b.hp > 0; k++) { t.until(() => b.state === 'perch' || b.state === 'stunned', 120 * 6, [4, 32, -264]); t.powHit('test', 240, [4, 32, -264]); t.hold([4, 32, -264], 30); }
  t.until(() => b.state === 'flyaway' && b.stateT > 0.5, 120 * 8, [4, 32, -264]);
  t.face(0, -271);
});
B.freunde = await SHOT('w8e', 'freunde_frei', () => {
  const c = window.__course, t = window.__t, b = t.ent('baron');
  t.until(() => b.glassState.cheer === 1, 120 * 8, [2, 32, -265]);
  t.hold([2, 32, -265], 60);
  t.face(b.glassPos.x, b.glassPos.z);
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
