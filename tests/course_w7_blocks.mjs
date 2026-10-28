// Kurs-Modus, Welt-7-Mechaniken, -Bausteine und Power-up Wurfsichel in der Lavawerkstatt 0-26: je Baustein das
// Kernverhalten deterministisch über window.__course.step(n) und setInput prüfen – mit Gegenprobe (Wurfsichel: Wurf,
// Rückkehr, Fangen, nur eine gleichzeitig, Münzen/?-Block/Gegner unterwegs, Wand; Feuerstab mit Anheben; Lavablasen rot/
// blau/Bogen/folgen der Lava; Pfeilplattformen aus Lava, Wand und per Signal; Zylinder; rotierende Stachelwalze;
// Pendelstachel; steigende/sinkende Lava; Gitterboden; Fontänen heiß/tragend; Klappstampfer mit Loch; Zugbrücke mit
// Druckknopf; Schaltfelder machen den Weg sichtbar; Giftnebel-Flucht; Unterwasser-Kisten; Hüllen als kind); Sichtprüfung
// über Bilder tests/out/w7b_*.png (Kurs-Kamera), Kennzahlen (Zeichenaufrufe, Dreiecke), Themen-Bilder je Welt-7-Thema
// (w7b_thema_*.png).
// Aufruf: node tests/course_w7_blocks.mjs   (Port 4680 + PORT_BASE; vorher npm run build; nutzt vite preview)
// W7B_SHOTS=0 → ohne Bilder/Themen (schneller); W7B_PART=mech|themes → nur ein Teil; W7B_DEBUG=1 → mehr Ausgaben.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4680;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W7B_SHOTS !== '0';
const PART = process.env.W7B_PART ?? 'all';
const DEBUG = !!process.env.W7B_DEBUG;

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-26&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Lavawerkstatt startet nicht. Konsole:');
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
        p.holding = null;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.skidTurnTime = 0;
        if (o.power) p.setPower(o.power);
        p.invuln = o.invuln ?? 0;
        p.fireCooldown = 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        window.__t.tick(o.settle ?? 30);
        return p.info();
      },
      /** Warten, bis cond() gilt (höchstens n Schritte) → Schritte oder -1. */
      until(cond, n = 1200) { for (let i = 0; i < n; i++) { if (cond()) return i; c.step(1); } return cond() ? n : -1; },
      action() { c.setInput({ action: true }); c.step(1); c.setInput({}); },
      info: () => P().info(),
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      coins: () => L().runtime.coins,
      hurt: () => { const p = P(); return p.dead || !p.big || p.invuln > 0.05; },
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
  try { await page.screenshot({ path: `${OUT}w7b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

if (PART !== 'themes') {
await load();
const marks = await sc(() => window.__t.marks);
console.log('Lavawerkstatt 0-26');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()] }));
  if (DEBUG) console.log(`  Arten: ${st.kinds.join(', ')}`);
  const need = ['lavablase', 'druckknopf', 'kiste_wasser', 'powerup'];
  check('Level geladen (Welt-7-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['stab1', 'stab2', 'blase1', 'blase2', 'blase3', 'pfeil1', 'pfeil2', 'pfeil3', 'pfeilwand', 'pfeilsig', 'zylinder', 'walze', 'pendel', 'spiegel', 'gitter', 'fontaene1', 'fontaene2', 'klapp1', 'klapp2', 'bruecke', 'knopf', 'schalt', 'nebel', 'kiste1'];
  const miss = ids.filter((id) => !st.named.includes(id));
  check('Bausteine benannt (level.named)', miss.length === 0);
  if (miss.length) console.log('   fehlen:', miss.join(', '));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
}

// ---------------------------------------------------------------- Wurfsichel
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    // Item einsammeln
    t.place([3, 0, -0.5], { settle: 2 });
    c.setInput({ y: 1 }); t.until(() => p.power === 'sichel', 240); c.setInput({});
    const got = p.power;
    // Wurf nach −Z: fliegt hinaus, kehrt zurück, wird gefangen
    t.place([0, 0, 2], { settle: 10, power: 'sichel' });
    const catch0 = p.sichelCatch ?? 0;
    t.action();
    const s = t.ents('wurfsichel')[0];
    let far = 0, turned = null, second = 0;
    for (let i = 0; i < 600 && s && !s.removed; i++) {
      far = Math.max(far, Math.hypot(s.pos.x - p.pos.x, s.pos.z - p.pos.z));
      if (s.state === 'zurueck' && turned === null) turned = +s.dist.toFixed(2);
      if (i === 20) { p.fireCooldown = 0; t.action(); second = t.ents('wurfsichel').length; }
      t.tick(1);
    }
    const caught = s?.caught ?? false;
    const back = (p.sichelCatch ?? 0) - catch0;
    // nach dem Fangen: neuer Wurf möglich
    p.fireCooldown = 0;
    t.tick(30);
    t.action();
    const again = t.ents('wurfsichel').length;
    t.tick(300);
    return { got, far: +far.toFixed(2), turned, second, caught, back, again, power: p.power, label: 'Wurfsichel' };
  });
  console.log(`  Wurfsichel: Item → ${r.got}; Wurf ${r.far} m weit (Wende bei ${r.turned} m), gefangen ${r.caught} (+${r.back}); zweiter Wurf in der Luft: ${r.second} Sichel(n); danach wieder ${r.again}`);
  check('Wurfsichel: Item einsammeln gibt das Power-up (player.power = \'sichel\')', r.got === 'sichel');
  check('Wurfsichel: Wurf fliegt ≥ 6 m hinaus, kehrt um und wird gefangen', r.far > 6 && r.turned > 6 && r.caught && r.back === 1);
  check('Wurfsichel: Laden – nur eine gleichzeitig (Gegenprobe zweiter Wurf in der Luft), nach dem Fangen wieder', r.second === 1 && r.again === 1 && r.power === 'sichel');
  const m = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    // Gegenprobe: ohne Wurf bleiben die Münzen über der Lava liegen
    t.place([0, 0, -10], { settle: 10, power: 'sichel' });
    const c0 = L.runtime.coins;
    t.tick(240);
    const idle = L.runtime.coins - c0;
    // Wurf über die Lava: Münzen werden eingesammelt, die Figur bleibt stehen
    t.action();
    t.tick(260);
    const got = L.runtime.coins - c0;
    const stay = Math.abs(p.pos.z + 10) < 0.3 && !p.dead;
    // Gegner auf der Bahn: Pilzling 4 m vor der Figur wird getroffen; Gegenprobe: Pilzling 5 m seitlich bleibt
    t.place([0, 0, -20], { settle: 10, power: 'sichel' });
    const foe = L.spawn('pilzling', { pos: [0, 0, -24.5], dir: [1, 0], speed: 0.01 });
    const side = L.spawn('pilzling', { pos: [5.5, 0, -23], dir: [1, 0], speed: 0.01 });
    t.tick(2);
    t.action();
    t.tick(240);
    const hitFoe = !foe.alive || foe.defeated || foe.state === 'flipped';
    const sideOk = side.alive && !side.defeated;
    side.kill();
    // ?-Block auf der Bahn
    t.place([-5, 0, -19.5], { settle: 10, power: 'sichel' });
    const qb = t.ent('qsichel');
    const c1 = L.runtime.coins;
    t.action();
    t.tick(240);
    const qCoins = L.runtime.coins - c1;
    // grüner Stern über der Lava (Bauplan 7-7/7-Burg: „mit der Wurfsichel“): die Sichel holt ihn für die Werferin
    const st0 = !!L.runtime.stars[1];
    const star = L.spawn('star', { pos: [0, 0.35, -15], index: 1 });
    t.place([0, 0, -10], { settle: 10, power: 'sichel' });
    t.tick(30);
    const starIdle = !!L.runtime.stars[1];
    t.action();
    t.tick(260);
    const starGot = !!L.runtime.stars[1] && !st0;
    if (star && !star.removed) star.kill();
    L.runtime.stars[1] = st0;
    // Wand: die Sichel kehrt früh um
    t.place([-8, 0, -22], { settle: 10, power: 'sichel' });
    t.action();
    const s = t.ents('wurfsichel')[0];
    let turnAt = null;
    for (let i = 0; i < 240 && s && !s.removed; i++) { if (s.state === 'zurueck' && turnAt === null) turnAt = +s.dist.toFixed(2); t.tick(1); }
    return { idle, got, stay, hitFoe, sideOk, qCoins, qKind: qb?.kind, turnAt, starIdle, starGot };
  });
  console.log(`  Wurfsichel unterwegs: Münzen ohne Wurf +${m.idle}, mit Wurf +${m.got} (Figur bleibt ${m.stay}); Pilzling getroffen ${m.hitFoe}, seitlicher heil ${m.sideOk}; ?-Block +${m.qCoins} (${m.qKind}); Stern ${m.starIdle} → ${m.starGot}; Wand → Wende bei ${m.turnAt} m`);
  check('Wurfsichel: sammelt Münzen über der Lava ein (Gegenprobe ohne Wurf: keine)', m.idle === 0 && m.got >= 3 && m.stay);
  check('Wurfsichel: trifft Gegner auf der Bahn (onHit throw); Gegenprobe: Gegner abseits bleibt', m.hitFoe && m.sideOk);
  check('Wurfsichel: löst ?-Blöcke aus und kehrt an Wänden früh um', m.qCoins >= 1 && m.turnAt !== null && m.turnAt < 3);
  check('Wurfsichel: holt einen grünen Stern über der Lava (Gegenprobe ohne Wurf: liegt noch)', !m.starIdle && m.starGot);
  const h = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    t.place([0, 0, 2], { settle: 5, power: 'sichel' });
    const ui = window.__game.scene.getScene('CourseUI');
    ui.refresh?.(true);
    const txt = ui.powerText?.text;
    t.action();
    t.tick(2);
    const flying = p.sichelFlying, ready = p.sichelReady;
    t.tick(400);
    return { txt, flying, ready, readyAfter: p.sichelReady };
  });
  console.log(`  Wurfsichel HUD: „${h.txt}“, in der Luft ${h.flying} (bereit ${h.ready}), danach bereit ${h.readyAfter}`);
  check('Wurfsichel: HUD zeigt „Wurfsichel“, Bereitschaft (sichelReady/sichelFlying) für Figuren und HUD', h.txt === 'Wurfsichel' && h.flying === 1 && !h.ready && h.readyAfter);
  await T('place', marks.sichel, { settle: 10, power: 'sichel' });
  await sc(() => { const t = window.__t; t.action(); t.tick(28); });
  await shot('wurfsichel', 900);
}

// ---------------------------------------------------------------- Feuerstab
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const s1 = t.named('stab1');
    const a0 = s1.angle, pts0 = s1.points();
    t.tick(60);
    const turned = s1.angle - a0, moved = Math.hypot(s1.points()[5].x - pts0[5].x, s1.points()[5].z - pts0[5].z);
    // Gegenprobe: 3,8 m vom Drehpunkt (außerhalb der 2,5 m langen Kette) eine ganze Umdrehung → heil
    t.place([-5 + 3.8, 0, -34], { settle: 2 });
    let outside = false;
    for (let i = 0; i < 520 && !outside; i++) { p.pos.set(-5 + 3.8, 0, -34); t.tick(1); outside = t.hurt(); }
    // in Reichweite (1,6 m) → getroffen
    t.place([-5 + 1.6, 0, -34], { settle: 2 });
    let hit = false, n = 0;
    for (; n < 520 && !hit; n++) { p.pos.set(-5 + 1.6, 0, -34); t.tick(1); hit = t.hurt(); }
    // ?-Block: Kopfstoß gibt Inhalt
    const s2 = t.named('stab2');
    const c0 = L.runtime.coins;
    s2.stop();
    // Stampfattacke von oben auf den ?-Block
    t.place([5, 3.2, -42], { settle: 0, invuln: 5 });
    c.setInput({ crouch: true }); t.tick(2); c.setInput({});
    let maxY = 0;
    for (let i = 0; i < 3 * 120; i++) { t.tick(1); maxY = Math.max(maxY, p.pos.y); }
    s2.start();
    return { turned: +turned.toFixed(2), moved: +moved.toFixed(2), outside, hit, n, coins: L.runtime.coins - c0, lifted: s2.lifted, liftH: +s2.liftH.toFixed(2), py: +p.pos.y.toFixed(2), maxY: +maxY.toFixed(2), used: s2.used };
  });
  console.log(`  Feuerstab: dreht ${r.turned} rad/0,5 s (Kugel ${r.moved} m); außerhalb getroffen ${r.outside}, in Reichweite getroffen ${r.hit} (nach ${r.n} Schritten); ?-Block gestampft → +${r.coins} Münzen, angehoben ${r.lifted} um ${r.liftH} m (Figur y ${r.py})`);
  check('Feuerstab: dreht sich (Kugeln wandern auf dem Kreis)', r.turned > 0.7 && r.moved > 1);
  check('Feuerstab: Kugeln verletzen in Reichweite; Gegenprobe außerhalb der Kette: heil', r.hit && !r.outside);
  check('Feuerstab: Stampfen auf den ?-Block gibt den Inhalt und hebt ihn samt Figur an', r.coins >= 3 && r.lifted && r.liftH > 2.9 && r.py > 3.9 && r.used);
  await T('place', marks.stab1, { settle: 20 });
  await shot('feuerstab', 900);
}

// ---------------------------------------------------------------- Lavablasen
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const b1 = t.ent('blase1'), b2 = t.ent('blase2'), b3 = t.ent('blase3');
    const j0 = b1.jumps;
    let hMax = 0, states = new Set();
    for (let i = 0; i < 4 * 120; i++) { t.tick(1); hMax = Math.max(hMax, b1.height()); states.add(b1.state); }
    // Bogen: zwei Takte – Ausgangs- und Zielpunkt
    const zs = new Set();
    for (let i = 0; i < 6 * 120; i++) { t.tick(1); if (b3.state === 'oben' && b3.vel.y < 0 && b3.height() < 0.6) zs.add(Math.round(b3.pos.z)); }
    // Treffer: Blase gleich neben der Insel; Figur am Rand (überlappt) bzw. in der Mitte (Gegenprobe)
    const e = L.spawn('lavablase', { pos: [-1.55, -0.5, -55], height: 3, period: 2, phase: 0 });
    t.place([0.3, 0, -55], { settle: 2 });
    let safe = false;
    for (let i = 0; i < 3 * 120 && !safe; i++) { p.pos.x = 0.3; p.pos.z = -55; t.tick(1); safe = t.hurt(); }
    t.place([-1.0, 0, -55], { settle: 2 });
    let hit = false;
    for (let i = 0; i < 3 * 120 && !hit; i++) { p.pos.x = -1.0; p.pos.z = -55; t.tick(1); hit = t.hurt(); }
    e.kill();
    // folgt steigender Lava: Blase im Becken der steigenden Lava
    const sp = t.named('spiegel');
    t.until(() => sp.state === 'unten', 2400);
    const f = L.spawn('lavablase', { pos: [-10, -1.5, -124], height: 3, period: 2.5 });
    const b0 = f.base.y;
    t.until(() => sp.state === 'oben', 2400);
    t.tick(10);
    const bUp = f.base.y;
    f.kill();
    return { jumps: b1.jumps - j0, hMax: +hMax.toFixed(2), states: [...states].join('/'), c1: b1.color, c2: b2.color, arc: [...zs].sort().join(','), safe, hit, b0: +b0.toFixed(2), bUp: +bUp.toFixed(2), top: +sp.top.toFixed(2) };
  });
  console.log(`  Lavablasen: ${r.jumps} Sprünge/4 s bis ${r.hMax} m (${r.states}), Farben ${r.c1}/${r.c2}; Bogen landet bei z ${r.arc}; Mitte heil ${!r.safe}, Rand getroffen ${r.hit}; folgt der Lava ${r.b0} → ${r.bUp} (Spiegel ${r.top})`);
  check('Lavablase: springt im Takt aus der Lava (≈ height), mit Vorwarnung (warn) und unsichtbar dazwischen', r.jumps >= 1 && r.hMax > 3.6 && r.states.includes('warn') && r.states.includes('unten') && r.states.includes('oben'));
  check('Lavablase: Variante blau (color) und rot', r.c1 === 'rot' && r.c2 === 'blau');
  check('Lavablase: Bogen zwischen zwei Lavapunkten (hin und zurück)', r.arc.split(',').length >= 2);
  check('Lavablase: Berührung verletzt; Gegenprobe Inselmitte: heil', r.hit && !r.safe);
  check('Lavablase: folgt steigender Lava (lavaTopAt)', r.bUp > r.b0 + 1.5 && Math.abs(r.bUp - r.top) < 0.05);
  await T('place', marks.blasen, { settle: 20 });
  await sc(() => { const t = window.__t, b = t.ent('blase1'); t.until(() => b.state === 'oben' && b.vel.y < 1, 600); });
  await shot('lavablasen', 600);
}

// ---------------------------------------------------------------- Pfeilplattformen
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const a = t.named('pfeil1');
    const seen = new Set();
    let kMin = 1, kMax = 0;
    for (let i = 0; i < 8 * 120; i++) { t.tick(1); seen.add(a.state); kMin = Math.min(kMin, a.k); kMax = Math.max(kMax, a.k); }
    // oben stehen: trägt; beim Versinken fährt die Figur mit hinab in die Lava
    t.until(() => a.state === 'oben', 1200);
    t.place([0, 0.3, -68], { settle: 24 });
    const ok = p.mode === 'ground' && p.ground?.tag === 'pfeilplattform';
    const y0 = p.pos.y;
    t.until(() => a.state === 'blinkt', 1200);
    const stillUp = !p.dead && Math.abs(p.pos.y - y0) < 0.1;
    t.until(() => p.dead, 400);
    const died = p.dead, cause = p.deathCause;
    // Wand: fährt seitlich heraus
    const w = t.named('pfeilwand');
    let xs = new Set();
    for (let i = 0; i < 6 * 120; i++) { t.tick(1); xs.add(Math.round(w.mb.pos.x)); }
    // Signal: versteckt, bis reveal; bleibt oben; hide → weg
    const s = t.named('pfeilsig');
    const k0 = s.k;
    t.tick(240);
    const kQuiet = s.k;
    L.signal?.('dummy');
    s.reveal();
    t.tick(3 * 120);
    const kUp = s.k, st1 = s.state;
    t.tick(5 * 120);
    const kStay = s.k;
    s.hide();
    t.tick(3 * 120);
    return { seen: [...seen].join('/'), kMin, kMax, ok, stillUp, died, cause, xs: [...xs].sort((q, w2) => q - w2).join(','), k0, kQuiet, kUp, st1, kStay, kEnd: s.k };
  });
  console.log(`  Pfeilplattform: Zustände ${r.seen}, k ${r.kMin}…${r.kMax}; Figur oben ${r.ok}, bis zum Blinken heil ${r.stillUp}, versinkt mit → ${r.cause}; Wand-Platte x ${r.xs}; Signal: ${r.k0}/${r.kQuiet} → ${r.kUp} (${r.st1}), bleibt ${r.kStay}, weg ${r.kEnd}`);
  check('Pfeilplattform: taucht im Takt auf und versinkt, mit Vorwarnung vor beidem (warn, blinkt)', ['weg', 'warn', 'kommt', 'oben', 'blinkt', 'geht'].every((s) => r.seen.includes(s)) && r.kMin === 0 && r.kMax === 1);
  check('Pfeilplattform: trägt die Figur; wer beim Versinken darauf bleibt, landet in der Lava', r.ok && r.stillUp && r.died && r.cause === 'lava');
  check('Pfeilplattform aus der Wand: fährt seitlich heraus und zurück', r.xs.split(',').length >= 3);
  check('Pfeilplattform per Signal: versteckt (Gegenprobe ohne Signal), reveal → oben und bleibt, hide → weg', r.k0 === 0 && r.kQuiet === 0 && r.kUp === 1 && r.kStay === 1 && r.kEnd === 0);
  await sc(() => { const t = window.__t; t.until(() => t.named('pfeil2').state === 'oben', 1200); });
  await T('place', marks.pfeile, { settle: 4 });
  await shot('pfeilplattformen', 600);
}

// ---------------------------------------------------------------- Zylinder, Stachelwalze, Pendel
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const z = t.named('zylinder');
    t.place([0, 1.2, -91], { settle: 24 });
    const g = p.ground?.tag;
    const z0 = p.pos.z;
    t.tick(120);
    const carried = p.pos.z - z0;
    // Gegenprobe: angehalten → keine Mitnahme
    z.stop();
    t.place([0, 1.2, -91], { settle: 4 });
    const z1 = p.pos.z;
    t.tick(120);
    const still = p.pos.z - z1;
    z.start();
    // gegen die Laufrichtung laufen hält die Figur ungefähr auf der Stelle
    t.place([0, 1.2, -91], { settle: 4 });
    c.setInput({ y: 1 }); t.tick(120); c.setInput({});
    const walk = p.pos.z + 91;
    // Stachelwalze: oben stehen → getroffen; Gegenprobe 3 m davor
    const w = t.named('walze');
    t.place([0, 0, -96.5], { settle: 2 });
    let safe = false;
    for (let i = 0; i < 4 * 120 && !safe; i++) { p.pos.set(0, 0, -96.5); t.tick(1); safe = t.hurt(); }
    t.place([1.5, 1.75, -100], { settle: 0 });
    let hit = false, hits0 = w.hits;
    for (let i = 0; i < 4 * 120 && !hit; i++) { t.tick(1); hit = t.hurt(); }
    // Pendel: unter dem Pendel (Bahn) getroffen; 1,6 m daneben heil
    const pd = t.named('pendel');
    let aMax = 0;
    for (let i = 0; i < 3 * 120; i++) { t.tick(1); aMax = Math.max(aMax, Math.abs(pd.angle)); }
    t.place([0, 0, -105.4], { settle: 2 });
    let pSafe = false;
    for (let i = 0; i < 4 * 120 && !pSafe; i++) { p.pos.set(0, 0, -105.4); t.tick(1); pSafe = t.hurt(); }
    t.place([0, 0, -107], { settle: 2 });
    let pHit = false;
    for (let i = 0; i < 4 * 120 && !pHit; i++) { p.pos.set(0, 0, -107); t.tick(1); pHit = t.hurt(); }
    return { g, carried: +carried.toFixed(2), still: +still.toFixed(2), walk: +walk.toFixed(2), safe, hit, whits: w.hits - hits0, pSafe, pHit, aMax: +(aMax * 180 / Math.PI).toFixed(1) };
  });
  console.log(`  Zylinder: Boden ${r.g}, Mitnahme ${r.carried} m/s (angehalten ${r.still}), gegenan gelaufen ${r.walk} m; Stachelwalze: davor heil ${!r.safe}, oben getroffen ${r.hit}; Pendel: daneben heil ${!r.pSafe}, darunter getroffen ${r.pHit} (Ausschlag bis ${r.aMax}°)`);
  check('Zylinder: Oberseite trägt mit (wie ein Band, +Z); Gegenprobe angehalten: steht still', r.g === 'zylinder' && r.carried > 0.8 && Math.abs(r.still) < 0.05);
  check('Rotierende Stachelwalze: die Stachelreihen treffen, wer oben steht; Gegenprobe davor: heil', r.hit && !r.safe && r.whits >= 1);
  check('Pendelstachel: pendelt und trifft, wer in der Bahn steht; Gegenprobe daneben: heil', r.pHit && !r.pSafe && r.aMax > 40);
  await T('place', marks.walze, { settle: 30 });
  await shot('walzen', 900);
  await T('place', marks.zylinder, { settle: 30 });
  await shot('zylinder', 900);
}

// ---------------------------------------------------------------- Steigende Lava, Gitterboden, Fontänen
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const sp = t.named('spiegel');
    t.until(() => sp.state === 'unten', 2400);
    const low = sp.top;
    // Figur auf der tiefen Säule (Oberseite −0,4): beim Steigen stirbt sie; Gegenprobe hohe Säule und Gitterboden: heil
    t.place([0, -0.4, -118], { settle: 4 });
    const seen = new Set();
    let died = false, cause = null;
    for (let i = 0; i < 12 * 120 && !died; i++) { t.tick(1); seen.add(sp.state); died = p.dead; cause = p.deathCause; }
    const high = sp.top;
    t.until(() => sp.state === 'unten', 2400);
    t.place([-8, 1.2, -118], { settle: 4 });
    let hiDead = false;
    for (let i = 0; i < 12 * 120 && !hiDead; i++) { t.tick(1); hiDead = p.dead; }
    t.place([7, 0.6, -120], { settle: 24 });
    const grate = p.ground?.tag;
    let gDead = false, maxTop = -9;
    for (let i = 0; i < 12 * 120 && !gDead; i++) { t.tick(1); gDead = p.dead; maxTop = Math.max(maxTop, sp.top); }
    return { low: +low.toFixed(2), high: +high.toFixed(2), seen: [...seen].join('/'), died, cause, hiDead, grate, gDead, maxTop: +maxTop.toFixed(2) };
  });
  console.log(`  Lavaspiegel: ${r.low} → ${r.high} (${r.seen}); tiefe Säule: tot ${r.died} (${r.cause}); hohe Säule tot ${r.hiDead}; Gitterboden (${r.grate}) tot ${r.gDead} bei Spiegel bis ${r.maxTop}`);
  check('Steigende/sinkende Lava: Spiegel im Zyklus mit Vorwarnung (unten/warn/steigt/oben/sinkt)', ['unten', 'warn', 'steigt', 'oben', 'sinkt'].every((s) => r.seen.includes(s)) || (r.seen.includes('warn') && r.seen.includes('steigt')));
  check('Steigende Lava: Kollision und Tod folgen dem Spiegel (tiefe Säule → Tod durch Lava); Gegenprobe hohe Säule: heil', r.died && r.cause === 'lava' && !r.hiDead);
  check('Gitterboden: begehbar über der Lava, auch bei hohem Spiegel', r.grate === 'gitterboden' && !r.gDead && r.maxTop > 0.3);
  const f = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const f1 = t.named('fontaene1');
    // Hilfsboden über dem Austritt (die Säule schießt hindurch)
    const id = L.world.add({ type: 'box', min: [-7, 0.6, -129], max: [-5, 0.8, -127], tag: 'testboden' });
    t.until(() => f1.state === 'ruhe', 1200);
    t.place([-6, 0.8, -128], { settle: 2 });
    const seen = new Set();
    let hit = false, quiet = true;
    for (let i = 0; i < 6 * 120 && !hit; i++) { p.pos.x = -6; p.pos.z = -128; t.tick(1); seen.add(f1.state); if (f1.state === 'ruhe' || f1.state === 'warn') quiet = quiet && !t.hurt(); hit = t.hurt(); }
    const er = f1.eruptions;
    // Gegenprobe: 2 m daneben heil
    t.place([-6, 0.8, -126], { settle: 0 });
    L.world.remove(id);
    const id2 = L.world.add({ type: 'box', min: [-7, 0.6, -127], max: [-5, 0.8, -125], tag: 'testboden' });
    let side = false;
    for (let i = 0; i < 6 * 120 && !side; i++) { p.pos.x = -6; p.pos.z = -126; t.tick(1); side = t.hurt(); }
    L.world.remove(id2);
    // tragende Fontäne: auf der Platte stehen → hinauf getragen
    const f2 = t.named('fontaene2');
    t.until(() => f2.state === 'ruhe', 1500);
    t.place([3, f2.top + 1, -132], { settle: 40 });
    const on = p.ground?.tag;
    const y0 = p.pos.y;
    let yMax = y0;
    for (let i = 0; i < 6 * 120 && !p.dead; i++) { t.tick(1); yMax = Math.max(yMax, p.pos.y); }
    return { seen: [...seen].join('/'), hit, quiet, er, side, on, lift: +(yMax - y0).toFixed(2), dead: p.dead };
  });
  console.log(`  Fontänen: heiß ${f.seen}, getroffen ${f.hit} (in Ruhe/Warnung heil ${f.quiet}, Ausbrüche ${f.er}), daneben ${f.side}; tragend: auf ${f.on} gehoben um ${f.lift} m (tot ${f.dead})`);
  check('Lava-Fontäne (heiß): Vorwarnung, dann trifft die Säule; Gegenprobe in Ruhe und daneben: heil', f.hit && f.quiet && f.er >= 1 && !f.side && f.seen.includes('warn'));
  check('Lava-Fontäne (tragend): Krustenplatte trägt die Figur hinauf', f.on === 'fontaene-platte' && f.lift > 3.5 && !f.dead);
  await T('place', marks.saeuleHoch, { settle: 30 });
  await sc(() => { const t = window.__t; t.until(() => t.named('fontaene1').state === 'oben', 1500); });
  await shot('lava_fontaenen', 600);
  await T('place', marks.gitter, { settle: 30 });
  await shot('gitterboden', 900);
}

// ---------------------------------------------------------------- Klappstampfer
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const k1 = t.named('klapp1'), k2 = t.named('klapp2');
    // Gegenprobe: vor der Aufschlagfläche heil
    t.until(() => k1.state === 'oben', 1200);
    t.place([-4, 0, -144.8], { settle: 2 });
    const s0 = k1.slams;
    let safe = false;
    for (let i = 0; i < 5 * 120 && k1.slams === s0; i++) { t.tick(1); safe = safe || t.hurt(); }
    // darunter (Stacheln, damage treffer): getroffen, oben auf die Platte geschoben
    t.until(() => k1.state === 'oben', 1200);
    t.place([-4, 0, -148], { settle: 2 });
    const s1 = k1.slams;
    let warnHint = false;
    for (let i = 0; i < 5 * 120 && k1.slams === s1; i++) { p.pos.x = -4; p.pos.z = -148; t.tick(1); if (k1.state === 'warn' && k1.hint) warnHint = true; }
    const hurt = t.hurt(), onTop = p.pos.y > 0.4;
    // Stampfplatte mit Loch (damage tod): darunter → zerquetscht; im Loch → heil
    t.until(() => k2.state === 'oben', 1500);
    t.place([4, 0, -147.9], { settle: 2 });
    const s2 = k2.slams;
    for (let i = 0; i < 5 * 120 && k2.slams === s2; i++) { p.pos.x = 4; p.pos.z = -147.9; t.tick(1); }
    const holeOk = !p.dead;
    t.until(() => k2.state === 'oben', 1500);
    t.place([3, 0, -146.6], { settle: 2 });
    const s3 = k2.slams;
    for (let i = 0; i < 5 * 120 && k2.slams === s3; i++) { p.pos.x = 3; p.pos.z = -146.6; t.tick(1); }
    return { safe, hurt, onTop, warnHint, holeOk, crushed: p.dead, cause: p.deathCause, fold: k2.fold, slams: k1.slams };
  });
  console.log(`  Klappstampfer: davor heil ${!r.safe}; darunter getroffen ${r.hurt} (oben auf der Platte ${r.onTop}); Loch heil ${r.holeOk}; Stampfplatte zerquetscht ${r.crushed} (${r.cause})`);
  check('Klappstampfer: Vorwarnung mit Landeboden-Hinweis, klappt herunter und trifft, wer darunter steht; Gegenprobe davor: heil', r.warnHint && r.hurt && r.onTop && !r.safe);
  check('Klappstampfer: im Loch der Platte heil; ohne Loch zerquetscht (damage tod)', r.holeOk && r.crushed && r.cause === 'crush');
  await sc(() => { const t = window.__t; t.until(() => t.named('klapp1').state === 'warn', 1500); t.tick(50); });
  await T('place', marks.klapp, { settle: 0 });
  await shot('klappstampfer', 400);
}

// ---------------------------------------------------------------- Zugbrücke und Druckknopf
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const b = t.named('bruecke'), k = t.ent('knopf');
    const s0 = b.state;
    // hochgezogen: Durchgang versperrt
    t.place([0, 0, -159.5], { settle: 2 });
    c.setInput({ y: 1 }); t.tick(150); c.setInput({});
    const blockedZ = +p.pos.z.toFixed(2);
    // Druckknopf: draufspringen
    t.place([6, 2.5, -160], { settle: 0 });
    t.tick(120);
    const pressed = k.pressed;
    const s1 = b.state;
    t.until(() => b.state === 'unten', 800);
    const s2 = b.state;
    t.place([0, 0, -160], { settle: 2 });
    c.setInput({ y: 1, run: true }); t.tick(200); c.setInput({});
    return { s0, blockedZ, pressed, s1, s2, passZ: +p.pos.z.toFixed(2), dead: p.dead };
  });
  console.log(`  Zugbrücke: ${r.s0}, Figur bleibt bei z ${r.blockedZ}; Knopf gedrückt ${r.pressed} → ${r.s1} → ${r.s2}; Überquerung bis z ${r.passZ}`);
  check('Zugbrücke: hochgezogen versperrt sie den Weg (Gegenprobe), der Druckknopf senkt sie, dann ist der Lavagraben überquerbar', r.s0 === 'oben' && r.blockedZ > -162.2 && r.pressed && r.s1 === 'senkt' && r.s2 === 'unten' && r.passZ < -170 && !r.dead);
  const s = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    // eigener Druckknopf, von der Wurfsichel gedrückt → Signal
    const k = L.spawn('druckknopf', { pos: [-6, 0, -175], onPress: { signal: 'knopf_test' } });
    t.place([-6, 0, -172], { settle: 6, power: 'sichel' });
    const before = L.signals.knopf_test ?? 0;
    t.tick(60);
    const idle = (L.signals.knopf_test ?? 0) - before;
    t.action();
    t.tick(200);
    return { idle, after: (L.signals.knopf_test ?? 0) - before, via: k.via };
  });
  console.log(`  Druckknopf per Wurfsichel: ohne Wurf ${s.idle}, mit Wurf ${s.after} (${s.via})`);
  check('Druckknopf: auch die Wurfsichel drückt ihn (Signal); Gegenprobe ohne Wurf: nichts', s.idle === 0 && s.after === 1 && s.via === 'sichel');
  await T('place', marks.bruecke, { settle: 30 });
  await shot('zugbruecke', 900);
}

// ---------------------------------------------------------------- Schaltfelder
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const g = t.named('schalt');
    const tiles = g.tiles;
    const stepOn = (q) => { t.place([q.x, 0.5, q.z], { settle: 20 }); };
    for (let i = 0; i < tiles.length - 1; i++) stepOn(tiles[i]);
    t.tick(120);
    const partial = { count: g.count, shown: g.shown, done: g.done };
    stepOn(tiles[tiles.length - 1]);
    t.tick(120);
    const full = { count: g.count, shown: g.shown, done: g.done };
    // über den erschienenen Weg laufen
    t.place([0, 0.3, -185.5], { settle: 30 });
    const g1 = p.ground?.tag;
    t.place([0, 0, -183.5], { settle: 2 });
    c.setInput({ y: 1, run: true }); t.tick(30); c.setInput({ y: 1, run: true, jump: true }); t.tick(30); c.setInput({ y: 1, run: true }); t.tick(160); c.setInput({});
    return { partial, full, g1, z: +p.pos.z.toFixed(2), dead: p.dead };
  });
  console.log(`  Schaltfelder: 3/4 → ${JSON.stringify(r.partial)}, 4/4 → ${JSON.stringify(r.full)}; Weg begehbar (${r.g1}), Figur bis z ${r.z}`);
  check('Schaltfelder: erst die komplette Gruppe macht den Weg sichtbar (Gegenprobe 3 von 4: unsichtbar)', r.partial.shown === 0 && !r.partial.done && r.full.done && r.full.shown === 3);
  check('Schaltfelder: der erschienene Weg trägt (Lava überquerbar)', r.g1 === 'appear' && !r.dead && r.z < -191);
  await T('place', marks.schalt, { settle: 30 });
  await shot('schaltfelder', 900);
}

// ---------------------------------------------------------------- Giftnebel
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const n = t.named('nebel');
    const s0 = n.state;
    // Gegenprobe: vor dem Auslösebereich bleibt er still
    t.place([0, 0, -199], { settle: 120 });
    const quiet = n.state;
    // Auslösen und stehen bleiben → Tod durch Gift
    t.place([0, 0, -202], { settle: 2 });
    const states = new Set();
    let died = false;
    for (let i = 0; i < 6 * 120 && !died; i++) { p.pos.x = 0; p.pos.z = -202; t.tick(1); states.add(n.state); died = p.dead; }
    const cause = p.deathCause, front = n.front;
    // fliehen: Figur läuft voraus → bleibt heil, Nebel jagt hinterher
    n.reset();
    t.place([0, 0, -202], { settle: 2 });
    c.setInput({ y: 1, run: true });
    let fled = true;
    for (let i = 0; i < 3 * 120; i++) { t.tick(1); if (p.dead) fled = false; }
    c.setInput({});
    const fz = +p.pos.z.toFixed(2), ff = +n.front.toFixed(2);
    // Neustart am Checkpoint (vor dem Nebel-Bereich): Nebel zurück, wartet wieder
    L.runtime.respawn();
    t.tick(4);
    return { s0, quiet, states: [...states].join('/'), died, cause, front: +front.toFixed(2), fled, fz, ff, after: n.state, afterFront: n.front };
  });
  console.log(`  Giftnebel: ${r.s0}; vor dem Bereich ${r.quiet}; ausgelöst ${r.states} → stehen geblieben tot ${r.died} (${r.cause}, Front ${r.front} m); geflohen heil ${r.fled} (z ${r.fz}, Front ${r.ff}); nach Neustart ${r.after} (${r.afterFront})`);
  check('Giftnebel: Betreten des Bereichs startet die Jagd (Gegenprobe davor: wartet)', r.s0 === 'wartet' && r.quiet === 'wartet' && r.states.includes('jagt'));
  check('Giftnebel: wer stehen bleibt, stirbt im Nebel (deathCause gift); wer flieht, bleibt heil', r.died && r.cause === 'gift' && r.fled && r.fz < -206);
  check('Giftnebel: Neustart vor dem Bereich setzt die Front zurück (wartet)', r.after === 'wartet' && r.afterFront === 0);
  const v = await sc(async () => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    // Giftnebel von oben (Turm-Flucht): senkt sich ab y 8 bis y 0,6 über dem Boden – wer oben steht, stirbt; wer unten
    // (unter der End-Lage) bleibt, ist heil
    L.world.add({ type: 'box', min: [8, 0, -214], max: [12, 2.5, -210], tag: 'testsockel' });
    L.spawn('giftnebel', { id: 'nebel2', pos: [10, 8, -212], size: [6, 6], dir: 'down', speed: 3, to: 5.2, delay: 0.2, start: 'signal' });
    await new Promise((res) => setTimeout(res, 0));
    const n2 = t.named('nebel2');
    t.place([10, 2.5, -212], { settle: 20 });
    n2.start();
    let died = false;
    for (let i = 0; i < 4 * 120 && !died; i++) { t.tick(1); died = p.dead; }
    const cause = p.deathCause, front = +n2.front.toFixed(2);
    n2.reset();
    t.place([8.5, 0, -209], { settle: 2 });
    n2.start();
    let low = true;
    for (let i = 0; i < 4 * 120; i++) { t.tick(1); if (p.dead) low = false; }
    return { died, cause, front, low, state: n2.state };
  });
  console.log(`  Giftnebel von oben: Figur auf dem Sockel tot ${v.died} (${v.cause}, Front ${v.front} m); unten am Boden heil ${v.low} (${v.state})`);
  check('Giftnebel von oben (dir down): erreicht die Figur oben (Tod), unter der End-Lage bleibt sie heil', v.died && v.cause === 'gift' && v.low && v.state === 'ende');
  await sc(() => { const t = window.__t, n = t.named('nebel'); n.reset(); t.named('nebel2')?.reset(); t.place([0, 0, -203], { settle: 2 }); t.tick(200); });
  await shot('giftnebel', 600);
  await sc(() => { window.__t.named('nebel').reset(); });
}

// ---------------------------------------------------------------- Unterwasser-Kisten
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const k1 = t.ent('kiste1');
    const all = t.ents('kiste_wasser');
    // langsam davor schwimmen: nichts
    t.place([-0.6, -4, -228.6], { settle: 60 });
    const swim = p.mode;
    const slow = k1.broken;
    // Schwimmstoß hinein
    p.vel.set(0, -1, -5.5); p.pos.set(-0.6, -5.4, -228.9);
    t.tick(30);
    const dash = k1.broken;
    // Rammfisch-Schnittstelle: onHit('ram')
    const k2 = all.find((k) => k !== k1 && !k.broken);
    k2.onHit('ram', { pos: { x: 0, y: -5, z: -228 } });
    t.tick(60);
    return { swim, slow, dash, ram: k2.broken, by: k2.by, left: t.ents('kiste_wasser').length };
  });
  console.log(`  Unterwasser-Kisten: Figur ${r.swim}, langsam ${r.slow}, Schwimmstoß ${r.dash}, Rammfisch ${r.ram} (${r.by}); übrig ${r.left}`);
  check('Zerbrechliche Kiste unter Wasser: Schwimmstoß zerbricht sie (Gegenprobe langsam: nicht); Rammfisch-Treffer (onHit ram)', r.swim === 'swim' && !r.slow && r.dash && r.ram && r.left >= 1 && r.left <= 2);
  await T('place', marks.kisten, { settle: 60 });
  await shot('unterwasser', 1200);
}

// ---------------------------------------------------------------- Hüllen als kind
{
  const r = await sc(async () => {
    const L = window.__course.level;
    const e1 = L.spawn('feuerstab', { id: 'huelle1', pos: [10, 0, -30], length: 3 });
    const e2 = L.spawn('pendelstachel', { id: 'huelle2', pos: [10, 6, -110] });
    await new Promise((res) => setTimeout(res, 0));
    window.__t.tick(2);
    return { a: L.named.get('huelle1')?.info?.()?.block, b: typeof L.named.get('huelle2')?.angle, k1: e1?.kind, k2: e2?.kind };
  });
  check('Hüllen: Welt-7-Bausteine auch als kind (named liefert den Griff des Bausteins)', r.a === 'stein' && r.b === 'number' && r.k1 === 'feuerstab' && r.k2 === 'pendelstachel');
}

// ---------------------------------------------------------------- Ziel, Kennzahlen
{
  await T('place', marks.goal);
  await sc(() => { const c = window.__course, t = window.__t; c.setInput({ y: 1, run: true }); t.tick(70); c.setInput({ y: 1, run: true, jump: true }); t.tick(40); c.setInput({}); t.tick(400); });
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Lavawerkstatt erreichbar', st === 'done' || st === 'goal');
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
  console.log('Welt-7-Themen');
  const VIEWS = { darkruins: ['schalt'], lavarun: ['walze'], lavatower: ['spiegel'], lavamachine: ['zylinder'], reef: ['wasser', 'kisten'], volcano: ['gitter'] };
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
      if (th === 'reef' && w === 'kisten') labels[th].under = await sc(() => window.__course.view.underwater);
    }
    if (th === 'lavatower') {
      await sc(() => { window.__course.view.setMood('flucht', { time: 0.01 }); });
      await T('place', m.saeuleHoch, { settle: 30 });
      await shot('thema_lavatower_flucht', 1700);
      labels[th].mood = await sc(() => window.__course.view.mood?.info?.().mood ?? null);
    }
    console.log(`  ${th}: ${labels[th].label} (Kulisse ${labels[th].backdrop}${labels[th].moods.length ? ', Stimmungen ' + labels[th].moods.join('/') : ''}${labels[th].uw ? ', Unterwasser' : ''})${errors.length > e0 ? ' – Fehler!' : ''}`);
  }
  const ls = Object.values(labels).map((l) => l.label);
  check('Themen: alle sechs Welt-7-Themen registriert (eigene Namen, eigene Kulisse)', ls.every((l) => l && l !== 'Wiese') && new Set(ls).size === 6 && Object.values(labels).every((l) => l.backdrop));
  check('Thema lavatower: Stimmung „flucht“; Thema reef: Unterwasser-Stimmung unter Wasser', labels.lavatower.moods.includes('flucht') && labels.lavatower.mood === 'flucht' && labels.reef.uw && labels.reef.under === true);
  const ts = stats.filter((s) => s[0].startsWith('thema_'));
  for (const s of ts) console.log(`    ${s[0].padEnd(28)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Themen-Bilder: < 120 Zeichenaufrufe, < 300 k Dreiecke', ts.length >= 6 && ts.every((s) => s[1] < 120 && s[2] < 300000));
  check('Themen: keine Konsolenfehler', errors.length === e0all);
  if (errors.length > e0all) for (const e of errors.slice(e0all, e0all + 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
