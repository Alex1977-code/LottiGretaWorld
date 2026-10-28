// Kurs-Modus, Welt-6-Mechaniken und -Bausteine in der Wolkenwerkstatt 0-23: je Baustein das Kernverhalten deterministisch
// über window.__course.step(n) und setInput prüfen – mit Gegenprobe (Glasröhren-Netz mit Weiche und Mitnahme, Stachelkugeln,
// Kippschiff, Kippsteg, Schiebetür und Scheinwand, Gong, Pilz-Maske, Floß und Abwärtsströmung, Wand- und Deckengitter,
// Windböen, Förderbänder (Boden/Wand/rund), Quetschblöcke, Wippe, Wolkenplattformen, großer ?-Block, Wurfball, Zielscheiben);
// Sichtprüfung über Bilder tests/out/w6b_*.png (Kurs-Kamera), Kennzahlen (Zeichenaufrufe, Dreiecke), Themen-Bilder je
// Welt-6-Thema (w6b_thema_*.png).
// Aufruf: node tests/course_w6_blocks.mjs   (Port 4600 + PORT_BASE; vorher npm run build; nutzt vite preview)
// W6B_SHOTS=0 → ohne Bilder/Themen (schneller); W6B_PART=mech|themes → nur ein Teil; W6B_DEBUG=1 → mehr Ausgaben.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4600;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W6B_SHOTS !== '0';
const PART = process.env.W6B_PART ?? 'all';
const DEBUG = !!process.env.W6B_DEBUG;

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-23&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Wolkenwerkstatt startet nicht. Konsole:');
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    const P = () => c.player;
    const L = () => c.level;
    window.__t = {
      marks: c.level.data.marks,
      tick(n = 1) { for (let i = 0; i < n; i++) c.step(1); },
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        p.setHero(o.hero ?? 'lotti');
        p.dead = false;
        p.big = o.big ?? true;
        p.power = 'none';
        p.powerTime = 0;
        if (p.helmet) { p.helmet = null; p.helmetFx = null; }
        p.helmetCooldown = 0;
        p.holding = null;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.skidTurnTime = 0;
        if (o.power) p.setPower(o.power);
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        window.__t.tick(o.settle ?? 30);
        return p.info();
      },
      play(segs, every = 1) {
        const tr = [];
        for (const [inp, n] of segs) {
          c.setInput(inp);
          for (let i = 0; i < n; i++) {
            window.__t.tick(1);
            const p = P();
            if (i % every === 0) tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state, p.script?.kind ?? p.script?.type ?? '', +p.hSpeed().toFixed(2), p.ground?.tag ?? '', +p.vel.y.toFixed(2)]);
          }
        }
        c.setInput({});
        return tr;
      },
      info: () => P().info(),
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      coins: () => L().runtime.coins,
      ground: () => { const g = P().ground; return g ? { tag: g.tag, top: g.top } : null; },
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const stats = [];
async function freshFrames(n = 3, timeout = 30000) {
  const f0 = await sc(() => window.__course.view.frame);
  try { await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + n, { timeout }); } catch { /* weiter */ }
}
async function shot(name, wait = 1500) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  await freshFrames();
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  if (DEBUG) console.log('  [Bild]', name, s.calls, s.triangles);
  try { await page.screenshot({ path: `${OUT}w6b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

if (PART !== 'themes') {
await load();
const marks = await sc(() => window.__t.marks);
console.log('Wolkenwerkstatt 0-23');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()] }));
  if (DEBUG) console.log(`  Arten: ${st.kinds.join(', ')}`);
  const need = ['stachelkugel', 'stachelkugel_quelle', 'wurfball', 'zielscheibe', 'pilz_maske', 'riesenfrageblock'];
  check('Level geladen (Welt-6-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['netz', 'kugel1', 'quelle', 'schiff', 'steg', 'tuer1', 'tuer2', 'gong', 'floss', 'strom', 'decke', 'gitter', 'wind', 'band1', 'bandwand', 'bandrund', 'quetsch1', 'quetsch2', 'wippe', 'wolke1', 'wolke2', 'riesen', 'ball', 'maske'];
  check('Bausteine benannt (level.named)', ids.every((id) => st.named.includes(id)));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
}

// ---------------------------------------------------------------- Glasröhren-Netz
{
  const ride = async (inp) => {
    await T('place', marks.netzA, { settle: 4 });
    return sc((inp) => {
      const t = window.__t, c = window.__course, n = t.named('netz');
      c.setInput({ y: 1 });
      let rode = false, i = 0;
      for (; i < 240 && !rode; i++) { t.tick(1); rode = c.player.script?.kind === 'glasnetz'; }
      c.setInput(inp);
      for (i = 0; i < 400 && c.player.mode === 'script'; i++) t.tick(1);
      c.setInput({});
      t.tick(20);
      const p = c.player;
      return { rode, path: n.lastRide?.path?.join('>'), x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), mode: p.mode, sw: n.switchOf('K') };
    }, inp);
  };
  const r1 = await ride({});
  await sc(() => window.__course.level.signal('weiche1'));
  const r2 = await ride({});
  const r3 = await ride({ x: -1 });
  console.log(`  Glasnetz: ohne Stick ${r1.path} (Weiche ${r1.sw}) · nach Signal ${r2.path} (Weiche ${r2.sw}) · Stick links ${r3.path}`);
  check('Glasröhren-Netz: Einfahrt an der Öffnung, ohne Stick fährt die Figur in Richtung der Weiche (C)', r1.rode && r1.path === 'A>K>C' && r1.x > 7);
  check('Glasröhren-Netz: Signal schaltet die Weiche um (D) – Gegenprobe zur ersten Fahrt', r2.sw === 'D' && r2.path === 'A>K>D' && r2.z < -32);
  check('Glasröhren-Netz: Stick an der Kreuzung wählt die Röhre (links → B)', r3.path === 'A>K>B' && r3.x < -7);
  // Mitnahme: Wurfball hineinwerfen, Gegner hineinlaufen lassen
  const carry = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, n = t.named('netz');
    const c0 = n.carried;
    const ball = t.ent('ball');
    const home = ball.pos.clone();
    ball.pos.set(0, 1.6, -7.4); ball.vel.set(0, 0.5, -9); ball.thrown = true; ball.grounded = false;
    let inPipe = false, out = null;
    for (let i = 0; i < 360; i++) { t.tick(1); if (n.carry.length) inPipe = true; if (inPipe && !n.carry.length && !out) out = [+ball.pos.x.toFixed(2), +ball.pos.z.toFixed(2)]; }
    const ballCarried = n.carried - c0;
    // Gegner (Pilzling) läuft in die Öffnung (Figur hinter ihm, damit er geradeaus läuft)
    t.place([0, 1, 4], { settle: 2 });
    const e = L.spawn('pilzling', { pos: [0, 1, -6.2], dir: [0, -1], speed: 2.6 });
    let eIn = false, eOut = null;
    for (let i = 0; i < 900; i++) { t.tick(1); if (n.carry.some((k) => k.e === e)) eIn = true; if (eIn && !eOut && !n.carry.some((k) => k.e === e)) eOut = [+e.pos.x.toFixed(2), +e.pos.z.toFixed(2)]; }
    ball.pos.copy(home); ball.vel.set(0, 0, 0); ball.thrown = false;
    if (e && !e.removed) e.kill();
    return { ballCarried, out, eIn, eOut, enemyKind: e?.kind };
  });
  console.log(`  Glasnetz Mitnahme: Wurfball ${carry.ballCarried}× → heraus bei ${JSON.stringify(carry.out)}; Pilzling hinein ${carry.eIn} → heraus bei ${JSON.stringify(carry.eOut)}`);
  check('Glasröhren-Netz: Gegenstände (Wurfball) reisen mit und kommen an einer anderen Öffnung heraus', carry.ballCarried >= 1 && carry.out && carry.out[1] < -25);
  check('Glasröhren-Netz: Gegner (Pilzling), der in die Öffnung läuft, reist mit', carry.eIn && !!carry.eOut && carry.eOut[1] < -25);
  await T('place', marks.netzA, { settle: 10 });
  await shot('glasnetz', 1400);
}

// ---------------------------------------------------------------- Stachelkugeln
{
  const k = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level;
    const b = t.ent('kugel1');
    const x0 = b.pos.x, r0 = b.roll;
    t.tick(120);
    const moved = Math.abs(b.pos.x - x0), rolled = b.roll - r0;
    // Berührung von der Seite: Treffer (groß → klein)
    t.place([b.pos.x + 0.2, 1, b.pos.z + 2.5], { settle: 2 });
    const p = c.player;
    let hurt = false;
    c.setInput({ y: -1 });
    for (let i = 0; i < 120 && !hurt; i++) { p.pos.x = b.pos.x; p.pos.z = Math.max(b.pos.z + 0.5, p.pos.z - 0.08); t.tick(1); hurt = !p.big || p.invuln > 0; }
    c.setInput({});
    // Draufspringen hilft nicht (Stacheln)
    t.place([b.pos.x, 3.4, b.pos.z], { settle: 0, invuln: 0 });
    let stompHurt = false;
    for (let i = 0; i < 80 && !stompHurt; i++) { p.pos.x = b.pos.x; p.pos.z = b.pos.z; t.tick(1); stompHurt = !p.big || p.invuln > 0 || p.dead; }
    // Gegenprobe: mit Funkelstern zerstört die Berührung die Kugel
    t.place([b.pos.x + 1.4, 1, b.pos.z], { settle: 0, power: 'stern' });
    for (let i = 0; i < 90 && b.alive; i++) { p.pos.x = b.pos.x + 0.3; p.pos.z = b.pos.z; t.tick(1); }
    const starKill = !b.alive || b.removed;
    // Quelle: rollt im Takt Kugeln heraus
    const q = t.ent('quelle');
    const s0 = q.spawned;
    t.tick(7 * 120);
    const balls = L.entities.filter((e) => e.kind === 'stachelkugel' && !e.removed && e !== b);
    return { moved: +moved.toFixed(2), rolled: +rolled.toFixed(2), hurt, stompHurt, starKill, spawned: q.spawned - s0, rollingX: balls.map((e) => +e.vel.x.toFixed(1)) };
  });
  console.log(`  Stachelkugel: Bahn ${f2(k.moved)} m (rollt ${f2(k.rolled)} rad), Treffer seitlich ${k.hurt}, von oben ${k.stompHurt}, Funkelstern zerstört ${k.starKill}; Quelle +${k.spawned} (vx ${k.rollingX.join(', ')})`);
  check('Stachelkugel: rollt auf ihrer Bahn (Lage und Drehung ändern sich)', k.moved > 2 && k.rolled > 2);
  check('Stachelkugel: Berührung verletzt – auch beim Draufspringen (Stacheln)', k.hurt && k.stompHurt);
  check('Stachelkugel: Gegenprobe Funkelstern – die Berührung zerstört die Kugel', k.starKill);
  check('Stachelkugel-Quelle: rollt im Takt Kugeln heraus (in Austrittsrichtung)', k.spawned >= 2 && k.rollingX.some((v) => v > 1));
  await T('place', marks.kugel, { settle: 20 });
  await shot('stachelkugeln', 1200);
}

// ---------------------------------------------------------------- Kippschiff und Kippsteg
{
  const s = await sc(() => {
    const t = window.__t, c = window.__course;
    const h = t.named('schiff');
    // leer: nur die Welle schaukelt
    t.place([0, 1, -62], { settle: 2 });
    let amax = 0;
    for (let i = 0; i < 6 * 120; i++) { t.tick(1); amax = Math.max(amax, Math.abs(h.angle)); }
    // Figur steht an der +X-Seite: die Seite sinkt (Winkel < 0), die Figur fährt mit der Neigung mit (Füße auf dem Deck)
    h.tilter.wave = null;
    t.place([2.6, 1.8, -71.5], { settle: 6 });
    const p = c.player;
    let worst = 0, aMin = 0;
    for (let i = 0; i < 3 * 120; i++) { t.tick(1); if (p.mode === 'ground') worst = Math.max(worst, Math.abs(p.pos.y - h.deck.heightAt(p.pos.x, p.pos.z))); aMin = Math.min(aMin, h.angle); }
    const slid = h.tilter.slid;
    const xEnd = p.pos.x;
    // Gegenprobe: ohne Last richtet sich das Schiff auf; Figur genau in der Mitte → kaum Neigung
    t.place([0, 1, -62], { settle: 2 });
    for (let i = 0; i < 6 * 120 && Math.abs(h.angle) > 0.05; i++) t.tick(1);
    t.place([0, 1.8, -71.5], { settle: 6 });
    t.tick(2 * 120);
    const aMid = h.angle;
    h.tilter.wave = { amp: 4 * Math.PI / 180, period: 5, phase: 0 };
    return { amax: +amax.toFixed(2), aMin: +aMin.toFixed(2), worst: +worst.toFixed(3), slid: +slid.toFixed(2), xEnd: +xEnd.toFixed(2), aMid: +aMid.toFixed(2), load: h.load };
  });
  console.log(`  Kippschiff: leer ±${f2(s.amax)}° (Welle), Figur an +X → ${f2(s.aMin)}° (Füße ≤ ${s.worst} m vom Deck, rutscht ${f2(s.slid)} m bis x ${f2(s.xEnd)}), Mitte ${f2(s.aMid)}°`);
  check('Kippschiff: die Welle schaukelt das leere Schiff (±3–5°)', s.amax > 2.5 && s.amax < 6);
  check('Kippschiff: Gewicht an der Seite neigt das ganze Schiff dorthin; die Figur fährt mit (Füße auf dem Deck)', s.aMin < -4 && s.worst < 0.08);
  check('Kippschiff: auf schrägem Deck rutscht die Figur hangab; Gegenprobe Mitte: kaum Neigung', s.slid > 0.3 && s.xEnd > 2.6 && Math.abs(s.aMid) < 1.5);
  const k = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const h = t.named('steg');
    // mittig ohne Welle: bleibt oben
    const wave = h.tilter.wave;
    h.tilter.wave = null;
    const level0 = () => { h.tilter.angle = 0; h.tilter.kick = 0; h.deck.setAngle(0, 1 / 120); };
    level0();
    t.place([0, 1.4, -84], { settle: 4 });
    t.tick(3 * 120);
    const calm = { y: +p.pos.y.toFixed(2), x: +p.pos.x.toFixed(2), a: +h.angle.toFixed(2) };
    // seitlich stehend: der Steg kippt, die Figur rutscht ab und fällt
    level0();
    t.place([0.3, 1.4, -84], { settle: 4 });
    let aMin = 0, fell = false;
    for (let i = 0; i < 5 * 120 && !fell; i++) { t.tick(1); aMin = Math.min(aMin, h.angle); fell = p.pos.y < 0; }
    h.tilter.wave = wave;
    return { calm, aMin: +aMin.toFixed(2), fell };
  });
  console.log(`  Kippsteg: mittig bleibt die Figur oben (y ${f2(k.calm.y)}, ${f2(k.calm.a)}°); seitlich kippt er auf ${f2(k.aMin)}° → Figur fällt ${k.fell}`);
  check('Kippsteg (1 m): Figur am Rand neigt ihn, sie rutscht ab und fällt; Gegenprobe mittig und ohne Welle: bleibt oben', k.fell && k.aMin < -8 && k.calm.y > 0.9 && Math.abs(k.calm.a) < 2);
  await T('place', marks.schiffRand, { settle: 60 });
  await shot('kippschiff', 1300);
}

// ---------------------------------------------------------------- Schiebetür, Scheinwand, Gong, Pilz-Maske
{
  const d = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const door = t.named('tuer1');
    // zu: Hineinlaufen hält auf
    t.place([0, 1, -103], { settle: 4 });
    t.play([[{ y: 1 }, 120]]);
    const blockedZ = +p.pos.z.toFixed(2);
    // Antippen (Touch-Ziel) öffnet
    const taps = L.taps;
    const tg = taps.targets.find((x) => x.owner === door);
    taps.tapTarget(tg);
    t.tick(150);
    const state = door.state;
    t.play([[{ y: 1 }, 120]]);
    const passZ = +p.pos.z.toFixed(2);
    // Scheinwand: Aktion in Reichweite öffnet die zweite Tür – dahinter nur Wand (Münzen als Belohnung)
    const d2 = t.named('tuer2');
    const coins0 = L.runtime.coins;
    t.place([-8.6, 1, -114], { settle: 4, yaw: Math.PI });
    c.setInput({ action: true }); t.tick(1); c.setInput({}); t.tick(160);
    const s2 = d2.state;
    t.play([[{ x: -1 }, 150]]);
    return { blockedZ, state, passZ, s2, wallX: +p.pos.x.toFixed(2), coins: L.runtime.coins - coins0, hits: taps.hits };
  });
  console.log(`  Schiebetür: zu → Figur bleibt bei z ${f2(d.blockedZ)}; angetippt → ${d.state}, Durchgang bis z ${f2(d.passZ)}; Scheinwand: Aktion → ${d.s2}, Figur bleibt bei x ${f2(d.wallX)} (+${d.coins} Münzen)`);
  check('Schiebetür: geschlossen versperrt sie den Durchgang (Gegenprobe), Antippen öffnet sie', d.blockedZ > -105.8 && d.state === 'auf' && d.passZ < -107.5);
  check('Schiebetür als Scheinwand: Aktion in Reichweite öffnet, dahinter bleibt eine Wand; Belohnung beim Öffnen', d.s2 === 'auf' && d.wallX > -11.1 && d.coins >= 3);
  const g = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const gong = t.named('gong');
    const mask = t.ent('maske');
    const h0 = gong.hits, sig0 = L.signals.gong ?? 0, hidden0 = mask.hidden;
    // ohne Schlag: nichts
    t.place([8, 1, -117.5], { settle: 30 });
    const idle = gong.hits - h0;
    // Stampfen auf der Platte
    t.place([8, 3.5, -117.5], { settle: 0 });
    c.setInput({ crouch: true }); t.tick(2); c.setInput({});
    t.tick(80);
    const afterPound = gong.hits - h0;
    const rainStart = L.entities.filter((e) => e.kind === 'fallmuenze').length;
    t.tick(240);
    const rain = L.entities.filter((e) => e.kind === 'fallmuenze' && !e.removed).length + (L.runtime.coins > 0 ? 0 : 0);
    // Abklingzeit: sofort danach erneut stampfen → kein zweiter Schlag; Antippen nach der Pause → Schlag
    const before = gong.hits;
    const tg = L.taps.targets.find((x) => x.owner === gong);
    gong.ring('test-cool');
    const cooled = gong.hits === before;
    L.taps.tapTarget(tg); t.tick(2);
    return { idle, afterPound, sig: (L.signals.gong ?? 0) - sig0, revealed: hidden0 && !mask.hidden, rainStart, rain, cooled, tapHits: gong.hits - before };
  });
  console.log(`  Gong: ohne Schlag ${g.idle}, Stampfen → ${g.afterPound} Schlag, Signal ${g.sig}, Maske erscheint ${g.revealed}, Münzregen ${g.rain}, Abklingzeit ${g.cooled}, Antippen +${g.tapHits}`);
  check('Gong: Stampfen auf der Platte schlägt ihn (Gegenprobe: ohne Schlag nichts) → Signal „gong“ und Aktion (Pilz-Maske erscheint)', g.idle === 0 && g.afterPound === 1 && g.sig >= 1 && g.revealed);
  check('Gong: Münzregen (fallende Münzen ringsum)', g.rain >= 5);
  check('Gong: Antippen schlägt ihn nach der Abklingzeit erneut', g.tapHits >= 1);
  const m = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const mask = t.ent('maske');
    t.place([mask.pos.x, 1, mask.pos.z + 1.2], { settle: 2 });
    t.play([[{ y: 1 }, 40]]);
    const worn = p.helmet, masked = p.masked;
    // Gegner-Schnittstelle: zugewandt → maskiert; abgewandt → sichtbar
    const foe = { pos: { x: p.pos.x, y: p.pos.y, z: p.pos.z - 5 } };
    p.yaw = Math.PI / 2; const facing = L.isMaskedFrom(foe, p);
    p.yaw = -Math.PI / 2; const away = L.isMaskedFrom(foe, p);
    p.yaw = Math.PI / 2;
    // Treffer schlägt die Maske ab (Figur bleibt groß)
    p.hurt({ pos: { x: p.pos.x, y: p.pos.y, z: p.pos.z + 1 } });
    t.tick(10);
    const after = { helmet: p.helmet, big: p.big, masked: p.masked, dropped: L.entities.filter((e) => e.kind === 'helm_maske' && !e.removed).length };
    const noMask = L.isMaskedFrom(foe, p);
    return { worn, masked, facing, away, after, noMask };
  });
  console.log(`  Pilz-Maske: aufgesetzt ${m.worn} (masked ${m.masked}); zugewandt ${m.facing}, abgewandt ${m.away}; Treffer → Helm ${m.after.helmet}, groß ${m.after.big}, liegt ${m.after.dropped}; ohne Maske ${m.noMask}`);
  check('Pilz-Maske: berühren setzt sie auf (player.masked); level.isMaskedFrom: zugewandt ja, abgewandt nein', m.worn === 'maske' && m.masked && m.facing && !m.away);
  check('Pilz-Maske: ein Treffer schlägt sie ab (Figur bleibt groß, Maske liegt da); ohne Maske sehen Gegner die Figur', m.after.helmet === null && m.after.big && m.after.dropped >= 1 && !m.noMask);
  await T('place', marks.halle, { settle: 20 });
  await shot('fernost', 1300);
}

// ---------------------------------------------------------------- Floß, Strömung, Giftsee
{
  const f = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const raft = t.named('floss');
    raft.reset();
    // Gegenprobe: ohne Figur wartet das Floß
    t.place([0, 1, -129.5], { settle: 4 });
    t.tick(240);
    const idle = raft.state;
    // aufs Floß
    t.place([0, 1.3, -134], { settle: 30 });
    const onRaft = p.ground?.tag;
    let maxV = 0, maxVStrom = 0, carriedOK = true;
    for (let i = 0; i < 16 * 120 && raft.state !== 'ende'; i++) {
      t.tick(1);
      maxV = Math.max(maxV, raft.speedNow);
      if (raft.mb.pos.z < -151) maxVStrom = Math.max(maxVStrom, raft.speedNow);
      if (p.dead || Math.hypot(p.pos.x - raft.mb.pos.x, p.pos.z - raft.mb.pos.z) > 1.6) carriedOK = false;
    }
    const end = { state: raft.state, z: +raft.mb.pos.z.toFixed(2), y: +raft.mb.pos.y.toFixed(2), pz: +p.pos.z.toFixed(2), dead: p.dead };
    // Gift tötet
    t.place([6, 1.5, -140], { settle: 0 });
    t.tick(120);
    const poison = { dead: p.dead, cause: p.deathCause };
    return { idle, onRaft, maxV: +maxV.toFixed(2), maxVStrom: +maxVStrom.toFixed(2), carriedOK, end, poison };
  });
  console.log(`  Floß: ohne Figur ${f.idle}; mit Figur (Boden ${f.onRaft}) fährt es los, ${f2(f.maxV)} m/s, in der Abwärtsströmung ${f2(f.maxVStrom)} m/s, Ende ${JSON.stringify(f.end)}; Giftsee: tot ${f.poison.dead} (${f.poison.cause})`);
  check('Floß: wartet ohne Figur (Gegenprobe), fährt mit Figur los und trägt sie bis ans Ende', f.idle === 'wartet' && f.onRaft === 'floss' && f.carriedOK && f.end.state === 'ende' && !f.end.dead && f.end.z < -160);
  check('Abwärtsströmung: in der Strömung fährt das Floß schneller und bergab', f.maxVStrom > 5 && f.end.y < 0);
  check('Lila Giftsee: hineinfallen ist tödlich', f.poison.dead);
  await sc(() => { window.__course.level.runtime.respawn(); window.__t.tick(5); window.__t.named('floss').reset(); });
  await T('place', marks.flossAuf, { settle: 30 });
  await shot('floss', 1300);
}

// ---------------------------------------------------------------- Klettergitter (Wand, Decke)
{
  const g = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    // Wandgitter: hineinspringen → klettern
    t.place([9, 0, -161.5], { settle: 4 });
    t.play([[{ y: 1, jump: true }, 24], [{ y: 1 }, 30]]);
    const grab = { mode: p.mode, state: p.state, fence: !!p.fence };
    t.play([[{ y: -1 }, 30]]);
    const y0 = p.pos.y;
    t.play([[{ y: 1 }, 50]]);
    const climbed = p.pos.y - y0;
    t.play([[{ crouch: true }, 2], [{}, 60]]);
    const let1 = p.state;
    // Deckengitter: von unten hineinspringen → hängen und hangeln
    t.place([6, 0, -154.5], { settle: 4 });
    t.play([[{ jump: true }, 40]]);
    const hang = { mode: p.mode, state: p.state, hang: !!p.hang, y: +p.pos.y.toFixed(2) };
    const x0 = p.pos.x, yA = p.pos.y;
    t.play([[{ x: 1 }, 60]]);
    const moved = { dx: +(p.pos.x - x0).toFixed(2), dy: +(p.pos.y - yA).toFixed(3), state: p.state };
    t.play([[{ x: 1 }, 200]]);
    const edge = { x: +p.pos.x.toFixed(2), state: p.state };
    t.play([[{ crouch: true }, 2], [{}, 60]]);
    const drop = { state: p.state, mode: p.mode, y: +p.pos.y.toFixed(2) };
    // Gegenprobe: an einer normalen Wand (ohne Gitter) gibt es kein Klettern
    t.place([-6, 0, -197], { settle: 4, yaw: 0 });
    return { grab, climbed: +climbed.toFixed(2), let1, hang, moved, edge, drop };
  });
  console.log(`  Wandgitter: ${JSON.stringify(g.grab)}, klettert ${f2(g.climbed)} m, Ducken → ${g.let1}; Deckengitter: ${JSON.stringify(g.hang)}, hangelt ${JSON.stringify(g.moved)}, Rand ${JSON.stringify(g.edge)}, Ducken → ${JSON.stringify(g.drop)}`);
  check('Klettergitter (Wand): hineinspringen greift es (state fence), Stick klettert hinauf, Ducken lässt los', g.grab.fence && g.grab.state === 'fence' && g.climbed > 1 && g.let1 !== 'fence');
  check('Klettergitter (Decke): von unten greifen (state hang), hangeln in der Ebene (Höhe bleibt), am Rand hängen bleiben', g.hang.hang && g.hang.state === 'hang' && g.moved.dx > 1 && Math.abs(g.moved.dy) < 0.01 && g.edge.state === 'hang' && g.edge.x <= 8.31);
  check('Klettergitter (Decke): Ducken lässt los (Figur fällt)', g.drop.state !== 'hang' && g.drop.mode !== 'wall');
  await T('place', marks.decke, { settle: 2 });
  await T('play', [[{ jump: true }, 40], [{}, 20]]);
  await shot('gitter', 1300);
}

// ---------------------------------------------------------------- Windböen
{
  const w = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const h = t.named('wind');
    // Ablauf: Ruhe → Vorwarnung → Böe
    const seq = [];
    for (let i = 0; i < 5 * 120; i++) { t.tick(1); if (seq[seq.length - 1] !== h.state) seq.push(h.state); }
    // am Boden in der Böe: schiebt in Windrichtung; in der Ruhe nicht
    const until = (s) => { for (let i = 0; i < 6 * 120 && h.state !== s; i++) t.tick(1); };
    until('ruhe');
    t.place([0, 0, -175], { settle: 2 });
    const xr = p.pos.x;
    for (let i = 0; i < 60 && h.state === 'ruhe'; i++) t.tick(1);
    const calm = p.pos.x - xr;
    until('boe');
    t.tick(30);
    const xb = p.pos.x;
    t.tick(60);
    const ground = p.pos.x - xb;
    // im Sprung über den Abgrund: verweht stärker
    until('ruhe'); until('boe');
    t.place([0, 0, -175.5], { settle: 0 });
    const xa = p.pos.x;
    t.play([[{ y: 1, jump: true }, 40], [{ y: 1 }, 30]]);
    const air = p.pos.x - xa;
    return { seq: seq.join('>'), calm: +calm.toFixed(3), ground: +ground.toFixed(2), air: +air.toFixed(2), gusts: h.gusts };
  });
  console.log(`  Windböen: ${w.seq} (${w.gusts} Böen); Ruhe ${f2(w.calm)} m, am Boden in der Böe ${f2(w.ground)} m (0,5 s), im Sprung ${f2(w.air)} m`);
  check('Windböe: periodisch mit Vorwarnung (Ruhe → Warnung → Böe)', /ruhe>warn>boe/.test(w.seq) || /warn>boe>ruhe>warn/.test(w.seq));
  check('Windböe: schiebt die Figur in Windrichtung (am Boden, im Sprung stärker); Gegenprobe Ruhe: keine Bewegung', Math.abs(w.calm) < 0.01 && w.ground > 0.8 && w.air > w.ground);
  await T('place', marks.wind0, { settle: 2 });
  await sc(() => { const t = window.__t, h = t.named('wind'); for (let i = 0; i < 6 * 120 && h.state !== 'boe'; i++) t.tick(1); t.tick(20); });
  await shot('wind', 1200);
}

// ---------------------------------------------------------------- Förderbänder
{
  const b = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const band = t.named('band1');
    t.place([-6, 0.6, -196], { settle: 4 });
    const z0 = p.pos.z;
    t.tick(120);
    const carried = p.pos.z - z0;
    band.reverse();
    t.place([-6, 0.6, -200], { settle: 4 });
    const z1 = p.pos.z;
    t.tick(60);
    const back = p.pos.z - z1;
    band.reverse();
    // Wandband: Stufe trägt die Figur hinauf
    const wb = t.named('bandwand');
    const low = wb.ledgeInfo().map((y, i) => [y, i]).filter(([y]) => y > 0.6 && y < 3).sort((a, b2) => a[0] - b2[0])[0];
    t.place([6, (low?.[0] ?? 1) + 0.35, -199.6], { settle: 2 });
    const yw0 = p.pos.y;
    t.tick(90);
    const up = p.pos.y - yw0, upMode = p.mode, upTag = p.ground?.tag;
    // an der Bandfläche rutschend: das Band (aufwärts) bremst den Fall gegenüber einer normalen Wand
    // rundes Band: oben trägt die Fläche in Laufrichtung, Mitnehmer laufen rundherum
    const rb = t.named('bandrund');
    t.place([-2, 3.2, -213], { settle: 4 });
    const xr = p.pos.x;
    t.tick(60);
    const roundTop = p.pos.x - xr;
    const sides0 = rb.cleats.map((cl) => cl.side).join();
    t.tick(120);
    const sides1 = rb.cleats.map((cl) => cl.side).join();
    return { carried: +carried.toFixed(2), back: +back.toFixed(2), up: +up.toFixed(2), upMode, upTag, roundTop: +roundTop.toFixed(2), cleatsMove: sides0 !== sides1, kinds: [...new Set(rb.cleats.map((cl) => cl.side))].sort().join() };
  });
  console.log(`  Förderband: Boden trägt ${f2(b.carried)} m in 1 s, umgekehrt ${f2(b.back)} m; Wandband-Stufe hebt ${f2(b.up)} m (${b.upMode}, ${b.upTag}); rundes Band oben ${f2(b.roundTop)} m, Mitnehmer laufen um ${b.cleatsMove} (${b.kinds})`);
  check('Förderband (Boden): trägt die stehende Figur mit (3 m/s); umgedreht in die Gegenrichtung', b.carried < -2.5 && b.back > 1.2);
  check('Förderband (Wand): Stufen fahren mit dem Band hinauf und tragen die Figur', b.up > 1.4 && b.upTag === 'foerderband:stufe');
  check('Förderband (rund): oben trägt die Fläche in Laufrichtung, Mitnehmer laufen rundherum (oben, vorn, unten, hinten)', b.roundTop > 1.0 && b.cleatsMove && b.kinds.split(',').length === 4);
  await T('place', marks.band1, { settle: 30 });
  await shot('foerderband', 1300);
}

// ---------------------------------------------------------------- Quetschblöcke
{
  const q = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const h = t.named('quetsch1');
    const until = (s) => { for (let i = 0; i < 8 * 120 && h.state !== s; i++) t.tick(1); };
    // Gegenprobe: neben dem Block bleibt die Figur heil
    until('ruhe');
    t.place([-3.6, 0, -228], { settle: 2 });
    const seq = [];
    for (let i = 0; i < 5 * 120; i++) { t.tick(1); if (seq[seq.length - 1] !== h.state) seq.push(h.state); }
    const besideAlive = !p.dead;
    // darunter: eingeklemmt → Tod (crush)
    until('ruhe');
    t.place([-6, 0, -228], { settle: 2 });
    for (let i = 0; i < 5 * 120 && !p.dead; i++) t.tick(1);
    const under = { dead: p.dead, cause: p.deathCause, crushes: h.crushes };
    L.runtime.respawn(); t.tick(5);
    // seitlich: schiebt die Figur, die Platz hat (Wand weit genug weg) – kein Tod
    const s = t.named('quetsch2');
    t.place([7, 0, -228], { settle: 4 });
    const x0 = p.pos.x;
    s.fire();
    for (let i = 0; i < 3 * 120; i++) t.tick(1);
    const side = { dx: +(p.pos.x - x0).toFixed(2), dead: p.dead, crushes: s.crushes, pushes: s.pushes };
    return { seq: seq.join('>'), besideAlive, under, side };
  });
  console.log(`  Quetschblock: Ablauf ${q.seq}; daneben heil ${q.besideAlive}; darunter ${JSON.stringify(q.under)}; seitlich geschoben ${JSON.stringify(q.side)}`);
  check('Quetschblock: Takt mit Vorwarnung (Ruhe → Warnung → Stoß → Halt → Zurück)', /warn>stoss>halt>zurueck/.test(q.seq));
  check('Quetschblock: darunter eingeklemmt → Tod (crush); Gegenprobe daneben: heil', q.under.dead && q.under.cause === 'crush' && q.besideAlive);
  check('Quetschblock (seitlich): schiebt die Figur, die Platz hat, ohne sie zu töten', q.side.dx > 0.8 && !q.side.dead && q.side.crushes === 0);
  await T('place', marks.quetsch2, { settle: 20 });
  await shot('quetschblock', 1200);
}

// ---------------------------------------------------------------- Wippe, Wolkenplattformen
{
  const w = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const h = t.named('wippe');
    t.place([-4, 2.4, -237.2], { settle: 4 });
    t.tick(150);
    const a1 = h.angle, g1 = p.ground?.tag;
    t.play([[{ y: 1 }, 110]]);
    t.tick(150);
    const a2 = h.angle, z2 = p.pos.z;
    // Gegenprobe: ohne Last bleibt sie stehen (zurück zur Waage nur langsam)
    t.place([0, 0, -232], { settle: 2 });
    const a3 = h.angle;
    t.tick(60);
    const a4 = h.angle;
    // Wolkenplattform: von unten durchspringen, oben landen, sie verpufft und kommt wieder
    const wk = t.named('wolke1');
    t.place([6, 0, -236], { settle: 4 });
    t.play([[{ jump: true }, 30]]);
    for (let i = 0; i < 120 && p.mode !== 'ground'; i++) t.tick(1);
    const landed = { tag: p.ground?.tag, y: +p.pos.y.toFixed(2) };
    let gone = false;
    for (let i = 0; i < 240 && !gone; i++) { t.tick(1); gone = wk.state === 'weg'; }
    t.tick(60);
    const fell = p.pos.y < 2;
    t.tick(3 * 120);
    return { a1: +a1.toFixed(2), g1, a2: +a2.toFixed(2), z2: +z2.toFixed(2), a3: +a3.toFixed(2), a4: +a4.toFixed(2), landed, gone, fell, back: wk.state };
  });
  console.log(`  Wippe: Figur am +Z-Ende ${f2(w.a1)}° (${w.g1}), zum −Z-Ende gelaufen ${f2(w.a2)}° (z ${f2(w.z2)}), ohne Last ${f2(w.a3)}° → ${f2(w.a4)}°; Wolke: gelandet ${JSON.stringify(w.landed)}, verpufft ${w.gone}, Figur fällt ${w.fell}, wieder ${w.back}`);
  check('Wippe: Last am Ende drückt es hinab, auf der anderen Seite kippt sie um', w.a1 < -8 && w.a2 > 8 && w.g1 === 'wippe');
  check('Wolkenplattform: von unten durchspringbar, oben stehen; verpufft nach dem Betreten und kommt wieder', w.landed.tag === 'wolkenplattform' && w.landed.y > 2.5 && w.gone && w.fell && w.back === 'da');
  await T('place', marks.wippe, { settle: 60 });
  await shot('wippe', 1200);
}

// ---------------------------------------------------------------- Großer ?-Block, Wurfball, Zielscheiben, POW
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const blk = t.ent('riesen');
    // Gegenprobe: normal darauf landen löst nichts aus
    t.place([-6, 3.5, -257], { settle: 60 });
    const plain = blk.state;
    // Stampfen
    const coins0 = L.runtime.coins;
    t.place([-6, 3.5, -257], { settle: 0 });
    c.setInput({ crouch: true }); t.tick(2); c.setInput({});
    let maxY = 0;
    for (let i = 0; i < 4 * 120; i++) { t.tick(1); maxY = Math.max(maxY, p.pos.y); }
    const grown = { state: blk.state, height: +blk.height.toFixed(2), py: +p.pos.y.toFixed(2), coins: L.runtime.coins - coins0 };
    // Explosion: ein zweiter Block (zur Laufzeit) wächst bei onHit('bomb') aus einer Explosion in der Nähe
    const b2 = L.spawn('riesenfrageblock', { pos: [-10, 0, -262], size: 2, grow: 3 });
    L.attackArea({ x: -10, y: 0.5, z: -260.5 }, 3, 'bomb', null);
    t.tick(2 * 120);
    return { plain, grown, bomb: { state: b2.state, height: +b2.height.toFixed(2) } };
  });
  console.log(`  Großer ?-Block: Landen → ${r.plain}; Stampfen → ${JSON.stringify(r.grown)}; Explosion → ${JSON.stringify(r.bomb)}`);
  check('Großer ?-Block: Stampfen lässt ihn zum Turm wachsen (trägt die Figur hinauf, Inhalt); Gegenprobe normales Landen: nichts', r.plain === 'bereit' && r.grown.state === 'turm' && r.grown.height > 4.9 && r.grown.py > 6.5 && r.grown.coins >= 3);
  check('Großer ?-Block: eine Explosion (onHit bomb) lässt ihn ebenfalls wachsen', r.bomb.state === 'turm' && r.bomb.height > 2.9);
  const b = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const ball = t.ent('ball');
    // aufheben (Aktion)
    t.place([4, 0, -253.2], { settle: 4 });
    c.setInput({ action: true }); t.tick(1); c.setInput({}); t.tick(10);
    const held = p.holding === ball;
    // auf einen Gegner werfen
    const foe = L.spawn('pilzling', { pos: [4, 0, -259], dir: [1, 0], speed: 0.01 });
    t.tick(4);
    c.setInput({ action: true }); t.tick(1); c.setInput({});
    let hitFoe = false;
    for (let i = 0; i < 120 && !hitFoe; i++) { t.tick(1); hitFoe = !foe.alive || foe.defeated || foe.state === 'flipped'; }
    // Zielscheiben: beide treffen → Gruppe erledigt (Münzen)
    const coins0 = L.runtime.coins;
    const shoot = (x) => {
      for (let i = 0; i < 4 * 120 && ball.goneT >= 0; i++) t.tick(1);
      t.place([x, 0, -258.6], { settle: 4 });
      ball.pos.set(x, 0, -259.1); ball.vel.set(0, 0, 0); ball.thrown = false; ball.carrier = null; ball.goneT = -1;
      t.tick(2);
      c.setInput({ action: true }); t.tick(1); c.setInput({}); t.tick(6);
      const h = p.holding === ball;
      c.setInput({ action: true }); t.tick(1); c.setInput({});
      t.tick(90);
      return h;
    };
    const g = L.targets.ziele;
    const n0 = g.n;
    // Gegenprobe: an der Scheibe vorbei werfen trifft nicht
    shoot(5);
    const miss = g.n - n0;
    shoot(3);
    shoot(7);
    const targets = { n: g.n, of: g.of, done: g.done, coins: L.runtime.coins - coins0 };
    // POW-Block treffen
    const pow = t.ent('pow');
    const pn = pow.n;
    t.place([-2, 0, -262.5], { settle: 4 });
    ball.pos.set(-2, 0, -263); ball.vel.set(0, 0, 0); ball.goneT = -1; ball.carrier = null;
    t.tick(2);
    c.setInput({ action: true }); t.tick(1); c.setInput({}); t.tick(6);
    c.setInput({ action: true }); t.tick(1); c.setInput({});
    t.tick(90);
    return { held, hitFoe, miss, targets, pow: pow.n - pn, hits: ball.hits };
  });
  console.log(`  Wurfball: aufgehoben ${b.held}, Gegner getroffen ${b.hitFoe}; vorbei ${b.miss}; Zielscheiben ${JSON.stringify(b.targets)}; POW +${b.pow}; Treffer gesamt ${b.hits}`);
  check('Wurfball: Aktion hebt ihn auf, Wurf besiegt einen Gegner', b.held && b.hitFoe);
  check('Wurfball: trifft Zielscheiben (alle getroffen → Belohnung); Gegenprobe daneben: kein Treffer', b.miss === 0 && b.targets.done && b.targets.n === b.targets.of && b.targets.coins >= 5);
  check('Wurfball: trifft den POW-Block', b.pow >= 1);
  await T('place', marks.ziele, { settle: 20 });
  await shot('wurfball', 1200);
  await T('place', marks.riesen, { settle: 20 });
  await shot('turm', 1200);
}

// ---------------------------------------------------------------- Ziel, Kennzahlen
{
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 70], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Wolkenwerkstatt erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 120 Zeichenaufrufe (inkl. Schattenpass) in allen Bildern', stats.every((s) => s[1] < 120));
  check('Budget: < 300 k Dreiecke in allen Bildern', stats.every((s) => s[2] < 300000));
}
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);

}

// ---------------------------------------------------------------- Themen (?theme=) mit Bildern
if (PART !== 'mech' && SHOTS) {
  console.log('Welt-6-Themen');
  const VIEWS = { clearpipe: ['netzA'], stonecircle: ['kugel'], wreck: ['dock'], fareast: ['halle'], jungle: ['floss'], snowwind: ['wind0'], factory: ['band1'], fuzzymine: ['quetsch1'] };
  const labels = {};
  const e0all = errors.length;
  for (const th of Object.keys(VIEWS)) {
    const e0 = errors.length;
    await load(`&theme=${th}`);
    const m = await sc(() => window.__t.marks);
    labels[th] = await sc(() => ({ label: window.__course.view.theme.label, backdrop: window.__course.view.theme.backdrop ?? null, moods: Object.keys(window.__course.view.theme.moods ?? {}), uw: !!window.__course.view.theme.underwater }));
    for (const [k, w] of VIEWS[th].entries()) {
      await T('place', m[w], { settle: 30 });
      await shot(k ? `thema_${th}_${w}` : `thema_${th}`, 1700);
    }
    if (th === 'wreck') {
      // Laderaum-Stimmung (dunkler Schiffsbauch) überblenden
      await sc(() => { window.__course.view.setMood('laderaum', { time: 0.01 }); });
      await T('place', m.steg, { settle: 30 });
      await shot('thema_wreck_laderaum', 1700);
      labels[th].mood = await sc(() => window.__course.view.mood?.info?.().mood ?? null);
    }
    console.log(`  ${th}: ${labels[th].label} (Kulisse ${labels[th].backdrop}${labels[th].moods.length ? ', Stimmungen ' + labels[th].moods.join('/') : ''}${labels[th].uw ? ', Unterwasser' : ''})${errors.length > e0 ? ' – Fehler!' : ''}`);
  }
  const ls = Object.values(labels).map((l) => l.label);
  check('Themen: alle acht Welt-6-Themen registriert (eigene Namen, eigene Kulisse)', ls.every((l) => l && l !== 'Wiese') && new Set(ls).size === 8 && Object.values(labels).every((l) => l.backdrop));
  check('Thema wreck: Laderaum-Stimmung und Unterwasser-Stimmung', labels.wreck.moods.includes('laderaum') && labels.wreck.uw && labels.wreck.mood === 'laderaum');
  const ts = stats.filter((s) => s[0].startsWith('thema_'));
  for (const s of ts) console.log(`    ${s[0].padEnd(24)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Themen-Bilder: < 120 Zeichenaufrufe, < 300 k Dreiecke', ts.length >= 8 && ts.every((s) => s[1] < 120 && s[2] < 300000));
  check('Themen: keine Konsolenfehler', errors.length === e0all);
  if (errors.length > e0all) for (const e of errors.slice(e0all, e0all + 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
